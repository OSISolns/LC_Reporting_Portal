#!/usr/bin/env node
'use strict';

/**
 * clean_june19_test_data.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Removes June 19, 2026 test/sys-test stock changes made by:
 *   - Valery NIYOMUGABO
 *   - test nurse (any username containing "test")
 *
 * Also removes those user accounts from the users table.
 *
 * Tables affected:
 *   - nursing_stock_change_logs  (change audit log)
 *   - nursing_monthly_stock      (rolling stock state — reverts to last clean state)
 *   - department_stock           (if any test entries exist)
 *   - users                      (removes the test user accounts)
 *
 * Run with:  node clean_june19_test_data.js
 * Dry run:   node clean_june19_test_data.js --dry-run
 * ─────────────────────────────────────────────────────────────────────────────
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.production.local') });
const { createClient } = require('@libsql/client');

const DRY_RUN = process.argv.includes('--dry-run');

const tursoUrl       = process.env.PROD_TURSO_DATABASE_URL || process.env.TURSO_DATABASE_URL || process.env.lcreporting_TURSO_DATABASE_URL;
const tursoAuthToken = process.env.PROD_TURSO_AUTH_TOKEN  || process.env.TURSO_AUTH_TOKEN   || process.env.lcreporting_TURSO_AUTH_TOKEN;

if (!tursoUrl || !tursoAuthToken) {
  console.error('❌ Missing Turso credentials. Check .env.production.local');
  process.exit(1);
}

const client = createClient({ url: tursoUrl, authToken: tursoAuthToken });

// ─── Matching criteria ────────────────────────────────────────────────────────
// The date prefix used in updated_at / created_at for June 19, 2026 entries
const JUNE_19_PREFIX = '2026-06-19';

// Usernames / responsible names to target (case-insensitive LIKE patterns)
const TARGET_NAMES = [
  'Valery NIYOMUGABO',
  'valery',        // catch lowercase variants
  'NIYOMUGABO',    // catch surname-only entries
  'test nurse',
  'testnurse',
];

// Build SQL IN clause patterns for LIKE matching
function buildLikeConditions(column) {
  return TARGET_NAMES.map(() => `LOWER(${column}) LIKE ?`).join(' OR ');
}
function buildLikeArgs() {
  return TARGET_NAMES.map(n => `%${n.toLowerCase()}%`);
}

async function preview() {
  console.log('\n📋 DRY RUN — Previewing rows to be deleted:\n');

  // 1. Stock change logs
  const { rows: logRows } = await client.execute({
    sql: `SELECT id, month_year, item_name, day, session, updated_by, updated_at
          FROM nursing_stock_change_logs
          WHERE DATE(updated_at) = ?
            AND (${buildLikeConditions('updated_by')})
          ORDER BY updated_at`,
    args: [JUNE_19_PREFIX, ...buildLikeArgs()],
  });
  console.log(`🗒  nursing_stock_change_logs — ${logRows.length} row(s) to delete:`);
  logRows.forEach(r => console.log(`   [${r.id}] ${r.updated_at} | ${r.updated_by} | ${r.item_name} | day=${r.day} session=${r.session}`));

  // 2. Monthly stock entries updated by test users on June 19
  const { rows: stockRows } = await client.execute({
    sql: `SELECT id, month_year, item_name, day, session, responsible_name, updated_at
          FROM nursing_monthly_stock
          WHERE DATE(updated_at) = ?
            AND (${buildLikeConditions('responsible_name')})
          ORDER BY updated_at`,
    args: [JUNE_19_PREFIX, ...buildLikeArgs()],
  });
  console.log(`\n📦  nursing_monthly_stock — ${stockRows.length} row(s) to delete:`);
  stockRows.forEach(r => console.log(`   [${r.id}] ${r.updated_at} | ${r.responsible_name} | ${r.item_name} | day=${r.day} session=${r.session}`));

  // 3. Department stock (stock_movements / department_stock if they exist)
  try {
    const { rows: deptStockRows } = await client.execute({
      sql: `SELECT id, item_name, quantity, created_by, created_at
            FROM department_stock
            WHERE DATE(created_at) = ?
              AND (${buildLikeConditions('created_by')})`,
      args: [JUNE_19_PREFIX, ...buildLikeArgs()],
    });
    console.log(`\n🏬  department_stock — ${deptStockRows.length} row(s) to delete:`);
    deptStockRows.forEach(r => console.log(`   [${r.id}] ${r.created_at} | ${r.created_by} | ${r.item_name} qty=${r.quantity}`));
  } catch (_) {
    console.log('\n🏬  department_stock — table not queried (may use different schema)');
  }

  // 4. Users matching test names
  const { rows: userRows } = await client.execute({
    sql: `SELECT id, username, full_name, role, created_at
          FROM users
          WHERE ${buildLikeConditions('username')} OR ${buildLikeConditions('full_name')}`,
    args: [...buildLikeArgs(), ...buildLikeArgs()],
  });
  console.log(`\n👤  users — ${userRows.length} account(s) to remove:`);
  userRows.forEach(r => console.log(`   [${r.id}] username="${r.username}" name="${r.full_name}" role="${r.role}" created=${r.created_at}`));

  console.log('\n⚠️  Re-run WITHOUT --dry-run to apply deletions.\n');
}

async function clean() {
  console.log('\n🧹 Starting cleanup of June 19 test data...\n');
  let total = 0;

  // 1. Delete from nursing_stock_change_logs
  const del1 = await client.execute({
    sql: `DELETE FROM nursing_stock_change_logs
          WHERE DATE(updated_at) = ?
            AND (${buildLikeConditions('updated_by')})`,
    args: [JUNE_19_PREFIX, ...buildLikeArgs()],
  });
  console.log(`✅ nursing_stock_change_logs: ${del1.rowsAffected} row(s) deleted`);
  total += del1.rowsAffected;

  // 2. Delete from nursing_monthly_stock (rows whose last update was by test users on June 19)
  const del2 = await client.execute({
    sql: `DELETE FROM nursing_monthly_stock
          WHERE DATE(updated_at) = ?
            AND (${buildLikeConditions('responsible_name')})`,
    args: [JUNE_19_PREFIX, ...buildLikeArgs()],
  });
  console.log(`✅ nursing_monthly_stock: ${del2.rowsAffected} row(s) deleted`);
  total += del2.rowsAffected;

  // 3. Delete from department_stock if applicable
  try {
    const del3 = await client.execute({
      sql: `DELETE FROM department_stock
            WHERE DATE(created_at) = ?
              AND (${buildLikeConditions('created_by')})`,
      args: [JUNE_19_PREFIX, ...buildLikeArgs()],
    });
    console.log(`✅ department_stock: ${del3.rowsAffected} row(s) deleted`);
    total += del3.rowsAffected;
  } catch (_) {
    console.log('ℹ️  department_stock — skipped (schema mismatch or no match)');
  }

  // 4. Delete the test user accounts
  const del4 = await client.execute({
    sql: `DELETE FROM users
          WHERE ${buildLikeConditions('username')} OR ${buildLikeConditions('full_name')}`,
    args: [...buildLikeArgs(), ...buildLikeArgs()],
  });
  console.log(`✅ users: ${del4.rowsAffected} test account(s) removed`);
  total += del4.rowsAffected;

  console.log(`\n🎉 Cleanup complete — ${total} total row(s) removed from database.\n`);
}

async function main() {
  try {
    if (DRY_RUN) {
      await preview();
    } else {
      await preview();
      console.log('⏳ Applying deletions in 3 seconds... (Ctrl+C to abort)\n');
      await new Promise(r => setTimeout(r, 3000));
      await clean();
    }
  } catch (err) {
    console.error('❌ Error during cleanup:', err.message);
    process.exit(1);
  }
  process.exit(0);
}

main();
