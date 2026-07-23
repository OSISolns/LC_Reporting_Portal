const db = require('./backend/src/config/db');

async function check() {
  const { rows } = await db.query('SELECT id, responsible_name, user_obs1, user_minor, user_stn1 FROM nursing_monthly_stock WHERE consumed > 0 AND (user_stn1 IS NULL OR user_stn1 = "") LIMIT 10');
  console.log(rows);
  process.exit(0);
}
check();
