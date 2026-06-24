#!/usr/bin/env node
'use strict';

/**
 * sync_patients.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Standalone script: Pulls all patients from SUKRAA HIMS and stores them
 * in the local Turso/LibSQL database as a cached mirror.
 *
 * Usage:
 *   node backend/scripts/sync_patients.js
 *
 * Options:
 *   --prefix=a        Only sync a single letter prefix
 *   --force           Re-insert all records even if they already exist
 *   --dry-run         Print stats but don't write to DB
 * ─────────────────────────────────────────────────────────────────────────────
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const { bulkPullAllPatients, bulkPullByPrefix } = require('../src/services/sukraaService');

// ── Parse CLI flags ──────────────────────────────────────────────────────────
const args       = process.argv.slice(2);
const prefixArg  = args.find(a => a.startsWith('--prefix='))?.split('=')[1];
const isDryRun   = args.includes('--dry-run');
const isForce    = args.includes('--force');

// ── Init DB client ───────────────────────────────────────────────────────────
const dbConn = require('../src/config/db');
const db = {
  execute: (stmt) => dbConn.client.execute(stmt),
  batch: (statements) => dbConn.batch(statements)
};

// ── Run migration if table doesn't exist ─────────────────────────────────────
async function ensureSchema() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS sukraa_patients (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      pid           TEXT NOT NULL UNIQUE,
      full_name     TEXT NOT NULL,
      age           TEXT,
      dob           TEXT,
      gender        TEXT,
      phone         TEXT,
      insurance     TEXT,
      extra_1       TEXT,
      extra_2       TEXT,
      source        TEXT NOT NULL DEFAULT 'sukraa',
      synced_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    )
  `);

  await db.execute(`CREATE INDEX IF NOT EXISTS idx_sukraa_patients_name  ON sukraa_patients(full_name)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_sukraa_patients_pid   ON sukraa_patients(pid)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_sukraa_patients_phone ON sukraa_patients(phone)`);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS sukraa_sync_log (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      started_at      TEXT NOT NULL,
      completed_at    TEXT,
      records_added   INTEGER DEFAULT 0,
      records_updated INTEGER DEFAULT 0,
      status          TEXT NOT NULL DEFAULT 'running',
      error_message   TEXT
    )
  `);

  console.log('✅ Schema verified');
}

// ── Upsert a batch of patients ───────────────────────────────────────────────
async function upsertBatch(patients, stats) {
  if (!patients.length || isDryRun) {
    stats.added += patients.length;
    return;
  }

  const statements = patients
    .filter(p => p.pid && p.full_name)
    .map(p => ({
      sql: `INSERT INTO sukraa_patients 
              (pid, full_name, age, dob, gender, phone, insurance, extra_1, extra_2, synced_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
            ON CONFLICT(pid) DO UPDATE SET
              full_name  = excluded.full_name,
              age        = excluded.age,
              dob        = excluded.dob,
              gender     = excluded.gender,
              phone      = excluded.phone,
              insurance  = excluded.insurance,
              extra_1    = excluded.extra_1,
              extra_2    = excluded.extra_2,
              synced_at  = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
              updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`,
      args: [
        p.pid, p.full_name, p.age || null, p.dob || null,
        p.gender || null, p.phone || null, p.insurance || null,
        p.extra_1 || null, p.extra_2 || null,
      ],
    }));

  if (statements.length === 0) return;

  // Batch in chunks of 50 to avoid LibSQL limits
  const CHUNK = 50;
  for (let i = 0; i < statements.length; i += CHUNK) {
    await db.batch(statements.slice(i, i + CHUNK), 'write');
    stats.added += Math.min(CHUNK, statements.length - i);
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const startTime = new Date().toISOString();
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║   SUKRAA → Local Patient Cache Sync              ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(`  Mode:     ${isDryRun ? '🔍 DRY RUN' : '✍️  LIVE'}`);
  console.log(`  Force:    ${isForce ? 'Yes (re-insert all)' : 'No (upsert only)'}`);
  console.log(`  Prefix:   ${prefixArg || 'All (A–Z, 0–9)'}`);
  console.log(`  Started:  ${startTime}\n`);

  await ensureSchema();

  // Insert sync log entry
  let logId = null;
  if (!isDryRun) {
    await db.execute({
      sql:  `INSERT INTO sukraa_sync_log (started_at, status) VALUES (?, 'running')`,
      args: [startTime],
    });
    const latestLog = await db.execute({
      sql: `SELECT id FROM sukraa_sync_log WHERE started_at = ? AND status = 'running' ORDER BY id DESC LIMIT 1`,
      args: [startTime]
    });
    logId = latestLog.rows?.[0]?.id || latestLog[0]?.id;
  }

  const stats = { added: 0, errors: 0 };
  const seen  = new Set();

  try {
    if (prefixArg) {
      // Single prefix mode
      const patients = await bulkPullByPrefix(prefixArg.toLowerCase());
      const unique   = patients.filter(p => {
        if (seen.has(p.pid)) return false;
        seen.add(p.pid);
        return true;
      });
      await upsertBatch(unique, stats);
    } else {
      // Full sweep: A–Z + 0–9
      for await (const { prefix, patients } of bulkPullAllPatients()) {
        const unique = patients.filter(p => {
          if (seen.has(p.pid)) return false;
          seen.add(p.pid);
          return true;
        });
        await upsertBatch(unique, stats);
        process.stdout.write(`\r  Progress: ${seen.size.toLocaleString()} unique patients found...`);
      }
      process.stdout.write('\n');
    }

    const completedAt = new Date().toISOString();
    const duration    = ((new Date(completedAt) - new Date(startTime)) / 1000).toFixed(1);

    if (!isDryRun && logId) {
      await db.execute({
        sql:  `UPDATE sukraa_sync_log SET completed_at = ?, records_added = ?, status = 'done' WHERE id = ?`,
        args: [completedAt, stats.added, logId],
      });
    }

    console.log('\n╔══════════════════════════════════════════════════╗');
    console.log('║   ✅  Sync Complete                               ║');
    console.log('╚══════════════════════════════════════════════════╝');
    console.log(`  Unique PIDs seen:  ${seen.size.toLocaleString()}`);
    console.log(`  Records upserted:  ${stats.added.toLocaleString()}`);
    console.log(`  Duration:          ${duration}s`);
    console.log(`  Completed:         ${completedAt}\n`);

  } catch (err) {
    console.error('\n❌ Sync failed:', err.message);
    if (!isDryRun && logId) {
      await db.execute({
        sql:  `UPDATE sukraa_sync_log SET completed_at = ?, status = 'failed', error_message = ? WHERE id = ?`,
        args: [new Date().toISOString(), err.message, logId],
      });
    }
    process.exit(1);
  }

  process.exit(0);
}

main();
