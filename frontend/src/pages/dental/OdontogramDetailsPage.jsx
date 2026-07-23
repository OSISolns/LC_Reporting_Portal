import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Loader2, ClipboardList, User, Cake, Phone, Building2,
  AlertTriangle, Layers, CheckCircle2, Clock, AlertCircle,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { getDentalCase } from '../../api/dental';
import { getPatientByPid } from '../../api/patients';
import JawSkeletonDiagram from '../../components/dental/JawSkeletonDiagram';
import { WORK_STATUSES } from '../../components/dental/DentalLabOdontogram';

const parseOdontogram = (raw) => {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try { return JSON.parse(raw) || {}; } catch { return {}; }
};

const StatChip = ({ icon: Icon, label, value, colorClass, bgClass }) => (
  <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 flex items-center justify-between">
    <div>
      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">{label}</span>
      <span className="text-xl font-black text-slate-800">{value}</span>
    </div>
    <span className={`p-2.5 rounded-xl font-black ${bgClass} ${colorClass}`}>
      <Icon size={16} />
    </span>
  </div>
);

const OdontogramDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [caseItem, setCaseItem] = useState(null);
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    getDentalCase(id)
      .then(({ data }) => {
        if (cancelled) return;
        const c = data?.data;
        setCaseItem(c);
        if (c?.patient_id) {
          getPatientByPid(c.patient_id)
            .then(({ data: pData }) => { if (!cancelled) setPatient(pData?.data || null); })
            .catch(() => { if (!cancelled) setPatient(null); });
        }
      })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  const odontogramMap = useMemo(() => parseOdontogram(caseItem?.odontogram_data), [caseItem]);
  const entries = useMemo(() => Object.entries(odontogramMap), [odontogramMap]);

  const stats = useMemo(() => {
    const values = entries.map(([, v]) => v);
    return {
      total: values.length,
      missing: values.filter(v => v.is_missing || v.work_type === 'Declared Missing (To Be Replaced)').length,
      planning: values.filter(v => v.status === 'Planning').length,
      inProgress: values.filter(v => v.status === 'In-progress').length,
      completed: values.filter(v => v.status === 'Completed').length,
    };
  }, [entries]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <Loader2 size={28} className="text-indigo-400 animate-spin" />
        <p className="text-sm text-slate-400">Loading odontogram details…</p>
      </div>
    );
  }

  if (error || !caseItem) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <AlertTriangle size={32} className="text-rose-400" />
        <p className="text-sm text-slate-500 font-semibold">Case not found.</p>
        <button
          onClick={() => navigate('/dental?section=lab&tab=cases')}
          className="px-4 py-2 text-sm font-bold text-indigo-600 hover:bg-indigo-50 rounded-xl transition cursor-pointer"
        >
          Back to Cases Log
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      {/* Back + Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/dental?section=lab&tab=cases')}
          className="p-2.5 hover:bg-slate-100 rounded-xl transition text-slate-500 cursor-pointer"
          title="Back to Cases Log"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-black text-slate-800 flex items-center gap-2 m-0">
            <Layers size={20} className="text-indigo-500" /> Odontogram Details — {caseItem.case_ref}
          </h1>
          <p className="text-sm text-slate-400 mt-0.5 m-0">
            Prosthetics &amp; replacement work order, patient identity, and FDI jaw diagram.
          </p>
        </div>
      </div>

      {/* Patient / Case Identity Strip */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 flex flex-wrap items-center gap-2.5">
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-black">
          <ClipboardList size={13} /> {caseItem.case_ref}
        </span>

        {caseItem.patient_id ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-xs font-black font-mono">
            PID: {caseItem.patient_id}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold">
            <AlertTriangle size={13} /> No patient PID linked
          </span>
        )}

        {patient && (
          <>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-black">
              <User size={13} /> {patient.full_name}
            </span>
            {(patient.age || patient.dob) && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs font-bold">
                <Cake size={13} /> {patient.age ? `${patient.age} yrs` : patient.dob} {patient.gender ? `• ${patient.gender}` : ''}
              </span>
            )}
            {patient.phone && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs font-bold">
                <Phone size={13} /> {patient.phone}
              </span>
            )}
          </>
        )}

        {caseItem.clinic_of_origin && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs font-bold">
            <Building2 size={13} /> {caseItem.clinic_of_origin}
          </span>
        )}

        {caseItem.required_date && (
          <span className="ml-auto text-[11px] font-bold text-slate-400">
            Target delivery: {format(parseISO(caseItem.required_date), 'dd MMM yyyy')}
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatChip icon={Layers} label="Total Units" value={stats.total} colorClass="text-slate-600" bgClass="bg-slate-200/60" />
        <StatChip icon={AlertCircle} label="To Be Replaced" value={stats.missing} colorClass="text-rose-700" bgClass="bg-rose-100" />
        <StatChip icon={Clock} label="Planning" value={stats.planning} colorClass="text-amber-700" bgClass="bg-amber-100" />
        <StatChip icon={Loader2} label="In Production" value={stats.inProgress} colorClass="text-indigo-700" bgClass="bg-indigo-100" />
        <StatChip icon={CheckCircle2} label="Completed" value={stats.completed} colorClass="text-emerald-700" bgClass="bg-emerald-100" />
      </div>

      {/* Jaw Skeleton Diagram */}
      <JawSkeletonDiagram odontogramData={odontogramMap} dentitionMode="adult" />

      {/* Logged Units Table */}
      {entries.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <h5 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 px-4 pt-4 pb-2 m-0">
            Prosthetic &amp; Replacement Units ({entries.length})
          </h5>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[9px] font-extrabold tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-3.5 py-2.5">FDI Tooth #</th>
                  <th className="px-3.5 py-2.5">Work / Replacement Type</th>
                  <th className="px-3.5 py-2.5">Shade</th>
                  <th className="px-3.5 py-2.5">Notes</th>
                  <th className="px-3.5 py-2.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {entries.map(([toothNum, data]) => {
                  const st = WORK_STATUSES[data.status] || WORK_STATUSES.Planning;
                  const isMissing = data.is_missing || data.work_type === 'Declared Missing (To Be Replaced)';
                  return (
                    <tr key={toothNum} className="hover:bg-slate-50/60">
                      <td className="px-3.5 py-2.5 font-mono font-black text-indigo-600">#{toothNum}</td>
                      <td className="px-3.5 py-2.5 text-slate-900 font-bold">
                        {isMissing ? (
                          <span className="text-rose-600 flex items-center gap-1 font-extrabold">
                            <AlertCircle size={13} /> {data.replacement_strategy || 'Missing (To Be Replaced)'}
                          </span>
                        ) : data.work_type}
                      </td>
                      <td className="px-3.5 py-2.5">
                        <span className="px-2 py-0.5 rounded bg-slate-100 font-mono text-[11px] font-bold text-slate-700">
                          {data.shade || '—'}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 text-slate-500 text-[11px] max-w-xs">{data.notes || '—'}</td>
                      <td className="px-3.5 py-2.5 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${st.bg}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                          {st.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default OdontogramDetailsPage;
