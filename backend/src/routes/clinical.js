'use strict';
const express = require('express');
const router = express.Router();
const clinicalController = require('../controllers/clinicalController');
const { authMiddleware: authenticateToken } = require('../middleware/auth');
const authorizeRoles = require('../middleware/role');
const checkPermission = require('../middleware/permission');

// --- Public Supplier Portal Routes (No Auth) ---
router.get('/inventory/supplier-portal/public-status', clinicalController.getSupplierPortalPublicStatus);
router.post('/inventory/supplier-portal/verify-token', clinicalController.verifySupplierToken);
router.post('/inventory/supplier-portal/upload', clinicalController.supplierPortalUpload);

router.use(authenticateToken);
router.use(authorizeRoles(['nurse', 'admin', 'doctor', 'consultant', 'reviewer', 'chef-nurse', 'deputy_coo', 'stock-manager', 'pa', 'medical_director', 'procurement-manager']));

// --- Procurement Manager Dashboard (module: procurement) ---
router.get('/procurement/dashboard', checkPermission('procurement', 'view'), clinicalController.getProcurementDashboard);

// --- Purchase Order Routes (module: procurement) ---
router.get('/inventory/purchase-orders', checkPermission('procurement', 'view'), clinicalController.getPurchaseOrders);
router.post('/inventory/purchase-orders', checkPermission('procurement', 'create'), clinicalController.createPurchaseOrder);
router.put('/inventory/purchase-orders/:id/status', checkPermission('procurement', 'edit'), clinicalController.updatePOStatus);

// --- Goods Receipt Notes Routes (module: procurement) ---
router.get('/inventory/grns', checkPermission('procurement', 'view'), clinicalController.getGRNs);
router.post('/inventory/grns', checkPermission('procurement', 'create'), clinicalController.createGRN);
router.get('/inventory/grns/:id/items', checkPermission('procurement', 'view'), clinicalController.getGRNItems);

// --- Supplier Returns Routes (module: procurement) ---
router.get('/inventory/returns', checkPermission('procurement', 'view'), clinicalController.getSupplierReturns);
router.post('/inventory/returns', checkPermission('procurement', 'create'), clinicalController.createSupplierReturn);
router.get('/inventory/returns/:id/items', checkPermission('procurement', 'view'), clinicalController.getSupplierReturnItems);

// --- Tenders & RFQ Routes (module: procurement) ---
router.get('/inventory/rfqs', checkPermission('procurement', 'view'), clinicalController.getRFQs);
router.get('/inventory/rfqs/:id', checkPermission('procurement', 'view'), clinicalController.getRFQById);
router.post('/inventory/rfqs', checkPermission('procurement', 'create'), clinicalController.createRFQ);
router.post('/inventory/rfqs/:id/quotes', checkPermission('procurement', 'edit'), clinicalController.saveRFQQuotes);
router.post('/inventory/rfqs/:id/awards', checkPermission('procurement', 'edit'), clinicalController.saveRFQAwards);
router.post('/inventory/rfqs/:id/generate-pos', checkPermission('procurement', 'edit'), clinicalController.generatePOsFromRFQ);
router.get('/inventory/vendors/:id/performance', checkPermission('procurement', 'view'), clinicalController.getSupplierPerformance);

// --- Supplier Portal Authenticated Routes (module: procurement) ---
// Previously had no restriction beyond the broad router-level role gate above
// (any nurse/doctor/etc could open/close a supplier portal session or
// receive a delivery) -- tightened to match who actually uses this feature
// via the UI (ProcurementHub / Supplier Portal Manager).
router.get('/inventory/supplier-portal/settings', checkPermission('procurement', 'view'), clinicalController.getSupplierPortalSettings);
router.post('/inventory/supplier-portal/toggle', checkPermission('procurement', 'edit'), clinicalController.toggleSupplierPortal);
router.get('/inventory/supplier-portal/submissions', checkPermission('procurement', 'view'), clinicalController.getSupplierSubmissions);
router.get('/inventory/supplier-portal/submissions/:id/items', checkPermission('procurement', 'view'), clinicalController.getSupplierSubmissionItems);
router.post('/inventory/supplier-portal/submissions/:id/receive', checkPermission('procurement', 'edit'), clinicalController.receiveSupplierStock);

// --- Stock Management Relational Routes (module: inventory -- Central Store / Master Module) ---
router.get('/inventory/master', checkPermission('inventory', 'view'), clinicalController.getmasterInventory);
router.get('/inventory/distributed-stock', checkPermission('inventory', 'view'), clinicalController.getDistributedStock);
router.post('/inventory/master', checkPermission('inventory', 'create'), clinicalController.createmasterInventory);
router.put('/inventory/master/:id', checkPermission('inventory', 'edit'), clinicalController.updatemasterInventory);
router.delete('/inventory/master/:id', checkPermission('inventory', 'delete'), clinicalController.deletemasterInventory);
router.post('/inventory/master/bulk-delete', checkPermission('inventory', 'delete'), clinicalController.bulkDeleteMasterInventory);

