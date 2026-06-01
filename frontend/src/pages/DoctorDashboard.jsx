import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getIncidents } from '../api/incidents';
import api from '../api/axios';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  AlertTriangle,
  Clock,
  CheckCircle,
  Plus,
  ChevronRight,
  TrendingUp,
  Info,
  Stethoscope,
  Users,
  Activity,
  FileText
} from 'lucide-react';

// ── Status pill ───────────────────────────────────────────────────────────────
const STATUS_STYLES = {
  Draft:     { bg: 'bg-[#fff7ed]', text: 'text-[#9a3412]', border: 'border-[#9a3412]/20', label: 'Draft' },
  Verified:  { bg: 'bg-[#eff6ff]', text: 'text-[#1e40af]', border: 'border-[#1e40af]/20', label: 'Verified' },
  Final:     { bg: 'bg-[#f0fdf4]', text: 'text-[#166534]', border: 'border-[#166534]/20', label: 'Final' },
  pending:   { bg: 'bg-[#fff7ed]', text: 'text-[#9a3412]', border: 'border-[#9a3412]/20', label: 'Pending' },
  reviewed:  { bg: 'bg-[#f0fdf4]', text: 'text-[#166534]', border: 'border-[#166534]/20', label: 'Reviewed' },
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
      <span className="font-bold text-slate-800">Clinical Guidelines</span>
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
const DoctorDashboard = () => {
  const { user, hasPermission } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState({ incidents: [], clinical: [] });
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [iRes, clRes] = await Promise.all([
        getIncidents().catch(() => null),
        api.get('/clinical/observations/recent').catch(() => ({ data: { data: [] } }))
      ]);
      setData({
        incidents: iRes?.data?.data || [],
        clinical:  clRes?.data?.data || []
      });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingSpinner />;

  const greeting = now.getHours() < 12 ? 'Good Morning' : now.getHours() < 17 ? 'Good Afternoon' : 'Good Evening';
  const firstName = user?.fullName?.split(' ').slice(-1)[0] || user?.fullName;

  const myInc       = data.incidents.slice(0, 5);
  const myClinical  = data.clinical.slice(0, 8);
  const verifiedCount = data.clinical.filter(c => c.status === 'Verified').length;

  const tips = [
    'You can edit Verified clinical sheets to add your prescriptions.',
    'Ensure all incident reports contain clear details of the clinical event.',
    'Review active assessments periodically and coordinate with nursing staff.',
    'Use the AI suggest feature to accelerate dosage generation in MAR sheets.'
  ];

  return (
    <div className="pb-10 w-full">
      {/* ── Hero ── */}
      <div className="bg-[#1B669E] rounded-3xl p-8 lg:p-10 mb-8 text-white relative overflow-hidden shadow-[0_10px_30px_rgba(27,102,158,0.25)]">
        <div className="absolute -top-10 -right-10 w-64 h-64 rounded-full bg-white/5 backdrop-blur-3xl" />
        <div className="absolute top-20 right-40 w-32 h-32 rounded-full bg-white/10 backdrop-blur-3xl" />
        
        <div className="relative z-10">
          <p className="m-0 mb-2 text-sm text-blue-100 font-bold uppercase tracking-widest flex items-center gap-2">
            <Activity size={16} className="text-white/70" />
            {now.toLocaleDateString('en-RW', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          <h1 className="m-0 text-3xl md:text-4xl font-black text-white drop-shadow-sm mb-4">
            {greeting}, Dr. {firstName} 👨‍⚕️
          </h1>
          
          <div className="flex flex-wrap items-center gap-3 mt-4">
            <span className="bg-white/10 border border-white/20 px-4 py-1.5 rounded-full text-sm font-bold shadow-sm backdrop-blur-md">
              Medical Professional Node
            </span>
            <span className="hidden sm:block text-white/30">•</span>
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-100 backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider">
                Online & Available
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Mini stats ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 mb-8">
        <MiniStat label="Recent Patients" value={data.clinical.length} color="#4338ca" icon={<Users size={24} />} />
        <MiniStat label="Verified Sheets" value={verifiedCount} color="#059669" icon={<CheckCircle size={24} />} />
        <MiniStat label="My Incidents" value={data.incidents.length} color="#b91c1c" icon={<AlertTriangle size={24} />} />
        <MiniStat label="Clinical Portal" value="Go" color="#1b669e" icon={<Stethoscope size={24} />} />
      </div>

      {/* ── Quick actions ── */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 mb-8 shadow-sm">
        <h3 className="m-0 mb-6 text-xl font-black text-slate-800">Clinical Workflow Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <QuickAction label="Doctor Hub" icon={<Stethoscope size={24} />} color="#4338ca" path="/nursing-hub" navigate={navigate} />
          <QuickAction label="E-Prescriptions" icon={<FileText size={24} />} color="#0ea5e9" path="/e-prescriptions" navigate={navigate} />
          {hasPermission('incident_reports', 'create') && <QuickAction label="Report Incident" icon={<AlertTriangle size={24} />} color="#b91c1c" path="/incidents/new" navigate={navigate} />}
          <QuickAction label="Clinical Sheets" icon={<FileText size={24} />} color="#059669" path="/clinical-sheets" navigate={navigate} />
          <QuickAction label="Patient Records" icon={<Users size={24} />} color="#1b669e" path="/nursing-hub" navigate={navigate} />
          {hasPermission('reports', 'view') && <QuickAction label="AI Insights" icon={<TrendingUp size={24} />} color="#4c1d95" path="/ai-insights" navigate={navigate} />}
        </div>
      </div>

      {/* ── Recent submissions + tips ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent activity */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h3 className="m-0 text-xl font-black text-slate-800">Recent Patient Records</h3>
          </div>
          
          {myClinical.length + myInc.length === 0 ? (
            <div className="py-20 px-8 text-center text-slate-500">
              <div className="inline-flex p-6 rounded-full bg-slate-50 mb-4">
                <FileText size={48} className="text-slate-300" />
              </div>
              <p className="m-0 text-lg font-bold text-slate-800">No Patient Records</p>
              <p className="m-0 mt-2 text-sm font-medium">Your recent clinical sheets will appear here.</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {myClinical.map((item, i) => (
                <RecentRow key={`cl-${item.id}`} item={item} i={i} navigate={navigate}
                  path={`/patients/${item.patient_id}/clinical-sheet?queue_id=${item.queue_id}`}
                  primary={item.patient_name}
                  secondary={`Clinical Sheet · ${item.ward || 'General'}`}
                />
              ))}
              {myInc.map((item, i) => (
                <RecentRow key={`i-${item.id}`} item={item} i={i + myClinical.length} navigate={navigate}
                  path={`/incidents/${item.id}`}
                  primary={item.department || 'Clinical Incident'}
                  secondary={`${item.incident_type} Event · ${item.area_of_incident || ''}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Tips */}
        <div className="flex flex-col gap-6">
          <TipCard tips={tips} />
        </div>
      </div>
    </div>
  );
};

export default DoctorDashboard;
