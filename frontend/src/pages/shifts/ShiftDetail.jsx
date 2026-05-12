import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getShiftById
} from '../../api/shifts';
import { useAuth } from '../../context/AuthContext';
import { REVIEWER_ROLES } from './shiftConfig';
import {
  ArrowLeft,
  Clock,
  Users,
  Briefcase,
  ShieldCheck,
  AlertTriangle,
  Monitor,
  Smartphone,
  Printer,
  Phone,
  Headphones,
  Wallet,
  CreditCard,
  Search,
  PhoneCall,
  PhoneForwarded,
  ListPlus,
  StickyNote,
  Mail,
  CheckCircle2,
  Lock,
  ChevronRight,
  Coins
} from 'lucide-react';

// ─── Constants ──────────────────────────────────────────────────────────────
const ROLE_LABELS = {
  cashier: 'Billing Agent',
  helpdesk: 'Helpdesk',
  call_center: 'Call Center Agent'
};

const ICON_MAP = {
  'PC': <Monitor size={18} />,
  'MoMo Phone': <Smartphone size={18} />,
  'Receipt Printer': <Printer size={18} />,
  'Barcode Printer': <Printer size={18} />,
  'Desk Phone': <Phone size={18} />,
  'Headset': <Headphones size={18} />,
};

// ─── Helpers ────────────────────────────────────────────────────────────────
const InfoRow = ({ label, value, icon }) => (
  <div className="flex items-center justify-between py-5 border-b-2 border-slate-50 last:border-0 group">
    <div className="flex items-center gap-4">
      {icon && <div className="text-slate-200 group-hover:text-[#1b669d] transition-colors">{icon}</div>}
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
    </div>
    <span className="text-base font-black text-slate-900 group-hover:text-[#1b669d] transition-colors text-right max-w-[250px]">{value ?? '—'}</span>
  </div>
);

