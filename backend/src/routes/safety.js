'use strict';
const express = require('express');
const router = express.Router();
const safetyController = require('../controllers/safetyController');
const { authMiddleware } = require('../middleware/auth');
const checkPermission = require('../middleware/permission');

router.use(authMiddleware);

router.post('/', checkPermission('safety', 'create'), safetyController.createReport);
router.get('/', checkPermission('safety', 'view'), safetyController.getAllReports);

// --- Risk Register Routes ---
router.get('/risks', checkPermission('safety', 'view'), safetyController.getAllRisks);
router.post('/risks', checkPermission('safety', 'create'), safetyController.createRisk);
router.patch('/risks/:id/status', checkPermission('safety', 'edit'), safetyController.updateRiskStatus);
router.delete('/risks/:id', checkPermission('safety', 'delete'), safetyController.deleteRisk);

// --- Infection Control & Hygiene Audit Routes ---
router.get('/infection-control/stats', checkPermission('safety', 'view'), safetyController.getInfectionStats);
router.get('/infection-control/cases', checkPermission('safety', 'view'), safetyController.getInfectionCases);
router.post('/infection-control/cases', checkPermission('safety', 'create'), safetyController.createInfectionCase);
router.patch('/infection-control/cases/:id/status', checkPermission('safety', 'edit'), safetyController.updateInfectionCaseStatus);
router.get('/infection-control/audits', checkPermission('safety', 'view'), safetyController.getHygieneAudits);
router.post('/infection-control/audits', checkPermission('safety', 'create'), safetyController.createHygieneAudit);

router.get('/:id', checkPermission('safety', 'view'), safetyController.getReport);
router.get('/:id/pdf', checkPermission('safety', 'view'), safetyController.getPDF);
router.delete('/:id', checkPermission('safety', 'delete'), safetyController.deleteReport);

module.exports = router;
