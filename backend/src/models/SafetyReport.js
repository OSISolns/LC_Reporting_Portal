'use strict';
const db = require('../config/db');

class SafetyReport {
  static async create(data, userId) {
    const { title, periodStart, periodEnd, executiveSummary, keyFindings, recommendations } = data;
    const { rows } = await db.query(
      `INSERT INTO safety_reports (
        title, period_start, period_end, executive_summary, key_findings, recommendations, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [title, periodStart, periodEnd, executiveSummary, keyFindings, recommendations, userId]
    );
    return rows[0];
  }

  static async getAll() {
    const { rows } = await db.query(`
      SELECT s.*, u.full_name as creator_name
      FROM safety_reports s
      LEFT JOIN users u ON s.created_by = u.id
      ORDER BY s.created_at DESC
    `);
    return rows;
  }

  static async findById(id) {
    const { rows } = await db.query(`
      SELECT s.*, u.full_name as creator_name
      FROM safety_reports s
      LEFT JOIN users u ON s.created_by = u.id
      WHERE s.id = $1
    `, [id]);
    return rows[0];
  }

  static async delete(id) {
    const { rows } = await db.query('DELETE FROM safety_reports WHERE id = $1 RETURNING *', [id]);
    return rows[0];
  }
}

module.exports = SafetyReport;
