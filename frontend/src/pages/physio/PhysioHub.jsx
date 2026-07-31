import React, { useState, useEffect, useMemo } from 'react';
import {
  Dumbbell, Activity, ClipboardList, Plus, Search, Calendar,
  User, CheckCircle2, Clock, Play, RotateCcw, Award, Flame,
  FileText, Sparkles, ChevronRight, Sliders, AlertCircle, ShieldAlert,
  Send, Layers, RefreshCw, X, Printer
} from 'lucide-react';
import toast from 'react-hot-toast';
import ConsumablesLog from '../ConsumablesLog';
import {
  getPhysioSessions,
  createPhysioSession,
  updatePhysioSessionStatus,
  getPhysioAssessments,
  createPhysioAssessment
} from '../../api/physioApi';

// Physio Therapists list from DB configuration
const PHYSIO_THERAPISTS = [
  'Mr NAZE Thierry',
  'Miss FRANCINE M.',
  'Mr KARIMWABO Jean Claude',
  'Mr NSENGIMANA Emmanuel',
  'Miss LEAH MUTESI',
  'Miss UWAMAHORO Sarah',
  'Mr Ingabire J. Paul'
];

// Anatomical Body Regions & Normal ROM benchmarks
const BODY_REGIONS = [
  { id: 'Knee', label: 'Knee Joint', normalFlexion: 135, normalExtension: 0 },
  { id: 'Shoulder', label: 'Shoulder Joint', normalFlexion: 180, normalExtension: 60, normalAbduction: 180 },
  { id: 'Hip', label: 'Hip Joint', normalFlexion: 120, normalExtension: 30, normalAbduction: 45 },
  { id: 'Spine', label: 'Lumbar / Cervical Spine', normalFlexion: 60, normalExtension: 25 },
  { id: 'Ankle', label: 'Ankle & Foot', normalFlexion: 50, normalExtension: 20 },
  { id: 'Elbow', label: 'Elbow & Forearm', normalFlexion: 150, normalExtension: 0 }
];

// Preset Exercise Library
const PRESET_EXERCISES = [
  { id: 'ex-1', name: 'Quadriceps Isometric Sets', category: 'Knee', defaultSets: 3, defaultReps: 15, defaultHold: 5 },
  { id: 'ex-2', name: 'Codman Shoulder Pendulum', category: 'Shoulder', defaultSets: 3, defaultReps: 10, defaultHold: 0 },
  { id: 'ex-3', name: 'Straight Leg Raises (SLR)', category: 'Lower Limb', defaultSets: 3, defaultReps: 12, defaultHold: 3 },
  { id: 'ex-4', name: 'Lumbar Cat-Cow Mobility', category: 'Spine', defaultSets: 2, defaultReps: 10, defaultHold: 5 },
  { id: 'ex-5', name: 'Resistance Band External Rotation', category: 'Shoulder', defaultSets: 3, defaultReps: 12, defaultHold: 2 },
  { id: 'ex-6', name: 'Wall Sits & Squats', category: 'Knee', defaultSets: 3, defaultReps: 10, defaultHold: 10 },
  { id: 'ex-7', name: 'Ankle Pumps & Alphabet', category: 'Ankle', defaultSets: 3, defaultReps: 20, defaultHold: 0 },
  { id: 'ex-8', name: 'Cervical Retraction (Chin Tucks)', category: 'Spine', defaultSets: 3, defaultReps: 10, defaultHold: 5 }
];

