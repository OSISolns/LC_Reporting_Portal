# API Reference

Base path: **`/api`**. All routes are served by the single Express app (`backend/server.js`) behind the Vercel function.

## Conventions

- **Auth:** send `Authorization: Bearer <JWT>` on every request except login and the public supplier portal. The token encodes `id`, `role`, `full_name`.
- **Response envelope:** `{ "success": boolean, "message"?: string, "data"?: any }`.
- **Errors:** `401` (no/invalid/expired token), `403` (role/permission denied — also logged as a security violation), `404` (route/entity not found), `4xx` validation, `500` unhandled.
- **Rate limit:** 200 requests / 15 min per IP across `/api/*`.
- **Placeholders:** `:id`, `:pid`, `:patientId`, `:userId`, `:roleName` are path parameters.

A `GET /api/health` endpoint returns `{ success, status: 'ok', timestamp }` for uptime checks, and `GET /` returns a banner.

---

## Auth — `/api/auth`
| Method | Path | Notes |
|---|---|---|
| POST | `/dev-login` | Issue a JWT (development/institutional login) |
| GET | `/me` | Current authenticated user |

## Cancellations — `/api/cancellations`
| Method | Path | Notes |
|---|---|---|
| GET | `/` | List (reviewer sees mock only) |
| POST | `/` | Create request (`pending`) |
| GET | `/:id` | Get one |
| PATCH | `/:id/verify` | `pending → verified` (Sales Manager) |
| PATCH | `/:id/approve` | `verified → approved` (COO/Deputy COO) |
| PATCH | `/:id/reject` | `pending|verified → rejected` (+ comment) |
| DELETE | `/:id` | Delete a `pending` request |
| GET | `/:id/pdf` | Voucher PDF |
| GET | `/export/excel` | Excel export |

## Refunds — `/api/refunds`
Same shape as cancellations (create / verify / approve / reject / delete / `:id/pdf` / `export/excel`), state machine `pending → verified → approved | rejected`.

## Results Transfer — `/api/results-transfer`
CRUD + review/approve workflow (Cashier → Operations → Lab Team Lead). `GET /:id/pdf` for the document.

## Incidents — `/api/incidents`
| Method | Path | Notes |
|---|---|---|
| GET | `/` / `/:id` | List / get |
| POST | `/` | Create incident (with RCA fields) |
| DELETE | `/:id` | Delete |
| GET | `/:id/pdf` | Incident PDF |
| GET | `/export/excel` | Excel export |

## Safety — `/api/safety`
| Method | Path | Notes |
|---|---|---|
| GET | `/` / `/:id` | List / get safety reports |
| POST | `/` | Create |
| DELETE | `/:id` | Delete |
| GET | `/:id/pdf` | Safety report PDF |

## Clinical & Nursing — `/api/clinical`

### Observations / Clinical sheets
| Method | Path | Notes |
|---|---|---|
| GET | `/observations` | List observations |
| GET | `/observations/recent` | Recent |
| POST | `/observations/:patientId` | Create/update sheet |
| GET | `/observations/:patientId` / `/:patientId/all` | Get one / history |
| GET | `/observations/:patientId/checksum` | Tamper-evidence checksum |
| GET | `/observations/:patientId/verify` | Verify integrity |
| GET | `/observations/:patientId/pdf` | Branded clinical sheet PDF |
| GET | `/prescriptions/completed` | Completed prescriptions |
| GET | `/medications/search` | Medication name search (FDA list) |

### Inventory / procurement (`/api/clinical/inventory/*`)
Master inventory (`/master` CRUD + `/master/bulk-delete`), batches (`/batches`), distributed stock, reconcile (`/reconcile`), requisitions (`/requisitions`, `/:id/approve`, `/:id/reject`, `/:id/items`), vendors, departments, UoMs (each CRUD), purchase orders (`/purchase-orders` + `/:id/status`), GRNs (`/grns`), returns (`/returns`), change logs, and the password-unlock endpoints (`/unlock`, `/stock-password`, `/regenerate-stock-password`).

### Supplier portal (`/api/clinical/inventory/supplier-portal/*`)
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/public-status` | public | Is the portal open? |
| POST | `/verify-token` | public | Supplier token check |
| POST | `/upload` | public (token) | Supplier submission |
| GET | `/settings` / POST `/toggle` | manager | Configure portal |
| GET | `/submissions` / `/submissions/:id/items` | manager | Review |
| POST | `/submissions/:id/receive` | manager | Receive into stock |

## Patients — `/api/patients`
| Method | Path | Notes |
|---|---|---|
| GET | `/` / `/search` / `/:pid` | List / search / get |
| GET | `/sync/status` · POST `/sync/trigger` | SUKRAA sync |
| GET | `/:pid/vitals` · POST `/:pid/vitals` | Vitals history / capture |
| POST | `/:pid/prescription` | Record e-prescription |

## AI — `/api/ai`
| Method | Path | Notes |
|---|---|---|
| GET | `/stats` | Aggregate analytics |
| GET | `/classify/:module` | Classify records for a module |
| GET | `/executive` | Executive summary |
| POST | `/medications/suggest` | Medication suggestion |
| POST | `/clinical/icd10` · `/clinical/medications` · `/clinical/instructions` · `/clinical/assessment` · `/clinical/note` · `/clinical/sbar` | Clinical drafting helpers |
| GET | `/clinical/frequencies` | Dosing frequencies |
| GET | `/clinical/icd11/all` · `/clinical/icd11/lookup` | ICD-11 terminology |

## Compliance — `/api/compliance`
Audits (`/audits`, `PUT /audits/:id`), licenses (`/licenses` CRUD), facility certs (`/facility-certs` CRUD).

## Revenue Leakage — `/api/revenue-leakage`
CRUD (`/`, `PUT /:id`, `DELETE /:id`) plus `POST /scan` to detect leakages.

## Reports — `/api/reports`
| Method | Path | Notes |
|---|---|---|
| GET | `/config` | Report field config |
| GET | `/daily` · POST `/daily` | View / submit daily report |
| GET | `/weekly` · `/monthly` | Roll-ups |

## Performance — `/api/performance`
`/scores`, `/ratings`, `/ratings/:userId`, `/unrated-requests`, `/stats`, `POST /rate`, `/my-score`.

## Shifts — `/api/shifts`
`/my-active`, `/my-history` (plus open/close operations per shift type).

## IT Support — `/api/it-support`
Tickets (`/tickets` CRUD) and assets (`/assets` CRUD).

## Feedbacks — `/api/feedbacks`
`POST /` (submit), `GET /` (list), `DELETE /:id`.

## Notifications — `/api/notifications`
`GET /`, `GET /unread-count`, `PUT /mark-all-read`, `PUT /:id/read`, `DELETE /:id`.

## Permissions — `/api/permissions` (Admin)
See [RBAC → Managing the matrix](rbac.md#managing-the-matrix-api).

## Users — `/api/users` (Admin / IT Officer)
User CRUD + `GET /staff` (staff directory for assignment/rating).

## Audit — `/api/audit` (Admin / IT Officer)
`GET /` (list/filter), `GET /export/excel`, `POST /report-violation`.
