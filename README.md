# Legacy Clinics Reporting Portal

A full-stack web application designed for Legacy Clinics to manage Cancellation Requests and Incident/Sentinel Event Reporting.

## Features

- **Authentication & RBAC**: Secure login with 6 roles (Cashier, Customer Care, Ops Staff, Sales Manager, COO, Chairman).
- **Cancellation Module**: Multi-step workflow (Pending -> Verified -> Approved/Rejected).
- **Incident Module**: Safety reporting for Patients, Staff, and Equipment.
- **Audit Logs**: Full traceability of all system actions.
- **Reporting**: PDF generation and Excel export support.
- **Modern UI**: Dark-themed, responsive dashboard with glassmorphism aesthetics.

## Tech Stack

- **Frontend**: React 18, Vite, Lucide React, Axios, React Router.
- **Backend**: Node.js, Express, PostgreSQL, JWT, PDFKit, ExcelJS.
- **Database**: PostgreSQL with structured schema and indexes.

## Installation & Setup

### 1. Prerequisites
- Node.js (v18+)
- PostgreSQL (v14+)
- npm or yarn

### 2. Database Setup
1. Create a database named `lc_reporting` in PostgreSQL.
2. Run the schema script:
   ```bash
   psql -d lc_reporting -f database/schema.sql
   ```

### 3. Backend Setup
1. Navigate to the `backend` directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env` and configure your database credentials and `JWT_SECRET`.
4. Run the seed script to create initial users:
   ```bash
   npm run seed
   ```
5. Start the server:
   ```bash
   npm run dev
   ```

### 4. Frontend Setup
1. Navigate to the `frontend` directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

## Sample Test Data (Test Accounts)

All accounts use the password: **Legacy@2024**

| Role | Email |
|---|---|
| Cashier | cashier@legacyclinics.com |
| Customer Care | care@legacyclinics.com |
| Operations | ops@legacyclinics.com |
| Sales Manager | sales@legacyclinics.com |
| COO | coo@legacyclinics.com |
| Chairman | chairman@legacyclinics.com |

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
