'use strict';
const express = require('express');
const router  = express.Router();
const refundController = require('../controllers/refundController');
const { authMiddleware } = require('../middleware/auth');
const checkPermission   = require('../middleware/permission');
const { validate, body, param, query } = require('../middleware/validation');

router.use(authMiddleware);

// ── Create ───────────────────────────────────────────────────
router.post(
  '/',
  checkPermission('refunds', 'create'),
  validate([
    body('patientFullName').trim().notEmpty().withMessage('Patient name is required'),
    body('pidNumber').trim().notEmpty().withMessage('PID number is required'),
    body('amountToBeRefunded').notEmpty().withMessage('Refund amount is required'),
    body('reasonForRefund').trim().notEmpty().withMessage('Reason for refund is required'),
  ]),
  refundController.createRequest
);

// ── List ─────────────────────────────────────────────────────────
router.get(
  '/',
  checkPermission('refunds', 'view'),
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
  checkPermission('reports', 'download'),
  validate([]),
  refundController.exportExcel
);

router.get(
  '/:id/pdf',
  checkPermission('refunds', 'view'),
  validate([param('id').isInt().withMessage('Invalid request ID')]),
  refundController.getPDF
);

// ── Single record ────────────────────────────────────────────────────────────
router.get(
  '/:id',
  checkPermission('refunds', 'view'),
  validate([param('id').isInt().withMessage('Invalid request ID')]),
  refundController.getRequestById
);

// ── Workflow ────────────────────────────────────
router.patch(
  '/:id/verify',
  checkPermission('refunds', 'review'),
  validate([param('id').isInt().withMessage('Invalid request ID')]),
  refundController.verifyRequest
);

router.patch(
  '/:id/approve',
  checkPermission('refunds', 'approve'),
  validate([param('id').isInt().withMessage('Invalid request ID')]),
  refundController.approveRequest
);

router.patch(
  '/:id/reject',
  checkPermission('refunds', 'reject'),
  validate([
    param('id').isInt().withMessage('Invalid request ID'),
    body('comment').trim().notEmpty().withMessage('Rejection comment is required'),
  ]),
  refundController.rejectRequest
);

router.delete(
  '/:id',
  checkPermission('refunds', 'edit'),
  validate([param('id').isInt().withMessage('Invalid request ID')]),
  refundController.deleteRequest
);

module.exports = router;
