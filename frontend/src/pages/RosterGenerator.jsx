import { useState, useRef, useEffect, useMemo } from 'react';
import { parseRosterFile, fetchRosterHistory, downloadRosterDocx, analyzeRosterAI, deleteRosterHistory, bulkDeleteRosterHistory } from '../api/roster';
import { toast } from 'react-hot-toast';
import {
  UploadCloud, Printer, FileCode, RefreshCw, CalendarDays, FileText, ShieldCheck,
  History, Download, Sparkles, ArrowRightLeft, AlertTriangle, UserPlus, UserMinus,
  Eye, X, UserCheck, Search, Copy, User, Filter, Trash2, CheckSquare, Square,
  BarChart3, ListFilter, CheckCircle2, Trash, FileSpreadsheet
} from 'lucide-react';

// A4 at 96 dpi = 794 × 1123 px (3/4 height = 842 px)
const A4_W = 794;
const A4_H = 1123;
const A4_THREE_QUARTER_H = 842;

// ─── Excel Export Helper ───────────────────────────────────────────────────────
const exportRosterToExcel = async (dayName, dateStr, unitsList, filenamePrefix = 'Doctors_Schedule') => {
  if (!unitsList || unitsList.length === 0) {
    toast.error("No schedule data available to export.");
    return;
  }

  const toastId = toast.loading("Generating Excel schedule...");

  try {
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Legacy Clinics Portal';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Doctor Schedule', {
      pageSetup: { paperSize: 9, orientation: 'portrait' }
    });

    // Column widths
    sheet.columns = [
      { key: 'unit', width: 32 },
      { key: 'morning', width: 40 },
      { key: 'evening', width: 40 },
    ];

    // Row 1: Header Title 1
    sheet.mergeCells('A1:C1');
    const titleCell1 = sheet.getCell('A1');
    titleCell1.value = 'LEGACY CLINICS AND DIAGNOSTICS';
    titleCell1.font = { name: 'Segoe UI', size: 13, bold: true, color: { argb: 'FFFFFF' } };
    titleCell1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '003B44' } };
    titleCell1.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 28;

    // Row 2: Header Title 2
    sheet.mergeCells('A2:C2');
    const titleCell2 = sheet.getCell('A2');
    titleCell2.value = "DOCTOR'S SCHEDULE";
    titleCell2.font = { name: 'Segoe UI', size: 15, bold: true, color: { argb: '7EE8F8' } };
    titleCell2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '003B44' } };
    titleCell2.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(2).height = 30;

    // Row 3: Day & Date Subtitle
    sheet.mergeCells('A3:C3');
    const subCell = sheet.getCell('A3');
    subCell.value = `${dayName ? dayName.toUpperCase() + ' - ' : ''}${dateStr || ''}`;
    subCell.font = { name: 'Segoe UI', size: 11.5, bold: true, color: { argb: '00505C' } };
    subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E0F2FE' } };
    subCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(3).height = 24;

    // Row 4: Empty separator
    sheet.getRow(4).height = 8;

    // Row 5: Table Header Level 1 (UNIT, DOCTORS / PROVIDERS)
    sheet.mergeCells('A5:A6');
    const unitTh = sheet.getCell('A5');
    unitTh.value = 'UNIT';
    unitTh.font = { name: 'Segoe UI', size: 11.5, bold: true, color: { argb: 'FFFFFF' } };
    unitTh.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '003B44' } };
    unitTh.alignment = { horizontal: 'center', vertical: 'middle' };

    sheet.mergeCells('B5:C5');
    const docsTh = sheet.getCell('B5');
    docsTh.value = 'DOCTORS / PROVIDERS';
    docsTh.font = { name: 'Segoe UI', size: 11.5, bold: true, color: { argb: '7EE8F8' } };
    docsTh.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '003B44' } };
    docsTh.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(5).height = 22;

    // Row 6: Subheaders (MORNING / TIME, EVENING / TIME)
    const morningTh = sheet.getCell('B6');
    morningTh.value = 'MORNING / TIME';
    morningTh.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'A5F3FC' } };
    morningTh.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '00505C' } };
    morningTh.alignment = { horizontal: 'center', vertical: 'middle' };

    const eveningTh = sheet.getCell('C6');
    eveningTh.value = 'EVENING / TIME';
    eveningTh.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FDE68A' } };
    eveningTh.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '00505C' } };
    eveningTh.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(6).height = 22;

    // Borders for header cells
    ['A5', 'A6', 'B5', 'C5', 'B6', 'C6'].forEach(cellRef => {
      const cell = sheet.getCell(cellRef);
      cell.border = {
        top: { style: 'medium', color: { argb: '003B44' } },
        left: { style: 'thin', color: { argb: 'FFFFFF' } },
        bottom: { style: 'medium', color: { argb: '003B44' } },
        right: { style: 'thin', color: { argb: 'FFFFFF' } }
      };
    });

    // Helper to format shifts for Excel cell
    const formatShiftsText = (shifts) => {
      if (!shifts || shifts.length === 0) return '—';
      if (shifts.length === 1 && shifts[0].staff?.[0] === 'Not Available') return 'Not Available';

      return shifts.map(s => {
        const timePart = s.time ? `(${s.time})\n` : '';
        const staffPart = (s.staff || []).join('\n');
        return `${timePart}${staffPart}`;
      }).join('\n\n');
    };

    // Filter clinical and dental units
    const clinicalUnits = unitsList.filter(u => !u.unit.startsWith('Dental'));
    const dentalUnits = unitsList.filter(u => u.unit.startsWith('Dental'));
    const orderedUnits = [...clinicalUnits, ...dentalUnits];

    let rowIdx = 7;
    orderedUnits.forEach((unit, i) => {
      const isEven = i % 2 === 0;
      const row = sheet.getRow(rowIdx);

      const unitText = unit.unit;
      const morningText = formatShiftsText(unit.morning);
      const eveningText = formatShiftsText(unit.evening);

      row.getCell(1).value = unitText;
      row.getCell(2).value = morningText;
      row.getCell(3).value = eveningText;

      const bgColor = isEven ? 'FFFFFF' : 'F8FFFE';
      const morningBgColor = isEven ? 'F0FFFE' : 'E8FFFE';
      const eveningBgColor = isEven ? 'FFFBF0' : 'FFF8E8';

      // Style Unit Cell
      row.getCell(1).font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: '003B44' } };
      row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
      row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

      // Style Morning Cell
      row.getCell(2).font = { name: 'Segoe UI', size: 10.5, color: { argb: morningText === 'Not Available' ? 'EF4444' : '1E293B' } };
      row.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: morningBgColor } };
      row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

      // Style Evening Cell
      row.getCell(3).font = { name: 'Segoe UI', size: 10.5, color: { argb: eveningText === 'Not Available' ? 'EF4444' : '1E293B' } };
      row.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: eveningBgColor } };
      row.getCell(3).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

      // Borders for data row
      [1, 2, 3].forEach(c => {
        row.getCell(c).border = {
          top: { style: 'thin', color: { argb: 'E2F0F0' } },
          left: { style: 'thin', color: { argb: 'E2F0F0' } },
          bottom: { style: 'thin', color: { argb: 'E2F0F0' } },
          right: { style: 'thin', color: { argb: 'E2F0F0' } }
        };
      });

      // Calculate row height dynamically based on line breaks
      const maxLines = Math.max(
        1,
        morningText.split('\n').length,
        eveningText.split('\n').length
      );
      row.height = Math.max(26, maxLines * 18);

      rowIdx++;
    });

    // Write to buffer & trigger browser download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;

    const sanitizedDate = (dateStr || 'Schedule').replace(/[^a-zA-Z0-9_\-]/g, '_');
    link.download = `${filenamePrefix}_${sanitizedDate}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success("Excel schedule exported successfully!", { id: toastId });
  } catch (err) {
    console.error("Failed to export Excel schedule:", err);
    toast.error("Failed to generate Excel file.", { id: toastId });
  }
};

// ─── Print styles injected into <head> on mount ────────────────────────────────
const PRINT_STYLES = `
  @media print {
    body * { visibility: hidden !important; }
    #roster-print-zone,
    #roster-print-zone *,
    #modal-roster-print-zone,
    #modal-roster-print-zone * { visibility: visible !important; }
    #roster-print-zone,
    #modal-roster-print-zone {
      position: fixed !important;
      top: 5mm !important;
      left: 50% !important;
      transform: translateX(-50%) !important;
      width: fit-content !important;
      max-width: 200mm !important;
      margin: 0 auto !important;
      padding: 6mm 8mm !important;
      background: #fff !important;
      z-index: 99999 !important;
      box-shadow: none !important;
      border-radius: 0 !important;
    }
    @page { size: A4 portrait; margin: 0; }
  }
