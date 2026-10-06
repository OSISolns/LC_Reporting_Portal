'use strict';
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { createClient } = require('@libsql/client');

const tursoUrl = process.env.TURSO_DATABASE_URL;
const tursoToken = process.env.TURSO_AUTH_TOKEN;

if (!tursoUrl || !tursoToken) {
  console.error('❌ Turso credentials missing in .env!');
  process.exit(1);
}

const turso = createClient({
  url: tursoUrl,
  authToken: tursoToken,
});

async function updateTursoSchema() {
  console.log(`🔌 Connecting to Turso Cloud DB: ${tursoUrl}...`);
  
  const statements = [
    "ALTER TABLE cancellation_requests ADD COLUMN supporting_document_base64 TEXT",
    "ALTER TABLE cancellation_requests ADD COLUMN supporting_document_name TEXT",
    "ALTER TABLE cancellation_requests ADD COLUMN supporting_document_uploaded_at DATETIME",
    "ALTER TABLE cancellation_requests ADD COLUMN supporting_document_uploader_id INTEGER",
    "ALTER TABLE refund_requests ADD COLUMN supporting_document_base64 TEXT",
    "ALTER TABLE refund_requests ADD COLUMN supporting_document_name TEXT",
    "ALTER TABLE refund_requests ADD COLUMN supporting_document_uploaded_at DATETIME",
    "ALTER TABLE refund_requests ADD COLUMN supporting_document_uploader_id INTEGER"
  ];

  for (const sql of statements) {
    try {
      await turso.execute(sql);
      console.log(`✅ Executed: ${sql}`);
    } catch (err) {
      if (err.message && (err.message.includes('duplicate column name') || err.message.includes('already exists'))) {
        console.log(`ℹ️ Column already exists: ${sql.split(' ').pop()}`);
      } else {
        console.warn(`⚠️ Warning executing statement [${sql}]:`, err.message);
      }
    }
  }

  console.log('🎉 Turso Cloud Database Schema Migration completed successfully!');
  process.exit(0);
}

updateTursoSchema().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
