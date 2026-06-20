const db = require('../src/config/db');

async function run() {
  console.log('🔌 Connecting to Turso Cloud...');
  const { rows } = await db.query(`
    SELECT report_date, COUNT(*) as log_count, SUM(CAST(metric_value as INTEGER)) as total_value
    FROM daily_procedure_logs
    WHERE report_date LIKE '2026-06-%'
    GROUP BY report_date
    ORDER BY report_date ASC
  `);
  console.log(JSON.stringify(rows, null, 2));
  process.exit(0);
}

run();
