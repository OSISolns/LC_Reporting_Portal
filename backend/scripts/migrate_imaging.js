'use strict';
/**
 * Imaging (Radiology) Portal schema migration + seed.
 *
 * Creates the imaging register (orders/studies/series/instances/reports) and
 * the LOINC/SNOMED terminology caches (mirroring icd11_cache), then seeds the
 * IMAGING department (for its own store + requisitions to the Store Manager)
 * and an IMAGING specialization with per-modality providers so imaging
 * procedures roll up into the existing Daily Operational Report.
 *
 * Safe to re-run: every statement is IF NOT EXISTS / ON CONFLICT DO NOTHING.
 *
 * Usage: node scripts/migrate_imaging.js
 */
const db = require('../src/config/db');

// The 4 operational imaging units that log all exams performed daily.
// `modality` is a free-form field on the studies/orders tables, so additional
// units (Mammography, OPG, ...) can be added later without a schema change.
const MODALITY_PROVIDERS = [
  'Radiography (X-Ray)',
  'CT-Scan',
  'MRI',
  'Ultrasound',
];

async function up() {
  try {
    // ── Register: imaging orders ──────────────────────────────────────────────
    console.log('🚀 Creating imaging_orders...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS imaging_orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        accession_number TEXT UNIQUE,
        patient_id TEXT NOT NULL,
        patient_name TEXT,
        referring_provider TEXT,
        modality TEXT,
        exam_type_loinc TEXT,
        exam_type_display TEXT,
        clinical_indication TEXT,
        indication_code_json TEXT,
        priority TEXT DEFAULT 'routine',
        notes TEXT,
        status TEXT DEFAULT 'ordered',
        created_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);

    // ── Register: imaging studies (the scheduled/performed exam) ──────────────
    console.log('🚀 Creating imaging_studies...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS imaging_studies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER,
        accession_number TEXT,
        patient_id TEXT NOT NULL,
        patient_name TEXT,
        modality TEXT,
        sub_unit TEXT,
        study_instance_uid TEXT,
        room TEXT,
        equipment TEXT,
        performed_by INTEGER,
        scheduled_at DATETIME,
        checked_in_at DATETIME,
        started_at DATETIME,
        acquired_at DATETIME,
        technical_notes TEXT,
        consent_json TEXT,
        status TEXT DEFAULT 'scheduled',
        created_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES imaging_orders(id),
        FOREIGN KEY (performed_by) REFERENCES users(id),
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);
    await db.query('CREATE INDEX IF NOT EXISTS idx_imaging_studies_status ON imaging_studies(status)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_imaging_studies_modality ON imaging_studies(modality)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_imaging_studies_patient ON imaging_studies(patient_id)');

    // Self-contained study fields (reception-created studies carry these without
    // a separate order row). Idempotent: ADD COLUMN throws if it already exists.
    for (const col of [
      'referring_provider TEXT',
      'clinical_indication TEXT',
      'exam_type_loinc TEXT',
      'exam_type_display TEXT',
      // Fields the physical MRI/imaging logbook records per exam.
      'sid TEXT',              // billing / study ID (from SUKRAA), e.g. 86491
      'exam_region TEXT',      // body region shorthand: C-S, L-S, Brain, Knee, ...
      'patient_age TEXT',      // as logged, e.g. "26" / "27Y"
      'patient_sex TEXT',      // M / F
    ]) {
      try { await db.query(`ALTER TABLE imaging_studies ADD COLUMN ${col}`); }
      catch (e) { /* column already exists */ }
    }

    // ── DICOM references (pixel data stays in PACS; we store UIDs + WADO URLs) ─
    console.log('🚀 Creating imaging_series / imaging_instances...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS imaging_series (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        study_id INTEGER NOT NULL,
        series_instance_uid TEXT,
        modality TEXT,
        description TEXT,
        number_of_instances INTEGER DEFAULT 0,
        wado_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (study_id) REFERENCES imaging_studies(id)
      )
    `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS imaging_instances (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        series_id INTEGER NOT NULL,
        sop_instance_uid TEXT,
        wado_url TEXT,
        frame_count INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (series_id) REFERENCES imaging_series(id)
      )
    `);

    // ── Radiologist report ────────────────────────────────────────────────────
    console.log('🚀 Creating imaging_reports...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS imaging_reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        study_id INTEGER NOT NULL,
        radiologist_id INTEGER,
        technique TEXT,
        findings_narrative TEXT,
        findings_code_json TEXT,
        impression TEXT,
        diagnosis_code_json TEXT,
        recommendations TEXT,
        status TEXT DEFAULT 'draft',
        checksum TEXT,
        verified_by INTEGER,
        verified_at DATETIME,
        amended_at DATETIME,
        amendment_reason TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (study_id) REFERENCES imaging_studies(id),
        FOREIGN KEY (radiologist_id) REFERENCES users(id),
        FOREIGN KEY (verified_by) REFERENCES users(id)
      )
    `);
    await db.query('CREATE INDEX IF NOT EXISTS idx_imaging_reports_study ON imaging_reports(study_id)');

    // ── Terminology caches (mirror icd11_cache) ───────────────────────────────
    console.log('🚀 Creating loinc_cache / snomed_cache...');
    for (const t of ['loinc_cache', 'snomed_cache']) {
      await db.query(`
        CREATE TABLE IF NOT EXISTS ${t} (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          keyword TEXT UNIQUE,
          results TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }

    // ── Seed IMAGING department (own store + requisitions to Store Manager) ────
    console.log('🌱 Seeding IMAGING department...');
    await db.query(
      "INSERT INTO departments (name) VALUES ('IMAGING') ON CONFLICT (name) DO NOTHING"
    );

    // ── Seed IMAGING specialization + modality providers (daily report) ───────
    console.log('🌱 Seeding IMAGING specialization + providers...');
    await db.query(
      "INSERT INTO specializations (name) VALUES ('IMAGING') ON CONFLICT (name) DO NOTHING"
    );
    const { rows: specRows } = await db.query(
      "SELECT id FROM specializations WHERE name = 'IMAGING'"
    );
    const specId = specRows[0] && specRows[0].id;
    for (const name of MODALITY_PROVIDERS) {
      // No unique constraint on providers.name -- guard against duplicate seeds.
      const { rows: existing } = await db.query(
        'SELECT id FROM providers WHERE name = ? AND specialization = ?',
        [name, 'IMAGING']
      );
      if (existing.length === 0) {
        await db.query(
          'INSERT INTO providers (name, title, specialization_id, specialization, is_active) VALUES (?, ?, ?, ?, 1)',
          [name, 'Imaging', specId, 'IMAGING']
        );
      }
    }

    console.log('✅ Imaging schema + seed complete.');
    console.log('👉 Next: run `node scripts/sync_permissions_full.js` to publish the RBAC matrix.');
  } catch (err) {
    console.error('❌ Imaging migration failed:', err);
    process.exitCode = 1;
  }
}

up();
