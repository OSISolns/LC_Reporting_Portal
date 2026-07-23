'use strict';
require('dotenv').config();
const { createClient } = require('@libsql/client');
const tursoUrl = process.env.lcreporting_TURSO_DATABASE_URL || process.env.TURSO_DATABASE_URL;
const tursoToken = process.env.lcreporting_TURSO_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN;

let libsql = null;
let prisma = null;

const { encryptField, decryptField } = require('../utils/crypto');

const ENCRYPTED_COLUMNS = {
  clinical_observations: ['patient_name', 'identification_json', 'triage_json', 'progress_notes_json', 'medication_mar_json', 'sbar_json'],
  patient_vitals: ['temperature', 'pulse', 'respiratory_rate', 'blood_pressure', 'weight', 'spo2', 'general_comments'],
  cancellation_requests: ['patient_full_name', 'pid_number', 'old_sid_number', 'new_sid_number', 'telephone_number', 'insurance_payer', 'reason_for_cancellation', 'rejection_comment'],
  refund_requests: ['patient_full_name', 'pid_number', 'sid_number', 'telephone_number', 'insurance_payer', 'momo_code', 'amount_paid_by', 'original_receipt_number', 'reason_for_refund', 'rejection_comment'],
  incident_reports: ['names_involved', 'pid_number', 'description', 'contributing_factors', 'immediate_actions', 'prevention_measures', 'review_comments', 'hsfp_comments', 'rca_environment', 'rca_staff', 'rca_equipment', 'rca_policy', 'rca_verification_json', 'corrective_actions_json'],
  results_transfers: ['old_sid', 'new_sid', 'reason', 'edited_by_name', 'rejection_comment'],
  internal_feedbacks: ['contact_info', 'concern_description', 'other_details'],
  it_tickets: ['title', 'description', 'reporter'],
  it_assets: ['name', 'assigned_to'],
  notifications: ['title', 'message', 'link'],
  nursing_monthly_stock: ['responsible_name', 'consumed_obs1', 'consumed_minor_surgery', 'user_obs1', 'user_minor', 'user_stn1'],
  nursing_stock_change_logs: ['updated_by', 'old_user_obs1', 'new_user_obs1', 'old_user_minor', 'new_user_minor', 'old_user_stn1', 'new_user_stn1'],
  requisitions: ['notes', 'rejection_reason'],
  safety_reports: ['title', 'executive_summary', 'key_findings', 'recommendations'],
  shift_sessions: ['handover_notes', 'flag_reasons'],
  shift_nurse_close: ['handover_sbar_sb', 'handover_sbar_ar'],
  shift_callcenter_close: ['call_top_reasons', 'followup_details'],
  shift_viplounge_close: ['vip_logs'],
  sukraa_patients: ['full_name', 'age', 'dob', 'gender', 'phone', 'insurance', 'ref_type', 'referrer_name', 'extra_1', 'extra_2'],
  supplier_portal_sessions: ['items'],
  users: ['full_name', 'email'],
  imaging_orders: ['patient_name', 'clinical_indication', 'indication_code_json', 'referring_provider', 'notes'],
  imaging_studies: ['patient_name', 'technical_notes', 'consent_json', 'referring_provider', 'clinical_indication', 'sid', 'patient_age', 'patient_sex'],
  imaging_reports: ['technique', 'findings_narrative', 'findings_code_json', 'impression', 'diagnosis_code_json', 'recommendations', 'amendment_reason']
};

const ALL_ENCRYPTED_COLS = new Set(Object.values(ENCRYPTED_COLUMNS).flat());

// LIKE searches against encrypted columns cannot be resolved in SQL, so they
// are post-filtered in memory after decryption (see interceptAndFilterQuery /
// client.execute). A SQL-level LIMIT would be applied to the encrypted rows
// *before* that filter runs, silently truncating the candidate set to an
// arbitrary ciphertext-ordered window. To avoid that, any LIMIT/OFFSET on such
// a query is deferred and re-applied after filtering; this cap bounds how many
// rows we decrypt+scan per search so the deferral can't degenerate into an
// unbounded full-table scan. (A proper long-term fix is a blind/HMAC search
// index on the searchable columns.)
const ENCRYPTED_SEARCH_SCAN_CAP = 5000;

function encryptParams(sql, params) {
  if (!params || params.length === 0) return params;
  const encrypted = [...params];
  const upperSql = sql.toUpperCase();

  const tables = Object.keys(ENCRYPTED_COLUMNS).filter(t => upperSql.includes(t.toUpperCase()));
  if (tables.length === 0) return params;

  for (const table of tables) {
    const colsToEncrypt = ENCRYPTED_COLUMNS[table];

    // Case 1: INSERT
    if (upperSql.includes('INSERT INTO')) {
      const regex = new RegExp(`INSERT\\s+INTO\\s+${table}\\s*\\(([^)]+)\\)`, 'i');
      const match = sql.match(regex);
      if (match) {
        const cols = match[1].split(',').map(c => c.trim().toLowerCase());
        cols.forEach((col, idx) => {
          if (colsToEncrypt.includes(col)) {
            if (encrypted[idx] !== undefined && encrypted[idx] !== null && typeof encrypted[idx] === 'string') {
              if (!String(encrypted[idx]).startsWith('enc:')) {
                encrypted[idx] = encryptField(encrypted[idx]);
              }
            }
          }
        });
      }
    }
    
    // Case 2 & 3: UPDATE / SELECT exact matches
    const regex = /(\w+)\s*=\s*(?:\$(\d+)|(\?))/gi;
    let match;
    let placeholderIdx = 0;
    while ((match = regex.exec(sql)) !== null) {
      const colName = match[1].toLowerCase();
      const dollarIdx = match[2];
      const questionMark = match[3];

      if (colsToEncrypt.includes(colName)) {
        let paramIdx = -1;
        if (dollarIdx) {
          paramIdx = parseInt(dollarIdx, 10) - 1;
        } else if (questionMark) {
          paramIdx = placeholderIdx;
        }
        if (paramIdx >= 0 && paramIdx < encrypted.length) {
          if (encrypted[paramIdx] !== undefined && encrypted[paramIdx] !== null && typeof encrypted[paramIdx] === 'string') {
            if (!String(encrypted[paramIdx]).startsWith('enc:')) {
              encrypted[paramIdx] = encryptField(encrypted[paramIdx]);
            }
          }
        }
      }
      if (questionMark) {
        placeholderIdx++;
      }
    }
  }

  return encrypted;
}

