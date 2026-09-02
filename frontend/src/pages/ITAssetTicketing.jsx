import { useState, useEffect } from 'react';
import {
  Monitor, LifeBuoy, Server, Wrench,
  CheckCircle, AlertTriangle, Plus, X, Search, Trash2,
  Laptop, Code, Wifi, Key, Clock, User, MapPin, Sparkles, Check,
  Activity, Shield, Calendar, Printer, HardDrive, Router,
  UserCheck, FileText, Tag, Package
} from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

// ─── Priority Indicator ──────────────────────────────────────────────────────
const PriorityIndicator = ({ priority }) => {
  const bars = {
    Low:      { count: 1, color: 'bg-slate-400',  text: 'text-slate-600',  bg: 'bg-slate-50 border-slate-200' },
    Medium:   { count: 2, color: 'bg-amber-500',   text: 'text-amber-700',  bg: 'bg-amber-50 border-amber-200' },
    High:     { count: 3, color: 'bg-rose-500',    text: 'text-rose-700',   bg: 'bg-rose-50 border-rose-200 animate-pulse-light' },
    Critical: { count: 3, color: 'bg-red-700',     text: 'text-red-800',    bg: 'bg-red-50 border-red-400 animate-pulse-light' },
  }[priority] || { count: 1, color: 'bg-slate-400', text: 'text-slate-600', bg: 'bg-slate-100 border-slate-200' };

  return (
    <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-xl border text-[10px] font-black uppercase tracking-wider ${bars.bg}`}>
      <div className="flex gap-0.5 items-end h-3.5">
        <div className={`w-1 h-1.5 rounded-sm transition-colors ${bars.count >= 1 ? bars.color : 'bg-slate-200'}`} />
        <div className={`w-1 h-2.5 rounded-sm transition-colors ${bars.count >= 2 ? bars.color : 'bg-slate-200'}`} />
        <div className={`w-1 h-3.5 rounded-sm transition-colors ${bars.count >= 3 ? bars.color : 'bg-slate-200'}`} />
      </div>
      <span className={bars.text}>{priority}</span>
      {priority === 'Critical' && <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-ping" />}
    </div>
  );
};

// ─── Category Badge ───────────────────────────────────────────────────────────
const CategoryBadge = ({ category }) => {
  const cfg = {
    Hardware:         { icon: <Laptop size={12} />,   color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    Software:         { icon: <Code size={12} />,     color: 'bg-purple-50 text-purple-700 border-purple-200' },
    Network:          { icon: <Wifi size={12} />,     color: 'bg-sky-50 text-sky-700 border-sky-200' },
    Provisioning:     { icon: <Key size={12} />,      color: 'bg-amber-50 text-amber-700 border-amber-200' },
    'System Access':  { icon: <Shield size={12} />,   color: 'bg-violet-50 text-violet-700 border-violet-200' },
    'Printer/Scanner':{ icon: <Printer size={12} />,  color: 'bg-teal-50 text-teal-700 border-teal-200' },
  }[category] || { icon: <LifeBuoy size={12} />, color: 'bg-slate-50 text-slate-700 border-slate-200' };

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[10px] font-black uppercase tracking-wider ${cfg.color}`}>
      {cfg.icon}
      <span>{category}</span>
    </div>
  );
};

