'use strict';
require('dotenv').config();
const { createClient } = require('@libsql/client');

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const month_year = '2026-05';

const stockData = [
  // Format: [item_name, [PM2_stock, PM2_cons], [AM3_stock, AM3_cons], [PM3_stock, PM3_cons], [AM4_stock, AM4_cons], [PM4_stock, PM4_cons]]
  ["Dextrose 50%", [8, 0], [8, 1], [8, 0], [8, 0], [8, 0]],
  ["Dextrose 500mg", [3, 1], [2, 0], [2, 0], [18, 0], [18, 0]],
  ["Paracetamol IV 1g", [27, 0], [27, 2], [25, 0], [23, 0], [23, 0]],
  ["Paracetamol 500mg ces", [108, 0], [108, 0], [108, 0], [90, 0], [90, 0]],
  ["Paracetamol suppo 250mg", [100, 0], [100, 1], [99, 0], [90, 0], [90, 0]],
  ["Paracetamol suppo 125mg", [110, 0], [110, 0], [110, 0], [90, 0], [90, 0]],
  ["Emitino 4mg", [19, 1], [18, 4], [14, 0], [26, 0], [26, 0]],
  ["Furosemide", [16, 0], [16, 0], [16, 0], [26, 0], [26, 0]],
  ["Vitamine B complex", [24, 0], [24, 0], [24, 0], [23, 0], [23, 0]],
  ["Adrenaline 1mg", [40, 0], [40, 18], [22, 8], [17, 4], [13, 0]],
  ["Dexamethasone 8mg", [20, 0], [20, 0], [20, 0], [20, 0], [20, 0]],
  ["Dexamethasone 4mg", [1, 0], [1, 0], [1, 0], [0, 0], [0, 0]],
  ["Ceftriaxone 1g", [5, 0], [5, 1], [4, 0], [5, 0], [5, 0]],
  ["Metronidazole 1g", [4, 0], [4, 0], [4, 0], [4, 0], [4, 0]],
  ["Tramadol 100mg", [30, 0], [30, 0], [30, 0], [30, 0], [30, 0]],
  ["Diclofenac 75mg", [23, 0], [23, 1], [22, 0], [17, 0], [17, 0]],
  ["Diclofenac suppo 100mg", [110, 0], [110, 1], [109, 0], [107, 0], [107, 0]],
  ["Esomeprazole 40mg", [13, 1], [12, 2], [10, 0], [11, 0], [11, 0]],
  ["sterile gloves no 8CM", [60, 0], [60, 0], [60, 0], [60, 0], [60, 0]],
  ["Dicynone", [2, 0], [2, 0], [2, 0], [8, 0], [8, 0]],
  ["Pause 500mg", [13, 0], [13, 0], [13, 0], [13, 0], [13, 0]],
  ["Normal saline 500mL", [32, 2], [30, 3], [27, 1], [46, 1], [45, 0]],
  ["Ringer lactate 500mL", [51, 0], [51, 8], [43, 0], [42, 0], [42, 0]],
  ["Giving set", [85, 1], [84, 5], [79, 0], [100, 1], [99, 0]],
  ["Papsmear", [22, 0], [22, 0], [22, 0], [19, 0], [19, 0]],
  ["Vaginal swab", [120, 0], [120, 0], [120, 0], [100, 0], [100, 0]],
  ["Povidone iodine solution", [17, 0], [17, 0], [17, 0], [17, 0], [17, 0]],
  ["Eaux oxygenee", [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]],
  ["Propofol", [15, 0], [15, 0], [15, 0], [15, 0], [15, 0]],
  ["Fentanyl", [1, 0], [1, 0], [1, 0], [1, 0], [1, 0]],
  ["ketamine", [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]],
  ["Pethidine", [42, 0], [42, 0], [42, 0], [42, 0], [42, 0]],
  ["MORPHINE", [20, 0], [20, 0], [20, 0], [20, 0], [20, 0]],
  ["Midazolam", [2, 0], [2, 0], [2, 0], [2, 0], [2, 0]],
  ["Nalaxoan", [4, 0], [4, 0], [4, 0], [4, 0], [4, 0]],
  ["Diazepam", [5, 0], [5, 0], [5, 0], [5, 0], [5, 0]],
  ["chlorpromazine 100mg", [1, 0], [1, 0], [1, 0], [1, 0], [1, 0]],
  ["Buscopan 20mg", [23, 0], [23, 0], [23, 0], [23, 0], [23, 0]],
  ["Marcaine%0.5", [5, 0], [5, 0], [5, 0], [5, 0], [5, 0]],
  ["Atropine", [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]],
  ["vicryl 5/O", [13, 0], [13, 0], [13, 0], [13, 0], [13, 0]],
  ["vicryl 4/O", [45, 0], [45, 0], [45, 0], [44, 0], [44, 0]],
  ["Vicryl 3/0", [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]],
  ["Vicryl 2/o", [17, 0], [17, 0], [17, 0], [17, 0], [17, 0]],
  ["Ethilon 2/0", [3, 0], [3, 0], [3, 0], [3, 0], [3, 0]],
  ["Ethilon 3/0", [4, 0], [4, 0], [4, 0], [4, 0], [4, 0]],
  ["Ethilon 4/0", [27, 0], [27, 0], [27, 0], [27, 0], [27, 0]],
  ["Ethilon 5/0", [92, 0], [92, 0], [92, 0], [92, 0], [92, 0]],
  ["Ethilon 6/0", [1, 0], [1, 0], [1, 0], [1, 0], [1, 0]],
  ["monocryl 6/0", [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]],
  ["Lidocaine", [18, 0], [18, 0], [18, 0], [18, 0], [18, 0]],
  ["surgical blades N23", [89, 0], [89, 0], [89, 2], [87, 0], [87, 0]],
  ["Surgical blades N21", [97, 0], [97, 0], [97, 0], [97, 0], [97, 0]],
  ["surgical bladeN15", [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]],
  ["surgical blade N12", [68, 0], [68, 0], [68, 0], [68, 0], [68, 0]],
  ["crepes bandage 7.5cm", [21, 0], [21, 0], [21, 0], [21, 0], [21, 0]],
  ["Crepe bandage 10cm", [54, 0], [54, 0], [54, 2], [52, 0], [52, 0]],
  ["crepe bandage 15cm", [21, 0], [21, 0], [21, 3], [18, 0], [18, 0]],
  ["vaseline gauze", [21, 0], [21, 0], [21, 0], [21, 0], [21, 0]],
  ["Gauze swab", [124, 0], [124, 0], [124, 0], [124, 0], [124, 0]],
  ["oxytocin inj", [277, 0], [277, 0], [277, 0], [277, 0], [277, 0]],
  ["cytotec", [4, 0], [4, 0], [4, 0], [4, 0], [4, 0]],
  ["proper gloves", [2000, 0], [200, 0], [200, 100], [1000, 200], [800, 0]],
  ["water for injection", [93, 2], [91, 15], [76, 3], [97, 1], [96, 0]],
  ["Syringe 2ml", [286, 0], [286, 0], [286, 0], [100, 0], [100, 0]],
  ["syringe 5ml", [85, 2], [83, 10], [73, 3], [88, 1], [87, 0]],
  ["syringe 10ml", [92, 3], [89, 20], [69, 4], [76, 0], [76, 0]],
  ["syringe 20ml", [54, 0], [54, 0], [54, 0], [3, 3], [0, 0]],
  ["needle 23", [75, 0], [75, 5], [70, 0], [52, 0], [52, 0]],
  ["needle 21", [89, 0], [89, 3], [86, 0], [0, 0], [0, 0]],
  ["needle 18", [79, 0], [79, 0], [79, 0], [0, 0], [0, 0]],
  ["Aquabloc 15×10", [16, 0], [16, 4], [12, 0], [12, 0], [12, 0]],
  ["neb mask adult", [12, 0], [12, 1], [11, 0], [14, 0], [14, 0]],
  ["Neb mask ped", [69, 0], [69, 5], [64, 2], [42, 2], [40, 0]],
  ["Aquabloc 10×10", [9, 0], [9, 0], [9, 0], [9, 0], [9, 0]],
  ["Urine drainage bag", [8, 0], [8, 0], [8, 0], [8, 0], [8, 0]],
  ["Foley balloon catheter fr 10", [11, 0], [11, 0], [11, 0], [11, 0], [11, 0]],
  ["Foley balloon catheter fr 12", [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]],
  ["Foley balloon catheter fr 16", [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]],
  ["Foley balloon catheter fr 18", [4, 0], [4, 0], [4, 0], [4, 0], [4, 0]],
  ["Foley balloon catheter fr 20", [36, 0], [36, 0], [36, 0], [36, 0], [36, 0]],
  ["Metoclopramide", [25, 0], [25, 0], [25, 0], [25, 0], [25, 0]],
  ["Hydrocortisone 100mg", [15, 0], [15, 5], [10, 2], [9, 1], [8, 0]],
  ["Phenytoine 250mg", [3, 0], [3, 0], [3, 0], [3, 0], [3, 0]],
  ["Salbutamol 2.5mg", [112, 0], [112, 10], [102, 0], [102, 0], [102, 0]],
  ["catheter G20", [160, 1], [159, 2], [157, 0], [167, 0], [167, 0]],
  ["Iv catheter G22", [103, 1], [102, 0], [102, 3], [82, 0], [82, 0]],
  ["Iv catheter G24", [96, 0], [96, 5], [91, 1], [89, 0], [89, 0]],
  ["Iv catheter G16", [180, 0], [180, 0], [180, 0], [21, 0], [21, 0]],
  ["Iv catheter G18", [171, 0], [171, 1], [170, 0], [174, 0], [174, 0]],
  ["IUD MIRENA", [41, 0], [41, 0], [41, 0], [41, 0], [41, 0]],
  ["CONDOM", [1000, 0], [1000, 0], [1000, 0], [1000, 0], [1000, 0]],
  ["SAYANA", [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]],
  ["JADELLE", [17, 0], [17, 0], [17, 0], [17, 0], [17, 0]],
  ["MICROGYN", [6, 0], [6, 0], [6, 0], [6, 0], [6, 0]],
  ["sterile gloves 8", [42, 0], [42, 0], [42, 0], [42, 0], [42, 0]],
  ["sterile gloves 7.5", [88, 0], [88, 0], [88, 2], [86, 0], [86, 0]],
  ["Hydralazine 20-25mg/ml", [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]],
];

