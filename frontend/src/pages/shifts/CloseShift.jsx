import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getShiftById,
  saveDraft,
  closeShift
} from '../../api/shifts';
import { createIncident } from '../../api/incidents';
import Modal from '../../components/Modal';
import IncidentFormFields from '../incidents/components/IncidentFormFields';
import {
  EQUIPMENT_BY_ROLE, EQUIPMENT_STATUS_OPTIONS,
  INSURANCE_OPTIONS, BANK_TERMINAL_OPTIONS, CALL_REASON_OPTIONS,
} from './shiftConfig';
import {
  Monitor, Smartphone, Printer, Phone, Headphones,
  Users, CreditCard, Save, Lock, ShieldCheck,
  AlertCircle, AlertTriangle, CheckCircle2, Clock,
  Briefcase, Search, PhoneCall, PhoneForwarded,
  ListPlus, StickyNote, Timer, Sun, Moon, Sunrise,
  BadgeCheck, Home
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Shift Policy ────────────────────────────────────────────────────────────
const MAX_SHIFT_HOURS = 8;

// ─── Wave Configurations ──────────────────────────────────────────────────────
function getWaveConfig(shift) {
  if (!shift) return { schedule: "07:00 AM - 03:00 PM", duration: 8, startHourStr: "07:00" };
  
  if (shift.wave === 'Wave 1' || shift.start_hour === '07:00') {
    return { schedule: "07:00 AM - 03:00 PM", duration: 8, startHourStr: "07:00" };
  } else if (shift.wave === 'Wave 2' || shift.start_hour === '08:00') {
    return { schedule: "08:00 AM - 04:00 PM", duration: 8, startHourStr: "08:00" };
  } else if (shift.wave === 'Wave 4' || shift.start_hour === '09:00') {
    return { schedule: "09:00 AM - 05:00 PM", duration: 8, startHourStr: "09:00" };
  } else if (shift.wave === 'Wave 3' || shift.start_hour === '15:00') {
    return { schedule: "03:00 PM - 09:00 PM", duration: 6, startHourStr: "15:00" };
  } else {
    const openedDate = new Date(shift.opened_at);
    const hour = openedDate.getHours();
    const isMorning = hour < 14;
    return {
      schedule: isMorning ? "07:00 AM - 03:00 PM" : "03:00 PM - 09:00 PM",
      duration: isMorning ? 8 : 6,
      startHourStr: isMorning ? "07:00" : "15:00"
    };
  }
}

function getWaveStartTime(shift) {
  if (!shift?.opened_at) return null;
  const openedDate = new Date(shift.opened_at);
  const cfg = getWaveConfig(shift);
  const [hStr, mStr] = cfg.startHourStr.split(':');
  
  const startTime = new Date(openedDate);
  startTime.setHours(parseInt(hStr, 10), parseInt(mStr, 10), 0, 0);
  return startTime;
}

// ─── Greeting helper ─────────────────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return { text: 'Good Morning', icon: <Sunrise size={20} /> };
  if (h < 17) return { text: 'Good Afternoon', icon: <Sun size={20} /> };
  return { text: 'Good Evening', icon: <Moon size={20} /> };
}

// ─── Role config ──────────────────────────────────────────────────────────────
const ROLE_CONFIG = {
  cashier: {
    color: 'emerald', label: 'Billing Agent', emoji: '💳',
    mission: 'Process patient billing accurately, reconcile digital payments, and ensure every transaction is verified before shift closure.',
    tips: ['Record all MoMo & card transactions as they happen', 'Flag any cash discrepancies immediately', 'Verify insurance codes match patient records'],
  },
  helpdesk: {
    color: 'blue', label: 'Helpdesk Officer', emoji: '🖥️',
    mission: 'Assist walk-in patients and internal staff with queries, triage requests efficiently, and maintain an accurate count of all interactions.',
    tips: ['Log every query — walk-ins and internal', 'Escalate complex cases to the appropriate department', 'Note any recurring issues for the handover report'],
  },
  call_center: {
    color: 'violet', label: 'Call Center Agent', emoji: '📞',
    mission: 'Handle inbound and outbound calls with professionalism, record interaction reasons, and ensure pending follow-ups are properly documented.',
    tips: ['Answer within 3 rings where possible', 'Record all drop reasons for quality analysis', 'Document every follow-up with patient ID and notes'],
  },
  nurse: {
    color: 'emerald', label: 'Clinical Nurse', emoji: '🏥',
    mission: 'Provide high-quality patient care, maintain accurate clinical observations, and ensure a safe, thorough handover of patient status.',
    tips: ['Synchronize all clinical observations before closing', 'Double-check medication administration records', 'Report any clinical incidents immediately'],
  },
};

