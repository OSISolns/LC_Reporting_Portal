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

    // Purge mock lab orders if present
    await db.query("DELETE FROM lab_orders WHERE accession_number LIKE 'L-260714%' OR patient_name IN ('John Doe', 'Alice Smith')");
    await db.query("DELETE FROM lab_results WHERE order_id NOT IN (SELECT id FROM lab_orders)");

    console.log('✅ Lab schema complete (no mock data).');
  } catch (err) {
    console.error('❌ Lab migration failed:', err);
    process.exitCode = 1;
  }
}

up();
