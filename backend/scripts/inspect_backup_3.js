const { createClient } = require('@libsql/client');
const path = require('path');
const fs = require('fs');

async function run() {
  const filePath = path.join(__dirname, '../../reporting-1 (3).db');
  console.log(`Inspecting ${filePath}...`);
  if (!fs.existsSync(filePath)) {
    console.log('File does not exist.');
    return;
  }

  const client = createClient({ url: `file:${filePath}` });
  
  try {
    const { rows: metrics } = await client.execute('SELECT COUNT(*) as cnt FROM daily_report_metrics');
    console.log('Metrics count:', metrics[0].cnt);
    
    const { rows: logs } = await client.execute('SELECT COUNT(*) as cnt FROM daily_procedure_logs');
    console.log('Logs count:', logs[0].cnt);
    
    const { rows: depts } = await client.execute('SELECT * FROM departments');
    console.log('Departments:', depts);

    const { rows: sampleMetrics } = await client.execute('SELECT * FROM daily_report_metrics LIMIT 5');
    console.log('Sample metrics:', sampleMetrics);

    const { rows: sampleLogs } = await client.execute('SELECT * FROM daily_procedure_logs LIMIT 5');
    console.log('Sample logs:', sampleLogs);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    client.close();
  }
}

run();
