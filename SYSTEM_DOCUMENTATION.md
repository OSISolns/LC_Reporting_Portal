# Legacy Clinics — Lumina Reporting & Operations Portal
## Comprehensive System Architecture & Technical Blueprint

---

## 🏛️ 1. Executive Summary & Architecture Overview

The **Legacy Clinics Lumina Reporting & Operations Portal** is an enterprise-grade, multi-specialty clinical operations, governance, financial tracking, supply chain, IT asset management, and healthcare management platform built specifically for Legacy Clinics.

The platform provides unified clinical workflows, diagnostic result management, supply chain logistics, multi-tier financial authorization, shift reconciliation, IT helpdesk management, and AI-driven clinical analytics across all hospital departments.

```
+-------------------------------------------------------------------+
|                  React 18 / Vite Frontend Portal                  |
+-------------------------------------------------------------------+
                                  |
                                  v
+-------------------------------------------------------------------+
|                    Node.js / Express Backend                      |
+-------------------------------------------------------------------+
                                  |
            +---------------------+---------------------+
            |                                           |
            v                                           v
+-----------------------+                   +-----------------------+
|  JWT & RBAC Security  |                   |  Database Layer       |
|  Permission Engine    |                   |  (SQLite / LibSQL)    |
+-----------------------+                   +-----------------------+
```

---

## 🛠️ 2. Technology Stack & Infrastructure

| Layer | Technologies & Libraries |
| :--- | :--- |
| **Frontend Framework** | React 18, Vite 5, React Router DOM v6 |
| **UI & Styling** | Vanilla CSS Tokens, Tailwind Utilities, Framer Motion animations, Lucide Icons |
| **Form & State** | React Hook Form, Custom Context API (`AuthContext`), React Hot Toast |
| **Data & Charts** | Chart.js, Recharts, ExcelJS, jsPDF, html2canvas |
| **Backend Framework** | Node.js (v20+), Express.js |
| **Database Engine** | SQLite (Prisma local client) / Turso Cloud DB (LibSQL Client) |
| **Security & Auth** | JWT (JSON Web Tokens), bcryptjs, Granular RBAC Permission Engine |
| **File Processing** | Multer, Cheerio, Docx Parser, Fast-PNG |

---

## 🔐 3. Security, Authentication & Permission Engine

### 3.1 Authentication Workflow
- Users authenticate via `/api/auth/login` using username and password.
- Passwords are encrypted using `bcryptjs` (salt factor 10).
- Successful login issues a signed JWT token containing user ID, role, department, and full name.

### 3.2 Granular RBAC & Module Permissions Matrix
The portal enforces a two-layer security model:
1. **Role-Based Routing (`allowedRoles`)**: Non-negotiable route level protection in `App.jsx` and `Sidebar.jsx`.
2. **Granular Functional Module Permissions (`checkPermission`)**: Checked per API call and UI element.

#### System Modules (25 Modules)
- `cancellations`, `refunds`, `results_transfer`, `incident_reports`, `user_management`, `audit_logs`, `reports`, `staff_performance`, `clinical_observation`, `shifts`, `feedbacks`, `safety`, `inventory`, `procurement`, `ai_insights`, `revenue_leakage`, `compliance`, `it_support`, `patients`, `imaging`, `lab`, `dental`, `physio`, `operations`.

#### System Roles (37 Roles)
- **Executive**: `admin`, `coo`, `deputy_coo`, `chairman`, `sales_manager`, `medical_director`
- **Doctors**: `doctor`, `consultant`, `pa`, `staff`
- **Nursing**: `nurse`, `chef-nurse`, `deputy_chef_nurse`, `deputy-chef-nurse`, `deputy_chief_nurse`
- **Labs & Imaging**: `lab_team_lead`, `lab_lead`, `lab_manager`, `lab_tech`, `lab`, `imaging_tech`, `imaging_manager`
- **Dental & Physio**: `dentist`, `dental_hod`, `dental_tech`, `dental_lab_manager`, `dental`, `physiotherapist`, `physio`, `physio_manager`
- **Operations & Support**: `operations_staff`, `operations`, `cashier`, `principal_cashier`, `customer_care`, `stock-manager`, `procurement-manager`, `it_officer`, `hsfp`

