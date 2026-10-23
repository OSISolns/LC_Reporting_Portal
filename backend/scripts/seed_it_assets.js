'use strict';
/**
 * Migration script to seed all IT assets from Legacy Clinics inventory spreadsheet.
 * Supports running via Node directly.
 */
const fs = require('fs');
const path = require('path');
const db = require('../src/config/db');

function parseCSVLine(text) {
  const p = [];
  let row = [''];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];
    if (c === '"') {
      if (inQuotes && next === '"') {
        row[row.length - 1] += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      row.push('');
    } else {
      row[row.length - 1] += c;
    }
  }
  return row.map(s => s.trim());
}

function getAssetType(name) {
  const n = (name || '').toLowerCase();
  if (n.includes('telephone') || n.includes('phone') || n.includes('deskphone') || n.includes('headphone') || n.includes('kx-ns300')) {
    return 'Telephone';
  }
  if (n.includes('printer') || n.includes('laserjet') || n.includes('laser jet') || n.includes('m404dn') || n.includes('epson') || n.includes('canon copy') || n.includes('fujifilm dry') || n.includes('mfp')) {
    return 'Printer';
  }
  if (n.includes('switch') || n.includes('d-link') || n.includes('router') || n.includes('aw-net') || n.includes('splitter')) {
    return 'Network';
  }
  if (n.includes('server') || n.includes('rack')) {
    return 'Server';
  }
  if (n.includes('laptop') || n.includes('probook')) {
    return 'Laptop';
  }
  if (n.includes('tv') || n.includes('screen') || n.includes('monitor') || n.includes('display') || n.includes('projector')) {
    return 'Display';
  }
  if (n.includes('scanner') || n.includes('capsula') || n.includes('accutron')) {
    return 'Scanner';
  }
  if (n.includes('machine') || n.includes('tochigi')) {
    return 'Equipment';
  }
  if (n.includes('desk') && !n.includes('computer') && !n.includes('hp')) {
    return 'Furniture';
  }
  return 'Workstation';
}

function getDepartment(loc, code) {
  const l = (loc || '').toLowerCase();
  const c = (code || '').toUpperCase();

  if (c.includes('/GYN') || l.includes('gyn')) return 'GYNECOLOGY';
  if (c.includes('/REC') || l.includes('reception') || l.includes('help desk') || l.includes('helpdesk') || l.includes('billing')) return 'RECEPTION';
  if (c.includes('/NUR') || l.includes('nursing') || l.includes('observation') || l.includes('minor surgery')) return 'NURSING';
  if (c.includes('/ADM') || l.includes('admin') || l.includes('daf') || l.includes('chairman') || l.includes('ebm')) return 'ADMINISTRATION';
  if (c.includes('/OPS') || l.includes('operations')) return 'OPERATIONS';
  if (c.includes('/CALL') || l.includes('call center')) return 'CALL CENTER';
  if (c.includes('/CAR') || l.includes('cardiology') || l.includes('eeg')) return 'CARDIOLOGY';
  if (c.includes('/DEN') || l.includes('dental')) return 'DENTAL';
  if (c.includes('/DER') || l.includes('dermatology')) return 'DERMATOLOGY';
  if (c.includes('/DG') || l.includes('director general')) return 'EXECUTIVE';
  if (c.includes('/ENT') || l.includes('ent')) return 'ENT';
  if (c.includes('/GF') || l.includes('g.p') || l.includes('gp')) return 'OUTPATIENT';
  if (c.includes('/INT') || l.includes('internal medicine')) return 'INTERNAL MEDICINE';
  if (c.includes('/LAB') || l.includes('laboratory') || l.includes('microbiology')) return 'LABORATORY';
  if (c.includes('/MAM') || c.includes('/CONS') || c.includes('/XRAY') || l.includes('mamo') || l.includes('imaging') || l.includes('xray') || l.includes('xry') || l.includes('opg') || l.includes('ultrasound') || l.includes('console')) return 'IMAGING';
  if (c.includes('/STO') || l.includes('store') || l.includes('storage')) return 'STORES';
  if (c.includes('/NEURO') || l.includes('neuro')) return 'NEUROLOGY';
  if (c.includes('/ORTHO') || l.includes('ortho')) return 'ORTHOPEDICS';
  if (c.includes('/PED') || l.includes('pediatric')) return 'PEDIATRICS';
  if (c.includes('/PHLEB') || l.includes('phlebo') || l.includes('phlobo')) return 'PHLEBOTOMY';
  if (c.includes('/PHYSIO') || l.includes('physio') || l.includes('chiro')) return 'PHYSIOTHERAPY';
  if (c.includes('/SERV') || c.includes('/FIR') || l.includes('server') || l.includes('it') || l.includes('first floor')) return 'IT';
  if (c.includes('/VIP') || l.includes('vip')) return 'VIP LOUNGE';
  if (c.includes('/URO') || l.includes('uro')) return 'UROLOGY';

  return 'GENERAL';
}

function cleanVal(v) {
  if (!v) return '';
  const s = v.trim();
  const low = s.toLowerCase();
  if (low === 'not tagged' || low === 'not tagged/new purchase' || low === 'n/a' || low === 'not found' || low === 'none') {
    return '';
  }
  return s;
}

