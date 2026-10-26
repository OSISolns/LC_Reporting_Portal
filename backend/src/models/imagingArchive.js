'use strict';
const db = require('../config/db');
const ImagingStudy = require('./imagingStudy');

class ImagingArchive {
  static async create({
    studyId = null,
    accessionNumber = null,
    patientId,
    patientName,
    modality,
    bodyRegion = 'General',
    seriesName = 'Diagnostic Series',
    sliceIndex = 1,
    fileName,
    fileType,
    fileSizeBytes = 0,
    fileBase64,
    thumbnailBase64 = null,
    clinicalNotes = null,
    metadataJson = null,
    uploadedBy = null,
    uploadedByName = null,
  }) {
    const normModality = ImagingStudy.normalizeModality(modality || 'X-Ray');
    const metaStr = metadataJson ? (typeof metadataJson === 'string' ? metadataJson : JSON.stringify(metadataJson)) : null;

    const { rows } = await db.query(
      `INSERT INTO imaging_archives (
        study_id, accession_number, patient_id, patient_name, modality,
        body_region, series_name, slice_index, file_name, file_type,
        file_size_bytes, file_base64, thumbnail_base64, clinical_notes,
        metadata_json, uploaded_by, uploaded_by_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *`,
      [
        studyId,
        accessionNumber,
        patientId,
        patientName,
        normModality,
        bodyRegion,
        seriesName,
        sliceIndex,
        fileName,
        fileType,
        fileSizeBytes,
        fileBase64,
        thumbnailBase64,
        clinicalNotes,
        metaStr,
        uploadedBy,
        uploadedByName,
      ]
    );

    return rows[0];
  }

  static async getAll({
    search = '',
    modality = '',
    patientId = '',
    bodyRegion = '',
    studyId = null,
    startDate = '',
    endDate = '',
    limit = 100,
    offset = 0,
  } = {}) {
    let sql = `
      SELECT id, study_id, accession_number, patient_id, patient_name,
             modality, body_region, series_name, slice_index, file_name,
             file_type, file_size_bytes, thumbnail_base64, clinical_notes,
             metadata_json, uploaded_by, uploaded_by_name, created_at, updated_at
      FROM imaging_archives
      WHERE 1=1
    `;
    const params = [];

    if (studyId) {
      sql += ` AND study_id = ?`;
      params.push(studyId);
    }

    if (modality && modality !== 'ALL') {
      sql += ` AND UPPER(modality) = UPPER(?)`;
      params.push(modality);
    }

    if (patientId) {
      sql += ` AND (patient_id = ? OR patient_id LIKE ?)`;
      params.push(patientId, `%${patientId}%`);
    }

    if (bodyRegion && bodyRegion !== 'ALL') {
      sql += ` AND LOWER(body_region) LIKE LOWER(?)`;
      params.push(`%${bodyRegion}%`);
    }

    if (startDate) {
      sql += ` AND created_at >= ?`;
      params.push(startDate);
    }

    if (endDate) {
      sql += ` AND created_at <= ?`;
      params.push(endDate + 'T23:59:59Z');
    }

    if (search && search.trim()) {
      const term = `%${search.trim().toLowerCase()}%`;
      sql += ` AND (
        LOWER(patient_name) LIKE ? OR
        LOWER(patient_id) LIKE ? OR
        LOWER(coalesce(accession_number, '')) LIKE ? OR
        LOWER(coalesce(series_name, '')) LIKE ? OR
        LOWER(coalesce(file_name, '')) LIKE ? OR
        LOWER(coalesce(clinical_notes, '')) LIKE ?
      )`;
      params.push(term, term, term, term, term, term);
    }

    // Count query
    const countSql = `SELECT COUNT(*) as total FROM imaging_archives WHERE 1=1 ${sql.replace(/^[\s\S]*?WHERE 1=1/, '')}`;
    const countRes = await db.query(countSql, params);
    const total = countRes.rows && countRes.rows[0] ? Number(countRes.rows[0].total) : 0;

    sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    const dataParams = [...params, Number(limit), Number(offset)];

    const { rows } = await db.query(sql, dataParams);
    return {
      archives: rows || [],
      total,
      limit: Number(limit),
      offset: Number(offset),
    };
  }

  static async getById(id, includeFile = false) {
    const fields = includeFile
      ? '*'
      : `id, study_id, accession_number, patient_id, patient_name,
         modality, body_region, series_name, slice_index, file_name,
         file_type, file_size_bytes, thumbnail_base64, clinical_notes,
         metadata_json, uploaded_by, uploaded_by_name, created_at, updated_at`;

    const { rows } = await db.query(
      `SELECT ${fields} FROM imaging_archives WHERE id = ?`,
      [id]
    );
    return rows[0] || null;
  }

  static async getByStudyId(studyId) {
    const { rows } = await db.query(
      `SELECT * FROM imaging_archives WHERE study_id = ? ORDER BY series_name ASC, slice_index ASC, id ASC`,
      [studyId]
    );
    return rows;
  }

  static async delete(id) {
    const { rows } = await db.query(
      `DELETE FROM imaging_archives WHERE id = ? RETURNING id`,
      [id]
    );
    return rows[0] || null;
  }

  static async getStatsByModality() {
    const { rows } = await db.query(`
      SELECT modality, count(*) as count, sum(file_size_bytes) as total_size_bytes
      FROM imaging_archives
      GROUP BY modality
      ORDER BY count DESC
    `);
    return rows;
  }
}

module.exports = ImagingArchive;
