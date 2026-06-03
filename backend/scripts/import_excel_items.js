'use strict';
require('dotenv').config({ path: '../.env' });
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const { createClient } = require('@libsql/client');

const client = createClient({
  url: 'file:./local.db',
});

const DOWNLOADS_DIR = '/home/noble/Downloads/STOCK_LC';

async function importExcelItems() {
  try {
    const files = fs.readdirSync(DOWNLOADS_DIR).filter(f => f.endsWith('.xls') || f.endsWith('.xlsx'));
    console.log(`Found ${files.length} Excel files.`);

    const uniqueItems = new Map();

    for (const file of files) {
      console.log(`Processing: ${file}`);
      const filePath = path.join(DOWNLOADS_DIR, file);
      const wb = xlsx.readFile(filePath);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = xlsx.utils.sheet_to_json(ws);

      let foundHeader = false;
      let descKey = null;

      for (const row of rows) {
        // Find header
        if (!foundHeader) {
          for (const key of Object.keys(row)) {
            if (typeof row[key] === 'string' && row[key].trim().toUpperCase() === 'DESCRIPTION') {
              foundHeader = true;
              descKey = key;
              break;
            }
          }
          continue;
        }

        // Process item row
        if (foundHeader && descKey && row[descKey]) {
          const itemName = row[descKey].toString().trim();
          if (itemName && itemName.toLowerCase() !== 'description' && itemName.toLowerCase() !== 'total') {
            
            // Infer category from filename
            let category = 'General';
            const lowerFile = file.toLowerCase();
            if (lowerFile.includes('dental')) category = 'Dental';
            else if (lowerFile.includes('imaging')) category = 'Imaging';
            else if (lowerFile.includes('labo')) category = 'Laboratory';
            else if (lowerFile.includes('nursing')) category = 'Nursing';
            else if (lowerFile.includes('pharmacy')) category = 'Pharmacy';

            if (!uniqueItems.has(itemName)) {
              uniqueItems.set(itemName, { name: itemName, category });
            }
          }
        }
      }
    }

    console.log(`Extracted ${uniqueItems.size} unique items.`);

    let inserted = 0;
    for (const item of uniqueItems.values()) {
      try {
        await client.execute({
          sql: `INSERT INTO master_inventory (name, sku, unit_of_measure, category) 
                VALUES (?, ?, ?, ?)
                ON CONFLICT(name) DO UPDATE SET category=excluded.category`,
          args: [item.name, '', 'Piece', item.category]
        });
        inserted++;
      } catch (err) {
        console.error(`Error inserting ${item.name}:`, err.message);
      }
    }

    console.log(`✅ Successfully imported/updated ${inserted} items into master_inventory.`);

  } catch (err) {
    console.error('❌ Failed:', err);
  } finally {
    client.close();
  }
}

importExcelItems();
