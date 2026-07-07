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

const { bulkPullAllPatients, bulkPullByPrefix, upsertPatientCache } = require('../src/services/sukraaService');

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
      ref_type      TEXT,
      referrer_name TEXT,
      extra_1       TEXT,
      extra_2       TEXT,
      source        TEXT NOT NULL DEFAULT 'sukraa',
      synced_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    )
  `);

  // Backfill columns on tables that predate the ref_type / referrer_name fields
  // so the upsert below doesn't fail with "no such column" on an older cache.
  for (const col of ['ref_type', 'referrer_name']) {
    try {
      await db.execute(`ALTER TABLE sukraa_patients ADD COLUMN ${col} TEXT`);
    } catch (err) {
      if (!/duplicate column name|already exists/i.test(err.message)) throw err;
    }
  }

  // full_name / phone are encrypted at rest, so indexing them is useless for
  // LIKE search and only adds write cost on every bulk upsert — drop if present.
  // Only pid (plaintext) benefits from an index.
  await db.execute(`DROP INDEX IF EXISTS idx_sukraa_patients_name`);
  await db.execute(`DROP INDEX IF EXISTS idx_sukraa_patients_phone`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_sukraa_patients_pid   ON sukraa_patients(pid)`);

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

// Patient upserts are handled by the shared upsertPatientCache() helper in
// sukraaService so this script and the /sync route stay in lock-step.

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

  // Insert sync log entry. RETURNING id captures the new row directly instead
  // of a racy "latest running row" re-select.
  let logId = null;
  if (!isDryRun) {
    const logRes = await db.execute({
      sql:  `INSERT INTO sukraa_sync_log (started_at, status) VALUES (?, 'running') RETURNING id`,
      args: [startTime],
    });
    logId = logRes.rows?.[0]?.id ?? logRes[0]?.id ?? null;
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
      stats.added += await upsertPatientCache(db, unique, { dryRun: isDryRun });
    } else {
      // Full sweep: A–Z + 0–9
      for await (const { prefix, patients } of bulkPullAllPatients()) {
        const unique = patients.filter(p => {
          if (seen.has(p.pid)) return false;
          seen.add(p.pid);
          return true;
        });
        stats.added += await upsertPatientCache(db, unique, { dryRun: isDryRun });
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
