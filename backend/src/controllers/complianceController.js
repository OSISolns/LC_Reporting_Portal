'use strict';
const db = require('../config/db');

/**
 * Compliance & Audit Controller
 */

// --- Audit & Readiness ---
exports.getAudits = async (req, res, next) => {
  try {
    const { rows } = await db.query('SELECT * FROM compliance_audits ORDER BY id DESC');
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

exports.updateAuditReadiness = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { readiness_score, scheduled_date, title, description, category, status } = req.body;

    const { rows: existing } = await db.query('SELECT * FROM compliance_audits WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Audit record not found.' });
    }

    const updatedScore = readiness_score !== undefined ? readiness_score : existing[0].readiness_score;
    const updatedDate = scheduled_date || existing[0].scheduled_date;
    const updatedTitle = title || existing[0].title;
    const updatedDesc = description !== undefined ? description : existing[0].description;
    const updatedCat = category !== undefined ? category : existing[0].category;
    const updatedStatus = status !== undefined ? status : existing[0].status;

    await db.query(
      `UPDATE compliance_audits 
       SET readiness_score = ?, scheduled_date = ?, title = ?, description = ?, category = ?, status = ?
       WHERE id = ?`,
      [updatedScore, updatedDate, updatedTitle, updatedDesc, updatedCat, updatedStatus, id]
    );

    const { rows: updatedRows } = await db.query('SELECT * FROM compliance_audits WHERE id = ?', [id]);
    res.json({ success: true, data: updatedRows[0] });
  } catch (err) {
    next(err);
  }
};

// --- Staff Credentials & Licenses ---
exports.getLicenses = async (req, res, next) => {
  try {
    const { rows } = await db.query('SELECT * FROM compliance_licenses ORDER BY expiry_date ASC');
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

exports.createLicense = async (req, res, next) => {
  try {
    const { staff_name, role, license_type, expiry_date, status, department, council_reg_no } = req.body;

    if (!staff_name || !role || !license_type || !expiry_date || !status) {
      return res.status(400).json({ success: false, message: 'All essential fields are required.' });
    }

    await db.query(
      `INSERT INTO compliance_licenses (staff_name, role, license_type, expiry_date, status, department, council_reg_no) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [staff_name, role, license_type, expiry_date, status, department || null, council_reg_no || null]
    );

    const { rows: inserted } = await db.query(
      'SELECT * FROM compliance_licenses WHERE staff_name = ? AND license_type = ? ORDER BY id DESC LIMIT 1',
      [staff_name, license_type]
    );

    res.json({ success: true, data: inserted[0] });
  } catch (err) {
    next(err);
  }
};

exports.updateLicense = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { staff_name, role, license_type, expiry_date, status, department, council_reg_no } = req.body;

    await db.query(
      `UPDATE compliance_licenses 
       SET staff_name = ?, role = ?, license_type = ?, expiry_date = ?, status = ?, department = ?, council_reg_no = ? 
       WHERE id = ?`,
      [staff_name, role, license_type, expiry_date, status, department || null, council_reg_no || null, id]
    );

    const { rows } = await db.query('SELECT * FROM compliance_licenses WHERE id = ?', [id]);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
};

exports.deleteLicense = async (req, res, next) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM compliance_licenses WHERE id = ?', [id]);
    res.json({ success: true, message: 'License deleted successfully.' });
  } catch (err) {
    next(err);
  }
};

// --- Facility Certifications ---
exports.getFacilityCerts = async (req, res, next) => {
  try {
    const { rows } = await db.query('SELECT * FROM compliance_facility_certs ORDER BY expiry_date ASC');
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

exports.createFacilityCert = async (req, res, next) => {
  try {
    const { name, issuer, expiry_date, status, permit_no, scope, inspection_cycle } = req.body;

    if (!name || !issuer || !expiry_date || !status) {
      return res.status(400).json({ success: false, message: 'All essential fields are required.' });
    }

    await db.query(
      `INSERT INTO compliance_facility_certs (name, issuer, expiry_date, status, permit_no, scope, inspection_cycle) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, issuer, expiry_date, status, permit_no || null, scope || null, inspection_cycle || null]
    );

    const { rows: inserted } = await db.query(
      'SELECT * FROM compliance_facility_certs WHERE name = ? ORDER BY id DESC LIMIT 1',
      [name]
    );

    res.json({ success: true, data: inserted[0] });
  } catch (err) {
    next(err);
  }
};

exports.updateFacilityCert = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, issuer, expiry_date, status, permit_no, scope, inspection_cycle } = req.body;

    await db.query(
      `UPDATE compliance_facility_certs 
       SET name = ?, issuer = ?, expiry_date = ?, status = ?, permit_no = ?, scope = ?, inspection_cycle = ? 
       WHERE id = ?`,
      [name, issuer, expiry_date, status, permit_no || null, scope || null, inspection_cycle || null, id]
    );

    const { rows } = await db.query('SELECT * FROM compliance_facility_certs WHERE id = ?', [id]);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
};

exports.deleteFacilityCert = async (req, res, next) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM compliance_facility_certs WHERE id = ?', [id]);
    res.json({ success: true, message: 'Facility certification deleted successfully.' });
  } catch (err) {
    next(err);
  }
};
