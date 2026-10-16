'use strict';
const SafetyReport = require('../models/SafetyReport');
const { logAction } = require('../middleware/audit');
const { generateSafetyPDF } = require('../utils/pdf');
const db = require('../config/db');

exports.createReport = async (req, res, next) => {
  try {
    const report = await SafetyReport.create(req.body, req.user.id);
    await logAction(req, 'CREATE', 'safety_report', report.id, { title: report.title });
    res.status(201).json({ success: true, data: report });
  } catch (err) {
    next(err);
  }
};

exports.getAllReports = async (req, res, next) => {
  try {
    const reports = await SafetyReport.getAll();
    res.json({ success: true, data: reports });
  } catch (err) {
    next(err);
  }
};

exports.getReport = async (req, res, next) => {
  try {
    const report = await SafetyReport.findById(req.params.id);
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });
    res.json({ success: true, data: report });
  } catch (err) {
    next(err);
  }
};

exports.deleteReport = async (req, res, next) => {
  try {
    const report = await SafetyReport.delete(req.params.id);
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });
    await logAction(req, 'DELETE', 'safety_report', report.id);
    res.json({ success: true, message: 'Report deleted' });
  } catch (err) {
    next(err);
  }
};

exports.getPDF = async (req, res, next) => {
  try {
    const report = await SafetyReport.findById(req.params.id);
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Safety_Report_${report.id}.pdf"`);
    
    await generateSafetyPDF(report, res);
  } catch (err) {
    next(err);
  }
};

// ── RISK REGISTER CONTROLLERS ───────────────────────────────────────────────
exports.getAllRisks = async (req, res, next) => {
  try {
    const { category, status, search } = req.query;
    let sql = 'SELECT * FROM risk_register WHERE 1=1';
    const params = [];
    if (category && category !== 'All') {
      params.push(category);
      sql += ` AND category = $${params.length}`;
    }
    if (status && status !== 'All') {
      params.push(status);
      sql += ` AND status = $${params.length}`;
    }
    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      sql += ` AND (title LIKE $${params.length} OR owner LIKE $${params.length} OR risk_code LIKE $${params.length})`;
    }
    sql += ' ORDER BY created_at DESC';
    const { rows } = await db.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

exports.createRisk = async (req, res, next) => {
  try {
    const { title, category, likelihood, impact, owner, mitigation } = req.body;
    if (!title || !category || !owner) {
      return res.status(400).json({ success: false, message: 'Title, category, and owner are required.' });
    }
    const { rows: countRows } = await db.query('SELECT COUNT(*) as cnt FROM risk_register');
    const nextNum = (countRows[0]?.cnt || 0) + 1;
    const riskCode = `RSK-${String(nextNum).padStart(3, '0')}`;
    const dateStr = new Date().toISOString().split('T')[0];

    const { rows } = await db.query(
      `INSERT INTO risk_register (risk_code, title, category, likelihood, impact, status, owner, mitigation, date, created_by)
       VALUES ($1, $2, $3, $4, $5, 'Active', $6, $7, $8, $9)
       RETURNING *`,
      [riskCode, title.trim(), category, parseInt(likelihood) || 3, parseInt(impact) || 3, owner.trim(), mitigation?.trim() || '', dateStr, req.user?.id || null]
    );
    await logAction(req, 'CREATE', 'risk_register', rows[0]?.id, { risk_code: riskCode, title });
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};

exports.updateRiskStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, mitigation } = req.body;
    let sql = 'UPDATE risk_register SET updated_at = CURRENT_TIMESTAMP';
    const params = [];
    if (status) {
      params.push(status);
      sql += `, status = $${params.length}`;
    }
    if (mitigation !== undefined) {
      params.push(mitigation);
      sql += `, mitigation = $${params.length}`;
    }
    params.push(id);
    sql += ` WHERE id = $${params.length} RETURNING *`;

    const { rows } = await db.query(sql, params);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Risk record not found.' });
    }
    await logAction(req, 'UPDATE', 'risk_register', id, { status, mitigation });
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};

exports.deleteRisk = async (req, res, next) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM risk_register WHERE id = $1', [id]);
    await logAction(req, 'DELETE', 'risk_register', id);
    res.json({ success: true, message: 'Risk record deleted successfully.' });
  } catch (err) { next(err); }
};

