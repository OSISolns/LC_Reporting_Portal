-- ==============================================================================
-- NURSING DEPARTMENT REQUISITION SEED SCRIPT
-- Turso / SQLite Compatible SQL Script
-- Target Department: NURSING (department_id = 121)
-- Target Role: Stock Manager Approval (status = 'Pending')
-- ==============================================================================

BEGIN TRANSACTION;

-- 1. Ensure NURSING Department exists
INSERT OR IGNORE INTO departments (id, name) VALUES (121, 'NURSING');

-- 2. Insert Requisition Header (Awaiting Stock Manager Review)
INSERT INTO requisitions (
  department_id,
  status,
  urgency,
  notes,
  created_by_name,
  created_at,
  updated_at
) VALUES (
  121,
  'Pending',
  'Normal',
  'Nursing Department Consumables & Stock Replenishment Requisition (103 items batch request - pending Stock Manager approval)',
  'Nurse-in-Charge / Nursing Dept',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 3. Master Inventory Item Registration & Requisition Line Items Insertion
-- ==============================================================================

-- Item #1: Adrenaline 1mg | Qty: 84 | Exp: 06/2027
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Adrenaline 1mg', 'ADRE1000', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Adrenaline 1mg'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Adrenaline 1mg') LIMIT 1),
  84,
  0,
  '06/2027'
);

-- Item #2: Adrenaline 1mg (Batch 2) | Qty: 5 | Exp: 06/2028
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Adrenaline 1mg (Batch 2)', 'ADRE1001', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Adrenaline 1mg (Batch 2)'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Adrenaline 1mg (Batch 2)') LIMIT 1),
  5,
  0,
  '06/2028'
);

-- Item #3: Aiguille (Needle) G21 | Qty: 25 | Exp: 03/2030
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Aiguille (Needle) G21', 'AIGU1002', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Aiguille (Needle) G21'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Aiguille (Needle) G21') LIMIT 1),
  25,
  0,
  '03/2030'
);

-- Item #4: Aiguille (Needle) G23 | Qty: 75 | Exp: 02/2029
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Aiguille (Needle) G23', 'AIGU1003', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Aiguille (Needle) G23'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Aiguille (Needle) G23') LIMIT 1),
  75,
  0,
  '02/2029'
);

-- Item #5: Aquabloc 15cm x 10 | Qty: 4 | Exp: 05/2028
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Aquabloc 15cm x 10', 'AQUA1004', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Aquabloc 15cm x 10'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Aquabloc 15cm x 10') LIMIT 1),
  4,
  0,
  '05/2028'
);

-- Item #6: Atropine | Qty: 2 | Exp: 10/2027
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Atropine', 'ATRO1005', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Atropine'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Atropine') LIMIT 1),
  2,
  0,
  '10/2027'
);

-- Item #7: B complex | Qty: 11 | Exp: 04/2028
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'B complex', 'BCOM1006', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('B complex'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('B complex') LIMIT 1),
  11,
  0,
  '04/2028'
);

-- Item #8: Buscopan 10mg | Qty: 21 | Exp: 01/2028
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Buscopan 10mg', 'BUSC1007', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Buscopan 10mg'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Buscopan 10mg') LIMIT 1),
  21,
  0,
  '01/2028'
);

-- Item #9: Buscopan 20mg | Qty: 25 | Exp: 01/2028
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Buscopan 20mg', 'BUSC1008', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Buscopan 20mg'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Buscopan 20mg') LIMIT 1),
  25,
  0,
  '01/2028'
);

-- Item #10: Catheter IV G16 | Qty: 25 | Exp: 09/2027
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Catheter IV G16', 'CATH1009', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Catheter IV G16'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Catheter IV G16') LIMIT 1),
  25,
  0,
  '09/2027'
);

-- Item #11: Catheter IV G18 | Qty: 289 | Exp: 03/2027
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Catheter IV G18', 'CATH1010', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Catheter IV G18'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Catheter IV G18') LIMIT 1),
  289,
  0,
  '03/2027'
);

