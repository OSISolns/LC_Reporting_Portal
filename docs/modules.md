# Modules & Features

The portal is organised into functional modules. Each is a route module on the backend (`/api/<module>`), a set of pages on the frontend, and usually a defined multi-step workflow with its own state machine. Access to every module is governed by the [Access Control Matrix](rbac.md).

## Financial workflows

These share a common pattern: a front-line staff member **creates** a request, a manager **verifies/reviews** it, and an executive **approves** or **rejects** it. Each transition is audited and generates a notification. All patient-identifying fields are encrypted.

### Cancellations
Cancellation of a patient billing/SID entry.

- **State machine:** `pending → verified → approved` (or `→ rejected` from `pending`/`verified`).
- **Flow:** Cashier / Customer Care **creates** → Sales Manager **verifies** → COO / Deputy COO **approves**.
- **Guards:** duplicate protection (no second active request for the same old SID); `pending` requests can be deleted; only valid state transitions succeed (SQL `WHERE status = ...` guards).
- **Outputs:** per-request PDF voucher (`GET /:id/pdf`), Excel export.

### Refunds
Patient refund requisitions (cash / MoMo / card).

- **State machine:** mirrors cancellations (`pending → verified → approved` / `rejected`).
- **Flow:** Cashier / Principal Cashier **initiates** → Sales Manager verifies → COO approval chain.
- Captures MoMo code, original receipt number, payer/insurance, reason. PDF voucher + Excel export.

### Results Transfer
Moving lab results between SIDs (correcting mis-billed / mis-linked lab orders).

- **Flow:** Cashier / Customer Care **creates** → Operations Staff **review** → Lab Team Lead **final approval**.
- Captures old SID, new SID, reason, editor. PDF + audit trail.

### Revenue Leakage Tracker
Detects and logs revenue lost to unbilled/underbilled services.

- CRUD over leakage records plus a **`POST /scan`** operation that programmatically surfaces suspected leakages.
- Restricted to finance leadership (Sales Manager, Principal Cashier, COO, Chairman, Deputy COO, Admin).

## Clinical & nursing

### Clinical Observation / Clinical Sheet
The **Patient Observation Records Sheet** — the nursing clinical record, and the document whose PDF carries the Legacy Clinics branding.

- Sections: **Identification**, **Triage & vitals**, **Progress notes**, **Medication Administration Record (MAR)**, **SBAR hand-over summary**.
- Per-patient observations with **checksum** and **verify** endpoints for tamper-evidence (`/observations/:patientId/checksum`, `/verify`).
- Renders to a high-fidelity branded PDF (`/observations/:patientId/pdf`), with approval/verification stamps.
- All observation JSON blobs (identification, triage, progress notes, MAR, SBAR) are encrypted at rest.
- Front ends: **Nursing Hub**, **Clinical Sheets List**, **Quick Clinical Sheet** modal, **Vitals** modal.

### Patient Records & Vitals
- Patient search and lookup (backed by the SUKRAA sync — see [Integrations](integrations.md)).
- Vitals capture/history per patient (`/patients/:pid/vitals`).
- Sync status & manual trigger endpoints (`/patients/sync/status`, `/patients/sync/trigger`).

### E-Prescriptions
Doctor/consultant prescription authoring.

- Medication autocomplete powered by the Rwanda FDA generics list (`fda_medications` cache) and the in-house clinical knowledge base (dosing, route, frequency, cautions).
- Records prescriptions against a patient (`POST /patients/:pid/prescription`); completed prescriptions listed via `/clinical/prescriptions/completed`.
- **Doctor Hub** is the doctor-facing workspace.

### Daily Operational Reports
- Nurses/chef-nurses submit **daily** operational metrics; leadership views **daily/weekly/monthly** roll-ups on the **Daily Operational Report Board**.
- Config-driven report fields (`/reports/config`).

## Safety, risk & compliance

### Safety Management
Incident/sentinel-event **safety reports** distinct from the incident module — the HSFP (Health & Safety Focal Person) workspace.

