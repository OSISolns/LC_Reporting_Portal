import React, { useState, useEffect, useRef } from 'react';
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
  Download
} from 'lucide-react';
import { getReportConfig, getDailyReport, getMonthlyReport } from '../api/reports';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function DailyOperationalReportBoard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('daily'); // 'daily' or 'monthly'
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState({ departments: [], providers: [], defaultProcedureMetrics: [] });

  // Daily Board State
  const [selectedDate, setSelectedDate] = useState('2026-04-30'); // Default to latest populated data
  const [dailyMetrics, setDailyMetrics] = useState({}); // providerId -> patientCount
  const [dailyLogs, setDailyLogs] = useState({}); // metricName -> metricValue
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');

  // Monthly Matrix State
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedMonth, setSelectedMonth] = useState(4); // Default to April
  const [monthlyData, setMonthlyData] = useState(null);
  const [monthlySearchQuery, setMonthlySearchQuery] = useState('');
  const [monthlyDeptFilter, setMonthlyDeptFilter] = useState('ALL');

  // Refs for PDF capturing
  const dailyReportRef = useRef();
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
          const logsObj = {};

          metrics.forEach(m => {
            metricsObj[m.provider_id] = m.patient_count;
          });

          logs.forEach(l => {
            logsObj[l.metric_name] = l.metric_value;
          });

          setDailyMetrics(metricsObj);
          setDailyLogs(logsObj);
        } else {
          setDailyMetrics({});
          setDailyLogs({});
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
    let maxDeptName = 'N/A';
    let maxDeptCount = 0;
    const deptTotals = {};

    config.providers.forEach(p => {
      const count = dailyMetrics[p.id] || 0;
      totalPatients += count;

      const dName = p.department_name || 'OTHER';
      deptTotals[dName] = (deptTotals[dName] || 0) + count;
      if (deptTotals[dName] > maxDeptCount) {
        maxDeptCount = deptTotals[dName];
        maxDeptName = dName;
      }
    });

    const procedureCount = Object.values(dailyLogs).reduce((sum, val) => {
      const num = parseInt(val, 10);
      return sum + (isNaN(num) ? 0 : num);
    }, 0);

    return { totalPatients, maxDeptName, maxDeptCount, procedureCount };
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

  // Modern High-Fidelity Client-Side PDF Generation Handler
  const handleDownloadPdf = async () => {
    const element = activeTab === 'daily' ? dailyReportRef.current : monthlyMatrixRef.current;
    if (!element) return;

    try {
      toast.loading("Compiling operational PDF document...", { id: 'pdf-toast' });

      // Take a high-resolution DOM snapshot with clean CORS & light backgrounds
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#f8fafc', // standard slate-50 light background
        logging: false
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210; // A4 page dimensions
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Handle multi-page pagination offset cleanly
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const fileName = activeTab === 'daily' 
        ? `Daily_Operational_Report_${selectedDate}.pdf`
        : `Monthly_Operational_Matrix_${selectedMonth}_${selectedYear}.pdf`;

      pdf.save(fileName);
      toast.success("PDF exported successfully!", { id: 'pdf-toast' });
    } catch (err) {
      console.error("PDF generation failed:", err);
      toast.error("Failed to generate PDF.", { id: 'pdf-toast' });
    }
  };

  // Premium Client-Side Excel Export for Daily Summaries
  const handleExportDailyXlsx = async () => {
    try {
      toast.loading("Generating daily Excel workbook...", { id: 'excel-toast' });
      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      
      // SHEET 1: Consultations
      const sheet1 = workbook.addWorksheet('Consultations');
      sheet1.views = [{ showGridLines: true }];
      
      // Set columns widths
      sheet1.columns = [
        { header: '', key: 'name', width: 28 },
        { header: '', key: 'title', width: 20 },
        { header: '', key: 'dept', width: 24 },
        { header: '', key: 'count', width: 18 }
      ];
      
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
      
      // Table Header
      const headerRow = sheet1.getRow(8);
      headerRow.values = ['Staff Specialist', 'Title / Role', 'Specialty Department', 'Patients Consulted'];
      headerRow.height = 25;
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
        sheet1.addRow({
          name: p.name,
          title: p.title || 'Specialist',
          dept: p.department_name || 'OTHER',
          count: count
        });
        
        const r = sheet1.getRow(currentRow);
        r.height = 20;
        for (let col = 1; col <= 4; col++) {
          const cell = r.getCell(col);
          cell.font = { name: 'Calibri', size: 10 };
          cell.border = { bottom: { style: 'thin', color: { argb: 'E2E8F0' } } };
          if (col === 4) {
            cell.alignment = { horizontal: 'right' };
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
          cell.alignment = { horizontal: 'right' };
        }
      }
      
      // SHEET 2: Procedures & Logs
      const sheet2 = workbook.addWorksheet('Procedures & Logs');
      sheet2.views = [{ showGridLines: true }];
      sheet2.columns = [
        { header: 'Clinical Metric / Nursing Log', key: 'metric', width: 45 },
        { header: 'Value / Assignee', key: 'value', width: 35 }
      ];
      
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
        
        sheet2.addRow({
          metric: mName,
          value: numVal
        });
        
        const r = sheet2.getRow(currentRow2);
        r.height = 22;
        
        const c1 = r.getCell(1);
        c1.font = { name: 'Calibri', size: 10, bold: true };
        c1.border = { bottom: { style: 'thin', color: { argb: 'E2E8F0' } } };
        
        const c2 = r.getCell(2);
        c2.font = { name: 'Calibri', size: 10 };
        c2.border = { bottom: { style: 'thin', color: { argb: 'E2E8F0' } } };
        if (!isNameInput) {
          c2.alignment = { horizontal: 'right' };
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

  // Premium Client-Side Excel Export for Monthly Matrix
  const handleExportMonthlyXlsx = async () => {
    try {
      if (!monthlyData) {
        toast.error("No monthly matrix dataset is loaded.");
        return;
      }
      
      toast.loading("Generating monthly Excel matrix workbook...", { id: 'excel-toast' });
      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      
      const sheet = workbook.addWorksheet('Monthly Matrix');
      sheet.views = [{ showGridLines: true }];
      
      // Configure dynamic columns
      const days = getDaysArray();
      const columns = [
        { header: 'Staff Specialist', key: 'name', width: 28 },
        { header: 'Specialty / Department', key: 'dept', width: 24 }
      ];
      days.forEach(day => {
        columns.push({ header: String(day), key: `day_${day}`, width: 6 });
      });
      columns.push({ header: 'TOTAL', key: 'total', width: 12 });
      sheet.columns = columns;
      
      const totalCols = 2 + days.length + 1;
      
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
      
      // Providers Row Insertion
      config.providers.forEach(provider => {
        const deptName = provider.department_name || 'OTHER';
        const rowData = {
          name: provider.name,
          dept: deptName
        };
        
        days.forEach(day => {
          const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const record = monthlyData.metrics.find(m => m.provider_id === provider.id && m.report_date === dateStr);
          rowData[`day_${day}`] = record ? record.patient_count : 0;
        });
        
        const startColLetter = sheet.getColumn(3).letter;
        const endColLetter = sheet.getColumn(2 + days.length).letter;
        
        const r = sheet.addRow(rowData);
        r.height = 20;
        
        // Dynamic Excel Formula for Row SUM
        r.getCell(totalCols).value = { formula: `=SUM(${startColLetter}${currentRow}:${endColLetter}${currentRow})` };
        
        for (let col = 1; col <= totalCols; col++) {
          const cell = r.getCell(col);
          cell.font = { name: 'Calibri', size: 10 };
          cell.border = { bottom: { style: 'thin', color: { argb: 'E2E8F0' } } };
          if (col > 2) {
            cell.alignment = { horizontal: 'center' };
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
      
      const endRowProviders = currentRow - 1;
      
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
      
      // Procedure Rows Insertion
      config.defaultProcedureMetrics.forEach(metricName => {
        const isNameInput = metricName.toLowerCase().includes('assistant');
        const rowData = {
          name: metricName,
          dept: 'PROCEDURES'
        };
        
        days.forEach(day => {
          const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const record = monthlyData.logs.find(l => l.metric_name === metricName && l.report_date === dateStr);
          const val = record ? record.metric_value : '0';
          rowData[`day_${day}`] = isNameInput ? val : (parseInt(val, 10) || 0);
        });
        
        const startColLetter = sheet.getColumn(3).letter;
        const endColLetter = sheet.getColumn(2 + days.length).letter;
        
        const r = sheet.addRow(rowData);
        r.height = 20;
        
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
            cell.alignment = { horizontal: 'center' };
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
      
      // Bottom Total row using SUM columns formula dynamically
      const totalSumRow = sheet.getRow(currentRow);
      totalSumRow.height = 26;
      totalSumRow.getCell(1).value = 'TOTAL COMPLETED PATIENTS';
      sheet.mergeCells(currentRow, 1, currentRow, 2);
      
      for (let d = 1; d <= days.length; d++) {
        const colIndex = 2 + d;
        const colLetter = sheet.getColumn(colIndex).letter;
        totalSumRow.getCell(colIndex).value = { formula: `=SUM(${colLetter}${startRowProviders}:${colLetter}${endRowProviders})` };
      }
      
      const totalColLetter = sheet.getColumn(totalCols).letter;
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
          cell.alignment = { horizontal: 'center' };
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
            className={`flex-1 lg:flex-none px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 ${
              activeTab === 'daily'
                ? 'bg-gradient-to-r from-sky-500 to-sky-600 text-white shadow-md shadow-sky-500/20'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
            }`}
          >
            <CalendarDays size={15} /> Daily Summaries
          </button>
          <button
            onClick={() => setActiveTab('monthly')}
            className={`flex-1 lg:flex-none px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 ${
              activeTab === 'monthly'
                ? 'bg-gradient-to-r from-sky-500 to-sky-600 text-white shadow-md shadow-sky-500/20'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
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
                onClick={handleDownloadPdf}
                className="flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-sky-500 to-sky-600 text-white rounded-2xl text-xs font-bold uppercase tracking-wider hover:opacity-90 shadow-lg shadow-sky-500/20 active:scale-95 transition"
              >
                <Download size={15} /> Download PDF
              </button>

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

                    return (
                      <div key={deptName} className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:border-sky-500/30 transition-all duration-300">
                        
                        {/* Dept Header */}
                        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                          <span className="text-xs font-black text-slate-800 uppercase tracking-wider">{deptName}</span>
                          <span className="text-[10px] font-black px-2.5 py-1 bg-sky-50 text-sky-600 rounded-full border border-sky-100">
                            {deptTotal} PATIENTS
                          </span>
                        </div>

                        {/* Providers Grid */}
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                          {providers.map(provider => {
                            const count = dailyMetrics[provider.id] || 0;
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

                                <span className={`text-xs font-black font-mono px-3 py-1.5 rounded-xl border ${
                                  count > 0 
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                                    : 'bg-slate-100 text-slate-400 border-slate-200/60'
                                }`}>
                                  {count} Patients
                                </span>
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
                        
                        <span className={`text-xs font-bold px-3 py-1.5 rounded-xl border ${
                          isNameInput
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
          </div>

        </div>
      )}

      {/* ────────────────── MONTHLY MATRIX EXPLORER TAB ────────────────── */}
      {!loading && activeTab === 'monthly' && (
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
                onClick={handleDownloadPdf}
                className="flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-sky-500 to-sky-600 text-white rounded-2xl text-xs font-bold uppercase tracking-wider hover:opacity-90 shadow-lg shadow-sky-500/20 active:scale-95 transition w-full md:w-auto"
              >
                <Download size={15} /> Download PDF
              </button>

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
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-3.5 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search staff, specialties, logs..."
                value={monthlySearchQuery}
                onChange={(e) => setMonthlySearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-850 placeholder-slate-450 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="text-slate-400" size={16} />
              <select
                value={monthlyDeptFilter}
                onChange={(e) => setMonthlyDeptFilter(e.target.value)}
                className="w-full sm:w-60 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-3 text-xs font-bold text-slate-850 focus:outline-none"
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
                                      <span className={`${
                                        isNameInput 
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
      )}

    </div>
  );
}
