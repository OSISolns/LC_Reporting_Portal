import { useState, useEffect, useMemo } from 'react';
import { 
  TrendingDown, DollarSign, AlertCircle, FileSearch, 
  CheckCircle, Activity, Plus, Trash2, Edit2, Loader2, Search, X
} from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Button, Input, Select, Label, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/index.jsx';
import toast from 'react-hot-toast';

const RevenueLeakageTracker = () => {
  const { user } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [filter, setFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showLogModal, setShowLogModal] = useState(false);
  const [editingLeakage, setEditingLeakage] = useState(null);

  // Forms
  const [form, setForm] = useState({
    patient: '',
    service: '',
    date: new Date().toISOString().split('T')[0],
    clinical_log: '',
    billing_log: '',
    value: '',
    status: 'Unresolved'
  });

  // Fetch all leakage data
  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/revenue-leakage');
      setData(res.data.data || []);
    } catch (err) {
      console.error('Failed to load leakage data:', err);
      toast.error('Failed to fetch revenue leakage data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Run System Scan
  const handleSystemScan = async () => {
    setScanning(true);
    toast.loading('Analyzing clinical records against billing logs...', { id: 'scan' });
    try {
      const res = await api.post('/revenue-leakage/scan');
      if (res.data.success) {
        toast.success(res.data.message || 'Scan complete! Discrepancies updated.', { id: 'scan' });
        const freshRes = await api.get('/revenue-leakage');
        setData(freshRes.data.data || []);
      }
    } catch (err) {
      console.error('Scan failed:', err);
      toast.error('System scan failed.', { id: 'scan' });
    } finally {
      setScanning(false);
    }
  };

  // Create or Update
  const handleSaveLeakage = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        value: Number(form.value) || 0
      };
      if (editingLeakage) {
        const res = await api.put(`/revenue-leakage/${editingLeakage.id}`, payload);
        if (res.data.success) {
          setData(data.map(d => d.id === editingLeakage.id ? res.data.data : d));
          toast.success('Discrepancy record updated.');
        }
      } else {
        const res = await api.post('/revenue-leakage', payload);
        if (res.data.success) {
          setData([res.data.data, ...data]);
          toast.success('Discrepancy record logged successfully.');
        }
      }
      setShowLogModal(false);
      setEditingLeakage(null);
      setForm({
        patient: '',
        service: '',
        date: new Date().toISOString().split('T')[0],
        clinical_log: '',
        billing_log: '',
        value: '',
        status: 'Unresolved'
      });
    } catch (err) {
      console.error('Failed to save leakage:', err);
      toast.error('Failed to save discrepancy.');
    }
  };

  // Resolve
  const handleResolveLeakage = async (leakageItem) => {
    try {
      const res = await api.put(`/revenue-leakage/${leakageItem.id}`, {
        ...leakageItem,
        status: 'Recovered'
      });
      if (res.data.success) {
        setData(data.map(d => d.id === leakageItem.id ? res.data.data : d));
        toast.success(`Revenue recovered for ref ${leakageItem.id}!`);
      }
    } catch (err) {
      console.error('Failed to resolve leakage:', err);
      toast.error('Failed to update status.');
    }
  };

  // Delete
  const handleDeleteLeakage = async (id) => {
    if (!window.confirm('Are you sure you want to delete this record?')) return;
    try {
      const res = await api.delete(`/revenue-leakage/${id}`);
      if (res.data.success) {
        setData(data.filter(d => d.id !== id));
        toast.success('Record deleted.');
      }
    } catch (err) {
      console.error('Failed to delete leakage:', err);
      toast.error('Failed to delete record.');
    }
  };

  // Edit
  const handleEditLeakage = (leakageItem) => {
    setEditingLeakage(leakageItem);
    setForm({
      patient: leakageItem.patient,
      service: leakageItem.service,
      date: leakageItem.date,
      clinical_log: leakageItem.clinical_log,
      billing_log: leakageItem.billing_log,
      value: leakageItem.value,
      status: leakageItem.status
    });
    setShowLogModal(true);
  };

  // Computed metrics
  const totalLeakage = useMemo(() => {
    return data.filter(d => d.status === 'Unresolved').reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);
  }, [data]);

  const recovered = useMemo(() => {
    return data.filter(d => d.status === 'Recovered').reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);
  }, [data]);

  const pendingAudits = useMemo(() => {
    return data.filter(d => d.status === 'Unresolved').length;
  }, [data]);

  const recoveryRate = useMemo(() => {
    const total = totalLeakage + recovered;
    return total > 0 ? Math.round((recovered / total) * 100) : 0;
  }, [totalLeakage, recovered]);

  const filteredData = useMemo(() => {
    return data.filter(d => {
      const matchesStatus = filter === 'All' || d.status === filter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        (d.patient || '').toLowerCase().includes(q) ||
        (d.service || '').toLowerCase().includes(q) ||
        (d.id || '').toLowerCase().includes(q) ||
        (d.billing_log || '').toLowerCase().includes(q) ||
        (d.clinical_log || '').toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [data, filter, searchQuery]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#1C69A0]" />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Loading Financial Assurance Data...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center flex-shrink-0 border border-rose-100">
            <TrendingDown size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Revenue Leakage Tracker</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Financial assurance auditing clinical events against Sukraa billing invoices
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <button 
            type="button"
            onClick={() => {
              setEditingLeakage(null);
              setForm({
                patient: '',
                service: '',
                date: new Date().toISOString().split('T')[0],
                clinical_log: '',
                billing_log: '',
                value: '',
                status: 'Unresolved'
              });
              setShowLogModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <Plus size={14} /> Log Discrepancy
          </button>
          <button 
            type="button"
            onClick={handleSystemScan}
            disabled={scanning}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#1C69A0] hover:bg-[#15527d] rounded-xl transition-colors shadow-xs disabled:opacity-50"
          >
            {scanning ? <Loader2 size={14} className="animate-spin" /> : <FileSearch size={14} />} 
            Run Full System Scan
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0 border border-rose-100">
            <AlertCircle size={20} />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Identified Leakage</p>
            <p className="text-lg font-bold text-rose-600 tabular-nums">RWF {totalLeakage.toLocaleString()}</p>
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 border border-emerald-100">
            <DollarSign size={20} />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Recovered Revenue</p>
            <p className="text-lg font-bold text-emerald-600 tabular-nums">RWF {recovered.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-sky-50 text-[#1C69A0] flex items-center justify-center flex-shrink-0 border border-sky-100">
            <Activity size={20} />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Pending Audits</p>
            <p className="text-lg font-bold text-slate-800 tabular-nums">{pendingAudits} Cases</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center flex-shrink-0 border border-slate-200">
            <CheckCircle size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Recovery Rate</p>
            <p className="text-lg font-bold text-slate-800 tabular-nums">{recoveryRate}%</p>
          </div>
        </div>
      </div>

      {/* ── Data Table Card ── */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
        {/* Table Filter & Search Toolbar */}
        <div className="p-4 border-b border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-800">Discrepancy Matrix</h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 font-mono">
              {filteredData.length}
            </span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Quick Status Pills */}
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-2xs">
              {['All', 'Unresolved', 'Recovered'].map(st => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setFilter(st)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                    filter === st 
                      ? 'bg-[#1C69A0] text-white shadow-2xs' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* Instant Search Bar (Clean, no placeholder) */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-56 pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:border-[#1C69A0] focus:ring-1 focus:ring-sky-100 transition-all font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1150px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                <th className="py-3.5 px-6 w-[15%] min-w-[150px]">Reference & Date</th>
                <th className="py-3.5 px-6 w-[18%] min-w-[180px]">Patient</th>
                <th className="py-3.5 px-6 w-[28%] min-w-[280px]">Clinical Event</th>
                <th className="py-3.5 px-6 w-[23%] min-w-[240px]">Billing Status</th>
                <th className="py-3.5 px-6 w-[10%] min-w-[120px]">Value At Risk</th>
                <th className="py-3.5 px-6 w-[6%] min-w-[110px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredData.map(row => {
                const isRecovered = row.status === 'Recovered';
                return (
                  <tr 
                    key={row.id} 
                    className={`hover:bg-slate-50/70 transition-colors ${isRecovered ? 'bg-slate-50/30' : ''}`}
                  >
                    <td className="py-4 px-6">
                      <div className="font-mono text-xs font-bold text-slate-700">{row.id}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{row.date}</div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-bold text-slate-800 text-xs">{row.patient}</div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-semibold text-slate-800 text-xs">{row.service}</div>
                      <div className="text-[11px] text-emerald-600 font-medium flex items-center gap-1.5 mt-1.5">
                        <CheckCircle size={12} className="flex-shrink-0" />
                        <span className="text-slate-600 font-medium leading-relaxed">{row.clinical_log}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                        isRecovered 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        <span className="shrink-0">{isRecovered ? <CheckCircle size={12} /> : <AlertCircle size={12} />}</span>
                        <span>{row.billing_log}</span>
                      </span>
                    </td>
                    <td className="py-4 px-6 font-bold text-slate-900 tabular-nums whitespace-nowrap text-sm">
                      RWF {row.value?.toLocaleString()}
                    </td>
                    <td className="py-4 px-6 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {!isRecovered && (
                          <button 
                            type="button"
                            onClick={() => handleResolveLeakage(row)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors shadow-2xs"
                          >
                            Resolve
                          </button>
                        )}
                        <button 
                          type="button"
                          onClick={() => handleEditLeakage(row)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                          title="Edit Discrepancy"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleDeleteLeakage(row.id)}
                          className="p-1.5 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete Record"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400 font-semibold">
                    No discrepancy records found matching criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Discrepancy Dialog Modal ── */}
      <Dialog open={showLogModal} onOpenChange={setShowLogModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingLeakage ? 'Edit Discrepancy' : 'Log Discrepancy'}</DialogTitle>
            <DialogDescription>Record clinical procedures missing matching billing invoices.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveLeakage} className="p-6 space-y-4">
            <div>
              <Label>Patient Name</Label>
              <Input 
                value={form.patient} 
                onChange={(e) => setForm({ ...form, patient: e.target.value })} 
                required 
              />
            </div>
            <div>
              <Label>Clinical Service / Procedure</Label>
              <Input 
                value={form.service} 
                onChange={(e) => setForm({ ...form, service: e.target.value })} 
                required 
              />
            </div>
            <div>
              <Label>Date</Label>
              <Input 
                type="date"
                value={form.date} 
                onChange={(e) => setForm({ ...form, date: e.target.value })} 
                required 
              />
            </div>
            <div>
              <Label>Clinical Log Details</Label>
              <Input 
                value={form.clinical_log} 
                onChange={(e) => setForm({ ...form, clinical_log: e.target.value })} 
                required 
              />
            </div>
            <div>
              <Label>Billing Log / Status Description</Label>
              <Input 
                value={form.billing_log} 
                onChange={(e) => setForm({ ...form, billing_log: e.target.value })} 
                required 
              />
            </div>
            <div>
              <Label>Value At Risk (RWF)</Label>
              <Input 
                type="number"
                value={form.value} 
                onChange={(e) => setForm({ ...form, value: e.target.value })} 
                required 
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select 
                value={form.status} 
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="Unresolved">Unresolved</option>
                <option value="Recovered">Recovered</option>
              </Select>
            </div>
            <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setShowLogModal(false)}>Cancel</Button>
              <Button type="submit" className="bg-[#1C69A0] hover:bg-[#15527d] text-white font-bold">
                {editingLeakage ? 'Save Changes' : 'Log Discrepancy'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RevenueLeakageTracker;
