'use strict';
require('dotenv').config();
const { createClient } = require('@libsql/client');
const bcrypt = require('bcryptjs');

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function addNurseRole() {
  try {
    console.log('🏥 Adding Nurse role and test user...');

    // 1. Add role
    await client.execute({
      sql: 'INSERT INTO roles (name, display_name) VALUES (?, ?) ON CONFLICT (name) DO NOTHING',
      args: ['nurse', 'Clinical Nurse']
    });
    console.log('✅ Nurse role added.');

    // 2. Get role ID
    const { rows: roles } = await client.execute({
      sql: 'SELECT id FROM roles WHERE name = ?',
      args: ['nurse']
    });
    const nurseRoleId = roles[0].id;

    // 3. Add test user
    const passwordHash = await bcrypt.hash('nurse123', 10);
    await client.execute({
      sql: `INSERT INTO users (full_name, username, email, password_hash, role_id) 
            VALUES (?, ?, ?, ?, ?) 
            ON CONFLICT (username) DO NOTHING`,
      args: ['Nurse Florence Nightingale', 'nurse_florence', 'florence@legacyclinics.rw', passwordHash, nurseRoleId]
    });
    console.log('✅ Test nurse user added (nurse_florence / nurse123).');

    console.log('✨ Initialization complete.');
  } catch (err) {
    console.error('❌ Failed:', err);
  }
}

addNurseRole();
