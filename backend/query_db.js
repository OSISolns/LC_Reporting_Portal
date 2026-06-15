const { createClient } = require('@libsql/client');
require('dotenv').config({ path: '.env' });
const client = createClient({
  url: process.env.PROD_TURSO_DATABASE_URL || process.env.TURSO_DATABASE_URL || process.env.lcreporting_TURSO_DATABASE_URL,
  authToken: process.env.PROD_TURSO_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN || process.env.lcreporting_TURSO_AUTH_TOKEN,
});

async function run() {
  const { rows } = await client.execute(`
    SELECT
      co.id, co.patient_id, co.patient_name, co.status,
      co.medication_mar_json, co.identification_json
    FROM clinical_observations co
    WHERE co.medication_mar_json IS NOT NULL 
      AND co.medication_mar_json != '{}'
    ORDER BY co.updated_at DESC LIMIT 5
  `);
  console.log(JSON.stringify(rows, null, 2));
}
run().catch(console.error);
