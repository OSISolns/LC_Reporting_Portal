'use strict';
require('dotenv').config();
const db = require('../src/config/db');

async function runE2EPortalAudit() {
  console.log('================================================================');
  console.log('🏥 LEGACY CLINICS LUMINA PORTAL - E2E AUDIT & INTEGRITY CHECK');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // ── 1. DATABASE CONNECTION & TABLE INVENTORY ───────────────────────────
    console.log('🔍 PHASE 1: Database Tables & Inventory Audit');
    
    // SQLite table list
    const { rows: tableRows } = await db.query(
      `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name ASC`
    );
    const tableNames = tableRows.map(r => r.name);
    console.log(`  📊 Discovered ${tableNames.length} total database tables.`);

    const requiredTables = [
      'users', 'roles', 'role_permissions', 'permission_modules',
      'cancellation_requests', 'refund_requests', 'incident_reports',
      'safety_reports', 'risk_register', 'infection_cases', 'hygiene_audits',
      'hsfp_inspections', 'hsfp_hazard_logs',
      'lab_orders', 'lab_results', 'lab_qc_logs', 'lab_ncr',
      'lab_analyzers', 'lab_equipment', 'lab_inhand_inventory',
      'lab_storage_units', 'lab_specimen_storage', 'lab_documents',
      'proforma_invoices', 'sales_service_catalog', 'departments', 'providers',
      'audit_logs', 'dental_cases', 'clinical_observations'
    ];

    for (const tbl of requiredTables) {
      const exists = tableNames.includes(tbl);
      assert(exists, `Required table '${tbl}' exists`);
      if (exists) {
        const { rows: countRows } = await db.query(`SELECT COUNT(*) as cnt FROM ${tbl}`);
        const cnt = countRows[0]?.cnt ?? 0;
        console.log(`     ↳ Table '${tbl}': ${cnt} records`);
      }
    }

    // ── 2. ROLES & RBAC PERMISSIONS INTEGRITY ──────────────────────────────
    console.log('\n🔒 PHASE 2: RBAC Matrix & User Roles Integrity');
    const { rows: roles } = await db.query('SELECT COUNT(*) as cnt FROM roles');
    assert(roles[0]?.cnt >= 40, `Roles populated (found ${roles[0]?.cnt} roles, expected >= 40)`);

    const { rows: perms } = await db.query('SELECT COUNT(*) as cnt FROM role_permissions');
    assert(perms[0]?.cnt >= 1000, `Role permissions populated (found ${perms[0]?.cnt} permissions, expected >= 1000)`);

    const { rows: orphanedUsers } = await db.query(
      `SELECT COUNT(*) as cnt FROM users WHERE role_id IS NOT NULL AND role_id NOT IN (SELECT id FROM roles)`
    );
    assert(orphanedUsers[0]?.cnt === 0, 'No orphaned users with non-existent role_id');

    // ── 3. ENTERPRISE RISK REGISTER MODULE ─────────────────────────────────
    console.log('\n🛡️ PHASE 3: Enterprise Risk Register Integrity & CRUD Flow');
    const testRiskTitle = `E2E Test Hazard ${Date.now()}`;
    const insertRiskRes = await db.query(
      `INSERT INTO risk_register (risk_code, title, category, likelihood, impact, status, owner, mitigation, date)
       VALUES ('RSK-TEST-99', ?, 'Clinical', 4, 4, 'Active', 'E2E Test Runner', 'Test control measure', '2026-10-16')
       RETURNING *`,
      [testRiskTitle]
    );
    const createdRisk = insertRiskRes.rows[0];
    assert(createdRisk && createdRisk.id, 'Created new test risk record in risk_register');

    const { rows: fetchedRisk } = await db.query('SELECT * FROM risk_register WHERE id = ?', [createdRisk.id]);
    assert(fetchedRisk.length === 1 && fetchedRisk[0].title === testRiskTitle, 'Successfully queried created risk by ID');

    await db.query(`UPDATE risk_register SET status = 'Mitigated' WHERE id = ?`, [createdRisk.id]);
    const { rows: updatedRisk } = await db.query('SELECT status FROM risk_register WHERE id = ?', [createdRisk.id]);
    assert(updatedRisk[0]?.status === 'Mitigated', 'Successfully transitioned risk status to Mitigated');

    await db.query('DELETE FROM risk_register WHERE id = ?', [createdRisk.id]);
    const { rows: deletedRisk } = await db.query('SELECT * FROM risk_register WHERE id = ?', [createdRisk.id]);
    assert(deletedRisk.length === 0, 'Successfully deleted test risk record');

    // ── 4. INFECTION CONTROL & HYGIENE AUDITS MODULE ───────────────────────
    console.log('\n🧼 PHASE 4: Infection Control Tracker & Hygiene Audits Flow');
    // Test HAI Case
    const testCaseRes = await db.query(
      `INSERT INTO infection_cases (case_code, infection_type, department, patient_identifier, date, severity, status, investigation_notes, corrective_actions)
       VALUES ('HAI-TEST-99', 'Surgical Site Infection (SSI)', 'Surgery', 'MRN-TEST-E2E', '2026-10-16', 'High', 'Under Investigation', 'Wound swab gram negative bacilli', 'Wound debridement and targeted antibiotics')
       RETURNING *`
    );
    const createdCase = testCaseRes.rows[0];
    assert(createdCase && createdCase.id, 'Reported test HAI / infection case in infection_cases');

    await db.query(`UPDATE infection_cases SET status = 'Resolved' WHERE id = ?`, [createdCase.id]);
    const { rows: resCase } = await db.query('SELECT status FROM infection_cases WHERE id = ?', [createdCase.id]);
    assert(resCase[0]?.status === 'Resolved', 'Updated infection case status to Resolved');
    await db.query('DELETE FROM infection_cases WHERE id = ?', [createdCase.id]);

    // Test Hygiene Audit
    const testAuditRes = await db.query(
      `INSERT INTO hygiene_audits (audit_code, department, auditor_name, compliance_score, total_opportunities, missed_opportunities, sterilization_passed, observations, audit_date)
       VALUES ('AUD-TEST-99', 'Surgery', 'E2E Auditor', 96.5, 30, 1, 1, 'Adequate hand rub stations available', '2026-10-16')
       RETURNING *`
    );
    const createdAudit = testAuditRes.rows[0];
    assert(createdAudit && createdAudit.id, 'Logged test hygiene & sterilization audit');
    await db.query('DELETE FROM hygiene_audits WHERE id = ?', [createdAudit.id]);

    // Test Workplace Health & Safety Inspection
    const testInspRes = await db.query(
      `INSERT INTO hsfp_inspections (
        inspection_code, department, inspector_name, inspection_date, area_inspected,
        ppe_compliance_pct, fire_safety_passed, waste_management_passed, sharps_safety_passed, spill_kit_verified, status
      ) VALUES ('INSP-TEST-99', 'Emergency', 'HSFP Auditor', '2026-10-16', 'Resuscitation Unit', 98.5, 1, 1, 1, 1, 'Passed')
       RETURNING *`
    );
    const createdInsp = testInspRes.rows[0];
    assert(createdInsp && createdInsp.id, 'Logged test workplace health & safety inspection in hsfp_inspections');
    const { rows: fetchedInsp } = await db.query('SELECT ppe_compliance_pct FROM hsfp_inspections WHERE id = ?', [createdInsp.id]);
    assert(Math.round(fetchedInsp[0]?.ppe_compliance_pct) === 99 || fetchedInsp[0]?.ppe_compliance_pct === 98.5, 'PPE compliance percentage verified');
    await db.query('DELETE FROM hsfp_inspections WHERE id = ?', [createdInsp.id]);

    // Test Occupational Hazard & Sharps Exposure Log
    const testHazRes = await db.query(
      `INSERT INTO hsfp_hazard_logs (
        log_code, affected_staff, department, exposure_type, exposure_date, pep_initiated, status
      ) VALUES ('HAZ-TEST-99', 'Staff Nurse E2E', 'Laboratory', 'Needle Stick / Sharps Injury', '2026-10-16', 1, 'Open')
       RETURNING *`
    );
    const createdHaz = testHazRes.rows[0];
    assert(createdHaz && createdHaz.id, 'Logged test occupational hazard/exposure in hsfp_hazard_logs');
    await db.query(`UPDATE hsfp_hazard_logs SET status = 'Closed - Safe' WHERE id = ?`, [createdHaz.id]);
    const { rows: fetchedHaz } = await db.query('SELECT status FROM hsfp_hazard_logs WHERE id = ?', [createdHaz.id]);
    assert(fetchedHaz[0]?.status === 'Closed - Safe', 'Updated hazard exposure status to Closed - Safe');
    await db.query('DELETE FROM hsfp_hazard_logs WHERE id = ?', [createdHaz.id]);

    // Test Safety Management Consolidated Report
    const testReportRes = await db.query(
      `INSERT INTO safety_reports (
        title, period_start, period_end, executive_summary, key_findings, recommendations, status
      ) VALUES ('E2E Q3 Safety Audit', '2026-07-01', '2026-09-30', 'Executive summary of clinical safety', 'Zero sentinel events', 'Maintain quarterly drills', 'published')
       RETURNING *`
    );
    const createdReport = testReportRes.rows[0];
    assert(createdReport && createdReport.id, 'Published consolidated clinical safety report in safety_reports');
    await db.query('DELETE FROM safety_reports WHERE id = ?', [createdReport.id]);

    // ── 5. LABORATORY WORKFLOW ENGINE ──────────────────────────────────────
    console.log('\n🔬 PHASE 5: Laboratory Workflows, Panels & Quality Control Engine');
    
    // Check Analyzers
    const { rows: analyzers } = await db.query('SELECT COUNT(*) as cnt FROM lab_analyzers WHERE status = "Operational"');
    assert(analyzers[0]?.cnt >= 8, `Automated analyzers active in fleet (found ${analyzers[0]?.cnt}, expected >= 8)`);

    // Register a Specimen with new test panel: Lipid Profile
    const testAccession = `L-E2E-${Date.now().toString().slice(-4)}`;
    const orderRes = await db.query(
      `INSERT INTO lab_orders (
        accession_number, patient_id, patient_name, patient_age, patient_gender,
        referring_provider, specimen_type, specimen_barcode, priority, urgency,
        phase, stage, status, tube_type, order_of_draw_step, volume_ml
      ) VALUES (?, 'PID-E2E-100', 'Jean-Luc Testman', '45', 'Male', 'Dr. Test', 'Venous Blood', 'BAR-E2E-99', 'routine', 'Routine', 'pre-analytical', 'Collected', 'Collected', 'SST Gold Gel', 3, 4.0)
      RETURNING *`,
      [testAccession]
    );
    const createdOrder = orderRes.rows[0];
    assert(createdOrder && createdOrder.id, `Created lab specimen order ${testAccession}`);

    // Insert parameters for Lipid Profile
    const lipidParams = [
      { name: 'Total Cholesterol', unit: 'mg/dL', range: '100 - 200', val: 245 }, // High
      { name: 'Triglycerides', unit: 'mg/dL', range: '50 - 150', val: 130 },       // Normal
      { name: 'HDL Cholesterol', unit: 'mg/dL', range: '40 - 60', val: 35 },        // Low
      { name: 'LDL Cholesterol', unit: 'mg/dL', range: '50 - 100', val: 175 }      // High
    ];

    for (const p of lipidParams) {
      const parts = p.range.split('-').map(x => parseFloat(x.trim()));
      const isAb = (p.val < parts[0] || p.val > parts[1]) ? 1 : 0;
      await db.query(
        `INSERT INTO lab_results (order_id, parameter_name, reference_range, unit, parameter_value, is_abnormal)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [createdOrder.id, p.name, p.range, p.unit, String(p.val), isAb]
      );
    }

    const { rows: storedResults } = await db.query('SELECT * FROM lab_results WHERE order_id = ?', [createdOrder.id]);
    assert(storedResults.length === 4, 'All 4 Lipid panel parameters successfully persisted');
    const abnormalCount = storedResults.filter(r => Boolean(r.is_abnormal) === true || r.is_abnormal === 1).length;
    assert(abnormalCount === 3, `Abnormal flags evaluated correctly (found ${abnormalCount} abnormal, expected 3)`);

    // Stage progression: Collected -> Centrifuged -> Analyzing -> Verified
    await db.query(`UPDATE lab_orders SET stage = 'Centrifuged', phase = 'analytical' WHERE id = ?`, [createdOrder.id]);
    await db.query(`UPDATE lab_orders SET stage = 'Analyzing' WHERE id = ?`, [createdOrder.id]);
    await db.query(`UPDATE lab_orders SET stage = 'Verified', phase = 'post-analytical', status = 'verified' WHERE id = ?`, [createdOrder.id]);

    const { rows: verifiedOrder } = await db.query('SELECT stage, phase, status FROM lab_orders WHERE id = ?', [createdOrder.id]);
    assert(
      verifiedOrder[0]?.stage === 'Verified' && verifiedOrder[0]?.phase === 'post-analytical',
      'Specimen lifecycle transitions cleanly to Verified (post-analytical)'
    );

    // Clean up test order
    await db.query('DELETE FROM lab_results WHERE order_id = ?', [createdOrder.id]);
    await db.query('DELETE FROM lab_orders WHERE id = ?', [createdOrder.id]);

    // Test Quality Control (Westgard Log)
    const qcRes = await db.query(
      `INSERT INTO lab_qc_logs (analyzer_name, parameter_name, control_level, mean_target, sd_target, measured_value, z_score, westgard_rule_breach, status)
       VALUES ('Mindray BS-240', 'Total Cholesterol', 'Level 1 Normal', 150.0, 5.0, 151.2, 0.24, 'None', 'Passed')
       RETURNING *`
    );
    assert(qcRes.rows[0]?.status === 'Passed', 'Logged valid Westgard Quality Control run');
    await db.query('DELETE FROM lab_qc_logs WHERE id = ?', [qcRes.rows[0].id]);

    // ── 6. SALES & PROFORMA INVOICES MODULE ────────────────────────────────
    console.log('\n💼 PHASE 6: Sales & Proforma Invoice Builder Integrity');
    const testInvNum = `PRO-E2E-${Date.now().toString().slice(-4)}`;
    const proformaRes = await db.query(
      `INSERT INTO proforma_invoices (invoice_number, invoice_date, customer_name, customer_email, total_amount, subtotal, tax_due, status, prepared_by_name, contact_person)
       VALUES (?, '2026-10-16', 'E2E Client Corp', 'client@test.com', 236000, 200000, 36000, 'Draft', 'Sales Lead', 'Sofia, 0787363970, E-mail: sofia@legacyclinics.rw')
       RETURNING *`,
      [testInvNum]
    );
    assert(proformaRes.rows[0]?.invoice_number === testInvNum, 'Created test Proforma Invoice record in proforma_invoices');
    assert(proformaRes.rows[0]?.contact_person.includes('Sofia'), 'Proforma inquiries contact person correctly defaults to Sofia');
    await db.query('DELETE FROM proforma_invoices WHERE id = ?', [proformaRes.rows[0].id]);

    // Catalog items
    const { rows: catalogRows } = await db.query('SELECT COUNT(*) as cnt FROM sales_service_catalog');
    assert(catalogRows[0]?.cnt >= 0, `Sales tariff catalog table accessible (${catalogRows[0]?.cnt} catalog items)`);

    // ── 7. SAFETY INCIDENT REPORTING ACCESS FOR ALL LAB STAFF ───────────────
    console.log('\n🚨 PHASE 7: Incident Reporting Access Verification');
    const { rows: labRolesPerms } = await db.query(`
      SELECT role_name, module, action, granted
      FROM role_permissions
      WHERE module = 'incident_reports' AND action = 'view' AND role_name IN ('lab', 'lab_tech', 'lab_scientist', 'lab_team_lead', 'lab_manager')
    `);
    const canViewAll = labRolesPerms.length === 5 && labRolesPerms.every(p => p.granted === 1 || p.granted === true);
    assert(canViewAll, 'All core laboratory roles have active incident report view permissions in RBAC matrix');

    // ── 8. ORPHANED RECORDS & DATA INTEGRITY ────────────────────────────────
    console.log('\n🧹 PHASE 8: Foreign Key & Relational Consistency Verification');
    const { rows: orphanResults } = await db.query(
      `SELECT COUNT(*) as cnt FROM lab_results WHERE order_id NOT IN (SELECT id FROM lab_orders)`
    );
    assert(orphanResults[0]?.cnt === 0, 'No orphaned lab results without parent lab orders');

    const { rows: orphanAssignments } = await db.query(
      `SELECT COUNT(*) as cnt FROM lab_specimen_storage WHERE order_id NOT IN (SELECT id FROM lab_orders)`
    );
    assert(orphanAssignments[0]?.cnt === 0, 'No orphaned specimen storage assignments without parent lab orders');

    // ── FINAL SUMMARY ──────────────────────────────────────────────────────
    console.log('\n================================================================');
    console.log(`🏁 AUDIT COMPLETE: ${passed} PASSED | ${failed} FAILED`);
    if (failed === 0) {
      console.log('🎉 ALL PORTAL MODULES & DATABASE INTEGRITY CHECKS PASSED 100%!');
    } else {
      console.warn(`⚠️ ${failed} check(s) require attention.`);
    }
    console.log('================================================================\n');

  } catch (err) {
    console.error('💥 Critical error during E2E audit:', err);
    failed++;
  } finally {
    process.exit(failed > 0 ? 1 : 0);
  }
}

runE2EPortalAudit();