`;

function injectPrintStyles() {
  if (document.getElementById('roster-print-styles')) return;
  const style = document.createElement('style');
  style.id = 'roster-print-styles';
  style.innerHTML = PRINT_STYLES;
  document.head.appendChild(style);
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function renderShiftCell(shifts) {
  if (!shifts || shifts.length === 0) return <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '13px' }}>—</span>;

  // Check for "Not Available" marker
  if (shifts.length === 1 && shifts[0].staff?.[0] === 'Not Available') {
    return <span style={{ color: '#ef4444', fontWeight: 600, fontSize: '13px' }}>Not Available</span>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center', textAlign: 'center' }}>
      {shifts.map((shift, si) => (
        <div key={si} style={{ textAlign: 'center' }}>
          {shift.time && (
            <div style={{
              fontWeight: 700,
              fontSize: '12px',
              color: '#007b8a',
              marginBottom: '2px',
              fontStyle: 'italic',
              textAlign: 'center'
            }}>
              {shift.time}
            </div>
          )}
          {shift.staff.map((name, ni) => (
            <div key={ni} style={{ fontSize: '13.5px', color: '#1e293b', lineHeight: '1.38', fontWeight: '600', textAlign: 'center' }}>
              {name}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function renderRosterTableRows(unitsList) {
  if (!unitsList || unitsList.length === 0) return null;

  const clinicalUnits = unitsList.filter(u => !u.unit.startsWith('Dental'));
  const dentalUnits = unitsList.filter(u => u.unit.startsWith('Dental'));
  const orderedUnits = [...clinicalUnits, ...dentalUnits];

  return orderedUnits.map((unit, idx) => {
    const isDental = unit.unit.startsWith('Dental');
    const isEven = idx % 2 === 0;

    return (
      <tr
        key={idx}
        style={{
          borderBottom: '1px solid #e2f0f0',
        }}
      >
        <td style={{
          padding: '10px 10px',
          fontWeight: '700',
          fontSize: '13.5px',
          color: '#003B44',
          verticalAlign: 'middle',
          textAlign: 'center',
          borderRight: '1px solid #e2f0f0',
          borderLeft: isDental ? '4px solid #0284c7' : '4px solid #007b8a',
          backgroundColor: isEven ? '#ffffff' : '#f8fffe',
          width: '30%',
        }}>
          {unit.unit}
        </td>
        <td style={{
          padding: '10px 10px',
          verticalAlign: 'middle',
          textAlign: 'center',
          borderRight: '1px solid #e2f0f0',
          backgroundColor: isEven ? '#f0fffe' : '#e8fffe',
          width: '35%',
        }}>
          {renderShiftCell(unit.morning)}
        </td>
        <td style={{
          padding: '10px 10px',
          verticalAlign: 'middle',
          textAlign: 'center',
          backgroundColor: isEven ? '#fffbf0' : '#fff8e8',
          width: '35%',
        }}>
          {renderShiftCell(unit.evening)}
        </td>
      </tr>
    );
  });
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function RosterGenerator() {
  const [activeTab, setActiveTab] = useState('generator'); // 'generator' | 'history' | 'ai'
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rosterData, setRosterData] = useState(null);
  const [exporting, setExporting] = useState(false);
  const fileInputRef = useRef(null);

  // History state
  const [historyList, setHistoryList] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Advanced History Management State
  const [selectedHistoryIds, setSelectedHistoryIds] = useState([]);
  const [historySearch, setHistorySearch] = useState('');
  const [historyMonthFilter, setHistoryMonthFilter] = useState('');
  const [historySortBy, setHistorySortBy] = useState('date_desc'); // 'date_desc' | 'date_asc' | 'doctors_desc' | 'units_desc'
  const [deleteConfirmItem, setDeleteConfirmItem] = useState(null);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Lumina AI state
  const [selectedSchedule1, setSelectedSchedule1] = useState('');
  const [selectedSchedule2, setSelectedSchedule2] = useState('');
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [loadingAi, setLoadingAi] = useState(false);

  // Duplicate warning state
  const [duplicateWarning, setDuplicateWarning] = useState(null);

  // Preview Modal state
  const [previewModalItem, setPreviewModalItem] = useState(null);

  // Doctor Extractor state
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [modalDoctorFilter, setModalDoctorFilter] = useState('');

  // Collect all unique doctors across all archived schedules
  const uniqueDoctorsList = useMemo(() => {
    const nameSet = new Set();
    historyList.forEach(item => {
      (item.parsedUnits || []).forEach(unit => {
        (unit.morning || []).forEach(shift => {
          (shift.staff || []).forEach(name => {
            if (name && name !== 'Not Available' && name !== '—') nameSet.add(name.trim());
          });
        });
        (unit.evening || []).forEach(shift => {
          (shift.staff || []).forEach(name => {
            if (name && name !== 'Not Available' && name !== '—') nameSet.add(name.trim());
          });
        });
      });
    });
    return Array.from(nameSet).sort((a, b) => a.localeCompare(b));
  }, [historyList]);

  // Filter shifts across history for selectedDoctor
  const extractedDoctorShifts = useMemo(() => {
    if (!selectedDoctor) return [];
    const query = selectedDoctor.toLowerCase().trim();

    const results = [];
    historyList.forEach(item => {
      (item.parsedUnits || []).forEach(unit => {
        const isDental = unit.unit.startsWith('Dental');
        const dept = isDental ? 'Dental' : 'Clinical Plaza';

        (unit.morning || []).forEach(shift => {
          const matchStaff = (shift.staff || []).filter(s => s.toLowerCase().includes(query));
          if (matchStaff.length > 0) {
            results.push({
              scheduleId: item.id,
              date: item.roster_date,
              fileName: item.file_name,
              dept,
              unit: unit.unit,
              shiftType: 'Morning',
              time: shift.time || '(Morning Shift)',
              matchedName: matchStaff[0],
              coStaff: (shift.staff || []).filter(s => !s.toLowerCase().includes(query)),
            });
          }
        });

        (unit.evening || []).forEach(shift => {
          const matchStaff = (shift.staff || []).filter(s => s.toLowerCase().includes(query));
          if (matchStaff.length > 0) {
            results.push({
              scheduleId: item.id,
              date: item.roster_date,
              fileName: item.file_name,
              dept,
              unit: unit.unit,
              shiftType: 'Evening',
              time: shift.time || '(Evening Shift)',
              matchedName: matchStaff[0],
              coStaff: (shift.staff || []).filter(s => !s.toLowerCase().includes(query)),
            });
          }
        });
      });
    });
    return results;
  }, [selectedDoctor, historyList]);

  // Modal doctor filter logic
  const previewModalDoctorList = useMemo(() => {
    if (!previewModalItem) return [];
    const set = new Set();
    (previewModalItem.parsedUnits || []).forEach(u => {
      (u.morning || []).forEach(s => (s.staff || []).forEach(st => {
        if (st && st !== 'Not Available' && st !== '—') set.add(st.trim());
      }));
      (u.evening || []).forEach(s => (s.staff || []).forEach(st => {
        if (st && st !== 'Not Available' && st !== '—') set.add(st.trim());
      }));
    });
    return Array.from(set).sort();
  }, [previewModalItem]);

  const previewModalDisplayUnits = useMemo(() => {
    if (!previewModalItem) return [];
    if (!modalDoctorFilter) return previewModalItem.parsedUnits || [];

    const filterLower = modalDoctorFilter.toLowerCase().trim();
    return (previewModalItem.parsedUnits || []).map(u => {
      const filteredMorning = (u.morning || []).filter(s =>
        (s.staff || []).some(st => st.toLowerCase().includes(filterLower))
      );
      const filteredEvening = (u.evening || []).filter(s =>
        (s.staff || []).some(st => st.toLowerCase().includes(filterLower))
      );
      if (filteredMorning.length === 0 && filteredEvening.length === 0) return null;
      return {
        unit: u.unit,
        morning: filteredMorning,
        evening: filteredEvening,
      };
    }).filter(Boolean);
  }, [previewModalItem, modalDoctorFilter]);

  const handleCopyDoctorSchedule = (docName, shifts) => {
    if (!shifts || shifts.length === 0) return;
    let txt = `🏥 LEGACY CLINICS & DIAGNOSTICS\n👨‍⚕️ DUTY SCHEDULE FOR: ${docName}\n${'─'.repeat(40)}\n\n`;
    shifts.forEach((s, idx) => {
      txt += `${idx + 1}. Date: ${s.date}\n   Unit: ${s.unit} (${s.dept})\n   Shift: ${s.shiftType} | ${s.time}\n\n`;
    });
    txt += `Generated via Legacy Reporting Portal`;
    navigator.clipboard.writeText(txt);
    toast.success(`Copied schedule for ${docName} to clipboard!`);
  };

  // Search, filter, and sort history records
  const filteredHistoryList = useMemo(() => {
    let list = [...historyList];

    // Search filter
    if (historySearch.trim()) {
      const q = historySearch.toLowerCase().trim();
      list = list.filter(item =>
        (item.roster_date && item.roster_date.toLowerCase().includes(q)) ||
        (item.file_name && item.file_name.toLowerCase().includes(q)) ||
        (item.created_by_name && item.created_by_name.toLowerCase().includes(q))
      );
    }

    // Month filter
    if (historyMonthFilter) {
      list = list.filter(item => {
        if (!item.roster_date) return false;
        return item.roster_date.toLowerCase().includes(historyMonthFilter.toLowerCase());
      });
    }

    // Sort
    list.sort((a, b) => {
      if (historySortBy === 'date_asc') return (a.id || 0) - (b.id || 0);
      if (historySortBy === 'doctors_desc') return (b.doctorCount || 0) - (a.doctorCount || 0);
      if (historySortBy === 'units_desc') return (b.unitCount || 0) - (a.unitCount || 0);
      return (b.id || 0) - (a.id || 0);
    });

    return list;
  }, [historyList, historySearch, historyMonthFilter, historySortBy]);

  const archiveStats = useMemo(() => {
    const totalSchedules = historyList.length;
    const totalDoctors = uniqueDoctorsList.length;
    const latestSchedule = historyList[0]?.roster_date || 'N/A';
    const totalUnitsCount = historyList.reduce((acc, h) => acc + (h.unitCount || 0), 0);
    const avgUnits = totalSchedules > 0 ? Math.round(totalUnitsCount / totalSchedules) : 0;

    return {
      totalSchedules,
      totalDoctors,
      latestSchedule,
      avgUnits,
    };
  }, [historyList, uniqueDoctorsList]);

  const handleDeleteSingle = async (id) => {
    setDeleting(true);
    try {
      const { data } = await deleteRosterHistory(id);
      if (data?.success) {
        toast.success(data.message || 'Archived schedule deleted.');
        setHistoryList(prev => prev.filter(item => item.id !== id));
        setSelectedHistoryIds(prev => prev.filter(i => i !== id));
        setDeleteConfirmItem(null);
      } else {
        toast.error(data?.message || 'Failed to delete schedule.');
      }
    } catch (err) {
      toast.error('Failed to delete archived schedule.');
    } finally {
      setDeleting(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedHistoryIds.length === 0) return;
    setDeleting(true);
    try {
      const { data } = await bulkDeleteRosterHistory(selectedHistoryIds);
      if (data?.success) {
        toast.success(data.message || 'Selected schedules deleted.');
        setHistoryList(prev => prev.filter(item => !selectedHistoryIds.includes(item.id)));
        setSelectedHistoryIds([]);
        setShowBulkDeleteModal(false);
      } else {
        toast.error(data?.message || 'Failed to delete schedules.');
      }
    } catch (err) {
      toast.error('Failed to bulk delete schedules.');
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleSelectAll = () => {
    if (selectedHistoryIds.length === filteredHistoryList.length && filteredHistoryList.length > 0) {
      setSelectedHistoryIds([]);
    } else {
      setSelectedHistoryIds(filteredHistoryList.map(item => item.id));
    }
  };

  const handleToggleSelectRow = (id) => {
    setSelectedHistoryIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  injectPrintStyles();

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const { data } = await fetchRosterHistory();
      if (data?.success) {
        setHistoryList(data.data || []);
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e) => {
    e.preventDefault(); setIsDragging(false);
    if (e.dataTransfer.files?.[0]) validateAndProcess(e.dataTransfer.files[0]);
  };
  const handleFileChange = (e) => { if (e.target.files?.[0]) validateAndProcess(e.target.files[0]); };

  const validateAndProcess = (f) => {
    if (!f.name.toLowerCase().endsWith('.docx')) {
      toast.error('Invalid file. Please upload a .docx document.');
      return;
    }
    setFile(f);
    uploadAndParse(f);
  };

  const uploadAndParse = async (f, overwrite = false) => {
    setLoading(true);
    setRosterData(null);
    setDuplicateWarning(null);
    try {
      const { data } = await parseRosterFile(f, overwrite);
      if (data?.success) {
        setRosterData(data);
        toast.success(overwrite ? 'Roster updated successfully!' : 'Roster parsed & saved to history successfully!');
        loadHistory();
      } else {
        toast.error(data?.message || 'Failed to process file.');
      }
    } catch (err) {
      if (err.response?.data?.isDuplicate) {
        setDuplicateWarning(err.response.data.message);
        toast.error(err.response.data.message, { duration: 6000 });
      } else {
        toast.error(err.response?.data?.message || 'Error processing .docx file.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => window.print();

  const handleExportHtml = async (elementId = 'roster-print-zone', customTitle = '') => {
    const zone = document.getElementById(elementId);
    if (!zone) {
      toast.error('Could not find schedule element to export.');
      return;
    }

    const titleStr = customTitle || rosterData?.dateStr || previewModalItem?.roster_date || 'Schedule';
    const safeName = (rosterData?.tomorrowDate || previewModalItem?.roster_date || 'roster').replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `Legacy_Roster_${safeName}.html`;

    const clone = zone.cloneNode(true);

    // Convert logo image to base64 dynamically so HTML file is 100% self-contained
    try {
      const response = await fetch('/legacy-logo.png');
      const blob = await response.blob();
      const base64Logo = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
      const logoImg = clone.querySelector('img[alt="Legacy Clinics"]');
      if (logoImg) {
        logoImg.src = base64Logo;
      }
    } catch (e) {
      console.warn('Could not embed logo base64:', e);
    }

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Legacy Clinics - Doctor's Schedule (${titleStr})</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      background-color: #f1f5f9;
      margin: 0;
      padding: 24px 12px;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      min-height: 100vh;
    }
    .roster-card-wrapper {
      width: 794px;
      max-width: 100%;
      background-color: #ffffff;
      border-radius: 10px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 24px rgba(0,0,0,0.08);
      overflow: hidden;
    }
    @media print {
      body { background: #ffffff; padding: 0; }
      .roster-card-wrapper { box-shadow: none; border: none; width: 100%; }
    }
  </style>
</head>
<body>
  <div class="roster-card-wrapper">
    ${clone.innerHTML}
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Roster exported as HTML file with logo!');
  };

  const handleDownloadDocx = async (id, fileName) => {
    try {
      await downloadRosterDocx(id, fileName);
      toast.success('DOCX file download started.');
    } catch (err) {
      toast.error('Failed to download DOCX file.');
    }
  };

  const runAiAudit = async (sched1Id, sched2Id) => {
    setLoadingAi(true);
    try {
      const { data } = await analyzeRosterAI(sched1Id || selectedSchedule1, sched2Id || selectedSchedule2);
      if (data?.success) {
        setAiAnalysis(data.data);
        toast.success('Lumina AI Roster Audit complete!');
      } else {
        toast.error(data?.message || 'AI Analysis failed.');
      }
    } catch (err) {
      toast.error('Failed to run Lumina AI schedule audit.');
    } finally {
      setLoadingAi(false);
    }
  };

  const triggerAiForSchedule = (item) => {
    setActiveTab('ai');
    setSelectedSchedule2(item.id);
    // Find prior item if available
    const idx = historyList.findIndex(h => h.id === item.id);
    if (idx < historyList.length - 1) {
      setSelectedSchedule1(historyList[idx + 1].id);
      runAiAudit(historyList[idx + 1].id, item.id);
    } else {
      setSelectedSchedule1('');
      runAiAudit('', item.id);
    }
  };

  const hasData = rosterData && rosterData.parsedUnits && rosterData.parsedUnits.length > 0;

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <div style={{ padding: '8px', backgroundColor: '#e0f2fe', color: '#0284c7', borderRadius: '8px' }}>
              <CalendarDays size={22} />
            </div>
            <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
              Doctors Schedule & Duty Roster Hub
            </h1>
          </div>
          <p style={{ color: '#64748b', fontSize: '13px', margin: 0, paddingLeft: '44px' }}>
            Automated .docx duty roster extraction, printable A4 schedules, history archives, and Lumina AI Change Analytics.
          </p>
        </div>
        {rosterData?.tomorrowDate && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', padding: '8px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: '700' }}>
            <CalendarDays size={15} />
            {rosterData.tomorrowDate}
          </div>
        )}
      </div>

      {/* ── Tab Navigation ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', marginBottom: '24px', gap: '8px' }}>
        <button
          onClick={() => setActiveTab('generator')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            border: 'none',
            borderBottom: activeTab === 'generator' ? '3px solid #007b8a' : '3px solid transparent',
            backgroundColor: activeTab === 'generator' ? '#f0fdfa' : 'transparent',
            color: activeTab === 'generator' ? '#007b8a' : '#64748b',
            fontWeight: activeTab === 'generator' ? '700' : '600',
            fontSize: '14px',
            cursor: 'pointer',
            borderRadius: '8px 8px 0 0',
            transition: 'all 0.15s ease',
          }}
        >
          <UploadCloud size={17} /> Roster Generator
        </button>
        <button
          onClick={() => { setActiveTab('history'); loadHistory(); }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            border: 'none',
            borderBottom: activeTab === 'history' ? '3px solid #007b8a' : '3px solid transparent',
            backgroundColor: activeTab === 'history' ? '#f0fdfa' : 'transparent',
            color: activeTab === 'history' ? '#007b8a' : '#64748b',
            fontWeight: activeTab === 'history' ? '700' : '600',
            fontSize: '14px',
            cursor: 'pointer',
            borderRadius: '8px 8px 0 0',
            transition: 'all 0.15s ease',
          }}
        >
          <History size={17} /> Past Schedules ({historyList.length})
        </button>
        <button
          onClick={() => { setActiveTab('ai'); if (!aiAnalysis) runAiAudit(); }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            border: 'none',
            borderBottom: activeTab === 'ai' ? '3px solid #7c3aed' : '3px solid transparent',
            backgroundColor: activeTab === 'ai' ? '#f5f3ff' : 'transparent',
            color: activeTab === 'ai' ? '#7c3aed' : '#64748b',
            fontWeight: activeTab === 'ai' ? '700' : '600',
            fontSize: '14px',
            cursor: 'pointer',
            borderRadius: '8px 8px 0 0',
            transition: 'all 0.15s ease',
          }}
        >
          <Sparkles size={17} /> Lumina AI Schedule Analytics
        </button>
      </div>

      {/* ── TAB 1: Roster Generator ────────────────────────────────────────── */}
      {activeTab === 'generator' && (
        <>
          {/* Privacy Banner */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', color: '#1e40af' }}>
            <ShieldCheck size={18} style={{ flexShrink: 0 }} />
            <span><strong>Privacy Safeguard Active:</strong> Phone numbers, TL identifiers, and administrative staff are automatically stripped from the output.</span>
          </div>

          {/* Duplicate Warning & Overwrite Banner */}
          {duplicateWarning && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', backgroundColor: '#fff7ed', border: '1px solid #ffedd5', borderRadius: '8px', marginBottom: '20px', fontSize: '13px', color: '#c2410c' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                <span>{duplicateWarning}</span>
              </div>
              <button
                onClick={() => file && uploadAndParse(file, true)}
                style={{ padding: '6px 14px', backgroundColor: '#ea580c', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                Overwrite Existing Roster
              </button>
            </div>
          )}

          {/* Upload Zone */}
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${isDragging ? '#0284c7' : '#cbd5e1'}`,
                backgroundColor: isDragging ? '#f0f9ff' : '#f8fafc',
                borderRadius: '10px',
                padding: '32px 20px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                style={{ display: 'none' }}
              />
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
                <div style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284c7' }}>
                  <UploadCloud size={26} />
                </div>
              </div>
              <p style={{ fontSize: '14px', fontWeight: '600', color: '#334155', margin: '0 0 4px' }}>
                {file ? `Selected: ${file.name}` : 'Click to upload or drag & drop your .docx duty roster'}
              </p>
              <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>Only .docx files are accepted</p>
              {loading && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '14px', color: '#0284c7', fontSize: '13px', fontWeight: '600' }}>
                  <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  Parsing & scrubbing sensitive data...
                </div>
              )}
            </div>
          </div>

          {/* Roster Table Preview */}
          {hasData && (
            <>
              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
                <button
                  onClick={handlePrint}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '9px 18px', backgroundColor: '#007b8a', color: '#fff', border: 'none', borderRadius: '7px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
                >
                  <Printer size={16} /> Print / Save as PDF
                </button>
                <button
                  onClick={() => handleExportHtml('roster-print-zone', rosterData?.dateStr)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '9px 18px', backgroundColor: '#007b8a', color: '#fff', border: 'none', borderRadius: '7px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: 'background-color 0.2s' }}
                >
                  <FileCode size={16} /> Export as HTML
                </button>
                <button
                  onClick={() => exportRosterToExcel(rosterData?.dayName, rosterData?.dateStr, rosterData?.parsedUnits, 'Doctors_Schedule')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '9px 18px', backgroundColor: '#166534', color: '#fff', border: 'none', borderRadius: '7px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: 'background-color 0.2s' }}
                >
                  <FileSpreadsheet size={16} /> Export Excel (.xlsx)
                </button>
                <button
                  onClick={() => { setRosterData(null); setFile(null); }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '9px 18px', backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '7px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
                >
                  <FileText size={16} /> Upload New File
                </button>
              </div>

              {/* ── PRINTABLE ROSTER TABLE — Optimized Compact Layout ─────────────── */}
              <div
                id="roster-print-zone"
                style={{
                  width: '100%',
                  maxWidth: '760px',
                  margin: '0 auto',
                  backgroundColor: '#ffffff',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
                  fontFamily: "'Segoe UI', Arial, sans-serif",
                  overflow: 'hidden',
                }}
              >
                {/* Letterhead */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 18px',
                  borderBottom: '3px solid #007b8a',
                  background: 'linear-gradient(135deg, #f8fafc 0%, #e0f2fe 100%)',
                  gap: '12px',
                }}>
                  {/* Logo + Clinic Name */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '0', flexShrink: 1 }}>
                    <img
                      src="/legacy-logo.png"
                      alt="Legacy Clinics"
                      style={{ height: '44px', width: 'auto', objectFit: 'contain', flexShrink: 0 }}
                    />
                    <div style={{ minWidth: '0' }}>
                      <div style={{ fontSize: '13px', fontWeight: '800', color: '#475569', letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                        Legacy Clinics and Diagnostics
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', whiteSpace: 'nowrap' }}>
                        KK3 RD 134, Kicukiro, Kigali &nbsp;|&nbsp; +250 788 122 100
                      </div>
                    </div>
                  </div>

                  {/* Title block */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '20px', fontWeight: '800', color: '#003B44', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                      Doctor's Schedule
                    </div>
                    <div style={{ marginTop: '3px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        display: 'inline-block',
                        backgroundColor: '#007b8a',
                        color: '#fff',
                        fontWeight: '700',
                        fontSize: '11.5px',
                        padding: '2px 10px',
                        borderRadius: '14px',
                        letterSpacing: '0.03em'
                      }}>
                        {rosterData.dayName}
                      </span>
                      <span style={{ fontSize: '13px', color: '#334155', fontWeight: '700' }}>
                        {rosterData.dateStr}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Table */}
                <div>
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '13px',
                    tableLayout: 'fixed',
                  }}>
                    <thead>
                      <tr style={{ backgroundColor: '#003B44' }}>
                        <th
                          rowSpan={2}
                          style={{
                            padding: '8px 10px',
                            color: '#ffffff',
                            fontWeight: '800',
                            fontSize: '13px',
                            textAlign: 'center',
                            letterSpacing: '0.06em',
                            textTransform: 'uppercase',
                            borderRight: '2px solid rgba(255,255,255,0.25)',
                            verticalAlign: 'middle',
                            backgroundColor: '#003B44',
                            width: '30%',
                          }}
                        >
                          UNIT
                        </th>
                        <th
                          colSpan={2}
                          style={{
                            padding: '6px 10px',
                            color: '#7ee8f8',
                            fontWeight: '800',
                            fontSize: '13px',
                            textAlign: 'center',
                            letterSpacing: '0.06em',
                            textTransform: 'uppercase',
                            borderBottom: '1px solid rgba(255,255,255,0.2)',
                            backgroundColor: '#003B44',
                          }}
                        >
                          DOCTORS / PROVIDERS
                        </th>
                      </tr>
                      <tr style={{ backgroundColor: '#00505c' }}>
                        <th
                          style={{
                            padding: '6px 10px',
                            color: '#a5f3fc',
                            fontWeight: '700',
                            fontSize: '12px',
                            textAlign: 'center',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            borderRight: '1px solid rgba(255,255,255,0.15)',
                            backgroundColor: '#00505c',
                            width: '35%',
                          }}
                        >
                          MORNING / TIME
                        </th>
                        <th
                          style={{
                            padding: '6px 10px',
                            color: '#fde68a',
                            fontWeight: '700',
                            fontSize: '12px',
                            textAlign: 'center',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            backgroundColor: '#00505c',
                            width: '35%',
                          }}
                        >
                          EVENING / TIME
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {renderRosterTableRows(rosterData.parsedUnits)}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {rosterData && !hasData && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px dashed #e2e8f0' }}>
              <FileText size={40} style={{ marginBottom: '12px', opacity: 0.4 }} />
              <p style={{ fontSize: '15px', fontWeight: '600', color: '#64748b', margin: '0 0 4px' }}>No clinical roster data found</p>
              <p style={{ fontSize: '13px', margin: 0 }}>Make sure the uploaded file contains a recognisable duty roster table with department and doctor names.</p>
            </div>
          )}
        </>
      )}

      {/* ── TAB 2: Roster History ─────────────────────────────────────────── */}
      {activeTab === 'history' && (
        <div>
          {/* ── Top Archive Stats Overview ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div style={{ backgroundColor: '#fff', padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ padding: '10px', backgroundColor: '#e0f2fe', color: '#0284c7', borderRadius: '10px' }}>
                <History size={22} />
              </div>
              <div>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Archived Schedules</div>
                <div style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>{archiveStats.totalSchedules}</div>
              </div>
            </div>

            <div style={{ backgroundColor: '#fff', padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ padding: '10px', backgroundColor: '#f0fdf4', color: '#166534', borderRadius: '10px' }}>
                <UserCheck size={22} />
              </div>
              <div>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Providers Tracked</div>
                <div style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>{archiveStats.totalDoctors}</div>
              </div>
            </div>

            <div style={{ backgroundColor: '#fff', padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ padding: '10px', backgroundColor: '#f5f3ff', color: '#7c3aed', borderRadius: '10px' }}>
                <CalendarDays size={22} />
              </div>
              <div>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Latest Archive Date</div>
                <div style={{ fontSize: '13.5px', fontWeight: '800', color: '#0f172a' }}>{archiveStats.latestSchedule}</div>
              </div>
            </div>

            <div style={{ backgroundColor: '#fff', padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ padding: '10px', backgroundColor: '#fff7ed', color: '#ea580c', borderRadius: '10px' }}>
                <BarChart3 size={22} />
              </div>
              <div>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Avg Units / Roster</div>
                <div style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>{archiveStats.avgUnits} Units</div>
              </div>
            </div>
          </div>

          {/* Doctor Extractor Panel */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #cbd5e1',
            padding: '20px',
            marginBottom: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ padding: '8px', backgroundColor: '#e0f2fe', color: '#0284c7', borderRadius: '8px' }}>
                  <UserCheck size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: 0 }}>Extract Doctor's Individual Schedule</h3>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0' }}>Select any doctor from past schedules to extract their complete duty roster, units, and shift times.</p>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <select
                  value={selectedDoctor}
                  onChange={(e) => setSelectedDoctor(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #94a3b8',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: selectedDoctor ? '#003B44' : '#64748b',
                    backgroundColor: '#f8fafc',
                    cursor: 'pointer'
                  }}
                >
                  <option value="">-- Select a Doctor to Extract Schedule ({uniqueDoctorsList.length} Providers Found) --</option>
                  {uniqueDoctorsList.map((docName, i) => (
                    <option key={i} value={docName}>{docName}</option>
                  ))}
                </select>
              </div>

              {selectedDoctor && (
                <button
                  onClick={() => setSelectedDoctor('')}
                  style={{
                    padding: '9px 14px',
                    backgroundColor: '#f1f5f9',
                    color: '#475569',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Clear Selection
                </button>
              )}
            </div>

            {/* Extracted Doctor Schedule Display */}
            {selectedDoctor && (
              <div style={{
                backgroundColor: '#f0fffe',
                border: '1px solid #99f6e4',
                borderRadius: '10px',
                padding: '18px',
                marginTop: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #007b8a', paddingBottom: '10px', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#007b8a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Legacy Clinics & Diagnostics • Provider Schedule</div>
                    <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#003B44', margin: '2px 0 0' }}>{selectedDoctor}</h2>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ backgroundColor: '#007b8a', color: '#fff', padding: '4px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: '700' }}>
                      {extractedDoctorShifts.length} Shift{extractedDoctorShifts.length !== 1 ? 's' : ''} Found
                    </span>
                    <button
                      onClick={() => handleCopyDoctorSchedule(selectedDoctor, extractedDoctorShifts)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 14px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                    >
                      <Copy size={14} /> Copy Summary
                    </button>
                  </div>
                </div>

                {extractedDoctorShifts.length === 0 ? (
                  <p style={{ color: '#64748b', fontSize: '13px', fontStyle: 'italic', margin: 0 }}>No shifts found for {selectedDoctor} in past records.</p>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#003B44', color: '#fff' }}>
                        <th style={{ padding: '8px 12px', textAlign: 'left' }}>Roster Date</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left' }}>Department</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left' }}>Unit</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left' }}>Shift</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left' }}>Time Slot</th>
                      </tr>
                    </thead>
                    <tbody>
                      {extractedDoctorShifts.map((shift, sIdx) => (
                        <tr key={sIdx} style={{ borderBottom: '1px solid #ccfbf1', backgroundColor: sIdx % 2 === 0 ? '#fff' : '#f0fffe' }}>
                          <td style={{ padding: '9px 12px', fontWeight: '700', color: '#007b8a' }}>{shift.date}</td>
                          <td style={{ padding: '9px 12px', fontWeight: '600', color: '#334155' }}>{shift.dept}</td>
                          <td style={{ padding: '9px 12px', fontWeight: '700', color: '#003B44' }}>{shift.unit}</td>
                          <td style={{ padding: '9px 12px' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontSize: '11px',
                              fontWeight: '700',
                              backgroundColor: shift.shiftType === 'Morning' ? '#e0f2fe' : '#fef3c7',
                              color: shift.shiftType === 'Morning' ? '#0369a1' : '#b45309'
                            }}>
                              {shift.shiftType}
                            </span>
                          </td>
                          <td style={{ padding: '9px 12px', fontWeight: '700', color: '#007b8a', fontStyle: 'italic' }}>{shift.time}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>

          {/* Main Past Schedules Card */}
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            {/* Header + Search & Filter Toolbar */}
            <div style={{ padding: '16px 20px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: 0 }}>Archived Doctors Schedules</h3>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0' }}>Search, filter, manage, download original files, or delete historical duty rosters.</p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={loadHistory}
                    disabled={loadingHistory}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 14px', backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '7px', fontSize: '12px', fontWeight: '600', color: '#334155', cursor: 'pointer' }}
                  >
                    <RefreshCw size={14} className={loadingHistory ? 'animate-spin' : ''} /> Refresh Archive
                  </button>
                </div>
              </div>

              {/* Toolbar Controls */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                {/* Search Box */}
                <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
                  <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="text"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    placeholder="Search by date, file name, uploader..."
                    style={{ width: '100%', padding: '8px 12px 8px 34px', borderRadius: '7px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff' }}
                  />
                  {historySearch && (
                    <button onClick={() => setHistorySearch('')} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Month Filter */}
                <select
                  value={historyMonthFilter}
                  onChange={(e) => setHistoryMonthFilter(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: '7px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff', color: '#334155', fontWeight: '600', cursor: 'pointer' }}
                >
                  <option value="">All Months</option>
                  <option value="August">August</option>
                  <option value="July">July</option>
                  <option value="June">June</option>
                  <option value="May">May</option>
                  <option value="April">April</option>
                  <option value="March">March</option>
                  <option value="February">February</option>
                  <option value="January">January</option>
                  <option value="December">December</option>
                  <option value="November">November</option>
                  <option value="October">October</option>
                  <option value="September">September</option>
                </select>

                {/* Sort By */}
                <select
                  value={historySortBy}
                  onChange={(e) => setHistorySortBy(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: '7px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff', color: '#334155', fontWeight: '600', cursor: 'pointer' }}
                >
                  <option value="date_desc">Sort: Newest First</option>
                  <option value="date_asc">Sort: Oldest First</option>
                  <option value="doctors_desc">Sort: Most Doctors</option>
                  <option value="units_desc">Sort: Most Units</option>
                </select>
              </div>
            </div>

            {/* Floating Bulk Actions Banner */}
            {selectedHistoryIds.length > 0 && (
              <div style={{ backgroundColor: '#f0fdf4', borderBottom: '2px solid #22c55e', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#166534', fontWeight: '700', fontSize: '13px' }}>
                  <CheckCircle2 size={18} />
                  <span>{selectedHistoryIds.length} Schedule{selectedHistoryIds.length > 1 ? 's' : ''} Selected</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {selectedHistoryIds.length === 2 && (
                    <button
                      onClick={() => {
                        setActiveTab('ai');
                        setSelectedSchedule1(selectedHistoryIds[0]);
                        setSelectedSchedule2(selectedHistoryIds[1]);
                        runAiAudit(selectedHistoryIds[0], selectedHistoryIds[1]);
                      }}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 14px', backgroundColor: '#7c3aed', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                    >
                      <Sparkles size={14} /> Compare Selected with Lumina AI
                    </button>
                  )}

                  <button
                    onClick={() => setShowBulkDeleteModal(true)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 14px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                  >
                    <Trash2 size={14} /> Delete Selected ({selectedHistoryIds.length})
                  </button>

                  <button
                    onClick={() => setSelectedHistoryIds([])}
                    style={{ padding: '7px 12px', backgroundColor: '#fff', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                  >
                    Clear Selection
                  </button>
                </div>
              </div>
            )}

            {loadingHistory ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px', color: '#007b8a' }} />
                <p style={{ margin: 0, fontSize: '13px' }}>Loading roster history...</p>
              </div>
            ) : filteredHistoryList.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                <History size={32} style={{ margin: '0 auto 12px', color: '#cbd5e1' }} />
                <p style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>No matching archived schedules found</p>
                <p style={{ fontSize: '12px' }}>Try adjusting your search query or filters.</p>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', textAlign: 'left' }}>
                    <th style={{ padding: '12px 16px', width: '40px' }}>
                      <input
                        type="checkbox"
                        checked={selectedHistoryIds.length === filteredHistoryList.length && filteredHistoryList.length > 0}
                        onChange={handleToggleSelectAll}
                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                    </th>
                    <th style={{ padding: '12px 16px', fontWeight: '700' }}>Roster Date</th>
                    <th style={{ padding: '12px 16px', fontWeight: '700' }}>Source File</th>
                    <th style={{ padding: '12px 16px', fontWeight: '700', textAlign: 'center' }}>Units</th>
                    <th style={{ padding: '12px 16px', fontWeight: '700', textAlign: 'center' }}>Doctors</th>
                    <th style={{ padding: '12px 16px', fontWeight: '700' }}>Uploaded At</th>
                    <th style={{ padding: '12px 16px', fontWeight: '700', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistoryList.map((item, idx) => {
                    const isSelected = selectedHistoryIds.includes(item.id);
                    return (
                      <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: isSelected ? '#f0fdf4' : (idx % 2 === 0 ? '#fff' : '#f8fafc') }}>
                        <td style={{ padding: '12px 16px' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectRow(item.id)}
                            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                          />
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: '700', color: '#007b8a' }}>
                          {item.roster_date}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#334155' }}>
                          <FileText size={14} style={{ display: 'inline', marginRight: '6px', color: '#0284c7' }} />
                          {item.file_name}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '600' }}>
                          {item.unitCount} units
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '600', color: '#166534' }}>
                          {item.doctorCount} doctors
                        </td>
                        <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '12px' }}>
                          {new Date(item.created_at).toLocaleString()}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            <button
                              onClick={() => {
                                setModalDoctorFilter('');
                                setPreviewModalItem(item);
                              }}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 10px', backgroundColor: '#007b8a', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                              title="Preview Full Schedule"
                            >
                              <Eye size={13} /> Preview
                            </button>
                            <button
                              onClick={() => handleDownloadDocx(item.id, item.file_name)}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 10px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                              title="Download original DOCX"
                            >
                              <Download size={13} /> .docx
                            </button>
                            <button
                              onClick={() => exportRosterToExcel('', item.roster_date, item.schedule_json, 'Doctors_Schedule')}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 10px', backgroundColor: '#166534', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                              title="Export Schedule as Excel (.xlsx)"
                            >
                              <FileSpreadsheet size={13} /> .xlsx
                            </button>
                            <button
                              onClick={() => triggerAiForSchedule(item)}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 10px', backgroundColor: '#7c3aed', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                              title="Lumina AI Audit"
                            >
                              <Sparkles size={13} /> AI Audit
                            </button>
                            <button
                              onClick={() => setDeleteConfirmItem(item)}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 10px', backgroundColor: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                              title="Delete Archived Schedule"
                            >
                              <Trash2 size={13} /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}


      {/* ── TAB 3: Lumina AI Schedule Analytics ───────────────────────────── */}
      {activeTab === 'ai' && (
        <div>
          {/* Controls */}
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{ padding: '8px', backgroundColor: '#f3e8ff', color: '#7c3aed', borderRadius: '8px' }}>
                <Sparkles size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: 0 }}>Lumina AI Schedule Change Analyzer & Vulnerability Audit</h3>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0' }}>Select any two schedule versions to automatically extract doctor movement, shift swaps, and single-point-of-failure coverage risks.</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '16px', alignItems: 'end' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>Baseline Schedule (Older)</label>
                <select
                  value={selectedSchedule1}
                  onChange={(e) => setSelectedSchedule1(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                >
                  <option value="">-- Latest Previous Schedule (Default) --</option>
                  {historyList.map(h => (
                    <option key={h.id} value={h.id}>{h.roster_date} ({h.file_name})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>Target Schedule (Newer)</label>
                <select
                  value={selectedSchedule2}
                  onChange={(e) => setSelectedSchedule2(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                >
                  <option value="">-- Latest Uploaded Schedule (Default) --</option>
                  {historyList.map(h => (
                    <option key={h.id} value={h.id}>{h.roster_date} ({h.file_name})</option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => runAiAudit()}
                disabled={loadingAi}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  backgroundColor: '#7c3aed',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '7px',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: loadingAi ? 'not-allowed' : 'pointer',
                }}
              >
                {loadingAi ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} />}
                Run Lumina AI Audit
              </button>
            </div>
          </div>

          {/* AI Output */}
          {aiAnalysis && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Executive Briefing Banner */}
              <div style={{ backgroundColor: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: '12px', padding: '20px', color: '#581c87' }}>
                <div style={{ whiteSpace: 'pre-line', fontSize: '13.5px', lineHeight: '1.6' }}>
                  {aiAnalysis.aiExecutiveSummary}
                </div>
              </div>

              {/* Doctors Movement Section */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {/* Added Doctors */}
                <div style={{ backgroundColor: '#fff', borderRadius: '10px', border: '1px solid #bbf7d0', padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#166534', fontWeight: '700', fontSize: '14px', marginBottom: '10px' }}>
                    <UserPlus size={18} /> Doctors Added ({aiAnalysis.addedDoctors?.length || 0})
                  </div>
                  {aiAnalysis.addedDoctors?.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {aiAnalysis.addedDoctors.map((doc, i) => (
                        <span key={i} style={{ backgroundColor: '#dcfce7', color: '#15803d', padding: '4px 10px', borderRadius: '16px', fontSize: '12px', fontWeight: '600' }}>
                          + {doc}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>No new doctors added.</p>
                  )}
                </div>

                {/* Removed Doctors */}
                <div style={{ backgroundColor: '#fff', borderRadius: '10px', border: '1px solid #fecaca', padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#991b1b', fontWeight: '700', fontSize: '14px', marginBottom: '10px' }}>
                    <UserMinus size={18} /> Doctors Off / Removed ({aiAnalysis.removedDoctors?.length || 0})
                  </div>
                  {aiAnalysis.removedDoctors?.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {aiAnalysis.removedDoctors.map((doc, i) => (
                        <span key={i} style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '4px 10px', borderRadius: '16px', fontSize: '12px', fontWeight: '600' }}>
                          - {doc}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>No doctors removed.</p>
                  )}
                </div>
              </div>

              {/* Shift Modifications Table */}
              {aiAnalysis.modifiedShifts?.length > 0 && (
                <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                  <div style={{ padding: '14px 20px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontWeight: '700', fontSize: '14px', color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ArrowRightLeft size={16} style={{ color: '#7c3aed' }} /> Shift & Department Modifications ({aiAnalysis.modifiedShifts.length})
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
                        <th style={{ padding: '10px 16px', textAlign: 'left' }}>Physician</th>
                        <th style={{ padding: '10px 16px', textAlign: 'left' }}>Previous Schedule</th>
                        <th style={{ padding: '10px 16px', textAlign: 'left' }}>Current Schedule</th>
                      </tr>
                    </thead>
                    <tbody>
                      {aiAnalysis.modifiedShifts.map((mod, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 16px', fontWeight: '700', color: '#0f172a' }}>{mod.doctor}</td>
                          <td style={{ padding: '10px 16px', color: '#64748b', fontSize: '12px' }}>{mod.previous || 'None'}</td>
                          <td style={{ padding: '10px 16px', color: '#7c3aed', fontWeight: '600', fontSize: '12px' }}>{mod.current}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Department Risk & Vulnerability Heatmap */}
              <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontWeight: '700', fontSize: '14px', color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={16} style={{ color: '#d97706' }} /> Department Staffing Risk & Vulnerability Audit
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '10px 16px', textAlign: 'left' }}>Department</th>
                      <th style={{ padding: '10px 16px', textAlign: 'center' }}>Morning Doctors</th>
                      <th style={{ padding: '10px 16px', textAlign: 'center' }}>Evening Doctors</th>
                      <th style={{ padding: '10px 16px', textAlign: 'center' }}>Total Staff</th>
                      <th style={{ padding: '10px 16px', textAlign: 'left' }}>Risk Level</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aiAnalysis.departmentCoverage?.map((dept, i) => {
                      let badgeBg = '#dcfce7';
                      let badgeColor = '#15803d';
                      let label = 'Optimal Coverage';

                      if (dept.vulnerability === 'CRITICAL_UNCOVERED') {
                        badgeBg = '#fee2e2';
                        badgeColor = '#b91c1c';
                        label = 'Critical: Uncovered Shift';
                      } else if (dept.vulnerability === 'SINGLE_PHYSICIAN') {
                        badgeBg = '#fef3c7';
                        badgeColor = '#b45309';
                        label = 'Warning: Single Physician';
                      }

                      return (
                        <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 16px', fontWeight: '700', color: '#003B44' }}>{dept.unit}</td>
                          <td style={{ padding: '10px 16px', textAlign: 'center', fontWeight: '600' }}>{dept.morningDoctors}</td>
                          <td style={{ padding: '10px 16px', textAlign: 'center', fontWeight: '600' }}>{dept.eveningDoctors}</td>
                          <td style={{ padding: '10px 16px', textAlign: 'center', fontWeight: '700' }}>{dept.totalStaff}</td>
                          <td style={{ padding: '10px 16px' }}>
                            <span style={{ backgroundColor: badgeBg, color: badgeColor, padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700' }}>
                              {label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── PREVIEW MODAL ───────────────────────────────────────────────────────── */}
      {previewModalItem && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px',
        }}>
          <div style={{
            width: '940px',
            maxWidth: '95vw',
            maxHeight: '92vh',
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'fadeIn 0.2s ease-out',
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 24px',
              background: 'linear-gradient(135deg, #002b32 0%, #004d57 100%)',
              color: '#fff',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(126, 232, 248, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(126, 232, 248, 0.3)'
                }}>
                  <Eye size={20} style={{ color: '#7ee8f8' }} />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0, color: '#fff', letterSpacing: '-0.01em' }}>
                    Archived Roster — {previewModalItem.roster_date}
                  </h3>
                  <p style={{ fontSize: '11.5px', color: '#a5f3fc', margin: '2px 0 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>File: <strong>{previewModalItem.file_name}</strong></span>
                    <span>•</span>
                    <span>Uploaded by {previewModalItem.created_by_name || 'Admin'}</span>
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => handleExportHtml('modal-roster-print-zone', previewModalItem?.roster_date)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 14px', backgroundColor: '#007b8a', color: '#fff', border: 'none', borderRadius: '7px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.15s' }}
                >
                  <FileCode size={14} /> Export HTML
                </button>
                <button
                  onClick={() => exportRosterToExcel('', previewModalItem?.roster_date, previewModalDisplayUnits, 'Doctors_Schedule')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 14px', backgroundColor: '#166534', color: '#fff', border: 'none', borderRadius: '7px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.15s' }}
                >
                  <FileSpreadsheet size={14} /> Excel (.xlsx)
                </button>
                <button
                  onClick={() => window.print()}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 14px', backgroundColor: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '7px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                >
                  <Printer size={14} /> Print
                </button>
                <button
                  onClick={() => handleDownloadDocx(previewModalItem.id, previewModalItem.file_name)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 14px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '7px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                >
                  <Download size={14} /> .docx
                </button>
                <button
                  onClick={() => setPreviewModalItem(null)}
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', backgroundColor: 'rgba(255,255,255,0.12)', color: '#fff', border: 'none', borderRadius: '50%', cursor: 'pointer', transition: 'background-color 0.15s' }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px', overflowY: 'auto', flex: 1, backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              {/* Summary Metric Pills & Doctor Extraction Bar */}
              <div style={{
                width: '100%',
                maxWidth: `${A4_W}px`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#ffffff',
                padding: '10px 16px',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                fontSize: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#003B44', fontWeight: '600' }}>
                    <ShieldCheck size={15} style={{ color: '#007b8a' }} />
                    {(previewModalItem.parsedUnits || []).length} Active Units
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#475569', fontWeight: '500' }}>
                    <CalendarDays size={15} style={{ color: '#0284c7' }} />
                    {previewModalItem.roster_date}
                  </span>
                </div>

                {/* Doctor Filter inside Modal */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: '700', color: '#007b8a', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', textTransform: 'uppercase' }}>
                    <UserCheck size={14} /> Extract Doctor:
                  </span>
                  <select
                    value={modalDoctorFilter}
                    onChange={(e) => setModalDoctorFilter(e.target.value)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: '1px solid #007b8a',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#003B44',
                      backgroundColor: '#f0fffe',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="">-- All Scheduled Doctors ({previewModalDoctorList.length}) --</option>
                    {previewModalDoctorList.map((doc, i) => (
                      <option key={i} value={doc}>{doc}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Printable Table Container */}
              <div
                id="modal-roster-print-zone"
                style={{
                  width: '100%',
                  maxWidth: '760px',
                  margin: '0 auto',
                  backgroundColor: '#ffffff',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
                  overflow: 'hidden',
                  fontFamily: "'Segoe UI', Arial, sans-serif",
                }}
              >
                {/* Letterhead */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 18px',
                  borderBottom: '3px solid #007b8a',
                  background: 'linear-gradient(135deg, #f8fafc 0%, #e0f2fe 100%)',
                  gap: '12px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '0', flexShrink: 1 }}>
                    <img src="/legacy-logo.png" alt="Legacy Clinics" style={{ height: '44px', width: 'auto', objectFit: 'contain', flexShrink: 0 }} />
                    <div style={{ minWidth: '0' }}>
                      <div style={{ fontSize: '13px', fontWeight: '800', color: '#475569', letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                        Legacy Clinics and Diagnostics
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', whiteSpace: 'nowrap' }}>
                        KK3 RD 134, Kicukiro, Kigali &nbsp;|&nbsp; +250 788 122 100
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '20px', fontWeight: '800', color: '#003B44', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                      {modalDoctorFilter ? `${modalDoctorFilter}'s Schedule` : "Doctor's Schedule"}
                    </div>
                    <div style={{ marginTop: '3px', fontSize: '13px', color: '#334155', fontWeight: '700' }}>
                      {previewModalItem.roster_date}
                    </div>
                  </div>
                </div>

                {/* Table */}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', tableLayout: 'fixed' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#003B44' }}>
                      <th
                        rowSpan={2}
                        style={{
                          padding: '8px 10px',
                          color: '#ffffff',
                          fontWeight: '800',
                          fontSize: '13px',
                          textAlign: 'center',
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                          borderRight: '2px solid rgba(255,255,255,0.25)',
                          verticalAlign: 'middle',
                          backgroundColor: '#003B44',
                          width: '30%',
                        }}
                      >
                        UNIT
                      </th>
                      <th
                        colSpan={2}
                        style={{
                          padding: '6px 10px',
                          color: '#7ee8f8',
                          fontWeight: '800',
                          fontSize: '13px',
                          textAlign: 'center',
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                          borderBottom: '1px solid rgba(255,255,255,0.2)',
                          backgroundColor: '#003B44',
                        }}
                      >
                        DOCTORS / PROVIDERS
                      </th>
                    </tr>
                    <tr style={{ backgroundColor: '#00505c' }}>
                      <th
                        style={{
                          padding: '6px 10px',
                          color: '#a5f3fc',
                          fontWeight: '700',
                          fontSize: '12px',
                          textAlign: 'center',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          borderRight: '1px solid rgba(255,255,255,0.15)',
                          backgroundColor: '#00505c',
                          width: '35%',
                        }}
                      >
                        MORNING / TIME
                      </th>
                      <th
                        style={{
                          padding: '6px 10px',
                          color: '#fde68a',
                          fontWeight: '700',
                          fontSize: '12px',
                          textAlign: 'center',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          backgroundColor: '#00505c',
                          width: '35%',
                        }}
                      >
                        EVENING / TIME
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {renderRosterTableRows(previewModalDisplayUnits)}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '12px 24px', backgroundColor: '#ffffff', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                onClick={() => setPreviewModalItem(null)}
                style={{ padding: '8px 18px', backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Single Delete Confirmation Modal ───────────────────────────────── */}
      {deleteConfirmItem && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0', maxWidth: '440px', width: '100%', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#dc2626', marginBottom: '14px' }}>
              <div style={{ padding: '10px', backgroundColor: '#fee2e2', borderRadius: '10px' }}>
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a', margin: 0 }}>Delete Archived Schedule</h3>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0' }}>This action cannot be undone.</p>
              </div>
            </div>

            <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px', marginBottom: '20px', fontSize: '13px', color: '#334155' }}>
              <div><strong>Roster Date:</strong> {deleteConfirmItem.roster_date}</div>
              <div style={{ marginTop: '4px' }}><strong>Source File:</strong> {deleteConfirmItem.file_name}</div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setDeleteConfirmItem(null)}
                disabled={deleting}
                style={{ padding: '9px 18px', backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '7px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteSingle(deleteConfirmItem.id)}
                disabled={deleting}
                style={{ padding: '9px 18px', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '7px', fontSize: '13px', fontWeight: '700', cursor: deleting ? 'not-allowed' : 'pointer' }}
              >
                {deleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bulk Delete Confirmation Modal ─────────────────────────────────── */}
      {showBulkDeleteModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0', maxWidth: '440px', width: '100%', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#dc2626', marginBottom: '14px' }}>
              <div style={{ padding: '10px', backgroundColor: '#fee2e2', borderRadius: '10px' }}>
                <Trash2 size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a', margin: 0 }}>Delete {selectedHistoryIds.length} Selected Schedules</h3>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0' }}>This will permanently remove the selected schedule records from history.</p>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button
                onClick={() => setShowBulkDeleteModal(false)}
                disabled={deleting}
                style={{ padding: '9px 18px', backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '7px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={deleting}
                style={{ padding: '9px 18px', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '7px', fontSize: '13px', fontWeight: '700', cursor: deleting ? 'not-allowed' : 'pointer' }}
              >
                {deleting ? 'Deleting...' : `Delete ${selectedHistoryIds.length} Schedules`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
