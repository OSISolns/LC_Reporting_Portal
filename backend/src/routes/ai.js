'use strict';
const express = require('express');
const router  = express.Router();
const aiController   = require('../controllers/aiController');
const { authMiddleware } = require('../middleware/auth');
const authorizeRoles     = require('../middleware/role');

router.use(authMiddleware);

// Full management access (all modules + executive briefing)
const MGMT_ROLES = ['sales_manager','coo','chairman','admin','deputy_coo','quality_assurance'];

// Principal cashier can view stats + classify cancellations/refunds only
const STATS_ROLES   = [...MGMT_ROLES, 'principal_cashier'];

router.get('/stats',            authorizeRoles(STATS_ROLES), aiController.getModuleStats);
router.get('/classify/:module', authorizeRoles(STATS_ROLES), aiController.classifyReasons);
router.get('/executive',        authorizeRoles(MGMT_ROLES),  aiController.getExecutiveReport);

module.exports = router;

