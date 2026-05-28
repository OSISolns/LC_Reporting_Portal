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
  Plus, 
  FileText,
  AlertCircle,
  TrendingUp,
  Settings,
  Lock,
  ShieldCheck,
  Award,
  Users
} from 'lucide-react';
import { getReportConfig, getDailyReport, saveDailyReport, getMonthlyReport } from '../api/reports';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function DailyOperationalReport() {
  const { user } = useAuth();
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
              className={`flex-1 lg:flex-none px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 ${
                activeTab === 'entry' 
                  ? 'bg-gradient-to-r from-sky-500 to-sky-600 text-white shadow-md shadow-sky-500/20 scale-100' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Plus size={15} /> Data Entry Form
            </button>
            <button
              onClick={() => setActiveTab('monthly')}
              className={`flex-1 lg:flex-none px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 ${
                activeTab === 'monthly' 
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
                                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{provider.title || 'Specialist'}</span>
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
                                className="w-full text-right font-black text-sm text-sky-850 border-2 border-slate-200/80 rounded-xl pl-3 pr-8 py-2 focus:border-sky-500 focus:ring-0 bg-white transition-all duration-200"
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
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${
                              isNameInput ? 'bg-purple-50 text-purple-650' : 'bg-slate-100 text-slate-500'
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
                            className="w-full text-xs font-bold text-slate-700 border-2 border-slate-200 rounded-xl px-4 py-3 focus:border-sky-500 focus:ring-0 bg-slate-50/20 focus:bg-white transition-all duration-200"
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
                disabled={saving || loading}
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

            {/* Print and Actions */}
            <div className="flex gap-2">
              <button
                onClick={handlePrint}
                className="bg-slate-50 hover:bg-slate-150 hover:text-slate-800 border border-slate-200 text-slate-650 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 flex items-center gap-2"
              >
                <Printer size={14} /> Export / Print View
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
                              {provider.title ? `${provider.title} ` : ''}{provider.name}
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
