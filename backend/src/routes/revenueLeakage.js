'use strict';
const express = require('express');
const router = express.Router();
const leakage = require('../controllers/revenueLeakageController');
const { authMiddleware } = require('../middleware/auth');
const checkPermission = require('../middleware/permission');

router.use(authMiddleware);

router.get('/', checkPermission('revenue_leakage', 'view'), leakage.getLeakages);
router.post('/', checkPermission('revenue_leakage', 'create'), leakage.createLeakage);
router.put('/:id', checkPermission('revenue_leakage', 'edit'), leakage.updateLeakage);
router.delete('/:id', checkPermission('revenue_leakage', 'delete'), leakage.deleteLeakage);
router.post('/scan', checkPermission('revenue_leakage', 'create'), leakage.runSystemScan);

module.exports = router;
