-- =============================================================
-- Shift Open/Close Module — Migration
-- Compatible with Turso/LibSQL (SQLite dialect)
-- Run AFTER the base schema.sql
-- =============================================================

-- =============================================================
-- SHIFT SESSIONS
-- Core table: one row per shift (open → draft → closed)
-- =============================================================
CREATE TABLE IF NOT EXISTS shift_sessions (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,

  -- Actor
  user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

  -- Shift role selected AT open time (independent of system role)
  shift_role          TEXT NOT NULL CHECK (shift_role IN ('cashier', 'helpdesk', 'call_center')),

  -- Lifecycle
  status              TEXT NOT NULL DEFAULT 'open'
                      CHECK (status IN ('open', 'draft', 'closed')),

  -- Auto-timestamped by server
  opened_at           DATETIME NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  closed_at           DATETIME,

  -- Handover (mandatory on close)
  handover_notes      TEXT,

  -- Review workflow
  reviewed_by         INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at         DATETIME,
  is_flagged          INTEGER NOT NULL DEFAULT 0,  -- 1 = flagged for attention
  flag_reasons        TEXT,                        -- JSON array of reason strings

  -- Timestamps
  created_at          DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at          DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- =============================================================
-- EQUIPMENT CHECKLISTS
-- One row per equipment item per shift (open or close snapshot)
-- =============================================================
CREATE TABLE IF NOT EXISTS shift_equipment_logs (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  shift_id        INTEGER NOT NULL REFERENCES shift_sessions(id) ON DELETE CASCADE,
  snapshot        TEXT NOT NULL CHECK (snapshot IN ('open', 'close')),

  equipment_name  TEXT NOT NULL,
  equipment_status TEXT NOT NULL
                  CHECK (equipment_status IN ('Working', 'Needs Repair', 'Broken/Missing')),
  remarks         TEXT,

  created_at      DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- =============================================================
-- CASHIER OPENING DATA
-- =============================================================
CREATE TABLE IF NOT EXISTS shift_cashier_open (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  shift_id        INTEGER UNIQUE NOT NULL REFERENCES shift_sessions(id) ON DELETE CASCADE,
  opening_float   REAL NOT NULL DEFAULT 0,
  created_at      DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- =============================================================
-- CASHIER CLOSING DATA
-- =============================================================
CREATE TABLE IF NOT EXISTS shift_cashier_close (
  id                          INTEGER PRIMARY KEY AUTOINCREMENT,
  shift_id                    INTEGER UNIQUE NOT NULL REFERENCES shift_sessions(id) ON DELETE CASCADE,

  -- Patient counts
  total_patients              INTEGER NOT NULL DEFAULT 0,
  total_insured               INTEGER NOT NULL DEFAULT 0,
  total_private               INTEGER NOT NULL DEFAULT 0,
  insurances_used             TEXT,   -- JSON array: ["RSSB","MMI","RAMA",...]

  -- Private payment breakdown
  total_momo_transactions     INTEGER NOT NULL DEFAULT 0,
  total_card_transactions     INTEGER NOT NULL DEFAULT 0,
  card_bank_terminal          TEXT,

  -- Payment reconciliation
  payments_all_successful     INTEGER NOT NULL DEFAULT 1,
  failed_payment_status       TEXT,
  failed_payment_amount       REAL,
  failed_payment_action_taken TEXT,

  -- Cash float
  opening_float               REAL NOT NULL DEFAULT 0,
  closing_float               REAL NOT NULL DEFAULT 0,
  cash_payments_total         REAL NOT NULL DEFAULT 0,
  cash_discrepancy            REAL NOT NULL DEFAULT 0,

  created_at  DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at  DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- =============================================================
-- HELPDESK CLOSING DATA
-- =============================================================
CREATE TABLE IF NOT EXISTS shift_helpdesk_close (
  id                      INTEGER PRIMARY KEY AUTOINCREMENT,
  shift_id                INTEGER UNIQUE NOT NULL REFERENCES shift_sessions(id) ON DELETE CASCADE,

  patient_walkin_queries  INTEGER NOT NULL DEFAULT 0,
  internal_staff_queries  INTEGER NOT NULL DEFAULT 0,

  created_at  DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at  DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- =============================================================
-- CALL CENTER CLOSING DATA
-- =============================================================
CREATE TABLE IF NOT EXISTS shift_callcenter_close (
  id                      INTEGER PRIMARY KEY AUTOINCREMENT,
  shift_id                INTEGER UNIQUE NOT NULL REFERENCES shift_sessions(id) ON DELETE CASCADE,

  -- Inbound
  inbound_total           INTEGER NOT NULL DEFAULT 0,
  inbound_assisted        INTEGER NOT NULL DEFAULT 0,
  inbound_dropped         INTEGER NOT NULL DEFAULT 0,

  -- Outbound
  outbound_total          INTEGER NOT NULL DEFAULT 0,
  outbound_reached        INTEGER NOT NULL DEFAULT 0,
  outbound_unreached      INTEGER NOT NULL DEFAULT 0,

  -- Call categorization: top 3 reasons (JSON array)
  call_top_reasons        TEXT,

  -- Pending follow-ups
  has_pending_followups   INTEGER NOT NULL DEFAULT 0,
  followup_details        TEXT,   -- JSON array: [{patient_id, name, notes}]

  created_at  DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at  DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- =============================================================
-- INDEXES
-- =============================================================
CREATE INDEX IF NOT EXISTS idx_shift_user_id     ON shift_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_shift_status      ON shift_sessions(status);
CREATE INDEX IF NOT EXISTS idx_shift_role        ON shift_sessions(shift_role);
CREATE INDEX IF NOT EXISTS idx_shift_opened_at   ON shift_sessions(opened_at DESC);
CREATE INDEX IF NOT EXISTS idx_shift_is_flagged  ON shift_sessions(is_flagged);
CREATE INDEX IF NOT EXISTS idx_equip_shift_id    ON shift_equipment_logs(shift_id);
CREATE INDEX IF NOT EXISTS idx_equip_snapshot    ON shift_equipment_logs(snapshot);
