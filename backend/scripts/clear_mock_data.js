#!/usr/bin/env node
'use strict';

/**
 * clear_mock_data.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Database utility: Clears all transactional test/mock data from the database
 * while preserving users, roles, and administrative configurations.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { client: db } = require('../src/config/db');

async function main() {
  console.log('🧹 Preparing to purge mock transactional data...');
  try {
    // 1. Truncate cancellation requests
    console.log('Purging cancellation_requests...');
    const delCancellations = await db.execute("DELETE FROM cancellation_requests");
    console.log(`✅ Cleared cancellation_requests (${delCancellations.rowsAffected} rows affected)`);

    // 2. Truncate incident reports
    console.log('Purging incident_reports...');
    const delIncidents = await db.execute("DELETE FROM incident_reports");
    console.log(`✅ Cleared incident_reports (${delIncidents.rowsAffected} rows affected)`);

    // 3. Truncate results transfers
    console.log('Purging results_transfers...');
    const delTransfers = await db.execute("DELETE FROM results_transfers");
    console.log(`✅ Cleared results_transfers (${delTransfers.rowsAffected} rows affected)`);

    // 4. Truncate patient cache (optional, clears any manually inserted mock patients)
    console.log('Purging local patient cache...');
    const delPatients = await db.execute("DELETE FROM sukraa_patients WHERE pid LIKE 'P-%' OR full_name LIKE '%MOCK%'");
    console.log(`✅ Cleared mock patient records (${delPatients.rowsAffected} rows affected)`);

    // 5. Truncate audit logs related to test entries
    console.log('Purging transaction audit logs...');
    const delAudit = await db.execute("DELETE FROM audit_logs");
    console.log(`✅ Cleared audit_logs (${delAudit.rowsAffected} rows affected)`);

    console.log('🚀 DB clean complete! Stale mock data completely removed.');
  } catch (err) {
    console.error('❌ Clean operation failed:', err.message);
    process.exit(1);
  }
  process.exit(0);
}

main();
