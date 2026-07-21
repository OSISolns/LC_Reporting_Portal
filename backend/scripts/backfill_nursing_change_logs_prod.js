// Force the database wrapper to connect to production Turso database
process.env.lcreporting_TURSO_DATABASE_URL = "libsql://reporting-1-enigmatic-gemini-qt.aws-us-east-2.turso.io";
process.env.lcreporting_TURSO_AUTH_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3ODE1MzkxOTIsImlkIjoiMDE5ZWNiYmQtMDgwMS03ZDJmLTk2YjAtOWRiNGJiYWU0MWJmIiwicmlkIjoiYzgxNjNiNDktYTdhNi00MWI1LWExN2YtMzk5ZTEzNjJhZTQwIn0.Y_U-Sac5yphSFgvSLL3EfhUwMsctm8CanKYRHu8xKTJq-1ZLgODvtNWmYQqsuu5lZ8zI3BmwsVKCkeS81qjuDg";

const db = require('../src/config/db');

async function run() {
  console.log("Starting backfill of nursing change logs in production...");

  // 1. Get all log entries for Nursing (department 121)
  const { rows: logs } = await db.query(
    "SELECT * FROM consumables_log WHERE department_id = 121"
  );
  console.log(`Found ${logs.length} total nursing consumables log entries in production.`);

  // Group logs by month_year, item_name, day, session, isStn1
  const groups = {};

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
    const isStn1 = ward.toLowerCase().includes('station') || ward.toLowerCase().includes('stn');
    const nurse = (log.logged_by_name || 'System Sync').trim();

    const key = `${monthYear}||${log.item_name}||${day}||${session}||${isStn1 ? 'STN1' : 'MINOR'}`;
    if (!groups[key]) {
      groups[key] = {
        monthYear,
        itemName: log.item_name,
        day,
        session,
        isStn1,
        qty: 0,
        nurses: new Set(),
        consumedAt: log.consumed_at
      };
    }
    groups[key].qty += Number(log.quantity) || 0;
    if (nurse) {
      groups[key].nurses.add(nurse);
    }
  }

  let backfilledCount = 0;

  for (const key of Object.keys(groups)) {
    const group = groups[key];
    const { monthYear, itemName, day, session, isStn1, qty, nurses, consumedAt } = group;

    // Fetch current state from nursing_monthly_stock
    const { rows: stockRows } = await db.query(
      `SELECT * FROM nursing_monthly_stock 
       WHERE item_name = $1 AND day = $2 AND session = $3 AND month_year = $4`,
      [itemName, day, session, monthYear]
    );

    let stockRow = stockRows[0];
    if (!stockRow) {
      // Create missing stock row first
      const fallbackStock = qty * 2;
      console.log(`Creating missing stock row in prod for ${itemName} on day ${day} (${session}) with stock ${fallbackStock}`);
      const { rows: newRows } = await db.query(
        `INSERT INTO nursing_monthly_stock (
          month_year, item_name, day, session, stock_in_hands, consumed, balance,
          consumed_obs1, consumed_minor, user_stn1, user_minor, responsible_name, status, manually_edited
        ) VALUES ($1, $2, $3, $4, $5, 0, $5, 0, 0, '', '', 'Backfill Sync', 'Available', 1)
        RETURNING *`,
        [monthYear, itemName, day, session, fallbackStock]
      );
      stockRow = newRows[0];
    }

    const stockInHands = Number(stockRow.stock_in_hands) || 0;
    const currentObs1 = Number(stockRow.consumed_obs1) || 0;
    const currentMinor = Number(stockRow.consumed_minor) || 0;
    const currentQty = isStn1 ? currentObs1 : currentMinor;

    if (currentQty < qty) {
      const diff = qty - currentQty;
      console.log(`Missing consumption detected in prod for ${itemName} on day ${day} (${session}, ward: ${isStn1 ? 'STN1' : 'MINOR'}). Current: ${currentQty}, Expected: ${qty}. Backfilling...`);

      const newObs1 = isStn1 ? qty : currentObs1;
      const newMinor = !isStn1 ? qty : currentMinor;
      const oldConsumed = currentObs1 + currentMinor;
      const newConsumed = newObs1 + newMinor;

      const updaterName = Array.from(nurses).join(', ') || 'System Sync';

      // 1. Check if corresponding change log already exists
      const { rows: existingLogs } = await db.query(
        `SELECT id FROM nursing_stock_change_logs 
         WHERE item_name = $1 AND day = $2 AND session = $3 AND month_year = $4 
           AND old_consumed_obs1 = $5 AND new_consumed_obs1 = $6
           AND old_consumed_minor = $7 AND new_consumed_minor = $8
           AND updated_by = $9`,
        [itemName, day, session, monthYear, currentObs1, newObs1, currentMinor, newMinor, updaterName]
      );

      if (existingLogs.length === 0) {
        // Insert change log
        await db.query(`
          INSERT INTO nursing_stock_change_logs (
            month_year, item_name, day, session, old_stock, new_stock, old_consumed, new_consumed, updated_by,
            old_consumed_obs1, new_consumed_obs1, old_consumed_minor, new_consumed_minor,
            old_user_stn1, new_user_stn1, old_user_minor, new_user_minor, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        `, [
          monthYear, itemName, day, session,
          stockInHands, stockInHands,
          oldConsumed, newConsumed,
          updaterName,
          currentObs1, newObs1,
          currentMinor, newMinor,
          isStn1 ? null : (stockRow.user_stn1 || null),
          isStn1 ? (updaterName || null) : (stockRow.user_stn1 || null),
          !isStn1 ? null : (stockRow.user_minor || null),
          !isStn1 ? (updaterName || null) : (stockRow.user_minor || null),
          consumedAt // preserve original consumption timestamp
        ]);
        backfilledCount++;
      }

      // 2. Update stock checkup
      const existingUserStn1 = stockRow.user_stn1 || '';
      const existingUserMinor = stockRow.user_minor || '';
      const newUserStn1 = isStn1 
        ? Array.from(new Set([...existingUserStn1.split(', ').filter(Boolean), ...nurses])).join(', ')
        : existingUserStn1;
      const newUserMinor = !isStn1
        ? Array.from(new Set([...existingUserMinor.split(', ').filter(Boolean), ...nurses])).join(', ')
        : existingUserMinor;

      await db.query(`
        UPDATE nursing_monthly_stock
        SET consumed_obs1 = $1, consumed_minor = $2, consumed = $3, balance = $4,
            user_stn1 = $5, user_minor = $6, manually_edited = 1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $7
      `, [newObs1, newMinor, newConsumed, stockInHands - newConsumed, newUserStn1, newUserMinor, stockRow.id]);
    }
  }

  console.log(`Backfill complete in prod. Backfilled ${backfilledCount} missing change log rows.`);
}

run().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
