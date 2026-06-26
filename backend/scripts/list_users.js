require('dotenv').config({ path: '../.env.local' });
const { createClient } = require('@libsql/client');

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function main() {
  const { rows } = await client.execute("SELECT u.id, u.username, u.full_name, r.name as role_name FROM users u LEFT JOIN roles r ON u.role_id = r.id");
  console.log('All Users:');
  console.table(rows);
  process.exit(0);
}
main().catch(err => { console.error(err); process.exit(1); });
