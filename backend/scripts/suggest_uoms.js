const { createClient } = require('@libsql/client');
require('dotenv').config({ path: '../.env' }); // or just assume local DB if no URL

// Initialize Turso/libSQL connection
const db = createClient({
  url: 'file:local.db',
});

const DEFAULT_UOMS = [
  { name: 'Piece', abbreviation: 'pc', description: 'Single item or piece' },
  { name: 'Box', abbreviation: 'bx', description: 'Box of multiple items' },
  { name: 'Pack', abbreviation: 'pk', description: 'Pack or package' },
  { name: 'Bottle', abbreviation: 'btl', description: 'Bottle of liquid or pills' },
  { name: 'Vial', abbreviation: 'vl', description: 'Small vial' },
  { name: 'Tube', abbreviation: 'tb', description: 'Tube of cream or ointment' },
  { name: 'Roll', abbreviation: 'rl', description: 'Roll of tape, cotton, etc.' },
  { name: 'Set', abbreviation: 'set', description: 'Set of instruments or tools' },
  { name: 'Kit', abbreviation: 'kit', description: 'Medical or surgical kit' },
  { name: 'Can', abbreviation: 'cn', description: 'Can or canister' }
];

async function run() {
  try {
    console.log('Starting UOM suggestion script...');

    // 1. Insert default UOMs
    console.log('Inserting default UOMs...');
    for (const uom of DEFAULT_UOMS) {
      // Use INSERT OR IGNORE to prevent duplicates if script runs multiple times
      await db.execute({
        sql: "INSERT OR IGNORE INTO uoms (name, abbreviation, description) VALUES (?, ?, ?)",
        args: [uom.name, uom.abbreviation, uom.description]
      });
    }

    // 2. Fetch all items
    console.log('Fetching master inventory items...');
    const result = await db.execute("SELECT id, name, unit_of_measure FROM master_inventory");
    const items = result.rows;
    console.log(`Found ${items.length} items to evaluate.`);

    // 3. Update items based on heuristics
    let updatedCount = 0;
    for (const item of items) {
      const name = item.name.toLowerCase();
      let newUom = 'Piece'; // Default

      if (name.match(/cream|gel|ointment|paste/)) newUom = 'Tube';
      else if (name.match(/roll|tape|wrap|cotton wool/)) newUom = 'Roll';
      else if (name.match(/box|gloves|mask/)) newUom = 'Box';
      else if (name.match(/vial|ampoule/)) newUom = 'Vial';
      else if (name.match(/bottle|solution|syrup/)) newUom = 'Bottle';
      else if (name.match(/pack|pkg|gauze/)) newUom = 'Pack';
      else if (name.match(/set/)) newUom = 'Set';
      else if (name.match(/kit/)) newUom = 'Kit';
      else if (name.match(/can|canister|spray/)) newUom = 'Can';

      // Update only if it's different from the current
      if (item.unit_of_measure !== newUom) {
        await db.execute({
          sql: "UPDATE master_inventory SET unit_of_measure = ? WHERE id = ?",
          args: [newUom, item.id]
        });
        updatedCount++;
      }
    }

    console.log(`Successfully mapped and updated ${updatedCount} items with suggested UOMs.`);
    
  } catch (error) {
    console.error('Error running UOM suggestion script:', error);
  }
}

run();
