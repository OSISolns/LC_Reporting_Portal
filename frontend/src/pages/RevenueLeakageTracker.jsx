import { useState, useEffect } from 'react';
import { 
  TrendingDown, DollarSign, AlertCircle, FileSearch, 
  CheckCircle, ArrowRight, Activity, Plus, Trash2, Edit2, Loader2, RefreshCw
} from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Button, Card, Badge, Input, Select, Label, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/index.jsx';
import toast from 'react-hot-toast';

const RevenueLeakageTracker = () => {
  const { user } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [filter, setFilter] = useState('All');

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
      const res = await api.get('/api/revenue-leakage');
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
      const res = await api.post('/api/revenue-leakage/scan');
      if (res.data.success) {
        toast.success(res.data.message || 'Scan complete! Discrepancy found.', { id: 'scan' });
        // Re-fetch data
        const freshRes = await api.get('/api/revenue-leakage');
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
      if (editingLeakage) {
        const res = await api.put(`/api/revenue-leakage/${editingLeakage.id}`, form);
        if (res.data.success) {
          setData(data.map(d => d.id === editingLeakage.id ? res.data.data : d));
          toast.success('Discrepancy record updated.');
        }
      } else {
        const res = await api.post('/api/revenue-leakage', form);
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
      const res = await api.put(`/api/revenue-leakage/${leakageItem.id}`, {
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
      const res = await api.delete(`/api/revenue-leakage/${id}`);
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
  const totalLeakage = data.filter(d => d.status === 'Unresolved').reduce((acc, curr) => acc + curr.value, 0);
  const recovered = data.filter(d => d.status === 'Recovered').reduce((acc, curr) => acc + curr.value, 0);
  const pendingAudits = data.filter(d => d.status === 'Unresolved').length;

  const filteredData = filter === 'All' ? data : data.filter(d => d.status === filter);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-rose-600" />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">Loading Financial Leakage Data...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Financial Intelligence & Assurance</p>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <TrendingDown size={32} className="text-rose-600" /> Revenue Leakage Tracker
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Button 
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
            variant="outline"
            className="flex items-center gap-1.5"
          >
            <Plus size={16} /> Log Discrepancy
          </Button>
          <Button 
            onClick={handleSystemScan}
            disabled={scanning}
            className="flex items-center gap-1.5 bg-slate-900 text-white hover:bg-slate-800"
          >
            {scanning ? <Loader2 size={16} className="animate-spin" /> : <FileSearch size={16} />} 
            Run Full System Scan
          </Button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[24px] border-2 border-slate-100 flex items-center gap-5 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <AlertCircle size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">IDENTIFIED LEAKAGE</p>
            <p className="text-2xl font-black text-rose-600">RWF {totalLeakage.toLocaleString()}</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-[24px] border-2 border-slate-100 flex items-center gap-5 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">RECOVERED REVENUE</p>
            <p className="text-2xl font-black text-emerald-600">RWF {recovered.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[24px] border-2 border-slate-100 flex items-center gap-5 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#1b669d] flex items-center justify-center">
            <Activity size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">PENDING AUDITS</p>
            <p className="text-2xl font-black text-slate-900">{pendingAudits}</p>
          </div>
        </div>
      </div>

      {/* ── Data Table Card ── */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5 mb-5">
          <h2 className="text-lg font-black text-slate-900">Discrepancy Matrix</h2>
          <div className="flex items-center gap-3">
            <Label className="mb-0 mr-1">Filter Status</Label>
            <Select 
              value={filter} 
              onChange={e => setFilter(e.target.value)} 
              className="w-44"
            >
              <option value="All">All Statuses</option>
              <option value="Unresolved">Unresolved</option>
              <option value="Recovered">Recovered</option>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-100 pb-3">
                <th className="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Reference / Patient</th>
                <th className="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Clinical Event</th>
                <th className="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Billing Status</th>
                <th className="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Value At Risk</th>
                <th className="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map(row => (
                <tr 
                  key={row.id} 
                  className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors"
                  style={{ opacity: row.status === 'Recovered' ? 0.65 : 1 }}
                >
                  <td className="py-4 px-4">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">{row.id} · {row.date}</div>
                    <div className="font-black text-slate-800">{row.patient}</div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="font-bold text-slate-800 text-sm">{row.service}</div>
                    <div className="text-xs text-emerald-600 font-bold flex items-center gap-1 mt-1">
                      <CheckCircle size={12} /> {row.clinical_log}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`inline-flex items-center gap-1 text-xs font-bold ${row.status === 'Recovered' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {row.status === 'Recovered' ? <CheckCircle size={14} /> : <AlertCircle size={14} />} {row.billing_log}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-sm font-black text-slate-900">
                    RWF {row.value.toLocaleString()}
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {row.status === 'Unresolved' && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleResolveLeakage(row)}
                          className="h-8 text-[11px] bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300"
                        >
                          Resolve
                        </Button>
                      )}
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-8 w-8 text-slate-400 hover:text-slate-600"
                        onClick={() => handleEditLeakage(row)}
                      >
                        <Edit2 size={14} />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-8 w-8 text-rose-400 hover:text-rose-600"
                        onClick={() => handleDeleteLeakage(row.id)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-slate-400 font-bold">
                    No discrepancy records found matching criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── Discrepancy Dialog Modal ── */}
      <Dialog open={showLogModal} onOpenChange={setShowLogModal}>
        <DialogContent>
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
                placeholder="e.g. Procedure logged by Doctor / Lab report complete"
                value={form.clinical_log} 
                onChange={(e) => setForm({ ...form, clinical_log: e.target.value })} 
                required 
              />
            </div>
            <div>
              <Label>Billing Log / Status Description</Label>
              <Input 
                placeholder="e.g. Missing Invoice / Underbilled by 10,000"
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
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setShowLogModal(false)}>Cancel</Button>
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RevenueLeakageTracker;