router.get('/inventory/batches', checkPermission('inventory', 'view'), clinicalController.getBatches);
router.post('/inventory/batches', checkPermission('inventory', 'create'), clinicalController.createBatch);
router.post('/inventory/reconcile', checkPermission('inventory', 'edit'), clinicalController.reconcileInventory);
router.get('/inventory/requisitions/:id/items', checkPermission('inventory', 'view'), clinicalController.getRequisitionItems);
router.get('/inventory/requisitions', checkPermission('inventory', 'view'), clinicalController.getRequisitions);
router.post('/inventory/requisitions', checkPermission('inventory', 'create'), clinicalController.createRequisition);
router.post('/inventory/requisitions/:id/approve', checkPermission('inventory', 'edit'), clinicalController.approveRequisition);
router.post('/inventory/requisitions/:id/reject', checkPermission('inventory', 'edit'), clinicalController.rejectRequisition);
router.post('/inventory/requisitions/:id/receive', checkPermission('daily_stock', 'edit'), clinicalController.receiveRequisition);
router.get('/inventory/vendors', checkPermission('inventory', 'view'), clinicalController.getVendors);
router.post('/inventory/vendors', checkPermission('inventory', 'create'), clinicalController.createVendor);
router.put('/inventory/vendors/:id', checkPermission('inventory', 'edit'), clinicalController.updateVendor);
router.delete('/inventory/vendors/:id', checkPermission('inventory', 'delete'), clinicalController.deleteVendor);

router.get('/inventory/departments', checkPermission('inventory', 'view'), clinicalController.getDepartments);
router.post('/inventory/departments', checkPermission('inventory', 'create'), clinicalController.createDepartment);
router.put('/inventory/departments/:id', checkPermission('inventory', 'edit'), clinicalController.updateDepartment);
router.delete('/inventory/departments/:id', checkPermission('inventory', 'delete'), clinicalController.deleteDepartment);

router.get('/inventory/uoms', checkPermission('inventory', 'view'), clinicalController.getUoms);
router.post('/inventory/uoms', checkPermission('inventory', 'create'), clinicalController.createUom);
router.put('/inventory/uoms/:id', checkPermission('inventory', 'edit'), clinicalController.updateUom);
router.delete('/inventory/uoms/:id', checkPermission('inventory', 'delete'), clinicalController.deleteUom);

// --- Clinical Observations (module: clinical_observation) ---
// Previously had no permission check beyond the broad router-level role gate
// above, which also includes stock-manager/procurement-manager/pa (only
// needed for the /inventory/* routes in this same file, not patient clinical
// records). Tightened to match the existing clinical_observation defaults,
// which already only grant stock-manager/procurement-manager view-only.
router.post('/observations/:patientId', checkPermission('clinical_observation', 'create'), clinicalController.saveObservation);
router.get('/observations',             checkPermission('clinical_observation', 'view'), clinicalController.getAllObservationsList);
router.get('/prescriptions/completed',  checkPermission('clinical_observation', 'view'), clinicalController.getCompletedPrescriptions);
router.get('/observations/recent',      checkPermission('clinical_observation', 'view'), clinicalController.getRecentObservations);
router.get('/observations/:patientId/all', checkPermission('clinical_observation', 'view'), clinicalController.getAllObservations);
router.get('/observations/:patientId/checksum', checkPermission('clinical_observation', 'view'), clinicalController.getDocChecksum);
router.get('/observations/:patientId/verify',   checkPermission('clinical_observation', 'view'), clinicalController.verifyDocument);
router.get('/observations/:patientId/pdf',      checkPermission('clinical_observation', 'view'), clinicalController.getPDF);
router.get('/observations/:patientId',          checkPermission('clinical_observation', 'view'), clinicalController.getObservation);

