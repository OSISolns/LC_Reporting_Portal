const db = require('./src/config/db');

(async () => {
  try {
    const { rows } = await db.query(`SELECT DISTINCT updated_by FROM nursing_stock_change_logs`);
    console.log("Distinct updaters in logs:", rows);
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
})();
