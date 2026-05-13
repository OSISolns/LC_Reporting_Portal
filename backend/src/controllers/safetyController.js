'use strict';
const SafetyReport = require('../models/SafetyReport');
const { logAction } = require('../middleware/audit');
const { generateSafetyPDF } = require('../utils/pdf');

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
    res.setHeader('Content-Disposition', `attachment; filename=Safety_Report_${report.id}.pdf`);
    
    await generateSafetyPDF(report, res);
  } catch (err) {
    next(err);
  }
};

