'use strict';
const db = require('../config/db');
const { logAction } = require('../middleware/audit');

// Accession number helper: L-YYMMDD-XXXX
const generateAccession = () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '').slice(2);
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `L-${dateStr}-${rand}`;
};

// 1. List lab orders with computed TAT and lifecycle phase
exports.listOrders = async (req, res, next) => {
  try {
    const { status, phase, stage, patient_id, urgency } = req.query;
    let query = 'SELECT * FROM lab_orders';
    const params = [];
    const conditions = [];

    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }
    if (phase) {
      conditions.push('phase = ?');
      params.push(phase);
    }
    if (stage) {
      conditions.push('stage = ?');
      params.push(stage);
    }
    if (urgency) {
      conditions.push('urgency = ?');
      params.push(urgency);
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

    // Compute active TAT countdown for each order
    const now = new Date();
    const formatted = rows.map(o => {
      let tatRemainingMins = null;
      let isOverdue = false;
      if (o.tat_deadline) {
        const deadline = new Date(o.tat_deadline);
        const diffMs = deadline - now;
        tatRemainingMins = Math.round(diffMs / (1000 * 60));
        if (tatRemainingMins < 0 && o.stage !== 'Notified' && o.stage !== 'Verified' && o.stage !== 'Reported') {
          isOverdue = true;
        }
      }
      return {
        ...o,
        tat_remaining_mins: tatRemainingMins,
        is_overdue: isOverdue
      };
    });

    res.json({ success: true, data: formatted });
  } catch (err) { next(err); }
};

// 2. Register a new specimen / CPOE order
exports.registerSpecimen = async (req, res, next) => {
  try {
    const { 
      patient_id, 
      patient_name, 
      patient_age, 
      patient_gender, 
      referring_provider, 
      specimen_type, 
      specimen_barcode, 
      test_name, 
      urgency, 
      tube_type,
      volume_ml,
      notes 
    } = req.body;

    if (!patient_id || !specimen_type || !specimen_barcode) {
      return res.status(400).json({ success: false, message: 'patient_id, specimen_type and specimen_barcode are required.' });
    }

    const accession = generateAccession();
    const orderUrgency = (urgency || 'Routine').toUpperCase() === 'STAT' ? 'STAT' : (urgency || 'Routine');
    
    // Calculate TAT Deadline based on operational benchmarks
    // STAT: 45 min | Routine: 4 hours (240 min) | Specialized: 24 hours (1440 min)
    let tatMinutes = 240; // default routine 4 hours
    if (orderUrgency === 'STAT') tatMinutes = 45;
    else if (orderUrgency === 'Specialized') tatMinutes = 1440;

    const tatDeadline = new Date(Date.now() + tatMinutes * 60 * 1000).toISOString();

    // Map order of draw step based on tube type
    // 1: Light Blue (Citrate) -> 2: Gold/Red (SST) -> 3: Green (Heparin) -> 4: Purple (EDTA) -> 5: Grey (Fluoride) -> 6: Yellow (Urine)
    let drawStep = 4; // Purple EDTA default
    const tType = String(tube_type || '').toLowerCase();
    if (tType.includes('blue') || tType.includes('citrate')) drawStep = 1;
    else if (tType.includes('gold') || tType.includes('sst') || tType.includes('red')) drawStep = 2;
    else if (tType.includes('green') || tType.includes('heparin')) drawStep = 3;
    else if (tType.includes('purple') || tType.includes('edta')) drawStep = 4;
    else if (tType.includes('grey') || tType.includes('fluoride')) drawStep = 5;
    else if (tType.includes('urine') || tType.includes('yellow')) drawStep = 6;

    // Insert order into lab_orders
    await db.query(
      `INSERT INTO lab_orders (
        accession_number, patient_id, patient_name, patient_age, patient_gender, 
        referring_provider, specimen_type, specimen_barcode, priority, urgency, 
        phase, stage, tat_deadline, tube_type, order_of_draw_step, volume_ml, 
        notes, status, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pre-analytical', 'Collected', ?, ?, ?, ?, ?, 'Collected', ?)`,
      [
        accession, patient_id, patient_name, patient_age, patient_gender, 
        referring_provider, specimen_type, specimen_barcode, orderUrgency.toLowerCase(), orderUrgency,
        tatDeadline, tube_type || 'Purple EDTA', drawStep, volume_ml || 3.0,
        notes, req.user?.id
      ]
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
    } else if (tName.includes('renal') || tName.includes('kidney') || tName.includes('rft') || tName.includes('electrolyte')) {
      parameters = [
        { name: 'Urea', unit: 'mg/dL', range: '7 - 20' },
        { name: 'Creatinine', unit: 'mg/dL', range: '0.6 - 1.2' },
        { name: 'Sodium', unit: 'mEq/L', range: '135 - 145' },
        { name: 'Potassium', unit: 'mEq/L', range: '3.5 - 5.0' },
      ];
    } else if (tName.includes('troponin') || tName.includes('cardiac')) {
      parameters = [
        { name: 'Troponin I (High-Sensitivity)', unit: 'ng/L', range: '0 - 14' },
        { name: 'CK-MB', unit: 'ng/mL', range: '0.5 - 5.0' }
      ];
    } else {
      parameters = [
        { name: 'General Diagnostic Marker', unit: 'mg/dL', range: '1.0 - 5.0' }
      ];
    }

    for (const p of parameters) {
      await db.query(
        'INSERT INTO lab_results (order_id, parameter_name, reference_range, unit) VALUES (?, ?, ?, ?)',
        [orderId, p.name, p.range, p.unit]
      );
    }

    await logAction(req, 'LAB_REGISTER_SPECIMEN', 'lab_orders', orderId, { accession, patient_id, barcode: specimen_barcode, urgency: orderUrgency });
    
    res.status(201).json({ success: true, message: 'Specimen registered successfully.', data: { id: orderId, accession_number: accession } });
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
    
    // Fetch prior historical order for delta check comparison
    const order = orderRows[0];
    const { rows: priorOrders } = await db.query(
      'SELECT id, created_at FROM lab_orders WHERE patient_id = ? AND id != ? AND stage IN (\'Verified\', \'Reported\', \'Notified\') ORDER BY id DESC LIMIT 1',
      [order.patient_id, id]
    );

    let priorResults = [];
    if (priorOrders.length > 0) {
      const { rows: pRes } = await db.query('SELECT parameter_name, parameter_value FROM lab_results WHERE order_id = ?', [priorOrders[0].id]);
      priorResults = pRes;
    }
    
    res.json({
      success: true,
      data: {
        order,
        results: resultRows,
        prior_results: priorResults
      }
    });
  } catch (err) { next(err); }
};

