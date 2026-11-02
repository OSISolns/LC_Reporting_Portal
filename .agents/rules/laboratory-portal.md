# Laboratory Portal Engineering & Security Rules

When modifying, extending, or debugging code within `frontend/src/pages/lab/`, `backend/src/routes/lab.js`, or `backend/src/controllers/labController.js`:

## 1. Role Separation & RBAC Invariants
- **Non-Lab Module Isolation**: Laboratory staff roles (`lab_hod`, `lab_manager`, `quality_manager`, `lab_safety_officer`, `lab_stock_officer`, unit heads, `lab_scientist`, `lab_tech`, `lab`) MUST have zeroed permissions (`granted: 0`) for non-lab administrative modules:
  - `cancellations`
  - `shifts`
  - `roster`
  - `ai_insights`
  Never re-enable these modules for lab roles in `backend/src/config/permissions.js` or database updates unless explicitly requested by an Administrator.
- **Verification Gate**: Order verification (`/orders/:id/verify`) and batch verification (`/batch-verify`) MUST be guarded by `authorizeRoles(LAB_LEAD_OR_MANAGER_ROLES)`. Bench technicians (`lab_scientist`, `lab_tech`) cannot self-verify diagnostic results.

## 2. Order Lifecycle & Audit Trails
- Specimen orders follow a strict, monotonic lifecycle:
  `Registered` → `Pre-analytical` → `Analytical` → `Post-analytical` → `Result Entry` → `Verification` → `Patient Notified`.
- Every verification event must record `verified_by` (user ID), `verified_at` (timestamp), and status changes in the audit log.

## 3. Reagents & Supply Chain Multi-Tier Workflow
- **Requisitions**: Unit Requisitions must progress through the multi-tier approval chain:
  `Unit Head Submission` → `Lab Stock Officer Review` (`/requisitions/:id/lab-review`) → `General Stock Manager Approval` (`/requisitions/:id/general-review`).
- **In-Hand Inventory**: Access to `/inhand-inventory` write operations (`POST`, `PUT`, `DELETE`) is strictly restricted to `lab_stock_officer` and senior administrators (`admin`, `coo`, `deputy_coo`, `chairman`).
- **Consumption Tracking**: Any reagent consumption on the bench must log against `/unit-stock/:id/consume` to decrement active inventory and produce an immutable consumption log.

## 4. Quality Control & ISO 15189 Non-Conformance Reports (NCR)
- **NCR Deletion Protection**: Only `LAB_MANAGER_ROLES` (`admin`, `coo`, `deputy_coo`, `general_manager`, `chairman`, `lab_hod`, `lab_manager`, `quality_manager`) may delete NCR records.
- **IQC & Westgard Monitoring**: Internal quality control runs (`/qc-run`) must preserve standard deviation (SD) and target mean calculations for Westgard rule evaluation.
