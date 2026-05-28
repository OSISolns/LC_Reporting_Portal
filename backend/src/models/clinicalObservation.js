'use strict';
const db = require('../config/db');

class ClinicalObservation {
  static async create(data, userId) {
    const {
      patient_id, queue_id, patient_name, ward, bed,
      identification, triage, progress_notes, medication_mar, sbar, status
    } = data;

    const { rows } = await db.query(
      `INSERT INTO clinical_observations (
        patient_id, queue_id, patient_name, ward, bed,
        identification_json, triage_json, progress_notes_json, 
        medication_mar_json, sbar_json, status, created_by, is_mock
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        patient_id, queue_id, patient_name, ward, bed,
        JSON.stringify(identification),
        JSON.stringify(triage),
        JSON.stringify(progress_notes),
        JSON.stringify(medication_mar),
        JSON.stringify(sbar),
        status || 'Draft',
        userId,
        data.isReviewer ? 1 : 0
      ]
    );
    return rows[0];
  }

  static async update(patient_id, queue_id, data, user = null) {
    const {
      identification, triage, progress_notes, medication_mar, sbar, status
    } = data;

    let sql = `UPDATE clinical_observations 
       SET identification_json = $1,
           triage_json = $2,
           progress_notes_json = $3,
           medication_mar_json = $4,
           sbar_json = $5,
           status = $6,
           updated_at = CURRENT_TIMESTAMP
       WHERE patient_id = $7 AND queue_id = $8`;
    
    const params = [
      JSON.stringify(identification),
      JSON.stringify(triage),
      JSON.stringify(progress_notes),
      JSON.stringify(medication_mar),
      JSON.stringify(sbar),
      status,
      patient_id,
      queue_id
    ];

    if (user && user.role === 'reviewer') {
      sql += ` AND is_mock = 1`;
    }

    sql += ` RETURNING *`;

    const { rows } = await db.query(sql, params);
    return rows[0];
  }

  static async findByPatientAndQueue(patient_id, queue_id, user = null) {
    let query = `SELECT * FROM clinical_observations WHERE patient_id = $1 AND queue_id = $2`;
    const params = [patient_id, queue_id];

    if (user && user.role === 'reviewer') {
      query += ` AND is_mock = 1`;
    }

    const { rows } = await db.query(query, params);
    if (!rows[0]) return null;
    
    const row = rows[0];
    return {
      ...row,
      identification: JSON.parse(row.identification_json || '{}'),
      triage: JSON.parse(row.triage_json || '{}'),
      progress_notes: JSON.parse(row.progress_notes_json || '[]'),
      medication_mar: JSON.parse(row.medication_mar_json || '{}'),
      sbar: JSON.parse(row.sbar_json || '{}')
    };
  }

  static async getRecent(userId, userRole, limit = 10) {
    let query = `SELECT * FROM clinical_observations WHERE created_by = $1`;
    const params = [userId];

    if (userRole === 'reviewer') {
      query += ` AND is_mock = 1`;
    }

    query += ` ORDER BY updated_at DESC LIMIT $2`;
    params.push(limit);

    const { rows } = await db.query(query, params);
    return rows;
  }
  static async getAllByPatient(patient_id) {
    const { rows } = await db.query(
      `SELECT id, patient_id, queue_id, patient_name, ward, bed, status, created_by, created_at, updated_at
       FROM clinical_observations
       WHERE patient_id = $1
       ORDER BY updated_at DESC`,
      [patient_id]
    );
    return rows;
  }
}

module.exports = ClinicalObservation;
