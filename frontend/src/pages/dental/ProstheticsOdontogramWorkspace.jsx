import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, X, ClipboardList, Loader2, CheckCircle2, AlertTriangle,
  RefreshCw, User, Phone, Cake, Building2, Wrench, ChevronDown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import { useAuth } from '../../context/AuthContext';
import { listDentalCases, updateDentalCase } from '../../api/dental';
import { getPatientByPid } from '../../api/patients';
import DentalLabOdontogram from '../../components/dental/DentalLabOdontogram';

const EDITOR_ROLES = ['admin', 'deputy_coo', 'dental_lab_manager', 'dental_tech', 'dental_lab', 'dental_hod'];

const parseOdontogram = (raw) => {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try { return JSON.parse(raw) || {}; } catch { return {}; }
};

const ProstheticsOdontogramWorkspace = () => {
  const { user } = useAuth();
  const canEdit = EDITOR_ROLES.includes(user?.role);

  const [cases, setCases] = useState([]);
  const [loadingCases, setLoadingCases] = useState(true);
  const [search, setSearch] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);

  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [odontogramMap, setOdontogramMap] = useState({});
  const [patient, setPatient] = useState(null);
  const [patientLoading, setPatientLoading] = useState(false);
  const [patientError, setPatientError] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle'); // idle | saving | saved | error

  const saveTimer = useRef(null);
  const pickerRef = useRef(null);

  const fetchCases = useCallback(async () => {
    setLoadingCases(true);
    try {
      const { data } = await listDentalCases({});
      setCases(data.data || []);
    } catch {
      toast.error('Failed to load prosthetics cases.');
    } finally {
      setLoadingCases(false);
    }
  }, []);

  useEffect(() => { fetchCases(); }, [fetchCases]);

  const selectedCase = useMemo(
    () => cases.find(c => c.id === selectedCaseId) || null,
    [cases, selectedCaseId]
  );

  // Load odontogram + patient details whenever the selected case changes
  useEffect(() => {
    if (!selectedCase) {
      setOdontogramMap({});
      setPatient(null);
      setPatientError(false);
      return;
    }
    setOdontogramMap(parseOdontogram(selectedCase.odontogram_data));
    setSaveStatus('idle');

    if (selectedCase.patient_id) {
      setPatientLoading(true);
      setPatientError(false);
      getPatientByPid(selectedCase.patient_id)
        .then(({ data }) => setPatient(data?.data || null))
        .catch(() => { setPatient(null); setPatientError(true); })
        .finally(() => setPatientLoading(false));
    } else {
      setPatient(null);
      setPatientError(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCaseId]);

  // Close case picker on outside click
  useEffect(() => {
    const onClick = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) setPickerOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const filteredCases = useMemo(() => {
    if (!search.trim()) return cases;
    const q = search.toLowerCase();
    return cases.filter(c =>
      [c.case_ref, c.patient_id, c.clinician_name, c.clinic_of_origin, c.work_done]
        .some(v => v && v.toLowerCase().includes(q))
    );
  }, [cases, search]);

  const handleSelectCase = (c) => {
    setSelectedCaseId(c.id);
    setSearch('');
    setPickerOpen(false);
  };

  const handleOdontogramChange = (nextMap) => {
    setOdontogramMap(nextMap);
    if (!selectedCase) return;

    setSaveStatus('saving');
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await updateDentalCase(selectedCase.id, { odontogram_data: nextMap });
        setSaveStatus('saved');
        setCases(prev => prev.map(c => c.id === selectedCase.id ? { ...c, odontogram_data: nextMap } : c));
      } catch {
        setSaveStatus('error');
        toast.error('Failed to save odontogram changes.');
      }
    }, 700);
  };

  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);

  const SaveIndicator = () => {
    if (!selectedCase) return null;
    if (saveStatus === 'saving') {
      return (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-600">
          <Loader2 size={12} className="animate-spin" /> Saving…
        </span>
      );
    }
    if (saveStatus === 'saved') {
      return (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-600">
          <CheckCircle2 size={12} /> Saved to case
        </span>
      );
    }
    if (saveStatus === 'error') {
      return (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-rose-600">
          <AlertTriangle size={12} /> Save failed — retry a change
        </span>
      );
    }
    return null;
  };

  return (
    <div className="space-y-5">
      {/* Case Selector Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div ref={pickerRef} className="relative flex-1">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
              Connected Prosthetics Case
            </label>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={pickerOpen ? search : (selectedCase ? `${selectedCase.case_ref} — ${selectedCase.patient_id ? `PID: ${selectedCase.patient_id}` : (selectedCase.clinician_name || 'Unlinked patient')}` : '')}
                onChange={(e) => { setSearch(e.target.value); setPickerOpen(true); }}
                onFocus={() => setPickerOpen(true)}
                placeholder="Search by case ref, patient PID, clinician…"
                className="w-full pl-9 pr-9 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition"
              />
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            <AnimatePresence>
              {pickerOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="absolute z-30 mt-1.5 w-full max-h-72 overflow-y-auto bg-white border border-slate-200 rounded-2xl shadow-xl"
                >
                  {loadingCases ? (
                    <div className="p-4 text-center text-xs text-slate-400">
                      <Loader2 size={16} className="animate-spin inline mr-1.5" /> Loading cases…
                    </div>
                  ) : filteredCases.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">No matching cases found.</div>
                  ) : (
                    filteredCases.slice(0, 30).map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleSelectCase(c)}
                        className="w-full text-left px-4 py-2.5 hover:bg-indigo-50/70 border-b border-slate-50 last:border-0 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[11px] font-black text-indigo-600">{c.case_ref}</span>
                          <span className="text-[10px] font-bold text-slate-400">{c.status || 'Received'}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-[11px] text-slate-500 font-medium">
                          {c.patient_id ? (
                            <span className="font-mono text-blue-600 font-bold">PID: {c.patient_id}</span>
                          ) : (
                            <span className="italic text-slate-300">No PID linked</span>
                          )}
                          <span>{c.clinician_name || 'Dr. Dental'}</span>
                          <span className="text-slate-300">•</span>
                          <span>{c.work_done}</span>
                        </div>
                      </button>
                    ))
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-end pb-0.5">
            {selectedCase && (
              <button
                type="button"
                onClick={() => setSelectedCaseId(null)}
                className="px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={fetchCases}
              className="p-2.5 text-slate-500 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              title="Refresh cases"
            >
              <RefreshCw size={15} />
            </button>
          </div>
        </div>

        {/* Patient / Case Identity Strip */}
        {selectedCase && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-black">
              <ClipboardList size={13} /> {selectedCase.case_ref}
            </span>

            {selectedCase.patient_id ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-xs font-black font-mono">
                PID: {selectedCase.patient_id}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold">
                <AlertTriangle size={13} /> No patient PID linked to this case
              </span>
            )}

            {patientLoading && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-xs font-bold">
                <Loader2 size={12} className="animate-spin" /> Fetching patient record…
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

            {patientError && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-bold">
                <AlertTriangle size={13} /> Patient record not found for this PID
              </span>
            )}

            {selectedCase.clinic_of_origin && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs font-bold">
                <Building2 size={13} /> {selectedCase.clinic_of_origin}
              </span>
            )}

            {selectedCase.required_date && (
              <span className="ml-auto text-[11px] font-bold text-slate-400">
                Target delivery: {format(parseISO(selectedCase.required_date), 'dd MMM yyyy')}
              </span>
            )}

            <div className="w-full flex justify-end">
              <SaveIndicator />
            </div>
          </div>
        )}
      </div>

      {/* Odontogram */}
      {selectedCase ? (
        <DentalLabOdontogram
          odontogramData={odontogramMap}
          onChange={canEdit ? handleOdontogramChange : undefined}
          readOnly={!canEdit}
          patientName={patient?.full_name || selectedCase.clinician_name || ''}
          caseRef={selectedCase.case_ref}
          caseContext={{
            patientAge: patient?.age,
            patientGender: patient?.gender,
            workDone: selectedCase.work_done,
            clinicOfOrigin: selectedCase.clinic_of_origin,
          }}
        />
      ) : (
        <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-12 flex flex-col items-center justify-center text-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center">
            <Wrench size={24} />
          </div>
          <h3 className="text-sm font-black text-slate-700">No case connected yet</h3>
          <p className="text-xs text-slate-400 max-w-sm">
            Search and select a logged prosthetics case above to open its FDI odontogram,
            linked to the case's patient PID and record details. Charting is saved directly
            to that case.
          </p>
        </div>
      )}
    </div>
  );
};

export default ProstheticsOdontogramWorkspace;
