'use strict';

/**
 * Middleware to restrict access based on user roles.
 * @param {...string} allowedRoles - List of authorized roles.
 */
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const roles = Array.isArray(allowedRoles[0]) ? allowedRoles[0] : allowedRoles;
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    
    next();
  };
}

module.exports = authorizeRoles;
