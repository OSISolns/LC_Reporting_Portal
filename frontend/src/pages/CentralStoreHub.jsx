import React, { useState, useEffect, useMemo } from 'react';
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
  X,
  TrendingUp,
  Activity,
  Sparkles,
  Building,
  Filter,
  Check,
  ChevronDown,
  Edit2,
  CornerUpLeft
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
  if (daysLeft < 0)  return { label: 'Expired',        days: daysLeft, cls: 'bg-red-50 text-red-655 border-red-100' };
  if (daysLeft <= 30) return { label: `${daysLeft}d left`, days: daysLeft, cls: 'bg-rose-50 text-rose-600 border-rose-100' };
  if (daysLeft <= 90) return { label: `${daysLeft}d left`, days: daysLeft, cls: 'bg-amber-50 text-amber-600 border-amber-100' };
  return { label: `${daysLeft}d left`, days: daysLeft, cls: 'bg-emerald-50 text-emerald-600 border-emerald-100' };
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
  if (v === 'pending')  return 'bg-amber-50 text-amber-600 border-amber-100';
  if (v === 'approved') return 'bg-emerald-50 text-emerald-600 border-emerald-100';
  if (v === 'rejected') return 'bg-rose-50 text-rose-600 border-rose-100';
  if (v === 'completed') return 'bg-sky-50 text-sky-600 border-sky-100';
  if (v === 'ordered')  return 'bg-indigo-50 text-indigo-650 border-indigo-100';
  return 'bg-slate-50 text-slate-600 border-slate-200';
};

