'use strict';
const db = require('../config/db');

/**
 * Imaging study register model.
 *
 * A study moves through: scheduled → checked_in → in_progress → acquired
 * → reported → verified (plus `cancelled`). Transitions are guarded in SQL
 * (`WHERE status = <expected>`) so an illegal jump simply affects zero rows,
 * mirroring the financial-workflow pattern used elsewhere in the app.
 *
 * Encryption of the patient-identifying / clinical columns is transparent —
 * see ENCRYPTED_COLUMNS in config/db.js.
 */

// The 4 operational units that log exams daily. `modality` is stored as free
// text, so this list is the canonical set for validation/UI, not a hard schema
// constraint.
const MODALITIES = ['X-Ray', 'CT', 'MRI', 'Ultrasound'];

// Human-facing labels ↔ canonical modality codes.
const MODALITY_LABELS = {
  'X-Ray': 'Radiography (X-Ray)',
  CT: 'CT-Scan',
  MRI: 'MRI',
  Ultrasound: 'Ultrasound',
};

const STATUS_FLOW = {
  scheduled: 'checked_in',
  checked_in: 'in_progress',
  in_progress: 'acquired',
  acquired: 'reported',
  reported: 'verified',
};

// Attach a parsed `acquisition_params` object and drop the raw JSON column
// from any row that carries it, so callers get a consistent shape.
function withParsedParams(row) {
  if (!row) return row;
  let acquisition_params = {};
  if (row.acquisition_params_json) {
    try { acquisition_params = JSON.parse(row.acquisition_params_json); } catch { /* leave empty */ }
  }
  return { ...row, acquisition_params };
}

class ImagingStudy {
  static get MODALITIES() { return MODALITIES; }
  static get MODALITY_LABELS() { return MODALITY_LABELS; }
  static get STATUS_FLOW() { return STATUS_FLOW; }

  static normalizeModality(input) {
    if (!input) return null;
    const v = String(input).trim().toLowerCase();
    if (['x-ray', 'xray', 'radiography', 'x ray', 'dx'].includes(v)) return 'X-Ray';
    if (['ct', 'ct-scan', 'ct scan', 'computed tomography'].includes(v)) return 'CT';
    if (['mri', 'magnetic resonance'].includes(v)) return 'MRI';
    if (['ultrasound', 'us', 'sonography', 'echo'].includes(v)) return 'Ultrasound';
    // Unknown modality: pass through so the register can still hold it.
    return String(input).trim();
  }

  // ── Create a study (optionally with an inline order) ────────────────────────
  static async create(data, user) {
    const modality = this.normalizeModality(data.modality);
    const { rows } = await db.query(
      `INSERT INTO imaging_studies (
        order_id, accession_number, patient_id, patient_name, modality, sub_unit,
        room, equipment, performed_by, scheduled_at, technical_notes, consent_json,
        referring_provider, clinical_indication, exam_type_loinc, exam_type_display,
        sid, exam_region, patient_age, patient_sex,
        status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
      RETURNING *`,
      [
        data.order_id || null,
        data.accession_number || null,
        data.patient_id || null,
        data.patient_name || null,
        modality,
        data.sub_unit || (modality ? MODALITY_LABELS[modality] || modality : null),
        data.room || null,
        data.equipment || null,
        data.performed_by || null,
        data.scheduled_at || null,
        data.technical_notes || null,
        JSON.stringify(data.consent || {}),
        data.referring_provider || null,
        data.clinical_indication || null,
        (data.exam_type && data.exam_type.code) || data.exam_type_loinc || null,
        (data.exam_type && data.exam_type.display) || data.exam_type_display || null,
        data.sid || null,
        data.exam_region || null,
        data.patient_age != null ? String(data.patient_age) : null,
        data.patient_sex || null,
        data.status || 'scheduled',
        (user && user.id) || null,
      ]
    );
    return rows[0];
  }

  static async findById(id) {
    const { rows } = await db.query(
      `SELECT s.*, u.full_name AS performed_by_name, o.priority,
              COALESCE(s.clinical_indication, o.clinical_indication) AS indication,
              COALESCE(s.referring_provider, o.referring_provider) AS referrer,
              COALESCE(s.exam_type_display, o.exam_type_display) AS exam_display,
              COALESCE(s.exam_type_loinc, o.exam_type_loinc) AS exam_loinc,
              o.indication_code_json AS indication_code_json
         FROM imaging_studies s
         LEFT JOIN users u ON s.performed_by = u.id
         LEFT JOIN imaging_orders o ON s.order_id = o.id
        WHERE s.id = $1`,
      [id]
    );
    return withParsedParams(rows[0]) || null;
  }

