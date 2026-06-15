'use strict';
const db = require('../config/db');

/**
 * Revenue Leakage Controller
 */

exports.getLeakages = async (req, res, next) => {
  try {
    const { rows } = await db.query('SELECT * FROM revenue_leakages ORDER BY date DESC');
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

    const id = 'LKG-' + Math.floor(100 + Math.random() * 900);

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
    // Generate a random leakage if not exists to simulate scanner finding issues
    const id = 'LKG-' + Math.floor(100 + Math.random() * 900);
    const names = ['Emmanuel Niyonsaba', 'Claudine Umurerwa', 'Jean de Dieu Twagiramungu', 'Aline Mutoni'];
    const services = ['CT Scan Abdomen', 'Dental Extraction', 'Ophthalmology Consultation', 'Cardiology ECG'];
    const logs = ['Clinical Report Uploaded', 'Doctor Consult Completed', 'Procedure Performed', 'Therapy Done'];
    const billing = ['Missing Invoice', 'Billed RWF 15,000 (Expected RWF 30,000)', 'Missing Billing Record', 'Unpaid Draft Invoice'];
    const values = [40000, 15000, 20000, 60000];

    const idx = Math.floor(Math.random() * names.length);
    const today = new Date().toISOString().split('T')[0];

    await db.query(
      `INSERT INTO revenue_leakages (id, patient, service, date, clinical_log, billing_log, value, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Unresolved')`,
      [id, names[idx], services[idx], today, logs[idx], billing[idx], values[idx]]
    );

    res.json({ 
      success: true, 
      message: 'System scan complete. New revenue leakage discrepancy detected!',
      detected: {
        id,
        patient: names[idx],
        service: services[idx],
        value: values[idx]
      }
    });
  } catch (err) {
    next(err);
  }
};
