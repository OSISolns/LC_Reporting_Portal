'use strict';
require('dotenv').config();
const { createClient } = require('@libsql/client');
const bcrypt = require('bcryptjs');

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function addChefNurseRole() {
  try {
    console.log('🩺 Adding Chef Nurse role and test user...');

    // 1. Add role
    await client.execute({
      sql: 'INSERT INTO roles (name, display_name) VALUES (?, ?) ON CONFLICT (name) DO NOTHING',
      args: ['chef-nurse', 'Chief Nurse Manager']
    });
    console.log('✅ Chef Nurse role added.');

    // 2. Get role ID
    const { rows: roles } = await client.execute({
      sql: 'SELECT id FROM roles WHERE name = ?',
      args: ['chef-nurse']
    });
    const chefNurseRoleId = roles[0].id;

    // 3. Add test user
    const passwordHash = await bcrypt.hash('nurse123', 10);
    await client.execute({
      sql: `INSERT INTO users (full_name, username, email, password_hash, role_id) 
            VALUES (?, ?, ?, ?, ?) 
            ON CONFLICT (username) DO NOTHING`,
      args: ['Chief Nurse Clara Barton', 'chef_nurse_clara', 'clara@legacyclinics.rw', passwordHash, chefNurseRoleId]
    });
    console.log('✅ Test chief nurse user added (chef_nurse_clara / nurse123).');

    console.log('✨ Database provisioning complete.');
  } catch (err) {
    console.error('❌ Failed:', err);
  } finally {
    client.close();
  }
}

addChefNurseRole();
