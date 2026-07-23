import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, X, ChevronDown, Pencil, Trash2, Calendar,
  TrendingUp, Package, DollarSign, ClipboardList, Clock,
  BarChart3, AlertCircle, CheckCircle2, Filter, Download,
  Loader2, RefreshCw, Stethoscope, ChevronLeft, ChevronRight,
  CalendarDays, Building2, Wrench, Coins, UserCheck, Truck,
  CheckCircle, Layers, ArrowRight, FileText, Sparkles
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import ExcelJS from 'exceljs/dist/exceljs.min.js';
import { useAuth } from '../../context/AuthContext';
import {
  listDentalCases, getDentalStats, createDentalCase,
  updateDentalCase, deleteDentalCase,
} from '../../api/dental';
import PatientAutocomplete from '../../components/PatientAutocomplete';
import DentalLabOdontogram from '../../components/dental/DentalLabOdontogram';
import LuminaDentalAiPrescriber from '../../components/dental/LuminaDentalAiPrescriber';

// ─── Constants ────────────────────────────────────────────────────────────────
const WORK_TYPES = ['Acrylic Work', 'Metal & Ceramic', 'CAD-CAM', 'Other'];

const WORK_TYPE_COLORS = {
  'Acrylic Work':   { bg: 'bg-sky-50',    text: 'text-sky-700',    border: 'border-sky-200',    dot: 'bg-sky-500'    },
  'Metal & Ceramic':{ bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200',  dot: 'bg-amber-500'  },
  'CAD-CAM':        { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', dot: 'bg-violet-500' },
  'Other':          { bg: 'bg-slate-50',  text: 'text-slate-600',  border: 'border-slate-200',  dot: 'bg-slate-400'  },
};

const MANUFACTURING_STAGES = [
  'Received',
  'Wax-Up / Framework',
  'Casting / Milling',
  'Porcelain / Finishing',
  'Completed',
  'Delivered',
];

const STAGE_CONFIG = {
  'Received':             { label: 'Received',             color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', step: 1 },
  'Wax-Up / Framework':   { label: 'Wax-Up / Framework',   color: 'text-blue-700',  bg: 'bg-blue-50',  border: 'border-blue-200',  step: 2 },
  'Casting / Milling':    { label: 'Casting / Milling',    color: 'text-purple-700',bg: 'bg-purple-50',border: 'border-purple-200',step: 3 },
  'Porcelain / Finishing':{ label: 'Porcelain / Finishing',color: 'text-indigo-700',bg: 'bg-indigo-50',border: 'border-indigo-200',step: 4 },
  'Completed':            { label: 'Completed (Ready)',    color: 'text-emerald-700',bg: 'bg-emerald-50',border: 'border-emerald-200',step: 5 },
  'Delivered':            { label: 'Delivered',            color: 'text-slate-700', bg: 'bg-slate-100', border: 'border-slate-300', step: 6 },
};

const CLINICS = [
  'Legacy Clinics Kacyiru', 'Legacy Clinics Remera',
  'Legacy Clinics Nyamirambo', 'Legacy Clinics Kimironko',
  'External Referral', 'Other',
];

const PERIODS = [
  { key: 'daily',   label: 'Today' },
  { key: 'weekly',  label: 'This Week' },
  { key: 'monthly', label: 'This Month' },
];

const EMPTY_FORM = {
  received_date: '', required_date: '', work_command_origin: '',
  clinic_of_origin: '', clinician_name: '', patient_id: '',
  work_done: '', work_done_other: '', technologist: '',
  units_quantity: 1, cost_per_first_unit: '', cost_per_additional_unit: '',
  total_cost: '', status: 'Received', reported_by: '',
};

// ─── Sub-components ───────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, sub, colorClass = 'text-rose-500', bgClass = 'bg-rose-50' }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex items-center gap-4"
  >
    <div className={`w-12 h-12 rounded-xl ${bgClass} flex items-center justify-center flex-shrink-0`}>
      <Icon size={22} className={colorClass} />
    </div>
    <div className="min-w-0">
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide truncate">{label}</p>
      <p className="text-2xl font-black text-slate-800 leading-tight">{value}</p>
      {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  </motion.div>
);

const WorkTypeBadge = ({ type }) => {
  const c = WORK_TYPE_COLORS[type] || WORK_TYPE_COLORS['Other'];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${c.bg} ${c.text} ${c.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {type}
    </span>
  );
};

const StageBadge = ({ status }) => {
  const st = STAGE_CONFIG[status] || STAGE_CONFIG['Received'];
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase border ${st.bg} ${st.color} ${st.border}`}>
      <span>Step {st.step}/6:</span>
      <span>{st.label}</span>
    </span>
  );
};

// ─── Form Modal ───────────────────────────────────────────────────────────────
const CaseFormModal = ({ isOpen, onClose, onSave, editCase, currentUser }) => {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [activeModalTab, setActiveModalTab] = useState('info'); // 'info' | 'odontogram'
  const [odontogramMap, setOdontogramMap] = useState({});

  useEffect(() => {
    if (editCase) {
      let parsedOdontogram = {};
      try {
        parsedOdontogram = typeof editCase.odontogram_data === 'string' ? JSON.parse(editCase.odontogram_data) : (editCase.odontogram_data || {});
      } catch (e) {}

      setOdontogramMap(parsedOdontogram);
      setForm({
        received_date: editCase.received_date?.slice(0, 10) || '',
        required_date: editCase.required_date?.slice(0, 10) || '',
        work_command_origin: editCase.work_command_origin || '',
        clinic_of_origin: editCase.clinic_of_origin || '',
        clinician_name: editCase.clinician_name || '',
        patient_id: editCase.patient_id || '',
        work_done: editCase.work_done || '',
        work_done_other: editCase.work_done_other || '',
        technologist: editCase.technologist || '',
        units_quantity: editCase.units_quantity || 1,
        cost_per_first_unit: editCase.cost_per_first_unit ?? '',
        cost_per_additional_unit: editCase.cost_per_additional_unit ?? '',
        total_cost: editCase.total_cost ?? '',
        status: editCase.status || 'Received',
        reported_by: editCase.reported_by || currentUser?.fullName || currentUser?.full_name || currentUser?.name || '',
      });
    } else {
      setOdontogramMap({});
      setForm({
        ...EMPTY_FORM,
        received_date: format(new Date(), 'yyyy-MM-dd'),
        reported_by: currentUser?.fullName || currentUser?.full_name || currentUser?.name || '',
      });
    }
    setActiveModalTab('info');
    setErrors({});
  }, [editCase, isOpen, currentUser]);

  const set = (k) => (e) => {
    const v = e.target.value;
    setForm(f => ({ ...f, [k]: v }));

    if (['units_quantity', 'cost_per_first_unit', 'cost_per_additional_unit'].includes(k)) {
      setForm(f => {
        const updated = { ...f, [k]: v };
        const qty = Number(updated.units_quantity) || 0;
        const first = Number(updated.cost_per_first_unit) || 0;
        const additional = Number(updated.cost_per_additional_unit) || 0;
        const total = qty <= 1 ? first : first + (additional * (qty - 1));
        return { ...updated, total_cost: total > 0 ? total.toFixed(2) : '' };
      });
    }
  };

  const validate = () => {
    const e = {};
    if (!form.received_date) e.received_date = 'Required';
    if (!form.required_date) e.required_date = 'Required';
    if (!form.work_done)     e.work_done = 'Required';
    if (form.work_done === 'Other' && !form.work_done_other) e.work_done_other = 'Please specify';
    if (!form.units_quantity || Number(form.units_quantity) < 1) e.units_quantity = 'Min 1';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        odontogram_data: odontogramMap
      };
      await onSave(payload);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const Field = ({ label, name, type = 'text', required, children, hint }) => (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      {children || (
        <input
          type={type}
          value={form[name]}
          onChange={set(name)}
          className={`w-full px-3 py-2 text-sm rounded-xl border ${errors[name] ? 'border-rose-400 bg-rose-50' : 'border-slate-200 bg-white'} focus:outline-none focus:ring-2 focus:ring-rose-300 transition`}
        />
      )}
      {hint && <p className="text-[10px] text-slate-400 mt-0.5">{hint}</p>}
      {errors[name] && <p className="text-[11px] text-rose-500 mt-0.5">{errors[name]}</p>}
    </div>
  );

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.94, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.94, opacity: 0 }}
          transition={{ type: 'spring', damping: 22 }}
          className={`bg-white rounded-3xl shadow-2xl w-full transition-all duration-300 max-h-[90vh] flex flex-col ${
            activeModalTab === 'odontogram' ? 'max-w-4xl' : 'max-w-2xl'
          }`}
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 border-b border-slate-100 gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-rose-50 rounded-xl flex items-center justify-center">
                <ClipboardList size={18} className="text-rose-500" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-800 m-0">
                  {editCase ? 'Edit Prosthetics Case' : 'Log New Prosthetics Case'}
                </h2>
                <p className="text-[11px] text-slate-400 m-0">Dental Lab Work Order &amp; Fabrication Stage</p>
              </div>
            </div>

            {/* Modal Tabs */}
            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl border border-slate-200">
              <button
                type="button"
                onClick={() => setActiveModalTab('info')}
                className={`px-3 py-1.5 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
                  activeModalTab === 'info' ? 'bg-white text-rose-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Case Specifications
              </button>
              <button
                type="button"
                onClick={() => setActiveModalTab('odontogram')}
                className={`px-3 py-1.5 text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeModalTab === 'odontogram' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Wrench size={13} />
                <span>FDI Odontogram</span>
                {Object.keys(odontogramMap).length > 0 && (
                  <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[9px] font-black flex items-center justify-center">
                    {Object.keys(odontogramMap).length}
                  </span>
                )}
              </button>
            </div>

            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition text-slate-400">
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
            {activeModalTab === 'odontogram' ? (
              <DentalLabOdontogram
                odontogramData={odontogramMap}
                onChange={setOdontogramMap}
                patientName={form.patient_id}
              />
            ) : (
              <React.Fragment>
                {/* Section: Dates */}
            <div>
              <p className="flex items-center gap-1.5 text-[10px] font-black text-rose-400 uppercase tracking-widest mb-3">
                <CalendarDays size={12} /> Dates &amp; Status Stage
              </p>
              <div className="grid grid-cols-3 gap-4">
                <Field label="Received Date" name="received_date" type="date" required />
                <Field label="Target Delivery Date" name="required_date" type="date" required />
                <Field label="Manufacturing Stage" name="status">
                  <select
                    value={form.status}
                    onChange={set('status')}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 transition font-medium"
                  >
                    {MANUFACTURING_STAGES.map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </Field>
              </div>
            </div>

            {/* Section: Origin */}
            <div>
              <p className="flex items-center gap-1.5 text-[10px] font-black text-rose-400 uppercase tracking-widest mb-3">
                <Building2 size={12} /> Work Origin &amp; Patient
              </p>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Work Command Origin" name="work_command_origin">
                  <input
                    type="text"
                    placeholder="e.g. Internal, External, Dr Request…"
                    value={form.work_command_origin}
                    onChange={set('work_command_origin')}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-300 transition"
                  />
                </Field>
                <Field label="Clinic of Origin" name="clinic_of_origin">
                  <input
                    type="text"
                    placeholder="e.g. Legacy Dental Clinic, Polyclinic, External Clinic…"
                    value={form.clinic_of_origin}
                    onChange={set('clinic_of_origin')}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-300 transition"
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <Field label="Clinician Name" name="clinician_name">
                  <input
                    type="text"
                    placeholder="Referring clinician…"
                    value={form.clinician_name}
                    onChange={set('clinician_name')}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-300 transition"
                  />
                </Field>
                <Field label="Patient ID / Search (Sukraa)" name="patient_id">
                  <PatientAutocomplete
                    value={form.patient_id}
                    onChange={(val) => setForm(prev => ({ ...prev, patient_id: val }))}
                    onPatientSelect={(patient) => {
                      setForm(prev => ({
                        ...prev,
                        patient_id: patient.pid || prev.patient_id,
                      }));
                      toast.success(`Selected Patient: ${patient.full_name} (PID: ${patient.pid})`);
                    }}
                    placeholder="Search patient name, PID or phone..."
                    inputStyle={{
                      width: '100%',
                      padding: '8px 12px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      fontSize: '0.875rem',
                      outline: 'none'
                    }}
                  />
                </Field>
              </div>
            </div>

            {/* Section: Work Done */}
            <div>
              <p className="flex items-center gap-1.5 text-[10px] font-black text-rose-400 uppercase tracking-widest mb-3">
                <Wrench size={12} /> Prosthetics Work Details
              </p>
              <Field label="Work Done / Prosthesis Type" name="work_done" required>
                <div className="relative">
                  <select
                    value={form.work_done}
                    onChange={set('work_done')}
                    className={`w-full px-3 py-2 text-sm rounded-xl border appearance-none bg-white pr-9 ${
                      errors.work_done ? 'border-rose-400 bg-rose-50' : 'border-slate-200'
                    } focus:outline-none focus:ring-2 focus:ring-rose-300 transition`}
                  >
                    <option value="">— Select work type —</option>
                    {WORK_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </Field>

              {form.work_done === 'Other' && (
                <div className="mt-3">
                  <Field label="Specify Work Done" name="work_done_other" required>
                    <input
                      type="text"
                      placeholder="Describe prosthesis specification…"
                      value={form.work_done_other}
                      onChange={set('work_done_other')}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-300 transition"
                    />
                  </Field>
                </div>
              )}

              <div className="mt-4">
                <Field label="Technologist / Operator" name="technologist">
                  <input
                    type="text"
                    placeholder="Dental technologist name…"
                    value={form.technologist}
                    onChange={set('technologist')}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-300 transition"
                  />
                </Field>
              </div>
            </div>

            {/* Section: Costing */}
            <div>
              <p className="flex items-center gap-1.5 text-[10px] font-black text-rose-400 uppercase tracking-widest mb-3">
                <Coins size={12} /> Units &amp; Costing
              </p>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Units Quantity" name="units_quantity" required>
                  <input
                    type="number"
                    min="1"
                    value={form.units_quantity}
                    onChange={set('units_quantity')}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-300 transition"
                  />
                </Field>
                <Field label="Cost per 1st Unit (RWF)" name="cost_per_first_unit">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.cost_per_first_unit}
                    onChange={set('cost_per_first_unit')}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-300 transition"
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <Field label="Cost per Add. Unit (RWF)" name="cost_per_additional_unit">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.cost_per_additional_unit}
                    onChange={set('cost_per_additional_unit')}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-300 transition"
                  />
                </Field>
                <Field label="Total Cost (RWF)" name="total_cost">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.total_cost}
                    onChange={set('total_cost')}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-rose-200 bg-rose-50 font-semibold focus:outline-none focus:ring-2 focus:ring-rose-300 transition"
                  />
                </Field>
              </div>
            </div>

            {/* Section: Reporter */}
            <div>
              <p className="flex items-center gap-1.5 text-[10px] font-black text-rose-400 uppercase tracking-widest mb-3">
                <UserCheck size={12} /> Reporting
              </p>
              <Field label="Reported By" name="reported_by">
                <input
                  type="text"
                  value={form.reported_by}
                  onChange={set('reported_by')}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-300 transition"
                />
              </Field>
            </div>
              </React.Fragment>
            )}
          </form>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded-xl transition disabled:opacity-60 shadow-sm shadow-rose-200 cursor-pointer"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              {editCase ? 'Update Case' : 'Log Case'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// ─── Delivery Modal ────────────────────────────────────────────────────────────
const DeliveryModal = ({ isOpen, onClose, onSave, caseItem }) => {
  const [deliveredTo, setDeliveredTo] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (caseItem) {
      setDeliveredTo(caseItem.delivered_to || caseItem.clinician_name || '');
      setDeliveryNotes(caseItem.delivery_notes || '');
    }
  }, [caseItem, isOpen]);

  if (!isOpen || !caseItem) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!deliveredTo.trim()) {
      return toast.error('Enter clinician or reception name receiving the prosthesis.');
    }
    setSaving(true);
    try {
      await onSave({
        status: 'Delivered',
        delivered_to: deliveredTo.trim(),
        delivery_notes: deliveryNotes.trim() || undefined,
        delivered_at: new Date().toISOString(),
      });
      toast.success(`Case ${caseItem.case_ref} marked as Delivered.`);
      onClose();
    } catch {
      toast.error('Failed to log prosthesis delivery.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-3xl p-6 shadow-2xl max-w-md w-full space-y-5"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                <Truck size={20} />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-800 text-base m-0">Prosthesis Delivery Log</h3>
                <p className="text-xs text-slate-400 font-mono m-0 mt-0.5">Ref: {caseItem.case_ref}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400">
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Delivered To (Clinician / Receptionist) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={deliveredTo}
                onChange={e => setDeliveredTo(e.target.value)}
                placeholder="Name of clinician or desk receiving delivery…"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Delivery &amp; Shade Verification Notes
              </label>
              <textarea
                value={deliveryNotes}
                onChange={e => setDeliveryNotes(e.target.value)}
                rows={3}
                placeholder="e.g. Delivered with shade guide match verification, fit verified, patient appointment scheduled for tomorrow."
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-300"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition cursor-pointer"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Truck size={16} />}
                Confirm Delivery
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────
const DeleteConfirm = ({ isOpen, onClose, onConfirm, caseRef }) => {
  if (!isOpen) return null;
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-2xl p-6 shadow-xl max-w-sm w-full"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
              <AlertCircle size={20} className="text-red-500" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Delete Case</h3>
              <p className="text-xs text-slate-400">{caseRef}</p>
            </div>
          </div>
          <p className="text-sm text-slate-600 mb-5">This action cannot be undone. Are you sure you want to delete this case log?</p>
          <div className="flex gap-2 justify-end">
            <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition">Cancel</button>
            <button onClick={onConfirm} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl transition">Delete</button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const DentalCasesLog = () => {
  const { user } = useAuth();
  const [period, setPeriod] = useState('monthly');
  const [cases, setCases] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [workFilter, setWorkFilter] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  
  const [showForm, setShowForm] = useState(false);
  const [showAiPrescriber, setShowAiPrescriber] = useState(false);
  const [editCase, setEditCase] = useState(null);
  const [deliveryTarget, setDeliveryTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  const canEdit = ['admin', 'deputy_coo', 'dental_lab_manager', 'dental_hod'].includes(user?.role);

  const fetchCases = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await listDentalCases({ period });
      setCases(data.data || []);
    } catch {
      toast.error('Failed to load cases.');
    } finally {
      setLoading(false);
    }
  }, [period]);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const { data } = await getDentalStats(period);
      setStats(data.data);
    } catch {
      /* silently fail stats */
    } finally {
      setStatsLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchCases();
    fetchStats();
    setPage(1);
  }, [fetchCases, fetchStats]);

  const handleSave = async (formData) => {
    try {
      if (editCase) {
        await updateDentalCase(editCase.id, formData);
        toast.success('Case updated successfully.');
      } else {
        await createDentalCase(formData);
        toast.success('Case logged successfully.');
      }
      setShowForm(false);
      setEditCase(null);
      fetchCases();
      fetchStats();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save case.');
      throw err;
    }
  };

  const handleUpdateStage = async (caseId, newStatus) => {
    if (newStatus === 'Delivered') {
      const target = cases.find(c => c.id === caseId);
      if (target) setDeliveryTarget(target);
      return;
    }
    try {
      await updateDentalCase(caseId, { status: newStatus });
      toast.success(`Case stage updated to "${newStatus}".`);
      fetchCases();
      fetchStats();
    } catch {
      toast.error('Failed to update stage.');
    }
  };

  const handleConfirmDelivery = async (deliveryPayload) => {
    if (!deliveryTarget) return;
    await updateDentalCase(deliveryTarget.id, deliveryPayload);
    fetchCases();
    fetchStats();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDentalCase(deleteTarget.id);
      toast.success(`Case ${deleteTarget.case_ref} deleted.`);
      setDeleteTarget(null);
      fetchCases();
      fetchStats();
    } catch {
      toast.error('Failed to delete case.');
    }
  };

  const filtered = useMemo(() => {
    let result = cases;
    if (workFilter) result = result.filter(c => c.work_done === workFilter);
    if (stageFilter) {
      if (stageFilter === 'In Production') {
        result = result.filter(c => c.status !== 'Delivered' && c.status !== 'Completed');
      } else {
        result = result.filter(c => c.status === stageFilter);
      }
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(c =>
        [c.case_ref, c.clinician_name, c.patient_id, c.clinic_of_origin, c.technologist, c.reported_by, c.delivered_to]
          .some(v => v && v.toLowerCase().includes(q))
      );
    }
    return result;
  }, [cases, workFilter, stageFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const formatCurrency = (v) => v != null ? `RWF ${Number(v).toLocaleString()}` : '—';
  const periodLabel = PERIODS.find(p => p.key === period)?.label || '';

  const handleExportXlsx = async () => {
    if (filtered.length === 0) {
      toast.error('No prosthetics cases data to export.');
      return;
    }

    try {
      toast.loading("Generating prosthetics cases Excel workbook...", { id: 'excel-cases-toast' });
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Prosthetics Cases Log');
      sheet.views = [{ showGridLines: true }];

      // Column widths
      sheet.getColumn(1).width = 18;  // Ref #
      sheet.getColumn(2).width = 16;  // Received Date
      sheet.getColumn(3).width = 18;  // Target Delivery Date
      sheet.getColumn(4).width = 24;  // Clinic of Origin
      sheet.getColumn(5).width = 20;  // Work Command Origin
      sheet.getColumn(6).width = 24;  // Clinician Name
      sheet.getColumn(7).width = 16;  // Patient ID
      sheet.getColumn(8).width = 20;  // Work Done
      sheet.getColumn(9).width = 24;  // Specification
      sheet.getColumn(10).width = 20; // Technologist
      sheet.getColumn(11).width = 24; // Manufacturing Stage
      sheet.getColumn(12).width = 12; // Units
      sheet.getColumn(13).width = 18; // Cost 1st Unit
      sheet.getColumn(14).width = 18; // Cost Add. Unit
      sheet.getColumn(15).width = 20; // Total Cost
      sheet.getColumn(16).width = 16; // Delivery Status
      sheet.getColumn(17).width = 24; // Delivered To
      sheet.getColumn(18).width = 22; // Delivered Date
      sheet.getColumn(19).width = 35; // Delivery Notes
      sheet.getColumn(20).width = 20; // Reported By

      // Title Banner Row 1
      const titleCell = sheet.getCell('A1');
      titleCell.value = 'LEGACY CLINICS & DIAGNOSTICS';
      sheet.mergeCells('A1:T1');
      titleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '881337' } }; // Rose-900
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      sheet.getRow(1).height = 36;

      // Subtitle Banner Row 2
      const subCell = sheet.getCell('A2');
      subCell.value = 'PROSTHETICS CASES MANUFACTURING & DELIVERY REPORT';
      sheet.mergeCells('A2:T2');
      subCell.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FFFFFF' } };
      subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'BE123C' } }; // Rose-700
      subCell.alignment = { horizontal: 'center', vertical: 'middle' };
      sheet.getRow(2).height = 26;

      // Metadata Row 3
      const metaCell = sheet.getCell('A3');
      const totalUnitsSum = filtered.reduce((acc, c) => acc + (Number(c.units_quantity) || 0), 0);
      const totalRevenueSum = filtered.reduce((acc, c) => acc + (Number(c.total_cost) || 0), 0);
      metaCell.value = `Export Date: ${new Date().toLocaleString()} | Period: ${periodLabel} | Total Cases: ${filtered.length} | Total Units: ${totalUnitsSum} | Total Value: RWF ${totalRevenueSum.toLocaleString()}`;
      sheet.mergeCells('A3:T3');
      metaCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: '475569' } };
      metaCell.alignment = { horizontal: 'center', vertical: 'middle' };
      sheet.getRow(3).height = 20;

      sheet.getRow(4).height = 12; // Spacer

      // Table Header Row 5
      const headers = [
        'Case Ref #', 'Received Date', 'Target Delivery', 'Clinic of Origin', 'Work Origin',
        'Clinician Name', 'Patient ID', 'Work Done', 'Specification', 'Technologist',
        'Manufacturing Stage', 'Units Qty', '1st Unit Cost', 'Add. Unit Cost', 'Total Cost (RWF)',
        'Delivery Status', 'Delivered To', 'Delivered Date & Time', 'Delivery Notes', 'Reported By'
      ];
      const headerRow = sheet.getRow(5);
      headerRow.height = 28;
      headers.forEach((h, colIdx) => {
        const cell = headerRow.getCell(colIdx + 1);
        cell.value = h;
        cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '9F1239' } }; // Rose-800
        cell.alignment = {
          horizontal: [12, 13, 14, 15].includes(colIdx + 1) ? 'right' : 'left',
          vertical: 'middle'
        };
        cell.border = {
          top: { style: 'thin', color: { argb: '9F1239' } },
          bottom: { style: 'medium', color: { argb: '881337' } }
        };
      });

      // Data Rows
      let currentRow = 6;
      filtered.forEach(c => {
        const r = sheet.getRow(currentRow);
        r.height = 22;

        r.getCell(1).value = c.case_ref || '—';
        r.getCell(2).value = c.received_date ? c.received_date.slice(0, 10) : '—';
        r.getCell(3).value = c.required_date ? c.required_date.slice(0, 10) : '—';
        r.getCell(4).value = c.clinic_of_origin || '—';
        r.getCell(5).value = c.work_command_origin || '—';
        r.getCell(6).value = c.clinician_name || '—';
        r.getCell(7).value = c.patient_id || '—';
        r.getCell(8).value = c.work_done || '—';
        r.getCell(9).value = c.work_done_other || '—';
        r.getCell(10).value = c.technologist || '—';
        r.getCell(11).value = c.status || 'Received';
        r.getCell(12).value = Number(c.units_quantity || 1);
        r.getCell(13).value = c.cost_per_first_unit != null ? Number(c.cost_per_first_unit) : 0;
        r.getCell(14).value = c.cost_per_additional_unit != null ? Number(c.cost_per_additional_unit) : 0;
        r.getCell(15).value = c.total_cost != null ? Number(c.total_cost) : 0;
        r.getCell(16).value = c.status === 'Delivered' ? 'Delivered' : (c.status === 'Completed' ? 'Ready' : 'In Production');
        r.getCell(17).value = c.delivered_to || '—';
        r.getCell(18).value = c.delivered_at ? new Date(c.delivered_at).toLocaleString() : '—';
        r.getCell(19).value = c.delivery_notes || '—';
        r.getCell(20).value = c.reported_by || c.reported_by_name || '—';

        for (let col = 1; col <= 20; col++) {
          const cell = r.getCell(col);
          cell.font = { name: 'Calibri', size: 10 };
          cell.border = { bottom: { style: 'thin', color: { argb: 'E2E8F0' } } };

          if ([12, 13, 14, 15].includes(col)) {
            cell.alignment = { horizontal: 'right', vertical: 'middle' };
            if (col >= 13) cell.numFmt = '#,##0';
            if (col === 15) cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: '9F1239' } };
          } else {
            cell.alignment = { horizontal: 'left', vertical: 'middle' };
          }
        }

        const stageCell = r.getCell(11);
        if (c.status === 'Delivered') {
          stageCell.font = { color: { argb: '334155' }, bold: true };
        } else if (c.status === 'Completed') {
          stageCell.font = { color: { argb: '047857' }, bold: true };
        } else if (c.status === 'Received') {
          stageCell.font = { color: { argb: 'B45309' }, bold: true };
        } else {
          stageCell.font = { color: { argb: '1D4ED8' }, bold: true };
        }

        currentRow++;
      });

      // Total Row
      const totalRow = sheet.getRow(currentRow);
      totalRow.height = 26;
      totalRow.getCell(1).value = 'TOTAL SUMMARY';
      sheet.mergeCells(`A${currentRow}:K${currentRow}`);

      totalRow.getCell(12).value = { formula: `=SUM(L6:L${currentRow - 1})` };
      totalRow.getCell(15).value = { formula: `=SUM(O6:O${currentRow - 1})` };

      for (let col = 1; col <= 20; col++) {
        const cell = totalRow.getCell(col);
        cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: '881337' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F2' } };
        cell.border = {
          top: { style: 'thin', color: { argb: 'BE123C' } },
          bottom: { style: 'double', color: { argb: '881337' } }
        };
        if ([12, 13, 14, 15].includes(col)) {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          if (col >= 13) cell.numFmt = '#,##0';
        }
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      const filename = `Prosthetics_Cases_Report_${new Date().toISOString().split('T')[0]}`;
      link.download = `${filename}.xlsx`;
      link.click();

      toast.success("Excel report exported successfully!", { id: 'excel-cases-toast' });
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate Excel report.", { id: 'excel-cases-toast' });
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Stethoscope size={20} className="text-rose-500" /> Prosthetics Cases &amp; Delivery Log
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Dental lab work orders, manufacturing stage pipeline &amp; delivery tracking — {periodLabel}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { fetchCases(); fetchStats(); }}
            className="p-2.5 text-slate-500 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>

          <button
            onClick={() => setShowAiPrescriber(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-sm font-bold rounded-xl transition shadow-sm shadow-indigo-200 cursor-pointer"
          >
            <Sparkles size={16} /> Lumina AI Prescriber
          </button>

          <button
            onClick={handleExportXlsx}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition shadow-sm cursor-pointer"
          >
            <Download size={16} /> Export Excel
          </button>

          {canEdit && (
            <button
              onClick={() => { setEditCase(null); setShowForm(true); }}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded-xl transition shadow-sm shadow-rose-200 cursor-pointer"
            >
              <Plus size={16} /> Log New Case
            </button>
          )}
        </div>
      </div>

      {/* Period & Pipeline Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-2xl w-fit">
          {PERIODS.map(p => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
                period === p.key
                  ? 'bg-white text-rose-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Manufacturing Stage Quick Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {[
            { label: 'All Cases', value: '' },
            { label: 'In Production', value: 'In Production' },
            { label: 'Completed (Ready)', value: 'Completed' },
            { label: 'Delivered', value: 'Delivered' }
          ].map(st => (
            <button
              key={st.value}
              onClick={() => { setStageFilter(st.value); setPage(1); }}
              className={`px-3 py-1.5 text-xs font-extrabold rounded-xl border transition cursor-pointer ${
                stageFilter === st.value
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Row */}
      {statsLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-slate-100 rounded-2xl h-24 animate-pulse" />
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={ClipboardList}
            label="Total Cases"
            value={stats.totals?.total_cases ?? 0}
            sub={`${periodLabel}`}
            colorClass="text-rose-500"
            bgClass="bg-rose-50"
          />
          <StatCard
            icon={Package}
            label="Total Units"
            value={stats.totals?.total_units ?? 0}
            sub="prosthetics produced"
            colorClass="text-violet-500"
            bgClass="bg-violet-50"
          />
          <StatCard
            icon={DollarSign}
            label="Total Revenue"
            value={`RWF ${Number(stats.totals?.total_revenue ?? 0).toLocaleString()}`}
            sub="lab work billing"
            colorClass="text-emerald-500"
            bgClass="bg-emerald-50"
          />
          <StatCard
            icon={Truck}
            label="Delivered Cases"
            value={cases.filter(c => c.status === 'Delivered').length}
            sub="delivered to clinicians"
            colorClass="text-indigo-500"
            bgClass="bg-indigo-50"
          />
        </div>
      ) : null}

      {/* Table Section */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 border-b border-slate-100">
          <div className="relative flex-1 max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by patient, clinician, ref, delivered to…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-200"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X size={14} />
              </button>
            )}
          </div>

          <div className="relative">
            <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <select
              value={workFilter}
              onChange={e => { setWorkFilter(e.target.value); setPage(1); }}
              className="pl-8 pr-8 py-2 text-sm border border-slate-200 rounded-xl bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-rose-200"
            >
              <option value="">All Work Types</option>
              {WORK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          <span className="text-xs text-slate-400 ml-auto">
            {filtered.length} case{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 size={28} className="text-rose-400 animate-spin" />
            <p className="text-sm text-slate-400">Loading prosthetics cases…</p>
          </div>
        ) : paginated.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <ClipboardList size={40} className="text-slate-200" />
            <p className="text-base font-semibold text-slate-400">No cases found</p>
            <p className="text-sm text-slate-300">
              {search || workFilter || stageFilter ? 'Try adjusting your filters.' : `No prosthetics cases logged for ${periodLabel.toLowerCase()}.`}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wide border-b border-slate-100">
                  <th className="px-4 py-3">Ref #</th>
                  <th className="px-4 py-3">Dates</th>
                  <th className="px-4 py-3">Clinician &amp; Patient</th>
                  <th className="px-4 py-3">Prosthesis Work</th>
                  <th className="px-4 py-3">Manufacturing Stage</th>
                  <th className="px-4 py-3 text-right">Units / Cost</th>
                  <th className="px-4 py-3">Delivery Status</th>
                  {canEdit && <th className="px-4 py-3 text-center">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold">
                {paginated.map((c) => {
                  const currentSt = c.status || 'Received';
                  const stConf = STAGE_CONFIG[currentSt] || STAGE_CONFIG['Received'];

                  return (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-4 py-3">
                        <span className="font-mono text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-lg font-bold">
                          {c.case_ref}
                        </span>
                        <span className="block text-[10px] text-slate-400 font-normal mt-0.5">{c.clinic_of_origin || '—'}</span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="space-y-0.5">
                          <p className="m-0 text-slate-700 font-medium">Rec: {c.received_date ? format(parseISO(c.received_date), 'dd MMM yyyy') : '—'}</p>
                          <p className={`m-0 font-bold ${
                            new Date(c.required_date) < new Date() && c.status !== 'Delivered'
                              ? 'text-rose-600' : 'text-slate-500'
                          }`}>
                            Target: {c.required_date ? format(parseISO(c.required_date), 'dd MMM yyyy') : '—'}
                          </p>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <p className="m-0 text-slate-900 font-bold">{c.clinician_name || 'Dr. Dental'}</p>
                        {c.patient_id && (
                          <span className="inline-block mt-0.5 font-mono text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.2 rounded">
                            PID: {c.patient_id}
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <WorkTypeBadge type={c.work_done} />
                        {c.technologist && <p className="m-0 text-[10px] text-slate-400 mt-1">Tech: {c.technologist}</p>}
                      </td>

                      {/* Interactive Stage Pipeline */}
                      <td className="px-4 py-3">
                        <div className="space-y-1.5 min-w-[160px]">
                          <div className="flex items-center justify-between">
                            <StageBadge status={currentSt} />
                          </div>
                          {canEdit && (
                            <select
                              value={currentSt}
                              onChange={(e) => handleUpdateStage(c.id, e.target.value)}
                              className="w-full px-2 py-1 text-[11px] font-bold rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-300 cursor-pointer"
                            >
                              {MANUFACTURING_STAGES.map(st => (
                                <option key={st} value={st}>{st}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <p className="m-0 font-black text-slate-800">{formatCurrency(c.total_cost)}</p>
                        <p className="m-0 text-[10px] text-slate-400 font-normal">{c.units_quantity} unit(s)</p>
                      </td>

                      {/* Delivery Info */}
                      <td className="px-4 py-3">
                        {c.status === 'Delivered' ? (
                          <div className="space-y-0.5 bg-emerald-50/80 p-2 rounded-xl border border-emerald-200/80">
                            <p className="m-0 text-emerald-800 font-extrabold text-[11px] flex items-center gap-1">
                              <CheckCircle size={12} className="text-emerald-600 shrink-0" />
                              <span>Delivered to {c.delivered_to || 'Clinic'}</span>
                            </p>
                            {c.delivered_at && (
                              <p className="m-0 text-[10px] text-emerald-600 font-medium">
                                {format(new Date(c.delivered_at), 'dd MMM yyyy, HH:mm')}
                              </p>
                            )}
                            {c.delivery_notes && (
                              <p className="m-0 text-[10px] text-slate-500 italic line-clamp-1 mt-0.5">{c.delivery_notes}</p>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeliveryTarget(c)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-100 text-slate-600 hover:text-emerald-700 rounded-lg text-[10px] font-bold transition flex items-center gap-1 border border-slate-200 cursor-pointer"
                          >
                            <Truck size={12} /> Mark Delivered
                          </button>
                        )}
                      </td>

                      {canEdit && (
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => { setEditCase(c); setShowForm(true); }}
                              className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition"
                              title="Edit Case"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(c)}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                              title="Delete Case"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <p className="text-xs text-slate-400">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40 transition"
              >
                <ChevronLeft size={16} />
              </button>
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i + 1)}
                  className={`w-7 h-7 rounded-lg text-xs font-semibold transition ${
                    page === i + 1 ? 'bg-rose-600 text-white' : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40 transition"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <CaseFormModal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditCase(null); }}
        onSave={handleSave}
        editCase={editCase}
        currentUser={user}
      />

      <DeliveryModal
        isOpen={!!deliveryTarget}
        onClose={() => setDeliveryTarget(null)}
        onSave={handleConfirmDelivery}
        caseItem={deliveryTarget}
      />

      <DeleteConfirm
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        caseRef={deleteTarget?.case_ref}
      />

      <LuminaDentalAiPrescriber
        isOpen={showAiPrescriber}
        onClose={() => setShowAiPrescriber(false)}
      />
    </div>
  );
};

export default DentalCasesLog;
