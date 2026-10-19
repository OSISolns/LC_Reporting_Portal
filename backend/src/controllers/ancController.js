'use strict';
const db = require('../config/db');
const { logAction } = require('../middleware/audit');
const ExcelJS = require('exceljs');

const INDICATOR_KEYS = [
  'ind_1_new_reg',
  'ind_2_under_15',
  'ind_3_15_19',
  'ind_4_20_24',
  'ind_5_25_plus',
  'ind_6_first_trim',
  'ind_7_with_partner',
  'ind_8_four_visits',
  'ind_9_high_risk_detected',
  'ind_10_high_risk_referred',
  'ind_11_tt1',
  'ind_12_tt2_to_5',
  'ind_13_tt_protected',
  'ind_14_iron_folic',
  'ind_15_severe_anaemia',
  'ind_16_syphilis_tested',
  'ind_17_syphilis_positive',
  'ind_18_syphilis_treated',
  'ind_19_hiv_tested',
  'ind_20_hiv_positive',
  'ind_21_hiv_result_received',
  'ind_22_hiv_arv_started',
  'ind_23_partner_hiv_tested',
  'ind_24_partner_hiv_positive',
  'ind_25_malaria_screened',
  'ind_26_ultrasound_other'
];

exports.INDICATOR_LABELS = {
  ind_1_new_reg: '1. ANC New Registration',
  ind_2_under_15: '2. Preg under 15 yrs',
  ind_3_15_19: '3. Preg 15 - 19 yrs',
  ind_4_20_24: '4. Preg 20 - 24 yrs',
  ind_5_25_plus: '5. Preg >= 25 yrs',
  ind_6_first_trim: '6. 1st visit 1st trimester (<= 12 wks)',
  ind_7_with_partner: '7. 1st visit accompanied by partner',
  ind_8_four_visits: '8. 4 standard visits completed',
  ind_9_high_risk_detected: '9. High risk pregnancy detected',
  ind_10_high_risk_referred: '10. High risk referred',
  ind_11_tt1: '11. TT 1 given',
  ind_12_tt2_to_5: '12. TT 2 to 5 given',
  ind_13_tt_protected: '13. TT fully protected at birth',
  ind_14_iron_folic: '14. Iron & Folic Acid provided',
  ind_15_severe_anaemia: '15. Severe anaemia (< 7 g/dL)',
  ind_16_syphilis_tested: '16. Tested for Syphilis',
  ind_17_syphilis_positive: '17. Syphilis positive',
  ind_18_syphilis_treated: '18. Syphilis positive treated',
  ind_19_hiv_tested: '19. Tested for HIV',
  ind_20_hiv_positive: '20. HIV positive',
  ind_21_hiv_result_received: '21. HIV positive received result',
  ind_22_hiv_arv_started: '22. HIV positive started on ARVs',
  ind_23_partner_hiv_tested: '23. Partner tested for HIV',
  ind_24_partner_hiv_positive: '24. Partner HIV positive',
  ind_25_malaria_screened: '25. Malaria screened / LLIN provided',
  ind_26_ultrasound_other: '26. Obstetric Ultrasound / Danger Signs'
};

