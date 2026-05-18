'use strict';
const db           = require('../config/db');
const User         = require('../models/user');
const Notification = require('../models/notification');
const bcrypt       = require('bcryptjs');

// ─── SHIFT POLICY ─────────────────────────────────────────────────────────────
const MAX_SHIFT_HOURS  = 8;   // Auto-close threshold
const MIN_SHIFT_HOURS  = 6;   // Agent self-close minimum (general)
const EVENING_MIN_HOURS = 5;  // Special minimum for 3PM-8PM shift
const COOLDOWN_HOURS   = 12;  // Required rest between shifts
const SUPERVISOR_ROLES = ['admin', 'deputy_coo'];


// ─── Helpers ──────────────────────────────────────────────────────────────────
const q = async (sql, args = []) => (await db.query(sql, args)).rows;
const q1 = async (sql, args = []) => (await db.query(sql, args)).rows[0] || null;

/**
 * Determine which equipment items belong to a given shift role.
 */
const EQUIPMENT_MAP = {
  cashier: ['PC', 'MoMo Phone', 'Receipt Printer', 'Barcode Printer', 'Desk Phone'],
  helpdesk: ['PC', 'Receipt Printer', 'Barcode Printer', 'Desk Phone'],
  call_center: ['PC', 'Headset'],
  nurse: ['PC', 'Thermometer', 'Stethoscope', 'BP Machine', 'Pulse Oximeter'],
};

/**
 * Evaluate flags for a shift after closing.
 * Returns { is_flagged: bool, flag_reasons: string[] }
 */
function evaluateFlags(equipLogs, cashierClose) {
  const reasons = [];

  // Equipment flags
  const badEquip = (equipLogs || []).filter(
    (e) => e.equipment_status !== 'Working'
  );
  if (badEquip.length > 0) {
    reasons.push(
      `Equipment issues: ${badEquip.map((e) => `${e.equipment_name} (${e.equipment_status})`).join(', ')}`
    );
  }

  // Cashier-specific flags
  if (cashierClose) {
    if (!cashierClose.payments_all_successful) {
      reasons.push(`Failed payment: ${cashierClose.failed_payment_status || 'unknown'}`);
    }
    if (Math.abs(cashierClose.cash_discrepancy) > 0.01) {
      reasons.push(`Cash discrepancy: ${cashierClose.cash_discrepancy >= 0 ? '+' : ''}${cashierClose.cash_discrepancy} RWF`);
    }
  }

  return { is_flagged: reasons.length > 0, flag_reasons: reasons };
}

