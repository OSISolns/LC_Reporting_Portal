'use strict';
const db = require('../config/db');
const ImagingStudy = require('../models/imagingStudy');
const ImagingReport = require('../models/imagingReport');
const ImagingDicom = require('../models/imagingDicom');
const Notification = require('../models/notification');
const User = require('../models/user');
const { logAction } = require('../middleware/audit');
const terminology = require('../utils/terminology');
const dicomweb = require('../utils/dicomweb');
const { generateImagingReportPDF } = require('../utils/pdf');

// ── Helpers ───────────────────────────────────────────────────────────────────
const accessionFor = (id) => `IMG-${new Date().getFullYear()}-${String(id).padStart(5, '0')}`;

async function notifyRadiologists(title, message, link) {
  try {
    const radiologists = await User.findByRole('radiologist');
    for (const r of radiologists) {
      await Notification.create({ userId: r.id, title, message, type: 'info', link });
    }
  } catch (e) { /* notification failure must not break the workflow */ }
}

// ── Reference data (units/modalities for the UI) ───────────────────────────────
exports.getModalities = async (_req, res) => {
  res.json({
    success: true,
    data: ImagingStudy.MODALITIES.map((code) => ({
      code,
      label: ImagingStudy.MODALITY_LABELS[code] || code,
    })),
  });
};

// ── Reception: schedule a study ────────────────────────────────────────────────
exports.scheduleStudy = async (req, res, next) => {
  try {
    const { patient_id, patient_name, modality } = req.body;
    if (!patient_id || !modality) {
      return res.status(400).json({ success: false, message: 'patient_id and modality are required.' });
    }

    const study = await ImagingStudy.create(req.body, req.user);

    // Assign a human-readable accession number derived from the row id.
    const accession = accessionFor(study.id);
    await db.query('UPDATE imaging_studies SET accession_number = $1 WHERE id = $2', [accession, study.id]);
    study.accession_number = accession;

    await logAction(req, 'IMAGING_SCHEDULE', 'imaging_studies', study.id, {
      modality: study.modality, patient_id, accession,
    });

    res.status(201).json({ success: true, message: 'Study scheduled.', data: study });
  } catch (err) { next(err); }
};

