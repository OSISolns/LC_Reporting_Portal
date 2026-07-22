import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { listWorklist, getWorklistStats, getDentalStats, listDentalCases, listAppointments } from '../../api/dental';
import { getIncidents } from '../../api/incidents';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';
import { format, addDays } from 'date-fns';
import {
  Heart, Calendar, Clock, DollarSign, Package, AlertTriangle,
  Stethoscope, Users, Building, FileText, ChevronRight,
  TrendingUp, Award, Activity, Sparkles, Filter, ChevronLeft,
  Briefcase, CheckCircle, RefreshCw, ClipboardList, CalendarClock, CalendarPlus
} from 'lucide-react';

const STATUS_CONFIG = {
  'Waiting':    { color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', dot: 'bg-amber-500' },
  'In Chair':   { color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', dot: 'bg-blue-500' },
  'Post-op':    { color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200', dot: 'bg-purple-500' },
  'Discharged': { color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200', dot: 'bg-green-500' },
  'No Show':    { color: 'text-slate-700', bg: 'bg-slate-50', border: 'border-slate-200', dot: 'bg-slate-400' },
  'Cancelled':  { color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', dot: 'bg-red-500' }
};

const APPT_STATUS_CONFIG = {
  'Scheduled':  { color: 'text-amber-700',  bg: 'bg-amber-50' },
  'Confirmed':  { color: 'text-blue-700',   bg: 'bg-blue-50' },
  'Checked-In': { color: 'text-indigo-700', bg: 'bg-indigo-50' },
  'Completed':  { color: 'text-green-700',  bg: 'bg-green-50' },
  'Cancelled':  { color: 'text-red-700',    bg: 'bg-red-50' },
  'No-Show':    { color: 'text-slate-700',  bg: 'bg-slate-50' },
};

const MiniStat = ({ label, value, color, icon, sub }) => (
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

const QuickAction = ({ label, icon, color, path, navigate }) => (
  <button 
    onClick={() => navigate(path)}
    className="p-5 rounded-2xl border border-slate-200 bg-white flex flex-col items-center gap-3 cursor-pointer transition-all duration-300 flex-1 min-w-[130px] hover:-translate-y-1 hover:shadow-md hover:border-rose-300 group"
  >
    <div 
      className="p-3.5 rounded-xl shadow-sm group-hover:scale-110 transition-transform duration-300"
      style={{ backgroundColor: `${color}15`, color }}
    >
      {icon}
    </div>
    <span className="font-bold text-xs text-slate-700 text-center leading-tight">{label}</span>
  </button>
);

export default function DentalHodDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  // Stats & listings
  const [worklistStats, setWorklistStats] = useState(null);
  const [labStats, setLabStats] = useState(null);
  const [todayWorklist, setTodayWorklist] = useState([]);
  const [recentCases, setRecentCases] = useState([]);
  const [deptIncidents, setDeptIncidents] = useState([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    try {
      const weekAheadStr = format(addDays(new Date(), 7), 'yyyy-MM-dd');
      const [wlStatsRes, labStatsRes, wlRes, casesRes, incRes, apptRes] = await Promise.all([
        getWorklistStats({ date: todayStr }).catch(() => null),
        getDentalStats('monthly').catch(() => null),
        listWorklist({ date: todayStr }).catch(() => null),
        listDentalCases({ period: 'monthly' }).catch(() => null),
        getIncidents().catch(() => null),
        listAppointments({ from: todayStr, to: weekAheadStr }).catch(() => null)
      ]);

      setWorklistStats(wlStatsRes?.data?.data ?? wlStatsRes ?? null);
      setLabStats(labStatsRes?.data?.data ?? labStatsRes ?? null);

      const wlData = wlRes?.data?.data ?? wlRes?.data ?? wlRes ?? [];
      setTodayWorklist(Array.isArray(wlData) ? wlData.slice(0, 5) : []);

      const casesData = casesRes?.data?.data ?? casesRes?.data ?? casesRes ?? [];
      setRecentCases(Array.isArray(casesData) ? casesData.slice(0, 5) : []);

      const apptData = apptRes?.data?.data ?? apptRes?.data ?? apptRes ?? [];
      const upcoming = Array.isArray(apptData)
        ? apptData.filter(a => ['Scheduled', 'Confirmed', 'Checked-In'].includes(a.status)).slice(0, 5)
        : [];
      setUpcomingAppointments(upcoming);

      // Filter incidents for dental department
      const allInc = incRes?.data?.data ?? incRes ?? [];
      if (Array.isArray(allInc)) {
        const filtered = allInc.filter(i => 
          i.department?.toLowerCase().includes('dental') || 
          i.area_of_incident?.toLowerCase().includes('dental')
        );
        setDeptIncidents(filtered.slice(0, 3));
      }
    } catch (err) {
      toast.error('Could not load complete dashboard data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (loading) return <LoadingSpinner />;

  const greeting = now.getHours() < 12 ? 'Good Morning' : now.getHours() < 17 ? 'Good Afternoon' : 'Good Evening';
  const firstName = user?.fullName?.split(' ').slice(-1)[0] || user?.fullName || 'HoD';

  const totalPatients = worklistStats?.total ?? 0;
  const waitingPatients = worklistStats?.waiting ?? 0;
  const labCasesCount = labStats?.totals?.total_cases ?? 0;
  const labRevenue = labStats?.totals?.total_revenue ?? 0;
  const labUnits = labStats?.totals?.total_units ?? 0;

  return (
    <div className="pb-10 w-full space-y-8">
      {/* ── Header / Hero Banner ── */}
      <div className="bg-gradient-to-r from-rose-600 to-pink-500 rounded-3xl p-8 lg:p-10 text-white relative overflow-hidden shadow-lg shadow-rose-100">
        {/* Decorative background shapes */}
        <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-white/5 backdrop-blur-3xl" />
        <div className="absolute top-20 right-48 w-32 h-32 rounded-full bg-white/10 backdrop-blur-3xl" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <p className="m-0 text-sm text-rose-100 font-bold uppercase tracking-widest flex items-center gap-2">
              <Activity size={16} className="text-rose-200" />
              {now.toLocaleDateString('en-RW', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            <h1 className="m-0 text-3xl md:text-4xl font-black text-white drop-shadow-sm leading-tight">
              {greeting}, Dr. {firstName} 👋
            </h1>
            <p className="m-0 text-rose-50 text-sm font-medium">
              You are logged in as the Head of Dental Department. Overseeing clinical workflows & laboratory orders.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-100 backdrop-blur-md">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse" />
              <span className="text-[11px] font-black uppercase tracking-wider">Live Monitoring</span>
            </div>
            <button 
              onClick={fetchDashboardData}
              className="p-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl transition text-white flex items-center justify-center"
              title="Reload Statistics"
            >
              <RefreshCw size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Stats Overview ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <MiniStat 
          label="Today's Patient Queue" 
          value={totalPatients} 
          color="#f43f5e" 
          icon={<Users size={24} />} 
          sub={`${waitingPatients} currently waiting`} 
        />
        <MiniStat 
          label="Active Lab Cases" 
          value={labCasesCount} 
          color="#8b5cf6" 
          icon={<Briefcase size={24} />} 
          sub="prosthetics logs this month" 
        />
        <MiniStat 
          label="Lab Production Units" 
          value={labUnits} 
          color="#06b6d4" 
          icon={<Package size={24} />} 
          sub="units completed or in progress" 
        />
        <MiniStat 
          label="Lab Billing Revenue" 
          value={`RWF ${Number(labRevenue).toLocaleString()}`} 
          color="#10b981" 
          icon={<DollarSign size={24} />} 
          sub="estimated work billing" 
        />
      </div>

      {/* ── Quick Actions ── */}
      <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
        <h3 className="m-0 mb-5 text-base font-black text-slate-800 flex items-center gap-2">
          <Sparkles size={18} className="text-rose-500" /> Departmental Workflow Actions
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-4">
          <QuickAction label="Dental Hub" icon={<Heart size={22} />} color="#f43f5e" path="/dental" navigate={navigate} />
          <QuickAction label="Patient Worklist" icon={<Calendar size={22} />} color="#3b82f6" path="/dental?tab=worklist" navigate={navigate} />
          <QuickAction label="Book Appointment" icon={<CalendarPlus size={22} />} color="#f59e0b" path="/dental?tab=appointments" navigate={navigate} />
          <QuickAction label="Dental Charting" icon={<Stethoscope size={22} />} color="#06b6d4" path="/dental?tab=charting" navigate={navigate} />
          <QuickAction label="Consumables Log" icon={<ClipboardList size={22} />} color="#8b5cf6" path="/consumables-log" navigate={navigate} />
          <QuickAction label="Report Incident" icon={<AlertTriangle size={22} />} color="#e11d48" path="/incidents" navigate={navigate} />
          <QuickAction label="Clinical Sheets" icon={<FileText size={22} />} color="#10b981" path="/clinical-sheets" navigate={navigate} />
        </div>
      </div>

      {/* ── Main Dashboard Body ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Patients Queue */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
            <h3 className="m-0 text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Clock size={16} className="text-rose-500" /> Today's Patient Queue
            </h3>
            <button onClick={() => navigate('/dental?tab=worklist')} className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-0.5">
              Manage Queue <ChevronRight size={14} />
            </button>
          </div>

          {todayWorklist.length === 0 ? (
            <div className="py-14 text-center text-slate-400 flex flex-col items-center justify-center">
              <Users size={36} className="text-slate-200 mb-2" />
              <p className="text-sm font-semibold">No patients scheduled for today</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 flex-1">
              {todayWorklist.map(entry => {
                const conf = STATUS_CONFIG[entry.status] || STATUS_CONFIG['Waiting'];
                return (
                  <div key={entry.id} className="p-4 flex items-center justify-between hover:bg-slate-50/40 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-700">{entry.patient_name}</span>
                        <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded font-mono font-semibold">{entry.patient_id || 'Walk-in'}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                        <span className="font-medium text-rose-500">{entry.appointment_type}</span>
                        <span>•</span>
                        <span>Time: {entry.scheduled_time ? entry.scheduled_time.substring(0, 5) : '--:--'}</span>
                        <span>•</span>
                        <span>Dr. {entry.provider || 'Unassigned'}</span>
                      </div>
                    </div>

                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${conf.bg} ${conf.color} ${conf.border}`}>
                      <span className={`w-1 h-1 rounded-full ${conf.dot}`} />
                      {entry.status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Department Incidents */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
            <h3 className="m-0 text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle size={16} className="text-rose-500" /> Active Incidents
            </h3>
            <button onClick={() => navigate('/incidents')} className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-0.5">
              View All <ChevronRight size={14} />
            </button>
          </div>

          {deptIncidents.length === 0 ? (
            <div className="py-14 text-center text-slate-400 flex flex-col items-center justify-center flex-1">
              <CheckCircle size={36} className="text-emerald-100 mb-2" />
              <p className="text-sm font-semibold">No pending incident reports</p>
              <p className="text-[11px] text-slate-400">All quiet in the Dental department</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 flex-1">
              {deptIncidents.map(inc => (
                <div key={inc.id} className="p-4 space-y-2 hover:bg-slate-50/40 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700 truncate max-w-[150px]">{inc.incident_type}</span>
                    <span className="text-[9px] bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded font-black uppercase tracking-wider">{inc.severity || 'Medium'}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed m-0">{inc.description}</p>
                  <div className="text-[10px] text-slate-400 flex items-center justify-between">
                    <span>By: {inc.reported_by}</span>
                    <span>{inc.created_at ? format(new Date(inc.created_at), 'dd MMM') : ''}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Upcoming Appointments ── */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
          <h3 className="m-0 text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <CalendarClock size={16} className="text-rose-500" /> Upcoming Appointments
          </h3>
          <button onClick={() => navigate('/dental?tab=appointments')} className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-0.5">
            View All <ChevronRight size={14} />
          </button>
        </div>

        {upcomingAppointments.length === 0 ? (
          <div className="py-14 text-center text-slate-400 flex flex-col items-center justify-center">
            <CalendarClock size={36} className="text-slate-200 mb-2" />
            <p className="text-sm font-semibold">No upcoming appointments in the next 7 days</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {upcomingAppointments.map(appt => {
              const conf = APPT_STATUS_CONFIG[appt.status] || APPT_STATUS_CONFIG['Scheduled'];
              return (
                <div key={appt.id} className="p-4 flex items-center justify-between hover:bg-slate-50/40 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-700">{appt.patient_name}</span>
                      {appt.patient_id && (
                        <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded font-mono font-semibold">{appt.patient_id}</span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                      <span className="font-medium text-rose-500">{appt.appointment_type}</span>
                      <span>•</span>
                      <span>{appt.appointment_date ? format(new Date(appt.appointment_date), 'dd MMM') : ''} at {appt.start_time ? appt.start_time.substring(0, 5) : '--:--'}</span>
                      {appt.provider && <><span>•</span><span>Dr. {appt.provider}</span></>}
                    </div>
                  </div>

                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${conf.bg} ${conf.color}`}>
                    {appt.status}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Recent Prosthetics Workorders ── */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
          <h3 className="m-0 text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Package size={16} className="text-rose-500" /> Recent Laboratory Cases
          </h3>
          <button onClick={() => navigate('/dental?section=lab&tab=cases')} className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-0.5">
            Lab Cases Log <ChevronRight size={14} />
          </button>
        </div>

        {recentCases.length === 0 ? (
          <div className="py-14 text-center text-slate-400 flex flex-col items-center justify-center">
            <Package size={36} className="text-slate-200 mb-2" />
            <p className="text-sm font-semibold">No laboratory cases logged this month</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/60 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                  <th className="px-5 py-3">Case Ref</th>
                  <th className="px-5 py-3">Patient ID</th>
                  <th className="px-5 py-3">Work Done</th>
                  <th className="px-5 py-3">Technologist</th>
                  <th className="px-5 py-3 text-right">Units</th>
                  <th className="px-5 py-3 text-right">Total Cost</th>
                  <th className="px-5 py-3">Delivery Required</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                {recentCases.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-bold text-rose-600">{c.case_ref}</td>
                    <td className="px-5 py-3.5">{c.patient_id || '—'}</td>
                    <td className="px-5 py-3.5 font-semibold text-slate-700">{c.work_done}</td>
                    <td className="px-5 py-3.5">{c.technologist || '—'}</td>
                    <td className="px-5 py-3.5 text-right font-medium">{c.units_quantity}</td>
                    <td className="px-5 py-3.5 text-right font-bold text-slate-800">RWF {Number(c.total_cost || 0).toLocaleString()}</td>
                    <td className="px-5 py-3.5">
                      <span className="font-semibold text-slate-500">
                        {c.required_date ? format(new Date(c.required_date), 'dd MMM yyyy') : '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
