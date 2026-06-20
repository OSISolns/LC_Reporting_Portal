const { createClient } = require('@libsql/client');
const path = require('path');
const fs = require('fs');

async function run() {
  const dbFiles = [
    'reporting-1 (3).db',
    'reporting-1 (1).db',
    'reporting-1.db',
    'reporting-1_local_backup.db'
  ];

  for (const file of dbFiles) {
    const fullPath = path.join(__dirname, '../..', file);
    if (!fs.existsSync(fullPath)) continue;
    console.log(`\n--- DB FILE: ${file} ---`);
    const client = createClient({ url: `file:${fullPath}` });
    try {
      const { rows } = await client.execute(`
        SELECT report_date, COUNT(*) as cnt
        FROM daily_procedure_logs
        WHERE report_date LIKE '2026-06-%'
        GROUP BY report_date
        ORDER BY report_date ASC
      `);
      console.log(rows);
    } catch (e) {
      console.error(e.message);
    } finally {
      client.close();
    }
  }
  process.exit(0);
}

run();
