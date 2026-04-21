'use strict';
/**
 * Seed Script — generates realistic test data for:
 *   • 30 Cancellation Requests
 *   • 10 Refund Requests
 *   • 10 Incident Reports
 *
 * Uses existing users from the DB (matched by role).
 * Run: node backend/seed_test_data.js
 */

require('dotenv').config({ path: __dirname + '/.env' });
const db = require('./src/config/db');

// ── Helpers ───────────────────────────────────────────────────────────────────
const pick  = (arr) => arr[Math.floor(Math.random() * arr.length)];
const range = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pad   = (n) => String(n).padStart(6, '0');
const rwf   = (min, max) => range(min, max) * 1000;

const STATUSES_CANC   = ['pending','pending','pending','verified','approved','approved','rejected'];
const STATUSES_REFUND = ['pending','pending','verified','approved','rejected'];
const STATUSES_INC    = ['pending','pending','reviewed'];

const PATIENTS = [
  { name: 'Uwimana Jean Claude', pid: 'LC-001234' },
  { name: 'Mutesi Claudine',     pid: 'LC-002567' },
  { name: 'Habimana Eric',       pid: 'LC-003891' },
  { name: 'Mukamana Solange',    pid: 'LC-004120' },
  { name: 'Nzeyimana Patrick',   pid: 'LC-005348' },
  { name: 'Ingabire Viviane',    pid: 'LC-006712' },
  { name: 'Hakizimana Cedric',   pid: 'LC-007055' },
  { name: 'Uwineza Sandrine',    pid: 'LC-008293' },
  { name: 'Bizimana Lambert',    pid: 'LC-009467' },
  { name: 'Mukandutiye Alice',   pid: 'LC-010831' },
];

const PAYERS = ['RSSB-RAMA','MMI','Cogebanque','SORAS','Out-of-Pocket','Radiant','SONARWA'];
const PAYMENT_MODES = ['MoMo','Cash','Card','Bank Transfer'];

// ── Cancellation reasons (varied, realistic) ──────────────────────────────────
const CANC_REASONS = [
  'Patient was billed twice for the same laboratory service (CBC and urinalysis). Duplicate charge detected during end-of-day reconciliation.',
  'Wrong insurance payer was selected during billing. Patient is on RSSB-RAMA but was billed under Out-of-Pocket.',
  'Incorrect SID number was entered. The old SID does not match the patient in the HMS. Receipt must be voided and re-issued.',
  'Patient cancelled their appointment before the service was rendered. Receipt needs to be reversed.',
  'Service was billed but not performed due to equipment malfunction. Cancellation and reissue required.',
  'Patient requested a different package. The initial receipt covered the standard consultation but patient upgraded to a comprehensive package.',
  'Billing error: discount was not applied for RSSB card holder. Receipt to be cancelled and new one issued at correct rate.',
  'Wrong amount entered — cashier typed 150,000 RWF instead of 15,000 RWF. Customer alerted and receipt voided.',
  'Patient was discharged and receipt was generated before final doctor review adjusted the treatment plan.',
  'Receipt issued for Ward A bed but patient was admitted to Ward B. Billing code mismatch requires cancellation.',
  'Prescription changed by doctor after billing. Original medication receipt needs to be cancelled.',
  'Patient was billed for a procedure on the wrong date. Initial transaction date must be corrected.',
  'TAT results were delayed and patient left. Billing was processed in advance but service not delivered — receipt cancelled.',
  'Duplicate consultation fee charged — patient had already paid at reception but cashier processed again.',
  'Insurance claim rejected by SORAS due to missing pre-authorization code. Receipt cancelled pending resubmission.',
  'Patient paid cash but receipt was wrongly generated under MoMo. Mode of payment correction requires cancellation.',
  'Wrong PID linked to receipt. Belongs to another patient. Must be voided immediately.',
  'Receipt issued to wrong patient — name and PID mismatch discovered by nursing team during medication administration.',
  'Old SID used instead of newly generated SID after patient transfer between facilities. Receipt must be re-issued.',
  'Patient opted to use RSSB benefits but was initially billed as private. Receipt cancelled and reissued under RSSB.',
  'Cogebanque pre-approved amount was lower than billed. Receipt cancelled and corrected amount resubmitted.',
  'Radiant insurance does not cover this procedure. Reversal required and patient informed of out-of-pocket cost.',
  'Patient was billed for admission but treated as outpatient. Admission charge must be reversed.',
  'Service code entered incorrectly in HMS — billed for ultrasound when procedure was an X-ray.',
  'Lab package bundled incorrectly — individual tests billed separately when patient was on a comprehensive package.',
  'Pharmacist dispensed generic but patient was billed for branded medication. Receipt to be corrected.',
  'Doctor added additional investigation post-discharge. Original receipt cancelled to include new tests in combined billing.',
  'Wrong exchange rate applied for USD-billed patient account. Receipt cancelled and recalculated at correct rate.',
  'Rectification needed: patient transferred from private to general ward but billed at private rate throughout.',
  'Patient receipt was generated before identification was completed. Receipt voided — patient left facility before service.',
];