// 4. Update Specimen Lifecycle Stage (Pre-Analytical -> Analytical -> Post-Analytical)
exports.updateStage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { stage, hil_index, sample_integrity, notes } = req.body;

    if (!stage) {
      return res.status(400).json({ success: false, message: 'stage is required.' });
    }

    // Determine phase based on stage
    let phase = 'pre-analytical';
    if (['Centrifuged', 'Analyzing'].includes(stage)) {
      phase = 'analytical';
    } else if (['Verified', 'Reported', 'Notified'].includes(stage)) {
      phase = 'post-analytical';
    }

    let status = stage.toLowerCase();
    if (stage === 'Centrifuged') status = 'processing';

    await db.query(
      `UPDATE lab_orders 
       SET stage = ?, phase = ?, status = ?, 
           hil_index = COALESCE(?, hil_index),
           sample_integrity = COALESCE(?, sample_integrity),
           notes = COALESCE(?, notes),
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [stage, phase, status, hil_index || null, sample_integrity || null, notes || null, id]
    );

    await logAction(req, 'LAB_UPDATE_STAGE', 'lab_orders', id, { stage, phase });
    res.json({ success: true, message: `Specimen stage updated to ${stage}.` });
  } catch (err) { next(err); }
};

// 5. Save results & Execute LIS Auto-Verification Engine
exports.saveResults = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { results, hil_index } = req.body;
    
    if (!Array.isArray(results)) {
      return res.status(400).json({ success: false, message: 'results array is required.' });
    }

    // Fetch order & patient prior results for Delta Check
    const { rows: orderRows } = await db.query('SELECT * FROM lab_orders WHERE id = ?', [id]);
    if (orderRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Lab order not found.' });
    }
    const order = orderRows[0];

    const { rows: priorOrders } = await db.query(
      'SELECT id FROM lab_orders WHERE patient_id = ? AND id != ? AND stage IN (\'Verified\', \'Reported\', \'Notified\') ORDER BY id DESC LIMIT 1',
      [order.patient_id, id]
    );

    let priorMap = new Map();
    if (priorOrders.length > 0) {
      const { rows: pRes } = await db.query('SELECT parameter_name, parameter_value FROM lab_results WHERE order_id = ?', [priorOrders[0].id]);
      pRes.forEach(pr => {
        if (pr.parameter_name && pr.parameter_value) {
          priorMap.set(pr.parameter_name, parseFloat(pr.parameter_value));
        }
      });
    }

    // Check latest Westgard QC status
    const { rows: qcRows } = await db.query('SELECT status FROM lab_qc_logs ORDER BY id DESC LIMIT 1');
    const qcPassed = qcRows.length === 0 || qcRows[0].status === 'Passed';

    let hasAbnormal = false;
    let hasCriticalPanic = false;
    let hasDeltaCheck = false;

    for (const r of results) {
      const valNum = parseFloat(r.parameter_value);
      let isAbnormal = false;
      let isCritical = false;
      let deltaStr = null;

      // 1. Reference range evaluation
      if (r.reference_range && !isNaN(valNum)) {
        const parts = r.reference_range.split('-').map(x => parseFloat(x.trim()));
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          if (valNum < parts[0] || valNum > parts[1]) {
            isAbnormal = true;
          }
          // Panic/Critical limits (20% beyond boundaries or explicit critical limits)
          const lowerPanic = parts[0] * 0.7;
          const upperPanic = parts[1] * 1.3;
          if (valNum < lowerPanic || valNum > upperPanic) {
            isCritical = true;
          }
        }
      }

      // Explicit Critical Panic overrides
      const paramLower = (r.parameter_name || '').toLowerCase();
      if (paramLower.includes('potassium') && (valNum < 2.8 || valNum > 6.0)) isCritical = true;
      if (paramLower.includes('troponin') && valNum > 14.0) isCritical = true;
      if (paramLower.includes('wbc') && valNum > 30.0) isCritical = true;
      if (paramLower.includes('platelet') && valNum < 50.0) isCritical = true;

      // 2. Delta Check Evaluation (25% variance from prior baseline)
      if (priorMap.has(r.parameter_name) && !isNaN(valNum)) {
        const prevVal = priorMap.get(r.parameter_name);
        if (prevVal > 0) {
          const percentChange = Math.abs((valNum - prevVal) / prevVal) * 100;
          if (percentChange > 25.0) {
            hasDeltaCheck = true;
            deltaStr = `${(valNum - prevVal) > 0 ? '+' : ''}${(valNum - prevVal).toFixed(1)} (${percentChange.toFixed(0)}% vs prior)`;
          }
        }
      }

      if (isAbnormal) hasAbnormal = true;
      if (isCritical) hasCriticalPanic = true;

      await db.query(
        `UPDATE lab_results 
         SET parameter_value = ?, is_abnormal = ?, is_critical = ?, delta_change = ?, remarks = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ? AND order_id = ?`,
        [r.parameter_value, isAbnormal ? 1 : 0, isCritical ? 1 : 0, deltaStr, r.remarks || null, r.id, id]
      );
    }

    // ── LIS AUTO-VERIFICATION ENGINE ──────────────────────────────────────────
    // Auto-releases if: Normal range AND no Delta flag AND QC passed AND no HIL interference AND no Critical Panic
    const currentHIL = hil_index || order.hil_index || 'Normal';
    const isHILClear = currentHIL === 'Normal';

    let autoVerified = false;
    let newStage = 'Analyzing';
    let newPhase = 'analytical';

    if (!hasAbnormal && !hasCriticalPanic && !hasDeltaCheck && qcPassed && isHILClear) {
      autoVerified = true;
      newStage = 'Verified';
      newPhase = 'post-analytical';
    }

    await db.query(
      `UPDATE lab_orders 
       SET stage = ?, phase = ?, status = ?,
           auto_verified = ?, delta_check_flag = ?, critical_alert = ?,
           hil_index = ?,
           verified_by_name = CASE WHEN ? = 1 THEN 'LIS Auto-Verification Engine' ELSE verified_by_name END,
           verified_at = CASE WHEN ? = 1 THEN CURRENT_TIMESTAMP ELSE verified_at END,
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [
        newStage, newPhase, autoVerified ? 'Completed' : 'Processing',
        autoVerified ? 1 : 0, hasDeltaCheck ? 1 : 0, hasCriticalPanic ? 1 : 0,
        currentHIL, autoVerified ? 1 : 0, autoVerified ? 1 : 0, id
      ]
    );

    await logAction(req, 'LAB_SAVE_RESULTS', 'lab_orders', id, { autoVerified, hasCriticalPanic, hasDeltaCheck });

    res.json({ 
      success: true, 
      message: autoVerified 
        ? '✅ Results auto-verified and released by LIS Engine.' 
        : 'Results saved. Flagged for manual technologist sign-off.',
      data: {
        auto_verified: autoVerified,
        critical_alert: hasCriticalPanic,
        delta_flag: hasDeltaCheck
      }
    });
  } catch (err) { next(err); }
};

