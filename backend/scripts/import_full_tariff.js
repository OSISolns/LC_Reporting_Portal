'use strict';
/**
 * Complete Rwanda Health Services Tariff Importer (2025-2027)
 * Imports all 3,198 procedures across 44 specialties from the official tariff tables.
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const path = require('path');
const fs = require('fs');
const db = require('../src/config/db');
const { spawnSync } = require('child_process');

async function main() {
  console.log('🚀 Starting Complete Rwanda Health Services Tariff Import...');

  const excelPath = '/home/noble/Downloads/Final Tariff Tables - Private.xlsx';
  if (!fs.existsSync(excelPath)) {
    console.error('Tariff Excel file not found at:', excelPath);
    process.exit(1);
  }

  // 1. Ensure required columns exist on sales_service_catalog
  const client = db;
  const columnsToAdd = [
    { name: 'ichi_code', type: 'TEXT' },
    { name: 'price_polyclinic', type: 'REAL DEFAULT 0' },
    { name: 'price_hospital', type: 'REAL DEFAULT 0' },
    { name: 'price_general', type: 'REAL DEFAULT 0' },
    { name: 'price_rama', type: 'REAL DEFAULT 0' },
    { name: 'price_foreigner', type: 'REAL DEFAULT 0' }
  ];

  for (const col of columnsToAdd) {
    try {
      await client.query(`ALTER TABLE sales_service_catalog ADD COLUMN ${col.name} ${col.type}`);
      console.log(`+ Added column ${col.name} to sales_service_catalog`);
    } catch (e) {
      // Column may already exist
    }
  }

  // 2. Run Python helper to extract data cleanly as JSON
  console.log('⏳ Extracting tariff data from Excel sheets...');
  const pyScript = `
import openpyxl, json, math

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
  if (pyRes.error || pyRes.status !== 0) {
    console.error('Python extraction failed:', pyRes.stderr?.toString());
    process.exit(1);
  }

  const items = JSON.parse(pyRes.stdout.toString());
  console.log(`✅ Extracted ${items.length} tariff procedure records.`);

  // 3. Batch insert / upsert into SQLite
  let inserted = 0;
  let updated = 0;

  console.log('⏳ Syncing into database...');
  for (let i = 0; i < items.length; i += 100) {
    const batch = items.slice(i, i + 100);
    for (const item of batch) {
      try {
        const exist = await client.query('SELECT id FROM sales_service_catalog WHERE code = $1', [item.code]);
        if (exist.rows && exist.rows.length > 0) {
          await client.query(
            `UPDATE sales_service_catalog 
             SET name = $1, department = $2, ichi_code = $3, 
                 price_general = $4, price_polyclinic = $5, price_hospital = $6, 
                 price_rama = $7, price_foreigner = $8, default_price = $9, is_active = 1
             WHERE code = $10`,
            [
              item.name, item.department, item.ichi_code,
              item.price_general, item.price_polyclinic, item.price_hospital,
              item.price_rama, item.price_foreigner, item.default_price,
              item.code
            ]
          );
          updated++;
        } else {
          await client.query(
            `INSERT INTO sales_service_catalog 
             (code, name, department, ichi_code, price_general, price_polyclinic, price_hospital, price_rama, price_foreigner, default_price, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 1)`,
            [
              item.code, item.name, item.department, item.ichi_code,
              item.price_general, item.price_polyclinic, item.price_hospital,
              item.price_rama, item.price_foreigner, item.default_price
            ]
          );
          inserted++;
        }
      } catch (err) {
        console.error(`Failed ${item.code}:`, err.message);
      }
    }
  }

  const total = await client.query('SELECT COUNT(*) as cnt FROM sales_service_catalog WHERE is_active = 1');
  console.log(`\n🎉 Tariff Import Completed!`);
  console.log(`Inserted: ${inserted} | Updated: ${updated}`);
  console.log(`Total Active Catalog Items: ${total.rows?.[0]?.cnt || 0}`);
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error in tariff import:', err);
  process.exit(1);
});
