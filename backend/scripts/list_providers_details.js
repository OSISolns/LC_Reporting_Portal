const db = require('../src/config/db');

async function run() {
  console.log('🔌 Connecting to Turso Cloud...');
  const { rows } = await db.query('SELECT id, name, title, specialization, specialization_id FROM providers ORDER BY id ASC');
  console.log(JSON.stringify(rows, null, 2));
  process.exit(0);
}

run();
