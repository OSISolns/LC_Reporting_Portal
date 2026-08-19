import { useState, useRef, useEffect, useMemo } from 'react';
import { parseRosterFile, fetchRosterHistory, downloadRosterDocx, analyzeRosterAI, deleteRosterHistory, bulkDeleteRosterHistory, saveManualRoster } from '../api/roster';
import { fetchRoster, fetchAttendance, downloadPdfReport, downloadExcelReport, fetchKaziStaff } from '../api/kaziSync';

import { toast } from 'react-hot-toast';
import {
  UploadCloud, Printer, FileCode, RefreshCw, CalendarDays, FileText, ShieldCheck,
  History, Download, Sparkles, ArrowRightLeft, AlertTriangle, UserPlus, UserMinus,
  Eye, X, UserCheck, Search, Copy, User, Filter, Trash2, CheckSquare, Square,
  BarChart3, ListFilter, CheckCircle2, Trash, FileSpreadsheet, Building2, Building, Users, Clock,
  PlusCircle, Pencil, CalendarCheck, Sunrise, Sunset, Save, ChevronDown, ChevronUp
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
function renderShiftStaff(shifts) {
  if (!shifts || shifts.length === 0) return <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '13px' }}>—</span>;
  if (shifts.length === 1 && shifts[0].staff?.[0] === 'Not Available') {
    return <span style={{ color: '#ef4444', fontWeight: 600, fontSize: '13px' }}>Not Available</span>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center', textAlign: 'center' }}>
      {shifts.map((shift, si) => (
        <div key={si} style={{ textAlign: 'center' }}>
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

function renderShiftTime(shifts) {
  if (!shifts || shifts.length === 0) return <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '13px' }}>—</span>;
  if (shifts.length === 1 && shifts[0].staff?.[0] === 'Not Available') {
    return <span style={{ color: '#ef4444', fontWeight: 600, fontSize: '13px' }}>—</span>;
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
        </div>
      ))}
    </div>
  );
}

function renderRosterTableRows(unitsList, dateStr = '') {
  if (!unitsList || unitsList.length === 0) return null;

  const clinicalUnits = unitsList.filter(u => !u.unit.startsWith('Dental'));
  const dentalUnits = unitsList.filter(u => u.unit.startsWith('Dental'));
  const orderedUnits = [...clinicalUnits, ...dentalUnits];
  const totalUnits = orderedUnits.length;

  return orderedUnits.map((unit, idx) => {
    const isDental = unit.unit.startsWith('Dental');
    const isEven = idx % 2 === 0;

    return (
      <tr
        key={idx}
        style={{
          borderBottom: '1px solid #cbd5e1',
        }}
      >
        {idx === 0 && (
          <td
            rowSpan={totalUnits}
            style={{
              padding: '10px 8px',
              fontWeight: '800',
              fontSize: '12px',
              color: '#0f172a',
              verticalAlign: 'middle',
              textAlign: 'center',
              borderRight: '1px solid #cbd5e1',
              backgroundColor: '#f8fafc',
              width: '18%',
              lineHeight: '1.4',
            }}
          >
            {dateStr || 'Monday 17th AUGUST 2026'}
          </td>
        )}

        {idx === 0 && (
          <td
            rowSpan={clinicalUnits.length}
            style={{
              padding: '10px 8px',
              fontWeight: '700',
              fontSize: '12.5px',
              color: '#003B44',
              verticalAlign: 'middle',
              textAlign: 'center',
              borderRight: '1px solid #cbd5e1',
              backgroundColor: '#f0fdfa',
              width: '18%',
            }}
          >
            Clinical Plaza
          </td>
        )}

        {idx === clinicalUnits.length && dentalUnits.length > 0 && (
          <td
            rowSpan={dentalUnits.length}
            style={{
              padding: '10px 8px',
              fontWeight: '700',
              fontSize: '12.5px',
              color: '#0284c7',
              verticalAlign: 'middle',
              textAlign: 'center',
              borderRight: '1px solid #cbd5e1',
              backgroundColor: '#f0f9ff',
              width: '18%',
            }}
          >
            Dental Department
          </td>
        )}

        <td style={{
          padding: '10px 10px',
          fontWeight: '700',
          fontSize: '13px',
          color: '#1e293b',
          verticalAlign: 'middle',
          textAlign: 'left',
          borderRight: '1px solid #cbd5e1',
          backgroundColor: isEven ? '#ffffff' : '#f8fafc',
          width: '20%',
        }}>
          {unit.unit}
        </td>

        <td style={{
          padding: '10px 10px',
          verticalAlign: 'middle',
          textAlign: 'center',
          borderRight: '1px solid #cbd5e1',
          backgroundColor: isEven ? '#f0fffe' : '#e8fffe',
          width: '14%',
        }}>
          {renderShiftTime(unit.morning)}
        </td>

        <td style={{
          padding: '10px 10px',
          verticalAlign: 'middle',
          textAlign: 'center',
          borderRight: '1px solid #cbd5e1',
          backgroundColor: isEven ? '#f0fffe' : '#e8fffe',
          width: '18%',
        }}>
          {renderShiftStaff(unit.morning)}
        </td>

        <td style={{
          padding: '10px 10px',
          verticalAlign: 'middle',
          textAlign: 'center',
          borderRight: '1px solid #cbd5e1',
          backgroundColor: isEven ? '#fffbf0' : '#fff8e8',
          width: '14%',
        }}>
          {renderShiftTime(unit.evening)}
        </td>

        <td style={{
          padding: '10px 10px',
          verticalAlign: 'middle',
          textAlign: 'center',
          backgroundColor: isEven ? '#fffbf0' : '#fff8e8',
          width: '18%',
        }}>
          {renderShiftStaff(unit.evening)}
        </td>
      </tr>
    );
  });
}

const DEPARTMENT_UNITS_MAP = {
  'Clinical Plaza': [
    'Gynecology',
    'Pediatrics',
    'Neurology',
    'Internal Medicine',
    'Orthopedics',
    'ENT',
    'GP',
    'Urology',
    'Cardiology',
    'Dermatology',
    'Clinical Psychology',
    'General Surgery'
  ],
  'Paramedical Staffs': [
    'Nursing',
    'EEG',
    'Anesthesiology',
    'Physiotherapy',
    'QI',
    'Tabara'
  ],
  'Laboratory': [
    'Pathology',
    'Lab Scientists',
    'Phlebotomy',
    'Team Leaders'
  ],
  'Imaging': [
    'Radiology',
    'Imaging Technologists'
  ],
  'Dental': [
    'Dentists',
    'Therapists',
    'Chairside Assistants',
    'Prosthetic Laboratory'
  ],
  'Operations': [
    'Customer Care',
    'Lounge',
    'Call Center',
    'Operations',
    'Insurance & Compliance',
    'Duty Managers',
    'Tabara',
    'IT'
  ],
  'Administration': [
    'Finance',
    'HR',
    'Internal Auditor',
    'Procurement',
    'Logistics',
    'Stock',
    'Insurance Office'
  ]
};


