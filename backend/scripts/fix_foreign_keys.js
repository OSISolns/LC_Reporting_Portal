'use strict';
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables (prioritize backend/.env for local database)
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../../.env.development.local') });
dotenv.config({ path: path.join(__dirname, '../../.env.local') });

const { client } = require('../src/config/db');

async function fixTable(tableName, createSql) {
  try {
    console.log(`🔧 Migrating table: ${tableName}`);
    // 1. Check if table exists
    const { rows: checkRows } = await client.execute(`SELECT name FROM sqlite_master WHERE type='table' AND name='${tableName}'`);
    if (checkRows.length === 0) {
      console.log(`ℹ️ Table ${tableName} does not exist, creating it fresh...`);
      await client.execute(createSql);
      return;
    }

    // 2. Rename existing table
    await client.execute(`ALTER TABLE ${tableName} RENAME TO ${tableName}_old`);

    // 3. Create new table with corrected foreign key
    await client.execute(createSql);

    // 4. Copy data from old table to new table
    const { rows: colRows } = await client.execute(`PRAGMA table_info(${tableName}_old)`);
    const cols = colRows.map(r => r.name);
    const colListStr = cols.join(', ');

    await client.execute(`
      INSERT INTO ${tableName} (${colListStr})
      SELECT ${colListStr} FROM ${tableName}_old
    `);

    // 5. Drop old table
    await client.execute(`DROP TABLE ${tableName}_old`);
    console.log(`✅ Successfully migrated table: ${tableName}`);
  } catch (err) {
    console.error(`❌ Failed to migrate table ${tableName}:`, err);
    try {
      await client.execute(`DROP TABLE IF EXISTS ${tableName}_old`);
    } catch (_) {}
  }
}

async function run() {
  // Disable foreign keys temporarily
  try {
    await client.execute("PRAGMA foreign_keys = OFF");
  } catch (e) {
    console.warn("Could not set foreign_keys = OFF:", e.message);
  }

  // 1. shift_equipment_logs
  await fixTable('shift_equipment_logs', `
    CREATE TABLE shift_equipment_logs (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      shift_id        INTEGER NOT NULL REFERENCES shift_sessions(id) ON DELETE CASCADE,
      snapshot        TEXT NOT NULL CHECK (snapshot IN ('open', 'close')),
      equipment_name  TEXT NOT NULL,
      equipment_status TEXT NOT NULL CHECK (equipment_status IN ('Working', 'Needs Repair', 'Broken/Missing')),
      remarks         TEXT,
      created_at      DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    )
  `);

  // 2. shift_cashier_open
  await fixTable('shift_cashier_open', `
    CREATE TABLE shift_cashier_open (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      shift_id        INTEGER UNIQUE NOT NULL REFERENCES shift_sessions(id) ON DELETE CASCADE,
      opening_float   REAL NOT NULL DEFAULT 0,
      created_at      DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    )
  `);

  // 3. shift_cashier_close
  await fixTable('shift_cashier_close', `
    CREATE TABLE shift_cashier_close (
      id                          INTEGER PRIMARY KEY AUTOINCREMENT,
      shift_id                    INTEGER UNIQUE NOT NULL REFERENCES shift_sessions(id) ON DELETE CASCADE,
      total_patients              INTEGER NOT NULL DEFAULT 0,
      total_insured               INTEGER NOT NULL DEFAULT 0,
      total_private               INTEGER NOT NULL DEFAULT 0,
      insurances_used             TEXT,
      total_momo_transactions     INTEGER NOT NULL DEFAULT 0,
      total_card_transactions     INTEGER NOT NULL DEFAULT 0,
      card_bank_terminal          TEXT,
      payments_all_successful     INTEGER NOT NULL DEFAULT 1,
      failed_payment_status       TEXT,
      failed_payment_amount       REAL,
      failed_payment_action_taken TEXT,
      opening_float               REAL NOT NULL DEFAULT 0,
      closing_float               REAL NOT NULL DEFAULT 0,
      cash_payments_total         REAL NOT NULL DEFAULT 0,
      cash_discrepancy            REAL NOT NULL DEFAULT 0,
      created_at  DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      updated_at  DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    )
  `);

  // 4. shift_helpdesk_close
  await fixTable('shift_helpdesk_close', `
    CREATE TABLE shift_helpdesk_close (
      id                      INTEGER PRIMARY KEY AUTOINCREMENT,
      shift_id                INTEGER UNIQUE NOT NULL REFERENCES shift_sessions(id) ON DELETE CASCADE,
      patient_walkin_queries  INTEGER NOT NULL DEFAULT 0,
      internal_staff_queries  INTEGER NOT NULL DEFAULT 0,
      created_at  DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      updated_at  DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    )
  `);

  // 5. shift_callcenter_close
  await fixTable('shift_callcenter_close', `
    CREATE TABLE shift_callcenter_close (
      id                      INTEGER PRIMARY KEY AUTOINCREMENT,
      shift_id                INTEGER UNIQUE NOT NULL REFERENCES shift_sessions(id) ON DELETE CASCADE,
      inbound_total           INTEGER NOT NULL DEFAULT 0,
      inbound_assisted        INTEGER NOT NULL DEFAULT 0,
      inbound_dropped         INTEGER NOT NULL DEFAULT 0,
      outbound_total          INTEGER NOT NULL DEFAULT 0,
      outbound_reached        INTEGER NOT NULL DEFAULT 0,
      outbound_unreached      INTEGER NOT NULL DEFAULT 0,
      call_top_reasons        TEXT,
      has_pending_followups   INTEGER NOT NULL DEFAULT 0,
      followup_details        TEXT,
      created_at  DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      updated_at  DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    )
  `);

  // 6. shift_nurse_close
  await fixTable('shift_nurse_close', `
    CREATE TABLE shift_nurse_close (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shift_id INTEGER UNIQUE NOT NULL REFERENCES shift_sessions(id) ON DELETE CASCADE,
      total_assessments INTEGER DEFAULT 0,
      total_incidents INTEGER DEFAULT 0,
      handover_sbar_sb TEXT,
      handover_sbar_ar TEXT,
      created_at DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      updated_at DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    )
  `);

  // 7. shift_viplounge_close
  await fixTable('shift_viplounge_close', `
    CREATE TABLE shift_viplounge_close (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shift_id INTEGER UNIQUE NOT NULL REFERENCES shift_sessions(id) ON DELETE CASCADE,
      vip_logs TEXT,
      created_at DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      updated_at DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    )
  `);

  try {
    await client.execute("PRAGMA foreign_keys = ON");
  } catch (e) {
    console.warn("Could not set foreign_keys = ON:", e.message);
  }

  console.log("🏁 All migrations finished!");
  process.exit(0);
}

run();
