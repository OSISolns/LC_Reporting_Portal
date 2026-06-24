'use strict';
require('dotenv').config();
const db = require('../src/config/db');
const bcrypt = require('bcryptjs');

async function run() {
  try {
    console.log('🩺 Seeding Medical Director user...');

    // 1. Get role ID
    const { rows: roles } = await db.query('SELECT id FROM roles WHERE name = ?', ['medical_director']);
    if (roles.length === 0) {
      throw new Error('Role "medical_director" not found. Make sure migrations ran successfully.');
    }
    const roleId = roles[0].id;

    // 2. Add test user
    const passwordHash = await bcrypt.hash('director123', 10);
    await db.query(`
      INSERT INTO users (full_name, username, email, password_hash, role_id) 
      VALUES (?, ?, ?, ?, ?) 
      ON CONFLICT (username) DO NOTHING
    `, ['Dr. Miranda Bailey', 'director_miranda', 'miranda@legacyclinics.rw', passwordHash, roleId]);
    console.log('✅ Test Medical Director user verified/added (director_miranda / director123).');

    process.exit(0);
  } catch (err) {
    console.error('❌ Failed:', err);
    process.exit(1);
  }
}

run();
