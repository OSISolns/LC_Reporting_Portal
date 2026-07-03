'use strict';
/**
 * Terminology lookups for the Imaging Portal.
 *
 *   • Exam type → LOINC   (LOINC FHIR terminology server)
 *   • Findings  → SNOMED CT (Snowstorm FHIR server, ECL-filtered to findings)
 *   • Diagnosis → ICD-11  (reuses the existing WHO lookup in clinicalAI.js)
 *
 * Each lookup follows the proven ICD-11 pattern: check the local *_cache table
 * first, then query the live FHIR server, cache successful results, and fall
 * back to a partial cache match when offline / unconfigured. Every path
 * degrades gracefully to [] so the reporting UI never hard-fails.
 *
 * Normalised result shape: [{ code, display, system }]
 */
const axios = require('axios');
const db = require('../config/db');
const { suggestICD11 } = require('./clinicalAI');

const TIMEOUT_MS = 6000;

// ── Generic cache-first lookup ────────────────────────────────────────────────
async function cachedLookup(table, query, liveFn) {
  const needle = String(query || '').toLowerCase().trim();
  if (needle.length < 2) return [];

  // 1) Exact cache hit
  try {
    const { rows } = await db.query(`SELECT results FROM ${table} WHERE keyword = ?`, [needle]);
    if (rows.length > 0) return JSON.parse(rows[0].results);
  } catch (e) { /* table may be missing in older DBs — ignore */ }

  // 2) Live server
  let results = [];
  try {
    results = await liveFn(query);
  } catch (err) {
    console.warn(`⚠️ ${table} live lookup failed: ${err.message}. Falling back to cache.`);
  }

  // 3) Cache successful results
  if (results && results.length > 0) {
    try {
      await db.query(`INSERT OR REPLACE INTO ${table} (keyword, results) VALUES (?, ?)`, [needle, JSON.stringify(results)]);
    } catch (e) { /* non-fatal */ }
    return results;
  }

  // 4) Partial cache fallback
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
    return [...merged.values()].slice(0, 15);
  } catch (e) {
    return [];
  }
}

// ── LOINC (exam type) ─────────────────────────────────────────────────────────
async function liveLOINC(query) {
  const user = process.env.LOINC_USER;
  const pass = process.env.LOINC_PASSWORD;
  if (!user || !pass) return []; // not configured → rely on cache/seed

  const url = 'https://fhir.loinc.org/ValueSet/$expand';
  const res = await axios.get(url, {
    params: { url: 'http://loinc.org/vs', filter: query, count: 15 },
    auth: { username: user, password: pass },
    timeout: TIMEOUT_MS,
    headers: { Accept: 'application/fhir+json' },
  });
  const contains = res.data?.expansion?.contains || [];
  return contains.map((c) => ({ code: c.code, display: c.display, system: 'LOINC' }));
}

// ── SNOMED CT (findings) ──────────────────────────────────────────────────────
async function liveSNOMED(query) {
  const base = process.env.SNOWSTORM_FHIR_URL || 'https://snowstorm.ihtsdotools.org/fhir';
  // Constrain to the Clinical finding hierarchy (<< 404684003).
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
exports.lookupLOINC = (query) => cachedLookup('loinc_cache', query, liveLOINC);
exports.lookupSNOMED = (query) => cachedLookup('snomed_cache', query, liveSNOMED);
exports.lookupICD11 = async (query) => {
  const rows = await suggestICD11(query);
  return (rows || []).map((r) => ({ code: r.code, display: r.desc || r.display, system: 'ICD-11' }));
};
