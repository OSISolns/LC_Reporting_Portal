-- 1. Insert the Medical Director role
INSERT INTO roles (name, display_name)
VALUES ('medical_director', 'Medical Director')
ON CONFLICT (name) DO NOTHING;

-- 2. Grant permissions to Medical Director (matching Doctor + Daily Report board + Internal Feedback modules)
INSERT OR REPLACE INTO role_permissions (role_name, module, action, granted, updated_by) VALUES
('medical_director', 'cancellations', 'view', 0, 1),
('medical_director', 'cancellations', 'create', 0, 1),
('medical_director', 'cancellations', 'edit', 0, 1),
('medical_director', 'cancellations', 'approve', 0, 1),
('medical_director', 'cancellations', 'reject', 0, 1),

('medical_director', 'refunds', 'view', 0, 1),
('medical_director', 'refunds', 'create', 0, 1),
('medical_director', 'refunds', 'edit', 0, 1),
('medical_director', 'refunds', 'approve', 0, 1),
('medical_director', 'refunds', 'reject', 0, 1),

('medical_director', 'results_transfer', 'view', 0, 1),
('medical_director', 'results_transfer', 'create', 0, 1),
('medical_director', 'results_transfer', 'edit', 0, 1),
('medical_director', 'results_transfer', 'approve', 0, 1),
('medical_director', 'results_transfer', 'reject', 0, 1),

('medical_director', 'incident_reports', 'view', 1, 1),
('medical_director', 'incident_reports', 'create', 1, 1),
('medical_director', 'incident_reports', 'edit', 1, 1),
('medical_director', 'incident_reports', 'approve', 0, 1),

('medical_director', 'user_management', 'view', 0, 1),
('medical_director', 'user_management', 'create', 0, 1),
('medical_director', 'user_management', 'edit', 0, 1),
('medical_director', 'user_management', 'delete', 0, 1),

('medical_director', 'audit_logs', 'view', 0, 1),

('medical_director', 'reports', 'view', 1, 1),
('medical_director', 'reports', 'download', 1, 1),

('medical_director', 'staff_performance', 'view', 0, 1),
('medical_director', 'staff_performance', 'create', 0, 1),

('medical_director', 'clinical_observation', 'view', 1, 1),
('medical_director', 'clinical_observation', 'create', 1, 1),
('medical_director', 'clinical_observation', 'edit', 1, 1),
('medical_director', 'clinical_observation', 'review', 1, 1),
('medical_director', 'clinical_observation', 'approve', 1, 1),

('medical_director', 'shifts', 'view', 0, 1),
('medical_director', 'shifts', 'create', 0, 1),
('medical_director', 'shifts', 'edit', 0, 1),
('medical_director', 'shifts', 'review', 0, 1),
('medical_director', 'shifts', 'delete', 0, 1),

('medical_director', 'feedbacks', 'view', 1, 1),
('medical_director', 'feedbacks', 'delete', 1, 1);
