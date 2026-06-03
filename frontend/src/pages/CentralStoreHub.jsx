import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Database,
  Truck,
  Plus,
  ArrowRightLeft,
  ShoppingBag,
  Trash2,
  Package,
  Calendar,
  Loader2,
  Search,
  CheckCircle,
  Eye,
  AlertCircle,
  RefreshCw,
  X
} from 'lucide-react';
import api from '../api/axios';
import { toast } from 'react-hot-toast';
import { Card, Badge } from '../components/ui/index.jsx';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';

// ── Expiry helpers ────────────────────────────────────────────────────────────
const getExpiryStatus = (expiryDate) => {
  if (!expiryDate || expiryDate === 'N/A') return null;
  const exp = new Date(expiryDate);
  if (isNaN(exp)) return null;
  const daysLeft = Math.ceil((exp - new Date()) / 86400000);
  if (daysLeft < 0)  return { label: 'Expired',        days: daysLeft, cls: 'bg-red-100 text-red-800 border-red-300' };
  if (daysLeft <= 30) return { label: `${daysLeft}d left`, days: daysLeft, cls: 'bg-red-50 text-red-700 border-red-200' };
  if (daysLeft <= 90) return { label: `${daysLeft}d left`, days: daysLeft, cls: 'bg-amber-50 text-amber-700 border-amber-200' };
  return { label: `${daysLeft}d left`, days: daysLeft, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
};

const fmt = (d) => d ? new Date(d).toLocaleDateString() : 'N/A';
const fmtNum = (n) => n != null ? Number(n).toLocaleString() : '0';

// ── Empty row ─────────────────────────────────────────────────────────────────
const EmptyRow = ({ cols, message }) => (
  <tr>
    <td colSpan={cols} className="py-16 text-center">
      <Package className="mx-auto mb-3 text-slate-300" size={30} />
      <p className="text-sm font-bold text-slate-400">{message}</p>
    </td>
  </tr>
);

// ── Status badge colours ──────────────────────────────────────────────────────
const statusCls = (s) => {
  if (!s) return 'bg-slate-50 text-slate-600 border-slate-200';
  const v = s.toLowerCase();
  if (v === 'pending')  return 'bg-amber-50 text-amber-700 border-amber-200';
  if (v === 'approved') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (v === 'rejected') return 'bg-red-50 text-red-700 border-red-200';
  if (v === 'completed') return 'bg-sky-50 text-sky-700 border-sky-200';
  if (v === 'ordered')  return 'bg-indigo-50 text-indigo-700 border-indigo-200';
  return 'bg-slate-50 text-slate-600 border-slate-200';
};

// ─────────────────────────────────────────────────────────────────────────────
export default function CentralStoreHub() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeTab, setActiveTab]               = useState('stock_in_hand');
  const [activeDept, setActiveDept]             = useState('All Departments');
  const [searchTerm, setSearchTerm]             = useState('');
  const [loading, setLoading]                   = useState(true);

  // ── data ──────────────────────────────────────────────────────────────────
  const [stockItems, setStockItems]             = useState([]);
  const [vendors, setVendors]                   = useState([]);
  const [requisitions, setRequisitions]         = useState([]);
  const [departments, setDepartments]           = useState([]);
  const [masterItems, setMasterItems]           = useState([]); // for receive-stock dropdown

  // ── modal states ──────────────────────────────────────────────────────────
  const [receiveOpen, setReceiveOpen]           = useState(false);
  const [reqDetailOpen, setReqDetailOpen]       = useState(false);
  const [reqCreateOpen, setReqCreateOpen]       = useState(false);
  const [rejectOpen, setRejectOpen]             = useState(false);
  const [rejectReason, setRejectReason]         = useState('');
  const [rejectingId, setRejectingId]           = useState(null);
  const [selectedReq, setSelectedReq]           = useState(null);
  const [reqItems, setReqItems]                 = useState([]);
  const [reqItemsLoading, setReqItemsLoading]   = useState(false);
  const [approvingId, setApprovingId]           = useState(null);
  const [isSubmitting, setIsSubmitting]         = useState(false);
  const [receiveForm, setReceiveForm]           = useState({
    itemId: '', vendorId: '', batchNumber: '', expiryDate: '', purchasePrice: '', quantity: ''
  });
  // New requisition form
  const [newReqForm, setNewReqForm]             = useState({ department_id: '', urgency: 'Normal', notes: '' });
  const [newReqLines, setNewReqLines]           = useState([{ item_id: '', quantity: '' }]);
  // Requisition filters
  const [reqStatusFilter, setReqStatusFilter]   = useState('All');
  const [reqUrgencyFilter, setReqUrgencyFilter] = useState('All');

  // ── load ──────────────────────────────────────────────────────────────────
  const loadData = async () => {
    setLoading(true);
    try {
      const [invRes, reqRes, venRes, deptRes] = await Promise.allSettled([
        api.get('/clinical/inventory/master'),
        api.get('/clinical/inventory/requisitions'),
        api.get('/clinical/inventory/vendors'),
        api.get('/clinical/inventory/departments'),
      ]);

      if (invRes.status === 'fulfilled' && invRes.value.data.success) {
        setStockItems(invRes.value.data.data);
        setMasterItems(invRes.value.data.data);
      }
      if (reqRes.status === 'fulfilled' && reqRes.value.data.success) {
        setRequisitions(reqRes.value.data.data);
      }
      if (venRes.status === 'fulfilled' && venRes.value.data.success) {
        setVendors(venRes.value.data.data);
      }
      if (deptRes.status === 'fulfilled' && deptRes.value.data.success) {
        setDepartments(deptRes.value.data.data);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load Central Store Hub data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // ── derived lists ─────────────────────────────────────────────────────────
  const expiringItems = stockItems.filter(i => {
    const s = getExpiryStatus(i.expiry_date);
    return s && s.days >= 0 && s.days <= 90;
  });

  const disposalItems = stockItems.filter(i => {
    const s = getExpiryStatus(i.expiry_date);
    return s && s.days < 0;
  });

  const pendingReqs = requisitions.filter(r => r.status === 'Pending').length;

  const stockDepts = ['All Departments', ...new Set(stockItems.map(i => i.department).filter(Boolean))];

  const filteredStock = stockItems
    .filter(i => activeDept === 'All Departments' || i.department === activeDept)
    .filter(i =>
      !searchTerm ||
      i.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.batch_number?.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const filteredVendors = vendors.filter(v =>
    !searchTerm ||
    v.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.contact?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredReqs = requisitions.filter(req =>
    !searchTerm ||
    req.department_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.status?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredExpiring = expiringItems.filter(i =>
    !searchTerm ||
    i.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.department?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredDisposals = disposalItems.filter(i =>
    !searchTerm ||
    i.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.batch_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ── actions ───────────────────────────────────────────────────────────────
  const handleApprove = async (reqId, approvedItems) => {
    setApprovingId(reqId);
    try {
      await api.post(`/clinical/inventory/requisitions/${reqId}/approve`, {
        items: approvedItems
      });
      toast.success('Requisition approved & stock transferred!');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve');
    } finally {
      setApprovingId(null);
    }
  };

  const handleViewReq = async (req) => {
    setSelectedReq(req);
    setReqDetailOpen(true);
    setReqItems([]);
    setReqItemsLoading(true);
    try {
      const res = await api.get(`/clinical/inventory/requisitions/${req.id}/items`);
      if (res.data.success) {
        const items = res.data.data.map(ri => {
          const maxStock = Number(ri.central_stock) || 0;
          const defaultAppQty = Math.min(ri.requested_quantity, maxStock);
          return {
            ...ri,
            approved_quantity: (req.status === 'Pending' && (ri.approved_quantity === 0 || ri.approved_quantity === null || ri.approved_quantity === undefined))
              ? defaultAppQty
              : ri.approved_quantity
          };
        });
        setReqItems(items);
      }
    } catch {
      toast.error('Could not load requisition items');
    } finally {
      setReqItemsLoading(false);
    }
  };

  const handleCreateRequisition = async (e) => {
    e.preventDefault();
    const validLines = newReqLines.filter(l => l.item_id && l.quantity > 0);
    if (!newReqForm.department_id || validLines.length === 0) {
      toast.error('Please select a department and add at least one item.');
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post('/clinical/inventory/requisitions', {
        department_id: newReqForm.department_id,
        urgency: newReqForm.urgency,
        notes: newReqForm.notes,
        items: validLines.map(l => ({ item_id: l.item_id, quantity: Number(l.quantity) }))
      });
      toast.success('Requisition submitted successfully!');
      setReqCreateOpen(false);
      setNewReqForm({ department_id: '', urgency: 'Normal', notes: '' });
      setNewReqLines([{ item_id: '', quantity: '' }]);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit requisition');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openRejectDialog = (req) => {
    setRejectingId(req.id);
    setRejectReason('');
    setRejectOpen(true);
  };

  const handleReject = async () => {
    setIsSubmitting(true);
    try {
      await api.post(`/clinical/inventory/requisitions/${rejectingId}/reject`, { reason: rejectReason });
      toast.success('Requisition rejected.');
      setRejectOpen(false);
      setRejectingId(null);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReceiveStock = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post('/clinical/inventory/batches', {
        itemId: receiveForm.itemId,
        vendorId: receiveForm.vendorId || null,
        batchNumber: receiveForm.batchNumber,
        expiryDate: receiveForm.expiryDate || null,
        purchasePrice: receiveForm.purchasePrice,
        quantity: receiveForm.quantity
      });
      toast.success('Stock received successfully!');
      setReceiveOpen(false);
      setReceiveForm({ itemId: '', vendorId: '', batchNumber: '', expiryDate: '', purchasePrice: '', quantity: '' });
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to receive stock');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── tabs config ───────────────────────────────────────────────────────────
  const tabs = [
    { id: 'stock_in_hand', label: 'Stock In Hand',        icon: <Package size={13} />,        badge: stockItems.length },
    { id: 'vendors',       label: 'Vendors',              icon: <Truck size={13} />,           badge: vendors.length },
    { id: 'requisitions',  label: 'Requisitions',         icon: <ArrowRightLeft size={13} />,  badge: pendingReqs || null },
    { id: 'expiring',      label: 'Expiring Items',       icon: <Calendar size={13} />,        badge: expiringItems.length || null },
    { id: 'disposals',     label: 'Disposal Mgt',         icon: <Trash2 size={13} />,          badge: disposalItems.length || null },
  ];

  const inputCls = 'w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none';
  const labelCls = 'block text-xs font-bold text-slate-700 mb-1';

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50/50 pb-12 font-sans">

      {/* ── Header ── */}
      <div className="bg-white border-b sticky top-0 z-30 shadow-sm px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="flex items-center text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3.5 py-2 rounded-xl transition-all shadow-sm cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-sky-700 text-white rounded-xl"><Database size={18} /></span>
              <h1 className="text-lg font-black text-slate-900 tracking-tight">Central Store Hub</h1>
            </div>
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider mt-0.5">Global Stock & Procurement Management</p>
          </div>
        </div>

        {/* Header actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3.5 py-2 rounded-xl transition-all cursor-pointer"
          >
            <RefreshCw size={13} /> Refresh
          </button>
          <button
            onClick={() => setReceiveOpen(true)}
            className="flex items-center gap-1.5 text-xs font-bold text-white bg-sky-700 hover:bg-sky-800 px-3.5 py-2 rounded-xl transition-all cursor-pointer"
          >
            <Plus size={13} /> Receive Stock
          </button>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 mt-6">

        {/* ── Navigation & Search ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex overflow-x-auto gap-1 bg-white px-3 py-2 rounded-2xl border border-slate-200/70 shadow-sm scrollbar-none flex-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setSearchTerm(''); }}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all shrink-0 cursor-pointer relative ${
                  activeTab === tab.id
                    ? 'bg-sky-700 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                {tab.icon}
                {tab.label}
                {tab.badge != null && (
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="relative shrink-0 w-full md:w-64">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
            <input
              type="text"
              placeholder="Search in active tab..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-600 shadow-sm"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex h-[40vh] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-sky-700" />
          </div>
        ) : (
          <div className="space-y-6">

            {/* ══ TAB 1: STOCK IN HAND ══ */}
            {activeTab === 'stock_in_hand' && (
              <Card className="p-6 border border-slate-200/60 shadow-sm bg-white rounded-2xl">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-5">
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Stock In Hand Per Department</h3>
                    <p className="text-[10px] text-slate-400 font-extrabold mt-0.5">
                      Showing {filteredStock.length} of {stockItems.length} items
                    </p>
                  </div>

                  {/* Department filter pills */}
                  <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl">
                    {stockDepts.map(dept => (
                      <button
                        key={dept}
                        onClick={() => setActiveDept(dept)}
                        className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                          activeDept === dept
                            ? 'bg-white text-sky-700 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        {dept}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 uppercase tracking-widest text-[9px] font-black border-b border-slate-200">
                        <th className="py-3 px-4">Item Name</th>
                        <th className="py-3 px-4">SKU</th>
                        <th className="py-3 px-4">Batch</th>
                        <th className="py-3 px-4">UoM</th>
                        <th className="py-3 px-4">Expiry</th>
                        <th className="py-3 px-4">Purchase Date</th>
                        <th className="py-3 px-4">Vendor</th>
                        <th className="py-3 px-4">Department</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4 text-center">Qty</th>
                        <th className="py-3 px-4 text-right">Price (RWF)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                      {filteredStock.length === 0
                        ? <EmptyRow cols={11} message="No stock items found." />
                        : filteredStock.map((item, idx) => {
                            const expStatus = getExpiryStatus(item.expiry_date);
                            return (
                              <tr key={idx} className="hover:bg-slate-50/60">
                                <td className="py-3 px-4 text-slate-900 font-black text-[13px] max-w-[180px] truncate">{item.name}</td>
                                <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">{item.sku || '—'}</td>
                                <td className="py-3 px-4 font-mono text-sky-700 text-[11px]">{item.batch_number || '—'}</td>
                                <td className="py-3 px-4">{item.unit_of_measure || '—'}</td>
                                <td className="py-3 px-4">
                                  {expStatus
                                    ? <Badge className={expStatus.cls}>{item.expiry_date ? fmt(item.expiry_date) : 'N/A'}</Badge>
                                    : <span className="text-slate-400">—</span>
                                  }
                                </td>
                                <td className="py-3 px-4 text-slate-500">{fmt(item.purchase_time)}</td>
                                <td className="py-3 px-4 text-slate-500">{item.vendor || '—'}</td>
                                <td className="py-3 px-4 text-sky-700">{item.department || '—'}</td>
                                <td className="py-3 px-4 capitalize text-slate-500">{item.category?.replace(/_/g, ' ') || '—'}</td>
                                <td className="py-3 px-4 text-center text-slate-900 font-black">{fmtNum(item.quantity)}</td>
                                <td className="py-3 px-4 text-right font-mono">{fmtNum(item.price)} RWF</td>
                              </tr>
                            );
                          })
                      }
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* ══ TAB 2: VENDORS ══ */}
            {activeTab === 'vendors' && (
              <Card className="p-6 border border-slate-200/60 shadow-sm bg-white rounded-2xl">
                <div className="flex justify-between items-center mb-5">
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Vendors & Suppliers</h3>
                    <p className="text-[10px] text-slate-400 font-extrabold mt-0.5">Approved medical and stationery suppliers</p>
                  </div>
                  <Badge className="bg-sky-50 text-sky-700 border-sky-200 text-xs">{vendors.length} Vendors</Badge>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 uppercase tracking-widest text-[9px] font-black border-b border-slate-200">
                        <th className="py-3 px-4">#</th>
                        <th className="py-3 px-4">Vendor Name</th>
                        <th className="py-3 px-4">Contact</th>
                        <th className="py-3 px-4">Contract Terms</th>
                        <th className="py-3 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                      {filteredVendors.length === 0
                        ? <EmptyRow cols={5} message="No vendors found." />
                        : filteredVendors.map((v, i) => (
                          <tr key={v.id} className="hover:bg-slate-50/60">
                            <td className="py-3 px-4 text-slate-400 text-[11px]">{i + 1}</td>
                            <td className="py-3 px-4 text-slate-900 font-black text-[13px]">{v.name}</td>
                            <td className="py-3 px-4 text-slate-500">{v.contact || '—'}</td>
                            <td className="py-3 px-4 font-mono text-slate-500">{v.contract_terms || '—'}</td>
                            <td className="py-3 px-4 text-center">
                              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Active</Badge>
                            </td>
                          </tr>
                        ))
                      }
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* ══ TAB 3: REQUISITIONS ══ */}
            {activeTab === 'requisitions' && (
              <Card className="border border-slate-200/60 shadow-sm bg-white rounded-2xl overflow-hidden">
                {/* Header */}
                <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Department Requisitions</h3>
                    <div className="flex items-center gap-3 mt-1.5">
                      {['All','Pending','Approved','Rejected'].map(s => {
                        const cnt = s === 'All' ? requisitions.length : requisitions.filter(r => r.status === s).length;
                        return (
                          <button
                            key={s}
                            onClick={() => setReqStatusFilter(s)}
                            className={`text-[10px] font-black px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                              reqStatusFilter === s
                                ? s === 'Pending'  ? 'bg-amber-500 text-white border-amber-500'
                                : s === 'Approved' ? 'bg-emerald-500 text-white border-emerald-500'
                                : s === 'Rejected' ? 'bg-red-500 text-white border-red-500'
                                                  : 'bg-indigo-600 text-white border-indigo-600'
                                : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            {s} {cnt > 0 && <span className="ml-0.5 opacity-80">({cnt})</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={reqUrgencyFilter}
                      onChange={e => setReqUrgencyFilter(e.target.value)}
                      className="text-xs font-bold border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer"
                    >
                      <option value="All">All Urgency</option>
                      <option value="Normal">Normal</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                    <button
                      onClick={() => setReqCreateOpen(true)}
                      className="flex items-center gap-1.5 px-4 py-2 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors cursor-pointer shadow-sm shadow-indigo-200"
                    >
                      <Plus size={13} /> New Requisition
                    </button>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 uppercase tracking-widest text-[9px] font-black border-b border-slate-200">
                        <th className="py-3 px-4">#</th>
                        <th className="py-3 px-4">Department</th>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Urgency</th>
                        <th className="py-3 px-4 text-center">Items</th>
                        <th className="py-3 px-4">Notes</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                      {(() => {
                        const filtered = requisitions.filter(req => {
                          const matchStatus  = reqStatusFilter === 'All' || req.status === reqStatusFilter;
                          const matchUrgency = reqUrgencyFilter === 'All' || req.urgency === reqUrgencyFilter;
                          const matchSearch  = !searchTerm ||
                            req.department_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            req.status?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            req.notes?.toLowerCase().includes(searchTerm.toLowerCase());
                          return matchStatus && matchUrgency && matchSearch;
                        });
                        if (filtered.length === 0) return <EmptyRow cols={8} message="No requisitions match your filters." />;
                        return filtered.map((req, i) => (
                          <tr key={req.id} className={`hover:bg-slate-50/60 ${req.urgency === 'Critical' ? 'bg-red-50/30' : ''}`}>
                            <td className="py-3 px-4 text-slate-400 text-[11px]">{i + 1}</td>
                            <td className="py-3 px-4 text-sky-700 font-black text-[13px]">{req.department_name || '—'}</td>
                            <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{fmt(req.created_at)}</td>
                            <td className="py-3 px-4">
                              <Badge className={
                                req.urgency === 'Critical' ? 'bg-red-100 text-red-800 border-red-300' :
                                req.urgency === 'High'     ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                'bg-slate-50 text-slate-600 border-slate-200'
                              }>
                                {req.urgency || 'Normal'}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-center font-black text-slate-700">{req.items_count || 0}</td>
                            <td className="py-3 px-4 text-slate-400 max-w-[180px] truncate text-[11px]">
                              {req.notes || <span className="italic text-slate-300">—</span>}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <Badge className={statusCls(req.status)}>{req.status}</Badge>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex justify-end gap-1.5">
                                <button
                                  onClick={() => handleViewReq(req)}
                                  className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-black text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                                >
                                  <Eye size={11} /> View
                                </button>
                                {req.status === 'Pending' && (<>
                                  <button
                                    onClick={() => handleApprove(req.id)}
                                    disabled={approvingId === req.id}
                                    className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                                  >
                                    {approvingId === req.id ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle size={11} />}
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => openRejectDialog(req)}
                                    className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-black text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors cursor-pointer"
                                  >
                                    <X size={11} /> Reject
                                  </button>
                                </>)}
                              </div>
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* ══ TAB 4: EXPIRING ITEMS ══ */}
            {activeTab === 'expiring' && (
              <Card className="p-6 border border-slate-200/60 shadow-sm bg-white rounded-2xl">
                <div className="flex justify-between items-center mb-5">
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Expiring Items</h3>
                    <p className="text-[10px] text-slate-400 font-extrabold mt-0.5">Items expiring within the next 90 days</p>
                  </div>
                  {expiringItems.length > 0 && (
                    <div className="flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl px-3 py-1.5">
                      <AlertCircle size={13} />
                      <span className="text-[10px] font-black">{expiringItems.length} items need attention</span>
                    </div>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 uppercase tracking-widest text-[9px] font-black border-b border-slate-200">
                        <th className="py-3 px-4">Item Name</th>
                        <th className="py-3 px-4">Department</th>
                        <th className="py-3 px-4">Batch</th>
                        <th className="py-3 px-4">Expiry Date</th>
                        <th className="py-3 px-4 text-center">Qty Left</th>
                        <th className="py-3 px-4 text-center">Risk</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                      {filteredExpiring.length === 0
                        ? <EmptyRow cols={6} message="No items expiring in the next 90 days." />
                        : filteredExpiring
                            .sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date))
                            .map((item, idx) => {
                              const expStatus = getExpiryStatus(item.expiry_date);
                              return (
                                <tr key={idx} className="hover:bg-slate-50/60">
                                  <td className="py-3 px-4 text-slate-900 font-black text-[13px]">{item.name}</td>
                                  <td className="py-3 px-4 text-sky-700">{item.department || '—'}</td>
                                  <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">{item.batch_number || '—'}</td>
                                  <td className="py-3 px-4 font-bold text-red-600">{fmt(item.expiry_date)}</td>
                                  <td className="py-3 px-4 text-center font-black">{fmtNum(item.quantity)}</td>
                                  <td className="py-3 px-4 text-center">
                                    {expStatus && <Badge className={expStatus.cls}>{expStatus.label}</Badge>}
                                  </td>
                                </tr>
                              );
                            })
                      }
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* ══ TAB 5: DISPOSAL MANAGEMENT ══ */}
            {activeTab === 'disposals' && (
              <div className="space-y-6">
                {/* Items to Dispose (Expired) */}
                <Card className="p-6 border border-red-100 shadow-sm bg-white rounded-2xl">
                  <div className="flex justify-between items-center mb-5">
                    <div>
                      <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Items to Dispose</h3>
                      <p className="text-[10px] text-slate-400 font-extrabold mt-0.5">Expired items requiring authorised disposal</p>
                    </div>
                    {disposalItems.length > 0 && (
                      <div className="flex items-center gap-1.5 bg-red-50 text-red-700 border border-red-200 rounded-xl px-3 py-1.5">
                        <AlertCircle size={13} />
                        <span className="text-[10px] font-black">{disposalItems.length} expired</span>
                      </div>
                    )}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-slate-400 uppercase tracking-widest text-[9px] font-black border-b border-slate-200">
                          <th className="py-3 px-4">Item Name</th>
                          <th className="py-3 px-4">Department</th>
                          <th className="py-3 px-4">Batch</th>
                          <th className="py-3 px-4">Expired On</th>
                          <th className="py-3 px-4 text-center">Qty</th>
                          <th className="py-3 px-4 text-center">Reason</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                        {filteredDisposals.length === 0
                          ? <EmptyRow cols={6} message="No expired items found." />
                          : filteredDisposals.map((item, idx) => (
                            <tr key={idx} className="hover:bg-red-50/30">
                              <td className="py-3 px-4 text-slate-900 font-black text-[13px]">{item.name}</td>
                              <td className="py-3 px-4 text-sky-700">{item.department || '—'}</td>
                              <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">{item.batch_number || '—'}</td>
                              <td className="py-3 px-4 font-bold text-red-600">{fmt(item.expiry_date)}</td>
                              <td className="py-3 px-4 text-center font-black">{fmtNum(item.quantity)}</td>
                              <td className="py-3 px-4 text-center">
                                <Badge className="bg-red-50 text-red-700 border-red-200">Expired</Badge>
                              </td>
                            </tr>
                          ))
                        }
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            )}

          </div>
        )}
      </div>

      {/* ══ MODAL: Receive Stock ══ */}
      <Modal isOpen={receiveOpen} onClose={() => setReceiveOpen(false)} title="Receive Stock">
        <form onSubmit={handleReceiveStock} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className={labelCls}>Item *</label>
              <select
                required
                value={receiveForm.itemId}
                onChange={e => setReceiveForm({ ...receiveForm, itemId: e.target.value })}
                className={inputCls}
              >
                <option value="">Select item…</option>
                {masterItems.map(i => (
                  <option key={i.id} value={i.id}>{i.name} ({i.sku || 'no SKU'})</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Vendor</label>
              <select
                value={receiveForm.vendorId}
                onChange={e => setReceiveForm({ ...receiveForm, vendorId: e.target.value })}
                className={inputCls}
              >
                <option value="">Select vendor…</option>
                {vendors.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Batch Number *</label>
              <input
                required type="text"
                value={receiveForm.batchNumber}
                onChange={e => setReceiveForm({ ...receiveForm, batchNumber: e.target.value })}
                placeholder="e.g. BCH-20001"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Expiry Date</label>
              <input
                type="date"
                value={receiveForm.expiryDate}
                onChange={e => setReceiveForm({ ...receiveForm, expiryDate: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Purchase Price (RWF)</label>
              <input
                type="number" min="0"
                value={receiveForm.purchasePrice}
                onChange={e => setReceiveForm({ ...receiveForm, purchasePrice: e.target.value })}
                placeholder="0"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Quantity *</label>
              <input
                required type="number" min="1"
                value={receiveForm.quantity}
                onChange={e => setReceiveForm({ ...receiveForm, quantity: e.target.value })}
                placeholder="0"
                className={inputCls}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setReceiveOpen(false)}
              className="px-4 py-2 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-sky-700 hover:bg-sky-800 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting && <Loader2 size={15} className="animate-spin" />}
              Receive Stock
            </button>
          </div>
        </form>
      </Modal>

      {/* ══ MODAL: Requisition Detail ══ */}
      <Modal
        isOpen={reqDetailOpen}
        onClose={() => { setReqDetailOpen(false); setSelectedReq(null); setReqItems([]); }}
        title={`Requisition #${selectedReq?.id} — ${selectedReq?.department_name}`}
      >
        <div className="space-y-4">
          {/* Meta */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Status</p>
              <Badge className={`mt-1 ${statusCls(selectedReq?.status)}`}>{selectedReq?.status}</Badge>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Urgency</p>
              <Badge className={`mt-1 ${selectedReq?.urgency === 'High' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                {selectedReq?.urgency || 'Normal'}
              </Badge>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Date</p>
              <p className="text-xs font-black text-slate-700 mt-1">{fmt(selectedReq?.created_at)}</p>
            </div>
          </div>

          {/* Items table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            {reqItemsLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="animate-spin text-sky-700" size={20} />
              </div>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 uppercase tracking-widest text-[9px] font-black border-b border-slate-200">
                    <th className="py-2.5 px-4 text-left">Item</th>
                    <th className="py-2.5 px-4 text-left">UoM</th>
                    <th className="py-2.5 px-4 text-center">Requested Qty</th>
                    <th className="py-2.5 px-4 text-center">Central Stock</th>
                    <th className="py-2.5 px-4 text-center">Approved Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                  {reqItems.length === 0
                    ? <EmptyRow cols={5} message="No items in this requisition." />
                    : reqItems.map(ri => (
                      <tr key={ri.id} className="hover:bg-slate-50/60">
                        <td className="py-2.5 px-4 text-slate-900 font-black">{ri.item_name}</td>
                        <td className="py-2.5 px-4 text-slate-500">{ri.unit_of_measure || '—'}</td>
                        <td className="py-2.5 px-4 text-center">{ri.requested_quantity}</td>
                        <td className="py-2.5 px-4 text-center">
                          <span className={Number(ri.central_stock) >= Number(ri.requested_quantity) ? 'text-emerald-700' : 'text-red-600'}>
                            {fmtNum(ri.central_stock)}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          {selectedReq?.status === 'Pending' ? (
                            <input
                              type="number"
                              min="0"
                              max={Math.min(ri.requested_quantity, Number(ri.central_stock) || 0)}
                              value={ri.approved_quantity ?? Math.min(ri.requested_quantity, Number(ri.central_stock) || 0)}
                              onChange={(e) => {
                                const maxAllowed = Math.min(ri.requested_quantity, Number(ri.central_stock) || 0);
                                const val = e.target.value === '' ? '' : Math.min(maxAllowed, Math.max(0, Number(e.target.value)));
                                setReqItems(prev => prev.map(item => item.id === ri.id ? { ...item, approved_quantity: val } : item));
                              }}
                              className="w-16 p-1 text-center bg-slate-50 border border-slate-200 rounded text-xs font-bold focus:ring-1 focus:ring-sky-500 focus:outline-none"
                            />
                          ) : (
                            ri.approved_quantity ?? '—'
                          )}
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            )}
          </div>

          {/* Approve from detail modal */}
          {selectedReq?.status === 'Pending' && (
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  const approvedPayload = reqItems.map(ri => ({
                    id: ri.id,
                    item_id: ri.item_id,
                    approved_quantity: ri.approved_quantity === '' ? 0 : Number(ri.approved_quantity)
                  }));
                  handleApprove(selectedReq.id, approvedPayload);
                  setReqDetailOpen(false);
                }}
                disabled={approvingId === selectedReq?.id}
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                {approvingId === selectedReq?.id
                  ? <Loader2 size={15} className="animate-spin" />
                  : <CheckCircle size={15} />
                }
                Approve & Transfer Stock
              </button>
            </div>
          )}
        </div>
      </Modal>

      {/* ══ MODAL: New Requisition ══ */}
      <Modal isOpen={reqCreateOpen} onClose={() => setReqCreateOpen(false)} title="New Requisition">
        <form onSubmit={handleCreateRequisition} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Department *</label>
              <select
                required
                value={newReqForm.department_id}
                onChange={e => setNewReqForm({ ...newReqForm, department_id: e.target.value })}
                className={inputCls}
              >
                <option value="">Select Department…</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Urgency *</label>
              <select
                required
                value={newReqForm.urgency}
                onChange={e => setNewReqForm({ ...newReqForm, urgency: e.target.value })}
                className={inputCls}
              >
                <option value="Normal">Normal</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className={labelCls}>Notes</label>
              <textarea
                value={newReqForm.notes}
                onChange={e => setNewReqForm({ ...newReqForm, notes: e.target.value })}
                placeholder="Any special instructions or comments..."
                className={`${inputCls} h-20 resize-none`}
              />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Requisition Items</h4>
              <button
                type="button"
                onClick={() => setNewReqLines([...newReqLines, { item_id: '', quantity: '' }])}
                className="flex items-center gap-1 text-[10px] font-black text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-lg border border-indigo-100 transition-all cursor-pointer"
              >
                <Plus size={11} /> Add Item
              </button>
            </div>

            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {newReqLines.map((line, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="flex-1">
                    <select
                      required
                      value={line.item_id}
                      onChange={e => {
                        const updated = [...newReqLines];
                        updated[idx].item_id = e.target.value;
                        setNewReqLines(updated);
                      }}
                      className={inputCls}
                    >
                      <option value="">Select Item…</option>
                      {masterItems.map(i => (
                        <option key={i.id} value={i.id}>{i.name} ({i.sku || 'no SKU'})</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-24">
                    <input
                      required
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={line.quantity}
                      onChange={e => {
                        const updated = [...newReqLines];
                        updated[idx].quantity = e.target.value;
                        setNewReqLines(updated);
                      }}
                      className={inputCls}
                    />
                  </div>
                  {newReqLines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setNewReqLines(newReqLines.filter((_, i) => i !== idx))}
                      className="p-2.5 text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-100 rounded-xl transition-all cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setReqCreateOpen(false)}
              className="px-4 py-2 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting && <Loader2 size={15} className="animate-spin" />}
              Submit Requisition
            </button>
          </div>
        </form>
      </Modal>

      {/* ══ MODAL: Reject Requisition ══ */}
      <Modal isOpen={rejectOpen} onClose={() => { setRejectOpen(false); setRejectingId(null); }} title="Reject Requisition">
        <div className="space-y-4">
          <p className="text-xs text-slate-500 font-bold">
            Please provide a reason for rejecting this requisition. This will be visible to the department.
          </p>
          <div>
            <label className={labelCls}>Rejection Reason *</label>
            <textarea
              required
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="e.g. Insufficient stock, invalid request, etc."
              className={`${inputCls} h-24 resize-none`}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => { setRejectOpen(false); setRejectingId(null); }}
              className="px-4 py-2 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleReject}
              disabled={isSubmitting || !rejectReason.trim()}
              className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting && <Loader2 size={15} className="animate-spin" />}
              Reject Requisition
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
