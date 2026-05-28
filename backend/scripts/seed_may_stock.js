'use strict';
require('dotenv').config();
const { createClient } = require('@libsql/client');

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const month_year = '2026-05';

const stockData = [
  // Format: [item_name, [AM9_stock, AM9_cons], [PM9_stock, PM9_cons], [AM10_stock, AM10_cons], [PM10_stock, PM10_cons]]
  ["Dextrose 50%", [6, 0], [6, 1], [5, 0], [55, 0]],
  ["Dextrose 500mg", [15, 0], [15, 0], [15, 0], [15, 0]],
  ["Paracetamol IV 1g", [11, 2], [9, 1], [8, 5], [17, 0]],
  ["Paracetamol 500mg ces", [90, 0], [90, 2], [88, 2], [86, 0]],
  ["Paracetamol suppo 250mg", [90, 0], [90, 0], [90, 0], [90, 0]],
  ["Paracetamol suppo 125mg", [89, 0], [89, 0], [89, 0], [89, 0]],
  ["Emitino 4mg", [57, 3], [57, 0], [57, 4], [28, 0]],
  ["Furosemide", [28, 0], [28, 0], [28, 0], [28, 0]],
  ["Vitamine B complex", [20, 0], [20, 0], [20, 1], [9, 0]],
  ["Adrenaline 1mg", [12, 3], [9, 3], [10, 1], [68, 2]],
  ["Dexamethasone 8mg", [20, 2], [20, 0], [20, 1], [47, 0]],
  ["Dexamethasone 4mg", [4, 0], [4, 0], [4, 0], [4, 0]],
  ["Ceftriaxone 1g", [44, 0], [44, 0], [44, 1], [45, 0]],
  ["Metronidazole 1g", [3, 1], [3, 0], [2, 0], [3, 0]],
  ["Tramadol 100mg", [29, 0], [29, 0], [29, 0], [29, 0]],
  ["Diclofenac 75mg", [42, 1], [41, 0], [41, 0], [32, 0]],
  ["Diclofenac suppo 100mg", [107, 3], [104, 0], [104, 0], [104, 0]],
  ["Esomeprazole 40mg", [16, 1], [15, 0], [15, 0], [28, 0]],
  ["sterile gloves no 8CM", [60, 0], [60, 1], [59, 0], [59, 0]],
  ["Dicynone", [8, 0], [8, 0], [8, 0], [8, 0]],
  ["Pause 500mg", [10, 0], [10, 0], [10, 0], [10, 0]],
  ["Normal saline 500mL", [60, 6], [54, 2], [52, 7], [45, 0]],
  ["Ringer lactate 500mL", [35, 3], [32, 0], [32, 3], [29, 0]],
  ["Giving set", [131, 5], [128, 3], [123, 7], [118, 0]],
  ["Papsmear", [19, 0], [19, 0], [19, 0], [19, 0]],
  ["Vaginal swab", [100, 0], [100, 0], [100, 0], [100, 0]],
  ["Povidone iodine solution", [17, 0], [17, 1], [16, 1], [15, 0]],
  ["Eaux oxygenee", [0, 0], [0, 0], [0, 2], [0, 0]],
  ["Propofol", [13, 0], [13, 2], [11, 0], [11, 0]],
  ["Fentanyl", [1, 0], [1, 1], [0, 0], [0, 0]],
  ["ketamine", [0, 0], [0, 0], [0, 0], [0, 0]],
  ["Pethidine", [42, 0], [42, 0], [42, 0], [42, 0]],
  ["MORPHINE", [20, 0], [20, 0], [20, 0], [20, 0]],
  ["Midazolam", [2, 0], [2, 0], [2, 0], [2, 0]],
  ["Nalaxoan", [4, 0], [4, 0], [4, 0], [4, 0]],
  ["Diazepam", [5, 0], [5, 0], [5, 0], [5, 0]],
  ["chlorpromazine 100mg", [4, 0], [4, 0], [4, 0], [4, 0]],
  ["Buscopan 20mg", [18, 1], [17, 0], [17, 0], [29, 0]],
  ["Marcaine%0.5", [5, 0], [5, 0], [5, 0], [5, 0]],
  ["Atropine", [0, 0], [0, 0], [0, 0], [0, 0]],
  ["vicryl 5/O", [13, 0], [13, 0], [13, 0], [13, 0]],
  ["vicryl 4/O", [44, 0], [44, 0], [44, 0], [44, 0]],
  ["Vicryl 3/0", [0, 0], [0, 0], [0, 0], [0, 0]],
  ["Vicryl 2/o", [17, 0], [17, 0], [17, 0], [17, 0]],
  ["Ethilon 2/0", [2, 0], [2, 0], [2, 0], [2, 0]],
  ["Ethilon 3/0", [4, 0], [4, 0], [4, 0], [4, 0]],
  ["Ethilon 4/0", [27, 0], [27, 0], [27, 0], [27, 0]],
  ["Ethilon 5/0", [92, 0], [92, 0], [92, 0], [92, 0]],
  ["Ethilon 6/0", [1, 0], [1, 0], [1, 0], [1, 0]],
  ["monocryl 6/0", [0, 0], [0, 0], [0, 0], [0, 0]],
  ["Lidocaine", [18, 0], [18, 0], [18, 0], [18, 0]],
  ["surgical blades N23", [86, 0], [86, 1], [85, 2], [83, 0]],
  ["Surgical blades N21", [97, 0], [97, 0], [97, 0], [97, 0]],
  ["surgical bladeN15", [0, 0], [0, 0], [0, 0], [0, 0]],
  ["surgical blade N12", [68, 0], [68, 0], [68, 0], [68, 0]],
  ["crepes bandage 7.5cm", [21, 0], [21, 0], [21, 1], [20, 0]],
  ["Crepe bandage 10cm", [52, 0], [52, 0], [52, 0], [52, 0]],
  ["crepe bandage 15cm", [18, 0], [18, 0], [18, 0], [18, 0]],
  ["vaseline gauze", [21, 0], [21, 0], [21, 0], [21, 0]],
  ["Gauze swab", [124, 0], [124, 0], [124, 0], [124, 0]],
  ["oxytocin inj", [277, 0], [277, 0], [277, 0], [277, 0]],
  ["cytotec", [4, 0], [4, 0], [4, 0], [4, 0]],
  ["proper gloves", [800, 400], [400, 0], [400, 200], [600, 0]],
  ["water for injection", [76, 5], [71, 5], [66, 7], [59, 1]],
  ["Syringe 2ml", [100, 0], [100, 0], [100, 0], [100, 1]],
  ["syringe 5ml", [61, 5], [56, 4], [52, 10], [42, 3]],
  ["syringe 10ml", [145, 6], [139, 2], [137, 10], [127, 2]],
  ["syringe 20ml", [0, 0], [0, 1], [15, 0], [15, 0]],
  ["needle 23", [52, 0], [52, 0], [52, 0], [52, 0]],
  ["needle 21", [0, 0], [0, 0], [0, 0], [0, 0]],
  ["needle 18", [0, 0], [0, 0], [0, 0], [0, 0]],
  ["Aquabloc 15×10", [9, 0], [9, 0], [9, 0], [9, 0]],
  ["neb mask adult", [13, 0], [13, 0], [13, 2], [11, 0]],
  ["Neb mask ped", [32, 2], [30, 0], [30, 0], [30, 3]],
  ["Aquabloc 10×10", [9, 0], [9, 0], [9, 0], [9, 0]],
  ["Urine drainage bag", [8, 0], [8, 0], [8, 0], [8, 0]],
  ["Foley balloon catheter fr 10", [11, 0], [11, 0], [11, 0], [11, 0]],
  ["Foley balloon catheter fr 12", [0, 0], [0, 0], [0, 0], [0, 0]],
  ["Foley balloon catheter fr 16", [0, 0], [0, 0], [0, 0], [0, 0]],
  ["Foley balloon catheter fr 18", [4, 0], [4, 0], [4, 0], [4, 0]],
  ["Foley balloon catheter fr 20", [36, 0], [36, 0], [36, 0], [36, 0]],
  ["Metoclopramide", [25, 0], [25, 0], [25, 0], [25, 0]],
  ["Hydrocortisone 100mg", [2, 0], [2, 1], [15, 2], [19, 0]],
  ["Phenytoine 250mg", [4, 0], [4, 0], [4, 0], [4, 0]],
  ["Salbutamol 2.5mg", [71, 8], [63, 0], [63, 8], [110, 0]],
  ["catheter G20", [157, 1], [156, 1], [155, 3], [152, 0]],
  ["Iv catheter G22", [70, 4], [66, 1], [65, 7], [58, 0]],
  ["Iv catheter G24", [65, 5], [60, 0], [60, 3], [60, 3]],
  ["Iv catheter G16", [21, 0], [21, 0], [21, 3], [18, 0]],
  ["Iv catheter G18", [168, 0], [168, 0], [168, 2], [166, 0]],
  ["IUD MIRENA", [41, 0], [41, 0], [41, 0], [41, 0]],
  ["CONDOM", [1000, 0], [1000, 0], [1000, 0], [1000, 0]],
  ["SAYANA", [0, 0], [0, 0], [0, 0], [0, 0]],
  ["JADELLE", [17, 0], [17, 0], [17, 0], [17, 0]],
  ["MICROGYN", [6, 0], [6, 0], [6, 0], [6, 0]],
  ["sterile gloves 8", [42, 0], [42, 0], [42, 1], [42, 0]],
  ["sterile gloves 7.5", [82, 0], [82, 2], [80, 2], [78, 0]],
  ["Hydralazine 20-25mg/ml", [0, 0], [0, 0], [0, 0], [0, 0]],
];

