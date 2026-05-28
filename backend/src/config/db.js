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

// Run dynamic schema migrations on start
(async () => {
  try {
    await client.execute("ALTER TABLE users ADD COLUMN must_change_password INTEGER DEFAULT 0");
    console.log('✅ SQLite Schema Migration: added must_change_password to users');
  } catch (err) {
    if (!err.message.includes('duplicate column name') && !err.message.includes('already exists')) {
      console.warn('⚠️ SQLite Schema Migration Notice:', err.message);
    }
  }

  try {
    await client.execute("ALTER TABLE shift_sessions ADD COLUMN start_hour TEXT");
    console.log('✅ SQLite Schema Migration: added start_hour to shift_sessions');
  } catch (err) {
    if (!err.message.includes('duplicate column name') && !err.message.includes('already exists')) {
      console.warn('⚠️ SQLite Schema Migration Notice:', err.message);
    }
  }

  try {
    await client.execute("ALTER TABLE shift_sessions ADD COLUMN wave TEXT");
    console.log('✅ SQLite Schema Migration: added wave to shift_sessions');
  } catch (err) {
    if (!err.message.includes('duplicate column name') && !err.message.includes('already exists')) {
      console.warn('⚠️ SQLite Schema Migration Notice:', err.message);
    }
  }

  // Daily Operational Report Tables
  try {
    await client.execute(`
      CREATE TABLE IF NOT EXISTS departments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL
      )
    `);
    console.log('✅ SQLite Schema Migration: created departments table');
  } catch (err) {
    console.warn('⚠️ SQLite Schema Migration Notice for departments:', err.message);
  }

  try {
    await client.execute(`
      CREATE TABLE IF NOT EXISTS providers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        title TEXT,
        department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
        is_active INTEGER DEFAULT 1
      )
    `);
    console.log('✅ SQLite Schema Migration: created providers table');
  } catch (err) {
    console.warn('⚠️ SQLite Schema Migration Notice for providers:', err.message);
  }

  try {
    await client.execute(`
      CREATE TABLE IF NOT EXISTS daily_report_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        report_date TEXT NOT NULL,
        provider_id INTEGER REFERENCES providers(id) ON DELETE CASCADE,
        department_id INTEGER REFERENCES departments(id) ON DELETE CASCADE,
        patient_count INTEGER DEFAULT 0,
        UNIQUE (report_date, provider_id)
      )
    `);
    console.log('✅ SQLite Schema Migration: created daily_report_metrics table');
  } catch (err) {
    console.warn('⚠️ SQLite Schema Migration Notice for daily_report_metrics:', err.message);
  }

  try {
    await client.execute(`
      CREATE TABLE IF NOT EXISTS daily_procedure_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        report_date TEXT NOT NULL,
        metric_name TEXT NOT NULL,
        metric_value TEXT DEFAULT '0',
        UNIQUE (report_date, metric_name)
      )
    `);
    console.log('✅ SQLite Schema Migration: created daily_procedure_logs table');
  } catch (err) {
    console.warn('⚠️ SQLite Schema Migration Notice for daily_procedure_logs:', err.message);
  }

  // Seed default data for nursing operational reports
  try {
    const { rows: providersCount } = await client.execute("SELECT COUNT(*) as count FROM providers");
    if (providersCount[0].count !== 52) {
      console.log('🌱 Refreshing/Seeding initial departments for nursing report matching reference image...');
      // Safely delete previous metrics to avoid foreign key conflicts
      await client.execute("DELETE FROM daily_report_metrics");
      await client.execute("DELETE FROM providers");
      await client.execute("DELETE FROM departments");

      const initialDepartments = [
        'GYNECOLOGY',
        'GENERAL MEDECINE',
        'INT',
        'PED',
        'NEURO',
        'UROLOGY',
        'ORTHO/GEN SURGERY',
        'ENT',
        'CHIRO',
        'Mental Health',
        'DENTAL',
        'PHYSIO'
      ];

      for (const dept of initialDepartments) {
        await client.execute({
          sql: "INSERT INTO departments (name) VALUES (?) ON CONFLICT (name) DO NOTHING",
          args: [dept]
        });
      }

      const { rows: dbDepts } = await client.execute("SELECT id, name FROM departments");
      const deptMap = dbDepts.reduce((acc, d) => ({ ...acc, [d.name]: d.id }), {});

      console.log('🌱 Seeding initial providers for nursing report matching reference image...');
      const initialProviders = [
        // GYNECOLOGY
        { name: 'Dr Gakindi', title: 'Dr', dept: 'GYNECOLOGY' },
        { name: 'Dr SITINI BERTIN', title: 'Dr', dept: 'GYNECOLOGY' },
        { name: 'Dr NKUBITO', title: 'Dr', dept: 'GYNECOLOGY' },
        { name: 'Dr NTIRUSHWA', title: 'Dr', dept: 'GYNECOLOGY' },
        { name: 'BUTOYI ALPHONSE', title: '', dept: 'GYNECOLOGY' },

        // GENERAL MEDECINE
        { name: 'Dr Fabrice N.', title: 'Dr', dept: 'GENERAL MEDECINE' },
        { name: 'Dr Yves L. Bizimana', title: 'Dr', dept: 'GENERAL MEDECINE' },
        { name: 'Dr Gihana Jacques', title: 'Dr', dept: 'GENERAL MEDECINE' },

        // INT (Internal Medicine Section)
        { name: 'Dr. Masaisa florence', title: 'Dr', dept: 'INT' },
        { name: 'DR SHEMA NSHUTI D.', title: 'Dr', dept: 'INT' },
        { name: 'DR DUFATANYE DARIUS', title: 'Dr', dept: 'INT' },
        { name: 'Dr Ganza G. JMV', title: 'Dr', dept: 'INT' },
        { name: 'DR RUTAGANDA Eric', title: 'Dr', dept: 'INT' },
        { name: 'DR BAZATSINDA A.', title: 'Dr', dept: 'INT' },
        { name: 'DR MBABAZI Maguy', title: 'Dr', dept: 'INT' },
        { name: 'DR HABYARIMANA O.', title: 'Dr', dept: 'INT' },
        { name: 'KABAKAMBIRA J.Damascene', title: '', dept: 'INT' },
        { name: 'DR SEBATUNZI Osee', title: 'Dr', dept: 'INT' },

        // PED
        { name: 'Dr KABAYIZA JC', title: 'Dr', dept: 'PED' },
        { name: 'Dr Aimable K.', title: 'Dr', dept: 'PED' },
        { name: 'Dr Christian Muhoza', title: 'Dr', dept: 'PED' },
        { name: 'Dr Mukaruziga Agnes', title: 'Dr', dept: 'PED' },
        { name: 'Dr Karangwa Valens', title: 'Dr', dept: 'PED' },

        // NEURO
        { name: 'DR KAREKEZI CLAIRE', title: 'Dr', dept: 'NEURO' },
        { name: 'DR MUTUNGIREHE SYLVES', title: 'Dr', dept: 'NEURO' },

        // UROLOGY
        { name: 'Dr Afrika G.', title: 'Dr', dept: 'UROLOGY' },
        { name: 'Dr NYIRIMODOKA ALEXANDRE', title: 'Dr', dept: 'UROLOGY' },

        // ORTHO/GEN SURGERY
        { name: 'Dr KWESIGA STEPHEN', title: 'Dr', dept: 'ORTHO/GEN SURGERY' },
        { name: 'KANSAYISA MARIE GRACE', title: '', dept: 'ORTHO/GEN SURGERY' },
        { name: 'RUBANGUKA Desire', title: '', dept: 'ORTHO/GEN SURGERY' },
        { name: 'DR INGABIRE Allen JDC', title: 'Dr', dept: 'ORTHO/GEN SURGERY' },

        // ENT
        { name: 'DR HAKIZIMANA ARISTOTE', title: 'Dr', dept: 'ENT' },
        { name: 'DR Dushimiyimana jmv', title: 'Dr', dept: 'ENT' },

        // CHIRO
        { name: 'Dr Kanyabutembo Noella', title: 'Dr', dept: 'CHIRO' },

        // Mental Health
        { name: 'Innocent Nsengiyumva', title: '', dept: 'Mental Health' },

        // DENTAL
        { name: 'Dr NYIRANEZA Esperence', title: 'Dr', dept: 'DENTAL' },
        { name: 'DR ANAMALI Rogers', title: 'Dr', dept: 'DENTAL' },
        { name: 'Dr MUGESERA Ernest', title: 'Dr', dept: 'DENTAL' },
        { name: 'Dr BANA Bede', title: 'Dr', dept: 'DENTAL' },
        { name: 'JAYAKAR G.Sargunar', title: '', dept: 'DENTAL' },
        { name: 'Sanddeep Goyal', title: '', dept: 'DENTAL' },
        { name: 'DR MICONGWE Moses', title: 'Dr', dept: 'DENTAL' },
        { name: 'Mr NDAYISENGA KALISA Gilbert', title: 'Mr', dept: 'DENTAL' },
        { name: 'Mr ERIC RUTAGANDA', title: 'Mr', dept: 'DENTAL' },
        { name: 'ISHIMWE GILBERT', title: '', dept: 'DENTAL' },

        // PHYSIO
        { name: 'Mr NAZE Thierry', title: 'Mr', dept: 'PHYSIO' },
        { name: 'Miss FRANCINE M.', title: 'Miss', dept: 'PHYSIO' },
        { name: 'Mr KARIMWABO Jean Claude', title: 'Mr', dept: 'PHYSIO' },
        { name: 'Mr NSENGIMANA Emmanuel', title: 'Mr', dept: 'PHYSIO' },
        { name: 'Miss LEAH MUTESI', title: 'Miss', dept: 'PHYSIO' },
        { name: 'Miss UWAMAHORO Sarah', title: 'Miss', dept: 'PHYSIO' },
        { name: 'INGABIRE J. Paul', title: '', dept: 'PHYSIO' }
      ];

      for (const p of initialProviders) {
        await client.execute({
          sql: "INSERT INTO providers (name, title, department_id) VALUES (?, ?, ?)",
          args: [p.name, p.title, deptMap[p.dept]]
        });
      }
      console.log('✨ Nursing Report Seed matching spreadsheet completed successfully!');
    }
  } catch (err) {
    console.error('❌ Failed to seed nursing report data:', err);
  }
})();

