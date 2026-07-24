const db = require('./backend/src/config/db');

async function check() {
  const { rows } = await db.query("SELECT id, responsible_name, user_obs1, user_minor, user_stn1 FROM nursing_monthly_stock WHERE consumed > 0 AND (user_stn1 = '' OR user_minor = '') LIMIT 10");
  console.log(rows);
  process.exit(0);
}
check();
