'use strict';
const express = require('express');
const router = express.Router();
const clinicalController = require('../controllers/clinicalController');
const { authMiddleware: authenticateToken } = require('../middleware/auth');
const authorizeRoles = require('../middleware/role');

router.use(authenticateToken);
router.use(authorizeRoles(['nurse', 'admin', 'doctor', 'consultant', 'reviewer', 'chef-nurse']));

router.post('/observations/:patientId', clinicalController.saveObservation);
router.get('/observations/recent', clinicalController.getRecentObservations);
router.get('/observations/:patientId', clinicalController.getObservation);
router.get('/observations/:patientId/pdf', clinicalController.getPDF);

module.exports = router;