// ─── Status Pill ──────────────────────────────────────────────────────────────
const StatusPill = ({ status }) => {
  const cfg = {
    Open:        { dotColor: 'bg-rose-500 animate-pulse-glow',  text: 'text-rose-700',    bg: 'bg-rose-50 border-rose-200' },
    'In Progress':{ dotColor: 'bg-sky-500 animate-ping-slow',   text: 'text-sky-700',     bg: 'bg-sky-50 border-sky-200' },
    Resolved:    { dotColor: 'bg-emerald-500',                  text: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
    Closed:      { dotColor: 'bg-slate-400',                    text: 'text-slate-600',   bg: 'bg-slate-100 border-slate-300' },
  }[status] || { dotColor: 'bg-slate-500', text: 'text-slate-700', bg: 'bg-slate-50 border-slate-200' };

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold ${cfg.bg}`}>
      <span className={`w-2 h-2 rounded-full ${cfg.dotColor}`} />
      <span className={cfg.text}>{status}</span>
    </div>
  );
};

// ─── Warranty Badge ───────────────────────────────────────────────────────────
const WarrantyBadge = ({ warrantyExpiry }) => {
  if (!warrantyExpiry) return <span className="text-xs text-slate-400 font-semibold">N/A</span>;
  const today = new Date();
  const expiry = new Date(warrantyExpiry);
  const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

  if (diffDays < 0)
    return <span className="text-[10px] font-black text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-lg">Expired</span>;
  if (diffDays <= 90)
    return <span className="text-[10px] font-black text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg">Expiring {diffDays}d</span>;
  return <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg">{expiry.toLocaleDateString()}</span>;
};

// ─── Main Component ───────────────────────────────────────────────────────────
const ITAssetTicketing = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('tickets');
  const [tickets, setTickets] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals & Panels
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);

  // Ticket Form
  const [ticketForm, setTicketForm] = useState({
    title: '',
    description: '',
    reporter: '',
    category: 'Hardware',
    priority: 'Medium',
    working_station: 'Doctors',
    assigned_to: '',
    resolution_notes: '',
  });

  // Asset Form
  const [assetForm, setAssetForm] = useState({
    name: '',
    assigned_to: '',
    department: 'OPERATIONS',
    status: 'Active',
    asset_type: 'Computer',
    serial_number: '',
    purchase_date: '',
    warranty_expiry: '',
  });

  // Prefill reporter name once user is loaded
  useEffect(() => {
    if (user) {
      setTicketForm(prev => ({
        ...prev,
        reporter: user.fullName || user.username || ''
      }));
    }
  }, [user]);

  // Search & Filter state
  const [ticketSearch, setTicketSearch] = useState('');
  const [ticketFilterStatus, setTicketFilterStatus] = useState('');
  const [ticketFilterPriority, setTicketFilterPriority] = useState('');
  const [ticketFilterCategory, setTicketFilterCategory] = useState('');
  const [ticketFilterStation, setTicketFilterStation] = useState('');
  const [assetSearch, setAssetSearch] = useState('');
  const [assetFilterStatus, setAssetFilterStatus] = useState('');

  const isITStaff = user?.role === 'admin' || user?.role === 'it_officer';

  // Fetch data
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (isITStaff) {
        const [ticketsRes, assetsRes] = await Promise.all([
          api.get('/it-support/tickets'),
          api.get('/it-support/assets')
        ]);
        setTickets(ticketsRes.data.tickets || []);
        setAssets(assetsRes.data.assets || []);
      } else {
        const ticketsRes = await api.get('/it-support/tickets');
        setTickets(ticketsRes.data.tickets || []);
        setAssets([]);
      }
    } catch (err) {
      console.error('Failed to load IT Support Hub data:', err);
      setError('Failed to fetch data from the server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  // ── CRUD Handlers ──────────────────────────────────────────────────────────
  const handleCreateTicket = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/it-support/tickets', ticketForm);
      if (res.data.success) {
        setTickets([res.data.ticket, ...tickets]);
        setShowTicketModal(false);
        setTicketForm({
          title: '', description: '',
          reporter: user?.fullName || user?.username || '',
          category: 'Hardware', priority: 'Medium', working_station: 'Doctors',
          assigned_to: '', resolution_notes: '',
        });
        toast.success('Support ticket submitted successfully!');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create ticket');
    }
  };

  const handleCreateAsset = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/it-support/assets', assetForm);
      if (res.data.success) {
        setAssets([...assets, res.data.asset]);
        setShowAssetModal(false);
        setAssetForm({ name: '', assigned_to: '', department: 'OPERATIONS', status: 'Active', asset_type: 'Computer', serial_number: '', purchase_date: '', warranty_expiry: '' });
        toast.success('New asset logged successfully!');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add asset');
    }
  };

  const handleUpdateTicket = async (id, updates) => {
    try {
      const res = await api.put(`/it-support/tickets/${id}`, updates);
      if (res.data.success) {
        setTickets(tickets.map(t => t.id === id ? { ...t, ...updates } : t));
        if (selectedTicket?.id === id) setSelectedTicket({ ...selectedTicket, ...updates });
        toast.success('Ticket updated!');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update ticket');
    }
  };

  const handleUpdateAsset = async (id, updates) => {
    try {
      const res = await api.put(`/it-support/assets/${id}`, updates);
      if (res.data.success) {
        setAssets(assets.map(a => a.id === id ? { ...a, ...updates } : a));
        toast.success('Asset updated!');
      }
    } catch (err) {
      toast.error('Failed to update asset');
    }
  };

  const handleDeleteTicket = async (id) => {
    if (!window.confirm('Are you sure you want to delete this ticket?')) return;
    try {
      const res = await api.delete(`/it-support/tickets/${id}`);
      if (res.data.success) {
        setTickets(tickets.filter(t => t.id !== id));
        if (selectedTicket?.id === id) setSelectedTicket(null);
        toast.success('Ticket removed.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete ticket');
    }
  };

  const handleDeleteAsset = async (id) => {
    if (!window.confirm('Are you sure you want to delete this asset?')) return;
    try {
      const res = await api.delete(`/it-support/assets/${id}`);
      if (res.data.success) {
        setAssets(assets.filter(a => a.id !== id));
        toast.success('Asset deleted.');
      }
    } catch (err) {
      toast.error('Failed to delete asset');
    }
  };

  // ── Stats ──────────────────────────────────────────────────────────────────
  const totalTickets       = tickets.length;
  const openTickets        = tickets.filter(t => t.status === 'Open').length;
  const inProgressTickets  = tickets.filter(t => t.status === 'In Progress').length;
  const resolvedTickets    = tickets.filter(t => t.status === 'Resolved').length;
  const totalAssets        = assets.length;
  const activeAssets       = assets.filter(a => a.status === 'Active').length;
  const repairAssets       = assets.filter(a => a.status === 'Needs Repair').length;

  // ── Filtered Lists ─────────────────────────────────────────────────────────
  const filteredTickets = tickets.filter(ticket => {
    const q = ticketSearch.toLowerCase();
    const matchSearch = (ticket.title?.toLowerCase() || '').includes(q) ||
      (ticket.ticket_number?.toLowerCase() || '').includes(q) ||
      (ticket.reporter?.toLowerCase() || '').includes(q) ||
      (ticket.working_station?.toLowerCase() || '').includes(q);
    const matchStatus   = !ticketFilterStatus   || ticket.status === ticketFilterStatus;
    const matchPriority = !ticketFilterPriority || ticket.priority === ticketFilterPriority;
    const matchCategory = !ticketFilterCategory || ticket.category === ticketFilterCategory;
    const matchStation  = !ticketFilterStation  || ticket.working_station === ticketFilterStation;
    return matchSearch && matchStatus && matchPriority && matchCategory && matchStation;
  });

  const filteredAssets = assets.filter(asset => {
    const q = assetSearch.toLowerCase();
    const matchSearch = (asset.name?.toLowerCase() || '').includes(q) ||
      (asset.asset_tag?.toLowerCase() || '').includes(q) ||
      (asset.assigned_to?.toLowerCase() || '').includes(q) ||
      (asset.serial_number?.toLowerCase() || '').includes(q);
    const matchStatus = !assetFilterStatus || asset.status === assetFilterStatus;
    return matchSearch && matchStatus;
  });

  // ── Working Stations ───────────────────────────────────────────────────────
  const WORKING_STATIONS = [
    'Doctors', 'Nurses', 'Customer Care', 'Imaging', 'LAB Staff',
    'Operations', 'Dental', 'Physio', 'Cashier', 'Procurement',
    'Stock Room', 'IT Department', 'Other'
  ];

  // ── Ticket Stats ───────────────────────────────────────────────────────────
  const renderTicketStats = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
      <div className="bg-gradient-to-br from-white to-slate-50/60 p-6 rounded-3xl border border-slate-200/60 shadow-sm flex flex-col justify-between hover:scale-[1.01] hover:shadow-md transition-all duration-300 group">
        <div className="flex justify-between items-start">
          <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Total Tickets</span>
          <span className="p-2 bg-slate-100 rounded-xl text-slate-500 group-hover:bg-slate-200 transition-colors"><Server size={16} /></span>
        </div>
        <span className="text-4xl font-extrabold text-slate-800 mt-4 tracking-tight">{totalTickets}</span>
      </div>

      <div className="bg-gradient-to-br from-white to-rose-50/20 p-6 rounded-3xl border border-slate-200/60 shadow-sm flex flex-col justify-between hover:scale-[1.01] hover:shadow-md transition-all duration-300 group">
        <div className="flex justify-between items-start">
          <span className="text-xs font-black text-rose-500 uppercase tracking-widest">Open</span>
          <span className="p-2 bg-rose-50 rounded-xl text-rose-500 group-hover:bg-rose-100 transition-colors"><AlertTriangle size={16} /></span>
        </div>
        <div className="flex items-baseline gap-2 mt-4">
          <span className="text-4xl font-extrabold text-rose-600 tracking-tight">{openTickets}</span>
          {openTickets > 0 && (
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
          )}
        </div>
      </div>

      <div className="bg-gradient-to-br from-white to-sky-50/20 p-6 rounded-3xl border border-slate-200/60 shadow-sm flex flex-col justify-between hover:scale-[1.01] hover:shadow-md transition-all duration-300 group">
        <div className="flex justify-between items-start">
          <span className="text-xs font-black text-sky-500 uppercase tracking-widest">In Progress</span>
          <span className="p-2 bg-sky-50 rounded-xl text-sky-500 group-hover:bg-sky-100 transition-colors"><Wrench size={16} /></span>
        </div>
        <span className="text-4xl font-extrabold text-sky-600 mt-4 tracking-tight">{inProgressTickets}</span>
      </div>

      <div className="bg-gradient-to-br from-white to-emerald-50/20 p-6 rounded-3xl border border-slate-200/60 shadow-sm flex flex-col justify-between hover:scale-[1.01] hover:shadow-md transition-all duration-300 group">
        <div className="flex justify-between items-start">
          <span className="text-xs font-black text-emerald-500 uppercase tracking-widest">Resolved</span>
          <span className="p-2 bg-emerald-50 rounded-xl text-emerald-500 group-hover:bg-emerald-100 transition-colors"><CheckCircle size={16} /></span>
        </div>
        <span className="text-4xl font-extrabold text-emerald-600 mt-4 tracking-tight">{resolvedTickets}</span>
      </div>
    </div>
  );

  // ── System Status Banner ───────────────────────────────────────────────────
  const renderSystemStatusBar = () => (
    <div className="bg-slate-900 text-slate-100 rounded-3xl p-5 mb-8 border border-slate-800 shadow-xl flex flex-col md:flex-row justify-between items-center gap-4 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-36 h-36 bg-sky-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="flex items-center gap-4">
        <div className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
        </div>
        <div>
          <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase block mb-0.5">Clinic Support State</span>
          <span className="text-sm font-bold text-white flex items-center gap-2">ALL CLINICAL HOSTS ONLINE</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-5 text-[11px] font-bold text-slate-400">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/60 rounded-xl border border-slate-700/50">
          <Activity size={12} className="text-emerald-400" />
          <span>Portal: <strong className="text-white">Operational</strong></span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/60 rounded-xl border border-slate-700/50">
          <Shield size={12} className="text-sky-400" />
          <span>Auth: <strong className="text-white">Active</strong></span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/60 rounded-xl border border-slate-700/50">
          <Clock size={12} className="text-purple-400" />
          <span>IT Support: <strong className="text-white">On-Duty</strong></span>
        </div>
      </div>
    </div>
  );

  // ── Ticket Creation Modal ──────────────────────────────────────────────────
  const renderTicketModal = () => (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200/80 overflow-hidden">
        <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
            <LifeBuoy className="text-sky-500" size={20} /> Raise Support Ticket
          </h2>
          <button onClick={() => setShowTicketModal(false)} className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleCreateTicket} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Title / Subject</label>
            <input
              type="text" required
              placeholder="e.g. Printer in Room 3 not printing"
              value={ticketForm.title}
              onChange={e => setTicketForm({ ...ticketForm, title: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Description (Optional)</label>
            <textarea
              placeholder="Describe the issue in detail..."
              rows="3"
              value={ticketForm.description}
              onChange={e => setTicketForm({ ...ticketForm, description: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Category</label>
              <select
                value={ticketForm.category}
                onChange={e => setTicketForm({ ...ticketForm, category: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
              >
                <option value="Hardware">Hardware</option>
                <option value="Software">Software</option>
                <option value="Network">Network</option>
                <option value="Provisioning">Provisioning</option>
                <option value="System Access">System Access</option>
                <option value="Printer/Scanner">Printer/Scanner</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Priority</label>
              <select
                value={ticketForm.priority}
                onChange={e => setTicketForm({ ...ticketForm, priority: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">🔴 Critical</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Reporter Name</label>
              <input
                type="text" required
                placeholder="Your Name"
                value={ticketForm.reporter}
                onChange={e => setTicketForm({ ...ticketForm, reporter: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Working Station / Dept</label>
              <select
                value={ticketForm.working_station}
                onChange={e => setTicketForm({ ...ticketForm, working_station: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
              >
                {WORKING_STATIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* IT Staff Only — Assign Engineer */}
          {isITStaff && (
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Assign to IT Engineer (Optional)</label>
              <input
                type="text"
                placeholder="e.g. John Osei"
                value={ticketForm.assigned_to}
                onChange={e => setTicketForm({ ...ticketForm, assigned_to: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all"
              />
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
            <button type="button" onClick={() => setShowTicketModal(false)} className="px-4 py-2.5 rounded-xl border border-slate-200 font-bold text-xs text-slate-500 hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button type="submit" className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 font-bold text-xs text-white shadow-md shadow-sky-500/20 transition-all">
              Submit Ticket
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  // ── Detail Drawer ─────────────────────────────────────────────────────────
  const renderDetailDrawer = () => {
    if (!selectedTicket) return null;

    const steps = [
      { key: 'Logged',   title: 'Ticket Logged',   desc: `Submitted by ${selectedTicket.reporter}`, done: true, time: selectedTicket.created_at ? new Date(selectedTicket.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A' },
      { key: 'Progress', title: 'IT Assessment',   desc: selectedTicket.status === 'Open' ? 'Queue assignment pending' : `${selectedTicket.assigned_to ? `Assigned to ${selectedTicket.assigned_to}` : 'IT engineer assigned'}`, done: selectedTicket.status !== 'Open', active: selectedTicket.status === 'In Progress' },
      { key: 'Resolved', title: 'Resolution',      desc: selectedTicket.status === 'Resolved' || selectedTicket.status === 'Closed' ? (selectedTicket.resolution_notes || 'Verified & closed') : 'Awaiting verification', done: selectedTicket.status === 'Resolved' || selectedTicket.status === 'Closed', active: selectedTicket.status === 'Resolved' },
      { key: 'Closed',   title: 'Closed',          desc: 'Ticket archived', done: selectedTicket.status === 'Closed', active: selectedTicket.status === 'Closed' },
    ];

    // Can this non-IT user delete the ticket?
    const canDelete = isITStaff || (selectedTicket.it_intervention !== 1 && selectedTicket.status !== 'In Progress');

    return (
      <div className="fixed inset-0 z-50 overflow-hidden">
        <div onClick={() => setSelectedTicket(null)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300" />

        <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
          <div className="w-screen max-w-md bg-white shadow-2xl border-l border-slate-100 flex flex-col justify-between animate-slide-in relative">

            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <span className="text-[10px] font-black px-2.5 py-1.5 rounded-xl bg-slate-200 text-slate-800 uppercase tracking-widest">
                  {selectedTicket.ticket_number}
                </span>
                <StatusPill status={selectedTicket.status} />
              </div>
              <button onClick={() => setSelectedTicket(null)} className="p-1.5 hover:bg-slate-200 rounded-xl text-slate-400 hover:text-slate-600 transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
              <div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Subject / Issue</span>
                <h3 className="text-lg font-black text-slate-900 leading-tight">{selectedTicket.title}</h3>
              </div>

              {selectedTicket.description && (
                <div>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Detailed Description</span>
                  <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl text-xs font-semibold text-slate-600 leading-relaxed">
                    {selectedTicket.description}
                  </div>
                </div>
              )}

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                <div>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Category</span>
                  <CategoryBadge category={selectedTicket.category} />
                </div>
                <div>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Priority</span>
                  <PriorityIndicator priority={selectedTicket.priority} />
                </div>
                <div>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Reporter</span>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                    <User size={13} className="text-slate-400" />
                    <span>{selectedTicket.reporter}</span>
                  </div>
                </div>
                <div>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Station</span>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                    <MapPin size={13} className="text-sky-500" />
                    <span>{selectedTicket.working_station || 'N/A'}</span>
                  </div>
                </div>
                {selectedTicket.assigned_to && (
                  <div className="col-span-2">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Assigned IT Engineer</span>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-sky-700 bg-sky-50 px-3 py-1.5 rounded-xl border border-sky-100">
                      <UserCheck size={13} />
                      <span>{selectedTicket.assigned_to}</span>
                    </div>
                  </div>
                )}
                <div>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Submitted</span>
                  <span className="text-xs font-bold text-slate-600">
                    {selectedTicket.created_at ? new Date(selectedTicket.created_at).toLocaleString() : 'N/A'}
                  </span>
                </div>
              </div>

              {/* Resolution Notes */}
              {selectedTicket.resolution_notes && (
                <div className="pt-4 border-t border-slate-100">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Resolution Notes</span>
                  <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl text-xs font-semibold text-emerald-800 leading-relaxed">
                    {selectedTicket.resolution_notes}
                  </div>
                </div>
              )}

              {/* Timeline */}
              <div className="pt-6 border-t border-slate-100">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-4">LIVE OPERATIONS TIMELINE</span>
                <div className="relative pl-6 border-l border-slate-200 space-y-6">
                  {steps.map((s, idx) => (
                    <div key={idx} className="relative">
                      <span className={`absolute -left-[31px] top-0.5 flex h-4 w-4 rounded-full border-2 bg-white items-center justify-center ${s.done ? 'border-emerald-500 text-emerald-500' : s.active ? 'border-sky-500 text-sky-500 animate-pulse' : 'border-slate-300 text-slate-300'}`}>
                        {s.done ? <Check size={8} strokeWidth={4} /> : <div className={`w-1.5 h-1.5 rounded-full ${s.active ? 'bg-sky-500' : 'bg-transparent'}`} />}
                      </span>
                      <div>
                        <div className="flex justify-between items-baseline mb-0.5">
                          <span className={`text-xs font-black uppercase tracking-wider ${s.active ? 'text-sky-600' : s.done ? 'text-slate-800' : 'text-slate-400'}`}>{s.title}</span>
                          {s.time && <span className="text-[9px] font-bold text-slate-400">{s.time}</span>}
                        </div>
                        <p className="text-[11px] font-semibold text-slate-400">{s.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Footer */}
            <div className="px-6 py-5 border-t border-slate-100 bg-slate-50/50 flex flex-col gap-3">
              {isITStaff ? (
                <>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Set Status</label>
                      <select
                        value={selectedTicket.status}
                        onChange={e => handleUpdateTicket(selectedTicket.id, { status: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-200"
                      >
                        <option value="Open">Open</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                        <option value="Closed">Closed</option>
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Set Priority</label>
                      <select
                        value={selectedTicket.priority}
                        onChange={e => handleUpdateTicket(selectedTicket.id, { priority: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-200"
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Critical">🔴 Critical</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Assign IT Engineer</label>
                    <input
                      type="text"
                      defaultValue={selectedTicket.assigned_to || ''}
                      placeholder="Engineer name..."
                      onBlur={e => { if (e.target.value !== (selectedTicket.assigned_to || '')) handleUpdateTicket(selectedTicket.id, { assigned_to: e.target.value }); }}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Resolution Notes</label>
                    <textarea
                      rows={2}
                      defaultValue={selectedTicket.resolution_notes || ''}
                      placeholder="Document what was done..."
                      onBlur={e => { if (e.target.value !== (selectedTicket.resolution_notes || '')) handleUpdateTicket(selectedTicket.id, { resolution_notes: e.target.value }); }}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-200 resize-none"
                    />
                  </div>
                  <button
                    onClick={() => handleDeleteTicket(selectedTicket.id)}
                    className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Trash2 size={13} /> Delete Support Ticket
                  </button>
                </>
              ) : (
                <div className="flex gap-2">
                  {selectedTicket.status !== 'Resolved' && selectedTicket.status !== 'Closed' && (
                    <button
                      onClick={() => handleUpdateTicket(selectedTicket.id, { status: 'Resolved' })}
                      className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-xs transition-all shadow-md shadow-emerald-500/10 flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle size={13} /> Mark Resolved
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => handleDeleteTicket(selectedTicket.id)}
                      className="flex-1 py-2.5 bg-white hover:bg-slate-100 text-slate-500 border border-slate-200 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
                    >
                      Cancel Ticket
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ── User (Non-IT) View ─────────────────────────────────────────────────────
  if (!isITStaff) {
    return (
      <div className="pb-12 px-4 md:px-8 max-w-7xl mx-auto">
        {renderSystemStatusBar()}

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">IT HELP DESK</span>
            <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-3 tracking-tight">
              <LifeBuoy className="text-sky-500" size={32} /> Support Portal
            </h1>
            <p className="text-xs font-semibold text-slate-400 mt-1">
              Submit support tickets and track clinical hardware or software investigations.
            </p>
          </div>
          <button
            onClick={() => setShowTicketModal(true)}
            className="flex items-center gap-2 px-5 py-3.5 bg-sky-500 hover:bg-sky-600 text-white rounded-2xl font-bold text-xs shadow-lg shadow-sky-500/20 hover:shadow-sky-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
          >
            <Plus size={16} /> Raise Support Ticket
          </button>
        </div>

        {renderTicketStats()}

        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-sky-500 mb-4"></div>
            <span className="text-xs font-bold text-slate-500">Syncing with Helpdesk...</span>
          </div>
        )}

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl font-semibold text-sm mb-6 flex justify-between items-center">
            <span>⚠️ {error}</span>
            <button onClick={fetchData} className="px-3 py-1 bg-rose-100 hover:bg-rose-200 rounded-lg text-rose-900 transition-colors">Retry</button>
          </div>
        )}

        {!loading && !error && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-3xl border border-slate-200/60 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                <input
                  type="text"
                  placeholder="Search my tickets..."
                  value={ticketSearch}
                  onChange={e => setTicketSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100/50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all"
                />
              </div>
              <div className="flex flex-wrap gap-3 w-full md:w-auto">
                <select value={ticketFilterStatus} onChange={e => setTicketFilterStatus(e.target.value)} className="flex-1 md:flex-initial px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer">
                  <option value="">All Statuses</option>
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                </select>
                <select value={ticketFilterPriority} onChange={e => setTicketFilterPriority(e.target.value)} className="flex-1 md:flex-initial px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer">
                  <option value="">All Priorities</option>
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">ID / Category</th>
                      <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Subject & Details</th>
                      <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Station</th>
                      <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Priority</th>
                      <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Submitted</th>
                      <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTickets.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="py-16 text-center text-sm font-bold text-slate-400">No logged tickets found matching the criteria.</td>
                      </tr>
                    ) : (
                      filteredTickets.map(ticket => (
                        <tr key={ticket.id} onClick={() => setSelectedTicket(ticket)} className="hover:bg-slate-50/50 cursor-pointer transition-colors">
                          <td className="py-4 px-6">
                            <span className="text-[10px] font-black px-2 py-1 rounded-lg bg-slate-100 text-slate-600 uppercase tracking-wider block w-max mb-1.5">{ticket.ticket_number}</span>
                            <CategoryBadge category={ticket.category} />
                          </td>
                          <td className="py-4 px-4 max-w-sm">
                            <div className="font-extrabold text-slate-800 text-sm mb-0.5 line-clamp-1">{ticket.title}</div>
                            {ticket.description && <p className="text-xs font-semibold text-slate-400 line-clamp-1">{ticket.description}</p>}
                          </td>
                          <td className="py-4 px-4">
                            <span className="text-xs font-black text-slate-500 uppercase tracking-wide">{ticket.working_station || 'N/A'}</span>
                          </td>
                          <td className="py-4 px-4">
                            <PriorityIndicator priority={ticket.priority} />
                          </td>
                          <td className="py-4 px-4">
                            <span className="text-xs font-bold text-slate-500">
                              {ticket.created_at ? new Date(ticket.created_at).toLocaleDateString() : 'N/A'}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <StatusPill status={ticket.status} />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {showTicketModal && renderTicketModal()}
        {renderDetailDrawer()}
      </div>
    );
  }

  // ── IT / Admin Dashboard View ─────────────────────────────────────────────
  return (
    <div className="pb-12 px-4 md:px-8 max-w-7xl mx-auto">
      {renderSystemStatusBar()}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">IT SUPPORT HUB</span>
          <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-3 tracking-tight">
            <Server className="text-sky-500" size={32} /> Infrastructure Dashboard
          </h1>
        </div>
        {activeTab === 'tickets' ? (
          <button onClick={() => setShowTicketModal(true)} className="flex items-center gap-2 px-5 py-3.5 bg-sky-500 hover:bg-sky-600 text-white rounded-2xl font-bold text-xs shadow-lg shadow-sky-500/20 hover:shadow-sky-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200">
            <Plus size={16} /> Create Ticket
          </button>
        ) : (
          <button onClick={() => setShowAssetModal(true)} className="flex items-center gap-2 px-5 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold text-xs shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200">
            <Plus size={16} /> Add Asset
          </button>
        )}
      </div>

      {activeTab === 'tickets' ? renderTicketStats() : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-white to-slate-50/60 p-6 rounded-3xl border border-slate-200/60 shadow-sm flex flex-col justify-between hover:scale-[1.01] hover:shadow-md transition-all duration-300 group">
            <div className="flex justify-between items-start">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Total Assets</span>
              <span className="p-2 bg-slate-100 rounded-xl text-slate-500 group-hover:bg-slate-200 transition-colors"><Monitor size={16} /></span>
            </div>
            <span className="text-4xl font-extrabold text-slate-800 mt-4 tracking-tight">{totalAssets}</span>
          </div>
          <div className="bg-gradient-to-br from-emerald-50/40 to-white p-6 rounded-3xl border border-emerald-100/80 shadow-sm flex flex-col justify-between hover:scale-[1.01] hover:shadow-md transition-all duration-300 group">
            <div className="flex justify-between items-start">
              <span className="text-xs font-black text-emerald-600 uppercase tracking-widest">Active</span>
              <span className="p-2 bg-emerald-100/50 rounded-xl text-emerald-600 group-hover:bg-emerald-100 transition-colors"><CheckCircle size={16} /></span>
            </div>
            <span className="text-4xl font-extrabold text-emerald-700 mt-4 tracking-tight">{activeAssets}</span>
          </div>
          <div className="bg-gradient-to-br from-red-50/40 to-white p-6 rounded-3xl border border-red-100/80 shadow-sm flex flex-col justify-between hover:scale-[1.01] hover:shadow-md transition-all duration-300 group">
            <div className="flex justify-between items-start">
              <span className="text-xs font-black text-red-600 uppercase tracking-widest">Needs Repair</span>
              <span className="p-2 bg-red-100/50 rounded-xl text-red-600 group-hover:bg-red-100 transition-colors"><AlertTriangle size={16} /></span>
            </div>
            <div className="flex items-baseline gap-2 mt-4">
              <span className="text-4xl font-extrabold text-red-700 tracking-tight">{repairAssets}</span>
              {repairAssets > 0 && <span className="flex h-2.5 w-2.5 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span></span>}
            </div>
          </div>
          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between hover:scale-[1.01] hover:shadow-md transition-all duration-300">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Inactive</span>
            <span className="text-4xl font-extrabold text-slate-600 mt-4 tracking-tight">{totalAssets - activeAssets - repairAssets}</span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6 mb-6">
        <button onClick={() => setActiveTab('tickets')} className={`pb-4 text-base font-bold flex items-center gap-2 border-b-2 transition-all duration-200 ${activeTab === 'tickets' ? 'border-sky-500 text-sky-600 font-extrabold' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
          <LifeBuoy size={18} /> Support Tickets
          {openTickets > 0 && <span className="text-[10px] font-black bg-rose-500 text-white px-1.5 py-0.5 rounded-full">{openTickets}</span>}
        </button>
        <button onClick={() => setActiveTab('assets')} className={`pb-4 text-base font-bold flex items-center gap-2 border-b-2 transition-all duration-200 ${activeTab === 'assets' ? 'border-emerald-500 text-emerald-600 font-extrabold' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
          <Monitor size={18} /> Asset Directory
        </button>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-sky-500 mb-4"></div>
          <span className="text-xs font-bold text-slate-500">Retrieving operational assets...</span>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl font-semibold text-sm mb-6 flex justify-between items-center">
          <span>⚠️ {error}</span>
          <button onClick={fetchData} className="px-3 py-1 bg-rose-100 hover:bg-rose-200 rounded-lg text-rose-900 transition-colors">Retry</button>
        </div>
      )}

      {/* ── Tickets Tab ── */}
      {!loading && !error && activeTab === 'tickets' && (
        <div className="space-y-4">
          {/* Filters — IT Staff gets more options */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200/60 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                type="text"
                placeholder="Search ticket number, title, reporter..."
                value={ticketSearch}
                onChange={e => setTicketSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100/50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all"
              />
            </div>
            <div className="flex flex-wrap gap-3 w-full md:w-auto">
              <select value={ticketFilterStatus} onChange={e => setTicketFilterStatus(e.target.value)} className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer">
                <option value="">All Statuses</option>
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
                <option value="Closed">Closed</option>
              </select>
              <select value={ticketFilterPriority} onChange={e => setTicketFilterPriority(e.target.value)} className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer">
                <option value="">All Priorities</option>
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
              <select value={ticketFilterCategory} onChange={e => setTicketFilterCategory(e.target.value)} className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer">
                <option value="">All Categories</option>
                <option value="Hardware">Hardware</option>
                <option value="Software">Software</option>
                <option value="Network">Network</option>
                <option value="Provisioning">Provisioning</option>
                <option value="System Access">System Access</option>
                <option value="Printer/Scanner">Printer/Scanner</option>
              </select>
              <select value={ticketFilterStation} onChange={e => setTicketFilterStation(e.target.value)} className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer">
                <option value="">All Stations</option>
                {WORKING_STATIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">ID / Category</th>
                    <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Subject & Issue</th>
                    <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Reporter & Station</th>
                    <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Assigned</th>
                    <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Priority</th>
                    <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status / Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTickets.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-16 text-center text-sm font-bold text-slate-400">No support tickets found matching current criteria.</td>
                    </tr>
                  ) : (
                    filteredTickets.map(ticket => (
                      <tr key={ticket.id} onClick={() => setSelectedTicket(ticket)} className="hover:bg-slate-50/50 cursor-pointer transition-colors">
                        <td className="py-4 px-6">
                          <span className="text-[10px] font-black px-2 py-1 rounded-lg bg-slate-100 text-slate-600 uppercase tracking-wider block w-max mb-1.5">{ticket.ticket_number}</span>
                          <CategoryBadge category={ticket.category} />
                        </td>
                        <td className="py-4 px-4 max-w-xs">
                          <div className="font-extrabold text-slate-800 text-sm mb-0.5 line-clamp-1">{ticket.title}</div>
                          {ticket.description && <p className="text-xs font-semibold text-slate-400 line-clamp-1">{ticket.description}</p>}
                          <span className="text-[10px] font-bold text-slate-400">{ticket.created_at ? new Date(ticket.created_at).toLocaleDateString() : ''}</span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="text-xs font-bold text-slate-700">{ticket.reporter}</div>
                          {ticket.working_station && <div className="text-[10px] font-black text-sky-600 uppercase tracking-wider mt-0.5">{ticket.working_station}</div>}
                        </td>
                        <td className="py-4 px-4">
                          {ticket.assigned_to
                            ? <div className="flex items-center gap-1.5 text-xs font-bold text-sky-700"><UserCheck size={12} />{ticket.assigned_to}</div>
                            : <span className="text-[10px] font-bold text-slate-400">Unassigned</span>
                          }
                        </td>
                        <td className="py-4 px-4" onClick={e => e.stopPropagation()}>
                          <select
                            value={ticket.priority}
                            onChange={e => handleUpdateTicket(ticket.id, { priority: e.target.value })}
                            className={`px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-200 transition-all ${
                              ticket.priority === 'Critical' ? 'bg-red-50 text-red-800 border-red-300' :
                              ticket.priority === 'High' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                              ticket.priority === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              'bg-slate-50 text-slate-600 border-slate-200'
                            }`}
                          >
                            <option value="Critical">Critical</option>
                            <option value="High">High</option>
                            <option value="Medium">Medium</option>
                            <option value="Low">Low</option>
                          </select>
                        </td>
                        <td className="py-4 px-6" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            <select
                              value={ticket.status}
                              onChange={e => handleUpdateTicket(ticket.id, { status: e.target.value })}
                              className={`px-3 py-1.5 rounded-full text-xs font-bold border cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-200 transition-all ${
                                ticket.status === 'Resolved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                ticket.status === 'Closed' ? 'bg-slate-100 text-slate-600 border-slate-300' :
                                ticket.status === 'In Progress' ? 'bg-sky-50 text-sky-700 border-sky-200' :
                                'bg-amber-50 text-amber-700 border-amber-200'
                              }`}
                            >
                              <option value="Open">Open</option>
                              <option value="In Progress">In Progress</option>
                              <option value="Resolved">Resolved</option>
                              <option value="Closed">Closed</option>
                            </select>
                            <button
                              onClick={() => handleDeleteTicket(ticket.id)}
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-xl transition-colors ml-2"
                              title="Delete Ticket"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Assets Tab ── */}
      {!loading && !error && activeTab === 'assets' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-3xl border border-slate-200/60 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                type="text"
                placeholder="Search asset tags, names, serial numbers..."
                value={assetSearch}
                onChange={e => setAssetSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100/50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              />
            </div>
            <div className="flex gap-3 w-full md:w-auto">
              <select value={assetFilterStatus} onChange={e => setAssetFilterStatus(e.target.value)} className="w-full md:w-48 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer">
                <option value="">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Needs Repair">Needs Repair</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {filteredAssets.length === 0 ? (
              <div className="col-span-full py-16 text-center text-sm font-bold text-slate-400">No IT assets registered matching criteria.</div>
            ) : (
              filteredAssets.map(asset => (
                <div key={asset.id} className="bg-white rounded-3xl border border-slate-200/60 p-6 flex flex-col justify-between hover:shadow-lg hover:border-slate-300 transition-all duration-300 group relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/10 transition-colors" />

                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-slate-500 group-hover:bg-emerald-50 group-hover:text-emerald-600 group-hover:border-emerald-100 transition-all duration-300">
                        {asset.asset_type === 'Printer' ? <Printer size={20} /> :
                         asset.asset_type === 'Router' ? <Router size={20} /> :
                         asset.asset_type === 'Storage' ? <HardDrive size={20} /> :
                         <Monitor size={20} />}
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={asset.status}
                          onChange={e => handleUpdateAsset(asset.id, { status: e.target.value })}
                          className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-200 transition-all ${
                            asset.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            asset.status === 'Needs Repair' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                            'bg-slate-50 text-slate-600 border-slate-200'
                          }`}
                        >
                          <option value="Active">Active</option>
                          <option value="Needs Repair">Needs Repair</option>
                          <option value="Inactive">Inactive</option>
                        </select>
                        <button onClick={() => handleDeleteAsset(asset.id)} className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors border border-transparent hover:border-rose-100" title="Delete Asset">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    <h3 className="font-extrabold text-slate-800 text-base mb-1 group-hover:text-emerald-700 transition-colors">{asset.name}</h3>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded border">{asset.asset_tag}</span>
                      {asset.asset_type && <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">{asset.asset_type}</span>}
                    </div>
                    {asset.serial_number && (
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 mb-1">
                        <Tag size={10} /> S/N: {asset.serial_number}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Assigned To</span>
                      <input
                        type="text"
                        defaultValue={asset.assigned_to}
                        placeholder="Unassigned"
                        onBlur={e => handleUpdateAsset(asset.id, { assigned_to: e.target.value })}
                        className="text-xs font-bold text-slate-700 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-emerald-500 focus:outline-none w-full transition-all"
                      />
                    </div>
                    <div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Department</span>
                      <select
                        value={asset.department}
                        onChange={e => handleUpdateAsset(asset.id, { department: e.target.value })}
                        className="text-xs font-bold text-slate-700 bg-transparent border-none focus:outline-none w-full cursor-pointer hover:text-slate-900"
                      >
                        <option value="DENTAL">Dental</option>
                        <option value="PHYSIO">Physio</option>
                        <option value="NURSING">Nursing</option>
                        <option value="OPERATIONS">Operations</option>
                        <option value="LABORATORY">Laboratory</option>
                        <option value="IMAGING">Imaging</option>
                        <option value="IT">IT</option>
                        <option value="GLOBAL">Global</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Warranty</span>
                      <WarrantyBadge warrantyExpiry={asset.warranty_expiry} />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Create Ticket Modal ── */}
      {showTicketModal && renderTicketModal()}

      {/* ── Create Asset Modal ── */}
      {showAssetModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200/80 overflow-hidden">
            <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
                <Monitor className="text-emerald-500" size={20} /> Add IT Asset
              </h2>
              <button onClick={() => setShowAssetModal(false)} className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateAsset} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Asset Name / Model</label>
                <input
                  type="text" required
                  placeholder="e.g. Dell Latitude 5430"
                  value={assetForm.name}
                  onChange={e => setAssetForm({ ...assetForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Asset Type</label>
                  <select
                    value={assetForm.asset_type}
                    onChange={e => setAssetForm({ ...assetForm, asset_type: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value="Computer">Computer / Laptop</option>
                    <option value="Printer">Printer</option>
                    <option value="Monitor">Monitor</option>
                    <option value="Router">Router / Network</option>
                    <option value="Scanner">Scanner</option>
                    <option value="Storage">Storage Device</option>
                    <option value="Peripheral">Peripheral</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Serial Number</label>
                  <input
                    type="text"
                    placeholder="e.g. SN-2024-00142"
                    value={assetForm.serial_number}
                    onChange={e => setAssetForm({ ...assetForm, serial_number: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Assigned To (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Jane Doe"
                  value={assetForm.assigned_to}
                  onChange={e => setAssetForm({ ...assetForm, assigned_to: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Department</label>
                  <select
                    value={assetForm.department}
                    onChange={e => setAssetForm({ ...assetForm, department: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value="DENTAL">Dental</option>
                    <option value="PHYSIO">Physio</option>
                    <option value="NURSING">Nursing</option>
                    <option value="OPERATIONS">Operations</option>
                    <option value="LABORATORY">Laboratory</option>
                    <option value="IMAGING">Imaging</option>
                    <option value="IT">IT</option>
                    <option value="GLOBAL">Global</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Status</label>
                  <select
                    value={assetForm.status}
                    onChange={e => setAssetForm({ ...assetForm, status: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value="Active">Active</option>
                    <option value="Needs Repair">Needs Repair</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Purchase Date</label>
                  <input
                    type="date"
                    value={assetForm.purchase_date}
                    onChange={e => setAssetForm({ ...assetForm, purchase_date: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Warranty Expiry</label>
                  <input
                    type="date"
                    value={assetForm.warranty_expiry}
                    onChange={e => setAssetForm({ ...assetForm, warranty_expiry: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" onClick={() => setShowAssetModal(false)} className="px-4 py-2.5 rounded-xl border border-slate-200 font-bold text-xs text-slate-500 hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 font-bold text-xs text-white shadow-md shadow-emerald-500/20 transition-all">
                  Add Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Drawer */}
      {renderDetailDrawer()}

      {/* Custom Animations */}
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in {
          animation: slideInRight 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes pulseGlow {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.45; transform: scale(1.15); }
        }
        .animate-pulse-glow { animation: pulseGlow 1.8s infinite ease-in-out; }
        @keyframes pulseLight {
          0%, 100% { border-color: rgba(244, 63, 94, 0.4); }
          50% { border-color: rgba(244, 63, 94, 0.8); }
        }
        .animate-pulse-light { animation: pulseLight 1.5s infinite ease-in-out; }
        @keyframes pingSlow {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        .animate-ping-slow { animation: pingSlow 2.2s cubic-bezier(0, 0, 0.2, 1) infinite; }
      `}</style>
    </div>
  );
};

export default ITAssetTicketing;
