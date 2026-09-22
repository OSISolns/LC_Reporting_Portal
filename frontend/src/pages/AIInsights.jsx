import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAIStats, classifyModule, getDeptStats } from '../api/ai';
import * as XLSX from 'xlsx';
import {
  Brain, TrendingUp, FileText, ReceiptText, AlertTriangle,
  CheckCircle, Clock, XCircle, Sparkles, RefreshCw,
  BarChart2, ShieldAlert, Lightbulb, ChevronDown, ChevronUp,
  MessageSquare, Package, ClipboardList,
  FlaskConical, Scan, Truck, Activity,
  Building2, Monitor, HeartPulse, Users, ShoppingCart,
  Star, Zap, Eye, Lock, Download,
} from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtRWF = (n) => `RWF ${Number(n || 0).toLocaleString()}`;
const fmtDate = () => new Date().toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short' });
const safeNum = (v) => (v == null || v === '' ? '—' : Number(v).toLocaleString());

const SEVERITY_COLOR = {
  high:   { bg: '#fef2f2', text: '#b91c1c', border: '#fecaca' },
  medium: { bg: '#fffbeb', text: '#92400e', border: '#fde68a' },
  low:    { bg: '#f0fdf4', text: '#166534', border: '#bbf7d0' },
};

// ── AI classification → which backend module to call per dept ─────────────────
const CLASSIFIABLE_MODULES = {
  operations:    'daily_reports',
  customer_care: 'cancellations',
  nursing:       'incidents',
  it:            'security',
};

// ── Brand palette ─────────────────────────────────────────────────────────────
const L = {
  grad:  'linear-gradient(135deg, #1C3A5E 0%, #1C69A0 100%)',
  accent:'#1C69A0',
  light: 'rgba(28,105,160,0.07)',
};

// ── RBAC: exact roles per department ─────────────────────────────────────────
// Executive set (sees all tabs + Executive Summary)
const EXEC_ROLES = [
  'admin', 'chairman', 'coo', 'deputy_coo', 'medical_director', 'pa',
  'sales_manager', 'consultant', 'quality_accreditation_officer',
  'quality_manager', 'qm',
];
// Roles that see the Security tab inside IT (admin only)
const SECURITY_ROLES = ['admin'];

