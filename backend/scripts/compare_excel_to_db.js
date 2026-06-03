const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const db = require('../src/config/db');

async function run() {
  try {
    // 1. Fetch all master inventory items
    const masterRes = await db.query("SELECT id, name, sku, unit_of_measure, category FROM master_inventory ORDER BY name ASC");
    const masterItems = masterRes.rows;
    console.log(`Loaded ${masterItems.length} items from Items Master Registry.`);

    // 2. Read the Excel file
    const excelPath = '/home/noble/Downloads/Legacy_Clinics_Medical_Store_Inventory.xlsx';
    if (!fs.existsSync(excelPath)) {
      console.error(`Excel file not found at ${excelPath}`);
      process.exit(1);
    }
    const workbook = xlsx.readFile(excelPath);
    console.log("Excel sheets:", workbook.SheetNames);

    // List of departments to map sheets to
    const deptMap = {
      'Nursing Department': 'NURSING',
      'Laboratory': 'LABORATORY',
      'Imaging Department': 'IMAGING',
      'Dental Clinic': 'DENTAL',
      'Admin & Housekeeping': 'OPERATIONS'
    };

    const comparisonData = [];
    const unmatchedExcelItems = [];
    const matchedExcelItems = [];

    // Helper functions for matching
    const cleanName = (name) => {
      if (!name) return '';
      return name.toLowerCase()
        .replace(/\b(inj|inj\b|tablet|tablets|tab|suppo|supp|suppository|kit|ampoule|amp)\b/g, '')
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    };

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

    // 3. Process each sheet
    for (const sheetName of workbook.SheetNames) {
      if (sheetName === 'Biochemistry Log') continue; // Not a structured item log

      const sheet = workbook.Sheets[sheetName];
      const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
      if (rows.length === 0) continue;

      // Find the header row (contains Description or Item Description or Category)
      let headerRowIdx = -1;
      for (let i = 0; i < rows.length; i++) {
        const rowStr = JSON.stringify(rows[i]).toLowerCase();
        if (rowStr.includes('description') || rowStr.includes('item description') || rowStr.includes('category')) {
          headerRowIdx = i;
          break;
        }
      }

      if (headerRowIdx === -1) {
        console.warn(`No header row found for sheet ${sheetName}`);
        continue;
      }

      const headers = rows[headerRowIdx];
      const descIdx = headers.findIndex(h => h && h.toLowerCase().includes('description'));
      const supplierIdx = headers.findIndex(h => h && h.toLowerCase().includes('supplier'));
      const priceIdx = headers.findIndex(h => h && h.toLowerCase().includes('price'));
      const qtyIdx = headers.findIndex(h => h && (h.toLowerCase().includes('balance') || h.toLowerCase().includes('volume') || h.toLowerCase().includes('baseline')));
      const expIdx = headers.findIndex(h => h && h.toLowerCase().includes('expiration'));

      const dataRows = rows.slice(headerRowIdx + 1);

      for (const row of dataRows) {
        if (!row || row.length === 0) continue;
        const rawName = row[descIdx];
        if (!rawName || typeof rawName !== 'string' || rawName.trim() === '' || rawName.toUpperCase() === 'TOTAL') continue;

        const supplier = row[supplierIdx] || 'Unknown';
        const price = parseFloat(row[priceIdx]) || 0;
        const quantity = parseFloat(row[qtyIdx]) || 0;
        const expiry = row[expIdx] || 'N/A';

        const nameCleaned = cleanName(rawName);

        // Try exact match
        let matchedItem = masterItems.find(m => m.name.toLowerCase() === rawName.trim().toLowerCase());

        // Try clean match
        if (!matchedItem) {
          matchedItem = masterItems.find(m => cleanName(m.name) === nameCleaned);
        }

        // Try translated clean match
        if (!matchedItem) {
          let translated = rawName.toLowerCase();
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
            return mClean.includes(nameCleaned) || nameCleaned.includes(mClean);
          });
        }

        const deptName = deptMap[sheetName] || 'Unknown';

        if (matchedItem) {
          matchedExcelItems.push({
            excelName: rawName.trim(),
            masterName: matchedItem.name,
            masterSku: matchedItem.sku,
            sheetName,
            deptName,
            supplier,
            price,
            quantity,
            expiry,
            matchType: matchedItem.name.toLowerCase() === rawName.trim().toLowerCase() ? 'Exact' : 'Fuzzy/Translated'
          });
        } else {
          unmatchedExcelItems.push({
            excelName: rawName.trim(),
            sheetName,
            deptName,
            supplier,
            price,
            quantity,
            expiry
          });
        }
      }
    }

    // 4. Generate the report
    const reportPath = '/home/noble/.gemini/antigravity/brain/8220d452-3cac-4e6c-bf5f-0214b7552ce1/inventory_comparison_report.md';
    let md = `# Inventory Comparison Report: Excel Workbook vs. Items Master Registry\n\n`;
    md += `This report lists side-by-side matches, translations, naming variations, and discrepancies found between the Excel Workbook (\`Legacy_Clinics_Medical_Store_Inventory.xlsx\`) and the **Items Master Registry** (\`master_inventory\` table).\n\n`;

    md += `## Executive Summary\n`;
    md += `- **Excel Sheets Analyzed**: ${Object.keys(deptMap).join(', ')}\n`;
    md += `- **Total Excel Items Loaded**: ${matchedExcelItems.length + unmatchedExcelItems.length}\n`;
    md += `- **Successfully Matched Items**: ${matchedExcelItems.length} (${Math.round(matchedExcelItems.length / (matchedExcelItems.length + unmatchedExcelItems.length) * 100)}%)\n`;
    md += `- **Unmatched Items (Missing in Master Registry)**: ${unmatchedExcelItems.length}\n\n`;

    md += `## 1. Matches with Naming Discrepancies & Language Variations (Side-by-Side)\n`;
    md += `These items represent the same medical product but are written differently (e.g. French in Excel vs. English in Master Registry, or containing extra words like 'Inj' / 'Tablet').\n\n`;
    md += `| Excel Sheet | Excel Item Name | Items Master Name | SKU | Match Type | Supplier (Excel) | Price (RWF) | Qty (Excel) |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n`;

    // Sort: fuzzy matches first to highlight discrepancies, then exact matches
    const allMatches = [
      ...matchedExcelItems.filter(m => m.matchType !== 'Exact'),
      ...matchedExcelItems.filter(m => m.matchType === 'Exact')
    ];

    for (const m of allMatches) {
      md += `| ${m.sheetName} | **${m.excelName}** | **${m.masterName}** | \`${m.masterSku || '—'}\` | ${m.matchType} | ${m.supplier} | ${m.price} | ${m.quantity} |\n`;
    }

    md += `\n## 2. Unmatched Excel Items (Missing from Master Registry)\n`;
    md += `These items exist in the Excel Workbook but could not be resolved to any item in the Items Master Registry. They should be added to the registry with the correct details.\n\n`;
    md += `| Excel Sheet | Excel Item Name | Supplier | Price (RWF) | Quantity | Expiry | Recommended Category |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n`;

    for (const u of unmatchedExcelItems) {
      let cat = 'medical_supplies';
      const lower = u.excelName.toLowerCase();
      if (lower.includes('mg') || lower.includes('1g') || lower.includes('paracetamol') || lower.includes('adrenaline') || lower.includes('atropine') || lower.includes('inj') || lower.includes('tablets') || lower.includes('tabs')) {
        cat = 'medications';
      } else if (lower.includes('bupivacaine') || lower.includes('lidocaine') || lower.includes('propofol') || lower.includes('ketamine')) {
        cat = 'anesthetics';
      } else if (lower.includes('alcohol') || lower.includes('povidone') || lower.includes('eau')) {
        cat = 'antiseptics';
      } else if (lower.includes('nylon') || lower.includes('vicryl') || lower.includes('polyglactin') || lower.includes('polypropylene')) {
        cat = 'sutures';
      }
      md += `| ${u.sheetName} | **${u.excelName}** | ${u.supplier} | ${u.price} | ${u.quantity} | ${u.expiry} | ${cat} |\n`;
    }

    fs.writeFileSync(reportPath, md, 'utf8');
    console.log(`Successfully generated comparison report at ${reportPath}`);

  } catch (err) {
    console.error("Error comparing inventories:", err);
  } finally {
    process.exit(0);
  }
}

run();