-- Item #12: Catheter IV G18 | Qty: 129 | Exp: 03/2027
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Catheter IV G18', 'CATH1011', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Catheter IV G18'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Catheter IV G18') LIMIT 1),
  129,
  0,
  '03/2027'
);

-- Item #13: Catheter IV G20 | Qty: 70 | Exp: 08/2029
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Catheter IV G20', 'CATH1012', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Catheter IV G20'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Catheter IV G20') LIMIT 1),
  70,
  0,
  '08/2029'
);

-- Item #14: Catheter IV G20 (Batch 2) | Qty: 61 | Exp: 05/2027
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Catheter IV G20 (Batch 2)', 'CATH1013', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Catheter IV G20 (Batch 2)'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Catheter IV G20 (Batch 2)') LIMIT 1),
  61,
  0,
  '05/2027'
);

-- Item #15: Catheter IV G22 | Qty: 10 | Exp: 03/2028
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Catheter IV G22', 'CATH1014', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Catheter IV G22'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Catheter IV G22') LIMIT 1),
  10,
  0,
  '03/2028'
);

-- Item #16: Catheter IV G22 (Batch 2) | Qty: 220 | Exp: 02/2029
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Catheter IV G22 (Batch 2)', 'CATH1015', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Catheter IV G22 (Batch 2)'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Catheter IV G22 (Batch 2)') LIMIT 1),
  220,
  0,
  '02/2029'
);

-- Item #17: Catheter IV G24 | Qty: 203 | Exp: 12/2029
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Catheter IV G24', 'CATH1016', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Catheter IV G24'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Catheter IV G24') LIMIT 1),
  203,
  0,
  '12/2029'
);

-- Item #18: Ceftriaxone 1g | Qty: 32 | Exp: 11/2028
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Ceftriaxone 1g', 'CEFT1017', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Ceftriaxone 1g'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Ceftriaxone 1g') LIMIT 1),
  32,
  0,
  '11/2028'
);

-- Item #19: Chlorpromazine 25 mg | Qty: 1 | Exp: 03/2028
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Chlorpromazine 25 mg', 'CHLO1018', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Chlorpromazine 25 mg'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Chlorpromazine 25 mg') LIMIT 1),
  1,
  0,
  '03/2028'
);

-- Item #20: Crepe bandage 10 cm | Qty: 13 | Exp: 07/2030
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Crepe bandage 10 cm', 'CREP1019', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Crepe bandage 10 cm'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Crepe bandage 10 cm') LIMIT 1),
  13,
  0,
  '07/2030'
);

-- Item #21: Crepe bandage 15 cm | Qty: 1 | Exp: 07/2030
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Crepe bandage 15 cm', 'CREP1020', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Crepe bandage 15 cm'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Crepe bandage 15 cm') LIMIT 1),
  1,
  0,
  '07/2030'
);

-- Item #22: Crepe bandage 15 cm | Qty: 13 | Exp: 08/2030
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Crepe bandage 15 cm', 'CREP1021', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Crepe bandage 15 cm'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Crepe bandage 15 cm') LIMIT 1),
  13,
  0,
  '08/2030'
);

-- Item #23: Crepe bandage 7.5 cm | Qty: 17 | Exp: 05/2030
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Crepe bandage 7.5 cm', 'CREP1022', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Crepe bandage 7.5 cm'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Crepe bandage 7.5 cm') LIMIT 1),
  17,
  0,
  '05/2030'
);

-- Item #24: Dexamethasone | Qty: 36 | Exp: 06/2028
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Dexamethasone', 'DEXA1023', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Dexamethasone'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Dexamethasone') LIMIT 1),
  36,
  0,
  '06/2028'
);

-- Item #25: Dexamethasone | Qty: 30 | Exp: 06/2028
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Dexamethasone', 'DEXA1024', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Dexamethasone'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Dexamethasone') LIMIT 1),
  30,
  0,
  '06/2028'
);

-- Item #26: Dextrose 50% | Qty: 18 | Exp: 03/2028
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Dextrose 50%', 'DEXT1025', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Dextrose 50%'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Dextrose 50%') LIMIT 1),
  18,
  0,
  '03/2028'
);

