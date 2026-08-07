import React, { useState, useEffect, useMemo } from 'react';
import { 
  FlaskConical, ClipboardList, Activity, Lock, Search, Plus, CheckCircle, 
  Save, HelpCircle, Barcode, AlertTriangle, Play, Clock, ShieldCheck, 
  RefreshCw, Printer, AlertCircle, FileText, Send, Layers, Thermometer, 
  TrendingUp, CheckCircle2, XCircle, ArrowRight, UserCheck, Droplet, Eye
} from 'lucide-react';
import api from '../../api/axios';
import { toast } from 'react-hot-toast';

// ── TUBE TYPE COLOR & METADATA CONFIG ─────────────────────────────────────────
const TUBE_TYPES = [
  { id: 'Purple EDTA', name: 'EDTA K2/K3 (Purple Top)', color: 'bg-purple-600 border-purple-700 text-white', dotColor: 'bg-purple-500', drawOrder: 4, desc: 'Full Blood Count (FBC/CBC), ESR, HbA1c' },
  { id: 'SST Gold Gel', name: 'SST Gel Separator (Gold Top)', color: 'bg-amber-500 border-amber-600 text-white', dotColor: 'bg-amber-400', drawOrder: 2, desc: 'Clinical Chemistry, LFT, RFT, Electrolytes' },
  { id: 'Blue Citrate', name: 'Sodium Citrate (Light Blue Top)', color: 'bg-sky-500 border-sky-600 text-white', dotColor: 'bg-sky-400', drawOrder: 1, desc: 'Coagulation Studies (PT, APTT, D-Dimer)' },
  { id: 'Grey Fluoride', name: 'Sodium Fluoride (Grey Top)', color: 'bg-slate-500 border-slate-600 text-white', dotColor: 'bg-slate-400', drawOrder: 5, desc: 'Fasting Blood Glucose, Lactate' },
  { id: 'Yellow Urine Cup', name: 'Sterile Urine Container (Yellow Top)', color: 'bg-yellow-400 border-yellow-500 text-slate-900', dotColor: 'bg-yellow-400', drawOrder: 6, desc: 'Urinalysis, Urine Chemistry & Microscopy' },
];

// ── LIFECYCLE STAGES CONFIG ──────────────────────────────────────────────────
const LIFECYCLE_STAGES = [
  { id: 'Ordered', phase: 'pre-analytical', label: '1. CPOE Order', color: 'bg-slate-100 text-slate-700 border-slate-300' },
  { id: 'Collected', phase: 'pre-analytical', label: '2. Specimen Collected', color: 'bg-sky-50 text-sky-700 border-sky-300' },
  { id: 'Accessioned', phase: 'pre-analytical', label: '3. Barcode Accessioned', color: 'bg-indigo-50 text-indigo-700 border-indigo-300' },
  { id: 'Centrifuged', phase: 'analytical', label: '4. Centrifuged / Prepped', color: 'bg-purple-50 text-purple-700 border-purple-300' },
  { id: 'Analyzing', phase: 'analytical', label: '5. Analyzer Testing', color: 'bg-amber-50 text-amber-700 border-amber-300' },
  { id: 'Verified', phase: 'post-analytical', label: '6. LIS Verified', color: 'bg-emerald-50 text-emerald-700 border-emerald-300' },
  { id: 'Notified', phase: 'completed', label: '7. Report Dispatched', color: 'bg-teal-700 text-white border-teal-800' }
];

