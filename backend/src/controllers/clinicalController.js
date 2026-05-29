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

// ─── Inventory Item Master List ───────────────────────────────────────────────
const INVENTORY_ITEMS = [
  "Dextrose 50%", "Dextrose 500mg", "Paracetamol IV 1g", "Furosemide", "Adrenaline 1mg",
  "Dexamethasone 8mg", "Dexamethasone 4mg", "Ceftriaxone 1g", "Metronidazole 1g",
  "Tramadol 100mg", "Diclofenac 75mg", "Esomeprazole 40mg", "Normal saline 500mL",
  "Ringer lactate 500mL", "oxytocin inj", "Propofol", "Fentanyl", "ketamine",
  "Pethidine", "MORPHINE", "Midazolam", "Nalaxoan", "Diazepam", "Buscopan 20mg",
  "Marcaine%0.5", "Atropine", "Lidocaine", "Hydrocortisone 100mg", "Phenytoine 250mg",
  "Metoclopramide", "Hydralazine 20-25mg/ml",
  "Paracetamol 500mg ces", "Paracetamol suppo 250mg", "Paracetamol suppo 125mg",
  "Emitino 4mg", "Vitamine B complex", "Diclofenac suppo 100mg", "Dicynone",
  "Pause 500mg", "chlorpromazine 100mg", "cytotec", "Salbutamol 2.5mg",
  "Giving set", "Papsmear", "Vaginal swab", "Povidone iodine solution", "Eaux oxygenee",
  "vaseline gauze", "Gauze swab", "vicryl 5/O", "vicryl 4/O", "Vicryl 3/0", "Vicryl 2/o",
  "Ethilon 2/0", "Ethilon 3/0", "Ethilon 4/0", "Ethilon 5/0", "Ethilon 6/0", "monocryl 6/0",
  "surgical blades N23", "Surgical blades N21", "surgical bladeN15", "surgical blade N12",
  "crepes bandage 7.5cm", "Crepe bandage 10cm", "crepe bandage 15cm", "Aquabloc 15×10", "Aquabloc 10×10",
  "water for injection", "Syringe 2ml", "syringe 5ml", "syringe 10ml", "syringe 20ml",
  "needle 23", "needle 21", "needle 18",
  "Urine drainage bag", "Foley balloon catheter fr 10", "Foley balloon catheter fr 12",
  "Foley balloon catheter fr 16", "Foley balloon catheter fr 18", "Foley balloon catheter fr 20",
  "catheter G20", "Iv catheter G22", "Iv catheter G24", "Iv catheter G16", "Iv catheter G18",
  "sterile gloves no 8CM", "sterile gloves 8", "sterile gloves 7.5", "proper gloves",
  "neb mask adult", "Neb mask ped",
  "IUD MIRENA", "CONDOM", "SAYANA", "JADELLE", "MICROGYN"
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

    const statements = items.map(item => ({
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
    }));

    await db.batch(statements);
    res.json({ success: true, message: 'Inventory saved successfully' });
  } catch (error) {
    console.error('Error in saveInventoryBulk:', error);
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
        { header: 'ITEMS MASTER', key: 'item_name', width: 28 },
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
      worksheet.getCell('A3').value = "ITEMS MASTER LIST";
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