/**
 * Compatibility Layer: Transforms Postgres-style SQL/params into LibSQL format.
 * - Converts $1, $2, etc. to ?
 * - Replaces NOW() with CURRENT_TIMESTAMP or DATETIME('now')
 * - Replaces ILIKE with LIKE (SQLite LIKE is case-insensitive for ASCII)
 */
const transformQuery = (sql, params) => {
  let transformedSql = sql;

  // 1. Convert Postgres $n placeholders to SQLite ?
  // If the same placeholder is used multiple times (e.g. $1 or $2), we rebuild the sequential args array.
  const matches = sql.match(/\$\d+/g);
  let args = [];
  if (matches && params && params.length > 0) {
    args = matches.map(m => {
      const index = parseInt(m.substring(1), 10) - 1;
      return params[index];
    });
  } else {
    args = params || [];
  }

  transformedSql = transformedSql.replace(/\$\d+/g, '?');

  // 2. Dialect translation
  transformedSql = transformedSql
    .replace(/ILIKE/gi, 'LIKE')
    .replace(/NOW\(\)/gi, "(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))")
    .replace(/CURRENT_TIMESTAMP/gi, "(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))")
    .replace(/TIMESTAMPTZ/gi, 'DATETIME')
    .replace(/SERIAL/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT');

  return { sql: transformedSql, args };
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
