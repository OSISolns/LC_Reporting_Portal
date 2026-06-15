const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const db = require('../src/config/db');

// French-English translation map for matching
const frenchToEnglish = {
  'gants': 'gloves',
  'gants propre': 'gloves clean',
  'eau oxygénée': 'hydrogen peroxide',
  'eau oxygénée 3%': 'hydrogen peroxide 3%',
  'sonde vésicale': 'vesical probe / foley catheter',
  'seringue': 'syringe',
  'masque': 'mask',
  'sac à urine': 'urine bag',
  'bande': 'bandage / tape',
  'trousse': 'kit / case'
};

// Hardcoded manual matches where string matching is not enough
const manualMatches = {
  'normal saline': 'NORMAL SALINE',
  'ringer lactate': 'RINGER  LACTATE',
  'diclofenac inj 75mg': 'DICLOFENAC INJ 75MG',
  'iv cannula catheter g24': 'IV CANNULA CATHETER G24',
  'iv cannula catheter g22': 'IV CANNULA CATHETER G22',
  'iv cannula catheter g20': 'IV CANNULA CATHETER G20',
  'ceftriaxone inj 1g': 'CEFTRIAXONE INJ .1g',
  'pause inj 5mg': 'PAUSE INJ.5mg',
  'dexamethasone inj 4mg/1ml': 'DEXAMETHASONE INJ.4mg/1ml',
  'diazepam inj 10mg/2ml': 'DIAZEPAM INJ.10mg/2ml',
  'paracetamol tablet 500mg': 'PARACETAMOL TABLET 500MG',
  'hydrocortisone 100mg': 'Hydrocortisone 100mg',
  'dicynone inj 250mg': 'DICYNONE INJ .250MG',
  'fentanyl inj 500mcg': 'FENTANYL INJ.500mcg',
  'buscopan inj 20mg/1ml': 'Buscopan',
  'paracetamol suppo 250mg': 'Paracetamol inj',
  'morphine inj 10mg/1ml': 'MORPHINE INJ.10mg/1ml',
  'pap smear kit': 'PAP SMEAR KIT',
  'paracetamol inj': 'Paracetamol inj',
  'vicryl 4/0': 'VICRYL 4/0',
  'glass ionomer cement fuji i': 'Glass Ionomer Cement Fuji I (Luting)',
  'niti k-files 15-40': 'NITI K-Files 15-40 25mm',
  'lab request & treatment forms': 'Treatment form',
  'sunlight powder (5kg)': 'powder',
  'multipurpose liquid soap (20l)': 'Liquid',
  'sugar (kgs) & nido milk powder': 'powder',
  'duplicating paper (ream)': 'Duplicating Paper',
  'post-it (pkt of 12)': 'Post-it note',
  'bio-hazard waste bags (red/black)': 'Bio-hazard waste bag',
  'rwanda tea / gorilla coffee': 'Tea/Coffee'
};

