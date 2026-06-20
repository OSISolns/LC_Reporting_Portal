const db = require('../src/config/db');
const { createClient } = require('@libsql/client');
const path = require('path');
const fs = require('fs');

async function run() {
  console.log('🔌 Connecting to Turso Cloud...');
  const { rows: tursoProvs } = await db.query('SELECT id, name FROM providers');
  const tursoProvMap = new Map(tursoProvs.map(p => [Number(p.id), p.name]));
  console.log(`Turso has ${tursoProvMap.size} providers.`);

  const dbFiles = [
    'reporting-1 (3).db',
    'reporting-1 (1).db',
    'reporting-1.db',
    'reporting-1_local_backup.db'
  ];

  for (const file of dbFiles) {
    const fullPath = path.join(__dirname, '../..', file);
    if (fs.existsSync(fullPath)) {
      try {
        const localClient = createClient({ url: `file:${fullPath}` });
        const { rows: localProvs } = await localClient.execute('SELECT id, name FROM providers');
        
        console.log(`\nFile: "${file}" - has ${localProvs.length} providers.`);
        
        // Find providers in local but not in Turso
        const missing = [];
        for (const p of localProvs) {
          const id = Number(p.id);
          if (!tursoProvMap.has(id)) {
            missing.push(`[${id}] ${p.name}`);
          }
        }
        
        if (missing.length > 0) {
          console.log(`  ⚠️  ${missing.length} providers missing from Turso:`, missing);
        } else {
          console.log(`  ✅ All providers match Turso.`);
        }
        
        localClient.close();
      } catch (e) {
        console.log(`Error checking "${file}": ${e.message}`);
      }
    }
  }
  process.exit(0);
}

run();
