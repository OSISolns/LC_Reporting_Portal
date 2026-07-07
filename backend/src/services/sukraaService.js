'use strict';

/**
 * sukraaService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Service layer for interacting with the SUKRAA HIMS ASMX Web Service.
 * Provides patient search and bulk pull functionality.
 *
 * SUKRAA Service URL: http://41.173.250.126:8081/legacy/forms/Autocompleted.asmx
 * Namespace:         http://tempuri.org/
 * ─────────────────────────────────────────────────────────────────────────────
 */

const axios = require('axios');

const SUKRAA_BASE_URL = process.env.SUKRAA_SERVICE_URL || 'http://41.173.250.126:8081/legacy/forms/Autocompleted.asmx';
const NAMESPACE = 'http://tempuri.org/';
const TIMEOUT_MS = 30_000; // 30 seconds

// ── Helper: build a SOAP 1.1 envelope ────────────────────────────────────────
function buildSoapEnvelope(method, prefixText, count = 200, contextKey = '') {
  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
               xmlns:xsd="http://www.w3.org/2001/XMLSchema"
               xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <${method} xmlns="${NAMESPACE}">
      <prefixText>${prefixText}</prefixText>
      <count>${count}</count>
      <contextKey>${contextKey}</contextKey>
    </${method}>
  </soap:Body>
</soap:Envelope>`;
}

// ── Helper: Extract insurance info from parenthesized or appended name content (e.g. (0078627) or 015991221) ──
function extractInsuranceFromName(fullName) {
  if (!fullName) return { ref_type: 'Walk-in / Private', referrer_name: 'Walk-in / Private' };
  
  let content = '';
  // Try parentheses first
  const parenMatch = fullName.match(/\(([^)]+)\)/);
  if (parenMatch) {
    const candidate = parenMatch[1].trim();
    if (/\d/.test(candidate)) {
      content = candidate;
    }
  }

  // If no parenthesized digits, look for standalone numeric/alphanumeric codes in the name
  if (!content) {
    // Look for 7-10 digit numbers (with optional trailing letter) or tokens containing MMI
    const tokens = fullName.split(/\s+/);
    for (const token of tokens) {
      const cleanToken = token.trim().replace(/[(),;]/g, '');
      if (/^\d{7,10}[A-Z]?$/i.test(cleanToken) || cleanToken.toUpperCase().includes('MMI')) {
        content = cleanToken;
        break;
      }
    }
  }

  if (!content) {
    return { ref_type: 'Walk-in / Private', referrer_name: 'Walk-in / Private' };
  }
  
  // Clean content of any whitespace
  const cleaned = content.replace(/\s+/g, '');
  
  // Clean tab characters or leading zeroes/padding if needed, but keep it for card number matching
  // 1. Purely numeric 7-to-9 digits (e.g., 0078627, 015541325) -> Rwanda Social Security Board
  if (/^\d{7,9}$/.test(cleaned)) {
    return { ref_type: 'Insurance', referrer_name: 'Rwanda Social Security Board' };
  }
  
  // 2. MMI format: typically 8-10 digits ending in a letter (e.g. 11032108D) or containing MMI
  if (/^\d{7,10}[A-Z]$/i.test(cleaned) || cleaned.toUpperCase().includes('MMI')) {
    return { ref_type: 'Insurance', referrer_name: 'MMI' };
  }
  
  // 3. Fallback: If it contains digits, classify as Insurance and keep the card number as info
  return { ref_type: 'Insurance', referrer_name: 'Insurance' };
}

// ── Helper: parse SUKRAA pipe-delimited string into structured object ─────────
function parsePatientEntry(rawString) {
  try {
    const parsed = JSON.parse(rawString);
    const first = parsed.First || '';
    const second = parsed.Second || '';

    // Strip the leading "· " bullet character
    const clean = first.replace(/^[·•]\s*/, '').trim();
    const parts = clean.split('|');

    const rawPid = second.trim() || parts[0]?.trim() || '';
    const rawFullName = parts[1]?.trim() || '';

    // Determine ref_type and referrer_name
    let refType = parts[7]?.trim();
    let referrerName = parts[8]?.trim();

    // Normalise walk-in variants to a consistent sentinel so comparisons below are reliable
    const isWalkIn = (v) => !v || v.toLowerCase() === 'walk-in' || v.toLowerCase() === 'private' || v.toLowerCase() === 'walk-in / private';

    if (isWalkIn(refType) || isWalkIn(referrerName)) {
      if (!isWalkIn(refType)) {
        // refType has a real insurer but referrerName is empty/walk-in — use refType for both
        referrerName = refType;
      } else if (!isWalkIn(referrerName)) {
        // referrerName has a real insurer but refType is empty/walk-in — use referrerName for both
        refType = referrerName;
      } else {
        // Both are absent/walk-in — try to infer from the card number embedded in the name
        const extracted = extractInsuranceFromName(rawFullName);
        refType = extracted.ref_type;
        referrerName = extracted.referrer_name;
      }
    }

    return {
      pid: rawPid,
      full_name: rawFullName,
      age: parts[2]?.trim() || '',
      dob: parts[3]?.trim() || '',
      gender: parts[4]?.trim() || '',
      phone: parts[5]?.trim() || '',
      insurance: parts[6]?.trim() || '',
      ref_type: refType,
      referrer_name: referrerName,
      extra_1: parts[7]?.trim() || '',
      extra_2: parts[8]?.trim() || '',
    };
  } catch {
    return null;
  }
}

// ── Helper: extract <string> entries from raw SOAP XML response ───────────────
function extractStringsFromXml(xmlText, method) {
  const resultTag = `${method}Result`;
  const regex = /<string[^>]*>([\s\S]*?)<\/string>/g;
  const results = [];
  let match;

  // Only search within the result element
  const resultStart = xmlText.indexOf(`<${resultTag}>`);
  const resultEnd = xmlText.indexOf(`</${resultTag}>`);
  if (resultStart === -1 || resultEnd === -1) return results;

  const fragment = xmlText.slice(resultStart, resultEnd);
  while ((match = regex.exec(fragment)) !== null) {
    // Unescape XML entities
    const raw = match[1]
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'");
    results.push(raw);
  }

  return results;
}

// ── Core: call a SUKRAA SOAP method ──────────────────────────────────────────
async function callSoapMethod(method, prefixText, count = 200, contextKey = '') {
  const body = buildSoapEnvelope(method, prefixText, count, contextKey);

  const response = await axios.post(SUKRAA_BASE_URL, body, {
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      'SOAPAction': `"${NAMESPACE}${method}"`,
    },
    timeout: TIMEOUT_MS,
    // SUKRAA returns large XML - don't limit response size
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  });

  const strings = extractStringsFromXml(response.data, method);
  return strings.map(parsePatientEntry).filter(Boolean);
}

// ── Public: search patients by prefix (real-time) ────────────────────────────
async function searchPatients(prefix, count = 50) {
  if (!prefix || prefix.length === 0) return [];
  return callSoapMethod('SearchPatient', prefix, count);
}

// ── Public: search out-patients by prefix ────────────────────────────────────
async function searchOutPatients(prefix, count = 50) {
  if (!prefix || prefix.length === 0) return [];
  return callSoapMethod('Search_OutPatient', prefix, count);
}

// ── Public: search in-patients by prefix ─────────────────────────────────────
async function searchInPatients(prefix, count = 50) {
  if (!prefix || prefix.length === 0) return [];
  return callSoapMethod('SearchInPatient', prefix, count);
}

// ── Public: bulk pull patients for a given prefix ────────────────────────────
// Count is capped at 500 per call to avoid SUKRAA server timeouts.
async function bulkPullByPrefix(prefix, count = 500) {
  try {
    const results = await callSoapMethod('SearchPatient', prefix, count);
    console.log(`  [SUKRAA Sync] Prefix "${prefix.padEnd(3)}" → ${results.length} records`);
    return results;
  } catch (err) {
    console.warn(`  [SUKRAA Sync] Prefix "${prefix}" failed: ${err.message}`);
    return [];
  }
}

// ── Public: pull ALL patients using 2-character prefix sweep ─────────────────
// Sweeps all aa–az, ba–bz... to stay well within SUKRAA timeout limits.
// Falls back to single-char if 2-char sweep returns 0 for a whole letter.
async function* bulkPullAllPatients() {
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  const digits = '0123456789';
  const alphabet = (letters + digits).split('');
  const seconds = (letters + digits).split('');

  for (const first of alphabet) {
    // First do a 2-char sub-sweep for this letter to avoid timeouts
    let letterTotal = 0;
    for (const second of seconds) {
      const prefix = first + second;
      const patients = await bulkPullByPrefix(prefix, 500);
      letterTotal += patients.length;
      if (patients.length > 0) yield { prefix, patients };
      // Small delay to be respectful to the server
      await new Promise(r => setTimeout(r, 150));
    }

    // Fallback: if the entire 2-char sweep for this letter returned nothing,
    // try a single-char pull so short or unusual names aren't silently missed.
    if (letterTotal === 0) {
      const patients = await bulkPullByPrefix(first, 500);
      if (patients.length > 0) {
        letterTotal += patients.length;
        yield { prefix: first, patients };
      }
      await new Promise(r => setTimeout(r, 150));
    }

    console.log(`  [SUKRAA Sync] Letter "${first}" complete — ${letterTotal} records`);
  }
}

// ── Shared patient-cache upsert ──────────────────────────────────────────────
// Single source of truth for writing SUKRAA patients into the local
// `sukraa_patients` mirror. Used by both the standalone sync script and the
// in-process /sync route so the column list and conflict handling never drift.
const PATIENT_UPSERT_SQL = `INSERT INTO sukraa_patients
    (pid, full_name, age, dob, gender, phone, insurance, ref_type, referrer_name, extra_1, extra_2, synced_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  ON CONFLICT(pid) DO UPDATE SET
    full_name     = excluded.full_name,
    age           = excluded.age,
    dob           = excluded.dob,
    gender        = excluded.gender,
    phone         = excluded.phone,
    insurance     = excluded.insurance,
    ref_type      = excluded.ref_type,
    referrer_name = excluded.referrer_name,
    extra_1       = excluded.extra_1,
    extra_2       = excluded.extra_2,
    synced_at     = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
    updated_at    = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`;

// Build the parameterised upsert statements for a list of patients, skipping
// any record missing the required pid / full_name.
function buildPatientUpsertStatements(patients) {
  return (patients || [])
    .filter(p => p && p.pid && p.full_name)
    .map(p => ({
      sql: PATIENT_UPSERT_SQL,
      args: [
        p.pid, p.full_name, p.age || null, p.dob || null,
        p.gender || null, p.phone || null, p.insurance || null,
        p.ref_type || null, p.referrer_name || null,
        p.extra_1 || null, p.extra_2 || null,
      ],
    }));
}

/**
 * Upsert an array of patients into the local cache in batches.
 * @param {{ batch: Function }} db  A db handle exposing `batch(statements)`.
 * @param {Array} patients          Parsed SUKRAA patient objects.
 * @param {{ dryRun?: boolean, chunkSize?: number }} [opts]
 * @returns {Promise<number>} count of valid records upserted (or that would be, on dry-run).
 */
async function upsertPatientCache(db, patients, opts = {}) {
  const { dryRun = false, chunkSize = 50 } = opts;
  const statements = buildPatientUpsertStatements(patients);
  if (statements.length === 0) return 0;
  if (dryRun) return statements.length;

  let added = 0;
  for (let i = 0; i < statements.length; i += chunkSize) {
    const chunk = statements.slice(i, i + chunkSize);
    try {
      await db.batch(chunk);
      added += chunk.length;
    } catch (err) {
      console.error('[PatientSync] Batch error:', err.message);
    }
  }
  return added;
}

module.exports = {
  searchPatients,
  searchOutPatients,
  searchInPatients,
  bulkPullByPrefix,
  bulkPullAllPatients,
  parsePatientEntry,
  buildPatientUpsertStatements,
  upsertPatientCache,
};
