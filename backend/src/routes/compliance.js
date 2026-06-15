'use strict';
const express = require('express');
const router = express.Router();
const compliance = require('../controllers/complianceController');
const { authMiddleware } = require('../middleware/auth');
const authorizeRoles = require('../middleware/role');


// All compliance routes require authentication and proper roles
router.use(authMiddleware);
router.use(authorizeRoles(['admin', 'coo', 'hsfp', 'reviewer']));

// --- Audits & Readiness ---
router.get('/audits', compliance.getAudits);
router.put('/audits/:id', compliance.updateAuditReadiness);

// --- Staff Licenses ---
router.get('/licenses', compliance.getLicenses);
router.post('/licenses', compliance.createLicense);
router.put('/licenses/:id', compliance.updateLicense);
router.delete('/licenses/:id', compliance.deleteLicense);

// --- Facility Certs ---
router.get('/facility-certs', compliance.getFacilityCerts);
router.post('/facility-certs', compliance.createFacilityCert);
router.put('/facility-certs/:id', compliance.updateFacilityCert);
router.delete('/facility-certs/:id', compliance.deleteFacilityCert);

module.exports = router;