exports.getAncEntries = async (req, res, next) => {
  try {
    const { date_from, date_to, startDate, endDate, case_type, insurance, high_risk, search } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 25);
    const offset = (page - 1) * limit;

    const fromDate = date_from || startDate;
    const toDate = date_to || endDate;

    let baseSql = 'FROM anc_register WHERE 1=1';
    const params = [];

    if (fromDate) {
      baseSql += ' AND reg_date >= ?';
      params.push(fromDate);
    }
    if (toDate) {
      baseSql += ' AND reg_date <= ?';
      params.push(toDate);
    }
    if (case_type && case_type !== 'all') {
      baseSql += ' AND case_type = ?';
      params.push(case_type);
    }
    if (insurance && insurance !== 'all') {
      baseSql += ' AND LOWER(insurance) = LOWER(?)';
      params.push(insurance);
    }
    if (high_risk === '1' || high_risk === 'true') {
      baseSql += ' AND (ind_9_high_risk_detected = 1 OR ind_10_high_risk_referred = 1)';
    }
    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      baseSql += ' AND (patient_name LIKE ? OR patient_id LIKE ? OR insurance LIKE ?)';
      params.push(q, q, q);
    }

    // Get total count for pagination
    const countSql = `SELECT COUNT(*) as total ${baseSql}`;
    const { rows: countRows } = await db.query(countSql, params);
    const total = countRows[0]?.total || 0;

    // Get paginated rows
    const dataSql = `SELECT * ${baseSql} ORDER BY reg_date DESC, id DESC LIMIT ? OFFSET ?`;
    const { rows } = await db.query(dataSql, [...params, limit, offset]);

    res.json({
      success: true,
      count: rows.length,
      total,
      data: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.getAncStats = async (req, res, next) => {
  try {
    const { date_from, date_to, startDate, endDate } = req.query;
    const fromDate = date_from || startDate;
    const toDate = date_to || endDate;
    let sql = 'SELECT * FROM anc_register WHERE 1=1';
    const params = [];

    if (fromDate) {
      sql += ' AND reg_date >= ?';
      params.push(fromDate);
    }
    if (toDate) {
      sql += ' AND reg_date <= ?';
      params.push(toDate);
    }

    const { rows } = await db.query(sql, params);

    const stats = {
      total_records: rows.length,
      new_cases: rows.filter(r => r.case_type === 'New case').length,
      old_cases: rows.filter(r => r.case_type === 'Old case').length,
      high_risk_cases: rows.filter(r => r.ind_9_high_risk_detected === 1).length,
      high_risk_referred: rows.filter(r => r.ind_10_high_risk_referred === 1).length,
      first_trimester_visits: rows.filter(r => r.ind_6_first_trim === 1).length,
      partner_accompanied: rows.filter(r => r.ind_7_with_partner === 1).length,
      hiv_screened: rows.filter(r => r.ind_19_hiv_tested === 1).length,
      syphilis_screened: rows.filter(r => r.ind_16_syphilis_tested === 1).length,
      indicators: {}
    };

    for (const key of INDICATOR_KEYS) {
      stats.indicators[key] = rows.filter(r => r[key] === 1).length;
    }

    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
};

exports.createAncEntry = async (req, res, next) => {
  try {
    const {
      entry_no,
      reg_date,
      patient_name,
      patient_id,
      age,
      sex = 'F',
      case_type = 'New case',
      insurance,
      gestational_age_weeks,
      parity_gravida,
      edd,
      clinical_notes
    } = req.body;

    const finalRegDate = reg_date || req.body.visit_date;
    const finalPatientName = patient_name || req.body.mother_name;
    const finalPatientId = patient_id !== undefined ? patient_id : (req.body.pid || null);
    const finalEdd = edd || req.body.estimated_delivery_date || null;
    const finalParityGravida = parity_gravida || (req.body.gravida || req.body.parity ? `G${req.body.gravida || 0}P${req.body.parity || 0}` : null);
    const finalClinicalNotes = clinical_notes || req.body.danger_signs || null;

    if (!finalPatientName || !finalRegDate) {
      return res.status(400).json({ success: false, message: 'Patient Name and Date are required.' });
    }

    if (sex && (sex.toUpperCase() === 'M' || sex.toUpperCase() === 'MALE')) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid gender: Antenatal Care (ANC) register is strictly for female maternal patients.' 
      });
    }

    // Auto calculate age indicators if not explicitly set
    const numAge = parseInt(age, 10) || null;
    let ind2 = req.body.ind_2_under_15 ? 1 : 0;
    let ind3 = req.body.ind_3_15_19 ? 1 : 0;
    let ind4 = req.body.ind_4_20_24 ? 1 : 0;
    let ind5 = req.body.ind_5_25_plus ? 1 : 0;

    if (case_type === 'New case' && numAge !== null && !ind2 && !ind3 && !ind4 && !ind5) {
      if (numAge < 15) ind2 = 1;
      else if (numAge >= 15 && numAge <= 19) ind3 = 1;
      else if (numAge >= 20 && numAge <= 24) ind4 = 1;
      else if (numAge >= 25) ind5 = 1;
    }

    const ind1 = case_type === 'New case' || req.body.ind_1_new_reg ? 1 : 0;

    const attendedBy = req.user?.full_name || req.user?.fullName || req.user?.username || 'Nurse / Midwife';
    const attendedById = req.user?.id || null;

    const fields = [
      'entry_no', 'reg_date', 'patient_name', 'patient_id', 'age', 'sex', 'case_type', 'insurance',
      'gestational_age_weeks', 'parity_gravida', 'edd', 'attended_by', 'attended_by_id',
      'ind_1_new_reg', 'ind_2_under_15', 'ind_3_15_19', 'ind_4_20_24', 'ind_5_25_plus',
      'ind_6_first_trim', 'ind_7_with_partner', 'ind_8_four_visits', 'ind_9_high_risk_detected',
      'ind_10_high_risk_referred', 'ind_11_tt1', 'ind_12_tt2_to_5', 'ind_13_tt_protected',
      'ind_14_iron_folic', 'ind_15_severe_anaemia', 'ind_16_syphilis_tested', 'ind_17_syphilis_positive',
      'ind_18_syphilis_treated', 'ind_19_hiv_tested', 'ind_20_hiv_positive', 'ind_21_hiv_result_received',
      'ind_22_hiv_arv_started', 'ind_23_partner_hiv_tested', 'ind_24_partner_hiv_positive',
      'ind_25_malaria_screened', 'ind_26_ultrasound_other', 'clinical_notes'
    ];

    const values = [
      entry_no || null,
      finalRegDate,
      finalPatientName.trim(),
      finalPatientId ? String(finalPatientId).trim() : null,
      numAge,
      sex || 'F',
      case_type,
      insurance ? insurance.trim() : null,
      gestational_age_weeks ? parseInt(gestational_age_weeks, 10) : null,
      finalParityGravida ? finalParityGravida.trim() : null,
      finalEdd || null,
      attendedBy,
      attendedById,
      ind1,
      ind2,
      ind3,
      ind4,
      ind5,
      req.body.ind_6_first_trim ? 1 : 0,
      req.body.ind_7_with_partner ? 1 : 0,
      req.body.ind_8_four_visits ? 1 : 0,
      req.body.ind_9_high_risk_detected ? 1 : 0,
      req.body.ind_10_high_risk_referred ? 1 : 0,
      req.body.ind_11_tt1 ? 1 : 0,
      req.body.ind_12_tt2_to_5 ? 1 : 0,
      req.body.ind_13_tt_protected ? 1 : 0,
      req.body.ind_14_iron_folic ? 1 : 0,
      req.body.ind_15_severe_anaemia ? 1 : 0,
      req.body.ind_16_syphilis_tested ? 1 : 0,
      req.body.ind_17_syphilis_positive ? 1 : 0,
      req.body.ind_18_syphilis_treated ? 1 : 0,
      req.body.ind_19_hiv_tested ? 1 : 0,
      req.body.ind_20_hiv_positive ? 1 : 0,
      req.body.ind_21_hiv_result_received ? 1 : 0,
      req.body.ind_22_hiv_arv_started ? 1 : 0,
      req.body.ind_23_partner_hiv_tested ? 1 : 0,
      req.body.ind_24_partner_hiv_positive ? 1 : 0,
      req.body.ind_25_malaria_screened ? 1 : 0,
      req.body.ind_26_ultrasound_other ? 1 : 0,
      finalClinicalNotes ? finalClinicalNotes.trim() : null
    ];

    const placeholders = fields.map(() => '?').join(', ');
    const sql = `INSERT INTO anc_register (${fields.join(', ')}) VALUES (${placeholders})`;

    await db.query(sql, values);
    const { rows: lastRows } = await db.query('SELECT * FROM anc_register ORDER BY id DESC LIMIT 1');
    const created = lastRows[0];

    await logAction(req, 'CREATE', 'anc_register', created?.id, {
      patient_name: finalPatientName,
      patient_id: finalPatientId,
      reg_date: finalRegDate,
      case_type
    });

    res.status(201).json({
      success: true,
      message: 'ANC Register entry recorded successfully.',
      data: created
    });
  } catch (err) {
    next(err);
  }
};

