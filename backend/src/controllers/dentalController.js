'use strict';
const db = require('../config/db');
const { logAction } = require('../middleware/audit');

// ─── Helper ───────────────────────────────────────────────────────────────────
// Generate a prosthetics case reference number: DC-YYMMDD-XXXX
const generateCaseRef = () => {
  const d = new Date();
  const dateStr = d.toISOString().slice(0, 10).replace(/-/g, '').slice(2);
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `DC-${dateStr}-${rand}`;
};

// ─── 1. List cases (with optional date-range filter) ─────────────────────────
exports.listCases = async (req, res, next) => {
  try {
    const { from, to, period } = req.query; // period = 'daily' | 'weekly' | 'monthly'

    let dateFilter = '';
    const params = [];

    if (from && to) {
      dateFilter = `WHERE dc.received_date >= ? AND dc.received_date <= ?`;
      params.push(from, to);
    } else if (period === 'daily') {
      dateFilter = `WHERE date(dc.received_date) = date('now')`;
    } else if (period === 'weekly') {
      dateFilter = `WHERE dc.received_date >= date('now', '-6 days')`;
    } else if (period === 'monthly') {
      dateFilter = `WHERE dc.received_date >= date('now', 'start of month')`;
    }

    const { rows } = await db.query(
      `SELECT dc.*,
              u.full_name AS reported_by_name
       FROM   dental_cases dc
       LEFT JOIN users u ON u.id = dc.reported_by_user_id
       ${dateFilter}
       ORDER  BY dc.created_at DESC`,
      params
    );

    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

// ─── 2. Get single case ───────────────────────────────────────────────────────
exports.getCase = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows } = await db.query(
      `SELECT dc.*, u.full_name AS reported_by_name
       FROM   dental_cases dc
       LEFT JOIN users u ON u.id = dc.reported_by_user_id
       WHERE  dc.id = ?`,
      [id]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Case not found.' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};

// ─── Helper for Safe Numeric Parsing ──────────────────────────────────────────
const parseNum = (v) => (v !== undefined && v !== null && v !== '' && !isNaN(Number(v))) ? Number(v) : null;

// ─── 3. Create case ───────────────────────────────────────────────────────────
exports.createCase = async (req, res, next) => {
  try {
    const {
      received_date,
      required_date,
      work_command_origin,
      clinic_of_origin,
      clinician_name,
      patient_id,
      work_done,
      work_done_other,
      technologist,
      units_quantity,
      cost_per_first_unit,
      cost_per_additional_unit,
      total_cost,
      status,
      delivery_notes,
      delivered_to,
      delivered_at,
      reported_by,
      odontogram_data,
    } = req.body;

    // Basic validation
    if (!received_date || !required_date || !work_done) {
      return res.status(400).json({
        success: false,
        message: 'received_date, required_date, and work_done are required.',
      });
    }

    const case_ref = generateCaseRef();
    const reported_by_user_id = req.user?.id || null;
    const parsedQty = parseNum(units_quantity) || 1;
    const parsedFirst = parseNum(cost_per_first_unit);
    const parsedAdd = parseNum(cost_per_additional_unit);
    const parsedTotal = parseNum(total_cost);
    const serializedOdontogram = odontogram_data ? (typeof odontogram_data === 'string' ? odontogram_data : JSON.stringify(odontogram_data)) : null;

    await db.query(
      `INSERT INTO dental_cases (
         case_ref, received_date, required_date, work_command_origin,
         clinic_of_origin, clinician_name, patient_id, work_done,
         work_done_other, technologist, units_quantity,
         cost_per_first_unit, cost_per_additional_unit, total_cost,
         status, delivery_notes, delivered_to, delivered_at,
         reported_by, reported_by_user_id, odontogram_data
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        case_ref, received_date, required_date, work_command_origin || null,
        clinic_of_origin || null, clinician_name || null, patient_id || null,
        work_done, work_done_other || null, technologist || null,
        parsedQty,
        parsedFirst,
        parsedAdd,
        parsedTotal,
        status || 'Received', delivery_notes || null, delivered_to || null, delivered_at || null,
        reported_by || null, reported_by_user_id, serializedOdontogram
      ]
    );

    // Retrieve inserted ID
    const { rows: inserted } = await db.query(
      'SELECT id FROM dental_cases WHERE case_ref = ?', [case_ref]
    );
    const newId = inserted[0]?.id;

    await logAction(req, 'DENTAL_CASE_CREATE', 'dental_cases', newId, { case_ref, patient_id, work_done });

    res.status(201).json({ success: true, message: 'Case logged successfully.', data: { id: newId, case_ref } });
  } catch (err) { next(err); }
};

// ─── 4. Update case ───────────────────────────────────────────────────────────
exports.updateCase = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      received_date,
      required_date,
      work_command_origin,
      clinic_of_origin,
      clinician_name,
      patient_id,
      work_done,
      work_done_other,
      technologist,
      units_quantity,
      cost_per_first_unit,
      cost_per_additional_unit,
      total_cost,
      status,
      delivery_notes,
      delivered_to,
      delivered_at,
      reported_by,
      odontogram_data,
    } = req.body;

    // Fetch existing case to preserve unpassed fields
    const { rows: existing } = await db.query('SELECT * FROM dental_cases WHERE id = ?', [id]);
    if (!existing.length) {
      return res.status(404).json({ success: false, message: 'Case not found.' });
    }
    const current = existing[0];

    const updatedStatus = status !== undefined ? status : (current.status || 'Received');
    const updatedDeliveredAt = delivered_at !== undefined ? delivered_at : (updatedStatus === 'Delivered' ? (current.delivered_at || new Date().toISOString()) : current.delivered_at);
    const serializedOdontogram = odontogram_data !== undefined 
      ? (typeof odontogram_data === 'string' ? odontogram_data : JSON.stringify(odontogram_data))
      : current.odontogram_data;

    await db.query(
      `UPDATE dental_cases SET
         received_date = ?, required_date = ?, work_command_origin = ?,
         clinic_of_origin = ?, clinician_name = ?, patient_id = ?,
         work_done = ?, work_done_other = ?, technologist = ?,
         units_quantity = ?, cost_per_first_unit = ?,
         cost_per_additional_unit = ?, total_cost = ?,
         status = ?, delivery_notes = ?, delivered_to = ?, delivered_at = ?,
         reported_by = ?, odontogram_data = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        received_date !== undefined ? received_date : current.received_date,
        required_date !== undefined ? required_date : current.required_date,
        work_command_origin !== undefined ? work_command_origin : current.work_command_origin,
        clinic_of_origin !== undefined ? clinic_of_origin : current.clinic_of_origin,
        clinician_name !== undefined ? clinician_name : current.clinician_name,
        patient_id !== undefined ? patient_id : current.patient_id,
        work_done !== undefined ? work_done : current.work_done,
        work_done_other !== undefined ? work_done_other : current.work_done_other,
        technologist !== undefined ? technologist : current.technologist,
        units_quantity !== undefined ? (parseNum(units_quantity) || 1) : current.units_quantity,
        cost_per_first_unit !== undefined ? parseNum(cost_per_first_unit) : current.cost_per_first_unit,
        cost_per_additional_unit !== undefined ? parseNum(cost_per_additional_unit) : current.cost_per_additional_unit,
        total_cost !== undefined ? parseNum(total_cost) : current.total_cost,
        updatedStatus,
        delivery_notes !== undefined ? delivery_notes : current.delivery_notes,
        delivered_to !== undefined ? delivered_to : current.delivered_to,
        updatedDeliveredAt,
        reported_by !== undefined ? reported_by : current.reported_by,
        serializedOdontogram,
        id,
      ]
    );

    await logAction(req, 'DENTAL_CASE_UPDATE', 'dental_cases', id, { status: updatedStatus, work_done });
    res.json({ success: true, message: 'Case updated successfully.' });
  } catch (err) { next(err); }
};

// ─── 5. Delete case ───────────────────────────────────────────────────────────
exports.deleteCase = async (req, res, next) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM dental_cases WHERE id = ?', [id]);
    await logAction(req, 'DENTAL_CASE_DELETE', 'dental_cases', id, {});
    res.json({ success: true, message: 'Case deleted.' });
  } catch (err) { next(err); }
};

