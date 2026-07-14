import React, { useEffect, useState, useCallback } from 'react';
import { RefreshCw, FileText, CheckCircle2, ShieldCheck, Download, Loader2, Save, FilePlus2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import TerminologyPicker from '../../components/TerminologyPicker';
import ImagingStudyViewer from './ImagingStudyViewer';
import {
  getReportingQueue, getReport, saveReport, finalizeReport,
  verifyReport, amendReport, downloadReportPdf,
} from '../../api/imaging';

const REPORT_STATUS = {
  draft:    'bg-amber-100 text-amber-700',
  final:    'bg-violet-100 text-violet-700',
  verified: 'bg-emerald-100 text-emerald-700',
  amended:  'bg-orange-100 text-orange-700',
};

const emptyReport = { technique: '', findings_narrative: '', findings_codes: [], impression: '', diagnosis_codes: [], recommendations: '' };

const ImagingReporting = () => {
  const { hasPermission } = useAuth();
  const canVerify = hasPermission('imaging', 'verify');

  const [queue, setQueue] = useState({ acquired: [], reported: [] });
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [selected, setSelected] = useState(null); // study
  const [report, setReport] = useState(emptyReport);
  const [reportStatus, setReportStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  const loadQueue = useCallback(async () => {
    setLoadingQueue(true);
    try {
      const res = await getReportingQueue();
      setQueue(res.data.data || { acquired: [], reported: [] });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load the reporting queue.');
    } finally { setLoadingQueue(false); }
  }, []);

  useEffect(() => { loadQueue(); }, [loadQueue]);

  const openStudy = async (study) => {
    setSelected(study);
    setReport(emptyReport);
    setReportStatus(null);
    try {
      const res = await getReport(study.id);
      const r = res.data.data.report;
      setSelected(res.data.data.study);
      if (r) {
        setReport({
          technique: r.technique || '',
          findings_narrative: r.findings_narrative || '',
          findings_codes: r.findings_codes || [],
          impression: r.impression || '',
          diagnosis_codes: r.diagnosis_codes || [],
          recommendations: r.recommendations || '',
        });
        setReportStatus(r.status);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to open the study.');
    }
  };

  const locked = ['final', 'verified'].includes(reportStatus);

  const set = (k, v) => setReport((r) => ({ ...r, [k]: v }));

  const doSave = async () => {
    setBusy(true);
    try {
      await saveReport(selected.id, report);
      toast.success('Report saved.');
      setReportStatus('draft');
    } catch (err) { toast.error(err.response?.data?.message || 'Save failed.'); }
    finally { setBusy(false); }
  };
  const doFinalize = async () => {
    setBusy(true);
    try {
      await saveReport(selected.id, report);
      await finalizeReport(selected.id);
      toast.success('Report finalised.');
      setReportStatus('final');
      loadQueue();
    } catch (err) { toast.error(err.response?.data?.message || 'Finalise failed.'); }
    finally { setBusy(false); }
  };
  const doVerify = async () => {
    setBusy(true);
    try {
      await verifyReport(selected.id);
      toast.success('Report verified.');
      setReportStatus('verified');
      loadQueue();
    } catch (err) { toast.error(err.response?.data?.message || 'Verify failed.'); }
    finally { setBusy(false); }
  };
  const doAmend = async () => {
    const reason = window.prompt('Reason for amendment:');
    if (reason === null) return;
    setBusy(true);
    try {
      await amendReport(selected.id, { ...report, amendment_reason: reason });
      toast.success('Report amended.');
      setReportStatus('amended');
    } catch (err) { toast.error(err.response?.data?.message || 'Amend failed.'); }
    finally { setBusy(false); }
  };
  const doDownload = async () => {
    try {
      const res = await downloadReportPdf(selected.id);
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `Imaging_Report_${selected.accession_number || selected.id}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) { toast.error('PDF download failed.'); }
  };

  const QueueList = ({ title, items, tone }) => (
    <div className="mb-4">
      <div className="text-xs font-bold uppercase text-slate-400 mb-2">{title} ({items.length})</div>
      <div className="space-y-1.5">
        {items.map((s) => (
          <button key={s.id} onClick={() => openStudy(s)}
            className={`w-full text-left p-2.5 rounded-lg border transition-colors ${selected?.id === s.id ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:bg-slate-50'}`}>
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] text-slate-500">{s.accession_number}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${tone}`}>{s.modality}</span>
            </div>
            <div className="text-sm font-medium text-slate-800 truncate">{s.patient_name || '—'}</div>
          </button>
        ))}
        {items.length === 0 && <p className="text-xs text-slate-400 italic px-1">None.</p>}
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
      {/* Queue */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-slate-800">Reporting Queue</h2>
          <button onClick={loadQueue} className="text-slate-500 hover:text-slate-700">
            <RefreshCw size={16} className={loadingQueue ? 'animate-spin' : ''} />
          </button>
        </div>
        <QueueList title="To report" items={queue.acquired} tone="bg-blue-100 text-blue-700" />
        <QueueList title="Reported — to verify" items={queue.reported} tone="bg-violet-100 text-violet-700" />
      </div>

      {/* Editor */}
      <div>
        {!selected ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400">
            <FileText size={32} className="mb-2" />
            <p className="text-sm">Select a study from the queue to report.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-start justify-between flex-wrap gap-3 mb-5 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-800">{selected.patient_name || '—'}</h3>
                  {reportStatus && (
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold capitalize ${REPORT_STATUS[reportStatus] || 'bg-slate-100 text-slate-600'}`}>{reportStatus}</span>
                  )}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {selected.accession_number} · {selected.sub_unit || selected.modality} · PID {selected.patient_id}
                  {(selected.exam_display) && <> · Exam: {selected.exam_display}</>}
                </div>
                {selected.indication && <div className="text-xs text-slate-500 mt-0.5">Indication: {selected.indication}</div>}
                {selected.acquisition_params && Object.keys(selected.acquisition_params).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {Object.entries(selected.acquisition_params).map(([k, v]) => {
                      if (v === '' || v == null || (Array.isArray(v) && v.length === 0) || v === false) return null;
                      const label = Array.isArray(v) ? v.join(', ') : v === true ? k.replace(/_/g, ' ') : `${k.replace(/_/g, ' ')}: ${v}`;
                      return (
                        <span key={k} className="text-[11px] bg-slate-100 text-slate-600 rounded px-1.5 py-0.5 font-medium capitalize">{label}</span>
                      );
                    })}
                  </div>
                )}
              </div>
              <button onClick={doDownload} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200">
                <Download size={15} /> PDF
              </button>
            </div>

            <div className="mb-5">
              <ImagingStudyViewer study={selected} canLink={hasPermission('imaging', 'acquire')} />
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Technique</label>
                <textarea disabled={locked} value={report.technique} onChange={(e) => set('technique', e.target.value)} rows={2}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm disabled:bg-slate-50" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Findings</label>
                <textarea disabled={locked} value={report.findings_narrative} onChange={(e) => set('findings_narrative', e.target.value)} rows={4}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm disabled:bg-slate-50 mb-2" />
                {!locked ? (
                  <TerminologyPicker system="snomed" label="Coded findings (SNOMED CT)"
                    value={report.findings_codes} onChange={(v) => set('findings_codes', v)} />
                ) : (
                  report.findings_codes && report.findings_codes.length > 0 && (
                    <>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Coded findings (SNOMED CT)</label>
                      <div className="flex flex-wrap gap-1.5">
                        {report.findings_codes.map((c) => (
                          <span key={c.code} className="text-xs bg-teal-50 text-teal-700 border border-teal-200 rounded px-2 py-0.5 font-semibold">{c.display} [{c.code}]</span>
                        ))}
                      </div>
                    </>
                  )
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Impression</label>
                <textarea disabled={locked} value={report.impression} onChange={(e) => set('impression', e.target.value)} rows={3}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm disabled:bg-slate-50" />
              </div>

              <div>
                {!locked ? (
                  <TerminologyPicker system="icd11" label="Diagnosis (ICD-11)"
                    value={report.diagnosis_codes} onChange={(v) => set('diagnosis_codes', v)} />
                ) : (
                  <>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Diagnosis (ICD-11)</label>
                    <div className="flex flex-wrap gap-1.5">
                      {report.diagnosis_codes.map((c) => (
                        <span key={c.code} className="text-xs bg-purple-50 text-purple-700 border border-purple-200 rounded px-2 py-0.5 font-semibold">{c.display} [{c.code}]</span>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Recommendations</label>
                <textarea disabled={locked} value={report.recommendations} onChange={(e) => set('recommendations', e.target.value)} rows={2}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm disabled:bg-slate-50" />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
              {busy && <Loader2 size={16} className="animate-spin text-slate-400" />}
              {!locked && (
                <>
                  <button disabled={busy} onClick={doSave} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-60">
                    <Save size={15} /> Save draft
                  </button>
                  <button disabled={busy} onClick={doFinalize} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-60">
                    <CheckCircle2 size={15} /> Finalise
                  </button>
                </>
              )}
              {reportStatus === 'final' && canVerify && (
                <button disabled={busy} onClick={doVerify} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60">
                  <ShieldCheck size={15} /> Verify
                </button>
              )}
              {locked && (
                <button disabled={busy} onClick={doAmend} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-orange-100 text-orange-700 hover:bg-orange-200 disabled:opacity-60">
                  <FilePlus2 size={15} /> Amend
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImagingReporting;
