import React, { useState, useEffect, useCallback } from 'react';
import {
  FlaskConical, Activity, Clock, AlertTriangle, ShieldCheck,
  RefreshCw, AlertOctagon, BarChart2, Cpu, Layers,
  ChevronRight, UserCheck, Archive,
} from 'lucide-react';
import api from '../../api/axios';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function LabManagerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summaryData, setSummaryData] = useState(null);

  const fetchSummary = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await api.get('/lab/manager-summary');
      if (res.data?.success) {
        setSummaryData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load lab manager summary:', err);
      setSummaryData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
    const interval = setInterval(() => fetchSummary(false), 45000);
    return () => clearInterval(interval);
  }, [fetchSummary]);

  const handleLabManagerReviewStamp = async (ncrId) => {
    try {
      await api.put(`/lab/ncr/${ncrId}`, {
        reviewed_by_lab_manager: `${user?.full_name || 'Lab Manager'} (${new Date().toLocaleDateString('en-GB')})`
      });
      toast.success('Lab Manager Review stamp applied.');
      fetchSummary(true);
    } catch {
      toast.error('Failed to stamp review.');
    }
  };

  const data = summaryData || {};
  const orders = data.orders || {};
  const qc = data.qc || {};
  const ncr = data.ncr || {};
  const tat = data.tat || {};
  const departments = data.departments || [];
  const analyzers = data.analyzers || [];
  const tatTotal = (tat.pre_analytical_avg || 0) + (tat.analytical_avg || 0) + (tat.post_analytical_avg || 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-slate-400 text-sm">
        Loading dashboard…
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 font-sans text-slate-800 antialiased bg-slate-50/50 min-h-screen">

      {/* ── HEADER ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-900 p-6 rounded-2xl text-white shadow-md border border-blue-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-800/80 rounded-xl border border-blue-700">
            <FlaskConical className="text-blue-100" size={22} />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white">Laboratory Manager Dashboard</h1>
            <p className="text-xs text-blue-200/80">Pathology Quality Control &amp; Operational Analytics</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => navigate('/lab')}
            className="px-3.5 py-2 bg-blue-800 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl border border-blue-700 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <FlaskConical size={13} /> Specimen Hub
          </button>
          <button
            onClick={() => navigate('/ncr')}
            className="px-3.5 py-2 bg-blue-800 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl border border-blue-700 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <AlertOctagon size={13} /> NCR Module {ncr.open != null ? `(${ncr.open})` : ''}
          </button>
          <button
            onClick={() => navigate('/lab/analyzers')}
            className="px-3.5 py-2 bg-blue-800 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl border border-blue-700 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Cpu size={13} /> Analyzers
          </button>
          <button
            onClick={() => navigate('/lab/archive')}
            className="px-3.5 py-2 bg-blue-800 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl border border-blue-700 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Archive size={13} /> Archive
          </button>
          <button
            onClick={() => fetchSummary(true)}
            className="p-2 text-blue-200 hover:text-white hover:bg-blue-800 rounded-xl transition-all cursor-pointer border border-blue-800"
            title="Refresh"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── KPI TILES ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Orders</span>
            <Layers size={17} className="text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-blue-950">{orders.total ?? '—'}</p>
          <p className="text-[11px] text-slate-500">{orders.completed_today != null ? `${orders.completed_today} completed today` : 'No data'}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">STAT Urgent</span>
            <Activity size={17} className="text-rose-500" />
          </div>
          <p className="text-2xl font-bold text-rose-700">{orders.stat ?? '—'}</p>
          <p className="text-[11px] text-slate-500">Critical Triage Priority</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Overdue TAT</span>
            <Clock size={17} className="text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-amber-800">{orders.overdue ?? '—'}</p>
          <p className="text-[11px] text-slate-500">Requires Expedited Verification</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">IQC Pass Rate</span>
            <ShieldCheck size={17} className="text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-800">{qc.pass_rate != null ? `${qc.pass_rate}%` : '—'}</p>
          <p className="text-[11px] text-slate-500">Westgard Rules Compliant</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">NCR Queue</span>
            <AlertOctagon size={17} className="text-indigo-600" />
          </div>
          <p className="text-2xl font-bold text-indigo-900">{ncr.lm_pending ?? '—'}</p>
          <p className="text-[11px] text-slate-500">Pending Review Sign-off</p>
        </div>
      </div>

      {/* ── MAIN GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT 2 COLUMNS */}
        <div className="lg:col-span-2 space-y-6">

          {/* TAT STAGE BREAKDOWN */}
          {tatTotal > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-sm font-bold text-blue-950 flex items-center gap-2">
                    <Clock className="text-blue-700" size={17} />
                    Turnaround Time (TAT) Stage Breakdown
                  </h2>
                  <p className="text-xs text-slate-500">Pre-analytical, Analytical, and Post-analytical latency</p>
                </div>
                <span className="text-xs bg-blue-50 text-blue-900 font-bold px-2.5 py-1 rounded-md border border-blue-200">
                  Avg: {tatTotal} min
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { label: '1. Pre-Analytical', value: tat.pre_analytical_avg, color: 'bg-blue-600', desc: 'Order Entry → Accessioning' },
                  { label: '2. Analytical', value: tat.analytical_avg, color: 'bg-blue-800', desc: 'Centrifugation → Analyzer Run' },
                  { label: '3. Post-Analytical', value: tat.post_analytical_avg, color: 'bg-emerald-600', desc: 'Verification → Report Release' },
                ].map(({ label, value, color, desc }) => {
                  const pct = tatTotal > 0 ? Math.round(((value || 0) / tatTotal) * 100) : 0;
                  return (
                    <div key={label} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">{label}</span>
                        <span className="text-xs font-bold text-blue-900">{value != null ? `${value} min` : '—'}</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div className={`${color} h-2 rounded-full`} style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-[10.5px] text-slate-500">{desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* DEPARTMENTAL WORKLOAD */}
          {departments.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-sm font-bold text-blue-950 flex items-center gap-2">
                  <BarChart2 className="text-blue-700" size={17} />
                  Departmental Workload Distribution
                </h2>
                <p className="text-xs text-slate-500">Specimen volume per pathology division</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {departments.map((dept, idx) => {
                  const colors = [
                    'bg-blue-50 border-blue-200 text-blue-900',
                    'bg-indigo-50 border-indigo-200 text-indigo-900',
                    'bg-purple-50 border-purple-200 text-purple-900',
                    'bg-sky-50 border-sky-200 text-sky-900',
                    'bg-emerald-50 border-emerald-200 text-emerald-900',
                    'bg-slate-50 border-slate-200 text-slate-900',
                  ];
                  return (
                    <div key={idx} className={`p-3.5 rounded-xl border ${colors[idx % colors.length]} space-y-1`}>
                      <span className="text-[10px] font-bold uppercase tracking-wider block opacity-80">{dept.department}</span>
                      <div className="flex items-baseline justify-between">
                        <span className="text-xl font-bold">{dept.count}</span>
                        <span className="text-[10px] font-semibold opacity-75">specimens</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* IQC TABLE */}
          {(data.recent_qc || []).length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-sm font-bold text-blue-950 flex items-center gap-2">
                    <ShieldCheck className="text-emerald-600" size={17} />
                    Quality Control &amp; IQC Runs
                  </h2>
                  <p className="text-xs text-slate-500">Internal Quality Control (IQC) Analyzer Runs</p>
                </div>
                {qc.pass_rate != null && (
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                    {qc.pass_rate}% Pass Rate
                  </span>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-600 uppercase text-[9.5px] font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Analyzer</th>
                      <th className="py-2.5 px-3">Parameter</th>
                      <th className="py-2.5 px-3">Control Level</th>
                      <th className="py-2.5 px-3">Measured</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {data.recent_qc.map((q, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{q.analyzer_name}</td>
                        <td className="py-2.5 px-3 font-medium">{q.parameter_name}</td>
                        <td className="py-2.5 px-3 text-slate-500">{q.control_level}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-blue-900">{q.measured_value}</td>
                        <td className="py-2.5 px-3">
                          <span className={`inline-block px-2 py-0.5 rounded text-[9.5px] font-bold border ${
                            q.status === 'Passed'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-rose-50 text-rose-800 border-rose-200'
                          }`}>
                            {q.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">

          {/* NCR PENDING REVIEW */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-blue-950 flex items-center gap-2">
                <AlertOctagon className="text-blue-900" size={17} />
                NCR Pending Review
              </h2>
              <button
                onClick={() => navigate('/ncr')}
                className="text-xs font-bold text-blue-800 hover:text-blue-950 flex items-center gap-0.5"
              >
                View All <ChevronRight size={12} />
              </button>
            </div>

            <div className="space-y-3">
              {(data.recent_ncr || []).length === 0 ? (
                <p className="text-xs text-slate-400 italic py-4 text-center">No pending NCR reviews.</p>
              ) : (
                data.recent_ncr.map((item) => (
                  <div key={item.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs text-blue-950">{item.ncr_number}</span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase ${
                        item.significance === 'major'
                          ? 'bg-rose-50 text-rose-800 border-rose-200'
                          : 'bg-blue-50 text-blue-800 border-blue-200'
                      }`}>
                        {item.significance}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600">
                      <span className="font-semibold">{item.unit}</span> • {item.recorded_by}
                    </div>
                    {!item.reviewed_by_lab_manager && (
                      <button
                        onClick={() => handleLabManagerReviewStamp(item.id)}
                        className="w-full py-1.5 bg-blue-900 hover:bg-blue-800 text-white font-bold text-[10.5px] rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1"
                      >
                        <UserCheck size={12} /> Stamp Review
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ANALYZER DIAGNOSTICS */}
          {analyzers.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-sm font-bold text-blue-950 flex items-center gap-2">
                  <Cpu className="text-blue-800" size={17} />
                  Analyzer Diagnostics
                </h2>
              </div>

              <div className="space-y-3">
                {analyzers.map((inst, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900">{inst.name}</span>
                      <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold border ${
                        inst.status === 'Operational'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}>
                        {inst.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                      <span>Uptime: <strong className="text-slate-800">{inst.uptime}</strong></span>
                      <span>Calibrated: <strong className="text-slate-800">{inst.last_calibrated}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

    </div>
  );
}
