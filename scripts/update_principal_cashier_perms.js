'use strict';
const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');

async function updateDatabase(envFile) {
  const envPath = path.resolve(__dirname, '..', envFile);
  if (!fs.existsSync(envPath)) {
    console.log(`⚠️ Environment file ${envFile} not found, skipping.`);
    return;
  }

  console.log(`📝 Loading environment from ${envFile}...`);
  const envContent = fs.readFileSync(envPath, 'utf-8');
  let databaseUrl = '';
  let authToken = '';

  envContent.split('\n').forEach(line => {
    const matchUrl = line.match(/^TURSO_DATABASE_URL=["']?([^"'\s]+)["']?/);
    const matchToken = line.match(/^TURSO_AUTH_TOKEN=["']?([^"'\s]+)["']?/);
    if (matchUrl) databaseUrl = matchUrl[1];
    if (matchToken) authToken = matchToken[1];
  });

  if (!databaseUrl || !authToken) {
    console.log(`⚠️ Could not parse TURSO_DATABASE_URL or TURSO_AUTH_TOKEN from ${envFile}`);
    return;
  }

  console.log(`Connecting to: ${databaseUrl}`);
  const client = createClient({ url: databaseUrl, authToken });

  try {
    // 1. Ensure the 'review' action is added to the cancellations and refunds modules if needed
    // (Usually module definitions are in permission_modules table)
    const { rows: modules } = await client.execute("SELECT * FROM permission_modules WHERE name IN ('cancellations', 'refunds')");
    for (const mod of modules) {
      let actions = JSON.parse(mod.actions);
      if (!actions.includes('review')) {
        actions.push('review');
        await client.execute({
          sql: "UPDATE permission_modules SET actions = ? WHERE name = ?",
          args: [JSON.stringify(actions), mod.name]
        });
        console.log(`✅ Added 'review' to allowed actions for module '${mod.name}' in permission_modules`);
      }
    }

    // 2. Insert or update the role permission to grant 'review' to 'principal_cashier'
    await client.execute({
      sql: `INSERT INTO role_permissions (role_name, module, action, granted, updated_by, updated_at)
            VALUES ('principal_cashier', 'cancellations', 'review', 1, 1, (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')))
            ON CONFLICT(role_name, module, action) DO UPDATE SET granted = 1, updated_at = (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`,
      args: []
    });
    console.log(`✅ Granted 'review' permission on 'cancellations' to 'principal_cashier'`);

    await client.execute({
      sql: `INSERT INTO role_permissions (role_name, module, action, granted, updated_by, updated_at)
            VALUES ('principal_cashier', 'refunds', 'review', 1, 1, (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')))
            ON CONFLICT(role_name, module, action) DO UPDATE SET granted = 1, updated_at = (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`,
      args: []
    });
    console.log(`✅ Granted 'review' permission on 'refunds' to 'principal_cashier'`);

  } catch (err) {
    console.error(`💥 Error updating database for ${envFile}:`, err.message);
  } finally {
    client.close();
  }
}

async function run() {
  await updateDatabase('.env.development.local');
  await updateDatabase('.env.local');
  console.log('🎉 Done applying database permission updates!');
}

run().catch(console.error);