const DEPARTMENTS = [
  {
    id: 'operations', label: 'Operations', icon: <Building2 size={16} />, color: '#1C69A0',
    description: 'Daily operational reports, shift management & performance.',
    allowedRoles: [
      ...EXEC_ROLES, 'hsfp',
    ],
    kpiMap: [
      { key: 'daily_reports',  label: 'Daily Reports Submitted', color: '#1C69A0', icon: <ClipboardList size={15} /> },
      { key: 'shifts_total',   label: 'Total Shifts',            color: '#059669', icon: <Clock size={15} /> },
      { key: 'shifts_open',    label: 'Open / Live Shifts',      color: '#f59e0b', icon: <Activity size={15} /> },
      { key: 'shifts_closed',  label: 'Closed Shifts',           color: '#22c55e', icon: <CheckCircle size={15} /> },
      { key: 'shifts_flagged', label: 'Flagged Shifts',          color: '#dc2626', icon: <AlertTriangle size={15} /> },
    ],
  },
  {
    id: 'it', label: 'IT', icon: <Monitor size={16} />, color: '#6366f1',
    description: 'IT support tickets, asset lifecycle & system security events.',
    allowedRoles: [...EXEC_ROLES, 'it_officer'],
    kpiMap: [
      { key: 'total',    label: 'Total Tickets',      color: '#6366f1', icon: <FileText size={15} /> },
      { key: 'open',     label: 'Open / In Progress', color: '#f59e0b', icon: <Clock size={15} /> },
      { key: 'resolved', label: 'Resolved',           color: '#22c55e', icon: <CheckCircle size={15} /> },
      { key: 'critical', label: 'Critical Priority',  color: '#dc2626', icon: <AlertTriangle size={15} /> },
      { key: 'high',     label: 'High Priority',      color: '#ea580c', icon: <AlertTriangle size={15} /> },
    ],
  },
  {
    id: 'dental', label: 'Dental', icon: <Star size={16} />, color: '#0891b2',
    description: 'Dental cases by status, procedure types & consumables.',
    allowedRoles: [...EXEC_ROLES, 'dental_hod', 'dental_lab_manager'],
    kpiMap: [
      { key: 'total',       label: 'Total Cases',      color: '#0891b2', icon: <FileText size={15} /> },
      { key: 'active',      label: 'Active Cases',     color: '#f59e0b', icon: <Activity size={15} /> },
      { key: 'completed',   label: 'Completed Cases',  color: '#22c55e', icon: <CheckCircle size={15} /> },
      { key: 'pending',     label: 'Pending Cases',    color: '#94a3b8', icon: <Clock size={15} /> },
      { key: 'consumables', label: 'Consumable Entries', color: '#ea580c', icon: <Package size={15} /> },
    ],
  },
  {
    id: 'nursing', label: 'Nursing', icon: <HeartPulse size={16} />, color: '#e11d48',
    description: 'Clinical sheets, ward reports, stock levels & incident tracking.',
    allowedRoles: [...EXEC_ROLES, 'chef-nurse', 'hsfp'],
    kpiMap: [
      { key: 'clinical_sheets', label: 'Clinical Sheets',    color: '#e11d48', icon: <FileText size={15} /> },
      { key: 'daily_reports',   label: 'Daily Ward Reports', color: '#1C69A0', icon: <ClipboardList size={15} /> },
      { key: 'stock_ok',        label: 'Stock OK',           color: '#22c55e', icon: <CheckCircle size={15} /> },
      { key: 'stock_low',       label: 'Low Stock Items',    color: '#f59e0b', icon: <Package size={15} /> },
      { key: 'stock_critical',  label: 'Critical Stock',     color: '#dc2626', icon: <AlertTriangle size={15} /> },
      { key: 'incidents',       label: 'Incidents Reported', color: '#9333ea', icon: <ShieldAlert size={15} /> },
    ],
  },
  {
    id: 'laboratory', label: 'Laboratory', icon: <FlaskConical size={16} />, color: '#7c3aed',
    description: 'Lab sessions, NCR management, analyzer status & quality metrics.',
    allowedRoles: [...EXEC_ROLES, 'lab_manager', 'lab_team_lead', 'lab_lead', 'hsfp'],
    kpiMap: [
      { key: 'sessions',   label: 'Lab Sessions',  color: '#7c3aed', icon: <FlaskConical size={15} /> },
      { key: 'ncrs_total', label: 'Total NCRs',    color: '#dc2626', icon: <FileText size={15} /> },
      { key: 'ncrs_open',  label: 'Open NCRs',     color: '#f59e0b', icon: <AlertTriangle size={15} /> },
      { key: 'ncrs_closed',label: 'Closed NCRs',   color: '#22c55e', icon: <CheckCircle size={15} /> },
      { key: 'analyzers',  label: 'Analyzers on Record', color: '#059669', icon: <Activity size={15} /> },
    ],
  },
  {
    id: 'imaging', label: 'Imaging', icon: <Scan size={16} />, color: '#0369a1',
    description: 'Radiology & imaging study volumes by modality.',
    allowedRoles: [...EXEC_ROLES, 'imaging_manager'],
    kpiMap: [
      { key: 'total', label: 'Total Imaging Studies', color: '#0369a1', icon: <Scan size={15} /> },
    ],
  },
  {
    id: 'stock', label: 'Stock', icon: <Package size={16} />, color: '#ea580c',
    description: 'Central store stock levels, replenishment alerts & consumables log.',
    allowedRoles: [...EXEC_ROLES, 'chef-nurse', 'stock-manager'],
    kpiMap: [
      { key: 'total',              label: 'Total Stock Records',  color: '#ea580c', icon: <Package size={15} /> },
      { key: 'ok',                 label: 'Adequate Stock',       color: '#22c55e', icon: <CheckCircle size={15} /> },
      { key: 'low',                label: 'Low Stock Items',      color: '#f59e0b', icon: <AlertTriangle size={15} /> },
      { key: 'critical',           label: 'Critical Depletion',   color: '#dc2626', icon: <XCircle size={15} /> },
      { key: 'consumables_logged', label: 'Consumables Logged',   color: '#0891b2', icon: <ClipboardList size={15} /> },
    ],
  },
  {
    id: 'procurement', label: 'Procurement', icon: <ShoppingCart size={16} />, color: '#0f766e',
    description: 'Purchase requests, approval pipeline & supplier performance.',
    allowedRoles: [...EXEC_ROLES, 'procurement-manager'],
    kpiMap: [
      { key: 'total',    label: 'Total Purchase Requests', color: '#0f766e', icon: <FileText size={15} /> },
      { key: 'pending',  label: 'Awaiting Approval',       color: '#f59e0b', icon: <Clock size={15} /> },
      { key: 'approved', label: 'Approved',                color: '#22c55e', icon: <CheckCircle size={15} /> },
      { key: 'rejected', label: 'Rejected',                color: '#dc2626', icon: <XCircle size={15} /> },
    ],
  },
  {
    id: 'logistics', label: 'Logistics', icon: <Truck size={16} />, color: '#92400e',
    description: 'Fleet & transport requests — pending, in-transit & completed.',
    allowedRoles: [...EXEC_ROLES, 'logistics_manager', 'logistics_officer'],
    kpiMap: [
      { key: 'total',      label: 'Total Requests', color: '#92400e', icon: <FileText size={15} /> },
      { key: 'pending',    label: 'Pending Dispatch',color: '#f59e0b', icon: <Clock size={15} /> },
      { key: 'in_transit', label: 'In Transit',     color: '#1C69A0', icon: <Truck size={15} /> },
      { key: 'completed',  label: 'Completed',      color: '#22c55e', icon: <CheckCircle size={15} /> },
    ],
  },
  {
    id: 'physio', label: 'Physio', icon: <Activity size={16} />, color: '#0d9488',
    description: 'Physiotherapy session outcomes & patient treatment continuity.',
    allowedRoles: [...EXEC_ROLES, 'physio_manager'],
    kpiMap: [
      { key: 'total',        label: 'Total Sessions',  color: '#0d9488', icon: <FileText size={15} /> },
      { key: 'completed',    label: 'Completed',       color: '#22c55e', icon: <CheckCircle size={15} /> },
      { key: 'ongoing',      label: 'Ongoing',         color: '#f59e0b', icon: <Activity size={15} /> },
      { key: 'discontinued', label: 'Discontinued',    color: '#dc2626', icon: <XCircle size={15} /> },
    ],
  },
  {
    id: 'customer_care', label: 'Customer Care', icon: <Users size={16} />, color: '#9333ea',
    description: 'Cancellations, refunds, financial exposure & patient feedback.',
    allowedRoles: [
      'admin', 'chairman', 'coo', 'deputy_coo', 'sales_manager',
      'principal_cashier', 'consultant', 'quality_accreditation_officer',
    ],
    kpiMap: [
      { key: 'cancellations_total',   label: 'Total Cancellations',     color: '#9333ea', icon: <FileText size={15} /> },
      { key: 'cancellations_approved',label: 'Approved Cancellations',  color: '#22c55e', icon: <CheckCircle size={15} /> },
      { key: 'cancellations_pending', label: 'Pending Cancellations',   color: '#f59e0b', icon: <Clock size={15} /> },
      { key: 'cancellations_value',   label: 'Approved Cancellation Value', color: '#059669', icon: <TrendingUp size={15} />, format: 'rwf' },
      { key: 'refunds_total',         label: 'Total Refunds',           color: '#dc2626', icon: <ReceiptText size={15} /> },
      { key: 'refunds_approved',      label: 'Approved Refunds',        color: '#22c55e', icon: <CheckCircle size={15} /> },
      { key: 'refunds_pending',       label: 'Pending Refunds',         color: '#f59e0b', icon: <Clock size={15} /> },
      { key: 'refunds_value',         label: 'Approved Refund Value',   color: '#9333ea', icon: <TrendingUp size={15} />, format: 'rwf' },
      { key: 'feedbacks',             label: 'Feedback Records',        color: '#ec4899', icon: <MessageSquare size={15} /> },
    ],
  },
];

