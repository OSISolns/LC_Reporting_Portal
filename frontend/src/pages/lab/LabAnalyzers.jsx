import React, { useState, useEffect, useCallback } from 'react';
import { Cpu, Plus, Pencil, Trash2, RefreshCw, X, CheckCircle, AlertTriangle, Clock, WrenchIcon } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getAnalyzers, createAnalyzer, updateAnalyzer, deleteAnalyzer } from '../../api/lab';

const DEPARTMENTS = ['Hematology', 'Biochemistry', 'Microbiology', 'Serology / Immunology', 'Urinalysis', 'Blood Bank', 'Coagulation', 'Immunoassay', 'Molecular', 'Other'];
const STATUSES = ['Operational', 'Maintenance Due', 'Under Maintenance', 'Out of Service'];

const STATUS_CONFIG = {
  'Operational':        { color: 'bg-emerald-50 text-emerald-800 border-emerald-200', icon: <CheckCircle size={12} /> },
  'Maintenance Due':    { color: 'bg-amber-50 text-amber-800 border-amber-200',   icon: <Clock size={12} /> },
  'Under Maintenance':  { color: 'bg-blue-50 text-blue-800 border-blue-200',      icon: <WrenchIcon size={12} /> },
  'Out of Service':     { color: 'bg-rose-50 text-rose-800 border-rose-200',      icon: <AlertTriangle size={12} /> },
};

const EMPTY_FORM = {
  name: '', manufacturer: '', model: '', department: '', serial_number: '',
  status: 'Operational', last_calibrated: '', next_calibration_due: '', notes: '',
};

