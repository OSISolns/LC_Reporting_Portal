'use strict';

const express = require('express');
const router  = express.Router();
const Feedback = require('../models/feedback');
const { authMiddleware } = require('../middleware/auth');
const checkPermission = require('../middleware/permission');

// ── POST /api/feedbacks (Publicly Accessible) ───────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    const { concernDescription } = req.body;
    if (!concernDescription || concernDescription.trim() === '') {
      return res.status(400).json({ success: false, message: 'Description of concern is required.' });
    }

    const newFeedback = await Feedback.create(req.body);
    res.status(201).json({ success: true, data: newFeedback, message: 'Thank you for your feedback!' });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/feedbacks (Restricted Access) ───────────────────────────────────
router.get('/', authMiddleware, checkPermission('feedbacks', 'view'), async (req, res, next) => {
  try {
    const list = await Feedback.getAll(req.query);
    const { logAction } = require('../middleware/audit');
    await logAction(req, 'VIEW_FEEDBACKS', 'feedback', null, {
      query: req.query,
      recordsCount: list.length
    });
    res.json({ success: true, data: list });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/feedbacks/:id (Restricted Access) ────────────────────────────
router.delete('/:id', authMiddleware, checkPermission('feedbacks', 'delete'), async (req, res, next) => {
  try {
    res.status(403).json({ success: false, message: 'Deletion of internal feedback records is strictly prohibited for audit and compliance integrity.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
