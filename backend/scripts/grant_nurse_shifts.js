'use strict';
require('dotenv').config();
const { createClient } = require('@libsql/client');

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function run() {
  try {
    console.log('🔌 Connected to database. Granting nurse shifts.create permission...');
    
    // Insert/update role_permissions for nurse shifts.create
    const res = await client.execute({
      sql: `INSERT INTO role_permissions (role_name, module, action, granted) 
            VALUES ('nurse', 'shifts', 'create', 1) 
            ON CONFLICT(role_name, module, action) 
            DO UPDATE SET granted = 1`,
      args: []
    });
    
    console.log('✅ nurse shifts.create permission granted successfully.', res);
  } catch (err) {
    console.error('❌ Error updating database:', err);
  } finally {
    process.exit(0);
  }
}

run();
