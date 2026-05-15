'use strict';
const db = require('../src/config/db');

async function up() {
  console.log('🚀 Creating clinical_observations table...');
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS clinical_observations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id TEXT NOT NULL,
        queue_id TEXT NOT NULL,
        patient_name TEXT,
        ward TEXT,
        bed TEXT,
        identification_json TEXT,
        triage_json TEXT,
        progress_notes_json TEXT,
        medication_mar_json TEXT,
        sbar_json TEXT,
        status TEXT DEFAULT 'Draft',
        created_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);
    console.log('✅ clinical_observations table created.');
  } catch (err) {
    console.error('❌ Error creating clinical_observations table:', err);
  }
}

up();
