'use strict';
const express = require('express');
const router = express.Router();
const safetyController = require('../controllers/safetyController');
const { authMiddleware } = require('../middleware/auth');
const checkPermission = require('../middleware/permission');

router.use(authMiddleware);

router.post('/', checkPermission('safety', 'create'), safetyController.createReport);
router.get('/', checkPermission('safety', 'view'), safetyController.getAllReports);
router.get('/:id', checkPermission('safety', 'view'), safetyController.getReport);
router.get('/:id/pdf', checkPermission('safety', 'view'), safetyController.getPDF);
router.delete('/:id', checkPermission('safety', 'delete'), safetyController.deleteReport);

module.exports = router;
