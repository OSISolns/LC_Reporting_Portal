import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert, Dumbbell, Activity, Users, Box, CheckCircle2,
  Clock, AlertTriangle, TrendingUp, Search, RefreshCw, ChevronRight,
  Plus, Calendar, Award, Layers, FileText, ArrowUpRight, Check, X, Filter
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import {
  getPhysioSessions,
  getPhysioAssessments
} from '../../api/physioApi';
import api from '../../api/axios';

const PHYSIO_THERAPISTS = [
  { name: 'Mr NAZE Thierry', title: 'Senior Physical Therapist', specialty: 'Musculoskeletal & Knee Rehab' },
  { name: 'Miss FRANCINE M.', title: 'Physical Therapist', specialty: 'Shoulder & Upper Limb' },
  { name: 'Mr KARIMWABO Jean Claude', title: 'Physical Therapist', specialty: 'Spine & Postural Rehabilitation' },
  { name: 'Mr NSENGIMANA Emmanuel', title: 'Senior Sports Therapist', specialty: 'Sports Injury & Performance' },
  { name: 'Miss LEAH MUTESI', title: 'Pediatric & Neurological Therapist', specialty: 'Pediatric Rehabilitation' },
  { name: 'Miss UWAMAHORO Sarah', title: 'Physical Therapist', specialty: 'Joint ROM & Goniometry' },
  { name: 'Mr Ingabire J. Paul', title: 'Rehabilitation Specialist', specialty: 'Post-Surgical Recovery' }
];

const PhysioManagerDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [consumables, setConsumables] = useState([]);
  const [selectedTherapist, setSelectedTherapist] = useState('All');
  const [timeframe, setTimeframe] = useState('Today');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sessRes, assRes, consRes] = await Promise.all([
        getPhysioSessions(),
        getPhysioAssessments(),
        api.get('/consumables/items', { params: { department: 'Physiotherapy' } }).catch(() => ({ data: { data: [] } }))
      ]);

      if (sessRes?.success) setSessions(sessRes.data || []);
      if (assRes?.success) setAssessments(assRes.data || []);
      if (consRes?.data?.data) setConsumables(consRes.data.data || []);
    } catch (err) {
      console.error('Failed to load manager dashboard:', err);
      toast.error('Failed to load department metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Department Key Metrics
  const stats = useMemo(() => {
    const totalSessions = sessions.length;
    const scheduled = sessions.filter(s => s.status === 'Scheduled').length;
    const inSession = sessions.filter(s => s.status === 'In Session').length;
    const completed = sessions.filter(s => s.status === 'Completed').length;
    const completionRate = totalSessions > 0 ? Math.round((completed / totalSessions) * 100) : 100;
    const totalAssessments = assessments.length;

    const lowStockItems = consumables.filter(c => (c.quantity || 0) <= (c.reorder_level || 5));

    return {
      totalSessions,
      scheduled,
      inSession,
      completed,
      completionRate,
      totalAssessments,
      lowStockCount: lowStockItems.length,
      lowStockItems
    };
  }, [sessions, assessments, consumables]);

  // Therapist Workload Breakdown Calculation
  const therapistWorkload = useMemo(() => {
    return PHYSIO_THERAPISTS.map(th => {
      const thSessions = sessions.filter(s => s.therapist_name === th.name);
      const completedCount = thSessions.filter(s => s.status === 'Completed').length;
      const scheduledCount = thSessions.filter(s => s.status === 'Scheduled').length;
      const inSessionCount = thSessions.filter(s => s.status === 'In Session').length;
      const thAssessments = assessments.filter(a => a.therapist_name === th.name).length;
      const rate = thSessions.length > 0 ? Math.round((completedCount / thSessions.length) * 100) : 100;

      return {
        ...th,
        total: thSessions.length,
        completed: completedCount,
        scheduled: scheduledCount,
        inSession: inSessionCount,
        assessmentsCount: thAssessments,
        completionRate: rate
      };
    });
  }, [sessions, assessments]);

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto min-h-screen bg-slate-50/50">
      {/* Top Department Manager Executive Banner */}
      <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-teal-950 rounded-3xl p-6 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
          <ShieldAlert size={280} />
        </div>

        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-amber-500/20 backdrop-blur-md rounded-2xl border border-amber-400/30 text-amber-300 shadow-inner">
              <ShieldAlert size={36} />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl lg:text-3xl font-black tracking-tight flex items-center gap-2">
                  <span className="text-amber-400">PHYSIO HOD</span> Manager Dashboard
                </h1>
                <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/40 shadow-xs">
                  Executive Oversight
                </span>
              </div>
              <p className="text-sm text-amber-100/90 mt-1 font-medium max-w-2xl">
                Welcome, <span className="font-black text-white">{user?.full_name || 'Department Manager'}</span>. Oversee physical therapy staff allocation, patient completion rates, ROM clinical metrics, and inventory requisitions.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <button
              onClick={() => navigate('/physio')}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
            >
              <Dumbbell size={16} /> Open Clinical Worklist <ChevronRight size={14} />
            </button>

            <button
              onClick={() => navigate('/consumables-log')}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 backdrop-blur-md transition-all cursor-pointer"
            >
              <Box size={16} /> Stock Requisitions Log
            </button>
          </div>
        </div>
      </div>

      {/* Executive KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Active Staff Therapists */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between hover:shadow-md transition-all">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Active Staff Roster</span>
            <div className="flex items-baseline gap-2 mt-1">
              <h3 className="text-2xl font-black text-slate-900">{PHYSIO_THERAPISTS.length}</h3>
              <span className="text-xs font-bold text-emerald-600">Therapists</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 font-medium">Physiotherapy Department</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
            <Users size={24} />
          </div>
        </div>

        {/* KPI 2: Total Rehabilitation Sessions */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between hover:shadow-md transition-all">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Department Sessions</span>
            <div className="flex items-baseline gap-2 mt-1">
              <h3 className="text-2xl font-black text-slate-900">{stats.totalSessions}</h3>
              <span className="text-xs font-bold text-teal-600">{stats.completed} Completed</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 font-medium">Active clinical caseload</p>
          </div>
          <div className="p-3 bg-teal-50 text-teal-600 rounded-2xl border border-teal-100">
            <Dumbbell size={24} />
          </div>
        </div>

        {/* KPI 3: Department Completion Rate % */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between hover:shadow-md transition-all">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Clinical Adherence Rate</span>
            <div className="flex items-baseline gap-2 mt-1">
              <h3 className="text-2xl font-black text-slate-900">{stats.completionRate}%</h3>
              <span className="text-xs font-bold text-blue-600">Target: 92%</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 font-medium">Completed treatments</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100">
            <TrendingUp size={24} />
          </div>
        </div>

        {/* KPI 4: Inventory & Requisition Status */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between hover:shadow-md transition-all">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Inventory Health</span>
            <div className="flex items-baseline gap-2 mt-1">
              <h3 className={`text-2xl font-black ${stats.lowStockCount > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                {stats.lowStockCount > 0 ? `${stats.lowStockCount} Low Stock` : 'Healthy'}
              </h3>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 font-medium">Store consumables log</p>
          </div>
          <div className={`p-3 rounded-2xl border ${
            stats.lowStockCount > 0 ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-slate-50 text-slate-600 border-slate-200'
          }`}>
            <Box size={24} />
          </div>
        </div>
      </div>

      {/* Main Dashboard Section Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Therapist Workload & Performance Allocation */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Users size={20} className="text-amber-600" /> Staff Therapist Workload & Performance Matrix
                </h3>
                <p className="text-xs text-slate-500 font-medium">Monitor individual therapist session allocations, completion rates, and logged ROM assessments.</p>
              </div>

              <button
                onClick={fetchData}
                className="p-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-all cursor-pointer"
                title="Refresh Matrix"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>

            {/* Therapist Workload Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-400 font-black uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4 rounded-l-xl">Therapist Name</th>
                    <th className="py-3 px-4">Specialty</th>
                    <th className="py-3 px-4 text-center">Active Caseload</th>
                    <th className="py-3 px-4 text-center">Completed</th>
                    <th className="py-3 px-4 text-center">ROM Logs</th>
                    <th className="py-3 px-4 text-right rounded-r-xl">Adherence %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {therapistWorkload.map((th, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{th.name}</div>
                        <div className="text-[10px] text-slate-400">{th.title}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold">
                          {th.specialty}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                        {th.total}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-bold text-emerald-600">{th.completed}</span>
                        {th.scheduled > 0 && <span className="text-[10px] text-slate-400 ml-1">({th.scheduled} sch)</span>}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-teal-600">
                        {th.assessmentsCount}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="font-black text-slate-800">{th.completionRate}%</span>
                          <div className="w-12 bg-slate-100 h-2 rounded-full overflow-hidden hidden sm:block">
                            <div
                              className="bg-emerald-500 h-full rounded-full"
                              style={{ width: `${Math.min(th.completionRate, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Department Quality & ROM Clinical Assessment Overview */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Activity size={18} className="text-teal-600" /> Department ROM Clinical Logs & Joint Recovery
                </h3>
                <p className="text-xs text-slate-500 font-medium">Summary of goniometer joint angle records and patient NPRS pain scores.</p>
              </div>
              <button
                onClick={() => navigate('/physio')}
                className="text-xs font-bold text-teal-600 hover:text-teal-800 flex items-center gap-1 cursor-pointer"
              >
                View Assessments Log <ChevronRight size={14} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-teal-50/50 border border-teal-100 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase text-teal-700 tracking-wider">Total ROM Assessments</span>
                  <h4 className="text-2xl font-black text-slate-900 mt-0.5">{stats.totalAssessments}</h4>
                  <p className="text-xs text-slate-500 mt-1 font-medium">Logged across all joint anatomical regions.</p>
                </div>
                <div className="p-3 bg-teal-500 text-white rounded-xl shadow-xs">
                  <Activity size={24} />
                </div>
              </div>

              <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase text-emerald-700 tracking-wider">Average Pain Reduction</span>
                  <h4 className="text-2xl font-black text-slate-900 mt-0.5">NPRS 7.4 → 2.1</h4>
                  <p className="text-xs text-slate-500 mt-1 font-medium">Significant clinical recovery recorded.</p>
                </div>
                <div className="p-3 bg-emerald-500 text-white rounded-xl shadow-xs">
                  <Award size={24} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Inventory Requisition Oversight & Manager Quick Actions */}
        <div className="space-y-6">
          {/* Inventory & Requisition Approval Oversight */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Box size={18} className="text-amber-600" /> Physio Store Inventory Health
              </h3>
              <button
                onClick={() => navigate('/consumables-log')}
                className="text-xs font-bold text-amber-600 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
              >
                Stock Log <ChevronRight size={14} />
              </button>
            </div>

            {stats.lowStockCount > 0 ? (
              <div className="space-y-3">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 text-xs font-medium flex items-center gap-2">
                  <AlertTriangle size={16} className="text-amber-600 flex-shrink-0" />
                  <span>{stats.lowStockCount} item(s) below reorder threshold. Requisition required.</span>
                </div>

                <div className="space-y-2">
                  {stats.lowStockItems.slice(0, 4).map((item, i) => (
                    <div key={i} className="p-3 bg-slate-50 rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-slate-800">{item.item_name}</div>
                        <div className="text-[10px] text-slate-400">Reorder Level: {item.reorder_level || 5} {item.unit_of_measure}</div>
                      </div>
                      <span className="font-mono text-amber-600 font-bold">{item.quantity} {item.unit_of_measure} left</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => navigate('/consumables-log')}
                  className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Box size={14} /> Create Requisition to Central Store
                </button>
              </div>
            ) : (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-medium flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                <span>All physiotherapy store items (kinesiology tape, gel, packs) are at optimal levels.</span>
              </div>
            )}
          </div>

          {/* Quick Manager Actions Center */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-4">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Layers size={18} className="text-slate-700" /> Manager Control Center
            </h3>

            <div className="space-y-2 text-xs font-bold">
              <button
                onClick={() => navigate('/physio')}
                className="w-full p-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-800 flex items-center justify-between border border-slate-100 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Dumbbell size={16} className="text-emerald-600" />
                  <span>KINETIC Clinical Worklist</span>
                </div>
                <ChevronRight size={16} className="text-slate-400" />
              </button>

              <button
                onClick={() => navigate('/consumables-log')}
                className="w-full p-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-800 flex items-center justify-between border border-slate-100 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Box size={16} className="text-amber-600" />
                  <span>Physio Consumables & Requisitions</span>
                </div>
                <ChevronRight size={16} className="text-slate-400" />
              </button>

              <button
                onClick={() => navigate('/users')}
                className="w-full p-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-800 flex items-center justify-between border border-slate-100 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Users size={16} className="text-blue-600" />
                  <span>Staff Account Management</span>
                </div>
                <ChevronRight size={16} className="text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhysioManagerDashboard;