// ─── 6. Stats / summary ───────────────────────────────────────────────────────
exports.getStats = async (req, res, next) => {
  try {
    const { period = 'monthly' } = req.query;
    let dateFilter = '';

    if (period === 'daily') {
      dateFilter = `WHERE date(received_date) = date('now')`;
    } else if (period === 'weekly') {
      dateFilter = `WHERE received_date >= date('now', '-6 days')`;
    } else {
      dateFilter = `WHERE received_date >= date('now', 'start of month')`;
    }

    const { rows: totals } = await db.query(
      `SELECT
         COUNT(*) AS total_cases,
         SUM(units_quantity) AS total_units,
         SUM(COALESCE(total_cost, 0)) AS total_revenue
       FROM dental_cases
       ${dateFilter}`
    );

    const { rows: byWorkType } = await db.query(
      `SELECT work_done, COUNT(*) AS count, SUM(COALESCE(total_cost, 0)) AS revenue
       FROM dental_cases
       ${dateFilter}
       GROUP BY work_done
       ORDER BY count DESC`
    );

    const { rows: byClinic } = await db.query(
      `SELECT clinic_of_origin, COUNT(*) AS count
       FROM dental_cases
       ${dateFilter}
       GROUP BY clinic_of_origin
       ORDER BY count DESC
       LIMIT 10`
    );

    res.json({
      success: true,
      data: {
        totals: totals[0] || { total_cases: 0, total_units: 0, total_revenue: 0 },
        byWorkType,
        byClinic,
      },
    });
  } catch (err) { next(err); }
};

