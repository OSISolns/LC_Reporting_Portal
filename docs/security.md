# Security

Security is layered: transport, authentication, authorization, data-at-rest encryption, auditability, and abuse protection. This document describes each layer and the operational hardening around it.

## Authentication

- **JWT bearer tokens** (`jsonwebtoken`), signed with `JWT_SECRET`. The server logs a critical error at boot if `JWT_SECRET` is missing.
- Tokens carry `id`, `role`, `full_name`. `authMiddleware` verifies the signature/expiry, attaches `req.user`, and normalises the legacy `M.D` role → `medical_director`.
- **Failed auth is audited** — invalid/expired tokens raise an `AUTH_FAILURE` audit entry (with a token snippet, not the full token). Expired tokens return `Session expired`, others `Invalid token`.
- Passwords are hashed with **`bcryptjs`**.
- **Session timeout** — the frontend `useInactivityTimer` hook drives a session-timeout modal and auto-logout after inactivity.

## Authorization

Two enforced layers (see [RBAC](rbac.md) for detail):

1. **Role guards** — `roleGuard()` / `authorizeRoles()` reject disallowed roles with `403`. `authorizeRoles` additionally raises a **`SECURITY_VIOLATION`** audit event and **notifies all admins** in-app when someone attempts an unauthorised module.
2. **Access Control Matrix** — fine-grained `module × action` checks with role defaults and per-user overrides.

**Reviewer isolation:** the `reviewer` (external auditor) role is confined to `is_mock = 1` rows at the SQL level, so auditors can exercise the system without ever reading or mutating real patient/financial data.

**Segregation of duties:** initiators of financial requests cannot approve them; approval requires a distinct executive role, and each transition is a separate audited action.

## Data-at-rest encryption

- **AES-256-GCM** field encryption (`utils/crypto.js`) applied transparently at the model layer to every patient-identifying, financial, and clinical column (full map in `config/db.js`; catalogued in [Data Model](data-model.md)).
- Ciphertext format `enc:<iv>:<authTag>:<ciphertext>`; encryption is idempotent (won't double-encrypt) and decryption failures degrade gracefully (return raw value, never crash).
- Key derived from **`DB_ENCRYPTION_KEY`** via SHA-256. **This must be set in production** — otherwise an insecure fallback key is used and a warning is logged.

## Auditability

- The **`audit_logs`** table is an append-only record of `user_id, user_name, user_role, action, entity_type, entity_id, details(JSON), ip_address, timestamp`.
- Client IP is normalised from `x-forwarded-for` (proxy chains stripped to the origin IP; IPv6 loopback and IPv4-mapped addresses normalised).
- Audit writes are **non-fatal** — a logging failure never breaks the underlying request.
- Sensitive events captured include `AUTH_FAILURE`, `PERMISSION_DENIED`, `SECURITY_VIOLATION`, plus workflow transitions.
- Audit logs are viewable/exportable by Admin & IT Officer only.

## Transport & network hardening

- **`helmet`** sets security headers (with `crossOriginResourcePolicy: cross-origin` to allow asset/image serving used by PDFs).
- **CORS allow-list**: `localhost:5173/3000`, the production domain `report.ops-legacyclinics.rw`, any `*.vercel.app` preview, and `FRONTEND_URL`. Non-production allows all origins for local testing; disallowed origins are logged and blocked. Credentials enabled; methods limited to `GET/POST/PUT/PATCH/DELETE/OPTIONS`.
- **Rate limiting** — 200 requests / 15 min per IP on `/api/*` (`trust proxy` set to `1` for correct client-IP behind Vercel).
- **Body size cap** — JSON limited to 10 MB.

## Application hardening

- **`express-validator`** validates and sanitises inputs at the route layer.
- **Parameterised SQL** everywhere (`$1, $2, …`) — no string-concatenated queries, so injection surface is minimal. Workflow state transitions are guarded by `WHERE status = <expected>` so illegal transitions are no-ops rather than corrupting state.
- **Frontend obfuscation** — the production bundle is passed through `vite-plugin-javascript-obfuscator`.
- **Supplier portal** is the only public write surface and is **token-gated** (`verify-token` before `upload`).

## Operational secrets

Secrets live in environment variables (never in the repo): `JWT_SECRET`, `DB_ENCRYPTION_KEY`, `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, plus integration keys (`GEMINI_API_KEY`, `ICD11_CLIENT_ID/SECRET`). See [Setup & Deployment](setup-and-deployment.md).

## Data governance

Production (Turso) data is kept strictly separate from local development data. Do **not** copy dev database rows into Turso prod. The only approved data sync into prod is the FDA medications reference list. Patient and financial records must never leave the encrypted production store through ad-hoc copies.

## Checklist for production

- [ ] `JWT_SECRET` set (strong, random).
- [ ] `DB_ENCRYPTION_KEY` set (do not rely on the fallback).
- [ ] `NODE_ENV=production` so CORS enforces the allow-list.
- [ ] Turso credentials scoped to the production database only.
- [ ] Admin accounts reviewed; default/institutional passwords rotated.
- [ ] Audit log retention/monitoring in place.
