import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ClipboardList,
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Users,
  Stethoscope,
  Heart,
  Thermometer,
  ShieldCheck,
  ExternalLink,
  StickyNote,
  Search,
  Database,
  UserCheck,
  Plus,
  Pill,
  Activity,
  FileText,
  User,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getMyActiveShift, getLatestHandover, getMyHistory } from '../../api/shifts';
import { Button, Card, Badge } from '../../components/ui/index.jsx';
import Modal from '../../components/Modal';
import ClinicalSheet from '../ClinicalSheet';
import api from '../../api/axios';
import toast from 'react-hot-toast';

function getWaveStartTime(shift) {
  if (!shift?.opened_at) return null;
  let startHour = '07:00';
  if (shift.wave === 'Wave 1' || shift.start_hour === '07:00') startHour = '07:00';
  else if (shift.wave === 'Wave 2' || shift.start_hour === '08:00') startHour = '08:00';
  else if (shift.wave === 'Wave 4' || shift.start_hour === '09:00') startHour = '09:00';
  else if (shift.wave === 'Wave 3' || shift.start_hour === '15:00') startHour = '15:00';
  else {
    const openedDate = new Date(shift.opened_at);
    const hour = openedDate.getHours();
    startHour = hour < 14 ? '07:00' : '15:00';
  }
  const [hStr, mStr] = startHour.split(':');
  const startTime = new Date(shift.opened_at);
  startTime.setHours(parseInt(hStr, 10), parseInt(mStr, 10), 0, 0);
  return startTime;
}

function formatExactTime(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
}

function formatExactDate(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  return d.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
}

