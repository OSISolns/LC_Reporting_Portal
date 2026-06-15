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
    const { readiness_score, scheduled_date } = req.body;

    const { rows } = await db.query(
      `UPDATE compliance_audits 
       SET readiness_score = ?, scheduled_date = ? 
       WHERE id = ? 
       RETURNING *`,
      [readiness_score, scheduled_date, id]
    );

    if (rows.length === 0) {
      // Fallback if RETURNING is not supported or returns empty in some driver builds
      const { rows: updatedRows } = await db.query('SELECT * FROM compliance_audits WHERE id = ?', [id]);
      return res.json({ success: true, data: updatedRows[0] });
    }

    res.json({ success: true, data: rows[0] });
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
    const { staff_name, role, license_type, expiry_date, status } = req.body;

    if (!staff_name || !role || !license_type || !expiry_date || !status) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    const { rows } = await db.query(
      `INSERT INTO compliance_licenses (staff_name, role, license_type, expiry_date, status) 
       VALUES (?, ?, ?, ?, ?) 
       RETURNING *`,
      [staff_name, role, license_type, expiry_date, status]
    );

    if (rows.length === 0) {
      const { rows: inserted } = await db.query(
        'SELECT * FROM compliance_licenses WHERE staff_name = ? AND license_type = ? ORDER BY id DESC LIMIT 1',
        [staff_name, license_type]
      );
      return res.json({ success: true, data: inserted[0] });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
};

exports.updateLicense = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { staff_name, role, license_type, expiry_date, status } = req.body;

    await db.query(
      `UPDATE compliance_licenses 
       SET staff_name = ?, role = ?, license_type = ?, expiry_date = ?, status = ? 
       WHERE id = ?`,
      [staff_name, role, license_type, expiry_date, status, id]
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
    const { name, issuer, expiry_date, status } = req.body;

    if (!name || !issuer || !expiry_date || !status) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    const { rows } = await db.query(
      `INSERT INTO compliance_facility_certs (name, issuer, expiry_date, status) 
       VALUES (?, ?, ?, ?) 
       RETURNING *`,
      [name, issuer, expiry_date, status]
    );

    if (rows.length === 0) {
      const { rows: inserted } = await db.query(
        'SELECT * FROM compliance_facility_certs WHERE name = ? ORDER BY id DESC LIMIT 1',
        [name]
      );
      return res.json({ success: true, data: inserted[0] });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
};

exports.updateFacilityCert = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, issuer, expiry_date, status } = req.body;

    await db.query(
      `UPDATE compliance_facility_certs 
       SET name = ?, issuer = ?, expiry_date = ?, status = ? 
       WHERE id = ?`,
      [name, issuer, expiry_date, status, id]
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
