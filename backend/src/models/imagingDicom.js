'use strict';
const db = require('../config/db');
const dicomweb = require('../utils/dicomweb');

/**
 * Links DICOM metadata from the PACS into our imaging_series / imaging_instances
 * tables (we store references only — pixel data stays in the PACS). Reads are
 * served from our DB; rendered frames are proxied on demand.
 */
class ImagingDicom {
  // Pull all series + instances for a StudyInstanceUID from the PACS and mirror
  // them locally, replacing any previous mirror for this study.
  static async linkFromPacs(studyId, studyInstanceUID) {
    if (!dicomweb.isConfigured()) return { error: 'pacs_not_configured' };

    const series = await dicomweb.fetchSeries(studyInstanceUID);
    if (!series.length) return { error: 'no_series' };

    // Clear previous mirror for this study.
    const oldSeries = (await db.query('SELECT id FROM imaging_series WHERE study_id = $1', [studyId])).rows;
    for (const s of oldSeries) {
      await db.query('DELETE FROM imaging_instances WHERE series_id = $1', [s.id]);
    }
    await db.query('DELETE FROM imaging_series WHERE study_id = $1', [studyId]);

    let instanceTotal = 0;
    for (const s of series) {
      const { rows } = await db.query(
        `INSERT INTO imaging_series (study_id, series_instance_uid, modality, description, number_of_instances)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [studyId, s.series_instance_uid, s.modality || null, s.description || null, s.number_of_instances || 0]
      );
      const seriesRowId = rows[0].id;

      const instances = await dicomweb.fetchInstances(studyInstanceUID, s.series_instance_uid);
      for (const inst of instances) {
        await db.query(
          `INSERT INTO imaging_instances (series_id, sop_instance_uid, frame_count) VALUES ($1, $2, $3)`,
          [seriesRowId, inst.sop_instance_uid, inst.frame_count || 1]
        );
        instanceTotal += 1;
      }
    }

    await db.query(
      'UPDATE imaging_studies SET study_instance_uid = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [studyInstanceUID, studyId]
    );

    return { series: series.length, instances: instanceTotal };
  }

  // Series + their instances for a study (for the viewer).
  static async getStudyImages(studyId) {
    const series = (await db.query(
      `SELECT id, series_instance_uid, modality, description, number_of_instances
         FROM imaging_series WHERE study_id = $1 ORDER BY id`,
      [studyId]
    )).rows;

    for (const s of series) {
      s.instances = (await db.query(
        `SELECT id, sop_instance_uid, frame_count FROM imaging_instances WHERE series_id = $1 ORDER BY id`,
        [s.id]
      )).rows;
    }
    return series;
  }
}

module.exports = ImagingDicom;
