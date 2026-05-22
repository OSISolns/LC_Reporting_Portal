import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Briefcase,
  CheckCircle2,
  Monitor,
  Smartphone,
  Printer,
  Phone,
  Headphones,
  ArrowRight,
  ChevronRight,
  Lock,
  BadgeCheck,
  Clock,
  Thermometer,
  Stethoscope,
  Activity,
  Users,
  ShieldCheck,
  Pill,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { openShift, getMyActiveShift } from '../../api/shifts';
import Modal from '../../components/Modal';
import { useAuth } from '../../context/AuthContext';
import {
  SHIFT_ROLES, EQUIPMENT_BY_ROLE, EQUIPMENT_STATUS_OPTIONS,
} from './shiftConfig';

// ─── Constants ──────────────────────────────────────────────────────────────
const ICON_MAP = {
  'PC': <Monitor size={18} />,
  'MoMo Phone': <Smartphone size={18} />,
  'Receipt Printer': <Printer size={18} />,
  'Barcode Printer': <Printer size={18} />,
  'Desk Phone': <Phone size={18} />,
  'Headset': <Headphones size={18} />,
  'Thermometer': <Thermometer size={18} />,
  'Stethoscope': <Stethoscope size={18} />,
  'BP Machine': <Activity size={18} />,
  'Pulse Oximeter': <Pill size={18} />,
}

const WAVE_OPTIONS = [
  { hour: '07:00', label: '7:00 A.M.', wave: 'Wave 1', schedule: '7:00 AM - 3:00 PM', desc: 'Morning Core Shift' },
  { hour: '08:00', label: '8:00 A.M.', wave: 'Wave 2', schedule: '8:00 AM - 4:00 PM', desc: 'Morning Mid Shift' },
  { hour: '15:00', label: '3:00 P.M.', wave: 'Wave 3', schedule: '3:00 PM - 9:00 PM', desc: 'Evening Handover Shift' },
];

