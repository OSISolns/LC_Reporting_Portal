'use strict';
const db = require('../config/db');

class AuditLog {
  static async getAll(filters = {}) {
    let query = `
      SELECT * FROM audit_logs
      WHERE 1=1
    `;
    const params = [];

    if (filters.entityType) {
      params.push(filters.entityType);
      query += ` AND entity_type = $${params.length}`;
    }
    if (filters.action) {
      params.push(filters.action);
      query += ` AND action = $${params.length}`;
    }

    query += ` ORDER BY created_at DESC LIMIT 500`;
    const { rows } = await db.query(query, params);
    return rows;
  }

  static async findByEntity(entityType, entityId) {
    const { rows } = await db.query(
      `SELECT * FROM audit_logs 
       WHERE entity_type = $1 AND entity_id = $2 
       ORDER BY created_at DESC`,
      [entityType, entityId]
    );
    return rows;
  }
}

module.exports = AuditLog;
