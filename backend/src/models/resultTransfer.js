'use strict';
const db = require('../config/db');

class ResultTransfer {
  static async create(data, userId) {
    const {
      transferDate, oldSid, newSid, reason
    } = data;

    const { rows } = await db.query(
      `INSERT INTO results_transfers (
        transfer_date, old_sid, new_sid, reason,
        created_by, status
      ) VALUES ($1, $2, $3, $4, $5, 'pending')
      RETURNING *`,
      [transferDate, oldSid, newSid, reason, userId]
    );
    return rows[0];
  }

  static async getAll(filters = {}) {
    let query = `
      SELECT t.*,
             u1.full_name AS creator_name,
             u2.full_name AS reviewer_name,
             u3.full_name AS approver_name
      FROM results_transfers t
      LEFT JOIN users u1 ON t.created_by  = u1.id
      LEFT JOIN users u2 ON t.reviewed_by = u2.id
      LEFT JOIN users u3 ON t.approved_by = u3.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.status) {
      params.push(filters.status);
      query += ` AND t.status = $${params.length}`;
    }
    if (filters.sid) {
      const sidPattern = `%${filters.sid}%`;
      params.push(sidPattern, sidPattern);
      query += ` AND (t.old_sid LIKE $${params.length - 1} OR t.new_sid LIKE $${params.length})`;
    }

    query += ` ORDER BY t.created_at DESC LIMIT 100`;
    const { rows } = await db.query(query, params);
    return rows;
  }

  static async findById(id) {
    const { rows } = await db.query(
      `SELECT t.*,
              u1.full_name AS creator_name,
              u2.full_name AS reviewer_name,
              u3.full_name AS approver_name,
              u4.full_name AS rejector_name
       FROM results_transfers t
       LEFT JOIN users u1 ON t.created_by  = u1.id
       LEFT JOIN users u2 ON t.reviewed_by = u2.id
       LEFT JOIN users u3 ON t.approved_by = u3.id
       LEFT JOIN users u4 ON t.rejected_by = u4.id
       WHERE t.id = $1`,
      [id]
    );
    return rows[0];
  }

  static async review(id, userId) {
    const { rows } = await db.query(
      `UPDATE results_transfers
       SET status = 'reviewed', reviewed_by = $1, reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND status = 'pending'
       RETURNING *`,
      [userId, id]
    );
    return rows[0];
  }

  static async approve(id, userId, editedByName) {
    const { rows } = await db.query(
      `UPDATE results_transfers
       SET status = 'approved', approved_by = $1, edited_by_name = $2, approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND status = 'reviewed'
       RETURNING *`,
      [userId, editedByName, id]
    );
    return rows[0];
  }

  static async reject(id, userId, comment) {
    const { rows } = await db.query(
      `UPDATE results_transfers
       SET status = 'rejected', rejected_by = $1, rejection_comment = $2, rejected_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND status IN ('pending','reviewed')
       RETURNING *`,
      [userId, comment, id]
    );
    return rows[0];
  }

  static async delete(id) {
    const { rows } = await db.query(
      `DELETE FROM results_transfers WHERE id = $1 AND status = 'pending' RETURNING *`,
      [id]
    );
    return rows[0];
  }
}

module.exports = ResultTransfer;