// --- Nursing Daily Stock Checkup (module: daily_stock) ---
router.get('/inventory', checkPermission('daily_stock', 'view'), clinicalController.getInventory);
router.get('/inventory/export', checkPermission('daily_stock', 'view'), clinicalController.exportInventoryExcel);
router.post('/inventory/sync-central-stock', checkPermission('daily_stock', 'edit'), clinicalController.syncCentralStockToNursing);
// /inventory/items is a shared reference lookup used broadly (nursing MAR,
// e-prescriptions autocomplete) -- left on its existing role list rather
// than folded into daily_stock, so prescribing roles keep access.
router.get('/inventory/items', authorizeRoles(['nurse', 'chef-nurse', 'admin', 'doctor', 'consultant', 'reviewer', 'medical_director', 'pa', 'stock-manager', 'procurement-manager']), clinicalController.getInventoryItems);
router.post('/inventory/bulk', checkPermission('daily_stock', 'edit'), clinicalController.saveInventoryBulk);
router.get('/inventory/deleted-items', checkPermission('daily_stock', 'view'), clinicalController.getDeletedItems);
router.post('/inventory/deleted-items', checkPermission('daily_stock', 'edit'), clinicalController.saveDeletedItems);
router.post('/inventory/unlock', checkPermission('daily_stock', 'edit'), clinicalController.unlockInventory);
// Stock unlock passcode management stays admin-only regardless of the matrix
// -- too sensitive to expose as a general toggle.
router.get('/inventory/stock-password', authorizeRoles(['admin']), clinicalController.getStockPassword);
router.post('/inventory/regenerate-stock-password', authorizeRoles(['admin']), clinicalController.regenerateStockPassword);
router.post('/inventory/sync', checkPermission('daily_stock', 'edit'), clinicalController.triggerInventorySync);
router.get('/inventory/change-logs', checkPermission('daily_stock', 'view'), clinicalController.getInventoryChangeLogs);

// Shared medication-name reference lookup (FDA cache) -- same reasoning as
// /inventory/items above, left open to the broad router-level gate.
router.get('/medications/search', clinicalController.searchFdaMedications);

module.exports = router;

// --- Procurement Hub Expansion Routes (module: procurement) ---

// Vendor Documents
router.get('/inventory/vendors/:id/documents', checkPermission('procurement', 'view'), clinicalController.getVendorDocuments);
router.post('/inventory/vendors/:id/documents', checkPermission('procurement', 'create'), clinicalController.createVendorDocument);
router.delete('/inventory/vendors/:id/documents/:docId', checkPermission('procurement', 'delete'), clinicalController.deleteVendorDocument);

// Vendor Contracts
router.get('/inventory/vendors/:id/contracts', checkPermission('procurement', 'view'), clinicalController.getVendorContracts);
router.post('/inventory/vendors/:id/contracts', checkPermission('procurement', 'create'), clinicalController.createVendorContract);
router.put('/inventory/vendors/:id/contracts/:contractId/status', checkPermission('procurement', 'edit'), clinicalController.updateVendorContractStatus);

// Vendor Ratings
router.get('/inventory/vendors/:id/ratings', checkPermission('procurement', 'view'), clinicalController.getVendorRatings);
router.post('/inventory/vendors/:id/ratings', checkPermission('procurement', 'create'), clinicalController.createVendorRating);

// GRN Inspection
router.get('/inventory/grns/:id/inspection', checkPermission('procurement', 'view'), clinicalController.getGRNInspection);
router.post('/inventory/grns/:id/inspection', checkPermission('procurement', 'edit'), clinicalController.saveGRNInspection);

// Purchase Invoices (Accounts Payable)
router.get('/inventory/invoices', checkPermission('procurement', 'view'), clinicalController.getInvoices);
router.get('/inventory/invoices/analytics', checkPermission('procurement', 'view'), clinicalController.getInvoiceAnalytics);
router.get('/inventory/invoices/:id', checkPermission('procurement', 'view'), clinicalController.getInvoiceById);
router.post('/inventory/invoices', checkPermission('procurement', 'create'), clinicalController.createInvoice);
router.put('/inventory/invoices/:id/status', checkPermission('procurement', 'edit'), clinicalController.updateInvoiceStatus);
router.get('/inventory/invoices/:id/match', checkPermission('procurement', 'view'), clinicalController.getThreeWayMatch);

// Department Budgets
router.get('/inventory/budgets', checkPermission('procurement', 'view'), clinicalController.getDepartmentBudgets);
router.post('/inventory/budgets', checkPermission('procurement', 'create'), clinicalController.upsertDepartmentBudget);
router.get('/inventory/budgets/status', checkPermission('procurement', 'view'), clinicalController.getDepartmentBudgetStatus);

// Procurement Catalog
router.get('/inventory/catalog', checkPermission('procurement', 'view'), clinicalController.getCatalog);
router.post('/inventory/catalog', checkPermission('procurement', 'create'), clinicalController.createCatalogItem);
router.put('/inventory/catalog/:id/toggle', checkPermission('procurement', 'edit'), clinicalController.toggleCatalogItem);

// Analytics
router.get('/inventory/analytics/spend-by-department', checkPermission('procurement', 'view'), clinicalController.getSpendByDepartment);
router.get('/inventory/analytics/supplier-leaderboard', checkPermission('procurement', 'view'), clinicalController.getSupplierLeaderboard);
router.get('/inventory/analytics/expiring-contracts', checkPermission('procurement', 'view'), clinicalController.getExpiringContracts);