const LabHub = () => {
  const [activeTab, setActiveTab] = useState('worklist'); // 'worklist', 'draw_order', 'analyzers', 'qc', 'reports'
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
  const [refProvider, setRefProvider] = useState('Dr. Sarah Connor');
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
  const [qcParam, setQcParam] = useState('Potassium (Serum)');
  const [qcLevel, setQcLevel] = useState('Level 1 Normal');
  const [qcMean, setQcMean] = useState('4.2');
  const [qcSD, setQcSD] = useState('0.2');
  const [qcValue, setQcValue] = useState('4.3');
  const [qcCorrective, setQcCorrective] = useState('');

  // Analyzer Simulation State
  const [analyzerStatus, setAnalyzerStatus] = useState('Idle'); // 'Idle', 'Ingesting', 'Online'
  const [simulatedSample, setSimulatedSample] = useState('');

  // Fetch Orders
  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await api.get('/lab/orders');
      if (res.data.success) {
        setOrders(res.data.data);
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
      if (res.data.success) {
        setQcLogs(res.data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchQCLogs();
    const interval = setInterval(fetchOrders, 30000); // refresh every 30s for TAT clock
    return () => clearInterval(interval);
  }, []);

  // Fetch Details for Selected Order
  const handleSelectOrder = async (order) => {
    try {
      const res = await api.get(`/lab/orders/${order.id}`);
      if (res.data.success) {
        setSelectedOrder(res.data.data.order);
        setResultParams(res.data.data.results);
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

      if (res.data.success) {
        toast.success(`Specimen ${res.data.data.accession_number} registered!`);
        setShowRegModal(false);
        // Reset
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

  // Transition Order Stage (Pre-Analytical -> Analytical -> Post-Analytical)
  const handleUpdateStage = async (orderId, newStage, hilIndex = 'Normal') => {
    try {
      const res = await api.put(`/lab/orders/${orderId}/stage`, { stage: newStage, hil_index: hilIndex });
      if (res.data.success) {
        toast.success(`Order advanced to: ${newStage}`);
        fetchOrders();
        if (selectedOrder && selectedOrder.id === orderId) {
          handleSelectOrder(selectedOrder);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to update stage.');
    }
  };

  // Save Results Draft & Execute LIS Auto-Verification Engine
  const handleSaveResults = async () => {
    if (!selectedOrder) return;
    setSaving(true);
    try {
      const res = await api.post(`/lab/orders/${selectedOrder.id}/results`, {
        results: resultParams,
        hil_index: selectedOrder.hil_index || 'Normal'
      });
      if (res.data.success) {
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
      // 1. Auto-save parameter measurements first
      await api.post(`/lab/orders/${selectedOrder.id}/results`, {
        results: resultParams,
        hil_index: selectedOrder.hil_index || 'Normal'
      });

      // 2. Perform official technologist sign-off
      const res = await api.post(`/lab/orders/${selectedOrder.id}/verify`, {
        verified_by_name: 'Medical Technologist (Signed)'
      });
      if (res.data.success) {
        toast.success('Lab report verified and signed off!');
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
      if (res.data.success) {
        toast.success('Electronic LIS report dispatched and patient notified!');
        fetchOrders();
        if (selectedOrder && selectedOrder.id === orderId) {
          handleSelectOrder(selectedOrder);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to dispatch notification.');
    }
  };

  // Simulate Ingestion from Automated LIS Analyzer Line
  const handleSimulateIngestion = () => {
    if (!selectedOrder) {
      return toast.error('Please select an active specimen order from the worklist first.');
    }
    
    setAnalyzerStatus('Ingesting');
    setSimulatedSample(selectedOrder.specimen_barcode);
    
    setTimeout(() => {
      setResultParams(prev => prev.map(p => {
        let mockVal = '';
        const name = (p.parameter_name || '').toLowerCase();
        if (name.includes('hemoglobin')) mockVal = (12.8 + (Math.random() * 3.5)).toFixed(1);
        else if (name.includes('wbc')) mockVal = (5.2 + (Math.random() * 4.0)).toFixed(1);
        else if (name.includes('platelet')) mockVal = Math.floor(180 + Math.random() * 190).toString();
        else if (name.includes('rbc')) mockVal = (4.4 + (Math.random() * 1.0)).toFixed(2);
        else if (name.includes('alt')) mockVal = Math.floor(18 + Math.random() * 30).toString();
        else if (name.includes('ast')) mockVal = Math.floor(15 + Math.random() * 25).toString();
        else if (name.includes('alp')) mockVal = Math.floor(60 + Math.random() * 70).toString();
        else if (name.includes('bilirubin')) mockVal = (0.4 + Math.random() * 0.5).toFixed(1);
        else if (name.includes('urea')) mockVal = Math.floor(10 + Math.random() * 8).toString();
        else if (name.includes('creatinine')) mockVal = (0.8 + Math.random() * 0.3).toFixed(2);
        else if (name.includes('potassium')) mockVal = (3.8 + Math.random() * 0.9).toFixed(1);
        else if (name.includes('sodium')) mockVal = Math.floor(136 + Math.random() * 7).toString();
        else if (name.includes('troponin')) mockVal = (1.5 + Math.random() * 4.0).toFixed(1);
        else mockVal = '2.4';

        // Check reference range
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
      toast.success(`Data ingestion complete for sample ${selectedOrder.specimen_barcode}`);
    }, 1200);
  };

  // Submit Westgard Quality Control Run
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

      if (res.data.success) {
        if (res.data.data.status === 'Passed') {
          toast.success('QC Run PASSED! All Westgard rules valid.');
        } else {
          toast.error(`⚠️ QC REJECTED! Westgard breach: ${res.data.data.westgard_rule_breach}`);
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
    const analyticalCount = orders.filter(o => o.phase === 'analytical').length;
    const autoVerifiedCount = orders.filter(o => o.auto_verified === 1 || o.auto_verified === true).length;
    const autoRatio = total > 0 ? Math.round((autoVerifiedCount / total) * 100) : 0;
    const overdueCount = orders.filter(o => o.is_overdue).length;

    return { total, statCount, preCount, analyticalCount, autoVerifiedCount, autoRatio, overdueCount };
  }, [orders]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* ── HEADER ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900 text-white p-6 rounded-3xl shadow-xl border border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-teal-500/20 border border-teal-500/30 rounded-2xl">
              <FlaskConical className="text-teal-400 animate-pulse" size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                <span className="text-teal-400">SYNAPSE</span> LIS Laboratory Hub
              </h1>
              <p className="text-xs font-medium text-slate-400 mt-0.5">
                Outpatient Diagnostic Lifecycle • Pre-Analytical, Analytical & Post-Analytical LIS Automation
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => { handleGenerateBarcode(); setShowRegModal(true); }}
            className="flex-1 md:flex-none px-4 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-teal-500/20"
          >
            <Plus size={16} /> Order & Register Specimen
          </button>
          <button
            onClick={fetchOrders}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors cursor-pointer border border-slate-700"
            title="Refresh Data"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── TOP METRIC DASHBOARD CARDS ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Worklist</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-slate-900">{stats.total}</span>
            <ClipboardList className="text-slate-400" size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-rose-200 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider flex items-center gap-1">
            <Clock size={13} /> STAT Orders (&lt;45m)
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-rose-600">{stats.statCount}</span>
            <span className="text-[10px] font-black bg-rose-100 text-rose-700 px-2 py-0.5 rounded-md">Urgent</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-purple-200 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">In Pre-Analytical</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-purple-900">{stats.preCount}</span>
            <Droplet className="text-purple-400" size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">LIS Auto-Verified</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-emerald-600">{stats.autoRatio}%</span>
            <ShieldCheck className="text-emerald-500" size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-xs flex flex-col justify-between col-span-2 md:col-span-1">
          <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Westgard IQC Status</span>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs font-black bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-lg flex items-center gap-1">
              <CheckCircle2 size={13} /> Instruments OK
            </span>
          </div>
        </div>
      </div>

      {/* ── MAIN WORKFLOW NAVIGATION TABS ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-2">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('worklist')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer transition-all ${
              activeTab === 'worklist' 
                ? 'bg-slate-900 text-white shadow-sm' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Activity size={16} /> Specimen Lifecycle Worklist
          </button>
          <button
            onClick={() => setActiveTab('draw_order')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer transition-all ${
              activeTab === 'draw_order' 
                ? 'bg-slate-900 text-white shadow-sm' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Droplet size={16} /> Order-of-Draw Phlebotomy
          </button>
          <button
            onClick={() => setActiveTab('analyzers')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer transition-all ${
              activeTab === 'analyzers' 
                ? 'bg-slate-900 text-white shadow-sm' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Play size={16} /> LIS Analyzer Ingestion
          </button>
          <button
            onClick={() => setActiveTab('qc')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer transition-all ${
              activeTab === 'qc' 
                ? 'bg-slate-900 text-white shadow-sm' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <ShieldCheck size={16} /> Quality Control (Westgard)
          </button>
        </div>

        {activeTab === 'worklist' && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Phase:</span>
            <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
              {['all', 'pre-analytical', 'analytical', 'post-analytical'].map(p => (
                <button
                  key={p}
                  onClick={() => setPhaseFilter(p)}
                  className={`px-3 py-1 text-[11px] font-black rounded-lg uppercase tracking-wider cursor-pointer transition-all ${
                    phaseFilter === p ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── TAB 1: SPECIMEN LIFECYCLE WORKLIST ── */}
      {activeTab === 'worklist' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Orders Table */}
          <div className="lg:col-span-2 space-y-4">
            <div className="relative">
              <Search className="absolute left-3.5 top-3 text-slate-400" size={16} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search patient name, ID, accession #, barcode..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-teal-500 shadow-xs"
              />
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-600 font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Accession / Patient</th>
                      <th className="py-3 px-4">Test & Tube</th>
                      <th className="py-3 px-4">Phase / Stage</th>
                      <th className="py-3 px-4">TAT Countdown</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="py-8 text-center text-slate-400 font-medium">
                          No specimen orders matching search.
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
                              isSelected ? 'bg-teal-50/70 border-l-4 border-l-teal-600' : 'hover:bg-slate-50'
                            }`}
                          >
                            <td className="py-3 px-4">
                              <span className="font-bold text-slate-900 block">{order.patient_name}</span>
                              <span className="text-[10px] text-slate-400 font-mono">ID: {order.patient_id} • {order.accession_number}</span>
                            </td>

                            <td className="py-3 px-4">
                              <span className="font-bold text-slate-800 block">{order.specimen_type}</span>
                              <span className="inline-block text-[10px] font-black px-2 py-0.5 rounded-md mt-0.5 bg-slate-100 text-slate-700 border border-slate-200">
                                {order.tube_type || 'Purple EDTA'}
                              </span>
                            </td>

                            <td className="py-3 px-4">
                              <span className={`inline-block px-2.5 py-1 text-[10px] font-extrabold rounded-lg uppercase tracking-wider border ${
                                order.stage === 'Notified' ? 'bg-teal-600 text-white border-teal-700' :
                                order.stage === 'Verified' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                                order.stage === 'Analyzing' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                                order.stage === 'Centrifuged' ? 'bg-purple-100 text-purple-800 border-purple-300' :
                                'bg-sky-100 text-sky-800 border-sky-300'
                              }`}>
                                {order.stage || 'Collected'}
                              </span>
                              {order.auto_verified === 1 && (
                                <span className="ml-1 text-[9px] font-black bg-emerald-500 text-white px-1.5 py-0.5 rounded-md" title="LIS Auto-Verified">
                                  AUTO
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-4">
                              {order.urgency === 'STAT' ? (
                                <span className="font-black text-rose-600 flex items-center gap-1">
                                  <Clock size={12} className="animate-spin" /> STAT ({order.tat_remaining_mins ?? 45}m)
                                </span>
                              ) : (
                                <span className="font-semibold text-slate-500">
                                  Routine ({order.tat_remaining_mins ?? 240}m)
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={(e) => { e.stopPropagation(); handleSelectOrder(order); }}
                                className="px-3 py-1 bg-slate-900 hover:bg-teal-600 text-white text-[11px] font-extrabold rounded-lg transition-colors cursor-pointer"
                              >
                                Manage Stage
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

          {/* Right Col: Selected Specimen Lifecycle Stepper & Result Verification Engine */}
          <div className="space-y-4">
            {selectedOrder ? (
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-5">
                {/* Header */}
                <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[10px] font-black text-teal-600 uppercase tracking-widest block">Accession Details</span>
                    <h3 className="text-lg font-black text-slate-900">{selectedOrder.patient_name}</h3>
                    <p className="text-xs text-slate-500 font-medium">Barcode: <span className="font-mono text-slate-700">{selectedOrder.specimen_barcode}</span></p>
                  </div>
                  <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">
                    {selectedOrder.accession_number}
                  </span>
                </div>

                {/* 3-Phase Stepper Stepper */}
                <div className="space-y-2">
                  <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider block">Specimen Phase Advancement</span>
                  <div className="grid grid-cols-1 gap-1.5">
                    {LIFECYCLE_STAGES.map(st => {
                      const isCurrent = selectedOrder.stage === st.id;
                      return (
                        <button
                          key={st.id}
                          onClick={() => handleUpdateStage(selectedOrder.id, st.id)}
                          className={`p-2.5 rounded-xl text-xs font-extrabold flex items-center justify-between transition-all cursor-pointer border ${
                            isCurrent ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            {isCurrent ? <CheckCircle size={14} className="text-teal-400" /> : <div className="w-3.5 h-3.5 rounded-full border border-slate-400" />}
                            {st.label}
                          </span>
                          <span className="text-[10px] font-mono opacity-80 uppercase">{st.phase}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Parameter Verification Table */}
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Activity size={14} className="text-teal-600" /> Test Parameters
                    </span>
                    <button
                      onClick={handleSaveResults}
                      disabled={saving}
                      className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1"
                    >
                      <Save size={13} /> {saving ? 'Evaluating...' : 'Run LIS Auto-Verify'}
                    </button>
                  </div>

                  <div className="space-y-2">
                    {resultParams.map(param => (
                      <div key={param.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                        <div className="flex justify-between text-xs font-bold text-slate-800">
                          <span>{param.parameter_name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">Ref: {param.reference_range} {param.unit}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={param.parameter_value || ''}
                            onChange={e => {
                              const val = e.target.value;
                              setResultParams(prev => prev.map(p => p.id === param.id ? { ...p, parameter_value: val } : p));
                            }}
                            placeholder="Enter measurement..."
                            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-teal-500"
                          />
                          {param.is_abnormal === 1 && (
                            <span className="px-2 py-1 bg-rose-100 text-rose-700 text-[10px] font-black rounded-md shrink-0">
                              HIGH/LOW
                            </span>
                          )}
                        </div>
                        {param.delta_change && (
                          <span className="text-[10px] font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md block">
                            ⚠️ Delta Check: {param.delta_change}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Final Signoff & Print Report Buttons */}
                <div className="flex gap-2 pt-3 border-t border-slate-100">
                  <button
                    onClick={handleVerifyOrder}
                    disabled={saving || selectedOrder.stage === 'Verified' || selectedOrder.stage === 'Notified'}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20"
                  >
                    <CheckCircle size={15} /> Tech Sign-Off
                  </button>
                  <button
                    onClick={() => setShowReportModal(true)}
                    className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Printer size={15} /> Print Report
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-8 text-center text-slate-400 space-y-2">
                <FlaskConical className="mx-auto text-slate-300" size={36} />
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Select a Specimen Order</p>
                <p className="text-[11px]">Click any specimen from the worklist to view phase details, advance stages, and execute LIS verification.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: ORDER-OF-DRAW PHLEBOTOMY MATRIX ── */}
      {activeTab === 'draw_order' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-slate-900 to-teal-950 text-white p-6 rounded-3xl space-y-2">
            <h2 className="text-xl font-black flex items-center gap-2">
              <Droplet className="text-sky-400" size={24} /> Standardized Order of Draw (Phlebotomy Matrix)
            </h2>
            <p className="text-xs text-slate-300">
              CLSI H3-A6 standard sequence prevents cross-contamination of tube additives during venous specimen collection.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {TUBE_TYPES.map(tube => (
              <div key={tube.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] font-black bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">
                      Draw Step #{tube.drawOrder}
                    </span>
                    <div className={`w-4 h-4 rounded-full ${tube.dotColor} border border-slate-300 shadow-xs`} />
                  </div>
                  <h3 className="text-sm font-black text-slate-900">{tube.id}</h3>
                  <p className="text-xs font-semibold text-slate-500 mt-1">{tube.name}</p>
                </div>
                <div className="pt-3 border-t border-slate-100">
                  <span className="text-[10px] font-extrabold text-teal-700 uppercase tracking-wider block">Assays & Department:</span>
                  <p className="text-xs text-slate-600 font-medium mt-0.5">{tube.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 3: LIS AUTOMATED ANALYZER INGESTION ── */}
      {activeTab === 'analyzers' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Play size={18} className="text-amber-500" /> Automated LIS Analyzer Line Simulator
                </h3>
                <p className="text-xs text-slate-500 font-medium">Direct AST/ASTM E1381 interface feed for Mindray & Sysmex XN-series analyzers.</p>
              </div>
              <span className={`px-3 py-1 text-xs font-black rounded-lg uppercase tracking-wider border ${
                analyzerStatus === 'Ingesting' ? 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse' : 'bg-emerald-100 text-emerald-800 border-emerald-300'
              }`}>
                Analyzer Status: {analyzerStatus}
              </span>
            </div>

            {selectedOrder ? (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-4">
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Target Sample Barcode</span>
                  <span className="text-sm font-black text-slate-900 font-mono">{selectedOrder.specimen_barcode} ({selectedOrder.patient_name})</span>
                </div>
                <button
                  onClick={handleSimulateIngestion}
                  disabled={analyzerStatus === 'Ingesting'}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-md shadow-amber-500/20"
                >
                  <Play size={14} /> Simulate Analyzer Data Feed
                </button>
              </div>
            ) : (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs font-bold text-amber-800">
                ⚠️ Select a specimen order from the worklist tab before initiating analyzer data ingestion.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 4: QUALITY CONTROL (WESTGARD & LEVEY-JENNINGS) ── */}
      {activeTab === 'qc' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form to submit QC Run */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <ShieldCheck className="text-emerald-600" size={20} /> Daily IQC Run Entry
            </h3>

            <form onSubmit={handleRecordQCRun} className="space-y-3">
              <div>
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block mb-1">Analyzer Instrument</label>
                <select
                  value={qcAnalyzer}
                  onChange={e => setQcAnalyzer(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                >
                  <option>Biochemistry Analyzer (Mindray BS-240)</option>
                  <option>Hematology Analyzer (Sysmex XN-550)</option>
                  <option>Immunoassay Analyzer (Roche Cobas e411)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block mb-1">Test Parameter</label>
                <input
                  type="text"
                  value={qcParam}
                  onChange={e => setQcParam(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block mb-1">Mean Target (μ)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={qcMean}
                    onChange={e => setQcMean(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block mb-1">SD Target (σ)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={qcSD}
                    onChange={e => setQcSD(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block mb-1">Measured Value</label>
                <input
                  type="number"
                  step="0.01"
                  value={qcValue}
                  onChange={e => setQcValue(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md shadow-emerald-600/20"
              >
                Execute Westgard Evaluation
              </button>
            </form>
          </div>

          {/* QC Logs Table */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Activity className="text-teal-600" size={20} /> Westgard QC Execution Logs & Z-Scores
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-600 font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Analyzer & Param</th>
                    <th className="py-2.5 px-3">Level</th>
                    <th className="py-2.5 px-3">Measured</th>
                    <th className="py-2.5 px-3">Z-Score</th>
                    <th className="py-2.5 px-3">Status / Rule</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {qcLogs.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-6 text-center text-slate-400">No QC runs recorded today.</td>
                    </tr>
                  ) : (
                    qcLogs.map(log => (
                      <tr key={log.id}>
                        <td className="py-2.5 px-3">
                          <span className="font-bold text-slate-900 block">{log.parameter_name}</span>
                          <span className="text-[10px] text-slate-400">{log.analyzer_name}</span>
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-600">{log.control_level}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{log.measured_value}</td>
                        <td className="py-2.5 px-3 font-mono font-black">{log.z_score} SD</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2.5 py-1 text-[10px] font-black rounded-lg uppercase border ${
                            log.status === 'Passed' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-rose-100 text-rose-800 border-rose-200'
                          }`}>
                            {log.status} ({log.westgard_rule_breach})
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

      {/* ── MODAL 1: SPECIMEN REGISTRATION ── */}
      {showRegModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Droplet className="text-teal-600" size={18} /> CPOE Test Order & Specimen Registration
              </h3>
              <button onClick={() => setShowRegModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer font-bold text-lg">×</button>
            </div>

            <form onSubmit={handleRegisterSpecimen} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block mb-1">Patient ID *</label>
                  <input
                    type="text"
                    required
                    value={patientId}
                    onChange={e => setPatientId(e.target.value)}
                    placeholder="P-10023"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block mb-1">Patient Name *</label>
                  <input
                    type="text"
                    required
                    value={patientName}
                    onChange={e => setPatientName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block mb-1">Age</label>
                  <input
                    type="text"
                    value={patientAge}
                    onChange={e => setPatientAge(e.target.value)}
                    placeholder="45"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block mb-1">Gender</label>
                  <select
                    value={patientGender}
                    onChange={e => setPatientGender(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                  >
                    <option>Male</option>
                    <option>Female</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block mb-1">Urgency</label>
                  <select
                    value={urgency}
                    onChange={e => setUrgency(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                  >
                    <option value="Routine">Routine (&lt;4h)</option>
                    <option value="STAT">STAT (&lt;45m)</option>
                    <option value="Specialized">Specialized (24h)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block mb-1">Test Assay</label>
                  <select
                    value={testName}
                    onChange={e => setTestName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                  >
                    <option>Full Blood Count (FBC/CBC)</option>
                    <option>Liver Function Test (LFT)</option>
                    <option>Renal & Electrolytes (RFT)</option>
                    <option>Cardiac Troponin I (STAT)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block mb-1">Tube Selection</label>
                  <select
                    value={tubeType}
                    onChange={e => setTubeType(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                  >
                    {TUBE_TYPES.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block mb-1">Barcode Label *</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={barcode}
                    onChange={e => setBarcode(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={handleGenerateBarcode}
                    className="px-3 py-2.5 bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Generate
                  </button>
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowRegModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md shadow-teal-600/20"
                >
                  Confirm & Print Barcode
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: PRINTABLE DIAGNOSTIC LAB REPORT ── */}
      {showReportModal && selectedOrder && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-8 space-y-6 shadow-2xl border border-slate-200 text-slate-900">
            {/* Report Header */}
            <div className="flex justify-between items-start border-b border-slate-200 pb-4">
              <div>
                <span className="text-xs font-black text-teal-700 tracking-widest block">SYNAPSE OUTPATIENT DIAGNOSTIC LABORATORY</span>
                <h2 className="text-xl font-black text-slate-900">OFFICIAL LABORATORY DIAGNOSTIC REPORT</h2>
                <p className="text-[11px] text-slate-500">Accredited Clinical Pathology & LIS Verified</p>
              </div>
              <button onClick={() => setShowReportModal(false)} className="text-slate-400 hover:text-slate-600 font-bold text-xl cursor-pointer">×</button>
            </div>

            {/* Patient Demographic Block */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
              <div>
                <p><strong className="text-slate-500">Patient Name:</strong> {selectedOrder.patient_name}</p>
                <p><strong className="text-slate-500">Patient ID:</strong> {selectedOrder.patient_id}</p>
                <p><strong className="text-slate-500">Age / Gender:</strong> {selectedOrder.patient_age || '—'} / {selectedOrder.patient_gender}</p>
              </div>
              <div>
                <p><strong className="text-slate-500">Accession No:</strong> {selectedOrder.accession_number}</p>
                <p><strong className="text-slate-500">Barcode:</strong> {selectedOrder.specimen_barcode}</p>
                <p><strong className="text-slate-500">Ref Provider:</strong> {selectedOrder.referring_provider || 'Dr. Sarah Connor'}</p>
              </div>
            </div>

            {/* Parameter Results Table */}
            <div className="space-y-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">Diagnostic Assays & Parameters</h4>
              <table className="w-full text-left text-xs border-collapse border border-slate-200">
                <thead className="bg-slate-100 text-slate-700 font-black uppercase text-[10px]">
                  <tr>
                    <th className="py-2 px-3 border border-slate-200">Parameter</th>
                    <th className="py-2 px-3 border border-slate-200">Result</th>
                    <th className="py-2 px-3 border border-slate-200">Ref Range</th>
                    <th className="py-2 px-3 border border-slate-200">Unit</th>
                    <th className="py-2 px-3 border border-slate-200">Flag</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium">
                  {resultParams.map(r => (
                    <tr key={r.id}>
                      <td className="py-2 px-3 border border-slate-200 font-bold text-slate-900">{r.parameter_name}</td>
                      <td className="py-2 px-3 border border-slate-200 font-mono font-black text-slate-900">{r.parameter_value || '—'}</td>
                      <td className="py-2 px-3 border border-slate-200 font-mono text-slate-600">{r.reference_range}</td>
                      <td className="py-2 px-3 border border-slate-200 text-slate-600">{r.unit}</td>
                      <td className="py-2 px-3 border border-slate-200 font-black">
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

            {/* Footer Sign-off */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-4 border-t border-slate-200 text-xs">
              <div>
                <p className="font-bold text-slate-800">Verified By: {selectedOrder.verified_by_name || 'LIS Auto-Verification Engine'}</p>
                <p className="text-[10px] text-slate-400">Date Verified: {selectedOrder.verified_at || new Date().toLocaleString()}</p>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={() => handleNotifyPatient(selectedOrder.id)}
                  className="flex-1 sm:flex-none px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-teal-600/20"
                >
                  <Send size={14} /> Dispatch & Notify Patient
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex-1 sm:flex-none px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Printer size={14} /> Print Official PDF
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
