'use strict';
const db = require('../config/db');

class Cancellation {
  static async create(data, userId) {
    const {
      patientFullName, pidNumber, oldSidNumber, newSidNumber,
      telephoneNumber, insurancePayer, totalAmountCancelled,
      originalReceiptNumber, rectifiedReceiptNumber,
      originalReceiptAmount, rectifiedReceiptAmount,
      initialTransactionDate, rectifiedDate, reasonForCancellation, billedBy
    } = data;

    // Validate: If old SID is present, new SID must be present
    if (oldSidNumber && oldSidNumber.trim() !== '' && (!newSidNumber || newSidNumber.trim() === '')) {
      const error = new Error('New SID is required when an Old SID is provided.');
      error.status = 400;
      throw error;
    }

    // Prevent duplicate: Check for existing active/approved request for this SID (only if old SID is provided)
    if (oldSidNumber && oldSidNumber.trim() !== '') {
      const existing = await db.query(
        `SELECT id FROM cancellation_requests WHERE old_sid_number ILIKE $1 AND status != 'rejected' LIMIT 1`,
        [oldSidNumber]
      );
      if (existing.rows.length > 0) {
        const error = new Error('A cancellation request for this SID already exists.');
        error.status = 400;
        throw error;
      }
    }

    const cleanDate = (d) => {
      if (!d || typeof d !== 'string' || d.trim() === '') return null;
      // If the value is a bare date (YYYY-MM-DD), append midnight UTC so
      // Prisma ≥6.x does not reject the value when reading it back from a DATETIME column.
      const s = /^\d{4}-\d{2}-\d{2}$/.test(d.trim()) ? d.trim() + 'T00:00:00.000Z' : d.trim();
      const parsed = new Date(s);
      if (isNaN(parsed.getTime())) return null;
      return parsed.toISOString();
    };
    const cleanAmount = (a) => (a !== undefined && a !== null && a.toString().trim() !== '' ? a : null);

    const { rows } = await db.query(
      `INSERT INTO cancellation_requests (
        patient_full_name, pid_number, old_sid_number, new_sid_number,
        telephone_number, insurance_payer, total_amount_cancelled,
        original_receipt_number, rectified_receipt_number,
        original_receipt_amount, rectified_receipt_amount,
        initial_transaction_date, rectified_date, reason_for_cancellation,
        created_by, status, billed_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *`,
      [
        patientFullName, pidNumber, oldSidNumber, newSidNumber,
        telephoneNumber, insurancePayer, cleanAmount(totalAmountCancelled),
        originalReceiptNumber, rectifiedReceiptNumber,
        cleanAmount(originalReceiptAmount), cleanAmount(rectifiedReceiptAmount),
        cleanDate(initialTransactionDate), cleanDate(rectifiedDate), reasonForCancellation,
        userId, 'pending', billedBy || null
      ]
    );
    return rows[0];
  }

