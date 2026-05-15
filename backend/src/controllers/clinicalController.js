'use strict';
const ClinicalObservation = require('../models/clinicalObservation');

exports.saveObservation = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { queue_id } = req.body;
    
    const existing = await ClinicalObservation.findByPatientAndQueue(patientId, queue_id, req.user);
    
    let result;
    if (existing) {
      result = await ClinicalObservation.update(patientId, queue_id, { ...req.body, isReviewer: req.user.role === 'reviewer' }, req.user);
    } else {
      result = await ClinicalObservation.create({ ...req.body, patient_id: patientId, isReviewer: req.user.role === 'reviewer' }, req.user.id);
    }
    
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error saving clinical observation:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.getObservation = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { queue_id } = req.query;
    
    const result = await ClinicalObservation.findByPatientAndQueue(patientId, queue_id, req.user);
    if (!result) {
      return res.status(404).json({ success: false, message: 'Observation not found' });
    }
    
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching clinical observation:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.getRecentObservations = async (req, res) => {
  try {
    const result = await ClinicalObservation.getRecent(req.user.id, req.user.role);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching recent clinical observations:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.getPDF = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { queue_id } = req.query;
    
    const observation = await ClinicalObservation.findByPatientAndQueue(patientId, queue_id, req.user);
    if (!observation) {
      return res.status(404).json({ success: false, message: 'Observation records not found' });
    }

    const { generateClinicalSheetPDF } = require('../utils/pdf');
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=ClinicalSheet_${patientId}.pdf`);
    
    await generateClinicalSheetPDF(observation, res);
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
