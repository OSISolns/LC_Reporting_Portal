'use strict';
const db = require('../config/db');
const {
  suggestMedications,
  suggestDentalMedications,
  suggestProstheticReplacement,
  generateLabChefNote,
  generateAssessmentComments,
  generateProgressNote,
  generateSBAR,
  generateDentalNote,
  suggestICD10,
  generateInstructions,
  getAllCachedICD11,
  lookupICD11CodeDetails,
  FREQUENCY_LEGEND,
} = require('../utils/clinicalAI');

// POST /api/ai/clinical/medications
// Body: { medications: string[] }
exports.suggestMedications = (req, res, next) => {
  try {
    const { medications } = req.body;
    if (!Array.isArray(medications) || !medications.length) {
      return res.status(400).json({ success: false, message: 'medications array is required' });
    }
    const data = suggestMedications(medications.filter(Boolean));
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

// POST /api/ai/clinical/dental-medications
// Body: { condition, procedure, allergies, toothData, severity }
exports.suggestDentalMedications = (req, res, next) => {
  try {
    const { condition, procedure, allergies, toothData, severity } = req.body;
    const data = suggestDentalMedications({ condition, procedure, allergies, toothData, severity });
    res.json({ success: true, data });
  } catch (err) { next(err); }
};
// POST /api/ai/clinical/prosthetics-suggestion
// Body: { tooth, dentitionType, patientAge, patientGender, workDone, clinicOfOrigin, adjacentMissingCount }
exports.suggestProstheticReplacement = (req, res, next) => {
  try {
    const { tooth, dentitionType, patientAge, patientGender, workDone, clinicOfOrigin, adjacentMissingCount } = req.body;
    if (!tooth) {
      return res.status(400).json({ success: false, message: 'tooth is required' });
    }
    const data = suggestProstheticReplacement({
      tooth, dentitionType, patientAge, patientGender, workDone, clinicOfOrigin, adjacentMissingCount,
    });
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

// POST /api/ai/clinical/lab-chef-note
// Body: { odontogramData, patientName, patientRef, labTech, caseRef, dentist }
// Generates a full master prosthetics lab note from the case odontogram data using Lumina AI.
exports.generateLabChefNote = (req, res, next) => {
  try {
    const { odontogramData, patientName, patientRef, labTech, caseRef, dentist, clinicianNote, treatmentDirective } = req.body;
    if (!odontogramData || typeof odontogramData !== 'object') {
      return res.status(400).json({ success: false, message: 'odontogramData object is required' });
    }
    const note = generateLabChefNote({ odontogramData, patientName, patientRef, labTech, caseRef, dentist, clinicianNote, treatmentDirective });
    res.json({ success: true, data: { note } });
  } catch (err) { next(err); }
};

// POST /api/ai/clinical/instructions
// Body: { medications: [{ name, route, frequency, duration }, ...] }
exports.generateInstructions = (req, res, next) => {
  try {
    const { medications } = req.body;
    if (!Array.isArray(medications) || !medications.length) {
      return res.status(400).json({ success: false, message: 'medications array is required' });
    }
    const data = generateInstructions(medications);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};
// POST /api/ai/clinical/icd10  (now backed by live WHO ICD-11 API)
// Body: { query: string }
exports.suggestICD10 = async (req, res, next) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ success: false, message: 'query is required' });
    }
    const data = await suggestICD10(query);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

// POST /api/ai/clinical/assessment
// Body: { vitals: { temp, pulse, rr, bp, spo2, allergy_1, allergy_2, prev_illness_med, prev_illness_surg } }
exports.generateAssessment = (req, res, next) => {
  try {
    const { vitals } = req.body;
    if (!vitals) return res.status(400).json({ success: false, message: 'vitals object is required' });
    const text = generateAssessmentComments(vitals);
    if (!text) return res.status(422).json({ success: false, message: 'Please enter at least one vital sign before generating an assessment.' });
    res.json({ success: true, data: { comment: text } });
  } catch (err) { next(err); }
};

// POST /api/ai/clinical/note
// Body: { vitals, medications, existingComments }
exports.generateProgressNote = (req, res, next) => {
  try {
    const { vitals = {}, medications = [], existingComments = '' } = req.body;
    const note = generateProgressNote(vitals, medications, existingComments);
    res.json({ success: true, data: { note } });
  } catch (err) { next(err); }
};

// POST /api/ai/clinical/sbar
// Body: full sheet data { identification, triage, progress_notes, medication_mar }
exports.generateSBAR = (req, res, next) => {
  try {
    const { identification, triage, progress_notes, medication_mar } = req.body;
    if (!identification || !triage) {
      return res.status(400).json({ success: false, message: 'identification and triage data are required' });
    }
    const sbar = generateSBAR({ identification, triage, progress_notes, medication_mar });
    res.json({ success: true, data: { sbar } });
  } catch (err) { next(err); }
};

// GET /api/ai/clinical/frequencies
exports.getFrequencies = (_req, res, next) => {
  try {
    res.json({ success: true, data: FREQUENCY_LEGEND });
  } catch (err) { next(err); }
};

// GET /api/ai/clinical/icd11/all
exports.getAllICD11 = async (req, res, next) => {
  try {
    const data = await getAllCachedICD11();
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

// GET /api/ai/clinical/icd11/lookup
exports.lookupICD11 = async (req, res, next) => {
  try {
    const { code } = req.query;
    if (!code) {
      return res.status(400).json({ success: false, message: 'code query parameter is required' });
    }
    const data = await lookupICD11CodeDetails(code);
    if (!data) {
      return res.status(404).json({ success: false, message: `No details found for ICD-11 code: ${code}` });
    }
    res.json({ success: true, data });
  } catch (err) { next(err); }
};// POST /api/ai/clinical/dental-note
// Body: { toothData, treatmentPlan, patientName, patientId, dentitionType, existingNotes, provider }
exports.generateDentalNote = (req, res, next) => {
  try {
    const { toothData, treatmentPlan, patientName, patientId, dentitionType, existingNotes, provider } = req.body;
    const note = generateDentalNote({ toothData, treatmentPlan, patientName, patientId, dentitionType, existingNotes, provider });
    res.json({ success: true, data: { note } });
  } catch (err) { next(err); }
};

// POST /api/ai/dental/consumables-report
// Body: { department_id, from_date, to_date }
// Audience: Dental HoD + Stock Manager — Lumina AI learns usage patterns and generates insight report
exports.generateConsumablesReport = async (req, res, next) => {
  try {
    const { department_id, from_date, to_date } = req.body;
    const fromD = from_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const toD   = to_date   || new Date().toISOString().slice(0, 10);
    const deptFilter = department_id ? [department_id] : [];

    // ── 1. Raw usage breakdown per case_type + item ────────────────────────────
    const usageSql = `
      SELECT
        COALESCE(cl.case_type, COALESCE(cl.notes, 'General'))  AS case_type,
        cl.item_name,
        COUNT(*)                                                AS use_count,
        SUM(CASE WHEN cl.quantity > 0 THEN cl.quantity ELSE 0 END) AS total_qty,
        AVG(CASE WHEN cl.quantity > 0 THEN cl.quantity ELSE NULL END) AS avg_qty_per_use,
        SUM(CASE WHEN cl.quantity = 0 THEN 1 ELSE 0 END)       AS in_use_events,
        AVG(
          CASE WHEN cl.quantity = 0 AND cl.finished_at IS NOT NULL
          THEN (julianday(cl.finished_at) - julianday(cl.consumed_at)) * 24
          ELSE NULL END
        ) AS avg_hrs_in_use,
        cl.department_name
      FROM consumables_log cl
      WHERE cl.consumed_at >= $1
        AND cl.consumed_at <= $2
        ${deptFilter.length ? 'AND cl.department_id = $3' : ''}
      GROUP BY COALESCE(cl.case_type, COALESCE(cl.notes,'General')), cl.item_name, cl.department_name
      ORDER BY use_count DESC
    `;
    const usageArgs = deptFilter.length ? [fromD, toD + 'T23:59:59', department_id] : [fromD, toD + 'T23:59:59'];
    const { rows: usageRows } = await db.query(usageSql, usageArgs);

    // ── 2. Stale "In Use" items (open >72 hours with no Finished) ─────────────
    const staleSql = `
      SELECT item_name, department_name, consumed_at,
             ROUND((julianday('now') - julianday(consumed_at)) * 24, 1) AS hrs_open
      FROM consumables_log
      WHERE quantity = 0
        AND finished_at IS NULL
        AND consumed_at <= datetime('now', '-72 hours')
        ${deptFilter.length ? 'AND department_id = $1' : ''}
      ORDER BY hrs_open DESC
      LIMIT 20
    `;
    const staleArgs = deptFilter.length ? [department_id] : [];
    const { rows: staleRows } = await db.query(staleSql, staleArgs);

    // ── 3. Pre-built Lumina patterns for projection ────────────────────────────
    const patternSql = `
      SELECT case_type, item_name, total_uses, avg_qty_per_use, avg_duration_hrs
      FROM lumina_usage_patterns
      ${deptFilter.length ? 'WHERE department_id = $1' : ''}
      ORDER BY total_uses DESC
      LIMIT 30
    `;
    const patternArgs = deptFilter.length ? [department_id] : [];
    const { rows: patterns } = await db.query(patternSql, patternArgs);

    // ── 4. Summary stats ──────────────────────────────────────────────────────
    const totalLogs   = usageRows.reduce((s, r) => s + Number(r.use_count || 0), 0);
    const totalQty    = usageRows.reduce((s, r) => s + Number(r.total_qty || 0), 0);
    const uniqueItems = new Set(usageRows.map(r => r.item_name)).size;
    const caseTypes   = [...new Set(usageRows.map(r => r.case_type).filter(Boolean))];
    const deptName    = usageRows[0]?.department_name || 'Department';

    // ── 5. Lumina AI narrative generation (rule-engine) ───────────────────────
    const topItem    = usageRows[0];
    const topCaseType= caseTypes[0] || 'General';
    const staleCount = staleRows.length;

    const narrativeParts = [
      `During ${fromD} to ${toD}, ${deptName} logged ${totalLogs} consumable entr${totalLogs === 1 ? 'y' : 'ies'} covering ${uniqueItems} unique item${uniqueItems !== 1 ? 's' : ''}.`,
    ];

    if (topItem) {
      narrativeParts.push(
        `The most-used material was ${topItem.item_name} with ${topItem.use_count} log${topItem.use_count !== 1 ? 's' : ''} (total ${Number(topItem.total_qty || 0).toFixed(1)} units).`
      );
    }
    if (caseTypes.length > 0) {
      narrativeParts.push(
        `Materials were tracked across ${caseTypes.length} work categor${caseTypes.length === 1 ? 'y' : 'ies'}: ${caseTypes.slice(0, 4).join(', ')}${caseTypes.length > 4 ? ' and more' : ''}.`
      );
    }
    if (staleCount > 0) {
      narrativeParts.push(
        `⚠️ ${staleCount} item${staleCount !== 1 ? 's are' : ' is'} still marked In Use for over 72 hours without being marked Finished — this may indicate waste, extended use, or missed logging. Review recommended.`
      );
    } else {
      narrativeParts.push('All In Use items have been resolved within 72 hours — good material turnover.');
    }
    if (patterns.length > 0) {
      const projected = patterns.slice(0, 3).map(p =>
        `${p.item_name} (~${Number(p.avg_qty_per_use || 0).toFixed(1)} units/use avg)`
      ).join(', ');
      narrativeParts.push(`Lumina projects continued demand for: ${projected}.`);
    }
    narrativeParts.push('Ensure stock levels are reviewed against these usage rates. Contact the Stock Manager for reorder.');

    const narrative = narrativeParts.join(' ');

    // ── 6. Group usage by case_type for table display ─────────────────────────
    const byCaseType = {};
    for (const row of usageRows) {
      const ct = row.case_type || 'General';
      if (!byCaseType[ct]) byCaseType[ct] = [];
      byCaseType[ct].push({
        item:         row.item_name,
        use_count:    Number(row.use_count || 0),
        total_qty:    Number(row.total_qty || 0).toFixed(1),
        avg_qty:      row.avg_qty_per_use != null ? Number(row.avg_qty_per_use).toFixed(2) : '—',
        avg_hrs:      row.avg_hrs_in_use  != null ? Number(row.avg_hrs_in_use).toFixed(1)  : '—',
        in_use_events: Number(row.in_use_events || 0),
      });
    }

    res.json({
      success: true,
      data: {
        period:      { from: fromD, to: toD },
        department:  deptName,
        summary:     { total_logs: totalLogs, total_qty: totalQty, unique_items: uniqueItems, case_types: caseTypes.length },
        by_case_type: byCaseType,
        stale_items: staleRows.map(r => ({ item: r.item_name, hrs_open: Number(r.hrs_open), since: r.consumed_at })),
        patterns,
        narrative,
      },
    });
  } catch (err) { next(err); }
};
