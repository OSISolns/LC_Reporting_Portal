const db = require('./backend/src/config/db');

async function check() {
  const { rows } = await db.query('SELECT id, logged_by, logged_by_name FROM consumables_log LIMIT 10');
  console.log(rows);
  process.exit(0);
}
check();
