'use strict';
const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', serviceController.getAllServices);
router.get('/:id', serviceController.getServiceById);

module.exports = router;
