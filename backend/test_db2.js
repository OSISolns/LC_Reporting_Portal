const db = require('./src/config/db');

(async () => {
  try {
    const { rows: users } = await db.query(`SELECT * FROM users WHERE username = 'lc_souzan'`);
    console.log("Users Souzan:", users);
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
})();
