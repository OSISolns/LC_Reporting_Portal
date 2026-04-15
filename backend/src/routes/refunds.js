'use strict';
const express = require('express');
const router  = express.Router();
const refundController = require('../controllers/refundController');
const { authMiddleware } = require('../middleware/auth');
const authorizeRoles    = require('../middleware/role');
const { validate, body, param, query } = require('../middleware/validation');

router.use(authMiddleware);

// ── Create (Cashiers only) ───────────────────────────────────────────────────
router.post(
  '/',
  authorizeRoles(['cashier', 'principal_cashier', 'customer_care']),
  validate([
    body('patientFullName').trim().notEmpty().withMessage('Patient name is required'),
    body('pidNumber').trim().notEmpty().withMessage('PID number is required'),
    body('amountToBeRefunded').notEmpty().withMessage('Refund amount is required'),
    body('reasonForRefund').trim().notEmpty().withMessage('Reason for refund is required'),
  ]),
  refundController.createRequest
);

// ── List (all roles) ─────────────────────────────────────────────────────────
router.get(
  '/',
  authorizeRoles(['cashier', 'principal_cashier', 'customer_care', 'operations_staff', 'sales_manager', 'coo', 'chairman', 'admin', 'deputy_coo']),
  validate([
    query('status').optional().isString(),
    query('pid').optional().isString(),
    query('patientName').optional().isString(),
  ]),
  refundController.getAllRequests
);

// ── Export routes ────────────────────────────────────────────────────────────
router.get(
  '/export/excel',
  authorizeRoles(['coo', 'chairman', 'admin', 'deputy_coo', 'sales_manager']),
  validate([]),
  refundController.exportExcel
);

router.get(
  '/:id/pdf',
  authorizeRoles(['cashier', 'principal_cashier', 'customer_care', 'operations_staff', 'sales_manager', 'coo', 'chairman', 'admin', 'deputy_coo']),
  validate([param('id').isInt().withMessage('Invalid request ID')]),
  refundController.getPDF
);

// ── Single record ────────────────────────────────────────────────────────────
router.get(
  '/:id',
  authorizeRoles(['cashier', 'principal_cashier', 'customer_care', 'operations_staff', 'sales_manager', 'coo', 'chairman', 'admin', 'deputy_coo']),
  validate([param('id').isInt().withMessage('Invalid request ID')]),
  refundController.getRequestById
);

// ── Workflow (same RBAC as cancellations) ────────────────────────────────────
router.patch(
  '/:id/verify',
  authorizeRoles(['sales_manager']),
  validate([param('id').isInt().withMessage('Invalid request ID')]),
  refundController.verifyRequest
);

router.patch(
  '/:id/approve',
  authorizeRoles(['coo']),
  validate([param('id').isInt().withMessage('Invalid request ID')]),
  refundController.approveRequest
);

router.patch(
  '/:id/reject',
  authorizeRoles(['coo', 'sales_manager']),
  validate([
    param('id').isInt().withMessage('Invalid request ID'),
    body('comment').trim().notEmpty().withMessage('Rejection comment is required'),
  ]),
  refundController.rejectRequest
);

router.delete(
  '/:id',
  authorizeRoles(['cashier', 'principal_cashier', 'customer_care', 'admin']),
  validate([param('id').isInt().withMessage('Invalid request ID')]),
  refundController.deleteRequest
);

module.exports = router;
