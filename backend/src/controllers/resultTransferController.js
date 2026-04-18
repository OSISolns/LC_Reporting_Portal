'use strict';
const ResultTransfer = require('../models/resultTransfer');
const { logAction } = require('../middleware/audit');
const { generateResultTransferPDF } = require('../utils/pdf');
const cache = require('../utils/cache');

exports.createRequest = async (req, res, next) => {
  try {
    const request = await ResultTransfer.create(req.body, req.user.id);
    if (request) {
      try { 
        await logAction(req, 'CREATE', 'result_transfer', request.id, { 
          old_sid: request.old_sid, 
          new_sid: request.new_sid 
        }); 
      } catch (e) {}
    }
    cache.invalidatePattern('rt:list');
    res.status(201).json({ success: true, data: request });
  } catch (err) { next(err); }
};

exports.getAllRequests = async (req, res, next) => {
  try {
    const cacheKey = `rt:list:${req.user.role}:${JSON.stringify(req.query)}`;
    const data = await cache.getOrSet(cacheKey, () => ResultTransfer.getAll(req.query), 15_000);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.getRequestById = async (req, res, next) => {
  try {
    const request = await ResultTransfer.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    res.json({ success: true, data: request });
  } catch (err) { next(err); }
};

exports.reviewRequest = async (req, res, next) => {
  try {
    const request = await ResultTransfer.review(req.params.id, req.user.id);
    if (!request) return res.status(400).json({ success: false, message: 'Request could not be reviewed' });
    await logAction(req, 'REVIEW', 'result_transfer', request.id);
    cache.invalidatePattern('rt:list');
    res.json({ success: true, data: request });
  } catch (err) { next(err); }
};

exports.approveRequest = async (req, res, next) => {
  try {
    const { editedByName } = req.body;
    const request = await ResultTransfer.approve(req.params.id, req.user.id, editedByName);
    if (!request) return res.status(400).json({ success: false, message: 'Request could not be approved' });
    await logAction(req, 'APPROVE', 'result_transfer', request.id);
    cache.invalidatePattern('rt:list');
    res.json({ success: true, data: request });
  } catch (err) { next(err); }
};

exports.rejectRequest = async (req, res, next) => {
  try {
    const { comment } = req.body;
    const request = await ResultTransfer.reject(req.params.id, req.user.id, comment);
    if (!request) return res.status(400).json({ success: false, message: 'Request could not be rejected' });
    await logAction(req, 'REJECT', 'result_transfer', request.id, { reason: comment });
    cache.invalidatePattern('rt:list');
    res.json({ success: true, data: request });
  } catch (err) { next(err); }
};

exports.deleteRequest = async (req, res, next) => {
  try {
    const request = await ResultTransfer.delete(req.params.id);
    if (!request) return res.status(400).json({ success: false, message: 'Request could not be deleted' });
    await logAction(req, 'DELETE', 'result_transfer', req.params.id);
    cache.invalidatePattern('rt:list');
    res.json({ success: true, message: 'Request deleted successfully' });
  } catch (err) { next(err); }
};

exports.getPDF = async (req, res, next) => {
  try {
    const request = await ResultTransfer.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=ResultTransfer_${request.old_sid}.pdf`);

    await generateResultTransferPDF(request, res);
  } catch (err) { next(err); }
};
