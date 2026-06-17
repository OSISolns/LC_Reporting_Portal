const { createClient } = require('@libsql/client');
require('dotenv').config({ path: '.env' });
const client = createClient({
  url: process.env.PROD_TURSO_DATABASE_URL || process.env.TURSO_DATABASE_URL || process.env.lcreporting_TURSO_DATABASE_URL,
  authToken: process.env.PROD_TURSO_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN || process.env.lcreporting_TURSO_AUTH_TOKEN,
});

async function run() {
  console.log("Checking DB URL:", process.env.TURSO_DATABASE_URL);
  
  // check tables
  const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table'");
  console.log("Tables:", tables.rows.map(r => r.name));

  const metricsCount = await client.execute("SELECT COUNT(*) as count FROM daily_report_metrics");
  console.log("Metrics count:", metricsCount.rows[0].count);

  const logsCount = await client.execute("SELECT COUNT(*) as count FROM daily_procedure_logs");
  console.log("Logs count:", logsCount.rows[0].count);

  const distinctDatesMetrics = await client.execute("SELECT DISTINCT report_date FROM daily_report_metrics LIMIT 10");
  console.log("Distinct dates in metrics:", distinctDatesMetrics.rows.map(r => r.report_date));

  const distinctDatesLogs = await client.execute("SELECT DISTINCT report_date FROM daily_procedure_logs LIMIT 10");
  console.log("Distinct dates in logs:", distinctDatesLogs.rows.map(r => r.report_date));
}
run().catch(console.error);
