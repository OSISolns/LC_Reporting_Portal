'use strict';
const Incident = require('../models/incident');
const { logAction }  = require('../middleware/audit');
const { generateIncidentPDF } = require('../utils/pdf');
const { exportToExcel } = require('../utils/excel');
const cache = require('../utils/cache');

exports.createReport = async (req, res, next) => {
  try {
    const report = await Incident.create({ ...req.body, isReviewer: req.user.role === 'reviewer' }, req.user.id);
    try { await logAction(req, 'CREATE', 'incident_report', report.id, { type: report.incident_type }); } catch (e) {}
    
    // Notify Admins, Supervisors, and IT/QA Team
    try {
      const User = require('../models/user');
      const Notification = require('../models/notification');
      
      const rolesToNotify = ['admin', 'it_officer', 'coo', 'deputy_coo', 'sales_manager', 'principal_cashier', 'hsfp'];
      for (const role of rolesToNotify) {
        const users = await User.findByRole(role);
        for (const user of users) {
          if (user.id === req.user.id) continue; // Don't notify self
          await Notification.create({
            userId: user.id,
            title: `New Incident Reported: ${report.incident_type}`,
            message: `A new incident has been reported by ${req.user.full_name} in ${report.department}.`,
            type: 'warning',
            link: `/incidents`
          });
        }
      }
    } catch (e) {
      console.warn('⚠️ Could not send incident notifications:', e.message);
    }

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

exports.approveReport = async (req, res, next) => {
  try {
    if (req.user.role !== 'hsfp') {
      return res.status(403).json({ success: false, message: 'Only the Health & Safety Focal Person can approve incident reports.' });
    }
    const { comments } = req.body;
    if (!comments || !comments.trim()) {
      return res.status(400).json({ success: false, message: 'HSFP safety assessment and comments are required before approving.' });
    }

    const report = await Incident.approve(req.params.id, req.user.id, req.body);
    if (!report) return res.status(404).json({ success: false, message: 'Report not found or not in pending status.' });

    // Notify management
    try {
      const User = require('../models/user');
      const Notification = require('../models/notification');
      const notifyRoles = ['admin', 'coo', 'deputy_coo'];
      for (const role of notifyRoles) {
        const users = await User.findByRole(role);
        for (const u of users) {
          await Notification.create({
            userId: u.id,
            title: `Incident #${report.id} Approved by HSFP`,
            message: `Report #${report.id} (${report.incident_type}) has been approved by the Health & Safety Focal Person.`,
            type: 'success',
            link: '/incidents'
          });
        }
      }
    } catch (e) {}

    await logAction(req, 'APPROVE', 'incident_report', report.id, { status: 'approved' });
    cache.invalidatePattern('inc:list');
    cache.invalidate('ai:module_stats');
    res.json({ success: true, data: report });
  } catch (err) { next(err); }
};

exports.getReportById = async (req, res, next) => {
  try {
    const report = await Incident.findById(req.params.id, req.user);
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });
    res.json({ success: true, data: report });
  } catch (err) {
    next(err);
  }
};

exports.getPDF = async (req, res, next) => {
  try {
    const report = await Incident.findById(req.params.id, req.user);
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Incident_${report.id}.pdf"`);
    
    await generateIncidentPDF(report, res);
  } catch (err) {
    next(err);
  }
};

exports.deleteReport = async (req, res, next) => {
  try {
    const existing = await Incident.findById(req.params.id, req.user);
    if (!existing) return res.status(404).json({ success: false, message: 'Report not found.' });
    if (existing.status !== 'pending') return res.status(400).json({ success: false, message: 'Only pending reports can be deleted.' });

    if (req.user.role !== 'admin' && Number(existing.created_by) !== Number(req.user.id)) {
      return res.status(403).json({ success: false, message: 'Access denied. You can only delete your own reports.' });
    }

    const report = await Incident.delete(req.params.id);
    if (!report) return res.status(400).json({ success: false, message: 'Report could not be deleted.' });
    await logAction(req, 'DELETE', 'incident_report', req.params.id);
    cache.invalidatePattern('incident:list');
    res.json({ success: true, message: 'Report deleted successfully.' });
  } catch (err) { next(err); }
};

exports.exportExcel = async (req, res, next) => {
  try {
    const reports = await Incident.getAll(req.query, req.user);
    
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
    res.setHeader('Content-Disposition', 'attachment; filename="Incidents.xlsx"');
    
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
};
