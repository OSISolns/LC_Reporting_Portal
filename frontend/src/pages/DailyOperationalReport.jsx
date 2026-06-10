import React, { useState, useEffect, useRef } from 'react';
import {
  Stethoscope,
  Activity,
  Calendar,
  Check,
  Save,
  ChevronLeft,
  ChevronRight,
  User,
  BarChart3,
  Plus,
  FileText,
  AlertCircle,
  TrendingUp,
  Settings,
  Lock,
  ShieldCheck,
  Award,
  Users,
  CalendarDays,
  FileSpreadsheet,
  Search,
  Filter,
  X
} from 'lucide-react';
import { getReportConfig, getDailyReport, saveDailyReport, getMonthlyReport, getWeeklyReport } from '../api/reports';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import ExcelJS from 'exceljs/dist/exceljs.min.js';

const getWeekRange = (dateStr) => {
  if (!dateStr) return { start: '', end: '' };
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  
  const dayOfWeek = date.getDay(); 
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  
  const monday = new Date(date);
  monday.setDate(date.getDate() + diffToMonday);
  
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  
  const formatDate = (d) => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  
  return {
    start: formatDate(monday),
    end: formatDate(sunday)
  };
};

export default function DailyOperationalReport() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('entry'); // 'entry', 'weekly', or 'monthly'
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState({ departments: [], providers: [], defaultProcedureMetrics: [] });

  // Daily Entry state
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [entryMetrics, setEntryMetrics] = useState({}); // providerId -> patientCount
  const [entryLogs, setEntryLogs] = useState({}); // metricName -> metricValue
  const [saving, setSaving] = useState(false);

  // Weekly Report state
  const [selectedWeekDate, setSelectedWeekDate] = useState(new Date().toISOString().split('T')[0]);
  const [weeklyData, setWeeklyData] = useState(null);
  const [weeklySearchQuery, setWeeklySearchQuery] = useState('');
  const [weeklyDeptFilter, setWeeklyDeptFilter] = useState('ALL');

  // Monthly View state
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [monthlyData, setMonthlyData] = useState(null);

  // Load config on mount
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setLoading(true);
        const res = await getReportConfig();
        if (res.data.success) {
          setConfig(res.data.data);
        }
      } catch (err) {
        console.error('Failed to load report configurations:', err);
        toast.error('Failed to load daily report configuration.');
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  // Fetch daily report whenever selectedDate changes
  useEffect(() => {
    if (activeTab !== 'entry') return;

    const fetchDailyData = async () => {
      try {
        setLoading(true);
        const res = await getDailyReport(selectedDate);
        if (res.data.success && res.data.data) {
          const { metrics, logs } = res.data.data;

          // Reset
          const metricsObj = {};
          const logsObj = {};

          // Map loaded metrics
          metrics.forEach(m => {
            metricsObj[m.provider_id] = m.patient_count;
          });

          // Map loaded logs
          logs.forEach(l => {
            logsObj[l.metric_name] = l.metric_value;
          });

          setEntryMetrics(metricsObj);
          setEntryLogs(logsObj);
        } else {
          // Reset if no data exists
          setEntryMetrics({});
          setEntryLogs({});
        }
      } catch (err) {
        console.error('Failed to fetch daily report details:', err);
        toast.error('Failed to load report for the selected date.');
      } finally {
        setLoading(false);
      }
    };

    fetchDailyData();
  }, [selectedDate, activeTab]);

  // Fetch monthly report data
  useEffect(() => {
    if (activeTab !== 'monthly') return;

    const fetchMonthlyData = async () => {
      try {
        setLoading(true);
        const res = await getMonthlyReport(selectedYear, selectedMonth);
        if (res.data.success) {
          setMonthlyData(res.data.data);
        }
      } catch (err) {
        console.error('Failed to load monthly operational report:', err);
        toast.error('Failed to retrieve monthly matrix data.');
      } finally {
        setLoading(false);
      }
    };

    fetchMonthlyData();
  }, [selectedYear, selectedMonth, activeTab]);

  // Fetch weekly report data whenever selectedWeekDate or activeTab changes
  useEffect(() => {
    if (activeTab !== 'weekly') return;

    const fetchWeeklyData = async () => {
      try {
        setLoading(true);
        const { start, end } = getWeekRange(selectedWeekDate);
        const res = await getWeeklyReport(start, end);
        if (res.data.success) {
          setWeeklyData(res.data.data);
        }
      } catch (err) {
        console.error("Failed to load weekly report details:", err);
        toast.error("Failed to load weekly operational metrics.");
      } finally {
        setLoading(false);
      }
    };

    fetchWeeklyData();
  }, [selectedWeekDate, activeTab]);

  const adjustWeek = (daysOffset) => {
    const [year, month, day] = selectedWeekDate.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    d.setDate(d.getDate() + daysOffset);
    setSelectedWeekDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  };

  const getWeeklyDaysArray = () => {
    const { start } = getWeekRange(selectedWeekDate);
    const [year, month, day] = start.split('-').map(Number);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(year, month - 1, day + i);
      days.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    }
    return days;
  };

  const formatWeeklyDayHeader = (dateStr) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return `${dayNames[d.getDay()]} ${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
  };

  // Adjust daily date by offset
  const adjustDate = (daysOffset) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + daysOffset);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  // Handle entry changes
  const handleMetricChange = (providerId, val) => {
    const intVal = val === '' ? '' : parseInt(val, 10);
    setEntryMetrics(prev => ({
      ...prev,
      [providerId]: isNaN(intVal) ? '' : intVal
    }));
  };

  const handleLogChange = (metricName, val) => {
    setEntryLogs(prev => ({
      ...prev,
      [metricName]: val
    }));
  };

  // Submit Daily Report
  const handleSaveReport = async () => {
    // Check if user is a nurse and selecting a past date
    const today = new Date().toISOString().split('T')[0];
    if (user?.role === 'nurse' && selectedDate < today) {
      toast.error('Nurses are not authorized to modify past reports.');
      return;
    }
    try {
      setSaving(true);

      const payloadMetrics = config.providers.map(p => ({
        provider_id: p.id,
        department_id: p.department_id,
        patient_count: entryMetrics[p.id] || 0
      }));

      const payloadLogs = config.defaultProcedureMetrics.map(mName => ({
        metric_name: mName,
        metric_value: String(entryLogs[mName] !== undefined ? entryLogs[mName] : '0')
      }));

      const res = await saveDailyReport({
        report_date: selectedDate,
        metrics: payloadMetrics,
        logs: payloadLogs
      });

      if (res.data.success) {
        toast.success(`Daily report for ${selectedDate} saved!`, { icon: '💾' });
      }
    } catch (err) {
      console.error('Save failed:', err);
      toast.error('Failed to commit daily operational metrics.');
    } finally {
      setSaving(false);
    }
  };

  // Helper to calculate days in selected month
  const getDaysArray = () => {
    const daysCount = new Date(selectedYear, selectedMonth, 0).getDate();
    return Array.from({ length: daysCount }, (_, i) => i + 1);
  };

  // Format month name
  const getMonthName = (mNum) => {
    return new Date(2000, mNum - 1, 1).toLocaleString('default', { month: 'long' });
  };

  const getColumnLetter = (colIndex) => {
    let temp = colIndex;
    let letter = '';
    while (temp > 0) {
      let modulo = (temp - 1) % 26;
      letter = String.fromCharCode(65 + modulo) + letter;
      temp = Math.floor((temp - modulo) / 26);
    }
    return letter;
  };

  // Premium Client-Side Excel Export for Weekly Summaries
  const handleExportWeeklyXlsx = async () => {
    try {
      if (!weeklyData) {
        toast.error("No weekly report dataset is loaded.");
        return;
      }
      
      toast.loading("Generating weekly Excel workbook...", { id: 'excel-toast' });
      const workbook = new ExcelJS.Workbook();
      
      const sheet = workbook.addWorksheet('Weekly Report');
      sheet.views = [{ showGridLines: true }];
      
      // Configure columns
      const days = getWeeklyDaysArray();
      const totalCols = 2 + days.length + 1;
      
      // Set Column Widths
      sheet.getColumn(1).width = 28;
      sheet.getColumn(2).width = 24;
      days.forEach((day, index) => {
        sheet.getColumn(2 + index + 1).width = 14;
      });
      sheet.getColumn(totalCols).width = 12;
      
      // Title Block
      const titleCell = sheet.getCell('A1');
      titleCell.value = 'LEGACY CLINICS & DIAGNOSTICS';
      sheet.mergeCells(1, 1, 1, totalCols);
      titleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1B365D' } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      sheet.getRow(1).height = 35;
      
      const subCell = sheet.getCell('A2');
      const { start, end } = getWeekRange(selectedWeekDate);
      subCell.value = `WEEKLY OPERATIONAL REPORT (Period: ${start} to ${end})`;
      sheet.mergeCells(2, 1, 2, totalCols);
      subCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFF' } };
      subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4A90E2' } };
      subCell.alignment = { horizontal: 'center', vertical: 'middle' };
      sheet.getRow(2).height = 25;
      
      sheet.getRow(3).height = 15;
      
      // Table Header Row 4
      const headerRow = sheet.getRow(4);
      headerRow.height = 28;
      
      headerRow.getCell(1).value = 'Staff Specialist';
      headerRow.getCell(2).value = 'Specialty / Department';
      days.forEach((day, index) => {
        headerRow.getCell(2 + index + 1).value = formatWeeklyDayHeader(day);
      });
      headerRow.getCell(totalCols).value = 'TOTAL';
      
      for (let c = 1; c <= totalCols; c++) {
        const cell = headerRow.getCell(c);
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1B365D' } };
        cell.alignment = { horizontal: c > 2 ? 'center' : 'left', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin', color: { argb: '1B365D' } },
          bottom: { style: 'medium', color: { argb: '1B365D' } },
          left: { style: 'thin', color: { argb: '4F81BD' } },
          right: { style: 'thin', color: { argb: '4F81BD' } }
        };
      }
      
      let currentRow = 5;
      const startRowProviders = 5;
      
      const filteredProviders = config.providers.filter(p => {
        if (weeklyDeptFilter !== 'ALL' && p.department_name !== weeklyDeptFilter) return false;
        if (weeklySearchQuery.trim() !== '') {
          const query = weeklySearchQuery.toLowerCase();
          return p.name.toLowerCase().includes(query) || (p.department_name && p.department_name.toLowerCase().includes(query));
        }
        return true;
      });
      
      filteredProviders.forEach(provider => {
        const deptName = provider.department_name || 'OTHER';
        const r = sheet.getRow(currentRow);
        r.height = 20;
        r.getCell(1).value = provider.name;
        r.getCell(2).value = deptName;
        
        days.forEach((day, index) => {
          const record = weeklyData.metrics.find(m => m.provider_id === provider.id && m.report_date === day);
          r.getCell(2 + index + 1).value = record ? record.patient_count : 0;
        });
        
        const startColLetter = getColumnLetter(3);
        const endColLetter = getColumnLetter(2 + days.length);
        
        r.getCell(totalCols).value = { formula: `=SUM(${startColLetter}${currentRow}:${endColLetter}${currentRow})` };
        
        for (let col = 1; col <= totalCols; col++) {
          const cell = r.getCell(col);
          cell.font = { name: 'Calibri', size: 10 };
          cell.border = { bottom: { style: 'thin', color: { argb: 'E2E8F0' } } };
          if (col > 2) {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            const val = cell.value;
            if (col === totalCols) {
              cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: '1B365D' } };
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F2F7FD' } };
            } else if (typeof val === 'number' && val > 0) {
              cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: '107C41' } };
            } else if (val === 0) {
              cell.font = { name: 'Calibri', size: 10, color: { argb: 'BBBBBB' } };
              cell.value = '-';
            }
          }
        }
        currentRow++;
      });
      
      const endRowProviders = Math.max(startRowProviders, currentRow - 1);
      
      // Divider
      const dividerRow = sheet.getRow(currentRow);
      dividerRow.height = 22;
      dividerRow.getCell(1).value = 'NURSING AND WARD PROCEDURES';
      sheet.mergeCells(currentRow, 1, currentRow, totalCols);
      for (let c = 1; c <= totalCols; c++) {
        const cell = dividerRow.getCell(c);
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: '1B365D' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EBF3FD' } };
        cell.border = { bottom: { style: 'thin', color: { argb: 'CAD9EA' } } };
      }
      currentRow++;
      
      const startRowProcedures = currentRow;
      
      const filteredProcedures = config.defaultProcedureMetrics.filter(metricName => {
        if (weeklyDeptFilter !== 'ALL') return false; 
        if (weeklySearchQuery.trim() !== '') {
          return metricName.toLowerCase().includes(weeklySearchQuery.toLowerCase());
        }
        return true;
      });
      
      filteredProcedures.forEach(metricName => {
        const isNameInput = metricName.toLowerCase().includes('assistant');
        const r = sheet.getRow(currentRow);
        r.height = 20;
        r.getCell(1).value = metricName;
        r.getCell(2).value = 'PROCEDURES';
        
        days.forEach((day, index) => {
          const record = weeklyData.logs.find(l => l.metric_name === metricName && l.report_date === day);
          const val = record ? record.metric_value : '0';
          r.getCell(2 + index + 1).value = isNameInput ? val : (parseInt(val, 10) || 0);
        });
        
        const startColLetter = getColumnLetter(3);
        const endColLetter = getColumnLetter(2 + days.length);
        
        if (!isNameInput) {
          r.getCell(totalCols).value = { formula: `=SUM(${startColLetter}${currentRow}:${endColLetter}${currentRow})` };
        } else {
          r.getCell(totalCols).value = 'N/A';
        }
        
        for (let col = 1; col <= totalCols; col++) {
          const cell = r.getCell(col);
          cell.font = { name: 'Calibri', size: 10 };
          cell.border = { bottom: { style: 'thin', color: { argb: 'E2E8F0' } } };
          if (col > 2) {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            const val = cell.value;
            if (col === totalCols) {
              cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: '555555' } };
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F5F5F5' } };
            } else if (isNameInput) {
              cell.font = { name: 'Calibri', size: 9, italic: true };
              if (val === '0' || val === '') {
                cell.value = '-';
                cell.font = { name: 'Calibri', size: 10, color: { argb: 'BBBBBB' } };
              }
            } else if (typeof val === 'number' && val > 0) {
              cell.font = { name: 'Calibri', size: 10, bold: true };
            } else if (val === 0) {
              cell.value = '-';
              cell.font = { name: 'Calibri', size: 10, color: { argb: 'BBBBBB' } };
            }
          }
        }
        currentRow++;
      });
      
      const endRowProcedures = Math.max(startRowProcedures, currentRow - 1);
      
      // Bottom Total row
      const totalSumRow = sheet.getRow(currentRow);
      totalSumRow.height = 26;
      totalSumRow.getCell(1).value = 'TOTAL COMPLETED PATIENTS';
      sheet.mergeCells(currentRow, 1, currentRow, 2);
      
      for (let d = 1; d <= days.length; d++) {
        const colIndex = 2 + d;
        const colLetter = getColumnLetter(colIndex);
        totalSumRow.getCell(colIndex).value = { formula: `=SUM(${colLetter}${startRowProviders}:${colLetter}${endRowProviders})` };
      }
      
      const totalColLetter = getColumnLetter(totalCols);
      totalSumRow.getCell(totalCols).value = { formula: `=SUM(${totalColLetter}${startRowProviders}:${totalColLetter}${endRowProviders})` };
      
      for (let col = 1; col <= totalCols; col++) {
        const cell = totalSumRow.getCell(col);
        cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1B365D' } };
        cell.border = {
          top: { style: 'thin', color: { argb: '1B365D' } },
          bottom: { style: 'double', color: { argb: '1B365D' } }
        };
        if (col > 2) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          if (col === totalCols) {
            cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: '00FF00' } };
          }
        }
      }
      
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Weekly_Operational_Report_${start}_to_${end}.xlsx`;
      link.click();
      toast.success("Excel exported successfully!", { id: 'excel-toast' });
    } catch (err) {
      console.error("Excel weekly generation failed:", err);
      toast.error("Failed to generate Excel weekly workbook.", { id: 'excel-toast' });
    }
  };

  // Premium Client-Side Excel Export for Monthly Matrix
  const handleExportMonthlyXlsx = async () => {
    try {
      if (!monthlyData) {
        toast.error("No monthly matrix dataset is loaded.");
        return;
      }
      
      toast.loading("Generating monthly Excel matrix workbook...", { id: 'excel-toast' });
      const workbook = new ExcelJS.Workbook();
      
      const sheet = workbook.addWorksheet('Monthly Matrix');
      sheet.views = [{ showGridLines: true }];
      
      const days = getDaysArray();
      const totalCols = 2 + days.length + 1;
      
      sheet.getColumn(1).width = 28;
      sheet.getColumn(2).width = 24;
      days.forEach(day => {
        sheet.getColumn(2 + day).width = 6;
      });
      sheet.getColumn(totalCols).width = 12;
      
      const titleCell = sheet.getCell('A1');
      titleCell.value = 'LEGACY CLINICS & DIAGNOSTICS';
      sheet.mergeCells(1, 1, 1, totalCols);
      titleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1B365D' } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      sheet.getRow(1).height = 35;
      
      const subCell = sheet.getCell('A2');
      subCell.value = `INSTITUTIONAL MONTHLY OPERATIONAL MATRIX (Period: ${selectedMonth}/${selectedYear})`;
      sheet.mergeCells(2, 1, 2, totalCols);
      subCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFF' } };
      subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4A90E2' } };
      subCell.alignment = { horizontal: 'center', vertical: 'middle' };
      sheet.getRow(2).height = 25;
      
      sheet.getRow(3).height = 15;
      
      const headerRow = sheet.getRow(4);
      headerRow.height = 28;
      
      headerRow.getCell(1).value = 'Staff Specialist';
      headerRow.getCell(2).value = 'Specialty / Department';
      days.forEach(day => {
        headerRow.getCell(2 + day).value = day;
      });
      headerRow.getCell(totalCols).value = 'TOTAL';
      
      for (let c = 1; c <= totalCols; c++) {
        const cell = headerRow.getCell(c);
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1B365D' } };
        cell.alignment = { horizontal: c > 2 ? 'center' : 'left', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin', color: { argb: '1B365D' } },
          bottom: { style: 'medium', color: { argb: '1B365D' } },
          left: { style: 'thin', color: { argb: '4F81BD' } },
          right: { style: 'thin', color: { argb: '4F81BD' } }
        };
      }
      
      let currentRow = 5;
      const startRowProviders = 5;
      
      config.providers.forEach(provider => {
        const deptName = provider.department_name || 'OTHER';
        const r = sheet.getRow(currentRow);
        r.height = 20;
        r.getCell(1).value = provider.name;
        r.getCell(2).value = deptName;
        
        days.forEach(day => {
          const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const record = monthlyData.metrics.find(m => m.provider_id === provider.id && m.report_date === dateStr);
          r.getCell(2 + day).value = record ? record.patient_count : 0;
        });
        
        const startColLetter = getColumnLetter(3);
        const endColLetter = getColumnLetter(2 + days.length);
        
        r.getCell(totalCols).value = { formula: `=SUM(${startColLetter}${currentRow}:${endColLetter}${currentRow})` };
        
        for (let col = 1; col <= totalCols; col++) {
          const cell = r.getCell(col);
          cell.font = { name: 'Calibri', size: 10 };
          cell.border = { bottom: { style: 'thin', color: { argb: 'E2E8F0' } } };
          if (col > 2) {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            const val = cell.value;
            if (col === totalCols) {
              cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: '1B365D' } };
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F2F7FD' } };
            } else if (typeof val === 'number' && val > 0) {
              cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: '107C41' } };
            } else if (val === 0) {
              cell.font = { name: 'Calibri', size: 10, color: { argb: 'BBBBBB' } };
              cell.value = '-';
            }
          }
        }
        currentRow++;
      });
      
      const endRowProviders = Math.max(startRowProviders, currentRow - 1);
      
      // Divider
      const dividerRow = sheet.getRow(currentRow);
      dividerRow.height = 22;
      dividerRow.getCell(1).value = 'NURSING AND WARD PROCEDURES';
      sheet.mergeCells(currentRow, 1, currentRow, totalCols);
      for (let c = 1; c <= totalCols; c++) {
        const cell = dividerRow.getCell(c);
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: '1B365D' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EBF3FD' } };
        cell.border = { bottom: { style: 'thin', color: { argb: 'CAD9EA' } } };
      }
      currentRow++;
      
      const startRowProcedures = currentRow;
      
      config.defaultProcedureMetrics.forEach(metricName => {
        const isNameInput = metricName.toLowerCase().includes('assistant');
        const r = sheet.getRow(currentRow);
        r.height = 20;
        r.getCell(1).value = metricName;
        r.getCell(2).value = 'PROCEDURES';
        
        days.forEach(day => {
          const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const record = monthlyData.logs.find(l => l.metric_name === metricName && l.report_date === dateStr);
          const val = record ? record.metric_value : '0';
          r.getCell(2 + day).value = isNameInput ? val : (parseInt(val, 10) || 0);
        });
        
        const startColLetter = getColumnLetter(3);
        const endColLetter = getColumnLetter(2 + days.length);
        
        if (!isNameInput) {
          r.getCell(totalCols).value = { formula: `=SUM(${startColLetter}${currentRow}:${endColLetter}${currentRow})` };
        } else {
          r.getCell(totalCols).value = 'N/A';
        }
        
        for (let col = 1; col <= totalCols; col++) {
          const cell = r.getCell(col);
          cell.font = { name: 'Calibri', size: 10 };
          cell.border = { bottom: { style: 'thin', color: { argb: 'E2E8F0' } } };
          if (col > 2) {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            const val = cell.value;
            if (col === totalCols) {
              cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: '555555' } };
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F5F5F5' } };
            } else if (isNameInput) {
              cell.font = { name: 'Calibri', size: 9, italic: true };
              if (val === '0' || val === '') {
                cell.value = '-';
                cell.font = { name: 'Calibri', size: 10, color: { argb: 'BBBBBB' } };
              }
            } else if (typeof val === 'number' && val > 0) {
              cell.font = { name: 'Calibri', size: 10, bold: true };
            } else if (val === 0) {
              cell.value = '-';
              cell.font = { name: 'Calibri', size: 10, color: { argb: 'BBBBBB' } };
            }
          }
        }
        currentRow++;
      });
      
      const endRowProcedures = Math.max(startRowProcedures, currentRow - 1);
      
      const totalSumRow = sheet.getRow(currentRow);
      totalSumRow.height = 26;
      totalSumRow.getCell(1).value = 'TOTAL COMPLETED PATIENTS';
      sheet.mergeCells(currentRow, 1, currentRow, 2);
      
      days.forEach(day => {
        const colLetter = getColumnLetter(2 + day);
        totalSumRow.getCell(2 + day).value = { formula: `=SUM(${colLetter}${startRowProviders}:${colLetter}${endRowProviders})` };
      });
      
      const totalColLetter = getColumnLetter(totalCols);
      totalSumRow.getCell(totalCols).value = { formula: `=SUM(${totalColLetter}${startRowProviders}:${totalColLetter}${endRowProviders})` };
      
      for (let col = 1; col <= totalCols; col++) {
        const cell = totalSumRow.getCell(col);
        cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1B365D' } };
        cell.border = {
          top: { style: 'thin', color: { argb: '1B365D' } },
          bottom: { style: 'double', color: { argb: '1B365D' } }
        };
        if (col > 2) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          if (col === totalCols) {
            cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: '00FF00' } };
          }
        }
      }
      
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Monthly_Operational_Matrix_${selectedMonth}_${selectedYear}.xlsx`;
      link.click();
      toast.success("Excel exported successfully!", { id: 'excel-toast' });
    } catch (err) {
      console.error("Excel monthly generation failed:", err);
      toast.error("Failed to generate Excel monthly workbook.", { id: 'excel-toast' });
    }
  };

  // Group active providers by department
  const providersByDept = config.providers.reduce((acc, p) => {
    const deptName = p.department_name || 'OTHER';
    if (!acc[deptName]) acc[deptName] = [];
    acc[deptName].push(p);
    return acc;
  }, {});

  return (
    <div className="space-y-6 pb-12 animate-fadeIn max-w-[1600px] mx-auto px-1">
      {/* ── Page Hero Title / Premium Header ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-sky-950 to-slate-900 text-white p-6 md:p-8 rounded-[32px] shadow-2xl border border-sky-500/20">
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-sky-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-teal-500/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 z-10 relative">
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="flex items-center gap-1.5 px-3 py-1 bg-sky-500/20 border border-sky-400/30 rounded-full text-sky-300 text-xs font-black uppercase tracking-wider shadow-inner">
                <ShieldCheck size={14} className="animate-pulse" />
                🩺 Nurse-Exclusive Portal
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 border border-emerald-400/30 rounded-full text-emerald-300 text-xs font-black uppercase tracking-wider">
                <Lock size={12} /> Secure Access Granted
              </span>
            </div>

            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-sky-200 bg-clip-text text-transparent">
              Daily Report
            </h1>
            <p className="text-sm text-sky-200/85 font-medium max-w-2xl leading-relaxed">
              Exclusively authorized for the nursing department. Log and track provider patient volumes, shift coverage, procedures, and daily assistant rosters.
            </p>
          </div>

          {/* Premium Tab Selector */}
          <div className="flex bg-slate-950/60 p-1.5 rounded-2xl border border-white/10 backdrop-blur-md self-stretch lg:self-auto shadow-xl">
            <button
              onClick={() => setActiveTab('entry')}
              className={`flex-1 lg:flex-none px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 ${activeTab === 'entry'
                  ? 'bg-gradient-to-r from-sky-500 to-sky-600 text-white shadow-md shadow-sky-500/20 scale-100'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
            >
              <Plus size={15} /> Data Entry Form
            </button>
            <button
              onClick={() => setActiveTab('weekly')}
              className={`flex-1 lg:flex-none px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 ${activeTab === 'weekly'
                  ? 'bg-gradient-to-r from-sky-500 to-sky-600 text-white shadow-md shadow-sky-500/20 scale-100'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
            >
              <CalendarDays size={15} /> Weekly Report
            </button>
            <button
              onClick={() => setActiveTab('monthly')}
              className={`flex-1 lg:flex-none px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 ${activeTab === 'monthly'
                  ? 'bg-gradient-to-r from-sky-500 to-sky-600 text-white shadow-md shadow-sky-500/20 scale-100'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
            >
              <BarChart3 size={15} /> Monthly Matrix
            </button>
          </div>
        </div>
      </div>

      {/* ────────────────── MODE A: DAILY DATA ENTRY ────────────────── */}
      {activeTab === 'entry' && (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Main Form Area */}
          <div className="xl:col-span-3 space-y-6">

            {/* Date Selection Ribbon */}
            <div className="bg-white/80 backdrop-blur-md p-4 rounded-3xl border border-slate-100 shadow-md flex justify-between items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-sky-50 rounded-xl text-sky-600">
                  <Calendar size={20} />
                </div>
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Report Log Date</span>
                  <span className="text-sm font-bold text-slate-800">Select reporting period</span>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200 shadow-inner">
                <button
                  onClick={() => adjustDate(-1)}
                  className="p-2 hover:bg-white hover:shadow-sm rounded-xl transition-all duration-200 text-slate-650 hover:text-sky-600"
                  title="Previous Day"
                >
                  <ChevronLeft size={16} />
                </button>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent border-none text-sm font-black text-slate-700 focus:ring-0 cursor-pointer text-center outline-none px-2"
                />
                <button
                  onClick={() => adjustDate(1)}
                  className="p-2 hover:bg-white hover:shadow-sm rounded-xl transition-all duration-200 text-slate-650 hover:text-sky-600"
                  title="Next Day"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              <div>
                <button
                  onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                  className="text-xs font-black text-sky-600 hover:text-white bg-sky-50 hover:bg-sky-600 px-4 py-2.5 rounded-xl border border-sky-100 uppercase tracking-wider transition-all duration-200"
                >
                  Jump to Today
                </button>
              </div>
            </div>

            {user?.role === 'nurse' && selectedDate < new Date().toISOString().split('T')[0] && (
              <div className="bg-amber-50 p-4 rounded-3xl border border-amber-200/60 shadow-sm flex items-center gap-3 text-amber-900 animate-fadeIn">
                <AlertCircle className="text-amber-600 shrink-0" size={20} />
                <div className="text-xs">
                  <span className="font-extrabold block uppercase tracking-wider">Read-Only Mode</span>
                  <span className="font-semibold text-amber-700/90">Nurses are only authorized to log and submit operational counts for the current day. Changes to past reports are restricted.</span>
                </div>
              </div>
            )}

            {loading ? (
              // Loading Skeleton
              <div className="space-y-6">
                {[1, 2, 3].map((s) => (
                  <div key={s} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-md animate-pulse space-y-4">
                    <div className="h-6 w-1/4 bg-slate-200 rounded-lg"></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="h-12 bg-slate-100 rounded-2xl"></div>
                      <div className="h-12 bg-slate-100 rounded-2xl"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // Active Roster Entry Card
              <div className="space-y-6">
                {Object.keys(providersByDept).map((deptName) => {
                  if (deptName === 'PROCEDURES') return null; // Handle separately below
                  return (
                    <div key={deptName} className="bg-white rounded-3xl border border-slate-200/60 shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl">
                      {/* Department Ribbon */}
                      <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-ping" />
                          <h3 className="text-xs font-extrabold text-slate-800 tracking-widest uppercase">
                            {deptName}
                          </h3>
                        </div>
                        <span className="text-[10px] font-black px-3 py-1 bg-slate-200/50 text-slate-600 rounded-full tracking-wider">
                          {providersByDept[deptName].length} PROVIDERS
                        </span>
                      </div>

                      {/* Providers List Grid */}
                      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {providersByDept[deptName].map((provider) => (
                          <div
                            key={provider.id}
                            className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50/30 hover:bg-sky-50/10 hover:border-sky-100 transition-all duration-350 hover:shadow-sm"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-550 to-sky-700 text-sky-600 flex items-center justify-center font-black text-xs border border-sky-100 bg-sky-50 shadow-inner">
                                {provider.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-xs font-black text-slate-700">{provider.name}</p>
                                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{provider.title || ''}</span>
                              </div>
                            </div>

                            {/* Patient Volume Input */}
                            <div className="w-28 relative">
                              <input
                                type="number"
                                min="0"
                                placeholder="0"
                                value={entryMetrics[provider.id] !== undefined ? entryMetrics[provider.id] : ''}
                                onChange={(e) => handleMetricChange(provider.id, e.target.value)}
                                disabled={user?.role === 'nurse' && selectedDate < new Date().toISOString().split('T')[0]}
                                className="w-full text-right font-black text-sm text-sky-850 border-2 border-slate-200/80 rounded-xl pl-3 pr-8 py-2 focus:border-sky-500 focus:ring-0 bg-white disabled:bg-slate-100 disabled:text-slate-400 transition-all duration-200"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 uppercase">Qty</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {/* ── Ancillary & Procedure Logs Section ── */}
                <div className="bg-white rounded-3xl border border-slate-250/60 shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl">
                  <div className="bg-sky-50/30 px-6 py-4 border-b border-sky-100 flex items-center gap-2.5">
                    <div className="p-1.5 bg-sky-100 rounded-lg text-sky-600">
                      <Activity size={16} />
                    </div>
                    <h3 className="text-xs font-extrabold text-slate-800 tracking-widest uppercase">
                      Ancillary & Assistant Logs
                    </h3>
                  </div>

                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {config.defaultProcedureMetrics.map((metricName) => {
                      const value = entryLogs[metricName] || '';
                      // Determine if it looks like assistant name assignment (contains text) or standard number
                      const isNameInput = metricName.toLowerCase().includes('assistant');
                      return (
                        <div key={metricName} className="space-y-2">
                          <label className="text-[11px] font-black text-slate-600 flex justify-between uppercase tracking-wider">
                            <span>{metricName}</span>
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${isNameInput ? 'bg-purple-50 text-purple-650' : 'bg-slate-100 text-slate-500'
                              }`}>
                              {isNameInput ? 'Text Name' : 'Quantity'}
                            </span>
                          </label>
                          <input
                            type={isNameInput ? "text" : "number"}
                            min="0"
                            placeholder={isNameInput ? 'e.g. Denyse, Rachel' : '0'}
                            value={value}
                            onChange={(e) => handleLogChange(metricName, e.target.value)}
                            disabled={user?.role === 'nurse' && selectedDate < new Date().toISOString().split('T')[0]}
                            className="w-full text-xs font-bold text-slate-700 border-2 border-slate-200 rounded-xl px-4 py-3 focus:border-sky-500 focus:ring-0 bg-slate-50/20 focus:bg-white disabled:bg-slate-100 disabled:text-slate-400 transition-all duration-200"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action sidebar */}
          <div className="space-y-6">
            <div className="bg-gradient-to-b from-white to-slate-50/50 p-6 rounded-3xl border border-slate-200 shadow-xl space-y-6 sticky top-6">

              <div className="border-b border-slate-100 pb-4 space-y-1.5">
                <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-sky-600 bg-sky-50 px-2 py-0.5 rounded">
                  <ShieldCheck size={10} /> Active Session
                </span>
                <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-widest">Daily Operations Panel</h3>
                <p className="text-[10px] font-medium text-slate-450 leading-relaxed">Submit the current operational counts directly to clinical records.</p>
              </div>

              {/* Summary calculations */}
              <div className="bg-sky-50/40 p-4 rounded-2xl border border-sky-100/60 space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                    <Users size={14} className="text-slate-400" />
                    <span>Registered Roster</span>
                  </div>
                  <span className="text-xs font-black text-sky-800">{config.providers.length} Providers</span>
                </div>

                <div className="flex justify-between items-center border-t border-sky-100/60 pt-3">
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-700">
                    <TrendingUp size={14} className="text-sky-650" />
                    <span>Patient Count Sum</span>
                  </div>
                  <span className="text-base font-black text-sky-850">
                    {Object.values(entryMetrics).reduce((acc, curr) => acc + (parseInt(curr, 10) || 0), 0)}
                  </span>
                </div>
              </div>

              {/* Security Audit Checklist */}
              <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-100 space-y-3">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Security & Validation</span>

                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
                    <div className="p-0.5 bg-emerald-100 text-emerald-700 rounded-md">
                      <Check size={11} />
                    </div>
                    <span>Authorized Nurse Signature</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
                    <div className="p-0.5 bg-emerald-100 text-emerald-700 rounded-md">
                      <Check size={11} />
                    </div>
                    <span>Department Isolation Lock</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
                    <div className="p-0.5 bg-emerald-100 text-emerald-700 rounded-md">
                      <Check size={11} />
                    </div>
                    <span>CORS Host Whitelist Verified</span>
                  </div>
                </div>
              </div>

              {/* Save Trigger Button */}
              <button
                onClick={handleSaveReport}
                disabled={saving || loading || (user?.role === 'nurse' && selectedDate < new Date().toISOString().split('T')[0])}
                className="w-full bg-[#0284c7] hover:bg-[#0369a1] disabled:bg-slate-200 disabled:text-slate-400 text-white py-4 px-6 rounded-2xl text-xs font-black uppercase tracking-widest transition-all duration-200 shadow-md hover:shadow-lg shadow-sky-500/10 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <Activity className="animate-spin" size={14} /> Saving Records...
                  </>
                ) : (
                  <>
                    <Save size={14} /> Commit Daily Report
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────── MODE C: WEEKLY OPERATIONAL REPORT ────────────────── */}
      {!loading && activeTab === 'weekly' && (
        <div className="space-y-8 animate-fadeIn">
          
          {/* Week Date Selector and Download Actions */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-sky-50 text-sky-600 rounded-xl border border-sky-100">
                <Calendar size={18} />
              </div>
              <div>
                <p className="text-[10px] font-black text-sky-600 uppercase tracking-widest">Selected Week Range</p>
                <span className="text-sm font-extrabold text-slate-850">
                  {getWeekRange(selectedWeekDate).start} to {getWeekRange(selectedWeekDate).end}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-250 shadow-inner w-full md:w-auto justify-between">
                <button
                  onClick={() => adjustWeek(-7)}
                  className="px-3 py-1.5 hover:bg-slate-200 rounded-xl transition font-extrabold text-slate-500 hover:text-slate-850 text-xs"
                >
                  ◀ Prev Week
                </button>
                <input
                  type="date"
                  value={selectedWeekDate}
                  onChange={(e) => setSelectedWeekDate(e.target.value)}
                  className="bg-white text-slate-800 font-extrabold border border-slate-200 px-3 py-1.5 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                <button
                  onClick={() => adjustWeek(7)}
                  className="px-3 py-1.5 hover:bg-slate-200 rounded-xl transition font-extrabold text-slate-500 hover:text-slate-850 text-xs"
                >
                  Next Week ▶
                </button>
              </div>

              <button
                onClick={handleExportWeeklyXlsx}
                className="flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-2xl text-xs font-bold uppercase tracking-wider hover:opacity-90 shadow-lg shadow-emerald-500/20 active:scale-95 transition"
              >
                <FileSpreadsheet size={15} /> Export Excel
              </button>
            </div>
          </div>

          {/* Filtering Ribbon */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-3.5 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search staff, specialties, logs..."
                value={weeklySearchQuery}
                onChange={(e) => setWeeklySearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-850 placeholder-slate-450 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="text-slate-400" size={16} />
              <select
                value={weeklyDeptFilter}
                onChange={(e) => setWeeklyDeptFilter(e.target.value)}
                className="w-full sm:w-60 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-3 text-xs font-bold text-slate-850 focus:outline-none"
              >
                <option value="ALL">ALL SPECIALTY DEPARTMENTS</option>
                {Object.keys(providersByDept).map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Weekly Report Pivot Matrix Table */}
          {weeklyData ? (
            <div className="p-4 bg-slate-50 rounded-3xl overflow-hidden">
              <div className="bg-white rounded-3xl border border-slate-200 shadow-md overflow-hidden">
                
                <div className="p-6 border-b border-slate-200 bg-slate-50/40 flex justify-between items-center">
                  <div>
                    <h3 className="text-xs font-black uppercase text-slate-800 tracking-widest">Weekly Operational Matrix</h3>
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase">
                      Period: {getWeekRange(selectedWeekDate).start} to {getWeekRange(selectedWeekDate).end}
                    </span>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    <span className="text-[10px] font-black text-sky-700 px-3 py-1.5 bg-sky-50 border border-sky-100 rounded-full">
                      WEEKLY TOTALS LOGGED
                    </span>
                    <span className="text-[10px] font-black bg-sky-100 text-sky-850 px-3 py-1.5 rounded-full uppercase tracking-wider border border-sky-200/50">
                      Pivoted Row-Per-Day Layout
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-slate-100/90 border-b border-slate-250">
                        <th className="sticky left-0 bg-slate-100 text-left px-4 py-3.5 min-w-[200px] border-r border-slate-200 font-extrabold text-slate-800 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                          Staff Specialist
                        </th>
                        <th className="text-left px-4 py-3.5 min-w-[120px] border-r border-slate-200 font-extrabold text-slate-800">
                          Department
                        </th>

                        {getWeeklyDaysArray().map(dateStr => (
                          <th key={dateStr} className="text-center w-24 min-w-[70px] py-3.5 border-r border-slate-200 font-extrabold text-slate-700 bg-slate-50/50">
                            {formatWeeklyDayHeader(dateStr)}
                          </th>
                        ))}

                        <th className="text-center px-4 py-3.5 min-w-[80px] font-black text-sky-850 bg-sky-50/80">
                          TOTAL
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      
                      {/* Filtered Outpatients rows */}
                      {config.providers
                        .filter(p => {
                          if (weeklyDeptFilter !== 'ALL' && p.department_name !== weeklyDeptFilter) return false;
                          if (weeklySearchQuery.trim() !== '') {
                            const query = weeklySearchQuery.toLowerCase();
                            return p.name.toLowerCase().includes(query) || (p.department_name && p.department_name.toLowerCase().includes(query));
                          }
                          return true;
                        })
                        .map(provider => {
                          const deptName = provider.department_name || 'OTHER';
                          const daysMap = {};
                          let providerSum = 0;

                          getWeeklyDaysArray().forEach(dateStr => {
                            const record = weeklyData.metrics.find(m => m.provider_id === provider.id && m.report_date === dateStr);
                            const val = record ? record.patient_count : 0;
                            daysMap[dateStr] = val;
                            providerSum += val;
                          });

                          return (
                            <tr key={provider.id} className="border-b border-slate-150 hover:bg-slate-50/65 transition-colors">
                              <td className="sticky left-0 bg-white hover:bg-slate-50 font-black text-slate-800 px-4 py-3 border-r border-slate-250 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                                <span className="flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-sky-300" />
                                  {provider.name}
                                </span>
                              </td>
                              <td className="px-4 py-3 border-r border-slate-200 text-slate-400 font-extrabold text-[10px] uppercase">
                                {deptName}
                              </td>

                              {getWeeklyDaysArray().map(dateStr => {
                                const val = daysMap[dateStr];
                                return (
                                  <td key={dateStr} className="text-center py-3 border-r border-slate-100 font-mono font-bold text-xs">
                                    {val > 0 ? (
                                      <span className="text-sky-650 font-black">{val}</span>
                                    ) : (
                                      <span className="text-slate-350 opacity-40">-</span>
                                    )}
                                  </td>
                                );
                              })}

                              <td className="text-center py-3 bg-sky-50/30 text-sky-850 font-black font-mono text-xs">
                                {providerSum}
                              </td>
                            </tr>
                          );
                        })}

                      {/* Section Header for Procedures */}
                      <tr className="bg-slate-100/80 border-t border-b border-slate-200 font-bold">
                        <td colSpan={2 + 7 + 1} className="px-4 py-3 text-xs font-black text-sky-700 uppercase tracking-widest">
                          Nursing and Ward Procedures
                        </td>
                      </tr>

                      {/* Filtered Clinical Procedures rows */}
                      {config.defaultProcedureMetrics
                        .filter(mName => {
                          if (weeklyDeptFilter !== 'ALL') return false; 
                          if (weeklySearchQuery.trim() !== '') {
                            return mName.toLowerCase().includes(weeklySearchQuery.toLowerCase());
                          }
                          return true;
                        })
                        .map(metricName => {
                          const daysMap = {};
                          let procedureSum = 0;
                          const isNameInput = metricName.toLowerCase().includes('assistant');

                          getWeeklyDaysArray().forEach(dateStr => {
                            const record = weeklyData.logs.find(l => l.metric_name === metricName && l.report_date === dateStr);
                            const val = record ? record.metric_value : '0';
                            daysMap[dateStr] = val;
                            
                            if (!isNameInput) {
                              const numVal = parseInt(val, 10);
                              if (!isNaN(numVal)) {
                                procedureSum += numVal;
                              }
                            }
                          });

                          return (
                            <tr key={metricName} className="border-b border-slate-150 hover:bg-slate-50/65 transition-colors bg-slate-50/10">
                              <td className="sticky left-0 bg-white hover:bg-slate-50 font-black text-slate-800 px-4 py-3 border-r border-slate-250 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                                <span className="flex items-center gap-1.5">
                                  <span className={`w-1.5 h-1.5 rounded-full ${isNameInput ? 'bg-purple-300' : 'bg-slate-350'}`} />
                                  {metricName}
                                </span>
                              </td>
                              <td className="px-4 py-3 border-r border-slate-200 text-slate-400 font-extrabold text-[10px] uppercase">
                                PROCEDURES
                              </td>

                              {getWeeklyDaysArray().map(dateStr => {
                                const val = daysMap[dateStr];
                                const isZero = val === '0' || val === '' || val === undefined;
                                return (
                                  <td key={dateStr} className="text-center py-3 border-r border-slate-100 font-mono font-bold text-xs" title={val}>
                                    {isZero ? (
                                      <span className="text-slate-350 opacity-40">-</span>
                                    ) : (
                                      <span className={`${
                                        isNameInput 
                                          ? 'text-purple-650 text-[10px] font-sans truncate block max-w-[60px] hover:max-w-none hover:bg-white hover:z-30 hover:absolute px-1.5 py-0.5 rounded border border-purple-100 shadow-sm bg-purple-50' 
                                          : 'text-slate-700 font-black'
                                      }`}>
                                        {val}
                                      </span>
                                    )}
                                  </td>
                                );
                              })}

                              <td className="text-center py-3 bg-slate-100/50 text-slate-650 font-black font-mono text-xs">
                                {isNameInput ? 'N/A' : procedureSum}
                              </td>
                            </tr>
                          );
                        })}

                      {/* Sticky Daily Calculations Column Sum Row */}
                      <tr className="bg-gradient-to-r from-sky-900 to-sky-950 text-white font-extrabold border-t border-sky-950">
                        <td
                          className="sticky left-0 bg-sky-950 text-left px-4 py-4 border-r border-sky-950 font-black uppercase text-xs tracking-wider z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.2)]"
                          colSpan={2}
                        >
                          TOTAL COMPLETED PATIENTS
                        </td>

                        {getWeeklyDaysArray().map(dateStr => {
                          const dailySum = weeklyData.metrics
                            .filter(m => m.report_date === dateStr)
                            .reduce((sum, m) => sum + (m.patient_count || 0), 0);

                          return (
                            <td key={dateStr} className="text-center py-4 border-r border-sky-950 font-mono font-black text-sm text-sky-200">
                              {dailySum}
                            </td>
                          );
                        })}

                        <td className="text-center py-4 font-mono font-black text-sm bg-sky-950 text-emerald-300">
                          {weeklyData.metrics.reduce((sum, m) => sum + (m.patient_count || 0), 0)}
                        </td>
                      </tr>

                    </tbody>
                  </table>
                </div>

              </div>
            </div>
          ) : (
            <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center text-slate-450">
              No weekly report dataset is loaded for the selected period.
            </div>
          )}

        </div>
      )}

      {/* ────────────────── MODE B: MONTHLY MATRIX DASHBOARD ────────────────── */}
      {activeTab === 'monthly' && (
        <div className="space-y-6">

          {/* Calendar Picker Control Bar */}
          <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-md flex justify-between items-center gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-sky-50 rounded-xl text-sky-650">
                <Calendar size={20} />
              </div>
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Operational Pivot Matrix</span>
                <span className="text-sm font-bold text-slate-800">Filter Matrix Period</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Year Select */}
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                className="bg-slate-50 border-2 border-slate-200 text-xs font-black text-slate-700 rounded-xl px-4 py-2.5 outline-none focus:border-sky-500 transition-all duration-200 cursor-pointer"
              >
                {[2024, 2025, 2026, 2027].map(yr => (
                  <option key={yr} value={yr}>{yr}</option>
                ))}
              </select>

              {/* Month Select */}
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
                className="bg-slate-50 border-2 border-slate-200 text-xs font-black text-slate-700 rounded-xl px-4 py-2.5 outline-none focus:border-sky-500 transition-all duration-200 cursor-pointer"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>{getMonthName(m)}</option>
                ))}
              </select>
            </div>

            {/* Excel Export Button */}
            <div className="flex gap-2">
              <button
                onClick={handleExportMonthlyXlsx}
                className="flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-2xl text-xs font-bold uppercase tracking-wider hover:opacity-90 shadow-lg shadow-emerald-500/20 active:scale-95 transition"
              >
                <FileSpreadsheet size={15} /> Export Excel
              </button>
            </div>
          </div>

          {loading || !monthlyData ? (
            // Shimmer loader
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-md animate-pulse space-y-4">
              <div className="h-6 w-1/5 bg-slate-200 rounded-lg"></div>
              <div className="h-4 w-full bg-slate-100 rounded-md"></div>
              <div className="h-4 w-full bg-slate-100 rounded-md"></div>
              <div className="h-4 w-full bg-slate-100 rounded-md"></div>
            </div>
          ) : (
            /* ── Pivot Matrix Board ── */
            <div className="bg-white rounded-3xl border border-slate-200/60 shadow-2xl overflow-hidden print:shadow-none print:border-none">

              {/* Header Context in sheet */}
              <div className="p-6 border-b border-slate-150 bg-slate-50/40 flex justify-between items-center print:border-b-2 print:border-slate-800">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nursing Operations Matrix Log</span>
                  </div>
                  <h2 className="text-lg font-black text-slate-800 uppercase tracking-wider">
                    {getMonthName(selectedMonth)} {selectedYear} Daily Volumes Matrix
                  </h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                    Legacy Clinics &middot; Secure Audit Grid
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black bg-sky-100 text-sky-850 px-3 py-1.5 rounded-full uppercase tracking-wider border border-sky-200/50">
                    Pivoted Row-Per-Day Layout
                  </span>
                </div>
              </div>

              {/* Main matrix scrolling container */}
              <div className="overflow-x-auto w-full max-w-full">
                <table className="w-full border-collapse text-[11px] font-bold text-slate-650 print:text-[9px]">
                  {/* Table Header */}
                  <thead>
                    <tr className="bg-slate-100/90 border-b border-slate-250">
                      <th className="sticky left-0 bg-slate-100 text-left px-4 py-3.5 min-w-[200px] border-r border-slate-200 font-extrabold text-slate-800 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                        Provider / Roster Name
                      </th>
                      <th className="text-left px-4 py-3.5 min-w-[120px] border-r border-slate-200 font-extrabold text-slate-800">
                        Department
                      </th>

                      {/* Day 1 to 31 columns */}
                      {getDaysArray().map(day => (
                        <th
                          key={day}
                          className="text-center w-10 min-w-[38px] py-3.5 border-r border-slate-200 font-extrabold text-slate-700 bg-slate-50/50"
                        >
                          {day}
                        </th>
                      ))}

                      <th className="text-center px-4 py-3.5 min-w-[80px] font-black text-sky-850 bg-sky-50/80">
                        TOTAL
                      </th>
                    </tr>
                  </thead>

                  {/* Table Body */}
                  <tbody>
                    {/* Providers Rows grouped by department */}
                    {config.providers.map(provider => {
                      const deptName = provider.department_name || 'OTHER';

                      // Calculate values map for this provider
                      const daysMap = {};
                      let providerSum = 0;

                      getDaysArray().forEach(day => {
                        const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const record = monthlyData.metrics.find(m => m.provider_id === provider.id && m.report_date === dateStr);
                        const val = record ? record.patient_count : 0;
                        daysMap[day] = val;
                        providerSum += val;
                      });

                      return (
                        <tr key={provider.id} className="border-b border-slate-150 hover:bg-slate-50/65 transition-colors">
                          <td className="sticky left-0 bg-white hover:bg-slate-50 font-black text-slate-800 px-4 py-3 border-r border-slate-250 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                            <span className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-sky-300" />
                              {provider.name}
                            </span>
                          </td>
                          <td className="px-4 py-3 border-r border-slate-200 text-slate-400 font-extrabold text-[10px] uppercase">
                            {deptName}
                          </td>

                          {getDaysArray().map(day => {
                            const val = daysMap[day];
                            return (
                              <td key={day} className="text-center py-3 border-r border-slate-100 font-mono font-bold text-xs">
                                {val > 0 ? (
                                  <span className="text-sky-650 font-black">{val}</span>
                                ) : (
                                  <span className="text-slate-350 opacity-40">-</span>
                                )}
                              </td>
                            );
                          })}

                          <td className="text-center py-3 bg-sky-50/30 text-sky-850 font-black font-mono text-xs">
                            {providerSum}
                          </td>
                        </tr>
                      );
                    })}

                    {/* Section divider for Ancillary Procedures */}
                    <tr className="bg-slate-50 border-y-2 border-slate-250 font-black text-slate-700">
                      <td colSpan={2 + getDaysArray().length + 1} className="px-4 py-2 text-[10px] tracking-widest uppercase bg-slate-100 text-slate-600">
                        Ancillary Operations & Procedure Logs
                      </td>
                    </tr>

                    {/* Predefined metrics rows */}
                    {config.defaultProcedureMetrics.map(metricName => {
                      const daysMap = {};
                      let numericSum = 0;
                      const isNameInput = metricName.toLowerCase().includes('assistant');

                      getDaysArray().forEach(day => {
                        const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const record = monthlyData.logs.find(l => l.metric_name === metricName && l.report_date === dateStr);
                        const val = record ? record.metric_value : '0';
                        daysMap[day] = val;

                        // Parse count sum if numeric
                        const numVal = parseInt(val, 10);
                        if (!isNaN(numVal)) {
                          numericSum += numVal;
                        }
                      });

                      return (
                        <tr key={metricName} className="border-b border-slate-150 hover:bg-slate-50/65 transition-colors bg-slate-50/10">
                          <td className="sticky left-0 bg-white hover:bg-slate-50 font-black text-slate-800 px-4 py-3 border-r border-slate-250 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                            <span className="flex items-center gap-1.5">
                              <span className={`w-1.5 h-1.5 rounded-full ${isNameInput ? 'bg-purple-300' : 'bg-slate-350'}`} />
                              {metricName}
                            </span>
                          </td>
                          <td className="px-4 py-3 border-r border-slate-200 text-slate-400 font-extrabold text-[10px] uppercase">
                            PROCEDURES
                          </td>

                          {getDaysArray().map(day => {
                            const val = daysMap[day];
                            const isZero = val === '0' || val === '' || val === undefined;

                            return (
                              <td
                                key={day}
                                className="text-center py-3 border-r border-slate-100 font-mono font-bold text-xs"
                                title={val}
                              >
                                {isZero ? (
                                  <span className="text-slate-350 opacity-40">-</span>
                                ) : (
                                  <span className={`${isNameInput ? 'text-purple-650 text-[10px] font-sans truncate block max-w-[45px] hover:max-w-none hover:bg-white hover:z-30 hover:absolute px-1.5 py-0.5 rounded border border-purple-100 shadow-sm bg-purple-50' : 'text-slate-700 font-black'}`}>
                                    {val}
                                  </span>
                                )}
                              </td>
                            );
                          })}

                          <td className="text-center py-3 bg-slate-100/50 text-slate-650 font-black font-mono text-xs">
                            {isNameInput ? 'N/A' : numericSum}
                          </td>
                        </tr>
                      );
                    })}

                    {/* Sticky Daily Calculations Column Sum Row */}
                    <tr className="bg-gradient-to-r from-sky-900 to-sky-950 text-white font-extrabold border-t border-sky-950">
                      <td
                        className="sticky left-0 bg-sky-950 text-left px-4 py-4 border-r border-sky-950 font-black uppercase text-xs tracking-wider z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.2)]"
                        colSpan={2}
                      >
                        TOTAL COMPLETED PATIENTS
                      </td>

                      {/* Calculate daily totals for only provider count */}
                      {getDaysArray().map(day => {
                        const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

                        // sum only provider counts
                        const dailySum = monthlyData.metrics
                          .filter(m => m.report_date === dateStr)
                          .reduce((sum, curr) => sum + (curr.patient_count || 0), 0);

                        return (
                          <td key={day} className="text-center py-4 border-r border-sky-950 font-mono font-black text-sm text-sky-200">
                            {dailySum}
                          </td>
                        );
                      })}

                      {/* Cumulative Total */}
                      <td className="text-center py-4 font-mono font-black text-sm bg-sky-950 text-emerald-300">
                        {monthlyData.metrics.reduce((acc, curr) => acc + (curr.patient_count || 0), 0)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
