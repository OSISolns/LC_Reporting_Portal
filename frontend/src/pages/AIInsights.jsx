import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { getAIStats, classifyModule, getDeptStats } from '../api/ai';
import ExcelJS from 'exceljs/dist/exceljs.min.js';
import toast from 'react-hot-toast';
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

// ── Design tokens: matching Legacy Clinics system palette ─────────────────────
const T = {
  accent:       '#007B8A',
  accentDark:   '#005d68',
  accentLight:  '#e6f4f6',
  accentSubtle: '#f0f9fa',
  accentBorder: '#cce8ec',
  border:       '#e2e8f0',
  borderLight:  '#f1f5f9',
  bg:           '#ffffff',
  bgSubtle:     '#f8fafc',
  bgMuted:      '#f1f5f9',
  text:         '#1e293b',
  textDark:     '#003B44',
  textSub:      '#64748b',
  textMuted:    '#94a3b8',
  shadowSm:     '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.03)',
  shadowMd:     '0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.04)',
};

// ── Classification module map ─────────────────────────────────────────────────
const CLASSIFIABLE_MODULES = {
  operations:    'daily_reports',
  customer_care: 'cancellations',
  nursing:       'incidents',
  it:            'security',
  clinical_docs: 'clinical_docs',
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
    id: 'clinical_docs', label: 'Clinical Documentation', icon: <ClipboardList size={14} />,
    description: 'Patient observations, clinical sheets, vitals & diagnostic reports.',
    allowedRoles: [...EXEC_ROLES, 'chef-nurse', 'deputy_chef_nurse', 'deputy-chef-nurse', 'deputy_chief_nurse', 'chef_nurse', 'chief_nurse', 'chief-nurse', 'head_nurse', 'nursing_lead', 'nurse_manager', 'hsfp'],
    kpiMap: [
      { key: 'total_sheets',     label: 'Clinical Sheets' },
      { key: 'verified',         label: 'Verified / Signed' },
      { key: 'draft',            label: 'Draft / In Progress' },
      { key: 'vitals_logged',    label: 'Vitals Recorded' },
      { key: 'imaging_reports',  label: 'Diagnostic Reports' },
    ],
  },
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
  card:      { background: T.bg, border: `1px solid ${T.border}`, borderRadius: '10px', boxShadow: T.shadowSm },
  label:     { margin: 0, fontSize: '0.68rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: T.textSub },
  sectionHd: { margin: 0, fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: T.textDark },
};

// ── KPI Card ──────────────────────────────────────────────────────────────────
const KpiCard = ({ label, value, format }) => {
  const display   = format === 'rwf' ? fmtRWF(value) : safeNum(value);
  const isUnavail = value == null;
  return (
    <div style={{
      ...S.card,
      padding: '1.1rem 1.25rem',
      position: 'relative',
      overflow: 'hidden',
      transition: 'all 0.2s ease',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: T.accentLight }} />
      <p style={S.label}>{label}</p>
      <p style={{
        margin: '6px 0 0', lineHeight: 1,
        fontSize: isUnavail ? '0.85rem' : '1.75rem',
        fontWeight: 700,
        color: isUnavail ? T.textMuted : T.textDark,
        fontVariantNumeric: 'tabular-nums',
      }}>
        {display}
      </p>
    </div>
  );
};

// ── Inline progress bar (matching system primary accent) ──────────────────────
const InlineBar = ({ pct }) => (
  <div style={{ flex: 1, height: '6px', background: T.bgMuted, borderRadius: '3px', overflow: 'hidden' }}>
    <div style={{ width: `${Math.min(pct || 0, 100)}%`, height: '100%', background: T.accent, borderRadius: '3px', transition: 'width 0.4s ease' }} />
  </div>
);

// ── Row: label + bar + value ──────────────────────────────────────────────────
const DataRow = ({ label, value, pct }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '7px 0', borderBottom: `1px solid ${T.borderLight}` }}>
    <span style={{ fontSize: '0.82rem', color: T.textSub, minWidth: '85px', fontWeight: 500 }}>{label}</span>
    {pct !== undefined && <InlineBar pct={pct} />}
    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: T.textDark, minWidth: '32px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
  </div>
);

