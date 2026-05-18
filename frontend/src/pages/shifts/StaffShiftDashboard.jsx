import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, 
  ArrowRight, 
  ShieldCheck, 
  Briefcase,
  Zap,
  Moon,
  Sun,
  Sunrise,
  Shield,
  HelpCircle,
  PhoneCall,
  Wallet,
  Play
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getMyActiveShift } from '../../api/shifts';
import { Button, Card, Badge } from '../../components/ui/index.jsx';
import toast from 'react-hot-toast';

// ─── Role Config ─────────────────────────────────────────────────────────────
const ROLE_DETAILS = {
  cashier: {
    title: 'Billing & Payments Agent',
    icon: <Wallet size={32} className="text-emerald-500" />,
    mission: '💵 Process patient billing, digital payments (MoMo & Card), and reconcile digital balances.',
    tips: [
      'Record all MoMo and card transactions instantly.',
      'No cash transactions allowed under system compliance rules.',
      'Verify patient details and insurance coverage before processing payments.',
      'Report any technical payment issues immediately.'
    ],
    themeColor: 'emerald'
  },
  customer_care: {
    title: 'Patient Relations & Support',
    icon: <PhoneCall size={32} className="text-blue-500" />,
    mission: '🎧 Manage helpdesk triage, customer support queries, walk-ins, and incident reports.',
    tips: [
      'Document all patient queries and follow-up requirements accurately.',
      'Escalate complex complaints or clinical issues to supervisors.',
      'Report any operational incidents within the 24-hour SLA.',
      'Help walk-in patients navigate clinic services efficiently.'
    ],
    themeColor: 'blue'
  }
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return { text: 'Good Morning', icon: <Sunrise size={20} className="text-amber-500" /> };
  if (h < 17) return { text: 'Good Afternoon', icon: <Sun size={20} className="text-amber-500" /> };
  return { text: 'Good Evening', icon: <Moon size={20} className="text-indigo-400" /> };
}

