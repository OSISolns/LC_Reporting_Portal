# PostgreSQL Migration Strategy & Architectural Blueprint

> **Status**: Technical Specification / Roadmap  
> **Target Engine**: PostgreSQL v16+ with `PgBouncer` Connection Pooling  
> **Current Engine**: SQLite (Prisma Client) in Dev / Turso Cloud (LibSQL) in Prod  

---

## 📌 Executive Overview

The Legacy Clinics Lumina Portal currently uses a unified, custom database abstraction layer (`backend/src/config/db.js`, ~3,332 lines). This layer maps PostgreSQL-style parameterized queries (`$1`, `$2`, `ILIKE`) into SQLite-compatible placeholders (`?`, `LIKE`) and handles field-level AES-256-GCM encryption/decryption across 35+ tables.

While SQLite and LibSQL serve current workloads, scaling to 100+ tables with multi-user concurrent clinical logging (MAR, Odontogram, E-Prescriptions, Financial Approvals) will eventually require migrating to **PostgreSQL**.

---

## 🛠️ Required Code Modifications in `backend/src/config/db.js`

To transition `db.js` to native PostgreSQL, the following architectural updates are required:

### 1. Driver Replacement
Replace `@libsql/client` and `@prisma/client` raw queries with `pg.Pool` (the `pg` package is already installed as `"pg": "^8.12.0"` in `backend/package.json`):

```js
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'lc_reporting',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  max: 20, // PgBouncer or native pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### 2. Deactivation of SQL Dialect Translation
In PostgreSQL mode, `transformQuery()` should no longer convert `$N` placeholders to `?` or strip `ILIKE` / `NOW()`:

```js
// PostgreSQL accepts native $1, $2 parameters and ILIKE natively
const transformQueryForPg = (sql, params) => {
  return { sql, args: (params || []).map(p => sanitizeParam(p)) };
};
```

### 3. Native JSONB & Full-Text Search for Encrypted Columns
Currently, `interceptAndFilterQuery()` performs in-memory post-filtering for `LIKE` queries against encrypted columns. With PostgreSQL:
- Implement a blind index / HMAC hash column (e.g. `patient_name_hash`) for fast equality lookups.
- Keep field-level AES-256-GCM encryption for PHI/PII payload preservation.

---

## 📊 Database Schema Migration Steps

1. **Prisma Schema Provider**:
   Change `prisma/schema.prisma` datasource:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
2. **Datatype Mappings**:
   - `INTEGER PRIMARY KEY AUTOINCREMENT` -> `SERIAL PRIMARY KEY` or `BIGINT GENERATED ALWAYS AS IDENTITY`
   - `DATETIME` / `TEXT` -> `TIMESTAMPTZ` / `JSONB`
3. **Data Dump & Sync**:
   - Dump existing SQLite data via `pgloader` or a Node.js ETL script (`scripts/migrate_sqlite_to_pg.js`).
   - Validate row counts across all 100+ tables before switching `DATABASE_URL`.

---

## 🧪 Migration Safety Checklist

- [ ] Run backend unit & integration tests against local PostgreSQL instance (`npm test`).
- [ ] Verify field encryption/decryption consistency between SQLite ciphertext and PostgreSQL ciphertext.
- [ ] Validate multi-user write concurrency during simulated peak shift closure.
