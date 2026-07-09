import React, { useEffect, useState, useCallback } from 'react';
import {
  RefreshCw, Activity, ScanLine, Radiation, Waves, Brain, FileText,
  Clock, TrendingUp, AlertTriangle, CheckCircle2, Layers, Stethoscope,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getImagingDashboard } from '../../api/imaging';

const UNIT_ICON = {
  'X-Ray': <Radiation size={18} />,
  CT: <ScanLine size={18} />,
  MRI: <Brain size={18} />,
  Ultrasound: <Waves size={18} />,
};

const monthLabel = (ym) => {
  try { return new Date(`${ym}-01T00:00:00`).toLocaleString('en-US', { month: 'short' }); }
  catch { return ym; }
};

// Format turnaround hours as a human-friendly string.
const fmtHours = (h) => {
  if (h == null) return '—';
  if (h < 1) return `${Math.round(h * 60)} min`;
  if (h < 48) return `${h.toFixed(1)} h`;
  return `${(h / 24).toFixed(1)} d`;
};

const KpiTile = ({ icon, label, value, sub, accent = 'text-slate-800', ring = 'bg-slate-50 text-slate-600' }) => (
  <div className="bg-white rounded-xl border border-slate-200 p-4">
    <div className="flex items-center justify-between mb-2">
      <span className={`p-2 rounded-lg ${ring}`}>{icon}</span>
    </div>
    <p className={`text-2xl font-bold ${accent}`}>{value}</p>
    <p className="text-xs font-semibold text-slate-600 mt-0.5">{label}</p>
    {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
  </div>
);

const ImagingDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getImagingDashboard(12);
      setData(res.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load the imaging dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <RefreshCw size={32} className="animate-spin text-indigo-600" />
        <p className="text-sm font-semibold text-slate-400">Compiling imaging analytics…</p>
      </div>
    );
  }

  if (!data) {
    return <p className="text-sm text-slate-400 italic py-12 text-center">No dashboard data available.</p>;
  }

  const { kpis, today, status_funnel, modality_utilization, turnaround, volume_trend, top_referrers } = data;
  const maxTrend = Math.max(1, ...volume_trend.map((m) => m.total));
  const maxMod = Math.max(1, ...modality_utilization.map((m) => m.total));

  const funnelStages = [
    { key: 'scheduled', label: 'Scheduled', color: 'bg-slate-400' },
    { key: 'checked_in', label: 'Checked-in', color: 'bg-sky-400' },
    { key: 'in_progress', label: 'In progress', color: 'bg-amber-400' },
    { key: 'acquired', label: 'Acquired', color: 'bg-blue-500' },
    { key: 'reported', label: 'Reported', color: 'bg-emerald-500' },
    { key: 'verified', label: 'Verified', color: 'bg-teal-600' },
  ];
  const funnelMax = Math.max(1, ...funnelStages.map((s) => status_funnel[s.key] || 0));

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Department Dashboard</h2>
          <p className="text-sm text-slate-500">Operational overview — volumes, utilization and reporting performance.</p>
        </div>
        <button
          onClick={load}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <KpiTile icon={<Layers size={18} />} label="Total exams" value={kpis.total_exams}
          sub={`${today.total} today`} ring="bg-indigo-50 text-indigo-600" accent="text-slate-800" />
        <KpiTile icon={<CheckCircle2 size={18} />} label="Reported" value={kpis.reported}
          sub={`${kpis.report_rate}% report rate`} ring="bg-emerald-50 text-emerald-600" accent="text-emerald-600" />
        <KpiTile icon={<AlertTriangle size={18} />} label="Reporting backlog" value={kpis.reporting_backlog}
          sub="acquired, awaiting report" ring="bg-amber-50 text-amber-600" accent="text-amber-600" />
        <KpiTile icon={<Clock size={18} />} label="Avg turnaround" value={fmtHours(turnaround.avg_hours)}
          sub={`median ${fmtHours(turnaround.median_hours)} · n=${turnaround.sample_size}`} ring="bg-sky-50 text-sky-600" accent="text-sky-700" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Volume trend */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-4">
            <TrendingUp size={16} className="text-indigo-600" /> Exam Volume — last {data.months_back} months
          </h3>
          <div className="flex items-end justify-between gap-1.5 h-44">
            {volume_trend.map((m, i) => (
              <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group">
                <div className="relative w-full flex flex-col items-center justify-end h-full">
                  <span className="text-[9px] font-bold text-slate-400 opacity-0 group-hover:opacity-100 mb-0.5">{m.total}</span>
                  {/* reported portion stacked within total */}
                  <div className="w-full max-w-[34px] rounded-t bg-indigo-100 relative flex flex-col justify-end"
                       style={{ height: `${Math.max(3, (m.total / maxTrend) * 100)}%` }}
                       title={`${m.month}: ${m.total} exams, ${m.reported} reported`}>
                    <div className="w-full bg-indigo-500 rounded-t"
                         style={{ height: `${m.total > 0 ? (m.reported / m.total) * 100 : 0}%` }} />
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-slate-400 mt-1.5">{monthLabel(m.month)}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-3 text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-indigo-500" /> Reported</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-indigo-100" /> Total exams</span>
          </div>
        </div>

        {/* Modality utilization */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-4">
            <Activity size={16} className="text-indigo-600" /> Modality Utilization
          </h3>
          <div className="space-y-3.5">
            {modality_utilization.map((m) => (
              <div key={m.modality}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                    <span className="text-indigo-500">{UNIT_ICON[m.modality] || <Activity size={16} />}</span>
                    {m.modality}
                  </span>
                  <span className="font-bold text-slate-800">{m.total} <span className="text-slate-400 font-semibold">· {m.share}%</span></span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full transition-all"
                       style={{ width: `${(m.total / maxMod) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Status funnel */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-4">
            <Layers size={16} className="text-indigo-600" /> Workflow Pipeline
          </h3>
          <div className="space-y-2.5">
            {funnelStages.map((s) => {
              const val = status_funnel[s.key] || 0;
              return (
                <div key={s.key} className="flex items-center gap-3">
                  <span className="w-24 text-xs font-semibold text-slate-600 shrink-0">{s.label}</span>
                  <div className="flex-1 h-6 bg-slate-50 rounded-lg overflow-hidden">
                    <div className={`h-full ${s.color} rounded-lg flex items-center justify-end px-2 transition-all`}
                         style={{ width: `${Math.max(val > 0 ? 8 : 0, (val / funnelMax) * 100)}%` }}>
                      {val > 0 && <span className="text-[10px] font-bold text-white">{val}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top referrers */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-4">
            <Stethoscope size={16} className="text-indigo-600" /> Top Referring Providers
          </h3>
          {top_referrers.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-6 text-center">No referral data yet.</p>
          ) : (
            <ol className="space-y-2.5">
              {top_referrers.map((r, i) => (
                <li key={i} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-slate-700">
                    <span className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 text-[11px] font-bold flex items-center justify-center">{i + 1}</span>
                    <span className="truncate max-w-[150px]">{r.provider}</span>
                  </span>
                  <span className="font-bold text-slate-800">{r.total}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImagingDashboard;
