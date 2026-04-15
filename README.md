# Legacy Clinics Reporting Portal

A full-stack web application designed for Legacy Clinics to manage Cancellation Requests and Incident/Sentinel Event Reporting.

## Features

- **Authentication & RBAC**: Secure login with 9 institutional roles (Admin, COO, Sales Manager, QA, etc.).
- **Cancellation Module**: Multi-step financial approval workflow.
- **Incident Module**: Safety reporting and QA review workflow.
- **Audit Logs**: Full traceability of all system actions.
- **Reporting**: High-fidelity PDF generation (Serverless) and Excel exports.
- **Modern UI**: Dark-themed, responsive dashboard with premium medical aesthetics.

## Tech Stack

- **Frontend**: React 18, Vite, Lucide React, Axios, React Router.
- **Backend**: Node.js, Express, LibSQL (@libsql/client).
- **Database**: **Turso (LibSQL)** Global Cloud Database.
- **Deployment**: **Vercel** (Serverless Functions).

## Installation & Setup

### 1. Prerequisites
- Node.js (v18+)
- npm or yarn
- Turso CLI (optional, for DB management)

### 2. Environment Configuration
Copy `.env.example` in the root and backend directories:
- `TURSO_DATABASE_URL`: Your Turso DB URL.
- `TURSO_AUTH_TOKEN`: Your Turso Auth Token.
- `JWT_SECRET`: A strong random string.

### 3. Initialization
Run the following from the root:
```bash
npm run build
cd backend && npm run seed
```

### 4. Local Development
```bash
# Terminal 1 (Backend)
cd backend && npm run dev

# Terminal 2 (Frontend)
cd frontend && npm run dev
```

## Institutional Accounts

| Role | Username | Default Password |
|---|---|---|
| Admin | `lc_minega` | `1234` |
| COO | `lc_sofia` | `1234` |
| Sales Manager | `lc_uwasekuru` | `1234` |
| Chairman | `lc_chairman` | `Legacy@2024` |

---
© 2026 Legacy Clinics & Diagnostics. Kigali, Rwanda.

## API Documentation

The REST API is available at `http://localhost:5000/api`.

- `POST /api/auth/login` - Login
- `GET /api/cancellations` - List all cancellation requests
- `POST /api/cancellations` - Create new request
- `PATCH /api/cancellations/:id/verify` - Verify (Customer Care)
- `PATCH /api/cancellations/:id/approve` - Approve (COO/Sales)
- `GET /api/incidents` - List all incident reports
- `POST /api/incidents` - Submit new report
- `GET /api/audit` - View system audit logs (Admin only)