// ═══════════════════════════════════════════════════════════════════════════════
// DENTAL WORKLIST — Patient Queue Management
// ═══════════════════════════════════════════════════════════════════════════════

// ─── List worklist entries ────────────────────────────────────────────────────
exports.listWorklist = async (req, res, next) => {
  try {
    const { date, period } = req.query;
    let dateFilter = "WHERE date(appointment_date) = date('now')";
    const params = [];

    if (date) {
      dateFilter = 'WHERE date(appointment_date) = date(?)';
      params.push(date);
    } else if (period === 'weekly') {
      dateFilter = "WHERE appointment_date >= date('now', '-6 days')";
    } else if (period === 'monthly') {
      dateFilter = "WHERE appointment_date >= date('now', 'start of month')";
    }

    const { rows } = await db.query(
      `SELECT * FROM dental_worklist ${dateFilter}
       ORDER BY CASE WHEN scheduled_time IS NULL THEN 1 ELSE 0 END,
                scheduled_time ASC, created_at ASC`,
      params
    );
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

// ─── Today's stats ────────────────────────────────────────────────────────────
exports.getWorklistStats = async (req, res, next) => {
  try {
    const { date } = req.query;
    const filterDate = date || "date('now')";
    const { rows } = await db.query(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN status = 'Waiting'    THEN 1 ELSE 0 END) AS waiting,
         SUM(CASE WHEN status = 'In Chair'   THEN 1 ELSE 0 END) AS in_chair,
         SUM(CASE WHEN status = 'Post-op'    THEN 1 ELSE 0 END) AS post_op,
         SUM(CASE WHEN status = 'Discharged' THEN 1 ELSE 0 END) AS discharged,
         SUM(CASE WHEN status = 'No Show'    THEN 1 ELSE 0 END) AS no_show,
         SUM(CASE WHEN status = 'Cancelled'  THEN 1 ELSE 0 END) AS cancelled
       FROM dental_worklist
       WHERE date(appointment_date) = ${date ? 'date(?)' : "date('now')"}`,
      date ? [date] : []
    );
    res.json({ success: true, data: rows[0] || {} });
  } catch (err) { next(err); }
};

// ─── Add patient to worklist ──────────────────────────────────────────────────
exports.addWorklist = async (req, res, next) => {
  try {
    const {
      patient_id, patient_name, appointment_type, provider,
      scheduled_time, appointment_date, chief_complaint, notes,
    } = req.body;

    if (!patient_name || !appointment_type || !appointment_date) {
      return res.status(400).json({
        success: false,
        message: 'patient_name, appointment_type, and appointment_date are required.',
      });
    }

    await db.query(
      `INSERT INTO dental_worklist
         (patient_id, patient_name, appointment_type, provider,
          scheduled_time, appointment_date, chief_complaint, notes,
          reported_by, reported_by_user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        patient_id || null, patient_name, appointment_type,
        provider || null, scheduled_time || null, appointment_date,
        chief_complaint || null, notes || null,
        req.user?.full_name || null, req.user?.id || null,
      ]
    );

    const { rows } = await db.query('SELECT id FROM dental_worklist ORDER BY id DESC LIMIT 1');
    const newId = rows[0]?.id;
    await logAction(req, 'DENTAL_WORKLIST_ADD', 'dental_worklist', newId, { patient_name, appointment_type });
    res.status(201).json({ success: true, message: 'Patient added to worklist.', data: { id: newId } });
  } catch (err) { next(err); }
};

// ─── Update worklist entry (full edit) ───────────────────────────────────────
exports.updateWorklist = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      patient_id, patient_name, appointment_type, provider,
      scheduled_time, appointment_date, chief_complaint, notes,
    } = req.body;

    await db.query(
      `UPDATE dental_worklist SET
         patient_id = ?, patient_name = ?, appointment_type = ?, provider = ?,
         scheduled_time = ?, appointment_date = ?, chief_complaint = ?, notes = ?,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        patient_id || null, patient_name, appointment_type,
        provider || null, scheduled_time || null, appointment_date,
        chief_complaint || null, notes || null, id,
      ]
    );

    await logAction(req, 'DENTAL_WORKLIST_UPDATE', 'dental_worklist', id, {});
    res.json({ success: true, message: 'Entry updated.' });
  } catch (err) { next(err); }
};

// ─── Update status only (fast action) ────────────────────────────────────────
exports.updateWorklistStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const VALID = ['Waiting', 'In Chair', 'Post-op', 'Discharged', 'No Show', 'Cancelled'];
    if (!VALID.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value.' });
    }

    const timestampField =
      status === 'In Chair'   ? ', checked_in_at = CURRENT_TIMESTAMP'       :
      status === 'Post-op'    ? ', treatment_started_at = CURRENT_TIMESTAMP' :
      status === 'Discharged' ? ', completed_at = CURRENT_TIMESTAMP'         : '';

    await db.query(
      `UPDATE dental_worklist SET status = ? ${timestampField}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [status, id]
    );

    // Bridge back: if this worklist entry originated from a booked appointment,
    // reflect the real-world outcome on the appointment record too.
    const apptStatus =
      status === 'Discharged' ? 'Completed' :
      status === 'No Show'    ? 'No-Show'   :
      status === 'Cancelled'  ? 'Cancelled' : null;
    if (apptStatus) {
      try {
        await db.query(
          `UPDATE dental_appointments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE worklist_id = ?`,
          [apptStatus, id]
        );
      } catch (bridgeErr) { /* non-fatal — appointment linkage is best-effort */ }
    }

    await logAction(req, 'DENTAL_WORKLIST_STATUS', 'dental_worklist', id, { status });
    res.json({ success: true, message: `Status set to "${status}".` });
  } catch (err) { next(err); }
};

