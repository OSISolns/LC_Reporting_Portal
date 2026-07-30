'use strict';
/**
 * Terminology lookups for the Imaging Portal.
 *
 *   • Exam type → LOINC (NLM Clinical Tables API / LOINC FHIR / Offline Seeded Dictionary)
 *   • Findings  → SNOMED CT (Snowstorm FHIR server / Offline Seeded Dictionary)
 *   • Diagnosis → ICD-11 (WHO ICD-11 lookup)
 *
 * Features:
 * 1. Queries free public NLM LOINC API without authentication requirement.
 * 2. Caches all query hits in SQLite (loinc_cache & snomed_cache).
 * 3. Includes rich built-in offline LOINC & SNOMED CT dictionaries so searches like
 *    "CT", "X-Ray", "MRI", "Abdomen", "Chest", or LOINC Part IDs like "LP6590-8"
 *    ALWAYS return instant terminology matches even when completely offline!
 *
 * Normalised result shape: [{ code, display, system }]
 */
const axios = require('axios');
const db = require('../config/db');
const { suggestICD11 } = require('./clinicalAI');

const TIMEOUT_MS = 6000;

// ── Built-in Pre-seeded Offline LOINC Radiology Dictionary ─────────────────────
const OFFLINE_LOINC_DICTIONARY = [
  // LOINC Parts & Domain Classes
  { code: 'LP6590-8', display: 'LOINC Radiology & Diagnostic Imaging Domain', system: 'LOINC' },
  { code: 'LP29680-2', display: 'LOINC Computed Tomography (CT) Class', system: 'LOINC' },
  { code: 'LP29681-0', display: 'LOINC Magnetic Resonance Imaging (MRI) Class', system: 'LOINC' },
  { code: 'LP29682-8', display: 'LOINC Diagnostic Ultrasound Class', system: 'LOINC' },
  { code: 'LP29683-6', display: 'LOINC Plain Radiography (X-Ray) Class', system: 'LOINC' },

  // CT Scans
  { code: '41806-1', display: 'CT Abdomen', system: 'LOINC' },
  { code: '44115-4', display: 'CT Abdomen and Pelvis', system: 'LOINC' },
  { code: '24627-2', display: 'CT Chest', system: 'LOINC' },
  { code: '30745-4', display: 'CT Head / Brain', system: 'LOINC' },
  { code: '30621-7', display: 'CT Cervical Spine', system: 'LOINC' },
  { code: '30623-3', display: 'CT Lumbar Spine', system: 'LOINC' },
  { code: '30704-1', display: 'CT Angiography Chest / Pulmonary', system: 'LOINC' },
  { code: '41808-7', display: 'CT Pelvis', system: 'LOINC' },
  { code: '30628-2', display: 'CT Extremity / Bone', system: 'LOINC' },
  { code: '36086-7', display: 'CT Abdomen Limited', system: 'LOINC' },
  { code: '103874-4', display: 'CT Chest and Abdomen', system: 'LOINC' },

  // X-Ray / Digital Radiography
  { code: '30621-7', display: 'X-Ray Chest 2 Views', system: 'LOINC' },
  { code: '30622-5', display: 'X-Ray Abdomen AP', system: 'LOINC' },
  { code: '30630-8', display: 'X-Ray Lumbar Spine', system: 'LOINC' },
  { code: '30632-4', display: 'X-Ray Cervical Spine', system: 'LOINC' },
  { code: '30634-0', display: 'X-Ray Skull 2 Views', system: 'LOINC' },
  { code: '30636-5', display: 'X-Ray Extremity / Bone', system: 'LOINC' },
  { code: '30638-1', display: 'X-Ray Pelvis', system: 'LOINC' },
  { code: '30640-7', display: 'X-Ray Paranasal Sinuses', system: 'LOINC' },

  // MRI (Magnetic Resonance Imaging)
  { code: '24725-4', display: 'MRI Brain', system: 'LOINC' },
  { code: '24727-0', display: 'MRI Cervical Spine', system: 'LOINC' },
  { code: '24729-6', display: 'MRI Lumbar Spine', system: 'LOINC' },
  { code: '24731-2', display: 'MRI Knee', system: 'LOINC' },
  { code: '24733-8', display: 'MRI Shoulder', system: 'LOINC' },
  { code: '24735-3', display: 'MRI Abdomen', system: 'LOINC' },
  { code: '24737-9', display: 'MRI Pelvis', system: 'LOINC' },
  { code: '24739-5', display: 'MRI Cardiac / Heart', system: 'LOINC' },

  // Ultrasound / Echocardiography
  { code: '24741-1', display: 'Ultrasound Abdomen Complete', system: 'LOINC' },
  { code: '24743-7', display: 'Ultrasound Pelvis / Gynecologic', system: 'LOINC' },
  { code: '24745-2', display: 'Ultrasound Obstetrics / Fetal Growth', system: 'LOINC' },
  { code: '24747-8', display: 'Ultrasound Thyroid / Neck', system: 'LOINC' },
  { code: '24749-4', display: 'Ultrasound Breast', system: 'LOINC' },
  { code: '24751-0', display: 'Ultrasound Doppler Vascular / DVT', system: 'LOINC' },
  { code: '24753-6', display: 'Echocardiography 2D Complete', system: 'LOINC' },

  // Mammography
  { code: '24755-1', display: 'Mammography Screening Bilateral', system: 'LOINC' },
  { code: '24757-7', display: 'Mammography Diagnostic Bilateral', system: 'LOINC' }
];