function decryptRow(row) {
  if (!row) return row;
  const decrypted = { ...row };

  // decryptField already self-identifies ciphertext via the 'enc:' prefix and
  // safely no-ops on anything else, so decrypting is driven by the VALUE, not
  // by matching the result column's name against ENCRYPTED_COLUMNS. That
  // name-matching approach silently failed for any query that aliased an
  // encrypted column (e.g. `u.full_name AS doctor_name`) -- the alias never
  // matched the original column name, so decryption was skipped and raw
  // ciphertext leaked to the client. Checking every string value directly
  // closes that gap for all existing and future aliased queries at once.
  for (const key in decrypted) {
    if (typeof decrypted[key] === 'string' && decrypted[key].startsWith('enc:')) {
      decrypted[key] = decryptField(decrypted[key]);
    }
  }

  return decrypted;
}

const interceptAndFilterQuery = (sql, params) => {
  let newSql = sql;
  const inMemoryFilters = [];
  const placeholdersUsed = [];

  const likeRegex = /(?:(\w+)\.)?(\w+)\s+(?:I)?LIKE\s+(?:\$(\d+)|\?)/gi;
  let matches = [...sql.matchAll(likeRegex)];
  
  if (matches.length > 0) {
    for (const m of matches) {
      const colName = m[2].toLowerCase();
      if (ALL_ENCRYPTED_COLS.has(colName)) {
        const fullMatchStr = m[0];
        const dollarIdx = m[3];

        let paramIdx = -1;
        if (dollarIdx) {
          paramIdx = parseInt(dollarIdx, 10) - 1;
        } else {
          const matchPos = m.index;
          const textBefore = sql.substring(0, matchPos);
          const qCountBefore = (textBefore.match(/\?/g) || []).length;
          paramIdx = qCountBefore;
        }

        if (paramIdx >= 0 && paramIdx < params.length) {
          const filterVal = params[paramIdx];
          if (filterVal) {
            const rawSearch = String(filterVal).replace(/^%|%$/g, '').toLowerCase();
            inMemoryFilters.push({ column: colName, search: rawSearch });
            placeholdersUsed.push(paramIdx);
          }
        }

        newSql = newSql.replace(fullMatchStr, '1=1');
      }
    }
  }

  // When we post-filter in memory, a SQL LIMIT/OFFSET would be applied to the
  // raw (encrypted, arbitrarily-ordered) rows before filtering and thus return
  // the wrong slice. Detect a trailing LIMIT [OFFSET] clause, remove it from
  // the query, and hand the values back so they can be re-applied after the
  // in-memory filter. A bounded scan cap replaces it to keep cost finite.
  let postLimit = null;
  let postOffset = 0;
  if (inMemoryFilters.length > 0) {
    const limitRe = /\bLIMIT\s+(\$\d+|\?|\d+)(?:\s+OFFSET\s+(\$\d+|\?|\d+))?/i;
    const lm = sql.match(limitRe);
    if (lm) {
      const idxs = [];
      // '?' placeholders are positional; count how many precede this clause.
      let qCursor = (sql.slice(0, lm.index).match(/\?/g) || []).length;
      const resolveNum = (tok) => {
        if (tok === '?') { const idx = qCursor++; idxs.push(idx); return Number(params[idx]); }
        const dm = /^\$(\d+)$/.exec(tok);
        if (dm) { const idx = parseInt(dm[1], 10) - 1; idxs.push(idx); return Number(params[idx]); }
        return Number(tok); // integer literal
      };
      const lim = resolveNum(lm[1]);
      const off = lm[2] !== undefined ? resolveNum(lm[2]) : 0;
      // Only defer when both values resolve to real numbers; otherwise leave
      // the original clause untouched rather than risk an empty/garbage slice.
      if (Number.isFinite(lim) && Number.isFinite(off)) {
        postLimit = lim;
        postOffset = off;
        placeholdersUsed.push(...idxs);
        newSql = newSql.replace(limitRe, '').trimEnd() + ` LIMIT ${ENCRYPTED_SEARCH_SCAN_CAP}`;
      }
    }
  }

  return { newSql, inMemoryFilters, placeholdersUsed, postLimit, postOffset };
};

