import React, { useState, useEffect, useRef } from 'react';
import { 
  Stethoscope, 
  Activity, 
  Calendar, 
  User, 
  Printer, 
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
  FileSpreadsheet
} from 'lucide-react';
import { getReportConfig, getDailyReport, getMonthlyReport } from '../api/reports';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function DailyOperationalReportBoard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('daily'); // 'daily' or 'monthly'
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState({ departments: [], providers: [], defaultProcedureMetrics: [] });

  // Daily Board State
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [dailyMetrics, setDailyMetrics] = useState({}); // providerId -> patientCount
  const [dailyLogs, setDailyLogs] = useState({}); // metricName -> metricValue
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');

  // Monthly Matrix State
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [monthlyData, setMonthlyData] = useState(null);
  const [monthlySearchQuery, setMonthlySearchQuery] = useState('');
  const [monthlyDeptFilter, setMonthlyDeptFilter] = useState('ALL');

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
      
      // If there's a search query, only show departments that have matching providers
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

  // Print operational report
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8 space-y-8 select-none">
      
      {/* ── HEADER RIBBON ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-slate-950 p-6 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden backdrop-blur-md">
        <div className="absolute top-0 left-0 w-32 h-32 bg-sky-500/10 rounded-full blur-3xl -translate-x-10 -translate-y-10" />
        <div className="absolute bottom-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl translate-x-10 translate-y-10" />

        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full border border-sky-400/20">
              <CheckCircle2 size={10} /> Daily Reports Board
            </span>
          </div>
          
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-sky-200 bg-clip-text text-transparent">
            Daily Operational Board
          </h1>
          <p className="text-xs text-slate-400 max-w-xl font-medium">
            Central operational console to explore historical medical stats, pivot metrics, and daily patient reporting logs.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-slate-900/60 p-1.5 rounded-2xl border border-white/10 backdrop-blur-md self-stretch lg:self-auto shadow-xl relative z-10">
          <button
            onClick={() => setActiveTab('daily')}
            className={`flex-1 lg:flex-none px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 ${
              activeTab === 'daily'
                ? 'bg-gradient-to-r from-sky-500 to-sky-600 text-white shadow-md shadow-sky-500/20'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <CalendarDays size={15} /> Daily Summaries
          </button>
          <button
            onClick={() => setActiveTab('monthly')}
            className={`flex-1 lg:flex-none px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 ${
              activeTab === 'monthly'
                ? 'bg-gradient-to-r from-sky-500 to-sky-600 text-white shadow-md shadow-sky-500/20'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <BarChart3 size={15} /> Monthly Matrix
          </button>
        </div>
      </div>

      {loading && (
        <div className="bg-slate-950/40 border border-white/5 backdrop-blur-sm p-8 rounded-3xl text-center space-y-4 shadow-xl">
          <Activity className="animate-spin text-sky-500 mx-auto" size={40} />
          <p className="text-sm font-bold text-slate-400 animate-pulse">Syncing Operational Reports Registry...</p>
        </div>
      )}

      {/* ────────────────── DAILY SUMMARIES TAB ────────────────── */}
      {!loading && activeTab === 'daily' && (
        <div className="space-y-8 animate-fadeIn">
          
          {/* Date Selector and Print Actions */}
          <div className="bg-slate-950 p-4 rounded-3xl border border-white/10 shadow-lg flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-sky-500/10 text-sky-400 rounded-xl border border-sky-400/25">
                <Calendar size={18} />
              </div>
              <div>
                <p className="text-[10px] font-black text-sky-400 uppercase tracking-widest">Selected Date</p>
                <span className="text-sm font-extrabold text-white">Viewing: {selectedDate}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-2xl border border-white/10 shadow-inner w-full md:w-auto justify-between">
                <button
                  onClick={() => adjustDate(-1)}
                  className="p-2 hover:bg-white/5 rounded-xl transition font-extrabold text-slate-400 hover:text-white"
                >
                  ◀ Prev
                </button>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-slate-950 text-white font-extrabold border border-white/10 px-3 py-1.5 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                <button
                  onClick={() => adjustDate(1)}
                  className="p-2 hover:bg-white/5 rounded-xl transition font-extrabold text-slate-400 hover:text-white"
                >
                  Next ▶
                </button>
              </div>

              <button
                onClick={handlePrint}
                className="flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-2xl text-xs font-bold uppercase tracking-wider hover:opacity-90 shadow-lg shadow-emerald-500/20 active:scale-95 transition"
              >
                <Printer size={15} /> Print Summary
              </button>
            </div>
          </div>

          {/* Daily KPI Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-950 p-6 rounded-3xl border border-white/10 shadow-xl flex items-center gap-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 rounded-full blur-2xl" />
              <div className="p-4 bg-sky-500/10 text-sky-400 rounded-2xl border border-sky-400/20 shadow-md">
                <Users size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Outpatients Seen</p>
                <h3 className="text-3xl font-black text-white mt-1">{kpis.totalPatients} Patients</h3>
              </div>
            </div>

            <div className="bg-slate-950 p-6 rounded-3xl border border-white/10 shadow-xl flex items-center gap-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl" />
              <div className="p-4 bg-purple-500/10 text-purple-400 rounded-2xl border border-purple-400/20 shadow-md">
                <TrendingUp size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Top Performing Dept</p>
                <h3 className="text-lg font-black text-white mt-1">{kpis.maxDeptName}</h3>
                <span className="text-[10px] text-purple-400 font-extrabold uppercase">{kpis.maxDeptCount} Patients Seen</span>
              </div>
            </div>

            <div className="bg-slate-950 p-6 rounded-3xl border border-white/10 shadow-xl flex items-center gap-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl" />
              <div className="p-4 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-400/20 shadow-md">
                <Stethoscope size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Clinical Logs</p>
                <h3 className="text-3xl font-black text-white mt-1">{kpis.procedureCount} Procedures</h3>
              </div>
            </div>
          </div>

          {/* Filtering Ribbon */}
          <div className="bg-slate-950/60 p-4 rounded-3xl border border-white/5 shadow-md flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-3.5 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search medical specialists..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-white/10 rounded-2xl text-xs font-bold text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-inner"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="text-slate-400" size={16} />
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="w-full sm:w-60 bg-slate-900 border border-white/10 rounded-2xl px-3 py-3 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="ALL">ALL SPECIALTY DEPARTMENTS</option>
                {Object.keys(providersByDept).map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Main Visual Board Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Outpatient Specialties */}
            <div className="lg:col-span-2 space-y-6">
              <h2 className="text-sm font-black text-sky-400 uppercase tracking-widest flex items-center gap-2 border-b border-white/10 pb-2">
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
                    <div key={deptName} className="bg-slate-950 rounded-3xl border border-white/15 overflow-hidden shadow-lg hover:border-sky-500/30 transition-all duration-300">
                      
                      {/* Dept Header */}
                      <div className="px-6 py-4 bg-white/5 border-b border-white/10 flex justify-between items-center">
                        <span className="text-xs font-black text-white uppercase tracking-wider">{deptName}</span>
                        <span className="text-[10px] font-black px-2.5 py-1 bg-sky-500/10 text-sky-400 rounded-full border border-sky-400/20">
                          {deptTotal} PATIENTS
                        </span>
                      </div>

                      {/* Providers Grid */}
                      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {providers.map(provider => {
                          const count = dailyMetrics[provider.id] || 0;
                          return (
                            <div key={provider.id} className="flex items-center justify-between p-4 rounded-2xl border border-white/5 bg-slate-900/40">
                              <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-slate-800 text-slate-400 rounded-xl">
                                  <User size={16} />
                                </div>
                                <div>
                                  <p className="text-xs font-black text-white">{provider.name}</p>
                                  <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest">{provider.title || 'Specialist'}</span>
                                </div>
                              </div>

                              <span className={`text-xs font-black font-mono px-3 py-1.5 rounded-xl border ${
                                count > 0 
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-400/20' 
                                  : 'bg-slate-900 text-slate-500 border-white/5'
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
                  <div className="bg-slate-950 p-8 rounded-3xl border border-white/10 text-center text-slate-400">
                    No specialist registries match your search criteria.
                  </div>
                )}
              </div>
            </div>

            {/* Daily Operational Procedures */}
            <div className="space-y-6">
              <h2 className="text-sm font-black text-sky-400 uppercase tracking-widest flex items-center gap-2 border-b border-white/10 pb-2">
                <Stethoscope size={16} /> Clinical & Nursing Logs
              </h2>

              <div className="bg-slate-950 p-6 rounded-3xl border border-white/10 shadow-lg space-y-6">
                {config.defaultProcedureMetrics.map(mName => {
                  const val = dailyLogs[mName] || '0';
                  const isNumber = !isNaN(parseInt(val, 10));
                  const isZero = val === '0' || val === '';

                  return (
                    <div key={mName} className="flex items-center justify-between p-4 bg-slate-900/60 rounded-2xl border border-white/5">
                      <div>
                        <span className="text-xs font-black text-slate-350 block uppercase tracking-wider">{mName}</span>
                        <span className="text-[9px] text-slate-500 font-extrabold uppercase">DAILY METRIC</span>
                      </div>
                      
                      <span className={`text-xs font-black font-mono px-3 py-1.5 rounded-xl border ${
                        !isZero 
                          ? 'bg-sky-500/10 text-sky-400 border-sky-400/20' 
                          : 'bg-slate-950 text-slate-600 border-white/5'
                      }`}>
                        {val}
                      </span>
                    </div>
                  );
                })}

                {config.defaultProcedureMetrics.length === 0 && (
                  <p className="text-slate-400 text-xs text-center py-4">No special operational metrics defined.</p>
                )}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ────────────────── MONTHLY MATRIX EXPLORER TAB ────────────────── */}
      {!loading && activeTab === 'monthly' && (
        <div className="space-y-8 animate-fadeIn">
          
          {/* Calendar Selectors */}
          <div className="bg-slate-950 p-4 rounded-3xl border border-white/10 shadow-lg flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-400/25">
                <FileSpreadsheet size={18} />
              </div>
              <div>
                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Monthly Period</p>
                <span className="text-sm font-extrabold text-white">Period: {selectedMonth}/{selectedYear}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-2xl border border-white/10 shadow-inner w-full md:w-auto">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="bg-slate-950 text-white font-extrabold border border-white/10 px-3 py-2 rounded-xl text-xs focus:outline-none"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                    <option key={m} value={m}>Month {String(m).padStart(2, '0')}</option>
                  ))}
                </select>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="bg-slate-950 text-white font-extrabold border border-white/10 px-3 py-2 rounded-xl text-xs focus:outline-none"
                >
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={handlePrint}
                className="flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-2xl text-xs font-bold uppercase tracking-wider hover:opacity-90 shadow-lg shadow-emerald-500/20 active:scale-95 transition w-full md:w-auto"
              >
                <Printer size={15} /> Print Matrix
              </button>
            </div>
          </div>

          {/* Filtering Ribbon */}
          <div className="bg-slate-950/60 p-4 rounded-3xl border border-white/5 shadow-md flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-3.5 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search staff, specialties, logs..."
                value={monthlySearchQuery}
                onChange={(e) => setMonthlySearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-white/10 rounded-2xl text-xs font-bold text-white placeholder-slate-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="text-slate-400" size={16} />
              <select
                value={monthlyDeptFilter}
                onChange={(e) => setMonthlyDeptFilter(e.target.value)}
                className="w-full sm:w-60 bg-slate-900 border border-white/10 rounded-2xl px-3 py-3 text-xs font-bold text-white focus:outline-none"
              >
                <option value="ALL">ALL SPECIALTY DEPARTMENTS</option>
                {Object.keys(providersByDept).map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Pivot Matrix Table */}
          {monthlyData ? (
            <div className="bg-slate-950 rounded-3xl border border-white/10 shadow-2xl overflow-hidden print:shadow-none print:border-none">
              
              <div className="p-6 border-b border-white/10 bg-white/5 flex justify-between items-center">
                <div>
                  <h3 className="text-xs font-black uppercase text-white tracking-widest">Institutional Operational Matrix</h3>
                  <span className="text-[10px] text-slate-500 font-extrabold uppercase">Read-only overview</span>
                </div>
                <div className="text-[10px] font-black text-sky-400 px-3 py-1.5 bg-sky-500/10 border border-sky-400/20 rounded-full">
                  MONTHLY TOTALS LOGGED
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-900 border-b border-white/10">
                      <th className="sticky left-0 bg-slate-900 text-left px-4 py-3.5 min-w-[150px] border-r border-white/10 font-black text-white text-xs tracking-wider z-20">
                        Staff Specialist
                      </th>
                      <th className="text-left px-4 py-3.5 min-w-[120px] border-r border-white/10 font-black text-slate-400 text-xs tracking-wider">
                        Department
                      </th>

                      {getDaysArray().map(day => (
                        <th key={day} className="text-center w-10 min-w-[36px] py-3.5 border-r border-white/10 font-bold text-[10px] text-slate-400 bg-white/5">
                          {day}
                        </th>
                      ))}

                      <th className="text-center px-4 py-3.5 min-w-[80px] font-black text-sky-400 bg-sky-500/10 border-l border-white/10">
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
                          <tr key={provider.id} className="border-b border-white/5 hover:bg-white/5 transition-all">
                            <td className="sticky left-0 bg-slate-950 px-4 py-3.5 font-bold text-white text-xs border-r border-white/10 z-10">
                              {provider.name}
                            </td>
                            <td className="px-4 py-3.5 text-xs text-slate-400 border-r border-white/10">
                              {deptName}
                            </td>

                            {getDaysArray().map(day => {
                              const val = daysMap[day];
                              return (
                                <td key={day} className={`text-center py-3.5 border-r border-white/5 font-mono text-[11px] ${
                                  val > 0 ? 'text-emerald-400 font-bold bg-emerald-500/5' : 'text-slate-700'
                                }`}>
                                  {val}
                                </td>
                              );
                            })}

                            <td className="text-center font-bold text-sky-400 bg-sky-500/10 text-xs border-l border-white/10">
                              {providerSum}
                            </td>
                          </tr>
                        );
                      })}

                    {/* Section Header for Procedures */}
                    <tr className="bg-slate-900/60 border-t border-b border-white/10 font-bold">
                      <td colSpan={2 + getDaysArray().length + 1} className="px-4 py-3 text-xs font-black text-sky-400 uppercase tracking-widest">
                        Nursing and Ward Procedures
                      </td>
                    </tr>

                    {/* Filtered Clinical Procedures rows */}
                    {config.defaultProcedureMetrics
                      .filter(mName => {
                        if (monthlyDeptFilter !== 'ALL') return false; // procedures don't belong to medical depts
                        if (monthlySearchQuery.trim() !== '') {
                          return mName.toLowerCase().includes(monthlySearchQuery.toLowerCase());
                        }
                        return true;
                      })
                      .map(metricName => {
                        const daysMap = {};
                        let procedureSum = 0;

                        getDaysArray().forEach(day => {
                          const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                          const record = monthlyData.logs.find(l => l.metric_name === metricName && l.report_date === dateStr);
                          const val = record ? record.metric_value : '0';
                          daysMap[day] = val;
                          
                          const numVal = parseInt(val, 10);
                          if (!isNaN(numVal)) {
                            procedureSum += numVal;
                          }
                        });

                        return (
                          <tr key={metricName} className="border-b border-white/5 hover:bg-white/5 transition-all text-slate-350">
                            <td className="sticky left-0 bg-slate-950 px-4 py-3.5 font-bold text-white text-xs border-r border-white/10 z-10">
                              {metricName}
                            </td>
                            <td className="px-4 py-3.5 text-xs text-slate-500 border-r border-white/10">
                              PROCEDURES
                            </td>

                            {getDaysArray().map(day => {
                              const val = daysMap[day];
                              const isZero = val === '0' || val === '' || val === undefined;
                              return (
                                <td key={day} className={`text-center py-3.5 border-r border-white/5 font-mono text-[11px] ${
                                  !isZero ? 'text-sky-400 font-bold bg-sky-500/5' : 'text-slate-700'
                                }`}>
                                  {val}
                                </td>
                              );
                            })}

                            <td className="text-center font-bold text-sky-400 bg-sky-500/10 text-xs border-l border-white/10">
                              {procedureSum}
                            </td>
                          </tr>
                        );
                      })}

                    {/* Column Total Sum row */}
                    <tr className="bg-sky-950 text-white font-extrabold border-t border-sky-900">
                      <td colSpan={2} className="sticky left-0 bg-sky-950 text-left px-4 py-4 border-r border-sky-900 font-black uppercase text-[10px] tracking-wider z-20">
                        Total Provider Patients
                      </td>

                      {getDaysArray().map(day => {
                        const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const dailySum = monthlyData.metrics
                          .filter(m => m.report_date === dateStr)
                          .reduce((sum, m) => sum + m.patient_count, 0);

                        return (
                          <td key={day} className="text-center py-4 border-r border-sky-900/40 font-mono text-xs">
                            {dailySum}
                          </td>
                        );
                      })}

                      <td className="text-center font-black bg-sky-900 py-4 text-xs">
                        {monthlyData.metrics.reduce((sum, m) => sum + m.patient_count, 0)}
                      </td>
                    </tr>

                  </tbody>
                </table>
              </div>

            </div>
          ) : (
            <div className="bg-slate-950 p-8 rounded-3xl border border-white/10 text-center text-slate-400">
              No monthly report matrix dataset is loaded for the selected period.
            </div>
          )}

        </div>
      )}

      {/* ── PRINT-ONLY OPTIMIZED STYLES ── */}
      <style>{`
        @media print {
          body {
            background-color: white !important;
            color: black !important;
          }
          .min-h-screen {
            background-color: white !important;
            color: black !important;
            padding: 0 !important;
          }
          select, input, button {
            display: none !important;
          }
          th, td {
            color: black !important;
            border-color: #cbd5e1 !important;
            background-color: white !important;
          }
          th {
            border-bottom: 2px solid black !important;
          }
          .bg-slate-950, .bg-slate-900, .bg-sky-950, .bg-sky-900, .bg-sky-500\/10, .bg-emerald-500\/10 {
            background-color: white !important;
            background: none !important;
            color: black !important;
            border-color: #cbd5e1 !important;
          }
          h1, h2, h3, p, span {
            color: black !important;
            background: none !important;
          }
          .sticky {
            position: relative !important;
            left: auto !important;
          }
        }
      `}</style>

    </div>
  );
}
