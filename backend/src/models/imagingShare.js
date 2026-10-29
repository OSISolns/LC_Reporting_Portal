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

    // Verify foreign keys to prevent SQLite code 787 FOREIGN KEY constraint failed
    let validStudyId = null;
    if (studyId && Number.isInteger(Number(studyId)) && Number(studyId) > 0) {
      try {
        const checkStudy = await db.query('SELECT id FROM imaging_studies WHERE id = ?', [Number(studyId)]);
        if (checkStudy.rows && checkStudy.rows.length > 0) validStudyId = checkStudy.rows[0].id;
      } catch (e) { validStudyId = null; }
    }

    let validArchiveId = null;
    if (archiveId && Number.isInteger(Number(archiveId)) && Number(archiveId) > 0) {
      try {
        const checkArchive = await db.query('SELECT id FROM imaging_archives WHERE id = ?', [Number(archiveId)]);
        if (checkArchive.rows && checkArchive.rows.length > 0) validArchiveId = checkArchive.rows[0].id;
      } catch (e) { validArchiveId = null; }
    }

    let validSharedByUserId = null;
    if (sharedByUserId && Number.isInteger(Number(sharedByUserId)) && Number(sharedByUserId) > 0) {
      try {
        const checkUser = await db.query('SELECT id FROM users WHERE id = ?', [Number(sharedByUserId)]);
        if (checkUser.rows && checkUser.rows.length > 0) validSharedByUserId = checkUser.rows[0].id;
      } catch (e) { validSharedByUserId = null; }
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
        validStudyId,
        validArchiveId,
        patientId,
        patientName,
        modality,
        providerId,
        providerName,
        providerEmail,
        validSharedByUserId,
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
    let name = '';
    let email = '';
    let id = -1;
    let username = '';
    let role = '';

    if (typeof providerIdentifier === 'object' && providerIdentifier !== null) {
      name = providerIdentifier.name || '';
      email = providerIdentifier.email || '';
      id = providerIdentifier.id && !isNaN(providerIdentifier.id) ? Number(providerIdentifier.id) : -1;
      username = providerIdentifier.username || '';
      role = providerIdentifier.role || '';
    } else if (typeof providerIdentifier === 'string') {
      name = providerIdentifier;
      email = providerIdentifier;
      id = !isNaN(providerIdentifier) ? Number(providerIdentifier) : -1;
      username = providerIdentifier;
    }

    const isAdminOrDirector = ['admin', 'medical_director', 'clinical_director', 'coo', 'deputy_coo'].includes(role);

    let whereClause = `WHERE (s.expires_at IS NULL OR s.expires_at > (strftime('%Y-%m-%dT%H:%M:%fZ','now'))) AND s.status != 'revoked'`;
    const params = [];

    if (!isAdminOrDirector || (name || email || id > 0 || username)) {
      const conds = [];
      if (id > 0) {
        conds.push(`s.provider_id = ?`);
        params.push(id);
      }
      if (email) {
        conds.push(`LOWER(s.provider_email) = LOWER(?)`);
        params.push(email);
      }
      if (name) {
        conds.push(`LOWER(s.provider_name) LIKE LOWER(?)`);
        params.push(`%${name}%`);
      }
      if (username) {
        conds.push(`LOWER(s.provider_name) LIKE LOWER(?)`);
        params.push(`%${username}%`);
      }

      if (conds.length > 0) {
        whereClause += ` AND (${conds.join(' OR ')})`;
      }
    }

    params.push(Number(limit) || 100);

    const { rows } = await db.query(
      `SELECT 
        s.*,
        st.accession_number,
        st.exam_region as body_part,
        st.status as study_status,
        st.scheduled_at as study_date,
        st.clinical_notes as study_clinical_notes,
        r.id as report_id,
        r.status as report_status,
        r.technique,
        r.findings_narrative,
        r.findings_code_json,
        r.impression,
        r.diagnosis_code_json,
        r.recommendations,
        r.created_at as reported_at,
        r.updated_at as report_updated_at,
        u.full_name as radiologist_name,
        uv.full_name as verified_by_name,
        a.original_filename as archive_filename,
        a.file_size_bytes as archive_size,
        a.frame_count as archive_frame_count,
        a.modality as archive_modality
       FROM imaging_shares s
       LEFT JOIN imaging_studies st ON s.study_id = st.id
       LEFT JOIN imaging_reports r ON s.study_id = r.study_id
       LEFT JOIN users u ON r.radiologist_id = u.id
       LEFT JOIN users uv ON r.verified_by = uv.id
       LEFT JOIN imaging_archives a ON s.archive_id = a.id
       ${whereClause}
       ORDER BY s.created_at DESC
       LIMIT ?`,
      params
    );

    return (rows || []).map(row => {
      let findings_codes = [];
      let diagnosis_codes = [];
      try {
        if (row.findings_code_json) findings_codes = JSON.parse(row.findings_code_json);
      } catch (_) {}
      try {
        if (row.diagnosis_code_json) diagnosis_codes = JSON.parse(row.diagnosis_code_json);
      } catch (_) {}
      return {
        ...row,
        findings_codes,
        diagnosis_codes,
      };
    });
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
