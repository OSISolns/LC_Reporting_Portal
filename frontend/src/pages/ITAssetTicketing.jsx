import { useState, useEffect } from 'react';
import { 
  Monitor, LifeBuoy, Server, Wrench, 
  CheckCircle, AlertTriangle, Plus, X, Search, Filter, Trash2, ArrowUpDown
} from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const ITAssetTicketing = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('tickets'); // 'tickets' or 'assets'
  const [tickets, setTickets] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [showAssetModal, setShowAssetModal] = useState(false);

  // Forms
  const [ticketForm, setTicketForm] = useState({
    title: '',
    description: '',
    reporter: user?.name || user?.username || '',
    category: 'Hardware',
    priority: 'Medium'
  });

  const [assetForm, setAssetForm] = useState({
    name: '',
    assigned_to: '',
    department: 'OPERATIONS',
    status: 'Active'
  });

  // Search & Filter state
  const [ticketSearch, setTicketSearch] = useState('');
  const [ticketFilterStatus, setTicketFilterStatus] = useState('');
  const [ticketFilterPriority, setTicketFilterPriority] = useState('');
  
  const [assetSearch, setAssetSearch] = useState('');
  const [assetFilterStatus, setAssetFilterStatus] = useState('');

  // Fetch data
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ticketsRes, assetsRes] = await Promise.all([
        api.get('/api/it-support/tickets'),
        api.get('/api/it-support/assets')
      ]);
      setTickets(ticketsRes.data.tickets || []);
      setAssets(assetsRes.data.assets || []);
    } catch (err) {
      console.error('Failed to load IT Support Hub data:', err);
      setError('Failed to fetch data from the server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Submit new ticket
  const handleCreateTicket = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/api/it-support/tickets', ticketForm);
      if (res.data.success) {
        setTickets([res.data.ticket, ...tickets]);
        setShowTicketModal(false);
        setTicketForm({
          title: '',
          description: '',
          reporter: user?.name || user?.username || '',
          category: 'Hardware',
          priority: 'Medium'
        });
      }
    } catch (err) {
      console.error('Error creating ticket:', err);
      alert('Error creating ticket: ' + (err.response?.data?.message || err.message));
    }
  };

  // Submit new asset
  const handleCreateAsset = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/api/it-support/assets', assetForm);
      if (res.data.success) {
        setAssets([...assets, res.data.asset]);
        setShowAssetModal(false);
        setAssetForm({
          name: '',
          assigned_to: '',
          department: 'OPERATIONS',
          status: 'Active'
        });
      }
    } catch (err) {
      console.error('Error creating asset:', err);
      alert('Error creating asset: ' + (err.response?.data?.message || err.message));
    }
  };

  // Update Ticket Status/Priority
  const handleUpdateTicket = async (id, updates) => {
    try {
      const res = await api.put(`/api/it-support/tickets/${id}`, updates);
      if (res.data.success) {
        setTickets(tickets.map(t => t.id === id ? { ...t, ...updates } : t));
      }
    } catch (err) {
      console.error('Error updating ticket:', err);
      alert('Failed to update ticket');
    }
  };

  // Update Asset Status/Details
  const handleUpdateAsset = async (id, updates) => {
    try {
      const res = await api.put(`/api/it-support/assets/${id}`, updates);
      if (res.data.success) {
        setAssets(assets.map(a => a.id === id ? { ...a, ...updates } : a));
      }
    } catch (err) {
      console.error('Error updating asset:', err);
      alert('Failed to update asset');
    }
  };

  // Stats computation
  const totalTickets = tickets.length;
  const openTickets = tickets.filter(t => t.status === 'Open').length;
  const inProgressTickets = tickets.filter(t => t.status === 'In Progress').length;
  const resolvedTickets = tickets.filter(t => t.status === 'Resolved').length;

  const totalAssets = assets.length;
  const activeAssets = assets.filter(a => a.status === 'Active').length;
  const repairAssets = assets.filter(a => a.status === 'Needs Repair').length;

  // Filtered lists
  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.title.toLowerCase().includes(ticketSearch.toLowerCase()) ||
                          ticket.ticket_number.toLowerCase().includes(ticketSearch.toLowerCase()) ||
                          ticket.reporter.toLowerCase().includes(ticketSearch.toLowerCase());
    const matchesStatus = !ticketFilterStatus || ticket.status === ticketFilterStatus;
    const matchesPriority = !ticketFilterPriority || ticket.priority === ticketFilterPriority;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.name.toLowerCase().includes(assetSearch.toLowerCase()) ||
                          asset.asset_tag.toLowerCase().includes(assetSearch.toLowerCase()) ||
                          (asset.assigned_to && asset.assigned_to.toLowerCase().includes(assetSearch.toLowerCase()));
    const matchesStatus = !assetFilterStatus || asset.status === assetFilterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="pb-12 px-4 md:px-8 max-w-7xl mx-auto">
      
      {/* ── Header & Title ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <span className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-1">
            IT SUPPORT HUB
          </span>
          <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-3">
            <Server className="text-sky-500 animate-pulse" size={36} /> IT Infrastructure & Operations
          </h1>
        </div>
        
        {activeTab === 'tickets' ? (
          <button 
            onClick={() => setShowTicketModal(true)}
            className="flex items-center gap-2 px-5 py-3 bg-sky-500 hover:bg-sky-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-sky-500/20 hover:shadow-sky-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
          >
            <Plus size={18} /> Create Ticket
          </button>
        ) : (
          <button 
            onClick={() => setShowAssetModal(true)}
            className="flex items-center gap-2 px-5 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
          >
            <Plus size={18} /> Add Asset
          </button>
        )}
      </div>

      {/* ── Stats Dashboard Grid ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {activeTab === 'tickets' ? (
          <>
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase">Total Tickets</span>
              <span className="text-3xl font-extrabold text-slate-800 mt-2">{totalTickets}</span>
            </div>
            <div className="bg-amber-50/50 p-5 rounded-2xl border border-amber-100 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-bold text-amber-600 uppercase">Open</span>
              <span className="text-3xl font-extrabold text-amber-700 mt-2">{openTickets}</span>
            </div>
            <div className="bg-sky-50/50 p-5 rounded-2xl border border-sky-100 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-bold text-sky-600 uppercase">In Progress</span>
              <span className="text-3xl font-extrabold text-sky-700 mt-2">{inProgressTickets}</span>
            </div>
            <div className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-bold text-emerald-600 uppercase">Resolved</span>
              <span className="text-3xl font-extrabold text-emerald-700 mt-2">{resolvedTickets}</span>
            </div>
          </>
        ) : (
          <>
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase">Total Assets</span>
              <span className="text-3xl font-extrabold text-slate-800 mt-2">{totalAssets}</span>
            </div>
            <div className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-bold text-emerald-600 uppercase">Active</span>
              <span className="text-3xl font-extrabold text-emerald-700 mt-2">{activeAssets}</span>
            </div>
            <div className="bg-rose-50/50 p-5 rounded-2xl border border-rose-100 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-bold text-rose-600 uppercase">Needs Repair</span>
              <span className="text-3xl font-extrabold text-rose-700 mt-2">{repairAssets}</span>
            </div>
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase">Inactive</span>
              <span className="text-3xl font-extrabold text-slate-600 mt-2">{totalAssets - activeAssets - repairAssets}</span>
            </div>
          </>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className="flex border-b border-slate-200 gap-6 mb-6">
        <button 
          onClick={() => setActiveTab('tickets')}
          className={`pb-4 text-base font-bold flex items-center gap-2 border-b-2 transition-all duration-200 ${activeTab === 'tickets' ? 'border-sky-500 text-sky-600 font-extrabold' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          <LifeBuoy size={18} /> Support Tickets
        </button>
        <button 
          onClick={() => setActiveTab('assets')}
          className={`pb-4 text-base font-bold flex items-center gap-2 border-b-2 transition-all duration-200 ${activeTab === 'assets' ? 'border-emerald-500 text-emerald-600 font-extrabold' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          <Monitor size={18} /> Asset Directory
        </button>
      </div>

      {/* ── Loader & Error States ── */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-sky-500 mb-4"></div>
          <span className="text-sm font-bold text-slate-500">Syncing with server...</span>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl font-semibold text-sm mb-6 flex justify-between items-center">
          <span>⚠️ {error}</span>
          <button onClick={fetchData} className="px-3 py-1 bg-rose-100 hover:bg-rose-200 rounded-lg text-rose-900 transition-colors">Retry</button>
        </div>
      )}

      {/* ── Support Tickets View ── */}
      {!loading && !error && activeTab === 'tickets' && (
        <div className="space-y-4">
          
          {/* Filters Panel */}
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Search ticket number, title..." 
                value={ticketSearch}
                onChange={e => setTicketSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100/50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all"
              />
            </div>
            
            <div className="flex flex-wrap gap-3 w-full md:w-auto">
              <select 
                value={ticketFilterStatus}
                onChange={e => setTicketFilterStatus(e.target.value)}
                className="flex-1 md:flex-initial px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
              >
                <option value="">All Statuses</option>
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
              </select>

              <select 
                value={ticketFilterPriority}
                onChange={e => setTicketFilterPriority(e.target.value)}
                className="flex-1 md:flex-initial px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
              >
                <option value="">All Priorities</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          {/* Tickets Table */}
          <div className="bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="py-4 px-6 text-[11px] font-black text-slate-400 uppercase tracking-widest">Ticket ID & Category</th>
                    <th className="py-4 px-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Description & Issue</th>
                    <th className="py-4 px-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Reporter</th>
                    <th className="py-4 px-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Priority</th>
                    <th className="py-4 px-6 text-[11px] font-black text-slate-400 uppercase tracking-widest">Status / Quick Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTickets.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-12 text-center text-sm font-bold text-slate-400">
                        No support tickets found matching current criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredTickets.map(ticket => (
                      <tr key={ticket.id} className="hover:bg-slate-50/30 transition-colors">
                        <td className="py-4 px-6">
                          <span className="text-[10px] font-black px-2 py-1 rounded bg-slate-100 text-slate-600 uppercase tracking-wider block w-max mb-1.5">
                            {ticket.ticket_number}
                          </span>
                          <span className="text-xs font-bold text-slate-400 uppercase">{ticket.category}</span>
                        </td>
                        <td className="py-4 px-4 max-w-sm">
                          <div className="font-bold text-slate-800 text-sm mb-0.5">{ticket.title}</div>
                          {ticket.description && (
                            <p className="text-xs font-medium text-slate-400 line-clamp-1">{ticket.description}</p>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <div className="text-xs font-bold text-slate-700">{ticket.reporter}</div>
                          <div className="text-[10px] font-bold text-slate-400 mt-0.5">
                            {ticket.created_at ? new Date(ticket.created_at).toLocaleDateString() : 'N/A'}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <select 
                            value={ticket.priority}
                            onChange={e => handleUpdateTicket(ticket.id, { priority: e.target.value })}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-200 transition-all ${
                              ticket.priority === 'High' ? 'bg-rose-50 text-rose-700 border-rose-250' : 
                              ticket.priority === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-250' : 
                              'bg-slate-50 text-slate-600 border-slate-250'
                            }`}
                          >
                            <option value="High">High</option>
                            <option value="Medium">Medium</option>
                            <option value="Low">Low</option>
                          </select>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <select 
                              value={ticket.status}
                              onChange={e => handleUpdateTicket(ticket.id, { status: e.target.value })}
                              className={`px-3 py-1.5 rounded-full text-xs font-bold border cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-200 transition-all ${
                                ticket.status === 'Resolved' ? 'bg-emerald-50 text-emerald-700 border-emerald-250' : 
                                ticket.status === 'In Progress' ? 'bg-sky-50 text-sky-700 border-sky-250' : 
                                'bg-amber-50 text-amber-700 border-amber-250'
                              }`}
                            >
                              <option value="Open">Open</option>
                              <option value="In Progress">In Progress</option>
                              <option value="Resolved">Resolved</option>
                            </select>
                            {ticket.status === 'Resolved' ? (
                              <CheckCircle className="text-emerald-500" size={16} />
                            ) : ticket.status === 'In Progress' ? (
                              <Wrench className="text-sky-500 animate-spin-slow" size={16} />
                            ) : (
                              <AlertTriangle className="text-amber-500 animate-bounce" size={16} />
                            )}
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

      {/* ── Asset Directory View ── */}
      {!loading && !error && activeTab === 'assets' && (
        <div className="space-y-4">
          
          {/* Filters Panel */}
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Search asset tags, names, users..." 
                value={assetSearch}
                onChange={e => setAssetSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100/50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              />
            </div>
            
            <div className="flex gap-3 w-full md:w-auto">
              <select 
                value={assetFilterStatus}
                onChange={e => setAssetFilterStatus(e.target.value)}
                className="w-full md:w-48 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Needs Repair">Needs Repair</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Asset Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {filteredAssets.length === 0 ? (
              <div className="col-span-full py-16 text-center text-sm font-bold text-slate-400">
                No IT assets found matching criteria.
              </div>
            ) : (
              filteredAssets.map(asset => (
                <div 
                  key={asset.id} 
                  className="bg-white rounded-2xl border border-slate-150 p-6 flex flex-col justify-between hover:shadow-lg hover:shadow-slate-100 hover:border-slate-300 transition-all duration-200 group"
                >
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-slate-500 group-hover:bg-emerald-50 group-hover:text-emerald-600 group-hover:border-emerald-100 transition-all">
                        <Monitor size={20} />
                      </div>
                      
                      <select 
                        value={asset.status}
                        onChange={e => handleUpdateAsset(asset.id, { status: e.target.value })}
                        className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-250 transition-all ${
                          asset.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-250' : 
                          asset.status === 'Needs Repair' ? 'bg-rose-50 text-rose-700 border-rose-250' : 
                          'bg-slate-50 text-slate-600 border-slate-250'
                        }`}
                      >
                        <option value="Active">Active</option>
                        <option value="Needs Repair">Needs Repair</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>

                    <h3 className="font-extrabold text-slate-800 text-base mb-1 group-hover:text-emerald-700 transition-colors">
                      {asset.name}
                    </h3>
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded border">
                      {asset.asset_tag}
                    </span>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">
                        ASSIGNED TO
                      </span>
                      <input 
                        type="text"
                        defaultValue={asset.assigned_to}
                        placeholder="Unassigned"
                        onBlur={e => handleUpdateAsset(asset.id, { assigned_to: e.target.value })}
                        className="text-xs font-bold text-slate-700 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-emerald-500 focus:outline-none w-full transition-all"
                      />
                    </div>
                    <div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">
                        DEPARTMENT
                      </span>
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
                        <option value="GLOBAL">Global</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Create Ticket Modal ── */}
      {showTicketModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200/80 overflow-hidden hover:scale-[1.005] transition-transform duration-300">
            <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
                <LifeBuoy className="text-sky-500" size={20} /> Create Support Ticket
              </h2>
              <button 
                onClick={() => setShowTicketModal(false)}
                className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreateTicket} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Title / Subject</label>
                <input 
                  type="text" 
                  required
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
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Reporter</label>
                <input 
                  type="text" 
                  required
                  placeholder="Your Name"
                  value={ticketForm.reporter}
                  onChange={e => setTicketForm({ ...ticketForm, reporter: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setShowTicketModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 font-bold text-xs text-slate-500 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 font-bold text-xs text-white shadow-md shadow-sky-500/20 transition-all"
                >
                  Submit Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Create Asset Modal ── */}
      {showAssetModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200/80 overflow-hidden hover:scale-[1.005] transition-transform duration-300">
            <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
                <Monitor className="text-emerald-500" size={20} /> Add IT Asset
              </h2>
              <button 
                onClick={() => setShowAssetModal(false)}
                className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreateAsset} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Asset Name / Model</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Dell Latitude 5430"
                  value={assetForm.name}
                  onChange={e => setAssetForm({ ...assetForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                />
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

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setShowAssetModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 font-bold text-xs text-slate-500 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 font-bold text-xs text-white shadow-md shadow-emerald-500/20 transition-all"
                >
                  Add Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default ITAssetTicketing;
