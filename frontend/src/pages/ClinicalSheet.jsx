import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { 
  ArrowLeft, 
  Save, 
  Printer, 
  Plus,
  Loader2,
  FileText
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { INSURANCES } from './refunds/constants';

const ClinicalSheet = ({ embeddedPatientId, embeddedQueueId, isEmbedded }) => {
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
  const activeTabParam = queryParams.get('tab') || 'all';
  const [activeTab, setActiveTab] = useState(activeTabParam);

  useEffect(() => {
    if (activeTabParam) {
      setActiveTab(activeTabParam);
    }
  }, [activeTabParam]);

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
        const [patientRes, vitalsRes, sheetRes] = await Promise.all([
          api.get(`/patients/${patientId}`),
          api.get(`/patients/${patientId}/vitals`).catch(() => ({ data: null })),
          api.get(`/clinical/observations/${patientId}?queue_id=${queue_id}`).catch(() => ({ data: null }))
        ]);

        const patientObj = patientRes.data?.data || patientRes.data || {};
        setPatient(patientObj);

        if (sheetRes.data && sheetRes.data.data) {
          reset(sheetRes.data.data);
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
      await api.post(`/clinical/observations/${patientId}`, { ...data, queue_id, patient_id: patientId });
      toast.success("Saved successfully");
    } catch (error) {
      toast.error("Failed to save");
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
            <button onClick={handleSubmit(onSubmit)} disabled={saving} className="flex items-center text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 px-4 py-1.5 rounded shadow-sm">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />} Save Draft
            </button>
            <button onClick={() => window.print()} className="flex items-center text-sm font-medium text-[#1b669d] bg-white hover:bg-slate-50 px-4 py-1.5 rounded border border-[#1b669d]/30 shadow-sm">
              <Printer className="h-4 w-4 mr-2" /> Print Sheet
            </button>
            <button onClick={handleDownloadPdf} className="flex items-center text-sm font-medium text-white bg-[#1b669d] hover:bg-blue-800 px-4 py-1.5 rounded shadow-sm">
              <FileText className="h-4 w-4 mr-2" /> Download PDF
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
        {/* Tab Switcher for Sub-Modules */}
        <div className="flex border-b border-slate-200 mb-6 bg-slate-50 p-2 rounded-2xl no-print gap-1 select-none">
          <button 
            type="button"
            onClick={() => setActiveTab('all')} 
            className={`flex-1 py-3 px-4 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'all' ? 'bg-[#1b669d] text-white shadow-lg' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}
          >
            All Sections
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('clinical')} 
            className={`flex-1 py-3 px-4 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'clinical' ? 'bg-[#1b669d] text-white shadow-lg' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}
          >
            Clinical Sheet
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('mar')} 
            className={`flex-1 py-3 px-4 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'mar' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}
          >
            Medication MAR
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('sbar')} 
            className={`flex-1 py-3 px-4 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'sbar' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}
          >
            SBAR Handover
          </button>
        </div>

        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-slate-800 tracking-wide">PATIENT OBSERVATION RECORDS SHEET</h1>
          <p className="text-xs text-slate-500">Legacy Clinics & Diagnostics • Nurse Assessment</p>
        </div>        <form>
          {/* Section I & II: Patient Identification, Assessment & Notes */}
          {(activeTab === 'all' || activeTab === 'clinical') && (
            <>
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
                  <input type="time" {...register('identification.time')} className="form-input flex-1" />
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
                  <div className="form-label">General comments</div>
                  <textarea {...register('triage.general_comments')} className="form-input min-h-[60px] resize-none" />
                </div>
              </div>

              {/* Section II */}
              <div className="section-header">Progress / Clinical Notes</div>
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
                <button type="button" onClick={() => appendProgress({ datetime: '', note: '', signature: '' })} className="text-blue-600 text-xs font-bold flex items-center mt-1 no-print">
                  <Plus className="h-3 w-3 mr-1" /> Add Note Row
                </button>
              </div>
            </>
          )}

          {/* Section III: Prescription and Medication Record Sheet (MAR) */}
          {(activeTab === 'all' || activeTab === 'mar') && (
            <>
              <div className="section-header">Prescription and Medication Record Sheet</div>
              <div className="px-1">
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
                      return (
                        <tr key={rowLabel}>
                          <td className="border border-slate-300 p-1 font-bold bg-slate-50 text-left">{rowLabel}</td>
                          {[0, 1, 2, 3].map((colIdx) => (
                            <td key={colIdx} className="border border-slate-300 p-1">
                              <input {...register(`medication_mar.interventions.${colIdx}.${keys[rIdx]}`)} className="w-full border-none outline-none text-center bg-transparent" />
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
                          <td className="border border-slate-300 p-0"><input {...register(`medication_mar.admin_logs.${idx}.time`)} placeholder="HH:MM" className="w-full border-none outline-none text-center h-5 text-[10px]" /></td>
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
                    <button type="button" onClick={() => appendLog({ time: '', initials: '' })} className="text-blue-600 text-xs font-bold flex items-center mt-4 no-print">
                      <Plus className="h-3 w-3 mr-1" /> Add Initials Row
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Section IV: SBAR Hand Over Report */}
          {(activeTab === 'all' || activeTab === 'sbar') && (
            <>
              <div className="section-header">SBAR Hand Over Report</div>
              <div className="px-1">
                <div className="form-label mb-1">Situation, Background, Assessment & Recommendation</div>
                <textarea {...register('sbar.content')} className="form-input min-h-[100px] resize-none w-full" />
                
                <div className="flex gap-4 mt-2">
                  <div className="flex-1 flex items-center border border-slate-300">
                    <span className="text-[11px] text-slate-500 px-2 min-w-[70px]">Reported by</span>
                    <input {...register('sbar.reported_by')} className="flex-1 border-none outline-none py-1 px-2 text-[11px]" />
                  </div>
                  <div className="flex-1 flex items-center border border-slate-300">
                    <span className="text-[11px] text-slate-500 px-2 min-w-[120px]">Reported sign. & time</span>
                    <input {...register('sbar.reported_sign_time')} className="flex-1 border-none outline-none py-1 px-2 text-[11px]" />
                  </div>
                </div>
                <div className="flex gap-4 mt-1">
                  <div className="flex-1 flex items-center border border-slate-300">
                    <span className="text-[11px] text-slate-500 px-2 min-w-[70px]">Received by</span>
                    <input {...register('sbar.received_by')} className="flex-1 border-none outline-none py-1 px-2 text-[11px]" />
                  </div>
                  <div className="flex-1 flex items-center border border-slate-300">
                    <span className="text-[11px] text-slate-500 px-2 min-w-[120px]">Received sign. & time</span>
                    <input {...register('sbar.received_sign_time')} className="flex-1 border-none outline-none py-1 px-2 text-[11px]" />
                  </div>
                </div>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
};

export default ClinicalSheet;
