'use strict';
const express = require('express');
const router  = express.Router();
const aiController        = require('../controllers/aiController');
const clinicalAIController = require('../controllers/clinicalAIController');
const { authMiddleware }  = require('../middleware/auth');
const authorizeRoles      = require('../middleware/role');
const checkPermission     = require('../middleware/permission');

router.use(authMiddleware);

// Clinical nursing roles (used only by the /clinical/* AI helper endpoints
// below -- left on the existing hardcoded gate, not part of the new
// "AI Insights" module, since these are in-workflow drafting aids, not a
// distinct navigable page)
const CLINICAL_ROLES = ['nurse', 'chef-nurse', 'admin', 'doctor', 'consultant', 'medical_director'];

// The AI Insights page (management analytics): view = stats/classify,
// download = executive briefing
router.get('/stats',            checkPermission('ai_insights', 'view'),     aiController.getModuleStats);
router.get('/classify/:module', checkPermission('ai_insights', 'view'),     aiController.classifyReasons);
router.get('/executive',        checkPermission('ai_insights', 'download'), aiController.getExecutiveReport);

// ── Legacy medication suggest (kept for backward compat) ─────────────────────
router.post('/medications/suggest', authorizeRoles(CLINICAL_ROLES), aiController.suggestMedicationRoutes);

// ── Clinical AI (ICD-11 live + medication engine) ─────────────────────────────
router.post('/clinical/icd10',       authorizeRoles(CLINICAL_ROLES), clinicalAIController.suggestICD10); // path kept for compat; now queries WHO ICD-11
router.post('/clinical/medications', authorizeRoles(CLINICAL_ROLES), clinicalAIController.suggestMedications);
router.post('/clinical/instructions', authorizeRoles(CLINICAL_ROLES), clinicalAIController.generateInstructions);
router.post('/clinical/assessment',  authorizeRoles(CLINICAL_ROLES), clinicalAIController.generateAssessment);
router.post('/clinical/note',        authorizeRoles(CLINICAL_ROLES), clinicalAIController.generateProgressNote);
router.post('/clinical/sbar',        authorizeRoles(CLINICAL_ROLES), clinicalAIController.generateSBAR);
router.post('/clinical/dental-note', authorizeRoles([...CLINICAL_ROLES, 'dental', 'dentist', 'dental_tech', 'dental_hod', 'dental_lab_manager']), clinicalAIController.generateDentalNote);
router.get('/clinical/frequencies',  authorizeRoles(CLINICAL_ROLES), clinicalAIController.getFrequencies);
router.get('/clinical/icd11/all',    authorizeRoles(CLINICAL_ROLES), clinicalAIController.getAllICD11);
router.get('/clinical/icd11/lookup', authorizeRoles(CLINICAL_ROLES), clinicalAIController.lookupICD11);

module.exports = router;

