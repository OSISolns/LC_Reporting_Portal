'use strict';
require('dotenv').config();
const { createClient } = require('@libsql/client');
const bcrypt = require('bcryptjs');

// Helper to get client with fallback
const getClient = async () => {
  let client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  try {
    await client.execute("SELECT 1");
    console.log('🔌 Connected to Turso Cloud.');
    return client;
  } catch (err) {
    console.warn('⚠️ Could not connect to Turso Cloud. Falling back to local SQLite database (local.db)...');
    return createClient({
      url: 'file:local.db', // relative to backend root
    });
  }
};

async function addDoctorRole() {
  try {
    const client = await getClient();
    console.log('🩺 Adding Doctor role and test user...');

    // 1. Add role
    await client.execute({
      sql: 'INSERT INTO roles (name, display_name) VALUES (?, ?) ON CONFLICT (name) DO NOTHING',
      args: ['doctor', 'Medical Doctor']
    });
    console.log('✅ Doctor role added.');

    // 2. Get role ID
    const { rows: roles } = await client.execute({
      sql: 'SELECT id FROM roles WHERE name = ?',
      args: ['doctor']
    });
    
    if (roles.length === 0) {
      throw new Error('Role ID not found after insert. Roles table might not exist.');
    }
    const doctorRoleId = roles[0].id;

    // 3. Add test user
    const passwordHash = await bcrypt.hash('doctor123', 10);
    await client.execute({
      sql: `INSERT INTO users (full_name, username, email, password_hash, role_id) 
            VALUES (?, ?, ?, ?, ?) 
            ON CONFLICT (username) DO NOTHING`,
      args: ['Dr. Meredith Grey', 'doctor_meredith', 'meredith@legacyclinics.rw', passwordHash, doctorRoleId]
    });
    console.log('✅ Test doctor user added (doctor_meredith / doctor123).');

    console.log('✨ Initialization complete.');
  } catch (err) {
    console.error('❌ Failed:', err);
  }
}

addDoctorRole();