const PhysioHub = () => {
  const [activeTab, setActiveTab] = useState('rehab');
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState('therapist'); // 'therapist' | 'manager'

  // Sessions state
  const [sessions, setSessions] = useState([]);
  const [sessionSearch, setSessionSearch] = useState('');
  const [sessionStatusFilter, setSessionStatusFilter] = useState('All');
  const [selectedTherapistFilter, setSelectedTherapistFilter] = useState('All');
  const [showNewSessionModal, setShowNewSessionModal] = useState(false);

  // New Session Form State
  const [newSession, setNewSession] = useState({
    patient_id: '',
    patient_name: '',
    therapist_name: PHYSIO_THERAPISTS[0],
    session_date: new Date().toISOString().split('T')[0],
    treatment_area: 'Knee',
    progress_notes: ''
  });
  const [selectedExercisesForSession, setSelectedExercisesForSession] = useState([]);

  // Assessments state
  const [assessments, setAssessments] = useState([]);
  const [assessmentSearch, setAssessmentSearch] = useState('');
  const [showNewAssessmentModal, setShowNewAssessmentModal] = useState(false);

  // New Assessment Form State
  const [newAssessment, setNewAssessment] = useState({
    patient_id: '',
    patient_name: '',
    therapist_name: PHYSIO_THERAPISTS[0],
    body_part: 'Knee',
    chief_complaint: '',
    flexion: 90,
    extension: 0,
    pain_score: 5,
    muscle_grade: 'Grade 4 (Good)',
    functional_goals: '',
    treatment_plan: ''
  });

  // Fetch initial data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [sessRes, assRes] = await Promise.all([
        getPhysioSessions(),
        getPhysioAssessments()
      ]);

      if (sessRes?.success) setSessions(sessRes.data || []);
      if (assRes?.success) setAssessments(assRes.data || []);
    } catch (err) {
      console.error('Failed to fetch physio data:', err);
      toast.error('Failed to load physio records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered Sessions
  const filteredSessions = useMemo(() => {
    return sessions.filter(s => {
      const matchesSearch =
        !sessionSearch ||
        s.patient_name?.toLowerCase().includes(sessionSearch.toLowerCase()) ||
        s.patient_id?.toLowerCase().includes(sessionSearch.toLowerCase()) ||
        s.treatment_area?.toLowerCase().includes(sessionSearch.toLowerCase());

      const matchesStatus = sessionStatusFilter === 'All' || s.status === sessionStatusFilter;
      const matchesTherapist = selectedTherapistFilter === 'All' || s.therapist_name === selectedTherapistFilter;

      return matchesSearch && matchesStatus && matchesTherapist;
    });
  }, [sessions, sessionSearch, sessionStatusFilter, selectedTherapistFilter]);

  // Session Statistics
  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const scheduled = sessions.filter(s => s.status === 'Scheduled').length;
    const inSession = sessions.filter(s => s.status === 'In Session').length;
    const completed = sessions.filter(s => s.status === 'Completed').length;
    return { total: sessions.length, scheduled, inSession, completed };
  }, [sessions]);

  // Handlers for Session status change
  const handleUpdateSessionStatus = async (id, newStatus) => {
    try {
      const res = await updatePhysioSessionStatus(id, { status: newStatus });
      if (res?.success) {
        toast.success(`Session status updated to ${newStatus}`);
        setSessions(prev => prev.map(s => s.id === id ? { ...s, status: newStatus } : s));
      }
    } catch (err) {
      toast.error('Failed to update session status.');
    }
  };

  // Submit New Session
  const handleCreateSession = async (e) => {
    e.preventDefault();
    if (!newSession.patient_id || !newSession.session_date) {
      return toast.error('Patient ID and Session Date are required.');
    }

    try {
      const payload = {
        ...newSession,
        exercises_prescribed: selectedExercisesForSession
      };
      const res = await createPhysioSession(payload);
      if (res?.success) {
        toast.success('Rehabilitation session scheduled!');
        setShowNewSessionModal(false);
        setNewSession({
          patient_id: '',
          patient_name: '',
          therapist_name: PHYSIO_THERAPISTS[0],
          session_date: new Date().toISOString().split('T')[0],
          treatment_area: 'Knee',
          progress_notes: ''
        });
        setSelectedExercisesForSession([]);
        fetchData();
      }
    } catch (err) {
      toast.error('Failed to schedule rehab session.');
    }
  };

  // Submit New Assessment
  const handleCreateAssessment = async (e) => {
    e.preventDefault();
    if (!newAssessment.patient_id || !newAssessment.body_part) {
      return toast.error('Patient ID and anatomical body part are required.');
    }

    try {
      const payload = {
        patient_id: newAssessment.patient_id,
        patient_name: newAssessment.patient_name,
        therapist_name: newAssessment.therapist_name,
        body_part: newAssessment.body_part,
        chief_complaint: newAssessment.chief_complaint,
        rom_data: { flexion: newAssessment.flexion, extension: newAssessment.extension },
        pain_score: newAssessment.pain_score,
        muscle_grade: newAssessment.muscle_grade,
        functional_goals: newAssessment.functional_goals,
        treatment_plan: newAssessment.treatment_plan
      };

      const res = await createPhysioAssessment(payload);
      if (res?.success) {
        toast.success('Physio assessment saved!');
        setShowNewAssessmentModal(false);
        setNewAssessment({
          patient_id: '',
          patient_name: '',
          therapist_name: PHYSIO_THERAPISTS[0],
          body_part: 'Knee',
          chief_complaint: '',
          flexion: 90,
          extension: 0,
          pain_score: 5,
          muscle_grade: 'Grade 4 (Good)',
          functional_goals: '',
          treatment_plan: ''
        });
        fetchData();
      }
    } catch (err) {
      toast.error('Failed to save assessment.');
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto min-h-screen">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/20 backdrop-blur-md rounded-2xl border border-emerald-400/30 text-emerald-300">
              <Dumbbell size={28} />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
                  <span className="text-emerald-400">KINETIC</span> Physiotherapy Portal
                </h1>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                  userRole === 'manager'
                    ? 'bg-amber-400/20 text-amber-300 border-amber-400/40'
                    : 'bg-emerald-400/20 text-emerald-300 border-emerald-400/40'
                }`}>
                  {userRole === 'manager' ? 'Manager Mode' : 'Therapist Mode'}
                </span>
              </div>
              <p className="text-xs text-emerald-100/80 mt-0.5 font-medium">
                Physical rehabilitation, joint range-of-motion assessments, exercise programs & supply logs.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Active Role Selector Switcher */}
          <div className="bg-slate-900/80 border border-emerald-400/30 p-1 rounded-2xl flex items-center gap-1 shadow-inner">
            <button
              onClick={() => setUserRole('therapist')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                userRole === 'therapist'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'text-emerald-200/80 hover:text-white'
              }`}
            >
              Therapist
            </button>
            <button
              onClick={() => setUserRole('manager')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                userRole === 'manager'
                  ? 'bg-amber-400 text-slate-950 shadow-md'
                  : 'text-emerald-200/80 hover:text-white'
              }`}
            >
              Manager
            </button>
          </div>

          <button
            onClick={() => setShowNewAssessmentModal(true)}
            className="flex-1 md:flex-none px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
          >
            <Plus size={16} /> New Assessment
          </button>

          <button
            onClick={() => setShowNewSessionModal(true)}
            className="flex-1 md:flex-none px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 backdrop-blur-md transition-all cursor-pointer"
          >
            <Calendar size={16} /> Schedule Session
          </button>
        </div>
      </div>

      {/* Metrics Summary Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Active Sessions</span>
            <h3 className="text-xl font-black text-slate-800 mt-0.5">{stats.total}</h3>
          </div>
          <div className="p-2.5 bg-slate-50 text-slate-600 rounded-xl">
            <Activity size={20} />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-amber-600 tracking-wider">Scheduled Today</span>
            <h3 className="text-xl font-black text-amber-700 mt-0.5">{stats.scheduled}</h3>
          </div>
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
            <Clock size={20} />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider">In Session Now</span>
            <h3 className="text-xl font-black text-indigo-700 mt-0.5">{stats.inSession}</h3>
          </div>
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
            <Play size={20} />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-emerald-600 tracking-wider">Completed Sessions</span>
            <h3 className="text-xl font-black text-emerald-700 mt-0.5">{stats.completed}</h3>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 size={20} />
          </div>
        </div>
      </div>

      {/* Manager Oversight Panel (Visible when Manager mode is active) */}
      {userRole === 'manager' && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 text-amber-700 rounded-xl font-black">
              <ShieldAlert size={22} />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-amber-900">Physiotherapy Manager Control Panel</h4>
              <p className="text-xs text-amber-800 font-medium">Department oversight, staff workload allocation & inventory requisitions.</p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-amber-200 shadow-2xs">
              <User size={14} className="text-amber-600" />
              <span className="text-[10px] font-black uppercase text-slate-400">Therapist:</span>
              <select
                value={selectedTherapistFilter}
                onChange={e => setSelectedTherapistFilter(e.target.value)}
                className="text-xs font-bold text-slate-800 outline-none bg-transparent"
              >
                <option value="All">All Staff Therapists ({PHYSIO_THERAPISTS.length})</option>
                {PHYSIO_THERAPISTS.map(th => (
                  <option key={th} value={th}>{th}</option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setActiveTab('consumables')}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            >
              <ClipboardList size={14} /> Review Stock Requisitions
            </button>
          </div>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('rehab')}
          className={`inline-flex items-center gap-2 px-5 py-3 text-xs font-black border-b-2 -mb-px transition-all cursor-pointer ${
            activeTab === 'rehab'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Dumbbell size={16} /> Rehabilitation Worklist
        </button>

        <button
          onClick={() => setActiveTab('assessments')}
          className={`inline-flex items-center gap-2 px-5 py-3 text-xs font-black border-b-2 -mb-px transition-all cursor-pointer ${
            activeTab === 'assessments'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Activity size={16} /> ROM & Pain Assessment Logger
        </button>

        <button
          onClick={() => setActiveTab('exercise_builder')}
          className={`inline-flex items-center gap-2 px-5 py-3 text-xs font-black border-b-2 -mb-px transition-all cursor-pointer ${
            activeTab === 'exercise_builder'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Layers size={16} /> Exercise Program Builder
        </button>

        <button
          onClick={() => setActiveTab('consumables')}
          className={`inline-flex items-center gap-2 px-5 py-3 text-xs font-black border-b-2 -mb-px transition-all cursor-pointer ${
            activeTab === 'consumables'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <ClipboardList size={16} /> Consumables & Stock Log
        </button>
      </div>

      {/* Tab 1: Rehabilitation Worklist */}
      {activeTab === 'rehab' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="relative w-full sm:w-80">
              <Search size={16} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search patient, ID or treatment area..."
                value={sessionSearch}
                onChange={e => setSessionSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 font-medium"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
              <span className="text-[10px] font-black uppercase text-slate-400 shrink-0">Filter Status:</span>
              {['All', 'Scheduled', 'In Session', 'Completed'].map(st => (
                <button
                  key={st}
                  onClick={() => setSessionStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    sessionStatusFilter === st
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Session Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSessions.map(sess => {
              let exercises = [];
              try {
                exercises = typeof sess.exercises_prescribed === 'string'
                  ? JSON.parse(sess.exercises_prescribed)
                  : (sess.exercises_prescribed || []);
              } catch (e) {}

              return (
                <div key={sess.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-emerald-300 transition-all space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Patient</span>
                        <h4 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                          <User size={14} className="text-emerald-600" /> {sess.patient_name}
                        </h4>
                        <span className="text-[10px] font-bold text-slate-500">ID: {sess.patient_id}</span>
                      </div>

                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${
                        sess.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        sess.status === 'In Session' ? 'bg-indigo-50 text-indigo-700 border-indigo-200 animate-pulse' :
                        'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {sess.status}
                      </span>
                    </div>

                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-1.5">
                      <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                        <span>Area: <span className="text-emerald-700 font-extrabold">{sess.treatment_area}</span></span>
                        <span className="text-[10px] text-slate-400 font-semibold">{sess.session_date}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium line-clamp-2">
                        Therapist: <span className="font-bold text-slate-700">{sess.therapist_name}</span>
                      </p>
                    </div>

                    {/* Prescribed Exercises Badges */}
                    {exercises.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Prescribed Exercises ({exercises.length})</span>
                        <div className="flex flex-wrap gap-1.5">
                          {exercises.map((ex, idx) => (
                            <span key={idx} className="text-[10px] font-bold text-indigo-800 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-lg">
                              {ex.name} ({ex.sets}x{ex.reps})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                    {sess.status === 'Scheduled' && (
                      <button
                        onClick={() => handleUpdateSessionStatus(sess.id, 'In Session')}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Play size={14} /> Start Session
                      </button>
                    )}

                    {sess.status === 'In Session' && (
                      <button
                        onClick={() => handleUpdateSessionStatus(sess.id, 'Completed')}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <CheckCircle2 size={14} /> Mark Completed
                      </button>
                    )}

                    {sess.status === 'Completed' && (
                      <button
                        onClick={() => handleUpdateSessionStatus(sess.id, 'Scheduled')}
                        className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <RotateCcw size={14} /> Re-open Session
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredSessions.length === 0 && (
              <div className="col-span-full bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 space-y-2">
                <Dumbbell size={32} className="mx-auto text-slate-300" />
                <p className="font-bold text-sm text-slate-600">No rehabilitation sessions found.</p>
                <p className="text-xs">Click "Schedule Session" above to add a new patient rehab session.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: ROM & Diagnostic Assessment Logger */}
      {activeTab === 'assessments' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="relative w-72">
              <Search size={16} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search assessment by patient ID..."
                value={assessmentSearch}
                onChange={e => setAssessmentSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 font-medium"
              />
            </div>

            <button
              onClick={() => setShowNewAssessmentModal(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus size={15} /> Log New ROM Assessment
            </button>
          </div>

          {/* Assessment Table */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Patient</th>
                  <th className="px-4 py-3">Therapist</th>
                  <th className="px-4 py-3">Joint / Body Part</th>
                  <th className="px-4 py-3 text-center">Flexion / Extension (ROM)</th>
                  <th className="px-4 py-3 text-center">Pain Score</th>
                  <th className="px-4 py-3 text-center">Muscle Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {assessments
                  .filter(a => !assessmentSearch || a.patient_name?.toLowerCase().includes(assessmentSearch.toLowerCase()) || a.patient_id?.includes(assessmentSearch))
                  .map(ass => {
                    let rom = {};
                    try { rom = typeof ass.rom_data === 'string' ? JSON.parse(ass.rom_data) : (ass.rom_data || {}); } catch(e){}

                    return (
                      <tr key={ass.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-500 whitespace-nowrap text-xs">
                          {new Date(ass.created_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-bold text-slate-800 text-xs block">{ass.patient_name}</span>
                          <span className="text-[10px] text-slate-400 font-semibold">ID: {ass.patient_id}</span>
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-700 text-xs">{ass.therapist_name}</td>
                        <td className="px-4 py-3">
                          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-extrabold uppercase">
                            {ass.body_part}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center font-mono text-xs font-bold text-slate-800">
                          Flexion: {rom.flexion || 0}° · Ext: {rom.extension || 0}°
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-black ${
                            ass.pain_score >= 7 ? 'bg-rose-100 text-rose-700' :
                            ass.pain_score >= 4 ? 'bg-amber-100 text-amber-700' :
                            'bg-emerald-100 text-emerald-700'
                          }`}>
                            NPRS {ass.pain_score} / 10
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center font-semibold text-xs text-slate-700">
                          {ass.muscle_grade}
                        </td>
                      </tr>
                    );
                  })}

                {assessments.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-slate-400 text-xs">
                      No physio assessments recorded yet. Click "Log New ROM Assessment" to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Exercise Program Builder */}
      {activeTab === 'exercise_builder' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <h4 className="font-black text-slate-800 flex items-center gap-2 text-sm">
              <Dumbbell size={16} className="text-emerald-600" /> Prescribed Exercise Library
            </h4>
            <p className="text-xs text-slate-500">Click exercises to include them in the rehabilitation plan.</p>

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {PRESET_EXERCISES.map(ex => (
                <div
                  key={ex.id}
                  onClick={() => {
                    if (!selectedExercisesForSession.some(s => s.name === ex.name)) {
                      setSelectedExercisesForSession(prev => [...prev, { name: ex.name, sets: ex.defaultSets, reps: ex.defaultReps, hold: ex.defaultHold }]);
                      toast.success(`Added ${ex.name} to program`);
                    }
                  }}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl hover:border-emerald-400 transition-all cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <h5 className="text-xs font-bold text-slate-800">{ex.name}</h5>
                    <span className="text-[10px] font-bold text-emerald-700 uppercase bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 mt-1 inline-block">
                      {ex.category}
                    </span>
                  </div>
                  <span className="text-xs font-black text-slate-500">{ex.defaultSets}x{ex.defaultReps}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-black text-slate-800 text-sm">Active Patient Exercise Plan</h4>
                <p className="text-xs text-slate-500">Customized parameters for physical therapy sessions.</p>
              </div>
              <span className="text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                {selectedExercisesForSession.length} Exercises Selected
              </span>
            </div>

            {selectedExercisesForSession.length > 0 ? (
              <div className="space-y-3">
                {selectedExercisesForSession.map((item, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <h5 className="text-xs font-extrabold text-slate-800">{item.name}</h5>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-bold text-slate-400">Sets:</span>
                        <input
                          type="number"
                          value={item.sets}
                          onChange={e => {
                            const val = parseInt(e.target.value, 10) || 1;
                            setSelectedExercisesForSession(prev => prev.map((p, i) => i === idx ? { ...p, sets: val } : p));
                          }}
                          className="w-12 text-center text-xs font-bold bg-white border border-slate-200 rounded px-1 py-0.5"
                        />
                      </div>

                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-bold text-slate-400">Reps:</span>
                        <input
                          type="number"
                          value={item.reps}
                          onChange={e => {
                            const val = parseInt(e.target.value, 10) || 1;
                            setSelectedExercisesForSession(prev => prev.map((p, i) => i === idx ? { ...p, reps: val } : p));
                          }}
                          className="w-12 text-center text-xs font-bold bg-white border border-slate-200 rounded px-1 py-0.5"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedExercisesForSession(prev => prev.filter((_, i) => i !== idx))}
                        className="text-rose-500 hover:text-rose-700 cursor-pointer p-1"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
                No exercises added to current prescription program yet. Click items from the library on the left.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Consumables Log Integration */}
      {activeTab === 'consumables' && <ConsumablesLog />}

      {/* Modal: New Rehab Session */}
      {showNewSessionModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                <Calendar size={18} className="text-emerald-600" /> Schedule Rehabilitation Session
              </h3>
              <button onClick={() => setShowNewSessionModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSession} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400">Patient ID</label>
                  <input
                    required
                    type="text"
                    placeholder="PAT-1001"
                    value={newSession.patient_id}
                    onChange={e => setNewSession({ ...newSession, patient_id: e.target.value })}
                    className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400">Patient Name</label>
                  <input
                    required
                    type="text"
                    placeholder="John Doe"
                    value={newSession.patient_name}
                    onChange={e => setNewSession({ ...newSession, patient_name: e.target.value })}
                    className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400">Therapist</label>
                  <select
                    value={newSession.therapist_name}
                    onChange={e => setNewSession({ ...newSession, therapist_name: e.target.value })}
                    className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-emerald-500"
                  >
                    {PHYSIO_THERAPISTS.map(th => <option key={th} value={th}>{th}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400">Session Date</label>
                  <input
                    type="date"
                    value={newSession.session_date}
                    onChange={e => setNewSession({ ...newSession, session_date: e.target.value })}
                    className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400">Treatment Area</label>
                <input
                  type="text"
                  placeholder="e.g. Right Knee - Post ACL Surgery"
                  value={newSession.treatment_area}
                  onChange={e => setNewSession({ ...newSession, treatment_area: e.target.value })}
                  className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400">Progress Notes</label>
                <textarea
                  rows={2}
                  placeholder="Session notes..."
                  value={newSession.progress_notes}
                  onChange={e => setNewSession({ ...newSession, progress_notes: e.target.value })}
                  className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-sm transition-all cursor-pointer"
              >
                Schedule Rehabilitation Session
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New Assessment */}
      {showNewAssessmentModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-150">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                <Activity size={18} className="text-emerald-600" /> Log ROM & Pain Assessment
              </h3>
              <button onClick={() => setShowNewAssessmentModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateAssessment} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400">Patient ID</label>
                  <input
                    required
                    type="text"
                    placeholder="PAT-1001"
                    value={newAssessment.patient_id}
                    onChange={e => setNewAssessment({ ...newAssessment, patient_id: e.target.value })}
                    className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400">Patient Name</label>
                  <input
                    required
                    type="text"
                    placeholder="John Doe"
                    value={newAssessment.patient_name}
                    onChange={e => setNewAssessment({ ...newAssessment, patient_name: e.target.value })}
                    className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400">Therapist</label>
                  <select
                    value={newAssessment.therapist_name}
                    onChange={e => setNewAssessment({ ...newAssessment, therapist_name: e.target.value })}
                    className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-emerald-500"
                  >
                    {PHYSIO_THERAPISTS.map(th => <option key={th} value={th}>{th}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400">Body Part / Joint</label>
                  <select
                    value={newAssessment.body_part}
                    onChange={e => setNewAssessment({ ...newAssessment, body_part: e.target.value })}
                    className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-emerald-500"
                  >
                    {BODY_REGIONS.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400">Chief Complaint</label>
                <input
                  type="text"
                  placeholder="Primary complaint..."
                  value={newAssessment.chief_complaint}
                  onChange={e => setNewAssessment({ ...newAssessment, chief_complaint: e.target.value })}
                  className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-emerald-500"
                />
              </div>

              {/* Goniometer ROM Controls */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider block">Joint Range of Motion (Goniometer)</span>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600">Flexion Angle: {newAssessment.flexion}°</label>
                    <input
                      type="range"
                      min="0"
                      max="180"
                      value={newAssessment.flexion}
                      onChange={e => setNewAssessment({ ...newAssessment, flexion: parseInt(e.target.value, 10) })}
                      className="w-full accent-emerald-600 cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-600">Extension Angle: {newAssessment.extension}°</label>
                    <input
                      type="range"
                      min="0"
                      max="60"
                      value={newAssessment.extension}
                      onChange={e => setNewAssessment({ ...newAssessment, extension: parseInt(e.target.value, 10) })}
                      className="w-full accent-emerald-600 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Pain & Muscle Grade */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400">Pain Score (NPRS 0-10): {newAssessment.pain_score}</label>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={newAssessment.pain_score}
                    onChange={e => setNewAssessment({ ...newAssessment, pain_score: parseInt(e.target.value, 10) })}
                    className="w-full accent-rose-600 cursor-pointer mt-2"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400">Muscle Strength (Oxford)</label>
                  <select
                    value={newAssessment.muscle_grade}
                    onChange={e => setNewAssessment({ ...newAssessment, muscle_grade: e.target.value })}
                    className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-emerald-500"
                  >
                    <option value="Grade 0 (Zero)">Grade 0 (Zero)</option>
                    <option value="Grade 1 (Trace)">Grade 1 (Trace)</option>
                    <option value="Grade 2 (Poor)">Grade 2 (Poor)</option>
                    <option value="Grade 3 (Fair)">Grade 3 (Fair)</option>
                    <option value="Grade 4 (Good)">Grade 4 (Good)</option>
                    <option value="Grade 5 (Normal)">Grade 5 (Normal)</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-sm transition-all cursor-pointer"
              >
                Save Physio Assessment
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhysioHub;
