#!/usr/bin/env node
'use strict';

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const migrations = [
  'feedbacks_migration.sql',
  'hsfp_migration.sql',
  'hsfp_rca_migration.sql',
  'notifications_migration.sql',
  'nursing_inventory_migration.sql',
  'refund_migration.sql',
  'results_transfer_migration.sql',
  'shift_module_migration.sql',
  'sukraa_patients_migration.sql'
];

// SQLite-compatible overrides for PostgreSQL/non-standard syntax migrations
const SQL_OVERRIDES = {
  'hsfp_migration.sql': [
    `ALTER TABLE incident_reports ADD COLUMN approved_by INTEGER REFERENCES users(id)`,
    `ALTER TABLE incident_reports ADD COLUMN approved_at DATETIME`,
    `ALTER TABLE incident_reports ADD COLUMN hsfp_comments TEXT`,
    `INSERT INTO roles (name, display_name) VALUES ('hsfp', 'Health & Safety Focal Person') ON CONFLICT (name) DO NOTHING`
  ],
  'notifications_migration.sql': [
    `CREATE TABLE IF NOT EXISTS notifications (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title       TEXT NOT NULL,
      message     TEXT NOT NULL,
      type        TEXT,
      link        TEXT,
      is_read     INTEGER DEFAULT 0,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read)`,
    `CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC)`
  ],
  'results_transfer_migration.sql': [
    `INSERT INTO roles (name, display_name) VALUES ('lab_team_lead', 'Laboratory Team Lead') ON CONFLICT (name) DO NOTHING`,
    `CREATE TABLE IF NOT EXISTS results_transfers (
      id                       INTEGER PRIMARY KEY AUTOINCREMENT,
      transfer_date            TEXT NOT NULL,
      old_sid                  TEXT NOT NULL,
      new_sid                  TEXT NOT NULL,
      reason                   TEXT NOT NULL,
      edited_by_name           TEXT,
      status                   TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'approved', 'rejected')),
      rejection_comment        TEXT,
      created_by               INTEGER REFERENCES users(id) ON DELETE SET NULL,
      reviewed_by              INTEGER REFERENCES users(id) ON DELETE SET NULL,
      approved_by              INTEGER REFERENCES users(id) ON DELETE SET NULL,
      rejected_by              INTEGER REFERENCES users(id) ON DELETE SET NULL,
      is_mock                  INTEGER DEFAULT 0,
      created_at               DATETIME DEFAULT CURRENT_TIMESTAMP,
      reviewed_at              DATETIME,
      approved_at              DATETIME,
      rejected_at              DATETIME,
      updated_at               DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS idx_res_trans_status ON results_transfers(status)`,
    `CREATE INDEX IF NOT EXISTS idx_res_trans_old_sid ON results_transfers(old_sid)`,
    `CREATE INDEX IF NOT EXISTS idx_res_trans_new_sid ON results_transfers(new_sid)`,
    `CREATE INDEX IF NOT EXISTS idx_res_trans_created_at ON results_transfers(created_at DESC)`
  ]
};

async function main() {
  console.log('Starting execution of all SQL migrations...');
  
  for (const filename of migrations) {
    console.log(`\n📄 Running migration: ${filename}`);
    
    try {
      let statements = [];
      if (SQL_OVERRIDES[filename]) {
        statements = SQL_OVERRIDES[filename];
      } else {
        const filePath = path.resolve(__dirname, '../../database', filename);
        const sqlContent = fs.readFileSync(filePath, 'utf8');
        
        let cleanedSql = sqlContent
          .replace(/--.*$/gm, '') 
          .replace(/\/\*[\s\S]*?\*\//g, ''); 
          
        statements = cleanedSql
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0);
      }
        
      for (const stmt of statements) {
        const snippet = stmt.substring(0, 60).replace(/\n/g, ' ') + (stmt.length > 60 ? '...' : '');
        console.log(`  ⚡ Executing: ${snippet}`);
        try {
          await db.execute(stmt);
        } catch (execErr) {
          // If we add a column that already exists, swallow the error
          if (execErr.message.includes('duplicate column name')) {
            console.log(`  ℹ️ Column already exists, skipping.`);
          } else {
            throw execErr;
          }
        }
      }
      
      console.log(`✅ Completed: ${filename}`);
    } catch (err) {
      console.error(`❌ Migration failed for file ${filename}:`, err.message);
    }
  }
  
  console.log('\n🎉 All specified migrations executed!');
  process.exit(0);
}

main();
