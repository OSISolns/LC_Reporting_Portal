const { createClient } = require('@libsql/client');
const path = require('path');
const fs = require('fs');

async function run() {
  const dbFiles = [
    'reporting-1 (3).db',
    'reporting-1 (1).db',
    'reporting-1.db',
    'reporting-1_local_backup.db',
    'backend/database.db',
    'backend/local.db'
  ];

  console.log('--- INSPECTING JUNE 2026 DATA ACROSS BACKUPS ---');

  for (const file of dbFiles) {
    const fullPath = path.join(__dirname, '../..', file);
    if (fs.existsSync(fullPath)) {
      try {
        const localClient = createClient({ url: `file:${fullPath}` });
        
        // Count metrics for June
        const { rows: mCount } = await localClient.execute(
          "SELECT COUNT(*) as cnt FROM daily_report_metrics WHERE report_date LIKE '2026-06%'"
        );
        
        // Count logs for June
        const { rows: lCount } = await localClient.execute(
          "SELECT COUNT(*) as cnt FROM daily_procedure_logs WHERE report_date LIKE '2026-06%'"
        );

        console.log(`File: "${file}"`);
        console.log(`  June 2026 metrics: ${mCount[0].cnt} rows`);
        console.log(`  June 2026 procedure logs: ${lCount[0].cnt} rows`);

        if (mCount[0].cnt > 0) {
          const { rows: sample } = await localClient.execute(
            "SELECT report_date, COUNT(*) as cnt FROM daily_report_metrics WHERE report_date LIKE '2026-06%' GROUP BY report_date ORDER BY report_date"
          );
          console.log(`  Dates present:`, sample.map(s => `${s.report_date} (${s.cnt} rows)`).join(', '));
        }

        localClient.close();
      } catch (e) {
        console.log(`File: "${file}" - Error: ${e.message}`);
      }
    }
  }
}

run();