// ── Inline Modal ──────────────────────────────────────────────────────────────
function AnalyzerModal({ initial, onSave, onClose, saving }) {
  const [form, setForm] = useState(initial || EMPTY_FORM);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Analyzer name is required.'); return; }
    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="font-bold text-blue-950 text-base flex items-center gap-2">
            <Cpu size={18} className="text-blue-700" />
            {initial?.id ? 'Edit Analyzer' : 'Add Analyzer'}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-all cursor-pointer">
            <X size={16} className="text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Analyzer Name *</label>
            <input
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
              placeholder="e.g. Sysmex XN-550"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              required
            />
          </div>

          {/* Manufacturer + Model */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Manufacturer</label>
              <input
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                placeholder="e.g. Sysmex"
                value={form.manufacturer}
                onChange={e => set('manufacturer', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Model</label>
              <input
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                placeholder="e.g. XN-550"
                value={form.model}
                onChange={e => set('model', e.target.value)}
              />
            </div>
          </div>

          {/* Department + Serial */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Department</label>
              <select
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white"
                value={form.department}
                onChange={e => set('department', e.target.value)}
              >
                <option value="">Select…</option>
                {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Serial Number</label>
              <input
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                placeholder="e.g. SYS-2024-0012"
                value={form.serial_number}
                onChange={e => set('serial_number', e.target.value)}
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Status</label>
            <div className="flex gap-2 flex-wrap">
              {STATUSES.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => set('status', s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                    form.status === s
                      ? STATUS_CONFIG[s]?.color || 'bg-slate-100 text-slate-800 border-slate-300'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Calibration Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Last Calibrated</label>
              <input
                type="date"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                value={form.last_calibrated}
                onChange={e => set('last_calibrated', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Next Calibration Due</label>
              <input
                type="date"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                value={form.next_calibration_due}
                onChange={e => set('next_calibration_due', e.target.value)}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Notes</label>
            <textarea
              rows={3}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 resize-none"
              placeholder="Any maintenance notes, location, etc."
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 bg-blue-950 hover:bg-blue-900 text-white rounded-xl text-sm font-bold transition-all cursor-pointer disabled:opacity-60"
            >
              {saving ? 'Saving…' : initial?.id ? 'Save Changes' : 'Add Analyzer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function LabAnalyzers() {
  const [analyzers, setAnalyzers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState(null); // null | 'add' | { ...analyzer }
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [filter, setFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAnalyzers();
      setAnalyzers(res.data?.data || []);
    } catch {
      toast.error('Failed to load analyzers.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (form) => {
    setSaving(true);
    try {
      if (modal?.id) {
        await updateAnalyzer(modal.id, form);
        toast.success('Analyzer updated.');
      } else {
        await createAnalyzer(form);
        toast.success('Analyzer added.');
      }
      setModal(null);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save analyzer.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteAnalyzer(deleteTarget.id);
      toast.success('Analyzer removed.');
      setDeleteTarget(null);
      load();
    } catch {
      toast.error('Failed to delete analyzer.');
    }
  };

  const filtered = analyzers.filter(a =>
    [a.name, a.manufacturer, a.model, a.department, a.serial_number].some(v =>
      (v || '').toLowerCase().includes(filter.toLowerCase())
    )
  );

  // Group by department for display
  const grouped = filtered.reduce((acc, a) => {
    const dept = a.department || 'Uncategorized';
    if (!acc[dept]) acc[dept] = [];
    acc[dept].push(a);
    return acc;
  }, {});

  const isCalibrationDue = (dateStr) => {
    if (!dateStr) return false;
    const due = new Date(dateStr);
    const now = new Date();
    const daysAway = (due - now) / (1000 * 60 * 60 * 24);
    return daysAway <= 30;
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 font-sans antialiased">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-900 p-5 rounded-2xl text-white shadow-md border border-blue-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-800/80 rounded-xl border border-blue-700">
            <Cpu size={20} className="text-blue-100" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white">Analyzer Configuration</h1>
            <p className="text-xs text-blue-200/80">Manage laboratory instruments &amp; calibration schedules</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="p-2 text-blue-200 hover:text-white hover:bg-blue-800 rounded-xl transition-all cursor-pointer border border-blue-800"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setModal('add')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white text-blue-950 font-bold text-xs rounded-xl hover:bg-blue-50 transition-all cursor-pointer"
          >
            <Plus size={14} /> Add Analyzer
          </button>
        </div>
      </div>

      {/* ── Summary Tiles ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total',            value: analyzers.length,                                                              color: 'text-blue-900' },
          { label: 'Operational',      value: analyzers.filter(a => a.status === 'Operational').length,                      color: 'text-emerald-700' },
          { label: 'Maintenance Due',  value: analyzers.filter(a => a.status === 'Maintenance Due').length,                  color: 'text-amber-700' },
          { label: 'Out of Service',   value: analyzers.filter(a => a.status === 'Out of Service' || a.status === 'Under Maintenance').length, color: 'text-rose-700' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* ── Search ── */}
      <div className="relative">
        <input
          className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 pl-4"
          placeholder="Search by name, manufacturer, department, or serial…"
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
      </div>

      {/* ── Analyzer List ── */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Loading analyzers…</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 py-16 text-center">
          <Cpu size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="font-bold text-slate-500 text-sm">
            {analyzers.length === 0 ? 'No analyzers configured yet' : 'No analyzers match your search'}
          </p>
          {analyzers.length === 0 && (
            <button
              onClick={() => setModal('add')}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-950 text-white text-xs font-bold rounded-xl hover:bg-blue-900 transition-all cursor-pointer"
            >
              <Plus size={13} /> Add your first analyzer
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([dept, items]) => (
            <div key={dept}>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">{dept}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {items.map(analyzer => {
                  const sc = STATUS_CONFIG[analyzer.status] || STATUS_CONFIG['Operational'];
                  const dueSoon = isCalibrationDue(analyzer.next_calibration_due);
                  return (
                    <div key={analyzer.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-all group">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-bold text-sm text-slate-900 truncate">{analyzer.name}</p>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9.5px] font-bold border flex-shrink-0 ${sc.color}`}>
                              {sc.icon} {analyzer.status}
                            </span>
                          </div>
                          {(analyzer.manufacturer || analyzer.model) && (
                            <p className="text-xs text-slate-500 mb-2">
                              {[analyzer.manufacturer, analyzer.model].filter(Boolean).join(' · ')}
                            </p>
                          )}
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-slate-500">
                            {analyzer.serial_number && (
                              <span>S/N: <strong className="text-slate-700">{analyzer.serial_number}</strong></span>
                            )}
                            {analyzer.last_calibrated && (
                              <span>Calibrated: <strong className="text-slate-700">{analyzer.last_calibrated}</strong></span>
                            )}
                            {analyzer.next_calibration_due && (
                              <span className={dueSoon ? 'text-amber-700 font-semibold col-span-2' : 'col-span-2'}>
                                Next cal: <strong>{analyzer.next_calibration_due}</strong>
                                {dueSoon && ' ⚠️ Due soon'}
                              </span>
                            )}
                          </div>
                          {analyzer.notes && (
                            <p className="text-[11px] text-slate-400 mt-2 italic truncate">{analyzer.notes}</p>
                          )}
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
                          <button
                            onClick={() => setModal(analyzer)}
                            className="p-1.5 text-slate-400 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all cursor-pointer"
                            title="Edit"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(analyzer)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Add/Edit Modal ── */}
      {modal && (
        <AnalyzerModal
          initial={modal === 'add' ? null : modal}
          onSave={handleSave}
          onClose={() => setModal(null)}
          saving={saving}
        />
      )}

      {/* ── Delete Confirm ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-50 rounded-xl border border-rose-200">
                <Trash2 size={18} className="text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Remove Analyzer</h3>
                <p className="text-xs text-slate-500">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-sm text-slate-700">
              Are you sure you want to remove <strong>{deleteTarget.name}</strong>?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold transition-all cursor-pointer"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
