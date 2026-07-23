import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Loader2,
  Printer,
  Plus,
  AlertTriangle,
  Layers,
  Activity,
  Sparkles,
  XCircle,
  HelpCircle
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

import { listCharts, getChart, saveChart, deleteChart, generateDentalAiNote } from '../../api/dental';
import { getPatientByPid, searchPatients } from '../../api/patients';
import { useAuth } from '../../context/AuthContext';
import LuminaDentalAiPrescriber from '../../components/dental/LuminaDentalAiPrescriber';

// ─── DENTAL CONDITIONS DICTIONARY ─────────────────────────────────────────────
const CONDITIONS = {
  Healthy:             { id: 'Healthy',             color: '#f8fafc', stroke: '#cbd5e1', label: 'Healthy / Sound',      textColor: '#475569', badgeBg: 'bg-slate-100 text-slate-700' },
  Caries:              { id: 'Caries',              color: '#ef4444', stroke: '#b91c1c', label: 'Caries / Decay',       textColor: '#ffffff', badgeBg: 'bg-rose-100 text-rose-800' },
  Filled:              { id: 'Filled',              color: '#eab308', stroke: '#a16207', label: 'Filled / Restored',    textColor: '#1e293b', badgeBg: 'bg-amber-100 text-amber-900' },
  Crown:               { id: 'Crown',               color: '#3b82f6', stroke: '#1d4ed8', label: 'Crown / Veneer',       textColor: '#ffffff', badgeBg: 'bg-blue-100 text-blue-800' },
  'Root Canal':        { id: 'Root Canal',        color: '#a855f7', stroke: '#6b21a8', label: 'Root Canal (RCT)',     textColor: '#ffffff', badgeBg: 'bg-purple-100 text-purple-800' },
  Implant:             { id: 'Implant',             color: '#14b8a6', stroke: '#0f766e', label: 'Implant',              textColor: '#ffffff', badgeBg: 'bg-teal-100 text-teal-800' },
  Bridge:              { id: 'Bridge',              color: '#f97316', stroke: '#c2410c', label: 'Bridge / Pontic',       textColor: '#ffffff', badgeBg: 'bg-orange-100 text-orange-800' },
  'Extraction Planned':{ id: 'Extraction Planned', color: '#dc2626', stroke: '#991b1b', label: 'Extraction Planned', textColor: '#ffffff', badgeBg: 'bg-red-100 text-red-900' },
  Fractured:           { id: 'Fractured',           color: '#78716c', stroke: '#44403c', label: 'Fractured / Broken',    textColor: '#ffffff', badgeBg: 'bg-stone-200 text-stone-800' },
  Sealant:             { id: 'Sealant',             color: '#10b981', stroke: '#047857', label: 'Sealant / Fissure',    textColor: '#ffffff', badgeBg: 'bg-emerald-100 text-emerald-800' },
  Periapical:          { id: 'Periapical',          color: '#b45309', stroke: '#78350f', label: 'Periapical Lesion',   textColor: '#ffffff', badgeBg: 'bg-amber-200 text-amber-950' },
};

const COMMON_DENTAL_PROCEDURES = [
  'Dental Examination & Consultation',
  'Scaling & Polishing (Prophylaxis)',
  'Deep Periodontal Scaling / Root Planing',
  'Composite Restoration (1 Surface)',
  'Composite Restoration (2 Surfaces)',
  'Composite Restoration (3+ Surfaces)',
  'Amalgam Restoration',
  'Temporary Filling',
  'Root Canal Treatment (Anterior)',
  'Root Canal Treatment (Premolar)',
  'Root Canal Treatment (Molar)',
  'Pulpotomy / Pulpectomy',
  'Simple Tooth Extraction',
  'Surgical / Impacted Tooth Extraction',
  'PFM Crown (Porcelain Fused to Metal)',
  'Zirconia Crown',
  'Dental Bridge (per unit)',
  'Complete Upper/Lower Denture',
  'Partial Acrylic/Flexible Denture',
  'Dental Implant Placement',
  'Abutment & Implant Crown',
  'Pit & Fissure Sealant',
  'Fluoride Varnish Application',
  'Orthodontic Bracket Adjustment',
  'Night Guard / Occlusal Splint',
  'Teeth Whitening / Bleaching',
];

// ─── FDI TEETH NOTATION DEFINITIONS ───────────────────────────────────────────
// Adult Permanent Teeth (32)
const ADULT_UPPER_TEETH = [18,17,16,15,14,13,12,11, 21,22,23,24,25,26,27,28];
const ADULT_LOWER_TEETH = [48,47,46,45,44,43,42,41, 31,32,33,34,35,36,37,38];

// Primary / Deciduous Pediatric Teeth (20)
const PEDIATRIC_UPPER_TEETH = [55,54,53,52,51, 61,62,63,64,65];
const PEDIATRIC_LOWER_TEETH = [85,84,83,82,81, 71,72,73,74,75];

const DEFAULT_TOOTH_STRUCTURE = {
  condition: 'Healthy',
  surfaces: { B: 'Healthy', M: 'Healthy', O: 'Healthy', D: 'Healthy', L: 'Healthy' },
  notes: '',
  missing: false,
  mobility: 0, // 0, 1, 2, 3
  probingDepth: { B: 2, L: 2 },
  bop: { B: false, L: false }
};

const generateDefaultToothData = () => {
  const data = {};
  const allTeeth = [
    ...ADULT_UPPER_TEETH, ...ADULT_LOWER_TEETH,
    ...PEDIATRIC_UPPER_TEETH, ...PEDIATRIC_LOWER_TEETH
  ];
  allTeeth.forEach(t => {
    data[t.toString()] = JSON.parse(JSON.stringify(DEFAULT_TOOTH_STRUCTURE));
  });
  return data;
};

