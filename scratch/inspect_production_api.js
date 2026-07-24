const path = require('path');
process.env.lcreporting_TURSO_DATABASE_URL = "libsql://reporting-1-enigmatic-gemini-qt.aws-us-east-2.turso.io";
process.env.lcreporting_TURSO_AUTH_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3ODE1MzkxOTIsImlkIjoiMDE5ZWNiYmQtMDgwMS03ZDJmLTk2YjAtOWRiNGJiYWU0MWJmIiwicmlkIjoiYzgxNjNiNDktYTdhNi00MWI1LWExN2YtMzk5ZTEzNjJhZTQwIn0.Y_U-Sac5yphSFgvSLL3EfhUwMsctm8CanKYRHu8xKTJq-1ZLgODvtNWmYQqsuu5lZ8zI3BmwsVKCkeS81qjuDg";

// Require the actual db config to run migrations and queries
const db = require('../backend/src/config/db.js');

async function run() {
  try {
    console.log("Executing getInventoryChangeLogs query...");
    const month_year = '2026-07';
    let sql = `
      SELECT COUNT(*) as cnt
      FROM nursing_stock_change_logs
      WHERE (new_consumed > old_consumed)
         OR (new_consumed_obs1 > old_consumed_obs1)
         OR (new_consumed_minor > old_consumed_minor)
    `;
    const { rows } = await db.query(sql, []);
    console.log("Count of positive consumption logs in production:", rows[0].cnt);
    if (rows.length > 0) {
      console.log("Sample Row 0:", JSON.stringify(rows[0], null, 2));
    }
  } catch (err) {
    console.error("QUERY ERROR:", err);
  }
}
run();
