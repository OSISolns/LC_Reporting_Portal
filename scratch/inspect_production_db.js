const { createClient } = require('../backend/node_modules/@libsql/client');

const url = "libsql://reporting-1-enigmatic-gemini-qt.aws-us-east-2.turso.io";
const token = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3ODE1MzkxOTIsImlkIjoiMDE5ZWNiYmQtMDgwMS03ZDJmLTk2YjAtOWRiNGJiYWU0MWJmIiwicmlkIjoiYzgxNjNiNDktYTdhNi00MWI1LWExN2YtMzk5ZTEzNjJhZTQwIn0.Y_U-Sac5yphSFgvSLL3EfhUwMsctm8CanKYRHu8xKTJq-1ZLgODvtNWmYQqsuu5lZ8zI3BmwsVKCkeS81qjuDg";

const client = createClient({
  url: url,
  authToken: token,
});

async function run() {
  try {
    console.log("Connecting to Turso production database...");
    
    // 1. Check table schema
    const schemaRes = await client.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='nursing_stock_change_logs'");
    console.log("Schema SQL:", schemaRes.rows[0]?.sql);

    // 2. Count total rows
    const countRes = await client.execute("SELECT COUNT(*) as cnt FROM nursing_stock_change_logs");
    console.log("Total rows in production nursing_stock_change_logs:", countRes.rows[0]?.cnt);

    // 3. Count rows per month_year
    const monthRes = await client.execute("SELECT month_year, COUNT(*) as cnt FROM nursing_stock_change_logs GROUP BY month_year");
    console.log("Rows by month_year:");
    monthRes.rows.forEach(r => console.log(`  ${r.month_year}: ${r.cnt}`));

    // 4. Sample 3 rows for 2026-07
    const sampleRes = await client.execute("SELECT * FROM nursing_stock_change_logs WHERE month_year = '2026-07' LIMIT 3");
    console.log("Sample July 2026 logs:", JSON.stringify(sampleRes.rows, null, 2));

  } catch (err) {
    console.error("ERROR querying production DB:", err);
  }
}
run();
