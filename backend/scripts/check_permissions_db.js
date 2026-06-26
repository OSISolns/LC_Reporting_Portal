require('dotenv').config({ path: '../.env.local' });
const { createClient } = require('@libsql/client');

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function main() {
  const { rows } = await client.execute("SELECT * FROM audit_logs ORDER BY id DESC LIMIT 20");
  console.log('Audit Logs:');
  console.table(rows);
  process.exit(0);
}
main().catch(err => { console.error(err); process.exit(1); });
