'use strict';
const express = require('express');
const router = express.Router();
const clinicalController = require('../controllers/clinicalController');
const { authMiddleware: authenticateToken } = require('../middleware/auth');
const authorizeRoles = require('../middleware/role');

router.use(authenticateToken);
router.use(authorizeRoles(['nurse', 'admin', 'doctor', 'consultant', 'reviewer', 'chef-nurse']));

router.post('/observations/:patientId', clinicalController.saveObservation);
router.get('/observations',             clinicalController.getAllObservationsList);
router.get('/observations/recent',      clinicalController.getRecentObservations);
router.get('/observations/:patientId/all', clinicalController.getAllObservations);
router.get('/observations/:patientId/checksum', clinicalController.getDocChecksum);
router.get('/observations/:patientId/verify',   clinicalController.verifyDocument);
router.get('/observations/:patientId/pdf',      clinicalController.getPDF);
router.get('/observations/:patientId',          clinicalController.getObservation);

router.get('/inventory', authorizeRoles(['nurse', 'chef-nurse', 'admin', 'doctor', 'consultant']), clinicalController.getInventory);
router.get('/inventory/export', authorizeRoles(['nurse', 'chef-nurse', 'admin', 'doctor', 'consultant']), clinicalController.exportInventoryExcel);
router.get('/inventory/items', authorizeRoles(['nurse', 'chef-nurse', 'admin', 'doctor', 'consultant']), clinicalController.getInventoryItems);
router.post('/inventory/bulk', authorizeRoles(['nurse', 'chef-nurse', 'admin', 'doctor', 'consultant']), clinicalController.saveInventoryBulk);
router.post('/inventory/sync', authorizeRoles(['nurse', 'chef-nurse', 'admin', 'doctor', 'consultant']), clinicalController.triggerInventorySync);
router.get('/inventory/change-logs', authorizeRoles(['nurse', 'chef-nurse', 'admin', 'doctor', 'consultant', 'reviewer']), clinicalController.getInventoryChangeLogs);

module.exports = router;
