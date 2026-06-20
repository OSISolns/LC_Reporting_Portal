const db = require('../src/config/db');
const { createClient } = require('@libsql/client');
const path = require('path');
const fs = require('fs');

async function run() {
  let logContent = '';
  const log = (msg) => {
    console.log(msg);
    logContent += msg + '\n';
  };

  try {
    // 1. Check Turso database
    log('--- TURSO CLOUD DATABASE STATUS ---');
    const { rows: metricsCount } = await db.query('SELECT COUNT(*) as count FROM daily_report_metrics');
    log(`daily_report_metrics count: ${metricsCount[0].count}`);
    const { rows: logsCount } = await db.query('SELECT COUNT(*) as count FROM daily_procedure_logs');
    log(`daily_procedure_logs count: ${logsCount[0].count}`);
    const { rows: providersCount } = await db.query('SELECT COUNT(*) as count FROM providers');
    log(`providers count: ${providersCount[0].count}`);

    // 2. Check local database files
    const dbFiles = [
      'reporting-1.db',
      'reporting-1 (1).db',
      'reporting-1 (3).db',
      'reporting-1_local_backup.db',
      'backend/local.db',
      'backend/database.sqlite'
    ];

    for (const file of dbFiles) {
      const fullPath = path.join(__dirname, '..', file);
      if (fs.existsSync(fullPath)) {
        log(`\n--- LOCAL DB FILE: ${file} ---`);
        try {
          const localClient = createClient({ url: `file:${fullPath}` });
          const { rows: mCount } = await localClient.execute('SELECT COUNT(*) as count FROM daily_report_metrics');
          const { rows: lCount } = await localClient.execute('SELECT COUNT(*) as count FROM daily_procedure_logs');
          log(`  daily_report_metrics count: ${mCount[0].count}`);
          log(`  daily_procedure_logs count: ${lCount[0].count}`);
          localClient.close();
        } catch (e) {
          log(`  Error querying ${file}: ${e.message}`);
        }
      }
    }
  } catch (err) {
    log(`Error: ${err.message}`);
  }

  fs.writeFileSync(path.join(__dirname, '../db_counts.txt'), logContent);
}

run();
