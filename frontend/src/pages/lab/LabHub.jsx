import React, { useState, useEffect, useMemo } from 'react';
import { FlaskConical, ClipboardList, Activity, Lock, Search, Plus, CheckCircle, Save, HelpCircle, Barcode, AlertTriangle, Play } from 'lucide-react';
import api from '../../api/axios';
import { toast } from 'react-hot-toast';

const LabHub = () => {
  const [active, setActive] = useState('worklist'); // 'worklist', 'consumables', 'analyzers'
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Registration form
  const [showRegForm, setShowRegForm] = useState(false);
  const [patientId, setPatientId] = useState('');
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientGender, setPatientGender] = useState('Male');
  const [refProvider, setRefProvider] = useState('');
  const [specimenType, setSpecimenType] = useState('Blood');
  const [barcode, setBarcode] = useState('');
  const [testName, setTestName] = useState('Full Blood Count (FBC)');
  const [priority, setPriority] = useState('routine');
  const [notes, setNotes] = useState('');

  // Editing results state
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [resultParams, setResultParams] = useState([]);
  const [saving, setSaving] = useState(false);
  
  // Tab: Analyzer Simulation
  const [analyzerStatus, setAnalyzerStatus] = useState('Idle'); // 'Idle', 'Ingesting', 'Online'
  const [simulatedSample, setSimulatedSample] = useState('');

  // Fetch orders
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

  useEffect(() => {
    fetchOrders();
  }, []);

  // Fetch order details when selected
  const handleSelectOrder = async (order) => {
    try {
      const res = await api.get(`/lab/orders/${order.id}`);
      if (res.data.success) {
        setSelectedOrder(res.data.data.order);
        setResultParams(res.data.data.results);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch order details.');
    }
  };

  // Register Specimen
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
        test_name: testName,
        priority,
        notes
      });

      if (res.data.success) {
        toast.success('Specimen registered successfully.');
        setShowRegForm(false);
        // Reset form
        setPatientId('');
        setPatientName('');
        setPatientAge('');
        setRefProvider('');
        setBarcode('');
        setNotes('');
        fetchOrders();
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to register specimen.');
    }
  };

  // Handle value change in parameter
  const handleParamValueChange = (paramId, val) => {
    setResultParams(prev => prev.map(p => {
      if (p.id === paramId) {
        // Auto-check abnormal range
        let abnormal = false;
        if (p.reference_range && val) {
          const numVal = parseFloat(val);
          const rangeParts = p.reference_range.split('-').map(x => parseFloat(x.trim()));
          if (rangeParts.length === 2 && !isNaN(numVal)) {
            abnormal = numVal < rangeParts[0] || numVal > rangeParts[1];
          }
        }
        return { ...p, parameter_value: val, is_abnormal: abnormal };
      }
      return p;
    }));
  };

  // Save Results Draft
  const handleSaveResults = async () => {
    if (!selectedOrder) return;
    setSaving(true);
    try {
      const res = await api.post(`/lab/orders/${selectedOrder.id}/results`, {
        results: resultParams
      });
      if (res.data.success) {
        toast.success('Results draft saved successfully.');
        fetchOrders();
        // Refresh details
        handleSelectOrder(selectedOrder);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to save results.');
    } finally {
      setSaving(false);
    }
  };

  // Verify and complete
  const handleVerifyOrder = async () => {
    if (!selectedOrder) return;
    
    const missingValues = resultParams.some(p => !p.parameter_value);
    if (missingValues) {
      return toast.error('Please enter values for all parameters before verifying.');
    }

    setSaving(true);
    try {
      const res = await api.post(`/lab/orders/${selectedOrder.id}/verify`);
      if (res.data.success) {
        toast.success('Lab order completed and signed off.');
        fetchOrders();
        setSelectedOrder(null);
        setResultParams([]);
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to verify order.');
    } finally {
      setSaving(false);
    }
  };

  // Simulate barcode generation
  const handleGenerateBarcode = () => {
    const rand = Math.floor(100000 + Math.random() * 900000);
    setBarcode(`BAR-${rand}`);
  };

  // Simulate Ingestion from Analyzer
  const handleSimulateIngestion = () => {
    if (!selectedOrder) {
      return toast.error('Please select an active specimen order first.');
    }
    
    setAnalyzerStatus('Ingesting');
    setSimulatedSample(selectedOrder.specimen_barcode);
    
    setTimeout(() => {
      // Create mock measurements depending on the test regions
      setResultParams(prev => prev.map(p => {
        let mockVal = '';
        if (p.parameter_name.includes('Hemoglobin')) mockVal = (12 + Math.random() * 5).toFixed(1);
        else if (p.parameter_name.includes('WBC')) mockVal = (4 + Math.random() * 8).toFixed(1);
        else if (p.parameter_name.includes('Platelets')) mockVal = Math.floor(160 + Math.random() * 200).toString();
        else if (p.parameter_name.includes('RBC')) mockVal = (4.2 + Math.random() * 1.5).toFixed(2);
        else if (p.parameter_name.includes('ALT')) mockVal = Math.floor(15 + Math.random() * 45).toString();
        else if (p.parameter_name.includes('AST')) mockVal = Math.floor(12 + Math.random() * 35).toString();
        else if (p.parameter_name.includes('ALP')) mockVal = Math.floor(50 + Math.random() * 80).toString();
        else if (p.parameter_name.includes('Bilirubin')) mockVal = (0.3 + Math.random() * 0.8).toFixed(1);
        else if (p.parameter_name.includes('Urea')) mockVal = Math.floor(8 + Math.random() * 15).toString();
        else if (p.parameter_name.includes('Creatinine')) mockVal = (0.7 + Math.random() * 0.5).toFixed(2);
        else mockVal = 'Normal';

        // Check range
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
    }, 1500);
  };

  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) return orders;
    const q = searchQuery.toLowerCase();
    return orders.filter(o => 
      o.patient_name.toLowerCase().includes(q) || 
      o.patient_id.toLowerCase().includes(q) || 
      o.accession_number.toLowerCase().includes(q) || 
      o.specimen_barcode.toLowerCase().includes(q)
    );
  }, [orders, searchQuery]);

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FlaskConical className="text-teal-600 animate-pulse" size={24} />
            <span className="text-teal-700 font-black">SYNAPSE</span> Laboratory Hub
          </h1>
          <p className="text-sm text-slate-500">Specimen diagnostics, analysis worklist, and department inventory.</p>
        </div>
        <div className="flex gap-2">
          {active === 'worklist' && (
            <button
              onClick={() => setShowRegForm(!showRegForm)}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus size={14} /> Register Specimen
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 mb-6">
        <button
          onClick={() => setActive('worklist')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
            active === 'worklist' ? 'border-teal-600 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Activity size={16} /> Diagnostic Worklist
        </button>

        <button
          onClick={() => setActive('analyzers')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
            active === 'analyzers' ? 'border-teal-600 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <FlaskConical size={16} /> Analyzer Integration
        </button>
      </div>

      {/* Tab content */}
      <div>
        {active === 'worklist' && (
          <div className="space-y-6">
            {/* Registration Form Modal/Accordion */}
            {showRegForm && (
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs animate-fadeIn">
                <h3 className="font-bold text-slate-800 text-base flex items-center gap-2 mb-4">
                  <Barcode className="text-teal-600" size={18} /> Specimen Check-In
                </h3>
                <form onSubmit={handleRegisterSpecimen} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="text-[11px] font-black uppercase tracking-wider text-slate-400">Patient ID</label>
                      <input type="text" value={patientId} onChange={(e) => setPatientId(e.target.value)} placeholder="e.g. P-10023"
                        className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-teal-400 focus:bg-white" />
                    </div>
                    <div>
                      <label className="text-[11px] font-black uppercase tracking-wider text-slate-400">Patient Name</label>
                      <input type="text" value={patientName} onChange={(e) => setPatientName(e.target.value)} placeholder="Full Name"
                        className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-teal-400 focus:bg-white" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] font-black uppercase tracking-wider text-slate-400">Age</label>
                        <input type="text" value={patientAge} onChange={(e) => setPatientAge(e.target.value)} placeholder="e.g. 45"
                          className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-teal-400 focus:bg-white" />
                      </div>
                      <div>
                        <label className="text-[11px] font-black uppercase tracking-wider text-slate-400">Gender</label>
                        <select value={patientGender} onChange={(e) => setPatientGender(e.target.value)}
                          className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-teal-400 focus:bg-white">
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] font-black uppercase tracking-wider text-slate-400">Referring Doctor</label>
                      <input type="text" value={refProvider} onChange={(e) => setRefProvider(e.target.value)} placeholder="Dr. Name"
                        className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-teal-400 focus:bg-white" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="text-[11px] font-black uppercase tracking-wider text-slate-400">Specimen Type</label>
                      <select value={specimenType} onChange={(e) => setSpecimenType(e.target.value)}
                        className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-teal-400 focus:bg-white">
                        <option value="Blood">Blood (Whole Blood / Serum)</option>
                        <option value="Urine">Urine</option>
                        <option value="Swab">Swab (Nasal / Throat)</option>
                        <option value="Sputum">Sputum</option>
                        <option value="Stool">Stool</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-black uppercase tracking-wider text-slate-400">Barcode / Sample ID</label>
                      <div className="flex gap-2 mt-1">
                        <input type="text" value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="BAR-XXXXX"
                          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-teal-400 focus:bg-white" />
                        <button type="button" onClick={handleGenerateBarcode}
                          className="px-2.5 bg-slate-100 border border-slate-250 hover:bg-slate-200 rounded-xl text-slate-700 text-xs font-bold transition-all cursor-pointer">
                          Gen
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] font-black uppercase tracking-wider text-slate-400">Panel / Test Required</label>
                      <select value={testName} onChange={(e) => setTestName(e.target.value)}
                        className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-teal-400 focus:bg-white">
                        <option value="Full Blood Count (FBC)">Full Blood Count (FBC)</option>
                        <option value="Liver Function Test (LFT)">Liver Function Test (LFT)</option>
                        <option value="Renal Function Test (RFT)">Renal Function Test (RFT)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-black uppercase tracking-wider text-slate-400">Priority</label>
                      <select value={priority} onChange={(e) => setPriority(e.target.value)}
                        className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-teal-400 focus:bg-white">
                        <option value="routine">Routine</option>
                        <option value="urgent">Urgent</option>
                        <option value="stat">STAT (Immediate)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-400">Clinical Indication / Notes</label>
                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any special instructions or diagnostic queries..." rows={2}
                      className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-teal-400 focus:bg-white" />
                  </div>

                  <div className="flex gap-2 justify-end pt-2">
                    <button type="button" onClick={() => setShowRegForm(false)}
                      className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 transition-all cursor-pointer">
                      Cancel
                    </button>
                    <button type="submit"
                      className="px-5 py-2 bg-teal-600 hover:bg-teal-500 rounded-xl text-xs font-bold text-white transition-all cursor-pointer">
                      Check-In Sample
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Diagnostic Worklist Grid */}
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Left Column: Specimen List */}
              <div className="flex-1 bg-white border border-slate-200 rounded-3xl p-5 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                  <h3 className="font-black text-slate-800 text-base">Diagnostic Queue</h3>
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search patient, barcode..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-teal-400 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="overflow-y-auto max-h-[500px] space-y-2 pr-1 scrollbar-thin">
                  {loading ? (
                    <p className="text-xs text-slate-400 text-center py-10 font-bold">Loading specimen queue...</p>
                  ) : filteredOrders.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-10 font-semibold">No specimens currently in diagnostic queue.</p>
                  ) : (
                    filteredOrders.map(order => {
                      const isActive = selectedOrder?.id === order.id;
                      return (
                        <button
                          key={order.id}
                          onClick={() => handleSelectOrder(order)}
                          className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer flex justify-between items-center ${
                            isActive
                              ? 'bg-teal-50/50 border-teal-200 shadow-2xs'
                              : 'bg-slate-50/40 border-slate-200/80 hover:bg-slate-50'
                          }`}
                        >
                          <div className="space-y-1 pr-4 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] font-black text-slate-400 font-mono tracking-wider">
                                {order.accession_number}
                              </span>
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                                order.priority === 'stat' ? 'bg-rose-150 text-rose-700' :
                                order.priority === 'urgent' ? 'bg-amber-150 text-amber-700' : 'bg-slate-100 text-slate-500'
                              }`}>
                                {order.priority}
                              </span>
                            </div>
                            <h4 className="text-sm font-black text-slate-800 truncate">{order.patient_name}</h4>
                            <p className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
                              <Barcode size={12} className="text-slate-400 shrink-0" />
                              <span className="font-mono text-slate-600">{order.specimen_barcode}</span>
                              <span className="text-slate-300">·</span>
                              <span>{order.specimen_type}</span>
                            </p>
                          </div>

                          <div className="shrink-0 text-right space-y-1">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-extrabold border ${
                              order.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-250' :
                              order.status === 'Processing' ? 'bg-sky-50 text-sky-700 border-sky-250' :
                              'bg-amber-50 text-amber-700 border-amber-250'
                            }`}>
                              {order.status}
                            </span>
                            <p className="text-[10px] text-slate-400 font-bold">{order.created_at.split('T')[0]}</p>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right Column: Specimen Editor & Parameters */}
              <div className="w-full lg:w-1/2 bg-white border border-slate-200 rounded-3xl p-5 shadow-xs min-h-[400px] flex flex-col">
                {!selectedOrder ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400">
                    <FlaskConical size={48} className="text-slate-250 mb-3" />
                    <h4 className="font-bold text-sm text-slate-700">Diagnostic Details Panel</h4>
                    <p className="text-xs text-slate-400 max-w-xs mt-1">
                      Select a specimen from the queue to view parameters, ingest analyzer data, and sign off verified logs.
                    </p>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col h-full space-y-4">
                    {/* Selected Patient Header */}
                    <div className="pb-3 border-b border-slate-100 flex justify-between items-start gap-4">
                      <div>
                        <span className="text-[10px] font-black text-teal-600 uppercase tracking-widest">
                          {selectedOrder.specimen_barcode}
                        </span>
                        <h3 className="font-black text-slate-800 text-lg leading-tight">{selectedOrder.patient_name}</h3>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          Age: {selectedOrder.patient_age || '—'} · Gender: {selectedOrder.patient_gender || '—'} · Ref: {selectedOrder.referring_provider || 'Self'}
                        </p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                        selectedOrder.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-100'
                      }`}>
                        {selectedOrder.status}
                      </span>
                    </div>

                    {/* Analyzer simulation action */}
                    {selectedOrder.status !== 'Completed' && (
                      <div className="bg-slate-50 border border-slate-250/80 rounded-2xl p-3 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${analyzerStatus === 'Ingesting' ? 'bg-amber-500 animate-ping' : 'bg-emerald-500 animate-pulse'}`} />
                          <div className="text-left">
                            <h5 className="text-[10px] font-black uppercase tracking-wider text-slate-500">Auto Analyzer</h5>
                            <p className="text-xs font-bold text-slate-700">Ingest results directly from machine memory.</p>
                          </div>
                        </div>
                        <button
                          onClick={handleSimulateIngestion}
                          disabled={analyzerStatus === 'Ingesting'}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 disabled:bg-slate-400 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-all shrink-0"
                        >
                          <Play size={12} /> Ingest Data
                        </button>
                      </div>
                    )}

                    {/* Parameters Table */}
                    <div className="flex-1 overflow-x-auto min-h-[220px]">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                          <tr>
                            <th className="text-left py-2 pl-2">Assay / Parameter</th>
                            <th className="text-center py-2" width="120">Measured Value</th>
                            <th className="text-center py-2" width="100">Range</th>
                            <th className="text-left py-2 pr-2" width="130">Remarks</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {resultParams.map(param => (
                            <tr key={param.id} className="hover:bg-slate-50/40">
                              <td className="py-2.5 pl-2">
                                <div className="font-bold text-slate-800 text-xs">{param.parameter_name}</div>
                                {param.unit && <span className="text-[9px] font-bold text-slate-400">{param.unit}</span>}
                              </td>
                              <td className="py-2.5 text-center">
                                {selectedOrder.status === 'Completed' ? (
                                  <span className={`font-black text-sm ${param.is_abnormal ? 'text-rose-600' : 'text-slate-800'}`}>
                                    {param.parameter_value || '—'}
                                  </span>
                                ) : (
                                  <input
                                    type="text"
                                    value={param.parameter_value || ''}
                                    onChange={(e) => handleParamValueChange(param.id, e.target.value)}
                                    placeholder="Enter"
                                    className={`w-20 text-center px-1 py-1 text-xs font-black rounded-lg border outline-none ${
                                      param.is_abnormal 
                                        ? 'border-rose-300 bg-rose-50 text-rose-700' 
                                        : 'border-slate-200 bg-slate-50 focus:border-teal-400 focus:bg-white'
                                    }`}
                                  />
                                )}
                              </td>
                              <td className="py-2.5 text-center text-xs font-bold text-slate-500 font-mono">
                                {param.reference_range || '—'}
                              </td>
                              <td className="py-2.5 pr-2">
                                {selectedOrder.status === 'Completed' ? (
                                  <span className="text-xs text-slate-500 font-medium truncate block max-w-[120px]">
                                    {param.remarks || '—'}
                                  </span>
                                ) : (
                                  <input
                                    type="text"
                                    value={param.remarks || ''}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setResultParams(prev => prev.map(p => p.id === param.id ? { ...p, remarks: val } : p));
                                    }}
                                    placeholder="Add remark"
                                    className="w-full px-2 py-1 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:border-teal-400 focus:bg-white outline-none"
                                  />
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Actions footer */}
                    {selectedOrder.status !== 'Completed' && (
                      <div className="pt-3 border-t border-slate-100 flex justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => { setSelectedOrder(null); setResultParams([]); }}
                          className="px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 transition-all cursor-pointer"
                        >
                          Close Details
                        </button>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={handleSaveResults}
                            disabled={saving}
                            className="px-4 py-2 bg-white border border-slate-250 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 transition-all cursor-pointer flex items-center gap-1.5"
                          >
                            <Save size={14} /> Save Draft
                          </button>
                          <button
                            type="button"
                            onClick={handleVerifyOrder}
                            disabled={saving}
                            className="px-5 py-2 bg-teal-700 hover:bg-teal-650 rounded-xl text-xs font-bold text-white transition-all cursor-pointer flex items-center gap-1.5"
                          >
                            <CheckCircle size={14} /> Verify & Complete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {active === 'analyzers' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Analyzer Simulator Panel */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-slate-800 text-base flex items-center gap-2">
                  <FlaskConical size={18} className="text-teal-600" /> Sysmex XN-1000 Ingestion
                </h3>
                <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-black uppercase">
                  Connected
                </span>
              </div>
              <div className="bg-slate-900 rounded-2xl p-4 font-mono text-xs text-teal-400 space-y-2 relative border border-slate-800 shadow-inner min-h-[160px] flex flex-col justify-between">
                <div>
                  <p className="text-[10px] text-teal-600">SYSMEX_XN1000 // HL7_ENDPOINT_ONLINE</p>
                  <p className="mt-1">▶ IDLE - WAITING FOR SPECIMEN SCAN...</p>
                  {analyzerStatus === 'Ingesting' && (
                    <div className="mt-2 text-amber-400 animate-pulse">
                      <p>↳ INGESTING RESULTS FOR SAMPLE {simulatedSample}...</p>
                      <p>↳ WBC: ANALYZED [PASS]</p>
                      <p>↳ RBC: ANALYZED [PASS]</p>
                      <p>↳ HGB: ANALYZED [PASS]</p>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between border-t border-slate-800 pt-2 text-[10px] text-teal-600 mt-4">
                  <span>LAST SYNC: JUST NOW</span>
                  <span>BUFFER: CLEAR</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-600 leading-relaxed">
                Legacy Clinics' Lab analyzer runs on HL7 specifications. In production, this module automatically maps numerical values from urine/biochemistry analyzer outputs into Sukraa EMR and the clinical dashboard.
              </div>
            </div>

            {/* General info */}
            <div className="bg-gradient-to-br from-teal-50 to-teal-100/50 border border-teal-200 rounded-3xl p-6 space-y-4">
              <h4 className="font-black text-teal-900 text-sm flex items-center gap-1.5">
                <AlertTriangle size={16} /> Analyzer Connectivity Heuristics
              </h4>
              <p className="text-xs text-teal-800 leading-relaxed font-semibold">
                To link a new analyzer:
              </p>
              <div className="space-y-2 text-xs text-teal-850">
                <div className="flex gap-2">
                  <span className="w-5 h-5 rounded-full bg-teal-200 flex items-center justify-center font-black shrink-0 text-[10px]">1</span>
                  <p className="font-semibold">Verify the device has TCP/IP capabilities enabled and is assigned a static IP in the Legacy network.</p>
                </div>
                <div className="flex gap-2">
                  <span className="w-5 h-5 rounded-full bg-teal-200 flex items-center justify-center font-black shrink-0 text-[10px]">2</span>
                  <p className="font-semibold">Ensure barcode scans map directly to the `specimen_barcode` parameter defined in the check-in register.</p>
                </div>
                <div className="flex gap-2">
                  <span className="w-5 h-5 rounded-full bg-teal-200 flex items-center justify-center font-black shrink-0 text-[10px]">3</span>
                  <p className="font-semibold">Raw machine outputs will automatically populate drafts, allowing lab technicians to verify and sign off.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LabHub;
