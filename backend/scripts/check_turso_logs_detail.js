const db = require('../src/config/db');

async function run() {
  console.log('🔌 Connecting to Turso...');
  const { rows } = await db.query(`
    SELECT report_date, metric_name, metric_value
    FROM daily_procedure_logs
    WHERE report_date IN ('2026-06-09', '2026-06-11')
    ORDER BY report_date ASC, metric_name ASC
  `);
  console.log(JSON.stringify(rows, null, 2));
  process.exit(0);
}

run();
