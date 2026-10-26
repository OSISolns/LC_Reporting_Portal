'use strict';
const db = require('../config/db');
const crypto = require('crypto');

class ImagingShare {
  static generateShareToken() {
    return 'sh_' + crypto.randomBytes(16).toString('hex');
  }

  static async create({
    studyId = null,
    archiveId = null,
    patientId,
    patientName,
    modality,
    providerId = null,
    providerName,
    providerEmail = null,
    sharedByUserId = null,
    sharedByName = null,
    urgency = 'routine',
    clinicalIndication = null,
    consultationNotes = null,
    canViewImages = 1,
    canViewReport = 1,
    canDownload = 1,
    expiresInDays = 30,
  }) {
    const shareToken = this.generateShareToken();
    let expiresAt = null;
    if (expiresInDays && Number(expiresInDays) > 0) {
      const exp = new Date();
      exp.setDate(exp.getDate() + Number(expiresInDays));
      expiresAt = exp.toISOString();
    }

    const { rows } = await db.query(
      `INSERT INTO imaging_shares (
        study_id, archive_id, patient_id, patient_name, modality,
        provider_id, provider_name, provider_email,
        shared_by_user_id, shared_by_name, share_token,
        urgency, clinical_indication, consultation_notes,
        can_view_images, can_view_report, can_download,
        status, view_count, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'shared', 0, ?)
      RETURNING *`,
      [
        studyId,
        archiveId,
        patientId,
        patientName,
        modality,
        providerId,
        providerName,
        providerEmail,
        sharedByUserId,
        sharedByName,
        shareToken,
        urgency,
        clinicalIndication,
        consultationNotes,
        canViewImages ? 1 : 0,
        canViewReport ? 1 : 0,
        canDownload ? 1 : 0,
        expiresAt,
      ]
    );

    return rows[0];
  }

  static async getAll({
    search = '',
    providerName = '',
    providerId = null,
    modality = '',
    studyId = null,
    status = '',
    limit = 50,
    offset = 0,
  } = {}) {
    let whereClauses = [];
    let params = [];

    if (search && search.trim()) {
      whereClauses.push('(patient_id LIKE ? OR patient_name LIKE ? OR provider_name LIKE ? OR clinical_indication LIKE ?)');
      const s = `%${search.trim()}%`;
      params.push(s, s, s, s);
    }

    if (providerName && providerName.trim()) {
      whereClauses.push('provider_name LIKE ?');
      params.push(`%${providerName.trim()}%`);
    }

    if (providerId) {
      whereClauses.push('provider_id = ?');
      params.push(providerId);
    }

    if (modality && modality.trim()) {
      whereClauses.push('modality = ?');
      params.push(modality.trim());
    }

    if (studyId) {
      whereClauses.push('study_id = ?');
      params.push(studyId);
    }

    if (status && status.trim()) {
      whereClauses.push('status = ?');
      params.push(status.trim());
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countRes = await db.query(
      `SELECT COUNT(*) as total FROM imaging_shares ${whereSql}`,
      params
    );
    const total = countRes.rows && countRes.rows[0] ? Number(countRes.rows[0].total) : 0;

    const dataRes = await db.query(
      `SELECT 
        s.*,
        st.accession_number,
        st.exam_region as body_part,
        st.status as study_status,
        st.scheduled_at as study_date
       FROM imaging_shares s
       LEFT JOIN imaging_studies st ON s.study_id = st.id
       ${whereSql}
       ORDER BY s.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, Number(limit), Number(offset)]
    );

    return {
      shares: dataRes.rows || [],
      total,
      limit: Number(limit),
      offset: Number(offset),
    };
  }

  static async getById(id) {
    const { rows } = await db.query(
      `SELECT 
        s.*,
        st.accession_number,
        st.exam_region as body_part,
        st.status as study_status,
        st.scheduled_at as study_date
       FROM imaging_shares s
       LEFT JOIN imaging_studies st ON s.study_id = st.id
       WHERE s.id = ?`,
      [id]
    );
    return rows[0] || null;
  }

  static async getByToken(token) {
    const { rows } = await db.query(
      `SELECT 
        s.*,
        st.accession_number,
        st.exam_region as body_part,
        st.status as study_status,
        st.scheduled_at as study_date
       FROM imaging_shares s
       LEFT JOIN imaging_studies st ON s.study_id = st.id
       WHERE s.share_token = ?`,
      [token]
    );
    return rows[0] || null;
  }

  static async getSharedForProvider(providerIdentifier, limit = 50) {
    // Matches by provider_name or provider_email or provider_id
    const { rows } = await db.query(
      `SELECT 
        s.*,
        st.accession_number,
        st.exam_region as body_part,
        st.status as study_status,
        st.scheduled_at as study_date
       FROM imaging_shares s
       LEFT JOIN imaging_studies st ON s.study_id = st.id
       WHERE (s.provider_name LIKE ? OR s.provider_email = ? OR s.provider_id = ?)
         AND (s.expires_at IS NULL OR s.expires_at > (strftime('%Y-%m-%dT%H:%M:%fZ','now')))
         AND s.status != 'revoked'
       ORDER BY s.created_at DESC
       LIMIT ?`,
      [`%${providerIdentifier}%`, providerIdentifier, isNaN(providerIdentifier) ? -1 : Number(providerIdentifier), Number(limit)]
    );
    return rows || [];
  }

  static async recordView(idOrToken) {
    const now = new Date().toISOString();
    const isNum = !isNaN(idOrToken) && typeof idOrToken !== 'string';
    const query = isNum
      ? `UPDATE imaging_shares SET view_count = view_count + 1, last_viewed_at = ?, status = 'viewed' WHERE id = ? RETURNING *`
      : `UPDATE imaging_shares SET view_count = view_count + 1, last_viewed_at = ?, status = 'viewed' WHERE share_token = ? OR id = ? RETURNING *`;
    const params = isNum ? [now, idOrToken] : [now, idOrToken, isNaN(idOrToken) ? -1 : Number(idOrToken)];
    const { rows } = await db.query(query, params);
    return rows[0] || null;
  }

  static async updateStatus(id, status) {
    const { rows } = await db.query(
      `UPDATE imaging_shares SET status = ? WHERE id = ? RETURNING *`,
      [status, id]
    );
    return rows[0] || null;
  }

  static async revoke(id) {
    return this.updateStatus(id, 'revoked');
  }

  static async getStats() {
    const { rows } = await db.query(`
      SELECT 
        COUNT(*) as total_shares,
        SUM(CASE WHEN status = 'shared' THEN 1 ELSE 0 END) as pending_views,
        SUM(CASE WHEN status = 'viewed' THEN 1 ELSE 0 END) as viewed_shares,
        SUM(CASE WHEN urgency = 'urgent' OR urgency = 'stat' THEN 1 ELSE 0 END) as urgent_shares
      FROM imaging_shares
      WHERE status != 'revoked'
    `);
    return rows[0] || { total_shares: 0, pending_views: 0, viewed_shares: 0, urgent_shares: 0 };
  }
}

module.exports = ImagingShare;
