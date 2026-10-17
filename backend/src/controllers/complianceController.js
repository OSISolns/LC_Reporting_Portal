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

exports.createAudit = async (req, res, next) => {
  try {
    const { title, scheduled_date, readiness_score, description, category, status } = req.body;
    if (!title || !scheduled_date) {
      return res.status(400).json({ success: false, message: 'Audit title and scheduled date are required.' });
    }
    await db.query(
      `INSERT INTO compliance_audits (title, scheduled_date, readiness_score, description, category, status) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [title, scheduled_date, readiness_score !== undefined ? readiness_score : 80, description || null, category || 'Statutory Quality', status || 'Scheduled']
    );
    const { rows } = await db.query(
      'SELECT * FROM compliance_audits WHERE title = ? AND scheduled_date = ? ORDER BY id DESC LIMIT 1',
      [title, scheduled_date]
    );
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
};

exports.deleteAudit = async (req, res, next) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM compliance_audits WHERE id = ?', [id]);
    res.json({ success: true, message: 'Audit record deleted successfully.' });
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

// --- Statutory Reporting Calendar ---
exports.getCalendar = async (req, res, next) => {
  try {
    const { rows } = await db.query('SELECT * FROM compliance_statutory_calendar ORDER BY id ASC');
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

exports.createCalendarItem = async (req, res, next) => {
  try {
    const { title, frequency, due_date_rule, authority, description, focal_person, status, next_due_date, last_submitted_date } = req.body;

    if (!title || !frequency || !due_date_rule) {
      return res.status(400).json({ success: false, message: 'Filing title, frequency, and due date schedule are required.' });
    }

    await db.query(
      `INSERT INTO compliance_statutory_calendar (title, frequency, due_date_rule, authority, description, focal_person, status, next_due_date, last_submitted_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title,
        frequency,
        due_date_rule,
        authority || null,
        description || null,
        focal_person || null,
        status || 'Upcoming',
        next_due_date || null,
        last_submitted_date || null
      ]
    );

    const { rows: inserted } = await db.query(
      'SELECT * FROM compliance_statutory_calendar WHERE title = ? ORDER BY id DESC LIMIT 1',
      [title]
    );

    res.json({ success: true, data: inserted[0] });
  } catch (err) {
    next(err);
  }
};

exports.updateCalendarItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, frequency, due_date_rule, authority, description, focal_person, status, next_due_date, last_submitted_date } = req.body;

    const { rows: existing } = await db.query('SELECT * FROM compliance_statutory_calendar WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Statutory calendar filing record not found.' });
    }

    const updatedTitle = title || existing[0].title;
    const updatedFrequency = frequency || existing[0].frequency;
    const updatedDueDateRule = due_date_rule || existing[0].due_date_rule;
    const updatedAuthority = authority !== undefined ? authority : existing[0].authority;
    const updatedDesc = description !== undefined ? description : existing[0].description;
    const updatedFocal = focal_person !== undefined ? focal_person : existing[0].focal_person;
    const updatedStatus = status !== undefined ? status : existing[0].status;
    const updatedNextDue = next_due_date !== undefined ? next_due_date : existing[0].next_due_date;
    const updatedLastSubmitted = last_submitted_date !== undefined ? last_submitted_date : existing[0].last_submitted_date;

    await db.query(
      `UPDATE compliance_statutory_calendar 
       SET title = ?, frequency = ?, due_date_rule = ?, authority = ?, description = ?, focal_person = ?, status = ?, next_due_date = ?, last_submitted_date = ?, updated_at = (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
       WHERE id = ?`,
      [
        updatedTitle,
        updatedFrequency,
        updatedDueDateRule,
        updatedAuthority,
        updatedDesc,
        updatedFocal,
        updatedStatus,
        updatedNextDue,
        updatedLastSubmitted,
        id
      ]
    );

    const { rows: updatedRows } = await db.query('SELECT * FROM compliance_statutory_calendar WHERE id = ?', [id]);
    res.json({ success: true, data: updatedRows[0] });
  } catch (err) {
    next(err);
  }
};

exports.deleteCalendarItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM compliance_statutory_calendar WHERE id = ?', [id]);
    res.json({ success: true, message: 'Statutory calendar filing deleted successfully.' });
  } catch (err) {
    next(err);
  }
};