// ─── OPEN SHIFT ───────────────────────────────────────────────────────────────
exports.openShift = async (req, res, next) => {
  try {
    const userId       = req.user.id;
    const isSupervisor = SUPERVISOR_ROLES.includes(req.user.role);
    const { shift_role, equipment, opening_float, override, password } = req.body;
    const isOverride   = isSupervisor && override === true;

    // Verify Password
    if (!password) {
      return res.status(400).json({ success: false, message: 'Password confirmation is required.' });
    }
    const user = await User.findById(userId);
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid password. Action denied.' });
    }

    // Prevent opening a second shift if one is already open
    const existing = await q1(
      `SELECT id FROM shift_sessions WHERE user_id = ? AND status IN ('open','draft')`,
      [userId]
    );
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'You already have an open or draft shift. Please close it first.',
        shiftId: existing.id,
      });
    }

    // 12-hour cooldown check (skipped for supervisors with override)
    if (!isOverride) {
      const lastClosed = await q1(
        `SELECT closed_at FROM shift_sessions
         WHERE user_id = ? AND status = 'closed' AND closed_at IS NOT NULL
         ORDER BY closed_at DESC LIMIT 1`,
        [userId]
      );
      if (lastClosed) {
        const hoursSinceLast = (Date.now() - new Date(lastClosed.closed_at).getTime()) / 3_600_000;
        if (hoursSinceLast < COOLDOWN_HOURS) {
          const remainingMins = Math.ceil((COOLDOWN_HOURS - hoursSinceLast) * 60);
          return res.status(403).json({
            success: false,
            code:    'COOLDOWN_ACTIVE',
            message: `Policy requires a ${COOLDOWN_HOURS}-hour rest between shifts. Please wait ${remainingMins} more minute${remainingMins !== 1 ? 's' : ''}, or ask your supervisor to authorise an override.`,
            remainingMinutes: remainingMins,
            cooldownHours:    COOLDOWN_HOURS,
          });
        }
      }
    }

    // Validate shift role
    if (!['cashier', 'helpdesk', 'call_center', 'nurse'].includes(shift_role)) {
      return res.status(400).json({ success: false, message: 'Invalid shift role.' });
    }

    // Insert shift session
    const shiftResult = await db.query(
      `INSERT INTO shift_sessions (user_id, shift_role, status) VALUES (?, ?, 'open')`,
      [userId, shift_role]
    );
    const shiftId = shiftResult.rows[0]?.id ?? (await q1(`SELECT last_insert_rowid() AS id`)).id;

    // Resolve inserted ID reliably (LibSQL lastInsertRowid)
    const insertedShift = await q1(
      `SELECT id FROM shift_sessions WHERE user_id = ? ORDER BY id DESC LIMIT 1`,
      [userId]
    );
    const resolvedId = insertedShift?.id;

    // Insert equipment checklist (open snapshot)
    if (equipment && Array.isArray(equipment) && equipment.length > 0) {
      for (const item of equipment) {
        await db.query(
          `INSERT INTO shift_equipment_logs (shift_id, snapshot, equipment_name, equipment_status, remarks)
           VALUES (?, 'open', ?, ?, ?)`,
          [resolvedId, item.name, item.status, item.remarks || null]
        );
      }
    }

    // Cashier: store opening float
    if (shift_role === 'cashier' && opening_float !== undefined) {
      await db.query(
        `INSERT INTO shift_cashier_open (shift_id, opening_float) VALUES (?, ?)`,
        [resolvedId, parseFloat(opening_float) || 0]
      );
    }

    // Audit log — note if override was used
    await db.query(
      `INSERT INTO audit_logs (user_id, user_name, user_role, action, entity_type, entity_id, details)
       VALUES (?, ?, ?, 'SHIFT_OPEN', 'shift_sessions', ?, ?)`,
      [userId, req.user.full_name, req.user.role, resolvedId,
       JSON.stringify({ shift_role, cooldown_overridden: isOverride })]
    );

    res.status(201).json({
      success: true,
      message: 'Shift opened successfully.',
      data: { shiftId: resolvedId, shift_role, status: 'open', cooldown_overridden: isOverride },
    });
  } catch (err) { next(err); }
};

// ─── SAVE DRAFT (auto-save closing data without finalising) ───────────────────
exports.saveDraft = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const shift = await q1(
      `SELECT * FROM shift_sessions WHERE id = ? AND user_id = ?`,
      [id, userId]
    );
    if (!shift) return res.status(404).json({ success: false, message: 'Shift not found.' });
    if (shift.status === 'closed') {
      return res.status(400).json({ success: false, message: 'Cannot edit a closed shift.' });
    }

    const { handover_notes, equipment, cashier_close, helpdesk_close, callcenter_close } = req.body;

    // Update status to draft + handover notes
    await db.query(
      `UPDATE shift_sessions SET status = 'draft', handover_notes = ?, updated_at = (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) WHERE id = ?`,
      [handover_notes || null, id]
    );

    // Replace close-snapshot equipment
    if (equipment && Array.isArray(equipment)) {
      await db.query(`DELETE FROM shift_equipment_logs WHERE shift_id = ? AND snapshot = 'close'`, [id]);
      for (const item of equipment) {
        await db.query(
          `INSERT INTO shift_equipment_logs (shift_id, snapshot, equipment_name, equipment_status, remarks)
           VALUES (?, 'close', ?, ?, ?)`,
          [id, item.name, item.status, item.remarks || null]
        );
      }
    }

    // Upsert role-specific close data
    await upsertRoleCloseData(shift.shift_role, id, cashier_close, helpdesk_close, callcenter_close, req.body.nurse_close);

    res.json({ success: true, message: 'Draft saved.', data: { shiftId: id, status: 'draft' } });
  } catch (err) { next(err); }
};

