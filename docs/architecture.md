# Architecture

## System topology

The portal is a classic single-page-application + REST-API split, both deployed on Vercel and both talking to a single cloud database.

```
┌──────────────────────────────────────────────────────────────────────┐
│                             Browser (SPA)                             │
│  React 18 + Vite build, served as static assets from frontend/dist    │
│  React Router v6 · AuthContext (JWT) · Axios · Tailwind · Framer      │
└───────────────────────────────┬──────────────────────────────────────┘
                                 │ HTTPS  (Bearer JWT)
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│                  Vercel Serverless Function  (api/index.js)           │
│                        Express 4 app  (backend/server.js)             │
│                                                                        │
│  helmet → CORS → rate-limit → JSON body → JWT auth → RBAC → routes    │
│  routes → controllers → models → db.query()                           │
│  cross-cutting: audit logging · AES-256-GCM encryption · notifications │
└───────────────┬───────────────────────────────┬──────────────────────┘
                │                                 │
                ▼                                 ▼
   ┌────────────────────────┐        ┌────────────────────────────────┐
   │  Turso (libSQL)         │        │  External services              │
   │  cloud SQLite, 53 tables│        │  • SUKRAA HIMS (SOAP/ASMX)      │
   │  @libsql/client         │        │  • WHO ICD-11 API               │
   └────────────────────────┘        │  • Puppeteer/Chromium (PDF)     │
                                      └────────────────────────────────┘
```

### Deployment shape

- `api/index.js` simply re-exports the Express app (`backend/server.js`) as the Vercel serverless handler. Every `/api/*` request is routed to this one function.
- `vercel.json` configures the build (`frontend/dist` as output), function `maxDuration`, and — importantly — `includeFiles: "backend/src/assets/**"` so logo/stamp images used in PDF generation are bundled into the serverless deployment.
- The frontend is built by Vite and served statically; API calls go to `/api/*` on the same origin (so CORS is effectively same-origin in production).

## Request lifecycle

A typical authenticated request passes through this pipeline (defined in `backend/server.js`):

1. **`helmet`** — security headers (cross-origin resource policy relaxed for asset serving).
2. **CORS** — allows `localhost`, the production domain, `*.vercel.app` previews, and `FRONTEND_URL`; permissive in non-production.
3. **Rate limiting** — 200 requests / 15 min per IP on `/api/`.
4. **Body parsing** — JSON up to 10 MB (large enough for base64 attachments/images).
5. **Route dispatch** — `/api/<module>` → the module's router.
6. **`authMiddleware`** — verifies the `Bearer` JWT, attaches `req.user` (`id`, `role`, `full_name`). Normalises the legacy `M.D` role to `medical_director`.
7. **Authorization** — either `roleGuard(...)` / `authorizeRoles(...)` (hardcoded role lists) or the permission-matrix middleware (`middleware/permission.js`) checks the Access Control Matrix.
8. **Controller** — orchestrates the operation.
9. **Model** — runs parameterised SQL via `db.query()`, transparently encrypting/decrypting sensitive columns.
10. **Audit** — significant actions are recorded in `audit_logs`; denied access raises a `SECURITY_VIOLATION` and notifies admins.
11. **Response** — a consistent `{ success, message, data }` JSON envelope.

## Tech stack detail

### Frontend (`frontend/`)
- **React 18** with **Vite 5** (dev server + production bundler).
- **React Router v6** — all routes wrapped in `ProtectedRoute` (see `App.jsx`), with per-route `allowedRoles`.
- **State/Context** — `AuthContext` (JWT + current user), `NotificationContext` (in-app notifications).
- **Styling** — Tailwind CSS 3.4, `clsx` + `tailwind-merge`, Framer Motion for animation, Lucide icons.
- **Data** — Axios client (`src/api/axios.js`) with per-module API wrappers in `src/api/`.
- **Forms** — `react-hook-form`; toasts via `react-hot-toast`.
- **Client documents** — `jspdf` + `html2canvas` for some client-side exports; `xlsx`/`exceljs` for spreadsheets.
- **Build hardening** — `vite-plugin-javascript-obfuscator` obfuscates the production bundle.
- **Session UX** — `useInactivityTimer` drives an auto-logout / session-timeout modal.

### Backend (`backend/`)
- **Express 4** REST API (`server.js` + `src/`).
- **Layered structure**: `routes/ → controllers/ → models/ → config/db.js`.
- **Security**: `helmet`, `express-rate-limit`, `express-validator`, `bcryptjs`, `jsonwebtoken`.
- **Database access**: `@libsql/client` against Turso; a Prisma schema (`backend/prisma/schema.prisma`) documents/models the 53 tables. `pg`-style `$1, $2` placeholders are used in the SQL through a small compatibility layer in `config/db.js`.
- **Documents**: `puppeteer-core` + `@sparticuz/chromium` render HTML templates (`utils/pdfTemplate.js`) to PDF; `exceljs`/`xlsx` build spreadsheets; `qrcode` embeds authenticity QR codes.
- **AI**: `natural` (TF-IDF, Porter stemmer) powers an in-house, key-free classifier (`utils/localAI.js`) plus a clinical knowledge base (`utils/clinicalAI.js`).
- **Integrations**: `axios` + `cheerio` for the SUKRAA SOAP service and ICD-11 lookups.

## Repository layout

```
LC_Reporting_Portal/
├── api/
│   └── index.js                 # Vercel entrypoint → re-exports backend/server.js
├── backend/
│   ├── server.js                # Express app: middleware + route mounting
│   ├── prisma/schema.prisma     # 53-table data model (source of truth for schema)
│   └── src/
│       ├── config/              # db.js (libSQL client + encryption), permissions.js (RBAC defaults)
│       ├── routes/              # 20 route modules mounted under /api/*
│       ├── controllers/         # 18 controllers — request orchestration
│       ├── models/              # 13 data-access models (encrypt/decrypt aware)
│       ├── middleware/          # auth, role, permission, validation, audit
│       ├── services/            # sukraaService.js (HIMS integration)
│       ├── utils/               # pdf, pdfTemplate, excel, crypto, cache, localAI, clinicalAI, generateToken
│       └── assets/              # logo + approval/rejection/verified stamps (bundled for PDF)
├── frontend/
│   └── src/
│       ├── App.jsx              # Router + route→role guards
│       ├── pages/               # 65 page components (one per module/view)
│       ├── components/          # shared UI (Layout, Sidebar, Modal, ProtectedRoute, …)
│       ├── context/             # AuthContext, NotificationContext
│       ├── api/                 # Axios client + per-module wrappers
│       └── hooks/               # useInactivityTimer (session timeout)
├── scripts/                     # data import/sync utilities (e.g. FDA medications)
├── vercel.json                  # build + serverless function config
└── docs/                        # ← this documentation
```

## Runtime & environments

- **Node.js 24.x** (root `engines`); backend declares `>=18`.
- Environments are driven by layered `.env` files (`.env.local`, `.env.development.local`, `.env.preview.local`, `.env.vercel.prod`) plus Vercel-managed environment variables. See [Setup & Deployment](setup-and-deployment.md) for the variable list.
- The server only calls `app.listen()` outside of Vercel (guarded by `NODE_ENV`/`VERCEL`), so the same file works both locally and as a serverless handler.