// ── KPI Card ──────────────────────────────────────────────────────────────────
const KpiCard = ({ label, value, icon, color, format }) => {
  const display = format === 'rwf' ? fmtRWF(value) : safeNum(value);
  const isUnavail = value == null;
  return (
    <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1rem 1.2rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: `${color}15`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', marginBottom: '2px' }}>{label}</p>
        <p style={{ margin: 0, fontSize: isUnavail ? '0.82rem' : '1.5rem', fontWeight: 800, color: isUnavail ? '#94a3b8' : '#1e293b', lineHeight: 1.1 }}>{display}</p>
      </div>
    </div>
  );
};

// ── Status badge ──────────────────────────────────────────────────────────────
const Pill = ({ label, value, color }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.55rem 0.9rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0 }} />
    <span style={{ fontSize: '0.8rem', color: '#475569', flex: 1 }}>{label}</span>
    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>{safeNum(value)}</span>
  </div>
);

// ── Mini progress bar ─────────────────────────────────────────────────────────
const Bar = ({ pct: p, color }) => (
  <div style={{ flex: 1, height: '7px', background: '#f1f5f9', borderRadius: '99px', overflow: 'hidden' }}>
    <div style={{ width: `${Math.min(p, 100)}%`, height: '100%', background: color, borderRadius: '99px', transition: 'width 0.6s ease' }} />
  </div>
);

