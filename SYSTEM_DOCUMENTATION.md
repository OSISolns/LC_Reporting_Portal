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

### 4.3 Audit Trail & System Logs (`/audit-logs`)
- **Immutable Log Register**: Captures every `CREATE`, `UPDATE`, `DELETE`, `REVIEW`, `APPROVE`, `REJECT`, `LOGIN` action.

---

## 💻 5. IT Support & Asset Ticketing Hub (`/it-ticketing`)

### 5.1 IT Support Ticketing (`it_tickets`)
- **Ticket Dispatch**: Staff submit tickets choosing category (`Hardware`, `Software`, `Network`, `System Access`, `Printer/Scanner`) and priority (`Low`, `Medium`, `High`, `Critical`).
- **Workstation Intervention Log**: Track `working_station` (e.g. `Reception-01`, `Lab-PC-02`) and flag `it_intervention` logs.

### 5.2 IT Asset Inventory (`it_assets`)
- **Asset Directory**: Comprehensive register of computers, printers, medical display monitors, routers, and peripheral devices.

---

## 📦 6. Stock & General Store Management System (`/central-store`, `/master`)

### 6.1 SKU Standardization & Master Inventory (`master_inventory`)
- Standardized 8-character SKU codes, reorder level thresholds, and unit of measure (`uoms`) tracking.

### 6.2 Batch & Expiry Management (`stock_batches`)
- Batch number tracking, manufacturing/expiry dates, and automated 30/60/90-day expiration warnings.

### 6.3 Department Dispatches & Stock Transfers (`department_stock`, `requisitions`)
- Clinical store requisitions, dispatch approval, and full audit logs (`nursing_stock_change_logs`).

---

## 🏢 7. Procurement & Supplier Portal Network (`/procurement`, `/supplier-portal-manager`, `/supplier-portal-public`)

### 7.1 Procurement Lifecycle (`procurement_hubs`)
- Requisition -> RFQ -> Purchase Order (PO) -> Goods Received Note (GRN) Quality Inspection -> Invoice Matching & Payment Authorization.

### 7.2 Supplier Portal Network (`/supplier-portal-manager`)
- Vendor catalog, compliance documents (`vendor_documents`), public vendor bidding portal (`/supplier-portal-public`), and automated inventory sync.

---

## 📊 8. Operations Hub (`/operations`)
- Operational KPIs, Shift Review Board, Result Transfers, Consumables Log, Facility Tasks checklist.

---

## 🩺 9. Nursing Hub & MAR (`/nursing-hub`, `/clinical-sheets`)
- Patient Triage & Vitals, MAR dosing matrix, Clinical Observation sheets, Daily Operational Report.

---

## ⚕️ 10. Physician & Doctor Hub (`/doctor-hub`, `/e-prescriptions`)
- Patient Encounter Workspace, WHO ICD-11 Diagnosis search, Digital E-Prescriptions with FDA drug lookup.

---

## 🔬 11. Radiology & PACS/DICOM Imaging Portal (`/imaging`)
- Modality worklists (X-Ray, CT, MRI, Ultrasound), WADO DICOM PACS viewer, Radiologist report writer.

---

## 🧪 12. Pathology & Laboratory Portal (`/lab`)
- Specimen collection register, order lifecycle tracking, critical value auto-flagging.

---

## 🦷 13. Dental Hub & Prosthetic Worklist (`/dental`)
- FDI notation Odontogram charting, prosthetic manufacturing worklist (impression -> casting -> delivery).

---

## 🏃 14. Physiotherapy & Rehabilitation Workspace (`/physio`)
- Musculoskeletal assessments, ROM tracking, rehab session logs.

---

## 💳 15. Shift Management & Supervisor Review (`/shifts`)
- Role-based shift opening/closing, POS slip audit, physical cash reconciliation, supervisor sign-off.

---

## 💸 16. Financial Approvals: Cancellations & Refunds (`/cancellations`, `/refunds`)
- Multi-tier L1 cashier submission -> L2 manager authorization workflows.

---

