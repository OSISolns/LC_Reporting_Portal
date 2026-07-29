'use strict';

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const db = require('../src/config/db');

/**
 * Migration: Add missing prosthetics & orthodontic columns to dental_cases.
 *
 * Root cause: The "Trays" CHECK-constraint table-recreate migration in db.js
 * rebuilt dental_cases without the ortho/prosthetics columns. The subsequent
 * ALTER TABLE block should have re-added them, but it did not apply in production.
 *
 * This script safely adds every column that should exist, skipping any that
 * are already present.
 */
async function run() {
  console.log('🔄 Running dental_cases ortho/prosthetics column migration...\n');

  const colsToAdd = [
    { name: 'patient_name',          ddl: 'patient_name TEXT' },
    { name: 'prosthetics_enabled',   ddl: 'prosthetics_enabled INTEGER DEFAULT 1' },
    { name: 'prosthetics_cost',      ddl: 'prosthetics_cost REAL' },
    { name: 'ortho_enabled',         ddl: 'ortho_enabled INTEGER DEFAULT 0' },
    { name: 'ortho_appliance_type',  ddl: 'ortho_appliance_type TEXT' },
    { name: 'ortho_appliance_other', ddl: 'ortho_appliance_other TEXT' },
    { name: 'ortho_technologist',    ddl: 'ortho_technologist TEXT' },
    { name: 'ortho_cost',            ddl: 'ortho_cost REAL' },
    { name: 'ortho_notes',           ddl: 'ortho_notes TEXT' },
    { name: 'ortho_units',           ddl: 'ortho_units INTEGER DEFAULT 1' },
    { name: 'ortho_unit_cost',       ddl: 'ortho_unit_cost REAL' },
    { name: 'ortho_arch',            ddl: 'ortho_arch TEXT' },
  ];

  // Fetch current columns
  const { rows: pragmaRows } = await db.query('PRAGMA table_info(dental_cases)');
  const existingCols = new Set(pragmaRows.map(r => r.name));

  console.log('📋 Existing dental_cases columns:', [...existingCols].join(', '), '\n');

  let added = 0;
  let skipped = 0;

  for (const col of colsToAdd) {
    if (existingCols.has(col.name)) {
      console.log(`  ⏭  ${col.name} — already exists, skipping.`);
      skipped++;
    } else {
      try {
        await db.query(`ALTER TABLE dental_cases ADD COLUMN ${col.ddl}`);
        console.log(`  ✅ Added column: ${col.name}`);
        added++;
      } catch (err) {
        console.error(`  ❌ Failed to add ${col.name}:`, err.message);
      }
    }
  }

  console.log(`\n🏁 Done. Added: ${added}, Skipped (already existed): ${skipped}.`);

  // Verify
  const { rows: afterRows } = await db.query('PRAGMA table_info(dental_cases)');
  const afterCols = afterRows.map(r => r.name);
  console.log('\n📋 dental_cases columns after migration:');
  console.log(afterCols.join(', '));

  const missing = colsToAdd.map(c => c.name).filter(n => !afterCols.includes(n));
  if (missing.length > 0) {
    console.error('\n⚠️  Still missing columns:', missing.join(', '));
    process.exit(1);
  } else {
    console.log('\n✅ All required ortho/prosthetics columns are present.');
    process.exit(0);
  }
}

run().catch(err => {
  console.error('💥 Unhandled error:', err);
  process.exit(1);
});
