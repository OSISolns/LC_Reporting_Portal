'use strict';
const db = require('../config/db');

class Service {
  /**
   * Fetch all active services with optional default provider details
   */
  static async getAll({ search = '', category = null, department = null, activeOnly = true } = {}) {
    let sql = `
      SELECT s.id, s.code, s.name, s.department, s.category, s.default_provider_id, s.is_active, s.created_at,
             p.name as default_provider_name
      FROM services s
      LEFT JOIN providers p ON s.default_provider_id = p.id
      WHERE 1=1
    `;
    const params = [];

    if (activeOnly) {
      sql += ` AND s.is_active = 1`;
    }

    if (category) {
      sql += ` AND LOWER(s.category) = LOWER(?)`;
      params.push(category);
    }

    if (department) {
      sql += ` AND LOWER(s.department) = LOWER(?)`;
      params.push(department);
    }

    if (search && search.trim()) {
      const term = `%${search.trim().toLowerCase()}%`;
      sql += ` AND (LOWER(s.name) LIKE ? OR LOWER(coalesce(s.code, '')) LIKE ? OR LOWER(coalesce(s.department, '')) LIKE ?)`;
      params.push(term, term, term);
    }

    sql += ` ORDER BY s.name ASC`;

    const { rows } = await db.query(sql, params);
    return rows;
  }

  static async findById(id) {
    const { rows } = await db.query(
      `SELECT s.*, p.name as default_provider_name FROM services s LEFT JOIN providers p ON s.default_provider_id = p.id WHERE s.id = ?`,
      [id]
    );
    return rows[0] || null;
  }

  static async findByCode(code) {
    const { rows } = await db.query(
      `SELECT s.*, p.name as default_provider_name FROM services s LEFT JOIN providers p ON s.default_provider_id = p.id WHERE LOWER(s.code) = LOWER(?)`,
      [code]
    );
    return rows[0] || null;
  }
}

module.exports = Service;
