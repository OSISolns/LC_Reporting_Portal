import React, { useEffect, useState, useCallback } from 'react';
import { RefreshCw, Play, CheckCircle2, Image as ImageIcon } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getStudies, getModalities, startStudy, completeStudy } from '../../api/imaging';
import ImagingStudyViewer from './ImagingStudyViewer';

const STATUS_STYLE = {
  checked_in:  'bg-sky-100 text-sky-700',
  in_progress: 'bg-indigo-100 text-indigo-700',
  acquired:    'bg-blue-100 text-blue-700',
};

const ModalityConsole = () => {
  const [modality, setModality] = useState('');
  const [modalities, setModalities] = useState([]);
  const [studies, setStudies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notesById, setNotesById] = useState({});
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    getModalities().then((r) => {
      const list = r.data.data || [];
      setModalities(list);
      if (list[0]) setModality((m) => m || list[0].code);
    }).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    if (!modality) return;
    setLoading(true);
    try {
      // Active studies for this unit today: checked-in, in-progress, or just acquired.
      const res = await getStudies({ modality, date: new Date().toISOString().slice(0, 10) });
      const active = (res.data.data || []).filter((s) =>
        ['checked_in', 'in_progress', 'acquired'].includes(s.status)
      );
      setStudies(active);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load the console.');
    } finally {
      setLoading(false);
    }
  }, [modality]);

  useEffect(() => { load(); }, [load]);

  const doStart = async (id) => {
    try { await startStudy(id); toast.success('Acquisition started.'); load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Could not start.'); }
  };
  const doComplete = async (id) => {
    try {
      await completeStudy(id, { technical_notes: notesById[id] || '' });
      toast.success('Exam logged — radiologists notified.');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Could not complete.'); }
  };

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Modality Console</h2>
          <p className="text-sm text-slate-500">Acquire &amp; log exams for your unit.</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={modality} onChange={(e) => setModality(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm">
            {modalities.map((m) => <option key={m.code} value={m.code}>{m.label}</option>)}
          </select>
          <button onClick={load} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {studies.map((s) => (
          <div key={s.id} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-slate-500">{s.accession_number || '—'}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${STATUS_STYLE[s.status] || 'bg-slate-100 text-slate-600'}`}>
                    {String(s.status).replace('_', ' ')}
                  </span>
                </div>
                <div className="font-semibold text-slate-800 mt-1">{s.patient_name || '—'}</div>
                <div className="text-xs text-slate-400">PID: {s.patient_id || '—'} • {s.sub_unit || s.modality}</div>
              </div>
              <div className="flex items-center gap-2">
                {s.status === 'checked_in' && (
                  <button onClick={() => doStart(s.id)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700">
                    <Play size={15} /> Start
                  </button>
                )}
                {s.status === 'in_progress' && (
                  <button onClick={() => doComplete(s.id)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700">
                    <CheckCircle2 size={15} /> Complete &amp; log
                  </button>
                )}
                {s.status === 'acquired' && (
                  <span className="text-xs text-blue-600 font-semibold inline-flex items-center gap-1">
                    <CheckCircle2 size={14} /> Awaiting report
                  </span>
                )}
                {['in_progress', 'acquired'].includes(s.status) && (
                  <button
                    onClick={() => setExpandedId((id) => (id === s.id ? null : s.id))}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200"
                  >
                    <ImageIcon size={15} /> Images
                  </button>
                )}
              </div>
            </div>
            {s.status === 'in_progress' && (
              <input
                value={notesById[s.id] || ''}
                onChange={(e) => setNotesById((n) => ({ ...n, [s.id]: e.target.value }))}
                placeholder="Technical notes (kV/mAs, contrast, sequences…)"
                className="mt-3 w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm"
              />
            )}
            {expandedId === s.id && (
              <div className="mt-3">
                <ImagingStudyViewer study={s} canLink={true} />
              </div>
            )}
          </div>
        ))}
        {studies.length === 0 && (
          <p className="text-center text-slate-400 text-sm py-10 italic">
            {loading ? 'Loading…' : 'No active studies for this unit. Check patients in from the Worklist first.'}
          </p>
        )}
      </div>
    </div>
  );
};

export default ModalityConsole;
