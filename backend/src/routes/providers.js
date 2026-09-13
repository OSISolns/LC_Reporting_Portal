'use strict';
const express = require('express');
const router = express.Router();
const providerController = require('../controllers/providerController');
const { authMiddleware } = require('../middleware/auth');
const checkPermission = require('../middleware/permission');

router.use(authMiddleware);

router.get('/', checkPermission('user_management', 'view'), providerController.getAllProviders);
router.get('/specializations', checkPermission('user_management', 'view'), providerController.getSpecializations);
router.post('/', checkPermission('user_management', 'edit'), providerController.createProvider);
router.patch('/:id', checkPermission('user_management', 'edit'), providerController.updateProvider);
router.delete('/:id', checkPermission('user_management', 'edit'), providerController.deleteProvider);

module.exports = router;
