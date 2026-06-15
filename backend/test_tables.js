const { createClient } = require('@libsql/client');
require('dotenv').config();
const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});
async function run() {
  const { rows } = await client.execute("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('clinical_observations','patient_vitals')");
  console.log("Tables found:", rows.map(r => r.name));
}
run().catch(console.error);
