import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUsers } from '../api/users';
import api from '../api/axios';
import { getIncidents } from '../api/incidents';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  Users, Activity, ShieldAlert, History,
  Server, RefreshCw, ChevronRight, UserPlus,
  LifeBuoy, Search, AlertCircle, ArrowUpRight,
  Laptop, CheckCircle2, Clock, Filter
} from 'lucide-react';

// ── Metrics Card Component ───────────────────────────────────────────────────
const ITMetricCard = ({ title, value, sub, icon: Icon, colorClass, borderClass, bgClass, onClick }) => (
  <div 
    onClick={onClick}
    className={`bg-white rounded-2xl p-5 border ${borderClass || 'border-slate-200'} shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between ${onClick ? 'cursor-pointer hover:-translate-y-0.5' : ''}`}
  >
    <div className="flex items-center justify-between mb-3">
      <div className={`p-3 rounded-xl ${bgClass} ${colorClass}`}>
        <Icon size={22} />
      </div>
      {onClick && (
        <span className="text-slate-400 hover:text-slate-600 transition-colors">
          <ArrowUpRight size={16} />
        </span>
      )}
    </div>
    <div>
      <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">{title}</p>
      <div className="flex items-baseline gap-2">
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">{value}</h2>
        {sub && <span className="text-xs font-semibold text-slate-500">{sub}</span>}
      </div>
    </div>
  </div>
);