// ─── CLOSE SHIFT (finalise) ───────────────────────────────────────────────────
exports.closeShift = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const isSupervisor = SUPERVISOR_ROLES.includes(req.user.role);

    const shift = await q1(
      isSupervisor
        ? `SELECT * FROM shift_sessions WHERE id = ?`
        : `SELECT * FROM shift_sessions WHERE id = ? AND user_id = ?`,
      isSupervisor ? [id] : [id, userId]
    );
    if (!shift) return res.status(404).json({ success: false, message: 'Shift not found.' });
    if (shift.status === 'closed') {
      return res.status(400).json({ success: false, message: 'Shift is already closed.' });
    }
    const { 
      handover_notes, 
      equipment, 
      cashier_close, 
      helpdesk_close, 
      callcenter_close, 
      override,
      password 
    } = req.body;
    const isOverride   = isSupervisor && override === true;

    // Verify Password
    if (!password) {
      return res.status(400).json({ success: false, message: 'Password confirmation is required.' });
    }
    const user = await User.findById(req.user.id);
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid password. Action denied.' });
    }

    if (!handover_notes || !handover_notes.trim()) {
      return res.status(400).json({ success: false, message: 'Handover notes are required to close a shift.' });
    }

    // Minimum shift duration check (skipped for supervisors with override)
    if (!isOverride) {
      const openedAt = new Date(shift.opened_at);
      const elapsedMs = Date.now() - openedAt.getTime();
      const elapsedHours = elapsedMs / 3_600_000;

      // Detect if this is an evening shift (started between 2:00 PM and 5:00 PM)
      const startHour = openedAt.getHours();
      const effectiveMinHours = (startHour >= 14 && startHour <= 17) ? EVENING_MIN_HOURS : MIN_SHIFT_HOURS;

      if (elapsedHours < effectiveMinHours) {
        const remainingMins = Math.ceil((effectiveMinHours - elapsedHours) * 60);
        return res.status(403).json({
          success: false,
          code:    'TOO_EARLY',
          message: `Shift cannot be closed yet. The minimum duration is ${effectiveMinHours} hours. Please wait ${remainingMins} more minute${remainingMins !== 1 ? 's' : ''}, or ask your supervisor to authorise an early closure.`,
          remainingMinutes: remainingMins,
          minShiftHours:    effectiveMinHours,
        });
      }
    }


    // Replace close-snapshot equipment
    if (equipment && Array.isArray(equipment)) {
      await db.query(`DELETE FROM shift_equipment_logs WHERE shift_id = ? AND snapshot = 'close'`, [id]);
      for (const item of equipment) {
        await db.query(
          `INSERT INTO shift_equipment_logs (shift_id, snapshot, equipment_name, equipment_status, remarks)
           VALUES (?, 'close', ?, ?, ?)`,
          [id, item.name, item.status, item.remarks || null]
        );
      }
    }

    // Upsert role-specific data
    await upsertRoleCloseData(shift.shift_role, id, cashier_close, helpdesk_close, callcenter_close, req.body.nurse_close);

    // Evaluate flags
    const allEquip = await q(
      `SELECT * FROM shift_equipment_logs WHERE shift_id = ?`, [id]
    );
    let cashierCloseRow = null;
    if (shift.shift_role === 'cashier') {
      cashierCloseRow = await q1(`SELECT * FROM shift_cashier_close WHERE shift_id = ?`, [id]);
    }
    const { is_flagged, flag_reasons } = evaluateFlags(allEquip, cashierCloseRow);

    // Finalise
    await db.query(
      `UPDATE shift_sessions
       SET status = 'closed',
           closed_at = (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
           handover_notes = ?,
           is_flagged = ?,
           flag_reasons = ?,
           updated_at = (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
       WHERE id = ?`,
      [handover_notes, is_flagged ? 1 : 0, JSON.stringify(flag_reasons), id]
    );

    // Audit log — note override if used
    await db.query(
      `INSERT INTO audit_logs (user_id, user_name, user_role, action, entity_type, entity_id, details)
       VALUES (?, ?, ?, 'SHIFT_CLOSE', 'shift_sessions', ?, ?)`,
      [userId, req.user.full_name, req.user.role, id,
       JSON.stringify({ is_flagged, flag_reasons, early_close_override: isOverride })]
    );

    res.json({
      success: true,
      message: isOverride ? 'Shift force-closed by supervisor.' : 'Shift closed successfully.',
      data: { shiftId: id, status: 'closed', is_flagged, flag_reasons, early_close_override: isOverride },
    });
  } catch (err) { next(err); }
};

