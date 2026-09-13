'use strict';
const jwt = require('jsonwebtoken');
const { decryptField } = require('./crypto');

/**
 * Generates a JWT for the authenticated user.
 * @param {Object} user - User object containing id, role, full_name.
 * @returns {string} - Signed JWT.
 */
function generateToken(user) {
  const fullNameRaw = user.full_name || user.fullName;
  const decryptedName = decryptField(fullNameRaw);
  const decryptedEmail = decryptField(user.email);

  return jwt.sign(
    {
      id: user.id,
      role: user.role,
      username: user.username,
      full_name: decryptedName,
      fullName: decryptedName,
      email: decryptedEmail
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '8h'
    }
  );
}

module.exports = generateToken;