const EquipSection = ({ title, items, icon, color }) => (
  <div className="shift-card overflow-hidden h-full">
    <div className="flex items-center gap-4 mb-8">
      <div className={`w-10 h-10 rounded-2xl bg-${color === 'blue' ? '[#1b669d]' : 'rose'}-500/10 flex items-center justify-center text-${color === 'blue' ? '[#1b669d]' : 'rose'}-600`}>
        {icon}
      </div>
      <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">{title}</h3>
    </div>
    <div className="space-y-3">
      {items?.length ? items.map((e) => (
        <div key={e.id || e.equipment_name} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border-2 border-white group hover:border-slate-100 transition-all">
          <div className="flex items-center gap-4">
            <div className="text-slate-300 group-hover:text-[#1b669d] transition-colors">{ICON_MAP[e.equipment_name] || <Briefcase size={16} />}</div>
            <span className="text-sm font-black text-slate-800">{e.equipment_name}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg border-2 ${e.equipment_status === 'Working' ? 'text-emerald-700 border-emerald-100 bg-emerald-50' :
              e.equipment_status === 'Needs Repair' ? 'text-amber-700 border-amber-100 bg-amber-50' :
                'text-rose-700 border-rose-100 bg-rose-50'
              }`}>{e.equipment_status}</span>
            {e.remarks && <div className="text-[10px] text-slate-400 font-bold mt-2 italic">"{e.remarks}"</div>}
          </div>
        </div>
      )) : <p className="text-slate-300 text-xs font-black uppercase tracking-widest p-8 text-center border-4 border-dashed border-slate-50 rounded-3xl">No Logged Data</p>}
    </div>
  </div>
);

export default function ShiftDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [shift, setShift] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getShiftById(id)
      .then((res) => setShift(res.data.data))
      .catch(() => navigate('/shifts'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
      <div className="w-16 h-16 border-4 border-slate-100 border-t-[#1b669d] rounded-full animate-spin" />
      <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] animate-pulse">Establishing Secure Connection...</p>
    </div>
  );

  if (!shift) return null;

  const isReviewer = REVIEWER_ROLES.includes(user?.role);
  const cd = shift.role_data?.closing;

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Header */}
      <header className="mb-12 border-b-2 border-slate-100 pb-12">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-3 text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] hover:text-[#1b669d] transition-all mb-8 group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-2 transition-transform" /> Back to logs
        </button>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-10">
          <div className="flex items-center gap-8">
            <div className="w-24 h-24 rounded-[40px] bg-gradient-to-br from-[#1b669d] to-[#124d77] flex items-center justify-center text-5xl shadow-2xl shadow-[#1b669d]/30 text-white">
              {shift.shift_role === 'cashier' ? '💳' : shift.shift_role === 'helpdesk' ? '🎧' : '📞'}
            </div>
            <div>
              <div className="flex items-center gap-4 mb-2">
                <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Shift Summary</h1>
                <span className={`px-4 py-1.5 rounded-2xl border-4 text-[10px] font-black uppercase tracking-widest ${shift.status === 'open' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                  shift.status === 'draft' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                    'bg-blue-50 text-blue-700 border-blue-100'
                  }`}>{shift.status}</span>
              </div>
              <p className="text-slate-400 font-black text-xs uppercase tracking-[0.2em]">{ROLE_LABELS[shift.shift_role]} Report · ID: #{shift.id}</p>
            </div>
          </div>

          {shift.is_flagged && (
            <div className="flex items-center gap-4 px-8 py-4 rounded-[24px] bg-rose-50 border-4 border-rose-100 text-rose-600 shadow-2xl shadow-rose-500/5">
              <AlertTriangle size={24} />
              <div className="text-[10px] font-black uppercase tracking-[0.2em]">Security Anomaly Flagged</div>
            </div>
          )}
        </div>
      </header>

      <div className="space-y-10">
        {/* Flags Banner */}
        {shift.is_flagged && shift.flag_reasons?.length > 0 && (
          <div className="bg-rose-600 rounded-[40px] p-12 text-white relative overflow-hidden shadow-3xl shadow-rose-600/20">
            <div className="absolute top-0 right-0 p-10 opacity-10"><AlertTriangle size={150} /></div>
            <div className="relative z-10">
              <h3 className="text-xs font-black uppercase tracking-[0.3em] mb-6 opacity-60">Session Violation Report</h3>
              <div className="space-y-4">
                {shift.flag_reasons.map((r, i) => (
                  <div key={i} className="flex items-start gap-4 text-xl font-black">
                    <div className="w-2.5 h-2.5 rounded-full bg-white mt-3 shrink-0" />
                    {r}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Core Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="shift-card">
            <h3 className="section-label">
              <Users size={16} /> Staff Identification
            </h3>
            <div className="space-y-1">
              <InfoRow label="Personnel" value={shift.user_name} icon={<Users size={18} />} />
              <InfoRow label="Access Email" value={shift.user_email} icon={<Mail size={18} />} />
              <InfoRow label="Assigned Role" value={ROLE_LABELS[shift.shift_role]} icon={<Briefcase size={18} />} />
            </div>
          </div>

          <div className="shift-card">
            <h3 className="section-label">
              <Clock size={16} /> Temporal Data
            </h3>
            <div className="space-y-1">
              <InfoRow label="Shift Initiation" value={shift.opened_at ? new Date(shift.opened_at).toLocaleString() : null} icon={<div className="w-2.5 h-2.5 rounded-full bg-[#6fb448]" />} />
              <InfoRow label="Shift Termination" value={shift.closed_at ? new Date(shift.closed_at).toLocaleString() : null} icon={<div className="w-2.5 h-2.5 rounded-full bg-rose-500" />} />
              <InfoRow label="Reviewer" value={shift.reviewed_by_name || 'Verification Pending'} icon={<ShieldCheck size={18} />} />
            </div>
          </div>
        </div>

        {/* Handover Notes */}
        {shift.handover_notes && (
          <div className="shift-card border-4 border-slate-50 bg-slate-50/30">
            <h3 className="section-label">
              <StickyNote size={16} /> Operational Handover Notes
            </h3>
            <div className="text-xl font-black text-slate-800 leading-relaxed bg-white p-10 rounded-[40px] border-2 border-slate-100 shadow-xl italic">
              "{shift.handover_notes}"
            </div>
          </div>
        )}

        {/* Equipment Snapshot */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <EquipSection title="Inventory Check (Open)" items={shift.equipment?.open} icon={<Monitor size={20} />} color="blue" />
          {shift.status !== 'open' && <EquipSection title="Inventory Check (Close)" items={shift.equipment?.close} icon={<Lock size={20} />} color="rose" />}
        </div>

        {/* Role-Specific Data */}
        <div className="space-y-10">
          {shift.shift_role === 'cashier' && cd && (
            <div className="space-y-10">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="shift-card">
                  <h3 className="section-label">Patient Traffic Metrics</h3>
                  <InfoRow label="Total Records" value={cd.total_patients} icon={<Users size={18} />} />
                  <InfoRow label="Insured Patients" value={cd.total_insured} icon={<ShieldCheck size={18} />} />
                  <InfoRow label="Private Clients" value={cd.total_private} icon={<Briefcase size={18} />} />
                  <div className="mt-6 pt-6 border-t-2 border-slate-50">
                    <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-4">Accepted Insurance Carriers</div>
                    <div className="flex flex-wrap gap-3">
                      {cd.insurances_used?.map((ins) => (
                        <span key={ins} className="px-4 py-2 rounded-2xl bg-slate-50 border-2 border-slate-100 text-xs font-black text-slate-600">{ins}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="shift-card">
                  <h3 className="section-label">Digital Payment Reconciliation</h3>
                  <InfoRow label="Mobile Money" value={cd.total_momo_transactions ? Number(cd.total_momo_transactions).toLocaleString() + ' RWF' : '0 RWF'} icon={<Smartphone size={18} className="text-emerald-600" />} />
                  <InfoRow label="Card Payments" value={cd.total_card_transactions ? Number(cd.total_card_transactions).toLocaleString() + ' RWF' : '0 RWF'} icon={<CreditCard size={18} className="text-blue-600" />} />
                  <InfoRow label="Terminal Used" value={cd.card_bank_terminal} />
                  <div className={`mt-6 p-6 rounded-[32px] border-4 flex items-center justify-between ${cd.payments_all_successful ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Security Clearance</span>
                    <span className={`text-xs font-black uppercase tracking-widest ${cd.payments_all_successful ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {cd.payments_all_successful ? '✅ All Clear' : '⚠ Anomaly Detected'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {shift.shift_role === 'helpdesk' && cd && (
            <div className="shift-card">
              <h3 className="section-label">Functional Analytics</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                <div className="bg-blue-50 border-4 border-blue-100 p-12 rounded-[48px] text-center group hover:bg-white transition-all">
                  <div className="text-blue-600 flex justify-center mb-6 scale-150"><Users size={32} /></div>
                  <div className="text-6xl font-black text-slate-900 mb-2">{cd.patient_walkin_queries}</div>
                  <div className="text-[10px] font-black text-blue-600/50 uppercase tracking-[0.3em]">Patient Engagement</div>
                </div>
                <div className="bg-slate-50 border-4 border-slate-100 p-12 rounded-[48px] text-center group hover:bg-white transition-all">
                  <div className="text-[#1b669d] flex justify-center mb-6 scale-150"><Briefcase size={32} /></div>
                  <div className="text-6xl font-black text-slate-900 mb-2">{cd.internal_staff_queries}</div>
                  <div className="text-[10px] font-black text-[#1b669d]/50 uppercase tracking-[0.3em]">Staff Consultation</div>
                </div>
              </div>
            </div>
          )}

          {shift.shift_role === 'call_center' && cd && (
            <div className="space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="shift-card">
                  <h3 className="section-label"><PhoneCall size={18} /> Inbound Traffic</h3>
                  <InfoRow label="Total Reception" value={cd.inbound_total} icon={<div className="w-3 h-3 rounded-full bg-blue-500" />} />
                  <InfoRow label="Success Rate" value={cd.inbound_assisted} icon={<div className="w-3 h-3 rounded-full bg-[#6fb448]" />} />
                  <InfoRow label="Dropped Calls" value={cd.inbound_dropped} icon={<div className="w-3 h-3 rounded-full bg-rose-500" />} />
                </div>
                <div className="shift-card">
                  <h3 className="section-label"><PhoneForwarded size={18} /> Outbound Outreach</h3>
                  <InfoRow label="Total Attempts" value={cd.outbound_total} icon={<div className="w-3 h-3 rounded-full bg-indigo-500" />} />
                  <InfoRow label="Successful Connect" value={cd.outbound_reached} icon={<div className="w-3 h-3 rounded-full bg-[#6fb448]" />} />
                  <InfoRow label="Unresolved Dial" value={cd.outbound_unreached} icon={<div className="w-3 h-3 rounded-full bg-rose-500" />} />
                </div>
              </div>

              <div className="shift-card">
                <h3 className="section-label"><ListPlus size={18} /> Interaction Categories</h3>
                <div className="flex flex-wrap gap-3">
                  {cd.call_top_reasons?.map((r) => (
                    <span key={r} className="px-6 py-3 rounded-2xl bg-white border-2 border-slate-100 text-xs font-black text-slate-800 uppercase tracking-widest">{r}</span>
                  ))}
                </div>
              </div>

              {cd.has_pending_followups && cd.followup_details?.length > 0 && (
                <div className="bg-amber-600 rounded-[48px] p-12 text-white shadow-3xl shadow-amber-600/20">
                  <h3 className="text-xs font-black uppercase tracking-[0.4em] mb-10 opacity-60">Critical Handover Protocol</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    {cd.followup_details.map((f, i) => (
                      <div key={i} className="p-8 rounded-[32px] bg-white/10 border-2 border-white/10 group hover:bg-white/20 transition-all">
                        <div className="flex items-center justify-between mb-4">
                          <div className="text-lg font-black">{f.name}</div>
                          {f.patient_id && <div className="text-[10px] font-black opacity-40 uppercase tracking-widest">#{f.patient_id}</div>}
                        </div>
                        {f.notes && <div className="text-sm font-bold opacity-80 leading-relaxed italic">"{f.notes}"</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Footer */}
        <footer className="pt-16 flex flex-col items-center gap-6">
          {(shift.status === 'open' || shift.status === 'draft') && !isReviewer ? (
            <Link to={`/shifts/close/${shift.id}`}
              className="group relative w-full overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-[#1b669d] via-[#6fb448] to-[#1b669d] opacity-90 group-hover:opacity-100 transition-opacity duration-300 shadow-3xl" />
              <div className="relative py-8 rounded-[40px] flex items-center justify-center gap-4 text-white font-black text-2xl tracking-widest uppercase">
                <span>Authorize Shift Closure</span>
                <ChevronRight size={32} className="group-hover:translate-x-2 transition-transform" />
              </div>
            </Link>
          ) : (
            <div className="text-center space-y-3">
              <div className="w-16 h-16 rounded-3xl bg-slate-50 border-2 border-slate-100 flex items-center justify-center text-slate-200 mx-auto mb-6">
                <ShieldCheck size={32} />
              </div>
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.5em]">Digital Forensic Log</p>
              <div className="text-slate-400 font-black text-xs uppercase tracking-widest">
                Sealed & Authenticated under MD-244 Compliance
              </div>
            </div>
          )}
        </footer>
      </div>
    </div>
  );
}