// ── Classification result card ────────────────────────────────────────────────
const CategoryCard = ({ cat, color }) => {
  const sc = SEVERITY_COLOR[cat.severity] || SEVERITY_COLOR.low;
  return (
    <div style={{ padding: '0.9rem 1rem', background: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
        <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#1e293b' }}>{cat.label}</span>
        <span style={{ padding: '2px 9px', borderRadius: '99px', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, whiteSpace: 'nowrap' }}>{cat.severity}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Bar pct={cat.percentage} color={color} />
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap' }}>{cat.count} <span style={{ fontWeight: 400, color: '#94a3b8' }}>({cat.percentage}%)</span></span>
      </div>
      {cat.examples?.length > 0 && (
        <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '1px' }}>
          {cat.examples.map((ex, i) => (
            <p key={i} style={{ margin: 0, fontSize: '0.73rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontStyle: 'italic' }}>"{ex}"</p>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Staff breakdown table ─────────────────────────────────────────────────────
const StaffBreakdownTable = ({ rows = [], color }) => {
  if (!rows.length) return null;
  const max = rows[0]?.count || 1;
  return (
    <div style={{ marginTop: '1rem' }}>
      <p style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', margin: '0 0 8px' }}>Staff Breakdown</p>
      <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px', padding: '6px 12px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.05em' }}>
          <span>Name</span><span style={{ textAlign: 'right' }}>Count</span>
        </div>
        {rows.map((row, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 60px', padding: '8px 12px', alignItems: 'center', gap: '8px', borderBottom: i < rows.length - 1 ? '1px solid #f1f5f9' : 'none', background: '#fff' }}>
            <div>
              <p style={{ margin: '0 0 3px', fontWeight: 600, fontSize: '0.8rem', color: '#1e293b' }}>{row.cashier}</p>
              <div style={{ height: '4px', background: '#f1f5f9', borderRadius: '99px', overflow: 'hidden' }}>
                <div style={{ width: `${Math.round((row.count / max) * 100)}%`, height: '100%', background: color, borderRadius: '99px' }} />
              </div>
            </div>
            <span style={{ textAlign: 'right', fontWeight: 700, fontSize: '0.88rem', color }}>{row.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Donut chart ───────────────────────────────────────────────────────────────
const Donut = ({ approved = 0, pending = 0, rejected = 0, verified = 0, reviewed = 0, total = 0 }) => {
  const r = 52, cx = 60, cy = 60, circ = 2 * Math.PI * r;
  const segs = [
    { val: approved, color: '#22c55e' },
    { val: verified + reviewed, color: '#3b82f6' },
    { val: pending, color: '#f59e0b' },
    { val: rejected, color: '#ef4444' },
  ].filter(s => s.val > 0);
  let off = 0;
  return (
    <svg width="120" height="120" viewBox="0 0 120 120">
      {total === 0
        ? <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e2e8f0" strokeWidth="15" />
        : segs.map((s, i) => {
            const dash = (s.val / total) * circ;
            const arc = { dash, gap: circ - dash, offset: off, color: s.color };
            off += dash;
            return <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={arc.color} strokeWidth="15"
              strokeDasharray={`${arc.dash} ${arc.gap}`} strokeDashoffset={-arc.offset}
              style={{ transform: 'rotate(-90deg)', transformOrigin: '60px 60px' }} />;
          })}
      <text x={cx} y={cy - 5} textAnchor="middle" fontSize="18" fontWeight="800" fill="#1e293b">{total}</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fontSize="8" fill="#94a3b8" fontWeight="600" letterSpacing="0.5">TOTAL</text>
    </svg>
  );
};

// ── Excel export ──────────────────────────────────────────────────────────────
const exportToExcel = (dept, stats, classified, user, globalStats) => {
  const wb = XLSX.utils.book_new();
  const ts = fmtDate();
  const roleName = (user?.role || '').replace(/_/g, ' ').replace(/-/g, ' ');

  // ── Sheet 1: Cover ────────────────────────────────────────────────────────
  const coverData = [
    ['LUMINA AI INSIGHT — DEPARTMENT REPORT'],
    [],
    ['Department',      dept.label],
    ['Report Date',     ts],
    ['Generated By',    user?.full_name || user?.username || 'Unknown'],
    ['Role',            roleName],
    ['Classification',  'CONFIDENTIAL — INTERNAL USE ONLY'],
    [],
    ['Scope', dept.description],
  ];
  const ws0 = XLSX.utils.aoa_to_sheet(coverData);
  ws0['!cols'] = [{ wch: 24 }, { wch: 48 }];
  // Bold the title cell
  if (ws0['A1']) ws0['A1'].s = { font: { bold: true, sz: 14 } };
  XLSX.utils.book_append_sheet(wb, ws0, 'Cover');

  // ── Sheet 2: KPI Summary ──────────────────────────────────────────────────
  const kpiRows = [['Metric', 'Value', 'Notes']];
  dept.kpiMap.forEach(k => {
    let raw = stats?.[k.key];
    if (typeof raw === 'object' && raw !== null) {
      // e.g. imaging modalities object — flatten
      Object.entries(raw).forEach(([mod, cnt]) => kpiRows.push([`${k.label} — ${mod}`, cnt, '']));
      return;
    }
    const val = raw == null ? 'N/A' : (k.format === 'rwf' ? Number(raw).toLocaleString() : Number(raw));
    kpiRows.push([k.label, val, '']);
  });
  // Customer care donut supplemental data
  if (dept.id === 'customer_care' && globalStats) {
    kpiRows.push(['', '', '']);
    kpiRows.push(['— Cancellation Status Breakdown —', '', '']);
    const c = globalStats.cancellations || {};
    if (c.approved != null) kpiRows.push(['Approved', c.approved, '']);
    if (c.pending  != null) kpiRows.push(['Pending',  c.pending,  '']);
    if (c.rejected != null) kpiRows.push(['Rejected', c.rejected, '']);
    if (c.approvedAmountRWF != null) kpiRows.push(['Approved Value (RWF)', Number(c.approvedAmountRWF).toLocaleString(), '']);
    kpiRows.push(['— Refund Status Breakdown —', '', '']);
    const r = globalStats.refunds || {};
    if (r.approved != null) kpiRows.push(['Approved', r.approved, '']);
    if (r.pending  != null) kpiRows.push(['Pending',  r.pending,  '']);
    if (r.rejected != null) kpiRows.push(['Rejected', r.rejected, '']);
    if (r.approvedAmountRWF != null) kpiRows.push(['Approved Value (RWF)', Number(r.approvedAmountRWF).toLocaleString(), '']);
  }
  const ws1 = XLSX.utils.aoa_to_sheet(kpiRows);
  ws1['!cols'] = [{ wch: 36 }, { wch: 22 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, ws1, 'KPI Summary');

  // ── Sheet 3: Classification Results (if available) ────────────────────────
  const classModule = CLASSIFIABLE_MODULES[dept.id];
  const cls = classModule ? classified[classModule] : null;
  if (cls) {
    const clsRows = [['Category', 'Count', 'Percentage (%)', 'Severity', 'Examples']];
    (cls.categories || []).forEach(cat => {
      clsRows.push([
        cat.label,
        cat.count,
        cat.percentage,
        (cat.severity || '').toUpperCase(),
        (cat.examples || []).join(' | '),
      ]);
    });
    if (cls.cashierAttribution?.length) {
      clsRows.push(['', '', '', '', '']);
      clsRows.push(['Staff', 'Count', '', '', '']);
      cls.cashierAttribution.forEach(r => clsRows.push([r.cashier, r.count, '', '', '']));
    }
    const ws2 = XLSX.utils.aoa_to_sheet(clsRows);
    ws2['!cols'] = [{ wch: 32 }, { wch: 10 }, { wch: 14 }, { wch: 12 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(wb, ws2, 'Classification');
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  const fileName = `Lumina_${dept.label.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
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
      .then(res => {
        const d = res.data.data;
        if (d?._error) { setLoadErr(true); setDeptStats(null); }
        else setDeptStats(d);
      })
      .catch(() => { setLoadErr(true); setDeptStats(null); })
      .finally(() => setLoading(false));
  }, [dept.id]);

  const classModule      = CLASSIFIABLE_MODULES[dept.id];
  const moduleClassified = classModule ? classified[classModule] : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* ── Data unavailability notice ── */}
      {!loading && loadErr && (
        <div style={{ padding: '1rem 1.25rem', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', color: '#92400e' }}>
          <AlertTriangle size={15} />
          <span>No data available for <strong>{dept.label}</strong>. Verify the department module is active and has records.</span>
        </div>
      )}

      {/* ── KPI Grid ── */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#94a3b8', fontSize: '0.85rem', padding: '0.5rem' }}>
          <RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} /> Loading data…
        </div>
      ) : !loadErr && deptStats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '0.9rem' }}>
          {dept.kpiMap.map(kpi => {
            const rawVal = deptStats[kpi.key];
            const val = typeof rawVal === 'object' && rawVal !== null
              ? Object.values(rawVal).reduce((a, b) => a + Number(b), 0)
              : rawVal;
            return (
              <KpiCard key={kpi.key} label={kpi.label} value={val} icon={kpi.icon} color={kpi.color} format={kpi.format} />
            );
          })}
        </div>
      )}

      {/* ── Customer Care: donut breakdown of global modules ── */}
      {!loading && !loadErr && dept.id === 'customer_care' && globalStats && (
        <div>
          <p style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', margin: '0 0 10px' }}>Status Breakdown</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
            {[
              { key: 'cancellations', label: 'Cancellations', color: '#9333ea' },
              { key: 'refunds',       label: 'Refunds',       color: '#dc2626' },
            ].map(({ key, label, color }) => {
              const s = globalStats[key];
              if (!s || !s.total) return null;
              return (
                <div key={key} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.1rem' }}>
                  <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: '0.85rem', color: '#1e293b' }}>{label}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <Donut {...s} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1 }}>
                      {s.approved != null && <Pill label="Approved" value={s.approved} color="#22c55e" />}
                      {s.pending  != null && <Pill label="Pending"  value={s.pending}  color="#f59e0b" />}
                      {s.rejected != null && <Pill label="Rejected" value={s.rejected} color="#ef4444" />}
                      {s.approvedAmountRWF != null && (
                        <div style={{ padding: '4px 8px', background: '#f0fdf4', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, color: '#166534' }}>
                          {fmtRWF(s.approvedAmountRWF)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── AI Reason Classification (executive only, supported depts) ── */}
      {canClassify && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '0.85rem 1.25rem', borderBottom: moduleClassified ? '1px solid #f1f5f9' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: '0.88rem', color: '#1e293b' }}>Reason Classification</p>
              <p style={{ margin: 0, fontSize: '0.73rem', color: '#94a3b8', marginTop: '1px' }}>Analyses recent records to surface recurring patterns</p>
            </div>
            <button
              id={`classify-btn-${dept.id}`}
              onClick={() => { onClassify(classModule); setExpanded(true); }}
              disabled={classifying}
              style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '0.5rem 1.1rem', background: classifying ? '#f1f5f9' : L.grad, color: classifying ? '#94a3b8' : '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '0.8rem', cursor: classifying ? 'not-allowed' : 'pointer', transition: 'opacity 0.2s' }}
            >
              {classifying ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={13} />}
              {classifying ? 'Classifying…' : moduleClassified ? 'Re-classify' : 'Run Classification'}
            </button>
          </div>

          {moduleClassified && (
            <div style={{ padding: '1.25rem' }}>
              {/* Toggle header */}
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginBottom: expanded ? '1rem' : 0 }}
                onClick={() => setExpanded(e => !e)}
              >
                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <BarChart2 size={14} style={{ color: dept.color }} />
                  {moduleClassified.total} records analysed across {(moduleClassified.categories || []).length} categories
                </span>
                {expanded ? <ChevronUp size={15} color="#94a3b8" /> : <ChevronDown size={15} color="#94a3b8" />}
              </div>

              {expanded && (
                <>
                  {moduleClassified.executiveSummary && (
                    <div style={{ padding: '0.85rem 1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '0.75rem', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                      <Lightbulb size={14} style={{ color: dept.color, marginTop: '1px', flexShrink: 0 }} />
                      <p style={{ margin: 0, fontSize: '0.82rem', color: '#475569', lineHeight: 1.65 }}>{moduleClassified.executiveSummary}</p>
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                    {(moduleClassified.categories || []).map((cat, i) => (
                      <CategoryCard key={i} cat={cat} color={dept.color} />
                    ))}
                  </div>
                  <StaffBreakdownTable rows={moduleClassified.cashierAttribution || []} color={dept.color} />
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
const AIInsights = () => {
  const { user } = useAuth();
  const role = user?.role || '';

  const [activeTab,    setActiveTab]    = useState(null);
  const [globalStats,  setGlobalStats]  = useState(null);
  const [classified,   setClassified]   = useState({});
  const [analyzing,    setAnalyzing]    = useState({});
  const [error,        setError]        = useState('');
  const [exporting,    setExporting]    = useState(false);
  const [deptStatsCache, setDeptStatsCache] = useState({});

  // Executive = sees all tabs + Executive Summary section
  const isExec = EXEC_ROLES.includes(role);
  const canSeeSecurityClassify = SECURITY_ROLES.includes(role);

  // Build visible tab list based on role
  const visibleDepts = DEPARTMENTS.filter(d => isExec || d.allowedRoles.includes(role));

  // Set first visible tab on mount
  useEffect(() => {
    if (visibleDepts.length && !activeTab) setActiveTab(visibleDepts[0].id);
  }, [visibleDepts.length]); // eslint-disable-line

  // Load global stats (for customer care donuts)
  useEffect(() => {
    getAIStats()
      .then(res => setGlobalStats(res.data.data))
      .catch(() => {});
  }, []);

  // Classification handler
  const handleClassify = useCallback(async (module) => {
    if (!module) return;
    // Block non-admin from security classify
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

  // Export handler
  const handleExport = async () => {
    const dept = DEPARTMENTS.find(d => d.id === activeTab);
    if (!dept) return;
    setExporting(true); setError('');
    try {
      const res = await getDeptStats(dept.id);
      const stats = res.data.data?._error ? null : res.data.data;
      exportToExcel(dept, stats, classified, user, globalStats);
    } catch {
      setError('Export failed. Please verify the server is reachable.');
    } finally { setExporting(false); }
  };

  const activeDept = DEPARTMENTS.find(d => d.id === activeTab);
  const classModule = activeDept ? CLASSIFIABLE_MODULES[activeDept.id] : null;
  const canClassifyActive = isExec && !!classModule && (classModule !== 'security' || canSeeSecurityClassify);

  if (!visibleDepts.length) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '55vh', gap: '0.75rem', textAlign: 'center' }}>
        <Lock size={38} style={{ color: '#cbd5e1' }} />
        <p style={{ fontWeight: 700, color: '#1e293b', margin: 0 }}>Access Restricted</p>
        <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>Your role does not have permission to access this module.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* ── Page Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ padding: '10px', borderRadius: '13px', background: L.grad, color: '#fff', boxShadow: '0 3px 12px rgba(28,105,160,0.3)', flexShrink: 0 }}>
            <Brain size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.7rem', fontWeight: 800, color: '#1e293b', margin: 0, letterSpacing: '-0.4px' }}>Lumina AI Insight</h1>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 9px', borderRadius: '99px', background: 'rgba(28,105,160,0.1)', color: L.accent, fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                <Lock size={9} /> Elevated Access
              </span>
            </div>
            <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '2px 0 0' }}>
              Department intelligence · {fmtDate()}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            id="lumina-export-btn"
            onClick={handleExport}
            disabled={exporting}
            style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '0.55rem 1.1rem', background: exporting ? '#f1f5f9' : '#fff', color: exporting ? '#94a3b8' : '#1e293b', border: '1.5px solid #e2e8f0', borderRadius: '9px', fontWeight: 600, fontSize: '0.82rem', cursor: exporting ? 'not-allowed' : 'pointer', transition: 'border-color 0.15s' }}
          >
            {exporting ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={13} />}
            Export to Excel
          </button>
        </div>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div style={{ padding: '0.8rem 1.1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '9px', display: 'flex', alignItems: 'center', gap: '9px', color: '#b91c1c', fontSize: '0.84rem' }}>
          <ShieldAlert size={15} /> <span>{error}</span>
          <button onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#b91c1c', fontSize: '1rem', lineHeight: 1 }}>×</button>
        </div>
      )}

      {/* ── Department Tab Bar ── */}
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', padding: '5px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        {visibleDepts.map(dept => {
          const active = activeTab === dept.id;
          return (
            <button
              key={dept.id}
              id={`dept-tab-${dept.id}`}
              onClick={() => { setActiveTab(dept.id); setError(''); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '0.45rem 0.95rem', borderRadius: '8px',
                border: 'none', cursor: 'pointer', fontWeight: active ? 700 : 500,
                fontSize: '0.8rem', transition: 'all 0.15s',
                background: active ? dept.color : 'transparent',
                color: active ? '#fff' : '#475569',
                boxShadow: active ? `0 2px 6px ${dept.color}40` : 'none',
              }}
            >
              {dept.icon}
              {dept.label}
            </button>
          );
        })}
      </div>

      {/* ── Active Department Panel ── */}
      {activeDept && (
        <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          {/* Panel header */}
          <div style={{ padding: '1.1rem 1.5rem', background: `linear-gradient(135deg, ${activeDept.color}10, #ffffff)`, borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ padding: '8px', borderRadius: '10px', background: `${activeDept.color}15`, color: activeDept.color }}>
                {activeDept.icon}
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>{activeDept.label}</h2>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>{activeDept.description}</p>
              </div>
            </div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 10px', background: `${activeDept.color}12`, color: activeDept.color, borderRadius: '99px', fontSize: '0.68rem', fontWeight: 700 }}>
              <Eye size={10} /> Live Data
            </span>
          </div>

          {/* Panel body */}
          <div style={{ padding: '1.5rem' }}>
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

      {/* ── Legend ── */}
      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center', padding: '0.8rem 1.25rem', background: '#fff', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
        <span style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8' }}>Status Key</span>
        {[
          { label: 'Approved / Completed', color: '#22c55e' },
          { label: 'Pending / Open',       color: '#f59e0b' },
          { label: 'Verified / Reviewed',  color: '#3b82f6' },
          { label: 'Rejected',             color: '#ef4444' },
        ].map(k => (
          <div key={k.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#64748b' }}>
            <div style={{ width: '9px', height: '9px', borderRadius: '2px', background: k.color }} />
            {k.label}
          </div>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: '#94a3b8' }}>
          Lumina AI Insight · Legacy Clinics
        </span>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default AIInsights;
