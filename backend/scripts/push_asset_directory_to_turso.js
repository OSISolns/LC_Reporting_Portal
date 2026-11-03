'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const path = require('path');
const { execSync } = require('child_process');
const { createClient } = require('@libsql/client');

async function pushAssetDirectoryToTurso() {
  console.log('🚀 Connecting to Turso...');

  const tursoUrl = process.env.lcreporting_TURSO_DATABASE_URL || process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.lcreporting_TURSO_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN;

  if (!tursoUrl) {
    throw new Error('TURSO_DATABASE_URL is not set in environment.');
  }

  const turso = createClient({
    url: tursoUrl,
    authToken: tursoToken
  });

  const sqlitePath = path.join(__dirname, '../database/database.sqlite');
  console.log('📖 Reading IT Asset Directory from local SQLite...');
  const jsonStr = execSync(`sqlite3 -json "${sqlitePath}" "SELECT * FROM it_assets ORDER BY id ASC;"`, {
    encoding: 'utf8',
    maxBuffer: 50 * 1024 * 1024
  });

  const localAssets = JSON.parse(jsonStr || '[]');
  console.log(`📦 Loaded ${localAssets.length} assets from local SQLite database.`);

  if (localAssets.length === 0) {
    console.warn('⚠️ No assets found in local SQLite database.');
    return;
  }

  // 1. Ensure it_assets table structure in Turso
  await turso.execute(`
    CREATE TABLE IF NOT EXISTS it_assets (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      asset_tag       TEXT UNIQUE NOT NULL,
      name            TEXT NOT NULL,
      assigned_to     TEXT,
      department      TEXT,
      status          TEXT DEFAULT 'Active',
      asset_type      TEXT,
      serial_number   TEXT,
      model           TEXT,
      manufacturer    TEXT,
      location        TEXT,
      purchase_date   TEXT,
      warranty_expiry TEXT,
      created_at      TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    )
  `);

  // Ensure extra columns in Turso if missing
  const extraCols = [
    { name: 'asset_type', type: 'TEXT' },
    { name: 'serial_number', type: 'TEXT' },
    { name: 'model', type: 'TEXT' },
    { name: 'manufacturer', type: 'TEXT' },
    { name: 'location', type: 'TEXT' },
    { name: 'purchase_date', type: 'TEXT' },
    { name: 'warranty_expiry', type: 'TEXT' },
    { name: 'created_at', type: "TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))" }
  ];

  for (const col of extraCols) {
    try {
      await turso.execute(`ALTER TABLE it_assets ADD COLUMN ${col.name} ${col.type}`);
    } catch (_) {
      // Column may already exist
    }
  }

  // 2. Batch push to Turso in chunks
  const CHUNK_SIZE = 50;

  for (let i = 0; i < localAssets.length; i += CHUNK_SIZE) {
    const chunk = localAssets.slice(i, i + CHUNK_SIZE);
    const statements = chunk.map(a => ({
      sql: `
        INSERT INTO it_assets (
          asset_tag, name, assigned_to, department, status,
          asset_type, serial_number, model, manufacturer, location,
          purchase_date, warranty_expiry
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (asset_tag) DO UPDATE SET
          name = EXCLUDED.name,
          assigned_to = EXCLUDED.assigned_to,
          department = EXCLUDED.department,
          status = EXCLUDED.status,
          asset_type = EXCLUDED.asset_type,
          serial_number = EXCLUDED.serial_number,
          model = EXCLUDED.model,
          manufacturer = EXCLUDED.manufacturer,
          location = EXCLUDED.location,
          purchase_date = EXCLUDED.purchase_date,
          warranty_expiry = EXCLUDED.warranty_expiry
      `,
      args: [
        a.asset_tag,
        a.name,
        a.assigned_to || null,
        a.department || 'GENERAL',
        a.status || 'Active',
        a.asset_type || null,
        a.serial_number || null,
        a.model || null,
        a.manufacturer || null,
        a.location || null,
        a.purchase_date || null,
        a.warranty_expiry || null
      ]
    }));

    await turso.batch(statements);
    console.log(`  ⏳ Synced ${Math.min(i + CHUNK_SIZE, localAssets.length)} / ${localAssets.length} assets to Turso...`);
  }

  // 3. Verify Turso count
  const verifyRes = await turso.execute('SELECT COUNT(*) as cnt FROM it_assets');
  console.log(`\n✅ Asset Directory successfully pushed to Turso!`);
  console.log(`📊 Total IT Assets now live in Turso: ${verifyRes.rows[0].cnt}`);
}

pushAssetDirectoryToTurso()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Failed to push Asset Directory to Turso:', err);
    process.exit(1);
  });
