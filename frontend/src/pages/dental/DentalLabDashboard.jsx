import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getDentalStats, listDentalCases } from '../../api/dental';
import { getIncidents } from '../../api/incidents';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import {
  FlaskConical, Package, DollarSign, AlertTriangle,
  FileText, ChevronRight, Activity, Sparkles, RefreshCw,
  ClipboardList, CheckCircle2, Clock, Layers, ArrowUpRight, ShieldAlert, BookOpen
} from 'lucide-react';

const STAGE_COLORS = {
  'Received':             { color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200' },
  'Wax-Up / Framework':   { color: 'text-blue-700',    bg: 'bg-blue-50',    border: 'border-blue-200' },
  'Casting / Milling':    { color: 'text-purple-700',  bg: 'bg-purple-50',  border: 'border-purple-200' },
  'Porcelain / Finishing':{ color: 'text-indigo-700',  bg: 'bg-indigo-50',  border: 'border-indigo-200' },
  'Completed':            { color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  'Delivered':            { color: 'text-slate-700',   bg: 'bg-slate-100',   border: 'border-slate-200' },
};

const StatCard = ({ label, value, color, icon, sub }) => (
  <div className="bg-white rounded-3xl p-5 border border-slate-100 flex items-center gap-4 hover:-translate-y-1 hover:shadow-xl hover:border-slate-200 transition-all duration-300 shadow-sm group">
    <div 
      className="p-3.5 rounded-2xl shrink-0 group-hover:scale-110 transition-transform duration-300"
      style={{ backgroundColor: `${color}10`, color }}
    >
      {icon}
    </div>
    <div>
      <p className="m-0 text-xs text-slate-400 font-bold uppercase tracking-wider">{label}</p>
      <p className="m-0 mt-0.5 text-2xl font-black text-slate-800 leading-none">{value}</p>
      {sub && <p className="text-[10px] text-slate-400 mt-1">{sub}</p>}
    </div>
  </div>
);

const ActionCard = ({ label, icon, color, path, navigate, desc }) => (
  <button 
    onClick={() => navigate(path)}
    className="p-5 rounded-2xl border border-slate-200 bg-white flex items-center gap-4 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-indigo-300 group text-left"
  >
    <div 
      className="p-3 rounded-xl shadow-sm group-hover:scale-110 transition-transform duration-300 shrink-0"
      style={{ backgroundColor: `${color}15`, color }}
    >
      {icon}
    </div>
    <div className="min-w-0 flex-1">
      <h4 className="font-bold text-xs text-slate-800 m-0 group-hover:text-indigo-600 transition-colors">{label}</h4>
      <p className="text-[11px] text-slate-400 m-0 mt-0.5 truncate">{desc}</p>
    </div>
    <ArrowUpRight size={16} className="text-slate-300 group-hover:text-indigo-500 transition-colors shrink-0" />
  </button>
);

export default function DentalLabDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  const [labStats, setLabStats] = useState(null);
  const [recentCases, setRecentCases] = useState([]);
  const [deptIncidents, setDeptIncidents] = useState([]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, casesRes, incRes] = await Promise.all([
        getDentalStats('monthly').catch(() => null),
        listDentalCases({ period: 'monthly' }).catch(() => null),
        getIncidents().catch(() => null)
      ]);

      setLabStats(statsRes?.data?.data ?? statsRes ?? null);

      const casesData = casesRes?.data?.data ?? casesRes?.data ?? casesRes ?? [];
      const casesArr = Array.isArray(casesData) ? casesData : [];
      setRecentCases(casesArr.slice(0, 6));

      const allInc = incRes?.data?.data ?? incRes ?? [];
      if (Array.isArray(allInc)) {
        const filtered = allInc.filter(i => 
          i.department?.toLowerCase().includes('dental') || 
          i.department?.toLowerCase().includes('lab') ||
          i.area_of_incident?.toLowerCase().includes('dental')
        );
        setDeptIncidents(filtered.slice(0, 3));
      }
    } catch (err) {
      toast.error('Failed to load dental lab dashboard data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (loading) return <LoadingSpinner />;

  const greeting = now.getHours() < 12 ? 'Good Morning' : now.getHours() < 17 ? 'Good Afternoon' : 'Good Evening';
  const firstName = user?.fullName?.split(' ').slice(-1)[0] || user?.fullName || 'Technician';

  const totalCases = labStats?.totals?.total_cases ?? recentCases.length;
  const totalUnits = labStats?.totals?.total_units ?? 0;
  const totalRevenue = labStats?.totals?.total_revenue ?? 0;

  const inProgressCases = recentCases.filter(c => c.status !== 'Delivered' && c.status !== 'Completed').length;
  const completedCases = recentCases.filter(c => c.status === 'Completed' || c.status === 'Delivered').length;

  return (
    <div className="pb-10 w-full space-y-8 font-sans">
      
      {/* HERO BANNER */}
      <div className="bg-gradient-to-r from-indigo-700 via-purple-700 to-purple-800 rounded-3xl p-8 lg:p-10 text-white relative overflow-hidden shadow-lg shadow-indigo-100">
        <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-white/5 backdrop-blur-3xl" />
        <div className="absolute top-20 right-48 w-32 h-32 rounded-full bg-white/10 backdrop-blur-3xl" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <p className="m-0 text-sm text-indigo-200 font-bold uppercase tracking-widest flex items-center gap-2">
              <FlaskConical size={16} className="text-indigo-300" />
              {now.toLocaleDateString('en-RW', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            <h1 className="m-0 text-3xl md:text-4xl font-black text-white drop-shadow-sm leading-tight">
              {greeting}, {firstName} 👋
            </h1>
            <p className="m-0 text-indigo-100 text-sm font-medium max-w-2xl">
              Dental Laboratory Command Center — Managing prosthetics fabrication, work orders, zirconia crowns, dentures, and lab material inventory.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-100 backdrop-blur-md">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse" />
              <span className="text-[11px] font-black uppercase tracking-wider">Lab Live Sync</span>
            </div>
            <button 
              onClick={fetchDashboardData}
              className="p-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl transition text-white flex items-center justify-center cursor-pointer"
              title="Refresh Dashboard Statistics"
            >
              <RefreshCw size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* STATS OVERVIEW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard 
          label="Active Lab Cases" 
          value={totalCases} 
          color="#6366f1" 
          icon={<BookOpen size={24} />} 
          sub={`${inProgressCases} currently in production`} 
        />
        <StatCard 
          label="Completed Units" 
          value={totalUnits} 
          color="#10b981" 
          icon={<CheckCircle2 size={24} />} 
          sub={`${completedCases} cases delivered/ready`} 
        />
        <StatCard 
          label="Est. Work Billing" 
          value={`RWF ${Number(totalRevenue).toLocaleString()}`} 
          color="#06b6d4" 
          icon={<DollarSign size={24} />} 
          sub="monthly lab billing value" 
        />
        <StatCard 
          label="Active Incidents" 
          value={deptIncidents.length} 
          color="#f43f5e" 
          icon={<AlertTriangle size={24} />} 
          sub="dental lab incident reports" 
        />
      </div>

      {/* QUICK ACTIONS */}
      <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-4">
        <h3 className="m-0 text-sm font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2">
          <Sparkles size={16} className="text-indigo-600" />
          Quick Lab Actions
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <ActionCard 
            label="Prosthetics Cases Log" 
            desc="Log work orders, crowns & dentures" 
            icon={<BookOpen size={20} />} 
            color="#6366f1" 
            path="/dental?section=lab&tab=cases" 
            navigate={navigate} 
          />
          <ActionCard
            label="Lab Consumables Log" 
            desc="Log materials & request stock" 
            icon={<ClipboardList size={20} />} 
            color="#8b5cf6" 
            path="/dental?section=lab&tab=consumables_lab" 
            navigate={navigate} 
          />
          <ActionCard 
            label="Dental Hub Portal" 
            desc="Open clinic & lab workspaces" 
            icon={<FlaskConical size={20} />} 
            color="#06b6d4" 
            path="/dental" 
            navigate={navigate} 
          />
          <ActionCard 
            label="Report Incident" 
            desc="Report laboratory safety issues" 
            icon={<AlertTriangle size={20} />} 
            color="#f43f5e" 
            path="/incidents" 
            navigate={navigate} 
          />
        </div>
      </div>

      {/* DASHBOARD BODY */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* RECENT LAB CASES */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h3 className="m-0 text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <FlaskConical size={16} className="text-indigo-600" /> Recent Lab Work Orders
            </h3>
            <button 
              onClick={() => navigate('/dental?section=lab&tab=cases')} 
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5 cursor-pointer"
            >
              View All Cases <ChevronRight size={14} />
            </button>
          </div>

          {recentCases.length === 0 ? (
            <div className="py-14 text-center text-slate-400 flex flex-col items-center justify-center">
              <Package size={36} className="text-slate-200 mb-2" />
              <p className="text-sm font-semibold">No active prosthetics cases logged</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 bg-slate-50">
                    <th className="px-4 py-3">Patient</th>
                    <th className="px-4 py-3">Work Done</th>
                    <th className="px-4 py-3">Doctor</th>
                    <th className="px-4 py-3">Target Date</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold">
                  {recentCases.map((c) => {
                    const st = STAGE_COLORS[c.status] || STAGE_COLORS['Received'];
                    return (
                      <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-slate-900 font-bold">
                          {c.patient_name || 'Patient'}
                          {c.patient_id && <span className="block text-[10px] text-slate-400 font-normal">PID: {c.patient_id}</span>}
                        </td>
                        <td className="px-4 py-3 text-slate-700">{c.work_done || 'Prosthetic Case'}</td>
                        <td className="px-4 py-3 text-slate-500">{c.doctor_name || 'Dr. Dental'}</td>
                        <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">
                          {c.delivery_date ? format(new Date(c.delivery_date), 'dd MMM yyyy') : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${st.bg} ${st.color} ${st.border}`}>
                            {c.status || 'Received'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* SIDE PANEL: INCIDENTS & SAFETY */}
        <div className="space-y-6">
          
          {/* INCIDENTS PANEL */}
          <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="m-0 text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <ShieldAlert size={16} className="text-rose-500" /> Lab Incidents & Safety
              </h3>
              <button
                onClick={() => navigate('/incidents')}
                className="text-[11px] font-bold text-rose-600 hover:text-rose-700 cursor-pointer"
              >
                Log New
              </button>
            </div>

            {deptIncidents.length === 0 ? (
              <div className="py-6 text-center text-slate-400">
                <CheckCircle2 size={28} className="text-emerald-400 mx-auto mb-1.5" />
                <p className="text-xs font-semibold text-slate-600">No active incidents</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Dental lab safety compliance normal.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {deptIncidents.map((inc) => (
                  <div 
                    key={inc.id} 
                    onClick={() => navigate('/incidents')}
                    className="p-3 rounded-2xl bg-slate-50 hover:bg-rose-50/50 border border-slate-200 transition-colors cursor-pointer space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 truncate max-w-[180px]">{inc.title || 'Incident Report'}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded font-extrabold uppercase bg-rose-100 text-rose-700">
                        {inc.severity || 'Reported'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-1">{inc.description || 'Dental lab safety log'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* STOCK & MATERIALS PANEL */}
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-3xl border border-indigo-100 p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-indigo-800">
              <ClipboardList size={18} />
              <h4 className="font-extrabold text-xs uppercase tracking-wider m-0">Lab Materials & Stock</h4>
            </div>
            <p className="text-xs text-slate-600 m-0 leading-relaxed font-medium">
              Log daily laboratory consumable usage or request material replenishment from the Stock Manager.
            </p>
            <button
              onClick={() => navigate('/dental?section=lab&tab=consumables_lab')}
              className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>Open Lab Consumables Log</span>
              <ArrowUpRight size={14} />
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
