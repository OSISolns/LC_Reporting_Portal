'use strict';
const db           = require('../config/db');
const User         = require('../models/user');
const Notification = require('../models/notification');
const bcrypt       = require('bcryptjs');
const { exportToExcel } = require('../utils/excel');
const ExcelJS      = require('exceljs');

// ─── SHIFT POLICY ─────────────────────────────────────────────────────────────
const MAX_SHIFT_HOURS  = 8;   // Auto-close threshold
const MIN_SHIFT_HOURS  = 6;   // Agent self-close minimum (general)
const EVENING_MIN_HOURS = 5;  // Special minimum for 3PM-8PM shift
const COOLDOWN_HOURS   = 0;   // Rest policy between shifts disabled (cooldown removed)
const CHEF_NURSE_ROLES = ['chef-nurse', 'chef_nurse', 'chief_nurse', 'chief-nurse', 'deputy_chef_nurse', 'deputy-chef-nurse', 'deputy_chief_nurse'];

const isChefNurseRole = (role) => {
  const r = String(role || '').toLowerCase();
  return CHEF_NURSE_ROLES.some(k => r.includes(k) || r === k);
};

const SUPERVISOR_ROLES = ['admin', 'deputy_coo', 'coo', 'medical_director', ...CHEF_NURSE_ROLES];

exports.COOLDOWN_HOURS   = COOLDOWN_HOURS;
exports.CHEF_NURSE_ROLES = CHEF_NURSE_ROLES;
exports.isChefNurseRole = isChefNurseRole;
exports.SUPERVISOR_ROLES = SUPERVISOR_ROLES;


// ─── Helpers ──────────────────────────────────────────────────────────────────
const q = async (sql, args = []) => (await db.query(sql, args)).rows;
const q1 = async (sql, args = []) => (await db.query(sql, args)).rows[0] || null;

/**
 * Normalize equipment status to satisfy Turso database CHECK constraint:
 * CHECK (equipment_status IN ('Working', 'Needs Repair', 'Broken/Missing'))
 */
const normalizeEquipmentStatus = (status) => {
  if (!status) return 'Working';
  const s = String(status).trim().toLowerCase();
  if (s === 'available' || s === 'working') return 'Working';
  if (s === 'needs repair' || s === 'needs_repair') return 'Needs Repair';
  if (s === 'broken' || s === 'missing' || s === 'broken/missing' || s === 'broken_missing') return 'Broken/Missing';
  return 'Working';
};

function getWaveConfig(shift) {
  if (!shift) return { schedule: "07:00 AM - 03:00 PM", duration: 8, startHourStr: "07:00", endHourStr: "15:00" };
  
  if (shift.wave === 'Wave 1' || shift.start_hour === '07:00') {
    return { schedule: "07:00 AM - 03:00 PM", duration: 8, startHourStr: "07:00", endHourStr: "15:00" };
  } else if (shift.wave === 'Wave 2' || shift.start_hour === '08:00') {
    return { schedule: "08:00 AM - 04:00 PM", duration: 8, startHourStr: "08:00", endHourStr: "16:00" };
  } else if (shift.wave === 'Wave 4' || shift.start_hour === '09:00') {
    return { schedule: "09:00 AM - 05:00 PM", duration: 8, startHourStr: "09:00", endHourStr: "17:00" };
  } else if (shift.wave === 'Wave 3' || shift.start_hour === '15:00') {
    return { schedule: "03:00 PM - 09:00 PM", duration: 6, startHourStr: "15:00", endHourStr: "21:00" };
  } else {
    const openedDate = new Date(shift.opened_at || Date.now());
    const hour = openedDate.getHours();
    const isMorning = hour < 14;
    return {
      schedule: isMorning ? "07:00 AM - 03:00 PM" : "03:00 PM - 09:00 PM",
      duration: isMorning ? 8 : 6,
      startHourStr: isMorning ? "07:00" : "15:00",
      endHourStr: isMorning ? "15:00" : "21:00"
    };
  }
}

function getKigaliNow() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Kigali',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(new Date());

  const map = {};
  for (const p of parts) map[p.type] = p.value;
  const hour = parseInt(map.hour, 10);
  const minute = parseInt(map.minute, 10);
  return {
    year: parseInt(map.year, 10),
    month: parseInt(map.month, 10),
    day: parseInt(map.day, 10),
    hour,
    minute,
    second: parseInt(map.second, 10),
    totalMinutes: hour * 60 + minute,
    timeStr: `${map.hour}:${map.minute}`
  };
}

function getWaveStartTime(shift) {
  if (!shift || !shift.opened_at) return null;
  const openedDate = new Date(shift.opened_at);
  const cfg = getWaveConfig(shift);
  const [hStr, mStr] = cfg.startHourStr.split(':');
  
  const startTime = new Date(openedDate);
  startTime.setHours(parseInt(hStr, 10), parseInt(mStr, 10), 0, 0);
  return startTime;
}

function getWaveEndDateTime(shift) {
  if (!shift || !shift.opened_at) return null;
  const waveCfg = getWaveConfig(shift);
  const [startH, startM] = (waveCfg.startHourStr || '07:00').split(':').map(Number);
  const [endH, endM] = (waveCfg.endHourStr || '15:00').split(':').map(Number);

  // Calendar date of opened_at in Kigali timezone (UTC+2)
  const kigaliParts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Kigali',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour12: false
  }).formatToParts(new Date(shift.opened_at));
  const kmap = {};
  for (const p of kigaliParts) kmap[p.type] = p.value;

  const year = parseInt(kmap.year, 10);
  const month = parseInt(kmap.month, 10) - 1;
  let endDay = parseInt(kmap.day, 10);
  if (endH < startH) {
    endDay += 1;
  }

  // Kigali is UTC+2 (no DST). UTC hour = Kigali hour - 2
  const endUtc = Date.UTC(year, month, endDay, endH - 2, endM, 0, 0);
  return new Date(endUtc);
}

/**
 * Calculate the exact 12:00 AM (midnight) facility cutoff for a given shift.
 * A shift opened on calendar day D in Kigali remains valid until 12:00 AM at the end of day D
 * (which is 00:00:00 Kigali time on day D+1).
 */
function getShiftMidnightCutoff(shift) {
  if (!shift || !shift.opened_at) return null;
  const openedDate = new Date(shift.opened_at);
  if (isNaN(openedDate.getTime())) return null;

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Kigali',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour12: false
  }).formatToParts(openedDate);

  const kmap = {};
  for (const p of parts) kmap[p.type] = p.value;
  const year = parseInt(kmap.year, 10);
  const month = parseInt(kmap.month, 10) - 1;
  const day = parseInt(kmap.day, 10);

  // 12:00 AM (00:00:00) Kigali time on day + 1 (Africa/Kigali is UTC+2 -> subtract 2 hours from UTC midnight)
  const midnightUtc = Date.UTC(year, month, day + 1, 0, 0, 0, 0) - (2 * 60 * 60 * 1000);
  return new Date(midnightUtc);
}

/**
 * Resolve standard reporting period in Kigali timezone (UTC+2).
 * Supports: 'day' / 'today', 'week' / 'this_week', 'month' / 'this_month', 'all', or custom date_from/date_to.
 */
function getKigaliPeriodDates(period, date_from, date_to) {
  if (date_from || date_to) {
    const fromStr = date_from ? (date_from.includes('T') ? date_from : `${date_from}T00:00:00+02:00`) : null;
    const toStr = date_to ? (date_to.includes('T') ? date_to : `${date_to}T23:59:59.999+02:00`) : null;
    return {
      dateFrom: fromStr ? new Date(fromStr).toISOString() : null,
      dateTo: toStr ? new Date(toStr).toISOString() : null,
      label: date_from && date_to ? `${date_from} to ${date_to}` : (date_from ? `From ${date_from}` : `Until ${date_to}`),
      periodType: 'custom',
      dateStamp: date_from && date_to ? `${date_from}_to_${date_to}` : (date_from || date_to || 'Custom')
    };
  }

  const kn = getKigaliNow();
  const pad = (n) => String(n).padStart(2, '0');
  const todayStr = `${kn.year}-${pad(kn.month)}-${pad(kn.day)}`;

  if (period === 'day' || period === 'today') {
    return {
      dateFrom: new Date(`${todayStr}T00:00:00+02:00`).toISOString(),
      dateTo: new Date(`${todayStr}T23:59:59.999+02:00`).toISOString(),
      label: `Day (${todayStr})`,
      periodType: 'day',
      dateStamp: todayStr
    };
  }

  if (period === 'week' || period === 'this_week') {
    const kigaliDate = new Date(kn.year, kn.month - 1, kn.day);
    const dayOfWeek = kigaliDate.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(kn.year, kn.month - 1, kn.day + diffToMonday);
    const sunday = new Date(kn.year, kn.month - 1, kn.day + diffToMonday + 6);
    const monStr = `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`;
    const sunStr = `${sunday.getFullYear()}-${pad(sunday.getMonth() + 1)}-${pad(sunday.getDate())}`;
    return {
      dateFrom: new Date(`${monStr}T00:00:00+02:00`).toISOString(),
      dateTo: new Date(`${sunStr}T23:59:59.999+02:00`).toISOString(),
      label: `Week (${monStr} to ${sunStr})`,
      periodType: 'week',
      dateStamp: `${monStr}_to_${sunStr}`
    };
  }

  if (period === 'month' || period === 'this_month') {
    const firstDayStr = `${kn.year}-${pad(kn.month)}-01`;
    const lastDay = new Date(kn.year, kn.month, 0).getDate();
    const lastDayStr = `${kn.year}-${pad(kn.month)}-${pad(lastDay)}`;
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const monthName = monthNames[kn.month - 1];
    return {
      dateFrom: new Date(`${firstDayStr}T00:00:00+02:00`).toISOString(),
      dateTo: new Date(`${lastDayStr}T23:59:59.999+02:00`).toISOString(),
      label: `Month (${monthName} ${kn.year})`,
      periodType: 'month',
      dateStamp: `${kn.year}-${pad(kn.month)}`
    };
  }

  return {
    dateFrom: null,
    dateTo: null,
    label: 'All Time / Full Registry',
    periodType: 'all',
    dateStamp: todayStr
  };
}


/**
 * Determine which equipment items belong to a given shift role.
 */
const EQUIPMENT_MAP = {
  cashier: ['PC', 'MoMo Phone', 'Receipt Printer', 'Barcode Printer', 'Desk Phone'],
  rama_rssb: ['PC', 'Receipt Printer', 'Barcode Printer', 'MoMo Phone', 'Desk Phone'],
  helpdesk: ['PC', 'Receipt Printer', 'Desk Phone', 'Waiting No. Stamp'],
  customer_care: ['PC', 'Receipt Printer', 'Desk Phone', 'Waiting No. Stamp'],
  call_center: ['PC', 'Headset', 'Desk Phone'],
  nurse: ['PC', 'Thermometer', 'Stethoscope', 'BP Machine', 'Pulse Oximeter'],
  rn_midwife: ['PC', 'Thermometer', 'Stethoscope', 'BP Machine', 'Pulse Oximeter', 'Doppler / Foetal Stethoscope', 'Measuring Tape'],
  vip_lounge: ['PC', 'Desk Phone'],
  imaging: ['PC / Workstation', 'Modality Console', 'Reader / Printer', 'Archiving System'],
};

// Imaging (Radiology) 6-wave shift scheme, keyed by "start-end". Distinct from
// the general clinic waves: some bands share a start hour but differ by end
// hour, so both bounds are needed. Source: Imaging Department task sheet.
const IMAGING_WAVES = {
  '07:00-15:00': 'Wave 1',
  '08:00-16:00': 'Wave 2',
  '09:00-15:00': 'Wave 3',
  '07:00-21:00': 'Wave 4',
  '08:00-21:00': 'Wave 5',
  '15:00-21:00': 'Wave 6',
};

function resolveImagingWave(startHour, endHour) {
  if (!startHour || !endHour) return null;
  return IMAGING_WAVES[`${startHour}-${endHour}`] || null;
}

/**
 * Evaluate flags for a shift after closing.
 * Returns { is_flagged: bool, flag_reasons: string[] }
 */
