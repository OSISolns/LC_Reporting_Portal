'use strict';
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const db = require('../src/config/db');

async function migrate() {
  console.log('🚀 Running imaging_archives and imaging_shares migrations...');

  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS imaging_archives (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        study_id INTEGER,
        accession_number TEXT,
        patient_id TEXT NOT NULL,
        patient_name TEXT NOT NULL,
        modality TEXT NOT NULL,
        body_region TEXT,
        series_name TEXT,
        slice_index INTEGER DEFAULT 1,
        file_name TEXT NOT NULL,
        file_type TEXT,
        file_size_bytes INTEGER DEFAULT 0,
        file_base64 TEXT NOT NULL,
        thumbnail_base64 TEXT,
        clinical_notes TEXT,
        metadata_json TEXT,
        uploaded_by INTEGER,
        uploaded_by_name TEXT,
        created_at DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
        updated_at DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
        FOREIGN KEY (study_id) REFERENCES imaging_studies(id),
        FOREIGN KEY (uploaded_by) REFERENCES users(id)
      )
    `);
    console.log('  ✅ imaging_archives table verified/created.');

    await db.query(`
      CREATE TABLE IF NOT EXISTS imaging_shares (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        study_id INTEGER,
        archive_id INTEGER,
        patient_id TEXT NOT NULL,
        patient_name TEXT NOT NULL,
        modality TEXT NOT NULL,
        provider_id INTEGER,
        provider_name TEXT NOT NULL,
        provider_email TEXT,
        shared_by_user_id INTEGER,
        shared_by_name TEXT,
        share_token TEXT UNIQUE NOT NULL,
        urgency TEXT DEFAULT 'routine',
        clinical_indication TEXT,
        consultation_notes TEXT,
        can_view_images INTEGER DEFAULT 1,
        can_view_report INTEGER DEFAULT 1,
        can_download INTEGER DEFAULT 1,
        status TEXT DEFAULT 'shared',
        view_count INTEGER DEFAULT 0,
        last_viewed_at DATETIME,
        expires_at DATETIME,
        created_at DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
        FOREIGN KEY (study_id) REFERENCES imaging_studies(id),
        FOREIGN KEY (archive_id) REFERENCES imaging_archives(id),
        FOREIGN KEY (shared_by_user_id) REFERENCES users(id)
      )
    `);
    console.log('  ✅ imaging_shares table verified/created.');

    // Also apply directly to Turso if configured
    const tursoUrl = process.env.lcreporting_TURSO_DATABASE_URL || process.env.TURSO_DATABASE_URL;
    const tursoToken = process.env.lcreporting_TURSO_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN;

    if (tursoUrl && tursoToken) {
      const { createClient } = require('@libsql/client');
      const tursoClient = createClient({ url: tursoUrl, authToken: tursoToken });
      
      console.log('🌐 Applying tables to Turso Cloud...');
      await tursoClient.execute(`
        CREATE TABLE IF NOT EXISTS imaging_archives (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          study_id INTEGER,
          accession_number TEXT,
          patient_id TEXT NOT NULL,
          patient_name TEXT NOT NULL,
          modality TEXT NOT NULL,
          body_region TEXT,
          series_name TEXT,
          slice_index INTEGER DEFAULT 1,
          file_name TEXT NOT NULL,
          file_type TEXT,
          file_size_bytes INTEGER DEFAULT 0,
          file_base64 TEXT NOT NULL,
          thumbnail_base64 TEXT,
          clinical_notes TEXT,
          metadata_json TEXT,
          uploaded_by INTEGER,
          uploaded_by_name TEXT,
          created_at DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
          updated_at DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
        )
      `);

      await tursoClient.execute(`
        CREATE TABLE IF NOT EXISTS imaging_shares (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          study_id INTEGER,
          archive_id INTEGER,
          patient_id TEXT NOT NULL,
          patient_name TEXT NOT NULL,
          modality TEXT NOT NULL,
          provider_id INTEGER,
          provider_name TEXT NOT NULL,
          provider_email TEXT,
          shared_by_user_id INTEGER,
          shared_by_name TEXT,
          share_token TEXT UNIQUE NOT NULL,
          urgency TEXT DEFAULT 'routine',
          clinical_indication TEXT,
          consultation_notes TEXT,
          can_view_images INTEGER DEFAULT 1,
          can_view_report INTEGER DEFAULT 1,
          can_download INTEGER DEFAULT 1,
          status TEXT DEFAULT 'shared',
          view_count INTEGER DEFAULT 0,
          last_viewed_at DATETIME,
          expires_at DATETIME,
          created_at DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
        )
      `);
      console.log('  ✅ Turso Cloud tables verified/created.');
    }

    console.log('🎉 All imaging migrations completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

migrate();
