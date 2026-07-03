import React, { useEffect, useState, useCallback } from 'react';
import { RefreshCw, Plus, LogIn, X, CalendarClock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import PatientAutocomplete from '../../components/PatientAutocomplete';
import TerminologyPicker from '../../components/TerminologyPicker';
import { getStudies, scheduleStudy, checkInStudy, cancelStudy, getModalities } from '../../api/imaging';

const STATUS_STYLE = {
  scheduled:   'bg-amber-100 text-amber-700',
  checked_in:  'bg-sky-100 text-sky-700',
  in_progress: 'bg-indigo-100 text-indigo-700',
  acquired:    'bg-blue-100 text-blue-700',
  reported:    'bg-violet-100 text-violet-700',
  verified:    'bg-emerald-100 text-emerald-700',
  cancelled:   'bg-slate-100 text-slate-500',
};

const StatusBadge = ({ status }) => (
  <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize ${STATUS_STYLE[status] || 'bg-slate-100 text-slate-600'}`}>
    {String(status || '').replace('_', ' ')}
  </span>
);

// Common imaging body-region shorthands (as used in the unit logbooks).
const EXAM_REGIONS = ['C-S', 'T-S', 'L-S', 'Brain', 'Neck', 'Knee', 'Femur', 'Shoulder', 'Hip', 'Ankle', 'Wrist', 'Abdomen', 'Pelvis', 'Chest', 'Whole Spine'];

const emptyForm = {
  patient_id: '', patient_name: '', modality: '', scheduled_at: '',
  referring_provider: '', clinical_indication: '', room: '', exam_type: null,
  sid: '', exam_region: '', patient_age: '', patient_sex: '',
};

const ImagingWorklist = () => {
  const [studies, setStudies] = useState([]);
  const [modalities, setModalities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [filterStatus, setFilterStatus] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getStudies(filterStatus ? { status: filterStatus } : {});
      setStudies(res.data.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load the worklist.');
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    getModalities().then((r) => setModalities(r.data.data || [])).catch(() => {});
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.patient_id || !form.modality) {
      toast.error('Patient and modality are required.');
      return;
    }
    setSaving(true);
    try {
      await scheduleStudy(form);
      toast.success('Study scheduled.');
      setForm(emptyForm);
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to schedule the study.');
    } finally {
      setSaving(false);
    }
  };

  const doCheckIn = async (id) => {
    try { await checkInStudy(id); toast.success('Patient checked in.'); load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Check-in failed.'); }
  };
  const doCancel = async (id) => {
    if (!window.confirm('Cancel this study?')) return;
    try { await cancelStudy(id); toast.success('Study cancelled.'); load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Cancel failed.'); }
  };

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Worklist</h2>
          <p className="text-sm text-slate-500">Schedule studies and check patients in.</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm"
          >
            <option value="">All statuses</option>
            {['scheduled', 'checked_in', 'in_progress', 'acquired', 'reported', 'verified', 'cancelled'].map((s) => (
              <option key={s} value={s}>{s.replace('_', ' ')}</option>
            ))}
          </select>
          <button onClick={load} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button onClick={() => setShowForm((v) => !v)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700">
            <Plus size={15} /> Schedule
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={submit} className="bg-white rounded-xl border border-slate-200 p-5 mb-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-500 mb-1">Patient</label>
            <PatientAutocomplete
              value={form.patient_name}
              onChange={(val) => setForm((f) => ({ ...f, patient_name: val }))}
              onPatientSelect={(p) => setForm((f) => ({
                ...f,
                patient_id: p.pid || p.patient_id || '',
                patient_name: p.full_name || '',
                patient_age: p.age != null ? String(p.age) : f.patient_age,
                patient_sex: p.gender || p.sex || f.patient_sex,
              }))}
              inputStyle={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.875rem' }}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Modality *</label>
            <select
              value={form.modality}
              onChange={(e) => setForm((f) => ({ ...f, modality: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              required
            >
              <option value="">Select unit…</option>
              {modalities.map((m) => <option key={m.code} value={m.code}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Exam region</label>
            <input list="exam-regions" value={form.exam_region}
              onChange={(e) => setForm((f) => ({ ...f, exam_region: e.target.value }))}
              placeholder="C-S, L-S, Brain, Knee…"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            <datalist id="exam-regions">
              {EXAM_REGIONS.map((r) => <option key={r} value={r} />)}
            </datalist>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">SID</label>
              <input value={form.sid}
                onChange={(e) => setForm((f) => ({ ...f, sid: e.target.value }))}
                placeholder="86491"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Age</label>
              <input value={form.patient_age}
                onChange={(e) => setForm((f) => ({ ...f, patient_age: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Sex</label>
              <select value={form.patient_sex}
                onChange={(e) => setForm((f) => ({ ...f, patient_sex: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
                <option value="">—</option>
                <option value="M">M</option>
                <option value="F">F</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Scheduled for</label>
            <input type="datetime-local" value={form.scheduled_at}
              onChange={(e) => setForm((f) => ({ ...f, scheduled_at: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Referring provider</label>
            <input value={form.referring_provider}
              onChange={(e) => setForm((f) => ({ ...f, referring_provider: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" placeholder="Dr. ..." />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Room / station</label>
            <input value={form.room}
              onChange={(e) => setForm((f) => ({ ...f, room: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="md:col-span-2">
            <TerminologyPicker
              system="loinc"
              multiple={false}
              label="Exam type (LOINC)"
              value={form.exam_type ? [form.exam_type] : []}
              onChange={(v) => setForm((f) => ({ ...f, exam_type: v[0] || null }))}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-500 mb-1">Clinical indication</label>
            <textarea value={form.clinical_indication}
              onChange={(e) => setForm((f) => ({ ...f, clinical_indication: e.target.value }))}
              rows={2} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="md:col-span-2 flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm font-semibold bg-slate-100 text-slate-700">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white disabled:opacity-60">
              {saving ? 'Scheduling…' : 'Schedule study'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs">
            <tr>
              <th className="text-left px-4 py-2.5 font-semibold">Accession</th>
              <th className="text-left px-4 py-2.5 font-semibold">Patient</th>
              <th className="text-left px-4 py-2.5 font-semibold">Unit</th>
              <th className="text-left px-4 py-2.5 font-semibold">Scheduled</th>
              <th className="text-left px-4 py-2.5 font-semibold">Status</th>
              <th className="text-right px-4 py-2.5 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {studies.map((s) => (
              <tr key={s.id} className="border-t border-slate-100">
                <td className="px-4 py-2.5 font-mono text-xs text-slate-600">{s.accession_number || '—'}</td>
                <td className="px-4 py-2.5">
                  <div className="font-medium text-slate-800">{s.patient_name || '—'}</div>
                  <div className="text-xs text-slate-400">PID: {s.patient_id || '—'}</div>
                </td>
                <td className="px-4 py-2.5">{s.sub_unit || s.modality}</td>
                <td className="px-4 py-2.5 text-slate-600">
                  {s.scheduled_at ? new Date(s.scheduled_at).toLocaleString() : '—'}
                </td>
                <td className="px-4 py-2.5"><StatusBadge status={s.status} /></td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center justify-end gap-2">
                    {s.status === 'scheduled' && (
                      <>
                        <button onClick={() => doCheckIn(s.id)} className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 hover:underline">
                          <LogIn size={14} /> Check in
                        </button>
                        <button onClick={() => doCancel(s.id)} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-red-600">
                          <X size={14} /> Cancel
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {studies.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-400 italic">
                  <CalendarClock size={20} className="inline mb-1" /><br />
                  {loading ? 'Loading…' : 'No studies on the worklist.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ImagingWorklist;
