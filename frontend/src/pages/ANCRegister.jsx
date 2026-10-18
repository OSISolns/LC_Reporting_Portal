import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Plus,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  X,
  Edit3,
  Trash2,
  Download,
  AlertCircle,
  CheckCircle2,
  User,
  Filter,
  Stethoscope,
  Activity,
  Sparkles,
  Check,
  Info,
  ShieldAlert,
  HeartPulse,
  Clock,
  FileText,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import PatientAutocomplete from '../components/PatientAutocomplete';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { INSURANCES } from './refunds/constants';

import {
  INDICATOR_COLUMNS,
  calculateAgeFromDob,
  formatDobForDateInput,
  INDICATOR_CATEGORIES,
  QUICK_DANGER_SIGNS,
  HIGH_RISK_INDICATOR_KEYS,
  analyzeBloodPressure,
  analyzeGestationalAge
} from '../utils/ancUtils';

const INITIAL_FORM_STATE = {
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
  fundal_height_cm: '',
  blood_pressure: '',
  weight_kg: '',
  estimated_delivery_date: '',
  clinical_notes: '',
  danger_signs: '',
  ind_1_new_reg: false,
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

export default function ANCRegister() {
  const { user } = useAuth();

  // Data state
  const [entries, setEntries] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [caseTypeFilter, setCaseTypeFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState('');

  // Pagination state
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [modalTab, setModalTab] = useState('all'); // 'all', 'demographics', 'clinical', 'indicators', 'notes'
  const [indicatorCategory, setIndicatorCategory] = useState('all');
  const [lastAutoSavedAt, setLastAutoSavedAt] = useState(null);
  const [hasDraft, setHasDraft] = useState(false);
  const DRAFT_STORAGE_KEY = `lumina_draft_anc_register_${user?.id || 'guest'}`;

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
    } catch (e) {}
  }, [DRAFT_STORAGE_KEY]);

  // Debounced Autosave (600ms) - only for new entries
  useEffect(() => {
    if (!isModalOpen || editingId) return;

    const hasInput = Boolean(
      formData.patient_name?.trim() ||
      formData.pid?.trim() ||
      formData.clinical_notes?.trim() ||
      formData.blood_pressure?.trim() ||
      formData.gestational_age_weeks ||
      formData.danger_signs?.trim()
    );

    if (!hasInput) return;

    const timer = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(formData));
        setLastAutoSavedAt(new Date());
        setHasDraft(true);
      } catch (err) {
        console.warn('Failed to autosave register draft:', err);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [formData, isModalOpen, editingId, DRAFT_STORAGE_KEY]);

  // Load entries & stats
  const fetchEntries = async (page = 1) => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: pagination.limit,
        search: searchQuery || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        case_type: caseTypeFilter || undefined,
        high_risk: riskFilter || undefined
      };

      const [entriesRes, statsRes] = await Promise.all([
        api.get('/clinical/anc-register', { params }),
        api.get('/clinical/anc-register/stats', { params: { startDate: startDate || undefined, endDate: endDate || undefined } })
      ]);

      if (entriesRes.data?.success) {
        setEntries(entriesRes.data.data);
        if (entriesRes.data.pagination) {
          setPagination(entriesRes.data.pagination);
        }
      }

      if (statsRes.data?.success) {
        setStats(statsRes.data.data);
      }
    } catch (err) {
      console.error('Failed to load ANC register:', err);
      toast.error('Failed to load ANC register records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries(1);
  }, [startDate, endDate, caseTypeFilter, riskFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchEntries(1);
  };

  // Open modal for Create
  const handleOpenCreate = () => {
    setEditingId(null);
    setModalTab('all');
    setIndicatorCategory('all');
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && (parsed.patient_name || parsed.pid || parsed.clinical_notes || parsed.blood_pressure)) {
          setFormData(parsed);
          setLastAutoSavedAt(new Date());
          setHasDraft(true);
          toast.success('Restored autosaved draft', { id: 'reg-draft-restore' });
          setIsModalOpen(true);
          return;
        }
      }
    } catch (e) {}
    setFormData(INITIAL_FORM_STATE);
    setIsModalOpen(true);
  };

  // Discard autosaved draft
  const handleDiscardDraft = () => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch (e) {}
    setFormData(INITIAL_FORM_STATE);
    setLastAutoSavedAt(null);
    setHasDraft(false);
    toast('Draft cleared', { icon: '🗑️' });
  };

  // Open modal for Edit
  const handleOpenEdit = (entry) => {
    setEditingId(entry.id);
    const populated = { ...INITIAL_FORM_STATE };
    Object.keys(populated).forEach(k => {
      if (k.startsWith('ind_')) {
        populated[k] = Boolean(entry[k]);
      } else {
        populated[k] = entry[k] !== null && entry[k] !== undefined ? entry[k] : '';
      }
    });
    setFormData(populated);
    setModalTab('all');
    setIndicatorCategory('all');
    setIsModalOpen(true);
  };

  // Handle DoB change - auto-calculate age in years
  const handleDobChange = (dobVal) => {
    const calculatedAge = calculateAgeFromDob(dobVal);
    const numAge = parseInt(calculatedAge, 10);
    setFormData(prev => {
      const updated = { ...prev, dob: dobVal };
      if (calculatedAge) {
        updated.age = calculatedAge;
        if (!isNaN(numAge)) {
          updated.ind_2_under_15 = numAge < 15;
          updated.ind_3_15_19 = numAge >= 15 && numAge <= 19;
          updated.ind_4_20_24 = numAge >= 20 && numAge <= 24;
          updated.ind_5_25_plus = numAge >= 25;
        }
      }
      return updated;
    });
  };

  // Auto-calculate age category when age is entered/edited directly
  const handleAgeChange = (ageVal) => {
    const numAge = parseInt(ageVal, 10);
    setFormData(prev => {
      const updated = { ...prev, age: ageVal };
      if (!isNaN(numAge)) {
        updated.ind_2_under_15 = numAge < 15;
        updated.ind_3_15_19 = numAge >= 15 && numAge <= 19;
        updated.ind_4_20_24 = numAge >= 20 && numAge <= 24;
        updated.ind_5_25_plus = numAge >= 25;
      }
      return updated;
    });
  };

  // Clinical Indicator Presets
  const handleApplyPreset = (presetType) => {
    if (presetType === 'first_contact') {
      const weeks = parseFloat(formData.gestational_age_weeks);
      setFormData(prev => ({
        ...prev,
        case_type: 'New case',
        ind_1_new_reg: true,
        ind_6_first_trim: !isNaN(weeks) && weeks <= 12,
        ind_14_iron_folic: true,
        ind_16_syphilis_tested: true,
        ind_19_hiv_tested: true,
        ind_21_hiv_result_received: true,
        ind_25_malaria_screened: true
      }));
      toast.success('Applied standard 1st Contact clinical preset');
    } else if (presetType === 'follow_up') {
      setFormData(prev => ({
        ...prev,
        case_type: 'Old case',
        ind_1_new_reg: false,
        ind_14_iron_folic: true,
        ind_25_malaria_screened: true
      }));
      toast.success('Applied routine follow-up preset');
    } else if (presetType === 'clear') {
      const ageVal = parseInt(formData.age, 10);
      setFormData(prev => {
        const reset = { ...prev };
        INDICATOR_COLUMNS.forEach(col => {
          reset[col.key] = false;
        });
        if (!isNaN(ageVal)) {
          if (ageVal < 15) reset.ind_2_under_15 = true;
          else if (ageVal <= 19) reset.ind_3_15_19 = true;
          else if (ageVal <= 24) reset.ind_4_20_24 = true;
          else reset.ind_5_25_plus = true;
        }
        return reset;
      });
      toast.success('Indicators reset');
    }
  };

  // Add Danger Sign chip directly into textarea & flag high risk
  const handleAddDangerSign = (sign) => {
    setFormData(prev => {
      const existing = prev.danger_signs ? prev.danger_signs.trim() : '';
      const updated = existing ? `${existing}; ${sign}` : sign;
      return {
        ...prev,
        danger_signs: updated,
        ind_9_high_risk_detected: true
      };
    });
    toast.success(`Flagged: "${sign}" (High Risk Ind. 9 Active)`);
  };

  // Patient Autocomplete selection from Sukraa
  const handlePatientSelect = (p) => {
    // Check gender: ANC is strictly for female maternal patients
    const rawGender = (p.gender || '').trim().toLowerCase();
    if (rawGender === 'male' || rawGender === 'm') {
      toast.error(`Invalid selection: ${p.full_name || p.name} is Male. ANC Register is strictly for female maternal patients!`, { duration: 6000 });
      return;
    }

    // Calculate exact Age (Years) using DoB from Sukraa, with fallback to p.age
    let calculatedAge = '';
    if (p.dob) {
      calculatedAge = calculateAgeFromDob(p.dob);
    }
    if (!calculatedAge && p.age) {
      calculatedAge = String(p.age);
    }

    const numAge = parseInt(calculatedAge, 10);
    const formattedDob = formatDobForDateInput(p.dob) || p.dob || '';

    setFormData(prev => {
      const updated = {
        ...prev,
        patient_name: p.full_name || p.name || '',
        pid: p.pid ? String(p.pid) : '',
        dob: formattedDob,
        age: calculatedAge,
        sex: 'F',
        insurance: p.insurance || p.referrer_name || 'Walk-in / Private',
        phone: p.phone || ''
      };
      if (!isNaN(numAge)) {
        updated.ind_2_under_15 = numAge < 15;
        updated.ind_3_15_19 = numAge >= 15 && numAge <= 19;
        updated.ind_4_20_24 = numAge >= 20 && numAge <= 24;
        updated.ind_5_25_plus = numAge >= 25;
      }
      return updated;
    });

    const ageMsg = calculatedAge ? ` (Age: ${calculatedAge} yrs)` : '';
    toast.success(`Selected: ${p.full_name || p.name}${ageMsg}`);
  };

  // Save entry
  const handleSaveEntry = async (e) => {
    e.preventDefault();
    if (!formData.patient_name?.trim()) {
      toast.error('Patient name is required');
      return;
    }
    if (!formData.visit_date) {
      toast.error('Visit date is required');
      return;
    }
    if (formData.sex === 'M' || formData.sex === 'Male') {
      toast.error('ANC Register is strictly for female maternal patients. Gender must be Female.');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        ...formData,
        reg_date: formData.visit_date,
        patient_id: formData.pid || '',
        edd: formData.estimated_delivery_date || '',
        parity_gravida: formData.parity || formData.gravida ? `G${formData.gravida || 0}P${formData.parity || 0}` : '',
        clinical_notes: [formData.clinical_notes, formData.danger_signs ? `Danger signs: ${formData.danger_signs}` : ''].filter(Boolean).join(' | ')
      };

      if (editingId) {
        await api.put(`/clinical/anc-register/${editingId}`, payload);
        toast.success('Register entry updated');
      } else {
        await api.post('/clinical/anc-register', payload);
        toast.success('Recorded in ANC register');
        try {
          localStorage.removeItem(DRAFT_STORAGE_KEY);
        } catch (e) {}
        setLastAutoSavedAt(null);
        setHasDraft(false);
      }
      setIsModalOpen(false);
      fetchEntries(pagination.page);
    } catch (err) {
      console.error('Failed to save ANC entry:', err);
      toast.error(err.response?.data?.message || 'Failed to save record');
    } finally {
      setSaving(false);
    }
  };

  // Delete entry
  const handleDeleteEntry = async (id) => {
    try {
      await api.delete(`/clinical/anc-register/${id}`);
      toast.success('Entry deleted');
      setDeleteConfirmId(null);
      fetchEntries(pagination.page);
    } catch (err) {
      console.error('Failed to delete entry:', err);
      toast.error('Failed to delete entry');
    }
  };

  // Export to Excel
  const handleExportExcel = async () => {
    try {
      setExporting(true);
      const res = await api.get('/clinical/anc-register/export', {
        params: {
          startDate: startDate || undefined,
          endDate: endDate || undefined
        },
        responseType: 'blob'
      });

      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ANC_Register_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Excel register downloaded');
    } catch (err) {
      console.error('Export failed:', err);
      toast.error('Failed to export register');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-5 text-slate-800 font-sans">

      {/* ── Simple, Clean Institutional Header ── */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              MoH Rwanda HMIS Standard
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              26-Indicator Statutory Ledger
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Antenatal Care (ANC) & Midwifery Register
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Legacy Clinics • Department of Midwifery & Obstetrics
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            disabled={exporting}
            className="px-3.5 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <Download size={14} className="text-slate-600" />
            {exporting ? 'Exporting...' : 'Export Excel'}
          </button>

          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 rounded-lg bg-[#1B669E] hover:bg-[#155280] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Plus size={15} />
            Record New ANC Entry
          </button>
        </div>
      </div>

      {/* ── Clean Metric Counter Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Consults</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">{stats?.total_entries ?? 0}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            New: {stats?.new_cases ?? 0} • Return: {stats?.old_cases ?? 0}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">1st Trimester (≤12w)</span>
          <div className="text-2xl font-bold text-emerald-700 mt-1">{stats?.ind_6_first_trim ?? 0}</div>
          <div className="text-[11px] text-slate-500 mt-1">Early bookings</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Adolescents (&lt;20y)</span>
          <div className="text-2xl font-bold text-slate-800 mt-1">
            {(stats?.ind_2_under_15 ?? 0) + (stats?.ind_3_15_19 ?? 0)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            &lt;15: {stats?.ind_2_under_15 ?? 0} • 15-19: {stats?.ind_3_15_19 ?? 0}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">High Risk Detected</span>
          <div className="text-2xl font-bold text-amber-700 mt-1">{stats?.ind_9_high_risk_detected ?? 0}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            Referred: {stats?.ind_10_high_risk_referred ?? 0}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">With Male Partner</span>
          <div className="text-2xl font-bold text-slate-800 mt-1">{stats?.ind_7_with_partner ?? 0}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            Partner tested: {stats?.ind_23_partner_hiv_tested ?? 0}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">HIV Screened</span>
          <div className="text-2xl font-bold text-slate-800 mt-1">{stats?.ind_19_hiv_tested ?? 0}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            Pos: {stats?.ind_20_hiv_positive ?? 0} • ARV: {stats?.ind_22_hiv_arv_started ?? 0}
          </div>
        </div>

      </div>

      {/* ── Search & Filter Controls ── */}
      <div className="bg-white p-4 rounded-xl border border-slate-200">
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-3">

          <div className="flex-1 min-w-[220px] relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by mother name, PID, or insurance..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:border-[#1B669E]"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <span>Date:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="py-1 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="py-1 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            />
          </div>

          <select
            value={caseTypeFilter}
            onChange={(e) => setCaseTypeFilter(e.target.value)}
            className="py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700"
          >
            <option value="">All Cases</option>
            <option value="New case">New Case</option>
            <option value="Old case">Old Case</option>
          </select>

          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700"
          >
            <option value="">All Risk Statuses</option>
            <option value="1">High Risk Only</option>
          </select>

          <button
            type="submit"
            className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs"
          >
            Filter
          </button>

          {(searchQuery || startDate || endDate || caseTypeFilter || riskFilter) && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setStartDate('');
                setEndDate('');
                setCaseTypeFilter('');
                setRiskFilter('');
              }}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 text-xs hover:bg-slate-50"
            >
              Reset
            </button>
          )}

          <button
            type="button"
            onClick={() => fetchEntries(pagination.page)}
            className="p-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 ml-auto"
            title="Refresh records"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>

        </form>
      </div>

      {/* ── Clean 26-Indicator Register Table ── */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">

        <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div>
            Showing <strong className="text-slate-800">{entries.length}</strong> of <strong className="text-slate-800">{pagination.total}</strong> records
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span><strong className="text-emerald-700 font-bold">✓</strong> = Completed indicator</span>
            <span><strong className="text-amber-700 font-bold">!</strong> = High risk / alert</span>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[620px]">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 z-20 bg-slate-100 text-slate-700 uppercase tracking-wider text-[10px] font-bold border-b border-slate-300">
              <tr>
                <th className="py-2.5 px-2 border-r border-slate-200 text-center w-10">No.</th>
                <th className="py-2.5 px-3 border-r border-slate-200 min-w-[85px]">Date</th>
                <th className="py-2.5 px-3 border-r border-slate-200 min-w-[160px]">Names</th>
                <th className="py-2.5 px-2 border-r border-slate-200 text-center w-12">Age</th>
                <th className="py-2.5 px-2 border-r border-slate-200 text-center w-10">Sex</th>
                <th className="py-2.5 px-2.5 border-r border-slate-200 min-w-[85px]">PID</th>
                <th className="py-2.5 px-2.5 border-r border-slate-200 min-w-[80px] text-center">Case</th>
                <th className="py-2.5 px-3 border-r-2 border-slate-300 min-w-[110px]">Insurance</th>

                {INDICATOR_COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    title={`${col.num}. ${col.label}: ${col.desc}`}
                    className="py-2 px-1 border-r border-slate-200 text-center min-w-[36px] max-w-[44px]"
                  >
                    <div className="font-bold text-[#1B669E] text-[11px]">{col.num}</div>
                    <div className="text-[8px] font-normal text-slate-500 truncate">{col.label.split(' ')[0]}</div>
                  </th>
                ))}

                <th className="py-2.5 px-3 text-center sticky right-0 bg-slate-100 z-30 min-w-[80px]">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={35} className="py-12 text-center text-slate-400">
                    <RefreshCw size={20} className="animate-spin text-slate-400 mx-auto mb-2" />
                    <span>Loading ANC register...</span>
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={35} className="py-12 text-center text-slate-400">
                    No ANC consultations recorded for this filter.
                  </td>
                </tr>
              ) : (
                entries.map((row, idx) => {
                  const rowNumber = (pagination.page - 1) * pagination.limit + idx + 1;
                  const isHighRisk = Boolean(row.ind_9_high_risk_detected || row.ind_10_high_risk_referred);

                  return (
                    <tr
                      key={row.id}
                      className={`hover:bg-slate-50/80 transition-colors ${isHighRisk ? 'bg-amber-50/30' : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                        }`}
                    >
                      <td className="py-2 px-2 border-r border-slate-200 text-center font-mono text-[11px] text-slate-500">
                        {rowNumber}
                      </td>

                      <td className="py-2 px-3 border-r border-slate-200 font-mono text-[11px] text-slate-800 whitespace-nowrap">
                        {row.visit_date}
                      </td>

                      <td className="py-2 px-3 border-r border-slate-200 font-semibold text-slate-900 truncate max-w-[160px]" title={row.patient_name}>
                        {row.patient_name}
                        {row.gestational_age_weeks && (
                          <span className="block text-[10px] text-slate-500 font-normal">
                            GA: {row.gestational_age_weeks}w
                          </span>
                        )}
                      </td>

                      <td className="py-2 px-2 border-r border-slate-200 text-center font-bold text-slate-800 text-[11px]">
                        {row.age || '-'}
                      </td>

                      <td className="py-2 px-2 border-r border-slate-200 text-center text-slate-600 text-[11px]">
                        {row.sex || 'F'}
                      </td>

                      <td className="py-2 px-2.5 border-r border-slate-200 font-mono text-[11px] text-[#1B669E] font-semibold whitespace-nowrap">
                        #{row.pid || '—'}
                      </td>

                      <td className="py-2 px-2.5 border-r border-slate-200 text-center whitespace-nowrap">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${row.case_type === 'New case' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                          {row.case_type === 'New case' ? 'New' : 'Old'}
                        </span>
                      </td>

                      <td className="py-2 px-3 border-r-2 border-slate-300 text-slate-600 text-[11px] truncate max-w-[110px]" title={row.insurance || 'Walk-in'}>
                        {row.insurance || 'Walk-in'}
                      </td>

                      {INDICATOR_COLUMNS.map((col) => {
                        const val = Boolean(row[col.key]);
                        const isRiskCell = (col.key === 'ind_9_high_risk_detected' || col.key === 'ind_10_high_risk_referred') && val;

                        return (
                          <td
                            key={col.key}
                            title={`${col.num}. ${col.label}: ${val ? 'Ticked' : 'No'}`}
                            className={`py-2 px-1 border-r border-slate-200 text-center font-bold text-[11px] ${val ? (
                              isRiskCell ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-emerald-800'
                            ) : 'text-slate-300'
                              }`}
                          >
                            {val ? '✓' : '·'}
                          </td>
                        );
                      })}

                      <td className="py-2 px-3 text-center sticky right-0 bg-white z-10">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(row)}
                            className="p-1 rounded text-slate-500 hover:text-blue-700 hover:bg-slate-100"
                            title="Edit"
                          >
                            <Edit3 size={13} />
                          </button>

                          <button
                            onClick={() => setDeleteConfirmId(row.id)}
                            className="p-1 rounded text-slate-500 hover:text-red-700 hover:bg-slate-100"
                            title="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div>
            Page <strong className="text-slate-800">{pagination.page}</strong> of <strong className="text-slate-800">{pagination.totalPages || 1}</strong>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              disabled={pagination.page <= 1}
              onClick={() => fetchEntries(pagination.page - 1)}
              className="px-2.5 py-1 rounded bg-white border border-slate-300 text-slate-700 font-medium text-xs disabled:opacity-40 hover:bg-slate-50"
            >
              Previous
            </button>

            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => fetchEntries(pagination.page + 1)}
              className="px-2.5 py-1 rounded bg-white border border-slate-300 text-slate-700 font-medium text-xs disabled:opacity-40 hover:bg-slate-50"
            >
              Next
            </button>
          </div>
        </div>

      </div>

      {/* ── MODAL: Create / Edit ANC Statutory Entry (Clean Hospital Style) ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl shadow-xl border border-slate-300 max-w-6xl w-full max-h-[92vh] flex flex-col overflow-hidden">

            {/* Clean Modal Header */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-sky-100 border border-sky-200 flex items-center justify-center text-[#1B669E] shrink-0">
                  <Stethoscope size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">
                      {editingId ? 'Edit ANC Statutory Register Record' : 'Record ANC Consultation (MoH HMIS Register)'}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white border border-slate-200 text-slate-700">
                      MoH HMIS
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Rwanda Standard 26 Statutory Indicators Checklist & Antenatal Care Encounter
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {lastAutoSavedAt && (
                  <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200 shadow-xs">
                    <CheckCircle2 size={12} className="text-emerald-600" />
                    Autosaved {lastAutoSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                )}

                {hasDraft && !editingId && (
                  <button
                    type="button"
                    onClick={handleDiscardDraft}
                    className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2 py-0.5 rounded border border-rose-200 transition-colors"
                  >
                    Discard Draft
                  </button>
                )}

                <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-slate-200 text-[11px]">
                  <FileText size={13} className="text-[#1B669E]" />
                  <span className="font-semibold text-slate-800">
                    {INDICATOR_COLUMNS.reduce((acc, col) => acc + (formData[col.key] ? 1 : 0), 0)}
                  </span>
                  <span className="text-slate-400">/ 26 Ticked</span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Modal Form Scrollable Body */}
            <form onSubmit={handleSaveEntry} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">

              {/* Patient Autocomplete from Sukraa (for new entries) */}
              {!editingId && (
                <div className="p-4 bg-slate-50 border border-slate-300 rounded-xl space-y-2.5 shadow-xs">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <label className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-[#1B669E] text-white flex items-center justify-center">
                        <Search size={13} />
                      </div>
                      Search Patient
                    </label>
                    <span className="text-[11px] text-slate-500 font-medium">
                      Auto-populates Name, PID, DoB, exact Age in Years & Insurance
                    </span>
                  </div>

                  <PatientAutocomplete
                    value={formData.patient_name}
                    onChange={(val) => setFormData(p => ({ ...p, patient_name: val }))}
                    onPatientSelect={handlePatientSelect}
                    className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-sm font-semibold text-slate-900 focus:outline-none focus:border-[#1B669E] focus:ring-2 focus:ring-[#1B669E]/20 transition-all shadow-xs"
                    inputStyle={{
                      width: '100%',
                      height: '48px',
                      fontSize: '0.92rem',
                      fontWeight: 600
                    }}
                  />
                  <div className="flex items-center gap-2 text-[10px] text-slate-400">
                    <span>💡 Tip: Type at least 2 letters of mother's name or enter the Sukraa PID to quickly locate her hospital record.</span>
                  </div>
                </div>
              )}

              {/* Live Maternal Profile Banner (When Mother is Identified) */}
              {formData.patient_name && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#1B669E] text-white flex items-center justify-center text-xs font-bold uppercase shrink-0">
                      {formData.patient_name.trim().charAt(0) || 'M'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-xs">{formData.patient_name}</span>
                        {formData.pid && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-600">
                            PID: {formData.pid}
                          </span>
                        )}
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold">
                          ♀ Female Verified
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5 flex-wrap">
                        <span>Age: <strong className="text-slate-700">{formData.age ? `${formData.age} yrs` : '—'}</strong></span>
                        <span>•</span>
                        <span>Insurance: <strong className="text-slate-700">{formData.insurance || 'Private / Cash'}</strong></span>
                        <span>•</span>
                        <span>Case: <strong className="text-slate-700">{formData.case_type}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Assistive clinical badges */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {analyzeGestationalAge(formData.gestational_age_weeks) && (
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${analyzeGestationalAge(formData.gestational_age_weeks).badgeColor}`}>
                        {analyzeGestationalAge(formData.gestational_age_weeks).label}
                      </span>
                    )}
                    {analyzeBloodPressure(formData.blood_pressure) && (
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${analyzeBloodPressure(formData.blood_pressure).color}`}>
                        {analyzeBloodPressure(formData.blood_pressure).label}
                      </span>
                    )}
                    {(formData.ind_9_high_risk_detected || formData.danger_signs) && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 border border-amber-300 text-amber-900 flex items-center gap-1">
                        <AlertTriangle size={11} className="text-amber-600" />
                        High Risk
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Navigation Segmented Control */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setModalTab('all')}
                  className={`px-3 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${modalTab === 'all'
                      ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                    }`}
                >
                  All Sections (Complete Register)
                </button>
                <button
                  type="button"
                  onClick={() => setModalTab('demographics')}
                  className={`px-3 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${modalTab === 'demographics'
                      ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                    }`}
                >
                  1. Maternal Profile
                </button>
                <button
                  type="button"
                  onClick={() => setModalTab('clinical')}
                  className={`px-3 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${modalTab === 'clinical'
                      ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                    }`}
                >
                  2. Obstetric Vitals
                </button>
                <button
                  type="button"
                  onClick={() => setModalTab('indicators')}
                  className={`px-3 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${modalTab === 'indicators'
                      ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                    }`}
                >
                  <span>3. MoH Checklist</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${INDICATOR_COLUMNS.reduce((acc, col) => acc + (formData[col.key] ? 1 : 0), 0) > 0
                      ? 'bg-sky-100 text-[#1B669E]'
                      : 'bg-slate-200 text-slate-600'
                    }`}>
                    {INDICATOR_COLUMNS.reduce((acc, col) => acc + (formData[col.key] ? 1 : 0), 0)}/26
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setModalTab('notes')}
                  className={`px-3 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${modalTab === 'notes'
                      ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                    }`}
                >
                  4. Notes & Referrals
                </button>
              </div>

              {/* Section 1: Demographics */}
              {(modalTab === 'all' || modalTab === 'demographics') && (
                <div className="p-4 bg-white border border-slate-200 rounded-lg space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      <User size={14} className="text-[#1B669E]" />
                      1. Maternal Demographics & Identification
                    </h4>
                    <span className="text-[10px] text-slate-400">Strictly Female Patient Record</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Visit Date *</label>
                      <input
                        type="date"
                        required
                        value={formData.visit_date}
                        onChange={(e) => setFormData(p => ({ ...p, visit_date: e.target.value }))}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-md text-xs focus:outline-none focus:border-[#1B669E]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Mother Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.patient_name}
                        onChange={(e) => setFormData(p => ({ ...p, patient_name: e.target.value }))}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-md text-xs focus:outline-none focus:border-[#1B669E]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">PID Number</label>
                      <input
                        type="text"
                        value={formData.pid}
                        onChange={(e) => setFormData(p => ({ ...p, pid: e.target.value }))}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-md text-xs font-mono focus:outline-none focus:border-[#1B669E]"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-semibold text-slate-600">Date of Birth (DoB)</label>
                        <span className="text-[10px] text-slate-400">From Sukraa</span>
                      </div>
                      <input
                        type="date"
                        value={formData.dob || ''}
                        onChange={(e) => handleDobChange(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-md text-xs focus:outline-none focus:border-[#1B669E]"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-semibold text-slate-600">Age (Years) *</label>
                        {formData.dob && <span className="text-[10px] text-emerald-700 font-semibold">From DoB ✓</span>}
                      </div>
                      <input
                        type="number"
                        min="10"
                        max="65"
                        required
                        value={formData.age}
                        onChange={(e) => handleAgeChange(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-md text-xs font-bold text-slate-800 focus:outline-none focus:border-[#1B669E]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Sex</label>
                      <select
                        value={formData.sex}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'M') {
                            toast.error('Error: ANC Register is strictly for female maternal patients!');
                          }
                          setFormData(p => ({ ...p, sex: val }));
                        }}
                        className={`w-full px-2.5 py-1.5 bg-white border rounded-md text-xs font-semibold ${formData.sex === 'M' ? 'border-red-500 text-red-600 bg-red-50' : 'border-slate-300 text-slate-800'
                          }`}
                      >
                        <option value="F">F (Female)</option>
                        <option value="M">M (Male - Not Allowed)</option>
                      </select>
                      {formData.sex === 'M' && (
                        <p className="text-[10px] text-red-600 font-bold mt-1">
                          ANC is strictly for female patients!
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Case Type</label>
                      <select
                        value={formData.case_type}
                        onChange={(e) => setFormData(p => ({ ...p, case_type: e.target.value, ind_1_new_reg: e.target.value === 'New case' }))}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-md text-xs"
                      >
                        <option value="New case">New case (Premier contact)</option>
                        <option value="Old case">Old case (Follow-up)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Health Insurance</label>
                      <select
                        value={formData.insurance || ''}
                        onChange={(e) => setFormData(p => ({ ...p, insurance: e.target.value }))}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-md text-xs focus:outline-none focus:border-[#1B669E]"
                      >
                        <option value="">Select Insurance / Payer</option>
                        {formData.insurance && !INSURANCES.includes(formData.insurance) && (
                          <option key={`sukraa-${formData.insurance}`} value={formData.insurance}>{formData.insurance} (From Sukraa)</option>
                        )}
                        {Array.from(new Set(INSURANCES)).map(ins => (
                          <option key={ins} value={ins}>{ins}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Phone Number</label>
                      <input
                        type="text"
                        value={formData.phone}
                        onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-md text-xs"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Gravida</label>
                        <input
                          type="number"
                          min="1"
                          value={formData.gravida}
                          onChange={(e) => setFormData(p => ({ ...p, gravida: e.target.value }))}
                          className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-md text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Parity</label>
                        <input
                          type="number"
                          min="0"
                          value={formData.parity}
                          onChange={(e) => setFormData(p => ({ ...p, parity: e.target.value }))}
                          className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-md text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Section 2: Obstetric Parameters & Live Assistants */}
              {(modalTab === 'all' || modalTab === 'clinical') && (
                <div className="p-4 bg-white border border-slate-200 rounded-lg space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      <Activity size={14} className="text-[#1B669E]" />
                      2. Obstetric Clinical Parameters & Vital Signs
                    </h4>
                    <span className="text-[10px] text-slate-400">Includes live trimester & hypertension evaluator</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-semibold text-slate-600">GA (Weeks)</label>
                        {formData.gestational_age_weeks && (
                          <span className="text-[10px] text-slate-500 font-mono">
                            {formData.gestational_age_weeks}w
                          </span>
                        )}
                      </div>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.gestational_age_weeks}
                        onChange={(e) => {
                          const val = e.target.value;
                          const w = parseFloat(val);
                          setFormData(p => ({
                            ...p,
                            gestational_age_weeks: val,
                            ind_6_first_trim: !isNaN(w) && w <= 12
                          }));
                        }}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-md text-xs font-semibold focus:outline-none focus:border-[#1B669E]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Blood Pressure</label>
                      <input
                        type="text"
                        value={formData.blood_pressure}
                        onChange={(e) => setFormData(p => ({ ...p, blood_pressure: e.target.value }))}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-md text-xs font-semibold focus:outline-none focus:border-[#1B669E]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Weight (kg)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.weight_kg}
                        onChange={(e) => setFormData(p => ({ ...p, weight_kg: e.target.value }))}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-md text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Fundal Height (cm)</label>
                      <input
                        type="number"
                        value={formData.fundal_height_cm}
                        onChange={(e) => setFormData(p => ({ ...p, fundal_height_cm: e.target.value }))}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-md text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">EDD (Due Date)</label>
                      <input
                        type="date"
                        value={formData.estimated_delivery_date}
                        onChange={(e) => setFormData(p => ({ ...p, estimated_delivery_date: e.target.value }))}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-md text-xs"
                      />
                    </div>
                  </div>

                  {/* Assistive Clinical Evaluator Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                    {/* Gestational Age Card */}
                    <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="text-[10px] uppercase font-bold text-slate-500">Gestational Stage & Statutory Timing</span>
                        <p className="text-xs font-semibold text-slate-800">
                          {analyzeGestationalAge(formData.gestational_age_weeks)?.label || 'Enter GA in weeks to assess trimester'}
                        </p>
                      </div>
                      {analyzeGestationalAge(formData.gestational_age_weeks)?.targetMet && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          Ind. 6 Auto-Ticked
                        </span>
                      )}
                    </div>

                    {/* Blood Pressure Card */}
                    <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="text-[10px] uppercase font-bold text-slate-500">Maternal Haemodynamics</span>
                        <p className="text-xs font-semibold text-slate-800">
                          {analyzeBloodPressure(formData.blood_pressure)?.label || 'Enter BP (e.g. 120/80) for live analysis'}
                        </p>
                        {analyzeBloodPressure(formData.blood_pressure)?.desc && (
                          <p className="text-[10px] text-slate-500">{analyzeBloodPressure(formData.blood_pressure).desc}</p>
                        )}
                      </div>
                      {analyzeBloodPressure(formData.blood_pressure)?.status === 'high' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                          Pre-eclampsia Risk
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Section 3: Statutory Indicators */}
              {(modalTab === 'all' || modalTab === 'indicators') && (
                <div className="p-4 bg-white border border-slate-200 rounded-lg space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                    <div>
                      <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                        <FileSpreadsheet size={14} className="text-[#1B669E]" />
                        3. Statutory 26-Indicator Checklist (Rwanda MoH HMIS Standard)
                      </h4>
                      <p className="text-[10px] text-slate-500">
                        Check each clinical service delivered or detected condition
                      </p>
                    </div>

                    <div className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                      Ticked: <span className="text-[#1B669E]">{INDICATOR_COLUMNS.reduce((acc, col) => acc + (formData[col.key] ? 1 : 0), 0)}</span> / 26
                    </div>
                  </div>

                  {/* Indicators Action Bar: Presets & Category Filters */}
                  <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                    {/* Clinical Presets */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-1">
                        Clinical Presets:
                      </span>
                      <button
                        type="button"
                        onClick={() => handleApplyPreset('first_contact')}
                        className="px-2.5 py-1 rounded bg-white hover:bg-sky-50 border border-slate-200 hover:border-sky-300 text-slate-700 hover:text-[#1B669E] text-[11px] font-semibold flex items-center gap-1 transition-colors"
                      >
                        <Sparkles size={11} className="text-[#1B669E]" />
                        Routine 1st Contact
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyPreset('follow_up')}
                        className="px-2.5 py-1 rounded bg-white hover:bg-sky-50 border border-slate-200 hover:border-sky-300 text-slate-700 hover:text-[#1B669E] text-[11px] font-semibold flex items-center gap-1 transition-colors"
                      >
                        <Activity size={11} className="text-slate-500" />
                        Follow-Up Contact
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyPreset('clear')}
                        className="px-2 py-1 rounded bg-white hover:bg-red-50 border border-slate-200 hover:border-red-200 text-slate-500 hover:text-red-600 text-[11px] transition-colors"
                      >
                        Reset
                      </button>
                    </div>

                    {/* Category Filter Chips */}
                    <div className="flex items-center gap-1 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setIndicatorCategory('all')}
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${indicatorCategory === 'all'
                            ? 'bg-[#1B669E] text-white'
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                      >
                        All (26)
                      </button>
                      {INDICATOR_CATEGORIES.map(cat => {
                        const catTicked = cat.keys.filter(k => formData[k]).length;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setIndicatorCategory(cat.id)}
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors flex items-center gap-1 ${indicatorCategory === cat.id
                                ? 'bg-[#1B669E] text-white'
                                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                              }`}
                          >
                            <span>{cat.badge}</span>
                            {catTicked > 0 && (
                              <span className={`px-1 py-0.1 rounded text-[9px] font-bold ${indicatorCategory === cat.id ? 'bg-white/30 text-white' : 'bg-sky-100 text-[#1B669E]'
                                }`}>
                                {catTicked}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Categorized Indicators Display */}
                  <div className="space-y-4">
                    {INDICATOR_CATEGORIES
                      .filter(cat => indicatorCategory === 'all' || indicatorCategory === cat.id)
                      .map(cat => {
                        const items = INDICATOR_COLUMNS.filter(col => cat.keys.includes(col.key));
                        const checkedCount = items.filter(col => formData[col.key]).length;

                        return (
                          <div key={cat.id} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${cat.isAlert ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-slate-100 text-slate-700'
                                  }`}>
                                  {cat.name}
                                </span>
                                <span className="text-[10px] text-slate-400 hidden sm:inline">{cat.desc}</span>
                              </div>
                              <span className="text-[10px] text-slate-500 font-semibold">
                                {checkedCount}/{items.length} selected
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                              {items.map((col) => {
                                const isChecked = Boolean(formData[col.key]);
                                const isAlert = HIGH_RISK_INDICATOR_KEYS.includes(col.key);

                                return (
                                  <label
                                    key={col.key}
                                    className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${isChecked
                                        ? isAlert
                                          ? 'bg-amber-50/80 border-amber-400 text-amber-950 ring-1 ring-amber-400/20 shadow-xs'
                                          : 'bg-sky-50/70 border-[#1B669E] text-slate-900 ring-1 ring-[#1B669E]/20 shadow-xs'
                                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50/70'
                                      }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={(e) => setFormData(p => ({ ...p, [col.key]: e.target.checked }))}
                                      className="mt-0.5 w-3.5 h-3.5 rounded text-[#1B669E] focus:ring-[#1B669E]"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center justify-between gap-1">
                                        <span className="font-bold text-xs">
                                          <span className="text-slate-400 font-mono text-[10px] mr-1">#{col.num}</span>
                                          {col.label}
                                        </span>
                                        {isChecked && (
                                          <span className={`text-[9px] px-1 py-0.2 rounded font-bold uppercase shrink-0 ${isAlert ? 'bg-amber-100 text-amber-800' : 'bg-sky-100 text-[#1B669E]'
                                            }`}>
                                            {isAlert ? 'Risk' : 'Active'}
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">{col.desc}</p>
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Section 4: Clinical Notes & Danger Signs */}
              {(modalTab === 'all' || modalTab === 'notes') && (
                <div className="p-4 bg-white border border-slate-200 rounded-lg space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      <ShieldAlert size={14} className="text-[#1B669E]" />
                      4. Clinical Notes, Danger Signs & High Risk Referrals
                    </h4>
                    <span className="text-[10px] text-slate-400">MoH Maternal Safety Protocol</span>
                  </div>

                  {/* Quick Danger Signs Picker */}
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                        <AlertTriangle size={13} className="text-amber-600" />
                        Quick Danger Signs Picker (Auto-flags Ind. 9: High Risk Det.)
                      </span>
                      <span className="text-[10px] text-slate-400">Click to append</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {QUICK_DANGER_SIGNS.map(sign => (
                        <button
                          key={sign}
                          type="button"
                          onClick={() => handleAddDangerSign(sign)}
                          className="px-2 py-1 rounded bg-white hover:bg-amber-50 border border-slate-200 hover:border-amber-300 text-slate-700 hover:text-amber-900 text-[10px] font-medium transition-colors"
                        >
                          + {sign}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Clinical Notes & Observations</label>
                      <textarea
                        rows={2}
                        value={formData.clinical_notes}
                        onChange={(e) => setFormData(p => ({ ...p, clinical_notes: e.target.value }))}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-md text-xs focus:outline-none focus:border-[#1B669E]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Danger Signs / Referral Details</label>
                      <textarea
                        rows={2}
                        value={formData.danger_signs}
                        onChange={(e) => setFormData(p => ({ ...p, danger_signs: e.target.value }))}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-md text-xs focus:outline-none focus:border-[#1B669E]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Live Encounter Summary Bar */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                  <span className="font-semibold text-slate-800">
                    {formData.patient_name ? formData.patient_name : 'No patient selected'}
                  </span>
                  {formData.age && <span className="text-slate-500">({formData.age} yrs)</span>}
                  {formData.gestational_age_weeks && (
                    <span className="text-slate-500">• GA {formData.gestational_age_weeks}w</span>
                  )}
                  {formData.blood_pressure && (
                    <span className="text-slate-500">• BP {formData.blood_pressure}</span>
                  )}
                  {formData.ind_9_high_risk_detected || formData.danger_signs ? (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                      High Risk Flagged
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      Standard Risk
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-600">
                    Indicators Completed: <strong className="text-slate-900">{INDICATOR_COLUMNS.reduce((acc, col) => acc + (formData[col.key] ? 1 : 0), 0)} / 26</strong>
                  </span>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-1.5 rounded-lg bg-[#1B669E] hover:bg-[#155280] text-white text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingId ? 'Update Entry' : 'Save to Register'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 max-w-sm w-full p-5 space-y-3">
            <h4 className="font-bold text-slate-900 text-sm">Delete ANC Register Entry</h4>
            <p className="text-xs text-slate-600">
              Are you sure you want to remove this record from the official statutory register?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteEntry(deleteConfirmId)}
                className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
