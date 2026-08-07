import React, { useState, useEffect, useMemo } from 'react';
import { 
  FlaskConical, ClipboardList, Activity, Search, Plus, CheckCircle, 
  Save, Barcode, Play, Clock, ShieldCheck, RefreshCw, Printer, 
  Send, Droplet, FileText, CheckCircle2, ArrowRight
} from 'lucide-react';
import api from '../../api/axios';
import { toast } from 'react-hot-toast';

// ── TUBE TYPES CONFIG (CLSI H3-A6 Order of Draw Sequence) ────────────────────
const TUBE_TYPES = [
  { id: 'Blue Citrate', name: 'Sodium Citrate (Light Blue Top)', drawOrder: 1, desc: 'Coagulation Studies (PT, APTT, D-Dimer)' },
  { id: 'SST Gold Gel', name: 'SST Gel Separator (Gold Top)', drawOrder: 2, desc: 'Clinical Chemistry, LFT, RFT, Electrolytes' },
  { id: 'Green Heparin', name: 'Lithium Heparin (Green Top)', drawOrder: 3, desc: 'STAT Plasma Chemistry & Electrolytes' },
  { id: 'Purple EDTA', name: 'EDTA K2/K3 (Purple Top)', drawOrder: 4, desc: 'Full Blood Count (FBC/CBC), ESR, HbA1c' },
  { id: 'Grey Fluoride', name: 'Sodium Fluoride (Grey Top)', drawOrder: 5, desc: 'Fasting Blood Glucose, Lactate' },
  { id: 'Yellow Urine Cup', name: 'Sterile Urine Container (Yellow Top)', drawOrder: 6, desc: 'Urinalysis, Urine Chemistry & Microscopy' },
];

// ── LIFECYCLE STAGES CONFIG ──────────────────────────────────────────────────
const LIFECYCLE_STAGES = [
  { id: 'Ordered', phase: 'pre-analytical', label: '1. Order Received' },
  { id: 'Collected', phase: 'pre-analytical', label: '2. Specimen Collected' },
  { id: 'Accessioned', phase: 'pre-analytical', label: '3. Barcode Accessioned' },
  { id: 'Centrifuged', phase: 'analytical', label: '4. Centrifuged / Prepped' },
  { id: 'Analyzing', phase: 'analytical', label: '5. Analyzer Testing' },
  { id: 'Verified', phase: 'post-analytical', label: '6. LIS Verified' },
  { id: 'Notified', phase: 'completed', label: '7. Report Dispatched' }
];

// ── FLOATING BUBBLE GUIDE TOOLTIP ────────────────────────────────────────────
const FieldTooltip = ({ text, children }) => (
  <div className="relative group w-full">
    {children}
    <div className="absolute bottom-full mb-1.5 left-2 z-50 px-2.5 py-1 bg-slate-900 text-white text-[10px] font-normal rounded-md shadow-md opacity-0 group-hover:opacity-100 transition-all duration-150 pointer-events-none whitespace-nowrap after:content-[''] after:absolute after:top-full after:left-4 after:-translate-x-1/2 after:border-4 after:border-transparent after:border-t-slate-900">
      {text}
    </div>
  </div>
);