-- Item #27: Diazepam 10mg | Qty: 4 | Exp: 10/2028
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Diazepam 10mg', 'DIAZ1026', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Diazepam 10mg'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Diazepam 10mg') LIMIT 1),
  4,
  0,
  '10/2028'
);

-- Item #28: Diclofenac 75mg | Qty: 29 | Exp: 02/2029
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Diclofenac 75mg', 'DICL1027', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Diclofenac 75mg'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Diclofenac 75mg') LIMIT 1),
  29,
  0,
  '02/2029'
);

-- Item #29: Diclofenac suppo 100mg | Qty: 51 | Exp: 04/2028
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Diclofenac suppo 100mg', 'DICL1028', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Diclofenac suppo 100mg'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Diclofenac suppo 100mg') LIMIT 1),
  51,
  0,
  '04/2028'
);

-- Item #30: Dicynone 250mg | Qty: 4 | Exp: 04/2029
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Dicynone 250mg', 'DICY1029', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Dicynone 250mg'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Dicynone 250mg') LIMIT 1),
  4,
  0,
  '04/2029'
);

-- Item #31: Eau Oxygene | Qty: 10 | Exp: 11/2027
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Eau Oxygene', 'EAUO1030', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Eau Oxygene'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Eau Oxygene') LIMIT 1),
  10,
  0,
  '11/2027'
);

-- Item #32: Emetine | Qty: 22 | Exp: 04/2028
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Emetine', 'EMET1031', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Emetine'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Emetine') LIMIT 1),
  22,
  0,
  '04/2028'
);

-- Item #33: Face mask oxygen adult | Qty: 24 | Exp: 11/2027
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Face mask oxygen adult', 'FACE1032', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Face mask oxygen adult'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Face mask oxygen adult') LIMIT 1),
  24,
  0,
  '11/2027'
);

-- Item #34: Face masque Ped | Qty: 9 | Exp: 05/2027
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Face masque Ped', 'FACE1033', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Face masque Ped'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Face masque Ped') LIMIT 1),
  9,
  0,
  '05/2027'
);

-- Item #35: Fentanyl | Qty: 14 | Exp: 08/2028
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Fentanyl', 'FENT1034', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Fentanyl'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Fentanyl') LIMIT 1),
  14,
  0,
  '08/2028'
);

-- Item #36: Foley Catheter Size 10 | Qty: 8 | Exp: 04/2027
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Foley Catheter Size 10', 'FOLE1035', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Foley Catheter Size 10'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Foley Catheter Size 10') LIMIT 1),
  8,
  0,
  '04/2027'
);

-- Item #37: Foley Catheter Size 16 | Qty: 10 | Exp: 12/2030
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Foley Catheter Size 16', 'FOLE1036', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Foley Catheter Size 16'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Foley Catheter Size 16') LIMIT 1),
  10,
  0,
  '12/2030'
);

-- Item #38: Foley Catheter Size 18 | Qty: 9 | Exp: 12/2029
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Foley Catheter Size 18', 'FOLE1037', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Foley Catheter Size 18'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Foley Catheter Size 18') LIMIT 1),
  9,
  0,
  '12/2029'
);

-- Item #39: Fragyl | Qty: 2 | Exp: 10/2026
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Fragyl', 'FRAG1038', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Fragyl'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Fragyl') LIMIT 1),
  2,
  0,
  '10/2026'
);

-- Item #40: Furosemide | Qty: 10 | Exp: 07/2027
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Furosemide', 'FURO1039', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Furosemide'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Furosemide') LIMIT 1),
  10,
  0,
  '07/2027'
);

-- Item #41: Gants propre | Qty: 400 | Exp: N/A
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Gants propre', 'GANT1040', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Gants propre'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Gants propre') LIMIT 1),
  400,
  0,
  'N/A'
);

-- Item #42: Gloves (sterile) Size 7.5 cm | Qty: 125 | Exp: 08/2030
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Gloves (sterile) Size 7.5 cm', 'GLOV1041', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Gloves (sterile) Size 7.5 cm'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Gloves (sterile) Size 7.5 cm') LIMIT 1),
  125,
  0,
  '08/2030'
);

