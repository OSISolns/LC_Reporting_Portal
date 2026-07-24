const db = require('./backend/src/config/db');

async function fix() {
  const { rows: logs } = await db.query('SELECT id, logged_by, logged_by_name FROM consumables_log WHERE logged_by_name IS NULL AND logged_by IS NOT NULL');
  console.log(`Found ${logs.length} logs missing logged_by_name`);
  
  // also check nursing_monthly_stock if needed
  process.exit(0);
}
fix();
