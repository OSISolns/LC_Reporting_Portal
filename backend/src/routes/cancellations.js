'use strict';
const express = require('express');
const router = express.Router();
const cancellationController = require('../controllers/cancellationController');
const { authMiddleware } = require('../middleware/auth');
const authorizeRoles = require('../middleware/role');
const { validate, body, param, query } = require('../middleware/validation');

router.use(authMiddleware);

router.post(
  '/',
  authorizeRoles(['cashier', 'principal_cashier', 'customer_care']),
  validate([
    body('patientFullName').trim().notEmpty().withMessage('Patient name is required'),
    body('pidNumber').trim().notEmpty().withMessage('PID number is required'),
    body('totalAmountCancelled').notEmpty().withMessage('Total amount is required'),
    body('reasonForCancellation').trim().notEmpty().withMessage('Reason for cancellation is required'),
  ]),
  cancellationController.createRequest
);
router.get(
  '/',
  authorizeRoles(['cashier', 'principal_cashier', 'customer_care', 'operations_staff', 'sales_manager', 'coo', 'chairman', 'admin', 'deputy_coo']),
  validate([
    query('status').optional().isString(),
    query('pid').optional().isString(),
    query('patientName').optional().isString(),
  ]),
  cancellationController.getAllRequests
);

// Export routes
router.get('/export/excel', authorizeRoles(['coo', 'chairman', 'admin', 'deputy_coo', 'sales_manager']), validate([]), cancellationController.exportExcel);
router.get('/:id/pdf', authorizeRoles(['cashier', 'principal_cashier', 'customer_care', 'operations_staff', 'sales_manager', 'coo', 'chairman', 'admin', 'deputy_coo']), validate([param('id').isInt().withMessage('Invalid request ID')]), cancellationController.getPDF);

router.get('/:id', authorizeRoles(['cashier', 'principal_cashier', 'customer_care', 'operations_staff', 'sales_manager', 'coo', 'chairman', 'admin', 'deputy_coo']), validate([param('id').isInt().withMessage('Invalid request ID')]), cancellationController.getRequestById);
router.patch('/:id/verify', authorizeRoles(['sales_manager']), validate([param('id').isInt().withMessage('Invalid request ID')]), cancellationController.verifyRequest);
router.patch('/:id/approve', authorizeRoles(['coo']), validate([param('id').isInt().withMessage('Invalid request ID')]), cancellationController.approveRequest);
router.patch('/:id/reject', authorizeRoles(['coo', 'sales_manager']), validate([
  param('id').isInt().withMessage('Invalid request ID'),
  body('comment').trim().notEmpty().withMessage('Rejection comment is required'),
]), cancellationController.rejectRequest);
router.delete('/:id', authorizeRoles(['cashier', 'principal_cashier', 'customer_care', 'admin']), validate([param('id').isInt().withMessage('Invalid request ID')]), cancellationController.deleteRequest);

module.exports = router;
