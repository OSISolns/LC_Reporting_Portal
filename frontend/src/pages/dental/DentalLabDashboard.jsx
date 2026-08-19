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
  <div className="bg-white rounded-xl p-4 border border-slate-200 flex items-center gap-3.5 shadow-xs hover:border-slate-300 transition-colors">
    <div 
      className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
      style={{ backgroundColor: `${color}10`, color }}
    >
      {icon}
    </div>
    <div className="min-w-0">
      <p className="m-0 text-[11px] text-slate-500 font-semibold uppercase tracking-wider">{label}</p>
      <p className="m-0 mt-0.5 text-xl font-bold text-slate-900 leading-tight">{value}</p>
      {sub && <p className="text-[11px] text-slate-400 mt-0.5 truncate">{sub}</p>}
    </div>
  </div>
);

const ActionCard = ({ label, icon, color, path, navigate, desc }) => (
  <button 
    onClick={() => navigate(path)}
    className="p-4 rounded-xl border border-slate-200 bg-white flex items-center gap-3.5 cursor-pointer transition-colors hover:border-slate-300 hover:bg-slate-50/50 text-left"
  >
    <div 
      className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
      style={{ backgroundColor: `${color}15`, color }}
    >
      {icon}
    </div>
    <div className="min-w-0 flex-1">
      <h4 className="font-semibold text-xs text-slate-900 m-0">{label}</h4>
      <p className="text-[11px] text-slate-500 m-0 mt-0.5 truncate">{desc}</p>
    </div>
    <ArrowUpRight size={15} className="text-slate-400 shrink-0" />
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

  const nameString = user?.fullName || user?.full_name || '';
  const firstName = nameString ? nameString.split(' ')[0] : 'Technician';
  const greeting = now.getHours() < 12 ? 'Good Morning' : now.getHours() < 17 ? 'Good Afternoon' : 'Good Evening';

  const totalCases = labStats?.totals?.total_cases ?? recentCases.length;
  const totalUnits = labStats?.totals?.total_units ?? 0;
  const totalRevenue = labStats?.totals?.total_revenue ?? 0;

  const inProgressCases = recentCases.filter(c => c.status !== 'Delivered' && c.status !== 'Completed').length;
  const completedCases = recentCases.filter(c => c.status === 'Completed' || c.status === 'Delivered').length;

  return (
    <div className="pb-10 w-full space-y-6 font-sans">
      
      {/* HERO BANNER */}
      <div className="bg-[#1B669E] rounded-xl p-6 text-white border border-[#165380] shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <p className="m-0 text-[11px] text-blue-100 font-medium uppercase tracking-wider flex items-center gap-1.5">
              <FlaskConical size={14} className="text-blue-200" />
              {now.toLocaleDateString('en-RW', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            <h1 className="m-0 text-2xl font-bold text-white tracking-tight">
              {greeting}, {firstName}
            </h1>
            <p className="m-0 text-blue-50 text-xs font-normal max-w-2xl leading-relaxed">
              Dental Laboratory Command Center — Prosthetics fabrication, work orders, zirconia crowns, dentures, and lab material inventory.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-white">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-[11px] font-semibold tracking-wide">Lab Sync Active</span>
            </div>
            <button 
              onClick={fetchDashboardData}
              className="p-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg transition text-white flex items-center justify-center cursor-pointer"
              title="Refresh Dashboard Statistics"
            >
              <RefreshCw size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* STATS OVERVIEW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          label="Active Lab Cases" 
          value={totalCases} 
          color="#1B669E" 
          icon={<BookOpen size={20} />} 
          sub={`${inProgressCases} in production`} 
        />
        <StatCard 
          label="Completed Units" 
          value={totalUnits} 
          color="#059669" 
          icon={<CheckCircle2 size={20} />} 
          sub={`${completedCases} delivered/ready`} 
        />
        <StatCard 
          label="Est. Work Billing" 
          value={`RWF ${Number(totalRevenue).toLocaleString()}`} 
          color="#0891b2" 
          icon={<DollarSign size={20} />} 
          sub="monthly lab billing" 
        />
        <StatCard 
          label="Active Incidents" 
          value={deptIncidents.length} 
          color="#e11d48" 
          icon={<AlertTriangle size={20} />} 
          sub="incident reports" 
        />
      </div>

      {/* QUICK ACTIONS */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
        <h3 className="m-0 text-xs font-bold uppercase tracking-wider text-slate-500">
          Quick Lab Actions
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <ActionCard 
            label="Prosthetics Cases Log" 
            desc="Work orders, crowns & dentures" 
            icon={<BookOpen size={18} />} 
            color="#1B669E" 
            path="/dental?section=lab&tab=cases" 
            navigate={navigate} 
          />
          <ActionCard 
            label="Lab Consumables Log" 
            desc="Log materials & request stock" 
            icon={<ClipboardList size={18} />} 
            color="#7c3aed" 
            path="/dental?section=lab&tab=consumables_lab" 
            navigate={navigate} 
          />
          <ActionCard 
            label="Dental Hub Portal" 
            desc="Open clinic & lab workspaces" 
            icon={<FlaskConical size={18} />} 
            color="#0891b2" 
            path="/dental" 
            navigate={navigate} 
          />
          <ActionCard 
            label="Report Incident" 
            desc="Report laboratory safety issues" 
            icon={<AlertTriangle size={18} />} 
            color="#e11d48" 
            path="/incidents" 
            navigate={navigate} 
          />
        </div>
      </div>

      {/* DASHBOARD BODY */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* RECENT LAB CASES */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <h3 className="m-0 text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <FlaskConical size={15} className="text-slate-600" /> Recent Lab Work Orders
            </h3>
            <button 
              onClick={() => navigate('/dental?section=lab&tab=cases')} 
              className="text-xs font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-0.5 cursor-pointer"
            >
              View All Cases <ChevronRight size={14} />
            </button>
          </div>

          {recentCases.length === 0 ? (
            <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center">
              <Package size={32} className="text-slate-300 mb-2" />
              <p className="text-xs font-semibold text-slate-600">No active prosthetics cases logged</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50">
                    <th className="px-4 py-2.5">Patient</th>
                    <th className="px-4 py-2.5">Work Done</th>
                    <th className="px-4 py-2.5">Doctor</th>
                    <th className="px-4 py-2.5">Target Date</th>
                    <th className="px-4 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {recentCases.map((c) => {
                    const st = STAGE_COLORS[c.status] || STAGE_COLORS['Received'];
                    return (
                      <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-2.5 text-slate-900 font-semibold">
                          {c.patient_name || 'Patient'}
                          {c.patient_id && <span className="block text-[10px] text-slate-400 font-normal">PID: {c.patient_id}</span>}
                        </td>
                        <td className="px-4 py-2.5 text-slate-700">{c.work_done || 'Prosthetic Case'}</td>
                        <td className="px-4 py-2.5 text-slate-500">{c.doctor_name || 'Dr. Dental'}</td>
                        <td className="px-4 py-2.5 text-slate-500 font-mono text-[11px]">
                          {c.delivery_date ? format(new Date(c.delivery_date), 'dd MMM yyyy') : '—'}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold border ${st.bg} ${st.color} ${st.border}`}>
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
        <div className="space-y-5">
          
          {/* INCIDENTS PANEL */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-200">
              <h3 className="m-0 text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldAlert size={15} className="text-slate-600" /> Lab Incidents & Safety
              </h3>
              <button
                onClick={() => navigate('/incidents')}
                className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Log New
              </button>
            </div>

            {deptIncidents.length === 0 ? (
              <div className="py-5 text-center text-slate-400">
                <CheckCircle2 size={24} className="text-emerald-500 mx-auto mb-1" />
                <p className="text-xs font-medium text-slate-700">No active incidents</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Dental lab safety compliance normal.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {deptIncidents.map((inc) => (
                  <div 
                    key={inc.id} 
                    onClick={() => navigate('/incidents')}
                    className="p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100/80 border border-slate-200 transition-colors cursor-pointer space-y-0.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-800 truncate max-w-[180px]">{inc.title || 'Incident Report'}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase bg-rose-50 text-rose-700 border border-rose-200">
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
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 shadow-xs space-y-2.5">
            <div className="flex items-center gap-2 text-slate-800">
              <ClipboardList size={16} />
              <h4 className="font-bold text-xs uppercase tracking-wider m-0">Lab Materials & Stock</h4>
            </div>
            <p className="text-xs text-slate-600 m-0 leading-relaxed">
              Log daily laboratory consumable usage or request material replenishment from the Stock Manager.
            </p>
            <button
              onClick={() => navigate('/dental?section=lab&tab=consumables_lab')}
              className="w-full py-2 px-3 bg-[#1B669E] hover:bg-[#155280] text-white rounded-lg text-xs font-semibold transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
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
