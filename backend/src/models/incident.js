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
    if (user && !['coo', 'chairman', 'deputy_coo', 'admin', 'it_officer', 'principal_cashier', 'sales_manager', 'hsfp'].includes(user.role)) {
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
    let query = `SELECT i.*,
              u.full_name as creator_name,
              a.full_name as approver_name
       FROM incident_reports i
       LEFT JOIN users u ON i.created_by = u.id
       LEFT JOIN users a ON i.approved_by = a.id
       WHERE i.id = $1`;
    const params = [id];

    const { rows } = await db.query(query, params);
    return rows[0];
  }

  static async approve(id, approverId, data) {
    const {
      comments,
      rca_environment,
      rca_staff,
      rca_equipment,
      rca_policy,
      rca_verification_json,
      corrective_actions_json
    } = data;

    const { rows } = await db.query(
      `UPDATE incident_reports
       SET status = 'approved',
           approved_by = $1,
           approved_at = NOW(),
           hsfp_comments = $2,
           rca_environment = $3,
           rca_staff = $4,
           rca_equipment = $5,
           rca_policy = $6,
           rca_verification_json = $7,
           corrective_actions_json = $8,
           updated_at = NOW()
       WHERE id = $9 AND status = 'pending'
       RETURNING *`,
      [
        approverId,
        comments,
        rca_environment,
        rca_staff,
        rca_equipment,
        rca_policy,
        rca_verification_json,
        corrective_actions_json,
        id
      ]
    );
    return rows[0];
  }

  static async delete(id) {
    const { rows } = await db.query(
      `DELETE FROM incident_reports WHERE id = $1 AND status = 'pending' RETURNING *`,
      [id]
    );
    return rows[0];
  }
}

module.exports = Incident;