#### Fallback Mechanism
If a permission row for a new module is not explicitly saved in `role_permissions` DB table, `Permission.getRolePermission` automatically falls back to `ROLE_DEFAULTS` from `config/permissions.js`.

---

## 👑 4. Administration & System Governance Workspace (`/users`, `/permissions`, `/audit-logs`)

Designed for hospital administrators, IT directors, and compliance officers:

### 4.1 User Management (`/users`)
- **User Lifecycle**: Create, edit, activate/deactivate staff accounts across all 37 system roles.
- **Credential Governance**: Mandatory password complexity rules and admin-forced password resets (`POST /api/users/:id/reset-password`).
- **Staff Profiles**: Associate users with specific clinical departments (`NURSING`, `OPERATIONS`, `LABORATORY`, `IMAGING`, `DENTAL`, `GENERAL STORE`).

### 4.2 Access Control & Permissions Engine (`/permissions`)
- **Categorized Role Permissions Matrix**: Interactive matrix to toggle `view`, `create`, `edit`, `review`, `approve`, `reject`, `delete`, `download` permissions across all 25 modules.
- **Bulk Action Toolbar**: `Grant All`, `Revoke All`, `Copy Permissions From...`, and `Reset to Defaults`.
- **User Permission Overrides**: Grant or revoke specific permissions for individual employees overriding role defaults with mandatory justification logging (`user_permission_overrides`).
- **Sidebar Menu Config Matrix**: Interactive per-role sidebar navigation visibility matrix.
- **Permission Evaluation Simulator**: Real-time permission evaluation simulation tool.

### 4.3 Audit Trail & System Logs (`/audit-logs`)
- **Immutable Log Register**: Captures every `CREATE`, `UPDATE`, `DELETE`, `REVIEW`, `APPROVE`, `REJECT`, `LOGIN` action.
- **Audit Context**: Stores acting user ID, username, role, client IP address, target entity ID, and detailed change payload (`details_json`).

---

## 💻 5. IT Support & Asset Ticketing Hub (`/it-ticketing`)

Full-lifecycle internal IT helpdesk and hardware asset management system:

### 5.1 IT Support Ticketing (`it_tickets`)
- **Ticket Dispatch**: Staff submit tickets choosing category (`Hardware`, `Software`, `Network`, `System Access`, `Printer/Scanner`) and priority (`Low`, `Medium`, `High`, `Critical`).
- **Ticket Numbering**: Auto-incrementing identifier (`TKT-001`, `TKT-002`, ...).
- **Workstation Intervention Log**: Track `working_station` (e.g. `Reception-01`, `Lab-PC-02`) and flag `it_intervention` logs.
- **Lifecycle Tracking**: Status progression from `Open` -> `In Progress` -> `Resolved` -> `Closed`.

### 5.2 IT Asset Inventory (`it_assets`)
- **Asset Directory**: Comprehensive register of computers, printers, medical display monitors, routers, and peripheral devices.
- **Asset Metadata**: `asset_tag`, `model`, `serial_number`, `category`, `assigned_user_id`, `working_station`, `purchase_date`, `warranty_expiry`, `status` (`Active`, `Maintenance`, `Retired`).

---

## 📦 6. Stock & General Store Management System (`/central-store`, `/master`)

Centralized material management and inventory control across all hospital units:

### 6.1 SKU Standardization & Master Inventory (`master_inventory`)
- **Standardized SKUs**: All items enforced with uniform 8-character SKU codes.
- **Item Master**: Reorder levels, minimum stock thresholds, unit of measure (`uoms`), and cost prices.

### 6.2 Batch & Expiry Management (`stock_batches`)
- **Batch Tracking**: Track batch number, manufacturing date, and expiry date for pharmaceuticals, reagents, and consumables.
- **Automated Expiry Alerts**: Real-time warnings for items approaching 30/60/90-day expiration windows.

