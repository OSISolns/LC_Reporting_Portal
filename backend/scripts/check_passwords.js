require('dotenv').config();
const { createClient } = require('@libsql/client');
const bcrypt = require('bcryptjs');

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function run() {
  try {
    const { rows } = await client.execute('SELECT username, full_name, password_hash FROM users WHERE is_active = 1');
    const usersWith1234 = [];

    for (const user of rows) {
      if (user.password_hash) {
        const isMatch = await bcrypt.compare('1234', user.password_hash);
        if (isMatch) {
          usersWith1234.push(`${user.full_name} (@${user.username})`);
        }
      }
    }

    console.log(`Found ${usersWith1234.length} active users with password '1234':`);
    usersWith1234.forEach(u => console.log(`- ${u}`));

  } catch (err) {
    console.error('Error:', err);
  }
}

run();
