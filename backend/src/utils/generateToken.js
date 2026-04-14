'use strict';
const jwt = require('jsonwebtoken');

/**
 * Generates a JWT for the authenticated user.
 * @param {Object} user - User object containing id, role, full_name.
 * @returns {string} - Signed JWT.
 */
function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
      full_name: user.full_name || user.fullName,
      email: user.email
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '8h'
    }
  );
}

module.exports = generateToken;