### 6.3 Department Dispatches & Stock Transfers (`department_stock`, `requisitions`)
- **Requisition Workflow**: Clinical departments (`NURSING`, `LAB`, `IMAGING`, `DENTAL`, `PHYSIO`) submit stock requisitions to the General Store.
- **Store Approval & Dispatch**: Stock Manager approves and dispatches batches to department stock.
- **Stock Movements Audit**: Complete audit trail (`nursing_stock_change_logs`) for received stock, stock-in-hand adjustments, and damaged/expired stock write-offs.

---

## 🏢 7. Procurement & Supplier Portal Network (`/procurement`, `/supplier-portal-manager`, `/supplier-portal-public`)

Enterprise supply chain and vendor portal management:

### 7.1 Procurement Lifecycle (`procurement_hubs`)
- **Requisition to PO**: Requisition -> Request for Quotation (RFQ) -> Purchase Order (PO) -> Goods Received Note (GRN) Inspection -> Invoice Matching & Payment Authorization.
- **GRN Quality Inspection**: Formal quality check on received shipments prior to inventory acceptance.
- **Budget & Invoice Tracking**: Departmental procurement budget enforcement and invoice reconciliation.

### 7.2 Supplier Portal Network (`/supplier-portal-manager`)
- **Vendor Directory (`vendors`)**: Vendor catalog, contact metadata, compliance documents (`vendor_documents`), and vendor performance ratings.
- **Public Supplier Portal (`/supplier-portal-public`)**: Secure public portal for external vendors to view active RFQs and submit item prices and batch availability.
- **Automated Receipt Sync**: Accepting supplier submissions automatically registers batch numbers, expiry dates, and updates inventory levels.

---

## 📊 8. Operations Hub (`/operations`)

Integrated operational control dashboard:

1. **Overview Dashboard**: Aggregated operational KPIs (shifts today, open/closed/flagged shifts, pending result transfers, pending cancellations/refunds, task completion rate).
2. **Shift Review Board**: Shift status filter by role (`cashier`, `helpdesk`, `call_center`, `nurse`, `vip_lounge`), flag indicators, and supervisor review verification.
3. **Result Transfers**: Reconcile test result transfers between patient IDs.
4. **Consumables Log**: Track consumable consumption by department.
5. **Facility Task Log**: Daily operational checklists (Inspection, Cleaning, Maintenance, Safety, Admin, Inventory) with draft saving and completion metrics.

---

## 🩺 9. Nursing Hub & MAR (`/nursing-hub`, `/clinical-sheets`)

- **Patient Triage & Vitals**: Capture blood pressure, pulse, temperature, SpO2, respiratory rate, and pain scores (`patient_vitals`).
- **Medication Administration Record (MAR)**: Interactive dosing schedule matrix.
- **Clinical Observation Sheets**: Continuous clinical progress notes (`clinical_observations`) and nursing activity logs (`nursing_clinical_activities`).
- **Daily Operational Report (`/nursing-hub/daily-report`)**: Shift procedure logs, patient volume count, and department performance metrics.

---

## ⚕️ 10. Physician & Doctor Hub (`/doctor-hub`, `/e-prescriptions`)

- **Encounter Workspace**: Patient search, past vitals history, diagnostic results review.
- **ICD-11 Browser**: Real-time WHO ICD-11 coding search modal for standardized diagnosis entry.
- **Digital E-Prescriptions**: Prescription authoring with FDA drug catalog lookup (`fda_medications`), dosage instructions, and PDF generation.

---

## 🔬 11. Radiology & PACS/DICOM Imaging Portal (`/imaging`)

- **Modality Worklists**: Filterable by `Radiography (X-Ray)`, `CT-Scan`, `MRI`, `Ultrasound` (`imaging_orders`, `imaging_studies`).
- **PACS / DICOM Integration**: WADO image viewer integration supporting `imaging_series` and `imaging_instances`.
- **Radiologist Reporting**: Professional report writer with findings narrative, impression, LOINC/SNOMED coding, and digital verification (`imaging_reports`).

---

## 🧪 12. Pathology & Laboratory Portal (`/lab`)

- **Specimen & Order Register**: Track orders from `ordered` -> `sample_collected` -> `processing` -> `completed` / `verified` (`lab_orders`).
- **Reference Ranges & Critical Values**: Automated flagging of out-of-range lab parameters (`lab_results`).