export default function StaffShiftDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeShift, setActiveShift] = useState(null);
  const [loading, setLoading] = useState(true);

  const greeting = getGreeting();
  const roleCfg = ROLE_DETAILS[user?.role] || ROLE_DETAILS.customer_care;
  const firstName = user?.fullName?.split(' ')[0] || 'Agent';

  useEffect(() => {
    async function init() {
      try {
        const res = await getMyActiveShift();
        setActiveShift(res.data?.data || null);
      } catch (err) {
        console.error(err);
        toast.error('Failed to sync active shift status');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-[#1b669d] rounded-full animate-spin" />
        <p className="text-slate-400 font-black text-xs uppercase tracking-widest animate-pulse">Initialising Workspace Control...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-200/80">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-[24px] bg-[#1b669d] flex items-center justify-center text-white shadow-xl shadow-[#1b669d]/25 shrink-0">
            <Shield size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Shift Control Centre</h1>
            <p className="text-slate-500 font-bold flex items-center gap-2 mt-1">
              <ShieldCheck size={15} className="text-emerald-500" /> Operational Compliance &amp; Attendance
            </p>
          </div>
        </div>

        {!activeShift ? (
          <Button 
            onClick={() => navigate('/shifts/open')}
            className="h-14 px-8 rounded-2xl bg-[#1b669d] hover:bg-[#124d77] text-white font-black uppercase tracking-widest shadow-lg shadow-[#1b669d]/20 transition-all flex items-center gap-2"
          >
            <Play size={16} /> Start New Shift <ArrowRight size={18} />
          </Button>
        ) : (
          <Button 
            onClick={() => navigate(`/shifts/close/${activeShift.id}`)}
            className="h-14 px-8 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black uppercase tracking-widest shadow-lg shadow-rose-600/20 transition-all flex items-center gap-2"
          >
            End Shift &amp; Handover <ArrowRight size={18} />
          </Button>
        )}
      </div>

      {/* ── Welcome Header Card ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0f4c75] via-[#1b669d] to-[#124d77] p-8 md:p-10 text-white shadow-2xl shadow-[#1b669d]/15">
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/5 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-white/5 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2 text-blue-200">
              {greeting.icon}
              <span className="text-xs font-black uppercase tracking-widest">{greeting.text}</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight leading-none mb-4">
              Welcome, {firstName}!
            </h2>
            <p className="text-blue-100 text-sm font-semibold max-w-2xl opacity-90 leading-relaxed italic">
              " {roleCfg.mission} "
            </p>
          </div>

          <div className="shrink-0 text-right bg-white/5 p-5 rounded-2xl border border-white/10 backdrop-blur-sm">
            <p className="text-blue-300 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Assigned Role</p>
            <p className="text-white text-xl font-black tracking-tight flex items-center gap-2 justify-end">
              {roleCfg.icon}
              {roleCfg.title}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ── Active Session Monitor ── */}
        <Card className="lg:col-span-1 p-8 space-y-6 relative overflow-hidden flex flex-col justify-between min-h-[300px]">
          {activeShift && (
            <div className="absolute top-4 right-4">
              <Badge variant="success" className="animate-pulse flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Live Session
              </Badge>
            </div>
          )}
          
          <div className="space-y-6">
            <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
              <Clock size={20} className="text-[#1b669d]" /> Session Details
            </h3>

            {activeShift ? (
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Shift Started</p>
                  <p className="font-black text-slate-800 text-lg">
                    {new Date(activeShift.opened_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="text-xs text-slate-500 font-bold mt-0.5">
                    {new Date(activeShift.opened_at).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
                  </p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Workspace Mode</p>
                  <p className="font-black text-slate-800 text-lg uppercase tracking-wider">{activeShift.shift_role?.replace(/_/g, ' ')}</p>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-300">
                  <Clock size={32} />
                </div>
                <p className="text-slate-400 font-bold text-sm leading-relaxed max-w-[240px] mx-auto">
                  No active shift session. Please start a shift to begin your operational duties.
                </p>
              </div>
            )}
          </div>

          <div className="pt-6 border-t border-slate-100">
            {!activeShift ? (
              <Button 
                onClick={() => navigate('/shifts/open')}
                className="w-full py-4 rounded-xl bg-[#1b669d] hover:bg-[#124d77] text-white font-black text-xs uppercase tracking-widest shadow-md transition-all"
              >
                Go to Shift Activation
              </Button>
            ) : (
              <Button 
                onClick={() => navigate(`/shifts/close/${activeShift.id}`)}
                className="w-full py-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-widest shadow-md transition-all"
              >
                Enter Shift Close Procedure
              </Button>
            )}
          </div>
        </Card>

        {/* ── Guidelines & Mission Tips ── */}
        <Card className="lg:col-span-2 p-8 space-y-6">
          <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
            <HelpCircle size={20} className="text-[#1b669d]" /> Guidance &amp; Compliance Tips
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {roleCfg.tips.map((tip, i) => (
              <div key={i} className="flex items-start gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:border-slate-200 transition-colors shadow-sm">
                <div className="w-8 h-8 rounded-xl bg-[#1b669d]/10 text-[#1b669d] flex items-center justify-center shrink-0 text-xs font-black">
                  {i + 1}
                </div>
                <p className="text-sm font-semibold text-slate-600 leading-relaxed">
                  {tip}
                </p>
              </div>
            ))}
          </div>

          {/* Quick SLA Stats */}
          <div className="pt-6 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-2xl border border-emerald-100 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center">
                <ShieldCheck size={20} />
              </div>
              <div>
                <p className="text-xl font-black text-emerald-800 leading-none">100%</p>
                <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mt-1">SLA Compliance Goal</p>
              </div>
            </div>

            <div className="p-5 bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-2xl border border-blue-100 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center">
                <Zap size={20} />
              </div>
              <div>
                <p className="text-xl font-black text-blue-800 leading-none">8 Hours</p>
                <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mt-1">Standard Shift Threshold</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