(async () => {
  try {
    console.log('🚀 Seeding stock levels for 9-May and 10-May...');
    const statements = [];

    for (const [item, am9, pm9, am10, pm10] of stockData) {
      // 9-May AM
      statements.push({
        sql: `INSERT INTO nursing_monthly_stock (month_year, item_name, day, session, stock_in_hands, consumed, balance, responsible_name, updated_at)
              VALUES (?, ?, 9, 'AM', ?, ?, ?, 'RN Nurse', CURRENT_TIMESTAMP)
              ON CONFLICT(month_year, item_name, day, session) DO UPDATE SET
                stock_in_hands = excluded.stock_in_hands,
                consumed = excluded.consumed,
                balance = excluded.balance,
                responsible_name = excluded.responsible_name,
                updated_at = CURRENT_TIMESTAMP`,
        args: [month_year, item, am9[0], am9[1], am9[0] - am9[1]]
      });

      // 9-May PM
      statements.push({
        sql: `INSERT INTO nursing_monthly_stock (month_year, item_name, day, session, stock_in_hands, consumed, balance, responsible_name, updated_at)
              VALUES (?, ?, 9, 'PM', ?, ?, ?, 'RN Nurse', CURRENT_TIMESTAMP)
              ON CONFLICT(month_year, item_name, day, session) DO UPDATE SET
                stock_in_hands = excluded.stock_in_hands,
                consumed = excluded.consumed,
                balance = excluded.balance,
                responsible_name = excluded.responsible_name,
                updated_at = CURRENT_TIMESTAMP`,
        args: [month_year, item, pm9[0], pm9[1], pm9[0] - pm9[1]]
      });

      // 10-May AM
      statements.push({
        sql: `INSERT INTO nursing_monthly_stock (month_year, item_name, day, session, stock_in_hands, consumed, balance, responsible_name, updated_at)
              VALUES (?, ?, 10, 'AM', ?, ?, ?, 'RN Nurse', CURRENT_TIMESTAMP)
              ON CONFLICT(month_year, item_name, day, session) DO UPDATE SET
                stock_in_hands = excluded.stock_in_hands,
                consumed = excluded.consumed,
                balance = excluded.balance,
                responsible_name = excluded.responsible_name,
                updated_at = CURRENT_TIMESTAMP`,
        args: [month_year, item, am10[0], am10[1], am10[0] - am10[1]]
      });

      // 10-May PM
      statements.push({
        sql: `INSERT INTO nursing_monthly_stock (month_year, item_name, day, session, stock_in_hands, consumed, balance, responsible_name, updated_at)
              VALUES (?, ?, 10, 'PM', ?, ?, ?, 'RN Nurse', CURRENT_TIMESTAMP)
              ON CONFLICT(month_year, item_name, day, session) DO UPDATE SET
                stock_in_hands = excluded.stock_in_hands,
                consumed = excluded.consumed,
                balance = excluded.balance,
                responsible_name = excluded.responsible_name,
                updated_at = CURRENT_TIMESTAMP`,
        args: [month_year, item, pm10[0], pm10[1], pm10[0] - pm10[1]]
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
