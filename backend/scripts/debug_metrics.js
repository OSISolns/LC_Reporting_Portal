const db = require('../src/config/db');

async function debugMetrics() {
  const { rows: metrics } = await db.query('SELECT * FROM daily_report_metrics WHERE report_date = "2026-06-01" LIMIT 10');
  console.log("METRICS:", metrics);
  
  const { rows: providers } = await db.query('SELECT * FROM providers LIMIT 10');
  console.log("PROVIDERS:", providers);
}

debugMetrics();
