'use strict';
require('dotenv').config();
const { createClient } = require('@libsql/client');

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function addPAIncidentPermission() {
  try {
    console.log('🩺 Giving PA access to incident reports...');
    
    await client.execute({
      sql: `INSERT INTO role_permissions (role_name, module, action, granted)
            VALUES (?, ?, ?, ?) ON CONFLICT(role_name, module, action) DO UPDATE SET granted=excluded.granted`,
      args: ['pa', 'incident_reports', 'view', 1]
    });
    
    console.log('✅ PA incident_reports view permission added.');
  } catch (err) {
    console.error('❌ Failed:', err);
  } finally {
    client.close();
  }
}

addPAIncidentPermission();
