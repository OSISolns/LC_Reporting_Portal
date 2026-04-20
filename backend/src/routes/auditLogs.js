'use strict';
const express = require('express');
const router = express.Router();
const AuditLog = require('../models/auditLog');
const { authMiddleware } = require('../middleware/auth');
const authorizeRoles = require('../middleware/role');
const Notification = require('../models/notification');
const User = require('../models/user');
const { logAction } = require('../middleware/audit');

router.use(authMiddleware);

// POST /api/audit/report-violation
router.post('/report-violation', async (req, res, next) => {
  try {
    const { path } = req.body;
    await logAction(req, 'SECURITY_VIOLATION_UI', 'ui_route', null, { path });

    // Notify Administrators
    const admins = await User.findByRole('admin');
    for (const admin of admins) {
      await Notification.create({
        userId: admin.id,
        title: 'Security Alert: UI Bypass Attempt',
        message: `${req.user.full_name} (${req.user.role}) attempted to bypass UI navigation to: ${path}`,
        type: 'error',
        link: '/audit-logs'
      });
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.use(authorizeRoles(['admin', 'it_officer']));

router.get('/', async (req, res, next) => {
  try {
    const logs = await AuditLog.getAll(req.query);
    res.json({ success: true, data: logs });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
