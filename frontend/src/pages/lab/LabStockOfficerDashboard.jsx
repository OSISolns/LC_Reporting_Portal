import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Package, AlertTriangle, Search, Plus, RefreshCw,
  ClipboardList, Cpu, Download, Edit3,
  Trash2, Box, Refrigerator,
  Snowflake, Thermometer, X
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  getInhandInventory, createInhandInventory, updateInhandInventory,
  deleteInhandInventory, getStorageUnits, saveStorageUnit,
  getAnalyzers, getLabRequisitions, createLabRequisition
} from '../../api/lab';
import LabRequisitionHub from './LabRequisitionHub';

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

// Available Analyzers provided by clinic
const AVAILABLE_ANALYZER_NAMES = [
  'Cobas C 311',
  'Cobas e411',
  'VITEK 2 Compact',
  'Mispa i3',
  'Mindray BS-430',
  'Mindray Bc-780',
  'VITEK 2 Compact (Microbiology)',
  'Sysmex XN-330'
];

const EQUIPMENT_GROUP_OPTIONS = [
  'Cobas C311 Reagents',
  'Cobas e411 Reagents',
  'VITEK 2 Compact Reagents',
  'Mispa i3 Reagents',
  'Mindray BS-430 Reagents',
  'Mindray Bc-780 Reagents',
  'Sysmex Reagents',
  'General Laboratory Supplies'
];

