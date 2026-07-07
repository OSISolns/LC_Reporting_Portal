'use strict';
/**
 * Procurement RFQ / tender-evaluation schema migration.
 *
 * Creates the layer between requisitions and purchase_orders that models the
 * "TABLEAU COMPARATIF DES PRIX": rfqs -> rfq_suppliers -> rfq_items ->
 * rfq_quotes -> rfq_awards (+ rfq_committee sign-off). DDL lives in
 * database/procurement_rfq_migration.sql (single source of truth); this runner
 * just applies it statement-by-statement.
 *
 * Idempotent (CREATE ... IF NOT EXISTS). Targets whatever config/db.js resolves
 * to (local SQLite in dev). Does NOT connect to Turso directly — for go-live,
 * add the .sql file to scripts/run_all_sql_migrations.js.
 *
 * Usage: node scripts/migrate_procurement_rfq.js
 */
const fs = require('fs');
const path = require('path');
const db = require('../src/config/db');

const SQL_FILE = path.resolve(__dirname, '../database/procurement_rfq_migration.sql');

// Split into individual statements. Our DDL has no semicolons inside statements,
// so a split on ';' at end-of-line is safe; strip line comments and blanks.
function splitStatements(sql) {
  return sql
    .split(/;\s*(?:\r?\n|$)/)
    .map(s => s.replace(/^\s*--.*$/gm, '').trim())
    .filter(Boolean);
}

async function up() {
  const statements = splitStatements(fs.readFileSync(SQL_FILE, 'utf8'));
  let applied = 0;
  for (const stmt of statements) {
    const label = (stmt.match(/CREATE\s+(?:TABLE|INDEX)(?:\s+IF\s+NOT\s+EXISTS)?\s+([A-Za-z0-9_]+)/i) || [, 'statement'])[1];
    try {
      await db.query(stmt);
      applied++;
      console.log(`✅ ${label}`);
    } catch (err) {
      if (/already exists|duplicate column/i.test(err.message || '')) {
        console.log(`• ${label} already present`);
      } else {
        console.error(`❌ ${label}: ${err.message}`);
        throw err;
      }
    }
  }
  console.log(`\n✅ Procurement RFQ migration complete (${applied} statement(s) applied).`);
}

up().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
