const db = require('./src/config/db');

async function checkColumns() {
  try {
    const { rows } = await db.query('PRAGMA table_info(users)');
    console.table(rows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkColumns();
