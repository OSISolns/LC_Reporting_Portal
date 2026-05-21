#!/usr/bin/env node
'use strict';

/**
 * add_is_mock_column.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Migration script: Adds the missing is_mock column to results_transfers table.
 * ─────────────────────────────────────────────────────────────────────────────
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { createClient } = require('@libsql/client');

const db = createClient({
  url:       process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function main() {
  console.log('Starting results_transfers migration...');
  try {
    // 1. Check if table exists and column is missing
    const schemaInfo = await db.execute("PRAGMA table_info(results_transfers)");
    const cols = schemaInfo.rows.map(r => r.name);

    if (!cols.includes('is_mock')) {
      console.log('Adding is_mock column to results_transfers...');
      await db.execute("ALTER TABLE results_transfers ADD COLUMN is_mock INTEGER DEFAULT 0");
      console.log('✅ Column successfully added!');
    } else {
      console.log('Column is_mock already exists in results_transfers.');
    }
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
  process.exit(0);
}

main();