const STORAGE_TEMPS = [
  { value: 'all', label: 'All Temperatures' },
  { value: 'fridge_2_8', label: '2°C to 8°C (Refrigerated)', icon: Refrigerator, badgeColor: 'bg-sky-50 text-sky-700 border-sky-200' },
  { value: 'room_temp', label: '15°C to 25°C (Room Temp)', icon: Thermometer, badgeColor: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'freezer_minus_20', label: '-20°C (Freezer)', icon: Snowflake, badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { value: 'freezer_minus_80', label: '-80°C (Ultra-Low)', icon: Snowflake, badgeColor: 'bg-purple-50 text-purple-700 border-purple-200' }
];

const UOM_OPTIONS = ['kits', 'bot', 'box', 'pack', 'pcs', 'kg', 'vials', 'tests', 'cartridges', 'strips', 'tubes', 'plates'];

// Helper to associate reagents with the available analyzers
const getAnalyzerReagents = (analyzer, inventoryList) => {
  const anName = (analyzer.name || '').toLowerCase();
  const anDept = (analyzer.department || '').toLowerCase();

  return inventoryList.filter(item => {
    const itemGroup = (item.equipment_group || '').toLowerCase();
    const itemName = (item.item_name || '').toLowerCase();
    const itemDept = (item.department || '').toLowerCase();

    if (anName.includes('c 311') || anName.includes('c311')) {
      return (itemGroup.includes('c311') || itemName.includes('c311') || itemName.includes('integra')) && !itemGroup.includes('e411') && !itemName.includes('elecsys');
    }
    if (anName.includes('e411') || anName.includes('e 411')) {
      return itemGroup.includes('e411') || itemName.includes('elecsys') || itemName.includes('e411');
    }
    if (anName.includes('mispa')) {
      return itemGroup.includes('mispa') || itemName.includes('mispa');
    }
    if (anName.includes('bs-430') || anName.includes('bs430')) {
      return itemGroup.includes('bs-430') || itemGroup.includes('bs430') || itemName.includes('bs-430');
    }
    if (anName.includes('bc-780') || anName.includes('bc780')) {
      return itemGroup.includes('bc-780') || itemGroup.includes('bc780') || itemName.includes('bc-780');
    }
    if (anName.includes('sysmex') || anName.includes('xn-330')) {
      return itemGroup.includes('sysmex') || itemGroup.includes('xn-330') || itemName.includes('xn-330') || itemGroup.includes('hematology');
    }
    if (anName.includes('vitek')) {
      if (anDept.includes('micro') || anName.includes('microbiology')) {
        return (itemGroup.includes('vitek') && itemDept.includes('micro')) || itemName.includes('saline') || itemName.includes('unsensitized');
      }
      return itemGroup.includes('vitek') && !itemDept.includes('micro');
    }
    return itemGroup.includes(anName);
  });
};

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

  // Active Tab: 'inventory' | 'analyzers' | 'cold_chain' | 'requisitions'
  const [activeTab, setActiveTab] = useState('inventory');

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [equipFilter, setEquipFilter] = useState('all');
  const [storageUnitFilter, setStorageUnitFilter] = useState('all');
  const [tempFilter, setTempFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockStatusFilter, setStockStatusFilter] = useState('all'); // 'all' | 'low' | 'depleted' | 'good'

  // Cold Chain Tab Filter: 'all' | 'fridge' | 'room_temp' | 'freezer'
  const [storageTabType, setStorageTabType] = useState('all');

  // Modals
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustingItem, setAdjustingItem] = useState(null);
  const [isStorageModalOpen, setIsStorageModalOpen] = useState(false);
  const [isReqModalOpen, setIsReqModalOpen] = useState(false);

  // Form State: Add/Edit Item (No Expiry Date, No Lot Number)
  const [itemForm, setItemForm] = useState({
    item_name: '',
    category: 'Reagents',
    equipment_group: 'Cobas C311 Reagents',
    department: 'Biochemistry',
    storage_temp: 'room_temp',
    storage_unit_id: 'room_temp_biochem',
    quantity_in_hand: 10,
    unit_of_measure: 'pcs',
    min_threshold: 5
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

  // ── KPI Metrics Calculation (True Stock Indicators) ─────────────────────────
  const kpis = useMemo(() => {
    const totalItems = inventory.length;
    let depletedCount = 0;
    let lowStockCount = 0;
    let adequateCount = 0;
    let roomTempCount = 0;
    let coldChainCount = 0;

    inventory.forEach((item) => {
      const qty = Number(item.quantity_in_hand) || 0;
      const min = Number(item.min_threshold) || 0;
      if (qty <= 0) depletedCount++;
      else if (qty <= min) lowStockCount++;
      else adequateCount++;

      const isRefrig = item.storage_temp === 'fridge_2_8' || item.storage_temp === 'refrigerator' || item.storage_temp?.includes('freezer');
      if (isRefrig) coldChainCount++;
      else roomTempCount++;
    });

    const activeFridges = storageUnits.filter(u => u.type === 'fridge').length;
    const activeRoomTemp = storageUnits.filter(u => u.type === 'room_temp').length;
    const activeFreezers = storageUnits.filter(u => u.type === 'freezer').length;

    return {
      totalItems,
      depletedCount,
      lowStockCount,
      adequateCount,
      roomTempCount,
      coldChainCount,
      storageCount: storageUnits.length,
      activeFridges,
      activeRoomTemp,
      activeFreezers
    };
  }, [inventory, storageUnits]);

  // ── Filtered Inventory ───────────────────────────────────────────────────────
  const filteredInventory = useMemo(() => {
    return inventory.filter((item) => {
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.item_name?.toLowerCase().includes(q);
        const matchesEquip = item.equipment_group?.toLowerCase().includes(q);
        const matchesDept = item.department?.toLowerCase().includes(q);
        if (!matchesName && !matchesEquip && !matchesDept) return false;
      }

      // Equipment / Analyzer filter
      if (equipFilter !== 'all') {
        const itemEquip = (item.equipment_group || '').toLowerCase();
        const ef = equipFilter.toLowerCase();
        if (!itemEquip.includes(ef)) return false;
      }

      // Storage Unit Filter
      if (storageUnitFilter !== 'all' && item.storage_unit_id !== storageUnitFilter) {
        return false;
      }

      // Storage Temp filter
      if (tempFilter !== 'all') {
        const isRefrigFilter = tempFilter === 'fridge_2_8' || tempFilter === 'refrigerator';
        const isItemRefrig = item.storage_temp === 'fridge_2_8' || item.storage_temp === 'refrigerator';
        if (isRefrigFilter && !isItemRefrig) return false;
        if (!isRefrigFilter && item.storage_temp !== tempFilter) return false;
      }

      // Department filter
      if (deptFilter !== 'all' && item.department !== deptFilter) return false;

      // Category filter
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;

      // Stock Status filter
      const qty = Number(item.quantity_in_hand) || 0;
      const min = Number(item.min_threshold) || 0;
      if (stockStatusFilter === 'depleted' && qty > 0) return false;
      if (stockStatusFilter === 'low' && (qty <= 0 || qty > min)) return false;
      if (stockStatusFilter === 'good' && qty <= min) return false;

      return true;
    });
  }, [inventory, searchQuery, equipFilter, storageUnitFilter, tempFilter, deptFilter, categoryFilter, stockStatusFilter]);

  // ── Filtered Storage Units for Tab 3 ────────────────────────────────────────
  const filteredStorageUnits = useMemo(() => {
    if (storageTabType === 'all') return storageUnits;
    return storageUnits.filter(u => u.type === storageTabType);
  }, [storageUnits, storageTabType]);

  // ── Handler: Open Add/Edit Item Modal ─────────────────────────────────────────
  const handleOpenAddModal = () => {
    setEditingItem(null);
    setItemForm({
      item_name: '',
      category: 'Reagents',
      equipment_group: 'Cobas C311 Reagents',
      department: 'Biochemistry',
      storage_temp: 'room_temp',
      storage_unit_id: storageUnits[0]?.id || 'room_temp_biochem',
      quantity_in_hand: 10,
      unit_of_measure: 'pcs',
      min_threshold: 5
    });
    setIsAddEditModalOpen(true);
  };

  const handleOpenEditModal = (item) => {
    setEditingItem(item);
    setItemForm({
      item_name: item.item_name || '',
      category: item.category || 'Reagents',
      equipment_group: item.equipment_group || 'General Laboratory Supplies',
      department: item.department || 'Biochemistry',
      storage_temp: item.storage_temp || 'room_temp',
      storage_unit_id: item.storage_unit_id || storageUnits[0]?.id || 'room_temp_biochem',
      quantity_in_hand: item.quantity_in_hand ?? 0,
      unit_of_measure: item.unit_of_measure || 'pcs',
      min_threshold: item.min_threshold ?? 5
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
      const payload = {
        ...itemForm,
        expiry_date: null,
        lot_number: null
      };

      if (editingItem) {
        const res = await updateInhandInventory(editingItem.id, payload);
        if (res.data?.success) {
          toast.success(`Updated reagent: ${itemForm.item_name}`);
          setIsAddEditModalOpen(false);
          fetchAllData(true);
        }
      } else {
        const res = await createInhandInventory(payload);
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
        lot_number: null,
        expiry_date: null
      };

      const res = await updateInhandInventory(adjustingItem.id, updatedPayload);
      if (res.data?.success) {
        toast.success(
          `Stock updated for ${adjustingItem.item_name}: ${currentQty} → ${newQty} ${adjustingItem.unit_of_measure} (${adjustForm.reason})`
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

  // ── Export Inventory CSV (Strictly without expiry & lots) ─────────────────────
  const handleExportCSV = () => {
    try {
      const headers = [
        'ID',
        'Reagent / Consumable Name',
        'Category',
        'Department / Bench',
        'Equipment Group / Analyzer',
        'Storage Unit',
        'Storage Temp',
        'Quantity In Hand',
        'Unit of Measure',
        'Min Alert Threshold',
        'Stock Status'
      ];

      const rows = inventory.map(item => {
        const qty = Number(item.quantity_in_hand) || 0;
        const min = Number(item.min_threshold) || 0;
        const status = qty <= 0 ? 'Depleted (0)' : qty <= min ? 'Low Stock' : 'Adequate';

        return [
          item.id,
          `"${(item.item_name || '').replace(/"/g, '""')}"`,
          item.category || '',
          item.department || '',
          `"${(item.equipment_group || '').replace(/"/g, '""')}"`,
          item.storage_unit_id || '',
          item.storage_temp || '',
          qty,
          item.unit_of_measure || '',
          min,
          status
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

      toast.success('Laboratory In-Hand Inventory Register exported.');
    } catch (err) {
      console.error('CSV export failed:', err);
      toast.error('Failed to export inventory CSV.');
    }
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6 text-slate-800 font-sans">

      {/* ── Simple, Clean Institutional Header ── */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              MoH Rwanda Standard • ISO 15189
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              Laboratory Diagnostics Hub
            </span>
            <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Duty: Lab stock Manager
            </span>
          </div>

          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Lab stock Manager Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Legacy Clinics • In-Hand Inventory, Connected Analyzers &amp; Cold Chain Management
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => fetchAllData(true)}
            disabled={refreshing}
            className="px-3.5 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Download size={14} className="text-slate-600" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setIsReqModalOpen(true)}
            className="px-3.5 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <ClipboardList size={14} className="text-slate-600" />
            <span>New Requisition</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 rounded-lg bg-[#1B669E] hover:bg-[#155280] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Plus size={15} />
            <span>Record Reagent</span>
          </button>
        </div>
      </div>

      {/* ── Clean Metric Counter Cards (Based on Real Physical Quantities) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Metric 1 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">In-Hand Items</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">{kpis.totalItems}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            Distinct items registered
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Depleted / Stockout</span>
          <div className="text-2xl font-bold text-rose-600 mt-1">{kpis.depletedCount}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            {kpis.depletedCount > 0 ? '0 units (needs restock)' : 'Zero stockouts'}
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Low Stock Alert</span>
          <div className="text-2xl font-bold text-amber-700 mt-1">{kpis.lowStockCount}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            ≤ Safety threshold
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Adequate Stock</span>
          <div className="text-2xl font-bold text-emerald-700 mt-1">{kpis.adequateCount}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            Above safety buffer
          </div>
        </div>

        {/* Metric 5 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Room Temp (20°–25°C)</span>
          <div className="text-2xl font-bold text-amber-800 mt-1">{kpis.roomTempCount}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            Ambient storage reagents
          </div>
        </div>

        {/* Metric 6 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Cold Chain (2°–8°C)</span>
          <div className="text-2xl font-bold text-sky-700 mt-1">{kpis.coldChainCount}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            Refrigerated storage units
          </div>
        </div>
      </div>

      {/* ── Clean Operational Tabs Bar ── */}
      <div className="bg-white p-1.5 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 flex-wrap">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 ${activeTab === 'inventory'
                ? 'bg-[#1B669E] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
          >
            <Package size={14} />
            <span>In-Hand Reagents ({filteredInventory.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('analyzers')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 ${activeTab === 'analyzers'
                ? 'bg-[#1B669E] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
          >
            <Cpu size={14} />
            <span>Connected Analyzers ({analyzers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('cold_chain')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 ${activeTab === 'cold_chain'
                ? 'bg-[#1B669E] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
          >
            <Refrigerator size={14} />
            <span>Laboratory Cold Chain &amp; Storage ({storageUnits.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('requisitions')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 ${activeTab === 'requisitions'
                ? 'bg-[#1B669E] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
          >
            <ClipboardList size={14} />
            <span>Unit Requisitions ({requisitions.length})</span>
          </button>
        </div>

        <span className="text-[11px] text-slate-400 font-medium px-3 hidden sm:inline">
          Live Laboratory In-Hand Tracking
        </span>
      </div>

      {/* ── TAB 1: IN-HAND REAGENTS INVENTORY ── */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          {/* Active Storage Unit Banner if filtered */}
          {storageUnitFilter !== 'all' && (
            <div className="bg-sky-50 border border-sky-200 text-sky-900 px-4 py-2.5 rounded-xl flex items-center justify-between text-xs font-medium">
              <div className="flex items-center gap-2">
                <Refrigerator size={16} className="text-sky-700" />
                <span>
                  Showing reagents stored in: <strong className="font-bold">{storageUnits.find(u => u.id === storageUnitFilter)?.label || storageUnitFilter}</strong>
                </span>
              </div>
              <button
                onClick={() => setStorageUnitFilter('all')}
                className="text-xs font-bold text-sky-800 hover:text-sky-950 underline flex items-center gap-1"
              >
                Clear Unit Filter
              </button>
            </div>
          )}

          {/* Search & Multi-Filters Toolbar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
              {/* Search input (clean clinical, no placeholder) */}
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:border-[#1B669E] text-slate-800"
                  aria-label="Search reagents"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Equipment Group / Analyzer Filter */}
              <select
                value={equipFilter}
                onChange={(e) => setEquipFilter(e.target.value)}
                className="py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:bg-white focus:outline-none focus:border-[#1B669E]"
              >
                <option value="all">All Analyzers &amp; Equipment</option>
                <option value="Cobas C311">Cobas C 311 Reagents</option>
                <option value="Cobas e411">Cobas e411 Reagents</option>
                <option value="VITEK">VITEK 2 Compact Reagents</option>
                <option value="Mispa">Mispa i3 Reagents</option>
                <option value="BS-430">Mindray BS-430 Reagents</option>
                <option value="Bc-780">Mindray Bc-780 Reagents</option>
                <option value="Sysmex">Sysmex XN-330 Reagents</option>
              </select>

              {/* Storage Unit Filter */}
              <select
                value={storageUnitFilter}
                onChange={(e) => setStorageUnitFilter(e.target.value)}
                className="py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:bg-white focus:outline-none focus:border-[#1B669E]"
              >
                <option value="all">All Storage Units</option>
                {storageUnits.map((u) => (
                  <option key={u.id} value={u.id}>{u.label}</option>
                ))}
              </select>

              {/* Department / Bench filter */}
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:bg-white focus:outline-none focus:border-[#1B669E]"
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
                className="py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:bg-white focus:outline-none focus:border-[#1B669E]"
              >
                {STORAGE_TEMPS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>

              {/* Stock status filter */}
              <select
                value={stockStatusFilter}
                onChange={(e) => setStockStatusFilter(e.target.value)}
                className="py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:bg-white focus:outline-none focus:border-[#1B669E]"
              >
                <option value="all">All Stock Statuses</option>
                <option value="depleted">Depleted / Stockout (0 units)</option>
                <option value="low">Low Stock (≤ Threshold)</option>
                <option value="good">Adequate Stock (&gt; Threshold)</option>
              </select>
            </div>

            {(searchQuery || equipFilter !== 'all' || storageUnitFilter !== 'all' || deptFilter !== 'all' || tempFilter !== 'all' || stockStatusFilter !== 'all') && (
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 text-xs">
                <span className="text-slate-500">
                  Showing <span className="font-bold text-slate-800">{filteredInventory.length}</span> of {inventory.length} reagents
                </span>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setEquipFilter('all');
                    setStorageUnitFilter('all');
                    setDeptFilter('all');
                    setTempFilter('all');
                    setStockStatusFilter('all');
                  }}
                  className="text-xs font-semibold text-[#1B669E] hover:underline"
                >
                  Reset All Filters
                </button>
              </div>
            )}
          </div>

          {/* Table Container */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {loading ? (
              <div className="p-12 text-center space-y-3">
                <RefreshCw size={28} className="animate-spin text-[#1B669E] mx-auto" />
                <p className="text-xs font-semibold text-slate-500">Loading laboratory in-hand inventory...</p>
              </div>
            ) : filteredInventory.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <Box size={32} className="text-slate-300 mx-auto" />
                <h3 className="text-sm font-bold text-slate-700">No reagents match your filters</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Try adjusting search parameters or clear filters, or record a new in-hand item.
                </p>
                <button
                  onClick={handleOpenAddModal}
                  className="px-3.5 py-1.5 text-xs font-semibold text-[#1B669E] bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100"
                >
                  Record Reagent Item
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Item &amp; Category</th>
                      <th className="py-3 px-4">Equipment Group / Analyzer</th>
                      <th className="py-3 px-4">Bench / Discipline</th>
                      <th className="py-3 px-4">Storage Unit &amp; Temp</th>
                      <th className="py-3 px-4 text-center">Stock Level</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredInventory.map((item) => {
                      const qty = Number(item.quantity_in_hand) || 0;
                      const min = Number(item.min_threshold) || 1;
                      const percentage = Math.min(100, Math.round((qty / (min * 2)) * 100));
                      const isStockout = qty <= 0;
                      const isLow = qty > 0 && qty <= min;

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                          {/* Item & Category */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isStockout ? 'bg-rose-50 text-rose-700' :
                                  isLow ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'
                                }`}>
                                <Package size={15} />
                              </div>
                              <div>
                                <span className="font-bold text-slate-900 block leading-tight">{item.item_name}</span>
                                <span className="text-[10px] font-semibold text-slate-500 mt-0.5 inline-block">
                                  {item.category || 'Reagent'}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Equipment Group / Analyzer */}
                          <td className="py-3.5 px-4">
                            <span className="text-[11px] font-semibold text-[#1B669E] bg-blue-50/80 px-2 py-0.5 rounded border border-blue-200 inline-block">
                              {item.equipment_group || 'General Laboratory Supplies'}
                            </span>
                          </td>

                          {/* Bench / Discipline */}
                          <td className="py-3.5 px-4 font-semibold text-slate-800">
                            {item.department || 'Biochemistry'}
                          </td>

                          {/* Storage Unit & Temp */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5">
                              {(item.storage_temp === 'fridge_2_8' || item.storage_temp === 'refrigerator') ? (
                                <Refrigerator size={14} className="text-sky-600 shrink-0" />
                              ) : item.storage_temp?.includes('freezer') ? (
                                <Snowflake size={14} className="text-indigo-600 shrink-0" />
                              ) : (
                                <Thermometer size={14} className="text-amber-600 shrink-0" />
                              )}
                              <div>
                                <span className="font-semibold text-slate-800 block text-xs">
                                  {storageUnits.find(u => u.id === item.storage_unit_id)?.label || item.storage_unit_label || item.storage_unit_id || 'Storage Unit'}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {(item.storage_temp === 'fridge_2_8' || item.storage_temp === 'refrigerator') ? '2°C to 8°C (Cold Chain)' :
                                    item.storage_temp === 'freezer_minus_20' ? '-20°C (Freezer)' :
                                      item.storage_temp === 'freezer_minus_80' ? '-80°C' : '20°C to 25°C (Room Temp)'}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Stock Level with Progress Bar */}
                          <td className="py-3.5 px-4">
                            <div className="w-36 mx-auto space-y-1">
                              <div className="flex items-center justify-between text-[11px] font-mono">
                                <span className={`font-bold ${isStockout ? 'text-rose-600' :
                                    isLow ? 'text-amber-700' : 'text-slate-800'
                                  }`}>
                                  {qty} {item.unit_of_measure}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  Min: {min}
                                </span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${isStockout ? 'bg-rose-500 w-full' :
                                      isLow ? 'bg-amber-500' : 'bg-[#1B669E]'
                                    }`}
                                  style={{ width: `${Math.max(5, percentage)}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* Stock Status */}
                          <td className="py-3.5 px-4 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${isStockout ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                isLow ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                  'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}>
                              {isStockout ? 'Depleted' : isLow ? 'Low Stock' : 'Adequate'}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenAdjustModal(item)}
                                className="px-2.5 py-1 text-xs font-semibold text-[#1B669E] bg-blue-50/70 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
                              >
                                Adjust
                              </button>

                              <button
                                onClick={() => handleOpenEditModal(item)}
                                title="Edit Reagent"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                              >
                                <Edit3 size={13} />
                              </button>

                              <button
                                onClick={() => handleDeleteItem(item.id, item.item_name)}
                                title="Remove Reagent"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              >
                                <Trash2 size={13} />
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

      {/* ── TAB 2: CONNECTED LABORATORY ANALYZERS & CONSUMABLES ── */}
      {activeTab === 'analyzers' && (
        <div className="space-y-4">
          <div className="bg-white p-4.5 rounded-xl border border-slate-200">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Cpu className="text-[#1B669E]" size={16} />
              Connected Laboratory Analyzers &amp; Consumables
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Available diagnostic analyzers configured with real-time in-hand consumable and reagent stock levels.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {analyzers.map((an) => {
              const matchedItems = getAnalyzerReagents(an, inventory);
              const depletedItems = matchedItems.filter(i => (Number(i.quantity_in_hand) || 0) <= 0);
              const lowItems = matchedItems.filter(i => {
                const q = Number(i.quantity_in_hand) || 0;
                const m = Number(i.min_threshold) || 0;
                return q > 0 && q <= m;
              });
              const adequateItems = matchedItems.filter(i => {
                const q = Number(i.quantity_in_hand) || 0;
                const m = Number(i.min_threshold) || 0;
                return q > m;
              });

              return (
                <div key={an.id} className="bg-white p-4.5 rounded-xl border border-slate-200 space-y-3 flex flex-col justify-between">
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-blue-50 text-[#1B669E]">
                          <Cpu size={16} />
                        </div>
                        <div>
                          <h3 className="font-bold text-xs text-slate-900 leading-tight">{an.name}</h3>
                          <span className="text-[10px] text-slate-400 font-medium block">
                            {an.manufacturer} • {an.model}
                          </span>
                        </div>
                      </div>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                        {an.status || 'Operational'}
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 text-[11px] space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Bench:</span>
                        <span className="font-semibold text-slate-800">{an.department || 'Biochemistry'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Serial #:</span>
                        <span className="font-mono text-slate-700">{an.serial_number || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Calibration:</span>
                        <span className="font-medium text-slate-700">Due {an.next_calibration_due || 'On Schedule'}</span>
                      </div>
                    </div>

                    {/* Stock status summary for this analyzer */}
                    <div className="p-2.5 rounded-lg border border-slate-100 bg-white space-y-1.5 text-xs">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-600 font-medium">Assigned Reagents:</span>
                        <span className="font-bold text-slate-900">{matchedItems.length} items</span>
                      </div>

                      <div className="grid grid-cols-3 gap-1 pt-1 text-center text-[10px]">
                        <div className={`p-1 rounded ${depletedItems.length > 0 ? 'bg-rose-50 text-rose-700 font-bold border border-rose-200' : 'bg-slate-50 text-slate-500'}`}>
                          <div>{depletedItems.length}</div>
                          <div className="text-[9px]">Stockout</div>
                        </div>
                        <div className={`p-1 rounded ${lowItems.length > 0 ? 'bg-amber-50 text-amber-700 font-bold border border-amber-200' : 'bg-slate-50 text-slate-500'}`}>
                          <div>{lowItems.length}</div>
                          <div className="text-[9px]">Low</div>
                        </div>
                        <div className="p-1 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                          <div>{adequateItems.length}</div>
                          <div className="text-[9px]">Adequate</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (an.name.includes('C 311') || an.name.includes('C311')) {
                        setEquipFilter('Cobas C311');
                      } else if (an.name.includes('e411') || an.name.includes('E411')) {
                        setEquipFilter('Cobas e411');
                      } else if (an.name.includes('VITEK')) {
                        setEquipFilter('VITEK');
                      } else if (an.name.includes('Mispa')) {
                        setEquipFilter('Mispa');
                      } else if (an.name.includes('BS-430')) {
                        setEquipFilter('BS-430');
                      } else if (an.name.includes('Bc-780')) {
                        setEquipFilter('Bc-780');
                      } else if (an.name.includes('XN-330')) {
                        setEquipFilter('Sysmex');
                      } else {
                        setSearchQuery(an.name);
                      }
                      setStorageUnitFilter('all');
                      setActiveTab('inventory');
                    }}
                    className="w-full py-1.5 text-center text-xs font-semibold text-[#1B669E] bg-blue-50/70 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200"
                  >
                    Filter Associated Reagents ({matchedItems.length}) →
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TAB 3: LABORATORY COLD CHAIN & STORAGE UNITS ── */}
      {activeTab === 'cold_chain' && (
        <div className="space-y-4">
          {/* Header */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-bold text-[#1B669E] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  MoH Rwanda • ISO 15189 Cold Chain Standard
                </span>
              </div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Refrigerator className="text-[#1B669E]" size={18} />
                Laboratory Cold Chain &amp; Storage Units
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time monitoring of refrigerators (2°C–8°C), room temperature cabinets (20°C–25°C), and ultra-low freezers.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setIsStorageModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#1B669E] hover:bg-[#155280] rounded-lg transition-colors shadow-xs"
              >
                <Plus size={14} /> Add Storage Unit
              </button>
            </div>
          </div>

          {/* Quick Category Filter Bar */}
          <div className="bg-white p-2 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setStorageTabType('all')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${storageTabType === 'all'
                    ? 'bg-[#1B669E] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
              >
                All Storage Units ({storageUnits.length})
              </button>
              <button
                onClick={() => setStorageTabType('fridge')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${storageTabType === 'fridge'
                    ? 'bg-[#1B669E] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
              >
                <Refrigerator size={13} />
                <span>Refrigerators 2°C–8°C ({storageUnits.filter(u => u.type === 'fridge').length})</span>
              </button>
              <button
                onClick={() => setStorageTabType('room_temp')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${storageTabType === 'room_temp'
                    ? 'bg-[#1B669E] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
              >
                <Thermometer size={13} />
                <span>Room Temp 20°C–25°C ({storageUnits.filter(u => u.type === 'room_temp').length})</span>
              </button>
              <button
                onClick={() => setStorageTabType('freezer')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${storageTabType === 'freezer'
                    ? 'bg-[#1B669E] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
              >
                <Snowflake size={13} />
                <span>Deep Freezers ({storageUnits.filter(u => u.type === 'freezer').length})</span>
              </button>
            </div>

            <span className="text-[11px] text-slate-400 font-medium px-2 hidden sm:inline">
              ISO Daily AM/PM Verification Active
            </span>
          </div>

          {/* Grid of Storage Units */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStorageUnits.map((unit) => {
              const unitReagents = inventory.filter(i => i.storage_unit_id === unit.id);
              const depletedItems = unitReagents.filter(i => (Number(i.quantity_in_hand) || 0) <= 0);
              const lowItems = unitReagents.filter(i => {
                const q = Number(i.quantity_in_hand) || 0;
                const m = Number(i.min_threshold) || 0;
                return q > 0 && q <= m;
              });
              const adequateItems = unitReagents.filter(i => {
                const q = Number(i.quantity_in_hand) || 0;
                const m = Number(i.min_threshold) || 0;
                return q > m;
              });

              const isFridge = unit.type === 'fridge';
              const isFreezer = unit.type === 'freezer';

              return (
                <div key={unit.id} className="bg-white p-5 rounded-xl border border-slate-200 space-y-3.5 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className={`p-2.5 rounded-lg ${isFridge ? 'bg-sky-50 text-sky-700' :
                            isFreezer ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                          {isFridge ? <Refrigerator size={18} /> :
                            isFreezer ? <Snowflake size={18} /> : <Thermometer size={18} />}
                        </div>
                        <div>
                          <h3 className="font-bold text-xs text-slate-900 leading-tight">{unit.label}</h3>
                          <span className="text-[10px] text-slate-400 font-mono block mt-0.5">ID: {unit.id}</span>
                        </div>
                      </div>

                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Operational
                      </span>
                    </div>

                    {/* Temperature Range & Verification Tag */}
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Target Range:</span>
                        <span className="font-bold text-slate-900 font-mono">{unit.temp_range || (isFridge ? '2°C to 8°C' : '20°C to 25°C')}</span>
                      </div>
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-500">Storage Class:</span>
                        <span className={`font-semibold ${isFridge ? 'text-sky-700' : isFreezer ? 'text-indigo-700' : 'text-amber-700'
                          }`}>
                          {isFridge ? 'Cold Chain Reagent Unit' : isFreezer ? 'Deep Freeze Storage' : 'Ambient Storage Shelf'}
                        </span>
                      </div>
                    </div>

                    {/* Inventory inside this storage unit */}
                    <div className="p-2.5 rounded-lg border border-slate-100 bg-white space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-600 font-medium">Stored In-Hand Items:</span>
                        <span className="font-bold text-slate-900">{unitReagents.length} items</span>
                      </div>

                      <div className="grid grid-cols-3 gap-1 pt-1 text-center text-[10px]">
                        <div className={`p-1 rounded ${depletedItems.length > 0 ? 'bg-rose-50 text-rose-700 font-bold border border-rose-200' : 'bg-slate-50 text-slate-500'}`}>
                          <div>{depletedItems.length}</div>
                          <div className="text-[9px]">Stockout</div>
                        </div>
                        <div className={`p-1 rounded ${lowItems.length > 0 ? 'bg-amber-50 text-amber-700 font-bold border border-amber-200' : 'bg-slate-50 text-slate-500'}`}>
                          <div>{lowItems.length}</div>
                          <div className="text-[9px]">Low</div>
                        </div>
                        <div className="p-1 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                          <div>{adequateItems.length}</div>
                          <div className="text-[9px]">Adequate</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action to view reagents */}
                  <div className="pt-2 border-t border-slate-100">
                    <button
                      onClick={() => {
                        setStorageUnitFilter(unit.id);
                        setEquipFilter('all');
                        setSearchQuery('');
                        setActiveTab('inventory');
                      }}
                      className="w-full py-1.5 text-center text-xs font-semibold text-[#1B669E] bg-blue-50/70 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200"
                    >
                      View Stored Reagents ({unitReagents.length}) →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TAB 4: LABORATORY UNIT REQUISITIONS & RESTOCK ── */}
      {activeTab === 'requisitions' && (
        <div className="space-y-4">
          <LabRequisitionHub embedded={true} />
        </div>
      )}

      {/* ── MODAL: Add / Edit Reagent (No Expiry Date, No Lot Number) ── */}
      {isAddEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-xl overflow-hidden my-8">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/60">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Package className="text-[#1B669E]" size={16} />
                {editingItem ? `Edit Reagent: ${editingItem.item_name}` : 'Register In-Hand Reagent'}
              </h3>
              <button
                onClick={() => setIsAddEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Reagent / Item Name *</label>
                <input
                  type="text"
                  required
                  value={itemForm.item_name}
                  onChange={(e) => setItemForm({ ...itemForm, item_name: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1B669E] focus:border-[#1B669E] text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Category</label>
                  <select
                    value={itemForm.category}
                    onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1B669E] focus:border-[#1B669E] text-slate-800"
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
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1B669E] focus:border-[#1B669E] text-slate-800"
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
                  <select
                    value={itemForm.equipment_group}
                    onChange={(e) => setItemForm({ ...itemForm, equipment_group: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1B669E] focus:border-[#1B669E] text-slate-800"
                  >
                    {EQUIPMENT_GROUP_OPTIONS.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Storage Temperature</label>
                  <select
                    value={itemForm.storage_temp}
                    onChange={(e) => setItemForm({ ...itemForm, storage_temp: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1B669E] focus:border-[#1B669E] text-slate-800"
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
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1B669E] focus:border-[#1B669E] text-slate-800"
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
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1B669E] focus:border-[#1B669E] text-slate-800"
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
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1B669E] focus:border-[#1B669E] font-bold text-slate-800"
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
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1B669E] focus:border-[#1B669E] font-bold text-slate-800"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddEditModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingItem}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#1B669E] hover:bg-[#155280] rounded-lg transition-colors shadow-xs disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/60">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Package className="text-[#1B669E]" size={16} />
                Adjust Stock: {adjustingItem.item_name}
              </h3>
              <button
                onClick={() => setIsAdjustModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleApplyAdjustment} className="p-6 space-y-4">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs flex justify-between items-center">
                <span className="text-slate-500 font-medium">Current Stock on Hand:</span>
                <span className="font-bold text-slate-900 text-sm font-mono">
                  {adjustingItem.quantity_in_hand} {adjustingItem.unit_of_measure}
                </span>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Adjustment Action</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustForm({ ...adjustForm, change_type: 'deduct' })}
                    className={`py-2 text-xs font-semibold rounded-lg border transition-colors ${adjustForm.change_type === 'deduct'
                        ? 'bg-rose-50 border-rose-300 text-rose-700'
                        : 'bg-white border-slate-200 text-slate-600'
                      }`}
                  >
                    - Deduct / Consume
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustForm({ ...adjustForm, change_type: 'add' })}
                    className={`py-2 text-xs font-semibold rounded-lg border transition-colors ${adjustForm.change_type === 'add'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
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
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1B669E] focus:border-[#1B669E] font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Reason / Purpose</label>
                <select
                  value={adjustForm.reason}
                  onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1B669E] focus:border-[#1B669E] text-slate-800"
                >
                  <option value="Daily Routine Run">Daily Routine Patient Run</option>
                  <option value="QC & Calibration Consumption">Quality Control (QC) &amp; Calibration</option>
                  <option value="Received Shipment from Central Store">Received Shipment from Central Store</option>
                  <option value="Spill / Wastage / Damaged Reagent">Spill / Wastage / Damaged Reagent</option>
                  <option value="Inventory Reconciliation Audit">Inventory Reconciliation Audit</option>
                </select>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjustingStock}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#1B669E] hover:bg-[#155280] rounded-lg transition-colors shadow-xs disabled:opacity-50"
                >
                  {adjustingStock ? 'Applying...' : 'Apply Change'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Add Storage Unit ── */}
      {isStorageModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/60">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Refrigerator className="text-[#1B669E]" size={16} />
                Register Storage Unit
              </h3>
              <button
                onClick={() => setIsStorageModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveStorageUnit} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Unit ID (Code) *</label>
                <input
                  type="text"
                  required
                  value={storageForm.id}
                  onChange={(e) => setStorageForm({ ...storageForm, id: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1B669E] focus:border-[#1B669E] font-mono text-slate-800"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Unit Label / Display Name *</label>
                <input
                  type="text"
                  required
                  value={storageForm.label}
                  onChange={(e) => setStorageForm({ ...storageForm, label: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1B669E] focus:border-[#1B669E] text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Unit Type</label>
                  <select
                    value={storageForm.type}
                    onChange={(e) => {
                      const type = e.target.value;
                      const temp_range = type === 'fridge' ? '2°C to 8°C' : type === 'freezer' ? '-20°C to -80°C' : '20°C to 25°C';
                      setStorageForm({ ...storageForm, type, temp_range });
                    }}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1B669E] focus:border-[#1B669E] text-slate-800"
                  >
                    <option value="fridge">Refrigerated (2°C to 8°C)</option>
                    <option value="room_temp">Room Temp (20°C to 25°C)</option>
                    <option value="freezer">Deep Freezer (-20°C / -80°C)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Temperature Range</label>
                  <input
                    type="text"
                    value={storageForm.temp_range}
                    onChange={(e) => setStorageForm({ ...storageForm, temp_range: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1B669E] focus:border-[#1B669E] text-slate-800"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsStorageModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingUnit}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#1B669E] hover:bg-[#155280] rounded-lg transition-colors shadow-xs disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-2xl overflow-hidden my-8">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/60">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <ClipboardList className="text-[#1B669E]" size={16} />
                Create Laboratory Requisition
              </h3>
              <button
                onClick={() => setIsReqModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X size={16} />
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
                    className="w-full px-3 py-2 text-xs bg-slate-100 border border-slate-200 rounded-lg text-slate-600 font-semibold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Priority / Urgency</label>
                  <select
                    value={reqForm.urgency}
                    onChange={(e) => setReqForm({ ...reqForm, urgency: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1B669E] focus:border-[#1B669E] text-slate-800"
                  >
                    <option value="Low">Low (Buffer Stock)</option>
                    <option value="Medium">Medium (Routine Replenishment)</option>
                    <option value="High">High (Impending Stockout)</option>
                    <option value="Emergency">Emergency (Immediate Diagnostic Halt)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Order Justification</label>
                <textarea
                  rows="2"
                  value={reqForm.notes}
                  onChange={(e) => setReqForm({ ...reqForm, notes: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1B669E] focus:border-[#1B669E] text-slate-800"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">Requested Items &amp; Quantities</label>
                  <button
                    type="button"
                    onClick={handleAddReqItem}
                    className="text-xs font-semibold text-[#1B669E] hover:underline"
                  >
                    + Add Item Line
                  </button>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {reqForm.items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                      <input
                        type="text"
                        value={item.item_name}
                        onChange={(e) => handleReqItemChange(idx, 'item_name', e.target.value)}
                        className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#1B669E]"
                      />
                      <input
                        type="number"
                        min="1"
                        value={item.quantity_requested}
                        onChange={(e) => handleReqItemChange(idx, 'quantity_requested', Number(e.target.value))}
                        className="w-16 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold focus:outline-none focus:border-[#1B669E]"
                      />
                      <select
                        value={item.unit}
                        onChange={(e) => handleReqItemChange(idx, 'unit', e.target.value)}
                        className="w-24 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#1B669E]"
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

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsReqModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReq}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#1B669E] hover:bg-[#155280] rounded-lg transition-colors shadow-xs disabled:opacity-50"
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
