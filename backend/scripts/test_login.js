require('dotenv').config();
const db = require('../src/config/db');
const bcrypt = require('bcryptjs');

async function testLogin() {
  try {
    const username = 'lc_valery';
    const { rows } = await db.query(
      `SELECT u.*, r.name as role 
       FROM users u 
       JOIN roles r ON u.role_id = r.id 
       WHERE u.username = ?`,
      [username]
    );
    
    if (rows.length === 0) {
      console.log('User not found');
      process.exit(1);
    }
    
    const user = rows[0];
    console.log('User found:', {
        id: user.id,
        username: user.username,
        role: user.role
    });
    
    process.exit(0);
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  }
}

testLogin();
