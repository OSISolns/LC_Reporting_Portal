'use strict';
const express = require('express');
const router = express.Router();
const itSupportController = require('../controllers/itSupportController');
const { authMiddleware: authenticateToken } = require('../middleware/auth');
const authorizeRoles = require('../middleware/role');

router.use(authenticateToken);

// --- Tickets (Read/Create allowed for all roles, Update/Delete restricted to Admin/IT) ---
router.get('/tickets', itSupportController.getTickets);
router.post('/tickets', itSupportController.createTicket);
router.put('/tickets/:id', authorizeRoles(['admin', 'it_officer']), itSupportController.updateTicket);
router.delete('/tickets/:id', authorizeRoles(['admin', 'it_officer']), itSupportController.deleteTicket);

// --- Assets (Strictly restricted to Admin/IT) ---
router.use('/assets', authorizeRoles(['admin', 'it_officer']));
router.get('/assets', itSupportController.getAssets);
router.post('/assets', itSupportController.createAsset);
router.put('/assets/:id', itSupportController.updateAsset);
router.delete('/assets/:id', itSupportController.deleteAsset);

module.exports = router;
// Trigger restart
