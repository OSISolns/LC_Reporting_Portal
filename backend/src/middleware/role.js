'use strict';
const { logAction } = require('./audit');
const Notification = require('../models/notification');
const User = require('../models/user');

/**
 * Middleware to restrict access based on user roles.
 * @param {...string} allowedRoles - List of authorized roles.
 */
function authorizeRoles(...allowedRoles) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const roles = Array.isArray(allowedRoles[0]) ? allowedRoles[0] : allowedRoles;
    if (!roles.includes(req.user.role)) {
      // 🚨 Security Violation Detected
      try {
        const path = req.originalUrl || req.url;
        await logAction(req, 'SECURITY_VIOLATION', 'system_module', null, { 
          reason: 'Unauthorized role access attempt',
          path: path,
          method: req.method,
          requiredRoles: roles
        });

        // Notify Administrators
        const admins = await User.findByRole('admin');
        for (const admin of admins) {
          await Notification.create({
            userId: admin.id,
            title: 'Security Alert: Access Denied',
            message: `${req.user.full_name} (${req.user.role}) attempted to access restricted module: ${path}`,
            type: 'error',
            link: '/audit-logs'
          });
        }
      } catch (e) {
        console.error('Failed to log security violation:', e);
      }

      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    
    next();
  };
}

module.exports = authorizeRoles;
