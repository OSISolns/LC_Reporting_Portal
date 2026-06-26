'use strict';
require('dotenv').config();
const tursoUrl = process.env.lcreporting_TURSO_DATABASE_URL || process.env.TURSO_DATABASE_URL;
const tursoToken = process.env.lcreporting_TURSO_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN;

let libsql = null;
let prisma = null;

const { encryptField, decryptField } = require('../utils/crypto');

function encryptParams(sql, params) {
  if (!params || params.length === 0) return params;
  const encrypted = [...params];
  const upperSql = sql.toUpperCase();
  
  if (upperSql.includes('CLINICAL_OBSERVATIONS')) {
    if (upperSql.includes('INSERT INTO CLINICAL_OBSERVATIONS')) {
      const match = sql.match(/INSERT\s+INTO\s+clinical_observations\s*\(([^)]+)\)/i);
      if (match) {
        const cols = match[1].split(',').map(c => c.trim().toLowerCase());
        cols.forEach((col, idx) => {
          if (['identification_json', 'triage_json', 'progress_notes_json', 'medication_mar_json', 'sbar_json'].includes(col)) {
            if (encrypted[idx] && typeof encrypted[idx] === 'string') {
              encrypted[idx] = encryptField(encrypted[idx]);
            }
          }
        });
      }
    } else if (upperSql.includes('UPDATE CLINICAL_OBSERVATIONS')) {
      const matches = sql.match(/(\w+)\s*=\s*\$(\d+)/g);
      if (matches) {
        matches.forEach(m => {
          const parts = m.split('=');
          const colName = parts[0].trim().toLowerCase();
          const placeholder = parts[1].trim();
          const idx = parseInt(placeholder.substring(1), 10) - 1;
          if (['identification_json', 'triage_json', 'progress_notes_json', 'medication_mar_json', 'sbar_json'].includes(colName)) {
            if (encrypted[idx] && typeof encrypted[idx] === 'string') {
              encrypted[idx] = encryptField(encrypted[idx]);
            }
          }
        });
      }
    }
  }
  
  if (upperSql.includes('PATIENT_VITALS')) {
    if (upperSql.includes('INSERT INTO PATIENT_VITALS')) {
      const match = sql.match(/INSERT\s+INTO\s+patient_vitals\s*\(([^)]+)\)/i);
      if (match) {
        const cols = match[1].split(',').map(c => c.trim().toLowerCase());
        cols.forEach((col, idx) => {
          if (['temperature', 'pulse', 'respiratory_rate', 'blood_pressure', 'weight', 'spo2', 'general_comments'].includes(col)) {
            if (encrypted[idx] && typeof encrypted[idx] === 'string') {
              encrypted[idx] = encryptField(encrypted[idx]);
            }
          }
        });
      }
    } else if (upperSql.includes('UPDATE PATIENT_VITALS')) {
      const matches = sql.match(/(\w+)\s*=\s*\$(\d+)/g);
      if (matches) {
        matches.forEach(m => {
          const parts = m.split('=');
          const colName = parts[0].trim().toLowerCase();
          const placeholder = parts[1].trim();
          const idx = parseInt(placeholder.substring(1), 10) - 1;
          if (['temperature', 'pulse', 'respiratory_rate', 'blood_pressure', 'weight', 'spo2', 'general_comments'].includes(colName)) {
            if (encrypted[idx] && typeof encrypted[idx] === 'string') {
              encrypted[idx] = encryptField(encrypted[idx]);
            }
          }
        });
      }
    }
  }
  
  return encrypted;
}

function decryptRow(row) {
  if (!row) return row;
  const decrypted = { ...row };
  const coCols = ['identification_json', 'triage_json', 'progress_notes_json', 'medication_mar_json', 'sbar_json'];
  coCols.forEach(col => {
    if (decrypted[col] && typeof decrypted[col] === 'string') {
      decrypted[col] = decryptField(decrypted[col]);
    }
  });
  
  const vitalsCols = ['temperature', 'pulse', 'respiratory_rate', 'blood_pressure', 'weight', 'spo2', 'general_comments'];
  vitalsCols.forEach(col => {
    if (decrypted[col] && typeof decrypted[col] === 'string') {
      decrypted[col] = decryptField(decrypted[col]);
    }
  });
  
  return decrypted;
}

if (tursoUrl && tursoToken) {
  const { createClient } = require('@libsql/client');
  libsql = createClient({
    url: tursoUrl,
    authToken: tursoToken,
  });
} else {
  const { PrismaClient } = require('@prisma/client');
  prisma = new PrismaClient();
}