const cleanName = (name) => {
  if (!name) return '';
  return name.toLowerCase()
    .replace(/\b(inj|inj\b|tablet|tablets|tab|suppo|supp|suppository|kit|ampoule|amp)\b/g, '')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

const getCategoryFromName = (name) => {
  const lower = name.toLowerCase();
  if (lower.includes('mg') || lower.includes('1g') || lower.includes('paracetamol') || lower.includes('adrenaline') || lower.includes('atropine') || lower.includes('inj') || lower.includes('tablets') || lower.includes('tabs') || lower.includes('salbutamol') || lower.includes('flagyl') || lower.includes('furosemide') || lower.includes('hydralazine')) {
    return 'medications';
  } else if (lower.includes('bupivacaine') || lower.includes('lidocaine') || lower.includes('propofol') || lower.includes('ketamine') || lower.includes('fentanyl') || lower.includes('morphine') || lower.includes('pethidine') || lower.includes('tramadol')) {
    return 'anesthetics';
  } else if (lower.includes('alcohol') || lower.includes('povidone') || lower.includes('eau') || lower.includes('saline') || lower.includes('lactate')) {
    return 'antiseptics';
  } else if (lower.includes('nylon') || lower.includes('vicryl') || lower.includes('polyglactin') || lower.includes('polypropylene') || lower.includes('blade') || lower.includes('sutures')) {
    return 'sutures';
  } else if (lower.includes('naloxone')) {
    return 'antidotes';
  }
  return 'medical_supplies';
};

const getIntelligentUom = (name) => {
  const lower = name.toLowerCase();
  if (lower.includes('cream') || lower.includes('ointment')) return 'tb';
  if (lower.includes('roll') || lower.includes('tape')) return 'rl';
  if (lower.includes('box') || lower.includes('gloves')) return 'bx';
  if (lower.includes('bottle') || lower.includes('solution') || lower.includes('liquid')) return 'btl';
  if (lower.includes('vial')) return 'vl';
  if (lower.includes('kit') || lower.includes('bracket')) return 'kit';
  if (lower.includes('set') || lower.includes('pack') || lower.includes('post-it') || lower.includes('pouch') || lower.includes('paper')) return 'pk';
  return 'pc';
};

// Map current UOM strings to abbreviations
const uomMap = {
  'unit': 'pc',
  'piece': 'pc',
  'pieces': 'pc',
  'each': 'pc',
  'box': 'bx',
  'pack': 'pk',
  'bottle': 'btl',
  'vial': 'vl',
  'tube': 'tb',
  'roll': 'rl',
  'set': 'set',
  'kit': 'kit',
  'can': 'cn'
};

async function run() {
  try {
    console.log("🚀 Starting Legacy Clinics Excel Data Import...");

    // 1. Ensure required departments exist
    const deptsToEnsure = ['LABORATORY', 'IMAGING', 'NURSING', 'DENTAL', 'OPERATIONS', 'PHYSIO'];
    for (const d of deptsToEnsure) {
      await db.query("INSERT OR IGNORE INTO departments (name) VALUES ($1)", [d]);
    }
    
    const { rows: allDepts } = await db.query("SELECT * FROM departments");
    const deptIdMap = {};
    allDepts.forEach(d => {
      deptIdMap[d.name] = d.id;
    });
    console.log("Departments verified:", deptIdMap);

    // 2. Fetch master UOMs list from database
    const { rows: allUoms } = await db.query("SELECT * FROM uoms");
    const validUomAbbrs = new Set(allUoms.map(u => u.abbreviation));
    console.log("Database UOM abbreviations:", Array.from(validUomAbbrs));

    // 3. Clear existing batch data and department stock to replace with verified Excel data
    console.log("🧹 Clearing old mock stock_batches and department_stock records...");
    await db.query("DELETE FROM department_stock");
    await db.query("DELETE FROM stock_batches");
    console.log("🧹 Clear completed.");

    // 4. Open Excel Workbook
    const excelPath = '/home/noble/Downloads/Legacy_Clinics_Medical_Store_Inventory.xlsx';
    if (!fs.existsSync(excelPath)) {
      console.error(`❌ Excel file not found at ${excelPath}`);
      process.exit(1);
    }
    const workbook = xlsx.readFile(excelPath);
    
    // Map sheet name to department key
    const sheetDeptMap = {
      'Nursing Department': 'NURSING',
      'Laboratory': 'LABORATORY',
      'Imaging Department': 'IMAGING',
      'Dental Clinic': 'DENTAL',
      'Admin & Housekeeping': 'OPERATIONS'
    };

    // Load current master inventory items
    const { rows: masterItems } = await db.query("SELECT * FROM master_inventory");
    console.log(`Loaded ${masterItems.length} reference items from master_inventory.`);

    // 5. Parse each sheet
    for (const sheetName of workbook.SheetNames) {
      if (sheetName === 'Biochemistry Log') continue; // Skip biochemistry notes
      
      const deptName = sheetDeptMap[sheetName];
      if (!deptName) {
        console.warn(`⚠️ Skipping sheet ${sheetName}: no department mapped.`);
        continue;
      }
      const departmentId = deptIdMap[deptName];
      console.log(`\n================ Processing Sheet: ${sheetName} -> Department: ${deptName} (ID: ${departmentId}) ================`);

      const sheet = workbook.Sheets[sheetName];
      const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
      if (rows.length === 0) continue;

      // Find headers row index
      let headerRowIdx = -1;
      for (let i = 0; i < rows.length; i++) {
        const rowStr = JSON.stringify(rows[i]).toLowerCase();
        if (rowStr.includes('description') || rowStr.includes('item description') || rowStr.includes('category')) {
          headerRowIdx = i;
          break;
        }
      }

      if (headerRowIdx === -1) {
        console.warn(`⚠️ No headers row found in sheet ${sheetName}. Skipping.`);
        continue;
      }

      const headers = rows[headerRowIdx];
      const descIdx = headers.findIndex(h => h && h.toLowerCase().includes('description'));
      const supplierIdx = headers.findIndex(h => h && h.toLowerCase().includes('supplier'));
      const priceIdx = headers.findIndex(h => h && h.toLowerCase().includes('price'));
      const qtyIdx = headers.findIndex(h => h && (h.toLowerCase().includes('balance') || h.toLowerCase().includes('volume') || h.toLowerCase().includes('baseline')));
      const expIdx = headers.findIndex(h => h && h.toLowerCase().includes('expiration'));

      const dataRows = rows.slice(headerRowIdx + 1);
      console.log(`Found ${dataRows.length} potential items in sheet ${sheetName}.`);

      for (const row of dataRows) {
        if (!row || row.length === 0) continue;
        const rawName = row[descIdx];
        if (!rawName || typeof rawName !== 'string' || rawName.trim() === '' || rawName.toUpperCase() === 'TOTAL') continue;

        const supplier = (row[supplierIdx] || 'Unknown').trim();
        const price = parseFloat(row[priceIdx]) || 0;
        const quantity = parseFloat(row[qtyIdx]) || 0;
        const expiry = (row[expIdx] || 'N/A').toString().trim();

        const nameLower = rawName.trim().toLowerCase();

        // A. Match item in master_inventory
        let matchedItem = null;

        // Try manual matches first
        if (manualMatches[nameLower]) {
          const mName = manualMatches[nameLower];
          matchedItem = masterItems.find(m => m.name.toLowerCase() === mName.toLowerCase());
        }

        // Try exact match
        if (!matchedItem) {
          matchedItem = masterItems.find(m => m.name.toLowerCase() === nameLower);
        }

        // Try clean match
        if (!matchedItem) {
          const nameClean = cleanName(rawName);
          matchedItem = masterItems.find(m => cleanName(m.name) === nameClean);
        }

        // Try translated match
        if (!matchedItem) {
          let translated = nameLower;
          for (const [fr, en] of Object.entries(frenchToEnglish)) {
            if (translated.includes(fr)) {
              translated = translated.replace(fr, en);
            }
          }
          matchedItem = masterItems.find(m => cleanName(m.name) === cleanName(translated));
        }

        // Try partial keyword match
        if (!matchedItem) {
          matchedItem = masterItems.find(m => {
            const mClean = cleanName(m.name);
            const dClean = cleanName(rawName);
            return mClean.includes(dClean) || dClean.includes(mClean);
          });
        }

        let itemId = null;
        let finalItemName = '';
        let finalCategory = '';
        let uomAbbr = 'pc';

        if (matchedItem) {
          itemId = matchedItem.id;
          finalItemName = matchedItem.name;
          finalCategory = matchedItem.category || getCategoryFromName(finalItemName);
          
          // Get UOM from matched item
          const currentUom = (matchedItem.unit_of_measure || 'pc').toLowerCase();
          uomAbbr = uomMap[currentUom] || currentUom;
          if (!validUomAbbrs.has(uomAbbr)) {
            uomAbbr = getIntelligentUom(finalItemName);
          }
        } else {
          // B. Create a new master item if not found
          finalItemName = rawName.trim();
          finalCategory = getCategoryFromName(finalItemName);
          uomAbbr = getIntelligentUom(finalItemName);

          const insertRes = await db.query(
            "INSERT INTO master_inventory (name, sku, unit_of_measure, category) VALUES ($1, $2, $3, $4) RETURNING id",
            [finalItemName, null, uomAbbr, finalCategory]
          );
          itemId = insertRes.rows[0].id;
          console.log(`➕ Created missing master item: "${finalItemName}" (ID: ${itemId})`);
          
          // Add to local list to prevent duplicate insertions
          masterItems.push({ id: itemId, name: finalItemName, unit_of_measure: uomAbbr, category: finalCategory });
        }

        // C. Look up or insert Vendor
        let vendorId = null;
        if (supplier && supplier.toLowerCase() !== 'unknown') {
          const { rows: vendorRows } = await db.query(
            "SELECT id FROM vendors WHERE LOWER(name) = $1",
            [supplier.toLowerCase()]
          );
          if (vendorRows.length > 0) {
            vendorId = vendorRows[0].id;
          } else {
            const insertVen = await db.query(
              "INSERT INTO vendors (name) VALUES ($1) RETURNING id",
              [supplier]
            );
            vendorId = insertVen.rows[0].id;
            console.log(`➕ Created missing vendor: "${supplier}" (ID: ${vendorId})`);
          }
        }

        // D. Create unique Batch code
        const deptAbbr = deptName.substring(0, 3).toUpperCase();
        const vendorAbbr = (supplier || 'UNK').substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
        const batchNumber = `BCH-${deptAbbr}-${vendorAbbr}-${itemId}`;

        // E. Insert into stock_batches
        // Expiry formatting from Excel (e.g. 31/07/2025 -> standard or kept as is)
        // Let's use the provided expiration date
        const batchRes = await db.query(
          "INSERT INTO stock_batches (item_id, vendor_id, batch_number, expiry_date, purchase_price, quantity, created_at) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP) RETURNING id",
          [itemId, vendorId, batchNumber, expiry, price, quantity]
        );
        const batchId = batchRes.rows[0].id;

        // F. Insert into department_stock
        await db.query(
          "INSERT INTO department_stock (department_id, item_id, batch_id, quantity) VALUES ($1, $2, $3, $4)",
          [departmentId, itemId, batchId, quantity]
        );

        // G. Update UOM to Abbreviation and generate final SKU
        // Calculate sequence number for SKU: count items in same department
        const { rows: seqRows } = await db.query(
          "SELECT COUNT(DISTINCT mi.id) as cnt FROM master_inventory mi LEFT JOIN stock_batches sb ON mi.id = sb.item_id LEFT JOIN department_stock ds ON sb.id = ds.batch_id WHERE ds.department_id = $1",
          [departmentId]
        );
        const seq = (seqRows[0]?.cnt || 0) + 1;
        const seqStr = String(seq).padStart(4, '0');

        const nameInitials = finalItemName.substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, 'X');
        const batchStr = batchNumber ? batchNumber.substring(0, 8) : 'XXXX';
        const finalSku = `lc-${nameInitials}-${batchStr}-${deptAbbr}-${seqStr}`;

        await db.query(
          "UPDATE master_inventory SET unit_of_measure = $1, sku = $2 WHERE id = $3",
          [uomAbbr, finalSku, itemId]
        );
      }
    }

    // 6. Convert any remaining master items UOMs from names to abbreviations
    console.log("\n📦 Converting remaining master_inventory UOM values to abbreviations...");
    const { rows: allMasterItems } = await db.query("SELECT id, name, unit_of_measure FROM master_inventory");
    for (const item of allMasterItems) {
      const uomName = (item.unit_of_measure || 'Piece').toLowerCase();
      let targetAbbr = uomMap[uomName] || uomName;
      if (!validUomAbbrs.has(targetAbbr)) {
        targetAbbr = getIntelligentUom(item.name);
      }
      if (targetAbbr !== item.unit_of_measure) {
        await db.query("UPDATE master_inventory SET unit_of_measure = $1 WHERE id = $2", [targetAbbr, item.id]);
      }
    }

    console.log("\n🎉 Database migration and data load completed successfully!");
  } catch (err) {
    console.error("❌ Error running importer:", err);
  } finally {
    process.exit(0);
  }
}

run();