// ─── Sub-component: Equipment Checklist ──────────────────────────────────────
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
        <div className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl ${item.status === 'Working' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' :
                item.status === 'Needs Repair' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' :
                  'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
                }`}>
                {ICON_MAP[item.name] || <Briefcase size={20} />}
              </div>
              <div>
                <span className="font-black text-slate-900 block text-lg">{item.name}</span>
                <span className={`text-[10px] font-black uppercase tracking-widest ${item.status === 'Working' ? 'text-emerald-600' :
                  item.status === 'Needs Repair' ? 'text-amber-600' :
                    'text-rose-600'
                  }`}>{item.status}</span>
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
                    : 'bg-white border-2 border-slate-100 text-slate-400 hover:border-slate-200 hover:text-slate-600'
                    }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {item.status !== 'Working' && (
            <div>
              <div className="mt-5 pt-5 border-t border-slate-200/60">
                <input
                  type="text"
                  placeholder="Briefly describe the hardware issue..."
                  value={item.remarks}
                  onChange={(e) => onChange(i, 'remarks', e.target.value)}
                  className="shift-input w-full border-amber-200 bg-amber-50/30 placeholder-amber-400/60"
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

// ─── Main Component: OpenShift ──────────────────────────────────────────────
export default function OpenShift() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState('');
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startHour, setStartHour] = useState('');

  const isCustomerCare = user?.role === 'customer_care' || ['helpdesk', 'call_center'].includes(selectedRole);

  const visibleRoles = SHIFT_ROLES.filter(role => {
    if (user?.role === 'nurse') return role.value === 'nurse';
    if (['admin', 'it_officer'].includes(user?.role)) return true;
    return role.value !== 'nurse';
  });
  const [password, setPassword] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [newShiftId, setNewShiftId] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  useEffect(() => {
    getMyActiveShift()
      .then(res => {
        if (res.data?.data) {
          toast.success('Resuming Active Shift Session');
          navigate(`/shifts/close/${res.data.data.id}`);
        } else {
          setLoading(false);
        }
      })
      .catch(() => {
        setLoading(false);
      });
  }, [navigate]);

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setEquipment(EQUIPMENT_BY_ROLE[role].map(name => ({ name, status: 'Working', remarks: '' })));
    setStep(2);
  };

  const handleEquipmentChange = (i, field, val) => {
    setEquipment(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: val } : item));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    // Validation
    if (isCustomerCare && !startHour) {
      toast.error('Please specify your starting hour for wave allocation.');
      return;
    }

    const badEquip = equipment.filter(e => e.status !== 'Working' && !e.remarks.trim());
    if (badEquip.length) {
      toast.error(`Please provide details for the ${badEquip[0].name}`);
      return;
    }

    setShowPasswordModal(true);
  };

  const handleFinalSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!password) {
      toast.error('Password is required');
      return;
    }

    setLoading(true);
    const tid = toast.loading('Synchronizing shift protocol...');

    try {
      const payload = {
        shift_role: selectedRole,
        equipment: equipment.map(e => ({ name: e.name, status: e.status, remarks: e.remarks || null })),
        password,
        start_hour: isCustomerCare ? startHour : null,
        // Legacy Clinics doesn't allow cashiers to accept cash, so float is always 0
        ...(selectedRole === 'cashier' && { opening_float: 0 })
      };

      const res = await openShift(payload);
      toast.success('Shift Protocol Activated', { id: tid });
      setShowPasswordModal(false);
      setNewShiftId(res.data.data.shiftId);
      setShowSuccess(true);
      setTimeout(() => navigate(`/shifts/close/${res.data.data.shiftId}`), 3000);
    } catch (err) {
      const errorData = err.response?.data;
      toast.error(errorData?.message || 'Protocol failure', { id: tid });

      if (errorData?.shiftId) {
        setTimeout(() => navigate(`/shifts/close/${errorData.shiftId}`), 1500);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Header Wizard */}
      <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-8 border-b-2 border-slate-100 pb-10">
        <div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <div className="flex items-center gap-5 mb-4">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-[#1b669d] to-[#124d77] flex items-center justify-center text-white shadow-2xl shadow-[#1b669d]/30">
              {loading ? <Briefcase size={28} className="animate-pulse" /> : <Briefcase size={28} />}
            </div>
            <div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Open Shift</h1>
              <p className="text-slate-400 font-black text-xs uppercase tracking-widest mt-1">Operational Protocol v2.5</p>
            </div>
          </div>
        </div>

        <div className="flex items-center bg-slate-100 p-2 rounded-3xl border-2 border-white shadow-inner">
          {[{ n: 1, l: 'Role Selection' }, { n: 2, l: 'Verification' }].map(({ n, l }) => (
            <div key={n} className="flex items-center">
              <div className={`flex items-center gap-3 px-6 py-3 rounded-2xl transition-all duration-500 ${step === n
                ? 'bg-white text-slate-900 shadow-xl'
                : step > n ? 'text-[#6fb448]' : 'text-slate-400'
                }`}>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black border-2 ${step === n ? 'border-[#1b669d] bg-[#1b669d]/10 text-[#1b669d]' :
                  step > n ? 'border-[#6fb448] bg-[#6fb448]/10 text-[#6fb448]' :
                    'border-slate-200 text-slate-300'
                  }`}>
                  {step > n ? <CheckCircle2 size={18} /> : n}
                </div>
                <span className="text-xs font-black uppercase tracking-widest">{l}</span>
              </div>
              {n === 1 && <ChevronRight size={18} className="mx-2 text-slate-300" />}
            </div>
          ))}
        </div>
      </header>

      <div className="space-y-10">
        {loading ? (
          <div className="flex justify-center p-12">
            <div className="w-12 h-12 border-4 border-slate-100 border-t-[#1b669d] rounded-full animate-spin shadow-xl" />
          </div>
        ) : step === 1 ? (
          <div
            key="step1"
            className="space-y-10"
          >
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Select Shift Role</h2>
              <p className="text-slate-500 font-bold">Your role determines the required equipment checks and reporting metrics.</p>
            </div>

            <div className={`grid grid-cols-1 gap-8 ${visibleRoles.length === 1 ? 'max-w-md mx-auto' : 'md:grid-cols-3'}`}>
              {visibleRoles.map((role) => (
                <button
                  key={role.value}
                  onClick={() => handleRoleSelect(role.value)}
                  className="group relative flex flex-col items-center justify-center p-10 rounded-[40px] border-4 border-white bg-white hover:border-[#1b669d]/20 hover:shadow-3xl hover:-translate-y-2 transition-all duration-500 shadow-2xl shadow-slate-200/50"
                >
                  <div className="absolute top-0 right-0 p-6 text-slate-100 group-hover:text-[#1b669d]/5 transition-colors">
                    <ArrowRight size={80} className="-rotate-45" />
                  </div>

                  <div className="mb-8 w-24 h-24 rounded-[32px] bg-slate-50 border-2 border-slate-100 flex items-center justify-center text-6xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 group-hover:bg-[#1b669d]/5 group-hover:border-[#1b669d]/10">
                    {role.icon}
                  </div>

                  <h3 className="text-2xl font-black text-slate-900 mb-2">{role.label}</h3>
                  <div className="px-4 py-1 rounded-full bg-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-widest group-hover:bg-[#6fb448]/10 group-hover:text-[#6fb448] transition-colors">
                    {EQUIPMENT_BY_ROLE[role.value].length} Inventory Items
                  </div>

                  <div className="mt-8 w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-[#1b669d] to-[#6fb448]"
                      initial={{ width: 0 }}
                      whileHover={{ width: '100%' }}
                    />
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div
            key="step2"
            className="space-y-10"
          >
            {/* Context Info */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 bg-[#1b669d]/5 border-2 border-[#1b669d]/10 p-8 rounded-[32px]">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center text-4xl shadow-xl shadow-[#1b669d]/10">
                  {SHIFT_ROLES.find(r => r.value === selectedRole)?.icon}
                </div>
                <div>
                  <span className="text-[10px] font-black text-[#1b669d] uppercase tracking-[0.2em] block leading-none mb-1">Authenticated Role</span>
                  <span className="text-xl font-black text-slate-900">{SHIFT_ROLES.find(r => r.value === selectedRole)?.label}</span>
                </div>
              </div>

              <button
                onClick={() => setStep(1)}
                className="px-8 py-3 rounded-2xl bg-white border-2 border-slate-100 text-slate-500 font-black text-xs uppercase tracking-widest hover:border-[#1b669d]/30 hover:text-[#1b669d] transition-all"
              >
                Change Role
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-10">
              {/* Role-Specific Fields (No Cash Reconciliation per policy) */}

              {/* Customer Care Starting Hour & Wave Selector */}
              {isCustomerCare && (
                <div className="shift-card bg-gradient-to-br from-slate-50 to-white border-2 border-slate-100 shadow-sm rounded-3xl p-8 animate-fadeIn">
                  <div className="flex items-center gap-5 mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-violet-500/10 flex items-center justify-center text-violet-600 shadow-inner">
                      <Clock size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900 tracking-tight">Starting Hour & Wave Selection</h3>
                      <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Select your starting hour to automatically allocate your wave</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {WAVE_OPTIONS.map((opt) => {
                      const isSelected = startHour === opt.hour;
                      return (
                        <button
                          key={opt.hour}
                          type="button"
                          onClick={() => setStartHour(opt.hour)}
                          className={`relative flex flex-col items-start p-6 rounded-2xl border-2 transition-all duration-300 text-left ${
                            isSelected
                              ? 'bg-violet-50 border-violet-500 shadow-lg shadow-violet-500/5'
                              : 'bg-white border-slate-100 hover:border-slate-200'
                          }`}
                        >
                          <div className="flex justify-between items-center w-full mb-3">
                            <span className={`text-xs font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${
                              isSelected ? 'bg-violet-500 text-white' : 'bg-slate-100 text-slate-500'
                            }`}>
                              {opt.wave}
                            </span>
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                              isSelected ? 'bg-violet-600 border-violet-600' : 'bg-white border-slate-200'
                            }`}>
                              {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                            </div>
                          </div>
                          
                          <span className="text-2xl font-black text-slate-900 mt-1 block">
                            {opt.label}
                          </span>
                          <span className="text-xs font-bold text-slate-500 mt-1 block">
                            {opt.schedule}
                          </span>
                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider mt-4 block">
                            {opt.desc}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Equipment Checklist */}
              <div className="shift-card">
                <div className="flex items-center gap-5 mb-10">
                  <div className="w-12 h-12 rounded-2xl bg-[#1b669d]/10 flex items-center justify-center text-[#1b669d] shadow-inner">
                    <Monitor size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Security & Equipment Check</h3>
                    <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Hardware Integrity Verification</p>
                  </div>
                </div>

                <EquipmentChecklist items={equipment} onChange={handleEquipmentChange} />
              </div>

              {/* Submit Action */}
              <div className="pt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full relative group overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-[#1b669d] via-[#6fb448] to-[#1b669d] opacity-90 group-hover:opacity-100 transition-opacity duration-300 shadow-2xl" />
                  <div className="relative py-8 rounded-[32px] flex items-center justify-center gap-4 text-white font-black text-xl tracking-widest uppercase">
                    {loading ? (
                      <>
                        <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Initializing Protocol...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={32} />
                        <span>Activate Shift Mission</span>
                      </>
                    )}
                  </div>
                </button>
                <p className="text-center mt-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">
                  Shift data will be timestamped and digitally signed
                </p>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Password Modal */}
      <Modal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        title="Identity Authorization"
      >
        <div className="p-6">
          <div className="mb-8 flex items-center gap-4 p-4 bg-slate-900 rounded-2xl border border-white/10">
            <div className="w-12 h-12 rounded-xl bg-[#1b669d]/10 flex items-center justify-center text-[#34d399]">
              <Lock size={24} />
            </div>
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Authorized Access Only</p>
              <p className="text-sm font-bold text-white">Please confirm your account password to activate this shift.</p>
            </div>
          </div>

          <form onSubmit={handleFinalSubmit} className="space-y-6">
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
                disabled={loading}
                className="flex-[2] px-8 py-5 rounded-2xl bg-[#1b669d] text-white font-black text-xs uppercase tracking-widest hover:bg-[#124d77] transition-all shadow-xl shadow-[#1b669d]/20 disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Authorize Activation'}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      <AnimatePresence>
        {showSuccess && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="max-w-md w-full bg-white rounded-[40px] p-10 text-center shadow-2xl overflow-hidden relative"
            >
              <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-[#1b669d] via-[#6fb448] to-[#1b669d] animate-pulse" />
              
              <div className="mb-8 flex justify-center">
                <div className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-inner">
                  <BadgeCheck size={48} />
                </div>
              </div>

              <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Mission Started!</h2>
              <p className="text-slate-500 font-bold leading-relaxed mb-10">
                Shift Protocol has been successfully activated. You are now officially on duty. Redirecting you to your workspace...
              </p>

              <div className="flex flex-col items-center gap-6">
                <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center border-2 border-slate-100">
                  <Clock size={28} className="text-[#1b669d] animate-spin-slow" />
                </div>
                <button 
                  onClick={() => navigate(`/shifts/close/${newShiftId}`)}
                  style={{ width: '100%', backgroundColor: '#1b669d', color: '#fff', border: 'none', borderRadius: '16px', padding: '1.25rem', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', letterSpacing: '0.05em', textTransform: 'uppercase' }}
                >
                  Enter Workspace Now
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
