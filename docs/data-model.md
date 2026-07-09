# Data Model

## Database engine

- **Turso** — a globally-distributed, cloud-hosted SQLite (libSQL). Accessed through **`@libsql/client`**.
- Connection is configured in `backend/src/config/db.js` from `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` (with `lcreporting_`-prefixed variants supported for Vercel).
- A **Prisma schema** (`backend/prisma/schema.prisma`, **53 models**) is the human-readable source of truth for the schema and can be used for migrations/introspection. Runtime queries, however, go through `db.query()` with `$1, $2, …` positional placeholders (a Postgres-style compatibility layer over libSQL).

> **Data separation policy:** local dev database rows are never copied into the Turso production database. Only the FDA medications list is an approved sync target. Keep dev and prod data strictly separate.

## Field-level encryption

Sensitive columns are **encrypted at rest with AES-256-GCM** (`utils/crypto.js`), transparently at the model layer. The map of which columns are encrypted lives in `config/db.js` (`ENCRYPTED_COLUMNS`).

- **Format:** `enc:<iv>:<authTag>:<ciphertext>` (all hex). The `enc:` prefix makes encryption idempotent and detectable.
- **Key:** derived via SHA-256 from `DB_ENCRYPTION_KEY`. A warning is logged (and an insecure fallback used) if the key is absent — **always set `DB_ENCRYPTION_KEY` in production.**
- **Failure mode:** decryption failures return the original value rather than crashing, so a bad/rotated key degrades gracefully instead of taking the app down.

### Encrypted tables/columns (from `ENCRYPTED_COLUMNS`)

| Table | Encrypted columns (examples) |
|---|---|
| `clinical_observations` | patient_name, identification_json, triage_json, progress_notes_json, medication_mar_json, sbar_json |
| `patient_vitals` | temperature, pulse, respiratory_rate, blood_pressure, weight, spo2, general_comments |
| `cancellation_requests` | patient_full_name, pid_number, old/new SID, telephone, insurance_payer, reason, rejection_comment |
| `refund_requests` | patient_full_name, pid_number, sid_number, telephone, insurance_payer, momo_code, receipt no., reason |
| `incident_reports` | names_involved, pid_number, description, contributing_factors, actions, RCA fields, corrective_actions_json |
| `results_transfers` | old_sid, new_sid, reason, edited_by_name, rejection_comment |
| `internal_feedbacks` | contact_info, concern_description, other_details |
| `it_tickets` / `it_assets` | title, description, reporter / name, assigned_to |
| `notifications` | title, message, link |
| `nursing_monthly_stock` / `nursing_stock_change_logs` | responsible/user names, consumption & change fields |
| `requisitions`, `safety_reports`, shift close tables, `sukraa_patients`, `supplier_portal_sessions`, `users` | identifying/sensitive fields |

In short: **every column that could identify a patient, a payer, or carry clinical/financial detail is encrypted.**

## Tables by domain

The 53 tables (Prisma models) grouped by functional area:

### Identity, access & audit
- `users`, `roles`, `role_permissions`, `permission_modules`, `user_permission_overrides`
- `audit_logs`
- `system_settings`, `nursing_unlock_passwords`

### Financial workflows
- `cancellation_requests`
- `refund_requests`
- `results_transfers`
- `revenue_leakages`

### Clinical & nursing
- `clinical_observations`, `patient_vitals`
- `daily_procedure_logs`, `daily_report_metrics`
- `providers`, `specializations`
- `icd11_cache` (WHO ICD-11 term cache)

### Safety & compliance
- `incident_reports`
- `safety_reports`
- `compliance_audits`, `compliance_licenses`, `compliance_facility_certs`

### Inventory, procurement & suppliers
- `master_inventory`, `department_stock`, `departments`, `stock_batches`, `uoms`
- `requisitions`, `requisition_items`
- `nursing_monthly_stock`, `nursing_stock_change_logs`
- `vendors`
- `supplier_submissions`, `supplier_submission_items`, `supplier_portal_sessions`

### Shifts
- `shift_sessions`
- `shift_cashier_open`, `shift_cashier_close`
- `shift_nurse_close`, `shift_callcenter_close`, `shift_viplounge_close`, `shift_helpdesk_close`
- `shift_equipment_logs`

### HR / performance & feedback
- `staff_performance_scores`, `staff_performance_ratings`
- `internal_feedbacks`

### IT support
- `it_tickets`, `it_assets`

### Notifications
- `notifications`

### External integration
- `sukraa_patients`, `sukraa_sync_log` (SUKRAA HIMS mirror + sync journal)

*(A few small lookup/link tables round out the 53.)*

## Common conventions

- **Timestamps** — most tables carry `created_at` / `updated_at`; workflow tables also carry per-transition timestamps (`verified_at`, `approved_at`, `rejected_at`).
- **Actor references** — workflow rows store `created_by`, `verified_by`, `approved_by`, `rejected_by` as FK-style user IDs, joined to `users` for display names.
- **Status enums** — financial workflows use `pending | verified | approved | rejected`. Transitions are guarded in SQL (`WHERE status = <expected>`), so illegal jumps simply affect zero rows.
- **JSON blobs** — complex sub-structures (RCA, MAR, SBAR, corrective actions, verification steps) are stored as encrypted JSON strings in `*_json` columns.
