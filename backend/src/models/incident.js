'use strict';
const db = require('../config/db');

class Incident {
  static async create(data, userId) {
    const {
      incidentType, department, areaOfIncident, namesInvolved,
      pidNumber, description, contributingFactors,
      immediateActions, preventionMeasures
    } = data;

    const { rows } = await db.query(
      `INSERT INTO incident_reports (
        incident_type, department, area_of_incident, names_involved,
        pid_number, description, contributing_factors,
        immediate_actions, prevention_measures, created_by, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending')
      RETURNING *`,
      [
        incidentType, department, areaOfIncident, namesInvolved,
        pidNumber, description, contributingFactors,
        immediateActions, preventionMeasures, userId
      ]
    );
    return rows[0];
  }

  static async getAll(filters = {}, user = null) {
    let query = `
      SELECT i.*, u.full_name as creator_name, r.full_name as reviewer_name
      FROM incident_reports i
      LEFT JOIN users u ON i.created_by = u.id
      LEFT JOIN users r ON i.reviewed_by = r.id
      WHERE 1=1
    `;
    const params = [];

    // Access control: regular users only see their own reports
    if (user && !['coo', 'chairman', 'deputy_coo', 'quality_assurance', 'admin'].includes(user.role)) {
      params.push(user.id);
      query += ` AND i.created_by = $${params.length}`;
    }

    if (filters.status) {
      params.push(filters.status);
      query += ` AND i.status = $${params.length}`;
    }
    if (filters.type) {
      params.push(filters.type);
      query += ` AND i.incident_type = $${params.length}`;
    }
    if (filters.department) {
      params.push(`%${filters.department}%`);
      query += ` AND i.department ILIKE $${params.length}`;
    }

    query += ` ORDER BY i.created_at DESC LIMIT 100`;
    const { rows } = await db.query(query, params);
    return rows;
  }

  static async findById(id) {
    const { rows } = await db.query(
      `SELECT i.*, u.full_name as creator_name, r.full_name as reviewer_name
       FROM incident_reports i
       LEFT JOIN users u ON i.created_by = u.id
       LEFT JOIN users r ON i.reviewed_by = r.id
       WHERE i.id = $1`,
      [id]
    );
    return rows[0];
  }

  static async review(id, reviewerId, comments) {
    const { rows } = await db.query(
      `UPDATE incident_reports 
       SET status = 'reviewed',
           reviewed_by = $1,
           reviewed_at = NOW(),
           review_comments = $2,
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [reviewerId, comments, id]
    );
    return rows[0];
  }
}

module.exports = Incident;
