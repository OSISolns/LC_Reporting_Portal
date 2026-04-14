'use strict';
const express = require('express');
const router = express.Router();
const cancellationController = require('../controllers/cancellationController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { validate, body, param, query } = require('../middleware/validation');

router.use(authenticate);

router.post(
  '/',
  authorize(['cashier', 'customer_care']),
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
  validate([
    query('status').optional().isString(),
    query('pid').optional().isString(),
    query('patientName').optional().isString(),
  ]),
  cancellationController.getAllRequests
);

// Export routes
router.get('/export/excel', validate([]), cancellationController.exportExcel);
router.get('/:id/pdf', validate([param('id').isInt().withMessage('Invalid request ID')]), cancellationController.getPDF);

router.get('/:id', validate([param('id').isInt().withMessage('Invalid request ID')]), cancellationController.getRequestById);
router.patch('/:id/verify', authorize(['sales_manager']), validate([param('id').isInt().withMessage('Invalid request ID')]), cancellationController.verifyRequest);
router.patch('/:id/approve', authorize(['coo']), validate([param('id').isInt().withMessage('Invalid request ID')]), cancellationController.approveRequest);
router.patch('/:id/reject', authorize(['coo', 'sales_manager']), validate([
  param('id').isInt().withMessage('Invalid request ID'),
  body('comment').trim().notEmpty().withMessage('Rejection comment is required'),
]), cancellationController.rejectRequest);
router.delete('/:id', authorize(['cashier', 'customer_care']), validate([param('id').isInt().withMessage('Invalid request ID')]), cancellationController.deleteRequest);

module.exports = router;
