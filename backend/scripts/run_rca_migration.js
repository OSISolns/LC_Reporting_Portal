#!/usr/bin/env node
'use strict';

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');

const db = createClient({
  url:       process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function main() {
  console.log('Running HSFP RCA incident report table migration...');
  try {
    const migrationSql = fs.readFileSync(
      path.resolve(__dirname, '../../database/hsfp_rca_migration.sql'),
      'utf8'
    );

    // split statements and execute
    const statements = migrationSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const stmt of statements) {
      console.log(`Executing: ${stmt}`);
      try {
        await db.execute(stmt);
        console.log('  └─ Success');
      } catch (err) {
        if (err.message.includes('duplicate column name') || err.message.includes('already exists')) {
          console.log('  └─ Already exists (ignored)');
        } else {
          throw err;
        }
      }
    }
    console.log('✅ HSFP RCA fields successfully integrated into incident_reports table.');
  } catch (err) {
    console.error('❌ RCA migration failed:', err.message);
    process.exit(1);
  }
  process.exit(0);
}

main();
