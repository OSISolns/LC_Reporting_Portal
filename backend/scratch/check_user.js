
require('dotenv').config({ path: '/home/noble/Documents/LC_APPS/LC_Reporting_Portal/backend/.env' });
const db = require('/home/noble/Documents/LC_APPS/LC_Reporting_Portal/backend/src/config/db');

async function checkUser() {
  try {
    const result = await db.query('SELECT username, password_hash, is_active FROM users WHERE username = $1', ['lc_valery']);
    console.log('User Data:', JSON.stringify(result.rows, null, 2));
  } catch (error) {
    console.error('Error checking user:', error);
  } finally {
    process.exit(0);
  }
}

checkUser();
