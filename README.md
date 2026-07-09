# Legacy Clinics Lumina Portal

A full-stack clinical operations management platform for Legacy Clinics & Diagnostics. It centralises financial workflows, safety reporting, lab operations, staff performance, and system governance under a unified, role-secured interface.

> 📚 **Full documentation lives in [`docs/`](docs/README.md)** — architecture, module catalogue, RBAC, data model, API reference, security, integrations, and setup/deployment guides.

---

## Modules

| Module | Description |
|---|---|
| **Cancellations** | Multi-step financial cancellation request workflow with Sales Manager verification and COO approval. |
| **Refunds** | Patient refund requisitions with Principal Cashier initiation and COO approval chain. |
| **Incidents** | Safety and sentinel event reporting with audit trail. |
| **Results Transfer** | Lab SID requisition workflow: Cashier → Operations review → Lab Team Lead approval. |
| **Staff Performance** | Tracks staff efficiency (ratings) per workflow request. Scored by managers on accuracy, speed, and communication. |
| **Clinical Observation** | Patient vital signs and clinical assessment tracking (Nursing role). |
| **Notifications** | Real-time in-app notification system with unread counts and mark-all-read. |
| **AI Insights** | Local AI-powered analytics for patterns, trends, and management reporting across all workflows. |
| **User Management** | Account creation and role assignment (Admin & IT Officer). |
| **Permission Management** | Admin-only granular RBAC matrix editor — role-level and per-user overrides. |
| **Audit Logs** | Full, immutable system audit trail (Admin & IT Officer). |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, React Router v6, Tailwind CSS 3.4, Framer Motion, Lucide React, Axios |
| **Backend** | Node.js, Express 4, Helmet, express-rate-limit, express-validator |
| **Database** | Turso (LibSQL — global cloud SQLite) via `@libsql/client` |
| **PDF Generation** | Puppeteer Core / `@sparticuz/chromium` (serverless compatible) |
| **Excel Export** | ExcelJS |
| **Auth** | JWT (jsonwebtoken) + bcryptjs |
| **Deployment** | Vercel (Serverless Functions) |

---

## Roles & Access

The system uses a granular permission matrix, configurable by Administrators. The default baseline roles are:

| Role Key | Display Name | Notes |
|---|---|---|
| `admin` | Admin | Full system access |
| `coo` | Chief Operations Officer | Approves cancellations & refunds |
| `deputy_coo` | Deputy COO | Co-approver, broad read access |
| `chairman` | Chairman | Read-only executive view |
| `sales_manager` | Sales Manager | Verifies cancellations & refunds, AI insights |
| `principal_cashier` | Principal Cashier | Initiates refunds, reviews results transfers |
| `cashier` | Cashier | Initiates cancellations, refunds, results transfers |
| `customer_care` | Customer Care | Initiates cancellations, refunds, results transfers |
| `operations_staff` | Operations Staff | Reviews results transfers, logs incidents |
| `lab_team_lead` | Laboratory Team Lead | Final approver for results transfers |
| `it_officer` | IT Officer | User management, audit logs (restricted from Permissions module) |
| `nurse` | Clinical Nurse | Manages clinical observation sheets and incident reporting |
| `chef-nurse` | Chef Nurse | Manages nursing shifts, clinical observations, and safety reports |
| `hsfp` | Health & Safety Focal Person | Manages clinical safety workspace, reviews/approves incident and sentinel event reports |
| `consultant` | Consultant | Read-only access across all modules |

---

## Installation & Setup

