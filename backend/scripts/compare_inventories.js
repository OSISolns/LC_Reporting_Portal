const fs = require('fs');
const path = require('path');
const db = require('../src/config/db');

async function run() {
  try {
    // 1. Fetch all items from master_inventory
    const masterRes = await db.query("SELECT id, name, sku, unit_of_measure, category FROM master_inventory ORDER BY name ASC");
    const masterItems = masterRes.rows;
    console.log(`Loaded ${masterItems.length} items from Items Master Registry.`);

    // 2. Fetch all unique items from nursing_monthly_stock
    const nursingRes = await db.query("SELECT DISTINCT item_name FROM nursing_monthly_stock ORDER BY item_name ASC");
    const nursingDBItems = nursingRes.rows.map(r => r.item_name);
    console.log(`Loaded ${nursingDBItems.length} unique items from nursing_monthly_stock in DB.`);

    // 3. Extract items from DailyInventoryCheckup.jsx EXCEL_DATA definition
    const jsxPath = path.join(__dirname, '../../frontend/src/pages/DailyInventoryCheckup.jsx');
    const jsxContent = fs.readFileSync(jsxPath, 'utf8');
    
    // We can extract keys of EXCEL_DATA using a regex or simple parsing
    const excelDataMatch = jsxContent.match(/const EXCEL_DATA = \{([\s\S]*?)\};/);
    const dailyItems = [];
    if (excelDataMatch) {
      const block = excelDataMatch[1];
      const lineRegex = /"([^"]+)"\s*:/g;
      let match;
      while ((match = lineRegex.exec(block)) !== null) {
        dailyItems.push(match[1]);
      }
    }
    console.log(`Extracted ${dailyItems.length} items from DailyInventoryCheckup.jsx code.`);

    // Combine and deduplicate daily stock checkup items
    const allDailyStockItems = Array.from(new Set([...nursingDBItems, ...dailyItems])).sort();
    console.log(`Total unique items in Daily Stock Checkup: ${allDailyStockItems.length}`);

    // Let's do some matching
    // We want to find matches and close-matches, French vs English, and differently spelled items.
    const matches = [];
    const unmatchedDaily = [];
    
    const frenchToEnglish = {
      'gants': 'gloves',
      'gants propre': 'gloves clean',
      'eau oxygénée': 'hydrogen peroxide',
      'sonde vésicale': 'vesical probe / foley catheter',
      'seringue': 'syringe',
      'masque': 'mask',
      'sac à urine': 'urine bag',
      'bande': 'bandage / tape',
      'trousse': 'kit / case'
    };

    for (const daily of allDailyStockItems) {
      // Find exact or highly similar items in master_inventory
      let exact = masterItems.find(m => m.name.toLowerCase() === daily.toLowerCase());
      if (exact) {
        matches.push({
          dailyName: daily,
          masterName: exact.name,
          masterSku: exact.sku,
          masterCategory: exact.category,
          type: 'Exact Match'
        });
        continue;
      }

      // Check for partial/fuzzy matching
      // E.g., if one string contains the other, or edit distance is small, or word overlap is high
      let partials = masterItems.filter(m => {
        const dLower = daily.toLowerCase();
        const mLower = m.name.toLowerCase();
        
        // Remove common words/forms
        const clean = (s) => s.replace(/\b(inj|inj\b|tablet|tablets|tab|suppo|supp|suppository|kit|ampoule|amp)\b/g, '').replace(/\s+/g, ' ').trim();
        const dClean = clean(dLower);
        const mClean = clean(mLower);

        if (dClean === mClean && dClean.length > 2) return true;
        if (mLower.includes(dLower) || dLower.includes(mLower)) return true;

        // Check if translated French matches
        for (const [fr, en] of Object.entries(frenchToEnglish)) {
          if (dLower.includes(fr)) {
            const translatedD = dLower.replace(fr, en);
            if (mLower.includes(translatedD) || translatedD.includes(mLower)) return true;
          }
        }
        return false;
      });

      if (partials.length > 0) {
        matches.push({
          dailyName: daily,
          masterName: partials[0].name,
          masterSku: partials[0].sku,
          masterCategory: partials[0].category,
          type: 'Close/Translated Match',
          allPartials: partials.map(p => p.name)
        });
      } else {
        unmatchedDaily.push(daily);
      }
    }

    console.log(`Exact Matches: ${matches.filter(m => m.type === 'Exact Match').length}`);
    console.log(`Close Matches: ${matches.filter(m => m.type === 'Close/Translated Match').length}`);
    console.log(`Unmatched Daily Items: ${unmatchedDaily.length}`);

    // Create a detailed Markdown document with the comparison side by side
    const reportPath = '/home/noble/.gemini/antigravity/brain/8220d452-3cac-4e6c-bf5f-0214b7552ce1/inventory_comparison_report.md';
    let md = `# Inventory Comparison Report\n\n`;
    md += `This report compares items from the **Items Master Registry** (\`master_inventory\` table) and the **Daily Stock Checkup** sheet (\`nursing_monthly_stock\` table and frontend checklist). It identifies naming discrepancies, language differences (French vs. English), and unmatched items.\n\n`;
    
    md += `## Summary Statistics\n`;
    md += `- **Total Items in Master Registry**: ${masterItems.length}\n`;
    md += `- **Total Unique Items in Daily Stock Checkup**: ${allDailyStockItems.length}\n`;
    md += `- **Exact Matches**: ${matches.filter(m => m.type === 'Exact Match').length}\n`;
    md += `- **Close/Translated/Discrepancy Matches**: ${matches.filter(m => m.type === 'Close/Translated Match').length}\n`;
    md += `- **Unmatched Daily Checkup Items**: ${unmatchedDaily.length}\n\n`;

    md += `## 1. Naming Discrepancies & Language Variations (Side-by-Side)\n`;
    md += `These items represent the same medical product but are written differently, use different languages (French vs. English), or include detailed strength/dosage formats in one registry but not the other.\n\n`;
    md += `| Daily Stock Checkup Name | Items Master Registry Match | Match/Discrepancy Type | Notes / Translation Details |\n`;
    md += `| :--- | :--- | :--- | :--- |\n`;
    
    // Sort matches to display discrepancies first, then exact matches
    const sortedMatches = [
      ...matches.filter(m => m.type !== 'Exact Match'),
      ...matches.filter(m => m.type === 'Exact Match')
    ];

    for (const m of sortedMatches) {
      if (m.type === 'Exact Match') {
        md += `| ${m.dailyName} | ${m.masterName} | Exact Match | Identical names in both registries |\n`;
      } else {
        const partialsStr = m.allPartials.join(', ');
        let note = 'Possible naming format difference';
        const dLower = m.dailyName.toLowerCase();
        for (const [fr, en] of Object.entries(frenchToEnglish)) {
          if (dLower.includes(fr)) {
            note = `French term "${fr}" matches English "${en}"`;
          }
        }
        if (m.dailyName.includes('Catheter') && m.masterName.includes('Cannula')) {
          note = 'Catheter vs. Cannula naming convention';
        }
        md += `| **${m.dailyName}** | **${m.masterName}** | Close Match | ${note} (Other matches: ${partialsStr}) |\n`;
      }
    }

    md += `\n## 2. Unmatched Daily Checkup Items\n`;
    md += `These items appear in the Daily Stock Checkup logs or frontend checklist but have no clear match in the Items Master Registry. They may need to be registered in the Master list.\n\n`;
    md += `| Daily Stock Checkup Item Name | Category | Proposed Master SKU |\n`;
    md += `| :--- | :--- | :--- |\n`;
    for (const u of unmatchedDaily) {
      const excelVal = excelItemsMap[u] || {};
      const cat = excelVal.category || 'medical_supplies';
      // Generate a mock SKU based on the lc-initials-batch-dept rules
      const initials = u.substring(0, 3).toUpperCase().replace(/\s/g, 'X');
      const mockSku = `lc-${initials}-XXXX-XXX`;
      md += `| ${u} | ${cat} | \`${mockSku}\` |\n`;
    }

    fs.writeFileSync(reportPath, md, 'utf8');
    console.log(`Successfully generated report at ${reportPath}`);

  } catch (err) {
    console.error("Error comparing inventories:", err);
  } finally {
    process.exit(0);
  }
}

