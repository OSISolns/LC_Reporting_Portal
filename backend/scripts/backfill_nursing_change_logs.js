const db = require('../src/config/db');

async function run() {
  console.log("Starting backfill of nursing change logs...");
  
  // 1. Get all log entries for Nursing (department 121)
  const { rows: logs } = await db.query(
    "SELECT * FROM consumables_log WHERE department_id = 121"
  );
  console.log(`Found ${logs.length} total nursing consumables log entries.`);

  let backfilledCount = 0;

  for (const log of logs) {
    // Parse Kigali date from consumed_at (UTC string)
    const dt = new Date(log.consumed_at);
    const kigaliTime = new Date(dt.getTime() + (2 * 60 * 60 * 1000));
    const y = kigaliTime.getUTCFullYear();
    const m = String(kigaliTime.getUTCMonth() + 1).padStart(2, '0');
    const day = kigaliTime.getUTCDate();
    const monthYear = `${y}-${m}`;
    const session = log.session || 'AM';
    const ward = log.ward || 'Station 1';

    // 2. Check if a corresponding change log already exists
    // We search for a change log matching item_name, day, session, month_year, and showing consumption increase
    const { rows: existingLogs } = await db.query(
      `SELECT id FROM nursing_stock_change_logs 
       WHERE item_name = $1 AND day = $2 AND session = $3 AND month_year = $4 
         AND (new_consumed_obs1 > old_consumed_obs1 OR new_consumed_minor > old_consumed_minor)
         AND updated_by = $5`,
      [log.item_name, day, session, monthYear, log.logged_by_name]
    );

    if (existingLogs.length > 0) {
      console.log(`Row already exists for ${log.item_name} on day ${day} (${session}) - skipping.`);
      continue;
    }

    console.log(`Missing change log detected for ${log.item_name} on day ${day} (${session}, qty: ${log.quantity}). Backfilling...`);

    // 3. Fetch current state from nursing_monthly_stock
    const { rows: stockRows } = await db.query(
      `SELECT * FROM nursing_monthly_stock 
       WHERE item_name = $1 AND day = $2 AND session = $3 AND month_year = $4`,
      [log.item_name, day, session, monthYear]
    );

    const stockRow = stockRows[0] || {};
    const stockInHands = Number(stockRow.stock_in_hands) || Number(log.quantity) * 2; // fallback
    const currentObs1 = Number(stockRow.consumed_obs1) || 0;
    const currentMinor = Number(stockRow.consumed_minor) || 0;

    const isStn1 = ward.toLowerCase().includes('station') || ward.toLowerCase().includes('stn');
    const qty = Number(log.quantity) || 0;

    const newObs1 = isStn1 ? currentObs1 : currentObs1;
    const oldObs1 = isStn1 ? Math.max(0, currentObs1 - qty) : currentObs1;
    const newMinor = !isStn1 ? currentMinor : currentMinor;
    const oldMinor = !isStn1 ? Math.max(0, currentMinor - qty) : currentMinor;

    const oldConsumed = oldObs1 + oldMinor;
    const newConsumed = newObs1 + newMinor;

    await db.query(`
      INSERT INTO nursing_stock_change_logs (
        month_year, item_name, day, session, old_stock, new_stock, old_consumed, new_consumed, updated_by,
        old_consumed_obs1, new_consumed_obs1, old_consumed_minor, new_consumed_minor,
        old_user_stn1, new_user_stn1, old_user_minor, new_user_minor, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
    `, [
      monthYear, log.item_name, day, session,
      stockInHands, stockInHands,
      oldConsumed, newConsumed,
      log.logged_by_name || 'System Sync',
      oldObs1, newObs1,
      oldMinor, newMinor,
      isStn1 ? null : (stockRow.user_stn1 || null),
      isStn1 ? (log.logged_by_name || null) : (stockRow.user_stn1 || null),
      !isStn1 ? null : (stockRow.user_minor || null),
      !isStn1 ? (log.logged_by_name || null) : (stockRow.user_minor || null),
      log.consumed_at // preserve original consumption timestamp
    ]);

    backfilledCount++;
  }

  console.log(`Backfill complete. Backfilled ${backfilledCount} missing change log rows.`);
}

run().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
