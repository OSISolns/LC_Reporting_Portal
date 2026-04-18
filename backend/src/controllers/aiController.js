'use strict';
const db       = require('../config/db');
const cache    = require('../utils/cache');
const { analyzeRecords } = require('../utils/localAI');

// ── DB helper ─────────────────────────────────────────────────────────────────
const queryRows = async (sql, args = []) => {
  const res = await db.query(sql, args);
  return res.rows;
};

// ── Module statistics — cached 30 s ──────────────────────────────────────────
exports.getModuleStats = async (req, res, next) => {
  try {
    const CACHE_KEY = 'ai:module_stats';
    const cached = cache.get(CACHE_KEY);
    if (cached) return res.json({ success: true, data: cached, cached: true });

    const [cancRows, refundRows, incidentRows, rtRows] = await Promise.all([
      queryRows(`SELECT status, COUNT(*) AS cnt FROM cancellation_requests GROUP BY status`),
      queryRows(`SELECT status, COUNT(*) AS cnt FROM refund_requests       GROUP BY status`),
      queryRows(`SELECT status, COUNT(*) AS cnt FROM incident_reports      GROUP BY status`),
      queryRows(`SELECT status, COUNT(*) AS cnt FROM results_transfers     GROUP BY status`),
    ]);

    const summarise = (rows) => {
      const counts = { pending: 0, verified: 0, approved: 0, rejected: 0, reviewed: 0 };
      let total = 0;
      for (const r of rows) {
        const n = Number(r.cnt);
        counts[r.status] = (counts[r.status] || 0) + n;
        total += n;
      }
      return { ...counts, total };
    };

    const [cancAmt, refundAmt] = await Promise.all([
      queryRows(`SELECT COALESCE(SUM(total_amount_cancelled), 0) AS total FROM cancellation_requests WHERE status = 'approved'`),
      queryRows(`SELECT COALESCE(SUM(amount_to_be_refunded), 0)  AS total FROM refund_requests       WHERE status = 'approved'`),
    ]);

    const since30 = `datetime('now', '-30 days')`;
    const [cRecent, rRecent, iRecent, rtRecent] = await Promise.all([
      queryRows(`SELECT COUNT(*) AS cnt FROM cancellation_requests WHERE created_at >= ${since30}`),
      queryRows(`SELECT COUNT(*) AS cnt FROM refund_requests       WHERE created_at >= ${since30}`),
      queryRows(`SELECT COUNT(*) AS cnt FROM incident_reports      WHERE created_at >= ${since30}`),
      queryRows(`SELECT COUNT(*) AS cnt FROM results_transfers     WHERE created_at >= ${since30}`),
    ]);

    const data = {
      cancellations: { ...summarise(cancRows), approvedAmountRWF: Number(cancAmt[0]?.total || 0),  last30Days: Number(cRecent[0]?.cnt || 0) },
      refunds:       { ...summarise(refundRows), approvedAmountRWF: Number(refundAmt[0]?.total || 0), last30Days: Number(rRecent[0]?.cnt || 0) },
      incidents:     { ...summarise(incidentRows), last30Days: Number(iRecent[0]?.cnt || 0) },
      transfers:     { ...summarise(rtRows), last30Days: Number(rtRecent[0]?.cnt || 0) },
    };

    cache.set(CACHE_KEY, data, 30_000); // cache 30 seconds
    res.json({ success: true, data, cached: false });
  } catch (err) { next(err); }
};

// ── Local AI: classify reasons by module ──────────────────────────────────────
exports.classifyReasons = async (req, res, next) => {
  try {
    const { module } = req.params; // 'cancellations' | 'refunds' | 'incidents'

    let rows = [];
    if (module === 'cancellations') {
      rows = await queryRows(
        `SELECT c.id,
                c.reason_for_cancellation AS reason,
                c.status,
                u.full_name AS cashier
         FROM   cancellation_requests c
         LEFT JOIN users u ON c.created_by = u.id
         ORDER  BY c.created_at DESC LIMIT 500`
      );
    } else if (module === 'refunds') {
      rows = await queryRows(
        `SELECT r.id,
                r.reason_for_refund AS reason,
                r.status,
                u.full_name AS cashier
         FROM   refund_requests r
         LEFT JOIN users u ON r.created_by = u.id
         ORDER  BY r.created_at DESC LIMIT 500`
      );
    } else if (module === 'incidents') {
      rows = await queryRows(
        `SELECT i.id,
                i.description AS reason,
                i.incident_type AS type,
                i.status,
                u.full_name AS cashier
         FROM   incident_reports i
         LEFT JOIN users u ON i.created_by = u.id
         ORDER  BY i.created_at DESC LIMIT 500`
      );
    } else if (module === 'transfers') {
      rows = await queryRows(
        `SELECT t.id,
                t.reason AS reason,
                t.status,
                u.full_name AS cashier
         FROM   results_transfers t
         LEFT JOIN users u ON t.created_by = u.id
         ORDER  BY t.created_at DESC LIMIT 500`
      );
    } else {
      return res.status(400).json({ success: false, message: 'Invalid module. Use: cancellations | refunds | incidents | transfers' });
    }

    // Run the local AI engine (pure JS — no API call)
    const result = analyzeRecords(rows, module);

    res.json({ success: true, data: { module, ...result } });
  } catch (err) { next(err); }
};

