import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { getAIStats, classifyModule, getDeptStats } from '../api/ai';
import * as XLSX from 'xlsx';
import {
  Brain, TrendingUp, FileText, ReceiptText, AlertTriangle,
  CheckCircle, Clock, XCircle, Sparkles, RefreshCw,
  BarChart2, ShieldAlert, Lightbulb, ChevronDown, ChevronUp,
  MessageSquare, Package, ClipboardList,
  FlaskConical, Scan, Truck, Activity,
  Building2, Monitor, HeartPulse, Users, ShoppingCart,
  Star, Eye, Lock, Download, BookOpen, Siren,
} from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtRWF  = (n) => `RWF ${Number(n || 0).toLocaleString()}`;
const fmtDate = ()  => new Date().toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short' });
const safeNum = (v) => (v == null || v === '' ? '\u2014' : Number(v).toLocaleString());

// ── Design tokens: single accent, flat, light ─────────────────────────────────
const T = {
  accent:      '#1C69A0',
  border:      '#d1d5db',
  borderLight: '#e5e7eb',
  bg:          '#ffffff',
  bgSubtle:    '#f9fafb',
  bgMuted:     '#f3f4f6',
  text:        '#111827',
  textSub:     '#6b7280',
  textMuted:   '#9ca3af',
};

// ── Classification module map ─────────────────────────────────────────────────
const CLASSIFIABLE_MODULES = {
  operations:    'daily_reports',
  customer_care: 'cancellations',
  nursing:       'incidents',
  it:            'security',
};

// ── Line manager roles ────────────────────────────────────────────────────────
const LINE_MANAGER_ROLES = [
  'chef-nurse', 'deputy_chef_nurse', 'deputy-chef-nurse', 'deputy_chief_nurse',
  'chef_nurse', 'chief_nurse', 'chief-nurse', 'head_nurse', 'nursing_lead', 'nurse_manager',
  'lab_manager', 'lab_team_lead', 'lab_lead',
  'imaging_manager', 'dental_hod', 'dental_lab_manager',
  'physio_manager', 'logistics_manager', 'logistics_officer',
  'procurement-manager', 'it_officer', 'hsfp', 'stock-manager', 'sales_manager',
];

// ── RBAC ──────────────────────────────────────────────────────────────────────
const EXEC_ROLES = [
  'admin', 'chairman', 'coo', 'deputy_coo', 'medical_director', 'pa',
  'sales_manager', 'consultant', 'quality_accreditation_officer',
  'quality_manager', 'qm',
];
const SECURITY_ROLES = ['admin'];

