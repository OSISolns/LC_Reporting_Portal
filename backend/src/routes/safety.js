'use strict';
const express = require('express');
const router = express.Router();
const safetyController = require('../controllers/safetyController');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.post('/', safetyController.createReport);
router.get('/', safetyController.getAllReports);
router.get('/:id', safetyController.getReport);
router.get('/:id/pdf', safetyController.getPDF);
router.delete('/:id', safetyController.deleteReport);

module.exports = router;
