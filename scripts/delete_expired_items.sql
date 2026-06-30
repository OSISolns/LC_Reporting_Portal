-- =============================================================================
-- DELETE EXPIRED NURSING STOCK ITEMS
-- Target DB : Turso (libSQL / SQLite-compatible)
-- Tables    : nursing_monthly_stock, nursing_deleted_items
-- Run with  : npx @libsql/client or the Turso CLI (turso db shell <db-name>)
-- =============================================================================
-- SAFETY: Wrap everything in a transaction so it rolls back on any error.
-- In Turso shell you can omit BEGIN/COMMIT and it auto-commits per statement.
-- -----------------------------------------------------------------------------

BEGIN;

-- ─── STEP 1: Preview — see what will be deleted BEFORE running ───────────────
-- Run this SELECT first to review, then comment it out and run STEP 2.

SELECT
    item_name,
    month_year,
    COUNT(*)           AS record_count,
    expiration_date,
    status
FROM nursing_monthly_stock
WHERE
    -- Match rows the app tagged as Expired
    status = 'Expired'
    -- OR match rows whose expiration_date is in the past.
    -- expiration_date is stored as 'DD/MM/YYYY' (e.g. '30/04/2026')
    -- SQLite has no native date parser for that format, so we rebuild it:
    --   substr(expiration_date,7,4) = year  (chars 7-10)
    --   substr(expiration_date,4,2) = month (chars 4-5)
    --   substr(expiration_date,1,2) = day   (chars 1-2)
    OR (
        expiration_date IS NOT NULL
        AND expiration_date != ''
        AND expiration_date != 'No Expiry Listed'
        AND length(expiration_date) >= 8
        AND (
            substr(expiration_date,7,4) || '-' ||
            substr(expiration_date,4,2) || '-' ||
            substr(expiration_date,1,2)
        ) < date('now')
    )
GROUP BY item_name, month_year, expiration_date, status
ORDER BY month_year, item_name;


-- ─── STEP 2: Archive expired items into nursing_deleted_items ─────────────────
-- This ensures the UI continues to hide them after deletion (same table the
-- "Delete from roster" button writes to).

INSERT OR IGNORE INTO nursing_deleted_items (month_year, item_name, deleted_by)
SELECT DISTINCT
    month_year,
    item_name,
    'SQL_CLEANUP_SCRIPT'
FROM nursing_monthly_stock
WHERE
    status = 'Expired'
    OR (
        expiration_date IS NOT NULL
        AND expiration_date != ''
        AND expiration_date != 'No Expiry Listed'
        AND length(expiration_date) >= 8
        AND (
            substr(expiration_date,7,4) || '-' ||
            substr(expiration_date,4,2) || '-' ||
            substr(expiration_date,1,2)
        ) < date('now')
    );


-- ─── STEP 3: Delete from the stock ledger ────────────────────────────────────
-- Removes all daily session rows (AM/PM × each day of the month) for expired items.

DELETE FROM nursing_monthly_stock
WHERE
    status = 'Expired'
    OR (
        expiration_date IS NOT NULL
        AND expiration_date != ''
        AND expiration_date != 'No Expiry Listed'
        AND length(expiration_date) >= 8
        AND (
            substr(expiration_date,7,4) || '-' ||
            substr(expiration_date,4,2) || '-' ||
            substr(expiration_date,1,2)
        ) < date('now')
    );


-- ─── STEP 4: Verify — rows remaining after deletion ──────────────────────────

SELECT
    status,
    COUNT(*) AS remaining_rows
FROM nursing_monthly_stock
GROUP BY status
ORDER BY status;


COMMIT;

-- =============================================================================
-- OPTIONAL: Delete ONLY for a specific month (e.g. June 2026)
-- Uncomment and adjust month_year below if you want a scoped cleanup.
-- =============================================================================
/*
DELETE FROM nursing_monthly_stock
WHERE month_year = '2026-06'
  AND (
      status = 'Expired'
      OR (
          expiration_date IS NOT NULL
          AND expiration_date != ''
          AND expiration_date != 'No Expiry Listed'
          AND length(expiration_date) >= 8
          AND (
              substr(expiration_date,7,4) || '-' ||
              substr(expiration_date,4,2) || '-' ||
              substr(expiration_date,1,2)
          ) < date('now')
      )
  );
*/
