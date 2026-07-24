const db = require('./backend/src/config/db');

async function check() {
  const { rows } = await db.query('SELECT id, user_stn1, user_minor FROM nursing_monthly_stock WHERE consumed > 0 LIMIT 10');
  console.log(rows);
  process.exit(0);
}
check();