const ALL_DEPARTMENTS = Object.keys(DEPARTMENT_UNITS_MAP);
const STANDARD_PRESET_UNITS = Object.values(DEPARTMENT_UNITS_MAP).flat();

const STANDARD_SHIFT_TIMES = [
  '07:00 – 14:00',
  '14:00 – 21:00',
  '08:00 – 17:00',
  '07:00 – 19:00',
  '19:00 – 07:00',
  '21:00 – 07:00',
  '08:00 – 13:00',
  '24 Hours / On Call'
];

// ─── Main Component ────────────────────────────────────────────────────────────
export default function RosterGenerator() {
  const [activeTab, setActiveTab] = useState('studio'); // 'studio' | '' | 'doctor_search' | 'archives' | 'lumina_ai'
  const [savingBuilder, setSavingBuilder] = useState(false);

  // Helper: format a Date string as the canonical roster_date string e.g. "18TH AUGUST 2026"
  const formatRosterDate = (dateStr) => {
    if (!dateStr) return '';
    const d = typeof dateStr === 'string' ? new Date(dateStr + 'T00:00:00') : new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    const ordinals = ['TH','ST','ND','RD'];
    const v = d.getDate() % 100;
    const suffix = ordinals[(v - 20) % 10] || ordinals[v] || ordinals[0];
    const month = d.toLocaleString('default', { month: 'long' }).toUpperCase();
    return `${d.getDate()}${suffix} ${month} ${d.getFullYear()}`;
  };

  const tomorrowDate = (() => { const t = new Date(); t.setDate(t.getDate() + 1); return t; })();
  const [builderDate, setBuilderDate] = useState(tomorrowDate.toISOString().split('T')[0]);

  const blankUnit = () => ({
    _id: Math.random().toString(36).slice(2),
    department: 'Clinical Plaza',
    unit: 'Gynecology',
    morning: [{ time: '07:00 – 14:00', staff: [] }],
    evening: [{ time: '14:00 – 21:00', staff: [] }],
  });



  const [builderUnits, setBuilderUnits] = useState([blankUnit()]);
  const [builderInputs, setBuilderInputs] = useState({}); // { unitId_shift: currentInputValue }
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rosterData, setRosterData] = useState(null);
  const [exporting, setExporting] = useState(false);
  const fileInputRef = useRef(null);

  //  Integration State
  const defaultToday = new Date().toISOString().split('T')[0];
  const defaultStartOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  const [kaziStartDate, setKaziStartDate] = useState(defaultStartOfMonth);
  const [kaziEndDate, setKaziEndDate] = useState(defaultToday);
  const [kaziViewMode, setKaziViewMode] = useState('roster'); // 'roster' | 'attendance'
  const [kaziRosterData, setKaziRosterData] = useState([]);
  const [kaziAttendanceData, setKaziAttendanceData] = useState([]);
  const [loadingKazi, setLoadingKazi] = useState(false);
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [kaziSearch, setKaziSearch] = useState('');
  const [kaziDeptFilter, setKaziDeptFilter] = useState('');

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

  // Unit Extractor state
  const [selectedUnit, setSelectedUnit] = useState('');
  const [modalDoctorFilter, setModalDoctorFilter] = useState('');

  // Collect all unique units across all archived schedules
  const uniqueUnitsList = useMemo(() => {
    const unitSet = new Set();
    historyList.forEach(item => {
      (item.parsedUnits || []).forEach(unit => {
        if (unit.unit && unit.unit !== '—') unitSet.add(unit.unit.trim());
      });
    });
    return Array.from(unitSet).sort((a, b) => a.localeCompare(b));
  }, [historyList]);

  // Kazisync DB staff list state
  const [kaziStaffDbList, setKaziStaffDbList] = useState([]);

  useEffect(() => {
    const loadKaziStaff = async () => {
      try {
        const { data } = await fetchKaziStaff();
        if (data?.success && Array.isArray(data.data)) {
          setKaziStaffDbList(data.data);
        }
      } catch (err) {
        console.warn('⚠️ KaziSync Staff DB fetch error:', err.message);
      }
    };
    loadKaziStaff();
  }, []);

  // Collect all unique staff/doctor names across Kazisync DB + all archived schedules
  const uniqueStaffList = useMemo(() => {
    const staffSet = new Set(kaziStaffDbList);
    historyList.forEach(item => {
      (item.parsedUnits || []).forEach(unit => {
        (unit.morning || []).forEach(s => (s.staff || []).forEach(st => {
          if (st && st !== 'Not Available' && st !== '—') staffSet.add(st.trim());
        }));
        (unit.evening || []).forEach(s => (s.staff || []).forEach(st => {
          if (st && st !== 'Not Available' && st !== '—') staffSet.add(st.trim());
        }));
      });
    });
    return Array.from(staffSet).sort((a, b) => a.localeCompare(b));
  }, [historyList, kaziStaffDbList]);


  // Filter shifts across history for selectedUnit
  const extractedUnitShifts = useMemo(() => {
    if (!selectedUnit) return [];
    const query = selectedUnit.toLowerCase().trim();

    const results = [];
    historyList.forEach(item => {
      (item.parsedUnits || []).forEach(unit => {
        if (!unit.unit.toLowerCase().includes(query)) return;
        
        const isDental = unit.unit.startsWith('Dental');
        const dept = isDental ? 'Dental' : 'Clinical Plaza';

        (unit.morning || []).forEach(shift => {
          results.push({
            scheduleId: item.id,
            date: item.roster_date,
            fileName: item.file_name,
            dept,
            unit: unit.unit,
            shiftType: 'Morning',
            time: shift.time || '(Morning Shift)',
            matchedName: (shift.staff || []).join(', '),
            coStaff: [],
          });
        });

        (unit.evening || []).forEach(shift => {
          results.push({
            scheduleId: item.id,
            date: item.roster_date,
            fileName: item.file_name,
            dept,
            unit: unit.unit,
            shiftType: 'Evening',
            time: shift.time || '(Evening Shift)',
            matchedName: (shift.staff || []).join(', '),
            coStaff: [],
          });
        });
      });
    });
    return results;
  }, [selectedUnit, historyList]);

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

  const handleCopyUnitSchedule = (unitName, shifts) => {
    if (!shifts || shifts.length === 0) return;
    let txt = `🏥 LEGACY CLINICS & DIAGNOSTICS\n👨‍⚕️ DUTY SCHEDULE FOR UNIT: ${unitName}\n${'─'.repeat(40)}\n\n`;
    shifts.forEach((s, idx) => {
      txt += `${idx + 1}. Date: ${s.date}\n   Shift: ${s.shiftType} | ${s.time}\n   Staff: ${s.matchedName}\n\n`;
    });
    txt += `Generated via Legacy Reporting Portal`;
    navigator.clipboard.writeText(txt);
    toast.success(`Copied schedule for ${unitName} to clipboard!`);
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
    const totalUnits = uniqueUnitsList.length;
    const latestSchedule = historyList[0]?.roster_date || 'N/A';
    const totalUnitsCount = historyList.reduce((acc, h) => acc + (h.unitCount || 0), 0);
    const avgUnits = totalSchedules > 0 ? Math.round(totalUnitsCount / totalSchedules) : 0;

    return {
      totalSchedules,
      totalUnits,
      latestSchedule,
      avgUnits,
    };
  }, [historyList, uniqueUnitsList]);

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
        const hList = data.data || [];
        setHistoryList(hList);
        
        // Auto-load tomorrow's record (or latest fallback) into the Tomorrow's Roster Studio
        if (hList.length > 0 && !rosterData) {
           const getOrdinal = (n) => {
             const s = ['TH', 'ST', 'ND', 'RD'];
             const v = n % 100;
             return n + (s[(v - 20) % 10] || s[v] || s[0]);
           };
           const tomorrow = new Date();
           tomorrow.setDate(tomorrow.getDate() + 1);
           const month = tomorrow.toLocaleString('default', { month: 'long' }).toUpperCase();
           const tomorrowStr = `${getOrdinal(tomorrow.getDate())} ${month} ${tomorrow.getFullYear()}`;
           
           let targetRecord = hList.find(r => r.roster_date === tomorrowStr);
           if (!targetRecord) targetRecord = hList[0]; // fallback to most recent
           
           setRosterData({
             id: targetRecord.id,
             dateStr: targetRecord.roster_date,
             parsedUnits: targetRecord.parsedUnits,
             file_name: targetRecord.file_name,
             tomorrowDate: targetRecord.roster_date,
           });
        }
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // ── Builder helpers ─────────────────────────────────────────────────────────
  const builderAddUnit = () => setBuilderUnits(prev => [...prev, blankUnit()]);

  const builderRemoveUnit = (id) => setBuilderUnits(prev => prev.filter(u => u._id !== id));

  const builderUpdateDepartment = (id, dept) => {
    setBuilderUnits(prev => prev.map(u => {
      if (u._id !== id) return u;
      const allowedUnits = DEPARTMENT_UNITS_MAP[dept] || [];
      const newUnit = allowedUnits.includes(u.unit) ? u.unit : (allowedUnits[0] || u.unit);
      return { ...u, department: dept, unit: newUnit };
    }));
  };

  const builderUpdateUnitName = (id, name) =>
    setBuilderUnits(prev => prev.map(u => {
      if (u._id !== id) return u;
      let matchedDept = u.department || 'CLINICAL SERVICES';
      for (const [deptKey, unitList] of Object.entries(DEPARTMENT_UNITS_MAP)) {
        if (unitList.some(un => un.toLowerCase() === name.toLowerCase())) {
          matchedDept = deptKey;
          break;
        }
      }
      return { ...u, unit: name, department: matchedDept };
    }));

  const builderUpdateShiftTime = (unitId, shift, time) =>
    setBuilderUnits(prev => prev.map(u => {
      if (u._id !== unitId) return u;
      return {
        ...u,
        [shift]: u[shift].map((s, i) => i === 0 ? { ...s, time } : s),
      };
    }));

  const builderAddStaff = (unitId, shift, name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setBuilderUnits(prev => prev.map(u => {
      if (u._id !== unitId) return u;
      const updated = u[shift].length > 0
        ? u[shift].map((s, i) => i === 0 ? { ...s, staff: [...s.staff, trimmed] } : s)
        : [{ time: shift === 'morning' ? '07:00 – 14:00' : '14:00 – 21:00', staff: [trimmed] }];
      return { ...u, [shift]: updated };
    }));
    setBuilderInputs(prev => ({ ...prev, [`${unitId}_${shift}`]: '' }));
  };

  const builderRemoveStaff = (unitId, shift, staffName) =>
    setBuilderUnits(prev => prev.map(u => {
      if (u._id !== unitId) return u;
      return {
        ...u,
        [shift]: u[shift].map(s => ({ ...s, staff: s.staff.filter(st => st !== staffName) })),
      };
    }));

  const handleSaveBuilderRoster = async () => {
    const filledUnits = builderUnits.filter(u => u.unit.trim());
    if (filledUnits.length === 0) {
      toast.error('Please add at least one unit with a name before saving.');
      return;
    }
    const rosterDateStr = formatRosterDate(builderDate);
    // Convert builder units to the standard parsedUnits format
    const parsedUnits = filledUnits.map(u => ({
      department: u.department || 'CLINICAL SERVICES',
      unit: u.unit.trim(),
      morning: u.morning.filter(s => s.staff.length > 0 || s.time),
      evening: u.evening.filter(s => s.staff.length > 0 || s.time),
    }));

    setSavingBuilder(true);
    try {
      const { data } = await saveManualRoster(rosterDateStr, parsedUnits);
      if (data?.success) {
        toast.success(`✅ Roster for ${rosterDateStr} saved!`);
        // Reload history so it's immediately in archives and auto-loaded
        await loadHistory();
      } else {
        toast.error(data?.message || 'Failed to save roster.');
      }
    } catch (err) {
      toast.error('Failed to save roster: ' + (err?.response?.data?.message || err.message));
    } finally {
      setSavingBuilder(false);
    }
  };

  const loadData = async () => {
    setLoadingKazi(true);
    try {
      if (kaziViewMode === 'roster') {
        const { data } = await fetchRoster(kaziStartDate, kaziEndDate);
        if (data?.success) {
          const raw = data.data;
          let records = [];
          if (Array.isArray(raw)) {
            records = raw;
          } else if (raw?.roster && typeof raw.roster === 'object' && !Array.isArray(raw.roster)) {
            Object.entries(raw.roster).forEach(([d, items]) => {
              if (Array.isArray(items)) {
                items.forEach(item => records.push({ date: d, ...item }));
              }
            });
          } else if (Array.isArray(raw?.roster)) {
            records = raw.roster;
          } else if (Array.isArray(raw?.records)) {
            records = raw.records;
          } else if (Array.isArray(raw?.data)) {
            records = raw.data;
          }
          setKaziRosterData(Array.isArray(records) ? records : []);
        } else {
          setKaziRosterData([]);
        }
      } else {
        const { data } = await fetchAttendance(kaziStartDate, kaziEndDate, 1, 100);
        if (data?.success) {
          const raw = data.data;
          let records = [];
          if (Array.isArray(raw)) {
            records = raw;
          } else if (raw?.attendance_records && typeof raw.attendance_records === 'object' && !Array.isArray(raw.attendance_records)) {
            Object.entries(raw.attendance_records).forEach(([d, items]) => {
              if (Array.isArray(items)) {
                items.forEach(item => records.push({ date: d, ...item }));
              }
            });
          } else if (Array.isArray(raw?.attendance_records)) {
            records = raw.attendance_records;
          } else if (Array.isArray(raw?.records)) {
            records = raw.records;
          } else if (Array.isArray(raw?.data)) {
            records = raw.data;
          }
          setKaziAttendanceData(Array.isArray(records) ? records : []);
        } else {
          setKaziAttendanceData([]);
        }
      }
    } catch (err) {
      console.error(' fetch error:', err);
      toast.error(err.response?.data?.message || 'Failed to fetch data from  API Gateway.');
      setKaziRosterData([]);
      setKaziAttendanceData([]);
    } finally {
      setLoadingKazi(false);
    }
  };

  useEffect(() => {
    if (activeTab === '') {
      loadData();
    }
  }, [activeTab, kaziViewMode, kaziStartDate, kaziEndDate]);

  const handleDownloadKaziPdf = async () => {
    setDownloadingReport(true);
    const toastId = toast.loading('Generating  PDF Summary Report...');
    try {
      await downloadPdfReport(kaziStartDate, kaziEndDate);
      toast.success(' PDF report downloaded successfully!', { id: toastId });
    } catch (err) {
      console.error('PDF download error:', err);
      toast.error('Failed to download  PDF report.', { id: toastId });
    } finally {
      setDownloadingReport(false);
    }
  };

  const handleDownloadKaziExcel = async () => {
    setDownloadingReport(true);
    const toastId = toast.loading('Generating  Excel Summary Report...');
    try {
      await downloadExcelReport(kaziStartDate, kaziEndDate);
      toast.success(' Excel report downloaded successfully!', { id: toastId });
    } catch (err) {
      console.error('Excel download error:', err);
      toast.error('Failed to download  Excel report.', { id: toastId });
    } finally {
      setDownloadingReport(false);
    }
  };

  const kaziDepartmentsList = useMemo(() => {
    const rawList = kaziViewMode === 'roster' ? kaziRosterData : kaziAttendanceData;
    const list = Array.isArray(rawList) ? rawList : [];
    const depts = new Set();
    list.forEach(item => {
      if (item && typeof item === 'object') {
        const dept = item.department || item.department_name || item.unit || item.dept;
        if (dept) depts.add(String(dept).trim());
      }
    });
    return Array.from(depts).sort();
  }, [kaziRosterData, kaziAttendanceData, kaziViewMode]);

  const filteredKaziRecords = useMemo(() => {
    const rawList = kaziViewMode === 'roster' ? kaziRosterData : kaziAttendanceData;
    let list = Array.isArray(rawList) ? [...rawList] : [];

    if (kaziSearch.trim()) {
      const q = kaziSearch.toLowerCase().trim();
      list = list.filter(item => {
        if (!item || typeof item !== 'object') return false;
        const name = (item.employee_name || item.name || item.staff_name || '').toLowerCase();
        const dept = (item.department || item.department_name || item.unit || '').toLowerCase();
        const role = (item.role || item.title || item.shift || '').toLowerCase();
        return name.includes(q) || dept.includes(q) || role.includes(q);
      });
    }

    if (kaziDeptFilter) {
      list = list.filter(item => {
        if (!item || typeof item !== 'object') return false;
        const dept = item.department || item.department_name || item.unit || item.dept;
        return String(dept || '').trim() === kaziDeptFilter.trim();
      });
    }

    return list;
  }, [kaziRosterData, kaziAttendanceData, kaziViewMode, kaziSearch, kaziDeptFilter]);

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
    setActiveTab('lumina_ai');
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
      <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', marginBottom: '24px', gap: '6px', overflowX: 'auto' }}>
        <button
          onClick={() => setActiveTab('studio')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 18px',
            border: 'none',
            borderBottom: activeTab === 'studio' ? '3px solid #007b8a' : '3px solid transparent',
            backgroundColor: activeTab === 'studio' ? '#f0fdfa' : 'transparent',
            color: activeTab === 'studio' ? '#007b8a' : '#64748b',
            fontWeight: activeTab === 'studio' ? '700' : '600',
            fontSize: '13.5px',
            cursor: 'pointer',
            borderRadius: '8px 8px 0 0',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap',
          }}
        >
          <UploadCloud size={17} /> Tomorrow's Roster Studio
        </button>

        <button
          onClick={() => setActiveTab('')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 18px',
            border: 'none',
            borderBottom: activeTab === '' ? '3px solid #0284c7' : '3px solid transparent',
            backgroundColor: activeTab === '' ? '#f0f9ff' : 'transparent',
            color: activeTab === '' ? '#0284c7' : '#64748b',
            fontWeight: activeTab === '' ? '700' : '600',
            fontSize: '13.5px',
            cursor: 'pointer',
            borderRadius: '8px 8px 0 0',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap',
          }}
        >
          <Building2 size={17} />  Department Rosters
        </button>

        <button
          onClick={() => setActiveTab('doctor_search')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 18px',
            border: 'none',
            borderBottom: activeTab === 'doctor_search' ? '3px solid #0d9488' : '3px solid transparent',
            backgroundColor: activeTab === 'doctor_search' ? '#f0fdfa' : 'transparent',
            color: activeTab === 'doctor_search' ? '#0d9488' : '#64748b',
            fontWeight: activeTab === 'doctor_search' ? '700' : '600',
            fontSize: '13.5px',
            cursor: 'pointer',
            borderRadius: '8px 8px 0 0',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap',
          }}
        >
          <UserCheck size={17} /> Doctor Shift Lookup
        </button>

        <button
          onClick={() => { setActiveTab('archives'); loadHistory(); }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 18px',
            border: 'none',
            borderBottom: activeTab === 'archives' ? '3px solid #007b8a' : '3px solid transparent',
            backgroundColor: activeTab === 'archives' ? '#f0fdfa' : 'transparent',
            color: activeTab === 'archives' ? '#007b8a' : '#64748b',
            fontWeight: activeTab === 'archives' ? '700' : '600',
            fontSize: '13.5px',
            cursor: 'pointer',
            borderRadius: '8px 8px 0 0',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap',
          }}
        >
          <History size={17} /> Schedule Archives ({historyList.length})
        </button>

        <button
          onClick={() => { setActiveTab('lumina_ai'); if (!aiAnalysis) runAiAudit(); }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 18px',
            border: 'none',
            borderBottom: activeTab === 'lumina_ai' ? '3px solid #7c3aed' : '3px solid transparent',
            backgroundColor: activeTab === 'lumina_ai' ? '#f5f3ff' : 'transparent',
            color: activeTab === 'lumina_ai' ? '#7c3aed' : '#64748b',
            fontWeight: activeTab === 'lumina_ai' ? '700' : '600',
            fontSize: '13.5px',
            cursor: 'pointer',
            borderRadius: '8px 8px 0 0',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap',
          }}
        >
          <Sparkles size={17} /> Lumina AI Intelligence
        </button>
      </div>

      {/* ── TAB 1: Tomorrow's Roster Studio (Interactive Builder) ─────────── */}
      {activeTab === 'studio' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Header Bar with Date Picker & Actions */}
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '16px 20px', border: '1px solid #cbd5e1', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Pencil size={18} style={{ color: '#007b8a' }} />
                Tomorrow's Duty Roster Studio ({formatRosterDate(builderDate)})
              </h4>
              <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: '#64748b' }}>
                Define units & departments, assign staff to morning & evening shifts, and save directly to the system database.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#475569', fontWeight: '600', backgroundColor: '#f8fafc', padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <CalendarCheck size={16} style={{ color: '#007b8a' }} />
                <span>Target Date:</span>
                <input
                  type="date"
                  value={builderDate}
                  onChange={(e) => setBuilderDate(e.target.value)}
                  style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: '600', color: '#1e293b', backgroundColor: '#fff' }}
                />
              </div>

              <button
                onClick={builderAddUnit}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 16px',
                  backgroundColor: '#f1f5f9',
                  color: '#0f172a',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                <PlusCircle size={16} /> Add Unit
              </button>

              <button
                onClick={handleSaveBuilderRoster}
                disabled={savingBuilder}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 20px',
                  backgroundColor: '#166534',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13.5px',
                  fontWeight: '700',
                  cursor: savingBuilder ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 6px rgba(22,101,52,0.25)',
                  opacity: savingBuilder ? 0.7 : 1
                }}
              >
                {savingBuilder ? <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={16} />}
                Save Roster
              </button>
            </div>
          </div>

          <datalist id="builder-units-datalist">
            {Array.from(new Set([...STANDARD_PRESET_UNITS, ...uniqueUnitsList])).sort().map((unitName, idx) => (
              <option key={idx} value={unitName} />
            ))}
          </datalist>

          <datalist id="builder-shifttimes-datalist">
            {STANDARD_SHIFT_TIMES.map((timeOpt, idx) => (
              <option key={idx} value={timeOpt} />
            ))}
          </datalist>

          <datalist id="builder-staff-datalist">
            {uniqueStaffList.map((staffName, idx) => (
              <option key={idx} value={staffName} />
            ))}
          </datalist>

          {/* List of Unit Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: '20px' }}>
            {builderUnits.map((u) => (
              <div
                key={u._id}
                style={{
                  backgroundColor: '#fff',
                  borderRadius: '12px',
                  border: '1px solid #cbd5e1',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  overflow: 'hidden'
                }}
              >
                {/* Unit Header: Department & Unit Selection */}
                <div style={{ backgroundColor: '#003B44', color: '#fff', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '800', color: '#7ee8f8' }}>
                      <Building2 size={16} /> DEPARTMENT & UNIT SELECTION
                    </div>
                    {builderUnits.length > 1 && (
                      <button
                        onClick={() => builderRemoveUnit(u._id)}
                        title="Remove Unit"
                        style={{ backgroundColor: 'transparent', border: 'none', color: '#fca5a5', cursor: 'pointer', padding: '2px 4px', display: 'flex', alignItems: 'center' }}
                      >
                        <Trash size={16} />
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    {/* Department Dropdown */}
                    <div>
                      <label style={{ display: 'block', fontSize: '10.5px', fontWeight: '700', color: '#a5f3fc', marginBottom: '3px', textTransform: 'uppercase' }}>
                        Department
                      </label>
                      <select
                        value={u.department || 'Clinical Plaza'}
                        onChange={(e) => builderUpdateDepartment(u._id, e.target.value)}
                        style={{
                          width: '100%',
                          backgroundColor: 'rgba(255,255,255,0.18)',
                          border: '1px solid rgba(255,255,255,0.35)',
                          borderRadius: '6px',
                          padding: '6px 8px',
                          color: '#fff',
                          fontWeight: '700',
                          fontSize: '12px',
                          outline: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        {ALL_DEPARTMENTS.map((deptName, dIdx) => (
                          <option key={dIdx} value={deptName} style={{ color: '#0f172a', backgroundColor: '#fff' }}>
                            {deptName}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Unit Selector */}
                    <div>
                      <label style={{ display: 'block', fontSize: '10.5px', fontWeight: '700', color: '#a5f3fc', marginBottom: '3px', textTransform: 'uppercase' }}>
                        Unit / Service
                      </label>
                      <input
                        list={`builder-units-datalist-${u._id}`}
                        type="text"
                        placeholder="Select or type unit..."
                        value={u.unit}
                        onChange={(e) => builderUpdateUnitName(u._id, e.target.value)}
                        style={{
                          width: '100%',
                          backgroundColor: 'rgba(255,255,255,0.18)',
                          border: '1px solid rgba(255,255,255,0.35)',
                          borderRadius: '6px',
                          padding: '6px 8px',
                          color: '#fff',
                          fontWeight: '700',
                          fontSize: '12px',
                          outline: 'none'
                        }}
                      />
                      <datalist id={`builder-units-datalist-${u._id}`}>
                        {(DEPARTMENT_UNITS_MAP[u.department] || STANDARD_PRESET_UNITS).map((unitOpt, uIdx) => (
                          <option key={uIdx} value={unitOpt} />
                        ))}
                      </datalist>
                    </div>
                  </div>
                </div>


                {/* Shift Sections */}
                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

                  {/* MORNING SHIFT */}
                  <div style={{ backgroundColor: '#f0fffe', border: '1px solid #ccfbf1', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '800', color: '#0f766e' }}>
                        <Sunrise size={16} style={{ color: '#0d9488' }} /> MORNING SHIFT
                      </div>
                      <input
                        list="builder-shifttimes-datalist"
                        type="text"
                        placeholder="Select or type shift time..."
                        value={u.morning[0]?.time || ''}
                        onChange={(e) => builderUpdateShiftTime(u._id, 'morning', e.target.value)}
                        style={{
                          fontSize: '11.5px',
                          fontWeight: '700',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          border: '1px solid #99f6e4',
                          color: '#0f766e',
                          backgroundColor: '#fff',
                          width: '150px',
                          textAlign: 'center',
                          outline: 'none'
                        }}
                      />
                    </div>

                    {/* Staff Chips */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                      {(u.morning[0]?.staff || []).map((staffName, sIdx) => (
                        <span
                          key={sIdx}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', backgroundColor: '#99f6e4', color: '#134e4a', borderRadius: '12px', fontSize: '12px', fontWeight: '600' }}
                        >
                          <User size={12} /> {staffName}
                          <X
                            size={12}
                            style={{ cursor: 'pointer', marginLeft: '2px' }}
                            onClick={() => builderRemoveStaff(u._id, 'morning', staffName)}
                          />
                        </span>
                      ))}
                      {(u.morning[0]?.staff || []).length === 0 && (
                        <span style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>No staff assigned yet</span>
                      )}
                    </div>

                    {/* Add Staff Input */}
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input
                        list="builder-staff-datalist"
                        type="text"
                        placeholder="Select or type staff name..."
                        value={builderInputs[`${u._id}_morning`] || ''}
                        onChange={(e) => setBuilderInputs(prev => ({ ...prev, [`${u._id}_morning`]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            builderAddStaff(u._id, 'morning', builderInputs[`${u._id}_morning`] || '');
                          }
                        }}
                        style={{ flex: 1, padding: '5px 10px', fontSize: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff' }}
                      />
                      <button
                        type="button"
                        onClick={() => builderAddStaff(u._id, 'morning', builderInputs[`${u._id}_morning`] || '')}
                        style={{ padding: '5px 12px', backgroundColor: '#0d9488', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                      >
                        + Add
                      </button>
                    </div>
                  </div>

                  {/* EVENING SHIFT */}
                  <div style={{ backgroundColor: '#fffbf0', border: '1px solid #fef3c7', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '800', color: '#b45309' }}>
                        <Sunset size={16} style={{ color: '#d97706' }} /> EVENING SHIFT
                      </div>
                      <input
                        list="builder-shifttimes-datalist"
                        type="text"
                        placeholder="Select or type shift time..."
                        value={u.evening[0]?.time || ''}
                        onChange={(e) => builderUpdateShiftTime(u._id, 'evening', e.target.value)}
                        style={{
                          fontSize: '11.5px',
                          fontWeight: '700',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          border: '1px solid #fde68a',
                          color: '#b45309',
                          backgroundColor: '#fff',
                          width: '150px',
                          textAlign: 'center',
                          outline: 'none'
                        }}
                      />
                    </div>


                    {/* Staff Chips */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                      {(u.evening[0]?.staff || []).map((staffName, sIdx) => (
                        <span
                          key={sIdx}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', backgroundColor: '#fde68a', color: '#78350f', borderRadius: '12px', fontSize: '12px', fontWeight: '600' }}
                        >
                          <User size={12} /> {staffName}
                          <X
                            size={12}
                            style={{ cursor: 'pointer', marginLeft: '2px' }}
                            onClick={() => builderRemoveStaff(u._id, 'evening', staffName)}
                          />
                        </span>
                      ))}
                      {(u.evening[0]?.staff || []).length === 0 && (
                        <span style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>No staff assigned yet</span>
                      )}
                    </div>

                    {/* Add Staff Input */}
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input
                        list="builder-staff-datalist"
                        type="text"
                        placeholder="Select or type staff name..."
                        value={builderInputs[`${u._id}_evening`] || ''}
                        onChange={(e) => setBuilderInputs(prev => ({ ...prev, [`${u._id}_evening`]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            builderAddStaff(u._id, 'evening', builderInputs[`${u._id}_evening`] || '');
                          }
                        }}
                        style={{ flex: 1, padding: '5px 10px', fontSize: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff' }}
                      />
                      <button
                        type="button"
                        onClick={() => builderAddStaff(u._id, 'evening', builderInputs[`${u._id}_evening`] || '')}
                        style={{ padding: '5px 12px', backgroundColor: '#d97706', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                      >
                        + Add
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            ))}
          </div>

              {/* Bottom Actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '10px' }}>
                <button
                  onClick={builderAddUnit}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 20px',
                    backgroundColor: '#f1f5f9',
                    color: '#0f172a',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  <PlusCircle size={16} /> Add Another Unit
                </button>

                <button
                  onClick={handleSaveBuilderRoster}
                  disabled={savingBuilder}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 24px',
                    backgroundColor: '#166534',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '700',
                    cursor: savingBuilder ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 6px rgba(22,101,52,0.3)',
                    opacity: savingBuilder ? 0.7 : 1
                  }}
                >
                  {savingBuilder ? <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={18} />}
                  Save Roster to Database
                </button>
              </div>
        </div>
      )}

      {/* ── TAB 2:  Departmental Rosters ─────────────────────────── */}
      {activeTab === '' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Header Banner */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #cbd5e1',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ padding: '12px', backgroundColor: '#e0f2fe', color: '#0284c7', borderRadius: '10px' }}>
                <Building2 size={24} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                    Departmental Rosters & Attendance Hub
                  </h2>
                  <span style={{ backgroundColor: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '700' }}>
                    Production Gateway Active
                  </span>
                </div>
                {/* Removed live integration paragraph */}
              </div>
            </div>

            {/* Quick Action Download Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <button
                onClick={handleDownloadKaziPdf}
                disabled={downloadingReport}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 16px',
                  backgroundColor: '#dc2626',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '7px',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: downloadingReport ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.15s'
                }}
              >
                <FileText size={16} /> Download PDF Summary
              </button>

              <button
                onClick={handleDownloadKaziExcel}
                disabled={downloadingReport}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 16px',
                  backgroundColor: '#166534',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '7px',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: downloadingReport ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.15s'
                }}
              >
                <FileSpreadsheet size={16} /> Download Excel (.xlsx)
              </button>
            </div>
          </div>

          {/* Filter & Selector Toolbar */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '18px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', alignItems: 'end', marginBottom: '16px' }}>
              {/* Date Range Start */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>Start Date</label>
                <input
                  type="date"
                  value={kaziStartDate}
                  onChange={(e) => setKaziStartDate(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '7px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#f8fafc', fontWeight: '600', color: '#0f172a' }}
                />
              </div>

              {/* Date Range End */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>End Date</label>
                <input
                  type="date"
                  value={kaziEndDate}
                  onChange={(e) => setKaziEndDate(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '7px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#f8fafc', fontWeight: '600', color: '#0f172a' }}
                />
              </div>

              {/* View Mode Toggle */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>View Dataset</label>
                <div style={{ display: 'flex', backgroundColor: '#f1f5f9', padding: '3px', borderRadius: '7px', border: '1px solid #cbd5e1' }}>
                  <button
                    onClick={() => setKaziViewMode('roster')}
                    style={{
                      flex: 1,
                      padding: '6px 12px',
                      border: 'none',
                      borderRadius: '5px',
                      fontSize: '12.5px',
                      fontWeight: '700',
                      backgroundColor: kaziViewMode === 'roster' ? '#ffffff' : 'transparent',
                      color: kaziViewMode === 'roster' ? '#0284c7' : '#64748b',
                      boxShadow: kaziViewMode === 'roster' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                      cursor: 'pointer'
                    }}
                  >
                    Company Roster
                  </button>
                  <button
                    onClick={() => setKaziViewMode('attendance')}
                    style={{
                      flex: 1,
                      padding: '6px 12px',
                      border: 'none',
                      borderRadius: '5px',
                      fontSize: '12.5px',
                      fontWeight: '700',
                      backgroundColor: kaziViewMode === 'attendance' ? '#ffffff' : 'transparent',
                      color: kaziViewMode === 'attendance' ? '#0284c7' : '#64748b',
                      boxShadow: kaziViewMode === 'attendance' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                      cursor: 'pointer'
                    }}
                  >
                    Attendance Logs
                  </button>
                </div>
              </div>

              {/* Refresh Button */}
              <div>
                <button
                  onClick={loadData}
                  disabled={loadingKazi}
                  style={{
                    width: '100%',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '9px 16px',
                    backgroundColor: '#0284c7',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '7px',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: loadingKazi ? 'not-allowed' : 'pointer'
                  }}
                >
                  <RefreshCw size={15} className={loadingKazi ? 'animate-spin' : ''} /> Refresh Gateway
                </button>
              </div>
            </div>

            {/* Sub-toolbar Search & Dept Filter */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
                <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  value={kaziSearch}
                  onChange={(e) => setKaziSearch(e.target.value)}
                  placeholder="Search staff name, department, role..."
                  style={{ width: '100%', padding: '8px 12px 8px 34px', borderRadius: '7px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff' }}
                />
                {kaziSearch && (
                  <button onClick={() => setKaziSearch('')} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                    <X size={14} />
                  </button>
                )}
              </div>

              {kaziDepartmentsList.length > 0 && (
                <select
                  value={kaziDeptFilter}
                  onChange={(e) => setKaziDeptFilter(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: '7px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff', color: '#334155', fontWeight: '600', cursor: 'pointer' }}
                >
                  <option value="">All Departments ({kaziDepartmentsList.length})</option>
                  {kaziDepartmentsList.map((d, i) => (
                    <option key={i} value={d}>{d}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Main Data Table */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ padding: '14px 20px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontWeight: '700', fontSize: '14px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {kaziViewMode === 'roster' ? <Users size={18} style={{ color: '#0284c7' }} /> : <Clock size={18} style={{ color: '#0284c7' }} />}
                <span>{kaziViewMode === 'roster' ? 'Company Department Rosters' : 'Attendance Records & Clock Logs'}</span>
              </div>
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', backgroundColor: '#f1f5f9', padding: '3px 10px', borderRadius: '12px' }}>
                {filteredKaziRecords.length} Record{filteredKaziRecords.length !== 1 ? 's' : ''}
              </span>
            </div>

            {loadingKazi ? (
              <div style={{ padding: '50px 20px', textAlign: 'center', color: '#64748b' }}>
                <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 12px', color: '#0284c7' }} />
                <p style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#334155' }}>Communicating with  API Gateway...</p>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#94a3b8' }}>Fetching live departmental records for date range ({kaziStartDate} to {kaziEndDate})</p>
              </div>
            ) : filteredKaziRecords.length === 0 ? (
              <div style={{ padding: '50px 20px', textAlign: 'center', color: '#64748b' }}>
                <Building2 size={36} style={{ margin: '0 auto 12px', color: '#cbd5e1' }} />
                <p style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#334155' }}>No  records found</p>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#94a3b8' }}>Try expanding your date range or adjusting search filters.</p>
              </div>
            ) : kaziViewMode === 'roster' ? (
              /* Roster Table */
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0', color: '#475569', textAlign: 'left' }}>
                    <th style={{ padding: '12px 16px', fontWeight: '700' }}>Employee / Staff Name</th>
                    <th style={{ padding: '12px 16px', fontWeight: '700' }}>Department / Unit</th>
                    <th style={{ padding: '12px 16px', fontWeight: '700' }}>Role / Shift Title</th>
                    <th style={{ padding: '12px 16px', fontWeight: '700' }}>Roster Date</th>
                    <th style={{ padding: '12px 16px', fontWeight: '700', textAlign: 'center' }}>Shift Time</th>
                    <th style={{ padding: '12px 16px', fontWeight: '700', textAlign: 'right' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredKaziRecords.map((row, idx) => {
                    const name = row.employee_name || row.name || row.staff_name || 'Staff Member';
                    const dept = row.department || row.department_name || row.unit || 'General';
                    const role = row.role || row.title || row.shift || 'Duty Shift';
                    const date = row.date || row.shift_date || row.start_date || row.created_at || '—';
                    const time = row.time || row.shift_time || (row.start_time ? `${row.start_time} - ${row.end_time || ''}` : '—');
                    const status = row.status || row.shift_status || 'Scheduled';

                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: idx % 2 === 0 ? '#fff' : '#f8fafc' }}>
                        <td style={{ padding: '12px 16px', fontWeight: '700', color: '#0f172a' }}>
                          <User size={14} style={{ display: 'inline', marginRight: '6px', color: '#0284c7' }} />
                          {name}
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: '600', color: '#007b8a' }}>
                          {dept}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#475569' }}>
                          {role}
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: '600', color: '#334155' }}>
                          {date}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '700', color: '#0284c7', fontStyle: 'italic' }}>
                          {time}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '3px 10px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: '700',
                            backgroundColor: String(status).toLowerCase().includes('absent') ? '#fee2e2' : '#dcfce7',
                            color: String(status).toLowerCase().includes('absent') ? '#b91c1c' : '#15803d',
                          }}>
                            {status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              /* Attendance Table */
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0', color: '#475569', textAlign: 'left' }}>
                    <th style={{ padding: '12px 16px', fontWeight: '700' }}>Employee / Staff</th>
                    <th style={{ padding: '12px 16px', fontWeight: '700' }}>Department</th>
                    <th style={{ padding: '12px 16px', fontWeight: '700' }}>Date</th>
                    <th style={{ padding: '12px 16px', fontWeight: '700', textAlign: 'center' }}>Clock In</th>
                    <th style={{ padding: '12px 16px', fontWeight: '700', textAlign: 'center' }}>Clock Out</th>
                    <th style={{ padding: '12px 16px', fontWeight: '700', textAlign: 'center' }}>Duration</th>
                    <th style={{ padding: '12px 16px', fontWeight: '700', textAlign: 'right' }}>Attendance Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredKaziRecords.map((row, idx) => {
                    const name = row.employee_name || row.name || row.staff_name || 'Staff Member';
                    const dept = row.department || row.department_name || row.unit || 'General';
                    const date = row.date || row.attendance_date || '—';
                    const clockIn = row.clock_in || row.check_in || row.in_time || '—';
                    const clockOut = row.clock_out || row.check_out || row.out_time || '—';
                    const duration = row.duration || row.total_hours || row.hours_worked || '—';
                    const status = row.status || row.attendance_status || 'Present';

                    const isLate = String(status).toLowerCase().includes('late');
                    const isAbsent = String(status).toLowerCase().includes('absent');

                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: idx % 2 === 0 ? '#fff' : '#f8fafc' }}>
                        <td style={{ padding: '12px 16px', fontWeight: '700', color: '#0f172a' }}>
                          {name}
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: '600', color: '#007b8a' }}>
                          {dept}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#334155', fontWeight: '600' }}>
                          {date}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '700', color: '#166534' }}>
                          {clockIn}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '700', color: '#991b1b' }}>
                          {clockOut}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '700', color: '#0284c7' }}>
                          {duration}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '3px 10px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: '700',
                            backgroundColor: isAbsent ? '#fee2e2' : isLate ? '#fef3c7' : '#dcfce7',
                            color: isAbsent ? '#b91c1c' : isLate ? '#b45309' : '#15803d',
                          }}>
                            {status}
                          </span>
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

      {/* ── TAB 3: Unit Shift Lookup ─────────────────────────────────────── */}
      {activeTab === 'doctor_search' && (
        <div>
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
                  <Building size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: 0 }}>Extract Unit Roster Schedule</h3>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0' }}>Select any unit from past schedules to extract their complete duty roster, assigned staff, and shift times.</p>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <select
                  value={selectedUnit}
                  onChange={(e) => setSelectedUnit(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #94a3b8',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: selectedUnit ? '#003B44' : '#64748b',
                    backgroundColor: '#f8fafc',
                    cursor: 'pointer'
                  }}
                >
                  <option value="">-- Select a Unit to Extract Schedule ({uniqueUnitsList.length} Units Found) --</option>
                  {uniqueUnitsList.map((unitName, i) => (
                    <option key={i} value={unitName}>{unitName}</option>
                  ))}
                </select>
              </div>

              {selectedUnit && (
                <button
                  onClick={() => setSelectedUnit('')}
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

            {/* Extracted Unit Schedule Display */}
            {selectedUnit && (
              <div style={{
                backgroundColor: '#f0fffe',
                border: '1px solid #99f6e4',
                borderRadius: '10px',
                padding: '18px',
                marginTop: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #007b8a', paddingBottom: '10px', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#007b8a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Legacy Clinics & Diagnostics • Unit Schedule</div>
                    <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#003B44', margin: '2px 0 0' }}>{selectedUnit}</h2>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ backgroundColor: '#007b8a', color: '#fff', padding: '4px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: '700' }}>
                      {extractedUnitShifts.length} Shift{extractedUnitShifts.length !== 1 ? 's' : ''} Found
                    </span>
                    <button
                      onClick={() => handleCopyUnitSchedule(selectedUnit, extractedUnitShifts)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 14px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                    >
                      <Copy size={14} /> Copy Summary
                    </button>
                  </div>
                </div>

                {extractedUnitShifts.length === 0 ? (
                  <p style={{ color: '#64748b', fontSize: '13px', fontStyle: 'italic', margin: 0 }}>No shifts found for {selectedUnit} in past records.</p>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#003B44', color: '#fff' }}>
                        <th style={{ padding: '8px 12px', textAlign: 'left' }}>Roster Date</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left' }}>Department</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left' }}>Shift</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left' }}>Time Slot</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left' }}>Assigned Staff</th>
                      </tr>
                    </thead>
                    <tbody>
                      {extractedUnitShifts.map((shift, sIdx) => (
                        <tr key={sIdx} style={{ borderBottom: '1px solid #ccfbf1', backgroundColor: sIdx % 2 === 0 ? '#fff' : '#f0fffe' }}>
                          <td style={{ padding: '9px 12px', fontWeight: '700', color: '#007b8a' }}>{shift.date}</td>
                          <td style={{ padding: '9px 12px', fontWeight: '600', color: '#334155' }}>{shift.dept}</td>
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
                          <td style={{ padding: '9px 12px', fontWeight: '600', color: '#0f172a' }}>{shift.matchedName}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 4: Schedule Archives & Exports ─────────────────────────────── */}
      {activeTab === 'archives' && (
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
                <Building size={22} />
              </div>
              <div>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Units Tracked</div>
                <div style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>{archiveStats.totalUnits}</div>
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
                        setActiveTab('lumina_ai');
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

      {/* ── TAB 5: Lumina AI Intelligence ─────────────────────────────────── */}
      {activeTab === 'lumina_ai' && (
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