const LabHub = () => {
  const [activeTab, setActiveTab] = useState('worklist'); // 'worklist', 'draw_order', 'analyzers', 'qc'
  const [phaseFilter, setPhaseFilter] = useState('all'); // 'all', 'pre-analytical', 'analytical', 'post-analytical'
  const [orders, setOrders] = useState([]);
  const [qcLogs, setQcLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Registration Form State
  const [showRegModal, setShowRegModal] = useState(false);
  const [patientId, setPatientId] = useState('');
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientGender, setPatientGender] = useState('Male');
  const [refProvider, setRefProvider] = useState('');
  const [specimenType, setSpecimenType] = useState('Venous Blood');
  const [tubeType, setTubeType] = useState('Purple EDTA');
  const [urgency, setUrgency] = useState('Routine');
  const [barcode, setBarcode] = useState('');
  const [testName, setTestName] = useState('Full Blood Count (FBC)');
  const [notes, setNotes] = useState('');

  // Selected Order & Verification State
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [resultParams, setResultParams] = useState([]);
  const [priorResults, setPriorResults] = useState([]);
  const [saving, setSaving] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  // Westgard QC Form State
  const [qcAnalyzer, setQcAnalyzer] = useState('Biochemistry Analyzer (Mindray BS-240)');
  const [qcParam, setQcParam] = useState('');
  const [qcLevel, setQcLevel] = useState('Level 1 Normal');
  const [qcMean, setQcMean] = useState('');
  const [qcSD, setQcSD] = useState('');
  const [qcValue, setQcValue] = useState('');
  const [qcCorrective, setQcCorrective] = useState('');

  // Analyzer Simulation State
  const [analyzerStatus, setAnalyzerStatus] = useState('Idle');

  // SUKRAA Patient Database Search State
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const [sukraaPatients, setSukraaPatients] = useState([]);
  const [searchingPatients, setSearchingPatients] = useState(false);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);

  // Search SUKRAA Patients
  useEffect(() => {
    if (!patientSearchQuery || patientSearchQuery.trim().length < 2) {
      setSukraaPatients([]);
      setShowPatientDropdown(false);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchingPatients(true);
      try {
        const res = await api.get(`/patients/search?q=${encodeURIComponent(patientSearchQuery.trim())}&limit=10`);
        if (res.data?.success) {
          setSukraaPatients(res.data.data || []);
          setShowPatientDropdown(true);
        }
      } catch (err) {
        console.error('Failed to search SUKRAA patient DB:', err);
      } finally {
        setSearchingPatients(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [patientSearchQuery]);

  const handleSelectSukraaPatient = (pat) => {
    setPatientId(pat.pid || '');
    setPatientName(pat.full_name || '');
    setPatientAge(pat.age ? String(pat.age) : '');
    setPatientGender(pat.gender || 'Male');
    if (pat.referrer_name) setRefProvider(pat.referrer_name);
    setPatientSearchQuery('');
    setShowPatientDropdown(false);
    toast.success(`Selected patient ${pat.full_name} (${pat.pid})`);
  };

  // Fetch Orders
  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await api.get('/lab/orders');
      if (res.data?.success) {
        setOrders(res.data.data || []);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load lab orders.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Quality Control Logs
  const fetchQCLogs = async () => {
    try {
      const res = await api.get('/lab/qc-logs');
      if (res.data?.success) {
        setQcLogs(res.data.data || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchQCLogs();
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Details for Selected Order
  const handleSelectOrder = async (order) => {
    try {
      const res = await api.get(`/lab/orders/${order.id}`);
      if (res.data?.success) {
        setSelectedOrder(res.data.data.order);
        setResultParams(res.data.data.results || []);
        setPriorResults(res.data.data.prior_results || []);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch order details.');
    }
  };

  // Generate Random Barcode
  const handleGenerateBarcode = () => {
    const rand = Math.floor(100000 + Math.random() * 900000);
    setBarcode(`LAB-${rand}`);
  };

  // Register New Specimen Order
  const handleRegisterSpecimen = async (e) => {
    e.preventDefault();
    if (!patientId || !patientName || !barcode) {
      return toast.error('Please fill in patient ID, name, and barcode.');
    }

    try {
      const res = await api.post('/lab/register', {
        patient_id: patientId,
        patient_name: patientName,
        patient_age: patientAge,
        patient_gender: patientGender,
        referring_provider: refProvider,
        specimen_type: specimenType,
        specimen_barcode: barcode,
        tube_type: tubeType,
        test_name: testName,
        urgency: urgency,
        notes
      });

      if (res.data?.success) {
        toast.success(`Specimen ${res.data.data.accession_number} registered.`);
        setShowRegModal(false);
        setPatientId('');
        setPatientName('');
        setPatientAge('');
        setBarcode('');
        setNotes('');
        fetchOrders();
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to register specimen.');
    }
  };

  // Transition Order Stage
  const handleUpdateStage = async (orderId, newStage, hilIndex = 'Normal') => {
    try {
      const res = await api.put(`/lab/orders/${orderId}/stage`, { stage: newStage, hil_index: hilIndex });
      if (res.data?.success) {
        toast.success(`Stage updated: ${newStage}`);
        fetchOrders();
        if (selectedOrder?.id === orderId) {
          handleSelectOrder(selectedOrder);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to update stage.');
    }
  };

  // Save Results & Auto-Verify
  const handleSaveResults = async () => {
    if (!selectedOrder) return;
    setSaving(true);
    try {
      const res = await api.post(`/lab/orders/${selectedOrder.id}/results`, {
        results: resultParams,
        hil_index: selectedOrder.hil_index || 'Normal'
      });
      if (res.data?.success) {
        toast.success(res.data.message);
        fetchOrders();
        handleSelectOrder(selectedOrder);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to save results.');
    } finally {
      setSaving(false);
    }
  };

  // Manual Technologist Verification & Signoff
  const handleVerifyOrder = async () => {
    if (!selectedOrder) return;
    const missingValues = resultParams.some(p => !p.parameter_value);
    if (missingValues) {
      return toast.error('Please enter values for all parameters before verifying.');
    }

    setSaving(true);
    try {
      await api.post(`/lab/orders/${selectedOrder.id}/results`, {
        results: resultParams,
        hil_index: selectedOrder.hil_index || 'Normal'
      });

      const res = await api.post(`/lab/orders/${selectedOrder.id}/verify`, {
        verified_by_name: 'Medical Technologist (Signed)'
      });
      if (res.data?.success) {
        toast.success('Lab report verified.');
        fetchOrders();
        handleSelectOrder(selectedOrder);
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to verify order.');
    } finally {
      setSaving(false);
    }
  };

  // Dispatch LIS Report & Notify Patient
  const handleNotifyPatient = async (orderId) => {
    try {
      const res = await api.post(`/lab/orders/${orderId}/notify`);
      if (res.data?.success) {
        toast.success('Report dispatched and patient notified.');
        fetchOrders();
        if (selectedOrder?.id === orderId) {
          handleSelectOrder(selectedOrder);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to dispatch notification.');
    }
  };

  // Simulate Ingestion from Analyzer
  const handleSimulateIngestion = () => {
    if (!selectedOrder) {
      return toast.error('Please select an active specimen order first.');
    }
    
    setAnalyzerStatus('Ingesting');
    setTimeout(() => {
      setResultParams(prev => prev.map(p => {
        let mockVal = '';
        const name = (p.parameter_name || '').toLowerCase();
        if (name.includes('hemoglobin')) mockVal = (13.2 + (Math.random() * 2.5)).toFixed(1);
        else if (name.includes('wbc')) mockVal = (5.8 + (Math.random() * 3.0)).toFixed(1);
        else if (name.includes('platelet')) mockVal = Math.floor(210 + Math.random() * 140).toString();
        else if (name.includes('rbc')) mockVal = (4.6 + (Math.random() * 0.8)).toFixed(2);
        else if (name.includes('alt')) mockVal = Math.floor(22 + Math.random() * 20).toString();
        else if (name.includes('ast')) mockVal = Math.floor(18 + Math.random() * 18).toString();
        else if (name.includes('alp')) mockVal = Math.floor(65 + Math.random() * 50).toString();
        else if (name.includes('bilirubin')) mockVal = (0.5 + Math.random() * 0.4).toFixed(1);
        else if (name.includes('urea')) mockVal = Math.floor(11 + Math.random() * 6).toString();
        else if (name.includes('creatinine')) mockVal = (0.9 + Math.random() * 0.2).toFixed(2);
        else if (name.includes('potassium')) mockVal = (4.1 + Math.random() * 0.5).toFixed(1);
        else if (name.includes('sodium')) mockVal = Math.floor(138 + Math.random() * 5).toString();
        else mockVal = '2.5';

        let abnormal = false;
        if (p.reference_range && mockVal) {
          const numVal = parseFloat(mockVal);
          const rangeParts = p.reference_range.split('-').map(x => parseFloat(x.trim()));
          if (rangeParts.length === 2 && !isNaN(numVal)) {
            abnormal = numVal < rangeParts[0] || numVal > rangeParts[1];
          }
        }
        return { ...p, parameter_value: mockVal, is_abnormal: abnormal };
      }));

      setAnalyzerStatus('Idle');
      toast.success(`Data ingestion complete for ${selectedOrder.specimen_barcode}`);
    }, 1000);
  };

  // Submit Westgard QC Run
  const handleRecordQCRun = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/lab/qc-run', {
        analyzer_name: qcAnalyzer,
        parameter_name: qcParam,
        control_level: qcLevel,
        mean_target: parseFloat(qcMean),
        sd_target: parseFloat(qcSD),
        measured_value: parseFloat(qcValue),
        corrective_action: qcCorrective
      });

      if (res.data?.success) {
        if (res.data.data.status === 'Passed') {
          toast.success('QC Passed (Westgard valid)');
        } else {
          toast.error(`QC Rejected: ${res.data.data.westgard_rule_breach}`);
        }
        fetchQCLogs();
        setQcCorrective('');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to record QC run.');
    }
  };

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q.trim() || 
        o.patient_name?.toLowerCase().includes(q) || 
        o.patient_id?.toLowerCase().includes(q) || 
        o.accession_number?.toLowerCase().includes(q) || 
        o.specimen_barcode?.toLowerCase().includes(q);

      const matchesPhase = phaseFilter === 'all' || o.phase === phaseFilter;

      return matchesSearch && matchesPhase;
    });
  }, [orders, searchQuery, phaseFilter]);

  // Metrics
  const stats = useMemo(() => {
    const total = orders.length;
    const statCount = orders.filter(o => o.urgency === 'STAT').length;
    const preCount = orders.filter(o => o.phase === 'pre-analytical').length;
    const autoVerifiedCount = orders.filter(o => o.auto_verified === 1 || o.auto_verified === true).length;
    const autoRatio = total > 0 ? Math.round((autoVerifiedCount / total) * 100) : 0;

    return { total, statCount, preCount, autoVerifiedCount, autoRatio };
  }, [orders]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 font-sans text-slate-900 antialiased">
      {/* ── MINIMALIST HEADER ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FlaskConical className="text-slate-700" size={20} /> Laboratory Hub
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 font-normal">
            Outpatient Specimen Diagnostics & Worklist Management
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={() => { handleGenerateBarcode(); setShowRegModal(true); }}
            className="flex-1 sm:flex-none px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Plus size={15} /> Register Specimen
          </button>
          <button
            onClick={fetchOrders}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer border border-slate-200"
            title="Refresh"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── CLEAN METRICS CARDS ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Active Orders</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-semibold text-slate-900">{stats.total}</span>
            <ClipboardList className="text-slate-300" size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider block">STAT Urgent (&lt;45m)</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-semibold text-rose-600">{stats.statCount}</span>
            <Clock className="text-rose-300" size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pre-Analytical</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-semibold text-slate-900">{stats.preCount}</span>
            <Droplet className="text-slate-300" size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Auto-Verified</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-semibold text-emerald-600">{stats.autoRatio}%</span>
            <ShieldCheck className="text-emerald-300" size={18} />
          </div>
        </div>
      </div>

      {/* ── NAVIGATION TABS ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
        <div className="flex gap-1.5">
          {[
            { id: 'worklist', label: 'Specimen Worklist', icon: Activity },
            { id: 'draw_order', label: 'Order of Draw', icon: Droplet },
            { id: 'analyzers', label: 'Analyzer Ingestion', icon: Play },
            { id: 'qc', label: 'Quality Control', icon: ShieldCheck }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors ${
                  isActive ? 'bg-slate-900 text-white font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon size={14} /> {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === 'worklist' && (
          <div className="flex items-center gap-1 text-xs">
            <span className="text-slate-400 font-medium mr-1">Phase:</span>
            {['all', 'pre-analytical', 'analytical', 'post-analytical'].map(p => (
              <button
                key={p}
                onClick={() => setPhaseFilter(p)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium capitalize cursor-pointer transition-colors ${
                  phaseFilter === p ? 'bg-slate-200 text-slate-900 font-semibold' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── TAB 1: SPECIMEN WORKLIST ── */}
      {activeTab === 'worklist' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left Table */}
          <div className="lg:col-span-2 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search patient, accession #, barcode..."
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200/80 rounded-lg text-xs font-normal focus:outline-none focus:border-slate-400 shadow-2xs"
              />
            </div>

            <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200/80">
                    <tr>
                      <th className="py-2.5 px-3.5">Patient / Accession</th>
                      <th className="py-2.5 px-3.5">Specimen / Tube</th>
                      <th className="py-2.5 px-3.5">Stage</th>
                      <th className="py-2.5 px-3.5">Urgency</th>
                      <th className="py-2.5 px-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-normal text-slate-700">
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="py-8 text-center text-slate-400">
                          No specimen orders found.
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map(order => {
                        const isSelected = selectedOrder?.id === order.id;
                        return (
                          <tr 
                            key={order.id} 
                            onClick={() => handleSelectOrder(order)}
                            className={`cursor-pointer transition-colors ${
                              isSelected ? 'bg-slate-100/70 border-l-2 border-l-slate-900' : 'hover:bg-slate-50'
                            }`}
                          >
                            <td className="py-2.5 px-3.5">
                              <span className="font-semibold text-slate-900 block">{order.patient_name}</span>
                              <span className="text-[10px] text-slate-400 font-mono">ID: {order.patient_id} • {order.accession_number}</span>
                            </td>

                            <td className="py-2.5 px-3.5">
                              <span className="font-medium text-slate-800 block">{order.specimen_type}</span>
                              <span className="text-[10px] text-slate-500 font-mono">
                                {order.tube_type || 'Purple EDTA'}
                              </span>
                            </td>

                            <td className="py-2.5 px-3.5">
                              <span className="inline-block px-2 py-0.5 text-[10px] font-medium rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                                {order.stage || 'Collected'}
                              </span>
                              {order.auto_verified === 1 && (
                                <span className="ml-1 text-[9px] font-semibold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                                  AUTO
                                </span>
                              )}
                            </td>

                            <td className="py-2.5 px-3.5">
                              {order.urgency === 'STAT' ? (
                                <span className="font-semibold text-rose-600 text-[11px]">
                                  STAT ({order.tat_remaining_mins ?? 45}m)
                                </span>
                              ) : (
                                <span className="text-slate-500 text-[11px]">
                                  Routine
                                </span>
                              )}
                            </td>

                            <td className="py-2.5 px-3.5 text-right">
                              <button
                                onClick={(e) => { e.stopPropagation(); handleSelectOrder(order); }}
                                className="px-2.5 py-1 text-slate-700 hover:text-slate-900 hover:bg-slate-100 text-[11px] font-medium rounded transition-colors cursor-pointer border border-slate-200"
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Action Sidebar */}
          <div className="space-y-4">
            {selectedOrder ? (
              <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-2xs space-y-4">
                <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Selected Specimen</span>
                    <h3 className="text-sm font-bold text-slate-900">{selectedOrder.patient_name}</h3>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">Barcode: {selectedOrder.specimen_barcode}</p>
                  </div>
                  <span className="text-[11px] font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                    {selectedOrder.accession_number}
                  </span>
                </div>

                {/* Stage Progress */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Advance Lifecycle Stage</span>
                  <div className="grid grid-cols-1 gap-1">
                    {LIFECYCLE_STAGES.map(st => {
                      const isCurrent = selectedOrder.stage === st.id;
                      return (
                        <button
                          key={st.id}
                          onClick={() => handleUpdateStage(selectedOrder.id, st.id)}
                          className={`p-2 rounded-lg text-xs font-medium flex items-center justify-between transition-colors cursor-pointer border ${
                            isCurrent 
                              ? 'bg-slate-900 text-white border-slate-900 font-semibold' 
                              : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200/80'
                          }`}
                        >
                          <span>{st.label}</span>
                          <span className="text-[9px] opacity-75 uppercase font-mono">{st.phase}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Parameter Verification Inputs */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-slate-800">Parameters</span>
                    <button
                      onClick={handleSaveResults}
                      disabled={saving}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium rounded transition-colors cursor-pointer"
                    >
                      {saving ? 'Processing...' : 'Run Auto-Verify'}
                    </button>
                  </div>

                  <div className="space-y-2">
                    {resultParams.map(param => (
                      <div key={param.id} className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-lg space-y-1">
                        <div className="flex justify-between text-[11px] text-slate-700">
                          <span className="font-medium">{param.parameter_name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{param.reference_range} {param.unit}</span>
                        </div>
                        <FieldTooltip text={`Reference range: ${param.reference_range || 'Standard'} ${param.unit || ''}`}>
                          <input
                            type="text"
                            value={param.parameter_value || ''}
                            onChange={e => {
                              const val = e.target.value;
                              setResultParams(prev => prev.map(p => p.id === param.id ? { ...p, parameter_value: val } : p));
                            }}
                            placeholder="Enter measurement..."
                            className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded text-xs font-mono font-medium text-slate-900 focus:outline-none focus:border-slate-400"
                          />
                        </FieldTooltip>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={handleVerifyOrder}
                    disabled={saving || selectedOrder.stage === 'Verified' || selectedOrder.stage === 'Notified'}
                    className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-medium text-xs rounded transition-colors cursor-pointer"
                  >
                    Tech Sign-Off
                  </button>
                  <button
                    onClick={() => setShowReportModal(true)}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded transition-colors cursor-pointer"
                  >
                    Print Report
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-slate-200/80 rounded-xl p-6 text-center text-slate-400 space-y-1">
                <FlaskConical className="mx-auto text-slate-300 mb-1" size={24} />
                <p className="text-xs font-medium text-slate-600">No Specimen Selected</p>
                <p className="text-[11px] text-slate-400">Click an order from the table to view details.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: ORDER OF DRAW ── */}
      {activeTab === 'draw_order' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200/80 p-5 rounded-xl space-y-1">
            <h2 className="text-sm font-semibold text-slate-900">Standardized Order of Draw (CLSI H3-A6)</h2>
            <p className="text-xs text-slate-500">Phlebotomy sequence to prevent additive cross-contamination.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[...TUBE_TYPES].sort((a, b) => a.drawOrder - b.drawOrder).map(tube => (
              <div key={tube.id} className="bg-white border border-slate-200/80 rounded-xl p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    Step #{tube.drawOrder}
                  </span>
                </div>
                <h3 className="text-xs font-bold text-slate-900">{tube.id}</h3>
                <p className="text-[11px] text-slate-500">{tube.name}</p>
                <div className="pt-2 border-t border-slate-100">
                  <p className="text-[11px] text-slate-600">{tube.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 3: ANALYZER INGESTION ── */}
      {activeTab === 'analyzers' && (
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Automated LIS Analyzer Interface</h3>
            <p className="text-xs text-slate-500">Simulate data feed from Mindray and Sysmex automated analyzers.</p>
          </div>

          {selectedOrder ? (
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-lg flex justify-between items-center">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Target Specimen</span>
                <span className="text-xs font-bold text-slate-900 font-mono">{selectedOrder.specimen_barcode} ({selectedOrder.patient_name})</span>
              </div>
              <button
                onClick={handleSimulateIngestion}
                disabled={analyzerStatus === 'Ingesting'}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded transition-colors cursor-pointer"
              >
                {analyzerStatus === 'Ingesting' ? 'Ingesting...' : 'Simulate Analyzer Feed'}
              </button>
            </div>
          ) : (
            <p className="text-xs text-slate-500">Please select an order from the worklist first.</p>
          )}
        </div>
      )}

      {/* ── TAB 4: QUALITY CONTROL ── */}
      {activeTab === 'qc' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Form */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Daily IQC Run Entry</h3>
            <form onSubmit={handleRecordQCRun} className="space-y-2.5 text-xs">
              <div>
                <label className="text-[10px] font-medium text-slate-500 block mb-1">Analyzer</label>
                <select
                  value={qcAnalyzer}
                  onChange={e => setQcAnalyzer(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded font-medium text-slate-800"
                >
                  <option>Biochemistry Analyzer (Mindray BS-240)</option>
                  <option>Hematology Analyzer (Sysmex XN-550)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-medium text-slate-500 block mb-1">Parameter</label>
                <input
                  type="text"
                  value={qcParam}
                  onChange={e => setQcParam(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded font-medium text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-medium text-slate-500 block mb-1">Mean Target (μ)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={qcMean}
                    onChange={e => setQcMean(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded font-mono text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-slate-500 block mb-1">SD Target (σ)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={qcSD}
                    onChange={e => setQcSD(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded font-mono text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-medium text-slate-500 block mb-1">Measured Value</label>
                <input
                  type="number"
                  step="0.01"
                  value={qcValue}
                  onChange={e => setQcValue(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded font-mono text-slate-900"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded transition-colors cursor-pointer"
              >
                Record QC Run
              </button>
            </form>
          </div>

          {/* Logs */}
          <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Westgard QC Execution Logs</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200/80">
                  <tr>
                    <th className="py-2 px-3">Analyzer & Param</th>
                    <th className="py-2 px-3">Measured</th>
                    <th className="py-2 px-3">Z-Score</th>
                    <th className="py-2 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-normal text-slate-700">
                  {qcLogs.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="py-6 text-center text-slate-400">No QC logs recorded.</td>
                    </tr>
                  ) : (
                    qcLogs.map(log => (
                      <tr key={log.id}>
                        <td className="py-2 px-3">
                          <span className="font-semibold text-slate-900 block">{log.parameter_name}</span>
                          <span className="text-[10px] text-slate-400">{log.analyzer_name}</span>
                        </td>
                        <td className="py-2 px-3 font-mono font-medium">{log.measured_value}</td>
                        <td className="py-2 px-3 font-mono">{log.z_score} SD</td>
                        <td className="py-2 px-3">
                          <span className={`px-2 py-0.5 text-[10px] font-medium rounded ${
                            log.status === 'Passed' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── REGISTRATION MODAL ── */}
      {showRegModal && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-xl border border-slate-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
              <h3 className="text-sm font-bold text-slate-900">Register Specimen</h3>
              <button onClick={() => setShowRegModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer text-base">✕</button>
            </div>

            <form onSubmit={handleRegisterSpecimen} className="space-y-3 text-xs">
              {/* SUKRAA Patient Lookup Field */}
              <div className="relative">
                <label className="text-[10px] font-semibold text-slate-700 block mb-1">Search SUKRAA Patient Database</label>
                <FieldTooltip text="Search by name, PID, or phone number to auto-populate patient record">
                  <input
                    type="text"
                    value={patientSearchQuery}
                    onChange={e => setPatientSearchQuery(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs font-medium text-slate-900 focus:outline-none focus:border-slate-400"
                  />
                </FieldTooltip>
                {searchingPatients && (
                  <span className="absolute right-2.5 top-7 text-[10px] text-slate-400">Searching...</span>
                )}
                {showPatientDropdown && sukraaPatients.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto divide-y divide-slate-100 text-xs">
                    {sukraaPatients.map(pat => (
                      <div
                        key={pat.pid}
                        onClick={() => handleSelectSukraaPatient(pat)}
                        className="p-2 hover:bg-slate-50 cursor-pointer flex justify-between items-center"
                      >
                        <div>
                          <span className="font-semibold text-slate-900 block">{pat.full_name}</span>
                          <span className="text-[10px] text-slate-500 font-mono">PID: {pat.pid} • {pat.age || '—'} yrs • {pat.gender || '—'}</span>
                        </div>
                        {pat.referrer_name && (
                          <span className="text-[10px] text-slate-400 italic">{pat.referrer_name}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-medium text-slate-500 block mb-1">Patient ID *</label>
                  <FieldTooltip text="Unique patient identifier assigned in medical record system">
                    <input
                      type="text"
                      required
                      value={patientId}
                      onChange={e => setPatientId(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded font-mono font-medium text-slate-900"
                    />
                  </FieldTooltip>
                </div>
                <div>
                  <label className="text-[10px] font-medium text-slate-500 block mb-1">Patient Name *</label>
                  <FieldTooltip text="Full legal patient name">
                    <input
                      type="text"
                      required
                      value={patientName}
                      onChange={e => setPatientName(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded font-medium text-slate-900"
                    />
                  </FieldTooltip>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-medium text-slate-500 block mb-1">Age</label>
                  <FieldTooltip text="Patient age in years">
                    <input
                      type="text"
                      value={patientAge}
                      onChange={e => setPatientAge(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded font-medium text-slate-900"
                    />
                  </FieldTooltip>
                </div>
                <div>
                  <label className="text-[10px] font-medium text-slate-500 block mb-1">Gender</label>
                  <FieldTooltip text="Biological gender baseline">
                    <select
                      value={patientGender}
                      onChange={e => setPatientGender(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded font-medium text-slate-900"
                    >
                      <option>Male</option>
                      <option>Female</option>
                    </select>
                  </FieldTooltip>
                </div>
                <div>
                  <label className="text-[10px] font-medium text-slate-500 block mb-1">Urgency</label>
                  <FieldTooltip text="STAT = emergency processing (<45m)">
                    <select
                      value={urgency}
                      onChange={e => setUrgency(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded font-medium text-slate-900"
                    >
                      <option value="Routine">Routine</option>
                      <option value="STAT">STAT</option>
                    </select>
                  </FieldTooltip>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-medium text-slate-500 block mb-1">Test Assay</label>
                  <FieldTooltip text="Target laboratory diagnostic panel">
                    <select
                      value={testName}
                      onChange={e => setTestName(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded font-medium text-slate-900"
                    >
                      <option>Full Blood Count (FBC/CBC)</option>
                      <option>Liver Function Test (LFT)</option>
                      <option>Renal & Electrolytes (RFT)</option>
                      <option>Cardiac Troponin I (STAT)</option>
                    </select>
                  </FieldTooltip>
                </div>
                <div>
                  <label className="text-[10px] font-medium text-slate-500 block mb-1">Tube Selection</label>
                  <FieldTooltip text="Container top color based on CLSI H3-A6 order of draw">
                    <select
                      value={tubeType}
                      onChange={e => setTubeType(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded font-medium text-slate-900"
                    >
                      {TUBE_TYPES.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </FieldTooltip>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-medium text-slate-500 block mb-1">Barcode Label *</label>
                <div className="flex gap-2">
                  <FieldTooltip text="Unique barcode identifier printed on physical specimen tube">
                    <input
                      type="text"
                      required
                      value={barcode}
                      onChange={e => setBarcode(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded font-mono font-medium text-slate-900"
                    />
                  </FieldTooltip>
                  <button
                    type="button"
                    onClick={handleGenerateBarcode}
                    className="px-3 py-2 bg-slate-800 text-white font-medium text-xs rounded cursor-pointer shrink-0"
                  >
                    Gen
                  </button>
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowRegModal(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded transition-colors cursor-pointer"
                >
                  Submit Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── PRINTABLE REPORT MODAL ── */}
      {showReportModal && selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl border border-slate-200 text-slate-900">
            <div className="flex justify-between items-start border-b border-slate-200 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">LABORATORY DIAGNOSTIC REPORT</h2>
                <p className="text-[11px] text-slate-500 font-normal">Outpatient Pathology & LIS Verification</p>
              </div>
              <button onClick={() => setShowReportModal(false)} className="text-slate-400 hover:text-slate-600 font-bold text-base cursor-pointer">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
              <div>
                <p><strong className="text-slate-500">Patient Name:</strong> {selectedOrder.patient_name}</p>
                <p><strong className="text-slate-500">Patient ID:</strong> {selectedOrder.patient_id}</p>
                <p><strong className="text-slate-500">Age/Gender:</strong> {selectedOrder.patient_age || '—'} / {selectedOrder.patient_gender}</p>
              </div>
              <div>
                <p><strong className="text-slate-500">Accession No:</strong> {selectedOrder.accession_number}</p>
                <p><strong className="text-slate-500">Barcode:</strong> {selectedOrder.specimen_barcode}</p>
                <p><strong className="text-slate-500">Ref Provider:</strong> {selectedOrder.referring_provider || 'Dr. Sarah Connor'}</p>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-slate-800">Test Parameters</h4>
              <table className="w-full text-left text-xs border-collapse border border-slate-200">
                <thead className="bg-slate-50 text-slate-700 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="py-1.5 px-2.5 border border-slate-200">Parameter</th>
                    <th className="py-1.5 px-2.5 border border-slate-200">Result</th>
                    <th className="py-1.5 px-2.5 border border-slate-200">Ref Range</th>
                    <th className="py-1.5 px-2.5 border border-slate-200">Unit</th>
                    <th className="py-1.5 px-2.5 border border-slate-200">Flag</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-normal">
                  {resultParams.map(r => (
                    <tr key={r.id}>
                      <td className="py-1.5 px-2.5 border border-slate-200 font-medium">{r.parameter_name}</td>
                      <td className="py-1.5 px-2.5 border border-slate-200 font-mono font-semibold">{r.parameter_value || '—'}</td>
                      <td className="py-1.5 px-2.5 border border-slate-200 font-mono text-slate-500">{r.reference_range}</td>
                      <td className="py-1.5 px-2.5 border border-slate-200 text-slate-500">{r.unit}</td>
                      <td className="py-1.5 px-2.5 border border-slate-200 font-semibold">
                        {r.is_abnormal === 1 ? (
                          <span className="text-rose-600">HIGH/LOW</span>
                        ) : (
                          <span className="text-emerald-600">NORMAL</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pt-3 border-t border-slate-200 text-xs">
              <div>
                <p className="font-semibold text-slate-800">Verified By: {selectedOrder.verified_by_name || 'LIS Auto-Verification Engine'}</p>
                <p className="text-[10px] text-slate-400">Date Verified: {selectedOrder.verified_at || new Date().toLocaleString()}</p>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={() => handleNotifyPatient(selectedOrder.id)}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs rounded transition-colors cursor-pointer"
                >
                  Dispatch Report
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded transition-colors cursor-pointer"
                >
                  Print PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LabHub;
