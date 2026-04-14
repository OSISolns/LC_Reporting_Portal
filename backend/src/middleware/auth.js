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

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Contains id, role, fullName
    next();
  } catch (error) {
    const msg = error.name === 'TokenExpiredError' ? 'Session expired' : 'Invalid token';
    return res.status(401).json({ success: false, message: msg });
  }
}

module.exports = { authMiddleware };
