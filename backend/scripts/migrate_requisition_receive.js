'use strict';
/**
 * Adds receive/accept tracking to requisitions so a department can confirm
 * receipt of an approved requisition into its working stock.
 *
 * Idempotent. Targets whatever config/db.js resolves to (local SQLite in dev).
 * Usage: node scripts/migrate_requisition_receive.js
 */
const db = require('../src/config/db');

async function up() {
  try {
    for (const col of ['received_at DATETIME', 'received_by INTEGER']) {
      try { await db.query(`ALTER TABLE requisitions ADD COLUMN ${col}`); console.log(`✅ requisitions.${col.split(' ')[0]} added.`); }
      catch (e) { console.log(`• requisitions.${col.split(' ')[0]} already present.`); }
    }
    console.log('✅ Requisition receive migration complete.');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exitCode = 1;
  }
}

up();
