'use strict';
const express = require('express');
const router = express.Router();
const labController = require('../controllers/labController');
const { authMiddleware } = require('../middleware/auth');
const authorizeRoles = require('../middleware/role');

// Define role groups for lab operations
const LAB_EXECUTIVE_ROLES = [
  'admin', 'deputy_coo', 'coo', 'general_manager', 'chairman', 
  'lab_hod', 'lab_manager', 'quality_manager', 'qm'
];
const LAB_MANAGER_ROLES = LAB_EXECUTIVE_ROLES;
const LAB_LEAD_OR_MANAGER_ROLES = [
  ...LAB_EXECUTIVE_ROLES,
  'lab_team_lead', 'lab_lead',
  'lab_safety_officer', 'lab_stock_officer',
  'head_microbiology', 'head_hematology', 'head_histopathology',
  'head_poct', 'head_phlebotomy', 'head_molecular_biology',
  'lab_micro_specialist'
];
const ALL_LAB_ROLES = [
  ...LAB_LEAD_OR_MANAGER_ROLES,
  'lab_scientist', 'lab_tech', 'lab'
];

// Protect all routes with JWT Auth
router.use(authMiddleware);

router.get('/orders', labController.listOrders);
router.post('/register', labController.registerSpecimen);
router.get('/orders/:id', labController.getOrderDetails);
router.put('/orders/:id/stage', labController.updateStage);
router.post('/orders/:id/results', labController.saveResults);
// Verification: Team Lead and Manager level only
router.post('/orders/:id/verify', authorizeRoles(LAB_LEAD_OR_MANAGER_ROLES), labController.verifyOrder);
router.post('/orders/:id/notify', labController.notifyPatient);

// Quality Control (IQC & Westgard) Routes
router.get('/qc-logs', labController.getQCLogs);
router.post('/qc-run', labController.recordQCRun);

// Non-Conformance Report (NCR) Routes
router.get('/ncr', labController.listNCRs);
router.post('/ncr', labController.createNCR);
router.get('/ncr/:id', labController.getNCR);
router.put('/ncr/:id', labController.updateNCR);
router.delete('/ncr/:id', authorizeRoles(LAB_MANAGER_ROLES), labController.deleteNCR);

// Storage Units & Specimen Storage Routes
router.get('/storage-units', labController.getStorageUnits);
router.post('/storage-units', labController.saveStorageUnit);
router.get('/storage-assignments', labController.getStorageAssignments);
router.post('/storage-assignments', labController.saveStorageAssignment);

// Lab Manager Executive Dashboard Route - Strictly Manager / Leadership Level
router.get('/manager-summary', authorizeRoles(LAB_MANAGER_ROLES), labController.getManagerSummary);

// Lab Team Leader Operational Dashboard Routes - Accessible by Team Leads & Managers
router.get('/team-lead-summary', authorizeRoles(LAB_LEAD_OR_MANAGER_ROLES), labController.getTeamLeadSummary);
router.post('/batch-verify', authorizeRoles(LAB_LEAD_OR_MANAGER_ROLES), labController.batchVerifyOrders);

// Analyzer Management Routes - Configuration by Lead/Manager, Deletion by Manager only
router.get('/analyzers', labController.getAnalyzers);
router.post('/analyzers', authorizeRoles(LAB_LEAD_OR_MANAGER_ROLES), labController.createAnalyzer);
router.put('/analyzers/:id', authorizeRoles(LAB_LEAD_OR_MANAGER_ROLES), labController.updateAnalyzer);
router.delete('/analyzers/:id', authorizeRoles(LAB_MANAGER_ROLES), labController.deleteAnalyzer);

// Equipment & Planned Preventive Maintenance (PPM) Routes
router.get('/equipment', labController.getEquipment);
router.post('/equipment', authorizeRoles(LAB_LEAD_OR_MANAGER_ROLES), labController.createEquipment);
router.put('/equipment/:id', authorizeRoles(LAB_LEAD_OR_MANAGER_ROLES), labController.updateEquipment);

// In-Hand Reagent Inventory Routes - Delete restricted to Manager Level
router.get('/inhand-inventory', labController.getInhandInventory);
router.post('/inhand-inventory', labController.saveInhandInventory);
router.put('/inhand-inventory/:id', labController.updateInhandInventory);
router.delete('/inhand-inventory/:id', authorizeRoles(LAB_MANAGER_ROLES), labController.deleteInhandInventory);

module.exports = router;