function getTimeAgo(ts) {
  if (!ts) return '';
  const diffMs = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const CATEGORY_STYLES = {
  'Medication Administered': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', tag: 'Medication' },
  'Vitals Check': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', tag: 'Vitals' },
  'Procedure / Dressing': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', tag: 'Procedure' },
  'Doctor Round / Consult': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', tag: 'Doctor Round' },
  'Nursing Care / Hygiene': { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', tag: 'Nursing Care' },
  'Patient Transfer': { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', tag: 'Transfer' },
  'General Note': { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200', tag: 'Clinical Note' },
};

export default function NurseShiftDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeShift, setActiveShift] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentObservations, setRecentObservations] = useState([]);
  const [shiftActivities, setShiftActivities] = useState([]);
  const [latestHandover, setLatestHandover] = useState(null);
  const [myHistory, setMyHistory] = useState([]);
  const [allDepartmentShifts, setAllDepartmentShifts] = useState([]);

  const isChefNurseOrDeputy = useMemo(() => {
    const r = String(user?.role || '').toLowerCase();
    const CHEF_NURSE_ROLES = [
      'chef-nurse', 'chef_nurse', 'chief_nurse', 'chief-nurse', 'head_nurse', 
      'nursing_lead', 'nurse_manager', 'nursing_head', 
      'deputy_chef_nurse', 'deputy-chef-nurse', 'deputy_chief_nurse', 'deputy_head_nurse'
    ];
    return CHEF_NURSE_ROLES.some(k => r.includes(k) || r === k);
  }, [user?.role]);

  // Filtering & View toggles
  const [viewMode, setViewMode] = useState(isChefNurseOrDeputy ? 'DEPARTMENT_SHIFTS' : 'INDIVIDUAL_LOGS'); // 'DEPARTMENT_SHIFTS' | 'INDIVIDUAL_LOGS' | 'CLINICAL_SHEETS'
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Modals
  const [activeClinicalPatient, setActiveClinicalPatient] = useState(null);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);

  // New Individual Activity Form state
  const [activityForm, setActivityForm] = useState({
    patient_id: '',
    patient_name: '',
    ward: 'General Ward',
    activity_category: 'Medication Administered',
    activity_summary: '',
    vitals_bp: '',
    vitals_pulse: '',
    vitals_temp: '',
    vitals_spo2: '',
  });
  const [submittingActivity, setSubmittingActivity] = useState(false);
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const [sukraaSearchResults, setSukraaSearchResults] = useState([]);
  const [searchingSukraa, setSearchingSukraa] = useState(false);

  const fetchShiftActivities = async (shiftId) => {
    try {
      const res = await api.get('/clinical/shift-activities', { params: { shift_id: shiftId || '', limit: 100 } });
      if (res.data?.success) {
        setShiftActivities(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch shift activities', err);
    }
  };

  useEffect(() => {
    async function init() {
      try {
        const fetchTasks = [
          getMyActiveShift(),
          api.get('/clinical/observations/recent'),
          getLatestHandover('nurse').catch(err => {
            console.error('Failed to fetch nurse latest handover', err);
            return { data: { data: null } };
          }),
          getMyHistory().catch(err => {
            console.error('Failed to fetch my history', err);
            return { data: { data: [] } };
          })
        ];

        if (isChefNurseOrDeputy) {
          fetchTasks.push(
            api.get('/shifts', { params: { limit: 100 } }).catch(err => {
              console.error('Failed to fetch department shifts', err);
              return { data: { data: [] } };
            })
          );
        }

        const results = await Promise.all(fetchTasks);
        const shiftRes = results[0];
        const obsRes = results[1];
        const handoverRes = results[2];
        const histRes = results[3];
        const deptShiftsRes = results[4];

        const shiftData = shiftRes.data?.data || null;
        setActiveShift(shiftData);
        setRecentObservations(obsRes.data?.data || []);
        setLatestHandover(handoverRes.data?.data || null);
        setMyHistory(histRes.data?.data || []);

        if (deptShiftsRes) {
          setAllDepartmentShifts(deptShiftsRes.data?.data || (Array.isArray(deptShiftsRes.data) ? deptShiftsRes.data : []));
        }

        await fetchShiftActivities(shiftData?.id);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [isChefNurseOrDeputy]);

  // Search Sukraa patients for individual logging modal
  useEffect(() => {
    if (!isLogModalOpen) return;

    let isMounted = true;
    const loadPatients = async () => {
      setSearchingSukraa(true);
      try {
        const q = patientSearchQuery.trim();
        let list = [];
        if (q.length > 0) {
          const res = await api.get('/patients/search', { params: { q, limit: 30 } });
          list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
          if (!list.length) {
            const fallbackRes = await api.get('/patients', { params: { q, limit: 30 } });
            list = fallbackRes.data?.data || (Array.isArray(fallbackRes.data) ? fallbackRes.data : []);
          }
        } else {
          const res = await api.get('/patients', { params: { limit: 30 } });
          list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
          if (!list.length && recentObservations.length > 0) {
            list = recentObservations.map(o => ({
              pid: o.sukraa_pid || o.patient_id,
              full_name: o.patient_name,
              gender: o.gender,
              age: o.age,
              insurance: o.insurance
            }));
          }
        }
        if (isMounted) setSukraaSearchResults(list);
      } catch (err) {
        console.error('Sukraa patient load error', err);
        if (isMounted && recentObservations.length > 0) {
          setSukraaSearchResults(recentObservations.map(o => ({
            pid: o.sukraa_pid || o.patient_id,
            full_name: o.patient_name,
            gender: o.gender,
            age: o.age,
            insurance: o.insurance
          })));
        }
      } finally {
        if (isMounted) setSearchingSukraa(false);
      }
    };

    const timer = setTimeout(loadPatients, 200);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [patientSearchQuery, isLogModalOpen, recentObservations]);

  const handleSelectSukraaPatient = (pat) => {
    setActivityForm(prev => ({
      ...prev,
      patient_id: pat.pid || pat.patient_id,
      patient_name: pat.full_name || pat.patient_name,
      ward: pat.ward || prev.ward || 'General Ward'
    }));
    setPatientSearchQuery('');
    setSukraaSearchResults([]);
  };

  const handleLogActivitySubmit = async (e) => {
    e.preventDefault();
    if (!activityForm.patient_id || !activityForm.activity_summary.trim()) {
      toast.error('Please enter a valid patient ID and activity summary');
      return;
    }

    setSubmittingActivity(true);
    try {
      const payload = {
        shift_id: activeShift?.id || null,
        patient_id: activityForm.patient_id,
        patient_name: activityForm.patient_name,
        ward: activityForm.ward,
        activity_category: activityForm.activity_category,
        activity_summary: activityForm.activity_summary,
        vitals_bp: activityForm.vitals_bp || null,
        vitals_pulse: activityForm.vitals_pulse || null,
        vitals_temp: activityForm.vitals_temp || null,
        vitals_spo2: activityForm.vitals_spo2 || null,
        custom_timestamp: new Date().toISOString()
      };

      const res = await api.post('/clinical/shift-activities', payload);
      if (res.data?.success) {
        toast.success('Individual activity logged for patient!');
        setIsLogModalOpen(false);
        setActivityForm({
          patient_id: '',
          patient_name: '',
          ward: 'General Ward',
          activity_category: 'Medication Administered',
          activity_summary: '',
          vitals_bp: '',
          vitals_pulse: '',
          vitals_temp: '',
          vitals_spo2: '',
        });
        fetchShiftActivities(activeShift?.id);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to log individual activity');
    } finally {
      setSubmittingActivity(false);
    }
  };

  const filteredShiftActivities = useMemo(() => {
    let list = shiftActivities;
    if (categoryFilter !== 'ALL') {
      list = list.filter(a => a.activity_category === categoryFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(a =>
        (a.patient_name && a.patient_name.toLowerCase().includes(q)) ||
        (a.patient_id && String(a.patient_id).toLowerCase().includes(q)) ||
        (a.sukraa_pid && String(a.sukraa_pid).toLowerCase().includes(q)) ||
        (a.activity_summary && a.activity_summary.toLowerCase().includes(q)) ||
        (a.nurse_name && a.nurse_name.toLowerCase().includes(q))
      );
    }
    return list;
  }, [shiftActivities, categoryFilter, searchQuery]);

  const filteredObservations = useMemo(() => {
    let list = recentObservations;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(o =>
        (o.patient_name && o.patient_name.toLowerCase().includes(q)) ||
        (o.patient_id && String(o.patient_id).toLowerCase().includes(q)) ||
        (o.sukraa_pid && String(o.sukraa_pid).toLowerCase().includes(q)) ||
        (o.ward && o.ward.toLowerCase().includes(q)) ||
        (o.insurance && o.insurance.toLowerCase().includes(q))
      );
    }
    return list;
  }, [recentObservations, searchQuery]);

  if (loading) return <div className="p-20 text-center font-black text-slate-300 uppercase tracking-widest">Initialising Clinical Protocol...</div>;

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#1b669d]/10 border border-[#1b669d]/20 flex items-center justify-center text-[#1b669d] shrink-0">
            <Stethoscope size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {isChefNurseOrDeputy ? 'Nursing Shift Control & Oversight' : 'Nursing Shift Control'}
            </h1>
            <p className="text-slate-500 text-xs font-medium flex items-center gap-1.5 mt-0.5">
              <ShieldCheck size={14} className="text-emerald-600" />
              {isChefNurseOrDeputy
                ? 'Departmental Nursing Shift Supervision, Verification & Handover Oversight'
                : 'Clinical Shift & Handover Management'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {isChefNurseOrDeputy && (
            <Button
              onClick={() => navigate('/shifts')}
              className="h-10 px-4 rounded-lg bg-[#1b669d] hover:bg-[#124d77] text-white font-semibold text-xs flex items-center gap-2"
            >
              <ClipboardList size={15} /> Manage All Shift Logs
            </Button>
          )}

          <Button
            onClick={() => setIsLogModalOpen(true)}
            className="h-10 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-2"
          >
            <Plus size={15} /> {isChefNurseOrDeputy ? 'Log Department Activity' : 'Log Individual Activity'}
          </Button>

          {!isChefNurseOrDeputy && (
            !activeShift ? (
              <Button
                onClick={() => navigate('/shifts/open')}
                className="h-10 px-5 rounded-lg bg-[#1b669d] hover:bg-[#124d77] text-white font-semibold text-xs"
              >
                Start New Shift <ArrowRight size={15} className="ml-1.5" />
              </Button>
            ) : (
              <Button
                onClick={() => navigate(`/shifts/close/${activeShift.id}`)}
                className="h-10 px-5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs"
              >
                End Shift & Handover <ArrowRight size={15} className="ml-1.5" />
              </Button>
            )
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column Card */}
        {isChefNurseOrDeputy ? (
          <Card className="lg:col-span-1 p-8 space-y-6 relative overflow-hidden bg-slate-900 text-white border-none shadow-2xl rounded-[28px]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <Badge variant="info" className="mb-2 bg-sky-500/20 text-sky-300 border-sky-500/30">SUPERVISOR CONTROL</Badge>
                <h3 className="text-xl font-black text-white flex items-center gap-2.5">
                  <ShieldCheck size={22} className="text-sky-400" /> Department Supervision
                </h3>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700/60">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Active Nurse Shifts</p>
                <p className="font-black text-emerald-400 text-2xl flex items-center justify-between">
                  {allDepartmentShifts.filter(s => s.status === 'open' || s.status === 'active').length}
                  <span className="text-xs font-bold text-slate-400">On Duty</span>
                </p>
              </div>

              <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700/60">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pending Shift Reviews</p>
                <p className="font-black text-amber-400 text-2xl flex items-center justify-between">
                  {allDepartmentShifts.filter(s => s.status === 'closed' || s.status === 'pending').length}
                  <span className="text-xs font-bold text-slate-400">Awaiting Review</span>
                </p>
              </div>

              <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700/60">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Activities Logged Today</p>
                <p className="font-black text-sky-400 text-2xl flex items-center justify-between">
                  {shiftActivities.length}
                  <span className="text-xs font-bold text-slate-400">Interventions</span>
                </p>
              </div>
            </div>

            <Button
              onClick={() => navigate('/shifts')}
              className="w-full h-12 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm shadow-lg shadow-sky-600/30 flex items-center justify-center gap-2"
            >
              <ClipboardList size={18} /> Manage & Review All Shift Logs
            </Button>
          </Card>
        ) : (
          <Card className="lg:col-span-1 p-8 space-y-6 relative overflow-hidden">
            {activeShift && <div className="absolute top-0 right-0 p-4 animate-pulse"><Badge variant="success">LIVE SESSION</Badge></div>}

            <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
              <Clock size={20} className="text-[#1b669d]" /> Session Details
            </h3>

            {activeShift ? (
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Shift Started</p>
                  <p className="font-black text-slate-800 text-lg">
                    {getWaveStartTime(activeShift) ? getWaveStartTime(activeShift).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                  </p>
                  <p className="text-xs text-slate-500 font-bold mt-0.5">
                    {getWaveStartTime(activeShift) ? getWaveStartTime(activeShift).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' }) : '—'}
                  </p>
                </div>
                {activeShift.wave && (
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Allocated Wave</p>
                    <p className="font-black text-slate-800 text-lg uppercase tracking-wider">{activeShift.wave}</p>
                    <p className="text-xs text-slate-500 font-bold mt-0.5">
                      {activeShift.start_hour === '07:00' ? '07:00 AM - 03:00 PM' :
                        activeShift.start_hour === '08:00' ? '08:00 AM - 04:00 PM' :
                          activeShift.start_hour === '09:00' ? '09:00 AM - 05:00 PM' :
                            activeShift.start_hour === '15:00' ? '03:00 PM - 09:00 PM' : ''}
                    </p>
                  </div>
                )}
                <div className="p-4 bg-sky-50 rounded-2xl border border-sky-100">
                  <p className="text-[10px] font-black text-sky-600 uppercase tracking-widest mb-1">Assigned Nursing Station</p>
                  <p className="font-black text-slate-900 text-lg">{activeShift.nursing_ward || 'STATION 1'}</p>
                  <p className="text-xs text-sky-800 font-bold mt-1">
                    {activeShift.nursing_ward === 'STATION 2' ? 'Cardiology Clinic (Vitals, ECG, TMT)' :
                      activeShift.nursing_ward === 'MINOR SURGERY' ? 'Minor Surgical Procedures & Care' :
                        activeShift.nursing_ward === 'PAEDIATRICS' ? 'Paediatric Vitals & Vaccinations (Minors & Adults)' :
                          'Vital Signs Check & Patient Orientation'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="py-10 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-300">
                  <Clock size={32} />
                </div>
                <p className="text-slate-400 font-bold">No active shift session. Please start your shift to begin clinical documentation.</p>
              </div>
            )}
          </Card>
        )}

        {/* Clinical Activity Summary Card */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-8 space-y-6 border border-slate-200 shadow-xl rounded-[28px] bg-white">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-sky-100 text-sky-800 rounded-md flex items-center gap-1">
                    <Database size={10} /> Sukraa HIMS Sync
                  </span>
                  <span className="text-xs text-slate-400 font-semibold">• {isChefNurseOrDeputy ? 'Department Logs & Shift Oversight' : 'Individual Shift Logs'}</span>
                </div>
                <h3 className="text-xl font-black text-slate-900 flex items-center gap-2.5">
                  <ClipboardList size={22} className="text-[#1b669d]" /> {isChefNurseOrDeputy ? 'Department Shift Control' : 'Clinical Activity Summary'}
                </h3>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  {isChefNurseOrDeputy
                    ? 'Review, verify, and inspect nursing shift logs, handovers, and ward interventions'
                    : 'Individual patient activities, nursing interventions, and observations recorded during shift'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setIsLogModalOpen(true)}
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                >
                  <Plus size={14} className="mr-1" /> Log Activity
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigate('/nursing-hub')} className="text-[#1b669d] font-bold text-xs">
                  Nursing Hub <ExternalLink size={14} className="ml-1" />
                </Button>
              </div>
            </div>

            {/* View Mode Toggle */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl w-full sm:w-auto overflow-x-auto">
                {isChefNurseOrDeputy && (
                  <button
                    onClick={() => setViewMode('DEPARTMENT_SHIFTS')}
                    className={`px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${viewMode === 'DEPARTMENT_SHIFTS'
                        ? 'bg-white text-sky-900 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800'
                      }`}
                  >
                    <Clock size={14} /> Department Shifts ({allDepartmentShifts.length})
                  </button>
                )}
                <button
                  onClick={() => setViewMode('INDIVIDUAL_LOGS')}
                  className={`px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${viewMode === 'INDIVIDUAL_LOGS'
                      ? 'bg-white text-sky-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                    }`}
                >
                  <Activity size={14} /> Activity Logs ({shiftActivities.length})
                </button>
                <button
                  onClick={() => setViewMode('CLINICAL_SHEETS')}
                  className={`px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${viewMode === 'CLINICAL_SHEETS'
                      ? 'bg-white text-sky-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                    }`}
                >
                  <FileText size={14} /> Clinical Sheets ({recentObservations.length})
                </button>
              </div>

              {/* Search bar */}
              <div className="relative w-full sm:w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search PID, nurse, notes..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-sky-500 focus:bg-white"
                />
              </div>
            </div>

            {/* Department Shifts View Mode for Chef Nurse and Deputy Chef Nurse */}
            {viewMode === 'DEPARTMENT_SHIFTS' && isChefNurseOrDeputy && (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin">
                {allDepartmentShifts.length > 0 ? (
                  allDepartmentShifts
                    .filter(s => {
                      if (!searchQuery.trim()) return true;
                      const q = searchQuery.toLowerCase().trim();
                      return (
                        (s.user_name && s.user_name.toLowerCase().includes(q)) ||
                        (s.nursing_ward && s.nursing_ward.toLowerCase().includes(q)) ||
                        (s.status && s.status.toLowerCase().includes(q))
                      );
                    })
                    .map((s) => (
                      <div
                        key={s.id}
                        className="p-4 border border-slate-200/80 rounded-2xl bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-sky-300 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 border border-sky-200 flex items-center justify-center font-black shrink-0">
                            {s.user_name?.substring(0, 2).toUpperCase() || 'NS'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-extrabold text-slate-900 text-sm">{s.user_name || 'Staff Nurse'}</h4>
                              <span className={`px-2.5 py-0.5 text-[10px] font-black rounded-full uppercase ${
                                s.status === 'open' || s.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                s.status === 'closed' || s.status === 'pending' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}>
                                {s.status}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                              Ward: <span className="text-slate-800 font-bold">{s.nursing_ward || 'General Station'}</span> • Opened: {formatExactDate(s.opened_at)} {formatExactTime(s.opened_at)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            size="sm"
                            onClick={() => navigate('/shifts')}
                            className="bg-[#1b669d] hover:bg-[#124d77] text-white font-bold text-xs"
                          >
                            Review Log
                          </Button>
                        </div>
                      </div>
                    ))
                ) : (
                  <div className="py-12 text-center text-slate-400 font-bold">
                    No department shift logs found.
                  </div>
                )}
              </div>
            )}

            {/* Category Filter Pills for Individual Activity Logs */}
            {viewMode === 'INDIVIDUAL_LOGS' && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {['ALL', 'Medication Administered', 'Vitals Check', 'Procedure / Dressing', 'Doctor Round / Consult', 'Nursing Care / Hygiene'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-3 py-1 rounded-full text-[10px] font-extrabold whitespace-nowrap transition-all cursor-pointer border ${categoryFilter === cat
                        ? 'bg-sky-900 text-white border-sky-900 shadow-2xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                  >
                    {cat === 'ALL' ? 'All Categories' : cat}
                  </button>
                ))}
              </div>
            )}

            {/* Content List 1: Individual Shift Activity Logs */}
            {viewMode === 'INDIVIDUAL_LOGS' && (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin">
                {filteredShiftActivities.length > 0 ? (
                  filteredShiftActivities.map((act) => {
                    const style = CATEGORY_STYLES[act.activity_category] || CATEGORY_STYLES['General Note'];
                    const pid = act.sukraa_pid || act.patient_id || 'N/A';
                    const rawTs = act.timestamp || act.created_at;
                    const exactTime = formatExactTime(rawTs);
                    const exactDate = formatExactDate(rawTs);
                    const ago = getTimeAgo(rawTs);
                    const vitals = act.vitals_snapshot || {};

                    return (
                      <div
                        key={act.id}
                        className="p-4 border border-slate-200/80 rounded-2xl bg-white space-y-3 hover:border-sky-300 hover:shadow-xs transition-all"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 border ${style.bg} ${style.text} ${style.border}`}>
                              {act.patient_name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'P'}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-extrabold text-slate-900 text-sm">
                                  {act.patient_name}
                                </h4>
                                <span className="px-2 py-0.5 text-[9px] font-black bg-sky-100 text-sky-800 rounded-md font-mono border border-sky-200">
                                  SUKRAA PID: #{pid}
                                </span>
                                <span className={`px-2.5 py-0.5 text-[10px] font-black rounded-full border ${style.bg} ${style.text} ${style.border}`}>
                                  {style.tag}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 font-semibold mt-0.5 flex items-center gap-2">
                                <span>{act.gender || 'N/A'}{act.age ? `, ${act.age} yrs` : ''}</span>
                                <span className="text-slate-300">•</span>
                                <span className="text-sky-700 font-bold">{act.insurance || 'Private'}</span>
                                <span className="text-slate-300">•</span>
                                <span className="text-slate-600 font-bold">{act.ward || 'General Ward'}</span>
                              </p>
                            </div>
                          </div>

                          {/* Timestamp & Nurse */}
                          <div className="flex sm:flex-col items-end justify-between sm:justify-start gap-1 shrink-0">
                            <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200/70">
                              <Clock size={11} className="text-sky-600 shrink-0" />
                              <span>{exactDate} {exactTime}</span>
                              {ago && <span className="text-sky-700 font-black">({ago})</span>}
                            </div>
                            <span className="text-[10px] font-bold text-slate-400">
                              Logged by {act.nurse_name || 'Nurse'}
                            </span>
                          </div>
                        </div>

                        {/* Individual Activity Notes */}
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs font-semibold text-slate-800 leading-relaxed">
                          {act.activity_summary}
                        </div>

                        {/* Vitals Snapshot (if recorded for this activity) */}
                        {(vitals.bp || vitals.pulse || vitals.temp || vitals.spo2) && (
                          <div className="flex items-center gap-2 pt-1 text-[10px] font-extrabold flex-wrap">
                            <span className="text-slate-400 font-black uppercase tracking-wider text-[9px]">Vitals Checked:</span>
                            {vitals.bp && <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-md">BP: {vitals.bp}</span>}
                            {vitals.pulse && <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-md">HR: {vitals.pulse}</span>}
                            {vitals.temp && <span className="px-2 py-0.5 bg-sky-50 text-sky-700 border border-sky-200 rounded-md">Temp: {vitals.temp}</span>}
                            {vitals.spo2 && <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md">SpO2: {vitals.spo2}</span>}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="py-12 text-center text-slate-400 space-y-3">
                    <Activity size={32} className="mx-auto text-slate-300" />
                    <p className="font-bold text-xs">No individual shift activities logged yet.</p>
                    <Button
                      onClick={() => setIsLogModalOpen(true)}
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                    >
                      <Plus size={14} className="mr-1" /> Log First Activity
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Content List 2: Full Clinical Sheets */}
            {viewMode === 'CLINICAL_SHEETS' && (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin">
                {filteredObservations.length > 0 ? (
                  filteredObservations.map((obs) => {
                    const pid = obs.sukraa_pid || obs.patient_id || 'N/A';
                    const rawTs = obs.timestamp || obs.updated_at || obs.created_at;
                    const exactTime = formatExactTime(rawTs);
                    const exactDate = formatExactDate(rawTs);
                    const ago = getTimeAgo(rawTs);

                    return (
                      <div
                        key={obs.id || `${obs.patient_id}-${obs.queue_id}`}
                        onClick={() => setActiveClinicalPatient(obs)}
                        className="p-4 border border-slate-200/80 rounded-2xl bg-white hover:border-sky-400 hover:shadow-md transition-all cursor-pointer space-y-3 group"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-800 flex items-center justify-center font-black text-sm shrink-0 border border-sky-100 group-hover:bg-sky-600 group-hover:text-white transition-colors">
                              {obs.patient_name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'P'}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-extrabold text-slate-900 text-sm group-hover:text-sky-700 transition-colors">
                                  {obs.patient_name}
                                </h4>
                                <span className="px-2 py-0.5 text-[9px] font-black bg-sky-100 text-sky-800 rounded-md font-mono border border-sky-200">
                                  SUKRAA PID: #{pid}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 font-semibold mt-0.5 flex items-center gap-2">
                                <span>{obs.gender || 'N/A'}{obs.age ? `, ${obs.age} yrs` : ''}</span>
                                <span className="text-slate-300">•</span>
                                <span className="text-sky-700 font-bold">{obs.insurance || 'Private'}</span>
                              </p>
                            </div>
                          </div>

                          <div className="flex sm:flex-col items-end justify-between sm:justify-start gap-1 shrink-0">
                            <Badge variant={obs.status === 'Draft' ? 'warning' : 'success'}>
                              {obs.status || 'Draft'}
                            </Badge>
                            <div className="flex items-center gap-1 text-[10px] font-extrabold text-slate-500">
                              <Clock size={11} className="text-sky-600 shrink-0" />
                              <span>{exactDate} {exactTime}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-12 text-center text-slate-400 space-y-2">
                    <UserCheck size={32} className="mx-auto text-slate-300" />
                    <p className="font-bold text-xs">No clinical sheets found matching search.</p>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-[28px] border border-slate-200 shadow-sm flex items-center gap-5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Activity size={24} />
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900 leading-none">{shiftActivities.length}</p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Individual Shift Activities</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-[28px] border border-slate-200 shadow-sm flex items-center gap-5">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#1b669d] flex items-center justify-center">
                <Thermometer size={24} />
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900 leading-none">{recentObservations.length}</p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Sukraa Clinical Sheets</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Modal: Log New Individual Nursing Shift Activity ── */}
      <Modal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        title="Log Individual Clinical Activity (Sukraa Patient)"
        maxWidth="650px"
      >
        <form onSubmit={handleLogActivitySubmit} className="space-y-5">
          {/* Patient Selector */}
          <div className="space-y-2 relative">
            <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">
              Sukraa Patient PID / Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search Sukraa Patient by PID or Name (e.g. 23022172 or Mugisha)..."
                value={activityForm.patient_id ? `${activityForm.patient_name} (PID #${activityForm.patient_id})` : patientSearchQuery}
                onChange={e => {
                  setPatientSearchQuery(e.target.value);
                  if (activityForm.patient_id) {
                    setActivityForm(prev => ({ ...prev, patient_id: '', patient_name: '' }));
                  }
                }}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-sky-500 focus:bg-white"
              />
              {activityForm.patient_id && (
                <button
                  type="button"
                  onClick={() => setActivityForm(prev => ({ ...prev, patient_id: '', patient_name: '' }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-rose-500 font-extrabold hover:underline"
                >
                  Change
                </button>
              )}
            </div>

            {/* Sukraa Autocomplete Dropdown */}
            {!activityForm.patient_id && (
              <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-56 overflow-y-auto divide-y divide-slate-100">
                {searchingSukraa && (
                  <div className="p-3 text-xs text-slate-400 font-bold flex items-center gap-2">
                    <Clock size={12} className="animate-spin text-sky-600" /> Searching Sukraa HIMS patients...
                  </div>
                )}
                {sukraaSearchResults.length > 0 ? (
                  sukraaSearchResults.map((pat, idx) => (
                    <div
                      key={pat.pid || pat.id || idx}
                      onClick={() => handleSelectSukraaPatient(pat)}
                      className="p-3 hover:bg-sky-50 cursor-pointer flex items-center justify-between transition-colors"
                    >
                      <div>
                        <p className="font-extrabold text-slate-900 text-xs">{pat.full_name || pat.patient_name}</p>
                        <p className="text-[10px] text-slate-500 font-bold">PID: #{pat.pid || pat.patient_id || 'N/A'} • {pat.gender || 'N/A'}{pat.insurance ? ` • ${pat.insurance}` : ''}</p>
                      </div>
                      <span className="px-2 py-0.5 text-[9px] font-black bg-sky-100 text-sky-800 rounded-md">Select Patient</span>
                    </div>
                  ))
                ) : !searchingSukraa && patientSearchQuery.trim().length > 0 ? (
                  <div
                    onClick={() => {
                      setActivityForm(prev => ({
                        ...prev,
                        patient_id: patientSearchQuery.trim(),
                        patient_name: patientSearchQuery.trim()
                      }));
                      setPatientSearchQuery('');
                    }}
                    className="p-3 bg-amber-50 hover:bg-amber-100 cursor-pointer flex items-center justify-between text-xs font-bold text-amber-900"
                  >
                    <span>Use custom ID/Name: "{patientSearchQuery.trim()}"</span>
                    <span className="px-2 py-0.5 text-[9px] font-black bg-amber-200 text-amber-900 rounded-md">Use Manual</span>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {/* Category & Ward */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1.5">
                Activity Category <span className="text-rose-500">*</span>
              </label>
              <select
                value={activityForm.activity_category}
                onChange={e => setActivityForm(prev => ({ ...prev, activity_category: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-sky-500"
              >
                <option value="Vital Signs Check">🩺 Vital Signs Check & Orientation</option>
                <option value="Cardiology / ECG / TMT">❤️ Cardiology / ECG / TMT</option>
                <option value="Minor Surgery Procedure">🔪 Minor Surgery Procedure</option>
                <option value="Paediatric / Adult Vaccination">💉 Paediatric / Adult Vaccination</option>
                <option value="Medication Administered">💊 Medication Administered</option>
                <option value="Procedure / Dressing">🩹 Procedure / Dressing</option>
                <option value="Doctor Round / Consult">👨‍⚕️ Doctor Round / Consult</option>
                <option value="General Note">📝 General Clinical Note</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1.5">
                Nursing Station / Ward <span className="text-rose-500">*</span>
              </label>
              <select
                value={activityForm.ward || activeShift?.nursing_ward || 'STATION 1'}
                onChange={e => setActivityForm(prev => ({ ...prev, ward: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-sky-500 font-extrabold text-slate-800"
              >
                <option value="STATION 1">STATION 1 (Vital Signs & Orientation)</option>
                <option value="STATION 2">STATION 2 (Cardiology - ECG, TMT)</option>
                <option value="MINOR SURGERY">MINOR SURGERY (Procedures & Suturing)</option>
                <option value="PAEDIATRICS">PAEDIATRICS (Vitals & Vaccinations)</option>
              </select>
            </div>
          </div>

          {/* Activity Notes / Summary */}
          <div>
            <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1.5">
              Activity Summary Notes <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              placeholder="Enter exact nursing activity, medication dose, procedure performed, or observation note..."
              value={activityForm.activity_summary}
              onChange={e => setActivityForm(prev => ({ ...prev, activity_summary: e.target.value }))}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-sky-500"
              required
            />
          </div>

          {/* Optional Vitals */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
            <p className="text-xs font-black text-slate-700 uppercase tracking-wider">
              Optional Vital Signs Snapshot
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">Blood Pressure</label>
                <input
                  type="text"
                  placeholder="120/80"
                  value={activityForm.vitals_bp}
                  onChange={e => setActivityForm(prev => ({ ...prev, vitals_bp: e.target.value }))}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">Pulse (bpm)</label>
                <input
                  type="text"
                  placeholder="75"
                  value={activityForm.vitals_pulse}
                  onChange={e => setActivityForm(prev => ({ ...prev, vitals_pulse: e.target.value }))}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">Temp (°C)</label>
                <input
                  type="text"
                  placeholder="36.6"
                  value={activityForm.vitals_temp}
                  onChange={e => setActivityForm(prev => ({ ...prev, vitals_temp: e.target.value }))}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">SpO2 (%)</label>
                <input
                  type="text"
                  placeholder="98"
                  value={activityForm.vitals_spo2}
                  onChange={e => setActivityForm(prev => ({ ...prev, vitals_spo2: e.target.value }))}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button type="button" variant="ghost" onClick={() => setIsLogModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submittingActivity}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-wider"
            >
              {submittingActivity ? 'Logging Activity...' : 'Save Activity Entry'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Active Patient Clinical Workspace Modal ── */}
      <Modal
        isOpen={activeClinicalPatient !== null}
        onClose={() => setActiveClinicalPatient(null)}
        title={`${activeClinicalPatient?.patient_name || 'Sukraa Patient'} (PID #${activeClinicalPatient?.sukraa_pid || activeClinicalPatient?.patient_id}) — Clinical Observation Sheet`}
        maxWidth="950px"
      >
        {activeClinicalPatient !== null && (
          <ClinicalSheet
            embeddedPatientId={activeClinicalPatient.sukraa_pid || activeClinicalPatient.patient_id}
            embeddedQueueId={activeClinicalPatient.queue_id || `Q-${Date.now()}`}
            isEmbedded={true}
            embeddedTab="all"
            onSaveSuccess={() => {
              api.get('/clinical/observations/recent').then(res => {
                if (res.data?.success && res.data?.data) {
                  setRecentObservations(res.data.data);
                }
              }).catch(() => { });
            }}
          />
        )}
      </Modal>

      {/* ── Previous Handover Notes ── */}
      {latestHandover && (
        <Card className="p-8 space-y-6">
          <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
            <StickyNote size={20} className="text-[#1b669d]" /> Handover Briefing from Previous Shift
          </h3>
          <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-black uppercase tracking-wider">
                Outgoing Nurse: {latestHandover.user_name}
              </span>
              <span className="text-[10px] text-slate-400 font-bold">
                Closed on {new Date(latestHandover.closed_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
              </span>
            </div>
            <div className="text-sm font-semibold text-slate-700 bg-white p-6 rounded-xl border border-slate-100 shadow-sm italic leading-relaxed">
              "{latestHandover.handover_notes}"
            </div>
          </div>
        </Card>
      )}

      {/* ── My Past Sessions History ── */}
      {myHistory && myHistory.length > 0 && (
        <Card className="p-8 space-y-6">
          <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
            <Clock size={20} className="text-[#1b669d]" /> My Past Sessions
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-100 pb-4">
                  <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Shift Role</th>
                  <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Shift Date</th>
                  <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Wave Timing</th>
                  <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {myHistory.map((hist) => (
                  <tr key={hist.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => navigate(`/shifts/${hist.id}`)}>
                    <td className="py-4 text-sm font-bold text-slate-800 uppercase tracking-wider">{hist.shift_role?.replace(/_/g, ' ')}</td>
                    <td className="py-4 text-sm text-slate-600 font-semibold">{new Date(hist.opened_at).toLocaleDateString([], { dateStyle: 'medium' })}</td>
                    <td className="py-4 text-sm text-slate-600 font-semibold">{hist.wave} ({hist.start_hour})</td>
                    <td className="py-4 text-sm text-right">
                      {hist.is_flagged ? (
                        <Badge variant="danger" className="text-[10px]">Flagged</Badge>
                      ) : (
                        <Badge variant="success" className="text-[10px]">Closed Clean</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
