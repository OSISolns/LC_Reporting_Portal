'use strict';
const jwt = require('jsonwebtoken');
const db  = require('../config/db');

/**
 * Verifies the JWT in the Authorization header and attaches
 * req.user = { id, full_name, email, role, role_id }
 */
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      const msg = err.name === 'TokenExpiredError' ? 'Session expired. Please log in again.' : 'Invalid token.';
      return res.status(401).json({ success: false, message: msg });
    }

    // Verify user still exists and is active
    const { rows } = await db.query(
      `SELECT u.id, u.full_name, u.email, u.is_active, r.name AS role, r.id AS role_id
       FROM users u JOIN roles r ON u.role_id = r.id
       WHERE u.id = $1`,
      [decoded.id]
    );

    if (!rows.length || !rows[0].is_active) {
      return res.status(401).json({ success: false, message: 'Account not found or deactivated.' });
    }

    req.user = rows[0];
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { authenticate };
