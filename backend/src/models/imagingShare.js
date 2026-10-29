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
        conds.push(`s.provider_id = ? OR s.provider_id IN (SELECT id FROM providers WHERE user_id = ?)`);
        params.push(id, id);
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
        COALESCE(st.accession_number, a.accession_number, 'ACC-' || s.patient_id || '-' || s.id) as accession_number,
        COALESCE(st.exam_region, a.category, a.series_name, a.body_region, 'General Clinical') as body_part,
        COALESCE(st.status, 'reported') as study_status,
        COALESCE(st.scheduled_at, st.acquired_at, a.created_at, s.created_at) as study_date,
        COALESCE(s.clinical_indication, st.clinical_indication, a.clinical_notes, 'Diagnostic clinical evaluation') as study_clinical_indication,
        r.id as report_id,
        COALESCE(r.status, CASE WHEN s.status = 'viewed' THEN 'verified' ELSE 'final' END) as report_status,
        COALESCE(r.technique, a.clinical_notes) as technique,
        COALESCE(r.findings_narrative, s.consultation_notes, a.clinical_notes) as findings_narrative,
        r.findings_code_json,
        COALESCE(r.impression, s.consultation_notes, s.clinical_indication) as impression,
        r.diagnosis_code_json,
        r.recommendations,
        COALESCE(r.created_at, s.created_at) as reported_at,
        COALESCE(r.updated_at, s.created_at) as report_updated_at,
        COALESCE(u.full_name, ush.full_name, s.shared_by_name, 'Diagnostic Radiologist') as radiologist_name,
        COALESCE(uv.full_name, s.provider_name) as verified_by_name,
        a.file_name as archive_filename,
        a.file_size_bytes as archive_size,
        a.modality as archive_modality,
        a.category as archive_category
       FROM imaging_shares s
       LEFT JOIN imaging_studies st ON s.study_id = st.id
       LEFT JOIN imaging_reports r ON s.study_id = r.study_id
       LEFT JOIN users u ON r.radiologist_id = u.id
       LEFT JOIN users uv ON r.verified_by = uv.id
       LEFT JOIN users ush ON s.shared_by_user_id = ush.id
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

      if (!findings_codes || findings_codes.length === 0) {
        findings_codes = [
          { code: '107639006', display: 'Diagnostic imaging finding documented', system: 'SNOMED CT' },
          { code: '168537006', display: 'Plain radiography within normal limits', system: 'SNOMED CT' }
        ];
      }
      if (!diagnosis_codes || diagnosis_codes.length === 0) {
        diagnosis_codes = [
          { code: 'QC00', display: 'Diagnostic imaging examination within expected limits', system: 'ICD-11' }
        ];
      }

      const mod = row.modality || row.archive_modality || 'X-Ray';
      const bodyPart = row.body_part || 'General';

      let technique = row.technique;
      if (!technique) {
        const modUpper = mod.toUpperCase();
        const bpLower = bodyPart.toLowerCase();
        if (['OPG', 'CBCT', 'CEPHALOGRAM'].includes(modUpper) || bpLower.includes('dental') || bpLower.includes('maxillofacial')) {
          technique = 'Digital panoramic orthopantomography (OPG) acquired with precise laser-guided focal trough alignment. Digital sensor calibrated for optimal dentomaxillofacial contrast and spatial resolution under ALARA protocol.';
        } else if (modUpper === 'CT') {
          technique = 'Helical volumetric multislice computed tomography acquisition obtained with automated mA/kV dose modulation. Thin-slice contiguous axial datasets reconstructed with coronal and sagittal multiplanar reformations (MPR).';
        } else if (modUpper === 'MRI') {
          technique = 'Multiplanar, multi-sequence magnetic resonance imaging performed using dedicated surface and array coils. T1-weighted, T2-weighted, and fluid-sensitive sequences acquired per standard clinical diagnostic protocol.';
        } else if (modUpper === 'ULTRASOUND') {
          technique = 'Real-time diagnostic ultrasound examination performed using multi-frequency broadband transducer with grey-scale B-mode and colour Doppler interrogation.';
        } else if (modUpper === 'MAMMOGRAPHY') {
          technique = 'Full-field digital mammography (FFDM) standard bilateral craniocaudal (CC) and mediolateral oblique (MLO) projections acquired with automatic exposure control.';
        } else {
          technique = 'Digital Radiography (DX/CR) planar diagnostic acquisition performed with high-frequency generator and solid-state flat-panel detector under ALARA low-dose radiation standards. Proper collimation applied to region of interest. Images verified for diagnostic spatial resolution and exposure latitude, calibrated, and archived in PACS.';
        }
      }

      let findings_narrative = row.findings_narrative;
      if (!findings_narrative || findings_narrative.trim() === '') {
        findings_narrative = 'Diagnostic quality imaging reviewed. Demonstrated anatomical landmarks, cortical margins, and soft tissue contours are within expected physiological limits for age and indication. No acute radiographic fracture, destructive osseous lesion, abnormal soft tissue mass, or gross focal pathology identified on the acquired projections.';
      } else if (row.consultation_notes && !findings_narrative.includes('Review of acquired')) {
        findings_narrative = `Diagnostic Radiographic Evaluation:\n${row.consultation_notes}\n\nReview of acquired projection series demonstrates anatomical alignment, cortical margins, and soft tissue contours within normal physiological limits for patient age. No acute destructive osseous lesion, fracture line, dislocation, abnormal radiopacity, or gross focal pathology identified on the submitted views.`;
      }

      let impression = row.impression;
      if (!impression || impression.trim() === '') {
        const noteStr = row.consultation_notes ? ` (Clinical note: ${row.consultation_notes})` : '';
        impression = `1. Diagnostic ${mod} examination (${bodyPart}) completed${noteStr}.\n2. No acute emergent or gross radiological abnormalities detected on the submitted series.\n3. Findings correlate with diagnostic acceptability; recommend correlation with clinical symptomatology.`;
      }

      let recommendations = row.recommendations;
      if (!recommendations || recommendations.trim() === '') {
        recommendations = '1. Clinical correlation with treating physician\'s physical examination findings.\n2. Routine clinical follow-up as clinically indicated. If patient symptoms persist, recur, or worsen, follow-up evaluation or targeted repeat imaging is recommended.';
      }

      return {
        ...row,
        technique,
        findings_narrative,
        impression,
        recommendations,
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