export default function CentralStoreHub() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeTab, setActiveTab]               = useState('stock_in_hand');
  const [activeDept, setActiveDept]             = useState('All Departments');
  const [searchTerm, setSearchTerm]             = useState('');
  const [loading, setLoading]                   = useState(true);
  const [refreshing, setRefreshing]             = useState(false);

  // ── data ──────────────────────────────────────────────────────────────────
  const [stockItems, setStockItems]             = useState([]);
  const [vendors, setVendors]                   = useState([]);
  const [requisitions, setRequisitions]         = useState([]);
  const [departments, setDepartments]           = useState([]);
  const [masterItems, setMasterItems]           = useState([]);

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

  // Stock Lookup filters
  const [stockCategoryFilter, setStockCategoryFilter] = useState('All');
  const [stockStatusFilter, setStockStatusFilter]     = useState('All');

  // Expiring filter
  const [expiringUrgencyFilter, setExpiringUrgencyFilter] = useState('All');

  // ── load ──────────────────────────────────────────────────────────────────
  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

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
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // ── rectify handlers ──────────────────────────────────────────────────────
  const [rectifyOpen, setRectifyOpen]           = useState(false);
  const [rectifyingItem, setRectifyingItem]     = useState(null);
  const [rectifyForm, setRectifyForm]           = useState({ quantity: '', price: '' });

  const [returnOpen, setReturnOpen]             = useState(false);
  const [returningItem, setReturningItem]       = useState(null);
  const [returnForm, setReturnForm]             = useState({ quantity: '', reason: '' });

  const openRectifyModal = (item) => {
    setRectifyingItem(item);
    setRectifyForm({
      quantity: item.quantity ?? 0,
      price: item.price ?? 0
    });
    setRectifyOpen(true);
  };

  const handleRectifySubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        name: rectifyingItem.name,
        sku: rectifyingItem.sku,
        unit_of_measure: rectifyingItem.unit_of_measure,
        category: rectifyingItem.category,
        batch_id: rectifyingItem.batch_id,
        batch_number: rectifyingItem.batch_number,
        expiry_date: rectifyingItem.expiry_date,
        purchase_time: rectifyingItem.purchase_time,
        price: Number(rectifyForm.price),
        dept_stock_id: rectifyingItem.dept_stock_id,
        department_id: rectifyingItem.department_id,
        quantity: Number(rectifyForm.quantity)
      };
      await api.put(`/clinical/inventory/master/${rectifyingItem.id}`, payload);
      toast.success('Stock quantity and price rectified successfully');
      setRectifyOpen(false);
      loadData(true); // reload silently
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to rectify stock');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openReturnModal = (item) => {
    setReturningItem(item);
    setReturnForm({ quantity: '', reason: '' });
    setReturnOpen(true);
  };

  const handleReturnSubmit = async (e) => {
    e.preventDefault();
    const returnQty = Number(returnForm.quantity);
    if (returnQty <= 0 || returnQty > returningItem.quantity) {
      toast.error('Invalid return quantity');
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        name: returningItem.name,
        sku: returningItem.sku,
        unit_of_measure: returningItem.unit_of_measure,
        category: returningItem.category,
        batch_id: returningItem.batch_id,
        batch_number: returningItem.batch_number,
        expiry_date: returningItem.expiry_date,
        purchase_time: returningItem.purchase_time,
        price: Number(returningItem.price),
        dept_stock_id: returningItem.dept_stock_id,
        department_id: returningItem.department_id,
        quantity: returningItem.quantity - returnQty
      };
      // We update the master inventory to reduce stock.
      await api.put(`/clinical/inventory/master/${returningItem.id}`, payload);
      toast.success('Stock returned to supplier successfully');
      setReturnOpen(false);
      loadData(true); // reload silently
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to return stock');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canRectify = user?.role === 'stock-manager' || user?.role === 'admin';

  // ── derived lists ─────────────────────────────────────────────────────────
  const expiringItems = useMemo(() => {
    return stockItems.filter(i => {
      const s = getExpiryStatus(i.expiry_date);
      return s && s.days >= 0 && s.days <= 90;
    });
  }, [stockItems]);

  const disposalItems = useMemo(() => {
    return stockItems.filter(i => {
      const s = getExpiryStatus(i.expiry_date);
      return s && s.days < 0;
    });
  }, [stockItems]);

  const pendingReqs = useMemo(() => {
    return requisitions.filter(r => r.status === 'Pending').length;
  }, [requisitions]);

  const stockDepts = useMemo(() => {
    const order = ['OPERATIONS', 'DENTAL', 'IMAGING', 'LABORATORY', 'NURSING', 'PHYSIO', 'GLOBAL'];
    if (departments && departments.length > 0) {
      const dbDepts = departments.map(d => d.name.toUpperCase()).filter(name => order.includes(name));
      dbDepts.sort((a, b) => order.indexOf(a) - order.indexOf(b));
      return ['All Departments', ...dbDepts];
    }
    return ['All Departments', ...order];
  }, [departments]);

  const stockCategories = useMemo(() => {
    return ['All', ...new Set(stockItems.map(i => i.category).filter(Boolean))];
  }, [stockItems]);

  // Compute overall KPI stats
  const metrics = useMemo(() => {
    let globalValuation = 0;
    stockItems.forEach(item => {
      globalValuation += (item.quantity * item.price);
    });

    return {
      globalValuation,
      pendingRequisitionsCount: pendingReqs,
      expiringCount: expiringItems.length,
      expiredCount: disposalItems.length,
      vendorCount: vendors.length
    };
  }, [stockItems, pendingReqs, expiringItems, disposalItems, vendors]);

  // Department Allocation Chart Data
  const departmentValuations = useMemo(() => {
    const map = {};
    stockItems.forEach(item => {
      const val = item.quantity * item.price;
      if (val > 0) {
        const dept = item.department || 'Central Store';
        map[dept] = (map[dept] || 0) + val;
      }
    });
    const total = Object.values(map).reduce((a, b) => a + b, 0);
    return Object.entries(map).map(([name, value]) => ({
      name,
      value,
      percentage: total > 0 ? (value / total) * 100 : 0
    })).sort((a, b) => b.value - a.value);
  }, [stockItems]);

  const getDeptColor = (deptName) => {
    if (!deptName) return 'bg-slate-400';
    const lower = deptName.toLowerCase();
    if (lower.includes('central')) return 'bg-indigo-650';
    if (lower.includes('nurs')) return 'bg-emerald-500';
    if (lower.includes('lab')) return 'bg-cyan-500';
    if (lower.includes('imag')) return 'bg-violet-500';
    if (lower.includes('dent')) return 'bg-amber-500';
    if (lower.includes('admin')) return 'bg-rose-500';
    if (lower.includes('physio')) return 'bg-orange-500';
    if (lower.includes('global')) return 'bg-teal-500';
    return 'bg-slate-400';
  };

  const getDeptColorText = (deptName) => {
    if (!deptName) return 'text-slate-500';
    const lower = deptName.toLowerCase();
    if (lower.includes('central')) return 'text-indigo-600';
    if (lower.includes('nurs')) return 'text-emerald-600';
    if (lower.includes('lab')) return 'text-cyan-600';
    if (lower.includes('imag')) return 'text-violet-600';
    if (lower.includes('dent')) return 'text-amber-600';
    if (lower.includes('admin')) return 'text-rose-600';
    if (lower.includes('physio')) return 'text-orange-600';
    if (lower.includes('global')) return 'text-teal-600';
    return 'text-slate-500';
  };

  const getDeptColorBg = (deptName) => {
    if (!deptName) return 'bg-slate-50 border-slate-100';
    const lower = deptName.toLowerCase();
    if (lower.includes('central')) return 'bg-indigo-50 border-indigo-100';
    if (lower.includes('nurs')) return 'bg-emerald-50 border-emerald-100';
    if (lower.includes('lab')) return 'bg-cyan-50 border-cyan-100';
    if (lower.includes('imag')) return 'bg-violet-50 border-violet-100';
    if (lower.includes('dent')) return 'bg-amber-50 border-amber-105';
    if (lower.includes('admin')) return 'bg-rose-50 border-rose-100';
    if (lower.includes('physio')) return 'bg-orange-50 border-orange-100';
    if (lower.includes('global')) return 'bg-teal-50 border-teal-100';
    return 'bg-slate-50 border-slate-100';
  };

  // Filtered lists
  const filteredStock = useMemo(() => {
    return stockItems.filter(item => {
      const matchDept = activeDept === 'All Departments' || item.department === activeDept;
      const matchCategory = stockCategoryFilter === 'All' || item.category === stockCategoryFilter;
      
      let matchStatus = true;
      if (stockStatusFilter === 'Low Stock') {
        matchStatus = item.quantity > 0 && item.quantity < 20;
      } else if (stockStatusFilter === 'Out of Stock') {
        matchStatus = item.quantity === 0;
      } else if (stockStatusFilter === 'Expired') {
        const expStatus = getExpiryStatus(item.expiry_date);
        matchStatus = expStatus && expStatus.days < 0;
      } else if (stockStatusFilter === 'Expiring Soon') {
        const expStatus = getExpiryStatus(item.expiry_date);
        matchStatus = expStatus && expStatus.days >= 0 && expStatus.days <= 90;
      }

      const matchSearch = !searchTerm ||
        item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.batch_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.vendor?.toLowerCase().includes(searchTerm.toLowerCase());

      return matchDept && matchCategory && matchStatus && matchSearch;
    });
  }, [stockItems, activeDept, stockCategoryFilter, stockStatusFilter, searchTerm]);

  const filteredVendors = useMemo(() => {
    return vendors.filter(v =>
      !searchTerm ||
      v.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.contact?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [vendors, searchTerm]);

  const filteredReqs = useMemo(() => {
    return requisitions.filter(req => {
      const matchStatus  = reqStatusFilter === 'All' || req.status === reqStatusFilter;
      const matchUrgency = reqUrgencyFilter === 'All' || req.urgency === reqUrgencyFilter;
      const matchSearch  = !searchTerm ||
        req.department_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.status?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.id.toString().includes(searchTerm);
      return matchStatus && matchUrgency && matchSearch;
    });
  }, [requisitions, reqStatusFilter, reqUrgencyFilter, searchTerm]);

  const filteredExpiring = useMemo(() => {
    return expiringItems.filter(item => {
      let matchUrgency = true;
      const expStatus = getExpiryStatus(item.expiry_date);
      if (expiringUrgencyFilter === 'Critical') {
        matchUrgency = expStatus && expStatus.days <= 30;
      } else if (expiringUrgencyFilter === 'Warning') {
        matchUrgency = expStatus && expStatus.days > 30 && expStatus.days <= 90;
      }

      const matchSearch = !searchTerm ||
        item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.batch_number?.toLowerCase().includes(searchTerm.toLowerCase());

      return matchUrgency && matchSearch;
    });
  }, [expiringItems, expiringUrgencyFilter, searchTerm]);

  const filteredDisposals = useMemo(() => {
    return disposalItems.filter(item =>
      !searchTerm ||
      item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.batch_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.department?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [disposalItems, searchTerm]);

  // ── actions ───────────────────────────────────────────────────────────────
  const handleApprove = async (reqId, approvedItems) => {
    setApprovingId(reqId);
    try {
      await api.post(`/clinical/inventory/requisitions/${reqId}/approve`, {
        items: approvedItems
      });
      toast.success('Requisition approved & stock transferred!');
      loadData(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve');
    } finally {
      setApprovingId(null);
    }
  };

  const handleReject = async () => {
    setIsSubmitting(true);
    try {
      await api.post(`/clinical/inventory/requisitions/${rejectingId}/reject`, { reason: rejectReason });
      toast.success('Requisition rejected.');
      setRejectOpen(false);
      setRejectingId(null);
      loadData(true);
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
      loadData(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to receive stock');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateRequisition = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const activeItems = newReqLines.filter(line => line.item_id && line.quantity);
      if (activeItems.length === 0) {
        toast.error('Please add at least one item');
        setIsSubmitting(false);
        return;
      }
      await api.post('/clinical/inventory/requisitions', {
        department_id: newReqForm.department_id,
        urgency: newReqForm.urgency,
        notes: newReqForm.notes,
        items: activeItems.map(item => ({
          item_id: item.item_id,
          requested_quantity: Number(item.quantity)
        }))
      });
      toast.success('Requisition submitted!');
      setReqCreateOpen(false);
      setNewReqForm({ department_id: '', urgency: 'Normal', notes: '' });
      setNewReqLines([{ item_id: '', quantity: '' }]);
      loadData(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit requisition');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewReq = async (req) => {
    setSelectedReq(req);
    setReqDetailOpen(true);
    setReqItemsLoading(true);
    try {
      const res = await api.get(`/clinical/inventory/requisitions/${req.id}/items`);
      if (res.data.success) {
        setReqItems(res.data.data || []);
      }
    } catch (err) {
      toast.error('Failed to load requisition items');
    } finally {
      setReqItemsLoading(false);
    }
  };

  const openRejectDialog = (req) => {
    setRejectingId(req.id);
    setRejectReason('');
    setRejectOpen(true);
  };

  // ── tabs config ───────────────────────────────────────────────────────────
  const tabs = [
    { id: 'stock_in_hand', label: 'Stock In Hand',        icon: <Package size={13} />,        badge: stockItems.length },
    ...(user?.role !== 'stock-manager' ? [{ id: 'vendors',       label: 'Vendors',              icon: <Truck size={13} />,           badge: vendors.length }] : []),
    { id: 'requisitions',  label: 'Requisitions',         icon: <ArrowRightLeft size={13} />,  badge: pendingReqs || null },
    { id: 'expiring',      label: 'Expiring Items',       icon: <Calendar size={13} />,        badge: expiringItems.length || null },
    { id: 'disposals',     label: 'Disposal Mgt',         icon: <Trash2 size={13} />,          badge: disposalItems.length || null },
  ];

  const inputCls = 'w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none';
  const labelCls = 'block text-xs font-bold text-slate-700 mb-1';

  return (
    <div className="min-h-screen bg-slate-50/50 pb-12 font-sans relative overflow-hidden">
      {/* Decorative Blur Blobs */}
      <div className="absolute top-0 right-0 -mr-32 -mt-32 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 -ml-32 -mb-32 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>

      {/* ── Header ── */}
      <div className="bg-white border-b sticky top-0 z-35 shadow-sm px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="flex items-center text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3.5 py-2 rounded-xl transition-all shadow-xs cursor-pointer"
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
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-650 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer shadow-xs"
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin text-sky-700' : ''} /> Refresh
          </button>
          <button
            onClick={() => setReceiveOpen(true)}
            className="flex items-center gap-1.5 text-xs font-bold text-white bg-sky-700 hover:bg-sky-800 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm shadow-sky-100"
          >
            <Plus size={13} /> Receive Stock
          </button>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 mt-6 relative z-10 space-y-6">

        {/* ── KPI Analytics Row ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <Card className="p-5 border border-slate-200/60 shadow-sm bg-white rounded-2xl flex justify-between items-center group hover:shadow transition-all duration-300">
            <div>
              <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Global Valuation</p>
              <h4 className="text-xl font-black text-slate-800 mt-1">{metrics.globalValuation.toLocaleString()} <span className="text-xs text-slate-500 font-bold">RWF</span></h4>
              <span className="text-[9px] text-indigo-600 bg-indigo-50 border border-indigo-100 rounded px-1.5 py-0.5 mt-2 inline-block font-extrabold">Active Store Value</span>
            </div>
            <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-650 shadow-inner"><TrendingUp size={20} /></div>
          </Card>

          <Card className="p-5 border border-slate-200/60 shadow-sm bg-white rounded-2xl flex justify-between items-center group hover:shadow transition-all duration-300">
            <div>
              <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Registered Vendors</p>
              <h4 className="text-xl font-black text-slate-800 mt-1">{metrics.vendorCount} <span className="text-xs text-slate-500 font-bold">Suppliers</span></h4>
              <span className="text-[9px] text-sky-600 bg-sky-50 border border-sky-100 rounded px-1.5 py-0.5 mt-2 inline-block font-extrabold">Procurement channels</span>
            </div>
            <div className="p-3 rounded-xl bg-sky-50 border border-sky-100 text-sky-600 shadow-inner"><Truck size={20} /></div>
          </Card>

          <Card className="p-5 border border-slate-200/60 shadow-sm bg-white rounded-2xl flex justify-between items-center group hover:shadow transition-all duration-300">
            <div>
              <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Pending Requisitions</p>
              <h4 className="text-xl font-black text-slate-800 mt-1">{metrics.pendingRequisitionsCount} <span className="text-xs text-slate-500 font-bold">Requests</span></h4>
              <span className={`text-[9px] font-extrabold rounded px-1.5 py-0.5 mt-2 inline-block ${metrics.pendingRequisitionsCount > 0 ? 'bg-amber-50 border border-amber-100 text-amber-600 font-bold' : 'bg-slate-50 border border-slate-100 text-slate-500'}`}>
                {metrics.pendingRequisitionsCount > 0 ? 'Approvals outstanding' : 'All approved'}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 shadow-inner"><ArrowRightLeft size={20} /></div>
          </Card>

          <Card className="p-5 border border-slate-200/60 shadow-sm bg-white rounded-2xl flex justify-between items-center group hover:shadow transition-all duration-300">
            <div>
              <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Expired / Expiring</p>
              <h4 className="text-xl font-black text-slate-800 mt-1">{metrics.expiredCount + metrics.expiringCount} <span className="text-xs text-slate-500 font-bold">Batches</span></h4>
              <span className={`text-[9px] font-extrabold rounded px-1.5 py-0.5 mt-2 inline-block ${metrics.expiredCount > 0 ? 'bg-red-50 border border-red-100 text-red-655 font-bold' : 'bg-amber-50 border border-amber-105 text-amber-600'}`}>
                {metrics.expiredCount} expired • {metrics.expiringCount} soon
              </span>
            </div>
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 shadow-inner"><Calendar size={20} /></div>
          </Card>
        </div>

        {/* ── Department Valuation Allocation Progress Bar ── */}
        {departmentValuations.length > 0 && (
          <Card className="p-5 border border-slate-200/60 shadow-sm bg-white rounded-2xl space-y-3">
            <div className="flex justify-between items-center text-xs font-bold text-slate-500">
              <span className="flex items-center gap-1.5"><Sparkles size={14} className="text-indigo-600" /> Stock Value Allocation by Department</span>
              <span>Total Valuation: {metrics.globalValuation.toLocaleString()} RWF</span>
            </div>
            <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden flex shadow-inner border border-slate-200/65">
              {departmentValuations.map((dept, idx) => (
                <div 
                  key={idx}
                  style={{ width: `${dept.percentage}%` }}
                  className={`${getDeptColor(dept.name)} h-full hover:opacity-90 transition-all`}
                  title={`${dept.name}: ${dept.percentage.toFixed(1)}% (${dept.value.toLocaleString()} RWF)`}
                />
              ))}
            </div>
            {/* Legend list */}
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-1 text-[10px] font-black uppercase tracking-wider text-slate-500">
              {departmentValuations.map((dept, idx) => (
                <div key={idx} className="flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${getDeptColor(dept.name)}`}></span>
                  <span>{dept.name} ({dept.percentage.toFixed(1)}%)</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* ── Navigation & Search ── */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
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

          <div className="relative shrink-0 w-full lg:w-72">
            <Search className="absolute left-3.5 top-3 text-slate-400" size={15} />
            <input
              type="text"
              placeholder="Search in active list..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white rounded-xl border border-slate-205 text-sm focus:outline-none focus:ring-2 focus:ring-sky-600 shadow-xs placeholder-slate-400"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex h-[40vh] flex-col items-center justify-center gap-2">
            <Loader2 className="h-10 w-10 animate-spin text-sky-700" />
            <p className="text-slate-400 font-semibold text-xs">Accessing store logs...</p>
          </div>
        ) : (
          <div className="space-y-6">

            {/* ══ TAB 1: STOCK IN HAND ══ */}
            {activeTab === 'stock_in_hand' && (
              <Card className="p-6 border border-slate-200/60 shadow-sm bg-white rounded-2xl">
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-5 pb-4 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5"><Package size={16} className="text-sky-700" /> Stock In Hand Per Department</h3>
                    <p className="text-[10px] text-slate-400 font-extrabold mt-0.5">
                      Showing {filteredStock.length} of {stockItems.length} items
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3 items-center w-full xl:w-auto">
                    {/* Category Dropdown */}
                    <div className="flex items-center gap-2">
                      <Filter size={13} className="text-slate-400" />
                      <select
                        value={stockCategoryFilter}
                        onChange={e => setStockCategoryFilter(e.target.value)}
                        className="text-xs font-bold border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 focus:outline-none cursor-pointer"
                      >
                        <option value="All">All Categories</option>
                        {stockCategories.filter(c => c !== 'All').map((cat, i) => (
                          <option key={i} value={cat}>{cat.replace(/_/g, ' ')}</option>
                        ))}
                      </select>
                    </div>

                    {/* Stock Status Dropdown */}
                    <select
                      value={stockStatusFilter}
                      onChange={e => setStockStatusFilter(e.target.value)}
                      className="text-xs font-bold border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 focus:outline-none cursor-pointer"
                    >
                      <option value="All">All Statuses</option>
                      <option value="Normal">Normal (&ge; 20)</option>
                      <option value="Low Stock">Low Stock (&lt; 20)</option>
                      <option value="Expiring Soon">Expiring (&le; 90 days)</option>
                      <option value="Expired">Expired</option>
                      <option value="Out of Stock">Out of Stock</option>
                    </select>

                    {/* Department filter pills */}
                    <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl scrollbar-none max-w-full overflow-x-auto">
                      {stockDepts.map(dept => (
                        <button
                          key={dept}
                          onClick={() => setActiveDept(dept)}
                          className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                            activeDept === dept
                              ? 'bg-white text-sky-700 shadow-xs'
                              : 'text-slate-500 hover:text-slate-700'
                          }`}
                        >
                          {dept}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 uppercase tracking-widest text-[9px] font-black border-b border-slate-200">
                        <th className="py-3.5 px-4 rounded-l-xl">Item Name</th>
                        <th className="py-3.5 px-4">SKU</th>
                        <th className="py-3.5 px-4">Batch</th>
                        <th className="py-3.5 px-4">UoM</th>
                        <th className="py-3.5 px-4">Expiry</th>
                        <th className="py-3.5 px-4">Purchase Date</th>
                        <th className="py-3.5 px-4">Vendor</th>
                        <th className="py-3.5 px-4">Department</th>
                        <th className="py-3.5 px-4">Category</th>
                        <th className="py-3.5 px-4 text-center">Qty</th>
                        <th className="py-3.5 px-4 text-right">Unit Price</th>
                        {canRectify ? (
                          <>
                            <th className="py-3.5 px-4 text-right">Tot Price</th>
                            <th className="py-3.5 px-4 text-center rounded-r-xl">Actions</th>
                          </>
                        ) : (
                          <th className="py-3.5 px-4 text-right rounded-r-xl">Tot Price</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                      {filteredStock.length === 0
                        ? <EmptyRow cols={canRectify ? 13 : 12} message="No stock items found." />
                        : filteredStock.map((item, idx) => {
                            const expStatus = getExpiryStatus(item.expiry_date);
                            const isLow = item.quantity > 0 && item.quantity < 20;
                            const isOut = item.quantity === 0;
                            return (
                              <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                <td className="py-3 px-4 text-slate-900 font-black text-[13px] max-w-[200px] truncate">{item.name}</td>
                                <td className="py-3 px-4 font-mono text-slate-450 text-[11px]">{item.sku || '—'}</td>
                                <td className="py-3 px-4 font-mono text-sky-700 text-[11px]">{item.batch_number || '—'}</td>
                                <td className="py-3 px-4 text-slate-600">{item.unit_of_measure || '—'}</td>
                                <td className="py-3 px-4">
                                  {expStatus
                                    ? <Badge className={`font-black uppercase tracking-wider text-[9px] ${expStatus.cls}`}>{item.expiry_date ? fmt(item.expiry_date) : 'N/A'}</Badge>
                                    : <span className="text-slate-400">—</span>
                                  }
                                </td>
                                <td className="py-3 px-4 text-slate-500 font-normal">{fmt(item.purchase_time)}</td>
                                <td className="py-3 px-4 text-slate-600 font-semibold">{item.vendor || '—'}</td>
                                <td className="py-3 px-4">
                                  <span className={`px-2.5 py-1 text-[10px] font-black rounded-lg border uppercase tracking-wider ${getDeptColorBg(item.department)} ${getDeptColorText(item.department)}`}>
                                    {item.department || '—'}
                                  </span>
                                </td>
                                <td className="py-3 px-4 capitalize text-slate-500 font-normal">{item.category?.replace(/_/g, ' ') || '—'}</td>
                                <td className="py-3 px-4 text-center">
                                  <span className={`text-[13px] font-black px-2 py-0.5 rounded-lg ${
                                    isOut ? 'bg-red-50 text-red-655 border border-red-100' :
                                    isLow ? 'bg-amber-50 text-amber-600 border border-amber-100 animate-pulse' :
                                    'text-slate-900'
                                  }`}>{fmtNum(item.quantity)}</span>
                                </td>
                                <td className="py-3 px-4 text-right font-mono text-slate-550 font-bold">{fmtNum(item.price)} RWF</td>
                                <td className="py-3 px-4 text-right font-mono text-slate-800 font-black">{fmtNum(item.quantity * item.price)} RWF</td>
                                {canRectify && (
                                  <td className="py-3 px-4 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                      <button 
                                        onClick={() => openRectifyModal(item)}
                                        className="p-1.5 text-slate-400 hover:text-sky-700 bg-white hover:bg-sky-50 border border-slate-200 hover:border-sky-200 rounded-lg transition-colors cursor-pointer shadow-xs"
                                        title="Rectify stock balance & price"
                                      >
                                        <Edit2 size={13} className="stroke-[2.5]" />
                                      </button>
                                      <button 
                                        onClick={() => openReturnModal(item)}
                                        className="p-1.5 text-slate-400 hover:text-rose-600 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-lg transition-colors cursor-pointer shadow-xs"
                                        title="Return to Supplier"
                                      >
                                        <CornerUpLeft size={13} className="stroke-[2.5]" />
                                      </button>
                                    </div>
                                  </td>
                                )}
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
                <div className="flex justify-between items-center mb-5 pb-4 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5"><Truck size={16} className="text-sky-700" /> Vendors & Suppliers</h3>
                    <p className="text-[10px] text-slate-400 font-extrabold mt-0.5">Approved medical and stationery suppliers</p>
                  </div>
                  <Badge className="bg-sky-50 text-sky-750 border-sky-100 text-xs font-bold px-3 py-1">{vendors.length} Vendors</Badge>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 uppercase tracking-widest text-[9px] font-black border-b border-slate-200">
                        <th className="py-3.5 px-4 rounded-l-xl">#</th>
                        <th className="py-3.5 px-4">Vendor Name</th>
                        <th className="py-3.5 px-4">Contact</th>
                        <th className="py-3.5 px-4">Contract Terms</th>
                        <th className="py-3.5 px-4 text-center rounded-r-xl">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-bold text-slate-700 bg-white">
                      {filteredVendors.length === 0
                        ? <EmptyRow cols={5} message="No vendors found." />
                        : filteredVendors.map((v, i) => (
                          <tr key={v.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3.5 px-4 text-slate-400 text-[11px]">{i + 1}</td>
                            <td className="py-3.5 px-4 text-slate-900 font-black text-[13px]">{v.name}</td>
                            <td className="py-3.5 px-4 text-slate-600 font-normal">{v.contact || '—'}</td>
                            <td className="py-3.5 px-4 text-slate-500 font-normal">{v.terms || 'Net 30'}</td>
                            <td className="py-3.5 px-4 text-center">
                              <span className="px-2.5 py-1 text-[10px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-full uppercase tracking-wider">
                                Active Supplier
                              </span>
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
                
                {/* Requisition Tab Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-5 bg-slate-50/50 border-b border-slate-100">
                  <div className="bg-white border border-slate-200/60 rounded-2xl p-4 shadow-xs flex justify-between items-center hover:scale-[1.01] transition-all">
                    <div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Total Requisitions</span>
                      <span className="text-xl font-black text-slate-800 block mt-1">{requisitions.length}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-650 shadow-inner"><ArrowRightLeft size={16} /></div>
                  </div>
                  
                  <div className="bg-white border border-slate-200/60 rounded-2xl p-4 shadow-xs flex justify-between items-center hover:scale-[1.01] transition-all">
                    <div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Pending Review</span>
                      <span className="text-xl font-black text-amber-600 block mt-1 flex items-center gap-1.5">
                        {requisitions.filter(r => r.status === 'Pending').length}
                        {requisitions.filter(r => r.status === 'Pending').length > 0 && (
                          <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-105 text-amber-600 shadow-inner"><Activity size={16} /></div>
                  </div>

                  <div className="bg-white border border-slate-200/60 rounded-2xl p-4 shadow-xs flex justify-between items-center hover:scale-[1.01] transition-all">
                    <div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Unresolved Urgent</span>
                      <span className="text-xl font-black text-rose-600 block mt-1">
                        {requisitions.filter(r => (r.urgency === 'Critical' || r.urgency === 'High') && r.status === 'Pending').length}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 shadow-inner"><AlertCircle size={16} /></div>
                  </div>

                  <div className="bg-white border border-slate-200/60 rounded-2xl p-4 shadow-xs flex justify-between items-center hover:scale-[1.01] transition-all">
                    <div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Fulfillment count</span>
                      <span className="text-xl font-black text-emerald-600 block mt-1">
                        {requisitions.filter(r => r.status === 'Approved').length}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-650 shadow-inner"><CheckCircle size={16} /></div>
                  </div>
                </div>

                {/* Header */}
                <div className="p-5 border-b border-slate-100 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-1.5">Management Filters</h3>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {['All','Pending','Approved','Rejected'].map(s => {
                        const cnt = s === 'All' ? requisitions.length : requisitions.filter(r => r.status === s).length;
                        return (
                          <button
                            key={s}
                            onClick={() => setReqStatusFilter(s)}
                            className={`text-[10px] font-black px-3.5 py-1.5 rounded-xl border transition-all cursor-pointer ${
                              reqStatusFilter === s
                                ? s === 'Pending'  ? 'bg-amber-50 text-amber-705 border-amber-200 shadow-xs'
                                : s === 'Approved' ? 'bg-emerald-50 text-emerald-705 border-emerald-200 shadow-xs'
                                : s === 'Rejected' ? 'bg-rose-55 text-rose-700 border-rose-200 shadow-xs'
                                                  : 'bg-sky-50 text-sky-750 border-sky-200 shadow-xs'
                                : 'bg-white text-slate-500 border-slate-200 hover:border-slate-350 hover:bg-slate-50/60'
                            }`}
                          >
                            {s} {cnt > 0 && <span className="ml-0.5 opacity-80">({cnt})</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <select
                      value={reqUrgencyFilter}
                      onChange={e => setReqUrgencyFilter(e.target.value)}
                      className="text-xs font-bold border border-slate-200 rounded-xl px-3 py-2.5 bg-white text-slate-700 focus:outline-none cursor-pointer hover:bg-slate-50 shadow-xs transition-colors"
                    >
                      <option value="All">All Urgency</option>
                      <option value="Normal">Normal</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                    <button
                      onClick={() => setReqCreateOpen(true)}
                      className="flex items-center gap-1.5 px-4.5 py-2.5 text-xs font-black text-white bg-indigo-650 hover:bg-indigo-600 rounded-xl transition-all cursor-pointer shadow-md shadow-indigo-500/10 hover:shadow-indigo-500/20 active:scale-[0.98]"
                    >
                      <Plus size={13} /> New Requisition
                    </button>
                  </div>
                </div>
 
                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 uppercase tracking-widest text-[9px] font-black border-b border-slate-200">
                        <th className="py-3.5 px-6 rounded-l-xl">#</th>
                        <th className="py-3.5 px-4">Department</th>
                        <th className="py-3.5 px-4">Date</th>
                        <th className="py-3.5 px-4">Urgency</th>
                        <th className="py-3.5 px-4 text-center">Items</th>
                        <th className="py-3.5 px-4">Notes</th>
                        <th className="py-3.5 px-4 text-center">Status</th>
                        <th className="py-3.5 px-6 text-right rounded-r-xl">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-bold text-slate-700 bg-white">
                      {filteredReqs.length === 0 ? (
                        <EmptyRow cols={8} message="No requisitions match your filters." />
                      ) : (
                        filteredReqs.map((req, i) => (
                          <tr key={req.id} className={`hover:bg-slate-50/40 transition-colors relative ${
                            req.urgency === 'Critical' ? 'bg-rose-50/10' :
                            req.urgency === 'High' ? 'bg-amber-50/5' : ''
                          }`}>
                            <td className="py-3.5 px-6 text-slate-400 font-mono text-[11px] relative">
                              {/* Urgency indicator strip */}
                              {(req.urgency === 'Critical' || req.urgency === 'High') && (
                                <span className={`absolute left-0 top-2 bottom-2 w-1 rounded-r-md ${
                                  req.urgency === 'Critical' ? 'bg-red-500 shadow-sm shadow-red-500/50' : 'bg-orange-400'
                                }`} />
                              )}
                              #{req.id}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={`px-2.5 py-1 text-[10px] font-black rounded-lg border uppercase tracking-wider ${getDeptColorBg(req.department_name)} ${getDeptColorText(req.department_name)}`}>
                                {req.department_name || '—'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap font-normal">{fmt(req.created_at)}</td>
                            <td className="py-3.5 px-4">
                              <Badge className={
                                req.urgency === 'Critical' ? 'bg-red-50 text-red-655 border-red-150 font-black' :
                                req.urgency === 'High'     ? 'bg-orange-50 text-orange-750 border-orange-200 font-black' :
                                'bg-slate-50 text-slate-500 border-slate-200'
                              }>
                                {req.urgency || 'Normal'}
                              </Badge>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded-lg text-xs font-black">
                                {req.items_count || 0} items
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-slate-450 max-w-[200px] truncate text-[11px] font-normal">
                              {req.notes || <span className="italic text-slate-300 font-normal">No details</span>}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <Badge className={`font-black uppercase tracking-wider text-[9px] ${statusCls(req.status)}`}>{req.status}</Badge>
                            </td>
                            <td className="py-3.5 px-6 text-right">
                              <div className="flex justify-end gap-1.5">
                                <button
                                  onClick={() => handleViewReq(req)}
                                  className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-black text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all cursor-pointer shadow-xs"
                                >
                                  <Eye size={11} /> Details
                                </button>
                                {req.status === 'Pending' && (<>
                                  <button
                                    onClick={() => handleApprove(req.id)}
                                    disabled={approvingId === req.id}
                                    className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-black text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl transition-all cursor-pointer disabled:opacity-50 shadow-sm shadow-emerald-500/10"
                                  >
                                    {approvingId === req.id ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle size={11} />}
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => openRejectDialog(req)}
                                    className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-black text-white bg-rose-500 hover:bg-rose-600 rounded-xl transition-all cursor-pointer shadow-sm shadow-rose-500/10"
                                  >
                                    <X size={11} /> Reject
                                  </button>
                                </>)}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* ══ TAB 4: EXPIRING ITEMS ══ */}
            {activeTab === 'expiring' && (
              <Card className="p-6 border border-slate-200/60 shadow-sm bg-white rounded-2xl">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5 pb-4 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5"><Calendar size={16} className="text-sky-700" /> Expiring Items</h3>
                    <p className="text-[10px] text-slate-400 font-extrabold mt-0.5">Items expiring within the next 90 days</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <select
                      value={expiringUrgencyFilter}
                      onChange={e => setExpiringUrgencyFilter(e.target.value)}
                      className="text-xs font-bold border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 focus:outline-none cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      <option value="All">All Expiring (&le; 90 days)</option>
                      <option value="Critical">Critical (&le; 30 days)</option>
                      <option value="Warning">Warning (30-90 days)</option>
                    </select>

                    {expiringItems.length > 0 && (
                      <div className="flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl px-3 py-1.5">
                        <AlertCircle size={13} />
                        <span className="text-[10px] font-black">{expiringItems.length} items expiring</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 uppercase tracking-widest text-[9px] font-black border-b border-slate-200">
                        <th className="py-3.5 px-4 rounded-l-xl">Item Name</th>
                        <th className="py-3.5 px-4">Department</th>
                        <th className="py-3.5 px-4">Batch</th>
                        <th className="py-3.5 px-4">Expiry Date</th>
                        <th className="py-3.5 px-4 text-center">Qty Left</th>
                        <th className="py-3.5 px-4 text-center rounded-r-xl">Risk Level</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                      {filteredExpiring.length === 0 ? (
                        <EmptyRow cols={6} message="No expiring items match your criteria." />
                      ) : (
                        filteredExpiring
                            .sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date))
                            .map((item, idx) => {
                              const expStatus = getExpiryStatus(item.expiry_date);
                              return (
                                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="py-3 px-4 text-slate-900 font-black text-[13px]">{item.name}</td>
                                  <td className="py-3 px-4">
                                    <span className={`px-2 py-0.5 text-[9px] font-black rounded-lg border uppercase tracking-wider ${getDeptColorBg(item.department)} ${getDeptColorText(item.department)}`}>
                                      {item.department || '—'}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 font-mono text-slate-450 text-[11px]">{item.batch_number || '—'}</td>
                                  <td className="py-3 px-4 font-bold text-rose-600">{fmt(item.expiry_date)}</td>
                                  <td className="py-3 px-4 text-center font-black text-slate-800 text-[13px]">{fmtNum(item.quantity)}</td>
                                  <td className="py-3 px-4 text-center">
                                    {expStatus && <Badge className={`font-black uppercase tracking-wider text-[9px] ${expStatus.cls}`}>{expStatus.label}</Badge>}
                                  </td>
                                </tr>
                              );
                            })
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* ══ TAB 5: DISPOSAL MANAGEMENT ══ */}
            {activeTab === 'disposals' && (
              <div className="space-y-6">
                <Card className="p-6 border border-red-200 shadow-sm bg-white rounded-2xl">
                  <div className="flex justify-between items-center mb-5 pb-4 border-b border-red-100">
                    <div>
                      <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5"><Trash2 size={16} className="text-red-500" /> Items to Dispose</h3>
                      <p className="text-[10px] text-slate-400 font-extrabold mt-0.5">Expired items requiring authorized disposal</p>
                    </div>
                    {disposalItems.length > 0 && (
                      <div className="flex items-center gap-1.5 bg-red-50 text-red-655 border border-red-100 rounded-xl px-3 py-1.5 shadow-xs">
                        <AlertCircle size={13} className="text-red-500" />
                        <span className="text-[10px] font-black">{disposalItems.length} batches expired</span>
                      </div>
                    )}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 uppercase tracking-widest text-[9px] font-black border-b border-slate-200">
                          <th className="py-3 px-4 rounded-l-xl">Item Name</th>
                          <th className="py-3 px-4">Department</th>
                          <th className="py-3 px-4">Batch</th>
                          <th className="py-3 px-4">Expired On</th>
                          <th className="py-3 px-4 text-center">Qty</th>
                          <th className="py-3 px-4 text-center rounded-r-xl">Reason</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                        {filteredDisposals.length === 0 ? (
                          <EmptyRow cols={6} message="No expired items found." />
                        ) : (
                          filteredDisposals.map((item, idx) => (
                            <tr key={idx} className="hover:bg-red-50/10 transition-colors">
                              <td className="py-3 px-4 text-slate-900 font-black text-[13px]">{item.name}</td>
                              <td className="py-3 px-4">
                                <span className={`px-2 py-0.5 text-[9px] font-black rounded-lg border uppercase tracking-wider ${getDeptColorBg(item.department)} ${getDeptColorText(item.department)}`}>
                                  {item.department || '—'}
                                </span>
                              </td>
                              <td className="py-3 px-4 font-mono text-slate-450 text-[11px]">{item.batch_number || '—'}</td>
                              <td className="py-3 px-4 font-bold text-red-655">{fmt(item.expiry_date)}</td>
                              <td className="py-3 px-4 text-center font-black text-[13px] text-slate-800">{fmtNum(item.quantity)}</td>
                              <td className="py-3 px-4 text-center">
                                <Badge className="bg-red-50 text-red-655 border-red-100 font-black text-[9px] uppercase tracking-wider">Expired</Badge>
                              </td>
                            </tr>
                          ))
                        )}
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
      <Modal isOpen={receiveOpen} onClose={() => setReceiveOpen(false)} title="Receive Stock Batch">
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
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
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
              className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-sky-700 hover:bg-sky-800 rounded-xl transition-colors disabled:opacity-50 cursor-pointer shadow-sm shadow-sky-100"
            >
              {isSubmitting && <Loader2 size={15} className="animate-spin" />}
              Receive Stock
            </button>
          </div>
        </form>
      </Modal>

      {/* ══ DRAWER: Requisition Detail ══ */}
      <div className={`fixed inset-0 z-50 overflow-hidden transition-all duration-500 ${reqDetailOpen ? 'visible' : 'invisible'}`}>
        {/* Backdrop blur */}
        <div 
          className={`absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-500 ${reqDetailOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => { setReqDetailOpen(false); setSelectedReq(null); setReqItems([]); }}
        />
        
        <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
          <div className={`w-screen max-w-xl bg-white shadow-2xl flex flex-col transform transition-transform duration-500 ease-out ${reqDetailOpen ? 'translate-x-0' : 'translate-x-full'}`}>
            
            {/* Header */}
            <div className="px-6 py-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Requisition Details</span>
                <h3 className="text-base font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                  <ArrowRightLeft className="text-sky-700" size={18} />
                  Requisition #{selectedReq?.id}
                </h3>
              </div>
              <button 
                onClick={() => { setReqDetailOpen(false); setSelectedReq(null); setReqItems([]); }}
                className="p-2 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Stepper Progression */}
              <div className="bg-slate-50 border border-slate-200/50 rounded-2xl p-5">
                <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-4">Request Status Timeline</p>
                <div className="relative flex items-center justify-between">
                  <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 h-0.5 bg-slate-200" />
                  
                  {/* Step 1 */}
                  <div className="relative z-10 flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shadow-md shadow-emerald-500/10">
                      <Check size={14} />
                    </div>
                    <span className="text-[9px] font-black text-emerald-600 uppercase tracking-wider mt-1.5">Submitted</span>
                  </div>

                  {/* Step 2 */}
                  <div className="relative z-10 flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border-2 transition-all ${
                      selectedReq?.status === 'Pending' 
                        ? 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/10 animate-pulse' 
                        : selectedReq?.status === 'Approved' || selectedReq?.status === 'Rejected'
                        ? 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/10'
                        : 'bg-white text-slate-350 border-slate-200'
                    }`}>
                      {selectedReq?.status === 'Pending' ? <Activity size={14} /> : (selectedReq?.status === 'Approved' || selectedReq?.status === 'Rejected' ? <Check size={14} /> : '2')}
                    </div>
                    <span className={`text-[9px] font-black uppercase tracking-wider mt-1.5 ${
                      selectedReq?.status === 'Pending' ? 'text-amber-500 font-extrabold' : selectedReq?.status === 'Approved' || selectedReq?.status === 'Rejected' ? 'text-emerald-600' : 'text-slate-400'
                    }`}>In Review</span>
                  </div>

                  {/* Step 3 */}
                  <div className="relative z-10 flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border-2 transition-all ${
                      selectedReq?.status === 'Approved'
                        ? 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/10'
                        : selectedReq?.status === 'Rejected'
                        ? 'bg-rose-500 text-white border-rose-500 shadow-md shadow-rose-500/10'
                        : 'bg-white text-slate-350 border-slate-200'
                    }`}>
                      {selectedReq?.status === 'Approved' ? <Check size={14} /> : (selectedReq?.status === 'Rejected' ? <X size={14} /> : '3')}
                    </div>
                    <span className={`text-[9px] font-black uppercase tracking-wider mt-1.5 ${
                      selectedReq?.status === 'Approved' ? 'text-emerald-600' : selectedReq?.status === 'Rejected' ? 'text-rose-500' : 'text-slate-400'
                    }`}>{selectedReq?.status === 'Rejected' ? 'Rejected' : 'Dispatched'}</span>
                  </div>
                </div>
              </div>

              {/* Department Meta */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 border border-slate-200/50 rounded-2xl p-4 flex items-center gap-3">
                  <div className={`p-3 rounded-xl ${getDeptColorBg(selectedReq?.department_name)} shadow-inner shrink-0`}>
                    <Building size={20} className={getDeptColorText(selectedReq?.department_name)} />
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Requesting Dept</span>
                    <span className={`text-xs font-black uppercase tracking-wide ${getDeptColorText(selectedReq?.department_name)}`}>
                      {selectedReq?.department_name || 'N/A'}
                    </span>
                  </div>
                </div>
                
                <div className="bg-slate-50 border border-slate-200/50 rounded-2xl p-4 flex items-center gap-3">
                  <div className={`p-3 rounded-xl shadow-inner shrink-0 ${
                    selectedReq?.urgency === 'Critical' ? 'bg-red-50 text-red-655' :
                    selectedReq?.urgency === 'High' ? 'bg-orange-50 text-orange-600' : 'bg-slate-100 text-slate-500'
                  }`}>
                    <AlertCircle size={20} />
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Urgency Level</span>
                    <span className={`text-xs font-black uppercase tracking-wide ${
                      selectedReq?.urgency === 'Critical' ? 'text-red-655' :
                      selectedReq?.urgency === 'High' ? 'text-orange-600' : 'text-slate-650'
                    }`}>
                      {selectedReq?.urgency || 'Normal'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Notes or Reason */}
              {selectedReq?.notes && (
                <div className="bg-gradient-to-br from-white to-slate-50 border border-slate-200/60 rounded-2xl p-4 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-2 h-full bg-sky-750" />
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Notes & Details</span>
                  <p className="text-xs text-slate-700 font-bold mt-1.5 leading-relaxed">{selectedReq.notes}</p>
                </div>
              )}

              {selectedReq?.rejection_reason && (
                <div className="bg-red-50/40 border border-red-200/80 rounded-2xl p-4 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-2 h-full bg-red-500" />
                  <span className="text-[9px] font-black text-red-500 uppercase tracking-wider block">Rejection Logged Reason</span>
                  <p className="text-xs text-red-800 font-extrabold mt-1.5 leading-relaxed">{selectedReq.rejection_reason}</p>
                </div>
              )}

              {/* Items List */}
              <div className="space-y-3">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Requisition Items</span>
                
                {reqItemsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="animate-spin text-sky-700" size={24} />
                  </div>
                ) : reqItems.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 border border-slate-200/60 rounded-2xl text-slate-400 font-bold text-xs">
                    No items in this requisition.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {reqItems.map(ri => {
                      const isStockSufficient = Number(ri.central_stock) >= Number(ri.requested_quantity);
                      
                      return (
                        <div key={ri.id} className="bg-white border border-slate-200/70 shadow-sm rounded-2xl p-4 flex flex-col gap-3 hover:border-slate-350 transition-colors">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="text-xs font-black text-slate-800 line-clamp-1">{ri.item_name}</h4>
                              <p className="text-[10px] text-slate-400 font-bold mt-0.5">UoM: {ri.unit_of_measure || 'Unit'}</p>
                            </div>
                            
                            <div className="flex flex-col items-end gap-1">
                              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Stock Status</span>
                              <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase border ${
                                Number(ri.central_stock) === 0 ? 'bg-red-50 text-red-655 border-red-100' :
                                !isStockSufficient ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                'bg-emerald-50 text-emerald-600 border-emerald-100'
                              }`}>
                                {Number(ri.central_stock) === 0 ? 'Out of Stock' : (!isStockSufficient ? `Shortage (${ri.central_stock})` : `In Stock: ${ri.central_stock}`)}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs font-bold text-slate-600">
                            <div>
                              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Qty Requested</span>
                              <span className="text-sm font-black text-slate-800 mt-0.5 block">{ri.requested_quantity}</span>
                            </div>

                            <div className="flex flex-col items-end">
                              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block mb-1">Approved Qty</span>
                              {selectedReq?.status === 'Pending' ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const val = Math.max(0, (ri.approved_quantity ?? Math.min(ri.requested_quantity, Number(ri.central_stock) || 0)) - 1);
                                      setReqItems(prev => prev.map(item => item.id === ri.id ? { ...item, approved_quantity: val } : item));
                                    }}
                                    className="p-1 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                                  >
                                    -
                                  </button>
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
                                    className="w-14 p-1 text-center bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-sky-500 focus:outline-none"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const maxAllowed = Math.min(ri.requested_quantity, Number(ri.central_stock) || 0);
                                      const val = Math.min(maxAllowed, (ri.approved_quantity ?? maxAllowed) + 1);
                                      setReqItems(prev => prev.map(item => item.id === ri.id ? { ...item, approved_quantity: val } : item));
                                    }}
                                    className="p-1 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                                  >
                                    +
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const maxAllowed = Math.min(ri.requested_quantity, Number(ri.central_stock) || 0);
                                      setReqItems(prev => prev.map(item => item.id === ri.id ? { ...item, approved_quantity: maxAllowed } : item));
                                    }}
                                    className="ml-1 text-[9px] font-black uppercase text-sky-700 bg-sky-50 hover:bg-sky-100 px-2 py-1 rounded-md transition-colors"
                                    title="Set to max available"
                                  >
                                    Max
                                  </button>
                                </div>
                              ) : (
                                <span className="text-sm font-black text-slate-800">{ri.approved_quantity ?? '—'}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button
                type="button"
                onClick={() => { setReqDetailOpen(false); setSelectedReq(null); setReqItems([]); }}
                className="flex-1 py-3 bg-white hover:bg-slate-100 text-slate-500 border border-slate-200 rounded-xl font-bold text-xs transition-colors text-center cursor-pointer"
              >
                Close Drawer
              </button>
              
              {selectedReq?.status === 'Pending' && (
                <>
                  <button
                    onClick={() => openRejectDialog(selectedReq)}
                    className="flex-1 py-3 bg-red-50 hover:bg-red-105 text-red-655 border border-red-150 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <X size={14} /> Reject Request
                  </button>
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
                    className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl font-bold text-xs transition-all shadow-md shadow-emerald-500/10 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle size={14} /> Approve & Dispatch
                  </button>
                </>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* ══ MODAL: New Requisition ══ */}
      <Modal isOpen={reqCreateOpen} onClose={() => setReqCreateOpen(false)} title="New Requisition Request">
        <form onSubmit={handleCreateRequisition} className="space-y-4 animate-none">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Target Department *</label>
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
              <label className={labelCls}>Urgency Level *</label>
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
                className={`${inputCls} h-16 resize-none`}
              />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Requisition Items</h4>
              <button
                type="button"
                onClick={() => setNewReqLines([...newReqLines, { item_id: '', quantity: '' }])}
                className="flex items-center gap-1 text-[10px] font-black text-indigo-650 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg border border-indigo-100 transition-all cursor-pointer shadow-xs"
              >
                <Plus size={11} /> Add Item Line
              </button>
            </div>

            <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
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

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setReqCreateOpen(false)}
              className="px-4 py-2 text-sm font-bold text-slate-650 bg-slate-105 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-indigo-650 hover:bg-indigo-600 rounded-xl transition-colors disabled:opacity-50 cursor-pointer shadow-sm shadow-indigo-100 animate-none"
            >
              {isSubmitting && <Loader2 size={15} className="animate-spin" />}
              Submit Requisition
            </button>
          </div>
        </form>
      </Modal>

      {/* ══ MODAL: Reject Dialog ══ */}
      <Modal isOpen={rejectOpen} onClose={() => setRejectOpen(false)} title="Reject Requisition">
        <div className="space-y-4">
          <p className="text-xs text-slate-500">Please provide a reason for rejecting this requisition. This reason will be logged and visible to department nurses.</p>
          <textarea
            required
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            placeholder="Write rejection reason here..."
            className={`${inputCls} h-20 resize-none`}
          />
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setRejectOpen(false)}
              className="px-4 py-2 text-sm font-bold text-slate-650 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleReject}
              disabled={isSubmitting || !rejectReason.trim()}
              className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-red-655 hover:bg-red-600 rounded-xl transition-colors disabled:opacity-50 cursor-pointer shadow-sm shadow-red-100"
            >
              {isSubmitting && <Loader2 size={15} className="animate-spin" />}
              Confirm Reject
            </button>
          </div>
        </div>
      </Modal>

      {/* ══ MODAL: Rectify Stock ══ */}
      <Modal isOpen={rectifyOpen} onClose={() => setRectifyOpen(false)} title="Rectify Stock Level & Price">
        <form onSubmit={handleRectifySubmit} className="space-y-4">
          <div className="bg-sky-50 border border-sky-100 p-4 rounded-xl space-y-1.5 text-xs text-sky-850">
            <div><strong className="text-sky-950">Item:</strong> {rectifyingItem?.name}</div>
            <div><strong className="text-sky-950">SKU:</strong> {rectifyingItem?.sku || '—'}</div>
            <div><strong className="text-sky-950">Batch Code:</strong> {rectifyingItem?.batch_number || '—'}</div>
            <div><strong className="text-sky-950">Department:</strong> {rectifyingItem?.department || 'Central Store'}</div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Quantity *</label>
              <input
                required 
                type="number" 
                min="0"
                value={rectifyForm.quantity}
                onChange={e => setRectifyForm({ ...rectifyForm, quantity: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Unit Price (RWF) *</label>
              <input
                required 
                type="number" 
                min="0"
                value={rectifyForm.price}
                onChange={e => setRectifyForm({ ...rectifyForm, price: e.target.value })}
                className={inputCls}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
            <button
              type="button"
              onClick={() => setRectifyOpen(false)}
              className="px-4 py-2.5 text-xs font-black uppercase tracking-wider text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer border-0"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white bg-sky-700 hover:bg-sky-800 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-md shadow-sky-100 border-0"
            >
              {isSubmitting && <Loader2 size={14} className="animate-spin" />}
              Save Changes
            </button>
          </div>
        </form>
      </Modal>

      {/* ══ MODAL: Return to Supplier ══ */}
      <Modal isOpen={returnOpen} onClose={() => setReturnOpen(false)} title="Return Stock to Supplier">
        <form onSubmit={handleReturnSubmit} className="space-y-4">
          <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl space-y-1.5 text-xs text-rose-800">
            <div><strong className="text-rose-950">Item:</strong> {returningItem?.name}</div>
            <div><strong className="text-rose-950">SKU:</strong> {returningItem?.sku || '—'}</div>
            <div><strong className="text-rose-950">Batch Code:</strong> {returningItem?.batch_number || '—'}</div>
            <div><strong className="text-rose-950">Current Stock:</strong> {returningItem?.quantity || '0'}</div>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className={labelCls}>Quantity to Return *</label>
              <input
                required 
                type="number" 
                min="1"
                max={returningItem?.quantity || 1}
                value={returnForm.quantity}
                onChange={e => setReturnForm({ ...returnForm, quantity: e.target.value })}
                className={inputCls}
                placeholder="Enter quantity"
              />
            </div>
            <div>
              <label className={labelCls}>Reason for Return (Optional)</label>
              <textarea
                value={returnForm.reason}
                onChange={e => setReturnForm({ ...returnForm, reason: e.target.value })}
                className={`${inputCls} min-h-[80px] resize-none`}
                placeholder="Expired, damaged, etc."
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
            <button
              type="button"
              onClick={() => setReturnOpen(false)}
              className="px-4 py-2.5 text-xs font-black uppercase tracking-wider text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer border-0"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-md shadow-rose-100 border-0"
            >
              {isSubmitting && <Loader2 size={14} className="animate-spin" />}
              Confirm Return
            </button>
          </div>
        </form>
      </Modal>

      <style jsx>{`
        .scrollbar-none::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-none {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #cbd5e1;
          border-radius: 20px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: #94a3b8;
        }
      `}</style>
    </div>
  );
}
