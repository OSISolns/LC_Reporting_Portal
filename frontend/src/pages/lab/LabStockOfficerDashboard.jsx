import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Package, Database, AlertTriangle, ArrowRight, Settings,
  TrendingUp, Activity, CheckCircle, Clock, Search,
  Calendar, Loader2, Plus, Eye, RefreshCw, BarChart2,
  ListFilter, Check, X, ClipboardList, AlertCircle, Filter,
  ArrowUpRight, FileText, Sparkles, Building, Layers,
  ShieldCheck, Tag, Thermometer, Snowflake, Refrigerator,
  Zap, ShieldAlert, Cpu, Download, ArrowDownRight, Edit3,
  Trash2, CheckCircle2, AlertOctagon, HelpCircle, Box
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  getInhandInventory, createInhandInventory, updateInhandInventory,
  deleteInhandInventory, getStorageUnits, saveStorageUnit,
  getAnalyzers, getLabRequisitions, createLabRequisition
} from '../../api/lab';

const LAB_DISCIPLINES = [
  'Biochemistry',
  'Hematology',
  'Microbiology',
  'Immunology',
  'Histopathology',
  'Molecular Biology',
  'Phlebotomy',
  'POCT',
  'Blood Bank'
];

const REAGENT_CATEGORIES = [
  'Reagents',
  'Controls',
  'Calibrators',
  'Rapid Tests',
  'Consumables',
  'Stains & Buffers',
  'Specimen Containers',
  'Quality Controls'
];

