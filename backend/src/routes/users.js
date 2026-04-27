'use strict';
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authMiddleware } = require('../middleware/auth');
const authorizeRoles = require('../middleware/role');

router.use(authMiddleware);
router.get('/staff', userController.getStaffList);
router.use(authorizeRoles(['admin', 'it_officer'])); // Admin and IT Officer can manage users

router.get('/', userController.getAllUsers);
router.post('/', userController.createUser);
router.patch('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);
router.post('/:id/reset-password', userController.resetPassword);
router.get('/roles', userController.getRoles);

module.exports = router;
