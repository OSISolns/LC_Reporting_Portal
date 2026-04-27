'use strict';
const Permission = require('../models/permission');

/**
 * Middleware to check for granular functional permissions.
 * @param {string} module - The system module name.
 * @param {string} action - The action requested (view, create, edit, approve, reject).
 */
const checkPermission = (module, action) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      // Admin has bypass for all permissions
      if (req.user.role === 'admin') {
        return next();
      }

      const hasAccess = await Permission.check(req.user.id, req.user.role, module, action);
      
      if (!hasAccess) {
        return res.status(403).json({ 
          success: false, 
          message: `Access denied. You do not have permission to ${action} in ${module}.` 
        });
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};

module.exports = checkPermission;
