'use strict';
require('dotenv').config();
const { createClient } = require('@libsql/client');

/**
 * Initialize Turso (LibSQL) Client
 */
let client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Run dynamic schema migrations on start
(async () => {
  // Connection Test & Offline Fallback
  try {
    await client.execute("SELECT 1");
    console.log('🔌 DATABASE: Successfully connected to Turso Cloud.');
  } catch (err) {
    if (err.code === 'ENOTFOUND' || err.message.includes('ENOTFOUND') || err.message.includes('fetch failed')) {
      console.warn('⚠️ Could not connect to Turso Cloud (offline or DNS failure). Falling back to local SQLite database (local.db)...');
      client = createClient({
        url: 'file:local.db',
      });
    } else {
      console.error('⚠️ Turso Cloud connection check failed, continuing with fallback:', err.message);
      client = createClient({
        url: 'file:local.db',
      });
    }
  }

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

  try {
    await client.execute("ALTER TABLE cancellation_requests ADD COLUMN original_receipt_amount REAL");
    console.log('✅ SQLite Schema Migration: added original_receipt_amount to cancellation_requests');
  } catch (err) {
    if (!err.message.includes('duplicate column name') && !err.message.includes('already exists')) {
      console.warn('⚠️ SQLite Schema Migration Notice:', err.message);
    }
  }

  try {
    await client.execute("ALTER TABLE cancellation_requests ADD COLUMN rectified_receipt_amount REAL");
    console.log('✅ SQLite Schema Migration: added rectified_receipt_amount to cancellation_requests');
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

  // ICD-11 Cache Table Migration & Seeding
  try {
    await client.execute(`
      CREATE TABLE IF NOT EXISTS icd11_cache (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        keyword TEXT UNIQUE NOT NULL,
        results TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ SQLite Schema Migration: created icd11_cache table');

    const { rows: cacheCount } = await client.execute("SELECT COUNT(*) as count FROM icd11_cache");
    if (cacheCount[0].count === 0) {
      console.log('🌱 Seeding initial ICD-11 cache for common medical conditions...');
      const seedData = [
        {
          keyword: 'malaria',
          results: [
            { code: '1A20', desc: 'Plasmodium falciparum malaria' },
            { code: '1A21', desc: 'Plasmodium vivax malaria' },
            { code: '1A22', desc: 'Plasmodium malariae malaria' },
            { code: '1A23', desc: 'Plasmodium ovale malaria' },
            { code: '1A25', desc: 'Mixed malaria' }
          ]
        },
        {
          keyword: 'cholera',
          results: [
            { code: '1A00', desc: 'Cholera' },
            { code: '1A00.0', desc: 'Cholera due to Vibrio cholerae 01, biovar cholerae' },
            { code: '1A00.1', desc: 'Cholera due to Vibrio cholerae 01, biovar eltor' }
          ]
        },
        {
          keyword: 'typhoid',
          results: [
            { code: '1A07', desc: 'Typhoid fever' },
            { code: '1A07.y', desc: 'Other specified typhoid fever' }
          ]
        },
        {
          keyword: 'hypertension',
          results: [
            { code: 'BA00', desc: 'Essential hypertension' },
            { code: 'BA01', desc: 'Hypertensive heart disease' },
            { code: 'BA02', desc: 'Hypertensive renal disease' }
          ]
        },
        {
          keyword: 'diabetes',
          results: [
            { code: '5A10', desc: 'Type 1 diabetes mellitus' },
            { code: '5A11', desc: 'Type 2 diabetes mellitus' },
            { code: '5A14', desc: 'Diabetes mellitus in pregnancy' }
          ]
        },
        {
          keyword: 'influenza',
          results: [
            { code: '1E30', desc: 'Influenza due to identified seasonal influenza virus' },
            { code: '1E31', desc: 'Influenza due to identified zoonotic or pandemic influenza virus' }
          ]
        },
        {
          keyword: 'bronchitis',
          results: [
            { code: 'CA40', desc: 'Acute bronchitis' },
            { code: 'CA42', desc: 'Chronic bronchitis' }
          ]
        },
        {
          keyword: 'gastroenteritis',
          results: [
            { code: '1A40.0', desc: 'Salmonella gastroenteritis' },
            { code: '1A40.2', desc: 'Campylobacter gastroenteritis' },
            { code: '1A40.5', desc: 'Viral gastroenteritis' },
            { code: '1A44.0', desc: 'Gastroenteritis of suspected infectious origin' }
          ]
        },
        {
          keyword: 'appendicitis',
          results: [
            { code: 'DB10', desc: 'Acute appendicitis' },
            { code: 'DB11', desc: 'Chronic appendicitis' }
          ]
        },
        {
          keyword: 'pregnancy',
          results: [
            { code: 'JA60', desc: 'Care of pregnancy' },
            { code: 'JA61', desc: 'Pregnancy-related conditions' }
          ]
        },
        {
          keyword: 'anemia',
          results: [
            { code: '3A90', desc: 'Nutritional anaemia' },
            { code: '3A90.0', desc: 'Iron deficiency anaemia' },
            { code: '3A90.1', desc: 'Folate deficiency anaemia' },
            { code: '3A90.2', desc: 'Vitamin B12 deficiency anaemia' }
          ]
        },
        {
          keyword: 'pneumonia',
          results: [
            { code: 'CA43', desc: 'Bacterial pneumonia' },
            { code: 'CA44', desc: 'Viral pneumonia' },
            { code: 'CA45', desc: 'Pneumonia due to other specified infectious organisms' }
          ]
        },
        {
          keyword: 'asthma',
          results: [
            { code: 'CA23', desc: 'Asthma' },
            { code: 'CA23.0', desc: 'Allergic asthma' },
            { code: 'CA23.1', desc: 'Non-allergic asthma' },
            { code: 'CA23.3', desc: 'Mixed asthma' }
          ]
        },
        {
          keyword: 'migraine',
          results: [
            { code: '8A80', desc: 'Migraine' },
            { code: '8A80.0', desc: 'Migraine without aura' },
            { code: '8A80.1', desc: 'Migraine with aura' }
          ]
        },
        {
          keyword: 'tonsillitis',
          results: [
            { code: 'CA01.0', desc: 'Acute streptococcal tonsillitis' },
            { code: 'CA01.2', desc: 'Acute tonsillitis due to other specified infectious agents' }
          ]
        },
        {
          keyword: 'dengue',
          results: [
            { code: '1D20', desc: 'Dengue' },
            { code: '1D20.0', desc: 'Dengue without warning signs' },
            { code: '1D20.1', desc: 'Dengue with warning signs' },
            { code: '1D20.2', desc: 'Severe dengue' }
          ]
        },
        {
          keyword: 'covid',
          results: [
            { code: 'RA01', desc: 'COVID-19' },
            { code: 'RA01.0', desc: 'COVID-19, virus identified' },
            { code: 'RA01.1', desc: 'COVID-19, virus not identified' }
          ]
        },
        {
          keyword: 'uti',
          results: [
            { code: 'GC08', desc: 'Urinary tract infection, site not specified' },
            { code: 'GC08.0', desc: 'Cystitis' },
            { code: 'GC08.1', desc: 'Urethritis' },
            { code: 'GC08.2', desc: 'Pyelonephritis' }
          ]
        },
        {
          keyword: 'urinary tract infection',
          results: [
            { code: 'GC08', desc: 'Urinary tract infection, site not specified' },
            { code: 'GC08.0', desc: 'Cystitis' },
            { code: 'GC08.1', desc: 'Urethritis' },
            { code: 'GC08.2', desc: 'Pyelonephritis' }
          ]
        },
        {
          keyword: 'tuberculosis',
          results: [
            { code: '1B10', desc: 'Tuberculosis of the respiratory system' },
            { code: '1B11', desc: 'Tuberculosis of the nervous system' },
            { code: '1B12', desc: 'Tuberculosis of other organs' }
          ]
        }
      ];

      for (const item of seedData) {
        await client.execute({
          sql: "INSERT OR IGNORE INTO icd11_cache (keyword, results) VALUES (?, ?)",
          args: [item.keyword, JSON.stringify(item.results)]
        });
      }
      console.log('✨ Seeded common ICD-11 cache records successfully!');
    }
  } catch (err) {
    console.error('❌ Failed to migrate/seed icd11_cache table:', err);
  }

  // Nursing monthly stock table creation & migration
  try {
    await client.execute(`
      CREATE TABLE IF NOT EXISTS nursing_monthly_stock (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        month_year TEXT NOT NULL,
        item_name TEXT NOT NULL,
        day INTEGER NOT NULL,
        session TEXT NOT NULL,
        stock_in_hands INTEGER DEFAULT 0,
        consumed INTEGER DEFAULT 0,
        balance INTEGER DEFAULT 0,
        responsible_name TEXT,
        expiration_date TEXT,
        status TEXT,
        category TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.execute(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_nursing_stock_unique 
      ON nursing_monthly_stock(month_year, item_name, day, session)
    `);
    console.log('✅ SQLite Schema Migration: created/verified nursing_monthly_stock table');
  } catch (err) {
    console.error('❌ Failed to initialize nursing_monthly_stock table:', err);
  }

  // Alter columns in case table was created previously without them
  const newCols = ['expiration_date', 'status', 'category'];
  for (const col of newCols) {
    try {
      await client.execute(`ALTER TABLE nursing_monthly_stock ADD COLUMN ${col} TEXT`);
      console.log(`✅ SQLite Schema Migration: added ${col} to nursing_monthly_stock`);
    } catch (err) {
      if (!err.message.includes('duplicate column name') && !err.message.includes('already exists')) {
        console.warn(`⚠️ SQLite Schema Migration Notice for ${col}:`, err.message);
      }
    }
  }

  // Create nursing_stock_change_logs table for audit tracking
  try {
    await client.execute(`
      CREATE TABLE IF NOT EXISTS nursing_stock_change_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        month_year TEXT NOT NULL,
        item_name TEXT NOT NULL,
        day INTEGER NOT NULL,
        session TEXT NOT NULL,
        old_stock INTEGER,
        new_stock INTEGER,
        old_consumed INTEGER,
        new_consumed INTEGER,
        updated_by TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ SQLite Schema Migration: created/verified nursing_stock_change_logs table');
  } catch (err) {
    console.error('❌ Failed to initialize nursing_stock_change_logs table:', err);
  }
  // --- New Stock Management Relational Architecture ---
  try {
    await client.execute(`
      CREATE TABLE IF NOT EXISTS vendors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        contact TEXT,
        contract_terms TEXT,
        is_active INTEGER DEFAULT 1
      )
    `);
    
    await client.execute(`
      CREATE TABLE IF NOT EXISTS master_inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        sku TEXT,
        unit_of_measure TEXT,
        category TEXT
      )
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS stock_batches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_id INTEGER REFERENCES master_inventory(id) ON DELETE CASCADE,
        vendor_id INTEGER REFERENCES vendors(id) ON DELETE SET NULL,
        batch_number TEXT UNIQUE,
        expiry_date TEXT,
        purchase_price REAL,
        quantity INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS department_stock (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        department_id INTEGER REFERENCES departments(id) ON DELETE CASCADE,
        item_id INTEGER REFERENCES master_inventory(id) ON DELETE CASCADE,
        batch_id INTEGER REFERENCES stock_batches(id) ON DELETE SET NULL,
        quantity INTEGER DEFAULT 0,
        min_stock_level INTEGER DEFAULT 10,
        UNIQUE(department_id, item_id, batch_id)
      )
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS requisitions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        department_id INTEGER REFERENCES departments(id) ON DELETE CASCADE,
        status TEXT DEFAULT 'Pending',
        urgency TEXT DEFAULT 'Normal',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS requisition_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        requisition_id INTEGER REFERENCES requisitions(id) ON DELETE CASCADE,
        item_id INTEGER REFERENCES master_inventory(id) ON DELETE CASCADE,
        requested_quantity INTEGER DEFAULT 0,
        approved_quantity INTEGER DEFAULT 0
      )
    `);
    
    // Attempt to add quantity column if not present from previous runs
    try {
      await client.execute("ALTER TABLE stock_batches ADD COLUMN quantity INTEGER DEFAULT 0");
      console.log('✅ SQLite Schema Migration: added quantity column to stock_batches');
    } catch (e) {
      // Ignore error if column already exists
    }

    console.log('✅ SQLite Schema Migration: created stock management relational tables');
  } catch (err) {
    console.error('❌ Failed to initialize stock management tables:', err);
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
  get client() { return client; }
};