const transformQuery = (sql, params) => {
  let transformedSql = sql;
  const matches = sql.match(/\$\d+/g);
  let args = [];
  if (matches && params && params.length > 0) {
    args = matches.map(m => {
      const index = parseInt(m.substring(1), 10) - 1;
      const val = params[index];
      return val === undefined ? null : val;
    });
  } else {
    args = (params || []).map(p => p === undefined ? null : p);
  }
  transformedSql = transformedSql.replace(/\$\d+/g, '?');
  transformedSql = transformedSql
    .replace(/ILIKE/gi, 'LIKE')
    .replace(/NOW\(\)/gi, "(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))")
    .replace(/CURRENT_TIMESTAMP/gi, "(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))")
    .replace(/TIMESTAMPTZ/gi, 'DATETIME')
    .replace(/SERIAL/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT');
  return { sql: transformedSql, args };
};

const client = {
  execute: async (stmt) => {
    let sql, args;
    if (typeof stmt === 'string') {
      sql = stmt;
      args = [];
    } else {
      sql = stmt.sql;
      args = stmt.args || [];
    }
    const encryptedArgs = encryptParams(sql, args);
    const { sql: transformedSql, args: finalArgs } = transformQuery(sql, encryptedArgs);
    const upperSql = transformedSql.trim().toUpperCase();
    const isSelect = upperSql.startsWith('SELECT') || upperSql.startsWith('PRAGMA') || upperSql.includes('RETURNING');
    try {
      if (libsql) {
        // Native Turso Execution
        const result = await libsql.execute({ sql: transformedSql, args: finalArgs });
        const safeRows = (result.rows || []).map(row => {
          const newRow = { ...row };
          for (const key in newRow) {
            if (typeof newRow[key] === 'bigint') newRow[key] = Number(newRow[key]);
          }
          return decryptRow(newRow);
        });
        return { rows: safeRows, rowsAffected: result.rowsAffected || safeRows.length };
      } else {
        // Prisma Execution
        if (isSelect) {
          const result = await prisma.$queryRawUnsafe(transformedSql, ...finalArgs);
          const rows = Array.isArray(result) ? result : [];
          const safeRows = rows.map(row => {
            const newRow = { ...row };
            for (const key in newRow) {
              if (typeof newRow[key] === 'bigint') newRow[key] = Number(newRow[key]);
            }
            return decryptRow(newRow);
          });
          return { rows: safeRows, rowsAffected: safeRows.length };
        } else {
          const affected = await prisma.$executeRawUnsafe(transformedSql, ...finalArgs);
          return { rows: [], rowsAffected: affected };
        }
      }
    } catch (e) {
      const msg = e.message || '';
      if (!msg.includes('duplicate column name') && !msg.includes('already exists')) {
        console.error('\n❌ DB Engine Query Error:');
        console.error('SQL:', transformedSql);
        console.error('Args:', finalArgs);
        console.error('Error:', msg);
      }
      throw e;
    }
  },
  batch: async (statements) => {
    for (const stmt of statements) {
      await client.execute(stmt);
    }
  }
};

// Run dynamic schema migrations on start (Only in development or if explicitly forced, to prevent Vercel cold-start timeouts)
if (process.env.NODE_ENV !== 'production' || process.env.RUN_MIGRATIONS === 'true') {
  (async () => {
    try {
      await client.execute("SELECT 1");
      if (libsql) {
        console.log('🔌 DATABASE: Successfully connected to Turso Cloud.');
      } else {
        console.log('🔌 DATABASE: Successfully connected to local SQLite database (via Prisma).');
      }
      
      console.log('⚙️ Running custom department cleanup migration...');
      const targetDepts = ['DENTAL', 'PHYSIO', 'NURSING', 'OPERATIONS', 'LABORATORY', 'IMAGING'];
      
      // Get all current departments
      const { rows: depts } = await client.execute("SELECT id, name FROM departments");
      console.log('Current departments in DB:', depts.map(d => `${d.name} (${d.id})`));
      
      // 1. Standardize and merge duplicates for target departments
      for (const target of targetDepts) {
        const matches = depts.filter(d => d.name.toUpperCase().trim() === target);
        if (matches.length > 1) {
          const keeper = matches[0];
          // Update keeper name to exact target uppercase
          await client.execute({
            sql: "UPDATE departments SET name = ? WHERE id = ?",
            args: [target, keeper.id]
          });
          // Merge duplicates
          for (let i = 1; i < matches.length; i++) {
            const dup = matches[i];
            console.log(`Merging duplicate department: "${dup.name}" (id: ${dup.id}) into "${keeper.name}" (id: ${keeper.id})`);
            
            await client.execute({
              sql: "UPDATE department_stock SET department_id = ? WHERE department_id = ?",
              args: [keeper.id, dup.id]
            }).catch(() => {});
            
            // daily_report_metrics no longer uses department_id
            
            await client.execute({
              sql: "UPDATE requisitions SET department_id = ? WHERE department_id = ?",
              args: [keeper.id, dup.id]
            }).catch(() => {});
            
            // Note: providers no longer use department_id (replaced by specialization_id)
            
            await client.execute({
              sql: "DELETE FROM departments WHERE id = ?",
              args: [dup.id]
            });
          }
        } else if (matches.length === 1) {
          // Standardize name to uppercase
          await client.execute({
            sql: "UPDATE departments SET name = ? WHERE id = ?",
            args: [target, matches[0].id]
          });
        } else {
          // Insert missing target department
          await client.execute({
            sql: "INSERT INTO departments (name) VALUES (?)",
            args: [target]
          });
          console.log(`Inserted missing target department: "${target}"`);
        }
      }
      
      // Re-fetch departments after standardizing targets
      const { rows: updatedDepts } = await client.execute("SELECT id, name FROM departments");
      
      // 2. Delete non-target departments and clean up their associations
      for (const d of updatedDepts) {
        const nameUpper = d.name.toUpperCase().trim();
        if (!targetDepts.includes(nameUpper)) {
          console.log(`Removing non-target department: "${d.name}" (id: ${d.id})`);
          
          // Manually handle dependent rows to avoid orphan entries if FK constraints aren't active
          await client.execute({
            sql: "DELETE FROM department_stock WHERE department_id = ?",
            args: [d.id]
          }).catch(() => {});
          
          // daily_report_metrics no longer uses department_id
          
          await client.execute({
            sql: "DELETE FROM requisitions WHERE department_id = ?",
            args: [d.id]
          }).catch(() => {});
          
          // Note: providers no longer use department_id — no action needed here
          
          await client.execute({
            sql: "DELETE FROM departments WHERE id = ?",
            args: [d.id]
          });
        }
      }
      
      console.log('✅ Custom department cleanup migration complete.');
      const { rows: finalDepts } = await client.execute("SELECT * FROM departments");
      console.log('Final departments in DB:', finalDepts.map(d => `${d.name} (${d.id})`));
      
    } catch (err) {
      console.error('❌ FATAL: Could not connect to Turso Cloud or run custom migrations. Check TURSO_DATABASE_URL and TURSO_AUTH_TOKEN.', err.message);
      // Note: Do not call process.exit(1) here as it will crash the Vercel build if it executes during pre-rendering.
    }

    // ─── Provider Specialization Migration ───────────────────────────────────────────────
    try {
      // Step 1: Add specialization column (safe - catches error if already exists)
      await client.execute("ALTER TABLE providers ADD COLUMN specialization TEXT").catch((err) => {
        if (!err.message.includes('duplicate column name') && !err.message.includes('already exists')) {
          console.warn("⚠️ ALTER TABLE providers ADD COLUMN specialization failed:", err.message);
        }
      });
      console.log('⚙️ Running provider name + specialization migration...');

      // Step 2: Provider map — [oldName, verifiedName, specialization]
      // IMPORTANT: Only UPDATE statements. Never DELETE. IDs and metrics are untouched.
      const providerUpdates = [
        // ── GYNECOLOGY ──
        ['Dr Gakindi',              'Dr Gakindi Leonard',                        'Obstetrician & Gynaecologist'],
        ['Dr SITINI BERTIN',        'DR SITINI BERTIN',                          'Obstetrician & Gynaecologist'],
        ['Dr NKUBITO',              'Dr NKUBITO GATERA VALENS',                  'Obstetrician & Gynaecologist'],
        ['Dr NTIRUSHWA',            'Dr Ntirushwa David',                        'Obstetrician & Gynaecologist'],
        ['BUTOYI ALPHONSE',         'DR BUTOYI ALPHONSE',                        'Obstetrician & Gynaecologist'],

        // ── GENERAL MEDECINE ──
        ['Dr Fabrice N.',           'NGABO NTAGANDA FABRICE',                    'General Practitioner'],
        ['Dr Yves L. Bizimana',     'Dr BIZIMANA YVES LAURENT',                  'General Practitioner'],
        ['Dr Gihana Jacques',       'Dr. NKERAGUTABARA Gihana Jacques',           'Family Physician'],

        // ── INTERNAL MEDECINE ──
        ['Dr. Masaisa florence',    'Dr Masaisa Florence',                       'Hematologist'],
        ['DR SHEMA NSHUTI D.',      'Dr NSHUTI SHEMA DAVID',                     'Internist'],
        ['DR DUFATANYE DARIUS',     'DR DUFATANYE DARIUS',                       'Cardiologist'],
        ['Dr Ganza G. JMV',         'Dr GAPIRA GANZA JEAN MARIE VIANNEY',        'Cardiologist'],
        ['DR RUTAGANDA Eric',       'Dr Rutaganda Eric',                         'Internist'],
        ['DR BAZATSINDA A.',        'DR BAZATSINDA ANTHONY',                     'Internist'],
        ['DR MBABAZI Maguy',        'DR MBABAZI MAGUY',                          'Internist'],
        ['DR HABYARIMANA O.',       'DR HABYARIMANA OSWALD',                     'Internist'],
        ['KABAKAMBIRA J.Damascene', 'Dr KABAKAMBIRA JEAN DAMASCENE',             'Internist'],
        ['DR SEBATUNZI Osee',       'DR SEBATUNZI OSEE',                         'Internist'],

        // ── PEDIATRICS ──
        ['Dr KABAYIZA JC',          'Dr Kabayiza Jean Claude',                   'Pediatrician'],
        ['Dr Aimable K.',           'Dr Kanyamuhunga Aimable',                   'Pediatrician'],
        ['Dr Christian Muhoza',     'Dr Umuhoza Christian',                      'Pediatrician'],
        ['Dr Mukaruziga Agnes',     'DR MUKARUZIGA AGNES',                       'Pediatrician'],
        ['Dr Karangwa Valens',      'DR KARANGWA VALENS',                        'Pediatrician'],

        // ── NEUROLOGY ──
        ['DR KAREKEZI CLAIRE',      'Dr. KAREKEZI CLAIRE',                       'Neurologist'],
        ['DR MUTUNGIREHE SYLVES',   'DR MUTUNGIREHE SYLVESTRE',                  'Neurologist'],

        // ── UROLOGY ──
        ['Dr Afrika G.',            'Dr Afrika Gasana',                          'Urologist'],
        ['Dr NYIRIMODOKA ALEXANDRE','DR NYIRIMODOKA ALEXANDRE',                  'Urologist'],

        // ── ORTHO / GENERAL SURGERY ──
        ['Dr KWESIGA STEPHEN',      'Dr KWESIGA STEPHEN',                        'Orthopedic Surgeon'],
        ['KANSAYISA MARIE GRACE',   'Dr Kansayisa Marie Grace',                  'Orthopedic Surgeon'],
        ['RUBANGUKA Desire',        'Dr Desire Rubanguka',                       'General Surgeon'],
        ['DR INGABIRE Allen JDC',   'Dr. INGABIRE Allen Jean De La Croix',       'Orthopedic Surgeon'],

        // ── ENT ──
        ['DR HAKIZIMANA ARISTOTE',  'DR HAKIZIMANA ARISTOTE',                    'Consultant ENT'],
        ['DR Dushimiyimana jmv',    'DR DUSHIMIYIMANA JMV',                      'Consultant ENT'],

        // ── CHIRO ──
        ['Dr Kanyabutembo Noella',  'Dr Noella Kanyabutembo',                    'Chiropractitioner'],

        // ── MENTAL HEALTH ──
        ['Innocent Nsengiyumva',    'Mr NSENGIYUMVA INNOCENT',                   'Clinical Psychologist'],

        // ── DENTAL ──
        ['Dr NYIRANEZA Esperence',  'Dr Nyiraneza Esperance',                    'Dental Surgeon'],
        ['DR ANAMALI Rogers',       'Dr ANAMALI ROGER',                          'Dental Surgeon'],
        ['Dr MUGESERA Ernest',      'DR MUGESERA ERNEST',                        'Dental Surgeon'],
        ['Dr BANA Bede',            'Dr Bede Bana',                              'Dental Surgeon'],
        ['JAYAKAR G.Sargunar',      'DR. JAYKAR G SARGUNAR',                     'Orthodontist'],
        ['Sanddeep Goyal',          'Dr. SANDEEP GOYAL',                         'Orthodontist'],
        ['DR MICONGWE Moses',       'Dr MICONGWE MOSES ISYAGI',                  'Dental Surgeon & Oral Pathologist'],
        ['Mr NDAYISENGA KALISA Gilbert', 'Mr NDAYISENGA KALISA Gilbert',         'Dentistry'],
        ['Mr ERIC RUTAGANDA',       'Mr ERIC RUTAGANDA',                         'Dentistry'],
        ['ISHIMWE GILBERT',         'Mr ISHIMWE GILBERT',                        'Dentistry'],

        // ── PHYSIO ──
        ['Mr NAZE Thierry',         'Mr NAZE Thierry',                           'PHYSIO'],
        ['Miss FRANCINE M.',        'Miss FRANCINE M.',                          'PHYSIO'],
        ['Mr KARIMWABO Jean Claude','Mr KARIMWABO Jean Claude',                  'PHYSIO'],
        ['Mr NSENGIMANA Emmanuel',  'Mr NSENGIMANA Emmanuel',                    'PHYSIO'],
        ['Miss LEAH MUTESI',        'Miss LEAH MUTESI',                          'PHYSIO'],
        ['Miss UWAMAHORO Sarah',    'Miss UWAMAHORO Sarah',                      'PHYSIO'],
        ['INGABIRE J. Paul',        'Mr Ingabire J. Paul',                       'PHYSIO'],
      ];

      for (const [oldName, verifiedName, specialization] of providerUpdates) {
        // Update by old name (initial seed name) — safe, idempotent
        await client.execute({
          sql: 'UPDATE providers SET name = ?, specialization = ? WHERE name = ?',
          args: [verifiedName, specialization, oldName]
        });
        // Also update by new name in case the name was already corrected but specialization wasn't set
        await client.execute({
          sql: "UPDATE providers SET specialization = ? WHERE name = ? AND (specialization IS NULL OR specialization = '')",
          args: [specialization, verifiedName]
        });
      }

      // Cleanup: rename any previously written 'Physiotherapist' to 'PHYSIO'
      await client.execute({
        sql: "UPDATE providers SET specialization = 'PHYSIO' WHERE specialization = 'Physiotherapist'",
        args: []
      });

      // Ensure 'Mr Ingabire J. Paul' is added/updated in the DB
      try {
        const { rows: physioDept } = await client.execute("SELECT id FROM departments WHERE name = 'PHYSIO'");
        // Lookup specialization_id for 'PHYSIO' from specializations table
        const { rows: physioSpec } = await client.execute("SELECT id FROM specializations WHERE name = 'PHYSIO'");
        const physioSpecId = physioSpec.length > 0 ? physioSpec[0].id : null;

        const { rows: existing } = await client.execute({
          sql: "SELECT id FROM providers WHERE name = 'Mr Ingabire J. Paul' OR name = 'INGABIRE J. Paul'",
          args: []
        });

        if (existing.length === 0) {
          console.log("🌱 Inserting missing provider Mr Ingabire J. Paul into DB...");
          await client.execute({
            sql: "INSERT INTO providers (name, title, specialization, specialization_id) VALUES (?, ?, ?, ?)",
            args: ["Mr Ingabire J. Paul", "Mr", "PHYSIO", physioSpecId]
          });
        } else {
          console.log("🌱 Updating provider Mr Ingabire J. Paul in DB...");
          await client.execute({
            sql: "UPDATE providers SET name = ?, title = ?, specialization = ?, specialization_id = ? WHERE id = ?",
            args: ["Mr Ingabire J. Paul", "Mr", "PHYSIO", physioSpecId, existing[0].id]
          });
        }
      } catch (insertErr) {
        console.error("❌ Failed to add/update Mr Ingabire J. Paul:", insertErr.message);
      }

      const { rows: provs } = await client.execute('SELECT id, name, specialization FROM providers');
      console.log(`✅ Provider migration complete: ${provs.length} providers updated.`);
      provs.forEach(p => {
        if (!p.specialization) console.warn(`⚠️ Provider still without specialization: "${p.name}" (id: ${p.id})`);
      });

    } catch (err) {
      console.error('❌ Provider specialization migration error:', err.message);
    }

    // ─── Shift Sessions Role CHECK Constraint Upgrade & Related Tables ───────────────────
    try {
      const { rows } = await client.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='shift_sessions'");
      if (rows.length > 0) {
        const sql = rows[0].sql;
        if (!sql.includes('vip_lounge')) {
          console.log('⚙️ Migrating shift_sessions to support nurse and vip_lounge...');

          // 1. Rename table
          await client.execute("ALTER TABLE shift_sessions RENAME TO shift_sessions_old");

          // 2. Create new table
          await client.execute(`
          CREATE TABLE shift_sessions (
            id                  INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
            shift_role          TEXT NOT NULL CHECK (shift_role IN ('cashier', 'helpdesk', 'call_center', 'nurse', 'vip_lounge')),
            status              TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'draft', 'closed')),
            opened_at           DATETIME NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
            closed_at           DATETIME,
            handover_notes      TEXT,
            reviewed_by         INTEGER REFERENCES users(id) ON DELETE SET NULL,
            reviewed_at         DATETIME,
            is_flagged          INTEGER NOT NULL DEFAULT 0,
            flag_reasons        TEXT,
            created_at          DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
            updated_at          DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
            start_hour          TEXT,
            wave                TEXT
          )
        `);

          // 3. Copy data
          const { rows: colRows } = await client.execute("PRAGMA table_info(shift_sessions_old)");
          const cols = colRows.map(r => r.name);
          const commonCols = cols.filter(c => c !== 'id');
          const colsListStr = ['id', ...commonCols].join(', ');

          await client.execute(`
          INSERT INTO shift_sessions (${colsListStr})
          SELECT ${colsListStr} FROM shift_sessions_old
        `);

          // 4. Drop old table
          await client.execute("DROP TABLE shift_sessions_old");

          // 5. Recreate indexes
          await client.execute("CREATE INDEX IF NOT EXISTS idx_shift_user_id     ON shift_sessions(user_id)");
          await client.execute("CREATE INDEX IF NOT EXISTS idx_shift_status      ON shift_sessions(status)");
          await client.execute("CREATE INDEX IF NOT EXISTS idx_shift_role        ON shift_sessions(shift_role)");
          await client.execute("CREATE INDEX IF NOT EXISTS idx_shift_opened_at   ON shift_sessions(opened_at DESC)");
          await client.execute("CREATE INDEX IF NOT EXISTS idx_shift_is_flagged  ON shift_sessions(is_flagged)");

          console.log('✅ SQLite Schema Migration: upgraded shift_sessions table check constraint');
        }
      }
    } catch (err) {
      console.error('❌ Failed to migrate shift_sessions check constraint:', err);
    }

    try {
      await client.execute(`
      CREATE TABLE IF NOT EXISTS shift_nurse_close (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        shift_id INTEGER UNIQUE NOT NULL REFERENCES shift_sessions(id) ON DELETE CASCADE,
        total_assessments INTEGER DEFAULT 0,
        total_incidents INTEGER DEFAULT 0,
        handover_sbar_sb TEXT,
        handover_sbar_ar TEXT,
        created_at DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        updated_at DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      )
    `);
      console.log('✅ SQLite Schema Migration: created shift_nurse_close table');
    } catch (err) {
      console.warn('⚠️ SQLite Schema Migration Notice for shift_nurse_close:', err.message);
    }

    try {
      await client.execute(`
      CREATE TABLE IF NOT EXISTS shift_viplounge_close (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        shift_id INTEGER UNIQUE NOT NULL REFERENCES shift_sessions(id) ON DELETE CASCADE,
        vip_logs TEXT,
        created_at DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        updated_at DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      )
    `);
      console.log('✅ SQLite Schema Migration: created shift_viplounge_close table');
    } catch (err) {
      console.warn('⚠️ SQLite Schema Migration Notice for shift_viplounge_close:', err.message);
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
      await client.execute("ALTER TABLE users ADD COLUMN failed_attempts INTEGER DEFAULT 0");
      console.log('✅ SQLite Schema Migration: added failed_attempts to users');
    } catch (err) {
      if (!err.message.includes('duplicate column name') && !err.message.includes('already exists')) {
        console.warn('⚠️ SQLite Schema Migration Notice:', err.message);
      }
    }

    try {
      await client.execute("ALTER TABLE users ADD COLUMN lockout_until DATETIME");
      console.log('✅ SQLite Schema Migration: added lockout_until to users');
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

    try {
      await client.execute("ALTER TABLE cancellation_requests ADD COLUMN billed_by INTEGER REFERENCES users(id) ON DELETE SET NULL");
      console.log('✅ SQLite Schema Migration: added billed_by to cancellation_requests');
    } catch (err) {
      if (!err.message.includes('duplicate column name') && !err.message.includes('already exists')) {
        console.warn('⚠️ SQLite Schema Migration Notice:', err.message);
      }
    }

    try {
      await client.execute("ALTER TABLE refund_requests ADD COLUMN billed_by INTEGER REFERENCES users(id) ON DELETE SET NULL");
      console.log('✅ SQLite Schema Migration: added billed_by to refund_requests');
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

    // specializations table — must be created before providers
    try {
      await client.execute(`
      CREATE TABLE IF NOT EXISTS specializations (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        name       TEXT NOT NULL UNIQUE,
        created_at DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      )
    `);
      console.log('✅ SQLite Schema Migration: created specializations table');
    } catch (err) {
      console.warn('⚠️ SQLite Schema Migration Notice for specializations:', err.message);
    }

    try {
      await client.execute(`
      CREATE TABLE IF NOT EXISTS providers (
        id                INTEGER PRIMARY KEY AUTOINCREMENT,
        name              TEXT NOT NULL,
        title             TEXT,
        specialization_id INTEGER REFERENCES specializations(id) ON DELETE SET NULL,
        specialization    TEXT,
        is_active         INTEGER DEFAULT 1
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
        specialization_id INTEGER REFERENCES specializations(id) ON DELETE CASCADE,
        patient_count INTEGER DEFAULT 0,
        follow_up_count INTEGER DEFAULT 0,
        UNIQUE (report_date, provider_id)
      )
    `);
      console.log('✅ SQLite Schema Migration: created daily_report_metrics table');
      try {
        await client.execute(`ALTER TABLE daily_report_metrics ADD COLUMN follow_up_count INTEGER DEFAULT 0`);
        console.log('✅ SQLite Schema Migration: added follow_up_count to daily_report_metrics');
      } catch (alterErr) {
        // Column might already exist
      }
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
      /*
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
      */
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
            "keyword": "malaria",
            "results": [
              { "code": "1F45", "desc": "Malaria without parasitological confirmation" },
              { "code": "1F4Z", "desc": "Malaria, unspecified" },
              { "code": "1F42.Z", "desc": "Plasmodium malariae malaria without complication" },
              { "code": "1F44", "desc": "Other parasitologically confirmed malaria" },
              { "code": "KA64.Y", "desc": "Other specified parasitic diseases in the fetus or newborn" },
              { "code": "1F40.Z", "desc": "Malaria due to Plasmodium falciparum, unspecified" },
              { "code": "1F43", "desc": "Malaria due to Plasmodium ovale" },
              { "code": "1F41.Z", "desc": "Plasmodium vivax malaria without complication" },
              { "code": "QC42.Y", "desc": "Other specified personal history of infectious or parasitic diseases" },
              { "code": "KA64.1", "desc": "Congenital falciparum malaria" }
            ]
          },
          {
            "keyword": "cholera",
            "results": [
              { "code": "1A00", "desc": "Cholera" },
              { "code": "QC90.00", "desc": "Exposure to cholera" },
              { "code": "1A00&XN8P1", "desc": "Cholera due to Vibrio cholerae O1, biovar cholerae" },
              { "code": "QD01.Y", "desc": "Other specified carrier of intestinal infectious agents" },
              { "code": "NE61", "desc": "Harmful effects of or exposure to noxious substances, chiefly nonmedicinal as to source, not elsewhere classified" },
              { "code": "NE60", "desc": "Harmful effects of drugs, medicaments or biological substances, not elsewhere classified" },
              { "code": "1A00&XN62R", "desc": "Cholera due to Vibrio cholerae O1, biovar eltor" },
              { "code": "QA08.0", "desc": "Special screening examination for intestinal infectious diseases" },
              { "code": "QC00.0", "desc": "Need for immunization against cholera alone" },
              { "code": "1A00&XN8KD", "desc": "Cholera due to Vibrio cholerae O139" }
            ]
          },
          {
            "keyword": "typhoid",
            "results": [
              { "code": "1A07.Z", "desc": "Typhoid fever, unspecified" },
              { "code": "1A07.Y", "desc": "Other specified typhoid fever" },
              { "code": "QD00", "desc": "Carrier of salmonella typhi" },
              { "code": "1A07.Y/FA11.Y", "desc": "Typhoid arthritis" },
              { "code": "1A07.Y/1D01.0Z", "desc": "Typhoid meningitis" },
              { "code": "1A07.Y/CA40.0Z", "desc": "Typhoid pneumonia" },
              { "code": "1A07.0", "desc": "Typhoid peritonitis" },
              { "code": "NE60", "desc": "Harmful effects of drugs, medicaments or biological substances, not elsewhere classified" },
              { "code": "1A07.Y/BC42.1", "desc": "Typhoid myocarditis" },
              { "code": "1A07.Y/BB40", "desc": "Typhoid endocarditis" }
            ]
          },
          {
            "keyword": "hypertension",
            "results": [
              { "code": "BA00.Z", "desc": "Essential hypertension, unspecified" },
              { "code": "9C61.01", "desc": "Ocular hypertension" },
              { "code": "BB01.Z", "desc": "Pulmonary hypertension, unspecified" },
              { "code": "JA23", "desc": "Gestational hypertension" },
              { "code": "BA04.Y", "desc": "Other specified secondary hypertension" },
              { "code": "DB98.7Z", "desc": "Portal hypertension, unspecified" },
              { "code": "BA03", "desc": "Hypertensive crisis" },
              { "code": "BA00.2", "desc": "Isolated systolic hypertension" },
              { "code": "BA00.1", "desc": "Isolated diastolic hypertension" },
              { "code": "BA00.Y", "desc": "Other specified essential hypertension" }
            ]
          },
          {
            "keyword": "diabetes",
            "results": [
              { "code": "5A14", "desc": "Diabetes mellitus, type unspecified" },
              { "code": "JA63.2", "desc": "Diabetes mellitus arising in pregnancy" },
              { "code": "5A13.4", "desc": "Diabetes mellitus due to drug or chemical" },
              { "code": "5C64.3", "desc": "Disorders of phosphorus metabolism or phosphatases" },
              { "code": "5A11", "desc": "Type 2 diabetes mellitus" },
              { "code": "LD2H.Y", "desc": "Other specified syndromic genetic deafness" },
              { "code": "5A10", "desc": "Type 1 diabetes mellitus" },
              { "code": "BD54", "desc": "Diabetic foot ulcer" },
              { "code": "5A24", "desc": "Uncontrolled or unstable diabetes mellitus" },
              { "code": "5A61.5", "desc": "Central diabetes insipidus" }
            ]
          },
          {
            "keyword": "influenza",
            "results": [
              { "code": "1E32", "desc": "Influenza, virus not identified" },
              { "code": "QC01.8", "desc": "Need for immunization against influenza" },
              { "code": "1A40.Z", "desc": "Infectious gastroenteritis or colitis without specification of infectious agent" },
              { "code": "1E30", "desc": "Influenza due to identified seasonal influenza virus" },
              { "code": "1E31&XN4TT", "desc": "Influenza due to infection with Influenza A/H5N1 virus" },
              { "code": "1E31&XN297", "desc": "Influenza due to infection with Influenza A/H1N1 virus" },
              { "code": "NE60", "desc": "Harmful effects of drugs, medicaments or biological substances, not elsewhere classified" },
              { "code": "1E32/AB0Z", "desc": "Influenzal otitis media" },
              { "code": "AB0Y&XN1P6", "desc": "Otitis due to haemophilus influenzae" },
              { "code": "1D01.00", "desc": "Meningitis due to Haemophilus influenzae" }
            ]
          },
          {
            "keyword": "bronchitis",
            "results": [
              { "code": "CA20.Z", "desc": "Bronchitis, unspecified" },
              { "code": "CA42.Z", "desc": "Acute bronchitis, unspecified" },
              { "code": "CA20.Y", "desc": "Other specified bronchitis" },
              { "code": "CA20.1Z", "desc": "Chronic bronchitis, unspecified" },
              { "code": "CA22.1", "desc": "Certain specified chronic obstructive pulmonary disease" },
              { "code": "CA81.0", "desc": "Bronchitis or pneumonitis due to chemicals, gases, fumes or vapours" },
              { "code": "CA42.Y", "desc": "Other specified acute bronchitis" },
              { "code": "CA20.1Y", "desc": "Other specified chronic bronchitis" },
              { "code": "CA20.11", "desc": "Mucopurulent chronic bronchitis" },
              { "code": "CA40.Z", "desc": "Pneumonia, organism unspecified" }
            ]
          },
          {
            "keyword": "gastroenteritis",
            "results": [
              { "code": "1A40.0", "desc": "Gastroenteritis or colitis without specification of origin" },
              { "code": "1A40.Z", "desc": "Infectious gastroenteritis or colitis without specification of infectious agent" },
              { "code": "1A2Z", "desc": "Viral intestinal infections, unspecified" },
              { "code": "DA42.82", "desc": "Chemical gastritis" },
              { "code": "1A09.0", "desc": "Salmonella enteritis" },
              { "code": "DA42.Z", "desc": "Gastritis, unspecified" },
              { "code": "1E32", "desc": "Influenza, virus not identified" },
              { "code": "1A06", "desc": "Gastroenteritis due to Campylobacter" },
              { "code": "1A32", "desc": "Cryptosporidiosis" },
              { "code": "1C1A.Y", "desc": "Other specified listeriosis" }
            ]
          },
          {
            "keyword": "appendicitis",
            "results": [
              { "code": "DB10.Z", "desc": "Appendicitis, unspecified" },
              { "code": "DB10.Y", "desc": "Other specified appendicitis" },
              { "code": "DB10.0", "desc": "Acute appendicitis" },
              { "code": "DB10.02", "desc": "Acute appendicitis without localised or generalised peritonitis" },
              { "code": "DB10.1", "desc": "Chronic appendicitis" },
              { "code": "1B12.7/DB10.Z", "desc": "Tuberculous appendicitis" },
              { "code": "DB10.01", "desc": "Acute appendicitis with localised peritonitis" },
              { "code": "DB10.Y&XT1L", "desc": "Subacute appendicitis" },
              { "code": "DB10.00", "desc": "Acute appendicitis with generalised peritonitis" }
            ]
          },
          {
            "keyword": "pregnancy",
            "results": [
              { "code": "JA80.Z", "desc": "Maternal care related to unspecified multiple gestation" },
              { "code": "JA01.1", "desc": "Tubal pregnancy" },
              { "code": "QA40", "desc": "Pregnancy examination or test" },
              { "code": "JA61.Y", "desc": "Other specified venous complications in pregnancy" },
              { "code": "JA01.Y", "desc": "Other specified ectopic pregnancy" },
              { "code": "JA40.Y", "desc": "Other specified haemorrhage in early pregnancy" },
              { "code": "JA01.Z", "desc": "Ectopic pregnancy, unspecified" },
              { "code": "JA01.0", "desc": "Abdominal pregnancy" },
              { "code": "JA61.0", "desc": "Varicose veins of lower extremity in pregnancy" },
              { "code": "JA02.Z", "desc": "Molar pregnancy, unspecified" }
            ]
          },
          {
            "keyword": "anemia",
            "results": [
              { "code": "3A9Z", "desc": "Anaemias or other erythrocyte disorders, unspecified" },
              { "code": "KA8Y", "desc": "Other specified haemorrhagic or haematological disorders of fetus or newborn" },
              { "code": "JB64.0", "desc": "Anaemia complicating pregnancy, childbirth or the puerperium" },
              { "code": "3A70.11", "desc": "Aplastic anaemia due to other external agents" },
              { "code": "3A70.Z", "desc": "Aplastic anaemia, unspecified" },
              { "code": "3A90", "desc": "Anaemia due to acute disease" },
              { "code": "3A71.Z", "desc": "Anaemia due to chronic disease, unspecified" },
              { "code": "1F68.1", "desc": "Necatoriasis" },
              { "code": "2A30", "desc": "Refractory anaemia" },
              { "code": "3A72.Z", "desc": "Sideroblastic anaemia, unspecified" }
            ]
          },
          {
            "keyword": "pneumonia",
            "results": [
              { "code": "CA40.Z", "desc": "Pneumonia, organism unspecified" },
              { "code": "CA40.Y", "desc": "Other specified pneumonia" },
              { "code": "KB24", "desc": "Congenital pneumonia" },
              { "code": "CA40.1Z", "desc": "Viral pneumonia, unspecified" },
              { "code": "CA40.0Z", "desc": "Bacterial pneumonia, unspecified" },
              { "code": "NF0A.Y", "desc": "Other early complication of trauma, not elsewhere classified" },
              { "code": "CA82.0", "desc": "Acute pulmonary manifestations due to radiation" },
              { "code": "CB03.Z", "desc": "Idiopathic interstitial pneumonitis, unspecified" },
              { "code": "CA40.07", "desc": "Pneumonia due to Streptococcus pneumoniae" },
              { "code": "CA40.0Y", "desc": "Pneumonia due to other specified bacteria" }
            ]
          },
          {
            "keyword": "asthma",
            "results": [
              { "code": "CA23", "desc": "Asthma" },
              { "code": "CA23.3", "desc": "Unspecified asthma" },
              { "code": "CA23.32", "desc": "Unspecified asthma, uncomplicated" },
              { "code": "CA23.0", "desc": "Allergic asthma" },
              { "code": "CA23.31", "desc": "Unspecified asthma with status asthmaticus" },
              { "code": "CA60.1", "desc": "Coal worker pneumoconiosis" },
              { "code": "CA23.30", "desc": "Unspecified asthma with exacerbation" },
              { "code": "CA22.1", "desc": "Certain specified chronic obstructive pulmonary disease" },
              { "code": "CA23.1", "desc": "Non-allergic asthma" },
              { "code": "CA70.Y", "desc": "Other specified hypersensitivity pneumonitis due to organic dust" }
            ]
          },
          {
            "keyword": "migraine",
            "results": [
              { "code": "8A80.Z", "desc": "Migraine, unspecified" },
              { "code": "8A80.Y", "desc": "Other specified migraine" },
              { "code": "8A80.2", "desc": "Chronic migraine" },
              { "code": "8A80.1Z", "desc": "Migraine with aura, unspecified" },
              { "code": "8A80.0", "desc": "Migraine without aura" },
              { "code": "8A80.3Y", "desc": "Other specified complications related to migraine" },
              { "code": "GA34.40", "desc": "Premenstrual tension syndrome" },
              { "code": "8A80.30", "desc": "Status migrainosus" },
              { "code": "DD93.Y", "desc": "Other functional digestive disorders of infants, neonates or toddlers" },
              { "code": "AB31.1", "desc": "Vestibular migraine" }
            ]
          },
          {
            "keyword": "tonsillitis",
            "results": [
              { "code": "CA03.Z", "desc": "Acute tonsillitis, unspecified" },
              { "code": "CA0F.Y", "desc": "Other specified chronic diseases of tonsils or adenoids" },
              { "code": "CA03.Y", "desc": "Other specified acute tonsillitis" },
              { "code": "CA0F.0", "desc": "Hypertrophy of tonsils" },
              { "code": "CA03.0", "desc": "Streptococcal tonsillitis" },
              { "code": "NA0Z&XA3V90", "desc": "Injury of tonsil" },
              { "code": "1C1H.0", "desc": "Other Vincent infections" },
              { "code": "2B69.Z", "desc": "Malignant neoplasms of tonsil, unspecified" },
              { "code": "2E90.4", "desc": "Benign neoplasm of tonsil" },
              { "code": "CA0F.1", "desc": "Hypertrophy of adenoids" }
            ]
          },
          {
            "keyword": "dengue",
            "results": [
              { "code": "1D2Z", "desc": "Dengue fever, unspecified" },
              { "code": "1D22", "desc": "Severe dengue" },
              { "code": "1D21", "desc": "Dengue with warning signs" },
              { "code": "1D20", "desc": "Dengue without warning signs" },
              { "code": "QA08.5", "desc": "Special screening examination for other viral diseases" },
              { "code": "QA02.1", "desc": "Observation for suspected Dengue, ruled out" }
            ]
          },
          {
            "keyword": "covid",
            "results": [
              { "code": "RA02", "desc": "Post COVID-19 condition" },
              { "code": "RA01", "desc": "COVID-19" },
              { "code": "RA01.0", "desc": "COVID-19, virus identified" },
              { "code": "RA01.1", "desc": "COVID-19, virus not identified" },
              { "code": "QA08.5", "desc": "Special screening examination for other viral diseases" },
              { "code": "QC42.0", "desc": "Personal history of COVID-19" },
              { "code": "QC01.9", "desc": "Need for immunization against COVID-19" },
              { "code": "RA03", "desc": "Multisystem inflammatory syndrome associated with COVID-19" },
              { "code": "RA01.0/CA40.1Z", "desc": "COVID-19 with pneumonia, SARS-CoV-2 identified" },
              { "code": "RA01.1/CA40.1Z", "desc": "COVID-19 with pneumonia, SARS-CoV-2 not identified" }
            ]
          },
          {
            "keyword": "uti",
            "results": [
              { "code": "GC08.Z", "desc": "Urinary tract infection, site and agent not specified" },
              { "code": "GC08.0", "desc": "Urinary tract infection, site not specified, due to Escherichia coli" },
              { "code": "GC08.Y&XN5L6", "desc": "Urinary tract infection, site not specified, due to Pseudomonas aeruginosa" }
            ]
          },
          {
            "keyword": "urinary tract infection",
            "results": [
              { "code": "GC08.Z", "desc": "Urinary tract infection, site and agent not specified" },
              { "code": "JA62.Y", "desc": "Infections of genitourinary tract in pregnancy, other specified site" },
              { "code": "KA65.2", "desc": "Neonatal urinary tract infection" },
              { "code": "1H0Z", "desc": "Infection, unspecified" },
              { "code": "JA62.Z", "desc": "Infection of genitourinary tract in pregnancy, site unspecified" },
              { "code": "JA62.3", "desc": "Infections of other parts of urinary tract in pregnancy" },
              { "code": "GC2Z", "desc": "Diseases of the urinary system, unspecified" },
              { "code": "JB40.Y", "desc": "Other specified infections in the puerperium" },
              { "code": "LB31.Z", "desc": "Structural developmental anomalies of urinary tract, unspecified" },
              { "code": "1A40.Z", "desc": "Infectious gastroenteritis or colitis without specification of infectious agent" }
            ]
          },
          {
            "keyword": "tuberculosis",
            "results": [
              { "code": "1B1Z", "desc": "Tuberculosis, unspecified" },
              { "code": "1B1Y", "desc": "Other specified tuberculosis" },
              { "code": "KA61.0", "desc": "Congenital tuberculosis" },
              { "code": "1B12.40", "desc": "Tuberculosis of bones or joints" },
              { "code": "1B10.Z", "desc": "Respiratory tuberculosis, without mention of bacteriological or histological confirmation" },
              { "code": "1B12.7", "desc": "Tuberculosis of the digestive system" },
              { "code": "1B13.1", "desc": "Acute miliary tuberculosis of multiple sites" },
              { "code": "1B12.8", "desc": "Cutaneous tuberculosis" },
              { "code": "QC90.1", "desc": "Contact with or exposure to tuberculosis" },
              { "code": "1B13.Z", "desc": "Miliary tuberculosis, unspecified" }
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
        consumed_obs1 INTEGER DEFAULT 0,
        consumed_minor INTEGER DEFAULT 0,
        user_stn1 TEXT,
        user_minor TEXT,
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
    const newCols = [
      { name: 'expiration_date', type: 'TEXT' },
      { name: 'status', type: 'TEXT' },
      { name: 'category', type: 'TEXT' },
      { name: 'consumed_obs1', type: 'INTEGER DEFAULT 0' },
      { name: 'consumed_minor', type: 'INTEGER DEFAULT 0' },
      { name: 'user_stn1', type: 'TEXT' },
      { name: 'user_minor', type: 'TEXT' }
    ];
    for (const col of newCols) {
      try {
        await client.execute(`ALTER TABLE nursing_monthly_stock ADD COLUMN ${col.name} ${col.type}`);
        console.log(`✅ SQLite Schema Migration: added ${col.name} to nursing_monthly_stock`);
      } catch (err) {
        if (!err.message.includes('duplicate column name') && !err.message.includes('already exists')) {
          console.warn(`⚠️ SQLite Schema Migration Notice for ${col.name}:`, err.message);
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

      const logCols = [
        { name: 'old_consumed_obs1', type: 'INTEGER DEFAULT 0' },
        { name: 'new_consumed_obs1', type: 'INTEGER DEFAULT 0' },
        { name: 'old_consumed_minor', type: 'INTEGER DEFAULT 0' },
        { name: 'new_consumed_minor', type: 'INTEGER DEFAULT 0' },
        { name: 'old_user_stn1', type: 'TEXT' },
        { name: 'new_user_stn1', type: 'TEXT' },
        { name: 'old_user_minor', type: 'TEXT' },
        { name: 'new_user_minor', type: 'TEXT' }
      ];
      for (const col of logCols) {
        try {
          await client.execute(`ALTER TABLE nursing_stock_change_logs ADD COLUMN ${col.name} ${col.type}`);
          console.log(`✅ SQLite Schema Migration: added ${col.name} to nursing_stock_change_logs`);
        } catch (err) {
          if (!err.message.includes('duplicate column name') && !err.message.includes('already exists')) {
            console.warn(`⚠️ SQLite Schema Migration Notice for ${col.name} in logs:`, err.message);
          }
        }
      }
    } catch (err) {
      console.error('❌ Failed to initialize nursing_stock_change_logs table:', err);
    }

    // Nursing stock unlock passwords table
    try {
      await client.execute(`
      CREATE TABLE IF NOT EXISTS nursing_unlock_passwords (
        month_year TEXT PRIMARY KEY,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      )
    `);
      console.log('✅ SQLite Schema Migration: created/verified nursing_unlock_passwords table');
    } catch (err) {
      console.error('❌ Failed to initialize nursing_unlock_passwords table:', err);
    }

    // Nursing stock unlock logs table
    try {
      await client.execute(`
      CREATE TABLE IF NOT EXISTS nursing_stock_unlocks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        month_year TEXT NOT NULL,
        user_id INTEGER NOT NULL,
        username TEXT NOT NULL,
        full_name TEXT NOT NULL,
        unlocked_at DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      )
    `);
      console.log('✅ SQLite Schema Migration: created/verified nursing_stock_unlocks table');
    } catch (err) {
      console.error('❌ Failed to initialize nursing_stock_unlocks table:', err);
    }

    // Nursing deleted items table — persists which items were removed from the roster per month
    try {
      await client.execute(`
      CREATE TABLE IF NOT EXISTS nursing_deleted_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        month_year TEXT NOT NULL,
        item_name TEXT NOT NULL,
        deleted_by TEXT,
        deleted_at DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        UNIQUE(month_year, item_name)
      )
    `);
      console.log('✅ SQLite Schema Migration: created/verified nursing_deleted_items table');
    } catch (err) {
      console.error('❌ Failed to initialize nursing_deleted_items table:', err);
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
      } catch (e) { /* already exists */ }

      // Add notes / rejection_reason to requisitions if missing
      try {
        await client.execute("ALTER TABLE requisitions ADD COLUMN notes TEXT");
        console.log('✅ SQLite Schema Migration: added notes to requisitions');
      } catch (e) { /* already exists */ }
      try {
        await client.execute("ALTER TABLE requisitions ADD COLUMN rejection_reason TEXT");
        console.log('✅ SQLite Schema Migration: added rejection_reason to requisitions');
      } catch (e) { /* already exists */ }
      try {
        await client.execute("ALTER TABLE stock_batches ADD COLUMN lot_number TEXT");
        console.log('✅ SQLite Schema Migration: added lot_number column to stock_batches');
      } catch (e) { /* already exists */ }

      console.log('✅ SQLite Schema Migration: created stock management relational tables');
    } catch (err) {
      console.error('❌ Failed to initialize stock management tables:', err);
    }

    // ── UOMs Table ──────────────────────────────────────────────────────────────
    try {
      await client.execute(`
      CREATE TABLE IF NOT EXISTS uoms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        abbreviation TEXT NOT NULL,
        description TEXT
      )
    `);
      console.log('✅ SQLite Schema Migration: created uoms table');

      // Seed default UOMs if table is empty
      const { rows: uomCount } = await client.execute("SELECT COUNT(*) as count FROM uoms");
      if (uomCount[0].count === 0) {
        const defaultUoms = [
          ['Piece', 'pc', 'Single item or piece'],
          ['Box', 'bx', 'Box of multiple items'],
          ['Pack', 'pk', 'Pack or package'],
          ['Bottle', 'btl', 'Bottle of liquid or pills'],
          ['Vial', 'vl', 'Small vial'],
          ['Tube', 'tb', 'Tube of cream or ointment'],
          ['Roll', 'rl', 'Roll of tape, cotton, etc.'],
          ['Set', 'set', 'Set of instruments or tools'],
          ['Kit', 'kit', 'Medical or surgical kit'],
          ['Can', 'cn', 'Can or canister'],
        ];
        for (const [name, abbr, desc] of defaultUoms) {
          await client.execute({
            sql: "INSERT OR IGNORE INTO uoms (name, abbreviation, description) VALUES (?, ?, ?)",
            args: [name, abbr, desc]
          });
        }
        console.log('✅ Seeded default UOMs');
      }
    } catch (err) {
      console.error('❌ Failed to initialize uoms table:', err);
    }

    // ── SKU Standardisation (lc-INITIALS-BATCH-DEPT-0001) ───────────────────────
    try {
      const { rows: skuCheck } = await client.execute(
        "SELECT COUNT(*) as total, SUM(CASE WHEN sku GLOB 'lc-*-*-*-[0-9][0-9][0-9][0-9]' THEN 1 ELSE 0 END) as lc_count FROM master_inventory"
      );
      const total = Number(skuCheck[0].total);
      const lcCount = Number(skuCheck[0].lc_count);

      if (total > 0 && lcCount < total) {
        console.log(`🔧 Standardising SKUs: ${total - lcCount} items — running as single batch…`);

        // Fetch all items with their batch + dept + vendor context
        const { rows: items } = await client.execute(`
        SELECT mi.id, mi.name, sb.batch_number, sb.vendor_id, ds.department_id, d.name AS dept_name
        FROM master_inventory mi
        LEFT JOIN stock_batches sb ON mi.id = sb.item_id
        LEFT JOIN department_stock ds ON sb.id = ds.batch_id
        LEFT JOIN departments d ON ds.department_id = d.id
        WHERE mi.sku NOT GLOB 'lc-*-*-*-[0-9][0-9][0-9][0-9]' OR mi.sku IS NULL
        GROUP BY mi.id
        ORDER BY ds.department_id, sb.vendor_id, mi.id
      `);

        // Build a counter map keyed by "dept_id|vendor_id"
        const seqMap = {};
        const statements = items.map(item => {
          const initials = (item.name || 'ITM').substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, '') || 'ITM';
          const batch = item.batch_number ? item.batch_number : 'XXXX';
          const dept = item.dept_name
            ? item.dept_name.substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, '') || 'DEP'
            : 'XXX';

          // Unique key for dept + vendor combo
          const groupKey = `${item.department_id || 'none'}|${item.vendor_id || 'none'}`;
          seqMap[groupKey] = (seqMap[groupKey] || 0) + 1;
          const seqStr = String(seqMap[groupKey]).padStart(4, '0');

          return {
            sql: "UPDATE master_inventory SET sku = ? WHERE id = ?",
            args: [`lc-${initials}-${batch}-${dept}-${seqStr}`, item.id]
          };
        });

        await client.batch(statements, 'write');
        console.log(`✅ SKU standardisation complete — updated ${items.length} items in one batch.`);
      } else {
        console.log('✅ All SKUs already standardised.');
      }
    } catch (err) {
      console.error('❌ Failed to standardise SKUs:', err);
    }

    // ── Supplier Portal Relational Tables ──────────────────────────────────────
    try {
      // 1. system_settings
      await client.execute(`
      CREATE TABLE IF NOT EXISTS system_settings (
        key TEXT PRIMARY KEY,
        value TEXT
      )
    `);

      // Seed supplier_portal_active if not present
      await client.execute(`
      INSERT OR IGNORE INTO system_settings (key, value)
      VALUES ('supplier_portal_active', 'false')
    `);

      // 2. supplier_submissions
      await client.execute(`
      CREATE TABLE IF NOT EXISTS supplier_submissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        supplier_name TEXT NOT NULL,
        uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'pending'
      )
    `);

      // 3. supplier_submission_items
      await client.execute(`
      CREATE TABLE IF NOT EXISTS supplier_submission_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        submission_id INTEGER REFERENCES supplier_submissions(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        sku TEXT,
        category TEXT,
        unit_of_measure TEXT,
        batch_number TEXT,
        expiry_date TEXT,
        purchase_price REAL,
        quantity INTEGER DEFAULT 0,
        vendor_name TEXT
      )
    `);

      console.log('✅ SQLite Schema Migration: created/verified Supplier Portal tables');
    } catch (err) {
      console.error('❌ Failed to initialize Supplier Portal tables:', err);
    }

    // ── Multi-Session Supplier Portal ───────────────────────────────────────────
    try {
      await client.execute(`
      CREATE TABLE IF NOT EXISTS supplier_portal_sessions (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        vendor_id   INTEGER NOT NULL,
        vendor_name TEXT    NOT NULL,
        token       TEXT    NOT NULL UNIQUE,
        items       TEXT    DEFAULT '[]',
        created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_active   INTEGER DEFAULT 1
      )
    `);
      console.log('✅ SQLite Schema Migration: created/verified supplier_portal_sessions table');
    } catch (err) {
      console.error('❌ Failed to initialize supplier_portal_sessions table:', err);
    }

    // ── Clinical Observations (Clinical Sheets) ──────────────────────────────────
    try {
      await client.execute(`
      CREATE TABLE IF NOT EXISTS clinical_observations (
        id                    INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id            TEXT NOT NULL,
        queue_id              TEXT,
        patient_name          TEXT,
        ward                  TEXT,
        bed                   TEXT,
        identification_json   TEXT DEFAULT '{}',
        triage_json           TEXT DEFAULT '{}',
        progress_notes_json   TEXT DEFAULT '[]',
        medication_mar_json   TEXT DEFAULT '{}',
        sbar_json             TEXT DEFAULT '{}',
        status                TEXT DEFAULT 'Draft',
        created_by            INTEGER REFERENCES users(id) ON DELETE SET NULL,
        is_mock               INTEGER DEFAULT 0,
        created_at            DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        updated_at            DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      )
    `);
      await client.execute(`CREATE INDEX IF NOT EXISTS idx_co_patient_id ON clinical_observations(patient_id)`);
      await client.execute(`CREATE INDEX IF NOT EXISTS idx_co_status ON clinical_observations(status)`);
      await client.execute(`CREATE INDEX IF NOT EXISTS idx_co_updated_at ON clinical_observations(updated_at DESC)`);
      console.log('✅ SQLite Schema Migration: created/verified clinical_observations table');
    } catch (err) {
      console.error('❌ Failed to initialize clinical_observations table:', err);
    }

    // ── Patient Vitals ───────────────────────────────────────────────────────────
    try {
      await client.execute(`
      CREATE TABLE IF NOT EXISTS patient_vitals (
        id                INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id        TEXT NOT NULL,
        temperature       REAL,
        pulse             INTEGER,
        respiratory_rate  INTEGER,
        blood_pressure    TEXT,
        weight            REAL,
        spo2              REAL,
        general_comments  TEXT,
        created_at        DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      )
    `);
      await client.execute(`CREATE INDEX IF NOT EXISTS idx_vitals_patient_id ON patient_vitals(patient_id)`);
      console.log('✅ SQLite Schema Migration: created/verified patient_vitals table');
    } catch (err) {
      console.error('❌ Failed to initialize patient_vitals table:', err);
    }

    // --- IT Support Hub Tables ---
    try {
      await client.execute(`
      CREATE TABLE IF NOT EXISTS it_assets (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        asset_tag     TEXT UNIQUE NOT NULL,
        name          TEXT NOT NULL,
        assigned_to   TEXT,
        department    TEXT,
        status        TEXT DEFAULT 'Active'
      )
    `);
      console.log('✅ SQLite Schema Migration: created/verified it_assets table');

      await client.execute(`
      CREATE TABLE IF NOT EXISTS it_tickets (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        ticket_number TEXT UNIQUE NOT NULL,
        title         TEXT NOT NULL,
        description   TEXT,
        reporter      TEXT NOT NULL,
        category      TEXT NOT NULL,
        status        TEXT DEFAULT 'Open',
        priority      TEXT DEFAULT 'Medium',
        created_at    TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      )
    `);
      console.log('✅ SQLite Schema Migration: created/verified it_tickets table');

      // Seed initial dummy data if empty
      const { rows: assetCheck } = await client.execute("SELECT COUNT(*) as cnt FROM it_assets");
      if (Number(assetCheck[0].cnt) === 0) {
        await client.execute("INSERT INTO it_assets (asset_tag, name, assigned_to, department, status) VALUES ('AST-LTP-01', 'Dell Latitude 5520', 'Dr. Alan', 'Clinical', 'Active')");
        await client.execute("INSERT INTO it_assets (asset_tag, name, assigned_to, department, status) VALUES ('AST-PRN-05', 'HP LaserJet Pro', 'Reception Desk', 'Operations', 'Needs Repair')");
        console.log('🌱 Seeded initial IT assets.');
      }

      const { rows: ticketCheck } = await client.execute("SELECT COUNT(*) as cnt FROM it_tickets");
      if (Number(ticketCheck[0].cnt) === 0) {
        await client.execute("INSERT INTO it_tickets (ticket_number, title, reporter, category, status, priority, created_at) VALUES ('TKT-901', 'Printer in Ward B not working', 'Nurse Alice', 'Hardware', 'Open', 'Medium', '2026-06-15')");
        await client.execute("INSERT INTO it_tickets (ticket_number, title, reporter, category, status, priority, created_at) VALUES ('TKT-902', 'Cannot access E-Prescriptions module', 'Dr. Smith', 'Software', 'In Progress', 'High', '2026-06-15')");
        await client.execute("INSERT INTO it_tickets (ticket_number, title, reporter, category, status, priority, created_at) VALUES ('TKT-903', 'New laptop setup for HR', 'HR Admin', 'Provisioning', 'Resolved', 'Low', '2026-06-13')");
        console.log('🌱 Seeded initial IT tickets.');
      }
    } catch (err) {
      console.error('❌ Failed to initialize IT Support Hub tables:', err);
    }

    // --- Compliance & Audit Portal Tables ---
    try {
      await client.execute(`
      CREATE TABLE IF NOT EXISTS compliance_licenses (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        staff_name    TEXT NOT NULL,
        role          TEXT NOT NULL,
        license_type  TEXT NOT NULL,
        expiry_date   TEXT NOT NULL,
        status        TEXT NOT NULL
      )
    `);
      console.log('✅ SQLite Schema Migration: created/verified compliance_licenses table');

      await client.execute(`
      CREATE TABLE IF NOT EXISTS compliance_facility_certs (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        name          TEXT NOT NULL,
        issuer        TEXT NOT NULL,
        expiry_date   TEXT NOT NULL,
        status        TEXT NOT NULL
      )
    `);
      console.log('✅ SQLite Schema Migration: created/verified compliance_facility_certs table');

      await client.execute(`
      CREATE TABLE IF NOT EXISTS compliance_audits (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        title         TEXT NOT NULL,
        scheduled_date TEXT NOT NULL,
        readiness_score INTEGER DEFAULT 0,
        description   TEXT
      )
    `);
      console.log('✅ SQLite Schema Migration: created/verified compliance_audits table');

      // Seed compliance audits if empty
      const { rows: auditCheck } = await client.execute("SELECT COUNT(*) as cnt FROM compliance_audits");
      if (Number(auditCheck[0].cnt) === 0) {
        await client.execute(`INSERT INTO compliance_audits (title, scheduled_date, readiness_score, description) 
        VALUES ('MOH Annual Facility Inspection', '2026-07-05', 75, 'Annual MOH standard check')`);
        console.log('🌱 Seeded initial compliance audits.');
      }

      // Seed compliance licenses if empty
      const { rows: licCheck } = await client.execute("SELECT COUNT(*) as cnt FROM compliance_licenses");
      if (Number(licCheck[0].cnt) === 0) {
        await client.execute("INSERT INTO compliance_licenses (staff_name, role, license_type, expiry_date, status) VALUES ('Dr. Jane Smith', 'Consultant', 'Medical Council Reg', '2026-07-15', 'Expiring Soon')");
        await client.execute("INSERT INTO compliance_licenses (staff_name, role, license_type, expiry_date, status) VALUES ('Nurse John Doe', 'RN', 'Nursing Board Cert', '2026-11-20', 'Valid')");
        await client.execute("INSERT INTO compliance_licenses (staff_name, role, license_type, expiry_date, status) VALUES ('Dr. Alan Wake', 'Surgeon', 'Medical Council Reg', '2026-06-18', 'Critical')");
        console.log('🌱 Seeded initial compliance licenses.');
      }

      // Seed facility certs if empty
      const { rows: certCheck } = await client.execute("SELECT COUNT(*) as cnt FROM compliance_facility_certs");
      if (Number(certCheck[0].cnt) === 0) {
        await client.execute("INSERT INTO compliance_facility_certs (name, issuer, expiry_date, status) VALUES ('Fire Safety Certificate', 'National Police', '2027-01-10', 'Valid')");
        await client.execute("INSERT INTO compliance_facility_certs (name, issuer, expiry_date, status) VALUES ('Radiation Safety (X-Ray)', 'MOH', '2026-08-05', 'Expiring Soon')");
        console.log('🌱 Seeded initial compliance facility certs.');
      }
    } catch (err) {
      console.error('❌ Failed to initialize Compliance tables:', err);
    }

    // --- Revenue Leakage Tracker Tables ---
    try {
      await client.execute(`
      CREATE TABLE IF NOT EXISTS revenue_leakages (
        id            TEXT PRIMARY KEY,
        patient       TEXT NOT NULL,
        service       TEXT NOT NULL,
        date          TEXT NOT NULL,
        clinical_log  TEXT NOT NULL,
        billing_log   TEXT NOT NULL,
        value         INTEGER NOT NULL,
        status        TEXT NOT NULL DEFAULT 'Unresolved'
      )
    `);
      console.log('✅ SQLite Schema Migration: created/verified revenue_leakages table');

      // Seed revenue leakages if empty
      const { rows: leakageCheck } = await client.execute("SELECT COUNT(*) as cnt FROM revenue_leakages");
      if (Number(leakageCheck[0].cnt) === 0) {
        await client.execute("INSERT INTO revenue_leakages (id, patient, service, date, clinical_log, billing_log, value, status) VALUES ('LKG-201', 'John Doe', 'MRI Brain', '2026-06-14', 'Radiology Report Generated', 'Missing Invoice', 150000, 'Unresolved')");
        await client.execute("INSERT INTO revenue_leakages (id, patient, service, date, clinical_log, billing_log, value, status) VALUES ('LKG-202', 'Jane Smith', 'CBC Blood Test', '2026-06-13', 'Lab Results Uploaded', 'Missing Invoice', 25000, 'Unresolved')");
        await client.execute("INSERT INTO revenue_leakages (id, patient, service, date, clinical_log, billing_log, value, status) VALUES ('LKG-203', 'Alice Johnson', 'Physiotherapy Session', '2026-06-12', 'Session Notes Logged', 'Billed 10,000 (Expected 15,000)', 5000, 'Unresolved')");
        await client.execute("INSERT INTO revenue_leakages (id, patient, service, date, clinical_log, billing_log, value, status) VALUES ('LKG-204', 'Robert Brown', 'Emergency Consultation', '2026-06-10', 'Vitals & Doctor Notes', 'Invoice Paid', 20000, 'Recovered')");
        console.log('🌱 Seeded initial revenue leakages.');
      }
    } catch (err) {
      console.error('❌ Failed to initialize Revenue Leakages table:', err);
    }

    // --- Medical Director Role Setup & Permissions Sync ---
    try {
      await client.execute({
        sql: "INSERT OR IGNORE INTO roles (name, display_name) VALUES (?, ?)",
        args: ['medical_director', 'Medical Director']
      });
      console.log('✅ SQLite Schema Migration: registered medical_director role');

      const { ROLE_DEFAULTS } = require('./permissions');
      const mdPermissions = ROLE_DEFAULTS['medical_director'];
      if (mdPermissions) {
        for (const [moduleName, actions] of Object.entries(mdPermissions)) {
          for (const [action, granted] of Object.entries(actions)) {
            await client.execute({
              sql: `
                INSERT INTO role_permissions (role_name, module, action, granted, updated_by)
                VALUES (?, ?, ?, ?, 1)
                ON CONFLICT(role_name, module, action) DO UPDATE 
                SET granted = EXCLUDED.granted
              `,
              args: ['medical_director', moduleName, action, granted ? 1 : 0]
            }).catch(() => {});
          }
        }
        console.log('✅ SQLite Schema Migration: synced medical_director permissions');
      }

      // 3. Add test user
      const bcrypt = require('bcryptjs');
      const passwordHash = await bcrypt.hash('director123', 10);
      const { rows: roles } = await client.execute({
        sql: 'SELECT id FROM roles WHERE name = ?',
        args: ['medical_director']
      });
      if (roles.length > 0) {
        await client.execute({
          sql: `INSERT INTO users (full_name, username, email, password_hash, role_id) 
                VALUES (?, ?, ?, ?, ?) 
                ON CONFLICT (username) DO NOTHING`,
          args: ['Dr. Miranda Bailey', 'director_miranda', 'miranda@legacyclinics.rw', passwordHash, roles[0].id]
        });
        console.log('✅ SQLite Schema Migration: registered test Medical Director user (director_miranda)');
      }
    } catch (err) {
      console.error('❌ Failed to setup medical_director role/permissions:', err);
    }
  })();
}




/**
 * Mocking the 'pg' query interface for minimal model refactoring.
 */
const query = async (sql, params = []) => {
  try {
    const { rows, rowsAffected } = await client.execute({ sql, args: params });

    // Auto-fix SQLite date strings to ISO UTC format for frontend compatibility
    const fixedRows = rows.map(row => {
      const newRow = { ...row };
      for (const key in newRow) {
        const val = newRow[key];
        if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d+)?$/.test(val)) {
          newRow[key] = val.replace(' ', 'T') + 'Z';
        }
      }
      return newRow;
    });

    return {
      rows: fixedRows,
      rowCount: rowsAffected || fixedRows.length
    };
  } catch (err) {
    console.error('💥 Prisma Query Error:', err.message);
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
    if (libsql) {
      const mapped = statements.map(s => {
        const encryptedArgs = encryptParams(s.sql, s.args || []);
        const { sql, args } = transformQuery(s.sql, encryptedArgs);
        return { sql, args };
      });
      return await libsql.batch(mapped);
    } else {
      const promises = statements.map(s => {
        const encryptedArgs = encryptParams(s.sql, s.args || []);
        const { sql, args } = transformQuery(s.sql, encryptedArgs);
        return prisma.$executeRawUnsafe(sql, ...(args || []));
      });
      return await prisma.$transaction(promises);
    }
  } catch (err) {
    console.error('💥 Batch Error:', err.message);
    throw err;
  }
};

module.exports = {
  query,
  batch,
  client
};

