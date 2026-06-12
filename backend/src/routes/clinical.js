'use strict';
const express = require('express');
const router = express.Router();
const clinicalController = require('../controllers/clinicalController');
const { authMiddleware: authenticateToken } = require('../middleware/auth');
const authorizeRoles = require('../middleware/role');

// --- Public Supplier Portal Routes (No Auth) ---
router.get('/inventory/supplier-portal/public-status', clinicalController.getSupplierPortalPublicStatus);
router.post('/inventory/supplier-portal/verify-token', clinicalController.verifySupplierToken);
router.post('/inventory/supplier-portal/upload', clinicalController.supplierPortalUpload);

router.use(authenticateToken);
router.use(authorizeRoles(['nurse', 'admin', 'doctor', 'consultant', 'reviewer', 'chef-nurse', 'deputy_coo', 'stock-manager', 'pa']));

// --- Supplier Portal Authenticated Routes ---
router.get('/inventory/supplier-portal/settings', clinicalController.getSupplierPortalSettings);
router.post('/inventory/supplier-portal/toggle', clinicalController.toggleSupplierPortal);
router.get('/inventory/supplier-portal/submissions', clinicalController.getSupplierSubmissions);
router.get('/inventory/supplier-portal/submissions/:id/items', clinicalController.getSupplierSubmissionItems);
router.post('/inventory/supplier-portal/submissions/:id/receive', clinicalController.receiveSupplierStock);

// --- Stock Management Relational Routes ---
router.get('/inventory/master', clinicalController.getmasterInventory);
router.post('/inventory/master', clinicalController.createmasterInventory);
router.put('/inventory/master/:id', clinicalController.updatemasterInventory);
router.delete('/inventory/master/:id', clinicalController.deletemasterInventory);

router.get('/inventory/batches', clinicalController.getBatches);
router.post('/inventory/batches', clinicalController.createBatch);
router.post('/inventory/reconcile', clinicalController.reconcileInventory);
router.get('/inventory/requisitions/:id/items', clinicalController.getRequisitionItems);
router.get('/inventory/requisitions', clinicalController.getRequisitions);
router.post('/inventory/requisitions', clinicalController.createRequisition);
router.post('/inventory/requisitions/:id/approve', clinicalController.approveRequisition);
router.post('/inventory/requisitions/:id/reject', clinicalController.rejectRequisition);
router.get('/inventory/vendors', clinicalController.getVendors);
router.post('/inventory/vendors', clinicalController.createVendor);
router.put('/inventory/vendors/:id', clinicalController.updateVendor);
router.delete('/inventory/vendors/:id', clinicalController.deleteVendor);

router.get('/inventory/departments', clinicalController.getDepartments);
router.post('/inventory/departments', clinicalController.createDepartment);
router.put('/inventory/departments/:id', clinicalController.updateDepartment);
router.delete('/inventory/departments/:id', clinicalController.deleteDepartment);

router.get('/inventory/uoms', clinicalController.getUoms);
router.post('/inventory/uoms', clinicalController.createUom);
router.put('/inventory/uoms/:id', clinicalController.updateUom);
router.delete('/inventory/uoms/:id', clinicalController.deleteUom);

router.post('/observations/:patientId', clinicalController.saveObservation);
router.get('/observations',             clinicalController.getAllObservationsList);
router.get('/prescriptions/completed',  clinicalController.getCompletedPrescriptions);
router.get('/observations/recent',      clinicalController.getRecentObservations);
router.get('/observations/:patientId/all', clinicalController.getAllObservations);
router.get('/observations/:patientId/checksum', clinicalController.getDocChecksum);
router.get('/observations/:patientId/verify',   clinicalController.verifyDocument);
router.get('/observations/:patientId/pdf',      clinicalController.getPDF);
router.get('/observations/:patientId',          clinicalController.getObservation);

router.get('/inventory', authorizeRoles(['nurse', 'chef-nurse', 'admin', 'doctor', 'consultant']), clinicalController.getInventory);
router.get('/inventory/export', authorizeRoles(['nurse', 'chef-nurse', 'admin', 'doctor', 'consultant']), clinicalController.exportInventoryExcel);
router.post('/inventory/sync-central-stock', authorizeRoles(['nurse', 'chef-nurse', 'admin', 'doctor', 'consultant']), clinicalController.syncCentralStockToNursing);
router.get('/inventory/items', authorizeRoles(['nurse', 'chef-nurse', 'admin', 'doctor', 'consultant']), clinicalController.getInventoryItems);
router.post('/inventory/bulk', authorizeRoles(['nurse', 'chef-nurse', 'admin', 'doctor', 'consultant']), clinicalController.saveInventoryBulk);
router.post('/inventory/sync', authorizeRoles(['nurse', 'chef-nurse', 'admin', 'doctor', 'consultant']), clinicalController.triggerInventorySync);
router.get('/inventory/change-logs', authorizeRoles(['nurse', 'chef-nurse', 'admin', 'doctor', 'consultant', 'reviewer', 'pa']), clinicalController.getInventoryChangeLogs);

module.exports = router;
