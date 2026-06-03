const fs = require('fs');
const xlsx = require('xlsx');
const db = require('../src/config/db.js');

const directoryPath = '/home/noble/Downloads/STOCK_LC';

async function importStockData() {
  console.log('Starting stock data import...');

  try {
    const files = fs.readdirSync(directoryPath).filter(file => file.endsWith('.xls') || file.endsWith('.xlsx'));
    let totalItemsAdded = 0;
    
    // Helper to generate SKU based on category and index
    const categoryIndexes = {};
    const generateSKU = (categoryName) => {
      const prefix = categoryName.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
      if (!categoryIndexes[prefix]) {
        categoryIndexes[prefix] = 1;
      }
      const sku = `SKU-${prefix}-${String(categoryIndexes[prefix]).padStart(4, '0')}`;
      categoryIndexes[prefix]++;
      return sku;
    };

    for (const file of files) {
      console.log(`Processing file: ${file}`);
      const wb = xlsx.readFile(`${directoryPath}/${file}`);
      const sheetName = wb.SheetNames[0];
      const sheet = wb.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });

      let descriptionColIndex = -1;
      let startRow = 0;

      // Find the header row by looking for 'DESCRIPTION' or 'DESCRP'
      for (let i = 0; i < data.length; i++) {
        if (!data[i]) continue;
        const row = data[i];
        for (let j = 0; j < row.length; j++) {
          if (typeof row[j] === 'string' && (row[j].toUpperCase().includes('DESCRIPTION') || row[j].toUpperCase().includes('DESCRP'))) {
            descriptionColIndex = j;
            startRow = i + 1;
            break;
          }
        }
        if (descriptionColIndex !== -1) break;
      }

      if (descriptionColIndex === -1) {
        console.warn(`Could not find a DESCRIPTION column in file: ${file}. Skipping.`);
        continue;
      }

      const category = file.replace('Copy of ', '').replace('.xls', '').replace('.xlsx', '').trim();
      let addedInFile = 0;

      for (let i = startRow; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length === 0) continue;

        let itemName = row[descriptionColIndex];
        if (!itemName || typeof itemName !== 'string') continue;
        
        itemName = itemName.trim();
        if (itemName === '') continue;

        const sku = generateSKU(category);
        const unit_of_measure = 'Piece';

        try {
          const sql = `
            INSERT INTO master_inventory (name, sku, unit_of_measure, category) 
            VALUES ($1, $2, $3, $4) 
            ON CONFLICT(name) DO NOTHING
          `;
          const params = [itemName, sku, unit_of_measure, category];
          const result = await db.query(sql, params);
          if (result.rowCount && result.rowCount > 0) {
            addedInFile++;
            totalItemsAdded++;
          }
        } catch (err) {
          console.error(`Error inserting item: ${itemName}`, err);
        }
      }
      
      console.log(`Successfully added ${addedInFile} new items from ${file}.`);
    }

    console.log(`\nImport complete! Total new items added to master_inventory: ${totalItemsAdded}`);
    process.exit(0);

  } catch (error) {
    console.error('Error during import:', error);
    process.exit(1);
  }
}

importStockData();
