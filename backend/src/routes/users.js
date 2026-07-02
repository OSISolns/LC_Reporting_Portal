'use strict';
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authMiddleware } = require('../middleware/auth');
const checkPermission = require('../middleware/permission');

router.use(authMiddleware);
router.get('/staff', userController.getStaffList);

router.get('/', checkPermission('user_management', 'view'), userController.getAllUsers);
router.post('/', checkPermission('user_management', 'create'), userController.createUser);
router.patch('/:id', checkPermission('user_management', 'edit'), userController.updateUser);
router.delete('/:id', checkPermission('user_management', 'delete'), userController.deleteUser);
router.post('/:id/reset-password', checkPermission('user_management', 'edit'), userController.resetPassword);
router.get('/roles', checkPermission('user_management', 'view'), userController.getRoles);

module.exports = router;
