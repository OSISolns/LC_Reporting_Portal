'use strict';

const fs = require('fs');
const path = require('path');

// 1. Manually parse local env files to set process.env before loading the database configuration
function loadEnv() {
  const envPaths = [
    path.join(__dirname, '../.env.production.local'),
    path.join(__dirname, '../.env.local'),
    path.join(__dirname, '../backend/.env')
  ];

  let loaded = false;
  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      console.log(`📝 Loading environment configurations from: ${envPath}`);
      const content = fs.readFileSync(envPath, 'utf8');
      content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx > 0) {
            const key = trimmed.substring(0, eqIdx).trim();
            let val = trimmed.substring(eqIdx + 1).trim();
            // Remove surrounding quotes if they exist
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
              val = val.substring(1, val.length - 1);
            }
            // Only set if not already set by shell environment
            if (!process.env[key]) {
              process.env[key] = val;
            }
          }
        }
      });
      loaded = true;
    }
  }

  if (!loaded) {
    console.warn('⚠️ Warning: No local .env files could be found. Relying strictly on machine env.');
  }
}

loadEnv();

// Import database client
const db = require('../backend/src/config/db');

async function runCleanup() {
  console.log('\n=============================================================================');
  console.log('🔄 STARTING EXPIRED NURSING STOCK CLEANUP');
  console.log('=============================================================================\n');

  try {
    // --- STEP 1: Query preview ---
    console.log('🔎 STEP 1: Previewing expired items to be cleaned up...');
    const previewSql = `
      SELECT
          item_name,
          month_year,
          COUNT(*)           AS record_count,
          expiration_date,
          status
      FROM nursing_monthly_stock
      WHERE
          status = 'Expired'
          OR (
              expiration_date IS NOT NULL
              AND expiration_date != ''
              AND expiration_date != 'No Expiry Listed'
              AND length(expiration_date) >= 8
              AND (
                  substr(expiration_date,7,4) || '-' ||
                  substr(expiration_date,4,2) || '-' ||
                  substr(expiration_date,1,2)
              ) < date('now')
          )
      GROUP BY item_name, month_year, expiration_date, status
      ORDER BY month_year, item_name;
    `;

    const { rows: previewRows } = await db.query(previewSql);

    if (previewRows.length === 0) {
      console.log('✅ No expired items found in nursing_monthly_stock! DB is clean.');
      process.exit(0);
    }

    console.log('\n🚨 Found the following expired items that will be deleted:');
    console.table(previewRows);

    // --- STEP 2 & 3: Run archive insert and delete ---
    console.log('\n💾 STEP 2: Archiving expired items into nursing_deleted_items table...');
    const archiveSql = `
      INSERT OR IGNORE INTO nursing_deleted_items (month_year, item_name, deleted_by)
      SELECT DISTINCT
          month_year,
          item_name,
          'SQL_CLEANUP_SCRIPT'
      FROM nursing_monthly_stock
      WHERE
          status = 'Expired'
          OR (
              expiration_date IS NOT NULL
              AND expiration_date != ''
              AND expiration_date != 'No Expiry Listed'
              AND length(expiration_date) >= 8
              AND (
                  substr(expiration_date,7,4) || '-' ||
                  substr(expiration_date,4,2) || '-' ||
                  substr(expiration_date,1,2)
              ) < date('now')
          );
    `;

    const archiveResult = await db.query(archiveSql);
    console.log(`✅ Archived distinct items into nursing_deleted_items. (Affected rows/changes: ${archiveResult.rowCount})`);

    console.log('\n🗑️ STEP 3: Deleting expired stock ledger items from nursing_monthly_stock...');
    const deleteSql = `
      DELETE FROM nursing_monthly_stock
      WHERE
          status = 'Expired'
          OR (
              expiration_date IS NOT NULL
              AND expiration_date != ''
              AND expiration_date != 'No Expiry Listed'
              AND length(expiration_date) >= 8
              AND (
                  substr(expiration_date,7,4) || '-' ||
                  substr(expiration_date,4,2) || '-' ||
                  substr(expiration_date,1,2)
              ) < date('now')
          );
    `;

    const deleteResult = await db.query(deleteSql);
    console.log(`✅ Deleted expired ledger rows. (Deleted rows count: ${deleteResult.rowCount})`);

    // --- STEP 4: Verification ---
    console.log('\n📊 STEP 4: Running verification query...');
    const verifySql = `
      SELECT
          status,
          COUNT(*) AS remaining_rows
      FROM nursing_monthly_stock
      GROUP BY status
      ORDER BY status;
    `;
    const { rows: verifyRows } = await db.query(verifySql);
    console.log('Current ledger status summary:');
    console.table(verifyRows);

    console.log('\n=============================================================================');
    console.log('✅ EXPIRED STOCK CLEANUP COMPLETED SUCCESSFULLY');
    console.log('=============================================================================\n');
    process.exit(0);

  } catch (error) {
    console.error('\n💥 ERROR during cleanup execution:');
    console.error(error);
    process.exit(1);
  }
}

runCleanup();
