-- ============================================================================
-- Procurement RFQ / Tender-Evaluation schema
-- ----------------------------------------------------------------------------
-- Models the "TABLEAU COMPARATIF DES PRIX" workflow: a Request For Quotation
-- (RFQ) is sent to several suppliers; each returns a proforma; prices are
-- consolidated per item; a committee awards each item (or item range) to the
-- lowest/best bidder; awarded lines become purchase orders.
--
-- Sits between requisitions and purchase_orders. SQLite-compatible; run once
-- (idempotent via IF NOT EXISTS). Re-run safe.
-- ============================================================================

-- The tender round == one comparative price table (one sheet in the workbook).
CREATE TABLE IF NOT EXISTS rfqs (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  reference_no   TEXT UNIQUE,                              -- optional tender no.
  title          TEXT NOT NULL,                            -- e.g. "NURSING", "REACTIF LABO"
  category       TEXT,                                     -- NURSING | LABO | DENTAL | LOGISTICS | ...
  requisition_id INTEGER REFERENCES requisitions(id) ON DELETE SET NULL,
  status         TEXT NOT NULL DEFAULT 'Draft'
                   CHECK (status IN ('Draft','Collecting','UnderReview','Awarded','Closed','Cancelled')),
  pricing_mode   TEXT NOT NULL DEFAULT 'total'             -- captures the two sheet layouts
                   CHECK (pricing_mode IN ('total','unit_total')),
  currency       TEXT NOT NULL DEFAULT 'RWF',
  location       TEXT DEFAULT 'Kigali',
  evaluated_on   TEXT,                                     -- the "Fait à Kigali, le <date>" date
  created_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  notes          TEXT,
  created_at     DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at     DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- Suppliers invited to a given RFQ == the price columns of the table.
CREATE TABLE IF NOT EXISTS rfq_suppliers (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  rfq_id       INTEGER NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
  vendor_id    INTEGER NOT NULL REFERENCES vendors(id) ON DELETE RESTRICT,
  column_order INTEGER DEFAULT 0,                          -- left-to-right position in the sheet
  responded    INTEGER NOT NULL DEFAULT 0,                 -- did they return a proforma?
  UNIQUE (rfq_id, vendor_id)
);

-- Line items being quoted == the rows of the table.
CREATE TABLE IF NOT EXISTS rfq_items (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  rfq_id         INTEGER NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
  line_no        INTEGER,                                  -- the N° column
  item_id        INTEGER REFERENCES master_inventory(id) ON DELETE SET NULL, -- optional catalog link
  item_name      TEXT NOT NULL,
  quantity       REAL,                                     -- parsed numeric qty (nullable)
  unit           TEXT,                                     -- parsed unit (boxes, pcs, bttles...)
  quantity_label TEXT,                                     -- raw QUANTITY text ("10 boxes", "300 bttles")
  UNIQUE (rfq_id, line_no)
);

-- One quote cell = (item x supplier). no_bid distinguishes "didn't quote"
-- (blank/0 in the sheet) from a genuine price -- these must NOT be conflated.
CREATE TABLE IF NOT EXISTS rfq_quotes (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  rfq_item_id     INTEGER NOT NULL REFERENCES rfq_items(id) ON DELETE CASCADE,
  rfq_supplier_id INTEGER NOT NULL REFERENCES rfq_suppliers(id) ON DELETE CASCADE,
  unit_price      REAL,
  total_price     REAL,
  no_bid          INTEGER NOT NULL DEFAULT 0,
  UNIQUE (rfq_item_id, rfq_supplier_id)
);

-- Committee decision, one per item. vendor_id is NULL when reason='no_offers'.
CREATE TABLE IF NOT EXISTS rfq_awards (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  rfq_id            INTEGER NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
  rfq_item_id       INTEGER NOT NULL REFERENCES rfq_items(id) ON DELETE CASCADE,
  vendor_id         INTEGER REFERENCES vendors(id) ON DELETE RESTRICT,
  awarded_quote_id  INTEGER REFERENCES rfq_quotes(id) ON DELETE SET NULL,
  awarded_price     REAL,
  reason            TEXT NOT NULL DEFAULT 'lowest'
                      CHECK (reason IN ('lowest','quality','sole_source','no_offers')),
  reason_note       TEXT,                                  -- e.g. "qualité du gel est la meilleure"
  purchase_order_id INTEGER REFERENCES purchase_orders(id) ON DELETE SET NULL,
  created_at        DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (rfq_item_id)
);

-- Sign-off panel (members may be named people who aren't app users).
CREATE TABLE IF NOT EXISTS rfq_committee (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  rfq_id      INTEGER NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
  user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  member_name TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'Member' CHECK (role IN ('Member','Chairperson')),
  signed      INTEGER NOT NULL DEFAULT 0,
  signed_at   TEXT,
  UNIQUE (rfq_id, member_name)
);

CREATE INDEX IF NOT EXISTS idx_rfqs_status          ON rfqs(status);
CREATE INDEX IF NOT EXISTS idx_rfqs_category        ON rfqs(category);
CREATE INDEX IF NOT EXISTS idx_rfq_suppliers_rfq    ON rfq_suppliers(rfq_id);
CREATE INDEX IF NOT EXISTS idx_rfq_suppliers_vendor ON rfq_suppliers(vendor_id);
CREATE INDEX IF NOT EXISTS idx_rfq_items_rfq        ON rfq_items(rfq_id);
CREATE INDEX IF NOT EXISTS idx_rfq_quotes_item      ON rfq_quotes(rfq_item_id);
CREATE INDEX IF NOT EXISTS idx_rfq_quotes_supplier  ON rfq_quotes(rfq_supplier_id);
CREATE INDEX IF NOT EXISTS idx_rfq_awards_rfq       ON rfq_awards(rfq_id);
CREATE INDEX IF NOT EXISTS idx_rfq_awards_vendor    ON rfq_awards(vendor_id);
CREATE INDEX IF NOT EXISTS idx_rfq_committee_rfq    ON rfq_committee(rfq_id);
