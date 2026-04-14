'use strict';
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authMiddleware } = require('../middleware/auth');
const authorizeRoles = require('../middleware/role');

router.use(authMiddleware);
router.use(authorizeRoles(['admin'])); // Only admin can manage users

router.get('/', userController.getAllUsers);
router.post('/', userController.createUser);
router.patch('/:id', userController.updateUser);
router.get('/roles', userController.getRoles);

module.exports = router;