const STORAGE_TEMPS = [
  { value: 'all', label: 'All Temperatures' },
  { value: 'fridge_2_8', label: '2°C to 8°C (Refrigerated)', icon: Refrigerator, badgeColor: 'bg-sky-50 text-sky-700 border-sky-200' },
  { value: 'freezer_minus_20', label: '-20°C (Freezer)', icon: Snowflake, badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { value: 'freezer_minus_80', label: '-80°C (Ultra-Low)', icon: Snowflake, badgeColor: 'bg-purple-50 text-purple-700 border-purple-200' },
  { value: 'room_temp', label: '15°C to 25°C (Room Temp)', icon: Thermometer, badgeColor: 'bg-amber-50 text-amber-700 border-amber-200' }
];

const UOM_OPTIONS = ['vials', 'kits', 'tests', 'bottles', 'boxes', 'packs', 'cartridges', 'strips', 'tubes', 'plates'];

export default function LabStockOfficerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Core Data
  const [inventory, setInventory] = useState([]);
  const [storageUnits, setStorageUnits] = useState([]);
  const [analyzers, setAnalyzers] = useState([]);
  const [requisitions, setRequisitions] = useState([]);

  // Loading States
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingItem, setSavingItem] = useState(false);
  const [adjustingStock, setAdjustingStock] = useState(false);
  const [savingUnit, setSavingUnit] = useState(false);
  const [submittingReq, setSubmittingReq] = useState(false);

  // Active Tab: 'inventory' | 'fefo' | 'cold_chain' | 'requisitions' | 'analyzers'
  const [activeTab, setActiveTab] = useState('inventory');

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [tempFilter, setTempFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockStatusFilter, setStockStatusFilter] = useState('all'); // 'all' | 'low' | 'depleted' | 'good'

  // Modals
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustingItem, setAdjustingItem] = useState(null);
  const [isStorageModalOpen, setIsStorageModalOpen] = useState(false);
  const [isReqModalOpen, setIsReqModalOpen] = useState(false);

  // Form State: Add/Edit Item
  const [itemForm, setItemForm] = useState({
    item_name: '',
    category: 'Reagents',
    equipment_group: 'General',
    department: 'Biochemistry',
    storage_temp: 'fridge_2_8',
    storage_unit_id: 'fridge_1',
    quantity_in_hand: 10,
    unit_of_measure: 'kits',
    min_threshold: 5,
    expiry_date: '',
    lot_number: ''
  });

  // Form State: Adjust Stock
  const [adjustForm, setAdjustForm] = useState({
    change_type: 'deduct', // 'add' | 'deduct'
    quantity: 1,
    reason: 'Daily Routine Run',
    notes: ''
  });

  // Form State: Storage Unit
  const [storageForm, setStorageForm] = useState({
    id: '',
    label: '',
    type: 'fridge',
    temp_range: '2°C to 8°C'
  });

  // Form State: Quick Requisition
  const [reqForm, setReqForm] = useState({
    notes: '',
    urgency: 'Medium',
    items: [{ item_name: '', quantity_requested: 5, unit: 'kits', remarks: '' }]
  });

  // ── Load All Data ──────────────────────────────────────────────────────────
  const fetchAllData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const [invRes, storageRes, analyzerRes, reqRes] = await Promise.allSettled([
        getInhandInventory(),
        getStorageUnits(),
        getAnalyzers(),
        getLabRequisitions({ limit: 50 })
      ]);

      if (invRes.status === 'fulfilled' && invRes.value.data?.success) {
        setInventory(invRes.value.data.data || []);
      }
      if (storageRes.status === 'fulfilled' && storageRes.value.data?.success) {
        setStorageUnits(storageRes.value.data.data || []);
      }
      if (analyzerRes.status === 'fulfilled' && analyzerRes.value.data?.success) {
        setAnalyzers(analyzerRes.value.data.data || []);
      }
      if (reqRes.status === 'fulfilled' && reqRes.value.data?.success) {
        setRequisitions(reqRes.value.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load lab stock data:', err);
      toast.error('Failed to fetch laboratory inventory updates.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // ── Helper: Calculate Days to Expiry ─────────────────────────────────────────
  const getExpiryDetails = (expiryDate) => {
    if (!expiryDate) return { days: null, status: 'unknown', label: 'No Expiry Set' };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exp = new Date(expiryDate);
    exp.setHours(0, 0, 0, 0);
    const diffTime = exp.getTime() - today.getTime();
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (days < 0) return { days, status: 'expired', label: `Expired (${Math.abs(days)}d ago)` };
    if (days <= 30) return { days, status: 'critical', label: `${days}d left (FEFO Alert)` };
    if (days <= 90) return { days, status: 'warning', label: `${days}d left` };
    return { days, status: 'good', label: `${days}d left` };
  };

  // ── KPI Metrics Calculation ──────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const totalItems = inventory.length;
    let depletedCount = 0;
    let lowStockCount = 0;
    let expiringSoonCount = 0;
    let expiredCount = 0;

    inventory.forEach((item) => {
      const qty = Number(item.quantity_in_hand) || 0;
      const min = Number(item.min_threshold) || 0;
      if (qty <= 0) depletedCount++;
      else if (qty <= min) lowStockCount++;

      const exp = getExpiryDetails(item.expiry_date);
      if (exp.status === 'expired') expiredCount++;
      else if (exp.status === 'critical') expiringSoonCount++;
    });

    const activeFridges = storageUnits.filter(u => u.type === 'fridge').length;
    const activeFreezers = storageUnits.filter(u => u.type === 'freezer').length;

    return {
      totalItems,
      depletedCount,
      lowStockCount,
      expiringSoonCount,
      expiredCount,
      storageCount: storageUnits.length,
      activeFridges,
      activeFreezers
    };
  }, [inventory, storageUnits]);

  // ── Filtered Inventory ───────────────────────────────────────────────────────
  const filteredInventory = useMemo(() => {
    return inventory.filter((item) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.item_name?.toLowerCase().includes(q);
        const matchesLot = item.lot_number?.toLowerCase().includes(q);
        const matchesEquip = item.equipment_group?.toLowerCase().includes(q);
        const matchesDept = item.department?.toLowerCase().includes(q);
        if (!matchesName && !matchesLot && !matchesEquip && !matchesDept) return false;
      }

      // Storage Temp
      if (tempFilter !== 'all' && item.storage_temp !== tempFilter) return false;

      // Department
      if (deptFilter !== 'all' && item.department !== deptFilter) return false;

      // Category
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;

      // Stock Status
      const qty = Number(item.quantity_in_hand) || 0;
      const min = Number(item.min_threshold) || 0;
      if (stockStatusFilter === 'depleted' && qty > 0) return false;
      if (stockStatusFilter === 'low' && (qty <= 0 || qty > min)) return false;
      if (stockStatusFilter === 'good' && qty <= min) return false;

      return true;
    });
  }, [inventory, searchQuery, tempFilter, deptFilter, categoryFilter, stockStatusFilter]);

  // ── FEFO Expiry Queue ────────────────────────────────────────────────────────
  const fefoItems = useMemo(() => {
    return [...inventory]
      .filter((i) => i.expiry_date)
      .map((i) => ({ ...i, expiry: getExpiryDetails(i.expiry_date) }))
      .sort((a, b) => (a.expiry.days ?? 9999) - (b.expiry.days ?? 9999));
  }, [inventory]);

  // ── Handler: Open Add/Edit Item Modal ─────────────────────────────────────────
  const handleOpenAddModal = () => {
    setEditingItem(null);
    setItemForm({
      item_name: '',
      category: 'Reagents',
      equipment_group: 'General',
      department: 'Biochemistry',
      storage_temp: 'fridge_2_8',
      storage_unit_id: storageUnits[0]?.id || 'fridge_1',
      quantity_in_hand: 10,
      unit_of_measure: 'kits',
      min_threshold: 5,
      expiry_date: '',
      lot_number: ''
    });
    setIsAddEditModalOpen(true);
  };

  const handleOpenEditModal = (item) => {
    setEditingItem(item);
    setItemForm({
      item_name: item.item_name || '',
      category: item.category || 'Reagents',
      equipment_group: item.equipment_group || 'General',
      department: item.department || 'Biochemistry',
      storage_temp: item.storage_temp || 'fridge_2_8',
      storage_unit_id: item.storage_unit_id || storageUnits[0]?.id || 'fridge_1',
      quantity_in_hand: item.quantity_in_hand ?? 0,
      unit_of_measure: item.unit_of_measure || 'kits',
      min_threshold: item.min_threshold ?? 5,
      expiry_date: item.expiry_date ? item.expiry_date.split('T')[0] : '',
      lot_number: item.lot_number || ''
    });
    setIsAddEditModalOpen(true);
  };

  // ── Handler: Save Item (Create or Update) ────────────────────────────────────
  const handleSaveItem = async (e) => {
    e.preventDefault();
    if (!itemForm.item_name.trim()) {
      toast.error('Reagent or consumable name is required.');
      return;
    }

    try {
      setSavingItem(true);
      if (editingItem) {
        const res = await updateInhandInventory(editingItem.id, itemForm);
        if (res.data?.success) {
          toast.success(`Updated reagent: ${itemForm.item_name}`);
          setIsAddEditModalOpen(false);
          fetchAllData(true);
        }
      } else {
        const res = await createInhandInventory(itemForm);
        if (res.data?.success) {
          toast.success(`Registered new in-hand reagent: ${itemForm.item_name}`);
          setIsAddEditModalOpen(false);
          fetchAllData(true);
        }
      }
    } catch (err) {
      console.error('Failed to save inhand reagent:', err);
      toast.error(err.response?.data?.message || 'Error saving inventory item.');
    } finally {
      setSavingItem(false);
    }
  };

  // ── Handler: Delete Reagent ──────────────────────────────────────────────────
  const handleDeleteItem = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove "${name}" from in-hand inventory?`)) return;

    try {
      const res = await deleteInhandInventory(id);
      if (res.data?.success) {
        toast.success(`Removed "${name}" from in-hand inventory.`);
        fetchAllData(true);
      }
    } catch (err) {
      console.error('Delete item failed:', err);
      toast.error('Failed to remove item.');
    }
  };

  // ── Handler: Quick Stock Adjustment ──────────────────────────────────────────
  const handleOpenAdjustModal = (item) => {
    setAdjustingItem(item);
    setAdjustForm({
      change_type: 'deduct',
      quantity: 1,
      reason: 'Daily Routine Run',
      notes: ''
    });
    setIsAdjustModalOpen(true);
  };

  const handleApplyAdjustment = async (e) => {
    e.preventDefault();
    if (!adjustingItem) return;

    const currentQty = Number(adjustingItem.quantity_in_hand) || 0;
    const changeQty = Number(adjustForm.quantity) || 0;
    if (changeQty <= 0) {
      toast.error('Quantity must be greater than zero.');
      return;
    }

    let newQty = currentQty;
    if (adjustForm.change_type === 'add') {
      newQty += changeQty;
    } else {
      newQty = Math.max(0, currentQty - changeQty);
    }

    try {
      setAdjustingStock(true);
      const updatedPayload = {
        ...adjustingItem,
        quantity_in_hand: newQty,
        lot_number: adjustingItem.lot_number || '',
        expiry_date: adjustingItem.expiry_date || null
      };

      const res = await updateInhandInventory(adjustingItem.id, updatedPayload);
      if (res.data?.success) {
        toast.success(
          `Stock adjusted for ${adjustingItem.item_name}: ${currentQty} → ${newQty} ${adjustingItem.unit_of_measure} (${adjustForm.reason})`
        );
        setIsAdjustModalOpen(false);
        fetchAllData(true);
      }
    } catch (err) {
      console.error('Stock adjustment failed:', err);
      toast.error('Failed to adjust stock level.');
    } finally {
      setAdjustingStock(false);
    }
  };

  // ── Handler: Add Storage Unit ────────────────────────────────────────────────
  const handleSaveStorageUnit = async (e) => {
    e.preventDefault();
    if (!storageForm.id.trim() || !storageForm.label.trim()) {
      toast.error('Unit ID and Label are required.');
      return;
    }

    try {
      setSavingUnit(true);
      const res = await saveStorageUnit(storageForm);
      if (res.data?.success) {
        toast.success(`Storage unit "${storageForm.label}" saved successfully.`);
        setIsStorageModalOpen(false);
        setStorageForm({ id: '', label: '', type: 'fridge', temp_range: '2°C to 8°C' });
        fetchAllData(true);
      }
    } catch (err) {
      console.error('Save storage unit failed:', err);
      toast.error('Failed to register storage unit.');
    } finally {
      setSavingUnit(false);
    }
  };

  // ── Handler: Submit Requisition ──────────────────────────────────────────────
  const handleAddReqItem = () => {
    setReqForm(prev => ({
      ...prev,
      items: [...prev.items, { item_name: '', quantity_requested: 5, unit: 'kits', remarks: '' }]
    }));
  };

  const handleRemoveReqItem = (index) => {
    setReqForm(prev => ({
      ...prev,
      items: prev.items.filter((_, idx) => idx !== index)
    }));
  };

  const handleReqItemChange = (index, field, value) => {
    setReqForm(prev => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, items };
    });
  };

  const handleSubmitRequisition = async (e) => {
    e.preventDefault();
    const validItems = reqForm.items.filter(i => i.item_name.trim());
    if (validItems.length === 0) {
      toast.error('Please specify at least one reagent or item to request.');
      return;
    }

    try {
      setSubmittingReq(true);
      const payload = {
        department: 'Laboratory',
        notes: reqForm.notes || 'Routine Laboratory Reagent & Consumable Replenishment',
        urgency: reqForm.urgency,
        items: validItems
      };

      const res = await createLabRequisition(payload);
      if (res.data?.success) {
        toast.success('Laboratory replenishment requisition submitted to Central Store.');
        setIsReqModalOpen(false);
        setReqForm({
          notes: '',
          urgency: 'Medium',
          items: [{ item_name: '', quantity_requested: 5, unit: 'kits', remarks: '' }]
        });
        fetchAllData(true);
      }
    } catch (err) {
      console.error('Failed to submit requisition:', err);
      toast.error(err.response?.data?.message || 'Failed to submit requisition.');
    } finally {
      setSubmittingReq(false);
    }
  };

  // ── Export Inventory CSV ─────────────────────────────────────────────────────
  const handleExportCSV = () => {
    try {
      const headers = [
        'ID',
        'Reagent Name',
        'Category',
        'Department / Bench',
        'Equipment Group',
        'Storage Unit',
        'Storage Temp',
        'Quantity In Hand',
        'Unit of Measure',
        'Min Alert Threshold',
        'Lot Number',
        'Expiry Date',
        'Days Remaining',
        'Status'
      ];

      const rows = inventory.map(item => {
        const exp = getExpiryDetails(item.expiry_date);
        return [
          item.id,
          `"${(item.item_name || '').replace(/"/g, '""')}"`,
          item.category || '',
          item.department || '',
          item.equipment_group || '',
          item.storage_unit_id || '',
          item.storage_temp || '',
          item.quantity_in_hand ?? 0,
          item.unit_of_measure || '',
          item.min_threshold ?? 0,
          item.lot_number || '',
          item.expiry_date ? item.expiry_date.split('T')[0] : '',
          exp.days ?? '',
          exp.label
        ].join(',');
      });

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Lab_InHand_Inventory_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Laboratory In-Hand Reagent Register exported.');
    } catch (err) {
      console.error('CSV export failed:', err);
      toast.error('Failed to export inventory CSV.');
    }
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6 text-slate-800 font-sans antialiased">

      {/* ── Institutional Header Card ── */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              MOH Rwanda Standard • ISO 15189
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              Laboratory Diagnostics Hub
            </span>
            <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Role: Laboratory Stock Officer
            </span>
          </div>

          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Package className="text-teal-600" size={26} />
            Laboratory Stock &amp; Reagents Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time in-hand reagent inventory, FEFO lot expiry control, cold chain verification, and procurement replenishment.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => fetchAllData(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer border border-slate-200"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 rounded-xl transition-all cursor-pointer border border-slate-200 shadow-2xs"
          >
            <Download size={14} className="text-slate-500" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setIsReqModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-xl transition-all cursor-pointer border border-teal-200"
          >
            <ArrowUpRight size={14} className="text-teal-700" />
            <span>New Requisition</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition-all cursor-pointer shadow-sm shadow-teal-700/20"
          >
            <Plus size={15} />
            <span>+ Add Reagent / Item</span>
          </button>
        </div>
      </div>

      {/* ── KPI Metric Cards Strip ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total In-Hand Items */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">In-Hand Items</span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 flex items-center justify-center text-teal-700">
              <Package size={17} />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900">{kpis.totalItems}</span>
            <span className="text-xs text-slate-400 font-medium ml-1.5">distinct reagents</span>
          </div>
          <div className="mt-2 text-[11px] text-teal-700 font-medium flex items-center gap-1">
            <CheckCircle2 size={12} /> Live tracking active
          </div>
        </div>

        {/* Depleted & Low Stock */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Critical / Stockouts</span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${kpis.depletedCount > 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>
              <AlertTriangle size={17} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-600">{kpis.depletedCount}</span>
            <span className="text-xs text-slate-400 font-medium">depleted</span>
            <span className="text-xs text-slate-300">•</span>
            <span className="text-sm font-bold text-amber-600">{kpis.lowStockCount}</span>
            <span className="text-xs text-slate-400 font-medium">low</span>
          </div>
          <div className="mt-2 text-[11px] text-rose-600 font-medium flex items-center gap-1">
            {kpis.depletedCount > 0 ? 'Requires immediate restock' : 'Stock levels within safe range'}
          </div>
        </div>

        {/* Expiring Soon (<30 Days) */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">FEFO Alert (&lt;30d)</span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${kpis.expiringSoonCount > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
              <Clock size={17} />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-amber-600">{kpis.expiringSoonCount}</span>
            <span className="text-xs text-slate-400 font-medium ml-1.5">batches expiring</span>
          </div>
          <div className="mt-2 text-[11px] text-amber-700 font-medium flex items-center gap-1">
            First Expired, First Out priority
          </div>
        </div>

        {/* Expired Reagents */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Expired (Quarantine)</span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${kpis.expiredCount > 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
              <AlertOctagon size={17} />
            </div>
          </div>
          <div className="mt-3">
            <span className={`text-2xl font-black ${kpis.expiredCount > 0 ? 'text-red-600' : 'text-emerald-700'}`}>
              {kpis.expiredCount}
            </span>
            <span className="text-xs text-slate-400 font-medium ml-1.5">reagents expired</span>
          </div>
          <div className="mt-2 text-[11px] font-medium flex items-center gap-1 text-slate-500">
            {kpis.expiredCount > 0 ? 'Segregate from clinical use' : 'Zero expired stock active'}
          </div>
        </div>

        {/* Cold Chain Units */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Cold Chain Units</span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 flex items-center justify-center text-sky-700">
              <Refrigerator size={17} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900">{kpis.storageCount}</span>
            <span className="text-xs text-slate-400 font-medium">units</span>
            <span className="text-xs text-slate-300">•</span>
            <span className="text-xs text-sky-700 font-bold">{kpis.activeFridges} Fridges / {kpis.activeFreezers} Freezers</span>
          </div>
          <div className="mt-2 text-[11px] text-sky-700 font-medium flex items-center gap-1">
            2-8°C &amp; -20°C monitored
          </div>
        </div>
      </div>

      {/* ── Operational Tabs Bar ── */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between gap-2 overflow-x-auto">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'inventory'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Package size={15} />
            <span>In-Hand Reagents ({filteredInventory.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('fefo')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'fefo'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Clock size={15} />
            <span>FEFO &amp; Expiry Queue</span>
            {kpis.expiringSoonCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white font-extrabold">
                {kpis.expiringSoonCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('cold_chain')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'cold_chain'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Refrigerator size={15} />
            <span>Cold Chain &amp; Storage ({storageUnits.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('requisitions')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'requisitions'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ClipboardList size={15} />
            <span>Restock Requisitions ({requisitions.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('analyzers')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'analyzers'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Cpu size={15} />
            <span>Analyzers ({analyzers.length})</span>
          </button>
        </div>

        <span className="text-xs text-slate-400 font-medium px-2 hidden sm:inline">
          Last refreshed: {new Date().toLocaleTimeString()}
        </span>
      </div>

      {/* ── TAB 1: IN-HAND REAGENTS INVENTORY ── */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          {/* Search & Multi-Filters Toolbar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {/* Search input */}
              <div className="relative">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search reagent, lot number, analyzer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 text-slate-800"
                />
              </div>

              {/* Department / Bench filter */}
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 text-slate-700 font-medium"
              >
                <option value="all">All Benches &amp; Disciplines</option>
                {LAB_DISCIPLINES.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>

              {/* Storage Temperature filter */}
              <select
                value={tempFilter}
                onChange={(e) => setTempFilter(e.target.value)}
                className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 text-slate-700 font-medium"
              >
                {STORAGE_TEMPS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>

              {/* Stock status filter */}
              <select
                value={stockStatusFilter}
                onChange={(e) => setStockStatusFilter(e.target.value)}
                className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 text-slate-700 font-medium"
              >
                <option value="all">All Stock Statuses</option>
                <option value="depleted">Depleted / Stockout (Qty = 0)</option>
                <option value="low">Low Stock (≤ Minimum Threshold)</option>
                <option value="good">Adequate Stock (&gt; Min Threshold)</option>
              </select>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
            {loading ? (
              <div className="p-12 text-center space-y-3">
                <Loader2 size={32} className="animate-spin text-teal-600 mx-auto" />
                <p className="text-xs font-bold text-slate-600">Loading laboratory in-hand inventory...</p>
              </div>
            ) : filteredInventory.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <Box size={36} className="text-slate-300 mx-auto" />
                <h3 className="text-sm font-bold text-slate-700">No reagents match your filters</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Try adjusting search terms or clear filters, or add a new reagent to this section.
                </p>
                <button
                  onClick={handleOpenAddModal}
                  className="px-3.5 py-1.5 text-xs font-bold text-teal-700 bg-teal-50 border border-teal-200 rounded-xl hover:bg-teal-100 cursor-pointer"
                >
                  + Add Reagent Item
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Item &amp; Category</th>
                      <th className="py-3 px-4">Bench / Discipline</th>
                      <th className="py-3 px-4">Storage Unit &amp; Temp</th>
                      <th className="py-3 px-4">Lot # &amp; Expiry</th>
                      <th className="py-3 px-4 text-center">Stock Level</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {filteredInventory.map((item) => {
                      const qty = Number(item.quantity_in_hand) || 0;
                      const min = Number(item.min_threshold) || 1;
                      const percentage = Math.min(100, Math.round((qty / (min * 2)) * 100));
                      const isStockout = qty <= 0;
                      const isLow = qty > 0 && qty <= min;
                      const exp = getExpiryDetails(item.expiry_date);

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                          {/* Item & Category */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                isStockout ? 'bg-rose-100 text-rose-700' :
                                isLow ? 'bg-amber-100 text-amber-700' : 'bg-teal-50 text-teal-700'
                              }`}>
                                <Package size={16} />
                              </div>
                              <div>
                                <span className="font-bold text-slate-900 block leading-tight">{item.item_name}</span>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                                    {item.category || 'Reagent'}
                                  </span>
                                  {item.equipment_group && item.equipment_group !== 'General' && (
                                    <span className="text-[10px] text-teal-700 bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200">
                                      {item.equipment_group}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Bench / Discipline */}
                          <td className="py-3.5 px-4">
                            <span className="font-semibold text-slate-800">{item.department || 'Biochemistry'}</span>
                          </td>

                          {/* Storage Unit & Temp */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5">
                              {item.storage_temp === 'fridge_2_8' ? (
                                <Refrigerator size={14} className="text-sky-600 shrink-0" />
                              ) : item.storage_temp?.includes('freezer') ? (
                                <Snowflake size={14} className="text-indigo-600 shrink-0" />
                              ) : (
                                <Thermometer size={14} className="text-amber-600 shrink-0" />
                              )}
                              <div>
                                <span className="font-medium text-slate-800 block">
                                  {item.storage_unit_label || item.storage_unit_id || 'Storage Unit'}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {item.storage_temp === 'fridge_2_8' ? '2°C to 8°C' :
                                   item.storage_temp === 'freezer_minus_20' ? '-20°C' :
                                   item.storage_temp === 'freezer_minus_80' ? '-80°C' : 'Room Temp'}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Lot # & Expiry */}
                          <td className="py-3.5 px-4">
                            <div>
                              <span className="font-mono text-slate-700 text-[11px] block">
                                Lot: {item.lot_number || 'N/A'}
                              </span>
                              <div className="mt-0.5">
                                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                                  exp.status === 'expired' ? 'bg-red-50 text-red-700 border-red-200' :
                                  exp.status === 'critical' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                  exp.status === 'warning' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                  'bg-slate-50 text-slate-600 border-slate-200'
                                }`}>
                                  {exp.label}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Stock Level with Progress Bar */}
                          <td className="py-3.5 px-4">
                            <div className="w-40 mx-auto space-y-1">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className={`font-black ${
                                  isStockout ? 'text-rose-600' :
                                  isLow ? 'text-amber-600' : 'text-slate-800'
                                }`}>
                                  {qty} {item.unit_of_measure}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  Min: {min}
                                </span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    isStockout ? 'bg-rose-500 w-full' :
                                    isLow ? 'bg-amber-500' : 'bg-teal-600'
                                  }`}
                                  style={{ width: `${Math.max(5, percentage)}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenAdjustModal(item)}
                                title="Adjust Stock (Deduct / Receive)"
                                className="px-2.5 py-1 text-[11px] font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition-all cursor-pointer"
                              >
                                Adjust
                              </button>

                              <button
                                onClick={() => handleOpenEditModal(item)}
                                title="Edit Reagent Details"
                                className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
                              >
                                <Edit3 size={14} />
                              </button>

                              <button
                                onClick={() => handleDeleteItem(item.id, item.item_name)}
                                title="Remove Reagent"
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: FEFO & EXPIRY CONTROL ── */}
      {activeTab === 'fefo' && (
        <div className="space-y-4">
          <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Clock className="text-amber-600" size={18} />
                First Expired, First Out (FEFO) Priority Management
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Clinical reagents sorted by earliest expiration date to eliminate reagent wastage and prevent invalid diagnostic results.
              </p>
            </div>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
            >
              <Download size={13} /> Export Expiry Audit
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Reagent Item</th>
                    <th className="py-3 px-4">Discipline / Bench</th>
                    <th className="py-3 px-4">Lot Number</th>
                    <th className="py-3 px-4">Expiry Date</th>
                    <th className="py-3 px-4">Stock on Hand</th>
                    <th className="py-3 px-4">FEFO Urgency Status</th>
                    <th className="py-3 px-4 text-right">Quick Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {fefoItems.map((item) => {
                    const exp = item.expiry;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900">{item.item_name}</td>
                        <td className="py-3 px-4 text-slate-600">{item.department}</td>
                        <td className="py-3 px-4 font-mono text-[11px]">{item.lot_number || 'N/A'}</td>
                        <td className="py-3 px-4 font-mono text-[11px]">{item.expiry_date ? item.expiry_date.split('T')[0] : 'None'}</td>
                        <td className="py-3 px-4 font-bold">{item.quantity_in_hand} {item.unit_of_measure}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            exp.status === 'expired' ? 'bg-red-50 text-red-700 border-red-200' :
                            exp.status === 'critical' ? 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse' :
                            exp.status === 'warning' ? 'bg-sky-50 text-sky-700 border-sky-200' :
                            'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}>
                            {exp.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleOpenAdjustModal(item)}
                            className="px-2 py-1 text-[10px] font-bold text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 cursor-pointer"
                          >
                            Log Consumption
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: COLD CHAIN & STORAGE UNITS ── */}
      {activeTab === 'cold_chain' && (
        <div className="space-y-4">
          <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Refrigerator className="text-sky-600" size={18} />
                Laboratory Cold Chain &amp; Storage Units
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Monitoring temperature standards for diagnostic reagents, calibrators, controls, and patient specimens.
              </p>
            </div>
            <button
              onClick={() => setIsStorageModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition-all cursor-pointer shadow-xs"
            >
              <Plus size={14} /> Add Storage Unit
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {storageUnits.map((unit) => {
              const unitReagents = inventory.filter(i => i.storage_unit_id === unit.id);
              return (
                <div key={unit.id} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-xl ${
                          unit.type === 'fridge' ? 'bg-sky-50 text-sky-700' :
                          unit.type === 'freezer' ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'
                        }`}>
                          {unit.type === 'fridge' ? <Refrigerator size={18} /> :
                           unit.type === 'freezer' ? <Snowflake size={18} /> : <Thermometer size={18} />}
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-slate-900">{unit.label}</h3>
                          <span className="text-[10px] text-slate-400 font-mono">ID: {unit.id}</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Operational
                      </span>
                    </div>

                    <div className="mt-4 p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Target Temp:</span>
                      <span className="font-bold text-slate-800">{unit.temp_range || '2°C to 8°C'}</span>
                    </div>

                    <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
                      <span>Stored Reagent Items:</span>
                      <span className="font-bold text-slate-800">{unitReagents.length} items</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Type: {unit.type?.toUpperCase()}</span>
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setActiveTab('inventory');
                      }}
                      className="text-teal-700 font-bold hover:underline cursor-pointer"
                    >
                      View Reagents →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TAB 4: LAB REQUISITIONS & RESTOCK ── */}
      {activeTab === 'requisitions' && (
        <div className="space-y-4">
          <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ClipboardList className="text-teal-600" size={18} />
                Laboratory Replenishment Requisitions
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Restock orders submitted from the Laboratory department to Central General Store &amp; Procurement.
              </p>
            </div>
            <button
              onClick={() => setIsReqModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition-all cursor-pointer shadow-xs"
            >
              <Plus size={14} /> + New Lab Requisition
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
            {requisitions.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <ClipboardList size={32} className="text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-600">No requisitions currently recorded for Laboratory.</p>
                <button
                  onClick={() => setIsReqModalOpen(true)}
                  className="px-3.5 py-1.5 text-xs font-bold text-teal-700 bg-teal-50 border border-teal-200 rounded-xl hover:bg-teal-100 cursor-pointer"
                >
                  Create Requisition Now
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Req #</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Department</th>
                      <th className="py-3 px-4">Urgency</th>
                      <th className="py-3 px-4">Notes / Purpose</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {requisitions.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-teal-700">REQ-{req.id}</td>
                        <td className="py-3 px-4">{req.created_at ? new Date(req.created_at).toLocaleDateString() : 'N/A'}</td>
                        <td className="py-3 px-4">{req.department_name || req.department || 'Laboratory'}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            req.urgency === 'High' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                            req.urgency === 'Medium' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                            'bg-slate-50 text-slate-600 border border-slate-200'
                          }`}>
                            {req.urgency || 'Normal'}
                          </span>
                        </td>
                        <td className="py-3 px-4 max-w-xs truncate">{req.notes || 'Routine Reagent Restock'}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            req.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            req.status === 'Rejected' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                            req.status === 'Issued' ? 'bg-sky-50 text-sky-700 border-sky-200' :
                            'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {req.status || 'Pending'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 5: ANALYZERS & REAGENTS ── */}
      {activeTab === 'analyzers' && (
        <div className="space-y-4">
          <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-2xs">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Cpu className="text-teal-600" size={18} />
              Connected Laboratory Analyzers &amp; Consumables
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Overview of diagnostic equipment requiring dedicated reagent cartridges, diluents, and lysing solutions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {analyzers.map((an) => (
              <div key={an.id} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-teal-50 text-teal-700">
                      <Cpu size={18} />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">{an.name}</h3>
                      <span className="text-[10px] text-slate-400 font-medium">{an.manufacturer} • {an.model}</span>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    an.status === 'Operational' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    an.status === 'Maintenance' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    'bg-slate-50 text-slate-600 border-slate-200'
                  }`}>
                    {an.status || 'Operational'}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Bench:</span>
                    <span className="font-bold text-slate-800">{an.department || 'Laboratory'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Last Calibrated:</span>
                    <span className="font-medium text-slate-700">{an.last_calibrated || 'Recent'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Next Calibration:</span>
                    <span className="font-medium text-teal-700">{an.next_calibration_due || 'On Schedule'}</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSearchQuery(an.name);
                    setActiveTab('inventory');
                  }}
                  className="w-full py-1.5 text-center text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-xl transition-all cursor-pointer border border-teal-200"
                >
                  Filter Associated Reagents →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── MODAL: Add / Edit Reagent ── */}
      {isAddEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-xl overflow-hidden my-8">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
                <Package className="text-teal-700" size={18} />
                {editingItem ? `Edit Reagent: ${editingItem.item_name}` : 'Register In-Hand Reagent'}
              </h3>
              <button
                onClick={() => setIsAddEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Reagent / Item Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sysmex CELLPACK DCL 20L"
                  value={itemForm.item_name}
                  onChange={(e) => setItemForm({ ...itemForm, item_name: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Category</label>
                  <select
                    value={itemForm.category}
                    onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600"
                  >
                    {REAGENT_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Bench / Discipline</label>
                  <select
                    value={itemForm.department}
                    onChange={(e) => setItemForm({ ...itemForm, department: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600"
                  >
                    {LAB_DISCIPLINES.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Equipment Group / Analyzer</label>
                  <input
                    type="text"
                    placeholder="e.g. Sysmex XN-550, Cobas c311, General"
                    value={itemForm.equipment_group}
                    onChange={(e) => setItemForm({ ...itemForm, equipment_group: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Storage Temperature</label>
                  <select
                    value={itemForm.storage_temp}
                    onChange={(e) => setItemForm({ ...itemForm, storage_temp: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600"
                  >
                    {STORAGE_TEMPS.filter(t => t.value !== 'all').map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Assigned Storage Unit</label>
                  <select
                    value={itemForm.storage_unit_id}
                    onChange={(e) => setItemForm({ ...itemForm, storage_unit_id: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600"
                  >
                    {storageUnits.map((u) => (
                      <option key={u.id} value={u.id}>{u.label} ({u.temp_range})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Unit of Measure</label>
                  <select
                    value={itemForm.unit_of_measure}
                    onChange={(e) => setItemForm({ ...itemForm, unit_of_measure: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600"
                  >
                    {UOM_OPTIONS.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Quantity in Hand *</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={itemForm.quantity_in_hand}
                    onChange={(e) => setItemForm({ ...itemForm, quantity_in_hand: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 font-bold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Min Safety Threshold *</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={itemForm.min_threshold}
                    onChange={(e) => setItemForm({ ...itemForm, min_threshold: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Lot / Batch Number</label>
                  <input
                    type="text"
                    placeholder="e.g. LOT-2026-X812"
                    value={itemForm.lot_number}
                    onChange={(e) => setItemForm({ ...itemForm, lot_number: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Expiration Date (FEFO)</label>
                  <input
                    type="date"
                    value={itemForm.expiry_date}
                    onChange={(e) => setItemForm({ ...itemForm, expiry_date: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddEditModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingItem}
                  className="px-5 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition-all cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {savingItem ? 'Saving...' : editingItem ? 'Save Changes' : 'Register Reagent'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Quick Stock Adjustment ── */}
      {isAdjustModalOpen && adjustingItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                <TrendingUp className="text-teal-700" size={17} />
                Adjust Stock: {adjustingItem.item_name}
              </h3>
              <button
                onClick={() => setIsAdjustModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleApplyAdjustment} className="p-5 space-y-4">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex justify-between items-center">
                <span className="text-slate-500 font-medium">Current Stock on Hand:</span>
                <span className="font-black text-slate-900 text-sm">
                  {adjustingItem.quantity_in_hand} {adjustingItem.unit_of_measure}
                </span>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Adjustment Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustForm({ ...adjustForm, change_type: 'deduct' })}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                      adjustForm.change_type === 'deduct'
                        ? 'bg-rose-50 border-rose-300 text-rose-700 font-black'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    - Deduct / Consume
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustForm({ ...adjustForm, change_type: 'add' })}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                      adjustForm.change_type === 'add'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-700 font-black'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    + Add / Receive
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Quantity ({adjustingItem.unit_of_measure}) *
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={adjustForm.quantity}
                  onChange={(e) => setAdjustForm({ ...adjustForm, quantity: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Reason / Consumption Purpose</label>
                <select
                  value={adjustForm.reason}
                  onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600"
                >
                  <option value="Daily Routine Run">Daily Routine Patient Run</option>
                  <option value="QC & Calibration Consumption">Quality Control (QC) &amp; Calibration</option>
                  <option value="Received Shipment from Central Store">Received Shipment from Central Store</option>
                  <option value="Spill / Wastage / Damaged Reagent">Spill / Wastage / Damaged Reagent</option>
                  <option value="Inventory Reconciliation Audit">Inventory Reconciliation Audit</option>
                  <option value="Expired Reagent Disposal">Expired Reagent Disposal</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjustingStock}
                  className="px-4 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition-all cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {adjustingStock ? 'Applying...' : 'Apply Stock Change'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Add Storage Unit ── */}
      {isStorageModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                <Refrigerator className="text-teal-700" size={17} />
                Register New Storage Unit
              </h3>
              <button
                onClick={() => setIsStorageModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveStorageUnit} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Unit ID (Code) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. fridge_4, freezer_m20_2"
                  value={storageForm.id}
                  onChange={(e) => setStorageForm({ ...storageForm, id: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Unit Label / Display Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Fridge 4 - Microbiology Cultures"
                  value={storageForm.label}
                  onChange={(e) => setStorageForm({ ...storageForm, label: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Unit Type</label>
                  <select
                    value={storageForm.type}
                    onChange={(e) => setStorageForm({ ...storageForm, type: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600"
                  >
                    <option value="fridge">Refrigerated Fridge (2-8°C)</option>
                    <option value="freezer">Standard Freezer (-20°C)</option>
                    <option value="ultra_low">Ultra-Low Freezer (-80°C)</option>
                    <option value="room_temp">Room Temp Cabinet</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Temperature Range</label>
                  <input
                    type="text"
                    placeholder="e.g. 2°C to 8°C"
                    value={storageForm.temp_range}
                    onChange={(e) => setStorageForm({ ...storageForm, temp_range: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsStorageModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingUnit}
                  className="px-4 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition-all cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {savingUnit ? 'Saving...' : 'Register Storage Unit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: New Lab Requisition ── */}
      {isReqModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden my-8">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                <ClipboardList className="text-teal-700" size={17} />
                Create Laboratory Reagent Requisition
              </h3>
              <button
                onClick={() => setIsReqModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitRequisition} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Originating Department</label>
                  <input
                    type="text"
                    disabled
                    value="Laboratory"
                    className="w-full px-3 py-2 text-xs bg-slate-100 border border-slate-200 rounded-xl text-slate-600 font-bold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Priority / Urgency</label>
                  <select
                    value={reqForm.urgency}
                    onChange={(e) => setReqForm({ ...reqForm, urgency: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600"
                  >
                    <option value="Low">Low (Buffer Stock)</option>
                    <option value="Medium">Medium (Routine Replenishment)</option>
                    <option value="High">High (Impending Stockout)</option>
                    <option value="Emergency">Emergency (Immediate Diagnostic Halt)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Justification / Order Notes</label>
                <textarea
                  rows="2"
                  placeholder="e.g. Depleted Sysmex Hematology reagents and COVID/Flu combo rapid test kits."
                  value={reqForm.notes}
                  onChange={(e) => setReqForm({ ...reqForm, notes: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">Requested Items &amp; Quantities</label>
                  <button
                    type="button"
                    onClick={handleAddReqItem}
                    className="text-xs font-bold text-teal-700 hover:underline cursor-pointer"
                  >
                    + Add Item Line
                  </button>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {reqForm.items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                      <input
                        type="text"
                        placeholder="Reagent or Item Name"
                        value={item.item_name}
                        onChange={(e) => handleReqItemChange(idx, 'item_name', e.target.value)}
                        className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                      <input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={item.quantity_requested}
                        onChange={(e) => handleReqItemChange(idx, 'quantity_requested', Number(e.target.value))}
                        className="w-16 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                      />
                      <select
                        value={item.unit}
                        onChange={(e) => handleReqItemChange(idx, 'unit', e.target.value)}
                        className="w-24 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      >
                        {UOM_OPTIONS.map(u => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </select>
                      {reqForm.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveReqItem(idx)}
                          className="text-slate-400 hover:text-rose-600 p-1"
                        >
                          <X size={15} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsReqModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReq}
                  className="px-4 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition-all cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {submittingReq ? 'Submitting...' : 'Submit Requisition'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
