const db = require('../src/config/db');

async function run() {
  try {
    const { rows: logs } = await db.query('SELECT DISTINCT updated_by FROM nursing_stock_change_logs LIMIT 10');
    console.log('Unique updated_by in logs:', logs);

    const { rows: users } = await db.query('SELECT username, full_name FROM users LIMIT 10');
    console.log('Sample users:', users);
  } catch (err) {
    console.error(err);
  }
}

run();
