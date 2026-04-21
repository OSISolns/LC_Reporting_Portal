-- =============================================================
-- Legacy Clinics Reporting Portal — PostgreSQL Database Schema
-- =============================================================

-- Drop existing tables for clean installation
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS incident_reports CASCADE;
DROP TABLE IF EXISTS cancellation_requests CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

-- =============================================================
-- ROLES
-- =============================================================
CREATE TABLE roles (
  id           SERIAL PRIMARY KEY,
  name         VARCHAR(50)  UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  created_at   TIMESTAMPTZ  DEFAULT NOW()
);

INSERT INTO roles (name, display_name) VALUES
  ('cashier',          'Cashier'),
  ('customer_care',    'Customer Care'),
  ('operations_staff', 'Operations Staff'),
  ('sales_manager',    'Sales Manager'),
  ('coo',              'Chief Operations Officer'),
  ('deputy_coo',       'Deputy COO'),
  ('quality_assurance','Quality & Assurance'),
  ('chairman',         'Chairman'),
  ('lab_team_lead',    'Laboratory Team Lead'),
  ('it_officer',       'IT Officer');

-- =============================================================
-- USERS
-- =============================================================
CREATE TABLE users (
  id            SERIAL       PRIMARY KEY,
  full_name     VARCHAR(200) NOT NULL,
  email         VARCHAR(200) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role_id       INTEGER      NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  is_active     BOOLEAN      DEFAULT TRUE,
  last_login    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ  DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  DEFAULT NOW()
);

-- =============================================================
-- CANCELLATION REQUESTS
-- =============================================================
CREATE TABLE cancellation_requests (
  id                       SERIAL       PRIMARY KEY,

  -- Patient Information
  patient_full_name        VARCHAR(200) NOT NULL,
  pid_number               VARCHAR(100) NOT NULL,
  old_sid_number           VARCHAR(100),
  new_sid_number           VARCHAR(100),
  telephone_number         VARCHAR(50),
  insurance_payer          VARCHAR(200),

  -- Financial
  total_amount_cancelled   NUMERIC(15,2) NOT NULL DEFAULT 0,
  original_receipt_number  VARCHAR(100),
  rectified_receipt_number VARCHAR(100),

  -- Dates
  initial_transaction_date DATE,
  rectified_date           DATE,

  -- Reason
  reason_for_cancellation  TEXT NOT NULL,

  -- Workflow
  status            VARCHAR(50) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','verified','approved','rejected')),
  rejection_comment TEXT,

  -- Actors
  created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  verified_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  rejected_by INTEGER REFERENCES users(id) ON DELETE SET NULL,

  -- Timestamps
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  verified_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- INCIDENT REPORTS
-- =============================================================
CREATE TABLE incident_reports (
  id                  SERIAL      PRIMARY KEY,
  incident_type       VARCHAR(50) NOT NULL
                      CHECK (incident_type IN ('Patient','Staff','Equipment','Others')),
  department          VARCHAR(200) NOT NULL,
  area_of_incident    VARCHAR(200) NOT NULL,
  names_involved      TEXT        NOT NULL,
  pid_number          VARCHAR(100),
  description         TEXT        NOT NULL,
  contributing_factors TEXT,
  immediate_actions   TEXT,
  prevention_measures TEXT,
  created_by          INTEGER REFERENCES users(id) ON DELETE SET NULL,
  status              VARCHAR(50) NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'reviewed')),
  reviewed_by         INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at         TIMESTAMPTZ,
  review_comments     TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- AUDIT LOGS
-- =============================================================
CREATE TABLE audit_logs (
  id          SERIAL      PRIMARY KEY,
  user_id     INTEGER     REFERENCES users(id) ON DELETE SET NULL,
  user_name   VARCHAR(200),           -- Denormalized for historical accuracy
  user_role   VARCHAR(50),
  action      VARCHAR(100) NOT NULL,  -- CREATE, UPDATE, VERIFY, APPROVE, REJECT, DELETE, LOGIN
  entity_type VARCHAR(100) NOT NULL,  -- cancellation_request, incident_report, user
  entity_id   INTEGER,
  details     JSONB,
  ip_address  VARCHAR(50),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- INDEXES
-- =============================================================
CREATE INDEX idx_cancellation_status     ON cancellation_requests(status);
CREATE INDEX idx_cancellation_created_at ON cancellation_requests(created_at DESC);
CREATE INDEX idx_cancellation_pid        ON cancellation_requests(pid_number);
CREATE INDEX idx_cancellation_name       ON cancellation_requests(patient_full_name);
CREATE INDEX idx_cancellation_created_by ON cancellation_requests(created_by);

CREATE INDEX idx_incident_created_at ON incident_reports(created_at DESC);
CREATE INDEX idx_incident_type       ON incident_reports(incident_type);
CREATE INDEX idx_incident_department ON incident_reports(department);
CREATE INDEX idx_incident_created_by ON incident_reports(created_by);

CREATE INDEX idx_audit_entity     ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_user       ON audit_logs(user_id);
CREATE INDEX idx_audit_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_action     ON audit_logs(action);

CREATE INDEX idx_users_email   ON users(email);
CREATE INDEX idx_users_role_id ON users(role_id);

-- =============================================================
-- RESULTS TRANSFERS
-- =============================================================
CREATE TABLE IF NOT EXISTS results_transfers (
    id                       SERIAL PRIMARY KEY,
    transfer_date            DATE NOT NULL,
    old_sid                  VARCHAR(100) NOT NULL,
    new_sid                  VARCHAR(100) NOT NULL,
    reason                   TEXT NOT NULL,
    status                   VARCHAR(50) NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending', 'reviewed', 'approved', 'rejected')),
    
    -- Actors
    created_by               INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reviewed_by              INTEGER REFERENCES users(id) ON DELETE SET NULL,
    approved_by              INTEGER REFERENCES users(id) ON DELETE SET NULL,
    rejected_by              INTEGER REFERENCES users(id) ON DELETE SET NULL,
    
    -- Meta
    edited_by_name           VARCHAR(200),
    rejection_comment        TEXT,
    
    -- Timestamps
    created_at               TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at              TIMESTAMPTZ,
    approved_at               TIMESTAMPTZ,
    rejected_at              TIMESTAMPTZ,
    updated_at               TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rt_status     ON results_transfers(status);
CREATE INDEX idx_rt_old_sid    ON results_transfers(old_sid);
CREATE INDEX idx_rt_new_sid    ON results_transfers(new_sid);
CREATE INDEX idx_rt_created_at ON results_transfers(created_at DESC);

-- Performance Indexes for Permission System
CREATE INDEX IF NOT EXISTS idx_role_permissions_lookup ON role_permissions(role_name, module, action);
CREATE INDEX IF NOT EXISTS idx_user_overrides_lookup ON user_permission_overrides(user_id, module, action);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
