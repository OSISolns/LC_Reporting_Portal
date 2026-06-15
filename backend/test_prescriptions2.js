const { createClient } = require('@libsql/client');
require('dotenv').config({ path: '.env.production' });

// Try all possible env var combinations
const url = process.env.PROD_TURSO_DATABASE_URL || process.env.TURSO_DATABASE_URL;
const token = process.env.PROD_TURSO_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN;
console.log("Using URL:", url);
