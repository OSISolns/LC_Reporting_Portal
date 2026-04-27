'use strict';
const Refund = require('../models/refund');
const { logAction }  = require('../middleware/audit');
const { generateRefundPDF } = require('../utils/pdf');
const { exportToExcel } = require('../utils/excel');
const cache = require('../utils/cache');
const Notification = require('../models/notification');
const User = require('../models/user');


exports.createRequest = async (req, res, next) => {
  try {
    const request = await Refund.create(req.body, req.user.id);
    try { await logAction(req, 'CREATE', 'refund_request', request.id, { patient: request.patient_full_name }); } catch (e) {}
    
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
          title: 'New Refund Request',
          message: `A new refund request for ${request.patient_full_name} (${request.amount_to_be_refunded} RWF).`,
          type: 'info',
          link: `/refunds/${request.id}`
        });
      }
    } catch (e) {
      console.error('Notification error:', e);
    }

    cache.invalidatePattern('ref:list');
    cache.invalidate('ai:module_stats');
    res.status(201).json({ success: true, data: request });
  } catch (err) { next(err); }
};

exports.getAllRequests = async (req, res, next) => {
  try {
    const filters = { ...req.query };
    const privilegedRoles = ['sales_manager', 'coo', 'deputy_coo', 'admin', 'chairman', 'principal_cashier', 'operations_staff'];
    const isPrivileged = privilegedRoles.includes(req.user.role);
    if (!isPrivileged) {
      filters.created_by = req.user.id;
    }
    const cacheKey = `ref:list:${req.user.role}:${req.user.id}:${JSON.stringify(filters)}`;
    const data = await cache.getOrSet(cacheKey, () => Refund.getAll(filters), 15_000);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.getRequestById = async (req, res, next) => {
  try {
    const request = await Refund.findById(req.params.id);
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
    const request = await Refund.verify(req.params.id, req.user.id);
    if (!request) return res.status(400).json({ success: false, message: 'Request could not be verified' });
    await logAction(req, 'VERIFY', 'refund_request', request.id);
    
    // Notify Creator
    if (request.created_by) {
      await Notification.create({
        userId: request.created_by,
        title: 'Refund Verified',
        message: `Your refund request for ${request.patient_full_name} has been verified but still requires approval.`,
        type: 'success',
        link: `/refunds`
      });
    }

    res.json({ success: true, data: request });
  } catch (err) {
    next(err);
  }
};

exports.approveRequest = async (req, res, next) => {
  try {
    const request = await Refund.approve(req.params.id, req.user.id);
    if (!request) return res.status(400).json({ success: false, message: 'Request could not be approved' });
    await logAction(req, 'APPROVE', 'refund_request', request.id);
    
    // Notify Creator
    if (request.created_by) {
      await Notification.create({
        userId: request.created_by,
        title: 'Refund Approved',
        message: `Your refund request for ${request.patient_full_name} has been approved.`,
        type: 'success',
        link: `/refunds`
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
    const requestToCheck = await Refund.findById(req.params.id);
    if (!requestToCheck) return res.status(404).json({ success: false, message: 'Request not found' });
    if (req.user.role === 'coo' && requestToCheck.status === 'pending') {
      return res.status(403).json({ success: false, message: 'COO cannot reject a pending request before verification' });
    }

    const request = await Refund.reject(req.params.id, req.user.id, comment);
    if (!request) return res.status(400).json({ success: false, message: 'Request could not be rejected' });
    await logAction(req, 'REJECT', 'refund_request', request.id, { reason: comment });
    
    // Notify Creator
    if (request.created_by) {
      await Notification.create({
        userId: request.created_by,
        title: 'Refund Rejected',
        message: `Your refund request for ${request.patient_full_name} was rejected. Reason: ${comment}`,
        type: 'error',
        link: `/refunds`
      });
    }

    res.json({ success: true, data: request });
  } catch (err) {
    next(err);
  }
};

exports.deleteRequest = async (req, res, next) => {
  try {
    const request = await Refund.delete(req.params.id);
    if (!request) return res.status(400).json({ success: false, message: 'Request could not be deleted' });
    await logAction(req, 'DELETE', 'refund_request', req.params.id);
    res.json({ success: true, message: 'Request deleted successfully' });
  } catch (err) {
    next(err);
  }
};

exports.getPDF = async (req, res, next) => {
  try {
    const request = await Refund.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Refund_${request.pid_number}.pdf`);

    await generateRefundPDF(request, res);
  } catch (err) {
    next(err);
  }
};

exports.exportExcel = async (req, res, next) => {
  try {
    const requests = await Refund.getAll(req.query);

    const columns = [
      { header: 'ID',             key: 'id' },
      { header: 'Patient Name',   key: 'patient_full_name' },
      { header: 'PID',            key: 'pid_number' },
      { header: 'MOMO Code',      key: 'momo_code' },
      { header: 'Total Paid',     key: 'total_amount_paid' },
      { header: 'Refund Amount',  key: 'amount_to_be_refunded' },
      { header: 'Status',         key: 'status' },
      { header: 'Date',           key: 'created_at' },
    ];

    const workbook = await exportToExcel('Refund Requests', columns, requests);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=Refunds.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
};