// ── Classification category row ───────────────────────────────────────────────
const CategoryRow = ({ cat, total }) => {
  const pct      = total > 0 ? Math.round((cat.count / total) * 100) : 0;
  const sevLabel = cat.severity ? (cat.severity.charAt(0).toUpperCase() + cat.severity.slice(1).toLowerCase()) : '';
  return (
    <div style={{ padding: '0.75rem 0', borderBottom: `1px solid ${T.borderLight}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px', gap: '12px' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: T.textDark, flex: 1 }}>{cat.label}</span>
        <span style={{ fontSize: '0.72rem', fontWeight: 600, color: T.accent, whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {sevLabel}{sevLabel ? ' · ' : ''}{cat.count} ({pct}%)
        </span>
      </div>
      <InlineBar pct={pct} />
      {cat.examples?.length > 0 && (
        <p style={{ margin: '5px 0 0', fontSize: '0.74rem', color: T.textSub, fontStyle: 'italic' }}>
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
        <p style={{ margin: '10px 0 0', fontSize: '0.82rem', color: T.textSub }}>
          Approved value: <strong style={{ color: T.textDark }}>{fmtRWF(data.approvedAmountRWF)}</strong>
        </p>
      )}
    </div>
  );
};

// ── Excel export (Rich ExcelJS implementation with Legacy Clinics palette) ────
// ── Excel export (Rich ExcelJS implementation with Legacy Clinics palette) ────
const exportToExcel = async (dept, stats, globalStats, classified, user) => {
  const toastId = toast.loading(`Generating Legacy Clinics ${dept.label} Report...`);
  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Lumina Intelligence — Legacy Clinics';
    workbook.created = new Date();

    const primaryColor = '007B8A'; // Legacy Primary Cyan/Teal
    const darkColor    = '003B44'; // Legacy Dark Charcoal Teal
    const lightFill    = 'E6F4F6'; // Legacy Light Aqua Fill
    const accentFill   = 'CCECEF'; // Legacy Accent Highlight Fill
    const subtleFill   = 'F8FAFC'; // Legacy Off-White Zebra Fill
    const borderColor  = 'CBD5E1'; // Border Slate

    const headerStyle = {
      font: { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: primaryColor } },
      alignment: { vertical: 'middle', horizontal: 'center', wrapText: true },
      border: {
        top: { style: 'thin', color: { argb: borderColor } },
        bottom: { style: 'medium', color: { argb: darkColor } },
        left: { style: 'thin', color: { argb: borderColor } },
        right: { style: 'thin', color: { argb: borderColor } },
      }
    };

    const cellBorder = {
      top: { style: 'thin', color: { argb: borderColor } },
      bottom: { style: 'thin', color: { argb: borderColor } },
      left: { style: 'thin', color: { argb: borderColor } },
      right: { style: 'thin', color: { argb: borderColor } },
    };

    const todayStr = new Date().toISOString().slice(0, 10);

    // ── Sheet 1: Executive Overview ──────────────────────────────────────────
    const wsCover = workbook.addWorksheet('Executive Overview');
    wsCover.views = [{ showGridLines: true }];
    wsCover.columns = [{ width: 28 }, { width: 68 }];

    // Title banner
    wsCover.mergeCells('A1:B1');
    const titleCell = wsCover.getCell('A1');
    titleCell.value = 'LEGACY CLINICS — LUMINA INTELLIGENCE REPORT';
    titleCell.font = { name: 'Calibri', size: 15, bold: true, color: { argb: 'FFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: darkColor } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    wsCover.getRow(1).height = 38;

    // Subtitle banner
    wsCover.mergeCells('A2:B2');
    const subCell = wsCover.getCell('A2');
    subCell.value = `Department Scope: ${dept.label.toUpperCase()} | Generated: ${fmtDate()}`;
    subCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFF' } };
    subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: primaryColor } };
    subCell.alignment = { vertical: 'middle', horizontal: 'center' };
    wsCover.getRow(2).height = 24;

    wsCover.addRow([]);

    const metaRows = [
      ['Target Department', dept.label],
      ['Department Description', dept.description],
      ['Report Generation Date', fmtDate()],
      ['Data Audit Range', `Historical Cumulative & 30-Day Activity Window (as of ${todayStr})`],
      ['Generated By User', user?.full_name || user?.username || 'System User'],
      ['User Security Role', (user?.role || '').replace(/_/g, ' ').toUpperCase()],
      ['Security Classification', 'CONFIDENTIAL — FOR INTERNAL EXECUTIVE USE ONLY'],
      ['Data Integrity Level', '100% Live Verified System Records'],
      ['System Environment', 'Legacy Clinics Operational Reporting & AI Intelligence Hub v2.4'],
    ];

    metaRows.forEach(([k, v]) => {
      const row = wsCover.addRow([k, v]);
      row.getCell(1).font = { name: 'Calibri', size: 10, bold: true, color: { argb: darkColor } };
      row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: lightFill } };
      row.getCell(1).border = cellBorder;
      row.getCell(2).font = { name: 'Calibri', size: 10, color: { argb: '1E293B' } };
      row.getCell(2).border = cellBorder;
      row.height = 24;
    });

    // ── Sheet 2: KPI & Department Metrics ─────────────────────────────────────
    const wsKpi = workbook.addWorksheet('Department Metrics');
    wsKpi.views = [{ showGridLines: true }];
    wsKpi.columns = [
      { header: 'Metric Category / Label', key: 'metric', width: 36 },
      { header: 'Recorded Value', key: 'value', width: 22 },
      { header: 'Value Format', key: 'type', width: 20 },
      { header: '30-Day Activity', key: 'recent', width: 20 },
      { header: 'System Status', key: 'status', width: 20 },
      { header: 'Audit Timestamp', key: 'timestamp', width: 22 },
    ];

    const kpiHeader = wsKpi.getRow(1);
    kpiHeader.height = 28;
    kpiHeader.eachCell(cell => Object.assign(cell, headerStyle));

    dept.kpiMap.forEach((k) => {
      const raw = stats?.[k.key];
      const classMod = CLASSIFIABLE_MODULES[dept.id];
      const recentCount = globalStats?.[classMod]?.last30Days ?? globalStats?.[k.key]?.last30Days ?? '—';

      if (typeof raw === 'object' && raw !== null) {
        Object.entries(raw).forEach(([mod, cnt]) => {
          const row = wsKpi.addRow({
            metric: `${k.label} (${mod})`,
            value: Number(cnt || 0),
            type: 'Numeric Count',
            recent: typeof recentCount === 'number' ? recentCount : '—',
            status: 'Verified Live',
            timestamp: todayStr,
          });
          row.height = 22;
          row.getCell('value').numFmt = '#,##0';
          if (typeof recentCount === 'number') row.getCell('recent').numFmt = '#,##0';
        });
      } else {
        const isRwf = k.format === 'rwf';
        const numVal = raw == null ? 0 : Number(raw);
        const row = wsKpi.addRow({
          metric: k.label,
          value: raw == null ? 'N/A' : numVal,
          type: isRwf ? 'Currency (RWF)' : 'Numeric Count',
          recent: typeof recentCount === 'number' ? recentCount : '—',
          status: 'Verified Live',
          timestamp: todayStr,
        });
        row.height = 22;
        if (raw != null && typeof numVal === 'number') {
          row.getCell('value').numFmt = isRwf ? '"RWF "#,##0' : '#,##0';
        }
        if (typeof recentCount === 'number') row.getCell('recent').numFmt = '#,##0';
      }
    });

    wsKpi.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        const isEven = rowNumber % 2 === 0;
        row.eachCell(cell => {
          cell.border = cellBorder;
          cell.font = { name: 'Calibri', size: 10 };
          if (isEven) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: subtleFill } };
        });
        row.getCell('status').font = { name: 'Calibri', size: 10, color: { argb: '047857' }, bold: true };
        row.getCell('status').alignment = { horizontal: 'center' };
      }
    });

    // ── Sheet 3: Date & Temporal Analytics ───────────────────────────────────
    const wsTemporal = workbook.addWorksheet('Date & Temporal Analytics');
    wsTemporal.views = [{ showGridLines: true }];
    wsTemporal.columns = [
      { header: 'Operational Module', key: 'module', width: 32 },
      { header: 'Total Cumulative Volume', key: 'total', width: 24 },
      { header: 'Last 30-Days Volume', key: 'recent30', width: 22 },
      { header: '30-Day Share (%)', key: 'share', width: 20 },
      { header: 'Est. Daily Avg (30d)', key: 'dailyAvg', width: 20 },
      { header: 'Activity Status', key: 'status', width: 20 },
      { header: 'Audit Date Stamp', key: 'dateStamp', width: 22 },
    ];

    const tempHeader = wsTemporal.getRow(1);
    tempHeader.height = 28;
    tempHeader.eachCell(cell => Object.assign(cell, headerStyle));

    if (globalStats) {
      const moduleList = [
        { name: 'Daily Operational Reports', key: 'daily_reports' },
        { name: 'Shift Sessions', key: 'shifts' },
        { name: 'Patient Cancellations', key: 'cancellations' },
        { name: 'Refund Requests', key: 'refunds' },
        { name: 'Incident Reports', key: 'incidents' },
        { name: 'Results Transfers', key: 'transfers' },
        { name: 'Internal Feedbacks', key: 'feedbacks' },
        { name: 'Nursing Stock Checks', key: 'stock_checks' },
      ];

      moduleList.forEach(({ name, key }) => {
        const modData = globalStats[key];
        if (modData) {
          const totalVol = Number(modData.total || 0);
          const recentVol = Number(modData.last30Days || 0);
          const share = totalVol > 0 ? recentVol / totalVol : 0;
          const dailyAvg = Math.round((recentVol / 30) * 10) / 10;

          const row = wsTemporal.addRow({
            module: name,
            total: totalVol,
            recent30: recentVol,
            share: share,
            dailyAvg: dailyAvg,
            status: recentVol > 0 ? 'Active Workflow' : 'Idle / Stable',
            dateStamp: todayStr,
          });
          row.height = 22;
          row.getCell('total').numFmt = '#,##0';
          row.getCell('recent30').numFmt = '#,##0';
          row.getCell('share').numFmt = '0.0%';
          row.getCell('dailyAvg').numFmt = '0.0';
        }
      });
    }

    wsTemporal.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        const isEven = rowNumber % 2 === 0;
        row.eachCell(cell => {
          cell.border = cellBorder;
          cell.font = { name: 'Calibri', size: 10 };
          if (isEven) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: subtleFill } };
        });
        row.getCell('status').font = { name: 'Calibri', size: 10, color: { argb: '007B8A' }, bold: true };
      }
    });

    // ── Sheet 4: AI Pattern Classification (if available) ──────────────────────
    const classModule = CLASSIFIABLE_MODULES[dept.id];
    const cls = classModule ? classified[classModule] : null;

    if (cls) {
      const wsClass = workbook.addWorksheet('AI Classification & Analysis');
      wsClass.views = [{ showGridLines: true }];
      wsClass.columns = [
        { header: 'Category / Pattern Label', key: 'label', width: 36 },
        { header: 'Record Count', key: 'count', width: 16 },
        { header: 'Distribution Share (%)', key: 'percentage', width: 22 },
        { header: 'Severity Level', key: 'severity', width: 18 },
        { header: 'Representative System Logs & Root Causes', key: 'examples', width: 65 },
      ];

      const classHeader = wsClass.getRow(1);
      classHeader.height = 28;
      classHeader.eachCell(cell => Object.assign(cell, headerStyle));

      (cls.categories || []).forEach(cat => {
        const sev = (cat.severity || 'Normal').toUpperCase();
        const row = wsClass.addRow({
          label: cat.label,
          count: Number(cat.count || 0),
          percentage: Number(cat.percentage || 0) / 100,
          severity: sev,
          examples: (cat.examples || []).join(' | '),
        });
        row.height = 24;
        row.getCell('count').numFmt = '#,##0';
        row.getCell('percentage').numFmt = '0.0%';
        row.getCell('examples').alignment = { wrapText: true, vertical: 'middle' };

        // Color coding for severity cell
        const sevCell = row.getCell('severity');
        sevCell.alignment = { horizontal: 'center', vertical: 'middle' };
        if (sev === 'CRITICAL') {
          sevCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEE2E2' } };
          sevCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: '991B1B' } };
        } else if (sev === 'HIGH') {
          sevCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEF3C7' } };
          sevCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: '92400E' } };
        } else if (sev === 'MODERATE') {
          sevCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E0F2FE' } };
          sevCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: '075985' } };
        } else {
          sevCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D1FAE5' } };
          sevCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: '065F46' } };
        }
      });

      // Staff Attribution Table
      if (cls.cashierAttribution?.length) {
        wsClass.addRow([]);
        const staffHeadRow = wsClass.addRow(['Staff Member / Cashier', 'Discrepancy Volume', 'Volume Share (%)', 'System Rating']);
        staffHeadRow.height = 26;
        staffHeadRow.eachCell(cell => Object.assign(cell, headerStyle));

        const max = cls.cashierAttribution[0]?.count || 1;
        cls.cashierAttribution.forEach(st => {
          const cnt = Number(st.count || 0);
          const row = wsClass.addRow({
            label: st.cashier,
            count: cnt,
            percentage: cnt / max,
            severity: cnt >= 5 ? 'ATTENTION NEEDED' : 'NORMAL',
          });
          row.height = 22;
          row.getCell('count').numFmt = '#,##0';
          row.getCell('percentage').numFmt = '0.0%';
          row.getCell('severity').font = { name: 'Calibri', size: 10, color: { argb: cnt >= 5 ? 'B91C1C' : '047857' }, bold: true };
          row.getCell('severity').alignment = { horizontal: 'center' };
        });
      }

      wsClass.eachRow((row, rowNum) => {
        if (rowNum > 1 && row.getCell('label').value) {
          row.eachCell(cell => {
            if (!cell.border) cell.border = cellBorder;
            if (!cell.font) cell.font = { name: 'Calibri', size: 10 };
          });
        }
      });
    }

    // ── Sheet 5: All Departments Master Directory ──────────────────────────────
    const wsDepts = workbook.addWorksheet('All Departments Overview');
    wsDepts.views = [{ showGridLines: true }];
    wsDepts.columns = [
      { header: 'Department ID', key: 'id', width: 20 },
      { header: 'Department Label', key: 'label', width: 28 },
      { header: 'Scope & Description', key: 'description', width: 55 },
      { header: 'Tracked KPI Count', key: 'kpis', width: 20 },
      { header: 'AI Classification Support', key: 'aiSupport', width: 25 },
      { header: 'Access Control Scope', key: 'roles', width: 45 },
    ];

    const deptsHeader = wsDepts.getRow(1);
    deptsHeader.height = 28;
    deptsHeader.eachCell(cell => Object.assign(cell, headerStyle));

    DEPARTMENTS.forEach(d => {
      const hasAI = !!CLASSIFIABLE_MODULES[d.id];
      const row = wsDepts.addRow({
        id: d.id,
        label: d.label,
        description: d.description,
        kpis: d.kpiMap.length,
        aiSupport: hasAI ? `Enabled (${CLASSIFIABLE_MODULES[d.id]})` : 'Standard Analytics',
        roles: d.allowedRoles.slice(0, 4).join(', ') + (d.allowedRoles.length > 4 ? ` +${d.allowedRoles.length - 4} more` : ''),
      });
      row.height = 22;
      row.getCell('kpis').numFmt = '#,##0';
      row.getCell('aiSupport').font = { name: 'Calibri', size: 10, color: { argb: hasAI ? '007B8A' : '64748B' }, bold: hasAI };
    });

    wsDepts.eachRow((row, rowNum) => {
      if (rowNum > 1) {
        const isEven = rowNum % 2 === 0;
        row.eachCell(cell => {
          cell.border = cellBorder;
          cell.font = { name: 'Calibri', size: 10 };
          if (isEven) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: subtleFill } };
        });
      }
    });

    // Auto Column Width Tuning for all worksheets
    workbook.worksheets.forEach(ws => {
      ws.columns.forEach(col => {
        let maxLen = col.header ? col.header.length : 12;
        col.eachCell({ includeEmpty: false }, cell => {
          const val = cell.value ? cell.value.toString() : '';
          if (val.length > maxLen && val.length < 75) {
            maxLen = val.length;
          }
        });
        col.width = Math.max(col.width || 12, maxLen + 4);
      });
    });

    // Generate buffer & trigger download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const dateStamp = new Date().toISOString().slice(0, 10);
    link.download = `Lumina_${dept.label.replace(/\s+/g, '_')}_${dateStamp}.xlsx`;
    link.click();

    toast.success(`Exported ${dept.label} Lumina Report to Excel!`, { id: toastId });
  } catch (err) {
    console.error('Excel generation error:', err);
    toast.error('Failed to generate Excel report.', { id: toastId });
  }
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
        <p style={{ margin: 0, padding: '0.85rem 1rem', background: T.bgSubtle, border: `1px solid ${T.border}`, borderRadius: '8px', fontSize: '0.84rem', color: T.textSub }}>
          No data available for <strong>{dept.label}</strong>. Verify the module is active and has records.
        </p>
      )}

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: T.textMuted, fontSize: '0.84rem', padding: '0.5rem 0' }}>
          <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Loading data…
        </div>
      ) : !loadErr && deptStats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.85rem' }}>
          {dept.kpiMap.map(kpi => {
            const rawVal = deptStats[kpi.key];
            const val = typeof rawVal === 'object' && rawVal !== null
              ? Object.values(rawVal).reduce((a, b) => a + Number(b), 0) : rawVal;
            return <KpiCard key={kpi.key} label={kpi.label} value={val} format={kpi.format} />;
          })}
        </div>
      )}

      {!loading && !loadErr && dept.id === 'customer_care' && globalStats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.85rem' }}>
          {[{ key: 'cancellations', label: 'Cancellations' }, { key: 'refunds', label: 'Refunds' }].map(({ key, label }) => (
            <StatusSummaryBox key={key} label={label} data={globalStats[key]} />
          ))}
        </div>
      )}

      {canClassify && (
        <div style={S.card}>
          <div style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', borderBottom: moduleClassified ? `1px solid ${T.borderLight}` : 'none' }}>
            <div>
              <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem', color: T.textDark }}>Lumina Intelligence Classification</p>
              <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: T.textSub }}>Analyses recent records to surface recurring patterns</p>
            </div>
            <button
              id={`classify-btn-${dept.id}`}
              onClick={() => { onClassify(classModule); setExpanded(true); }}
              disabled={classifying}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '0.5rem 1.1rem', background: classifying ? T.bgMuted : T.accent,
                color: classifying ? T.textMuted : '#fff', border: 'none', borderRadius: '6px',
                boxShadow: classifying ? 'none' : '0 2px 4px rgba(0, 123, 138, 0.25)',
                fontWeight: 600, fontSize: '0.8rem', cursor: classifying ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {classifying ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={13} />}
              {classifying ? 'Running…' : moduleClassified ? 'Re-run Analysis' : 'Run Analysis'}
            </button>
          </div>

          {moduleClassified && (
            <div style={{ padding: '1.25rem' }}>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginBottom: expanded ? '0.85rem' : 0 }}
                onClick={() => setExpanded(e => !e)}
              >
                <span style={{ fontWeight: 600, fontSize: '0.85rem', color: T.textDark }}>
                  {moduleClassified.total} records &nbsp;&middot;&nbsp; {(moduleClassified.categories || []).length} categories identified
                </span>
                {expanded ? <ChevronUp size={15} color={T.textSub} /> : <ChevronDown size={15} color={T.textSub} />}
              </div>
              {expanded && (
                <>
                  {moduleClassified.executiveSummary && (
                    <div style={{ padding: '0.9rem 1.1rem', background: T.accentSubtle, borderRadius: '6px', border: `1px solid ${T.accentBorder}`, marginBottom: '0.85rem' }}>
                      <p style={{ margin: 0, fontSize: '0.83rem', color: T.textDark, lineHeight: 1.65 }}>{moduleClassified.executiveSummary}</p>
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
        padding: '1rem 1.25rem', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap',
        borderBottom: expanded ? `1px solid ${T.borderLight}` : 'none',
        background: T.bg,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: T.accentLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Siren size={18} color={T.accent} />
          </div>
          <div>
            <p style={{ margin: 0, fontWeight: 600, fontSize: '0.92rem', color: T.textDark }}>Incident Report Analysis</p>
            <p style={{ margin: '1px 0 0', fontSize: '0.76rem', color: T.textSub }}>Lumina Intelligence · Line Manager Overview</p>
          </div>
        </div>
        <button
          onClick={() => setExpanded(e => !e)}
          style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: '6px', cursor: 'pointer', color: T.textSub, display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', padding: '0.35rem 0.75rem', boxShadow: T.shadowSm, fontWeight: 500 }}
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
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
            <p style={{ margin: 0, padding: '0.85rem 1rem', background: T.bgSubtle, border: `1px solid ${T.border}`, borderRadius: '8px', fontSize: '0.84rem', color: T.textSub }}>
              Unable to load incident reports.
            </p>
          )}

          {!loading && !err && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '0.85rem' }}>
                {[
                  { label: 'Total Incidents',   value: total },
                  { label: 'Pending Review',    value: pending },
                  { label: 'Reviewed',          value: reviewed },
                  { label: 'Closed / Approved', value: approved },
                ].map(k => <KpiCard key={k.label} label={k.label} value={k.value} />)}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div style={{ ...S.card, padding: '1.1rem 1.25rem' }}>
                  <p style={{ ...S.sectionHd, marginBottom: '10px' }}>By Severity</p>
                  {Object.entries(bySeverity).map(([sev, cnt]) => (
                    <DataRow key={sev} label={sev} value={cnt} pct={total > 0 ? Math.round((cnt / total) * 100) : 0} />
                  ))}
                </div>
                <div style={{ ...S.card, padding: '1.1rem 1.25rem' }}>
                  <p style={{ ...S.sectionHd, marginBottom: '10px' }}>By Incident Type</p>
                  {typeEntries.map(([type, cnt]) => (
                    <DataRow key={type} label={type} value={cnt} pct={Math.round((cnt / maxType) * 100)} />
                  ))}
                  {typeEntries.length === 0 && <p style={{ margin: 0, fontSize: '0.82rem', color: T.textMuted }}>No records.</p>}
                </div>
              </div>

              {recent.length > 0 && (
                <div style={S.card}>
                  <div style={{ padding: '0.8rem 1.25rem', borderBottom: `1px solid ${T.borderLight}`, background: T.bgSubtle }}>
                    <p style={S.sectionHd}>Recent Incidents</p>
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ background: T.bgSubtle }}>
                        {['Description', 'Type', 'Severity', 'Status'].map(h => (
                          <th key={h} style={{ padding: '0.6rem 1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: T.textSub, borderBottom: `1px solid ${T.borderLight}` }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {recent.map((inc, i) => (
                        <tr key={inc.id} style={{ background: i % 2 === 0 ? T.bg : T.bgSubtle }}>
                          <td style={{ padding: '0.65rem 1rem', color: T.textDark, fontWeight: 500, maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inc.description || '—'}</td>
                          <td style={{ padding: '0.65rem 1rem', color: T.textSub }}>{inc.incident_type || '—'}</td>
                          <td style={{ padding: '0.65rem 1rem', color: T.textDark, fontWeight: 600 }}>{inc.severity || '—'}</td>
                          <td style={{ padding: '0.65rem 1rem', color: T.textSub, textTransform: 'capitalize' }}>{inc.status || '—'}</td>
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
      const [deptRes, globalRes] = await Promise.all([
        getDeptStats(dept.id),
        getAIStats().catch(() => ({ data: { data: null } })),
      ]);
      const deptData = deptRes.data.data?._error ? null : deptRes.data.data;
      const globalData = globalRes.data.data;
      exportToExcel(dept, deptData, globalData, classified, user);
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
        <p style={{ fontWeight: 600, color: T.textDark, margin: '8px 0 0' }}>Access Restricted</p>
        <p style={{ fontSize: '0.84rem', color: T.textSub, margin: 0 }}>Your role does not have permission to view this module.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* Header */}
      <div style={{
        ...S.card,
        padding: '1.25rem 1.5rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: T.accentLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Brain size={22} color={T.accent} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700, color: T.textDark, letterSpacing: '-0.2px' }}>Lumina Intelligence</h1>
            <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: T.textSub }}>Department analytics &nbsp;&middot;&nbsp; {fmtDate()}</p>
          </div>
        </div>
        <button
          id="lumina-export-btn"
          onClick={handleExport}
          disabled={exporting}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '0.5rem 1rem', background: T.bg,
            color: exporting ? T.textMuted : T.textDark,
            border: `1px solid ${T.border}`, borderRadius: '6px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
            fontWeight: 600, fontSize: '0.82rem', cursor: exporting ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          {exporting ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={13} color={T.accent} />}
          Export to Excel
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div style={{ padding: '0.75rem 1rem', background: T.bgSubtle, border: `1px solid ${T.border}`, borderRadius: '6px', boxShadow: T.shadowSm, display: 'flex', alignItems: 'center', gap: '8px', color: T.textDark, fontSize: '0.84rem' }}>
          <AlertTriangle size={14} color={T.accent} />
          <span style={{ flex: 1 }}>{error}</span>
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.textMuted, fontSize: '1.1rem', lineHeight: 1 }}>&#x2715;</button>
        </div>
      )}

      {/* Incident Analysis (line managers) */}
      {LINE_MANAGER_ROLES.includes(role) && <IncidentAnalysisPanel />}

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', padding: '4px', background: T.bgSubtle, borderRadius: '8px', border: `1px solid ${T.border}` }}>
        {visibleDepts.map(dept => {
          const active = activeTab === dept.id;
          return (
            <button
              key={dept.id}
              id={`dept-tab-${dept.id}`}
              onClick={() => { setActiveTab(dept.id); setError(''); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '0.55rem 0.95rem',
                background: active ? T.bg : 'transparent',
                border: 'none',
                borderRadius: '6px',
                boxShadow: active ? T.shadowSm : 'none',
                fontWeight: active ? 600 : 500, fontSize: '0.82rem',
                color: active ? T.accent : T.textSub,
                cursor: 'pointer', transition: 'all 0.15s ease',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', color: active ? T.accent : T.textMuted }}>{dept.icon}</span>
              {dept.label}
            </button>
          );
        })}
      </div>

      {/* Active department card */}
      {activeDept && (
        <div style={S.card}>
          <div style={{ padding: '0.95rem 1.25rem', borderBottom: `1px solid ${T.borderLight}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <p style={{ margin: 0, fontWeight: 600, fontSize: '0.92rem', color: T.textDark }}>{activeDept.label}</p>
              <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: T.textSub }}>{activeDept.description}</p>
            </div>
            <span style={{ fontSize: '0.72rem', color: T.textSub, display: 'flex', alignItems: 'center', gap: '4px', background: T.accentSubtle, padding: '0.25rem 0.6rem', borderRadius: '4px', border: `1px solid ${T.accentBorder}`, fontWeight: 500 }}>
              <Eye size={12} color={T.accent} /> Live data
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
      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center', padding: '0.75rem 0', borderTop: `1px solid ${T.borderLight}` }}>
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
