'use strict';
require('dotenv').config();
const { createClient } = require('@libsql/client');
const bcrypt = require('bcryptjs');

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function addPARole() {
  try {
    console.log('🩺 Adding PA role and test user...');

    // 1. Add role
    await client.execute({
      sql: 'INSERT INTO roles (name, display_name) VALUES (?, ?) ON CONFLICT (name) DO NOTHING',
      args: ['pa', 'MD Personal Assistant']
    });
    console.log('✅ PA role added.');

    // 2. Get role ID
    const { rows: roles } = await client.execute({
      sql: 'SELECT id FROM roles WHERE name = ?',
      args: ['pa']
    });
    const paRoleId = roles[0].id;

    // 3. Add test user
    const passwordHash = await bcrypt.hash('pa123', 10);
    await client.execute({
      sql: `INSERT INTO users (full_name, username, email, password_hash, role_id) 
            VALUES (?, ?, ?, ?, ?) 
            ON CONFLICT (username) DO NOTHING`,
      args: ['MD Personal Assistant', 'pa_user', 'pa@legacyclinics.rw', passwordHash, paRoleId]
    });
    console.log('✅ Test PA user added (pa_user / pa123).');

    // 4. Add Permissions
    const paPermissions = [
      { module: 'clinical_observation', action: 'view', granted: 1 },
      { module: 'reports', action: 'view', granted: 1 }
    ];

    for (const perm of paPermissions) {
      await client.execute({
        sql: `INSERT INTO role_permissions (role_name, module, action, granted)
              VALUES (?, ?, ?, ?) ON CONFLICT(role_name, module, action) DO UPDATE SET granted=excluded.granted`,
        args: ['pa', perm.module, perm.action, perm.granted]
      });
    }
    console.log('✅ PA permissions added.');

    console.log('✨ Database provisioning complete.');
  } catch (err) {
    console.error('❌ Failed:', err);
  } finally {
    client.close();
  }
}

addPARole();
