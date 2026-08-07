'use strict';
const express = require('express');
const router = express.Router();
const labController = require('../controllers/labController');
const { authMiddleware } = require('../middleware/auth');

// Protect all routes with JWT Auth
router.use(authMiddleware);

router.get('/orders', labController.listOrders);
router.post('/register', labController.registerSpecimen);
router.get('/orders/:id', labController.getOrderDetails);
router.put('/orders/:id/stage', labController.updateStage);
router.post('/orders/:id/results', labController.saveResults);
router.post('/orders/:id/verify', labController.verifyOrder);
router.post('/orders/:id/notify', labController.notifyPatient);

// Quality Control (IQC & Westgard) Routes
router.get('/qc-logs', labController.getQCLogs);
router.post('/qc-run', labController.recordQCRun);

module.exports = router;
