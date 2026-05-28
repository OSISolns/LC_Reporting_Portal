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
  Printer, 
  BarChart3, 
  Users, 
  Plus, 
  FileText,
  AlertCircle,
  TrendingUp,
  Settings
} from 'lucide-react';
import { getReportConfig, getDailyReport, saveDailyReport, getMonthlyReport } from '../api/reports';
import toast from 'react-hot-toast';

export default function DailyOperationalReport() {
  const [activeTab, setActiveTab] = useState('entry'); // 'entry' or 'monthly'
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState({ departments: [], providers: [], defaultProcedureMetrics: [] });
  
  // Daily Entry state
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [entryMetrics, setEntryMetrics] = useState({}); // providerId -> patientCount
  const [entryLogs, setEntryLogs] = useState({}); // metricName -> metricValue
  const [saving, setSaving] = useState(false);

  // Monthly View state
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [monthlyData, setMonthlyData] = useState(null);

  // Print ref
  const printRef = useRef();

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
        toast.error('Failed to load roster configuration.');
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
        toast.success(`Operational report for ${selectedDate} saved!`, { icon: '💾' });
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

  // Printable action
  const handlePrint = () => {
    window.print();
  };

  // Group active providers by department
  const providersByDept = config.providers.reduce((acc, p) => {
    const deptName = p.department_name || 'OTHER';
    if (!acc[deptName]) acc[deptName] = [];
    acc[deptName].push(p);
    return acc;
  }, {});

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* ── Page Hero Title ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-sky-850 to-sky-700 text-white p-6 md:p-8 rounded-[24px] shadow-xl relative overflow-hidden bg-sky-900">
        <div className="space-y-2 z-10">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-white/10 rounded-lg text-sky-200">
              <Stethoscope size={18} />
            </span>
            <span className="text-[10px] tracking-wider font-extrabold uppercase text-sky-200">Clinical operational node</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">Daily Patient Volumes & Roster Metrics</h1>
          <p className="text-xs md:text-sm text-sky-200 font-medium max-w-xl">
            Track patient registers across Gynecology, Pediatrics, Dental, and General Medicine. Log procedural summaries and assistant handovers.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-sky-950/40 p-1.5 rounded-2xl border border-white/10 backdrop-blur-md z-10">
          <button
            onClick={() => setActiveTab('entry')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
              activeTab === 'entry' 
                ? 'bg-white text-sky-900 shadow-md scale-100' 
                : 'text-white hover:bg-white/5'
            }`}
          >
            <Plus size={14} /> Data Entry Form
          </button>
          <button
            onClick={() => setActiveTab('monthly')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
              activeTab === 'monthly' 
                ? 'bg-white text-sky-900 shadow-md scale-100' 
                : 'text-white hover:bg-white/5'
            }`}
          >
            <BarChart3 size={14} /> Monthly Matrix
          </button>
        </div>
      </div>

      {/* ────────────────── MODE A: DAILY DATA ENTRY ────────────────── */}
      {activeTab === 'entry' && (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Main Form Area */}
          <div className="xl:col-span-3 space-y-6">
            {/* Date Picker Ribbon */}
            <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-md flex justify-between items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Calendar className="text-sky-600" size={20} />
                <span className="text-sm font-bold text-slate-800">Operational Log Date:</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-2xl border border-slate-200">
                <button
                  onClick={() => adjustDate(-1)}
                  className="p-2 hover:bg-white hover:shadow-sm rounded-xl transition-all text-slate-600"
                  title="Previous Day"
                >
                  <ChevronLeft size={16} />
                </button>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent border-none text-sm font-extrabold text-slate-700 focus:ring-0 cursor-pointer text-center outline-none px-2"
                />
                <button
                  onClick={() => adjustDate(1)}
                  className="p-2 hover:bg-white hover:shadow-sm rounded-xl transition-all text-slate-600"
                  title="Next Day"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
              <div>
                <button
                  onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                  className="text-xs font-black text-sky-600 hover:text-sky-700 bg-sky-50 px-3 py-1.5 rounded-xl border border-sky-100 uppercase tracking-wider"
                >
                  Jump to Today
                </button>
              </div>
            </div>

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
                    <div key={deptName} className="bg-white rounded-3xl border border-slate-200/60 shadow-lg overflow-hidden">
                      {/* Department Ribbon */}
                      <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-pulse" />
                          <h3 className="text-sm font-extrabold text-slate-800 tracking-wider uppercase">
                            {deptName}
                          </h3>
                        </div>
                        <span className="text-[10px] font-extrabold px-2.5 py-1 bg-slate-200/60 text-slate-600 rounded-full">
                          {providersByDept[deptName].length} PROVIDERS
                        </span>
                      </div>

                      {/* Providers List Grid */}
                      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {providersByDept[deptName].map((provider) => (
                          <div 
                            key={provider.id} 
                            className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-all hover:shadow-sm"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold text-sm">
                                {provider.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-xs font-black text-slate-700">{provider.name}</p>
                                <span className="text-[10px] font-bold text-slate-400">{provider.title || ''}</span>
                              </div>
                            </div>

                            {/* Patient Volume Input */}
                            <div className="w-24">
                              <input
                                type="number"
                                min="0"
                                placeholder="0"
                                value={entryMetrics[provider.id] !== undefined ? entryMetrics[provider.id] : ''}
                                onChange={(e) => handleMetricChange(provider.id, e.target.value)}
                                className="w-full text-right font-black text-sm text-sky-700 border-2 border-slate-200/80 rounded-xl px-3 py-1.5 focus:border-sky-500 focus:ring-0 bg-white"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {/* ── Ancillary & Procedure Logs Section ── */}
                <div className="bg-white rounded-3xl border border-slate-250 shadow-lg overflow-hidden">
                  <div className="bg-sky-50/50 px-6 py-4 border-b border-sky-100 flex items-center gap-2">
                    <Activity className="text-sky-600" size={18} />
                    <h3 className="text-sm font-extrabold text-slate-800 tracking-wider uppercase">
                      Ancillary & Assistant Logs
                    </h3>
                  </div>

                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {config.defaultProcedureMetrics.map((metricName) => {
                      const value = entryLogs[metricName] || '';
                      // Determine if it looks like assistant name assignment (contains text) or standard number
                      const isNameInput = metricName.toLowerCase().includes('assistant');
                      return (
                        <div key={metricName} className="space-y-1.5">
                          <label className="text-xs font-black text-slate-600 flex justify-between">
                            <span>{metricName}</span>
                            <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest">
                              {isNameInput ? 'Text Name Assignment' : 'Quantity / Value'}
                            </span>
                          </label>
                          <input
                            type="text"
                            placeholder={isNameInput ? 'e.g. Denyse, Rachel' : '0'}
                            value={value}
                            onChange={(e) => handleLogChange(metricName, e.target.value)}
                            className="w-full text-sm font-bold text-slate-700 border-2 border-slate-200 rounded-xl px-4 py-2.5 focus:border-sky-500 focus:ring-0 bg-slate-50/30 focus:bg-white transition-all"
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
            <div className="bg-gradient-to-b from-white to-slate-50 p-6 rounded-3xl border border-slate-200 shadow-xl space-y-6 sticky top-6">
              <div className="border-b border-slate-100 pb-4 space-y-1">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Form Action Panel</h3>
                <p className="text-[10px] font-bold text-slate-400">Save active logs to clinical history</p>
              </div>

              {/* Summary calculations */}
              <div className="bg-sky-50/50 p-4 rounded-2xl border border-sky-100 space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                    <Users size={14} className="text-slate-400" />
                    <span>Active roster counts</span>
                  </div>
                  <span className="text-xs font-black text-sky-700">{config.providers.length}</span>
                </div>
                
                <div className="flex justify-between items-center border-t border-sky-100 pt-3">
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-700">
                    <TrendingUp size={14} className="text-sky-600" />
                    <span>Total Patients Formulated</span>
                  </div>
                  <span className="text-sm font-black text-sky-800">
                    {Object.values(entryMetrics).reduce((acc, curr) => acc + (parseInt(curr, 10) || 0), 0)}
                  </span>
                </div>
              </div>

              {/* Status checklist */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                  <div className="p-0.5 bg-green-100 text-green-700 rounded">
                    <Check size={10} />
                  </div>
                  <span>Tables structured dynamically</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                  <div className="p-0.5 bg-green-100 text-green-700 rounded">
                    <Check size={10} />
                  </div>
                  <span>Normalized rows per day</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                  <div className="p-0.5 bg-green-100 text-green-700 rounded">
                    <Check size={10} />
                  </div>
                  <span>Audit Logs synced</span>
                </div>
              </div>

              {/* Save Trigger Button */}
              <button
                onClick={handleSaveReport}
                disabled={saving || loading}
                className="w-full bg-[#0369a1] hover:bg-[#0284c7] disabled:bg-slate-300 text-white py-4 px-6 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <Activity className="animate-spin" size={14} /> Commit Changes...
                  </>
                ) : (
                  <>
                    <Save size={14} /> Commit Operational Log
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────── MODE B: MONTHLY MATRIX DASHBOARD ────────────────── */}
      {activeTab === 'monthly' && (
        <div className="space-y-6">
          {/* Calendar Picker Control Bar */}
          <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-md flex justify-between items-center gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Calendar className="text-sky-600" size={20} />
              <span className="text-sm font-bold text-slate-800">Monthly View Filters:</span>
            </div>

            <div className="flex items-center gap-3">
              {/* Year Select */}
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                className="bg-slate-50 border-2 border-slate-200 text-sm font-extrabold text-slate-700 rounded-xl px-3 py-2 outline-none focus:border-sky-500"
              >
                {[2024, 2025, 2026, 2027].map(yr => (
                  <option key={yr} value={yr}>{yr}</option>
                ))}
              </select>

              {/* Month Select */}
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
                className="bg-slate-50 border-2 border-slate-200 text-sm font-extrabold text-slate-700 rounded-xl px-3 py-2 outline-none focus:border-sky-500"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>{getMonthName(m)}</option>
                ))}
              </select>
            </div>

            {/* Print and Actions */}
            <div className="flex gap-2">
              <button
                onClick={handlePrint}
                className="bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5"
              >
                <Printer size={14} /> Local Print View
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
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden print:shadow-none print:border-none">
              {/* Header Context in sheet */}
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center print:border-b-2 print:border-slate-800">
                <div>
                  <h2 className="text-lg font-black text-slate-800 uppercase tracking-wider">
                    {getMonthName(selectedMonth)} {selectedYear} Operational Audit Grid
                  </h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                    Legacy Clinics &middot; Nursing Command matrix
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black bg-sky-100 text-sky-850 px-3 py-1 rounded-full uppercase tracking-wider">
                    Pivoted Row-Per-Day Layout
                  </span>
                </div>
              </div>

              {/* Main matrix scrolling container */}
              <div className="overflow-x-auto w-full max-w-full">
                <table className="w-full border-collapse text-[11px] font-bold text-slate-600 print:text-[9px]">
                  {/* Table Header */}
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-250">
                      <th className="sticky left-0 bg-slate-100 text-left px-4 py-3 min-w-[200px] border-r border-slate-200 font-extrabold text-slate-800 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                        Provider / Roster Name
                      </th>
                      <th className="text-left px-4 py-3 min-w-[120px] border-r border-slate-200 font-extrabold text-slate-800">
                        Department
                      </th>
                      
                      {/* Day 1 to 31 columns */}
                      {getDaysArray().map(day => (
                        <th 
                          key={day} 
                          className="text-center w-9 min-w-[36px] py-3 border-r border-slate-200 font-extrabold text-slate-700 bg-slate-50/50"
                        >
                          {day}
                        </th>
                      ))}
                      
                      <th className="text-center px-4 py-3 min-w-[70px] font-black text-sky-850 bg-sky-50">
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
                          <td className="sticky left-0 bg-white hover:bg-slate-50 font-black text-slate-800 px-4 py-2.5 border-r border-slate-200 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                            {provider.title ? `${provider.title} ` : ''}{provider.name}
                          </td>
                          <td className="px-4 py-2.5 border-r border-slate-200 text-slate-500 font-extrabold text-[10px]">
                            {deptName}
                          </td>

                          {getDaysArray().map(day => {
                            const val = daysMap[day];
                            return (
                              <td key={day} className="text-center py-2.5 border-r border-slate-100 font-mono font-semibold">
                                {val > 0 ? (
                                  <span className="text-sky-700 font-extrabold">{val}</span>
                                ) : (
                                  <span className="text-slate-350 opacity-40">-</span>
                                )}
                              </td>
                            );
                          })}

                          <td className="text-center py-2.5 bg-sky-50/30 text-sky-850 font-black font-mono">
                            {providerSum}
                          </td>
                        </tr>
                      );
                    })}

                    {/* Section divider for Ancillary Procedures */}
                    <tr className="bg-slate-50 border-y-2 border-slate-300 font-black text-slate-700">
                      <td colSpan={2 + getDaysArray().length + 1} className="px-4 py-2 text-[10px] tracking-widest uppercase">
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
                        <tr key={metricName} className="border-b border-slate-150 hover:bg-slate-50/65 transition-colors bg-slate-50/20">
                          <td className="sticky left-0 bg-white hover:bg-slate-50 font-black text-slate-800 px-4 py-2.5 border-r border-slate-200 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                            {metricName}
                          </td>
                          <td className="px-4 py-2.5 border-r border-slate-200 text-slate-500 font-extrabold text-[10px]">
                            PROCEDURES
                          </td>

                          {getDaysArray().map(day => {
                            const val = daysMap[day];
                            const isZero = val === '0' || val === '' || val === undefined;
                            
                            return (
                              <td 
                                key={day} 
                                className="text-center py-2.5 border-r border-slate-100 font-mono font-semibold"
                                title={val}
                              >
                                {isZero ? (
                                  <span className="text-slate-350 opacity-40">-</span>
                                ) : (
                                  <span className={`${isNameInput ? 'text-purple-600 text-[10px] font-sans truncate block max-w-[45px] hover:max-w-none hover:bg-white hover:z-30 hover:absolute px-1 rounded border border-purple-100 shadow-sm' : 'text-slate-700 font-extrabold'}`}>
                                    {val}
                                  </span>
                                )}
                              </td>
                            );
                          })}

                          <td className="text-center py-2.5 bg-slate-100/50 text-slate-700 font-black font-mono">
                            {isNameInput ? 'N/A' : numericSum}
                          </td>
                        </tr>
                      );
                    })}

                    {/* Sticky Daily Calculations Column Sum Row */}
                    <tr className="bg-sky-900 text-white font-extrabold border-t border-sky-950">
                      <td 
                        className="sticky left-0 bg-sky-900 text-left px-4 py-3.5 border-r border-sky-950 font-black uppercase text-xs tracking-wider z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.15)]"
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
                          <td key={day} className="text-center py-3.5 border-r border-sky-950 font-mono font-black text-sm">
                            {dailySum}
                          </td>
                        );
                      })}

                      {/* Cumulative Total */}
                      <td className="text-center py-3.5 font-mono font-black text-sm bg-sky-950">
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
