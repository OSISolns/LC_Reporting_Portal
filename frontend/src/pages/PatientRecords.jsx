import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Badge, Button } from '../components/ui/index';
import { FileText, ClipboardList, Thermometer, Pill, Clock, ShoppingCart, User, Plus, Phone, Download, Eye, ArrowLeft, Loader2, FolderOpen, X, Sparkles } from 'lucide-react';
import api from '../api/axios';
import { toast } from 'react-hot-toast';
import ClinicalSheet from './ClinicalSheet';
import VitalsModal from '../components/VitalsModal';
import QuickClinicalSheetModal from '../components/QuickClinicalSheetModal';
import Modal from '../components/Modal';

const TABS = [
  { id: 'summary', label: 'Summary', icon: <FileText size={16} /> },
  { id: 'observations', label: 'Observations', icon: <ClipboardList size={16} /> },
  { id: 'triage', label: 'Triage / Vitals', icon: <Thermometer size={16} /> },
  { id: 'consumables', label: 'Used Consumables', icon: <ShoppingCart size={16} /> },
  { id: 'medications', label: 'Medications', icon: <Pill size={16} /> },
  { id: 'clinical_sheet', label: 'Clinical Sheet', icon: <FileText size={16} /> },
  { id: 'history', label: 'Visit History', icon: <Clock size={16} /> },
];

const MEDICATIONS_LIST = [
  "Dextrose 50%", "Dextrose 500mg", "Paracetamol IV 1g", "Furosemide", "Adrenaline 1mg",
  "Dexamethasone 8mg", "Dexamethasone 4mg", "Ceftriaxone 1g", "Metronidazole 1g",
  "Tramadol 100mg", "Diclofenac 75mg", "Esomeprazole 40mg", "Normal saline 500mL",
  "Ringer lactate 500mL", "oxytocin inj", "Propofol", "Fentanyl", "ketamine",
  "Pethidine", "MORPHINE", "Midazolam", "Nalaxoan", "Diazepam", "Buscopan 20mg",
  "Marcaine%0.5", "Atropine", "Lidocaine", "Hydrocortisone 100mg", "Phenytoine 250mg",
  "Metoclopramide", "Hydralazine 20-25mg/ml",
  "Paracetamol 500mg ces", "Paracetamol suppo 250mg", "Paracetamol suppo 125mg",
  "Emitino 4mg", "Vitamine B complex", "Diclofenac suppo 100mg", "Dicynone",
  "Pause 500mg", "chlorpromazine 100mg", "cytotec", "Salbutamol 2.5mg"
];

const INVENTORY_CATEGORIES = {
  consumables: {
    label: "Consumables & Surgical",
    color: "bg-amber-50 text-amber-700 border-amber-200",
    items: [
      "Giving set", "Papsmear", "Vaginal swab", "Povidone iodine solution", "Eaux oxygenee",
      "vaseline gauze", "Gauze swab", "vicryl 5/O", "vicryl 4/O", "Vicryl 3/0", "Vicryl 2/o",
      "Ethilon 2/0", "Ethilon 3/0", "Ethilon 4/0", "Ethilon 5/0", "Ethilon 6/0", "monocryl 6/0",
      "surgical blades N23", "Surgical blades N21", "surgical bladeN15", "surgical blade N12",
      "crepes bandage 7.5cm", "Crepe bandage 10cm", "crepe bandage 15cm", "Aquabloc 15×10", "Aquabloc 10×10"
    ]
  },
  syringes: {
    label: "Syringes & Needles",
    color: "bg-purple-50 text-purple-700 border-purple-200",
    items: [
      "water for injection", "Syringe 2ml", "syringe 5ml", "syringe 10ml", "syringe 20ml",
      "needle 23", "needle 21", "needle 18"
    ]
  },
  catheters: {
    label: "Catheters & Drainage",
    color: "bg-rose-50 text-rose-700 border-rose-200",
    items: [
      "Urine drainage bag", "Foley balloon catheter fr 10", "Foley balloon catheter fr 12",
      "Foley balloon catheter fr 16", "Foley balloon catheter fr 18", "Foley balloon catheter fr 20",
      "catheter G20", "Iv catheter G22", "Iv catheter G24", "Iv catheter G16", "Iv catheter G18"
    ]
  },
  gloves: {
    label: "Gloves",
    color: "bg-teal-50 text-teal-700 border-teal-200",
    items: [
      "sterile gloves no 8CM", "sterile gloves 8", "sterile gloves 7.5", "proper gloves"
    ]
  },
  respiratory: {
    label: "Respiratory",
    color: "bg-cyan-50 text-cyan-700 border-cyan-200",
    items: [
      "neb mask adult", "Neb mask ped"
    ]
  },
  family_planning: {
    label: "Family Planning",
    color: "bg-pink-50 text-pink-700 border-pink-200",
    items: [
      "IUD MIRENA", "CONDOM", "SAYANA", "JADELLE", "MICROGYN"
    ]
  }
};

const getCategoryBadge = (itemName) => {
  const name = (itemName || '').toLowerCase().trim();
  for (const cat of Object.values(INVENTORY_CATEGORIES)) {
    if (cat.items.some(i => i.toLowerCase().trim() === name)) {
      return cat;
    }
  }
  return {
    label: "Other Consumable",
    color: "bg-slate-50 text-slate-700 border-slate-200"
  };
};

