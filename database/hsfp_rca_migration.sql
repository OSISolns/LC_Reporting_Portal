-- Migration: Add Structured RCA fields for HSFP Analysis
-- Run this against your Turso database

ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS rca_environment TEXT;
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS rca_staff TEXT;
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS rca_equipment TEXT;
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS rca_policy TEXT;
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS rca_verification_json TEXT; -- Stores the verification table data
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS corrective_actions_json TEXT; -- Stores the structured action plan
