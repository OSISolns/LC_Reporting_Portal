import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocation } from 'react-router-dom';
import { FileText, Printer, Plus, Trash2, User, Search, Stethoscope, Save, Loader2, Activity } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import Modal from '../components/Modal';

const EPrescriptions = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [patientInfo, setPatientInfo] = useState({
    name: '',
    dob: '',
    id: '',
    date: new Date().toISOString().split('T')[0],
    diagnosis: '',
    age: '',
    gender: '',
    phone: '',
    insurance: ''
  });
  const [medications, setMedications] = useState([{ name: '', dosage: '', route: '', frequency: '', duration: '', instructions: '' }]);

  const [activeTab, setActiveTab] = useState('new'); // 'new' or 'completed'
  const [completedPrescriptions, setCompletedPrescriptions] = useState([]);
  const [loadingCompleted, setLoadingCompleted] = useState(false);
  const [selectedRx, setSelectedRx] = useState(null);

  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeSearchField, setActiveSearchField] = useState(null);
  const [inventoryItems, setInventoryItems] = useState([]);

  const [icd11Suggestions, setIcd11Suggestions] = useState([]);
  const [nursingData, setNursingData] = useState(null);

  useEffect(() => {
    if (patientInfo.diagnosis && patientInfo.diagnosis.length >= 2) {
      const delay = setTimeout(() => {
        api.post('/ai/clinical/icd10', { query: patientInfo.diagnosis })
          .then(res => {
            if (res.data?.success) {
              setIcd11Suggestions(res.data.data);
            }
          })
          .catch(err => console.error('Failed to get ICD-11 suggestions', err));
      }, 300);
      return () => clearTimeout(delay);
    } else {
      setIcd11Suggestions([]);
    }
  }, [patientInfo.diagnosis]);

  useEffect(() => {
    if (patientInfo.id) {
      api.get(`/clinical/observations/${patientInfo.id}/all`)
        .then(res => {
          if (res.data?.success && res.data.data?.length > 0) {
            const sorted = res.data.data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            const latest = sorted[0];
            setNursingData(latest);

            // Auto-fill diagnosis if present and currently empty
            if (!patientInfo.diagnosis && latest.identification_json) {
              try {
                const ident = JSON.parse(latest.identification_json);
                if (ident.diagnosis) {
                  setPatientInfo(prev => ({
                    ...prev,
                    diagnosis: ident.diagnosis
                  }));
                }
              } catch (e) {
                console.error('Failed to parse identification_json', e);
              }
            }
          } else {
            setNursingData(null);
          }
        })
        .catch(err => {
          console.error('Failed to fetch nursing data', err);
          setNursingData(null);
        });
    } else {
      setNursingData(null);
    }
  }, [patientInfo.id]);

  useEffect(() => {
    if (location.state?.patient) {
      const p = location.state.patient;
      let formattedDob = '';
      if (p.dob) {
        const dateParts = p.dob.split(/[-/]/);
        if (dateParts.length === 3) {
          if (dateParts[2].length === 4) {
            formattedDob = `${dateParts[2]}-${dateParts[1].padStart(2, '0')}-${dateParts[0].padStart(2, '0')}`;
          } else if (dateParts[0].length === 4) {
            formattedDob = `${dateParts[0]}-${dateParts[1].padStart(2, '0')}-${dateParts[2].padStart(2, '0')}`;
          } else {
            formattedDob = p.dob.substring(0, 10);
          }
        } else {
          formattedDob = p.dob.substring(0, 10);
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(formattedDob)) {
          formattedDob = '';
        }
      }

      setPatientInfo(prev => ({
        ...prev,
        name: p.full_name || p.name || '',
        id: p.pid || p.patient_id || '',
        dob: formattedDob,
        age: p.age || '',
        gender: p.gender || '',
        phone: p.phone || '',
        insurance: p.insurance || '',
      }));
    }
  }, [location.state]);

  useEffect(() => {
    api.get('/clinical/inventory/items')
      .then(res => {
        if (res.data?.success) {
          const consumableKeywords = [
            'set', 'papsmear', 'swab', 'povidone', 'eaux', 'gauze', 'vicryl',
            'ethilon', 'monocryl', 'blade', 'bandage', 'aquabloc', 'water',
            'syringe', 'needle', 'bag', 'catheter', 'glove', 'mask'
          ];
          const medsOnly = res.data.data.filter(item => {
            const lowerItem = item.toLowerCase();
            return !consumableKeywords.some(keyword => lowerItem.includes(keyword));
          });
          setInventoryItems(medsOnly);
        }
      })
      .catch(err => console.error('Failed to fetch inventory:', err));
  }, []);

  useEffect(() => {
    if (activeTab === 'completed') {
      setLoadingCompleted(true);
      api.get('/clinical/prescriptions/completed')
        .then(res => {
          if (res.data?.success) {
            setCompletedPrescriptions(res.data.data);
          }
        })
        .catch(err => console.error('Failed to fetch completed prescriptions:', err))
        .finally(() => setLoadingCompleted(false));
    }
  }, [activeTab]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      const query = activeSearchField === 'name' ? patientInfo.name : (activeSearchField === 'id' ? patientInfo.id : '');

      if (query && query.length >= 3) {
        setIsSearching(true);
        try {
          const res = await api.get(`/patients/search?q=${query}&limit=5`);
          if (res.data?.success) {
            setSearchResults(res.data.data);
            setShowDropdown(true);
          }
        } catch (err) {
          console.error('Patient search failed:', err);
        } finally {
          setIsSearching(false);
        }
      } else {
        setShowDropdown(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [patientInfo.name, patientInfo.id, activeSearchField]);

  const selectPatient = (p) => {
    let formattedDob = '';
    if (p.dob) {
      // SUKRAA often returns DD/MM/YYYY or DD-MM-YYYY.
      // <input type="date"> requires YYYY-MM-DD.
      const dateParts = p.dob.split(/[-/]/);
      if (dateParts.length === 3) {
        if (dateParts[2].length === 4) {
          // It's DD/MM/YYYY or MM/DD/YYYY. Assuming DD/MM/YYYY for local format
          formattedDob = `${dateParts[2]}-${dateParts[1].padStart(2, '0')}-${dateParts[0].padStart(2, '0')}`;
        } else if (dateParts[0].length === 4) {
          // It's YYYY-MM-DD
          formattedDob = `${dateParts[0]}-${dateParts[1].padStart(2, '0')}-${dateParts[2].padStart(2, '0')}`;
        } else {
          formattedDob = p.dob.substring(0, 10);
        }
      } else {
        formattedDob = p.dob.substring(0, 10);
      }

      // Failsafe: if the result isn't a valid YYYY-MM-DD, just leave it blank to avoid HTML errors
      if (!/^\d{4}-\d{2}-\d{2}$/.test(formattedDob)) {
        formattedDob = '';
      }
    }

    setPatientInfo({
      ...patientInfo,
      name: p.full_name,
      id: p.pid,
      dob: formattedDob,
      age: p.age || '',
      gender: p.gender || '',
      phone: p.phone || '',
      insurance: p.insurance || '',
    });
    setShowDropdown(false);
    setActiveSearchField(null);
  };

  const handlePatientChange = (e) => {
    const field = e.target.name;
    setActiveSearchField(field);
    setPatientInfo({
      ...patientInfo,
      [field]: e.target.value,
      ...(field === 'name' ? { id: '', age: '', gender: '', phone: '', insurance: '' } : {}),
      ...(field === 'id' ? { name: '', age: '', gender: '', phone: '', insurance: '' } : {})
    });
  };

  const handleMedChange = (index, e) => {
    const updatedMeds = [...medications];
    updatedMeds[index][e.target.name] = e.target.value;
    setMedications(updatedMeds);
  };

  const addMedication = () => {
    setMedications([...medications, { name: '', dosage: '', route: '', frequency: '', duration: '', instructions: '' }]);
  };

  const removeMedication = (index) => {
    const updatedMeds = medications.filter((_, i) => i !== index);
    setMedications(updatedMeds.length ? updatedMeds : [{ name: '', dosage: '', route: '', frequency: '', duration: '', instructions: '' }]);
  };

  const handlePrint = () => {
    if (!patientInfo.name) {
      toast.error('Please enter the patient name before printing.');
      return;
    }
    window.print();
  };

  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  const handleAIGenerateInstructions = async () => {
    // Filter out rows without a name to avoid useless requests
    const medsToGenerate = medications.filter(m => m.name && m.name.trim());
    if (medsToGenerate.length === 0) {
      toast.error('Please enter at least one medication name first.');
      return;
    }

    setIsGeneratingAI(true);
    try {
      const res = await api.post('/ai/clinical/instructions', { medications: medications });
      if (res.data?.success && res.data.data) {
        const updatedMeds = [...medications];
        res.data.data.forEach(item => {
          if (updatedMeds[item.index]) {
            // Number the instructions depending on rows as requested
            const rowNumber = item.index + 1;
            updatedMeds[item.index].instructions = item.instructions ? `${rowNumber}. ${item.instructions}` : '';
          }
        });
        setMedications(updatedMeds);
        toast.success('Instructions auto-filled successfully!');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate instructions.');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleSave = async () => {
    if (!patientInfo.id) {
      toast.error('Please enter patient details with a valid PID.');
      return;
    }

    // Filter out empty medications
    const validMedications = medications.filter(m => m.name && m.name.trim());
    if (validMedications.length === 0) {
      toast.error('Please enter at least one medication.');
      return;
    }

    setIsSaving(true);
    try {
      await api.post(`/patients/${patientInfo.id}/prescription`, {
        medications: validMedications,
        diagnosis: patientInfo.diagnosis
      });

      toast.success('Prescription saved and added to the clinical sheet successfully!');
      // Reset after save
      setPatientInfo({
        name: '',
        dob: '',
        id: '',
        date: new Date().toISOString().split('T')[0],
        diagnosis: '',
        age: '',
        gender: '',
        phone: '',
        insurance: ''
      });
      setMedications([{ name: '', dosage: '', route: '', frequency: '', duration: '', instructions: '' }]);
      setActiveTab('completed');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save prescription to patient record.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto pb-12">
      {/* ── Screen UI (Not Printed) ── */}
      <div className="print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <h1 className="m-0 text-3xl font-black text-slate-800 flex items-center gap-3">
              <FileText className="text-[#1B669E]" size={32} shrink-0 />
              <span className="truncate">E-Prescription Pad</span>
            </h1>
            <p className="m-0 mt-2 text-slate-500 font-medium">Issue digital prescriptions quickly and securely.</p>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-8 bg-slate-100 p-1.5 rounded-2xl w-max">
          <button
            onClick={() => setActiveTab('new')}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'new' ? 'bg-white text-[#1B669E] shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200'}`}
          >
            New Prescription
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'completed' ? 'bg-white text-[#1B669E] shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200'}`}
          >
            Completed Prescriptions
          </button>
        </div>

        {activeTab === 'new' && (
          <>
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm mb-10">
              <div className="bg-slate-50/50 p-8 border-b border-slate-100 flex items-center gap-4 rounded-t-[2rem]">
                <div className="p-3 bg-blue-50 rounded-xl">
                  <User className="text-[#1B669E]" size={24} />
                </div>
                <h2 className="m-0 text-xl font-black text-slate-800">Patient Details</h2>
              </div>
              <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8 pb-4">
                <div className="relative">
                  <label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Patient Name</label>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="text" name="name" value={patientInfo.name} onChange={handlePatientChange} placeholder="Search by Name..." className={`w-full pl-12 pr-4 py-3.5 rounded-xl border-2 ${activeSearchField === 'name' ? 'border-[#1B669E] ring-4 ring-[#1B669E]/10' : 'border-slate-200'} focus:border-[#1B669E] focus:ring-4 focus:ring-[#1B669E]/10 outline-none text-base transition-all font-medium bg-white`} />
                    {isSearching && activeSearchField === 'name' && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 text-[#1B669E] animate-spin" size={18} />}
                  </div>
                  {showDropdown && activeSearchField === 'name' && searchResults.length > 0 && (
                    <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.08)] max-h-80 overflow-y-auto overflow-x-hidden p-2">
                      {searchResults.map((p, i) => (
                        <div key={i} onClick={() => selectPatient(p)} className="p-4 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors mb-1 last:mb-0">
                          <p className="m-0 font-bold text-base text-slate-800 truncate">{p.full_name}</p>
                          <p className="m-0 mt-1 text-sm text-slate-500 flex flex-wrap items-center gap-2">
                            <span className="bg-slate-100 px-2 py-0.5 rounded text-xs font-bold text-slate-600 whitespace-nowrap">PID: {p.pid}</span>
                            <span className="hidden sm:inline">•</span>
                            <span className="truncate">{p.phone || 'No Phone'}</span>
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="relative">
                  <label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Patient ID</label>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="text" name="id" value={patientInfo.id} onChange={handlePatientChange} placeholder="Search by PID..." className={`w-full pl-12 pr-4 py-3.5 rounded-xl border-2 ${activeSearchField === 'id' ? 'border-[#1B669E] ring-4 ring-[#1B669E]/10' : 'border-slate-200'} focus:border-[#1B669E] focus:ring-4 focus:ring-[#1B669E]/10 outline-none text-base transition-all font-medium bg-white`} />
                    {isSearching && activeSearchField === 'id' && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 text-[#1B669E] animate-spin" size={18} />}
                  </div>
                  {showDropdown && activeSearchField === 'id' && searchResults.length > 0 && (
                    <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.08)] max-h-80 overflow-y-auto overflow-x-hidden p-2">
                      {searchResults.map((p, i) => (
                        <div key={i} onClick={() => selectPatient(p)} className="p-4 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors mb-1 last:mb-0">
                          <p className="m-0 font-bold text-base text-slate-800 truncate">{p.full_name}</p>
                          <p className="m-0 mt-1 text-sm text-slate-500 flex flex-wrap items-center gap-2">
                            <span className="bg-slate-100 px-2 py-0.5 rounded text-xs font-bold text-slate-600 whitespace-nowrap">PID: {p.pid}</span>
                            <span className="hidden sm:inline">•</span>
                            <span className="truncate">{p.phone || 'No Phone'}</span>
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Date of Birth</label>
                  <input type="date" name="dob" value={patientInfo.dob} onChange={handlePatientChange} className="w-full px-5 py-3.5 rounded-xl border-2 border-slate-200 focus:border-[#1B669E] focus:ring-4 focus:ring-[#1B669E]/10 outline-none text-base transition-all font-medium text-slate-700 bg-slate-50/50" />
                </div>
              </div>
              <div className="px-8 pb-8 grid grid-cols-1 md:grid-cols-4 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Age</label>
                  <input type="text" name="age" value={patientInfo.age || ''} onChange={handlePatientChange} placeholder="e.g. 45" className="w-full px-5 py-3.5 rounded-xl border-2 border-slate-200 focus:border-[#1B669E] focus:ring-4 focus:ring-[#1B669E]/10 outline-none text-base transition-all font-medium text-slate-700 bg-slate-50/50" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Gender</label>
                  <input type="text" name="gender" value={patientInfo.gender || ''} onChange={handlePatientChange} placeholder="e.g. Female" className="w-full px-5 py-3.5 rounded-xl border-2 border-slate-200 focus:border-[#1B669E] focus:ring-4 focus:ring-[#1B669E]/10 outline-none text-base transition-all font-medium text-slate-700 bg-slate-50/50" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Phone</label>
                  <input type="text" name="phone" value={patientInfo.phone || ''} onChange={handlePatientChange} placeholder="e.g. +250..." className="w-full px-5 py-3.5 rounded-xl border-2 border-slate-200 focus:border-[#1B669E] focus:ring-4 focus:ring-[#1B669E]/10 outline-none text-base transition-all font-medium text-slate-700 bg-slate-50/50" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Insurance</label>
                  <input type="text" name="insurance" value={patientInfo.insurance || ''} onChange={handlePatientChange} placeholder="e.g. RSSB" className="w-full px-5 py-3.5 rounded-xl border-2 border-slate-200 focus:border-[#1B669E] focus:ring-4 focus:ring-[#1B669E]/10 outline-none text-base transition-all font-medium text-slate-700 bg-slate-50/50" />
                </div>
              </div>
              <div className="px-8 pb-8">
                <label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Clinical Diagnosis (ICD-11)</label>
                <input type="text" list="icd11-codes" name="diagnosis" value={patientInfo.diagnosis} onChange={handlePatientChange} placeholder="Search conditions (e.g. malaria)... Only the ICD-11 code will be printed for privacy." className="w-full px-5 py-3.5 rounded-xl border-2 border-slate-200 focus:border-[#1B669E] focus:ring-4 focus:ring-[#1B669E]/10 outline-none text-base transition-all font-medium text-slate-800 bg-white" />
                <datalist id="icd11-codes">
                  {icd11Suggestions.map((item, idx) => (
                    <option key={idx} value={item.code}>{item.desc}</option>
                  ))}
                </datalist>
              </div>
            </div>

            {nursingData && nursingData.triage && Object.keys(nursingData.triage).length > 0 && (
              <div className="bg-white rounded-[2rem] border-2 border-blue-100 shadow-sm mb-10 overflow-hidden relative">
                <div className="absolute top-0 right-0 bg-blue-100 text-[#1B669E] px-4 py-1.5 rounded-bl-2xl text-xs font-bold tracking-wider uppercase">
                  From Nursing Hub
                </div>
                <div className="bg-blue-50/50 p-8 border-b border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-100 rounded-xl">
                      <Activity className="text-[#1B669E]" size={24} />
                    </div>
                    <h2 className="m-0 text-xl font-black text-slate-800">Latest Vitals & Triage</h2>
                  </div>
                  <span className="text-sm font-medium text-slate-500 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm">
                    Recorded: {new Date(nursingData.created_at).toLocaleString()}
                  </span>
                </div>
                <div className="p-8 grid grid-cols-2 md:grid-cols-5 gap-6 text-sm">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <span className="block text-slate-500 uppercase tracking-wider text-xs font-bold mb-1">Temperature</span>
                    <span className="font-bold text-slate-800 text-lg">{nursingData.triage.temp ? `${nursingData.triage.temp} °C` : '--'}</span>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <span className="block text-slate-500 uppercase tracking-wider text-xs font-bold mb-1">Pulse</span>
                    <span className="font-bold text-slate-800 text-lg">{nursingData.triage.pulse ? `${nursingData.triage.pulse} bpm` : '--'}</span>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <span className="block text-slate-500 uppercase tracking-wider text-xs font-bold mb-1">Resp. Rate</span>
                    <span className="font-bold text-slate-800 text-lg">{nursingData.triage.rr ? `${nursingData.triage.rr} /min` : '--'}</span>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <span className="block text-slate-500 uppercase tracking-wider text-xs font-bold mb-1">Blood Pressure</span>
                    <span className="font-bold text-slate-800 text-lg">{nursingData.triage.bp ? `${nursingData.triage.bp}` : '--'}</span>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <span className="block text-slate-500 uppercase tracking-wider text-xs font-bold mb-1">SpO2</span>
                    <span className="font-bold text-slate-800 text-lg">{nursingData.triage.spo2 ? `${nursingData.triage.spo2}%` : '--'}</span>
                  </div>
                </div>
                {(nursingData.triage.allergy_1 || nursingData.triage.allergy_2 || nursingData.triage.general_comments) && (
                  <div className="px-8 pb-8 pt-0 text-sm">
                    <div className="bg-red-50/50 rounded-xl p-4 border border-red-100">
                      {nursingData.triage.allergy_1 && (
                        <p className="m-0"><span className="font-bold text-red-500 uppercase text-xs tracking-wider">Allergies:</span> <span className="font-bold text-slate-700 ml-2">{nursingData.triage.allergy_1} {nursingData.triage.allergy_2}</span></p>
                      )}
                      {nursingData.triage.general_comments && (
                        <p className="mt-2 mb-0"><span className="font-bold text-slate-500 uppercase text-xs tracking-wider">Nursing Note:</span> <span className="font-medium text-slate-700 ml-2">{nursingData.triage.general_comments}</span></p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm mb-10">
              <div className="bg-slate-50/50 p-8 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-t-[2rem]">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-50 rounded-xl">
                    <Stethoscope className="text-[#1B669E]" size={24} />
                  </div>
                  <h2 className="m-0 text-xl font-black text-slate-800">Rx / Medications</h2>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={handleAIGenerateInstructions} disabled={isGeneratingAI} className="px-4 py-2.5 bg-indigo-50 text-sm font-bold text-indigo-600 rounded-xl flex items-center gap-2 hover:bg-indigo-100 transition-colors disabled:opacity-50">
                    {isGeneratingAI ? <Loader2 size={18} className="animate-spin" /> : <Activity size={18} />}
                    {isGeneratingAI ? 'Generating...' : 'Auto-Fill'}
                  </button>
                  <button onClick={addMedication} className="px-4 py-2.5 bg-blue-50 text-sm font-bold text-[#1B669E] rounded-xl flex items-center gap-2 hover:bg-blue-100 transition-colors">
                    <Plus size={18} /> Add Row
                  </button>
                </div>
              </div>

              <datalist id="inventory-meds">
                {inventoryItems.map((item, idx) => (
                  <option key={idx} value={item} />
                ))}
              </datalist>

              <datalist id="route-options">
                <option value="PO">PO (Oral)</option>
                <option value="IV">IV (Intravenous)</option>
                <option value="IM">IM (Intramuscular)</option>
                <option value="SC">SC (Subcutaneous)</option>
                <option value="SL">SL (Sublingual)</option>
                <option value="PR">PR (Rectal)</option>
                <option value="TOP">TOP (Topical)</option>
                <option value="INH">INH (Inhalation)</option>
                <option value="ODT">ODT (Orally Disintegrating Tablet)</option>
              </datalist>

              <datalist id="frequency-options">
                <option value="OD">OD (Once a day)</option>
                <option value="BID">BID (Twice a day)</option>
                <option value="TID">TID (Three times a day)</option>
                <option value="QID">QID (Four times a day)</option>
                <option value="Q4H">Q4H (Every 4 hours)</option>
                <option value="Q6H">Q6H (Every 6 hours)</option>
                <option value="Q8H">Q8H (Every 8 hours)</option>
                <option value="HS">HS (At bedtime)</option>
                <option value="PRN">PRN (As needed)</option>
                <option value="STAT">STAT (Immediately)</option>
                <option value="EOD">EOD (Every other day)</option>
              </datalist>

              <datalist id="duration-options">
                <option value="STAT">STAT (Once)</option>
                <option value="1 Day">1 Day</option>
                <option value="2 Days">2 Days</option>
                <option value="3 Days">3 Days</option>
                <option value="5 Days">5 Days</option>
                <option value="7 Days">7 Days</option>
                <option value="10 Days">10 Days</option>
                <option value="14 Days">14 Days</option>
                <option value="21 Days">21 Days</option>
                <option value="1 Month">1 Month</option>
                <option value="3 Months">3 Months</option>
                <option value="Ongoing">Ongoing</option>
              </datalist>

              <div className="p-0">
                {medications.map((med, index) => (
                  <div key={index} className="p-8 border-b border-slate-100 last:border-0 relative group transition-colors hover:bg-slate-50/30">
                    <div className="absolute top-8 right-8 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => removeMedication(index)} className="p-2.5 rounded-xl text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors shadow-sm bg-white border border-slate-100">
                        <Trash2 size={20} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-6 pr-14">
                      <div className="md:col-span-4">
                        <label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Medication Name</label>
                        <input type="text" list="inventory-meds" name="name" value={med.name} onChange={(e) => handleMedChange(index, e)} placeholder="e.g. Paracetamol IV 1g" className="w-full px-5 py-3.5 rounded-xl border-2 border-slate-200 focus:border-[#1B669E] focus:ring-4 focus:ring-[#1B669E]/10 outline-none text-base transition-all font-bold text-slate-800" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Dose</label>
                        <input type="text" name="dosage" value={med.dosage} onChange={(e) => handleMedChange(index, e)} placeholder="e.g. 500mg" className="w-full px-5 py-3.5 rounded-xl border-2 border-slate-200 focus:border-[#1B669E] focus:ring-4 focus:ring-[#1B669E]/10 outline-none text-base transition-all font-medium" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Route</label>
                        <input type="text" list="route-options" name="route" value={med.route} onChange={(e) => handleMedChange(index, e)} placeholder="e.g. PO" className="w-full px-5 py-3.5 rounded-xl border-2 border-slate-200 focus:border-[#1B669E] focus:ring-4 focus:ring-[#1B669E]/10 outline-none text-base transition-all font-medium" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Frequency</label>
                        <input type="text" list="frequency-options" name="frequency" value={med.frequency} onChange={(e) => handleMedChange(index, e)} placeholder="e.g. TID" className="w-full px-5 py-3.5 rounded-xl border-2 border-slate-200 focus:border-[#1B669E] focus:ring-4 focus:ring-[#1B669E]/10 outline-none text-base transition-all font-medium" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Duration</label>
                        <input type="text" list="duration-options" name="duration" value={med.duration} onChange={(e) => handleMedChange(index, e)} placeholder="e.g. 7 Days" className="w-full px-5 py-3.5 rounded-xl border-2 border-slate-200 focus:border-[#1B669E] focus:ring-4 focus:ring-[#1B669E]/10 outline-none text-base transition-all font-medium" />
                      </div>
                    </div>
                    <div className="pr-14">
                      <label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Special Instructions / Dispense</label>
                      <input type="text" name="instructions" value={med.instructions} onChange={(e) => handleMedChange(index, e)} placeholder="e.g. Take after meals. Dispense 21 tabs." className="w-full px-5 py-3.5 rounded-xl border-2 border-slate-200 focus:border-[#1B669E] focus:ring-4 focus:ring-[#1B669E]/10 outline-none text-base transition-all text-slate-600 font-medium" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-4 w-full md:w-auto mt-6">
              <button
                onClick={handlePrint}
                className="px-6 py-3.5 rounded-2xl border-2 border-[#1B669E] text-[#1B669E] font-bold text-base flex items-center gap-2 hover:bg-[#1B669E]/5 transition-all active:scale-95"
              >
                <Printer size={20} /> Print Rx
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-3.5 rounded-2xl bg-[#1B669E] text-white font-bold text-base flex items-center gap-2 shadow-lg shadow-[#1B669E]/20 hover:bg-[#155482] transition-all active:scale-95 hover:-translate-y-0.5 disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                {isSaving ? 'Saving...' : 'Save & Issue'}
              </button>
            </div>
          </>
        )}

        {activeTab === 'completed' && (
          <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-8">
            <h2 className="m-0 text-xl font-black text-slate-800 mb-6">Completed Prescriptions</h2>

            {loadingCompleted ? (
              <div className="flex justify-center p-12"><Loader2 className="animate-spin text-[#1B669E]" size={32} /></div>
            ) : completedPrescriptions.length === 0 ? (
              <div className="text-center p-12 text-slate-500 font-medium">No completed prescriptions found.</div>
            ) : (
              <div className="space-y-4">
                {completedPrescriptions.map(rx => (
                  <div key={rx.id} onClick={() => setSelectedRx(rx)} className="p-5 border border-slate-200 rounded-2xl hover:border-blue-200 hover:shadow-md cursor-pointer transition-all bg-slate-50/50">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="m-0 font-bold text-slate-800 text-lg">{rx.patient_name}</h3>
                        <p className="m-0 text-sm text-slate-500 font-medium">PID: {rx.patient_id} • Prescribed by: {rx.doctor_name}</p>
                      </div>
                      <span className="text-xs font-bold bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                        {new Date(rx.updated_at).toLocaleString()}
                      </span>
                    </div>
                    {rx.diagnosis && (
                      <div className="mb-3">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Diagnosis</span>
                        <p className="m-0 text-sm font-medium text-slate-700">{rx.diagnosis}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Medications</span>
                      <ul className="m-0 pl-4 space-y-1">
                        {rx.medications.map((m, i) => (
                          <li key={i} className="text-sm text-slate-700">
                            <span className="font-bold">{m.name}</span>
                            {m.dose && ` - ${m.dose}`}
                            {m.route && ` - ${m.route}`}
                            {m.frequency && ` - ${m.frequency}`}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Print Layout (Hidden on Screen) ── */}
      <div className="hidden print:block w-full text-black">
        <style>{`
          @page { size: A4; margin: 20mm; }
          body { font-family: system-ui, -apple-system, sans-serif; background: white; }
          .print-header { border-bottom: 2px solid #1B669E; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
          .print-rx { font-family: serif; font-size: 60px; color: #1B669E; font-weight: bold; line-height: 1; margin: 30px 0; }
          .med-row { border-bottom: 1px solid #eee; padding: 15px 0; }
        `}</style>

        <div className="print-header">
          <div>
            <h1 className="text-2xl font-black text-[#1B669E] m-0">LEGACY CLINICS</h1>
            <p className="text-sm m-0 text-gray-600">Kigali, Rwanda | +250 788 000 000</p>
          </div>
          <div className="text-right">
            <h2 className="text-lg font-bold m-0 text-gray-800">Dr. {user?.fullName || 'Medical Professional'}</h2>
            <p className="text-sm m-0 text-gray-600">Prescribing Physician</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-6 text-sm">
          <div>
            <p className="m-0"><span className="font-bold">Patient Name:</span> {patientInfo.name || '___________________________'}</p>
            <p className="m-0 mt-2"><span className="font-bold">DOB:</span> {patientInfo.dob || '________________'}</p>
            {(patientInfo.age || patientInfo.gender) && (
              <p className="m-0 mt-2">
                <span className="font-bold">Age / Gender:</span> {patientInfo.age || 'N/A'} / {patientInfo.gender || 'N/A'}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="m-0"><span className="font-bold">Date:</span> {patientInfo.date}</p>
            <p className="m-0 mt-2"><span className="font-bold">Patient ID:</span> {patientInfo.id || '________________'}</p>
            {patientInfo.insurance && (
              <p className="m-0 mt-2"><span className="font-bold">Insurance:</span> {patientInfo.insurance}</p>
            )}
          </div>
        </div>

        {patientInfo.diagnosis && (
          <div className="mb-8 text-sm">
            <p className="m-0"><span className="font-bold">Clinical Diagnosis:</span> {patientInfo.diagnosis}</p>
          </div>
        )}

        <div className="print-rx">Rx</div>

        <div className="mb-20">
          {medications.map((med, index) => (
            <div key={index} className="med-row">
              <p className="font-bold text-lg m-0 mb-1">{index + 1}. {med.name || '__________________________________'}</p>
              <div className="pl-6 text-sm text-gray-700">
                <p className="m-0 mb-1"><span className="font-bold">Sig:</span> {med.dosage ? `${med.dosage} ` : ''}{med.route} {med.frequency} {med.duration ? `for ${med.duration}` : ''}</p>
                {med.instructions && <p className="m-0 text-gray-600">Note: {med.instructions}</p>}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-32 pt-10 border-t border-gray-300 grid grid-cols-2">
          <div className="text-sm text-gray-500">
            <p>This prescription is valid for 30 days from date of issue.</p>
          </div>
          <div className="text-center">
            <div className="border-b border-black w-48 mx-auto mb-2"></div>
            <p className="text-sm font-bold">Doctor's Signature</p>
          </div>
        </div>
      </div>

      {selectedRx && (
        <Modal
          isOpen={selectedRx !== null}
          onClose={() => setSelectedRx(null)}
          title="Prescription Details"
          maxWidth="700px"
        >
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-100">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Patient Name</span>
                <span className="font-bold text-slate-800 text-lg">{selectedRx.patient_name}</span>
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Patient ID (PID)</span>
                <span className="font-bold text-slate-800 text-lg">#{selectedRx.patient_id}</span>
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Prescribed By</span>
                <span className="font-bold text-slate-800">{selectedRx.doctor_name || 'Medical Doctor'}</span>
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Date & Time</span>
                <span className="font-bold text-slate-800">{new Date(selectedRx.updated_at).toLocaleString()}</span>
              </div>
            </div>

            {selectedRx.diagnosis && (
              <div className="pb-4 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Clinical Diagnosis</span>
                <div className="px-4 py-2.5 bg-blue-50/50 text-[#1B669E] border border-blue-100 rounded-xl font-bold inline-block">
                  {selectedRx.diagnosis}
                </div>
              </div>
            )}

            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-3">Prescribed Medications</span>
              <div className="space-y-4">
                {selectedRx.medications.map((m, idx) => (
                  <div key={idx} className="p-4 border border-slate-100 rounded-xl bg-slate-50/50">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-slate-800">{idx + 1}. {m.name}</span>
                      {m.dose && <span className="text-xs font-bold bg-[#1B669E]/10 text-[#1B669E] px-2.5 py-1 rounded-md">Dose: {m.dose}</span>}
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs text-slate-500 font-medium pl-4">
                      {m.route && <div><span className="font-bold text-slate-400">Route:</span> {m.route}</div>}
                      {m.frequency && <div><span className="font-bold text-slate-400">Freq:</span> {m.frequency}</div>}
                      {m.duration && <div><span className="font-bold text-slate-400">Duration:</span> {m.duration}</div>}
                    </div>
                    {m.instructions && (
                      <div className="mt-2 text-xs bg-white border border-slate-100 p-2.5 rounded-lg text-slate-600 pl-4">
                        <span className="font-bold text-slate-400 block mb-0.5">Instructions:</span>
                        {m.instructions}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100 gap-3">
              <button
                onClick={() => {
                  setPatientInfo({
                    name: selectedRx.patient_name,
                    id: selectedRx.patient_id,
                    date: new Date(selectedRx.updated_at).toISOString().split('T')[0],
                    diagnosis: selectedRx.diagnosis || '',
                    dob: '',
                    age: '',
                    gender: '',
                    phone: '',
                    insurance: ''
                  });
                  setMedications(selectedRx.medications.map(m => ({
                    name: m.name,
                    dosage: m.dose || '',
                    route: m.route || '',
                    frequency: m.frequency || '',
                    duration: m.duration || '',
                    instructions: m.instructions || ''
                  })));
                  setTimeout(() => {
                    window.print();
                  }, 200);
                }}
                className="px-5 py-2.5 rounded-xl border border-[#1B669E] text-[#1B669E] font-bold text-sm flex items-center gap-2 hover:bg-[#1B669E]/5 transition-all"
              >
                <Printer size={16} /> Print Rx
              </button>
              <button
                onClick={() => setSelectedRx(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default EPrescriptions;
