'use strict';
require('dotenv').config();
const { createClient } = require('@libsql/client');

/**
 * Initialize Turso (LibSQL) Client
 */
const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

/**
 * Compatibility Layer: Transforms Postgres-style SQL/params into LibSQL format.
 * - Converts $1, $2, etc. to ?
 * - Replaces NOW() with CURRENT_TIMESTAMP or DATETIME('now')
 * - Replaces ILIKE with LIKE (SQLite LIKE is case-insensitive for ASCII)
 */
const transformQuery = (sql, params) => {
  let transformedSql = sql;
  
  // 1. Convert $n placeholders to ?
  // Postgres uses $1, $2... while SQLite uses ?
  transformedSql = transformedSql.replace(/\$\d+/g, '?');

  // 2. Dialect translation
  transformedSql = transformedSql
    .replace(/ILIKE/gi, 'LIKE')
    .replace(/NOW\(\)/gi, "CURRENT_TIMESTAMP")
    .replace(/TIMESTAMPTZ/gi, 'DATETIME')
    .replace(/SERIAL/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT');

  return { sql: transformedSql, args: params || [] };
};

/**
 * Mocking the 'pg' query interface for minimal model refactoring.
 */
const query = async (sql, params = []) => {
  try {
    const { sql: transformedSql, args } = transformQuery(sql, params);
    
    // LibSQL execute returns { rows: [...], columns: [...], ... }
    const result = await client.execute({ sql: transformedSql, args });
    
    // Postgres 'pg' library returns results in a 'rows' array
    // LibSQL result already has a 'rows' array, but we ensure it matches the expected structure.
    return {
      rows: result.rows.map(row => {
        // LibSQL rows are sometimes objects, sometimes arrays depending on the call.
        // client.execute returns an array of objects.
        return row;
      }),
      rowCount: result.rows.length
    };
  } catch (err) {
    console.error('💥 Turso/LibSQL Query Error:', err.message);
    console.error('SQL:', sql);
    throw err;
  }
};

module.exports = {
  query,
  client,
};