-- Item #43: Gloves (sterile) Size 8 cm | Qty: 100 | Exp: 01/2028
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Gloves (sterile) Size 8 cm', 'GLOV1042', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Gloves (sterile) Size 8 cm'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Gloves (sterile) Size 8 cm') LIMIT 1),
  100,
  0,
  '01/2028'
);

-- Item #44: Hydralazine 20mg | Qty: 1 | Exp: 10/2026
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Hydralazine 20mg', 'HYDR1043', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Hydralazine 20mg'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Hydralazine 20mg') LIMIT 1),
  1,
  0,
  '10/2026'
);

-- Item #45: Hydrocortisone 100mg | Qty: 13 | Exp: 08/2028
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Hydrocortisone 100mg', 'HYDR1044', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Hydrocortisone 100mg'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Hydrocortisone 100mg') LIMIT 1),
  13,
  0,
  '08/2028'
);

-- Item #46: IV Catheter (polyway) | Qty: 40 | Exp: 08/2028
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'IV Catheter (polyway)', 'IVCA1045', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('IV Catheter (polyway)'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('IV Catheter (polyway)') LIMIT 1),
  40,
  0,
  '08/2028'
);

-- Item #47: Lidocaine | Qty: 25 | Exp: 06/2028
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Lidocaine', 'LIDO1046', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Lidocaine'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Lidocaine') LIMIT 1),
  25,
  0,
  '06/2028'
);

-- Item #48: Marcaine | Qty: 4 | Exp: 01/2028
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Marcaine', 'MARC1047', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Marcaine'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Marcaine') LIMIT 1),
  4,
  0,
  '01/2028'
);

-- Item #49: Masque Neb Ad | Qty: 14 | Exp: 11/2027
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Masque Neb Ad', 'MASQ1048', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Masque Neb Ad'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Masque Neb Ad') LIMIT 1),
  14,
  0,
  '11/2027'
);

-- Item #50: Masque Neb Ped | Qty: 18 | Exp: 05/2030
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Masque Neb Ped', 'MASQ1049', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Masque Neb Ped'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Masque Neb Ped') LIMIT 1),
  18,
  0,
  '05/2030'
);

-- Item #51: Metoclopramide | Qty: 20 | Exp: 02/2028
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Metoclopramide', 'METO1050', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Metoclopramide'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Metoclopramide') LIMIT 1),
  20,
  0,
  '02/2028'
);

-- Item #52: Metronidazole 100ml | Qty: 2 | Exp: 10/2026
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Metronidazole 100ml', 'METR1051', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Metronidazole 100ml'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Metronidazole 100ml') LIMIT 1),
  2,
  0,
  '10/2026'
);

-- Item #53: Midazolam | Qty: 5 | Exp: 04/2029
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Midazolam', 'MIDA1052', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Midazolam'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Midazolam') LIMIT 1),
  5,
  0,
  '04/2029'
);

-- Item #54: Morphine | Qty: 10 | Exp: 03/2027
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Morphine', 'MORP1053', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Morphine'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Morphine') LIMIT 1),
  10,
  0,
  '03/2027'
);

-- Item #55: Naloxone | Qty: 1 | Exp: 08/2027
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Naloxone', 'NALO1054', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Naloxone'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Naloxone') LIMIT 1),
  1,
  0,
  '08/2027'
);

-- Item #56: Nasal oxygen cannula adult | Qty: 2 | Exp: 09/2027
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Nasal oxygen cannula adult', 'NASA1055', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Nasal oxygen cannula adult'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Nasal oxygen cannula adult') LIMIT 1),
  2,
  0,
  '09/2027'
);

-- Item #57: Nasal oxygen cannula ped | Qty: 12 | Exp: 09/2027
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Nasal oxygen cannula ped', 'NASA1056', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Nasal oxygen cannula ped'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Nasal oxygen cannula ped') LIMIT 1),
  12,
  0,
  '09/2027'
);