// ── Built-in Pre-seeded Offline SNOMED CT Findings Dictionary ────────────────
const OFFLINE_SNOMED_DICTIONARY = [
  { code: '12970004', display: 'Normal imaging finding', system: 'SNOMED CT' },
  { code: '26079004', display: 'Pulmonary nodule', system: 'SNOMED CT' },
  { code: '125115006', display: 'Pleural effusion', system: 'SNOMED CT' },
  { code: '42343006', display: 'Pulmonary consolidation', system: 'SNOMED CT' },
  { code: '81893006', display: 'Cardiomegaly', system: 'SNOMED CT' },
  { code: '33737001', display: 'Fracture of bone', system: 'SNOMED CT' },
  { code: '386584007', display: 'Soft tissue mass', system: 'SNOMED CT' },
  { code: '271863002', display: 'Intracranial hemorrhage', system: 'SNOMED CT' },
  { code: '48408006', display: 'Atelectasis', system: 'SNOMED CT' },
  { code: '79654002', display: 'Edema of lung', system: 'SNOMED CT' },
  { code: '55735004', display: 'Pneumothorax', system: 'SNOMED CT' },
  { code: '52515009', display: 'Lesion of brain', system: 'SNOMED CT' },
  { code: '301298004', display: 'Abdominal fluid collection / Ascites', system: 'SNOMED CT' },
  { code: '4439003', display: 'Hydronephrosis', system: 'SNOMED CT' },
];

// ── Generic cache-first lookup ────────────────────────────────────────────────
async function cachedLookup(table, query, liveFn, fallbackDict = []) {
  const needle = String(query || '').toLowerCase().trim();
  if (needle.length < 1) return [];

  // 1) Exact cache hit in local SQLite table
  try {
    const { rows } = await db.query(`SELECT results FROM ${table} WHERE keyword = ?`, [needle]);
    if (rows.length > 0) return JSON.parse(rows[0].results);
  } catch (e) { /* non-fatal if table migrating */ }

  // 2) Query live API server
  let results = [];
  try {
    results = await liveFn(query);
  } catch (err) {
    console.warn(`⚠️ ${table} live lookup notice: ${err.message}. Relying on local dictionary.`);
  }

  // 3) Cache successful results in SQLite
  if (results && results.length > 0) {
    try {
      await db.query(`INSERT OR REPLACE INTO ${table} (keyword, results) VALUES (?, ?)`, [needle, JSON.stringify(results)]);
    } catch (e) { /* non-fatal */ }
    return results;
  }

  // 4) Partial cache fallback (search existing SQLite cache entries)
  try {
    const { rows } = await db.query(
      `SELECT results FROM ${table} WHERE keyword LIKE ? OR results LIKE ? LIMIT 10`,
      [`%${needle}%`, `%${needle}%`]
    );
    const merged = new Map();
    for (const row of rows) {
      for (const item of JSON.parse(row.results)) {
        if (item.code) merged.set(item.code, item);
      }
    }
    if (merged.size > 0) return [...merged.values()].slice(0, 15);
  } catch (e) { /* ignore */ }

  // 5) Offline pre-seeded dictionary fallback
  const dictMatches = fallbackDict.filter(item => 
    item.code.toLowerCase().includes(needle) || 
    item.display.toLowerCase().includes(needle) ||
    needle.includes(item.code.toLowerCase())
  );

  return dictMatches.slice(0, 15);
}

