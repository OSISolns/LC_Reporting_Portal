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
  Play,
  Stethoscope,
  Crown,
  AlertTriangle,
  StickyNote
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getMyActiveShift, getLatestHandover, getMyHistory } from '../../api/shifts';
import { Button, Card, Badge } from '../../components/ui/index.jsx';
import toast from 'react-hot-toast';

// ── Wave Configurations ──────────────────────────────────────────────────────
function getWaveConfig(shift) {
  if (!shift) return null;
  if (!shift.wave && !shift.start_hour) return null;
  
  if (shift.wave === 'Wave 1' || shift.start_hour === '07:00') {
    return { schedule: "07:00 AM - 03:00 PM", duration: 8, startHourStr: "07:00" };
  } else if (shift.wave === 'Wave 2' || shift.start_hour === '08:00') {
    return { schedule: "08:00 AM - 04:00 PM", duration: 8, startHourStr: "08:00" };
  } else if (shift.wave === 'Wave 4' || shift.start_hour === '09:00') {
    return { schedule: "09:00 AM - 05:00 PM", duration: 8, startHourStr: "09:00" };
  } else if (shift.wave === 'Wave 3' || shift.start_hour === '15:00') {
    return { schedule: "03:00 PM - 09:00 PM", duration: 6, startHourStr: "15:00" };
  }
  return null;
}

function getWaveStartTime(shift) {
  if (!shift?.opened_at) return null;
  const openedDate = new Date(shift.opened_at);
  const cfg = getWaveConfig(shift);
  if (!cfg) return openedDate;
  const [hStr, mStr] = cfg.startHourStr.split(':');
  
  const startTime = new Date(openedDate);
  startTime.setHours(parseInt(hStr, 10), parseInt(mStr, 10), 0, 0);
  return startTime;
}

