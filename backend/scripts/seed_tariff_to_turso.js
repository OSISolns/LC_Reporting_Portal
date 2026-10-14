'use strict';
/**
 * Rwanda Health Services Tariff Seeder for Turso Cloud
 * Seeds all 3,481 services/procedures to Turso database using batched operations.
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { createClient } = require('@libsql/client');
const fs = require('fs');
const { spawnSync } = require('child_process');

const tursoUrl = process.env.lcreporting_TURSO_DATABASE_URL || process.env.TURSO_DATABASE_URL;
const tursoToken = process.env.lcreporting_TURSO_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN;

if (!tursoUrl || !tursoToken) {
  console.error('❌ Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN in backend/.env');
  process.exit(1);
}

const turso = createClient({
  url: tursoUrl,
  authToken: tursoToken,
});

async function main() {
  console.log('🚀 Connecting to Turso Cloud at:', tursoUrl);
  const testRes = await turso.execute('SELECT 1 as connected');
  if (!testRes.rows || testRes.rows.length === 0) {
    throw new Error('Could not connect to Turso Cloud');
  }
  console.log('✅ Connected to Turso Cloud successfully.');

  // 1. Ensure sales_service_catalog table and columns exist in Turso
  console.log('📦 Verifying table schemas on Turso...');
  await turso.execute(`
    CREATE TABLE IF NOT EXISTS sales_service_catalog (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      code          TEXT UNIQUE,
      name          TEXT NOT NULL,
      department    TEXT DEFAULT 'General',
      default_price REAL NOT NULL DEFAULT 0,
      is_active     INTEGER NOT NULL DEFAULT 1,
      created_at    DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      ichi_code     TEXT,
      price_polyclinic REAL DEFAULT 0,
      price_hospital   REAL DEFAULT 0,
      price_general    REAL DEFAULT 0,
      price_rama       REAL DEFAULT 0,
      price_foreigner  REAL DEFAULT 0
    )
  `);
  await turso.execute(`CREATE INDEX IF NOT EXISTS idx_sales_cat_name ON sales_service_catalog(name)`);
  await turso.execute(`CREATE INDEX IF NOT EXISTS idx_sales_cat_dept ON sales_service_catalog(department)`);
  await turso.execute(`CREATE INDEX IF NOT EXISTS idx_sales_cat_code ON sales_service_catalog(code)`);

  // Ensure proforma_invoices exists on Turso as well
  await turso.execute(`
    CREATE TABLE IF NOT EXISTS proforma_invoices (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number    TEXT UNIQUE NOT NULL,
      invoice_date      TEXT NOT NULL,
      due_date          TEXT DEFAULT 'N/A',
      customer_id       TEXT,
      customer_name     TEXT NOT NULL,
      customer_email    TEXT,
      customer_phone    TEXT,
      customer_tin      TEXT,
      customer_address  TEXT,
      items_json        TEXT NOT NULL DEFAULT '[]',
      subtotal          REAL NOT NULL DEFAULT 0,
      taxable_amount    REAL DEFAULT 0,
      tax_due           REAL DEFAULT 0,
      other_fees        REAL DEFAULT 0,
      total_amount      REAL NOT NULL DEFAULT 0,
      currency          TEXT NOT NULL DEFAULT 'RWF',
      terms_details     TEXT,
      bank_details      TEXT,
      momo_details      TEXT,
      prepared_by_title TEXT DEFAULT 'Sales Manager',
      prepared_by_name  TEXT,
      contact_person    TEXT DEFAULT 'Sofia, 0787363970, E-mail: sofia@legacyclinics.rw',
      notes             TEXT,
      status            TEXT NOT NULL DEFAULT 'Draft',
      created_by        INTEGER,
      created_at        DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      updated_at        DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    )
  `);
  await turso.execute(`CREATE INDEX IF NOT EXISTS idx_proforma_inv_num ON proforma_invoices(invoice_number)`);
  await turso.execute(`CREATE INDEX IF NOT EXISTS idx_proforma_status ON proforma_invoices(status)`);
  await turso.execute(`CREATE INDEX IF NOT EXISTS idx_proforma_date ON proforma_invoices(invoice_date)`);
  console.log('✅ Tables and indexes ready on Turso.');

  // 2. Read all catalog items from local SQLite
  const localDbPath = path.resolve(__dirname, '../database/database.sqlite');
  console.log('📖 Reading existing curated items from local SQLite:', localDbPath);

  const localClient = createClient({ url: `file:${localDbPath}` });
  const localRes = await localClient.execute(`
    SELECT code, name, department, default_price, is_active, ichi_code, 
           price_polyclinic, price_hospital, price_general, price_rama, price_foreigner 
    FROM sales_service_catalog
  `);
  const localItems = localRes.rows || [];

  console.log(`📊 Found ${localItems.length} catalog items in local database.`);

  // 3. If Excel exists, parse it to ensure the most complete and fresh prices
  const excelPath = '/home/noble/Downloads/Final Tariff Tables - Private.xlsx';
  let excelMap = new Map();
  if (fs.existsSync(excelPath)) {
    console.log('📑 Re-extracting from official tariff Excel workbook to ensure complete coverage...');
    const pyScript = `
import openpyxl, json
wb = openpyxl.load_workbook('${excelPath}', data_only=True)
ws_priv = wb['Private Insurances']
ws_rama = wb['RAMA']
ws_row = wb['Rest of the World']

priv_rows = list(ws_priv.iter_rows(values_only=True))[3:]
rama_rows = list(ws_rama.iter_rows(values_only=True))[3:]
row_rows = list(ws_row.iter_rows(values_only=True))[3:]

rama_dict = {}
for r in rama_rows:
    if r[0]:
        code = str(r[0]).strip()
        rama_dict[code] = {
            'pri': round(float(r[4] or 0)),
            'sec': round(float(r[5] or 0)),
            'ter': round(float(r[6] or 0))
        }

row_dict = {}
for r in row_rows:
    if r[0]:
        code = str(r[0]).strip()
        row_dict[code] = {
            'gen': round(float(r[4] or 0)),
            'poly': round(float(r[5] or 0)),
            'hosp': round(float(r[6] or 0))
        }

items = []
for r in priv_rows:
    if not r[0] or not str(r[0]).strip():
        continue
    code = str(r[0]).strip()
    dept = str(r[1] or 'General').strip()
    ichi = str(r[2] or '').strip() if r[2] else None
    name = str(r[3] or '').strip()
    
    gen_p = round(float(r[4] or 0))
    poly_p = round(float(r[5] or 0))
    hosp_p = round(float(r[6] or 0))
    
    r_item = rama_dict.get(code, {})
    rama_p = r_item.get('sec') or r_item.get('ter') or r_item.get('pri') or 0
    
    row_item = row_dict.get(code, {})
    foreign_p = row_item.get('poly') or row_item.get('hosp') or row_item.get('gen') or 0
    
    default_p = poly_p if poly_p > 0 else (hosp_p if hosp_p > 0 else (gen_p if gen_p > 0 else (rama_p if rama_p > 0 else 0)))
    
    items.append({
        'code': code,
        'department': dept,
        'ichi_code': ichi,
        'name': name,
        'price_general': gen_p,
        'price_polyclinic': poly_p,
        'price_hospital': hosp_p,
        'price_rama': rama_p,
        'price_foreigner': foreign_p,
        'default_price': default_p
    })

print(json.dumps(items))
`;
    const pyRes = spawnSync('python3', ['-c', pyScript], { maxBuffer: 100 * 1024 * 1024 });
    if (!pyRes.error && pyRes.status === 0) {
      const parsed = JSON.parse(pyRes.stdout.toString());
      console.log(`✅ Loaded ${parsed.length} official procedures from Excel.`);
      for (const item of parsed) {
        excelMap.set(item.code, item);
      }
    }
  }

  // Merge items: local database items + excel items
  const finalItemsMap = new Map();
  for (const item of localItems) {
    finalItemsMap.set(item.code, { ...item });
  }
  for (const [code, item] of excelMap.entries()) {
    if (finalItemsMap.has(code)) {
      const existing = finalItemsMap.get(code);
      finalItemsMap.set(code, {
        ...existing,
        ...item,
        is_active: 1
      });
    } else {
      finalItemsMap.set(code, {
        ...item,
        is_active: 1
      });
    }
  }

  const allItemsToSeed = Array.from(finalItemsMap.values());
  console.log(`📦 Ready to seed a total of ${allItemsToSeed.length} items to Turso Cloud.`);

  // Helper with retry logic
  async function executeBatchWithRetry(statements, retries = 5) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        await turso.batch(statements, 'write');
        return;
      } catch (err) {
        if (attempt === retries) throw err;
        await new Promise(r => setTimeout(r, attempt * 400));
      }
    }
  }

  // 4. Batch insert into Turso in chunks of 40
  const BATCH_SIZE = 40;
  let processed = 0;
  const startTime = Date.now();

  for (let i = 0; i < allItemsToSeed.length; i += BATCH_SIZE) {
    const chunk = allItemsToSeed.slice(i, i + BATCH_SIZE);
    const statements = chunk.map(item => ({
      sql: `
        INSERT INTO sales_service_catalog 
        (code, name, department, default_price, is_active, ichi_code, price_polyclinic, price_hospital, price_general, price_rama, price_foreigner)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(code) DO UPDATE SET
          name = EXCLUDED.name,
          department = EXCLUDED.department,
          default_price = EXCLUDED.default_price,
          is_active = EXCLUDED.is_active,
          ichi_code = EXCLUDED.ichi_code,
          price_polyclinic = EXCLUDED.price_polyclinic,
          price_hospital = EXCLUDED.price_hospital,
          price_general = EXCLUDED.price_general,
          price_rama = EXCLUDED.price_rama,
          price_foreigner = EXCLUDED.price_foreigner
      `,
      args: [
        item.code,
        item.name,
        item.department || 'General',
        item.default_price || 0,
        item.is_active !== undefined ? item.is_active : 1,
        item.ichi_code || null,
        item.price_polyclinic || 0,
        item.price_hospital || 0,
        item.price_general || 0,
        item.price_rama || 0,
        item.price_foreigner || 0
      ]
    }));

    await executeBatchWithRetry(statements);
    processed += chunk.length;
    process.stdout.write(`\r⏳ Seeded ${processed} / ${allItemsToSeed.length} items to Turso...`);
    await new Promise(r => setTimeout(r, 60));
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n✅ Successfully seeded ${processed} items to Turso Cloud in ${duration}s!`);

  // 5. Verify count on Turso
  const countRes = await turso.execute('SELECT COUNT(*) as cnt FROM sales_service_catalog');
  const countTiered = await turso.execute('SELECT COUNT(*) as cnt FROM sales_service_catalog WHERE price_polyclinic > 0');
  const totalCount = countRes.rows?.[0]?.cnt || 0;
  const totalTiered = countTiered.rows?.[0]?.cnt || 0;

  console.log('\n═══════════════════════════════════════════');
  console.log(`🎉 TURSO CLOUD SEEDING COMPLETE!`);
  console.log(`• Total active catalog services in Turso: ${totalCount}`);
  console.log(`• Total items with tiered insurance tariffs: ${totalTiered}`);
  console.log('═══════════════════════════════════════════\n');

  process.exit(0);
}

main().catch(err => {
  console.error('\n💥 Seeding failed:', err);
  process.exit(1);
});
