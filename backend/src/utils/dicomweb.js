'use strict';
/**
 * DICOMweb client for the Imaging Portal.
 *
 * Talks to a PACS that exposes the DICOMweb standard (QIDO-RS / WADO-RS /
 * STOW-RS) — e.g. Orthanc with the dicom-web plugin. The browser never touches
 * the PACS directly: all access is proxied through the backend so credentials
 * stay server-side and our RBAC/audit still apply.
 *
 * Config (see .env.example):
 *   ORTHANC_DICOMWEB_URL   base URL, e.g. http://localhost:8042/dicom-web
 *   ORTHANC_USER / ORTHANC_PASSWORD   optional basic-auth
 */
const axios = require('axios');

const BASE = (process.env.ORTHANC_DICOMWEB_URL || '').replace(/\/$/, '');
const TIMEOUT_MS = 15000;

const auth = process.env.ORTHANC_USER
  ? { username: process.env.ORTHANC_USER, password: process.env.ORTHANC_PASSWORD || '' }
  : undefined;

const isConfigured = () => !!BASE;

// DICOM JSON: { "0020000E": { vr, Value: [...] } }
const tag = (ds, t) => (ds && ds[t] && Array.isArray(ds[t].Value) ? ds[t].Value[0] : undefined);

// ── QIDO-RS: series for a study ────────────────────────────────────────────────
async function fetchSeries(studyInstanceUID) {
  const res = await axios.get(`${BASE}/studies/${encodeURIComponent(studyInstanceUID)}/series`, {
    auth, timeout: TIMEOUT_MS, headers: { Accept: 'application/dicom+json' },
  });
  return (res.data || []).map((ds) => ({
    series_instance_uid: tag(ds, '0020000E'),
    modality: tag(ds, '00080060'),
    description: tag(ds, '0008103E') || '',
    number_of_instances: Number(tag(ds, '00201209') || 0),
  }));
}

// ── QIDO-RS: instances for a series ────────────────────────────────────────────
async function fetchInstances(studyInstanceUID, seriesInstanceUID) {
  const res = await axios.get(
    `${BASE}/studies/${encodeURIComponent(studyInstanceUID)}/series/${encodeURIComponent(seriesInstanceUID)}/instances`,
    { auth, timeout: TIMEOUT_MS, headers: { Accept: 'application/dicom+json' } }
  );
  return (res.data || []).map((ds) => ({
    sop_instance_uid: tag(ds, '00080018'),
    frame_count: Number(tag(ds, '00280008') || 1),
  }));
}

// ── WADO-RS: server-side rendered frame (JPEG) ─────────────────────────────────
async function renderedFrame({ studyInstanceUID, seriesInstanceUID, sopInstanceUID, frame }) {
  const frameSeg = frame ? `/frames/${frame}` : '';
  const url = `${BASE}/studies/${encodeURIComponent(studyInstanceUID)}/series/${encodeURIComponent(seriesInstanceUID)}/instances/${encodeURIComponent(sopInstanceUID)}${frameSeg}/rendered`;
  const res = await axios.get(url, {
    auth, timeout: TIMEOUT_MS, responseType: 'arraybuffer',
    headers: { Accept: 'image/jpeg' },
  });
  return { buffer: Buffer.from(res.data), contentType: res.headers['content-type'] || 'image/jpeg' };
}

// ── STOW-RS: push one or more DICOM instances ──────────────────────────────────
async function stowInstances(dicomBuffers) {
  const boundary = `----LuminaStow${Date.now()}`;
  const CRLF = '\r\n';
  const parts = [];
  for (const buf of dicomBuffers) {
    parts.push(Buffer.from(`--${boundary}${CRLF}Content-Type: application/dicom${CRLF}${CRLF}`, 'utf8'));
    parts.push(buf);
    parts.push(Buffer.from(CRLF, 'utf8'));
  }
  parts.push(Buffer.from(`--${boundary}--${CRLF}`, 'utf8'));
  const body = Buffer.concat(parts);

  const res = await axios.post(`${BASE}/studies`, body, {
    auth, timeout: TIMEOUT_MS,
    headers: {
      'Content-Type': `multipart/related; type="application/dicom"; boundary=${boundary}`,
      Accept: 'application/dicom+json',
    },
    maxBodyLength: Infinity, maxContentLength: Infinity,
  });
  return res.data;
}

module.exports = { isConfigured, fetchSeries, fetchInstances, renderedFrame, stowInstances };
