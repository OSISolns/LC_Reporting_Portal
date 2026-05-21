'use strict';
const db = require('../config/db');

class Feedback {
  static async create(data) {
    const {
      contactInfo, feedbackDate,
      receptionCallCenter, nursing, doctorsRoom,
      receptionCashier, callCenter, tabaraService,
      laboratory, laboratoryResults, cafetaria, imaging, concernDescription
    } = data;

    const { rows } = await db.query(
      `INSERT INTO patient_feedbacks (
        contact_info, feedback_date,
        reception_call_center, nursing, doctors_room,
        reception_cashier, call_center, tabara_service,
        laboratory, laboratory_results, cafetaria, imaging,
        concern_description
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        contactInfo || null,
        feedbackDate || null,
        receptionCallCenter ? 1 : 0,
        nursing ? 1 : 0,
        doctorsRoom ? 1 : 0,
        receptionCashier ? 1 : 0,
        callCenter ? 1 : 0,
        tabaraService ? 1 : 0,
        laboratory ? 1 : 0,
        laboratoryResults ? 1 : 0,
        cafetaria ? 1 : 0,
        imaging ? 1 : 0,
        concernDescription
      ]
    );

    return rows[0];
  }

  static async getAll(filters = {}) {
    let query = `SELECT * FROM patient_feedbacks WHERE 1=1`;
    const params = [];

    if (filters.contact) {
      params.push(`%${filters.contact}%`);
      query += ` AND contact_info LIKE $${params.length}`;
    }

    if (filters.date) {
      params.push(filters.date);
      query += ` AND feedback_date = $${params.length}`;
    }

    query += ` ORDER BY created_at DESC LIMIT 200`;
    const { rows } = await db.query(query, params);
    return rows;
  }

  static async delete(id) {
    const { rows } = await db.query(
      `DELETE FROM patient_feedbacks WHERE id = $1 RETURNING *`,
      [id]
    );
    return rows[0];
  }
}

module.exports = Feedback;