// 6. Manual Technologist Verification & Sign-off
exports.verifyOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { verified_by_name } = req.body;
    
    const { rows: results } = await db.query('SELECT id, parameter_value FROM lab_results WHERE order_id = ?', [id]);
    if (results.length === 0) {
      return res.status(400).json({ success: false, message: 'No parameters configured for this order.' });
    }

    const emptyParam = results.find(r => !r.parameter_value);
    if (emptyParam) {
      return res.status(400).json({ success: false, message: 'Please enter values for all parameters before verifying.' });
    }

    const verifier = verified_by_name || req.user?.username || 'Medical Technologist';

    await db.query(
      `UPDATE lab_orders 
       SET stage = 'Verified', phase = 'post-analytical', status = 'Completed',
           verified_by_name = ?, verified_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`, 
      [verifier, id]
    );

    await logAction(req, 'LAB_VERIFY_ORDER', 'lab_orders', id, { verifier });
    res.json({ success: true, message: 'Lab order verified and signed off successfully.' });
  } catch (err) { next(err); }
};

// 7. Electronic LIS Reporting & Patient Notification Dispatch
exports.notifyPatient = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    await db.query(
      `UPDATE lab_orders 
       SET stage = 'Notified', phase = 'completed',
           reported_at = COALESCE(reported_at, CURRENT_TIMESTAMP),
           notified_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`, 
      [id]
    );

    await logAction(req, 'LAB_NOTIFY_PATIENT', 'lab_orders', id, {});
    res.json({ success: true, message: 'Diagnostic report dispatched to EHR and patient notified.' });
  } catch (err) { next(err); }
};

