'use strict';
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const ctrl = require('../controllers/archiveController');

// All archive routes require authentication
router.use(authMiddleware);

// Upload a document (multipart/form-data)
router.post('/upload', ctrl.upload.single('file'), ctrl.uploadDocument);

// List documents (paginated, filtered, classification-gated)
router.get('/', ctrl.listDocuments);

// Get document metadata (no file body)
router.get('/:id', ctrl.getDocumentMeta);

// Download document file (base64 + mime)
router.get('/:id/download', ctrl.downloadDocument);

// Update document metadata
router.patch('/:id', ctrl.updateDocumentMeta);

// Delete document (manager+ only)
router.delete('/:id', ctrl.deleteDocument);

// Get access log for a document (manager+ only)
router.get('/:id/log', ctrl.getDocumentAccessLog);

module.exports = router;
