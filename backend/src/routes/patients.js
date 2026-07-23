'use strict';

/**
 * patients.js (Route)
 * ─────────────────────────────────────────────────────────────────────────────
 * Patient endpoints backed by local SUKRAA cache in Turso/LibSQL.
 *
 * GET  /api/patients/search?q=text&limit=20    — autocomplete search
 * GET  /api/patients/:pid                       — get single patient by PID
 * GET  /api/patients                            — paginated list
 * POST /api/patients/sync/trigger               — manually trigger a re-sync
 * GET  /api/patients/sync/status                — last sync log entry
 * ─────────────────────────────────────────────────────────────────────────────
 */

const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const { authMiddleware } = require('../middleware/auth');
const checkPermission = require('../middleware/permission');
const { bulkPullAllPatients, bulkPullByPrefix, searchPatients, upsertPatientCache } = require('../services/sukraaService');

// Thin wrapper so existing call sites read naturally; the shared implementation
// lives in sukraaService so the sync script and this route can never drift.
const upsertPatients = (patients) => upsertPatientCache(db, patients);

router.use(authMiddleware);

// ── GET /api/patients/sync/status ────────────────────────────────────────────
router.get('/sync/status', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT * FROM sukraa_sync_log ORDER BY id DESC LIMIT 1`
    );
    const total = await db.query(`SELECT COUNT(*) AS cnt FROM sukraa_patients`);
    res.json({
      success:      true,
      last_sync:    result.rows[0] || null,
      total_cached: Number(total.rows[0]?.cnt || 0),
    });
  } catch (err) { next(err); }
});

// ── POST /api/patients/sync/trigger (admin only) ─────────────────────────────
router.post('/sync/trigger', async (req, res, next) => {
  if (!['admin', 'deputy_coo'].includes(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Admin access required.' });
  }

  // Respond immediately, run sync in background
  res.json({ success: true, message: 'Patient sync started in background.' });

  // Run async sync without blocking the response
  (async () => {
    const startedAt = new Date().toISOString();
    let logId;
    try {
      // RETURNING id so we actually capture the new log row's id — a plain
      // INSERT returns no rows here, which left logId undefined and meant the
      // completion/failure UPDATE below silently matched nothing (every
      // UI-triggered sync stayed stuck at status='running' forever).
      const logResult = await db.query(
        `INSERT INTO sukraa_sync_log (started_at, status) VALUES (?, 'running') RETURNING id`,
        [startedAt]
      );
      logId = logResult.rows[0]?.id;

      const { prefix } = req.body || {};
      let added = 0;
      const seen = new Set();

      if (prefix) {
        const patients = await bulkPullByPrefix(prefix);
        added = await upsertPatients(patients.filter(p => {
          if (seen.has(p.pid)) return false;
          seen.add(p.pid);
          return true;
        }));
      } else {
        for await (const { patients } of bulkPullAllPatients()) {
          const unique = patients.filter(p => {
            if (seen.has(p.pid)) return false;
            seen.add(p.pid);
            return true;
          });
          added += await upsertPatients(unique);
        }
      }

      await db.query(
        `UPDATE sukraa_sync_log SET completed_at = ?, records_added = ?, status = 'done' WHERE id = ?`,
        [new Date().toISOString(), added, logId]
      );
      console.log(`[PatientSync] Done — ${added} records upserted.`);
    } catch (err) {
      console.error('[PatientSync] Failed:', err.message);
      if (logId) {
        await db.query(
          `UPDATE sukraa_sync_log SET completed_at = ?, status = 'failed', error_message = ? WHERE id = ?`,
          [new Date().toISOString(), err.message, logId]
        ).catch(() => {});
      }
    }
  })();
});

// ── GET /api/patients/search?q=text&limit=20 ─────────────────────────────────
// authMiddleware (applied to all routes above) is sufficient — patients→view is
// granted to every role in the system; a fine-grained check here only causes
// 403s when new roles are added before an explicit DB permission seed.
router.get('/search', async (req, res, next) => {
  try {
    const q     = (req.query.q || '').trim();
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);

    if (!q) {
      return res.json({ success: true, data: [] });
    }

    // 0. PID search. PIDs are numeric and stored in plaintext, but the
    // encrypted-column LIKE interceptor post-filters the combined
    // (name OR pid OR phone) query as an AND against the decrypted name/phone,
    // which silently drops rows that only match on PID. So resolve numeric
    // queries with a dedicated PID-only lookup first.
    if (/^\d+$/.test(q)) {
      const byPid = await db.query(
        `SELECT pid, full_name, age, dob, gender, phone, insurance, ref_type, referrer_name
         FROM sukraa_patients
         WHERE pid LIKE ?
         ORDER BY pid ASC
         LIMIT ?`,
        [`%${q}%`, limit]
      );
      if (byPid.rows && byPid.rows.length > 0) {
        return res.json({ success: true, data: byPid.rows, source: 'cache' });
      }
    }

    // 1. Try local cache first
    let result = await db.query(
      `SELECT pid, full_name, age, dob, gender, phone, insurance, ref_type, referrer_name
       FROM sukraa_patients
       WHERE full_name LIKE ? OR pid LIKE ? OR phone LIKE ?
       ORDER BY full_name ASC
       LIMIT ?`,
      [`%${q}%`, `%${q}%`, `%${q}%`, limit]
    );

    if (result.rows && result.rows.length > 0) {
      return res.json({ success: true, data: result.rows, source: 'cache' });
    }

    // 2. Fallback: Search live from SUKRAA service
    console.log(`[PatientSearch] "${q}" not found in cache. Querying live SUKRAA HIMS...`);
    try {
      const livePatients = await searchPatients(q, limit);
      if (livePatients && livePatients.length > 0) {
        // Upsert live results into local cache in the background
        await upsertPatients(livePatients).catch(err => {
          console.error('[PatientSearch] Failed to auto-cache live patient:', err.message);
        });

        return res.json({ success: true, data: livePatients, source: 'live' });
      }
    } catch (liveErr) {
      console.warn(`[PatientSearch] Live SUKRAA service unavailable: ${liveErr.message}`);
    }

    // 3. Fallback: empty results (user can enter manually)
    res.json({ success: true, data: [], source: 'none' });
  } catch (err) { next(err); }
});

// ── GET /api/patients/:pid ────────────────────────────────────────────────────
router.get('/:pid', async (req, res, next) => {
  try {
    const pid = req.params.pid.trim();

    // 1. Try local cache first
    let result = await db.query(
      `SELECT * FROM sukraa_patients WHERE pid = ?`,
      [pid]
    );

    if (result.rows && result.rows.length > 0) {
      return res.json({ success: true, data: result.rows[0], source: 'cache' });
    }

    // 2. Fallback: Query live by PID
    console.log(`[PatientGet] PID "${pid}" not found in cache. Querying live SUKRAA HIMS...`);
    try {
      const livePatients = await searchPatients(pid, 1);
      const exactMatch = livePatients.find(p => p.pid === pid);
      if (exactMatch) {
        await upsertPatients([exactMatch]).catch(err => {
          console.error('[PatientGet] Failed to auto-cache live patient:', err.message);
        });
        return res.json({ success: true, data: exactMatch, source: 'live' });
      }
    } catch (liveErr) {
      console.warn(`[PatientGet] Live SUKRAA service unavailable: ${liveErr.message}`);
    }

    res.status(404).json({ success: false, message: 'Patient not found in cache or live SUKRAA.' });
  } catch (err) { next(err); }
});

// ── GET /api/patients?page=1&limit=50&q=text ─────────────────────────────────
router.get('/', checkPermission('patients', 'view'), async (req, res, next) => {
  try {
    const q      = (req.query.q || '').trim();
    const page   = Math.max(parseInt(req.query.page) || 1, 1);
    const limit  = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = (page - 1) * limit;

    const where  = q ? `WHERE full_name LIKE ? OR pid LIKE ? OR phone LIKE ?` : '';
    const args   = q ? [`%${q}%`, `%${q}%`, `%${q}%`] : [];

    // Count strategy differs by mode: a search hits encrypted columns, so a
    // SQL COUNT(*) can't be post-filtered in memory (it would return 0). Count
    // the actual filtered rows instead. A plain browse (no q) uses the cheap
    // aggregate.
    const rowsQuery = db.query(
      `SELECT pid, full_name, age, dob, gender, phone, insurance, ref_type, referrer_name, synced_at
       FROM sukraa_patients ${where}
       ORDER BY full_name ASC
       LIMIT ? OFFSET ?`,
      [...args, limit, offset]
    );

    const totalQuery = q
      ? db.query(`SELECT pid FROM sukraa_patients ${where}`, args).then(r => r.rows.length)
      : db.query(`SELECT COUNT(*) AS cnt FROM sukraa_patients`, []).then(r => Number(r.rows[0]?.cnt || 0));

    const [rows, total] = await Promise.all([rowsQuery, totalQuery]);

    res.json({
      success: true,
      data:    rows.rows,
      meta: {
        total,
        page,
        limit,
      },
    });
  } catch (err) { next(err); }
});

// ── GET /api/patients/:pid/vitals ─────────────────────────────────────────────
router.get('/:pid/vitals', checkPermission('patients', 'view'), async (req, res, next) => {
  try {
    const pid = req.params.pid.trim();
    const result = await db.query(
      `SELECT * FROM patient_vitals WHERE patient_id = $1 ORDER BY created_at DESC`,
      [pid]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
});

// ── POST /api/patients/:pid/vitals ────────────────────────────────────────────
router.post('/:pid/vitals', checkPermission('patients', 'view'), async (req, res, next) => {
  try {
    const pid = req.params.pid.trim();
    const { temperature, pulse, respiratory_rate, blood_pressure, weight, spo2, general_comments } = req.body;
    
    const result = await db.query(
      `INSERT INTO patient_vitals (
        patient_id, temperature, pulse, respiratory_rate, blood_pressure, weight, spo2, general_comments
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [pid, temperature, pulse, respiratory_rate, blood_pressure, weight, spo2, general_comments]
    );

    // Update ongoing clinical sheet with these vitals
    const { rows: drafts } = await db.query(
      `SELECT * FROM clinical_observations WHERE patient_id = $1 AND status != 'Verified' ORDER BY updated_at DESC LIMIT 1`,
      [pid]
    );

    if (drafts.length > 0) {
      const draft = drafts[0];
      const triage = JSON.parse(draft.triage_json || '{}');
      if (temperature) triage.temp = temperature;
      if (pulse) triage.pulse = pulse;
      if (respiratory_rate) triage.rr = respiratory_rate;
      if (blood_pressure) triage.bp = blood_pressure;
      if (weight) triage.weight = weight;
      if (spo2) triage.spo2 = spo2;
      
      if (general_comments) {
        triage.general_comments = triage.general_comments 
          ? triage.general_comments + '\\n' + general_comments 
          : general_comments;
      }

      await db.query(
        `UPDATE clinical_observations SET triage_json = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [JSON.stringify(triage), draft.id]
      );
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
});

// ── POST /api/patients/:pid/prescription ──────────────────────────────────────
// Restricted to prescribing roles -- writing medications into a patient's
// clinical record is a diagnostic act, not something any authenticated staff
// account should be able to do (this endpoint had no role check at all).
router.post('/:pid/prescription', checkPermission('patients', 'create'), async (req, res, next) => {
  try {
    const pid = req.params.pid.trim();
    const { medications, diagnosis, medical_note } = req.body;

    if (!medications || !Array.isArray(medications)) {
      return res.status(400).json({ success: false, message: 'Invalid medications format' });
    }

    // Get ongoing clinical sheet
    const { rows: drafts } = await db.query(
      `SELECT * FROM clinical_observations WHERE patient_id = $1 ORDER BY updated_at DESC LIMIT 1`,
      [pid]
    );

    if (drafts.length > 0) {
      const draft = drafts[0];
      let medMar = JSON.parse(draft.medication_mar_json || '{}');
      if (Array.isArray(medMar)) {
        medMar = { interventions: medMar };
      }
      if (!medMar.interventions) medMar.interventions = [];
      
      // Append the new medications (only if they have a name). Always push a
      // new row rather than reusing an existing blank slot -- a blank
      // intervention row may be a nurse's own pending MAR placeholder for
      // something unrelated, and silently claiming it corrupts their entry.
      medications.forEach(med => {
        if (med.name && med.name.trim()) {
          medMar.interventions.push({
            name: med.name,
            dose: med.dosage || '',
            route: med.route || '',
            frequency: med.frequency || '',
            duration: med.duration || '',
            instructions: med.instructions || '',
            start_time: '',
            end_time: ''
          });
        }
      });

      // Optionally update diagnosis and medical_note in identification if provided
      let ident = JSON.parse(draft.identification_json || '{}');
      if (diagnosis && diagnosis.trim()) {
        ident.diagnosis = diagnosis;
      }
      if (medical_note && medical_note.trim()) {
        ident.medical_note = medical_note;
      }

      await db.query(
        `UPDATE clinical_observations SET medication_mar_json = $1, identification_json = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
        [JSON.stringify(medMar), JSON.stringify(ident), draft.id]
      );
    } else {
      // Create new draft
      const patientRes = await db.query(`SELECT full_name FROM sukraa_patients WHERE pid = $1`, [pid]);
      const patientName = patientRes.rows[0] ? patientRes.rows[0].full_name : 'Unknown Patient';
      
      const newMedMar = {
        interventions: medications.filter(m => m.name && m.name.trim()).map(med => ({
          name: med.name,
          dose: med.dosage || '',
          route: med.route || '',
          frequency: med.frequency || '',
          duration: med.duration || '',
          instructions: med.instructions || '',
          start_time: '',
          end_time: ''
        }))
      };

      const newIdent = {
        ...(diagnosis && diagnosis.trim() ? { diagnosis } : {}),
        ...(medical_note && medical_note.trim() ? { medical_note } : {})
      };

      if (!req.user?.id) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }
      
      await db.query(
        `INSERT INTO clinical_observations (
          patient_id, queue_id, patient_name,
          identification_json, triage_json, progress_notes_json, 
          medication_mar_json, sbar_json, status, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          pid,
          `EP-${Date.now()}`,
          patientName,
          JSON.stringify(newIdent),
          '{}',
          '[]',
          JSON.stringify(newMedMar),
          '{}',
          'Draft',
          req.user.id
        ]
      );
    }

    res.json({ success: true, message: 'Prescription added to clinical sheet' });
  } catch (err) { next(err); }
});

module.exports = router;
