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
const { bulkPullAllPatients, bulkPullByPrefix } = require('../services/sukraaService');

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
      const logResult = await db.query(
        `INSERT INTO sukraa_sync_log (started_at, status) VALUES (?, 'running')`,
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
router.get('/search', async (req, res, next) => {
  try {
    const q     = (req.query.q || '').trim();
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);

    if (!q) {
      return res.json({ success: true, data: [] });
    }

    // Try local cache first
    const result = await db.query(
      `SELECT pid, full_name, age, dob, gender, phone, insurance
       FROM sukraa_patients
       WHERE full_name LIKE ? OR pid LIKE ? OR phone LIKE ?
       ORDER BY full_name ASC
       LIMIT ?`,
      [`%${q}%`, `%${q}%`, `%${q}%`, limit]
    );

    res.json({ success: true, data: result.rows, source: 'cache' });
  } catch (err) { next(err); }
});

// ── GET /api/patients/:pid ────────────────────────────────────────────────────
router.get('/:pid', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT * FROM sukraa_patients WHERE pid = ?`,
      [req.params.pid.trim()]
    );

    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'Patient not found in local cache.' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
});

// ── GET /api/patients?page=1&limit=50&q=text ─────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const q      = (req.query.q || '').trim();
    const page   = Math.max(parseInt(req.query.page) || 1, 1);
    const limit  = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = (page - 1) * limit;

    const where  = q ? `WHERE full_name LIKE ? OR pid LIKE ? OR phone LIKE ?` : '';
    const args   = q ? [`%${q}%`, `%${q}%`, `%${q}%`] : [];

    const [rows, count] = await Promise.all([
      db.query(
        `SELECT pid, full_name, age, dob, gender, phone, insurance, synced_at
         FROM sukraa_patients ${where}
         ORDER BY full_name ASC
         LIMIT ? OFFSET ?`,
        [...args, limit, offset]
      ),
      db.query(
        `SELECT COUNT(*) AS cnt FROM sukraa_patients ${where}`,
        args
      ),
    ]);

    res.json({
      success: true,
      data:    rows.rows,
      meta: {
        total:  Number(count.rows[0]?.cnt || 0),
        page,
        limit,
      },
    });
  } catch (err) { next(err); }
});

// ── Internal: upsert an array of patients into the cache ─────────────────────
async function upsertPatients(patients) {
  if (!patients.length) return 0;

  const valid = patients.filter(p => p.pid && p.full_name);
  let added   = 0;
  const CHUNK = 50;

  for (let i = 0; i < valid.length; i += CHUNK) {
    const chunk = valid.slice(i, i + CHUNK);
    const stmts = chunk.map(p => ({
      sql: `INSERT INTO sukraa_patients (pid, full_name, age, dob, gender, phone, insurance, extra_1, extra_2, synced_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
            ON CONFLICT(pid) DO UPDATE SET
              full_name  = excluded.full_name,
              age        = excluded.age,
              dob        = excluded.dob,
              gender     = excluded.gender,
              phone      = excluded.phone,
              insurance  = excluded.insurance,
              synced_at  = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
              updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`,
      args: [
        p.pid, p.full_name, p.age || null, p.dob || null,
        p.gender || null, p.phone || null, p.insurance || null,
        p.extra_1 || null, p.extra_2 || null,
      ],
    }));

    try {
      await db.batch(stmts);
      added += chunk.length;
    } catch (err) {
      console.error('[PatientSync] Batch error:', err.message);
    }
  }

  return added;
}

module.exports = router;
