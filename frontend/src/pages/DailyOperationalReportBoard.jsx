import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  X,
  ChevronDown,
  ChevronUp,
  PieChart,
  Layers
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
  const [selectedLog, setSelectedLog] = useState(null); // specific log for modal

  // Per-item consumption summary for the selected date: only items actually
  // consumed, split by session (AM/PM) and ward (Station 1 / Minor), with all
  // contributing users. Mirrors the Daily Stock Checkup → Stock Changes view.
  const consumptionSummary = useMemo(() => {
    const map = new Map();
    for (const l of stockLogs) {
      const stnD = (Number(l.new_consumed_obs1) || 0) - (Number(l.old_consumed_obs1) || 0);
      const minD = (Number(l.new_consumed_minor) || 0) - (Number(l.old_consumed_minor) || 0);
      const consD = (Number(l.new_consumed) || 0) - (Number(l.old_consumed) || 0);
      if (stnD <= 0 && minD <= 0 && consD <= 0) continue;
      const isPM = String(l.session || '').toUpperCase() === 'PM';
      let it = map.get(l.item_name);
      if (!it) { it = { item_name: l.item_name, amStn: 0, amMin: 0, pmStn: 0, pmMin: 0, users: new Set(), lastStock: 0, lastBalance: 0, latest: 0 }; map.set(l.item_name, it); }
      if (isPM) { it.pmStn += stnD; it.pmMin += minD; } else { it.amStn += stnD; it.amMin += minD; }
      if (l.updated_by) it.users.add(l.updated_by);
      const t = new Date(l.updated_at).getTime();
      if (t >= it.latest) { it.latest = t; it.lastStock = Number(l.new_stock) || 0; it.lastBalance = (Number(l.new_stock) || 0) - (Number(l.new_consumed) || 0); }
    }
    return [...map.values()]
      .map(it => ({ ...it, total: it.amStn + it.amMin + it.pmStn + it.pmMin, users: [...it.users] }))
      .filter(it => it.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [stockLogs]);
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [dailyMetricMode, setDailyMetricMode] = useState('both'); // 'both' | 'consultation' | 'followup'

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
          const sorted = [...(res.data.data.providers || [])].sort((a, b) => {
            const getSpecializationRank = (spec) => {
              const s = (spec || '').toLowerCase();
              if (s.includes('physio')) return 4;
              if (s.includes('psycholog')) return 3;
              if (s.includes('dental') || s.includes('dentist') || s.includes('orthodont')) return 2;
              return 1; // Doctors on top
            };
            const rankA = getSpecializationRank(a.specialization_name || a.specialization || 'Other');
            const rankB = getSpecializationRank(b.specialization_name || b.specialization || 'Other');
            if (rankA !== rankB) return rankA - rankB;
            // secondary sort: specialization/dept name
            const specA = a.specialization_name || a.specialization || '';
            const specB = b.specialization_name || b.specialization || '';
            if (specA !== specB) return specA.localeCompare(specB);
            // tertiary sort: provider name
            return a.name.localeCompare(b.name);
          });
          setConfig({ ...res.data.data, providers: sorted });
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

  // Group providers by specialization
  const providersByDept = config.providers.reduce((acc, p) => {
    const specName = p.specialization_name || p.specialization || 'Other';
    if (!acc[specName]) acc[specName] = [];
    acc[specName].push(p);
    return acc;
  }, {});

  const getSpecializationRank = (spec) => {
    const s = (spec || '').toLowerCase();
    if (s.includes('physio')) return 4;
    if (s.includes('psycholog')) return 3;
    if (s.includes('dental') || s.includes('dentist') || s.includes('orthodont')) return 2;
    return 1; // Doctors on top
  };

  const sortedSpecializations = Object.keys(providersByDept).sort((a, b) => {
    const rankA = getSpecializationRank(a);
    const rankB = getSpecializationRank(b);
    if (rankA !== rankB) return rankA - rankB;
    return a.localeCompare(b);
  });


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

      const specName = p.specialization_name || p.specialization || 'Other';
      // Combined: consultations + follow-ups for top dept ranking
      deptTotals[specName] = (deptTotals[specName] || 0) + count + followUp;
      if (deptTotals[specName] > maxDeptCount) {
        maxDeptCount = deptTotals[specName];
        maxDeptName = specName;
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
    return sortedSpecializations.filter(dept => {
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
      workbook.creator = 'Legacy Clinics & Diagnostics';
      workbook.lastModifiedBy = user?.full_name || 'System User';
      workbook.created = new Date();

      const isBoth = dailyMetricMode === 'both';
      const isFollowUpOnly = dailyMetricMode === 'followup';
      const modeText = isBoth ? 'CONSULTATIONS & FOLLOW-UPS' : isFollowUpOnly ? 'FOLLOW-UPS' : 'CONSULTATIONS';

      const filteredProviders = config.providers.filter(p => {
        const specName = p.specialization_name || p.specialization || 'Other';
        if (dailyDeptFilter !== 'ALL' && specName !== dailyDeptFilter) return false;
        if (dailySearchQuery.trim() !== '') {
          const query = dailySearchQuery.toLowerCase();
          return p.name.toLowerCase().includes(query) || specName.toLowerCase().includes(query);
        }
        return true;
      });

      // Calculate dynamic column widths
      let maxNameWidth = 28;
      let maxSpecWidth = 24;
      filteredProviders.forEach(p => {
        if (p.name && p.name.length > maxNameWidth) maxNameWidth = p.name.length;
        const spec = p.specialization_name || p.specialization || 'Other';
        if (spec.length > maxSpecWidth) maxSpecWidth = spec.length;
      });

      // SHEET 1: Institutional Daily Operational Matrix
      const matrixSheet = workbook.addWorksheet('Daily Matrix');
      matrixSheet.views = [{ showGridLines: true, state: 'frozen', xSplit: 2, ySplit: 4 }];

      matrixSheet.getColumn(1).width = Math.min(maxNameWidth + 4, 50);
      matrixSheet.getColumn(2).width = Math.min(maxSpecWidth + 4, 38);
      matrixSheet.getColumn(3).width = 16; // Day Column
      matrixSheet.getColumn(4).width = 14; // TOTAL

      const mTitleCell = matrixSheet.getCell('A1');
      mTitleCell.value = 'LEGACY CLINICS & DIAGNOSTICS';
      matrixSheet.mergeCells('A1:D1');
      mTitleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFF' } };
      mTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1B365D' } };
      mTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      matrixSheet.getRow(1).height = 36;

      const mSubCell = matrixSheet.getCell('A2');
      mSubCell.value = isBoth
        ? `INSTITUTIONAL DAILY OPERATIONAL MATRIX - Total Completed (Walk-ins and Follow-Ups) (Period: ${selectedDate})`
        : `INSTITUTIONAL DAILY OPERATIONAL MATRIX (Period: ${selectedDate})`;
      matrixSheet.mergeCells('A2:D2');
      mSubCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFF' } };
      mSubCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4A90E2' } };
      mSubCell.alignment = { horizontal: 'center', vertical: 'middle' };
      matrixSheet.getRow(2).height = 26;

      const mMetaCell = matrixSheet.getCell('A3');
      mMetaCell.value = `Report Extracted: ${new Date().toLocaleString()} | Mode: ${modeText} | Filter: ${dailyDeptFilter}`;
      matrixSheet.mergeCells('A3:D3');
      mMetaCell.font = { name: 'Calibri', size: 9, italic: true, color: { argb: '475569' } };
      mMetaCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F8FAFC' } };
      mMetaCell.alignment = { horizontal: 'center', vertical: 'middle' };
      matrixSheet.getRow(3).height = 20;

      const mHeaderRow = matrixSheet.getRow(4);
      mHeaderRow.height = 28;
      mHeaderRow.getCell(1).value = 'Staff Specialist';
      mHeaderRow.getCell(2).value = 'Specialty / Department';
      mHeaderRow.getCell(3).value = `Day 1 (${selectedDate})`;
      mHeaderRow.getCell(4).value = 'TOTAL';

      for (let c = 1; c <= 4; c++) {
        const cell = mHeaderRow.getCell(c);
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

      let mCurrentRow = 5;
      const mStartRowProviders = 5;
      const consultRowIndices = [];
      const followUpRowIndices = [];
      const providerTotalRowIndices = [];

      filteredProviders.forEach(provider => {
        const specName = provider.specialization_name || provider.specialization || 'Other';
        const count = dailyMetrics[provider.id] || 0;
        const followUp = dailyFollowUps[provider.id] || 0;

        if (isBoth) {
          // Row 1: Consultations (Walk-ins)
          const r1 = matrixSheet.getRow(mCurrentRow);
          const r1Index = mCurrentRow;
          consultRowIndices.push(r1Index);
          r1.height = 21;
          r1.getCell(1).value = provider.name;
          r1.getCell(2).value = specName;
          r1.getCell(3).value = count;
          r1.getCell(4).value = { formula: `=SUM(C${r1Index}:C${r1Index})` };

          for (let col = 1; col <= 4; col++) {
            const cell = r1.getCell(col);
            cell.font = { name: 'Calibri', size: 10 };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF' } };
            cell.border = { bottom: { style: 'thin', color: { argb: 'E2E8F0' } } };
            if (col > 2) {
              cell.alignment = { horizontal: 'center', vertical: 'middle' };
              cell.numFmt = '#,##0';
              if (col === 4) {
                cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: '1B365D' } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F2F7FD' } };
              } else if (count > 0) {
                cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: '107C41' } };
              } else {
                cell.font = { name: 'Calibri', size: 10, color: { argb: '94A3B8' } };
                cell.value = 0;
              }
            }
          }
          mCurrentRow++;

          // Row 2: Follow-up (Smaller row beneath Consultations)
          const r2 = matrixSheet.getRow(mCurrentRow);
          const r2Index = mCurrentRow;
          followUpRowIndices.push(r2Index);
          r2.height = 17;
          r2.getCell(1).value = '   ↳ Follow-Up';
          r2.getCell(2).value = 'Follow-Up';
          r2.getCell(3).value = followUp;
          r2.getCell(4).value = { formula: `=SUM(C${r2Index}:C${r2Index})` };

          for (let col = 1; col <= 4; col++) {
            const cell = r2.getCell(col);
            cell.font = { name: 'Calibri', size: 9, italic: true };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F0FDFA' } };
            cell.border = { bottom: { style: 'thin', color: { argb: 'CCFBF1' } } };
            if (col > 2) {
              cell.alignment = { horizontal: 'center', vertical: 'middle' };
              cell.numFmt = '#,##0';
              if (col === 4) {
                cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: '0F766E' } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E6FFFA' } };
              } else if (followUp > 0) {
                cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: '0D9488' } };
              } else {
                cell.font = { name: 'Calibri', size: 9, color: { argb: '94A3B8' } };
                cell.value = 0;
              }
            }
          }
          mCurrentRow++;

          // Row 3: Total (Summation of both for provider)
          const r3 = matrixSheet.getRow(mCurrentRow);
          const r3Index = mCurrentRow;
          providerTotalRowIndices.push(r3Index);
          r3.height = 20;
          r3.getCell(1).value = '   Total (Walk-ins & Follow-ups)';
          r3.getCell(2).value = 'Total';
          r3.getCell(3).value = { formula: `=C${r1Index}+C${r2Index}` };
          r3.getCell(4).value = { formula: `=D${r1Index}+D${r2Index}` };

          for (let col = 1; col <= 4; col++) {
            const cell = r3.getCell(col);
            cell.font = { name: 'Calibri', size: 10, bold: true };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F5F9' } };
            cell.border = { bottom: { style: 'medium', color: { argb: 'CBD5E1' } } };
            if (col > 2) {
              cell.alignment = { horizontal: 'center', vertical: 'middle' };
              cell.numFmt = '#,##0';
              if (col === 4) {
                cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: '1B365D' } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E2E8F0' } };
              }
            }
          }
          mCurrentRow++;

        } else {
          // Single row per provider (consultation only OR followup only)
          const r = matrixSheet.getRow(mCurrentRow);
          r.height = 21;
          r.getCell(1).value = provider.name;
          r.getCell(2).value = specName;

          const val = isFollowUpOnly ? followUp : count;
          r.getCell(3).value = val;
          r.getCell(4).value = { formula: `=SUM(C${mCurrentRow}:C${mCurrentRow})` };

          const rowBg = mCurrentRow % 2 === 0 ? 'F9FAFB' : 'FFFFFF';
          for (let col = 1; col <= 4; col++) {
            const cell = r.getCell(col);
            cell.font = { name: 'Calibri', size: 10 };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
            cell.border = { bottom: { style: 'thin', color: { argb: 'E2E8F0' } } };
            if (col > 2) {
              cell.alignment = { horizontal: 'center', vertical: 'middle' };
              cell.numFmt = '#,##0';
              if (col === 4) {
                cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: '1B365D' } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F2F7FD' } };
              } else if (val > 0) {
                cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: '107C41' } };
              } else {
                cell.font = { name: 'Calibri', size: 10, color: { argb: '94A3B8' } };
                cell.value = 0;
              }
            }
          }
          mCurrentRow++;
        }
      });

      const mEndRowProviders = Math.max(mStartRowProviders, mCurrentRow - 1);

      // Section Divider
      const mDividerRow = matrixSheet.getRow(mCurrentRow);
      mDividerRow.height = 24;
      mDividerRow.getCell(1).value = 'NURSING AND WARD PROCEDURES';
      matrixSheet.mergeCells(mCurrentRow, 1, mCurrentRow, 4);
      for (let c = 1; c <= 4; c++) {
        const cell = mDividerRow.getCell(c);
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: '1B365D' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EBF3FD' } };
        cell.border = { bottom: { style: 'thin', color: { argb: 'CAD9EA' } } };
      }
      mCurrentRow++;

      const mStartRowProcedures = mCurrentRow;
      const filteredProcedures = config.defaultProcedureMetrics.filter(metricName => {
        if (dailyDeptFilter !== 'ALL') return false;
        if (dailySearchQuery.trim() !== '') {
          return metricName.toLowerCase().includes(dailySearchQuery.toLowerCase());
        }
        return true;
      });

      filteredProcedures.forEach(metricName => {
        const isNameInput = metricName.toLowerCase().includes('assistant');
        const rawVal = dailyLogs[metricName] || '0';
        const numVal = isNameInput ? rawVal : (parseInt(rawVal, 10) || 0);

        const r = matrixSheet.getRow(mCurrentRow);
        r.height = 21;
        r.getCell(1).value = metricName;
        r.getCell(2).value = 'PROCEDURES';
        r.getCell(3).value = numVal;

        if (!isNameInput) {
          r.getCell(4).value = { formula: `=SUM(C${mCurrentRow}:C${mCurrentRow})` };
        } else {
          r.getCell(4).value = 'N/A';
        }

        const rowBg = mCurrentRow % 2 === 0 ? 'F9FAFB' : 'FFFFFF';
        for (let col = 1; col <= 4; col++) {
          const cell = r.getCell(col);
          cell.font = { name: 'Calibri', size: 10 };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
          cell.border = { bottom: { style: 'thin', color: { argb: 'E2E8F0' } } };
          if (col > 2) {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            const v = cell.value;
            if (col === 4) {
              cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: '555555' } };
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F5F5F5' } };
            } else if (isNameInput) {
              cell.font = { name: 'Calibri', size: 9, italic: true };
              if (v === '0' || v === '') {
                cell.value = '';
                cell.font = { name: 'Calibri', size: 10, color: { argb: '94A3B8' } };
              }
            } else if (typeof v === 'number' && v > 0) {
              cell.font = { name: 'Calibri', size: 10, bold: true };
              cell.numFmt = '#,##0';
            } else if (v === 0) {
              cell.value = 0;
              cell.font = { name: 'Calibri', size: 10, color: { argb: '94A3B8' } };
              cell.numFmt = '#,##0';
            }
          }
        }
        mCurrentRow++;
      });

      // Bottom Total Summary Rows
      if (isBoth) {
        // Row 1: TOTAL CONSULTATIONS (WALK-INS)
        const rowConsultSum = matrixSheet.getRow(mCurrentRow);
        const rConsultIndex = mCurrentRow;
        rowConsultSum.height = 24;
        rowConsultSum.getCell(1).value = 'TOTAL CONSULTATIONS (WALK-INS)';
        matrixSheet.mergeCells(mCurrentRow, 1, mCurrentRow, 2);

        const cFormula = consultRowIndices.length > 0 ? `=SUM(${consultRowIndices.map(i => `C${i}`).join(',')})` : '=0';
        const dFormula = consultRowIndices.length > 0 ? `=SUM(${consultRowIndices.map(i => `D${i}`).join(',')})` : '=0';
        rowConsultSum.getCell(3).value = { formula: cFormula };
        rowConsultSum.getCell(4).value = { formula: dFormula };

        for (let col = 1; col <= 4; col++) {
          const cell = rowConsultSum.getCell(col);
          cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: '1B365D' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EBF3FD' } };
          cell.border = { top: { style: 'thin', color: { argb: 'CAD9EA' } }, bottom: { style: 'thin', color: { argb: 'CAD9EA' } } };
          if (col > 2) {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.numFmt = '#,##0';
          }
        }
        mCurrentRow++;

        // Row 2: TOTAL FOLLOW-UPS (Smaller row)
        const rowFollowSum = matrixSheet.getRow(mCurrentRow);
        const rFollowIndex = mCurrentRow;
        rowFollowSum.height = 22;
        rowFollowSum.getCell(1).value = 'TOTAL FOLLOW-UPS';
        matrixSheet.mergeCells(mCurrentRow, 1, mCurrentRow, 2);

        const cFollowFormula = followUpRowIndices.length > 0 ? `=SUM(${followUpRowIndices.map(i => `C${i}`).join(',')})` : '=0';
        const dFollowFormula = followUpRowIndices.length > 0 ? `=SUM(${followUpRowIndices.map(i => `D${i}`).join(',')})` : '=0';
        rowFollowSum.getCell(3).value = { formula: cFollowFormula };
        rowFollowSum.getCell(4).value = { formula: dFollowFormula };

        for (let col = 1; col <= 4; col++) {
          const cell = rowFollowSum.getCell(col);
          cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: '0F766E' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F0FDFA' } };
          cell.border = { bottom: { style: 'thin', color: { argb: 'CCFBF1' } } };
          if (col > 2) {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.numFmt = '#,##0';
          }
        }
        mCurrentRow++;

        // Row 3: Total Completed (Walk-ins and Follow-Ups)
        const mTotalSumRow = matrixSheet.getRow(mCurrentRow);
        mTotalSumRow.height = 28;
        mTotalSumRow.getCell(1).value = 'Total Completed (Walk-ins and Follow-Ups)';
        matrixSheet.mergeCells(mCurrentRow, 1, mCurrentRow, 2);

        mTotalSumRow.getCell(3).value = { formula: `=C${rConsultIndex}+C${rFollowIndex}` };
        mTotalSumRow.getCell(4).value = { formula: `=D${rConsultIndex}+D${rFollowIndex}` };

        for (let col = 1; col <= 4; col++) {
          const cell = mTotalSumRow.getCell(col);
          cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFF' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1B365D' } };
          cell.border = {
            top: { style: 'medium', color: { argb: '1B365D' } },
            bottom: { style: 'double', color: { argb: '1B365D' } }
          };
          if (col > 2) {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.numFmt = '#,##0';
            if (col === 4) {
              cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: '00FF00' } };
            }
          }
        }
      } else {
        const mTotalSumRow = matrixSheet.getRow(mCurrentRow);
        mTotalSumRow.height = 28;
        mTotalSumRow.getCell(1).value = isFollowUpOnly ? 'TOTAL FOLLOW-UPS' : 'TOTAL COMPLETED (WALK-INS)';
        matrixSheet.mergeCells(mCurrentRow, 1, mCurrentRow, 2);

        mTotalSumRow.getCell(3).value = { formula: `=SUM(C${mStartRowProviders}:C${mEndRowProviders})` };
        mTotalSumRow.getCell(4).value = { formula: `=SUM(D${mStartRowProviders}:D${mEndRowProviders})` };

        for (let col = 1; col <= 4; col++) {
          const cell = mTotalSumRow.getCell(col);
          cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFF' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1B365D' } };
          cell.border = {
            top: { style: 'medium', color: { argb: '1B365D' } },
            bottom: { style: 'double', color: { argb: '1B365D' } }
          };
          if (col > 2) {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.numFmt = '#,##0';
            if (col === 4) {
              cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: '00FF00' } };
            }
          }
        }
      }

      // SHEET 2: Outpatient Summary
      const sheet1 = workbook.addWorksheet('Outpatient Summary');
      sheet1.views = [{ showGridLines: true, state: 'frozen', ySplit: 7 }];

      sheet1.getColumn(1).width = Math.min(maxNameWidth + 4, 50);
      sheet1.getColumn(2).width = 22;
      sheet1.getColumn(3).width = Math.min(maxSpecWidth + 4, 38);
      if (isBoth) {
        sheet1.getColumn(4).width = 18;
        sheet1.getColumn(5).width = 18;
        sheet1.getColumn(6).width = 18;
      } else {
        sheet1.getColumn(4).width = 22;
      }

      const endColLetter = isBoth ? 'F' : 'D';
      const endColIndex = isBoth ? 6 : 4;

      // Header Block (Corporate Navy Blue Theme)
      const titleCell = sheet1.getCell('A1');
      titleCell.value = 'LEGACY CLINICS & DIAGNOSTICS';
      sheet1.mergeCells(`A1:${endColLetter}1`);
      titleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1B365D' } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      sheet1.getRow(1).height = 36;

      const subCell = sheet1.getCell('A2');
      subCell.value = `DAILY OUTPATIENT ${modeText} REPORT`;
      sheet1.mergeCells(`A2:${endColLetter}2`);
      subCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFF' } };
      subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4A90E2' } };
      subCell.alignment = { horizontal: 'center', vertical: 'middle' };
      sheet1.getRow(2).height = 26;

      const dateCell = sheet1.getCell('A3');
      dateCell.value = `Report Date: ${selectedDate} | Mode: ${modeText}`;
      sheet1.mergeCells(`A3:${endColLetter}3`);
      dateCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: '555555' } };
      dateCell.alignment = { horizontal: 'center', vertical: 'middle' };
      sheet1.getRow(3).height = 20;

      sheet1.getRow(4).height = 10;

      // KPI Cards Block (Row 5-6)
      sheet1.getCell('A5').value = 'Outpatients Seen';
      sheet1.getCell('A6').value = kpis.totalPatients + kpis.totalFollowUps;

      sheet1.getCell('B5').value = 'Top Specialty Department';
      sheet1.getCell('B6').value = `${kpis.maxDeptName} (${kpis.maxDeptCount})`;

      sheet1.getCell('C5').value = 'Total Clinical Logs';
      sheet1.getCell('C6').value = kpis.procedureCount;

      if (isBoth) {
        sheet1.mergeCells('C5:F5');
        sheet1.mergeCells('C6:F6');
      } else {
        sheet1.mergeCells('C5:D5');
        sheet1.mergeCells('C6:D6');
      }

      ['A5', 'B5', 'C5'].forEach(cellRef => {
        const c = sheet1.getCell(cellRef);
        c.font = { name: 'Calibri', size: 9, bold: true, color: { argb: '475569' } };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F5F9' } };
        c.alignment = { horizontal: 'center', vertical: 'middle' };
      });

      ['A6', 'B6', 'C6'].forEach(cellRef => {
        const c = sheet1.getCell(cellRef);
        c.font = { name: 'Calibri', size: 12, bold: true, color: { argb: '1B365D' } };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F5F9' } };
        c.alignment = { horizontal: 'center', vertical: 'middle' };
      });

      const kpiBorder = {
        top: { style: 'thin', color: { argb: 'CBD5E1' } },
        bottom: { style: 'thin', color: { argb: 'CBD5E1' } },
        left: { style: 'thin', color: { argb: 'CBD5E1' } },
        right: { style: 'thin', color: { argb: 'CBD5E1' } }
      };
      for (let r = 5; r <= 6; r++) {
        for (let c = 1; c <= endColIndex; c++) {
          sheet1.getCell(r, c).border = kpiBorder;
        }
      }

      // Table Header Row 8
      const headerRow = sheet1.getRow(8);
      headerRow.height = 26;
      headerRow.getCell(1).value = 'Staff Specialist';
      headerRow.getCell(2).value = 'Title / Role';
      headerRow.getCell(3).value = 'Specialty Department';
      if (isBoth) {
        headerRow.getCell(4).value = 'Consultations (C)';
        headerRow.getCell(5).value = 'Follow-Ups (F)';
        headerRow.getCell(6).value = 'Total Outpatients';
      } else if (isFollowUpOnly) {
        headerRow.getCell(4).value = 'Follow-Ups (F)';
      } else {
        headerRow.getCell(4).value = 'Consultations (C)';
      }

      for (let c = 1; c <= endColIndex; c++) {
        const cell = headerRow.getCell(c);
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1B365D' } };
        cell.alignment = { horizontal: c >= 4 ? 'right' : 'left', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin', color: { argb: '1B365D' } },
          bottom: { style: 'medium', color: { argb: '1B365D' } }
        };
      }

      let currentRow = 9;
      config.providers.forEach(p => {
        const count = dailyMetrics[p.id] || 0;
        const followUp = dailyFollowUps[p.id] || 0;
        const r = sheet1.getRow(currentRow);
        r.height = 21;
        r.getCell(1).value = p.name;
        r.getCell(2).value = p.title || 'Specialist';
        r.getCell(3).value = p.specialization_name || p.specialization || 'Other';
        
        if (isBoth) {
          r.getCell(4).value = count;
          r.getCell(5).value = followUp;
          r.getCell(6).value = { formula: `=SUM(D${currentRow}:E${currentRow})` };
        } else if (isFollowUpOnly) {
          r.getCell(4).value = followUp;
        } else {
          r.getCell(4).value = count;
        }

        const rowBg = currentRow % 2 === 0 ? 'F9FAFB' : 'FFFFFF';
        for (let col = 1; col <= endColIndex; col++) {
          const cell = r.getCell(col);
          cell.font = { name: 'Calibri', size: 10 };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
          cell.border = { bottom: { style: 'thin', color: { argb: 'E2E8F0' } } };
          if (col >= 4) {
            cell.alignment = { horizontal: 'right', vertical: 'middle' };
            cell.numFmt = '#,##0';
            const numVal = typeof cell.value === 'object' ? null : cell.value;
            if (numVal > 0) {
              cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: '107C41' } };
            }
          }
        }
        currentRow++;
      });

      // Total Row with dynamic SUM formula
      const totalRow = sheet1.getRow(currentRow);
      totalRow.height = 26;
      totalRow.getCell(1).value = `TOTAL ${modeText}`;
      sheet1.mergeCells(`A${currentRow}:C${currentRow}`);
      
      if (isBoth) {
        totalRow.getCell(4).value = { formula: `=SUM(D9:D${currentRow - 1})` };
        totalRow.getCell(5).value = { formula: `=SUM(E9:E${currentRow - 1})` };
        totalRow.getCell(6).value = { formula: `=SUM(F9:F${currentRow - 1})` };
      } else {
        totalRow.getCell(4).value = { formula: `=SUM(D9:D${currentRow - 1})` };
      }

      for (let col = 1; col <= endColIndex; col++) {
        const cell = totalRow.getCell(col);
        cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: '1B365D' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'ECF2F9' } };
        cell.border = {
          top: { style: 'medium', color: { argb: '1B365D' } },
          bottom: { style: 'double', color: { argb: '1B365D' } }
        };
        if (col >= 4) {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          cell.numFmt = '#,##0';
        }
      }

      // SHEET 3: Procedures & Logs
      const sheet2 = workbook.addWorksheet('Procedures & Logs');
      sheet2.views = [{ showGridLines: true, state: 'frozen', ySplit: 4 }];

      sheet2.getColumn(1).width = 48;
      sheet2.getColumn(2).width = 36;

      // Title
      const titleCell2 = sheet2.getCell('A1');
      titleCell2.value = 'LEGACY CLINICS & DIAGNOSTICS';
      sheet2.mergeCells('A1:B1');
      titleCell2.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFF' } };
      titleCell2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1B365D' } };
      titleCell2.alignment = { horizontal: 'center', vertical: 'middle' };
      sheet2.getRow(1).height = 36;

      const subCell2 = sheet2.getCell('A2');
      subCell2.value = `DAILY OPERATIONAL PROCEDURES & LOGS (${selectedDate})`;
      sheet2.mergeCells('A2:B2');
      subCell2.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFF' } };
      subCell2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4A90E2' } };
      subCell2.alignment = { horizontal: 'center', vertical: 'middle' };
      sheet2.getRow(2).height = 26;

      sheet2.getRow(3).height = 15;

      const headerRow2 = sheet2.getRow(4);
      headerRow2.height = 26;
      headerRow2.getCell(1).value = 'Clinical Metric / Nursing Log';
      headerRow2.getCell(2).value = 'Value / Assignee';

      for (let c = 1; c <= 2; c++) {
        const cell = headerRow2.getCell(c);
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFF' } };
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

        const rowBg = currentRow2 % 2 === 0 ? 'F9FAFB' : 'FFFFFF';
        const c1 = r.getCell(1);
        c1.font = { name: 'Calibri', size: 10, bold: true };
        c1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
        c1.border = { bottom: { style: 'thin', color: { argb: 'E2E8F0' } } };

        const c2 = r.getCell(2);
        c2.font = { name: 'Calibri', size: 10 };
        c2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
        c2.border = { bottom: { style: 'thin', color: { argb: 'E2E8F0' } } };
        if (!isNameInput) {
          c2.alignment = { horizontal: 'right', vertical: 'middle' };
          c2.font = { name: 'Calibri', size: 10, bold: true, color: { argb: '1B365D' } };
          c2.numFmt = '#,##0';
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
      workbook.creator = 'Legacy Clinics & Diagnostics';
      workbook.lastModifiedBy = user?.full_name || 'System User';
      workbook.created = new Date();

      const days = getWeeklyDaysArray();
      const totalCols = 2 + days.length + 1;

      const filteredProviders = config.providers.filter(p => {
        const specName = p.specialization_name || p.specialization || 'Other';
        if (weeklyDeptFilter !== 'ALL' && specName !== weeklyDeptFilter) return false;
        if (weeklySearchQuery.trim() !== '') {
          const query = weeklySearchQuery.toLowerCase();
          return p.name.toLowerCase().includes(query) || specName.toLowerCase().includes(query);
        }
        return true;
      });

      let maxNameWidth = 28;
      let maxSpecWidth = 24;
      filteredProviders.forEach(p => {
        if (p.name && p.name.length > maxNameWidth) maxNameWidth = p.name.length;
        const spec = p.specialization_name || p.specialization || 'Other';
        if (spec.length > maxSpecWidth) maxSpecWidth = spec.length;
      });

      // SHEET 1: Weekly Matrix
      const sheet = workbook.addWorksheet('Weekly Matrix');
      sheet.views = [{ showGridLines: true, state: 'frozen', xSplit: 2, ySplit: 4 }];

      sheet.getColumn(1).width = Math.min(maxNameWidth + 4, 50);
      sheet.getColumn(2).width = Math.min(maxSpecWidth + 4, 38);
      days.forEach((day, index) => {
        sheet.getColumn(2 + index + 1).width = 14;
      });
      sheet.getColumn(totalCols).width = 14;

      // Title Block
      const titleCell = sheet.getCell('A1');
      titleCell.value = 'LEGACY CLINICS & DIAGNOSTICS';
      sheet.mergeCells(1, 1, 1, totalCols);
      titleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1B365D' } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      sheet.getRow(1).height = 36;

      const subCell = sheet.getCell('A2');
      const { start, end } = getWeekRange(selectedWeekDate);
      const isBoth = weeklyMetricMode === 'both';
      const isFollowUpOnly = weeklyMetricMode === 'followup';
      subCell.value = isBoth
        ? `INSTITUTIONAL WEEKLY OPERATIONAL MATRIX - Total Completed (Walk-ins and Follow-Ups) (Period: ${start} to ${end})`
        : `INSTITUTIONAL WEEKLY OPERATIONAL MATRIX (Period: ${start} to ${end})`;
      sheet.mergeCells(2, 1, 2, totalCols);
      subCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFF' } };
      subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4A90E2' } };
      subCell.alignment = { horizontal: 'center', vertical: 'middle' };
      sheet.getRow(2).height = 26;

      const metaCell = sheet.getCell('A3');
      metaCell.value = `Report Extracted: ${new Date().toLocaleString()} | User: ${user?.full_name || 'System User'} | Mode: ${weeklyMetricMode} | Filter: ${weeklyDeptFilter}`;
      sheet.mergeCells(3, 1, 3, totalCols);
      metaCell.font = { name: 'Calibri', size: 9, italic: true, color: { argb: '475569' } };
      metaCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F8FAFC' } };
      metaCell.alignment = { horizontal: 'center', vertical: 'middle' };
      sheet.getRow(3).height = 20;

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
      const consultRowIndices = [];
      const followUpRowIndices = [];
      const providerTotalRowIndices = [];

      filteredProviders.forEach(provider => {
        const specName = provider.specialization_name || provider.specialization || 'Other';
        const startColLetter = getColumnLetter(3);
        const endColLetter = getColumnLetter(2 + days.length);

        if (isBoth) {
          // Row 1: Consultations (Walk-ins)
          const r1 = sheet.getRow(currentRow);
          const r1Index = currentRow;
          consultRowIndices.push(r1Index);
          r1.height = 21;
          r1.getCell(1).value = provider.name;
          r1.getCell(2).value = specName;

          days.forEach((day, index) => {
            const record = weeklyData.metrics.find(m => m.provider_id === provider.id && m.report_date === day);
            r1.getCell(2 + index + 1).value = record ? (Number(record.patient_count) || 0) : 0;
          });
          r1.getCell(totalCols).value = { formula: `=SUM(${startColLetter}${r1Index}:${endColLetter}${r1Index})` };

          for (let col = 1; col <= totalCols; col++) {
            const cell = r1.getCell(col);
            cell.font = { name: 'Calibri', size: 10 };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF' } };
            cell.border = { bottom: { style: 'thin', color: { argb: 'E2E8F0' } } };
            if (col > 2) {
              cell.alignment = { horizontal: 'center', vertical: 'middle' };
              cell.numFmt = '#,##0';
              const val = cell.value;
              if (col === totalCols) {
                cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: '1B365D' } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F2F7FD' } };
              } else if (typeof val === 'number' && val > 0) {
                cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: '107C41' } };
              } else if (val === 0) {
                cell.font = { name: 'Calibri', size: 10, color: { argb: '94A3B8' } };
                cell.value = 0;
              }
            }
          }
          currentRow++;

          // Row 2: Follow-Up (Smaller row)
          const r2 = sheet.getRow(currentRow);
          const r2Index = currentRow;
          followUpRowIndices.push(r2Index);
          r2.height = 17;
          r2.getCell(1).value = '   ↳ Follow-Up';
          r2.getCell(2).value = 'Follow-Up';

          days.forEach((day, index) => {
            const record = weeklyData.metrics.find(m => m.provider_id === provider.id && m.report_date === day);
            r2.getCell(2 + index + 1).value = record ? (Number(record.follow_up_count) || 0) : 0;
          });
          r2.getCell(totalCols).value = { formula: `=SUM(${startColLetter}${r2Index}:${endColLetter}${r2Index})` };

          for (let col = 1; col <= totalCols; col++) {
            const cell = r2.getCell(col);
            cell.font = { name: 'Calibri', size: 9, italic: true };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F0FDFA' } };
            cell.border = { bottom: { style: 'thin', color: { argb: 'CCFBF1' } } };
            if (col > 2) {
              cell.alignment = { horizontal: 'center', vertical: 'middle' };
              cell.numFmt = '#,##0';
              const val = cell.value;
              if (col === totalCols) {
                cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: '0F766E' } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E6FFFA' } };
              } else if (typeof val === 'number' && val > 0) {
                cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: '0D9488' } };
              } else if (val === 0) {
                cell.font = { name: 'Calibri', size: 9, color: { argb: '94A3B8' } };
                cell.value = 0;
              }
            }
          }
          currentRow++;

          // Row 3: Total Summation of both
          const r3 = sheet.getRow(currentRow);
          const r3Index = currentRow;
          providerTotalRowIndices.push(r3Index);
          r3.height = 20;
          r3.getCell(1).value = '   Total (Walk-ins & Follow-ups)';
          r3.getCell(2).value = 'Total';

          days.forEach((day, index) => {
            const colLetter = getColumnLetter(2 + index + 1);
            r3.getCell(2 + index + 1).value = { formula: `=${colLetter}${r1Index}+${colLetter}${r2Index}` };
          });
          const totalColLetter = getColumnLetter(totalCols);
          r3.getCell(totalCols).value = { formula: `=${totalColLetter}${r1Index}+${totalColLetter}${r2Index}` };

          for (let col = 1; col <= totalCols; col++) {
            const cell = r3.getCell(col);
            cell.font = { name: 'Calibri', size: 10, bold: true };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F5F9' } };
            cell.border = { bottom: { style: 'medium', color: { argb: 'CBD5E1' } } };
            if (col > 2) {
              cell.alignment = { horizontal: 'center', vertical: 'middle' };
              cell.numFmt = '#,##0';
              if (col === totalCols) {
                cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: '1B365D' } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E2E8F0' } };
              }
            }
          }
          currentRow++;

        } else {
          // Single row per provider
          const r = sheet.getRow(currentRow);
          r.height = 21;
          r.getCell(1).value = provider.name;
          r.getCell(2).value = specName;

          days.forEach((day, index) => {
            const record = weeklyData.metrics.find(m => m.provider_id === provider.id && m.report_date === day);
            let val = 0;
            if (record) {
              val = isFollowUpOnly ? (Number(record.follow_up_count) || 0) : (Number(record.patient_count) || 0);
            }
            r.getCell(2 + index + 1).value = val;
          });

          r.getCell(totalCols).value = { formula: `=SUM(${startColLetter}${currentRow}:${endColLetter}${currentRow})` };

          const rowBg = currentRow % 2 === 0 ? 'F9FAFB' : 'FFFFFF';
          for (let col = 1; col <= totalCols; col++) {
            const cell = r.getCell(col);
            cell.font = { name: 'Calibri', size: 10 };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
            cell.border = { bottom: { style: 'thin', color: { argb: 'E2E8F0' } } };
            if (col > 2) {
              cell.alignment = { horizontal: 'center', vertical: 'middle' };
              cell.numFmt = '#,##0';
              const val = cell.value;
              if (col === totalCols) {
                cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: '1B365D' } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F2F7FD' } };
              } else if (typeof val === 'number' && val > 0) {
                cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: '107C41' } };
              } else if (val === 0) {
                cell.font = { name: 'Calibri', size: 10, color: { argb: '94A3B8' } };
                cell.value = 0;
              }
            }
          }
          currentRow++;
        }
      });

      const endRowProviders = Math.max(startRowProviders, currentRow - 1);

      // Section Divider
      const dividerRow = sheet.getRow(currentRow);
      dividerRow.height = 24;
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
        r.height = 21;
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

        const rowBg = currentRow % 2 === 0 ? 'F9FAFB' : 'FFFFFF';
        for (let col = 1; col <= totalCols; col++) {
          const cell = r.getCell(col);
          cell.font = { name: 'Calibri', size: 10 };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
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
                cell.value = '';
                cell.font = { name: 'Calibri', size: 10, color: { argb: '94A3B8' } };
              }
            } else if (typeof val === 'number' && val > 0) {
              cell.font = { name: 'Calibri', size: 10, bold: true };
              cell.numFmt = '#,##0';
            } else if (val === 0) {
              cell.value = 0;
              cell.font = { name: 'Calibri', size: 10, color: { argb: '94A3B8' } };
              cell.numFmt = '#,##0';
            }
          }
        }
        currentRow++;
      });

      const endRowProcedures = Math.max(startRowProcedures, currentRow - 1);

      // Bottom Total Rows
      if (isBoth) {
        // Row 1: TOTAL CONSULTATIONS (WALK-INS)
        const rowConsultSum = sheet.getRow(currentRow);
        const rConsultIndex = currentRow;
        rowConsultSum.height = 24;
        rowConsultSum.getCell(1).value = 'TOTAL CONSULTATIONS (WALK-INS)';
        sheet.mergeCells(currentRow, 1, currentRow, 2);

        for (let d = 1; d <= days.length; d++) {
          const colIndex = 2 + d;
          const colLetter = getColumnLetter(colIndex);
          const formula = consultRowIndices.length > 0 ? `=SUM(${consultRowIndices.map(i => `${colLetter}${i}`).join(',')})` : '=0';
          rowConsultSum.getCell(colIndex).value = { formula };
        }
        const totalColLetter = getColumnLetter(totalCols);
        rowConsultSum.getCell(totalCols).value = { formula: consultRowIndices.length > 0 ? `=SUM(${consultRowIndices.map(i => `${totalColLetter}${i}`).join(',')})` : '=0' };

        for (let col = 1; col <= totalCols; col++) {
          const cell = rowConsultSum.getCell(col);
          cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: '1B365D' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EBF3FD' } };
          cell.border = { top: { style: 'thin', color: { argb: 'CAD9EA' } }, bottom: { style: 'thin', color: { argb: 'CAD9EA' } } };
          if (col > 2) {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.numFmt = '#,##0';
          }
        }
        currentRow++;

        // Row 2: TOTAL FOLLOW-UPS (Smaller row)
        const rowFollowSum = sheet.getRow(currentRow);
        const rFollowIndex = currentRow;
        rowFollowSum.height = 22;
        rowFollowSum.getCell(1).value = 'TOTAL FOLLOW-UPS';
        sheet.mergeCells(currentRow, 1, currentRow, 2);

        for (let d = 1; d <= days.length; d++) {
          const colIndex = 2 + d;
          const colLetter = getColumnLetter(colIndex);
          const formula = followUpRowIndices.length > 0 ? `=SUM(${followUpRowIndices.map(i => `${colLetter}${i}`).join(',')})` : '=0';
          rowFollowSum.getCell(colIndex).value = { formula };
        }
        rowFollowSum.getCell(totalCols).value = { formula: followUpRowIndices.length > 0 ? `=SUM(${followUpRowIndices.map(i => `${totalColLetter}${i}`).join(',')})` : '=0' };

        for (let col = 1; col <= totalCols; col++) {
          const cell = rowFollowSum.getCell(col);
          cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: '0F766E' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F0FDFA' } };
          cell.border = { bottom: { style: 'thin', color: { argb: 'CCFBF1' } } };
          if (col > 2) {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.numFmt = '#,##0';
          }
        }
        currentRow++;

        // Row 3: Total Completed (Walk-ins and Follow-Ups)
        const totalSumRow = sheet.getRow(currentRow);
        totalSumRow.height = 28;
        totalSumRow.getCell(1).value = 'Total Completed (Walk-ins and Follow-Ups)';
        sheet.mergeCells(currentRow, 1, currentRow, 2);

        for (let d = 1; d <= days.length; d++) {
          const colIndex = 2 + d;
          const colLetter = getColumnLetter(colIndex);
          totalSumRow.getCell(colIndex).value = { formula: `=${colLetter}${rConsultIndex}+${colLetter}${rFollowIndex}` };
        }
        totalSumRow.getCell(totalCols).value = { formula: `=${totalColLetter}${rConsultIndex}+${totalColLetter}${rFollowIndex}` };

        for (let col = 1; col <= totalCols; col++) {
          const cell = totalSumRow.getCell(col);
          cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFF' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1B365D' } };
          cell.border = {
            top: { style: 'medium', color: { argb: '1B365D' } },
            bottom: { style: 'double', color: { argb: '1B365D' } }
          };
          if (col > 2) {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.numFmt = '#,##0';
            if (col === totalCols) {
              cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: '00FF00' } };
            }
          }
        }
      } else {
        const totalSumRow = sheet.getRow(currentRow);
        totalSumRow.height = 28;
        totalSumRow.getCell(1).value = isFollowUpOnly ? 'TOTAL FOLLOW-UPS' : 'TOTAL COMPLETED (WALK-INS)';
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
            top: { style: 'medium', color: { argb: '1B365D' } },
            bottom: { style: 'double', color: { argb: '1B365D' } }
          };
          if (col > 2) {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.numFmt = '#,##0';
            if (col === totalCols) {
              cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: '00FF00' } };
            }
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

  // Helper to convert numeric column index to Excel column letter
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
      workbook.creator = 'Legacy Clinics & Diagnostics';
      workbook.lastModifiedBy = user?.full_name || 'System User';
      workbook.created = new Date();

      const days = getDaysArray();
      const totalCols = 2 + days.length + 1;

      const filteredProviders = config.providers.filter(p => {
        const specName = p.specialization_name || p.specialization || 'Other';
        if (monthlyDeptFilter !== 'ALL' && specName !== monthlyDeptFilter) return false;
        if (monthlySearchQuery.trim() !== '') {
          const query = monthlySearchQuery.toLowerCase();
          return p.name.toLowerCase().includes(query) || specName.toLowerCase().includes(query);
        }
        return true;
      });

      let maxNameWidth = 28;
      let maxSpecWidth = 24;
      filteredProviders.forEach(p => {
        if (p.name && p.name.length > maxNameWidth) maxNameWidth = p.name.length;
        const spec = p.specialization_name || p.specialization || 'Other';
        if (spec.length > maxSpecWidth) maxSpecWidth = spec.length;
      });

      // SHEET 1: Monthly Matrix
      const sheet = workbook.addWorksheet('Monthly Matrix');
      sheet.views = [{ showGridLines: true, state: 'frozen', xSplit: 2, ySplit: 4 }];

      sheet.getColumn(1).width = Math.min(maxNameWidth + 4, 50);
      sheet.getColumn(2).width = Math.min(maxSpecWidth + 4, 38);
      days.forEach(day => {
        sheet.getColumn(2 + day).width = 6.5;
      });
      sheet.getColumn(totalCols).width = 14;

      // Title Block
      const titleCell = sheet.getCell('A1');
      titleCell.value = 'LEGACY CLINICS & DIAGNOSTICS';
      sheet.mergeCells(1, 1, 1, totalCols);
      titleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1B365D' } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      sheet.getRow(1).height = 36;

      const subCell = sheet.getCell('A2');
      const isBoth = monthlyMetricMode === 'both';
      const isFollowUpOnly = monthlyMetricMode === 'followup';
      subCell.value = isBoth
        ? `INSTITUTIONAL MONTHLY OPERATIONAL MATRIX - Total Completed (Walk-ins and Follow-Ups) (Period: ${selectedMonth}/${selectedYear})`
        : `INSTITUTIONAL MONTHLY OPERATIONAL MATRIX (Period: ${selectedMonth}/${selectedYear})`;
      sheet.mergeCells(2, 1, 2, totalCols);
      subCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFF' } };
      subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4A90E2' } };
      subCell.alignment = { horizontal: 'center', vertical: 'middle' };
      sheet.getRow(2).height = 26;

      const metaCell = sheet.getCell('A3');
      metaCell.value = `Report Extracted: ${new Date().toLocaleString()} | User: ${user?.full_name || 'System User'} | Mode: ${monthlyMetricMode} | Filter: ${monthlyDeptFilter}`;
      sheet.mergeCells(3, 1, 3, totalCols);
      metaCell.font = { name: 'Calibri', size: 9, italic: true, color: { argb: '475569' } };
      metaCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F8FAFC' } };
      metaCell.alignment = { horizontal: 'center', vertical: 'middle' };
      sheet.getRow(3).height = 20;

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
      const consultRowIndices = [];
      const followUpRowIndices = [];
      const providerTotalRowIndices = [];

      filteredProviders.forEach(provider => {
        const specName = provider.specialization_name || provider.specialization || 'Other';
        const startColLetter = getColumnLetter(3);
        const endColLetter = getColumnLetter(2 + days.length);

        if (isBoth) {
          // Row 1: Consultations (Walk-ins)
          const r1 = sheet.getRow(currentRow);
          const r1Index = currentRow;
          consultRowIndices.push(r1Index);
          r1.height = 21;
          r1.getCell(1).value = provider.name;
          r1.getCell(2).value = specName;

          days.forEach(day => {
            const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const record = monthlyData.metrics.find(m => m.provider_id === provider.id && m.report_date === dateStr);
            r1.getCell(2 + day).value = record ? (Number(record.patient_count) || 0) : 0;
          });
          r1.getCell(totalCols).value = { formula: `=SUM(${startColLetter}${r1Index}:${endColLetter}${r1Index})` };

          for (let col = 1; col <= totalCols; col++) {
            const cell = r1.getCell(col);
            cell.font = { name: 'Calibri', size: 10 };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF' } };
            cell.border = { bottom: { style: 'thin', color: { argb: 'E2E8F0' } } };
            if (col > 2) {
              cell.alignment = { horizontal: 'center', vertical: 'middle' };
              cell.numFmt = '#,##0';
              const val = cell.value;
              if (col === totalCols) {
                cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: '1B365D' } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F2F7FD' } };
              } else if (typeof val === 'number' && val > 0) {
                cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: '107C41' } };
              } else if (val === 0) {
                cell.font = { name: 'Calibri', size: 10, color: { argb: '94A3B8' } };
                cell.value = 0;
              }
            }
          }
          currentRow++;

          // Row 2: Follow-Up (Smaller row)
          const r2 = sheet.getRow(currentRow);
          const r2Index = currentRow;
          followUpRowIndices.push(r2Index);
          r2.height = 17;
          r2.getCell(1).value = '   ↳ Follow-Up';
          r2.getCell(2).value = 'Follow-Up';

          days.forEach(day => {
            const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const record = monthlyData.metrics.find(m => m.provider_id === provider.id && m.report_date === dateStr);
            r2.getCell(2 + day).value = record ? (Number(record.follow_up_count) || 0) : 0;
          });
          r2.getCell(totalCols).value = { formula: `=SUM(${startColLetter}${r2Index}:${endColLetter}${r2Index})` };

          for (let col = 1; col <= totalCols; col++) {
            const cell = r2.getCell(col);
            cell.font = { name: 'Calibri', size: 9, italic: true };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F0FDFA' } };
            cell.border = { bottom: { style: 'thin', color: { argb: 'CCFBF1' } } };
            if (col > 2) {
              cell.alignment = { horizontal: 'center', vertical: 'middle' };
              cell.numFmt = '#,##0';
              const val = cell.value;
              if (col === totalCols) {
                cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: '0F766E' } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E6FFFA' } };
              } else if (typeof val === 'number' && val > 0) {
                cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: '0D9488' } };
              } else if (val === 0) {
                cell.font = { name: 'Calibri', size: 9, color: { argb: '94A3B8' } };
                cell.value = 0;
              }
            }
          }
          currentRow++;

          // Row 3: Total Summation of both
          const r3 = sheet.getRow(currentRow);
          const r3Index = currentRow;
          providerTotalRowIndices.push(r3Index);
          r3.height = 20;
          r3.getCell(1).value = '   Total (Walk-ins & Follow-ups)';
          r3.getCell(2).value = 'Total';

          days.forEach(day => {
            const colLetter = getColumnLetter(2 + day);
            r3.getCell(2 + day).value = { formula: `=${colLetter}${r1Index}+${colLetter}${r2Index}` };
          });
          const totalColLetter = getColumnLetter(totalCols);
          r3.getCell(totalCols).value = { formula: `=${totalColLetter}${r1Index}+${totalColLetter}${r2Index}` };

          for (let col = 1; col <= totalCols; col++) {
            const cell = r3.getCell(col);
            cell.font = { name: 'Calibri', size: 10, bold: true };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F5F9' } };
            cell.border = { bottom: { style: 'medium', color: { argb: 'CBD5E1' } } };
            if (col > 2) {
              cell.alignment = { horizontal: 'center', vertical: 'middle' };
              cell.numFmt = '#,##0';
              if (col === totalCols) {
                cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: '1B365D' } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E2E8F0' } };
              }
            }
          }
          currentRow++;

        } else {
          // Single row per provider
          const r = sheet.getRow(currentRow);
          r.height = 21;
          r.getCell(1).value = provider.name;
          r.getCell(2).value = specName;

          days.forEach(day => {
            const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const record = monthlyData.metrics.find(m => m.provider_id === provider.id && m.report_date === dateStr);
            let val = 0;
            if (record) {
              val = isFollowUpOnly ? (Number(record.follow_up_count) || 0) : (Number(record.patient_count) || 0);
            }
            r.getCell(2 + day).value = val;
          });

          r.getCell(totalCols).value = { formula: `=SUM(${startColLetter}${currentRow}:${endColLetter}${currentRow})` };

          const rowBg = currentRow % 2 === 0 ? 'F9FAFB' : 'FFFFFF';
          for (let col = 1; col <= totalCols; col++) {
            const cell = r.getCell(col);
            cell.font = { name: 'Calibri', size: 10 };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
            cell.border = { bottom: { style: 'thin', color: { argb: 'E2E8F0' } } };
            if (col > 2) {
              cell.alignment = { horizontal: 'center', vertical: 'middle' };
              cell.numFmt = '#,##0';
              const val = cell.value;
              if (col === totalCols) {
                cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: '1B365D' } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F2F7FD' } };
              } else if (typeof val === 'number' && val > 0) {
                cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: '107C41' } };
              } else if (val === 0) {
                cell.font = { name: 'Calibri', size: 10, color: { argb: '94A3B8' } };
                cell.value = 0;
              }
            }
          }
          currentRow++;
        }
      });

      const endRowProviders = Math.max(startRowProviders, currentRow - 1);

      // Section Divider
      const dividerRow = sheet.getRow(currentRow);
      dividerRow.height = 24;
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
        if (monthlyDeptFilter !== 'ALL') return false;
        if (monthlySearchQuery.trim() !== '') {
          return metricName.toLowerCase().includes(monthlySearchQuery.toLowerCase());
        }
        return true;
      });

      filteredProcedures.forEach(metricName => {
        const isNameInput = metricName.toLowerCase().includes('assistant');
        const r = sheet.getRow(currentRow);
        r.height = 21;
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

        const rowBg = currentRow % 2 === 0 ? 'F9FAFB' : 'FFFFFF';
        for (let col = 1; col <= totalCols; col++) {
          const cell = r.getCell(col);
          cell.font = { name: 'Calibri', size: 10 };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
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
                cell.value = 0;
                cell.font = { name: 'Calibri', size: 10, color: { argb: '94A3B8' } };
              }
            } else if (typeof val === 'number' && val > 0) {
              cell.font = { name: 'Calibri', size: 10, bold: true };
              cell.numFmt = '#,##0';
            } else if (val === 0) {
              cell.value = 0;
              cell.font = { name: 'Calibri', size: 10, color: { argb: '94A3B8' } };
            }
          }
        }
        currentRow++;
      });

      const endRowProcedures = Math.max(startRowProcedures, currentRow - 1);

      // Bottom Total Rows
      if (isBoth) {
        // Row 1: TOTAL CONSULTATIONS (WALK-INS)
        const rowConsultSum = sheet.getRow(currentRow);
        const rConsultIndex = currentRow;
        rowConsultSum.height = 24;
        rowConsultSum.getCell(1).value = 'TOTAL CONSULTATIONS (WALK-INS)';
        sheet.mergeCells(currentRow, 1, currentRow, 2);

        for (let d = 1; d <= days.length; d++) {
          const colIndex = 2 + d;
          const colLetter = getColumnLetter(colIndex);
          const formula = consultRowIndices.length > 0 ? `=SUM(${consultRowIndices.map(i => `${colLetter}${i}`).join(',')})` : '=0';
          rowConsultSum.getCell(colIndex).value = { formula };
        }
        const totalColLetter = getColumnLetter(totalCols);
        rowConsultSum.getCell(totalCols).value = { formula: consultRowIndices.length > 0 ? `=SUM(${consultRowIndices.map(i => `${totalColLetter}${i}`).join(',')})` : '=0' };

        for (let col = 1; col <= totalCols; col++) {
          const cell = rowConsultSum.getCell(col);
          cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: '1B365D' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EBF3FD' } };
          cell.border = { top: { style: 'thin', color: { argb: 'CAD9EA' } }, bottom: { style: 'thin', color: { argb: 'CAD9EA' } } };
          if (col > 2) {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.numFmt = '#,##0';
          }
        }
        currentRow++;

        // Row 2: TOTAL FOLLOW-UPS (Smaller row)
        const rowFollowSum = sheet.getRow(currentRow);
        const rFollowIndex = currentRow;
        rowFollowSum.height = 22;
        rowFollowSum.getCell(1).value = 'TOTAL FOLLOW-UPS';
        sheet.mergeCells(currentRow, 1, currentRow, 2);

        for (let d = 1; d <= days.length; d++) {
          const colIndex = 2 + d;
          const colLetter = getColumnLetter(colIndex);
          const formula = followUpRowIndices.length > 0 ? `=SUM(${followUpRowIndices.map(i => `${colLetter}${i}`).join(',')})` : '=0';
          rowFollowSum.getCell(colIndex).value = { formula };
        }
        rowFollowSum.getCell(totalCols).value = { formula: followUpRowIndices.length > 0 ? `=SUM(${followUpRowIndices.map(i => `${totalColLetter}${i}`).join(',')})` : '=0' };

        for (let col = 1; col <= totalCols; col++) {
          const cell = rowFollowSum.getCell(col);
          cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: '0F766E' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F0FDFA' } };
          cell.border = { bottom: { style: 'thin', color: { argb: 'CCFBF1' } } };
          if (col > 2) {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.numFmt = '#,##0';
          }
        }
        currentRow++;

        // Row 3: Total Completed (Walk-ins and Follow-Ups)
        const totalSumRow = sheet.getRow(currentRow);
        totalSumRow.height = 28;
        totalSumRow.getCell(1).value = 'Total Completed (Walk-ins and Follow-Ups)';
        sheet.mergeCells(currentRow, 1, currentRow, 2);

        for (let d = 1; d <= days.length; d++) {
          const colIndex = 2 + d;
          const colLetter = getColumnLetter(colIndex);
          totalSumRow.getCell(colIndex).value = { formula: `=${colLetter}${rConsultIndex}+${colLetter}${rFollowIndex}` };
        }
        totalSumRow.getCell(totalCols).value = { formula: `=${totalColLetter}${rConsultIndex}+${totalColLetter}${rFollowIndex}` };

        for (let col = 1; col <= totalCols; col++) {
          const cell = totalSumRow.getCell(col);
          cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFF' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1B365D' } };
          cell.border = {
            top: { style: 'medium', color: { argb: '1B365D' } },
            bottom: { style: 'double', color: { argb: '1B365D' } }
          };
          if (col > 2) {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.numFmt = '#,##0';
            if (col === totalCols) {
              cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: '00FF00' } };
            }
          }
        }
      } else {
        const totalSumRow = sheet.getRow(currentRow);
        totalSumRow.height = 28;
        totalSumRow.getCell(1).value = isFollowUpOnly ? 'TOTAL FOLLOW-UPS' : 'TOTAL COMPLETED (WALK-INS)';
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
            top: { style: 'medium', color: { argb: '1B365D' } },
            bottom: { style: 'double', color: { argb: '1B365D' } }
          };
          if (col > 2) {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.numFmt = '#,##0';
            if (col === totalCols) {
              cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: '00FF00' } };
            }
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

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
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

              {/* Metric Selector (Both, Consultations, Follow-Ups) */}
              <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
                {[
                  { val: 'both', label: 'Both' },
                  { val: 'consultation', label: 'Consultations' },
                  { val: 'followup', label: 'Follow-Ups' }
                ].map(({ val, label }) => (
                  <button
                    key={val}
                    onClick={() => setDailyMetricMode(val)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      dailyMetricMode === val
                        ? 'bg-[#005696] text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    {label}
                  </button>
                ))}
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
                {sortedSpecializations.map(dept => (
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
                      <div key={deptName} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:border-sky-500/30 transition-all duration-300">

                        {/* Dept Header */}
                        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
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
                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                          {providers.map(provider => {
                            const count = dailyMetrics[provider.id] || 0;
                            const followUp = dailyFollowUps[provider.id] || 0;
                            return (
                              <div key={provider.id} className="flex items-center justify-between p-2.5 px-3.5 rounded-xl border border-slate-100 bg-slate-50/30">
                                <div className="flex items-center gap-3">
                                  <div className="p-1.5 bg-slate-100 text-slate-500 rounded-lg">
                                    <User size={14} />
                                  </div>
                                  <div>
                                    <p className="text-xs font-black text-slate-800">{provider.name}</p>
                                    <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">{provider.title || 'Specialist'}</span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5">
                                  <span className={`text-[10px] font-black font-mono px-2 py-0.5 rounded border flex items-center gap-1 ${count > 0
                                    ? 'bg-sky-50 text-sky-700 border-sky-100'
                                    : 'bg-slate-100 text-slate-400 border-slate-200/60'
                                    }`}>
                                    <span className="text-[8px] font-black text-sky-400 uppercase">C</span>
                                    {count}
                                  </span>
                                  <span className={`text-[10px] font-black font-mono px-2 py-0.5 rounded border flex items-center gap-1 ${followUp > 0
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

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 mt-6 animate-fadeIn">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4 mb-4">
                <div>
                  <h3 className="text-sm font-black text-sky-650 uppercase tracking-widest flex items-center gap-2">
                    <Database size={16} className="text-sky-650" /> Consumption
                  </h3>
                  <p className="text-[10px] text-slate-400 font-extrabold uppercase mt-0.5">
                    Items consumed — split by session (AM / PM) and ward (Station 1 / Minor)
                  </p>
                </div>
                <span className="text-[10px] font-black px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-100 rounded-full">
                  {consumptionSummary.length} ITEMS CONSUMED
                </span>
              </div>

              {consumptionSummary.length === 0 ? (
                <div className="text-center py-8 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                  <Database size={24} className="text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-450 font-bold">No consumption logged for this date.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {consumptionSummary.map((it) => (
                    <div key={it.item_name} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col hover:border-slate-300 hover:shadow-md transition-all">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-black text-slate-800 text-sm leading-tight">{it.item_name}</h4>
                        <div className="text-right shrink-0">
                          <div className="text-2xl font-black text-amber-600 leading-none">{it.total}</div>
                          <div className="text-[8px] font-black uppercase tracking-wider text-slate-400 mt-0.5">consumed</div>
                        </div>
                      </div>

                      <table className="w-full text-center text-[11px] mt-3 border border-slate-100 rounded-lg overflow-hidden">
                        <thead>
                          <tr className="bg-slate-50 text-slate-400 text-[8px] font-black uppercase tracking-wider">
                            <th className="py-1.5 w-10"></th><th className="py-1.5 text-sky-600">Station 1</th><th className="py-1.5 text-emerald-600">Minor</th>
                          </tr>
                        </thead>
                        <tbody className="font-black">
                          <tr className="border-t border-slate-100">
                            <td className="py-1.5 text-[8px] font-black text-slate-400 uppercase bg-slate-50/60">AM</td>
                            <td className={it.amStn ? 'text-sky-700' : 'text-slate-300'}>{it.amStn || '·'}</td>
                            <td className={it.amMin ? 'text-emerald-700' : 'text-slate-300'}>{it.amMin || '·'}</td>
                          </tr>
                          <tr className="border-t border-slate-100">
                            <td className="py-1.5 text-[8px] font-black text-slate-400 uppercase bg-slate-50/60">PM</td>
                            <td className={it.pmStn ? 'text-sky-700' : 'text-slate-300'}>{it.pmStn || '·'}</td>
                            <td className={it.pmMin ? 'text-emerald-700' : 'text-slate-300'}>{it.pmMin || '·'}</td>
                          </tr>
                        </tbody>
                      </table>

                      <div className="flex items-center mt-3 text-[9px] font-bold text-slate-400">
                        <span>on hand <b className="text-slate-600">{it.lastStock}</b> · bal <b className="text-indigo-600">{it.lastBalance}</b></span>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-start gap-1.5">
                        <User size={12} className="text-slate-400 shrink-0 mt-0.5" />
                        <span className="text-[10px] text-slate-600 leading-snug"><span className="font-black text-slate-700">{it.users.join(', ') || '—'}</span></span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>



          </div>

        </div>
      )
      }

      {/* ────────────────── WEEKLY REPORT TAB ────────────────── */}
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
                  {sortedSpecializations.map(dept => (
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
                            const specName = p.specialization_name || p.specialization || 'Other';
                            if (weeklyDeptFilter !== 'ALL' && specName !== weeklyDeptFilter) return false;
                            if (weeklySearchQuery.trim() !== '') {
                              const query = weeklySearchQuery.toLowerCase();
                              return p.name.toLowerCase().includes(query) || specName.toLowerCase().includes(query);
                            }
                            return true;
                          })
                          .map(provider => {
                            const specName = provider.specialization_name || provider.specialization || 'Other';
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
                                      {specName}
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
                                    <td className="px-4 py-1.5 border-r border-slate-200 text-slate-400 font-extrabold text-[10px] uppercase">{weeklyMetricMode === 'followup' ? specName : ''}</td>
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

      {/* ────────────────── MONTHLY MATRIX EXPLORER TAB ────────────────── */}
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
                  {sortedSpecializations.map(dept => (
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
                            const specName = p.specialization_name || p.specialization || 'Other';
                            if (monthlyDeptFilter !== 'ALL' && specName !== monthlyDeptFilter) return false;
                            if (monthlySearchQuery.trim() !== '') {
                              const query = monthlySearchQuery.toLowerCase();
                              return p.name.toLowerCase().includes(query) || specName.toLowerCase().includes(query);
                            }
                            return true;
                          })
                          .map(provider => {
                            const specName = provider.specialization_name || provider.specialization || 'Other';
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
                                      {specName}
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
                                    <td className="px-4 py-1.5 border-r border-slate-200 text-slate-400 font-extrabold text-[10px] uppercase">{monthlyMetricMode === 'followup' ? specName : ''}</td>
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

      {/* ────────────────── STOCK LOG DETAILS MODAL ────────────────── */}
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

                  {/* Ward Breakdown Details */}
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ward Breakdown Details</span>
                    <div className="space-y-2">
                      {/* STN1 */}
                      <div className="bg-white p-3 rounded-lg border border-slate-150 flex items-center justify-between">
                        <div>
                          <span className="font-black text-sky-700 text-[9px] uppercase tracking-wider block">Station 1 (STN1)</span>
                          <span className="text-[9px] text-slate-400 font-bold">RN: {selectedLog.new_user_stn1 || 'None'}</span>
                        </div>
                        <div className="text-right font-mono text-[11px] font-black">
                          <span className="text-slate-450">{selectedLog.old_consumed_obs1 || 0}</span>
                          <span className="mx-1 text-slate-400">➔</span>
                          <span className="text-slate-800">{selectedLog.new_consumed_obs1 || 0}</span>
                        </div>
                      </div>

                      {/* MINOR */}
                      <div className="bg-white p-3 rounded-lg border border-slate-150 flex items-center justify-between">
                        <div>
                          <span className="font-black text-emerald-700 text-[9px] uppercase tracking-wider block">Minor Surgery (MINOR)</span>
                          <span className="text-[9px] text-slate-400 font-bold">RN: {selectedLog.new_user_minor || 'None'}</span>
                        </div>
                        <div className="text-right font-mono text-[11px] font-black">
                          <span className="text-slate-450">{selectedLog.old_consumed_minor || 0}</span>
                          <span className="mx-1 text-slate-400">➔</span>
                          <span className="text-slate-800">{selectedLog.new_consumed_minor || 0}</span>
                        </div>
                      </div>
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
