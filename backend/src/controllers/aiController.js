'use strict';
const db = require('../config/db');
const cache = require('../utils/cache');
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

    const [cancRows, refundRows, incidentRows, rtRows, shiftRows, securityRows, feedRows] = await Promise.all([
      queryRows(`SELECT status, COUNT(*) AS cnt FROM cancellation_requests GROUP BY status`),
      queryRows(`SELECT status, COUNT(*) AS cnt FROM refund_requests       GROUP BY status`),
      queryRows(`SELECT status, COUNT(*) AS cnt FROM incident_reports      GROUP BY status`),
      queryRows(`SELECT status, COUNT(*) AS cnt FROM results_transfers     GROUP BY status`),
      queryRows(`SELECT status, COUNT(*) AS cnt FROM shift_sessions        GROUP BY status`),
      queryRows(`SELECT action AS status, COUNT(*) AS cnt FROM audit_logs WHERE action IN ('LOGIN_FAILED', 'ACCOUNT_LOCKOUT', 'DEV_LOGIN_BYPASS', 'AUTH_FAILURE', 'PERMISSION_DENIED') GROUP BY action`),
      queryRows(`SELECT COUNT(*) AS cnt FROM internal_feedbacks`),
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
    const [cRecent, rRecent, iRecent, rtRecent, sRecent, secRecent, feedRecent] = await Promise.all([
      queryRows(`SELECT COUNT(*) AS cnt FROM cancellation_requests WHERE created_at >= ${since30}`),
      queryRows(`SELECT COUNT(*) AS cnt FROM refund_requests       WHERE created_at >= ${since30}`),
      queryRows(`SELECT COUNT(*) AS cnt FROM incident_reports      WHERE created_at >= ${since30}`),
      queryRows(`SELECT COUNT(*) AS cnt FROM results_transfers     WHERE created_at >= ${since30}`),
      queryRows(`SELECT COUNT(*) AS cnt FROM shift_sessions        WHERE opened_at >= ${since30}`),
      queryRows(`SELECT COUNT(*) AS cnt FROM audit_logs           WHERE action IN ('LOGIN_FAILED', 'ACCOUNT_LOCKOUT', 'AUTH_FAILURE', 'PERMISSION_DENIED') AND created_at >= ${since30}`),
      queryRows(`SELECT COUNT(*) AS cnt FROM internal_feedbacks     WHERE created_at >= ${since30}`),
    ]);

    const data = {
      cancellations: { ...summarise(cancRows), approvedAmountRWF: Number(cancAmt[0]?.total || 0), last30Days: Number(cRecent[0]?.cnt || 0) },
      refunds: { ...summarise(refundRows), approvedAmountRWF: Number(refundAmt[0]?.total || 0), last30Days: Number(rRecent[0]?.cnt || 0) },
      incidents: { ...summarise(incidentRows), last30Days: Number(iRecent[0]?.cnt || 0) },
      transfers: { ...summarise(rtRows), last30Days: Number(rtRecent[0]?.cnt || 0) },
      shifts: (() => {
        const counts = { pending: 0, reviewed: 0, flagged: 0, total: 0 };
        for (const r of shiftRows) {
          const n = Number(r.cnt);
          counts.total += n;
          if (r.status === 'open' || r.status === 'draft') counts.pending += n;
          else if (r.status === 'closed') counts.reviewed += n; // In shifts, 'closed' is the end state, though it might need 'review'
        }
        return { ...counts, last30Days: Number(sRecent[0]?.cnt || 0) };
      })(),
      security: req.user.role === 'admin' ? {
        ...summarise(securityRows),
        last30Days: Number(secRecent[0]?.cnt || 0)
      } : null,
      feedbacks: {
        total: Number(feedRows[0]?.cnt || 0),
        reviewed: Number(feedRows[0]?.cnt || 0),
        last30Days: Number(feedRecent[0]?.cnt || 0)
      },
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
    } else if (module === 'shifts') {
      rows = await queryRows(
        `SELECT s.id,
                s.flag_reasons AS reason,
                s.is_flagged,
                s.opened_at,
                s.closed_at,
                u.full_name AS cashier
         FROM   shift_sessions s
         LEFT JOIN users u ON s.user_id = u.id
         WHERE  s.status = 'closed'
         ORDER  BY s.closed_at DESC LIMIT 500`
      );
    } else if (module === 'security') {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Access denied. Security analysis is restricted to administrators.' });
      }
      rows = await queryRows(
        `SELECT id, action, details, ip_address, user_name, created_at
         FROM   audit_logs
         WHERE  action IN ('LOGIN_FAILED', 'ACCOUNT_LOCKOUT', 'DEV_LOGIN_BYPASS', 'PASSWORD_CHANGE', 'AUTH_FAILURE', 'PERMISSION_DENIED')
         ORDER  BY created_at DESC LIMIT 1000`
      );
    } else if (module === 'feedbacks') {
      rows = await queryRows(
        `SELECT id,
                concern_description AS reason,
                'Patient' AS cashier
         FROM   internal_feedbacks
         ORDER  BY created_at DESC LIMIT 500`
      );
    } else {
      return res.status(400).json({ success: false, message: 'Invalid module. Use: cancellations | refunds | incidents | transfers | shifts | security | feedbacks' });
    }

    // Run the local AI engine (pure JS — no API call)
    const result = analyzeRecords(rows, module);

    res.json({ success: true, data: { module, ...result } });
  } catch (err) { next(err); }
};

