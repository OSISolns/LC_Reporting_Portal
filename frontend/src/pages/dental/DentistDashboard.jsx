import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { listWorklist, getWorklistStats, listAppointments, listClinicCases } from '../../api/dental';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';
import { format, addDays } from 'date-fns';
import {
  Heart, Calendar, Clock, DollarSign, Stethoscope, Users,
  AlertTriangle, RefreshCw, ClipboardList, CalendarClock, CalendarPlus,
  Sparkles, ChevronRight, Activity, CheckCircle2, UserCheck
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
  <div className="bg-white rounded-2xl p-4.5 border border-slate-100 flex items-center gap-3.5 hover:-translate-y-0.5 hover:shadow-md hover:border-slate-200 transition-all duration-300 shadow-3xs group">
    <div 
      className="p-3 rounded-xl shrink-0 group-hover:scale-105 transition-transform duration-300"
      style={{ backgroundColor: `${color}10`, color }}
    >
      {icon}
    </div>
    <div>
      <p className="m-0 text-[10px] text-slate-450 font-black uppercase tracking-wider">{label}</p>
      <p className="m-0 mt-0.5 text-xl font-black text-slate-800 leading-none">{value}</p>
      {sub && <p className="text-[9.5px] text-slate-400 mt-1 font-medium">{sub}</p>}
    </div>
  </div>
);

const QuickAction = ({ label, icon, color, path, navigate }) => (
  <button 
    onClick={() => navigate(path)}
    className="p-4 rounded-xl border border-slate-200 bg-white flex flex-col items-center gap-2 cursor-pointer transition-all duration-300 flex-1 min-w-[120px] hover:-translate-y-0.5 hover:shadow-2xs hover:border-rose-355 group"
  >
    <div 
      className="p-2.5 rounded-lg shadow-3xs group-hover:scale-105 transition-transform duration-300"
      style={{ backgroundColor: `${color}12`, color }}
    >
      {icon}
    </div>
    <span className="font-bold text-[11px] text-slate-700 text-center leading-none">{label}</span>
  </button>
);

