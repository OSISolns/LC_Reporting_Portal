'use strict';
const db = require('../config/db');

/**
 * Middleware to log actions to the audit_logs table.
 * This is usually called after a successful operation.
 */
async function logAction(req, action, entityType, entityId, details = {}) {
  try {
    const userId = (req && req.user) ? req.user.id : null;
    const userName = (req && req.user) ? req.user.full_name : 'System';
    const userRole = (req && req.user) ? req.user.role : 'System';
    let ipAddress = req?.headers?.['x-forwarded-for'] || req?.ip || req?.socket?.remoteAddress || 'unknown';

    // Extract the original client IP if x-forwarded-for contains proxy chains
    if (ipAddress && ipAddress.includes(',')) {
      ipAddress = ipAddress.split(',')[0].trim();
    }

    // Normalize IPv6 localhost loopback
    if (ipAddress === '::1') {
      ipAddress = '127.0.0.1';
    }

    // Normalize IPv6-mapped IPv4 addresses (strip the prefix ::ffff:)
    if (ipAddress && ipAddress.startsWith('::ffff:')) {
      ipAddress = ipAddress.substring(7);
    }

    await db.query(
      `INSERT INTO audit_logs (user_id, user_name, user_role, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [userId, userName, userRole, action, entityType, entityId, JSON.stringify(details), ipAddress]
    );
  } catch (err) {
    console.error('Audit Log Error:', err);
    // We don't call next(err) here because audit failure shouldn't necessarily crash the request
  }
}

module.exports = { logAction };
