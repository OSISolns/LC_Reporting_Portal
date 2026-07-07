import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  RefreshCw, Loader2, ShoppingCart, PackageCheck, Gavel, Truck,
  ChevronRight, Building,
} from 'lucide-react';
import api from '../api/axios';
import { toast } from 'react-hot-toast';

// ── formatting ───────────────────────────────────────────────────────────────
const fmtNum = (n) => Number(n || 0).toLocaleString('en-US');
const fmtRWF = (n) => `RWF ${fmtNum(Math.round(Number(n || 0)))}`;
const compactRWF = (n) => {
  const v = Number(n || 0);
  if (v >= 1_000_000) return `RWF ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `RWF ${(v / 1_000).toFixed(0)}K`;
  return `RWF ${fmtNum(v)}`;
};
const monthLabel = (ym) => {
  try { return new Date(`${ym}-01T00:00:00`).toLocaleString('en-US', { month: 'short' }); }
  catch { return ym; }
};
const HEX = { slate: '#64748b', amber: '#d97706', indigo: '#4f46e5', teal: '#0d9488', emerald: '#059669', rose: '#e11d48' };
const STATUS_COLORS = { Draft: 'slate', Pending: 'amber', Sent: 'indigo', Approved: 'teal', Received: 'emerald', Completed: 'emerald', Rejected: 'rose', Cancelled: 'rose' };
const colorFor = (k, i = 0) => HEX[STATUS_COLORS[k]] || Object.values(HEX)[i % Object.values(HEX).length];

// ── sparkline ────────────────────────────────────────────────────────────────
function Sparkline({ points = [], color = '#0d9488', width = 96, height = 30 }) {
  const vals = points.map((p) => Number(p) || 0);
  if (vals.length < 2) return <svg width={width} height={height} />;
  const max = Math.max(...vals, 1), min = Math.min(...vals, 0), range = max - min || 1;
  const step = width / (vals.length - 1);
  const y = (v) => (height - ((v - min) / range) * height).toFixed(1);
  const d = vals.map((v, i) => `${i === 0 ? 'M' : 'L'} ${(i * step).toFixed(1)} ${y(v)}`).join(' ');
  return (
    <svg width={width} height={height} className="overflow-visible">
      <path d={`${d} L ${width} ${height} L 0 ${height} Z`} fill={color} opacity="0.08" />
      <path d={d} fill="none" stroke={color} strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// ── change badge ─────────────────────────────────────────────────────────────
function Change({ current, previous }) {
  const cur = Number(current || 0), prev = Number(previous || 0);
  if (!prev && !cur) return <span className="text-slate-300">—</span>;
  const pct = prev ? Math.round(((cur - prev) / prev) * 100) : 100;
  const up = cur >= prev;
  return <span className={`font-black ${up ? 'text-emerald-600' : 'text-rose-500'}`}>{up ? '↑' : '↓'} {Math.abs(pct)}%</span>;
}

// ── semicircle KPI gauge ─────────────────────────────────────────────────────
function Gauge({ value, max, centerLabel, sub, color = '#16a34a' }) {
  const pct = Math.max(0, Math.min(1, max ? value / max : 0));
  const r = 82, cx = 100, cy = 100;
  const pt = (a) => [cx + r * Math.cos(a), cy - r * Math.sin(a)];
  const [sx, sy] = pt(Math.PI);      // left
  const [ex, ey] = pt(0);            // right
  const [px, py] = pt(Math.PI - pct * Math.PI);
  return (
    <svg viewBox="0 0 200 116" className="w-full">
      <path d={`M ${sx} ${sy} A ${r} ${r} 0 0 1 ${ex} ${ey}`} fill="none" stroke="#e2e8f0" strokeWidth="14" strokeLinecap="round" />
      <path d={`M ${sx} ${sy} A ${r} ${r} 0 0 1 ${px} ${py}`} fill="none" stroke={color} strokeWidth="14" strokeLinecap="round" />
      <text x="100" y="86" textAnchor="middle" style={{ fontSize: '24px', fontWeight: 900 }} className="fill-slate-800">{centerLabel}</text>
      <text x="100" y="104" textAnchor="middle" style={{ fontSize: '9px', fontWeight: 700 }} className="fill-slate-400">{sub}</text>
    </svg>
  );
}

// ── vertical bar graph ───────────────────────────────────────────────────────
function BarGraph({ bars }) {
  const max = Math.max(1, ...bars.map((b) => b.value));
  return (
    <div className="flex items-end justify-between gap-2 h-36 pt-2">
      {bars.length === 0 && <p className="m-auto text-xs text-slate-400">No data</p>}
      {bars.map((b, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1.5 group">
          <div className="w-full max-w-[34px] rounded-t transition-all" style={{ height: `${Math.max(3, (b.value / max) * 118)}px`, background: b.color }} title={String(b.title || b.value)} />
          <span className="text-[9px] font-bold text-slate-400 truncate w-full text-center">{b.label}</span>
        </div>
      ))}
    </div>
  );
}

// ── portlet shell ────────────────────────────────────────────────────────────
const Portlet = ({ title, children, action }) => (
  <section className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
    <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50/60">
      <h3 className="text-[13px] font-black text-slate-700">{title}</h3>
      {action}
    </div>
    <div className="p-4">{children}</div>
  </section>
);

const th = 'text-left px-3 py-2 text-slate-400 font-black uppercase text-[10px]';
const td = 'px-3 py-2';

export default function ProcurementDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    try {
      const res = await api.get('/clinical/procurement/dashboard');
      if (res.data?.success) setData(res.data.data);
      else toast.error('Could not load dashboard.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load procurement dashboard.');
    } finally { setLoading(false); setRefreshing(false); }
  };
  useEffect(() => { load(); }, []);

  const openPOValue = useMemo(() => {
    if (!data) return 0;
    return Object.entries(data.purchaseOrders.valueByStatus || {})
      .filter(([k]) => !['Received', 'Cancelled', 'Closed'].includes(k))
      .reduce((s, [, v]) => s + Number(v || 0), 0);
  }, [data]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-teal-600" />
        <p className="text-slate-500 font-semibold animate-pulse">Loading Procurement Dashboard…</p>
      </div>
    );
  }

  const cmp = data.comparison || {};
  const fin = data.financials || {};
  const trend = data.spendTrend || [];

  const reminders = [
    { n: data.requisitions.pending, label: 'Store requests to approve', color: HEX.indigo, to: '/procurement?tab=store_requisitions' },
    { n: data.submissions.pending, label: 'Submissions to receive', color: HEX.teal, to: '/supplier-portal-manager' },
    { n: data.rfqs.awaitingAward, label: 'RFQs awaiting award', color: HEX.amber, to: '/procurement?tab=tenders' },
    { n: data.purchaseOrders.byStatus.Draft || 0, label: 'Draft POs to send', color: HEX.slate, to: '/procurement?tab=purchase_orders' },
    { n: data.returns.thisMonth, label: 'Returns this month', color: HEX.rose, to: '/procurement?tab=returns' },
    { n: data.portal.activeSessions, label: 'Active supplier portals', color: HEX.emerald, to: '/supplier-portal-manager' },
  ];

  const navGroups = [
    { title: 'Lists', links: [['Suppliers', '/procurement?tab=suppliers'], ['Procurement Catalog', '/procurement?tab=catalog'], ['Requisitions', '/procurement?tab=store_requisitions'], ['Department Budgets', '/procurement?tab=budgets']] },
    { title: 'Transactions', links: [['Purchase Order', '/procurement?tab=purchase_orders'], ['Goods Receipt', '/procurement?tab=goods_receipts'], ['Supplier Return', '/procurement?tab=returns'], ['RFQ / Tender', '/procurement?tab=tenders']] },
    { title: 'Reports', links: [['Analytics', '/procurement?tab=analytics'], ['AP Invoices', '/procurement?tab=invoices'], ['Supplier Portal', '/supplier-portal-manager']] },
  ];

  const tiles = [
    { label: 'New Purchase Order', icon: ShoppingCart, bg: '#ca8a04', to: '/procurement?tab=purchase_orders' },
    { label: 'Receive Goods', icon: PackageCheck, bg: '#15803d', to: '/procurement?tab=goods_receipts' },
    { label: 'New RFQ / Tender', icon: Gavel, bg: '#c2410c', to: '/procurement?tab=tenders' },
    { label: 'Suppliers', icon: Truck, bg: '#475569', to: '/procurement?tab=suppliers' },
  ];

  const kpis = [
    { label: 'PO Value', value: compactRWF(cmp.poValue?.current), cmp: cmp.poValue, spark: trend.map((t) => t.total), color: HEX.teal },
    { label: 'PO Count', value: fmtNum(cmp.poCount?.current), cmp: cmp.poCount, spark: trend.map((t) => t.count), color: HEX.indigo },
    { label: 'Goods Received', value: compactRWF(cmp.grnValue?.current), cmp: cmp.grnValue, spark: [cmp.grnValue?.previous, cmp.grnValue?.current], color: HEX.emerald },
    { label: 'Returns', value: fmtNum(cmp.returns?.current), cmp: cmp.returns, spark: [cmp.returns?.previous, cmp.returns?.current], color: HEX.rose },
  ];

  const comparisonRows = [
    { name: 'PO Value', period: 'This Month vs Last', c: cmp.poValue, fmt: compactRWF },
    { name: 'PO Count', period: 'This Month vs Last', c: cmp.poCount, fmt: fmtNum },
    { name: 'Goods Received', period: 'This Month vs Last', c: cmp.grnValue, fmt: compactRWF },
    { name: 'Supplier Returns', period: 'This Month vs Last', c: cmp.returns, fmt: fmtNum },
  ];

  const financialCards = [
    { label: 'Spend (Year to Date)', value: compactRWF(fin.poValue?.ytd) },
    { label: 'Avg PO Value', value: compactRWF(fin.poCount?.ytd ? (fin.poValue?.ytd || 0) / fin.poCount.ytd : 0) },
    { label: 'Goods Received (YTD)', value: compactRWF(fin.grnValue?.ytd) },
    { label: 'Open PO Value', value: compactRWF(openPOValue) },
  ];

  const finRows = [
    { name: 'PO Value', src: fin.poValue, fmt: compactRWF },
    { name: 'PO Count', src: fin.poCount, fmt: fmtNum },
    { name: 'Goods Received Value', src: fin.grnValue, fmt: compactRWF },
    { name: 'Supplier Returns', src: fin.returns, fmt: fmtNum },
  ];

  const gaugeMax = Math.max(data.spend.lastMonth * 1.3, data.spend.thisMonth, 1);
  const statusBars = Object.entries(data.purchaseOrders.byStatus || {}).map(([k, v], i) => ({ label: k, value: v, color: colorFor(k, i), title: `${k}: ${v}` }));

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans">
      {/* top bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-2.5">
          <span className="p-1.5 bg-teal-600 text-white rounded-lg"><Building size={18} /></span>
          <div>
            <h1 className="text-base font-black text-slate-800 leading-none">Procurement Dashboard</h1>
            <p className="text-[11px] text-slate-400 font-semibold mt-0.5">{user?.full_name || 'Procurement Manager'} · Procurement Management</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/procurement" className="px-3 py-1.5 bg-white border border-slate-200 hover:border-teal-300 text-slate-600 font-bold text-[11px] rounded-lg flex items-center gap-1.5">
            <Building size={13} /> Procurement Hub
          </Link>
          <button onClick={() => load(true)} disabled={refreshing} className="px-3 py-1.5 bg-teal-700 hover:bg-teal-600 text-white font-bold text-[11px] rounded-lg flex items-center gap-1.5 disabled:opacity-60">
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      <div className="p-4 md:p-6">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">

          {/* ── LEFT COLUMN ── */}
          <div className="xl:col-span-3 space-y-4">
            <Portlet title="Reminders">
              <div className="space-y-1">
                {reminders.map((r, i) => (
                  <Link key={i} to={r.to} className="flex items-center gap-3 py-1.5 pl-3 border-l-[3px] hover:bg-slate-50 rounded-r-md transition-all group" style={{ borderColor: r.color }}>
                    <span className="text-lg font-black text-slate-800 w-8 text-right">{fmtNum(r.n)}</span>
                    <span className="text-xs font-bold text-slate-500 group-hover:text-slate-800 flex-1">{r.label}</span>
                    <ChevronRight size={13} className="text-slate-300 group-hover:text-teal-500" />
                  </Link>
                ))}
              </div>
            </Portlet>

            <Portlet title="Navigation Shortcut Group">
              <div className="space-y-3">
                {navGroups.map((g, gi) => (
                  <div key={gi}>
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">{g.title}</p>
                    <div className="flex flex-col">
                      {g.links.map(([label, to], li) => (
                        <Link key={li} to={to} className="flex items-center gap-2 py-1 text-xs font-bold text-slate-500 hover:text-teal-700 transition-all">
                          <span className="w-1 h-1 rounded-full bg-slate-300" /> {label}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Portlet>
          </div>

          {/* ── MIDDLE COLUMN ── */}
          <div className="xl:col-span-6 space-y-4">
            {/* Tiles */}
            <Portlet title="Tiles">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {tiles.map((t, i) => (
                  <Link key={i} to={t.to} className="rounded-xl p-4 text-white flex flex-col items-center justify-center gap-2 aspect-square hover:brightness-110 hover:scale-[1.02] transition-all shadow-sm" style={{ background: t.bg }}>
                    <t.icon size={26} />
                    <span className="text-[11px] font-black text-center leading-tight">{t.label}</span>
                  </Link>
                ))}
              </div>
            </Portlet>

            {/* KPIs */}
            <Portlet title="Key Performance Indicators">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                {kpis.map((k, i) => (
                  <div key={i} className="border border-slate-150 rounded-xl p-3">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{k.label}</p>
                    <div className="flex items-end justify-between mt-1">
                      <div>
                        <p className="text-lg font-black text-slate-800 leading-none">{k.value}</p>
                        <p className="text-[10px] font-bold mt-1"><Change current={k.cmp?.current} previous={k.cmp?.previous} /></p>
                      </div>
                      <Sparkline points={k.spark} color={k.color} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="bg-slate-50"><th className={th}>Indicator</th><th className={th}>Period</th><th className={`${th} text-right`}>Current</th><th className={`${th} text-right`}>Previous</th><th className={`${th} text-right`}>Change</th></tr></thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                    {comparisonRows.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50/60">
                        <td className={`${td} font-black text-slate-800`}>{r.name}</td>
                        <td className={`${td} text-teal-600 font-bold`}>{r.period}</td>
                        <td className={`${td} text-right font-black text-slate-800`}>{r.fmt(r.c?.current)}</td>
                        <td className={`${td} text-right text-slate-400`}>{r.fmt(r.c?.previous)}</td>
                        <td className={`${td} text-right`}><Change current={r.c?.current} previous={r.c?.previous} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Portlet>

            {/* Financials */}
            <Portlet title="Procurement Financials">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                {financialCards.map((c, i) => (
                  <div key={i} className="border border-slate-150 rounded-xl p-3">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{c.label}</p>
                    <p className="text-lg font-black text-slate-800 mt-1">{c.value}</p>
                  </div>
                ))}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs whitespace-nowrap">
                  <thead><tr className="bg-slate-50"><th className={th}>Indicator</th><th className={`${th} text-right`}>This Month</th><th className={`${th} text-right`}>Last Month</th><th className={`${th} text-right`}>Quarter to Date</th><th className={`${th} text-right`}>Year to Date</th></tr></thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                    {finRows.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50/60">
                        <td className={`${td} font-black text-slate-800`}>{r.name}</td>
                        <td className={`${td} text-right`}>{r.fmt(r.src?.mtd)}</td>
                        <td className={`${td} text-right`}>{r.fmt(r.src?.lastMonth)}</td>
                        <td className={`${td} text-right`}>{r.fmt(r.src?.qtd)}</td>
                        <td className={`${td} text-right font-black text-slate-800`}>{r.fmt(r.src?.ytd)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Portlet>
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div className="xl:col-span-3 space-y-4">
            <Portlet title="KPI Meter">
              <Gauge value={data.spend.thisMonth} max={gaugeMax} centerLabel={compactRWF(data.spend.thisMonth)} sub="SPEND THIS MONTH" />
              <div className="flex justify-between text-[10px] font-bold text-slate-400 px-2 -mt-1">
                <span>0</span><span>{compactRWF(gaugeMax)}</span>
              </div>
            </Portlet>

            <Portlet title="Purchase Orders by Status">
              <BarGraph bars={statusBars} />
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3 pt-3 border-t border-slate-100">
                {statusBars.map((b, i) => (
                  <span key={i} className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                    <span className="w-2 h-2 rounded-full" style={{ background: b.color }} /> {b.label} ({b.value})
                  </span>
                ))}
              </div>
            </Portlet>

            <Portlet title="Top Suppliers" action={<Link to="/procurement?tab=suppliers" className="text-[10px] font-bold text-teal-600 hover:underline">All</Link>}>
              {(data.topSuppliers || []).length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">No supplier spend yet.</p>
              ) : (
                <div className="space-y-2.5">
                  {(() => {
                    const max = Math.max(1, ...data.topSuppliers.map((s) => s.spend));
                    return data.topSuppliers.slice(0, 5).map((s, i) => (
                      <div key={i}>
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="font-bold text-slate-600 truncate">{s.name}</span>
                          <span className="font-black text-slate-800 ml-2 whitespace-nowrap">{compactRWF(s.spend)}</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${(s.spend / max) * 100}%`, background: HEX.teal }} />
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              )}
            </Portlet>
          </div>
        </div>
      </div>
    </div>
  );
}
