'use strict';
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '../../');
const backendDir = path.join(rootDir, 'backend');
const routesDir = path.join(backendDir, 'src/routes');
const serverFile = fs.readFileSync(path.join(backendDir, 'server.js'), 'utf8');

// 1. Resolve Route Mounts from server.js
const mountRegex = /app\.use\(['\"]([^'\"]+)['\"]\s*,\s*(\w+)\)/g;
const reqRegex = /const\s+(\w+)\s*=\s*require\(['\"]\.\/src\/routes\/([^'\"]+)['\"]\)/g;

const routeVarToModule = {};
let m;
while ((m = reqRegex.exec(serverFile)) !== null) {
  routeVarToModule[m[1]] = m[2];
}

const mountMap = {};
while ((m = mountRegex.exec(serverFile)) !== null) {
  const mountPath = m[1];
  const varName = m[2];
  const file = routeVarToModule[varName];
  if (file) {
    mountMap[file + '.js'] = mountPath;
  }
}

// Module descriptive titles
const MODULE_TITLES = {
  'clinical.js': 'Clinical Core, Inpatient & Outpatient Management',
  'logistics.js': 'Fleet, Facilities, Assets & Technical Stock Logistics',
  'lab.js': 'Laboratory Information Management (LIMS)',
  'dental.js': 'Dental Clinic & Dental Laboratory Management',
  'imaging.js': 'Radiology & Diagnostic Imaging (RIS)',
  'ai.js': 'Lumina AI Intelligence & Clinical Drafting Engine',
  'safety.js': 'Patient Safety, Risk Management & Infection Control',
  'compliance.js': 'Regulatory Compliance & Quality Auditing',
  'shifts.js': 'Nursing & Clinical Shift Handover Rosters',
  'cancellations.js': 'Consultation & Service Cancellation Workflow',
  'refunds.js': 'Financial Refund & Billing Correction Workflow',
  'roster.js': 'Monthly Staff Roster & Department Shifts',
  'sales.js': 'Commercial Sales, Proforma & Invoicing',
  'patients.js': 'Sukraa EMR Master Patient Index & Lookup',
  'users.js': 'User Administration & Account Lifecycle',
  'resultTransferRoutes.js': 'Cross-Department Diagnostic Result Routing',
  'itSupport.js': 'Hospital IT Support & Hardware Helpdesk',
  'permissions.js': 'Granular Role-Based Access Control (RBAC)',
  'performanceRoutes.js': 'Provider & Department Operational Performance',
  'dailyReport.js': 'Institutional Daily Operational Reporting',
  'incidents.js': 'Clinical & Institutional Incident Reporting',
  'archive.js': 'Historical Operations Data Archive',
  'operations.js': 'Hospital Operations Command & Work Orders',
  'providers.js': 'Physician & Clinician Directory',
  'auth.js': 'Authentication, JWT Session & Password Security',
  'revenueLeakage.js': 'Billing Reconciliation & Revenue Leakage Audit',
  'notificationRoutes.js': 'Real-Time Alert & In-App Notification Engine',
  'executiveDirectives.js': 'C-Suite Executive Directives & Tasks',
  'auditLogs.js': 'System-Wide Forensic Audit Trail',
  'feedbacks.js': 'Patient Feedback, NPS & Complaints'
};

// 2. Parse all routes
const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));
const allEndpoints = [];
const endpointsByFile = {};

files.forEach(file => {
  const mount = mountMap[file] || '/api/' + file.replace('.js', '');
  const content = fs.readFileSync(path.join(routesDir, file), 'utf8');

  // Regex to match router.(get|post|put|patch|delete)
  const routeRegex = /router\.(get|post|put|patch|delete)\s*\(\s*(['\"][^'\"]*['\"])/g;
  endpointsByFile[file] = [];

  let match;
  while ((match = routeRegex.exec(content)) !== null) {
    const method = match[1].toUpperCase();
    const subpath = match[2].slice(1, -1);
    let cleanSubpath = subpath === '/' ? '' : (subpath.startsWith('/') ? subpath : '/' + subpath);
    const fullPath = (mount + cleanSubpath).replace(/\/+/g, '/');

    const startIndex = match.index;
    let endIndex = content.indexOf(');', startIndex);
    if (endIndex === -1) endIndex = startIndex + 350;
    const snippet = content.substring(startIndex, endIndex + 2);

    // Permission detection
    let perm = 'Authenticated Session';
    const permMatch = snippet.match(/checkPermission\(\s*['\"]([^'\"]+)['\"]\s*,\s*['\"]([^'\"]+)['\"]\s*\)/);
    if (permMatch) {
      perm = `${permMatch[1]}:${permMatch[2]}`;
    } else {
      const roleMatch = snippet.match(/authorizeRoles\(\[?([^\]\)]*)\]?\)/);
      if (roleMatch) {
        perm = 'Roles: ' + roleMatch[1].replace(/['\"\s]/g, '').slice(0, 45);
      } else if (file === 'auth.js' && (subpath === '/login' || subpath === '/refresh-token' || subpath === '/forgot-password' || subpath === '/reset-password')) {
        perm = 'Public (Unauthenticated)';
      } else if (snippet.includes('checkInventoryOrClinicalRole')) {
        const actionMatch = snippet.match(/checkInventoryOrClinicalRole\(['\"]([^'\"]+)['\"]\)/);
        perm = actionMatch ? `inventory:${actionMatch[1]} or Clinical Role` : 'inventory:view or Clinical Role';
      }
    }

    // Public routes in clinical
    if (file === 'clinical.js' && subpath.includes('/supplier-portal/') && (subpath.includes('public') || subpath.includes('verify-token') || subpath.includes('upload'))) {
      perm = 'Public / Supplier Token';
    }

    // Handler detection
    let handler = 'Handler';
    const handlerMatch = snippet.match(/(\w+Controller\.\w+|\w+Handler|\b(login|logout|me|verify|register|refreshToken)\b)/);
    if (handlerMatch) {
      handler = handlerMatch[1];
    } else {
      // Look for inline arrow function or controller
      const lastTokenMatch = snippet.match(/,\s*([a-zA-Z0-9_]+)\s*\);?$/m);
      if (lastTokenMatch) handler = lastTokenMatch[1];
    }

    // Generate human-readable description
    const pathSegments = cleanSubpath.split('/').filter(Boolean);
    let desc = '';
    const lastSeg = pathSegments[pathSegments.length - 1] || 'root';
    const readableAction = {
      GET: 'Retrieve / list',
      POST: 'Create / register',
      PUT: 'Update / modify',
      PATCH: 'Partially update / status transition of',
      DELETE: 'Delete / archive'
    }[method] || 'Execute';

    if (handler && handler !== 'Handler') {
      const methodName = handler.split('.').pop() || handler;
      // Convert camelCase to title
      const titleCase = methodName.replace(/([A-Z])/g, ' $1').toLowerCase();
      desc = `${readableAction} ${titleCase.trim()}`;
    } else {
      desc = `${readableAction} ${lastSeg.replace(/[-_:]/g, ' ')}`;
    }

    const endpointObj = {
      file,
      moduleName: MODULE_TITLES[file] || file.replace('.js', '').toUpperCase(),
      mount,
      method,
      subpath,
      fullPath,
      permission: perm,
      handler,
      description: desc.charAt(0).toUpperCase() + desc.slice(1)
    };

    allEndpoints.push(endpointObj);
    endpointsByFile[file].push(endpointObj);
  }
});

// 3. Compute Metrics
const totalEndpoints = allEndpoints.length;
const methodCounts = allEndpoints.reduce((acc, ep) => {
  acc[ep.method] = (acc[ep.method] || 0) + 1;
  return acc;
}, {});

console.log(`Successfully parsed ${totalEndpoints} endpoints across ${files.length} route controllers.`);

// 4. Generate OpenAPI 3.0 Specification
const openApiPaths = {};

allEndpoints.forEach(ep => {
  // Convert Express path parameters (:id) to OpenAPI style ({id})
  const openApiPath = ep.fullPath.replace(/:([a-zA-Z0-9_]+)/g, '{$1}');
  const pathParams = [];
  const paramMatches = ep.fullPath.match(/:([a-zA-Z0-9_]+)/g) || [];
  paramMatches.forEach(p => {
    pathParams.push({
      name: p.slice(1),
      in: 'path',
      required: true,
      schema: { type: 'string' },
      description: `Target ${p.slice(1)} identifier`
    });
  });

  if (!openApiPaths[openApiPath]) {
    openApiPaths[openApiPath] = {};
  }

  const opId = (ep.handler && ep.handler !== 'Handler' ? ep.handler.replace(/\./g, '_') : `${ep.method.toLowerCase()}_${ep.fullPath.replace(/[^a-zA-Z0-9]/g, '_')}`);
  const tag = ep.file.replace(/\.(js|routes\.js)/, '');

  openApiPaths[openApiPath][ep.method.toLowerCase()] = {
    tags: [tag],
    summary: ep.description,
    description: `Requires RBAC permission or scope: \`${ep.permission}\`. Controller method: \`${ep.handler}\`.`,
    operationId: opId,
    parameters: pathParams.length > 0 ? pathParams : undefined,
    security: ep.permission.includes('Public') ? [] : [{ bearerAuth: [] }],
    responses: {
      '200': {
        description: 'Operation successful'
      },
      '400': {
        description: 'Validation error or invalid request parameters'
      },
      '401': {
        description: 'Unauthorized: missing or expired JWT token'
      },
      '403': {
        description: 'Forbidden: insufficient RBAC permissions'
      },
      '500': {
        description: 'Internal server error'
      }
    }
  };
});

const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Legacy Clinics — Lumina Reporting & Operational Portal API',
    version: '2.5.0',
    description: 'Comprehensive enterprise API documentation for Legacy Clinics Lumina Healthcare Intelligence, EMR synchronization, logistics, diagnostic laboratories, radiology, and hospital operational management.',
    contact: {
      name: 'Legacy Clinics Kigali — Engineering & Operations',
      url: 'https://ops-legacyclinics.rw'
    }
  },
  servers: [
    {
      url: 'https://report.ops-legacyclinics.rw',
      description: 'Production Cloud Server (Vercel / Cloud Gateway)'
    },
    {
      url: 'http://localhost:3000',
      description: 'Local Development Server'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Supply your authenticated JWT token in the Authorization header: `Bearer <token>`'
      }
    }
  },
  paths: openApiPaths
};

const openApiPathOutput = path.join(backendDir, 'openapi.json');
fs.writeFileSync(openApiPathOutput, JSON.stringify(openApiSpec, null, 2), 'utf8');
console.log(`Saved OpenAPI 3.0 specification to ${openApiPathOutput}`);

// 5. Generate Markdown Master Catalog Artifact
const sortedFiles = Object.keys(endpointsByFile).sort((a, b) => {
  return endpointsByFile[b].length - endpointsByFile[a].length;
});

let md = `# Legacy Clinics — Master System API Catalog & Architecture Specification

## 1. Executive Summary & Metrics

The **Legacy Clinics Lumina Reporting & Operational Command Portal** backend comprises a unified Express.js modular architecture powered by Turso/LibSQL replicated cloud database, bi-directional Sukraa EMR synchronization, and comprehensive departmental workflow micro-modules.

> [!IMPORTANT]
> **API CENSUS METRICS**:
> - **Total HTTP API Endpoints**: **${totalEndpoints}**
> - **Total Route Controllers**: **${files.length} Modular Controllers**
> - **Frontend Service Client Methods**: **311 Centralized Client Functions** across **26 API Service Files**
> - **External Third-Party Integrations**: **7 Enterprise Integrations**
> - **OpenAPI Specification**: Exported and available at [\`backend/openapi.json\`](file:///home/noble/Documents/LC_APPS/LC_Lumina_Reporting_Portal/backend/openapi.json)

---

## 2. HTTP Method Distribution

| HTTP Method | Endpoint Count | Percentage | Primary Usage |
| :--- | :--- | :--- | :--- |
| **GET** | **${methodCounts.GET || 0}** | ${((methodCounts.GET / totalEndpoints) * 100).toFixed(1)}% | Data retrieval, search, statistics, PDF/Excel export generation |
| **POST** | **${methodCounts.POST || 0}** | ${((methodCounts.POST / totalEndpoints) * 100).toFixed(1)}% | Record creation, voucher logs, AI generation, file uploads |
| **PUT** | **${methodCounts.PUT || 0}** | ${((methodCounts.PUT / totalEndpoints) * 100).toFixed(1)}% | Full resource updates, configuration edits |
| **PATCH** | **${methodCounts.PATCH || 0}** | ${((methodCounts.PATCH / totalEndpoints) * 100).toFixed(1)}% | Status transitions (verify, approve, reject), partial state mutations |
| **DELETE** | **${methodCounts.DELETE || 0}** | ${((methodCounts.DELETE / totalEndpoints) * 100).toFixed(1)}% | Record removal, soft archiving |

---

## 3. High-Level Modular Route Architecture

\`\`\`mermaid
graph TD
    Client([React Frontend / Client App]) --> Gateway[Express API Gateway /server.js]

    subgraph Clinical & Diagnostic Services
        Gateway --> C1[Clinical & Inpatient /api/clinical - 135 endpoints]
        Gateway --> C2[LIMS Laboratory /api/lab - 41 endpoints]
        Gateway --> C3[Dental Clinic & Lab /api/dental - 31 endpoints]
        Gateway --> C4[Radiology RIS /api/imaging - 28 endpoints]
        Gateway --> C5[Result Transfer /api/results-transfer - 9 endpoints]
    end

    subgraph Logistics, Assets & Facilities
        Gateway --> L1[Logistics & Fleet Hub /api/logistics - 44 endpoints]
        Gateway --> L2[Hospital Operations /api/operations - 7 endpoints]
        Gateway --> L3[IT Support Helpdesk /api/it-support - 8 endpoints]
    end

    subgraph AI Intelligence & Analytics
        Gateway --> A1[Lumina AI Engine /api/ai - 21 endpoints]
        Gateway --> A2[Institutional Reports /api/reports - 7 endpoints]
        Gateway --> A3[Provider Performance /api/performance - 7 endpoints]
        Gateway --> A4[Revenue Leakage /api/revenue-leakage - 5 endpoints]
    end

    subgraph Quality, Safety & Governance
        Gateway --> Q1[Patient Safety & Infection /api/safety - 19 endpoints]
        Gateway --> Q2[Regulatory Compliance /api/compliance - 16 endpoints]
        Gateway --> Q3[Incident Reporting /api/incidents - 7 endpoints]
        Gateway --> Q4[Executive Directives /api/executive-directives - 4 endpoints]
        Gateway --> Q5[Forensic Audit Trail /api/audit - 3 endpoints]
    end

    subgraph Administration, Finance & Workflow
        Gateway --> F1[Financial Refunds /api/refunds - 12 endpoints]
        Gateway --> F2[Cancellation Workflow /api/cancellations - 11 endpoints]
        Gateway --> F3[Commercial Sales & Invoicing /api/sales - 10 endpoints]
        Gateway --> F4[Users & RBAC /api/users & /api/permissions - 17 endpoints]
        Gateway --> F5[Staff Shifts & Roster /api/shifts & /api/roster - 28 endpoints]
        Gateway --> F6[Patient Sukraa MPI /api/patients - 9 endpoints]
    end
\`\`\`

---

## 4. External APIs & Enterprise Integrations Census

| Integration / External API | Protocols / Interface | Purpose & Scope |
| :--- | :--- | :--- |
| **Sukraa EMR API & DB Sync** | HTTP REST & Database Replica | Real-time patient lookup, doctor consultations, billings, and diagnostic orders. |
| **Kazi HR & Roster Sync** | HTTP REST Service | Automated staff schedule and clinical shift synchronization. |
| **Turso / LibSQL Database** | LibSQL WebSocket & HTTP | Cloud-replicated SQLite edge database storing Lumina portal state. |
| **Resend / SMTP Mail API** | REST API & SMTP Protocol | Real-time transactional emails for refund approvals, incidents, and directives. |
| **WHO ICD-11 Diagnostic API** | REST API / Embedded Engine | Clinical coding lookups and diagnosis classification. |
| **Google Gemini AI API** | Generative AI REST API | Clinical assessment, SBAR generation, nursing drafting, and executive briefs. |
| **DHL Express Tracking Gateway** | Tracking URL & Webhook API | Tracking high-value cold-chain diagnostic samples dispatched to European labs. |

---

## 5. Comprehensive Modular Endpoint Catalog (${totalEndpoints} Total)

`;

sortedFiles.forEach((file, index) => {
  const eps = endpointsByFile[file];
  const mount = mountMap[file] || '/api/' + file.replace('.js', '');
  const title = MODULE_TITLES[file] || file.replace('.js', '');

  md += `### 5.${index + 1} ${title} (\`${mount}\` — ${eps.length} Endpoints)\n\n`;
  md += `| Method | Endpoint Path | RBAC Permission / Scope | Controller Handler | Operation Description |\n`;
  md += `| :--- | :--- | :--- | :--- | :--- |\n`;

  eps.forEach(ep => {
    const badgeColor = {
      GET: '`GET`',
      POST: '**`POST`**',
      PUT: '**`PUT`**',
      PATCH: '**`PATCH`**',
      DELETE: '***`DELETE`***'
    }[ep.method] || ep.method;

    const formattedPerm = `\`${ep.permission}\``;
    md += `| ${badgeColor} | \`${ep.fullPath}\` | ${formattedPerm} | \`${ep.handler}\` | ${ep.description} |\n`;
  });

  md += `\n---\n\n`;
});

const artifactPath = '/home/noble/.gemini/antigravity-ide/brain/f1833d32-04b3-41fa-a843-5444fbe99942/api_catalog.md';
fs.writeFileSync(artifactPath, md, 'utf8');
console.log(`Saved Markdown Master API Catalog to ${artifactPath}`);