function evaluateFlags(equipLogs, cashierClose) {
  const reasons = [];

  // Equipment flags — only the CLOSING snapshot reveals post-shift damage.
  // Flagging open-snapshot issues would double-count pre-existing faults.
  const badEquip = (equipLogs || []).filter(
    (e) => e.snapshot === 'close' && e.equipment_status !== 'Working'
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

/**
 * Helper to verify user's password and enforce lockout policy.
 */
async function verifyPasswordAndCheckLockout(req, password, user) {
  // Check if locked out
  if (user.lockout_until && new Date(user.lockout_until) > new Date()) {
    const waitTime = Math.ceil((new Date(user.lockout_until) - new Date()) / 60000);
    return {
      allowed: false,
      status: 403,
      message: `Account is temporarily locked due to multiple failed attempts. Please try again in ${waitTime} minutes.`
    };
  }

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    const attempts = await User.incrementFailedAttempts(user.id);
    
    // Log Security Violation
    try {
      const { logAction } = require('../middleware/audit');
      await logAction(req, 'AUTH_FAILURE', 'user', user.id, { username: user.username, attempt_count: attempts });
    } catch (e) {}

    if (attempts >= 5) {
      await User.lockout(user.id, 5);
      
      try {
        const { logAction } = require('../middleware/audit');
        await logAction(req, 'ACCOUNT_LOCKOUT', 'user', user.id, { username: user.username, lockout_duration: '5m' });
      } catch (e) {}

      // Report to Admin
      try {
        const admins = await User.findByRole('admin');
        for (const admin of admins) {
          await Notification.create({
            userId: admin.id,
            title: 'Security Alert: Account Lockout',
            message: `User ${user.full_name} (${user.username}) has been locked out after 5 failed verification attempts.`,
            type: 'error',
            link: '/audit-logs'
          });
        }
      } catch (e) {}

      return {
        allowed: false,
        status: 403,
        message: 'Account locked for 5 minutes due to 5 failed attempts.'
      };
    } else {
      const remaining = 5 - attempts;
      return {
        allowed: false,
        status: 400,
        message: `Invalid password. Warning: ${remaining} attempts remaining before account lockout.`
      };
    }
  }

  // Success - reset attempts
  await User.resetAttempts(user.id);
  return { allowed: true };
}

// ─── OPEN SHIFT ───────────────────────────────────────────────────────────────
exports.openShift = async (req, res, next) => {
  try {
    const userId       = req.user.id;
    const isSupervisor = SUPERVISOR_ROLES.includes(req.user.role);
    const { shift_role, equipment, opening_float, override, password, start_hour, nursing_ward } = req.body;
    const isOverride   = isSupervisor && override === true;

    // Verify Password
    if (!password) {
      return res.status(400).json({ success: false, message: 'Password confirmation is required.' });
    }
    const user = await User.findById(userId);
    const authResult = await verifyPasswordAndCheckLockout(req, password, user);
    if (!authResult.allowed) {
      return res.status(authResult.status).json({ success: false, message: authResult.message });
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

    // Validate shift role
    if (!['cashier', 'helpdesk', 'customer_care', 'call_center', 'nurse', 'rn_midwife', 'vip_lounge', 'imaging', 'rama_rssb'].includes(shift_role)) {
      return res.status(400).json({ success: false, message: 'Invalid shift role.' });
    }

    // Station Validation
    if ((shift_role === 'nurse' || shift_role === 'rn_midwife') && !nursing_ward) {
      return res.status(400).json({ success: false, message: 'Please select a Nursing Ward (STATION 1, STATION 2, MINOR SURGERY, or PAEDIATRICS) before opening shift.' });
    }

    if (shift_role === 'cashier' && !nursing_ward) {
      return res.status(400).json({ success: false, message: 'Please select a Cashier Station (Ground-Floor, First-Floor, or Paediatrics) before opening shift.' });
    }

    if ((shift_role === 'helpdesk' || shift_role === 'customer_care') && !nursing_ward) {
      return res.status(400).json({ success: false, message: 'Please select a Station (Ground-Floor or First-Floor) before opening shift.' });
    }

    // Wave Allocation Validation for all roles
    if (!start_hour) {
      return res.status(400).json({ success: false, message: 'Starting hour is required for wave allocation.' });
    }

    // A shift cannot be opened before the wave starting time
    const kigaliNow = getKigaliNow();
    const [startH, startM] = start_hour.split(':').map(Number);
    const waveStartMinutes = startH * 60 + (startM || 0);

    if (kigaliNow.totalMinutes < waveStartMinutes && !isOverride) {
      return res.status(400).json({
        success: false,
        code: 'TOO_EARLY_TO_OPEN',
        message: `Shift cannot be opened before the wave starting time (${start_hour}). Current facility time is ${kigaliNow.timeStr}.`,
      });
    }

    let wave = null;
    if (shift_role === 'imaging') {
      const { end_hour } = req.body;
      wave = resolveImagingWave(start_hour, end_hour);
      if (!wave) {
        return res.status(400).json({
          success: false,
          message: 'Invalid imaging wave. Valid bands: 07:00–15:00 (W1), 08:00–16:00 (W2), 09:00–15:00 (W3), 07:00–21:00 (W4), 08:00–21:00 (W5), 15:00–21:00 (W6).',
        });
      }
    } else {
      if (!['07:00', '08:00', '09:00', '15:00'].includes(start_hour)) {
        return res.status(400).json({ success: false, message: 'Invalid starting hour. Must be 07:00, 08:00, 09:00, or 15:00.' });
      }
      if (start_hour === '07:00') wave = 'Wave 1';
      else if (start_hour === '08:00') wave = 'Wave 2';
      else if (start_hour === '09:00') wave = 'Wave 4';
      else if (start_hour === '15:00') wave = 'Wave 3';
    }

    // Insert shift session
    const shiftResult = await db.query(
      `INSERT INTO shift_sessions (user_id, shift_role, status, start_hour, wave, nursing_ward) VALUES (?, ?, 'open', ?, ?, ?) RETURNING id`,
      [userId, shift_role, start_hour || null, wave, nursing_ward || null]
    );

    // Resolve inserted ID reliably
    const resolvedId =
      shiftResult.rows[0]?.id ??
      shiftResult.lastInsertRowid ??
      (await q1(`SELECT id FROM shift_sessions WHERE user_id = ? AND status = 'open' ORDER BY id DESC LIMIT 1`, [userId]))?.id;

    // Insert equipment checklist (open snapshot)
    if (equipment && Array.isArray(equipment) && equipment.length > 0) {
      for (const item of equipment) {
        await db.query(
          `INSERT INTO shift_equipment_logs (shift_id, snapshot, equipment_name, equipment_status, remarks)
           VALUES (?, 'open', ?, ?, ?)`,
          [resolvedId, item.name, normalizeEquipmentStatus(item.status), item.remarks || null]
        );
      }
    }

    // Cashier / RAMA_RSSB: store opening float
    if ((shift_role === 'cashier' || shift_role === 'rama_rssb') && opening_float !== undefined) {
      const openTable = shift_role === 'rama_rssb' ? 'shift_rama_rssb_open' : 'shift_cashier_open';
      await db.query(
        `INSERT INTO ${openTable} (shift_id, opening_float) VALUES (?, ?)`,
        [resolvedId, parseFloat(opening_float) || 0]
      );
    }

    // Audit log — note if override was used
    await db.query(
      `INSERT INTO audit_logs (user_id, user_name, user_role, action, entity_type, entity_id, details)
       VALUES (?, ?, ?, 'SHIFT_OPEN', 'shift_sessions', ?, ?)`,
      [userId, req.user.full_name, req.user.role, resolvedId,
       JSON.stringify({ shift_role, cooldown_overridden: isOverride, start_hour, wave })]
    );

    res.status(201).json({
      success: true,
      message: 'Shift opened successfully.',
      data: { shiftId: resolvedId, shift_role, status: 'open', cooldown_overridden: isOverride, start_hour, wave },
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

    const { handover_notes, equipment, cashier_close, helpdesk_close, callcenter_close, vip_lounge_close } = req.body;

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
          [id, item.name, normalizeEquipmentStatus(item.status), item.remarks || null]
        );
      }
    }

    // Upsert role-specific close data
    await upsertRoleCloseData(shift.shift_role, id, cashier_close, helpdesk_close, callcenter_close, req.body.nurse_close, vip_lounge_close);

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
      vip_lounge_close,
      override,
      password 
    } = req.body;
    const isOverride   = isSupervisor && override === true;

    // Verify Password
    if (!password) {
      return res.status(400).json({ success: false, message: 'Password confirmation is required.' });
    }
    const user = await User.findById(req.user.id);
    const authResult = await verifyPasswordAndCheckLockout(req, password, user);
    if (!authResult.allowed) {
      return res.status(authResult.status).json({ success: false, message: authResult.message });
    }

    // Closing time check:
    // No minimum duration restrictions. The shift can be closed anytime before or up to
    // 1 hour after the shift end time.
    // If closing passes the end of shift for more than 1 hour, supervisor authorization/override is required.
    let supervisorOverridden = isOverride;
    if (!supervisorOverridden) {
      const waveCfg = getWaveConfig(shift);
      const waveEnd = getWaveEndDateTime(shift);
      if (waveEnd) {
        const oneHourPastEnd = new Date(waveEnd.getTime() + 60 * 60 * 1000);
        if (Date.now() > oneHourPastEnd.getTime()) {
          // Check if supervisor credentials were provided in the request
          const { supervisor_username, supervisor_password } = req.body;
          if (supervisor_username && supervisor_password) {
            const supUser = await User.findByUsername(supervisor_username);
            if (supUser && SUPERVISOR_ROLES.includes(supUser.role)) {
              const supMatch = await bcrypt.compare(supervisor_password, supUser.password_hash);
              if (supMatch) {
                supervisorOverridden = true;
              } else {
                return res.status(403).json({
                  success: false,
                  code: 'SUPERVISOR_AUTH_FAILED',
                  message: 'Invalid supervisor password for shift closure authorization.',
                });
              }
            } else {
              return res.status(403).json({
                success: false,
                code: 'NOT_SUPERVISOR',
                message: 'The authorizing user is not an authorized supervisor.',
              });
            }
          } else {
            const endStr = waveCfg.endHourStr || 'end of shift';
            const cutoffStr = new Intl.DateTimeFormat('en-GB', {
              timeZone: 'Africa/Kigali',
              hour: '2-digit',
              minute: '2-digit',
              hour12: false
            }).format(oneHourPastEnd);
            return res.status(403).json({
              success: false,
              code: 'EXCEEDED_CLOSING_LIMIT',
              message: `Shift closure window expired. Shifts must be closed within 1 hour after shift end (${endStr}). The 1-hour closure cutoff was ${cutoffStr}. Please ask your supervisor to authorise closure.`,
              waveSchedule: waveCfg.schedule,
              endHourStr: waveCfg.endHourStr,
              cutoffStr,
            });
          }
        }
      }
    }

    // Replace close-snapshot equipment
    if (equipment && Array.isArray(equipment)) {
      await db.query(`DELETE FROM shift_equipment_logs WHERE shift_id = ? AND snapshot = 'close'`, [id]);
      for (const item of equipment) {
        await db.query(
          `INSERT INTO shift_equipment_logs (shift_id, snapshot, equipment_name, equipment_status, remarks)
           VALUES (?, 'close', ?, ?, ?)`,
          [id, item.name, normalizeEquipmentStatus(item.status), item.remarks || null]
        );
      }
    }

    // Upsert role-specific data
    await upsertRoleCloseData(shift.shift_role, id, cashier_close, helpdesk_close, callcenter_close, req.body.nurse_close, vip_lounge_close);

    // Evaluate flags
    const allEquip = await q(
      `SELECT * FROM shift_equipment_logs WHERE shift_id = ?`, [id]
    );
    let cashierCloseRow = null;
    if (shift.shift_role === 'cashier' || shift.shift_role === 'rama_rssb') {
      const closeTable = shift.shift_role === 'rama_rssb' ? 'shift_rama_rssb_close' : 'shift_cashier_close';
      cashierCloseRow = await q1(`SELECT * FROM ${closeTable} WHERE shift_id = ?`, [id]);
    } else if (shift.shift_role === 'helpdesk' || shift.shift_role === 'customer_care') {
      const helpdeskCloseRow = await q1(`SELECT * FROM shift_helpdesk_close WHERE shift_id = ?`, [id]);
      if (helpdeskCloseRow && helpdeskCloseRow.has_billed) {
        cashierCloseRow = helpdeskCloseRow;
      }
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
    const authResult = await verifyPasswordAndCheckLockout(req, password, user);
    if (!authResult.allowed) {
      return res.status(authResult.status).json({ success: false, message: authResult.message });
    }

    const shift = await q1(`SELECT * FROM shift_sessions WHERE id = ?`, [id]);
    if (!shift) return res.status(404).json({ success: false, message: 'Shift not found.' });
    if (shift.status !== 'closed') {
      return res.status(400).json({ success: false, message: 'Only closed shifts can be reactivated.' });
    }

    // Preserve flag history in the audit trail BEFORE clearing it from the session row.
    const previousFlags = shift.flag_reasons ? JSON.parse(shift.flag_reasons) : [];

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
       JSON.stringify({
         reactivated_for_user_id: shift.user_id,
         cleared_flag_reasons: previousFlags,
         was_flagged: !!shift.is_flagged,
       })]
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

// ─── TRANSFER STATION ────────────────────────────────────────────────────────
exports.transferStation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { new_shift_role, transfer_reason, password, new_nursing_ward } = req.body;
    const managerId = req.user.id;

    // Check manager/requester permission (COO, Deputy COO, Operations Staff, Admin)
    const allowedTransferRoles = ['coo', 'deputy_coo', 'operations_staff', 'admin'];
    if (!allowedTransferRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only COO, Deputy COO, Operations Staff, and Admin can transfer staff stations.'
      });
    }

    // 1. Password verification for manager
    const manager = await User.findById(managerId);
    const authResult = await verifyPasswordAndCheckLockout(req, password, manager);
    if (!authResult.allowed) {
      return res.status(authResult.status).json({ success: false, message: authResult.message });
    }

    // 2. Fetch target shift to transfer
    const currentShift = await q1(`SELECT * FROM shift_sessions WHERE id = ?`, [id]);
    if (!currentShift) {
      return res.status(404).json({ success: false, message: 'Shift session not found.' });
    }
    if (currentShift.status === 'closed') {
      return res.status(400).json({ success: false, message: 'Cannot transfer a closed shift.' });
    }
    if (currentShift.shift_role === new_shift_role && (currentShift.nursing_ward || '') === (new_nursing_ward || '')) {
      return res.status(400).json({ success: false, message: `Staff member is already assigned to ${new_shift_role}${currentShift.nursing_ward ? ' (' + currentShift.nursing_ward + ')' : ''}.` });
    }

    const staffUser = await User.findById(currentShift.user_id);
    if (!staffUser) {
      return res.status(404).json({ success: false, message: 'Staff user not found.' });
    }

    // 3. Terminate / close current shift
    const existingNotes = (currentShift.handover_notes || '').trim();
    let cleanNotes = existingNotes;
    if (cleanNotes.startsWith('enc:')) {
      cleanNotes = cleanNotes.replace(/^enc:[a-f0-9]+:[a-f0-9]+:[a-f0-9]+\s*/i, '').trim();
    }
    const transferNote = `[STATION TRANSFER] Transferred from ${currentShift.shift_role.toUpperCase()}${currentShift.nursing_ward ? ' (' + currentShift.nursing_ward + ')' : ''} to ${new_shift_role.toUpperCase()}${new_nursing_ward ? ' (' + new_nursing_ward + ')' : ''} by ${req.user.full_name} (${req.user.role}). Reason: ${transfer_reason}`;
    const combinedNotes = cleanNotes ? `${cleanNotes}\n${transferNote}` : transferNote;

    await db.query(
      `UPDATE shift_sessions 
       SET status = 'closed',
           closed_at = (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
           handover_notes = ?,
           transfer_status = 'transferred_out',
           transferred_to_role = ?,
           transferred_by = ?,
           transfer_reason = ?,
           updated_at = (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
       WHERE id = ?`,
      [combinedNotes, new_shift_role, managerId, transfer_reason, id]
    );

    // 4. Open NEW shift for the staff member
    const newWave = currentShift.wave || 'Wave 1';
    const newStartHour = currentShift.start_hour || '07:00';
    const ward = (new_shift_role === 'nurse' || new_shift_role === 'rn_midwife' || new_shift_role === 'cashier' || new_shift_role === 'helpdesk') 
      ? (new_nursing_ward || currentShift.nursing_ward || ((new_shift_role === 'nurse' || new_shift_role === 'rn_midwife') ? 'STATION 1' : 'Ground-Floor')) 
      : null;

    const insertResult = await db.query(
      `INSERT INTO shift_sessions 
       (user_id, shift_role, status, start_hour, wave, nursing_ward, transferred_from_shift_id, transfer_status, transfer_reason, transferred_by)
       VALUES (?, ?, 'open', ?, ?, ?, ?, 'transferred_in', ?, ?)`,
      [currentShift.user_id, new_shift_role, newStartHour, newWave, ward, id, transfer_reason, managerId]
    );

    const newShiftId = insertResult.rows[0]?.id ?? (await q1(`SELECT last_insert_rowid() AS id`))?.id;

    // 5. Populate opening equipment checklist for new station
    const defaultEquip = EQUIPMENT_MAP[new_shift_role] || ['PC'];
    for (const item of defaultEquip) {
      await db.query(
        `INSERT INTO shift_equipment_logs (shift_id, snapshot, equipment_name, equipment_status, remarks)
         VALUES (?, 'open', ?, 'Working', ?)`,
        [newShiftId, item, `Auto-assigned upon transfer from ${currentShift.shift_role}`]
      );
    }

    // 6. Audit log
    await db.query(
      `INSERT INTO audit_logs (user_id, user_name, user_role, action, entity_type, entity_id, details)
       VALUES (?, ?, ?, 'SHIFT_STATION_TRANSFERRED', 'shift_sessions', ?, ?)`,
      [managerId, req.user.full_name, req.user.role, id,
       JSON.stringify({ staff_user_id: currentShift.user_id, old_shift_id: id, new_shift_id: newShiftId, old_role: currentShift.shift_role, new_role: new_shift_role, reason: transfer_reason })]
    );

    // 7. Notification to staff
    try {
      await Notification.create({
        userId: currentShift.user_id,
        title: 'Station Transfer Notice',
        message: `Your active shift station has been transferred from ${currentShift.shift_role.toUpperCase()} to ${new_shift_role.toUpperCase()} by ${req.user.full_name}. Reason: ${transfer_reason}`,
        type: 'info',
        link: `/shifts/${newShiftId}`
      });
    } catch (e) {}

    res.json({
      success: true,
      message: `Staff station transferred successfully from ${currentShift.shift_role} to ${new_shift_role}.`,
      data: {
        oldShiftId: id,
        newShiftId: newShiftId,
        newRole: new_shift_role,
        staffName: staffUser.full_name
      }
    });

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