// ── Activity Log Row Component ───────────────────────────────────────────────
const ActivityRow = ({ log }) => {
  const getActionBadge = (action) => {
    switch (action?.toUpperCase()) {
      case 'LOGIN':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'LOGOUT':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      case 'CREATE':
      case 'ADD':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'UPDATE':
      case 'EDIT':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'DELETE':
      case 'REMOVE':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    }
  };

  return (
    <div className="flex items-center gap-3 p-3.5 hover:bg-slate-50/70 border-b border-slate-100 transition-colors">
      <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-extrabold text-xs shrink-0">
        {log.user_name?.[0]?.toUpperCase() || 'U'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-slate-850 truncate">
          {log.user_name || 'System User'}{' '}
          <span className="font-semibold text-slate-500">{(log.action || '').toLowerCase()}</span>{' '}
          <span className="text-slate-700 font-bold">{log.entity_type?.replace(/_/g, ' ') || ''}</span>
        </p>
        <p className="text-[10px] text-slate-400 font-medium mt-0.5 flex items-center gap-1">
          <Clock size={10} className="text-slate-400" />
          {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {log.ip_address || 'Internal IP'}
        </p>
      </div>
      <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-md border uppercase tracking-wider ${getActionBadge(log.action)}`}>
        {log.action}
      </span>
    </div>
  );
};

// ── Ticket Item Component ────────────────────────────────────────────────────
const TicketSummaryItem = ({ ticket, onClick }) => {
  const priorityStyle = {
    High: 'bg-rose-50 text-rose-700 border-rose-200',
    Critical: 'bg-red-100 text-red-800 border-red-300 font-black',
    Medium: 'bg-amber-50 text-amber-700 border-amber-200',
    Low: 'bg-slate-100 text-slate-600 border-slate-200'
  }[ticket.priority] || 'bg-slate-100 text-slate-600 border-slate-200';

  const statusStyle = {
    Open: 'bg-rose-500',
    'In Progress': 'bg-sky-500',
    Resolved: 'bg-emerald-500',
    Closed: 'bg-slate-400'
  }[ticket.status] || 'bg-slate-400';

  return (
    <div 
      onClick={onClick}
      className="p-3.5 rounded-xl border border-slate-150 bg-white hover:border-slate-300 hover:shadow-xs transition-all cursor-pointer flex items-center justify-between gap-3"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className={`w-2 h-2 rounded-full ${statusStyle}`} />
          <span className="text-xs font-black text-slate-800 truncate">{ticket.ticket_number || `#${ticket.id}`} · {ticket.subject || ticket.title}</span>
        </div>
        <p className="text-[11px] text-slate-500 font-medium truncate">
          Requested by <span className="font-bold text-slate-700">{ticket.requested_by_name || ticket.reporter_name || 'Staff Member'}</span>
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={`text-[9px] px-2 py-0.5 rounded-md border uppercase tracking-wider font-extrabold ${priorityStyle}`}>
          {ticket.priority || 'Normal'}
        </span>
        <ChevronRight size={14} className="text-slate-400" />
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
const ITDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState({
    users: [],
    logs: [],
    incidents: [],
    tickets: []
  });
  const [loading, setLoading] = useState(true);
  const [logSearch, setLogSearch] = useState('');
  const [logFilter, setLogFilter] = useState('ALL');
  const [now, setNow] = useState(new Date());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [uRes, lRes, iRes, tkRes] = await Promise.all([
        getUsers().catch(() => ({ data: { data: [] } })),
        api.get('/audit').catch(() => ({ data: { data: [] } })),
        getIncidents().catch(() => ({ data: { data: [] } })),
        api.get('/it-support/tickets').catch(() => ({ data: { tickets: [] } }))
      ]);
      setData({
        users: uRes.data.data || [],
        logs: lRes.data.data || [],
        incidents: iRes.data.data || [],
        tickets: tkRes.data.tickets || []
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { 
    load();
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, [load]);

  if (loading) return <LoadingSpinner />;

  const activeUsers = data.users.filter(u => u.is_active).length;
  const systemIncidents = data.incidents.filter(inc => inc.incident_type === 'Equipment' || inc.incident_type === 'Others');
  const openTickets = data.tickets.filter(t => t.status === 'Open').length;
  const inProgressTickets = data.tickets.filter(t => t.status === 'In Progress').length;
  const recentTickets = data.tickets.slice(0, 5);

  const filteredLogs = data.logs.filter(log => {
    const matchesSearch = (log.user_name || '').toLowerCase().includes(logSearch.toLowerCase()) ||
                          (log.action || '').toLowerCase().includes(logSearch.toLowerCase()) ||
                          (log.entity_type || '').toLowerCase().includes(logSearch.toLowerCase());
    const matchesFilter = logFilter === 'ALL' || (log.action || '').toUpperCase() === logFilter;
    return matchesSearch && matchesFilter;
  }).slice(0, 10);

  const greeting = now.getHours() < 12 ? 'Good Morning' : now.getHours() < 17 ? 'Good Afternoon' : 'Good Evening';

  return (
    <div className="space-y-6 pb-12">
      {/* ── IT Command Center Hero Banner ── */}
      <div className="bg-gradient-to-r from-sky-700 via-sky-800 to-indigo-900 rounded-3xl p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-bold uppercase tracking-wider mb-3 text-sky-200">
              <Server size={14} className="text-emerald-400" />
              <span>IT Administration Terminal</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">{greeting}, {user?.fullName?.split(' ')[0] || 'IT Officer'} 👋</h1>
            <p className="text-xs md:text-sm text-sky-150 font-medium mt-1.5 max-w-xl leading-relaxed">
              Unified Infrastructure Monitoring, Support Ticketing & Staff Management.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={load}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold backdrop-blur-md transition-all border border-white/20 cursor-pointer"
              title="Refresh Dashboard Data"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
            <div className="px-4 py-2.5 rounded-xl bg-black/20 text-xs font-bold text-sky-200 border border-white/10">
              {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Top Metrics Overview ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ITMetricCard 
          title="Active Staff Accounts" 
          value={activeUsers} 
          sub={`/ ${data.users.length} total`}
          icon={Users} 
          colorClass="text-sky-600"
          bgClass="bg-sky-50"
          borderClass="border-slate-200"
          onClick={() => navigate('/users')}
        />
        <ITMetricCard 
          title="Audit Volume (24h)" 
          value={data.logs.length} 
          sub="System events"
          icon={Activity} 
          colorClass="text-indigo-600"
          bgClass="bg-indigo-50"
          borderClass="border-slate-200"
          onClick={() => navigate('/audit-logs')}
        />
        <ITMetricCard 
          title="Technical Incidents" 
          value={systemIncidents.length} 
          sub="Active reports"
          icon={ShieldAlert} 
          colorClass="text-rose-600"
          bgClass="bg-rose-50"
          borderClass="border-slate-200"
          onClick={() => navigate('/incidents')}
        />
        <ITMetricCard 
          title="Open Support Tickets" 
          value={openTickets} 
          sub={inProgressTickets > 0 ? `${inProgressTickets} in progress` : 'All queued'}
          icon={LifeBuoy} 
          colorClass={openTickets > 0 ? 'text-amber-600' : 'text-emerald-600'}
          bgClass={openTickets > 0 ? 'bg-amber-50' : 'bg-emerald-50'}
          borderClass={openTickets > 0 ? 'border-amber-200' : 'border-slate-200'}
          onClick={() => navigate('/it-ticketing')}
        />
      </div>

      {/* ── Main Dashboard Content Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Real-time System Audit Stream (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-sky-50 text-sky-600">
                <History size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-800">System Audit Stream</h3>
                <p className="text-[11px] text-slate-500 font-medium">Real-time user actions & security log events</p>
              </div>
            </div>
            <button 
              onClick={() => navigate('/audit-logs')} 
              className="inline-flex items-center gap-1 text-xs font-bold text-sky-600 hover:text-sky-700 transition-colors"
            >
              <span>Full Audit Logs</span>
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Search & Filter Bar */}
          <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by user, action, module..."
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs font-medium outline-none focus:border-sky-400"
              />
            </div>
            <select
              value={logFilter}
              onChange={(e) => setLogFilter(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-600 outline-none focus:border-sky-400"
            >
              <option value="ALL">All Actions</option>
              <option value="LOGIN">Logins</option>
              <option value="CREATE">Created</option>
              <option value="UPDATE">Updated</option>
              <option value="DELETE">Deleted</option>
            </select>
          </div>

          {/* Audit Rows */}
          <div className="divide-y divide-slate-100 flex-1 overflow-y-auto max-h-[440px]">
            {filteredLogs.map((log, idx) => (
              <ActivityRow key={log.id || idx} log={log} />
            ))}
            {filteredLogs.length === 0 && (
              <div className="p-10 text-center text-slate-400 text-xs font-semibold">
                No recent audit events match your search filters.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Admin Actions & Support Tickets (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Quick Admin Actions Grid */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs">
            <h3 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
              <Server size={16} className="text-sky-600" />
              <span>Admin Quick Actions</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-3">
              <button 
                onClick={() => navigate('/users')}
                className="p-3.5 rounded-2xl border border-slate-200 hover:border-sky-300 hover:bg-sky-50/50 transition-all flex flex-col items-center gap-2 text-center group cursor-pointer"
              >
                <div className="p-2.5 rounded-xl bg-sky-50 text-sky-600 group-hover:scale-110 transition-transform">
                  <Users size={18} />
                </div>
                <span className="text-xs font-bold text-slate-700">Manage Staff</span>
              </button>

              <button 
                onClick={() => navigate('/users')}
                className="p-3.5 rounded-2xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition-all flex flex-col items-center gap-2 text-center group cursor-pointer"
              >
                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 group-hover:scale-110 transition-transform">
                  <UserPlus size={18} />
                </div>
                <span className="text-xs font-bold text-slate-700">New Account</span>
              </button>

              <button 
                onClick={() => navigate('/audit-logs')}
                className="p-3.5 rounded-2xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all flex flex-col items-center gap-2 text-center group cursor-pointer"
              >
                <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 group-hover:scale-110 transition-transform">
                  <History size={18} />
                </div>
                <span className="text-xs font-bold text-slate-700">Trace Logs</span>
              </button>

              <button 
                onClick={() => navigate('/it-ticketing')}
                className="p-3.5 rounded-2xl border border-slate-200 hover:border-sky-300 hover:bg-sky-50/50 transition-all flex flex-col items-center gap-2 text-center group cursor-pointer relative"
              >
                <div className="p-2.5 rounded-xl bg-sky-50 text-sky-600 group-hover:scale-110 transition-transform">
                  <Laptop size={18} />
                </div>
                <span className="text-xs font-bold text-slate-700">Asset & IT Support</span>
                {openTickets > 0 && (
                  <span className="absolute top-2 right-2 bg-rose-500 text-white text-[9px] font-black rounded-full px-1.5 py-0.5">
                    {openTickets}
                  </span>
                )}
              </button>

              <button 
                onClick={() => navigate('/incidents')}
                className="p-3.5 rounded-2xl border border-slate-200 hover:border-rose-300 hover:bg-rose-50/50 transition-all flex flex-col items-center gap-2 text-center group cursor-pointer col-span-2 sm:col-span-1 lg:col-span-2"
              >
                <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600 group-hover:scale-110 transition-transform">
                  <ShieldAlert size={18} />
                </div>
                <span className="text-xs font-bold text-slate-700">Incident Reports</span>
              </button>
            </div>
          </div>

          {/* IT Support Tickets Quick Overview */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <LifeBuoy size={16} className="text-amber-500" />
                <span>Recent Support Tickets</span>
              </h3>
              <button 
                onClick={() => navigate('/it-ticketing')}
                className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-0.5"
              >
                <span>View All</span>
                <ChevronRight size={14} />
              </button>
            </div>

            <div className="space-y-2">
              {recentTickets.map(ticket => (
                <TicketSummaryItem 
                  key={ticket.id} 
                  ticket={ticket} 
                  onClick={() => navigate('/it-ticketing')}
                />
              ))}
              {recentTickets.length === 0 && (
                <div className="p-6 text-center text-slate-400 text-xs font-semibold bg-slate-50 rounded-2xl border border-slate-100">
                  No open support tickets at this time.
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default ITDashboard;
