const { createClient } = require('@libsql/client');
require('dotenv').config({ path: '.env' });

const tursoUrl = process.env.PROD_TURSO_DATABASE_URL || process.env.TURSO_DATABASE_URL || process.env.lcreporting_TURSO_DATABASE_URL;
const tursoAuthToken = process.env.PROD_TURSO_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN || process.env.lcreporting_TURSO_AUTH_TOKEN;

const client = createClient({ url: tursoUrl, authToken: tursoAuthToken });

async function run() {
  try {
    const res = await client.execute("SELECT 1");
    console.log("DB connection OK:", res);
  } catch (e) {
    console.error("DB connection error:", e);
  }
}
run();
