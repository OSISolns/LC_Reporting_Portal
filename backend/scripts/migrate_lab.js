'use strict';
/**
 * Laboratory Portal schema migration + seed.
 * Usage: node scripts/migrate_lab.js
 */
const db = require('../src/config/db');

const LAB_PROVIDERS = [
  'Hematology Analyzer',
  'Biochemistry Analyzer',
  'Immunology Analyzer',
  'Microbiology Logbook',
];

async function up() {
  try {
    console.log('🚀 Creating / updating lab_orders table...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS lab_orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        accession_number TEXT UNIQUE,
        patient_id TEXT NOT NULL,
        patient_name TEXT,
        patient_age TEXT,
        patient_gender TEXT,
        referring_provider TEXT,
        specimen_type TEXT,
        specimen_barcode TEXT UNIQUE,
        priority TEXT DEFAULT 'routine',
        urgency TEXT DEFAULT 'Routine',
        phase TEXT DEFAULT 'pre-analytical',
        stage TEXT DEFAULT 'Ordered',
        tat_deadline DATETIME,
        tube_type TEXT DEFAULT 'Purple EDTA',
        order_of_draw_step INTEGER DEFAULT 1,
        volume_ml REAL DEFAULT 3.0,
        hil_index TEXT DEFAULT 'Normal',
        sample_integrity TEXT DEFAULT 'Good',
        auto_verified BOOLEAN DEFAULT 0,
        delta_check_flag BOOLEAN DEFAULT 0,
        critical_alert BOOLEAN DEFAULT 0,
        verified_by_name TEXT,
        verified_at DATETIME,
        reported_at DATETIME,
        notified_at DATETIME,
        notes TEXT,
        status TEXT DEFAULT 'ordered',
        created_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);

    // Helper helper to add missing columns to lab_orders safely
    const safeAddColumn = async (table, colDef) => {
      try {
        await db.query(`ALTER TABLE ${table} ADD COLUMN ${colDef}`);
      } catch {
        // ignore if column already exists
      }
    };

    await safeAddColumn('lab_orders', "urgency TEXT DEFAULT 'Routine'");
    await safeAddColumn('lab_orders', "phase TEXT DEFAULT 'pre-analytical'");
    await safeAddColumn('lab_orders', "stage TEXT DEFAULT 'Ordered'");
    await safeAddColumn('lab_orders', "tat_deadline DATETIME");
    await safeAddColumn('lab_orders', "tube_type TEXT DEFAULT 'Purple EDTA'");
    await safeAddColumn('lab_orders', "order_of_draw_step INTEGER DEFAULT 1");
    await safeAddColumn('lab_orders', "volume_ml REAL DEFAULT 3.0");
    await safeAddColumn('lab_orders', "hil_index TEXT DEFAULT 'Normal'");
    await safeAddColumn('lab_orders', "sample_integrity TEXT DEFAULT 'Good'");
    await safeAddColumn('lab_orders', "auto_verified BOOLEAN DEFAULT 0");
    await safeAddColumn('lab_orders', "delta_check_flag BOOLEAN DEFAULT 0");
    await safeAddColumn('lab_orders', "critical_alert BOOLEAN DEFAULT 0");
    await safeAddColumn('lab_orders', "verified_by_name TEXT");
    await safeAddColumn('lab_orders', "verified_at DATETIME");
    await safeAddColumn('lab_orders', "reported_at DATETIME");
    await safeAddColumn('lab_orders', "notified_at DATETIME");

    console.log('🚀 Creating lab_results table...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS lab_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        parameter_name TEXT NOT NULL,
        parameter_value TEXT,
        reference_range TEXT,
        unit TEXT,
        is_abnormal BOOLEAN DEFAULT 0,
        is_critical BOOLEAN DEFAULT 0,
        delta_change TEXT,
        remarks TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES lab_orders(id) ON DELETE CASCADE
      )
    `);

    await safeAddColumn('lab_results', "is_critical BOOLEAN DEFAULT 0");
    await safeAddColumn('lab_results', "delta_change TEXT");

    console.log('🚀 Creating lab_qc_logs table...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS lab_qc_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        analyzer_id TEXT,
        analyzer_name TEXT NOT NULL,
        parameter_name TEXT NOT NULL,
        control_level TEXT NOT NULL,
        mean_target REAL NOT NULL,
        sd_target REAL NOT NULL,
        measured_value REAL NOT NULL,
        z_score REAL NOT NULL,
        westgard_rule_breach TEXT DEFAULT 'None',
        status TEXT NOT NULL DEFAULT 'Passed',
        corrective_action_taken TEXT,
        run_by_name TEXT DEFAULT 'Lab Tech',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Indexes
    await db.query('CREATE INDEX IF NOT EXISTS idx_lab_orders_status ON lab_orders(status)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_lab_orders_phase ON lab_orders(phase)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_lab_orders_stage ON lab_orders(stage)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_lab_orders_patient ON lab_orders(patient_id)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_lab_results_order ON lab_results(order_id)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_lab_qc_logs_analyzer ON lab_qc_logs(analyzer_name)');

    // Seed LABORATORY department
    console.log('🌱 Seeding LABORATORY department...');
    await db.query(
      "INSERT INTO departments (name) VALUES ('LABORATORY') ON CONFLICT (name) DO NOTHING"
    );

    // Seed LABORATORY specialization + providers (daily report)
    console.log('🌱 Seeding LABORATORY specialization + providers...');
    await db.query(
      "INSERT INTO specializations (name) VALUES ('LABORATORY') ON CONFLICT (name) DO NOTHING"
    );
    
    const { rows: specRows } = await db.query(
      "SELECT id FROM specializations WHERE name = 'LABORATORY'"
    );
    const specId = specRows[0] && specRows[0].id;
    
    for (const name of LAB_PROVIDERS) {
      const { rows: existing } = await db.query(
        'SELECT id FROM providers WHERE name = ? AND specialization = ?',
        [name, 'LABORATORY']
      );
      if (existing.length === 0) {
        await db.query(
          'INSERT INTO providers (name, title, specialization_id, specialization, is_active) VALUES (?, ?, ?, ?, 1)',
          [name, 'Lab', specId, 'LABORATORY']
        );
      }
    }

    // Seed some mock lab orders for testing if table is empty
    const { rows: orders } = await db.query('SELECT id FROM lab_orders LIMIT 1');
    if (orders.length === 0) {
      console.log('🌱 Seeding mock lab orders and results...');
      
      // Order 1: Full Blood Count
      await db.query(`
        INSERT INTO lab_orders (accession_number, patient_id, patient_name, patient_age, patient_gender, referring_provider, specimen_type, specimen_barcode, status)
        VALUES ('L-260714-001', 'P-10023', 'John Doe', '45', 'Male', 'Dr. Sarah Connor', 'Blood', 'BAR-86411', 'Collected')
      `);
      
      // Order 2: Liver Function Test
      await db.query(`
        INSERT INTO lab_orders (accession_number, patient_id, patient_name, patient_age, patient_gender, referring_provider, specimen_type, specimen_barcode, status)
        VALUES ('L-260714-002', 'P-10045', 'Alice Smith', '32', 'Female', 'Dr. Bruce Banner', 'Blood', 'BAR-86412', 'Completed')
      `);
      
      const { rows: insertedOrders } = await db.query('SELECT id, accession_number FROM lab_orders');
      const order1 = insertedOrders.find(o => o.accession_number === 'L-260714-001')?.id;
      const order2 = insertedOrders.find(o => o.accession_number === 'L-260714-002')?.id;

      if (order1) {
        const params = [
          { name: 'Hemoglobin', unit: 'g/dL', range: '13.5 - 17.5' },
          { name: 'White Blood Cell (WBC)', unit: '10^9/L', range: '4.0 - 11.0' },
          { name: 'Platelets', unit: '10^9/L', range: '150 - 450' },
          { name: 'Red Blood Cell (RBC)', unit: '10^12/L', range: '4.5 - 5.9' },
        ];
        for (const p of params) {
          await db.query(
            'INSERT INTO lab_results (order_id, parameter_name, reference_range, unit) VALUES (?, ?, ?, ?)',
            [order1, p.name, p.range, p.unit]
          );
        }
      }

      if (order2) {
        const params = [
          { name: 'Alanine Aminotransferase (ALT)', val: '24', range: '7 - 56', unit: 'U/L', abnormal: 0 },
          { name: 'Aspartate Aminotransferase (AST)', val: '58', range: '10 - 40', unit: 'U/L', abnormal: 1 },
          { name: 'Alkaline Phosphatase (ALP)', val: '88', range: '44 - 147', unit: 'U/L', abnormal: 0 },
          { name: 'Total Bilirubin', val: '0.8', range: '0.2 - 1.2', unit: 'mg/dL', abnormal: 0 },
        ];
        for (const p of params) {
          await db.query(
            'INSERT INTO lab_results (order_id, parameter_name, parameter_value, reference_range, unit, is_abnormal) VALUES (?, ?, ?, ?, ?, ?)',
            [order2, p.name, p.val, p.range, p.unit, p.abnormal]
          );
        }
      }
    }

    console.log('✅ Lab schema + seed complete.');
  } catch (err) {
    console.error('❌ Lab migration failed:', err);
    process.exitCode = 1;
  }
}

up();
