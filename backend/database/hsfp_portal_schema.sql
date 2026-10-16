-- =============================================================
-- Legacy Clinics Lumina Reporting Portal
-- HEALTH & SAFETY FOCAL PERSON (HSFP) PORTAL - COMPLETE DATABASE SCHEMA
-- Compatible with PostgreSQL & SQLite / Turso LibSQL
-- =============================================================

-- 1. SAFETY REPORTS (Consolidated Clinical & Executive Safety Analysis)
CREATE TABLE IF NOT EXISTS safety_reports (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  title             TEXT NOT NULL,
  period_start      DATE NOT NULL,
  period_end        DATE NOT NULL,
  executive_summary TEXT NOT NULL DEFAULT '',
  key_findings      TEXT NOT NULL DEFAULT '',
  recommendations   TEXT NOT NULL DEFAULT '',
  status            TEXT NOT NULL DEFAULT 'published' CHECK(status IN ('draft', 'published', 'archived')),
  created_by        INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_safety_reports_created ON safety_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_safety_reports_period  ON safety_reports(period_start, period_end);

-- 2. ENTERPRISE RISK REGISTER (Clinical, Physical & Operational Risks)
CREATE TABLE IF NOT EXISTS risk_register (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  risk_code    TEXT UNIQUE NOT NULL,
  title        TEXT NOT NULL,
  category     TEXT NOT NULL CHECK(category IN ('Clinical', 'Operational', 'Financial', 'Environmental', 'Compliance', 'Information Security', 'Occupational Safety')),
  likelihood   INTEGER NOT NULL CHECK(likelihood BETWEEN 1 AND 5),
  impact       INTEGER NOT NULL CHECK(impact BETWEEN 1 AND 5),
  status       TEXT NOT NULL DEFAULT 'Active' CHECK(status IN ('Active', 'Mitigated', 'Transferred', 'Accepted', 'Closed')),
  owner        TEXT NOT NULL,
  mitigation   TEXT NOT NULL DEFAULT '',
  date         TEXT NOT NULL,
  created_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_risk_register_category ON risk_register(category);
CREATE INDEX IF NOT EXISTS idx_risk_register_status   ON risk_register(status);
CREATE INDEX IF NOT EXISTS idx_risk_register_date     ON risk_register(date DESC);

-- 3. INFECTION SURVEILLANCE & HAI TRACKER (Infection Prevention & Control)
CREATE TABLE IF NOT EXISTS infection_cases (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  case_code           TEXT UNIQUE NOT NULL,
  infection_type      TEXT NOT NULL CHECK(infection_type IN ('Surgical Site Infection (SSI)', 'Catheter-Associated UTI (CAUTI)', 'Central Line Bloodstream (CLABSI)', 'Ventilator-Associated Pneumonia (VAP)', 'Gastrointestinal (C. diff / Norovirus)', 'Multi-Drug Resistant Organism (MDRO)', 'Respiratory Viral (COVID/Influenza)', 'Occupational Exposure', 'Other HAI')),
  department          TEXT NOT NULL,
  patient_identifier  TEXT NOT NULL DEFAULT '',
  date                TEXT NOT NULL,
  severity            TEXT NOT NULL DEFAULT 'Medium' CHECK(severity IN ('Low', 'Medium', 'High', 'Critical')),
  status              TEXT NOT NULL DEFAULT 'Active' CHECK(status IN ('Active', 'Isolated', 'Under Investigation', 'Resolved', 'Closed')),
  investigation_notes TEXT NOT NULL DEFAULT '',
  corrective_actions  TEXT NOT NULL DEFAULT '',
  created_by          INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_infection_cases_dept   ON infection_cases(department);
CREATE INDEX IF NOT EXISTS idx_infection_cases_status ON infection_cases(status);
CREATE INDEX IF NOT EXISTS idx_infection_cases_date   ON infection_cases(date DESC);

-- 4. HYGIENE & STERILIZATION AUDITS (Hand Hygiene & CSSD Validation)
CREATE TABLE IF NOT EXISTS hygiene_audits (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  audit_code            TEXT UNIQUE NOT NULL,
  department            TEXT NOT NULL,
  auditor_name          TEXT NOT NULL,
  compliance_score      REAL NOT NULL CHECK(compliance_score BETWEEN 0 AND 100),
  total_opportunities   INTEGER NOT NULL DEFAULT 0,
  missed_opportunities  INTEGER NOT NULL DEFAULT 0,
  sterilization_passed  INTEGER NOT NULL DEFAULT 1 CHECK(sterilization_passed IN (0, 1)),
  observations          TEXT NOT NULL DEFAULT '',
  corrective_actions    TEXT NOT NULL DEFAULT '',
  audit_date            TEXT NOT NULL,
  created_by            INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at            DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_hygiene_audits_dept  ON hygiene_audits(department);
CREATE INDEX IF NOT EXISTS idx_hygiene_audits_date  ON hygiene_audits(audit_date DESC);
CREATE INDEX IF NOT EXISTS idx_hygiene_audits_score ON hygiene_audits(compliance_score);

-- 5. WORKPLACE HEALTH & SAFETY INSPECTIONS (EHS Rounds & Environment Audits)
CREATE TABLE IF NOT EXISTS hsfp_inspections (
  id                      INTEGER PRIMARY KEY AUTOINCREMENT,
  inspection_code         TEXT UNIQUE NOT NULL,
  department              TEXT NOT NULL,
  inspector_id            INTEGER REFERENCES users(id) ON DELETE SET NULL,
  inspector_name          TEXT NOT NULL,
  inspection_date         TEXT NOT NULL,
  area_inspected          TEXT NOT NULL DEFAULT '',
  ppe_compliance_pct      REAL NOT NULL DEFAULT 100 CHECK(ppe_compliance_pct BETWEEN 0 AND 100),
  fire_safety_passed      INTEGER NOT NULL DEFAULT 1 CHECK(fire_safety_passed IN (0, 1)),
  waste_management_passed INTEGER NOT NULL DEFAULT 1 CHECK(waste_management_passed IN (0, 1)),
  sharps_safety_passed    INTEGER NOT NULL DEFAULT 1 CHECK(sharps_safety_passed IN (0, 1)),
  spill_kit_verified      INTEGER NOT NULL DEFAULT 1 CHECK(spill_kit_verified IN (0, 1)),
  hazard_notes            TEXT NOT NULL DEFAULT '',
  corrective_actions      TEXT NOT NULL DEFAULT '',
  status                  TEXT NOT NULL DEFAULT 'Passed' CHECK(status IN ('Passed', 'Corrective Action Required', 'Critical Non-Compliance', 'Resolved')),
  created_at              DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at              DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_hsfp_inspections_dept   ON hsfp_inspections(department);
CREATE INDEX IF NOT EXISTS idx_hsfp_inspections_date   ON hsfp_inspections(inspection_date DESC);
CREATE INDEX IF NOT EXISTS idx_hsfp_inspections_status ON hsfp_inspections(status);

-- 6. OCCUPATIONAL HEALTH & SHARPS/HAZARD EXPOSURE LOG
CREATE TABLE IF NOT EXISTS hsfp_hazard_logs (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  log_code           TEXT UNIQUE NOT NULL,
  incident_id        INTEGER REFERENCES incident_reports(id) ON DELETE SET NULL,
  affected_staff     TEXT NOT NULL,
  department         TEXT NOT NULL,
  exposure_type      TEXT NOT NULL CHECK(exposure_type IN ('Needle Stick / Sharps Injury', 'Blood / Body Fluid Splash', 'Chemical Exposure', 'Slip / Trip / Fall', 'Ergonomic Injury', 'Thermal / Electrical Burn', 'Physical Assault', 'Other')),
  exposure_date      TEXT NOT NULL,
  pep_initiated      INTEGER NOT NULL DEFAULT 0 CHECK(pep_initiated IN (0, 1)),
  source_patient_id  TEXT DEFAULT '',
  immediate_actions  TEXT NOT NULL DEFAULT '',
  follow_up_date     TEXT DEFAULT '',
  status             TEXT NOT NULL DEFAULT 'Open' CHECK(status IN ('Open', 'Under Treatment', 'Closed - Safe')),
  created_by         INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_hsfp_hazard_type   ON hsfp_hazard_logs(exposure_type);
CREATE INDEX IF NOT EXISTS idx_hsfp_hazard_status ON hsfp_hazard_logs(status);
CREATE INDEX IF NOT EXISTS idx_hsfp_hazard_date   ON hsfp_hazard_logs(exposure_date DESC);
