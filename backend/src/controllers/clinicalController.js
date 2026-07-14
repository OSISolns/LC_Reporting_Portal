'use strict';
const crypto = require('crypto');
const QRCode = require('qrcode');
const ExcelJS = require('exceljs');
const ClinicalObservation = require('../models/clinicalObservation');
const db = require('../config/db');
const itemClassificationTraining = require('../data/itemClassificationTraining.json');

// ─── Document Authenticity ─────────────────────────────────────────────────────
/**
 * Generates a deterministic 16-char HEX checksum over immutable observation fields.
 * The same observation will always produce the same checksum, enabling offline verification.
 */
const generateDocChecksum = (obs) => {
  const payload = [
    String(obs.id || ''),
    String(obs.patient_id || ''),
    String(obs.queue_id || ''),
    String(obs.patient_name || ''),
    String(obs.created_at || ''),
  ].join('|');
  return crypto.createHash('sha256').update(payload).digest('hex').substring(0, 16).toUpperCase();
};

/**
 * Generates QR code as a base64 data URI encoding the doc reference + checksum.
 * Format: LC-CLN-{id}|{checksum}
 */
const generateDocQRCode = async (obs) => {
  const checksum = generateDocChecksum(obs);
  const docRef = `LC-CLN-${String(obs.id).padStart(5, '0')}`;
  const payload = `${docRef}|${checksum}`;
  try {
    const dataUrl = await QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 96,
      color: { dark: '#1b669e', light: '#ffffff' },
    });
    return { dataUrl, checksum, docRef, payload };
  } catch (err) {
    console.error('QR Code generation failed:', err);
    return { dataUrl: null, checksum, docRef, payload };
  }
};

// ─── Inventory Item master List ───────────────────────────────────────────────
const INVENTORY_ITEMS = exports.INVENTORY_ITEMS = [
  "Aquabloc 15cm",
  "Adrenaline",
  "Adrenaline 1mg",
  "Alcohol pads",
  "Atropine 1mg",
  "Bande 15cm",
  "Bande 7.5cm",
  "Bupivacaine",
  "Buscopan",
  "Buscopan 20mg",
  "Catheter G16",
  "Catheter G18",
  "Catheter G20",
  "Catheter G22",
  "Catheter G24",
  "Ceftriaxone 1g",
  "Dexamethasone",
  "Dexamethasone 4mg",
  "Dexamethasone 8mg",
  "Dextrose 50%",
  "Diazepam 10mg",
  "Diclo 100mg Supp",
  "Diclofenac 75mg",
  "Diclofenac IM 75mg",
  "Dicynone 250mg",
  "Eau oxygénée 3%",
  "Emitino",
  "Esomeprazole",
  "Fentanyl",
  "Flagyl",
  "Furosemide",
  "Furosemide 20mg",
  "Gants Sterile 8",
  "Gants propre",
  "Gloves 7.5",
  "Glucose 5%",
  "Hydralazine 20mg",
  "Hydrocortisone 100mg",
  "IV Paracetamol 1g",
  "Ketamine 500mg",
  "Largactil 25mg",
  "Lidocaine",
  "Masque Neb Adulte",
  "Masque Neb Enfant",
  "Metoclopramide",
  "Metronidazole",
  "Midazolam 5mg",
  "Morphine 10mg",
  "NS (Normal Saline)",
  "Naloxone",
  "Nasal Oxygen Masque Enfant",
  "Nylon 2/0",
  "Nylon 4/0",
  "Nylon 5/0",
  "Pantoprazole 40mg",
  "Pap Smear",
  "Paracet 125mg Supp",
  "Paracet 250mg Supp",
  "Paracetamol 125mg",
  "Paracetamol Ces",
  "Paraffin Gauze 5cm",
  "Pause",
  "Pethidine",
  "Phenobarbital 100mg",
  "Phenytoin 250mg",
  "Phytomenadione 10mg",
  "Plaster",
  "Polyglactin 3/0",
  "Polyglactin 4/0",
  "Polypropylene 6/0",
  "Povidone 10%",
  "Propofol 200mg",
  "RL (Ringer's Lactate)",
  "Sac à urine",
  "Salbutamol",
  "Seringue 10cc",
  "Seringue 1cc (Insuline)",
  "Seringue 20cc",
  "Seringue 2cc",
  "Seringue 5cc",
  "Sonde Vésicale G10",
  "Sonde Vésicale G12",
  "Sonde Vésicale G16",
  "Spatula",
  "Speculum",
  "Sterile Gauze 10cm",
  "Surgical Blades N15",
  "Surgical Blades N23",
  "Tongue Depressor",
  "Tramadol",
  "Trousse",
  "Vaginal Swab",
  "Vicryl 2/0",
  "Vicryl 3/0",
  "Vicryl 4/0",
  "Vicryl 5/0",
  "Vit B complex",
  "Water for injection"
];

// ─── Sync Engine: Clinical Sheet → Daily Stock Checkup ────────────────────────
// Reads all clinical observations, aggregates medication/consumable usage,
// and upserts the consumed counts into nursing_monthly_stock.
const syncClinicalUsagesToInventory = async () => {
  try {
    console.log('🔄 Syncing clinical sheet usages to daily stock...');

    const { rows: observations } = await db.query(
      `SELECT co.ward, co.identification_json, co.medication_mar_json, u.full_name as nurse_name
       FROM clinical_observations co
       LEFT JOIN users u ON co.created_by = u.id`
    );

    const aggregates = {};

    const getWardType = (wardStr) => {
      if (!wardStr) return 'STN1';
      const normalized = wardStr.toUpperCase();
      if (normalized.includes('MINOR')) return 'MINOR';
      return 'STN1';
    };

    const { rows: masterItems } = await db.query("SELECT name FROM master_inventory");
    const inventoryMap = new Map();
    const itemsList = masterItems.length > 0 ? masterItems.map(r => r.name) : INVENTORY_ITEMS;
    itemsList.forEach(item => {
      inventoryMap.set(item.toLowerCase(), item);
    });

    observations.forEach(obs => {
      let identification = {};
      let medication_mar = {};

      try {
        identification = typeof obs.identification_json === 'string'
          ? JSON.parse(obs.identification_json)
          : (obs.identification_json || {});
      } catch (e) { }

      try {
        medication_mar = typeof obs.medication_mar_json === 'string'
          ? JSON.parse(obs.medication_mar_json)
          : (obs.medication_mar_json || {});
      } catch (e) { }

      const dateStr = identification.date;
      if (!dateStr || !dateStr.includes('-')) return;

      const dateParts = dateStr.split('-');
      if (dateParts.length < 3) return;

      const year = dateParts[0];
      const month = dateParts[1];
      const day = parseInt(dateParts[2], 10);
      if (isNaN(day)) return;

      const month_year = `${year}-${month}`;

      const timeStr = identification.time || '';
      let session = 'AM';
      if (timeStr.toUpperCase().includes('PM')) {
        session = 'PM';
      } else {
        const match = timeStr.match(/^(\d+):/);
        if (match && parseInt(match[1], 10) >= 13) {
          session = 'PM';
        }
      }

      let ward = obs.ward;
      if (!ward && identification.ward) {
        ward = identification.ward;
      }
      const wardType = getWardType(ward);
      const nurseName = obs.nurse_name || 'System Sync';

      const interventions = medication_mar.interventions || [];
      interventions.forEach(interv => {
        const name = (interv.name || '').trim();
        if (!name) return;

        const matchedItem = inventoryMap.get(name.toLowerCase());
        if (!matchedItem) return;

        // Each named intervention on the sheet counts as 1 unit consumed.
        // The admin_logs table is a shared sheet-level log (not per-medication),
        // so using its length as a per-drug quantity was incorrect and inflated
        // every medication's count by the total number of administration events.
        const qty = 1;

        // Use || as separator to avoid conflicts with item names containing _
        const key = `${month_year}||${matchedItem}||${day}||${session}`;
        if (!aggregates[key]) {
          aggregates[key] = {
            consumed_obs1: 0,
            consumed_minor: 0,
            nurses_stn1: new Set(),
            nurses_minor: new Set()
          };
        }

        if (wardType === 'MINOR') {
          aggregates[key].consumed_minor += qty;
          if (nurseName) aggregates[key].nurses_minor.add(nurseName);
        } else {
          aggregates[key].consumed_obs1 += qty;
          if (nurseName) aggregates[key].nurses_stn1.add(nurseName);
        }
      });
    });

    console.log(`📊 ${Object.keys(aggregates).length} usage records aggregated from clinical sheets.`);

    const statements = [];
    for (const key of Object.keys(aggregates)) {
      const parts = key.split('||');
      const month_year = parts[0];
      const item_name = parts[1];
      const day = parseInt(parts[2], 10);
      const session = parts[3];
      const val = aggregates[key];

      const totalConsumed = val.consumed_obs1 + val.consumed_minor;
      const userStn1 = Array.from(val.nurses_stn1).join(', ') || '';
      const userMinor = Array.from(val.nurses_minor).join(', ') || '';

      statements.push({
        sql: `INSERT INTO nursing_monthly_stock (
          month_year, item_name, day, session, stock_in_hands, consumed, balance,
          consumed_obs1, consumed_minor, user_stn1, user_minor, responsible_name, updated_at
        ) VALUES ($1, $2, $3, $4, 0, $5, 0 - $5, $6, $7, $8, $9, 'Clinical Sheet Sync', CURRENT_TIMESTAMP)
        ON CONFLICT(month_year, item_name, day, session) DO UPDATE SET
          consumed = $5,
          balance = nursing_monthly_stock.stock_in_hands - $5,
          consumed_obs1 = $6,
          consumed_minor = $7,
          user_stn1 = $8,
          user_minor = $9,
          updated_at = CURRENT_TIMESTAMP`,
        args: [
          month_year,
          item_name,
          day,
          session,
          totalConsumed,
          val.consumed_obs1,
          val.consumed_minor,
          userStn1,
          userMinor
        ]
      });
    }

    if (statements.length > 0) {
      await db.batch(statements);
      console.log('✅ Daily stock synchronized from clinical sheets.');
    } else {
      console.log('ℹ️  No matching inventory items found in clinical sheets.');
    }
  } catch (error) {
    console.error('💥 syncClinicalUsagesToInventory error:', error);
    // NOTE: We intentionally do NOT re-throw — sync failure must never block a save.
  }
};

