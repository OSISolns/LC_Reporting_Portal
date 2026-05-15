'use strict';
const express = require('express');
const router = express.Router();
const clinicalController = require('../controllers/clinicalController');
const { authMiddleware: authenticateToken } = require('../middleware/auth');

router.post('/observations/:patientId', authenticateToken, clinicalController.saveObservation);
router.get('/observations/recent', authenticateToken, clinicalController.getRecentObservations);
router.get('/observations/:patientId', authenticateToken, clinicalController.getObservation);
router.get('/observations/:patientId/pdf', authenticateToken, clinicalController.getPDF);

module.exports = router;
