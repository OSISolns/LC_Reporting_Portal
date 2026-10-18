import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Baby,
  Heart,
  Stethoscope,
  Activity,
  FileSpreadsheet,
  ShieldAlert,
  User,
  Calendar,
  Clock,
  Plus,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Calculator,
  FileText,
  ChevronRight,
  RefreshCw,
  Download,
  Search,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import PatientAutocomplete from '../components/PatientAutocomplete';
import api from '../api/axios';
import { getMyActiveShift } from '../api/shifts';
import toast from 'react-hot-toast';
import { calculateAgeFromDob, formatDobForDateInput } from '../utils/ancUtils';
import { INSURANCES } from './refunds/constants';

const INITIAL_QUICK_ANC = {
  visit_date: new Date().toISOString().split('T')[0],
  patient_name: '',
  dob: '',
  age: '',
  sex: 'F',
  pid: '',
  case_type: 'New case',
  insurance: '',
  phone: '',
  gestational_age_weeks: '',
  gravida: '',
  parity: '',
  blood_pressure: '',
  weight_kg: '',
  estimated_delivery_date: '',
  clinical_notes: '',
  danger_signs: '',
  ind_1_new_reg: true,
  ind_2_under_15: false,
  ind_3_15_19: false,
  ind_4_20_24: false,
  ind_5_25_plus: false,
  ind_6_first_trim: false,
  ind_7_with_partner: false,
  ind_8_four_visits: false,
  ind_9_high_risk_detected: false,
  ind_10_high_risk_referred: false,
  ind_11_tt1: false,
  ind_12_tt2_to_5: false,
  ind_13_tt_protected: false,
  ind_14_iron_folic: false,
  ind_15_severe_anaemia: false,
  ind_16_syphilis_tested: false,
  ind_17_syphilis_positive: false,
  ind_18_syphilis_treated: false,
  ind_19_hiv_tested: false,
  ind_20_hiv_positive: false,
  ind_21_hiv_result_received: false,
  ind_22_hiv_arv_started: false,
  ind_23_partner_hiv_tested: false,
  ind_24_partner_hiv_positive: false,
  ind_25_malaria_screened: false,
  ind_26_ultrasound_other: false
};