// Simple lookup map for categories from EXCEL_DATA
const excelItemsMap = {
  "Aquabloc 15cm": { category: "medical_supplies" },
  "Adrenaline": { category: "medications" },
  "Adrenaline 1mg": { category: "medications" },
  "Alcohol pads": { category: "medical_supplies" },
  "Atropine 1mg": { category: "medications" },
  "Bande 15cm": { category: "medical_supplies" },
  "Bande 7.5cm": { category: "medical_supplies" },
  "Bupivacaine": { category: "anesthetics" },
  "Buscopan": { category: "medications" },
  "Buscopan 20mg": { category: "medications" },
  "Catheter G16": { category: "medical_supplies" },
  "Catheter G18": { category: "medical_supplies" },
  "Catheter G20": { category: "medical_supplies" },
  "Catheter G22": { category: "medical_supplies" },
  "Catheter G24": { category: "medical_supplies" },
  "Ceftriaxone 1g": { category: "medications" },
  "Dexamethasone": { category: "medications" },
  "Dexamethasone 4mg": { category: "medications" },
  "Dexamethasone 8mg": { category: "medications" },
  "Dextrose 50%": { category: "antiseptics" },
  "Diazepam 10mg": { category: "medications" },
  "Diclo 100mg Supp": { category: "medications" },
  "Diclofenac 75mg": { category: "medications" },
  "Diclofenac IM 75mg": { category: "medications" },
  "Dicynone 250mg": { category: "medications" },
  "Eau oxygénée 3%": { category: "antiseptics" },
  "Emitino": { category: "medications" },
  "Esomeprazole": { category: "medications" },
  "Fentanyl": { category: "anesthetics" },
  "Flagyl": { category: "medications" },
  "Furosemide": { category: "medications" },
  "Furosemide 20mg": { category: "medications" },
  "Gants Sterile 8": { category: "medical_supplies" },
  "Gants propre": { category: "medical_supplies" },
  "Gloves 7.5": { category: "medical_supplies" },
  "Glucose 5%": { category: "antiseptics" },
  "Hydralazine 20mg": { category: "medications" },
  "Hydrocortisone 100mg": { category: "medications" },
  "IV Paracetamol 1g": { category: "medications" },
  "Ketamine 500mg": { category: "anesthetics" },
  "Largactil 25mg": { category: "medications" },
  "Lidocaine": { category: "anesthetics" },
  "Masque Neb Adulte": { category: "medical_supplies" },
  "Masque Neb Enfant": { category: "medical_supplies" },
  "Metoclopramide": { category: "medications" },
  "Metronidazole": { category: "medications" },
  "Midazolam 5mg": { category: "anesthetics" },
  "Morphine 10mg": { category: "anesthetics" },
  "NS (Normal Saline)": { category: "antiseptics" },
  "Naloxone": { category: "antidotes" },
  "Nasal Oxygen Masque Enfant": { category: "medical_supplies" },
  "Nylon 2/0": { category: "sutures" },
  "Nylon 4/0": { category: "sutures" },
  "Nylon 5/0": { category: "sutures" },
  "Pantoprazole 40mg": { category: "medications" },
  "Pap Smear": { category: "medical_supplies" },
  "Paracet 125mg Supp": { category: "medications" },
  "Paracet 250mg Supp": { category: "medications" },
  "Paracetamol 125mg": { category: "medications" },
  "Paracetamol Ces": { category: "medications" },
  "Paraffin Gauze 5cm": { category: "medical_supplies" },
  "Pause": { category: "medications" },
  "Pethidine": { category: "anesthetics" },
  "Phenobarbital 100mg": { category: "medications" },
  "Phenytoin 250mg": { category: "medications" },
  "Phytomenadione 10mg": { category: "medications" },
  "Plaster": { category: "medical_supplies" },
  "Polyglactin 3/0": { category: "sutures" },
  "Polyglactin 4/0": { category: "sutures" },
  "Polypropylene 6/0": { category: "sutures" },
  "Povidone 10%": { category: "antiseptics" },
  "Propofol 200mg": { category: "anesthetics" },
  "RL (Ringer's Lactate)": { category: "antiseptics" },
  "Sac à urine": { category: "medical_supplies" },
  "Salbutamol": { category: "medications" },
  "Seringue 10cc": { category: "medical_supplies" },
  "Seringue 1cc (Insuline)": { category: "medical_supplies" },
  "Seringue 20cc": { category: "medical_supplies" },
  "Seringue 2cc": { category: "medical_supplies" },
  "Seringue 5cc": { category: "medical_supplies" },
  "Sonde Vésicale G10": { category: "medical_supplies" },
  "Sonde Vésicale G12": { category: "medical_supplies" },
  "Sonde Vésicale G16": { category: "medical_supplies" },
  "Spatula": { category: "medical_supplies" },
  "Speculum": { category: "medical_supplies" },
  "Sterile Gauze 10cm": { category: "medical_supplies" },
  "Surgical Blades N15": { category: "sutures" },
  "Surgical Blades N23": { category: "sutures" },
  "Tongue Depressor": { category: "medical_supplies" },
  "Tramadol": { category: "anesthetics" },
  "Trousse": { category: "medical_supplies" },
  "Vaginal Swab": { category: "medical_supplies" },
  "Vicryl 2/0": { category: "sutures" },
  "Vicryl 3/0": { category: "sutures" },
  "Vicryl 4/0": { category: "sutures" },
  "Vicryl 5/0": { category: "sutures" },
  "Vit B complex": { category: "medications" },
  "Water for injection": { category: "antiseptics" }
};

run();