(async () => {
  try {
    console.log('🚀 Seeding stock levels for May 2nd, 3rd, and 4th...');
    const statements = [];

    for (const [item, pm2, am3, pm3, am4, pm4] of stockData) {
      // 2-May PM
      statements.push({
        sql: `INSERT INTO nursing_monthly_stock (month_year, item_name, day, session, stock_in_hands, consumed, balance, responsible_name, updated_at)
              VALUES (?, ?, 2, 'PM', ?, ?, ?, 'RN Nurse', CURRENT_TIMESTAMP)
              ON CONFLICT(month_year, item_name, day, session) DO UPDATE SET
                stock_in_hands = excluded.stock_in_hands,
                consumed = excluded.consumed,
                balance = excluded.balance,
                responsible_name = excluded.responsible_name,
                updated_at = CURRENT_TIMESTAMP`,
        args: [month_year, item, pm2[0], pm2[1], pm2[0] - pm2[1]]
      });

      // 3-May AM
      statements.push({
        sql: `INSERT INTO nursing_monthly_stock (month_year, item_name, day, session, stock_in_hands, consumed, balance, responsible_name, updated_at)
              VALUES (?, ?, 3, 'AM', ?, ?, ?, 'RN Nurse', CURRENT_TIMESTAMP)
              ON CONFLICT(month_year, item_name, day, session) DO UPDATE SET
                stock_in_hands = excluded.stock_in_hands,
                consumed = excluded.consumed,
                balance = excluded.balance,
                responsible_name = excluded.responsible_name,
                updated_at = CURRENT_TIMESTAMP`,
        args: [month_year, item, am3[0], am3[1], am3[0] - am3[1]]
      });

      // 3-May PM
      statements.push({
        sql: `INSERT INTO nursing_monthly_stock (month_year, item_name, day, session, stock_in_hands, consumed, balance, responsible_name, updated_at)
              VALUES (?, ?, 3, 'PM', ?, ?, ?, 'RN Nurse', CURRENT_TIMESTAMP)
              ON CONFLICT(month_year, item_name, day, session) DO UPDATE SET
                stock_in_hands = excluded.stock_in_hands,
                consumed = excluded.consumed,
                balance = excluded.balance,
                responsible_name = excluded.responsible_name,
                updated_at = CURRENT_TIMESTAMP`,
        args: [month_year, item, pm3[0], pm3[1], pm3[0] - pm3[1]]
      });

      // 4-May AM
      statements.push({
        sql: `INSERT INTO nursing_monthly_stock (month_year, item_name, day, session, stock_in_hands, consumed, balance, responsible_name, updated_at)
              VALUES (?, ?, 4, 'AM', ?, ?, ?, 'RN Nurse', CURRENT_TIMESTAMP)
              ON CONFLICT(month_year, item_name, day, session) DO UPDATE SET
                stock_in_hands = excluded.stock_in_hands,
                consumed = excluded.consumed,
                balance = excluded.balance,
                responsible_name = excluded.responsible_name,
                updated_at = CURRENT_TIMESTAMP`,
        args: [month_year, item, am4[0], am4[1], am4[0] - am4[1]]
      });

      // 4-May PM
      statements.push({
        sql: `INSERT INTO nursing_monthly_stock (month_year, item_name, day, session, stock_in_hands, consumed, balance, responsible_name, updated_at)
              VALUES (?, ?, 4, 'PM', ?, ?, ?, 'RN Nurse', CURRENT_TIMESTAMP)
              ON CONFLICT(month_year, item_name, day, session) DO UPDATE SET
                stock_in_hands = excluded.stock_in_hands,
                consumed = excluded.consumed,
                balance = excluded.balance,
                responsible_name = excluded.responsible_name,
                updated_at = CURRENT_TIMESTAMP`,
        args: [month_year, item, pm4[0], pm4[1], pm4[0] - pm4[1]]
      });
    }

    console.log(`Executing ${statements.length} sql insert batches...`);
    await client.batch(statements);
    console.log('✅ Seeding complete!');
  } catch (err) {
    console.error('💥 Seeding error:', err);
  } finally {
    process.exit(0);
  }
})();
