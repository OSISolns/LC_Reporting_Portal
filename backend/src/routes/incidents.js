'use strict';
const express = require('express');
const router = express.Router();
const incidentController = require('../controllers/incidentController');
const { authMiddleware } = require('../middleware/auth');
const authorizeRoles = require('../middleware/role');
const { validate, body, param } = require('../middleware/validation');

router.use(authMiddleware);

router.post(
  '/',
  authorizeRoles(['operations_staff', 'customer_care', 'cashier', 'coo', 'chairman', 'admin', 'deputy_coo', 'quality_assurance', 'sales_manager', 'principal_cashier']),
  validate([
    body('incidentType').trim().notEmpty().withMessage('Incident type is required').isIn(['Patient', 'Staff', 'Equipment', 'Others']).withMessage('Invalid incident type'),
    body('department').trim().notEmpty().withMessage('Department is required'),
    body('areaOfIncident').trim().notEmpty().withMessage('Area of incident is required'),
    body('namesInvolved').trim().notEmpty().withMessage('Names involved are required'),
    body('description').trim().notEmpty().withMessage('Description is required'),
  ]),
  incidentController.createReport
);
router.get('/', authorizeRoles(['coo', 'chairman', 'admin', 'deputy_coo', 'quality_assurance', 'operations_staff', 'customer_care', 'cashier']), incidentController.getAllReports);

router.patch(
  '/:id/review',
  authorizeRoles(['quality_assurance']),
  validate([
    param('id').isInt().withMessage('Invalid report ID'),
    body('comments').optional().trim().isString()
  ]),
  incidentController.reviewReport
);

// Export routes
router.get('/export/excel', authorizeRoles(['coo', 'chairman', 'admin', 'deputy_coo', 'quality_assurance']), incidentController.exportExcel);
router.get('/:id/pdf', authorizeRoles(['coo', 'chairman', 'admin', 'deputy_coo', 'quality_assurance', 'operations_staff', 'customer_care', 'cashier']), validate([param('id').isInt().withMessage('Invalid report ID')]), incidentController.getPDF);

router.get('/:id', authorizeRoles(['coo', 'chairman', 'admin', 'deputy_coo', 'quality_assurance', 'operations_staff', 'customer_care', 'cashier']), validate([param('id').isInt().withMessage('Invalid report ID')]), incidentController.getReportById);

module.exports = router;
