'use strict';
const crypto = require('crypto');
const QRCode = require('qrcode');
const ExcelJS = require('exceljs');
const ClinicalObservation = require('../models/clinicalObservation');
const db = require('../config/db');

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
const INVENTORY_ITEMS = [
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
      `SELECT identification_json, medication_mar_json FROM clinical_observations`
    );

    const aggregates = {};

    observations.forEach(obs => {
      let identification = {};
      let medication_mar = {};

      try {
        identification = typeof obs.identification_json === 'string'
          ? JSON.parse(obs.identification_json)
          : (obs.identification_json || {});
      } catch (e) {}

      try {
        medication_mar = typeof obs.medication_mar_json === 'string'
          ? JSON.parse(obs.medication_mar_json)
          : (obs.medication_mar_json || {});
      } catch (e) {}

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

      const interventions = medication_mar.interventions || [];
      interventions.forEach(interv => {
        const name = (interv.name || '').trim();
        if (!name) return;

        const matchedItem = INVENTORY_ITEMS.find(
          item => item.toLowerCase() === name.toLowerCase()
        );
        if (!matchedItem) return;

        // Each named intervention on the sheet counts as 1 unit consumed.
        // The admin_logs table is a shared sheet-level log (not per-medication),
        // so using its length as a per-drug quantity was incorrect and inflated
        // every medication's count by the total number of administration events.
        const qty = 1;

        // Use || as separator to avoid conflicts with item names containing _
        const key = `${month_year}||${matchedItem}||${day}||${session}`;
        aggregates[key] = (aggregates[key] || 0) + qty;
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
      const consumedCount = aggregates[key];

      statements.push({
        sql: `INSERT INTO nursing_monthly_stock (
          month_year, item_name, day, session, stock_in_hands, consumed, balance, responsible_name, updated_at
        ) VALUES ($1, $2, $3, $4, 0, $5, 0 - $5, 'Clinical Sheet Sync', CURRENT_TIMESTAMP)
        ON CONFLICT(month_year, item_name, day, session) DO UPDATE SET
          consumed = $5,
          balance = nursing_monthly_stock.stock_in_hands - $5,
          updated_at = CURRENT_TIMESTAMP`,
        args: [month_year, item_name, day, session, consumedCount]
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

    const existing = await ClinicalObservation.findByPatientAndQueue(patientId, queue_id, req.user);

    let result;
    if (existing) {
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

      // Restrict modifying verified sheets to Chef Nurses only
      if (existing.status === 'Verified' && req.user.role !== 'chef-nurse') {
        return res.status(403).json({ success: false, message: 'This clinical sheet is already verified and locked.' });
      }

      const statusToSave = req.body.status || existing.status || 'Draft';

      // Only Chef Nurses can verify or keep a clinical sheet in verified status
      if (statusToSave === 'Verified' && req.user.role !== 'chef-nurse') {
        return res.status(403).json({ success: false, message: 'Only a Chef Nurse can verify clinical sheets.' });
      }

      result = await ClinicalObservation.update(patientId, queue_id, { ...req.body, status: statusToSave, isReviewer: req.user.role === 'reviewer' }, req.user);
    } else {
      const statusToSave = req.body.status || 'Draft';

      // Only Chef Nurses can create or verify clinical sheets with Verified status
      if (statusToSave === 'Verified' && req.user.role !== 'chef-nurse') {
        return res.status(403).json({ success: false, message: 'Only a Chef Nurse can verify clinical sheets.' });
      }

      result = await ClinicalObservation.create({ ...req.body, status: statusToSave, patient_id: patientId, isReviewer: req.user.role === 'reviewer' }, req.user.id);
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

// ─── Clinical Observation: Get recent ─────────────────────────────────────────
exports.getRecentObservations = async (req, res) => {
  try {
    const result = await ClinicalObservation.getRecent(req.user.id, req.user.role);
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

    const observation = await ClinicalObservation.findByPatientAndQueue(patientId, queue_id, req.user);
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

    const observation = await ClinicalObservation.findByPatientAndQueue(patientId, queue_id, req.user);
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

    const observation = await ClinicalObservation.findByPatientAndQueue(patientId, queue_id, req.user);
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

// ─── Inventory: Get all stock for a month ─────────────────────────────────────
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
      `SELECT item_name, day, session, stock_in_hands, consumed FROM nursing_monthly_stock WHERE month_year = $1`,
      [month_year]
    );

    const existingMap = {};
    existingRows.forEach(row => {
      const key = `${row.item_name}-${row.day}-${row.session}`;
      existingMap[key] = row;
    });

    const logsToInsert = [];

    const statements = items.map(item => {
      const oldStock = existingMap[`${item.item_name}-${item.day}-${item.session}`]?.stock_in_hands || 0;
      const oldConsumed = existingMap[`${item.item_name}-${item.day}-${item.session}`]?.consumed || 0;
      const newStock = parseInt(item.stock_in_hands, 10) || 0;
      const newConsumed = parseInt(item.consumed, 10) || 0;

      // If stock or consumed has changed, add to our logs list!
      if (oldStock !== newStock || oldConsumed !== newConsumed) {
        logsToInsert.push({
          sql: `INSERT INTO nursing_stock_change_logs (
              month_year, item_name, day, session, old_stock, new_stock, old_consumed, new_consumed, updated_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          args: [
            month_year,
            item.item_name,
            item.day,
            item.session,
            oldStock,
            newStock,
            oldConsumed,
            newConsumed,
            updater
          ]
        });
      }

      return {
        sql: `INSERT INTO nursing_monthly_stock (
            month_year, item_name, day, session, stock_in_hands, consumed, balance, responsible_name, expiration_date, status, category, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)
          ON CONFLICT(month_year, item_name, day, session) DO UPDATE SET
            stock_in_hands = excluded.stock_in_hands,
            consumed = excluded.consumed,
            balance = excluded.balance,
            responsible_name = excluded.responsible_name,
            expiration_date = excluded.expiration_date,
            status = excluded.status,
            category = excluded.category,
            updated_at = CURRENT_TIMESTAMP`,
        args: [
          month_year,
          item.item_name,
          item.day,
          item.session,
          newStock,
          newConsumed,
          parseInt(item.balance, 10) || 0,
          item.responsible_name || '',
          item.expiration_date || '',
          item.status || '',
          item.category || ''
        ]
      };
    });

    await db.batch([...statements, ...logsToInsert]);
    res.json({ success: true, message: 'Inventory saved and audit logs created successfully' });
  } catch (error) {
    console.error('Error in saveInventoryBulk:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ─── Inventory: Get audit change logs ──────────────────────────────────────────
exports.getInventoryChangeLogs = async (req, res) => {
  try {
    const { date, month_year } = req.query;
    let sql = `
      SELECT l.*, COALESCE(u.full_name, l.updated_by) as updated_by 
      FROM nursing_stock_change_logs l
      LEFT JOIN users u ON LOWER(l.updated_by) = LOWER(u.username)
    `;
    let params = [];

    if (date) {
      sql += ' WHERE date(l.updated_at) = $1';
      params.push(date);
    } else if (month_year) {
      sql += ' WHERE l.month_year = $1';
      params.push(month_year);
    }

    sql += ' ORDER BY l.updated_at DESC';

    const { rows } = await db.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error in getInventoryChangeLogs:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ─── Inventory: Return item master list ───────────────────────────────────────
exports.getInventoryItems = (req, res) => {
  res.json({ success: true, data: INVENTORY_ITEMS });
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
    const isPrivileged = ['admin', 'chef-nurse', 'doctor', 'consultant', 'reviewer'].includes(req.user.role);

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
      try { triage = typeof row.triage_json === 'string' ? JSON.parse(row.triage_json) : (row.triage_json || {}); } catch (_) {}
      let identification = {};
      try { identification = typeof row.identification_json === 'string' ? JSON.parse(row.identification_json) : (row.identification_json || {}); } catch (_) {}
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

    monthList.forEach((my) => {
      const sheetName = getMonthLabel(my) || my;

      // Determine if previous month exists in selected months list for inter-sheet linkage
      const [year, month] = my.split('-');
      const daysInMonth = new Date(parseInt(year, 10), parseInt(month, 10), 0).getDate();
      
      const prevDate = new Date(parseInt(year, 10), parseInt(month, 10) - 2, 1);
      const prevYr = prevDate.getFullYear();
      const prevMo = String(prevDate.getMonth() + 1).padStart(2, '0');
      const prevMyStr = `${prevYr}-${prevMo}`;
      
      const hasPrevSheet = monthList.includes(prevMyStr);
      const prevSheetName = hasPrevSheet ? (getMonthLabel(prevMyStr) || prevMyStr).substring(0, 31) : null;

      // Excel limits sheet names to 31 chars
      const worksheet = workbook.addWorksheet(sheetName.substring(0, 31));

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
      
      INVENTORY_ITEMS.forEach((itemName, index) => {
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
          const amStock = amData.stock_in_hands !== undefined ? amData.stock_in_hands : '';
          const amConsumed = amData.consumed !== undefined ? amData.consumed : '';
          const amNurse = amData.responsible_name || '';

          // PM Values
          const pmStock = pmData.stock_in_hands !== undefined ? pmData.stock_in_hands : '';
          const pmConsumed = pmData.consumed !== undefined ? pmData.consumed : '';
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
                result: amStock !== '' ? Number(amStock) : 0 
              };
            } else {
              row.getCell(startColIdx).value = amStock !== '' ? Number(amStock) : '';
            }
          } else {
            // Intra-sheet linkage to previous day's PM Balance (colLetter(startColIdx - 3))
            const prevPmBalRef = `${colLetter(startColIdx - 3)}${rowIndex}`;
            row.getCell(startColIdx).value = {
              formula: prevPmBalRef,
              result: amStock !== '' ? Number(amStock) : 0
            };
          }

          // AM Consumed
          row.getCell(startColIdx + 1).value = amConsumed !== '' ? Number(amConsumed) : '';

          // AM Balance Formula (Stock - Consumed)
          const stockAmRef = `${colLetter(startColIdx)}${rowIndex}`;
          const consAmRef = `${colLetter(startColIdx + 1)}${rowIndex}`;
          row.getCell(startColIdx + 2).value = { formula: `${stockAmRef}-${consAmRef}` };

          row.getCell(startColIdx + 3).value = amNurse;

          // PM Stock: carried from same day's AM Balance
          const amBalRef = `${colLetter(startColIdx + 2)}${rowIndex}`;
          row.getCell(startColIdx + 4).value = {
            formula: amBalRef,
            result: pmStock !== '' ? Number(pmStock) : 0
          };

          // PM Consumed
          row.getCell(startColIdx + 5).value = pmConsumed !== '' ? Number(pmConsumed) : '';

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
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="Clinical_Stock_Ledger.xlsx"');

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Error in exportInventoryExcel:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// --- New Stock Management Relational Controllers ---

exports.getmasterInventory = async (req, res) => {
  try {
    // Auto-seed master_inventory from INVENTORY_ITEMS if it is empty
    const { rows: checkCount } = await db.query("SELECT COUNT(*) as count FROM master_inventory");
    if (checkCount[0].count === 0) {
      console.log('🌱 Auto-seeding master_inventory with default clinical items...');
      for (const item of INVENTORY_ITEMS) {
        let category = 'medical_supplies';
        const lower = item.toLowerCase();
        if (lower.includes('mg') || lower.includes('1g') || lower.includes('paracetamol') || lower.includes('adrenaline') || lower.includes('atropine') || lower.includes('fentanyl') || lower.includes('morphine')) {
          category = 'medications';
        } else if (lower.includes('bupivacaine') || lower.includes('lidocaine') || lower.includes('propofol') || lower.includes('ketamine')) {
          category = 'anesthetics';
        } else if (lower.includes('alcohol') || lower.includes('povidone') || lower.includes('eau')) {
          category = 'antiseptics';
        } else if (lower.includes('nylon') || lower.includes('vicryl') || lower.includes('polyglactin') || lower.includes('polypropylene')) {
          category = 'sutures';
        } else if (lower.includes('naloxone')) {
          category = 'antidotes';
        }
        await db.query(
          "INSERT OR IGNORE INTO master_inventory (name, sku, unit_of_measure, category) VALUES ($1, $2, $3, $4)",
          [item, 'SKU-' + item.substring(0, 5).toUpperCase().replace(/\s/g, ''), 'Unit', category]
        );
      }
    }

    const { rows } = await db.query(`
      SELECT 
        mi.id,
        mi.name, 
        mi.sku, 
        mi.unit_of_measure, 
        mi.category,
        sb.id as batch_id,
        sb.batch_number,
        sb.expiry_date,
        sb.created_at as purchase_time,
        sb.purchase_price as price,
        COALESCE(ds.quantity, sb.quantity, 0) as quantity,
        ds.id as dept_stock_id,
        d.name as department,
        d.id as department_id,
        v.name as vendor
      FROM master_inventory mi
      LEFT JOIN stock_batches sb ON mi.id = sb.item_id
      LEFT JOIN department_stock ds ON sb.id = ds.batch_id
      LEFT JOIN departments d ON ds.department_id = d.id
      LEFT JOIN vendors v ON sb.vendor_id = v.id
      ORDER BY mi.id DESC
    `);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error in getmasterInventory:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
// Helper to auto-generate SKU: lc-INITIALS-BATCH-DEPT-0001
const generateSku = async (name, batch_number, department_id, vendor_id = null, excludeItemId = null) => {
  const itemInitials = (name || 'ITM').substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, '') || 'ITM';
  const batchStr = batch_number ? batch_number : 'XXXX';

  // Resolve department initials
  let deptInitials = 'XXX';
  if (department_id) {
    try {
      const { rows } = await db.query("SELECT name FROM departments WHERE id = $1", [department_id]);
      if (rows.length > 0) {
        deptInitials = rows[0].name.substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, '') || 'DEP';
      }
    } catch (e) {
      console.error("Error fetching department for SKU", e);
    }
  }

  // Count existing items in same dept + vendor group to get next sequence number
  let seq = 1;
  try {
    let countSql, countParams;
    if (vendor_id) {
      countSql = `
        SELECT COUNT(DISTINCT mi.id) as cnt
        FROM master_inventory mi
        LEFT JOIN stock_batches sb ON mi.id = sb.item_id
        LEFT JOIN department_stock ds ON sb.id = ds.batch_id
        WHERE ds.department_id = $1 AND sb.vendor_id = $2
        ${excludeItemId ? 'AND mi.id != $3' : ''}
      `;
      countParams = excludeItemId ? [department_id, vendor_id, excludeItemId] : [department_id, vendor_id];
    } else {
      countSql = `
        SELECT COUNT(DISTINCT mi.id) as cnt
        FROM master_inventory mi
        LEFT JOIN stock_batches sb ON mi.id = sb.item_id
        LEFT JOIN department_stock ds ON sb.id = ds.batch_id
        WHERE ds.department_id = $1
        ${excludeItemId ? 'AND mi.id != $2' : ''}
      `;
      countParams = excludeItemId ? [department_id, excludeItemId] : [department_id];
    }
    if (department_id) {
      const { rows: countRows } = await db.query(countSql, countParams);
      seq = (Number(countRows[0]?.cnt) || 0) + 1;
    }
  } catch (e) {
    console.error("Error calculating SKU sequence", e);
  }

  const seqStr = String(seq).padStart(4, '0');
  return `lc-${itemInitials}-${batchStr}-${deptInitials}-${seqStr}`;
};
exports.createmasterInventory = async (req, res) => {
  try {
    const items = Array.isArray(req.body) ? req.body : (req.body.items || [req.body]);
    
    for (const item of items) {
      const { name, unit_of_measure, category, batch_number, expiry_date, purchase_time, department_id, quantity, price, vendor_id } = item;
      let { sku } = item;
      
      sku = await generateSku(name, batch_number, department_id, vendor_id || null);
      
      // Insert into master_inventory
      const { rows: itemRows } = await db.query(
        "INSERT INTO master_inventory (name, sku, unit_of_measure, category) VALUES ($1, $2, $3, $4) RETURNING id",
        [name, sku, unit_of_measure, category]
      );
      const itemId = itemRows[0].id;
      
      // If batch info provided, insert into stock_batches
      if (batch_number || price || quantity || expiry_date) {
         const { rows: batchRows } = await db.query(
           "INSERT INTO stock_batches (item_id, vendor_id, batch_number, expiry_date, purchase_price, quantity, created_at) VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, CURRENT_TIMESTAMP)) RETURNING id",
           [itemId, vendor_id || null, batch_number || null, expiry_date || null, price || 0, quantity || 0, purchase_time || null]
         );
         const batchId = batchRows[0].id;
         
         if (department_id) {
            await db.query(
              "INSERT INTO department_stock (department_id, item_id, batch_id, quantity) VALUES ($1, $2, $3, $4)",
              [department_id, itemId, batchId, quantity || 0]
            );
         }
      }
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
      name, unit_of_measure, category, 
      batch_id, batch_number, expiry_date, purchase_time, price, 
      dept_stock_id, department_id, quantity, vendor_id
    } = req.body;
    let { sku } = req.body;
    
    sku = await generateSku(name, batch_number, department_id, vendor_id || null, id);
    
    await db.query(
      "UPDATE master_inventory SET name = $1, sku = $2, unit_of_measure = $3, category = $4 WHERE id = $5",
      [name, sku, unit_of_measure, category, id]
    );
    
    if (batch_id) {
      await db.query(
        "UPDATE stock_batches SET batch_number = $1, expiry_date = $2, purchase_price = $3, quantity = $4, created_at = COALESCE($5, created_at) WHERE id = $6",
        [batch_number || null, expiry_date || null, price || 0, quantity || 0, purchase_time || null, batch_id]
      );
    }
    
    if (dept_stock_id) {
      await db.query(
        "UPDATE department_stock SET department_id = $1, quantity = $2 WHERE id = $3",
        [department_id || null, quantity || 0, dept_stock_id]
      );
    } else if (department_id && batch_id) {
      // Create new department stock link if it was missing
      await db.query(
        "INSERT INTO department_stock (department_id, item_id, batch_id, quantity) VALUES ($1, $2, $3, $4)",
        [department_id, id, batch_id, quantity || 0]
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
    // Auto-seed a dummy pending requisition if none exist
    const { rows: checkCount } = await db.query("SELECT COUNT(*) as count FROM requisitions");
    if (checkCount[0].count === 0) {
      console.log('🌱 Auto-seeding a dummy pending requisition...');
      const { rows: depts } = await db.query("SELECT id FROM departments LIMIT 1");
      const deptId = depts[0]?.id || 1;
      
      const { rows: items } = await db.query("SELECT id FROM master_inventory LIMIT 3");
      
      if (items.length > 0) {
        const { rows: newReq } = await db.query(
          "INSERT INTO requisitions (department_id, urgency, status) VALUES ($1, 'High', 'Pending') RETURNING id",
          [deptId]
        );
        const reqId = newReq[0].id;
        
        for (const item of items) {
          await db.query(
            "INSERT INTO requisition_items (requisition_id, item_id, requested_quantity) VALUES ($1, $2, 100)",
            [reqId, item.id]
          );
        }
      }
    }

    const { rows } = await db.query(`
      SELECT r.*, d.name as department_name, COUNT(ri.id) as items_count
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
      SELECT ri.*, mi.name as item_name, mi.unit_of_measure, COALESCE(SUM(sb.quantity), 0) as central_stock
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

exports.approveRequisition = async (req, res) => {
  try {
    const { id } = req.params;
    const { items: approvedItems } = req.body;
    
    // Update status to 'Approved'
    await db.query("UPDATE requisitions SET status = 'Approved', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [id]);
    
    // Auto fulfill by transferring items to department stock
    const { rows: items } = await db.query("SELECT * FROM requisition_items WHERE requisition_id = $1", [id]);
    const { rows: reqData } = await db.query("SELECT department_id FROM requisitions WHERE id = $1", [id]);
    const deptId = reqData[0]?.department_id;
    
    if (deptId && items.length > 0) {
      for (const item of items) {
        // Determine approved quantity
        let approvedQty = item.requested_quantity; // Default to full requested quantity
        if (approvedItems && Array.isArray(approvedItems)) {
          const match = approvedItems.find(ai => 
            (ai.id && Number(ai.id) === Number(item.id)) || 
            (ai.item_id && Number(ai.item_id) === Number(item.item_id))
          );
          if (match && match.approved_quantity !== undefined) {
            approvedQty = Math.max(0, Number(match.approved_quantity));
          }
        }

        // Clamp approvedQty to available central stock level of this item
        const { rows: stockCount } = await db.query(
          "SELECT COALESCE(SUM(quantity), 0) as total_stock FROM stock_batches WHERE item_id = $1",
          [item.item_id]
        );
        const totalCentralStock = Number(stockCount[0]?.total_stock || 0);
        approvedQty = Math.min(approvedQty, totalCentralStock);

        // Only transfer and deduct if approvedQty > 0
        if (approvedQty > 0) {
          // Find a batch for this item to deduct from
          const { rows: batchData } = await db.query(
            "SELECT id, quantity FROM stock_batches WHERE item_id = $1 AND quantity >= $2 ORDER BY expiry_date ASC LIMIT 1",
            [item.item_id, approvedQty]
          );
          let batch = batchData[0];
          
          if (!batch) {
            // Fallback: search for first batch of this item even if it doesn't have enough quantity
            const { rows: anyBatchData } = await db.query(
              "SELECT id, quantity FROM stock_batches WHERE item_id = $1 ORDER BY expiry_date ASC LIMIT 1",
              [item.item_id]
            );
            batch = anyBatchData[0];
          }

          const batchId = batch ? batch.id : null;
          
          if (batch) {
            // Deduct from central store batch (clamp to batch quantity so it doesn't go negative)
            const deductQty = Math.min(approvedQty, batch.quantity);
            await db.query("UPDATE stock_batches SET quantity = quantity - $1 WHERE id = $2", [deductQty, batch.id]);
          }
          
          // Upsert into department stock
          await db.query(`
            INSERT INTO department_stock (department_id, item_id, batch_id, quantity)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT(department_id, item_id, batch_id) DO UPDATE SET
              quantity = department_stock.quantity + $4
          `, [deptId, item.item_id, batchId, approvedQty]);
        }
        
        // Mark items as approved in the requisition details
        await db.query("UPDATE requisition_items SET approved_quantity = $1 WHERE id = $2", [approvedQty, item.id]);
      }
    }

    res.json({ success: true, message: 'Requisition approved and stock transferred successfully' });
  } catch (error) {
    console.error('Error in approveRequisition:', error);
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
        const sku = 'SKU-' + name.substring(0, 5).toUpperCase().replace(/\s/g, '');
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
      return res.json({ success: true, message: 'No department stock found in Central Store for NURSING.', updatedCount: 0 });
    }

    const statements = [];
    for (const stock of deptStocks) {
      statements.push({
        sql: `INSERT INTO nursing_monthly_stock (
          month_year, item_name, day, session, stock_in_hands, consumed, balance, responsible_name, updated_at
        ) VALUES ($1, $2, $3, $4, $5, 0, $5, 'Central Store Sync', CURRENT_TIMESTAMP)
        ON CONFLICT(month_year, item_name, day, session) DO UPDATE SET
          stock_in_hands = $5,
          balance = $5 - consumed,
          updated_at = CURRENT_TIMESTAMP`,
        args: [month_year, stock.item_name, day, session, stock.total_qty]
      });
    }

    await db.batch(statements);

    res.json({ success: true, message: `Successfully synchronized ${deptStocks.length} stock items with Central Store Hub!`, updatedCount: deptStocks.length });
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

    // Notify Stock Managers & Admins
    const Notification = require('../models/notification');
    const { rows: managers } = await db.query(`
      SELECT u.id FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE r.name IN ('stock-manager', 'stock_manager', 'admin')
    `);
    for (const mgr of managers) {
      try {
        await Notification.create({
          userId: mgr.id,
          title: 'New Supplier Stock Submission',
          message: `${supplierName} has uploaded a new stock delivery of ${items.length} items.`,
          type: 'info',
          link: '/?tab=supplier-portal'
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
        const sku = item.sku || await generateSku(item.name, item.batch_number, centralDeptId, vendorId);
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


