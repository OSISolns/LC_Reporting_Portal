import React, { useEffect, useState, useCallback } from 'react';
import { RefreshCw, Activity, ScanLine, Radiation, Waves, Brain, ListOrdered } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getDailyBoard, getDailyRegister } from '../../api/imaging';

// Icon per canonical modality code.
const UNIT_ICON = {
  'X-Ray': <Radiation size={22} />,
  CT: <ScanLine size={22} />,
  MRI: <Brain size={22} />,
  Ultrasound: <Waves size={22} />,
};

const today = () => new Date().toISOString().slice(0, 10);

const ImagingDailyBoard = () => {
  const [date, setDate] = useState(today());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unitFilter, setUnitFilter] = useState('');
  const [entries, setEntries] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [board, register] = await Promise.all([
        getDailyBoard(date),
        getDailyRegister(date, unitFilter || undefined),
      ]);
      setData(board.data.data);
      setEntries(register.data.data.entries || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load the daily board.');
    } finally {
      setLoading(false);
    }
  }, [date, unitFilter]);

  useEffect(() => { load(); }, [load]);

  const totals = data?.totals || { total: 0, completed: 0, reported: 0 };

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Daily Exam Log</h2>
          <p className="text-sm text-slate-500">Exams logged per unit — X-Ray, CT, MRI, Ultrasound.</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={date}
            max={today()}
            onChange={(e) => setDate(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm"
          />
          <button
            onClick={load}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Total exams', value: totals.total, color: 'text-slate-800' },
          { label: 'Acquired', value: totals.completed, color: 'text-blue-600' },
          { label: 'Reported', value: totals.reported, color: 'text-emerald-600' },
        ].map((t) => (
          <div key={t.label} className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-medium text-slate-500">{t.label}</p>
            <p className={`text-2xl font-bold ${t.color}`}>{t.value}</p>
          </div>
        ))}
      </div>

      {/* Per-unit cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {(data?.units || []).map((u) => (
          <div key={u.modality} className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
                {UNIT_ICON[u.modality] || <Activity size={22} />}
              </div>
              <span className="text-3xl font-bold text-slate-800">{u.total}</span>
            </div>
            <p className="font-semibold text-slate-700 text-sm">{u.label}</p>
            <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
              <span>Acquired: <b className="text-blue-600">{u.completed}</b></span>
              <span>Reported: <b className="text-emerald-600">{u.reported}</b></span>
            </div>
          </div>
        ))}
      </div>

      {/* Line-item exam register (mirrors the unit logbook) */}
      <div className="mt-8">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <ListOrdered size={16} /> Exam Register — {date}
          </h3>
          <select value={unitFilter} onChange={(e) => setUnitFilter(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm">
            <option value="">All units</option>
            {(data?.units || []).map((u) => <option key={u.modality} value={u.modality}>{u.label}</option>)}
          </select>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs">
              <tr>
                <th className="text-left px-3 py-2 font-semibold w-10">#</th>
                <th className="text-left px-3 py-2 font-semibold">Name</th>
                <th className="text-left px-3 py-2 font-semibold">Age/Sex</th>
                <th className="text-left px-3 py-2 font-semibold">Unit</th>
                <th className="text-left px-3 py-2 font-semibold">Exam</th>
                <th className="text-left px-3 py-2 font-semibold">SID</th>
                <th className="text-left px-3 py-2 font-semibold">Indication</th>
                <th className="text-left px-3 py-2 font-semibold">Referring Dr</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => (
                <tr key={e.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                  <td className="px-3 py-2 font-medium text-slate-800">
                    {e.patient_name || '—'}
                    <span className="block text-[11px] text-slate-400 font-normal">PID {e.patient_id || '—'}</span>
                  </td>
                  <td className="px-3 py-2 text-slate-600">{[e.patient_age, e.patient_sex].filter(Boolean).join('/') || '—'}</td>
                  <td className="px-3 py-2 text-slate-600">{e.modality}</td>
                  <td className="px-3 py-2 font-semibold text-slate-700">{e.exam_region || e.exam_type_display || '—'}</td>
                  <td className="px-3 py-2 font-mono text-xs text-slate-600">{e.sid || '—'}</td>
                  <td className="px-3 py-2 text-slate-600">{e.clinical_indication || '—'}</td>
                  <td className="px-3 py-2 text-slate-600">{e.referring_provider || '—'}</td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr><td colSpan={8} className="px-3 py-8 text-center text-slate-400 italic">
                  {loading ? 'Loading…' : `No exams logged for ${date}.`}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ImagingDailyBoard;
