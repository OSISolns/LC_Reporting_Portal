'use strict';
const express = require('express');
const router = express.Router();
const compliance = require('../controllers/complianceController');
const { authMiddleware } = require('../middleware/auth');
const checkPermission = require('../middleware/permission');

// All compliance routes require authentication and proper permissions
router.use(authMiddleware);

// --- Audits & Readiness ---
router.get('/audits', checkPermission('compliance', 'view'), compliance.getAudits);
router.put('/audits/:id', checkPermission('compliance', 'edit'), compliance.updateAuditReadiness);

// --- Staff Licenses ---
router.get('/licenses', checkPermission('compliance', 'view'), compliance.getLicenses);
router.post('/licenses', checkPermission('compliance', 'create'), compliance.createLicense);
router.put('/licenses/:id', checkPermission('compliance', 'edit'), compliance.updateLicense);
router.delete('/licenses/:id', checkPermission('compliance', 'delete'), compliance.deleteLicense);

// --- Facility Certs ---
router.get('/facility-certs', checkPermission('compliance', 'view'), compliance.getFacilityCerts);
router.post('/facility-certs', checkPermission('compliance', 'create'), compliance.createFacilityCert);
router.put('/facility-certs/:id', checkPermission('compliance', 'edit'), compliance.updateFacilityCert);
router.delete('/facility-certs/:id', checkPermission('compliance', 'delete'), compliance.deleteFacilityCert);

module.exports = router;
