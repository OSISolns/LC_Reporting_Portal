import React, { useEffect, useState, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import {
  ArrowLeft, Save, Printer, Plus, Loader2, FileText,
  Sparkles, X, ChevronRight, BookOpen, Stethoscope, ClipboardList, MessageSquare,
  ShieldCheck, ShieldX, Shield, QrCode, Copy, CheckCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { INSURANCES } from './refunds/constants';
import Modal from '../components/Modal';

// 30-minute interval time options for dropdowns
const TIME_OPTIONS = (() => {
  const opts = [{ value: '', label: '-- Time --' }];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 30]) {
      const hh = String(h).padStart(2, '0');
      const mm = String(m).padStart(2, '0');
      opts.push({ value: `${hh}:${mm}`, label: `${hh}:${mm}` });
    }
  }
  return opts;
})();

const ClinicalSheet = ({ embeddedPatientId, embeddedQueueId, isEmbedded, embeddedTab, onSaveSuccess }) => {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryParams = new URLSearchParams(location.search);

  const patientId = embeddedPatientId || params.patientId;
  const queue_id = embeddedQueueId || queryParams.get('queue_id');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [patient, setPatient] = useState(null);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiCommentsLoading, setAiCommentsLoading] = useState(false);
  const [aiSbarLoading, setAiSbarLoading] = useState(false);
  const [aiProgressNoteLoading, setAiProgressNoteLoading] = useState(false);
  // AI Drawer
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
  const [frequencies, setFrequencies] = useState([]);
  const [medSuggestions, setMedSuggestions] = useState([]);
  const [medSugLoading, setMedSugLoading] = useState(false);

  // ── Document Verification ────────────────────────────────────────────────
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [docInfo, setDocInfo] = useState(null);          // { checksum, docRef, qrCodeDataUrl, ... }
  const [docInfoLoading, setDocInfoLoading] = useState(false);
  const [verifyInput, setVerifyInput] = useState('');     // user pastes: "LC-CLN-00001|CHECKSUM"
  const [verifyResult, setVerifyResult] = useState(null); // result from API
  const [verifying, setVerifying] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const [sheetStatus, setSheetStatus] = useState('Draft');
  const [hasReported, setHasReported] = useState(false);
  const [hasReceived, setHasReceived] = useState(false);

  const { register, control, handleSubmit, reset } = useForm({
    defaultValues: {
      identification: {
        last_name: '',
        first_name: '',
        occupation: '',
        national_id: '',
        dob: '',
        gender: '',
        pid: '',
        appt_date_no: 'Walk-in / No Appointment',
        insurance: '',
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        rn: ''
      },
      triage: {
        prev_illness_med: '',
        prev_illness_surg: '',
        allergy_1: '',
        allergy_2: '',
        temp: '',
        pulse: '',
        rr: '',
        bp: '',
        weight: '',
        spo2: '',
        general_comments: ''
      },
      progress_notes: [
        { datetime: '', note: '', signature: '' }
      ],
      medication_mar: {
        interventions: [
          { name: '', dose: '', frequency: '', route: '', start_time: '', end_time: '' }
        ],
        prescriber: '',
        admin_logs: [
          { time: '', initials: '' }
        ],
        admin_initials: '',
        admin_names: ''
      },
      sbar: {
        content: '',
        reported_by: '',
        reported_sign_time: '',
        received_by: '',
        received_sign_time: ''
      }
    }
  });

  const { fields: progressFields, append: appendProgress } = useFieldArray({
    control, name: "progress_notes"
  });

  const { fields: interventionFields } = useFieldArray({
    control, name: "medication_mar.interventions"
  });

  const { fields: logFields, append: appendLog } = useFieldArray({
    control, name: "medication_mar.admin_logs"
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [patientRes, vitalsRes, sheetRes, inventoryRes] = await Promise.all([
          api.get(`/patients/${patientId}`),
          api.get(`/patients/${patientId}/vitals`).catch(() => ({ data: null })),
          api.get(`/clinical/observations/${patientId}?queue_id=${queue_id}`).catch(() => ({ data: null })),
          api.get('/clinical/inventory/items').catch(() => ({ data: { data: [] } }))
        ]);

        const patientObj = patientRes.data?.data || patientRes.data || {};
        setPatient(patientObj);

        if (inventoryRes.data && inventoryRes.data.data) {
          setInventoryItems(inventoryRes.data.data);
        }

        if (sheetRes.data && sheetRes.data.data) {
          reset(sheetRes.data.data);
          setSheetStatus(sheetRes.data.data.status || 'Draft');
          setHasReported(!!sheetRes.data.data.sbar?.reported_by);
          setHasReceived(!!sheetRes.data.data.sbar?.received_by);
        } else {
          const latestVitals = (vitalsRes.data?.data || vitalsRes.data || [])[0] || {};

          const fullName = patientObj.full_name || '';
          const nameParts = fullName.trim().split(/\s+/);
          const lastName = nameParts[0] || '';
          const firstName = nameParts.slice(1).join(' ') || '';

          const formatDobForInput = (dobVal) => {
            if (!dobVal) return '';
            // If it's already YYYY-MM-DD
            if (dobVal.includes('-') && dobVal.split('-')[0].length === 4) {
              return dobVal.substring(0, 10);
            }
            // If it's DD/MM/YYYY
            if (dobVal.includes('/')) {
              const parts = dobVal.split('/');
              if (parts.length === 3) {
                const day = parts[0].padStart(2, '0');
                const month = parts[1].padStart(2, '0');
                const year = parts[2];
                return `${year}-${month}-${day}`;
              }
            }
            return dobVal;
          };

          reset({
            identification: {
              last_name: lastName || patientObj.last_name || '',
              first_name: firstName || patientObj.first_name || '',
              occupation: patientObj.occupation || '',
              national_id: patientObj.national_id || '',
              dob: formatDobForInput(patientObj.dob),
              gender: patientObj.gender || '',
              pid: patientId,
              appt_date_no: 'Walk-in / No Appointment',
              insurance: patientObj.insurance || patientObj.insurance_provider || '',
              date: new Date().toISOString().split('T')[0],
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              rn: user?.name || ''
            },
            triage: {
              prev_illness_med: '',
              prev_illness_surg: '',
              allergy_1: patientObj.allergies || '',
              allergy_2: '',
              temp: latestVitals.temperature || '',
              pulse: latestVitals.pulse || '',
              rr: latestVitals.respiratory_rate || '',
              bp: latestVitals.blood_pressure || '',
              weight: latestVitals.weight || '',
              spo2: latestVitals.spo2 || '',
              general_comments: ''
            },
            progress_notes: [
              { datetime: '', note: '', signature: '' }
            ],
            medication_mar: {
              interventions: Array(4).fill({ name: '', dose: '', frequency: '', route: '', start_time: '', end_time: '' }),
              prescriber: '',
              admin_logs: Array(8).fill({ time: '', initials: '' }),
              admin_initials: '',
              admin_names: ''
            },
            sbar: {
              content: '',
              reported_by: '',
              reported_sign_time: '',
              received_by: '',
              received_sign_time: ''
            }
          });
        }
      } catch (error) {
        toast.error("Failed to load patient data.");
      } finally {
        setLoading(false);
      }
    };
    if (patientId) fetchData();
  }, [patientId, queue_id, reset, user]);

  const onSubmit = async (data) => {
    try {
      setSaving(true);
      const nowStr = new Date().toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });

      if (!data.sbar) data.sbar = {};
      if (!data.sbar.reported_by) {
        const baseName = user?.fullName || user?.name || '';
        data.sbar.reported_by = baseName ? `${baseName} (${nowStr})` : '';
      }
      if (!data.sbar.reported_sign_time) {
        data.sbar.reported_sign_time = nowStr;
      }

      await api.post(`/clinical/observations/${patientId}`, { ...data, queue_id, patient_id: patientId });
      setHasReported(true);
      toast.success("Saved successfully");
      reset(data);
      if (onSaveSuccess) onSaveSuccess();
    } catch (error) {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleVerifySheet = async () => {
    try {
      setSaving(true);
      const nowStr = new Date().toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });

      const currentValues = control._formValues;
      if (!currentValues.sbar) currentValues.sbar = {};
      
      const baseReported = currentValues.sbar.reported_by || user?.fullName || user?.name || '';
      // Only append if it doesn't already contain a timestamp
      const reportedBy = baseReported && !baseReported.includes('(') ? `${baseReported} (${nowStr})` : baseReported;
      const reportedSignTime = currentValues.sbar.reported_sign_time || nowStr;
      
      const baseReceived = user?.fullName || user?.name || 'Chef Nurse';
      const receivedBy = `${baseReceived} (${nowStr})`;
      const receivedSignTime = nowStr;

      const dataToSave = {
        ...currentValues,
        status: 'Verified',
        queue_id,
        patient_id: patientId,
        sbar: {
          ...currentValues.sbar,
          reported_by: reportedBy,
          reported_sign_time: reportedSignTime,
          received_by: receivedBy,
          received_sign_time: receivedSignTime
        }
      };

      await api.post(`/clinical/observations/${patientId}`, dataToSave);
      setSheetStatus('Verified');
      setHasReported(true);
      setHasReceived(true);
      reset(dataToSave);
      toast.success("Sheet verified successfully!");
      if (onSaveSuccess) onSaveSuccess();
    } catch (error) {
      toast.error("Failed to verify sheet");
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      toast.loading("Generating PDF...", { id: 'pdf-toast' });
      const response = await api.get(`/clinical/observations/${patientId}/pdf?queue_id=${queue_id}`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ClinicalSheet_${patientId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("PDF Downloaded", { id: 'pdf-toast' });
    } catch (error) {
      console.error("PDF Error:", error);
      toast.error("Failed to generate PDF", { id: 'pdf-toast' });
    }
  };

  // ── Show the authenticity modal (load QR + checksum for current doc) ──
  const handleShowVerify = async () => {
    setVerifyModalOpen(true);
    setVerifyResult(null);
    setVerifyInput('');
    if (docInfo) return; // already loaded
    try {
      setDocInfoLoading(true);
      const res = await api.get(`/clinical/observations/${patientId}/checksum?queue_id=${queue_id}`);
      if (res.data?.success) setDocInfo(res.data);
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Could not load document authenticity info. Make sure it is verified first.';
      toast.error(errMsg);
      setDocInfo(null);
    } finally {
      setDocInfoLoading(false);
    }
  };

  // ── Verify a code entered by the user ──────────────────────────────────
  const handleVerify = async () => {
    const raw = verifyInput.trim();
    if (!raw) { toast.error('Enter a document code to verify.'); return; }
    // Accept either full QR payload (LC-CLN-00001|CHECKSUM) or just the checksum
    const parts = raw.split('|');
    const checksumToVerify = parts.length === 2 ? parts[1].trim() : parts[0].trim();
    if (!checksumToVerify) { toast.error('Could not parse checksum from input.'); return; }
    try {
      setVerifying(true);
      setVerifyResult(null);
      const res = await api.get(
        `/clinical/observations/${patientId}/verify?queue_id=${queue_id}&checksum=${encodeURIComponent(checksumToVerify)}`
      );
      setVerifyResult(res.data);
    } catch (err) {
      const msg = err.response?.data?.message || 'Verification failed.';
      setVerifyResult({ verified: false, message: msg, error: true });
    } finally {
      setVerifying(false);
    }
  };

  const handleCopyChecksum = () => {
    if (!docInfo) return;
    navigator.clipboard.writeText(`${docInfo.docRef}|${docInfo.checksum}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Load frequency legend once drawer opens ────────────────────────────────
  const loadFrequencies = async () => {
    if (frequencies.length) return;
    try {
      const res = await api.get('/ai/clinical/frequencies');
      if (res.data?.success) setFrequencies(res.data.data);
    } catch (_) { }
  };

  const openAiDrawer = () => { setAiDrawerOpen(true); loadFrequencies(); };

  // ── Medication suggestions (rich backend) ───────────────────────────────────
  const handleMedSuggest = async () => {
    const interventions = control._formValues.medication_mar?.interventions || [];
    const medicationNames = interventions.map(i => i.name).filter(n => n?.trim());
    if (!medicationNames.length) { toast.error('Enter at least one medication name first.'); return; }
    setMedSugLoading(true);
    try {
      const res = await api.post('/ai/clinical/medications', { medications: medicationNames });
      if (res.data?.success) {
        setMedSuggestions(res.data.data);
        toast.success('AI medication suggestions ready!');
      }
    } catch { toast.error('Failed to get suggestions.'); }
    finally { setMedSugLoading(false); }
  };

  // Apply a single suggestion into the form
  const applyMedSuggestion = (sug, colIdx) => {
    const current = [...(control._formValues.medication_mar?.interventions || [])];
    if (current[colIdx]) {
      if (!current[colIdx].dose) current[colIdx].dose = sug.dose;
      if (!current[colIdx].route) current[colIdx].route = sug.route;
      if (!current[colIdx].frequency) current[colIdx].frequency = sug.frequency;
      reset({ ...control._formValues, medication_mar: { ...control._formValues.medication_mar, interventions: current } });
      toast.success(`Applied: ${sug.name}`);
    }
  };

  // Apply ALL suggestions at once
  const handleApplyAI = async () => {
    try {
      const interventions = control._formValues.medication_mar?.interventions || [];
      const medicationNames = interventions.map(i => i.name).filter(n => n?.trim());
      if (!medicationNames.length) { toast.error('Enter at least one medication name first.'); return; }
      setAiLoading(true);
      const res = await api.post('/ai/clinical/medications', { medications: medicationNames });
      if (res.data?.success) {
        const suggestions = res.data.data;
        const current = [...interventions];
        let si = 0;
        current.forEach(item => {
          if (item.name?.trim()) {
            const sug = suggestions[si++];
            if (sug) {
              if (!item.dose) item.dose = sug.dose;
              if (!item.route) item.route = sug.route;
              if (!item.frequency) item.frequency = sug.frequency;
            }
          }
        });
        reset({ ...control._formValues, medication_mar: { ...control._formValues.medication_mar, interventions: current } });
        toast.success('AI doses & routes applied!');
      }
    } catch { toast.error('Failed to fetch AI suggestions.'); }
    finally { setAiLoading(false); }
  };

  const handleAIGenerateComments = async () => {
    setAiCommentsLoading(true);
    try {
      const vitals = control._formValues.triage || {};
      const res = await api.post('/ai/clinical/assessment', { vitals });
      if (res.data?.success) {
        reset({ ...control._formValues, triage: { ...control._formValues.triage, general_comments: res.data.data.comment } });
        toast.success('AI assessment generated');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to generate assessment.';
      toast.error(msg);
    } finally { setAiCommentsLoading(false); }
  };

  const handleAIGenerateSBAR = async () => {
    setAiSbarLoading(true);
    try {
      const values = control._formValues;
      const res = await api.post('/ai/clinical/sbar', {
        identification: values.identification,
        triage: values.triage,
        progress_notes: values.progress_notes,
        medication_mar: values.medication_mar,
      });
      if (res.data?.success) {
        reset({ ...values, sbar: { ...values.sbar, content: res.data.data.sbar } });
        toast.success('AI SBAR generated');
      }
    } catch { toast.error('Failed to generate SBAR.'); }
    finally { setAiSbarLoading(false); }
  };

  const handleAIGenerateProgressNote = async () => {
    setAiProgressNoteLoading(true);
    try {
      const values = control._formValues;
      const res = await api.post('/ai/clinical/note', {
        vitals: values.triage,
        medications: values.medication_mar?.interventions,
        existingComments: values.triage?.general_comments,
      });
      if (res.data?.success) {
        const note = res.data.data.note;
        const currentNotes = [...(values.progress_notes || [])];
        const emptyIdx = currentNotes.findIndex(n => !n.note?.trim() && !n.datetime && !n.signature);
        const entry = { datetime: new Date().toISOString().slice(0, 16), note, signature: user?.fullName || 'AI Assisted' };
        if (emptyIdx >= 0) currentNotes[emptyIdx] = entry;
        else currentNotes.push(entry);
        reset({ ...values, progress_notes: currentNotes });
        toast.success('AI clinical note generated');
      }
    } catch { toast.error('Failed to generate note.'); }
    finally { setAiProgressNoteLoading(false); }
  };

  if (loading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
  }

  return (
    <div className={isEmbedded ? "font-sans pb-4" : "min-h-screen bg-slate-50 font-sans pb-10"}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; margin: 0; padding: 0; }
          .sheet-container { box-shadow: none; border: none; padding: 0; width: 100%; max-width: 100%; }
        }
        .form-input { border: 1px solid #ccc; padding: 2px 4px; font-size: 12px; outline: none; width: 100%; }
        .form-input:focus { border-color: #2563eb; }
        .form-label { font-size: 12px; color: #333; white-space: nowrap; margin-right: 4px; }
        .row-flex { display: flex; align-items: center; margin-bottom: 2px; }
        .section-header { background-color: #223f85; color: white; padding: 4px 8px; font-weight: bold; font-size: 13px; margin-top: 12px; margin-bottom: 8px; }
        .grid-layout { display: grid; grid-template-columns: auto 1fr; gap: 4px; align-items: center; }
      `}</style>

      {/* Top Bar */}
      {!isEmbedded && (
        <div className="bg-slate-100 border-b p-3 flex justify-between items-center no-print">
          <button onClick={() => navigate(-1)} className="flex items-center text-sm font-medium text-slate-600 hover:text-slate-900 bg-white px-3 py-1.5 rounded border shadow-sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Dashboard
          </button>
          <div className="flex items-center gap-2 text-[#1b669d] font-bold text-lg">
            <FileText className="h-5 w-5" /> Clinical Sheet
          </div>
          <div className="flex gap-2">
            {!(sheetStatus === 'Verified' && user?.role !== 'chef-nurse') ? (
              <button onClick={handleSubmit(onSubmit)} disabled={saving} className="flex items-center text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 px-4 py-1.5 rounded shadow-sm">
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />} Save Draft
              </button>
            ) : (
              <div className="flex items-center text-xs font-bold text-slate-400 bg-slate-100 px-4 py-1.5 rounded border border-slate-200 shadow-sm select-none">
                Locked
              </div>
            )}
            
            {user?.role === 'chef-nurse' && sheetStatus !== 'Verified' && (
              <button onClick={handleVerifySheet} disabled={saving} className="flex items-center text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 px-4 py-1.5 rounded shadow-sm">
                <CheckCircle className="h-4 w-4 mr-2" /> Verify Sheet
              </button>
            )}

            {sheetStatus === 'Verified' ? (
              <button onClick={handleDownloadPdf} className="flex items-center text-sm font-medium text-white bg-[#1b669d] hover:bg-blue-800 px-4 py-1.5 rounded shadow-sm">
                <FileText className="h-4 w-4 mr-2" /> Download PDF
              </button>
            ) : (
              <button disabled className="flex items-center text-sm font-medium text-slate-400 bg-slate-100 px-4 py-1.5 rounded border border-slate-200 cursor-not-allowed shadow-sm" title="Only available after Chef Nurse verification">
                <FileText className="h-4 w-4 mr-2" /> PDF Locked
              </button>
            )}

            <button onClick={handleShowVerify} className="flex items-center text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-4 py-1.5 rounded border border-emerald-200 shadow-sm">
              <ShieldCheck className="h-4 w-4 mr-2" /> Authenticate
            </button>
          </div>
        </div>
      )}

      {/* Sheet Container */}
      <div className={isEmbedded ? "sheet-container bg-white w-full p-4 relative" : "sheet-container bg-white mx-auto mt-6 border shadow-sm max-w-[850px] p-8 pb-12"}>
        {isEmbedded && (
          <div className="absolute top-4 right-4 no-print">
            <button
              onClick={handleDownloadPdf}
              className="flex items-center text-[10px] font-bold text-white bg-[#1b669d] hover:bg-blue-800 px-2 py-1 rounded shadow-sm"
              title="Download PDF"
            >
              <FileText className="h-3 w-3 mr-1" /> PDF
            </button>
          </div>
        )}

        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-slate-800 tracking-wide">PATIENT OBSERVATION RECORDS SHEET</h1>
          <p className="text-xs text-slate-500">Legacy Clinics & Diagnostics • Nurse Assessment</p>
        </div>

        {sheetStatus === 'Verified' && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-start gap-3 text-xs leading-normal no-print">
            <ShieldCheck className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Verified Clinical Sheet</p>
              <p className="text-emerald-700">
                {user?.role === 'chef-nurse' 
                  ? "This sheet has been verified and locked. As a Chef Nurse, you retain permission to edit."
                  : "This sheet has been verified and is locked. Alterations are restricted to the Chef Nurse only."}
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <fieldset disabled={sheetStatus === 'Verified' && user?.role !== 'chef-nurse'} className="border-0 p-0 m-0 min-w-0 disabled:opacity-100">
            {/* Section I & II: Patient Identification, Assessment & Notes */}
            {/* Section I */}
            <div className="section-header">I. Patient Identification</div>
          <div className="px-1 w-[400px]">
            <div className="row-flex"><span className="form-label w-28">Last name</span><input {...register('identification.last_name')} className="form-input" /></div>
            <div className="row-flex"><span className="form-label w-28">First name</span><input {...register('identification.first_name')} className="form-input" /></div>
            <div className="row-flex"><span className="form-label w-28">Occupation</span><input {...register('identification.occupation')} className="form-input" /></div>
            <div className="row-flex"><span className="form-label w-28">National ID / Passport</span><input {...register('identification.national_id')} className="form-input" /></div>
            <div className="row-flex"><span className="form-label w-28">Date of birth</span><input {...register('identification.dob')} type="date" className="form-input w-[150px]" /></div>
            <div className="row-flex"><span className="form-label w-28">Gender</span><input {...register('identification.gender')} className="form-input w-[120px]" /></div>
            <div className="row-flex"><span className="form-label w-28">Patient ID (PID)</span><input {...register('identification.pid')} className="form-input" /></div>
            <div className="row-flex"><span className="form-label w-28">Appt. Date & No.</span><input {...register('identification.appt_date_no')} className="form-input" /></div>
            <div className="row-flex">
              <span className="form-label w-28">Health insurance</span>
              <select {...register('identification.insurance')} className="form-input">
                <option value="">Select Insurance / Payer</option>
                {INSURANCES.map(ins => (
                  <option key={ins} value={ins}>{ins}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="px-1 mt-1">
            <div className="form-label mb-1">Date/Time/RN</div>
            <div className="flex gap-2 w-full max-w-md">
              <input type="date" {...register('identification.date')} className="form-input flex-1" />
              <select {...register('identification.time')} className="form-input flex-1">
                {TIME_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="mt-1 w-[200px]">
              <input {...register('identification.rn')} placeholder="RN" className="form-input" />
            </div>
          </div>

          <div className="px-1 mt-3">
            <div className="form-label font-bold mb-1">Nursing Assessment</div>
            <div className="flex gap-4 mb-1">
              <div className="flex-1"><input {...register('triage.prev_illness_med')} placeholder="Previous illness (Medical)" className="form-input" /></div>
              <div className="flex-1"><input {...register('triage.prev_illness_surg')} placeholder="Previous illness (Surgical)" className="form-input" /></div>
            </div>
            <div className="flex gap-4 mb-2">
              <div className="flex-1"><input {...register('triage.allergy_1')} placeholder="Allergy (1)" className="form-input" /></div>
              <div className="flex-1"><input {...register('triage.allergy_2')} placeholder="Allergy (2)" className="form-input" /></div>
            </div>

            <div className="flex gap-4 mb-1">
              <div className="flex-1 row-flex"><span className="form-label w-24">Temp</span><input {...register('triage.temp')} className="form-input" /></div>
              <div className="flex-1 row-flex"><span className="form-label w-24">Pulse</span><input {...register('triage.pulse')} className="form-input" /></div>
              <div className="flex-1 row-flex"><span className="form-label w-24">Respiratory Rate</span><input {...register('triage.rr')} className="form-input" /></div>
            </div>
            <div className="flex gap-4 mb-2">
              <div className="flex-1 row-flex"><span className="form-label w-24">Blood Pressure</span><input {...register('triage.bp')} className="form-input" /></div>
              <div className="flex-1 row-flex"><span className="form-label w-24">Weight (Kg)</span><input {...register('triage.weight')} className="form-input" /></div>
              <div className="flex-1 row-flex"><span className="form-label w-24">SpO2</span><input {...register('triage.spo2')} className="form-input" /></div>
            </div>

            <div className="w-full mt-2">
              <div className="flex justify-between items-center mb-1">
                <div className="form-label mb-0">General comments</div>
                <button type="button" onClick={handleAIGenerateComments} disabled={aiCommentsLoading || (sheetStatus === 'Verified' && user?.role !== 'chef-nurse')} className="text-[10px] bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-0.5 rounded flex items-center shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                  {aiCommentsLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <span className="mr-1"></span>}
                  Assess Vitals
                </button>
              </div>
              <textarea {...register('triage.general_comments')} className="form-input min-h-[60px] resize-none" placeholder="Enter comments or use AI to generate based on the vitals above..." />
            </div>
          </div>

          {/* Section II */}
          <div className="section-header flex justify-between items-center pr-2">
            <span>Progress / Clinical Notes</span>
            <button type="button" onClick={handleAIGenerateProgressNote} disabled={aiProgressNoteLoading || (sheetStatus === 'Verified' && user?.role !== 'chef-nurse')} className="text-[10px] bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-0.5 rounded flex items-center shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
              {aiProgressNoteLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <span className="mr-1"></span>}
              Generate Note
            </button>
          </div>
          <div className="px-1">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-left text-xs font-bold p-1 w-40">Date & Time</th>
                  <th className="text-left text-xs font-bold p-1">Clinical Note</th>
                  <th className="text-left text-xs font-bold p-1 w-48">Name / Signature</th>
                </tr>
              </thead>
              <tbody>
                {progressFields.map((field, idx) => (
                  <tr key={field.id} className="align-top">
                    <td className="p-1"><input {...register(`progress_notes.${idx}.datetime`)} type="datetime-local" className="form-input text-[11px]" /></td>
                    <td className="p-1"><textarea {...register(`progress_notes.${idx}.note`)} className="form-input min-h-[40px] resize-none" /></td>
                    <td className="p-1"><input {...register(`progress_notes.${idx}.signature`)} className="form-input" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!(sheetStatus === 'Verified' && user?.role !== 'chef-nurse') && (
              <button type="button" onClick={() => appendProgress({ datetime: '', note: '', signature: '' })} className="text-blue-600 text-xs font-bold flex items-center mt-1 no-print">
                <Plus className="h-3 w-3 mr-1" /> Add Note Row
              </button>
            )}
          </div>

          {/* Section III: Prescription and Medication Administration Record  (MAR)  (MAR) */}
          <div className="section-header flex justify-between items-center pr-2">
            <span>Prescription and Medication Administration Record  (MAR) </span>
            <button type="button" onClick={handleApplyAI} disabled={aiLoading || (sheetStatus === 'Verified' && user?.role !== 'chef-nurse')} className="text-[10px] bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-0.5 rounded flex items-center shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
              {aiLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <span className="mr-1"></span>}
              Suggest Doses & Routes
            </button>
          </div>
          <div className="px-1">
            <datalist id="inventory-list">
              {inventoryItems.map((item, i) => (
                <option key={i} value={item} />
              ))}
            </datalist>
            <table className="w-full border-collapse border border-slate-300 text-xs text-center">
              <thead>
                <tr>
                  <th className="border border-slate-300 p-1 w-24 bg-slate-50">Field</th>
                  <th className="border border-slate-300 p-1">Medication 1</th>
                  <th className="border border-slate-300 p-1">Medication 2</th>
                  <th className="border border-slate-300 p-1">Medication 3</th>
                  <th className="border border-slate-300 p-1">Medication 4</th>
                </tr>
              </thead>
              <tbody>
                {['Name', 'Dose', 'Frequency', 'Route', 'Start Time', 'End Time'].map((rowLabel, rIdx) => {
                  const keys = ['name', 'dose', 'frequency', 'route', 'start_time', 'end_time'];
                  const isTimeRow = rIdx === 4 || rIdx === 5;
                  return (
                    <tr key={rowLabel}>
                      <td className="border border-slate-300 p-1 font-bold bg-slate-50 text-left">{rowLabel}</td>
                      {[0, 1, 2, 3].map((colIdx) => (
                        <td key={colIdx} className="border border-slate-300 p-1">
                          {rIdx === 0 ? (
                            <input {...register(`medication_mar.interventions.${colIdx}.${keys[rIdx]}`)} list="inventory-list" className="w-full border-none outline-none text-center bg-transparent" placeholder="Type..." />
                          ) : isTimeRow ? (
                            <select {...register(`medication_mar.interventions.${colIdx}.${keys[rIdx]}`)} className="w-full border-none outline-none text-center bg-transparent text-[11px] cursor-pointer">
                              {TIME_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                          ) : (
                            <input {...register(`medication_mar.interventions.${colIdx}.${keys[rIdx]}`)} className="w-full border-none outline-none text-center bg-transparent" />
                          )}
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <div className="mt-1">
              <input {...register('medication_mar.prescriber')} placeholder="Prescriber Name & Signature" className="form-input w-80" />
            </div>

            <div className="mt-4 flex gap-8">
              <table className="border-collapse border border-slate-300 text-xs text-center w-[250px]">
                <thead>
                  <tr>
                    <th className="border border-slate-300 p-1 bg-slate-50 w-20">Time</th>
                    <th className="border border-slate-300 p-1 bg-slate-50">Administered by (Initials)</th>
                  </tr>
                </thead>
                <tbody>
                  {logFields.map((field, idx) => (
                    <tr key={field.id}>
                      <td className="border border-slate-300 p-0">
                        <select {...register(`medication_mar.admin_logs.${idx}.time`)} className="w-full border-none outline-none text-center h-5 text-[10px] bg-transparent cursor-pointer">
                          {TIME_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </td>
                      <td className="border border-slate-300 p-0"><input {...register(`medication_mar.admin_logs.${idx}.initials`)} placeholder="Initials" className="w-full border-none outline-none text-center h-5 text-[10px]" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex-1 pt-4">
                <div className="flex gap-4">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold mb-1">Initials</span>
                    <input {...register('medication_mar.admin_initials')} className="form-input w-24" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold mb-1">Initials Interpretation (Full Names)</span>
                    <input {...register('medication_mar.admin_names')} className="form-input w-64" />
                  </div>
                </div>
                {!(sheetStatus === 'Verified' && user?.role !== 'chef-nurse') && (
                  <button type="button" onClick={() => appendLog({ time: '', initials: '' })} className="text-blue-600 text-xs font-bold flex items-center mt-4 no-print">
                    <Plus className="h-3 w-3 mr-1" /> Add Initials Row
                  </button>
                )}
              </div>
            </div>

            <div className="mt-6 bg-blue-50 border border-blue-100 p-3 rounded text-[10px] text-slate-700">
              <p className="font-bold mb-2 text-blue-800">Drug Administration Frequency Legend:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-0.5">

                <div className="col-span-2 text-[9px] font-bold text-blue-700 uppercase tracking-widest mt-1 mb-0.5 border-b border-blue-200 pb-0.5">Frequency Abbreviations</div>
                <div><span className="font-bold">STAT:</span> Immediately — single urgent dose, given at once.</div>
                <div><span className="font-bold">OD / QD / Daily:</span> Once every 24 hours (e.g., 08:00).</div>
                <div><span className="font-bold">BD / BID:</span> Twice daily — 12 h apart (e.g., 08:00 &amp; 20:00).</div>
                <div><span className="font-bold">TDS / TID:</span> Three times daily — 8 h apart (e.g., 08:00, 14:00, 20:00).</div>
                <div><span className="font-bold">QID / QDS:</span> Four times daily — 6 h apart (e.g., 06:00, 12:00, 18:00, 00:00).</div>
                <div><span className="font-bold">Q4H:</span> Every 4 hours — 6 doses per day (e.g., antibiotics, analgesics).</div>
                <div><span className="font-bold">Q6H:</span> Every 6 hours — 4 doses per day.</div>
                <div><span className="font-bold">Q8H:</span> Every 8 hours — 3 doses per day.</div>
                <div><span className="font-bold">Q12H:</span> Every 12 hours — equivalent to BD.</div>
                <div><span className="font-bold">PRN / SOS:</span> As needed / when required — only when symptom occurs.</div>
                <div><span className="font-bold">AC:</span> Before meals (ante cibum) — usually 30 min before eating.</div>
                <div><span className="font-bold">PC:</span> After meals (post cibum) — reduces GI upset.</div>
                <div><span className="font-bold">HS / QHS:</span> At bedtime / hour of sleep (hora somni).</div>
                <div><span className="font-bold">Loading Dose:</span> Initial high dose to rapidly achieve therapeutic levels.</div>
                <div><span className="font-bold">Maintenance Dose:</span> Regular dose to sustain therapeutic level after loading.</div>
                <div><span className="font-bold">Alternate Days (QOD):</span> Every other day (e.g., methotrexate).</div>
                <div><span className="font-bold">Weekly (Q1W):</span> Once per week (e.g., methotrexate, some vitamins).</div>
                <div><span className="font-bold">Single Dose:</span> One-time dose only — no repeat (e.g., fluconazole 150mg).</div>

                <div className="col-span-2 text-[9px] font-bold text-blue-700 uppercase tracking-widest mt-2 mb-0.5 border-b border-blue-200 pb-0.5">Route Abbreviations</div>
                <div><span className="font-bold">PO (Per Os):</span> By mouth / oral — tablets, capsules, syrups.</div>
                <div><span className="font-bold">IV (Intravenous):</span> Directly into a vein — fastest onset.</div>
                <div><span className="font-bold">IVI:</span> Intravenous infusion — slow drip over a set time.</div>
                <div><span className="font-bold">IM (Intramuscular):</span> Injected into muscle (e.g., deltoid, gluteal).</div>
                <div><span className="font-bold">SC / SQ (Subcutaneous):</span> Under the skin (e.g., insulin, heparin).</div>
                <div><span className="font-bold">SL (Sublingual):</span> Under the tongue for rapid absorption (e.g., GTN).</div>
                <div><span className="font-bold">PR (Per Rectum):</span> Via the rectum — suppositories or enemas.</div>
                <div><span className="font-bold">PV (Per Vaginum):</span> Vaginally — pessaries or gels.</div>
                <div><span className="font-bold">Neb (Nebulisation):</span> Inhaled via nebuliser (e.g., salbutamol, ipratropium).</div>
                <div><span className="font-bold">Top (Topical):</span> Applied on skin — creams, ointments, patches.</div>
                <div><span className="font-bold">ID (Intradermal):</span> Into skin layers — used for skin tests (e.g., PPD/Mantoux).</div>
                <div><span className="font-bold">NG (Nasogastric):</span> Via nasogastric tube directly into stomach.</div>

                <div className="col-span-2 text-[9px] font-bold text-blue-700 uppercase tracking-widest mt-2 mb-0.5 border-b border-blue-200 pb-0.5">Common Clinical Notes</div>
                <div><span className="font-bold">NKA:</span> No Known Allergies — confirm before administering.</div>
                <div><span className="font-bold">NKDA:</span> No Known Drug Allergies — document clearly.</div>
                <div><span className="font-bold">MAR:</span> Medication Administration Record — this form.</div>
                <div><span className="font-bold">Max Dose:</span> The highest safe single or daily amount — do not exceed.</div>
                <div><span className="font-bold">Titrate:</span> Gradually adjust dose up or down based on patient response.</div>
                <div><span className="font-bold">Taper:</span> Gradually reduce dose before stopping (e.g., steroids).</div>
              </div>
            </div>
          </div>

          {/* Section IV: SBAR Hand Over Report */}
          <div className="section-header flex justify-between items-center pr-2">
            <span>SBAR Hand Over Report</span>
            <button type="button" onClick={handleAIGenerateSBAR} disabled={aiSbarLoading || (sheetStatus === 'Verified' && user?.role !== 'chef-nurse')} className="text-[10px] bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-0.5 rounded flex items-center shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
              {aiSbarLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <span className="mr-1"></span>}
              Generate SBAR
            </button>
          </div>
          <div className="px-1">
            <div className="form-label mb-1">Situation, Background, Assessment & Recommendation</div>
            <textarea 
              {...register('sbar.content')} 
              disabled={sheetStatus === 'Verified' && user?.role !== 'chef-nurse'}
              className="form-input min-h-[160px] resize-none w-full disabled:bg-slate-100 disabled:text-slate-500" 
              placeholder="Click 'AI Generate SBAR' to automatically draft a hand over report based on this sheet..." 
            />

             <div className="flex gap-4 mt-2">
              <div className="flex-1 flex items-center border border-slate-300 bg-slate-50/50">
                <span className="text-[11px] text-slate-500 px-2 min-w-[70px]">Reported by</span>
                <input 
                  {...register('sbar.reported_by')} 
                  disabled={sheetStatus === 'Verified' && user?.role !== 'chef-nurse'}
                  className="flex-1 border-none outline-none py-1 px-2 text-[11px] disabled:bg-slate-100 disabled:text-slate-500" 
                />
              </div>
              <div className="flex-1 flex items-center border border-slate-300 bg-slate-50/50">
                <span className="text-[11px] text-slate-500 px-2 min-w-[120px]">Reported sign. & time</span>
                <input 
                  {...register('sbar.reported_sign_time')} 
                  disabled={sheetStatus === 'Verified' && user?.role !== 'chef-nurse'}
                  className="flex-1 border-none outline-none py-1 px-2 text-[11px] disabled:bg-slate-100 disabled:text-slate-500" 
                />
              </div>
            </div>
            <div className="flex gap-4 mt-1">
              <div className="flex-1 flex items-center border border-slate-300 bg-slate-50/50">
                <span className="text-[11px] text-slate-500 px-2 min-w-[70px]">Received by</span>
                <input 
                  {...register('sbar.received_by')} 
                  disabled={sheetStatus === 'Verified' && user?.role !== 'chef-nurse'}
                  className="flex-1 border-none outline-none py-1 px-2 text-[11px] disabled:bg-slate-100 disabled:text-slate-500" 
                />
              </div>
              <div className="flex-1 flex items-center border border-slate-300 bg-slate-50/50">
                <span className="text-[11px] text-slate-500 px-2 min-w-[120px]">Received sign. & time</span>
                <input 
                  {...register('sbar.received_sign_time')} 
                  disabled={sheetStatus === 'Verified' && user?.role !== 'chef-nurse'}
                  className="flex-1 border-none outline-none py-1 px-2 text-[11px] disabled:bg-slate-100 disabled:text-slate-500" 
                />
              </div>
            </div>
          </div>
          </fieldset>

          {isEmbedded && (
            <div className="mt-8 pt-6 border-t border-slate-200 flex justify-end gap-3 no-print">
              {user?.role === 'chef-nurse' && sheetStatus !== 'Verified' && (
                <button
                  type="button"
                  onClick={handleVerifySheet}
                  disabled={saving}
                  className="flex items-center text-xs font-black uppercase tracking-widest text-white bg-amber-500 hover:bg-amber-600 px-6 py-2.5 rounded-xl shadow-lg transition-all disabled:opacity-50"
                >
                  <CheckCircle className="h-4 w-4 mr-2" /> Verify Sheet
                </button>
              )}

              {sheetStatus === 'Verified' ? (
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  className="flex items-center text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-4 py-2.5 rounded-xl shadow-sm transition-all"
                >
                  <FileText className="h-4 w-4 mr-2 text-slate-500" /> Download PDF
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  className="flex items-center text-xs font-bold text-slate-400 bg-slate-50 px-4 py-2.5 rounded-xl shadow-sm cursor-not-allowed border border-slate-200"
                  title="Only available after Chef Nurse verification"
                >
                  <FileText className="h-4 w-4 mr-2 text-slate-400" /> PDF Locked
                </button>
              )}
              
              {!(sheetStatus === 'Verified' && user?.role !== 'chef-nurse') && (
                <button
                  type="button"
                  onClick={handleSubmit(onSubmit)}
                  disabled={saving}
                  className="flex items-center text-xs font-black uppercase tracking-widest text-white bg-[#0369a1] hover:bg-[#0284c7] px-6 py-2.5 rounded-xl shadow-lg transition-all disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Save Changes
                </button>
              )}
            </div>
          )}
        </form>
      </div>

      {/* ── Document Verification Modal ── */}
      {verifyModalOpen && (
        <Modal
          isOpen={verifyModalOpen}
          onClose={() => setVerifyModalOpen(false)}
          title="Document Authentication"
          maxWidth="500px"
        >
          {sheetStatus !== 'Verified' && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl flex items-start gap-3 text-xs leading-normal">
              <span className="text-base select-none mt-0.5">⚠️</span>
              <div>
                <p className="font-bold mb-1">Draft Document (Unverified)</p>
                <p className="text-amber-700">This clinical sheet is in draft status. It cannot be officially authenticated or verified until it has been received and verified by the Chef Nurse.</p>
              </div>
            </div>
          )}

          {/* Current Document QR & Checksum */}
          <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-4">
            {docInfoLoading ? (
              <div className="w-16 h-16 flex items-center justify-center text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : docInfo?.qrCodeDataUrl ? (
              <img src={docInfo.qrCodeDataUrl} alt="QR Code" className="w-16 h-16 border rounded bg-white shadow-sm" />
            ) : (
              <div className="w-16 h-16 bg-white border rounded flex items-center justify-center text-slate-400"><QrCode className="h-8 w-8 opacity-50" /></div>
            )}
            <div className="flex-1">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Current Record Authenticity</p>
              <div className="flex items-center justify-between bg-white border border-slate-200 rounded text-sm px-3 py-1.5 font-mono text-slate-700 shadow-inner">
                {docInfoLoading ? 'Loading...' : (docInfo?.checksum || 'Document Unverified (Not Authenticated)')}
                {docInfo?.checksum && (
                  <button onClick={handleCopyChecksum} className="text-slate-400 hover:text-emerald-600 transition-colors" title="Copy code">
                    {copied ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 my-4 relative">
            <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 text-xs font-bold text-slate-400 uppercase">Authenticate Any Code</span>
          </div>

          {/* Verify Input Box */}
          <div className="mt-6">
            <p className="text-sm text-slate-600 mb-2">Scan a QR code or paste a checksum below to verify a document's authenticity.</p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. LC-CLN-00001|A1B2C3D4E5F67890"
                value={verifyInput}
                onChange={(e) => setVerifyInput(e.target.value)}
                className="flex-1 border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-mono"
                onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
              />
              <button
                onClick={handleVerify}
                disabled={verifying || !verifyInput.trim()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-lg font-bold text-sm shadow-sm transition-colors disabled:opacity-50 flex items-center"
              >
                {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Authenticate'}
              </button>
            </div>
          </div>

          {/* Verification Result */}
          {verifyResult && (
            <div className={`mt-5 p-4 rounded-xl border ${verifyResult.verified ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
              <div className="flex items-start gap-3">
                {verifyResult.verified ? <ShieldCheck className="h-6 w-6 text-emerald-600 flex-shrink-0 mt-0.5" /> : <ShieldX className="h-6 w-6 text-rose-600 flex-shrink-0 mt-0.5" />}
                <div>
                  <p className={`font-bold text-sm ${verifyResult.verified ? 'text-emerald-800' : 'text-rose-800'} mb-1`}>
                    {verifyResult.message}
                  </p>
                  {verifyResult.verified && (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-3 text-xs text-emerald-700/80">
                      <div><span className="font-medium text-emerald-900/60">Patient:</span> {verifyResult.patient_name}</div>
                      <div><span className="font-medium text-emerald-900/60">Doc Ref:</span> {verifyResult.docRef}</div>
                      <div><span className="font-medium text-emerald-900/60">Created:</span> {new Date(verifyResult.created_at).toLocaleDateString()}</div>
                      <div><span className="font-medium text-emerald-900/60">Status:</span> <span className="uppercase">{verifyResult.status}</span></div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* ── Floating AI Assistant Button ── */}
      <button
        onClick={openAiDrawer}
        className="no-print fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white px-4 py-3 rounded-full shadow-2xl transition-all hover:scale-105 active:scale-95"
        title="AI Clinical Assistant"
      >
        <Sparkles className="h-5 w-5" />
        <span className="text-sm font-bold">AI Assistant</span>
      </button>

      {/* ── AI Assistant Drawer ── */}
      {aiDrawerOpen && (
        <div className="no-print fixed inset-0 z-50 flex justify-end" onClick={() => setAiDrawerOpen(false)}>
          <div
            className="relative w-[380px] h-full bg-white shadow-2xl flex flex-col overflow-hidden border-l border-slate-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                <div>
                  <p className="font-bold text-sm">AI Clinical Assistant</p>
                  <p className="text-[10px] text-indigo-200">Powered by Legacy Clinics AI</p>
                </div>
              </div>
              <button onClick={() => setAiDrawerOpen(false)} className="text-white/70 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-5">

              {/* Quick Actions */}
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Quick Actions</p>
                <div className="grid grid-cols-1 gap-2">
                  <button onClick={() => { handleAIGenerateComments(); }}
                    disabled={aiCommentsLoading || (sheetStatus === 'Verified' && user?.role !== 'chef-nurse')}
                    className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 text-left transition-all group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:border-slate-200">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                      <Stethoscope className="h-4 w-4 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-700 group-hover:text-indigo-700">Assess Vitals</p>
                      <p className="text-[10px] text-slate-400">Generate comments from entered vitals</p>
                    </div>
                    {aiCommentsLoading ? <Loader2 className="h-3 w-3 animate-spin ml-auto text-indigo-500" /> : <ChevronRight className="h-3 w-3 ml-auto text-slate-300 group-hover:text-indigo-400" />}
                  </button>

                  <button onClick={() => { handleAIGenerateProgressNote(); }}
                    disabled={aiProgressNoteLoading || (sheetStatus === 'Verified' && user?.role !== 'chef-nurse')}
                    className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 text-left transition-all group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:border-slate-200">
                    <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                      <ClipboardList className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-700 group-hover:text-indigo-700">Generate Progress Note</p>
                      <p className="text-[10px] text-slate-400">Write clinical note from vitals & MAR</p>
                    </div>
                    {aiProgressNoteLoading ? <Loader2 className="h-3 w-3 animate-spin ml-auto text-indigo-500" /> : <ChevronRight className="h-3 w-3 ml-auto text-slate-300 group-hover:text-indigo-400" />}
                  </button>

                  <button onClick={() => { handleAIGenerateSBAR(); }}
                    disabled={aiSbarLoading || (sheetStatus === 'Verified' && user?.role !== 'chef-nurse')}
                    className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 text-left transition-all group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:border-slate-200">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <MessageSquare className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-700 group-hover:text-indigo-700">Generate SBAR</p>
                      <p className="text-[10px] text-slate-400">Full handover report from entire sheet</p>
                    </div>
                    {aiSbarLoading ? <Loader2 className="h-3 w-3 animate-spin ml-auto text-indigo-500" /> : <ChevronRight className="h-3 w-3 ml-auto text-slate-300 group-hover:text-indigo-400" />}
                  </button>
                </div>
              </div>

              {/* Medication AI */}
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Medication AI</p>
                <button onClick={handleMedSuggest} disabled={medSugLoading || (sheetStatus === 'Verified' && user?.role !== 'chef-nurse')}
                  className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all disabled:opacity-60 mb-3 disabled:cursor-not-allowed">
                  {medSugLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Suggest Doses, Routes & Frequency
                </button>

                {medSuggestions.length > 0 && (
                  <div className="space-y-2">
                    {medSuggestions.map((sug, idx) => (
                      <div key={idx} className="border border-slate-200 rounded-xl p-3 bg-slate-50">
                        <div className="flex items-start justify-between mb-1">
                          <div>
                            <p className="text-xs font-bold text-slate-800">{sug.name}</p>
                            <p className="text-[10px] text-indigo-600 font-medium">{sug.category}</p>
                          </div>
                          <button onClick={() => applyMedSuggestion(sug, idx)}
                            disabled={sheetStatus === 'Verified' && user?.role !== 'chef-nurse'}
                            className="text-[10px] bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-2 py-1 rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                            Apply
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-1 mt-1">
                          <div className="bg-white border border-slate-200 rounded p-1 text-center">
                            <p className="text-[9px] text-slate-400">Dose</p>
                            <p className="text-[10px] font-bold text-slate-700">{sug.dose}</p>
                          </div>
                          <div className="bg-white border border-slate-200 rounded p-1 text-center">
                            <p className="text-[9px] text-slate-400">Route</p>
                            <p className="text-[10px] font-bold text-slate-700">{sug.route}</p>
                          </div>
                          <div className="bg-white border border-slate-200 rounded p-1 text-center">
                            <p className="text-[9px] text-slate-400">Freq.</p>
                            <p className="text-[10px] font-bold text-slate-700">{sug.frequency}</p>
                          </div>
                        </div>
                        {sug.notes && (
                          <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-100 rounded p-1 mt-1">
                            ⚠ {sug.notes}
                          </p>
                        )}
                        {!sug.matched && (
                          <p className="text-[10px] text-slate-400 mt-1 italic">Not in drug database — verify with prescriber.</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Frequency Reference */}
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1">
                  <BookOpen className="h-3 w-3" /> Frequency Reference
                </p>
                <div className="space-y-1">
                  {frequencies.map((f, i) => (
                    <div key={i} className="flex gap-2 text-[10px] py-1 border-b border-slate-100 last:border-0">
                      <span className="font-bold text-indigo-700 min-w-[80px]">{f.abbr}</span>
                      <span className="text-slate-600">{f.meaning}</span>
                    </div>
                  ))}
                  {!frequencies.length && <p className="text-[10px] text-slate-400 italic">Loading...</p>}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50">
              <p className="text-[10px] text-slate-400 text-center">
                AI suggestions are decision-support tools only.<br />Always verify with the prescribing clinician.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClinicalSheet;