// 8. Quality Control (Westgard & Levey-Jennings) Logs & Run Execution
exports.getQCLogs = async (req, res, next) => {
  try {
    const { rows } = await db.query('SELECT * FROM lab_qc_logs ORDER BY created_at DESC LIMIT 50');
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

exports.recordQCRun = async (req, res, next) => {
  try {
    const { analyzer_name, parameter_name, control_level, mean_target, sd_target, measured_value, corrective_action } = req.body;
    
    if (!analyzer_name || !parameter_name || measured_value === undefined) {
      return res.status(400).json({ success: false, message: 'analyzer_name, parameter_name and measured_value are required.' });
    }

    const mean = Number(mean_target) || 100.0;
    const sd = Number(sd_target) || 5.0;
    const val = Number(measured_value);
    
    // Z-score calculation: Z = (x - mean) / SD
    const zScore = Number(((val - mean) / sd).toFixed(2));

    // Westgard Rules Engine Evaluation
    // 1-3s Rule: Z > +3.0 or Z < -3.0 (Random Error)
    // 2-2s Rule: Z > +2.0 or Z < -2.0 (Systematic Error)
    let ruleBreach = 'None';
    let status = 'Passed';

    if (Math.abs(zScore) >= 3.0) {
      ruleBreach = '1-3s Breach';
      status = 'Rejected';
    } else if (Math.abs(zScore) >= 2.0) {
      ruleBreach = '2-2s Warning/Breach';
      status = 'Rejected';
    }

    await db.query(
      `INSERT INTO lab_qc_logs (
        analyzer_name, parameter_name, control_level, mean_target, sd_target, 
        measured_value, z_score, westgard_rule_breach, status, corrective_action_taken, run_by_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        analyzer_name, parameter_name, control_level || 'Level 1 Normal', mean, sd,
        val, zScore, ruleBreach, status, corrective_action || null, req.user?.username || 'Lab Technologist'
      ]
    );

    res.status(201).json({ 
      success: true, 
      message: status === 'Passed' ? 'QC Run passed successfully.' : `⚠️ QC REJECTED: ${ruleBreach} detected!`,
      data: { z_score: zScore, westgard_rule_breach: ruleBreach, status }
    });
  } catch (err) { next(err); }
};

