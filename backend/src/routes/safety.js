'use strict';
const express = require('express');
const router = express.Router();
const safetyController = require('../controllers/safetyController');
const { authMiddleware } = require('../middleware/auth');
const authorizeRoles = require('../middleware/role');

router.use(authMiddleware);
router.use(authorizeRoles(['hsfp', 'admin', 'reviewer', 'coo', 'deputy_coo']));

router.post('/', safetyController.createReport);
router.get('/', safetyController.getAllReports);
router.get('/:id', safetyController.getReport);
router.get('/:id/pdf', safetyController.getPDF);
router.delete('/:id', safetyController.deleteReport);

module.exports = router;
