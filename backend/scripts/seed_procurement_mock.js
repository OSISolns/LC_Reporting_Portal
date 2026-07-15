const db = require('../src/config/db');

async function seed() {
  try {
    console.log('🌱 Starting Procurement Mock Data Seeding...');

    // Create temporary table to satisfy broken grn_inspection_items -> goods_receipt_note_items FK constraint in SQLite
    await db.query('CREATE TABLE IF NOT EXISTS goods_receipt_note_items (id INTEGER PRIMARY KEY)');

    // 1. Get or create required vendors
    const vendorNames = ['KIPHARMA', 'Rugero Med Ltd', 'SOFTLINE', 'Best stationary', 'Aegis Diagnostics'];
    const vendorMap = {};

    for (const name of vendorNames) {
      let { rows } = await db.query('SELECT id FROM vendors WHERE name = ?', [name]);
      if (rows.length === 0) {
        const { rows: inserted } = await db.query(
          'INSERT INTO vendors (name, is_active) VALUES (?, 1) RETURNING id',
          [name]
        );
        vendorMap[name] = inserted[0].id;
        console.log(`+ Created vendor: ${name} (ID: ${vendorMap[name]})`);
      } else {
        vendorMap[name] = rows[0].id;
        console.log(`* Found existing vendor: ${name} (ID: ${vendorMap[name]})`);
      }
    }

    // 2. Clear existing mock data to prevent duplicates
    console.log('🧹 Cleaning old mock procurement data...');
    await db.query('DELETE FROM vendor_contracts');
    await db.query('DELETE FROM vendor_documents');
    await db.query('DELETE FROM vendor_ratings');
    await db.query('DELETE FROM department_budgets');
    await db.query('DELETE FROM rfq_committee');
    await db.query('DELETE FROM rfq_awards');
    await db.query('DELETE FROM rfq_quotes');
    await db.query('DELETE FROM rfq_suppliers');
    await db.query('DELETE FROM rfq_items');
    await db.query('DELETE FROM rfqs');
    await db.query('DELETE FROM goods_receipt_items');
    await db.query('DELETE FROM goods_receipt_notes');
    await db.query('DELETE FROM grn_inspection_items');
    await db.query('DELETE FROM purchase_order_items');
    await db.query('DELETE FROM purchase_orders');
    await db.query('DELETE FROM invoice_line_items');
    await db.query('DELETE FROM purchase_invoices');
    await db.query('DELETE FROM supplier_return_items');
    await db.query('DELETE FROM supplier_returns');
    await db.query('DELETE FROM procurement_catalog');

    // 3. Seed budgets for departments
    const budgets = [
      { deptId: 120, name: 'PHYSIO', amount: 20000000 },
      { deptId: 121, name: 'NURSING', amount: 45000000 },
      { deptId: 122, name: 'OPERATIONS', amount: 15000000 },
      { deptId: 123, name: 'LABORATORY', amount: 55000000 },
      { deptId: 124, name: 'IMAGING', amount: 65000000 },
      { deptId: 129, name: 'DENTAL', amount: 35000000 }
    ];

    for (const b of budgets) {
      await db.query(`
        INSERT INTO department_budgets (department_id, department_name, period_type, period_year, budget_amount, currency, created_by)
        VALUES (?, ?, 'annual', 2026, ?, 'RWF', 1)
      `, [b.deptId, b.name, b.amount]);
    }
    console.log('✅ Budgets seeded.');

    // 4. Seed contracts
    const contracts = [
      { vendor: 'KIPHARMA', no: 'CON-2026-001', title: 'Pharma Reagents Supply SLA', value: 35000000, start: '2026-01-01', end: '2026-12-31', status: 'active' },
      { vendor: 'Rugero Med Ltd', no: 'CON-2026-002', title: 'Surgical Consumables Framework', value: 20000000, start: '2026-02-15', end: '2027-02-14', status: 'active' },
      { vendor: 'Aegis Diagnostics', no: 'CON-2025-089', title: 'Lab Analyzer Reagent Partnership', value: 50000000, start: '2025-01-01', end: '2025-12-31', status: 'expired' },
      { vendor: 'SOFTLINE', no: 'CON-2026-003', title: 'IT Printing & Stationary Lease', value: 5000000, start: '2026-06-01', end: '2026-11-30', status: 'active' }
    ];

    for (const c of contracts) {
      await db.query(`
        INSERT INTO vendor_contracts (vendor_id, contract_no, title, start_date, end_date, contract_value, currency, status, terms, notes, created_by)
        VALUES (?, ?, ?, ?, ?, ?, 'RWF', ?, 'Standard net-30 payment terms upon invoice approval.', 'Annual review required before expiry.', 1)
      `, [vendorMap[c.vendor], c.no, c.title, c.start, c.end, c.value, c.status]);
    }
    console.log('✅ Vendor contracts seeded.');

    // 5. Seed Vendor Ratings
    const ratings = [
      { vendor: 'KIPHARMA', score: 5, category: 'quality', comment: 'Always sterile and properly packed reagents.' },
      { vendor: 'KIPHARMA', score: 4, category: 'delivery', comment: 'Deliveries usually arrive on time, occasionally late by 1 day.' },
      { vendor: 'Rugero Med Ltd', score: 5, category: 'delivery', comment: 'Super fast deliveries, sometimes same day for emergencies!' },
      { vendor: 'Rugero Med Ltd', score: 5, category: 'quality', comment: 'High quality CT syringes.' },
      { vendor: 'SOFTLINE', score: 3, category: 'responsiveness', comment: 'Takes a few days to reply to support tickets.' }
    ];

    for (const r of ratings) {
      await db.query(`
        INSERT INTO vendor_ratings (vendor_id, rating, category, comment, rated_by)
        VALUES (?, ?, ?, ?, 1)
      `, [vendorMap[r.vendor], r.score, r.category, r.comment]);
    }
    console.log('✅ Vendor ratings seeded.');

    // 6. Seed Vendor Documents
    const documents = [
      { vendor: 'KIPHARMA', title: 'ISO 9001 Quality Certificate' },
      { vendor: 'KIPHARMA', title: 'RURA Wholesale License' },
      { vendor: 'Rugero Med Ltd', title: 'RRA Tax Clearance Certificate' },
      { vendor: 'Aegis Diagnostics', title: 'Medical Device Import Permit' }
    ];

    for (const d of documents) {
      await db.query(`
        INSERT INTO vendor_documents (vendor_id, doc_type, doc_name, file_ref, expiry_date, uploaded_by, notes)
        VALUES (?, 'compliance', ?, '/uploads/docs/compliance.pdf', '2027-04-30', 1, 'Approved compliance document.')
      `, [vendorMap[d.vendor], d.title]);
    }
    console.log('✅ Vendor documents seeded.');

    // 7. Seed Procurement Catalog
    const catalog = [
      { name: 'Contrast 100ml/Omnipaque', sku: 'SKU-OMNI-100', cat: 'imaging_department', uom: 'Bottle', price: 32606, vendor: 'KIPHARMA' },
      { name: 'CT SYRINGUE/1paire', sku: 'SKU-CTSY-PAIR', cat: 'imaging_department', uom: 'Pair', price: 28000, vendor: 'Rugero Med Ltd' },
      { name: 'Papier duplicateur/ REAM', sku: 'SKU-PAPER-RM', cat: 'office_stationery', uom: 'Ream', price: 6500, vendor: 'Best stationary' },
      { name: 'Lab Reagents / EDTA Tubes', sku: 'SKU-EDTA-TUB', cat: 'medical_supplies', uom: 'Box', price: 15000, vendor: 'KIPHARMA' },
      { name: 'Dental Composite Syringes', sku: 'SKU-DENT-COM', cat: 'medical_supplies', uom: 'Pack', price: 45000, vendor: 'Aegis Diagnostics' }
    ];

    for (const item of catalog) {
      await db.query(`
        INSERT INTO procurement_catalog (item_name, category, sku, unit_of_measure, preferred_vendor, last_unit_price, is_active, created_by)
        VALUES (?, ?, ?, ?, ?, ?, 1, 1)
      `, [item.name, item.cat, item.sku, item.uom, vendorMap[item.vendor], item.price]);
    }
    console.log('✅ Procurement catalog seeded.');

    // 8. Seed RFQ (Request For Quotes)
    // RFQ 1: Closed & Evaluated
    const { rows: rfq1 } = await db.query(`
      INSERT INTO rfqs (reference_no, title, category, status, pricing_mode, currency, created_by, notes)
      VALUES ('RFQ-2026-004', 'Supply of Laboratory EDTA Reagents', 'medical_supplies', 'Closed', 'unit_total', 'RWF', 1, 'Urgent order for Lab Hub.')
      RETURNING id
    `);
    const rfq1Id = rfq1[0].id;

    // RFQ 2: Open
    const { rows: rfq2 } = await db.query(`
      INSERT INTO rfqs (reference_no, title, category, status, pricing_mode, currency, created_by, notes)
      VALUES ('RFQ-2026-005', 'Imaging Syringes & Contrasts 2026 Q3', 'imaging_department', 'Collecting', 'unit_total', 'RWF', 1, 'Regular restocking.')
      RETURNING id
    `);
    const rfq2Id = rfq2[0].id;

    // RFQ 3: Draft
    const { rows: rfq3 } = await db.query(`
      INSERT INTO rfqs (reference_no, title, category, status, pricing_mode, currency, created_by, notes)
      VALUES ('RFQ-2026-006', 'Office A4 Ream Paper Restock', 'office_stationery', 'Draft', 'unit_total', 'RWF', 1, 'Drafting for stationary supplier review.')
      RETURNING id
    `);

    // RFQ Items
    const { rows: rfq1Item1 } = await db.query(`
      INSERT INTO rfq_items (rfq_id, line_no, item_name, quantity, unit, quantity_label)
      VALUES (?, 1, 'Lab Reagents / EDTA Tubes', 100, 'Box', '100 Boxes')
      RETURNING id
    `, [rfq1Id]);
    const rfq1Item1Id = rfq1Item1[0].id;

    const { rows: rfq2Item1 } = await db.query(`
      INSERT INTO rfq_items (rfq_id, line_no, item_name, quantity, unit, quantity_label)
      VALUES (?, 1, 'Contrast 100ml/Omnipaque', 50, 'Bottle', '50 Bottles')
      RETURNING id
    `, [rfq2Id]);

    // RFQ Suppliers
    const { rows: rfq1Sup1 } = await db.query(`
      INSERT INTO rfq_suppliers (rfq_id, vendor_id, responded, column_order)
      VALUES (?, ?, 1, 1)
      RETURNING id
    `, [rfq1Id, vendorMap['KIPHARMA']]);
    const rfq1Sup1Id = rfq1Sup1[0].id;

    const { rows: rfq1Sup2 } = await db.query(`
      INSERT INTO rfq_suppliers (rfq_id, vendor_id, responded, column_order)
      VALUES (?, ?, 1, 2)
      RETURNING id
    `, [rfq1Id, vendorMap['Aegis Diagnostics']]);
    const rfq1Sup2Id = rfq1Sup2[0].id;

    await db.query(`
      INSERT INTO rfq_suppliers (rfq_id, vendor_id, responded, column_order)
      VALUES (?, ?, 0, 1)
    `, [rfq2Id, vendorMap['Rugero Med Ltd']]);

    // RFQ Quotes (Kipharma bid 14,500 RWF per box; Aegis bid 15,200 RWF per box)
    await db.query(`
      INSERT INTO rfq_quotes (rfq_item_id, rfq_supplier_id, unit_price, total_price, no_bid)
      VALUES (?, ?, 14500, 1450000, 0)
    `, [rfq1Item1Id, rfq1Sup1Id]);

    await db.query(`
      INSERT INTO rfq_quotes (rfq_item_id, rfq_supplier_id, unit_price, total_price, no_bid)
      VALUES (?, ?, 15200, 1520000, 0)
    `, [rfq1Item1Id, rfq1Sup2Id]);

    console.log('✅ RFQs and Quotes seeded.');

    // 9. Seed Purchase Orders
    // PO 1: Approved & Delivered
    const { rows: po1 } = await db.query(`
      INSERT INTO purchase_orders (po_number, vendor_id, created_by, status, total_amount, notes)
      VALUES ('PO-2026-081', ?, 1, 'approved', 15400000, 'EDTA Tubes and Medical Reagents restock.')
      RETURNING id
    `, [vendorMap['KIPHARMA']]);
    const po1Id = po1[0].id;

    await db.query(`
      INSERT INTO purchase_order_items (po_id, item_name, sku, unit_of_measure, category, quantity, unit_price)
      VALUES (?, 'Lab Reagents / EDTA Tubes', 'SKU-EDTA-TUB', 'Box', 'medical_supplies', 100, 154000)
    `, [po1Id]);

    // PO 2: Approved & Partially Delivered
    const { rows: po2 } = await db.query(`
      INSERT INTO purchase_orders (po_number, vendor_id, created_by, status, total_amount, notes)
      VALUES ('PO-2026-082', ?, 1, 'approved', 8200000, 'Imaging Syringes & Contrasts.')
      RETURNING id
    `, [vendorMap['Rugero Med Ltd']]);
    const po2Id = po2[0].id;

    await db.query(`
      INSERT INTO purchase_order_items (po_id, item_name, sku, unit_of_measure, category, quantity, unit_price)
      VALUES (?, 'CT SYRINGUE/1paire', 'SKU-CTSY-PAIR', 'Pair', 'imaging_department', 100, 28000)
    `, [po2Id]);
    await db.query(`
      INSERT INTO purchase_order_items (po_id, item_name, sku, unit_of_measure, category, quantity, unit_price)
      VALUES (?, 'Contrast 100ml/Omnipaque', 'SKU-OMNI-100', 'Bottle', 'imaging_department', 165, 32727)
    `, [po2Id]);

    // PO 3: Pending Approval
    const { rows: po3 } = await db.query(`
      INSERT INTO purchase_orders (po_number, vendor_id, created_by, status, total_amount, notes)
      VALUES ('PO-2026-083', ?, 1, 'pending', 2450000, 'Ream Paper for Office Stationery.')
      RETURNING id
    `, [vendorMap['Best stationary']]);
    const po3Id = po3[0].id;

    await db.query(`
      INSERT INTO purchase_order_items (po_id, item_name, sku, unit_of_measure, category, quantity, unit_price)
      VALUES (?, 'Papier duplicateur/ REAM', 'SKU-PAPER-RM', 'Ream', 'office_stationery', 376, 6515)
    `, [po3Id]);

    console.log('✅ Purchase Orders seeded.');

    // 10. Seed Goods Receipt Notes (GRN)
    // GRN 1: Inspected & Logged
    const { rows: grn1 } = await db.query(`
      INSERT INTO goods_receipt_notes (grn_number, po_id, vendor_id, received_by, invoice_number, delivery_note_number, notes)
      VALUES ('GRN-2026-051', ?, ?, 1, 'INV-90234', 'DN-90234', 'All goods arrived sterile and sealed.')
      RETURNING id
    `, [po1Id, vendorMap['KIPHARMA']]);
    const grn1Id = grn1[0].id;

    const { rows: grn1Item } = await db.query(`
      INSERT INTO goods_receipt_items (grn_id, item_name, sku, unit_of_measure, category, quantity_received, batch_number, expiry_date, purchase_price)
      VALUES (?, 'Lab Reagents / EDTA Tubes', 'SKU-EDTA-TUB', 'Box', 'medical_supplies', 100, 'BAT-EDTA-009', '2027-06-30', 154000)
      RETURNING id
    `, [grn1Id]);
    const grn1ItemId = grn1Item[0].id;
    await db.query('INSERT INTO goods_receipt_note_items (id) VALUES (?)', [grn1ItemId]);

    // GRN 2: Pending Inspection
    const { rows: grn2 } = await db.query(`
      INSERT INTO goods_receipt_notes (grn_number, po_id, vendor_id, received_by, invoice_number, delivery_note_number, notes)
      VALUES ('GRN-2026-052', ?, ?, 1, 'INV-1109', 'DN-1109', 'Syringes arrived, contrasts pending delivery.')
      RETURNING id
    `, [po2Id, vendorMap['Rugero Med Ltd']]);
    const grn2Id = grn2[0].id;

    const { rows: grn2Item } = await db.query(`
      INSERT INTO goods_receipt_items (grn_id, item_name, sku, unit_of_measure, category, quantity_received, batch_number, expiry_date, purchase_price)
      VALUES (?, 'CT SYRINGUE/1paire', 'SKU-CTSY-PAIR', 'Pair', 'imaging_department', 100, 'BAT-SYR-902', '2028-09-15', 28000)
      RETURNING id
    `, [grn2Id]);
    const grn2ItemId = grn2Item[0].id;
    await db.query('INSERT INTO goods_receipt_note_items (id) VALUES (?)', [grn2ItemId]);

    console.log('✅ Goods Receipt Notes seeded.');

    // 11. Seed GRN Inspections
    await db.query(`
      INSERT INTO grn_inspection_items (grn_id, grn_item_id, item_name, inspection_pass, rejection_reason, inspected_by)
      VALUES (?, ?, 'Lab Reagents / EDTA Tubes', 1, NULL, 1)
    `, [grn1Id, grn1ItemId]);

    await db.query(`
      INSERT INTO grn_inspection_items (grn_id, grn_item_id, item_name, inspection_pass, rejection_reason, inspected_by)
      VALUES (?, ?, 'CT SYRINGUE/1paire', 1, NULL, 1)
    `, [grn2Id, grn2ItemId]);

    console.log('✅ GRN Inspections seeded.');

    // 12. Seed Purchase Invoices
    // Invoice 1: Paid matching PO 1
    const { rows: inv1 } = await db.query(`
      INSERT INTO purchase_invoices (invoice_no, po_id, grn_id, vendor_id, invoice_date, due_date, subtotal, tax_amount, total_amount, currency, payment_terms, status, match_status, paid_by)
      VALUES ('INV-90234', ?, ?, ?, '2026-07-02', '2026-08-02', 15400000, 0, 15400000, 'RWF', 'net_30', 'paid', 'matched', 1)
      RETURNING id
    `, [po1Id, grn1Id, vendorMap['KIPHARMA']]);
    const inv1Id = inv1[0].id;

    await db.query(`
      INSERT INTO invoice_line_items (invoice_id, item_name, quantity, unit_price, total_price)
      VALUES (?, 'Lab Reagents / EDTA Tubes', 100, 154000, 15400000)
    `, [inv1Id]);

    // Invoice 2: Approved, Pending payment matching PO 2
    const { rows: inv2 } = await db.query(`
      INSERT INTO purchase_invoices (invoice_no, po_id, grn_id, vendor_id, invoice_date, due_date, subtotal, tax_amount, total_amount, currency, payment_terms, status, match_status)
      VALUES ('INV-1109', ?, ?, ?, '2026-07-10', '2026-08-10', 8200000, 0, 8200000, 'RWF', 'net_30', 'approved', 'matched')
      RETURNING id
    `, [po2Id, grn2Id, vendorMap['Rugero Med Ltd']]);
    const inv2Id = inv2[0].id;

    await db.query(`
      INSERT INTO invoice_line_items (invoice_id, item_name, quantity, unit_price, total_price)
      VALUES (?, 'CT SYRINGUE/1paire', 100, 28000, 2800000)
    `, [inv2Id]);
    await db.query(`
      INSERT INTO invoice_line_items (invoice_id, item_name, quantity, unit_price, total_price)
      VALUES (?, 'Contrast 100ml/Omnipaque', 165, 32727, 5400000)
    `, [inv2Id]);

    console.log('✅ Purchase Invoices seeded.');

    // 13. Seed Supplier Returns
    // Get a sample stock batch from Kipharma to return
    const { rows: batches } = await db.query('SELECT id, item_id FROM stock_batches WHERE vendor_id = ? LIMIT 1', [vendorMap['KIPHARMA']]);
    if (batches.length > 0) {
      const batchId = batches[0].id;
      const itemId = batches[0].item_id;

      const { rows: ret } = await db.query(`
        INSERT INTO supplier_returns (return_number, vendor_id, returned_by, notes)
        VALUES ('RET-2026-001', ?, 1, 'Returning damaged boxes from shipment.')
        RETURNING id
      `, [vendorMap['KIPHARMA']]);
      const returnId = ret[0].id;

      await db.query(`
        INSERT INTO supplier_return_items (return_id, item_id, batch_id, quantity, reason)
        VALUES (?, ?, ?, 5, 'Damaged during transit, seals broken.')
      `, [returnId, itemId, batchId]);
      console.log('✅ Supplier Returns seeded.');
    } else {
      console.log('⚠️ No stock batches found for KIPHARMA; skipped Supplier Returns seeding.');
    }

    // Clean up temporary table
    await db.query('DROP TABLE IF EXISTS goods_receipt_note_items');

    console.log('🎉 Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    // Clean up temporary table in case of error
    await db.query('DROP TABLE IF EXISTS goods_receipt_note_items').catch(() => {});
    console.error('💥 Seeding error:', error);
    process.exit(1);
  }
}

seed();