// ── INFECTION CONTROL CONTROLLERS ───────────────────────────────────────────
exports.getInfectionStats = async (req, res, next) => {
  try {
    const currentMonthPrefix = new Date().toISOString().substring(0, 7);
    const { rows: casesMonth } = await db.query(
      `SELECT COUNT(*) as cnt FROM infection_cases WHERE date LIKE $1`,
      [`${currentMonthPrefix}%`]
    );

    const { rows: activeCases } = await db.query(
      `SELECT COUNT(*) as cnt FROM infection_cases WHERE status IN ('Active', 'Under Investigation')`
    );

    const { rows: hygieneAvg } = await db.query(
      `SELECT AVG(compliance_score) as avg_score FROM hygiene_audits`
    );

    const { rows: stFails } = await db.query(
      `SELECT COUNT(*) as cnt FROM hygiene_audits WHERE sterilization_passed = 0`
    );

    res.json({
      success: true,
      data: {
        haisThisMonth: Number(casesMonth[0]?.cnt || 0),
        activeOutbreaks: Number(activeCases[0]?.cnt || 0),
        handHygiene: Math.round(Number(hygieneAvg[0]?.avg_score || 94)),
        sterilizationFails: Number(stFails[0]?.cnt || 0)
      }
    });
  } catch (err) { next(err); }
};

exports.getInfectionCases = async (req, res, next) => {
  try {
    const { status, department, search } = req.query;
    let sql = 'SELECT * FROM infection_cases WHERE 1=1';
    const params = [];
    if (status && status !== 'All') {
      params.push(status);
      sql += ` AND status = $${params.length}`;
    }
    if (department && department !== 'All') {
      params.push(department);
      sql += ` AND department = $${params.length}`;
    }
    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      sql += ` AND (case_code LIKE $${params.length} OR infection_type LIKE $${params.length} OR department LIKE $${params.length} OR patient_identifier LIKE $${params.length})`;
    }
    sql += ' ORDER BY created_at DESC';
    const { rows } = await db.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

exports.createInfectionCase = async (req, res, next) => {
  try {
    const { infection_type, department, patient_identifier, severity, investigation_notes, corrective_actions, date } = req.body;
    if (!infection_type || !department) {
      return res.status(400).json({ success: false, message: 'Infection type and department are required.' });
    }
    const { rows: countRows } = await db.query('SELECT COUNT(*) as cnt FROM infection_cases');
    const nextNum = 1000 + (countRows[0]?.cnt || 0) + 1;
    const caseCode = `HAI-${nextNum}`;
    const dateStr = date || new Date().toISOString().split('T')[0];

    const { rows } = await db.query(
      `INSERT INTO infection_cases (case_code, infection_type, department, patient_identifier, date, severity, status, investigation_notes, corrective_actions, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, 'Under Investigation', $7, $8, $9)
       RETURNING *`,
      [caseCode, infection_type, department, patient_identifier || '', dateStr, severity || 'Medium', investigation_notes || '', corrective_actions || '', req.user?.id || null]
    );
    await logAction(req, 'CREATE', 'infection_case', rows[0]?.id, { case_code: caseCode, infection_type });
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};

exports.updateInfectionCaseStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, investigation_notes, corrective_actions } = req.body;
    let sql = 'UPDATE infection_cases SET updated_at = CURRENT_TIMESTAMP';
    const params = [];
    if (status) {
      params.push(status);
      sql += `, status = $${params.length}`;
    }
    if (investigation_notes !== undefined) {
      params.push(investigation_notes);
      sql += `, investigation_notes = $${params.length}`;
    }
    if (corrective_actions !== undefined) {
      params.push(corrective_actions);
      sql += `, corrective_actions = $${params.length}`;
    }
    params.push(id);
    sql += ` WHERE id = $${params.length} RETURNING *`;

    const { rows } = await db.query(sql, params);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Case not found.' });
    }
    await logAction(req, 'UPDATE', 'infection_case', id, { status });
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};

exports.getHygieneAudits = async (req, res, next) => {
  try {
    const { rows } = await db.query('SELECT * FROM hygiene_audits ORDER BY audit_date DESC, created_at DESC LIMIT 100');
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

exports.createHygieneAudit = async (req, res, next) => {
  try {
    const { department, compliance_score, total_opportunities, missed_opportunities, sterilization_passed, observations, corrective_actions, audit_date } = req.body;
    if (!department || compliance_score === undefined) {
      return res.status(400).json({ success: false, message: 'Department and compliance score are required.' });
    }
    const { rows: countRows } = await db.query('SELECT COUNT(*) as cnt FROM hygiene_audits');
    const nextNum = (countRows[0]?.cnt || 0) + 1;
    const auditCode = `AUD-H-${String(nextNum).padStart(3, '0')}`;
    const dateStr = audit_date || new Date().toISOString().split('T')[0];
    const auditor = req.user?.full_name || 'HSFP Auditor';

    const { rows } = await db.query(
      `INSERT INTO hygiene_audits (audit_code, department, auditor_name, compliance_score, total_opportunities, missed_opportunities, sterilization_passed, observations, corrective_actions, audit_date, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [auditCode, department, auditor, parseFloat(compliance_score), parseInt(total_opportunities) || 0, parseInt(missed_opportunities) || 0, sterilization_passed ? 1 : 0, observations || '', corrective_actions || '', dateStr, req.user?.id || null]
    );
    await logAction(req, 'CREATE', 'hygiene_audit', rows[0]?.id, { audit_code: auditCode, department, score: compliance_score });
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};

