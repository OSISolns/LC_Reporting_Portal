-- =============================================================
-- Legacy Clinics Lumina Portal — PostgreSQL Database Schema
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
  ('customer_care',    'Customer Care Officer'),
  ('operations_staff', 'Operations Staff'),
  ('sales_manager',    'Sales Manager'),
  ('coo',              'Chief Operations Officer'),
  ('deputy_coo',       'Deputy COO'),
  ('chairman',         'Chairman'),
  ('lab_team_lead',    'Laboratory Team Lead'),
  ('it_officer',       'IT Officer'),
  ('principal_cashier',  'Principal Cashier');

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
                    CHECK (status IN ('pending','verified','sales_verified','approved','rejected')),
  rejection_comment TEXT,

  -- Actors
  created_by        INTEGER REFERENCES users(id) ON DELETE SET NULL,
  verified_by       INTEGER REFERENCES users(id) ON DELETE SET NULL,
  sales_verified_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  approved_by       INTEGER REFERENCES users(id) ON DELETE SET NULL,
  rejected_by       INTEGER REFERENCES users(id) ON DELETE SET NULL,

  -- Timestamps
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  verified_at       TIMESTAMPTZ,
  sales_verified_at TIMESTAMPTZ,
  approved_at       TIMESTAMPTZ,
  rejected_at       TIMESTAMPTZ,
  updated_at        TIMESTAMPTZ DEFAULT NOW()
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
    department               VARCHAR(100) DEFAULT 'Laboratory',
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

-- =============================================================
-- HEALTH & SAFETY FOCAL PERSON (HSFP) PORTAL
-- =============================================================

-- Safety Management Reports
CREATE TABLE IF NOT EXISTS safety_reports (
  id                SERIAL PRIMARY KEY,
  title             VARCHAR(255) NOT NULL,
  period_start      DATE NOT NULL,
  period_end        DATE NOT NULL,
  executive_summary TEXT NOT NULL DEFAULT '',
  key_findings      TEXT NOT NULL DEFAULT '',
  recommendations   TEXT NOT NULL DEFAULT '',
  status            VARCHAR(50) NOT NULL DEFAULT 'published',
  created_by        INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Enterprise Risk Register
CREATE TABLE IF NOT EXISTS risk_register (
  id           SERIAL PRIMARY KEY,
  risk_code    VARCHAR(50) UNIQUE NOT NULL,
  title        VARCHAR(255) NOT NULL,
  category     VARCHAR(100) NOT NULL,
  likelihood   INTEGER NOT NULL CHECK(likelihood BETWEEN 1 AND 5),
  impact       INTEGER NOT NULL CHECK(impact BETWEEN 1 AND 5),
  status       VARCHAR(50) NOT NULL DEFAULT 'Active',
  owner        VARCHAR(150) NOT NULL,
  mitigation   TEXT NOT NULL DEFAULT '',
  date         VARCHAR(50) NOT NULL,
  created_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Infection Cases (HAI Surveillance)
CREATE TABLE IF NOT EXISTS infection_cases (
  id                  SERIAL PRIMARY KEY,
  case_code           VARCHAR(50) UNIQUE NOT NULL,
  infection_type      VARCHAR(150) NOT NULL,
  department          VARCHAR(100) NOT NULL,
  patient_identifier  VARCHAR(150) NOT NULL DEFAULT '',
  date                VARCHAR(50) NOT NULL,
  severity            VARCHAR(50) NOT NULL DEFAULT 'Medium',
  status              VARCHAR(50) NOT NULL DEFAULT 'Active',
  investigation_notes TEXT NOT NULL DEFAULT '',
  corrective_actions  TEXT NOT NULL DEFAULT '',
  created_by          INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Hygiene & Sterilization Audits
CREATE TABLE IF NOT EXISTS hygiene_audits (
  id                    SERIAL PRIMARY KEY,
  audit_code            VARCHAR(50) UNIQUE NOT NULL,
  department            VARCHAR(100) NOT NULL,
  auditor_name          VARCHAR(150) NOT NULL,
  compliance_score      NUMERIC(5,2) NOT NULL,
  total_opportunities   INTEGER NOT NULL DEFAULT 0,
  missed_opportunities  INTEGER NOT NULL DEFAULT 0,
  sterilization_passed  INTEGER NOT NULL DEFAULT 1,
  observations          TEXT NOT NULL DEFAULT '',
  corrective_actions    TEXT NOT NULL DEFAULT '',
  audit_date            VARCHAR(50) NOT NULL,
  created_by            INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Workplace Health & Safety Inspections
CREATE TABLE IF NOT EXISTS hsfp_inspections (
  id                      SERIAL PRIMARY KEY,
  inspection_code         VARCHAR(50) UNIQUE NOT NULL,
  department              VARCHAR(100) NOT NULL,
  inspector_id            INTEGER REFERENCES users(id) ON DELETE SET NULL,
  inspector_name          VARCHAR(150) NOT NULL,
  inspection_date         VARCHAR(50) NOT NULL,
  area_inspected          VARCHAR(200) NOT NULL DEFAULT '',
  ppe_compliance_pct      NUMERIC(5,2) NOT NULL DEFAULT 100,
  fire_safety_passed      INTEGER NOT NULL DEFAULT 1,
  waste_management_passed INTEGER NOT NULL DEFAULT 1,
  sharps_safety_passed    INTEGER NOT NULL DEFAULT 1,
  spill_kit_verified      INTEGER NOT NULL DEFAULT 1,
  hazard_notes            TEXT NOT NULL DEFAULT '',
  corrective_actions      TEXT NOT NULL DEFAULT '',
  status                  VARCHAR(50) NOT NULL DEFAULT 'Passed',
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- Occupational Health & Sharps/Hazard Exposure Log
CREATE TABLE IF NOT EXISTS hsfp_hazard_logs (
  id                 SERIAL PRIMARY KEY,
  log_code           VARCHAR(50) UNIQUE NOT NULL,
  incident_id        INTEGER REFERENCES incident_reports(id) ON DELETE SET NULL,
  affected_staff     VARCHAR(150) NOT NULL,
  department         VARCHAR(100) NOT NULL,
  exposure_type      VARCHAR(100) NOT NULL,
  exposure_date      VARCHAR(50) NOT NULL,
  pep_initiated      INTEGER NOT NULL DEFAULT 0,
  source_patient_id  VARCHAR(100) DEFAULT '',
  immediate_actions  TEXT NOT NULL DEFAULT '',
  follow_up_date     VARCHAR(50) DEFAULT '',
  status             VARCHAR(50) NOT NULL DEFAULT 'Open',
  created_by         INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_risk_status     ON risk_register(status);
CREATE INDEX IF NOT EXISTS idx_infection_dept  ON infection_cases(department);
CREATE INDEX IF NOT EXISTS idx_hygiene_score   ON hygiene_audits(compliance_score);
CREATE INDEX IF NOT EXISTS idx_hsfp_insp_dept  ON hsfp_inspections(department);
CREATE INDEX IF NOT EXISTS idx_hsfp_haz_exp    ON hsfp_hazard_logs(exposure_type);

