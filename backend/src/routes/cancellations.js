'use strict';
const express = require('express');
const router = express.Router();
const cancellationController = require('../controllers/cancellationController');
const { authMiddleware } = require('../middleware/auth');
const checkPermission = require('../middleware/permission');
const { validate, body, param, query } = require('../middleware/validation');

router.use(authMiddleware);
router.post(
  '/',
  checkPermission('cancellations', 'create'),
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
  checkPermission('cancellations', 'view'),
  validate([
    query('status').optional().isString(),
    query('pid').optional().isString(),
    query('patientName').optional().isString(),
  ]),
  cancellationController.getAllRequests
);

// Export routes
router.get('/export/excel', checkPermission('reports', 'download'), validate([]), cancellationController.exportExcel);
router.get('/:id/pdf', checkPermission('cancellations', 'view'), validate([param('id').isInt().withMessage('Invalid request ID')]), cancellationController.getPDF);

router.get('/:id', checkPermission('cancellations', 'view'), validate([param('id').isInt().withMessage('Invalid request ID')]), cancellationController.getRequestById);
router.patch('/:id/verify', checkPermission('cancellations', 'review'), validate([param('id').isInt().withMessage('Invalid request ID')]), cancellationController.verifyRequest);
router.patch('/:id/approve', checkPermission('cancellations', 'approve'), validate([param('id').isInt().withMessage('Invalid request ID')]), cancellationController.approveRequest);
router.patch('/:id/reject', checkPermission('cancellations', 'reject'), validate([
  param('id').isInt().withMessage('Invalid request ID'),
  body('comment').trim().notEmpty().withMessage('Rejection comment is required'),
]), cancellationController.rejectRequest);
router.delete('/:id', checkPermission('cancellations', 'edit'), validate([param('id').isInt().withMessage('Invalid request ID')]), cancellationController.deleteRequest);

module.exports = router;