// ── Local AI: cross-module executive narrative ────────────────────────────────
exports.getExecutiveReport = async (req, res, next) => {
  try {
    const [cancStat, refundStat, incStat, rtStat, shiftStat, securityStat, feedStat] = await Promise.all([
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
      queryRows(`SELECT COUNT(*) AS total,
                        SUM(CASE WHEN is_flagged=1 THEN 1 ELSE 0 END) AS flagged,
                        SUM(CASE WHEN status='open' OR status='draft' THEN 1 ELSE 0 END) AS active
                 FROM shift_sessions`),
      queryRows(`SELECT COUNT(*) AS total,
                        SUM(CASE WHEN action='ACCOUNT_LOCKOUT' THEN 1 ELSE 0 END) AS critical,
                        SUM(CASE WHEN action='LOGIN_FAILED' THEN 1 ELSE 0 END) AS failures
                 FROM audit_logs WHERE created_at >= datetime('now', '-24 hours')`),
      queryRows(`SELECT COUNT(*) AS total FROM internal_feedbacks`),
    ]);

    const c = cancStat[0], cancTotal = Number(c.total || 0);
    const r = refundStat[0], refundTotal = Number(r.total || 0);
    const i = incStat[0], incTotal = Number(i.total || 0);
    const rt = rtStat[0], rtTotal = Number(rt.total || 0);
    const s = shiftStat[0], shiftTotal = Number(s.total || 0);
    const cancPending = Number(c.pending || 0);
    const refundPending = Number(r.pending || 0);
    const rtPending = Number(rt.pending || 0);
    const shiftFlagged = Number(s.flagged || 0);
    const shiftActive = Number(s.active || 0);

    const sec = securityStat[0], secTotal = Number(sec.total || 0);
    const secCritical = Number(sec.critical || 0);

    const feedTotal = Number(feedStat[0]?.total || 0);

    // Template-based executive narrative
    const BOTTLENECK_THRESHOLD = process.env.BOTTLENECK_THRESHOLD ? parseInt(process.env.BOTTLENECK_THRESHOLD) : 5;
    const bottlenecks = [];
    if (cancPending > BOTTLENECK_THRESHOLD) bottlenecks.push(`${cancPending} cancellation requests awaiting approval`);
    if (refundPending > BOTTLENECK_THRESHOLD) bottlenecks.push(`${refundPending} refund requests awaiting verification`);
    if (rtPending > BOTTLENECK_THRESHOLD) bottlenecks.push(`${rtPending} result transfers awaiting review`);

    const lines = [
      `Legacy Clinics currently has ${cancTotal} cancellation, ${refundTotal} refund, ${incTotal} incident, and ${feedTotal} internal feedback records across all reporting modules.`,
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
      shiftTotal > 0
        ? `Shifts: ${shiftActive} currently active, ${shiftFlagged} flagged for issues (${Math.round(shiftFlagged / shiftTotal * 100)}% flag rate).`
        : 'No shift records on file yet.',
      feedTotal > 0
        ? `Internal Feedbacks: ${feedTotal} total submissions on service areas collected and analyzed.`
        : 'No internal feedback records on file yet.',
      req.user.role === 'admin' && secTotal > 0
        ? `Security: ${secTotal} events in last 24h, ${secCritical} critical lockouts detected.`
        : '',
      bottlenecks.length
        ? `⚠️ Bottleneck alert: ${bottlenecks.join(' and ')} — immediate review recommended.`
        : '✅ All queues are within normal thresholds.',
      'Recommend running per-module AI classification to identify the highest-severity reason patterns and associated staff members.',
    ];

    res.json({ success: true, data: { narrative: lines.join(' ') } });
  } catch (err) { next(err); }
};