export default function MidwifeDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // State
  const [stats, setStats] = useState(null);
  const [recentAnc, setRecentAnc] = useState([]);
  const [highRiskList, setHighRiskList] = useState([]);
  const [recentClinical, setRecentClinical] = useState([]);
  const [activeShift, setActiveShift] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exportingExcel, setExportingExcel] = useState(false);

  // Active Patient Workspace
  const [selectedPatient, setSelectedPatient] = useState(null);

  // Obstetric Calculator State (Naegele's rule)
  const [lmpDate, setLmpDate] = useState('');
  const [calcResult, setCalcResult] = useState(null);

  // Quick ANC modal
  const [isQuickAncOpen, setIsQuickAncOpen] = useState(false);
  const [quickForm, setQuickForm] = useState(INITIAL_QUICK_ANC);
  const [savingAnc, setSavingAnc] = useState(false);
  const [lastAutoSavedAt, setLastAutoSavedAt] = useState(null);
  const [hasDraft, setHasDraft] = useState(false);
  const DRAFT_STORAGE_KEY = `lumina_draft_quick_anc_${user?.id || 'guest'}`;

  // Check for existing draft on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && (parsed.patient_name || parsed.pid || parsed.clinical_notes || parsed.blood_pressure)) {
          setHasDraft(true);
        }
      }
    } catch (e) { }
  }, [DRAFT_STORAGE_KEY]);

  // Debounced Autosave (600ms)
  useEffect(() => {
    if (!isQuickAncOpen) return;

    const hasInput = Boolean(
      quickForm.patient_name?.trim() ||
      quickForm.pid?.trim() ||
      quickForm.clinical_notes?.trim() ||
      quickForm.blood_pressure?.trim() ||
      quickForm.gestational_age_weeks ||
      quickForm.danger_signs?.trim()
    );

    if (!hasInput) return;

    const timer = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(quickForm));
        setLastAutoSavedAt(new Date());
        setHasDraft(true);
      } catch (err) {
        console.warn('Failed to autosave draft:', err);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [quickForm, isQuickAncOpen, DRAFT_STORAGE_KEY]);

  // Active Ledger Tab
  const [activeTab, setActiveTab] = useState('anc_recent'); // 'anc_recent' | 'high_risk' | 'clinical_sheets'

  // Load Dashboard Data
  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const todayStr = new Date().toISOString().split('T')[0];

      const [statsRes, ancRes, highRiskRes, clinicalRes, shiftData] = await Promise.allSettled([
        api.get('/clinical/anc-register/stats'),
        api.get('/clinical/anc-register', { params: { limit: 8, page: 1 } }),
        api.get('/clinical/anc-register', { params: { high_risk: 'true', limit: 8 } }),
        api.get('/clinical/sheets', { params: { limit: 8 } }),
        getMyActiveShift()
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value?.data?.success) {
        setStats(statsRes.value.data.data);
      }
      if (ancRes.status === 'fulfilled' && ancRes.value?.data?.success) {
        setRecentAnc(ancRes.value.data.data || []);
      }
      if (highRiskRes.status === 'fulfilled' && highRiskRes.value?.data?.success) {
        setHighRiskList(highRiskRes.value.data.data || []);
      }
      if (clinicalRes.status === 'fulfilled' && clinicalRes.value?.data) {
        const raw = clinicalRes.value.data.data || clinicalRes.value.data.sheets || clinicalRes.value.data;
        if (Array.isArray(raw)) setRecentClinical(raw.slice(0, 8));
      }
      if (shiftData.status === 'fulfilled' && shiftData.value) {
        setActiveShift(shiftData.value);
      }
    } catch (err) {
      console.error('Error loading Midwife dashboard:', err);
      toast.error('Failed to load some midwifery dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Gestational Age & EDD Calculator
  const handleCalculateEdd = (lmpVal) => {
    setLmpDate(lmpVal);
    if (!lmpVal) {
      setCalcResult(null);
      return;
    }

    try {
      const lmp = new Date(lmpVal);
      if (isNaN(lmp.getTime())) {
        setCalcResult(null);
        return;
      }

      // Naegele's rule: LMP + 280 days (40 weeks)
      const edd = new Date(lmp.getTime() + 280 * 24 * 60 * 60 * 1000);
      const today = new Date();
      const diffMs = today.getTime() - lmp.getTime();
      const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
      const weeks = Math.floor(diffDays / 7);
      const remDays = diffDays % 7;

      let trimester = '1st Trimester (Early)';
      if (weeks >= 28) trimester = '3rd Trimester';
      else if (weeks >= 13) trimester = '2nd Trimester';

      setCalcResult({
        weeks: Math.max(0, weeks),
        days: Math.max(0, remDays),
        trimester,
        isFirstTrimester: weeks <= 12,
        eddDisplay: edd.toISOString().split('T')[0]
      });
    } catch (e) {
      console.error(e);
      setCalcResult(null);
    }
  };

  // Open Quick ANC Modal
  const handleOpenQuickAnc = () => {
    if (selectedPatient) {
      let calculatedAge = selectedPatient.calculatedAge || '';
      if (!calculatedAge && selectedPatient.dob) {
        calculatedAge = calculateAgeFromDob(selectedPatient.dob);
      }
      if (!calculatedAge && selectedPatient.age) {
        calculatedAge = String(selectedPatient.age);
      }

      const numAge = parseInt(calculatedAge, 10);
      const formattedDob = formatDobForDateInput(selectedPatient.dob) || selectedPatient.dob || '';

      setQuickForm({
        ...INITIAL_QUICK_ANC,
        patient_name: selectedPatient.full_name || selectedPatient.name || '',
        pid: selectedPatient.pid ? String(selectedPatient.pid) : '',
        dob: formattedDob,
        age: calculatedAge,
        sex: selectedPatient.gender === 'Male' ? 'M' : 'F',
        insurance: selectedPatient.insurance || selectedPatient.referrer_name || 'RSSB (RAMA)',
        phone: selectedPatient.phone || '',
        ind_2_under_15: numAge < 15,
        ind_3_15_19: numAge >= 15 && numAge <= 19,
        ind_4_20_24: numAge >= 20 && numAge <= 24,
        ind_5_25_plus: numAge >= 25
      });
    } else {
      // Check for autosaved draft
      try {
        const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && (parsed.patient_name || parsed.pid || parsed.clinical_notes || parsed.blood_pressure)) {
            setQuickForm(parsed);
            setLastAutoSavedAt(new Date());
            setHasDraft(true);
            toast.success('Restored autosaved draft', { id: 'draft-restore' });
            setIsQuickAncOpen(true);
            return;
          }
        }
      } catch (e) { }
      setQuickForm(INITIAL_QUICK_ANC);
    }
    setIsQuickAncOpen(true);
  };

  // Discard autosaved draft
  const handleDiscardDraft = () => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch (e) { }
    setQuickForm(INITIAL_QUICK_ANC);
    setLastAutoSavedAt(null);
    setHasDraft(false);
    toast('Draft cleared', { icon: '🗑️' });
  };

  // Select patient from Sukraa
  const handlePatientSelect = (p) => {
    // Check gender: Midwifery / ANC is strictly for female maternal patients
    const rawGender = (p.gender || '').trim().toLowerCase();
    if (rawGender === 'male' || rawGender === 'm') {
      toast.error(`Invalid selection: ${p.full_name || p.name} is Male. Midwifery & Antenatal Care is strictly for female patients!`, { duration: 6000 });
      return;
    }

    let calculatedAge = '';
    if (p.dob) {
      calculatedAge = calculateAgeFromDob(p.dob);
    }
    if (!calculatedAge && p.age) {
      calculatedAge = String(p.age);
    }

    const patientWithAge = {
      ...p,
      calculatedAge: calculatedAge || p.age || ''
    };

    setSelectedPatient(patientWithAge);
    const ageInfo = calculatedAge ? ` (Age: ${calculatedAge} yrs from DoB)` : '';
    toast.success(`Selected mother: ${p.full_name || p.name}${ageInfo}`);
  };

  // Select patient from Sukraa inside Quick ANC Modal
  const handleModalPatientSelect = (p) => {
    // Check gender: Midwifery / ANC is strictly for female maternal patients
    const rawGender = (p.gender || '').trim().toLowerCase();
    if (rawGender === 'male' || rawGender === 'm') {
      toast.error(`Invalid selection: ${p.full_name || p.name} is Male. Midwifery & Antenatal Care is strictly for female patients!`, { duration: 6000 });
      return;
    }

    let calculatedAge = '';
    if (p.dob) {
      calculatedAge = calculateAgeFromDob(p.dob);
    }
    if (!calculatedAge && p.age) {
      calculatedAge = String(p.age);
    }

    const numAge = parseInt(calculatedAge, 10);
    const formattedDob = formatDobForDateInput(p.dob) || p.dob || '';

    setQuickForm(prev => ({
      ...prev,
      patient_name: p.full_name || p.name || '',
      pid: p.pid ? String(p.pid) : '',
      dob: formattedDob,
      age: calculatedAge || '',
      sex: 'F',
      insurance: p.insurance || p.referrer_name || prev.insurance || '',
      phone: p.phone || prev.phone || '',
      ...(calculatedAge && !isNaN(numAge) ? {
        ind_2_under_15: numAge < 15,
        ind_3_15_19: numAge >= 15 && numAge <= 19,
        ind_4_20_24: numAge >= 20 && numAge <= 24,
        ind_5_25_plus: numAge >= 25
      } : {})
    }));

    const ageInfo = calculatedAge ? ` (Age: ${calculatedAge} yrs from DoB)` : '';
    toast.success(`Selected mother from Sukraa: ${p.full_name || p.name}${ageInfo}`);
  };

  // Save Quick ANC Consultation
  const handleSaveQuickAnc = async (e) => {
    e.preventDefault();
    if (!quickForm.patient_name?.trim()) {
      toast.error('Mother patient name is required');
      return;
    }
    if (!quickForm.visit_date) {
      toast.error('Visit date is required');
      return;
    }
    if (quickForm.sex === 'M' || quickForm.sex === 'Male') {
      toast.error('Cannot save: ANC consultation is strictly for female patients. Gender must be Female.');
      return;
    }

    try {
      setSavingAnc(true);
      const payload = {
        ...quickForm,
        reg_date: quickForm.visit_date,
        patient_id: quickForm.pid || '',
        edd: quickForm.estimated_delivery_date || '',
        parity_gravida: quickForm.parity || quickForm.gravida ? `G${quickForm.gravida || 0}P${quickForm.parity || 0}` : '',
        clinical_notes: [quickForm.clinical_notes, quickForm.danger_signs ? `Danger signs: ${quickForm.danger_signs}` : ''].filter(Boolean).join(' | ')
      };

      const res = await api.post('/clinical/anc-register', payload);
      if (res.data?.success) {
        toast.success('ANC consultation saved to statutory register');
        try {
          localStorage.removeItem(DRAFT_STORAGE_KEY);
        } catch (e) { }
        setLastAutoSavedAt(null);
        setHasDraft(false);
        setIsQuickAncOpen(false);
        setQuickForm(INITIAL_QUICK_ANC);
        loadDashboardData();
      }
    } catch (err) {
      console.error('Failed to save quick ANC:', err);
      toast.error(err.response?.data?.message || 'Failed to record ANC consultation');
    } finally {
      setSavingAnc(false);
    }
  };

  // Export 26-column register to Excel
  const handleExportExcel = async () => {
    try {
      setExportingExcel(true);
      const res = await api.get('/clinical/anc-register/export', { responseType: 'blob' });
      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ANC_Register_Legacy_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('MoH ANC Register downloaded');
    } catch (err) {
      console.error('Export failed:', err);
      toast.error('Failed to export register');
    } finally {
      setExportingExcel(false);
    }
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6 text-slate-800 font-sans">

      {/* ── Simple, Clean Institutional Header ── */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              MoH Rwanda HMIS Standard
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              Antenatal Care & Midwifery
            </span>
            {activeShift ? (
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Active Shift: {activeShift.nursing_ward || 'Midwifery Station'}
              </span>
            ) : (
              <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                Duty: Standby
              </span>
            )}
          </div>

          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Midwife Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Legacy Clinics • Maternal Triage, Consultations & HMIS Statutory Records
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleExportExcel}
            disabled={exportingExcel}
            className="px-3.5 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <Download size={14} className="text-slate-600" />
            {exportingExcel ? 'Exporting...' : 'Export Excel'}
          </button>

          <button
            onClick={() => navigate('/nursing-hub/anc-register')}
            className="px-3.5 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <FileSpreadsheet size={14} className="text-slate-600" />
            Open 26-Col Register
          </button>

          <button
            onClick={handleOpenQuickAnc}
            className="px-4 py-2 rounded-lg bg-[#1B669E] hover:bg-[#155280] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Plus size={15} />
            Record ANC Entry
          </button>
        </div>
      </div>

      {/* ── Clean Metric Counter Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">

        {/* Metric 1 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Consults</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">{stats?.total_entries ?? 0}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            New: {stats?.new_cases ?? 0} • Return: {stats?.old_cases ?? 0}
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">1st Trimester (≤12w)</span>
          <div className="text-2xl font-bold text-emerald-700 mt-1">{stats?.ind_6_first_trim ?? 0}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            {stats?.total_entries ? `${Math.round(((stats.ind_6_first_trim || 0) / stats.total_entries) * 100)}% early booking` : 'Early bookings'}
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Adolescents (&lt;20y)</span>
          <div className="text-2xl font-bold text-slate-800 mt-1">
            {(stats?.ind_2_under_15 ?? 0) + (stats?.ind_3_15_19 ?? 0)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            &lt;15y: {stats?.ind_2_under_15 ?? 0} • 15-19y: {stats?.ind_3_15_19 ?? 0}
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">High Risk Detected</span>
          <div className="text-2xl font-bold text-amber-700 mt-1">{stats?.ind_9_high_risk_detected ?? 0}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            Referred: {stats?.ind_10_high_risk_referred ?? 0}
          </div>
        </div>

        {/* Metric 5 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">With Male Partner</span>
          <div className="text-2xl font-bold text-slate-800 mt-1">{stats?.ind_7_with_partner ?? 0}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            Partner tested: {stats?.ind_23_partner_hiv_tested ?? 0}
          </div>
        </div>

        {/* Metric 6 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">HIV Screened</span>
          <div className="text-2xl font-bold text-slate-800 mt-1">{stats?.ind_19_hiv_tested ?? 0}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            Pos: {stats?.ind_20_hiv_positive ?? 0} • ARV: {stats?.ind_22_hiv_arv_started ?? 0}
          </div>
        </div>

      </div>

      {/* ── Midwifery Workspace: Patient Selector & Clinical Calculator ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left 2 Cols: Active Maternal Patient Selector */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Active Maternal Patient Workspace</h3>
                <p className="text-xs text-slate-500">Search a mother by Name, PID, or Phone to launch clinical triage or record ANC.</p>
              </div>

              {selectedPatient && (
                <button
                  onClick={() => setSelectedPatient(null)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                >
                  Clear Selection
                </button>
              )}
            </div>

            <PatientAutocomplete
              value={selectedPatient?.full_name || ''}
              onChange={(val) => {
                if (selectedPatient && val !== selectedPatient.full_name) {
                  setSelectedPatient(null);
                }
              }}
              onPatientSelect={handlePatientSelect}
              className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm font-semibold text-slate-800 focus:outline-none focus:border-[#1B669E] focus:ring-2 focus:ring-[#1B669E]/20 shadow-xs transition-all"
              inputStyle={{
                width: '100%',
                height: '46px',
                fontSize: '0.9rem',
                fontWeight: 600
              }}
            />

            {selectedPatient ? (
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{selectedPatient.full_name}</h4>
                    <p className="text-xs font-mono text-slate-600">PID: #{selectedPatient.pid}</p>
                  </div>

                  <span className="text-xs font-medium px-2.5 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
                    {selectedPatient.insurance || selectedPatient.referrer_name || 'Walk-in / Private'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2 border-t border-slate-200">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Age</span>
                    <span className="font-bold text-slate-800">
                      {selectedPatient.calculatedAge || selectedPatient.age || '—'} years
                    </span>
                    {selectedPatient.dob && (
                      <span className="text-[10px] text-slate-500 block">DOB: {selectedPatient.dob}</span>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Gender</span>
                    <span className="font-bold text-slate-800">{selectedPatient.gender || 'Female'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Phone</span>
                    <span className="font-bold text-slate-800">{selectedPatient.phone || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Allergies</span>
                    <span className={`font-bold ${selectedPatient.allergies ? 'text-red-700' : 'text-slate-700'}`}>
                      {selectedPatient.allergies || 'None Reported'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    onClick={() => navigate(`/patients/${selectedPatient.pid}/clinical-sheet`)}
                    className="flex-1 py-2 px-3 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <FileText size={14} className="text-slate-600" /> Open Clinical Sheet & MAR
                  </button>

                  <button
                    onClick={handleOpenQuickAnc}
                    className="flex-1 py-2 px-3 rounded-lg bg-[#1B669E] hover:bg-[#155280] text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Plus size={14} /> Record ANC Consultation
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center border border-dashed border-slate-200 rounded-lg bg-slate-50/50">
                <p className="text-xs font-semibold text-slate-600">No Patient Currently Selected</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Use the search bar above to look up a mother before recording consultations.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Quick Midwife Obstetric Calculator */}
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Obstetric GA & EDD Calculator</h3>
              <p className="text-[11px] text-slate-500">Calculated via Naegele's 280-day rule</p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Last Menstrual Period (LMP) Date
                </label>
                <input
                  type="date"
                  value={lmpDate}
                  onChange={(e) => handleCalculateEdd(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:outline-none focus:border-[#1B669E]"
                />
              </div>

              {calcResult ? (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Gestational Age:</span>
                    <span className="font-bold text-slate-900">
                      {calcResult.weeks} wks + {calcResult.days} d
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Trimester:</span>
                    <span className="font-semibold text-slate-800">
                      {calcResult.trimester}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-200 pt-2">
                    <span className="text-slate-500 font-medium">Est. Due Date (EDD):</span>
                    <span className="font-mono font-bold text-slate-900">
                      {calcResult.eddDisplay}
                    </span>
                  </div>

                  {calcResult.isFirstTrimester && (
                    <div className="text-[11px] text-emerald-800 font-semibold bg-emerald-50 p-2 rounded border border-emerald-200">
                      Eligible for HMIS Ind. 6 (1st Trimester Booking ≤12w)
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 text-center bg-slate-50 rounded-lg text-slate-400 text-[11px]">
                  Select the mother's LMP date to calculate Gestational Age and Expected Delivery Date.
                </div>
              )}
            </div>

            {/* Quick WHO Danger Signs Reminder */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-1 text-xs">
              <span className="font-bold text-amber-900 block text-[11px]">
                WHO Obstetric Danger Signs:
              </span>
              <p className="text-amber-800 text-[11px] leading-relaxed">
                Vaginal bleeding • Severe headache / blurred vision (BP ≥ 140/90) • Reduced fetal movements • Convulsions • Fever & chills • Severe abdominal pain.
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* ── Midwifery Operational Log Tabs ── */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">

        {/* Navigation Tabs Header */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('anc_recent')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${activeTab === 'anc_recent'
                ? 'bg-white text-slate-900 border border-slate-200 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              Recent ANC Entries ({recentAnc.length})
            </button>

            <button
              onClick={() => setActiveTab('high_risk')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${activeTab === 'high_risk'
                ? 'bg-amber-100/70 text-amber-900 border border-amber-200 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              High-Risk Watchlist ({highRiskList.length})
            </button>

            <button
              onClick={() => setActiveTab('clinical_sheets')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${activeTab === 'clinical_sheets'
                ? 'bg-white text-slate-900 border border-slate-200 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              Clinical Observation Sheets ({recentClinical.length})
            </button>
          </div>

          <button
            onClick={() => navigate('/nursing-hub/anc-register')}
            className="text-xs font-semibold text-[#1B669E] hover:underline flex items-center gap-1"
          >
            Full 26-Col Register View <ChevronRight size={13} />
          </button>
        </div>

        {/* Tab Content Display */}
        <div className="overflow-x-auto">
          {activeTab === 'anc_recent' && (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4">Mother Name</th>
                  <th className="py-2.5 px-3">PID</th>
                  <th className="py-2.5 px-3 text-center">Age</th>
                  <th className="py-2.5 px-3">GA (Wks)</th>
                  <th className="py-2.5 px-3">Case</th>
                  <th className="py-2.5 px-4">Key HMIS Indicators</th>
                  <th className="py-2.5 px-4">Insurance</th>
                  <th className="py-2.5 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {recentAnc.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-slate-400">
                      No ANC consultations logged yet. Click "Record ANC Entry" above to add the first mother.
                    </td>
                  </tr>
                ) : (
                  recentAnc.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-4 font-mono text-slate-800 whitespace-nowrap">{row.visit_date}</td>
                      <td className="py-2.5 px-4 font-bold text-slate-900">{row.patient_name}</td>
                      <td className="py-2.5 px-3 font-mono font-medium text-slate-700">#{row.pid || '—'}</td>
                      <td className="py-2.5 px-3 text-center font-medium">{row.age || '—'}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">{row.gestational_age_weeks ? `${row.gestational_age_weeks}w` : '—'}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${row.case_type === 'New case' ? 'bg-blue-50 text-blue-800' : 'bg-slate-100 text-slate-700'}`}>
                          {row.case_type}
                        </span>
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {row.ind_6_first_trim && <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-semibold">1st Trim</span>}
                          {row.ind_7_with_partner && <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200 text-[10px] font-semibold">Partner</span>}
                          {row.ind_9_high_risk_detected && <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-semibold">High Risk</span>}
                          {row.ind_19_hiv_tested && <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200 text-[10px] font-semibold">HIV Tested</span>}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-slate-600 truncate max-w-[130px]">{row.insurance || 'Walk-in'}</td>
                      <td className="py-2.5 px-4 text-center">
                        <button
                          onClick={() => navigate('/nursing-hub/anc-register')}
                          className="text-[11px] font-semibold text-[#1B669E] hover:underline"
                        >
                          View in Register
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {activeTab === 'high_risk' && (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-amber-50 text-amber-900 uppercase text-[10px] font-bold border-b border-amber-200">
                <tr>
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4">Mother Name</th>
                  <th className="py-2.5 px-3">PID</th>
                  <th className="py-2.5 px-3">Age</th>
                  <th className="py-2.5 px-4">Identified Danger Signs / Risk Factor</th>
                  <th className="py-2.5 px-3">Referred?</th>
                  <th className="py-2.5 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100 text-slate-700">
                {highRiskList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400">
                      No high-risk maternal patients currently flagged.
                    </td>
                  </tr>
                ) : (
                  highRiskList.map((row) => (
                    <tr key={row.id} className="hover:bg-amber-50/40 transition-colors">
                      <td className="py-2.5 px-4 font-mono font-medium text-slate-800">{row.visit_date}</td>
                      <td className="py-2.5 px-4 font-bold text-slate-900">{row.patient_name}</td>
                      <td className="py-2.5 px-3 font-mono font-medium text-slate-700">#{row.pid || '—'}</td>
                      <td className="py-2.5 px-3 font-medium">{row.age || '—'}</td>
                      <td className="py-2.5 px-4 text-amber-900 font-medium">
                        {row.danger_signs || row.clinical_notes || 'High risk detected during obstetric examination'}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${row.ind_10_high_risk_referred ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-900 border border-amber-200'}`}>
                          {row.ind_10_high_risk_referred ? 'Referred' : 'In Facility'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <button
                          onClick={() => {
                            if (row.pid) navigate(`/patients/${row.pid}/clinical-sheet`);
                            else navigate('/nursing-hub/anc-register');
                          }}
                          className="text-[11px] font-semibold text-amber-800 hover:underline"
                        >
                          Open Clinical Sheet
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {activeTab === 'clinical_sheets' && (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Patient Name</th>
                  <th className="py-2.5 px-3">PID</th>
                  <th className="py-2.5 px-3">Gender</th>
                  <th className="py-2.5 px-3">Age</th>
                  <th className="py-2.5 px-4">Insurance</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {recentClinical.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400">
                      No clinical observation sheets logged yet today.
                    </td>
                  </tr>
                ) : (
                  recentClinical.map((row) => (
                    <tr key={row.patient_id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-4 font-bold text-slate-900">{row.patient_name || row.name}</td>
                      <td className="py-2.5 px-3 font-mono font-medium text-slate-700">#{row.patient_id}</td>
                      <td className="py-2.5 px-3">{row.gender || 'Female'}</td>
                      <td className="py-2.5 px-3 font-medium">{row.age || '—'}</td>
                      <td className="py-2.5 px-4 text-slate-600">{row.insurance || 'Walk-in'}</td>
                      <td className="py-2.5 px-3">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                          {row.status || 'Draft'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <button
                          onClick={() => navigate(`/patients/${row.patient_id}/clinical-sheet?queue_id=${row.queue_id || ''}`)}
                          className="text-[11px] font-semibold text-[#1B669E] hover:underline"
                        >
                          Continue Sheet
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

      </div>

      {/* ── Midwifery Quick Action Dock ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'ANC Register', icon: <Heart size={18} className="text-[#1B669E]" />, path: '/nursing-hub/anc-register' },
          { label: 'Nursing Hub', icon: <Stethoscope size={18} className="text-slate-700" />, path: '/nursing-hub' },
          { label: 'Shift Roster', icon: <Clock size={18} className="text-slate-700" />, path: '/shifts' },
          { label: 'Daily Report', icon: <Activity size={18} className="text-slate-700" />, path: '/nursing-hub/daily-report' },
          { label: 'Consumables', icon: <FileText size={18} className="text-slate-700" />, path: '/consumables-log' },
          { label: 'Incident Report', icon: <AlertTriangle size={18} className="text-slate-700" />, path: '/incidents' }
        ].map((act, i) => (
          <button
            key={i}
            onClick={() => navigate(act.path)}
            className="p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors flex items-center gap-2.5 cursor-pointer text-left"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
              {act.icon}
            </div>
            <span className="text-xs font-semibold text-slate-800">{act.label}</span>
          </button>
        ))}
      </div>

      {/* ── MODAL: Quick ANC Consultation Record ── */}
      {isQuickAncOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl border border-slate-200 max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-xl">

            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-slate-900">
              <div className="flex items-center gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Record Antenatal Care Consultation</h3>
                  <p className="text-xs text-slate-500"></p>
                </div>
                {lastAutoSavedAt && (
                  <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200 shadow-xs">
                    <CheckCircle2 size={12} className="text-emerald-600" />
                    Autosaved {lastAutoSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {hasDraft && (
                  <button
                    type="button"
                    onClick={handleDiscardDraft}
                    className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1 rounded border border-rose-200 transition-colors"
                  >
                    Discard Draft
                  </button>
                )}
                <button
                  onClick={() => setIsQuickAncOpen(false)}
                  className="p-1 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveQuickAnc} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">

              {/* Patient Autocomplete from Sukraa */}
              <div className="p-3.5 bg-slate-50 border border-slate-300 rounded-xl space-y-2 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-[#1B669E] text-white flex items-center justify-center">
                      <Search size={12} />
                    </div>
                    Search Patient
                  </label>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Auto-populates Name
                  </span>
                </div>

                <PatientAutocomplete
                  value={quickForm.patient_name}
                  onChange={(val) => setQuickForm(p => ({ ...p, patient_name: val }))}
                  onPatientSelect={handleModalPatientSelect}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm font-semibold text-slate-900 focus:outline-none focus:border-[#1B669E] focus:ring-2 focus:ring-[#1B669E]/20 transition-all shadow-xs"
                  inputStyle={{
                    width: '100%',
                    height: '46px',
                    fontSize: '0.9rem',
                    fontWeight: 600
                  }}
                />
              </div>

              {/* Live Maternal Profile Banner (When Mother is Identified) */}
              {quickForm.patient_name && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-[#1B669E] text-white flex items-center justify-center text-xs font-bold uppercase shrink-0">
                      {quickForm.patient_name.trim().charAt(0) || 'M'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-xs">{quickForm.patient_name}</span>
                        {quickForm.pid && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-600">
                            PID: #{quickForm.pid}
                          </span>
                        )}
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold">
                          ♀ Female Verified
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5 flex-wrap">
                        <span>Age: <strong className="text-slate-700">{quickForm.age ? `${quickForm.age} yrs` : '—'}</strong></span>
                        <span>•</span>
                        <span>Insurance: <strong className="text-slate-700">{quickForm.insurance || 'Walk-in / Private'}</strong></span>
                        {quickForm.dob && (
                          <>
                            <span>•</span>
                            <span>DoB: <strong className="text-slate-700">{quickForm.dob}</strong></span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Visit Date *</label>
                  <input
                    type="date"
                    required
                    value={quickForm.visit_date}
                    onChange={(e) => setQuickForm(p => ({ ...p, visit_date: e.target.value }))}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:outline-none focus:border-[#1B669E]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Mother Full Name *</label>
                  <PatientAutocomplete
                    value={quickForm.patient_name}
                    onChange={(val) => setQuickForm(p => ({ ...p, patient_name: val }))}
                    onPatientSelect={handleModalPatientSelect}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:outline-none focus:border-[#1B669E]"
                    inputStyle={{
                      width: '100%',
                      height: '32px',
                      fontSize: '0.75rem',
                      fontWeight: 500
                    }}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">PID (Patient ID)</label>
                  <input
                    type="text"
                    value={quickForm.pid}
                    onChange={(e) => setQuickForm(p => ({ ...p, pid: e.target.value }))}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-medium focus:bg-white focus:outline-none focus:border-[#1B669E]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-600">Date of Birth (DoB)</label>
                    <span className="text-[10px] text-slate-400">From Sukraa</span>
                  </div>
                  <input
                    type="date"
                    value={quickForm.dob || ''}
                    onChange={(e) => {
                      const dobVal = e.target.value;
                      const calcAge = calculateAgeFromDob(dobVal);
                      const num = parseInt(calcAge, 10);
                      setQuickForm(p => ({
                        ...p,
                        dob: dobVal,
                        age: calcAge || p.age,
                        ...(calcAge && !isNaN(num) ? {
                          ind_2_under_15: num < 15,
                          ind_3_15_19: num >= 15 && num <= 19,
                          ind_4_20_24: num >= 20 && num <= 24,
                          ind_5_25_plus: num >= 25
                        } : {})
                      }));
                    }}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:outline-none focus:border-[#1B669E]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-600">Age (Years) *</label>
                    {quickForm.dob && <span className="text-[10px] text-emerald-700 font-semibold">From DoB ✓</span>}
                  </div>
                  <input
                    type="number"
                    required
                    value={quickForm.age}
                    onChange={(e) => {
                      const ageVal = e.target.value;
                      const num = parseInt(ageVal, 10);
                      setQuickForm(p => ({
                        ...p,
                        age: ageVal,
                        ind_2_under_15: num < 15,
                        ind_3_15_19: num >= 15 && num <= 19,
                        ind_4_20_24: num >= 20 && num <= 24,
                        ind_5_25_plus: num >= 25
                      }));
                    }}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:outline-none focus:border-[#1B669E]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Case Type</label>
                  <select
                    value={quickForm.case_type}
                    onChange={(e) => setQuickForm(p => ({ ...p, case_type: e.target.value, ind_1_new_reg: e.target.value === 'New case' }))}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:outline-none focus:border-[#1B669E]"
                  >
                    <option value="New case">New case (Premier contact)</option>
                    <option value="Old case">Old case (Follow-up)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Gestational Age (Wks)</label>
                  <input
                    type="number"
                    value={quickForm.gestational_age_weeks}
                    onChange={(e) => {
                      const val = e.target.value;
                      const w = parseFloat(val);
                      setQuickForm(p => ({
                        ...p,
                        gestational_age_weeks: val,
                        ind_6_first_trim: !isNaN(w) && w <= 12
                      }));
                    }}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:outline-none focus:border-[#1B669E]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Blood Pressure</label>
                  <input
                    type="text"
                    value={quickForm.blood_pressure}
                    onChange={(e) => setQuickForm(p => ({ ...p, blood_pressure: e.target.value }))}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:outline-none focus:border-[#1B669E]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Health Insurance</label>
                  <select
                    value={quickForm.insurance || ''}
                    onChange={(e) => setQuickForm(p => ({ ...p, insurance: e.target.value }))}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:outline-none focus:border-[#1B669E]"
                  >
                    <option value="">Select Insurance / Payer</option>
                    {quickForm.insurance && !INSURANCES.includes(quickForm.insurance) && (
                      <option key={`sukraa-${quickForm.insurance}`} value={quickForm.insurance}>{quickForm.insurance} (From Sukraa)</option>
                    )}
                    {Array.from(new Set(INSURANCES)).map(ins => (
                      <option key={ins} value={ins}>{ins}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Statutory Indicators Checklist */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="font-bold text-slate-800 uppercase text-[11px] block">
                  Statutory HMIS Indicators Checklist
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  <label className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100/70">
                    <input
                      type="checkbox"
                      checked={quickForm.ind_6_first_trim}
                      onChange={(e) => setQuickForm(p => ({ ...p, ind_6_first_trim: e.target.checked }))}
                      className="w-3.5 h-3.5 rounded text-[#1B669E]"
                    />
                    <span className="font-medium text-slate-800">6. 1st Trim (≤12w)</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100/70">
                    <input
                      type="checkbox"
                      checked={quickForm.ind_7_with_partner}
                      onChange={(e) => setQuickForm(p => ({ ...p, ind_7_with_partner: e.target.checked }))}
                      className="w-3.5 h-3.5 rounded text-[#1B669E]"
                    />
                    <span className="font-medium text-slate-800">7. With Partner</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100/70">
                    <input
                      type="checkbox"
                      checked={quickForm.ind_8_four_visits}
                      onChange={(e) => setQuickForm(p => ({ ...p, ind_8_four_visits: e.target.checked }))}
                      className="w-3.5 h-3.5 rounded text-[#1B669E]"
                    />
                    <span className="font-medium text-slate-800">8. 4 Visits Done</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 bg-amber-50/70 border border-amber-200 rounded-lg cursor-pointer hover:bg-amber-100/50">
                    <input
                      type="checkbox"
                      checked={quickForm.ind_9_high_risk_detected}
                      onChange={(e) => setQuickForm(p => ({ ...p, ind_9_high_risk_detected: e.target.checked }))}
                      className="w-3.5 h-3.5 rounded text-amber-600"
                    />
                    <span className="font-medium text-amber-900">9. High Risk Det.</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 bg-amber-50/70 border border-amber-200 rounded-lg cursor-pointer hover:bg-amber-100/50">
                    <input
                      type="checkbox"
                      checked={quickForm.ind_10_high_risk_referred}
                      onChange={(e) => setQuickForm(p => ({ ...p, ind_10_high_risk_referred: e.target.checked }))}
                      className="w-3.5 h-3.5 rounded text-amber-600"
                    />
                    <span className="font-medium text-amber-900">10. High Risk Ref.</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100/70">
                    <input
                      type="checkbox"
                      checked={quickForm.ind_11_tt1}
                      onChange={(e) => setQuickForm(p => ({ ...p, ind_11_tt1: e.target.checked }))}
                      className="w-3.5 h-3.5 rounded text-[#1B669E]"
                    />
                    <span className="font-medium text-slate-800">11. TT 1 Given</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100/70">
                    <input
                      type="checkbox"
                      checked={quickForm.ind_14_iron_folic}
                      onChange={(e) => setQuickForm(p => ({ ...p, ind_14_iron_folic: e.target.checked }))}
                      className="w-3.5 h-3.5 rounded text-[#1B669E]"
                    />
                    <span className="font-medium text-slate-800">14. Iron + Folate</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100/70">
                    <input
                      type="checkbox"
                      checked={quickForm.ind_16_syphilis_tested}
                      onChange={(e) => setQuickForm(p => ({ ...p, ind_16_syphilis_tested: e.target.checked }))}
                      className="w-3.5 h-3.5 rounded text-[#1B669E]"
                    />
                    <span className="font-medium text-slate-800">16. Syph. Tested</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100/70">
                    <input
                      type="checkbox"
                      checked={quickForm.ind_19_hiv_tested}
                      onChange={(e) => setQuickForm(p => ({ ...p, ind_19_hiv_tested: e.target.checked }))}
                      className="w-3.5 h-3.5 rounded text-[#1B669E]"
                    />
                    <span className="font-medium text-slate-800">19. HIV Tested</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100/70">
                    <input
                      type="checkbox"
                      checked={quickForm.ind_23_partner_hiv_tested}
                      onChange={(e) => setQuickForm(p => ({ ...p, ind_23_partner_hiv_tested: e.target.checked }))}
                      className="w-3.5 h-3.5 rounded text-[#1B669E]"
                    />
                    <span className="font-medium text-slate-800">23. Part. HIV Test</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100/70">
                    <input
                      type="checkbox"
                      checked={quickForm.ind_25_malaria_screened}
                      onChange={(e) => setQuickForm(p => ({ ...p, ind_25_malaria_screened: e.target.checked }))}
                      className="w-3.5 h-3.5 rounded text-[#1B669E]"
                    />
                    <span className="font-medium text-slate-800">25. Malaria / Net</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100/70">
                    <input
                      type="checkbox"
                      checked={quickForm.ind_26_ultrasound_other}
                      onChange={(e) => setQuickForm(p => ({ ...p, ind_26_ultrasound_other: e.target.checked }))}
                      className="w-3.5 h-3.5 rounded text-[#1B669E]"
                    />
                    <span className="font-medium text-slate-800">26. Obst. Ultrasound</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Clinical Remarks / Danger Signs</label>
                <textarea
                  rows={2}
                  value={quickForm.clinical_notes}
                  onChange={(e) => setQuickForm(p => ({ ...p, clinical_notes: e.target.value }))}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:outline-none focus:border-[#1B669E]"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsQuickAncOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingAnc}
                  className="px-4 py-1.5 rounded-lg bg-[#1B669E] hover:bg-[#155280] text-white text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {savingAnc ? 'Saving...' : 'Save to Register'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