// ── Refund reasons ────────────────────────────────────────────────────────────
const REFUND_REASONS = [
  'Patient paid cash in advance for elective procedure which was later cancelled at doctor\'s discretion. Full refund requested.',
  'Double payment received via MoMo and Bank Transfer for the same service. One payment to be refunded immediately.',
  'RSSB benefit was applied after patient had already paid out-of-pocket in full. Excess payment to be refunded.',
  'Lab service could not be performed due to reagent shortage. Patient paid in advance and refund is due.',
  'Patient discharged earlier than planned. Pre-paid three-day ward fee needs partial refund for unused nights.',
  'Overpayment made at reception — patient gave 100,000 RWF for a 75,000 RWF service and change was not returned.',
  'Patient deceased before service was rendered. Family requesting full refund of all pre-paid services.',
  'Insurance covered service in full after patient had already paid cash. Full refund of 45,000 RWF required.',
  'Duplicate MoMo transaction detected — patient received SMS confirmation for two transactions of 30,000 RWF each.',
  'Treatment plan changed by specialist. Initial payment covered procedure that was later substituted with a lower-cost option.',
];

// ── Incident data pairs [type, description] ───────────────────────────────────
const INCIDENTS = [
  ['Near Miss',     'Patient received medication intended for another patient with a similar name. Nurse detected the error before administration. Contributing factor: illegible prescription handwriting.'],
  ['Adverse Event', 'Patient experienced allergic reaction (urticaria and mild swelling) following intramuscular injection of Amoxicillin. Not documented in allergy history. Adrenaline administered immediately.'],
  ['Near Miss',     'Wrong PID entered during billing for a paediatric patient. Discovered during verification stage. Receipt voided and reissued correctly.'],
  ['Adverse Event', 'Patient slipped and fell in the radiology corridor while walking unassisted. Superficial laceration on left palm. Dressed by nursing team on duty.'],
  ['Near Miss',     'Laboratory released glucose results for patient LC-007055 under wrong patient ID during night shift. Results recalled and corrected before clinician acted on them.'],
  ['Adverse Event', 'Needle stick injury sustained by a Cleaning staff member while disposing of improperly segregated sharps waste in Ward 3. PEP protocol initiated.'],
  ['Near Miss',     'Fire extinguisher on Floor 2, Radiology Wing was found unrefilled during routine safety inspection. Tagged and escalated to Logistics for immediate replacement.'],
  ['Adverse Event', 'Equipment malfunction: infusion pump in ICU Unit 2 alarmed repeatedly and auto-suspended infusion. Nurse switched to manual drip while pump was sent for biomedical check.'],
  ['Sentinel Event','Staff member was found working under visible substance influence during morning shift in the pharmacy. Immediate suspension and HR notified. Patients reviewed for dispensing errors.'],
  ['Near Miss',     'Patient with history of seizures was left unattended in waiting area for 40 minutes due to staffing shortage. No adverse outcome but risk escalated to nursing manager.'],
];

const INC_DEPARTMENTS  = ['Clinical','Pharmacy','Laboratory','Radiology','ICU','Nursing','Logistics','Human Resources','Customer Care','Cross-Cutting'];
const INC_AREAS        = ['Ward 1','Ward 2','Ward 3','Radiology Corridor','ICU Unit 2','Pharmacy','Reception','Laboratory','Outpatient','Emergency'];
const CONTRIBUTING     = ['Staff fatigue','Communication gap','Inadequate supervision','Equipment failure','Staffing shortage','Process deviation','Poor labelling','Inadequate training'];
const IMMEDIATE_ACTS   = ['Incident reported to nurse in charge','Patient assessed and treated','Equipment quarantined','HR notified','Safety officer alerted','Corrective billing processed','PEP protocol initiated'];
const PREVENTION       = ['Staff refresher training scheduled','SOP updated','Double-check process introduced','Equipment maintenance plan reviewed','Staffing levels to be reviewed','Safety walkthrough initiated'];

