import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, X, ChevronDown, Pencil, Trash2, Calendar,
  TrendingUp, Package, DollarSign, ClipboardList, Clock,
  BarChart3, AlertCircle, CheckCircle2, Filter, Download,
  Loader2, RefreshCw, Stethoscope, ChevronLeft, ChevronRight,
  CalendarDays, Building2, Wrench, Coins, UserCheck,
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import {
  listDentalCases, getDentalStats, createDentalCase,
  updateDentalCase, deleteDentalCase,
} from '../../api/dental';
import { getPatientByPid } from '../../api/patients';
import PatientAutocomplete from '../../components/PatientAutocomplete';

// ─── Constants ────────────────────────────────────────────────────────────────
const WORK_TYPES = ['Acrylic Work', 'Metal & Ceramic', 'CAD-CAM', 'Other'];

const WORK_TYPE_COLORS = {
  'Acrylic Work':   { bg: 'bg-sky-50',    text: 'text-sky-700',    border: 'border-sky-200',    dot: 'bg-sky-500'    },
  'Metal & Ceramic':{ bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200',  dot: 'bg-amber-500'  },
  'CAD-CAM':        { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', dot: 'bg-violet-500' },
  'Other':          { bg: 'bg-slate-50',  text: 'text-slate-600',  border: 'border-slate-200',  dot: 'bg-slate-400'  },
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
  total_cost: '', reported_by: '',
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

// ─── Form Modal ───────────────────────────────────────────────────────────────
const CaseFormModal = ({ isOpen, onClose, onSave, editCase, currentUser }) => {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (editCase) {
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
        reported_by: editCase.reported_by || '',
      });
    } else {
      setForm({
        ...EMPTY_FORM,
        received_date: format(new Date(), 'yyyy-MM-dd'),
        reported_by: currentUser?.full_name || '',
      });
    }
    setErrors({});
  }, [editCase, isOpen, currentUser]);

  const set = (k) => (e) => {
    const v = e.target.value;
    setForm(f => ({ ...f, [k]: v }));

    // Auto-calculate total cost when units/costs change
    if (['units_quantity', 'cost_per_first_unit', 'cost_per_additional_unit'].includes(k)) {
      setForm(f => {
        const updated = { ...f, [k]: v };
        const qty = Number(updated.units_quantity) || 0;
        const first = Number(updated.cost_per_first_unit) || 0;
        const additional = Number(updated.cost_per_additional_unit) || 0;
        const total = qty <= 1
          ? first
          : first + (additional * (qty - 1));
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
      await onSave(form);
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
          className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-rose-50 rounded-xl flex items-center justify-center">
                <ClipboardList size={18} className="text-rose-500" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-800">
                  {editCase ? 'Edit Prosthetics Case' : 'Log New Prosthetics Case'}
                </h2>
                <p className="text-[11px] text-slate-400">Dental Lab Work Order</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition">
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
            {/* Section: Dates */}
            <div>
              <p className="flex items-center gap-1.5 text-[10px] font-black text-rose-400 uppercase tracking-widest mb-3">
                <CalendarDays size={12} /> Dates
              </p>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Received Date" name="received_date" type="date" required />
                <Field label="Required / Expected Delivery Date" name="required_date" type="date" required />
              </div>
            </div>

            {/* Section: Origin */}
            <div>
              <p className="flex items-center gap-1.5 text-[10px] font-black text-rose-400 uppercase tracking-widest mb-3">
                <Building2 size={12} /> Work Origin
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
                  <select
                    value={form.clinic_of_origin}
                    onChange={set('clinic_of_origin')}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 transition"
                  >
                    <option value="">— Select clinic —</option>
                    {CLINICS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
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
                        clinic_of_origin: prev.clinic_of_origin || 'Legacy Clinics Kacyiru'
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
                <Wrench size={12} /> Prosthetics Work
              </p>
              <Field label="Work Done" name="work_done" required>
                <div className="relative">
                  <select
                    value={form.work_done}
                    onChange={set('work_done')}
                    className={`w-full px-3 py-2 text-sm rounded-xl border appearance-none bg-white pr-9 ${
                      errors.work_done
                        ? 'border-rose-400 bg-rose-50'
                        : 'border-slate-200'
                    } focus:outline-none focus:ring-2 focus:ring-rose-300 transition`}
                  >
                    <option value="">— Select work type —</option>
                    {WORK_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
                {errors.work_done && <p className="text-[11px] text-rose-500 mt-1">{errors.work_done}</p>}
              </Field>

              {form.work_done === 'Other' && (
                <div className="mt-3">
                  <Field label="Specify Work Done" name="work_done_other" required>
                    <input
                      type="text"
                      placeholder="Describe the work…"
                      value={form.work_done_other}
                      onChange={set('work_done_other')}
                      className={`w-full px-3 py-2 text-sm rounded-xl border ${errors.work_done_other ? 'border-rose-400 bg-rose-50' : 'border-slate-200'} focus:outline-none focus:ring-2 focus:ring-rose-300 transition`}
                    />
                    {errors.work_done_other && <p className="text-[11px] text-rose-500 mt-0.5">{errors.work_done_other}</p>}
                  </Field>
                </div>
              )}

              <div className="mt-4">
                <Field label="Technologist" name="technologist">
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
                    className={`w-full px-3 py-2 text-sm rounded-xl border ${errors.units_quantity ? 'border-rose-400 bg-rose-50' : 'border-slate-200'} focus:outline-none focus:ring-2 focus:ring-rose-300 transition`}
                  />
                  {errors.units_quantity && <p className="text-[11px] text-rose-500 mt-0.5">{errors.units_quantity}</p>}
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
                <Field
                  label="Cost per Additional Unit (RWF)"
                  name="cost_per_additional_unit"
                  hint="Applied to units 2 and beyond"
                >
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.cost_per_additional_unit}
                    onChange={set('cost_per_additional_unit')}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-300 transition"
                  />
                </Field>
                <Field label="Total Cost (RWF)" name="total_cost" hint="Auto-calculated or enter manually">
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
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded-xl transition disabled:opacity-60 shadow-sm shadow-rose-200"
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
  const [showForm, setShowForm] = useState(false);
  const [editCase, setEditCase] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  // Check if user can write (Only Dental Lab Manager, Admin, and Deputy COO)
  const canEdit = ['admin', 'deputy_coo', 'dental_lab_manager'].includes(user?.role);

  // ─── Data fetching ──────────────────────────────────────────────────────────
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

  // ─── CRUD handlers ──────────────────────────────────────────────────────────
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

  // ─── Filtered & paginated data ──────────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = cases;
    if (workFilter) result = result.filter(c => c.work_done === workFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(c =>
        [c.case_ref, c.clinician_name, c.patient_id, c.clinic_of_origin, c.technologist, c.reported_by]
          .some(v => v && v.toLowerCase().includes(q))
      );
    }
    return result;
  }, [cases, workFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const formatCurrency = (v) =>
    v != null ? `RWF ${Number(v).toLocaleString()}` : '—';

  const periodLabel = PERIODS.find(p => p.key === period)?.label || '';

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Stethoscope size={20} className="text-rose-500" /> Prosthetics Cases Log
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Dental lab work orders — {periodLabel} view
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { fetchCases(); fetchStats(); }}
            className="p-2.5 text-slate-500 hover:bg-slate-100 rounded-xl transition"
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>
          {canEdit && (
            <button
              onClick={() => { setEditCase(null); setShowForm(true); }}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded-xl transition shadow-sm shadow-rose-200"
            >
              <Plus size={16} /> Log New Case
            </button>
          )}
        </div>
      </div>

      {/* Period Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-2xl w-fit">
        {PERIODS.map(p => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`px-4 py-2 text-sm font-semibold rounded-xl transition ${
              period === p.key
                ? 'bg-white text-rose-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {p.label}
          </button>
        ))}
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
            icon={BarChart3}
            label="Work Types"
            value={stats.byWorkType?.length ?? 0}
            sub="categories active"
            colorClass="text-amber-500"
            bgClass="bg-amber-50"
          />
        </div>
      ) : null}

      {/* Work Type Breakdown */}
      {stats?.byWorkType?.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Work Type Breakdown</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {WORK_TYPES.map(type => {
              const found = stats.byWorkType.find(w => w.work_done === type);
              const c = WORK_TYPE_COLORS[type];
              return (
                <div key={type} className={`p-4 rounded-xl border ${c.bg} ${c.border}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${c.dot}`} />
                    <span className={`text-xs font-bold ${c.text}`}>{type}</span>
                  </div>
                  <p className={`text-2xl font-black ${c.text}`}>{found?.count ?? 0}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {found?.revenue ? `RWF ${Number(found.revenue).toLocaleString()}` : '—'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Table Section */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 border-b border-slate-100">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by patient, clinician, ref…"
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

          {/* Work Type Filter */}
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
            <p className="text-sm text-slate-400">Loading cases…</p>
          </div>
        ) : paginated.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <ClipboardList size={40} className="text-slate-200" />
            <p className="text-base font-semibold text-slate-400">No cases found</p>
            <p className="text-sm text-slate-300">
              {search || workFilter ? 'Try adjusting your filters.' : `No prosthetics cases logged for ${periodLabel.toLowerCase()}.`}
            </p>
            {canEdit && !search && !workFilter && (
              <button
                onClick={() => { setEditCase(null); setShowForm(true); }}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 text-white text-sm font-bold rounded-xl"
              >
                <Plus size={14} /> Log First Case
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <th className="px-4 py-3 text-left whitespace-nowrap">Ref #</th>
                  <th className="px-4 py-3 text-left whitespace-nowrap">Received</th>
                  <th className="px-4 py-3 text-left whitespace-nowrap">Required</th>
                  <th className="px-4 py-3 text-left whitespace-nowrap">Clinic</th>
                  <th className="px-4 py-3 text-left whitespace-nowrap">Clinician</th>
                  <th className="px-4 py-3 text-left whitespace-nowrap">Patient ID</th>
                  <th className="px-4 py-3 text-left whitespace-nowrap">Work Done</th>
                  <th className="px-4 py-3 text-left whitespace-nowrap">Technologist</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">Units</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">1st Unit Cost</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">Add. Unit Cost</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">Total Cost</th>
                  <th className="px-4 py-3 text-left whitespace-nowrap">Reported By</th>
                  {canEdit && <th className="px-4 py-3 text-center whitespace-nowrap">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                <AnimatePresence initial={false}>
                  {paginated.map((c, idx) => (
                    <motion.tr
                      key={c.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.02 }}
                      className="hover:bg-rose-50/30 transition-colors group"
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg font-semibold">
                          {c.case_ref}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                        {c.received_date ? format(parseISO(c.received_date), 'dd MMM yyyy') : '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`text-sm font-semibold ${
                          new Date(c.required_date) < new Date() && c.status !== 'completed'
                            ? 'text-red-500' : 'text-slate-600'
                        }`}>
                          {c.required_date ? format(parseISO(c.required_date), 'dd MMM yyyy') : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600 max-w-[140px] truncate">
                        {c.clinic_of_origin || '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-700 font-medium">
                        {c.clinician_name || '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {c.patient_id
                          ? <span className="font-mono text-[11px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-lg">{c.patient_id}</span>
                          : '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <WorkTypeBadge type={c.work_done} />
                        {c.work_done === 'Other' && c.work_done_other && (
                          <p className="text-[10px] text-slate-400 mt-0.5 max-w-[120px] truncate">{c.work_done_other}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600">{c.technologist || '—'}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-700">{c.units_quantity}</td>
                      <td className="px-4 py-3 text-right text-slate-600 text-xs">{formatCurrency(c.cost_per_first_unit)}</td>
                      <td className="px-4 py-3 text-right text-slate-600 text-xs">{formatCurrency(c.cost_per_additional_unit)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-bold text-slate-800">{formatCurrency(c.total_cost)}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-500 text-xs">{c.reported_by || c.reported_by_name || '—'}</td>
                      {canEdit && (
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => { setEditCase(c); setShowForm(true); }}
                              className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition"
                              title="Edit"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(c)}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      )}
                    </motion.tr>
                  ))}
                </AnimatePresence>
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
      <DeleteConfirm
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        caseRef={deleteTarget?.case_ref}
      />
    </div>
  );
};

export default DentalCasesLog;
