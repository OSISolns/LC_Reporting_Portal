# Integrations & Document Generation

## SUKRAA HIMS (patient system)

The portal pulls patient identity data from **SUKRAA**, the clinic's Hospital Information Management System, over its legacy **SOAP / ASMX** web service.

- **Service:** `sukraaService.js` builds SOAP 1.1 envelopes against the SUKRAA `Autocompleted.asmx` endpoint (`SUKRAA_SERVICE_URL`, namespace `http://tempuri.org/`, 30s timeout).
- **Capabilities:** patient autocomplete/search (prefix + count) and bulk patient pull.
- **Parsing:** responses are pipe/JSON-delimited strings parsed into structured patient objects (`cheerio` assists with XML/HTML fragments).
- **Local mirror:** pulled patients are stored in `sukraa_patients` (encrypted) with a `sukraa_sync_log` journal. Sync is exposed via `GET /api/patients/sync/status` and `POST /api/patients/sync/trigger`.
- Patient search across the app (clinical sheets, e-prescriptions, vitals) reads from this synced mirror rather than hitting SUKRAA on every keystroke.

## WHO ICD-11 terminology

Clinical coding uses the **WHO ICD-11 API**.

- Configured with `ICD11_CLIENT_ID` / `ICD11_CLIENT_SECRET`.
- Lookups are cached in the `icd11_cache` table to avoid repeated network calls.
- Surfaced through `GET /api/ai/clinical/icd11/all` and `/icd11/lookup`, and the frontend `ICD11BrowserModal`.

## AI engine (in-house, key-free)

The "AI Insights" and clinical drafting features run **locally** — no external LLM call is required for the core analytics, so they work without an API key and keep patient data in-house.

- **`utils/localAI.js` — reason classifier:**
  - **Incidents** are classified against the official **Legacy Clinics incident taxonomy** (38 types × severity × department).
  - **Cancellations / refunds** free-text reasons are clustered with **TF-IDF + cosine similarity** (via the `natural` library — Porter stemmer + tokenizer, lazy-loaded to keep serverless cold-starts small).
  - Produces pattern/trend detection and an **executive summary** (`GET /api/ai/executive`, `/stats`, `/classify/:module`).
- **`utils/clinicalAI.js` — clinical knowledge base:** a curated drug database (dose, route, frequency, category, cautions) powering medication suggestions, dosing instructions, assessments, progress-note and SBAR drafting (`/api/ai/clinical/*`).
- **Medication reference:** the Rwanda **FDA generic medications** list is imported (`scripts/import_fda_medications.js`) into the `fda_medications` cache to drive e-prescription autocomplete.

> A `GEMINI_API_KEY` variable exists for optional generative assistance, but the primary analytics path is the local engine above.

## PDF generation

High-fidelity clinical documents (clinical sheets, cancellation/refund vouchers, incident & safety reports, results transfers).

- **Engine:** `puppeteer-core` driving **`@sparticuz/chromium`** — a serverless-compatible Chromium build. Locally it points at the developer's installed Chrome; in production it uses the bundled binary.
- **Templates:** `utils/pdfTemplate.js` renders branded HTML (Legacy Clinics logo, per-document layouts) which Puppeteer prints to A4 PDF (`utils/pdf.js`).
- **Assets:** logo and approval/rejection/verified **stamps** are loaded from `backend/src/assets/` and embedded as base64. Paths are resolved relative to the module (not absolute) so they exist on the serverless filesystem; `vercel.json`'s `includeFiles` bundles the assets into the deployment.
- **Authenticity:** documents can carry a `qrcode` and SHA-256 checksum for verification; clinical observations expose `/checksum` and `/verify` endpoints.
- Both ESM-only Chromium and puppeteer-core are loaded via **dynamic `import()`** to avoid `ERR_REQUIRE_ESM` on Vercel's runtime.

## Excel export

- **ExcelJS** (`utils/excel.js`) builds `.xlsx` exports for cancellations, refunds, incidents, and audit logs (`/export/excel` endpoints). The frontend also uses `xlsx`/`exceljs` for client-side exports where appropriate.
