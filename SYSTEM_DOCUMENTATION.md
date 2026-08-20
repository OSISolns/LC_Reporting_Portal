# Legacy Clinics — Lumina Reporting & Operations Portal
## Comprehensive System Architecture & Technical Blueprint

---

## 🏛️ 1. Executive Summary & Architecture Overview

The **Legacy Clinics Lumina Reporting & Operations Portal** is an enterprise-grade, multi-specialty clinical operations, governance, financial tracking, and healthcare management platform built specifically for Legacy Clinics.

The platform provides unified clinical workflows, diagnostic result management, supply chain logistics, multi-tier financial authorization, shift reconciliation, and AI-driven clinical analytics across all hospital departments.

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
| **Data & Charts** | Chart.js, Recharts, ExcelJS, jsPDF |
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

## 🏥 4. Functional Subsystems & Domain Modules

### 4.1 Operations Hub (`/operations`)
A 5-tab workspace designed for chief operations officers and operational staff:
1. **📊 Overview Dashboard**: Real-time aggregated KPIs (shifts, pending transfers, pending cancellations/refunds, task completion %).
2. **🕐 Shift Review Board**: Filterable shift table by role (`cashier`, `helpdesk`, `call_center`, `nurse`, `vip_lounge`), flag status, and supervisor review action.
3. **🔁 Result Transfers**: Reconcile test result transfers across patient accounts.
4. **📦 Consumables Log**: Departmental consumable tracking.
5. **📝 Facility Task Log**: Categorized daily checklists (Inspection, Cleaning, Maintenance, Safety, Admin, Inventory) with draft saving and completion metrics.

### 4.2 Nursing Hub & MAR (`/nursing-hub`, `/clinical-sheets`)
- **Patient Triage & Vitals**: Records blood pressure, pulse, temperature, SpO2, respiratory rate, and pain score.
- **Medication Administration Record (MAR)**: Interactive dosing schedule matrix.
- **Clinical Observation Sheets**: Continuous clinical progress notes and nursing activities.
- **Daily Operational Report**: Shift procedure logs, patient volume count, and department metrics.

### 4.3 Physician & Doctor Hub (`/doctor-hub`, `/e-prescriptions`)
- **Encounter Workspace**: Search patient records, view past vitals, view lab/imaging history.
- **ICD-11 Browser**: Real-time WHO ICD-11 coding search modal for diagnoses.
- **Digital E-Prescriptions**: Prescription builder with FDA drug lookup, dosage instructions, and PDF generation.

### 4.4 Radiology & PACS/DICOM Imaging Portal (`/imaging`)
- **Worklist & Modalities**: Filterable by `Radiography (X-Ray)`, `CT-Scan`, `MRI`, `Ultrasound`.
- **PACS / DICOM Integration**: WADO image viewer integration supporting `imaging_series` and `imaging_instances`.
- **Radiologist Reporting**: Report writer with technique, findings narrative, impression, and verification signature.

### 4.5 Pathology & Laboratory Portal (`/lab`)
- **Specimen & Order Register**: Track orders from `ordered` -> `sample_collected` -> `processing` -> `completed` / `verified`.
- **Reference Ranges & Critical Values**: Auto-flag abnormal test parameters.

### 4.6 Dental Hub & Prosthetic Worklist (`/dental`)
- **Interactive Odontogram**: Tooth-by-tooth FDI notation charting (Fractions, Endodontics, Crowns, Extractions).
- **Prosthetic Manufacturing Worklist**: Track lab jobs from impression -> wax-up -> casting -> porcelain -> delivery.

### 4.7 Physiotherapy & Rehabilitation (`/physio`)
- Initial musculoskeletal assessments, range of motion (ROM) tracking, rehab session logs, and functional score progression.

### 4.8 Supply Chain: Procurement & Supplier Portal (`/procurement`, `/supplier-portal-manager`)
- Purchase requisitions, vendor catalog, Goods Received Note (GRN) inspection, budget tracking, and public supplier portal (`/supplier-portal-public`).

### 4.9 General Store & Master Inventory (`/central-store`, `/master`)
- Central stock control, batch tracking, expiry alerts, 8-character SKU standardization, department stock dispatching.

### 4.10 Financial Approval Workspaces: Cancellations & Refunds (`/cancellations`, `/refunds`)
- **Multi-Tier Authorization**:
  - L1: Reception/Cashier submission with bill attachment & reason.
  - L2: Managerial approval/rejection with mandatory comment logs.

### 4.11 Clinical Governance & Safety (`/incidents`, `/safety-management`, `/risk-register`, `/compliance`)
- Incident reporting, infection control tracking, compliance license renewals, and Health & Safety Focal Point (HSFP) register.

### 4.12 IT Support & Asset Ticketing (`/it-ticketing`)
- Internal hardware/software ticket submission, workstation intervention logs, asset lifecycle tracking.

### 4.13 Lumina AI Intelligence Engine (`/ai-insights`, `/revenue-tracker`)
- Automated analysis of hospital revenue leakage, operational bottlenecks, staff performance metrics, and clinical trends.

---

## 🗄️ 5. Database Schema Highlights

The system manages over 100 auto-migrated tables:

```
├── Authentication & RBAC
│   ├── users
│   ├── permission_modules
│   ├── role_permissions
│   └── user_permission_overrides
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
├── Inventory & Procurement
│   ├── master_inventory
│   ├── stock_batches
│   ├── department_stock
│   ├── requisitions
│   ├── procurement_hubs
│   └── supplier_submissions
└── Finance & Operations
    ├── shift_sessions
    ├── cancellation_requests
    ├── refund_requests
    ├── results_transfers
    └── operations_task_logs
```

---

## 🚀 6. Local Development & Operational Commands

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