// ── Main seeder ───────────────────────────────────────────────────────────────
async function seed() {
  console.log('\n🌱  Legacy Clinics — Test Data Seeder');
  console.log('══════════════════════════════════════\n');

  // 1. Fetch existing users by role
  const { rows: users } = await db.query(`SELECT id, full_name, role FROM users ORDER BY role`);
  if (!users.length) { console.error('❌  No users found. Please create users first.'); process.exit(1); }

  const cashiers  = users.filter(u => ['cashier','principal_cashier'].includes(u.role));
  const reporters = users.filter(u => ['operations_staff','customer_care','cashier','principal_cashier'].includes(u.role));
  const managers  = users.filter(u => ['sales_manager','deputy_coo'].includes(u.role));
  const coos      = users.filter(u => ['coo','chairman','admin'].includes(u.role));

  // Fallback: use any user if roles are limited
  const anyUser = (arr) => arr.length ? arr : users;

  console.log(`👥  Found ${users.length} users:`);
  users.forEach(u => console.log(`    • ${u.full_name} (${u.role})`));
  console.log('');

  // ── 2. Cancellations ──────────────────────────────────────────────────────
  console.log('📄  Seeding 30 cancellations...');
  let cancCount = 0;
  for (let i = 0; i < 30; i++) {
    const patient   = pick(PATIENTS);
    const cashier   = pick(anyUser(cashiers));
    const manager   = pick(anyUser(managers));
    const coo       = pick(anyUser(coos));
    const status    = pick(STATUSES_CANC);
    const amount    = rwf(5, 200);
    const txDate    = `2025-${String(range(1,12)).padStart(2,'0')}-${String(range(1,28)).padStart(2,'0')}`;
    const rectDate  = `2026-${String(range(1,4)).padStart(2,'0')}-${String(range(1,15)).padStart(2,'0')}`;

    const sql = `
      INSERT INTO cancellation_requests (
        patient_full_name, pid_number, old_sid_number, new_sid_number,
        telephone_number, insurance_payer, total_amount_cancelled,
        original_receipt_number, rectified_receipt_number,
        initial_transaction_date, rectified_date, reason_for_cancellation,
        created_by, status,
        verified_by, verified_at,
        approved_by, approved_at,
        rejected_by, rejection_comment, rejected_at,
        created_at, updated_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,
        $15,$16,$17,$18,$19,$20,$21,
        datetime('now', '-' || $22 || ' days'),
        datetime('now', '-' || $23 || ' days')
      )`;

    const verifiedBy  = ['verified','approved','rejected'].includes(status) ? manager.id : null;
    const verifiedAt  = verifiedBy ? `datetime('now', '-5 days')` : null;
    const approvedBy  = status === 'approved' ? coo.id : null;
    const rejectedBy  = status === 'rejected' ? coo.id : null;
    const rejComment  = status === 'rejected' ? 'Request reviewed and denied — insufficient justification provided.' : null;

    await db.query(sql, [
      patient.name, patient.pid,
      `SID-OLD-${pad(i+1)}`, `SID-NEW-${pad(i+1)}`,
      `07${range(20,99)}${range(100000,999999)}`,
      pick(PAYERS), amount,
      `RCPT-OLD-${pad(i+1)}`, `RCPT-NEW-${pad(i+1)}`,
      txDate, rectDate,
      CANC_REASONS[i % CANC_REASONS.length],
      cashier.id, status,
      verifiedBy, verifiedBy ? 'now' : null,
      approvedBy, approvedBy ? 'now' : null,
      rejectedBy, rejComment, rejectedBy ? 'now' : null,
      range(1, 90), range(0, 5),
    ]);
    cancCount++;
  }
  console.log(`    ✅  ${cancCount} cancellations inserted\n`);

  // ── 3. Refunds ────────────────────────────────────────────────────────────
  console.log('💰  Seeding 10 refunds...');
  let refundCount = 0;
  for (let i = 0; i < 10; i++) {
    const patient  = pick(PATIENTS);
    const cashier  = pick(anyUser(cashiers));
    const manager  = pick(anyUser(managers));
    const coo      = pick(anyUser(coos));
    const status   = pick(STATUSES_REFUND);
    const total    = rwf(10, 150);
    const refund   = Math.floor(total * pick([0.5, 0.75, 1.0]));
    const txDate   = `2026-${String(range(1,4)).padStart(2,'0')}-${String(range(1,14)).padStart(2,'0')}`;

    const verifiedBy = ['verified','approved','rejected'].includes(status) ? manager.id : null;
    const approvedBy = status === 'approved' ? coo.id : null;
    const rejectedBy = status === 'rejected' ? coo.id : null;
    const rejComment = status === 'rejected' ? 'Refund request rejected — insufficient supporting documentation.' : null;

    await db.query(`
      INSERT INTO refund_requests (
        patient_full_name, pid_number, sid_number,
        telephone_number, insurance_payer,
        momo_code, total_amount_paid, amount_to_be_refunded,
        amount_paid_by, original_receipt_number,
        initial_transaction_date, reason_for_refund,
        created_by, status,
        verified_by, verified_at,
        approved_by, approved_at,
        rejected_by, rejection_comment, rejected_at,
        created_at, updated_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,
        $15,$16,$17,$18,$19,$20,$21,
        datetime('now', '-' || $22 || ' days'),
        datetime('now', '-' || $23 || ' days')
      )`, [
      patient.name, patient.pid, `SID-${pad(i+100)}`,
      `07${range(20,99)}${range(100000,999999)}`, pick(PAYERS),
      `*182*8*1*${range(100000,999999)}#`, total, refund,
      pick(PAYMENT_MODES), `RCPT-REF-${pad(i+1)}`,
      txDate, REFUND_REASONS[i % REFUND_REASONS.length],
      cashier.id, status,
      verifiedBy, verifiedBy ? 'now' : null,
      approvedBy, approvedBy ? 'now' : null,
      rejectedBy, rejComment, rejectedBy ? 'now' : null,
      range(1, 60), range(0, 3),
    ]);
    refundCount++;
  }
  console.log(`    ✅  ${refundCount} refunds inserted\n`);

  // ── 4. Incidents ──────────────────────────────────────────────────────────
  console.log('🚨  Seeding 10 incidents...');
  let incCount = 0;
  for (let i = 0; i < 10; i++) {
    const reporter  = pick(anyUser(reporters));
    const reviewer  = pick(anyUser(coos.concat(anyUser(managers))));
    const [type, description] = INCIDENTS[i % INCIDENTS.length];
    const status    = pick(STATUSES_INC);
    const patient   = pick(PATIENTS);

    const reviewedBy = status === 'reviewed' ? reviewer.id : null;
    const reviewComment = reviewedBy ? 'Reviewed by QA. Corrective actions logged and communicated to department head.' : null;

    await db.query(`
      INSERT INTO incident_reports (
        incident_type, department, area_of_incident, names_involved,
        pid_number, description, contributing_factors,
        immediate_actions, prevention_measures,
        created_by, status,
        reviewed_by, reviewed_at, review_comments,
        created_at, updated_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,
        $12,$13,$14,
        datetime('now', '-' || $15 || ' days'),
        datetime('now', '-' || $16 || ' days')
      )`, [
      type, pick(INC_DEPARTMENTS), pick(INC_AREAS),
      reporter.full_name, patient.pid, description,
      pick(CONTRIBUTING), pick(IMMEDIATE_ACTS), pick(PREVENTION),
      reporter.id, status,
      reviewedBy, reviewedBy ? 'now' : null, reviewComment,
      range(1, 45), range(0, 2),
    ]);
    incCount++;
  }
  console.log(`    ✅  ${incCount} incidents inserted\n`);

  // ── Summary ───────────────────────────────────────────────────────────────
  const { rows: [cs] } = await db.query(`SELECT COUNT(*) AS n FROM cancellation_requests`);
  const { rows: [rs] } = await db.query(`SELECT COUNT(*) AS n FROM refund_requests`);
  const { rows: [is] } = await db.query(`SELECT COUNT(*) AS n FROM incident_reports`);
  console.log('══════════════════════════════════════');
  console.log('📊  Database totals after seed:');
  console.log(`    Cancellations : ${cs.n}`);
  console.log(`    Refunds       : ${rs.n}`);
  console.log(`    Incidents     : ${is.n}`);
  console.log('══════════════════════════════════════\n');
  console.log('✅  Done! Refresh the AI Insights page to see classifications.\n');
  process.exit(0);
}

seed().catch(err => { console.error('❌  Seeder failed:', err.message); process.exit(1); });
