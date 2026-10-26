'use strict';
/**
 * Turso Database Migration:
 * 1. Ensures specializations, providers, and services tables exist.
 * 2. Seeds standard services into services table.
 * 3. Ensures service_name, provider_id, provider_name in cancellation_requests and refund_requests.
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { createClient } = require('@libsql/client');

const tursoUrl = process.env.lcreporting_TURSO_DATABASE_URL || process.env.TURSO_DATABASE_URL;
const tursoToken = process.env.lcreporting_TURSO_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN;

if (!tursoUrl || !tursoToken) {
  console.error('❌ Missing Turso credentials in backend/.env');
  process.exit(1);
}

const client = createClient({
  url: tursoUrl,
  authToken: tursoToken,
});

const DEFAULT_SERVICES = [
  { code: 'GP', name: 'GP (General Practitioner / General Medicine)', department: 'OPD', category: 'Clinical' },
  { code: 'Gyno', name: 'Gyno (Gynecology & Obstetrics)', department: 'Gynecology', category: 'Clinical' },
  { code: 'Cardio', name: 'Cardio (Cardiology)', department: 'Cardiology', category: 'Clinical' },
  { code: 'Dental', name: 'Dental (Dentistry & Orthodontics)', department: 'Dental', category: 'Clinical' },
  { code: 'Imaging', name: 'Imaging (Radiology, CT, MRI, Ultrasound, X-Ray)', department: 'Imaging', category: 'Diagnostic' },
  { code: 'Internal Medicine', name: 'Internal Medicine (Internal Medecine)', department: 'Internal Medicine', category: 'Clinical' },
  { code: 'ENT', name: 'ENT (Ear, Nose & Throat)', department: 'ENT', category: 'Clinical' },
  { code: 'Orthopedy', name: 'Orthopedy (Orthopedics)', department: 'Orthopedics', category: 'Clinical' },
  { code: 'Pediatrics', name: 'Pediatrics', department: 'Pediatrics', category: 'Clinical' },
  { code: 'Physio', name: 'Physio (Physiotherapy & Rehabilitation)', department: 'Physiotherapy', category: 'Rehabilitation' },
  { code: 'Dermatology', name: 'Dermatology', department: 'Dermatology', category: 'Clinical' },
  { code: 'Ophthalmology', name: 'Ophthalmology (Eye Clinic)', department: 'Ophthalmology', category: 'Clinical' },
  { code: 'General Surgery', name: 'General Surgery', department: 'Surgery', category: 'Surgical' },
  { code: 'Neurology', name: 'Neurology & Neurosurgery', department: 'Neurology', category: 'Clinical' },
  { code: 'Urology', name: 'Urology', department: 'Urology', category: 'Clinical' },
  { code: 'Gastroenterology', name: 'Gastroenterology', department: 'Gastroenterology', category: 'Clinical' },
  { code: 'Laboratory', name: 'Laboratory (Clinical Biology & Pathology)', department: 'Laboratory', category: 'Diagnostic' },
  { code: 'Pharmacy', name: 'Pharmacy (Dispensary & Medications)', department: 'Pharmacy', category: 'Pharmaceutical' },
  { code: 'Nursing', name: 'Nursing / Triage / Minor Procedures', department: 'Nursing', category: 'Clinical' },
  { code: 'Oncology', name: 'Oncology', department: 'Oncology', category: 'Clinical' },
  { code: 'Nutrition', name: 'Nutrition & Dietetics', department: 'Nutrition', category: 'Clinical' },
  { code: 'Psychology', name: 'Psychology & Mental Health', department: 'Mental Health', category: 'Clinical' }
];

async function migrate() {
  console.log('🚀 Starting Turso Services & Providers Table Migration...');

  // 1. Ensure specializations table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS specializations (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    )
  `);
  console.log('✅ Turso: specializations table ensured.');

  // 2. Ensure providers table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS providers (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      name              TEXT NOT NULL,
      title             TEXT,
      specialization_id INTEGER REFERENCES specializations(id) ON DELETE SET NULL,
      specialization    TEXT,
      is_active         INTEGER DEFAULT 1
    )
  `);
  console.log('✅ Turso: providers table ensured.');

  // 3. Ensure services table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS services (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      code                TEXT UNIQUE,
      name                TEXT NOT NULL,
      department          TEXT,
      category            TEXT,
      default_provider_id INTEGER REFERENCES providers(id) ON DELETE SET NULL,
      is_active           INTEGER DEFAULT 1,
      created_at          DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    )
  `);
  console.log('✅ Turso: services table ensured.');

  // 4. Seed services if empty or upsert
  for (const s of DEFAULT_SERVICES) {
    try {
      await client.execute({
        sql: `INSERT INTO services (code, name, department, category, is_active)
              VALUES (?, ?, ?, ?, 1)
              ON CONFLICT(code) DO UPDATE SET
                name = excluded.name,
                department = excluded.department,
                category = excluded.category`,
        args: [s.code, s.name, s.department, s.category]
      });
    } catch (e) {
      console.warn(`Notice while upserting service ${s.code}:`, e.message);
    }
  }
  console.log(`✅ Turso: Seeded ${DEFAULT_SERVICES.length} standard clinical services.`);

  // 5. Add columns to cancellation_requests & refund_requests
  const targetCols = [
    { name: 'service_name', type: 'TEXT' },
    { name: 'provider_id', type: 'INTEGER REFERENCES providers(id) ON DELETE SET NULL' },
    { name: 'provider_name', type: 'TEXT' }
  ];

  for (const table of ['cancellation_requests', 'refund_requests']) {
    for (const col of targetCols) {
      try {
        await client.execute(`ALTER TABLE ${table} ADD COLUMN ${col.name} ${col.type}`);
        console.log(`✅ Turso: added column ${col.name} to ${table}`);
      } catch (err) {
        if (err.message && (err.message.includes('duplicate column') || err.message.includes('already exists'))) {
          console.log(`ℹ️ Turso: ${table}.${col.name} already exists.`);
        } else {
          console.warn(`⚠️ Turso column check notice for ${table}.${col.name}:`, err.message);
        }
      }
    }
  }

  // 6. Verification counts
  const provCount = await client.execute('SELECT COUNT(*) as c FROM providers');
  const servCount = await client.execute('SELECT COUNT(*) as c FROM services');
  console.log(`📊 Turso Status: ${provCount.rows[0].c} providers, ${servCount.rows[0].c} services.`);
  console.log('✨ Turso Migration Completed Successfully!');
}

migrate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Turso Migration Failed:', err);
    process.exit(1);
  });
