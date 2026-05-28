'use strict';
/**
 * Seed 5 clinical sheet observations using real patients from sukraa_patients.
 * Run: node scripts/seed_clinical_sheets.js
 */
require('dotenv').config();
const db = require('../src/config/db');

const CREATED_BY = 5; // NIYOMUGABO Valery (admin)
const RN_NAME    = 'NIYOMUGABO Valery';

// ── Helper: parse DD/MM/YYYY → YYYY-MM-DD ─────────────────────────────────────
function parseDob(dob) {
  if (!dob) return '';
  if (dob.includes('/')) {
    const [d, m, y] = dob.split('/');
    return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
  }
  return dob.substring(0, 10);
}

// ── 5 Clinical sheet payloads ─────────────────────────────────────────────────
const SHEETS = [
  // ── 1: MIGABO NYAMUHENDA ELOI — Hypertension + Fever ────────────────────────
  {
    patient_id: '19030701',
    queue_id:   'Q-TEST-001',
    patient_name: 'MIGABO NYAMUHENDA ELOI',
    identification: {
      last_name: 'MIGABO', first_name: 'NYAMUHENDA ELOI',
      occupation: 'Teacher', national_id: '1199780012345678', gender: 'Male',
      dob: '1997-01-19', pid: '19030701',
      appt_date_no: 'Walk-in / No Appointment',
      insurance: 'RSSB (Community)',
      date: '2026-05-26', time: '08:00', rn: RN_NAME,
    },
    triage: {
      prev_illness_med: 'Hypertension (diagnosed 2020)',
      prev_illness_surg: 'None',
      allergy_1: 'Sulfonamides', allergy_2: '',
      temp: '38.8', pulse: '105', rr: '22', bp: '158/98',
      weight: '78', spo2: '96',
      general_comments: 'Patient presents febrile and hypertensive. Tachycardic at 105 bpm. BP elevated at 158/98 mmHg. SpO2 acceptable on room air. Allergy to sulfonamides noted and documented. Antihypertensive and antipyretic therapy initiated.',
    },
    progress_notes: [
      { datetime: '2026-05-26T08:15', note: 'Patient assessed on arrival. Temp 38.8°C, HR 105 bpm, BP 158/98 mmHg. Febrile and hypertensive. IV access secured. Paracetamol 1g IV administered for fever. Amlodipine 5mg PO given for BP control. Patient tolerated medications well. Monitoring ongoing.', signature: RN_NAME },
      { datetime: '2026-05-26T10:00', note: 'Reassessment: Temp 37.9°C, HR 92 bpm, BP 142/88 mmHg. Improvement noted. Patient alert and oriented. Continues to monitor.', signature: RN_NAME },
    ],
    medication_mar: {
      interventions: [
        { name: 'Paracetamol 1g', dose: '1g', frequency: 'Q6H', route: 'IV', start_time: '08:00', end_time: '20:00' },
        { name: 'Amlodipine', dose: '5mg', frequency: 'OD', route: 'PO', start_time: '08:00', end_time: '' },
        { name: 'Normal Saline 0.9%', dose: '500ml', frequency: 'STAT', route: 'IVI', start_time: '08:30', end_time: '10:30' },
        { name: '', dose: '', frequency: '', route: '', start_time: '', end_time: '' },
      ],
      prescriber: 'Dr. KAMANZI Robert',
      admin_logs: [
        { time: '08:00', initials: 'V.N' }, { time: '08:30', initials: 'V.N' },
        { time: '14:00', initials: 'V.N' }, { time: '', initials: '' },
        { time: '', initials: '' }, { time: '', initials: '' },
        { time: '', initials: '' }, { time: '', initials: '' },
      ],
      admin_initials: 'V.N',
      admin_names: 'NIYOMUGABO Valery',
    },
    sbar: {
      content: `SITUATION:\nMIGABO NYAMUHENDA ELOI (Male, DOB: 19/01/1997) is a 29-year-old teacher presenting with fever and uncontrolled hypertension. Vitals: Temp 38.8°C, HR 105 bpm, BP 158/98 mmHg, SpO2 96%, RR 22/min.\n\nBACKGROUND:\nKnown hypertensive since 2020. Allergy to sulfonamides (documented). No surgical history. Currently on community RSSB insurance.\n\nASSESSMENT:\nFebrile with tachycardia and hypertension. IV access established. Paracetamol 1g IV and Amlodipine 5mg PO administered. 500ml Normal Saline initiated. Improvement noted after 2 hours: Temp 37.9°C, BP 142/88.\n\nRECOMMENDATION:\nContinue antipyretic and antihypertensive therapy. Monitor vitals Q2H. Physician review if BP remains >140/90 after next dose. Discharge planning when afebrile x24h.`,
      reported_by: RN_NAME, reported_sign_time: '10:30',
      received_by: '', received_sign_time: '',
    },
  },

  // ── 2: DUSABIMANA M CLAIRE — Malaria + Dehydration ───────────────────────────
  {
    patient_id: '20007694',
    queue_id:   'Q-TEST-002',
    patient_name: 'DUSABIMANA M CLAIRE',
    identification: {
      last_name: 'DUSABIMANA', first_name: 'M CLAIRE',
      occupation: 'Businesswoman', national_id: '', gender: 'Female',
      dob: '1982-01-01', pid: '20007694',
      appt_date_no: 'Walk-in / No Appointment',
      insurance: 'Soras',
      date: '2026-05-25', time: '09:30', rn: RN_NAME,
    },
    triage: {
      prev_illness_med: 'None', prev_illness_surg: 'Appendectomy (2015)',
      allergy_1: 'Penicillin', allergy_2: '',
      temp: '39.2', pulse: '112', rr: '24', bp: '100/65',
      weight: '62', spo2: '97',
      general_comments: 'Patient febrile (39.2°C), tachycardic (112 bpm), and mildly hypotensive (100/65 mmHg), consistent with severe malaria presentation. RDT positive for P. falciparum. Dehydration noted. IV access established. Fluid resuscitation initiated. Antimalarial therapy commenced as per protocol. Allergy to Penicillin documented.',
    },
    progress_notes: [
      { datetime: '2026-05-25T09:45', note: 'RDT: P. falciparum positive. Patient febrile and dehydrated. BP 100/65 mmHg. IV Ringer\'s Lactate 1000ml started. Artesunate IV 2.4mg/kg loading dose administered. Anti-emetic (Ondansetron 4mg IV) given for nausea. Patient monitored closely.', signature: RN_NAME },
      { datetime: '2026-05-25T12:00', note: 'Temp reduced to 38.1°C. HR 98 bpm, BP 108/72 mmHg. Patient improving with fluids and antimalarial therapy. Oral intake encouraged. Second artesunate dose due at 21:45.', signature: RN_NAME },
      { datetime: '2026-05-25T18:00', note: 'Patient stable. Temp 37.6°C, HR 88 bpm, BP 114/76 mmHg. Tolerating sips of water. Continue monitoring and antimalarial protocol.', signature: RN_NAME },
    ],
    medication_mar: {
      interventions: [
        { name: 'IV Artesunate', dose: '2.4mg/kg', frequency: 'At 0h, 12h, 24h then OD', route: 'IV', start_time: '09:45', end_time: '09:45' },
        { name: 'Ringer Lactate', dose: '1000ml', frequency: 'STAT', route: 'IVI', start_time: '09:45', end_time: '11:45' },
        { name: 'Ondansetron', dose: '4mg', frequency: 'TDS PRN', route: 'IV', start_time: '09:50', end_time: '' },
        { name: 'Paracetamol 1g', dose: '1g', frequency: 'Q6H', route: 'PO', start_time: '10:00', end_time: '22:00' },
      ],
      prescriber: 'Dr. UWIMANA Grace',
      admin_logs: [
        { time: '09:45', initials: 'V.N' }, { time: '09:50', initials: 'V.N' },
        { time: '10:00', initials: 'V.N' }, { time: '16:00', initials: 'V.N' },
        { time: '21:45', initials: 'V.N' }, { time: '', initials: '' },
        { time: '', initials: '' }, { time: '', initials: '' },
      ],
      admin_initials: 'V.N',
      admin_names: 'NIYOMUGABO Valery',
    },
    sbar: {
      content: `SITUATION:\nDUSABIMANA M CLAIRE (Female, DOB: 01/01/1982), 44-year-old businesswoman, presents with fever (39.2°C), tachycardia (HR: 112 bpm), and mild hypotension (BP: 100/65 mmHg). RDT confirmed P. falciparum malaria.\n\nBACKGROUND:\nAllergy to Penicillin — documented. Prior surgical history: appendectomy 2015. No chronic medical conditions.\n\nASSESSMENT:\nSevere malaria with dehydration. IV artesunate loading dose administered. Fluid resuscitation with Ringer's Lactate 1000ml. Anti-emetic therapy given. By 18:00 — Temp 37.6°C, HR 88 bpm, BP 114/76 mmHg. Patient improving.\n\nRECOMMENDATION:\nContinue IV artesunate per schedule (0h, 12h, 24h then OD). Maintain IV access. Monitor blood glucose Q4H (malaria hypoglycemia risk). Transition to oral AL (Coartem) once tolerating oral intake. Daily CBC and malaria smear.`,
      reported_by: RN_NAME, reported_sign_time: '18:30',
      received_by: '', received_sign_time: '',
    },
  },

  // ── 3: UZABAKIRIHO ERIC — Post-op pain management ────────────────────────────
  {
    patient_id: '21008467',
    queue_id:   'Q-TEST-003',
    patient_name: 'UZABAKIRIHO ERIC',
    identification: {
      last_name: 'UZABAKIRIHO', first_name: 'ERIC',
      occupation: 'Mechanic', national_id: '1199378012345600', gender: 'Male',
      dob: '1993-10-10', pid: '21008467',
      appt_date_no: 'Walk-in / No Appointment',
      insurance: 'Private (Cash)',
      date: '2026-05-24', time: '14:00', rn: RN_NAME,
    },
    triage: {
      prev_illness_med: 'None', prev_illness_surg: 'Inguinal hernia repair (2026-05-23)',
      allergy_1: '', allergy_2: '',
      temp: '37.2', pulse: '88', rr: '18', bp: '122/78',
      weight: '82', spo2: '98',
      general_comments: 'Day-1 post-operative patient following inguinal hernia repair. Vitals stable. Afebrile. Surgical wound intact, dressing clean and dry. Patient reports pain score 6/10 at wound site. Adequate analgesia initiated. Ambulating with support.',
    },
    progress_notes: [
      { datetime: '2026-05-24T14:15', note: 'Day-1 post-op assessment. Patient alert and oriented. Pain score 6/10. Vital signs stable — Temp 37.2°C, HR 88 bpm, BP 122/78 mmHg, SpO2 98%. Wound dressing reviewed — clean and dry, no signs of infection. Diclofenac 75mg IM administered. Patient encouraged to ambulate. IV fluids running at 80ml/hr.', signature: RN_NAME },
      { datetime: '2026-05-24T18:00', note: 'Reassessment: Pain score 3/10. Patient more comfortable. Tolerating clear fluids orally. Diet commenced. IV fluids discontinued. Oral paracetamol prescribed. Discharge planning initiated for tomorrow.', signature: RN_NAME },
    ],
    medication_mar: {
      interventions: [
        { name: 'Diclofenac', dose: '75mg', frequency: 'BD', route: 'IM', start_time: '08:00', end_time: '20:00' },
        { name: 'Paracetamol 1g', dose: '1g', frequency: 'QID', route: 'PO', start_time: '08:00', end_time: '22:00' },
        { name: 'Metronidazole', dose: '500mg', frequency: 'TDS', route: 'IV', start_time: '06:00', end_time: '22:00' },
        { name: 'Normal Saline 0.9%', dose: '1000ml', frequency: 'At 80ml/hr', route: 'IVI', start_time: '14:00', end_time: '18:30' },
      ],
      prescriber: 'Dr. HAKIZIMANA Jean',
      admin_logs: [
        { time: '08:00', initials: 'V.N' }, { time: '14:00', initials: 'V.N' },
        { time: '14:15', initials: 'V.N' }, { time: '18:00', initials: 'V.N' },
        { time: '20:00', initials: 'V.N' }, { time: '22:00', initials: 'V.N' },
        { time: '', initials: '' }, { time: '', initials: '' },
      ],
      admin_initials: 'V.N',
      admin_names: 'NIYOMUGABO Valery',
    },
    sbar: {
      content: `SITUATION:\nUZABAKIRIHO ERIC (Male, DOB: 10/10/1993), Day-1 post-operative patient following elective inguinal hernia repair (2026-05-23). Stable vitals: Temp 37.2°C, HR 88 bpm, BP 122/78 mmHg, SpO2 98%.\n\nBACKGROUND:\nNo known allergies. No chronic medical conditions. Hernia repair performed under spinal anaesthesia.\n\nASSESSMENT:\nWound site clean and intact. Pain score improved from 6/10 to 3/10 following IM Diclofenac. IV fluids discontinued. Tolerating oral diet. Metronidazole course completed.\n\nRECOMMENDATION:\nContinue oral analgesia (Paracetamol + Diclofenac PO). Wound review tomorrow. Discharge if pain controlled and tolerating normal diet. Patient education on wound care and activity restriction post-discharge.`,
      reported_by: RN_NAME, reported_sign_time: '20:00',
      received_by: '', received_sign_time: '',
    },
  },

  // ── 4: NIRERE ESPERENCE — Preeclampsia monitoring ────────────────────────────
  {
    patient_id: '20002832',
    queue_id:   'Q-TEST-004',
    patient_name: 'NIRERE ESPERENCE',
    identification: {
      last_name: 'NIRERE', first_name: 'ESPERENCE',
      occupation: 'Farmer', national_id: '', gender: 'Female',
      dob: '1989-02-04', pid: '20002832',
      appt_date_no: 'Walk-in / No Appointment',
      insurance: 'RSSB (Community)',
      date: '2026-05-26', time: '07:00', rn: RN_NAME,
    },
    triage: {
      prev_illness_med: 'Preeclampsia — current pregnancy (G3P2)', prev_illness_surg: 'Previous C-section x2',
      allergy_1: 'Aspirin', allergy_2: '',
      temp: '37.0', pulse: '96', rr: '20', bp: '156/102',
      weight: '74', spo2: '98',
      general_comments: 'G3P2 patient at 36 weeks gestation with confirmed preeclampsia. BP 156/102 mmHg — severe range. Headache reported. No visual changes. Protein +++ on urinalysis. Allergy to aspirin documented. MgSO4 infusion initiated for seizure prophylaxis. Nifedipine given for BP control. Foetal heart rate monitoring in progress.',
    },
    progress_notes: [
      { datetime: '2026-05-26T07:15', note: 'Patient presents with severe hypertension (BP 156/102), headache, and proteinuria +++. 36 weeks gestation. IV access x2 established. MgSO4 4g loading dose IV over 20 min administered. Nifedipine 10mg PO given. FHR 148 bpm — reassuring. Urine output monitoring commenced via IDC.', signature: RN_NAME },
      { datetime: '2026-05-26T08:30', note: 'BP 144/90 mmHg — improving. Headache partially resolved. MgSO4 maintenance infusion (1g/hr) running. Respiratory rate 20/min, reflexes intact. Urine output 60ml/hr. Obstetrics team informed. Delivery planning underway.', signature: RN_NAME },
    ],
    medication_mar: {
      interventions: [
        { name: 'MgSO4 (Magnesium Sulphate)', dose: '4g loading, then 1g/hr', frequency: 'Continuous infusion', route: 'IV', start_time: '07:15', end_time: '' },
        { name: 'Nifedipine', dose: '10mg', frequency: 'TDS PRN', route: 'PO', start_time: '07:20', end_time: '' },
        { name: 'Normal Saline 0.9%', dose: '500ml', frequency: 'At 30ml/hr', route: 'IVI', start_time: '07:15', end_time: '' },
        { name: 'Calcium Gluconate 10%', dose: '10ml (antidote on standby)', frequency: 'PRN (MgSO4 toxicity)', route: 'IV', start_time: '', end_time: '' },
      ],
      prescriber: 'Dr. MUKAMANA Solange (OB/GYN)',
      admin_logs: [
        { time: '07:15', initials: 'V.N' }, { time: '07:20', initials: 'V.N' },
        { time: '08:00', initials: 'V.N' }, { time: '', initials: '' },
        { time: '', initials: '' }, { time: '', initials: '' },
        { time: '', initials: '' }, { time: '', initials: '' },
      ],
      admin_initials: 'V.N',
      admin_names: 'NIYOMUGABO Valery',
    },
    sbar: {
      content: `SITUATION:\n⚠ ALERT: HYPERTENSION CRISIS, RESP_DISTRESS. NIRERE ESPERENCE (Female, DOB: 04/02/1989), G3P2 at 36 weeks gestation, presents with severe preeclampsia. BP 156/102 mmHg, HR 96 bpm, proteinuria +++, headache. Allergy: Aspirin.\n\nBACKGROUND:\nPrevious 2 C-sections. Preeclampsia diagnosed in this pregnancy. Community RSSB insurance.\n\nASSESSMENT:\nSevere preeclampsia with hypertension in crisis range. MgSO4 4g IV loading dose administered, maintenance 1g/hr commenced. Nifedipine 10mg given. BP improving to 144/90 by 08:30. FHR reassuring at 148 bpm. Urine output adequate at 60ml/hr. Calcium gluconate kept at bedside as MgSO4 antidote.\n\nRECOMMENDATION:\nURGENT: Continue MgSO4 infusion — monitor RR, reflexes, and urine output Q1H. Keep calcium gluconate immediately available. Monitor FHR continuously. Delivery decision by OB team. Report immediately if: RR <12, absent reflexes, or urine output <30ml/hr.`,
      reported_by: RN_NAME, reported_sign_time: '08:30',
      received_by: '', received_sign_time: '',
    },
  },

  // ── 5: SHYAKA EMMANUEL — Asthma exacerbation ─────────────────────────────────
  {
    patient_id: '22026628',
    queue_id:   'Q-TEST-005',
    patient_name: 'SHYAKA EMMANUEL',
    identification: {
      last_name: 'SHYAKA', first_name: 'EMMANUEL',
      occupation: 'Student', national_id: '', gender: 'Male',
      dob: '2005-12-16', pid: '22026628',
      appt_date_no: 'Walk-in / No Appointment',
      insurance: 'RSSB (Community)',
      date: '2026-05-26', time: '11:00', rn: RN_NAME,
    },
    triage: {
      prev_illness_med: 'Bronchial Asthma (since childhood)', prev_illness_surg: 'None',
      allergy_1: 'NSAIDs (ibuprofen)', allergy_2: 'Aspirin',
      temp: '37.1', pulse: '118', rr: '28', bp: '128/80',
      weight: '58', spo2: '91',
      general_comments: 'PRIORITY: Significant tachypnoea (RR: 28) and severe hypoxaemia (SpO2: 91%) on RA. 20-year-old male with known asthma presenting with acute exacerbation. Expiratory wheeze audible. Accessory muscle use noted. Salbutamol nebulisation commenced immediately. Supplemental O2 applied. NSAIDs and Aspirin allergy documented — avoid.',
    },
    progress_notes: [
      { datetime: '2026-05-26T11:05', note: 'Acute asthma exacerbation. SpO2 91% on RA, RR 28/min, HR 118 bpm. O2 applied at 4L/min via nasal prongs — SpO2 improved to 95%. First salbutamol nebulisation (2.5mg) administered. IV access established. Hydrocortisone 100mg IV given. Ipratropium added to second neb. Patient appears anxious but cooperative.', signature: RN_NAME },
      { datetime: '2026-05-26T11:40', note: 'SpO2 97%, HR 104 bpm, RR 22/min after 2 nebulisations. Wheeze reduced. Accessory muscle use resolved. Patient reports significant improvement in breathing. Third neb ordered PRN. Oral prednisolone 40mg to be given before discharge. Asthma action plan to be reviewed.', signature: RN_NAME },
    ],
    medication_mar: {
      interventions: [
        { name: 'Salbutamol 2.5mg', dose: '2.5mg', frequency: 'Q20min x3, then Q4H PRN', route: 'Neb', start_time: '11:05', end_time: '' },
        { name: 'Ipratropium 0.5mg', dose: '0.5mg', frequency: 'TDS', route: 'Neb', start_time: '11:25', end_time: '' },
        { name: 'Hydrocortisone', dose: '100mg', frequency: 'Q8H', route: 'IV', start_time: '11:10', end_time: '' },
        { name: 'Prednisolone', dose: '40mg', frequency: 'OD (5 days)', route: 'PO', start_time: '12:00', end_time: '' },
      ],
      prescriber: 'Dr. HABIMANA Pierre',
      admin_logs: [
        { time: '11:05', initials: 'V.N' }, { time: '11:10', initials: 'V.N' },
        { time: '11:25', initials: 'V.N' }, { time: '11:45', initials: 'V.N' },
        { time: '12:00', initials: 'V.N' }, { time: '', initials: '' },
        { time: '', initials: '' }, { time: '', initials: '' },
      ],
      admin_initials: 'V.N',
      admin_names: 'NIYOMUGABO Valery',
    },
    sbar: {
      content: `SITUATION:\n⚠ ALERT: RESP_DISTRESS, HYPOXIA, TACHYCARDIA. SHYAKA EMMANUEL (Male, DOB: 16/12/2005), 20-year-old student with known asthma presenting with acute exacerbation. SpO2 91% on RA, RR 28/min, HR 118 bpm, expiratory wheeze. NSAID and Aspirin allergy — avoid.\n\nBACKGROUND:\nBronchial asthma since childhood. No surgical history. Community RSSB insurance. Triggers unknown at this time.\n\nASSESSMENT:\nSevere asthma exacerbation. O2 at 4L/min applied. Three salbutamol nebs administered + ipratropium. Hydrocortisone 100mg IV given. SpO2 improved to 97% by 11:40. RR 22/min, HR 104 bpm, wheeze reduced, accessory muscle use resolved.\n\nRECOMMENDATION:\nContinue salbutamol PRN Q4H. Complete hydrocortisone course Q8H. Discharge on prednisolone 40mg OD x5 days. Provide written asthma action plan. Follow-up at chest clinic in 1 week. Advise to avoid known triggers and NSAIDs/Aspirin strictly.`,
      reported_by: RN_NAME, reported_sign_time: '12:00',
      received_by: '', received_sign_time: '',
    },
  },
];

