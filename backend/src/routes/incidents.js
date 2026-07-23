'use strict';
const express = require('express');
const router = express.Router();
const incidentController = require('../controllers/incidentController');
const { authMiddleware } = require('../middleware/auth');
const checkPermission = require('../middleware/permission');
const { validate, body, param } = require('../middleware/validation');

router.use(authMiddleware);

router.post(
  '/',
  checkPermission('incident_reports', 'create'),
  validate([
    body('incidentType').trim().notEmpty().withMessage('Incident type is required').isIn(['Patient', 'Staff', 'Equipment', 'Others']).withMessage('Invalid incident type'),
    body('department').trim().notEmpty().withMessage('Department is required'),
    body('areaOfIncident').trim().notEmpty().withMessage('Area of incident is required'),
    body('namesInvolved').trim().notEmpty().withMessage('Names involved are required'),
    body('description').trim().notEmpty().withMessage('Description is required'),
  ]),
  incidentController.createReport
);

router.get(
  '/', 
  (req, res, next) => next(), 
  incidentController.getAllReports
);

// Export routes
router.get('/export/excel', checkPermission('reports', 'download'), incidentController.exportExcel);
router.get('/:id/pdf', checkPermission('incident_reports', 'view'), validate([param('id').isInt().withMessage('Invalid report ID')]), incidentController.getPDF);

router.patch(
  '/:id/approve',
  checkPermission('incident_reports', 'approve'),
  validate([
    param('id').isInt().withMessage('Invalid report ID'),
    body('comments').trim().notEmpty().withMessage('HSFP comments are required for approval'),
  ]),
  incidentController.approveReport
);

router.get('/:id', checkPermission('incident_reports', 'view'), validate([param('id').isInt().withMessage('Invalid report ID')]), incidentController.getReportById);
router.delete('/:id', checkPermission('incident_reports', 'delete'), validate([param('id').isInt().withMessage('Invalid report ID')]), incidentController.deleteReport);

module.exports = router;
