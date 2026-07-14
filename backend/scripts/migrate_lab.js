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
    console.log('🚀 Creating lab_orders table...');
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
        notes TEXT,
        status TEXT DEFAULT 'ordered',
        created_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);

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
        remarks TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES lab_orders(id) ON DELETE CASCADE
      )
    `);

    // Indexes
    await db.query('CREATE INDEX IF NOT EXISTS idx_lab_orders_status ON lab_orders(status)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_lab_orders_patient ON lab_orders(patient_id)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_lab_results_order ON lab_results(order_id)');

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