- Create, list, view, delete safety reports; per-report PDF.
- Includes the **Risk Register** and **Infection Control Tracker** views.
- Restricted to HSFP, Admin, Reviewer, Deputy COO.

### Incidents
General incident & sentinel event reporting with RCA (root-cause analysis).

- Rich capture: names involved, description, contributing factors, immediate actions, prevention measures, RCA fields (environment/staff/equipment/policy), corrective actions, HSFP comments.
- Reviewed/approved by HSFP; per-incident PDF and Excel export.
- Incidents feed the **AI classifier** (38-type Legacy Clinics incident taxonomy).

### Compliance Portal
Institutional compliance tracking.

- **Audits**, **licenses**, and **facility certifications** with expiry tracking.
- Full CRUD for licenses and facility certs; audit updates.
- Restricted to Admin, HSFP, Reviewer.

## Inventory, procurement & suppliers

A large sub-system under `/api/clinical/inventory/*` covering the full stock lifecycle.

### Central Store & Master Inventory
- **Master inventory** items with UoMs, departments, vendors (CRUD + bulk delete).
- **Stock batches**, distributed stock, reconciliation (`/inventory/reconcile`).
- **Requisitions** from departments → approve/reject workflow.
- Change logs and a password-protected unlock mechanism for sensitive stock edits (`/inventory/unlock`, stock-password endpoints).

### Daily Inventory Checkup
- Nursing daily stock count / checkup (`daily_stock` module) feeding monthly nursing stock records.

### Procurement Hub
- **Purchase orders** (create, list, status transitions).
- **GRNs** (Goods Received Notes) and **returns** with line-items.

### Supplier Portal
A **public** (token-gated) portal for suppliers plus an internal manager view.

- Public: suppliers verify a token and upload submissions (`/inventory/supplier-portal/verify-token`, `/upload`) — the only unauthenticated app surface besides login.
- Manager: toggle the portal on/off, review submissions, receive them into stock.

## Governance & administration

### User Management
- Account creation and role assignment. Admin & IT Officer.

### Permission Management (Access Control Matrix)
- Admin-only editor for the RBAC matrix: view modules, edit role-level permissions, apply **per-user overrides**, reset a role to defaults, and review unlock logs. See [RBAC](rbac.md).

### Audit Logs
- Immutable, system-wide audit trail (who did what, when, from which IP). Admin & IT Officer. Excel export and a violation-report endpoint.

### IT Support Hub
- **Tickets** and **asset** register (CRUD) for internal IT support. Open to all authenticated staff for raising tickets.

### Staff Performance
- Managers **rate** staff on accuracy, speed and communication per completed workflow request; scores aggregate into per-user performance.
- Endpoints for scores, ratings, unrated requests, and "my score".

### Notifications
- Real-time in-app notifications with unread counts, mark-one/mark-all-read. Generated by workflow transitions and security events. All notification content encrypted.

### Shift Management
- Open/close **shift sessions** per role (cashier, nurse, call-center, VIP lounge, help-desk, equipment).
- Role-specific dashboards (`NurseShiftDashboard`, `StaffShiftDashboard`, generic `ShiftDashboard`) selected at runtime by role.

## AI Insights
- **Local, key-free analytics** across all workflows: pattern/trend detection, reason classification, and an **executive summary** view.
- Backed by `utils/localAI.js` (TF-IDF + cosine similarity clustering for free-text reasons; taxonomy classification for incidents). See [Integrations](integrations.md).
- Restricted to management/analyst roles.

## Role-specific dashboards & hubs (frontend)

The frontend ships tailored landing experiences per role, e.g. `DoctorDashboard`, `ManagementDashboard`, `QADashboard`, `HSFPDashboard`, `ITDashboard`, `StockManagerDashboard`, `ReviewerDashboard`, `StaffDashboard`, plus the module "hubs" (`NursingHub`, `DoctorHub`, `CentralStoreHub`, `ProcurementHub`). The generic `Dashboard` routes users to the right home based on their role.