// ─── Delete worklist entry ────────────────────────────────────────────────────
exports.deleteWorklist = async (req, res, next) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM dental_worklist WHERE id = ?', [id]);
    await logAction(req, 'DENTAL_WORKLIST_DELETE', 'dental_worklist', id, {});
    res.json({ success: true, message: 'Entry removed.' });
  } catch (err) { next(err); }
};

// ═══════════════════════════════════════════════════════════════════════════════
// DENTAL CHARTING — Odontogram Records
// ═══════════════════════════════════════════════════════════════════════════════

// ─── List charts for a patient ───────────────────────────────────────────────
exports.listCharts = async (req, res, next) => {
  try {
    const { patient_id } = req.query;
    if (!patient_id) {
      return res.status(400).json({ success: false, message: 'patient_id query param is required.' });
    }
    const { rows } = await db.query(
      `SELECT id, patient_id, patient_name, chart_date, general_notes, provider, created_at, updated_at
       FROM dental_charts WHERE patient_id = ? ORDER BY chart_date DESC`,
      [patient_id]
    );
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

// ─── Get single chart (with parsed tooth_data JSON) ──────────────────────────
exports.getChart = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows } = await db.query('SELECT * FROM dental_charts WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Chart not found.' });
    const chart = { ...rows[0] };
    try { chart.tooth_data = JSON.parse(chart.tooth_data || '{}'); } catch { chart.tooth_data = {}; }
    res.json({ success: true, data: chart });
  } catch (err) { next(err); }
};

