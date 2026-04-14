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
        immediate_actions, prevention_measures, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        incidentType, department, areaOfIncident, namesInvolved,
        pidNumber, description, contributingFactors,
        immediateActions, preventionMeasures, userId
      ]
    );
    return rows[0];
  }

  static async getAll(filters = {}) {
    let query = `
      SELECT i.*, u.full_name as creator_name
      FROM incident_reports i
      LEFT JOIN users u ON i.created_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.type) {
      params.push(filters.type);
      query += ` AND i.incident_type = $${params.length}`;
    }
    if (filters.department) {
      params.push(`%${filters.department}%`);
      query += ` AND i.department ILIKE $${params.length}`;
    }

    query += ` ORDER BY i.created_at DESC`;
    const { rows } = await db.query(query, params);
    return rows;
  }

  static async findById(id) {
    const { rows } = await db.query(
      `SELECT i.*, u.full_name as creator_name
       FROM incident_reports i
       LEFT JOIN users u ON i.created_by = u.id
       WHERE i.id = $1`,
      [id]
    );
    return rows[0];
  }
}

module.exports = Incident;
