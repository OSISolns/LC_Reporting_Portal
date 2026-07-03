# Legacy Clinics Lumina Portal — Documentation

A full-stack clinical operations management platform for **Legacy Clinics & Diagnostics**. It unifies financial workflows, clinical & nursing operations, safety/incident reporting, inventory & procurement, compliance, IT support, and system governance behind a single role-secured interface.

> **Production:** https://report.ops-legacyclinics.rw
> **Repository:** https://github.com/OSISolns/LC_Reporting_Portal

---

## What this is

The portal digitises the day-to-day operational paperwork of a multi-department clinic and puts it under one auditable, permission-controlled roof. Instead of paper forms and spreadsheets flowing between cashiers, nurses, lab leads, managers and executives, every request follows a defined multi-step approval workflow, is encrypted at rest, and leaves an immutable audit trail.

At a glance:

- **~20 functional modules** (finance, clinical, nursing, inventory, procurement, compliance, safety, IT, HR/performance).
- **19 roles** governed by a configurable, per-user-overridable Access Control Matrix.
- **53 database tables** on Turso (cloud SQLite / libSQL).
- **Field-level AES-256-GCM encryption** for all patient-identifying and sensitive data.
- **High-fidelity PDF** report/voucher generation and **Excel** exports.
- Integration with the **SUKRAA HIMS** patient system and the **WHO ICD-11** terminology API.
- Deployed as **Vercel serverless functions** (Node.js) with a static React front end.

---

## Documentation index

| Document | What's inside |
|---|---|
| [Architecture](architecture.md) | System topology, request lifecycle, tech stack, repo layout, runtime model |
| [Modules & Features](modules.md) | Every functional area, its workflow, state machine, and roles |
| [Roles & Permissions (RBAC)](rbac.md) | The 19 roles, the Access Control Matrix, per-user overrides, reviewer isolation |
| [Data Model](data-model.md) | Database engine, the 53 tables by domain, field-level encryption |
| [API Reference](api-reference.md) | REST endpoints grouped by module, auth, conventions |
| [Security](security.md) | Auth, encryption, audit logging, rate limiting, CORS, hardening |
| [Integrations](integrations.md) | SUKRAA HIMS, ICD-11, the local AI engine, PDF & Excel pipelines |
| [Setup & Deployment](setup-and-deployment.md) | Local dev, environment variables, database, Vercel deployment |

New to the codebase? Read **Architecture → Modules → RBAC** in that order.

---

## Tech stack (summary)

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 5, React Router v6, Tailwind CSS 3.4, Framer Motion, Lucide, Axios, react-hook-form |
| Backend | Node.js 24, Express 4, Helmet, express-rate-limit, express-validator |
| Database | Turso (libSQL / cloud SQLite) via `@libsql/client`; Prisma schema for modelling |
| Auth | JWT (`jsonwebtoken`) + `bcryptjs` |
| Security | AES-256-GCM field encryption, immutable audit log, RBAC matrix |
| Documents | Puppeteer-core + `@sparticuz/chromium` (PDF), ExcelJS (spreadsheets), `qrcode` |
| Integrations | SUKRAA HIMS (SOAP/ASMX), WHO ICD-11 API, in-house `natural`-based AI classifier |
| Hosting | Vercel serverless functions + static frontend build |

See [Architecture](architecture.md) for the full breakdown.