// ─── Welcome Dashboard ────────────────────────────────────────────────────────
function WelcomeDashboard({ shift, elapsedHours, remainingMin, onDismiss }) {
  const greeting = getGreeting();
  const cfg = ROLE_CONFIG[shift.shift_role] || ROLE_CONFIG.cashier;
  const firstName = shift.user_name?.split(' ')[0] || 'Agent';
  const h = Math.floor(elapsedHours);
  const m = Math.round((elapsedHours % 1) * 60);
  const waveCfg = getWaveConfig(shift);
  const pct = Math.min((elapsedHours / waveCfg.duration) * 100, 100);
  const barColor = pct > 88 ? '#ef4444' : pct > 78 ? '#f59e0b' : '#22c55e';

  // Shift Window Detection
  const openedDate = new Date(shift.opened_at);
  const shiftSchedule = waveCfg.schedule;
  let mealDeduction = "60 min (20m Breakfast, 40m Lunch)";
  if (shift.wave === 'Wave 3' || shift.start_hour === '15:00') {
    mealDeduction = "None (Evening Wave)";
  } else if (!shift.wave && !shift.start_hour) {
    const hour = openedDate.getHours();
    if (hour >= 14) {
      mealDeduction = "None";
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      className="mb-10 space-y-4"
    >
      {/* Welcome card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0f4c75] via-[#1b669d] to-[#1b669d] p-8 text-white shadow-2xl shadow-[#1b669d]/30">
        {/* bg glow */}
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/5 blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-[#6fb448]/10 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <span className="text-blue-200 text-sm">{greeting.icon}</span>
              <span className="text-blue-200 text-sm font-bold tracking-wider">{greeting.text}</span>
            </div>
            <h2 className="text-3xl font-black tracking-tight leading-none">
              Welcome back, {firstName}! {cfg.emoji}
            </h2>
            <div className="mt-4 flex flex-wrap gap-3">
              {shift.wave && (
                <div className="px-3 py-1.5 rounded-xl bg-violet-600/30 border border-violet-400/30 backdrop-blur-sm">
                  <p className="text-[9px] font-black uppercase text-violet-200">Allocated Wave</p>
                  <p className="text-xs font-bold">{shift.wave}</p>
                </div>
              )}
              <div className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/20 backdrop-blur-sm">
                <p className="text-[9px] font-black uppercase text-blue-200">Standard Window</p>
                <p className="text-xs font-bold">{shiftSchedule}</p>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/20 backdrop-blur-sm">
                <p className="text-[9px] font-black uppercase text-blue-200">Meal Deductions</p>
                <p className="text-xs font-bold">{mealDeduction}</p>
              </div>
            </div>
            <p className="text-blue-100 text-xs font-medium mt-4 max-w-md opacity-80 italic">" {cfg.mission} "</p>
          </div>

          <div className="shrink-0 text-right bg-white/5 p-4 rounded-2xl border border-white/10">
            <p className="text-blue-300 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Session Protocol</p>
            <p className="text-white text-2xl font-black">#{String(shift.id).padStart(5,'0')}</p>
            <p className="text-blue-200 text-xs font-bold mt-1">
              {openedDate.toLocaleString([], { weekday:'short', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="relative mt-8">
          <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-blue-200 mb-2">
            <span>Clock Time — {h}h {m}m elapsed</span>
            <span>{remainingMin > 0 ? `${remainingMin}m until policy limit` : 'Limit reached'}</span>
          </div>
          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: barColor }}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
            />
          </div>
        </div>
      </div>

      {/* Mission tips + dismiss */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cfg.tips.map((tip, i) => (
          <div key={i} className="flex items-start gap-3 p-4 bg-white rounded-2xl border-2 border-slate-100 shadow-sm">
            <div className="w-7 h-7 rounded-lg bg-[#1b669d]/10 text-[#1b669d] flex items-center justify-center shrink-0 text-xs font-black">{i + 1}</div>
            <p className="text-sm font-semibold text-slate-600 leading-snug">{tip}</p>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button
          onClick={onDismiss}
          className="text-xs font-bold text-slate-400 hover:text-slate-600 underline underline-offset-2 transition-colors"
        >
          Dismiss welcome — go to shift form
        </button>
      </div>
    </motion.div>
  );
}

// ─── Shift Closing Summary ─────────────────────────────────────────────────────
function ShiftClosingSummary({ shift, closedData, onExit }) {
  const cfg = ROLE_CONFIG[shift.shift_role] || ROLE_CONFIG.cashier;
  const firstName = shift.user_name?.split(' ')[0] || 'Agent';
  const waveStartTime = getWaveStartTime(shift) || new Date(shift.opened_at);
  const closedAt  = new Date();
  const durationMs = closedAt - waveStartTime;
  const durH = Math.floor(durationMs / 3_600_000);
  const durM = Math.floor((durationMs % 3_600_000) / 60_000);
  const isMorning = waveStartTime.getHours() < 14;
  const netH = isMorning ? Math.max(0, durH - 1) : durH;
  const isFlagged = closedData?.is_flagged;

  // Build role-specific stat cards
  const stats = [];
  if (shift.shift_role === 'cashier' && closedData?.cashier) {
    const c = closedData.cashier;
    stats.push(
      { label: 'Total Patients', val: c.total_patients || 0, icon: <Users size={18} />, color: 'blue' },
      { label: 'MoMo Payments', val: `${(c.total_momo_transactions||0).toLocaleString()} RWF`, icon: <Smartphone size={18} />, color: 'emerald' },
      { label: 'Card Payments', val: `${(c.total_card_transactions||0).toLocaleString()} RWF`, icon: <CreditCard size={18} />, color: 'violet' },
    );
  } else if (shift.shift_role === 'helpdesk' && closedData?.helpdesk) {
    const h = closedData.helpdesk;
    stats.push(
      { label: 'Walk-in Queries', val: h.patient_walkin_queries || 0, icon: <Users size={18} />, color: 'blue' },
      { label: 'Staff Queries', val: h.internal_staff_queries || 0, icon: <Briefcase size={18} />, color: 'emerald' },
      { label: 'Total Assisted', val: (h.patient_walkin_queries||0)+(h.internal_staff_queries||0), icon: <CheckCircle2 size={18} />, color: 'violet' },
    );
  } else if (shift.shift_role === 'call_center' && closedData?.callcenter) {
    const cc = closedData.callcenter;
    stats.push(
      { label: 'Inbound Calls', val: cc.inbound_total || 0, icon: <PhoneCall size={18} />, color: 'blue' },
      { label: 'Calls Assisted', val: cc.inbound_assisted || 0, icon: <CheckCircle2 size={18} />, color: 'emerald' },
      { label: 'Outbound Dialed', val: cc.outbound_total || 0, icon: <PhoneForwarded size={18} />, color: 'violet' },
    );
  } else if (shift.shift_role === 'nurse' && closedData?.nurse) {
    const n = closedData.nurse;
    stats.push(
      { label: 'Assessments', val: n.total_assessments || 0, icon: <Stethoscope size={18} />, color: 'blue' },
      { label: 'Incidents', val: n.total_incidents || 0, icon: <AlertTriangle size={18} />, color: 'rose' },
      { label: 'Clinical Docs', val: n.total_assessments || 0, icon: <CheckCircle2 size={18} />, color: 'emerald' },
    );
  }

  const colorMap = { blue:'bg-blue-50 text-blue-600', emerald:'bg-emerald-50 text-emerald-600', violet:'bg-violet-50 text-violet-600' };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ backgroundColor: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(8px)' }}
    >
      <motion.div
        className="w-full max-w-2xl bg-white rounded-[32px] shadow-2xl overflow-hidden"
        initial={{ scale: 0.92, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      >
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 to-[#0f4c75] px-10 py-10 text-white">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-[#6fb448]/10 blur-3xl pointer-events-none" />
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-[#6fb448] flex items-center justify-center shadow-xl">
              <BadgeCheck size={32} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#a3e635] mb-1">Shift Sealed</p>
              <h2 className="text-3xl font-black tracking-tight">Great work, {firstName}!</h2>
            </div>
          </div>
          <p className="text-slate-300 text-sm font-semibold">
            Your {cfg.label} shift has been officially closed and recorded. Here's your session summary.
          </p>
        </div>

        <div className="px-10 py-8 space-y-6">
          {/* Flag warning */}
          {isFlagged && (
            <div className="flex items-start gap-3 p-4 bg-rose-50 border-2 border-rose-200 rounded-2xl">
              <AlertTriangle size={18} className="text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-black text-rose-700">This shift was flagged for review</p>
                <p className="text-xs text-rose-500 font-semibold mt-0.5">Your supervisor has been notified. Please follow up at your next check-in.</p>
              </div>
            </div>
          )}

          {/* Duration + time */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-1 flex flex-col items-center justify-center bg-slate-50 rounded-2xl p-5 border-2 border-slate-100 text-center">
              <Clock size={20} className="text-slate-400 mb-2" />
              <p className="text-2xl font-black text-slate-900">{durH}h {durM}m</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Duration</p>
            </div>
            <div className="col-span-2 flex flex-col justify-center bg-slate-50 rounded-2xl p-5 border-2 border-slate-100 space-y-2">
              {[
                {l:'Role', v:cfg.label},
                {l:'Opened', v:openedAt.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})},
                {l:'Closed', v:closedAt.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})},
                {l:'Worked Hours', v: `${netH}h ${durM}m ${isMorning ? '(Net)' : ''}`}
              ].map(({l,v})=>(
                <div key={l} className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-wider">{l}</span>
                  <span className="text-sm font-black text-slate-900">{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Role stats */}
          {stats.length > 0 && (
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Session Metrics</p>
              <div className="grid grid-cols-3 gap-3">
                {stats.map((s, i) => (
                  <div key={i} className="p-4 rounded-2xl border-2 border-slate-100 bg-white text-center">
                    <div className={`w-9 h-9 rounded-xl ${colorMap[s.color]} flex items-center justify-center mx-auto mb-2`}>{s.icon}</div>
                    <p className="text-xl font-black text-slate-900 leading-none">{s.val}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CTA */}
          <button
            onClick={onExit}
            className="w-full py-4 rounded-2xl bg-[#1b669d] text-white font-black text-sm uppercase tracking-widest hover:bg-[#155180] transition-all flex items-center justify-center gap-3 shadow-lg shadow-[#1b669d]/20"
          >
            <Home size={18} /> Return to Shift Log
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}


// ─── Constants ──────────────────────────────────────────────────────────────
const ICON_MAP = {
  'PC': <Monitor size={18} />,
  'MoMo Phone': <Smartphone size={18} />,
  'Receipt Printer': <Printer size={18} />,
  'Barcode Printer': <Printer size={18} />,
  'Desk Phone': <Phone size={18} />,
  'Headset': <Headphones size={18} />,
};

// ─── Reusable: Equipment Checklist ────────────────────────────────────────────
const EquipmentChecklist = ({ items, onChange }) => (
  <div className="grid grid-cols-1 gap-4">
    {items.map((item, i) => (
      <div
        key={item.name}
        className={`group relative overflow-hidden rounded-2xl border-2 transition-all duration-300 ${item.status === 'Working'
            ? 'bg-emerald-50 border-emerald-100 shadow-sm shadow-emerald-500/5'
            : item.status === 'Needs Repair'
              ? 'bg-amber-50 border-amber-100 shadow-sm shadow-amber-500/5'
              : 'bg-rose-50 border-rose-100 shadow-sm shadow-rose-500/5'
          }`}
      >
        <div className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`p-2.5 rounded-xl ${item.status === 'Working' ? 'bg-emerald-500 text-white' :
                  item.status === 'Needs Repair' ? 'bg-amber-500 text-white' :
                    'bg-rose-500 text-white'
                }`}>
                {ICON_MAP[item.name] || <Briefcase size={18} />}
              </div>
              <div>
                <span className="font-black text-slate-900 block">{item.name}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {EQUIPMENT_STATUS_OPTIONS.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => onChange(i, 'status', status)}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${item.status === status
                      ? status === 'Working' ? 'bg-emerald-600 text-white shadow-lg' :
                        status === 'Needs Repair' ? 'bg-amber-600 text-white shadow-lg' :
                          'bg-rose-600 text-white shadow-lg'
                      : 'bg-white border-2 border-slate-100 text-slate-400 hover:border-slate-200'
                    }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {item.status !== 'Working' && (
            <div className="overflow-hidden">
              <div className="mt-4 pt-4 border-t border-slate-100">
                <input
                  type="text"
                  placeholder="Specify hardware issue..."
                  value={item.remarks}
                  onChange={(e) => onChange(i, 'remarks', e.target.value)}
                  className="shift-input w-full border-amber-200 bg-amber-50 placeholder-amber-300"
                  required
                />
              </div>
            </div>
          )}
        </div>
      </div>
    ))}
  </div>
);

// ─── Billing Close Form (Formerly Cashier) ────────────────────────────────────
const BillingCloseForm = ({ data, onChange }) => {
  const [showInsuranceModal, setShowInsuranceModal] = useState(false);
  const [insuranceSearch, setInsuranceSearch] = useState('');

  const toggleInsurance = (ins) => {
    const current = data.insurances_used || [];
    if (current.includes(ins)) {
      onChange('insurances_used', current.filter((x) => x !== ins));
    } else {
      onChange('insurances_used', [...current, ins]);
    }
  };

  return (
    <div className="space-y-8">
      {/* Patient Counts */}
      <div className="shift-card">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[#1b669d]/10 flex items-center justify-center text-[#1b669d]">
            <Users size={20} />
          </div>
          <h3 className="text-xl font-black text-slate-900 tracking-tight">Patient Statistics</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { k: 'total_patients', l: 'Total Patients', i: <Users size={16} />, c: 'slate' },
            { k: 'total_insured', l: 'Insured', i: <ShieldCheck size={16} />, c: 'blue' },
            { k: 'total_private', l: 'Private', i: <Briefcase size={16} />, c: 'emerald' }
          ].map(({ k, l, i, c }) => (
            <div key={k}>
              <label className="field-label flex items-center gap-2 text-slate-500">
                {i} {l}
              </label>
              <input
                type="number"
                min="0"
                value={data[k] || 0}
                onChange={(e) => onChange(k, parseInt(e.target.value) || 0)}
                className={`shift-input w-full text-xl font-black border-slate-200 focus:border-${c}-500 focus:bg-white`}
              />
            </div>
          ))}
        </div>

        <div className="mt-8 pt-8 border-t border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <label className="field-label mb-0">Insurances Used</label>
            <button
              type="button"
              onClick={() => setShowInsuranceModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 text-[#1b669d] font-black text-[10px] uppercase tracking-widest hover:bg-[#1b669d] hover:text-white transition-all"
            >
              <ListPlus size={14} /> Add Insurance
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {(data.insurances_used || []).length > 0 ? (
              data.insurances_used.map((ins) => (
                <div
                  key={ins}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-50 border-2 border-slate-100 text-slate-600 text-xs font-bold"
                >
                  <ShieldCheck size={14} className="text-[#1b669d]" />
                  {ins}
                  <button
                    type="button"
                    onClick={() => toggleInsurance(ins)}
                    className="ml-1 text-slate-400 hover:text-rose-500 transition-colors"
                  >
                    <AlertCircle size={14} />
                  </button>
                </div>
              ))
            ) : (
              <p className="text-xs font-bold text-slate-400 italic py-2">No insurances selected for this shift.</p>
            )}
          </div>
        </div>

        {/* Insurance Selection Modal */}
        <Modal
          isOpen={showInsuranceModal}
          onClose={() => setShowInsuranceModal(false)}
          title="Select Insurances"
          maxWidth="600px"
        >
          <div className="p-6">
            {/* Search */}
            <div className="relative mb-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search insurance provider..."
                value={insuranceSearch}
                onChange={(e) => setInsuranceSearch(e.target.value)}
                className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-[#1b669d] focus:bg-white transition-all outline-none font-bold text-slate-900"
              />
            </div>

            {/* Selection Count */}
            <div className="flex items-center justify-between mb-4 px-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {(data.insurances_used || []).length} Selected
              </span>
              {(data.insurances_used || []).length > 0 && (
                <button
                  type="button"
                  onClick={() => onChange('insurances_used', [])}
                  className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:underline"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-[400px] overflow-y-auto pr-2 custom-scrollbar space-y-1">
              {INSURANCE_OPTIONS.filter(ins =>
                ins.toLowerCase().includes(insuranceSearch.toLowerCase())
              ).map((ins) => {
                const isSelected = (data.insurances_used || []).includes(ins);
                return (
                  <label
                    key={ins}
                    className={`flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all border-2 ${isSelected ? 'bg-blue-50 border-blue-100' : 'hover:bg-slate-50 border-transparent'
                      }`}
                  >
                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-[#1b669d] border-[#1b669d]' : 'bg-white border-slate-200'
                      }`}>
                      {isSelected && <BadgeCheck size={14} className="text-white" />}
                    </div>
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={isSelected}
                      onChange={() => toggleInsurance(ins)}
                    />
                    <span className={`text-sm font-bold ${isSelected ? 'text-[#1b669d]' : 'text-slate-600'}`}>
                      {ins}
                    </span>
                  </label>
                );
              })}
            </div>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowInsuranceModal(false)}
                className="px-8 py-4 rounded-2xl bg-[#1b669d] text-white font-black text-xs uppercase tracking-widest hover:bg-[#124d77] transition-all"
              >
                Done
              </button>
            </div>
          </div>
        </Modal>
      </div>

      {/* Digital Payment Verification */}
      <div className="shift-card">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
            <Smartphone size={20} />
          </div>
          <h3 className="text-xl font-black text-slate-900 tracking-tight">Digital Payment Reconciliation</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div className="p-6 rounded-3xl bg-emerald-50/50 border-2 border-emerald-100/50">
            <label className="field-label flex items-center gap-2 text-emerald-700 mb-3">
              <Smartphone size={16} /> Total MoMo Payments (RWF)
            </label>
            <input
              type="number"
              min="0"
              placeholder="0.00"
              value={data.total_momo_transactions || ''}
              onChange={(e) => onChange('total_momo_transactions', parseFloat(e.target.value) || 0)}
              className="shift-input w-full text-2xl font-black border-emerald-200 focus:border-emerald-500"
            />
          </div>
          <div className="p-6 rounded-3xl bg-blue-50/50 border-2 border-blue-100/50">
            <label className="field-label flex items-center gap-2 text-blue-700 mb-3">
              <CreditCard size={16} /> Total Card Payments (RWF)
            </label>
            <input
              type="number"
              min="0"
              placeholder="0.00"
              value={data.total_card_transactions || ''}
              onChange={(e) => onChange('total_card_transactions', parseFloat(e.target.value) || 0)}
              className="shift-input w-full text-2xl font-black border-blue-200 focus:border-blue-500"
            />
          </div>
        </div>

        {(data.total_card_transactions || 0) > 0 && (
          <div className="mb-8 overflow-hidden bg-slate-50 p-6 rounded-3xl border-2 border-slate-100">
            <label className="field-label text-slate-500 mb-4">Bank / Terminal Used</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {BANK_TERMINAL_OPTIONS.map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => onChange('card_bank_terminal', b)}
                  className={`px-4 py-3 rounded-2xl text-xs font-black transition-all border-2 ${data.card_bank_terminal === b
                      ? 'bg-[#1b669d] border-[#1b669d] text-white shadow-xl'
                      : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                    }`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="pt-8 border-t border-slate-100">
          <label className="field-label mb-6 text-slate-500">All Digital Transactions Successfully Verified?</label>
          <div className="flex gap-4">
            {[
              { v: true, l: 'Verified Success', c: 'emerald' },
              { v: false, l: 'Issues Identified', c: 'rose' }
            ].map(({ v, l, c }) => (
              <button
                key={String(v)}
                type="button"
                onClick={() => onChange('payments_all_successful', v)}
                className={`flex-1 py-5 rounded-[24px] text-sm font-black border-4 transition-all duration-300 ${data.payments_all_successful === v
                    ? `bg-${c}-500 border-${c}-600 text-white shadow-2xl`
                    : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                  }`}
              >
                {l}
              </button>
            ))}
          </div>

          {data.payments_all_successful === false && (
            <div className="overflow-hidden">
              <div className="mt-8 p-8 rounded-[32px] bg-rose-50 border-4 border-rose-100 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="field-label text-rose-600">Reason / Description</label>
                    <input placeholder="e.g. Card rejected, System timeout" value={data.failed_payment_status || ''} onChange={(e) => onChange('failed_payment_status', e.target.value)} className="shift-input w-full border-rose-200 bg-white" />
                  </div>
                  <div>
                    <label className="field-label text-rose-600">Failed Amount (RWF)</label>
                    <input type="number" placeholder="0.00" value={data.failed_payment_amount || ''} onChange={(e) => onChange('failed_payment_amount', parseFloat(e.target.value) || 0)} className="shift-input w-full border-rose-200 bg-white" />
                  </div>
                </div>
                <div>
                  <label className="field-label text-rose-600">Action Taken & Resolution</label>
                  <textarea rows={2} placeholder="Detail steps taken to correct the issue..." value={data.failed_payment_action_taken || ''} onChange={(e) => onChange('failed_payment_action_taken', e.target.value)} className="shift-input w-full border-rose-200 bg-white resize-none" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Helpdesk Close Form ──────────────────────────────────────────────────────
const HelpdeskCloseForm = ({ data, onChange }) => (
  <div className="shift-card">
    <div className="flex items-center gap-4 mb-10">
      <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600">
        <Search size={24} />
      </div>
      <h3 className="text-2xl font-black text-slate-900 tracking-tight">Query Metrics</h3>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {[
        { k: 'patient_walkin_queries', l: 'Patient Walk-ins', i: <Users size={20} className="text-blue-500" /> },
        { k: 'internal_staff_queries', l: 'Internal Staff Queries', i: <Briefcase size={20} className="text-[#1b669d]" /> }
      ].map(({ k, l, i }) => (
        <div key={k} className="bg-slate-50 p-8 rounded-[32px] border-2 border-slate-100 group hover:border-[#1b669d]/20 transition-all">
          <label className="field-label flex items-center gap-3 text-slate-500 group-hover:text-[#1b669d] transition-colors mb-4">
            {i} {l}
          </label>
          <input
            type="number"
            min="0"
            value={data[k] || 0}
            onChange={(e) => onChange(k, parseInt(e.target.value) || 0)}
            className="w-full bg-transparent border-none text-5xl font-black text-slate-900 outline-none"
          />
        </div>
      ))}
    </div>
  </div>
);

// ─── Nursing Close Form ────────────────────────────────────────────────────────
const NursingCloseForm = ({ data, onChange }) => (
  <div className="space-y-8">
    <div className="shift-card">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-[#1b669d]/10 flex items-center justify-center text-[#1b669d]">
          <Stethoscope size={20} />
        </div>
        <h3 className="text-xl font-black text-slate-900 tracking-tight">Clinical Activity Summary</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <label className="field-label text-slate-500">Patients Assessed</label>
          <input
            type="number"
            min="0"
            value={data.total_assessments || 0}
            onChange={(e) => onChange('total_assessments', parseInt(e.target.value) || 0)}
            className="shift-input w-full text-xl font-black border-slate-200"
          />
        </div>
        <div>
          <label className="field-label text-slate-500">Incidents Reported</label>
          <input
            type="number"
            min="0"
            value={data.total_incidents || 0}
            onChange={(e) => onChange('total_incidents', parseInt(e.target.value) || 0)}
            className="shift-input w-full text-xl font-black border-slate-200"
          />
        </div>
      </div>
    </div>
    <div className="shift-card">
       <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
          <StickyNote size={20} />
        </div>
        <h3 className="text-xl font-black text-slate-900 tracking-tight">SBAR Handover (Final)</h3>
      </div>
      <div className="space-y-4">
        <div>
          <label className="field-label text-slate-500 uppercase tracking-widest text-[10px]">Situation / Background</label>
          <textarea 
            rows={3}
            value={data.handover_sbar_sb || ''}
            onChange={(e) => onChange('handover_sbar_sb', e.target.value)}
            className="shift-input w-full border-slate-200 resize-none"
            placeholder="Key patient status at handover..."
          />
        </div>
        <div>
          <label className="field-label text-slate-500 uppercase tracking-widest text-[10px]">Assessment / Recommendation</label>
          <textarea 
            rows={3}
            value={data.handover_sbar_ar || ''}
            onChange={(e) => onChange('handover_sbar_ar', e.target.value)}
            className="shift-input w-full border-slate-200 resize-none"
            placeholder="Outstanding tasks or concerns..."
          />
        </div>
      </div>
    </div>
  </div>
);

// ─── Call Center Close Form ───────────────────────────────────────────────────
const CallCenterCloseForm = ({ data, onChange }) => {
  const toggleReason = (r) => {
    const current = data.call_top_reasons || [];
    if (current.includes(r)) {
      onChange('call_top_reasons', current.filter((x) => x !== r));
    } else if (current.length < 3) {
      onChange('call_top_reasons', [...current, r]);
    }
  };

  const addFollowup = () => {
    onChange('followup_details', [...(data.followup_details || []), { patient_id: '', name: '', notes: '' }]);
  };

  const removeFollowup = (idx) => {
    onChange('followup_details', (data.followup_details || []).filter((_, i) => i !== idx));
  };

  const updateFollowup = (i, field, val) => {
    const updated = (data.followup_details || []).map((f, idx) => idx === i ? { ...f, [field]: val } : f);
    onChange('followup_details', updated);
  };

  return (
    <div className="space-y-8">
      {/* Call Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="shift-card">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600">
              <PhoneCall size={20} />
            </div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Inbound Logs</h3>
          </div>
          <div className="space-y-4">
            {[
              { k: 'inbound_total', l: 'Total Received', c: 'slate' },
              { k: 'inbound_assisted', l: 'Successfully Assisted', c: 'emerald' },
              { k: 'inbound_dropped', l: 'Dropped Calls', c: 'rose' }
            ].map(({ k, l, c }) => (
              <div key={k} className="flex items-center justify-between p-5 rounded-2xl bg-slate-50 border-2 border-white hover:border-slate-100 transition-all">
                <span className="text-xs font-black text-slate-500 uppercase tracking-widest">{l}</span>
                <input
                  type="number"
                  min="0"
                  value={data[k] || 0}
                  onChange={(e) => onChange(k, parseInt(e.target.value) || 0)}
                  className={`w-20 bg-transparent border-none text-right font-black text-2xl text-slate-900 outline-none`}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="shift-card">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600">
              <PhoneForwarded size={20} />
            </div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Outbound Logs</h3>
          </div>
          <div className="space-y-4">
            {[
              { k: 'outbound_total', l: 'Total Dialed', c: 'slate' },
              { k: 'outbound_reached', l: 'Successfully Reached', c: 'emerald' },
              { k: 'outbound_unreached', l: 'Unreached Calls', c: 'rose' }
            ].map(({ k, l, c }) => (
              <div key={k} className="flex items-center justify-between p-5 rounded-2xl bg-slate-50 border-2 border-white hover:border-slate-100 transition-all">
                <span className="text-xs font-black text-slate-500 uppercase tracking-widest">{l}</span>
                <input
                  type="number"
                  min="0"
                  value={data[k] || 0}
                  onChange={(e) => onChange(k, parseInt(e.target.value) || 0)}
                  className={`w-20 bg-transparent border-none text-right font-black text-2xl text-slate-900 outline-none`}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Reasons */}
      <div className="shift-card">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-600">
            <ListPlus size={20} />
          </div>
          <h3 className="text-xl font-black text-slate-900 tracking-tight">Interaction Reasons</h3>
          <span className="ml-auto text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Required: Select 3</span>
        </div>

        <div className="flex flex-wrap gap-3">
          {CALL_REASON_OPTIONS.map((r) => {
            const selected = (data.call_top_reasons || []).includes(r);
            return (
              <button
                key={r}
                type="button"
                onClick={() => toggleReason(r)}
                className={`px-6 py-3.5 rounded-2xl text-xs font-black border-2 transition-all duration-300 ${selected
                    ? 'bg-[#1b669d] border-[#1b669d] text-white shadow-2xl'
                    : 'bg-white border-slate-100 text-slate-500 hover:border-slate-300'
                  }`}
              >
                {r}
              </button>
            );
          })}
        </div>
      </div>

      {/* Follow-ups */}
      <div className="shift-card">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600">
            <Clock size={24} />
          </div>
          <h3 className="text-xl font-black text-slate-900 tracking-tight">Pending Handover Records</h3>
        </div>

        <div className="flex gap-6 mb-10">
          {[
            { v: false, l: 'Zero Pendings', c: 'emerald' },
            { v: true, l: 'Register Follow-ups', c: 'amber' }
          ].map(({ v, l, c }) => (
            <button
              key={String(v)}
              type="button"
              onClick={() => onChange('has_pending_followups', v)}
              className={`flex-1 py-6 rounded-[32px] text-sm font-black border-4 transition-all duration-300 ${data.has_pending_followups === v
                  ? `bg-${c}-500 border-${c}-600 text-white shadow-2xl`
                  : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                }`}
            >
              {l}
            </button>
          ))}
        </div>

        {data.has_pending_followups && (
          <div className="space-y-6 overflow-hidden">
            {(data.followup_details || []).map((f, i) => (
              <div
                key={i}
                className="bg-slate-50 rounded-[32px] p-8 border-2 border-slate-100 relative group"
              >
                <button
                  type="button"
                  onClick={() => removeFollowup(i)}
                  className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-rose-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-2xl z-10 font-black"
                >
                  ×
                </button>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                  <div className="space-y-2">
                    <label className="field-label text-slate-400">Patient Identifier</label>
                    <input placeholder="PID-XXXXX" value={f.patient_id} onChange={(e) => updateFollowup(i, 'patient_id', e.target.value)} className="shift-input w-full bg-white border-slate-100" />
                  </div>
                  <div className="space-y-2">
                    <label className="field-label text-slate-400">Full Legal Name</label>
                    <input placeholder="Enter full name..." value={f.name} onChange={(e) => updateFollowup(i, 'name', e.target.value)} className="shift-input w-full bg-white border-slate-100" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="field-label text-slate-400">Instructions for Incoming Agent</label>
                  <textarea rows={3} placeholder="Provide clear handover details..." value={f.notes} onChange={(e) => updateFollowup(i, 'notes', e.target.value)} className="shift-input w-full bg-white border-slate-100 resize-none" />
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={addFollowup}
              className="w-full py-6 rounded-[32px] border-4 border-dashed border-slate-200 text-slate-400 hover:border-[#1b669d]/40 hover:text-[#1b669d] font-black text-xs uppercase tracking-widest transition-all"
            >
              + Register New Follow-up Requirement
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main Close Shift Page ────────────────────────────────────────────────────
export default function CloseShift() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [shift, setShift] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [draftSaving, setDraftSaving] = useState(false);
  const [error, setError] = useState('');
  const [handoverNotes, setHandoverNotes] = useState('');
  const [equipment, setEquipment] = useState([]);
  const [password, setPassword] = useState('');
  const [billingClose, setBillingClose] = useState({ payments_all_successful: true, insurances_used: [], total_momo_transactions: 0, total_card_transactions: 0 });
  const [helpdeskClose, setHelpdeskClose] = useState({ patient_walkin_queries: 0, internal_staff_queries: 0 });
  const [callcenterClose, setCallcenterClose] = useState({ call_top_reasons: [], has_pending_followups: false, followup_details: [] });
  const [nursingClose, setNursingClose] = useState({ total_assessments: 0, total_incidents: 0, handover_sbar_sb: '', handover_sbar_ar: '' });
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [incidentReported, setIncidentReported] = useState(false);
  const [incidentFormData, setIncidentFormData] = useState({
    incidentType: 'Equipment', department: '', areaOfIncident: '', namesInvolved: '',
    pidNumber: '', description: '', contributingFactors: '',
    immediateActions: '', preventionMeasures: ''
  });
  const autoSaveRef = useRef(null);
  const [elapsedHours, setElapsedHours] = useState(0);
  const [remainingMin, setRemainingMin] = useState(null);
  const [showWelcome, setShowWelcome] = useState(true);
  const [closingSummary, setClosingSummary] = useState(null); // holds closed data
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Load shift
  useEffect(() => {
    getShiftById(id)
      .then((res) => {
        const s = res.data.data;
        setShift(s);
        setHandoverNotes(s.handover_notes || '');
        const closeEquip = s.equipment?.close?.length
          ? s.equipment.close.map((e) => ({ name: e.equipment_name, status: e.equipment_status, remarks: e.remarks || '' }))
          : EQUIPMENT_BY_ROLE[s.shift_role].map((name) => ({ name, status: 'Working', remarks: '' }));
        setEquipment(closeEquip);
        if (s.shift_role === 'cashier' && s.role_data?.closing) {
          setBillingClose({ ...billingClose, ...s.role_data.closing, payments_all_successful: !!s.role_data.closing.payments_all_successful });
        }
        if (s.shift_role === 'helpdesk' && s.role_data?.closing) setHelpdeskClose(s.role_data.closing);
        if (s.shift_role === 'call_center' && s.role_data?.closing) setCallcenterClose(s.role_data.closing);
        if (s.shift_role === 'nurse' && s.role_data?.closing) setNursingClose(s.role_data.closing);
      })
      .catch(() => {
        toast.error('Session record inaccessible');
        navigate('/shifts');
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  // Live overtime countdown ticker
  useEffect(() => {
    if (!shift?.opened_at) return;
    const tick = () => {
      const waveConfig = getWaveConfig(shift);
      const waveStartTime = getWaveStartTime(shift) || new Date(shift.opened_at);
      const elapsed = (Date.now() - waveStartTime.getTime()) / (1000 * 60 * 60);
      const remaining = waveConfig.duration - elapsed;
      setElapsedHours(elapsed);
      setRemainingMin(remaining > 0 ? Math.ceil(remaining * 60) : 0);
    };
    tick();
    const t = setInterval(tick, 60_000);
    return () => clearInterval(t);
  }, [shift]);


  const buildPayload = useCallback(() => ({
    handover_notes: handoverNotes,
    password: password,
    equipment: equipment.map(({ name, status, remarks }) => ({ name, status, remarks: remarks || null })),
    ...(shift?.shift_role === 'cashier' && { cashier_close: { ...billingClose, opening_float: 0, closing_float: 0, cash_payments_total: 0 } }),
    ...(shift?.shift_role === 'helpdesk' && { helpdesk_close: helpdeskClose }),
    ...(shift?.shift_role === 'call_center' && { callcenter_close: callcenterClose }),
    ...(shift?.shift_role === 'nurse' && { nurse_close: nursingClose }),
  }), [handoverNotes, equipment, billingClose, helpdeskClose, callcenterClose, nursingClose, shift, password]);

  useEffect(() => {
    if (!shift) return;
    autoSaveRef.current = setInterval(async () => {
      setDraftSaving(true);
      try { await saveDraft(id, buildPayload()); } catch (_) { }
      finally { setTimeout(() => setDraftSaving(false), 1000); }
    }, 60_000);
    return () => clearInterval(autoSaveRef.current);
  }, [id, shift, buildPayload]);

  const handleEquipChange = (i, field, val) =>
    setEquipment((prev) => prev.map((item, idx) => idx === i ? { ...item, [field]: val } : item));

  const handleManualDraft = async () => {
    setDraftSaving(true);
    const tid = toast.loading('Securing draft record...');
    try {
      await saveDraft(id, buildPayload());
      toast.success('Draft Synchronized', { id: tid });
    } catch (_) {
      toast.error('Draft Sync Failure', { id: tid });
    } finally {
      setDraftSaving(false);
    }
  };

  const handleIncidentSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createIncident(incidentFormData);
      toast.success('Incident Report Submitted Successfully');
      setIncidentReported(true);
      setShowIncidentModal(false);
    } catch (err) {
      toast.error('Failed to submit incident report');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = async (e) => {
    e.preventDefault();
    setError('');

    if (!handoverNotes.trim()) {
      toast.error('Handover notes are mandatory for shift closure');
      return;
    }
    


    const badEquip = equipment.filter((e) => e.status !== 'Working' && !e.remarks.trim());
    if (badEquip.length) {
      toast.error(`Please provide justification for the ${badEquip[0].name}`);
      return;
    }

    const newBreaks = equipment.filter(e =>
      e.status !== 'Working' &&
      shift.equipment?.open?.find(o => o.equipment_name === e.name)?.equipment_status === 'Working'
    );

    if (newBreaks.length > 0 && !incidentReported) {
      toast.error('New equipment damage detected! You must file an Incident Report to close the shift.');

      setIncidentFormData(prev => ({
        ...prev,
        department: 'Customer Care',
        areaOfIncident: 'Workspace Terminal',
        namesInvolved: shift.user_name,
        description: `Equipment Damage Identified at Shift Close: ${newBreaks.map(b => b.name + ' (' + b.status + ')').join(', ')}`,
        contributingFactors: newBreaks.map(b => b.remarks).join('; ')
      }));
      setShowIncidentModal(true);
      return;
    }

    setShowPasswordModal(true);
  };

  const handleFinalClose = async (e) => {
    if (e) e.preventDefault();
    if (!password) {
      toast.error('Password is required for security seal');
      return;
    }

    setSubmitting(true);
    const tid = toast.loading('Processing official shift closure...');
    try {
      const res = await closeShift(id, buildPayload());
      toast.success('Session Officially Sealed', { id: tid });
      setShowPasswordModal(false);
      setClosingSummary({
        is_flagged: res?.data?.data?.is_flagged ?? false,
        cashier: billingClose,
        helpdesk: helpdeskClose,
        callcenter: callcenterClose,
      });
    } catch (err) {
      const msg = err.response?.data?.message || 'Shift closure protocol failure';
      toast.error(msg, { id: tid });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
      <div className="w-12 h-12 border-4 border-slate-200 border-t-[#1b669d] rounded-full animate-spin" />
      <p className="text-slate-400 font-black text-xs uppercase tracking-widest animate-pulse">Retrieving Session Details...</p>
    </div>
  );

  if (!shift) return null;

  const roleLabel = { cashier: 'Billing Agent', helpdesk: 'Helpdesk', call_center: 'Call Center Agent' }[shift.shift_role];

  return (
    <>
    {closingSummary && (
      <ShiftClosingSummary
        shift={shift}
        closedData={closingSummary}
        onExit={() => navigate('/shifts')}
      />
    )}
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Header */}
      <header className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-10 border-b-2 border-slate-100 pb-12">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <div className="flex items-center gap-6 mb-4">
            <div className="w-20 h-20 rounded-[32px] bg-gradient-to-br from-[#1b669d] to-[#124d77] flex items-center justify-center text-white shadow-2xl shadow-[#1b669d]/20">
              <Lock size={36} />
            </div>
            <div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Active Shift Workspace</h1>
              <div className="flex items-center gap-3 mt-2">
                <span className="px-3 py-1 rounded-xl bg-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-widest">{roleLabel} Protocol</span>
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                <div className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest">
                  <Clock size={16} /> Wave: {getWaveConfig(shift).schedule}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="flex flex-col items-end justify-end text-right">
            {draftSaving ? (
              <div className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-[#6fb448]/10 border-2 border-[#6fb448]/20 transition-all duration-300">
                <div className="w-2.5 h-2.5 rounded-full bg-[#6fb448] animate-ping" />
                <span className="text-[10px] font-black text-[#6fb448] uppercase tracking-widest">Auto-Saving</span>
              </div>
            ) : (
              <div className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-slate-50 border-2 border-slate-100 transition-all duration-300">
                <Save size={14} className="text-slate-400" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Draft Saved</span>
              </div>
            )}
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-3 max-w-[200px]">Fill this during your shift. Do not seal until handover.</p>
          </div>

          <button
            type="button"
            onClick={handleManualDraft}
            className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-white border-2 border-slate-200 hover:border-[#1b669d] transition-all text-slate-500 hover:text-[#1b669d] font-black text-xs uppercase tracking-widest"
          >
            <Save size={18} /> Sync Draft
          </button>
        </div>
      </header>

      {/* ── Welcome Mission Dashboard ────────────────────────────── */}
      <AnimatePresence>
        {showWelcome && (
          <WelcomeDashboard
            shift={shift}
            elapsedHours={elapsedHours}
            remainingMin={remainingMin}
            onDismiss={() => setShowWelcome(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Overtime Warning Banner ─────────────────────────────── */}
      <AnimatePresence>
        {elapsedHours >= getWaveConfig(shift).duration - 1.5 && shift.status !== 'closed' && (
          <motion.div
            key="overtime-banner"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`mb-8 rounded-2xl border-2 p-5 flex items-start gap-4 ${
              elapsedHours >= getWaveConfig(shift).duration
                ? 'bg-rose-950 border-rose-700 text-white'
                : elapsedHours >= getWaveConfig(shift).duration - 0.5
                ? 'bg-rose-50 border-rose-300'
                : 'bg-amber-50 border-amber-300'
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              elapsedHours >= getWaveConfig(shift).duration ? 'bg-rose-700 text-white' :
              elapsedHours >= getWaveConfig(shift).duration - 0.5 ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-700'
            }`}>
              {elapsedHours >= getWaveConfig(shift).duration ? <AlertTriangle size={20} /> : <Timer size={20} />}
            </div>
            <div className="flex-1">
              {elapsedHours >= getWaveConfig(shift).duration ? (
                <>
                  <p className="font-black text-sm uppercase tracking-widest text-rose-300">⛔ Shift Limit Exceeded</p>
                  <p className="text-sm font-semibold text-rose-100 mt-1">
                    Your shift has exceeded the <strong>{getWaveConfig(shift).duration}-hour</strong> policy limit.
                    It will be <strong>automatically closed and flagged</strong> by the system. Please close it immediately and contact your supervisor.
                  </p>
                </>
              ) : (
                <>
                  <p className={`font-black text-sm uppercase tracking-widest ${
                    elapsedHours >= getWaveConfig(shift).duration - 0.5 ? 'text-rose-700' : 'text-amber-700'
                  }`}>
                    {elapsedHours >= getWaveConfig(shift).duration - 0.5 ? '🚨 Urgent: Shift Nearing Limit' : '⏱ Shift Time Warning'}
                  </p>
                  <p className={`text-sm font-semibold mt-1 ${
                    elapsedHours >= getWaveConfig(shift).duration - 0.5 ? 'text-rose-600' : 'text-amber-700'
                  }`}>
                    You have been on shift for <strong>{Math.floor(elapsedHours)}h {Math.round((elapsedHours % 1) * 60)}m</strong>.
                    {remainingMin !== null && remainingMin > 0 && (
                      <> Only <strong>{remainingMin} minute{remainingMin !== 1 ? 's' : ''}</strong> remaining before auto-closure.</>
                    )}
                    {' '}Please note the <strong>{getWaveConfig(shift).duration}-hour</strong> duration policy. Finalize your handover and close this shift now.
                  </p>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleClose} className="space-y-12">
        <div className="space-y-12">
          {/* Header Warning */}
          <div className="bg-[#1b669d]/5 border-2 border-[#1b669d]/20 rounded-3xl p-6 flex gap-4">
            <AlertCircle className="text-[#1b669d] shrink-0" size={24} />
            <div>
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-1">Ongoing Session Protocol</h4>
              <p className="text-sm font-bold text-slate-600 leading-relaxed">This workspace is your active terminal. Information entered here is continuously synchronized. Only authorize shift closure when you are officially handing over to the next agent or ending your operational day.</p>
            </div>
          </div>

          {/* Role-specific closing forms */}
          {shift.shift_role === 'cashier' && (
            <BillingCloseForm
              data={billingClose}
              onChange={(k, v) => setBillingClose((p) => ({ ...p, [k]: v }))}
            />
          )}
          {shift.shift_role === 'helpdesk' && (
            <HelpdeskCloseForm data={helpdeskClose} onChange={(k, v) => setHelpdeskClose((p) => ({ ...p, [k]: v }))} />
          )}
          {shift.shift_role === 'call_center' && (
            <CallCenterCloseForm data={callcenterClose} onChange={(k, v) => setCallcenterClose((p) => ({ ...p, [k]: v }))} />
          )}
          {shift.shift_role === 'nurse' && (
            <NursingCloseForm data={nursingClose} onChange={(k, v) => setNursingClose((p) => ({ ...p, [k]: v }))} />
          )}
        </div>

        {/* Equipment checklist - Close */}
        <div className="shift-card">
          <div className="flex items-center gap-5 mb-10">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600 shadow-inner">
              <Monitor size={24} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">Post-Shift Inventory Check</h3>
              <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Final Hardware Status Verification</p>
            </div>
          </div>
          <EquipmentChecklist items={equipment} onChange={handleEquipChange} />
        </div>

        {/* Handover notes */}
        <div className="shift-card">
          <div className="flex items-center gap-5 mb-10">
            <div className="w-12 h-12 rounded-2xl bg-violet-500/10 flex items-center justify-center text-violet-600 shadow-inner">
              <StickyNote size={24} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">Final Handover Notes</h3>
              <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Mandatory Briefing for Incoming Staff</p>
            </div>
          </div>
          <textarea
            rows={6}
            placeholder="Document all pending tasks, critical patient issues, or operational events..."
            value={handoverNotes}
            onChange={(e) => setHandoverNotes(e.target.value)}
            className="shift-input w-full p-8 text-lg leading-relaxed bg-slate-50 border-slate-100 focus:bg-white resize-none rounded-[32px]"
            required
          />
        </div>

        {/* Submit */}
        <div className="pt-10">
          <button
            type="submit"
            disabled={submitting}
            className="w-full relative group overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-rose-600 via-rose-500 to-rose-600 opacity-90 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative py-8 rounded-[40px] flex items-center justify-center gap-5 text-white font-black text-2xl tracking-widest uppercase shadow-2xl shadow-rose-500/30">
              {submitting ? (
                <>
                  <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Sealing Record...</span>
                </>
              ) : (
                <>
                  <Lock size={32} />
                  <span>End Shift & Seal Record</span>
                </>
              )}
            </div>
          </button>

          <p className="mt-8 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] leading-relaxed max-w-lg mx-auto">
            Shift data will be timestamped and digitally signed under MD-244 Compliance Regulations.
          </p>
        </div>
      </form>

      <Modal isOpen={showIncidentModal} onClose={() => setShowIncidentModal(false)} title="Required Incident Report" maxWidth="850px">
        <IncidentFormFields
          formData={incidentFormData}
          handleChange={(e) => setIncidentFormData({ ...incidentFormData, [e.target.name]: e.target.value })}
          handleSubmit={handleIncidentSubmit}
          loading={submitting}
          onCancel={() => setShowIncidentModal(false)}
        />
      </Modal>

      {/* Password Modal */}
      <Modal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        title="Final Identity Authorization"
      >
        <div className="p-6">
          <div className="mb-8 flex items-center gap-4 p-4 bg-slate-900 rounded-2xl border border-white/10">
            <div className="w-12 h-12 rounded-xl bg-[#1b669d]/10 flex items-center justify-center text-[#34d399]">
              <Lock size={24} />
            </div>
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Seal Security Protocol</p>
              <p className="text-sm font-bold text-white">Please confirm your account password to seal and finalize this operational session.</p>
            </div>
          </div>

          <form onSubmit={handleFinalClose} className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 ml-1">Account Password</label>
              <input
                type="password"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-6 text-xl font-black focus:border-[#1b669d] outline-none transition-all placeholder:text-slate-200"
              />
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => setShowPasswordModal(false)}
                className="flex-1 px-8 py-5 rounded-2xl bg-slate-100 text-slate-500 font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-[2] px-8 py-5 rounded-2xl bg-[#6fb448] text-white font-black text-xs uppercase tracking-widest hover:bg-[#5da03c] transition-all shadow-xl shadow-[#6fb448]/20 disabled:opacity-50"
              >
                {submitting ? 'Sealing...' : 'Authorize Closure'}
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
    </>
  );
}
