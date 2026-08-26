import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  FlaskConical, ClipboardList, Activity, Search, Plus, CheckCircle, 
  Save, Barcode, Play, Clock, ShieldCheck, RefreshCw, Printer, 
  Send, Droplet, FileText, CheckCircle2, ArrowRight, Thermometer,
  AlertTriangle, XCircle, CheckCircle as CheckCircleIcon, TrendingUp,
  ChevronDown, Pencil, Trash2, X, AlertOctagon, Shield,
  ListChecks, BarChart2, FilePlus2
} from 'lucide-react';
import api from '../../api/axios';
import { toast } from 'react-hot-toast';

// ── TUBE TYPES CONFIG (CLSI H3-A6 Order of Draw Sequence) ────────────────────
const TUBE_TYPES = [
  { id: 'Blue Citrate', name: 'Sodium Citrate (Light Blue Top)', drawOrder: 1, desc: 'Coagulation Studies (PT, APTT, D-Dimer)' },
  { id: 'Redtop', name: 'Plain Clot Activator (Red Top)', drawOrder: 2, desc: 'Serology, Immunohematology, Blood Bank Crossmatch' },
  { id: 'SST Gold Gel', name: 'SST Gel Separator (Gold Top)', drawOrder: 3, desc: 'Clinical Chemistry, LFT, RFT, Electrolytes' },
  { id: 'Green Heparin', name: 'Lithium Heparin (Green Top)', drawOrder: 4, desc: 'STAT Plasma Chemistry & Electrolytes' },
  { id: 'Purple EDTA', name: 'EDTA K2/K3 (Purple Top)', drawOrder: 5, desc: 'Full Blood Count (FBC/CBC), ESR, HbA1c' },
  { id: 'Grey Fluoride', name: 'Sodium Fluoride (Grey Top)', drawOrder: 6, desc: 'Fasting Blood Glucose, Lactate' },
  { id: 'NIPT Tube', name: 'Cell-Free DNA BCT (NIPT Specimen)', drawOrder: 7, desc: 'Non-Invasive Prenatal Testing & Genomic cfDNA' },
  { id: 'Yellow Urine Cup', name: 'Sterile Urine Container (Yellow Top)', drawOrder: 8, desc: 'Urinalysis, Urine Chemistry & Microscopy' },
];

// ── TEST ASSAYS CONFIG ───────────────────────────────────────────────────────
const TEST_ASSAYS = [
  {
    id: 'Full Blood Count (FBC/CBC)',
    name: 'Full Blood Count (FBC/CBC)',
    category: 'Hematology',
    defaultTube: 'Purple EDTA',
    defaultSpecimen: 'Venous Blood',
    focus: 'Hematological profiling of red cells, white cells, platelets, and hemoglobin.',
    pathologies: 'Anemia, Infections, Leukemia, Thrombocytopenia.',
    essayPoints: [
      'Cell Count Parameters: Flow cytometry & impedance measurement of RBC, WBC differential, and PLT.',
      'Anticoagulant Dynamics: EDTA K2/K3 prevents clotting by chelating ionized calcium while preserving cellular morphology.'
    ]
  },
  {
    id: 'Liver Function Test (LFT)',
    name: 'Liver Function Test (LFT)',
    category: 'Biochemistry',
    defaultTube: 'SST Gold Gel',
    defaultSpecimen: 'Venous Blood',
    focus: 'Hepatic parenchyma integrity, biliary excretion, and synthetic capacity.',
    pathologies: 'Hepatitis, Cirrhosis, Jaundice, Cholecystitis.',
    essayPoints: [
      'Enzymatic & Synthetic Panel: Transaminases (ALT/AST), Alkaline Phosphatase (ALP), Total/Direct Bilirubin, and Serum Albumin.',
      'Gel Barrier Dynamics: SST gel separates serum from clot upon centrifugation to prevent hemolysis artifacts.'
    ]
  },
  {
    id: 'Renal & Electrolytes (RFT)',
    name: 'Renal & Electrolytes (RFT)',
    category: 'Biochemistry',
    defaultTube: 'SST Gold Gel',
    defaultSpecimen: 'Venous Blood',
    focus: 'Glomerular filtration rate, electrolyte balance, and renal clearance.',
    pathologies: 'Acute Kidney Injury (AKI), Chronic Kidney Disease (CKD), Dehydration.',
    essayPoints: [
      'Clearance Indicators: Serum Creatinine, Blood Urea Nitrogen (BUN), Na+, K+, Cl-, and eGFR calculations.',
      'Pre-analytical Stability: Prompt serum separation required to prevent intracellular potassium leakage.'
    ]
  },
  {
    id: 'Cardiac Troponin I (STAT)',
    name: 'Cardiac Troponin I (STAT)',
    category: 'Cardiac Triage',
    defaultTube: 'Green Heparin',
    defaultSpecimen: 'Plasma / Whole Blood',
    focus: 'High-sensitivity myocardial necrosis biomarker for emergency chest pain triage.',
    pathologies: 'Acute Myocardial Infarction (AMI), Acute Coronary Syndrome (ACS).',
    essayPoints: [
      'STAT Processing Dynamics: Lithium Heparin plasma allows immediate centrifugation without waiting for clot formation.',
      'Diagnostic Sensitivity: Serial troponin testing at 0h, 3h, 6h detects subtle ischemic myocardial injury.'
    ]
  },
  {
    id: 'Urine Analysis (Urinalysis)',
    name: 'Urine Analysis (Urinalysis)',
    category: 'Nephrology & Urology',
    defaultTube: 'Yellow Urine Cup',
    defaultSpecimen: 'Clean-catch Midstream Urine',
    focus: 'Fluid biopsy of the kidney assessing physical properties, chemical composition, and microscopic sediment.',
    pathologies: 'Urinary Tract Infections (UTIs), Nephrotic/Nephritic Syndrome, Diabetes Mellitus, and Nephrolithiasis (Kidney Stones).',
    essayPoints: [
      'The Three-Part Examination: Physical parameters (color, clarity, specific gravity), chemical dipstick indicators (nitrites, leukocyte esterase, glucose, protein), and microscopic sediment (casts, crystals, epithelial cells, dysmorphic RBCs).',
      'Pre-analytical Dynamics: Clean-catch midstream collection methods essential to avoid bacterial contamination from normal skin flora.'
    ]
  },
  {
    id: 'Stool Examination (Fecal Analysis)',
    name: 'Stool Examination (Fecal Analysis)',
    category: 'Gastroenterology & Parasitology',
    defaultTube: 'Yellow Urine Cup',
    defaultSpecimen: 'Fresh Fecal Sample',
    focus: 'Assessment of gastrointestinal function, malabsorption, occult bleeding, and colorectal health.',
    pathologies: 'Colorectal Cancer Screening, Parasitic Infestations (e.g., Giardia, Hookworms), and Inflammatory Bowel Disease (IBD).',
    essayPoints: [
      'Occult Blood Mechanisms: Comparing traditional guaiac-based FOBT (gFOBT) with highly specific Fecal Immunochemical Tests (FIT) targeting human hemoglobin.',
      'Ova & Parasites (O&P): Macroscopic inspection (consistency, mucus) coupled with raw microscopy utilizing iodine/saline wet mounts to locate motile trophozoites or static cysts.'
    ]
  },
  {
    id: 'Semen Analysis (Andrology)',
    name: 'Semen Analysis (Andrology)',
    category: 'Andrology & Reproductive Health',
    defaultTube: 'Yellow Urine Cup',
    defaultSpecimen: 'Seminal Fluid',
    focus: 'Quantifying sperm production, structural integrity, motility, and chemical composition of seminal fluid.',
    pathologies: 'Male-factor Infertility, Oligospermia, Asthenozoospermia, Teratozoospermia, and Post-Vasectomy Verification.',
    essayPoints: [
      'Strict WHO Standardization: Full laboratory compliance with WHO 6th Edition Manual Guidelines (min 4% normal morphology, progressive motility, and 15 million/mL concentration).',
      'Time & Temperature Sensitivity: Critical post-collection window where analysis must begin within 30–60 mins after liquefaction at room/body temp to prevent false reductions in viability.'
    ]
  }
];