const DEPARTMENTS = [
  {
    id: 'operations', label: 'Operations', icon: <Building2 size={14} />,
    description: 'Daily operational reports, shift management & performance.',
    allowedRoles: [...EXEC_ROLES, 'hsfp'],
    kpiMap: [
      { key: 'daily_reports',  label: 'Daily Reports' },
      { key: 'shifts_total',   label: 'Total Shifts' },
      { key: 'shifts_open',    label: 'Open Shifts' },
      { key: 'shifts_closed',  label: 'Closed Shifts' },
      { key: 'shifts_flagged', label: 'Flagged Shifts' },
    ],
  },
  {
    id: 'it', label: 'IT', icon: <Monitor size={14} />,
    description: 'IT support tickets, asset lifecycle & system security events.',
    allowedRoles: [...EXEC_ROLES, 'it_officer'],
    kpiMap: [
      { key: 'total',    label: 'Total Tickets' },
      { key: 'open',     label: 'Open / In Progress' },
      { key: 'resolved', label: 'Resolved' },
      { key: 'critical', label: 'Critical Priority' },
      { key: 'high',     label: 'High Priority' },
    ],
  },
  {
    id: 'dental', label: 'Dental', icon: <Star size={14} />,
    description: 'Dental cases by status, procedure types & consumables.',
    allowedRoles: [...EXEC_ROLES, 'dental_hod', 'dental_lab_manager'],
    kpiMap: [
      { key: 'total',       label: 'Total Cases' },
      { key: 'active',      label: 'Active Cases' },
      { key: 'completed',   label: 'Completed' },
      { key: 'pending',     label: 'Pending' },
      { key: 'consumables', label: 'Consumable Entries' },
    ],
  },
  {
    id: 'nursing', label: 'Nursing', icon: <HeartPulse size={14} />,
    description: 'Clinical sheets, ward reports, stock levels & incident tracking.',
    allowedRoles: [...EXEC_ROLES, 'chef-nurse', 'deputy_chef_nurse', 'deputy-chef-nurse', 'deputy_chief_nurse', 'chef_nurse', 'chief_nurse', 'chief-nurse', 'head_nurse', 'nursing_lead', 'nurse_manager', 'hsfp'],
    kpiMap: [
      { key: 'clinical_sheets', label: 'Clinical Sheets' },
      { key: 'daily_reports',   label: 'Daily Ward Reports' },
      { key: 'stock_ok',        label: 'Stock Adequate' },
      { key: 'stock_low',       label: 'Low Stock Items' },
      { key: 'stock_critical',  label: 'Critical Stock' },
      { key: 'incidents',       label: 'Incidents Reported' },
    ],
  },
  {
    id: 'laboratory', label: 'Laboratory', icon: <FlaskConical size={14} />,
    description: 'Lab sessions, NCR management, analyzer status & quality metrics.',
    allowedRoles: [...EXEC_ROLES, 'lab_manager', 'lab_team_lead', 'lab_lead', 'hsfp'],
    kpiMap: [
      { key: 'sessions',    label: 'Lab Sessions' },
      { key: 'ncrs_total',  label: 'Total NCRs' },
      { key: 'ncrs_open',   label: 'Open NCRs' },
      { key: 'ncrs_closed', label: 'Closed NCRs' },
      { key: 'analyzers',   label: 'Analyzers on Record' },
    ],
  },
  {
    id: 'imaging', label: 'Imaging', icon: <Scan size={14} />,
    description: 'Radiology & imaging study volumes by modality.',
    allowedRoles: [...EXEC_ROLES, 'imaging_manager'],
    kpiMap: [
      { key: 'total', label: 'Total Imaging Studies' },
    ],
  },
  {
    id: 'stock', label: 'Stock', icon: <Package size={14} />,
    description: 'Central store stock levels, replenishment alerts & consumables log.',
    allowedRoles: [...EXEC_ROLES, 'chef-nurse', 'deputy_chef_nurse', 'deputy-chef-nurse', 'deputy_chief_nurse', 'chef_nurse', 'chief_nurse', 'chief-nurse', 'head_nurse', 'nursing_lead', 'nurse_manager', 'stock-manager'],
    kpiMap: [
      { key: 'total',              label: 'Total Stock Records' },
      { key: 'ok',                 label: 'Adequate Stock' },
      { key: 'low',                label: 'Low Stock Items' },
      { key: 'critical',           label: 'Critical Depletion' },
      { key: 'consumables_logged', label: 'Consumables Logged' },
    ],
  },
  {
    id: 'procurement', label: 'Procurement', icon: <ShoppingCart size={14} />,
    description: 'Purchase requests, approval pipeline & supplier performance.',
    allowedRoles: [...EXEC_ROLES, 'procurement-manager'],
    kpiMap: [
      { key: 'total',    label: 'Total Purchase Requests' },
      { key: 'pending',  label: 'Awaiting Approval' },
      { key: 'approved', label: 'Approved' },
      { key: 'rejected', label: 'Rejected' },
    ],
  },
  {
    id: 'logistics', label: 'Logistics', icon: <Truck size={14} />,
    description: 'Fleet & transport requests — pending, in-transit & completed.',
    allowedRoles: [...EXEC_ROLES, 'logistics_manager', 'logistics_officer'],
    kpiMap: [
      { key: 'total',      label: 'Total Requests' },
      { key: 'pending',    label: 'Pending Dispatch' },
      { key: 'in_transit', label: 'In Transit' },
      { key: 'completed',  label: 'Completed' },
    ],
  },
  {
    id: 'physio', label: 'Physio', icon: <Activity size={14} />,
    description: 'Physiotherapy session outcomes & patient treatment continuity.',
    allowedRoles: [...EXEC_ROLES, 'physio_manager'],
    kpiMap: [
      { key: 'total',        label: 'Total Sessions' },
      { key: 'completed',    label: 'Completed' },
      { key: 'ongoing',      label: 'Ongoing' },
      { key: 'discontinued', label: 'Discontinued' },
    ],
  },
  {
    id: 'customer_care', label: 'Customer Care', icon: <Users size={14} />,
    description: 'Cancellations, refunds, financial exposure & patient feedback.',
    allowedRoles: ['admin', 'chairman', 'coo', 'deputy_coo', 'sales_manager', 'principal_cashier', 'consultant', 'quality_accreditation_officer'],
    kpiMap: [
      { key: 'cancellations_total',    label: 'Total Cancellations' },
      { key: 'cancellations_approved', label: 'Approved Cancellations' },
      { key: 'cancellations_pending',  label: 'Pending Cancellations' },
      { key: 'cancellations_value',    label: 'Approved Value', format: 'rwf' },
      { key: 'refunds_total',          label: 'Total Refunds' },
      { key: 'refunds_approved',       label: 'Approved Refunds' },
      { key: 'refunds_pending',        label: 'Pending Refunds' },
      { key: 'refunds_value',          label: 'Approved Refund Value', format: 'rwf' },
      { key: 'feedbacks',              label: 'Feedback Records' },
    ],
  },
];

