'use strict';
/**
 * migrate_provider_specializations.js
 * ─────────────────────────────────────────────────────────────────────────────
 * One-time migration that:
 *   1. Creates the `specializations` table
 *   2. Seeds it from the existing distinct `specialization` TEXT values on
 *      the `providers` table
 *   3. Adds `specialization_id` INTEGER FK column to `providers`
 *   4. Populates `specialization_id` by matching the existing text value
 *   5. Drops `department_id` from `providers` (SQLite-safe table rebuild)
 *
 * Safe to re-run: each step is idempotent.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });
const { createClient } = require('@libsql/client');

const tursoUrl       = process.env.PROD_TURSO_DATABASE_URL || process.env.TURSO_DATABASE_URL;
const tursoAuthToken = process.env.PROD_TURSO_AUTH_TOKEN   || process.env.TURSO_AUTH_TOKEN;

if (!tursoUrl || !tursoAuthToken) {
  console.error('❌ TURSO_DATABASE_URL / TURSO_AUTH_TOKEN not set.');
  process.exit(1);
}

const client = createClient({ url: tursoUrl, authToken: tursoAuthToken });

async function run() {
  console.log('🔌 Connected to Turso Cloud.');

  // ── STEP 1: Create specializations table ────────────────────────────────────
  await client.execute(`
    CREATE TABLE IF NOT EXISTS specializations (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL UNIQUE,
      created_at  DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    )
  `);
  console.log('✅ Step 1: specializations table created (or already exists).');

  // ── STEP 2: Seed specializations from existing provider text values ──────────
  const { rows: specRows } = await client.execute(`
    SELECT DISTINCT specialization
    FROM providers
    WHERE specialization IS NOT NULL AND specialization != ''
    ORDER BY specialization ASC
  `);

  for (const row of specRows) {
    await client.execute({
      sql:  `INSERT INTO specializations (name) VALUES (?) ON CONFLICT(name) DO NOTHING`,
      args: [row.specialization],
    });
  }

  const { rows: allSpecs } = await client.execute(`SELECT id, name FROM specializations ORDER BY id`);
  console.log(`✅ Step 2: ${allSpecs.length} specializations seeded:`);
  allSpecs.forEach(s => console.log(`   [${s.id}] ${s.name}`));

  // ── STEP 3: Add specialization_id column to providers ────────────────────────
  await client.execute(
    `ALTER TABLE providers ADD COLUMN specialization_id INTEGER REFERENCES specializations(id) ON DELETE SET NULL`
  ).catch(err => {
    if (err.message.includes('duplicate column name') || err.message.includes('already exists')) {
      console.log('ℹ️  Step 3: specialization_id column already exists — skipping ALTER.');
    } else {
      throw err;
    }
  });
  console.log('✅ Step 3: specialization_id column added to providers.');

  // ── STEP 4: Populate specialization_id by matching text value ────────────────
  const specMap = allSpecs.reduce((acc, s) => { acc[s.name] = s.id; return acc; }, {});

  const { rows: providers } = await client.execute(
    `SELECT id, specialization FROM providers WHERE specialization IS NOT NULL AND specialization != ''`
  );

  let updated = 0;
  for (const p of providers) {
    const specId = specMap[p.specialization];
    if (specId) {
      await client.execute({
        sql:  `UPDATE providers SET specialization_id = ? WHERE id = ?`,
        args: [specId, p.id],
      });
      updated++;
    }
  }
  console.log(`✅ Step 4: ${updated} providers linked to specialization_id.`);

  // ── STEP 5: Rebuild providers table without department_id ────────────────────
  // Check if department_id still exists
  const { rows: provColInfo } = await client.execute(`PRAGMA table_info(providers)`);
  const hasDeptId = provColInfo.some(c => c.name === 'department_id');

  if (!hasDeptId) {
    console.log('ℹ️  Step 5: department_id already removed from providers — skipping table rebuild.');
  } else {
    console.log('⚙️  Step 5: Rebuilding providers table to drop department_id...');

    // Create new table without department_id
    await client.execute(`
      CREATE TABLE IF NOT EXISTS providers_new (
        id                INTEGER PRIMARY KEY AUTOINCREMENT,
        name              TEXT    NOT NULL,
        title             TEXT,
        specialization_id INTEGER REFERENCES specializations(id) ON DELETE SET NULL,
        specialization    TEXT,
        is_active         INTEGER DEFAULT 1
      )
    `);

    // Copy data
    await client.execute(`
      INSERT INTO providers_new (id, name, title, specialization_id, specialization, is_active)
      SELECT id, name, title, specialization_id, specialization, is_active
      FROM providers
    `);

    // Swap tables
    await client.execute(`DROP TABLE providers`);
    await client.execute(`ALTER TABLE providers_new RENAME TO providers`);

    // Recreate indexes
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_providers_spec_id ON providers(specialization_id)`);
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_providers_active   ON providers(is_active)`);

    console.log('✅ Step 5: providers table rebuilt — department_id removed, specialization_id FK in place.');
  }

  // ── Final verification ────────────────────────────────────────────────────────
  const { rows: final } = await client.execute(`
    SELECT p.id, p.name, p.specialization, p.specialization_id, s.name AS spec_name, p.is_active
    FROM providers p
    LEFT JOIN specializations s ON p.specialization_id = s.id
    ORDER BY p.id
  `);

  console.log('\n📋 Final provider state:');
  for (const p of final) {
    const linked = p.specialization_id ? `spec_id=${p.specialization_id} (${p.spec_name})` : '⚠️  NO spec_id';
    console.log(`  [${p.id}] ${p.name} | ${linked}`);
  }

  const unlinked = final.filter(p => !p.specialization_id);
  if (unlinked.length > 0) {
    console.warn(`\n⚠️  ${unlinked.length} provider(s) have no specialization_id — check their specialization text.`);
  }

  console.log('\n🎉 Migration complete.');
  process.exit(0);
}

run().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
