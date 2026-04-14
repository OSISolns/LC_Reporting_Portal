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
    const ipAddress = req?.ip || req?.headers?.['x-forwarded-for'] || req?.socket?.remoteAddress || 'unknown';

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
