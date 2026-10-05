import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  CreditCard,
  Crown
} from 'lucide-react';
import toast from 'react-hot-toast';
import { openShift, getMyActiveShift } from '../../api/shifts';
import Modal from '../../components/Modal';
import { useAuth } from '../../context/AuthContext';
import { SHIFT_ROLES, EQUIPMENT_BY_ROLE, EQUIPMENT_STATUS_OPTIONS, NURSING_WARDS, getItemStatusOptions, getDefaultItemStatus } from './shiftConfig';

// ─── Constants ──────────────────────────────────────────────────────────────
const ROLE_ICONS = {
  cashier: <CreditCard size={36} className="text-[#1b669d]" />,
  helpdesk: <Monitor size={36} className="text-[#1b669d]" />,
  call_center: <Phone size={36} className="text-[#1b669d]" />,
  nurse: <Stethoscope size={36} className="text-[#1b669d]" />,
  vip_lounge: <Crown size={36} className="text-[#1b669d]" />,
};

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
  '12-Lead ECG Machine': <Activity size={18} />,
  'TMT Stress Test System': <Activity size={18} />,
  'Cardiac Monitor': <Monitor size={18} />,
  'Minor Surgery Instrument Tray': <Briefcase size={18} />,
  'Surgical Light': <Monitor size={18} />,
  'Autoclave Sterilizer': <Briefcase size={18} />,
  'Vaccine Cold Storage / Refrigerator': <Thermometer size={18} />,
  'Paid Stamp': <BadgeCheck size={18} />,
  'Waiting No. Stamp': <BadgeCheck size={18} />,
};

const WAVE_OPTIONS = [
  { hour: '07:00', label: '7:00 A.M.', wave: 'Wave 1', schedule: '7:00 AM - 3:00 PM', desc: 'Morning Core Shift' },
  { hour: '08:00', label: '8:00 A.M.', wave: 'Wave 2', schedule: '8:00 AM - 4:00 PM', desc: 'Morning Mid Shift' },
  { hour: '09:00', label: '9:00 A.M.', wave: 'Wave 4', schedule: '9:00 AM - 5:00 PM', desc: 'Late Morning Shift' },
  { hour: '15:00', label: '3:00 P.M.', wave: 'Wave 3', schedule: '3:00 PM - 9:00 PM', desc: 'Evening Handover Shift' },
];

// ─── Sub-component: Equipment Checklist ──────────────────────────────────────
const EquipmentChecklist = ({ items, onChange }) => (
  <div className="space-y-2.5">
    {items.map((item, i) => {
      const isGood = item.status === 'Working' || item.status === 'Available';
      const isAmber = item.status === 'Needs Repair';
      const statusOptions = getItemStatusOptions(item.name);

      return (
        <div
          key={item.name}
          className={`p-3 rounded-xl border transition-all ${
            isGood
              ? 'bg-white border-slate-200'
              : isAmber
              ? 'bg-amber-50/50 border-amber-200'
              : 'bg-rose-50/50 border-rose-200'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                isGood ? 'bg-emerald-50 text-emerald-700' :
                isAmber ? 'bg-amber-100 text-amber-800' :
                'bg-rose-100 text-rose-800'
              }`}>
                {ICON_MAP[item.name] || <Briefcase size={16} />}
              </div>
              <div>
                <span className="font-semibold text-slate-800 text-xs block">{item.name}</span>
                <span className={`text-[10px] font-medium ${
                  isGood ? 'text-emerald-600' :
                  isAmber ? 'text-amber-600' :
                  'text-rose-600'
                }`}>{item.status}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {statusOptions.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => onChange(i, 'status', status)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                    item.status === status
                      ? (status === 'Working' || status === 'Available') ? 'bg-emerald-600 text-white' :
                        status === 'Needs Repair' ? 'bg-amber-600 text-white' :
                        'bg-rose-600 text-white'
                      : 'bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {!isGood && (
            <div className="mt-2 pt-2 border-t border-slate-200/60">
              <input
                type="text"
                placeholder="Briefly describe the issue..."
                value={item.remarks}
                onChange={(e) => onChange(i, 'remarks', e.target.value)}
                className="w-full text-xs px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50/50 text-slate-800 placeholder-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
                required
              />
            </div>
          )}
        </div>
      );
    })}
  </div>
);

