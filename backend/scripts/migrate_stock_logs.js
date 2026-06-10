const fs = require('fs');
const path = require('path');
const { createClient } = require('@libsql/client');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.production.local') });

const tursoUrl = process.env.PROD_TURSO_DATABASE_URL || process.env.TURSO_DATABASE_URL || process.env.lcreporting_TURSO_DATABASE_URL;
const tursoAuthToken = process.env.PROD_TURSO_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN || process.env.lcreporting_TURSO_AUTH_TOKEN;

if (!tursoUrl || !tursoAuthToken) {
  console.error('❌ Missing Turso credentials');
  process.exit(1);
}

const client = createClient({
  url: tursoUrl,
  authToken: tursoAuthToken,
});

async function migrateStockLogs() {
  try {
    const rawData = fs.readFileSync(path.join(__dirname, '..', 'stock_logs.json'), 'utf8');
    const logs = JSON.parse(rawData);
    
    console.log(`Loaded ${logs.length} stock change logs from JSON.`);

    // Keep track of the latest log for each (month_year, item_name, day, session) combination
    // We'll use this to update the nursing_monthly_stock table
    const latestLogsMap = new Map();

    for (const log of logs) {
      const { id, month_year, item_name, day, session, old_stock, new_stock, old_consumed, new_consumed, updated_by, updated_at } = log;
      
      const key = `${month_year}|${item_name}|${day}|${session}`;
      
      // Update the map with the latest log for this combination
      // Assuming the logs array is chronological or we can just let the later items override.
      // We can also parse the updated_at date to ensure we have the absolute latest.
      const existingLatest = latestLogsMap.get(key);
      if (!existingLatest || new Date(updated_at) >= new Date(existingLatest.updated_at)) {
        latestLogsMap.set(key, log);
      }
    }

    console.log('Inserting into nursing_stock_change_logs...');
    const logStatements = [];
    for (const log of logs) {
      logStatements.push({
        sql: `INSERT INTO nursing_stock_change_logs 
              (month_year, item_name, day, session, old_stock, new_stock, old_consumed, new_consumed, updated_by, updated_at) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          log.month_year,
          log.item_name,
          log.day,
          log.session,
          log.old_stock,
          log.new_stock,
          log.old_consumed,
          log.new_consumed,
          log.updated_by,
          log.updated_at
        ]
      });
    }

    // Process logs in batches to avoid overwhelming the connection
    const BATCH_SIZE = 100;
    for (let i = 0; i < logStatements.length; i += BATCH_SIZE) {
      const batch = logStatements.slice(i, i + BATCH_SIZE);
      await client.batch(batch, 'write');
      console.log(`Inserted logs batch ${i / BATCH_SIZE + 1} (${batch.length} items)...`);
    }

    console.log('Inserting/updating nursing_monthly_stock...');
    const stockStatements = [];
    for (const [key, log] of latestLogsMap.entries()) {
      const balance = log.new_stock - log.new_consumed;
      stockStatements.push({
        sql: `INSERT INTO nursing_monthly_stock 
              (month_year, item_name, day, session, stock_in_hands, consumed, balance, responsible_name, updated_at) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(month_year, item_name, day, session) 
              DO UPDATE SET 
                stock_in_hands = excluded.stock_in_hands,
                consumed = excluded.consumed,
                balance = excluded.balance,
                responsible_name = excluded.responsible_name,
                updated_at = excluded.updated_at`,
        args: [
          log.month_year,
          log.item_name,
          log.day,
          log.session,
          log.new_stock,
          log.new_consumed,
          balance,
          log.updated_by,
          log.updated_at
        ]
      });
    }

    for (let i = 0; i < stockStatements.length; i += BATCH_SIZE) {
      const batch = stockStatements.slice(i, i + BATCH_SIZE);
      await client.batch(batch, 'write');
      console.log(`Inserted stock batch ${i / BATCH_SIZE + 1} (${batch.length} items)...`);
    }

    console.log('✨ Stock migration completed successfully!');
    
  } catch (err) {
    console.error('Error migrating stock logs:', err);
  }
}

migrateStockLogs();
