'use strict';
const express = require('express');
const router = express.Router();
const permissionController = require('../controllers/permissionController');
const { authMiddleware } = require('../middleware/auth');
const authorizeRoles = require('../middleware/role');

// All permission routes require admin access
router.use(authMiddleware);
router.use(authorizeRoles(['admin']));

/**
 * @route GET /api/permissions/modules
 * @desc Get all permission modules
 */
router.get('/modules', permissionController.getModules);

/**
 * @route GET /api/permissions/matrix
 * @desc Get full role permissions matrix
 */
router.get('/matrix', permissionController.getRoleMatrix);

/**
 * @route PUT /api/permissions/role/:roleName
 * @desc Update permissions for a role
 */
router.put('/role/:roleName', permissionController.updateRolePermissions);

/**
 * @route GET /api/permissions/user/:userId
 * @desc Get effective permissions for a user
 */
router.get('/user/:userId', permissionController.getUserEffectivePermissions);

/**
 * @route POST /api/permissions/user/:userId/override
 * @desc Set a permission override for a user
 */
router.post('/user/:userId/override', permissionController.setUserOverride);

/**
 * @route GET /api/permissions/role/:roleName/reset
 * @desc Reset permissions for a role to defaults
 */
router.post('/role/:roleName/reset', permissionController.resetRolePermissions);

/**
 * @route GET /api/permissions/unlock-logs
 * @desc Get logs of who has unlocked the stock and when
 */
router.get('/unlock-logs', permissionController.getUnlockLogs);

module.exports = router;
