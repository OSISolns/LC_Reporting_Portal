import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Badge, Button } from '../components/ui/index';
import { FileText, ClipboardList, Thermometer, Pill, Clock, ShoppingCart, User, Plus, Phone } from 'lucide-react';
import api from '../api/axios';
import { toast } from 'react-hot-toast';
import ClinicalSheet from './ClinicalSheet';
import VitalsModal from '../components/VitalsModal';

const TABS = [
  { id: 'summary', label: 'Summary', icon: <FileText size={16} /> },
  { id: 'observations', label: 'Observations', icon: <ClipboardList size={16} /> },
  { id: 'triage', label: 'Triage / Vitals', icon: <Thermometer size={16} /> },
  { id: 'consumables', label: 'Used Consumables', icon: <ShoppingCart size={16} /> },
  { id: 'medications', label: 'Medications', icon: <Pill size={16} /> },
  { id: 'clinical_sheet', label: 'Clinical Sheet', icon: <FileText size={16} /> },
  { id: 'history', label: 'Visit History', icon: <Clock size={16} /> },
];

export default function PatientRecords() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('summary');
  const [isVitalsModalOpen, setIsVitalsModalOpen] = useState(false);

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
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h4 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><FileText className="w-5 h-5 text-[#009ee3]" /> Active Problems</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="font-semibold text-slate-700">Hypertension (Primary)</span>
                      <span className="text-xs text-slate-500">Diagnosed: 2023-01-15</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="font-semibold text-slate-700">Type 2 Diabetes Mellitus</span>
                      <span className="text-xs text-slate-500">Diagnosed: 2024-11-02</span>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h4 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><ClipboardList className="w-5 h-5 text-[#009ee3]" /> Recent Clinical Notes</h4>
                  <div className="border-l-2 border-slate-200 pl-4 ml-2 space-y-6">
                    <div>
                      <div className="text-xs font-bold text-slate-500 mb-1">Today, 10:15 AM • Dr. Smith</div>
                      <p className="text-sm text-slate-700">Patient reports feeling dizzy upon standing. Blood pressure medication adjusted. Advised to stay hydrated.</p>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-500 mb-1">Yesterday, 04:30 PM • RN Alice</div>
                      <p className="text-sm text-slate-700">Routine checkup completed. Patient stable, no immediate concerns reported.</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h4 className="text-lg font-bold text-slate-900 mb-4">Allergies</h4>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="destructive" className="bg-red-50 text-red-700 border-red-200 hover:bg-red-100 px-3 py-1">Penicillin</Badge>
                    <Badge variant="destructive" className="bg-red-50 text-red-700 border-red-200 hover:bg-red-100 px-3 py-1">Peanuts</Badge>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h4 className="text-lg font-bold text-slate-900 mb-4">Latest Vitals</h4>
                  {vitalsHistory.length > 0 ? (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center"><span className="text-sm text-slate-500">Blood Pressure</span><span className="font-bold text-slate-900">{vitalsHistory[0].blood_pressure || '—'}</span></div>
                      <div className="flex justify-between items-center"><span className="text-sm text-slate-500">Heart Rate</span><span className="font-bold text-slate-900">{vitalsHistory[0].pulse ? `${vitalsHistory[0].pulse} bpm` : '—'}</span></div>
                      <div className="flex justify-between items-center"><span className="text-sm text-slate-500">Temperature</span><span className="font-bold text-slate-900">{vitalsHistory[0].temperature ? `${vitalsHistory[0].temperature} °C` : '—'}</span></div>
                      <div className="flex justify-between items-center"><span className="text-sm text-slate-500">SpO2</span><span className="font-bold text-slate-900">{vitalsHistory[0].spo2 ? `${vitalsHistory[0].spo2}%` : '—'}</span></div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider text-center py-4">No vitals recorded</p>
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
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex justify-between items-center mb-6">
                <h4 className="text-lg font-bold text-slate-900">Current Medications</h4>
                <Button
                  className="bg-[#009ee3] hover:bg-[#008bc7] text-white"
                  onClick={() => setActiveTab('clinical_sheet')}
                >
                  <Plus className="w-4 h-4 mr-2" /> Prescribe
                </Button>
              </div>
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-bold text-slate-500">
                  <tr><th className="p-3">Medication</th><th className="p-3">Dose & Route</th><th className="p-3">Frequency</th><th className="p-3">Status</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="p-3 font-bold text-slate-900">Lisinopril</td><td className="p-3">10 mg PO</td>
                    <td className="p-3">Daily</td><td className="p-3"><Badge className="bg-emerald-50 text-emerald-700 border-none">Active</Badge></td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-slate-900">Metformin</td><td className="p-3">500 mg PO</td>
                    <td className="p-3">BID w/ meals</td><td className="p-3"><Badge className="bg-emerald-50 text-emerald-700 border-none">Active</Badge></td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-slate-900">Ibuprofen</td><td className="p-3">400 mg PO</td>
                    <td className="p-3">PRN Pain</td><td className="p-3"><Badge variant="outline" className="text-slate-500 border-slate-200">Discontinued</Badge></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* ── CLINICAL SHEET TAB ── */}
          {activeTab === 'clinical_sheet' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <ClinicalSheet
                embeddedPatientId={selectedPatient.id || selectedPatient.patient_id}
                embeddedQueueId={selectedPatient.queue_id || 'Q-TEMP'}
                isEmbedded={true}
              />
            </div>
          )}

          {/* ── CONSUMABLES TAB ── */}
          {activeTab === 'consumables' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h4 className="text-lg font-bold text-slate-900 mb-4">Inventory / Used Consumables</h4>
              <div className="flex gap-4 items-center mb-8">
                <select className="flex-1 p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-700 outline-none focus:border-[#009ee3] focus:bg-white transition-colors">
                  <option>Select Item Used...</option>
                  <option>Surgical Gloves (Pair)</option>
                  <option>IV Fluid NS 500ml</option>
                  <option>Syringe 5ml</option>
                  <option>Gauze Swab (Pack)</option>
                </select>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-500">Qty:</span>
                  <input type="number" defaultValue="1" min="1" className="w-20 p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-700 outline-none focus:border-[#009ee3] focus:bg-white text-center transition-colors" />
                </div>
                <Button className="bg-[#009ee3] hover:bg-[#008bc7] text-white shadow-sm font-bold">
                  <Plus className="w-4 h-4 mr-2" /> Record Usage
                </Button>
              </div>

              <table className="w-full text-left text-sm text-slate-600 mb-6">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-bold text-slate-500">
                  <tr><th className="p-3">Item Name</th><th className="p-3 text-center w-24">Quantity</th><th className="p-3 w-40">Recorded By</th><th className="p-3 w-40 text-right">Time</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="p-3 font-semibold text-slate-800">IV Cannula 20G</td><td className="p-3 text-center font-bold">1</td><td className="p-3">RN Alice</td><td className="p-3 text-right">08:15 AM</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-slate-800">Adhesive Plaster (Roll)</td><td className="p-3 text-center font-bold">1</td><td className="p-3">RN Alice</td><td className="p-3 text-right">08:16 AM</td>
                  </tr>
                </tbody>
              </table>
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
    </div>
  );
}
