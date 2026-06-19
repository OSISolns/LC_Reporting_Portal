import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Stethoscope,
  Activity,
  Calendar,
  User,
  BarChart3,
  FileText,
  AlertCircle,
  TrendingUp,
  Award,
  Users,
  Search,
  Filter,
  CheckCircle2,
  CalendarDays,
  FileSpreadsheet,
  Database,
  X
} from 'lucide-react';
import { getReportConfig, getDailyReport, getMonthlyReport, getWeeklyReport } from '../api/reports';
import api from '../api/axios';

import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import ExcelJS from 'exceljs/dist/exceljs.min.js';

const getWeekRange = (dateStr) => {
  if (!dateStr) return { start: '', end: '' };
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  const dayOfWeek = date.getDay(); // 0 is Sunday, 1 is Monday, ...
  const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust to get Monday
  const monday = new Date(year, month - 1, diff);

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

export default function DailyOperationalReportBoard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('daily'); // 'daily', 'weekly' or 'monthly'
  const [dailySubTab, setDailySubTab] = useState('stock-changes'); // 'stock-changes' or 'consumption'
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState({ departments: [], providers: [], defaultProcedureMetrics: [] });


  // Daily Board State
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }); // Default to current date
  const [dailyMetrics, setDailyMetrics] = useState({}); // providerId -> patientCount
  const [dailyFollowUps, setDailyFollowUps] = useState({}); // providerId -> followUpCount
  const [dailyLogs, setDailyLogs] = useState({}); // metricName -> metricValue
  const [stockLogs, setStockLogs] = useState([]); // inventory audit logs
  const [consumptionRecords, setConsumptionRecords] = useState([]); // daily inventory rows
  const [selectedLog, setSelectedLog] = useState(null); // specific log for modal
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');

  // Weekly Board State
  const [selectedWeekDate, setSelectedWeekDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [weeklyData, setWeeklyData] = useState(null);
  const [weeklySearchQuery, setWeeklySearchQuery] = useState('');
  const [weeklyDeptFilter, setWeeklyDeptFilter] = useState('ALL');
  const [weeklyMetricMode, setWeeklyMetricMode] = useState('both'); // 'both' | 'consultation' | 'followup'

  // Monthly Matrix State
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // Default to current month
  const [monthlyData, setMonthlyData] = useState(null);
  const [monthlySearchQuery, setMonthlySearchQuery] = useState('');
  const [monthlyDeptFilter, setMonthlyDeptFilter] = useState('ALL');
  const [monthlyMetricMode, setMonthlyMetricMode] = useState('both'); // 'both' | 'consultation' | 'followup'

  // Refs for PDF capturing
  const dailyReportRef = useRef();
  const weeklyReportRef = useRef();
  const monthlyMatrixRef = useRef();


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
        toast.error('Failed to load configurations.');
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  // Fetch daily report when selectedDate changes
  useEffect(() => {
    if (activeTab !== 'daily') return;

    const fetchDailyData = async () => {
      try {
        setLoading(true);
        const res = await getDailyReport(selectedDate);
        if (res.data.success && res.data.data) {
          const { metrics, logs } = res.data.data;

          const metricsObj = {};
          const followUpsObj = {};
          const logsObj = {};

          metrics.forEach(m => {
            metricsObj[m.provider_id] = m.patient_count;
            followUpsObj[m.provider_id] = m.follow_up_count || 0;
          });

          logs.forEach(l => {
            logsObj[l.metric_name] = l.metric_value;
          });

          setDailyMetrics(metricsObj);
          setDailyFollowUps(followUpsObj);
          setDailyLogs(logsObj);
        } else {
          setDailyMetrics({});
          setDailyFollowUps({});
          setDailyLogs({});
        }

        // Fetch inventory stock change logs for the selected date
        try {
          const token = localStorage.getItem('token');
          const logsRes = await fetch(`/api/clinical/inventory/change-logs?date=${selectedDate}`, {
            headers: {
              'Authorization': token ? `Bearer ${token}` : ''
            }
          });
          const logsData = await logsRes.json();
          if (logsData.success && Array.isArray(logsData.data)) {
            setStockLogs(logsData.data);
          } else {
            setStockLogs([]);
          }
        } catch (logsErr) {
          console.error('Failed to fetch stock change logs:', logsErr);
          setStockLogs([]);
        }

        // Fetch monthly inventory for the daily consumption board card
        try {
          const [year, month] = selectedDate.split('-');
          if (year && month) {
            const monthYear = `${year}-${month}`;
            const invRes = await api.get(`/clinical/inventory?month_year=${monthYear}`);
            if (invRes.data.success && Array.isArray(invRes.data.data)) {
              setConsumptionRecords(invRes.data.data);
            } else {
              setConsumptionRecords([]);
            }
          }
        } catch (invErr) {
          console.error('Failed to fetch monthly inventory for consumption report:', invErr);
          setConsumptionRecords([]);
        }
      } catch (err) {
        console.error('Failed to fetch daily report details:', err);
        toast.error('Failed to load daily report.');
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
        console.error('Failed to load monthly report:', err);
        toast.error('Failed to retrieve monthly matrix data.');
      } finally {
        setLoading(false);
      }
    };

    fetchMonthlyData();
  }, [selectedYear, selectedMonth, activeTab]);

  // Fetch weekly report data
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
        console.error('Failed to load weekly report:', err);
        toast.error('Failed to retrieve weekly report data.');
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

  // Helper to adjust selected date
  const adjustDate = (daysOffset) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + daysOffset);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  // Group providers by department name
  const providersByDept = config.providers.reduce((acc, p) => {
    const dName = p.department_name || 'OTHER';
    if (!acc[dName]) acc[dName] = [];
    acc[dName].push(p);
    return acc;
  }, {});

  // Compute Daily KPIs
  const getDailyKPIs = () => {
    let totalPatients = 0;
    let totalFollowUps = 0;
    let maxDeptName = 'N/A';
    let maxDeptCount = 0;
    const deptTotals = {};

    config.providers.forEach(p => {
      const count = dailyMetrics[p.id] || 0;
      const followUp = dailyFollowUps[p.id] || 0;
      totalPatients += count;
      totalFollowUps += followUp;

      const dName = p.department_name || 'OTHER';
      // Combined: consultations + follow-ups for top dept ranking
      deptTotals[dName] = (deptTotals[dName] || 0) + count + followUp;
      if (deptTotals[dName] > maxDeptCount) {
        maxDeptCount = deptTotals[dName];
        maxDeptName = dName;
      }
    });

    const procedureCount = Object.values(dailyLogs).reduce((sum, val) => {
      const num = parseInt(val, 10);
      return sum + (isNaN(num) ? 0 : num);
    }, 0);

    return { totalPatients, totalFollowUps, maxDeptName, maxDeptCount, procedureCount };
  };

  const kpis = getDailyKPIs();

  // Filter departments & providers based on search query and filter selection
  const getFilteredDepts = () => {
    const depts = Object.keys(providersByDept);
    return depts.filter(dept => {
      if (deptFilter !== 'ALL' && dept !== deptFilter) return false;

      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        return providersByDept[dept].some(p =>
          p.name.toLowerCase().includes(query) ||
          (p.title && p.title.toLowerCase().includes(query))
        );
      }
      return true;
    });
  };

  // Get days list for monthly matrix
  const getDaysArray = () => {
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  };


  // Premium Client-Side Excel Export for Daily Summaries
  const handleExportDailyXlsx = async () => {
    try {
      toast.loading("Generating daily Excel workbook...", { id: 'excel-toast' });
      const workbook = new ExcelJS.Workbook();

      // SHEET 1: Consultations
      const sheet1 = workbook.addWorksheet('Consultations');
      sheet1.views = [{ showGridLines: true }];

      // Set columns widths
      sheet1.getColumn(1).width = 28;
      sheet1.getColumn(2).width = 20;
      sheet1.getColumn(3).width = 24;
      sheet1.getColumn(4).width = 18;

      // Header Block (Corporate Navy Blue Theme)
      const titleCell = sheet1.getCell('A1');
      titleCell.value = 'LEGACY CLINICS & DIAGNOSTICS';
      sheet1.mergeCells('A1:D1');
      titleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1B365D' } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      sheet1.getRow(1).height = 35;

      const subCell = sheet1.getCell('A2');
      subCell.value = 'DAILY OUTPATIENT CONSULTATION REPORT';
      sheet1.mergeCells('A2:D2');
      subCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFF' } };
      subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4A90E2' } };
      subCell.alignment = { horizontal: 'center', vertical: 'middle' };
      sheet1.getRow(2).height = 25;

      const dateCell = sheet1.getCell('A3');
      dateCell.value = `Report Date: ${selectedDate}`;
      sheet1.mergeCells('A3:D3');
      dateCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: '555555' } };
      dateCell.alignment = { horizontal: 'center', vertical: 'middle' };
      sheet1.getRow(3).height = 20;

      sheet1.getRow(4).height = 15;

      // KPI Cards Block (Row 5-6)
      sheet1.getCell('A5').value = 'Outpatients Seen';
      sheet1.getCell('A6').value = kpis.totalPatients;

      sheet1.getCell('B5').value = 'Top Specialty Department';
      sheet1.getCell('B6').value = `${kpis.maxDeptName} (${kpis.maxDeptCount})`;

      sheet1.getCell('C5').value = 'Total Clinical Logs';
      sheet1.getCell('C6').value = kpis.procedureCount;

      sheet1.mergeCells('C5:D5');
      sheet1.mergeCells('C6:D6');

      ['A5', 'B5', 'C5'].forEach(cellRef => {
        const c = sheet1.getCell(cellRef);
        c.font = { name: 'Calibri', size: 9, bold: true, color: { argb: '555555' } };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F0F4F8' } };
        c.alignment = { horizontal: 'center', vertical: 'middle' };
      });

      ['A6', 'B6', 'C6'].forEach(cellRef => {
        const c = sheet1.getCell(cellRef);
        c.font = { name: 'Calibri', size: 12, bold: true, color: { argb: '1B365D' } };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F0F4F8' } };
        c.alignment = { horizontal: 'center', vertical: 'middle' };
      });

      const kpiBorder = {
        top: { style: 'thin', color: { argb: 'CCCCCC' } },
        bottom: { style: 'thin', color: { argb: 'CCCCCC' } },
        left: { style: 'thin', color: { argb: 'CCCCCC' } },
        right: { style: 'thin', color: { argb: 'CCCCCC' } }
      };
      for (let r = 5; r <= 6; r++) {
        for (let c = 1; c <= 4; c++) {
          sheet1.getCell(r, c).border = kpiBorder;
        }
      }

      // Table Header Row 8
      const headerRow = sheet1.getRow(8);
      headerRow.height = 25;
      headerRow.getCell(1).value = 'Staff Specialist';
      headerRow.getCell(2).value = 'Title / Role';
      headerRow.getCell(3).value = 'Specialty Department';
      headerRow.getCell(4).value = 'Patients Consulted';

      for (let c = 1; c <= 4; c++) {
        const cell = headerRow.getCell(c);
        cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1B365D' } };
        cell.alignment = { horizontal: c === 4 ? 'right' : 'left', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin', color: { argb: '1B365D' } },
          bottom: { style: 'medium', color: { argb: '1B365D' } }
        };
      }

      let currentRow = 9;
      config.providers.forEach(p => {
        const count = dailyMetrics[p.id] || 0;
        const r = sheet1.getRow(currentRow);
        r.height = 20;
        r.getCell(1).value = p.name;
        r.getCell(2).value = p.title || 'Specialist';
        r.getCell(3).value = p.department_name || 'OTHER';
        r.getCell(4).value = count;

        for (let col = 1; col <= 4; col++) {
          const cell = r.getCell(col);
          cell.font = { name: 'Calibri', size: 10 };
          cell.border = { bottom: { style: 'thin', color: { argb: 'E2E8F0' } } };
          if (col === 4) {
            cell.alignment = { horizontal: 'right', vertical: 'middle' };
            if (count > 0) {
              cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: '107C41' } };
            }
          }
        }
        currentRow++;
      });

      // Total Row with dynamic SUM formula
      const totalRow = sheet1.getRow(currentRow);
      totalRow.height = 25;
      totalRow.getCell(1).value = 'TOTAL OUTPATIENTS CONSULTED';
      totalRow.getCell(4).value = { formula: `=SUM(D9:D${currentRow - 1})` };

      sheet1.mergeCells(`A${currentRow}:C${currentRow}`);

      for (let col = 1; col <= 4; col++) {
        const cell = totalRow.getCell(col);
        cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: '1B365D' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'ECF2F9' } };
        cell.border = {
          top: { style: 'thin', color: { argb: '1B365D' } },
          bottom: { style: 'double', color: { argb: '1B365D' } }
        };
        if (col === 4) {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
        }
      }

      // SHEET 2: Procedures & Logs
      const sheet2 = workbook.addWorksheet('Procedures & Logs');
      sheet2.views = [{ showGridLines: true }];

      sheet2.getColumn(1).width = 45;
      sheet2.getColumn(2).width = 35;

      // Title
      const titleCell2 = sheet2.getCell('A1');
      titleCell2.value = 'LEGACY CLINICS & DIAGNOSTICS';
      sheet2.mergeCells('A1:B1');
      titleCell2.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFF' } };
      titleCell2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1B365D' } };
      titleCell2.alignment = { horizontal: 'center', vertical: 'middle' };
      sheet2.getRow(1).height = 35;

      const subCell2 = sheet2.getCell('A2');
      subCell2.value = `DAILY OPERATIONAL PROCEDURES & LOGS (${selectedDate})`;
      sheet2.mergeCells('A2:B2');
      subCell2.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFF' } };
      subCell2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4A90E2' } };
      subCell2.alignment = { horizontal: 'center', vertical: 'middle' };
      sheet2.getRow(2).height = 25;

      sheet2.getRow(3).height = 15;

      const headerRow2 = sheet2.getRow(4);
      headerRow2.height = 25;
      headerRow2.getCell(1).value = 'Clinical Metric / Nursing Log';
      headerRow2.getCell(2).value = 'Value / Assignee';

      for (let c = 1; c <= 2; c++) {
        const cell = headerRow2.getCell(c);
        cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1B365D' } };
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin', color: { argb: '1B365D' } },
          bottom: { style: 'medium', color: { argb: '1B365D' } }
        };
      }

      let currentRow2 = 5;
      config.defaultProcedureMetrics.forEach(mName => {
        const val = dailyLogs[mName] || '';
        const isNameInput = mName.toLowerCase().includes('assistant');
        const numVal = isNameInput ? val : (parseInt(val, 10) || 0);

        const r = sheet2.getRow(currentRow2);
        r.height = 22;
        r.getCell(1).value = mName;
        r.getCell(2).value = numVal;

        const c1 = r.getCell(1);
        c1.font = { name: 'Calibri', size: 10, bold: true };
        c1.border = { bottom: { style: 'thin', color: { argb: 'E2E8F0' } } };

        const c2 = r.getCell(2);
        c2.font = { name: 'Calibri', size: 10 };
        c2.border = { bottom: { style: 'thin', color: { argb: 'E2E8F0' } } };
        if (!isNameInput) {
          c2.alignment = { horizontal: 'right', vertical: 'middle' };
          c2.font = { name: 'Calibri', size: 10, bold: true, color: { argb: '1B365D' } };
        } else {
          c2.font = { name: 'Calibri', size: 10, italic: true };
        }
        currentRow2++;
      });

      // Save and Download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Daily_Operational_Report_${selectedDate}.xlsx`;
      link.click();
      toast.success("Excel exported successfully!", { id: 'excel-toast' });
    } catch (err) {
      console.error("Excel generation failed:", err);
      toast.error("Failed to generate Excel workbook.", { id: 'excel-toast' });
    }
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

  // Helper helper to convert numeric column index to Excel column letter

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

      // Configure dynamic columns
      const days = getDaysArray();
      const totalCols = 2 + days.length + 1;

      // Set Column Widths directly to prevent header offset conflicts
      sheet.getColumn(1).width = 28;
      sheet.getColumn(2).width = 24;
      days.forEach(day => {
        sheet.getColumn(2 + day).width = 6;
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
      subCell.value = `INSTITUTIONAL MONTHLY OPERATIONAL MATRIX (Period: ${selectedMonth}/${selectedYear})`;
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

      // Filter providers to match EXACTLY what's on the screen
      const filteredProviders = config.providers.filter(p => {
        if (monthlyDeptFilter !== 'ALL' && p.department_name !== monthlyDeptFilter) return false;
        if (monthlySearchQuery.trim() !== '') {
          const query = monthlySearchQuery.toLowerCase();
          return p.name.toLowerCase().includes(query) || (p.department_name && p.department_name.toLowerCase().includes(query));
        }
        return true;
      });

      // Providers Row Insertion
      filteredProviders.forEach(provider => {
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

        // Dynamic Excel Formula for Row SUM
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

      // Filter procedures to match EXACTLY what's on the screen
      const filteredProcedures = config.defaultProcedureMetrics.filter(metricName => {
        if (monthlyDeptFilter !== 'ALL') return false;
        if (monthlySearchQuery.trim() !== '') {
          return metricName.toLowerCase().includes(monthlySearchQuery.toLowerCase());
        }
        return true;
      });

      // Procedure Rows Insertion
      filteredProcedures.forEach(metricName => {
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

      // Bottom Total row using SUM columns formula dynamically
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
      link.download = `Monthly_Operational_Matrix_${selectedMonth}_${selectedYear}.xlsx`;
      link.click();
      toast.success("Excel exported successfully!", { id: 'excel-toast' });
    } catch (err) {
      console.error("Excel matrix generation failed:", err);
      toast.error("Failed to generate Excel matrix workbook.", { id: 'excel-toast' });
    }
  };

  // Get consumption entries for the selected date
  const getDailyConsumptionData = () => {
    if (!selectedDate) return { entries: [], obs1Total: 0, minorTotal: 0 };
    const parts = selectedDate.split('-');
    if (parts.length !== 3) return { entries: [], obs1Total: 0, minorTotal: 0 };
    const day = parseInt(parts[2], 10);

    const entries = [];
    let obs1Total = 0;
    let minorTotal = 0;

    consumptionRecords.forEach(row => {
      if (row.day === day) {
        // Resolve ward-specific consumed
        let consumed_obs1 = row.consumed_obs1 !== undefined ? (parseInt(row.consumed_obs1, 10) || 0) : 0;
        let consumed_minor = row.consumed_minor !== undefined ? (parseInt(row.consumed_minor, 10) || 0) : 0;

        // Backwards compatibility for legacy records (attribute to STN1)
        if (consumed_obs1 === 0 && consumed_minor === 0 && row.consumed > 0) {
          consumed_obs1 = parseInt(row.consumed, 10) || 0;
        }

        const user_stn1 = row.user_stn1 || (consumed_obs1 > 0 ? (row.responsible_name || 'Not Specified') : 'Not Specified');
        const user_minor = row.user_minor || 'Not Specified';

        if (consumed_obs1 > 0) {
          entries.push({
            id: `${row.id}-stn1`,
            user: user_stn1,
            ward: 'Station 1',
            item: row.item_name,
            session: row.session || 'AM',
            usedNumber: consumed_obs1
          });
          obs1Total += consumed_obs1;
        }

        if (consumed_minor > 0) {
          entries.push({
            id: `${row.id}-minor`,
            user: user_minor,
            ward: 'Minor Surgery',
            item: row.item_name,
            session: row.session || 'AM',
            usedNumber: consumed_minor
          });
          minorTotal += consumed_minor;
        }
      }
    });

    return { entries, obs1Total, minorTotal };
  };

  const { entries: dailyConsumptions, obs1Total, minorTotal } = getDailyConsumptionData();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-4 md:p-8 space-y-8 select-none">

      {/* ── HEADER RIBBON ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-md relative overflow-hidden">
        <div className="absolute top-0 left-0 w-32 h-32 bg-sky-500/5 rounded-full blur-3xl -translate-x-10 -translate-y-10" />
        <div className="absolute bottom-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl translate-x-10 translate-y-10" />

        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200">
              <CheckCircle2 size={10} /> Operational Board
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-slate-850 to-sky-950 bg-clip-text text-transparent">
            Daily Operational Board
          </h1>
          <p className="text-xs text-slate-500 max-w-xl font-semibold">
            Central operational console to explore historical medical stats, pivot metrics, and daily patient reporting logs.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 self-stretch lg:self-auto shadow-inner relative z-10">
          <button
            onClick={() => setActiveTab('daily')}
            className={`flex-1 lg:flex-none px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 ${activeTab === 'daily'
              ? 'bg-gradient-to-r from-sky-500 to-sky-600 text-white shadow-md shadow-sky-500/20'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
              }`}
          >
            <CalendarDays size={15} /> Daily Summaries
          </button>
          <button
            onClick={() => setActiveTab('weekly')}
            className={`flex-1 lg:flex-none px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 ${activeTab === 'weekly'
              ? 'bg-gradient-to-r from-sky-500 to-sky-600 text-white shadow-md shadow-sky-500/20'
              : 'text-slate-500 hover:text-slate-850 hover:bg-slate-200/50'
              }`}
          >
            <Calendar size={15} /> Weekly Report
          </button>
          <button
            onClick={() => setActiveTab('monthly')}
            className={`flex-1 lg:flex-none px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 ${activeTab === 'monthly'
              ? 'bg-gradient-to-r from-sky-500 to-sky-600 text-white shadow-md shadow-sky-500/20'
              : 'text-slate-500 hover:text-slate-850 hover:bg-slate-200/50'
              }`}
          >
            <BarChart3 size={15} /> Monthly Matrix
          </button>
        </div>
      </div>

      {loading && (
        <div className="bg-white border border-slate-200 p-8 rounded-3xl text-center space-y-4 shadow-sm">
          <Activity className="animate-spin text-sky-500 mx-auto" size={40} />
          <p className="text-sm font-bold text-slate-500 animate-pulse">Syncing Operational Reports Registry...</p>
        </div>
      )}

      {/* ────────────────── DAILY SUMMARIES TAB ────────────────── */}
      {!loading && activeTab === 'daily' && (
        <div className="space-y-8 animate-fadeIn">

          {/* Date Selector and Download Actions */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-sky-50 text-sky-600 rounded-xl border border-sky-100">
                <Calendar size={18} />
              </div>
              <div>
                <p className="text-[10px] font-black text-sky-600 uppercase tracking-widest">Selected Date</p>
                <span className="text-sm font-extrabold text-slate-850">Viewing: {selectedDate}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-250 shadow-inner w-full md:w-auto justify-between">
                <button
                  onClick={() => adjustDate(-1)}
                  className="px-3 py-1.5 hover:bg-slate-200 rounded-xl transition font-extrabold text-slate-500 hover:text-slate-850 text-xs"
                >
                  ◀ Prev
                </button>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-white text-slate-800 font-extrabold border border-slate-200 px-3 py-1.5 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                <button
                  onClick={() => adjustDate(1)}
                  className="px-3 py-1.5 hover:bg-slate-200 rounded-xl transition font-extrabold text-slate-500 hover:text-slate-850 text-xs"
                >
                  Next ▶
                </button>
              </div>


              <button
                onClick={handleExportDailyXlsx}
                className="flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-2xl text-xs font-bold uppercase tracking-wider hover:opacity-90 shadow-lg shadow-emerald-500/20 active:scale-95 transition"
              >
                <FileSpreadsheet size={15} /> Export Excel
              </button>
            </div>
          </div>

          {/* Daily KPI Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 rounded-full blur-2xl" />
              <div className="p-4 bg-sky-50 text-sky-600 rounded-2xl border border-sky-100 shadow-sm">
                <Users size={24} />
              </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Outpatients Seen</p>
                  <h3 className="text-3xl font-black text-slate-900 mt-1">{kpis.totalPatients} Patients</h3>
                  {kpis.totalFollowUps > 0 && (
                    <p className="text-[11px] font-black text-amber-500 mt-1 flex items-center gap-1">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                      {kpis.totalFollowUps} Follow-up{kpis.totalFollowUps !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl" />
              <div className="p-4 bg-purple-50 text-purple-650 rounded-2xl border border-purple-100 shadow-sm">
                <TrendingUp size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Top Performing Dept</p>
                <h3 className="text-lg font-black text-slate-900 mt-1 truncate max-w-[200px]">{kpis.maxDeptName}</h3>
                <span className="text-[10px] text-purple-600 font-extrabold uppercase">{kpis.maxDeptCount} Patients Seen</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl" />
              <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100 shadow-sm">
                <Stethoscope size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Clinical Logs</p>
                <h3 className="text-3xl font-black text-slate-900 mt-1">{kpis.procedureCount} Procedures</h3>
              </div>
            </div>
          </div>

          {/* Filtering Ribbon */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-3.5 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search medical specialists..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 placeholder-slate-450 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="text-slate-400" size={16} />
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="w-full sm:w-60 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-3 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="ALL">ALL SPECIALTY DEPARTMENTS</option>
                {Object.keys(providersByDept).map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Main Visual Board Grid wrapped for PDF Capture */}
          <div ref={dailyReportRef} className="p-4 bg-slate-50 rounded-3xl space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

              {/* Outpatient Specialties */}
              <div className="lg:col-span-2 space-y-6">
                <h2 className="text-sm font-black text-sky-650 uppercase tracking-widest flex items-center gap-2 border-b border-slate-200 pb-2">
                  <Users size={16} /> Patient Consultation Registry
                </h2>

                <div className="space-y-6">
                  {getFilteredDepts().map(deptName => {
                    const providers = providersByDept[deptName].filter(p => {
                      if (searchQuery.trim() === '') return true;
                      const query = searchQuery.toLowerCase();
                      return p.name.toLowerCase().includes(query) || (p.title && p.title.toLowerCase().includes(query));
                    });

                    if (providers.length === 0) return null;

                    const deptTotal = providers.reduce((sum, p) => sum + (dailyMetrics[p.id] || 0), 0);
                    const deptFollowUps = providers.reduce((sum, p) => sum + (dailyFollowUps[p.id] || 0), 0);

                    return (
                      <div key={deptName} className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:border-sky-500/30 transition-all duration-300">

                        {/* Dept Header */}
                        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                          <span className="text-xs font-black text-slate-800 uppercase tracking-wider">{deptName}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black px-2.5 py-1 bg-sky-50 text-sky-600 rounded-full border border-sky-100">
                              {deptTotal} Consult.
                            </span>
                            {deptFollowUps > 0 && (
                              <span className="text-[10px] font-black px-2.5 py-1 bg-teal-50 text-teal-600 rounded-full border border-teal-100">
                                {deptFollowUps} Follow-up
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Providers Grid */}
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                          {providers.map(provider => {
                            const count = dailyMetrics[provider.id] || 0;
                            const followUp = dailyFollowUps[provider.id] || 0;
                            return (
                              <div key={provider.id} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50/30">
                                <div className="flex items-center gap-3">
                                  <div className="p-2.5 bg-slate-100 text-slate-500 rounded-xl">
                                    <User size={16} />
                                  </div>
                                  <div>
                                    <p className="text-xs font-black text-slate-800">{provider.name}</p>
                                    <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">{provider.title || 'Specialist'}</span>
                                  </div>
                                </div>

                                <div className="flex flex-col items-end gap-1">
                                  <span className={`text-[10px] font-black font-mono px-2.5 py-1 rounded-lg border flex items-center gap-1 ${count > 0
                                    ? 'bg-sky-50 text-sky-700 border-sky-100'
                                    : 'bg-slate-100 text-slate-400 border-slate-200/60'
                                    }`}>
                                    <span className="text-[8px] font-black text-sky-400 uppercase">C</span>
                                    {count}
                                  </span>
                                  <span className={`text-[10px] font-black font-mono px-2.5 py-1 rounded-lg border flex items-center gap-1 ${followUp > 0
                                    ? 'bg-teal-50 text-teal-700 border-teal-100'
                                    : 'bg-slate-100 text-slate-400 border-slate-200/60'
                                    }`}>
                                    <span className="text-[8px] font-black text-teal-400 uppercase">F</span>
                                    {followUp}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                      </div>
                    );
                  })}

                  {getFilteredDepts().length === 0 && (
                    <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center text-slate-450">
                      No specialist registries match your search criteria.
                    </div>
                  )}
                </div>
              </div>

              {/* Daily Operational Procedures */}
              <div className="space-y-6">
                <h2 className="text-sm font-black text-sky-650 uppercase tracking-widest flex items-center gap-2 border-b border-slate-200 pb-2">
                  <Stethoscope size={16} /> Clinical & Nursing Logs
                </h2>

                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                  {config.defaultProcedureMetrics.map(mName => {
                    const val = dailyLogs[mName] || '';
                    const isNameInput = mName.toLowerCase().includes('assistant');
                    const isZero = val === '0' || val === '';

                    return (
                      <div key={mName} className="flex items-center justify-between p-4 bg-slate-50/30 rounded-2xl border border-slate-100">
                        <div>
                          <span className="text-xs font-black text-slate-700 block uppercase tracking-wider">{mName}</span>
                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider ${isNameInput ? 'bg-purple-100 text-purple-700' : 'bg-slate-200 text-slate-500'}`}>
                            {isNameInput ? 'Staff Name' : 'Clinical Metric'}
                          </span>
                        </div>

                        <span className={`text-xs font-bold px-3 py-1.5 rounded-xl border ${isNameInput
                          ? 'bg-purple-50 text-purple-700 border-purple-200 font-sans'
                          : !isZero
                            ? 'bg-sky-50 text-sky-700 border-sky-100 font-mono'
                            : 'bg-slate-100 text-slate-400 border-slate-200/60 font-mono'
                          }`}>
                          {isNameInput ? (val || 'Not Assigned') : val || '0'}
                        </span>
                      </div>
                    );
                  })}

                  {config.defaultProcedureMetrics.length === 0 && (
                    <p className="text-slate-450 text-xs text-center py-4">No special operational metrics defined.</p>
                  )}
                </div>
              </div>

            </div>

            {/* Daily Summaries Audit and Consumption Tabs */}
            <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-250 mt-6 shadow-inner max-w-lg select-none">
              <button
                type="button"
                onClick={() => setDailySubTab('stock-changes')}
                className={`flex-1 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 ${dailySubTab === 'stock-changes'
                  ? 'bg-white text-slate-800 shadow-sm border border-slate-200/40'
                  : 'text-slate-500 hover:text-slate-850 hover:bg-slate-200/30'
                  }`}
              >
                <Database size={15} /> Stock Changes
              </button>
              <button
                type="button"
                onClick={() => setDailySubTab('consumption')}
                className={`flex-1 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 ${dailySubTab === 'consumption'
                  ? 'bg-white text-slate-800 shadow-sm border border-slate-200/40'
                  : 'text-slate-500 hover:text-slate-850 hover:bg-slate-200/30'
                  }`}
              >
                <Activity size={15} /> Wards Consumption
              </button>
            </div>

            {dailySubTab === 'stock-changes' && (
              /* Daily Stock Changes Card (formerly Nursing Stock Daily Audit Timeline) */
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 mt-6 animate-fadeIn">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4 mb-4">
                  <div>
                    <h3 className="text-sm font-black text-sky-650 uppercase tracking-widest flex items-center gap-2">
                      <Database size={16} className="text-sky-650" /> Stock Changes
                    </h3>
                    <p className="text-[10px] text-slate-400 font-extrabold uppercase mt-0.5">
                      Real-time stock counting updates and consumed level adjustments log
                    </p>
                  </div>
                  <span className="text-[10px] font-black px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-100 rounded-full">
                    {stockLogs.length} CHANGES LOGGED
                  </span>
                </div>

                {stockLogs.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                    <Database size={24} className="text-slate-300 mx-auto mb-2" />
                    <p className="text-xs text-slate-450 font-bold">No inventory stock or consumption level modifications logged today.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-left border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                          <th className="px-4 py-3">Logged At</th>
                          <th className="px-4 py-3">Item Name</th>
                          <th className="px-4 py-3">Day / Session</th>
                          <th className="px-4 py-3 text-center">Stock Change</th>
                          <th className="px-4 py-3 text-center">Consumed Change</th>
                          <th className="px-4 py-3">Updated By</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {stockLogs.map((log) => {
                          const logTime = new Date(log.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

                          const stockDiff = log.new_stock - log.old_stock;
                          const consumedDiff = log.new_consumed - log.old_consumed;

                          return (
                            <tr
                              key={log.id}
                              className="hover:bg-slate-50/40 text-xs font-bold text-slate-700 cursor-pointer"
                              onClick={() => setSelectedLog(log)}
                            >
                              <td className="px-4 py-3.5 whitespace-nowrap text-slate-400 font-mono text-[11px]">{logTime}</td>
                              <td className="px-4 py-3.5 text-slate-900 font-black">{log.item_name}</td>
                              <td className="px-4 py-3.5">
                                <span className="inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-100 uppercase">
                                  Day {log.day} - {log.session}
                                </span>
                              </td>
                              <td className="px-4 py-3.5 text-center">
                                <span className={`inline-flex items-center gap-1 font-mono text-[11px] font-black ${stockDiff === 0 ? 'text-slate-400' : stockDiff > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  {log.old_stock} ➔ {log.new_stock}
                                  {stockDiff !== 0 && ` (${stockDiff > 0 ? '+' : ''}${stockDiff})`}
                                </span>
                              </td>
                              <td className="px-4 py-3.5 text-center">
                                <span className={`inline-flex items-center gap-1 font-mono text-[11px] font-black ${consumedDiff === 0 ? 'text-slate-400' : consumedDiff > 0 ? 'text-amber-600' : 'text-sky-600'}`}>
                                  {log.old_consumed} ➔ {log.new_consumed}
                                  {consumedDiff !== 0 && ` (${consumedDiff > 0 ? '+' : ''}${consumedDiff})`}
                                </span>
                              </td>
                              <td className="px-4 py-3.5 whitespace-nowrap text-slate-800">
                                <span className="inline-flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-450" />
                                  {log.updated_by}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {dailySubTab === 'consumption' && (
              /* Daily Nursing Ward Consumption Report Card */
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 mt-6 animate-fadeIn">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4 mb-4">
                  <div>
                    <h3 className="text-sm font-black text-sky-650 uppercase tracking-widest flex items-center gap-2">
                      <Activity size={16} className="text-sky-650" /> Nursing Wards Consumption Report
                    </h3>
                    <p className="text-[10px] text-slate-400 font-extrabold uppercase mt-0.5">
                      Consumption breakdown by user and ward with calculated totals
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-[10px] font-black px-2.5 py-1 bg-sky-50 text-sky-700 border border-sky-100 rounded-full">
                      STN1 TOTAL: {obs1Total}
                    </span>
                    <span className="text-[10px] font-black px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full">
                      MINOR TOTAL: {minorTotal}
                    </span>
                  </div>
                </div>

                {dailyConsumptions.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                    <Activity size={24} className="text-slate-300 mx-auto mb-2" />
                    <p className="text-xs text-slate-450 font-bold">No nursing stock consumption records recorded for this day.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-left border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                          <th className="px-4 py-3">User (Nurse)</th>
                          <th className="px-4 py-3">Ward</th>
                          <th className="px-4 py-3">Item Name</th>
                          <th className="px-4 py-3 text-center">Session</th>
                          <th className="px-4 py-3 text-center">Used Number</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                        {dailyConsumptions.map(entry => (
                          <tr key={entry.id} className="hover:bg-slate-50/80 transition-colors text-xs">
                            <td className="px-4 py-3 font-bold text-slate-900">{entry.user}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                entry.ward === 'Station 1'
                                  ? 'bg-sky-50 text-sky-700 border-sky-100'
                                  : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                              }`}>
                                {entry.ward}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-bold text-slate-800">{entry.item}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                                entry.session === 'AM' ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-blue-50 text-blue-700 border border-blue-100'
                              }`}>
                                {entry.session}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center font-mono font-black text-slate-900">{entry.usedNumber}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                  </div>
            )}
          </div>
            )}
        </div>

        </div>
  )
}

{/* ────────────────── WEEKLY REPORT TAB ────────────────── */ }
{
  !loading && activeTab === 'weekly' && (
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
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-3.5 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search staff, specialties, logs..."
            value={weeklySearchQuery}
            onChange={(e) => setWeeklySearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-850 placeholder-slate-450 focus:outline-none"
          />
        </div>

        {/* Metric Mode Toggle */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner">
          {[['both', 'Both'], ['consultation', 'Consult.'], ['followup', 'Follow-up']].map(([val, label]) => (
            <button key={val} onClick={() => setWeeklyMetricMode(val)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${weeklyMetricMode === val
                ? val === 'followup' ? 'bg-teal-500 text-white shadow-sm' : val === 'consultation' ? 'bg-sky-500 text-white shadow-sm' : 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-400 hover:text-slate-700'
                }`}>{label}</button>
          ))}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="text-slate-400" size={16} />
          <select
            value={weeklyDeptFilter}
            onChange={(e) => setWeeklyDeptFilter(e.target.value)}
            className="w-full sm:w-52 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-3 text-xs font-bold text-slate-850 focus:outline-none"
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
        <div ref={weeklyReportRef} className="p-4 bg-slate-50 rounded-3xl overflow-hidden">
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
                      const followMap = {};
                      let providerSum = 0;
                      let followSum = 0;

                      getWeeklyDaysArray().forEach(dateStr => {
                        const record = weeklyData.metrics.find(m => m.provider_id === provider.id && m.report_date === dateStr);
                        const val = record ? record.patient_count : 0;
                        const fval = record ? (record.follow_up_count || 0) : 0;
                        daysMap[dateStr] = val;
                        followMap[dateStr] = fval;
                        providerSum += val;
                        followSum += fval;
                      });

                      return (
                        <React.Fragment key={provider.id}>
                          {/* Consultation row */}
                          {weeklyMetricMode !== 'followup' && (
                            <tr className="border-b border-slate-100 hover:bg-slate-50/65 transition-colors">
                              <td className="sticky left-0 bg-white hover:bg-slate-50 font-black text-slate-800 px-4 py-2.5 border-r border-slate-250 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                                <span className="flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-sky-300" />
                                  {provider.name}
                                  {weeklyMetricMode === 'both' && <span className="text-[8px] font-black text-sky-400 ml-1 uppercase">C</span>}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 border-r border-slate-200 text-slate-400 font-extrabold text-[10px] uppercase">
                                {deptName}
                              </td>

                              {getWeeklyDaysArray().map(dateStr => {
                                const val = daysMap[dateStr];
                                return (
                                  <td key={dateStr} className="text-center py-2.5 border-r border-slate-100 font-mono font-bold text-xs">
                                    {val > 0 ? (
                                      <span className="text-sky-650 font-black">{val}</span>
                                    ) : (
                                      <span className="text-slate-350 opacity-40">-</span>
                                    )}
                                  </td>
                                );
                              })}

                              <td className="text-center py-2.5 bg-sky-50/30 text-sky-850 font-black font-mono text-xs">
                                {providerSum}
                              </td>
                            </tr>
                          )}
                          {/* Follow-up sub-row */}
                          {weeklyMetricMode !== 'consultation' && (
                            <tr className={`border-b border-slate-150 ${weeklyMetricMode === 'both' ? 'bg-teal-50/20' : 'hover:bg-teal-50/30 transition-colors'}`}>
                              <td className="sticky left-0 bg-teal-50/30 px-4 py-1.5 border-r border-slate-250 z-10" colSpan={1}>
                                {weeklyMetricMode === 'both'
                                  ? <span className="text-[9px] font-black text-teal-500 uppercase tracking-wider">↳ Follow-up</span>
                                  : <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-teal-300" />{provider.name} <span className="text-[8px] font-black text-teal-400 ml-1 uppercase">F</span></span>
                                }
                              </td>
                              <td className="px-4 py-1.5 border-r border-slate-200 text-slate-400 font-extrabold text-[10px] uppercase">{weeklyMetricMode === 'followup' ? deptName : ''}</td>
                              {getWeeklyDaysArray().map(dateStr => {
                                const fval = followMap[dateStr];
                                return (
                                  <td key={dateStr} className="text-center py-1.5 border-r border-slate-100 font-mono text-[10px]">
                                    {fval > 0 ? (
                                      <span className="text-teal-600 font-black">{fval}</span>
                                    ) : (
                                      <span className="text-slate-300 opacity-40">-</span>
                                    )}
                                  </td>
                                );
                              })}
                              <td className="text-center py-1.5 bg-teal-50/40 text-teal-700 font-black font-mono text-[10px]">
                                {followSum > 0 ? followSum : '-'}
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
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
                                  <span className={`${isNameInput
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
  )
}

{/* ────────────────── MONTHLY MATRIX EXPLORER TAB ────────────────── */ }
{
  !loading && activeTab === 'monthly' && (
    <div className="space-y-8 animate-fadeIn">

      {/* Calendar Selectors */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
            <FileSpreadsheet size={18} />
          </div>
          <div>
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Monthly Period</p>
            <span className="text-sm font-extrabold text-slate-850">Period: {selectedMonth}/{selectedYear}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200 shadow-inner w-full md:w-auto">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-white text-slate-800 font-extrabold border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>
                  {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1]}
                </option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-white text-slate-800 font-extrabold border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none"
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>


          <button
            onClick={handleExportMonthlyXlsx}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-2xl text-xs font-bold uppercase tracking-wider hover:opacity-90 shadow-lg shadow-emerald-500/20 active:scale-95 transition w-full md:w-auto"
          >
            <FileSpreadsheet size={15} /> Export Excel
          </button>
        </div>
      </div>

      {/* Filtering Ribbon */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-3.5 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search staff, specialties, logs..."
            value={monthlySearchQuery}
            onChange={(e) => setMonthlySearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-850 placeholder-slate-450 focus:outline-none"
          />
        </div>

        {/* Metric Mode Toggle */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner">
          {[['both', 'Both'], ['consultation', 'Consult.'], ['followup', 'Follow-up']].map(([val, label]) => (
            <button key={val} onClick={() => setMonthlyMetricMode(val)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${monthlyMetricMode === val
                ? val === 'followup' ? 'bg-teal-500 text-white shadow-sm' : val === 'consultation' ? 'bg-sky-500 text-white shadow-sm' : 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-400 hover:text-slate-700'
                }`}>{label}</button>
          ))}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="text-slate-400" size={16} />
          <select
            value={monthlyDeptFilter}
            onChange={(e) => setMonthlyDeptFilter(e.target.value)}
            className="w-full sm:w-52 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-3 text-xs font-bold text-slate-850 focus:outline-none"
          >
            <option value="ALL">ALL SPECIALTY DEPARTMENTS</option>
            {Object.keys(providersByDept).map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Pivot Matrix Table wrapped for PDF capture */}
      {monthlyData ? (
        <div ref={monthlyMatrixRef} className="p-4 bg-slate-50 rounded-3xl overflow-hidden">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-md overflow-hidden">

            <div className="p-6 border-b border-slate-200 bg-slate-50/40 flex justify-between items-center">
              <div>
                <h3 className="text-xs font-black uppercase text-slate-800 tracking-widest">Institutional Operational Matrix</h3>
                <span className="text-[10px] text-slate-400 font-extrabold uppercase">Monthly Overview ({selectedMonth}/{selectedYear})</span>
              </div>
              <div className="text-right flex items-center gap-2">
                <span className="text-[10px] font-black text-sky-700 px-3 py-1.5 bg-sky-50 border border-sky-100 rounded-full">
                  MONTHLY TOTALS LOGGED
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

                    {getDaysArray().map(day => (
                      <th key={day} className="text-center w-10 min-w-[38px] py-3.5 border-r border-slate-200 font-extrabold text-slate-700 bg-slate-50/50">
                        {day}
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
                      if (monthlyDeptFilter !== 'ALL' && p.department_name !== monthlyDeptFilter) return false;
                      if (monthlySearchQuery.trim() !== '') {
                        const query = monthlySearchQuery.toLowerCase();
                        return p.name.toLowerCase().includes(query) || (p.department_name && p.department_name.toLowerCase().includes(query));
                      }
                      return true;
                    })
                    .map(provider => {
                      const deptName = provider.department_name || 'OTHER';
                      const daysMap = {};
                      const followMap = {};
                      let providerSum = 0;
                      let followSum = 0;

                      getDaysArray().forEach(day => {
                        const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const record = monthlyData.metrics.find(m => m.provider_id === provider.id && m.report_date === dateStr);
                        const val = record ? record.patient_count : 0;
                        const fval = record ? (record.follow_up_count || 0) : 0;
                        daysMap[day] = val;
                        followMap[day] = fval;
                        providerSum += val;
                        followSum += fval;
                      });

                      return (
                        <React.Fragment key={provider.id}>
                          {/* Consultation row */}
                          {monthlyMetricMode !== 'followup' && (
                            <tr className="border-b border-slate-100 hover:bg-slate-50/65 transition-colors">
                              <td className="sticky left-0 bg-white hover:bg-slate-50 font-black text-slate-800 px-4 py-2.5 border-r border-slate-250 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                                <span className="flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-sky-300" />
                                  {provider.name}
                                  {monthlyMetricMode === 'both' && <span className="text-[8px] font-black text-sky-400 ml-1 uppercase">C</span>}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 border-r border-slate-200 text-slate-400 font-extrabold text-[10px] uppercase">
                                {deptName}
                              </td>

                              {getDaysArray().map(day => {
                                const val = daysMap[day];
                                return (
                                  <td key={day} className="text-center py-2.5 border-r border-slate-100 font-mono font-bold text-xs">
                                    {val > 0 ? (
                                      <span className="text-sky-650 font-black">{val}</span>
                                    ) : (
                                      <span className="text-slate-350 opacity-40">-</span>
                                    )}
                                  </td>
                                );
                              })}

                              <td className="text-center py-2.5 bg-sky-50/30 text-sky-850 font-black font-mono text-xs">
                                {providerSum}
                              </td>
                            </tr>
                          )}
                          {/* Follow-up sub-row */}
                          {monthlyMetricMode !== 'consultation' && (
                            <tr className={`border-b border-slate-150 ${monthlyMetricMode === 'both' ? 'bg-teal-50/20' : 'hover:bg-teal-50/30 transition-colors'}`}>
                              <td className="sticky left-0 bg-teal-50/30 px-4 py-1.5 border-r border-slate-250 z-10" colSpan={1}>
                                {monthlyMetricMode === 'both'
                                  ? <span className="text-[9px] font-black text-teal-500 uppercase tracking-wider">↳ Follow-up</span>
                                  : <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-teal-300" />{provider.name} <span className="text-[8px] font-black text-teal-400 ml-1 uppercase">F</span></span>
                                }
                              </td>
                              <td className="px-4 py-1.5 border-r border-slate-200 text-slate-400 font-extrabold text-[10px] uppercase">{monthlyMetricMode === 'followup' ? deptName : ''}</td>
                              {getDaysArray().map(day => {
                                const fval = followMap[day];
                                return (
                                  <td key={day} className="text-center py-1.5 border-r border-slate-100 font-mono text-[10px]">
                                    {fval > 0 ? (
                                      <span className="text-teal-600 font-black">{fval}</span>
                                    ) : (
                                      <span className="text-slate-300 opacity-40">-</span>
                                    )}
                                  </td>
                                );
                              })}
                              <td className="text-center py-1.5 bg-teal-50/40 text-teal-700 font-black font-mono text-[10px]">
                                {followSum > 0 ? followSum : '-'}
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}

                  {/* Section Header for Procedures */}
                  <tr className="bg-slate-100/80 border-t border-b border-slate-200 font-bold">
                    <td colSpan={2 + getDaysArray().length + 1} className="px-4 py-3 text-xs font-black text-sky-700 uppercase tracking-widest">
                      Nursing and Ward Procedures
                    </td>
                  </tr>

                  {/* Filtered Clinical Procedures rows */}
                  {config.defaultProcedureMetrics
                    .filter(mName => {
                      if (monthlyDeptFilter !== 'ALL') return false;
                      if (monthlySearchQuery.trim() !== '') {
                        return mName.toLowerCase().includes(monthlySearchQuery.toLowerCase());
                      }
                      return true;
                    })
                    .map(metricName => {
                      const daysMap = {};
                      let procedureSum = 0;
                      const isNameInput = metricName.toLowerCase().includes('assistant');

                      getDaysArray().forEach(day => {
                        const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const record = monthlyData.logs.find(l => l.metric_name === metricName && l.report_date === dateStr);
                        const val = record ? record.metric_value : '0';
                        daysMap[day] = val;

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

                          {getDaysArray().map(day => {
                            const val = daysMap[day];
                            const isZero = val === '0' || val === '' || val === undefined;
                            return (
                              <td key={day} className="text-center py-3 border-r border-slate-100 font-mono font-bold text-xs" title={val}>
                                {isZero ? (
                                  <span className="text-slate-350 opacity-40">-</span>
                                ) : (
                                  <span className={`${isNameInput
                                    ? 'text-purple-650 text-[10px] font-sans truncate block max-w-[45px] hover:max-w-none hover:bg-white hover:z-30 hover:absolute px-1.5 py-0.5 rounded border border-purple-100 shadow-sm bg-purple-50'
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

                    {getDaysArray().map(day => {
                      const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                      const dailySum = monthlyData.metrics
                        .filter(m => m.report_date === dateStr)
                        .reduce((sum, m) => sum + (m.patient_count || 0), 0);

                      return (
                        <td key={day} className="text-center py-4 border-r border-sky-950 font-mono font-black text-sm text-sky-200">
                          {dailySum}
                        </td>
                      );
                    })}

                    <td className="text-center py-4 font-mono font-black text-sm bg-sky-950 text-emerald-300">
                      {monthlyData.metrics.reduce((sum, m) => sum + (m.patient_count || 0), 0)}
                    </td>
                  </tr>

                </tbody>
              </table>
            </div>

          </div>
        </div>
      ) : (
        <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center text-slate-450">
          No monthly report matrix dataset is loaded for the selected period.
        </div>
      )}

    </div>
  )
}

{/* ────────────────── STOCK LOG DETAILS MODAL ────────────────── */ }
{
  selectedLog && createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-sky-100 flex items-center justify-center text-sky-600">
              <Database size={18} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800">Transaction Details</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">ID: #{selectedLog.id}</p>
            </div>
          </div>
          <button
            onClick={() => setSelectedLog(null)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto custom-scrollbar">
          <div className="space-y-4">

            {/* Item & Session Info */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <div className="mb-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Item Name</span>
                <span className="text-sm font-black text-slate-800">{selectedLog.item_name}</span>
              </div>
              <div className="flex items-center gap-6">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Month/Year</span>
                  <span className="text-xs font-bold text-slate-700">{selectedLog.month_year}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Session</span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-100 uppercase">
                    Day {selectedLog.day} - {selectedLog.session}
                  </span>
                </div>
              </div>
            </div>

            {/* Values Comparison */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2 text-center">Stock Change</span>
                <div className="flex items-center justify-center gap-2 font-mono text-xs font-black">
                  <span className="text-slate-500">{selectedLog.old_stock}</span>
                  <span className="text-slate-300">➔</span>
                  <span className="text-slate-800">{selectedLog.new_stock}</span>
                </div>
                {selectedLog.new_stock - selectedLog.old_stock !== 0 && (
                  <div className={`mt-2 text-[10px] font-bold text-center py-1 rounded ${selectedLog.new_stock - selectedLog.old_stock > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    {selectedLog.new_stock - selectedLog.old_stock > 0 ? '+' : ''}{selectedLog.new_stock - selectedLog.old_stock} items
                  </div>
                )}
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2 text-center">Consumed Change</span>
                <div className="flex items-center justify-center gap-2 font-mono text-xs font-black">
                  <span className="text-slate-500">{selectedLog.old_consumed}</span>
                  <span className="text-slate-300">➔</span>
                  <span className="text-slate-800">{selectedLog.new_consumed}</span>
                </div>
                {selectedLog.new_consumed - selectedLog.old_consumed !== 0 && (
                  <div className={`mt-2 text-[10px] font-bold text-center py-1 rounded ${selectedLog.new_consumed - selectedLog.old_consumed > 0 ? 'bg-amber-50 text-amber-600' : 'bg-sky-50 text-sky-600'}`}>
                    {selectedLog.new_consumed - selectedLog.old_consumed > 0 ? '+' : ''}{selectedLog.new_consumed - selectedLog.old_consumed} items
                  </div>
                )}
              </div>
            </div>

            {/* Metadata */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Updated By</span>
                <span className="text-xs font-bold text-slate-700 inline-flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-450" />
                  {selectedLog.updated_by}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Timestamp</span>
                <span className="text-xs font-mono font-bold text-slate-600">
                  {new Date(selectedLog.updated_at).toLocaleString()}
                </span>
              </div>
            </div>

          </div>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            onClick={() => setSelectedLog(null)}
            className="px-5 py-2 rounded-lg bg-white border border-slate-200 text-xs font-black text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>, document.body
  )
}

    </div >
  );
}
