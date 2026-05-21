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
  console.log('Running feedbacks table migration...');
  try {
    const migrationSql = fs.readFileSync(
      path.resolve(__dirname, '../../database/feedbacks_migration.sql'),
      'utf8'
    );

    // split statements and execute
    const statements = migrationSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const stmt of statements) {
      await db.execute(stmt);
    }
    console.log('✅ patient_feedbacks table successfully integrated.');
  } catch (err) {
    console.error('❌ feedbacks migration failed:', err.message);
    process.exit(1);
  }
  process.exit(0);
}

main();
