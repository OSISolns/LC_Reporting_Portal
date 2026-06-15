const { createClient } = require('@libsql/client');
require('dotenv').config({ path: '.env' });

const client = createClient({
  url: process.env.PROD_TURSO_DATABASE_URL || process.env.TURSO_DATABASE_URL,
  authToken: process.env.PROD_TURSO_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN,
});

async function run() {
  // Check total clinical observations
  const { rows: total } = await client.execute("SELECT COUNT(*) as cnt FROM clinical_observations");
  console.log("Total clinical_observations:", total[0].cnt);

  // Check ones with non-null medication_mar_json
  const { rows: withMeds } = await client.execute(
    "SELECT id, patient_name, medication_mar_json FROM clinical_observations WHERE medication_mar_json IS NOT NULL LIMIT 5"
  );
  console.log("Records with medication_mar_json:", withMeds.length);
  withMeds.forEach(r => {
    console.log("  id:", r.id, "| patient:", r.patient_name, "| med_json:", r.medication_mar_json?.substring(0, 100));
  });
}
run().catch(console.error);
