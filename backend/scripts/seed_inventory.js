'use strict';
require('dotenv').config();
const { createClient } = require('@libsql/client');

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function seedInventory() {
  try {
    console.log('🩺 Seeding Inventory...');

    // Vendors from the image
    const vendors = [
      'SOFTLINE', 'KIPHARMA', 'Rugero Med Ltd', 'MIPD', 'Best stationary',
      'Trust Computer', 'LA PROVIDINA', 'Trust C', 'BENEKIGALI', 'HECTA',
      'N/A', 'PAPETERIE HECTA', 'FROM INDIA'
    ];

    // Seed Vendors
    for (const v of vendors) {
      const { rows } = await client.execute({ sql: 'SELECT id FROM vendors WHERE name = ?', args: [v] });
      if (rows.length === 0) {
        await client.execute({
          sql: 'INSERT INTO vendors (name, is_active) VALUES (?, 1)',
          args: [v]
        });
      }
    }

    console.log('✅ Vendors seeded.');

    // Fetch vendor IDs
    const vendorMap = {};
    const { rows: vendorRows } = await client.execute('SELECT id, name FROM vendors');
    vendorRows.forEach(r => vendorMap[r.name] = r.id);

    // Items
    const items = [
      // IMAGING DEPARTEMENT April- 2026
      { desc: 'DVD', vendor: 'SOFTLINE', price: 1650, cat: 'imaging_department' },
      { desc: 'Contrast 100ml/Omnipaque', vendor: 'KIPHARMA', price: 32606, cat: 'imaging_department' },
      { desc: 'CONTRAST OMNISCAN 0.5mmol/20ml', vendor: 'KIPHARMA', price: 44833, cat: 'imaging_department' },
      { desc: 'CT Connecters', vendor: 'Rugero Med Ltd', price: 8000, cat: 'imaging_department' },
      { desc: 'Visipaque 320mg', vendor: 'KIPHARMA', price: 44500, cat: 'imaging_department' },
      { desc: 'CT SYRINGUE/1paire', vendor: 'Rugero Med Ltd', price: 28000, cat: 'imaging_department' },
      { desc: 'SONNY ROLL', vendor: 'MIPD', price: 22000, cat: 'imaging_department' },
      
      // OFFICE STATIONARIES
      { desc: 'Papier duplicateur/ REAM', vendor: 'Best stationary', price: 6500, cat: 'office_stationery' },
      { desc: 'Stylos', vendor: 'Best stationary', price: 160, cat: 'office_stationery' },
      { desc: 'Post-it (pqt de 12 pces)/COLOR', vendor: 'Trust Computer', price: 250, cat: 'office_stationery' },
      { desc: 'Registres', vendor: 'Best stationary', price: 4000, cat: 'office_stationery' },
      { desc: 'Brancho', vendor: 'LA PROVIDINA', price: 1500, cat: 'office_stationery' },
      { desc: 'Block note 5*8', vendor: 'Trust Computer', price: 500, cat: 'office_stationery' },
      { desc: 'Staples 24/6/Pqt/B100', vendor: 'Trust C', price: 3000, cat: 'office_stationery' },
      { desc: 'Attaches tout 50MM (Pqt de 10 boites)', vendor: 'BENEKIGALI', price: 35, cat: 'office_stationery' },
      { desc: 'Attaches tout 33MM (Pqt de 10 boites)', vendor: 'BENEKIGALI', price: 35, cat: 'office_stationery' },
      { desc: 'Enveloppe A4 (pqt de 50)', vendor: 'Best stationary', price: 90, cat: 'office_stationery' },
      { desc: 'Enveloppe white/imag&labo/pc', vendor: 'LA PROVIDINA', price: 250, cat: 'office_stationery' },
      { desc: 'Farde perforee (pqt de 20pces)', vendor: 'Best stationary', price: 6000, cat: 'office_stationery' },
      { desc: 'Farde suspender', vendor: 'Trust Computer', price: 500, cat: 'office_stationery' },
      { desc: 'Fimbo/Pqt', vendor: 'LA PROVIDINA', price: 5000, cat: 'office_stationery' },
      { desc: 'Carnets de route', vendor: 'Trust Computer', price: 1500, cat: 'office_stationery' },
      { desc: 'Chemise Transparentes', vendor: 'HECTA', price: 10000, cat: 'office_stationery' },
      { desc: 'Cove A4', vendor: 'Trust Computer', price: 10000, cat: 'office_stationery' },
      { desc: 'DVD cover/1Pc', vendor: 'Best stationary', price: 4, cat: 'office_stationery' },
      { desc: 'Gome', vendor: 'LA PROVIDINA', price: 200, cat: 'office_stationery' },
      { desc: 'Token machine Paper Roll', vendor: 'Trust Computer', price: 1900, cat: 'office_stationery' },
      { desc: 'Transparent A4', vendor: 'Trust Computer', price: 10000, cat: 'office_stationery' },
      { desc: 'Spirale (Noir)', vendor: 'N/A', price: 1000, cat: 'office_stationery' },
      { desc: 'Spirale (Gris)', vendor: 'N/A', price: 1000, cat: 'office_stationery' },
      { desc: 'Spirale Enroulee Noir (Grand)', vendor: 'N/A', price: 1000, cat: 'office_stationery' },
      { desc: 'Spirale Enroulee Noir (moyen)', vendor: 'N/A', price: 1000, cat: 'office_stationery' },
      { desc: 'Classeurs', vendor: 'Trust Computer', price: 2000, cat: 'office_stationery' },
      { desc: 'Encre pour les cachets bleu', vendor: 'Trust Computer', price: 6000, cat: 'office_stationery' },
      { desc: 'Encre pour les cachets vert', vendor: 'Trust Computer', price: 4500, cat: 'office_stationery' },
      { desc: 'Enveloppes BIG SAC', vendor: 'Trust Computer', price: 15000, cat: 'office_stationery' },
      { desc: 'Arrache agraffes', vendor: 'PAPETERIE HECTA', price: 500, cat: 'office_stationery' },
      { desc: 'Investigation form/booklet/1', vendor: 'LA PROVIDINA', price: 2000, cat: 'office_stationery' },
      { desc: 'Prescription form', vendor: 'LA PROVIDINA', price: 2350, cat: 'office_stationery' },
      { desc: 'Sick leave form', vendor: 'LA PROVIDINA', price: 2400, cat: 'office_stationery' },
      { desc: 'Sheet protector', vendor: 'Trust Computer', price: 8000, cat: 'office_stationery' },
      { desc: 'Treatment form', vendor: 'LA PROVIDINA', price: 2000, cat: 'office_stationery' },
      { desc: 'Patient information form', vendor: 'LA PROVIDINA', price: 1700, cat: 'office_stationery' },
      { desc: 'Punching machine DP 520', vendor: 'Trust Computer', price: 7000, cat: 'office_stationery' },
      { desc: 'Transfert form', vendor: 'LA PROVIDINA', price: 2700, cat: 'office_stationery' },
      { desc: 'Lab request form', vendor: 'LA PROVIDINA', price: 2500, cat: 'office_stationery' },
      { desc: 'Lab sample collection/Lab books transport log specimen', vendor: 'LA PROVIDINA', price: 3000, cat: 'office_stationery' },
      { desc: 'Latte', vendor: 'Trust Computer', price: 400, cat: 'office_stationery' },
      { desc: 'Payment voucher', vendor: 'LA PROVIDINA', price: 2300, cat: 'office_stationery' },
      { desc: 'Purchase order', vendor: 'LA PROVIDINA', price: 3500, cat: 'office_stationery' },
      { desc: 'Glue sticks/Colle (5g)', vendor: 'FROM INDIA', price: 0, cat: 'office_stationery' },
      { desc: 'Glue sticks/Colle (8g)', vendor: 'FROM INDIA', price: 0, cat: 'office_stationery' },
      { desc: 'Glue sticks/Colle (15g)', vendor: 'FROM INDIA', price: 0, cat: 'office_stationery' },
      { desc: 'Eraser/Gomme', vendor: 'FROM INDIA', price: 0, cat: 'office_stationery' },
      { desc: 'Damper', vendor: 'FROM INDIA', price: 0, cat: 'office_stationery' },
      { desc: 'kangaro Punch/ DP-700 - Perforateur', vendor: 'FROM INDIA', price: 0, cat: 'office_stationery' },
      { desc: 'Kangaro Punch/ FP-20 - Perforateur single', vendor: 'FROM INDIA', price: 0, cat: 'office_stationery' },
      { desc: 'Requisition CUM ISSUE SLIP', vendor: 'LA PROVIDINA', price: 3000, cat: 'office_stationery' },
      { desc: 'Marker', vendor: 'Best stationary', price: 500, cat: 'office_stationery' },
      { desc: 'Office Tray', vendor: 'LA PROVIDINA', price: 6000, cat: 'office_stationery' },
    ];

    for (const item of items) {
      const { rows } = await client.execute({ sql: 'SELECT id FROM master_inventory WHERE name = ?', args: [item.desc] });
      if (rows.length === 0) {
        await client.execute({
          sql: `
            INSERT INTO master_inventory (name, sku, category, unit_of_measure) 
            VALUES (?, ?, ?, ?)
          `,
          args: [
            item.desc, 
            'SKU-' + item.desc.substring(0, 5).toUpperCase().replace(/[^A-Z0-9]/g, '') + '-' + Math.floor(Math.random() * 1000), 
            item.cat, 
            'Unit'
          ]
        });
      } else {
        await client.execute({
          sql: 'UPDATE master_inventory SET category = ? WHERE name = ?',
          args: [item.cat, item.desc]
        });
      }
    }

    console.log('✅ Items seeded.');
  } catch (err) {
    console.error('❌ Failed:', err);
  } finally {
    client.close();
  }
}

seedInventory();
