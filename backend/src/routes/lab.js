'use strict';
const express = require('express');
const router = express.Router();
const labController = require('../controllers/labController');
const { authMiddleware } = require('../middleware/auth');

// Protect all routes with JWT Auth
router.use(authMiddleware);

router.get('/orders', labController.listOrders);
router.post('/register', labController.registerSpecimen);
router.get('/orders/:id', labController.getOrderDetails);
router.post('/orders/:id/results', labController.saveResults);
router.post('/orders/:id/verify', labController.verifyOrder);

module.exports = router;
