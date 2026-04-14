'use strict';
require('dotenv').config({ path: './.env' });
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const dbPassword = String(process.env.DB_PASSWORD || '');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'lc_reporting',
  user: process.env.DB_USER || 'postgres',
  password: dbPassword,
});

async function seed() {
  const client = await pool.connect();
  try {
    console.log('🌱 Seeding database...');

    // Get role IDs
    const { rows: roles } = await client.query('SELECT id, name FROM roles');
    const roleMap = roles.reduce((acc, r) => ({ ...acc, [r.name]: r.id }), {});

    const passwordHash = await bcrypt.hash('Legacy@2024', 10);

    const users = [
      { name: 'John Cashier', email: 'cashier@legacyclinics.com', role: 'cashier' },
      { name: 'Sarah Care', email: 'care@legacyclinics.com', role: 'customer_care' },
      { name: 'Mike Ops', email: 'ops@legacyclinics.com', role: 'operations_staff' },
      { name: 'David Sales', email: 'sales@legacyclinics.com', role: 'sales_manager' },
      { name: 'Alice COO', email: 'coo@legacyclinics.com', role: 'coo' },
      { name: 'Robert Chairman', email: 'chairman@legacyclinics.com', role: 'chairman' },
    ];

    for (const user of users) {
      await client.query(
        `INSERT INTO users (full_name, email, password_hash, role_id)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (email) DO NOTHING`,
        [user.name, user.email, passwordHash, roleMap[user.role]]
      );
      console.log(`✅ Created user: ${user.name} (${user.role})`);
    }

    console.log('✨ Seeding completed successfully!');
  } catch (err) {
    console.error('❌ Seeding failed:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