// ── Local AI: cross-module executive narrative ────────────────────────────────
exports.getExecutiveReport = async (req, res, next) => {
  try {
    const [cancStat, refundStat, incStat, rtStat] = await Promise.all([
      queryRows(`SELECT COUNT(*) AS total,
                        SUM(CASE WHEN status='approved' THEN 1 ELSE 0 END) AS approved,
                        SUM(CASE WHEN status='pending'  THEN 1 ELSE 0 END) AS pending
                 FROM cancellation_requests`),
      queryRows(`SELECT COUNT(*) AS total,
                        SUM(CASE WHEN status='approved' THEN 1 ELSE 0 END) AS approved,
                        SUM(CASE WHEN status='pending'  THEN 1 ELSE 0 END) AS pending
                 FROM refund_requests`),
      queryRows(`SELECT COUNT(*) AS total,
                        SUM(CASE WHEN status='reviewed' THEN 1 ELSE 0 END) AS reviewed
                 FROM incident_reports`),
      queryRows(`SELECT COUNT(*) AS total,
                        SUM(CASE WHEN status='approved' THEN 1 ELSE 0 END) AS approved,
                        SUM(CASE WHEN status='pending'  THEN 1 ELSE 0 END) AS pending,
                        SUM(CASE WHEN status='reviewed' THEN 1 ELSE 0 END) AS reviewed
                 FROM results_transfers`),
    ]);

    const c = cancStat[0],   cancTotal    = Number(c.total    || 0);
    const r = refundStat[0], refundTotal  = Number(r.total    || 0);
    const i = incStat[0],    incTotal     = Number(i.total    || 0);
    const rt = rtStat[0],    rtTotal      = Number(rt.total   || 0);
    const cancPending  = Number(c.pending  || 0);
    const refundPending = Number(r.pending || 0);
    const rtPending     = Number(rt.pending || 0);

    // Template-based executive narrative (no AI needed — data drives the text)
    const bottlenecks = [];
    if (cancPending  > 5)  bottlenecks.push(`${cancPending} cancellation requests awaiting approval`);
    if (refundPending > 5) bottlenecks.push(`${refundPending} refund requests awaiting verification`);
    if (rtPending > 5)     bottlenecks.push(`${rtPending} result transfers awaiting review`);

    const lines = [
      `Legacy Clinics currently has ${cancTotal} cancellation, ${refundTotal} refund, and ${incTotal} incident records across all reporting modules.`,
      cancTotal > 0
        ? `Cancellations: ${Number(c.approved || 0)} approved (${Math.round(Number(c.approved || 0) / cancTotal * 100)}%), ${cancPending} pending.`
        : 'No cancellation records on file yet.',
      refundTotal > 0
        ? `Refunds: ${Number(r.approved || 0)} approved (${Math.round(Number(r.approved || 0) / refundTotal * 100)}%), ${refundPending} pending.`
        : 'No refund records on file yet.',
      incTotal > 0
        ? `Incidents: ${Number(i.reviewed || 0)} of ${incTotal} reviewed (${Math.round(Number(i.reviewed || 0) / incTotal * 100)}%).`
        : 'No incident records on file yet.',
      rtTotal > 0
        ? `Result Transfers: ${Number(rt.approved || 0)} approved (${Math.round(Number(rt.approved || 0) / rtTotal * 100)}%).`
        : 'No result transfer records on file yet.',
      bottlenecks.length
        ? `⚠️ Bottleneck alert: ${bottlenecks.join(' and ')} — immediate review recommended.`
        : '✅ All queues are within normal thresholds.',
      'Recommend running per-module AI classification to identify the highest-severity reason patterns and associated staff members.',
    ];

    res.json({ success: true, data: { narrative: lines.join(' ') } });
  } catch (err) { next(err); }
};
