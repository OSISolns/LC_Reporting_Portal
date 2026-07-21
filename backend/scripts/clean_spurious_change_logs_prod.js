'use strict';

const path = require('path');
const args = process.argv.slice(2);
const isLocal = args.includes('--local');

if (!isLocal) {
  // Force database wrapper to connect to production Turso database
  process.env.lcreporting_TURSO_DATABASE_URL = "libsql://reporting-1-enigmatic-gemini-qt.aws-us-east-2.turso.io";
  process.env.lcreporting_TURSO_AUTH_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3ODE1MzkxOTIsImlkIjoiMDE5ZWNiYmQtMDgwMS03ZDJmLTk2YjAtOWRiNGJiYWU0MWJmIiwicmlkIjoiYzgxNjNiNDktYTdhNi00MWI1LWExN2YtMzk5ZTEzNjJhZTQwIn0.Y_U-Sac5yphSFgvSLL3EfhUwMsctm8CanKYRHu8xKTJq-1ZLgODvtNWmYQqsuu5lZ8zI3BmwsVKCkeS81qjuDg";
  console.log("🔌 Connecting to PRODUCTION Turso database...");
} else {
  console.log("🔌 Connecting to LOCAL SQLite database...");
}

const db = require('../src/config/db');

async function run() {
  try {
    // 1. Check total logs before deletion
    const { rows: beforeRows } = await db.query(
      "SELECT COUNT(*) as cnt FROM nursing_stock_change_logs"
    );
    const countBefore = beforeRows[0].cnt;
    console.log(`Total change logs before cleanup: ${countBefore}`);

    // 2. Count spurious logs (no change in stock, consumed, obs1, minor)
    const { rows: spuriousRows } = await db.query(
      `SELECT COUNT(*) as cnt FROM nursing_stock_change_logs 
       WHERE old_stock = new_stock 
         AND old_consumed = new_consumed 
         AND old_consumed_obs1 = new_consumed_obs1 
         AND old_consumed_minor = new_consumed_minor`
    );
    const spuriousCount = spuriousRows[0].cnt;
    console.log(`Spurious logs identified for deletion: ${spuriousCount}`);

    if (spuriousCount === 0) {
      console.log("✅ No spurious logs found. Database is clean!");
      process.exit(0);
    }

    console.log(`⏳ Deleting ${spuriousCount} spurious logs...`);

    // 3. Delete spurious logs
    const result = await db.query(
      `DELETE FROM nursing_stock_change_logs 
       WHERE old_stock = new_stock 
         AND old_consumed = new_consumed 
         AND old_consumed_obs1 = new_consumed_obs1 
         AND old_consumed_minor = new_consumed_minor`
    );

    console.log(`✅ Deletion complete. Rows affected: ${result.rowsAffected || spuriousCount}`);

    // 4. Verify count after deletion
    const { rows: afterRows } = await db.query(
      "SELECT COUNT(*) as cnt FROM nursing_stock_change_logs"
    );
    const countAfter = afterRows[0].cnt;
    console.log(`Total change logs after cleanup: ${countAfter}`);
    console.log(`Verified remaining logs count: ${countBefore - spuriousCount === countAfter ? "Correct!" : "MISMATCH!"}`);

  } catch (err) {
    console.error("❌ Cleanup failed:", err);
  } finally {
    process.exit(0);
  }
}

run();
