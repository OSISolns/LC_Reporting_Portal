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

// ── Helper: parse SUKRAA pipe-delimited string into structured object ─────────
function parsePatientEntry(rawString) {
  try {
    const parsed = JSON.parse(rawString);
    const first = parsed.First || '';
    const second = parsed.Second || '';

    // Strip the leading "· " bullet character
    const clean = first.replace(/^[·•]\s*/, '').trim();
    const parts = clean.split('|');

    return {
      pid: second.trim() || parts[0]?.trim() || '',
      full_name: parts[1]?.trim() || '',
      age: parts[2]?.trim() || '',
      dob: parts[3]?.trim() || '',
      gender: parts[4]?.trim() || '',
      phone: parts[5]?.trim() || '',
      insurance: parts[6]?.trim() || '',
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

  for (const first of alphabet) {
    // First do a 2-char sub-sweep for this letter to avoid timeouts
    let letterTotal = 0;
    for (const second of (letters + digits).split('')) {
      const prefix = first + second;
      const patients = await bulkPullByPrefix(prefix, 500);
      letterTotal += patients.length;
      if (patients.length > 0) yield { prefix, patients };
      // Small delay to be respectful to the server
      await new Promise(r => setTimeout(r, 150));
    }
    console.log(`  [SUKRAA Sync] Letter "${first}" complete — ${letterTotal} records`);
  }
}

module.exports = {
  searchPatients,
  searchOutPatients,
  searchInPatients,
  bulkPullByPrefix,
  bulkPullAllPatients,
  parsePatientEntry,
};
