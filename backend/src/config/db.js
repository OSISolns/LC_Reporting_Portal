'use strict';
require('dotenv').config();
const { Pool } = require('pg');

const dbPassword = String(process.env.DB_PASSWORD || '');

const connectionConfig = process.env.DATABASE_URL ? {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
} : {
  host:                  process.env.DB_HOST     || 'localhost',
  port:                  parseInt(process.env.DB_PORT || '5432', 10),
  database:              process.env.DB_NAME     || 'lc_reporting',
  user:                  process.env.DB_USER     || 'postgres',
  password:              dbPassword,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
};

const pool = new Pool({
  ...connectionConfig,
  max:                   20,
  idleTimeoutMillis:     30000,
  connectionTimeoutMillis: 3000,
});

pool.on('connect', () => {
  // Uncomment for debug:
  // console.log('📦 New DB client connected');
});

pool.on('error', (err) => {
  console.error('💥 Unexpected PostgreSQL pool error:', err.message);
});

module.exports = {
  query:   (text, params) => pool.query(text, params),
  pool,
};
