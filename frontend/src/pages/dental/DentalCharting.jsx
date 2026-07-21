import React, { useState, useEffect, useRef } from 'react';
import { 
  Stethoscope, 
  Save, 
  FilePlus, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  Download,
  Trash2,
  User,
  CheckCircle2,
  Database,
  Globe,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

import { listCharts, getChart, saveChart, deleteChart } from '../../api/dental';
import { getPatientByPid, searchPatients } from '../../api/patients';
import { useAuth } from '../../context/AuthContext';

const CONDITIONS = {
  Healthy:            { color: '#f1f5f9', label: 'Healthy',             textColor: '#64748b' },
  'Caries':           { color: '#ef4444', label: 'Caries / Decay',      textColor: '#ffffff' },
  'Filled':           { color: '#eab308', label: 'Filled / Restored',   textColor: '#1e1e1e' },
  'Crown':            { color: '#3b82f6', label: 'Crown',               textColor: '#ffffff' },
  'Root Canal':       { color: '#a855f7', label: 'Root Canal (RCT)',    textColor: '#ffffff' },
  'Implant':          { color: '#14b8a6', label: 'Implant',             textColor: '#ffffff' },
  'Bridge':           { color: '#f97316', label: 'Bridge',              textColor: '#ffffff' },
  'Extraction Planned':{ color: '#dc2626', label: 'Extraction Planned', textColor: '#ffffff' },
  'Fractured':        { color: '#78716c', label: 'Fractured',           textColor: '#ffffff' },
  'Periapical':       { color: '#b45309', label: 'Periapical Abscess',  textColor: '#ffffff' },
};

const UPPER_TEETH = [18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28];
const LOWER_TEETH = [48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38];

const DEFAULT_TOOTH = {
  condition: 'Healthy',
  surfaces: { B: 'Healthy', M: 'Healthy', O: 'Healthy', D: 'Healthy', L: 'Healthy' },
  notes: '',
  missing: false
};

const generateDefaultToothData = () => {
  const data = {};
  [...UPPER_TEETH, ...LOWER_TEETH].forEach(t => {
    data[t.toString()] = JSON.parse(JSON.stringify(DEFAULT_TOOTH));
  });
  return data;
};

const ToothSVG = ({ number, data, isSelected, onClick, isUpper }) => {
  const isMissing = data.missing;
  const s = data.surfaces;
  
  const bColor = CONDITIONS[s.B]?.color || CONDITIONS.Healthy.color;
  const mColor = CONDITIONS[s.M]?.color || CONDITIONS.Healthy.color;
  const oColor = CONDITIONS[s.O]?.color || CONDITIONS.Healthy.color;
  const dColor = CONDITIONS[s.D]?.color || CONDITIONS.Healthy.color;
  const lColor = CONDITIONS[s.L]?.color || CONDITIONS.Healthy.color;

  return (
    <div className="flex flex-col items-center gap-1">
      {!isUpper && <span className="text-[9px] text-slate-400 font-medium">{number}</span>}
      <div 
        onClick={() => onClick(number.toString())}
        className={`relative cursor-pointer transition-all border-2 rounded-[3px] overflow-hidden bg-white ${isSelected ? 'border-rose-500 shadow-sm z-10' : 'border-transparent hover:border-slate-300'}`}
        style={{ width: 44, height: 44, boxSizing: 'border-box' }}
      >
        <svg width="40" height="40" viewBox="0 0 40 40" className="block">
          {isMissing ? (
            <g>
              <rect x="0" y="0" width="40" height="40" fill="#f1f5f9" />
              <line x1="0" y1="0" x2="40" y2="40" stroke="#94a3b8" strokeWidth="2" />
              <line x1="40" y1="0" x2="0" y2="40" stroke="#94a3b8" strokeWidth="2" />
            </g>
          ) : (
            <g stroke="#cbd5e1" strokeWidth="0.5">
              <rect x="10" y="0" width="20" height="10" fill={bColor} />
              <rect x="0" y="10" width="10" height="20" fill={mColor} />
              <rect x="10" y="10" width="20" height="20" fill={oColor} />
              <rect x="30" y="10" width="10" height="20" fill={dColor} />
              <rect x="10" y="30" width="20" height="10" fill={lColor} />
              <line x1="0" y1="0" x2="10" y2="10" />
              <line x1="40" y1="0" x2="30" y2="10" />
              <line x1="0" y1="40" x2="10" y2="30" />
              <line x1="40" y1="40" x2="30" y2="30" />
            </g>
          )}
        </svg>
      </div>
      {isUpper && <span className="text-[9px] text-slate-400 font-medium">{number}</span>}
    </div>
  );
};

const ColorSwatch = ({ color }) => (
  <span 
    className="inline-block w-3 h-3 rounded-full border border-slate-200" 
    style={{ backgroundColor: color }} 
  />
);

export default function DentalCharting() {
  const { user } = useAuth();
  
  const [patientId, setPatientId] = useState('');
  const [patientName, setPatientName] = useState('');
  const [patientDetails, setPatientDetails] = useState(null);
  const [patientSource, setPatientSource] = useState(null); // 'cache' | 'live'
  
  const [chartDate, setChartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [provider, setProvider] = useState('');
  const [generalNotes, setGeneralNotes] = useState('');
  const [toothData, setToothData] = useState(generateDefaultToothData());
  const [selectedTooth, setSelectedTooth] = useState(null);
  
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingPatient, setLoadingPatient] = useState(false);
  const [isChartLoaded, setIsChartLoaded] = useState(false);

  // Search autocomplete states
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchRef = useRef(null);

  const canEditRoles = ['admin', 'deputy_coo', 'dental', 'dentist', 'dental_tech'];
  const canEdit = user && canEditRoles.includes(user.role);

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePatientSearch = async (query) => {
    setPatientId(query);
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    try {
      const res = await searchPatients(query);
      const data = res?.data?.data ?? res?.data ?? [];
      setSearchResults(Array.isArray(data) ? data : []);
      setShowSearchResults(true);
    } catch (err) {
      console.warn('Patient search failed:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const selectPatient = (patient) => {
    setPatientId(patient.pid || patient.patient_id || '');
    setPatientName(patient.full_name || patient.patient_name || '');
    setPatientDetails(patient);
    setPatientSource(patient.source || 'cache');
    setShowSearchResults(false);
    
    // Automatically load chart history for selected patient
    fetchPatientAndCharts(patient.pid || patient.patient_id);
  };

  const fetchPatientAndCharts = async (pidToFetch) => {
    const targetPid = pidToFetch || patientId;
    if (!targetPid.trim()) {
      toast.error('Please enter a Patient ID');
      return;
    }

    setLoadingHistory(true);
    setLoadingPatient(true);

    try {
      // 1. Fetch Patient Info (looks in DB cache, falls back to Sukraa live fetch & auto-caches)
      try {
        const pRes = await getPatientByPid(targetPid);
        const pData = pRes?.data?.data ?? pRes?.data;
        const source = pRes?.data?.source || pData?.source || 'cache';
        
        if (pData && pData.full_name) {
          setPatientName(pData.full_name);
          setPatientDetails(pData);
          setPatientSource(source);
          toast.success(`Patient "${pData.full_name}" fetched from ${source === 'live' ? 'Sukraa HIMS (cached)' : 'DB cache'}.`);
        }
      } catch (pErr) {
        console.log('Patient record lookup note:', pErr.message);
      } finally {
        setLoadingPatient(false);
      }

      // 2. Fetch Chart History
      const res = await listCharts(targetPid);
      const charts = res?.data?.data ?? res?.data ?? res ?? [];
      const chartsArray = Array.isArray(charts) ? charts : [];
      setHistory(chartsArray);
      
      const todayChart = chartsArray.find(c => c.chart_date === chartDate);
      if (todayChart) {
        await loadSpecificChart(todayChart.id);
      } else {
        toast.success('History loaded. Ready for chart entry.');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load chart history');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleNewChart = () => {
    setToothData(generateDefaultToothData());
    setGeneralNotes('');
    setSelectedTooth(null);
    setIsChartLoaded(false);
    setChartDate(format(new Date(), 'yyyy-MM-dd'));
  };

  const handleLoadCharts = async () => {
    await fetchPatientAndCharts(patientId);
  };

  const loadSpecificChart = async (id) => {
    try {
      const res = await getChart(id);
      const chart = res?.data?.data ?? res?.data ?? res;
      if (chart && chart.tooth_data) {
        setToothData(typeof chart.tooth_data === 'string' ? JSON.parse(chart.tooth_data) : chart.tooth_data);
        setPatientName(chart.patient_name || patientName);
        setChartDate(chart.chart_date);
        setProvider(chart.provider || provider);
        setGeneralNotes(chart.general_notes || '');
        setIsChartLoaded(true);
        toast.success('Chart loaded successfully');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load chart details');
    }
  };

  const handleSaveChart = async () => {
    if (!patientId.trim()) {
      toast.error('Patient ID is required to save');
      return;
    }
    try {
      await saveChart({
        patient_id: patientId,
        patient_name: patientName,
        chart_date: chartDate,
        tooth_data: toothData,
        general_notes: generalNotes,
        provider: provider
      });
      toast.success('Chart saved successfully');
      handleLoadCharts(); 
    } catch (err) {
      toast.error(err.message || 'Failed to save chart');
    }
  };

  const handleDeleteChart = async (id) => {
    if (!window.confirm('Are you sure you want to delete this chart?')) return;
    try {
      await deleteChart(id);
      toast.success('Chart deleted');
      handleLoadCharts();
    } catch (err) {
      toast.error(err.message || 'Failed to delete chart');
    }
  };

  const updateTooth = (toothNumber, updates) => {
    setToothData(prev => ({
      ...prev,
      [toothNumber]: {
        ...prev[toothNumber],
        ...updates
      }
    }));
  };

  const updateSurface = (toothNumber, surfaceKey, condition) => {
    setToothData(prev => ({
      ...prev,
      [toothNumber]: {
        ...prev[toothNumber],
        surfaces: {
          ...prev[toothNumber].surfaces,
          [surfaceKey]: condition
        }
      }
    }));
  };

  const applyToAllSurfaces = () => {
    if (!selectedTooth) return;
    const currentTooth = toothData[selectedTooth];
    const newSurfaces = { ...currentTooth.surfaces };
    Object.keys(newSurfaces).forEach(k => {
      newSurfaces[k] = currentTooth.condition;
    });
    updateTooth(selectedTooth, { surfaces: newSurfaces });
  };

  const getQuadrantName = (num) => {
    const n = parseInt(num);
    if (n >= 11 && n <= 18) return 'Upper Right';
    if (n >= 21 && n <= 28) return 'Upper Left';
    if (n >= 31 && n <= 38) return 'Lower Left';
    if (n >= 41 && n <= 48) return 'Lower Right';
    return '';
  };

  const renderToothRow = (teethArray, isUpper) => {
    const leftSide = teethArray.slice(0, 8);
    const rightSide = teethArray.slice(8, 16);
    return (
      <div className="flex items-center justify-center gap-1">
        <div className="flex gap-1">
          {leftSide.map(num => (
            <ToothSVG 
              key={num} 
              number={num} 
              data={toothData[num.toString()]} 
              isSelected={selectedTooth === num.toString()} 
              onClick={setSelectedTooth}
              isUpper={isUpper}
            />
          ))}
        </div>
        <div className="h-16 border-l-2 border-dashed border-slate-300 mx-2" />
        <div className="flex gap-1">
          {rightSide.map(num => (
            <ToothSVG 
              key={num} 
              number={num} 
              data={toothData[num.toString()]} 
              isSelected={selectedTooth === num.toString()} 
              onClick={setSelectedTooth}
              isUpper={isUpper}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-rose-100 text-rose-600 rounded-xl">
            <Stethoscope size={24} />
          </div>
          <h1 className="text-2xl font-semibold text-slate-800 tracking-tight">Dental Charting</h1>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleNewChart}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium bg-white"
          >
            <FilePlus size={18} />
            <span>New Chart</span>
          </button>
          <button
            onClick={handleSaveChart}
            disabled={!patientId || !canEdit}
            className="flex items-center gap-2 px-5 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm font-medium"
          >
            <Save size={18} />
            <span>Save Chart</span>
          </button>
        </div>
      </div>

      {/* PATIENT BAR */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          {/* Patient ID with Autocomplete Search */}
          <div className="space-y-1.5 relative" ref={searchRef}>
            <label className="text-sm font-medium text-slate-700 flex items-center justify-between">
              <span>Patient ID / Search</span>
              {isSearching && <Loader2 size={13} className="animate-spin text-rose-500" />}
            </label>
            <div className="relative">
              <input
                type="text"
                value={patientId}
                onChange={(e) => handlePatientSearch(e.target.value)}
                onFocus={() => searchResults.length > 0 && setShowSearchResults(true)}
                placeholder="Sukraa ID or Name..."
                className="w-full pl-3 pr-8 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-sm"
              />
              <Search size={15} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            {/* Autocomplete Dropdown */}
            <AnimatePresence>
              {showSearchResults && searchResults.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto divide-y divide-slate-100"
                >
                  {searchResults.map((p) => (
                    <button
                      key={p.pid || p.id}
                      type="button"
                      onClick={() => selectPatient(p)}
                      className="w-full text-left p-2.5 hover:bg-rose-50/50 transition-colors flex items-center justify-between"
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-800">{p.full_name || p.patient_name}</p>
                        <p className="text-[11px] text-slate-400">PID: {p.pid} {p.gender ? `• ${p.gender}` : ''} {p.phone ? `• ${p.phone}` : ''}</p>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.5 rounded font-mono uppercase bg-slate-100 text-slate-500">
                        {p.source || 'db'}
                      </span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Patient Name</label>
            <input
              type="text"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              placeholder="Patient full name"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Chart Date</label>
            <input
              type="date"
              value={chartDate}
              onChange={(e) => setChartDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Provider</label>
            <input
              type="text"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              placeholder="Treating provider"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-sm"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleLoadCharts}
              disabled={loadingHistory || loadingPatient || !patientId}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50 transition-colors font-medium text-sm"
            >
              {loadingPatient || loadingHistory ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Search size={16} />
              )}
              <span>Fetch Patient & Chart</span>
            </button>
          </div>
        </div>

        {/* Patient Metadata & Source Badges Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-3 flex-wrap">
            {patientDetails && (
              <div className="flex items-center gap-2 text-slate-600 font-medium bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                <User size={14} className="text-slate-400" />
                <span>PID: <strong>{patientDetails.pid}</strong></span>
                {patientDetails.gender && <span>• {patientDetails.gender}</span>}
                {patientDetails.age && <span>• {patientDetails.age} yrs</span>}
                {patientDetails.phone && <span>• 📞 {patientDetails.phone}</span>}
              </div>
            )}

            {patientSource && (
              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium text-xs border ${
                patientSource === 'live'
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-indigo-50 text-indigo-700 border-indigo-200'
              }`}>
                {patientSource === 'live' ? (
                  <>
                    <Globe size={13} className="text-blue-500" />
                    <span>Source: <strong>Sukraa HIMS (Live → Cached to DB)</strong></span>
                  </>
                ) : (
                  <>
                    <Database size={13} className="text-indigo-500" />
                    <span>Source: <strong>Local DB Cache</strong></span>
                  </>
                )}
              </div>
            )}
          </div>

          {isChartLoaded && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
              <CheckCircle2 size={14} className="text-emerald-500" />
              Chart Loaded
            </div>
          )}
        </div>
      </div>

      {/* MAIN AREA */}
      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* LEFT: ODONTOGRAM */}
        <div className="flex-grow lg:w-[70%] bg-white rounded-2xl border border-slate-100 p-6 shadow-sm overflow-x-auto">
          <div className="min-w-[800px]">
            {/* UPPER ARCH */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-4 px-12 text-sm font-medium text-slate-500 uppercase tracking-wider">
                <span>UR (Upper Right)</span>
                <span className="text-slate-800 font-semibold">UPPER ARCH</span>
                <span>UL (Upper Left)</span>
              </div>
              {renderToothRow(UPPER_TEETH, true)}
            </div>

            <div className="w-full border-t border-dashed border-slate-200 my-8 relative">
              <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 text-xs text-slate-400 font-medium">MIDLINE</div>
            </div>

            {/* LOWER ARCH */}
            <div className="mb-8">
              {renderToothRow(LOWER_TEETH, false)}
              <div className="flex justify-between items-center mt-4 px-12 text-sm font-medium text-slate-500 uppercase tracking-wider">
                <span>LR (Lower Right)</span>
                <span className="text-slate-800 font-semibold">LOWER ARCH</span>
                <span>LL (Lower Left)</span>
              </div>
            </div>

            {/* COLOR LEGEND */}
            <div className="mt-10 p-5 bg-slate-50 rounded-xl border border-slate-100">
              <h3 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wider">Legend</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {Object.entries(CONDITIONS).map(([key, val]) => (
                  <div key={key} className="flex items-center gap-2 text-sm text-slate-600">
                    <ColorSwatch color={val.color} />
                    <span>{val.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: DETAIL PANEL */}
        <div className="lg:w-[30%] bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50">
            <h2 className="font-semibold text-slate-800">Tooth Details</h2>
          </div>
          
          <div className="p-5 flex-grow">
            {!selectedTooth ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 gap-3">
                <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center">
                  <Stethoscope size={28} className="text-slate-300" />
                </div>
                <p className="text-sm">Select a tooth from the chart<br/>to view and edit its details.</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Tooth #{selectedTooth}</h3>
                  <p className="text-sm text-slate-500">{getQuadrantName(selectedTooth)}</p>
                </div>

                <label className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={toothData[selectedTooth].missing}
                    onChange={(e) => updateTooth(selectedTooth, { missing: e.target.checked })}
                    className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-600"
                    disabled={!canEdit}
                  />
                  <span className="font-medium text-slate-700">Mark as Missing</span>
                </label>

                {!toothData[selectedTooth].missing && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-5"
                  >
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Overall Condition</label>
                      <select
                        disabled={!canEdit}
                        value={toothData[selectedTooth].condition}
                        onChange={(e) => updateTooth(selectedTooth, { condition: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                      >
                        {Object.keys(CONDITIONS).map(c => (
                          <option key={c} value={c}>{CONDITIONS[c].label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-slate-700">Surface Conditions</label>
                        <button
                          disabled={!canEdit}
                          onClick={applyToAllSurfaces}
                          className="text-xs font-medium text-rose-600 hover:text-rose-700 bg-rose-50 px-2 py-1 rounded"
                        >
                          Apply Overall to All
                        </button>
                      </div>
                      
                      {['B', 'M', 'O', 'D', 'L'].map(surfaceKey => {
                        const surfaceLabels = { B: 'Buccal', M: 'Mesial', O: 'Occlusal', D: 'Distal', L: 'Lingual' };
                        const currCond = toothData[selectedTooth].surfaces[surfaceKey];
                        return (
                          <div key={surfaceKey} className="flex items-center gap-3">
                            <div className="w-6 text-xs font-bold text-slate-400">{surfaceKey}</div>
                            <ColorSwatch color={CONDITIONS[currCond]?.color || '#fff'} />
                            <select
                              disabled={!canEdit}
                              value={currCond}
                              onChange={(e) => updateSurface(selectedTooth, surfaceKey, e.target.value)}
                              className="flex-1 text-sm px-2 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-rose-500"
                            >
                              {Object.keys(CONDITIONS).map(c => (
                                <option key={c} value={c}>{CONDITIONS[c].label}</option>
                              ))}
                            </select>
                          </div>
                        )
                      })}
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Tooth Notes</label>
                      <textarea
                        disabled={!canEdit}
                        value={toothData[selectedTooth].notes}
                        onChange={(e) => updateTooth(selectedTooth, { notes: e.target.value })}
                        rows={3}
                        placeholder="Specific notes for this tooth..."
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-sm resize-none"
                      />
                    </div>
                  </motion.div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* GENERAL NOTES */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
        <label className="block text-sm font-semibold text-slate-800 mb-2">General Chart Notes</label>
        <textarea
          disabled={!canEdit}
          value={generalNotes}
          onChange={(e) => setGeneralNotes(e.target.value)}
          rows={3}
          placeholder="Overall chart notes, treatment plan summary..."
          className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 resize-y"
        />
      </div>

      {/* CHART HISTORY */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <button 
          onClick={() => setIsHistoryOpen(!isHistoryOpen)}
          className="w-full flex items-center justify-between p-5 bg-slate-50/50 hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-slate-800">Chart History</h2>
            <span className="bg-slate-200 text-slate-700 text-xs py-0.5 px-2 rounded-full font-medium">
              {history.length}
            </span>
          </div>
          {isHistoryOpen ? <ChevronUp className="text-slate-400" /> : <ChevronDown className="text-slate-400" />}
        </button>
        
        <AnimatePresence>
          {isHistoryOpen && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              className="overflow-hidden border-t border-slate-100"
            >
              <div className="p-5">
                {history.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">No chart history found for this patient.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500">
                          <th className="px-4 py-3 font-medium">Date</th>
                          <th className="px-4 py-3 font-medium">Provider</th>
                          <th className="px-4 py-3 font-medium">Notes Preview</th>
                          <th className="px-4 py-3 font-medium text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.map((chart) => (
                          <tr key={chart.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-3 text-sm font-medium text-slate-700">
                              {chart.chart_date}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600">
                              {chart.provider || '—'}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-500 truncate max-w-[300px]">
                              {chart.general_notes || '—'}
                            </td>
                            <td className="px-4 py-3 text-right space-x-2">
                              <button
                                onClick={() => loadSpecificChart(chart.id)}
                                className="inline-flex items-center justify-center p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                                title="Load Chart"
                              >
                                <Download size={16} />
                              </button>
                              <button
                                disabled={!canEdit}
                                onClick={() => handleDeleteChart(chart.id)}
                                className="inline-flex items-center justify-center p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors disabled:opacity-30"
                                title="Delete Chart"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}
