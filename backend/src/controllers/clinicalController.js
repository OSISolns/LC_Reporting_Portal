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

const db = require('../config/db');

exports.getInventory = async (req, res) => {
  try {
    const { month_year } = req.query;
    if (!month_year) {
      return res.status(400).json({ success: false, message: 'month_year query parameter is required' });
    }
    const { rows } = await db.query(
      `SELECT * FROM nursing_monthly_stock WHERE month_year = $1`,
      [month_year]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error in getInventory:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.saveInventoryBulk = async (req, res) => {
  try {
    const { month_year, items } = req.body;
    if (!month_year || !Array.isArray(items)) {
      return res.status(400).json({ success: false, message: 'month_year and items array are required' });
    }

    const statements = items.map(item => {
      return {
        sql: `INSERT INTO nursing_monthly_stock (
          month_year, item_name, day, session, stock_in_hands, consumed, balance, responsible_name, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        ON CONFLICT(month_year, item_name, day, session) DO UPDATE SET
          stock_in_hands = excluded.stock_in_hands,
          consumed = excluded.consumed,
          balance = excluded.balance,
          responsible_name = excluded.responsible_name,
          updated_at = NOW()`,
        args: [
          month_year,
          item.item_name,
          item.day,
          item.session,
          parseInt(item.stock_in_hands, 10) || 0,
          parseInt(item.consumed, 10) || 0,
          parseInt(item.balance, 10) || 0,
          item.responsible_name || ''
        ]
      };
    });

    await db.batch(statements);
    res.json({ success: true, message: 'Inventory saved successfully' });
  } catch (error) {
    console.error('Error in saveInventoryBulk:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