-- Item #58: Nylon 2-0 | Qty: 33 | Exp: 09/2029
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Nylon 2-0', 'NYLO1057', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Nylon 2-0'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Nylon 2-0') LIMIT 1),
  33,
  0,
  '09/2029'
);

-- Item #59: Nylon 3-0 | Qty: 51 | Exp: 05/2029
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Nylon 3-0', 'NYLO1058', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Nylon 3-0'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Nylon 3-0') LIMIT 1),
  51,
  0,
  '05/2029'
);

-- Item #60: Nylon 4-0 | Qty: 37 | Exp: 07/2029
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Nylon 4-0', 'NYLO1059', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Nylon 4-0'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Nylon 4-0') LIMIT 1),
  37,
  0,
  '07/2029'
);

-- Item #61: Nylon 5-0 | Qty: 12 | Exp: 09/2029
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Nylon 5-0', 'NYLO1060', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Nylon 5-0'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Nylon 5-0') LIMIT 1),
  12,
  0,
  '09/2029'
);

-- Item #62: Omeprazole | Qty: 28 | Exp: 02/2028
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Omeprazole', 'OMEP1061', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Omeprazole'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Omeprazole') LIMIT 1),
  28,
  0,
  '02/2028'
);

-- Item #63: Pantoprazole | Qty: 2 | Exp: 11/2027
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Pantoprazole', 'PANT1062', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Pantoprazole'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Pantoprazole') LIMIT 1),
  2,
  0,
  '11/2027'
);

-- Item #64: Pap-Smear | Qty: 10 | Exp: 01/2031
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Pap-Smear', 'PAPS1063', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Pap-Smear'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Pap-Smear') LIMIT 1),
  10,
  0,
  '01/2031'
);

-- Item #65: Paracetamol 125mg | Qty: 54 | Exp: 04/2029
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Paracetamol 125mg', 'PARA1064', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Paracetamol 125mg'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Paracetamol 125mg') LIMIT 1),
  54,
  0,
  '04/2029'
);

-- Item #66: Paracetamol 250mg | Qty: 33 | Exp: 04/2028
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Paracetamol 250mg', 'PARA1065', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Paracetamol 250mg'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Paracetamol 250mg') LIMIT 1),
  33,
  0,
  '04/2028'
);

-- Item #67: Paracetamol cp's 500mg | Qty: 30 | Exp: 05/2028
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Paracetamol cp''s 500mg', 'PARA1066', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Paracetamol cp''s 500mg'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Paracetamol cp''s 500mg') LIMIT 1),
  30,
  0,
  '05/2028'
);

-- Item #68: Paraffin gauze | Qty: 233 | Exp: 01/2027
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Paraffin gauze', 'PARA1067', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Paraffin gauze'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Paraffin gauze') LIMIT 1),
  233,
  0,
  '01/2027'
);

-- Item #69: Pause 5ml | Qty: 10 | Exp: 03/2027
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Pause 5ml', 'PAUS1068', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Pause 5ml'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Pause 5ml') LIMIT 1),
  10,
  0,
  '03/2027'
);

-- Item #70: Pethidine | Qty: 6 | Exp: 01/2027
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Pethidine', 'PETH1069', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Pethidine'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Pethidine') LIMIT 1),
  6,
  0,
  '01/2027'
);

-- Item #71: Phenobarbital 100mg | Qty: 5 | Exp: 09/2027
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Phenobarbital 100mg', 'PHEN1070', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Phenobarbital 100mg'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Phenobarbital 100mg') LIMIT 1),
  5,
  0,
  '09/2027'
);

-- Item #72: Phenytoin 5ml | Qty: 2 | Exp: 03/2027
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Phenytoin 5ml', 'PHEN1071', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Phenytoin 5ml'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Phenytoin 5ml') LIMIT 1),
  2,
  0,
  '03/2027'
);

-- Item #73: Povidone | Qty: 5 | Exp: 07/2028
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Povidone', 'POVI1072', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Povidone'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Povidone') LIMIT 1),
  5,
  0,
  '07/2028'
);

-- Item #74: Propofol | Qty: 9 | Exp: 11/2027
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Propofol', 'PROP1073', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Propofol'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Propofol') LIMIT 1),
  9,
  0,
  '11/2027'
);

