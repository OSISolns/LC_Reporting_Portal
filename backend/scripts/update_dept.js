require('dotenv').config({ path: '../.env' });
const { createClient } = require('@libsql/client');

async function updateDept() {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoAuthToken = process.env.TURSO_AUTH_TOKEN;

  if (!tursoUrl || !tursoAuthToken) {
    console.error('Missing Turso credentials');
    process.exit(1);
  }

  const client = createClient({
    url: tursoUrl,
    authToken: tursoAuthToken,
  });

  try {
    const res = await client.execute("UPDATE departments SET name = 'INTERNAL MEDECINE' WHERE name = 'INT'");
    console.log(`Updated ${res.rowsAffected} rows in departments table.`);
  } catch (err) {
    console.error('Error updating department:', err);
  }
}

updateDept();
