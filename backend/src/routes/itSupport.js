'use strict';
const express = require('express');
const router = express.Router();
const itSupportController = require('../controllers/itSupportController');
const { authMiddleware: authenticateToken } = require('../middleware/auth');
const checkPermission = require('../middleware/permission');

router.use(authenticateToken);

// --- Tickets (Read/Create allowed broadly, Update/Delete restricted) ---
router.get('/tickets', checkPermission('it_support', 'view'), itSupportController.getTickets);
router.post('/tickets', checkPermission('it_support', 'create'), itSupportController.createTicket);
router.put('/tickets/:id', checkPermission('it_support', 'edit'), itSupportController.updateTicket);
router.delete('/tickets/:id', checkPermission('it_support', 'delete'), itSupportController.deleteTicket);

// --- Assets (Restricted) ---
router.get('/assets', checkPermission('it_support', 'edit'), itSupportController.getAssets);
router.post('/assets', checkPermission('it_support', 'edit'), itSupportController.createAsset);
router.put('/assets/:id', checkPermission('it_support', 'edit'), itSupportController.updateAsset);
router.delete('/assets/:id', checkPermission('it_support', 'delete'), itSupportController.deleteAsset);

module.exports = router;
