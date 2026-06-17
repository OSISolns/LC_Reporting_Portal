const db = require('./src/config/db');
const bcrypt = require('bcryptjs');

async function run() {
  const { rows } = await db.query("SELECT username, password_hash FROM users WHERE username = 'lc_valery'");
  if (rows.length === 0) {
    console.log("lc_valery not found");
  } else {
    const user = rows[0];
    const is1234 = await bcrypt.compare('1234', user.password_hash);
    const isAmahamba = await bcrypt.compare('Amahamba@2110', user.password_hash);
    console.log(`User lc_valery: 1234 is ${is1234}, Amahamba@2110 is ${isAmahamba}`);
  }
}
run().catch(console.error);
