const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });
const db = require('../backend/src/config/db');

// Helper to auto-generate SKU Prefix based on item name consonants
const generateSkuPrefix = (name) => {
  const VOWELS = new Set(['A','E','I','O','U']);
  const words = (name || 'ITM').toUpperCase().trim().split(/\s+/);
  let code = '';
  for (const word of words) {
    if (!word) continue;
    code += word[0]; // always take first letter
    const lastChar = word[word.length - 1];
    // if word is longer than 4 chars and ends in a consonant, append the last letter too
    if (word.length > 4 && !VOWELS.has(lastChar)) {
      code += lastChar;
    }
  }
  return code || 'ITM';
};

const KNOWN_SUPPLIERS = [
  "Best stationary", "Trust Computer", "Trust C", "LA PROVIDINA", "BENEKIGALI", 
  "HECTA", "MITDASH", "CROWN", "VIEBEG", "Kemah", "DUPHAR", "SUN", "FROM INDIA", 
  "Soft packaging ltd", "M.GAKB TRADING Co", "Deluxe trading C.LTD", "DETEX", 
  "GIMEK", "MUNYAKAZI.A", "AKAGERA B. GROUP", "BM AZMARINO", "Gusto fresh ltd", 
  "XIMI VOGUE", "PAPETERIE HECTA", "-"
].sort((a, b) => b.length - a.length);

async function run() {
  try {
    console.log('🔄 Starting import of non-medical stock into Operations department...');

    // 1. Ensure "Operations" department exists
    const deptName = 'Operations';
    const { rows: deptRows } = await db.query("SELECT id FROM departments WHERE name = $1", [deptName]);
    let departmentId;
    if (deptRows.length > 0) {
      departmentId = deptRows[0].id;
      console.log(`📍 Found existing Operations department (ID: ${departmentId})`);
    } else {
      const { rows: newDept } = await db.query("INSERT INTO departments (name) VALUES ($1) RETURNING id", [deptName]);
      departmentId = newDept[0].id;
      console.log(`🆕 Created Operations department (ID: ${departmentId})`);
    }

    // 2. Read Classified_Inventory_Data.txt
    const filePath = path.join(__dirname, '../Classified_Inventory_Data.txt');
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split(/\r?\n/);

    // 3. Find the [NON-MEDICAL ...] section
    let inNonMedicalSection = false;
    let currentCategory = 'stationery';
    let itemsToProcess = [];

    for (let line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      if (trimmed.includes('[NON-MEDICAL')) {
        inNonMedicalSection = true;
        continue;
      }

      // If we hit any other main section, stop
      if (inNonMedicalSection && trimmed.startsWith('[') && !trimmed.includes('[NON-MEDICAL')) {
        break;
      }

      if (!inNonMedicalSection) continue;

      // Track current subcategory based on source comment
      if (trimmed.includes('OFFICE STATIONARIES.csv')) {
        currentCategory = 'stationery';
        continue;
      }
      if (trimmed.includes('HOUSEKEEPING.csv')) {
        currentCategory = 'medical_supplies'; // group housekeeping under medical_supplies in UI
        continue;
      }
      if (trimmed.includes('CAFETERIAT.csv')) {
        currentCategory = 'medical_supplies'; // group cafeteria under medical_supplies in UI
        continue;
      }

      // Skip headers and signatures
      if (
        trimmed.includes('PREPARED BY') || 
        trimmed.includes('DESCRIPTION') || 
        trimmed.includes('Source:') || 
        trimmed.startsWith('---') || 
        trimmed.startsWith('===') ||
        trimmed.includes('30/4/2026')
      ) {
        continue;
      }

      // Trailing 7 values regex: Price, StoreQty, PurchasedQty, TotalQty, DistributedQty, BalanceQty, TotalValue
      const trailingNumbersRegex = /([0-9\.-]+)\s+([0-9\.-]+)\s+([0-9\.-]+)\s+([0-9\.-]+)\s+([0-9\.-]+)\s+([0-9\.-]+)\s+([0-9\.-]+)$/;
      const match = trimmed.match(trailingNumbersRegex);

      if (!match) continue;

      const prefix = trimmed.replace(trailingNumbersRegex, '').trim();
      const priceVal = match[1] === '-' ? 0 : parseFloat(match[1]);
      const balanceVal = match[6] === '-' ? 0 : parseFloat(match[6]);

      // Split prefix into description and supplier
      let description = prefix;
      let supplierName = 'Unknown Vendor';

      for (const supplier of KNOWN_SUPPLIERS) {
        if (prefix.endsWith(supplier)) {
          supplierName = supplier;
          description = prefix.substring(0, prefix.length - supplier.length).trim();
          break;
        }
      }

      if (supplierName === '-') supplierName = 'Unknown Vendor';

      itemsToProcess.push({
        name: description,
        category: currentCategory,
        supplier: supplierName,
        price: priceVal,
        quantity: balanceVal
      });
    }

    console.log(`Parsed ${itemsToProcess.length} items to insert/update.`);

    // 4. Insert items into database
    for (const item of itemsToProcess) {
      // Find or create Vendor
      let vendorId = null;
      if (item.supplier !== 'Unknown Vendor') {
        const { rows: vendorRows } = await db.query("SELECT id FROM vendors WHERE name = $1", [item.supplier]);
        if (vendorRows.length > 0) {
          vendorId = vendorRows[0].id;
        } else {
          const { rows: newVendor } = await db.query("INSERT INTO vendors (name) VALUES ($1) RETURNING id", [item.supplier]);
          vendorId = newVendor[0].id;
        }
      }

      // Find or create Master Inventory item
      const { rows: existingItems } = await db.query("SELECT id, sku FROM master_inventory WHERE name = $1", [item.name]);
      let itemId;
      let skuPrefix;

      if (existingItems.length > 0) {
        itemId = existingItems[0].id;
        skuPrefix = existingItems[0].sku;
      } else {
        skuPrefix = generateSkuPrefix(item.name);
        const { rows: newItem } = await db.query(
          "INSERT INTO master_inventory (name, sku, unit_of_measure, category) VALUES ($1, $2, $3, $4) RETURNING id",
          [item.name, skuPrefix, 'pc', item.category]
        );
        itemId = newItem[0].id;
      }

      // Check if a batch already exists for this item in Operations
      // We can count batches to assign lot number
      const { rows: batchCount } = await db.query(
        "SELECT COUNT(*) as cnt FROM stock_batches WHERE item_id = $1",
        [itemId]
      );
      const nextLotInt = (Number(batchCount[0]?.cnt) || 0) + 1;
      const lotNumber = String(nextLotInt).padStart(2, '0');

      // Insert into stock_batches
      const { rows: batchRows } = await db.query(
        "INSERT INTO stock_batches (item_id, vendor_id, batch_number, lot_number, purchase_price, quantity) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
        [itemId, vendorId, `BATCH-OP-${lotNumber}`, lotNumber, item.price, item.quantity]
      );
      const batchId = batchRows[0].id;

      // Link to Operations department stock
      await db.query(
        "INSERT OR REPLACE INTO department_stock (department_id, item_id, batch_id, quantity) VALUES ($1, $2, $3, $4)",
        [departmentId, itemId, batchId, item.quantity]
      );
    }

    console.log('✅ Stock updated successfully for all Operations department items!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to update stock:', error);
    process.exit(1);
  }
}

run();