// ── Shared style tokens ───────────────────────────────────────────────────────
const S = {
  card:      { background: T.bg, border: `1px solid ${T.border}`, borderRadius: '6px' },
  label:     { margin: 0, fontSize: '0.68rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: T.textMuted },
  sectionHd: { margin: 0, fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: T.textSub },
};

// ── KPI Card ──────────────────────────────────────────────────────────────────
const KpiCard = ({ label, value, format }) => {
  const display   = format === 'rwf' ? fmtRWF(value) : safeNum(value);
  const isUnavail = value == null;
  return (
    <div style={{ ...S.card, padding: '1.1rem 1.25rem' }}>
      <p style={S.label}>{label}</p>
      <p style={{
        margin: '6px 0 0', lineHeight: 1,
        fontSize: isUnavail ? '0.85rem' : '1.75rem',
        fontWeight: 700,
        color: isUnavail ? T.textMuted : T.text,
        fontVariantNumeric: 'tabular-nums',
      }}>
        {display}
      </p>
    </div>
  );
};

// ── Inline progress bar (single accent colour) ────────────────────────────────
const InlineBar = ({ pct }) => (
  <div style={{ flex: 1, height: '4px', background: T.bgMuted, borderRadius: '2px', overflow: 'hidden' }}>
    <div style={{ width: `${Math.min(pct || 0, 100)}%`, height: '100%', background: T.accent, borderRadius: '2px', transition: 'width 0.4s ease' }} />
  </div>
);

// ── Row: label + bar + value ──────────────────────────────────────────────────
const DataRow = ({ label, value, pct }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0', borderBottom: `1px solid ${T.borderLight}` }}>
    <span style={{ fontSize: '0.82rem', color: T.textSub, minWidth: '80px' }}>{label}</span>
    {pct !== undefined && <InlineBar pct={pct} />}
    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: T.text, minWidth: '28px', textAlign: 'right' }}>{value}</span>
  </div>
);

