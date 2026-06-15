'use strict';
const express = require('express');
const router = express.Router();
const leakage = require('../controllers/revenueLeakageController');
const { authMiddleware, authorizeRoles } = require('../middleware/auth');

router.use(authMiddleware);
router.use(authorizeRoles(['sales_manager', 'coo', 'chairman', 'admin', 'principal_cashier', 'deputy_coo']));

router.get('/', leakage.getLeakages);
router.post('/', leakage.createLeakage);
router.put('/:id', leakage.updateLeakage);
router.delete('/:id', leakage.deleteLeakage);
router.post('/scan', leakage.runSystemScan);

module.exports = router;
