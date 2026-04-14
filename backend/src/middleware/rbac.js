'use strict';

/**
 * RBAC middleware to restrict access based on user roles.
 * @param {string[]} allowedRoles - Array of role names that are allowed to access the route.
 */
function authorize(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    if (allowedRoles.length && !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Authorized roles: ${allowedRoles.join(', ')}`,
      });
    }

    next();
  };
}

module.exports = { authorize };
