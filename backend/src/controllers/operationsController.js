'use strict';
const db = require('../config/db');
const { logAction } = require('../middleware/audit');
const cache = require('../utils/cache');

const q  = async (sql, args = []) => (await db.query(sql, args)).rows;
const q1 = async (sql, args = []) => (await db.query(sql, args)).rows[0] || null;

// ─── Default daily checklist template ────────────────────────────────────────
const DEFAULT_TASKS = [
  { id: 'facility_walkthrough',   label: 'Facility Walkthrough Completed',          category: 'Inspection' },
  { id: 'cleaning_rounds',        label: 'Cleaning Rounds Verified',                category: 'Cleaning' },
  { id: 'restrooms_checked',      label: 'Restrooms & Waiting Areas Inspected',     category: 'Cleaning' },
  { id: 'reception_readiness',    label: 'Reception Area Readiness Confirmed',      category: 'Inspection' },
  { id: 'equipment_check',        label: 'General Equipment Operational Check',     category: 'Maintenance' },
  { id: 'generator_test',         label: 'Generator / Power Backup Test Logged',    category: 'Maintenance' },
  { id: 'hvac_check',             label: 'HVAC / Air Conditioning Checked',         category: 'Maintenance' },
  { id: 'fire_extinguisher',      label: 'Fire Extinguisher & Safety Equipment Checked', category: 'Safety' },
  { id: 'visitor_log',            label: 'Visitor Log Updated',                     category: 'Administration' },
  { id: 'incident_review',        label: 'Pending Incident Reports Reviewed',       category: 'Administration' },
  { id: 'supply_check',           label: 'Consumables & Supplies Level Checked',    category: 'Inventory' },
  { id: 'handover_briefing',      label: 'Shift Handover Briefing Conducted',       category: 'Administration' },
];

// ─── Get today's existing log or scaffold a new blank one ─────────────────────
async function getTodayLog(userId) {
  const today = new Date().toISOString().split('T')[0];
  const row = await q1(
    `SELECT * FROM operations_task_logs WHERE log_date = ? AND created_by = ? ORDER BY id DESC LIMIT 1`,
    [today, userId]
  );
  if (row) {
    return { ...row, tasks_json: JSON.parse(row.tasks_json || '[]') };
  }
  // Return a scaffold (not yet saved)
  return {
    id: null,
    log_date: today,
    created_by: userId,
    tasks_json: DEFAULT_TASKS.map(t => ({ ...t, done: false, notes: '' })),
    general_notes: '',
    status: 'draft',
  };
}

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * GET /api/operations/tasks/today
 * Returns the current user's task log for today (or a blank scaffold).
 */
exports.getTodayLog = async (req, res, next) => {
  try {
    const log = await getTodayLog(req.user.id);
    res.json({ success: true, data: log });
  } catch (err) { next(err); }
};

/**
 * GET /api/operations/tasks
 * List all task logs — filterable by date_from, date_to, user_id.
 */
