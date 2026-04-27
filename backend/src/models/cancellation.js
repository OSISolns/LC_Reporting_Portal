'use strict';
const db = require('../config/db');

class Cancellation {
  static async create(data, userId) {
    const {
      patientFullName, pidNumber, oldSidNumber, newSidNumber,
      telephoneNumber, insurancePayer, totalAmountCancelled,
      originalReceiptNumber, rectifiedReceiptNumber,
      initialTransactionDate, rectifiedDate, reasonForCancellation, billedBy
    } = data;

    // Convert empty strings to null for date/numeric fields to satisfy PG constraints
    const cleanDate = (d) => (d && d.trim() !== '' ? d : null);
    const cleanAmount = (a) => (a && a.toString().trim() !== '' ? a : null);

    const { rows } = await db.query(
      `INSERT INTO cancellation_requests (
        patient_full_name, pid_number, old_sid_number, new_sid_number,
        telephone_number, insurance_payer, total_amount_cancelled,
        original_receipt_number, rectified_receipt_number,
        initial_transaction_date, rectified_date, reason_for_cancellation,
        created_by, status, billed_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'pending', $14)
      RETURNING *`,
      [
        patientFullName, pidNumber, oldSidNumber, newSidNumber,
        telephoneNumber, insurancePayer, cleanAmount(totalAmountCancelled),
        originalReceiptNumber, rectifiedReceiptNumber,
        cleanDate(initialTransactionDate), cleanDate(rectifiedDate), reasonForCancellation,
        userId, billedBy || null
      ]
    );
    return rows[0];
  }


  static async getAll(filters = {}) {
    let query = `
      SELECT c.*,
             u1.full_name AS creator_name,
             u2.full_name AS verifier_name,
             u3.full_name AS approver_name,
             u5.full_name AS billed_by_name,
             r1.name AS creator_role,
             r5.name AS billed_by_role,
             CASE WHEN spr.id IS NOT NULL THEN true ELSE false END as is_rated
      FROM cancellation_requests c
      LEFT JOIN users u1 ON c.created_by  = u1.id
      LEFT JOIN roles r1 ON u1.role_id    = r1.id
      LEFT JOIN users u2 ON c.verified_by = u2.id
      LEFT JOIN users u3 ON c.approved_by = u3.id
      LEFT JOIN users u5 ON c.billed_by   = u5.id
      LEFT JOIN roles r5 ON u5.role_id    = r5.id
      LEFT JOIN staff_performance_ratings spr ON spr.request_type = 'cancellation' AND spr.request_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.status) {
      params.push(filters.status);
      query += ` AND c.status = $${params.length}`;
    }
    if (filters.created_by) {
      params.push(filters.created_by);
      query += ` AND c.created_by = $${params.length}`;
    }
    if (filters.pid) {
      params.push(`%${filters.pid}%`);
      query += ` AND c.pid_number ILIKE $${params.length}`;
    }
    if (filters.patientName) {
      params.push(`%${filters.patientName}%`);
      query += ` AND c.patient_full_name ILIKE $${params.length}`;
    }

    query += ` ORDER BY c.created_at DESC LIMIT 100`;
    const { rows } = await db.query(query, params);
    return rows;
  }

  static async findById(id) {
    const { rows } = await db.query(
      `SELECT c.*, 
              u1.full_name as creator_name, 
              u2.full_name as verifier_name, 
              u3.full_name as approver_name,
              u4.full_name as rejector_name,
              u5.full_name as billed_by_name,
              CASE WHEN spr.id IS NOT NULL THEN true ELSE false END as is_rated
       FROM cancellation_requests c
       LEFT JOIN users u1 ON c.created_by = u1.id
       LEFT JOIN users u2 ON c.verified_by = u2.id
       LEFT JOIN users u3 ON c.approved_by = u3.id
       LEFT JOIN users u4 ON c.rejected_by = u4.id
       LEFT JOIN users u5 ON c.billed_by = u5.id
       LEFT JOIN staff_performance_ratings spr ON spr.request_type = 'cancellation' AND spr.request_id = c.id
       WHERE c.id = $1`,
      [id]
    );
    return rows[0];
  }

  static async verify(id, userId) {
    const { rows } = await db.query(
      `UPDATE cancellation_requests 
       SET status = 'verified', verified_by = $1, verified_at = NOW(), updated_at = NOW()
       WHERE id = $2 AND status = 'pending'
       RETURNING *`,
      [userId, id]
    );
    return rows[0];
  }

  static async approve(id, userId) {
    const { rows } = await db.query(
      `UPDATE cancellation_requests 
       SET status = 'approved', approved_by = $1, approved_at = NOW(), updated_at = NOW()
       WHERE id = $2 AND status = 'verified'
       RETURNING *`,
      [userId, id]
    );
    return rows[0];
  }

  static async reject(id, userId, comment) {
    const { rows } = await db.query(
      `UPDATE cancellation_requests 
       SET status = 'rejected', rejected_by = $1, rejection_comment = $2, rejected_at = NOW(), updated_at = NOW()
       WHERE id = $3 AND status IN ('pending', 'verified')
       RETURNING *`,
      [userId, comment, id]
    );
    return rows[0];
  }

  static async delete(id) {
    const { rows } = await db.query(
      `DELETE FROM cancellation_requests WHERE id = $1 AND status = 'pending' RETURNING *`,
      [id]
    );
    return rows[0];
  }
}

module.exports = Cancellation;
