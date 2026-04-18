'use strict';
const Cancellation = require('../models/cancellation');
const { logAction }  = require('../middleware/audit');
const { generateCancellationPDF } = require('../utils/pdf');
const { exportToExcel } = require('../utils/excel');
const cache = require('../utils/cache');
const Notification = require('../models/notification');
const User = require('../models/user');


exports.createRequest = async (req, res, next) => {
  try {
    const request = await Cancellation.create(req.body, req.user.id);
    try { await logAction(req, 'CREATE', 'cancellation_request', request.id, { patient: request.patient_full_name }); } catch (e) {}
    
    // Notify Operations and Management
    try {
      const rolesToNotify = ['operations_staff', 'sales_manager', 'coo', 'deputy_coo', 'admin'];
      const usersToNotify = [];
      
      for (const role of rolesToNotify) {
        const users = await User.findByRole(role);
        usersToNotify.push(...users);
      }

      // Unique users only
      const uniqueUsers = Array.from(new Set(usersToNotify.map(u => u.id)))
        .map(id => usersToNotify.find(u => u.id === id));

      for (const user of uniqueUsers) {
        await Notification.create({
          userId: user.id,
          title: 'New Cancellation Request',
          message: `A new cancellation request has been submitted for ${request.patient_full_name}.`,
          type: 'info',
          link: `/cancellations/${request.id}`
        });
      }
    } catch (e) {
      console.error('Notification error:', e);
    }

    cache.invalidatePattern('canc:list'); // bust list cache
    cache.invalidate('ai:module_stats');  // bust stats cache
    res.status(201).json({ success: true, data: request });
  } catch (err) { next(err); }
};

exports.getAllRequests = async (req, res, next) => {
  try {
    const cacheKey = `canc:list:${req.user.role}:${JSON.stringify(req.query)}`;
    const data = await cache.getOrSet(cacheKey, () => Cancellation.getAll(req.query), 15_000);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.getRequestById = async (req, res, next) => {
  try {
    const request = await Cancellation.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    res.json({ success: true, data: request });
  } catch (err) {
    next(err);
  }
};

exports.verifyRequest = async (req, res, next) => {
  try {
    const request = await Cancellation.verify(req.params.id, req.user.id);
    if (!request) return res.status(400).json({ success: false, message: 'Request could not be verified' });
    await logAction(req, 'VERIFY', 'cancellation_request', request.id);
    
    // Notify Creator
    if (request.created_by) {
      await Notification.create({
        userId: request.created_by,
        title: 'Cancellation Verified',
        message: `Your cancellation request for ${request.patient_full_name} has been verified by Operations.`,
        type: 'success',
        link: `/cancellations`
      });
    }

    res.json({ success: true, data: request });
  } catch (err) {
    next(err);
  }
};

exports.approveRequest = async (req, res, next) => {
  try {
    const request = await Cancellation.approve(req.params.id, req.user.id);
    if (!request) return res.status(400).json({ success: false, message: 'Request could not be approved' });
    await logAction(req, 'APPROVE', 'cancellation_request', request.id);
    
    // Notify Creator
    if (request.created_by) {
      await Notification.create({
        userId: request.created_by,
        title: 'Cancellation Approved',
        message: `Your cancellation request for ${request.patient_full_name} has been approved.`,
        type: 'success',
        link: `/cancellations`
      });
    }

    res.json({ success: true, data: request });
  } catch (err) {
    next(err);
  }
};

exports.rejectRequest = async (req, res, next) => {
  try {
    const { comment } = req.body;
    const request = await Cancellation.reject(req.params.id, req.user.id, comment);
    if (!request) return res.status(400).json({ success: false, message: 'Request could not be rejected' });
    await logAction(req, 'REJECT', 'cancellation_request', request.id, { reason: comment });
    
    // Notify Creator
    if (request.created_by) {
      await Notification.create({
        userId: request.created_by,
        title: 'Cancellation Rejected',
        message: `Your cancellation request for ${request.patient_full_name} was rejected. Reason: ${comment}`,
        type: 'error',
        link: `/cancellations`
      });
    }

    res.json({ success: true, data: request });
  } catch (err) {
    next(err);
  }
};

exports.deleteRequest = async (req, res, next) => {
  try {
    const request = await Cancellation.delete(req.params.id);
    if (!request) return res.status(400).json({ success: false, message: 'Request could not be deleted' });
    await logAction(req, 'DELETE', 'cancellation_request', req.params.id);
    res.json({ success: true, message: 'Request deleted successfully' });
  } catch (err) {
    next(err);
  }
};

exports.getPDF = async (req, res, next) => {
  try {
    const request = await Cancellation.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Cancellation_${request.pid_number}.pdf`);
    
    await generateCancellationPDF(request, res);
  } catch (err) {
    next(err);
  }
};

exports.exportExcel = async (req, res, next) => {
  try {
    const requests = await Cancellation.getAll(req.query);
    
    const columns = [
      { header: 'ID', key: 'id' },
      { header: 'Patient Name', key: 'patient_full_name' },
      { header: 'PID', key: 'pid_number' },
      { header: 'Amount', key: 'total_amount_cancelled' },
      { header: 'Status', key: 'status' },
      { header: 'Date', key: 'created_at' }
    ];

    const workbook = await exportToExcel('Cancellation Requests', columns, requests);
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=Cancellations.xlsx');
    
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
};
