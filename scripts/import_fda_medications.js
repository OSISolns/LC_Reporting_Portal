'use strict';
/**
 * One-time import of the Rwanda FDA generic medications register into the
 * local fda_medications cache table, used to power medication-name
 * autocomplete on the E-Prescription form.
 *
 * Usage: node scripts/import_fda_medications.js [path-to-xlsx]
 * Defaults to /home/noble/FDA_LIST/RwandaFDA_Full_Generic_Medications.xlsx
 */
const path = require('path');
const backendNodeModules = path.join(__dirname, '..', 'backend', 'node_modules');
require(path.join(backendNodeModules, 'dotenv')).config({ path: path.join(__dirname, '..', 'backend', '.env') });
const XLSX = require(path.join(backendNodeModules, 'xlsx'));
const db = require(path.join(__dirname, '..', 'backend', 'src', 'config', 'db'));

const filePath = process.argv[2] || '/home/noble/FDA_LIST/RwandaFDA_Full_Generic_Medications.xlsx';

async function main() {
  console.log(`📄 Reading ${filePath}...`);
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet); // [{ SN, 'Generic Name' }, ...]

  const names = Array.from(new Set(
    rows
      .map(r => (r['Generic Name'] || '').toString().trim())
      .filter(Boolean)
  ));

  console.log(`📦 ${rows.length} rows read, ${names.length} unique generic names.`);

  // db.js kicks off its schema migrations as a fire-and-forget async IIFE on
  // require() -- it isn't awaited, so the fda_medications table may not exist
  // yet the instant this script starts. Poll until it does (or time out).
  const waitForTable = async (name, timeoutMs = 20000) => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const { rows } = await db.query(`SELECT name FROM sqlite_master WHERE type='table' AND name = ?`, [name]);
      if (rows.length > 0) return;
      await new Promise(r => setTimeout(r, 300));
    }
    throw new Error(`Timed out waiting for table "${name}" to be created by startup migrations.`);
  };
  await waitForTable('fda_medications');

  const CHUNK = 100;
  let inserted = 0;
  for (let i = 0; i < names.length; i += CHUNK) {
    const chunk = names.slice(i, i + CHUNK);
    const stmts = chunk.map(name => ({
      sql: `INSERT INTO fda_medications (generic_name) VALUES (?) ON CONFLICT(generic_name) DO NOTHING`,
      args: [name],
    }));
    await db.batch(stmts);
    inserted += chunk.length;
    process.stdout.write(`\r   ${inserted}/${names.length} processed...`);
  }
  console.log('\n');

  const { rows: countRows } = await db.query('SELECT COUNT(*) as cnt FROM fda_medications');
  console.log(`✅ fda_medications now has ${countRows[0].cnt} cached generic names.`);
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Import failed:', err);
    process.exit(1);
  });
