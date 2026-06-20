const db = require('../src/config/db');
const { createClient } = require('@libsql/client');
const path = require('path');
const fs = require('fs');

async function run() {
  console.log('🔌 Connecting to Turso Cloud...');
  
  try {
    // 1. Fetch current Turso departments
    const { rows: tursoDepts } = await db.query('SELECT id, name FROM departments');
    console.log('Turso departments:', tursoDepts);
    const tursoDeptMap = new Map(); // name (uppercase) -> id
    tursoDepts.forEach(d => {
      tursoDeptMap.set(d.name.toUpperCase().trim(), Number(d.id));
    });

    // 2. Fetch current Turso providers
    const { rows: tursoProvs } = await db.query('SELECT id, name FROM providers');
    const tursoProvIds = new Set(tursoProvs.map(p => Number(p.id)));
    console.log(`Turso has ${tursoProvIds.size} providers.`);

    // 3. Find local database files
    const dbFiles = [
      'reporting-1 (3).db',
      'reporting-1 (1).db',
      'reporting-1.db',
      'reporting-1_local_backup.db',
      'backend/database.db',
      'backend/local.db'
    ];

    let bestMFile = null;
    let bestMCount = 0;
    let bestMRows = [];
    let localDeptMap = new Map(); // old_id -> name (uppercase)

    for (const file of dbFiles) {
      const fullPath = path.join(__dirname, '../..', file);
      if (fs.existsSync(fullPath)) {
        try {
          const localClient = createClient({ url: `file:${fullPath}` });
          
          const { rows: mCountRes } = await localClient.execute('SELECT COUNT(*) as cnt FROM daily_report_metrics');
          const mCount = Number(mCountRes[0]?.cnt || 0);
          console.log(`Local DB "${file}" has ${mCount} daily_report_metrics rows.`);
          
          if (mCount > bestMCount) {
            bestMCount = mCount;
            bestMFile = file;
            
            // Get metrics rows
            const { rows: dataRows } = await localClient.execute('SELECT * FROM daily_report_metrics');
            bestMRows = dataRows;

            // Get local departments to build the mapping
            try {
              const { rows: localDepts } = await localClient.execute('SELECT id, name FROM departments');
              localDeptMap.clear();
              localDepts.forEach(d => {
                localDeptMap.set(Number(d.id), d.name.toUpperCase().trim());
              });
            } catch (errDepts) {
              console.log(`Could not read departments from ${file}: ${errDepts.message}`);
            }
          }
          localClient.close();
        } catch (e) {
          console.log(`Error checking local DB "${file}": ${e.message}`);
        }
      }
    }

    if (bestMCount === 0) {
      console.log('❌ No backup metrics found in any local SQLite database files.');
      process.exit(1);
    }

    console.log(`\nFound best backup in "${bestMFile}" with ${bestMCount} rows.`);

    // 4. Build ID mapping
    const deptIdMapping = new Map(); // old_id -> new_id
    let unmappedDepts = new Set();

    localDeptMap.forEach((name, oldId) => {
      // Direct name match or sub-string match fallback
      let newId = tursoDeptMap.get(name);
      if (!newId) {
        // Try fuzzy matching or fallback to default department
        for (const [tName, tId] of tursoDeptMap.entries()) {
          if (name.includes(tName) || tName.includes(name)) {
            newId = tId;
            break;
          }
        }
      }

      if (newId) {
        deptIdMapping.set(oldId, newId);
      } else {
        unmappedDepts.add(`${name} (${oldId})`);
      }
    });

    if (unmappedDepts.size > 0) {
      console.log('⚠️ Unmapped old departments:', Array.from(unmappedDepts));
    }
    console.log('Department ID Mapping (Old ID -> New ID):');
    deptIdMapping.forEach((newId, oldId) => {
      console.log(`  ${oldId} (${localDeptMap.get(oldId)}) -> ${newId}`);
    });

    // 5. Restore metrics with mapping
    console.log('\nRestoring metrics with foreign key mapping to Turso Cloud...');
    
    // Deleting any existing rows first
    await db.query('DELETE FROM daily_report_metrics');

    let skippedCount = 0;
    const batchSize = 100;
    for (let i = 0; i < bestMRows.length; i += batchSize) {
      const chunk = bestMRows.slice(i, i + batchSize);
      const stmts = [];

      for (const row of chunk) {
        const providerId = row.provider_id !== undefined && row.provider_id !== null ? Number(row.provider_id) : null;
        
        // Skip if provider doesn't exist in Turso (safeguard for integrity)
        if (providerId !== null && !tursoProvIds.has(providerId)) {
          skippedCount++;
          continue;
        }

        const oldDeptId = row.department_id !== undefined && row.department_id !== null ? Number(row.department_id) : null;
        let newDeptId = null;
        if (oldDeptId !== null) {
          newDeptId = deptIdMapping.get(oldDeptId) || null;
        }

        const id = row.id !== undefined && row.id !== null ? Number(row.id) : null;
        const report_date = row.report_date !== undefined && row.report_date !== null ? String(row.report_date) : '';
        const patient_count = row.patient_count !== undefined && row.patient_count !== null ? Number(row.patient_count) : 0;
        const follow_up_count = row.follow_up_count !== undefined && row.follow_up_count !== null ? Number(row.follow_up_count) : 0;

        stmts.push({
          sql: `INSERT INTO daily_report_metrics (id, report_date, provider_id, department_id, patient_count, follow_up_count)
                VALUES (?, ?, ?, ?, ?, ?)`,
          args: [id, report_date, providerId, newDeptId, patient_count, follow_up_count]
        });
      }

      if (stmts.length > 0) {
        await db.batch(stmts);
      }
    }

    console.log(`\n✅ Metrics restored. Skipped ${skippedCount} rows due to missing providers.`);
    const { rows: verifyM } = await db.query('SELECT COUNT(*) as cnt FROM daily_report_metrics');
    console.log(`Turso metrics count now: ${verifyM[0]?.cnt}`);
    
    process.exit(0);
  } catch (err) {
    console.error('Error during restore:', err);
    process.exit(1);
  }
}

run();
