'use strict';

const express = require('express');
const router = express.Router();
const multer = require('multer');
const rosterController = require('../controllers/rosterController');
const { authMiddleware } = require('../middleware/auth');

// Configure multer memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
  fileFilter: (_req, file, cb) => {
    if (
      file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.originalname.toLowerCase().endsWith('.docx')
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only .docx files are supported.'));
    }
  }
});

router.use(authMiddleware);

router.post('/parse', upload.single('file'), rosterController.parseRoster);
router.post('/save-manual', rosterController.saveManualRoster);
router.get('/history', rosterController.getScheduleHistory);
router.delete('/history/:id', rosterController.deleteScheduleHistory);
router.post('/history/bulk-delete', rosterController.bulkDeleteScheduleHistory);
router.get('/download/:id', rosterController.downloadScheduleDocx);
router.post('/analyze-ai', rosterController.analyzeSchedulesWithAI);

// KaziSync API Gateway endpoints
router.get('/kazi/roster', rosterController.getRoster);
router.get('/kazi/attendance', rosterController.getAttendance);
router.get('/kazi/staff', rosterController.getKaziStaff);
router.get('/kazi/reports/pdf', rosterController.downloadPdf);

router.get('/kazi/reports/excel', rosterController.downloadExcel);

module.exports = router;
