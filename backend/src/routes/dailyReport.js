'use strict';
const express = require('express');
const router = express.Router();
const dailyReportController = require('../controllers/dailyReportController');
const { authMiddleware: authenticateToken } = require('../middleware/auth');
const checkPermission = require('../middleware/permission');

router.use(authenticateToken);

router.get('/config', checkPermission('clinical_observation', 'view'), dailyReportController.getConfig);
router.get('/daily', checkPermission('clinical_observation', 'view'), dailyReportController.getByDate);
router.post('/daily', checkPermission('clinical_observation', 'create'), dailyReportController.saveDaily);
router.get('/monthly', checkPermission('clinical_observation', 'view'), dailyReportController.getMonthly);

module.exports = router;
