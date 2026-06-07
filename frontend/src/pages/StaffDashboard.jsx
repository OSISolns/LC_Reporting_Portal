import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getCancellations } from '../api/cancellations';
import { getRefunds } from '../api/refunds';
import { getIncidents } from '../api/incidents';
import { getResultTransfers } from '../api/resultTransfer';
import { getMyActiveShift } from '../api/shifts';
import api from '../api/axios';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  FileText, ReceiptText, AlertTriangle, Clock,
  CheckCircle, Plus, ChevronRight, ExternalLink,
  TrendingUp, Info, RefreshCw, Stethoscope
} from 'lucide-react';
import StaffScoreWidget from './performance/components/StaffScoreWidget';

// ── Role labels ───────────────────────────────────────────────────────────────
const ROLE_LABEL = {
  cashier:           'Member of Finance',
  principal_cashier: 'Principal Cashier',
  customer_care:     'Patient Relations',
  operations_staff:  'Operations Staff',
  lab_team_lead:     'Laboratory Lead',
  it_officer:        'IT Systems & Security',
  nurse:             'Clinical Nurse',
  'chef-nurse':        'Chief Nurse Manager',
  pa:                'MD Personal Assistant',
};

// ── Status pill ───────────────────────────────────────────────────────────────
const STATUS_STYLES = {
  pending:  { bg: 'bg-[#fff7ed]', text: 'text-[#9a3412]', border: 'border-[#9a3412]/20', label: 'Pending' },
  verified: { bg: 'bg-[#eff6ff]', text: 'text-[#1e40af]', border: 'border-[#1e40af]/20', label: 'Verified' },
  approved: { bg: 'bg-[#f0fdf4]', text: 'text-[#166534]', border: 'border-[#166534]/20', label: 'Finalized' },
  rejected: { bg: 'bg-[#fef2f2]', text: 'text-[#991b1b]', border: 'border-[#991b1b]/20', label: 'Rejected' },
  reviewed: { bg: 'bg-[#f0fdf4]', text: 'text-[#166534]', border: 'border-[#166534]/20', label: 'Reviewed' },
};