  // ── Worklist / list with filters ────────────────────────────────────────────
  static async list(filters = {}) {
    let sql = `
      SELECT s.id, s.accession_number, s.sid, s.patient_id, s.patient_name, s.patient_age,
             s.patient_sex, s.modality, s.sub_unit, s.exam_region, s.exam_type_display,
             s.referring_provider, s.clinical_indication, s.status, s.scheduled_at,
             s.checked_in_at, s.acquired_at, s.performed_by, u.full_name AS performed_by_name,
             s.acquisition_params_json, s.created_at
        FROM imaging_studies s
        LEFT JOIN users u ON s.performed_by = u.id
       WHERE 1=1`;
    const params = [];

    if (filters.status) { params.push(filters.status); sql += ` AND s.status = $${params.length}`; }
    if (filters.modality) {
      params.push(this.normalizeModality(filters.modality));
      sql += ` AND s.modality = $${params.length}`;
    }
    if (filters.patient_id) { params.push(filters.patient_id); sql += ` AND s.patient_id = $${params.length}`; }
    if (filters.date) {
      params.push(filters.date);
      sql += ` AND date(s.scheduled_at) = date($${params.length})`;
    }
    sql += ' ORDER BY s.scheduled_at DESC, s.id DESC';
    if (filters.limit) { params.push(Number(filters.limit)); sql += ` LIMIT $${params.length}`; }

    const { rows } = await db.query(sql, params);
    return rows.map(withParsedParams);
  }

  // ── Daily exam register (line items, like the paper logbook) ────────────────
  static async dailyRegister(date, modality) {
    const params = [date];
    let sql = `
      SELECT s.id, s.sid, s.accession_number, s.patient_id, s.patient_name, s.patient_age,
             s.patient_sex, s.modality, s.exam_region, s.exam_type_display,
             s.referring_provider, s.clinical_indication, s.status,
             COALESCE(s.acquired_at, s.scheduled_at, s.created_at) AS logged_at
        FROM imaging_studies s
       WHERE date(COALESCE(s.acquired_at, s.scheduled_at, s.created_at)) = date($1)
          AND s.status != 'cancelled'`;
    if (modality) {
      params.push(this.normalizeModality(modality));
      sql += ` AND s.modality = $${params.length}`;
    }
    sql += ' ORDER BY logged_at ASC, s.id ASC';
    const { rows } = await db.query(sql, params);
    return rows;
  }

  // ── Status transition (guarded) ─────────────────────────────────────────────
  static async transition(id, fromStatus, toStatus, user, extra = {}) {
    const tsColumn = {
      checked_in: 'checked_in_at',
      in_progress: 'started_at',
      acquired: 'acquired_at',
    }[toStatus];

    const sets = ['status = $1', 'updated_at = CURRENT_TIMESTAMP'];
    const params = [toStatus];
    if (tsColumn) sets.push(`${tsColumn} = CURRENT_TIMESTAMP`);
    if (toStatus === 'in_progress' && (user && user.id)) {
      params.push(user.id);
      sets.push(`performed_by = COALESCE(performed_by, $${params.length})`);
    }
    if (extra.technical_notes !== undefined) {
      params.push(extra.technical_notes);
      sets.push(`technical_notes = $${params.length}`);
    }
    if (extra.acquisition_params !== undefined) {
      params.push(JSON.stringify(extra.acquisition_params || {}));
      sets.push(`acquisition_params_json = $${params.length}`);
    }
    params.push(id);
    const idIdx = params.length;
    params.push(fromStatus);
    const fromIdx = params.length;

    const { rows } = await db.query(
      `UPDATE imaging_studies SET ${sets.join(', ')}
        WHERE id = $${idIdx} AND status = $${fromIdx}
        RETURNING *`,
      params
    );
    return withParsedParams(rows[0]) || null;
  }

  // ── Daily exam counts per unit (the "4 units log exams daily" board) ────────
  static async dailyCounts(date) {
    const { rows } = await db.query(
      `SELECT modality,
               COUNT(*) AS total,
               SUM(CASE WHEN status IN ('acquired','reported','verified') THEN 1 ELSE 0 END) AS completed,
               SUM(CASE WHEN status = 'verified' THEN 1 ELSE 0 END) AS reported
         FROM imaging_studies
        WHERE date(COALESCE(acquired_at, scheduled_at, created_at)) = date($1)
        GROUP BY modality
        ORDER BY modality`,
      [date]
    );
    return rows;
  }

  static async cancel(id) {
    const { rows } = await db.query(
      `UPDATE imaging_studies SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND status IN ('scheduled','checked_in')
        RETURNING *`,
      [id]
    );
    return rows[0] || null;
  }
}

module.exports = ImagingStudy;