// ─── Clinical Observation: Save (Create or Update) ────────────────────────────
exports.saveObservation = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { queue_id } = req.body;

    const existing = await ClinicalObservation.findByPatientAndQueue(patientId, queue_id);

    // Enforce that only doctors and medical directors can set or update the diagnosis field
    const isDoctorOrMD = ['doctor', 'consultant', 'medical_director'].includes(req.user.role);
    if (!isDoctorOrMD) {
      if (req.body.identification) {
        const existingDiagnosis = existing && existing.identification ? existing.identification.diagnosis : '';
        req.body.identification.diagnosis = existingDiagnosis || '';
      }
    }

    // SBAR receiver sign-off must be set server-side whenever a sheet
    // transitions to Verified, regardless of which authorized role performs
    // the verification. The frontend only auto-populates this for chef-nurse
    // (its "Verify Sheet" button path) -- relying on that alone means any
    // other authorized verifier (doctor/consultant/medical_director) could
    // set status: 'Verified' with no received_by/received_sign_time, and
    // since a Verified sheet becomes permanently immutable for every role
    // (see the check below), that gap would be unrecoverable.
    const applyVerificationSignOff = (statusToSave) => {
      if (statusToSave !== 'Verified') return;
      if (!req.body.sbar) req.body.sbar = {};
      if (!req.body.sbar.received_by || !req.body.sbar.received_sign_time) {
        const nowStr = new Date().toLocaleString('en-US', {
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
        const verifierName = req.user.full_name || req.user.fullName || req.user.username || 'Verifier';
        req.body.sbar.received_by = `${verifierName} (${nowStr})`;
        req.body.sbar.received_sign_time = nowStr;
      }
    };

    let result;
    if (existing) {
      // When a clinical sheet is complete (Verified), nothing can be edited by any role
      if (existing.status === 'Verified') {
        return res.status(403).json({ success: false, message: 'This clinical sheet is already verified/completed and locked for edits.' });
      }

      // Enforce backend-level immutability for SBAR reported/received details once set
      if (existing.sbar) {
        if (!req.body.sbar) req.body.sbar = {};
        if (existing.sbar.reported_by) {
          req.body.sbar.reported_by = existing.sbar.reported_by;
        }
        if (existing.sbar.reported_sign_time) {
          req.body.sbar.reported_sign_time = existing.sbar.reported_sign_time;
        }
        if (existing.sbar.received_by) {
          req.body.sbar.received_by = existing.sbar.received_by;
        }
        if (existing.sbar.received_sign_time) {
          req.body.sbar.received_sign_time = existing.sbar.received_sign_time;
        }
      }

      const statusToSave = req.body.status || existing.status || 'Draft';

      // Only Chef Nurses can verify or keep a clinical sheet in verified status
      if (statusToSave === 'Verified' && !['chef-nurse', 'doctor', 'consultant', 'medical_director'].includes(req.user.role)) {
        return res.status(403).json({ success: false, message: 'Only authorized personnel can verify clinical sheets.' });
      }
      applyVerificationSignOff(statusToSave);

      if (!existing.patient_name) {
        const patientRes = await db.query(`SELECT full_name FROM sukraa_patients WHERE pid = $1`, [patientId]);
        const pName = patientRes.rows[0] ? patientRes.rows[0].full_name : 'Unknown Patient';
        await db.query(`UPDATE clinical_observations SET patient_name = $1 WHERE id = $2`, [pName, existing.id]);
        existing.patient_name = pName;
      }

      result = await ClinicalObservation.update(patientId, queue_id, { ...req.body, patient_name: existing.patient_name, status: statusToSave });
    } else {
      const statusToSave = req.body.status || 'Draft';

      // Only Chef Nurses, Doctors, and Consultants can create or verify clinical sheets with Verified status
      if (statusToSave === 'Verified' && !['chef-nurse', 'doctor', 'consultant', 'medical_director'].includes(req.user.role)) {
        return res.status(403).json({ success: false, message: 'Only authorized personnel can verify clinical sheets.' });
      }
      applyVerificationSignOff(statusToSave);

      let patientName = req.body.patient_name;
      if (!patientName) {
        const patientRes = await db.query(`SELECT full_name FROM sukraa_patients WHERE pid = $1`, [patientId]);
        patientName = patientRes.rows[0] ? patientRes.rows[0].full_name : 'Unknown Patient';
      }

      result = await ClinicalObservation.create({ ...req.body, patient_name: patientName, status: statusToSave, patient_id: patientId }, req.user.id);
    }

    // Sync medicines & consumables to daily stock in background (non-blocking)
    syncClinicalUsagesToInventory();

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error saving clinical observation:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ─── Clinical Observation: Get single ─────────────────────────────────────────
exports.getObservation = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { queue_id } = req.query;

    const result = await ClinicalObservation.findByPatientAndQueue(patientId, queue_id);
    if (!result) {
      return res.status(404).json({ success: false, message: 'Observation not found' });
    }

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching clinical observation:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ─── Clinical Observation: Get recent ─────────────────────────────────────────
exports.getRecentObservations = async (req, res) => {
  try {
    const rows = await ClinicalObservation.getRecent(req.user.id);
    // identification_json/triage_json are stored as raw JSON strings -- flatten
    // the fields callers actually need (dob, gender, insurance, allergies) so
    // consumers don't have to know the storage shape or guess at key names.
    const result = rows.map(row => {
      let identification = {};
      let triage = {};
      try { identification = typeof row.identification_json === 'string' ? JSON.parse(row.identification_json) : (row.identification_json || {}); } catch (_) { }
      try { triage = typeof row.triage_json === 'string' ? JSON.parse(row.triage_json) : (row.triage_json || {}); } catch (_) { }
      const allergies = [triage.allergy_1, triage.allergy_2].filter(a => a && a.trim()).join(', ');
      return {
        ...row,
        dob: identification.dob || '',
        gender: identification.gender || '',
        insurance: identification.insurance || '',
        allergies
      };
    });
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching recent clinical observations:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ─── Clinical Observation: Get all for a patient ──────────────────────────────
exports.getAllObservations = async (req, res) => {
  try {
    const { patientId } = req.params;
    const result = await ClinicalObservation.getAllByPatient(patientId);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching all observations for patient:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ─── PDF Generation ───────────────────────────────────────────────────────────
exports.getPDF = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { queue_id } = req.query;

    const observation = await ClinicalObservation.findByPatientAndQueue(patientId, queue_id);
    if (!observation) {
      return res.status(404).json({ success: false, message: 'Observation records not found' });
    }

    if (observation.status !== 'Verified') {
      return res.status(403).json({ success: false, message: 'PDF can only be downloaded after it is verified by the Chef Nurse.' });
    }

    // Generate QR code + checksum for document authenticity
    const { dataUrl: qrCodeDataUrl, checksum, docRef } = await generateDocQRCode(observation);

    const { generateClinicalSheetPDF } = require('../utils/pdf');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="ClinicalSheet_${patientId}.pdf"`);
    // Expose checksum in header so callers can read it without parsing the PDF
    res.setHeader('X-Doc-Checksum', checksum);
    res.setHeader('X-Doc-Ref', docRef);

    await generateClinicalSheetPDF({ ...observation, _qrCodeDataUrl: qrCodeDataUrl, _checksum: checksum, _docRef: docRef }, res);
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ─── Document Verification ────────────────────────────────────────────────────
exports.verifyDocument = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { queue_id, checksum } = req.query;

    if (!checksum) {
      return res.status(400).json({ success: false, message: 'checksum query parameter is required' });
    }

    const observation = await ClinicalObservation.findByPatientAndQueue(patientId, queue_id);
    if (!observation) {
      return res.status(404).json({ success: false, verified: false, message: 'Document not found' });
    }

    const docRef = `LC-CLN-${String(observation.id).padStart(5, '0')}`;

    // A document that is not yet verified/received cannot be authenticated
    if (observation.status !== 'Verified') {
      return res.status(400).json({
        success: true,
        verified: false,
        docRef,
        status: observation.status,
        message: '❌ Document cannot be authenticated because it is not yet verified by the Chef Nurse.'
      });
    }

    const expectedChecksum = generateDocChecksum(observation);
    const verified = expectedChecksum === checksum.toUpperCase();

    res.json({
      success: true,
      verified,
      docRef,
      checksum: expectedChecksum,
      patient_name: observation.patient_name,
      patient_id: observation.patient_id,
      queue_id: observation.queue_id,
      status: observation.status,
      created_at: observation.created_at,
      message: verified
        ? '✅ Document is AUTHENTIC — checksum matches the original record.'
        : '❌ Document is INVALID — checksum does NOT match. This document may have been altered.',
    });
  } catch (error) {
    console.error('Error verifying document:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ─── Get checksum for a document (for display in UI) ──────────────────────────
exports.getDocChecksum = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { queue_id } = req.query;

    const observation = await ClinicalObservation.findByPatientAndQueue(patientId, queue_id);
    if (!observation) {
      return res.status(404).json({ success: false, message: 'Observation not found' });
    }

    // A document that is not yet verified/received cannot be authenticated
    if (observation.status !== 'Verified') {
      return res.status(400).json({
        success: false,
        message: 'This document cannot be authenticated because it is not yet verified/received by the Chef Nurse.'
      });
    }

    const checksum = generateDocChecksum(observation);
    const docRef = `LC-CLN-${String(observation.id).padStart(5, '0')}`;
    const { dataUrl: qrCodeDataUrl } = await generateDocQRCode(observation);

    res.json({
      success: true,
      checksum,
      docRef,
      qrCodeDataUrl,
      patient_name: observation.patient_name,
      status: observation.status,
      created_at: observation.created_at,
    });
  } catch (error) {
    console.error('Error getting doc checksum:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ─── Inventory: Get deleted items for a month ─────────────────────────────────
exports.getDeletedItems = async (req, res) => {
  try {
    const { month_year } = req.query;
    if (!month_year) {
      return res.status(400).json({ success: false, message: 'month_year is required' });
    }
    const { rows } = await db.query(
      `SELECT item_name FROM nursing_deleted_items WHERE month_year = $1 ORDER BY deleted_at ASC`,
      [month_year]
    );
    res.json({ success: true, data: rows.map(r => r.item_name) });
  } catch (error) {
    console.error('Error getting deleted items:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ─── Inventory: Save (replace) deleted items list for a month ─────────────────
exports.saveDeletedItems = async (req, res) => {
  try {
    const { month_year, deleted_items } = req.body;
    if (!month_year || !Array.isArray(deleted_items)) {
      return res.status(400).json({ success: false, message: 'month_year and deleted_items array are required' });
    }

    const deletedBy = req.user?.fullName || req.user?.username || 'System';

    // Remove all existing deleted items for this month, then insert fresh list
    await db.query(`DELETE FROM nursing_deleted_items WHERE month_year = $1`, [month_year]);

    if (deleted_items.length > 0) {
      for (const itemName of deleted_items) {
        await db.query(
          `INSERT INTO nursing_deleted_items (month_year, item_name, deleted_by) VALUES ($1, $2, $3)
           ON CONFLICT(month_year, item_name) DO NOTHING`,
          [month_year, itemName, deletedBy]
        );
      }
    }

    res.json({ success: true, message: `Deleted items list updated for ${month_year}.` });
  } catch (error) {
    console.error('Error saving deleted items:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ─── Inventory: Get all stock for a month ─────────────────────────────────────
// Helper to generate a random 8-character password
function generateRandomPassword(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let pwd = '';
  for (let i = 0; i < length; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pwd;
}

// Helper to format month year (e.g. 2026-06 -> June 2026)
function formatMonthYear(my) {
  if (!my || !my.includes('-')) return my;
  const [year, month] = my.split('-');
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const mIndex = parseInt(month, 10) - 1;
  if (mIndex >= 0 && mIndex < 12) {
    return `${monthNames[mIndex]} ${year}`;
  }
  return my;
}

// ─── Inventory: Get all stock for a month ─────────────────────────────────────
exports.getInventory = async (req, res) => {
  try {
    const { month_year } = req.query;
    if (!month_year) {
      return res.status(400).json({ success: false, message: 'month_year query parameter is required' });
    }

    // Auto-generate unlock password if it doesn't exist for this month
    const { rows: pwdRows } = await db.query(
      `SELECT password FROM nursing_unlock_passwords WHERE month_year = $1`,
      [month_year]
    );

    let currentPassword = '';
    if (pwdRows.length === 0) {
      currentPassword = generateRandomPassword(8);
      await db.query(
        `INSERT INTO nursing_unlock_passwords (month_year, password) VALUES ($1, $2)`,
        [month_year, currentPassword]
      );
    } else {
      currentPassword = pwdRows[0].password;
    }

    // Always ensure admins have a notification with this month's password
    try {
      const Notification = require('../models/notification');
      const User = require('../models/user');
      const admins = await User.findByRole('admin');

      const monthLabel = formatMonthYear(month_year);
      const title = `Stock Unlock Password Generated`;
      const message = `The stock unlock password for ${monthLabel} has been generated: ${currentPassword}`;

      for (const admin of admins) {
        // Query if notification already exists for this admin
        const { rows: existingNotifs } = await db.query(
          `SELECT id FROM notifications WHERE user_id = $1 AND title = $2`,
          [admin.id, title]
        );
        if (existingNotifs.length === 0) {
          await Notification.create({
            userId: admin.id,
            title,
            message,
            type: 'info',
            link: '/clinical/inventory-checkup'
          });
        }
      }
    } catch (notifyErr) {
      console.error('Failed to notify admins of stock password:', notifyErr);
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

// ─── Inventory: Unlock editing for a month ────────────────────────────────────
exports.unlockInventory = async (req, res) => {
  try {
    const { month_year, password } = req.body;
    if (!month_year || !password) {
      return res.status(400).json({ success: false, message: 'month_year and password are required' });
    }

    const { rows } = await db.query(
      `SELECT password FROM nursing_unlock_passwords WHERE month_year = $1`,
      [month_year]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Unlock password not found for this month.' });
    }

    const correctPassword = rows[0].password;
    if (correctPassword === password.trim()) {
      // Log the unlock action
      try {
        const { logAction } = require('../middleware/audit');
        await logAction(req, 'UNLOCK_STOCK', 'nursing_stock', null, { month_year });
      } catch (logErr) {
        console.error('Failed to log unlock action:', logErr);
      }

      // Store in dedicated unlock logs table
      try {
        await db.query(
          `INSERT INTO nursing_stock_unlocks (month_year, user_id, username, full_name) VALUES ($1, $2, $3, $4)`,
          [month_year, req.user.id, req.user.username, req.user.full_name || req.user.fullName]
        );
      } catch (dbErr) {
        console.error('Failed to log stock unlock to DB:', dbErr);
      }

      return res.json({ success: true, message: 'Stock editing unlocked successfully.' });
    } else {
      return res.status(401).json({ success: false, message: 'Incorrect password. Stock editing remains locked.' });
    }
  } catch (error) {
    console.error('Error in unlockInventory:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ─── Inventory: Get current stock unlock password (admin only) ────────────────
exports.getStockPassword = async (req, res) => {
  try {
    const { month_year } = req.query;
    if (!month_year) {
      return res.status(400).json({ success: false, message: 'month_year query parameter is required' });
    }

    const { rows } = await db.query(
      `SELECT password, created_at FROM nursing_unlock_passwords WHERE month_year = $1`,
      [month_year]
    );

    if (rows.length === 0) {
      return res.json({ success: true, password: null, message: 'No password generated yet for this month.' });
    }

    return res.json({ success: true, password: rows[0].password, created_at: rows[0].created_at });
  } catch (error) {
    console.error('Error in getStockPassword:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ─── Inventory: Regenerate stock unlock password (admin only) ─────────────────
exports.regenerateStockPassword = async (req, res) => {
  try {
    const { month_year } = req.body;
    if (!month_year) {
      return res.status(400).json({ success: false, message: 'month_year is required' });
    }

    const newPassword = generateRandomPassword(8);
    const monthLabel = formatMonthYear(month_year);

    // Upsert the password
    await db.query(
      `INSERT INTO nursing_unlock_passwords (month_year, password)
       VALUES ($1, $2)
       ON CONFLICT (month_year) DO UPDATE SET password = EXCLUDED.password`,
      [month_year, newPassword]
    );

    // Notify all admins of the new password
    try {
      const Notification = require('../models/notification');
      const User = require('../models/user');
      const admins = await User.findByRole('admin');
      const title = `Stock Unlock Password Regenerated`;
      const message = `The stock unlock password for ${monthLabel} has been regenerated: ${newPassword}`;

      for (const admin of admins) {
        await Notification.create({
          userId: admin.id,
          title,
          message,
          type: 'info',
          link: '/clinical/inventory-checkup'
        });
      }
    } catch (notifyErr) {
      console.error('Failed to notify admins of regenerated password:', notifyErr);
    }

    // Log the action
    try {
      const { logAction } = require('../middleware/audit');
      await logAction(req, 'REGENERATE_STOCK_PASSWORD', 'nursing_unlock_passwords', null, { month_year });
    } catch (logErr) {
      console.error('Failed to log password regeneration:', logErr);
    }

    return res.json({ success: true, password: newPassword, message: `Password regenerated for ${monthLabel}.` });
  } catch (error) {
    console.error('Error in regenerateStockPassword:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};


// ─── Inventory: Bulk save (from DailyInventoryCheckup) ────────────────────────
exports.saveInventoryBulk = async (req, res) => {
  try {
    const { month_year, items } = req.body;
    if (!month_year || !Array.isArray(items)) {
      return res.status(400).json({ success: false, message: 'month_year and items array are required' });
    }

    const updater = req.user?.fullName || req.user?.username || 'System';

    // Fetch existing records for this month/year to compare and log changes
    const { rows: existingRows } = await db.query(
      `SELECT item_name, day, session, stock_in_hands, consumed, consumed_obs1, consumed_minor, user_stn1, user_minor FROM nursing_monthly_stock WHERE month_year = $1`,
      [month_year]
    );

    const existingMap = {};
    existingRows.forEach(row => {
      const key = `${row.item_name}-${row.day}-${row.session}`;
      existingMap[key] = row;
    });

    const logsToInsert = [];

    const statements = items.map(item => {
      const existing = existingMap[`${item.item_name}-${item.day}-${item.session}`];

      const oldStock = existing?.stock_in_hands || 0;
      const oldConsumed = existing?.consumed || 0;
      const oldObs1 = existing?.consumed_obs1 || 0;
      const oldMinor = existing?.consumed_minor || 0;
      const oldUObs1 = existing?.user_stn1 || '';
      const oldUMinor = existing?.user_minor || '';

      const newStock = parseInt(item.stock_in_hands, 10) || 0;
      const newObs1 = parseInt(item.consumed_obs1, 10) || 0;
      const newMinor = parseInt(item.consumed_minor, 10) || 0;
      const newUObs1 = item.user_stn1 || '';
      const newUMinor = item.user_minor || '';

      // Force consistency: consumed = obs1 + minor, balance = stock - consumed
      const newConsumed = newObs1 + newMinor;
      const newBalance = newStock - newConsumed;

      // Log if the user manually edited this specific cell (prevents ripple-effect spam)
      if (
        item.manually_edited === true &&
        (oldStock !== newStock ||
        oldConsumed !== newConsumed ||
        oldObs1 !== newObs1 ||
        oldMinor !== newMinor ||
        oldUObs1 !== newUObs1 ||
        oldUMinor !== newUMinor)
      ) {
        logsToInsert.push({
          sql: `INSERT INTO nursing_stock_change_logs (
              month_year, item_name, day, session, old_stock, new_stock, old_consumed, new_consumed, updated_by,
              old_consumed_obs1, new_consumed_obs1, old_consumed_minor, new_consumed_minor,
              old_user_stn1, new_user_stn1, old_user_minor, new_user_minor
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
          args: [
            month_year,
            item.item_name,
            item.day,
            item.session,
            oldStock,
            newStock,
            oldConsumed,
            newConsumed,
            updater,
            oldObs1,
            newObs1,
            oldMinor,
            newMinor,
            oldUObs1,
            newUObs1,
            oldUMinor,
            newUMinor
          ]
        });
      }

      const newManuallyEdited = item.manually_edited ? 1 : 0;

      return {
        sql: `INSERT INTO nursing_monthly_stock (
            month_year, item_name, day, session, stock_in_hands, consumed, balance, responsible_name, expiration_date, status, category,
            consumed_obs1, consumed_minor, user_stn1, user_minor, manually_edited, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, CURRENT_TIMESTAMP)
          ON CONFLICT(month_year, item_name, day, session) DO UPDATE SET
            stock_in_hands = excluded.stock_in_hands,
            consumed = excluded.consumed,
            balance = excluded.balance,
            responsible_name = excluded.responsible_name,
            expiration_date = excluded.expiration_date,
            status = excluded.status,
            category = excluded.category,
            consumed_obs1 = excluded.consumed_obs1,
            consumed_minor = excluded.consumed_minor,
            user_stn1 = excluded.user_stn1,
            user_minor = excluded.user_minor,
            manually_edited = CASE WHEN excluded.manually_edited = 1 THEN 1 ELSE nursing_monthly_stock.manually_edited END,
            updated_at = CURRENT_TIMESTAMP`,
        args: [
          month_year,
          item.item_name,
          item.day,
          item.session,
          newStock,
          newConsumed,
          newBalance,
          item.responsible_name || '',
          item.expiration_date || '',
          item.status || '',
          item.category || '',
          newObs1,
          newMinor,
          newUObs1,
          newUMinor,
          newManuallyEdited
        ]
      };
    });

    await db.batch([...statements, ...logsToInsert]);

    // ─── Sync closing balance back to department_stock for NURSING ───────────
    try {
      const latestBalancesMap = {};
      items.forEach(item => {
        const name = item.item_name;
        if (!name) return;
        const day = parseInt(item.day, 10) || 1;
        const session = item.session || '';
        
        const newStock = parseInt(item.stock_in_hands, 10) || 0;
        const newObs1 = parseInt(item.consumed_obs1, 10) || 0;
        const newMinor = parseInt(item.consumed_minor, 10) || 0;
        const newConsumed = newObs1 + newMinor;
        const newBalance = newStock - newConsumed;

        const currentEntry = latestBalancesMap[name];
        const sessionPriority = (s) => {
          const lower = String(s).toLowerCase();
          // PM/night/evening are the day's later (closing) session and must
          // outrank AM so the reverse-sync uses the true latest balance.
          if (lower.includes('pm') || lower.includes('night') || lower.includes('evening')) return 2;
          if (lower.includes('afternoon')) return 1.5;
          return 1;
        };

        if (!currentEntry || 
            day > currentEntry.day || 
            (day === currentEntry.day && sessionPriority(session) > sessionPriority(currentEntry.session))) {
          latestBalancesMap[name] = {
            day,
            session,
            balance: newBalance
          };
        }
      });

      const { rows: deptRows } = await db.query("SELECT id FROM departments WHERE UPPER(name) = 'NURSING' LIMIT 1");
      const deptId = deptRows[0]?.id || 121;

      const itemNames = Object.keys(latestBalancesMap);
      if (itemNames.length > 0) {
        // Normalized exact-name match. All Nursing daily-stock items are
        // registered in master_inventory with matching names (see
        // scripts/reconcile_nursing_stock.js), so a direct upper/trim match
        // covers all 91 items — no hardcoded per-item mapping needed.
        const norm = (s) => String(s || '').toUpperCase().trim();
        const searchNames = Array.from(new Set(itemNames.map(norm)));

        const placeholders = searchNames.map((_, idx) => `$${idx + 1}`).join(', ');
        const { rows: matchedItems } = await db.query(
          `SELECT id, name FROM master_inventory WHERE UPPER(TRIM(name)) IN (${placeholders})`,
          searchNames
        );

        const itemMap = {};
        matchedItems.forEach(mi => { itemMap[norm(mi.name)] = mi.id; });

        for (const name of itemNames) {
          const itemId = itemMap[norm(name)];
          if (!itemId) continue;

          const newQty = latestBalancesMap[name].balance;

          const { rows: existingDeptStock } = await db.query(
            "SELECT id FROM department_stock WHERE department_id = $1 AND item_id = $2 ORDER BY id DESC",
            [deptId, itemId]
          );

          if (existingDeptStock.length > 0) {
            await db.query(
              "UPDATE department_stock SET quantity = $1 WHERE id = $2",
              [newQty, existingDeptStock[0].id]
            );
            if (existingDeptStock.length > 1) {
              const extraIds = existingDeptStock.slice(1).map(r => r.id);
              const extraPlaceholders = extraIds.map((_, idx) => `$${idx + 1}`).join(', ');
              await db.query(
                `UPDATE department_stock SET quantity = 0 WHERE id IN (${extraPlaceholders})`,
                extraIds
              );
            }
          } else {
            const { rows: batchRows } = await db.query(
              "SELECT id FROM stock_batches WHERE item_id = $1 ORDER BY id DESC LIMIT 1",
              [itemId]
            );
            const batchId = batchRows[0]?.id || null;

            await db.query(
              "INSERT INTO department_stock (department_id, item_id, batch_id, quantity) VALUES ($1, $2, $3, $4)",
              [deptId, itemId, batchId, newQty]
            );
          }
        }
        console.log(`✅ Synced daily checkup quantities for ${itemNames.length} items to department_stock NURSING.`);
      }
    } catch (syncErr) {
      console.error('❌ Failed to sync daily checkup back to department_stock:', syncErr);
    }

    res.json({ success: true, message: 'Inventory saved and audit logs created successfully' });
  } catch (error) {
    console.error('Error in saveInventoryBulk:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ─── Inventory: Get audit change logs ──────────────────────────────────────────
exports.getInventoryChangeLogs = async (req, res) => {
  try {
    const { date, month_year, consumed_only } = req.query;
    let sql = `
      SELECT l.*, u.full_name as user_full_name 
      FROM nursing_stock_change_logs l
      LEFT JOIN users u ON LOWER(l.updated_by) = LOWER(u.username)
    `;
    let params = [];
    let conditions = [];

    if (date) {
      conditions.push(`date(l.updated_at) = $${params.length + 1}`);
      params.push(date);
    } else if (month_year) {
      conditions.push(`l.month_year = $${params.length + 1}`);
      params.push(month_year);
    }

    if (consumed_only === 'true') {
      conditions.push('(l.new_consumed > l.old_consumed OR l.new_consumed_obs1 > l.old_consumed_obs1 OR l.new_consumed_minor > l.old_consumed_minor)');
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY l.updated_at DESC';

    if (consumed_only !== 'true') {
      sql += ' LIMIT 3000';
    }

    const { rows } = await db.query(sql, params);
    const data = rows.map(row => ({
      ...row,
      updated_by: row.user_full_name || row.updated_by || 'System'
    }));
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error in getInventoryChangeLogs:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ─── Inventory: Return item master list ───────────────────────────────────────
// ─── Medications: search FDA generic-name cache (autocomplete) ────────────────
// Backed by the Rwanda FDA register (fda_medications, ~2,083 generic names),
// not Central Store's master_inventory -- doctors need the full national drug
// vocabulary to prescribe from, independent of what the clinic currently
// stocks.
exports.searchFdaMedications = async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const limit = Math.min(parseInt(req.query.limit, 10) || 15, 50);

    if (!q) {
      return res.json({ success: true, data: [] });
    }

    const { rows } = await db.query(
      `SELECT generic_name FROM fda_medications
       WHERE generic_name LIKE $1
       ORDER BY
         CASE WHEN generic_name LIKE $2 THEN 0 ELSE 1 END,
         LENGTH(generic_name) ASC,
         generic_name ASC
       LIMIT $3`,
      [`%${q}%`, `${q}%`, limit]
    );

    res.json({ success: true, data: rows.map(r => r.generic_name) });
  } catch (error) {
    console.error('Error in searchFdaMedications:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.getInventoryItems = async (req, res) => {
  try {
    // Optional ?category filter (e.g. "medications") so callers that only
    // want prescribable drugs -- not the full Central Store catalog of
    // supplies, sutures, stationery, dental/lab items, etc. -- can ask for
    // just that. Omitting it preserves the previous "everything" behavior
    // for callers (like the nursing MAR sheet) that need the full list.
    const { category } = req.query;
    const { rows } = category
      ? await db.query("SELECT name FROM master_inventory WHERE category = $1 ORDER BY name ASC", [category])
      : await db.query("SELECT name FROM master_inventory ORDER BY name ASC");
    const items = rows.length > 0 ? rows.map(r => r.name) : (category ? [] : INVENTORY_ITEMS);
    res.json({ success: true, data: items });
  } catch (error) {
    console.error('Error in getInventoryItems:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ─── Inventory: Manual sync trigger endpoint ──────────────────────────────────
exports.triggerInventorySync = async (req, res) => {
  await syncClinicalUsagesToInventory();
  res.json({ success: true, message: 'Inventory synchronized from clinical sheets.' });
};

exports.syncClinicalUsagesToInventory = syncClinicalUsagesToInventory;

// ─── Clinical Observations: List all (summary view) ───────────────────────────
exports.getAllObservationsList = async (req, res) => {
  try {
    const { search = '', status = '', from = '', to = '' } = req.query;
    const isPrivileged = ['admin', 'chef-nurse', 'doctor', 'consultant', 'medical_director'].includes(req.user.role);

    let sql = `
      SELECT
        co.id, co.patient_id, co.queue_id, co.patient_name, co.ward, co.bed,
        co.status, co.created_at, co.updated_at,
        u.full_name AS created_by_name,
        co.identification_json, co.triage_json
      FROM clinical_observations co
      LEFT JOIN users u ON co.created_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      sql += ` AND (co.patient_name LIKE $${params.length + 1} OR co.patient_id LIKE $${params.length + 2} OR co.queue_id LIKE $${params.length + 3})`;
      const like = `%${search}%`;
      params.push(like, like, like);
    }
    if (status) {
      sql += ` AND co.status = $${params.length + 1}`;
      params.push(status);
    }
    if (from) {
      sql += ` AND date(co.created_at) >= $${params.length + 1}`;
      params.push(from);
    }
    if (to) {
      sql += ` AND date(co.created_at) <= $${params.length + 1}`;
      params.push(to);
    }

    sql += ` ORDER BY co.updated_at DESC LIMIT 200`;

    const { rows } = await db.query(sql, params);

    const data = rows.map(row => {
      let triage = {};
      try { triage = typeof row.triage_json === 'string' ? JSON.parse(row.triage_json) : (row.triage_json || {}); } catch (_) { }
      let identification = {};
      try { identification = typeof row.identification_json === 'string' ? JSON.parse(row.identification_json) : (row.identification_json || {}); } catch (_) { }
      return {
        id: row.id,
        patient_id: row.patient_id,
        queue_id: row.queue_id,
        patient_name: row.patient_name,
        gender: identification.gender || '',
        dob: identification.dob || '',
        ward: row.ward || identification.ward || '',
        bed: row.bed || identification.bed || '',
        status: row.status,
        bp: triage.bp || '',
        temp: triage.temp || '',
        spo2: triage.spo2 || '',
        created_by_name: row.created_by_name || '',
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    });

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error in getAllObservationsList:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ─── E-Prescriptions: Get completed prescriptions ──────────────────────────────
exports.getCompletedPrescriptions = async (req, res) => {
  try {
    // Return all clinical sheets that have prescriptions (medication_mar_json->>'interventions' has data)
    // sukraa_patients is joined for age/phone -- those are never captured in
    // identification_json (the prescription form only sends medications,
    // diagnosis, medical_note to the backend), so the patient master cache is
    // the only available source when reprinting a historical prescription.
    // NOTE: u.full_name and sp.age/phone/dob/gender/insurance are intentionally
    // NOT aliased -- the transparent field-level encryption layer (db.js)
    // decrypts by exact column name against ENCRYPTED_COLUMNS, so an alias
    // like "AS doctor_name" or "AS cached_age" silently skips decryption and
    // leaks ciphertext straight to the client. Rename in JS instead of SQL.
    let sql = `
      SELECT
        co.id, co.patient_id, co.patient_name, co.status, co.created_at, co.updated_at,
        u.full_name,
        co.medication_mar_json, co.identification_json,
        sp.age, sp.phone, sp.dob, sp.gender, sp.insurance
      FROM clinical_observations co
      LEFT JOIN users u ON co.created_by = u.id
      LEFT JOIN sukraa_patients sp ON sp.pid = co.patient_id
      WHERE co.medication_mar_json IS NOT NULL
        AND co.medication_mar_json != '{}'
      ORDER BY co.updated_at DESC LIMIT 100
    `;
    const { rows } = await db.query(sql);

    // Filter to those that actually have valid medications
    const data = [];
    for (const row of rows) {
      let medMar = {};
      try { medMar = typeof row.medication_mar_json === 'string' ? JSON.parse(row.medication_mar_json) : (row.medication_mar_json || {}); } catch (_) { }

      let ident = {};
      try { ident = typeof row.identification_json === 'string' ? JSON.parse(row.identification_json) : (row.identification_json || {}); } catch (_) { }

      let fallbackName = row.patient_name;
      if (!fallbackName) {
        const first = ident.first_name || '';
        const last = ident.last_name || '';
        fallbackName = `${last} ${first}`.trim();
      }
      if (!fallbackName) {
        fallbackName = 'Unknown Patient';
      }

      const interventions = Array.isArray(medMar) ? medMar : (medMar.interventions || []);

      if (interventions && Array.isArray(interventions)) {
        const validMeds = interventions.filter(m => m && m.name && m.name.trim());
        if (validMeds.length > 0) {
          data.push({
            id: row.id,
            patient_id: row.patient_id,
            patient_name: fallbackName,
            doctor_name: row.full_name,
            status: row.status,
            created_at: row.created_at,
            updated_at: row.updated_at,
            diagnosis: ident.diagnosis || '',
            medical_note: ident.medical_note || '',
            // Prefer what was actually recorded on this clinical sheet at the
            // time; fall back to the current patient master cache. age/phone
            // are never stored on the sheet at all, so the cache is the only
            // source for them.
            dob: ident.dob || row.dob || '',
            gender: ident.gender || row.gender || '',
            insurance: ident.insurance || row.insurance || '',
            age: row.age || '',
            phone: row.phone || '',
            medications: validMeds
          });
        }
      }
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error in getCompletedPrescriptions:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ─── Inventory: Export full styled spreadsheet as .xlsx with nested headers and formulas ───
exports.exportInventoryExcel = async (req, res) => {
  try {
    const { months } = req.query; // Expecting comma-separated months, e.g. "2026-05,2026-04"
    if (!months) {
      return res.status(400).json({ success: false, message: 'months parameter is required' });
    }

    const monthList = months.split(',').map(m => m.trim()).filter(Boolean);
    if (monthList.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one month is required' });
    }

    // Sort months chronologically
    monthList.sort();

    const placeholders = monthList.map((_, idx) => `$${idx + 1}`).join(', ');
    const { rows } = await db.query(
      `SELECT * FROM nursing_monthly_stock WHERE month_year IN (${placeholders})`,
      monthList
    );

    // Group rows by month_year, item_name, day, session
    const dataMap = {};
    rows.forEach(row => {
      const my = row.month_year;
      const item = row.item_name;
      const day = row.day;
      const sess = row.session; // "AM" or "PM"

      if (!dataMap[my]) dataMap[my] = {};
      if (!dataMap[my][item]) dataMap[my][item] = {};
      if (!dataMap[my][item][day]) dataMap[my][item][day] = {};
      dataMap[my][item][day][sess] = {
        stock_in_hands: row.stock_in_hands,
        consumed: row.consumed,
        responsible_name: row.responsible_name
      };
    });

    const workbook = new ExcelJS.Workbook();

    // Helper to generate column letter from 1-based index
    const colLetter = (colIdx) => {
      let temp = colIdx;
      let letter = '';
      while (temp > 0) {
        let modulo = (temp - 1) % 26;
        letter = String.fromCharCode(65 + modulo) + letter;
        temp = Math.floor((temp - modulo) / 26);
      }
      return letter;
    };

    // Helper to getMonthLabel
    const getMonthLabel = (my) => {
      if (!my) return '';
      const [year, month] = my.split('-');
      const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();
    };

    const uniqueItems = Array.from(new Set(rows.map(r => r.item_name))).sort();
    const itemsToExport = uniqueItems.length > 0 ? uniqueItems : INVENTORY_ITEMS;

    monthList.forEach((my) => {
      const baseSheetName = getMonthLabel(my) || my;
      const dailySheetName = `${baseSheetName} - DAILY`;
      const weeklySheetName = `${baseSheetName} - WEEKLY`;
      const sheetName = baseSheetName; // for compatibility in daily sheet header

      // Determine if previous month exists in selected months list for inter-sheet linkage
      const [year, month] = my.split('-');
      const daysInMonth = new Date(parseInt(year, 10), parseInt(month, 10), 0).getDate();

      const prevDate = new Date(parseInt(year, 10), parseInt(month, 10) - 2, 1);
      const prevYr = prevDate.getFullYear();
      const prevMo = String(prevDate.getMonth() + 1).padStart(2, '0');
      const prevMyStr = `${prevYr}-${prevMo}`;

      const hasPrevSheet = monthList.includes(prevMyStr);
      const prevSheetName = hasPrevSheet ? `${getMonthLabel(prevMyStr) || prevMyStr} - DAILY` : null;

      // Excel limits sheet names to 31 chars
      const worksheet = workbook.addWorksheet(dailySheetName.substring(0, 31));

      // Setup worksheet properties
      worksheet.views = [{ showGridLines: true }];

      // Header Title Blocks
      worksheet.mergeCells('A1:B1');
      worksheet.getCell('A1').value = "MONTHLY STOCK LEDGER";
      worksheet.getCell('A1').font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFF' } };
      worksheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0369A1' } }; // Sky-700
      worksheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

      // Merge remaining cells in Row 1 to look like a beautiful banner
      const bannerColCount = 2 + daysInMonth * 9;
      worksheet.mergeCells(`C1:${colLetter(bannerColCount)}1`);
      worksheet.getCell('C1').value = sheetName;
      worksheet.getCell('C1').font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFF' } };
      worksheet.getCell('C1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0369A1' } };
      worksheet.getCell('C1').alignment = { vertical: 'middle', horizontal: 'right' };

      worksheet.getRow(1).height = 40;

      worksheet.mergeCells(`A2:${colLetter(bannerColCount)}2`);
      worksheet.getCell('A2').value = "DAILY INVENTORY AUDIT GRID - RECONCILED VIA FORMULA: BALANCE = STOCK - CONSUMED";
      worksheet.getCell('A2').font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF475569' } }; // slate-600
      worksheet.getCell('A2').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }; // slate-100
      worksheet.getCell('A2').alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
      worksheet.getRow(2).height = 20;

      // Columns definitions
      const columns = [
        { header: 'ITEMS master', key: 'item_name', width: 28 },
        { header: 'SPC', key: 'spc', width: 6 }
      ];

      // Generate column headers for day 1 to daysInMonth
      // For each Day, we have 4 columns for AM, 4 columns for PM, 1 spacer. Total 9 columns per day.
      for (let d = 1; d <= daysInMonth; d++) {
        columns.push(
          { header: 'STOCK (AM)', width: 8 },
          { header: 'CONS (AM)', width: 8 },
          { header: 'BAL (AM)', width: 8 },
          { header: 'NURSE (AM)', width: 12 },
          { header: 'STOCK (PM)', width: 8 },
          { header: 'CONS (PM)', width: 8 },
          { header: 'BAL (PM)', width: 8 },
          { header: 'NURSE (PM)', width: 12 },
          { header: ' ', width: 3 } // Spacer
        );
      }
      worksheet.columns = columns;

      // Styling Headers: Row 3, 4, 5
      worksheet.getRow(3).height = 24;
      worksheet.getRow(4).height = 20;
      worksheet.getRow(5).height = 22;

      // Item Name and SPC headers in Row 3 (merged to row 5)
      worksheet.mergeCells('A3:A5');
      worksheet.getCell('A3').value = "ITEMS master LIST";
      worksheet.getCell('A3').font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0F172A' } };
      worksheet.getCell('A3').alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
      worksheet.getCell('A3').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
      worksheet.getCell('A3').border = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'medium', color: { argb: 'FF94A3B8' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
      };

      worksheet.mergeCells('B3:B5');
      worksheet.getCell('B3').value = "SPC";
      worksheet.getCell('B3').font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF475569' } };
      worksheet.getCell('B3').alignment = { vertical: 'middle', horizontal: 'center' };
      worksheet.getCell('B3').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
      worksheet.getCell('B3').border = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'medium', color: { argb: 'FF94A3B8' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
      };

      for (let d = 1; d <= daysInMonth; d++) {
        const startColIdx = 3 + (d - 1) * 9;

        // Merge Day label Row 3: Col C to J
        const dayLabelCellRef = `${colLetter(startColIdx)}3`;
        worksheet.mergeCells(`${colLetter(startColIdx)}3:${colLetter(startColIdx + 7)}3`);
        const dayLabelCell = worksheet.getCell(dayLabelCellRef);
        dayLabelCell.value = `DAY ${d}`;
        dayLabelCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0284C7' } };
        dayLabelCell.alignment = { vertical: 'middle', horizontal: 'center' };
        dayLabelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F9FF' } }; // sky-50

        // Add borders to Day cell
        for (let c = 0; c < 8; c++) {
          worksheet.getCell(3, startColIdx + c).border = {
            top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } }
          };
        }

        // AM Subheader Row 4
        const amSubCellRef = `${colLetter(startColIdx)}4`;
        worksheet.mergeCells(`${colLetter(startColIdx)}4:${colLetter(startColIdx + 3)}4`);
        const amSubCell = worksheet.getCell(amSubCellRef);
        amSubCell.value = "AM SESSION";
        amSubCell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF0369A1' } };
        amSubCell.alignment = { vertical: 'middle', horizontal: 'center' };
        amSubCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0F2FE' } }; // sky-100

        // PM Subheader Row 4
        const pmSubCellRef = `${colLetter(startColIdx + 4)}4`;
        worksheet.mergeCells(`${colLetter(startColIdx + 4)}4:${colLetter(startColIdx + 7)}4`);
        const pmSubCell = worksheet.getCell(pmSubCellRef);
        pmSubCell.value = "PM SESSION";
        pmSubCell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF1E3A8A' } };
        pmSubCell.alignment = { vertical: 'middle', horizontal: 'center' };
        pmSubCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } }; // blue-100

        // Column Titles Row 5
        const labels = ['STOCK', 'CONS', 'BAL', 'NURSE', 'STOCK', 'CONS', 'BAL', 'NURSE'];
        for (let c = 0; c < 8; c++) {
          const cell = worksheet.getCell(5, startColIdx + c);
          cell.value = labels[c];
          cell.font = { name: 'Calibri', size: 8, bold: true, color: { argb: 'FF475569' } };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
          cell.border = {
            bottom: { style: 'medium', color: { argb: 'FF94A3B8' } },
            left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
          };
        }

        // Spacer column style
        const spacerColIdx = startColIdx + 8;
        worksheet.mergeCells(`${colLetter(spacerColIdx)}3:${colLetter(spacerColIdx)}5`);
        const spacerCell = worksheet.getCell(3, spacerColIdx);
        spacerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }; // slate-100
        spacerCell.border = {
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };
      }

      // Add Data Rows
      const monthData = dataMap[my] || {};

      itemsToExport.forEach((itemName, index) => {
        const itemIndex = index + 1;
        const rowIndex = 6 + index;
        const itemCells = monthData[itemName] || {};

        const row = worksheet.addRow([]);
        row.getCell(1).value = itemName;
        row.getCell(1).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0F172A' } };
        row.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
        row.getCell(1).border = {
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFF1F5F9' } }
        };

        row.getCell(2).value = itemIndex;
        row.getCell(2).font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF64748B' } };
        row.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
        row.getCell(2).border = {
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFF1F5F9' } }
        };

        for (let d = 1; d <= daysInMonth; d++) {
          const startColIdx = 3 + (d - 1) * 9;
          const dayData = itemCells[d] || {};
          const amData = dayData.AM || {};
          const pmData = dayData.PM || {};

          // AM Values
          const amStock = amData.stock_in_hands !== undefined && amData.stock_in_hands !== '' ? Number(amData.stock_in_hands) : null;
          const amConsumed = amData.consumed !== undefined && amData.consumed !== '' ? Number(amData.consumed) : null;
          const amNurse = amData.responsible_name || '';

          // PM Values
          const pmStock = pmData.stock_in_hands !== undefined && pmData.stock_in_hands !== '' ? Number(pmData.stock_in_hands) : null;
          const pmConsumed = pmData.consumed !== undefined && pmData.consumed !== '' ? Number(pmData.consumed) : null;
          const pmNurse = pmData.responsible_name || '';

          // AM Stock logic:
          if (d === 1) {
            if (hasPrevSheet) {
              // Get number of days in the previous month dynamically to link to its final day's PM balance column
              const [prevYr, prevMo] = prevMyStr.split('-');
              const prevDays = new Date(parseInt(prevYr, 10), parseInt(prevMo, 10), 0).getDate();
              const prevPmBalColIdx = 3 + (prevDays - 1) * 9 + 6;
              const prevPmBalColLetter = colLetter(prevPmBalColIdx);

              row.getCell(startColIdx).value = {
                formula: `'${prevSheetName}'!${prevPmBalColLetter}${rowIndex}`,
                result: amStock !== null ? amStock : 0
              };
            } else {
              row.getCell(startColIdx).value = amStock !== null ? amStock : null;
            }
          } else {
            // Intra-sheet linkage to previous day's PM Balance (colLetter(startColIdx - 3))
            const prevPmBalRef = `${colLetter(startColIdx - 3)}${rowIndex}`;
            row.getCell(startColIdx).value = {
              formula: prevPmBalRef,
              result: amStock !== null ? amStock : 0
            };
          }

          // AM Consumed
          row.getCell(startColIdx + 1).value = amConsumed !== null ? amConsumed : null;

          // AM Balance Formula (Stock - Consumed)
          const stockAmRef = `${colLetter(startColIdx)}${rowIndex}`;
          const consAmRef = `${colLetter(startColIdx + 1)}${rowIndex}`;
          row.getCell(startColIdx + 2).value = { formula: `${stockAmRef}-${consAmRef}` };

          row.getCell(startColIdx + 3).value = amNurse;

          // PM Stock: carried from same day's AM Balance
          const amBalRef = `${colLetter(startColIdx + 2)}${rowIndex}`;
          row.getCell(startColIdx + 4).value = {
            formula: amBalRef,
            result: pmStock !== null ? pmStock : 0
          };

          // PM Consumed
          row.getCell(startColIdx + 5).value = pmConsumed !== null ? pmConsumed : null;

          // PM Balance Formula (Stock - Consumed)
          const stockPmRef = `${colLetter(startColIdx + 4)}${rowIndex}`;
          const consPmRef = `${colLetter(startColIdx + 5)}${rowIndex}`;
          row.getCell(startColIdx + 6).value = { formula: `${stockPmRef}-${consPmRef}` };

          row.getCell(startColIdx + 7).value = pmNurse;

          const borderStyle = {
            left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'FFF1F5F9' } }
          };

          for (let c = 0; c < 8; c++) {
            const cell = row.getCell(startColIdx + c);
            cell.font = { name: 'Calibri', size: 9 };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.border = borderStyle;

            if (c === 2 || c === 6) {
              cell.font = { name: 'Calibri', size: 9, bold: true };
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
            }
          }

          const spacerColIdx = startColIdx + 8;
          row.getCell(spacerColIdx).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
          row.getCell(spacerColIdx).border = {
            left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } }
          };
        }

        row.height = 20;
      });

      // Create Weekly Summary sheet
      const weeklyWorksheet = workbook.addWorksheet(weeklySheetName.substring(0, 31));
      weeklyWorksheet.views = [{ showGridLines: true }];

      // Header Title Blocks
      weeklyWorksheet.mergeCells('A1:B1');
      weeklyWorksheet.getCell('A1').value = "WEEKLY STOCK LEDGER";
      weeklyWorksheet.getCell('A1').font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFF' } };
      weeklyWorksheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } }; // Teal-700
      weeklyWorksheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

      weeklyWorksheet.mergeCells('C1:J1');
      weeklyWorksheet.getCell('C1').value = `${baseSheetName} (WEEKLY SUMMARY)`;
      weeklyWorksheet.getCell('C1').font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFF' } };
      weeklyWorksheet.getCell('C1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };
      weeklyWorksheet.getCell('C1').alignment = { vertical: 'middle', horizontal: 'right' };

      weeklyWorksheet.getRow(1).height = 40;

      weeklyWorksheet.mergeCells('A2:J2');
      weeklyWorksheet.getCell('A2').value = "WEEKLY & MONTHLY STOCK STATUS REPORT - RECONCILED VIA FORMULA SUMMARY";
      weeklyWorksheet.getCell('A2').font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF475569' } }; // slate-600
      weeklyWorksheet.getCell('A2').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }; // slate-100
      weeklyWorksheet.getCell('A2').alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
      weeklyWorksheet.getRow(2).height = 20;

      // Define columns for weeklyWorksheet
      const weeklyColumns = [
        { header: 'ITEMS master', key: 'item_name', width: 28 },
        { header: 'SPC', key: 'spc', width: 6 },
        { header: 'W1 CONS', width: 12 },
        { header: 'W2 CONS', width: 12 },
        { header: 'W3 CONS', width: 12 },
        { header: 'W4 CONS', width: 12 },
        { header: 'W5 CONS', width: 12 },
        { header: 'START STOCK', width: 14 },
        { header: 'TOTAL CONS', width: 14 },
        { header: 'END BALANCE', width: 14 }
      ];
      weeklyWorksheet.columns = weeklyColumns;

      weeklyWorksheet.getRow(3).height = 24;
      weeklyWorksheet.getRow(4).height = 20;
      weeklyWorksheet.getRow(5).height = 22;

      // Item Name and SPC headers in Row 3 (merged to row 4)
      weeklyWorksheet.mergeCells('A3:A4');
      weeklyWorksheet.getCell('A3').value = "ITEMS master LIST";
      weeklyWorksheet.getCell('A3').font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0F172A' } };
      weeklyWorksheet.getCell('A3').alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
      weeklyWorksheet.getCell('A3').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
      weeklyWorksheet.getCell('A3').border = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'medium', color: { argb: 'FF94A3B8' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
      };

      weeklyWorksheet.mergeCells('B3:B4');
      weeklyWorksheet.getCell('B3').value = "SPC";
      weeklyWorksheet.getCell('B3').font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF475569' } };
      weeklyWorksheet.getCell('B3').alignment = { vertical: 'middle', horizontal: 'center' };
      weeklyWorksheet.getCell('B3').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
      weeklyWorksheet.getCell('B3').border = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'medium', color: { argb: 'FF94A3B8' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
      };

      // Set headers for Weeks 1-5
      for (let w = 1; w <= 5; w++) {
        const colIdx = 3 + (w - 1);
        const colL = colLetter(colIdx);
        weeklyWorksheet.mergeCells(`${colL}3:${colL}4`);
        const cell = weeklyWorksheet.getCell(`${colL}3`);
        cell.value = `W${w} CONS`;
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0F766E' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDFA' } }; // teal-50
      }

      // START STOCK
      weeklyWorksheet.mergeCells('H3:H4');
      weeklyWorksheet.getCell('H3').value = "START STOCK";
      weeklyWorksheet.getCell('H3').font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF3730A3' } };
      weeklyWorksheet.getCell('H3').alignment = { vertical: 'middle', horizontal: 'center' };
      weeklyWorksheet.getCell('H3').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF2FF' } };

      // TOTAL CONS
      weeklyWorksheet.mergeCells('I3:I4');
      weeklyWorksheet.getCell('I3').value = "TOTAL CONS";
      weeklyWorksheet.getCell('I3').font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF3730A3' } };
      weeklyWorksheet.getCell('I3').alignment = { vertical: 'middle', horizontal: 'center' };
      weeklyWorksheet.getCell('I3').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF2FF' } };

      // END BALANCE
      weeklyWorksheet.mergeCells('J3:J4');
      weeklyWorksheet.getCell('J3').value = "END BALANCE";
      weeklyWorksheet.getCell('J3').font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF3730A3' } };
      weeklyWorksheet.getCell('J3').alignment = { vertical: 'middle', horizontal: 'center' };
      weeklyWorksheet.getCell('J3').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF2FF' } };

      // Row 5 subheaders
      for (let w = 1; w <= 5; w++) {
        const colIdx = 3 + (w - 1);
        const colL = colLetter(colIdx);
        const cell = weeklyWorksheet.getCell(`${colL}5`);
        cell.value = w === 5 ? `Days 29-${daysInMonth}` : `Days ${(w - 1) * 7 + 1}-${w * 7}`;
        cell.font = { name: 'Calibri', size: 8, bold: true, color: { argb: 'FF0D9488' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCCFBF1' } }; // teal-100
        cell.border = {
          bottom: { style: 'medium', color: { argb: 'FF94A3B8' } },
          left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
        };
      }

      const monthlySubHeaders = ['MONTH START', 'SUM(W1-W5)', 'MONTH END'];
      for (let c = 0; c < 3; c++) {
        const cell = weeklyWorksheet.getCell(5, 8 + c);
        cell.value = monthlySubHeaders[c];
        cell.font = { name: 'Calibri', size: 8, bold: true, color: { argb: 'FF4F46E5' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E7FF' } }; // indigo-105
        cell.border = {
          bottom: { style: 'medium', color: { argb: 'FF94A3B8' } },
          left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
        };
      }

      // Populate Weekly Data Rows
      itemsToExport.forEach((itemName, index) => {
        const itemIndex = index + 1;
        const rowIndex = 6 + index;

        const row = weeklyWorksheet.addRow([]);
        row.getCell(1).value = itemName;
        row.getCell(1).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0F172A' } };
        row.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
        row.getCell(1).border = {
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFF1F5F9' } }
        };

        row.getCell(2).value = itemIndex;
        row.getCell(2).font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF64748B' } };
        row.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
        row.getCell(2).border = {
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFF1F5F9' } }
        };

        const borderStyle = {
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFF1F5F9' } }
        };

        for (let w = 1; w <= 5; w++) {
          const colIdx = 3 + (w - 1);
          const startDay = (w - 1) * 7 + 1;
          const endDay = Math.min(w * 7, daysInMonth);

          const cell = row.getCell(colIdx);
          cell.font = { name: 'Calibri', size: 9 };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.border = borderStyle;

          if (startDay > daysInMonth) {
            cell.value = 0;
          } else {
            // Consumed SUM formula: sum of daily AM + PM consumed for days startDay to endDay
            const sumRefs = [];
            for (let d = startDay; d <= endDay; d++) {
              const dailyAmConsColRef = `${colLetter(3 + (d - 1) * 9 + 1)}${rowIndex}`;
              const dailyPmConsColRef = `${colLetter(3 + (d - 1) * 9 + 5)}${rowIndex}`;
              sumRefs.push(`'${dailySheetName.substring(0, 31)}'!${dailyAmConsColRef}`);
              sumRefs.push(`'${dailySheetName.substring(0, 31)}'!${dailyPmConsColRef}`);
            }
            cell.value = {
              formula: `SUM(${sumRefs.join(',')})`,
              result: 0
            };
          }
        }

        // START STOCK: links to Daily sheet Day 1 AM Stock
        const startStockRef = `${colLetter(3)}${rowIndex}`;
        row.getCell(8).value = {
          formula: `'${dailySheetName.substring(0, 31)}'!${startStockRef}`,
          result: 0
        };

        // TOTAL CONS: `=SUM(C[row]:G[row])`
        row.getCell(9).value = {
          formula: `SUM(C${rowIndex}:G${rowIndex})`,
          result: 0
        };

        // END BALANCE: links to Daily sheet Last Day PM Balance
        const lastDayPmBalColIdx = 3 + (daysInMonth - 1) * 9 + 6;
        const endBalRef = `${colLetter(lastDayPmBalColIdx)}${rowIndex}`;
        row.getCell(10).value = {
          formula: `'${dailySheetName.substring(0, 31)}'!${endBalRef}`,
          result: 0
        };

        // Style Monthly Total columns (H, I, J)
        for (let c = 0; c < 3; c++) {
          const cell = row.getCell(8 + c);
          cell.font = { name: 'Calibri', size: 9, bold: true };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.border = borderStyle;
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF2FF' } }; // indigo-50
        }

        row.height = 20;
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="Clinical_Stock_Ledger.xlsx"');

    await workbook.xlsx.write(res);
  } catch (error) {
    console.error('Error in exportInventoryExcel:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// --- New Stock Management Relational Controllers ---

exports.getmasterInventory = async (req, res) => {
  try {

    // "quantity" is always stock-in-hand at Central Store (sb.quantity) --
    // never coalesced with department_stock. department/storage are the
    // batch's own descriptive tracking fields (sb.department_id, sb.storage),
    // independent of distribution. distributed_quantity is a read-only echo
    // of what's actually been transferred out via approved requisitions, so
    // the two concepts are never conflated in a single ambiguous column.
    const { rows } = await db.query(`
      SELECT
        mi.id,
        mi.name,
        mi.sku as sku,
        COALESCE(mi.sku, '') || COALESCE(sb.lot_number, '01') as full_sku,
        mi.unit_of_measure,
        mi.category,
        sb.id as batch_id,
        sb.batch_number,
        sb.lot_number,
        sb.expiry_date,
        sb.created_at as purchase_time,
        sb.purchase_price as price,
        COALESCE(sb.quantity, 0) as quantity,
        sb.storage as storage,
        d.name as department,
        d.id as department_id,
        v.name as vendor,
        sb.vendor_id as vendor_id,
        COALESCE((SELECT SUM(ds.quantity) FROM department_stock ds WHERE ds.item_id = mi.id AND ds.batch_id = sb.id), 0) as distributed_quantity
      FROM master_inventory mi
      LEFT JOIN stock_batches sb ON mi.id = sb.item_id
      LEFT JOIN departments d ON sb.department_id = d.id
      LEFT JOIN vendors v ON sb.vendor_id = v.id
      ORDER BY mi.id DESC
    `);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error in getmasterInventory:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const generateSkuPrefix = exports.generateSkuPrefix = (name) => {
  let clean = (name || 'ITEM').toUpperCase().replace(/[^A-Z0-9]/g, '');
  // Strip leading "LC"
  clean = clean.replace(/^LC/i, '');
  if (!clean) clean = 'ITEM';
  const prefix = clean.substring(0, 4).padEnd(4, 'X');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}${rand}`;
};


exports.createmasterInventory = async (req, res) => {
  try {
    const items = Array.isArray(req.body) ? req.body : (req.body.items || [req.body]);

    for (const item of items) {
      const { name, sku, unit_of_measure, category, batch_number, lot_number, expiry_date, purchase_time, department_id, storage, quantity, price, vendor_id } = item;

      // 1. Check if name already exists in master_inventory
      const { rows: existingItems } = await db.query(
        "SELECT id, sku FROM master_inventory WHERE name = $1",
        [name]
      );

      let itemId;
      let skuPrefix;

      if (existingItems.length > 0) {
        itemId = existingItems[0].id;
        skuPrefix = sku || existingItems[0].sku;
        if (sku) {
          await db.query("UPDATE master_inventory SET sku = $1 WHERE id = $2", [sku, itemId]);
        }
      } else {
        skuPrefix = sku || generateSkuPrefix(name);
        // Insert into master_inventory
        const { rows: itemRows } = await db.query(
          "INSERT INTO master_inventory (name, sku, unit_of_measure, category) VALUES ($1, $2, $3, $4) RETURNING id",
          [name, skuPrefix, unit_of_measure, category]
        );
        itemId = itemRows[0].id;
      }

      // 2. Count existing batches to assign lot_number if not provided
      let lotNumber = lot_number;
      if (!lotNumber) {
        const { rows: batchCount } = await db.query(
          "SELECT COUNT(*) as cnt FROM stock_batches WHERE item_id = $1",
          [itemId]
        );
        const nextLotInt = (Number(batchCount[0]?.cnt) || 0) + 1;
        lotNumber = String(nextLotInt).padStart(2, '0'); // minimalist e.g. "01", "02"
      }

      // 3. Insert into stock_batches
      let formattedPurchaseTime = purchase_time || null;
      if (formattedPurchaseTime && /^\d{4}-\d{2}-\d{2}$/.test(formattedPurchaseTime)) {
        formattedPurchaseTime = `${formattedPurchaseTime}T00:00:00.000Z`;
      }

      // department_id/storage are descriptive tracking fields on the batch
      // only -- they must NOT create department_stock (distributed stock)
      // rows. Distribution only ever happens through an approved requisition
      // (see approveRequisition), which is the sole writer of department_stock.
      const { rows: batchRows } = await db.query(
        "INSERT INTO stock_batches (item_id, vendor_id, batch_number, lot_number, expiry_date, purchase_price, quantity, department_id, storage, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, COALESCE($10, CURRENT_TIMESTAMP)) RETURNING id",
        [itemId, vendor_id || null, batch_number || null, lotNumber, expiry_date || null, price || 0, quantity || 0, department_id || null, storage || null, formattedPurchaseTime]
      );
    }

    res.json({ success: true, message: 'Items added successfully' });
  } catch (error) {
    console.error('Error in createmasterInventory:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.updatemasterInventory = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, sku, unit_of_measure, category,
      batch_id, batch_number, lot_number, expiry_date, purchase_time, price,
      department_id, storage, quantity, vendor_id
    } = req.body;

    const skuPrefix = sku || generateSkuPrefix(name);

    await db.query(
      "UPDATE master_inventory SET name = $1, sku = $2, unit_of_measure = $3, category = $4 WHERE id = $5",
      [name, skuPrefix, unit_of_measure, category, id]
    );

    // Helper: format purchase_time to ISO string
    let formattedPurchaseTime = purchase_time || null;
    if (formattedPurchaseTime && /^\d{4}-\d{2}-\d{2}$/.test(formattedPurchaseTime)) {
      formattedPurchaseTime = `${formattedPurchaseTime}T00:00:00.000Z`;
    }

    // department_id/storage are descriptive tracking fields on the batch only
    // (which department nominally owns it, and whether it's physically in
    // Medical or Non-Medical storage) -- they must NOT create or modify
    // department_stock (distributed stock). Distribution only ever happens
    // through an approved requisition (see approveRequisition), which is the
    // sole writer of department_stock.
    if (batch_id) {
      // --- Existing batch: update it ---
      let lotToSave = lot_number;
      if (!lotToSave) {
        const { rows: batchCount } = await db.query(
          "SELECT COUNT(*) as cnt FROM stock_batches WHERE item_id = $1 AND id != $2",
          [id, batch_id]
        );
        const nextLotInt = (Number(batchCount[0]?.cnt) || 0) + 1;
        lotToSave = String(nextLotInt).padStart(2, '0');
      }

      await db.query(
        "UPDATE stock_batches SET vendor_id = $1, batch_number = $2, lot_number = $3, expiry_date = $4, purchase_price = $5, quantity = $6, department_id = $7, storage = $8, created_at = COALESCE($9, created_at) WHERE id = $10",
        [vendor_id || null, batch_number || null, lotToSave, expiry_date || null, price || 0, quantity || 0, department_id || null, storage || null, formattedPurchaseTime, batch_id]
      );

    } else if (expiry_date || purchase_time || batch_number || department_id) {
      // --- No existing batch, but user provided batch fields: create a new batch ---
      const { rows: batchCount } = await db.query(
        "SELECT COUNT(*) as cnt FROM stock_batches WHERE item_id = $1",
        [id]
      );
      const nextLotInt = (Number(batchCount[0]?.cnt) || 0) + 1;
      const lotToSave = lot_number || String(nextLotInt).padStart(2, '0');

      await db.query(
        "INSERT INTO stock_batches (item_id, vendor_id, batch_number, lot_number, expiry_date, purchase_price, quantity, department_id, storage, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, COALESCE($10, CURRENT_TIMESTAMP))",
        [id, vendor_id || null, batch_number || null, lotToSave, expiry_date || null, price || 0, quantity || 0, department_id || null, storage || null, formattedPurchaseTime]
      );
    }

    res.json({ success: true, message: 'Item updated successfully' });
  } catch (error) {
    console.error('Error in updatemasterInventory:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.deletemasterInventory = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("DELETE FROM master_inventory WHERE id = $1", [id]);
    res.json({ success: true, message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Error in deletemasterInventory:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.bulkDeleteMasterInventory = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'No IDs provided for bulk delete.' });
    }
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
    await db.query(`DELETE FROM master_inventory WHERE id IN (${placeholders})`, ids);
    res.json({ success: true, message: `${ids.length} item(s) deleted successfully` });
  } catch (error) {
    console.error('Error in bulkDeleteMasterInventory:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};


exports.getBatches = async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT sb.*, mi.name as item_name, v.name as vendor_name
      FROM stock_batches sb
      JOIN master_inventory mi ON sb.item_id = mi.id
      LEFT JOIN vendors v ON sb.vendor_id = v.id
      ORDER BY sb.expiry_date ASC
    `);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error in getBatches:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.createBatch = async (req, res) => {
  try {
    const { itemId, vendorId, batchNumber, expiryDate, purchasePrice, quantity } = req.body;
    await db.query(`
      INSERT INTO stock_batches (item_id, vendor_id, batch_number, expiry_date, purchase_price, quantity)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [itemId, vendorId || null, batchNumber, expiryDate, purchasePrice || 0.0, quantity]);

    res.json({ success: true, message: 'Stock batch received successfully' });
  } catch (error) {
    console.error('Error in createBatch:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.getRequisitions = async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT r.*, d.name as department_name, COUNT(ri.id) as items_count,
        (SELECT json_group_array(json_object(
            'item_id', ri2.item_id,
            'item_name', mi.name,
            'quantity', ri2.requested_quantity,
            'approved_quantity', ri2.approved_quantity))
         FROM requisition_items ri2
         JOIN master_inventory mi ON ri2.item_id = mi.id
         WHERE ri2.requisition_id = r.id) AS items
      FROM requisitions r
      JOIN departments d ON r.department_id = d.id
      LEFT JOIN requisition_items ri ON r.id = ri.requisition_id
      GROUP BY r.id
      ORDER BY r.created_at DESC
    `);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error in getRequisitions:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.createRequisition = async (req, res) => {
  try {
    const { department_id, urgency, notes, items } = req.body;
    if (!department_id || !items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Department and at least one item are required.' });
    }

    const { rows: newReq } = await db.query(
      "INSERT INTO requisitions (department_id, urgency, status, notes) VALUES ($1, $2, 'Pending', $3) RETURNING id",
      [department_id, urgency || 'Normal', notes || null]
    );
    const reqId = newReq[0].id;

    for (const item of items) {
      await db.query(
        "INSERT INTO requisition_items (requisition_id, item_id, requested_quantity) VALUES ($1, $2, $3)",
        [reqId, item.item_id, item.quantity]
      );
    }

    res.json({ success: true, message: 'Requisition submitted successfully', id: reqId });
  } catch (error) {
    console.error('Error in createRequisition:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.rejectRequisition = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    await db.query(
      "UPDATE requisitions SET status = 'Rejected', rejection_reason = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
      [reason || null, id]
    );
    res.json({ success: true, message: 'Requisition rejected.' });
  } catch (error) {
    console.error('Error in rejectRequisition:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};


exports.getRequisitionItems = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await db.query(`
      SELECT ri.*, mi.name as item_name, mi.sku, mi.category, mi.unit_of_measure, 
             COALESCE(SUM(sb.quantity), 0) as central_stock,
             COALESCE(
               (SELECT last_unit_price FROM procurement_catalog WHERE master_item_id = ri.item_id AND is_active = 1 LIMIT 1),
               (SELECT purchase_price FROM stock_batches WHERE item_id = ri.item_id AND purchase_price IS NOT NULL AND purchase_price > 0 ORDER BY id DESC LIMIT 1),
               0
             ) as purchase_price
      FROM requisition_items ri
      JOIN master_inventory mi ON ri.item_id = mi.id
      LEFT JOIN stock_batches sb ON mi.id = sb.item_id
      WHERE ri.requisition_id = $1
      GROUP BY ri.id
    `, [id]);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error in getRequisitionItems:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ─── Distributed Stock: read-only echo of department_stock ────────────────────
// department_stock is written to exclusively by approveRequisition's batch
// allocation -- this endpoint just reads it back, one row per
// (department, item, batch), so a single Central Store batch split across
// multiple departments is represented correctly (unlike master_inventory's
// one-row-per-batch shape, which can't show that). Excludes the internal
// "Central Store" pseudo-department used by supplier-receiving/GRN to track
// stock that hasn't actually been distributed anywhere.
// Helper to map role to department
const getDepartmentForRole = (role) => {
  const r = String(role || '').toLowerCase();
  if (r === 'admin') return null;
  if (r.includes('nurse')) return { id: 121, name: 'NURSING' };
  if (r.includes('lab')) return { id: 123, name: 'LABORATORY' };
  if (r.includes('stock') || r.includes('procurement') || r === 'deputy_coo') return { id: 130, name: 'GENERAL STORE' };
  if (r.includes('physio')) return { id: 120, name: 'PHYSIO' };
  if (r.includes('dental') || r.includes('dentist')) return { id: 129, name: 'DENTAL' };
  if (r.includes('operations') || r.includes('ops') || r === 'coo') return { id: 122, name: 'OPERATIONS' };
  if (r.includes('imaging') || r.includes('radio') || r.includes('sono')) return { id: 124, name: 'IMAGING' };
  return null;
};

exports.getDistributedStock = async (req, res) => {
  try {
    const { include_central } = req.query;
    let sql = `
      SELECT * FROM (
        SELECT
          ds.id as dept_stock_id,
          ds.department_id,
          d.name as department,
          mi.id as item_id,
          mi.name,
          mi.sku,
          mi.unit_of_measure,
          mi.category,
          ds.batch_id,
          sb.batch_number,
          sb.lot_number,
          sb.expiry_date,
          sb.created_at as purchase_time,
          sb.purchase_price as price,
          ds.quantity,
          v.name as vendor
        FROM department_stock ds
        JOIN master_inventory mi ON ds.item_id = mi.id
        LEFT JOIN stock_batches sb ON ds.batch_id = sb.id
        LEFT JOIN departments d ON ds.department_id = d.id
        LEFT JOIN vendors v ON sb.vendor_id = v.id
        -- Include zero-stock items (>= 0) so the Stock Manager can see what has
        -- run out and needs re-ordering; only negatives (anomalies) are hidden.
        WHERE ds.quantity >= 0
          AND (d.name IS NULL OR (d.name NOT LIKE '%Central%' AND d.name NOT LIKE '%Store%'))
    `;

    if (include_central === 'true') {
      sql += `
      UNION ALL
      SELECT
        sb.id as dept_stock_id,
        130 as department_id,
        'GENERAL STORE' as department,
        mi.id as item_id,
        mi.name,
        mi.sku,
        mi.unit_of_measure,
        mi.category,
        sb.id as batch_id,
        sb.batch_number,
        sb.lot_number,
        sb.expiry_date,
        sb.created_at as purchase_time,
        sb.purchase_price as price,
        sb.quantity,
        v.name as vendor
      FROM stock_batches sb
      JOIN master_inventory mi ON sb.item_id = mi.id
      LEFT JOIN vendors v ON sb.vendor_id = v.id
      WHERE sb.quantity > 0
      `;
    }

    sql += ') AS stock_combined ORDER BY department ASC, name ASC';

    const { rows } = await db.query(sql);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error in getDistributedStock:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── Consumables Log ────────────────────────────────────────────────────────────
// Reads shared inventory (master_inventory, departments, department_stock) so it
// stays in sync with the Stock Manager portal; logging consumption deducts from
// department_stock (FEFO — earliest expiry first).
exports.getConsumablesLog = async (req, res) => {
  try {
    const { department_id, from, to } = req.query;
    
    // Role-based department restriction for non-admins
    const deptLimit = getDepartmentForRole(req.user.role);
    const targetDeptId = deptLimit ? deptLimit.id : department_id;

    const params = [];
    let sql = `
      SELECT cl.id, cl.department_id, cl.department_name, cl.item_id, cl.item_name,
             cl.batch_id, cl.batch_number, cl.quantity, cl.unit, cl.notes,
             cl.logged_by, cl.logged_by_name, cl.ward, cl.session, cl.consumed_at
        FROM consumables_log cl
       WHERE 1=1`;
    if (targetDeptId) { params.push(targetDeptId); sql += ` AND cl.department_id = $${params.length}`; }
    if (from) { params.push(from); sql += ` AND date(cl.consumed_at) >= date($${params.length})`; }
    if (to) { params.push(to); sql += ` AND date(cl.consumed_at) <= date($${params.length})`; }
    sql += ' ORDER BY cl.consumed_at DESC, cl.id DESC LIMIT 500';
    const { rows } = await db.query(sql, params);
    const logEntries = rows.map(r => ({ ...r, source: 'log' }));

    // ── For NURSING, also surface the Daily Stock Checkup consumption ──────────
    // (recorded per item/day/session split by ward: consumed_obs1 = Station 1,
    // consumed_minor = Minor Surgery). This is the department's real historical
    // consumption, which lives in nursing_monthly_stock rather than consumables_log.
    let dailyEntries = [];
    if (String(targetDeptId) === '121') {
      const dParams = [];
      let dSql = `SELECT id, month_year, day, session, item_name, consumed_obs1, consumed_minor, user_stn1, user_minor, responsible_name
                    FROM nursing_monthly_stock WHERE consumed > 0`;
      if (from) { dParams.push(from); dSql += ` AND date(month_year || '-' || printf('%02d', day)) >= date($${dParams.length})`; }
      if (to)   { dParams.push(to);   dSql += ` AND date(month_year || '-' || printf('%02d', day)) <= date($${dParams.length})`; }
      dSql += ` ORDER BY month_year DESC, day DESC LIMIT 1000`;
      const { rows: dRows } = await db.query(dSql, dParams); // db.query decrypts consumed_obs1 / user_*

      // The responsible-nurse field was usually left blank on daily entries, so
      // fall back to WHO RECORDED the consumption — the change-log updated_by on
      // the edit that increased consumption for that item/day/session/ward.
      const recS1 = {}, recMin = {};
      try {
        const { rows: cl } = await db.query(`
          SELECT item_name, month_year, day, session, updated_by,
                 old_consumed_obs1, new_consumed_obs1, old_consumed_minor, new_consumed_minor
            FROM nursing_stock_change_logs
           WHERE (new_consumed_obs1 > old_consumed_obs1 OR new_consumed_minor > old_consumed_minor)
           ORDER BY updated_at DESC LIMIT 8000`); // updated_by is decrypted by db.query
        for (const c of cl) {
          if (!c.updated_by) continue;
          const k = `${c.item_name}|${c.month_year}|${c.day}|${c.session}`;
          if (Number(c.new_consumed_obs1) > Number(c.old_consumed_obs1) && !recS1[k]) recS1[k] = c.updated_by;
          if (Number(c.new_consumed_minor) > Number(c.old_consumed_minor) && !recMin[k]) recMin[k] = c.updated_by;
        }
      } catch (e) { /* non-fatal — recorder attribution is best-effort */ }

      for (const r of dRows) {
        const obs1 = parseInt(r.consumed_obs1, 10) || 0;
        const minor = parseInt(r.consumed_minor, 10) || 0;
        const hour = String(r.session || '').toUpperCase().includes('PM') ? '15' : '08';
        const at = `${r.month_year}-${String(r.day).padStart(2, '0')}T${hour}:00:00`;
        const key = `${r.item_name}|${r.month_year}|${r.day}|${r.session}`;
        const nameStn1 = (r.user_stn1 || '').trim() || (r.responsible_name || '').trim() || recS1[key] || null;
        const nameMinor = (r.user_minor || '').trim() || (r.responsible_name || '').trim() || recMin[key] || null;
        if (obs1 > 0) dailyEntries.push({ id: `d-${r.id}-s1`, department_id: 121, department_name: 'NURSING', item_id: null, item_name: r.item_name, batch_number: null, quantity: obs1, unit: null, notes: null, logged_by_name: nameStn1, ward: 'Station 1', session: r.session, consumed_at: at, source: 'daily' });
        if (minor > 0) dailyEntries.push({ id: `d-${r.id}-ms`, department_id: 121, department_name: 'NURSING', item_id: null, item_name: r.item_name, batch_number: null, quantity: minor, unit: null, notes: null, logged_by_name: nameMinor, ward: 'Minor Surgery', session: r.session, consumed_at: at, source: 'daily' });
      }

      // NOTE: nursing_stock_change_logs (stock-edit audit trail) is intentionally
      // NOT surfaced here — those rows have no real consumed quantity (they log
      // every grid edit) and are attributed to whoever saved the grid, which
      // produced misleading "−0 / <saver>" rows. Actual daily-checkup consumption
      // is already captured above from nursing_monthly_stock (the 'daily' source),
      // with correct per-ward quantities and the responsible nurse.
    }

    // For Nursing, every Consumables Log entry is written through to the daily
    // checkup, so the 'daily' source already accounts for it — using only the
    // daily entries there avoids double-counting the same consumption. Other
    // departments (no daily checkup) rely on the consumables_log entries.
    const isNursingView = String(targetDeptId) === '121';
    const merged = [...(isNursingView ? [] : logEntries), ...dailyEntries]
      .sort((a, b) => new Date(b.consumed_at) - new Date(a.consumed_at))
      .slice(0, 500);
    res.json({ success: true, data: merged });
  } catch (error) {
    console.error('Error in getConsumablesLog:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.getConsumablesSummary = async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const { department_id } = req.query;

    const deptLimit = getDepartmentForRole(req.user.role);
    const targetDeptId = deptLimit ? deptLimit.id : (department_id ? parseInt(department_id, 10) : null);

    let todaySql = `SELECT COUNT(*) AS entries, COALESCE(SUM(quantity),0) AS units FROM consumables_log WHERE date(consumed_at) = date($1)`;
    let todayParams = [today];
    if (targetDeptId) {
      todayParams.push(targetDeptId);
      todaySql += ` AND department_id = $2`;
    }

    let topSql = `SELECT item_name, COALESCE(SUM(quantity),0) AS units FROM consumables_log WHERE consumed_at >= datetime('now','-30 days')`;
    let topParams = [];
    if (targetDeptId) {
      topParams.push(targetDeptId);
      topSql += ` AND department_id = $1`;
    }
    topSql += ` GROUP BY item_name ORDER BY units DESC LIMIT 5`;

    let byDeptSql = `SELECT COALESCE(department_name,'Unknown') AS department, COALESCE(SUM(quantity),0) AS units FROM consumables_log WHERE consumed_at >= datetime('now','-30 days')`;
    let byDeptParams = [];
    if (targetDeptId) {
      byDeptParams.push(targetDeptId);
      byDeptSql += ` AND department_id = $1`;
    }
    byDeptSql += ` GROUP BY COALESCE(department_name,'Unknown') ORDER BY units DESC LIMIT 8`;

    const { rows: todayRows } = await db.query(todaySql, todayParams);
    const { rows: topItems } = await db.query(topSql, topParams);
    const { rows: byDept } = await db.query(byDeptSql, byDeptParams);

    res.json({
      success: true,
      data: {
        today: { entries: Number(todayRows[0]?.entries || 0), units: Number(todayRows[0]?.units || 0) },
        top_items: topItems.map(r => ({ item_name: r.item_name, units: Number(r.units) })),
        by_department: byDept.map(r => ({ department: r.department, units: Number(r.units) })),
      },
    });
  } catch (error) {
    console.error('Error in getConsumablesSummary:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Session boundaries for Nursing: AM = 07:00–14:59, PM = 15:00–late.
const sessionFromServerTime = () => (new Date().getHours() < 15 ? 'AM' : 'PM');

// Nursing wards → the nursing_monthly_stock consumption/user columns they map to.
const NURSING_WARDS = {
  'STATION 1': { consumedCol: 'consumed_obs1', userCol: 'user_stn1' },
  'STN1':      { consumedCol: 'consumed_obs1', userCol: 'user_stn1' },
  'MINOR SURGERY': { consumedCol: 'consumed_minor', userCol: 'user_minor' },
  'MINOR':         { consumedCol: 'consumed_minor', userCol: 'user_minor' },
};

exports.logConsumable = async (req, res) => {
  try {
    const { department_id, item_id, quantity, notes, ward, session } = req.body;
    const qty = parseInt(quantity, 10);
    if (!department_id || !item_id || !qty || qty <= 0) {
      return res.status(400).json({ success: false, message: 'Department, item and a positive quantity are required.' });
    }

    // Role-based department restriction check for non-admins
    const deptLimit = getDepartmentForRole(req.user.role);
    if (deptLimit && Number(deptLimit.id) !== Number(department_id)) {
      return res.status(403).json({ success: false, message: 'You are not authorized to log consumables for this department.' });
    }

    // Resolve names for the log + total available stock across batches
    const { rows: itemRows } = await db.query(
      'SELECT id, name, unit_of_measure FROM master_inventory WHERE id = $1', [item_id]);
    if (itemRows.length === 0) return res.status(404).json({ success: false, message: 'Item not found.' });
    const { rows: deptRows } = await db.query('SELECT id, name FROM departments WHERE id = $1', [department_id]);
    if (deptRows.length === 0) return res.status(404).json({ success: false, message: 'Department not found.' });

    const isCentralStore = Number(department_id) === 130 || (deptRows[0] && (deptRows[0].name.toUpperCase().includes('CENTRAL STORE') || deptRows[0].name.toUpperCase().includes('GENERAL STORE')));
    const isNursing = Number(department_id) === 121 || (deptRows[0] && deptRows[0].name.toUpperCase() === 'NURSING');

    // Nursing consumption must be attributed to a ward (Station 1 / Minor Surgery).
    const wardKey = ward ? String(ward).toUpperCase().trim() : null;
    const wardMap = wardKey ? NURSING_WARDS[wardKey] : null;
    if (isNursing && !wardMap) {
      return res.status(400).json({ success: false, message: 'Select a ward (Station 1 or Minor Surgery) for Nursing consumption.' });
    }
    const logSession = session || sessionFromServerTime();

    let stockRows = [];
    if (isCentralStore) {
      // FEFO: pull from stock_batches directly for central store
      const { rows } = await db.query(`
        SELECT sb.id AS dept_stock_id, sb.id AS batch_id, sb.quantity, sb.batch_number, sb.expiry_date
          FROM stock_batches sb
         WHERE sb.item_id = $1 AND sb.quantity > 0
         ORDER BY (sb.expiry_date IS NULL) ASC, sb.expiry_date ASC, sb.id ASC
      `, [item_id]);
      stockRows = rows;
    } else {
      // FEFO: pull this department's stock rows for the item, earliest expiry first from department_stock
      const { rows } = await db.query(`
        SELECT ds.id AS dept_stock_id, ds.batch_id, ds.quantity, sb.batch_number, sb.expiry_date
          FROM department_stock ds
          LEFT JOIN stock_batches sb ON ds.batch_id = sb.id
         WHERE ds.department_id = $1 AND ds.item_id = $2 AND ds.quantity > 0
         ORDER BY (sb.expiry_date IS NULL) ASC, sb.expiry_date ASC, ds.id ASC
      `, [department_id, item_id]);
      stockRows = rows;
    }

    const available = stockRows.reduce((s, r) => s + Number(r.quantity || 0), 0);
    if (available < qty) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock for ${itemRows[0].name} in ${deptRows[0].name}. Available: ${available}, requested: ${qty}.`,
      });
    }

    // Deduct across batches (FEFO)
    let remaining = qty;
    let primaryBatchId = null;
    let primaryBatchNumber = null;
    for (const row of stockRows) {
      if (remaining <= 0) break;
      const take = Math.min(remaining, Number(row.quantity));
      if (isCentralStore) {
        await db.query('UPDATE stock_batches SET quantity = quantity - $1 WHERE id = $2', [take, row.dept_stock_id]);
      } else {
        await db.query('UPDATE department_stock SET quantity = quantity - $1 WHERE id = $2', [take, row.dept_stock_id]);
      }
      if (primaryBatchId === null) { primaryBatchId = row.batch_id; primaryBatchNumber = row.batch_number; }
      remaining -= take;
    }

    // Record the consumption log entry
    const loggerName = req.user?.full_name || req.user?.username || null;
    const { rows: logRows } = await db.query(`
      INSERT INTO consumables_log
        (department_id, department_name, item_id, item_name, batch_id, batch_number,
         quantity, unit, notes, logged_by, logged_by_name, ward, session)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id, consumed_at
    `, [
      department_id, deptRows[0].name, item_id, itemRows[0].name,
      primaryBatchId, primaryBatchNumber, qty, itemRows[0].unit_of_measure || null,
      notes || null, req.user?.id || null, loggerName,
      isNursing ? (wardKey === 'STN1' ? 'Station 1' : wardKey === 'MINOR' ? 'Minor Surgery' : ward) : null,
      isNursing ? logSession : null,
    ]);

    // ─── Two-way link: reflect Nursing consumption into Daily Stock Checkup ──────
    // Adds qty to the ward's consumed column (consumed_obs1=Station 1 /
    // consumed_minor=Minor Surgery) for today's month/day/session, recomputing
    // consumed + balance. Keeps nursing_monthly_stock in sync with department_stock.
    if (isNursing && wardMap) {
      try {
        const now = new Date();
        const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const day = now.getDate();
        const { consumedCol, userCol } = wardMap;

        // consumed_obs1 / user_stn1 / user_minor are ENCRYPTED at rest, so we
        // must NOT do SQL arithmetic on them. Read the decrypted row (db.query
        // decrypts), compute in JS, then write final values — same pattern as
        // saveInventoryBulk.
        const { rows: existRows } = await db.query(
          'SELECT id, stock_in_hands, consumed_obs1, consumed_minor FROM nursing_monthly_stock WHERE month_year = $1 AND item_name = $2 AND day = $3 AND session = $4',
          [monthYear, itemRows[0].name, day, logSession]
        );

        const prev = existRows[0] || {};
        const prevStock = prev.id ? (parseInt(prev.stock_in_hands, 10) || 0) : available;
        const prevObs1 = parseInt(prev.consumed_obs1, 10) || 0;
        const prevMinor = parseInt(prev.consumed_minor, 10) || 0;
        const newObs1 = prevObs1 + (consumedCol === 'consumed_obs1' ? qty : 0);
        const newMinor = prevMinor + (consumedCol === 'consumed_minor' ? qty : 0);
        const newConsumed = newObs1 + newMinor;
        const newBalance = prevStock - newConsumed;

        if (prev.id) {
          await db.query(
            `UPDATE nursing_monthly_stock
                SET consumed_obs1 = $1, consumed_minor = $2, consumed = $3, balance = $4,
                    ${userCol} = $5, manually_edited = 1, updated_at = CURRENT_TIMESTAMP
              WHERE id = $6`,
            [newObs1, newMinor, newConsumed, newBalance, loggerName, prev.id]
          );
        } else {
          await db.query(
            `INSERT INTO nursing_monthly_stock
               (month_year, item_name, day, session, stock_in_hands, consumed_obs1, consumed_minor,
                consumed, balance, ${userCol}, responsible_name, status, manually_edited)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10, 'Available', 1)`,
            [monthYear, itemRows[0].name, day, logSession, prevStock, newObs1, newMinor, newConsumed, newBalance, loggerName]
          );
        }
      } catch (syncErr) {
        console.error('⚠️ Nursing consumption write-through to daily stock failed (non-fatal):', syncErr.message);
      }
    }

    const { logAction } = require('../middleware/audit');
    await logAction(req, 'CONSUME', 'consumables_log', logRows[0].id, {
      item: itemRows[0].name, department: deptRows[0].name, quantity: qty, ward: ward || null, session: isNursing ? logSession : null,
    });

    res.json({
      success: true,
      message: `Logged consumption of ${qty} ${itemRows[0].unit_of_measure || 'unit(s)'} of ${itemRows[0].name}.`,
      data: { id: logRows[0].id, remaining_stock: available - qty },
    });
  } catch (error) {
    console.error('Error in logConsumable:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.approveRequisition = async (req, res) => {
  try {
    const { id } = req.params;
    const { items: approvedItems } = req.body;

    const { rows: reqData } = await db.query("SELECT department_id, status FROM requisitions WHERE id = $1", [id]);
    if (reqData.length === 0) {
      return res.status(404).json({ success: false, message: 'Requisition not found.' });
    }
    if (reqData[0].status !== 'Pending') {
      return res.status(400).json({ success: false, message: `Requisition is already ${reqData[0].status}.` });
    }
    const deptId = reqData[0].department_id;

    const { rows: deptRows } = await db.query(
      "SELECT id FROM departments WHERE name LIKE '%Central%' OR name LIKE '%Store%' LIMIT 1"
    );
    const centralDeptId = deptRows[0]?.id || 1;

    const { rows: items } = await db.query("SELECT * FROM requisition_items WHERE requisition_id = $1", [id]);
    if (items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cannot approve a requisition with no items.' });
    }

    const resolveApprovedQty = (item) => {
      let approvedQty = item.requested_quantity;
      if (approvedItems && Array.isArray(approvedItems)) {
        const match = approvedItems.find(ai =>
          (ai.id && Number(ai.id) === Number(item.id)) ||
          (ai.item_id && Number(ai.item_id) === Number(item.item_id))
        );
        if (match && match.approved_quantity !== undefined) {
          approvedQty = Math.max(0, Number(match.approved_quantity));
        }
      }
      return approvedQty;
    };

    if (deptId === centralDeptId) {
      // Purchase Request to Procurement: this just records intent to order
      // more stock, so it doesn't depend on current Central Store
      // availability (unlike a local requisition below).
      await db.query("UPDATE requisitions SET status = 'Approved', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [id]);
      for (const item of items) {
        await db.query("UPDATE requisition_items SET approved_quantity = $1 WHERE id = $2", [resolveApprovedQty(item), item.id]);
      }
      return res.json({ success: true, message: 'Requisition approved by Procurement Manager.' });
    }

    // Local requisition (department -> Central Store): pre-compute what's
    // actually fulfillable from real stock BEFORE committing to 'Approved',
    // so a requisition that resolves to zero real transfer across every
    // item (e.g. Central Store is out of stock for everything requested)
    // gets rejected instead of silently marked Approved with nothing moved.
    const plannedQtys = [];
    for (const item of items) {
      let approvedQty = resolveApprovedQty(item);
      const { rows: stockCount } = await db.query(
        "SELECT COALESCE(SUM(quantity), 0) as total_stock FROM stock_batches WHERE item_id = $1",
        [item.item_id]
      );
      const totalCentralStock = Number(stockCount[0]?.total_stock || 0);
      plannedQtys.push(Math.min(approvedQty, totalCentralStock));
    }

    if (plannedQtys.every(q => q <= 0)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot approve: no stock is available at Central Store for any requested item.'
      });
    }

    await db.query("UPDATE requisitions SET status = 'Approved', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [id]);

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      let approvedQty = plannedQtys[i];

      if (approvedQty > 0) {
        // Fulfil from as many batches as needed, earliest-expiry first. A
        // request that exceeds any single batch's quantity must be split
        // across batches -- crediting the department with more than what
        // was actually deducted from Central Store creates phantom stock
        // (the same units counted as both still-in-store and transferred).
        const { rows: batches } = await db.query(
          "SELECT id, quantity FROM stock_batches WHERE item_id = $1 AND quantity > 0 ORDER BY expiry_date ASC",
          [item.item_id]
        );

        let remaining = approvedQty;
        for (const b of batches) {
          if (remaining <= 0) break;
          const deductQty = Math.min(remaining, b.quantity);
          if (deductQty <= 0) continue;

          await db.query("UPDATE stock_batches SET quantity = quantity - $1 WHERE id = $2", [deductQty, b.id]);

          await db.query(`
            INSERT INTO department_stock (department_id, item_id, batch_id, quantity)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT(department_id, item_id, batch_id) DO UPDATE SET
              quantity = department_stock.quantity + $4
          `, [deptId, item.item_id, b.id, deductQty]);

          remaining -= deductQty;
        }

        // approvedQty was already clamped to totalCentralStock above, so
        // remaining should reach 0. If it doesn't (e.g. a batch changed
        // concurrently), only record what was actually transferred.
        approvedQty -= remaining;
      }

      // Mark items as approved in the requisition details (reflects what
      // was actually transferred, not just the originally-approved intent)
      await db.query("UPDATE requisition_items SET approved_quantity = $1 WHERE id = $2", [approvedQty, item.id]);
    }

    res.json({ success: true, message: 'Requisition approved and stock transferred successfully' });
  } catch (error) {
    console.error('Error in approveRequisition:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * Accept an APPROVED requisition into the department's working stock.
 *
 * Approval already moved the goods from Central Store batches into
 * department_stock. This lets the receiving department (e.g. a nurse) confirm
 * receipt and pull those approved quantities into the current Daily Stock
 * Checkup (nursing_monthly_stock), adding to whatever is already counted, and
 * marks the requisition 'Received'.
 */
exports.receiveRequisition = async (req, res) => {
  try {
    const { id } = req.params;
    const { month_year, day, session } = req.body;
    if (!month_year || day === undefined || day === null || !session) {
      return res.status(400).json({ success: false, message: 'month_year, day, and session are required to accept stock into the checkup.' });
    }

    const { rows: reqRows } = await db.query('SELECT status FROM requisitions WHERE id = $1', [id]);
    if (reqRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Requisition not found.' });
    }
    if (reqRows[0].status === 'Received') {
      return res.status(400).json({ success: false, message: 'This requisition has already been received.' });
    }
    if (reqRows[0].status !== 'Approved') {
      return res.status(400).json({ success: false, message: `Only approved requisitions can be received (current status: ${reqRows[0].status}).` });
    }

    // Approved items + their master names. Use approved_quantity (what was
    // actually transferred), falling back to requested_quantity.
    const { rows: items } = await db.query(
      `SELECT COALESCE(ri.approved_quantity, ri.requested_quantity) AS qty, mi.name AS item_name
         FROM requisition_items ri
         JOIN master_inventory mi ON ri.item_id = mi.id
        WHERE ri.requisition_id = $1`,
      [id]
    );

    const statements = [];
    let added = 0;
    for (const it of items) {
      const qty = Number(it.qty) || 0;
      if (qty <= 0) continue;
      // Add the received quantity to the current period's stock-in-hand,
      // recomputing balance against whatever has already been consumed.
      statements.push({
        sql: `INSERT INTO nursing_monthly_stock (
                month_year, item_name, day, session, stock_in_hands, consumed, balance, responsible_name, updated_at
              ) VALUES ($1, $2, $3, $4, $5, 0, $5, $6, CURRENT_TIMESTAMP)
              ON CONFLICT(month_year, item_name, day, session) DO UPDATE SET
                stock_in_hands = nursing_monthly_stock.stock_in_hands + $5,
                balance = (nursing_monthly_stock.stock_in_hands + $5) - nursing_monthly_stock.consumed,
                updated_at = CURRENT_TIMESTAMP`,
        args: [month_year, it.item_name, day, session, qty, `Received via Requisition #${id}`],
      });
      added += 1;
    }

    if (statements.length > 0) {
      await db.batch(statements);
    }

    await db.query(
      "UPDATE requisitions SET status = 'Received', received_at = CURRENT_TIMESTAMP, received_by = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
      [req.user?.id || null, id]
    );

    try {
      const { logAction } = require('../middleware/audit');
      await logAction(req, 'REQUISITION_RECEIVED', 'requisitions', id, { items: added, month_year, day, session });
    } catch (e) { /* audit best-effort */ }

    res.json({ success: true, message: `Accepted ${added} item(s) into the Daily Stock Checkup.`, added });
  } catch (error) {
    console.error('Error in receiveRequisition:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.getVendors = async (req, res) => {
  try {
    const { rows } = await db.query("SELECT * FROM vendors WHERE is_active = 1");
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error in getVendors:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.createVendor = async (req, res) => {
  try {
    const { name, contact, contractTerms } = req.body;
    await db.query("INSERT INTO vendors (name, contact, contract_terms) VALUES ($1, $2, $3)", [name, contact, contractTerms]);
    res.json({ success: true, message: 'Vendor added successfully' });
  } catch (error) {
    console.error('Error in createVendor:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.updateVendor = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, contact, contractTerms } = req.body;
    await db.query(
      "UPDATE vendors SET name = $1, contact = $2, contract_terms = $3 WHERE id = $4",
      [name, contact, contractTerms, id]
    );
    res.json({ success: true, message: 'Vendor updated successfully' });
  } catch (error) {
    console.error('Error in updateVendor:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.deleteVendor = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("DELETE FROM vendors WHERE id = $1", [id]);
    res.json({ success: true, message: 'Vendor deleted successfully' });
  } catch (error) {
    console.error('Error in deleteVendor:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.getDepartments = async (req, res) => {
  try {
    const { rows } = await db.query("SELECT * FROM departments");
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error in getDepartments:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.createDepartment = async (req, res) => {
  try {
    const { name } = req.body;
    await db.query("INSERT INTO departments (name) VALUES ($1)", [name]);
    res.json({ success: true, message: 'Department added successfully' });
  } catch (error) {
    console.error('Error in createDepartment:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    await db.query("UPDATE departments SET name = $1 WHERE id = $2", [name, id]);
    res.json({ success: true, message: 'Department updated successfully' });
  } catch (error) {
    console.error('Error in updateDepartment:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("DELETE FROM departments WHERE id = $1", [id]);
    res.json({ success: true, message: 'Department deleted successfully' });
  } catch (error) {
    console.error('Error in deleteDepartment:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// --- UOM Management ---
exports.getUoms = async (req, res) => {
  try {
    const { rows } = await db.query("SELECT * FROM uoms ORDER BY name ASC");
    res.json(rows);
  } catch (error) {
    console.error('Error in getUoms:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.createUom = async (req, res) => {
  try {
    const { name, abbreviation, description } = req.body;
    const { rows } = await db.query(
      "INSERT INTO uoms (name, abbreviation, description) VALUES ($1, $2, $3) RETURNING *",
      [name, abbreviation, description]
    );
    res.json({ success: true, uom: rows[0] });
  } catch (error) {
    console.error('Error in createUom:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.updateUom = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, abbreviation, description } = req.body;
    const { rows } = await db.query(
      "UPDATE uoms SET name = $1, abbreviation = $2, description = $3 WHERE id = $4 RETURNING *",
      [name, abbreviation, description, id]
    );
    res.json({ success: true, uom: rows[0] });
  } catch (error) {
    console.error('Error in updateUom:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.deleteUom = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("DELETE FROM uoms WHERE id = $1", [id]);
    res.json({ success: true, message: 'UOM deleted successfully' });
  } catch (error) {
    console.error('Error in deleteUom:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.reconcileInventory = async (req, res) => {
  try {
    const { items } = req.body;
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ success: false, message: 'Invalid payload' });
    }

    const updatedBy = req.user?.fullName || req.user?.username || 'system';

    for (const item of items) {
      const { name, quantity, batchNumber, expiryDate, purchasePrice } = item;
      if (!name || !batchNumber) continue;

      // 1. Find or create master item
      let itemId;
      const { rows: existingItems } = await db.query("SELECT id FROM master_inventory WHERE name = $1", [name]);
      if (existingItems.length > 0) {
        itemId = existingItems[0].id;
      } else {
        const sku = generateSkuPrefix(name);
        const { rows: newItem } = await db.query(
          "INSERT INTO master_inventory (name, sku, unit_of_measure, category) VALUES ($1, $2, 'Unit', 'medical_supplies') RETURNING id",
          [name, sku]
        );
        itemId = newItem[0].id;
      }

      // 2. Find or create batch
      const { rows: existingBatches } = await db.query("SELECT id, quantity FROM stock_batches WHERE batch_number = $1", [batchNumber]);
      if (existingBatches.length > 0) {
        const batch = existingBatches[0];

        // Log the change for audit log
        await db.query(`
          INSERT INTO nursing_stock_change_logs (month_year, item_name, day, session, old_stock, new_stock, updated_by)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          new Date().toLocaleDateString('en-US', { month: '2-digit', year: 'numeric' }),
          name,
          new Date().getDate(),
          'Reconciliation',
          batch.quantity,
          quantity,
          updatedBy
        ]);

        // Update quantity
        await db.query("UPDATE stock_batches SET quantity = $1 WHERE id = $2", [quantity, batch.id]);
      } else {
        // Log the change for audit log (old_stock is 0)
        await db.query(`
          INSERT INTO nursing_stock_change_logs (month_year, item_name, day, session, old_stock, new_stock, updated_by)
          VALUES ($1, $2, $3, $4, 0, $5, $6)
        `, [
          new Date().toLocaleDateString('en-US', { month: '2-digit', year: 'numeric' }),
          name,
          new Date().getDate(),
          'Reconciliation',
          quantity,
          updatedBy
        ]);

        // Insert new batch
        await db.query(`
          INSERT INTO stock_batches (item_id, batch_number, expiry_date, purchase_price, quantity)
          VALUES ($1, $2, $3, $4, $5)
        `, [itemId, batchNumber, expiryDate || '12/2029', purchasePrice || 0.0, quantity]);
      }
    }

    res.json({ success: true, message: 'Stock reconciliation pipeline processed successfully' });
  } catch (error) {
    console.error('Error in reconcileInventory:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.syncCentralStockToNursing = async (req, res) => {
  try {
    const { month_year, day, session } = req.body;
    if (!month_year || day === undefined || !session) {
      return res.status(400).json({ success: false, message: 'month_year, day, and session are required.' });
    }

    // Get the NURSING department ID
    const { rows: deptRows } = await db.query("SELECT id FROM departments WHERE UPPER(name) = 'NURSING' LIMIT 1");
    const deptId = deptRows[0]?.id || 121;

    // Get the stock from department_stock joined with master_inventory for NURSING
    const { rows: deptStocks } = await db.query(`
      SELECT mi.name as item_name, COALESCE(SUM(ds.quantity), 0) as total_qty
      FROM department_stock ds
      JOIN master_inventory mi ON ds.item_id = mi.id
      WHERE ds.department_id = $1
      GROUP BY mi.id
    `, [deptId]);

    if (deptStocks.length === 0) {
      return res.json({ success: true, message: 'No department stock found in General Store for NURSING.', updatedCount: 0 });
    }

    const statements = [];
    for (const stock of deptStocks) {
      statements.push({
        sql: `INSERT INTO nursing_monthly_stock (
          month_year, item_name, day, session, stock_in_hands, consumed, balance, responsible_name, updated_at
        ) VALUES ($1, $2, $3, $4, $5, 0, $5, 'General Store Sync', CURRENT_TIMESTAMP)
        ON CONFLICT(month_year, item_name, day, session) DO UPDATE SET
          stock_in_hands = $5,
          balance = $5 - consumed,
          updated_at = CURRENT_TIMESTAMP`,
        args: [month_year, stock.item_name, day, session, stock.total_qty]
      });
    }

    await db.batch(statements);

    res.json({ success: true, message: `Successfully synchronized ${deptStocks.length} stock items with General Store Hub!`, updatedCount: deptStocks.length });
  } catch (error) {
    console.error('Error in syncCentralStockToNursing:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ─── Supplier Portal Controllers (Multi-Session) ─────────────────────────────

/** Public: returns true if ANY session is currently active */
exports.getSupplierPortalPublicStatus = async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT id FROM supplier_portal_sessions WHERE is_active = 1 LIMIT 1"
    );
    res.json({ success: true, active: rows.length > 0 });
  } catch (error) {
    console.error('Error in getSupplierPortalPublicStatus:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/** Open a new portal session for a vendor (or close one by sessionId) */
exports.toggleSupplierPortal = async (req, res) => {
  try {
    const { active, vendorId, requestedItems, sessionId } = req.body;

    if (active) {
      // ── Open a new session ──────────────────────────────────────────────────
      if (!vendorId || !requestedItems || !Array.isArray(requestedItems) || requestedItems.length === 0) {
        return res.status(400).json({ success: false, message: 'Vendor selection and requested items are required to open the portal.' });
      }

      // Fetch vendor name
      const { rows: vendRows } = await db.query("SELECT name FROM vendors WHERE id = $1", [vendorId]);
      if (!vendRows[0]) {
        return res.status(404).json({ success: false, message: 'Vendor not found.' });
      }
      const vendorName = vendRows[0].name;

      // Generate unique 12-char alphanumeric token (retry on collision)
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let token = '';
      let attempts = 0;
      while (attempts < 10) {
        token = Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
        const { rows: existing } = await db.query(
          "SELECT id FROM supplier_portal_sessions WHERE token = $1", [token]
        );
        if (existing.length === 0) break;
        attempts++;
      }

      const { rows: newRows } = await db.query(
        `INSERT INTO supplier_portal_sessions (vendor_id, vendor_name, token, items, is_active)
         VALUES ($1, $2, $3, $4, 1) RETURNING id, created_at`,
        [vendorId, vendorName, token, JSON.stringify(requestedItems)]
      );

      return res.json({
        success: true,
        message: `Supplier portal opened for ${vendorName}.`,
        session: {
          id: newRows[0].id,
          vendorId,
          vendorName,
          token,
          requestedItems,
          createdAt: newRows[0].created_at,
          isActive: true
        }
      });

    } else {
      // ── Close a specific session by ID ──────────────────────────────────────
      if (!sessionId) {
        return res.status(400).json({ success: false, message: 'sessionId is required to close a portal.' });
      }
      await db.query(
        "UPDATE supplier_portal_sessions SET is_active = 0 WHERE id = $1",
        [sessionId]
      );
      return res.json({ success: true, message: 'Supplier portal session closed.', sessionId });
    }
  } catch (error) {
    console.error('Error in toggleSupplierPortal:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/** Authenticated: return all currently active sessions */
exports.getSupplierPortalSettings = async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT id, vendor_id, vendor_name, token, items, created_at FROM supplier_portal_sessions WHERE is_active = 1 ORDER BY created_at DESC"
    );

    const sessions = rows.map(r => ({
      id: r.id,
      vendorId: r.vendor_id,
      vendorName: r.vendor_name,
      token: r.token,
      requestedItems: (() => { try { return JSON.parse(r.items || '[]'); } catch { return []; } })(),
      createdAt: r.created_at,
      isActive: true
    }));

    res.json({ success: true, sessions });
  } catch (error) {
    console.error('Error in getSupplierPortalSettings:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/** Public: verify a supplier token against active sessions */
exports.verifySupplierToken = async (req, res) => {
  try {
    let { token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Token is required.' });
    }
    token = token.trim().toUpperCase();
    if (token.length !== 12) {
      return res.status(400).json({ success: false, message: 'Invalid token format. Must be 12 characters.' });
    }

    const { rows } = await db.query(
      "SELECT id, vendor_name, items FROM supplier_portal_sessions WHERE UPPER(token) = $1 AND is_active = 1 LIMIT 1",
      [token]
    );

    if (!rows[0]) {
      return res.status(401).json({ success: false, message: 'Authentication failed. Invalid or expired portal token.' });
    }

    const session = rows[0];
    const requestedItems = (() => { try { return JSON.parse(session.items || '[]'); } catch { return []; } })();

    res.json({ success: true, sessionId: session.id, vendorName: session.vendor_name, requestedItems });
  } catch (error) {
    console.error('Error in verifySupplierToken:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/** Public: supplier uploads their Excel; closes their specific session on success */
exports.supplierPortalUpload = async (req, res) => {
  try {
    let { token, fileData } = req.body;
    if (!token || !fileData) {
      return res.status(400).json({ success: false, message: 'Token and file data are required.' });
    }
    token = token.trim().toUpperCase();

    // Validate token against active sessions
    const { rows: sessionRows } = await db.query(
      "SELECT id, vendor_name FROM supplier_portal_sessions WHERE UPPER(token) = $1 AND is_active = 1 LIMIT 1",
      [token]
    );
    if (!sessionRows[0]) {
      return res.status(401).json({ success: false, message: 'Invalid or expired portal token.' });
    }
    const sessionId = sessionRows[0].id;
    const supplierName = sessionRows[0].vendor_name;

    // Parse base64 file data using xlsx
    const XLSX = require('xlsx');
    const buffer = Buffer.from(fileData, 'base64');
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    if (jsonData.length === 0) {
      return res.status(400).json({ success: false, message: 'The uploaded Excel sheet contains no data.' });
    }

    const items = [];
    for (const row of jsonData) {
      const productName = row['Product Name'] || row['product_name'] || row['Product'] || row['Name'];
      const sku = row['SKU'] || row['sku'];
      const category = row['Category'] || row['category'];
      const unitOfMeasure = row['Unit of Measure'] || row['unit_of_measure'] || row['UOM'] || row['uom'];
      const batchNumber = row['Batch Number'] || row['batch_number'] || row['Batch'] || row['batch'];
      const expiryDate = row['Expiry Date'] || row['expiry_date'] || row['Expiry'] || row['expiry'];
      const purchasePrice = parseFloat(row['Purchase Price'] || row['purchase_price'] || row['Price'] || row['price'] || 0);
      const quantity = parseInt(row['Quantity'] || row['quantity'] || row['Qty'] || row['qty'] || 0, 10);

      if (!productName || !category || !unitOfMeasure || !batchNumber || !expiryDate || isNaN(purchasePrice) || isNaN(quantity)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid Excel structure. Please ensure Product Name, Category, Unit of Measure, Batch Number, Expiry Date, Purchase Price, and Quantity are present and filled in all rows.'
        });
      }

      items.push({
        name: productName.toString().trim(),
        sku: sku ? sku.toString().trim() : null,
        category: category.toString().trim(),
        unit_of_measure: unitOfMeasure.toString().trim(),
        batch_number: batchNumber.toString().trim(),
        expiry_date: expiryDate.toString().trim(),
        purchase_price: purchasePrice,
        quantity: quantity,
        vendor_name: supplierName
      });
    }

    // Save submission
    const { rows: subRows } = await db.query(
      "INSERT INTO supplier_submissions (supplier_name, status) VALUES ($1, 'pending') RETURNING id",
      [supplierName]
    );
    const submissionId = subRows[0].id;

    for (const item of items) {
      await db.query(`
        INSERT INTO supplier_submission_items
        (submission_id, name, sku, category, unit_of_measure, batch_number, expiry_date, purchase_price, quantity, vendor_name)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        submissionId, item.name, item.sku, item.category, item.unit_of_measure,
        item.batch_number, item.expiry_date, item.purchase_price, item.quantity, item.vendor_name
      ]);
    }

    // Close only this session (other vendor sessions remain open)
    await db.query("UPDATE supplier_portal_sessions SET is_active = 0 WHERE id = $1", [sessionId]);

    // Notify Stock Managers, Procurement Managers & Admins
    const Notification = require('../models/notification');
    const { rows: managers } = await db.query(`
      SELECT u.id FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE r.name IN ('stock-manager', 'stock_manager', 'admin', 'procurement-manager')
    `);
    for (const mgr of managers) {
      try {
        await Notification.create({
          userId: mgr.id,
          title: 'New Supplier Stock Submission',
          message: `${supplierName} has uploaded a new stock delivery of ${items.length} items.`,
          type: 'info',
          link: '/procurement'
        });
      } catch (err) {
        console.error(`Error notifying manager ${mgr.id}:`, err);
      }
    }

    res.json({ success: true, message: 'Stock list submitted successfully. The stock manager will review and accept it.' });
  } catch (error) {
    console.error('Error in supplierPortalUpload:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};


exports.getSupplierSubmissions = async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT ss.*, COUNT(ssi.id) as total_items, COALESCE(SUM(ssi.quantity), 0) as total_quantity
      FROM supplier_submissions ss
      LEFT JOIN supplier_submission_items ssi ON ss.id = ssi.submission_id
      GROUP BY ss.id
      ORDER BY ss.uploaded_at DESC
    `);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error in getSupplierSubmissions:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.getSupplierSubmissionItems = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await db.query(
      "SELECT * FROM supplier_submission_items WHERE submission_id = $1",
      [id]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error in getSupplierSubmissionItems:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.receiveSupplierStock = async (req, res) => {
  try {
    const { id } = req.params;

    // Get submission metadata
    const { rows: subRows } = await db.query(
      "SELECT * FROM supplier_submissions WHERE id = $1 AND status = 'pending'",
      [id]
    );
    if (subRows.length === 0) {
      return res.status(400).json({ success: false, message: 'Submission not found or already processed.' });
    }
    const submission = subRows[0];

    // Get all items in submission
    const { rows: items } = await db.query(
      "SELECT * FROM supplier_submission_items WHERE submission_id = $1",
      [id]
    );

    // Resolve Central Store department ID
    const { rows: deptRows } = await db.query(
      "SELECT id FROM departments WHERE name LIKE '%Central%' OR name LIKE '%Store%' LIMIT 1"
    );
    const centralDeptId = deptRows[0]?.id || 1; // Fallback to 1

    for (const item of items) {
      // 1. Resolve or Create Vendor
      let vendorId = null;
      if (item.vendor_name) {
        const { rows: vendRows } = await db.query(
          "SELECT id FROM vendors WHERE LOWER(name) = LOWER($1) LIMIT 1",
          [item.vendor_name]
        );
        if (vendRows.length > 0) {
          vendorId = vendRows[0].id;
        } else {
          const { rows: newVendRows } = await db.query(
            "INSERT INTO vendors (name, is_active) VALUES ($1, 1) RETURNING id",
            [item.vendor_name]
          );
          vendorId = newVendRows[0].id;
        }
      }

      // 2. Resolve Master Inventory Item
      let itemId = null;
      const { rows: itemMatch } = await db.query(
        "SELECT id FROM master_inventory WHERE LOWER(name) = LOWER($1) LIMIT 1",
        [item.name]
      );

      if (itemMatch.length > 0) {
        itemId = itemMatch[0].id;
      } else {
        // Insert new item in master inventory
        // Generate SKU
        const sku = item.sku || generateSkuPrefix(item.name);
        const { rows: newItemRows } = await db.query(
          "INSERT INTO master_inventory (name, sku, unit_of_measure, category) VALUES ($1, $2, $3, $4) RETURNING id",
          [item.name, sku, item.unit_of_measure || 'Unit', item.category || 'medical_supplies']
        );
        itemId = newItemRows[0].id;
      }

      // 3. Resolve Stock Batch (matching batch_number, expiry_date, purchase_price)
      const { rows: batchMatch } = await db.query(`
        SELECT id, quantity FROM stock_batches 
        WHERE item_id = $1 
          AND batch_number = $2 
          AND expiry_date = $3 
          AND ABS(purchase_price - $4) < 0.001
        LIMIT 1
      `, [itemId, item.batch_number, item.expiry_date, item.purchase_price]);

      let batchId = null;
      if (batchMatch.length > 0) {
        batchId = batchMatch[0].id;
        // Add to existing batch quantity
        await db.query(
          "UPDATE stock_batches SET quantity = quantity + $1 WHERE id = $2",
          [item.quantity, batchId]
        );
      } else {
        // Create new batch
        const { rows: newBatchRows } = await db.query(`
          INSERT INTO stock_batches (item_id, vendor_id, batch_number, expiry_date, purchase_price, quantity)
          VALUES ($1, $2, $3, $4, $5, $6) RETURNING id
        `, [itemId, vendorId, item.batch_number, item.expiry_date, item.purchase_price, item.quantity]);
        batchId = newBatchRows[0].id;
      }

      // 4. Update or Insert Department Stock for Central Store
      const { rows: deptStockMatch } = await db.query(`
        SELECT id, quantity FROM department_stock 
        WHERE department_id = $1 AND item_id = $2 AND batch_id = $3
      `, [centralDeptId, itemId, batchId]);

      if (deptStockMatch.length > 0) {
        await db.query(
          "UPDATE department_stock SET quantity = quantity + $1 WHERE id = $2",
          [item.quantity, deptStockMatch[0].id]
        );
      } else {
        await db.query(`
          INSERT INTO department_stock (department_id, item_id, batch_id, quantity)
          VALUES ($1, $2, $3, $4)
        `, [centralDeptId, itemId, batchId, item.quantity]);
      }
    }

    // Update submission status to received
    await db.query(
      "UPDATE supplier_submissions SET status = 'received' WHERE id = $1",
      [id]
    );

    res.json({ success: true, message: 'Stock received and inventory successfully updated.' });
  } catch (error) {
    console.error('Error in receiveSupplierStock:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ─── Purchase Orders Controllers ───────────────────────────────────────────────
exports.getPurchaseOrders = async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT po.*, v.name as vendor_name 
      FROM purchase_orders po
      JOIN vendors v ON po.vendor_id = v.id
      ORDER BY po.created_at DESC
    `);
    for (const po of rows) {
      const { rows: items } = await db.query(
        "SELECT * FROM purchase_order_items WHERE po_id = $1",
        [po.id]
      );
      po.items = items;
    }
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error in getPurchaseOrders:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.createPurchaseOrder = async (req, res) => {
  try {
    const { vendorId, notes, items } = req.body;
    if (!vendorId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'vendorId and items are required.' });
    }

    const timestamp = Date.now();
    const poNumber = `PO-${timestamp}`;

    const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

    const { rows } = await db.query(`
      INSERT INTO purchase_orders (po_number, vendor_id, created_by, status, total_amount, notes)
      VALUES ($1, $2, $3, 'Draft', $4, $5)
      RETURNING id, po_number
    `, [poNumber, vendorId, req.user?.id || null, totalAmount, notes || '']);

    const poId = rows[0].id;

    for (const item of items) {
      await db.query(`
        INSERT INTO purchase_order_items (po_id, item_name, sku, unit_of_measure, category, quantity, unit_price)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        poId, item.item_name, item.sku || null, 
        item.unit_of_measure || 'Unit', item.category || 'medical_supplies', 
        item.quantity, item.unit_price
      ]);
    }

    res.json({ success: true, data: { id: poId, po_number: poNumber } });
  } catch (error) {
    console.error('Error in createPurchaseOrder:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.updatePOStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, message: 'Status is required.' });
    }
    await db.query(
      "UPDATE purchase_orders SET status = $1 WHERE id = $2",
      [status, id]
    );
    res.json({ success: true, message: 'PO status updated successfully.' });
  } catch (error) {
    console.error('Error in updatePOStatus:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ─── Goods Receipt Notes Controllers ───────────────────────────────────────────
exports.getGRNs = async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT grn.*, v.name as vendor_name, u.full_name as received_by_name, po.po_number
      FROM goods_receipt_notes grn
      JOIN vendors v ON grn.vendor_id = v.id
      LEFT JOIN users u ON grn.received_by = u.id
      LEFT JOIN purchase_orders po ON grn.po_id = po.id
      ORDER BY grn.received_at DESC
    `);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error in getGRNs:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.getGRNItems = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await db.query(
      "SELECT * FROM goods_receipt_items WHERE grn_id = $1",
      [id]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error in getGRNItems:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.createGRN = async (req, res) => {
  try {
    const { poId, vendorId, invoiceNumber, deliveryNoteNumber, notes, items } = req.body;
    if (!vendorId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'vendorId and items are required.' });
    }

    const timestamp = Date.now();
    const grnNumber = `GRN-${timestamp}`;

    const { rows } = await db.query(`
      INSERT INTO goods_receipt_notes (grn_number, po_id, vendor_id, received_by, invoice_number, delivery_note_number, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, grn_number
    `, [grnNumber, poId || null, vendorId, req.user?.id || null, invoiceNumber || null, deliveryNoteNumber || null, notes || '']);

    const grnId = rows[0].id;

    // Resolve Central Store department ID
    const { rows: deptRows } = await db.query(
      "SELECT id FROM departments WHERE name LIKE '%Central%' OR name LIKE '%Store%' LIMIT 1"
    );
    const centralDeptId = deptRows[0]?.id || 1;

    for (const item of items) {
      await db.query(`
        INSERT INTO goods_receipt_items (grn_id, item_name, sku, unit_of_measure, category, quantity_received, batch_number, expiry_date, purchase_price)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        grnId, item.item_name, item.sku || null, 
        item.unit_of_measure || 'Unit', item.category || 'medical_supplies', 
        item.quantity_received, item.batch_number || null, item.expiry_date || null, item.purchase_price
      ]);

      // 1. Resolve or Create Master Item
      let itemId = null;
      const { rows: itemMatch } = await db.query(
        "SELECT id FROM master_inventory WHERE LOWER(name) = LOWER($1) LIMIT 1",
        [item.item_name]
      );
      if (itemMatch.length > 0) {
        itemId = itemMatch[0].id;
      } else {
        const sku = item.sku || generateSkuPrefix(item.item_name);
        const { rows: newItemRows } = await db.query(
          "INSERT INTO master_inventory (name, sku, unit_of_measure, category) VALUES ($1, $2, $3, $4) RETURNING id",
          [item.item_name, sku, item.unit_of_measure || 'Unit', item.category || 'medical_supplies']
        );
        itemId = newItemRows[0].id;
      }

      // 2. Resolve Stock Batch
      let batchId = null;
      const { rows: batchMatch } = await db.query(`
        SELECT id, quantity FROM stock_batches 
        WHERE item_id = $1 AND (batch_number = $2 OR (batch_number IS NULL AND $2 IS NULL)) 
          AND (expiry_date = $3 OR (expiry_date IS NULL AND $3 IS NULL)) 
          AND purchase_price = $4
      `, [itemId, item.batch_number || null, item.expiry_date || null, item.purchase_price]);

      if (batchMatch.length > 0) {
        batchId = batchMatch[0].id;
        await db.query(
          "UPDATE stock_batches SET quantity = quantity + $1 WHERE id = $2",
          [item.quantity_received, batchId]
        );
      } else {
        const { rows: batchCount } = await db.query(
          "SELECT COUNT(*) as cnt FROM stock_batches WHERE item_id = $1",
          [itemId]
        );
        const nextLotInt = (Number(batchCount[0]?.cnt) || 0) + 1;
        const lotNumber = String(nextLotInt).padStart(2, '0');

        const { rows: newBatchRows } = await db.query(`
          INSERT INTO stock_batches (item_id, vendor_id, batch_number, lot_number, expiry_date, purchase_price, quantity)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id
        `, [itemId, vendorId, item.batch_number || null, lotNumber, item.expiry_date || null, item.purchase_price, item.quantity_received]);
        batchId = newBatchRows[0].id;
      }

      // 3. Update Department Stock for Central Store
      const { rows: deptStockMatch } = await db.query(`
        SELECT id, quantity FROM department_stock 
        WHERE department_id = $1 AND item_id = $2 AND batch_id = $3
      `, [centralDeptId, itemId, batchId]);

      if (deptStockMatch.length > 0) {
        await db.query(
          "UPDATE department_stock SET quantity = quantity + $1 WHERE id = $2",
          [item.quantity_received, deptStockMatch[0].id]
        );
      } else {
        await db.query(`
          INSERT INTO department_stock (department_id, item_id, batch_id, quantity)
          VALUES ($1, $2, $3, $4)
        `, [centralDeptId, itemId, batchId, item.quantity_received]);
      }
    }

    if (poId) {
      await db.query(
        "UPDATE purchase_orders SET status = 'Fulfilled' WHERE id = $1",
        [poId]
      );
    }

    res.json({ success: true, message: 'Goods receipt note processed, stock updated successfully.', data: { id: grnId, grn_number: grnNumber } });
  } catch (error) {
    console.error('Error in createGRN:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ─── Supplier Returns Controllers ─────────────────────────────────────────────
exports.getSupplierReturns = async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT r.*, v.name as vendor_name, u.full_name as returned_by_name
      FROM supplier_returns r
      JOIN vendors v ON r.vendor_id = v.id
      LEFT JOIN users u ON r.returned_by = u.id
      ORDER BY r.returned_at DESC
    `);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error in getSupplierReturns:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.getSupplierReturnItems = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await db.query(`
      SELECT ri.*, mi.name as item_name, mi.sku, mi.unit_of_measure, sb.batch_number
      FROM supplier_return_items ri
      JOIN master_inventory mi ON ri.item_id = mi.id
      LEFT JOIN stock_batches sb ON ri.batch_id = sb.id
      WHERE ri.return_id = $1
    `, [id]);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error in getSupplierReturnItems:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.createSupplierReturn = async (req, res) => {
  try {
    const { vendorId, notes, items } = req.body;
    if (!vendorId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'vendorId and items are required.' });
    }

    const { rows: deptRows } = await db.query(
      "SELECT id FROM departments WHERE name LIKE '%Central%' OR name LIKE '%Store%' LIMIT 1"
    );
    const centralDeptId = deptRows[0]?.id || 1;

    const timestamp = Date.now();
    const returnNumber = `RET-${timestamp}`;

    const { rows } = await db.query(`
      INSERT INTO supplier_returns (return_number, vendor_id, returned_by, notes)
      VALUES ($1, $2, $3, $4)
      RETURNING id, return_number
    `, [returnNumber, vendorId, req.user?.id || null, notes || '']);

    const returnId = rows[0].id;

    for (const item of items) {
      await db.query(`
        INSERT INTO supplier_return_items (return_id, item_id, batch_id, quantity, reason)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        returnId, item.item_id, item.batch_id || null, 
        item.quantity, item.reason || ''
      ]);

      if (item.batch_id) {
        await db.query(
          "UPDATE stock_batches SET quantity = MAX(0, quantity - $1) WHERE id = $2",
          [item.quantity, item.batch_id]
        );

        await db.query(`
          UPDATE department_stock 
          SET quantity = MAX(0, quantity - $1) 
          WHERE department_id = $2 AND item_id = $3 AND batch_id = $4
        `, [item.quantity, centralDeptId, item.item_id, item.batch_id]);
      }
    }

    res.json({ success: true, message: 'Supplier return logged and inventory updated successfully.', data: { id: returnId, return_number: returnNumber } });
  } catch (error) {
    console.error('Error in createSupplierReturn:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};





/**
 * GET /api/clinical/procurement/dashboard
 * Aggregated KPIs for the Procurement Manager dashboard. Each section is
 * resolved independently (Promise.allSettled) so a missing table/column (e.g.
 * the rfq_* layer on an environment that hasn't migrated it yet) degrades to a
 * safe default instead of failing the whole dashboard.
 */
exports.getProcurementDashboard = async (req, res) => {
  const q = (sql, args = []) => db.query(sql, args).then(r => r.rows);
  const num = (v) => Number(v || 0);
  const toMap = (rows, keyCol = 'status', valCol = 'c') =>
    rows.reduce((acc, r) => { acc[r[keyCol] || 'Unknown'] = num(r[valCol]); return acc; }, {});

  // Period boundaries (ISO date strings; created_at etc. are ISO so lexical compare is safe).
  const now = new Date();
  const isoDay = (d) => d.toISOString().slice(0, 10);
  const mStart = isoDay(new Date(now.getFullYear(), now.getMonth(), 1));
  const lmStart = isoDay(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const qStart = isoDay(new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1));
  const yStart = `${now.getFullYear()}-01-01`;
  // One-row multi-period aggregate (this month / last month / quarter-to-date / year-to-date).
  const periodAgg = (table, dateCol, valCol) => q(
    `SELECT
       COALESCE(SUM(CASE WHEN ${dateCol} >= ? THEN ${valCol} END),0) mtd_v,
       COALESCE(SUM(CASE WHEN ${dateCol} >= ? THEN 1 END),0) mtd_c,
       COALESCE(SUM(CASE WHEN ${dateCol} >= ? AND ${dateCol} < ? THEN ${valCol} END),0) lm_v,
       COALESCE(SUM(CASE WHEN ${dateCol} >= ? AND ${dateCol} < ? THEN 1 END),0) lm_c,
       COALESCE(SUM(CASE WHEN ${dateCol} >= ? THEN ${valCol} END),0) qtd_v,
       COALESCE(SUM(CASE WHEN ${dateCol} >= ? THEN 1 END),0) qtd_c,
       COALESCE(SUM(CASE WHEN ${dateCol} >= ? THEN ${valCol} END),0) ytd_v,
       COALESCE(SUM(CASE WHEN ${dateCol} >= ? THEN 1 END),0) ytd_c
     FROM ${table}`,
    [mStart, mStart, lmStart, mStart, lmStart, mStart, qStart, qStart, yStart, yStart]
  );

  const tasks = {
    spend: q(`SELECT
                COALESCE(SUM(total_amount),0) AS total,
                COALESCE(SUM(CASE WHEN created_at >= strftime('%Y-%m-01','now') THEN total_amount ELSE 0 END),0) AS this_month,
                COALESCE(SUM(CASE WHEN created_at >= strftime('%Y-%m-01','now','-1 month')
                                   AND created_at <  strftime('%Y-%m-01','now') THEN total_amount ELSE 0 END),0) AS last_month,
                COUNT(*) AS po_count
              FROM purchase_orders`),
    poByStatus:  q(`SELECT status, COUNT(*) c, COALESCE(SUM(total_amount),0) v FROM purchase_orders GROUP BY status`),
    reqByStatus: q(`SELECT status, COUNT(*) c FROM requisitions GROUP BY status`),
    subByStatus: q(`SELECT status, COUNT(*) c FROM supplier_submissions GROUP BY status`),
    portal:      q(`SELECT COUNT(*) c FROM supplier_portal_sessions WHERE is_active = 1`),
    grns:        q(`SELECT COUNT(*) total,
                           COALESCE(SUM(CASE WHEN received_at >= strftime('%Y-%m-01','now') THEN 1 ELSE 0 END),0) this_month
                    FROM goods_receipt_notes`),
    returns:     q(`SELECT COUNT(*) total,
                           COALESCE(SUM(CASE WHEN returned_at >= strftime('%Y-%m-01','now') THEN 1 ELSE 0 END),0) this_month
                    FROM supplier_returns`),
    vendors:     q(`SELECT COUNT(*) total, COALESCE(SUM(CASE WHEN is_active=1 THEN 1 ELSE 0 END),0) active FROM vendors`),
    topSuppliers: q(`SELECT v.name, COUNT(po.id) po_count, COALESCE(SUM(po.total_amount),0) spend
                     FROM purchase_orders po JOIN vendors v ON po.vendor_id = v.id
                     GROUP BY v.id, v.name ORDER BY spend DESC LIMIT 6`),
    spendTrend:  q(`SELECT strftime('%Y-%m', created_at) ym, COALESCE(SUM(total_amount),0) total, COUNT(*) c
                    FROM purchase_orders
                    WHERE created_at >= strftime('%Y-%m-01','now','-5 months')
                    GROUP BY ym ORDER BY ym`),
    rfqByStatus: q(`SELECT status, COUNT(*) c FROM rfqs GROUP BY status`),
    rfqAward:    q(`SELECT COUNT(*) c FROM rfq_awards`),
    recentPOs:   q(`SELECT po.po_number ref, v.name vendor, po.total_amount amount, po.status, po.created_at date
                    FROM purchase_orders po JOIN vendors v ON po.vendor_id = v.id
                    ORDER BY po.created_at DESC LIMIT 6`),
    recentGRNs:  q(`SELECT grn.grn_number ref, v.name vendor, grn.received_at date
                    FROM goods_receipt_notes grn JOIN vendors v ON grn.vendor_id = v.id
                    ORDER BY grn.received_at DESC LIMIT 6`),
    recentSubs:  q(`SELECT supplier_name vendor, status, uploaded_at date FROM supplier_submissions ORDER BY uploaded_at DESC LIMIT 6`),
    poPeriods:   periodAgg('purchase_orders', 'created_at', 'total_amount'),
    grnPeriods:  periodAgg('goods_receipt_notes', 'received_at', 'total_amount'),
    retPeriods:  periodAgg('supplier_returns', 'returned_at', '1'),
  };

  const keys = Object.keys(tasks);
  const settled = await Promise.allSettled(keys.map(k => tasks[k]));
  const R = {};
  keys.forEach((k, i) => { R[k] = settled[i].status === 'fulfilled' ? settled[i].value : []; });

  const spendRow = R.spend[0] || {};
  const grnRow = R.grns[0] || {};
  const retRow = R.returns[0] || {};
  const venRow = R.vendors[0] || {};
  const subMap = toMap(R.subByStatus);
  const reqMap = toMap(R.reqByStatus);
  const rfqMap = toMap(R.rfqByStatus);
  const poP = R.poPeriods[0] || {};
  const grnP = R.grnPeriods[0] || {};
  const retP = R.retPeriods[0] || {};

  // Build a unified recent-activity feed
  const recent = [
    ...R.recentPOs.map(r => ({ type: 'po', ref: r.ref, vendor: r.vendor, amount: num(r.amount), status: r.status, date: r.date })),
    ...R.recentGRNs.map(r => ({ type: 'grn', ref: r.ref, vendor: r.vendor, date: r.date })),
    ...R.recentSubs.map(r => ({ type: 'submission', vendor: r.vendor, status: r.status, date: r.date })),
  ].filter(x => x.date).sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 10);

  res.json({
    success: true,
    data: {
      generatedAt: new Date().toISOString(),
      spend: {
        total: num(spendRow.total),
        thisMonth: num(spendRow.this_month),
        lastMonth: num(spendRow.last_month),
        poCount: num(spendRow.po_count),
      },
      purchaseOrders: { byStatus: toMap(R.poByStatus), valueByStatus: toMap(R.poByStatus, 'status', 'v'), total: R.poByStatus.reduce((s, r) => s + num(r.c), 0) },
      requisitions: { byStatus: reqMap, pending: num(reqMap.Pending) },
      submissions: { byStatus: subMap, pending: num(subMap.pending), received: num(subMap.received), total: Object.values(subMap).reduce((s, v) => s + v, 0) },
      portal: { activeSessions: num((R.portal[0] || {}).c) },
      grns: { total: num(grnRow.total), thisMonth: num(grnRow.this_month) },
      returns: { total: num(retRow.total), thisMonth: num(retRow.this_month) },
      vendors: { total: num(venRow.total), active: num(venRow.active), inactive: num(venRow.total) - num(venRow.active) },
      rfqs: {
        byStatus: rfqMap,
        total: Object.values(rfqMap).reduce((s, v) => s + v, 0),
        awaitingAward: num(rfqMap.UnderReview),
        awards: num((R.rfqAward[0] || {}).c),
      },
      topSuppliers: R.topSuppliers.map(s => ({ name: s.name, spend: num(s.spend), poCount: num(s.po_count) })),
      spendTrend: R.spendTrend.map(t => ({ month: t.ym, total: num(t.total), count: num(t.c) })),
      comparison: {
        poCount:  { current: num(poP.mtd_c), previous: num(poP.lm_c) },
        poValue:  { current: num(poP.mtd_v), previous: num(poP.lm_v) },
        grnValue: { current: num(grnP.mtd_v), previous: num(grnP.lm_v) },
        returns:  { current: num(retP.mtd_c), previous: num(retP.lm_c) },
      },
      financials: {
        poValue:  { mtd: num(poP.mtd_v), lastMonth: num(poP.lm_v), qtd: num(poP.qtd_v), ytd: num(poP.ytd_v) },
        poCount:  { mtd: num(poP.mtd_c), lastMonth: num(poP.lm_c), qtd: num(poP.qtd_c), ytd: num(poP.ytd_c) },
        grnValue: { mtd: num(grnP.mtd_v), lastMonth: num(grnP.lm_v), qtd: num(grnP.qtd_v), ytd: num(grnP.ytd_v) },
        returns:  { mtd: num(retP.mtd_c), lastMonth: num(retP.lm_c), qtd: num(retP.qtd_c), ytd: num(retP.ytd_c) },
      },
      recent,
    },
  });
};

// ─── RFQ / Comparative Matrix Endpoints ─────────────────────────────────────────

exports.getRFQs = async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT r.*, 
        COUNT(DISTINCT ri.id) as item_count, 
        COUNT(DISTINCT rs.vendor_id) as supplier_count 
      FROM rfqs r 
      LEFT JOIN rfq_items ri ON r.id = ri.rfq_id 
      LEFT JOIN rfq_suppliers rs ON r.id = rs.rfq_id 
      GROUP BY r.id 
      ORDER BY r.created_at DESC
    `);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error in getRFQs:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.getRFQById = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows: rfqRows } = await db.query('SELECT * FROM rfqs WHERE id = $1', [id]);
    if (rfqRows.length === 0) {
      return res.status(404).json({ success: false, message: 'RFQ not found.' });
    }

    const { rows: suppliers } = await db.query(`
      SELECT rs.*, v.name as vendor_name, v.contact as vendor_contact
      FROM rfq_suppliers rs
      JOIN vendors v ON rs.vendor_id = v.id
      WHERE rs.rfq_id = $1
      ORDER BY rs.column_order
    `, [id]);

    const { rows: items } = await db.query('SELECT * FROM rfq_items WHERE rfq_id = $1 ORDER BY line_no', [id]);
    
    const { rows: quotes } = await db.query(`
      SELECT rq.* 
      FROM rfq_quotes rq
      JOIN rfq_items ri ON rq.rfq_item_id = ri.id
      WHERE ri.rfq_id = $1
    `, [id]);

    const { rows: awards } = await db.query('SELECT * FROM rfq_awards WHERE rfq_id = $1', [id]);
    const { rows: committee } = await db.query('SELECT * FROM rfq_committee WHERE rfq_id = $1', [id]);

    res.json({
      success: true,
      data: {
        rfq: rfqRows[0],
        suppliers,
        items,
        quotes,
        awards,
        committee
      }
    });
  } catch (error) {
    console.error('Error in getRFQById:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.createRFQ = async (req, res) => {
  try {
    const { title, category, requisitionId, location, notes, invitedVendorIds, items } = req.body;
    if (!title || !Array.isArray(invitedVendorIds) || invitedVendorIds.length === 0 || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'title, invitedVendorIds, and items are required.' });
    }

    const refNo = `RFQ-${Date.now()}`;
    const { rows } = await db.query(`
      INSERT INTO rfqs (reference_no, title, category, requisition_id, location, notes, created_by, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'Draft')
      RETURNING id, reference_no
    `, [refNo, title, category || null, requisitionId || null, location || 'Kigali', notes || '', req.user?.id || null]);

    const rfqId = rows[0].id;

    // Insert suppliers
    for (let i = 0; i < invitedVendorIds.length; i++) {
      await db.query(`
        INSERT INTO rfq_suppliers (rfq_id, vendor_id, column_order, responded)
        VALUES ($1, $2, $3, 0)
      `, [rfqId, invitedVendorIds[i], i]);
    }

    // Insert items
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const { rows: itemRows } = await db.query(`
        INSERT INTO rfq_items (rfq_id, line_no, item_id, item_name, quantity, unit, quantity_label)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `, [
        rfqId, item.line_no || (i + 1), item.item_id || null, 
        item.item_name, item.quantity || null, item.unit || null, item.quantity_label || null
      ]);

      const itemId = itemRows[0].id;

      // Populate default quotes for each supplier (so they exist in comparative matrix)
      const { rows: rfqSups } = await db.query('SELECT id FROM rfq_suppliers WHERE rfq_id = $1', [rfqId]);
      for (const sup of rfqSups) {
        await db.query(`
          INSERT INTO rfq_quotes (rfq_item_id, rfq_supplier_id, unit_price, total_price, no_bid)
          VALUES ($1, $2, NULL, NULL, 0)
        `, [itemId, sup.id]);
      }
    }

    res.json({ success: true, data: { id: rfqId, reference_no: refNo } });
  } catch (error) {
    console.error('Error in createRFQ:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.saveRFQQuotes = async (req, res) => {
  try {
    const { id } = req.params;
    const { quotes, supplierId } = req.body; // quotes = [{ rfq_item_id, unit_price, total_price, no_bid }]
    if (!Array.isArray(quotes)) {
      return res.status(400).json({ success: false, message: 'quotes array is required.' });
    }

    // Lookup supplier record ID for this RFQ + vendor
    const { rows: supRows } = await db.query(
      'SELECT id FROM rfq_suppliers WHERE rfq_id = $1 AND vendor_id = $2',
      [id, supplierId]
    );
    if (supRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Supplier association not found for this RFQ.' });
    }
    const rfqSupplierId = supRows[0].id;

    for (const q of quotes) {
      await db.query(`
        INSERT INTO rfq_quotes (rfq_item_id, rfq_supplier_id, unit_price, total_price, no_bid)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (rfq_item_id, rfq_supplier_id) DO UPDATE SET
          unit_price = EXCLUDED.unit_price,
          total_price = EXCLUDED.total_price,
          no_bid = EXCLUDED.no_bid
      `, [q.rfq_item_id, rfqSupplierId, q.unit_price, q.total_price, q.no_bid ? 1 : 0]);
    }

    // Mark supplier as responded
    await db.query(
      'UPDATE rfq_suppliers SET responded = 1 WHERE id = $1',
      [rfqSupplierId]
    );

    // Update status to Collecting if it was Draft
    await db.query(
      "UPDATE rfqs SET status = 'Collecting' WHERE id = $1 AND status = 'Draft'",
      [id]
    );

    res.json({ success: true, message: 'Quotes saved successfully.' });
  } catch (error) {
    console.error('Error in saveRFQQuotes:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.saveRFQAwards = async (req, res) => {
  try {
    const { id } = req.params;
    const { awards } = req.body; // awards = [{ rfq_item_id, vendor_id, awarded_quote_id, awarded_price, reason, reason_note }]
    if (!Array.isArray(awards)) {
      return res.status(400).json({ success: false, message: 'awards array is required.' });
    }
    // An empty array used to no-op the loop but still flip the RFQ to
    // UnderReview and return success — a silent nothing-saved that later
    // surfaces as "no awards found" at PO generation. Reject it explicitly.
    if (awards.length === 0) {
      return res.status(400).json({ success: false, message: 'No award selections provided — choose a winning vendor for at least one item before saving.' });
    }

    for (const a of awards) {
      await db.query(`
        INSERT INTO rfq_awards (rfq_id, rfq_item_id, vendor_id, awarded_quote_id, awarded_price, reason, reason_note)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (rfq_item_id) DO UPDATE SET
          vendor_id = EXCLUDED.vendor_id,
          awarded_quote_id = EXCLUDED.awarded_quote_id,
          awarded_price = EXCLUDED.awarded_price,
          reason = EXCLUDED.reason,
          reason_note = EXCLUDED.reason_note
      `, [id, a.rfq_item_id, a.vendor_id || null, a.awarded_quote_id || null, a.awarded_price || null, a.reason || 'lowest', a.reason_note || '']);
    }

    // Update status to UnderReview when awards are first populated
    await db.query(
      "UPDATE rfqs SET status = 'UnderReview' WHERE id = $1 AND status IN ('Draft', 'Collecting')",
      [id]
    );

    res.json({ success: true, message: 'Awards saved successfully.' });
  } catch (error) {
    console.error('Error in saveRFQAwards:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.generatePOsFromRFQ = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if RFQ exists and is not already closed
    const { rows: rfqRows } = await db.query('SELECT * FROM rfqs WHERE id = $1', [id]);
    if (rfqRows.length === 0) {
      return res.status(404).json({ success: false, message: 'RFQ not found.' });
    }

    // Get all awards. awarded_price can be NULL (older award rows saved
    // before the price was resolved), so fall back to the linked quote's
    // unit_price. If both are missing or 0, fall back to the catalog last unit price
    // or most recent stock batch price to prevent POs with zero price.
    const { rows: awards } = await db.query(`
      SELECT ra.*, ri.item_name, ri.quantity, ri.unit,
             COALESCE(
               NULLIF(ra.awarded_price, 0),
               NULLIF(rq.unit_price, 0),
               (SELECT last_unit_price FROM procurement_catalog WHERE master_item_id = ri.item_id AND is_active = 1 LIMIT 1),
               (SELECT purchase_price FROM stock_batches WHERE item_id = ri.item_id AND purchase_price IS NOT NULL AND purchase_price > 0 ORDER BY id DESC LIMIT 1),
               0
             ) AS effective_price
      FROM rfq_awards ra
      JOIN rfq_items ri ON ra.rfq_item_id = ri.id
      LEFT JOIN rfq_quotes rq ON ra.awarded_quote_id = rq.id
      WHERE ra.rfq_id = $1 AND ra.vendor_id IS NOT NULL
    `, [id]);

    if (awards.length === 0) {
      return res.status(400).json({ success: false, message: 'No vendor awards found for this RFQ — save award selections (with a winning vendor per item) before generating POs.' });
    }

    // Group items by vendor
    const vendorMap = {};
    for (const a of awards) {
      if (!vendorMap[a.vendor_id]) {
        vendorMap[a.vendor_id] = [];
      }
      vendorMap[a.vendor_id].push(a);
    }

    const createdPOs = [];

    // Create a PO for each vendor
    for (const vendorId of Object.keys(vendorMap)) {
      const items = vendorMap[vendorId];
      const timestamp = Date.now();
      const poNumber = `PO-RFQ-${timestamp}-${vendorId}`;
      const totalAmount = items.reduce((sum, item) => sum + (Number(item.quantity || 1) * Number(item.effective_price || 0)), 0);

      const { rows: poRows } = await db.query(`
        INSERT INTO purchase_orders (po_number, vendor_id, created_by, status, total_amount, notes)
        VALUES ($1, $2, $3, 'Draft', $4, $5)
        RETURNING id, po_number
      `, [poNumber, Number(vendorId), req.user?.id || null, totalAmount, `Generated from Comparative Tender RFQ reference: ${rfqRows[0].reference_no}`]);

      const poId = poRows[0].id;
      createdPOs.push({ id: poId, po_number: poNumber });

      for (const item of items) {
        await db.query(`
          INSERT INTO purchase_order_items (po_id, item_name, quantity, unit_price, unit_of_measure)
          VALUES ($1, $2, $3, $4, $5)
        `, [poId, item.item_name, Number(item.quantity || 1), Number(item.effective_price || 0), item.unit || 'Unit']);

        // Update award record with PO link
        await db.query(`
          UPDATE rfq_awards SET purchase_order_id = $1 WHERE id = $2
        `, [poId, item.id]);
      }
    }

    // Update RFQ status to 'Awarded'
    await db.query("UPDATE rfqs SET status = 'Awarded' WHERE id = $1", [id]);

    res.json({ success: true, message: 'Purchase Orders auto-generated successfully.', data: createdPOs });
  } catch (error) {
    console.error('Error in generatePOsFromRFQ:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.getSupplierPerformance = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Spend stats
    const { rows: spendRows } = await db.query(`
      SELECT 
        COALESCE(SUM(total_amount), 0) as total_spend,
        COUNT(id) as total_pos,
        COALESCE(SUM(CASE WHEN created_at >= strftime('%Y-%m-01', 'now') THEN total_amount ELSE 0 END), 0) as spend_this_month
      FROM purchase_orders 
      WHERE vendor_id = $1
    `, [id]);

    // 2. Average Lead time
    const { rows: leadRows } = await db.query(`
      SELECT 
        AVG(julianday(grn.received_at) - julianday(po.created_at)) as avg_lead_days
      FROM goods_receipt_notes grn
      JOIN purchase_orders po ON grn.purchase_order_id = po.id
      WHERE po.vendor_id = $1
    `, [id]);

    // 3. Quality incidents (check in incident_reports by searching for vendor name in description or names_involved)
    const { rows: vendorRows } = await db.query('SELECT name FROM vendors WHERE id = $1', [id]);
    let qualityIncidents = 0;
    if (vendorRows.length > 0) {
      const vendorName = vendorRows[0].name;
      const { rows: incidentRows } = await db.query(`
        SELECT COUNT(*) as cnt 
        FROM incident_reports 
        WHERE names_involved LIKE $1 OR description LIKE $1 OR department LIKE $1
      `, [`%${vendorName}%`]);
      qualityIncidents = incidentRows[0]?.cnt || 0;
    }

    // 4. Fulfillment rate (comparing PO item quantities vs GRN item quantities received)
    const { rows: fulfillmentRows } = await db.query(`
      SELECT 
        COALESCE(SUM(poi.quantity), 0) as ordered,
        COALESCE(SUM(grni.quantity_received), 0) as received
      FROM purchase_orders po
      JOIN purchase_order_items poi ON po.id = poi.po_id
      LEFT JOIN goods_receipt_notes grn ON po.id = grn.purchase_order_id
      LEFT JOIN goods_receipt_note_items grni ON grn.id = grni.grn_id AND grni.item_name = poi.item_name
      WHERE po.vendor_id = $1
    `, [id]);

    const orderedQty = Number(fulfillmentRows[0]?.ordered || 0);
    const receivedQty = Number(fulfillmentRows[0]?.received || 0);
    const fulfillmentRate = orderedQty > 0 ? Math.min(100, Math.round((receivedQty / orderedQty) * 100)) : 100;

    res.json({
      success: true,
      data: {
        totalSpend: spendRows[0]?.total_spend || 0,
        totalPOs: spendRows[0]?.total_pos || 0,
        spendThisMonth: spendRows[0]?.spend_this_month || 0,
        avgLeadDays: leadRows[0]?.avg_lead_days ? Math.round(leadRows[0].avg_lead_days * 10) / 10 : null,
        qualityIncidents,
        fulfillmentRate
      }
    });
  } catch (error) {
    console.error('Error in getSupplierPerformance:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ─── Vendor Documents ─────────────────────────────────────────────────────────

exports.getVendorDocuments = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await db.query(`
      SELECT vd.*, u.full_name as uploaded_by_name
      FROM vendor_documents vd
      LEFT JOIN users u ON vd.uploaded_by = u.id
      WHERE vd.vendor_id = $1
      ORDER BY vd.created_at DESC
    `, [id]);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error in getVendorDocuments:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.createVendorDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { doc_type, doc_name, file_ref, issued_date, expiry_date, notes } = req.body;
    if (!doc_name || !doc_type) return res.status(400).json({ success: false, message: 'doc_name and doc_type are required.' });
    const { rows } = await db.query(`
      INSERT INTO vendor_documents (vendor_id, doc_type, doc_name, file_ref, issued_date, expiry_date, notes, uploaded_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *
    `, [id, doc_type, doc_name, file_ref||null, issued_date||null, expiry_date||null, notes||null, req.user?.id||null]);
    res.status(201).json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('Error in createVendorDocument:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.deleteVendorDocument = async (req, res) => {
  try {
    const { id, docId } = req.params;
    await db.query('DELETE FROM vendor_documents WHERE id = $1 AND vendor_id = $2', [docId, id]);
    res.json({ success: true, message: 'Document deleted.' });
  } catch (error) {
    console.error('Error in deleteVendorDocument:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ─── Vendor Contracts ─────────────────────────────────────────────────────────

exports.getVendorContracts = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await db.query(`
      SELECT vc.*, u.full_name as created_by_name
      FROM vendor_contracts vc
      LEFT JOIN users u ON vc.created_by = u.id
      WHERE vc.vendor_id = $1
      ORDER BY vc.created_at DESC
    `, [id]);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error in getVendorContracts:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.createVendorContract = async (req, res) => {
  try {
    const { id } = req.params;
    const { contract_no, title, start_date, end_date, contract_value, currency, status, terms, notes } = req.body;
    if (!title || !start_date) return res.status(400).json({ success: false, message: 'title and start_date are required.' });
    const { rows } = await db.query(`
      INSERT INTO vendor_contracts (vendor_id, contract_no, title, start_date, end_date, contract_value, currency, status, terms, notes, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *
    `, [id, contract_no||null, title, start_date, end_date||null, contract_value||0, currency||'RWF', status||'active', terms||null, notes||null, req.user?.id||null]);
    res.status(201).json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('Error in createVendorContract:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.updateVendorContractStatus = async (req, res) => {
  try {
    const { id, contractId } = req.params;
    const { status } = req.body;
    await db.query("UPDATE vendor_contracts SET status=$1, updated_at=(strftime('%Y-%m-%dT%H:%M:%fZ','now')) WHERE id=$2 AND vendor_id=$3", [status, contractId, id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error in updateVendorContractStatus:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ─── Vendor Ratings ───────────────────────────────────────────────────────────

exports.getVendorRatings = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await db.query(`
      SELECT vr.*, u.full_name as rated_by_name, grn.reference_no as grn_ref
      FROM vendor_ratings vr
      LEFT JOIN users u ON vr.rated_by = u.id
      LEFT JOIN goods_receipt_notes grn ON vr.grn_id = grn.id
      WHERE vr.vendor_id = $1 ORDER BY vr.created_at DESC
    `, [id]);
    const { rows: avgs } = await db.query('SELECT category, AVG(rating) as avg_rating, COUNT(*) as count FROM vendor_ratings WHERE vendor_id=$1 GROUP BY category', [id]);
    res.json({ success: true, data: rows, averages: avgs });
  } catch (error) {
    console.error('Error in getVendorRatings:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.createVendorRating = async (req, res) => {
  try {
    const { id } = req.params;
    const { grn_id, rating, category, comment } = req.body;
    if (!rating || rating < 1 || rating > 5) return res.status(400).json({ success: false, message: 'rating must be 1-5.' });
    const { rows } = await db.query(`
      INSERT INTO vendor_ratings (vendor_id, grn_id, rating, category, comment, rated_by)
      VALUES ($1,$2,$3,$4,$5,$6) RETURNING *
    `, [id, grn_id||null, rating, category||'overall', comment||null, req.user?.id||null]);
    res.status(201).json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('Error in createVendorRating:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ─── GRN Inspection ───────────────────────────────────────────────────────────

exports.getGRNInspection = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await db.query(`
      SELECT gi.*, u.full_name as inspected_by_name
      FROM grn_inspection_items gi
      LEFT JOIN users u ON gi.inspected_by = u.id
      WHERE gi.grn_id=$1 ORDER BY gi.id ASC
    `, [id]);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error in getGRNInspection:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.saveGRNInspection = async (req, res) => {
  try {
    const { id } = req.params;
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ success: false, message: 'items array required.' });
    await db.query('DELETE FROM grn_inspection_items WHERE grn_id=$1', [id]);
    for (const item of items) {
      await db.query('INSERT INTO grn_inspection_items (grn_id, grn_item_id, item_name, inspection_pass, rejection_reason, inspected_by) VALUES ($1,$2,$3,$4,$5,$6)',
        [id, item.grn_item_id||null, item.item_name, item.inspection_pass ? 1 : 0, item.rejection_reason||null, req.user?.id||null]);
    }
    res.json({ success: true, message: 'Inspection saved.' });
  } catch (error) {
    console.error('Error in saveGRNInspection:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ─── Purchase Invoices (Accounts Payable) ─────────────────────────────────────

const performThreeWayMatch = async (invoiceId, poId, grnId, invoiceItems) => {
  try {
    const { rows: poItems } = await db.query('SELECT * FROM purchase_order_items WHERE po_id=$1', [poId]);
    const { rows: grnItems } = await db.query('SELECT * FROM goods_receipt_note_items WHERE grn_id=$1', [grnId]);
    let hasDiscrepancy = false;
    for (const invItem of invoiceItems) {
      const poItem = poItems.find(p => p.item_name && invItem.item_name && p.item_name.toLowerCase() === invItem.item_name.toLowerCase());
      const grnItem = grnItems.find(g => g.item_name && invItem.item_name && g.item_name.toLowerCase() === invItem.item_name.toLowerCase());
      const invQty = parseFloat(invItem.quantity)||0;
      const poQty = parseFloat(poItem && poItem.quantity ? poItem.quantity : 0);
      const grnQty = parseFloat(grnItem && grnItem.quantity_received ? grnItem.quantity_received : 0);
      if ((poQty > 0 && Math.abs(invQty - poQty) > 0.01) || (grnQty > 0 && Math.abs(invQty - grnQty) > 0.01)) hasDiscrepancy = true;
      await db.query('UPDATE invoice_line_items SET po_quantity=$1, grn_quantity=$2 WHERE invoice_id=$3 AND item_name=$4',
        [poQty||null, grnQty||null, invoiceId, invItem.item_name]);
    }
    return hasDiscrepancy ? 'discrepancy' : 'matched';
  } catch (e) { console.error('3-way match error:', e.message); return 'unmatched'; }
};

exports.getInvoices = async (req, res) => {
  try {
    const { status, vendor_id } = req.query;
    let sql = `SELECT pi.*, v.name as vendor_name, po.reference_no as po_reference, grn.reference_no as grn_reference,
        sb.full_name as submitted_by_name, ab.full_name as approved_by_name
      FROM purchase_invoices pi
      LEFT JOIN vendors v ON pi.vendor_id=v.id
      LEFT JOIN purchase_orders po ON pi.po_id=po.id
      LEFT JOIN goods_receipt_notes grn ON pi.grn_id=grn.id
      LEFT JOIN users sb ON pi.submitted_by=sb.id
      LEFT JOIN users ab ON pi.approved_by=ab.id`;
    const params = []; const conds = [];
    if (status) { conds.push('pi.status=$' + (params.length+1)); params.push(status); }
    if (vendor_id) { conds.push('pi.vendor_id=$' + (params.length+1)); params.push(vendor_id); }
    if (conds.length) sql += ' WHERE ' + conds.join(' AND ');
    sql += ' ORDER BY pi.created_at DESC';
    const { rows } = await db.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error in getInvoices:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.getInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows: invRows } = await db.query(`
      SELECT pi.*, v.name as vendor_name, po.reference_no as po_reference, grn.reference_no as grn_reference
      FROM purchase_invoices pi
      LEFT JOIN vendors v ON pi.vendor_id=v.id
      LEFT JOIN purchase_orders po ON pi.po_id=po.id
      LEFT JOIN goods_receipt_notes grn ON pi.grn_id=grn.id
      WHERE pi.id=$1
    `, [id]);
    if (!invRows.length) return res.status(404).json({ success: false, message: 'Invoice not found.' });
    const { rows: lineItems } = await db.query('SELECT * FROM invoice_line_items WHERE invoice_id=$1 ORDER BY id ASC', [id]);
    res.json({ success: true, data: Object.assign({}, invRows[0], { line_items: lineItems }) });
  } catch (error) {
    console.error('Error in getInvoiceById:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.createInvoice = async (req, res) => {
  try {
    const { invoice_no, po_id, grn_id, vendor_id, invoice_date, due_date, subtotal, tax_amount, total_amount, currency, payment_terms, notes, items } = req.body;
    if (!vendor_id || !invoice_date || !total_amount) return res.status(400).json({ success: false, message: 'vendor_id, invoice_date, and total_amount are required.' });
    const { rows } = await db.query(
      "INSERT INTO purchase_invoices (invoice_no,po_id,grn_id,vendor_id,invoice_date,due_date,subtotal,tax_amount,total_amount,currency,payment_terms,notes,status,submitted_by,submitted_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'draft',$13,(strftime('%Y-%m-%dT%H:%M:%fZ','now'))) RETURNING *",
      [invoice_no||null, po_id||null, grn_id||null, vendor_id, invoice_date, due_date||null, subtotal||0, tax_amount||0, total_amount, currency||'RWF', payment_terms||null, notes||null, req.user && req.user.id ? req.user.id : null]);
    const invoiceId = rows[0].id;
    if (Array.isArray(items) && items.length) {
      for (const item of items) {
        const qty = parseFloat(item.quantity)||0; const price = parseFloat(item.unit_price)||0;
        await db.query('INSERT INTO invoice_line_items (invoice_id,item_name,quantity,unit_price,total_price) VALUES ($1,$2,$3,$4,$5)',
          [invoiceId, item.item_name, qty, price, qty*price]);
      }
    }
    let matchStatus = 'unmatched';
    if (po_id && grn_id && Array.isArray(items) && items.length) matchStatus = await performThreeWayMatch(invoiceId, po_id, grn_id, items);
    await db.query('UPDATE purchase_invoices SET match_status=$1 WHERE id=$2', [matchStatus, invoiceId]);
    res.status(201).json({ success: true, data: Object.assign({}, rows[0], { match_status: matchStatus }) });
  } catch (error) {
    console.error('Error in createInvoice:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.updateInvoiceStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejection_reason } = req.body;
    const valid = ['draft','submitted','under_review','approved','rejected','paid'];
    if (!valid.includes(status)) return res.status(400).json({ success: false, message: 'Invalid status.' });
    const tsMap = { submitted:'submitted_at', approved:'approved_at', paid:'paid_at', under_review:'reviewed_at' };
    const actorMap = { submitted:'submitted_by', approved:'approved_by', paid:'paid_by', under_review:'reviewed_by' };
    let sql = "UPDATE purchase_invoices SET status=$1, updated_at=(strftime('%Y-%m-%dT%H:%M:%fZ','now'))";
    const params = [status];
    if (rejection_reason) { sql += ',rejection_reason=$' + (params.length+1); params.push(rejection_reason); }
    if (tsMap[status]) sql += "," + tsMap[status] + "=(strftime('%Y-%m-%dT%H:%M:%fZ','now'))";
    if (actorMap[status] && req.user && req.user.id) { sql += ',' + actorMap[status] + '=$' + (params.length+1); params.push(req.user.id); }
    sql += ' WHERE id=$' + (params.length+1); params.push(id);
    await db.query(sql, params);
    res.json({ success: true, message: 'Invoice ' + status + '.' });
  } catch (error) {
    console.error('Error in updateInvoiceStatus:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.getThreeWayMatch = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows: invRows } = await db.query('SELECT * FROM purchase_invoices WHERE id=$1', [id]);
    if (!invRows.length) return res.status(404).json({ success: false, message: 'Invoice not found.' });
    const inv = invRows[0];
    const { rows: lineItems } = await db.query('SELECT * FROM invoice_line_items WHERE invoice_id=$1', [id]);
    let poItems = [], grnItems = [];
    if (inv.po_id) { const r = await db.query('SELECT * FROM purchase_order_items WHERE po_id=$1', [inv.po_id]); poItems = r.rows; }
    if (inv.grn_id) { const r = await db.query('SELECT * FROM goods_receipt_note_items WHERE grn_id=$1', [inv.grn_id]); grnItems = r.rows; }
    const allItems = new Map();
    for (const item of poItems) allItems.set(item.item_name ? item.item_name.toLowerCase() : '', { item_name:item.item_name, po_quantity:item.quantity, po_unit_price:item.unit_price, grn_quantity:null, inv_quantity:null });
    for (const item of grnItems) {
      const k = item.item_name ? item.item_name.toLowerCase() : '';
      if (allItems.has(k)) allItems.get(k).grn_quantity = item.quantity_received;
      else allItems.set(k, { item_name:item.item_name, po_quantity:null, po_unit_price:null, grn_quantity:item.quantity_received, inv_quantity:null });
    }
    for (const item of lineItems) {
      const k = item.item_name ? item.item_name.toLowerCase() : '';
      if (allItems.has(k)) { allItems.get(k).inv_quantity = item.quantity; allItems.get(k).inv_unit_price = item.unit_price; }
      else allItems.set(k, { item_name:item.item_name, po_quantity:null, po_unit_price:null, grn_quantity:null, inv_quantity:item.quantity, inv_unit_price:item.unit_price });
    }
    const matchRows = Array.from(allItems.values()).map(function(r) {
      return Object.assign({}, r, { discrepancy: (r.grn_quantity!==null && r.inv_quantity!==null && Math.abs(r.grn_quantity-r.inv_quantity)>0.01) || (r.po_quantity!==null && r.inv_quantity!==null && Math.abs(r.po_quantity-r.inv_quantity)>0.01) });
    });
    res.json({ success: true, data: { invoice: inv, match_rows: matchRows } });
  } catch (error) {
    console.error('Error in getThreeWayMatch:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ─── Department Budgets ───────────────────────────────────────────────────────

exports.getDepartmentBudgets = async (req, res) => {
  try {
    const { year, month } = req.query;
    let sql = 'SELECT * FROM department_budgets WHERE 1=1';
    const params = [];
    if (year) { sql += ' AND period_year=$' + (params.length+1); params.push(year); }
    if (month) { sql += ' AND period_month=$' + (params.length+1); params.push(month); }
    sql += ' ORDER BY department_name, period_year DESC, period_month DESC';
    const { rows } = await db.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error in getDepartmentBudgets:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.upsertDepartmentBudget = async (req, res) => {
  try {
    const { department_name, period_type, period_year, period_month, period_quarter, budget_amount, currency, department_id } = req.body;
    if (!department_name || !period_year || !budget_amount) return res.status(400).json({ success: false, message: 'department_name, period_year, budget_amount required.' });
    await db.query(
      "INSERT INTO department_budgets (department_id,department_name,period_type,period_year,period_month,period_quarter,budget_amount,currency,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(department_name,period_type,period_year,period_month,period_quarter) DO UPDATE SET budget_amount=EXCLUDED.budget_amount, updated_at=(strftime('%Y-%m-%dT%H:%M:%fZ','now'))",
      [department_id||null, department_name, period_type||'monthly', period_year, period_month||null, period_quarter||null, budget_amount, currency||'RWF', req.user && req.user.id ? req.user.id : null]);
    res.json({ success: true, message: 'Budget saved.' });
  } catch (error) {
    console.error('Error in upsertDepartmentBudget:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.getDepartmentBudgetStatus = async (req, res) => {
  try {
    const { department_name } = req.query;
    const now = new Date(); const year = now.getFullYear(); const month = now.getMonth() + 1;
    const { rows: budgetRows } = await db.query("SELECT budget_amount FROM department_budgets WHERE department_name=$1 AND period_year=$2 AND period_month=$3 AND period_type='monthly'", [department_name, year, month]);
    const budget = Number(budgetRows[0] ? budgetRows[0].budget_amount : 0);
    const { rows: spendRows } = await db.query(
      "SELECT COALESCE(SUM(r.total_amount),0) as spent FROM requisitions r WHERE r.department_name=$1 AND r.status IN ('approved','received') AND strftime('%Y',r.created_at)=$2 AND strftime('%m',r.created_at)=$3",
      [department_name, String(year), String(month).padStart(2,'0')]);
    const spent = Number(spendRows[0] ? spendRows[0].spent : 0);
    res.json({ success: true, data: { budget, spent, remaining: Math.max(0, budget-spent), utilization: budget>0 ? Math.min(100,Math.round((spent/budget)*100)) : 0, year, month } });
  } catch (error) {
    console.error('Error in getDepartmentBudgetStatus:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ─── Procurement Catalog ──────────────────────────────────────────────────────

exports.getCatalog = async (req, res) => {
  try {
    const { category, search } = req.query;
    let sql = 'SELECT pc.*, v.name as preferred_vendor_name FROM procurement_catalog pc LEFT JOIN vendors v ON pc.preferred_vendor=v.id WHERE pc.is_active=1';
    const params = [];
    if (category) { sql += ' AND pc.category=$' + (params.length+1); params.push(category); }
    if (search) { sql += ' AND pc.item_name LIKE $' + (params.length+1); params.push('%' + search + '%'); }
    sql += ' ORDER BY pc.item_name ASC';
    const { rows } = await db.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error in getCatalog:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.createCatalogItem = async (req, res) => {
  try {
    const { item_name, category, sku, unit_of_measure, preferred_vendor, last_unit_price, notes, master_item_id } = req.body;
    if (!item_name) return res.status(400).json({ success: false, message: 'item_name is required.' });
    const { rows } = await db.query('INSERT INTO procurement_catalog (item_name,category,sku,unit_of_measure,preferred_vendor,last_unit_price,notes,master_item_id,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
      [item_name, category||'medical_supplies', sku||null, unit_of_measure||'Unit', preferred_vendor||null, last_unit_price||null, notes||null, master_item_id||null, req.user && req.user.id ? req.user.id : null]);
    res.status(201).json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('Error in createCatalogItem:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.toggleCatalogItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;
    await db.query("UPDATE procurement_catalog SET is_active=$1, updated_at=(strftime('%Y-%m-%dT%H:%M:%fZ','now')) WHERE id=$2", [is_active ? 1 : 0, id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error in toggleCatalogItem:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ─── Analytics ───────────────────────────────────────────────────────────────

exports.getSpendByDepartment = async (req, res) => {
  try {
    const { year } = req.query;
    const filterYear = year || String(new Date().getFullYear());
    const { rows } = await db.query(
      "SELECT COALESCE(r.department_name,'Unknown') as department, COALESCE(SUM(r.total_amount),0) as total_spend, COUNT(*) as total_requisitions, SUM(CASE WHEN r.status='approved' THEN 1 ELSE 0 END) as approved_count, SUM(CASE WHEN r.status='rejected' THEN 1 ELSE 0 END) as rejected_count FROM requisitions r WHERE strftime('%Y',r.created_at)=$1 GROUP BY COALESCE(r.department_name,'Unknown') ORDER BY total_spend DESC",
      [String(filterYear)]);
    const { rows: monthRows } = await db.query(
      "SELECT strftime('%Y-%m',po.created_at) as month, COALESCE(SUM(poi.quantity*poi.unit_price),0) as total FROM purchase_orders po JOIN purchase_order_items poi ON po.id=poi.po_id WHERE strftime('%Y',po.created_at)=$1 AND po.status!='Cancelled' GROUP BY strftime('%Y-%m',po.created_at) ORDER BY month ASC",
      [String(filterYear)]);
    res.json({ success: true, data: { by_department: rows, by_month: monthRows } });
  } catch (error) {
    console.error('Error in getSpendByDepartment:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Department consumption trends (present + past) and a forecast of when each
// department is next expected to raise a requisition. The forecast is derived
// from the historical cadence (average interval between past requisitions),
// with a confidence rating based on how regular that cadence is.
exports.getDepartmentUsageAnalytics = async (req, res) => {
  try {
    const monthsBack = Math.min(Math.max(parseInt(req.query.months || '12', 10) || 12, 3), 36);

    const { rows: reqs } = await db.query(`
      SELECT r.id, r.department_id, d.name AS department_name, r.created_at,
             COALESCE(SUM(ri.requested_quantity), 0) AS total_qty
      FROM requisitions r
      JOIN departments d ON r.department_id = d.id
      LEFT JOIN requisition_items ri ON ri.requisition_id = r.id
      GROUP BY r.id
      ORDER BY r.created_at ASC
    `);

    // Group requisitions per department
    const byDept = {};
    for (const row of reqs) {
      const key = row.department_id;
      if (!byDept[key]) {
        byDept[key] = { department_id: key, department_name: row.department_name, requisitions: [] };
      }
      byDept[key].requisitions.push({ id: row.id, date: row.created_at, qty: Number(row.total_qty) || 0 });
    }

    const now = new Date();
    const MS_PER_DAY = 1000 * 60 * 60 * 24;

    const departments = Object.values(byDept).map((dept) => {
      const list = dept.requisitions;
      const dates = list.map((r) => new Date(r.date)).filter((d) => !isNaN(d)).sort((a, b) => a - b);
      const count = list.length;
      const totalQty = list.reduce((s, r) => s + r.qty, 0);

      // Continuous monthly series for the last N months (present + past)
      const monthly = {};
      for (const r of list) {
        const d = new Date(r.date);
        if (isNaN(d)) continue;
        const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!monthly[ym]) monthly[ym] = { count: 0, qty: 0 };
        monthly[ym].count += 1;
        monthly[ym].qty += r.qty;
      }
      const series = [];
      for (let i = monthsBack - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        series.push({ month: ym, count: monthly[ym]?.count || 0, qty: monthly[ym]?.qty || 0 });
      }

      // Cadence-based forecast
      let avgGapDays = null, stdGapDays = null, nextExpected = null, daysUntilNext = null, confidence = 'insufficient';
      if (dates.length >= 2) {
        const gaps = [];
        for (let i = 1; i < dates.length; i++) gaps.push((dates[i] - dates[i - 1]) / MS_PER_DAY);
        avgGapDays = gaps.reduce((s, g) => s + g, 0) / gaps.length;
        const variance = gaps.reduce((s, g) => s + Math.pow(g - avgGapDays, 2), 0) / gaps.length;
        stdGapDays = Math.sqrt(variance);
        const last = dates[dates.length - 1];
        nextExpected = new Date(last.getTime() + avgGapDays * MS_PER_DAY);
        daysUntilNext = Math.round((nextExpected - now) / MS_PER_DAY);
        // Coefficient of variation → how regular is the cadence
        const cv = avgGapDays > 0 ? stdGapDays / avgGapDays : 1;
        if (gaps.length >= 4 && cv < 0.4) confidence = 'high';
        else if (gaps.length >= 2 && cv < 0.75) confidence = 'medium';
        else confidence = 'low';
      }

      const lastReq = dates.length ? dates[dates.length - 1] : null;

      return {
        department_id: dept.department_id,
        department_name: dept.department_name,
        total_requisitions: count,
        total_quantity: totalQty,
        avg_quantity_per_req: count ? Math.round(totalQty / count) : 0,
        last_requisition: lastReq ? lastReq.toISOString() : null,
        avg_interval_days: avgGapDays !== null ? Math.round(avgGapDays) : null,
        interval_stddev_days: stdGapDays !== null ? Math.round(stdGapDays) : null,
        next_expected_date: nextExpected ? nextExpected.toISOString() : null,
        days_until_next: daysUntilNext,
        overdue: daysUntilNext !== null && daysUntilNext < 0,
        confidence,
        monthly_series: series,
      };
    });

    // Soonest / overdue first; departments with no forecast go last
    departments.sort((a, b) => {
      if (a.days_until_next === null) return 1;
      if (b.days_until_next === null) return -1;
      return a.days_until_next - b.days_until_next;
    });

    res.json({ success: true, data: { departments, months_back: monthsBack, generated_at: now.toISOString() } });
  } catch (error) {
    console.error('Error in getDepartmentUsageAnalytics:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.getSupplierLeaderboard = async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT v.id, v.name, v.contact, COUNT(DISTINCT po.id) as total_pos, COUNT(DISTINCT grn.id) as total_grns, COALESCE(SUM(poi.quantity*poi.unit_price),0) as total_spend, COALESCE(AVG(vr.rating),0) as avg_rating, COUNT(DISTINCT vr.id) as rating_count FROM vendors v LEFT JOIN purchase_orders po ON po.vendor_id=v.id AND po.status!='Cancelled' LEFT JOIN purchase_order_items poi ON poi.po_id=po.id LEFT JOIN goods_receipt_notes grn ON grn.vendor_id=v.id LEFT JOIN vendor_ratings vr ON vr.vendor_id=v.id GROUP BY v.id, v.name, v.contact ORDER BY total_spend DESC");
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error in getSupplierLeaderboard:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.getInvoiceAnalytics = async (req, res) => {
  try {
    const { rows: byStatus } = await db.query('SELECT status, COUNT(*) as count, COALESCE(SUM(total_amount),0) as total FROM purchase_invoices GROUP BY status');
    const { rows: overdue } = await db.query("SELECT COUNT(*) as count, COALESCE(SUM(total_amount),0) as total FROM purchase_invoices WHERE status NOT IN ('paid','rejected') AND due_date < (strftime('%Y-%m-%dT%H:%M:%fZ','now'))");
    const { rows: upcoming } = await db.query("SELECT pi.*, v.name as vendor_name FROM purchase_invoices pi LEFT JOIN vendors v ON pi.vendor_id=v.id WHERE pi.status NOT IN ('paid','rejected') AND pi.due_date>=(strftime('%Y-%m-%dT%H:%M:%fZ','now')) AND pi.due_date<=(strftime('%Y-%m-%dT%H:%M:%fZ','now','+30 days')) ORDER BY pi.due_date ASC LIMIT 10");
    res.json({ success: true, data: { by_status: byStatus, overdue: overdue[0], upcoming_due: upcoming } });
  } catch (error) {
    console.error('Error in getInvoiceAnalytics:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.getExpiringContracts = async (req, res) => {
  try {
    const { rows } = await db.query("SELECT vc.*, v.name as vendor_name FROM vendor_contracts vc LEFT JOIN vendors v ON vc.vendor_id=v.id WHERE vc.status='active' AND vc.end_date IS NOT NULL AND vc.end_date<=(strftime('%Y-%m-%dT%H:%M:%fZ','now','+90 days')) ORDER BY vc.end_date ASC");
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error in getExpiringContracts:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── AI Agent: Auto-Classify Master Reference Items ──────────────────────────
exports.aiClassifyMasterItems = async (req, res) => {
  try {
    const { rows: depts } = await db.query("SELECT id, name FROM departments");
    const { rows: uomsList } = await db.query("SELECT id, name, abbreviation FROM uoms");
    
    const { rows: masterItems } = await db.query(`
      SELECT
        mi.id,
        mi.name,
        mi.unit_of_measure,
        mi.category,
        MAX(sb.id) as batch_id,
        MAX(sb.department_id) as department_id,
        MAX(sb.storage) as storage
      FROM master_inventory mi
      LEFT JOIN stock_batches sb ON mi.id = sb.item_id
      GROUP BY mi.id, mi.name, mi.unit_of_measure, mi.category
      ORDER BY mi.id DESC
    `);

    const suggestions = masterItems.map(item => {
      const nameLower = item.name.toLowerCase();
      const normalizedName = nameLower.replace(/\s+/g, ' ').trim();
      const trainingMatch = itemClassificationTraining[normalizedName] || null;

      // 1. Determine Category
      let category = 'medical_supplies';
      let categoryReason = 'Default fallback category';

      if (trainingMatch && trainingMatch.category) {
        category = trainingMatch.category;
        categoryReason = `Matched verified category from physical inventory records (${trainingMatch.department} log)`;
      } else if (nameLower.includes('inj') || nameLower.includes('amp') || nameLower.includes('vial') || nameLower.includes('tab') || nameLower.includes('cap') || nameLower.includes('tablet') || nameLower.includes('capsule') || nameLower.includes('syrup') || nameLower.includes('suspension') || nameLower.includes('paracetamol') || nameLower.includes('amoxicillin') || nameLower.includes('ceftriaxone') || nameLower.includes('diclofenac') || nameLower.includes('metronidazole') || nameLower.includes('infusion')) {
        category = 'medications';
        categoryReason = "Matches medication keywords (tablet, injection, vial, capsule, etc.)";
      } else if (nameLower.includes('anesthes') || nameLower.includes('propofol') || nameLower.includes('lidocaine') || nameLower.includes('bupivacaine') || nameLower.includes('halothane') || nameLower.includes('ketamine')) {
        category = 'anesthetics';
        categoryReason = "Matches anesthetic keywords (lidocaine, propofol, etc.)";
      } else if (nameLower.includes('antiseptic') || nameLower.includes('spirit') || nameLower.includes('betadine') || nameLower.includes('iodine') || nameLower.includes('chlorhexidine') || nameLower.includes('dettol')) {
        category = 'antiseptics';
        categoryReason = "Matches antiseptic keywords (spirit, iodine, etc.)";
      } else if (nameLower.includes('suture') || nameLower.includes('vicryl') || nameLower.includes('silk') || nameLower.includes('chromic')) {
        category = 'sutures';
        categoryReason = "Matches suture keywords (vicryl, suture, etc.)";
      } else if (nameLower.includes('antidote') || nameLower.includes('atropine') || nameLower.includes('naloxone') || nameLower.includes('charcoal')) {
        category = 'antidotes';
        categoryReason = "Matches antidote keywords (atropine, charcoal, etc.)";
      } else if (nameLower.includes('suppo') || nameLower.includes('pessary') || nameLower.includes('cytotec')) {
        category = 'suppository';
        categoryReason = "Matches suppository keywords (suppo, cytotec, etc.)";
      } else if (nameLower.includes('paper') || nameLower.includes('pen') || nameLower.includes('pencil') || nameLower.includes('file') || nameLower.includes('toner') || nameLower.includes('register') || nameLower.includes('book') || nameLower.includes('envelope')) {
        category = 'stationery';
        categoryReason = "Matches stationery keywords (paper, pen, register, etc.)";
      } else if (nameLower.includes('gloves') || nameLower.includes('syringe') || nameLower.includes('mask') || nameLower.includes('gauze') || nameLower.includes('cotton') || nameLower.includes('bandage') || nameLower.includes('plaster') || nameLower.includes('catheter') || nameLower.includes('tube') || nameLower.includes('cannula')) {
        category = 'consumables';
        categoryReason = "Matches clinical consumables keywords (gloves, syringe, mask, etc.)";
      } else if (nameLower.includes('soap') || nameLower.includes('detergent') || nameLower.includes('broom') || nameLower.includes('mop') || nameLower.includes('cleaning') || nameLower.includes('bleach') || nameLower.includes('disinfectant') || nameLower.includes('cleaner') || nameLower.includes('harpic') || nameLower.includes('sanitizer') || nameLower.includes('housekeeping')) {
        category = 'housekeeping';
        categoryReason = "Matches housekeeping or sanitation keywords";
      } else if (nameLower.includes('food') || nameLower.includes('drink') || nameLower.includes('water') || nameLower.includes('sugar') || nameLower.includes('tea') || nameLower.includes('coffee') || nameLower.includes('milk') || nameLower.includes('juice') || nameLower.includes('soda') || nameLower.includes('bread') || nameLower.includes('cereal') || nameLower.includes('cup') || nameLower.includes('plate') || nameLower.includes('spoon') || nameLower.includes('cafeteria') || nameLower.includes('cafetariat')) {
        category = 'cafetariat';
        categoryReason = "Matches cafeteria food or beverage keywords";
      }

      // 2. Determine Department
      let deptId = null;
      let deptName = 'GENERAL STORE';
      let deptReason = 'Default fallback to General Store';

      const dentalDept = depts.find(d => d.name === 'DENTAL');
      const dentalLabDept = depts.find(d => d.name === 'DENTAL LAB');
      const physioDept = depts.find(d => d.name === 'PHYSIO');
      const nursingDept = depts.find(d => d.name === 'NURSING');
      const laboratoryDept = depts.find(d => d.name === 'LABORATORY');
      const imagingDept = depts.find(d => d.name === 'IMAGING');
      const generalStoreDept = depts.find(d => d.name === 'GENERAL STORE');

      if (trainingMatch) {
        deptName = trainingMatch.department;
        deptId = depts.find(d => d.name === deptName)?.id || null;
        deptReason = `Matched item name against verified physical inventory records for ${deptName}`;
      } else if (nameLower.includes('prosthesis') || nameLower.includes('prosthetic') || nameLower.includes('crown') || nameLower.includes('bridge') || nameLower.includes('acrylic') || nameLower.includes('impression') || nameLower.includes('milling') || nameLower.includes('wax') || nameLower.includes('dental lab')) {
        deptId = dentalLabDept?.id || null;
        deptName = 'DENTAL LAB';
        deptReason = "Matches dental prosthesis or lab keywords";
      } else if (nameLower.includes('dental') || nameLower.includes('composite') || nameLower.includes('denture') || nameLower.includes('molar') || nameLower.includes('gutta') || nameLower.includes('tooth') || nameLower.includes('teeth')) {
        deptId = dentalDept?.id || null;
        deptName = 'DENTAL';
        deptReason = "Matches dental keywords";
      } else if (nameLower.includes('physio') || nameLower.includes('exercise') || nameLower.includes('rehab') || nameLower.includes('tens') || nameLower.includes('therapy') || nameLower.includes('elastic')) {
        deptId = physioDept?.id || null;
        deptName = 'PHYSIO';
        deptReason = "Matches physical therapy keywords";
      } else if (nameLower.includes('lab') || nameLower.includes('reagent') || nameLower.includes('pipette') || nameLower.includes('cuvette') || nameLower.includes('blood') || nameLower.includes('urine') || nameLower.includes('serum') || nameLower.includes('stool')) {
        deptId = laboratoryDept?.id || null;
        deptName = 'LABORATORY';
        deptReason = "Matches laboratory keywords";
      } else if (nameLower.includes('xray') || nameLower.includes('x-ray') || nameLower.includes('ultrasound') || nameLower.includes('mri') || nameLower.includes('ct') || nameLower.includes('film') || nameLower.includes('contrast') || nameLower.includes('imaging')) {
        deptId = imagingDept?.id || null;
        deptName = 'IMAGING';
        deptReason = "Matches radiology/imaging keywords";
      } else if (category === 'medications' || category === 'anesthetics' || category === 'antidotes' || nameLower.includes('syringe') || nameLower.includes('needle') || nameLower.includes('infusion') || nameLower.includes('cannula') || nameLower.includes('catheter')) {
        deptId = nursingDept?.id || null;
        deptName = 'NURSING';
        deptReason = "Matches clinical nursing or medication keywords";
      } else if (category === 'stationery' || category === 'housekeeping' || category === 'cafetariat' || nameLower.includes('soap') || nameLower.includes('detergent') || nameLower.includes('broom') || nameLower.includes('cleaner') || nameLower.includes('tissue') || nameLower.includes('water')) {
        deptId = generalStoreDept?.id || null;
        deptName = 'GENERAL STORE';
        deptReason = "Matches stationery, housekeeping, cafeteria, or general utility keywords";
      } else {
        deptId = generalStoreDept?.id || null;
        deptName = 'GENERAL STORE';
        deptReason = "Default department assignment";
      }

      // 3. Determine Storage
      let storage = 'Medical';
      let storageReason = 'Default for clinical items';
      if (trainingMatch && trainingMatch.storage) {
        storage = trainingMatch.storage;
        storageReason = `Matched verified storage type from physical inventory records (${trainingMatch.department} log)`;
      } else if (category === 'stationery' || category === 'housekeeping' || category === 'cafetariat' || nameLower.includes('cleaning') || nameLower.includes('soap') || nameLower.includes('detergent') || nameLower.includes('broom') || nameLower.includes('register') || nameLower.includes('paper') || nameLower.includes('file')) {
        storage = 'Non-Medical';
        storageReason = "Item classified as stationery, housekeeping, cafeteria, or general facility utility";
      }

      // 4. Determine UOM (Unit of Measure)
      let uom = 'pc';
      let uomReason = 'Default standard abbreviation';

      const findUomAbbr = (abbr) => {
        return uomsList.find(u => u.abbreviation.toLowerCase() === abbr.toLowerCase())?.abbreviation;
      };

      if (nameLower.includes('inj') || nameLower.includes('vial') || nameLower.includes('amp') || nameLower.includes('ampoule')) {
        uom = findUomAbbr('amp') || findUomAbbr('vial') || findUomAbbr('pc') || 'pc';
        uomReason = "Keywords suggest ampoule/vial unit";
      } else if (nameLower.includes('tab') || nameLower.includes('tablet')) {
        uom = findUomAbbr('tab') || findUomAbbr('pc') || 'pc';
        uomReason = "Keywords suggest tablet unit";
      } else if (nameLower.includes('cap') || nameLower.includes('capsule')) {
        uom = findUomAbbr('cap') || findUomAbbr('pc') || 'pc';
        uomReason = "Keywords suggest capsule unit";
      } else if (nameLower.includes('roll') || nameLower.includes('tape')) {
        uom = findUomAbbr('roll') || findUomAbbr('pc') || 'pc';
        uomReason = "Keywords suggest roll unit";
      } else if (nameLower.includes('pair') || nameLower.includes('gloves')) {
        uom = findUomAbbr('pair') || findUomAbbr('pc') || 'pc';
        uomReason = "Keywords suggest pair unit";
      } else if (nameLower.includes('box') || nameLower.includes('bx')) {
        uom = findUomAbbr('bx') || findUomAbbr('box') || 'bx';
        uomReason = "Keywords suggest box unit";
      } else if (nameLower.includes('bottle') || nameLower.includes('bot') || nameLower.includes('syrup')) {
        uom = findUomAbbr('bot') || findUomAbbr('bottle') || 'bot';
        uomReason = "Keywords suggest bottle unit";
      }

      // Calculate confidence score
      let confidence = 0.5;
      if (categoryReason !== 'Default fallback category') confidence += 0.2;
      if (deptReason !== 'Default department assignment') confidence += 0.2;
      if (uomReason !== 'Default standard abbreviation') confidence += 0.1;
      if (trainingMatch) confidence = Math.min(0.98, confidence + 0.3);

      const currentDeptName = depts.find(d => d.id === item.department_id)?.name || 'GENERAL STORE';

      return {
        itemId: item.id,
        name: item.name,
        currentCategory: item.category || 'medical_supplies',
        suggestedCategory: category,
        categoryReason,
        currentDepartmentId: item.department_id,
        currentDepartmentName: currentDeptName,
        suggestedDepartmentId: deptId,
        suggestedDepartmentName: deptName,
        departmentReason: deptReason,
        currentStorage: item.storage || 'Medical',
        suggestedStorage: storage,
        storageReason,
        currentUom: item.unit_of_measure || 'pc',
        suggestedUom: uom,
        uomReason,
        confidence,
        isDifferent: (
          (item.category || 'medical_supplies') !== category ||
          (item.department_id || null) !== deptId ||
          (item.storage || 'Medical') !== storage ||
          (item.unit_of_measure || 'pc') !== uom
        )
      };
    });

    res.json({ success: true, data: suggestions });
  } catch (error) {
    console.error('Error in aiClassifyMasterItems:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.aiApplyMasterItemsClassifications = async (req, res) => {
  try {
    const { suggestions } = req.body;
    if (!suggestions || !Array.isArray(suggestions)) {
      return res.status(400).json({ success: false, message: 'suggestions array is required' });
    }

    const statements = [];

    for (const sugg of suggestions) {
      const { itemId, category, departmentId, storage, uom } = sugg;

      // 1. Update master_inventory
      statements.push({
        sql: "UPDATE master_inventory SET category = $1, unit_of_measure = $2 WHERE id = $3",
        args: [category, uom, itemId]
      });

      // 2. Check if a batch exists in stock_batches
      const { rows: batchRows } = await db.query("SELECT id FROM stock_batches WHERE item_id = $1 LIMIT 1", [itemId]);

      if (batchRows.length > 0) {
        // Update existing batches
        statements.push({
          sql: "UPDATE stock_batches SET department_id = $1, storage = $2 WHERE item_id = $3",
          args: [departmentId, storage, itemId]
        });
      } else {
        // Insert a default sequential batch
        statements.push({
          sql: "INSERT INTO stock_batches (item_id, lot_number, quantity, department_id, storage, created_at) VALUES ($1, '01', 0, $2, $3, CURRENT_TIMESTAMP)",
          args: [itemId, departmentId, storage]
        });
      }
    }

    // Run bulk db batch statements
    await db.batch(statements);

    res.json({ success: true, message: `Successfully updated ${suggestions.length} items using AI suggestions` });
  } catch (error) {
    console.error('Error in aiApplyMasterItemsClassifications:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