// ── Seed function ─────────────────────────────────────────────────────────────
async function seed() {
  console.log('🌱 Seeding 5 clinical sheet test records...\n');

  for (const sheet of SHEETS) {
    const { patient_id, queue_id, patient_name, identification, triage, progress_notes, medication_mar, sbar } = sheet;

    // Check if already exists
    const existing = await db.query(
      'SELECT id FROM clinical_observations WHERE patient_id = $1 AND queue_id = $2',
      [patient_id, queue_id]
    );

    if (existing.rows.length > 0) {
      console.log(`⚠  ${patient_name} (${queue_id}) — already exists, skipping.`);
      continue;
    }

    await db.query(
      `INSERT INTO clinical_observations
         (patient_id, queue_id, patient_name, identification_json, triage_json, progress_notes_json, medication_mar_json, sbar_json, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Draft', $9)`,
      [
        patient_id, queue_id, patient_name,
        JSON.stringify(identification),
        JSON.stringify(triage),
        JSON.stringify(progress_notes),
        JSON.stringify(medication_mar),
        JSON.stringify(sbar),
        CREATED_BY,
      ]
    );
    console.log(`✅ ${patient_name.padEnd(35)} (${queue_id}) — seeded.`);
  }

  console.log('\n🎉 Done! Open a patient in the Nursing Hub to view their clinical sheet.');
  process.exit(0);
}

seed().catch(err => { console.error('❌ Seed failed:', err.message); process.exit(1); });
