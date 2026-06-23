-- ============================================================
-- REFUND REQUESTS TABLE
-- Run this migration against your Turso / LibSQL database
-- ============================================================
CREATE TABLE IF NOT EXISTS refund_requests (
  id                      INTEGER      PRIMARY KEY AUTOINCREMENT,

  -- Patient Information
  patient_full_name       TEXT         NOT NULL,
  pid_number              TEXT         NOT NULL,
  sid_number              TEXT,
  telephone_number        TEXT,
  insurance_payer         TEXT,

  -- Transaction Details (Refund-specific)
  momo_code               TEXT,
  total_amount_paid       REAL         NOT NULL DEFAULT 0,
  amount_to_be_refunded   REAL         NOT NULL DEFAULT 0,
  amount_paid_by          TEXT,
  original_receipt_number TEXT,

  -- Dates
  initial_transaction_date TEXT,

  -- Reason
  reason_for_refund        TEXT         NOT NULL,

  -- Workflow
  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','verified','approved','rejected')),
  rejection_comment TEXT,

  -- Actors
  created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  verified_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  rejected_by INTEGER REFERENCES users(id) ON DELETE SET NULL,

  -- Timestamps
  created_at  TEXT DEFAULT (datetime('now')),
  verified_at TEXT,
  approved_at TEXT,
  rejected_at TEXT,
  updated_at  TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_refund_status     ON refund_requests(status);
CREATE INDEX IF NOT EXISTS idx_refund_created_at ON refund_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_refund_pid        ON refund_requests(pid_number);
CREATE INDEX IF NOT EXISTS idx_refund_name       ON refund_requests(patient_full_name);
CREATE INDEX IF NOT EXISTS idx_refund_created_by ON refund_requests(created_by);
