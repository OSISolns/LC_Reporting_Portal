const db = require('./src/config/db');

async function checkUsers() {
  try {
    const { rows } = await db.query(`
      SELECT u.id, u.username, u.full_name, r.name as role, u.is_active 
      FROM users u 
      JOIN roles r ON u.role_id = r.id
    `);
    console.table(rows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkUsers();