-- Item #75: Phytomenadione (Phytomenadione) 10mg | Qty: 3 | Exp: 04/2027
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Phytomenadione (Phytomenadione) 10mg', 'PHYT1074', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Phytomenadione (Phytomenadione) 10mg'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Phytomenadione (Phytomenadione) 10mg') LIMIT 1),
  3,
  0,
  '04/2027'
);

-- Item #76: Sac A urine | Qty: 18 | Exp: 04/2030
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Sac A urine', 'SACA1075', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Sac A urine'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Sac A urine') LIMIT 1),
  18,
  0,
  '04/2030'
);

-- Item #77: Salbutamol 2.5mg | Qty: 40 | Exp: 02/2027
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Salbutamol 2.5mg', 'SALB1076', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Salbutamol 2.5mg'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Salbutamol 2.5mg') LIMIT 1),
  40,
  0,
  '02/2027'
);

-- Item #78: Seringue (Syringe) 10cc | Qty: 116 | Exp: 08/2030
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Seringue (Syringe) 10cc', 'SERI1077', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Seringue (Syringe) 10cc'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Seringue (Syringe) 10cc') LIMIT 1),
  116,
  0,
  '08/2030'
);

-- Item #79: Seringue (Syringe) 5cc | Qty: 167 | Exp: 04/2030
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Seringue (Syringe) 5cc', 'SERI1078', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Seringue (Syringe) 5cc'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Seringue (Syringe) 5cc') LIMIT 1),
  167,
  0,
  '04/2030'
);

-- Item #80: Sterile Gauze 10 cm x 10 | Qty: 101 | Exp: 12/2028
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Sterile Gauze 10 cm x 10', 'STER1079', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Sterile Gauze 10 cm x 10'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Sterile Gauze 10 cm x 10') LIMIT 1),
  101,
  0,
  '12/2028'
);

-- Item #81: Sterile swabs | Qty: 70 | Exp: 11/2031
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Sterile swabs', 'STER1080', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Sterile swabs'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Sterile swabs') LIMIT 1),
  70,
  0,
  '11/2031'
);

-- Item #82: Suction tube Size 18 | Qty: 1 | Exp: 03/2029
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Suction tube Size 18', 'SUCT1081', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Suction tube Size 18'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Suction tube Size 18') LIMIT 1),
  1,
  0,
  '03/2029'
);

-- Item #83: Sulfate de Magnesium | Qty: 1 | Exp: 10/2026
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Sulfate de Magnesium', 'SULF1082', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Sulfate de Magnesium'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Sulfate de Magnesium') LIMIT 1),
  1,
  0,
  '10/2026'
);

-- Item #84: Surgical blades G22 | Qty: 100 | Exp: 05/2028
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Surgical blades G22', 'SURG1083', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Surgical blades G22'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Surgical blades G22') LIMIT 1),
  100,
  0,
  '05/2028'
);

-- Item #85: Surgical blades G23 | Qty: 90 | Exp: 11/2029
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Surgical blades G23', 'SURG1084', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Surgical blades G23'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Surgical blades G23') LIMIT 1),
  90,
  0,
  '11/2029'
);

-- Item #86: Syringe 10ml | Qty: 28 | Exp: 08/2030
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Syringe 10ml', 'SYRI1085', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Syringe 10ml'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Syringe 10ml') LIMIT 1),
  28,
  0,
  '08/2030'
);

-- Item #87: Syringe 1ml | Qty: 8 | Exp: 05/2027
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Syringe 1ml', 'SYRI1086', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Syringe 1ml'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Syringe 1ml') LIMIT 1),
  8,
  0,
  '05/2027'
);

-- Item #88: Syringe 20ml | Qty: 85 | Exp: 07/2030
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Syringe 20ml', 'SYRI1087', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Syringe 20ml'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Syringe 20ml') LIMIT 1),
  85,
  0,
  '07/2030'
);

-- Item #89: Syringe 3ml | Qty: 5 | Exp: 11/2026
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Syringe 3ml', 'SYRI1088', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Syringe 3ml'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Syringe 3ml') LIMIT 1),
  5,
  0,
  '11/2026'
);

