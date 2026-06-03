'use strict';
require('dotenv').config();
const { createClient } = require('@libsql/client');
const bcrypt = require('bcryptjs');

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function addStockManagerRole() {
  try {
    console.log('🩺 Adding Stock Manager role and test user...');

    // 1. Add role
    await client.execute({
      sql: 'INSERT INTO roles (name, display_name) VALUES (?, ?) ON CONFLICT (name) DO NOTHING',
      args: ['stock-manager', 'Stock Manager']
    });
    console.log('✅ Stock Manager role added.');

    // 2. Get role ID
    const { rows: roles } = await client.execute({
      sql: 'SELECT id FROM roles WHERE name = ?',
      args: ['stock-manager']
    });
    const stockManagerRoleId = roles[0].id;

    // 3. Add test user
    const passwordHash = await bcrypt.hash('stock123', 10);
    await client.execute({
      sql: `INSERT INTO users (full_name, username, email, password_hash, role_id) 
            VALUES (?, ?, ?, ?, ?) 
            ON CONFLICT (username) DO NOTHING`,
      args: ['Stock Manager Sam', 'stock_manager_sam', 'sam@legacyclinics.rw', passwordHash, stockManagerRoleId]
    });
    console.log('✅ Test stock manager user added (stock_manager_sam / stock123).');

    console.log('✨ Database provisioning complete.');
  } catch (err) {
    console.error('❌ Failed:', err);
  } finally {
    client.close();
  }
}

addStockManagerRole();
