-- Migration: Results Transfer Module
-- Adds role for Lab Team Lead and creates results_transfers table

-- 1. Add Laboratory Team Lead role if it doesn't exist
INSERT INTO roles (name, display_name)
SELECT 'lab_team_lead', 'Laboratory Team Lead'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'lab_team_lead');

-- 2. Create results_transfers table
CREATE TABLE IF NOT EXISTS results_transfers (
    id                       SERIAL,
    
    -- Request Data
    transfer_date            DATE NOT NULL,
    old_sid                  VARCHAR(100) NOT NULL,
    new_sid                  VARCHAR(100) NOT NULL,
    reason                   TEXT NOT NULL,
    
    -- Laboratory Specific (Filled during approval)
    edited_by_name           VARCHAR(200),
    
    -- Workflow Status
    status                   VARCHAR(50) NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending', 'reviewed', 'approved', 'rejected')),
    rejection_comment        TEXT,
    
    -- Actors
    created_by               INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reviewed_by              INTEGER REFERENCES users(id) ON DELETE SET NULL,
    approved_by              INTEGER REFERENCES users(id) ON DELETE SET NULL,
    rejected_by              INTEGER REFERENCES users(id) ON DELETE SET NULL,
    
    -- Timestamps
    created_at               TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at              TIMESTAMPTZ,
    approved_at              TIMESTAMPTZ,
    rejected_at              TIMESTAMPTZ,
    updated_at               TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_res_trans_status ON results_transfers(status);
CREATE INDEX IF NOT EXISTS idx_res_trans_old_sid ON results_transfers(old_sid);
CREATE INDEX IF NOT EXISTS idx_res_trans_new_sid ON results_transfers(new_sid);
CREATE INDEX IF NOT EXISTS idx_res_trans_created_at ON results_transfers(created_at DESC);
