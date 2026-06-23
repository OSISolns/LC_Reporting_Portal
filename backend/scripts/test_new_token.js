const path = require('path');
const dotenv = require('dotenv');
const { createClient } = require('@libsql/client');

// Load environment variables from the root .env.local file
dotenv.config({ path: path.join(__dirname, '..', '..', '.env.local') });

const tursoUrl = process.env.TURSO_DATABASE_URL;
const tursoAuthToken = process.env.TURSO_AUTH_TOKEN;

console.log(`Testing connection to: ${tursoUrl}`);
console.log(`Token starts with: ${tursoAuthToken ? tursoAuthToken.substring(0, 15) : 'None'}...`);

if (!tursoUrl || !tursoAuthToken) {
  console.error('❌ Missing credentials in .env.local');
  process.exit(1);
}

const client = createClient({ url: tursoUrl, authToken: tursoAuthToken });

async function run() {
  try {
    const res = await client.execute("SELECT 1 as test");
    console.log("✅ Success! Connection established. Result:", res.rows);
  } catch (err) {
    console.error("❌ Connection failed with error:", err.message);
  }
  process.exit(0);
}

run();