const StatusPill = ({ status }) => {
  const s = STATUS_STYLES[status] || { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', label: status };
  return (
    <span className={`px-2.5 py-1 rounded-full text-[0.65rem] font-bold uppercase tracking-wider whitespace-nowrap border ${s.bg} ${s.text} ${s.border}`}>
      {s.label}
    </span>
  );
};

// ── Small stat card ───────────────────────────────────────────────────────────
const MiniStat = ({ label, value, color, icon }) => (
  <div className="bg-white rounded-2xl p-5 border border-slate-200 flex items-center gap-4 hover:-translate-y-1 hover:shadow-xl hover:border-slate-300 transition-all duration-300 shadow-sm group">
    <div 
      className="p-3 rounded-xl shrink-0 group-hover:scale-110 transition-transform duration-300"
      style={{ backgroundColor: `${color}15`, color }}
    >
      {icon}
    </div>
    <div>
      <p className="m-0 text-xs text-slate-500 font-bold uppercase tracking-wider">{label}</p>
      <p className="m-0 mt-1 text-3xl font-black text-slate-800 leading-none">{value}</p>
    </div>
  </div>
);

// ── Recent list row ───────────────────────────────────────────────────────────
const RecentRow = ({ item, path, primary, secondary, navigate, i }) => (
  <div
    onClick={() => navigate(path)}
    className="flex items-center gap-4 p-4 cursor-pointer transition-colors hover:bg-slate-50 border-b border-slate-100 last:border-0 group"
  >
    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-sm font-black text-[#1b669d] shrink-0 border border-slate-200 group-hover:bg-[#1b669d] group-hover:text-white transition-colors duration-300">
      {i + 1}
    </div>
    <div className="flex-1 min-w-0">
      <p className="m-0 font-bold text-sm text-slate-800 truncate">{primary}</p>
      <p className="m-0 mt-1 text-xs text-slate-500 truncate">{secondary}</p>
    </div>
    <StatusPill status={item.status} />
    <ChevronRight className="w-4 h-4 text-slate-300 shrink-0 group-hover:text-[#1b669d] group-hover:translate-x-1 transition-all duration-300" />
  </div>
);

// ── Quick action button ───────────────────────────────────────────────────────
const QuickAction = ({ label, icon, color, path, navigate }) => (
  <button 
    onClick={() => navigate(path)}
    className="p-5 rounded-2xl border border-slate-200 bg-white flex flex-col items-center gap-3 cursor-pointer transition-all duration-300 flex-1 min-w-[140px] hover:-translate-y-1 hover:shadow-lg group"
    style={{ '--hover-border': color }}
    onMouseEnter={e => e.currentTarget.style.borderColor = color}
    onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}
  >
    <div 
      className="p-3 rounded-xl shadow-sm group-hover:scale-110 transition-transform duration-300"
      style={{ backgroundColor: `${color}15`, color }}
    >
      {icon}
    </div>
    <span className="font-bold text-sm text-slate-800 text-center leading-tight">{label}</span>
  </button>
);

// ── Tip card ─────────────────────────────────────────────────────────────────
const TipCard = ({ tips }) => (
  <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-300">
    <div className="flex items-center gap-2 mb-4">
      <Info className="w-5 h-5 text-[#1b669d]" />
      <span className="font-bold text-slate-800">Guidance & Compliance</span>
    </div>
    <ul className="m-0 pl-5 flex flex-col gap-3">
      {tips.map((t, i) => (
        <li key={i} className="text-sm text-slate-600 leading-relaxed font-medium marker:text-[#1b669d]">
          {t}
        </li>
      ))}
    </ul>
  </div>
);

// ══════════════════════════════════════════════════════════════════════════════
const StaffDashboard = () => {
  const { user, hasPermission } = useAuth();
  const navigate = useNavigate();
  const isPrincipal = user?.role === 'principal_cashier';
  const isOps       = user?.role === 'operations_staff';
  const [data,    setData]    = useState({ canc: [], refunds: [], incidents: [], transfers: [], clinical: [] });
  const [loading, setLoading] = useState(true);
  const [now,     setNow]     = useState(new Date());
  const [activeShift, setActiveShift] = useState(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cRes, rRes, iRes, tRes, sRes, clRes] = await Promise.all([
        (!isOps && !['nurse', 'chef-nurse'].includes(user?.role)) ? getCancellations().catch(() => null) : Promise.resolve(null),
        (!isOps && !['nurse', 'chef-nurse'].includes(user?.role)) ? getRefunds().catch(() => null) : Promise.resolve(null),
        getIncidents().catch(() => null),
        getResultTransfers().catch(() => null),
        getMyActiveShift().catch(() => null),
        ['nurse', 'chef-nurse'].includes(user?.role) ? api.get('/clinical/observations/recent').catch(() => ({ data: { data: [] } })) : Promise.resolve({ data: { data: [] } })
      ]);
      setData({
        canc:      cRes?.data?.data || [],
        refunds:   rRes?.data?.data || [],
        incidents: iRes?.data?.data || [],
        transfers: tRes?.data?.data || [],
        clinical:  clRes?.data?.data || []
      });
      setActiveShift(sRes?.data?.data || null);
    } finally { setLoading(false); }
  }, [isOps, user?.role]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingSpinner />;

  const greeting = now.getHours() < 12 ? 'Good Morning' : now.getHours() < 17 ? 'Good Afternoon' : 'Good Evening';
  const firstName = user?.fullName?.split(' ').slice(-1)[0] || user?.fullName;

  // Compute simple counts
  const myCanc      = data.canc.slice(0,5);
  const myRef       = data.refunds.slice(0,5);
  const myInc       = data.incidents.slice(0,5);
  const myClinical  = data.clinical.slice(0,5);
  const pendCount   = (['nurse', 'chef-nurse'].includes(user?.role) ? data.clinical.filter(c => c.status === 'Draft').length : 0) + 
                      data.canc.filter(c => c.status === 'pending').length + 
                      data.transfers.filter(t => t.status === 'pending' || t.status === 'reviewed').length;
  const approvedAmt = data.refunds.filter(r => r.status === 'approved').reduce((s, r) => s + Number(r.amount_to_be_refunded || 0), 0);
  const myTransfers = data.transfers.slice(0, 5);

  const ROLE_TIPS = {
    cashier:           ['Always verify PID before creating a cancellation.', 'Double-check amounts before submitting — corrections must go through full workflow.', 'Attach the correct receipt numbers to every request.'],
    principal_cashier: ['You can now view AI Insights for cancellations and refunds.', 'Review pending submissions from your team promptly.', 'Ensure all cashier submissions are accurate before they reach management.'],
    customer_care:     ['Complete all patient information fields accurately.', 'If in doubt, escalate to your supervisor before submitting.', "Incident reports must be filed within 24 hours of the event."],
    operations_staff:  ['Report incidents immediately — time-stamping matters.', 'Include all contributing factors for review.', 'Use "Near Miss" for events that were caught before harm occurred.'],
    lab_team_lead:     ['Ensure all result transfers are approved only after verifying SID data.', 'Confirm the technician who executed the change in the lab system.', 'Rejected transfers should always include a specific reason for audit purposes.'],
    it_officer:        ['Monitor audit logs daily for unusual activity patterns.', 'Ensure staff accounts follow clinical access policy.', 'Review reported incidents to ensure system integrity and data accuracy.'],
    nurse:             ['Ensure clinical observation sheets are synchronized before shift handover.', 'Record all medication administration in real-time.', 'All patient incidents must be documented via the Incident Reporting module immediately.'],
    'chef-nurse':      ['Review all pending clinical observation sheets before shift close.', 'Ensure nursing staff are compliant with MAR documentation standards.', 'All incidents in your department require your review and approval.'],
    pa:                ['Monitor daily reports and clinical observations for the MD.', 'Ensure all data is reviewed before presenting to the MD.'],
  };
  const tips = ROLE_TIPS[user?.role] || [];

  return (
    <div className="pb-10 w-full">
      {/* ── Hero ── */}
      <div className="bg-[#1b669d] rounded-3xl p-8 lg:p-10 mb-8 text-white relative overflow-hidden shadow-[0_10px_30px_rgba(27,102,157,0.2)]">
        <div className="absolute -top-10 -right-10 w-64 h-64 rounded-full bg-white/5 backdrop-blur-3xl" />
        <div className="absolute top-20 right-40 w-32 h-32 rounded-full bg-white/5 backdrop-blur-3xl" />
        
        <div className="relative z-10">
          <p className="m-0 mb-2 text-sm text-blue-100 font-bold uppercase tracking-widest">
            {now.toLocaleDateString('en-RW', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          <h1 className="m-0 text-3xl md:text-4xl font-black text-white drop-shadow-sm mb-4">
            {greeting}, {firstName} 👋
          </h1>
          
          <div className="flex flex-wrap items-center gap-3 mt-4">
            <span className="bg-white/10 border border-white/20 px-4 py-1.5 rounded-full text-sm font-bold shadow-sm backdrop-blur-md">
              {ROLE_LABEL[user?.role] || user?.role}
            </span>
            <span className="hidden sm:block text-white/30">•</span>
            {activeShift ? (
              <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-100 backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Shift Live: {activeShift.wave || 'Active Shift'} ({
                    activeShift.start_hour === '07:00' ? '07:00 AM - 03:00 PM' :
                    activeShift.start_hour === '08:00' ? '08:00 AM - 04:00 PM' :
                    activeShift.start_hour === '09:00' ? '09:00 AM - 05:00 PM' :
                    activeShift.start_hour === '15:00' ? '03:00 PM - 09:00 PM' :
                    new Date(activeShift.opened_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  })
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/60 backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-white/30" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Shift Ended / Offline
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Active Session Banner ── */}
      {activeShift && (
        <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-100 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600 shrink-0">
              <Clock size={24} />
            </div>
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-[#1b669d] mb-1">Active Shift Session Running</h4>
              <p className="text-base font-black text-slate-800">
                {activeShift.wave || 'Custom Wave'} · {
                  activeShift.start_hour === '07:00' ? '07:00 AM - 03:00 PM' :
                  activeShift.start_hour === '08:00' ? '08:00 AM - 04:00 PM' :
                  activeShift.start_hour === '09:00' ? '09:00 AM - 05:00 PM' :
                  activeShift.start_hour === '15:00' ? '03:00 PM - 09:00 PM' :
                  'Active'
                }
              </p>
              <p className="text-xs font-bold text-slate-500 mt-1">
                Started at {new Date(activeShift.opened_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({activeShift.shift_role?.replace(/_/g, ' ')?.toUpperCase()})
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/shifts')}
            className="px-6 py-3 bg-[#1b669d] hover:bg-[#124d77] text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-sm transition-all whitespace-nowrap"
          >
            Manage Session
          </button>
        </div>
      )}

      {/* ── Mini stats ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5 mb-8">
        {hasPermission('clinical_observation', 'view') && <MiniStat label="Active Assessments" value={data.clinical.length} color="#1b669e" icon={<Stethoscope size={24} />} />}
        {hasPermission('cancellations', 'view') && <MiniStat label={user?.role === 'it_officer' ? "All Cancellations" : "My Cancellations"} value={data.canc.length} color="#1b669d" icon={<FileText size={24} />} />}
        {hasPermission('refunds', 'view') && <MiniStat label={user?.role === 'it_officer' ? "All Refunds" : "My Refunds"} value={data.refunds.length} color="#92400e" icon={<ReceiptText size={24} />} />}
        {hasPermission('incident_reports', 'view') && <MiniStat label={user?.role === 'it_officer' ? "All Incidents" : "My Incidents"} value={data.incidents.length} color="#b91c1c" icon={<AlertTriangle size={24} />} />}
        {hasPermission('results_transfer', 'view') && <MiniStat label={user?.role === 'it_officer' ? "All Transfers" : "My Transfers"} value={data.transfers.length} color="#059669" icon={<RefreshCw size={24} />} />}
        {pendCount > 0 && <MiniStat label="Pending Action" value={pendCount} color="#4338ca" icon={<Clock size={24} />} />}
      </div>

      {/* ── Quick actions ── */}
      {user?.role !== 'consultant' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 mb-8 shadow-sm">
          <h3 className="m-0 mb-6 text-xl font-black text-slate-800">Workflow Actions</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {hasPermission('shifts', 'create') && (
              !activeShift ? (
                <QuickAction label="Start a Shift" icon={<Clock size={24} />} color="#059669" path="/shifts/open" navigate={navigate} />
              ) : (
                <QuickAction label="Running Session" icon={<Clock size={24} />} color="#0284c7" path="/shifts" navigate={navigate} />
              )
            )}
            {hasPermission('cancellations', 'create') && <QuickAction label="New Cancellation" icon={<Plus size={24} />} color="#1b669e" path="/cancellations/new" navigate={navigate} />}
            {hasPermission('refunds', 'create') && <QuickAction label="New Refund" icon={<Plus size={24} />} color="#003b44" path="/refunds/new" navigate={navigate} />}
            {hasPermission('incident_reports', 'create') && <QuickAction label="Report Incident" icon={<AlertTriangle size={24} />} color="#b91c1c" path="/incidents/new" navigate={navigate} />}
            {hasPermission('results_transfer', 'create') && <QuickAction label="Result Transfer" icon={<RefreshCw size={24} />} color="#059669" path="/results-transfer" navigate={navigate} />}
            {hasPermission('clinical_observation', 'view') && <QuickAction label="Nursing Hub" icon={<Stethoscope size={24} />} color="#1b669e" path="/nursing-hub" navigate={navigate} />}
            <QuickAction label="View History" icon={<ExternalLink size={24} />} color="#334155" path="/incidents" navigate={navigate} />
            {hasPermission('reports', 'view') && <QuickAction label="AI Platform" icon={<TrendingUp size={24} />} color="#4338ca" path="/ai-insights" navigate={navigate} />}
          </div>
        </div>
      )}

      {/* ── Recent submissions + tips ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent activity */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h3 className="m-0 text-xl font-black text-slate-800">My Recent Submissions</h3>
          </div>
          
          {myCanc.length + myRef.length + myInc.length + myTransfers.length + myClinical.length === 0 ? (
            <div className="py-20 px-8 text-center text-slate-500">
              <div className="inline-flex p-6 rounded-full bg-slate-50 mb-4">
                <FileText size={48} className="text-slate-300" />
              </div>
              <p className="m-0 text-lg font-bold text-slate-800">No Activity Yet</p>
              <p className="m-0 mt-2 text-sm font-medium">Your recent submissions will appear here.</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {['nurse', 'chef-nurse'].includes(user?.role) && myClinical.map((item, i) => (
                <RecentRow key={`cl-${item.id}`} item={item} i={i} navigate={navigate}
                  path={`/patients/${item.patient_id}/clinical-sheet?queue_id=${item.queue_id}`}
                  primary={item.patient_name}
                  secondary={`Clinical Observation · ${item.ward || 'General'}`}
                />
              ))}
              {myCanc.map((item, i) => (
                <RecentRow key={`c-${item.id}`} item={item} i={i + (['nurse', 'chef-nurse'].includes(user?.role) ? myClinical.length : 0)} navigate={navigate}
                  path={`/cancellations/${item.id}`}
                  primary={item.patient_full_name}
                  secondary={`Invoice Cancellation · PID: ${item.pid_number}`}
                />
              ))}
              {myRef.map((item, i) => (
                <RecentRow key={`r-${item.id}`} item={item} i={i + myCanc.length + (['nurse', 'chef-nurse'].includes(user?.role) ? myClinical.length : 0)} navigate={navigate}
                  path={`/refunds/${item.id}`}
                  primary={item.patient_full_name}
                  secondary={`Payment Refund · RWF ${Number(item.amount_to_be_refunded || 0).toLocaleString()}`}
                />
              ))}
              {myInc.map((item, i) => (
                <RecentRow key={`i-${item.id}`} item={item} i={i + myCanc.length + myRef.length + (['nurse', 'chef-nurse'].includes(user?.role) ? myClinical.length : 0)} navigate={navigate}
                  path={`/incidents/${item.id}`}
                  primary={item.department || 'Clinical Incident'}
                  secondary={`${item.incident_type} Event · ${item.area_of_incident || ''}`}
                />
              ))}
              {myTransfers.map((item, i) => (
                <RecentRow key={`rt-${item.id}`} item={item} i={i + myCanc.length + myRef.length + myInc.length + (['nurse', 'chef-nurse'].includes(user?.role) ? myClinical.length : 0)} navigate={navigate}
                  path={`/results-transfer`}
                  primary={`Transfer: ${item.old_sid} ➔ ${item.new_sid}`}
                  secondary={`Result Transfer Request · ${new Date(item.created_at).toLocaleDateString()}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Tips + Approved amount */}
        <div className="flex flex-col gap-6">
          {approvedAmt > 0 && (
            <div className="bg-emerald-600 rounded-3xl p-8 text-white shadow-[0_10px_20px_rgba(5,150,105,0.2)] relative overflow-hidden group">
              <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full group-hover:scale-110 transition-transform duration-500" />
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle size={20} className="text-emerald-200" />
                  <span className="text-xs font-black uppercase tracking-widest text-emerald-100">Success Metrics</span>
                </div>
                <p className="m-0 text-4xl font-black mb-1 text-white">RWF {approvedAmt.toLocaleString()}</p>
                <p className="m-0 text-sm font-bold text-emerald-100">Cumulative Approved Refunds</p>
              </div>
            </div>
          )}
          {['cashier', 'customer_care'].includes(user?.role) && (
            <StaffScoreWidget />
          )}
          <TipCard tips={tips} />
        </div>
      </div>
    </div>
  );
};

export default StaffDashboard;
