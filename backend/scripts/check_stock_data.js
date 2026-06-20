const { createClient } = require('@libsql/client');
const path = require('path');
const fs = require('fs');

async function run() {
  const dbFiles = [
    'reporting-1 (3).db',
    'reporting-1 (1).db',
    'reporting-1.db',
    'reporting-1_local_backup.db',
    'backend/local.db'
  ];

  console.log('--- INSPECTING NURSING STOCK & LOGS ACROSS BACKUPS ---');

  for (const file of dbFiles) {
    const fullPath = path.join(__dirname, '../..', file);
    if (fs.existsSync(fullPath)) {
      try {
        const localClient = createClient({ url: `file:${fullPath}` });
        
        // Count nursing_monthly_stock
        const { rows: stockCount } = await localClient.execute(
          "SELECT COUNT(*) as cnt FROM nursing_monthly_stock"
        );

        // Count nursing_monthly_stock for June 2026 (month_year = '06-2026')
        const { rows: juneStockCount } = await localClient.execute(
          "SELECT COUNT(*) as cnt FROM nursing_monthly_stock WHERE month_year = '06-2026'"
        );
        
        // Count nursing_stock_change_logs
        const { rows: logCount } = await localClient.execute(
          "SELECT COUNT(*) as cnt FROM nursing_stock_change_logs"
        );

        // Count nursing_stock_change_logs for June 2026 (month_year = '06-2026')
        const { rows: juneLogCount } = await localClient.execute(
          "SELECT COUNT(*) as cnt FROM nursing_stock_change_logs WHERE month_year = '06-2026'"
        );

        console.log(`File: "${file}"`);
        console.log(`  nursing_monthly_stock: ${stockCount[0].cnt} total rows (${juneStockCount[0].cnt} for June 2026)`);
        console.log(`  nursing_stock_change_logs: ${logCount[0].cnt} total rows (${juneLogCount[0].cnt} for June 2026)`);
        localClient.close();
      } catch (e) {
        console.log(`File: "${file}" - Error: ${e.message}`);
      }
    }
  }
}

run();