### Prerequisites
- Node.js v18+
- npm
- A [Turso](https://turso.tech) account (free tier works)

### 1. Clone & Install

```bash
git clone <repo-url>
cd LC_Reporting_Portal

# Install root dependencies
npm install

# Install backend dependencies
cd backend && npm install && cd ..

# Install frontend dependencies
cd frontend && npm install && cd ..
```

### 2. Environment Configuration

**Root `.env`** (copy from `.env.example`):
```env
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your-turso-token
JWT_SECRET=a-strong-random-secret
FRONTEND_URL=https://your-vercel-app.vercel.app
```

**`backend/.env`** (copy from `backend/.env.example`):
```env
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your-turso-token
JWT_SECRET=a-strong-random-secret
FRONTEND_URL=https://your-vercel-app.vercel.app
NODE_ENV=development
PORT=5000
```

### 3. Database Migrations

Run migrations to initialise all tables (the application handles most table bootstrapping automatically upon server start, but explicit migrations can be run):

```bash
# Apply schema
cd backend
node run_migration.js
```

### 4. Seed Default Users

```bash
cd backend && npm run seed
```

### 5. Local Development

```bash
# Terminal 1 — Backend API (http://localhost:5000)
cd backend && npm run dev

# Terminal 2 — Frontend (http://localhost:5173)
cd frontend && npm run dev
```

---

## Deployment (Vercel)

The project is configured as a Vercel monorepo:

- **Frontend** → built from `frontend/` → output to `frontend/dist`
- **Backend API** → served as a Serverless Function from `api/index.js`
- All `/api/*` requests are rewritten to the serverless function.

```bash
# Production build (frontend only — Vercel handles this automatically)
npm run build
```

Ensure these environment variables are set in the Vercel project dashboard:
- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`
- `JWT_SECRET`
- `FRONTEND_URL`

---

## Default Institutional Accounts

| Role | Username | Default Password |
|---|---|---|
| Admin | `lc_minega` | `1234` |
| COO | `lc_sofia` | `1234` |
| Sales Manager | `lc_uwasekuru` | `1234` |
| Chairman | `lc_chairman` | `Legacy@2024` |

> ⚠️ Change all default passwords immediately in any non-development environment.

---

## API Reference

Base URL (local): `http://localhost:5000/api`  
Base URL (production): `https://<your-vercel-domain>/api`

### Authentication
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/auth/login` | Public | Obtain JWT token |

### Cancellations
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/cancellations` | All staff | List all requests (filtered by role) |
| `POST` | `/cancellations` | Cashier, Customer Care | Create new request |
| `GET` | `/cancellations/:id` | All staff | Get single request |
| `PATCH` | `/cancellations/:id/verify` | Sales Manager | Verify request |
| `PATCH` | `/cancellations/:id/approve` | COO | Approve request |
| `PATCH` | `/cancellations/:id/reject` | COO, Sales Manager | Reject with comment |
| `DELETE` | `/cancellations/:id` | Cashier, Customer Care, Admin | Delete request |
| `GET` | `/cancellations/:id/pdf` | All staff | Download PDF |
| `GET` | `/cancellations/export/excel` | COO, Chairman, Admin, Deputy COO, Sales Manager | Export Excel |

### Refunds
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/refunds` | All staff | List all refund requests |
| `POST` | `/refunds` | Cashier, Principal Cashier, Customer Care | Create refund request |
| `GET` | `/refunds/:id` | All staff | Get single refund |
| `PATCH` | `/refunds/:id/verify` | Sales Manager | Verify refund |
| `PATCH` | `/refunds/:id/approve` | COO | Approve refund |
| `PATCH` | `/refunds/:id/reject` | COO, Sales Manager | Reject with comment |
| `DELETE` | `/refunds/:id` | Cashier, Principal Cashier, Customer Care, Admin | Delete refund |
| `GET` | `/refunds/:id/pdf` | All staff | Download PDF |
| `GET` | `/refunds/export/excel` | COO, Chairman, Admin, Deputy COO, Sales Manager | Export Excel |

### Incidents
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/incidents` | Most roles | List all incident reports |
| `POST` | `/incidents` | Most roles | Submit new incident report |
| `GET` | `/incidents/:id` | Most roles | Get single report |
| `PATCH` | `/incidents/:id/review` | HSFP | Mark as reviewed |
| `GET` | `/incidents/:id/pdf` | Most roles | Download PDF |
| `GET` | `/incidents/export/excel` | COO, Chairman, Admin, Deputy COO, HSFP | Export Excel |

### Results Transfer
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/results-transfer` | All clinical + management roles | List all transfer requests |
| `POST` | `/results-transfer` | Cashier, Customer Care, Admin | Create transfer request |
| `GET` | `/results-transfer/:id` | All clinical + management roles | Get single request |
| `PUT` | `/results-transfer/:id/review` | Operations, Principal Cashier, Deputy COO, Admin | Review request |
| `PUT` | `/results-transfer/:id/approve` | Lab Team Lead, Admin | Approve request |
| `PUT` | `/results-transfer/:id/reject` | Operations, Lab Team Lead, Admin | Reject request |
| `DELETE` | `/results-transfer/:id` | Admin | Delete request |
| `GET` | `/results-transfer/:id/pdf` | All authenticated users | Download PDF |

### Staff Performance
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/performance/scores` | Managers | View aggregate performance scores |
| `GET` | `/performance/ratings` | Managers | List all individual ratings |
| `GET` | `/performance/ratings/:userId` | Managers | Get ratings for specific user |
| `GET` | `/performance/unrated-requests` | Managers | List pending items to rate |
| `GET` | `/performance/stats` | Managers | Get performance statistical breakdown |
| `POST` | `/performance/rate` | Managers | Submit performance rating |
| `GET` | `/performance/my-score` | Authenticated | Get own performance score |

### Notifications
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/notifications` | Authenticated | Get user notifications |
| `GET` | `/notifications/unread-count` | Authenticated | Get unread count |
| `PUT` | `/notifications/:id/read` | Authenticated | Mark single as read |
| `PUT` | `/notifications/mark-all-read` | Authenticated | Mark all as read |
| `DELETE` | `/notifications/:id` | Authenticated | Delete notification |

### Permissions (Admin Only)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/permissions/modules` | List all permission modules |
| `GET` | `/permissions/matrix` | Get full role permissions matrix |
| `PUT` | `/permissions/role/:roleName` | Update permissions for a role |
| `GET` | `/permissions/user/:userId` | Get effective permissions for a user |
| `POST` | `/permissions/role/:roleName/reset` | Reset role permissions to defaults |

### Users (Admin / IT Officer)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/users` | List all users |
| `POST` | `/users` | Create new user |
| `PUT` | `/users/:id` | Update user |
| `DELETE` | `/users/:id` | Deactivate user |

### Audit Logs (Admin / IT Officer)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/audit` | Query system audit logs |

### System
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Health check — returns `{ status: "ok" }` |

---

## Project Structure

```
LC_Reporting_Portal/
├── api/                        # Vercel serverless function entry point
├── backend/
│   ├── server.js               # Express app entry point
│   └── src/
│       ├── config/             # Database client (Turso/LibSQL), Permissions map
│       ├── controllers/        # Route handler logic
│       ├── middleware/         # Auth, RBAC, granular permission checks, validation
│       ├── models/             # Database query models
│       ├── routes/             # Express routers
│       ├── services/           # Business logic services
│       └── utils/
│           ├── pdfTemplate.js  # HTML templates for PDF generation (all doc types)
│           ├── pdf.js          # PDF rendering engine (Puppeteer)
│           ├── excel.js        # Excel export utility
│           ├── cache.js        # In-memory response cache
│           ├── localAI.js      # Local NLP/AI analytics engine
│           └── generateToken.js
├── database/
│   └── schema.sql              # Database schemas
├── frontend/
│   ├── index.html
│   └── src/
│       ├── api/                # Axios API client modules
│       ├── components/         # Shared UI components (Layout, Sidebar, etc.)
│       ├── context/            # AuthContext, NotificationContext
│       ├── lib/                # Utility helpers
│       └── pages/
│           ├── cancellations/  # Cancellation views
│           ├── refunds/        # Refund views
│           ├── incidents/      # Incident views
│           ├── results-transfer/ # Result Transfer views
│           └── performance/    # Staff Performance Appraisal module
├── vercel.json                 # Vercel deployment configuration
├── .env.example                # Root environment variable template
└── run_migration.js            # Migration runner script
```

---

## Security

- **JWT Authentication**: All API routes (except `POST /auth/login`) require a valid Bearer token.
- **Account Lockout Protection**: Strict rate limiter on the `/auth/login` endpoint that tracks attempts by username (max 5 requests per 15 minutes per account). This prevents one user from locking out an entire clinic IP.
- **Granular RBAC Middleware**: Routes enforce access using dynamic permission matrix (`checkPermission('module', 'action')`).
- **Navigation Visibility Alignment**: The frontend `Sidebar` navigation dynamically filters visible items using both route-level role restrictions (`allowedRoles` in `App.jsx`) and granular backend-synchronized permission states (`hasPermission`). If a user is not authorized to access a route or module, it is completely hidden from their navigation bar.
- **Helmet**: HTTP security headers applied on all responses.
- **Rate Limiting**: 200 requests / 15 minutes per IP on all `/api/*` routes.
- **CORS**: Configured for local environments and production Vercel domains.
- **Input Validation**: All mutation routes use `express-validator` schemas.
- **External Review Isolation**: Dedicated reviewer accounts (`reviewer` role) are cryptographically isolated to mock data via database-level `is_mock` constraints.

---

## External Review Policy

To maintain the highest security standards during external audits or feature reviews:

1.  **Dedicated Test Accounts**: Always provision a temporary, isolated account for the review process (e.g., `lc_reviewer`).
2.  **Mock Data Isolation**: Reviewer accounts are strictly prohibited from accessing real operational data. All records accessible to reviewers must be tagged with `is_mock = 1`.
3.  **Audit and Revoke**: Monitor reviewer activity via `Audit Logs`. Immediately disable or delete credentials upon completion of the review session.
4.  **Infrastructure Clearance**: Under no circumstances should direct infrastructure access (SSH, DB Root, Vercel/Turso Dashboard) be granted to external parties. Deep clearance requires a formal vetting process, supervised sessions, and explicit sign-off from leadership (**Aline** or **Mr. Chairman**).

---

© 2026 Legacy Clinics & Diagnostics — Kigali, Rwanda.
