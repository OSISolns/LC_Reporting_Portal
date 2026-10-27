'use strict';
const db = require('../config/db');

async function getValidFk(table, id) {
  if (!id || !Number.isInteger(Number(id)) || Number(id) <= 0) return null;
  try {
    const { rows } = await db.query(`SELECT id FROM ${table} WHERE id = ?`, [Number(id)]);
    return (rows && rows.length > 0) ? rows[0].id : null;
  } catch (_) {
    return null;
  }
}

class Refund {
  static async create(data, userId) {
    const {
      patientFullName, pidNumber, sidNumber,
      telephoneNumber, insurancePayer,
      momoCode, totalAmountPaid, amountToBeRefunded,
      amountPaidBy, originalReceiptNumber,
      initialTransactionDate, reasonForRefund, billedBy,
      serviceName, service_name, service,
      providerId, provider_id, providerName, provider_name, provider
    } = data;
    const selectedService = serviceName || service_name || service || null;
    let selectedProviderId = providerId || provider_id || null;
    let selectedProviderName = providerName || provider_name || provider || null;

    if (selectedProviderId && !selectedProviderName) {
      try {
        const { rows: provRows } = await db.query('SELECT name FROM providers WHERE id = ?', [selectedProviderId]);
        if (provRows.length > 0) selectedProviderName = provRows[0].name;
      } catch (pErr) { /* fallback */ }
    } else if (!selectedProviderId && selectedProviderName && typeof selectedProviderName === 'string') {
      try {
        const { rows: provRows } = await db.query('SELECT id, name FROM providers WHERE LOWER(name) = LOWER(?) LIMIT 1', [selectedProviderName.trim()]);
        if (provRows.length > 0) {
          selectedProviderId = provRows[0].id;
          selectedProviderName = provRows[0].name;
        }
      } catch (pErr) { /* fallback */ }
    }

    const initialStatus = (data.status === 'draft' || data.isDraft) ? 'draft' : 'pending';

    if (initialStatus !== 'draft') {
      if (!selectedService || !selectedService.trim()) {
        const error = new Error('Service / Clinical Specialty is mandatory.');
        error.status = 400;
        throw error;
      }
      if (!selectedProviderName || !selectedProviderName.trim()) {
        const error = new Error('Attending Provider is mandatory for refund requests.');
        error.status = 400;
        throw error;
      }
    }

    // Prevent duplicate: Check for existing active/approved request for this SID
    if (sidNumber && sidNumber.trim() !== '') {
      const existing = await db.query(
        `SELECT id FROM refund_requests WHERE sid_number ILIKE $1 AND status NOT IN ('rejected', 'draft') LIMIT 1`,
        [sidNumber]
      );
      if (existing.rows.length > 0) {
        const error = new Error('A refund request for this SID already exists.');
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
    const cleanAmount = (a) => (a !== undefined && a !== null && a.toString().trim() !== '' ? a : null);

    const [validProviderId, validCreatedBy, validBilledBy] = await Promise.all([
      getValidFk('providers', selectedProviderId),
      getValidFk('users', userId),
      getValidFk('users', billedBy),
    ]);

    const { rows } = await db.query(
      `INSERT INTO refund_requests (
        patient_full_name, pid_number, sid_number,
        telephone_number, insurance_payer,
        momo_code, total_amount_paid, amount_to_be_refunded,
        amount_paid_by, original_receipt_number,
        initial_transaction_date, reason_for_refund,
        created_by, status, billed_by, service_name, provider_id, provider_name
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
      RETURNING *`,
      [
        patientFullName, pidNumber, sidNumber,
        telephoneNumber, insurancePayer,
        momoCode, cleanAmount(totalAmountPaid), cleanAmount(amountToBeRefunded),
        amountPaidBy, originalReceiptNumber,
        cleanDate(initialTransactionDate), reasonForRefund,
        validCreatedBy, initialStatus, validBilledBy, selectedService,
        validProviderId, selectedProviderName
      ]
    );
    return rows[0];
  }

  static async update(id, data) {
    const {
      patientFullName, pidNumber, sidNumber,
      telephoneNumber, insurancePayer,
      momoCode, totalAmountPaid, amountToBeRefunded,
      amountPaidBy, originalReceiptNumber,
      initialTransactionDate, reasonForRefund, billedBy,
      serviceName, service_name, service,
      providerId, provider_id, providerName, provider_name, provider
    } = data;
    const selectedService = serviceName !== undefined ? serviceName : (service_name !== undefined ? service_name : (service !== undefined ? service : null));
    let selectedProviderId = providerId !== undefined ? providerId : (provider_id !== undefined ? provider_id : null);
    let selectedProviderName = providerName !== undefined ? providerName : (provider_name !== undefined ? provider_name : (provider !== undefined ? provider : null));

    if (selectedProviderId && !selectedProviderName) {
      try {
        const { rows: provRows } = await db.query('SELECT name FROM providers WHERE id = ?', [selectedProviderId]);
        if (provRows.length > 0) selectedProviderName = provRows[0].name;
      } catch (pErr) { /* fallback */ }
    }

    if (sidNumber && sidNumber.trim() !== '') {
      const existing = await db.query(
        `SELECT id FROM refund_requests WHERE sid_number ILIKE $1 AND id != $2 AND status NOT IN ('rejected', 'draft') LIMIT 1`,
        [sidNumber, id]
      );
      if (existing.rows.length > 0) {
        const error = new Error('A refund request for this SID already exists.');
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

    const [validProviderId, validBilledBy] = await Promise.all([
      selectedProviderId !== undefined ? getValidFk('providers', selectedProviderId) : undefined,
      billedBy !== undefined ? getValidFk('users', billedBy) : undefined,
    ]);

    const { rows } = await db.query(
      `UPDATE refund_requests SET
        patient_full_name = $1,
        pid_number = $2,
        sid_number = $3,
        telephone_number = $4,
        insurance_payer = $5,
        momo_code = $6,
        total_amount_paid = $7,
        amount_to_be_refunded = $8,
        amount_paid_by = $9,
        original_receipt_number = $10,
        initial_transaction_date = $11,
        reason_for_refund = $12,
        billed_by = COALESCE($13, billed_by),
        status = COALESCE($14, status),
        service_name = COALESCE($15, service_name),
        provider_id = COALESCE($16, provider_id),
        provider_name = COALESCE($17, provider_name),
        updated_at = NOW()
      WHERE id = $18 AND (status = 'pending' OR status = 'draft')
      RETURNING *`,
      [
        patientFullName, pidNumber, sidNumber,
        telephoneNumber, insurancePayer,
        momoCode, cleanAmount(totalAmountPaid), cleanAmount(amountToBeRefunded),
        amountPaidBy, originalReceiptNumber,
        cleanDate(initialTransactionDate), reasonForRefund,
        validBilledBy || null, data.status || null, selectedService,
        validProviderId !== undefined ? validProviderId : null, selectedProviderName, id
      ]
    );
    return rows[0];
  }

  static async getAll(filters = {}) {
    let query = `
      SELECT r.*,
             u1.full_name AS creator_name,
             u2.full_name AS verifier_name,
             u3.full_name AS approver_name,
             u5.full_name AS billed_by_name,
             r1.name AS creator_role,
             r5.name AS billed_by_role,
             CASE WHEN spr.id IS NOT NULL THEN true ELSE false END as is_rated
      FROM refund_requests r
      LEFT JOIN users u1 ON r.created_by  = u1.id
      LEFT JOIN roles r1 ON u1.role_id    = r1.id
      LEFT JOIN users u2 ON r.verified_by = u2.id
      LEFT JOIN users u3 ON r.approved_by = u3.id
      LEFT JOIN users u5 ON r.billed_by   = u5.id
      LEFT JOIN roles r5 ON u5.role_id    = r5.id
      LEFT JOIN staff_performance_ratings spr ON spr.request_type = 'refund' AND spr.request_id = r.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.status) {
      params.push(filters.status);
      query += ` AND r.status = $${params.length}`;
    } else if (filters.created_by) {
      params.push(filters.created_by);
      query += ` AND r.created_by = $${params.length}`;
    } else if (filters.user_id) {
      params.push(filters.user_id);
      query += ` AND (r.status != 'draft' OR r.created_by = $${params.length})`;
    } else {
      query += ` AND r.status != 'draft'`;
    }

    if (filters.service || filters.serviceName) {
      params.push(filters.service || filters.serviceName);
      query += ` AND r.service_name = $${params.length}`;
    }

    if (filters.provider || filters.providerName || filters.providerId) {
      if (filters.providerId) {
        params.push(parseInt(filters.providerId, 10));
        query += ` AND r.provider_id = $${params.length}`;
      } else {
        params.push(`%${(filters.provider || filters.providerName).trim()}%`);
        query += ` AND r.provider_name ILIKE $${params.length}`;
      }
    }

    if (filters.search && filters.search.trim()) {
      const term = `%${filters.search.trim()}%`;
      params.push(term);
      const p = `$${params.length}`;
      query += ` AND (
        r.patient_full_name ILIKE ${p} OR 
        r.pid_number ILIKE ${p} OR 
        r.sid_number ILIKE ${p} OR 
        r.momo_code ILIKE ${p} OR 
        r.original_receipt_number ILIKE ${p} OR 
        r.reason_for_refund ILIKE ${p} OR
        r.service_name ILIKE ${p} OR
        r.provider_name ILIKE ${p} OR
        u1.full_name ILIKE ${p}
      )`;
    } else {
      if (filters.pid) {
        params.push(`%${filters.pid}%`);
        query += ` AND r.pid_number ILIKE $${params.length}`;
      }
      if (filters.patientName) {
        params.push(`%${filters.patientName}%`);
        query += ` AND r.patient_full_name ILIKE $${params.length}`;
      }
    }

    query += ` ORDER BY r.created_at DESC LIMIT 100`;
    const { rows } = await db.query(query, params);
    return rows;
  }

  static async findById(id) {
    let query = `SELECT r.*,
              u1.full_name AS creator_name,
              u2.full_name AS verifier_name,
              u3.full_name AS approver_name,
              u4.full_name AS rejector_name,
              u5.full_name AS billed_by_name,
              u6.full_name AS supporting_document_uploader_name,
              CASE WHEN spr.id IS NOT NULL THEN true ELSE false END as is_rated
       FROM refund_requests r
       LEFT JOIN users u1 ON r.created_by  = u1.id
       LEFT JOIN users u2 ON r.verified_by = u2.id
       LEFT JOIN users u3 ON r.approved_by = u3.id
       LEFT JOIN users u4 ON r.rejected_by = u4.id
       LEFT JOIN users u5 ON r.billed_by   = u5.id
       LEFT JOIN users u6 ON r.supporting_document_uploaded_by = u6.id
       LEFT JOIN staff_performance_ratings spr ON spr.request_type = 'refund' AND spr.request_id = r.id
       WHERE r.id = $1`;
    const params = [id];

    const { rows } = await db.query(query, params);
    return rows[0];
  }

  static async uploadSupportingDocument(id, fileBase64, fileName, userId) {
    const validUserId = await getValidFk('users', userId);
    const { rows } = await db.query(
      `UPDATE refund_requests
       SET supporting_document_base64 = $1,
           supporting_document_name = $2,
           supporting_document_uploaded_by = $3,
           supporting_document_uploaded_at = NOW(),
           updated_at = NOW()
       WHERE id = $4
       RETURNING id, supporting_document_name, supporting_document_uploaded_at, supporting_document_uploaded_by`,
      [fileBase64, fileName, validUserId, id]
    );
    return rows[0];
  }

  static async getSupportingDocument(id) {
    const { rows } = await db.query(
      `SELECT id, supporting_document_base64, supporting_document_name FROM refund_requests WHERE id = $1`,
      [id]
    );
    return rows[0];
  }

  static async verify(id, userId) {
    const validUserId = await getValidFk('users', userId);
    const { rows } = await db.query(
      `UPDATE refund_requests
       SET status = 'verified', verified_by = $1, verified_at = NOW(), updated_at = NOW()
       WHERE id = $2 AND status = 'pending'
       RETURNING *`,
      [validUserId, id]
    );
    return rows[0];
  }

  static async approve(id, userId) {
    const validUserId = await getValidFk('users', userId);
    const { rows } = await db.query(
      `UPDATE refund_requests
       SET status = 'approved', approved_by = $1, approved_at = NOW(), updated_at = NOW()
       WHERE id = $2 AND status = 'verified'
       RETURNING *`,
      [validUserId, id]
    );
    return rows[0];
  }

  static async reject(id, userId, comment) {
    const validUserId = await getValidFk('users', userId);
    const { rows } = await db.query(
      `UPDATE refund_requests
       SET status = 'rejected', rejected_by = $1, rejection_comment = $2, rejected_at = NOW(), updated_at = NOW()
       WHERE id = $3 AND status IN ('pending','verified')
       RETURNING *`,
      [validUserId, comment, id]
    );
    return rows[0];
  }

  static async delete(id) {
    const { rows } = await db.query(
      `DELETE FROM refund_requests WHERE id = $1 AND status = 'pending' RETURNING *`,
      [id]
    );
    return rows[0];
  }
}

module.exports = Refund;
