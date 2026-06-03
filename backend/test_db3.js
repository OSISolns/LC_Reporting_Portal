const db = require('./src/config/db');

(async () => {
  try {
    const { rows: users } = await db.query(`SELECT id, username, full_name FROM users`);
    console.log("All Users:", users);
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
})();