async function seedITAssets() {
  console.log('🔄 Starting IT Assets Ingestion...');

  const csvPath = '/tmp/it_assets.csv';
  if (!fs.existsSync(csvPath)) {
    throw new Error('CSV file not found at /tmp/it_assets.csv');
  }

  const rawLines = fs.readFileSync(csvPath, 'utf8')
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);

  if (rawLines.length <= 1) {
    throw new Error('CSV file contains no data rows');
  }

  const header = parseCSVLine(rawLines[0]);
  console.log('Detected CSV Header:', header.slice(0, 8));

  const items = [];
  for (let i = 1; i < rawLines.length; i++) {
    const row = parseCSVLine(rawLines[i]);
    if (!row || !row.length) continue;

    // Find where the LC/... asset code is placed
    let lcIdx = -1;
    for (let c = 0; c < row.length; c++) {
      if (row[c] && row[c].startsWith('LC/')) {
        lcIdx = c;
        break;
      }
    }

    const sn = cleanVal(row[0]) || String(i);
    const itemDesc = cleanVal(row[1]) || 'IT Asset';

    let assetCode = '';
    let location = '';
    let tag = '';
    let manufacturer = '';
    let serial = '';
    let model = '';

    if (lcIdx !== -1) {
      assetCode = row[lcIdx].trim();
      location = cleanVal(row[lcIdx - 1]);
      tag = cleanVal(row[lcIdx - 2]);
      manufacturer = cleanVal(row[lcIdx - 3]);
      serial = cleanVal(row[lcIdx - 4]);
      model = cleanVal(row[lcIdx - 5]);
    } else {
      assetCode = `LC/${String(i).padStart(4, '0')}/IT`;
      location = cleanVal(row[6]);
      tag = cleanVal(row[5]);
      manufacturer = cleanVal(row[4]);
      serial = cleanVal(row[3]);
      model = cleanVal(row[2]);
    }

    // Contextual fallbacks for locations where shifted
    if (!location && assetCode.includes('/LAB')) location = 'LABORATORY';
    if (!location && assetCode.includes('/SERV')) location = 'Server Room';

    // Model and manufacturer cleanup
    if (model.includes('\\')) model = model.replace(/\\\\/g, '\\');

    items.push({
      sn,
      itemDesc,
      model,
      serial,
      manufacturer,
      tag,
      location,
      assetCode
    });
  }

  console.log(`Parsed ${items.length} IT assets from CSV.`);

  // Handle duplicate asset_tags cleanly by appending -2, -3 if duplicated
  const tagCounter = {};
  const processed = items.map(item => {
    const baseCode = item.assetCode;
    let finalTag = baseCode;
    if (tagCounter[baseCode]) {
      tagCounter[baseCode]++;
      finalTag = `${baseCode}-${tagCounter[baseCode]}`;
    } else {
      tagCounter[baseCode] = 1;
    }

    const dept = getDepartment(item.location, finalTag);
    const assetType = getAssetType(item.itemDesc);

    // Assigned person heuristic if specified in location (e.g. Administration (Gatete Rich), Dr. Alan, etc.)
    let assignedTo = '';
    const match = item.location.match(/\(([^)]+)\)/) || item.location.match(/\/([A-Z][a-z]+)/);
    if (match && match[1]) {
      assignedTo = match[1].trim();
    } else if (item.location.toLowerCase().includes('dr.')) {
      assignedTo = item.location;
    }

    return {
      asset_tag: finalTag,
      name: item.itemDesc,
      model: item.model || null,
      serial_number: item.serial || null,
      manufacturer: item.manufacturer || null,
      location: item.location || 'General',
      assigned_to: assignedTo || null,
      department: dept,
      asset_type: assetType,
      status: 'Active'
    };
  });

  // Ensure table and columns exist
  await db.query(`
    CREATE TABLE IF NOT EXISTS it_assets (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      asset_tag       TEXT UNIQUE NOT NULL,
      name            TEXT NOT NULL,
      assigned_to     TEXT,
      department      TEXT,
      status          TEXT DEFAULT 'Active',
      asset_type      TEXT,
      serial_number   TEXT,
      model           TEXT,
      manufacturer    TEXT,
      location        TEXT,
      purchase_date   TEXT,
      warranty_expiry TEXT,
      created_at      TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    )
  `);

  // Clear previous dummy seed if needed
  const { rows: existingRows } = await db.query('SELECT COUNT(*) as c FROM it_assets');
  console.log(`Current assets in DB before import: ${existingRows[0].c}`);

  // Insert or Upsert all 300 assets
  let insertedCount = 0;
  let updatedCount = 0;

  for (const a of processed) {
    const { rows: check } = await db.query('SELECT id FROM it_assets WHERE asset_tag = $1', [a.asset_tag]);
    if (check && check.length > 0) {
      await db.query(
        `UPDATE it_assets 
         SET name = $1, assigned_to = $2, department = $3, status = $4,
             asset_type = $5, serial_number = $6, model = $7, manufacturer = $8, location = $9
         WHERE asset_tag = $10`,
        [a.name, a.assigned_to, a.department, a.status, a.asset_type, a.serial_number, a.model, a.manufacturer, a.location, a.asset_tag]
      );
      updatedCount++;
    } else {
      await db.query(
        `INSERT INTO it_assets 
          (asset_tag, name, assigned_to, department, status, asset_type, serial_number, model, manufacturer, location) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [a.asset_tag, a.name, a.assigned_to, a.department, a.status, a.asset_type, a.serial_number, a.model, a.manufacturer, a.location]
      );
      insertedCount++;
    }
  }

  const { rows: finalCount } = await db.query('SELECT COUNT(*) as c FROM it_assets');
  console.log(`🎉 Seeding complete! Inserted: ${insertedCount}, Updated: ${updatedCount}. Total in database: ${finalCount[0].c}`);
}

if (require.main === module) {
  seedITAssets()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Seeding failed:', err);
      process.exit(1);
    });
}

module.exports = seedITAssets;
