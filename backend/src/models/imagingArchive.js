'use strict';
const db = require('../config/db');
const ImagingStudy = require('./imagingStudy');

const CATEGORIES = [
  'Dental & Maxillofacial',
  'Neuroradiology & Head/Neck',
  'Spine & Musculoskeletal',
  'Thoracic & Pulmonary',
  'Abdomen & Pelvis',
  "Women's Health & Breast",
  'Cardiovascular & Vascular',
  'General Clinical',
];

function inferCategory(modality, bodyRegion) {
  const mod = String(modality || '').toUpperCase();
  const reg = String(bodyRegion || '').toLowerCase();

  if (['OPG', 'CBCT', 'CEPHALOGRAM'].includes(mod) || reg.includes('dental') || reg.includes('teeth') || reg.includes('jaw') || reg.includes('mandible') || reg.includes('maxilla') || reg.includes('oral') || reg.includes('arch') || reg.includes('panoramic')) {
    return 'Dental & Maxillofacial';
  }
  if (reg.includes('brain') || reg.includes('head') || reg.includes('skull') || reg.includes('orbit') || reg.includes('sinus') || reg.includes('neck') || reg.includes('neuro') || reg.includes('pituitary')) {
    return 'Neuroradiology & Head/Neck';
  }
  if (reg.includes('spine') || reg.includes('c-s') || reg.includes('l-s') || reg.includes('t-s') || reg.includes('knee') || reg.includes('shoulder') || reg.includes('hip') || reg.includes('ankle') || reg.includes('wrist') || reg.includes('joint') || reg.includes('bone') || reg.includes('extremity') || reg.includes('msk') || reg.includes('femur') || reg.includes('tibia')) {
    return 'Spine & Musculoskeletal';
  }
  if (reg.includes('chest') || reg.includes('lung') || reg.includes('thorax') || reg.includes('rib') || reg.includes('pleura')) {
    return 'Thoracic & Pulmonary';
  }
  if (mod === 'MAMMOGRAPHY' || reg.includes('breast') || reg.includes('mammo') || reg.includes('uterus') || reg.includes('ovary') || reg.includes('fetal') || reg.includes('obstetric') || reg.includes('gynecology')) {
    return "Women's Health & Breast";
  }
  if (reg.includes('abdomen') || reg.includes('pelvis') || reg.includes('liver') || reg.includes('kidney') || reg.includes('bladder') || reg.includes('digestive') || reg.includes('gi') || reg.includes('gallbladder')) {
    return 'Abdomen & Pelvis';
  }
  if (reg.includes('cardio') || reg.includes('heart') || reg.includes('aorta') || reg.includes('carotid') || reg.includes('vascular') || reg.includes('angio')) {
    return 'Cardiovascular & Vascular';
  }
  return 'General Clinical';
}

function generateFolderPath(patientId, modality, seriesName) {
  const p = (patientId || 'GENERAL').replace(/[^a-zA-Z0-9_-]/g, '_');
  const m = (modality || 'X-Ray').replace(/[^a-zA-Z0-9_-]/g, '_');
  const s = (seriesName || 'Series').replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${p}/${m}/${s}`;
}

class ImagingArchive {
  static get CATEGORIES() {
    return CATEGORIES;
  }

  static inferCategory(modality, bodyRegion) {
    return inferCategory(modality, bodyRegion);
  }

  static async create({
    studyId = null,
    accessionNumber = null,
    patientId,
    patientName,
    modality,
    bodyRegion = 'General',
    category = null,
    folderPath = null,
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
    const assignedCategory = category || inferCategory(normModality, bodyRegion);
    const assignedFolder = folderPath || generateFolderPath(patientId, normModality, seriesName);
    const metaStr = metadataJson ? (typeof metadataJson === 'string' ? metadataJson : JSON.stringify(metadataJson)) : null;

    const { rows } = await db.query(
      `INSERT INTO imaging_archives (
        study_id, accession_number, patient_id, patient_name, modality,
        body_region, category, folder_path, series_name, slice_index,
        file_name, file_type, file_size_bytes, file_base64, thumbnail_base64,
        clinical_notes, metadata_json, uploaded_by, uploaded_by_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *`,
      [
        studyId,
        accessionNumber,
        patientId,
        patientName,
        normModality,
        bodyRegion,
        assignedCategory,
        assignedFolder,
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
    category = '',
    patientId = '',
    bodyRegion = '',
    studyId = null,
    folderPath = '',
    startDate = '',
    endDate = '',
    limit = 100,
    offset = 0,
  } = {}) {
    let sql = `
      SELECT id, study_id, accession_number, patient_id, patient_name,
             modality, body_region, category, folder_path, series_name, slice_index,
             file_name, file_type, file_size_bytes, thumbnail_base64, clinical_notes,
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

    if (category && category !== 'ALL') {
      sql += ` AND category = ?`;
      params.push(category);
    }

    if (folderPath) {
      sql += ` AND folder_path LIKE ?`;
      params.push(`%${folderPath}%`);
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
        LOWER(coalesce(category, '')) LIKE ? OR
        LOWER(coalesce(clinical_notes, '')) LIKE ?
      )`;
      params.push(term, term, term, term, term, term, term);
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
         modality, body_region, category, folder_path, series_name, slice_index,
         file_name, file_type, file_size_bytes, thumbnail_base64, clinical_notes,
         metadata_json, uploaded_by, uploaded_by_name, created_at, updated_at`;

    const { rows } = await db.query(
      `SELECT ${fields} FROM imaging_archives WHERE id = ?`,
      [id]
    );
    return rows[0] || null;
  }

  static async getByStudyId(studyId) {
    const { rows } = await db.query(
      `SELECT * FROM imaging_archives WHERE study_id = ? ORDER BY slice_index ASC, created_at ASC`,
      [studyId]
    );
    return rows || [];
  }

  static async delete(id) {
    const { rows } = await db.query(
      `DELETE FROM imaging_archives WHERE id = ? RETURNING id`,
      [id]
    );
    return rows[0] || null;
  }

  static async getStats() {
    const { rows: modRows } = await db.query(`
      SELECT modality, COUNT(*) as count, SUM(file_size_bytes) as total_bytes
      FROM imaging_archives
      GROUP BY modality
    `);

    const { rows: catRows } = await db.query(`
      SELECT coalesce(category, 'General Clinical') as category, COUNT(*) as count, SUM(file_size_bytes) as total_bytes
      FROM imaging_archives
      GROUP BY category
    `);

    const { rows: patientRows } = await db.query(`
      SELECT patient_id, patient_name, COUNT(*) as file_count, MAX(created_at) as last_archived_at
      FROM imaging_archives
      GROUP BY patient_id, patient_name
      ORDER BY last_archived_at DESC
      LIMIT 100
    `);

    const modalities = {};
    for (const r of modRows || []) {
      modalities[r.modality] = {
        count: Number(r.count),
        bytes: Number(r.total_bytes || 0),
      };
    }

    const categories = {};
    for (const r of catRows || []) {
      categories[r.category] = {
        count: Number(r.count),
        bytes: Number(r.total_bytes || 0),
      };
    }

    return {
      modalities,
      categories,
      patientFolders: patientRows || [],
    };
  }

  static async getStatsByModality() {
    const stats = await this.getStats();
    return stats.modalities;
  }
}

module.exports = ImagingArchive;
