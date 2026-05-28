'use strict';
const {
  suggestMedications,
  generateAssessmentComments,
  generateProgressNote,
  generateSBAR,
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
