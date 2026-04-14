'use strict';
const express = require('express');
const router = express.Router();
const AuditLog = require('../models/auditLog');
const { authMiddleware } = require('../middleware/auth');
const authorizeRoles = require('../middleware/role');

router.use(authMiddleware);
router.use(authorizeRoles(['admin']));

router.get('/', async (req, res, next) => {
  try {
    const logs = await AuditLog.getAll(req.query);
    res.json({ success: true, data: logs });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
