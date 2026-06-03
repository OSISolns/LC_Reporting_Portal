const { createClient } = require('@libsql/client');

const db = createClient({
  url: 'file:local.db',
});

async function run() {
  try {
    console.log('Starting SKU mass update script...');

    // Fetch all items with their associated batch and department
    const { rows: items } = await db.execute(`
      SELECT 
        mi.id as item_id, 
        mi.name as item_name, 
        sb.batch_number, 
        d.name as department_name
      FROM master_inventory mi
      LEFT JOIN stock_batches sb ON mi.id = sb.item_id
      LEFT JOIN department_stock ds ON sb.id = ds.batch_id
      LEFT JOIN departments d ON ds.department_id = d.id
      GROUP BY mi.id
    `);

    console.log(`Found ${items.length} items to update.`);

    let updatedCount = 0;
    for (const item of items) {
      const itemInitials = item.item_name ? item.item_name.substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, '') || 'ITM' : 'ITM';
      const batchStr = item.batch_number ? item.batch_number : 'XXXX';
      const deptInitials = item.department_name ? item.department_name.substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, '') || 'DEP' : 'XXX';
      
      const newSku = `lc-${itemInitials}-${batchStr}-${deptInitials}`;
      
      await db.execute({
        sql: "UPDATE master_inventory SET sku = ? WHERE id = ?",
        args: [newSku, item.item_id]
      });
      
      updatedCount++;
    }

    console.log(`Successfully generated and updated SKUs for ${updatedCount} items.`);
    
  } catch (error) {
    console.error('Error running SKU update script:', error);
  }
}

run();
