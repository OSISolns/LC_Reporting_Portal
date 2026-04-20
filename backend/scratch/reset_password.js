
require('dotenv').config({ path: '/home/noble/Documents/LC_APPS/LC_Reporting_Portal/backend/.env' });
const db = require('/home/noble/Documents/LC_APPS/LC_Reporting_Portal/backend/src/config/db');
const bcrypt = require('bcryptjs');

async function resetPassword() {
  try {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('password123', salt);
    console.log('New Hash:', hash);
    const result = await db.query('UPDATE users SET password_hash = $1 WHERE username = $2', [hash, 'lc_valery']);
    console.log('Update Result:', result);
    console.log('Successfully updated password for lc_valery');
  } catch (error) {
    console.error('Error resetting password:', error);
  } finally {
    process.exit(0);
  }
}

resetPassword();
