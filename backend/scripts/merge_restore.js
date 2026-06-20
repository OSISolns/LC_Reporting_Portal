const db = require('../src/config/db');
const { createClient } = require('@libsql/client');
const path = require('path');
const fs = require('fs');

async function run() {
  console.log('🔌 Connecting to Turso Cloud...');
  
  try {
    // 1. Fetch current Turso departments & providers for reference
    const { rows: tursoDepts } = await db.query('SELECT id, name FROM departments');
    const tursoDeptMap = new Map(); // name (uppercase) -> id
    tursoDepts.forEach(d => {
      tursoDeptMap.set(d.name.toUpperCase().trim(), Number(d.id));
    });

    const { rows: tursoProvs } = await db.query('SELECT id, name FROM providers');
    const tursoProvIds = new Set(tursoProvs.map(p => Number(p.id)));

    // 2. Local databases to process
    const dbFiles = [
      'reporting-1 (3).db',
      'reporting-1 (1).db',
      'reporting-1.db',
      'reporting-1_local_backup.db',
      'backend/local.db'
    ];

    const mergedMetrics = new Map(); // key: "date_provider" -> row
    const mergedLogs = new Map();     // key: "date_metric" -> row

    for (const file of dbFiles) {
      const fullPath = path.join(__dirname, '../..', file);
      if (!fs.existsSync(fullPath)) continue;

      console.log(`\nReading records from "${file}"...`);
      const localClient = createClient({ url: `file:${fullPath}` });

      try {
        // Read local departments to map this file's department IDs
        const { rows: localDepts } = await localClient.execute('SELECT id, name FROM departments');
        const localDeptMap = new Map();
        localDepts.forEach(d => {
          localDeptMap.set(Number(d.id), d.name.toUpperCase().trim());
        });

        // Resolve new department ID mapping for this file
        const deptIdMapping = new Map();
        localDeptMap.forEach((name, oldId) => {
          let newId = tursoDeptMap.get(name);
          if (!newId) {
            for (const [tName, tId] of tursoDeptMap.entries()) {
              if (name.includes(tName) || tName.includes(name)) {
                newId = tId;
                break;
              }
            }
          }
          if (newId) deptIdMapping.set(oldId, newId);
        });

        // ── Process Metrics ───────────────────────────────────────────────────
        const { rows: metricsRows } = await localClient.execute('SELECT * FROM daily_report_metrics');
        let mCount = 0;
        for (const row of metricsRows) {
          const providerId = row.provider_id !== undefined && row.provider_id !== null ? Number(row.provider_id) : null;
          if (providerId === null || !tursoProvIds.has(providerId)) continue; // skip missing provider

          const reportDate = row.report_date !== undefined && row.report_date !== null ? String(row.report_date) : '';
          if (!reportDate) continue;

          const oldDeptId = row.department_id !== undefined && row.department_id !== null ? Number(row.department_id) : null;
          const newDeptId = oldDeptId !== null ? (deptIdMapping.get(oldDeptId) || null) : null;

          const patientCount = row.patient_count !== undefined && row.patient_count !== null ? Number(row.patient_count) : 0;
          const followUpCount = row.follow_up_count !== undefined && row.follow_up_count !== null ? Number(row.follow_up_count) : 0;

          const key = `${reportDate}_${providerId}`;
          const existing = mergedMetrics.get(key);

          if (!existing) {
            mergedMetrics.set(key, { reportDate, providerId, departmentId: newDeptId, patientCount, followUpCount });
            mCount++;
          } else {
            // Keep the one with the higher activity (patient count + follow up count)
            const existingTotal = existing.patientCount + existing.followUpCount;
            const newTotal = patientCount + followUpCount;
            if (newTotal > existingTotal) {
              mergedMetrics.set(key, { reportDate, providerId, departmentId: newDeptId, patientCount, followUpCount });
            }
          }
        }
        console.log(`  Processed ${metricsRows.length} metrics rows (added/updated ${mCount} new keys).`);

        // ── Process Logs ──────────────────────────────────────────────────────
        const { rows: logsRows } = await localClient.execute('SELECT * FROM daily_procedure_logs');
        let lCount = 0;
        for (const row of logsRows) {
          const reportDate = row.report_date !== undefined && row.report_date !== null ? String(row.report_date) : '';
          const metricName = row.metric_name !== undefined && row.metric_name !== null ? String(row.metric_name) : '';
          const metricValue = row.metric_value !== undefined && row.metric_value !== null ? String(row.metric_value) : '0';

          if (!reportDate || !metricName) continue;

          const key = `${reportDate}_${metricName}`;
          const existing = mergedLogs.get(key);

          if (!existing) {
            mergedLogs.set(key, { reportDate, metricName, metricValue });
            lCount++;
          } else {
            // Keep the one with the higher/non-zero value
            const existingVal = parseInt(existing.metricValue, 10) || 0;
            const newVal = parseInt(metricValue, 10) || 0;
            if (newVal > existingVal) {
              mergedLogs.set(key, { reportDate, metricName, metricValue });
            }
          }
        }
        console.log(`  Processed ${logsRows.length} procedure logs rows (added/updated ${lCount} new keys).`);

      } catch (e) {
        console.log(`  Error processing "${file}": ${e.message}`);
      } finally {
        localClient.close();
      }
    }

    console.log(`\n📊 Merge results:`);
    console.log(`  Total unique metrics rows to insert: ${mergedMetrics.size}`);
    console.log(`  Total unique logs rows to insert: ${mergedLogs.size}`);

    // 3. Clear Turso
    console.log('\n🧹 Clearing existing daily reports data in Turso Cloud...');
    await db.query('DELETE FROM daily_report_metrics');
    await db.query('DELETE FROM daily_procedure_logs');

    // 4. Batch Insert Metrics
    console.log('Inserting merged metrics to Turso Cloud...');
    const metricsArray = Array.from(mergedMetrics.values());
    const batchSize = 100;
    for (let i = 0; i < metricsArray.length; i += batchSize) {
      const chunk = metricsArray.slice(i, i + batchSize);
      const stmts = chunk.map(row => ({
        sql: `INSERT INTO daily_report_metrics (report_date, provider_id, department_id, patient_count, follow_up_count)
              VALUES (?, ?, ?, ?, ?)`,
        args: [row.reportDate, row.providerId, row.departmentId, row.patientCount, row.followUpCount]
      }));
      await db.batch(stmts);
    }
    console.log('✅ Metrics restored successfully.');

    // 5. Batch Insert Logs
    console.log('Inserting merged procedure logs to Turso Cloud...');
    const logsArray = Array.from(mergedLogs.values());
    for (let i = 0; i < logsArray.length; i += batchSize) {
      const chunk = logsArray.slice(i, i + batchSize);
      const stmts = chunk.map(row => ({
        sql: `INSERT INTO daily_procedure_logs (report_date, metric_name, metric_value)
              VALUES (?, ?, ?)`,
        args: [row.reportDate, row.metricName, row.metricValue]
      }));
      await db.batch(stmts);
    }
    console.log('✅ Procedure logs restored successfully.');

    const { rows: finalM } = await db.query('SELECT COUNT(*) as cnt FROM daily_report_metrics');
    const { rows: finalL } = await db.query('SELECT COUNT(*) as cnt FROM daily_procedure_logs');
    console.log(`\n🎉 Restore complete.\nTurso metrics count: ${finalM[0]?.cnt}\nTurso procedure logs count: ${finalL[0]?.cnt}`);

    process.exit(0);
  } catch (err) {
    console.error('Error during merge restore:', err);
    process.exit(1);
  }
}

run();
