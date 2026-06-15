const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });
const db = require('../src/config/db');

// Helper to auto-generate SKU Prefix based on item name consonants
const generateSkuPrefix = (name) => {
  const VOWELS = new Set(['A','E','I','O','U']);
  const words = (name || 'ITM').toUpperCase().trim().replace(/[^A-Z0-9\s]/g, '').split(/\s+/);
  let code = '';
  for (const word of words) {
    if (!word) continue;
    code += word[0]; // always take first letter
    const lastChar = word[word.length - 1];
    // if word is longer than 4 chars and ends in a consonant, append the last letter too
    if (word.length > 4 && !VOWELS.has(lastChar) && /[A-Z]/.test(lastChar)) {
      code += lastChar;
    }
  }
  return code || 'ITM';
};

const supplierNames = [
  "Best stationary", "Trust Computer", "Trust C", "LA PROVIDINA", "BENEKIGALI", 
  "HECTA", "MITDASH", "CROWN", "VIEBEG", "Kemah", "DUPHAR", "SUN", "FROM INDIA", 
  "Soft packaging ltd", "M.GAKB TRADING Co", "Deluxe trading C.LTD", "DETEX", 
  "GIMEK", "MUNYAKAZI.A", "AKAGERA B. GROUP", "BM AZMARINO", "Gusto fresh ltd", 
  "XIMI VOGUE", "PAPETERIE HECTA", "ABACUS", "SANA", "LEMEDICALE", "Le medicale",
  "FIDELIS", "UBUMWE", "MNR", "Sahara", "Labokits", "Impact pharmacy", "PYRAMID", 
  "VIDAPHARMA", "SOFTLINE", "Soft line", "Rugero Med Ltd", "MIPD", "mediasol", 
  "KIPHARMA", "Kipharma", "King s medical", "KING'S MEDICAL", "kings'medical",
  "LE MEDICALE", "SOLIS", "D H A", "CHRIS PHARMA", "PLANET", "SOCIETE NOUVELLE",
  "HARMONY", "D.H.A", "PHARMACOSE", "SOCIETE", "Africhem", "Rafeef", "kemah", "RENE PHAR"
];

// Sort suppliers by length descending
const sortedSuppliers = [...new Set(supplierNames.map(s => s.trim().toLowerCase()))].sort((a,b) => b.length - a.length);

// Helper to split array into chunks
const chunkArray = (array, size) => {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
};

