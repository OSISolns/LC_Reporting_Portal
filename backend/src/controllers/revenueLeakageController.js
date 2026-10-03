'use strict';
const db = require('../config/db');

// Helper to query rows safely
const queryRows = async (sql, args = []) => {
  try {
    const res = await db.query(sql, args);
    return res?.rows || [];
  } catch (err) {
    console.warn(`revenueLeakage query warning (${sql}):`, err.message);
    return [];
  }
};

// Safe date formatter
const formatDate = (val) => {
  if (!val) return new Date().toISOString().slice(0, 10);
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  return String(val).slice(0, 10);
};

/**
 * Audit scanner that inspects real clinical & billing tables across the database
 * to detect unbilled procedures, unverified observations, pending refunds, and cancellations.
 */
const scanRealDiscrepancies = async () => {
  const newDiscrepancies = [];

  // 1. Clinical Observations (unverified / draft observations)
  const obsRows = await queryRows(
    `SELECT id, patient_id, patient_name, ward, status, created_at, updated_at
     FROM clinical_observations
     ORDER BY updated_at DESC LIMIT 50`
  );

  for (const obs of obsRows) {
    if (!obs.patient_name || obs.patient_name === 'undefined' || obs.patient_name === 'null') continue;
    const isUnverified = (obs.status || '').toLowerCase() !== 'verified';
    if (isUnverified) {
      const dateStr = formatDate(obs.updated_at || obs.created_at);
      const refId = `LKG-OBS-${obs.id}`;
      newDiscrepancies.push({
        id: refId,
        patient: obs.patient_name,
        service: `Clinical Observation (${obs.ward || 'General Ward'})`,
        date: dateStr,
        clinical_log: `Observation sheet logged (Status: ${obs.status || 'Draft'})`,
        billing_log: 'Unverified Clinical Sheet — Billing Audit Pending',
        value: 25000,
        status: 'Unresolved',
      });
    }
  }

  // 2. Refund Requests (pending or active refunds)
  const refundRows = await queryRows(
    `SELECT id, patient_full_name, original_receipt_number, amount_to_be_refunded, reason_for_refund, status, created_at
     FROM refund_requests
     ORDER BY created_at DESC LIMIT 50`
  );

  for (const ref of refundRows) {
    if (!ref.patient_full_name) continue;
    const dateStr = formatDate(ref.created_at);
    const refId = `LKG-REF-${ref.id}`;
    const isRecovered = ['approved', 'resolved', 'closed'].includes((ref.status || '').toLowerCase());
    newDiscrepancies.push({
      id: refId,
      patient: ref.patient_full_name,
      service: `Refund Request (Receipt #${ref.original_receipt_number || 'N/A'})`,
      date: dateStr,
      clinical_log: `Refund Request: "${(ref.reason_for_refund || 'Billing Discrepancy').slice(0, 45)}"`,
      billing_log: ref.status === 'pending' ? 'Pending Refund Request Exposure' : `Refund Status: ${ref.status}`,
      value: Number(ref.amount_to_be_refunded || 0),
      status: isRecovered ? 'Recovered' : 'Unresolved',
    });
  }

  // 3. Cancellation Requests
  const cancRows = await queryRows(
    `SELECT id, patient_full_name, reason_for_cancellation, total_amount_cancelled, status, created_at
     FROM cancellation_requests
     ORDER BY created_at DESC LIMIT 50`
  );

  for (const canc of cancRows) {
    if (!canc.patient_full_name) continue;
    const dateStr = formatDate(canc.created_at);
    const refId = `LKG-CNC-${canc.id}`;
    const isRecovered = ['approved', 'resolved', 'closed'].includes((canc.status || '').toLowerCase());
    newDiscrepancies.push({
      id: refId,
      patient: canc.patient_full_name,
      service: `Service Cancellation (${(canc.reason_for_cancellation || 'Cancelled').slice(0, 35)})`,
      date: dateStr,
      clinical_log: `Cancellation Request Logged`,
      billing_log: `Cancelled Amount: RWF ${Number(canc.total_amount_cancelled || 0).toLocaleString()}`,
      value: Number(canc.total_amount_cancelled || 0),
      status: isRecovered ? 'Recovered' : 'Unresolved',
    });
  }

  // 4. Dental Cases (Diagnosed with charges)
  const dentalRows = await queryRows(
    `SELECT id, case_ref, patient_name, treatment_summary, total_charges, status, case_date, created_at
     FROM dental_clinic_cases
     ORDER BY created_at DESC LIMIT 50`
  );

  for (const den of dentalRows) {
    if (!den.patient_name || !den.total_charges || Number(den.total_charges) <= 0) continue;
    const dateStr = formatDate(den.case_date || den.created_at);
    const refId = `LKG-DEN-${den.id}`;
    const isRecovered = ['completed', 'delivered'].includes((den.status || '').toLowerCase());
    newDiscrepancies.push({
      id: refId,
      patient: den.patient_name,
      service: `Dental Procedure (${den.case_ref || 'Dental Clinic'})`,
      date: dateStr,
      clinical_log: `Dental Case Logged (${den.status})`,
      billing_log: `Uncollected Dental Charge Exposure`,
      value: Number(den.total_charges),
      status: isRecovered ? 'Recovered' : 'Unresolved',
    });
  }

  // 5. Imaging Studies (ongoing/scheduled)
  const imgRows = await queryRows(
    `SELECT id, sid, patient_name, exam_type_display, status, scheduled_at, created_at
     FROM imaging_studies
     ORDER BY created_at DESC LIMIT 50`
  );

  for (const img of imgRows) {
    if (!img.patient_name) continue;
    if ((img.status || '').toLowerCase() !== 'completed') {
      const dateStr = formatDate(img.scheduled_at || img.created_at);
      const refId = `LKG-IMG-${img.id}`;
      newDiscrepancies.push({
        id: refId,
        patient: img.patient_name,
        service: `Imaging Procedure (${img.exam_type_display || 'Radiology Study'})`,
        date: dateStr,
        clinical_log: `Imaging Scheduled (Status: ${img.status || 'Scheduled'})`,
        billing_log: 'Radiology Procedure — Unconfirmed Billing Invoice',
        value: 35000,
        status: 'Unresolved',
      });
    }
  }

  // Clean out legacy sample placeholder IDs (LKG-201, LKG-202, LKG-203)
  try {
    await db.query(`DELETE FROM revenue_leakages WHERE id IN ('LKG-201', 'LKG-202', 'LKG-203')`);
  } catch {}

  // Upsert actual discrepancies into revenue_leakages table
  let countAdded = 0;
  for (const item of newDiscrepancies) {
    if (!item.value || item.value <= 0) continue;
    try {
      const existing = await queryRows('SELECT id FROM revenue_leakages WHERE id = ?', [item.id]);
      if (existing.length === 0) {
        await db.query(
          `INSERT INTO revenue_leakages (id, patient, service, date, clinical_log, billing_log, value, status) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [item.id, item.patient, item.service, item.date, item.clinical_log, item.billing_log, item.value, item.status]
        );
        countAdded++;
      } else {
        // Update status or value if changed in source system
        await db.query(
          `UPDATE revenue_leakages SET patient = ?, service = ?, date = ?, clinical_log = ?, billing_log = ?, value = ? WHERE id = ? AND status != 'Recovered'`,
          [item.patient, item.service, item.date, item.clinical_log, item.billing_log, item.value, item.id]
        );
      }
    } catch (e) {
      console.warn(`Failed to insert/update discrepancy ${item.id}:`, e.message);
    }
  }

  return { totalFound: newDiscrepancies.length, countAdded };
};

exports.getLeakages = async (req, res, next) => {
  try {
    // Automatically scan & populate real system data
    await scanRealDiscrepancies();
    const { rows } = await db.query('SELECT * FROM revenue_leakages ORDER BY date DESC, id DESC');
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

exports.createLeakage = async (req, res, next) => {
  try {
    const { patient, service, date, clinical_log, billing_log, value, status } = req.body;

    if (!patient || !service || !date || !clinical_log || !billing_log || !value) {
      return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }

    const id = 'LKG-MAN-' + Math.floor(1000 + Math.random() * 9000);

    const { rows } = await db.query(
      `INSERT INTO revenue_leakages (id, patient, service, date, clinical_log, billing_log, value, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?) 
       RETURNING *`,
      [id, patient, service, date, clinical_log, billing_log, Number(value), status || 'Unresolved']
    );

    if (rows.length === 0) {
      const { rows: inserted } = await db.query('SELECT * FROM revenue_leakages WHERE id = ?', [id]);
      return res.json({ success: true, data: inserted[0] });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
};

exports.updateLeakage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { patient, service, date, clinical_log, billing_log, value, status } = req.body;

    await db.query(
      `UPDATE revenue_leakages 
       SET patient = ?, service = ?, date = ?, clinical_log = ?, billing_log = ?, value = ?, status = ? 
       WHERE id = ?`,
      [patient, service, date, clinical_log, billing_log, value, status, id]
    );

    const { rows } = await db.query('SELECT * FROM revenue_leakages WHERE id = ?', [id]);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
};

exports.deleteLeakage = async (req, res, next) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM revenue_leakages WHERE id = ?', [id]);
    res.json({ success: true, message: 'Revenue leakage record deleted.' });
  } catch (err) {
    next(err);
  }
};

exports.runSystemScan = async (req, res, next) => {
  try {
    const scanResult = await scanRealDiscrepancies();
    const { rows } = await db.query('SELECT * FROM revenue_leakages ORDER BY date DESC, id DESC');

    res.json({ 
      success: true, 
      message: scanResult.countAdded > 0
        ? `Full system audit complete. Identified ${scanResult.countAdded} new real financial discrepancy records!`
        : `Full system audit complete. ${scanResult.totalFound} system records audited — all discrepancies are currently tracked.`,
      data: rows
    });
  } catch (err) {
    next(err);
  }
};

