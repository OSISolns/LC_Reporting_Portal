-- Migration: Add HSFP approval columns to incident_reports + seed hsfp role
-- Run this once against your Turso database

-- 1. Add new columns to incident_reports
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS approved_by INTEGER REFERENCES users(id);
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS approved_at DATETIME;
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS hsfp_comments TEXT;

-- 2. Add 'hsfp' to roles table
INSERT INTO roles (name, display_name) VALUES ('hsfp', 'Health & Safety Focal Person') ON CONFLICT (name) DO NOTHING;
