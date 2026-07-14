'use strict';
const db = require('../config/db');
const { logAction } = require('../middleware/audit');

// Accession number helper: L-YYMMDD-XXXX
const generateAccession = () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '').slice(2);
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `L-${dateStr}-${rand}`;
};

// 1. List lab orders
exports.listOrders = async (req, res, next) => {
  try {
    const { status, patient_id } = req.query;
    let query = 'SELECT * FROM lab_orders';
    const params = [];
    const conditions = [];

    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }
    if (patient_id) {
      conditions.push('patient_id = ?');
      params.push(patient_id);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY created_at DESC';

    const { rows } = await db.query(query, params);
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

// 2. Register a new specimen / order
exports.registerSpecimen = async (req, res, next) => {
  try {
    const { patient_id, patient_name, patient_age, patient_gender, referring_provider, specimen_type, specimen_barcode, test_name, priority, notes } = req.body;
    if (!patient_id || !specimen_type || !specimen_barcode) {
      return res.status(400).json({ success: false, message: 'patient_id, specimen_type and specimen_barcode are required.' });
    }

    const accession = generateAccession();
    
    // Insert order
    const result = await db.query(
      `INSERT INTO lab_orders (accession_number, patient_id, patient_name, patient_age, patient_gender, referring_provider, specimen_type, specimen_barcode, priority, notes, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Collected', ?)`,
      [accession, patient_id, patient_name, patient_age, patient_gender, referring_provider, specimen_type, specimen_barcode, priority || 'routine', notes, req.user?.id]
    );

    // Get inserted order ID
    const { rows: inserted } = await db.query('SELECT id FROM lab_orders WHERE accession_number = ?', [accession]);
    const orderId = inserted[0]?.id;

    if (!orderId) {
      return res.status(500).json({ success: false, message: 'Failed to create lab order.' });
    }

    // Auto-create standard test parameters depending on the test name
    let parameters = [];
    const tName = String(test_name || '').toLowerCase();
    if (tName.includes('blood count') || tName.includes('cbc') || tName.includes('fbc')) {
      parameters = [
        { name: 'Hemoglobin', unit: 'g/dL', range: '13.5 - 17.5' },
        { name: 'White Blood Cell (WBC)', unit: '10^9/L', range: '4.0 - 11.0' },
        { name: 'Platelets', unit: '10^9/L', range: '150 - 450' },
        { name: 'Red Blood Cell (RBC)', unit: '10^12/L', range: '4.5 - 5.9' },
      ];
    } else if (tName.includes('liver') || tName.includes('lft')) {
      parameters = [
        { name: 'ALT (Alanine Aminotransferase)', unit: 'U/L', range: '7 - 56' },
        { name: 'AST (Aspartate Aminotransferase)', unit: 'U/L', range: '10 - 40' },
        { name: 'ALP (Alkaline Phosphatase)', unit: 'U/L', range: '44 - 147' },
        { name: 'Total Bilirubin', unit: 'mg/dL', range: '0.2 - 1.2' },
      ];
    } else if (tName.includes('renal') || tName.includes('kidney') || tName.includes('rft')) {
      parameters = [
        { name: 'Urea', unit: 'mg/dL', range: '7 - 20' },
        { name: 'Creatinine', unit: 'mg/dL', range: '0.6 - 1.2' },
        { name: 'Sodium', unit: 'mEq/L', range: '135 - 145' },
        { name: 'Potassium', unit: 'mEq/L', range: '3.5 - 5.0' },
      ];
    } else {
      parameters = [
        { name: 'General Screening Result', unit: '—', range: 'Normal' }
      ];
    }

    for (const p of parameters) {
      await db.query(
        'INSERT INTO lab_results (order_id, parameter_name, reference_range, unit) VALUES (?, ?, ?, ?)',
        [orderId, p.name, p.range, p.unit]
      );
    }

    await logAction(req, 'LAB_REGISTER_SPECIMEN', 'lab_orders', orderId, { accession, patient_id, barcode: specimen_barcode });
    
    res.status(201).json({ success: true, message: 'Specimen registered.', data: { id: orderId, accession_number: accession } });
  } catch (err) { next(err); }
};

// 3. Get order details + parameters
exports.getOrderDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows: orderRows } = await db.query('SELECT * FROM lab_orders WHERE id = ?', [id]);
    if (orderRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Lab order not found.' });
    }
    
    const { rows: resultRows } = await db.query('SELECT * FROM lab_results WHERE order_id = ?', [id]);
    
    res.json({
      success: true,
      data: {
        order: orderRows[0],
        results: resultRows
      }
    });
  } catch (err) { next(err); }
};

// 4. Save results (technician entered values)
exports.saveResults = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { results } = req.body;
    
    if (!Array.isArray(results)) {
      return res.status(400).json({ success: false, message: 'results array is required.' });
    }

    for (const r of results) {
      await db.query(
        'UPDATE lab_results SET parameter_value = ?, is_abnormal = ?, remarks = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND order_id = ?',
        [r.parameter_value, r.is_abnormal ? 1 : 0, r.remarks || null, r.id, id]
      );
    }

    await db.query('UPDATE lab_orders SET status = \'Processing\', updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
    await logAction(req, 'LAB_SAVE_RESULTS', 'lab_orders', id, {});

    res.json({ success: true, message: 'Results saved.' });
  } catch (err) { next(err); }
};

// 5. Verify / complete order
exports.verifyOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const { rows: results } = await db.query('SELECT id, parameter_value FROM lab_results WHERE order_id = ?', [id]);
    if (results.length === 0) {
      return res.status(400).json({ success: false, message: 'No parameters configured for this order.' });
    }

    const emptyParam = results.find(r => !r.parameter_value);
    if (emptyParam) {
      return res.status(400).json({ success: false, message: 'Please enter values for all parameters before verifying.' });
    }

    await db.query(
      `UPDATE lab_orders 
       SET status = 'Completed', updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`, 
      [id]
    );

    await logAction(req, 'LAB_VERIFY_ORDER', 'lab_orders', id, {});
    res.json({ success: true, message: 'Lab order verified and completed.' });
  } catch (err) { next(err); }
};