-- Item #90: Syringe 5ml | Qty: 9 | Exp: 03/2030
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Syringe 5ml', 'SYRI1089', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Syringe 5ml'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Syringe 5ml') LIMIT 1),
  9,
  0,
  '03/2030'
);

-- Item #91: Tramadol | Qty: 12 | Exp: 10/2026
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Tramadol', 'TRAM1090', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Tramadol'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Tramadol') LIMIT 1),
  12,
  0,
  '10/2026'
);

-- Item #92: Trousse | Qty: 16 | Exp: 02/2030
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Trousse', 'TROU1091', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Trousse'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Trousse') LIMIT 1),
  16,
  0,
  '02/2030'
);

-- Item #93: Tube Mauve | Qty: 18 | Exp: 01/2030
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Tube Mauve', 'TUBE1092', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Tube Mauve'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Tube Mauve') LIMIT 1),
  18,
  0,
  '01/2030'
);

-- Item #94: Tube rouge | Qty: 84 | Exp: 01/2030
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Tube rouge', 'TUBE1093', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Tube rouge'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Tube rouge') LIMIT 1),
  84,
  0,
  '01/2030'
);

-- Item #95: Vicryl 1-0 | Qty: 5 | Exp: 08/2030
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Vicryl 1-0', 'VICR1094', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Vicryl 1-0'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Vicryl 1-0') LIMIT 1),
  5,
  0,
  '08/2030'
);

-- Item #96: Vicryl 2-0 | Qty: 25 | Exp: 02/2027
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Vicryl 2-0', 'VICR1095', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Vicryl 2-0'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Vicryl 2-0') LIMIT 1),
  25,
  0,
  '02/2027'
);

-- Item #97: Vicryl 3-0 | Qty: 34 | Exp: 05/2030
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Vicryl 3-0', 'VICR1096', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Vicryl 3-0'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Vicryl 3-0') LIMIT 1),
  34,
  0,
  '05/2030'
);

-- Item #98: Vicryl 3-0 | Qty: 12 | Exp: 02/2031
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Vicryl 3-0', 'VICR1097', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Vicryl 3-0'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Vicryl 3-0') LIMIT 1),
  12,
  0,
  '02/2031'
);

-- Item #99: Vicryl 4-0 | Qty: 16 | Exp: 05/2030
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Vicryl 4-0', 'VICR1098', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Vicryl 4-0'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Vicryl 4-0') LIMIT 1),
  16,
  0,
  '05/2030'
);

-- Item #100: Vicryl 5-0 | Qty: 44 | Exp: 09/2030
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Vicryl 5-0', 'VICR1099', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Vicryl 5-0'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Vicryl 5-0') LIMIT 1),
  44,
  0,
  '09/2030'
);

-- Item #101: Vicryl 6-0 | Qty: 18 | Exp: 02/2029
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Vicryl 6-0', 'VICR1100', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Vicryl 6-0'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Vicryl 6-0') LIMIT 1),
  18,
  0,
  '02/2029'
);

-- Item #102: Water for injection | Qty: 87 | Exp: 10/2026
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Water for injection', 'WATE1101', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Water for injection'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Water for injection') LIMIT 1),
  87,
  0,
  '10/2026'
);

-- Item #103: Water for injection | Qty: 50 | Exp: 08/2027
INSERT INTO master_inventory (name, sku, category, unit_of_measure)
SELECT 'Water for injection', 'WATE1102', 'consumables', 'pcs'
WHERE NOT EXISTS (SELECT 1 FROM master_inventory WHERE UPPER(name) = UPPER('Water for injection'));

INSERT INTO requisition_items (requisition_id, item_id, requested_quantity, approved_quantity, expiry_date)
VALUES (
  (SELECT MAX(id) FROM requisitions),
  (SELECT id FROM master_inventory WHERE UPPER(name) = UPPER('Water for injection') LIMIT 1),
  50,
  0,
  '08/2027'
);

COMMIT;
-- End of SQL Script
