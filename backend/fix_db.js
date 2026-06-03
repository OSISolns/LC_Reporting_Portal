const db = require('./src/config/db');

(async () => {
  try {
    await db.query(`UPDATE nursing_stock_change_logs SET updated_by = 'lc_susan' WHERE updated_by = 'lc_souzan'`);
    console.log("Updated lc_souzan to lc_susan");
    const { rows } = await db.query(`SELECT DISTINCT updated_by FROM nursing_stock_change_logs`);
    console.log("Remaining updaters:", rows);
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
})();
