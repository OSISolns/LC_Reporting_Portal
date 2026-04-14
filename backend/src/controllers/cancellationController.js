'use strict';
const Cancellation = require('../models/cancellation');
const { logAction } = require('../middleware/audit');
const { generateCancellationPDF } = require('../utils/pdf');
const { exportToExcel } = require('../utils/excel');

exports.createRequest = async (req, res, next) => {
  try {
    const request = await Cancellation.create(req.body, req.user.id);
    try {
      await logAction(req, 'CREATE', 'cancellation_request', request.id, { patient: request.patient_full_name });
    } catch (e) {
      console.warn('⚠️ Could not log cancellation action: DB down.');
    }
    res.status(201).json({ success: true, data: request });
  } catch (err) {
    next(err);
  }
};

exports.getAllRequests = async (req, res, next) => {
  try {
    const requests = await Cancellation.getAll(req.query);
    res.json({ success: true, data: requests });
  } catch (err) {
    next(err);
  }
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