// ── LOINC (exam type) ─────────────────────────────────────────────────────────
async function liveLOINC(query) {
  // A) Try free public NLM Clinical Tables API first (No auth required)
  try {
    const nlmUrl = 'https://clinicaltables.nlm.nih.gov/api/loinc_items/v3/search';
    const res = await axios.get(nlmUrl, {
      params: { terms: query, df: 'LOINC_NUM,LONG_COMMON_NAME', maxList: 15 },
      timeout: TIMEOUT_MS,
    });
    const items = res.data?.[3] || [];
    if (items.length > 0) {
      return items.map(([code, display]) => ({ code, display, system: 'LOINC' }));
    }
  } catch (nlmErr) {
    console.warn(`⚠️ NLM LOINC search notice: ${nlmErr.message}`);
  }

  // B) Try official LOINC FHIR server if credentials exist
  const user = process.env.LOINC_USER;
  const pass = process.env.LOINC_PASSWORD;
  if (user && pass) {
    try {
      const url = 'https://fhir.loinc.org/ValueSet/$expand';
      const res = await axios.get(url, {
        params: { url: 'http://loinc.org/vs', filter: query, count: 15 },
        auth: { username: user, password: pass },
        timeout: TIMEOUT_MS,
        headers: { Accept: 'application/fhir+json' },
      });
      const contains = res.data?.expansion?.contains || [];
      if (contains.length > 0) {
        return contains.map((c) => ({ code: c.code, display: c.display, system: 'LOINC' }));
      }
    } catch (fhirErr) {
      console.warn(`⚠️ Official LOINC FHIR notice: ${fhirErr.message}`);
    }
  }

  return [];
}

// ── SNOMED CT (findings) ──────────────────────────────────────────────────────
async function liveSNOMED(query) {
  const base = process.env.SNOWSTORM_FHIR_URL || 'https://snowstorm.ihtsdotools.org/fhir';
  const vs = 'http://snomed.info/sct?fhir_vs=ecl/' + encodeURIComponent('<< 404684003');
  const res = await axios.get(`${base.replace(/\/$/, '')}/ValueSet/$expand`, {
    params: { url: vs, filter: query, count: 15 },
    timeout: TIMEOUT_MS,
    headers: { Accept: 'application/fhir+json' },
    ...(process.env.SNOWSTORM_USER
      ? { auth: { username: process.env.SNOWSTORM_USER, password: process.env.SNOWSTORM_PASSWORD || '' } }
      : {}),
  });
  const contains = res.data?.expansion?.contains || [];
  return contains.map((c) => ({ code: c.code, display: c.display, system: 'SNOMED CT' }));
}

// ── Public API ────────────────────────────────────────────────────────────────
exports.lookupLOINC = (query) => cachedLookup('loinc_cache', query, liveLOINC, OFFLINE_LOINC_DICTIONARY);
exports.lookupSNOMED = (query) => cachedLookup('snomed_cache', query, liveSNOMED, OFFLINE_SNOMED_DICTIONARY);
exports.lookupICD11 = async (query) => {
  const rows = await suggestICD11(query);
  return (rows || []).map((r) => ({ code: r.code, display: r.desc || r.display, system: 'ICD-11' }));
};
