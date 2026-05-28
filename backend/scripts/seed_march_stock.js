'use strict';
require('dotenv').config();
const { createClient } = require('@libsql/client');

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const month_year = '2026-03';

const stockData = [
  // Format: [item_name, [PM29_stock, PM29_cons], [AM30_stock, AM30_cons], [PM30_stock, PM30_cons], [AM31_stock, AM31_cons]]
  ["Dextrose 50%", [36, 2], [0, 0], [34, 0], [34, 0]],
  ["Dextrose 500mg", [43, 2], [41, 0], [41, 0], [41, 0]],
  ["Paracetamol IV 1g", [29, 3], [26, 5], [21, 2], [19, 3]],
  ["Paracetamol 500mg ces", [25, 0], [25, 0], [25, 0], [25, 2]],
  ["Paracetamol suppo 250mg", [25, 0], [25, 0], [25, 0], [25, 10]],
  ["Paracetamol suppo 125mg", [112, 0], [112, 0], [112, 0], [112, 0]],
  ["Emitino 4mg", [20, 5], [15, 4], [11, 1], [10, 3]],
  ["Furosemide", [22, 0], [22, 0], [22, 0], [22, 0]],
  ["Vitamine B complex", [15, 0], [15, 0], [15, 0], [15, 7]],
  ["Adrenaline 1mg", [63, 6], [57, 2], [55, 0], [55, 12]],
  ["Dexamethasone 8mg", [37, 0], [37, 0], [37, 2], [35, 1]],
  ["Dexamethasone 4mg", [-1, 0], [0, 0], [20, 2], [18, 1]],
  ["Ceftriaxone 1g", [53, 1], [52, 1], [51, 1], [50, 1]],
  ["Metronidazole 1g", [10, 0], [10, 0], [10, 0], [10, 0]],
  ["Tramadol 100mg", [28, 0], [28, 0], [28, 0], [28, 0]],
  ["Diclofenac 75mg", [48, 3], [45, 0], [13, 1], [12, 0]],
  ["Diclofenac suppo 100mg", [5, 0], [5, 0], [5, 0], [33, 10]],
  ["Esomeprazole 40mg", [39, 0], [39, 1], [38, 0], [38, 0]],
  ["sterile gloves no 8CM", [-1, 0], [-1, 0], [0, 0], [0, 8]],
  ["Dicynone", [1, 0], [1, 0], [1, 0], [1, 0]],
  ["Pause 500mg", [4, 0], [4, 0], [4, 0], [4, 0]],
  ["Normal saline 500mL", [62, 5], [57, 4], [53, 2], [51, 6]],
  ["Ringer lactate 500mL", [39, 7], [32, 1], [31, 1], [30, 1]],
  ["Giving set", [4, 7], [10, 5], [5, 2], [3, 3]],
  ["Papsmear", [13, 0], [13, 0], [13, 0], [13, 4]],
  ["Vaginal swab", [120, 0], [120, 0], [120, 0], [120, 0]],
  ["Povidone iodine solution", [13, 0], [13, 1], [12, 0], [12, 0]],
  ["Eaux oxygenee", [0, 0], [0, 0], [0, 0], [0, 0]],
  ["Propofol", [0, 1], [10, 1], [9, 0], [9, 0]],
  ["Fentanyl", [0, 0], [10, 1], [9, 0], [9, 0]],
  ["ketamine", [0, 0], [0, 0], [0, 0], [0, 0]],
  ["Pethidine", [43, 0], [43, 0], [43, 0], [43, 0]],
  ["MORPHINE", [14, 0], [14, 0], [14, 0], [14, 2]],
  ["Midazolam", [5, 0], [5, 0], [5, 0], [5, 0]],
  ["Nalaxoan", [1, 0], [1, 0], [1, 0], [1, 0]],
  ["Diazepam", [9, 0], [9, 0], [9, 0], [9, 0]],
  ["chlorpromazine 100mg", [20, 0], [20, 0], [20, 0], [20, 0]],
  ["Buscopan 20mg", [36, 0], [36, 0], [36, 0], [36, 0]],
  ["Marcaine%0.5", [0, 0], [0, 0], [0, 0], [0, 0]],
  ["Atropine", [15, 0], [15, 0], [15, 0], [15, 0]],
  ["vicryl 5/O", [53, 0], [53, 0], [53, 0], [53, 0]],
  ["vicryl 4/O", [0, 0], [0, 0], [0, 0], [0, 0]],
  ["Vicryl 3/0", [28, 0], [28, 2], [26, 0], [24, 0]],
  ["Vicryl 2/o", [16, 0], [16, 0], [16, 0], [16, 2]],
  ["Ethilon 2/0", [14, 0], [14, 0], [14, 0], [14, 0]],
  ["Ethilon 3/0", [35, 0], [35, 0], [35, 0], [35, 3]],
  ["Ethilon 4/0", [92, 0], [92, 0], [92, 0], [92, 0]],
  ["Ethilon 5/0", [0, 0], [0, 0], [0, 0], [0, 0]],
  ["Ethilon 6/0", [0, 0], [0, 0], [0, 0], [0, 0]],
  ["monocryl 6/0", [0, 0], [0, 0], [0, 0], [0, 0]],
  ["Lidocaine", [1, 0], [25, 1], [24, 0], [24, 0]],
  ["surgical blades N23", [103, 0], [103, 0], [103, 0], [103, 0]],
  ["Surgical blades N21", [97, 0], [97, 0], [97, 0], [97, 0]],
  ["surgical bladeN15", [68, 0], [68, 0], [68, 0], [68, 0]],
  ["surgical blade N12", [69, 0], [69, 0], [69, 0], [69, 0]],
  ["crepes bandage 7.5cm", [38, 1], [37, 0], [37, 1], [36, 0]],
  ["Crepe bandage 10cm", [3, 1], [2, 0], [2, 0], [2, 0]],
  ["crepe bandage 15cm", [27, 0], [27, 0], [27, 0], [27, 0]],
  ["vaseline gauze", [32, 0], [32, 0], [32, 1], [31, 0]],
  ["Gauze swab", [78, 0], [78, 0], [78, 0], [78, 0]],
  ["oxytocin inj", [0, 0], [0, 0], [0, 0], [0, 0]],
  ["cytotec", [10, 0], [10, 0], [10, 0], [10, 0]],
  ["proper gloves", [700, 0], [700, 0], [700, 100], [200, 100]],
  ["water for injection", [239, 0], [239, 3], [236, 4], [232, 14]],
  ["Syringe 2ml", [109, 0], [109, 2], [107, 0], [107, 1]],
  ["syringe 5ml", [207, 13], [194, 3], [191, 2], [189, 9]],
  ["syringe 10ml", [183, 7], [176, 10], [166, 4], [162, 14]],
  ["syringe 20ml", [89, 0], [89, 0], [89, 0], [89, 2]],
  ["needle 23", [86, 0], [86, 0], [86, 0], [86, 0]],
  ["needle 21", [89, 0], [89, 0], [89, 0], [89, 0]],
  ["needle 18", [0, 0], [0, 0], [0, 0], [83, 3]],
  ["Aquabloc 15×10", [65, 2], [63, 1], [62, 0], [62, 0]],
  ["neb mask adult", [12, 1], [11, 0], [22, 1], [21, 0]],
  ["Neb mask ped", [25, 1], [24, 2], [22, 1], [21, 6]],
  ["Aquabloc 10×10", [14, 0], [14, 0], [14, 0], [14, 0]],
  ["Urine drainage bag", [1, 0], [1, 0], [1, 0], [1, 0]],
  ["Foley balloon catheter fr 10", [11, 0], [11, 0], [11, 0], [11, 0]],
  ["Foley balloon catheter fr 12", [0, 0], [0, 0], [0, 0], [0, 0]],
  ["Foley balloon catheter fr 16", [0, 0], [0, 0], [0, 0], [0, 0]],
  ["Foley balloon catheter fr 18", [0, 0], [0, 0], [0, 0], [0, 0]],
  ["Foley balloon catheter fr 20", [1, 0], [1, 0], [1, 0], [1, 0]],
  ["Metoclopramide", [48, 0], [48, 0], [48, 0], [48, 0]],
  ["Hydrocortisone 100mg", [15, 1], [14, 1], [13, 1], [13, 0]],
  ["Phenytoine 250mg", [0, 0], [0, 0], [0, 0], [0, 0]],
  ["Salbutamol 2.5mg", [7, 0], [160, 3], [157, 4], [153, 8]],
  ["catheter G20", [85, 3], [82, 4], [78, 5], [73, 1]],
  ["Iv catheter G22", [54, 3], [51, 1], [50, 4], [46, 3]],
  ["Iv catheter G24", [246, 1], [245, 3], [242, 0], [242, 11]],
  ["Iv catheter G16", [184, 0], [184, 0], [184, 0], [184, 0]],
  ["Iv catheter G18", [174, 1], [174, 0], [174, 0], [174, 3]],
  ["IUD MIRENA", [40, 0], [40, 0], [40, 0], [40, 0]],
  ["CONDOM", [1000, 0], [1000, 0], [1000, 0], [1000, 0]],
  ["SAYANA", [22, 0], [22, 0], [22, 0], [22, 0]],
  ["JADELLE", [17, 0], [17, 0], [17, 0], [17, 0]],
  ["MICROGYN", [6, 0], [6, 0], [6, 0], [6, 0]],
  ["sterile gloves 8", [0, 0], [0, 0], [0, 0], [0, 0]],
  ["sterile gloves 7.5", [82, 0], [82, 4], [78, 0], [78, 0]],
  ["Hydralazine 20-25mg/ml", [0, 0], [0, 0], [0, 0], [0, 0]],
];