// ─── ANATOMICAL POLYGON TOOTH SVG COMPONENT ─────────────────────────────────
const AnatomicalToothSVG = ({ number, data, isSelected, onClick, onSurfaceClick, activeToolCondition, isUpper }) => {
  const toothData = data || DEFAULT_TOOTH_STRUCTURE;
  const isMissing = toothData.missing;
  const s = toothData.surfaces || DEFAULT_TOOTH_STRUCTURE.surfaces;
  
  const bColor = CONDITIONS[s.B]?.color || CONDITIONS.Healthy.color;
  const mColor = CONDITIONS[s.M]?.color || CONDITIONS.Healthy.color;
  const oColor = CONDITIONS[s.O]?.color || CONDITIONS.Healthy.color;
  const dColor = CONDITIONS[s.D]?.color || CONDITIONS.Healthy.color;
  const lColor = CONDITIONS[s.L]?.color || CONDITIONS.Healthy.color;

  const isRCT = toothData.condition === 'Root Canal' || Object.values(s).includes('Root Canal');
  const isCrown = toothData.condition === 'Crown' || Object.values(s).includes('Crown');
  const isImplant = toothData.condition === 'Implant';

  const handleSurfaceClick = (e, surfaceKey) => {
    e.stopPropagation();
    if (onSurfaceClick) {
      onSurfaceClick(number.toString(), surfaceKey);
    } else if (onClick) {
      onClick(number.toString());
    }
  };

  return (
    <div className="flex flex-col items-center gap-1">
      {!isUpper && (
        <div className="flex items-center gap-0.5">
          <span className="text-[10px] text-slate-500 font-bold">{number}</span>
          {toothData.mobility > 0 && (
            <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500 text-white font-extrabold" title={`Mobility Grade ${toothData.mobility}`}>
              M{toothData.mobility}
            </span>
          )}
        </div>
      )}

      {/* Main Interactive Container */}
      <div 
        onClick={() => onClick(number.toString())}
        className={`relative cursor-pointer transition-all rounded-lg p-1 bg-white border-2 ${
          isSelected 
            ? 'border-rose-500 shadow-md ring-2 ring-rose-500/20 scale-105 z-20' 
            : 'border-slate-200 hover:border-rose-300 hover:shadow-xs'
        }`}
        style={{ width: 52, height: 68 }}
      >
        <svg width="44" height="60" viewBox="0 0 44 60" className="block mx-auto">
          {/* ROOT APEX GRAPHIC */}
          <g>
            {isUpper ? (
              // Upper Root pointing upwards
              <path 
                d="M 14 18 C 14 5, 22 2, 22 2 C 22 2, 30 5, 30 18 Z" 
                fill={isRCT ? '#a855f7' : isImplant ? '#14b8a6' : '#f1f5f9'} 
                stroke={isRCT ? '#6b21a8' : isImplant ? '#0f766e' : '#cbd5e1'} 
                strokeWidth="1.2" 
              />
            ) : (
              // Lower Root pointing downwards
              <path 
                d="M 14 42 C 14 55, 22 58, 22 58 C 22 58, 30 55, 30 42 Z" 
                fill={isRCT ? '#a855f7' : isImplant ? '#14b8a6' : '#f1f5f9'} 
                stroke={isRCT ? '#6b21a8' : isImplant ? '#0f766e' : '#cbd5e1'} 
                strokeWidth="1.2" 
              />
            )}
            
            {/* Root Canal Channel Line */}
            {isRCT && (
              <line 
                x1="22" y1={isUpper ? "4" : "44"} 
                x2="22" y2={isUpper ? "18" : "56"} 
                stroke="#ffffff" strokeWidth="2" strokeDasharray="2,2" 
              />
            )}

            {/* Implant Anchor Threads */}
            {isImplant && (
              <g stroke="#ffffff" strokeWidth="1">
                <line x1="18" y1={isUpper ? "8" : "48"} x2="26" y2={isUpper ? "8" : "48"} />
                <line x1="19" y1={isUpper ? "12" : "52"} x2="25" y2={isUpper ? "12" : "52"} />
              </g>
            )}
          </g>

          {/* MISSING / EXTRACTED OVERLAY */}
          {isMissing ? (
            <g>
              <rect x="2" y="16" width="40" height="28" fill="#f8fafc" rx="4" />
              <line x1="4" y1="18" x2="40" y2="42" stroke="#dc2626" strokeWidth="3" strokeLinecap="round" />
              <line x1="40" y1="18" x2="4" y2="42" stroke="#dc2626" strokeWidth="3" strokeLinecap="round" />
            </g>
          ) : (
            /* CROWN ANATOMICAL FIVE-SURFACE POLYGONS */
            <g stroke="#94a3b8" strokeWidth="0.8">
              {/* Buccal (B) - Top Outer Polygon */}
              <polygon 
                points="2,16 42,16 33,23 11,23" 
                fill={bColor}
                onClick={(e) => handleSurfaceClick(e, 'B')}
                className="hover:opacity-80 transition-opacity cursor-pointer"
              />

              {/* Mesial (M) - Left Polygon */}
              <polygon 
                points="2,16 11,23 11,37 2,44" 
                fill={mColor}
                onClick={(e) => handleSurfaceClick(e, 'M')}
                className="hover:opacity-80 transition-opacity cursor-pointer"
              />

              {/* Occlusal / Incisal (O) - Center Diamond */}
              <polygon 
                points="11,23 33,23 33,37 11,37" 
                fill={oColor}
                onClick={(e) => handleSurfaceClick(e, 'O')}
                className="hover:opacity-80 transition-opacity cursor-pointer"
              />

              {/* Distal (D) - Right Polygon */}
              <polygon 
                points="42,16 33,23 33,37 42,44" 
                fill={dColor}
                onClick={(e) => handleSurfaceClick(e, 'D')}
                className="hover:opacity-80 transition-opacity cursor-pointer"
              />

              {/* Lingual / Palatal (L) - Bottom Inner Polygon */}
              <polygon 
                points="11,37 33,37 42,44 2,44" 
                fill={lColor}
                onClick={(e) => handleSurfaceClick(e, 'L')}
                className="hover:opacity-80 transition-opacity cursor-pointer"
              />

              {/* Crown Casing Border */}
              {isCrown && (
                <rect x="2" y="16" width="40" height="28" fill="none" stroke="#3b82f6" strokeWidth="2.5" rx="3" strokeDasharray="4,2" />
              )}
            </g>
          )}
        </svg>

        {/* Active Tool Surface Indicator Dot */}
        {activeToolCondition && activeToolCondition !== 'Healthy' && (
          <div 
            className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full border border-white" 
            style={{ backgroundColor: CONDITIONS[activeToolCondition]?.color || '#f43f5e' }} 
          />
        )}
      </div>

      {isUpper && (
        <div className="flex items-center gap-0.5">
          <span className="text-[10px] text-slate-500 font-bold">{number}</span>
          {toothData.mobility > 0 && (
            <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500 text-white font-extrabold" title={`Mobility Grade ${toothData.mobility}`}>
              M{toothData.mobility}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

// ─── MAIN DENTAL CHARTING COMPONENT ──────────────────────────────────────────
export default function DentalCharting() {
  const { user } = useAuth();
  
  // Patient & Header States
  const [patientId, setPatientId] = useState('');
  const [patientName, setPatientName] = useState('');
  const [patientDetails, setPatientDetails] = useState(null);
  const [patientSource, setPatientSource] = useState(null); // 'cache' | 'live'
  
  const [chartDate, setChartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [provider, setProvider] = useState(user?.fullName || '');
  const [generalNotes, setGeneralNotes] = useState('');
  
  // Dentition Type: 'adult' | 'pediatric' | 'mixed'
  const [dentitionType, setDentitionType] = useState('adult');
  
  // Tooth Data Store
  const [toothData, setToothData] = useState(generateDefaultToothData());
  const [selectedTooth, setSelectedTooth] = useState(null);

  // Quick Condition Palette Active Tool
  const [activeTool, setActiveTool] = useState('Caries'); // Condition key to apply on click

  // Treatment Plan Items: [{ id, tooth, surface, procedure, status, notes }]
  const [treatmentPlan, setTreatmentPlan] = useState([]);
  const [newProcTooth, setNewProcTooth] = useState('');
  const [newProcName, setNewProcName] = useState('');
  const [newProcSurface, setNewProcSurface] = useState('');
  const [newProcStatus, setNewProcStatus] = useState('Planned');

  // Lumina AI Generator State
  const [isGeneratingAiNote, setIsGeneratingAiNote] = useState(false);

  // Lumina Smart Procedure Suggestion based on selected or charted tooth state
  const luminaSuggestedProcedure = useMemo(() => {
    const targetToothNum = selectedTooth || (newProcTooth ? newProcTooth.replace('#', '') : null);
    if (targetToothNum && toothData[targetToothNum]) {
      const data = toothData[targetToothNum];
      if (data.missing) return 'Dental Implant Placement';
      
      const nonHealthySurfaces = Object.entries(data.surfaces || {})
        .filter(([_, cond]) => cond && cond !== 'Healthy');
      
      const cariesCount = nonHealthySurfaces.filter(([_, c]) => c === 'Caries').length;
      if (data.condition === 'Caries' || cariesCount > 0) {
        if (cariesCount === 1) return 'Composite Restoration (1 Surface)';
        if (cariesCount === 2) return 'Composite Restoration (2 Surfaces)';
        if (cariesCount >= 3) return 'Composite Restoration (3+ Surfaces)';
        return 'Composite Restoration (1 Surface)';
      }
      
      if (data.condition === 'Root Canal' || nonHealthySurfaces.some(([_, c]) => c === 'Root Canal')) {
        return 'Root Canal Treatment (Molar)';
      }
      if (data.condition === 'Crown' || nonHealthySurfaces.some(([_, c]) => c === 'Crown')) {
        return 'Zirconia Crown';
      }
      if (data.condition === 'Extraction Planned') return 'Simple Tooth Extraction';
      if (data.condition === 'Fractured') return 'Composite Restoration (3+ Surfaces)';
      if (data.condition === 'Sealant') return 'Pit & Fissure Sealant';
      if (data.condition === 'Periapical') return 'Root Canal Treatment (Molar)';
    }

    for (const [num, data] of Object.entries(toothData)) {
      if (!data) continue;
      if (data.condition === 'Caries' || Object.values(data.surfaces || {}).includes('Caries')) {
        return 'Composite Restoration (1 Surface)';
      }
      if (data.condition === 'Root Canal') return 'Root Canal Treatment (Molar)';
      if (data.condition === 'Extraction Planned') return 'Simple Tooth Extraction';
    }

    return 'Scaling & Polishing (Prophylaxis)';
  }, [selectedTooth, newProcTooth, toothData]);

  // History & Load States
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [showAiPrescriber, setShowAiPrescriber] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingPatient, setLoadingPatient] = useState(false);
  const [isChartLoaded, setIsChartLoaded] = useState(false);

  // Search Autocomplete
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchRef = useRef(null);

  const canEditRoles = ['admin', 'deputy_coo', 'dental', 'dentist', 'dental_tech', 'dental_hod', 'dental_lab_manager'];
  const canEdit = user && canEditRoles.includes(user.role);

  // Sync provider if user is loaded
  useEffect(() => {
    if (user?.fullName && !provider) {
      setProvider(user.fullName);
    }
  }, [user]);

  // Auto-lookup patient name & details when PID is typed
  useEffect(() => {
    const pid = patientId?.trim();
    if (!pid) return;
    const timer = setTimeout(async () => {
      try {
        const pRes = await getPatientByPid(pid);
        const pData = pRes?.data?.data ?? pRes?.data;
        if (pData?.full_name) {
          if (!patientName) setPatientName(pData.full_name);
          setPatientDetails(pData);
          setPatientSource(pRes?.data?.source || pData?.source || 'cache');
        }
      } catch {
        // PID not found — allow manual entry
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [patientId]);

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
    if (!query || query.trim().length < 1) {
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
      // 1. Fetch Patient Info
      try {
        const pRes = await getPatientByPid(targetPid);
        const pData = pRes?.data?.data ?? pRes?.data;
        const source = pRes?.data?.source || pData?.source || 'cache';
        
        if (pData && pData.full_name) {
          setPatientName(pData.full_name);
          setPatientDetails(pData);
          setPatientSource(source);
          toast.success(`Patient "${pData.full_name}" fetched (${source === 'live' ? 'Sukraa HIMS' : 'Local DB'}).`);
        }
      } catch (pErr) {
        console.log('Patient lookup note:', pErr.message);
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
      } else if (chartsArray.length > 0) {
        toast.success(`Found ${chartsArray.length} historical chart(s). Select below to load.`);
      } else {
        toast.success('No prior charts found. Ready for new chart entry.');
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
    setTreatmentPlan([]);
    setSelectedTooth(null);
    setIsChartLoaded(false);
    setChartDate(format(new Date(), 'yyyy-MM-dd'));
    setProvider(user?.fullName || '');
  };

  const loadSpecificChart = async (id) => {
    try {
      const res = await getChart(id);
      const chart = res?.data?.data ?? res?.data ?? res;
      if (chart && chart.tooth_data) {
        let rawData = typeof chart.tooth_data === 'string' ? JSON.parse(chart.tooth_data) : chart.tooth_data;
        
        // Handle structured vs legacy payload
        if (rawData.teeth) {
          setToothData(rawData.teeth);
          if (rawData.dentition_type) setDentitionType(rawData.dentition_type);
          if (rawData.treatment_plan) setTreatmentPlan(rawData.treatment_plan);
        } else {
          // Legacy format
          setToothData(rawData);
        }

        setPatientName(chart.patient_name || patientName);
        setChartDate(chart.chart_date);
        setProvider(chart.provider || provider);
        setGeneralNotes(chart.general_notes || '');
        setIsChartLoaded(true);
        toast.success('Dental chart loaded successfully');
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

    const payloadToothData = {
      dentition_type: dentitionType,
      teeth: toothData,
      treatment_plan: treatmentPlan
    };

    try {
      await saveChart({
        patient_id: patientId,
        patient_name: patientName,
        chart_date: chartDate,
        tooth_data: payloadToothData,
        general_notes: generalNotes,
        provider: provider
      });
      toast.success('Dental Chart saved successfully');
      fetchPatientAndCharts(patientId); 
    } catch (err) {
      toast.error(err.message || 'Failed to save chart');
    }
  };

  const handleDeleteChart = async (id) => {
    if (!window.confirm('Are you sure you want to delete this chart?')) return;
    try {
      await deleteChart(id);
      toast.success('Chart deleted');
      fetchPatientAndCharts(patientId);
    } catch (err) {
      toast.error(err.message || 'Failed to delete chart');
    }
  };

  const updateTooth = (toothNumber, updates) => {
    setToothData(prev => ({
      ...prev,
      [toothNumber]: {
        ...(prev[toothNumber] || DEFAULT_TOOTH_STRUCTURE),
        ...updates
      }
    }));
  };

  const handleDirectSurfaceClick = (toothNumber, surfaceKey) => {
    if (!canEdit) return;
    setSelectedTooth(toothNumber);
    if (!activeTool) return;

    setToothData(prev => {
      const currentTooth = prev[toothNumber] || DEFAULT_TOOTH_STRUCTURE;
      const newSurfaces = { ...currentTooth.surfaces, [surfaceKey]: activeTool };
      return {
        ...prev,
        [toothNumber]: {
          ...currentTooth,
          surfaces: newSurfaces
        }
      };
    });
    toast.success(`Applied "${activeTool}" to Tooth #${toothNumber} (${surfaceKey})`, { duration: 1500 });
  };

  const applyActiveToolToAllSurfaces = () => {
    if (!selectedTooth || !canEdit) return;
    const currentTooth = toothData[selectedTooth] || DEFAULT_TOOTH_STRUCTURE;
    const newSurfaces = { ...currentTooth.surfaces };
    Object.keys(newSurfaces).forEach(k => {
      newSurfaces[k] = activeTool;
    });
    updateTooth(selectedTooth, { condition: activeTool, surfaces: newSurfaces });
    toast.success(`Applied "${activeTool}" to all surfaces of Tooth #${selectedTooth}`);
  };

  // Treatment Plan Builder Handlers
  const handleAddProcedure = (e) => {
    e.preventDefault();
    if (!newProcName.trim()) return toast.error('Enter a procedure description.');
    const newItem = {
      id: Date.now().toString(),
      tooth: newProcTooth || (selectedTooth ? `#${selectedTooth}` : 'General'),
      surface: newProcSurface || 'All',
      procedure: newProcName,
      status: newProcStatus,
    };
    setTreatmentPlan(prev => [...prev, newItem]);
    setNewProcName('');
    setNewProcSurface('');
    toast.success('Procedure added to treatment plan.');
  };

  const handleRemoveProcedure = (procId) => {
    setTreatmentPlan(prev => prev.filter(p => p.id !== procId));
  };

  const handleToggleProcStatus = (procId) => {
    setTreatmentPlan(prev => prev.map(p => {
      if (p.id === procId) {
        const nextStatus = p.status === 'Planned' ? 'In Progress' : p.status === 'In Progress' ? 'Completed' : 'Planned';
        return { ...p, status: nextStatus };
      }
      return p;
    }));
  };

  // FDI Tooth Naming Dictionary for Lumina AI
  const FDI_NAMES = {
    '18': 'Upper Right 3rd Molar (#18)', '17': 'Upper Right 2nd Molar (#17)', '16': 'Upper Right 1st Molar (#16)',
    '15': 'Upper Right 2nd Premolar (#15)', '14': 'Upper Right 1st Premolar (#14)', '13': 'Upper Right Canine (#13)',
    '12': 'Upper Right Lateral Incisor (#12)', '11': 'Upper Right Central Incisor (#11)',
    '21': 'Upper Left Central Incisor (#21)', '22': 'Upper Left Lateral Incisor (#22)', '23': 'Upper Left Canine (#23)',
    '24': 'Upper Left 1st Premolar (#24)', '25': 'Upper Left 2nd Premolar (#25)', '26': 'Upper Left 1st Molar (#26)',
    '27': 'Upper Left 2nd Molar (#27)', '28': 'Upper Left 3rd Molar (#28)',
    '31': 'Lower Left Central Incisor (#31)', '32': 'Lower Left Lateral Incisor (#32)', '33': 'Lower Left Canine (#33)',
    '34': 'Lower Left 1st Premolar (#34)', '35': 'Lower Left 2nd Premolar (#35)', '36': 'Lower Left 1st Molar (#36)',
    '37': 'Lower Left 2nd Molar (#37)', '38': 'Lower Left 3rd Molar (#38)',
    '41': 'Lower Right Central Incisor (#41)', '42': 'Lower Right Lateral Incisor (#42)', '43': 'Lower Right Canine (#43)',
    '44': 'Lower Right 1st Premolar (#44)', '45': 'Lower Right 2nd Premolar (#45)', '46': 'Lower Right 1st Molar (#46)',
    '47': 'Lower Right 2nd Molar (#47)', '48': 'Lower Right 3rd Molar (#48)',
    '55': 'Upper Right Primary 2nd Molar (#55)', '54': 'Upper Right Primary 1st Molar (#54)', '53': 'Upper Right Primary Canine (#53)', '52': 'Upper Right Primary Lateral Incisor (#52)', '51': 'Upper Right Primary Central Incisor (#51)',
    '61': 'Upper Left Primary Central Incisor (#61)', '62': 'Upper Left Primary Lateral Incisor (#62)', '63': 'Upper Left Primary Canine (#63)', '64': 'Upper Left Primary 1st Molar (#64)', '65': 'Upper Left Primary 2nd Molar (#65)',
    '71': 'Lower Left Primary Central Incisor (#71)', '72': 'Lower Left Primary Lateral Incisor (#72)', '73': 'Lower Left Primary Canine (#73)', '74': 'Lower Left Primary 1st Molar (#74)', '75': 'Lower Left Primary 2nd Molar (#75)',
    '81': 'Lower Right Primary Central Incisor (#81)', '82': 'Lower Right Primary Lateral Incisor (#82)', '83': 'Lower Right Primary Canine (#83)', '84': 'Lower Right Primary 1st Molar (#84)', '85': 'Lower Right Primary 2nd Molar (#85)',
  };

  const SURFACE_NAMES = { B: 'Buccal/Labial', M: 'Mesial', O: 'Occlusal/Incisal', D: 'Distal', L: 'Lingual/Palatal' };

  const handleGenerateAiNote = async () => {
    if (!canEdit) return toast.error('You do not have permission to generate AI notes');
    setIsGeneratingAiNote(true);
    const toastId = toast.loading('Lumina AI is generating FDI dental clinical notes...');

    try {
      const res = await generateDentalAiNote({
        toothData,
        treatmentPlan,
        patientName,
        patientId,
        dentitionType,
        existingNotes: generalNotes,
        provider
      });
      if (res.data?.success && res.data?.data?.note) {
        setGeneralNotes(res.data.data.note);
        toast.success('Lumina AI clinical notes generated!', { id: toastId });
        setIsGeneratingAiNote(false);
        return;
      }
    } catch (err) {
      console.warn('Backend AI note endpoint fallback:', err.message);
    }

    // Client-side Lumina AI engine fallback
    try {
      const lines = [];
      lines.push(`LUMINA AI DENTAL CLINICAL EXAMINATION NOTE`);
      lines.push(`Date: ${format(new Date(), 'dd MMM yyyy')}`);
      if (patientName || patientId) lines.push(`Patient: ${patientName || 'Unknown'} (PID: ${patientId || 'N/A'})`);
      if (provider) lines.push(`Attending Practitioner: ${provider}`);
      lines.push(`Dentition Mode: ${dentitionType.toUpperCase()} (FDI Notation System)`);
      lines.push(``);

      const missingTeeth = [];
      const cariesTeeth = [];
      const rctTeeth = [];
      const crownTeeth = [];
      const implantTeeth = [];
      const bridgeTeeth = [];
      const extractionPlanned = [];
      const fractureTeeth = [];
      const periapicalTeeth = [];
      const mobilityTeeth = [];
      const deepProbingTeeth = [];

      Object.entries(toothData).forEach(([num, data]) => {
        if (!data) return;
        const toothLabel = FDI_NAMES[num] || `Tooth #${num}`;

        if (data.missing) {
          missingTeeth.push(toothLabel);
          return;
        }

        const nonHealthySurfaces = Object.entries(data.surfaces || {})
          .filter(([_, cond]) => cond && cond !== 'Healthy');

        if (data.condition === 'Caries' || nonHealthySurfaces.some(([_, c]) => c === 'Caries')) {
          const surfaces = nonHealthySurfaces
            .filter(([_, c]) => c === 'Caries')
            .map(([s]) => SURFACE_NAMES[s] || s);
          cariesTeeth.push(`${toothLabel}${surfaces.length ? ` [${surfaces.join(', ')}]` : ''}`);
        }

        if (data.condition === 'Root Canal' || nonHealthySurfaces.some(([_, c]) => c === 'Root Canal')) {
          rctTeeth.push(toothLabel);
        }

        if (data.condition === 'Crown' || nonHealthySurfaces.some(([_, c]) => c === 'Crown')) {
          crownTeeth.push(toothLabel);
        }

        if (data.condition === 'Implant') implantTeeth.push(toothLabel);
        if (data.condition === 'Bridge') bridgeTeeth.push(toothLabel);
        if (data.condition === 'Extraction Planned') extractionPlanned.push(toothLabel);
        if (data.condition === 'Fractured') fractureTeeth.push(toothLabel);
        if (data.condition === 'Periapical') periapicalTeeth.push(toothLabel);

        if (data.mobility && data.mobility > 0) {
          const mobilityDesc = data.mobility === 1 ? 'Grade I (<1mm)' : data.mobility === 2 ? 'Grade II (1-2mm)' : 'Grade III (>2mm)';
          mobilityTeeth.push(`${toothLabel}: ${mobilityDesc}`);
        }

        if (data.probingDepth && (data.probingDepth.B >= 4 || data.probingDepth.L >= 4)) {
          deepProbingTeeth.push(`${toothLabel} (Buccal: ${data.probingDepth.B || 2}mm, Lingual: ${data.probingDepth.L || 2}mm)`);
        }
      });

      lines.push(`1. CLINICAL FINDINGS & ODONTOGRAM SUMMARY:`);
      let hasFindings = false;

      if (cariesTeeth.length > 0) {
        lines.push(`   • Dental Caries / Active Decay (${cariesTeeth.length}): ${cariesTeeth.join('; ')}.`);
        hasFindings = true;
      }
      if (rctTeeth.length > 0) {
        lines.push(`   • Endodontic Involvement / RCT (${rctTeeth.length}): ${rctTeeth.join('; ')}.`);
        hasFindings = true;
      }
      if (periapicalTeeth.length > 0) {
        lines.push(`   • Periapical Pathology / Lesions (${periapicalTeeth.length}): ${periapicalTeeth.join('; ')}.`);
        hasFindings = true;
      }
      if (fractureTeeth.length > 0) {
        lines.push(`   • Structural Fractures (${fractureTeeth.length}): ${fractureTeeth.join('; ')}.`);
        hasFindings = true;
      }
      if (crownTeeth.length > 0 || implantTeeth.length > 0 || bridgeTeeth.length > 0) {
        const prosthetics = [...crownTeeth.map(t => `${t} (Crown)`), ...implantTeeth.map(t => `${t} (Implant)`), ...bridgeTeeth.map(t => `${t} (Bridge)`)];
        lines.push(`   • Existing Prosthetics & Restorations: ${prosthetics.join('; ')}.`);
        hasFindings = true;
      }
      if (extractionPlanned.length > 0) {
        lines.push(`   • Non-restorable / Planned Extractions (${extractionPlanned.length}): ${extractionPlanned.join('; ')}.`);
        hasFindings = true;
      }
      if (missingTeeth.length > 0) {
        lines.push(`   • Missing / Previously Extracted Teeth (${missingTeeth.length}): ${missingTeeth.join('; ')}.`);
        hasFindings = true;
      }

      if (!hasFindings) {
        lines.push(`   • Complete dentition inspected. No overt active caries or acute pathological lesions noted.`);
      }
      lines.push(``);

      lines.push(`2. PERIODONTAL & HARD TISSUE ASSESSMENT:`);
      if (mobilityTeeth.length > 0 || deepProbingTeeth.length > 0) {
        if (mobilityTeeth.length > 0) lines.push(`   • Increased Tooth Mobility: ${mobilityTeeth.join('; ')}.`);
        if (deepProbingTeeth.length > 0) lines.push(`   • Deep Periodontal Pockets (>=4mm): ${deepProbingTeeth.join('; ')}.`);
      } else {
        lines.push(`   • Periodontal probing depths within normal limits (<3mm). No pathological tooth mobility observed.`);
      }
      lines.push(``);

      lines.push(`3. PROPOSED TREATMENT PLAN & INTERVENTIONS:`);
      if (treatmentPlan && treatmentPlan.length > 0) {
        treatmentPlan.forEach((item, i) => {
          lines.push(`   ${i + 1}. [${item.status || 'Planned'}] Tooth ${item.tooth}: ${item.procedure}`);
        });
      } else if (cariesTeeth.length > 0 || rctTeeth.length > 0 || extractionPlanned.length > 0) {
        lines.push(`   • Restorative and endodontic care recommended based on odontogram findings.`);
      } else {
        lines.push(`   • Routine oral prophylaxis and bi-annual recall recommended.`);
      }
      lines.push(``);

      if (generalNotes && generalNotes.trim()) {
        lines.push(`4. PRACTITIONER CLINICAL REMARKS:`);
        lines.push(`   "${generalNotes.trim()}"`);
        lines.push(``);
      }

      lines.push(`5. PATIENT ADVICE & RECOMMENDATIONS:`);
      lines.push(`   • Maintain oral hygiene: Twice daily modified Bass technique brushing with fluoridated toothpaste & daily interdental flossing.`);
      lines.push(`   • Avoid hard/sticky foods on compromised or recently treated teeth.`);
      lines.push(`   • Follow-up appointment scheduled for treatment plan progression.`);

      setGeneralNotes(lines.join('\n'));
      toast.success('Lumina AI clinical notes generated!', { id: toastId });
    } catch (e) {
      toast.error('Failed to generate AI note.', { id: toastId });
    } finally {
      setIsGeneratingAiNote(false);
    }
  };

  // Printable View Trigger
  const handlePrintChart = () => {
    window.print();
  };

  const getQuadrantName = (num) => {
    const n = parseInt(num);
    if (n >= 11 && n <= 18) return 'Upper Right Permanent (Q1)';
    if (n >= 21 && n <= 28) return 'Upper Left Permanent (Q2)';
    if (n >= 31 && n <= 38) return 'Lower Left Permanent (Q3)';
    if (n >= 41 && n <= 48) return 'Lower Right Permanent (Q4)';
    if (n >= 51 && n <= 55) return 'Upper Right Primary (Q5)';
    if (n >= 61 && n <= 65) return 'Upper Left Primary (Q6)';
    if (n >= 71 && n <= 75) return 'Lower Left Primary (Q7)';
    if (n >= 81 && n <= 85) return 'Lower Right Primary (Q8)';
    return 'Dental Tooth';
  };

  const renderToothRow = (teethArray, isUpper) => {
    const half = Math.ceil(teethArray.length / 2);
    const leftSide = teethArray.slice(0, half);
    const rightSide = teethArray.slice(half);
    return (
      <div className="flex items-center justify-center gap-1 my-2">
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {leftSide.map(num => (
            <AnatomicalToothSVG 
              key={num} 
              number={num} 
              data={toothData[num.toString()]} 
              isSelected={selectedTooth === num.toString()} 
              onClick={setSelectedTooth}
              onSurfaceClick={handleDirectSurfaceClick}
              activeToolCondition={activeTool}
              isUpper={isUpper}
            />
          ))}
        </div>
        <div className="h-16 border-l-2 border-dashed border-rose-300 mx-2 flex-shrink-0" />
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {rightSide.map(num => (
            <AnatomicalToothSVG 
              key={num} 
              number={num} 
              data={toothData[num.toString()]} 
              isSelected={selectedTooth === num.toString()} 
              onClick={setSelectedTooth}
              onSurfaceClick={handleDirectSurfaceClick}
              activeToolCondition={activeTool}
              isUpper={isUpper}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20 font-sans print:p-0 print:max-w-none">
      
      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-rose-500 to-rose-600 text-white rounded-2xl shadow-md">
            <Stethoscope size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Dental Charting & Odontogram</h1>
            <p className="text-xs text-slate-500 font-medium">Interactive FDI multi-dentition anatomical charting & treatment planning.</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setShowAiPrescriber(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl transition-all font-bold text-xs shadow-xs cursor-pointer"
          >
            <Sparkles size={15} />
            <span>Lumina AI Prescriber</span>
          </button>
          <button
            onClick={handlePrintChart}
            className="flex items-center gap-2 px-3.5 py-2 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-100 transition-all font-semibold bg-white text-xs shadow-xs"
          >
            <Printer size={15} />
            <span>Print Chart</span>
          </button>
          <button
            onClick={handleNewChart}
            className="flex items-center gap-2 px-3.5 py-2 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-100 transition-all font-semibold bg-white text-xs shadow-xs"
          >
            <FilePlus size={15} />
            <span>New Chart</span>
          </button>
          <button
            onClick={handleSaveChart}
            disabled={!patientId || !canEdit}
            className="flex items-center gap-2 px-5 py-2 bg-rose-600 text-white rounded-xl hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm font-bold text-xs"
          >
            <Save size={15} />
            <span>Save Chart</span>
          </button>
        </div>
      </div>

      {/* PATIENT BAR */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          {/* Patient ID Autocomplete Search */}
          <div className="space-y-1.5 relative" ref={searchRef}>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center justify-between">
              <span>Patient ID / Search</span>
              {isSearching && <Loader2 size={13} className="animate-spin text-rose-500" />}
            </label>
            <div className="relative">
              <input
                type="text"
                value={patientId}
                onChange={(e) => handlePatientSearch(e.target.value)}
                onFocus={() => searchResults.length > 0 && setShowSearchResults(true)}
                placeholder="Sukraa ID or Patient Name..."
                className="w-full pl-3 pr-8 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-xs font-semibold"
              />
              <Search size={15} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            {/* Dropdown */}
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
                        <p className="text-[11px] text-slate-400">PID: {p.pid} {p.gender ? `• ${p.gender}` : ''}</p>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.5 rounded font-mono uppercase bg-slate-100 text-slate-500 font-bold">
                        {p.source || 'db'}
                      </span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600">Patient Name</label>
            <input
              type="text"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              placeholder="Patient full name"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-xs font-semibold"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600">Chart Date</label>
            <input
              type="date"
              value={chartDate}
              onChange={(e) => setChartDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-xs font-semibold"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600">Treating Provider</label>
            <input
              type="text"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              placeholder="Dr. Dentist Name"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-xs font-semibold"
            />
          </div>

          <div>
            <button
              onClick={() => fetchPatientAndCharts(patientId)}
              disabled={loadingHistory || loadingPatient || !patientId}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 disabled:opacity-50 transition-all font-bold text-xs shadow-xs"
            >
              {loadingPatient || loadingHistory ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
              <span>Fetch Charts</span>
            </button>
          </div>
        </div>

        {/* Patient Badges */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-3 flex-wrap">
            {patientDetails && (
              <div className="flex items-center gap-2 text-slate-600 font-semibold bg-slate-50 px-3 py-1 rounded-xl border border-slate-200">
                <User size={14} className="text-slate-400" />
                <span>PID: <strong className="text-slate-900">{patientDetails.pid}</strong></span>
                {patientDetails.gender && <span>• {patientDetails.gender}</span>}
                {patientDetails.age && <span>• {patientDetails.age} yrs</span>}
                {patientDetails.phone && <span>• 📞 {patientDetails.phone}</span>}
              </div>
            )}

            {patientSource && (
              <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl font-bold text-xs border ${
                patientSource === 'live'
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-indigo-50 text-indigo-700 border-indigo-200'
              }`}>
                {patientSource === 'live' ? <Globe size={13} /> : <Database size={13} />}
                <span>Source: <strong>{patientSource === 'live' ? 'Sukraa HIMS (Cached)' : 'Local DB Cache'}</strong></span>
              </div>
            )}
          </div>

          {isChartLoaded && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
              <CheckCircle2 size={14} className="text-emerald-500" />
              Chart Loaded
            </div>
          )}
        </div>
      </div>

      {/* QUICK CONDITION TOOLBAR / PALETTE */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-2 print:hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Sparkles size={14} className="text-rose-500" />
            Quick Surface Charting Palette (Click condition, then click tooth surface on Odontogram)
          </span>
          <span className="text-[11px] text-slate-400 font-medium">Active Tool: <strong className="text-rose-600">{activeTool}</strong></span>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          {Object.entries(CONDITIONS).map(([key, val]) => {
            const isActive = activeTool === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTool(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  isActive 
                    ? 'ring-2 ring-rose-500 border-rose-500 shadow-sm scale-105' 
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50'
                }`}
              >
                <span className="w-3 h-3 rounded-full border border-slate-300 shadow-2xs" style={{ backgroundColor: val.color }} />
                <span className="text-slate-800">{val.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ODONTOGRAM ARCHES & DETAIL PANEL */}
      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* ODONTOGRAM CANVAS */}
        <div className="flex-grow lg:w-[68%] bg-white rounded-2xl border border-slate-200 p-6 shadow-xs overflow-x-auto">
          {/* Dentition View Toggle */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Layers size={18} className="text-slate-500" />
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700">Dentition Mode</span>
            </div>
            <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
              <button
                onClick={() => setDentitionType('adult')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  dentitionType === 'adult' ? 'bg-white text-rose-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Adult (Permanent 32)
              </button>
              <button
                onClick={() => setDentitionType('pediatric')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  dentitionType === 'pediatric' ? 'bg-white text-rose-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Pediatric (Primary 20)
              </button>
              <button
                onClick={() => setDentitionType('mixed')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  dentitionType === 'mixed' ? 'bg-white text-rose-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Mixed Dentition
              </button>
            </div>
          </div>

          <div className="min-w-[760px]">
            {/* ADULT / PERMANENT DENTITION */}
            {(dentitionType === 'adult' || dentitionType === 'mixed') && (
              <div>
                <div className="text-center text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-2">
                  Permanent Dentition (Adult)
                </div>
                {/* Upper Arch */}
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2 px-8 text-[11px] font-bold text-slate-400 uppercase">
                    <span>UR (Maxillary Right)</span>
                    <span className="text-slate-800 font-extrabold">UPPER ARCH</span>
                    <span>UL (Maxillary Left)</span>
                  </div>
                  {renderToothRow(ADULT_UPPER_TEETH, true)}
                </div>

                <div className="w-full border-t border-dashed border-slate-300 my-6 relative">
                  <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 text-[10px] text-slate-400 font-extrabold tracking-wider uppercase">
                    OCCLUSAL MIDLINE
                  </div>
                </div>

                {/* Lower Arch */}
                <div className="mb-6">
                  {renderToothRow(ADULT_LOWER_TEETH, false)}
                  <div className="flex justify-between items-center mt-2 px-8 text-[11px] font-bold text-slate-400 uppercase">
                    <span>LR (Mandibular Right)</span>
                    <span className="text-slate-800 font-extrabold">LOWER ARCH</span>
                    <span>LL (Mandibular Left)</span>
                  </div>
                </div>
              </div>
            )}

            {/* PEDIATRIC / PRIMARY DENTITION */}
            {(dentitionType === 'pediatric' || dentitionType === 'mixed') && (
              <div className={dentitionType === 'mixed' ? 'mt-10 pt-6 border-t-2 border-slate-200' : ''}>
                <div className="text-center text-xs font-extrabold text-amber-600 uppercase tracking-widest mb-2">
                  Primary / Deciduous Dentition (Pediatric)
                </div>
                {/* Upper Primary Arch */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2 px-8 text-[11px] font-bold text-amber-600/80 uppercase">
                    <span>UR Primary (Q5)</span>
                    <span className="text-amber-800 font-extrabold">UPPER PRIMARY ARCH</span>
                    <span>UL Primary (Q6)</span>
                  </div>
                  {renderToothRow(PEDIATRIC_UPPER_TEETH, true)}
                </div>

                {/* Lower Primary Arch */}
                <div className="mb-4">
                  {renderToothRow(PEDIATRIC_LOWER_TEETH, false)}
                  <div className="flex justify-between items-center mt-2 px-8 text-[11px] font-bold text-amber-600/80 uppercase">
                    <span>LR Primary (Q8)</span>
                    <span className="text-amber-800 font-extrabold">LOWER PRIMARY ARCH</span>
                    <span>LL Primary (Q7)</span>
                  </div>
                </div>
              </div>
            )}

            {/* LEGEND FOOTER */}
            <div className="mt-8 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">Condition Legend</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                {Object.entries(CONDITIONS).map(([key, val]) => (
                  <div key={key} className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                    <span className="w-3 h-3 rounded-full border border-slate-300 shadow-2xs" style={{ backgroundColor: val.color }} />
                    <span>{val.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* TOOTH DETAIL & PERIODONTAL PANEL */}
        <div className="lg:w-[32%] bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col overflow-hidden print:hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h2 className="font-extrabold text-slate-800 text-sm">Tooth Inspection & Periodontal</h2>
            {selectedTooth && (
              <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                Tooth #{selectedTooth}
              </span>
            )}
          </div>
          
          <div className="p-5 flex-grow overflow-y-auto max-h-[650px] space-y-5">
            {!selectedTooth ? (
              <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center text-slate-400 gap-3">
                <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center shadow-2xs">
                  <Stethoscope size={28} />
                </div>
                <p className="text-xs font-semibold text-slate-500">Click any tooth on the Odontogram<br/>to edit individual surfaces & notes.</p>
              </div>
            ) : (
              <div className="space-y-5">
                <div>
                  <h3 className="text-lg font-black text-slate-900">Tooth #{selectedTooth}</h3>
                  <p className="text-xs text-slate-500 font-medium">{getQuadrantName(selectedTooth)}</p>
                </div>

                {/* Missing Checkbox */}
                <label className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={toothData[selectedTooth]?.missing || false}
                    onChange={(e) => updateTooth(selectedTooth, { missing: e.target.checked })}
                    className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500"
                    disabled={!canEdit}
                  />
                  <span className="font-bold text-slate-800 text-xs">Mark Tooth as Missing / Extracted</span>
                </label>

                {!toothData[selectedTooth]?.missing && (
                  <div className="space-y-5">
                    {/* Overall Condition */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Overall Condition</label>
                      <select
                        disabled={!canEdit}
                        value={toothData[selectedTooth]?.condition || 'Healthy'}
                        onChange={(e) => updateTooth(selectedTooth, { condition: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-xs font-semibold"
                      >
                        {Object.keys(CONDITIONS).map(c => (
                          <option key={c} value={c}>{CONDITIONS[c].label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Surface Conditions */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700">Individual Surfaces</label>
                        <button
                          type="button"
                          disabled={!canEdit}
                          onClick={applyActiveToolToAllSurfaces}
                          className="text-[11px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-200 cursor-pointer"
                        >
                          Apply Active Tool ({activeTool})
                        </button>
                      </div>
                      
                      {['B', 'M', 'O', 'D', 'L'].map(surfaceKey => {
                        const surfaceNames = { B: 'Buccal', M: 'Mesial', O: 'Occlusal/Incisal', D: 'Distal', L: 'Lingual' };
                        const currCond = toothData[selectedTooth]?.surfaces?.[surfaceKey] || 'Healthy';
                        return (
                          <div key={surfaceKey} className="flex items-center gap-2">
                            <div className="w-6 text-xs font-bold text-slate-500">{surfaceKey}</div>
                            <span className="w-3 h-3 rounded-full border border-slate-300" style={{ backgroundColor: CONDITIONS[currCond]?.color || '#f8fafc' }} />
                            <select
                              disabled={!canEdit}
                              value={currCond}
                              onChange={(e) => {
                                const newSurfaces = { ...(toothData[selectedTooth]?.surfaces || {}), [surfaceKey]: e.target.value };
                                updateTooth(selectedTooth, { surfaces: newSurfaces });
                              }}
                              className="flex-1 text-xs font-semibold px-2 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500"
                            >
                              {Object.keys(CONDITIONS).map(c => (
                                <option key={c} value={c}>{surfaceNames[surfaceKey]} ({CONDITIONS[c].label})</option>
                              ))}
                            </select>
                          </div>
                        )
                      })}
                    </div>

                    {/* Periodontal Probing & Mobility */}
                    <div className="pt-3 border-t border-slate-100 space-y-3">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Activity size={14} className="text-rose-500" />
                        Periodontal Assessment
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-semibold text-slate-500">Mobility Grade</label>
                          <select
                            disabled={!canEdit}
                            value={toothData[selectedTooth]?.mobility || 0}
                            onChange={(e) => updateTooth(selectedTooth, { mobility: parseInt(e.target.value, 10) })}
                            className="w-full text-xs font-semibold px-2 py-1.5 border border-slate-200 rounded-lg"
                          >
                            <option value={0}>Normal (0)</option>
                            <option value={1}>Grade I (&lt;1mm)</option>
                            <option value={2}>Grade II (1-2mm)</option>
                            <option value={3}>Grade III (&gt;2mm)</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-slate-500">Probing Depth (Buccal)</label>
                          <input
                            type="number"
                            min="1"
                            max="12"
                            value={toothData[selectedTooth]?.probingDepth?.B || 2}
                            onChange={(e) => {
                              const newPD = { ...(toothData[selectedTooth]?.probingDepth || { B: 2, L: 2 }), B: parseInt(e.target.value, 10) };
                              updateTooth(selectedTooth, { probingDepth: newPD });
                            }}
                            className="w-full text-xs font-semibold px-2 py-1.5 border border-slate-200 rounded-lg"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Specific Tooth Notes</label>
                      <textarea
                        disabled={!canEdit}
                        value={toothData[selectedTooth]?.notes || ''}
                        onChange={(e) => updateTooth(selectedTooth, { notes: e.target.value })}
                        rows={2}
                        placeholder="Tooth-specific findings..."
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-xs font-medium resize-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* TREATMENT PLAN BUILDER */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4 print:mt-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Activity size={18} className="text-rose-600" />
            <h2 className="font-extrabold text-slate-900 text-sm">Treatment Plan & Procedure Items</h2>
          </div>
          <span className="text-xs font-bold text-slate-500">
            Total Items: <strong>{treatmentPlan.length}</strong>
          </span>
        </div>

        {/* Add Procedure Form */}
        <form onSubmit={handleAddProcedure} className="grid grid-cols-1 sm:grid-cols-6 gap-3 items-end print:hidden">
          <div>
            <label className="text-[11px] font-bold text-slate-600">Tooth #</label>
            <input
              type="text"
              value={newProcTooth}
              onChange={(e) => setNewProcTooth(e.target.value)}
              placeholder={selectedTooth ? `#${selectedTooth}` : 'e.g. #16'}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold"
            />
          </div>

          <div className="sm:col-span-3 relative">
            <label className="text-[11px] font-bold text-slate-600">Procedure Name</label>
            <input
              type="text"
              list="dental-procedure-suggestions"
              value={newProcName}
              onChange={(e) => setNewProcName(e.target.value)}
              placeholder="Select or type procedure..."
              className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold"
            />
            <datalist id="dental-procedure-suggestions">
              {COMMON_DENTAL_PROCEDURES.map((proc, idx) => (
                <option key={idx} value={proc} />
              ))}
            </datalist>

            {/* Non-imposing Lumina Smart Suggestion (hides as soon as procedure is typed/selected) */}
            {!newProcName.trim() && luminaSuggestedProcedure && (
              <div className="mt-1 flex items-center gap-1.5 text-[11px] text-purple-700 bg-purple-50/80 px-2 py-0.5 rounded-lg border border-purple-100 font-medium">
                <span className="font-bold text-[10px] uppercase tracking-wider text-purple-600">Suggestion:</span>
                <button
                  type="button"
                  onClick={() => setNewProcName(luminaSuggestedProcedure)}
                  className="text-purple-800 font-semibold hover:underline cursor-pointer text-left truncate max-w-full"
                  title="Click to apply suggested procedure"
                >
                  {luminaSuggestedProcedure}
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-600">Status</label>
            <select
              value={newProcStatus}
              onChange={(e) => setNewProcStatus(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold"
            >
              <option value="Planned">Planned</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          <div>
            <button
              type="submit"
              disabled={!canEdit}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-rose-600 text-white rounded-xl hover:bg-rose-700 disabled:opacity-50 text-xs font-bold transition-all shadow-xs"
            >
              <Plus size={14} />
              <span>Add Item</span>
            </button>
          </div>
        </form>

        {/* Treatment Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 bg-slate-50">
                <th className="px-4 py-2.5">Tooth</th>
                <th className="px-4 py-2.5">Procedure</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5 text-right print:hidden">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {treatmentPlan.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-4 py-6 text-center text-slate-400 font-medium">
                    No procedures added to treatment plan yet.
                  </td>
                </tr>
              ) : (
                treatmentPlan.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 font-semibold text-slate-800">
                    <td className="px-4 py-2.5 font-bold text-rose-600">{item.tooth}</td>
                    <td className="px-4 py-2.5">{item.procedure}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                        item.status === 'Completed' 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : item.status === 'In Progress' 
                          ? 'bg-amber-100 text-amber-900' 
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right space-x-1 print:hidden">
                      <button
                        type="button"
                        onClick={() => handleToggleProcStatus(item.id)}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold"
                      >
                        Toggle Status
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveProcedure(item.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-lg"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* GENERAL NOTES */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">General Chart & Clinical Notes</label>
          <button
            type="button"
            onClick={handleGenerateAiNote}
            disabled={isGeneratingAiNote || !canEdit}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 text-xs font-bold transition-all shadow-xs cursor-pointer print:hidden"
          >
            {isGeneratingAiNote && <Loader2 size={14} className="animate-spin" />}
            <span>Generate with Lumina</span>
          </button>
        </div>
        <textarea
          disabled={!canEdit}
          value={generalNotes}
          onChange={(e) => setGeneralNotes(e.target.value)}
          rows={6}
          placeholder=""
          className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-xs font-medium resize-y font-mono"
        />
      </div>

      {/* CHART HISTORY */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden print:hidden">
        <button 
          onClick={() => setIsHistoryOpen(!isHistoryOpen)}
          className="w-full flex items-center justify-between p-5 bg-slate-50 hover:bg-slate-100/80 transition-colors"
        >
          <div className="flex items-center gap-2">
            <h2 className="font-extrabold text-slate-800 text-sm">Historical Chart Records</h2>
            <span className="bg-rose-100 text-rose-700 text-xs py-0.5 px-2 rounded-full font-bold">
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
              className="overflow-hidden border-t border-slate-200"
            >
              <div className="p-5">
                {history.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-4">No prior charts found for this patient.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                          <th className="px-4 py-2.5">Date</th>
                          <th className="px-4 py-2.5">Provider</th>
                          <th className="px-4 py-2.5">Notes Preview</th>
                          <th className="px-4 py-2.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs font-semibold">
                        {history.map((chart) => (
                          <tr key={chart.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-2.5 text-slate-900 font-bold">{chart.chart_date}</td>
                            <td className="px-4 py-2.5 text-slate-600">{chart.provider || '—'}</td>
                            <td className="px-4 py-2.5 text-slate-500 truncate max-w-[300px]">{chart.general_notes || '—'}</td>
                            <td className="px-4 py-2.5 text-right space-x-2">
                              <button
                                onClick={() => loadSpecificChart(chart.id)}
                                className="inline-flex items-center justify-center p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                title="Load Chart"
                              >
                                <Download size={15} />
                              </button>
                              <button
                                disabled={!canEdit}
                                onClick={() => handleDeleteChart(chart.id)}
                                className="inline-flex items-center justify-center p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-30"
                                title="Delete Chart"
                              >
                                <Trash2 size={15} />
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

      <LuminaDentalAiPrescriber
        isOpen={showAiPrescriber}
        onClose={() => setShowAiPrescriber(false)}
        patientName={patientName}
      />
    </div>
  );
}
