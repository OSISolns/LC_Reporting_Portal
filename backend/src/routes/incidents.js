'use strict';
const express = require('express');
const router = express.Router();
const incidentController = require('../controllers/incidentController');
const { authMiddleware } = require('../middleware/auth');
const checkPermission = require('../middleware/permission');
const { validate, body, param } = require('../middleware/validation');

router.use(authMiddleware);

// Everyone can create their incident report
router.post(
  '/',
  validate([
    body('incidentType').trim().notEmpty().withMessage('Incident type is required').isIn(['Patient', 'Staff', 'Equipment', 'Others']).withMessage('Invalid incident type'),
    body('department').trim().notEmpty().withMessage('Department is required'),
    body('areaOfIncident').trim().notEmpty().withMessage('Area of incident is required'),
    body('namesInvolved').trim().notEmpty().withMessage('Names involved are required'),
    body('description').trim().notEmpty().withMessage('Description is required'),
  ]),
  incidentController.createReport
);

// Scoped listing: HSFP views all; elevated users view their departments; others view their own
router.get('/', incidentController.getAllReports);

// Export routes (scoped to authorized reports)
router.get('/export/excel', incidentController.exportExcel);
router.get('/:id/pdf', validate([param('id').isInt().withMessage('Invalid report ID')]), incidentController.getPDF);

// HSFP Review & Approval
router.patch(
  '/:id/approve',
  checkPermission('incident_reports', 'approve'),
  validate([
    param('id').isInt().withMessage('Invalid report ID'),
    body('comments').trim().notEmpty().withMessage('HSFP comments are required for approval'),
  ]),
  incidentController.approveReport
);

router.get('/:id', validate([param('id').isInt().withMessage('Invalid report ID')]), incidentController.getReportById);
router.delete('/:id', validate([param('id').isInt().withMessage('Invalid report ID')]), incidentController.deleteReport);

module.exports = router;