exports.getAllLogs = async (req, res, next) => {
  try {
    const { date_from, date_to, user_id } = req.query;
    let sql = `
      SELECT t.*, u.full_name AS author_name
      FROM operations_task_logs t
      LEFT JOIN users u ON u.id = t.created_by
      WHERE 1=1
    `;
    const args = [];
    if (date_from) { sql += ' AND t.log_date >= ?'; args.push(date_from); }
    if (date_to)   { sql += ' AND t.log_date <= ?'; args.push(date_to); }
    if (user_id)   { sql += ' AND t.created_by = ?'; args.push(user_id); }
    sql += ' ORDER BY t.log_date DESC, t.id DESC LIMIT 200';

    const rows = await q(sql, args);
    const data = rows.map(r => ({
      ...r,
      tasks_json: JSON.parse(r.tasks_json || '[]'),
    }));
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

/**
 * GET /api/operations/tasks/:id
 */
exports.getLogById = async (req, res, next) => {
  try {
    const row = await q1('SELECT * FROM operations_task_logs WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ success: false, message: 'Log not found' });
    res.json({ success: true, data: { ...row, tasks_json: JSON.parse(row.tasks_json || '[]') } });
  } catch (err) { next(err); }
};

/**
 * POST /api/operations/tasks
 * Create or upsert today's task log for the current user.
 */
exports.createLog = async (req, res, next) => {
  try {
    const { tasks_json = [], general_notes = '', status = 'draft' } = req.body;
    const today = new Date().toISOString().split('T')[0];

    // Check if one already exists for today/user — upsert semantics
    const existing = await q1(
      `SELECT id FROM operations_task_logs WHERE log_date = ? AND created_by = ? ORDER BY id DESC LIMIT 1`,
      [today, req.user.id]
    );

    let row;
    if (existing) {
      const { rows } = await db.query(
        `UPDATE operations_task_logs
         SET tasks_json = ?, general_notes = ?, status = ?, updated_at = (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
         WHERE id = ?
         RETURNING *`,
        [JSON.stringify(tasks_json), general_notes, status, existing.id]
      );
      row = rows[0];
    } else {
      const { rows } = await db.query(
        `INSERT INTO operations_task_logs (log_date, created_by, created_by_name, tasks_json, general_notes, status)
         VALUES (?, ?, ?, ?, ?, ?)
         RETURNING *`,
        [today, req.user.id, req.user.fullName || '', JSON.stringify(tasks_json), general_notes, status]
      );
      row = rows[0];
    }

    await logAction(req, existing ? 'UPDATE' : 'CREATE', 'operations_task_log', row.id, { status });
    cache.invalidatePattern('ops:tasks');
    res.status(existing ? 200 : 201).json({ success: true, data: { ...row, tasks_json: JSON.parse(row.tasks_json || '[]') } });
  } catch (err) { next(err); }
};

/**
 * PATCH /api/operations/tasks/:id
 * Update an existing log entry.
 */
exports.updateLog = async (req, res, next) => {
  try {
    const { tasks_json, general_notes, status } = req.body;
    const existing = await q1('SELECT * FROM operations_task_logs WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ success: false, message: 'Log not found' });

    // Only the creator or admin/deputy_coo can update
    const managementRoles = ['admin', 'deputy_coo', 'coo'];
    if (existing.created_by !== req.user.id && !managementRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'You can only edit your own task logs.' });
    }

    const fields = [];
    const args = [];
    if (tasks_json !== undefined)    { fields.push('tasks_json = ?');    args.push(JSON.stringify(tasks_json)); }
    if (general_notes !== undefined) { fields.push('general_notes = ?'); args.push(general_notes); }
    if (status !== undefined)        { fields.push('status = ?');        args.push(status); }
    fields.push("updated_at = (strftime('%Y-%m-%dT%H:%M:%fZ','now'))");
    args.push(req.params.id);

    const { rows } = await db.query(
      `UPDATE operations_task_logs SET ${fields.join(', ')} WHERE id = ? RETURNING *`,
      args
    );
    await logAction(req, 'UPDATE', 'operations_task_log', req.params.id, { status });
    cache.invalidatePattern('ops:tasks');
    const row = rows[0];
    res.json({ success: true, data: { ...row, tasks_json: JSON.parse(row.tasks_json || '[]') } });
  } catch (err) { next(err); }
};

/**
 * DELETE /api/operations/tasks/:id
 * Admin only.
 */
exports.deleteLog = async (req, res, next) => {
  try {
    const existing = await q1('SELECT id FROM operations_task_logs WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ success: false, message: 'Log not found' });
    await db.query('DELETE FROM operations_task_logs WHERE id = ?', [req.params.id]);
    await logAction(req, 'DELETE', 'operations_task_log', req.params.id);
    cache.invalidatePattern('ops:tasks');
    res.json({ success: true, message: 'Log deleted.' });
  } catch (err) { next(err); }
};

/**
 * GET /api/operations/summary
 * Aggregated summary for the dashboard overview:
 * - Today's shift counts (total, open, flagged)
 * - Pending result transfers count
 * - Pending cancellations count
 * - Today's task completion rate
 */
exports.getSummary = async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Shifts today
    let shiftsTotal = 0, shiftsOpen = 0, shiftsClosed = 0, shiftsFlagged = 0;
    try {
      const shiftRows = await q(
        `SELECT status, flagged FROM shift_sessions WHERE DATE(opened_at) = ? OR DATE(closed_at) = ? OR opened_at LIKE ?`,
        [today, today, `${today}%`]
      );
      shiftsTotal  = shiftRows.length;
      shiftsOpen   = shiftRows.filter(s => s.status === 'open').length;
      shiftsFlagged = shiftRows.filter(s => s.flagged == 1 || s.flagged === true).length;
      shiftsClosed = shiftRows.filter(s => s.status === 'closed').length;
    } catch (e) {
      console.warn('⚠️ Shift summary query fallback:', e.message);
    }

    // Pending result transfers
    let pendingTransfers = 0;
    try {
      const rtRows = await q(
        `SELECT COUNT(*) as cnt FROM results_transfers WHERE status = 'pending'`,
        []
      );
      pendingTransfers = Number(rtRows[0]?.cnt || 0);
    } catch (e) {
      console.warn('⚠️ Result transfers count fallback:', e.message);
    }

    // Pending cancellations
    let pendingCancellations = 0;
    try {
      const cancelRows = await q(
        `SELECT COUNT(*) as cnt FROM cancellation_requests WHERE status = 'pending'`,
        []
      );
      pendingCancellations = Number(cancelRows[0]?.cnt || 0);
    } catch (e) {
      console.warn('⚠️ Cancellations count fallback:', e.message);
    }

    // Pending refunds
    let pendingRefunds = 0;
    try {
      const refundRows = await q(
        `SELECT COUNT(*) as cnt FROM refund_requests WHERE status = 'pending'`,
        []
      );
      pendingRefunds = Number(refundRows[0]?.cnt || 0);
    } catch (e) {
      console.warn('⚠️ Refunds count fallback:', e.message);
    }

    // Today's task logs (all users)
    let totalTasks = 0, doneTasks = 0, taskLogCount = 0;
    try {
      const taskRows = await q(
        `SELECT tasks_json FROM operations_task_logs WHERE log_date = ?`,
        [today]
      );
      taskLogCount = taskRows.length;
      for (const r of taskRows) {
        const tasks = JSON.parse(r.tasks_json || '[]');
        totalTasks += tasks.length;
        doneTasks  += tasks.filter(t => t.done).length;
      }
    } catch (e) {
      console.warn('⚠️ Task logs summary fallback:', e.message);
    }

    res.json({
      success: true,
      data: {
        shifts: { total: shiftsTotal, open: shiftsOpen, closed: shiftsClosed, flagged: shiftsFlagged },
        pendingTransfers,
        pendingCancellations,
        pendingRefunds,
        taskLogs: { submitted: taskLogCount, totalTasks, doneTasks },
      },
    });
  } catch (err) { next(err); }
};