if (tursoUrl && tursoToken) {
  libsql = createClient({
    url: tursoUrl,
    authToken: tursoToken,
  });
} else {
  const { PrismaClient } = require('@prisma/client');
  prisma = new PrismaClient();
  console.log('🔌 DATABASE: Connected to local SQLite database (via Prisma).');
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

    const { newSql, inMemoryFilters, placeholdersUsed, postLimit, postOffset } = interceptAndFilterQuery(sql, args);
    const encryptedArgs = encryptParams(newSql, args);
    
    let finalArgsBeforeTransform = encryptedArgs;
    if (placeholdersUsed.length > 0) {
      const usesDollar = sql.includes('$');
      if (!usesDollar) {
        finalArgsBeforeTransform = encryptedArgs.filter((_, idx) => !placeholdersUsed.includes(idx));
      }
    }

    const { sql: transformedSql, args: finalArgs } = transformQuery(newSql, finalArgsBeforeTransform);
    const upperSql = transformedSql.trim().toUpperCase();
    const isSelect = upperSql.startsWith('SELECT') || upperSql.startsWith('PRAGMA') || upperSql.includes('RETURNING');
    try {
      if (libsql) {
        const result = await libsql.execute({ sql: transformedSql, args: finalArgs });
        const safeRows = (result.rows || []).map(row => {
          const newRow = { ...row };
          for (const key in newRow) {
            if (typeof newRow[key] === 'bigint') newRow[key] = Number(newRow[key]);
          }
          return decryptRow(newRow);
        });

        let filteredRows = safeRows;
        if (inMemoryFilters.length > 0 && safeRows.length > 0) {
          filteredRows = safeRows.filter(row => {
            return inMemoryFilters.every(f => {
              const searchTerm = f.search;
              if (!searchTerm) return true;
              return Object.keys(row).some(key => {
                const val = row[key];
                if (val === undefined || val === null) return false;
                return String(val).toLowerCase().includes(searchTerm);
              });
            });
          });
          // Re-apply the LIMIT/OFFSET that was deferred past the in-memory filter.
          if (postLimit != null) {
            filteredRows = filteredRows.slice(postOffset, postOffset + postLimit);
          }
        }

        return { rows: filteredRows, rowsAffected: result.rowsAffected || filteredRows.length };
      } else {
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

          let filteredRows = safeRows;
          if (inMemoryFilters.length > 0 && safeRows.length > 0) {
            filteredRows = safeRows.filter(row => {
              return inMemoryFilters.every(f => {
                const searchTerm = f.search;
                if (!searchTerm) return true;
                return Object.keys(row).some(key => {
                  const val = row[key];
                  if (val === undefined || val === null) return false;
                  return String(val).toLowerCase().includes(searchTerm);
                });
              });
            });
            // Re-apply the LIMIT/OFFSET that was deferred past the in-memory filter.
            if (postLimit != null) {
              filteredRows = filteredRows.slice(postOffset, postOffset + postLimit);
            }
          }

          return { rows: filteredRows, rowsAffected: filteredRows.length };
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
    if (libsql) {
      const mapped = statements.map(s => {
        let stmtSql, stmtArgs;
        if (typeof s === 'string') {
          stmtSql = s;
          stmtArgs = [];
        } else {
          stmtSql = s.sql;
          stmtArgs = s.args || [];
        }
        const encryptedArgs = encryptParams(stmtSql, stmtArgs);
        const { sql, args } = transformQuery(stmtSql, encryptedArgs);
        return { sql, args };
      });
      return await libsql.batch(mapped);
    } else {
      const promises = statements.map(s => {
        let stmtSql, stmtArgs;
        if (typeof s === 'string') {
          stmtSql = s;
          stmtArgs = [];
        } else {
          stmtSql = s.sql;
          stmtArgs = s.args || [];
        }
        const encryptedArgs = encryptParams(stmtSql, stmtArgs);
        const { sql, args } = transformQuery(stmtSql, encryptedArgs);
        return prisma.$executeRawUnsafe(sql, ...(args || []));
      });
      return await prisma.$transaction(promises);
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
      
      // ─── Purge is_mock Columns Migration ──────────────────────────────────────────────
      try {
        const { rows: tables } = await client.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
        console.log(`⚙️ Running is_mock column purge migration. Checking ${tables.length} tables...`);
        for (const table of tables) {
          const tableName = table.name;
          const { rows: columns } = await client.execute(`PRAGMA table_info(${tableName})`);
          const hasIsMock = columns.some(col => col.name === 'is_mock');
          if (hasIsMock) {
            console.log(`  🗑️ Table '${tableName}' contains 'is_mock'. Dropping column...`);
            await client.execute(`ALTER TABLE ${tableName} DROP COLUMN is_mock`).then(() => {
              console.log(`  ✅ Successfully dropped 'is_mock' from table '${tableName}'`);
            }).catch((err) => {
              console.warn(`  ⚠️ Failed to drop 'is_mock' from table '${tableName}':`, err.message);
            });
          }
        }
      } catch (err) {
        console.error('❌ Failed to run is_mock column purge migration:', err.message);
      }
      
      // ─── IT Tickets Column Migration ──────────────────────────────────────────────────
      try {
        await client.execute("ALTER TABLE it_tickets ADD COLUMN user_id INTEGER REFERENCES users(id)").catch((err) => {
          if (!err.message.includes('duplicate column name') && !err.message.includes('already exists')) {
            console.warn("⚠️ ALTER TABLE it_tickets ADD COLUMN user_id failed:", err.message);
          }
        });
        await client.execute("ALTER TABLE it_tickets ADD COLUMN working_station TEXT").catch((err) => {
          if (!err.message.includes('duplicate column name') && !err.message.includes('already exists')) {
            console.warn("⚠️ ALTER TABLE it_tickets ADD COLUMN working_station failed:", err.message);
          }
        });
        await client.execute("ALTER TABLE it_tickets ADD COLUMN it_intervention INTEGER DEFAULT 0").catch((err) => {
          if (!err.message.includes('duplicate column name') && !err.message.includes('already exists')) {
            console.warn("⚠️ ALTER TABLE it_tickets ADD COLUMN it_intervention failed:", err.message);
          }
        });
        console.log('✅ SQLite Schema Migration: ensured user_id, working_station, and it_intervention columns on it_tickets');
      } catch (err) {
        console.error('❌ IT Tickets column migration error:', err.message);
      }
      
      console.log('⚙️ Running custom department cleanup migration...');
      // Rename CENTRAL STORE to GENERAL STORE if it exists in the database
      await client.execute("UPDATE departments SET name = 'GENERAL STORE' WHERE name = 'CENTRAL STORE'");

      // GENERAL STORE must exist as a real department row -- several code
      // paths (Purchase Requests from Stock Manager, approveRequisition's
      // "is this a self-requisition to Procurement" check, supplier receiving)
      // look it up by name via LIKE '%General%'/'%Store%' and need a real id
      // to attach requisitions/department_stock rows to. Without it here, it
      // would get deleted by this same cleanup pass as a "non-target" dept.
      const targetDepts = ['DENTAL', 'PHYSIO', 'NURSING', 'OPERATIONS', 'LABORATORY', 'IMAGING', 'GENERAL STORE', 'DENTAL LAB', 'DENTAL CLINIC'];
      
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

    // ─── Permission Module Full Sync: ensure all modules in config exist in DB ─────────────
    try {
      const { MODULES } = require('./permissions');

      // Step 1: Upsert every module from config → DB (adds missing, updates display/actions)
      for (const mod of MODULES) {
        await client.execute({
          sql: `INSERT INTO permission_modules (name, display_name, actions)
                VALUES (?, ?, ?)
                ON CONFLICT(name) DO UPDATE
                  SET display_name = EXCLUDED.display_name,
                      actions      = EXCLUDED.actions`,
          args: [mod.name, mod.display || mod.display_name || mod.name, JSON.stringify(mod.actions)],
        });
      }
      console.log(`⚙️ Permission sync: upserted ${MODULES.length} module(s) into permission_modules.`);

      // Step 2: Delete any rows NOT in the current config (stale/removed modules like central_store)
      const validNames = MODULES.map(m => m.name);
      const placeholders = validNames.map(() => '?').join(', ');

      const { rowsAffected: modRemoved } = await client.execute({
        sql: `DELETE FROM permission_modules WHERE name NOT IN (${placeholders})`,
        args: validNames,
      });
      if (modRemoved > 0) console.log(`⚙️ Permission sync: removed ${modRemoved} stale module(s) from permission_modules.`);

      // Step 3: Purge stale rows from role_permissions too
      const { rowsAffected: permRemoved } = await client.execute({
        sql: `DELETE FROM role_permissions WHERE module NOT IN (${placeholders})`,
        args: validNames,
      });
      if (permRemoved > 0) console.log(`⚙️ Permission sync: removed ${permRemoved} stale permission row(s) from role_permissions.`);

      console.log('✅ Permission module sync complete.');
    } catch (err) {
      console.warn('⚠️ Permission module sync warning:', err.message);
    }

    // ─── Dental Roles Sync: ensure Dental HoD, Dental Tech, Dental Lab Manager roles exist ───
    try {
      const dentalRoles = [
        { name: 'dental_hod',         display_name: 'Dental HoD' },
        { name: 'dental_tech',        display_name: 'Dental Tech' },
        { name: 'dental_lab_manager', display_name: 'Dental Lab Manager' },
      ];
      for (const r of dentalRoles) {
        await client.execute({
          sql: `INSERT INTO roles (name, display_name) VALUES (?, ?) ON CONFLICT(name) DO UPDATE SET display_name = EXCLUDED.display_name`,
          args: [r.name, r.display_name],
        });
      }
      console.log('✅ Dental roles sync complete.');
    } catch (err) {
      console.warn('⚠️ Dental roles sync warning:', err.message);
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

    try {
      await client.execute("ALTER TABLE sukraa_patients ADD COLUMN ref_type TEXT");
      console.log('✅ SQLite Schema Migration: added ref_type to sukraa_patients');
    } catch (err) {
      if (!err.message.includes('duplicate column name') && !err.message.includes('already exists')) {
        console.warn('⚠️ SQLite Schema Migration Notice:', err.message);
      }
    }

    try {
      await client.execute("ALTER TABLE sukraa_patients ADD COLUMN referrer_name TEXT");
      console.log('✅ SQLite Schema Migration: added referrer_name to sukraa_patients');
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

    // FDA Generic Medications Cache Table Migration (populated separately via
    // scripts/import_fda_medications.js from the Rwanda FDA register export)
    try {
      await client.execute(`
      CREATE TABLE IF NOT EXISTS fda_medications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        generic_name TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
      await client.execute(`
      CREATE INDEX IF NOT EXISTS idx_fda_medications_generic_name ON fda_medications(generic_name)
    `);
      console.log('✅ SQLite Schema Migration: created/verified fda_medications table');
    } catch (err) {
      console.error('❌ Failed to initialize fda_medications table:', err);
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
        manually_edited INTEGER DEFAULT 1,
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
      { name: 'user_minor', type: 'TEXT' },
      // DEFAULT 1: any row already in the table is treated as an independently
      // recorded stock count and protected from being silently overwritten by
      // forward-propagation. Only rows saved going forward with an explicit
      // false get 0 (auto-carried, safe to overwrite).
      { name: 'manually_edited', type: 'INTEGER DEFAULT 1' }
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

      await client.execute("ALTER TABLE vendors ADD COLUMN category TEXT DEFAULT 'Medical'").catch((err) => {
        // ignore if already exists
      });

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
        batch_number TEXT,
        expiry_date TEXT,
        purchase_price REAL,
        quantity INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

      // Check and migrate stock_batches UNIQUE constraint if present
      try {
        const { rows: sbSchema } = await client.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='stock_batches'");
        const needsUniqueRemoval = sbSchema.length > 0 && sbSchema[0].sql.includes('batch_number TEXT UNIQUE');

        const { rows: dsSchema } = await client.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='department_stock'");
        const dsReferencesOld = dsSchema.length > 0 && dsSchema[0].sql.includes('stock_batches_old');

        const { rows: sriSchema } = await client.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='supplier_return_items'");
        const sriReferencesOld = sriSchema.length > 0 && sriSchema[0].sql.includes('stock_batches_old');

        if (needsUniqueRemoval || dsReferencesOld || sriReferencesOld) {
          console.log('⚙️ Migrating stock system tables to clean up constraints and foreign keys...');

          if (needsUniqueRemoval) {
            // 1. Rename table
            await client.execute("ALTER TABLE stock_batches RENAME TO stock_batches_old");
            // 2. Create new table without UNIQUE
            await client.execute(`
              CREATE TABLE stock_batches (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                item_id INTEGER REFERENCES master_inventory(id) ON DELETE CASCADE,
                vendor_id INTEGER REFERENCES vendors(id) ON DELETE SET NULL,
                batch_number TEXT,
                expiry_date TEXT,
                purchase_price REAL,
                quantity INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                lot_number TEXT
              )
            `);
            // 3. Copy data
            await client.execute(`
              INSERT INTO stock_batches (id, item_id, vendor_id, batch_number, expiry_date, purchase_price, quantity, created_at, lot_number)
              SELECT id, item_id, vendor_id, batch_number, expiry_date, purchase_price, quantity, created_at, lot_number FROM stock_batches_old
            `);
          }

          // Recreate department_stock if it references stock_batches_old OR if we just renamed stock_batches
          if (dsReferencesOld || needsUniqueRemoval) {
            console.log('⚙️ Recreating department_stock to point to new stock_batches...');
            await client.execute("ALTER TABLE department_stock RENAME TO department_stock_old");
            await client.execute(`
              CREATE TABLE department_stock (
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
              INSERT INTO department_stock (id, department_id, item_id, batch_id, quantity, min_stock_level)
              SELECT id, department_id, item_id, batch_id, quantity, min_stock_level FROM department_stock_old
            `);
            await client.execute("DROP TABLE department_stock_old");
          }

          // Recreate supplier_return_items if it references stock_batches_old OR if we just renamed stock_batches
          if (sriReferencesOld || needsUniqueRemoval) {
            console.log('⚙️ Recreating supplier_return_items to point to new stock_batches...');
            await client.execute("ALTER TABLE supplier_return_items RENAME TO supplier_return_items_old");
            await client.execute(`
              CREATE TABLE supplier_return_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                return_id INTEGER NOT NULL REFERENCES supplier_returns(id) ON DELETE CASCADE,
                item_id INTEGER NOT NULL REFERENCES master_inventory(id) ON DELETE RESTRICT,
                batch_id INTEGER REFERENCES stock_batches(id) ON DELETE SET NULL,
                quantity INTEGER NOT NULL,
                reason TEXT
              )
            `);
            await client.execute(`
              INSERT INTO supplier_return_items (id, return_id, item_id, batch_id, quantity, reason)
              SELECT id, return_id, item_id, batch_id, quantity, reason FROM supplier_return_items_old
            `);
            await client.execute("DROP TABLE supplier_return_items_old");
          }

          // Drop stock_batches_old if it exists
          try {
            await client.execute("DROP TABLE IF EXISTS stock_batches_old");
          } catch (e) {
            // ignore if already dropped
          }

          console.log('✅ SQLite Schema Migration: cleaned up stock tables successfully');
        }
      } catch (err) {
        console.error('❌ Failed to migrate stock tables:', err.message);
      }

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
        await client.execute("ALTER TABLE requisitions ADD COLUMN created_by INTEGER");
        console.log('✅ SQLite Schema Migration: added created_by to requisitions');
      } catch (e) { /* already exists */ }
      try {
        await client.execute("ALTER TABLE requisitions ADD COLUMN created_by_name TEXT");
        console.log('✅ SQLite Schema Migration: added created_by_name to requisitions');
      } catch (e) { /* already exists */ }
      try {
        await client.execute("ALTER TABLE stock_batches ADD COLUMN lot_number TEXT");
        console.log('✅ SQLite Schema Migration: added lot_number column to stock_batches');
      } catch (e) { /* already exists */ }

      // department_id and storage are purely descriptive/tracking metadata on
      // a batch of stock-in-hand at Central Store -- they must NEVER create or
      // modify department_stock rows. Distributed stock is exclusively the
      // echo of approveRequisition's batch allocation (see that function).
      try {
        await client.execute("ALTER TABLE stock_batches ADD COLUMN department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL");
        console.log('✅ SQLite Schema Migration: added department_id column to stock_batches');
      } catch (e) { /* already exists */ }
      try {
        await client.execute("ALTER TABLE stock_batches ADD COLUMN storage TEXT CHECK (storage IS NULL OR storage IN ('Medical', 'Non-Medical'))");
        console.log('✅ SQLite Schema Migration: added storage column to stock_batches');
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

    // ── SKU Standardisation (Clean: exactly 8 characters, no lc, no hyphens) ───────────────────────
    try {
      const { rows: skuCheck } = await client.execute(
        "SELECT COUNT(*) as total, SUM(CASE WHEN length(sku) = 8 AND sku NOT LIKE '%-%' AND sku NOT LIKE '%lc%' AND sku IS NOT NULL THEN 1 ELSE 0 END) as clean_count FROM master_inventory"
      );
      const total = Number(skuCheck[0].total);
      const cleanCount = Number(skuCheck[0].clean_count);

      if (total > 0 && cleanCount < total) {
        console.log(`🔧 Standardising SKUs to exactly 8 characters: ${total - cleanCount} items to fix…`);

        // Fetch ALL items in the master inventory to assign fresh, sequential, 8-char SKUs
        const { rows: items } = await client.execute(`
          SELECT id, name FROM master_inventory ORDER BY id ASC
        `);

        const statements = items.map((item, idx) => {
          let cleanName = (item.name || 'ITEM').toUpperCase().replace(/[^A-Z0-9]/g, '');
          // Strip leading "LC"
          cleanName = cleanName.replace(/^LC/i, '');
          if (!cleanName) cleanName = 'ITEM';
          const prefix = cleanName.substring(0, 4).padEnd(4, 'X');
          const seqStr = String(idx + 1).padStart(4, '0');
          const newSku = `${prefix}${seqStr}`;

          return {
            sql: "UPDATE master_inventory SET sku = ? WHERE id = ?",
            args: [newSku, item.id]
          };
        });

        await client.batch(statements, 'write');
        console.log(`✅ SKU standardisation complete — updated all ${items.length} items to exactly 8 characters.`);
      } else {
        console.log('✅ All SKUs already standardised to 8 characters.');
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

    // ── Consumables Consumption Log ─────────────────────────────────────────────
    // Records consumption of consumable items by department. Each entry deducts
    // from department_stock (FEFO), keeping the Stock Manager's distributed-stock
    // view in sync.
    try {
      await client.execute(`
      CREATE TABLE IF NOT EXISTS consumables_log (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        department_id   INTEGER REFERENCES departments(id) ON DELETE SET NULL,
        department_name TEXT,
        item_id         INTEGER REFERENCES master_inventory(id) ON DELETE SET NULL,
        item_name       TEXT,
        batch_id        INTEGER REFERENCES stock_batches(id) ON DELETE SET NULL,
        batch_number    TEXT,
        quantity        INTEGER NOT NULL,
        unit            TEXT,
        notes           TEXT,
        logged_by       INTEGER REFERENCES users(id) ON DELETE SET NULL,
        logged_by_name  TEXT,
        ward            TEXT,
        session         TEXT,
        consumed_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
      // Ward (e.g. Station 1 / Minor Surgery) + Session (AM/PM) — added for
      // Nursing consumption attribution; guarded ALTERs for pre-existing DBs.
      for (const col of ['ward TEXT', 'session TEXT']) {
        try { await client.execute(`ALTER TABLE consumables_log ADD COLUMN ${col}`); } catch (e) { /* already exists */ }
      }
      await client.execute('CREATE INDEX IF NOT EXISTS idx_consumables_log_dept ON consumables_log(department_id)');
      await client.execute('CREATE INDEX IF NOT EXISTS idx_consumables_log_consumed ON consumables_log(consumed_at)');
      console.log('✅ SQLite Schema Migration: created/verified consumables_log table');
    } catch (err) {
      console.error('❌ Failed to initialize consumables_log table:', err);
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

    // --- Procurement Hub Tables ---
    try {
      await client.execute(`
        CREATE TABLE IF NOT EXISTS purchase_orders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          po_number TEXT UNIQUE NOT NULL,
          vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE RESTRICT,
          created_by INTEGER REFERENCES users(id),
          created_at DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
          status TEXT NOT NULL DEFAULT 'Draft',
          total_amount REAL DEFAULT 0,
          notes TEXT
        )
      `);
      await client.execute(`
        CREATE TABLE IF NOT EXISTS purchase_order_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          po_id INTEGER NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
          item_name TEXT NOT NULL,
          sku TEXT,
          unit_of_measure TEXT,
          category TEXT,
          quantity INTEGER NOT NULL,
          unit_price REAL NOT NULL
        )
      `);
      await client.execute(`
        CREATE TABLE IF NOT EXISTS goods_receipt_notes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          grn_number TEXT UNIQUE NOT NULL,
          po_id INTEGER REFERENCES purchase_orders(id) ON DELETE SET NULL,
          vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE RESTRICT,
          received_by INTEGER REFERENCES users(id),
          received_at DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
          invoice_number TEXT,
          delivery_note_number TEXT,
          notes TEXT
        )
      `);
      await client.execute(`
        CREATE TABLE IF NOT EXISTS goods_receipt_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          grn_id INTEGER NOT NULL REFERENCES goods_receipt_notes(id) ON DELETE CASCADE,
          item_name TEXT NOT NULL,
          sku TEXT,
          unit_of_measure TEXT,
          category TEXT,
          quantity_received INTEGER NOT NULL,
          batch_number TEXT,
          expiry_date TEXT,
          purchase_price REAL NOT NULL
        )
      `);
      console.log('✅ SQLite Schema Migration: created/verified Procurement Hub tables');

      // Seed mock POs and GRNs if empty
      const { rows: poCheck } = await client.execute("SELECT COUNT(*) as cnt FROM purchase_orders");
      if (Number(poCheck[0].cnt) === 0) {
        const { rows: vendors } = await client.execute("SELECT id FROM vendors LIMIT 1");
        const vendorId = vendors.length > 0 ? vendors[0].id : 1;

        await client.execute({
          sql: "INSERT INTO purchase_orders (po_number, vendor_id, status, total_amount, notes) VALUES (?, ?, ?, ?, ?)",
          args: ['PO-2026-0001', vendorId, 'Sent to Supplier', 450000, 'Urgent stock replacement for dental department']
        });
        const { rows: newPO } = await client.execute("SELECT id FROM purchase_orders ORDER BY id DESC LIMIT 1");
        if (newPO.length > 0) {
          await client.execute({
            sql: "INSERT INTO purchase_order_items (po_id, item_name, sku, unit_of_measure, category, quantity, unit_price) VALUES (?, ?, ?, ?, ?, ?, ?)",
            args: [newPO[0].id, 'Vicryl 3/0', 'VCY-30', 'Box', 'medical_supplies', 50, 9000]
          });
        }
        console.log('🌱 Seeded initial purchase orders');
      }
      
      await client.execute(`
        CREATE TABLE IF NOT EXISTS supplier_returns (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          return_number TEXT UNIQUE NOT NULL,
          vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE RESTRICT,
          returned_by INTEGER REFERENCES users(id),
          returned_at DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
          notes TEXT
        )
      `);
      await client.execute(`
        CREATE TABLE IF NOT EXISTS supplier_return_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          return_id INTEGER NOT NULL REFERENCES supplier_returns(id) ON DELETE CASCADE,
          item_id INTEGER NOT NULL REFERENCES master_inventory(id) ON DELETE RESTRICT,
          batch_id INTEGER REFERENCES stock_batches(id) ON DELETE SET NULL,
          quantity INTEGER NOT NULL,
          reason TEXT
        )
      `);
      console.log('✅ SQLite Schema Migration: created/verified Supplier Returns tables');
    } catch (err) {
      console.error('❌ Failed to initialize Procurement tables:', err);
    }

    // ─── Procurement Hub Expansion: New Tables ────────────────────────────────
    try {
      // Vendor Documents
      await client.execute(`
        CREATE TABLE IF NOT EXISTS vendor_documents (
          id           INTEGER PRIMARY KEY AUTOINCREMENT,
          vendor_id    INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
          doc_type     TEXT NOT NULL DEFAULT 'other',
          doc_name     TEXT NOT NULL,
          file_ref     TEXT,
          issued_date  TEXT,
          expiry_date  TEXT,
          notes        TEXT,
          uploaded_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
          created_at   DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
        )
      `);
      await client.execute(`CREATE INDEX IF NOT EXISTS idx_vendor_documents_vendor ON vendor_documents(vendor_id)`);
      await client.execute(`CREATE INDEX IF NOT EXISTS idx_vendor_documents_expiry ON vendor_documents(expiry_date)`);

      // Vendor Contracts
      await client.execute(`
        CREATE TABLE IF NOT EXISTS vendor_contracts (
          id             INTEGER PRIMARY KEY AUTOINCREMENT,
          vendor_id      INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
          contract_no    TEXT,
          title          TEXT NOT NULL,
          start_date     TEXT NOT NULL,
          end_date       TEXT,
          contract_value REAL DEFAULT 0,
          currency       TEXT NOT NULL DEFAULT 'RWF',
          status         TEXT NOT NULL DEFAULT 'active',
          terms          TEXT,
          notes          TEXT,
          created_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
          created_at     DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
          updated_at     DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
        )
      `);
      await client.execute(`CREATE INDEX IF NOT EXISTS idx_vendor_contracts_vendor ON vendor_contracts(vendor_id)`);
      await client.execute(`CREATE INDEX IF NOT EXISTS idx_vendor_contracts_status ON vendor_contracts(status)`);

      // Vendor Ratings
      await client.execute(`
        CREATE TABLE IF NOT EXISTS vendor_ratings (
          id          INTEGER PRIMARY KEY AUTOINCREMENT,
          vendor_id   INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
          grn_id      INTEGER REFERENCES goods_receipt_notes(id) ON DELETE SET NULL,
          rating      INTEGER NOT NULL DEFAULT 3,
          category    TEXT NOT NULL DEFAULT 'overall',
          comment     TEXT,
          rated_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
          created_at  DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
        )
      `);
      await client.execute(`CREATE INDEX IF NOT EXISTS idx_vendor_ratings_vendor ON vendor_ratings(vendor_id)`);

      // GRN Inspection Items
      await client.execute(`
        CREATE TABLE IF NOT EXISTS grn_inspection_items (
          id               INTEGER PRIMARY KEY AUTOINCREMENT,
          grn_id           INTEGER NOT NULL REFERENCES goods_receipt_notes(id) ON DELETE CASCADE,
          grn_item_id      INTEGER REFERENCES goods_receipt_note_items(id) ON DELETE CASCADE,
          item_name        TEXT NOT NULL,
          inspection_pass  INTEGER NOT NULL DEFAULT 1,
          rejection_reason TEXT,
          inspected_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
          inspected_at     DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
        )
      `);
      await client.execute(`CREATE INDEX IF NOT EXISTS idx_grn_inspection_grn ON grn_inspection_items(grn_id)`);

      // Purchase Invoices (Accounts Payable)
      await client.execute(`
        CREATE TABLE IF NOT EXISTS purchase_invoices (
          id               INTEGER PRIMARY KEY AUTOINCREMENT,
          invoice_no       TEXT,
          po_id            INTEGER REFERENCES purchase_orders(id) ON DELETE SET NULL,
          grn_id           INTEGER REFERENCES goods_receipt_notes(id) ON DELETE SET NULL,
          vendor_id        INTEGER NOT NULL REFERENCES vendors(id) ON DELETE RESTRICT,
          invoice_date     TEXT NOT NULL,
          due_date         TEXT,
          subtotal         REAL NOT NULL DEFAULT 0,
          tax_amount       REAL NOT NULL DEFAULT 0,
          total_amount     REAL NOT NULL DEFAULT 0,
          currency         TEXT NOT NULL DEFAULT 'RWF',
          payment_terms    TEXT,
          status           TEXT NOT NULL DEFAULT 'draft',
          match_status     TEXT NOT NULL DEFAULT 'unmatched',
          notes            TEXT,
          rejection_reason TEXT,
          submitted_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
          reviewed_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
          approved_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
          paid_by          INTEGER REFERENCES users(id) ON DELETE SET NULL,
          submitted_at     DATETIME,
          reviewed_at      DATETIME,
          approved_at      DATETIME,
          paid_at          DATETIME,
          created_at       DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
          updated_at       DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
        )
      `);
      await client.execute(`CREATE INDEX IF NOT EXISTS idx_invoices_vendor ON purchase_invoices(vendor_id)`);
      await client.execute(`CREATE INDEX IF NOT EXISTS idx_invoices_po ON purchase_invoices(po_id)`);
      await client.execute(`CREATE INDEX IF NOT EXISTS idx_invoices_grn ON purchase_invoices(grn_id)`);
      await client.execute(`CREATE INDEX IF NOT EXISTS idx_invoices_status ON purchase_invoices(status)`);

      // Invoice Line Items
      await client.execute(`
        CREATE TABLE IF NOT EXISTS invoice_line_items (
          id           INTEGER PRIMARY KEY AUTOINCREMENT,
          invoice_id   INTEGER NOT NULL REFERENCES purchase_invoices(id) ON DELETE CASCADE,
          item_name    TEXT NOT NULL,
          quantity     REAL NOT NULL DEFAULT 0,
          unit_price   REAL NOT NULL DEFAULT 0,
          total_price  REAL NOT NULL DEFAULT 0,
          po_quantity  REAL,
          grn_quantity REAL
        )
      `);
      await client.execute(`CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_line_items(invoice_id)`);

      // Department Budgets
      await client.execute(`
        CREATE TABLE IF NOT EXISTS department_budgets (
          id              INTEGER PRIMARY KEY AUTOINCREMENT,
          department_id   INTEGER REFERENCES departments(id) ON DELETE CASCADE,
          department_name TEXT NOT NULL,
          period_type     TEXT NOT NULL DEFAULT 'monthly',
          period_year     INTEGER NOT NULL,
          period_month    INTEGER,
          period_quarter  INTEGER,
          budget_amount   REAL NOT NULL DEFAULT 0,
          currency        TEXT NOT NULL DEFAULT 'RWF',
          created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
          created_at      DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
          updated_at      DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
        )
      `);
      await client.execute(`CREATE INDEX IF NOT EXISTS idx_budgets_dept ON department_budgets(department_name)`);
      await client.execute(`CREATE INDEX IF NOT EXISTS idx_budgets_period ON department_budgets(period_year, period_month)`);

      // Procurement Catalog
      await client.execute(`
        CREATE TABLE IF NOT EXISTS procurement_catalog (
          id               INTEGER PRIMARY KEY AUTOINCREMENT,
          item_name        TEXT NOT NULL,
          category         TEXT NOT NULL DEFAULT 'medical_supplies',
          sku              TEXT,
          unit_of_measure  TEXT DEFAULT 'Unit',
          preferred_vendor INTEGER REFERENCES vendors(id) ON DELETE SET NULL,
          last_unit_price  REAL,
          is_active        INTEGER NOT NULL DEFAULT 1,
          notes            TEXT,
          master_item_id   INTEGER REFERENCES master_inventory(id) ON DELETE SET NULL,
          created_by       INTEGER REFERENCES users(id) ON DELETE SET NULL,
          created_at       DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
          updated_at       DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
        )
      `);
      await client.execute(`CREATE INDEX IF NOT EXISTS idx_catalog_category ON procurement_catalog(category)`);
      await client.execute(`CREATE INDEX IF NOT EXISTS idx_catalog_active ON procurement_catalog(is_active)`);

      console.log('✅ SQLite Schema Migration: created/verified Procurement Hub expansion tables (invoices, budgets, vendor docs, catalog, ratings, contracts, GRN inspection)');
    } catch (err) {
      console.error('❌ Failed to initialize Procurement Hub expansion tables:', err.message);
    }

    // --- Procurement Manager Role Setup & Permissions Sync ---
    try {
      await client.execute({
        sql: "INSERT OR IGNORE INTO roles (name, display_name) VALUES (?, ?)",
        args: ['procurement-manager', 'Procurement Manager']
      });
      console.log('✅ SQLite Schema Migration: registered procurement-manager role');

      const { ROLE_DEFAULTS } = require('./permissions');
      const pmPermissions = ROLE_DEFAULTS['procurement-manager'];
      if (pmPermissions) {
        for (const [moduleName, actions] of Object.entries(pmPermissions)) {
          for (const [action, granted] of Object.entries(actions)) {
            await client.execute({
              sql: `
                INSERT INTO role_permissions (role_name, module, action, granted, updated_by)
                VALUES (?, ?, ?, ?, 1)
                ON CONFLICT(role_name, module, action) DO UPDATE 
                SET granted = EXCLUDED.granted
              `,
              args: ['procurement-manager', moduleName, action, granted ? 1 : 0]
            }).catch(() => {});
          }
        }
        console.log('✅ SQLite Schema Migration: synced procurement-manager permissions');
      }

      // Add test user
      const bcrypt = require('bcryptjs');
      const passwordHash = await bcrypt.hash('procure123', 10);
      const { rows: pmRoles } = await client.execute({
        sql: 'SELECT id FROM roles WHERE name = ?',
        args: ['procurement-manager']
      });
      if (pmRoles.length > 0) {
        await client.execute({
          sql: `INSERT INTO users (full_name, username, email, password_hash, role_id) 
                VALUES (?, ?, ?, ?, ?) 
                ON CONFLICT (username) DO NOTHING`,
          args: ['Jean Procurement', 'procurement_jean', 'jean@legacyclinics.rw', passwordHash, pmRoles[0].id]
        });
        console.log('✅ SQLite Schema Migration: registered test Procurement Manager user (procurement_jean)');
      }
    } catch (err) {
      console.error('❌ Failed to setup procurement-manager role/permissions:', err);
    }

    // ─── Dental Cases Table Migration ─────────────────────────────────────────
    try {
      await client.execute(`
        CREATE TABLE IF NOT EXISTS dental_cases (
          id                        INTEGER PRIMARY KEY AUTOINCREMENT,
          case_ref                  TEXT NOT NULL UNIQUE,
          received_date             TEXT NOT NULL,
          required_date             TEXT NOT NULL,
          work_command_origin       TEXT,
          clinic_of_origin          TEXT,
          clinician_name            TEXT,
          patient_id                TEXT,
          work_done                 TEXT NOT NULL CHECK (work_done IN ('Acrylic Work', 'Metal & Ceramic', 'CAD-CAM', 'Other')),
          work_done_other           TEXT,
          technologist              TEXT,
          units_quantity            INTEGER NOT NULL DEFAULT 1,
          cost_per_first_unit       REAL,
          cost_per_additional_unit  REAL,
          total_cost                REAL,
          reported_by               TEXT,
          reported_by_user_id       INTEGER REFERENCES users(id) ON DELETE SET NULL,
          created_at                DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
          updated_at                DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
        )
      `);
      await client.execute('CREATE INDEX IF NOT EXISTS idx_dental_cases_received_date ON dental_cases(received_date)');
      await client.execute('CREATE INDEX IF NOT EXISTS idx_dental_cases_work_done ON dental_cases(work_done)');

      for (const col of ['status TEXT DEFAULT \'Received\'', 'delivery_notes TEXT', 'delivered_to TEXT', 'delivered_at DATETIME', 'odontogram_data TEXT']) {
        try { await client.execute(`ALTER TABLE dental_cases ADD COLUMN ${col}`); } catch (e) { /* already exists */ }
      }

      console.log('✅ SQLite Schema Migration: dental_cases table ensured with manufacturing & delivery tracking columns.');
    } catch (err) {
      if (!err.message?.includes('already exists')) {
        console.error('❌ dental_cases migration error:', err.message);
      }
    }

    // ─── Dental Worklist Table ────────────────────────────────────────────────
    try {
      await client.execute(`
        CREATE TABLE IF NOT EXISTS dental_worklist (
          id                    INTEGER PRIMARY KEY AUTOINCREMENT,
          patient_id            TEXT,
          patient_name          TEXT NOT NULL,
          appointment_type      TEXT NOT NULL,
          provider              TEXT,
          scheduled_time        TEXT,
          appointment_date      TEXT NOT NULL,
          status                TEXT NOT NULL DEFAULT 'Waiting'
                                CHECK (status IN ('Waiting','In Chair','Post-op','Discharged','No Show','Cancelled')),
          chief_complaint       TEXT,
          notes                 TEXT,
          checked_in_at         DATETIME,
          treatment_started_at  DATETIME,
          completed_at          DATETIME,
          reported_by           TEXT,
          reported_by_user_id   INTEGER REFERENCES users(id) ON DELETE SET NULL,
          created_at            DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
          updated_at            DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
        )
      `);
      await client.execute('CREATE INDEX IF NOT EXISTS idx_dental_worklist_date   ON dental_worklist(appointment_date)');
      await client.execute('CREATE INDEX IF NOT EXISTS idx_dental_worklist_status ON dental_worklist(status)');
      console.log('✅ SQLite Schema Migration: dental_worklist table ensured.');
    } catch (err) {
      if (!err.message?.includes('already exists')) {
        console.error('❌ dental_worklist migration error:', err.message);
      }
    }

    // ─── Dental Charts Table ──────────────────────────────────────────────────
    try {
      await client.execute(`
        CREATE TABLE IF NOT EXISTS dental_charts (
          id                  INTEGER PRIMARY KEY AUTOINCREMENT,
          patient_id          TEXT NOT NULL,
          patient_name        TEXT,
          chart_date          TEXT NOT NULL,
          tooth_data          TEXT NOT NULL DEFAULT '{}',
          general_notes       TEXT,
          provider            TEXT,
          created_by          TEXT,
          created_by_user_id  INTEGER REFERENCES users(id) ON DELETE SET NULL,
          created_at          DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
          updated_at          DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
          UNIQUE(patient_id, chart_date)
        )
      `);
      await client.execute('CREATE INDEX IF NOT EXISTS idx_dental_charts_patient ON dental_charts(patient_id)');
      console.log('✅ SQLite Schema Migration: dental_charts table ensured.');
    } catch (err) {
      if (!err.message?.includes('already exists')) {
        console.error('❌ dental_charts migration error:', err.message);
      }
    }

    // ─── Dental Appointments Table ────────────────────────────────────────────
    try {
      await client.execute(`
        CREATE TABLE IF NOT EXISTS dental_appointments (
          id                   INTEGER PRIMARY KEY AUTOINCREMENT,
          patient_id           TEXT,
          patient_name         TEXT NOT NULL,
          appointment_type     TEXT NOT NULL,
          provider             TEXT,
          appointment_date     TEXT NOT NULL,
          start_time           TEXT NOT NULL,
          end_time             TEXT,
          status               TEXT NOT NULL DEFAULT 'Scheduled'
                                CHECK (status IN ('Scheduled','Confirmed','Checked-In','Completed','Cancelled','No-Show')),
          chief_complaint      TEXT,
          notes                TEXT,
          worklist_id          INTEGER REFERENCES dental_worklist(id) ON DELETE SET NULL,
          created_by           TEXT,
          created_by_user_id   INTEGER REFERENCES users(id) ON DELETE SET NULL,
          created_at           DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
          updated_at           DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
        )
      `);
      await client.execute('CREATE INDEX IF NOT EXISTS idx_dental_appt_date     ON dental_appointments(appointment_date)');
      await client.execute('CREATE INDEX IF NOT EXISTS idx_dental_appt_provider ON dental_appointments(provider, appointment_date)');
      await client.execute('CREATE INDEX IF NOT EXISTS idx_dental_appt_status   ON dental_appointments(status)');
      console.log('✅ SQLite Schema Migration: dental_appointments table ensured.');
    } catch (err) {
      if (!err.message?.includes('already exists')) {
        console.error('❌ dental_appointments migration error:', err.message);
      }
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

