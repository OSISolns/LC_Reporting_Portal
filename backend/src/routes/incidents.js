'use strict';
const express = require('express');
const router = express.Router();
const incidentController = require('../controllers/incidentController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { validate, body, param } = require('../middleware/validation');

router.use(authenticate);

router.post(
  '/',
  authorize(['operations_staff', 'customer_care']),
  validate([
    body('incidentType').trim().notEmpty().withMessage('Incident type is required').isIn(['Patient', 'Staff', 'Equipment', 'Others']).withMessage('Invalid incident type'),
    body('department').trim().notEmpty().withMessage('Department is required'),
    body('areaOfIncident').trim().notEmpty().withMessage('Area of incident is required'),
    body('namesInvolved').trim().notEmpty().withMessage('Names involved are required'),
    body('description').trim().notEmpty().withMessage('Description is required'),
  ]),
  incidentController.createReport
);
router.get('/', authorize(['coo', 'chairman']), incidentController.getAllReports);

// Export routes
router.get('/export/excel', authorize(['coo', 'chairman']), incidentController.exportExcel);
router.get('/:id/pdf', authorize(['coo', 'chairman']), validate([param('id').isInt().withMessage('Invalid report ID')]), incidentController.getPDF);

router.get('/:id', authorize(['coo', 'chairman']), validate([param('id').isInt().withMessage('Invalid report ID')]), incidentController.getReportById);

module.exports = router;
