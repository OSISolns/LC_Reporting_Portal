import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dumbbell, Activity, Calendar, Clock, CheckCircle2, User,
  Plus, Search, ArrowRight, ShieldAlert, Layers,
  FileText, TrendingUp, AlertTriangle, RefreshCw, ChevronRight,
  BarChart3, HeartPulse, Sliders, Box, X
} from 'lucide-react';
import toast from 'react-hot-toast';
import PatientAutocomplete from '../../components/PatientAutocomplete';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import { getPhysiotherapists } from '../../api/providers';
import {
  getPhysioSessions,
  createPhysioSession,
  updatePhysioSessionStatus,
  getPhysioAssessments
} from '../../api/physioApi';

const PHYSIO_THERAPISTS = [
  'Mr NAZE Thierry',
  'Miss FRANCINE M.',
  'Mr KARIMWABO Jean Claude',
  'Mr NSENGIMANA Emmanuel',
  'Miss LEAH MUTESI',
  'Miss UWAMAHORO Sarah',
  'Mr Ingabire J. Paul'
];

const BODY_REGIONS = [
  { id: 'Knee',          label: 'Knee',             code: 'KNE' },
  { id: 'Glenohumeral',  label: 'Shoulder',          code: 'SHL' },
  { id: 'Hip',           label: 'Hip',               code: 'HIP' },
  { id: 'Lumbar',        label: 'Lumbar Spine',      code: 'LMB' },
  { id: 'Talocrural',    label: 'Ankle & Foot',      code: 'ANK' },
  { id: 'Humeroulnar',   label: 'Elbow & Forearm',   code: 'ELB' },
  { id: 'Cervical',      label: 'Cervical Spine',    code: 'CER' },
  { id: 'Radiocarpal',   label: 'Wrist & Hand',      code: 'WST' },
  { id: 'Tibiofemoral',  label: 'Knee (Tibio.)',     code: 'TIB' },
  { id: 'SI',            label: 'Sacroiliac (SI)',   code: 'SAC' },
];

const POPULAR_EXERCISES = [
  { name: 'Quadriceps Isometric Sets', category: 'Knee', prescriptionCount: 42, target: 'Strengthening' },
  { name: 'Codman Pendulum Exercises', category: 'Shoulder', prescriptionCount: 38, target: 'Mobility' },
  { name: 'Straight Leg Raises (SLR)', category: 'Lower Limb', prescriptionCount: 35, target: 'Endurance' },
  { name: 'Lumbar Cat-Cow Mobility', category: 'Spine', prescriptionCount: 29, target: 'Flexibility' },
  { name: 'Resistance Band Rotations', category: 'Shoulder', prescriptionCount: 24, target: 'Stabilization' }
];

const PhysiotherapistDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [consumables, setConsumables] = useState([]);
  const [selectedTherapist, setSelectedTherapist] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const [physioStaff, setPhysioStaff] = useState([]);

  // Quick Schedule Modal State
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [newSession, setNewSession] = useState({
    patient_id: '',
    patient_name: '',
    therapist_name: user?.full_name || '',
    session_date: new Date().toISOString().split('T')[0],
    treatment_area: 'Knee',
    progress_notes: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sessRes, assRes, consRes, provRes] = await Promise.all([
        getPhysioSessions().catch(() => ({ success: false, data: [] })),
        getPhysioAssessments().catch(() => ({ success: false, data: [] })),
        api.get('/clinical/inventory/consumables', { params: { department: 'Physiotherapy' } }).catch(() => ({ data: { data: [] } })),
        getPhysiotherapists().catch(() => null)
      ]);

      if (sessRes?.success) setSessions(sessRes.data || []);
      if (assRes?.success) setAssessments(assRes.data || []);
      if (consRes?.data?.data) setConsumables(consRes.data.data || []);

      const provList = provRes?.data || provRes || [];
      if (Array.isArray(provList) && provList.length > 0) {
        setPhysioStaff(provList.map(p => p.name).filter(Boolean));
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      toast.error('Failed to load physiotherapy metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered Sessions for Today
  const todayStr = new Date().toISOString().split('T')[0];

  const filteredSessions = useMemo(() => {
    return sessions.filter(s => {
      const matchesSearch =
        !searchQuery ||
        s.patient_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.patient_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.treatment_area?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesTherapist =
        selectedTherapist === 'All' || s.therapist_name === selectedTherapist;

      return matchesSearch && matchesTherapist;
    });
  }, [sessions, searchQuery, selectedTherapist]);

  // Key Statistics Metrics
  const stats = useMemo(() => {
    const total = sessions.length;
    const scheduled = sessions.filter(s => s.status === 'Scheduled').length;
    const inSession = sessions.filter(s => s.status === 'In Session').length;
    const completed = sessions.filter(s => s.status === 'Completed').length;
    const totalAssessments = assessments.length;
    const lowStockItems = consumables.filter(c => (c.quantity || 0) <= (c.reorder_level || 5));

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 100;

    return {
      total,
      scheduled,
      inSession,
      completed,
      completionRate,
      totalAssessments,
      lowStockCount: lowStockItems.length,
      lowStockItems
    };
  }, [sessions, assessments, consumables]);

  // Session Status Update Handler
  const handleUpdateStatus = async (id, newStatus) => {
    try {
      const res = await updatePhysioSessionStatus(id, newStatus);
      if (res?.success) {
        toast.success(`Session status updated to ${newStatus}`);
        setSessions(prev =>
          prev.map(s => (s.id === id ? { ...s, status: newStatus } : s))
        );
      }
    } catch (err) {
      toast.error('Failed to update session status.');
    }
  };

  // Create Quick Session Handler
  const handleCreateSession = async (e) => {
    e.preventDefault();
    if (!newSession.patient_id || !newSession.patient_name) {
      return toast.error('Patient ID and Name are required.');
    }

    try {
      const res = await createPhysioSession({
        ...newSession,
        exercises_prescribed: JSON.stringify([
          { name: 'Isometric Quadriceps Sets', sets: 3, reps: 15, hold: 5 },
          { name: 'Straight Leg Raises (SLR)', sets: 3, reps: 12, hold: 3 }
        ])
      });

      if (res?.success) {
        toast.success('Rehab session scheduled!');
        setShowScheduleModal(false);
        setNewSession({
          patient_id: '',
          patient_name: '',
          therapist_name: user?.full_name || PHYSIO_THERAPISTS[0],
          session_date: new Date().toISOString().split('T')[0],
          treatment_area: 'Knee',
          progress_notes: ''
        });
        fetchData();
      }
    } catch (err) {
      toast.error('Failed to schedule session.');
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto bg-slate-50/50">
      {/* Top Welcome & Role Switcher Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-emerald-600">
            <HeartPulse size={28} />
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold tracking-tight text-slate-800">
                Physiotherapy Dashboard
              </h1>
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Therapist Workspace
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-medium max-w-2xl">
              Welcome back, <span className="font-semibold text-slate-700">{user?.full_name || 'Therapist'}</span>. Daily patient sessions, range-of-motion assessments, and department inventory.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <button
            onClick={() => setShowScheduleModal(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <Plus size={16} /> Schedule Patient Session
          </button>

          <button
            onClick={() => navigate('/physio')}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-black text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Layers size={16} /> Open Full Physio Hub <ChevronRight size={14} />
          </button>
        </div>
      </div>



      {/* KPI Cards Overview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between hover:shadow-md transition-all">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Today's Rehab Sessions</span>
            <div className="flex items-baseline gap-2 mt-1">
              <h3 className="text-2xl font-black text-slate-900">{stats.total}</h3>
              <span className="text-xs font-bold text-emerald-600">{stats.completed} Completed</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 font-medium">Active clinical queue</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
            <Calendar size={24} />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between hover:shadow-md transition-all">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">ROM & Pain Assessments</span>
            <div className="flex items-baseline gap-2 mt-1">
              <h3 className="text-2xl font-black text-slate-900">{stats.totalAssessments}</h3>
              <span className="text-xs font-bold text-teal-600">Logged</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 font-medium">Goniometer degree records</p>
          </div>
          <div className="p-3 bg-teal-50 text-teal-600 rounded-2xl border border-teal-100">
            <Activity size={24} />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between hover:shadow-md transition-all">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Session Completion Rate</span>
            <div className="flex items-baseline gap-2 mt-1">
              <h3 className="text-2xl font-black text-slate-900">{stats.completionRate}%</h3>
              <span className="text-xs font-bold text-blue-600">Target: 90%</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 font-medium">Rehabilitation adherence</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100">
            <TrendingUp size={24} />
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between hover:shadow-md transition-all">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Consumable Stock Status</span>
            <div className="flex items-baseline gap-2 mt-1">
              <h3 className={`text-2xl font-black ${stats.lowStockCount > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                {stats.lowStockCount > 0 ? `${stats.lowStockCount} Low` : 'Optimal'}
              </h3>
              <span className="text-xs font-bold text-slate-500">In Physio Store</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 font-medium">Ultrasound gel, tape, bands</p>
          </div>
          <div className={`p-3 rounded-2xl border ${
            stats.lowStockCount > 0 ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-slate-50 text-slate-600 border-slate-200'
          }`}>
            <AlertTriangle size={24} />
          </div>
        </div>
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Rehabilitation Patient Queue */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Dumbbell size={20} className="text-emerald-600" /> Active Rehabilitation Worklist
                </h3>
                <p className="text-xs text-slate-500 font-medium">Manage today's scheduled sessions, patient progress notes & exercise plans.</p>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search patient, ID or treatment area..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs font-medium border border-slate-200 rounded-xl bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  />
                </div>

                <button
                  onClick={fetchData}
                  className="p-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-all cursor-pointer"
                  title="Refresh Queue"
                >
                  <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            {/* Sessions Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-400 font-black uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4 rounded-l-xl">Patient Details</th>
                    <th className="py-3 px-4">Treatment Area</th>
                    <th className="py-3 px-4">Assigned Therapist</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right rounded-r-xl">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredSessions.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{s.patient_name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">ID: {s.patient_id}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-lg bg-teal-50 text-teal-700 border border-teal-200/60 font-bold text-[11px]">
                          {s.treatment_area || 'Knee'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-semibold">
                        {s.therapist_name}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${
                          s.status === 'Completed'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : s.status === 'In Session'
                            ? 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {s.status === 'Scheduled' && (
                            <button
                              onClick={() => handleUpdateStatus(s.id, 'In Session')}
                              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold rounded-lg transition-all cursor-pointer"
                            >
                              Start
                            </button>
                          )}

                          {s.status === 'In Session' && (
                            <button
                              onClick={() => handleUpdateStatus(s.id, 'Completed')}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1"
                            >
                              <CheckCircle2 size={12} /> Complete
                            </button>
                          )}

                          <button
                            onClick={() => navigate('/physio')}
                            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-all"
                            title="Open Assessment Logger in Physio Hub"
                          >
                            <ChevronRight size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filteredSessions.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        <Dumbbell size={28} className="mx-auto opacity-30 mb-2" />
                        <p className="font-semibold text-slate-600">No rehab sessions found for today.</p>
                        <p className="text-xs mt-0.5">Click "Schedule Patient Session" above to add a new appointment.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Range of Motion (ROM) Joint Distribution */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Activity size={18} className="text-teal-600" /> Anatomical Range of Motion (ROM) Benchmark Targets
                </h3>
                <p className="text-xs text-slate-500 font-medium">Standard joint goniometer degrees and assessment targets.</p>
              </div>
              <button
                onClick={() => navigate('/physio')}
                className="text-xs font-bold text-teal-600 hover:text-teal-800 flex items-center gap-1 cursor-pointer"
              >
                Log Joint Degrees <ChevronRight size={14} />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {BODY_REGIONS.map(reg => (
                <div key={reg.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 hover:bg-white hover:border-slate-300 transition-all">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">{reg.code}</span>
                    <span className="text-[10px] font-medium text-slate-400">{reg.id}</span>
                  </div>
                  <h4 className="text-xs font-semibold text-slate-800">{reg.label}</h4>
                  <div className="mt-2 text-[11px] text-slate-500 space-y-0.5 font-medium">
                    <div>Flexion: <span className="font-semibold text-slate-700">120° – 180°</span></div>
                    <div>Extension: <span className="font-semibold text-slate-700">0° – 60°</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Prescriptions, Low Stock Alert & Quick Tools */}
        <div className="space-y-6">
          {/* Preset Exercise Prescriptions Library */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Layers size={18} className="text-emerald-600" /> Popular Exercise Routines
              </h3>
              <span className="text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">
                Prescriptions
              </span>
            </div>

            <div className="space-y-2.5">
              {POPULAR_EXERCISES.map((ex, idx) => (
                <div key={idx} className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between hover:bg-slate-100/80 transition-all">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">{ex.name}</h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-semibold text-slate-500">{ex.category}</span>
                      <span className="text-[10px] font-bold text-teal-600">({ex.target})</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-slate-700">{ex.prescriptionCount}</span>
                    <span className="text-[10px] text-slate-400 block">Prescribed</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Physio Consumables & Stock Alert Widget */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Box size={18} className="text-amber-600" /> Physio Supply Alert
              </h3>
              <button
                onClick={() => navigate('/consumables-log')}
                className="text-xs font-bold text-amber-600 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
              >
                Log Supply <ChevronRight size={14} />
              </button>
            </div>

            {stats.lowStockCount > 0 ? (
              <div className="space-y-3">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 text-xs font-medium flex items-center gap-2">
                  <AlertTriangle size={16} className="text-amber-600 flex-shrink-0" />
                  <span>{stats.lowStockCount} consumable item(s) need replenishment from Central Store.</span>
                </div>

                <div className="space-y-2">
                  {stats.lowStockItems.slice(0, 3).map((item, i) => (
                    <div key={i} className="p-2.5 bg-slate-50 rounded-xl flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800">{item.item_name}</span>
                      <span className="font-mono text-amber-600 font-bold">{item.quantity} {item.unit_of_measure} left</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-medium flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                <span>All physiotherapy consumables (tape, gel, bands) are adequately stocked.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Schedule Session Modal */}
      {showScheduleModal && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowScheduleModal(false); }}
          className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 border border-slate-200/80">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Calendar size={18} className="text-emerald-600" /> Schedule Rehabilitation Session
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Select a patient from the register and assign session goals.</p>
              </div>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateSession} className="space-y-4 text-xs font-medium">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Patient Search (SUKRAA Register) *</label>
                <PatientAutocomplete
                  value={newSession.patient_name}
                  onChange={(val) => {
                    setNewSession(prev => (
                      prev.patient_id && val !== prev.patient_name
                        ? { ...prev, patient_name: val, patient_id: '' }
                        : { ...prev, patient_name: val }
                    ));
                  }}
                  onPatientSelect={(p) => setNewSession(prev => ({
                    ...prev,
                    patient_id: p.pid || '',
                    patient_name: p.full_name || ''
                  }))}
                  placeholder="Search by patient name, PID or phone..."
                  inputStyle={{
                    width: '100%',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '9px 12px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    outline: 'none'
                  }}
                />
                {newSession.patient_id && (
                  <div className="mt-1.5 text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 size={13} /> Linked to Patient ID {newSession.patient_id}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Assigned Therapist</label>
                  <select
                    value={newSession.therapist_name}
                    onChange={e => setNewSession({ ...newSession, therapist_name: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium"
                  >
                    {(physioStaff.length > 0 ? physioStaff : PHYSIO_THERAPISTS).map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Anatomical Region</label>
                  <select
                    value={newSession.treatment_area}
                    onChange={e => setNewSession({ ...newSession, treatment_area: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium"
                  >
                    {BODY_REGIONS.map(b => (
                      <option key={b.id} value={b.id}>{b.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Session Date</label>
                <input
                  type="date"
                  value={newSession.session_date}
                  onChange={e => setNewSession({ ...newSession, session_date: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Progress & Clinical Notes</label>
                <textarea
                  rows={3}
                  placeholder="Enter session objectives, ROM targets or clinical instructions..."
                  value={newSession.progress_notes}
                  onChange={e => setNewSession({ ...newSession, progress_notes: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 resize-none transition-all"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  Schedule Session
                </button>
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhysiotherapistDashboard;
