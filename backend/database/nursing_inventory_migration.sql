-- Migration to create nursing monthly stock inventory checking table
CREATE TABLE IF NOT EXISTS nursing_monthly_stock (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  month_year TEXT NOT NULL, -- e.g. "2026-05"
  item_name TEXT NOT NULL,
  day INTEGER NOT NULL, -- 1 to 31
  session TEXT NOT NULL, -- "AM" or "PM"
  stock_in_hands INTEGER DEFAULT 0,
  consumed INTEGER DEFAULT 0,
  balance INTEGER DEFAULT 0,
  responsible_name TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_nursing_stock_unique 
ON nursing_monthly_stock(month_year, item_name, day, session);
