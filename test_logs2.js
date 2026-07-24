const db = require('./backend/src/config/db');

async function check() {
  const { rows } = await db.query('SELECT * FROM nursing_stock_change_logs LIMIT 1');
  console.log(rows);
  process.exit(0);
}
check();
