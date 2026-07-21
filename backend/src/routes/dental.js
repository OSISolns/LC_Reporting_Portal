'use strict';
const express = require('express');
const router = express.Router();
const dentalController = require('../controllers/dentalController');
const { authMiddleware } = require('../middleware/auth');

// Protect all routes with JWT Auth
router.use(authMiddleware);

// Cases CRUD
router.get('/cases',          dentalController.listCases);
router.get('/cases/stats',    dentalController.getStats);
router.get('/cases/:id',      dentalController.getCase);
router.post('/cases',         dentalController.createCase);
router.put('/cases/:id',      dentalController.updateCase);
router.delete('/cases/:id',   dentalController.deleteCase);

// Worklist (Patient Queue)
router.get('/worklist',              dentalController.listWorklist);
router.get('/worklist/stats',        dentalController.getWorklistStats);
router.post('/worklist',             dentalController.addWorklist);
router.put('/worklist/:id',          dentalController.updateWorklist);
router.patch('/worklist/:id/status', dentalController.updateWorklistStatus);
router.delete('/worklist/:id',       dentalController.deleteWorklist);

// Dental Charting (Odontogram)
router.get('/charts',          dentalController.listCharts);
router.post('/charts',         dentalController.saveChart);
router.get('/charts/:id',      dentalController.getChart);
router.delete('/charts/:id',   dentalController.deleteChart);

module.exports = router;