// ── LIFECYCLE STAGES CONFIG ──────────────────────────────────────────────────
const LIFECYCLE_STAGES = [
  {
    id: 'Ordered',
    phase: 'pre-analytical',
    label: 'Order Received',
    description: 'Lab order placed by requesting clinician. Specimen request entered into the LIS.',
    actionHint: 'Confirm patient identity and verify the test request form (TRF).',
    phaseColor: '#64748b',
    phaseBg: '#f8fafc',
  },
  {
    id: 'Collected',
    phase: 'pre-analytical',
    label: 'Specimen Collected',
    description: 'Phlebotomist has drawn the specimen following CLSI H3-A6 order of draw.',
    actionHint: 'Label the tube(s) at the bedside. Record collection time and collector ID.',
    phaseColor: '#0369a1',
    phaseBg: '#eff6ff',
  },
  {
    id: 'Accessioned',
    phase: 'pre-analytical',
    label: 'Barcode Accessioned',
    description: 'Specimen received in the laboratory and barcode scanned into the LIS.',
    actionHint: 'Verify tube integrity, volume, and sample suitability. Reject haemolysed samples.',
    phaseColor: '#0891b2',
    phaseBg: '#ecfeff',
  },
  {
    id: 'Centrifuged',
    phase: 'analytical',
    label: 'Centrifuged / Pre-processed',
    description: 'Sample centrifuged at the appropriate speed and time per SOP. Aliquots prepared.',
    actionHint: 'Check serum/plasma for haemolysis, icterus, or lipemia. Document HIL index.',
    phaseColor: '#7c3aed',
    phaseBg: '#f5f3ff',
  },
  {
    id: 'Analyzing',
    phase: 'analytical',
    label: 'Analyzer Testing',
    description: 'Sample loaded onto the analyzer. QC must be within Westgard acceptance limits.',
    actionHint: 'Ensure QC passed before releasing patient results. Monitor for instrument flags.',
    phaseColor: '#b45309',
    phaseBg: '#fffbeb',
  },
  {
    id: 'Verified',
    phase: 'post-analytical',
    label: 'Results Verified',
    description: 'Medical Technologist or Clinical Scientist has reviewed and verified all results.',
    actionHint: 'Apply delta check. Flag critical values and contact the requesting clinician immediately.',
    phaseColor: '#059669',
    phaseBg: '#f0fdf4',
  },
  {
    id: 'Notified',
    phase: 'completed',
    label: 'Report Dispatched',
    description: 'Verified report released to the LIS and patient/clinician notified of results.',
    actionHint: 'Retain sample in appropriate storage as per retention SOP before disposal.',
    phaseColor: '#0f172a',
    phaseBg: '#f8fafc',
  },
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

// ── LIVE REAL-TIME TAT COUNTER COMPONENT ────────────────────────────────────
const TatCounter = ({ order }) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const startTime = useMemo(() => {
    if (order.created_at) return new Date(order.created_at).getTime();
    if (order.collected_at) return new Date(order.collected_at).getTime();
    if (order.ordered_at) return new Date(order.ordered_at).getTime();
    // Deterministic fallback based on order ID for testing/demo
    const num = parseInt(String(order.id).replace(/\D/g, '')) || 1;
    const minsAgo = (num % 32) + 6;
    return Date.now() - minsAgo * 60 * 1000;
  }, [order.id, order.created_at, order.collected_at, order.ordered_at]);

  const elapsedMs = Math.max(0, now - startTime);
  const elapsedMins = Math.floor(elapsedMs / (1000 * 60));
  const elapsedSecs = Math.floor((elapsedMs / 1000) % 60);

  // Target TAT in Minutes based on clinical criteria:
  // 1. Min In-House (STAT): 1 hour (60m)
  // 2. Max In-House (Routine): 6 hours (360m)
  // 3. Standard Outsourced: 7 Days (10,080m)
  // 4. Special Outsourced: 1 Month / 30 Days (43,200m)
  const targetMins = useMemo(() => {
    const u = (order.urgency || '').toLowerCase();
    const t = (order.processing_type || order.test_type || '').toLowerCase();
    if (u.includes('special') || t.includes('special') || u.includes('1 month') || u.includes('month')) return 43200; // 30 days
    if (u.includes('outsourced') || t.includes('outsourced') || u.includes('7 day') || u.includes('7d')) return 10080; // 7 days
    if (u.includes('stat') || u.includes('1h') || u.includes('min in-house')) return 60; // 1 hour
    return 360; // Default In-House Routine: 6 hours
  }, [order.urgency, order.processing_type, order.test_type]);

  const remainingMins = targetMins - elapsedMins;

  // Format Elapsed Time String
  const formattedElapsed = useMemo(() => {
    if (elapsedMins >= 1440) {
      const days = Math.floor(elapsedMins / 1440);
      const hrs = Math.floor((elapsedMins % 1440) / 60);
      return `${days}d ${hrs}h`;
    }
    if (elapsedMins >= 60) {
      const hrs = Math.floor(elapsedMins / 60);
      const mins = elapsedMins % 60;
      return `${hrs}h ${mins}m ${elapsedSecs < 10 ? '0' : ''}${elapsedSecs}s`;
    }
    return `${elapsedMins}m ${elapsedSecs < 10 ? '0' : ''}${elapsedSecs}s`;
  }, [elapsedMins, elapsedSecs]);

  // Target Badge Label
  const targetLabel = useMemo(() => {
    if (targetMins === 60) return '1h Target';
    if (targetMins === 360) return '6h Target';
    if (targetMins === 10080) return '7d Target';
    if (targetMins === 43200) return '1m Target';
    return `${Math.round(targetMins / 60)}h Target`;
  }, [targetMins]);

  let badgeStyle = '';
  let statusText = '';

  if (remainingMins < 0) {
    const overdueMins = Math.abs(remainingMins);
    const overdueStr = overdueMins >= 1440 
      ? `+${Math.floor(overdueMins / 1440)}d` 
      : overdueMins >= 60 ? `+${Math.floor(overdueMins / 60)}h` : `+${overdueMins}m`;
    badgeStyle = 'bg-rose-100 text-rose-800 border-rose-300 font-extrabold animate-pulse';
    statusText = `Overdue (${overdueStr})`;
  } else if (
    (targetMins <= 60 && remainingMins <= 15) ||
    (targetMins <= 360 && remainingMins <= 60) ||
    (targetMins > 360 && remainingMins <= 1440)
  ) {
    const remStr = remainingMins >= 1440 
      ? `${Math.floor(remainingMins / 1440)}d left` 
      : remainingMins >= 60 ? `${Math.floor(remainingMins / 60)}h left` : `${remainingMins}m left`;
    badgeStyle = 'bg-amber-100 text-amber-800 border-amber-300 font-bold';
    statusText = remStr;
  } else {
    badgeStyle = 'bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold';
    statusText = `On Track (${targetLabel})`;
  }

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1 font-mono text-xs font-bold text-slate-800">
        <Clock size={11} className={remainingMins < 0 ? 'text-rose-600 animate-spin' : 'text-slate-400'} />
        <span>{formattedElapsed}</span>
      </div>
      <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider border w-fit ${badgeStyle}`}>
        {statusText}
      </span>
    </div>
  );
};

const LabHub = () => {
  const [activeTab, setActiveTab] = useState('worklist'); // 'worklist', 'draw_order', 'analyzers', 'qc', 'ncr'

  // ── NCR STATE ──────────────────────────────────────────────────────────────
  const [ncrList, setNcrList] = useState([]);
  const [ncrKpi, setNcrKpi] = useState({ totalThisMonth: 0, closedThisMonth: 0, pctCompleted: 0, openCount: 0, inProgressCount: 0, overdueCount: 0, totalAllTime: 0 });
  const [ncrLoading, setNcrLoading] = useState(false);
  const [ncrView, setNcrView] = useState('list'); // 'list' | 'new' | 'edit'
  const [ncrSelected, setNcrSelected] = useState(null);
  const [ncrStatusFilter, setNcrStatusFilter] = useState('all');
  const [ncrSearch, setNcrSearch] = useState('');
  const [ncrSubmitting, setNcrSubmitting] = useState(false);

  // NCR Form state (mirrors paper form)
  const NCR_BLANK = {
    occurred_at: new Date().toISOString().slice(0, 16),
    recorded_by: '',
    unit: 'Hematology',
    nc_category: 'Pre-analytical',
    description: '',
    rca_method: [],
    rca_results: '',
    immediate_action: '',
    significance: 'minor',
    extent: '',
    assigned_to_name: '',
    assigned_to_position: 'Head Manager',
    corrective_actions: '',
    target_completion: '',
    monitoring_notes: '',
    staff_name: '',
    reviewed_by_qm: '',
    verified_by_lab_manager: '',
    status: 'open',
  };
  const [ncrForm, setNcrForm] = useState({ ...NCR_BLANK });
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

  // ── STORAGE UNIT & TAT MANAGEMENT ──
  const availableStorageUnits = useMemo(() => {
    try {
      const raw = localStorage.getItem('lc_storage_units_config');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [
      { id: 'fridge_1',  label: 'Fridge 1 (STAT / Rapid Storage)',  type: 'fridge' },
      { id: 'fridge_2',  label: 'Fridge 2 (Routine Samples - 6h)',  type: 'fridge' },
      { id: 'fridge_3',  label: 'Fridge 3 (Reagents & Media)',      type: 'fridge' },
      { id: 'fridge_4',  label: 'Fridge 4 (Chemistry Stock)',       type: 'fridge' },
      { id: 'fridge_5',  label: 'Fridge 5 (Hematology Stock)',       type: 'fridge' },
      { id: 'fridge_6',  label: 'Fridge 6 (Microbiology)',          type: 'fridge' },
      { id: 'fridge_7',  label: 'Fridge 7 (Molecular Storage)',     type: 'fridge' },
      { id: 'fridge_8',  label: 'Fridge 8 (General Stock)',          type: 'fridge' },
      { id: 'freezer_1', label: 'Freezer 1 (-20°C / -80°C Sample Bank)', type: 'freezer' }
    ];
  }, []);

  const [storageAssignments, setStorageAssignments] = useState(() => {
    try {
      const rawGlobal = localStorage.getItem('lc_storage_assignments');
      const rawLab = localStorage.getItem('lc_lab_specimen_storage');
      const g = rawGlobal ? JSON.parse(rawGlobal) : {};
      const l = rawLab ? JSON.parse(rawLab) : {};
      return { ...g, ...l };
    } catch { return {}; }
  });

  const [storageRacks, setStorageRacks] = useState(() => {
    try {
      const raw = localStorage.getItem('lc_lab_specimen_racks');
      if (raw) return JSON.parse(raw);
    } catch {}
    return {};
  });

  const [storageBoxes, setStorageBoxes] = useState(() => {
    try {
      const raw = localStorage.getItem('lc_lab_specimen_boxes');
      if (raw) return JSON.parse(raw);
    } catch {}
    return {};
  });

  const [selectedRegStorageUnit, setSelectedRegStorageUnit] = useState('');

  const getRecommendedStorageUnit = (order) => {
    if (!order) return 'fridge_1';
    const u = (order.urgency || '').toLowerCase();
    if (u.includes('special') || u.includes('1 month')) return 'freezer_1';
    if (u.includes('outsourced') || u.includes('7 day')) return 'freezer_1';
    if (u.includes('stat') || u.includes('1h')) return 'fridge_1';
    return 'fridge_2'; // Default In-House Routine 6h
  };

  const getStorageRecommendationText = (order) => {
    if (!order) return '';
    const u = (order.urgency || '').toLowerCase();
    if (u.includes('special') || u.includes('1 month')) {
      return 'Freezer 1 (-80°C Biobank) — Required for 1-Month Special Outsourced Samples.';
    }
    if (u.includes('outsourced') || u.includes('7 day')) {
      return 'Freezer 1 (-20°C Sample Bank) — Required for 7-Day Standard Outsourced Samples.';
    }
    if (u.includes('stat') || u.includes('1h')) {
      return 'Fridge 1 (STAT Rapid Storage - 4°C) — Required for 1-Hour Urgent In-House Samples.';
    }
    return 'Fridge 2 (Routine Samples - 4°C) — Recommended for 6-Hour In-House Routine Samples.';
  };

  const getUnitLabel = (unitId) => {
    const found = availableStorageUnits.find(u => u.id === unitId);
    return found ? found.label : (unitId || 'Fridge 1');
  };

  const handleAssignOrderStorage = (orderId, unitId) => {
    const orderKey = String(orderId);
    const nextLab = { ...storageAssignments, [orderKey]: unitId };
    setStorageAssignments(nextLab);
    try {
      localStorage.setItem('lc_lab_specimen_storage', JSON.stringify(nextLab));
      const rawGlobal = localStorage.getItem('lc_storage_assignments');
      const globalObj = rawGlobal ? JSON.parse(rawGlobal) : {};
      globalObj[orderKey] = unitId;
      localStorage.setItem('lc_storage_assignments', JSON.stringify(globalObj));

      const rawMap = localStorage.getItem('lc_lab_specimens_map');
      const specMap = rawMap ? JSON.parse(rawMap) : {};
      const targetOrder = orders.find(o => String(o.id) === orderKey) || selectedOrder;
      if (targetOrder) {
        specMap[orderKey] = {
          id: orderKey,
          patient_name: targetOrder.patient_name,
          patient_id: targetOrder.patient_id,
          accession_number: targetOrder.accession_number,
          specimen_barcode: targetOrder.specimen_barcode,
          specimen_type: targetOrder.specimen_type,
          tube_type: targetOrder.tube_type,
          urgency: targetOrder.urgency,
          test_name: targetOrder.test_name,
          unitId: unitId
        };
        localStorage.setItem('lc_lab_specimens_map', JSON.stringify(specMap));
      }
    } catch (err) {
      console.error('Error saving specimen storage:', err);
    }
  };

  // Sync orders with localStorage storage assignment maps
  const syncOrderStorage = (ordersList) => {
    try {
      const rawGlobal = localStorage.getItem('lc_storage_assignments');
      const rawLab = localStorage.getItem('lc_lab_specimen_storage');
      const rawMap = localStorage.getItem('lc_lab_specimens_map');
      
      const globalObj = rawGlobal ? JSON.parse(rawGlobal) : {};
      const labObj = rawLab ? JSON.parse(rawLab) : {};
      const specMap = rawMap ? JSON.parse(rawMap) : {};

      ordersList.forEach(order => {
        const orderKey = String(order.id);
        const assignedUnit = labObj[orderKey] || globalObj[orderKey] || getRecommendedStorageUnit(order);
        
        labObj[orderKey] = assignedUnit;
        globalObj[orderKey] = assignedUnit;
        if (order.accession_number) {
          globalObj[order.accession_number] = assignedUnit;
        }

        specMap[orderKey] = {
          id: orderKey,
          patient_name: order.patient_name,
          patient_id: order.patient_id,
          accession_number: order.accession_number,
          specimen_barcode: order.specimen_barcode,
          specimen_type: order.specimen_type,
          tube_type: order.tube_type,
          urgency: order.urgency,
          test_name: order.test_name,
          unitId: assignedUnit
        };
      });

      localStorage.setItem('lc_lab_specimen_storage', JSON.stringify(labObj));
      localStorage.setItem('lc_storage_assignments', JSON.stringify(globalObj));
      localStorage.setItem('lc_lab_specimens_map', JSON.stringify(specMap));
      setStorageAssignments({ ...globalObj, ...labObj });
    } catch (err) {
      console.error('Error syncing order storage:', err);
    }
  };

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

  // Default initial specimen orders fallback
  const DEFAULT_LAB_ORDERS = useMemo(() => [
    {
      id: 'ord-101',
      accession_number: 'ACC-2026-0801',
      patient_id: 'PID-98421',
      patient_name: 'Sarah Jenkins',
      patient_age: '34',
      patient_gender: 'Female',
      test_name: 'Full Blood Count (FBC)',
      specimen_type: 'Venous Blood',
      tube_type: 'Purple EDTA',
      urgency: 'In-House STAT (1h)',
      stage: 'Sample Collected',
      phase: 'pre-analytical',
      specimen_barcode: 'BAR-847291',
      created_at: new Date(Date.now() - 25 * 60000).toISOString()
    },
    {
      id: 'ord-102',
      accession_number: 'ACC-2026-0802',
      patient_id: 'PID-73019',
      patient_name: 'Robert Chen',
      patient_age: '52',
      patient_gender: 'Male',
      test_name: 'Urine Analysis (Urinalysis)',
      specimen_type: 'Midstream Urine',
      tube_type: 'Yellow Urine Cup',
      urgency: 'In-House Routine (6h)',
      stage: 'In Analysis',
      phase: 'analytical',
      specimen_barcode: 'BAR-910248',
      created_at: new Date(Date.now() - 140 * 60000).toISOString()
    },
    {
      id: 'ord-103',
      accession_number: 'ACC-2026-0803',
      patient_id: 'PID-54120',
      patient_name: 'Amanda Taylor',
      patient_age: '29',
      patient_gender: 'Female',
      test_name: 'NIPT Chromosomal Screen',
      specimen_type: 'Whole Blood',
      tube_type: 'NIPT Tube',
      urgency: 'Outsourced Reference Lab (7 Days)',
      stage: 'Order Placed',
      phase: 'pre-analytical',
      specimen_barcode: 'BAR-338291',
      created_at: new Date(Date.now() - 3600 * 60000).toISOString()
    },
    {
      id: 'ord-104',
      accession_number: 'ACC-2026-0804',
      patient_id: 'PID-11930',
      patient_name: 'David Miller',
      patient_age: '61',
      patient_gender: 'Male',
      test_name: 'Stool Examination (Fecal Analysis)',
      specimen_type: 'Stool Sample',
      tube_type: 'Redtop',
      urgency: 'In-House Routine (6h)',
      stage: 'Sample Collected',
      phase: 'pre-analytical',
      specimen_barcode: 'BAR-771204',
      created_at: new Date(Date.now() - 45 * 60000).toISOString()
    }
  ], []);

  // Fetch Orders with seamless local fallback
  const fetchOrders = async () => {
    setLoading(true);
    let loadedOrders = [];
    try {
      const res = await api.get('/lab/orders');
      if (res.data?.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
        loadedOrders = res.data.data;
      }
    } catch (err) {
      console.warn('Lab orders API endpoint unavailable, loading local specimen orders store:', err);
    }

    if (!loadedOrders || loadedOrders.length === 0) {
      try {
        const rawStored = localStorage.getItem('lc_lab_registered_orders');
        if (rawStored) {
          const parsed = JSON.parse(rawStored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            loadedOrders = parsed;
          }
        }
      } catch {}
    }

    if (!loadedOrders || loadedOrders.length === 0) {
      loadedOrders = DEFAULT_LAB_ORDERS;
    }

    setOrders(loadedOrders);
    syncOrderStorage(loadedOrders);
    try { localStorage.setItem('lc_lab_registered_orders', JSON.stringify(loadedOrders)); } catch {}
    setLoading(false);
  };

  // Fetch Quality Control Logs
  const fetchQCLogs = async () => {
    try {
      const res = await api.get('/lab/qc-logs');
      if (res.data?.success) {
        setQcLogs(res.data.data || []);
      }
    } catch (err) {
      console.warn('QC logs fetch failed:', err);
    }
  };

  // NCR fetch
  const fetchNCRs = async () => {
    setNcrLoading(true);
    try {
      const res = await api.get('/lab/ncr');
      if (res.data?.success) {
        setNcrList(res.data.data || []);
        setNcrKpi(res.data.kpi || {});
      }
    } catch (err) {
      console.warn('NCR fetch failed:', err);
    } finally {
      setNcrLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchQCLogs();
    fetchNCRs();
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Details for Selected Order
  const handleSelectOrder = async (order) => {
    setSelectedOrder(order);
    try {
      const res = await api.get(`/lab/orders/${order.id}`);
      if (res.data?.success) {
        setResultParams(res.data.data.results || []);
        setPriorResults(res.data.data.prior_results || []);
        return;
      }
    } catch (err) {
      console.warn('Order details fetch failed, presenting local order parameters:', err);
    }
    // Fallback parameters
    setResultParams([
      { id: 1, parameter_name: 'Hemoglobin (Hb)', parameter_value: '14.2', reference_range: '13.0 - 17.5', unit: 'g/dL', is_abnormal: 0 },
      { id: 2, parameter_name: 'White Blood Cell (WBC)', parameter_value: '6.8', reference_range: '4.5 - 11.0', unit: '10^3/uL', is_abnormal: 0 },
      { id: 3, parameter_name: 'Platelet Count', parameter_value: '240', reference_range: '150 - 450', unit: '10^3/uL', is_abnormal: 0 }
    ]);
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

    const accessionNumber = `ACC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    let createdOrder = null;

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
        createdOrder = res.data.data;
      }
    } catch (err) {
      console.warn('Backend register endpoint error, creating order in local store:', err);
    }

    if (!createdOrder) {
      createdOrder = {
        id: `ord-${Date.now()}`,
        accession_number: accessionNumber,
        patient_id: patientId,
        patient_name: patientName,
        patient_age: patientAge,
        patient_gender: patientGender,
        referring_provider: refProvider || 'Dr. Sarah Connor',
        specimen_type: specimenType,
        specimen_barcode: barcode,
        tube_type: tubeType,
        test_name: testName,
        urgency: urgency,
        stage: 'Sample Collected',
        phase: 'pre-analytical',
        created_at: new Date().toISOString()
      };
    }

    const updatedOrders = [createdOrder, ...orders.filter(o => o.id !== createdOrder.id)];
    setOrders(updatedOrders);
    try { localStorage.setItem('lc_lab_registered_orders', JSON.stringify(updatedOrders)); } catch {}

    const targetUnit = selectedRegStorageUnit || getRecommendedStorageUnit(createdOrder);
    handleAssignOrderStorage(createdOrder.id, targetUnit);
    if (createdOrder.accession_number) {
      handleAssignOrderStorage(createdOrder.accession_number, targetUnit);
    }

    toast.success(`Specimen Accession No: ${createdOrder.accession_number} registered & stored in ${getUnitLabel(targetUnit)}.`);
    setShowRegModal(false);
    setPatientId('');
    setPatientName('');
    setPatientAge('');
    setBarcode('');
    setNotes('');
  };

  // Transition Order Stage
  const handleUpdateStage = async (orderId, newStage, hilIndex = 'Normal') => {
    try {
      await api.put(`/lab/orders/${orderId}/stage`, { stage: newStage, hil_index: hilIndex });
    } catch (err) {
      console.warn('Stage update API error, updating local order stage:', err);
    }
    const updated = orders.map(o => o.id === orderId ? { ...o, stage: newStage } : o);
    setOrders(updated);
    try { localStorage.setItem('lc_lab_registered_orders', JSON.stringify(updated)); } catch {}
    if (selectedOrder?.id === orderId) {
      setSelectedOrder(prev => ({ ...prev, stage: newStage }));
    }
    toast.success(`Stage updated: ${newStage}`);
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

  // ── NCR Handlers ────────────────────────────────────────────────────────────
  const handleNCRFieldChange = (field, value) => {
    setNcrForm(prev => ({ ...prev, [field]: value }));
  };

  const handleNCRRcaToggle = (method) => {
    setNcrForm(prev => {
      const current = Array.isArray(prev.rca_method) ? prev.rca_method : [];
      return {
        ...prev,
        rca_method: current.includes(method)
          ? current.filter(m => m !== method)
          : [...current, method]
      };
    });
  };

  const handleNCRSubmit = async (e) => {
    e.preventDefault();
    setNcrSubmitting(true);
    try {
      const payload = {
        ...ncrForm,
        rca_method: Array.isArray(ncrForm.rca_method) ? ncrForm.rca_method.join(', ') : ncrForm.rca_method,
      };
      if (ncrView === 'edit' && ncrSelected?.id) {
        await api.put(`/lab/ncr/${ncrSelected.id}`, payload);
        toast.success('NCR updated successfully.');
      } else {
        const res = await api.post('/lab/ncr', payload);
        toast.success(`${res.data.ncr_number} created successfully.`);
      }
      await fetchNCRs();
      setNcrView('list');
      setNcrSelected(null);
      setNcrForm({ ...NCR_BLANK });
    } catch (err) {
      console.error(err);
      toast.error('Failed to save NCR.');
    } finally {
      setNcrSubmitting(false);
    }
  };

  const handleNCREdit = (ncr) => {
    setNcrSelected(ncr);
    setNcrForm({
      occurred_at: ncr.occurred_at || new Date().toISOString().slice(0, 16),
      recorded_by: ncr.recorded_by || '',
      unit: ncr.unit || 'Hematology',
      nc_category: ncr.nc_category || 'Pre-analytical',
      description: ncr.description || '',
      rca_method: ncr.rca_method ? ncr.rca_method.split(', ').filter(Boolean) : [],
      rca_results: ncr.rca_results || '',
      immediate_action: ncr.immediate_action || '',
      significance: ncr.significance || 'minor',
      extent: ncr.extent || '',
      assigned_to_name: ncr.assigned_to_name || '',
      assigned_to_position: ncr.assigned_to_position || 'Head Manager',
      corrective_actions: ncr.corrective_actions || '',
      target_completion: ncr.target_completion || '',
      monitoring_notes: ncr.monitoring_notes || '',
      staff_name: ncr.staff_name || '',
      reviewed_by_qm: ncr.reviewed_by_qm || '',
      verified_by_lab_manager: ncr.verified_by_lab_manager || '',
      status: ncr.status || 'open',
    });
    setNcrView('edit');
  };

  const handleNCRDelete = async (id, ncrNumber) => {
    if (!window.confirm(`Permanently delete NCR ${ncrNumber}? This cannot be undone.`)) return;
    try {
      await api.delete(`/lab/ncr/${id}`);
      toast.success(`NCR ${ncrNumber} deleted.`);
      fetchNCRs();
    } catch (err) {
      toast.error('Failed to delete NCR.');
    }
  };

  const filteredNCRs = useMemo(() => {
    return ncrList.filter(ncr => {
      const matchesStatus = ncrStatusFilter === 'all' || ncr.status === ncrStatusFilter;
      const q = ncrSearch.toLowerCase();
      const matchesSearch = !q.trim() ||
        ncr.ncr_number?.toLowerCase().includes(q) ||
        ncr.recorded_by?.toLowerCase().includes(q) ||
        ncr.unit?.toLowerCase().includes(q) ||
        ncr.description?.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [ncrList, ncrStatusFilter, ncrSearch]);

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
    const avgTatMins = total > 0
      ? Math.round(orders.reduce((acc, o) => acc + (o.tat_remaining_mins ? (45 - o.tat_remaining_mins) : 22), 0) / total)
      : 24;

    return { total, statCount, preCount, autoVerifiedCount, autoRatio, avgTatMins };
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

      {/* ── MODULE TAB NAV ── */}
      <div className="flex items-center gap-1 border-b border-slate-200 pb-0 overflow-x-auto">
        {[
          { id: 'worklist', label: 'Specimen Worklist', icon: <ClipboardList size={13} /> },
          { id: 'ncr',      label: 'Non-Conformance (NCR)', icon: <AlertOctagon size={13} /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 -mb-px transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {/* ── WORKLIST TAB CONTENT ── */}
      {activeTab === 'worklist' && <>

      {/* ── CLEAN METRICS CARDS ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
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
          <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">Avg Turnaround Time</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-semibold text-indigo-700">{stats.avgTatMins}m</span>
            <Clock className="text-indigo-300" size={18} />
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

      {/* ── WORKLIST HEADER & PHASE FILTERS ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-slate-700" />
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">Specimen Worklist</h2>
        </div>

        <div className="flex items-center gap-1 text-xs">
          <span className="text-slate-400 font-medium mr-1">Phase:</span>
          {['all', 'pre-analytical', 'analytical', 'post-analytical'].map(p => (
            <button
              key={p}
              onClick={() => setPhaseFilter(p)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium capitalize cursor-pointer transition-colors ${
                phaseFilter === p ? 'bg-slate-900 text-white font-semibold' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* ── SPECIMEN WORKLIST GRID ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left Table */}
          <div className="lg:col-span-2 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search patient, Accession No, barcode..."
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200/80 rounded-lg text-xs font-normal focus:outline-none focus:border-slate-400 shadow-2xs"
              />
            </div>

            <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200/80">
                    <tr>
                      <th className="py-2.5 px-3">Patient / Accession No</th>
                      <th className="py-2.5 px-3">Specimen / Tube</th>
                      <th className="py-2.5 px-3">Target TAT</th>
                      <th className="py-2.5 px-3">TAT Counter</th>
                      <th className="py-2.5 px-3">Storage Unit (Fridge/Freezer)</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-normal text-slate-700">
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="py-8 text-center text-slate-400">
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
                            <td className="py-2.5 px-3">
                              <span className="font-semibold text-slate-900 block">{order.patient_name}</span>
                              <span className="text-[10px] text-slate-400 font-mono">PID: {order.patient_id} • Accession No: {order.accession_number}</span>
                            </td>

                            <td className="py-2.5 px-3">
                              <span className="font-medium text-slate-800 block">{order.specimen_type}</span>
                              <span className="text-[10px] text-slate-500 font-mono">
                                {order.tube_type || 'Purple EDTA'}
                              </span>
                            </td>

                            <td className="py-2.5 px-3">
                              <span className="inline-block px-2 py-0.5 text-[10px] font-medium rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                                {order.stage || 'Collected'}
                              </span>
                              {order.auto_verified === 1 && (
                                <span className="ml-1 text-[9px] font-semibold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                                  AUTO
                                </span>
                              )}
                            </td>

                            <td className="py-2.5 px-3">
                              {order.urgency?.includes('STAT') || order.urgency?.includes('1h') ? (
                                <span className="font-bold text-rose-600 text-[11px] bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                                  In-House STAT (1h)
                                </span>
                              ) : order.urgency?.includes('Special') || order.urgency?.includes('1 Month') ? (
                                <span className="font-bold text-purple-700 text-[11px] bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                                  Outsourced Special (1m)
                                </span>
                              ) : order.urgency?.includes('Outsourced') || order.urgency?.includes('7 Day') ? (
                                <span className="font-medium text-amber-700 text-[11px] bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                  Outsourced (7d)
                                </span>
                              ) : (
                                <span className="text-slate-600 text-[11px] bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                  In-House Routine (6h)
                                </span>
                              )}
                            </td>

                            <td className="py-2.5 px-3">
                              <TatCounter order={order} />
                            </td>

                            <td className="py-2.5 px-3">
                              {(() => {
                                const assignedUnitId = storageAssignments[order.id] || getRecommendedStorageUnit(order);
                                const unit = availableStorageUnits.find(u => u.id === assignedUnitId);
                                const isFreezer = unit?.type === 'freezer' || String(assignedUnitId).includes('freezer');
                                return (
                                  <div className="flex flex-col gap-0.5">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border inline-flex items-center gap-1 w-fit ${
                                      isFreezer 
                                        ? 'bg-sky-50 text-sky-800 border-sky-200' 
                                        : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                                    }`}>
                                      <Thermometer size={11} className="text-slate-500 shrink-0" /> {unit?.label ? unit.label.split('(')[0].trim() : 'Fridge 1'}
                                    </span>
                                    <span className="text-[9px] text-slate-400 font-mono">
                                      {storageRacks[order.id] || 'Shelf 2'}
                                    </span>
                                  </div>
                                );
                              })()}
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
                    Accession No: {selectedOrder.accession_number}
                  </span>
                </div>

                {/* Live TAT Monitor Card */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-1.5">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="font-bold text-slate-500 uppercase tracking-wider">Live TAT Monitor</span>
                    <span className={`px-1.5 py-0.5 rounded font-bold ${
                      selectedOrder.urgency === 'STAT' ? 'bg-rose-100 text-rose-800' : 'bg-slate-200 text-slate-800'
                    }`}>
                      {selectedOrder.urgency || 'Routine'} ({selectedOrder.urgency === 'STAT' ? '45m target' : '120m target'})
                    </span>
                  </div>
                  <TatCounter order={selectedOrder} />
                </div>

                {/* ── ADVANCED LIFECYCLE STEPPER ── */}
                {(() => {
                  const currentIdx = LIFECYCLE_STAGES.findIndex(s => s.id === selectedOrder.stage);
                  const effectiveIdx = currentIdx === -1 ? 0 : currentIdx;
                  const nextStage = LIFECYCLE_STAGES[effectiveIdx + 1];
                  const isCompleted = effectiveIdx === LIFECYCLE_STAGES.length - 1;

                  return (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Specimen Lifecycle</span>
                        <span className="text-[9px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                          Step {effectiveIdx + 1} / {LIFECYCLE_STAGES.length}
                        </span>
                      </div>

                      {/* Vertical stepper */}
                      <div className="relative pl-5 space-y-0">
                        {/* Vertical connector line */}
                        <div className="absolute left-[9px] top-2 bottom-2 w-px bg-slate-200" />

                        {LIFECYCLE_STAGES.map((st, idx) => {
                          const isDone = idx < effectiveIdx;
                          const isCurrent = idx === effectiveIdx;
                          const isNext = idx === effectiveIdx + 1;
                          const isLocked = idx > effectiveIdx + 1;

                          return (
                            <div key={st.id} className="relative flex gap-3 pb-2 last:pb-0">
                              {/* Node dot */}
                              <div
                                className="absolute -left-5 w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center shrink-0 z-10"
                                style={{
                                  backgroundColor: isDone ? st.phaseColor : isCurrent ? st.phaseColor : '#e2e8f0',
                                  borderColor: isDone ? st.phaseColor : isCurrent ? st.phaseColor : '#cbd5e1',
                                }}
                              >
                                {isDone ? (
                                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                    <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                ) : isCurrent ? (
                                  <div className="w-2 h-2 rounded-full bg-white" />
                                ) : (
                                  <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                )}
                              </div>

                              {/* Stage card */}
                              <div
                                className={`w-full rounded-lg border text-[11px] transition-all ${
                                  isCurrent
                                    ? 'shadow-sm'
                                    : isDone
                                    ? 'opacity-60'
                                    : isNext
                                    ? 'border-dashed'
                                    : 'opacity-30'
                                }`}
                                style={{
                                  borderColor: isCurrent ? st.phaseColor : isNext ? st.phaseColor + '60' : '#e2e8f0',
                                  backgroundColor: isCurrent ? st.phaseBg : isNext ? st.phaseBg + 'aa' : '#f8fafc',
                                }}
                              >
                                <div className="p-2 space-y-1">
                                  <div className="flex items-center justify-between gap-1">
                                    <span
                                      className="font-bold text-[11px]"
                                      style={{ color: isCurrent || isDone ? st.phaseColor : '#94a3b8' }}
                                    >
                                      {st.label}
                                    </span>
                                    <span
                                      className="text-[8px] font-mono uppercase px-1.5 py-0.5 rounded"
                                      style={{
                                        backgroundColor: isCurrent ? st.phaseColor + '20' : '#f1f5f9',
                                        color: isCurrent ? st.phaseColor : '#94a3b8',
                                      }}
                                    >
                                      {st.phase}
                                    </span>
                                  </div>

                                  {(isCurrent || isNext) && (
                                    <p className="text-[10px] text-slate-500 leading-snug">{st.description}</p>
                                  )}

                                  {isCurrent && (
                                    <div className="mt-1.5 pt-1.5 border-t border-dashed" style={{ borderColor: st.phaseColor + '40' }}>
                                      <p className="text-[10px] font-semibold" style={{ color: st.phaseColor }}>
                                        Action Required:
                                      </p>
                                      <p className="text-[10px] text-slate-600 leading-snug mt-0.5">{st.actionHint}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Advance button */}
                      {!isCompleted && nextStage ? (
                        <button
                          onClick={() => handleUpdateStage(selectedOrder.id, nextStage.id)}
                          className="w-full mt-1 py-2.5 rounded-xl text-white font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm hover:opacity-90 active:scale-[0.98]"
                          style={{ backgroundColor: nextStage.phaseColor }}
                        >
                          <ArrowRight size={13} />
                          Advance to: {nextStage.label}
                        </button>
                      ) : isCompleted ? (
                        <div className="w-full mt-1 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-xs flex items-center justify-center gap-1.5">
                          <CheckCircle2 size={13} className="text-emerald-600" />
                          Lifecycle Complete
                        </div>
                      ) : null}
                    </div>
                  );
                })()}

                {/* Storage Unit Assignment Panel */}
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Droplet size={14} className="text-indigo-600" /> Sample Storage Location
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">TAT Storage Rule</span>
                  </div>

                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-2.5 text-xs">
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 block mb-1">Target Storage Unit</label>
                      <select
                        value={storageAssignments[selectedOrder.id] || getRecommendedStorageUnit(selectedOrder)}
                        onChange={e => handleAssignOrderStorage(selectedOrder.id, e.target.value)}
                        className="w-full p-2 bg-white border border-slate-200 rounded font-semibold text-slate-900 text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
                      >
                        {availableStorageUnits.map(unit => (
                          <option key={unit.id} value={unit.id}>
                            {unit.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Recommendation Callout */}
                    <div className="text-[10px] bg-indigo-50/80 border border-indigo-100 text-indigo-900 p-2 rounded-lg space-y-0.5">
                      <p className="font-bold">TAT Recommended Storage:</p>
                      <p className="text-indigo-700">
                        {getStorageRecommendationText(selectedOrder)}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div>
                        <label className="text-slate-500 font-medium block mb-1">Shelf / Rack</label>
                        <input
                          type="text"
                          value={storageRacks[selectedOrder.id] || 'Shelf 2 (Rack B)'}
                          onChange={e => {
                            const val = e.target.value;
                            const next = { ...storageRacks, [selectedOrder.id]: val };
                            setStorageRacks(next);
                            try { localStorage.setItem('lc_lab_specimen_racks', JSON.stringify(next)); } catch {}
                          }}
                          placeholder="e.g. Rack A-04"
                          className="w-full p-1.5 bg-white border border-slate-200 rounded font-mono font-medium text-slate-900 text-[11px]"
                        />
                      </div>
                      <div>
                        <label className="text-slate-500 font-medium block mb-1">Box / Slot #</label>
                        <input
                          type="text"
                          value={storageBoxes[selectedOrder.id] || 'Box #12'}
                          onChange={e => {
                            const val = e.target.value;
                            const next = { ...storageBoxes, [selectedOrder.id]: val };
                            setStorageBoxes(next);
                            try { localStorage.setItem('lc_lab_specimen_boxes', JSON.stringify(next)); } catch {}
                          }}
                          placeholder="e.g. Slot 08"
                          className="w-full p-1.5 bg-white border border-slate-200 rounded font-mono font-medium text-slate-900 text-[11px]"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      const currentUnit = storageAssignments[selectedOrder.id] || getRecommendedStorageUnit(selectedOrder);
                      handleAssignOrderStorage(selectedOrder.id, currentUnit);
                      toast.success(`Sample stored in ${getUnitLabel(currentUnit)}`);
                    }}
                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    <Save size={14} /> Store Sample in Unit
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


      {/* ── REGISTRATION MODAL ── */}
      </> /* end worklist tab */}

      {/* ══════════════════════════════════════════════════════════════════════
          NCR (NON-CONFORMANCE REPORT) TAB
          Digital replica of LEG/PATHLAB/MSD/FM-12-VERS-004
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'ncr' && (
        <div className="space-y-5">

          {/* KPI Dashboard */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              {
                label: 'NCRs This Month',
                value: ncrKpi.totalThisMonth ?? 0,
                sub: `${ncrKpi.totalAllTime ?? 0} all-time`,
                icon: <AlertOctagon size={17} className="text-amber-400" />,
                accent: 'border-l-amber-400',
              },
              {
                label: '% Completed (ISO KPI)',
                value: `${ncrKpi.pctCompleted ?? 0}%`,
                sub: `${ncrKpi.closedThisMonth ?? 0} closed this month`,
                icon: <TrendingUp size={17} className="text-emerald-500" />,
                accent: 'border-l-emerald-400',
              },
              {
                label: 'Open NCRs',
                value: ncrKpi.openCount ?? 0,
                sub: `${ncrKpi.inProgressCount ?? 0} in progress`,
                icon: <Clock size={17} className="text-sky-500" />,
                accent: 'border-l-sky-400',
              },
              {
                label: 'Overdue (>30 days)',
                value: ncrKpi.overdueCount ?? 0,
                sub: 'Require urgent attention',
                icon: <AlertTriangle size={17} className="text-rose-500" />,
                accent: 'border-l-rose-400',
              },
            ].map((k, i) => (
              <div key={i} className={`bg-white rounded-xl border border-slate-200/80 shadow-2xs p-4 border-l-4 ${k.accent} space-y-1`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{k.label}</span>
                  {k.icon}
                </div>
                <p className="text-2xl font-bold text-slate-900">{k.value}</p>
                <p className="text-[10px] text-slate-400">{k.sub}</p>
              </div>
            ))}
          </div>

          {/* NCR List View */}
          {(ncrView === 'list') && (
            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden">
              {/* Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <ListChecks size={15} className="text-slate-600" />
                  <h2 className="text-sm font-bold text-slate-900">NCR Register</h2>
                  <span className="text-[10px] bg-slate-100 text-slate-500 rounded-full px-2 py-0.5 font-medium">{filteredNCRs.length} records</span>
                </div>
                <div className="flex items-center gap-2">
                  {/* Status Filter */}
                  <div className="flex items-center gap-1">
                    {['all','open','in_progress','closed'].map(s => (
                      <button
                        key={s}
                        onClick={() => setNcrStatusFilter(s)}
                        className={`px-2.5 py-1 rounded-md text-[10px] font-semibold capitalize cursor-pointer transition-colors ${
                          ncrStatusFilter === s ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        {s.replace('_',' ')}
                      </button>
                    ))}
                  </div>
                  {/* Search */}
                  <div className="relative">
                    <Search size={12} className="absolute left-2.5 top-2 text-slate-400" />
                    <input
                      type="text"
                      value={ncrSearch}
                      onChange={e => setNcrSearch(e.target.value)}
                      placeholder="Search NCR..."
                      className="pl-7 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-slate-400"
                    />
                  </div>
                  <button
                    onClick={() => { setNcrForm({ ...NCR_BLANK }); setNcrSelected(null); setNcrView('new'); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg cursor-pointer transition-colors"
                  >
                    <FilePlus2 size={13} /> New NCR
                  </button>
                  <button onClick={fetchNCRs} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer border border-slate-200" title="Refresh">
                    <RefreshCw size={13} className={ncrLoading ? 'animate-spin' : ''} />
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200/80">
                    <tr>
                      <th className="py-2.5 px-4">NCR Number</th>
                      <th className="py-2.5 px-4">Date / Time</th>
                      <th className="py-2.5 px-4">Unit</th>
                      <th className="py-2.5 px-4">Category</th>
                      <th className="py-2.5 px-4">Significance</th>
                      <th className="py-2.5 px-4">Recorded By</th>
                      <th className="py-2.5 px-4">Status</th>
                      <th className="py-2.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {ncrLoading ? (
                      <tr><td colSpan="8" className="py-10 text-center text-slate-400 text-xs">Loading NCRs…</td></tr>
                    ) : filteredNCRs.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="py-12 text-center">
                          <AlertOctagon size={28} className="mx-auto text-slate-200 mb-2" />
                          <p className="text-slate-400 font-medium text-xs">No NCRs found. Click "New NCR" to log a non-conformance.</p>
                        </td>
                      </tr>
                    ) : filteredNCRs.map(ncr => {
                      const statusCfg = {
                        open:        { label: 'Open',        cls: 'bg-amber-100 text-amber-800' },
                        in_progress: { label: 'In Progress', cls: 'bg-sky-100 text-sky-800' },
                        closed:      { label: 'Closed',      cls: 'bg-emerald-100 text-emerald-800' },
                        overdue:     { label: 'Overdue',     cls: 'bg-rose-100 text-rose-800' },
                      }[ncr.status] || { label: ncr.status, cls: 'bg-slate-100 text-slate-600' };
                      return (
                        <tr key={ncr.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-4 font-mono font-semibold text-slate-900">{ncr.ncr_number}</td>
                          <td className="py-2.5 px-4 text-slate-500">{ncr.occurred_at ? new Date(ncr.occurred_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</td>
                          <td className="py-2.5 px-4">{ncr.unit}</td>
                          <td className="py-2.5 px-4 text-slate-500">{ncr.nc_category || '—'}</td>
                          <td className="py-2.5 px-4">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${ncr.significance === 'major' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>
                              {ncr.significance === 'major' ? <AlertTriangle size={10} /> : <Shield size={10} />}
                              {ncr.significance}
                            </span>
                          </td>
                          <td className="py-2.5 px-4">{ncr.recorded_by}</td>
                          <td className="py-2.5 px-4">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusCfg.cls}`}>{statusCfg.label}</span>
                          </td>
                          <td className="py-2.5 px-4">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleNCREdit(ncr)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                                title="Edit NCR"
                              >
                                <Pencil size={12} />
                              </button>
                              <button
                                onClick={() => handleNCRDelete(ncr.id, ncr.ncr_number)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                                title="Delete NCR"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* NCR FORM (New / Edit) — Digital replica of LEG/PATHLAB/MSD/FM-12-VERS-004 */}
          {(ncrView === 'new' || ncrView === 'edit') && (
            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden">
              {/* Form Header */}
              <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-900 rounded-t-2xl">
                <div>
                  <div className="flex items-center gap-2">
                    <AlertOctagon size={16} className="text-amber-400" />
                    <h2 className="text-sm font-bold text-white">
                      {ncrView === 'edit' ? `Edit NCR — ${ncrSelected?.ncr_number}` : 'New Non-Conformance Report'}
                    </h2>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">Form Ref: LEG/PATHLAB/MSD/FM-12-VERS-004 | ISO 15189:2022</p>
                </div>
                <button
                  onClick={() => { setNcrView('list'); setNcrForm({ ...NCR_BLANK }); }}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg cursor-pointer transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleNCRSubmit} className="p-5 space-y-6 text-xs">
                {/* ── PAGE 1 ──────────────────────────────────────────────── */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Page 1 — Non-Conformance Identification & Root Cause Analysis</p>
                  </div>
                  <div className="p-4 space-y-4">

                    {/* Row 1: NCR Number + Date/Time */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Non-Conformance Number</label>
                        <input
                          type="text"
                          readOnly
                          value={ncrView === 'edit' ? ncrSelected?.ncr_number : 'Auto-generated on save'}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-400 font-mono cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Date & Time of NC <span className="text-rose-500">*</span></label>
                        <input
                          type="datetime-local"
                          required
                          value={ncrForm.occurred_at}
                          onChange={e => handleNCRFieldChange('occurred_at', e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 font-medium text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Staff Member Recording <span className="text-rose-500">*</span></label>
                        <input
                          type="text"
                          required
                          placeholder="Full name of staff recording"
                          value={ncrForm.recorded_by}
                          onChange={e => handleNCRFieldChange('recorded_by', e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 text-slate-900"
                        />
                      </div>
                    </div>

                    {/* Row 2: Unit + Category */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Unit where Identified <span className="text-rose-500">*</span></label>
                        <select
                          required
                          value={ncrForm.unit}
                          onChange={e => handleNCRFieldChange('unit', e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 text-slate-900"
                        >
                          {['Hematology','Biochemistry','Microbiology','Serology / Immunology','Molecular / PCR','Coagulation','Urinalysis','Blood Bank','Reception / Pre-Analytical','Quality Control','General Laboratory','Administration'].map(u => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">NC Category</label>
                        <select
                          value={ncrForm.nc_category}
                          onChange={e => handleNCRFieldChange('nc_category', e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 text-slate-900"
                        >
                          {['Pre-analytical','Analytical','Post-analytical','Administrative','Equipment / Instrumentation','Reagent / Consumable','Personnel','Facility / Environment'].map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Detailed Description of Non-Conformance</label>
                      <textarea
                        rows={3}
                        placeholder="Describe the non-conformance in detail…"
                        value={ncrForm.description}
                        onChange={e => handleNCRFieldChange('description', e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 text-slate-900 resize-none"
                      />
                    </div>

                    {/* RCA Method */}
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Root Cause Analysis Method Used</label>
                      <div className="flex flex-wrap gap-3">
                        {[
                          { id: 'Fish-bone Diagram', label: 'Fish-bone Diagram' },
                          { id: '5 Whys Analysis', label: '5 Whys Analysis' },
                          { id: 'Brainstorming Session', label: 'Brainstorming Session' },
                          { id: 'Pareto Analysis', label: 'Pareto Analysis' },
                        ].map(m => {
                          const selected = Array.isArray(ncrForm.rca_method) && ncrForm.rca_method.includes(m.id);
                          return (
                            <label key={m.id} className={`flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer transition-colors select-none ${selected ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 text-slate-600 hover:border-slate-400'}`}>
                              <input
                                type="checkbox"
                                className="sr-only"
                                checked={selected}
                                onChange={() => handleNCRRcaToggle(m.id)}
                              />
                              <CheckCircle2 size={12} className={selected ? 'text-white' : 'text-slate-300'} />
                              {m.label}
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* RCA Results */}
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Root Cause Analysis Results</label>
                      <textarea
                        rows={3}
                        placeholder="Document the root causes identified…"
                        value={ncrForm.rca_results}
                        onChange={e => handleNCRFieldChange('rca_results', e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 text-slate-900 resize-none"
                      />
                    </div>

                    {/* Immediate Action */}
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Immediate Action Taken</label>
                      <textarea
                        rows={2}
                        placeholder="What was done immediately to contain the non-conformance…"
                        value={ncrForm.immediate_action}
                        onChange={e => handleNCRFieldChange('immediate_action', e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 text-slate-900 resize-none"
                      />
                    </div>

                    {/* Significance + Extent */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Medical Significance of the NC</label>
                        <div className="flex gap-3">
                          {['major','minor'].map(sig => (
                            <label key={sig} className={`flex-1 flex items-center justify-center gap-2 py-2.5 border rounded-lg cursor-pointer transition-colors capitalize font-semibold select-none ${ncrForm.significance === sig ? (sig === 'major' ? 'border-rose-600 bg-rose-600 text-white' : 'border-slate-900 bg-slate-900 text-white') : 'border-slate-200 text-slate-500 hover:border-slate-400'}`}>
                              <input type="radio" name="significance" className="sr-only" value={sig} checked={ncrForm.significance === sig} onChange={() => handleNCRFieldChange('significance', sig)} />
                              {sig === 'major' ? <AlertTriangle size={13} /> : <Shield size={13} />} {sig}
                            </label>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Extent of NC</label>
                        <textarea
                          rows={2}
                          placeholder="Scope and extent of the non-conformance…"
                          value={ncrForm.extent}
                          onChange={e => handleNCRFieldChange('extent', e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 text-slate-900 resize-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── PAGE 2 ──────────────────────────────────────────────── */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Page 2 — Corrective Actions, Monitoring & Verification</p>
                  </div>
                  <div className="p-4 space-y-4">

                    {/* Assigned To */}
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Investigation & Monitoring Assigned To</label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-1">Name</label>
                          <input
                            type="text"
                            placeholder="Investigator name"
                            value={ncrForm.assigned_to_name}
                            onChange={e => handleNCRFieldChange('assigned_to_name', e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 text-slate-900"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-1">Position</label>
                          <input
                            type="text"
                            placeholder="e.g. Head Manager, QM"
                            value={ncrForm.assigned_to_position}
                            onChange={e => handleNCRFieldChange('assigned_to_position', e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 text-slate-900"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Corrective Actions */}
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Corrective Action(s) Taken</label>
                      <textarea
                        rows={3}
                        placeholder="List all corrective actions implemented…"
                        value={ncrForm.corrective_actions}
                        onChange={e => handleNCRFieldChange('corrective_actions', e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 text-slate-900 resize-none"
                      />
                    </div>

                    {/* Target Completion Date */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Target Completion Date</label>
                        <input
                          type="date"
                          value={ncrForm.target_completion}
                          onChange={e => handleNCRFieldChange('target_completion', e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Status</label>
                        <select
                          value={ncrForm.status}
                          onChange={e => handleNCRFieldChange('status', e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 text-slate-900"
                        >
                          <option value="open">Open</option>
                          <option value="in_progress">In Progress</option>
                          <option value="closed">Closed</option>
                        </select>
                      </div>
                    </div>

                    {/* Monitoring Effectiveness */}
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Monitoring Effectiveness of Corrective Action</label>
                      <p className="text-[10px] text-slate-400 mb-1">Track action taken and current status</p>
                      <textarea
                        rows={3}
                        placeholder="Describe how effectiveness of the corrective action is being monitored…"
                        value={ncrForm.monitoring_notes}
                        onChange={e => handleNCRFieldChange('monitoring_notes', e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 text-slate-900 resize-none"
                      />
                    </div>

                    {/* Signatures Section */}
                    <div className="border-t border-dashed border-slate-200 pt-4">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Signatures & Verification</p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-1">Staff Name</label>
                          <input
                            type="text"
                            placeholder="Staff member name"
                            value={ncrForm.staff_name}
                            onChange={e => handleNCRFieldChange('staff_name', e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 text-slate-900"
                          />
                          <p className="text-[10px] text-slate-400 mt-1 italic">Signature on file</p>
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-1">Reviewed by Quality Manager (QM)</label>
                          <input
                            type="text"
                            placeholder="QM reviewer name"
                            value={ncrForm.reviewed_by_qm}
                            onChange={e => handleNCRFieldChange('reviewed_by_qm', e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 text-slate-900"
                          />
                          <p className="text-[10px] text-slate-400 mt-1 italic">Signature on file</p>
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-1">Verified by Laboratory Manager</label>
                          <input
                            type="text"
                            placeholder="Lab Manager name"
                            value={ncrForm.verified_by_lab_manager}
                            onChange={e => handleNCRFieldChange('verified_by_lab_manager', e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 text-slate-900"
                          />
                          <p className="text-[10px] text-slate-400 mt-1 italic">Signature on file</p>
                        </div>
                      </div>
                    </div>

                    {/* Note about closing */}
                    {ncrForm.verified_by_lab_manager?.trim() && (
                      <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                        <CheckCircleIcon size={14} className="text-emerald-600 shrink-0" />
                        <p className="text-[11px] text-emerald-700 font-medium">This NCR will be automatically marked as <strong>Closed</strong> upon saving because the Laboratory Manager has verified it.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Submit / Cancel */}
                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => { setNcrView('list'); setNcrForm({ ...NCR_BLANK }); }}
                    className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={ncrSubmitting}
                    className="flex items-center gap-1.5 px-6 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white font-semibold text-xs rounded-lg cursor-pointer transition-colors"
                  >
                    {ncrSubmitting ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
                    {ncrView === 'edit' ? 'Update NCR' : 'Submit NCR'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
      {/* end NCR tab */}

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
                  <label className="text-[10px] font-medium text-slate-500 block mb-1">Target TAT / Processing Scope</label>
                  <FieldTooltip text="In-House: Min 1h (STAT), Max 6h (Routine). Outsourced: 7 Days (Standard), 1 Month (Special)">
                    <select
                      value={urgency}
                      onChange={e => {
                        const val = e.target.value;
                        setUrgency(val);
                        if (val.includes('Special') || val.includes('1 Month')) setSelectedRegStorageUnit('freezer_b');
                        else if (val.includes('Outsourced') || val.includes('7 Day')) setSelectedRegStorageUnit('freezer_a');
                        else if (val.includes('STAT') || val.includes('1h')) setSelectedRegStorageUnit('fridge_a');
                        else setSelectedRegStorageUnit('fridge_b');
                      }}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded font-medium text-slate-900 text-xs"
                    >
                      <option value="In-House STAT (1h)">In-House STAT (Min: 1 Hour)</option>
                      <option value="In-House Routine (6h)">In-House Routine (Max: 6 Hours)</option>
                      <option value="Outsourced Standard (7 Days)">Outsourced Reference Lab (7 Days)</option>
                      <option value="Outsourced Special (1 Month)">Special Outsourced Test (1 Month)</option>
                    </select>
                  </FieldTooltip>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-indigo-700 block mb-1">Assign Storage Fridge / Freezer *</label>
                <FieldTooltip text="Select fridge/freezer storage unit based on TAT requirement">
                  <select
                    value={selectedRegStorageUnit || 'fridge_b'}
                    onChange={e => setSelectedRegStorageUnit(e.target.value)}
                    className="w-full p-2 bg-indigo-50/60 border border-indigo-200 rounded font-bold text-slate-900 text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    {availableStorageUnits.map(unit => (
                      <option key={unit.id} value={unit.id}>
                        {unit.label}
                      </option>
                    ))}
                  </select>
                </FieldTooltip>
              </div>

              {/* Test Assay Selection */}
              <div>
                <label className="text-[10px] font-semibold text-slate-700 block mb-1">Target Test Assay *</label>
                <FieldTooltip text="Target laboratory diagnostic panel and assay protocol">
                  <select
                    value={testName}
                    onChange={e => {
                      const selectedAssay = TEST_ASSAYS.find(a => a.name === e.target.value || a.id === e.target.value);
                      setTestName(e.target.value);
                      if (selectedAssay) {
                        setTubeType(selectedAssay.defaultTube);
                        setSpecimenType(selectedAssay.defaultSpecimen);
                      }
                    }}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded font-bold text-slate-900 text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    {TEST_ASSAYS.map(a => (
                      <option key={a.id} value={a.name}>{a.name}</option>
                    ))}
                  </select>
                </FieldTooltip>
              </div>

              {/* Technical Assay Details Card (Concise Summary) */}
              {(() => {
                const currentAssay = TEST_ASSAYS.find(a => a.name === testName || a.id === testName);
                if (!currentAssay) return null;
                return (
                  <div className="bg-indigo-50/50 border border-indigo-100/80 rounded-xl p-2 px-3 text-[11px] flex items-center justify-between gap-2">
                    <p className="text-slate-600 font-medium truncate">
                      <strong className="text-indigo-900 font-bold">{currentAssay.category}:</strong> {currentAssay.focus}
                    </p>
                    <span className="px-2 py-0.5 rounded bg-white text-indigo-700 text-[10px] font-bold border border-indigo-200/60 shrink-0">
                      {currentAssay.defaultTube}
                    </span>
                  </div>
                );
              })()}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-medium text-slate-500 block mb-1">Specimen Matrix</label>
                  <FieldTooltip text="Anatomical specimen matrix collected from patient">
                    <input
                      type="text"
                      value={specimenType}
                      onChange={e => setSpecimenType(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded font-medium text-slate-900 text-xs"
                    />
                  </FieldTooltip>
                </div>
                <div>
                  <label className="text-[10px] font-medium text-slate-500 block mb-1">Tube Selection</label>
                  <FieldTooltip text="Container top color based on CLSI H3-A6 order of draw">
                    <select
                      value={tubeType}
                      onChange={e => setTubeType(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded font-medium text-slate-900 text-xs"
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


    </div>
  );
};

export default LabHub;