exports.updateAncEntry = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      entry_no,
      reg_date,
      patient_name,
      patient_id,
      age,
      sex = 'F',
      case_type,
      insurance,
      gestational_age_weeks,
      parity_gravida,
      edd,
      clinical_notes
    } = req.body;

    const { rows: existing } = await db.query('SELECT * FROM anc_register WHERE id = ?', [id]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ success: false, message: 'ANC entry not found.' });
    }

    if (sex && (sex.toUpperCase() === 'M' || sex.toUpperCase() === 'MALE')) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid gender: Antenatal Care (ANC) register is strictly for female maternal patients.' 
      });
    }

    const finalRegDate = reg_date || req.body.visit_date || existing[0].reg_date;
    const finalPatientName = patient_name || req.body.mother_name || existing[0].patient_name;
    const finalPatientId = patient_id !== undefined ? patient_id : (req.body.pid !== undefined ? req.body.pid : existing[0].patient_id);
    const finalEdd = edd !== undefined ? edd : (req.body.estimated_delivery_date !== undefined ? req.body.estimated_delivery_date : existing[0].edd);
    const finalParityGravida = parity_gravida !== undefined ? parity_gravida : (req.body.gravida || req.body.parity ? `G${req.body.gravida || 0}P${req.body.parity || 0}` : existing[0].parity_gravida);
    const finalClinicalNotes = clinical_notes !== undefined ? clinical_notes : (req.body.danger_signs !== undefined ? req.body.danger_signs : existing[0].clinical_notes);

    const numAge = age !== undefined && age !== '' ? parseInt(age, 10) : existing[0].age;

    const updateFields = [
      'entry_no = ?', 'reg_date = ?', 'patient_name = ?', 'patient_id = ?', 'age = ?', 'sex = ?',
      'case_type = ?', 'insurance = ?', 'gestational_age_weeks = ?', 'parity_gravida = ?', 'edd = ?',
      'ind_1_new_reg = ?', 'ind_2_under_15 = ?', 'ind_3_15_19 = ?', 'ind_4_20_24 = ?', 'ind_5_25_plus = ?',
      'ind_6_first_trim = ?', 'ind_7_with_partner = ?', 'ind_8_four_visits = ?', 'ind_9_high_risk_detected = ?',
      'ind_10_high_risk_referred = ?', 'ind_11_tt1 = ?', 'ind_12_tt2_to_5 = ?', 'ind_13_tt_protected = ?',
      'ind_14_iron_folic = ?', 'ind_15_severe_anaemia = ?', 'ind_16_syphilis_tested = ?', 'ind_17_syphilis_positive = ?',
      'ind_18_syphilis_treated = ?', 'ind_19_hiv_tested = ?', 'ind_20_hiv_positive = ?', 'ind_21_hiv_result_received = ?',
      'ind_22_hiv_arv_started = ?', 'ind_23_partner_hiv_tested = ?', 'ind_24_partner_hiv_positive = ?',
      'ind_25_malaria_screened = ?', 'ind_26_ultrasound_other = ?', 'clinical_notes = ?',
      "updated_at = datetime('now')"
    ];

    const values = [
      entry_no !== undefined ? entry_no : existing[0].entry_no,
      finalRegDate,
      finalPatientName ? finalPatientName.trim() : existing[0].patient_name,
      finalPatientId !== undefined ? (finalPatientId ? String(finalPatientId).trim() : null) : existing[0].patient_id,
      numAge,
      sex || existing[0].sex,
      case_type || existing[0].case_type,
      insurance !== undefined ? (insurance ? insurance.trim() : null) : existing[0].insurance,
      gestational_age_weeks !== undefined ? (gestational_age_weeks ? parseInt(gestational_age_weeks, 10) : null) : existing[0].gestational_age_weeks,
      finalParityGravida !== undefined ? (finalParityGravida ? String(finalParityGravida).trim() : null) : existing[0].parity_gravida,
      finalEdd !== undefined ? finalEdd : existing[0].edd,
      req.body.ind_1_new_reg !== undefined ? (req.body.ind_1_new_reg ? 1 : 0) : existing[0].ind_1_new_reg,
      req.body.ind_2_under_15 !== undefined ? (req.body.ind_2_under_15 ? 1 : 0) : existing[0].ind_2_under_15,
      req.body.ind_3_15_19 !== undefined ? (req.body.ind_3_15_19 ? 1 : 0) : existing[0].ind_3_15_19,
      req.body.ind_4_20_24 !== undefined ? (req.body.ind_4_20_24 ? 1 : 0) : existing[0].ind_4_20_24,
      req.body.ind_5_25_plus !== undefined ? (req.body.ind_5_25_plus ? 1 : 0) : existing[0].ind_5_25_plus,
      req.body.ind_6_first_trim !== undefined ? (req.body.ind_6_first_trim ? 1 : 0) : existing[0].ind_6_first_trim,
      req.body.ind_7_with_partner !== undefined ? (req.body.ind_7_with_partner ? 1 : 0) : existing[0].ind_7_with_partner,
      req.body.ind_8_four_visits !== undefined ? (req.body.ind_8_four_visits ? 1 : 0) : existing[0].ind_8_four_visits,
      req.body.ind_9_high_risk_detected !== undefined ? (req.body.ind_9_high_risk_detected ? 1 : 0) : existing[0].ind_9_high_risk_detected,
      req.body.ind_10_high_risk_referred !== undefined ? (req.body.ind_10_high_risk_referred ? 1 : 0) : existing[0].ind_10_high_risk_referred,
      req.body.ind_11_tt1 !== undefined ? (req.body.ind_11_tt1 ? 1 : 0) : existing[0].ind_11_tt1,
      req.body.ind_12_tt2_to_5 !== undefined ? (req.body.ind_12_tt2_to_5 ? 1 : 0) : existing[0].ind_12_tt2_to_5,
      req.body.ind_13_tt_protected !== undefined ? (req.body.ind_13_tt_protected ? 1 : 0) : existing[0].ind_13_tt_protected,
      req.body.ind_14_iron_folic !== undefined ? (req.body.ind_14_iron_folic ? 1 : 0) : existing[0].ind_14_iron_folic,
      req.body.ind_15_severe_anaemia !== undefined ? (req.body.ind_15_severe_anaemia ? 1 : 0) : existing[0].ind_15_severe_anaemia,
      req.body.ind_16_syphilis_tested !== undefined ? (req.body.ind_16_syphilis_tested ? 1 : 0) : existing[0].ind_16_syphilis_tested,
      req.body.ind_17_syphilis_positive !== undefined ? (req.body.ind_17_syphilis_positive ? 1 : 0) : existing[0].ind_17_syphilis_positive,
      req.body.ind_18_syphilis_treated !== undefined ? (req.body.ind_18_syphilis_treated ? 1 : 0) : existing[0].ind_18_syphilis_treated,
      req.body.ind_19_hiv_tested !== undefined ? (req.body.ind_19_hiv_tested ? 1 : 0) : existing[0].ind_19_hiv_tested,
      req.body.ind_20_hiv_positive !== undefined ? (req.body.ind_20_hiv_positive ? 1 : 0) : existing[0].ind_20_hiv_positive,
      req.body.ind_21_hiv_result_received !== undefined ? (req.body.ind_21_hiv_result_received ? 1 : 0) : existing[0].ind_21_hiv_result_received,
      req.body.ind_22_hiv_arv_started !== undefined ? (req.body.ind_22_hiv_arv_started ? 1 : 0) : existing[0].ind_22_hiv_arv_started,
      req.body.ind_23_partner_hiv_tested !== undefined ? (req.body.ind_23_partner_hiv_tested ? 1 : 0) : existing[0].ind_23_partner_hiv_tested,
      req.body.ind_24_partner_hiv_positive !== undefined ? (req.body.ind_24_partner_hiv_positive ? 1 : 0) : existing[0].ind_24_partner_hiv_positive,
      req.body.ind_25_malaria_screened !== undefined ? (req.body.ind_25_malaria_screened ? 1 : 0) : existing[0].ind_25_malaria_screened,
      req.body.ind_26_ultrasound_other !== undefined ? (req.body.ind_26_ultrasound_other ? 1 : 0) : existing[0].ind_26_ultrasound_other,
      clinical_notes !== undefined ? (clinical_notes ? clinical_notes.trim() : null) : existing[0].clinical_notes,
      id
    ];

    await db.query(`UPDATE anc_register SET ${updateFields.join(', ')} WHERE id = ?`, values);
    const { rows: updatedRows } = await db.query('SELECT * FROM anc_register WHERE id = ?', [id]);

    await logAction(req, 'UPDATE', 'anc_register', id, { patient_name, id });

    res.json({
      success: true,
      message: 'ANC Register entry updated successfully.',
      data: updatedRows[0]
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteAncEntry = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows: existing } = await db.query('SELECT * FROM anc_register WHERE id = ?', [id]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ success: false, message: 'ANC entry not found.' });
    }

    await db.query('DELETE FROM anc_register WHERE id = ?', [id]);
    await logAction(req, 'DELETE', 'anc_register', id, { patient_name: existing[0].patient_name });

    res.json({ success: true, message: 'ANC Register entry deleted successfully.' });
  } catch (err) {
    next(err);
  }
};

