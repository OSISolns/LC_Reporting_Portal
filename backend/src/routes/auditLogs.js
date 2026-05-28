'use strict';
const express = require('express');
const router = express.Router();
const AuditLog = require('../models/auditLog');
const { authMiddleware } = require('../middleware/auth');
const authorizeRoles = require('../middleware/role');
const Notification = require('../models/notification');
const User = require('../models/user');
const { logAction } = require('../middleware/audit');
const { exportToExcel } = require('../utils/excel');

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

const formatDetails = (details) => {
  if (!details) return '';
  let parsed = details;
  if (typeof details === 'string') {
    try {
      parsed = JSON.parse(details);
    } catch (e) {
      return details;
    }
  }
  if (typeof parsed === 'object' && parsed !== null) {
    return Object.entries(parsed)
      .map(([k, v]) => {
        const label = k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        const val = typeof v === 'object' ? JSON.stringify(v) : String(v);
        return `${label}: ${val}`;
      })
      .join(' | ');
  }
  return String(details);
};

router.use(authorizeRoles(['admin']));

router.get('/export/excel', async (req, res, next) => {
  try {
    const logs = await AuditLog.getAll(req.query);

    const formattedData = logs.map(l => {
      let ip = l.ip_address || '';
      if (ip === '::1') ip = '127.0.0.1';
      if (ip.startsWith('::ffff:')) ip = ip.substring(7);

      return {
        created_at: l.created_at ? new Date(l.created_at).toLocaleString() : '',
        user_name: l.user_name || 'System',
        user_role: l.user_role ? l.user_role.replace(/_/g, ' ').toUpperCase() : 'SYSTEM',
        action: l.action || '',
        entity_type: l.entity_type ? l.entity_type.replace(/_/g, ' ').toUpperCase() : '',
        ip_address: ip,
        details: formatDetails(l.details)
      };
    });

    const columns = [
      { header: 'Timestamp', key: 'created_at', width: 25 },
      { header: 'User', key: 'user_name', width: 25 },
      { header: 'Role', key: 'user_role', width: 20 },
      { header: 'Action', key: 'action', width: 25 },
      { header: 'Entity', key: 'entity_type', width: 20 },
      { header: 'IP Address', key: 'ip_address', width: 20 },
      { header: 'Details', key: 'details', width: 60 }
    ];

    const workbook = await exportToExcel('Audit Logs', columns, formattedData);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="Audit_Logs.xlsx"');

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const logs = await AuditLog.getAll(req.query);
    res.json({ success: true, data: logs });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
