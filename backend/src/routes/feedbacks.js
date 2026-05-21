'use strict';

const express = require('express');
const router  = express.Router();
const Feedback = require('../models/feedback');
const { authMiddleware } = require('../middleware/auth');
const authorizeRoles = require('../middleware/role');

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
router.get('/', authMiddleware, authorizeRoles(['coo']), async (req, res, next) => {
  try {
    const list = await Feedback.getAll(req.query);
    res.json({ success: true, data: list });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/feedbacks/:id (Restricted Access) ────────────────────────────
router.delete('/:id', authMiddleware, authorizeRoles(['coo']), async (req, res, next) => {
  try {
    const deleted = await Feedback.delete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Feedback record not found.' });
    }
    res.json({ success: true, message: 'Feedback entry successfully removed.', data: deleted });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
