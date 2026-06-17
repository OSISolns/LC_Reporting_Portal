const { createClient } = require('@libsql/client');
require('dotenv').config({ path: '.env' });
const client = createClient({
  url: process.env.PROD_TURSO_DATABASE_URL || process.env.TURSO_DATABASE_URL || process.env.lcreporting_TURSO_DATABASE_URL,
  authToken: process.env.PROD_TURSO_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN || process.env.lcreporting_TURSO_AUTH_TOKEN,
});

async function run() {
  const distinctMonths = await client.execute("SELECT DISTINCT substr(report_date, 1, 7) as ym FROM daily_report_metrics");
  console.log("Distinct months in metrics:", distinctMonths.rows.map(r => r.ym));
  
  const distinctMonthsLogs = await client.execute("SELECT DISTINCT substr(report_date, 1, 7) as ym FROM daily_procedure_logs");
  console.log("Distinct months in logs:", distinctMonthsLogs.rows.map(r => r.ym));
}
run().catch(console.error);
