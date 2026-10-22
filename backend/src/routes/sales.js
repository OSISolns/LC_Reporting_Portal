'use strict';

const express = require('express');
const router = express.Router();
const { authMiddleware, roleGuard } = require('../middleware/auth');
const salesCtrl = require('../controllers/salesController');

const ALLOWED_ROLES = [
  'sales_manager'
];

router.use(authMiddleware);
router.use(roleGuard(ALLOWED_ROLES));

// Proformas
router.get('/proformas', salesCtrl.getProformas);
router.get('/proformas/stats', salesCtrl.getSalesStats);
router.get('/proformas/:id', salesCtrl.getProformaById);
router.post('/proformas', salesCtrl.createProforma);
router.put('/proformas/:id', salesCtrl.updateProforma);
router.delete('/proformas/:id', salesCtrl.deleteProforma);
router.post('/proformas/:id/email', salesCtrl.sendProformaEmail);

// Service Catalog
router.get('/catalog', salesCtrl.getCatalog);
router.post('/catalog', salesCtrl.addCatalogItem);
router.delete('/catalog/:id', salesCtrl.deleteCatalogItem);

module.exports = router;