const getConsumableQty = (med) => {
  const logs = med.admin_logs || [];
  const filledLogs = logs.filter(log => (log.time && log.time.trim()) || (log.initials && log.initials.trim()));
  return filledLogs.length > 0 ? filledLogs.length : 1;
};

export default function PatientRecords() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('summary');
  const [isVitalsModalOpen, setIsVitalsModalOpen] = useState(false);

  // Clinical documents list state
  const [clinicalDocs, setClinicalDocs] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [pdfDownloading, setPdfDownloading] = useState(null);

  // Summary tab: latest clinical sheet data
  const [summarySheet, setSummarySheet] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Medications state
  const [medications, setMedications] = useState([]);
  const [medsLoading, setMedsLoading] = useState(false);
  const [selectedMed, setSelectedMed] = useState(null); // modal

  // Clinical Sheet Modal state
  const [isClinicalModalOpen, setIsClinicalModalOpen] = useState(false);
  const [isQuickSheetModalOpen, setIsQuickSheetModalOpen] = useState(false);
  const [clinicalModalQueueId, setClinicalModalQueueId] = useState('');

  const [vitalsHistory, setVitalsHistory] = useState([]);

  const fetchPatientAndVitals = async () => {
    try {
      setLoading(true);
      const [patientRes, vitalsRes] = await Promise.all([
        api.get(`/patients/${patientId}`),
        api.get(`/patients/${patientId}/vitals`).catch(() => ({ data: { success: false, data: [] } }))
      ]);

      const patientData = patientRes.data?.data || patientRes.data || {};
      setSelectedPatient({
        id: patientData.pid || patientId,
        name: patientData.full_name || 'Unknown Patient',
        age: patientData.age || '—',
        gender: patientData.gender || '—',
        dob: patientData.dob || '—',
        phone: patientData.phone || '—',
        allergies: patientData.allergies || '',
        queue_id: 'Q-TEMP'
      });

      if (vitalsRes.data?.success && vitalsRes.data.data) {
        setVitalsHistory(vitalsRes.data.data);
      }
    } catch (err) {
      console.error('Failed to load patient records', err);
      toast.error('Failed to load patient details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (patientId) fetchPatientAndVitals();
  }, [patientId]);

  // Fetch clinical documents when tab is opened
  const fetchClinicalDocs = useCallback(async () => {
    try {
      setDocsLoading(true);
      const res = await api.get(`/clinical/observations/${patientId}/all`);
      if (res.data.success) setClinicalDocs(res.data.data || []);
    } catch (err) {
      console.error('Failed to load clinical documents', err);
    } finally {
      setDocsLoading(false);
    }
  }, [patientId]);

  // Fetch the latest clinical sheet for the Summary tab
  const fetchSummarySheet = useCallback(async () => {
    try {
      setSummaryLoading(true);
      // Get the list of all sheets for this patient
      const listRes = await api.get(`/clinical/observations/${patientId}/all`);
      if (!listRes.data.success || !listRes.data.data?.length) return;

      // Load the most recent sheet's full data
      const latest = listRes.data.data[0]; // already ordered by updated_at DESC
      const fullRes = await api.get(
        `/clinical/observations/${patientId}?queue_id=${latest.queue_id}`
      );
      if (fullRes.data.success && fullRes.data.data) {
        setSummarySheet(fullRes.data.data);
      }
    } catch (err) {
      console.error('Failed to load summary sheet', err);
    } finally {
      setSummaryLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    if (activeTab === 'clinical_sheet') {
      setSelectedDoc(null);
      fetchClinicalDocs();
    }
    if (activeTab === 'summary') {
      fetchSummarySheet();
    }
  }, [activeTab, fetchClinicalDocs, fetchSummarySheet]);

  // Fetch medications from all clinical observation MAR sections
  const fetchMedications = useCallback(async () => {
    try {
      setMedsLoading(true);
      const res = await api.get(`/clinical/observations/${patientId}/all`);
      if (!res.data.success) return;
      const docs = res.data.data || [];

      // For each doc, fetch full observation to get medication_mar_json
      const fullDocs = await Promise.all(
        docs.map(doc =>
          api.get(`/clinical/observations/${patientId}?queue_id=${doc.queue_id}`)
            .then(r => ({ ...r.data.data, _docMeta: doc }))
            .catch(() => null)
        )
      );

      // Flatten interventions from all docs, attach source info
      const allMeds = [];
      fullDocs.filter(Boolean).forEach(doc => {
        const interventions = doc.medication_mar?.interventions || [];
        interventions.forEach(med => {
          if (med.name && med.name.trim()) {
            allMeds.push({
              ...med,
              queue_id: doc.queue_id,
              sheet_date: doc._docMeta?.updated_at,
              prescriber: doc.medication_mar?.prescriber || '',
              admin_initials: doc.medication_mar?.admin_initials || '',
              admin_names: doc.medication_mar?.admin_names || '',
              admin_logs: doc.medication_mar?.admin_logs || [],
            });
          }
        });
      });
      setMedications(allMeds);
    } catch (err) {
      console.error('Failed to load medications', err);
    } finally {
      setMedsLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    if (activeTab === 'medications' || activeTab === 'consumables') {
      fetchMedications();
    }
  }, [activeTab, fetchMedications]);

  const actualMedications = medications.filter(med => {
    const name = (med.name || '').toLowerCase().trim();
    const isConsumable = Object.values(INVENTORY_CATEGORIES).some(cat => 
      cat.items.some(i => i.toLowerCase().trim() === name)
    );
    return !isConsumable;
  });

  const consumablesUsed = medications.filter(med => {
    const name = (med.name || '').toLowerCase().trim();
    const isConsumable = Object.values(INVENTORY_CATEGORIES).some(cat => 
      cat.items.some(i => i.toLowerCase().trim() === name)
    );
    return isConsumable;
  });

  const handleDownloadPdf = async (queueId) => {
    try {
      setPdfDownloading(queueId);
      toast.loading('Generating PDF...', { id: 'pdf-dl' });
      const response = await api.get(
        `/clinical/observations/${patientId}/pdf?queue_id=${queueId}`,
        { responseType: 'blob' }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ClinicalSheet_${patientId}_${queueId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('PDF downloaded', { id: 'pdf-dl' });
    } catch (err) {
      toast.error('Failed to generate PDF', { id: 'pdf-dl' });
    } finally {
      setPdfDownloading(null);
    }
  };

  if (loading || !selectedPatient) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center font-bold text-slate-400 uppercase tracking-widest text-sm">Loading Records...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="px-8 py-5 border-b border-slate-200 flex items-center justify-between bg-white shrink-0 shadow-sm z-20">
        <h2 className="text-xl font-bold text-slate-900">Patient Records</h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Patient Banner */}
        <div className="p-8 bg-white border-b border-slate-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 max-w-7xl mx-auto">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-2xl bg-[#009ee3] text-white flex items-center justify-center font-bold text-2xl shadow-sm">
                {(selectedPatient.name || selectedPatient.patient_name || '').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
                  {selectedPatient.name || selectedPatient.patient_name}
                </h3>
                <div className="text-sm font-bold text-[#009ee3] tracking-widest uppercase mb-3">
                  PID: {selectedPatient.id || selectedPatient.patient_id}
                </div>
                <div className="flex items-center gap-6 text-sm font-medium text-slate-600">
                  <span className="flex items-center gap-2"><User className="w-4 h-4" /> {selectedPatient.gender || 'Unknown'}</span>
                  <span className="flex items-center gap-2"><Clock className="w-4 h-4" /> {selectedPatient.dob || 'Unknown DOB'}</span>
                  <span className="flex items-center gap-2"><Phone className="w-4 h-4" /> {selectedPatient.phone || 'No phone'}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 px-4 py-1 self-end">Patient Active</Badge>
              <div className="text-xs font-medium text-slate-500 text-right">Last Visit: Today, 09:41 AM</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-8 border-b border-slate-200 bg-white pt-2 sticky top-0 z-10 shadow-sm">
          <div className="max-w-7xl mx-auto flex gap-8 overflow-x-auto">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 pb-4 pt-2 font-semibold text-sm transition-colors relative whitespace-nowrap ${activeTab === tab.id ? 'text-[#009ee3]' : 'text-slate-500 hover:text-slate-800'
                  }`}
              >
                {tab.icon} {tab.label}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#009ee3] rounded-t-full" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-8 max-w-7xl mx-auto">

          {/* ── SUMMARY TAB ── */}
          {activeTab === 'summary' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">

                {/* Active Problems — no dedicated API field yet; prompt nurse to use progress notes */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h4 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-[#009ee3]" /> Active Problems
                  </h4>
                  {summaryLoading ? (
                    <div className="flex items-center gap-2 text-slate-400 py-4">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Loading…</span>
                    </div>
                  ) : summarySheet?.triage?.prev_illness_med || summarySheet?.triage?.prev_illness_surg ? (
                    <div className="space-y-2">
                      {summarySheet.triage.prev_illness_med && (
                        <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                          <span className="font-semibold text-slate-700">{summarySheet.triage.prev_illness_med}</span>
                          <span className="text-xs text-slate-500 bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded font-bold">Medical</span>
                        </div>
                      )}
                      {summarySheet.triage.prev_illness_surg && (
                        <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                          <span className="font-semibold text-slate-700">{summarySheet.triage.prev_illness_surg}</span>
                          <span className="text-xs bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded font-bold">Surgical</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center py-6 gap-2 text-slate-400">
                      <FileText className="w-8 h-8" strokeWidth={1.2} />
                      <p className="text-sm font-bold text-slate-500">No previous illness history recorded</p>
                      <p className="text-xs text-slate-400">Document in the Clinical Sheet triage section</p>
                    </div>
                  )}
                </div>

                {/* Recent Clinical Notes — from the latest clinical sheet's progress notes */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h4 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-[#009ee3]" /> Recent Clinical Notes
                  </h4>
                  {summaryLoading ? (
                    <div className="flex items-center gap-2 text-slate-400 py-4">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Loading…</span>
                    </div>
                  ) : summarySheet?.progress_notes?.filter(n => n.note?.trim()).length > 0 ? (
                    <div className="border-l-2 border-slate-200 pl-4 ml-2 space-y-5">
                      {summarySheet.progress_notes
                        .filter(n => n.note?.trim())
                        .slice(0, 3)
                        .map((note, i) => (
                          <div key={i}>
                            <div className="text-xs font-bold text-slate-500 mb-1">
                              {note.datetime
                                ? new Date(note.datetime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
                                : '—'}
                              {note.signature && ` • ${note.signature}`}
                            </div>
                            <p className="text-sm text-slate-700 whitespace-pre-wrap">{note.note}</p>
                          </div>
                        ))
                      }
                    </div>
                  ) : (
                    <div className="flex flex-col items-center py-6 gap-2 text-slate-400">
                      <ClipboardList className="w-8 h-8" strokeWidth={1.2} />
                      <p className="text-sm font-bold text-slate-500">No clinical notes recorded yet</p>
                      <p className="text-xs text-slate-400">Add notes in the Clinical Sheet progress notes section</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right column */}
              <div className="space-y-6">
                {/* Allergies — from patient record + latest clinical triage */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h4 className="text-lg font-bold text-slate-900 mb-4">Allergies</h4>
                  {(() => {
                    const allergySource = [
                      selectedPatient?.allergies,
                      summarySheet?.triage?.allergy_1,
                      summarySheet?.triage?.allergy_2,
                    ].filter(a => a && a.trim() && a.toLowerCase() !== 'none' && a.toLowerCase() !== 'nka' && a.toLowerCase() !== 'nkda');

                    if (summaryLoading) {
                      return (
                        <div className="flex items-center gap-2 text-slate-400">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm">Loading…</span>
                        </div>
                      );
                    }

                    if (allergySource.length === 0) {
                      return (
                        <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                          <span className="text-sm font-bold">✓ No Known Allergies (NKA)</span>
                        </div>
                      );
                    }

                    return (
                      <div className="flex flex-wrap gap-2">
                        {allergySource.map((allergy, i) => (
                          <Badge key={i} variant="destructive" className="bg-red-50 text-red-700 border-red-200 hover:bg-red-100 px-3 py-1">
                            {allergy}
                          </Badge>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                {/* Latest Vitals */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h4 className="text-lg font-bold text-slate-900 mb-4">Latest Vitals</h4>
                  {vitalsHistory.length > 0 ? (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center"><span className="text-sm text-slate-500">Blood Pressure</span><span className="font-bold text-slate-900">{vitalsHistory[0].blood_pressure || '—'}</span></div>
                      <div className="flex justify-between items-center"><span className="text-sm text-slate-500">Heart Rate</span><span className="font-bold text-slate-900">{vitalsHistory[0].pulse ? `${vitalsHistory[0].pulse} bpm` : '—'}</span></div>
                      <div className="flex justify-between items-center"><span className="text-sm text-slate-500">Temperature</span><span className="font-bold text-slate-900">{vitalsHistory[0].temperature ? `${vitalsHistory[0].temperature} °C` : '—'}</span></div>
                      <div className="flex justify-between items-center"><span className="text-sm text-slate-500">SpO2</span><span className="font-bold text-slate-900">{vitalsHistory[0].spo2 ? `${vitalsHistory[0].spo2}%` : '—'}</span></div>
                      <div className="text-[10px] text-slate-400 font-medium text-right pt-1">
                        Recorded {new Date(vitalsHistory[0].created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider text-center py-4">No vitals recorded</p>
                  )}
                </div>

                {/* Last Visit */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h4 className="text-lg font-bold text-slate-900 mb-3">Last Clinical Sheet</h4>
                  {summarySheet ? (
                    <div className="text-sm text-slate-700 space-y-1">
                      <div className="font-bold text-slate-900">
                        {new Date(summarySheet.updated_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                      </div>
                      <div className="text-xs text-slate-500">
                        Queue: <span className="font-mono font-black text-[#009ee3]">{summarySheet.queue_id}</span>
                      </div>
                      <div className="mt-2">
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${
                          summarySheet.status === 'Final' || summarySheet.status === 'Saved' || summarySheet.status === 'Verified'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>{summarySheet.status || 'Draft'}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">No sheets recorded</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── OBSERVATIONS TAB ── */}
          {activeTab === 'observations' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex justify-between items-center mb-6">
                <h4 className="text-lg font-bold text-slate-900">Nursing Observations</h4>
                <Button
                  className="bg-[#009ee3] hover:bg-[#008bc7] text-white"
                  onClick={() => setActiveTab('clinical_sheet')}
                >
                  <Plus className="w-4 h-4 mr-2" /> Add Observation
                </Button>
              </div>
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-bold text-slate-500">
                  <tr><th className="p-3">Date & Time</th><th className="p-3">Observer</th><th className="p-3">Notes</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="p-3 font-medium">Today, 08:00 AM</td><td className="p-3">RN Alice</td>
                    <td className="p-3">Patient slept well. Tolerating oral fluids. Complains of mild headache.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium">Yesterday, 08:00 PM</td><td className="p-3">RN Bob</td>
                    <td className="p-3">Evening rounds complete. Vitals stable. Pain level 2/10.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* ── TRIAGE / VITALS TAB ── */}
          {activeTab === 'triage' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex justify-between items-center mb-6">
                <h4 className="text-lg font-bold text-slate-900">Vitals Flowsheet</h4>
                <Button
                  className="bg-[#009ee3] hover:bg-[#008bc7] text-white"
                  onClick={() => setIsVitalsModalOpen(true)}
                >
                  <Plus className="w-4 h-4 mr-2" /> Record Vitals
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600 border border-slate-200">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-bold text-slate-500">
                    <tr>
                      <th className="p-3 border-r border-slate-200">Date/Time</th>
                      <th className="p-3 border-r border-slate-200 text-center">Temp (°C)</th>
                      <th className="p-3 border-r border-slate-200 text-center">HR (bpm)</th>
                      <th className="p-3 border-r border-slate-200 text-center">BP (mmHg)</th>
                      <th className="p-3 border-r border-slate-200 text-center">RR (bpm)</th>
                      <th className="p-3 border-r border-slate-200 text-center">SpO2 (%)</th>
                      <th className="p-3 border-r border-slate-200 text-center">Weight (kg)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {vitalsHistory.length > 0 ? (
                      vitalsHistory.map((vt, idx) => (
                        <tr key={vt.id || idx} className="hover:bg-slate-50">
                          <td className="p-3 border-r border-slate-200 font-medium">
                            {new Date(vt.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                          </td>
                          <td className="p-3 border-r border-slate-200 text-center">{vt.temperature || '—'}</td>
                          <td className="p-3 border-r border-slate-200 text-center">{vt.pulse || '—'}</td>
                          <td className="p-3 border-r border-slate-200 text-center">{vt.blood_pressure || '—'}</td>
                          <td className="p-3 border-r border-slate-200 text-center">{vt.respiratory_rate || '—'}</td>
                          <td className="p-3 border-r border-slate-200 text-center">{vt.spo2 || '—'}</td>
                          <td className="p-3 border-r border-slate-200 text-center">{vt.weight || '—'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7" className="p-8 text-center text-slate-400 font-bold uppercase tracking-wider text-xs bg-slate-50">
                          No vitals logged yet for this patient.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── MEDICATIONS TAB ── */}
          {activeTab === 'medications' && (
            <div className="space-y-4">
              {/* Header */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <div style={{ padding: '8px', backgroundColor: '#fef3c7', color: '#d97706', borderRadius: '10px' }}>
                      <Pill size={18} />
                    </div>
                    <div>
                      <h4 className="text-base font-black text-slate-900">Current Medications</h4>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">MAR prescriptions from all clinical sheets</p>
                    </div>
                  </div>
                  <Button
                    className="bg-[#009ee3] hover:bg-[#008bc7] text-white text-xs font-bold flex items-center gap-2"
                    onClick={() => {
                      setClinicalModalQueueId(`Q-${Date.now()}`);
                      setIsClinicalModalOpen(true);
                    }}
                  >
                    <Plus size={14} /> Prescribe
                  </Button>
                </div>

                {/* Body */}
                {medsLoading ? (
                  <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
                    <Loader2 size={22} className="animate-spin" />
                    <span className="text-sm font-bold uppercase tracking-wider">Loading medications...</span>
                  </div>
                ) : actualMedications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
                    <Pill size={40} strokeWidth={1.2} />
                    <p className="text-sm font-bold">No prescriptions found for this patient.</p>
                    <button
                      onClick={() => {
                        setClinicalModalQueueId(`Q-${Date.now()}`);
                        setIsClinicalModalOpen(true);
                      }}
                      className="text-xs font-bold text-[#009ee3] border border-[#009ee3]/30 px-4 py-2 rounded-lg hover:bg-sky-50 transition-all mt-1"
                    >
                      <Plus size={12} className="inline mr-1" />Open Clinical Sheet to prescribe
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {actualMedications.map((med, idx) => {
                      const hasTime = med.start_time || med.end_time;
                      const sheetDate = med.sheet_date
                        ? new Date(med.sheet_date).toLocaleDateString([], { dateStyle: 'medium' })
                        : null;

                      // Colour-code by route
                      const routeColors = {
                        IV:   { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
                        PO:   { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
                        IM:   { bg: '#fef3c7', color: '#d97706', border: '#fde68a' },
                        SC:   { bg: '#fdf4ff', color: '#9333ea', border: '#e9d5ff' },
                        SL:   { bg: '#fff1f2', color: '#e11d48', border: '#fecdd3' },
                      };
                      const routeKey = (med.route || '').toUpperCase().split(' ')[0];
                      const routeStyle = routeColors[routeKey] || { bg: '#f8fafc', color: '#475569', border: '#e2e8f0' };

                      return (
                        <button
                          key={idx}
                          onClick={() => setSelectedMed(med)}
                          className="w-full flex items-center justify-between px-6 py-4 hover:bg-amber-50/40 group transition-colors text-left"
                        >
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            {/* Drug icon pill */}
                            <div style={{
                              width: '48px', height: '48px', borderRadius: '14px',
                              background: routeStyle.bg, border: `1.5px solid ${routeStyle.border}`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: routeStyle.color, flexShrink: 0
                            }}>
                              <Pill size={22} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-black text-slate-900 text-sm">{med.name}</span>
                                {med.route && (
                                  <span style={{ background: routeStyle.bg, color: routeStyle.color, border: `1px solid ${routeStyle.border}` }}
                                    className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded">
                                    {med.route}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 font-medium flex-wrap">
                                {med.dose && <span className="font-bold text-slate-700">{med.dose}</span>}
                                {med.dose && med.frequency && <span>·</span>}
                                {med.frequency && <span>{med.frequency}</span>}
                                {hasTime && <span>·</span>}
                                {med.start_time && <span>From: <span className="font-bold text-slate-600">{med.start_time}</span></span>}
                                {med.end_time && <span>To: <span className="font-bold text-slate-600">{med.end_time}</span></span>}
                              </div>
                              {sheetDate && (
                                <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                                  Sheet dated {sheetDate} · Queue {med.queue_id}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-4">
                            <Eye size={15} className="text-slate-300 group-hover:text-[#009ee3] transition-colors" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

              {/* ── MEDICATION DETAIL MODAL ── */}
              {selectedMed && (
                <Modal
                  isOpen={!!selectedMed}
                  onClose={() => setSelectedMed(null)}
                  title={`Prescription Details: ${selectedMed.name}`}
                  maxWidth="520px"
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {/* Core Rx details grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      {[  
                        { label: 'Dose', value: selectedMed.dose },
                        { label: 'Route', value: selectedMed.route },
                        { label: 'Frequency', value: selectedMed.frequency },
                        { label: 'Start Time', value: selectedMed.start_time },
                        { label: 'End Time', value: selectedMed.end_time },
                        { label: 'Prescriber', value: selectedMed.prescriber },
                      ].map(({ label, value }) => (
                        <div key={label} style={{ background: '#f8fafc', borderRadius: '12px', padding: '12px 14px', border: '1px solid #f1f5f9' }}>
                          <div style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', marginBottom: '4px' }}>{label}</div>
                          <div style={{ fontSize: '0.92rem', fontWeight: 900, color: value ? '#1e293b' : '#cbd5e1' }}>
                            {value || '—'}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Administration log */}
                    {selectedMed.admin_logs?.filter(l => l.time || l.initials).length > 0 && (
                      <div>
                        <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', marginBottom: '10px' }}>
                          Administration Log
                        </div>
                        <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                            <thead>
                              <tr style={{ background: '#f8fafc' }}>
                                <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 800, color: '#64748b', fontSize: '0.68rem', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>Time</th>
                                <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 800, color: '#64748b', fontSize: '0.68rem', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>Administered By</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedMed.admin_logs.filter(l => l.time || l.initials).map((log, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                  <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontWeight: 700, color: '#334155' }}>{log.time || '—'}</td>
                                  <td style={{ padding: '8px 12px', fontWeight: 700, color: '#334155' }}>{log.initials || '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {selectedMed.admin_initials && (
                          <div style={{ marginTop: '8px', fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                            Initials: <span style={{ fontWeight: 900, color: '#334155' }}>{selectedMed.admin_initials}</span>
                            {selectedMed.admin_names && <> · {selectedMed.admin_names}</>}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Footer actions */}
                    <div style={{ display: 'flex', gap: '10px', paddingTop: '0.5rem' }}>
                      <button
                        onClick={() => {
                          setSelectedMed(null);
                          setClinicalModalQueueId(selectedMed.queue_id);
                          setIsClinicalModalOpen(true);
                        }}
                        style={{ flex: 1, padding: '12px', background: '#009ee3', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 900, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer' }}
                      >
                        Open Clinical Sheet
                      </button>
                      <button
                        onClick={() => setSelectedMed(null)}
                        style={{ padding: '12px 20px', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '12px', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer' }}
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </Modal>
              )}

          {/* ── CLINICAL SHEET TAB ── */}
          {activeTab === 'clinical_sheet' && (
            <div className="space-y-4">
              {/* If a doc is selected — show inline viewer */}
              {selectedDoc ? (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  {/* Viewer toolbar */}
                  <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-200">
                    <button
                      onClick={() => setSelectedDoc(null)}
                      className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm transition-all"
                    >
                      <ArrowLeft size={14} /> Back to List
                    </button>
                    <span className="text-xs font-black uppercase tracking-widest text-slate-400">
                      Viewing: Queue {selectedDoc.queue_id} &nbsp;·&nbsp;
                      {new Date(selectedDoc.updated_at).toLocaleDateString([], { dateStyle: 'medium' })}
                    </span>
                    <button
                      onClick={() => handleDownloadPdf(selectedDoc.queue_id)}
                      disabled={pdfDownloading === selectedDoc.queue_id}
                      className="flex items-center gap-2 text-xs font-bold text-white bg-[#0369a1] hover:bg-[#0284c7] px-3 py-1.5 rounded-lg shadow-sm transition-all disabled:opacity-60"
                    >
                      {pdfDownloading === selectedDoc.queue_id
                        ? <Loader2 size={13} className="animate-spin" />
                        : <Download size={13} />}
                      Download PDF
                    </button>
                  </div>
                  <ClinicalSheet
                    embeddedPatientId={selectedPatient.id}
                    embeddedQueueId={selectedDoc.queue_id}
                    isEmbedded={true}
                  />
                </div>
              ) : (
                /* Document list */
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                    <div className="flex items-center gap-3">
                      <div style={{ padding: '8px', backgroundColor: '#e0f2fe', color: '#0369a1', borderRadius: '10px' }}>
                        <FolderOpen size={18} />
                      </div>
                      <div>
                        <h4 className="text-base font-black text-slate-900">Clinical Sheet Documents</h4>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">All recorded observation sheets for this patient</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        className="bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold flex items-center gap-2 border-0 shadow shadow-indigo-200"
                        onClick={() => {
                          setClinicalModalQueueId(`Q-${Date.now()}`);
                          setIsQuickSheetModalOpen(true);
                        }}
                      >
                        <Sparkles size={14} /> Quick AI Sheet
                      </Button>
                      <Button
                        className="bg-[#009ee3] hover:bg-[#008bc7] text-white text-xs font-bold flex items-center gap-2"
                        onClick={() => {
                          setClinicalModalQueueId(`Q-${Date.now()}`);
                          setIsClinicalModalOpen(true);
                        }}
                      >
                        <Plus size={14} /> Full Sheet
                      </Button>
                    </div>
                  </div>

                  {/* List body */}
                  {docsLoading ? (
                    <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
                      <Loader2 size={22} className="animate-spin" />
                      <span className="text-sm font-bold uppercase tracking-wider">Loading documents...</span>
                    </div>
                  ) : clinicalDocs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
                      <FolderOpen size={40} strokeWidth={1.2} />
                      <p className="text-sm font-bold">No clinical sheets found for this patient.</p>
                      <button
                        onClick={() => {
                          setClinicalModalQueueId(`Q-${Date.now()}`);
                          setIsClinicalModalOpen(true);
                        }}
                        className="text-xs font-bold text-[#0369a1] border border-[#0369a1]/30 px-4 py-2 rounded-lg hover:bg-sky-50 transition-all mt-1"
                      >
                        <Plus size={12} className="inline mr-1" />Create First Sheet
                      </button>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {clinicalDocs.map((doc, idx) => {
                        const statusColors = {
                          Draft: 'bg-amber-50 text-amber-700 border-amber-200',
                          Saved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                          Reviewed: 'bg-blue-50 text-blue-700 border-blue-200',
                          Verified: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                        };
                        const statusCls = statusColors[doc.status] || 'bg-slate-100 text-slate-600 border-slate-200';
                        const date = doc.updated_at ? new Date(doc.updated_at) : null;
                        const dateStr = date ? date.toLocaleDateString([], { dateStyle: 'medium' }) : '—';
                        const timeStr = date ? date.toLocaleTimeString([], { timeStyle: 'short' }) : '';

                        return (
                          <div
                            key={doc.id || idx}
                            className="flex items-center justify-between px-6 py-4 hover:bg-sky-50/40 group transition-colors"
                          >
                            {/* Doc info */}
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                              <div style={{
                                width: '44px', height: '44px',
                                borderRadius: '12px',
                                background: '#f0f9ff',
                                border: '1.5px solid #bae6fd',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#0369a1', flexShrink: 0
                              }}>
                                <FileText size={20} />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-black text-slate-900 text-sm">
                                    Patient Observation Sheet
                                  </span>
                                  <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${statusCls}`}>
                                    {doc.status || 'Draft'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 font-medium">
                                  <span>Queue: <span className="font-mono font-black text-slate-700">{doc.queue_id || '—'}</span></span>
                                  <span>·</span>
                                  <span>{dateStr} {timeStr && `at ${timeStr}`}</span>
                                  {doc.ward && <><span>·</span><span>Ward: {doc.ward}</span></>}
                                </div>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 shrink-0 ml-4">
                              <button
                                onClick={() => {
                                  setClinicalModalQueueId(doc.queue_id);
                                  setIsClinicalModalOpen(true);
                                }}
                                className="flex items-center gap-1.5 text-xs font-bold text-[#0369a1] bg-sky-50 hover:bg-sky-100 border border-sky-200 px-3 py-1.5 rounded-lg transition-all"
                              >
                                <Eye size={13} /> View
                              </button>
                              <button
                                onClick={() => handleDownloadPdf(doc.queue_id)}
                                disabled={pdfDownloading === doc.queue_id}
                                className="flex items-center gap-1.5 text-xs font-bold text-white bg-[#0369a1] hover:bg-[#0284c7] px-3 py-1.5 rounded-lg transition-all disabled:opacity-60"
                              >
                                {pdfDownloading === doc.queue_id
                                  ? <Loader2 size={13} className="animate-spin" />
                                  : <Download size={13} />}
                                PDF
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── CONSUMABLES TAB ── */}
          {activeTab === 'consumables' && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <div style={{ padding: '8px', backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: '10px' }}>
                      <ShoppingCart size={18} />
                    </div>
                    <div>
                      <h4 className="text-base font-black text-slate-900">Inventory / Used Consumables</h4>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">Consumables and surgical supplies recorded in clinical observations</p>
                    </div>
                  </div>
                  <Badge className="bg-red-50 text-red-700 border-red-200 font-extrabold px-3 py-1 text-xs">
                    {consumablesUsed.length} Items Used
                  </Badge>
                </div>

                {medsLoading ? (
                  <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
                    <Loader2 size={22} className="animate-spin" />
                    <span className="text-sm font-bold uppercase tracking-wider">Loading consumables...</span>
                  </div>
                ) : consumablesUsed.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
                    <ShoppingCart size={40} strokeWidth={1.2} />
                    <p className="text-sm font-bold">No used consumables found for this patient.</p>
                    <button
                      onClick={() => {
                        setClinicalModalQueueId(`Q-${Date.now()}`);
                        setIsClinicalModalOpen(true);
                      }}
                      className="text-xs font-bold text-[#009ee3] border border-[#009ee3]/30 px-4 py-2 rounded-lg hover:bg-sky-50 transition-all mt-1"
                    >
                      <Plus size={12} className="inline mr-1" />Record Consumables in Clinical Sheet
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                      <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-wider font-black text-slate-500">
                        <tr>
                          <th className="p-4 w-[280px]">Consumables / Supplies</th>
                          <th className="p-4 text-center w-32">Qty Used</th>
                          <th className="p-4 w-48">Recorded By</th>
                          <th className="p-4 w-40 text-center">Session Date</th>
                          <th className="p-4 text-right">Observation Doc</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                        {consumablesUsed.map((med, idx) => {
                          const catBadge = getCategoryBadge(med.name);
                          const qty = getConsumableQty(med);
                          const sheetDate = med.sheet_date
                            ? new Date(med.sheet_date).toLocaleDateString([], { dateStyle: 'medium' })
                            : '—';

                          return (
                            <tr key={idx} className="hover:bg-slate-50/60 transition-colors align-middle">
                              <td className="p-4">
                                <div className="space-y-1">
                                  <div className="text-slate-900 font-extrabold text-[13px]">{med.name}</div>
                                  <span className={`inline-block text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${catBadge.color}`}>
                                    {catBadge.label}
                                  </span>
                                </div>
                              </td>
                              <td className="p-4 text-center font-bold text-slate-800">
                                <span className="bg-slate-100 px-2.5 py-1 rounded-lg text-xs font-black border border-slate-200">
                                  {qty}
                                </span>
                              </td>
                              <td className="p-4">
                                <div className="text-xs font-semibold text-slate-700">
                                  {med.admin_initials || 'RN'}
                                </div>
                                {med.admin_names && (
                                  <div className="text-[10px] text-slate-400 font-medium truncate max-w-[160px]">
                                    {med.admin_names}
                                  </div>
                                )}
                              </td>
                              <td className="p-4 text-center text-xs font-bold text-slate-500">
                                {sheetDate}
                              </td>
                              <td className="p-4 text-right">
                                <button
                                  onClick={() => {
                                    setClinicalModalQueueId(med.queue_id);
                                    setIsClinicalModalOpen(true);
                                  }}
                                  className="inline-flex items-center gap-1.5 text-xs font-black text-[#0369a1] bg-sky-50 hover:bg-sky-100 border border-sky-200 px-3 py-1.5 rounded-lg transition-all"
                                >
                                  <Eye size={12} /> View Sheet
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── VISIT HISTORY TAB ── */}
          {activeTab === 'history' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h4 className="text-lg font-bold text-slate-900 mb-6">Past Encounters</h4>
              <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">

                <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-[#009ee3] text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                    <Clock size={16} />
                  </div>
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between space-x-2 mb-1">
                      <div className="font-bold text-slate-900">Today, 08:00 AM</div>
                      <div className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">In Progress</div>
                    </div>
                    <div className="text-slate-600 text-sm">General Ward Admission</div>
                  </div>
                </div>

                <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-slate-200 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                    <Clock size={16} />
                  </div>
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 bg-slate-50">
                    <div className="flex items-center justify-between space-x-2 mb-1">
                      <div className="font-bold text-slate-700">2025-11-02</div>
                      <div className="text-xs font-medium text-slate-500">Discharged</div>
                    </div>
                    <div className="text-slate-500 text-sm">Outpatient Consultation</div>
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>
      </div>
      <VitalsModal
        isOpen={isVitalsModalOpen}
        onClose={() => setIsVitalsModalOpen(false)}
        patientId={patientId}
        onVitalsSaved={(data) => {
          console.log('New vitals recorded:', data);
          fetchPatientAndVitals();
        }}
      />

      {isClinicalModalOpen && (
        <Modal
          isOpen={isClinicalModalOpen}
          onClose={() => setIsClinicalModalOpen(false)}
          title="Fill / Edit Clinical Observation Sheet"
          maxWidth="980px"
        >
          <ClinicalSheet 
            embeddedPatientId={selectedPatient.id}
            embeddedQueueId={clinicalModalQueueId}
            isEmbedded={true}
            onSaveSuccess={() => {
              setIsClinicalModalOpen(false);
              fetchClinicalDocs();
              fetchMedications();
            }}
          />
        </Modal>
      )}

      <QuickClinicalSheetModal
        isOpen={isQuickSheetModalOpen}
        onClose={() => setIsQuickSheetModalOpen(false)}
        patientId={patientId}
        queueId={clinicalModalQueueId}
        onSaveSuccess={() => {
          fetchClinicalDocs();
          fetchPatientAndVitals();
        }}
      />
    </div>
  );
}