## 🛡️ 17. Clinical Governance, Risk, Safety & Infection Control (`/incidents`, `/safety-management`, `/risk-register`, `/compliance`)
- HSFP incident reporting, infection control tracking, compliance certificate renewals.

---

## 🧠 18. Lumina AI Intelligence Engine (`/ai-insights`, `/revenue-tracker`, `/performance`)
- Machine learning analytics for revenue leakage, clinical bottlenecks, and staff performance metrics.

---

## 🗄️ 19. Database Schema Architecture Overview
- Over 100 auto-migrated tables across Governance, Clinical, Diagnostics, Supply Chain, and Financial domains.

---

## 🚀 20. Operational Commands & Deployment Procedures
```bash
cd backend && npm run dev
node scripts/migrate_imaging.js
node scripts/sync_permissions_full.js
cd ../frontend && npm run build
```

---

## 🔮 21. Architectural Improvements, Security Roadmap & Automated Testing Pipeline

### 21.1 Architectural Upgrades & Scalability Roadmap

| Component Area | Current Implementation | Suggested Architectural Upgrade | Strategic Rationale |
| :--- | :--- | :--- | :--- |
| **Database Engine** | SQLite (Prisma Client) / LibSQL (Turso) | **PostgreSQL (v16+)** with Connection Pooling (`PgBouncer`) | Eliminates SQLite write lock contention during concurrent clinical logging across 25 modules. |
| **State Management** | Custom React Context API | **Zustand** or **Redux Toolkit** | Eliminates unnecessary React tree re-renders during high-frequency data inputs (MAR, Odontogram). |
| **Data Fetching & Caching** | Direct Axios in `useEffect` | **TanStack Query (React Query v5)** | Enables optimistic updates, automatic background revalidation, and caching for heavy clinical datasets. |
| **Authentication & Cryptography** | `bcryptjs` (salt cost 10) + JWT | **`bcryptjs` (salt cost 12+) + TOTP MFA / OAuth2 SSO** | Protects clinical access with 2-Factor Authentication (App Authenticator / SMS) and stricter hash iteration. |

---

### 21.2 Automated Clinical Testing Pipeline Architecture

To guarantee zero regression in critical clinical workflows (E-Prescriptions, MAR, PACS Imaging, Financial Approvals), the following test suite structure is recommended:

```
tests/
├── unit/                         # Jest / Vitest Backend & Component Tests
│   ├── auth/
│   │   └── permissions.test.js   # RBAC & User Override permission resolution tests
│   ├── clinical/
│   │   ├── icd11.test.js         # Diagnosis search & coding validation
│   │   └── eprescription.test.js # Drug dosage & prescription validation
│   └── finance/
│       └── cancellation.test.js  # L1/L2 multi-tier authorization logic
├── integration/                  # Supertest Express API Endpoint Tests
│   ├── imaging_api.test.js       # Imaging studies & DICOM series endpoint validation
│   ├── lab_api.test.js           # Specimen status transition & critical value flagging
│   └── stock_api.test.js         # SKU dispatch & inventory batch decrement tests
└── e2e/                          # Cypress End-to-End Clinical Flow Tests
    ├── doctor_encounter.cy.js    # Doctor encounter -> ICD-11 diagnosis -> E-Prescription
    ├── nursing_mar.cy.js         # Patient triage -> MAR dose recording -> Daily report sync
    └── shift_reconciliation.cy.js# Cashier shift opening -> cash count -> supervisor review
```

#### Proposed CI/CD Quality Gate Pipeline (`.github/workflows/clinical-ci.yml`):
```yaml
name: Clinical Quality Gate & Testing Pipeline
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Install Backend & Frontend Dependencies
        run: |
          cd backend && npm ci
          cd ../frontend && npm ci
      - name: Run Backend Unit & Security Permission Tests (Jest)
        run: cd backend && npx jest --coverage
      - name: Run E2E Clinical Workflows (Cypress)
        run: cd frontend && npx cypress run
```

---
*Documentation compiled for Legacy Clinics Lumina Portal.*
