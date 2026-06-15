'use strict';
const express = require('express');
const router = express.Router();
const itSupportController = require('../controllers/itSupportController');
const { authMiddleware: authenticateToken } = require('../middleware/auth');
const authorizeRoles = require('../middleware/role');

router.use(authenticateToken);
router.use(authorizeRoles(['admin', 'it_officer']));

// --- Tickets ---
router.get('/tickets', itSupportController.getTickets);
router.post('/tickets', itSupportController.createTicket);
router.put('/tickets/:id', itSupportController.updateTicket);

// --- Assets ---
router.get('/assets', itSupportController.getAssets);
router.post('/assets', itSupportController.createAsset);
router.put('/assets/:id', itSupportController.updateAsset);

module.exports = router;
