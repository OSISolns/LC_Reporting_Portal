import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Stethoscope,
  ClipboardList,
  Search,
  ChevronLeft,
  ChevronRight,
  Plus,
  RefreshCw,
  Download,
  Trash2,
  Edit2,
  Calendar,
  X,
  User,
  AlertTriangle,
  ChevronDown,
  Building,
  Activity,
  FileSpreadsheet,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import ExcelJS from 'exceljs';

import {
  listClinicCases,
  getClinicCasesStats,
  createClinicCase,
  updateClinicCase,
  deleteClinicCase,
  listCharts,
  getChart
} from '../../api/dental';
import { searchPatients } from '../../api/patients';
import { useAuth } from '../../context/AuthContext';

const PAGE_SIZE = 10;

// Dental Condition color dictionary for reference
const CONDITION_COLORS = {
  Caries: 'bg-rose-100 text-rose-800 border-rose-200',
  Missing: 'bg-slate-100 text-slate-700 border-slate-200',
  Restored: 'bg-amber-100 text-amber-900 border-amber-200',
};

const StatCard = ({ icon: Icon, label, value, sub, colorClass, bgClass }) => (
  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between transition-all hover:shadow-md hover:scale-[1.01]">
    <div className="space-y-1">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-black text-slate-800">{value}</p>
      <p className="text-[10px] text-slate-400 font-medium">{sub}</p>
    </div>
    <div className={`p-3 rounded-xl ${bgClass} ${colorClass}`}>
      <Icon size={22} className="stroke-[2.5]" />
    </div>
  </div>
);

