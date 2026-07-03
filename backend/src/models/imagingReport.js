'use strict';
const crypto = require('crypto');
const db = require('../config/db');

/**
 * Radiologist report model.
 *
 * One report per study. Lifecycle: draft → final → (verified) → amended.
 * Finalising moves the parent study to 'reported'; verifying moves it to
 * 'verified'. Coded fields are stored as JSON arrays of { code, display, system }
 * (findings = SNOMED CT, diagnosis = ICD-11) and are encrypted at rest.
 */

const parse = (v, fallback) => {
  if (v === null || v === undefined) return fallback;
  try { return JSON.parse(v); } catch { return fallback; }
};

class ImagingReport {
  // Deterministic integrity hash over the clinically meaningful content.
  static checksum(payload) {
    const canonical = JSON.stringify({
      study_id: payload.study_id,
      technique: payload.technique || '',
      findings_narrative: payload.findings_narrative || '',
      findings_codes: payload.findings_codes || [],
      impression: payload.impression || '',
      diagnosis_codes: payload.diagnosis_codes || [],
      recommendations: payload.recommendations || '',
    });
    return crypto.createHash('sha256').update(canonical).digest('hex');
  }

  static async getByStudy(studyId) {
    const { rows } = await db.query(
      `SELECT r.*, u.full_name AS radiologist_name, v.full_name AS verified_by_name
         FROM imaging_reports r
         LEFT JOIN users u ON r.radiologist_id = u.id
         LEFT JOIN users v ON r.verified_by = v.id
        WHERE r.study_id = $1
        ORDER BY r.id DESC LIMIT 1`,
      [studyId]
    );
    const r = rows[0];
    if (!r) return null;
    return {
      ...r,
      findings_codes: parse(r.findings_code_json, []),
      diagnosis_codes: parse(r.diagnosis_code_json, []),
    };
  }

  // Create or update the (single) draft report for a study.
  static async save(studyId, data, user) {
    const existing = await this.getByStudy(studyId);
    const fields = {
      technique: data.technique || null,
      findings_narrative: data.findings_narrative || null,
      findings_code_json: JSON.stringify(data.findings_codes || []),
      impression: data.impression || null,
      diagnosis_code_json: JSON.stringify(data.diagnosis_codes || []),
      recommendations: data.recommendations || null,
    };

    if (existing) {
      if (['final', 'verified'].includes(existing.status)) {
        // Locked — must go through amend().
        return { locked: true };
      }
      const { rows } = await db.query(
        `UPDATE imaging_reports
            SET technique = $1, findings_narrative = $2, findings_code_json = $3,
                impression = $4, diagnosis_code_json = $5, recommendations = $6,
                radiologist_id = $7, updated_at = CURRENT_TIMESTAMP
          WHERE id = $8 RETURNING *`,
        [fields.technique, fields.findings_narrative, fields.findings_code_json,
         fields.impression, fields.diagnosis_code_json, fields.recommendations,
         user.id, existing.id]
      );
      return rows[0];
    }

    const { rows } = await db.query(
      `INSERT INTO imaging_reports
        (study_id, radiologist_id, technique, findings_narrative, findings_code_json,
         impression, diagnosis_code_json, recommendations, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'draft') RETURNING *`,
      [studyId, user.id, fields.technique, fields.findings_narrative, fields.findings_code_json,
       fields.impression, fields.diagnosis_code_json, fields.recommendations]
    );
    return rows[0];
  }

  // Finalise the report and move the study to 'reported'.
  static async finalize(studyId, user) {
    const report = await this.getByStudy(studyId);
    if (!report) return { error: 'no_report' };
    if (['final', 'verified'].includes(report.status)) return { error: 'already_final' };

    const checksum = this.checksum({
      study_id: studyId,
      technique: report.technique,
      findings_narrative: report.findings_narrative,
      findings_codes: report.findings_codes,
      impression: report.impression,
      diagnosis_codes: report.diagnosis_codes,
      recommendations: report.recommendations,
    });

    await db.query(
      `UPDATE imaging_reports SET status = 'final', checksum = $1, radiologist_id = COALESCE(radiologist_id, $2), updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
      [checksum, user.id, report.id]
    );
    // Guarded study transition: only an acquired study becomes reported.
    await db.query(
      `UPDATE imaging_studies SET status = 'reported', updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND status = 'acquired'`,
      [studyId]
    );
    return { report_id: report.id, checksum };
  }

  // Verify a finalised report and move the study to 'verified'.
  static async verify(studyId, user) {
    const report = await this.getByStudy(studyId);
    if (!report) return { error: 'no_report' };
    if (report.status !== 'final') return { error: 'not_final' };

    await db.query(
      `UPDATE imaging_reports SET status = 'verified', verified_by = $1, verified_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [user.id, report.id]
    );
    await db.query(
      `UPDATE imaging_studies SET status = 'verified', updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND status = 'reported'`,
      [studyId]
    );
    return { report_id: report.id };
  }

  // Amend a finalised/verified report (creates an auditable amendment in place).
  static async amend(studyId, data, user) {
    const report = await this.getByStudy(studyId);
    if (!report) return { error: 'no_report' };

    const merged = {
      technique: data.technique ?? report.technique,
      findings_narrative: data.findings_narrative ?? report.findings_narrative,
      findings_codes: data.findings_codes ?? report.findings_codes,
      impression: data.impression ?? report.impression,
      diagnosis_codes: data.diagnosis_codes ?? report.diagnosis_codes,
      recommendations: data.recommendations ?? report.recommendations,
    };
    const checksum = this.checksum({ study_id: studyId, ...merged });

    await db.query(
      `UPDATE imaging_reports
          SET technique = $1, findings_narrative = $2, findings_code_json = $3,
              impression = $4, diagnosis_code_json = $5, recommendations = $6,
              status = 'amended', amended_at = CURRENT_TIMESTAMP, amendment_reason = $7,
              checksum = $8, updated_at = CURRENT_TIMESTAMP
        WHERE id = $9`,
      [merged.technique, merged.findings_narrative, JSON.stringify(merged.findings_codes || []),
       merged.impression, JSON.stringify(merged.diagnosis_codes || []), merged.recommendations,
       data.amendment_reason || null, checksum, report.id]
    );
    return { report_id: report.id, checksum };
  }
}

module.exports = ImagingReport;