// ─── Role Config ─────────────────────────────────────────────────────────────
const ROLE_DETAILS = {
  cashier: {
    title: 'Billing & Payments Agent',
    icon: <Wallet size={32} className="text-emerald-500" />,
    mission: 'Process patient billing, digital payments (MoMo & Card), and reconcile digital balances.',
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
    mission: 'Manage helpdesk triage, customer support queries, walk-ins, and incident reports.',
    tips: [
      'Document all patient queries and follow-up requirements accurately.',
      'Escalate complex complaints or clinical issues to supervisors.',
      'Report any operational incidents within the 24-hour SLA.',
      'Help walk-in patients navigate clinic services efficiently.'
    ],
    themeColor: 'blue'
  },
  nurse: {
    title: 'Registered Nurse',
    icon: <Stethoscope size={32} className="text-emerald-500" />,
    mission: 'Provide high-quality clinical care, execute observations, and deliver thorough handovers.',
    tips: [
      'Ensure all observations are updated in the records.',
      'Log any clinical incidents immediately.',
      'Double-check MAR administration before handover.'
    ],
    themeColor: 'emerald'
  },
  vip_lounge: {
    title: 'VIP Lounge Host',
    icon: <Crown size={32} className="text-amber-500" />,
    mission: 'Provide executive lounge support, guest hospitality, and arrivals tracking.',
    tips: [
      'Keep the lounge environment pristine.',
      'Log VIP patient check-ins immediately.',
      'Ensure all lounge amenities are fully functional.'
    ],
    themeColor: 'amber'
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
  const [isWaveExpired, setIsWaveExpired] = useState(false);
  const [nearingExpiration, setNearingExpiration] = useState(false);
  const [latestHandovers, setLatestHandovers] = useState(null);
  const [myHistory, setMyHistory] = useState([]);

  const greeting = getGreeting();
  const roleCfg = activeShift 
    ? (ROLE_DETAILS[activeShift.shift_role] || ROLE_DETAILS.customer_care)
    : (ROLE_DETAILS[user?.role] || ROLE_DETAILS.customer_care);
  const firstName = user?.fullName?.split(' ')[0] || 'Agent';

  useEffect(() => {
    async function init() {
      try {
        const res = await getMyActiveShift();
        const active = res.data?.data || null;
        setActiveShift(active);

        // Fetch latest handover notes
        const rolesToFetch = [];
        if (active) {
          rolesToFetch.push(active.shift_role);
        } else {
          if (user?.role === 'cashier') {
            rolesToFetch.push('cashier');
          } else if (user?.role === 'customer_care') {
            rolesToFetch.push('customer_care', 'helpdesk', 'call_center', 'vip_lounge');
          }
        }

        const uniqueRoles = [...new Set(rolesToFetch)];
        const handovers = {};
        for (const role of uniqueRoles) {
          try {
            const handoverRes = await getLatestHandover(role);
            if (handoverRes.data?.data) {
              handovers[role] = handoverRes.data.data;
            }
          } catch (err) {
            console.error(`Failed to fetch handover for role ${role}`, err);
          }
        }
        setLatestHandovers(handovers);

        // Fetch My History
        try {
          const histRes = await getMyHistory();
          if (histRes.data?.data) {
            setMyHistory(histRes.data.data);
          }
        } catch (err) {
          console.error('Failed to fetch history', err);
        }

      } catch (err) {
        console.error(err);
        toast.error('Failed to sync active shift status');
      } finally {
        setLoading(false);
      }
    }
    if (user) {
      init();
    }
  }, [user]);

  useEffect(() => {
    if (!activeShift) {
      setIsWaveExpired(false);
      setNearingExpiration(false);
      return;
    }

    const checkExpiration = () => {
      const waveConfig = getWaveConfig(activeShift);
      if (!waveConfig) return;
      const waveStartTime = getWaveStartTime(activeShift) || new Date(activeShift.opened_at);
      const waveDurationMs = waveConfig.duration * 60 * 60 * 1000;
      const waveEndTime = waveStartTime.getTime() + waveDurationMs;
      
      const now = Date.now();
      if (now >= waveEndTime) {
        setIsWaveExpired(true);
        setNearingExpiration(false);
      } else if (now >= waveEndTime - 30 * 60 * 1000) { // 30 minutes warning
        setIsWaveExpired(false);
        setNearingExpiration(true);
      } else {
        setIsWaveExpired(false);
        setNearingExpiration(false);
      }
    };

    checkExpiration();
    const interval = setInterval(checkExpiration, 60_000);
    return () => clearInterval(interval);
  }, [activeShift]);

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

      {/* ── Shift Wave Expiration Warning ── */}
      <AnimatePresence>
        {(isWaveExpired || nearingExpiration) && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            className={`rounded-3xl border-2 p-6 flex items-start gap-4 shadow-lg ${
              isWaveExpired 
                ? 'bg-rose-950 border-rose-800 text-white' 
                : 'bg-amber-50 border-amber-300 text-slate-900'
            }`}
          >
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${
              isWaveExpired ? 'bg-rose-700 text-white' : 'bg-amber-100 text-amber-700'
            }`}>
              <AlertTriangle size={24} className={isWaveExpired ? 'animate-bounce' : 'animate-pulse'} />
            </div>
            <div className="flex-1">
              {isWaveExpired ? (
                <>
                  <h4 className="font-black text-base uppercase tracking-widest text-rose-300 mb-1">⚠️ Shift Wave Finished</h4>
                  <p className="text-sm font-semibold text-rose-100 leading-relaxed">
                    Your scheduled <strong>{getWaveConfig(activeShift)?.schedule}</strong> wave has ended.
                    Please finalize your operational checklists, balance sheets, and VIP logs, and enter the shift closure procedure now.
                  </p>
                </>
              ) : (
                <>
                  <h4 className="font-black text-base uppercase tracking-widest text-amber-850 mb-1">⏱️ Shift Wave Ending Soon</h4>
                  <p className="text-sm font-semibold text-slate-700 leading-relaxed">
                    Your scheduled <strong>{getWaveConfig(activeShift)?.schedule}</strong> wave is nearing its preset end time.
                    Please prepare to submit your operational reports and close the shift to avoid leaving the session running.
                  </p>
                </>
              )}
              <div className="mt-4 flex gap-3">
                <Button 
                  onClick={() => navigate(`/shifts/close/${activeShift.id}`)}
                  className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
                    isWaveExpired 
                      ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-950/20' 
                      : 'bg-amber-600 hover:bg-amber-700 text-white shadow-md'
                  }`}
                >
                  Enter Close Procedure
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
                    {getWaveStartTime(activeShift).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="text-xs text-slate-500 font-bold mt-0.5">
                    {getWaveStartTime(activeShift).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
                  </p>
                </div>
                {activeShift.wave && (
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Allocated Wave</p>
                    <p className="font-black text-slate-800 text-lg uppercase tracking-wider">{activeShift.wave}</p>
                    <p className="text-xs text-slate-500 font-bold mt-0.5">{getWaveConfig(activeShift)?.schedule}</p>
                  </div>
                )}
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

      {/* ── Previous Handover Notes ── */}
      {latestHandovers && Object.keys(latestHandovers).length > 0 && (
        <Card className="p-8 space-y-6">
          <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
            <StickyNote size={20} className="text-[#1b669d]" /> Previous Shift Handover Briefings
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(latestHandovers).map(([role, handover]) => (
              <div key={role} className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="info" className="uppercase tracking-widest text-[9px] font-black">
                    {role.replace(/_/g, ' ')}
                  </Badge>
                  <span className="text-[10px] text-slate-400 font-bold">
                    Closed on {new Date(handover.closed_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-black uppercase tracking-wider">
                  Outgoing: {handover.user_name}
                </p>
                <div className="text-sm font-semibold text-slate-700 bg-white p-4 rounded-xl border border-slate-100 shadow-sm italic">
                  "{handover.handover_notes}"
                </div>
              </div>
            ))}
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
