# Laboratory Portal Architecture & Operations Guide

The Laboratory Portal is a comprehensive clinical diagnostic management module within the Legacy Clinics Lumina Reporting Portal. It oversees diagnostic specimen lifecycles, ISO 15189 compliance (Quality Control and Non-Conformance Reporting), laboratory equipment maintenance, and reagent supply chains.

---

## 1. Role Classifications & Access Matrix

Access to laboratory endpoints and frontend workspaces is grouped into four role tiers:

| Tier | Role Keys | Scope & Responsibilities |
|---|---|---|
| **Executive / Leadership** | `admin`, `coo`, `deputy_coo`, `general_manager`, `chairman`, `lab_hod`, `lab_manager`, `quality_manager` (`qm`) | Executive analytics, analyzer deletion, NCR resolution/deletion, quality policy enforcement. |
| **Operational Leads** | `lab_team_lead`, `lab_lead`, `lab_safety_officer`, `lab_stock_officer`, Unit Heads (`head_biochemistry`, `head_microbiology`, `head_hematology`, `head_histopathology`, `head_poct`, `head_phlebotomy`, `head_molecular_biology`), `lab_micro_specialist` | Order verification, batch signing, analyzer calibration & equipment creation, storage unit assignments, unit requisition initiation. |
| **Bench Technical Staff** | `lab_scientist`, `lab_tech`, `lab` | Specimen accessioning/registration, test stage updates, result data entry, IQC run entry, bench stock consumption. |
| **Supply Chain Officers** | `lab_stock_officer`, `stock-manager`, `stock_manager` | Reagent catalog management, unit requisition review, general stock dispatching, consumption audits. |

> **Strict Non-Lab Isolation**: All laboratory roles are zeroed out (`granted: 0`) from `cancellations`, `shifts`, `roster`, and `ai_insights`.

---

## 2. Frontend Workspaces (`frontend/src/pages/lab/`)

| Page Component | Path | Primary Purpose |
|---|---|---|
| [`LabHub.jsx`](../frontend/src/pages/lab/LabHub.jsx) | `/lab/hub` | Central operational navigation and overview for laboratory personnel. |
| [`LabManagerDashboard.jsx`](../frontend/src/pages/lab/LabManagerDashboard.jsx) | `/lab/manager-dashboard` | Executive KPIs, order turnaround times (TAT), workload by unit, and quality metrics. |
| [`LabTeamLeadDashboard.jsx`](../frontend/src/pages/lab/LabTeamLeadDashboard.jsx) | `/lab/team-lead-dashboard` | Real-time bench monitoring, pending verifications, batch verification triggers. |
| [`LabStockOfficerDashboard.jsx`](../frontend/src/pages/lab/LabStockOfficerDashboard.jsx) | `/lab/stock-officer` | In-hand inventory levels, expiration alerts, reagent lot management, requisition approvals. |
| [`LabConsumablesWorkspace.jsx`](../frontend/src/pages/lab/LabConsumablesWorkspace.jsx) | `/lab/consumables` | Bench-level stock in use, daily consumption logging, and stock level checks. |
| [`LabRequisitionHub.jsx`](../frontend/src/pages/lab/LabRequisitionHub.jsx) | `/lab/requisitions` | Multi-step reagent requisition creation, lab stock review, and general store dispatch. |
| [`LabEquipment.jsx`](../frontend/src/pages/lab/LabEquipment.jsx) | `/lab/equipment` | Preventive maintenance schedules (PPM), calibration intervals, service history. |
| [`LabAnalyzers.jsx`](../frontend/src/pages/lab/LabAnalyzers.jsx) | `/lab/analyzers` | Analyzer interface configurations, unit mappings, and communication status. |
| [`NCRManagement.jsx`](../frontend/src/pages/lab/NCRManagement.jsx) | `/lab/ncr` | ISO 15189 Non-Conformance Reports: incident capture, root-cause analysis, CAPA tracking. |
| [`LabUnitsHub.jsx`](../frontend/src/pages/lab/LabUnitsHub.jsx) | `/lab/units` | Unit-specific metrics (Microbiology, Hematology, Biochemistry, POCT, etc.). |
| [`LabArchive.jsx`](../frontend/src/pages/lab/LabArchive.jsx) | `/lab/archive` | Historical order lookup, audit retrieval, and specimen archive search. |

---

## 3. Backend Endpoints (`backend/src/routes/lab.js`)

### Diagnostic Orders & Verification
- `GET /api/lab/orders` — List lab orders with filtering by unit, stage, and status.
- `POST /api/lab/register` — Accession/register a new diagnostic specimen.
- `GET /api/lab/orders/:id` — Detailed specimen profile and test items.
- `PUT /api/lab/orders/:id/stage` — Transition order stage (`pre-analytical` → `analytical` → `post-analytical`).
- `POST /api/lab/orders/:id/results` — Save bench test values and flags.
- `POST /api/lab/orders/:id/verify` — Authorize & release results (Requires `LAB_LEAD_OR_MANAGER_ROLES`).
- `POST /api/lab/batch-verify` — Multi-order verification for high-volume units (Requires `LAB_LEAD_OR_MANAGER_ROLES`).
- `POST /api/lab/orders/:id/notify` — Dispatch automated SMS/email notification to patient.

### Quality Control (ISO 15189)
- `GET /api/lab/qc-logs` — Retrieve IQC run logs and Levey-Jennings plot datasets.
- `POST /api/lab/qc-run` — Record control run and validate against Westgard rules.
- `GET /api/lab/ncr` / `POST /api/lab/ncr` — List and log Non-Conformance Reports.
- `PUT /api/lab/ncr/:id` — Update RCA / CAPA resolution details.
- `DELETE /api/lab/ncr/:id` — Delete NCR record (Restricted to `LAB_MANAGER_ROLES`).

### Equipment & Analyzers
- `GET /api/lab/analyzers` / `POST /api/lab/analyzers` — Manage diagnostic machines.
- `GET /api/lab/equipment` / `POST /api/lab/equipment` — Track equipment maintenance and PPM cycles.
- `GET /api/lab/storage-units` / `POST /api/lab/storage-units` — Specimen cold storage / freezer tracking.

### Reagents & Supply Chain Workflow
1. `POST /api/lab/requisitions` — Unit Head creates a requisition for reagents/consumables.
2. `POST /api/lab/requisitions/:id/lab-review` — Lab Stock Officer verifies availability and endorses requisition.
3. `POST /api/lab/requisitions/:id/general-review` — General Stock Manager releases stock from central warehouse.
4. `POST /api/lab/unit-stock/:id/consume` — Bench scientist records unit reagent consumption.