exports.exportAncExcel = async (req, res, next) => {
  try {
    const { date_from, date_to, startDate, endDate } = req.query;
    const fromDate = date_from || startDate;
    const toDate = date_to || endDate;
    let sql = 'SELECT * FROM anc_register WHERE 1=1';
    const params = [];

    if (fromDate) {
      sql += ' AND reg_date >= ?';
      params.push(fromDate);
    }
    if (toDate) {
      sql += ' AND reg_date <= ?';
      params.push(toDate);
    }
    sql += ' ORDER BY reg_date ASC, id ASC';

    const { rows } = await db.query(sql, params);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Legacy Clinics - Lumina Portal';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('ANC Register', {
      views: [{ state: 'frozen', xSplit: 7, ySplit: 4 }]
    });

    // Title banner
    sheet.mergeCells('A1:AJ1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'LEGACY CLINICS & DIAGNOSTICS — ANTENATAL CARE (ANC) & MIDWIFERY STATUTORY REGISTER';
    titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D5C75' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(1).height = 30;

    sheet.mergeCells('A2:AJ2');
    const subCell = sheet.getCell('A2');
    subCell.value = `Rwanda MoH / HMIS Standard Antenatal Register Log — Generated: ${new Date().toLocaleDateString()} | Total Records: ${rows.length}`;
    subCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF334155' } };
    subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    subCell.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(2).height = 20;

    // Headers
    const headers = [
      'No', 'Date', 'Patient Full Name', 'PID / File No', 'Age', 'Sex',
      'New Case', 'Old Case', 'Insurance', 'Gestational Wks', 'Parity / Gravida', 'EDD',
      '1. New Reg', '2. <15y', '3. 15-19y', '4. 20-24y', '5. >=25y',
      '6. 1st Trim', '7. Partner Accompanied', '8. 4 Visits Done',
      '9. High Risk Detected', '10. High Risk Referred',
      '11. TT 1', '12. TT 2-5', '13. TT Protected',
      '14. Iron/Folate', '15. Severe Anaemia',
      '16. Syphilis Test', '17. Syphilis +', '18. Syphilis Treated',
      '19. HIV Test', '20. HIV +', '21. Result Received', '22. Started ARV',
      '23. Partner HIV Test', '24. Partner HIV +',
      '25. Malaria / LLIN', '26. Ultrasound / Danger Signs',
      'Attended By', 'Clinical Notes'
    ];

    const headerRow = sheet.addRow(headers);
    headerRow.height = 36;
    headerRow.eachCell((cell) => {
      cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
      };
    });

    // Populate data rows
    rows.forEach((r, idx) => {
      const rowData = [
        r.entry_no || idx + 1,
        r.reg_date,
        r.patient_name,
        r.patient_id || '',
        r.age || '',
        r.sex || 'F',
        r.case_type === 'New case' ? '✓' : '',
        r.case_type === 'Old case' ? '✓' : '',
        r.insurance || 'Private',
        r.gestational_age_weeks || '',
        r.parity_gravida || '',
        r.edd || '',
        r.ind_1_new_reg === 1 ? '✓' : '',
        r.ind_2_under_15 === 1 ? '✓' : '',
        r.ind_3_15_19 === 1 ? '✓' : '',
        r.ind_4_20_24 === 1 ? '✓' : '',
        r.ind_5_25_plus === 1 ? '✓' : '',
        r.ind_6_first_trim === 1 ? '✓' : '',
        r.ind_7_with_partner === 1 ? '✓' : '',
        r.ind_8_four_visits === 1 ? '✓' : '',
        r.ind_9_high_risk_detected === 1 ? '✓' : '',
        r.ind_10_high_risk_referred === 1 ? '✓' : '',
        r.ind_11_tt1 === 1 ? '✓' : '',
        r.ind_12_tt2_to_5 === 1 ? '✓' : '',
        r.ind_13_tt_protected === 1 ? '✓' : '',
        r.ind_14_iron_folic === 1 ? '✓' : '',
        r.ind_15_severe_anaemia === 1 ? '✓' : '',
        r.ind_16_syphilis_tested === 1 ? '✓' : '',
        r.ind_17_syphilis_positive === 1 ? '✓' : '',
        r.ind_18_syphilis_treated === 1 ? '✓' : '',
        r.ind_19_hiv_tested === 1 ? '✓' : '',
        r.ind_20_hiv_positive === 1 ? '✓' : '',
        r.ind_21_hiv_result_received === 1 ? '✓' : '',
        r.ind_22_hiv_arv_started === 1 ? '✓' : '',
        r.ind_23_partner_hiv_tested === 1 ? '✓' : '',
        r.ind_24_partner_hiv_positive === 1 ? '✓' : '',
        r.ind_25_malaria_screened === 1 ? '✓' : '',
        r.ind_26_ultrasound_other === 1 ? '✓' : '',
        r.attended_by || '',
        r.clinical_notes || ''
      ];

      const row = sheet.addRow(rowData);
      row.height = 22;
      const isEven = idx % 2 === 0;

      row.eachCell((cell, colNum) => {
        cell.font = { name: 'Arial', size: 9 };
        cell.alignment = {
          vertical: 'middle',
          horizontal: [3, 4, 39, 40].includes(colNum) ? 'left' : 'center'
        };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: isEven ? 'FFFFFFFF' : 'FFF8FAFC' }
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };
      });
    });

    // Column widths
    sheet.columns = [
      { width: 6 },  // No
      { width: 12 }, // Date
      { width: 26 }, // Name
      { width: 14 }, // PID
      { width: 6 },  // Age
      { width: 6 },  // Sex
      { width: 10 }, // New
      { width: 10 }, // Old
      { width: 14 }, // Insurance
      { width: 14 }, // Gest wks
      { width: 14 }, // Parity
      { width: 12 }, // EDD
      ...Array(26).fill({ width: 10 }), // 26 indicators
      { width: 22 }, // Attended by
      { width: 30 }  // Notes
    ];

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=ANC_Register_HMIS_${new Date().toISOString().split('T')[0]}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
};
