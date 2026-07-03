# Setup & Deployment

## Prerequisites

- **Node.js 24.x** (root `engines`; backend accepts `>=18`).
- **npm**.
- Access to a **Turso** database (URL + auth token).
- **Google Chrome** installed locally (used by Puppeteer for PDF generation in dev; the launcher expects `/usr/bin/google-chrome`).

## 1. Install

```bash
# From the repository root
npm install                 # root deps (@libsql/client)
cd backend && npm install   # backend API deps
cd ../frontend && npm install
```

There's also a root convenience script:

```bash
npm run build   # installs backend, installs frontend, builds the frontend
```

## 2. Environment variables

Secrets are supplied via `.env` files (dev) and Vercel env vars (prod). The repo uses layered files: `.env.local`, `.env.development.local`, `.env.preview.local`, `.env.vercel.prod`.

| Variable | Required | Purpose |
|---|---|---|
| `TURSO_DATABASE_URL` | ✅ | Turso/libSQL connection URL (or `lcreporting_TURSO_DATABASE_URL`) |
| `TURSO_AUTH_TOKEN` | ✅ | Turso auth token (or `lcreporting_TURSO_AUTH_TOKEN`) |
| `JWT_SECRET` | ✅ | Signing secret for auth tokens (boot fails loudly if missing) |
| `DB_ENCRYPTION_KEY` | ✅ (prod) | Key for AES-256-GCM field encryption; insecure fallback used if unset |
| `NODE_ENV` | ✅ (prod) | Set to `production` to enforce the CORS allow-list |
| `FRONTEND_URL` | optional | Extra allowed CORS origin |
| `SUKRAA_SERVICE_URL` | optional | SUKRAA HIMS ASMX endpoint (has a default) |
| `GEMINI_API_KEY` | optional | Optional generative AI assistance |
| `ICD11_CLIENT_ID` / `ICD11_CLIENT_SECRET` | optional | WHO ICD-11 API credentials |
| `PORT` | optional | Local API port (default `5000`) |

> **Do not commit** real secrets or local database files. Keep production (Turso) data separate from dev — only the FDA medications list is an approved prod sync.

## 3. Database

The schema is modelled in `backend/prisma/schema.prisma` (53 tables). With Prisma configured against your Turso database you can introspect/generate as needed:

```bash
cd backend
npx prisma generate
# (migrations/introspection as appropriate for your Turso setup)
```

Reference-data import (approved for prod):

```bash
node scripts/import_fda_medications.js [path-to-xlsx]
# Loads the Rwanda FDA generic medications list into fda_medications (e-prescription autocomplete)
```

Patient sync from SUKRAA:

```bash
cd backend
npm run sync:patients        # live sync
npm run sync:patients:dry    # dry run
```

## 4. Local development

```bash
# Terminal 1 — backend API (http://localhost:5000)
cd backend
npm run dev        # nodemon, 4 GB heap

# Terminal 2 — frontend (http://localhost:5173)
cd frontend
npm run dev        # Vite
```

The frontend proxies API calls to the backend; in dev, CORS is permissive so any origin works.

Useful scripts:

| Command | Where | Purpose |
|---|---|---|
| `npm run dev` | backend | Start API with nodemon |
| `npm start` | backend | Start API (production mode) |
| `npm run seed` | backend | Seed default users (`seed.js`) |
| `npm run sync:patients[:dry]` | backend | SUKRAA patient sync |
| `npm run dev` | frontend | Vite dev server |
| `npm run build` | frontend | Production build → `frontend/dist` |
| `npm run lint` | frontend | ESLint |
| `npm run preview` | frontend | Preview the built frontend |

## 5. Deployment (Vercel)

The app deploys as a **static frontend + one serverless function**.

- `api/index.js` re-exports the Express app as the serverless handler; all `/api/*` traffic hits it.
- `vercel.json` sets:
  - `outputDirectory: frontend/dist` (the built SPA),
  - the function `maxDuration`,
  - `includeFiles: "backend/src/assets/**"` so PDF logo/stamp assets ship with the function,
  - rewrites so client-side routes and `/api/*` resolve correctly.
- Set all required environment variables in the Vercel project (Production/Preview/Development scopes as needed). The `vercel env` CLI or dashboard manage these.
- The Express server only calls `app.listen()` when **not** on Vercel, so the same code runs locally and serverless.

Typical flow:

```bash
# Vercel builds via the root build script (installs backend + builds frontend)
# Push to the connected branch, or:
vercel            # preview deploy
vercel --prod     # production deploy
```

**Production domain:** https://report.ops-legacyclinics.rw

## 6. Post-deploy verification

- `GET /api/health` → `{ success: true, status: 'ok' }`.
- Log in and confirm role-appropriate navigation renders.
- Generate a clinical sheet PDF and confirm the Legacy Clinics logo and stamps render (validates asset bundling).
- Confirm audit entries are being written for a sample workflow action.
