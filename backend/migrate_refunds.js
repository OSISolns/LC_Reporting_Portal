'use strict';
/**
 * Refund module database migration.
 * Creates the refund_requests table and indexes in Turso/LibSQL.
 * Run: node migrate_refunds.js
 */
require('dotenv').config();
const { createClient } = require('@libsql/client');

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const statements = [
  `CREATE TABLE IF NOT EXISTS refund_requests (
    id                      INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_full_name       TEXT    NOT NULL,
    pid_number              TEXT    NOT NULL,
    sid_number              TEXT,
    telephone_number        TEXT,
    insurance_payer         TEXT,
    momo_code               TEXT,
    total_amount_paid       REAL    NOT NULL DEFAULT 0,
    amount_to_be_refunded   REAL    NOT NULL DEFAULT 0,
    amount_paid_by          TEXT,
    original_receipt_number TEXT,
    initial_transaction_date TEXT,
    reason_for_refund       TEXT    NOT NULL,
    status                  TEXT    NOT NULL DEFAULT 'pending',
    rejection_comment       TEXT,
    created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
    verified_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    rejected_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at  TEXT DEFAULT (DATETIME('now')),
    verified_at TEXT,
    approved_at TEXT,
    rejected_at TEXT,
    updated_at  TEXT DEFAULT (DATETIME('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_refund_status     ON refund_requests(status)`,
  `CREATE INDEX IF NOT EXISTS idx_refund_created_at ON refund_requests(created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_refund_pid        ON refund_requests(pid_number)`,
  `CREATE INDEX IF NOT EXISTS idx_refund_name       ON refund_requests(patient_full_name)`,
  `CREATE INDEX IF NOT EXISTS idx_refund_created_by ON refund_requests(created_by)`,
];

(async () => {
  console.log('\n🚀 Running Refund Module Migration...\n');
  let passed = 0;
  let failed = 0;

  for (const stmt of statements) {
    const label = stmt.trim().split('\n')[0].slice(0, 70);
    try {
      await db.execute({ sql: stmt, args: [] });
      console.log(`  ✅  ${label}`);
      passed++;
    } catch (err) {
      console.error(`  ❌  ${label}`);
      console.error(`       → ${err.message}\n`);
      failed++;
    }
  }

  console.log(`\n📊 Migration results: ${passed} passed, ${failed} failed.`);
  if (failed === 0) {
    console.log('✅  refund_requests table is ready.\n');
  } else {
    console.log('⚠️  Some statements failed — check errors above.\n');
  }
  process.exit(failed > 0 ? 1 : 0);
})();
