'use strict';
require('dotenv').config();
const dbConn = require('./src/config/db');
const client = dbConn.client;
const bcrypt = require('bcryptjs');
const { INVENTORY_ITEMS, generateSkuPrefix } = require('./src/controllers/clinicalController');

async function seed() {
  try {
    console.log('🌱 Starting Turso Database Initialization...');

    // 1. Create Tables (LibSQL/SQLite compatible)
    console.log('📋 Creating tables...');
    
    await client.execute(`
      CREATE TABLE IF NOT EXISTS roles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        display_name TEXT NOT NULL
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        full_name TEXT NOT NULL,
        username TEXT UNIQUE NOT NULL,
        email TEXT,
        password_hash TEXT NOT NULL,
        role_id INTEGER REFERENCES roles(id),
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS incident_reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        incident_type TEXT NOT NULL,
        severity TEXT DEFAULT 'Low',
        department TEXT NOT NULL,
        area_of_incident TEXT NOT NULL,
        names_involved TEXT,
        pid_number TEXT,
        description TEXT NOT NULL,
        contributing_factors TEXT,
        immediate_actions TEXT,
        prevention_measures TEXT,
        status TEXT DEFAULT 'pending',
        created_by INTEGER REFERENCES users(id),
        reviewed_by INTEGER REFERENCES users(id),
        reviewed_at DATETIME,
        review_comments TEXT,
        approved_by INTEGER REFERENCES users(id),
        approved_at DATETIME,
        hsfp_comments TEXT,
        rca_environment TEXT,
        rca_staff TEXT,
        rca_equipment TEXT,
        rca_policy TEXT,
        rca_verification_json TEXT,
        corrective_actions_json TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS cancellation_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_full_name TEXT NOT NULL,
        pid_number TEXT NOT NULL,
        old_sid_number TEXT,
        new_sid_number TEXT,
        telephone_number TEXT,
        insurance_payer TEXT,
        total_amount_cancelled TEXT,
        original_receipt_number TEXT,
        rectified_receipt_number TEXT,
        original_receipt_amount REAL,
        rectified_receipt_amount REAL,
        initial_transaction_date DATETIME,
        rectified_date DATETIME,
        reason_for_cancellation TEXT,
        status TEXT DEFAULT 'pending',
        created_by INTEGER REFERENCES users(id),
        verified_by INTEGER REFERENCES users(id),
        verified_at DATETIME,
        approved_by INTEGER REFERENCES users(id),
        approved_at DATETIME,
        rejected_by INTEGER REFERENCES users(id),
        rejected_at DATETIME,
        rejection_comment TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id),
        user_name TEXT,
        user_role TEXT,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id INTEGER,
        details TEXT,
        ip_address TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // HSFP Portal Tables
    await client.execute(`
      CREATE TABLE IF NOT EXISTS safety_reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        period_start TEXT NOT NULL,
        period_end TEXT NOT NULL,
        executive_summary TEXT NOT NULL DEFAULT '',
        key_findings TEXT NOT NULL DEFAULT '',
        recommendations TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'published',
        created_by INTEGER REFERENCES users(id),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS risk_register (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        risk_code TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        likelihood INTEGER NOT NULL,
        impact INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'Active',
        owner TEXT NOT NULL,
        mitigation TEXT DEFAULT '',
        date TEXT NOT NULL,
        created_by INTEGER REFERENCES users(id),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS infection_cases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        case_code TEXT UNIQUE NOT NULL,
        infection_type TEXT NOT NULL,
        department TEXT NOT NULL,
        patient_identifier TEXT DEFAULT '',
        date TEXT NOT NULL,
        severity TEXT NOT NULL DEFAULT 'Medium',
        status TEXT NOT NULL DEFAULT 'Active',
        investigation_notes TEXT DEFAULT '',
        corrective_actions TEXT DEFAULT '',
        created_by INTEGER REFERENCES users(id),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS hygiene_audits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        audit_code TEXT UNIQUE NOT NULL,
        department TEXT NOT NULL,
        auditor_name TEXT NOT NULL,
        compliance_score REAL NOT NULL,
        total_opportunities INTEGER DEFAULT 0,
        missed_opportunities INTEGER DEFAULT 0,
        sterilization_passed INTEGER DEFAULT 1,
        observations TEXT DEFAULT '',
        corrective_actions TEXT DEFAULT '',
        audit_date TEXT NOT NULL,
        created_by INTEGER REFERENCES users(id),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS hsfp_inspections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        inspection_code TEXT UNIQUE NOT NULL,
        department TEXT NOT NULL,
        inspector_id INTEGER REFERENCES users(id),
        inspector_name TEXT NOT NULL,
        inspection_date TEXT NOT NULL,
        area_inspected TEXT DEFAULT '',
        ppe_compliance_pct REAL DEFAULT 100.0,
        fire_safety_passed INTEGER DEFAULT 1,
        waste_management_passed INTEGER DEFAULT 1,
        sharps_safety_passed INTEGER DEFAULT 1,
        spill_kit_verified INTEGER DEFAULT 1,
        hazard_notes TEXT DEFAULT '',
        corrective_actions TEXT DEFAULT '',
        status TEXT DEFAULT 'Passed',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS hsfp_hazard_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        log_code TEXT UNIQUE NOT NULL,
        incident_id INTEGER REFERENCES incident_reports(id),
        affected_staff TEXT NOT NULL,
        department TEXT NOT NULL,
        exposure_type TEXT NOT NULL,
        exposure_date TEXT NOT NULL,
        pep_initiated INTEGER DEFAULT 0,
        source_patient_id TEXT DEFAULT '',
        immediate_actions TEXT DEFAULT '',
        follow_up_date TEXT DEFAULT '',
        status TEXT DEFAULT 'Open',
        created_by INTEGER REFERENCES users(id),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Seed Roles
    console.log('🎭 Seeding roles...');
    const roles = [
      ['admin', 'System Administrator'],
      ['coo', 'Chief Operating Officer'],
      ['deputy_coo', 'Deputy COO'],
      ['chairman', 'Chairman'],
      ['sales_manager', 'Sales Manager'],
      ['hsfp', 'Health & Safety Focal Person'],
      ['cashier', 'Cashier'],
      ['principal_cashier', 'Principal Cashier'],
      ['customer_care', 'Customer Care Officer'],
      ['nurse', 'Clinical Nurse'],
      ['medical_director', 'Medical Director'],
      ['clinical_director', 'Clinical Director'],
      ['logistics_manager', 'Logistics Manager'],
      ['logistics_officer', 'Logistics Officer'],
      ['imaging_manager', 'Imaging Department Manager'],
      ['imaging_tech', 'Imaging Technologist (Radiographer)'],
      ['radiologist', 'Consultant Radiologist'],
      ['sono', 'Sonographer (Ultrasound)'],
      ['imaging', 'Imaging Staff']
    ];


    for (const [name, display] of roles) {
      await client.execute({
        sql: 'INSERT INTO roles (name, display_name) VALUES (?, ?) ON CONFLICT (name) DO NOTHING',
        args: [name, display]
      });
    }

    // Get role mapping
    const { rows: dbRoles } = await client.execute('SELECT id, name FROM roles');
    const roleMap = dbRoles.reduce((acc, r) => ({ ...acc, [r.name]: r.id }), {});

    // 3. Seed Users
    console.log('👥 Seeding institutional staff accounts...');
    const passwordHash1234 = await bcrypt.hash('1234', 10);
    const passwordHash1235 = await bcrypt.hash('1235', 10);
    const passwordHashLegacy = await bcrypt.hash('Legacy@2024', 10);

    const users = [
      { name: 'AKALIZA Bayingana Patience', username: 'lc_patience', email: 'bayingana@legacyclinics.rw', role: 'customer_care', pass: passwordHash1234 },
      { name: 'AKIMANA Chanelle', username: 'lc_chanelle', email: 'chanelle@legacyclinics.rw', role: 'customer_care', pass: passwordHash1234 },
      { name: 'GAKUBA Denyse', username: 'lc_denyse', email: 'gakuba@legacyclinics.rw', role: 'customer_care', pass: passwordHash1234 },
      { name: 'HABIYAMBERE Olivier', username: 'lc_olivier', email: 'habiyambere@legacyclinics.rw', role: 'customer_care', pass: passwordHash1234 },
      { name: 'HAKIZAMUNGU Joseph', username: 'lc_joseph', email: 'joseph@legacyclinics.rw', role: 'customer_care', pass: passwordHash1234 },
      { name: 'KABAZAYIRE ISIMBI Lydie', username: 'lc_lydie', email: 'kabazayire@legacyclinics.rw', role: 'customer_care', pass: passwordHash1234 },
      { name: 'KAMATARI Nada Sandrine', username: 'lc_sandrine', email: 'kamatari@legacyclinics.rw', role: 'customer_care', pass: passwordHash1234 },
      { name: 'KAMUSENGO Diane', username: 'lc_diane', email: 'kamusengo@legacyclinics.rw', role: 'customer_care', pass: passwordHash1234 },
      { name: 'KAYIHURA Arnold', username: 'lc_arnold', email: 'arnold@legacyclinics.rw', role: 'customer_care', pass: passwordHash1234 },
      { name: 'KYARISIMA Rebecca', username: 'lc_rebecca', email: 'rebecca@legacyclinics.rw', role: 'customer_care', pass: passwordHash1234 },
      { name: 'MAJYAMBERE Ephraim', username: 'lc_ephraim', email: 'ephraim@legacyclinics.rw', role: 'customer_care', pass: passwordHash1234 },
      { name: 'MBABAZI Aline', username: 'lc_aline', email: 'aline@legacyclinics.rw', role: 'customer_care', pass: passwordHash1234 },
      { name: 'MUKAKAMARO Lyse', username: 'lc_lyse', email: 'lyse@legacyclinics.rw', role: 'customer_care', pass: passwordHash1234 },
      { name: 'M. GWIZA Providence', username: 'lc_provy', email: 'gwiza@legacyclinics.rw', role: 'customer_care', pass: passwordHash1234 },
      { name: 'MUTIMA Kevin', username: 'lc_kevin', email: 'mutima@legacyclinics.rw', role: 'customer_care', pass: passwordHash1234 },
      { name: 'NIYITANGA Thierry', username: 'lc_thierry', email: 'thierry@legacyclinics.rw', role: 'customer_care', pass: passwordHash1234 },
      { name: 'NIYONSHUTI Faith', username: 'lc_faith', email: 'niyonshuti@legacyclinics.rw', role: 'customer_care', pass: passwordHash1234 },
      { name: 'NYIRANSHIMIYIMANA Josiane', username: 'lc_josiane', email: 'josiane@legacyclinics.rw', role: 'customer_care', pass: passwordHash1234 },
      { name: 'RUTAGENGWA Nadine', username: 'lc_nadine', email: 'rutagengwa@legacyclinics.rw', role: 'customer_care', pass: passwordHash1234 },
      { name: 'TETA Sharon', username: 'lc_sharon', email: 'sharon@legacyclinics.rw', role: 'customer_care', pass: passwordHash1234 },
      { name: 'UMUHOZA KARAGIRE Aliane', username: 'lc_aliane', email: 'umuhoza@legacyclinics.rw', role: 'customer_care', pass: passwordHash1234 },
      { name: 'UNYUZHEZA Marie Rosine', username: 'lc_rosine', email: 'marierosine@legacyclinics.rw', role: 'customer_care', pass: passwordHash1234 },
      { name: 'USANASE ISHIMWE Sandrine', username: 'lc_sandrine_2', email: 'sandrine@legacyclinics.rw', role: 'customer_care', pass: passwordHash1234 },
      { name: 'UWAMAHORO Jacky', username: 'lc_jacky', email: 'jacky@legacyclinics.rw', role: 'customer_care', pass: passwordHash1234 },
      { name: 'UWAMAHORO Yvette', username: 'lc_yvette', email: 'yvette@legacyclinics.rw', role: 'customer_care', pass: passwordHash1234 },
      { name: 'UWIMANA Claudine', username: 'lc_claudine', email: 'uwimana@legacyclinics.rw', role: 'customer_care', pass: passwordHash1234 },
      { name: 'UWINEZA Francine', username: 'lc_francine', email: 'uwineza@legacyclinics.rw', role: 'customer_care', pass: passwordHash1234 },
      
      { name: 'MUKUNDENTE Sofia Joyeuse', username: 'lc_sofia', email: 'sofia@legacyclinics.rw', role: 'coo', pass: passwordHash1234 },
      { name: 'MUGABO Geofrey', username: 'lc_geofrey', email: 'geoffrey@legacyclinics.rw', role: 'deputy_coo', pass: passwordHash1234 },
      { name: 'UWASEKURU Nadine', username: 'lc_uwasekuru', email: 'uwasekuru@legacyclinics.rw', role: 'sales_manager', pass: passwordHash1234 },
      { name: 'NIYOMUGABO Valery', username: 'lc_valery', email: 'valery@legacyclinics.rw', role: 'admin', pass: passwordHash1234 },
      { name: 'BOUHARI Linganwa Minega', username: 'lc_minega', email: 'linganwam@legacyclinics.rw', role: 'admin', pass: passwordHash1234 },
      { name: 'UMUHOZA Nadège', username: 'lc_nadege', email: 'nadege@legacyclinics.rw', role: 'principal_cashier', pass: passwordHash1234 },
      { name: 'Mr. Chairman', username: 'lc_chairman', email: 'jeanmalic@yahoo.fr', role: 'chairman', pass: passwordHashLegacy },
      { name: 'NURSE Joyce', username: 'lc_joyce', email: 'joyce@legacyclinics.rw', role: 'nurse', pass: passwordHash1234 },
      { name: 'LOGISTICS Manager', username: 'lc_logistics', email: 'logistics@legacyclinics.rw', role: 'logistics_manager', pass: passwordHash1234 },
      { name: 'LOGISTICS Officer', username: 'lc_logistics_officer', email: 'logistics_officer@legacyclinics.rw', role: 'logistics_officer', pass: passwordHash1234 }
    ];

    for (const u of users) {
      const { rows: existing } = await client.execute({
        sql: 'SELECT id FROM users WHERE username = ?',
        args: [u.username]
      });
      if (existing.length > 0) {
        await client.execute({
          sql: 'UPDATE users SET full_name = ?, email = ?, password_hash = ?, role_id = ? WHERE username = ?',
          args: [u.name, u.email, u.pass, roleMap[u.role], u.username]
        });
      } else {
        await client.execute({
          sql: 'INSERT INTO users (full_name, username, email, password_hash, role_id) VALUES (?, ?, ?, ?, ?)',
          args: [u.name, u.username, u.email, u.pass, roleMap[u.role]]
        });
      }
      console.log(`✅ User synced: ${u.username}`);
    }

    // 4. Seed Master Inventory
    console.log('📦 Seeding default inventory items...');
    const { rows: inventoryCount } = await client.execute("SELECT COUNT(*) as count FROM master_inventory");
    if (inventoryCount[0].count === 0) {
      console.log('🌱 Table master_inventory is empty. Auto-seeding default items...');
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
        const prefix = generateSkuPrefix(item);
        const inserted = await client.execute({
          sql: "INSERT OR IGNORE INTO master_inventory (name, sku, unit_of_measure, category) VALUES (?, ?, 'Unit', ?) RETURNING id",
          args: [item, prefix, category]
        });
        if (inserted.rows && inserted.rows.length > 0) {
          const itemId = inserted.rows[0].id;
          await client.execute({
            sql: "INSERT OR IGNORE INTO stock_batches (item_id, lot_number, quantity) VALUES (?, '01', 0)",
            args: [itemId]
          });
        }
      }
      console.log('✅ Inventory items seeded.');
    } else {
      console.log('ℹ️ Inventory table is not empty, skipping seeding.');
    }

    // 5. Seed HSFP Portal Default Baseline Datasets
    console.log('🛡️ Seeding HSFP Portal baseline datasets...');
    
    // Risk Register
    const { rows: riskCount } = await client.execute("SELECT COUNT(*) as cnt FROM risk_register");
    if (riskCount[0].cnt === 0) {
      const defaultRisks = [
        ['RSK-001', 'Delayed Critical Diagnostic Result Escalation', 'Clinical', 3, 4, 'Mitigated', 'Clinical Director / HOD Lab', 'Implemented automated SMS & High-Priority critical phone alert logbook in Lumina LIS.', '2026-10-01'],
        ['RSK-002', 'Power Interruption to Cold Chain Specimen Storage', 'Operational', 2, 5, 'Active', 'Facilities Manager / HSFP', 'Backup generator automated transfer switch + continuous IoT temperature telemetry alerts.', '2026-10-05'],
        ['RSK-003', 'Accidental Sharps / Needle Stick Injuries in Phlebotomy', 'Occupational Safety', 3, 3, 'Mitigated', 'HSFP Officer / Lead Nurse', 'Introduced retractable safety vacutainer needles, mandatory PPE drills, and 24/7 PEP protocol.', '2026-10-08'],
        ['RSK-004', 'Hazardous Chemical / Reagent Splashes in Clinical Lab', 'Environmental', 2, 4, 'Mitigated', 'Safety Officer', 'Installed certified eye-wash stations, spill kits, and mandatory face shield protocols.', '2026-10-10']
      ];
      for (const [code, title, cat, lik, imp, stat, owner, mit, dt] of defaultRisks) {
        await client.execute({
          sql: `INSERT OR IGNORE INTO risk_register (risk_code, title, category, likelihood, impact, status, owner, mitigation, date)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [code, title, cat, lik, imp, stat, owner, mit, dt]
        });
      }
      console.log('✅ Risk Register baseline seeded.');
    }

    // Infection Cases
    const { rows: infectionCount } = await client.execute("SELECT COUNT(*) as cnt FROM infection_cases");
    if (infectionCount[0].cnt === 0) {
      const defaultInfections = [
        ['HAI-2026-001', 'Surgical Site Infection (SSI)', 'Surgery', 'MRN-89211', '2026-10-02', 'High', 'Resolved', 'Superficial incisional erythema at surgical wound site on post-op day 4.', 'Wound culture, targeted antibiotic regimen according to antibiogram, resolved without dehiscence.'],
        ['HAI-2026-002', 'Catheter-Associated UTI (CAUTI)', 'Inpatient Ward A', 'MRN-78432', '2026-10-08', 'Medium', 'Resolved', 'Foley catheter in situ > 5 days; patient developed fever and dysuria.', 'Catheter removed immediately, urine culture collected, prompt hydration and targeted therapy.'],
        ['HAI-2026-003', 'Multi-Drug Resistant Organism (MDRO)', 'ICU', 'MRN-65109', '2026-10-12', 'Critical', 'Under Investigation', 'Screening swab detected ESBL-producing Klebsiella pneumoniae in respiratory secretions.', 'Contact isolation precautions enforced, dedicated equipment assigned, daily environmental decontamination.']
      ];
      for (const [code, type, dept, mrn, dt, sev, stat, notes, actions] of defaultInfections) {
        await client.execute({
          sql: `INSERT OR IGNORE INTO infection_cases (case_code, infection_type, department, patient_identifier, date, severity, status, investigation_notes, corrective_actions)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [code, type, dept, mrn, dt, sev, stat, notes, actions]
        });
      }
      console.log('✅ Infection Surveillance baseline seeded.');
    }

    // Hygiene & Sterilization Audits
    const { rows: hygieneCount } = await client.execute("SELECT COUNT(*) as cnt FROM hygiene_audits");
    if (hygieneCount[0].cnt === 0) {
      const defaultAudits = [
        ['AUD-2026-001', 'Surgery & OT Suite', 'Dr. Focal Person', 97.5, 40, 1, 1, 'Strict hand hygiene observed across all WHO 5 moments. Autoclave spore test verified negative.', 'Stocked alcohol rubs at scrub bay 2.', '2026-10-03'],
        ['AUD-2026-002', 'CSSD / Sterilization Unit', 'HSFP Officer', 100.0, 30, 0, 1, 'All chemical indicator strips showed complete color transition. Bowie-Dick test passed.', 'Routine validation verified.', '2026-10-09'],
        ['AUD-2026-003', 'Emergency & Triage', 'Lead Nurse Auditor', 94.0, 50, 3, 1, 'High volume patient inflow; hand rub usage consistent before aseptic procedures.', 'Added 2 wall-mounted dispensers in triage waiting area.', '2026-10-14']
      ];
      for (const [code, dept, auditor, score, opps, missed, passed, obs, actions, dt] of defaultAudits) {
        await client.execute({
          sql: `INSERT OR IGNORE INTO hygiene_audits (audit_code, department, auditor_name, compliance_score, total_opportunities, missed_opportunities, sterilization_passed, observations, corrective_actions, audit_date)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [code, dept, auditor, score, opps, missed, passed, obs, actions, dt]
        });
      }
      console.log('✅ Hygiene & Sterilization Audits baseline seeded.');
    }

    // HSFP Inspections
    const { rows: inspCount } = await client.execute("SELECT COUNT(*) as cnt FROM hsfp_inspections");
    if (inspCount[0].cnt === 0) {
      const defaultInspections = [
        ['INSP-HSFP-001', 'Surgery & CSSD', 'HSFP Focal Officer', '2026-10-04', 'Operating Theatres 1 & 2', 98.0, 1, 1, 1, 1, 'All emergency fire exits unobstructed; biohazard waste bins labeled correctly.', 'Scheduled bi-monthly eye-wash inspection.', 'Passed'],
        ['INSP-HSFP-002', 'Laboratory & Phlebotomy', 'HSFP Focal Officer', '2026-10-11', 'Main Lab & Phlebotomy Stations', 96.5, 1, 1, 1, 1, 'Chemical storage ventilated; sharps containers replaced at 3/4 fill line.', 'Updated chemical safety data sheet (MSDS) binder.', 'Passed']
      ];
      for (const [code, dept, insp, dt, area, ppe, fire, waste, sharps, spill, notes, actions, stat] of defaultInspections) {
        await client.execute({
          sql: `INSERT OR IGNORE INTO hsfp_inspections (inspection_code, department, inspector_name, inspection_date, area_inspected, ppe_compliance_pct, fire_safety_passed, waste_management_passed, sharps_safety_passed, spill_kit_verified, hazard_notes, corrective_actions, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [code, dept, insp, dt, area, ppe, fire, waste, sharps, spill, notes, actions, stat]
        });
      }
      console.log('✅ Workplace Health & Safety Inspections seeded.');
    }

    // HSFP Hazard Exposure Logs
    const { rows: hazCount } = await client.execute("SELECT COUNT(*) as cnt FROM hsfp_hazard_logs");
    if (hazCount[0].cnt === 0) {
      const defaultHazards = [
        ['HAZ-EXP-001', 'Clinical Staff Nurse', 'Inpatient Ward B', 'Needle Stick / Sharps Injury', '2026-10-07', 1, 'MRN-78012', 'Immediate wound cleansing with running water & povidone iodine; rapid HIV/HBV source screening non-reactive; prophylactic PEP started within 45 mins.', '2026-11-07', 'Closed - Safe'],
        ['HAZ-EXP-002', 'Laboratory Technologist', 'Chemistry Section', 'Chemical Exposure', '2026-10-13', 0, '', 'Minor reagent splash to gloved forearm during analyzer maintenance; zero dermal contact; emergency eye-wash verified.', '2026-10-20', 'Closed - Safe']
      ];
      for (const [code, staff, dept, exp, dt, pep, src, act, fup, stat] of defaultHazards) {
        await client.execute({
          sql: `INSERT OR IGNORE INTO hsfp_hazard_logs (log_code, affected_staff, department, exposure_type, exposure_date, pep_initiated, source_patient_id, immediate_actions, follow_up_date, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [code, staff, dept, exp, dt, pep, src, act, fup, stat]
        });
      }
      console.log('✅ Occupational Hazard & Sharps Exposure Logs seeded.');
    }

    // Safety Reports
    const { rows: reportCount } = await client.execute("SELECT COUNT(*) as cnt FROM safety_reports");
    if (reportCount[0].cnt === 0) {
      await client.execute({
        sql: `INSERT OR IGNORE INTO safety_reports (title, period_start, period_end, executive_summary, key_findings, recommendations, status)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [
          'Q3 Institutional Patient Safety & Risk Report',
          '2026-07-01',
          '2026-09-30',
          'Executive review of safety indicators, infection prevention protocols, and workplace occupational safety compliance at Legacy Clinics.',
          'Hygiene audit compliance remained above 96.0%. Total reported clinical near-misses increased due to improved transparent safety reporting culture.',
          '1. Standardize quarterly emergency spill kit simulations across all diagnostic units.\n2. Maintain weekly infection control rounding in high-acuity wards.',
          'published'
        ]
      });
      console.log('✅ Consolidated Safety Reports baseline seeded.');
    }
 
    console.log('✨ Turso Seeding Completed Successfully!');
  } catch (err) {
    console.error('❌ Seeding failed:', err);
  } finally {
    // client.close() if using a persistent client, but createClient in @libsql/client often handles lifecycle
  }
}

seed();
