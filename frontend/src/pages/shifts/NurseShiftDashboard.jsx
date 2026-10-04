import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock,
  ArrowRight,
  Search,
  Plus,
  Stethoscope,
  Pill,
  Activity,
  Users,
  ShieldAlert,
  FileText
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getMyActiveShift, getLatestHandover, getMyHistory } from '../../api/shifts';
import Modal from '../../components/Modal';
import ClinicalSheet from '../ClinicalSheet';
import api from '../../api/axios';
import toast from 'react-hot-toast';

function formatExactTime(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
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

const CATEGORY_COLORS = {
  'Medication Administered': 'bg-purple-50 text-purple-700 border-purple-200',
  'Vitals Check': 'bg-sky-50 text-sky-700 border-sky-200',
  'Procedure / Dressing': 'bg-amber-50 text-amber-700 border-amber-200',
  'Doctor Round / Consult': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Nursing Care / Hygiene': 'bg-[#E6F4F6] text-[#007B8A] border-[#CCE8EC]',
  'General Note': 'bg-slate-100 text-slate-700 border-slate-200',
};

export default function NurseShiftDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const isManagerOrChefNurse = [
    'chef-nurse', 'chef_nurse', 'chief_nurse', 'chief-nurse',
    'head_nurse', 'nursing_lead', 'nurse_manager', 'nursing_head',
    'deputy_chef_nurse', 'deputy-chef-nurse', 'deputy_chief_nurse',
    'admin', 'deputy_coo', 'coo'
  ].some(r => user?.role?.toLowerCase()?.includes(r) || user?.role?.toLowerCase() === r);

  const [activeShift, setActiveShift] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentObservations, setRecentObservations] = useState([]);
  const [shiftActivities, setShiftActivities] = useState([]);
  const [latestHandover, setLatestHandover] = useState(null);
  const [myHistory, setMyHistory] = useState([]);

  const [activeTab, setActiveTab] = useState('ACTIVITIES');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [activeClinicalPatient, setActiveClinicalPatient] = useState(null);

  // Form State
  const [activityForm, setActivityForm] = useState({
    patient_id: '',
    patient_name: '',
    ward: 'STATION 1',
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
      if (res.data?.success) setShiftActivities(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch shift activities', err);
    }
  };

  useEffect(() => {
    async function init() {
      try {
        const [shiftRes, obsRes, handoverRes, histRes] = await Promise.all([
          getMyActiveShift(),
          api.get('/clinical/observations/recent'),
          getLatestHandover('nurse').catch(() => ({ data: { data: null } })),
          getMyHistory().catch(() => ({ data: { data: [] } }))
        ]);

        const shiftData = shiftRes.data?.data || null;
        setActiveShift(shiftData);
        setRecentObservations(obsRes.data?.data || []);
        setLatestHandover(handoverRes.data?.data || null);
        setMyHistory(histRes.data?.data || []);

        await fetchShiftActivities(shiftData?.id);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  // Search Patients
  useEffect(() => {
    if (!isLogModalOpen) return;
    let isMounted = true;
    const loadPatients = async () => {
      setSearchingSukraa(true);
      try {
        const q = patientSearchQuery.trim();
        let list = [];
        if (q.length > 0) {
          const res = await api.get('/patients/search', { params: { q, limit: 20 } });
          list = res.data?.data || [];
        } else {
          const res = await api.get('/patients', { params: { limit: 20 } });
          list = res.data?.data || [];
        }
        if (isMounted) setSukraaSearchResults(list);
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setSearchingSukraa(false);
      }
    };
    const timer = setTimeout(loadPatients, 200);
    return () => { isMounted = false; clearTimeout(timer); };
  }, [patientSearchQuery, isLogModalOpen]);

  const handleSelectPatient = (pat) => {
    setActivityForm(prev => ({
      ...prev,
      patient_id: pat.pid || pat.patient_id,
      patient_name: pat.full_name || pat.patient_name,
    }));
    setPatientSearchQuery('');
    setSukraaSearchResults([]);
  };

  const handleLogActivitySubmit = async (e) => {
    e.preventDefault();
    if (!activityForm.patient_id || !activityForm.activity_summary.trim()) {
      toast.error('Please enter a valid patient ID and activity notes');
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
        toast.success('Activity logged successfully');
        setIsLogModalOpen(false);
        setActivityForm({
          patient_id: '',
          patient_name: '',
          ward: 'STATION 1',
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
      toast.error(err.response?.data?.message || 'Failed to log activity');
    } finally {
      setSubmittingActivity(false);
    }
  };

  const filteredActivities = useMemo(() => {
    if (!searchQuery.trim()) return shiftActivities;
    const q = searchQuery.toLowerCase().trim();
    return shiftActivities.filter(a =>
      (a.patient_name && a.patient_name.toLowerCase().includes(q)) ||
      (a.patient_id && String(a.patient_id).toLowerCase().includes(q)) ||
      (a.activity_summary && a.activity_summary.toLowerCase().includes(q))
    );
  }, [shiftActivities, searchQuery]);

  const filteredObservations = useMemo(() => {
    if (!searchQuery.trim()) return recentObservations;
    const q = searchQuery.toLowerCase().trim();
    return recentObservations.filter(o =>
      (o.patient_name && o.patient_name.toLowerCase().includes(q)) ||
      (o.patient_id && String(o.patient_id).toLowerCase().includes(q))
    );
  }, [recentObservations, searchQuery]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-16 text-center text-xs font-semibold text-slate-400">
        Loading Nursing Shift Dashboard...
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6 bg-slate-50 min-h-screen">
      
      {/* ── Top Header Bar (Light & Clean) ── */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#E6F4F6] text-[#007B8A] flex items-center justify-center font-bold">
            <Stethoscope size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-800 tracking-tight">Nursing Shift Control</h1>
              {activeShift ? (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active Session
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                  Off Duty
                </span>
              )}
            </div>
            <p className="text-slate-500 text-xs mt-0.5">Clinical shift logging, vitals & handover documentation</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isManagerOrChefNurse && (
            <button
              onClick={() => navigate('/shifts?view=manager')}
              className="h-9 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-200 shadow-xs"
              title="Switch to Manager Shift Logbook & Shifts Report"
            >
              <FileText size={15} /> Shift Logbook & Reports
            </button>
          )}

          <button
            onClick={() => setIsLogModalOpen(true)}
            className="h-9 px-4 rounded-xl bg-[#007B8A] hover:bg-[#005D68] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Plus size={15} /> Log Activity
          </button>

          {!activeShift ? (
            <button
              onClick={() => navigate('/shifts/open')}
              className="h-9 px-4 rounded-xl bg-[#007B8A] hover:bg-[#005D68] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              Start Shift <ArrowRight size={14} />
            </button>
          ) : (
            <button
              onClick={() => navigate(`/shifts/close/${activeShift.id}`)}
              className="h-9 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              End Shift <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>

      {/* ── Metric Cards Row (4 Light Cards, 0 Dark Boxes) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Shift Status</p>
          <p className="text-lg font-bold text-slate-800 mt-1">
            {activeShift ? (activeShift.nursing_ward || 'STATION 1') : 'No Active Shift'}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            {activeShift?.opened_at ? `Started ${formatExactTime(activeShift.opened_at)}` : 'Click Start Shift to begin'}
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Logged Interventions</p>
          <p className="text-lg font-bold text-[#007B8A] mt-1">{shiftActivities.length}</p>
          <p className="text-xs text-slate-500 mt-0.5">Today's recorded activities</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Clinical Sheets</p>
          <p className="text-lg font-bold text-sky-700 mt-1">{recentObservations.length}</p>
          <p className="text-xs text-slate-500 mt-0.5">Sukraa EHR observation sheets</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Past Sessions</p>
          <p className="text-lg font-bold text-slate-700 mt-1">{myHistory.length}</p>
          <p className="text-xs text-slate-500 mt-0.5">Historical shift sessions</p>
        </div>
      </div>

      {/* ── Handover Note Box (If present, light background) ── */}
      {latestHandover && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#007B8A]">Previous Shift Handover Briefing</span>
            <span className="text-[11px] text-slate-400">By {latestHandover.user_name}</span>
          </div>
          <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 italic">
            "{latestHandover.handover_notes}"
          </p>
        </div>
      )}

      {/* ── Live Shift Interventions Summary ── */}
      {activeShift && (
        <div className="bg-white p-4 rounded-2xl border border-teal-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
              <Activity size={18} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">Shift Live Interventions Breakdown</p>
              <p className="text-[11px] text-slate-500">Ward: <span className="font-semibold text-slate-700">{activeShift.nursing_ward || 'STATION 1'}</span> | Wave: <span className="font-semibold text-slate-700">{activeShift.wave || 'Wave 1'}</span></p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="px-3 py-1 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 font-semibold flex items-center gap-1.5">
              <Pill size={14} /> Medication: {shiftActivities.filter(a => a.activity_category === 'Medication Administered').length}
            </span>
            <span className="px-3 py-1 rounded-xl bg-sky-50 text-sky-700 border border-sky-200 font-semibold flex items-center gap-1.5">
              <Activity size={14} /> Vitals: {shiftActivities.filter(a => a.activity_category === 'Vitals Check').length}
            </span>
            <span className="px-3 py-1 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 font-semibold flex items-center gap-1.5">
              <Stethoscope size={14} /> Procedures: {shiftActivities.filter(a => a.activity_category === 'Procedure / Dressing').length}
            </span>
          </div>
        </div>
      )}

      {/* ── Main Activity & Workspace Section ── */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
        
        {/* Navigation Tabs & Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => setActiveTab('ACTIVITIES')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'ACTIVITIES' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Activity Logs ({shiftActivities.length})
            </button>
            <button
              onClick={() => setActiveTab('CLINICAL_SHEETS')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'CLINICAL_SHEETS' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Clinical Sheets ({recentObservations.length})
            </button>
            <button
              onClick={() => setActiveTab('HISTORY')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'HISTORY' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Past Sessions ({myHistory.length})
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search patient, PID, notes..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#007B8A] focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Tab 1: Activity Logs Feed */}
        {activeTab === 'ACTIVITIES' && (
          <div className="space-y-3">
            {filteredActivities.length > 0 ? (
              filteredActivities.map((act) => {
                const colorStyle = CATEGORY_COLORS[act.activity_category] || CATEGORY_COLORS['General Note'];
                const pid = act.sukraa_pid || act.patient_id || 'N/A';
                const vitals = act.vitals_snapshot || {};
                const ago = getTimeAgo(act.timestamp || act.created_at);

                return (
                  <div
                    key={act.id}
                    className="p-4 rounded-xl border border-slate-200 bg-white space-y-2 hover:border-slate-300 transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="font-bold text-slate-900 text-xs">{act.patient_name}</span>
                        <span className="px-2 py-0.5 text-[10px] font-semibold bg-[#E6F4F6] text-[#007B8A] rounded border border-[#CCE8EC]">
                          PID: #{pid}
                        </span>
                        <span className={`px-2.5 py-0.5 text-[10px] font-medium rounded-full border ${colorStyle}`}>
                          {act.activity_category}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {formatExactTime(act.timestamp || act.created_at)} {ago && `(${ago})`}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      {act.activity_summary}
                    </p>

                    {(vitals.bp || vitals.pulse || vitals.temp || vitals.spo2) && (
                      <div className="flex items-center gap-2 text-[10px] font-medium text-slate-600 flex-wrap pt-0.5">
                        <span className="text-slate-400 uppercase">Vitals:</span>
                        {vitals.bp && <span className="px-2 py-0.5 bg-rose-50 text-rose-700 rounded border border-rose-200">BP: {vitals.bp}</span>}
                        {vitals.pulse && <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded border border-amber-200">HR: {vitals.pulse}</span>}
                        {vitals.temp && <span className="px-2 py-0.5 bg-sky-50 text-sky-700 rounded border border-sky-200">Temp: {vitals.temp}</span>}
                        {vitals.spo2 && <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded border border-emerald-200">SpO2: {vitals.spo2}</span>}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="py-12 text-center text-slate-400 text-xs font-medium">
                No activity logs recorded yet.
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Clinical Sheets */}
        {activeTab === 'CLINICAL_SHEETS' && (
          <div className="space-y-3">
            {filteredObservations.length > 0 ? (
              filteredObservations.map((obs) => (
                <div
                  key={obs.id}
                  onClick={() => setActiveClinicalPatient(obs)}
                  className="p-4 rounded-xl border border-slate-200 bg-white hover:border-[#007B8A] transition-all cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <p className="font-bold text-slate-900 text-xs">{obs.patient_name}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">PID: #{obs.sukraa_pid || obs.patient_id} • {obs.gender || 'N/A'}</p>
                  </div>
                  <div className="text-right">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {obs.status || 'Draft'}
                    </span>
                    <p className="text-[11px] text-slate-400 mt-1">{formatExactDate(obs.created_at)}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-slate-400 text-xs font-medium">
                No clinical sheets found.
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Past Sessions History */}
        {activeTab === 'HISTORY' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="py-2.5 px-3 text-[11px] font-semibold text-slate-500 uppercase">Role</th>
                  <th className="py-2.5 px-3 text-[11px] font-semibold text-slate-500 uppercase">Opened Date</th>
                  <th className="py-2.5 px-3 text-[11px] font-semibold text-slate-500 uppercase">Wave</th>
                  <th className="py-2.5 px-3 text-[11px] font-semibold text-slate-500 uppercase text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {myHistory.map((hist) => (
                  <tr
                    key={hist.id}
                    onClick={() => navigate(`/shifts/${hist.id}`)}
                    className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer text-xs"
                  >
                    <td className="py-3 px-3 font-semibold text-slate-800 uppercase">{hist.shift_role?.replace(/_/g, ' ')}</td>
                    <td className="py-3 px-3 text-slate-600">{formatExactDate(hist.opened_at)}</td>
                    <td className="py-3 px-3 text-slate-600">{hist.wave || 'Wave 1'}</td>
                    <td className="py-3 px-3 text-right">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        hist.is_flagged ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        {hist.is_flagged ? 'Flagged' : 'Closed Clean'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Log Activity Modal ── */}
      <Modal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        title="Log Clinical Intervention"
        maxWidth="600px"
      >
        <form onSubmit={handleLogActivitySubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Sukraa Patient PID / Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search Sukraa Patient by PID or Name..."
                value={activityForm.patient_id ? `${activityForm.patient_name} (PID #${activityForm.patient_id})` : patientSearchQuery}
                onChange={e => {
                  setPatientSearchQuery(e.target.value);
                  if (activityForm.patient_id) {
                    setActivityForm(prev => ({ ...prev, patient_id: '', patient_name: '' }));
                  }
                }}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#007B8A]"
              />
              {activityForm.patient_id && (
                <button
                  type="button"
                  onClick={() => setActivityForm(prev => ({ ...prev, patient_id: '', patient_name: '' }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-rose-600 font-bold hover:underline"
                >
                  Change
                </button>
              )}
            </div>

            {!activityForm.patient_id && sukraaSearchResults.length > 0 && (
              <div className="mt-1 bg-white border border-slate-200 rounded-xl shadow-md max-h-48 overflow-y-auto divide-y divide-slate-100">
                {sukraaSearchResults.map((pat, idx) => (
                  <div
                    key={pat.pid || pat.id || idx}
                    onClick={() => handleSelectPatient(pat)}
                    className="p-2.5 hover:bg-[#E6F4F6] cursor-pointer flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-semibold text-slate-800">{pat.full_name || pat.patient_name}</p>
                      <p className="text-[10px] text-slate-500">PID: #{pat.pid || pat.patient_id}</p>
                    </div>
                    <span className="px-2 py-0.5 text-[10px] font-medium bg-[#007B8A] text-white rounded">Select</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Category</label>
              <select
                value={activityForm.activity_category}
                onChange={e => setActivityForm(prev => ({ ...prev, activity_category: e.target.value }))}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#007B8A]"
              >
                <option value="Medication Administered">Medication Administered</option>
                <option value="Vitals Check">Vitals Check</option>
                <option value="Procedure / Dressing">Procedure / Dressing</option>
                <option value="Doctor Round / Consult">Doctor Round / Consult</option>
                <option value="Nursing Care / Hygiene">Nursing Care / Hygiene</option>
                <option value="General Note">General Clinical Note</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Nursing Station</label>
              <select
                value={activityForm.ward}
                onChange={e => setActivityForm(prev => ({ ...prev, ward: e.target.value }))}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#007B8A]"
              >
                <option value="STATION 1">STATION 1 (Vitals Check)</option>
                <option value="STATION 2">STATION 2 (Cardiology)</option>
                <option value="MINOR SURGERY">MINOR SURGERY</option>
                <option value="PAEDIATRICS">PAEDIATRICS</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Intervention Notes <span className="text-rose-500">*</span></label>
            <textarea
              rows={3}
              placeholder="Enter activity description, medication dose, or nursing notes..."
              value={activityForm.activity_summary}
              onChange={e => setActivityForm(prev => ({ ...prev, activity_summary: e.target.value }))}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#007B8A]"
              required
            />
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 space-y-2">
            <p className="text-[11px] font-semibold text-slate-600">Optional Vitals Snapshot</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <input
                type="text"
                placeholder="BP (120/80)"
                value={activityForm.vitals_bp}
                onChange={e => setActivityForm(prev => ({ ...prev, vitals_bp: e.target.value }))}
                className="p-2 bg-white border border-slate-200 rounded-lg text-xs"
              />
              <input
                type="text"
                placeholder="HR (bpm)"
                value={activityForm.vitals_pulse}
                onChange={e => setActivityForm(prev => ({ ...prev, vitals_pulse: e.target.value }))}
                className="p-2 bg-white border border-slate-200 rounded-lg text-xs"
              />
              <input
                type="text"
                placeholder="Temp (°C)"
                value={activityForm.vitals_temp}
                onChange={e => setActivityForm(prev => ({ ...prev, vitals_temp: e.target.value }))}
                className="p-2 bg-white border border-slate-200 rounded-lg text-xs"
              />
              <input
                type="text"
                placeholder="SpO2 (%)"
                value={activityForm.vitals_spo2}
                onChange={e => setActivityForm(prev => ({ ...prev, vitals_spo2: e.target.value }))}
                className="p-2 bg-white border border-slate-200 rounded-lg text-xs"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsLogModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingActivity}
              className="px-4 py-2 bg-[#007B8A] hover:bg-[#005D68] text-white text-xs font-semibold rounded-xl shadow-xs"
            >
              {submittingActivity ? 'Saving...' : 'Save Activity Entry'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Embedded Clinical Sheet Modal */}
      <Modal
        isOpen={activeClinicalPatient !== null}
        onClose={() => setActiveClinicalPatient(null)}
        title={`${activeClinicalPatient?.patient_name || 'Sukraa Patient'} — Clinical Observation Sheet`}
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
                if (res.data?.success && res.data?.data) setRecentObservations(res.data.data);
              }).catch(() => {});
            }}
          />
        )}
      </Modal>
    </div>
  );
}
