'use strict';
const ResultTransfer = require('../models/resultTransfer');
const { logAction } = require('../middleware/audit');
const { generateResultTransferPDF } = require('../utils/pdf');
const cache = require('../utils/cache');
const Notification = require('../models/notification');
const User = require('../models/user');


const IMAGING_ROLES = ['imaging_tech', 'imaging_manager', 'sono', 'radiologist'];
const LAB_ROLES = [
  'lab_hod', 'lab_manager', 'quality_manager', 'qm',
  'lab_team_lead', 'lab_lead', 'lab_tech', 'lab',
  'lab_head', 'lab_supervisor', 'lab_safety_officer', 'lab_stock_officer',
  'head_microbiology', 'head_hematology', 'head_histopathology',
  'head_poct', 'head_phlebotomy', 'head_molecular_biology',
  'lab_micro_specialist', 'lab_scientist'
];

function getUserDepartmentScope(userRole) {
  if (IMAGING_ROLES.includes(userRole)) return 'Imaging';
  if (LAB_ROLES.includes(userRole)) return 'Laboratory';
  return null; // Cross-department / administrative (admin, coo, deputy_coo, operations_staff, etc.)
}

function checkDepartmentAccess(userRole, itemDepartment) {
  const scope = getUserDepartmentScope(userRole);
  if (!scope) return true; // Admins, COO, Operations can access all
  const itemDept = itemDepartment || 'Laboratory';
  return scope.toLowerCase() === itemDept.toLowerCase();
}

exports.createRequest = async (req, res, next) => {
  try {
    const deptScope = getUserDepartmentScope(req.user.role);
    if (deptScope) {
      req.body.department = deptScope; // Strictly enforce user's department
    } else if (!req.body.department) {
      req.body.department = 'Laboratory';
    }

    const request = await ResultTransfer.create(req.body, req.user.id);
    if (request) {
      try { 
        await logAction(req, 'CREATE', 'result_transfer', request.id, { 
          old_sid: request.old_sid, 
          new_sid: request.new_sid,
          department: request.department
        }); 
        
        // Notify respective department management ONLY if submitted (not draft)
        if (request.status !== 'draft') {
          const rolesToNotify = request.department === 'Imaging'
            ? ['imaging_manager', 'sales_manager', 'coo', 'deputy_coo', 'admin']
            : ['lab_team_lead', 'lab_lead', 'lab_manager', 'sales_manager', 'coo', 'deputy_coo', 'admin'];
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
              title: `New Result Transfer Request (${request.department || 'Laboratory'})`,
              message: `A new ${request.department || 'Laboratory'} result transfer requisition has been submitted (Old SID: ${request.old_sid}).`,
              type: 'info',
              link: `/results-transfer`
            });
          }
        }
      } catch (e) {}
    }

    cache.invalidatePattern('rt:list');
    res.status(201).json({ success: true, data: request });
  } catch (err) { next(err); }
};

exports.updateRequest = async (req, res, next) => {
  try {
    const existing = await ResultTransfer.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }
    if (!checkDepartmentAccess(req.user.role, existing.department)) {
      return res.status(403).json({ success: false, message: 'Access denied: You cannot edit transfers from another department.' });
    }
    if (existing.status !== 'pending' && existing.status !== 'draft') {
      return res.status(400).json({ success: false, message: 'Only pending or draft requests can be edited.' });
    }
    const privilegedRoles = [
      'lab_hod', 'lab_manager', 'quality_manager', 'qm',
      'lab_team_lead', 'lab_lead', 'head_microbiology', 'head_hematology',
      'head_histopathology', 'head_poct', 'head_phlebotomy', 'head_molecular_biology',
      'lab_micro_specialist', 'imaging_manager', 'sales_manager', 'coo', 'deputy_coo', 'admin'
    ];
    if (Number(existing.created_by) !== Number(req.user.id) && !privilegedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied: You can only edit your own pending or draft requests.' });
    }
    const deptScope = getUserDepartmentScope(req.user.role);
    if (deptScope) {
      req.body.department = deptScope;
    }
    const updated = await ResultTransfer.update(req.params.id, req.body);
    try { await logAction(req, 'UPDATE', 'result_transfer', updated.id); } catch (e) {}
    cache.invalidatePattern('rt:list');
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
};