// ─── GET MY SHIFT HISTORY ────────────────────────────────────────────────────
exports.getMyHistory = async (req, res, next) => {
  try {
    const shifts = await q(
      `SELECT s.*, u.full_name AS user_name
       FROM shift_sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.user_id = ? AND s.status = 'closed'
       ORDER BY s.id DESC LIMIT 5`,
      [req.user.id]
    );

    const data = [];
    for (const shift of shifts) {
      data.push(await enrichShiftDetail(shift));
    }
    
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

// ─── GET ALL SHIFTS (reviewer dashboard) ─────────────────────────────────────
exports.getAllShifts = async (req, res, next) => {
  try {
    const { role, period, date_from, date_to, employee_name, status, flagged, page = 1, limit = 25 } = req.query;

    let where = "1=1";
    if (isChefNurseRole(req.user.role)) {
      where = role ? "1=1" : "s.shift_role = 'nurse'";
    } else if (req.user.role === 'nurse' || req.user.role === 'rn_midwife') {
      where = "s.shift_role IN ('nurse', 'rn_midwife')";
    }
    const args = [];

    if (role) { where += ' AND s.shift_role = ?'; args.push(role); }
    if (status) { where += ' AND s.status = ?'; args.push(status); }
    if (flagged === '1') { where += ' AND s.is_flagged = 1'; }

    const periodDates = getKigaliPeriodDates(period, date_from, date_to);
    if (periodDates.dateFrom) { where += ' AND s.opened_at >= ?'; args.push(periodDates.dateFrom); }
    if (periodDates.dateTo) { where += ' AND s.opened_at <= ?'; args.push(periodDates.dateTo); }
    if (employee_name) { where += ' AND u.full_name LIKE ?'; args.push(`%${employee_name}%`); }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const rows = await q(
      `SELECT s.id, s.shift_role, s.status, s.opened_at, s.closed_at,
              s.is_flagged, s.flag_reasons, s.handover_notes, s.start_hour, s.wave,
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
    const REVIEWER_ROLES = ['principal_cashier', 'sales_manager', 'deputy_coo', 'coo', 'admin', 'it_officer', 'pa', 'operations_staff', ...CHEF_NURSE_ROLES];
    if (!REVIEWER_ROLES.includes(req.user.role) && !isChefNurseRole(req.user.role) && shift.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const detail = await enrichShiftDetail(shift);
    res.json({ success: true, data: detail });
  } catch (err) { next(err); }
};

// ─── GET LATEST HANDOVER ───────────────────────────────────────────────────────
exports.getLatestHandover = async (req, res, next) => {
  try {
    const shiftRole = req.query.shift_role || req.user.role;
    const workstation = req.query.workstation || req.query.nursing_ward;
    const isList = req.query.list === 'true' || req.query.all === 'true';

    // Authorization check
    const isSupervisor = ['admin', 'coo', 'deputy_coo', 'chef-nurse', 'medical_director', ...CHEF_NURSE_ROLES].includes(req.user.role);
    const clinicalRoles = ['nurse', 'rn_midwife', 'chef-nurse', 'doctor', 'consultant', 'pa', 'medical_director', ...CHEF_NURSE_ROLES];
    const frontOfficeRoles = ['customer_care', 'vip_lounge', 'helpdesk', 'call_center', 'cashier', 'rama_rssb'];

    let isAuthorized = isSupervisor;
    if (!isAuthorized) {
      if (req.user.role === shiftRole || ((shiftRole === 'nurse' || shiftRole === 'rn_midwife') && clinicalRoles.includes(req.user.role))) {
        isAuthorized = true;
      } else if (frontOfficeRoles.includes(req.user.role) && (frontOfficeRoles.includes(shiftRole) || shiftRole === 'all')) {
        isAuthorized = true;
      } else if (clinicalRoles.includes(req.user.role) && shiftRole === 'all') {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'You are not authorized to view handover notes for this category.' });
    }

    // List mode: return recent handovers matching mission and/or workstation
    if (isList) {
      const whereClauses = ["s.status = 'closed'", "s.handover_notes IS NOT NULL", "s.handover_notes != ''"];
      const params = [];

      if (shiftRole && shiftRole !== 'all') {
        whereClauses.push('s.shift_role = ?');
        params.push(shiftRole);
      } else if (!isSupervisor) {
        if (clinicalRoles.includes(req.user.role)) {
          whereClauses.push("s.shift_role IN ('nurse', 'rn_midwife')");
        } else if (frontOfficeRoles.includes(req.user.role)) {
          whereClauses.push("s.shift_role IN ('customer_care', 'vip_lounge', 'helpdesk', 'call_center', 'cashier', 'rama_rssb')");
        }
      }

      if (workstation && workstation !== 'all') {
        whereClauses.push('s.nursing_ward = ?');
        params.push(workstation);
      }

      const sortOrder = (req.query.sort_order || req.query.order || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';
      const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
      const shifts = await q(
        `SELECT s.id, s.handover_notes, s.closed_at, s.opened_at, u.full_name AS user_name,
                s.shift_role, s.nursing_ward, s.nursing_ward AS workstation, s.wave, s.start_hour, s.is_flagged
         FROM shift_sessions s
         JOIN users u ON s.user_id = u.id
         WHERE ${whereClauses.join(' AND ')}
         ORDER BY COALESCE(s.closed_at, s.created_at, s.opened_at) ${sortOrder}, s.id ${sortOrder}
         LIMIT ?`,
        [...params, limit]
      );

      return res.json({ success: true, data: shifts });
    }

    // Single handover mode: prioritize exact match on workstation if provided
    let shift = null;
    if (workstation && workstation !== 'all' && shiftRole && shiftRole !== 'all') {
      shift = await q1(
        `SELECT s.id, s.handover_notes, s.closed_at, s.opened_at, u.full_name AS user_name,
                s.shift_role, s.nursing_ward, s.nursing_ward AS workstation, s.wave, s.start_hour, s.is_flagged
         FROM shift_sessions s
         JOIN users u ON s.user_id = u.id
         WHERE s.shift_role = ? AND s.nursing_ward = ? AND s.status = 'closed' AND s.handover_notes IS NOT NULL AND s.handover_notes != ''
         ORDER BY s.closed_at DESC
         LIMIT 1`,
        [shiftRole, workstation]
      );
    }

    // Fallback to latest for shift_role if not found with workstation
    if (!shift && shiftRole && shiftRole !== 'all') {
      shift = await q1(
        `SELECT s.id, s.handover_notes, s.closed_at, s.opened_at, u.full_name AS user_name,
                s.shift_role, s.nursing_ward, s.nursing_ward AS workstation, s.wave, s.start_hour, s.is_flagged
         FROM shift_sessions s
         JOIN users u ON s.user_id = u.id
         WHERE s.shift_role = ? AND s.status = 'closed' AND s.handover_notes IS NOT NULL AND s.handover_notes != ''
         ORDER BY s.closed_at DESC
         LIMIT 1`,
        [shiftRole]
      );
    }

    // Fallback if shiftRole is 'all'
    if (!shift) {
      const fallbackWhere = ["s.status = 'closed'", "s.handover_notes IS NOT NULL", "s.handover_notes != ''"];
      if (!isSupervisor) {
        if (clinicalRoles.includes(req.user.role)) {
          fallbackWhere.push("s.shift_role IN ('nurse', 'rn_midwife')");
        } else if (frontOfficeRoles.includes(req.user.role)) {
          fallbackWhere.push("s.shift_role IN ('customer_care', 'vip_lounge', 'helpdesk', 'call_center', 'cashier', 'rama_rssb')");
        }
      }
      shift = await q1(
        `SELECT s.id, s.handover_notes, s.closed_at, s.opened_at, u.full_name AS user_name,
                s.shift_role, s.nursing_ward, s.nursing_ward AS workstation, s.wave, s.start_hour, s.is_flagged
         FROM shift_sessions s
         JOIN users u ON s.user_id = u.id
         WHERE ${fallbackWhere.join(' AND ')}
         ORDER BY s.closed_at DESC
         LIMIT 1`
      );
    }

    return res.json({ success: true, data: shift || null });
  } catch (err) {
    next(err);
  }
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
  if (shift.shift_role === 'cashier' || shift.shift_role === 'rama_rssb') {
    const openTable = shift.shift_role === 'rama_rssb' ? 'shift_rama_rssb_open' : 'shift_cashier_open';
    const closeTable = shift.shift_role === 'rama_rssb' ? 'shift_rama_rssb_close' : 'shift_cashier_close';
    const openData = await q1(`SELECT * FROM ${openTable} WHERE shift_id = ?`, [shift.id]);
    const closeData = await q1(`SELECT * FROM ${closeTable} WHERE shift_id = ?`, [shift.id]);
    roleData = {
      opening: openData,
      closing: closeData
        ? {
          ...closeData,
          insurances_used: closeData.insurances_used ? JSON.parse(closeData.insurances_used) : [],
        }
        : null,
    };
  } else if (shift.shift_role === 'helpdesk' || shift.shift_role === 'customer_care') {
    const row = await q1(`SELECT * FROM shift_helpdesk_close WHERE shift_id = ?`, [shift.id]);
    let momoBreakdown = null;
    let cardBreakdown = null;
    if (row && row.momo_pay_code) {
      try { momoBreakdown = JSON.parse(row.momo_pay_code); } catch (e) { momoBreakdown = null; }
    }
    if (row && row.card_bank_terminal) {
      try { cardBreakdown = JSON.parse(row.card_bank_terminal); } catch (e) { cardBreakdown = null; }
    }
    roleData = {
      closing: row
        ? {
          ...row,
          has_billed: !!row.has_billed,
          momo_breakdown: momoBreakdown,
          card_breakdown: cardBreakdown,
          insurances_used: row.insurances_used ? JSON.parse(row.insurances_used) : [],
          payments_all_successful: row.payments_all_successful !== 0 && row.payments_all_successful !== false,
        }
        : null,
    };
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
  } else if (shift.shift_role === 'nurse' || shift.shift_role === 'rn_midwife') {
    const row = await q1(`SELECT * FROM shift_nurse_close WHERE shift_id = ?`, [shift.id]);
    roleData = {
      closing: row
        ? {
            ...row,
            critical_patients_details: row.critical_patients_details
              ? (typeof row.critical_patients_details === 'string'
                  ? JSON.parse(row.critical_patients_details)
                  : row.critical_patients_details)
              : [],
          }
        : null
    };
  } else if (shift.shift_role === 'vip_lounge') {
    const row = await q1(`SELECT * FROM shift_viplounge_close WHERE shift_id = ?`, [shift.id]);
    roleData = {
      closing: row
        ? {
          ...row,
          vip_logs: row.vip_logs ? JSON.parse(row.vip_logs) : [],
        }
        : null
    };
  }

  let transferredFromShift = null;
  if (shift.transferred_from_shift_id) {
    const prevShift = await q1(
      `SELECT s.*, u.full_name AS user_name, u.email AS user_email,
              tb.full_name AS transferred_by_name
       FROM shift_sessions s
       JOIN users u ON s.user_id = u.id
       LEFT JOIN users tb ON s.transferred_by = tb.id
       WHERE s.id = ?`,
      [shift.transferred_from_shift_id]
    );
    if (prevShift) {
      const prevEquipOpen = await q(`SELECT * FROM shift_equipment_logs WHERE shift_id = ? AND snapshot = 'open'`, [prevShift.id]);
      const prevEquipClose = await q(`SELECT * FROM shift_equipment_logs WHERE shift_id = ? AND snapshot = 'close'`, [prevShift.id]);
      let prevRoleData = null;
      if (prevShift.shift_role === 'cashier' || prevShift.shift_role === 'rama_rssb') {
        const openTable = prevShift.shift_role === 'rama_rssb' ? 'shift_rama_rssb_open' : 'shift_cashier_open';
        const closeTable = prevShift.shift_role === 'rama_rssb' ? 'shift_rama_rssb_close' : 'shift_cashier_close';
        const openData = await q1(`SELECT * FROM ${openTable} WHERE shift_id = ?`, [prevShift.id]);
        const closeData = await q1(`SELECT * FROM ${closeTable} WHERE shift_id = ?`, [prevShift.id]);
        prevRoleData = { opening: openData, closing: closeData };
      } else if (prevShift.shift_role === 'helpdesk' || prevShift.shift_role === 'customer_care') {
        const row = await q1(`SELECT * FROM shift_helpdesk_close WHERE shift_id = ?`, [prevShift.id]);
        prevRoleData = {
          closing: row
            ? {
              ...row,
              has_billed: !!row.has_billed,
              insurances_used: row.insurances_used ? JSON.parse(row.insurances_used) : [],
              payments_all_successful: row.payments_all_successful !== 0 && row.payments_all_successful !== false,
            }
            : null
        };
      } else if (prevShift.shift_role === 'call_center') {
        prevRoleData = { closing: await q1(`SELECT * FROM shift_callcenter_close WHERE shift_id = ?`, [prevShift.id]) };
      } else if (prevShift.shift_role === 'nurse' || prevShift.shift_role === 'rn_midwife') {
        prevRoleData = { closing: await q1(`SELECT * FROM shift_nurse_close WHERE shift_id = ?`, [prevShift.id]) };
      } else if (prevShift.shift_role === 'vip_lounge') {
        prevRoleData = { closing: await q1(`SELECT * FROM shift_viplounge_close WHERE shift_id = ?`, [prevShift.id]) };
      }
      transferredFromShift = {
        ...prevShift,
        equipment: { open: prevEquipOpen, close: prevEquipClose },
        role_data: prevRoleData
      };
    }
  }

  return {
    ...shift,
    is_flagged: !!shift.is_flagged,
    flag_reasons: shift.flag_reasons ? JSON.parse(shift.flag_reasons) : [],
    equipment: { open: equipOpen, close: equipClose },
    role_data: roleData,
    transferred_from_shift: transferredFromShift,
  };
}

// ─── Internal: upsert role-specific closing data ─────────────────────────────
async function upsertRoleCloseData(shift_role, shiftId, cashier_close, helpdesk_close, callcenter_close, nurse_close, vip_lounge_close) {
  if ((shift_role === 'cashier' || shift_role === 'rama_rssb') && cashier_close) {
    const c = cashier_close;
    const table = shift_role === 'rama_rssb' ? 'shift_rama_rssb_close' : 'shift_cashier_close';
    const discrepancy =
      parseFloat(c.opening_float || 0) +
      parseFloat(c.cash_payments_total || 0) -
      parseFloat(c.closing_float || 0);

    const existing = await q1(`SELECT id FROM ${table} WHERE shift_id = ?`, [shiftId]);
    if (existing) {
      await db.query(
        `UPDATE ${table} SET
          total_patients = ?, total_insured = ?, total_private = ?,
          insurances_used = ?, total_momo_transactions = ?,
          momo_pay_code = ?, momo_pay_code_other = ?,
          total_card_transactions = ?, card_bank_terminal = ?,
          total_cash_usd = ?, total_cash_eur = ?,
          payments_all_successful = ?, failed_payment_status = ?,
          failed_payment_amount = ?, failed_payment_action_taken = ?,
          opening_float = ?, closing_float = ?, cash_payments_total = ?,
          cash_discrepancy = ?,
          updated_at = (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
        WHERE shift_id = ?`,
        [
          c.total_patients || 0, c.total_insured || 0, c.total_private || 0,
          JSON.stringify(c.insurances_used || []),
          c.total_momo_transactions || 0,
          c.momo_breakdown ? JSON.stringify(c.momo_breakdown) : null, c.momo_pay_code_other || null,
          c.total_card_transactions || 0,
          c.card_breakdown ? JSON.stringify(c.card_breakdown) : null,
          c.total_cash_usd || 0, c.total_cash_eur || 0,
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
        `INSERT INTO ${table} (
          shift_id, total_patients, total_insured, total_private,
          insurances_used, total_momo_transactions, momo_pay_code, momo_pay_code_other,
          total_card_transactions, card_bank_terminal, total_cash_usd, total_cash_eur,
          payments_all_successful, failed_payment_status,
          failed_payment_amount, failed_payment_action_taken,
          opening_float, closing_float, cash_payments_total, cash_discrepancy
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          shiftId,
          c.total_patients || 0, c.total_insured || 0, c.total_private || 0,
          JSON.stringify(c.insurances_used || []),
          c.total_momo_transactions || 0, c.momo_breakdown ? JSON.stringify(c.momo_breakdown) : null, c.momo_pay_code_other || null,
          c.total_card_transactions || 0, c.card_breakdown ? JSON.stringify(c.card_breakdown) : null,
          c.total_cash_usd || 0, c.total_cash_eur || 0,
          c.payments_all_successful ? 1 : 0,
          c.failed_payment_status || null, c.failed_payment_amount || null,
          c.failed_payment_action_taken || null,
          c.opening_float || 0, c.closing_float || 0, c.cash_payments_total || 0,
          discrepancy,
        ]
      );
    }
  }

  if ((shift_role === 'helpdesk' || shift_role === 'customer_care') && helpdesk_close) {
    const h = helpdesk_close;
    const existing = await q1(`SELECT id FROM shift_helpdesk_close WHERE shift_id = ?`, [shiftId]);
    if (existing) {
      await db.query(
        `UPDATE shift_helpdesk_close SET 
          patient_walkin_queries = ?, 
          internal_staff_queries = ?, 
          has_billed = ?,
          total_momo_transactions = ?,
          momo_pay_code = ?,
          momo_pay_code_other = ?,
          total_card_transactions = ?,
          card_bank_terminal = ?,
          total_cash_usd = ?,
          total_cash_eur = ?,
          payments_all_successful = ?,
          failed_payment_status = ?,
          failed_payment_amount = ?,
          failed_payment_action_taken = ?,
          total_patients = ?,
          total_insured = ?,
          total_private = ?,
          insurances_used = ?,
          updated_at = (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) 
        WHERE shift_id = ?`,
        [
          h.patient_walkin_queries || 0,
          h.internal_staff_queries || 0,
          h.has_billed ? 1 : 0,
          h.has_billed ? (h.total_momo_transactions || 0) : 0,
          h.has_billed && h.momo_breakdown ? JSON.stringify(h.momo_breakdown) : (h.momo_pay_code || null),
          h.has_billed ? (h.momo_pay_code_other || null) : null,
          h.has_billed ? (h.total_card_transactions || 0) : 0,
          h.has_billed && h.card_breakdown ? JSON.stringify(h.card_breakdown) : (h.card_bank_terminal || null),
          h.has_billed ? (h.total_cash_usd || 0) : 0,
          h.has_billed ? (h.total_cash_eur || 0) : 0,
          h.has_billed ? (h.payments_all_successful ? 1 : 0) : 1,
          h.has_billed ? (h.failed_payment_status || null) : null,
          h.has_billed ? (h.failed_payment_amount || null) : null,
          h.has_billed ? (h.failed_payment_action_taken || null) : null,
          h.has_billed ? (h.total_patients || 0) : 0,
          h.has_billed ? (h.total_insured || 0) : 0,
          h.has_billed ? (h.total_private || 0) : 0,
          h.has_billed ? JSON.stringify(h.insurances_used || []) : JSON.stringify([]),
          shiftId,
        ]
      );
    } else {
      await db.query(
        `INSERT INTO shift_helpdesk_close (
          shift_id, 
          patient_walkin_queries, 
          internal_staff_queries,
          has_billed,
          total_momo_transactions,
          momo_pay_code,
          momo_pay_code_other,
          total_card_transactions,
          card_bank_terminal,
          total_cash_usd,
          total_cash_eur,
          payments_all_successful,
          failed_payment_status,
          failed_payment_amount,
          failed_payment_action_taken,
          total_patients,
          total_insured,
          total_private,
          insurances_used
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          shiftId,
          h.patient_walkin_queries || 0,
          h.internal_staff_queries || 0,
          h.has_billed ? 1 : 0,
          h.has_billed ? (h.total_momo_transactions || 0) : 0,
          h.has_billed && h.momo_breakdown ? JSON.stringify(h.momo_breakdown) : (h.momo_pay_code || null),
          h.has_billed ? (h.momo_pay_code_other || null) : null,
          h.has_billed ? (h.total_card_transactions || 0) : 0,
          h.has_billed && h.card_breakdown ? JSON.stringify(h.card_breakdown) : (h.card_bank_terminal || null),
          h.has_billed ? (h.total_cash_usd || 0) : 0,
          h.has_billed ? (h.total_cash_eur || 0) : 0,
          h.has_billed ? (h.payments_all_successful ? 1 : 0) : 1,
          h.has_billed ? (h.failed_payment_status || null) : null,
          h.has_billed ? (h.failed_payment_amount || null) : null,
          h.has_billed ? (h.failed_payment_action_taken || null) : null,
          h.has_billed ? (h.total_patients || 0) : 0,
          h.has_billed ? (h.total_insured || 0) : 0,
          h.has_billed ? (h.total_private || 0) : 0,
          h.has_billed ? JSON.stringify(h.insurances_used || []) : JSON.stringify([])
        ]
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
  
  if ((shift_role === 'nurse' || shift_role === 'rn_midwife') && nurse_close) {
    const n = nurse_close;
    const existing = await q1(`SELECT id FROM shift_nurse_close WHERE shift_id = ?`, [shiftId]);
    const criticalPatientsStr = Array.isArray(n.critical_patients_details)
      ? JSON.stringify(n.critical_patients_details)
      : (typeof n.critical_patients_details === 'string' ? n.critical_patients_details : JSON.stringify([]));

    const fields = [
      n.total_assessments || 0,
      n.total_incidents || 0,
      n.handover_sbar_sb || null,
      n.handover_sbar_ar || null,
      n.patients_at_start || 0,
      n.patients_admitted || 0,
      n.patients_discharged || 0,
      n.patients_at_end || 0,
      n.census_notes || null,
      n.medication_rounds_completed || 0,
      n.medication_rounds_expected || 0,
      n.medication_errors || 0,
      n.controlled_substances_administered || 0,
      n.medication_notes || null,
      n.critical_patients_count || 0,
      criticalPatientsStr,
      n.pending_labs || 0,
      n.pending_imaging || 0,
      n.pending_doctor_reviews || 0,
      n.infection_control_issues || null,
      n.supply_shortages || null,
      n.vital_signs_taken || 0,
      n.injections_given || 0,
      n.wound_dressings || 0,
      n.ecgs_performed || 0,
      n.vaccinations_given || 0,
      n.blood_draws || 0,
      n.procedures_other || null,
    ];

    if (existing) {
      await db.query(
        `UPDATE shift_nurse_close SET
          total_assessments = ?, total_incidents = ?, handover_sbar_sb = ?, handover_sbar_ar = ?,
          patients_at_start = ?, patients_admitted = ?, patients_discharged = ?, patients_at_end = ?, census_notes = ?,
          medication_rounds_completed = ?, medication_rounds_expected = ?, medication_errors = ?, controlled_substances_administered = ?, medication_notes = ?,
          critical_patients_count = ?, critical_patients_details = ?, pending_labs = ?, pending_imaging = ?, pending_doctor_reviews = ?, infection_control_issues = ?, supply_shortages = ?,
          vital_signs_taken = ?, injections_given = ?, wound_dressings = ?, ecgs_performed = ?, vaccinations_given = ?, blood_draws = ?, procedures_other = ?,
          updated_at = (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
        WHERE shift_id = ?`,
        [...fields, shiftId]
      );
    } else {
      await db.query(
        `INSERT INTO shift_nurse_close (
          shift_id, total_assessments, total_incidents, handover_sbar_sb, handover_sbar_ar,
          patients_at_start, patients_admitted, patients_discharged, patients_at_end, census_notes,
          medication_rounds_completed, medication_rounds_expected, medication_errors, controlled_substances_administered, medication_notes,
          critical_patients_count, critical_patients_details, pending_labs, pending_imaging, pending_doctor_reviews, infection_control_issues, supply_shortages,
          vital_signs_taken, injections_given, wound_dressings, ecgs_performed, vaccinations_given, blood_draws, procedures_other
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [shiftId, ...fields]
      );
    }
  }

  if (shift_role === 'vip_lounge' && vip_lounge_close) {
    const vl = vip_lounge_close;
    const existing = await q1(`SELECT id FROM shift_viplounge_close WHERE shift_id = ?`, [shiftId]);
    const vipLogsStr = Array.isArray(vl.vip_logs) ? JSON.stringify(vl.vip_logs) : JSON.stringify([]);
    if (existing) {
      await db.query(
        `UPDATE shift_viplounge_close SET vip_logs = ?, updated_at = (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) WHERE shift_id = ?`,
        [vipLogsStr, shiftId]
      );
    } else {
      await db.query(
        `INSERT INTO shift_viplounge_close (shift_id, vip_logs) VALUES (?, ?)`,
        [shiftId, vipLogsStr]
      );
    }
  }
}

// ─── AUTO-CLOSE UNCLOSED SHIFTS AT 12:00 AM ──────────────────────────────────
/**
 * Runs periodically. Finds any unclosed shift that has reached or passed 12:00 AM (midnight) facility cutoff:
 *  1. Force-closes it with an UNCLOSED_AT_MIDNIGHT flag
 *  2. Sends an in-app notification to the agent
 *  3. Sends an in-app notification to every admin + deputy_coo
 */
exports.autoCloseExpiredShifts = async () => {
  try {
    const activeShifts = await q(
      `SELECT s.id, s.user_id, s.shift_role, s.opened_at, s.start_hour, s.wave, u.full_name AS user_name
       FROM shift_sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.status IN ('open','draft')`
    );

    if (activeShifts.length === 0) return 0;

    const now = Date.now();
    const expired = [];

    for (const shift of activeShifts) {
      const midnightCutoff = getShiftMidnightCutoff(shift);
      // Cutoff is strictly 12:00 AM midnight following the shift calendar day
      if (midnightCutoff && now >= midnightCutoff.getTime()) {
        expired.push({
          ...shift,
          reasonText: 'Shift remained unclosed at 12:00 AM midnight facility cutoff.',
        });
      }
    }

    if (expired.length === 0) return 0;

    // Fetch supervisors once
    const [admins, deputyCoos] = await Promise.all([
      User.findByRole('admin'),
      User.findByRole('deputy_coo'),
    ]);
    const supervisors = [...admins, ...deputyCoos];

    for (const shift of expired) {
      const reasonText = shift.reasonText;
      const overtimeReason = `Shift auto-closed by system: ${reasonText}`;
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
          `AUTO-CLOSED: ${reasonText} No handover submitted before 12:00 AM.`,
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
        timeZone: 'Africa/Kigali',
        hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short',
      });
      const shiftLink = `/shifts/${shift.id}`;

      // Notify the agent who failed to close
      await Notification.create({
        userId:  shift.user_id,
        title:   '⚠️ Your Shift Was Auto-Closed at 12:00 AM',
        message: `Your shift (opened at ${openedAt}) remained unclosed and was automatically closed at 12:00 AM midnight facility cutoff.`,
        type:    'error',
        link:    shiftLink,
      });

      // Notify every supervisor (admin + deputy_coo)
      for (const sup of supervisors) {
        await Notification.create({
          userId:  sup.id,
          title:   `🚨 Shift Auto-Closed at 12:00 AM — ${shift.user_name}`,
          message: `${shift.user_name}'s ${shift.shift_role.replace('_', ' ')} shift (opened ${openedAt}) was auto-closed at 12:00 AM midnight facility cutoff.`,
          type:    'error',
          link:    shiftLink,
        });
      }

      console.log(`[ShiftPolicy] Auto-closed shift #${shift.id} for ${shift.user_name} (12:00 AM midnight cutoff)`);
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
    const authResult = await verifyPasswordAndCheckLockout(req, password, user);
    if (!authResult.allowed) {
      return res.status(authResult.status).json({ success: false, message: authResult.message });
    }

    // Count before updating so we can report the accurate number of rows affected
    const eligibleRows = await q(
      `SELECT id FROM shift_sessions WHERE id IN (${ids.map(() => '?').join(',')}) AND status = 'closed' AND reviewed_at IS NULL`,
      ids
    );
    const eligibleIds = eligibleRows.map(r => r.id);

    if (eligibleIds.length > 0) {
      await db.query(
        `UPDATE shift_sessions 
         SET reviewed_by = ?, 
             reviewed_at = (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
             updated_at = (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
         WHERE id IN (${eligibleIds.map(() => '?').join(',')})`,
        [req.user.id, ...eligibleIds]
      );
    }

    const skipped = ids.length - eligibleIds.length;
    res.json({
      success: true,
      message: eligibleIds.length > 0
        ? `Successfully reviewed ${eligibleIds.length} shift(s).${skipped > 0 ? ` ${skipped} skipped (already reviewed or not closed).` : ''}`
        : 'No eligible shifts to review. All selected shifts may already be reviewed or not yet closed.',
      reviewed: eligibleIds.length,
      skipped,
    });
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
    // Use !== undefined so admins can explicitly clear handover_notes by passing ''
    if (handover_notes !== undefined) { updates.push('handover_notes = ?'); args.push(handover_notes || null); }
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
    
    // Delete all child records first to avoid FK violations.
    // shift_equipment_logs and shift_cashier_open were previously missing — fixed.
    const tables = [
      'shift_equipment_logs',
      'shift_cashier_open',
      'shift_cashier_close',
      'shift_rama_rssb_open',
      'shift_rama_rssb_close',
      'shift_helpdesk_close',
      'shift_callcenter_close',
      'shift_nurse_close',
      'shift_viplounge_close',
    ];
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

exports.exportExcel = async (req, res, next) => {
  try {
    const { role, period, date_from, date_to, employee_name, status, flagged } = req.query;

    let where = "1=1";
    if (isChefNurseRole(req.user.role)) {
      where = role ? "1=1" : "s.shift_role = 'nurse'";
    } else if (req.user.role === 'nurse' || req.user.role === 'rn_midwife') {
      where = "s.shift_role IN ('nurse', 'rn_midwife')";
    }
    const args = [];

    if (role) { where += ' AND s.shift_role = ?'; args.push(role); }
    if (status) { where += ' AND s.status = ?'; args.push(status); }
    if (flagged === '1') { where += ' AND s.is_flagged = 1'; }

    const periodDates = getKigaliPeriodDates(period, date_from, date_to);
    if (periodDates.dateFrom) { where += ' AND s.opened_at >= ?'; args.push(periodDates.dateFrom); }
    if (periodDates.dateTo) { where += ' AND s.opened_at <= ?'; args.push(periodDates.dateTo); }
    if (employee_name) { where += ' AND u.full_name LIKE ?'; args.push(`%${employee_name}%`); }

    const rows = await q(
      `SELECT s.id, s.shift_role, s.status, s.opened_at, s.closed_at,
              s.start_hour, s.wave, s.is_flagged, s.flag_reasons, s.handover_notes,
              u.full_name AS user_name, u.email AS user_email, u.id AS user_id,
              rv.full_name AS reviewed_by_name, s.reviewed_at,
              -- Cashier close
              cc.total_patients AS cc_total_patients,
              cc.total_insured AS cc_total_insured,
              cc.total_private AS cc_total_private,
              cc.insurances_used AS cc_insurances_used,
              cc.opening_float AS cc_opening_float,
              cc.closing_float AS cc_closing_float,
              cc.cash_payments_total AS cc_cash_payments_total,
              cc.cash_discrepancy AS cc_cash_discrepancy,
              cc.total_momo_transactions AS cc_total_momo,
              cc.momo_pay_code AS cc_momo_pay_code,
              cc.momo_pay_code_other AS cc_momo_pay_code_other,
              cc.total_card_transactions AS cc_total_card,
              cc.card_bank_terminal AS cc_card_bank_terminal,
              cc.total_cash_usd AS cc_cash_usd,
              cc.total_cash_eur AS cc_cash_eur,
              cc.payments_all_successful AS cc_payments_all_successful,
              cc.failed_payment_status AS cc_failed_payment_status,
              cc.failed_payment_amount AS cc_failed_payment_amount,
              cc.failed_payment_action_taken AS cc_failed_payment_action_taken,
              -- RAMA/RSSB close
              rc.total_patients AS rc_total_patients,
              rc.total_insured AS rc_total_insured,
              rc.total_private AS rc_total_private,
              rc.insurances_used AS rc_insurances_used,
              rc.opening_float AS rc_opening_float,
              rc.closing_float AS rc_closing_float,
              rc.cash_payments_total AS rc_cash_payments_total,
              rc.cash_discrepancy AS rc_cash_discrepancy,
              rc.total_momo_transactions AS rc_total_momo,
              rc.momo_pay_code AS rc_momo_pay_code,
              rc.momo_pay_code_other AS rc_momo_pay_code_other,
              rc.total_card_transactions AS rc_total_card,
              rc.card_bank_terminal AS rc_card_bank_terminal,
              rc.total_cash_usd AS rc_cash_usd,
              rc.total_cash_eur AS rc_cash_eur,
              rc.payments_all_successful AS rc_payments_all_successful,
              rc.failed_payment_status AS rc_failed_payment_status,
              rc.failed_payment_amount AS rc_failed_payment_amount,
              rc.failed_payment_action_taken AS rc_failed_payment_action_taken,
              -- Helpdesk / Customer Care close
              hc.has_billed AS hc_has_billed,
              hc.total_patients AS hc_total_patients,
              hc.total_insured AS hc_total_insured,
              hc.total_private AS hc_total_private,
              hc.insurances_used AS hc_insurances_used,
              hc.total_momo_transactions AS hc_total_momo,
              hc.momo_pay_code AS hc_momo_pay_code,
              hc.momo_pay_code_other AS hc_momo_pay_code_other,
              hc.total_card_transactions AS hc_total_card,
              hc.card_bank_terminal AS hc_card_bank_terminal,
              hc.total_cash_usd AS hc_cash_usd,
              hc.total_cash_eur AS hc_cash_eur,
              hc.payments_all_successful AS hc_payments_all_successful,
              hc.failed_payment_status AS hc_failed_payment_status,
              hc.failed_payment_amount AS hc_failed_payment_amount,
              hc.failed_payment_action_taken AS hc_failed_payment_action_taken,
              hc.patient_walkin_queries,
              hc.internal_staff_queries,
              -- Nurse close
              nc.total_assessments,
              nc.total_incidents,
              nc.handover_sbar_sb,
              nc.handover_sbar_ar,
              -- Call center close
              cl.inbound_total,
              cl.inbound_assisted,
              cl.inbound_dropped,
              cl.outbound_total,
              cl.outbound_reached,
              cl.outbound_unreached
       FROM shift_sessions s
       JOIN users u ON s.user_id = u.id
       LEFT JOIN users rv ON s.reviewed_by = rv.id
       LEFT JOIN shift_cashier_close cc ON cc.shift_id = s.id
       LEFT JOIN shift_rama_rssb_close rc ON rc.shift_id = s.id
       LEFT JOIN shift_helpdesk_close hc ON hc.shift_id = s.id
       LEFT JOIN shift_nurse_close nc ON nc.shift_id = s.id
       LEFT JOIN shift_callcenter_close cl ON cl.shift_id = s.id
       WHERE ${where}
       ORDER BY s.opened_at DESC`,
      args
    );

    // Process and aggregate data
    const revenueRows = [];
    const allSessionRows = [];
    const paymentChannelLogs = [];

    let totalGrossRWF = 0;
    let totalCashRWF = 0;
    let totalMoMoRWF = 0;
    let totalCardRWF = 0;
    let totalUsd = 0;
    let totalEur = 0;
    let totalNetDiscrepancy = 0;
    let totalPatientsAll = 0;
    let totalInsuredAll = 0;
    let totalPrivateAll = 0;
    let billingSessionsCount = 0;

    for (const r of rows) {
      const openedDate = r.opened_at ? new Date(r.opened_at) : null;
      const closedDate = r.closed_at ? new Date(r.closed_at) : null;

      const dateKigali = openedDate
        ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Kigali', year: 'numeric', month: '2-digit', day: '2-digit' }).format(openedDate)
        : '';
      const timeOpened = openedDate
        ? new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Kigali', hour: '2-digit', minute: '2-digit' }).format(openedDate)
        : '';
      const timeClosed = closedDate
        ? new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Kigali', hour: '2-digit', minute: '2-digit' }).format(closedDate)
        : (r.status === 'open' ? 'Active' : '');

      let durationHrs = '';
      if (openedDate && closedDate) {
        durationHrs = ((closedDate - openedDate) / (1000 * 60 * 60)).toFixed(1);
      }

      const isCashier = r.shift_role === 'cashier';
      const isRama = r.shift_role === 'rama_rssb';
      const isHelpdeskOrCC = r.shift_role === 'helpdesk' || r.shift_role === 'customer_care';
      const hasHelpdeskBilled = isHelpdeskOrCC && (r.hc_has_billed || (r.hc_total_momo > 0) || (r.hc_total_card > 0) || (r.hc_cash_usd > 0));

      const hasFinancialData = isCashier || isRama || hasHelpdeskBilled;

      if (hasFinancialData) {
        const openingFloat = Number(isCashier ? (r.cc_opening_float || 0) : (isRama ? (r.rc_opening_float || 0) : 0));
        const cashCollected = Number(isCashier ? (r.cc_cash_payments_total || 0) : (isRama ? (r.rc_cash_payments_total || 0) : 0));
        const momoCollected = Number(isCashier ? (r.cc_total_momo || 0) : (isRama ? (r.rc_total_momo || 0) : (r.hc_total_momo || 0)));
        const cardCollected = Number(isCashier ? (r.cc_total_card || 0) : (isRama ? (r.rc_total_card || 0) : (r.hc_total_card || 0)));
        const grossRevenue = cashCollected + momoCollected + cardCollected;
        const usdCollected = Number(isCashier ? (r.cc_cash_usd || 0) : (isRama ? (r.rc_cash_usd || 0) : (r.hc_cash_usd || 0)));
        const eurCollected = Number(isCashier ? (r.cc_cash_eur || 0) : (isRama ? (r.rc_cash_eur || 0) : (r.hc_cash_eur || 0)));
        const closingFloat = Number(isCashier ? (r.cc_closing_float || 0) : (isRama ? (r.rc_closing_float || 0) : 0));
        const expectedCash = openingFloat + cashCollected;
        const discrepancy = Number(isCashier ? (r.cc_cash_discrepancy || 0) : (isRama ? (r.rc_cash_discrepancy || 0) : 0));

        const totalPatients = Number(isCashier ? (r.cc_total_patients || 0) : (isRama ? (r.rc_total_patients || 0) : (r.hc_total_patients || 0)));
        const totalInsured = Number(isCashier ? (r.cc_total_insured || 0) : (isRama ? (r.rc_total_insured || 0) : (r.hc_total_insured || 0)));
        const totalPrivate = Number(isCashier ? (r.cc_total_private || 0) : (isRama ? (r.rc_total_private || 0) : (r.hc_total_private || 0)));

        let insurancesList = '';
        const rawInsurances = isCashier ? r.cc_insurances_used : (isRama ? r.rc_insurances_used : r.hc_insurances_used);
        if (rawInsurances) {
          try {
            const arr = JSON.parse(rawInsurances);
            insurancesList = Array.isArray(arr) ? arr.join(', ') : rawInsurances;
          } catch (e) {
            insurancesList = rawInsurances;
          }
        }

        const paymentsSuccessful = isCashier ? r.cc_payments_all_successful : (isRama ? r.rc_payments_all_successful : r.hc_payments_all_successful);
        const failedStatus = isCashier ? r.cc_failed_payment_status : (isRama ? r.rc_failed_payment_status : r.hc_failed_payment_status);
        const failedAmount = isCashier ? r.cc_failed_payment_amount : (isRama ? r.rc_failed_payment_amount : r.hc_failed_payment_amount);
        const failedAction = isCashier ? r.cc_failed_payment_action_taken : (isRama ? r.rc_failed_payment_action_taken : r.hc_failed_payment_action_taken);

        let reconciliationStatus = 'Reconciled / OK';
        if (paymentsSuccessful === 0 || failedAmount) {
          reconciliationStatus = `ISSUE: ${failedStatus || 'Payment Issue'} (${failedAmount ? Number(failedAmount).toLocaleString() + ' RWF' : ''})`;
          if (failedAction) reconciliationStatus += ` [Action: ${failedAction}]`;
        }

        let stationName = 'Cashier Counter';
        if (isRama) stationName = 'RAMA / RSSB Billing';
        if (isHelpdeskOrCC) stationName = r.shift_role === 'customer_care' ? 'Customer Care Billing' : 'Helpdesk Billing';

        totalGrossRWF += grossRevenue;
        totalCashRWF += cashCollected;
        totalMoMoRWF += momoCollected;
        totalCardRWF += cardCollected;
        totalUsd += usdCollected;
        totalEur += eurCollected;
        totalNetDiscrepancy += discrepancy;
        totalPatientsAll += totalPatients;
        totalInsuredAll += totalInsured;
        totalPrivateAll += totalPrivate;
        billingSessionsCount++;

        revenueRows.push({
          session_id: r.id,
          date: dateKigali,
          timing: `${r.wave || 'Wave'} (${r.start_hour || ''})`,
          station: stationName,
          personnel: r.user_name,
          total_patients: totalPatients,
          insured_patients: totalInsured,
          private_patients: totalPrivate,
          insurances: insurancesList || 'None',
          opening_float: openingFloat,
          cash_collected: cashCollected,
          momo_collected: momoCollected,
          card_collected: cardCollected,
          gross_revenue: grossRevenue,
          usd_cash: usdCollected,
          eur_cash: eurCollected,
          closing_float: closingFloat,
          expected_cash: expectedCash,
          cash_discrepancy: discrepancy,
          reconciliation: reconciliationStatus,
          sign_off: r.reviewed_by_name ? `Verified: ${r.reviewed_by_name}` : 'Pending Review'
        });

        // Payment Channel breakdowns (MoMo Pay Codes)
        const rawMomoJson = isCashier ? r.cc_momo_pay_code : (isRama ? r.rc_momo_pay_code : r.hc_momo_pay_code);
        if (rawMomoJson) {
          try {
            const parsed = JSON.parse(rawMomoJson);
            if (typeof parsed === 'object' && parsed !== null) {
              Object.entries(parsed).forEach(([code, amt]) => {
                paymentChannelLogs.push({
                  shift_id: r.id,
                  date: dateKigali,
                  station: stationName,
                  personnel: r.user_name,
                  channel_type: 'Mobile Money (MoMo)',
                  pay_code_or_terminal: `Code ${code}`,
                  amount: Number(amt) || 0,
                  currency: 'RWF',
                  status: paymentsSuccessful ? 'Settled' : 'Requires Audit'
                });
              });
            }
          } catch (e) {
            if (momoCollected > 0) {
              paymentChannelLogs.push({
                shift_id: r.id,
                date: dateKigali,
                station: stationName,
                personnel: r.user_name,
                channel_type: 'Mobile Money (MoMo)',
                pay_code_or_terminal: String(rawMomoJson),
                amount: momoCollected,
                currency: 'RWF',
                status: paymentsSuccessful ? 'Settled' : 'Requires Audit'
              });
            }
          }
        } else if (momoCollected > 0) {
          paymentChannelLogs.push({
            shift_id: r.id,
            date: dateKigali,
            station: stationName,
            personnel: r.user_name,
            channel_type: 'Mobile Money (MoMo)',
            pay_code_or_terminal: 'General MoMo',
            amount: momoCollected,
            currency: 'RWF',
            status: paymentsSuccessful ? 'Settled' : 'Requires Audit'
          });
        }

        // Bank Card POS Terminals
        const rawCardJson = isCashier ? r.cc_card_bank_terminal : (isRama ? r.rc_card_bank_terminal : r.hc_card_bank_terminal);
        if (rawCardJson) {
          try {
            const parsed = JSON.parse(rawCardJson);
            if (typeof parsed === 'object' && parsed !== null) {
              Object.entries(parsed).forEach(([terminal, amt]) => {
                paymentChannelLogs.push({
                  shift_id: r.id,
                  date: dateKigali,
                  station: stationName,
                  personnel: r.user_name,
                  channel_type: 'POS Bank Card Terminal',
                  pay_code_or_terminal: terminal,
                  amount: Number(amt) || 0,
                  currency: 'RWF',
                  status: paymentsSuccessful ? 'Settled' : 'Requires Audit'
                });
              });
            }
          } catch (e) {
            if (cardCollected > 0) {
              paymentChannelLogs.push({
                shift_id: r.id,
                date: dateKigali,
                station: stationName,
                personnel: r.user_name,
                channel_type: 'POS Bank Card Terminal',
                pay_code_or_terminal: String(rawCardJson),
                amount: cardCollected,
                currency: 'RWF',
                status: paymentsSuccessful ? 'Settled' : 'Requires Audit'
              });
            }
          }
        } else if (cardCollected > 0) {
          paymentChannelLogs.push({
            shift_id: r.id,
            date: dateKigali,
            station: stationName,
            personnel: r.user_name,
            channel_type: 'POS Bank Card Terminal',
            pay_code_or_terminal: 'General POS Terminal',
            amount: cardCollected,
            currency: 'RWF',
            status: paymentsSuccessful ? 'Settled' : 'Requires Audit'
          });
        }
      }

      // Departmental output metric summary for Sheet 2
      let operationalMetric = '-';
      if (r.shift_role === 'nurse' || r.shift_role === 'rn_midwife') {
        operationalMetric = `Assessments: ${r.total_assessments || 0} | Incidents: ${r.total_incidents || 0}`;
      } else if (r.shift_role === 'call_center') {
        operationalMetric = `Inbound: ${r.inbound_total || 0} (Assisted: ${r.inbound_assisted || 0}, Dropped: ${r.inbound_dropped || 0}) | Outbound: ${r.outbound_total || 0}`;
      } else if (r.shift_role === 'helpdesk' || r.shift_role === 'customer_care') {
        operationalMetric = `Walk-in Queries: ${r.patient_walkin_queries || 0} | Staff Queries: ${r.internal_staff_queries || 0}${r.hc_has_billed ? ' | Billed Patients: ' + (r.hc_total_patients || 0) : ''}`;
      } else if (isCashier || isRama) {
        const pts = isCashier ? r.cc_total_patients : r.rc_total_patients;
        const rev = (isCashier ? (r.cc_cash_payments_total + r.cc_total_momo + r.cc_total_card) : (r.rc_cash_payments_total + r.rc_total_momo + r.rc_total_card)) || 0;
        operationalMetric = `Patients: ${pts || 0} | Revenue: ${Number(rev).toLocaleString()} RWF`;
      }

      let reasons = '';
      if (r.flag_reasons) {
        try {
          const parsed = JSON.parse(r.flag_reasons);
          reasons = Array.isArray(parsed) ? parsed.join('; ') : r.flag_reasons;
        } catch (e) {
          reasons = r.flag_reasons;
        }
      }

      allSessionRows.push({
        id: r.id,
        date_opened: dateKigali,
        time_opened: timeOpened,
        date_closed: closedDate ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Kigali', year: 'numeric', month: '2-digit', day: '2-digit' }).format(closedDate) : '',
        time_closed: timeClosed,
        duration: durationHrs ? `${durationHrs} hrs` : '-',
        role: r.shift_role ? r.shift_role.replace(/_/g, ' ').toUpperCase() : '',
        schedule: `${r.wave || 'Wave'} (${r.start_hour || ''})`,
        personnel: r.user_name,
        status: r.status ? r.status.toUpperCase() : '',
        is_flagged: r.is_flagged ? 'YES' : 'NO',
        flag_reasons: reasons,
        metrics: operationalMetric,
        handover_notes: r.handover_notes || '',
        reviewed_by: r.reviewed_by_name || 'PENDING',
        reviewed_at: r.reviewed_at ? new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Kigali', dateStyle: 'short', timeStyle: 'short' }).format(new Date(r.reviewed_at)) : ''
      });
    }

    // Construct ExcelJS Workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Lumina Clinical Laboratory & Diagnostics';
    workbook.lastModifiedBy = req.user ? req.user.full_name : 'Lumina System';
    workbook.created = new Date();
    workbook.modified = new Date();

    const NAVY_HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1B669D' } };
    const KPI_LABEL_FILL  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    const KPI_VAL_FILL    = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
    const TOTALS_FILL     = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEBF4FA' } };
    const ZEBRA_FILL      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
    const ALERT_FILL      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE4E6' } };

    const THIN_BORDER = {
      top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
    };

    const DOUBLE_BOTTOM_BORDER = {
      top: { style: 'thin', color: { argb: 'FF94A3B8' } },
      bottom: { style: 'double', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
    };

    // ─────────────────────────────────────────────────────────────────────────────
    // SHEET 1: INCOME STATEMENT & REVENUE
    // ─────────────────────────────────────────────────────────────────────────────
    const ws1 = workbook.addWorksheet('Income Statement & Revenue', {
      properties: { tabColor: { argb: 'FF1B669D' } }
    });

    // Column widths
    ws1.columns = [
      { key: 'session_id', width: 12 },
      { key: 'date', width: 13 },
      { key: 'timing', width: 16 },
      { key: 'station', width: 22 },
      { key: 'personnel', width: 24 },
      { key: 'total_patients', width: 14 },
      { key: 'insured_patients', width: 15 },
      { key: 'private_patients', width: 14 },
      { key: 'insurances', width: 28 },
      { key: 'opening_float', width: 18 },
      { key: 'cash_collected', width: 18 },
      { key: 'momo_collected', width: 18 },
      { key: 'card_collected', width: 18 },
      { key: 'gross_revenue', width: 20 },
      { key: 'usd_cash', width: 14 },
      { key: 'eur_cash', width: 14 },
      { key: 'closing_float', width: 18 },
      { key: 'expected_cash', width: 18 },
      { key: 'cash_discrepancy', width: 18 },
      { key: 'reconciliation', width: 26 },
      { key: 'sign_off', width: 22 }
    ];

    // Banner 1: Hospital Name & Title
    ws1.mergeCells('A1:U1');
    const titleCell = ws1.getCell('A1');
    titleCell.value = 'LUMINA CLINICAL LABORATORY & DIAGNOSTICS — EXECUTIVE SHIFT REVENUE & INCOME STATEMENT';
    titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = NAVY_HEADER_FILL;
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    ws1.getRow(1).height = 34;

    // Banner 2: Period & Scope
    ws1.mergeCells('A2:U2');
    const subCell = ws1.getCell('A2');
    subCell.value = `AUDIT PERIOD: ${periodDates.label.toUpperCase()} | FACILITY TIMEZONE: AFRICA/KIGALI (UTC+2)`;
    subCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFDCEBF7' } };
    subCell.fill = NAVY_HEADER_FILL;
    subCell.alignment = { vertical: 'middle', horizontal: 'center' };
    ws1.getRow(2).height = 20;

    // Banner 3: Metadata
    ws1.mergeCells('A3:U3');
    const metaCell = ws1.getCell('A3');
    const nowKigali = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Africa/Kigali',
      dateStyle: 'full',
      timeStyle: 'medium'
    }).format(new Date());
    metaCell.value = `Export Generated On: ${nowKigali} | Generated By: ${req.user ? req.user.full_name : 'Staff'} (${req.user ? req.user.role : 'System'}) | Lumina Hospital Financial & Operations Registry`;
    metaCell.font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF64748B' } };
    metaCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    metaCell.alignment = { vertical: 'middle', horizontal: 'center' };
    ws1.getRow(3).height = 18;

    // Row 4: Spacer
    ws1.getRow(4).height = 8;

    // KPI Summary Cards Block (Rows 5-7)
    const kpiDefinitions = [
      { colStart: 'B', colEnd: 'D', label: 'GROSS REVENUE (RWF)', val: `${totalGrossRWF.toLocaleString()} RWF`, color: 'FF1B669D' },
      { colStart: 'E', colEnd: 'G', label: 'CASH COLLECTED (RWF)', val: `${totalCashRWF.toLocaleString()} RWF`, color: 'FF0D9488' },
      { colStart: 'H', colEnd: 'J', label: 'MOMO MOBILE MONEY (RWF)', val: `${totalMoMoRWF.toLocaleString()} RWF`, color: 'FF10B981' },
      { colStart: 'K', colEnd: 'M', label: 'POS CARD TERMINALS (RWF)', val: `${totalCardRWF.toLocaleString()} RWF`, color: 'FF6366F1' },
      { colStart: 'N', colEnd: 'P', label: 'FOREIGN CASH (USD / EUR)', val: `$${totalUsd.toLocaleString()} / €${totalEur.toLocaleString()}`, color: 'FF8B5CF6' },
      { colStart: 'Q', colEnd: 'S', label: 'NET CASH DISCREPANCY', val: `${totalNetDiscrepancy.toLocaleString()} RWF`, color: totalNetDiscrepancy === 0 ? 'FF059669' : 'FFE11D48' },
      { colStart: 'T', colEnd: 'U', label: 'PATIENTS BILLED', val: `${totalPatientsAll} (${totalInsuredAll} Ins / ${totalPrivateAll} Priv)`, color: 'FF0F172A' },
    ];

    ws1.getRow(5).height = 18;
    ws1.getRow(6).height = 24;

    kpiDefinitions.forEach(kpi => {
      const labelRange = `${kpi.colStart}5:${kpi.colEnd}5`;
      const valRange = `${kpi.colStart}6:${kpi.colEnd}6`;
      ws1.mergeCells(labelRange);
      ws1.mergeCells(valRange);

      const lCell = ws1.getCell(`${kpi.colStart}5`);
      lCell.value = kpi.label;
      lCell.font = { name: 'Calibri', size: 8, bold: true, color: { argb: 'FF64748B' } };
      lCell.fill = KPI_LABEL_FILL;
      lCell.alignment = { vertical: 'middle', horizontal: 'center' };
      lCell.border = THIN_BORDER;

      const vCell = ws1.getCell(`${kpi.colStart}6`);
      vCell.value = kpi.val;
      vCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: kpi.color } };
      vCell.fill = KPI_VAL_FILL;
      vCell.alignment = { vertical: 'middle', horizontal: 'center' };
      vCell.border = THIN_BORDER;
    });

    // Row 7: Spacer
    ws1.getRow(7).height = 10;

    // Row 8: Table Header
    const headers1 = [
      'Session ID', 'Date', 'Shift Timing', 'Station / Counter', 'Personnel Name',
      'Total Patients', 'Insured Patients', 'Private Patients', 'Insurance Providers',
      'Opening Float (RWF)', 'Cash Collected (RWF)', 'MoMo Collected (RWF)', 'Card/POS Collected (RWF)',
      'Gross Revenue (RWF)', 'USD Cash ($)', 'EUR Cash (€)', 'Closing Float (RWF)',
      'Expected Cash (RWF)', 'Cash Discrepancy (RWF)', 'Reconciliation Status', 'Supervisor Review'
    ];

    const hRow1 = ws1.getRow(8);
    hRow1.height = 26;
    headers1.forEach((h, idx) => {
      const cell = hRow1.getCell(idx + 1);
      cell.value = h;
      cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = NAVY_HEADER_FILL;
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = THIN_BORDER;
    });

    // Populate Data Rows starting at Row 9
    let currentRowIdx = 9;
    if (revenueRows.length === 0) {
      ws1.mergeCells(`A${currentRowIdx}:U${currentRowIdx}`);
      const emptyCell = ws1.getCell(`A${currentRowIdx}`);
      emptyCell.value = 'No cashier or billing shift sessions recorded for the selected period.';
      emptyCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF94A3B8' } };
      emptyCell.alignment = { vertical: 'middle', horizontal: 'center' };
      ws1.getRow(currentRowIdx).height = 24;
      currentRowIdx++;
    } else {
      revenueRows.forEach((r, idx) => {
        const dRow = ws1.getRow(currentRowIdx);
        dRow.height = 20;

        dRow.getCell(1).value = r.session_id;
        dRow.getCell(2).value = r.date;
        dRow.getCell(3).value = r.timing;
        dRow.getCell(4).value = r.station;
        dRow.getCell(5).value = r.personnel;
        dRow.getCell(6).value = r.total_patients;
        dRow.getCell(7).value = r.insured_patients;
        dRow.getCell(8).value = r.private_patients;
        dRow.getCell(9).value = r.insurances;
        dRow.getCell(10).value = r.opening_float;
        dRow.getCell(11).value = r.cash_collected;
        dRow.getCell(12).value = r.momo_collected;
        dRow.getCell(13).value = r.card_collected;
        dRow.getCell(14).value = r.gross_revenue;
        dRow.getCell(15).value = r.usd_cash;
        dRow.getCell(16).value = r.eur_cash;
        dRow.getCell(17).value = r.closing_float;
        dRow.getCell(18).value = r.expected_cash;
        dRow.getCell(19).value = r.cash_discrepancy;
        dRow.getCell(20).value = r.reconciliation;
        dRow.getCell(21).value = r.sign_off;

        // Alignment & formats
        [1, 2, 3].forEach(c => { dRow.getCell(c).alignment = { vertical: 'middle', horizontal: 'center' }; });
        [4, 5, 9, 20, 21].forEach(c => { dRow.getCell(c).alignment = { vertical: 'middle', horizontal: 'left' }; });
        [6, 7, 8].forEach(c => {
          dRow.getCell(c).alignment = { vertical: 'middle', horizontal: 'right' };
          dRow.getCell(c).numFmt = '#,##0';
        });
        [10, 11, 12, 13, 14, 17, 18, 19].forEach(c => {
          dRow.getCell(c).alignment = { vertical: 'middle', horizontal: 'right' };
          dRow.getCell(c).numFmt = '#,##0 "RWF"';
        });
        dRow.getCell(15).alignment = { vertical: 'middle', horizontal: 'right' };
        dRow.getCell(15).numFmt = '"$"#,##0.00';
        dRow.getCell(16).alignment = { vertical: 'middle', horizontal: 'right' };
        dRow.getCell(16).numFmt = '"€"#,##0.00';

        const isZebra = idx % 2 === 1;
        for (let c = 1; c <= 21; c++) {
          const cell = dRow.getCell(c);
          cell.font = { name: 'Calibri', size: 9 };
          cell.border = THIN_BORDER;
          if (isZebra) cell.fill = ZEBRA_FILL;
        }

        // Highlight non-zero discrepancy
        if (r.cash_discrepancy !== 0) {
          const discCell = dRow.getCell(19);
          discCell.fill = ALERT_FILL;
          discCell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FFB91C1C' } };
        }

        currentRowIdx++;
      });

      // Totals Row
      const tRow = ws1.getRow(currentRowIdx);
      tRow.height = 24;
      tRow.getCell(5).value = `TOTALS (${periodDates.label})`;
      tRow.getCell(5).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0F172A' } };
      tRow.getCell(5).alignment = { vertical: 'middle', horizontal: 'right' };

      const startDataRow = 9;
      const endDataRow = currentRowIdx - 1;

      // Patient sums
      [6, 7, 8].forEach(c => {
        const colLetter = String.fromCharCode(64 + c);
        tRow.getCell(c).value = { formula: `=SUM(${colLetter}${startDataRow}:${colLetter}${endDataRow})` };
        tRow.getCell(c).numFmt = '#,##0';
        tRow.getCell(c).alignment = { vertical: 'middle', horizontal: 'right' };
      });

      // RWF Currency sums
      [10, 11, 12, 13, 14, 17, 18, 19].forEach(c => {
        let colLetter;
        if (c <= 26) colLetter = String.fromCharCode(64 + c);
        tRow.getCell(c).value = { formula: `=SUM(${colLetter}${startDataRow}:${colLetter}${endDataRow})` };
        tRow.getCell(c).numFmt = '#,##0 "RWF"';
        tRow.getCell(c).alignment = { vertical: 'middle', horizontal: 'right' };
      });

      // Foreign currency sums
      tRow.getCell(15).value = { formula: `=SUM(O${startDataRow}:O${endDataRow})` };
      tRow.getCell(15).numFmt = '"$"#,##0.00';
      tRow.getCell(15).alignment = { vertical: 'middle', horizontal: 'right' };

      tRow.getCell(16).value = { formula: `=SUM(P${startDataRow}:P${endDataRow})` };
      tRow.getCell(16).numFmt = '"€"#,##0.00';
      tRow.getCell(16).alignment = { vertical: 'middle', horizontal: 'right' };

      for (let c = 1; c <= 21; c++) {
        const cell = tRow.getCell(c);
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0F172A' } };
        cell.fill = TOTALS_FILL;
        cell.border = DOUBLE_BOTTOM_BORDER;
      }
    }

    // Freeze table header
    ws1.views = [{ state: 'frozen', xSplit: 0, ySplit: 8, activeCell: 'A9' }];


    // ─────────────────────────────────────────────────────────────────────────────
    // SHEET 2: ALL SHIFT SESSIONS & OPERATIONAL LOGS
    // ─────────────────────────────────────────────────────────────────────────────
    const ws2 = workbook.addWorksheet('All Shift Sessions & Logs', {
      properties: { tabColor: { argb: 'FF2563EB' } }
    });

    ws2.columns = [
      { key: 'id', width: 10 },
      { key: 'date_opened', width: 13 },
      { key: 'time_opened', width: 12 },
      { key: 'date_closed', width: 13 },
      { key: 'time_closed', width: 12 },
      { key: 'duration', width: 14 },
      { key: 'role', width: 18 },
      { key: 'schedule', width: 18 },
      { key: 'personnel', width: 24 },
      { key: 'status', width: 14 },
      { key: 'is_flagged', width: 12 },
      { key: 'flag_reasons', width: 36 },
      { key: 'metrics', width: 32 },
      { key: 'handover_notes', width: 36 },
      { key: 'reviewed_by', width: 22 },
      { key: 'reviewed_at', width: 18 }
    ];

    // Banner
    ws2.mergeCells('A1:P1');
    const ws2Title = ws2.getCell('A1');
    ws2Title.value = `LUMINA HOSPITAL — COMPLETE SHIFT OPERATIONS REGISTRY (${periodDates.label.toUpperCase()})`;
    ws2Title.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
    ws2Title.fill = NAVY_HEADER_FILL;
    ws2Title.alignment = { vertical: 'middle', horizontal: 'center' };
    ws2.getRow(1).height = 28;

    const headers2 = [
      'Shift ID', 'Date Opened', 'Time Opened', 'Date Closed', 'Time Closed',
      'Duration', 'Department / Role', 'Schedule / Wave', 'Staff Personnel',
      'Status', 'Flagged?', 'Flag Reasons', 'Departmental Outputs & Metrics',
      'Handover Notes', 'Reviewed By', 'Reviewed At'
    ];

    const hRow2 = ws2.getRow(2);
    hRow2.height = 24;
    headers2.forEach((h, idx) => {
      const cell = hRow2.getCell(idx + 1);
      cell.value = h;
      cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = THIN_BORDER;
    });

    let rowIdx2 = 3;
    allSessionRows.forEach((s, idx) => {
      const r = ws2.getRow(rowIdx2);
      r.height = 20;
      r.getCell(1).value = s.id;
      r.getCell(2).value = s.date_opened;
      r.getCell(3).value = s.time_opened;
      r.getCell(4).value = s.date_closed;
      r.getCell(5).value = s.time_closed;
      r.getCell(6).value = s.duration;
      r.getCell(7).value = s.role;
      r.getCell(8).value = s.schedule;
      r.getCell(9).value = s.personnel;
      r.getCell(10).value = s.status;
      r.getCell(11).value = s.is_flagged;
      r.getCell(12).value = s.flag_reasons;
      r.getCell(13).value = s.metrics;
      r.getCell(14).value = s.handover_notes;
      r.getCell(15).value = s.reviewed_by;
      r.getCell(16).value = s.reviewed_at;

      [1, 2, 3, 4, 5, 6, 8, 10, 11, 16].forEach(c => {
        r.getCell(c).alignment = { vertical: 'middle', horizontal: 'center' };
      });
      [7, 9, 12, 13, 14, 15].forEach(c => {
        r.getCell(c).alignment = { vertical: 'middle', horizontal: 'left' };
      });

      const isZebra = idx % 2 === 1;
      for (let c = 1; c <= 16; c++) {
        const cell = r.getCell(c);
        cell.font = { name: 'Calibri', size: 9 };
        cell.border = THIN_BORDER;
        if (isZebra) cell.fill = ZEBRA_FILL;
      }

      if (s.is_flagged === 'YES') {
        r.getCell(11).fill = ALERT_FILL;
        r.getCell(11).font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FFB91C1C' } };
      }

      rowIdx2++;
    });

    ws2.views = [{ state: 'frozen', xSplit: 0, ySplit: 2, activeCell: 'A3' }];


    // ─────────────────────────────────────────────────────────────────────────────
    // SHEET 3: PAYMENT CHANNELS & TERMINALS BREAKDOWN
    // ─────────────────────────────────────────────────────────────────────────────
    const ws3 = workbook.addWorksheet('Payment Channels & Terminals', {
      properties: { tabColor: { argb: 'FF059669' } }
    });

    ws3.columns = [
      { key: 'shift_id', width: 12 },
      { key: 'date', width: 14 },
      { key: 'station', width: 22 },
      { key: 'personnel', width: 24 },
      { key: 'channel_type', width: 26 },
      { key: 'pay_code_or_terminal', width: 26 },
      { key: 'amount', width: 18 },
      { key: 'currency', width: 12 },
      { key: 'status', width: 18 }
    ];

    ws3.mergeCells('A1:I1');
    const ws3Title = ws3.getCell('A1');
    ws3Title.value = `LUMINA CLINIC — PAYMENT CHANNELS, MOMO PAY CODES & POS BANK TERMINALS (${periodDates.label.toUpperCase()})`;
    ws3Title.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
    ws3Title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF059669' } };
    ws3Title.alignment = { vertical: 'middle', horizontal: 'center' };
    ws3.getRow(1).height = 28;

    const headers3 = [
      'Shift ID', 'Date', 'Counter / Station', 'Personnel', 'Payment Channel Type',
      'Pay Code / Bank POS Terminal', 'Amount Collected', 'Currency', 'Audit Status'
    ];

    const hRow3 = ws3.getRow(2);
    hRow3.height = 24;
    headers3.forEach((h, idx) => {
      const cell = hRow3.getCell(idx + 1);
      cell.value = h;
      cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF059669' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = THIN_BORDER;
    });

    let rowIdx3 = 3;
    if (paymentChannelLogs.length === 0) {
      ws3.mergeCells(`A${rowIdx3}:I${rowIdx3}`);
      const emptyCell3 = ws3.getCell(`A${rowIdx3}`);
      emptyCell3.value = 'No mobile money or bank POS terminal transactions logged in this period.';
      emptyCell3.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF94A3B8' } };
      emptyCell3.alignment = { vertical: 'middle', horizontal: 'center' };
      ws3.getRow(rowIdx3).height = 22;
      rowIdx3++;
    } else {
      paymentChannelLogs.forEach((p, idx) => {
        const r = ws3.getRow(rowIdx3);
        r.height = 20;
        r.getCell(1).value = p.shift_id;
        r.getCell(2).value = p.date;
        r.getCell(3).value = p.station;
        r.getCell(4).value = p.personnel;
        r.getCell(5).value = p.channel_type;
        r.getCell(6).value = p.pay_code_or_terminal;
        r.getCell(7).value = p.amount;
        r.getCell(8).value = p.currency;
        r.getCell(9).value = p.status;

        [1, 2, 8, 9].forEach(c => { r.getCell(c).alignment = { vertical: 'middle', horizontal: 'center' }; });
        [3, 4, 5, 6].forEach(c => { r.getCell(c).alignment = { vertical: 'middle', horizontal: 'left' }; });
        r.getCell(7).alignment = { vertical: 'middle', horizontal: 'right' };
        r.getCell(7).numFmt = '#,##0 "RWF"';

        const isZebra = idx % 2 === 1;
        for (let c = 1; c <= 9; c++) {
          const cell = r.getCell(c);
          cell.font = { name: 'Calibri', size: 9 };
          cell.border = THIN_BORDER;
          if (isZebra) cell.fill = ZEBRA_FILL;
        }

        rowIdx3++;
      });

      // Sum of payment channels
      const tRow3 = ws3.getRow(rowIdx3);
      tRow3.height = 24;
      tRow3.getCell(6).value = 'TOTAL PAYMENT CHANNELS SETTLED:';
      tRow3.getCell(6).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0F172A' } };
      tRow3.getCell(6).alignment = { vertical: 'middle', horizontal: 'right' };

      tRow3.getCell(7).value = { formula: `=SUM(G3:G${rowIdx3 - 1})` };
      tRow3.getCell(7).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0F172A' } };
      tRow3.getCell(7).numFmt = '#,##0 "RWF"';
      tRow3.getCell(7).alignment = { vertical: 'middle', horizontal: 'right' };

      for (let c = 1; c <= 9; c++) {
        const cell = tRow3.getCell(c);
        cell.fill = TOTALS_FILL;
        cell.border = DOUBLE_BOTTOM_BORDER;
      }
    }

    ws3.views = [{ state: 'frozen', xSplit: 0, ySplit: 2, activeCell: 'A3' }];

    // Set filename & Stream response
    const exportFileName = `Lumina_Shift_Income_Statement_${periodDates.periodType}_${periodDates.dateStamp}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${exportFileName}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
};
