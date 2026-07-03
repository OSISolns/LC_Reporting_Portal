# Roles & Permissions (RBAC)

Access control has **two layers**:

1. **Route-level role guards** — hardcoded `allowedRoles` on frontend routes (`App.jsx`) and `roleGuard(...)` / `authorizeRoles(...)` on backend routes. These are the coarse gate.
2. **The Access Control Matrix** — a fine-grained, database-backed permission matrix (module × action) with role defaults **and** per-user overrides, editable by Admins at runtime.

The defaults for both live in `backend/src/config/permissions.js`.

## The 19 roles

| Role key | Display name | Purpose |
|---|---|---|
| `admin` | Administrator | Full system access; manages users, permissions, audit |
| `it_officer` | IT Officer | User management, IT support; restricted from finance & permissions |
| `coo` | Chief Operations Officer | Approves cancellations, refunds, incidents; broad read |
| `deputy_coo` | Deputy COO | Co-approver; inventory & procurement; broad read |
| `chairman` | Chairman | Read-only executive oversight |
| `sales_manager` | Sales Manager | Verifies cancellations/refunds; revenue leakage; AI insights |
| `principal_cashier` | Principal Cashier | Initiates refunds; reviews results transfers |
| `cashier` | Cashier | Initiates cancellations, refunds, results transfers |
| `customer_care` | Customer Care | Initiates cancellations, refunds, results transfers |
| `operations_staff` | Operations Staff | Reviews results transfers; logs incidents |
| `lab_team_lead` | Laboratory Team Lead | Final approver for results transfers |
| `consultant` | Consultant | Read-oriented clinical access across modules |
| `pa` | Personal Assistant | Executive support; report boards |
| `staff` | General Staff | Baseline staff access (shifts) |
| `hsfp` | Health & Safety Focal Person | Owns safety workspace; reviews/approves incidents & sentinel events |
| `nurse` | Clinical Nurse | Clinical observations, vitals, nursing inventory, incident reporting |
| `chef-nurse` | Chef Nurse | Nursing leadership: shifts, observations, safety, feedback |
| `doctor` | Doctor | Doctor hub, e-prescriptions, clinical records |
| `medical_director` | Medical Director | Senior clinical oversight (legacy key `M.D`, normalised in auth) |
| `reviewer` | External Auditor / Reviewer | **Isolated sandbox** role — sees only mock data |
| `stock-manager` | Stock Manager | Master inventory & central store |
| `procurement-manager` | Procurement Manager | Procurement, purchase orders, supplier portal |

> The `medical_director` role is stored in legacy tokens as `M.D` and normalised to `medical_director` inside `authMiddleware`.

## The Access Control Matrix

### Modules and actions

Each permission is a `module × action` pair. Modules (from `config/permissions.js` → `MODULES`) and their available actions:

| Module | Actions |
|---|---|
| `cancellations` | view, create, edit, review, approve, reject, delete |
| `refunds` | view, create, edit, review, approve, reject, delete |
| `results_transfer` | view, create, edit, review, approve, reject, delete |
| `incident_reports` | view, create, edit, review, approve, delete |
| `user_management` | view, create, edit, delete |
| `audit_logs` | view |
| `reports` | view, download |
| `staff_performance` | view, create |
| `clinical_observation` | view, create, edit, review, approve |
| `shifts` | view, create, edit, review, delete |
| `feedbacks` | view, delete |
| `safety` | view, create, delete |
| `inventory` | view, create, edit, delete |
| `daily_stock` | view, edit |
| `procurement` | view, create, edit |
| `ai_insights` | view, download |
| `revenue_leakage` | view, create, edit, delete |
| `compliance` | view, create, edit, delete |
| `it_support` | view, create, edit, delete |
| `patients` | view, create |

Permissions are stored as `1`/`0` flags per role per module-action.

### Role defaults

`ROLE_DEFAULTS` in `config/permissions.js` defines the baseline grant for every role. Highlights:

- **`admin`** — near-total access, but note it deliberately has **no create/approve on financial requests** (segregation of duties) and no feedback visibility by default.
- **`coo` / `deputy_coo`** — approve/reject on financial workflows; broad read; safety, AI, revenue leakage, compliance.
- **`cashier` / `customer_care`** — create-oriented on the finance workflows they initiate; no approve.
- **`sales_manager`** — verify (review) financial requests + AI insights + revenue leakage.
- **`lab_team_lead`** — approves results transfers.
- **`hsfp`** — safety + incident review/approval.
- **`nurse` / `chef-nurse`** — clinical observation, vitals, nursing inventory; chef-nurse adds shift management, safety, feedback.
- **`it_officer`** — user management + IT support only; explicitly denied finance, audit logs, and permissions.

The newer module rows (`safety`, `inventory`, `daily_stock`, `procurement`, `ai_insights`, `revenue_leakage`, `compliance`, `it_support`, `patients`) were back-filled to mirror each area's previously hardcoded `allowedRoles`, so adding them to the matrix changed nobody's effective access.

### Per-user overrides

On top of role defaults, an Admin can grant or revoke a specific `module × action` for an **individual user** (`user_permission_overrides` table, `POST /permissions/user/:userId/override`). Overrides take precedence over the role default. A role can also be **reset to defaults** (`POST /permissions/role/:roleName/reset`).

### Managing the matrix (API)

| Endpoint | Purpose |
|---|---|
| `GET /api/permissions/modules` | List modules + actions |
| `GET /api/permissions/matrix` | Full role × module-action matrix |
| `PUT /api/permissions/role/:roleName` | Update a role's permissions |
| `GET /api/permissions/user/:userId` | Effective permissions for a user |
| `POST /api/permissions/user/:userId/override` | Set a per-user override |
| `POST /api/permissions/role/:roleName/reset` | Reset a role to defaults |
| `GET /api/permissions/unlock-logs` | Sensitive-action unlock audit |

All permission management is **Admin-only**.

## Reviewer isolation (sandbox auditing)

The `reviewer` role is a security-sensitive design element: external auditors must be able to exercise the system **without touching real patient/financial data**. This is enforced in the data layer, not just the UI:

- Records carry an `is_mock` flag.
- Every reviewer-scoped query appends `AND is_mock = 1` (see e.g. cancellation verify/approve/reject/delete: `reviewerGuard = user.role === 'reviewer' ? ' AND is_mock = 1' : ''`).
- Reviewers therefore can only read and act on mock rows — real records are invisible and immutable to them.

## How the two layers interact

1. The **frontend** hides/disables navigation and actions the user's role can't reach (fast UX gate; not a security boundary).
2. The **route guard** rejects unauthorised roles at the API with `403` and logs a `SECURITY_VIOLATION` (notifying admins).
3. The **permission matrix** provides finer, admin-tunable control within an allowed role, plus per-user exceptions.

Never rely on the frontend guard alone — the backend guard + matrix are the real boundary.