// ── Worklist / list ────────────────────────────────────────────────────────────
exports.listStudies = async (req, res, next) => {
  try {
    const rows = await ImagingStudy.list(req.query);
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

exports.getStudy = async (req, res, next) => {
  try {
    const study = await ImagingStudy.findById(req.params.id);
    if (!study) return res.status(404).json({ success: false, message: 'Study not found.' });
    res.json({ success: true, data: study });
  } catch (err) { next(err); }
};

// ── Radiographer: workflow transitions ─────────────────────────────────────────
async function doTransition(req, res, next, fromStatus, toStatus, { audit, afterNotify } = {}) {
  try {
    const study = await ImagingStudy.transition(req.params.id, fromStatus, toStatus, req.user, req.body);
    if (!study) {
      return res.status(409).json({
        success: false,
        message: `Study is not in '${fromStatus}' state; cannot move to '${toStatus}'.`,
      });
    }
    await logAction(req, audit || `IMAGING_${toStatus.toUpperCase()}`, 'imaging_studies', study.id, {
      from: fromStatus, to: toStatus,
    });
    if (afterNotify) await afterNotify(study);
    res.json({ success: true, message: `Study moved to '${toStatus}'.`, data: study });
  } catch (err) { next(err); }
}

exports.checkIn = (req, res, next) =>
  doTransition(req, res, next, 'scheduled', 'checked_in', { audit: 'IMAGING_CHECKIN' });

exports.startAcquisition = (req, res, next) =>
  doTransition(req, res, next, 'checked_in', 'in_progress', { audit: 'IMAGING_START' });

exports.completeAcquisition = (req, res, next) =>
  doTransition(req, res, next, 'in_progress', 'acquired', {
    audit: 'IMAGING_ACQUIRED',
    afterNotify: (study) =>
      notifyRadiologists(
        'New study ready to report',
        `${study.modality} study ${study.accession_number || ''} is acquired and awaiting a report.`,
        '/imaging/reporting'
      ),
  });

exports.cancelStudy = async (req, res, next) => {
  try {
    const study = await ImagingStudy.cancel(req.params.id);
    if (!study) {
      return res.status(409).json({ success: false, message: 'Only scheduled or checked-in studies can be cancelled.' });
    }
    await logAction(req, 'IMAGING_CANCEL', 'imaging_studies', study.id, {});
    res.json({ success: true, message: 'Study cancelled.', data: study });
  } catch (err) { next(err); }
};

// ── Daily exam board (4 units) ─────────────────────────────────────────────────
exports.dailyBoard = async (req, res, next) => {
  try {
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const counts = await ImagingStudy.dailyCounts(date);

    // Ensure all 4 canonical units appear even with zero exams.
    const byModality = Object.fromEntries(counts.map((c) => [c.modality, c]));
    const units = ImagingStudy.MODALITIES.map((code) => {
      const row = byModality[code] || {};
      return {
        modality: code,
        label: ImagingStudy.MODALITY_LABELS[code] || code,
        total: Number(row.total || 0),
        completed: Number(row.completed || 0),
        reported: Number(row.reported || 0),
      };
    });

    res.json({
      success: true,
      data: {
        date,
        units,
        totals: units.reduce(
          (a, u) => ({
            total: a.total + u.total,
            completed: a.completed + u.completed,
            reported: a.reported + u.reported,
          }),
          { total: 0, completed: 0, reported: 0 }
        ),
      },
    });
  } catch (err) { next(err); }
};

// ── Daily exam register (line items, mirrors the paper logbook) ────────────────
exports.dailyRegister = async (req, res, next) => {
  try {
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const modality = req.query.modality || null;
    const rows = await ImagingStudy.dailyRegister(date, modality);
    res.json({ success: true, data: { date, modality, entries: rows } });
  } catch (err) { next(err); }
};

// ── Manager analytics dashboard ────────────────────────────────────────────────
// Aggregates operational KPIs, modality utilization, report turnaround time and
// 12-month volume trends for the imaging department overview.
exports.dashboard = async (req, res, next) => {
  try {
    const monthsBack = Math.min(Math.max(parseInt(req.query.months || '12', 10) || 12, 3), 24);
    const today = new Date().toISOString().slice(0, 10);

    // 1. Overall status funnel (all-time, excluding cancelled from "active" view)
    const { rows: statusRows } = await db.query(
      `SELECT status, COUNT(*) AS count FROM imaging_studies GROUP BY status`
    );
    const statusCounts = Object.fromEntries(statusRows.map((r) => [r.status, Number(r.count)]));

    // 2. KPI headline numbers
    const totalExams = statusRows.reduce((s, r) => s + (r.status !== 'cancelled' ? Number(r.count) : 0), 0);
    const reported = (statusCounts.reported || 0) + (statusCounts.verified || 0);
    const acquired = statusCounts.acquired || 0; // acquired but not yet reported = reporting backlog
    const inProgress = (statusCounts.scheduled || 0) + (statusCounts.checked_in || 0) + (statusCounts.in_progress || 0);
    const cancelled = statusCounts.cancelled || 0;

    // 3. Today snapshot
    const { rows: todayRows } = await db.query(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN status IN ('acquired','reported','verified') THEN 1 ELSE 0 END) AS acquired,
              SUM(CASE WHEN status IN ('reported','verified') THEN 1 ELSE 0 END) AS reported
         FROM imaging_studies
        WHERE date(COALESCE(acquired_at, scheduled_at, created_at)) = date($1)
          AND status != 'cancelled'`,
      [today]
    );
    const todaySnapshot = {
      total: Number(todayRows[0]?.total || 0),
      acquired: Number(todayRows[0]?.acquired || 0),
      reported: Number(todayRows[0]?.reported || 0),
    };

    // 4. Modality utilization (all-time, non-cancelled)
    const { rows: modRows } = await db.query(
      `SELECT modality,
              COUNT(*) AS total,
              SUM(CASE WHEN status IN ('reported','verified') THEN 1 ELSE 0 END) AS reported
         FROM imaging_studies
        WHERE status != 'cancelled'
        GROUP BY modality`
    );
    const modByCode = Object.fromEntries(modRows.map((r) => [r.modality, r]));
    const modalityUtilization = ImagingStudy.MODALITIES.map((code) => {
      const row = modByCode[code] || {};
      const total = Number(row.total || 0);
      return {
        modality: code,
        label: ImagingStudy.MODALITY_LABELS[code] || code,
        total,
        reported: Number(row.reported || 0),
        share: totalExams > 0 ? Math.round((total / totalExams) * 100) : 0,
      };
    });

    // 5. Report turnaround time (hours from acquisition → report finalization)
    const { rows: tatRows } = await db.query(
      `SELECT s.acquired_at AS acquired_at,
              COALESCE(rep.verified_at, rep.updated_at) AS reported_at
         FROM imaging_studies s
         JOIN imaging_reports rep ON rep.study_id = s.id
        WHERE rep.status IN ('final','verified','amended')
          AND s.acquired_at IS NOT NULL`
    );
    let tatHoursList = [];
    for (const r of tatRows) {
      const a = new Date(r.acquired_at);
      const b = new Date(r.reported_at);
      if (!isNaN(a) && !isNaN(b) && b >= a) {
        tatHoursList.push((b - a) / (1000 * 60 * 60));
      }
    }
    tatHoursList.sort((x, y) => x - y);
    const avgTatHours = tatHoursList.length
      ? tatHoursList.reduce((s, h) => s + h, 0) / tatHoursList.length
      : null;
    const medianTatHours = tatHoursList.length
      ? tatHoursList[Math.floor(tatHoursList.length / 2)]
      : null;

    // 6. Volume trend — exams per month for the last N months (present + past)
    const { rows: trendRows } = await db.query(
      `SELECT strftime('%Y-%m', COALESCE(acquired_at, scheduled_at, created_at)) AS month,
              COUNT(*) AS total,
              SUM(CASE WHEN status IN ('reported','verified') THEN 1 ELSE 0 END) AS reported
         FROM imaging_studies
        WHERE status != 'cancelled'
        GROUP BY month`
    );
    const trendByMonth = Object.fromEntries(trendRows.map((r) => [r.month, r]));
    const now = new Date();
    const volumeTrend = [];
    for (let i = monthsBack - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      volumeTrend.push({
        month: ym,
        total: Number(trendByMonth[ym]?.total || 0),
        reported: Number(trendByMonth[ym]?.reported || 0),
      });
    }

    // 7. Top referring providers (non-cancelled)
    const { rows: refRows } = await db.query(
      `SELECT COALESCE(referring_provider, 'Unspecified') AS provider, COUNT(*) AS total
         FROM imaging_studies
        WHERE status != 'cancelled'
        GROUP BY COALESCE(referring_provider, 'Unspecified')
        ORDER BY total DESC
        LIMIT 5`
    );
    const topReferrers = refRows.map((r) => ({ provider: r.provider, total: Number(r.total) }));

    res.json({
      success: true,
      data: {
        generated_at: now.toISOString(),
        months_back: monthsBack,
        kpis: {
          total_exams: totalExams,
          reported,
          reporting_backlog: acquired,
          in_pipeline: inProgress,
          cancelled,
          report_rate: totalExams > 0 ? Math.round((reported / totalExams) * 100) : 0,
        },
        today: todaySnapshot,
        status_funnel: {
          scheduled: statusCounts.scheduled || 0,
          checked_in: statusCounts.checked_in || 0,
          in_progress: statusCounts.in_progress || 0,
          acquired: statusCounts.acquired || 0,
          reported: statusCounts.reported || 0,
          verified: statusCounts.verified || 0,
        },
        modality_utilization: modalityUtilization,
        turnaround: {
          avg_hours: avgTatHours != null ? Math.round(avgTatHours * 10) / 10 : null,
          median_hours: medianTatHours != null ? Math.round(medianTatHours * 10) / 10 : null,
          sample_size: tatHoursList.length,
        },
        volume_trend: volumeTrend,
        top_referrers: topReferrers,
      },
    });
  } catch (err) { next(err); }
};

// ── Terminology lookups (LOINC / SNOMED / ICD-11) ──────────────────────────────
exports.searchTerminology = async (req, res, next) => {
  try {
    const { system } = req.params;
    const q = req.query.q || '';
    let data = [];
    if (system === 'loinc') data = await terminology.lookupLOINC(q);
    else if (system === 'snomed') data = await terminology.lookupSNOMED(q);
    else if (system === 'icd11') data = await terminology.lookupICD11(q);
    else return res.status(400).json({ success: false, message: 'Unknown terminology system.' });
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

// ── Radiologist reporting queue (acquired + reported) ──────────────────────────
exports.reportingQueue = async (req, res, next) => {
  try {
    const acquired = await ImagingStudy.list({ status: 'acquired' });
    const reported = await ImagingStudy.list({ status: 'reported' });
    res.json({ success: true, data: { acquired, reported } });
  } catch (err) { next(err); }
};

// ── Get study + its report (for the reporting editor) ──────────────────────────
exports.getReport = async (req, res, next) => {
  try {
    const study = await ImagingStudy.findById(req.params.id);
    if (!study) return res.status(404).json({ success: false, message: 'Study not found.' });
    const report = await ImagingReport.getByStudy(study.id);
    res.json({ success: true, data: { study, report } });
  } catch (err) { next(err); }
};

// ── Save (draft) report ────────────────────────────────────────────────────────
exports.saveReport = async (req, res, next) => {
  try {
    const study = await ImagingStudy.findById(req.params.id);
    if (!study) return res.status(404).json({ success: false, message: 'Study not found.' });
    const result = await ImagingReport.save(study.id, req.body, req.user);
    if (result && result.locked) {
      return res.status(409).json({ success: false, message: 'Report is finalised. Use amend to change it.' });
    }
    await logAction(req, 'IMAGING_REPORT_SAVE', 'imaging_reports', study.id, {});
    res.json({ success: true, message: 'Report saved.', data: result });
  } catch (err) { next(err); }
};

// ── Finalise report → study 'reported' ─────────────────────────────────────────
exports.finalizeReport = async (req, res, next) => {
  try {
    const study = await ImagingStudy.findById(req.params.id);
    if (!study) return res.status(404).json({ success: false, message: 'Study not found.' });
    const result = await ImagingReport.finalize(study.id, req.user);
    if (result.error === 'no_report') return res.status(409).json({ success: false, message: 'Save a report before finalising.' });
    if (result.error === 'already_final') return res.status(409).json({ success: false, message: 'Report is already finalised.' });
    await logAction(req, 'IMAGING_REPORT_FINALIZE', 'imaging_reports', study.id, { checksum: result.checksum });
    res.json({ success: true, message: 'Report finalised.', data: result });
  } catch (err) { next(err); }
};

// ── Verify report → study 'verified' ───────────────────────────────────────────
exports.verifyReport = async (req, res, next) => {
  try {
    const study = await ImagingStudy.findById(req.params.id);
    if (!study) return res.status(404).json({ success: false, message: 'Study not found.' });
    const result = await ImagingReport.verify(study.id, req.user);
    if (result.error === 'no_report') return res.status(409).json({ success: false, message: 'No report to verify.' });
    if (result.error === 'not_final') return res.status(409).json({ success: false, message: 'Only a finalised report can be verified.' });
    await logAction(req, 'IMAGING_REPORT_VERIFY', 'imaging_reports', study.id, {});
    res.json({ success: true, message: 'Report verified.', data: result });
  } catch (err) { next(err); }
};

// ── Amend a finalised/verified report ──────────────────────────────────────────
exports.amendReport = async (req, res, next) => {
  try {
    const study = await ImagingStudy.findById(req.params.id);
    if (!study) return res.status(404).json({ success: false, message: 'Study not found.' });
    const result = await ImagingReport.amend(study.id, req.body, req.user);
    if (result.error === 'no_report') return res.status(409).json({ success: false, message: 'No report to amend.' });
    await logAction(req, 'IMAGING_REPORT_AMEND', 'imaging_reports', study.id, { reason: req.body.amendment_reason });
    res.json({ success: true, message: 'Report amended.', data: result });
  } catch (err) { next(err); }
};

const safeParse = (str, fallback = []) => {
  try { return str ? JSON.parse(str) : fallback; } catch { return fallback; }
};

// ── Assemble the flat data object the PDF template expects ──────────────────────
function assembleReportData(study, report) {
  return {
    id: study.id,
    status: (report && report.status) || 'draft',
    patient_name: study.patient_name,
    patient_id: study.patient_id,
    accession_number: study.accession_number,
    modality: study.modality,
    modality_label: ImagingStudy.MODALITY_LABELS[study.modality] || study.modality,
    sub_unit: study.sub_unit,
    scheduled_at: study.scheduled_at,
    acquired_at: study.acquired_at,
    referring_provider: study.referrer || study.referring_provider,
    clinical_indication: study.indication || study.clinical_indication,
    indication_codes: safeParse(study.indication_code_json, []),
    exam_type_loinc: study.exam_loinc || study.exam_type_loinc,
    exam_type_display: study.exam_display || study.exam_type_display,
    exam_type_codes: (study.exam_loinc || study.exam_type_loinc)
      ? [{ code: study.exam_loinc || study.exam_type_loinc, display: study.exam_display || study.exam_type_display, system: 'LOINC' }]
      : [],
    technique: report && report.technique,
    findings_narrative: report && report.findings_narrative,
    findings_codes: (report && report.findings_codes) || [],
    impression: report && report.impression,
    diagnosis_codes: (report && report.diagnosis_codes) || [],
    recommendations: report && report.recommendations,
    radiologist_name: report && report.radiologist_name,
    verified_by_name: report && report.verified_by_name,
    verified_at: report && report.verified_at,
    created_at: report && report.created_at,
    checksum: report && report.checksum,
  };
}

// ── Report PDF ─────────────────────────────────────────────────────────────────
exports.reportPdf = async (req, res, next) => {
  try {
    const study = await ImagingStudy.findById(req.params.id);
    if (!study) return res.status(404).json({ success: false, message: 'Study not found.' });
    const report = await ImagingReport.getByStudy(study.id);
    const data = assembleReportData(study, report);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Imaging_Report_${study.accession_number || study.id}.pdf"`);
    await generateImagingReportPDF(data, res);
  } catch (err) { next(err); }
};

// ── DICOM: PACS status ─────────────────────────────────────────────────────────
exports.dicomStatus = async (_req, res) => {
  res.json({ success: true, data: { configured: dicomweb.isConfigured() } });
};

// ── DICOM: link a study's images from the PACS ─────────────────────────────────
exports.linkDicom = async (req, res, next) => {
  try {
    const study = await ImagingStudy.findById(req.params.id);
    if (!study) return res.status(404).json({ success: false, message: 'Study not found.' });

    const studyUID = req.body.study_instance_uid || study.study_instance_uid;
    if (!studyUID) return res.status(400).json({ success: false, message: 'study_instance_uid is required.' });

    const result = await ImagingDicom.linkFromPacs(study.id, studyUID);
    if (result.error === 'pacs_not_configured') return res.status(503).json({ success: false, message: 'No PACS/DICOMweb endpoint configured (ORTHANC_DICOMWEB_URL).' });
    if (result.error === 'no_series') return res.status(404).json({ success: false, message: 'No series found on the PACS for that StudyInstanceUID.' });

    await logAction(req, 'IMAGING_DICOM_LINK', 'imaging_studies', study.id, { study_instance_uid: studyUID, ...result });
    res.json({ success: true, message: `Linked ${result.series} series / ${result.instances} images.`, data: result });
  } catch (err) {
    if (err.response) return res.status(502).json({ success: false, message: `PACS error: ${err.response.status}` });
    next(err);
  }
};

// ── DICOM: list a study's series + instances (for the viewer) ──────────────────
exports.getDicomImages = async (req, res, next) => {
  try {
    const study = await ImagingStudy.findById(req.params.id);
    if (!study) return res.status(404).json({ success: false, message: 'Study not found.' });
    const series = await ImagingDicom.getStudyImages(study.id);
    res.json({ success: true, data: { study_instance_uid: study.study_instance_uid, series } });
  } catch (err) { next(err); }
};

// ── DICOM: proxy a server-rendered frame (JPEG) ────────────────────────────────
exports.renderedFrame = async (req, res, next) => {
  try {
    if (!dicomweb.isConfigured()) return res.status(503).json({ success: false, message: 'No PACS configured.' });
    const study = await ImagingStudy.findById(req.params.id);
    if (!study) return res.status(404).json({ success: false, message: 'Study not found.' });

    if (!study.study_instance_uid) {
      return res.status(400).json({ success: false, message: 'Study is not linked to PACS images.' });
    }

    const { series, sop, frame } = req.query;
    if (!series || !sop) return res.status(400).json({ success: false, message: 'series and sop are required.' });

    const { buffer, contentType } = await dicomweb.renderedFrame({
      studyInstanceUID: study.study_instance_uid,
      seriesInstanceUID: series,
      sopInstanceUID: sop,
      frame: frame ? Number(frame) : undefined,
    });
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.send(buffer);
  } catch (err) {
    if (err.response) return res.status(502).json({ success: false, message: `PACS render error: ${err.response.status}` });
    next(err);
  }
};

// ── DICOM: STOW upload (radiographer pushes acquired images) ───────────────────
exports.stowUpload = async (req, res, next) => {
  try {
    if (!dicomweb.isConfigured()) return res.status(503).json({ success: false, message: 'No PACS configured.' });
    const study = await ImagingStudy.findById(req.params.id);
    if (!study) return res.status(404).json({ success: false, message: 'Study not found.' });

    // Accept base64-encoded DICOM instances in the JSON body (files: [b64, ...]).
    const files = Array.isArray(req.body.files) ? req.body.files : [];
    if (files.length === 0) return res.status(400).json({ success: false, message: 'No DICOM files provided.' });
    const buffers = files.map((b64) => Buffer.from(b64, 'base64'));

    const stowResult = await dicomweb.stowInstances(buffers);
    await logAction(req, 'IMAGING_DICOM_STOW', 'imaging_studies', study.id, { count: buffers.length });

    // If the caller knows the StudyInstanceUID, refresh the local mirror.
    if (req.body.study_instance_uid || study.study_instance_uid) {
      await ImagingDicom.linkFromPacs(study.id, req.body.study_instance_uid || study.study_instance_uid);
    }
    res.json({ success: true, message: `Uploaded ${buffers.length} instance(s) to PACS.`, data: stowResult });
  } catch (err) {
    if (err.response) return res.status(502).json({ success: false, message: `PACS STOW error: ${err.response.status}` });
    next(err);
  }
};