// ── Classification category row ───────────────────────────────────────────────
const CategoryRow = ({ cat, total }) => {
  const pct      = total > 0 ? Math.round((cat.count / total) * 100) : 0;
  const sevLabel = cat.severity ? (cat.severity.charAt(0).toUpperCase() + cat.severity.slice(1).toLowerCase()) : '';
  return (
    <div style={{ padding: '0.75rem 0', borderBottom: `1px solid ${T.borderLight}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px', gap: '12px' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 500, color: T.text, flex: 1 }}>{cat.label}</span>
        <span style={{ fontSize: '0.72rem', fontWeight: 600, color: T.textSub, whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {sevLabel}{sevLabel ? ' · ' : ''}{cat.count} ({pct}%)
        </span>
      </div>
      <InlineBar pct={pct} />
      {cat.examples?.length > 0 && (
        <p style={{ margin: '5px 0 0', fontSize: '0.72rem', color: T.textMuted, fontStyle: 'italic' }}>
          {cat.examples.slice(0, 2).join(' · ')}
        </p>
      )}
    </div>
  );
};

// ── Staff attribution table ───────────────────────────────────────────────────
const StaffTable = ({ rows = [] }) => {
  if (!rows.length) return null;
  const max = rows[0]?.count || 1;
  return (
    <div style={{ marginTop: '1rem' }}>
      <p style={{ ...S.sectionHd, marginBottom: '8px' }}>Staff Breakdown</p>
      {rows.map((row, i) => (
        <DataRow key={i} label={row.cashier} value={row.count} pct={Math.round((row.count / max) * 100)} />
      ))}
    </div>
  );
};

// ── Customer Care summary box ─────────────────────────────────────────────────
const StatusSummaryBox = ({ label, data }) => {
  if (!data || !data.total) return null;
  const rows = [
    { l: 'Approved', v: data.approved },
    { l: 'Pending',  v: data.pending },
    { l: 'Rejected', v: data.rejected },
  ].filter(r => r.v != null);
  return (
    <div style={{ ...S.card, padding: '1rem 1.25rem' }}>
      <p style={{ ...S.sectionHd, marginBottom: '10px' }}>{label}</p>
      {rows.map(r => <DataRow key={r.l} label={r.l} value={safeNum(r.v)} />)}
      {data.approvedAmountRWF != null && (
        <p style={{ margin: '8px 0 0', fontSize: '0.82rem', color: T.textSub }}>
          Approved value: <strong style={{ color: T.text }}>{fmtRWF(data.approvedAmountRWF)}</strong>
        </p>
      )}
    </div>
  );
};

// ── Excel export ──────────────────────────────────────────────────────────────
const exportToExcel = (dept, stats, classified, user) => {
  const wb   = XLSX.utils.book_new();
  const ts   = fmtDate();
  const role = (user?.role || '').replace(/_/g, ' ').replace(/-/g, ' ');

  const ws0 = XLSX.utils.aoa_to_sheet([
    ['LUMINA INTELLIGENCE — DEPARTMENT REPORT'],
    [],
    ['Department',     dept.label],
    ['Report Date',    ts],
    ['Generated By',   user?.full_name || user?.username || 'Unknown'],
    ['Role',           role],
    ['Classification', 'CONFIDENTIAL — INTERNAL USE ONLY'],
    [],
    ['Scope', dept.description],
  ]);
  ws0['!cols'] = [{ wch: 24 }, { wch: 48 }];
  XLSX.utils.book_append_sheet(wb, ws0, 'Cover');

  const kpiRows = [['Metric', 'Value']];
  dept.kpiMap.forEach(k => {
    const raw = stats?.[k.key];
    if (typeof raw === 'object' && raw !== null) {
      Object.entries(raw).forEach(([mod, cnt]) => kpiRows.push([`${k.label} — ${mod}`, cnt]));
    } else {
      kpiRows.push([k.label, raw == null ? 'N/A' : (k.format === 'rwf' ? Number(raw).toLocaleString() : Number(raw))]);
    }
  });
  const ws1 = XLSX.utils.aoa_to_sheet(kpiRows);
  ws1['!cols'] = [{ wch: 36 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(wb, ws1, 'KPI Summary');

  const classModule = CLASSIFIABLE_MODULES[dept.id];
  const cls = classModule ? classified[classModule] : null;
  if (cls) {
    const clsRows = [['Category', 'Count', 'Percentage (%)', 'Severity', 'Examples']];
    (cls.categories || []).forEach(cat => clsRows.push([
      cat.label, cat.count, cat.percentage, (cat.severity || '').toUpperCase(), (cat.examples || []).join(' | ')
    ]));
    const ws2 = XLSX.utils.aoa_to_sheet(clsRows);
    ws2['!cols'] = [{ wch: 32 }, { wch: 10 }, { wch: 14 }, { wch: 12 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(wb, ws2, 'Classification');
  }

  XLSX.writeFile(wb, `Lumina_${dept.label.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`);
};

// ── Department Panel ──────────────────────────────────────────────────────────
const DeptPanel = ({ dept, globalStats, canClassify, onClassify, classifying, classified }) => {
  const [deptStats, setDeptStats] = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [loadErr,   setLoadErr]   = useState(false);
  const [expanded,  setExpanded]  = useState(false);

  useEffect(() => {
    setLoading(true); setLoadErr(false); setDeptStats(null);
    getDeptStats(dept.id)
      .then(res => { const d = res.data.data; d?._error ? setLoadErr(true) : setDeptStats(d); })
      .catch(() => setLoadErr(true))
      .finally(() => setLoading(false));
  }, [dept.id]);

  const classModule      = CLASSIFIABLE_MODULES[dept.id];
  const moduleClassified = classModule ? classified[classModule] : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {!loading && loadErr && (
        <p style={{ margin: 0, padding: '0.85rem 1rem', background: T.bgSubtle, border: `1px solid ${T.border}`, borderRadius: '6px', fontSize: '0.84rem', color: T.textSub }}>
          No data available for <strong>{dept.label}</strong>. Verify the module is active and has records.
        </p>
      )}

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: T.textMuted, fontSize: '0.84rem', padding: '0.5rem 0' }}>
          <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Loading data…
        </div>
      ) : !loadErr && deptStats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
          {dept.kpiMap.map(kpi => {
            const rawVal = deptStats[kpi.key];
            const val = typeof rawVal === 'object' && rawVal !== null
              ? Object.values(rawVal).reduce((a, b) => a + Number(b), 0) : rawVal;
            return <KpiCard key={kpi.key} label={kpi.label} value={val} format={kpi.format} />;
          })}
        </div>
      )}

      {!loading && !loadErr && dept.id === 'customer_care' && globalStats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.75rem' }}>
          {[{ key: 'cancellations', label: 'Cancellations' }, { key: 'refunds', label: 'Refunds' }].map(({ key, label }) => (
            <StatusSummaryBox key={key} label={label} data={globalStats[key]} />
          ))}
        </div>
      )}

      {canClassify && (
        <div style={S.card}>
          <div style={{ padding: '0.9rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', borderBottom: moduleClassified ? `1px solid ${T.borderLight}` : 'none' }}>
            <div>
              <p style={{ margin: 0, fontWeight: 600, fontSize: '0.88rem', color: T.text }}>Lumina Intelligence Classification</p>
              <p style={{ margin: '2px 0 0', fontSize: '0.76rem', color: T.textMuted }}>Analyses recent records to surface recurring patterns</p>
            </div>
            <button
              id={`classify-btn-${dept.id}`}
              onClick={() => { onClassify(classModule); setExpanded(true); }}
              disabled={classifying}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '0.45rem 1rem', background: classifying ? T.bgMuted : T.accent,
                color: classifying ? T.textMuted : '#fff', border: 'none', borderRadius: '5px',
                fontWeight: 600, fontSize: '0.8rem', cursor: classifying ? 'not-allowed' : 'pointer',
              }}
            >
              {classifying ? <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={12} />}
              {classifying ? 'Running…' : moduleClassified ? 'Re-run' : 'Run Analysis'}
            </button>
          </div>

          {moduleClassified && (
            <div style={{ padding: '1rem 1.25rem' }}>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginBottom: expanded ? '0.75rem' : 0 }}
                onClick={() => setExpanded(e => !e)}
              >
                <span style={{ fontWeight: 600, fontSize: '0.84rem', color: T.text }}>
                  {moduleClassified.total} records &nbsp;&middot;&nbsp; {(moduleClassified.categories || []).length} categories identified
                </span>
                {expanded ? <ChevronUp size={14} color={T.textMuted} /> : <ChevronDown size={14} color={T.textMuted} />}
              </div>
              {expanded && (
                <>
                  {moduleClassified.executiveSummary && (
                    <div style={{ padding: '0.8rem 1rem', background: T.bgSubtle, borderRadius: '5px', border: `1px solid ${T.borderLight}`, marginBottom: '0.75rem' }}>
                      <p style={{ margin: 0, fontSize: '0.82rem', color: T.textSub, lineHeight: 1.65 }}>{moduleClassified.executiveSummary}</p>
                    </div>
                  )}
                  <div>{(moduleClassified.categories || []).map((cat, i) => <CategoryRow key={i} cat={cat} total={moduleClassified.total} />)}</div>
                  <StaffTable rows={moduleClassified.cashierAttribution || []} />
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Incident Analysis Panel (line managers) ───────────────────────────────────
const IncidentAnalysisPanel = () => {
  const [incidents, setIncidents] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [err,       setErr]       = useState(false);
  const [expanded,  setExpanded]  = useState(true);

  useEffect(() => {
    setLoading(true); setErr(false);
    api.get('/incidents', { params: { limit: 200 } })
      .then(res => {
        const rows = Array.isArray(res.data?.data) ? res.data.data
          : Array.isArray(res.data?.incidents) ? res.data.incidents
          : Array.isArray(res.data) ? res.data : [];
        setIncidents(rows);
      })
      .catch(() => setErr(true))
      .finally(() => setLoading(false));
  }, []);

  const total    = incidents.length;
  const pending  = incidents.filter(i => (i.status || '').toLowerCase() === 'pending').length;
  const reviewed = incidents.filter(i => (i.status || '').toLowerCase() === 'reviewed').length;
  const approved = incidents.filter(i => ['approved', 'closed'].includes((i.status || '').toLowerCase())).length;

  const bySeverity = { High: 0, Medium: 0, Low: 0 };
  incidents.forEach(i => { const s = i.severity || 'Low'; bySeverity[s] = (bySeverity[s] || 0) + 1; });

  const byType = {};
  incidents.forEach(i => { const t = i.incident_type || 'Unknown'; byType[t] = (byType[t] || 0) + 1; });
  const typeEntries = Object.entries(byType).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maxType = typeEntries[0]?.[1] || 1;

  const recent = [...incidents].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5);

  return (
    <div style={{ ...S.card, overflow: 'hidden', marginBottom: '0.5rem' }}>
      <div style={{
        padding: '0.9rem 1.25rem', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap',
        borderBottom: expanded ? `1px solid ${T.borderLight}` : 'none',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Siren size={16} color={T.accent} />
          <div>
            <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem', color: T.text }}>Incident Report Analysis</p>
            <p style={{ margin: '1px 0 0', fontSize: '0.75rem', color: T.textMuted }}>Lumina Intelligence · Your department overview</p>
          </div>
        </div>
        <button
          onClick={() => setExpanded(e => !e)}
          style={{ background: 'none', border: `1px solid ${T.border}`, borderRadius: '4px', cursor: 'pointer', color: T.textSub, display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', padding: '0.3rem 0.65rem' }}
        >
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          {expanded ? 'Collapse' : 'Expand'}
        </button>
      </div>

      {expanded && (
        <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: T.textMuted, fontSize: '0.84rem' }}>
              <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Loading incident data…
            </div>
          )}

          {!loading && err && (
            <p style={{ margin: 0, padding: '0.85rem 1rem', background: T.bgSubtle, border: `1px solid ${T.border}`, borderRadius: '6px', fontSize: '0.84rem', color: T.textSub }}>
              Unable to load incident reports.
            </p>
          )}

          {!loading && !err && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '0.75rem' }}>
                {[
                  { label: 'Total Incidents',   value: total },
                  { label: 'Pending Review',    value: pending },
                  { label: 'Reviewed',          value: reviewed },
                  { label: 'Closed / Approved', value: approved },
                ].map(k => <KpiCard key={k.label} label={k.label} value={k.value} />)}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div style={{ ...S.card, padding: '1rem 1.25rem' }}>
                  <p style={{ ...S.sectionHd, marginBottom: '8px' }}>By Severity</p>
                  {Object.entries(bySeverity).map(([sev, cnt]) => (
                    <DataRow key={sev} label={sev} value={cnt} pct={total > 0 ? Math.round((cnt / total) * 100) : 0} />
                  ))}
                </div>
                <div style={{ ...S.card, padding: '1rem 1.25rem' }}>
                  <p style={{ ...S.sectionHd, marginBottom: '8px' }}>By Incident Type</p>
                  {typeEntries.map(([type, cnt]) => (
                    <DataRow key={type} label={type} value={cnt} pct={Math.round((cnt / maxType) * 100)} />
                  ))}
                  {typeEntries.length === 0 && <p style={{ margin: 0, fontSize: '0.82rem', color: T.textMuted }}>No records.</p>}
                </div>
              </div>

              {recent.length > 0 && (
                <div style={S.card}>
                  <div style={{ padding: '0.7rem 1.25rem', borderBottom: `1px solid ${T.borderLight}` }}>
                    <p style={S.sectionHd}>Recent Incidents</p>
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ background: T.bgSubtle }}>
                        {['Description', 'Type', 'Severity', 'Status'].map(h => (
                          <th key={h} style={{ padding: '0.5rem 1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: T.textMuted, borderBottom: `1px solid ${T.borderLight}` }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {recent.map((inc, i) => (
                        <tr key={inc.id} style={{ background: i % 2 === 0 ? T.bg : T.bgSubtle }}>
                          <td style={{ padding: '0.6rem 1rem', color: T.text, maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inc.description || '—'}</td>
                          <td style={{ padding: '0.6rem 1rem', color: T.textSub }}>{inc.incident_type || '—'}</td>
                          <td style={{ padding: '0.6rem 1rem', color: T.text, fontWeight: 500 }}>{inc.severity || '—'}</td>
                          <td style={{ padding: '0.6rem 1rem', color: T.textSub, textTransform: 'capitalize' }}>{inc.status || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {total === 0 && (
                <p style={{ margin: 0, fontSize: '0.84rem', color: T.textMuted, textAlign: 'center', padding: '1.5rem 0' }}>
                  No incidents on record.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
const LuminaIntelligence = () => {
  const { user } = useAuth();
  const role     = user?.role || '';

  const [activeTab,   setActiveTab]   = useState(null);
  const [globalStats, setGlobalStats] = useState(null);
  const [classified,  setClassified]  = useState({});
  const [analyzing,   setAnalyzing]   = useState({});
  const [error,       setError]       = useState('');
  const [exporting,   setExporting]   = useState(false);

  const isExec               = EXEC_ROLES.includes(role);
  const canSeeSecurityClassify = SECURITY_ROLES.includes(role);
  const visibleDepts         = DEPARTMENTS.filter(d => isExec || d.allowedRoles.includes(role));

  useEffect(() => {
    if (visibleDepts.length && !activeTab) setActiveTab(visibleDepts[0].id);
  }, [visibleDepts.length]);

  useEffect(() => {
    getAIStats().then(res => setGlobalStats(res.data.data)).catch(() => {});
  }, []);

  const handleClassify = useCallback(async (module) => {
    if (!module) return;
    if (module === 'security' && !canSeeSecurityClassify) {
      setError('Security classification is restricted to administrators.');
      return;
    }
    setAnalyzing(prev => ({ ...prev, [module]: true }));
    setError('');
    try {
      const res = await classifyModule(module);
      setClassified(prev => ({ ...prev, [module]: res.data.data }));
    } catch (e) {
      setError(e.response?.data?.message || `Classification failed for module "${module}". Please try again.`);
    } finally {
      setAnalyzing(prev => ({ ...prev, [module]: false }));
    }
  }, [canSeeSecurityClassify]);

  const handleExport = async () => {
    const dept = DEPARTMENTS.find(d => d.id === activeTab);
    if (!dept) return;
    setExporting(true); setError('');
    try {
      const res = await getDeptStats(dept.id);
      exportToExcel(dept, res.data.data?._error ? null : res.data.data, classified, user);
    } catch {
      setError('Export failed. Verify the server is reachable.');
    } finally { setExporting(false); }
  };

  const activeDept        = DEPARTMENTS.find(d => d.id === activeTab);
  const classModule       = activeDept ? CLASSIFIABLE_MODULES[activeDept.id] : null;
  const canClassifyActive = isExec && !!classModule && (classModule !== 'security' || canSeeSecurityClassify);

  if (!visibleDepts.length) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: '0.5rem', textAlign: 'center' }}>
        <Lock size={32} color={T.textMuted} />
        <p style={{ fontWeight: 600, color: T.text, margin: '8px 0 0' }}>Access Restricted</p>
        <p style={{ fontSize: '0.84rem', color: T.textSub, margin: 0 }}>Your role does not have permission to view this module.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', paddingBottom: '1rem', borderBottom: `1px solid ${T.borderLight}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Brain size={20} color={T.accent} />
          <div>
            <h1 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700, color: T.text, letterSpacing: '-0.2px' }}>Lumina Intelligence</h1>
            <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: T.textMuted }}>Department analytics &nbsp;&middot;&nbsp; {fmtDate()}</p>
          </div>
        </div>
        <button
          id="lumina-export-btn"
          onClick={handleExport}
          disabled={exporting}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '0.45rem 0.9rem', background: T.bg,
            color: exporting ? T.textMuted : T.text,
            border: `1px solid ${T.border}`, borderRadius: '5px',
            fontWeight: 500, fontSize: '0.82rem', cursor: exporting ? 'not-allowed' : 'pointer',
          }}
        >
          {exporting ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={13} />}
          Export to Excel
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div style={{ padding: '0.75rem 1rem', background: T.bgSubtle, border: `1px solid ${T.border}`, borderRadius: '5px', display: 'flex', alignItems: 'center', gap: '8px', color: T.text, fontSize: '0.84rem' }}>
          <AlertTriangle size={14} color={T.accent} />
          <span style={{ flex: 1 }}>{error}</span>
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.textMuted, fontSize: '1.1rem', lineHeight: 1 }}>&#x2715;</button>
        </div>
      )}

      {/* Incident Analysis (line managers) */}
      {LINE_MANAGER_ROLES.includes(role) && <IncidentAnalysisPanel />}

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: '0', flexWrap: 'wrap', borderBottom: `1px solid ${T.border}` }}>
        {visibleDepts.map(dept => {
          const active = activeTab === dept.id;
          return (
            <button
              key={dept.id}
              id={`dept-tab-${dept.id}`}
              onClick={() => { setActiveTab(dept.id); setError(''); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '0.5rem 1rem', background: 'none', border: 'none',
                borderBottom: active ? `2px solid ${T.accent}` : '2px solid transparent',
                fontWeight: active ? 600 : 400, fontSize: '0.83rem',
                color: active ? T.accent : T.textSub,
                cursor: 'pointer', transition: 'color 0.15s', marginBottom: '-1px',
              }}
            >
              {dept.icon}
              {dept.label}
            </button>
          );
        })}
      </div>

      {/* Active department card */}
      {activeDept && (
        <div style={S.card}>
          <div style={{ padding: '0.85rem 1.25rem', borderBottom: `1px solid ${T.borderLight}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <p style={{ margin: 0, fontWeight: 600, fontSize: '0.88rem', color: T.text }}>{activeDept.label}</p>
              <p style={{ margin: '1px 0 0', fontSize: '0.76rem', color: T.textMuted }}>{activeDept.description}</p>
            </div>
            <span style={{ fontSize: '0.72rem', color: T.textMuted, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Eye size={11} /> Live data
            </span>
          </div>
          <div style={{ padding: '1.25rem' }}>
            <DeptPanel
              key={activeDept.id}
              dept={activeDept}
              globalStats={globalStats}
              canClassify={canClassifyActive}
              onClassify={handleClassify}
              classifying={!!analyzing[classModule]}
              classified={classified}
            />
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center', padding: '0.6rem 0', borderTop: `1px solid ${T.borderLight}` }}>
        <span style={S.sectionHd}>Status key:</span>
        {['Approved / Completed', 'Pending / Open', 'Verified / Reviewed', 'Rejected'].map(k => (
          <span key={k} style={{ fontSize: '0.78rem', color: T.textSub }}>{k}</span>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: T.textMuted }}>
          Lumina Intelligence &nbsp;&middot;&nbsp; Legacy Clinics
        </span>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default LuminaIntelligence;
