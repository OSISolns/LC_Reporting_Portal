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
    .replace(/NOW\(\)/gi, "(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))")
    .replace(/CURRENT_TIMESTAMP/gi, "(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))")
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
    const result = await client.execute({ sql: transformedSql, args });
    
    // Auto-fix SQLite date strings to ISO UTC format for frontend compatibility
    const rows = result.rows.map(row => {
      const newRow = { ...row };
      for (const key in newRow) {
        const val = newRow[key];
        // Match YYYY-MM-DD HH:MM:SS or YYYY-MM-DD HH:MM:SS.SSS
        if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d+)?$/.test(val)) {
          newRow[key] = val.replace(' ', 'T') + 'Z';
        }
      }
      return newRow;
    });

    return {
      rows: rows,
      rowCount: result.rowsAffected || rows.length
    };
  } catch (err) {
    console.error('💥 Turso/LibSQL Query Error:', err.message);
    console.error('SQL:', sql);
    throw err;
  }
};

/**
 * Batch execution for transactions.
 * @param {Array} statements - Array of { sql, args } objects.
 */
const batch = async (statements) => {
  try {
    const transformed = statements.map(s => {
      const { sql, args } = transformQuery(s.sql, s.args);
      return { sql, args };
    });
    return await client.batch(transformed);
  } catch (err) {
    console.error('💥 Turso/LibSQL Batch Error:', err.message);
    throw err;
  }
};

module.exports = {
  query,
  batch,
  client,
};
