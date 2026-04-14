'use strict';
const express = require('express');
const router = express.Router();
const AuditLog = require('../models/auditLog');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(authenticate);
router.use(authorize(['coo', 'chairman', 'admin']));

router.get('/', async (req, res, next) => {
  try {
    const logs = await AuditLog.getAll(req.query);
    res.json({ success: true, data: logs });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
