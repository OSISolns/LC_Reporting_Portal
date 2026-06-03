const db = require('./src/config/db');

(async () => {
  try {
    const { rows } = await db.query(`
      SELECT l.*, COALESCE(u.full_name, l.updated_by) as updated_by 
      FROM nursing_stock_change_logs l
      LEFT JOIN users u ON LOWER(l.updated_by) = LOWER(u.username)
      LIMIT 5
    `);
    console.log("Joined Logs:", rows);

    const { rows: logs } = await db.query(`SELECT * FROM nursing_stock_change_logs LIMIT 5`);
    console.log("Raw Logs:", logs);
    
    const { rows: users } = await db.query(`SELECT * FROM users LIMIT 5`);
    console.log("Users:", users);

  } catch (e) {
    console.error(e);
  }
  process.exit(0);
})();