export default function ClinicCasesLog() {
  const { user } = useAuth();

  // Search & Filter States
  const [patientSearch, setPatientSearch] = useState('');
  const [dentistSearch, setDentistSearch] = useState('');
  const [fromConfig, setFromConfig] = useState(format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'));
  const [toConfig, setToConfig] = useState(format(new Date(), 'yyyy-MM-dd'));
  
  const [cases, setCases] = useState([]);
  const [stats, setStats] = useState({
    totals: { total_cases: 0, total_caries: 0, total_restored: 0, total_charges: 0 },
    byStatus: []
  });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  // Form Modal States
  const [showForm, setShowForm] = useState(false);
  const [editCase, setEditCase] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [viewChartsPatient, setViewChartsPatient] = useState(null); // { patientId, patientName, selectedChartId }

  const handleViewCharts = (patientId, patientName, linkedChartId) => {
    setViewChartsPatient({
      patientId,
      patientName,
      selectedChartId: linkedChartId || null
    });
  };

  // Permissions gate
  const allowedRoles = ['admin', 'deputy_coo', 'dental', 'dentist', 'dental_tech', 'dental_hod', 'dental_lab_manager'];
  const canEdit = user && allowedRoles.includes(user.role);

  const fetchCases = async () => {
    setLoading(true);
    try {
      const res = await listClinicCases({
        from: fromConfig,
        to: toConfig
      });
      setCases(res.data?.data || []);
    } catch (err) {
      toast.error(err.message || 'Failed to fetch cases.');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await getClinicCasesStats({
        from: fromConfig,
        to: toConfig
      });
      setStats(res.data?.data || {
        totals: { total_cases: 0, total_caries: 0, total_restored: 0, total_charges: 0 },
        byStatus: []
      });
    } catch (err) {
      console.warn('Failed to load clinic case stats:', err);
    }
  };

  useEffect(() => {
    fetchCases();
    fetchStats();
  }, [fromConfig, toConfig]);

  const handleSave = async (caseData) => {
    try {
      if (editCase) {
        await updateClinicCase(editCase.id, caseData);
        toast.success('Clinic case updated.');
      } else {
        await createClinicCase(caseData);
        toast.success('Clinic case logged successfully.');
      }
      setShowForm(false);
      setEditCase(null);
      fetchCases();
      fetchStats();
    } catch (err) {
      toast.error(err.message || 'Failed to save case.');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteClinicCase(deleteTarget.id);
      toast.success('Clinic case deleted.');
      setDeleteTarget(null);
      fetchCases();
      fetchStats();
    } catch (err) {
      toast.error(err.message || 'Failed to delete case.');
    }
  };

  // Frontend filter
  const filtered = useMemo(() => {
    return cases.filter(c => {
      const matchPat = !patientSearch.trim() ||
        c.patient_name.toLowerCase().includes(patientSearch.toLowerCase()) ||
        c.patient_id.toLowerCase().includes(patientSearch.toLowerCase());
      const matchDent = !dentistSearch.trim() ||
        c.dentist_name.toLowerCase().includes(dentistSearch.toLowerCase());
      return matchPat && matchDent;
    });
  }, [cases, patientSearch, dentistSearch]);

  // Paginated rows
  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;

  // Excel Export Handler
  const handleExportXlsx = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Clinic Cases Report');

    worksheet.views = [{ showGridLines: true }];

    // Styling helpers
    const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE11D48' } }; // Rose-600
    const headerFont = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    const rowBorder = {
      top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    };

    // Title Block
    worksheet.mergeCells('A1:J1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'DENTAL CLINIC DIAGNOSIS & TREATMENT LOG REPORT';
    titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF1E293B' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(1).height = 40;

    worksheet.mergeCells('A2:J2');
    const subCell = worksheet.getCell('A2');
    subCell.value = `Export Period: ${fromConfig} to ${toConfig} | Generated At: ${format(new Date(), 'yyyy-MM-dd HH:mm')}`;
    subCell.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF64748B' } };
    subCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(2).height = 20;

    worksheet.addRow([]); // Blank spacer

    // Column Headers
    const headers = [
      'Case Ref',
      'Consultation Date',
      'Patient Name',
      'Patient ID',
      'Dentist / Provider',
      'Caries Count',
      'Missing Count',
      'Restored Count',
      'Treatment Summary',
      'Charges (RWF)'
    ];

    const headerRow = worksheet.addRow(headers);
    headerRow.height = 26;
    headerRow.eachCell((cell) => {
      cell.fill = headerFill;
      cell.font = headerFont;
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    // Populate data
    filtered.forEach((c) => {
      const dataRow = [
        c.case_ref,
        c.case_date,
        c.patient_name,
        c.patient_id,
        c.dentist_name,
        c.caries_count,
        c.missing_count,
        c.restored_count,
        c.treatment_summary || 'N/A',
        c.total_charges
      ];

      const row = worksheet.addRow(dataRow);
      row.height = 22;
      row.eachCell((cell, colIndex) => {
        cell.font = { name: 'Arial', size: 9, color: { argb: 'FF334155' } };
        cell.border = rowBorder;

        // Alignment by type
        if ([1, 2, 4, 6, 7, 8].includes(colIndex)) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else if (colIndex === 10) {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          cell.numFmt = '#,##0';
        } else {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        }
      });
    });

    // Autofit column widths
    worksheet.columns.forEach((column) => {
      let maxLen = 12;
      column.eachCell({ includeEmpty: false }, (cell, rowNum) => {
        if (rowNum > 3) {
          const valStr = cell.value ? String(cell.value) : '';
          if (valStr.length > maxLen) maxLen = valStr.length;
        }
      });
      column.width = Math.min(maxLen + 4, 35);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Dental_Clinic_Cases_${fromConfig}_to_${toConfig}.xlsx`;
    link.click();
    toast.success('Excel report downloaded.');
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Stethoscope size={20} className="text-rose-500" /> Dental Clinic Cases
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Log clinical diagnoses, consultations, and track charted tooth pathologies — {fromConfig} to {toConfig}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { fetchCases(); fetchStats(); }}
            className="p-2.5 text-slate-500 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>

          <button
            onClick={handleExportXlsx}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition shadow-xs cursor-pointer"
          >
            <Download size={15} /> Export Report
          </button>

          {canEdit && (
            <button
              onClick={() => { setEditCase(null); setShowForm(true); }}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded-xl transition shadow-sm hover:shadow-md cursor-pointer"
            >
              <Plus size={15} /> Log Clinic Case
            </button>
          )}
        </div>
      </div>

      {/* Date Period Selector */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400 uppercase">Period:</span>
          <input
            type="date"
            value={fromConfig}
            onChange={(e) => setFromConfig(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-300"
          />
          <span className="text-slate-400 text-xs font-medium">to</span>
          <input
            type="date"
            value={toConfig}
            onChange={(e) => setToConfig(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-300"
          />
        </div>
      </div>

      {/* Stats Cards Dashboard */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-slate-100 rounded-2xl h-24 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={ClipboardList}
            label="Total Consults"
            value={stats.totals?.total_cases ?? 0}
            sub="cases logged in period"
            colorClass="text-rose-500"
            bgClass="bg-rose-50"
          />
          <StatCard
            icon={AlertTriangle}
            label="Caries Diagnosed"
            value={stats.totals?.total_caries ?? 0}
            sub="decayed teeth documented"
            colorClass="text-amber-600"
            bgClass="bg-amber-50"
          />
          <StatCard
            icon={CheckCircle2}
            label="Restored Teeth"
            value={stats.totals?.total_restored ?? 0}
            sub="filled or crown treatments"
            colorClass="text-emerald-500"
            bgClass="bg-emerald-50"
          />
          <StatCard
            icon={Activity}
            label="Total Clinic Charges"
            value={`RWF ${(stats.totals?.total_charges ?? 0).toLocaleString()}`}
            sub="billing / billing estimates"
            colorClass="text-indigo-500"
            bgClass="bg-indigo-50"
          />
        </div>
      )}

      {/* Table Section */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Search Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search by Patient Name or ID…"
              value={patientSearch}
              onChange={(e) => { setPatientSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-200 transition bg-white"
            />
          </div>
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search by Dentist / Provider…"
              value={dentistSearch}
              onChange={(e) => { setDentistSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-200 transition bg-white"
            />
          </div>
        </div>

        {/* Table Grid */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <RefreshCw className="animate-spin mx-auto text-rose-500" size={32} />
              <p className="text-sm font-semibold">Loading clinical case logs...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-16 text-center text-slate-400 space-y-1">
              <ClipboardList className="mx-auto text-slate-300" size={40} />
              <p className="text-sm font-bold text-slate-600">No Clinic Cases Found</p>
              <p className="text-xs">Adjust your search term or select a wider date range.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-wider">
                  <th className="py-3 px-4 text-center">Ref</th>
                  <th className="py-3 px-4">Consultation Date</th>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Dentist</th>
                  <th className="py-3 px-4 text-center">Conditions Charted</th>
                  <th className="py-3 px-4">Treatment Summary</th>
                  <th className="py-3 px-4 text-right">Charges</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {paginated.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-500 text-center">{c.case_ref}</td>
                    <td className="py-3 px-4 font-medium">{c.case_date}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800">{c.patient_name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">PID: {c.patient_id}</div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-600">{c.dentist_name}</td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {c.caries_count > 0 && (
                          <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-rose-100 text-rose-800" title="Caries Count">
                            C: {c.caries_count}
                          </span>
                        )}
                        {c.missing_count > 0 && (
                          <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-slate-100 text-slate-700" title="Missing Count">
                            M: {c.missing_count}
                          </span>
                        )}
                        {c.restored_count > 0 && (
                          <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-amber-100 text-amber-800" title="Restored Count">
                            R: {c.restored_count}
                          </span>
                        )}
                        {c.caries_count === 0 && c.missing_count === 0 && c.restored_count === 0 && (
                          <span className="text-[10px] text-slate-400">—</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate" title={c.treatment_summary}>
                      {c.treatment_summary || <span className="text-slate-400">None proposed</span>}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-slate-800">
                      RWF {Number(c.total_charges).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        c.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' :
                        c.status === 'In Treatment' ? 'bg-indigo-100 text-indigo-800' :
                        c.status === 'Follow-Up' ? 'bg-amber-100 text-amber-800' :
                        'bg-rose-100 text-rose-800'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleViewCharts(c.patient_id, c.patient_name, c.linked_chart_id)}
                          className="p-1.5 text-slate-500 hover:text-indigo-650 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                          title="View Dental Charts / Comparison"
                        >
                          <Stethoscope size={13} />
                        </button>
                        {canEdit && (
                          <>
                            <button
                              onClick={() => { setEditCase(c); setShowForm(true); }}
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                              title="Edit Case"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(c)}
                              className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                              title="Delete Case"
                            >
                              <Trash2 size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Footer */}
        {filtered.length > PAGE_SIZE && (
          <div className="flex items-center justify-between p-4 border-t border-slate-100">
            <p className="text-xs text-slate-400">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40 transition"
              >
                <ChevronLeft size={16} />
              </button>
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i + 1)}
                  className={`w-7 h-7 rounded-lg text-xs font-semibold transition ${
                    page === i + 1 ? 'bg-rose-600 text-white' : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40 transition"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showForm && (
        <CaseFormModal
          isOpen={showForm}
          onClose={() => { setShowForm(false); setEditCase(null); }}
          onSave={handleSave}
          editCase={editCase}
          currentUser={user}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          isOpen={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          caseRef={deleteTarget?.case_ref}
        />
      )}

      {viewChartsPatient && (
        <PatientChartsViewerModal
          isOpen={!!viewChartsPatient}
          onClose={() => setViewChartsPatient(null)}
          patientId={viewChartsPatient.patientId}
          patientName={viewChartsPatient.patientName}
          defaultChartId={viewChartsPatient.selectedChartId}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CASE FORM MODAL (WITH CHART SYNC AUTO-ANALYSIS ENGINE)
// ═══════════════════════════════════════════════════════════════════════════════
function CaseFormModal({ isOpen, onClose, onSave, editCase, currentUser }) {
  const [form, setForm] = useState({
    patient_id: '',
    patient_name: '',
    dentist_name: '',
    case_date: format(new Date(), 'yyyy-MM-dd'),
    linked_chart_id: '',
    caries_count: 0,
    missing_count: 0,
    restored_count: 0,
    treatment_summary: '',
    total_charges: 0,
    status: 'Diagnosed',
    clinical_notes: ''
  });

  // Autocomplete patient search
  const [patSearch, setPatSearch] = useState('');
  const [patResults, setPatResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [searching, setSearching] = useState(false);

  // Patient charts list
  const [patientCharts, setPatientCharts] = useState([]);
  const [loadingCharts, setLoadingCharts] = useState(false);
  const [analysisReport, setAnalysisReport] = useState(null);

  const autocompleteRef = useRef(null);

  useEffect(() => {
    if (editCase) {
      setForm({
        patient_id: editCase.patient_id,
        patient_name: editCase.patient_name,
        dentist_name: editCase.dentist_name,
        case_date: editCase.case_date,
        linked_chart_id: editCase.linked_chart_id || '',
        caries_count: editCase.caries_count || 0,
        missing_count: editCase.missing_count || 0,
        restored_count: editCase.restored_count || 0,
        treatment_summary: editCase.treatment_summary || '',
        total_charges: editCase.total_charges || 0,
        status: editCase.status || 'Diagnosed',
        clinical_notes: editCase.clinical_notes || ''
      });
      setPatSearch(`${editCase.patient_name} (PID: ${editCase.patient_id})`);
      fetchPatientCharts(editCase.patient_id);
    } else {
      setForm({
        patient_id: '',
        patient_name: '',
        dentist_name: currentUser?.fullName || currentUser?.full_name || '',
        case_date: format(new Date(), 'yyyy-MM-dd'),
        linked_chart_id: '',
        caries_count: 0,
        missing_count: 0,
        restored_count: 0,
        treatment_summary: '',
        total_charges: 0,
        status: 'Diagnosed',
        clinical_notes: ''
      });
      setPatSearch('');
      setPatientCharts([]);
      setAnalysisReport(null);
    }
  }, [editCase, isOpen]);

  // Click outside close
  useEffect(() => {
    const clickOut = (e) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(e.target)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', clickOut);
    return () => document.removeEventListener('mousedown', clickOut);
  }, []);

  const handlePatientQuery = async (q) => {
    setPatSearch(q);
    if (!q.trim()) {
      setPatResults([]);
      setShowResults(false);
      return;
    }
    setSearching(true);
    try {
      const res = await searchPatients(q);
      setPatResults(res.data?.data || []);
      setShowResults(true);
    } catch (err) {
      console.warn('Patient autocomplete search failed:', err);
    } finally {
      setSearching(false);
    }
  };

  const selectPatient = (p) => {
    const pid = p.pid || p.patient_id;
    const name = p.full_name || p.patient_name;
    setForm(prev => ({
      ...prev,
      patient_id: pid,
      patient_name: name
    }));
    setPatSearch(`${name} (PID: ${pid})`);
    setShowResults(false);
    fetchPatientCharts(pid);
  };

  const fetchPatientCharts = async (pid) => {
    setLoadingCharts(true);
    try {
      const res = await listCharts(pid);
      setPatientCharts(res.data?.data || res.data || []);
    } catch (err) {
      console.warn('Failed to load patient charts:', err);
    } finally {
      setLoadingCharts(false);
    }
  };

  // Sync / Parse selected chart tooth data
  const handleChartChange = (chartId) => {
    setForm(prev => ({ ...prev, linked_chart_id: chartId }));
    if (!chartId) {
      setAnalysisReport(null);
      return;
    }

    const selectedChart = patientCharts.find(c => String(c.id) === String(chartId));
    if (!selectedChart || !selectedChart.tooth_data) return;

    let parsed = selectedChart.tooth_data;
    if (typeof parsed === 'string') {
      try {
        parsed = JSON.parse(parsed);
      } catch (err) {
        console.warn('Failed to parse tooth_data JSON:', err);
        return;
      }
    }

    const teeth = parsed.teeth || parsed || {};
    const treatmentPlan = parsed.treatment_plan || [];

    let caries = 0;
    let missing = 0;
    let restored = 0;

    const cariesTeeth = [];
    const missingTeeth = [];
    const restoredTeeth = [];

    // Analyze tooth conditions
    Object.entries(teeth).forEach(([toothNum, info]) => {
      if (!info) return;

      const isCaries = info.condition === 'Caries' || Object.values(info.surfaces || {}).includes('Caries');
      const isMissing = info.missing === true || info.condition === 'Extraction Planned' || Object.values(info.surfaces || {}).includes('Extraction Planned');
      const isRestored = info.condition === 'Filled' || info.condition === 'Crown' || info.condition === 'Root Canal' ||
                        Object.values(info.surfaces || {}).includes('Filled') ||
                        Object.values(info.surfaces || {}).includes('Crown') ||
                        Object.values(info.surfaces || {}).includes('Root Canal');

      if (isCaries) {
        caries++;
        cariesTeeth.push(toothNum);
      }
      if (isMissing) {
        missing++;
        missingTeeth.push(toothNum);
      }
      if (isRestored) {
        restored++;
        restoredTeeth.push(toothNum);
      }
    });

    // Map treatment procedures
    const procNames = treatmentPlan.map(p => {
      const toothDesc = p.tooth && p.tooth !== 'General' ? `Tooth ${p.tooth}` : 'General';
      return `${toothDesc}: ${p.procedure}`;
    });

    const treatmentSummaryText = procNames.join(', ');

    // Compute estimate charges based on procedure names
    let estimatedCost = 0;
    treatmentPlan.forEach(p => {
      const nameLower = p.procedure.toLowerCase();
      if (nameLower.includes('extraction')) estimatedCost += 30000;
      else if (nameLower.includes('root canal') || nameLower.includes('rct')) estimatedCost += 120000;
      else if (nameLower.includes('crown') || nameLower.includes('veneer')) estimatedCost += 250000;
      else if (nameLower.includes('restoration') || nameLower.includes('filling')) estimatedCost += 40000;
      else if (nameLower.includes('implant')) estimatedCost += 800000;
      else if (nameLower.includes('scaling') || nameLower.includes('polishing')) estimatedCost += 35000;
      else estimatedCost += 25000; // Base consult or general
    });

    setForm(prev => ({
      ...prev,
      caries_count: caries,
      missing_count: missing,
      restored_count: restored,
      treatment_summary: treatmentSummaryText || prev.treatment_summary,
      total_charges: estimatedCost || prev.total_charges
    }));

    setAnalysisReport({
      cariesTeeth,
      missingTeeth,
      restoredTeeth,
      procedures: treatmentPlan.map(p => ({ tooth: p.tooth, proc: p.procedure })),
      estimatedCost
    });

    toast.success(`Chart analyzed: ${caries} Caries, ${missing} Missing, ${restored} Restored.`, { duration: 3000 });
  };

  const handleSaveSubmit = (e) => {
    e.preventDefault();
    if (!form.patient_id) return toast.error('Please select a valid patient.');
    if (!form.dentist_name.trim()) return toast.error('Attending dentist name is required.');
    onSave(form);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-rose-50 border-b border-rose-100/50 p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-600 text-white">
              <Stethoscope size={18} />
            </div>
            <div>
              <h3 className="font-black text-slate-800 text-sm">
                {editCase ? 'Edit Dental Clinic Case' : 'Log Dental Clinic Case'}
              </h3>
              <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest mt-0.5">Clinical consultation & charting record</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition">
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSaveSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Patient Autocomplete */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="relative" ref={autocompleteRef}>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Patient Search
              </label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 text-slate-400" size={15} />
                <input
                  type="text"
                  placeholder="Type patient name or ID..."
                  value={patSearch}
                  onChange={(e) => handlePatientQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-300"
                />
              </div>
              {showResults && (
                <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-100 rounded-xl shadow-lg max-h-48 overflow-y-auto z-50 divide-y divide-slate-50">
                  {searching ? (
                    <div className="p-3 text-xs text-slate-400 text-center">Searching HIMS...</div>
                  ) : patResults.length === 0 ? (
                    <div className="p-3 text-xs text-slate-400 text-center">No patients found</div>
                  ) : (
                    patResults.map(p => (
                      <div
                        key={p.pid || p.patient_id}
                        onClick={() => selectPatient(p)}
                        className="p-3 hover:bg-slate-50 cursor-pointer transition text-xs"
                      >
                        <div className="font-bold text-slate-700">{p.full_name || p.patient_name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">PID: {p.pid || p.patient_id}</div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Attending Dentist */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Attending Dentist
              </label>
              <input
                type="text"
                required
                value={form.dentist_name}
                onChange={(e) => setForm(prev => ({ ...prev, dentist_name: e.target.value }))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-300"
                placeholder="Dr. Dentist Name"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Consultation Date */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Consultation Date
              </label>
              <input
                type="date"
                required
                value={form.case_date}
                onChange={(e) => setForm(prev => ({ ...prev, case_date: e.target.value }))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-300"
              />
            </div>

            {/* Linked Dental Chart */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Sync with Dental Chart (Odontogram)
              </label>
              <select
                value={form.linked_chart_id}
                onChange={(e) => handleChartChange(e.target.value)}
                disabled={loadingCharts || !form.patient_id}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 disabled:bg-slate-50 transition"
              >
                <option value="">— Select clinical chart —</option>
                {patientCharts.map(ch => (
                  <option key={ch.id} value={ch.id}>
                    Charted {ch.chart_date} (by {ch.provider})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Odontogram Analysis Summary (Sparkly UI) */}
          {analysisReport && (
            <div className="bg-rose-50/40 border border-rose-100 rounded-2xl p-4 space-y-3">
              <p className="text-xs font-bold text-rose-600 flex items-center gap-1.5">
                <Sparkles size={14} className="stroke-[2.5]" /> Odontogram Chart Auto-Analysis
              </p>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-white p-2 rounded-xl border border-slate-100">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Caries Detected</div>
                  <div className="text-lg font-black text-rose-600 mt-0.5">{analysisReport.cariesTeeth.length}</div>
                  <div className="text-[9px] text-slate-400 truncate">
                    {analysisReport.cariesTeeth.length > 0 ? `Teeth: ${analysisReport.cariesTeeth.join(', ')}` : 'None'}
                  </div>
                </div>
                <div className="bg-white p-2 rounded-xl border border-slate-100">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Missing / Extraction</div>
                  <div className="text-lg font-black text-slate-700 mt-0.5">{analysisReport.missingTeeth.length}</div>
                  <div className="text-[9px] text-slate-400 truncate">
                    {analysisReport.missingTeeth.length > 0 ? `Teeth: ${analysisReport.missingTeeth.join(', ')}` : 'None'}
                  </div>
                </div>
                <div className="bg-white p-2 rounded-xl border border-slate-100">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Restored / Crown</div>
                  <div className="text-lg font-black text-amber-700 mt-0.5">{analysisReport.restoredTeeth.length}</div>
                  <div className="text-[9px] text-slate-400 truncate">
                    {analysisReport.restoredTeeth.length > 0 ? `Teeth: ${analysisReport.restoredTeeth.join(', ')}` : 'None'}
                  </div>
                </div>
              </div>
              {analysisReport.procedures.length > 0 && (
                <div className="bg-white/80 p-2.5 rounded-xl border border-slate-100 text-[10px] space-y-1">
                  <div className="font-bold text-slate-500 uppercase tracking-wider">Identified Treatments</div>
                  <div className="text-slate-600 leading-relaxed font-semibold">
                    {analysisReport.procedures.map(p => `${p.proc} (${p.tooth && p.tooth !== 'General' ? `#${p.tooth}` : 'General'})`).join('; ')}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Diagnosed Conditions Fields */}
          <div>
            <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-3">Diagnosed Pathology Totals</p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Caries Count
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.caries_count}
                  onChange={(e) => setForm(prev => ({ ...prev, caries_count: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-300"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Missing Count
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.missing_count}
                  onChange={(e) => setForm(prev => ({ ...prev, missing_count: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-300"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Restored Count
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.restored_count}
                  onChange={(e) => setForm(prev => ({ ...prev, restored_count: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-300"
                />
              </div>
            </div>
          </div>

          {/* Treatment Summary & Estimates */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Treatment summary
              </label>
              <input
                type="text"
                value={form.treatment_summary}
                onChange={(e) => setForm(prev => ({ ...prev, treatment_summary: e.target.value }))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-300"
                placeholder="e.g. Scaling and Root Canal on #36, Composite restore on #12"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Charges (RWF)
              </label>
              <input
                type="number"
                min="0"
                value={form.total_charges}
                onChange={(e) => setForm(prev => ({ ...prev, total_charges: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 text-xs font-bold text-slate-800 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-300"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Status */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Case Status
              </label>
              <select
                value={form.status}
                onChange={(e) => setForm(prev => ({ ...prev, status: e.target.value }))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
              >
                <option value="Diagnosed">Diagnosed (Active)</option>
                <option value="In Treatment">In Treatment</option>
                <option value="Completed">Completed</option>
                <option value="Follow-Up">Follow-Up</option>
              </select>
            </div>

            {/* Notes */}
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Clinical consultation notes
              </label>
              <textarea
                value={form.clinical_notes}
                onChange={(e) => setForm(prev => ({ ...prev, clinical_notes: e.target.value }))}
                rows={2}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-300"
                placeholder="Additional notes about patient presentation, findings, or anesthesia..."
              />
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-500 text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-xs hover:shadow-md cursor-pointer"
            >
              {editCase ? 'Save Changes' : 'Log Case'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE CONFIRMATION MODAL
// ═══════════════════════════════════════════════════════════════════════════════
function DeleteConfirmModal({ isOpen, onClose, onConfirm, caseRef }) {
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-slate-100 p-6 space-y-5 animate-scale-up">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto">
            <Trash2 size={24} />
          </div>
          <h3 className="text-sm font-black text-slate-800">Delete Clinic Case Record?</h3>
          <p className="text-xs text-slate-400">
            Are you sure you want to delete case <span className="font-bold text-slate-600">{caseRef}</span>? This action is permanent.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-500 text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition shadow-sm cursor-pointer"
          >
            Yes, Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// Utility to parse values
function parseNum(val) {
  if (val === undefined || val === null || val === '') return null;
  const num = Number(val);
  return isNaN(num) ? null : num;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PATIENT DENTAL CHARTS HISTORY & COMPARISON VIEW MODAL
// ═══════════════════════════════════════════════════════════════════════════════
function PatientChartsViewerModal({ isOpen, onClose, patientId, patientName, defaultChartId }) {
  const [charts, setCharts] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  
  // Selected charts for side-by-side comparison
  const [chartAId, setChartAId] = useState(null);
  const [chartBId, setChartBId] = useState(null);
  
  const [chartAData, setChartAData] = useState(null);
  const [chartBData, setChartBData] = useState(null);
  
  const [loadingA, setLoadingA] = useState(false);
  const [loadingB, setLoadingB] = useState(false);
  
  const [compareMode, setCompareMode] = useState(false);

  useEffect(() => {
    if (!isOpen || !patientId) return;
    
    const fetchChartsList = async () => {
      setLoadingList(true);
      try {
        const res = await listCharts(patientId);
        const data = res.data?.data || [];
        setCharts(data);
        
        // Auto-select Chart A
        if (defaultChartId) {
          setChartAId(defaultChartId);
        } else if (data.length > 0) {
          setChartAId(data[0].id);
        }
      } catch (err) {
        toast.error('Failed to load patient charts list');
      } finally {
        setLoadingList(false);
      }
    };
    
    fetchChartsList();
  }, [isOpen, patientId, defaultChartId]);

  // Load Chart A details
  useEffect(() => {
    if (!chartAId) {
      setChartAData(null);
      return;
    }
    const loadA = async () => {
      setLoadingA(true);
      try {
        const res = await getChart(chartAId);
        setChartAData(res.data?.data || null);
      } catch (err) {
        toast.error('Failed to load chart details');
      } finally {
        setLoadingA(false);
      }
    };
    loadA();
  }, [chartAId]);

  // Load Chart B details
  useEffect(() => {
    if (!chartBId) {
      setChartBData(null);
      return;
    }
    const loadB = async () => {
      setLoadingB(true);
      try {
        const res = await getChart(chartBId);
        setChartBData(res.data?.data || null);
      } catch (err) {
        toast.error('Failed to load comparison chart details');
      } finally {
        setLoadingB(false);
      }
    };
    loadB();
  }, [chartBId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl w-full max-w-6xl h-[85vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="space-y-0.5">
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-1.5">
              <Stethoscope size={16} className="text-rose-500" />
              Patient Dental Chart History
            </h3>
            <p className="text-[11px] text-slate-500 font-semibold">
              Patient: <strong className="text-slate-800">{patientName}</strong> (PID: {patientId})
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setCompareMode(!compareMode);
                if (!compareMode && charts.length > 1) {
                  const secondChart = charts.find(c => c.id !== chartAId) || charts[1];
                  if (secondChart) setChartBId(secondChart.id);
                }
              }}
              disabled={charts.length < 2}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                compareMode 
                  ? 'bg-rose-50 text-rose-600 border border-rose-200' 
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40'
              }`}
            >
              {compareMode ? 'Exit Comparison' : 'Compare Two Charts'}
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 flex min-h-0 overflow-hidden divide-x divide-slate-100">
          {/* Left Sidebar: Saved Charts List */}
          <div className="w-64 flex flex-col shrink-0 bg-slate-50/30">
            <div className="p-3.5 border-b border-slate-100 bg-slate-50/50">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Saved Charts ({charts.length})</span>
            </div>
            
            {loadingList ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-slate-400 gap-2">
                <RefreshCw size={18} className="animate-spin text-rose-500" />
                <span className="text-xs font-semibold">Loading history...</span>
              </div>
            ) : charts.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-slate-400 text-center">
                <ClipboardList size={28} className="text-slate-200 mb-1" />
                <p className="text-xs font-semibold">No charts recorded</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                {charts.map((c) => {
                  const isA = chartAId === c.id;
                  const isB = compareMode && chartBId === c.id;
                  return (
                    <div
                      key={c.id}
                      onClick={() => {
                        if (compareMode) {
                          if (isA) return;
                          setChartBId(c.id);
                        } else {
                          setChartAId(c.id);
                        }
                      }}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        isA
                          ? 'border-rose-500 bg-rose-50/40 shadow-3xs'
                          : isB
                          ? 'border-blue-500 bg-blue-50/40 shadow-3xs'
                          : 'border-slate-150/70 bg-white hover:border-slate-350'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">{c.chart_date}</span>
                        {isA && <span className="text-[9px] px-1.5 py-0.2 bg-rose-500 text-white rounded font-bold uppercase tracking-wider">Active</span>}
                        {isB && <span className="text-[9px] px-1.5 py-0.2 bg-blue-500 text-white rounded font-bold uppercase tracking-wider">Comp</span>}
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1 font-medium truncate">By: Dr. {c.provider || 'Dentist'}</p>
                      {c.general_notes && (
                        <p className="text-[9.5px] text-slate-400 mt-1 line-clamp-1 italic">"{c.general_notes}"</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Main Visual Panels */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {compareMode ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 h-full">
                {/* Column A */}
                <div className="border border-rose-100 rounded-xl p-4 bg-rose-50/5 flex flex-col space-y-4">
                  <div className="border-b border-rose-100 pb-2">
                    <span className="text-[10px] font-black uppercase text-rose-500 tracking-wider">Base Chart (Active)</span>
                    {chartAData ? (
                      <div className="mt-1">
                        <h4 className="text-xs font-bold text-slate-800">{chartAData.chart_date} • Dr. {chartAData.provider}</h4>
                        {chartAData.general_notes && <p className="text-[11px] text-slate-500 italic mt-0.5">"{chartAData.general_notes}"</p>}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">Loading details...</p>
                    )}
                  </div>
                  {loadingA ? (
                    <div className="flex-1 flex items-center justify-center"><RefreshCw className="animate-spin text-rose-500" /></div>
                  ) : (
                    chartAData && <OdontogramViewer data={chartAData} />
                  )}
                </div>

                {/* Column B */}
                <div className="border border-blue-100 rounded-xl p-4 bg-blue-50/5 flex flex-col space-y-4">
                  <div className="border-b border-blue-100 pb-2">
                    <span className="text-[10px] font-black uppercase text-blue-500 tracking-wider">Comparison Chart</span>
                    {chartBData ? (
                      <div className="mt-1">
                        <h4 className="text-xs font-bold text-slate-800">{chartBData.chart_date} • Dr. {chartBData.provider}</h4>
                        {chartBData.general_notes && <p className="text-[11px] text-slate-500 italic mt-0.5">"{chartBData.general_notes}"</p>}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">Loading details...</p>
                    )}
                  </div>
                  {loadingB ? (
                    <div className="flex-1 flex items-center justify-center"><RefreshCw className="animate-spin text-blue-500" /></div>
                  ) : (
                    chartBData && <OdontogramViewer data={chartBData} />
                  )}
                </div>
              </div>
            ) : (
              // Single Chart View Mode
              <div className="h-full flex flex-col space-y-4">
                {chartAData ? (
                  <div className="border border-slate-200/80 rounded-xl p-5 bg-white space-y-4">
                    <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-slate-800">Chart Date: {chartAData.chart_date}</h4>
                        <p className="text-xs text-slate-500 mt-0.5">Treating Provider: <strong className="text-slate-700">Dr. {chartAData.provider}</strong></p>
                      </div>
                      {chartAData.general_notes && (
                        <div className="max-w-md bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs italic text-slate-500">
                          "{chartAData.general_notes}"
                        </div>
                      )}
                    </div>
                    {loadingA ? (
                      <div className="py-24 flex justify-center"><RefreshCw className="animate-spin text-rose-500" /></div>
                    ) : (
                      <OdontogramViewer data={chartAData} />
                    )}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 py-24">
                    <Stethoscope size={42} className="text-slate-200 mb-2" />
                    <p className="text-xs font-semibold">Select a chart from the history list to inspect</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Compact Odontogram Viewer helper component ──────────────────────────────
function OdontogramViewer({ data }) {
  let toothMap = {};
  let dentitionType = 'adult';
  
  if (data && data.tooth_data) {
    const rawData = data.tooth_data;
    if (rawData.teeth) {
      toothMap = rawData.teeth;
      dentitionType = rawData.dentition_type || 'adult';
    } else {
      toothMap = rawData;
    }
  }

  const ADULT_UPPER = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
  const ADULT_LOWER = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
  
  const PEDIATRIC_UPPER = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65];
  const PEDIATRIC_LOWER = [85, 84, 83, 82, 81, 75, 74, 73, 72, 71];

  const renderViewerRow = (teethArray) => (
    <div className="flex flex-wrap gap-1.5 justify-center">
      {teethArray.map(num => (
        <MiniTooth key={num} number={num} data={toothMap[num.toString()]} />
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {(dentitionType === 'adult' || dentitionType === 'mixed') && (
        <div className="space-y-4">
          <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider text-center">Permanent Dentition (Adult)</div>
          <div className="space-y-3 bg-slate-50/50 p-3.5 rounded-xl border border-slate-100">
            {renderViewerRow(ADULT_UPPER)}
            <div className="border-t border-dashed border-slate-200 my-2" />
            {renderViewerRow(ADULT_LOWER)}
          </div>
        </div>
      )}

      {(dentitionType === 'pediatric' || dentitionType === 'mixed') && (
        <div className="space-y-4">
          <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider text-center">Primary Dentition (Pediatric)</div>
          <div className="space-y-3 bg-amber-50/20 p-3.5 rounded-xl border border-amber-100/60">
            {renderViewerRow(PEDIATRIC_UPPER)}
            <div className="border-t border-dashed border-amber-200/50 my-2" />
            {renderViewerRow(PEDIATRIC_LOWER)}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Mini Tooth Layout helper ────────────────────────────────────────────────
function MiniTooth({ number, data }) {
  const toothData = data || { condition: 'Healthy', surfaces: {} };
  const missing = toothData.missing;
  const condition = toothData.condition || 'Healthy';
  const s = toothData.surfaces || {};

  const getSurfaceColor = (surfVal) => {
    if (!surfVal || surfVal === 'Healthy') return '#f8fafc';
    if (surfVal === 'Caries') return '#ef4444'; 
    if (surfVal === 'Filled' || surfVal === 'Restored') return '#f59e0b'; 
    if (surfVal === 'Crown' || surfVal === 'Veneer') return '#3b82f6'; 
    if (surfVal === 'Root Canal') return '#8b5cf6'; 
    return '#ef4444';
  };

  const getConditionBadgeColor = (c) => {
    if (c === 'Healthy') return 'text-slate-400';
    if (c === 'Caries') return 'text-rose-600 font-extrabold';
    if (c === 'Missing' || c === 'Extraction Planned') return 'text-slate-600 font-extrabold';
    if (c === 'Restored' || c === 'Filled') return 'text-amber-600 font-extrabold';
    return 'text-indigo-600 font-extrabold';
  };

  return (
    <div className="flex flex-col items-center p-1 bg-white border border-slate-100 rounded-lg w-[42px] h-[60px] shadow-3xs shrink-0 select-none">
      <span className="text-[9px] font-black text-slate-500 mb-0.5">{number}</span>
      {missing ? (
        <div className="flex-1 flex items-center justify-center w-7 h-7 rounded border border-dashed border-slate-200 bg-slate-50 text-[10px] text-slate-400 font-black">
          X
        </div>
      ) : (
        <svg width="24" height="24" viewBox="0 0 32 32" className="block mx-auto shrink-0">
          <polygon
            points="2,2 30,2 24,8 8,8"
            fill={getSurfaceColor(s.B)}
            stroke="#cbd5e1"
            strokeWidth="0.75"
          />
          <polygon
            points="2,2 8,8 8,24 2,30"
            fill={getSurfaceColor(s.M)}
            stroke="#cbd5e1"
            strokeWidth="0.75"
          />
          <rect
            x="8" y="8" width="16" height="16"
            fill={getSurfaceColor(s.O)}
            stroke="#cbd5e1"
            strokeWidth="0.75"
          />
          <polygon
            points="30,2 24,8 24,24 30,30"
            fill={getSurfaceColor(s.D)}
            stroke="#cbd5e1"
            strokeWidth="0.75"
          />
          <polygon
            points="8,24 24,24 30,30 2,30"
            fill={getSurfaceColor(s.L)}
            stroke="#cbd5e1"
            strokeWidth="0.75"
          />
        </svg>
      )}
      <span className={`text-[7.5px] mt-0.5 truncate max-w-full text-center tracking-tighter leading-none ${getConditionBadgeColor(condition)}`}>
        {condition === 'Healthy' ? '' : condition}
      </span>
    </div>
  );
}