// ─── REACTIVATE SHIFT (supervisor only) ─────────────────────────────────────────────
exports.reactivateShift = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    if (!SUPERVISOR_ROLES.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Only admins and deputy COOs can reactivate shifts.' });
    }

    if (!password) {
      return res.status(400).json({ success: false, message: 'Password confirmation is required.' });
    }
    const user = await User.findById(req.user.id);
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid password. Action denied.' });
    }

    const shift = await q1(`SELECT * FROM shift_sessions WHERE id = ?`, [id]);
    if (!shift) return res.status(404).json({ success: false, message: 'Shift not found.' });
    if (shift.status !== 'closed') {
      return res.status(400).json({ success: false, message: 'Only closed shifts can be reactivated.' });
    }

    await db.query(
      `UPDATE shift_sessions
       SET status = 'open', closed_at = NULL, reviewed_at = NULL, reviewed_by = NULL,
           is_flagged = 0, flag_reasons = NULL,
           updated_at = (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
       WHERE id = ?`,
      [id]
    );

    await db.query(
      `INSERT INTO audit_logs (user_id, user_name, user_role, action, entity_type, entity_id, details)
       VALUES (?, ?, ?, 'SHIFT_REACTIVATED', 'shift_sessions', ?, ?)`,
      [req.user.id, req.user.full_name, req.user.role, id,
       JSON.stringify({ reactivated_for_user_id: shift.user_id })]
    );

    // Notify the agent
    await Notification.create({
      userId:  shift.user_id,
      title:   '🔄 Your Shift Was Reactivated',
      message: `Your shift #${String(id).padStart(5,'0')} has been reopened by a supervisor. Please log in and complete your closing report.`,
      type:    'info',
      link:    `/shifts/${id}`,
    });

    res.json({ success: true, message: 'Shift reactivated successfully.', data: { shiftId: id, status: 'open' } });
  } catch (err) { next(err); }
};

// ─── GET MY ACTIVE SHIFT ──────────────────────────────────────────────────────
exports.getMyActiveShift = async (req, res, next) => {
  try {
    const shift = await q1(
      `SELECT s.*, u.full_name AS user_name
       FROM shift_sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.user_id = ? AND s.status IN ('open','draft')
       ORDER BY s.id DESC LIMIT 1`,
      [req.user.id]
    );
    if (!shift) return res.json({ success: true, data: null });

    const detail = await enrichShiftDetail(shift);
    res.json({ success: true, data: detail });
  } catch (err) { next(err); }
};

// ─── GET ALL SHIFTS (reviewer dashboard) ─────────────────────────────────────
exports.getAllShifts = async (req, res, next) => {
  try {
    const { role, date_from, date_to, employee_name, status, flagged, page = 1, limit = 25 } = req.query;

    let where = "s.shift_role != 'nurse'";
    const args = [];

    if (role) { where += ' AND s.shift_role = ?'; args.push(role); }
    if (status) { where += ' AND s.status = ?'; args.push(status); }
    if (flagged === '1') { where += ' AND s.is_flagged = 1'; }
    if (date_from) { where += ' AND s.opened_at >= ?'; args.push(date_from); }
    if (date_to) { where += ' AND s.opened_at <= ?'; args.push(date_to + 'T23:59:59Z'); }
    if (employee_name) { where += ' AND u.full_name LIKE ?'; args.push(`%${employee_name}%`); }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const rows = await q(
      `SELECT s.id, s.shift_role, s.status, s.opened_at, s.closed_at,
              s.is_flagged, s.flag_reasons, s.handover_notes,
              u.full_name AS user_name, u.id AS user_id,
              rv.full_name AS reviewed_by_name, s.reviewed_at
       FROM shift_sessions s
       JOIN users u ON s.user_id = u.id
       LEFT JOIN users rv ON s.reviewed_by = rv.id
       WHERE ${where}
       ORDER BY s.opened_at DESC
       LIMIT ? OFFSET ?`,
      [...args, parseInt(limit), offset]
    );

    const totalRow = await q1(
      `SELECT COUNT(*) AS cnt FROM shift_sessions s JOIN users u ON s.user_id = u.id WHERE ${where}`,
      args
    );

    res.json({
      success: true,
      data: rows.map(r => ({
        ...r,
        flag_reasons: r.flag_reasons ? JSON.parse(r.flag_reasons) : [],
        is_flagged: !!r.is_flagged,
      })),
      meta: { total: Number(totalRow?.cnt || 0), page: parseInt(page), limit: parseInt(limit) },
    });
  } catch (err) { next(err); }
};