exports.getAllRequests = async (req, res, next) => {
  try {
    const filters = { ...req.query };
    const deptScope = getUserDepartmentScope(req.user.role);
    if (deptScope) {
      // Hard enforce department isolation: Imaging users cannot see Lab, and Lab users cannot see Imaging!
      filters.department = deptScope;
    }

    const privilegedRoles = [
      'lab_hod', 'lab_manager', 'quality_manager', 'qm',
      'lab_team_lead', 'lab_lead', 'head_microbiology', 'head_hematology',
      'head_histopathology', 'head_poct', 'head_phlebotomy', 'head_molecular_biology',
      'lab_micro_specialist', 'lab_scientist', 'lab_safety_officer', 'lab_tech', 'lab',
      'imaging_manager', 'imaging_tech', 'sono', 'radiologist',
      'sales_manager', 'coo', 'deputy_coo', 'admin', 'chairman', 
      'principal_cashier', 'operations_staff', 'operations'
    ];
    const isPrivileged = privilegedRoles.includes(req.user.role);
    if (!isPrivileged) {
      filters.created_by = req.user.id;
    } else {
      filters.user_id = req.user.id;
    }
    const cacheKey = `rt:list:${req.user.role}:${req.user.id}:${JSON.stringify(filters)}`;
    const data = await cache.getOrSet(cacheKey, () => ResultTransfer.getAll(filters), 15_000);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.getRequestById = async (req, res, next) => {
  try {
    const request = await ResultTransfer.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    if (!checkDepartmentAccess(req.user.role, request.department)) {
      return res.status(403).json({ success: false, message: 'Access denied: You cannot view transfers from another department.' });
    }
    res.json({ success: true, data: request });
  } catch (err) { next(err); }
};

exports.reviewRequest = async (req, res, next) => {
  try {
    const existing = await ResultTransfer.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Request not found' });
    if (!checkDepartmentAccess(req.user.role, existing.department)) {
      return res.status(403).json({ success: false, message: 'Access denied: You cannot review transfers from another department.' });
    }
    if (existing.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Request is currently in '${existing.status}' status and cannot be reviewed.` });
    }

    const request = await ResultTransfer.review(req.params.id, req.user.id);
    if (!request) return res.status(400).json({ success: false, message: 'Request could not be reviewed' });
    await logAction(req, 'REVIEW', 'result_transfer', request.id);
    
    // Notify Creator
    if (request.created_by) {
      await Notification.create({
        userId: request.created_by,
        title: 'Result Transfer Reviewed',
        message: `Your result transfer request (Old SID: ${request.old_sid}) has been reviewed.`,
        type: 'success',
        link: `/results-transfer`
      });
    }

    cache.invalidatePattern('rt:list');
    res.json({ success: true, data: request });
  } catch (err) { next(err); }
};

exports.approveRequest = async (req, res, next) => {
  try {
    const { editedByName } = req.body;
    const existing = await ResultTransfer.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Request not found' });
    if (!checkDepartmentAccess(req.user.role, existing.department)) {
      return res.status(403).json({ success: false, message: 'Access denied: You cannot approve transfers from another department.' });
    }
    
    // Department role verification
    const isImaging = (existing.department || 'Laboratory').toLowerCase() === 'imaging';
    if (isImaging && LAB_ROLES.includes(req.user.role) && !['admin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Laboratory leads cannot approve Imaging result transfers.' });
    }
    if (!isImaging && IMAGING_ROLES.includes(req.user.role) && !['admin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Imaging staff cannot approve Laboratory result transfers.' });
    }

    if (existing.status !== 'reviewed') {
      return res.status(400).json({ success: false, message: `Request must be reviewed by Operations before approval. Current status: '${existing.status}'` });
    }

    const request = await ResultTransfer.approve(req.params.id, req.user.id, editedByName);
    if (!request) return res.status(400).json({ success: false, message: 'Request could not be approved' });
    await logAction(req, 'APPROVE', 'result_transfer', request.id);
    
    // Notify Creator
    if (request.created_by) {
      await Notification.create({
        userId: request.created_by,
        title: 'Result Transfer Approved',
        message: `Your result transfer request (Old SID: ${request.old_sid}) has been approved and finalized.`,
        type: 'success',
        link: `/results-transfer`
      });
    }

    cache.invalidatePattern('rt:list');
    res.json({ success: true, data: request });
  } catch (err) { next(err); }
};

exports.rejectRequest = async (req, res, next) => {
  try {
    const { comment } = req.body;
    const requestToCheck = await ResultTransfer.findById(req.params.id);
    if (!requestToCheck) return res.status(404).json({ success: false, message: 'Request not found' });
    if (!checkDepartmentAccess(req.user.role, requestToCheck.department)) {
      return res.status(403).json({ success: false, message: 'Access denied: You cannot reject transfers from another department.' });
    }
    if (req.user.role === 'coo' && requestToCheck.status === 'pending') {
      return res.status(403).json({ success: false, message: 'COO cannot reject a pending request before review' });
    }

    const request = await ResultTransfer.reject(req.params.id, req.user.id, comment);
    if (!request) return res.status(400).json({ success: false, message: 'Request could not be rejected' });
    await logAction(req, 'REJECT', 'result_transfer', request.id, { reason: comment });
    
    // Notify Creator
    if (request.created_by) {
      await Notification.create({
        userId: request.created_by,
        title: 'Result Transfer Rejected',
        message: `Your result transfer request (Old SID: ${request.old_sid}) was rejected. Comment: ${comment}`,
        type: 'error',
        link: `/results-transfer`
      });
    }

    cache.invalidatePattern('rt:list');
    res.json({ success: true, data: request });
  } catch (err) { next(err); }
};

exports.deleteRequest = async (req, res, next) => {
  try {
    const existing = await ResultTransfer.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Request not found' });
    if (!checkDepartmentAccess(req.user.role, existing.department)) {
      return res.status(403).json({ success: false, message: 'Access denied: You cannot delete transfers from another department.' });
    }
    if (existing.status !== 'pending' && existing.status !== 'draft') {
      return res.status(400).json({ success: false, message: 'Only pending or draft requests can be deleted.' });
    }

    if (req.user.role !== 'admin' && Number(existing.created_by) !== Number(req.user.id)) {
      return res.status(403).json({ success: false, message: 'Access denied. You can only delete your own requests.' });
    }

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
    if (!checkDepartmentAccess(req.user.role, request.department)) {
      return res.status(403).json({ success: false, message: 'Access denied: You cannot export transfers from another department.' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="ResultTransfer_${request.old_sid}.pdf"`);

    await generateResultTransferPDF(request, res);
  } catch (err) { next(err); }
};
