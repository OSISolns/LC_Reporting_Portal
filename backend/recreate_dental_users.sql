-- ==============================================================================
-- SQL Script to Recreate / Seed Dental Department Roles and Users
-- Project: Legacy Clinics Reporting Portal
-- Default Password for all created users: Password123!
-- ==============================================================================

-- 1. Ensure Dental Department Roles Exist in 'roles' table
INSERT INTO roles (name, display_name) VALUES
  ('dental_hod', 'Dental Head of Department'),
  ('dental_lab_manager', 'Dental Lab Manager'),
  ('dental_tech', 'Dental Technician'),
  ('dentist', 'Dentist'),
  ('dental', 'Dental Staff')
ON CONFLICT(name) DO UPDATE SET display_name = excluded.display_name;

-- 2. Insert or Recreate Dental Department Users
-- Note: Replace '$2a$10$94VQdi84MFLDTBbq26yoYumYoFmbieiu1gB2p0aliR0rIJ4yVekV.' with your desired bcrypt password hash if modifying.

-- A. Dental Head of Department (HOD)
INSERT INTO users (full_name, username, email, password_hash, role_id, is_active, must_change_password)
SELECT 
  'Dr. Dental HOD', 
  'dental_hod', 
  'dental.hod@legacyclinics.rw', 
  '$2a$10$94VQdi84MFLDTBbq26yoYumYoFmbieiu1gB2p0aliR0rIJ4yVekV.', 
  r.id, 
  1, 
  0
FROM roles r WHERE r.name = 'dental_hod'
ON CONFLICT(username) DO UPDATE SET
  full_name = excluded.full_name,
  email = excluded.email,
  password_hash = excluded.password_hash,
  role_id = excluded.role_id,
  is_active = 1;

-- B. Dental Lab Manager
INSERT INTO users (full_name, username, email, password_hash, role_id, is_active, must_change_password)
SELECT 
  'Dental Lab Manager', 
  'dental_lab_manager', 
  'dental.labmanager@legacyclinics.rw', 
  '$2a$10$94VQdi84MFLDTBbq26yoYumYoFmbieiu1gB2p0aliR0rIJ4yVekV.', 
  r.id, 
  1, 
  0
FROM roles r WHERE r.name = 'dental_lab_manager'
ON CONFLICT(username) DO UPDATE SET
  full_name = excluded.full_name,
  email = excluded.email,
  password_hash = excluded.password_hash,
  role_id = excluded.role_id,
  is_active = 1;

-- C. Dental Laboratory Technician
INSERT INTO users (full_name, username, email, password_hash, role_id, is_active, must_change_password)
SELECT 
  'Dental Technician', 
  'dental_tech', 
  'dental.tech@legacyclinics.rw', 
  '$2a$10$94VQdi84MFLDTBbq26yoYumYoFmbieiu1gB2p0aliR0rIJ4yVekV.', 
  r.id, 
  1, 
  0
FROM roles r WHERE r.name = 'dental_tech'
ON CONFLICT(username) DO UPDATE SET
  full_name = excluded.full_name,
  email = excluded.email,
  password_hash = excluded.password_hash,
  role_id = excluded.role_id,
  is_active = 1;

-- D. Dentist (Clinical Practitioner)
INSERT INTO users (full_name, username, email, password_hash, role_id, is_active, must_change_password)
SELECT 
  'Dr. Dentist User', 
  'dentist', 
  'dentist@legacyclinics.rw', 
  '$2a$10$94VQdi84MFLDTBbq26yoYumYoFmbieiu1gB2p0aliR0rIJ4yVekV.', 
  r.id, 
  1, 
  0
FROM roles r WHERE r.name = 'dentist'
ON CONFLICT(username) DO UPDATE SET
  full_name = excluded.full_name,
  email = excluded.email,
  password_hash = excluded.password_hash,
  role_id = excluded.role_id,
  is_active = 1;

-- E. Dental Clinic Staff / Assistant
INSERT INTO users (full_name, username, email, password_hash, role_id, is_active, must_change_password)
SELECT 
  'Dental Clinic Staff', 
  'dental_staff', 
  'dental.staff@legacyclinics.rw', 
  '$2a$10$94VQdi84MFLDTBbq26yoYumYoFmbieiu1gB2p0aliR0rIJ4yVekV.', 
  r.id, 
  1, 
  0
FROM roles r WHERE r.name = 'dental'
ON CONFLICT(username) DO UPDATE SET
  full_name = excluded.full_name,
  email = excluded.email,
  password_hash = excluded.password_hash,
  role_id = excluded.role_id,
  is_active = 1;

-- 3. Grant Incident Reports & Module Permissions for all Dental Roles
INSERT INTO role_permissions (role_name, module, action, granted, updated_by) VALUES
  ('dental_hod', 'incident_reports', 'view', 1, 1),
  ('dental_hod', 'incident_reports', 'create', 1, 1),
  ('dental_hod', 'incident_reports', 'edit', 1, 1),
  ('dental_hod', 'incident_reports', 'approve', 1, 1),
  
  ('dental_lab_manager', 'incident_reports', 'view', 1, 1),
  ('dental_lab_manager', 'incident_reports', 'create', 1, 1),
  ('dental_lab_manager', 'incident_reports', 'edit', 1, 1),
  ('dental_lab_manager', 'incident_reports', 'approve', 1, 1),

  ('dental_tech', 'incident_reports', 'view', 1, 1),
  ('dental_tech', 'incident_reports', 'create', 1, 1),

  ('dentist', 'incident_reports', 'view', 1, 1),
  ('dentist', 'incident_reports', 'create', 1, 1),

  ('dental', 'incident_reports', 'view', 1, 1),
  ('dental', 'incident_reports', 'create', 1, 1)
ON CONFLICT(role_name, module, action) DO UPDATE SET granted = 1;

-- Verify Created Users
SELECT u.id, u.full_name, u.username, u.email, r.name AS role, u.is_active
FROM users u
JOIN roles r ON u.role_id = r.id
WHERE r.name IN ('dental_hod', 'dental_lab_manager', 'dental_tech', 'dentist', 'dental');
