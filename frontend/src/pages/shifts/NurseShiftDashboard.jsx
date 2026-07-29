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
  FileText
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

export default function NurseShiftDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeShift, setActiveShift] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentObservations, setRecentObservations] = useState([]);
  const [latestHandover, setLatestHandover] = useState(null);
  const [myHistory, setMyHistory] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [activeClinicalPatient, setActiveClinicalPatient] = useState(null);

  useEffect(() => {
    async function init() {
      try {
        const [shiftRes, obsRes, handoverRes, histRes] = await Promise.all([
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
        ]);
        setActiveShift(shiftRes.data?.data || null);
        setRecentObservations(obsRes.data?.data || []);
        setLatestHandover(handoverRes.data?.data || null);
        setMyHistory(histRes.data?.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const filteredObservations = useMemo(() => {
    let list = recentObservations;
    if (filterStatus === 'FINAL') {
      list = list.filter(o => o.status === 'Final' || o.status === 'Verified');
    } else if (filterStatus === 'DRAFT') {
      list = list.filter(o => o.status === 'Draft');
    }

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
  }, [recentObservations, filterStatus, searchQuery]);

  if (loading) return <div className="p-20 text-center font-black text-slate-300 uppercase tracking-widest">Initialising Clinical Protocol...</div>;

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-[24px] bg-[#1b669d] flex items-center justify-center text-white shadow-xl shadow-[#1b669d]/20">
            <Stethoscope size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Nurse Shift Control</h1>
            <p className="text-slate-500 font-bold flex items-center gap-2">
              <ShieldCheck size={14} className="text-emerald-500" /> Professional Clinical Workflow
            </p>
          </div>
        </div>

        {!activeShift ? (
          <Button 
            onClick={() => navigate('/shifts/open')}
            className="h-14 px-8 rounded-2xl bg-[#1b669d] hover:bg-[#124d77] text-white font-black uppercase tracking-widest shadow-lg shadow-[#1b669d]/20"
          >
            Start New Shift <ArrowRight size={18} className="ml-2" />
          </Button>
        ) : (
          <Button 
            onClick={() => navigate(`/shifts/close/${activeShift.id}`)}
            className="h-14 px-8 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black uppercase tracking-widest shadow-lg shadow-rose-600/20"
          >
            End Shift & Handover <ArrowRight size={18} className="ml-2" />
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Active Shift Card */}
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
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Current Assignment</p>
                <p className="font-black text-slate-800 text-lg">General Ward</p>
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

        {/* Clinical Activity Summary (Sukraa HIMS Patient Integration) */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-8 space-y-6 border border-slate-200 shadow-xl rounded-[28px] bg-white">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-sky-100 text-sky-800 rounded-md flex items-center gap-1">
                    <Database size={10} /> Sukraa HIMS Sync
                  </span>
                  <span className="text-xs text-slate-400 font-semibold">• Live Encounters</span>
                </div>
                <h3 className="text-xl font-black text-slate-900 flex items-center gap-2.5">
                  <ClipboardList size={22} className="text-[#1b669d]" /> Clinical Activity Summary
                </h3>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  Exact patient encounters & clinical observations pulled directly from Sukraa HIMS
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Button variant="ghost" size="sm" onClick={() => navigate('/nursing-hub')} className="text-[#1b669d] font-bold text-xs">
                  Nursing Hub <ExternalLink size={14} className="ml-1" />
                </Button>
              </div>
            </div>

            {/* Sub-header Filter & Search bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-full sm:w-auto">
                {[
                  { id: 'ALL', label: `All (${recentObservations.length})` },
                  { id: 'FINAL', label: `Finalised (${recentObservations.filter(o => o.status === 'Final' || o.status === 'Verified').length})` },
                  { id: 'DRAFT', label: `Drafts (${recentObservations.filter(o => o.status === 'Draft').length})` },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setFilterStatus(tab.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      filterStatus === tab.id
                        ? 'bg-white text-sky-900 shadow-2xs font-extrabold'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search PID, name, ward..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-sky-500 focus:bg-white"
                />
              </div>
            </div>

            {/* Patients Activity List */}
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin">
              {filteredObservations.length > 0 ? (
                filteredObservations.map((obs) => {
                  const pid = obs.sukraa_pid || obs.patient_id || 'N/A';
                  const rawTs = obs.timestamp || obs.updated_at || obs.created_at;
                  const exactTime = formatExactTime(rawTs);
                  const exactDate = formatExactDate(rawTs);
                  const ago = getTimeAgo(rawTs);
                  const vitals = obs.vitals_snapshot || {};

                  return (
                    <div
                      key={obs.id || `${obs.patient_id}-${obs.queue_id}`}
                      onClick={() => setActiveClinicalPatient(obs)}
                      className="p-4 border border-slate-200/80 rounded-2xl bg-white hover:border-sky-400 hover:shadow-md transition-all cursor-pointer space-y-3 group"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        {/* Sukraa Patient Header */}
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
                              <span className="text-slate-300">•</span>
                              <span className="text-slate-600 font-bold">{obs.ward || 'General Ward'}</span>
                            </p>
                          </div>
                        </div>

                        {/* Status + Exact Time Stamp */}
                        <div className="flex sm:flex-col items-end justify-between sm:justify-start gap-1 shrink-0">
                          <div className="flex items-center gap-2">
                            <Badge variant={obs.status === 'Draft' ? 'warning' : 'success'}>
                              {obs.status || 'Draft'}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200/70">
                            <Clock size={11} className="text-sky-600 shrink-0" />
                            <span>{exactDate} {exactTime}</span>
                            {ago && <span className="text-sky-700 font-black">({ago})</span>}
                          </div>
                        </div>
                      </div>

                      {/* Vitals Snapshot Bar (if available) */}
                      {(vitals.bp || vitals.pulse || vitals.temp || vitals.spo2) && (
                        <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-[10px] font-extrabold flex-wrap">
                          <span className="text-slate-400 font-black uppercase tracking-wider text-[9px]">Triage Vitals:</span>
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
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <UserCheck size={32} className="mx-auto text-slate-300" />
                  <p className="font-bold text-xs">No Sukraa clinical activity found matching your filter.</p>
                </div>
              )}
            </div>
          </Card>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="bg-white p-6 rounded-[28px] border border-slate-200 shadow-sm flex items-center gap-5">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Heart size={24} />
                </div>
                <div>
                  <p className="text-2xl font-black text-slate-900 leading-none">0</p>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Critical Alerts</p>
                </div>
             </div>
             <div className="bg-white p-6 rounded-[28px] border border-slate-200 shadow-sm flex items-center gap-5">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#1b669d] flex items-center justify-center">
                  <Thermometer size={24} />
                </div>
                <div>
                  <p className="text-2xl font-black text-slate-900 leading-none">{recentObservations.length}</p>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Today's Sukraa Assessments</p>
                </div>
             </div>
          </div>
        </div>
      </div>

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
              }).catch(() => {});
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
