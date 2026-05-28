'use strict';
const express = require('express');
const router = express.Router();
const dailyReportController = require('../controllers/dailyReportController');
const { authMiddleware: authenticateToken } = require('../middleware/auth');
const authorizeRoles = require('../middleware/role');

router.use(authenticateToken);
router.use(authorizeRoles(['nurse', 'chef-nurse', 'admin', 'doctor', 'reviewer', 'coo', 'deputy_coo', 'chairman']));

router.get('/config', dailyReportController.getConfig);
router.get('/daily', dailyReportController.getByDate);
router.post('/daily', dailyReportController.saveDaily);
router.get('/monthly', dailyReportController.getMonthly);

module.exports = router;