  static async update(id, data) {
    const {
      patientFullName, pidNumber, oldSidNumber, newSidNumber,
      telephoneNumber, insurancePayer, totalAmountCancelled,
      originalReceiptNumber, rectifiedReceiptNumber,
      originalReceiptAmount, rectifiedReceiptAmount,
      initialTransactionDate, rectifiedDate, reasonForCancellation, billedBy
    } = data;

    if (oldSidNumber && oldSidNumber.trim() !== '' && (!newSidNumber || newSidNumber.trim() === '')) {
      const error = new Error('New SID is required when an Old SID is provided.');
      error.status = 400;
      throw error;
    }

    if (oldSidNumber && oldSidNumber.trim() !== '') {
      const existing = await db.query(
        `SELECT id FROM cancellation_requests WHERE old_sid_number ILIKE $1 AND id != $2 AND status != 'rejected' LIMIT 1`,
        [oldSidNumber, id]
      );
      if (existing.rows.length > 0) {
        const error = new Error('A cancellation request for this SID already exists.');
        error.status = 400;
        throw error;
      }
    }

    const cleanDate = (d) => {
      if (!d || typeof d !== 'string' || d.trim() === '') return null;
      const s = /^\d{4}-\d{2}-\d{2}$/.test(d.trim()) ? d.trim() + 'T00:00:00.000Z' : d.trim();
      const parsed = new Date(s);
      if (isNaN(parsed.getTime())) return null;
      return parsed.toISOString();
    };
    const cleanAmount = (a) => (a && a.toString().trim() !== '' ? a : null);

    const { rows } = await db.query(
      `UPDATE cancellation_requests SET
        patient_full_name = $1,
        pid_number = $2,
        old_sid_number = $3,
        new_sid_number = $4,
        telephone_number = $5,
        insurance_payer = $6,
        total_amount_cancelled = $7,
        original_receipt_number = $8,
        rectified_receipt_number = $9,
        original_receipt_amount = $10,
        rectified_receipt_amount = $11,
        initial_transaction_date = $12,
        rectified_date = $13,
        reason_for_cancellation = $14,
        billed_by = $15,
        updated_at = NOW()
      WHERE id = $16 AND status = 'pending'
      RETURNING *`,
      [
        patientFullName, pidNumber, oldSidNumber, newSidNumber,
        telephoneNumber, insurancePayer, cleanAmount(totalAmountCancelled),
        originalReceiptNumber, rectifiedReceiptNumber,
        cleanAmount(originalReceiptAmount), cleanAmount(rectifiedReceiptAmount),
        cleanDate(initialTransactionDate), cleanDate(rectifiedDate), reasonForCancellation,
        billedBy || null, id
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

    if (filters.search && filters.search.trim()) {
      const term = `%${filters.search.trim()}%`;
      params.push(term);
      const p = `$${params.length}`;
      query += ` AND (
        c.patient_full_name ILIKE ${p} OR 
        c.pid_number ILIKE ${p} OR 
        c.old_sid_number ILIKE ${p} OR 
        c.new_sid_number ILIKE ${p} OR 
        c.original_receipt_number ILIKE ${p} OR 
        c.rectified_receipt_number ILIKE ${p} OR
        c.reason_for_cancellation ILIKE ${p} OR
        u1.full_name ILIKE ${p}
      )`;
    } else {
      if (filters.pid && filters.pid.trim()) {
        params.push(`%${filters.pid.trim()}%`);
        query += ` AND c.pid_number ILIKE $${params.length}`;
      }
      if (filters.patientName && filters.patientName.trim()) {
        const term = `%${filters.patientName.trim()}%`;
        params.push(term);
        const p = `$${params.length}`;
        query += ` AND (c.patient_full_name ILIKE ${p} OR c.pid_number ILIKE ${p} OR c.old_sid_number ILIKE ${p})`;
      }
    }

    if (filters.startDate) {
      params.push(filters.startDate);
      query += ` AND c.created_at >= $${params.length}`;
    }
    if (filters.endDate) {
      params.push(`${filters.endDate}T23:59:59.999Z`);
      query += ` AND c.created_at <= $${params.length}`;
    }

    query += ` ORDER BY c.created_at DESC LIMIT 200`;
    const { rows } = await db.query(query, params);
    return rows;
  }

  static async findById(id) {
    let query = `SELECT c.*, 
              u1.full_name as creator_name, 
              u2.full_name as verifier_name, 
              u3.full_name as approver_name,
              u4.full_name as rejector_name,
              u5.full_name as billed_by_name,
              u6.full_name as supporting_document_uploader_name,
              CASE WHEN spr.id IS NOT NULL THEN true ELSE false END as is_rated
       FROM cancellation_requests c
       LEFT JOIN users u1 ON c.created_by = u1.id
       LEFT JOIN users u2 ON c.verified_by = u2.id
       LEFT JOIN users u3 ON c.approved_by = u3.id
       LEFT JOIN users u4 ON c.rejected_by = u4.id
       LEFT JOIN users u5 ON c.billed_by = u5.id
       LEFT JOIN users u6 ON c.supporting_document_uploaded_by = u6.id
       LEFT JOIN staff_performance_ratings spr ON spr.request_type = 'cancellation' AND spr.request_id = c.id
       WHERE c.id = $1`;
    const params = [id];

    const { rows } = await db.query(query, params);
    return rows[0];
  }

  static async uploadSupportingDocument(id, fileBase64, fileName, userId) {
    const { rows } = await db.query(
      `UPDATE cancellation_requests
       SET supporting_document_base64 = $1,
           supporting_document_name = $2,
           supporting_document_uploaded_by = $3,
           supporting_document_uploaded_at = NOW(),
           updated_at = NOW()
       WHERE id = $4
       RETURNING id, supporting_document_name, supporting_document_uploaded_at, supporting_document_uploaded_by`,
      [fileBase64, fileName, userId, id]
    );
    return rows[0];
  }

  static async getSupportingDocument(id) {
    const { rows } = await db.query(
      `SELECT id, supporting_document_base64, supporting_document_name FROM cancellation_requests WHERE id = $1`,
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