// ─── Main Component: OpenShift ──────────────────────────────────────────────
export default function OpenShift() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedWard, setSelectedWard] = useState('STATION 1');
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startHour, setStartHour] = useState('');

  const isCustomerCare = ['helpdesk', 'call_center'].includes(selectedRole);

  const visibleRoles = SHIFT_ROLES.filter(role => {
    if (['admin', 'it_officer'].includes(user?.role)) return true;
    if (user?.role === 'nurse' || user?.role === 'chef-nurse') return role.value === 'nurse';
    if (user?.role === 'vip_lounge') return role.value === 'vip_lounge';
    if (user?.role === 'customer_care') return ['vip_lounge', 'helpdesk', 'call_center', 'cashier'].includes(role.value);
    if (user?.role === 'cashier') return role.value === 'cashier';
    return role.value !== 'nurse' && role.value !== 'vip_lounge';
  });
  const [password, setPassword] = useState('');
  const [activationError, setActivationError] = useState('');
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
    if (role === 'nurse') {
      const wardObj = NURSING_WARDS.find(w => w.name === selectedWard) || NURSING_WARDS[0];
      setEquipment(wardObj.equipment.map(name => ({ name, status: getDefaultItemStatus(name), remarks: '' })));
    } else {
      setEquipment(EQUIPMENT_BY_ROLE[role].map(name => ({ name, status: getDefaultItemStatus(name), remarks: '' })));
    }
    setStep(2);
  };

  const handleWardSelect = (wardName) => {
    setSelectedWard(wardName);
    const wardObj = NURSING_WARDS.find(w => w.name === wardName) || NURSING_WARDS[0];
    setEquipment(wardObj.equipment.map(name => ({ name, status: getDefaultItemStatus(name), remarks: '' })));
  };

  const handleEquipmentChange = (i, field, val) => {
    setEquipment(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: val } : item));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    if (selectedRole === 'nurse' && !selectedWard) {
      toast.error('Please select your assigned Nursing Ward (STATION 1, STATION 2, MINOR SURGERY, or PAEDIATRICS).');
      return;
    }

    if (!startHour) {
      toast.error('Please specify your starting hour for wave allocation.');
      return;
    }

    const badEquip = equipment.filter(e => e.status !== 'Working' && e.status !== 'Available' && !e.remarks.trim());
    if (badEquip.length) {
      toast.error(`Please provide details for the ${badEquip[0].name}`);
      return;
    }

    setShowPasswordModal(true);
  };

  const handleFinalSubmit = async (e) => {
    if (e) e.preventDefault();
    setActivationError('');
    if (!password) {
      setActivationError('Password is required');
      return;
    }

    setLoading(true);
    const tid = toast.loading('Synchronizing shift protocol...');

    try {
      const payload = {
        shift_role: selectedRole,
        nursing_ward: selectedRole === 'nurse' ? selectedWard : null,
        equipment: equipment.map(e => ({ name: e.name, status: e.status, remarks: e.remarks || null })),
        password,
        start_hour: startHour,
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
      const msg = errorData?.message || 'Protocol failure';
      setActivationError(msg);
      toast.error(msg, { id: tid });

      if (errorData?.shiftId) {
        setTimeout(() => navigate(`/shifts/close/${errorData.shiftId}`), 1500);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-5">
      {/* Header Wizard */}
      <header className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#E6F4F6] text-[#007B8A] flex items-center justify-center font-bold">
            <Briefcase size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800 tracking-tight">Open Shift Session</h1>
            <p className="text-slate-500 text-xs mt-0.5">Select station and verify equipment readiness</p>
          </div>
        </div>

        <div className="flex items-center bg-slate-100 p-1.5 rounded-xl border border-slate-200">
          {[{ n: 1, l: 'Role' }, { n: 2, l: 'Verification' }].map(({ n, l }) => (
            <div key={n} className="flex items-center">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                step === n ? 'bg-white text-slate-800 shadow-xs' : step > n ? 'text-emerald-600' : 'text-slate-400'
              }`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  step === n ? 'bg-[#007B8A] text-white' : step > n ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'
                }`}>
                  {step > n ? <CheckCircle2 size={12} /> : n}
                </div>
                <span>{l}</span>
              </div>
              {n === 1 && <ChevronRight size={14} className="mx-1 text-slate-300" />}
            </div>
          ))}
        </div>
      </header>

      <div className="space-y-5">
        {loading ? (
          <div className="flex justify-center p-12">
            <div className="w-10 h-10 border-3 border-slate-200 border-t-[#007B8A] rounded-full animate-spin" />
          </div>
        ) : step === 1 ? (
          <div key="step1" className="space-y-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs text-center">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-slate-800">Select Shift Role</h2>
              <p className="text-slate-500 text-xs">Your role determines required equipment checks and metrics.</p>
            </div>

            <div className="flex flex-wrap justify-center gap-3 pt-2">
              {visibleRoles.map((role) => (
                <button
                  key={role.value}
                  onClick={() => handleRoleSelect(role.value)}
                  className="group flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 bg-white hover:border-[#007B8A] hover:bg-[#E6F4F6]/50 transition-all text-left shadow-xs"
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 group-hover:bg-[#007B8A] group-hover:text-white transition-colors shrink-0">
                    {ROLE_ICONS[role.value]}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">{role.label}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {EQUIPMENT_BY_ROLE[role.value].length} equipment items
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div key="step2" className="space-y-5">
            {/* Authenticated Role Banner */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#E6F4F6] text-[#007B8A] flex items-center justify-center">
                  <Stethoscope size={18} />
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Authenticated Role</span>
                  <span className="text-sm font-bold text-slate-800">{SHIFT_ROLES.find(r => r.value === selectedRole)?.label}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors border border-slate-200"
              >
                Change Role
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Nursing Ward / Station Selector */}
              {selectedRole === 'nurse' && (
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <Stethoscope size={16} className="text-[#007B8A]" />
                        Select Nursing Station / Ward <span className="text-rose-500">*</span>
                      </h3>
                      <p className="text-slate-500 text-xs mt-0.5">
                        Choose your assigned station before activating shift to auto-load station equipment
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {NURSING_WARDS.map((w) => {
                      const isSelected = selectedWard === w.name;
                      return (
                        <button
                          key={w.id}
                          type="button"
                          onClick={() => handleWardSelect(w.name)}
                          className={`relative flex flex-col justify-between p-4 rounded-xl border transition-all text-left ${
                            isSelected
                              ? 'bg-[#E6F4F6] border-[#007B8A] ring-1 ring-[#007B8A] shadow-xs'
                              : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                          }`}
                        >
                          <div>
                            <div className="flex justify-between items-center w-full mb-2">
                              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-md ${
                                isSelected ? 'bg-[#007B8A] text-white' : 'bg-slate-100 text-slate-700'
                              }`}>
                                {w.name}
                              </span>
                              <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                isSelected ? 'bg-[#007B8A] border-[#007B8A]' : 'bg-white border-slate-300'
                              }`}>
                                {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                              </div>
                            </div>

                            <p className="text-xs font-semibold text-slate-800 leading-snug">
                              {w.services}
                            </p>
                          </div>

                          <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                            <span>{w.equipment.length} equipment items</span>
                            <span className="font-medium text-[#007B8A]">Auto-loaded</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Starting Hour & Wave Selector */}
              {selectedRole && (
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-[#1b669d]" />
                    <div>
                      <h3 className="text-sm font-bold text-slate-800">Starting Hour & Wave</h3>
                      <p className="text-slate-500 text-xs">Select start time to allocate shift wave</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {WAVE_OPTIONS.map((opt) => {
                      const isSelected = startHour === opt.hour;
                      return (
                        <button
                          key={opt.hour}
                          type="button"
                          onClick={() => setStartHour(opt.hour)}
                          className={`p-3.5 rounded-xl border text-left transition-all ${
                            isSelected
                              ? 'bg-[#1b669d]/10 border-[#1b669d] text-[#1b669d] font-bold shadow-xs'
                              : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                          }`}
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                              isSelected ? 'bg-[#1b669d] text-white' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {opt.wave}
                            </span>
                          </div>
                          <p className="text-base font-bold text-slate-800">{opt.label}</p>
                          <p className="text-[11px] text-slate-500">{opt.schedule}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Equipment Checklist */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
                <div className="flex items-center gap-2">
                  <Monitor size={16} className="text-[#1b669d]" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">Equipment Verification</h3>
                    <p className="text-slate-500 text-xs">Verify status of {equipment.length} station items</p>
                  </div>
                </div>

                <EquipmentChecklist items={equipment} onChange={handleEquipmentChange} />
              </div>

              {/* Submit Action */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 bg-[#007B8A] hover:bg-[#005D68] text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors shadow-xs"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Activating Shift...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      <span>Activate Shift Session</span>
                    </>
                  )}
                </button>
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
          <div className="mb-8 flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
            <div className="w-12 h-12 rounded-xl bg-[#1b669d]/10 flex items-center justify-center text-[#1b669d]">
              <Lock size={24} />
            </div>
            <div>
              <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Authorized Access Only</p>
              <p className="text-sm font-bold text-slate-700">Please confirm your account password to activate this shift.</p>
            </div>
          </div>

          <form onSubmit={handleFinalSubmit} className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 ml-1">Account Password</label>
              <input
                type="password"
                autoFocus
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (activationError) setActivationError('');
                }}
                placeholder="••••••••••••"
                className={`w-full bg-slate-50 border-2 rounded-2xl p-6 text-xl font-black outline-none transition-all placeholder:text-slate-200 ${
                  activationError ? 'border-rose-500 focus:border-rose-600' : 'border-slate-100 focus:border-[#1b669d]'
                }`}
              />
              {activationError && (
                <p className="text-rose-500 text-[11px] font-bold tracking-wide mt-2 ml-1">
                  {activationError}
                </p>
              )}
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
        {showSuccess && createPortal(
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
          </div>, document.body
        )}
      </AnimatePresence>
    </div>
  );
}
