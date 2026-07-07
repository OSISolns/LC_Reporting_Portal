-- ============================================================================
-- Procurement Hub Expansion Migration
-- ----------------------------------------------------------------------------
-- Adds: vendor_documents, vendor_contracts, vendor_ratings,
--       purchase_invoices, invoice_line_items,
--       department_budgets, procurement_catalog
-- SQLite-compatible; idempotent via IF NOT EXISTS.
-- ============================================================================

-- ── Vendor Documents ─────────────────────────────────────────────────────────
-- Tracks compliance documents per vendor (contracts, tax certs, licenses, etc.)
CREATE TABLE IF NOT EXISTS vendor_documents (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  vendor_id    INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  doc_type     TEXT NOT NULL CHECK (doc_type IN ('contract','tax_certificate','license','insurance','other')),
  doc_name     TEXT NOT NULL,
  file_ref     TEXT,                   -- optional file path / URL reference
  issued_date  TEXT,                   -- ISO 8601
  expiry_date  TEXT,                   -- ISO 8601 — NULL means no expiry
  notes        TEXT,
  uploaded_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at   DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_vendor_documents_vendor ON vendor_documents(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_documents_expiry ON vendor_documents(expiry_date);

-- ── Vendor Contracts ─────────────────────────────────────────────────────────
-- Long-term supply agreements separate from one-off compliance docs
CREATE TABLE IF NOT EXISTS vendor_contracts (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  vendor_id      INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  contract_no    TEXT,
  title          TEXT NOT NULL,
  start_date     TEXT NOT NULL,         -- ISO 8601
  end_date       TEXT,                  -- NULL = open-ended
  contract_value REAL DEFAULT 0,
  currency       TEXT NOT NULL DEFAULT 'RWF',
  status         TEXT NOT NULL DEFAULT 'active'
                   CHECK (status IN ('draft','active','expired','terminated')),
  terms          TEXT,
  notes          TEXT,
  created_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at     DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at     DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_vendor_contracts_vendor ON vendor_contracts(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_contracts_status ON vendor_contracts(status);
CREATE INDEX IF NOT EXISTS idx_vendor_contracts_end    ON vendor_contracts(end_date);

-- ── Vendor Ratings ────────────────────────────────────────────────────────────
-- Star-rating logged after each GRN delivery
CREATE TABLE IF NOT EXISTS vendor_ratings (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  vendor_id   INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  grn_id      INTEGER REFERENCES goods_receipt_notes(id) ON DELETE SET NULL,
  rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  category    TEXT NOT NULL DEFAULT 'overall'
                CHECK (category IN ('overall','delivery_time','quality','packaging','communication')),
  comment     TEXT,
  rated_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at  DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_vendor_ratings_vendor ON vendor_ratings(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_ratings_grn    ON vendor_ratings(grn_id);

-- ── GRN Inspection Items ─────────────────────────────────────────────────────
-- Pass/Fail inspection result per line item in a GRN
CREATE TABLE IF NOT EXISTS grn_inspection_items (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  grn_id          INTEGER NOT NULL REFERENCES goods_receipt_notes(id) ON DELETE CASCADE,
  grn_item_id     INTEGER REFERENCES goods_receipt_note_items(id) ON DELETE CASCADE,
  item_name       TEXT NOT NULL,
  inspection_pass INTEGER NOT NULL DEFAULT 1,  -- 1=Pass, 0=Fail
  rejection_reason TEXT,
  inspected_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  inspected_at    DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_grn_inspection_grn ON grn_inspection_items(grn_id);

-- ── Purchase Invoices (Accounts Payable) ─────────────────────────────────────
-- Captures supplier invoices for AP processing and 3-way matching
CREATE TABLE IF NOT EXISTS purchase_invoices (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_no        TEXT,                   -- supplier's invoice reference
  po_id             INTEGER REFERENCES purchase_orders(id) ON DELETE SET NULL,
  grn_id            INTEGER REFERENCES goods_receipt_notes(id) ON DELETE SET NULL,
  vendor_id         INTEGER NOT NULL REFERENCES vendors(id) ON DELETE RESTRICT,
  invoice_date      TEXT NOT NULL,           -- ISO 8601
  due_date          TEXT,
  subtotal          REAL NOT NULL DEFAULT 0,
  tax_amount        REAL NOT NULL DEFAULT 0,
  total_amount      REAL NOT NULL DEFAULT 0,
  currency          TEXT NOT NULL DEFAULT 'RWF',
  payment_terms     TEXT,                    -- e.g. "Net 30"
  status            TEXT NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft','submitted','under_review','approved','rejected','paid')),
  match_status      TEXT NOT NULL DEFAULT 'unmatched'
                      CHECK (match_status IN ('unmatched','matched','discrepancy')),
  notes             TEXT,
  rejection_reason  TEXT,
  submitted_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reviewed_by       INTEGER REFERENCES users(id) ON DELETE SET NULL,
  approved_by       INTEGER REFERENCES users(id) ON DELETE SET NULL,
  paid_by           INTEGER REFERENCES users(id) ON DELETE SET NULL,
  submitted_at      DATETIME,
  reviewed_at       DATETIME,
  approved_at       DATETIME,
  paid_at           DATETIME,
  created_at        DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at        DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_invoices_vendor   ON purchase_invoices(vendor_id);
CREATE INDEX IF NOT EXISTS idx_invoices_po       ON purchase_invoices(po_id);
CREATE INDEX IF NOT EXISTS idx_invoices_grn      ON purchase_invoices(grn_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status   ON purchase_invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON purchase_invoices(due_date);

-- ── Invoice Line Items ────────────────────────────────────────────────────────
-- Per-line detail used in 3-way matching
CREATE TABLE IF NOT EXISTS invoice_line_items (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id   INTEGER NOT NULL REFERENCES purchase_invoices(id) ON DELETE CASCADE,
  item_name    TEXT NOT NULL,
  quantity     REAL NOT NULL DEFAULT 0,
  unit_price   REAL NOT NULL DEFAULT 0,
  total_price  REAL NOT NULL DEFAULT 0,
  po_quantity  REAL,                     -- from matched PO line (for 3-way check)
  grn_quantity REAL                      -- from matched GRN line (for 3-way check)
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_line_items(invoice_id);

-- ── Department Budgets ────────────────────────────────────────────────────────
-- Monthly/annual budget allocations per department for requisition approval routing
CREATE TABLE IF NOT EXISTS department_budgets (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  department_id   INTEGER REFERENCES departments(id) ON DELETE CASCADE,
  department_name TEXT NOT NULL,          -- denormalized for display
  period_type     TEXT NOT NULL DEFAULT 'monthly'
                    CHECK (period_type IN ('monthly','quarterly','annual')),
  period_year     INTEGER NOT NULL,
  period_month    INTEGER,                -- 1-12 for monthly; NULL for annual
  period_quarter  INTEGER,                -- 1-4 for quarterly; NULL otherwise
  budget_amount   REAL NOT NULL DEFAULT 0,
  currency        TEXT NOT NULL DEFAULT 'RWF',
  created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at      DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at      DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (department_name, period_type, period_year, period_month, period_quarter)
);

CREATE INDEX IF NOT EXISTS idx_budgets_dept   ON department_budgets(department_name);
CREATE INDEX IF NOT EXISTS idx_budgets_period ON department_budgets(period_year, period_month);

-- ── Procurement Catalog ───────────────────────────────────────────────────────
-- Approved items that can be requisitioned by departments (catalog browsing)
CREATE TABLE IF NOT EXISTS procurement_catalog (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  item_name        TEXT NOT NULL,
  category         TEXT NOT NULL DEFAULT 'medical_supplies',
  sku              TEXT,
  unit_of_measure  TEXT DEFAULT 'Unit',
  preferred_vendor INTEGER REFERENCES vendors(id) ON DELETE SET NULL,
  last_unit_price  REAL,
  is_active        INTEGER NOT NULL DEFAULT 1,
  notes            TEXT,
  master_item_id   INTEGER REFERENCES master_inventory(id) ON DELETE SET NULL,
  created_by       INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at       DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at       DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_catalog_category ON procurement_catalog(category);
CREATE INDEX IF NOT EXISTS idx_catalog_active   ON procurement_catalog(is_active);