---

## 🦷 13. Dental Hub & Prosthetic Worklist (`/dental`)

- **Interactive Odontogram**: Tooth-by-tooth FDI notation charting (Fractions, Endodontics, Crowns, Extractions).
- **Prosthetic Manufacturing Worklist**: Track lab jobs from impression -> wax-up -> casting -> porcelain -> delivery (`dental_cases`, `dental_worklist`).

---

## 🏃 14. Physiotherapy & Rehabilitation Workspace (`/physio`)

- Initial musculoskeletal assessments (`physio_assessments`), range of motion (ROM) tracking, rehabilitation session logs (`physio_rehab_sessions`), and functional outcome metrics.

---

## 💳 15. Shift Management & Supervisor Review (`/shifts`)

- **Role-Based Shift Sessions**: Support for Cashier, Customer Care, Nurse, VIP Lounge, and Operations staff (`shift_sessions`).
- **Revenue & Cash Reconciliation**: Opening cash, closing cash, physical count, POS slip audit, and variance flagging.
- **Supervisor Verification**: Supervisory review and sign-off on closed shifts.

---

## 💸 16. Financial Approvals: Cancellations & Refunds (`/cancellations`, `/refunds`)

- **Multi-Tier Authorization**:
  - L1: Reception/Cashier submission with bill attachment & reason (`cancellation_requests`, `refund_requests`).
  - L2: Managerial approval/rejection with mandatory comment logs.

---

## 🛡️ 17. Clinical Governance, Risk, Safety & Infection Control (`/incidents`, `/safety-management`, `/risk-register`, `/compliance`)

- **Incident Reporting**: Anonymized or named incident reports with root cause analysis.
- **Infection Control & Safety**: Facility safety audits, risk register grading, and compliance certificate tracking (`compliance_licenses`, `compliance_facility_certs`).

---

## 🧠 18. Lumina AI Intelligence Engine (`/ai-insights`, `/revenue-tracker`, `/performance`)

- Automated machine learning analysis of revenue leakage patterns, staff performance metrics, operational throughput, and clinical trends (`lumina_usage_patterns`, `revenue_leakages`).

---

## 🗄️ 19. Comprehensive Database Schema Architecture

Over 100 auto-migrated database tables managed by `backend/src/config/db.js`:

```
├── Authentication & Governance
│   ├── users
│   ├── permission_modules
│   ├── role_permissions
│   ├── user_permission_overrides
│   └── audit_logs
├── Administration & IT Support
│   ├── it_tickets
│   ├── it_assets
│   ├── system_settings
│   ├── compliance_licenses
│   ├── compliance_facility_certs
│   └── compliance_audits
├── Clinical & Nursing
│   ├── patients
│   ├── clinical_observations
│   ├── patient_vitals
│   ├── nursing_clinical_activities
│   └── daily_report_metrics
├── Diagnostics & Imaging
│   ├── imaging_orders
│   ├── imaging_studies
│   ├── imaging_series
│   ├── imaging_instances
│   └── imaging_reports
├── Laboratory
│   ├── lab_orders
│   └── lab_results
├── Dental & Physio
│   ├── dental_cases
│   ├── dental_clinic_cases
│   ├── dental_worklist
│   ├── physio_assessments
│   └── physio_rehab_sessions
├── Inventory & Supply Chain
│   ├── master_inventory
│   ├── stock_batches
│   ├── department_stock
│   ├── requisitions
│   ├── requisition_items
│   ├── procurement_hubs
│   ├── vendors
│   ├── vendor_documents
│   └── supplier_submissions
└── Finance & Operations
    ├── shift_sessions
    ├── cancellation_requests
    ├── refund_requests
    ├── results_transfers
    └── operations_task_logs
```

---

## 🚀 20. Operational Commands & Deployment Procedures

```bash
# 1. Start Backend Server
cd backend
npm run dev

# 2. Run Database Migrations
node scripts/migrate_imaging.js
node scripts/sync_permissions_full.js

# 3. Build Frontend Application
cd frontend
npm run build
```

---
*Documentation compiled for Legacy Clinics Lumina Portal.*