(async () => {
  try {
    console.log('🚀 Seeding stock levels for March 29th, 30th, and 31st...');
    const statements = [];

    for (const [item, pm29, am30, pm30, am31] of stockData) {
      // 29-Mar PM
      statements.push({
        sql: `INSERT INTO nursing_monthly_stock (month_year, item_name, day, session, stock_in_hands, consumed, balance, responsible_name, updated_at)
              VALUES (?, ?, 29, 'PM', ?, ?, ?, 'RN Nurse', CURRENT_TIMESTAMP)
              ON CONFLICT(month_year, item_name, day, session) DO UPDATE SET
                stock_in_hands = excluded.stock_in_hands,
                consumed = excluded.consumed,
                balance = excluded.balance,
                responsible_name = excluded.responsible_name,
                updated_at = CURRENT_TIMESTAMP`,
        args: [month_year, item, pm29[0], pm29[1], pm29[0] - pm29[1]]
      });

      // 30-Mar AM
      statements.push({
        sql: `INSERT INTO nursing_monthly_stock (month_year, item_name, day, session, stock_in_hands, consumed, balance, responsible_name, updated_at)
              VALUES (?, ?, 30, 'AM', ?, ?, ?, 'RN Nurse', CURRENT_TIMESTAMP)
              ON CONFLICT(month_year, item_name, day, session) DO UPDATE SET
                stock_in_hands = excluded.stock_in_hands,
                consumed = excluded.consumed,
                balance = excluded.balance,
                responsible_name = excluded.responsible_name,
                updated_at = CURRENT_TIMESTAMP`,
        args: [month_year, item, am30[0], am30[1], am30[0] - am30[1]]
      });

      // 30-Mar PM
      statements.push({
        sql: `INSERT INTO nursing_monthly_stock (month_year, item_name, day, session, stock_in_hands, consumed, balance, responsible_name, updated_at)
              VALUES (?, ?, 30, 'PM', ?, ?, ?, 'RN Nurse', CURRENT_TIMESTAMP)
              ON CONFLICT(month_year, item_name, day, session) DO UPDATE SET
                stock_in_hands = excluded.stock_in_hands,
                consumed = excluded.consumed,
                balance = excluded.balance,
                responsible_name = excluded.responsible_name,
                updated_at = CURRENT_TIMESTAMP`,
        args: [month_year, item, pm30[0], pm30[1], pm30[0] - pm30[1]]
      });

      // 31-Mar AM
      statements.push({
        sql: `INSERT INTO nursing_monthly_stock (month_year, item_name, day, session, stock_in_hands, consumed, balance, responsible_name, updated_at)
              VALUES (?, ?, 31, 'AM', ?, ?, ?, 'RN Nurse', CURRENT_TIMESTAMP)
              ON CONFLICT(month_year, item_name, day, session) DO UPDATE SET
                stock_in_hands = excluded.stock_in_hands,
                consumed = excluded.consumed,
                balance = excluded.balance,
                responsible_name = excluded.responsible_name,
                updated_at = CURRENT_TIMESTAMP`,
        args: [month_year, item, am31[0], am31[1], am31[0] - am31[1]]
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