// ─── Save (upsert) chart by patient + date ────────────────────────────────────
exports.saveChart = async (req, res, next) => {
  try {
    const { patient_id, patient_name, chart_date, tooth_data, general_notes, provider } = req.body;

    if (!patient_id || !chart_date) {
      return res.status(400).json({ success: false, message: 'patient_id and chart_date are required.' });
    }

    const toothJson = JSON.stringify(tooth_data || {});

    const { rows: existing } = await db.query(
      'SELECT id FROM dental_charts WHERE patient_id = ? AND chart_date = ?',
      [patient_id, chart_date]
    );

    let chartId;
    if (existing.length > 0) {
      chartId = existing[0].id;
      await db.query(
        `UPDATE dental_charts SET
           patient_name = ?, tooth_data = ?, general_notes = ?,
           provider = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [patient_name || null, toothJson, general_notes || null, provider || null, chartId]
      );
    } else {
      await db.query(
        `INSERT INTO dental_charts
           (patient_id, patient_name, chart_date, tooth_data, general_notes, provider, created_by, created_by_user_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          patient_id, patient_name || null, chart_date, toothJson,
          general_notes || null, provider || null,
          req.user?.full_name || null, req.user?.id || null,
        ]
      );
      const { rows: ins } = await db.query('SELECT id FROM dental_charts WHERE patient_id = ? AND chart_date = ?', [patient_id, chart_date]);
      chartId = ins[0]?.id;
    }

    await logAction(req, 'DENTAL_CHART_SAVE', 'dental_charts', chartId, { patient_id, chart_date });
    res.json({ success: true, message: 'Chart saved.', data: { id: chartId } });
  } catch (err) { next(err); }
};

// ─── Delete chart ─────────────────────────────────────────────────────────────
exports.deleteChart = async (req, res, next) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM dental_charts WHERE id = ?', [id]);
    await logAction(req, 'DENTAL_CHART_DELETE', 'dental_charts', id, {});
    res.json({ success: true, message: 'Chart deleted.' });
  } catch (err) { next(err); }
};

// ═══════════════════════════════════════════════════════════════════════════════
// DENTAL APPOINTMENTS — Forward-looking scheduling
// ═══════════════════════════════════════════════════════════════════════════════

// Default a missing end_time to 30 minutes after start_time (both "HH:MM").
const addMinutesToTime = (timeStr, minutes) => {
  const [h, m] = timeStr.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const wrapped = ((total % 1440) + 1440) % 1440;
  const hh = String(Math.floor(wrapped / 60)).padStart(2, '0');
  const mm = String(wrapped % 60).padStart(2, '0');
  return `${hh}:${mm}`;
};

