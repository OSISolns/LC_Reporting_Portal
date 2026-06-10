require('dotenv').config();
const db = require('../src/config/db');

async function checkAudit() {
  try {
    const { rows } = await db.query('SELECT COUNT(*) as count FROM audit_logs');
    console.log('Audit Logs Count:', rows[0].count);
    
    const roles = await db.query('SELECT * FROM roles');
    console.log('Roles:', JSON.stringify(roles.rows, null, 2));

    const admins = await db.query("SELECT id, username, role_id FROM users WHERE role_id IN (SELECT id FROM roles WHERE name = 'admin')");
    console.log('Admins:', JSON.stringify(admins.rows, null, 2));
    
    const modules = await db.query('SELECT * FROM permission_modules');
    console.log('Permission Modules Count:', modules.rows.length);
    
    process.exit(0);
  } catch (err) {
    console.error('Check failed:', err);
    process.exit(1);
  }
}

checkAudit();
