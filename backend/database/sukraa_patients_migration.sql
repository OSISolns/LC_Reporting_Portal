-- ============================================================
-- SUKRAA Patient Cache Table
-- Local mirror of patient records pulled from SUKRAA HIMS
-- Run once, or re-run to recreate from scratch.
-- ============================================================

CREATE TABLE IF NOT EXISTS sukraa_patients (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  pid           TEXT NOT NULL UNIQUE,          -- SUKRAA Patient ID (e.g. "23022172")
  full_name     TEXT NOT NULL,                 -- Full name in uppercase (e.g. "AKANTORANA JULIUS")
  age           TEXT,                          -- Age string (e.g. "36 Y")
  dob           TEXT,                          -- Date of Birth (DD/MM/YYYY from SUKRAA)
  gender        TEXT,                          -- "Male" or "Female"
  phone         TEXT,                          -- Primary phone number
  insurance     TEXT,                          -- Insurance provider if available
  extra_1       TEXT,                          -- Spare field from SUKRAA pipe (position 8)
  extra_2       TEXT,                          -- Spare field from SUKRAA pipe (position 9)
  source        TEXT NOT NULL DEFAULT 'sukraa',-- Data origin tag
  synced_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Index for fast full-text name searching
CREATE INDEX IF NOT EXISTS idx_sukraa_patients_name ON sukraa_patients(full_name);
CREATE INDEX IF NOT EXISTS idx_sukraa_patients_pid  ON sukraa_patients(pid);
CREATE INDEX IF NOT EXISTS idx_sukraa_patients_phone ON sukraa_patients(phone);

-- Sync log: tracks when syncs ran and how many records were pulled
CREATE TABLE IF NOT EXISTS sukraa_sync_log (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at    TEXT NOT NULL,
  completed_at  TEXT,
  records_added INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'running',  -- running | done | failed
  error_message TEXT
);
