'use strict';
const express = require('express');
const router = express.Router();
const { authMiddleware: authenticateToken } = require('../middleware/auth');
const authorizeRoles = require('../middleware/role');

router.use(authenticateToken);
router.use(authorizeRoles(['nurse', 'admin', 'doctor', 'consultant', 'reviewer', 'chef-nurse']));

// Mock data for demonstration
const MOCK_PATIENTS = {
  'P-1001': { id: 'P-1001', mrn: 'MRN-1001', first_name: 'John', last_name: 'MUGISHA', dob: '1979-05-12', gender: 'Male', insurance_provider: 'RSSB', allergies: 'None' },
  'P-1002': { id: 'P-1002', mrn: 'MRN-1002', first_name: 'Alice', last_name: 'UWIMANA', dob: '1995-08-22', gender: 'Female', insurance_provider: 'MMI', allergies: 'Penicillin' },
  'P-1003': { id: 'P-1003', mrn: 'MRN-1003', first_name: 'Eric', last_name: 'GAKURU', dob: '1962-01-15', gender: 'Male', insurance_provider: 'Private', allergies: 'None' },
  'P-1004': { id: 'P-1004', mrn: 'MRN-1004', first_name: 'Diane', last_name: 'KAMANZI', dob: '1990-11-03', gender: 'Female', insurance_provider: 'RSSB', allergies: 'Sulfa' },
};

const MOCK_VITALS = {
  'P-1001': [{ temperature: '36.5', pulse: '72', respiratory_rate: '18', blood_pressure: '120/80', spo2: '98', weight: '75', created_at: new Date().toISOString() }],
  'P-1002': [{ temperature: '37.2', pulse: '84', respiratory_rate: '20', blood_pressure: '110/70', spo2: '99', weight: '62', created_at: new Date().toISOString() }],
};

router.get('/:id', (req, res) => {
  const patient = MOCK_PATIENTS[req.params.id] || { 
    id: req.params.id, 
    mrn: 'MRN-' + req.params.id.split('-')[1], 
    first_name: 'Patient', 
    last_name: req.params.id, 
    dob: '1980-01-01', 
    gender: 'Other',
    insurance_provider: 'Unknown',
    allergies: 'None'
  };
  res.json(patient);
});

router.get('/:id/vitals', (req, res) => {
  const vitals = MOCK_VITALS[req.params.id] || [];
  res.json(vitals);
});

module.exports = router;