// ─── List appointments (date / range / provider / status filters) ────────────
exports.listAppointments = async (req, res, next) => {
  try {
    const { date, from, to, provider, status } = req.query;
    const clauses = [];
    const params = [];

    if (date) {
      clauses.push('appointment_date = ?');
      params.push(date);
    } else if (from && to) {
      clauses.push('appointment_date >= ? AND appointment_date <= ?');
      params.push(from, to);
    } else {
      clauses.push("appointment_date >= date('now', 'weekday 0', '-7 days')");
    }
    if (provider) {
      clauses.push('provider = ?');
      params.push(provider);
    }
    if (status) {
      clauses.push('status = ?');
      params.push(status);
    }

    const { rows } = await db.query(
      `SELECT * FROM dental_appointments
       WHERE ${clauses.join(' AND ')}
       ORDER BY appointment_date ASC, start_time ASC`,
      params
    );
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

// ─── Appointment stats (counts per status for a date/range) ──────────────────
exports.getAppointmentStats = async (req, res, next) => {
  try {
    const { date, from, to } = req.query;
    let dateFilter = "WHERE date(appointment_date) = date('now')";
    const params = [];

    if (date) {
      dateFilter = 'WHERE appointment_date = ?';
      params.push(date);
    } else if (from && to) {
      dateFilter = 'WHERE appointment_date >= ? AND appointment_date <= ?';
      params.push(from, to);
    }

    const { rows } = await db.query(
      `SELECT
         appointment_date,
         COUNT(*) AS total,
         SUM(CASE WHEN status = 'Scheduled'  THEN 1 ELSE 0 END) AS scheduled,
         SUM(CASE WHEN status = 'Confirmed'  THEN 1 ELSE 0 END) AS confirmed,
         SUM(CASE WHEN status = 'Checked-In' THEN 1 ELSE 0 END) AS checked_in,
         SUM(CASE WHEN status = 'Completed'  THEN 1 ELSE 0 END) AS completed,
         SUM(CASE WHEN status = 'Cancelled'  THEN 1 ELSE 0 END) AS cancelled,
         SUM(CASE WHEN status = 'No-Show'    THEN 1 ELSE 0 END) AS no_show
       FROM dental_appointments
       ${dateFilter}
       GROUP BY appointment_date`,
      params
    );
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

// ─── Create appointment (with soft conflict check) ────────────────────────────
exports.createAppointment = async (req, res, next) => {
  try {
    const {
      patient_id, patient_name, appointment_type, provider,
      appointment_date, start_time, end_time, chief_complaint, notes, force,
    } = req.body;

    if (!patient_name || !appointment_type || !appointment_date || !start_time) {
      return res.status(400).json({
        success: false,
        message: 'patient_name, appointment_type, appointment_date, and start_time are required.',
      });
    }

    const resolvedEnd = end_time || addMinutesToTime(start_time, 30);

    if (provider && !force) {
      const { rows: conflicts } = await db.query(
        `SELECT * FROM dental_appointments
         WHERE provider = ? AND appointment_date = ?
           AND status NOT IN ('Cancelled', 'No-Show')
           AND start_time < ? AND ? < end_time`,
        [provider, appointment_date, resolvedEnd, start_time]
      );
      if (conflicts.length > 0) {
        return res.status(409).json({
          success: false,
          message: `${provider} already has an appointment overlapping this time.`,
          data: { conflicts },
        });
      }
    }

    await db.query(
      `INSERT INTO dental_appointments
         (patient_id, patient_name, appointment_type, provider,
          appointment_date, start_time, end_time, chief_complaint, notes,
          created_by, created_by_user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        patient_id || null, patient_name, appointment_type, provider || null,
        appointment_date, start_time, resolvedEnd, chief_complaint || null, notes || null,
        req.user?.full_name || null, req.user?.id || null,
      ]
    );

    const { rows } = await db.query('SELECT id FROM dental_appointments ORDER BY id DESC LIMIT 1');
    const newId = rows[0]?.id;
    await logAction(req, 'DENTAL_APPOINTMENT_CREATE', 'dental_appointments', newId, { patient_name, appointment_date, start_time });
    res.status(201).json({ success: true, message: 'Appointment booked.', data: { id: newId } });
  } catch (err) { next(err); }
};

// ─── Update appointment (full edit / reschedule) ──────────────────────────────
exports.updateAppointment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      patient_id, patient_name, appointment_type, provider,
      appointment_date, start_time, end_time, chief_complaint, notes, force,
    } = req.body;

    const resolvedEnd = end_time || addMinutesToTime(start_time, 30);

    if (provider && !force) {
      const { rows: conflicts } = await db.query(
        `SELECT * FROM dental_appointments
         WHERE provider = ? AND appointment_date = ? AND id != ?
           AND status NOT IN ('Cancelled', 'No-Show')
           AND start_time < ? AND ? < end_time`,
        [provider, appointment_date, id, resolvedEnd, start_time]
      );
      if (conflicts.length > 0) {
        return res.status(409).json({
          success: false,
          message: `${provider} already has an appointment overlapping this time.`,
          data: { conflicts },
        });
      }
    }

    await db.query(
      `UPDATE dental_appointments SET
         patient_id = ?, patient_name = ?, appointment_type = ?, provider = ?,
         appointment_date = ?, start_time = ?, end_time = ?,
         chief_complaint = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        patient_id || null, patient_name, appointment_type, provider || null,
        appointment_date, start_time, resolvedEnd,
        chief_complaint || null, notes || null, id,
      ]
    );

    await logAction(req, 'DENTAL_APPOINTMENT_UPDATE', 'dental_appointments', id, {});
    res.json({ success: true, message: 'Appointment updated.' });
  } catch (err) { next(err); }
};

// ─── Update status only (fast action) ─────────────────────────────────────────
exports.updateAppointmentStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const VALID = ['Scheduled', 'Confirmed', 'Checked-In', 'Completed', 'Cancelled', 'No-Show'];
    if (!VALID.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value.' });
    }

    await db.query(
      `UPDATE dental_appointments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [status, id]
    );

    await logAction(req, 'DENTAL_APPOINTMENT_STATUS', 'dental_appointments', id, { status });
    res.json({ success: true, message: `Status set to "${status}".` });
  } catch (err) { next(err); }
};

// ─── Check in: bridge an appointment into today's walk-in worklist ───────────
exports.checkInAppointment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows } = await db.query('SELECT * FROM dental_appointments WHERE id = ?', [id]);
    const appt = rows[0];
    if (!appt) {
      return res.status(404).json({ success: false, message: 'Appointment not found.' });
    }

    await db.query(
      `INSERT INTO dental_worklist
         (patient_id, patient_name, appointment_type, provider,
          scheduled_time, appointment_date, chief_complaint, notes,
          reported_by, reported_by_user_id)
       VALUES (?, ?, ?, ?, ?, date('now'), ?, ?, ?, ?)`,
      [
        appt.patient_id, appt.patient_name, appt.appointment_type, appt.provider,
        appt.start_time, appt.chief_complaint, appt.notes,
        req.user?.full_name || null, req.user?.id || null,
      ]
    );
    const { rows: wl } = await db.query('SELECT id FROM dental_worklist ORDER BY id DESC LIMIT 1');
    const worklistId = wl[0]?.id;

    await db.query(
      `UPDATE dental_appointments SET status = 'Checked-In', worklist_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [worklistId, id]
    );

    await logAction(req, 'DENTAL_APPOINTMENT_CHECKIN', 'dental_appointments', id, { worklist_id: worklistId });
    res.json({ success: true, message: 'Patient checked in to today\'s worklist.', data: { worklist_id: worklistId } });
  } catch (err) { next(err); }
};

// ─── Delete appointment ────────────────────────────────────────────────────────
exports.deleteAppointment = async (req, res, next) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM dental_appointments WHERE id = ?', [id]);
    await logAction(req, 'DENTAL_APPOINTMENT_DELETE', 'dental_appointments', id, {});
    res.json({ success: true, message: 'Appointment removed.' });
  } catch (err) { next(err); }
};

