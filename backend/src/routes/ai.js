'use strict';
const express = require('express');
const router  = express.Router();
const aiController        = require('../controllers/aiController');
const clinicalAIController = require('../controllers/clinicalAIController');
const { authMiddleware }  = require('../middleware/auth');
const authorizeRoles      = require('../middleware/role');

router.use(authMiddleware);

// Full management access (all modules + executive briefing)
const MGMT_ROLES = ['sales_manager','coo','chairman','admin','deputy_coo', 'consultant', 'reviewer'];

// Principal cashier can view stats + classify cancellations/refunds only
const STATS_ROLES = [...MGMT_ROLES, 'principal_cashier', 'consultant'];

// Clinical nursing roles
const CLINICAL_ROLES = ['nurse', 'chef-nurse', 'admin', 'doctor', 'consultant', 'reviewer'];

router.get('/stats',            authorizeRoles(STATS_ROLES),    aiController.getModuleStats);
router.get('/classify/:module', authorizeRoles(STATS_ROLES),    aiController.classifyReasons);
router.get('/executive',        authorizeRoles(MGMT_ROLES),     aiController.getExecutiveReport);

// ── Legacy medication suggest (kept for backward compat) ─────────────────────
router.post('/medications/suggest', authorizeRoles(CLINICAL_ROLES), aiController.suggestMedicationRoutes);

// ── Clinical AI (ICD-11 live + medication engine) ─────────────────────────────
router.post('/clinical/icd10',       authorizeRoles(CLINICAL_ROLES), clinicalAIController.suggestICD10); // path kept for compat; now queries WHO ICD-11
router.post('/clinical/medications', authorizeRoles(CLINICAL_ROLES), clinicalAIController.suggestMedications);
router.post('/clinical/instructions', authorizeRoles(CLINICAL_ROLES), clinicalAIController.generateInstructions);
router.post('/clinical/assessment',  authorizeRoles(CLINICAL_ROLES), clinicalAIController.generateAssessment);
router.post('/clinical/note',        authorizeRoles(CLINICAL_ROLES), clinicalAIController.generateProgressNote);
router.post('/clinical/sbar',        authorizeRoles(CLINICAL_ROLES), clinicalAIController.generateSBAR);
router.get('/clinical/frequencies',  authorizeRoles(CLINICAL_ROLES), clinicalAIController.getFrequencies);

module.exports = router;