export default function DentistDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  const [worklistStats, setWorklistStats] = useState(null);
  const [todayQueue, setTodayQueue] = useState([]);
  const [upcomingAppts, setUpcomingAppts] = useState([]);
  const [myLoggedCases, setMyLoggedCases] = useState([]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const fetchDentistData = useCallback(async () => {
    setLoading(true);
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const weekAheadStr = format(addDays(new Date(), 7), 'yyyy-MM-dd');
    const dentistName = user?.fullName || user?.full_name || '';

    try {
      const [wlStatsRes, wlRes, apptRes, casesRes] = await Promise.all([
        getWorklistStats({ date: todayStr }).catch(() => null),
        listWorklist({ date: todayStr }).catch(() => null),
        listAppointments({ from: todayStr, to: weekAheadStr }).catch(() => null),
        listClinicCases({ from: todayStr, to: todayStr }).catch(() => null)
      ]);

      setWorklistStats(wlStatsRes?.data?.data ?? wlStatsRes ?? null);

      const wlData = wlRes?.data?.data ?? wlRes?.data ?? wlRes ?? [];
      setTodayQueue(Array.isArray(wlData) ? wlData : []);

      const apptData = apptRes?.data?.data ?? apptRes?.data ?? apptRes ?? [];
      const dentistAppts = Array.isArray(apptData)
        ? apptData.filter(a => ['Scheduled', 'Confirmed', 'Checked-In'].includes(a.status))
        : [];
      setUpcomingAppts(dentistAppts.slice(0, 5));

      const casesData = casesRes?.data?.data ?? casesRes?.data ?? casesRes ?? [];
      const dentistCases = Array.isArray(casesData)
        ? casesData.filter(c => c.dentist_name?.toLowerCase().includes(dentistName.toLowerCase()))
        : [];
      setMyLoggedCases(dentistCases.slice(0, 5));
    } catch (err) {
      toast.error('Could not load dentist dashboard metrics');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDentistData();
  }, [fetchDentistData]);

  if (loading) return <LoadingSpinner />;

  const greeting = now.getHours() < 12 ? 'Good Morning' : now.getHours() < 17 ? 'Good Afternoon' : 'Good Evening';
  const lastName = user?.fullName?.split(' ').slice(-1)[0] || user?.fullName || 'Doctor';

  // Stats
  const totalPatients = worklistStats?.total ?? 0;
  const waitingPatients = worklistStats?.waiting ?? 0;
  const inChairPatients = todayQueue.filter(p => p.status === 'In Chair').length;
  const completedToday = todayQueue.filter(p => p.status === 'Discharged').length;

  return (
    <div className="pb-10 w-full space-y-6 p-6">
      {/* ── Welcome Banner ── */}
      <div className="bg-gradient-to-r from-teal-600 to-emerald-500 rounded-2xl p-6 lg:p-8 text-white relative overflow-hidden shadow-lg shadow-teal-100">
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/5 backdrop-blur-3xl" />
        <div className="absolute top-16 right-36 w-24 h-24 rounded-full bg-white/10 backdrop-blur-3xl" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <p className="m-0 text-xs text-teal-100 font-bold uppercase tracking-widest flex items-center gap-1.5">
              <Activity size={14} className="text-teal-200" />
              {now.toLocaleDateString('en-RW', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            <h1 className="m-0 text-2xl md:text-3xl font-black text-white drop-shadow-xs leading-none">
              {greeting}, Dr. {lastName} 👋
            </h1>
            <p className="m-0 text-teal-50 text-xs font-semibold">
              Clinical Practitioner Portal — Attending consultations, tracking charts, and organizing treatments.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 border border-white/20 text-white backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-wider">Active Shift</span>
            </div>
            <button 
              onClick={fetchDentistData}
              className="p-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl transition text-white flex items-center justify-center cursor-pointer"
              title="Refresh Queue"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Stats Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MiniStat 
          label="Attending Today" 
          value={totalPatients} 
          color="#0d9488" 
          icon={<Users size={22} />} 
          sub={`${waitingPatients} in queue`} 
        />
        <MiniStat 
          label="Patients In Chair" 
          value={inChairPatients} 
          color="#3b82f6" 
          icon={<UserCheck size={22} />} 
          sub="actively receiving treatment" 
        />
        <MiniStat 
          label="Treated & Discharged" 
          value={completedToday} 
          color="#10b981" 
          icon={<CheckCircle2 size={22} />} 
          sub="procedures finished today" 
        />
        <MiniStat 
          label="My Logged Cases Today" 
          value={myLoggedCases.length} 
          color="#8b5cf6" 
          icon={<ClipboardList size={22} />} 
          sub="clinical charts saved" 
        />
      </div>

      {/* ── Quick Workflow Action Panel ── */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs">
        <h3 className="m-0 mb-4 text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <Sparkles size={14} className="text-teal-500" /> Dentist Workflow Actions
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5">
          <QuickAction label="Dental Hub" icon={<Heart size={20} />} color="#0d9488" path="/dental" navigate={navigate} />
          <QuickAction label="Patient Worklist" icon={<Calendar size={20} />} color="#3b82f6" path="/dental?tab=worklist" navigate={navigate} />
          <QuickAction label="Dental Charting" icon={<Stethoscope size={20} />} color="#06b6d4" path="/dental?tab=charting" navigate={navigate} />
          <QuickAction label="Clinic Cases" icon={<ClipboardList size={20} />} color="#8b5cf6" path="/dental?tab=clinic_cases" navigate={navigate} />
          <QuickAction label="Consumables Log" icon={<ClipboardList size={20} />} color="#f59e0b" path="/dental?section=clinic&tab=consumables_clinic" navigate={navigate} />
        </div>
      </div>

      {/* ── Main Queue & Appointments Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Patient Queue column */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h3 className="m-0 text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Clock size={15} className="text-teal-500" /> Clinic Worklist Queue
            </h3>
            <button onClick={() => navigate('/dental?tab=worklist')} className="text-[11px] font-bold text-teal-600 hover:text-teal-700 flex items-center gap-0.5">
              Manage Queue <ChevronRight size={13} />
            </button>
          </div>

          {todayQueue.length === 0 ? (
            <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center">
              <Users size={32} className="text-slate-200 mb-1" />
              <p className="text-xs font-semibold">No patients waiting in queue</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 flex-1">
              {todayQueue.map(entry => {
                const conf = STATUS_CONFIG[entry.status] || STATUS_CONFIG['Waiting'];
                return (
                  <div key={entry.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50/30 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800">{entry.patient_name}</span>
                        <span className="text-[9.5px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded font-mono font-semibold">{entry.patient_id || 'Walk-in'}</span>
                      </div>
                      <div className="text-[10.5px] text-slate-400 flex items-center gap-1.5">
                        <span className="font-semibold text-teal-500">{entry.appointment_type}</span>
                        <span>•</span>
                        <span>Time: {entry.scheduled_time ? entry.scheduled_time.substring(0, 5) : '--:--'}</span>
                        {entry.provider && (
                          <>
                            <span>•</span>
                            <span>Dr. {entry.provider}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-bold border ${conf.bg} ${conf.color} ${conf.border}`}>
                      <span className={`w-1 h-1 rounded-full ${conf.dot}`} />
                      {entry.status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Today's Appointments column */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h3 className="m-0 text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <CalendarClock size={15} className="text-teal-500" /> Upcoming Bookings
            </h3>
            <button onClick={() => navigate('/dental?tab=appointments')} className="text-[11px] font-bold text-teal-600 hover:text-teal-700 flex items-center gap-0.5">
              Appointments <ChevronRight size={13} />
            </button>
          </div>

          {upcomingAppts.length === 0 ? (
            <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center flex-1">
              <CalendarClock size={32} className="text-slate-200 mb-1" />
              <p className="text-xs font-semibold">No appointments scheduled</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 flex-1">
              {upcomingAppts.map(appt => {
                const conf = APPT_STATUS_CONFIG[appt.status] || APPT_STATUS_CONFIG['Scheduled'];
                return (
                  <div key={appt.id} className="p-3.5 space-y-1.5 hover:bg-slate-50/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">{appt.patient_name}</span>
                      <span className={`inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-bold ${conf.bg} ${conf.color}`}>
                        {appt.status}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 flex justify-between">
                      <span>Type: <strong className="text-teal-600 font-bold">{appt.appointment_type}</strong></span>
                      <span>Time: {appt.start_time?.substring(0, 5) || ''}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