async function run() {
  try {
    console.log('🔄 Preparing database for complete classified import...');

    // 1. Ensure all system departments exist and retrieve their IDs
    const deptsToEnsure = ['DENTAL', 'PHYSIO', 'NURSING', 'OPERATIONS', 'LABORATORY', 'IMAGING', 'GLOBAL'];
    const deptIds = {};
    for (const d of deptsToEnsure) {
      await db.query("INSERT OR IGNORE INTO departments (name) VALUES ($1)", [d]);
      const { rows } = await db.query("SELECT id FROM departments WHERE name = $1", [d]);
      deptIds[d] = rows[0].id;
    }
    console.log('📍 Departments registered:', JSON.stringify(deptIds));

    // 2. Clear existing inventory tables (department_stock, stock_batches, master_inventory, and vendors to prevent duplicate/stale records)
    console.log('🧹 Clearing old stock tables...');
    await db.query("DELETE FROM department_stock");
    await db.query("DELETE FROM stock_batches");
    await db.query("DELETE FROM master_inventory");
    await db.query("DELETE FROM vendors");
    console.log('✅ SQLite tables cleared successfully.');

    // 3. Read Classified_Inventory_Data.txt
    const filePath = path.join(__dirname, '../../Classified_Inventory_Data.txt');
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split(/\r?\n/);

    const trailingNumbersRegex = /([0-9\.-]+)\s+([0-9\.-]+)\s+([0-9\.-]+)\s+([0-9\.-]+)\s+([0-9\.-]+)\s+([0-9\.-]+)\s+([0-9\.-]+)(?:\s+(.*))?$/;

    let currentSection = '';
    let currentCategory = 'medical_supplies';
    let currentDept = '';
    let parsedItems = [];

    for (let line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Detect sections and switch context
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        currentSection = trimmed;
        if (currentSection === '[DENTAL]') {
          currentDept = 'DENTAL';
          currentCategory = 'medical_supplies';
        } else if (currentSection === '[IMAGING]') {
          currentDept = 'IMAGING';
          currentCategory = 'medical_supplies';
        } else if (currentSection === '[LABORATORY & BIOCHEMISTRY]') {
          currentDept = 'LABORATORY';
          currentCategory = 'medical_supplies';
        } else if (currentSection === '[NURSING]') {
          currentDept = 'NURSING';
          currentCategory = 'medications';
        } else if (currentSection.includes('[NON-MEDICAL')) {
          currentDept = 'OPERATIONS';
          currentCategory = 'stationery'; // will refine based on source comment below
        }
        continue;
      }

      if (!currentDept) continue;

      // Track subcategory for non-medical items based on source csv
      if (currentDept === 'OPERATIONS') {
        if (trimmed.includes('OFFICE STATIONARIES.csv')) {
          currentCategory = 'stationery';
          continue;
        }
        if (trimmed.includes('HOUSEKEEPING.csv') || trimmed.includes('CAFETERIAT.csv')) {
          currentCategory = 'medical_supplies';
          continue;
        }
      }

      // Skip header lines
      if (
        trimmed.includes('DESCRIPTION') || 
        trimmed.includes('Source:') || 
        trimmed.startsWith('---') || 
        trimmed.startsWith('===') ||
        trimmed.includes('TOTAL') ||
        trimmed.includes('Total') ||
        trimmed.includes('PREPARED BY') ||
        trimmed.includes('Prepared by') ||
        trimmed.includes('On 30/4/') ||
        trimmed.includes('30/4/2026') ||
        trimmed.includes('31/3/')
      ) {
        continue;
      }

      const match = trimmed.match(trailingNumbersRegex);
      if (!match) continue;

      let prefix = trimmed.replace(trailingNumbersRegex, '').trim();

      // If the line is mostly empty or separator, skip it
      if (prefix === '-' || prefix === '' || prefix === '.' || prefix === 'N°') continue;

      // Strip index number (like "1.0", "11.0", "111.0" or just "-") at the beginning
      const indexMatch = prefix.match(/^([0-9\.-]+)\s+/);
      if (indexMatch) {
        prefix = prefix.substring(indexMatch[0].length).trim();
      }

      if (prefix === '-' || prefix === '' || prefix === '.') continue;

      // Find supplier
      let supplierName = 'Unknown Vendor';
      let description = prefix;
      for (const s of sortedSuppliers) {
        if (prefix.toLowerCase().endsWith(s)) {
          supplierName = s;
          description = prefix.substring(0, prefix.length - s.length).trim();
          break;
        }
      }

      // Clean trailing hyphens or separators from description
      if (description.endsWith('-')) {
        description = description.substring(0, description.length - 1).trim();
      }

      description = description.trim();
      if (!description) continue;

      const priceVal = match[1] === '-' ? 0 : parseFloat(match[1]);
      const balanceVal = match[6] === '-' ? 0 : parseFloat(match[6]);
      const rawExpiry = (match[8] && match[8].trim() !== '-') ? match[8].trim() : null;

      parsedItems.push({
        name: description,
        department: currentDept,
        category: currentCategory,
        supplier: supplierName,
        price: priceVal,
        quantity: balanceVal,
        expiry: rawExpiry
      });
    }

    console.log(`📝 Total successfully parsed items: ${parsedItems.length}`);

    // Collect and insert all unique vendors in one batch
    const uniqueVendors = Array.from(new Set(parsedItems.map(item => item.supplier).filter(s => s !== 'Unknown Vendor')));
    console.log(`🏢 Inserting ${uniqueVendors.length} unique vendors...`);
    const vendorInserts = uniqueVendors.map(name => ({
      sql: "INSERT OR IGNORE INTO vendors (name) VALUES ($1)",
      args: [name]
    }));
    const vendorInsertChunks = chunkArray(vendorInserts, 100);
    for (const chunk of vendorInsertChunks) {
      await db.batch(chunk);
    }

    // Retrieve all vendors to build mapping
    const { rows: vendorRows } = await db.query("SELECT id, name FROM vendors");
    const vendorMap = {};
    for (const row of vendorRows) {
      vendorMap[row.name.toLowerCase()] = row.id;
    }

    // Collect and insert all unique items in one batch
    // We group by item name, taking the category of the first occurrence
    const itemMapTemp = {};
    for (const item of parsedItems) {
      const lowerName = item.name.toLowerCase();
      if (!itemMapTemp[lowerName]) {
        itemMapTemp[lowerName] = {
          name: item.name,
          category: item.category
        };
      }
    }
    const uniqueItems = Object.values(itemMapTemp);
    console.log(`📦 Inserting ${uniqueItems.length} unique master inventory items...`);
    const itemInserts = uniqueItems.map(item => ({
      sql: "INSERT OR IGNORE INTO master_inventory (name, sku, unit_of_measure, category) VALUES ($1, $2, $3, $4)",
      args: [item.name, generateSkuPrefix(item.name), 'pc', item.category]
    }));
    const itemInsertChunks = chunkArray(itemInserts, 100);
    for (const chunk of itemInsertChunks) {
      await db.batch(chunk);
    }

    // Retrieve all master items to build mapping
    const { rows: itemRows } = await db.query("SELECT id, name FROM master_inventory");
    const itemMap = {};
    for (const row of itemRows) {
      itemMap[row.name.toLowerCase()] = row.id;
    }

    // Generate batch & department stock inserts
    console.log('⚡ Inserting stock batches and department stock linkages...');
    const stockStatements = [];
    const itemBatchCount = {};
    let nextBatchId = 1;

    for (const item of parsedItems) {
      const itemId = itemMap[item.name.toLowerCase()];
      const vendorId = vendorMap[item.supplier.toLowerCase()] || null;
      const currentBatchId = nextBatchId++;

      // Sequential lot number per item in memory
      const currentLot = (itemBatchCount[itemId] || 0) + 1;
      itemBatchCount[itemId] = currentLot;
      const lotNumber = String(currentLot).padStart(2, '0');

      // Insert stock batch statement
      stockStatements.push({
        sql: "INSERT INTO stock_batches (id, item_id, vendor_id, batch_number, lot_number, expiry_date, purchase_price, quantity) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
        args: [currentBatchId, itemId, vendorId, null, lotNumber, item.expiry, item.price, item.quantity]
      });

      // Link to department stock statement
      const deptId = deptIds[item.department];
      stockStatements.push({
        sql: "INSERT OR REPLACE INTO department_stock (department_id, item_id, batch_id, quantity) VALUES ($1, $2, $3, $4)",
        args: [deptId, itemId, currentBatchId, item.quantity]
      });
    }

    // Run statements in transaction chunks of 100 statements (50 items) each
    const stockChunks = chunkArray(stockStatements, 100);
    let chunkIndex = 1;
    for (const chunk of stockChunks) {
      await db.batch(chunk);
      chunkIndex++;
    }

    console.log(`✅ Successfully loaded ${parsedItems.length} items into their respective departments!`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to import classified department inventory:', error);
    process.exit(1);
  }
}

run();
