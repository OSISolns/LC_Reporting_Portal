-- Migration: Add Structured RCA fields for HSFP Analysis
-- Run this against your Turso database

ALTER TABLE incident_reports ADD COLUMN rca_environment TEXT;
ALTER TABLE incident_reports ADD COLUMN rca_staff TEXT;
ALTER TABLE incident_reports ADD COLUMN rca_equipment TEXT;
ALTER TABLE incident_reports ADD COLUMN rca_policy TEXT;
ALTER TABLE incident_reports ADD COLUMN rca_verification_json TEXT; -- Stores the verification table data
ALTER TABLE incident_reports ADD COLUMN corrective_actions_json TEXT; -- Stores the structured action plan
