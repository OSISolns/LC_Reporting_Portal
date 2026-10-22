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
    
    // Notify Operations and Management ONLY if submitted (not draft)
    if (request.status !== 'draft') {
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
    }

    cache.invalidatePattern('canc:list'); // bust list cache
    cache.invalidate('ai:module_stats');  // bust stats cache
    res.status(201).json({ success: true, data: request });
  } catch (err) { next(err); }
};

exports.updateRequest = async (req, res, next) => {
  try {
    const existing = await Cancellation.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Cancellation request not found' });
    }
    if (existing.status !== 'pending' && existing.status !== 'draft') {
      return res.status(400).json({ success: false, message: 'Only pending or draft cancellation requests can be edited.' });
    }
    const privilegedRoles = ['sales_manager', 'coo', 'deputy_coo', 'admin'];
    if (existing.created_by !== req.user.id && !privilegedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied: You can only edit your own pending requests.' });
    }
    const updated = await Cancellation.update(req.params.id, req.body);
    try { await logAction(req, 'UPDATE', 'cancellation_request', updated.id, { patient: updated.patient_full_name }); } catch (e) {}
    cache.invalidatePattern('canc:list');
    cache.invalidate('ai:module_stats');
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
};

exports.getAllRequests = async (req, res, next) => {
  try {
    const filters = { ...req.query };
    const privilegedRoles = ['sales_manager', 'coo', 'deputy_coo', 'admin', 'chairman', 'principal_cashier', 'operations_staff'];
    const isPrivileged = privilegedRoles.includes(req.user.role);
    if (!isPrivileged) {
      filters.created_by = req.user.id;
    } else {
      filters.user_id = req.user.id;
    }
    const cacheKey = `canc:list:${req.user.role}:${req.user.id}:${JSON.stringify(filters)}`;
    const data = await cache.getOrSet(cacheKey, () => Cancellation.getAll(filters), 15_000);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.getRequestById = async (req, res, next) => {
  try {
    const request = await Cancellation.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    
    const privilegedRoles = ['sales_manager', 'coo', 'deputy_coo', 'admin', 'chairman', 'principal_cashier', 'operations_staff'];
    const isPrivileged = privilegedRoles.includes(req.user.role);
    if (!isPrivileged && request.created_by !== req.user.id) {
       return res.status(403).json({ success: false, message: 'Access denied: You can only view your own requests.' });
    }

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

    cache.invalidatePattern('canc:list');
    cache.invalidate('ai:module_stats');
    res.json({ success: true, data: request });
  } catch (err) {
    next(err);
  }
};

exports.approveRequest = async (req, res, next) => {
  try {
    if (!['coo', 'deputy_coo'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied. Only COO and Deputy COO can approve cancellation requests.' });
    }

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

    cache.invalidatePattern('canc:list');
    cache.invalidate('ai:module_stats');
    res.json({ success: true, data: request });
  } catch (err) {
    next(err);
  }
};

exports.rejectRequest = async (req, res, next) => {
  try {
    const { comment } = req.body;
    const requestToCheck = await Cancellation.findById(req.params.id);
    if (!requestToCheck) return res.status(404).json({ success: false, message: 'Request not found' });
    if (req.user.role === 'coo' && requestToCheck.status === 'pending') {
      return res.status(403).json({ success: false, message: 'COO cannot reject a pending request before verification' });
    }

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

    cache.invalidatePattern('canc:list');
    cache.invalidate('ai:module_stats');
    res.json({ success: true, data: request });
  } catch (err) {
    next(err);
  }
};

exports.deleteRequest = async (req, res, next) => {
  try {
    const existing = await Cancellation.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Request not found' });
    if (existing.status !== 'pending') return res.status(400).json({ success: false, message: 'Only pending requests can be deleted.' });

    if (req.user.role !== 'admin' && Number(existing.created_by) !== Number(req.user.id)) {
      return res.status(403).json({ success: false, message: 'Access denied. You can only delete your own requests.' });
    }

    const request = await Cancellation.delete(req.params.id);
    if (!request) return res.status(400).json({ success: false, message: 'Request could not be deleted' });
    await logAction(req, 'DELETE', 'cancellation_request', req.params.id);
    cache.invalidatePattern('canc:list');
    cache.invalidate('ai:module_stats');
    res.json({ success: true, message: 'Request deleted successfully' });
  } catch (err) { next(err); }
};

exports.getPDF = async (req, res, next) => {
  try {
    const request = await Cancellation.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Cancellation_${request.pid_number}.pdf"`);
    
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
    res.setHeader('Content-Disposition', 'attachment; filename="Cancellations.xlsx"');
    
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
};

exports.uploadDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { fileBase64, fileName } = req.body;

    const allowedRoles = ['sales_manager', 'principal_cashier', 'admin'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied. Only Sales Managers and Principal Cashiers can upload supporting documents.' });
    }

    const existing = await Cancellation.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Cancellation request not found.' });
    }

    if (existing.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Supporting documents can only be attached when the request is in pending status.' });
    }

    if (!fileBase64 || !fileName) {
      return res.status(400).json({ success: false, message: 'File data and file name are required.' });
    }

    if (!fileName.toLowerCase().endsWith('.pdf')) {
      return res.status(400).json({ success: false, message: 'Invalid file type. Only PDF documents (.pdf) are allowed.' });
    }

    const cleanBase64 = fileBase64.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');
    const magicHeader = buffer.slice(0, 4).toString('ascii');
    if (magicHeader !== '%PDF') {
      return res.status(400).json({ success: false, message: 'Invalid document content. File is not a valid PDF.' });
    }

    const result = await Cancellation.uploadSupportingDocument(id, fileBase64, fileName, req.user.id);
    await logAction(req, 'UPLOAD_DOCUMENT', 'cancellation_request', id, { fileName });

    cache.invalidatePattern('canc:list');
    res.json({ success: true, message: 'Supporting document uploaded successfully.', data: result });
  } catch (err) {
    next(err);
  }
};

exports.getDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const request = await Cancellation.findById(id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Cancellation request not found.' });
    }

    const doc = await Cancellation.getSupportingDocument(id);
    if (!doc || !doc.supporting_document_base64) {
      return res.status(404).json({ success: false, message: 'No supporting document found for this request.' });
    }

    if (req.query.download === 'true') {
      const cleanBase64 = doc.supporting_document_base64.replace(/^data:[^;]+;base64,/, '');
      const buffer = Buffer.from(cleanBase64, 'base64');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${doc.supporting_document_name || 'supporting_document.pdf'}"`);
      return res.send(buffer);
    }

    res.json({ success: true, data: doc });
  } catch (err) {
    next(err);
  }
};

