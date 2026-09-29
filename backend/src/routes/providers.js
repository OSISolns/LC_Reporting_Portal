'use strict';
const express = require('express');
const router = express.Router();
const providerController = require('../controllers/providerController');
const { authMiddleware } = require('../middleware/auth');
const checkPermission = require('../middleware/permission');

router.use(authMiddleware);

router.get('/physiotherapists', providerController.getPhysiotherapists);
router.get('/active', (req, res, next) => { req.query.activeOnly = 'true'; providerController.getAllProviders(req, res, next); });
router.get('/', providerController.getAllProviders);
router.get('/specializations', providerController.getSpecializations);
router.post('/', checkPermission('user_management', 'edit'), providerController.createProvider);
router.patch('/:id', checkPermission('user_management', 'edit'), providerController.updateProvider);
router.delete('/:id', checkPermission('user_management', 'edit'), providerController.deleteProvider);

module.exports = router;