// ─── GET SHIFT BY ID (detail) ─────────────────────────────────────────────────
exports.getShiftById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const shift = await q1(
      `SELECT s.*, u.full_name AS user_name, u.email AS user_email,
              rv.full_name AS reviewed_by_name
       FROM shift_sessions s
       JOIN users u ON s.user_id = u.id
       LEFT JOIN users rv ON s.reviewed_by = rv.id
       WHERE s.id = ?`,
      [id]
    );
    if (!shift) return res.status(404).json({ success: false, message: 'Shift not found.' });

    // Non-reviewers can only see their own shifts
    const REVIEWER_ROLES = ['principal_cashier', 'sales_manager', 'deputy_coo', 'coo', 'admin', 'it_officer'];
    if (!REVIEWER_ROLES.includes(req.user.role) && shift.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const detail = await enrichShiftDetail(shift);
    res.json({ success: true, data: detail });
  } catch (err) { next(err); }
};

// ─── MARK AS REVIEWED ─────────────────────────────────────────────────────────
exports.markReviewed = async (req, res, next) => {
  try {
    const { id } = req.params;
    const shift = await q1(`SELECT id, status FROM shift_sessions WHERE id = ?`, [id]);
    if (!shift) return res.status(404).json({ success: false, message: 'Shift not found.' });
    if (shift.status !== 'closed') {
      return res.status(400).json({ success: false, message: 'Only closed shifts can be reviewed.' });
    }

    await db.query(
      `UPDATE shift_sessions SET reviewed_by = ?, reviewed_at = (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')), updated_at = (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) WHERE id = ?`,
      [req.user.id, id]
    );

    await db.query(
      `INSERT INTO audit_logs (user_id, user_name, user_role, action, entity_type, entity_id)
       VALUES (?, ?, ?, 'SHIFT_REVIEWED', 'shift_sessions', ?)`,
      [req.user.id, req.user.full_name, req.user.role, id]
    );

    res.json({ success: true, message: 'Shift marked as reviewed.' });
  } catch (err) { next(err); }
};

// ─── Internal: enrich a shift row with related data ───────────────────────────
async function enrichShiftDetail(shift) {
  const equipOpen = await q(`SELECT * FROM shift_equipment_logs WHERE shift_id = ? AND snapshot = 'open'`, [shift.id]);
  const equipClose = await q(`SELECT * FROM shift_equipment_logs WHERE shift_id = ? AND snapshot = 'close'`, [shift.id]);

  let roleData = null;
  if (shift.shift_role === 'cashier') {
    const openData = await q1(`SELECT * FROM shift_cashier_open  WHERE shift_id = ?`, [shift.id]);
    const closeData = await q1(`SELECT * FROM shift_cashier_close WHERE shift_id = ?`, [shift.id]);
    roleData = {
      opening: openData,
      closing: closeData
        ? {
          ...closeData,
          insurances_used: closeData.insurances_used ? JSON.parse(closeData.insurances_used) : [],
        }
        : null,
    };
  } else if (shift.shift_role === 'helpdesk') {
    roleData = { closing: await q1(`SELECT * FROM shift_helpdesk_close WHERE shift_id = ?`, [shift.id]) };
  } else if (shift.shift_role === 'call_center') {
    const row = await q1(`SELECT * FROM shift_callcenter_close WHERE shift_id = ?`, [shift.id]);
    roleData = {
      closing: row
        ? {
          ...row,
          call_top_reasons: row.call_top_reasons ? JSON.parse(row.call_top_reasons) : [],
          followup_details: row.followup_details ? JSON.parse(row.followup_details) : [],
          has_pending_followups: !!row.has_pending_followups,
        }
        : null,
    };
  } else if (shift.shift_role === 'nurse') {
    roleData = { closing: await q1(`SELECT * FROM shift_nurse_close WHERE shift_id = ?`, [shift.id]) };
  }

  return {
    ...shift,
    is_flagged: !!shift.is_flagged,
    flag_reasons: shift.flag_reasons ? JSON.parse(shift.flag_reasons) : [],
    equipment: { open: equipOpen, close: equipClose },
    role_data: roleData,
  };
}

