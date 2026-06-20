const db = require('../src/config/db');
const { createClient } = require('@libsql/client');
const path = require('path');
const fs = require('fs');

async function run() {
  console.log('🔌 Connecting to Turso Cloud...');
  
  try {
    const dbFiles = [
      'reporting-1 (3).db',
      'reporting-1 (1).db',
      'reporting-1.db',
      'reporting-1_local_backup.db',
      'backend/local.db'
    ];

    const mergedStock = new Map(); // key: "monthYear_itemName_day_session" -> row
    const mergedLogs = [];         // Array of unique logs

    // Set to keep track of already seen logs to deduplicate
    const seenLogs = new Set();

    for (const file of dbFiles) {
      const fullPath = path.join(__dirname, '../..', file);
      if (!fs.existsSync(fullPath)) continue;

      console.log(`\nReading stock and logs from "${file}"...`);
      const localClient = createClient({ url: `file:${fullPath}` });

      try {
        // ── Process Monthly Stock ─────────────────────────────────────────────
        const { rows: stockRows } = await localClient.execute('SELECT * FROM nursing_monthly_stock');
        let sAdded = 0;
        for (const row of stockRows) {
          const monthYear = row.month_year !== undefined && row.month_year !== null ? String(row.month_year) : '';
          const itemName = row.item_name !== undefined && row.item_name !== null ? String(row.item_name) : '';
          const day = row.day !== undefined && row.day !== null ? Number(row.day) : 0;
          const session = row.session !== undefined && row.session !== null ? String(row.session) : '';

          if (!monthYear || !itemName || !session) continue;

          const key = `${monthYear}_${itemName}_${day}_${session}`;
          const existing = mergedStock.get(key);

          // Build a clean row object, converting types properly
          const cleanRow = {
            month_year: monthYear,
            item_name: itemName,
            day: day,
            session: session,
            stock_in_hands: row.stock_in_hands !== undefined && row.stock_in_hands !== null ? Number(row.stock_in_hands) : 0,
            consumed: row.consumed !== undefined && row.consumed !== null ? Number(row.consumed) : 0,
            balance: row.balance !== undefined && row.balance !== null ? Number(row.balance) : 0,
            responsible_name: row.responsible_name !== undefined && row.responsible_name !== null ? String(row.responsible_name) : null,
            expiration_date: row.expiration_date !== undefined && row.expiration_date !== null ? String(row.expiration_date) : null,
            status: row.status !== undefined && row.status !== null ? String(row.status) : null,
            category: row.category !== undefined && row.category !== null ? String(row.category) : null,
            consumed_obs1: row.consumed_obs1 !== undefined && row.consumed_obs1 !== null ? Number(row.consumed_obs1) : 0,
            consumed_minor: row.consumed_minor !== undefined && row.consumed_minor !== null ? Number(row.consumed_minor) : 0,
            user_stn1: row.user_stn1 !== undefined && row.user_stn1 !== null ? String(row.user_stn1) : null,
            user_minor: row.user_minor !== undefined && row.user_minor !== null ? String(row.user_minor) : null,
            created_at: row.created_at !== undefined && row.created_at !== null ? String(row.created_at) : null,
            updated_at: row.updated_at !== undefined && row.updated_at !== null ? String(row.updated_at) : null
          };

          if (!existing) {
            mergedStock.set(key, cleanRow);
            sAdded++;
          } else {
            // Keep the one with higher activity or latest update if different
            const existingTotal = existing.stock_in_hands + existing.consumed;
            const newTotal = cleanRow.stock_in_hands + cleanRow.consumed;
            if (newTotal > existingTotal) {
              mergedStock.set(key, cleanRow);
            }
          }
        }
        console.log(`  Processed ${stockRows.length} stock rows (added/updated ${sAdded} unique keys).`);

        // ── Process Stock Change Logs ─────────────────────────────────────────
        const { rows: logsRows } = await localClient.execute('SELECT * FROM nursing_stock_change_logs');
        let lAdded = 0;
        for (const row of logsRows) {
          const monthYear = row.month_year !== undefined && row.month_year !== null ? String(row.month_year) : '';
          const itemName = row.item_name !== undefined && row.item_name !== null ? String(row.item_name) : '';
          const day = row.day !== undefined && row.day !== null ? Number(row.day) : 0;
          const session = row.session !== undefined && row.session !== null ? String(row.session) : '';
          const oldStock = row.old_stock !== undefined && row.old_stock !== null ? Number(row.old_stock) : null;
          const newStock = row.new_stock !== undefined && row.new_stock !== null ? Number(row.new_stock) : null;
          const oldConsumed = row.old_consumed !== undefined && row.old_consumed !== null ? Number(row.old_consumed) : null;
          const newConsumed = row.new_consumed !== undefined && row.new_consumed !== null ? Number(row.new_consumed) : null;
          const updatedBy = row.updated_by !== undefined && row.updated_by !== null ? String(row.updated_by) : null;
          const updatedAt = row.updated_at !== undefined && row.updated_at !== null ? String(row.updated_at) : '';

          // Build a unique fingerprint for log row to avoid duplicates
          const fingerprint = `${monthYear}_${itemName}_${day}_${session}_${oldStock}_${newStock}_${oldConsumed}_${newConsumed}_${updatedBy}_${updatedAt}`;
          
          if (seenLogs.has(fingerprint)) continue;
          seenLogs.add(fingerprint);

          mergedLogs.push({
            month_year: monthYear,
            item_name: itemName,
            day: day,
            session: session,
            old_stock: oldStock,
            new_stock: newStock,
            old_consumed: oldConsumed,
            new_consumed: newConsumed,
            updated_by: updatedBy,
            updated_at: updatedAt || null,
            old_consumed_obs1: row.old_consumed_obs1 !== undefined && row.old_consumed_obs1 !== null ? Number(row.old_consumed_obs1) : 0,
            new_consumed_obs1: row.new_consumed_obs1 !== undefined && row.new_consumed_obs1 !== null ? Number(row.new_consumed_obs1) : 0,
            old_consumed_minor: row.old_consumed_minor !== undefined && row.old_consumed_minor !== null ? Number(row.old_consumed_minor) : 0,
            new_consumed_minor: row.new_consumed_minor !== undefined && row.new_consumed_minor !== null ? Number(row.new_consumed_minor) : 0,
            old_user_stn1: row.old_user_stn1 !== undefined && row.old_user_stn1 !== null ? String(row.old_user_stn1) : null,
            new_user_stn1: row.new_user_stn1 !== undefined && row.new_user_stn1 !== null ? String(row.new_user_stn1) : null,
            old_user_minor: row.old_user_minor !== undefined && row.old_user_minor !== null ? String(row.old_user_minor) : null,
            new_user_minor: row.new_user_minor !== undefined && row.new_user_minor !== null ? String(row.new_user_minor) : null
          });
          lAdded++;
        }
        console.log(`  Processed ${logsRows.length} change log rows (added ${lAdded} unique logs).`);

      } catch (e) {
        console.log(`  Error processing "${file}": ${e.message}`);
      } finally {
        localClient.close();
      }
    }

    console.log(`\n📊 Merge results:`);
    console.log(`  Total unique stock rows to insert: ${mergedStock.size}`);
    console.log(`  Total unique change logs to insert: ${mergedLogs.length}`);

    // 3. Clear Turso tables
    console.log('\n🧹 Clearing existing stock data in Turso Cloud...');
    await db.query('DELETE FROM nursing_monthly_stock');
    await db.query('DELETE FROM nursing_stock_change_logs');

    // 4. Batch Insert Stock
    console.log('Inserting merged stock to Turso Cloud...');
    const stockArray = Array.from(mergedStock.values());
    const batchSize = 100;
    for (let i = 0; i < stockArray.length; i += batchSize) {
      const chunk = stockArray.slice(i, i + batchSize);
      const stmts = chunk.map(row => ({
        sql: `INSERT INTO nursing_monthly_stock (
                month_year, item_name, day, session, stock_in_hands, consumed, balance,
                responsible_name, expiration_date, status, category,
                consumed_obs1, consumed_minor, user_stn1, user_minor, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          row.month_year, row.item_name, row.day, row.session, row.stock_in_hands, row.consumed, row.balance,
          row.responsible_name, row.expiration_date, row.status, row.category,
          row.consumed_obs1, row.consumed_minor, row.user_stn1, row.user_minor, row.created_at, row.updated_at
        ]
      }));
      await db.batch(stmts);
    }
    console.log('✅ Stock rows restored successfully.');

    // 5. Batch Insert Logs
    console.log('Inserting merged change logs to Turso Cloud...');
    for (let i = 0; i < mergedLogs.length; i += batchSize) {
      const chunk = mergedLogs.slice(i, i + batchSize);
      const stmts = chunk.map(row => ({
        sql: `INSERT INTO nursing_stock_change_logs (
                month_year, item_name, day, session, old_stock, new_stock, old_consumed, new_consumed,
                updated_by, updated_at, old_consumed_obs1, new_consumed_obs1, old_consumed_minor, new_consumed_minor,
                old_user_stn1, new_user_stn1, old_user_minor, new_user_minor
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          row.month_year, row.item_name, row.day, row.session, row.old_stock, row.new_stock, row.old_consumed, row.new_consumed,
          row.updated_by, row.updated_at, row.old_consumed_obs1, row.new_consumed_obs1, row.old_consumed_minor, row.new_consumed_minor,
          row.old_user_stn1, row.new_user_stn1, row.old_user_minor, row.new_user_minor
        ]
      }));
      await db.batch(stmts);
    }
    console.log('✅ Change logs restored successfully.');

    const { rows: finalStock } = await db.query('SELECT COUNT(*) as cnt FROM nursing_monthly_stock');
    const { rows: finalLogs } = await db.query('SELECT COUNT(*) as cnt FROM nursing_stock_change_logs');
    console.log(`\n🎉 Stock restore complete.\nTurso nursing_monthly_stock count: ${finalStock[0]?.cnt}\nTurso nursing_stock_change_logs count: ${finalLogs[0]?.cnt}`);

    process.exit(0);
  } catch (err) {
    console.error('Error during stock restore:', err);
    process.exit(1);
  }
}

run();
