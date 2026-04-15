'use strict';
const Incident = require('../models/incident');
const { logAction }  = require('../middleware/audit');
const { generateIncidentPDF } = require('../utils/pdf');
const { exportToExcel } = require('../utils/excel');
const cache = require('../utils/cache');

exports.createReport = async (req, res, next) => {
  try {
    const report = await Incident.create(req.body, req.user.id);
    try { await logAction(req, 'CREATE', 'incident_report', report.id, { type: report.incident_type }); } catch (e) {}
    cache.invalidatePattern('inc:list');
    cache.invalidate('ai:module_stats');
    res.status(201).json({ success: true, data: report });
  } catch (err) { next(err); }
};

exports.getAllReports = async (req, res, next) => {
  try {
    // Cache key includes user id so role-filtered results don't bleed across users
    const cacheKey = `inc:list:${req.user.id}:${JSON.stringify(req.query)}`;
    const data = await cache.getOrSet(cacheKey, () => Incident.getAll(req.query, req.user), 15_000);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.reviewReport = async (req, res, next) => {
  try {
    const { comments } = req.body;
    const report = await Incident.review(req.params.id, req.user.id, comments);
    
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });
    
    await logAction(req, 'REVIEW', 'incident_report', report.id, { status: 'reviewed' });
    res.json({ success: true, data: report });
  } catch (err) {
    next(err);
  }
};

exports.getReportById = async (req, res, next) => {
  try {
    const report = await Incident.findById(req.params.id);
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });
    res.json({ success: true, data: report });
  } catch (err) {
    next(err);
  }
};

exports.getPDF = async (req, res, next) => {
  try {
    const report = await Incident.findById(req.params.id);
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Incident_${report.id}.pdf`);
    
    await generateIncidentPDF(report, res);
  } catch (err) {
    next(err);
  }
};

exports.exportExcel = async (req, res, next) => {
  try {
    const reports = await Incident.getAll(req.query);
    
    const columns = [
      { header: 'ID', key: 'id' },
      { header: 'Type', key: 'incident_type' },
      { header: 'Department', key: 'department' },
      { header: 'Area', key: 'area_of_incident' },
      { header: 'Names', key: 'names_involved' },
      { header: 'Date', key: 'created_at' }
    ];

    const workbook = await exportToExcel('Incident Reports', columns, reports);
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=Incidents.xlsx');
    
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
};