// ─── Internal: upsert role-specific closing data ─────────────────────────────
async function upsertRoleCloseData(shift_role, shiftId, cashier_close, helpdesk_close, callcenter_close, nurse_close) {
  if (shift_role === 'cashier' && cashier_close) {
    const c = cashier_close;
    const discrepancy =
      parseFloat(c.opening_float || 0) +
      parseFloat(c.cash_payments_total || 0) -
      parseFloat(c.closing_float || 0);

    const existing = await q1(`SELECT id FROM shift_cashier_close WHERE shift_id = ?`, [shiftId]);
    if (existing) {
      await db.query(
        `UPDATE shift_cashier_close SET
          total_patients = ?, total_insured = ?, total_private = ?,
          insurances_used = ?, total_momo_transactions = ?,
          total_card_transactions = ?, card_bank_terminal = ?,
          payments_all_successful = ?, failed_payment_status = ?,
          failed_payment_amount = ?, failed_payment_action_taken = ?,
          opening_float = ?, closing_float = ?, cash_payments_total = ?,
          cash_discrepancy = ?,
          updated_at = (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
        WHERE shift_id = ?`,
        [
          c.total_patients || 0, c.total_insured || 0, c.total_private || 0,
          JSON.stringify(c.insurances_used || []),
          c.total_momo_transactions || 0, c.total_card_transactions || 0,
          c.card_bank_terminal || null,
          c.payments_all_successful ? 1 : 0,
          c.failed_payment_status || null, c.failed_payment_amount || null,
          c.failed_payment_action_taken || null,
          c.opening_float || 0, c.closing_float || 0, c.cash_payments_total || 0,
          discrepancy,
          shiftId,
        ]
      );
    } else {
      await db.query(
        `INSERT INTO shift_cashier_close (
          shift_id, total_patients, total_insured, total_private,
          insurances_used, total_momo_transactions, total_card_transactions,
          card_bank_terminal, payments_all_successful, failed_payment_status,
          failed_payment_amount, failed_payment_action_taken,
          opening_float, closing_float, cash_payments_total, cash_discrepancy
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          shiftId,
          c.total_patients || 0, c.total_insured || 0, c.total_private || 0,
          JSON.stringify(c.insurances_used || []),
          c.total_momo_transactions || 0, c.total_card_transactions || 0,
          c.card_bank_terminal || null,
          c.payments_all_successful ? 1 : 0,
          c.failed_payment_status || null, c.failed_payment_amount || null,
          c.failed_payment_action_taken || null,
          c.opening_float || 0, c.closing_float || 0, c.cash_payments_total || 0,
          discrepancy,
        ]
      );
    }
  }

  if (shift_role === 'helpdesk' && helpdesk_close) {
    const h = helpdesk_close;
    const existing = await q1(`SELECT id FROM shift_helpdesk_close WHERE shift_id = ?`, [shiftId]);
    if (existing) {
      await db.query(
        `UPDATE shift_helpdesk_close SET patient_walkin_queries = ?, internal_staff_queries = ?, updated_at = (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) WHERE shift_id = ?`,
        [h.patient_walkin_queries || 0, h.internal_staff_queries || 0, shiftId]
      );
    } else {
      await db.query(
        `INSERT INTO shift_helpdesk_close (shift_id, patient_walkin_queries, internal_staff_queries) VALUES (?,?,?)`,
        [shiftId, h.patient_walkin_queries || 0, h.internal_staff_queries || 0]
      );
    }
  }

  if (shift_role === 'call_center' && callcenter_close) {
    const cc = callcenter_close;
    const existing = await q1(`SELECT id FROM shift_callcenter_close WHERE shift_id = ?`, [shiftId]);
    const payload = [
      cc.inbound_total || 0, cc.inbound_assisted || 0, cc.inbound_dropped || 0,
      cc.outbound_total || 0, cc.outbound_reached || 0, cc.outbound_unreached || 0,
      JSON.stringify(cc.call_top_reasons || []),
      cc.has_pending_followups ? 1 : 0,
      JSON.stringify(cc.followup_details || []),
    ];
    if (existing) {
      await db.query(
        `UPDATE shift_callcenter_close SET
          inbound_total=?, inbound_assisted=?, inbound_dropped=?,
          outbound_total=?, outbound_reached=?, outbound_unreached=?,
          call_top_reasons=?, has_pending_followups=?, followup_details=?,
          updated_at=(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
        WHERE shift_id = ?`,
        [...payload, shiftId]
      );
    } else {
      await db.query(
        `INSERT INTO shift_callcenter_close (
          shift_id, inbound_total, inbound_assisted, inbound_dropped,
          outbound_total, outbound_reached, outbound_unreached,
          call_top_reasons, has_pending_followups, followup_details
        ) VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [shiftId, ...payload]
      );
    }
  }
  
  if (shift_role === 'nurse' && nurse_close) {
    const n = nurse_close;
    const existing = await q1(`SELECT id FROM shift_nurse_close WHERE shift_id = ?`, [shiftId]);
    if (existing) {
      await db.query(
        `UPDATE shift_nurse_close SET total_assessments = ?, total_incidents = ?, handover_sbar_sb = ?, handover_sbar_ar = ?, updated_at = (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) WHERE shift_id = ?`,
        [n.total_assessments || 0, n.total_incidents || 0, n.handover_sbar_sb || null, n.handover_sbar_ar || null, shiftId]
      );
    } else {
      await db.query(
        `INSERT INTO shift_nurse_close (shift_id, total_assessments, total_incidents, handover_sbar_sb, handover_sbar_ar) VALUES (?,?,?,?,?)`,
        [shiftId, n.total_assessments || 0, n.total_incidents || 0, n.handover_sbar_sb || null, n.handover_sbar_ar || null]
      );
    }
  }
}

// ─── AUTO-CLOSE EXPIRED SHIFTS ────────────────────────────────────────────────
/**
 * Runs periodically. Finds any shift open longer than MAX_SHIFT_HOURS and:
 *  1. Force-closes it with an OVERTIME flag
 *  2. Sends an in-app notification to the agent
 *  3. Sends an in-app notification to every admin + deputy_coo
 */
exports.autoCloseExpiredShifts = async () => {
  try {
    const cutoff = new Date(Date.now() - MAX_SHIFT_HOURS * 60 * 60 * 1000).toISOString();

    const expired = await q(
      `SELECT s.id, s.user_id, s.shift_role, s.opened_at, u.full_name AS user_name
       FROM shift_sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.status IN ('open','draft') AND s.opened_at <= ?`,
      [cutoff]
    );

    if (expired.length === 0) return 0;

    // Fetch supervisors once
    const [admins, deputyCoos] = await Promise.all([
      User.findByRole('admin'),
      User.findByRole('deputy_coo'),
    ]);
    const supervisors = [...admins, ...deputyCoos];

    for (const shift of expired) {
      const overtimeReason = `Shift exceeded ${MAX_SHIFT_HOURS}-hour policy limit — auto-closed by system`;
      const flagReasons    = [overtimeReason];

      // Force-close the shift
      await db.query(
        `UPDATE shift_sessions
         SET status       = 'closed',
             closed_at    = (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
             is_flagged   = 1,
             flag_reasons = ?,
             handover_notes = ?,
             updated_at   = (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
         WHERE id = ?`,
        [
          JSON.stringify(flagReasons),
          `AUTO-CLOSED: Shift exceeded ${MAX_SHIFT_HOURS}-hour limit. No handover submitted.`,
          shift.id,
        ]
      );

      // Audit trail
      await db.query(
        `INSERT INTO audit_logs (user_id, user_name, user_role, action, entity_type, entity_id, details)
         VALUES (?, ?, 'system', 'SHIFT_AUTO_CLOSED', 'shift_sessions', ?, ?)`,
        [
          shift.user_id,
          shift.user_name,
          shift.id,
          JSON.stringify({ reason: overtimeReason, shift_role: shift.shift_role }),
        ]
      );

      const openedAt  = new Date(shift.opened_at).toLocaleString('en-GB', {
        hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short',
      });
      const shiftLink = `/shifts/${shift.id}`;

      // Notify the agent who failed to close
      await Notification.create({
        userId:  shift.user_id,
        title:   '⚠️ Your Shift Was Auto-Closed',
        message: `Your shift (opened at ${openedAt}) exceeded the ${MAX_SHIFT_HOURS}-hour policy limit and has been automatically closed and flagged. Please contact your supervisor immediately.`,
        type:    'error',
        link:    shiftLink,
      });

      // Notify every supervisor (admin + deputy_coo)
      for (const sup of supervisors) {
        await Notification.create({
          userId:  sup.id,
          title:   `🚨 Shift Overtime Alert — ${shift.user_name}`,
          message: `${shift.user_name}'s ${shift.shift_role.replace('_', ' ')} shift (opened ${openedAt}) exceeded ${MAX_SHIFT_HOURS} hours without closure. It has been auto-closed and flagged for mandatory review.`,
          type:    'error',
          link:    shiftLink,
        });
      }

      console.log(`[ShiftPolicy] Auto-closed shift #${shift.id} for ${shift.user_name}`);
    }

    return expired.length;
  } catch (err) {
    console.error('[ShiftPolicy] autoCloseExpiredShifts error:', err.message);
    return 0;
  }
};

/**
 * Bulk review multiple shifts at once.
 */
exports.bulkReview = async (req, res, next) => {
  try {
    const { ids, password } = req.body;
    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ success: false, message: 'Please provide an array of shift IDs.' });
    }

    if (!password) {
      return res.status(400).json({ success: false, message: 'Password confirmation is required.' });
    }
    const user = await User.findById(req.user.id);
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid password. Action denied.' });
    }

    await db.query(
      `UPDATE shift_sessions 
       SET reviewed_by = ?, 
           reviewed_at = (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
           updated_at = (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
       WHERE id IN (${ids.map(() => '?').join(',')}) AND status = 'closed' AND reviewed_at IS NULL`,
      [req.user.id, ...ids]
    );

    res.json({ success: true, message: `Successfully reviewed ${ids.length} shifts.` });
  } catch (err) {
    next(err);
  }
};

