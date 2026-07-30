'use strict';
const express = require('express');
const router = express.Router();
const imagingController = require('../controllers/imagingController');
const { authMiddleware } = require('../middleware/auth');
const checkPermission = require('../middleware/permission');

router.use(authMiddleware);

// ── Reference data ─────────────────────────────────────────────────────────────
router.get('/modalities', checkPermission('imaging', 'view'), imagingController.getModalities);
router.get('/providers', checkPermission('imaging', 'view'), imagingController.getProviders);
router.post('/ai/generate-indication', checkPermission('imaging', 'view'), imagingController.generateClinicalIndication);

// ── Manager analytics dashboard ────────────────────────────────────────────────
router.get('/dashboard', checkPermission('imaging', 'view'), imagingController.dashboard);

// ── Daily exam board (the 4 units) ─────────────────────────────────────────────
router.get('/daily-board', checkPermission('imaging', 'view'), imagingController.dailyBoard);
router.get('/daily-register', checkPermission('imaging', 'view'), imagingController.dailyRegister);

// ── Worklist / studies ─────────────────────────────────────────────────────────
router.get('/studies', checkPermission('imaging', 'view'), imagingController.listStudies);
router.post('/studies', checkPermission('imaging', 'create'), imagingController.scheduleStudy);
router.get('/studies/:id', checkPermission('imaging', 'view'), imagingController.getStudy);

// ── Radiographer workflow transitions ──────────────────────────────────────────
router.patch('/studies/:id/check-in', checkPermission('imaging', 'edit'), imagingController.checkIn);
router.patch('/studies/:id/start', checkPermission('imaging', 'acquire'), imagingController.startAcquisition);
router.patch('/studies/:id/complete', checkPermission('imaging', 'acquire'), imagingController.completeAcquisition);
router.patch('/studies/:id/cancel', checkPermission('imaging', 'edit'), imagingController.cancelStudy);

// ── Terminology lookups (LOINC / SNOMED / ICD-11) ──────────────────────────────
router.get('/terminology/:system', checkPermission('imaging', 'view'), imagingController.searchTerminology);

// ── Radiologist reporting ──────────────────────────────────────────────────────
router.get('/reporting/queue', checkPermission('imaging', 'report'), imagingController.reportingQueue);
router.get('/studies/:id/report', checkPermission('imaging', 'view'), imagingController.getReport);
router.put('/studies/:id/report', checkPermission('imaging', 'report'), imagingController.saveReport);
router.post('/studies/:id/report/finalize', checkPermission('imaging', 'report'), imagingController.finalizeReport);
router.post('/studies/:id/report/verify', checkPermission('imaging', 'verify'), imagingController.verifyReport);
router.post('/studies/:id/report/amend', checkPermission('imaging', 'report'), imagingController.amendReport);
router.get('/studies/:id/report/pdf', checkPermission('imaging', 'view'), imagingController.reportPdf);

// ── DICOM imaging pipeline ─────────────────────────────────────────────────────
router.get('/dicom/status', checkPermission('imaging', 'view'), imagingController.dicomStatus);
router.post('/studies/:id/dicom/link', checkPermission('imaging', 'acquire'), imagingController.linkDicom);
router.get('/studies/:id/dicom', checkPermission('imaging', 'view'), imagingController.getDicomImages);
// ── OHDSI OMOP CDM PostgreSQL Integration & Research Export ─────────────────────
const omopCdmController = require('../controllers/omopCdmController');
router.get('/omop/status', checkPermission('imaging', 'view'), omopCdmController.getStatus);
router.post('/omop/init-schema', checkPermission('imaging', 'view'), omopCdmController.initSchema);
router.post('/omop/sync', checkPermission('imaging', 'view'), omopCdmController.syncData);
router.get('/omop/export-sql', checkPermission('imaging', 'view'), omopCdmController.exportSql);

module.exports = router;
