'use strict';
const express = require('express');
const router = express.Router();
const controller = require('../controllers/resultTransferController');
const { authMiddleware } = require('../middleware/auth');
const authorizeRoles = require('../middleware/role');
const { validate, body, param } = require('../middleware/validation');

router.use(authMiddleware);

// All routes require authentication (handled in app.js/router)

// GET all requests (restricted to clinical and management roles)
router.get('/', authorizeRoles('cashier', 'principal_cashier', 'customer_care', 'operations_staff', 'lab_team_lead', 'sales_manager', 'coo', 'chairman', 'admin', 'deputy_coo', 'consultant'), controller.getAllRequests);
 
// GET single request
router.get('/:id', authorizeRoles('cashier', 'principal_cashier', 'customer_care', 'operations_staff', 'lab_team_lead', 'sales_manager', 'coo', 'chairman', 'admin', 'deputy_coo', 'consultant'), controller.getRequestById);


// POST create request (Cashier/Customer Care only)
router.post(
  '/', 
  authorizeRoles('cashier', 'customer_care', 'admin'), 
  validate([
    body('transferDate').isDate().withMessage('Valid transfer date is required'),
    body('oldSid').trim().notEmpty().withMessage('Old SID number is required'),
    body('newSid').trim().notEmpty().withMessage('New SID number is required'),
    body('reason').trim().notEmpty().withMessage('Reason for transfer is required'),
  ]),
  controller.createRequest
);

// PUT verify request (Operations role + Principal Cashier & Deputy COO)
router.put('/:id/review', authorizeRoles('operations_staff', 'principal_cashier', 'deputy_coo', 'admin'), controller.reviewRequest);

// PUT approve request (Lab Team Lead role)
router.put('/:id/approve', authorizeRoles('lab_team_lead', 'admin'), controller.approveRequest);

// PUT reject request (Operations or Lab Lead)
router.put('/:id/reject', authorizeRoles('operations_staff', 'lab_team_lead', 'admin'), controller.rejectRequest);

// DELETE request
router.delete('/:id', authorizeRoles('admin'), controller.deleteRequest);

router.get('/:id/pdf', controller.getPDF);

module.exports = router;
