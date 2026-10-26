'use strict';
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const db = require('../src/config/db');

async function migrate() {
  console.log('🚀 Running imaging_archives category & folder_path migration...');

  const addColumnSafe = async (table, colDef) => {
    try {
      await db.query(`ALTER TABLE ${table} ADD COLUMN ${colDef}`);
      console.log(`  ✅ Added column: ${colDef}`);
    } catch (err) {
      if (err.message && (err.message.includes('duplicate column') || err.message.includes('already exists'))) {
        console.log(`  ℹ️ Column already exists: ${colDef.split(' ')[0]}`);
      } else {
        console.warn(`  ⚠️ Note for ${colDef.split(' ')[0]}:`, err.message);
      }
    }
  };

  await addColumnSafe('imaging_archives', "category TEXT DEFAULT 'General Clinical'");
  await addColumnSafe('imaging_archives', "folder_path TEXT");

  // Create indices
  await db.query(`CREATE INDEX IF NOT EXISTS idx_imaging_archives_category ON imaging_archives(category)`).catch(() => {});
  await db.query(`CREATE INDEX IF NOT EXISTS idx_imaging_archives_folder ON imaging_archives(folder_path)`).catch(() => {});

  // Update existing archives if category is null
  await db.query(`
    UPDATE imaging_archives
    SET category = CASE 
      WHEN UPPER(modality) IN ('OPG', 'CBCT', 'CEPHALOGRAM') OR LOWER(coalesce(body_region,'')) LIKE '%dental%' OR LOWER(coalesce(body_region,'')) LIKE '%teeth%' OR LOWER(coalesce(body_region,'')) LIKE '%jaw%' OR LOWER(coalesce(body_region,'')) LIKE '%arch%' THEN 'Dental & Maxillofacial'
      WHEN LOWER(coalesce(body_region,'')) LIKE '%brain%' OR LOWER(coalesce(body_region,'')) LIKE '%head%' OR LOWER(coalesce(body_region,'')) LIKE '%skull%' OR LOWER(coalesce(body_region,'')) LIKE '%neuro%' THEN 'Neuroradiology & Head/Neck'
      WHEN LOWER(coalesce(body_region,'')) LIKE '%spine%' OR LOWER(coalesce(body_region,'')) LIKE '%knee%' OR LOWER(coalesce(body_region,'')) LIKE '%joint%' OR LOWER(coalesce(body_region,'')) LIKE '%shoulder%' OR LOWER(coalesce(body_region,'')) LIKE '%bone%' THEN 'Spine & Musculoskeletal'
      WHEN LOWER(coalesce(body_region,'')) LIKE '%chest%' OR LOWER(coalesce(body_region,'')) LIKE '%lung%' OR LOWER(coalesce(body_region,'')) LIKE '%thorax%' THEN 'Thoracic & Pulmonary'
      WHEN UPPER(modality) = 'MAMMOGRAPHY' OR LOWER(coalesce(body_region,'')) LIKE '%breast%' OR LOWER(coalesce(body_region,'')) LIKE '%fetal%' THEN 'Women''s Health & Breast'
      WHEN LOWER(coalesce(body_region,'')) LIKE '%abdomen%' OR LOWER(coalesce(body_region,'')) LIKE '%pelvis%' OR LOWER(coalesce(body_region,'')) LIKE '%liver%' OR LOWER(coalesce(body_region,'')) LIKE '%kidney%' THEN 'Abdomen & Pelvis'
      WHEN LOWER(coalesce(body_region,'')) LIKE '%cardio%' OR LOWER(coalesce(body_region,'')) LIKE '%heart%' OR LOWER(coalesce(body_region,'')) LIKE '%vascular%' THEN 'Cardiovascular & Vascular'
      ELSE 'General Clinical'
    END
    WHERE category IS NULL OR category = ''
  `).catch(() => {});

  // Also apply to Turso Cloud if credentials configured
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;
  if (tursoUrl && tursoToken) {
    try {
      console.log('🌐 Applying category and folder_path columns to Turso Cloud...');
      const { createClient } = require('@libsql/client');
      const tursoClient = createClient({ url: tursoUrl, authToken: tursoToken });

      await tursoClient.execute(`ALTER TABLE imaging_archives ADD COLUMN category TEXT DEFAULT 'General Clinical'`).catch(() => {});
      await tursoClient.execute(`ALTER TABLE imaging_archives ADD COLUMN folder_path TEXT`).catch(() => {});
      await tursoClient.execute(`CREATE INDEX IF NOT EXISTS idx_imaging_archives_category ON imaging_archives(category)`).catch(() => {});
      await tursoClient.execute(`CREATE INDEX IF NOT EXISTS idx_imaging_archives_folder ON imaging_archives(folder_path)`).catch(() => {});
      console.log('  ✅ Turso Cloud columns ensured.');
    } catch (tursoErr) {
      console.warn('  ⚠️ Turso cloud migration note:', tursoErr.message);
    }
  }

  console.log('🎉 Category and Folder migration complete!');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