/**
 * Admin/Deputy COO only: Update any shift detail.
 */
exports.updateShiftByAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, opened_at, closed_at, handover_notes, is_flagged } = req.body;

    const updates = [];
    const args = [];

    if (status) { updates.push('status = ?'); args.push(status); }
    if (opened_at) { updates.push('opened_at = ?'); args.push(opened_at); }
    if (closed_at) { updates.push('closed_at = ?'); args.push(closed_at); }
    if (handover_notes) { updates.push('handover_notes = ?'); args.push(handover_notes); }
    if (is_flagged !== undefined) { updates.push('is_flagged = ?'); args.push(is_flagged ? 1 : 0); }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No update data provided.' });
    }

    updates.push("updated_at = (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))");
    args.push(id);

    await db.query(
      `UPDATE shift_sessions SET ${updates.join(', ')} WHERE id = ?`,
      args
    );

    await db.query(
      `INSERT INTO audit_logs (user_id, user_name, user_role, action, entity_type, entity_id, details)
       VALUES (?, ?, ?, 'SHIFT_MANUAL_UPDATE', 'shift_sessions', ?, ?)`,
      [req.user.id, req.user.full_name, req.user.role, id, JSON.stringify(req.body)]
    );

    res.json({ success: true, message: 'Shift updated successfully.' });
  } catch (err) {
    next(err);
  }
};

/**
 * Admin only: Delete a shift log.
 */
exports.deleteShift = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // First nullify references in related tables to avoid FK violations
    const tables = ['shift_cashier_close', 'shift_helpdesk_close', 'shift_callcenter_close'];
    for (const table of tables) {
      await db.query(`DELETE FROM ${table} WHERE shift_id = ?`, [id]);
    }

    await db.query('DELETE FROM shift_sessions WHERE id = ?', [id]);

    await db.query(
      `INSERT INTO audit_logs (user_id, user_name, user_role, action, entity_type, entity_id, details)
       VALUES (?, ?, ?, 'SHIFT_DELETED', 'shift_sessions', ?, ?)`,
      [req.user.id, req.user.full_name, req.user.role, id, JSON.stringify({ deleted_at: new Date() })]
    );

    res.json({ success: true, message: 'Shift record permanently removed.' });
  } catch (err) {
    next(err);
  }
};
