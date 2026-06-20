#!/usr/bin/env node
'use strict';

/**
 * clean_june19_test_data.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Cleans up seeded/test stock data:
 *
 *  1. nursing_stock_change_logs — WIPE ALL (1592+ entries are bulk-seeded;
 *     normal operation produces < 100 real entries)
 *
 *  2. nursing_monthly_stock — delete rows last updated on 2026-06-19
 *     (entered during the test session)
 *
 * NOTE: No users are deleted.
 *
 * Usage:
 *   node clean_june19_test_data.js --dry-run   ← preview only
 *   node clean_june19_test_data.js             ← apply deletions
 * ─────────────────────────────────────────────────────────────────────────────
 */

const path = require('path');
// Load from frontend/.env — this is the same DB the UI connects to (VITE_TURSO_* vars)
require('dotenv').config({ path: path.join(__dirname, '..', '..', 'frontend', '.env') });
const { createClient } = require('@libsql/client');

const DRY_RUN = process.argv.includes('--dry-run');

const tursoUrl       = process.env.VITE_TURSO_DATABASE_URL;
const tursoAuthToken = process.env.VITE_TURSO_AUTH_TOKEN;

if (!tursoUrl || !tursoAuthToken) {
  console.error('❌ Missing Turso credentials. Expected VITE_TURSO_DATABASE_URL and VITE_TURSO_AUTH_TOKEN in frontend/.env');
  process.exit(1);
}

console.log(`🔌 Connecting to: ${tursoUrl}`);

const client = createClient({ url: tursoUrl, authToken: tursoAuthToken });


const JUNE_19_PREFIX = '2026-06-19';

async function preview() {
  console.log('\n📋 DRY RUN — Previewing what will be deleted:\n');

  // ── 1. ALL nursing_stock_change_logs ─────────────────────────────────────
  const { rows: [{ total: logTotal }] } = await client.execute(
    `SELECT COUNT(*) as total FROM nursing_stock_change_logs`
  );
  console.log(`🗒  nursing_stock_change_logs — ${logTotal} total row(s) — ALL will be wiped`);
  console.log('   (Bulk-seeded; normal operation should produce < 100 real entries)');

  const { rows: sample } = await client.execute(
    `SELECT id, item_name, updated_by, updated_at FROM nursing_stock_change_logs ORDER BY id DESC LIMIT 5`
  );
  if (sample.length > 0) {
    console.log('   Most recent entries:');
    sample.forEach(r => console.log(`     [${r.id}] ${r.updated_at} | ${r.updated_by} | ${r.item_name}`));
  }

  // ── 2. nursing_monthly_stock rows from June 19 ──────────────────────────
  const { rows: stockRows } = await client.execute({
    sql: `SELECT id, month_year, item_name, day, session, responsible_name, updated_at
          FROM nursing_monthly_stock
          WHERE DATE(updated_at) = ?
          ORDER BY updated_at`,
    args: [JUNE_19_PREFIX],
  });
  console.log(`\n📦  nursing_monthly_stock — ${stockRows.length} row(s) from June 19 to delete:`);
  if (stockRows.length === 0) {
    const { rows: ts } = await client.execute(
      `SELECT id, updated_at FROM nursing_monthly_stock ORDER BY id DESC LIMIT 5`
    );
    if (ts.length > 0) {
      console.log('   ℹ️  Most recent timestamps (for date format check):');
      ts.forEach(r => console.log(`     id=${r.id}  updated_at="${r.updated_at}"`));
    } else {
      console.log('   ℹ️  Table is empty.');
    }
  } else {
    stockRows.forEach(r =>
      console.log(`   [${r.id}] ${r.updated_at} | ${r.responsible_name} | ${r.item_name} day=${r.day} ${r.session}`)
    );
  }

  console.log('\n⚠️  Re-run WITHOUT --dry-run to apply.\n');
}

async function clean() {
  console.log('\n🧹 Applying cleanup...\n');
  let total = 0;

  // 1. Wipe ALL nursing_stock_change_logs
  const del1 = await client.execute(`DELETE FROM nursing_stock_change_logs`);
  console.log(`✅ nursing_stock_change_logs: ${del1.rowsAffected} row(s) wiped`);
  total += del1.rowsAffected;

  // 2. Delete nursing_monthly_stock rows from June 19
  const del2 = await client.execute({
    sql: `DELETE FROM nursing_monthly_stock WHERE DATE(updated_at) = ?`,
    args: [JUNE_19_PREFIX],
  });
  console.log(`✅ nursing_monthly_stock: ${del2.rowsAffected} row(s) deleted (June 19)`);
  total += del2.rowsAffected;

  console.log(`\n🎉 Done — ${total} total row(s) removed.\n`);
}

async function main() {
  try {
    if (DRY_RUN) {
      await preview();
    } else {
      await preview();
      console.log('⏳ Applying in 3 seconds... (Ctrl+C to abort)\n');
      await new Promise(r => setTimeout(r, 3000));
      await clean();
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
  process.exit(0);
}

main();
