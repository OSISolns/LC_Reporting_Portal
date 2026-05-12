'use strict';
const jwt = require('jsonwebtoken');

/**
 * Middleware to verify JWT and attach user info to request.
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }
  const { logAction } = require('./audit');

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Contains id, role, fullName
    next();
  } catch (error) {
    const msg = error.name === 'TokenExpiredError' ? 'Session expired' : 'Invalid token';
    try {
      logAction(req, 'AUTH_FAILURE', 'system', 0, { reason: msg, token_snippet: token.substring(0, 10) });
    } catch (e) {}
    return res.status(401).json({ success: false, message: msg });
  }
}

/**
 * Role-based access control with logging
 */
function roleGuard(allowedRoles) {
  return async (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      const { logAction } = require('./audit');
      try {
        await logAction(req, 'PERMISSION_DENIED', 'system', req.user?.id || 0, {
          path: req.originalUrl,
          required: allowedRoles,
          actual: req.user?.role || 'anonymous'
        });
      } catch (e) {}
      return res.status(403).json({ success: false, message: 'Access denied: insufficient permissions.' });
    }
    next();
  };
}

module.exports = { authMiddleware, roleGuard };
