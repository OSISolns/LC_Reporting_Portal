import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Package, AlertTriangle, Search, Plus, RefreshCw,
  ClipboardList, Cpu, Download, Edit3,
  Trash2, Box, Refrigerator,
  Snowflake, Thermometer, X, Database, Send, CheckCircle2, ArrowRight,
  Building2, FlaskConical, Check, Minus, ShieldCheck, Sparkles, Info,
  Calendar, Filter, ChevronRight, ChevronLeft
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  getInhandInventory, createInhandInventory, updateInhandInventory,
  deleteInhandInventory, getStorageUnits, saveStorageUnit,
  getAnalyzers, getLabRequisitions, createLabRequisition,
  getGeneralStockLabItems, createUnitRequisition
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

const REQ_JUSTIFICATION_PRESETS = [
  'Routine Weekly Restock',
  'High Patient Testing Volume',
  'Impending Buffer Stockout',
  'Analyzer Calibration Run',
  'Emergency STAT Replacement',
  'Quality Control Validation'
];

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

  // Active Tab: 'inventory' | 'analyzers' | 'cold_chain' | 'requisitions' | 'general_stock'
  const [activeTab, setActiveTab] = useState('inventory');

  // General Stock Lab Items (Avail Central Store items specifically belonging to Laboratory)
  const [generalStockItems, setGeneralStockItems] = useState([]);
  const [loadingGeneralStock, setLoadingGeneralStock] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [equipFilter, setEquipFilter] = useState('all');
  const [storageUnitFilter, setStorageUnitFilter] = useState('all');
  const [tempFilter, setTempFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockStatusFilter, setStockStatusFilter] = useState('all'); // 'all' | 'low' | 'depleted' | 'good'
  const [inventoryPage, setInventoryPage] = useState(1);
  const inventoryItemsPerPage = 25;

  // Cold Chain Tab Filter: 'all' | 'fridge' | 'room_temp' | 'freezer'
  const [storageTabType, setStorageTabType] = useState('all');
  const [storageSearch, setStorageSearch] = useState('');

  // Analyzers Tab Filters
  const [analyzerSearch, setAnalyzerSearch] = useState('');
  const [analyzerBenchFilter, setAnalyzerBenchFilter] = useState('all');
  const [analyzerStatusFilter, setAnalyzerStatusFilter] = useState('all');

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
    stock_source: 'general_stock',
    requesting_unit: 'General Laboratory',
    items: [{ item_name: '', quantity_requested: 5, unit: 'pcs', category: 'Reagents', remarks: '', inventory_ref_id: null }]
  });

  // ── Load All Data ──────────────────────────────────────────────────────────
  const fetchAllData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const [invRes, storageRes, analyzerRes, reqRes, genStockRes] = await Promise.allSettled([
        getInhandInventory(),
        getStorageUnits(),
        getAnalyzers(),
        getLabRequisitions({ limit: 50 }),
        getGeneralStockLabItems()
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
      if (genStockRes.status === 'fulfilled' && genStockRes.value.data?.success) {
        setGeneralStockItems(genStockRes.value.data.data || []);
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

  // Reset page to 1 when filters or search change
  useEffect(() => {
    setInventoryPage(1);
  }, [searchQuery, equipFilter, storageUnitFilter, tempFilter, deptFilter, categoryFilter, stockStatusFilter]);

  // ── Paginated Inventory (25 items per page) ───────────────────────────────
  const totalInventoryPages = Math.max(1, Math.ceil(filteredInventory.length / inventoryItemsPerPage));
  const paginatedInventory = useMemo(() => {
    const startIndex = (inventoryPage - 1) * inventoryItemsPerPage;
    return filteredInventory.slice(startIndex, startIndex + inventoryItemsPerPage);
  }, [filteredInventory, inventoryPage, inventoryItemsPerPage]);

  // ── Filtered Storage Units for Tab 3 ────────────────────────────────────────
  const filteredStorageUnits = useMemo(() => {
    let list = storageUnits;
    if (storageTabType !== 'all') {
      list = list.filter(u => u.type === storageTabType);
    }
    if (storageSearch && storageSearch.trim()) {
      const q = storageSearch.toLowerCase().trim();
      list = list.filter(u =>
        (u.label || '').toLowerCase().includes(q) ||
        (u.id || '').toLowerCase().includes(q) ||
        (u.temp_range || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [storageUnits, storageTabType, storageSearch]);

  // ── Filtered General Stock Laboratory Items (Tab 5) ─────────────────────────
  const filteredGeneralStock = useMemo(() => {
    let list = generalStockItems;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(item =>
        item.name?.toLowerCase().includes(q) ||
        item.sku?.toLowerCase().includes(q) ||
        item.category?.toLowerCase().includes(q)
      );
    }
    if (categoryFilter !== 'all') {
      list = list.filter(item => item.category === categoryFilter);
    }
    return list;
  }, [generalStockItems, searchQuery, categoryFilter]);

  // ── Filtered Connected Analyzers (Tab 2) ───────────────────────────────────
  const filteredAnalyzers = useMemo(() => {
    return analyzers.filter(an => {
      const q = analyzerSearch.toLowerCase().trim();
      const matchesSearch = !q ||
        (an.name || '').toLowerCase().includes(q) ||
        (an.manufacturer || '').toLowerCase().includes(q) ||
        (an.model || '').toLowerCase().includes(q) ||
        (an.serial_number || '').toLowerCase().includes(q) ||
        (an.department || '').toLowerCase().includes(q);

      const matchesBench = analyzerBenchFilter === 'all' ||
        (an.department || '').toLowerCase() === analyzerBenchFilter.toLowerCase();

      const matchesStatus = analyzerStatusFilter === 'all' ||
        (an.status || 'operational').toLowerCase() === analyzerStatusFilter.toLowerCase();

      return matchesSearch && matchesBench && matchesStatus;
    });
  }, [analyzers, analyzerSearch, analyzerBenchFilter, analyzerStatusFilter]);

  // Overall statistics for analyzers
  const analyzerOverallStats = useMemo(() => {
    let totalAssigned = 0;
    let totalDepleted = 0;
    let totalLow = 0;
    let totalAdequate = 0;

    analyzers.forEach(an => {
      const matchedItems = getAnalyzerReagents(an, inventory);
      totalAssigned += matchedItems.length;
      matchedItems.forEach(i => {
        const q = Number(i.quantity_in_hand) || 0;
        const m = Number(i.min_threshold) || 0;
        if (q <= 0) totalDepleted++;
        else if (q <= m) totalLow++;
        else totalAdequate++;
      });
    });

    return { totalAssigned, totalDepleted, totalLow, totalAdequate };
  }, [analyzers, inventory]);

  const handleFilterReagentsForAnalyzer = (an) => {
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
  };

  const handleRequisitionForAnalyzer = (an, matchedItems) => {
    const depletedOrLow = matchedItems.filter(i => {
      const q = Number(i.quantity_in_hand) || 0;
      const m = Number(i.min_threshold) || 0;
      return q <= m;
    });

    const itemsToReq = (depletedOrLow.length > 0 ? depletedOrLow : matchedItems).slice(0, 8).map(it => ({
      item_name: it.item_name,
      quantity_requested: Math.max(1, (Number(it.min_threshold) || 5) * 2 - (Number(it.quantity_in_hand) || 0)),
      unit: it.unit_of_measure || it.unit || 'pcs',
      category: it.category || 'Reagents',
      inventory_ref_id: it.id || null,
      remarks: `Restock for analyzer ${an.name} (${an.model || ''})`
    }));

    setReqForm({
      notes: `Requisition replenishment for analyzer ${an.name} (${an.department || 'Lab'})`,
      urgency: depletedOrLow.some(i => (Number(i.quantity_in_hand) || 0) <= 0) ? 'High' : 'Medium',
      stock_source: 'general_stock',
      requesting_unit: an.department || 'General Laboratory',
      items: itemsToReq.length > 0 ? itemsToReq : [{ item_name: '', quantity_requested: 5, unit: 'pcs', category: 'Reagents', remarks: `Analyzer ${an.name}`, inventory_ref_id: null }]
    });
    setIsReqModalOpen(true);
  };

  // ── Handler: Pre-fill & open requisition for Central Store item ───────────────
  const handleRequisitionFromCentralStore = (item) => {
    const qty = item.central_store_quantity ?? item.quantity ?? 0;
    setReqForm({
      notes: `Requisition to General Stock Manager for ${item.name} (${item.sku || 'SKU N/A'})`,
      urgency: 'Medium',
      stock_source: 'general_stock',
      requesting_unit: 'General Laboratory',
      items: [{
        item_name: item.name,
        quantity_requested: 1,
        unit: item.unit_of_measure || 'pcs',
        category: item.category || 'Reagents',
        inventory_ref_id: item.id || null,
        remarks: `SKU: ${item.sku || 'N/A'}, Central Store Balance: ${qty}`
      }]
    });
    setIsReqModalOpen(true);
  };

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
      items: [
        ...prev.items,
        { item_name: '', quantity_requested: 1, unit: 'pcs', category: 'Reagents', remarks: '', inventory_ref_id: null }
      ]
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

  const handleStepQuantity = (index, delta) => {
    setReqForm(prev => {
      const items = [...prev.items];
      const current = Number(items[index].quantity_requested) || 1;
      const nextVal = Math.max(1, current + delta);
      items[index] = { ...items[index], quantity_requested: nextVal };
      return { ...prev, items };
    });
  };

  const handleSubmitRequisition = async (e) => {
    e.preventDefault();
    const validItems = reqForm.items.filter(i => i.item_name && i.item_name.trim());
    if (validItems.length === 0) {
      toast.error('Please specify at least one reagent or consumable item to request.');
      return;
    }

    try {
      setSubmittingReq(true);
      const payload = {
        requesting_unit: reqForm.requesting_unit || 'General Laboratory',
        urgency: reqForm.urgency || 'Medium',
        notes: reqForm.notes || 'Routine Laboratory Reagent & Consumable Replenishment',
        stock_source: reqForm.stock_source || 'general_stock',
        items: validItems.map(it => ({
          item_name: it.item_name.trim(),
          item_category: it.category || 'Reagents',
          unit_of_measure: it.unit || 'pcs',
          requested_quantity: Math.max(1, Number(it.quantity_requested) || 1),
          inventory_ref_id: it.inventory_ref_id || null,
          notes: it.remarks || null
        }))
      };

      const res = await createUnitRequisition(payload);
      if (res.data?.success) {
        const refNo = res.data.ref_number || '';
        toast.success(
          reqForm.stock_source === 'general_stock'
            ? `Requisition ${refNo} forwarded directly to General Stock Manager!`
            : `Laboratory internal requisition ${refNo} created!`
        );
        setIsReqModalOpen(false);
        setReqForm({
          notes: '',
          urgency: 'Medium',
          stock_source: 'general_stock',
          requesting_unit: 'General Laboratory',
          items: [{ item_name: '', quantity_requested: 5, unit: 'pcs', category: 'Reagents', remarks: '', inventory_ref_id: null }]
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

      {/* ── Institutional Header with Personalized Greetings ── */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              Laboratory Diagnostics Hub
            </span>
            <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Duty: Lab Stock Manager
            </span>
            <span className="text-[11px] font-mono font-bold text-amber-900 bg-amber-50 px-2.5 py-0.5 rounded border border-amber-300 flex items-center gap-1.5 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
              Control No: LEG/PATHLAB/MSD/FM-12-VERS-004
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            {new Date().getHours() < 12 ? 'Good Morning' : new Date().getHours() < 17 ? 'Good Afternoon' : 'Good Evening'}, {user?.fullName?.split(' ')[0] || user?.fullName || 'Colleague'} 👋
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Welcome to Laboratory Stock &amp; In-Hand Inventory, Connected Analyzers &amp; Cold Chain Management
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

          <button
            onClick={() => setActiveTab('general_stock')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 ${activeTab === 'general_stock'
              ? 'bg-[#1B669E] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
          >
            <Database size={14} />
            <span>General Stock Lab Items ({filteredGeneralStock.length})</span>
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
                    {paginatedInventory.map((item) => {
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

            {/* Pagination Controls Bar */}
            {filteredInventory.length > 0 && (
              <div className="bg-slate-50/90 border-t border-slate-200 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="text-slate-500 font-medium">
                  Showing <span className="font-bold text-slate-800">
                    {Math.min(filteredInventory.length, (inventoryPage - 1) * inventoryItemsPerPage + 1)}
                  </span> to <span className="font-bold text-slate-800">
                    {Math.min(filteredInventory.length, inventoryPage * inventoryItemsPerPage)}
                  </span> of <span className="font-bold text-slate-800">{filteredInventory.length}</span> reagents (25 per page)
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setInventoryPage(p => Math.max(1, p - 1))}
                    disabled={inventoryPage <= 1}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-xs shadow-2xs transition-colors"
                  >
                    <ChevronLeft size={14} /> Previous
                  </button>

                  <div className="flex items-center gap-1 px-2">
                    {Array.from({ length: totalInventoryPages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === totalInventoryPages || Math.abs(p - inventoryPage) <= 1)
                      .reduce((acc, p, idx, arr) => {
                        if (idx > 0 && p - arr[idx - 1] > 1) {
                          acc.push('ellipsis-' + p);
                        }
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((item) => {
                        if (typeof item === 'string') {
                          return (
                            <span key={item} className="px-1 text-slate-400 font-bold">…</span>
                          );
                        }
                        const isCurrent = item === inventoryPage;
                        return (
                          <button
                            key={item}
                            onClick={() => setInventoryPage(item)}
                            className={`min-w-[28px] h-7 rounded-lg text-xs font-bold transition-colors ${
                              isCurrent
                                ? 'bg-[#1B669E] text-white shadow-xs'
                                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {item}
                          </button>
                        );
                      })}
                  </div>

                  <button
                    onClick={() => setInventoryPage(p => Math.min(totalInventoryPages, p + 1))}
                    disabled={inventoryPage >= totalInventoryPages}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-xs shadow-2xs transition-colors"
                  >
                    Next <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: CONNECTED LABORATORY ANALYZERS & CONSUMABLES ── */}
      {activeTab === 'analyzers' && (
        <div className="space-y-4">
          {/* Header Card with Metrics & Control Badge */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-[11px] font-bold text-[#1B669E] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  MoH Rwanda • ISO 15189 Pathology Analyzer Registry
                </span>
                <span className="text-[10px] font-mono font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-300">
                  Control No: LEG/PATHLAB/MSD/FM-12-VERS-004
                </span>
              </div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Cpu className="text-[#1B669E]" size={18} />
                Connected Laboratory Analyzers &amp; Consumables
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time analyzer status, calibration schedules, and linked reagent inventory health.
              </p>
            </div>

            {/* Quick KPI Strip */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-center">
                <div className="text-[10px] text-slate-500 font-semibold uppercase">Total Analyzers</div>
                <div className="text-xs font-bold text-slate-800">{analyzers.length} Active</div>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-center">
                <div className="text-[10px] text-emerald-700 font-semibold uppercase">Operational</div>
                <div className="text-xs font-bold text-emerald-800">
                  {analyzers.filter(a => (a.status || 'operational').toLowerCase() === 'operational').length} Online
                </div>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-center">
                <div className="text-[10px] text-[#1B669E] font-semibold uppercase">Linked Reagents</div>
                <div className="text-xs font-bold text-[#1B669E]">{analyzerOverallStats.totalAssigned} items</div>
              </div>
              {analyzerOverallStats.totalDepleted > 0 && (
                <div className="px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-center">
                  <div className="text-[10px] text-rose-700 font-semibold uppercase">Stockout Alerts</div>
                  <div className="text-xs font-bold text-rose-800">{analyzerOverallStats.totalDepleted} Reagents</div>
                </div>
              )}
            </div>
          </div>

          {/* Search & Bench Filter Bar */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search analyzer name, model, serial #..."
                  value={analyzerSearch}
                  onChange={(e) => setAnalyzerSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1B669E] focus:border-[#1B669E] text-slate-800"
                />
              </div>

              {/* Bench Filter */}
              <select
                value={analyzerBenchFilter}
                onChange={(e) => setAnalyzerBenchFilter(e.target.value)}
                className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1B669E] text-slate-700 font-medium"
              >
                <option value="all">All Benches</option>
                {LAB_DISCIPLINES.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={analyzerStatusFilter}
                onChange={(e) => setAnalyzerStatusFilter(e.target.value)}
                className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1B669E] text-slate-700 font-medium"
              >
                <option value="all">All Statuses</option>
                <option value="operational">Operational</option>
                <option value="maintenance due">Maintenance Due</option>
                <option value="under maintenance">Under Maintenance</option>
                <option value="out of service">Out of Service</option>
              </select>
            </div>

            {(analyzerSearch || analyzerBenchFilter !== 'all' || analyzerStatusFilter !== 'all') && (
              <button
                onClick={() => {
                  setAnalyzerSearch('');
                  setAnalyzerBenchFilter('all');
                  setAnalyzerStatusFilter('all');
                }}
                className="text-xs text-[#1B669E] hover:underline font-semibold"
              >
                Reset Filters
              </button>
            )}
          </div>

          {/* Analyzers Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Analyzer &amp; Model</th>
                    <th className="py-3 px-4">Bench / Dept</th>
                    <th className="py-3 px-4">Serial Number</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Next Calibration</th>
                    <th className="py-3 px-4 text-center">Linked Reagents</th>
                    <th className="py-3 px-4">Stock Health Breakdown</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-normal">
                  {filteredAnalyzers.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="py-12 text-center text-slate-400">
                        <Cpu className="mx-auto mb-2 text-slate-300" size={32} />
                        <p className="font-semibold text-slate-600">No laboratory analyzers found</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Try adjusting your search query or bench filter.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredAnalyzers.map((an) => {
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

                      const statusColor = (an.status || 'operational').toLowerCase() === 'operational'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200';

                      return (
                        <tr key={an.id} className="hover:bg-slate-50/70 transition-colors">
                          {/* Analyzer Name & Model */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="p-2 rounded-lg bg-blue-50 text-[#1B669E] shrink-0 border border-blue-100">
                                <Cpu size={16} />
                              </div>
                              <div>
                                <div className="font-bold text-slate-900 text-xs">{an.name}</div>
                                <div className="text-[11px] text-slate-500 font-medium">
                                  {an.manufacturer || 'Manufacturer N/A'} • {an.model || 'Model N/A'}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Bench / Dept */}
                          <td className="py-3 px-4">
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-[#1B669E] border border-sky-200">
                              {an.department || 'Biochemistry'}
                            </span>
                          </td>

                          {/* Serial Number */}
                          <td className="py-3 px-4">
                            <span className="font-mono text-[11px] text-slate-600 font-semibold bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              {an.serial_number || 'N/A'}
                            </span>
                          </td>

                          {/* Operational Status */}
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusColor}`}>
                              <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                              {an.status || 'Operational'}
                            </span>
                          </td>

                          {/* Calibration Due */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5 text-slate-600 text-[11px] font-medium">
                              <Calendar size={13} className="text-slate-400 shrink-0" />
                              <span>{an.next_calibration_due || 'On Schedule'}</span>
                            </div>
                          </td>

                          {/* Linked Reagents Count */}
                          <td className="py-3 px-4 text-center">
                            <span className="font-bold text-slate-800 text-xs bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200">
                              {matchedItems.length}
                            </span>
                          </td>

                          {/* Stock Health Breakdown */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                  depletedItems.length > 0
                                    ? 'bg-rose-50 text-rose-700 border-rose-200 font-bold'
                                    : 'bg-slate-50 text-slate-400 border-slate-200'
                                }`}
                                title="Depleted reagents (Stockout)"
                              >
                                {depletedItems.length} Stockout
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                  lowItems.length > 0
                                    ? 'bg-amber-50 text-amber-700 border-amber-200 font-bold'
                                    : 'bg-slate-50 text-slate-400 border-slate-200'
                                }`}
                                title="Low stock reagents"
                              >
                                {lowItems.length} Low
                              </span>
                              <span
                                className="px-2 py-0.5 rounded text-[10px] font-bold border bg-emerald-50 text-emerald-700 border-emerald-200"
                                title="Adequate stock reagents"
                              >
                                {adequateItems.length} Adequate
                              </span>
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleFilterReagentsForAnalyzer(an)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-[#1B669E] hover:bg-blue-100 border border-blue-200 transition-colors shadow-2xs"
                                title="Filter in-hand reagents for this analyzer"
                              >
                                <FlaskConical size={12} />
                                View Reagents ({matchedItems.length})
                              </button>

                              {(depletedItems.length > 0 || lowItems.length > 0) && (
                                <button
                                  onClick={() => handleRequisitionForAnalyzer(an, matchedItems)}
                                  className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-300 transition-colors shadow-2xs"
                                  title="Quick requisition to replenish low/depleted reagents"
                                >
                                  <ClipboardList size={12} />
                                  Restock
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer Status */}
            <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
              <span>
                Showing <strong>{filteredAnalyzers.length}</strong> of <strong>{analyzers.length}</strong> connected laboratory analyzers
              </span>
              <span className="text-[10px] font-mono font-semibold text-slate-400">
                MoH Rwanda Laboratory Quality Management System (ISO 15189:2022)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: LABORATORY COLD CHAIN & STORAGE UNITS ── */}
      {activeTab === 'cold_chain' && (
        <div className="space-y-4">
          {/* Header Card with Metrics & Control Badge */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-[11px] font-bold text-[#1B669E] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  MoH Rwanda • ISO 15189 Cold Chain Standard
                </span>
                <span className="text-[10px] font-mono font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-300">
                  Control No: LEG/PATHLAB/MSD/FM-12-VERS-004
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

          {/* Quick Category Filter Bar & Search */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-1.5 flex-wrap w-full md:w-auto">
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

            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter storage units..."
                  value={storageSearch}
                  onChange={(e) => setStorageSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1B669E] focus:border-[#1B669E] text-slate-800"
                />
              </div>
              <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap hidden lg:inline">
                ISO Daily AM/PM Verification Active
              </span>
            </div>
          </div>

          {/* Table of Storage Units */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Storage Unit &amp; ID</th>
                    <th className="py-3 px-4">Storage Class &amp; Type</th>
                    <th className="py-3 px-4">Target Temp Range</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-center">Stored Reagents</th>
                    <th className="py-3 px-4">Stock Health Breakdown</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-normal">
                  {filteredStorageUnits.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-12 text-center text-slate-400">
                        <Refrigerator className="mx-auto mb-2 text-slate-300" size={32} />
                        <p className="font-semibold text-slate-600">No laboratory storage units found</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Try adjusting your filter selection or search query.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredStorageUnits.map((unit) => {
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

                      const typeColor = isFridge
                        ? 'bg-sky-50 text-sky-800 border-sky-200'
                        : isFreezer
                        ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200';

                      const typeLabel = isFridge
                        ? 'Cold Chain (2°C–8°C)'
                        : isFreezer
                        ? 'Deep Freeze (-20°C/-80°C)'
                        : 'Ambient (20°C–25°C)';

                      return (
                        <tr key={unit.id} className="hover:bg-slate-50/70 transition-colors">
                          {/* Unit Identifier & Name */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className={`p-2 rounded-lg shrink-0 border ${
                                isFridge
                                  ? 'bg-sky-50 text-sky-700 border-sky-100'
                                  : isFreezer
                                  ? 'bg-indigo-50 text-indigo-700 border-indigo-100'
                                  : 'bg-amber-50 text-amber-700 border-amber-100'
                              }`}>
                                {isFridge ? <Refrigerator size={16} /> : isFreezer ? <Snowflake size={16} /> : <Thermometer size={16} />}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900 text-xs">{unit.label}</div>
                                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                  ID: {unit.id}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Storage Class & Type */}
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${typeColor}`}>
                              {typeLabel}
                            </span>
                            <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                              {isFridge ? 'Cold Chain Reagent Unit' : isFreezer ? 'Deep Freeze Storage' : 'Ambient Storage Shelf'}
                            </div>
                          </td>

                          {/* Target Temp Range */}
                          <td className="py-3 px-4">
                            <div className="font-mono font-bold text-slate-800 text-xs">
                              {unit.temp_range || (isFridge ? '2°C to 8°C' : '20°C to 25°C')}
                            </div>
                            <div className="text-[10px] text-emerald-700 font-medium">
                              Daily AM/PM Log Active
                            </div>
                          </td>

                          {/* Operational Status */}
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Operational
                            </span>
                          </td>

                          {/* Stored In-Hand Items Count */}
                          <td className="py-3 px-4 text-center">
                            <span className="font-bold text-slate-800 text-xs bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200">
                              {unitReagents.length}
                            </span>
                          </td>

                          {/* Stock Health Breakdown */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                  depletedItems.length > 0
                                    ? 'bg-rose-50 text-rose-700 border-rose-200 font-bold'
                                    : 'bg-slate-50 text-slate-400 border-slate-200'
                                }`}
                                title="Depleted reagents (Stockout)"
                              >
                                {depletedItems.length} Stockout
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                  lowItems.length > 0
                                    ? 'bg-amber-50 text-amber-700 border-amber-200 font-bold'
                                    : 'bg-slate-50 text-slate-400 border-slate-200'
                                }`}
                                title="Low stock reagents"
                              >
                                {lowItems.length} Low
                              </span>
                              <span
                                className="px-2 py-0.5 rounded text-[10px] font-bold border bg-emerald-50 text-emerald-700 border-emerald-200"
                                title="Adequate stock reagents"
                              >
                                {adequateItems.length} Adequate
                              </span>
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setStorageUnitFilter(unit.id);
                                  setEquipFilter('all');
                                  setSearchQuery('');
                                  setActiveTab('inventory');
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-[#1B669E] hover:bg-blue-100 border border-blue-200 transition-colors shadow-2xs"
                                title="Filter stored reagents in this unit"
                              >
                                <FlaskConical size={12} />
                                View Reagents ({unitReagents.length})
                              </button>

                              {(depletedItems.length > 0 || lowItems.length > 0) && (
                                <button
                                  onClick={() => {
                                    const depletedOrLow = unitReagents.filter(i => {
                                      const q = Number(i.quantity_in_hand) || 0;
                                      const m = Number(i.min_threshold) || 0;
                                      return q <= m;
                                    });

                                    const itemsToReq = (depletedOrLow.length > 0 ? depletedOrLow : unitReagents).slice(0, 8).map(it => ({
                                      item_name: it.item_name,
                                      quantity_requested: Math.max(1, (Number(it.min_threshold) || 5) * 2 - (Number(it.quantity_in_hand) || 0)),
                                      unit: it.unit_of_measure || it.unit || 'pcs',
                                      category: it.category || 'Reagents',
                                      inventory_ref_id: it.id || null,
                                      remarks: `Storage restock for ${unit.label} (${unit.temp_range || ''})`
                                    }));

                                    setReqForm({
                                      notes: `Requisition to restock ${unit.label} (Storage: ${unit.temp_range || 'Cold Chain'})`,
                                      urgency: depletedOrLow.some(i => (Number(i.quantity_in_hand) || 0) <= 0) ? 'High' : 'Medium',
                                      stock_source: 'general_stock',
                                      requesting_unit: 'General Laboratory',
                                      items: itemsToReq.length > 0 ? itemsToReq : [{ item_name: '', quantity_requested: 5, unit: 'pcs', category: 'Reagents', remarks: `Unit ${unit.label}`, inventory_ref_id: null }]
                                    });
                                    setIsReqModalOpen(true);
                                  }}
                                  className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-300 transition-colors shadow-2xs"
                                  title="Quick requisition to replenish low/depleted reagents in this storage unit"
                                >
                                  <ClipboardList size={12} />
                                  Restock
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer Status */}
            <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
              <span>
                Showing <strong>{filteredStorageUnits.length}</strong> of <strong>{storageUnits.length}</strong> laboratory storage units
              </span>
              <span className="text-[10px] font-mono font-semibold text-slate-400">
                MoH Rwanda Laboratory Quality Management System (ISO 15189:2022)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 4: LABORATORY UNIT REQUISITIONS & RESTOCK ── */}
      {activeTab === 'requisitions' && (
        <div className="space-y-4">
          <LabRequisitionHub embedded={true} />
        </div>
      )}

      {/* ── TAB 5: GENERAL STOCK LABORATORY ITEMS ── */}
      {activeTab === 'general_stock' && (
        <div className="space-y-4">
          {/* Institutional Info Banner */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-800">
                <Database size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold text-slate-900">
                    Central Store Laboratory Inventory (General Stock)
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-100 text-teal-900 border border-teal-200">
                    Strictly Department: LABORATORY
                  </span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-300">
                    LEG/PATHLAB/MSD/FM-12-VERS-004
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Live stock levels held at Central Store for Laboratory consumables &amp; reagents. Laboratory Stock Manager can make direct requisitions to the General Stock Manager.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setReqForm({
                    notes: 'Requisition for General Store Laboratory Items',
                    urgency: 'Medium',
                    stock_source: 'general_stock',
                    items: [{ item_name: '', quantity_requested: 5, unit: 'pcs', remarks: '' }]
                  });
                  setIsReqModalOpen(true);
                }}
                className="px-3.5 py-2 rounded-lg bg-[#1B669E] hover:bg-[#155280] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <Send size={13} />
                <span>New Requisition to GM</span>
              </button>
            </div>
          </div>

          {/* Search & Filter Controls */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                type="text"
                placeholder="Search SKU, item name, or specs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1B669E] focus:border-[#1B669E] text-slate-800"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-[11px] text-slate-400 font-medium">
                Showing {filteredGeneralStock.length} items
              </span>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                  <tr>
                    <th className="py-3 px-4">SKU / Code</th>
                    <th className="py-3 px-4">Item Name &amp; Description</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Storage / Unit</th>
                    <th className="py-3 px-4 text-right">Central Store Qty</th>
                    <th className="py-3 px-4 text-center">Batch / Expiry</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-normal">
                  {filteredGeneralStock.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                        No Laboratory items found in General Stock matching filter.
                      </td>
                    </tr>
                  ) : (
                    filteredGeneralStock.map((item) => {
                      const qty = Number(item.central_store_quantity) || 0;
                      const hasStock = qty > 0;

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-slate-700 text-[11px]">
                            {item.sku || `ITEM-${item.id}`}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{item.name}</div>
                            {item.description && (
                              <div className="text-[11px] text-slate-500 line-clamp-1">{item.description}</div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                              {item.category || 'General'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-slate-600 font-medium">
                              {item.storage_type || 'Standard'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <span className="font-bold text-sm text-slate-900">
                                {qty}
                              </span>
                              <span className="text-[11px] text-slate-500 font-medium">
                                {item.unit_of_measure || 'units'}
                              </span>
                              <span className={`w-2 h-2 rounded-full ml-1 ${hasStock ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {item.active_batches && item.active_batches.length > 0 ? (
                              <div className="text-[11px]">
                                <span className="font-mono text-slate-700 font-semibold">{item.active_batches[0].batch_number}</span>
                                {item.active_batches[0].expiry_date && (
                                  <span className="text-slate-400 ml-1">
                                    (Exp: {item.active_batches[0].expiry_date.split('T')[0]})
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[11px]">Standard Batch</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => handleRequisitionFromCentralStore(item)}
                              className="px-2.5 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 font-semibold text-[11px] flex items-center gap-1 mx-auto transition-colors"
                              title="Create Requisition to General Stock Manager"
                            >
                              <Send size={12} />
                              <span>Requisition</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
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
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[96vh] my-1 sm:my-2 animate-in fade-in zoom-in-95 duration-150">
            {/* Pinned Header */}
            <div className="bg-gradient-to-r from-[#1B669E] via-[#145382] to-[#0f3e62] px-6 py-3.5 text-white flex items-center justify-between shadow-sm flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-inner flex-shrink-0">
                  <ClipboardList size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-base text-white tracking-tight leading-tight">
                      Create Laboratory Requisition
                    </h3>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-400/20 text-amber-200 border border-amber-400/30 backdrop-blur-md">
                      <ShieldCheck size={12} className="text-amber-300" />
                      Control No: LEG/PATHLAB/MSD/FM-12-VERS-004
                    </span>
                  </div>
                  <p className="text-xs text-sky-100/90 mt-0.5">
                    ISO 15189:2022 Pathology Diagnostic &amp; Material Management System
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsReqModalOpen(false)}
                className="text-white/70 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors"
                title="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form Body - Scrollable Middle with Fixed Bottom Actions */}
            <form onSubmit={handleSubmitRequisition} className="flex flex-col flex-1 min-h-0 overflow-hidden text-slate-800">
              
              {/* Scrollable Container for Inputs */}
              <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
                {/* Channel / Stock Source Selector */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5 uppercase tracking-wider">
                    Requisition Supply Channel
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Central Store Card */}
                    <div
                      onClick={() => setReqForm({ ...reqForm, stock_source: 'general_stock' })}
                      className={`cursor-pointer rounded-xl border p-3.5 transition-all duration-150 flex items-start gap-3.5 ${
                        reqForm.stock_source === 'general_stock'
                          ? 'border-[#1B669E] bg-sky-50/70 ring-2 ring-[#1B669E]/30 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                      }`}
                    >
                      <div className={`p-2.5 rounded-lg flex-shrink-0 ${
                        reqForm.stock_source === 'general_stock' ? 'bg-[#1B669E] text-white shadow-xs' : 'bg-slate-100 text-slate-500'
                      }`}>
                        <Building2 size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="font-bold text-xs text-slate-900">Central Store (General Stock)</span>
                          {reqForm.stock_source === 'general_stock' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#1B669E] bg-white px-2 py-0.5 rounded-full border border-sky-200 shadow-2xs">
                              <Check size={11} /> Selected
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          Hospital central warehouse items. Automatically forwarded directly to General Stock Manager for fulfillment.
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <span className="inline-block text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            {generalStockItems.length} Catalog Items Avail
                          </span>
                          <span className="text-[10px] font-semibold text-slate-500">
                            Routes: External Store
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Lab In-Hand Buffer Card */}
                    <div
                      onClick={() => setReqForm({ ...reqForm, stock_source: 'lab_stock' })}
                      className={`cursor-pointer rounded-xl border p-3.5 transition-all duration-150 flex items-start gap-3.5 ${
                        reqForm.stock_source === 'lab_stock'
                          ? 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-600/30 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                      }`}
                    >
                      <div className={`p-2.5 rounded-lg flex-shrink-0 ${
                        reqForm.stock_source === 'lab_stock' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 text-slate-500'
                      }`}>
                        <Package size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="font-bold text-xs text-slate-900">Lab In-Hand Reagent Buffer</span>
                          {reqForm.stock_source === 'lab_stock' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-white px-2 py-0.5 rounded-full border border-emerald-200 shadow-2xs">
                              <Check size={11} /> Selected
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          Internal pathology buffer allocation between laboratory benches, analyzers, cold rooms, and testing stations.
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <span className="inline-block text-[10px] font-bold text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                            {inventory.length} In-Hand Batches
                          </span>
                          <span className="text-[10px] font-semibold text-slate-500">
                            Routes: Internal Lab
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bench Destination & Urgency Priority */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/90">
                  {/* Requesting Bench / Unit */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center justify-between">
                      <span>Requesting Bench / Pathology Unit</span>
                      <span className="text-[10px] font-normal text-slate-400">Target Receiving Bench</span>
                    </label>
                    <select
                      value={reqForm.requesting_unit}
                      onChange={(e) => setReqForm({ ...reqForm, requesting_unit: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B669E]/30 focus:border-[#1B669E] font-medium text-slate-800 shadow-2xs"
                    >
                      <option value="General Laboratory">General Laboratory (Central Lab Hub)</option>
                      {LAB_DISCIPLINES.map(d => (
                        <option key={d} value={d}>{d} Department / Bench</option>
                      ))}
                    </select>
                  </div>

                  {/* Priority / Urgency Segmented Pills */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center justify-between">
                      <span>Clinical Priority Level</span>
                      <span className="text-[10px] font-normal text-slate-400">Turnaround Requirement</span>
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { val: 'Low', label: 'Low', desc: 'Buffer', color: 'hover:border-slate-300', active: 'bg-slate-100 text-slate-800 border-slate-400 ring-1 ring-slate-400 font-bold' },
                        { val: 'Medium', label: 'Medium', desc: 'Routine', color: 'hover:border-sky-300', active: 'bg-sky-50 text-[#1B669E] border-sky-400 ring-1 ring-sky-400 font-bold' },
                        { val: 'High', label: 'High', desc: 'Urgent', color: 'hover:border-amber-300', active: 'bg-amber-50 text-amber-900 border-amber-400 ring-1 ring-amber-400 font-bold' },
                        { val: 'Emergency', label: 'STAT Alert', desc: 'Critical', color: 'hover:border-rose-300', active: 'bg-rose-50 text-rose-700 border-rose-500 ring-1 ring-rose-500 font-bold' }
                      ].map(p => (
                        <button
                          key={p.val}
                          type="button"
                          onClick={() => setReqForm({ ...reqForm, urgency: p.val })}
                          className={`px-1.5 py-1.5 text-center rounded-lg border text-xs transition-all ${
                            reqForm.urgency === p.val
                              ? p.active
                              : `bg-white text-slate-600 border-slate-200 ${p.color}`
                          }`}
                        >
                          <div className="font-semibold text-[11px] leading-tight">{p.label}</div>
                          <div className="text-[9px] opacity-75">{p.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Justification & Quick Motive Chips */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 block">
                      Order Justification &amp; Clinical Motive
                    </label>
                    <span className="text-[10px] text-slate-400">Required for ISO 15189 material audit trail</span>
                  </div>
                  <textarea
                    rows="2"
                    value={reqForm.notes}
                    onChange={(e) => setReqForm({ ...reqForm, notes: e.target.value })}
                    placeholder="State justification (e.g. routine bench replenishment, analyzer volume surge, impending buffer stockout)..."
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B669E]/30 focus:border-[#1B669E] text-slate-800 placeholder-slate-400 shadow-2xs"
                  />
                  
                  {/* 1-Click Justification Presets */}
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-1">
                      <Sparkles size={11} className="text-amber-500" /> Quick Motive:
                    </span>
                    {REQ_JUSTIFICATION_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          const current = reqForm.notes.trim();
                          if (!current) {
                            setReqForm({ ...reqForm, notes: preset });
                          } else if (!current.includes(preset)) {
                            setReqForm({ ...reqForm, notes: `${current}; ${preset}` });
                          }
                        }}
                        className="text-[10px] font-medium bg-slate-100 hover:bg-sky-50 hover:text-[#1B669E] hover:border-sky-300 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200 transition-colors"
                      >
                        + {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Items Line Builder */}
                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Requested Items &amp; Quantities
                      </label>
                      <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        {reqForm.items.length} item{reqForm.items.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddReqItem}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1B669E] bg-sky-50 hover:bg-sky-100 px-3 py-1.5 rounded-lg border border-sky-200 transition-colors shadow-2xs"
                    >
                      <Plus size={14} /> Add Item Line
                    </button>
                  </div>

                  {/* Datalist for fast item suggestions */}
                  <datalist id="generalStockLabList">
                    {generalStockItems.map(it => {
                      const qty = it.central_store_quantity ?? it.quantity ?? 0;
                      return (
                        <option key={it.id} value={it.name}>
                          {it.sku ? `[${it.sku}] ` : ''}(Central Store Bal: {qty} {it.unit_of_measure})
                        </option>
                      );
                    })}
                  </datalist>

                  <datalist id="inhandLabList">
                    {inventory.map(it => (
                      <option key={it.id} value={it.item_name}>
                        ({it.department} · In-Hand: {it.quantity_in_hand} {it.unit})
                      </option>
                    ))}
                  </datalist>

                  {/* Items Line List */}
                  <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                    {reqForm.items.map((item, idx) => {
                      // Match item in catalog to show real-time stock
                      const matchedGen = generalStockItems.find(
                        g => g.name.toLowerCase() === (item.item_name || '').toLowerCase()
                      );
                      const matchedGenQty = matchedGen ? (matchedGen.central_store_quantity ?? matchedGen.quantity ?? 0) : null;
                      const matchedInv = inventory.find(
                        inv => (inv.item_name || '').toLowerCase() === (item.item_name || '').toLowerCase()
                      );

                      return (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-slate-50/90 border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-mono font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
                              Line #{idx + 1}
                            </span>

                            {/* Live Balance Indicator Badge */}
                            {reqForm.stock_source === 'general_stock' && matchedGen && (
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                (Number(matchedGenQty) || 0) > 0
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                  : 'bg-rose-50 text-rose-700 border-rose-300'
                              }`}>
                                Central Store Balance: {matchedGenQty} {matchedGen.unit_of_measure || 'pcs'}
                                {(Number(matchedGenQty) || 0) <= 0 ? ' (Stockout)' : ''}
                              </span>
                            )}

                            {reqForm.stock_source === 'lab_stock' && matchedInv && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-indigo-50 text-indigo-800 border-indigo-200">
                                Lab In-Hand: {matchedInv.quantity_in_hand} {matchedInv.unit} ({matchedInv.department || 'Lab'})
                              </span>
                            )}

                            {reqForm.items.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveReqItem(idx)}
                                className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1 rounded-md transition-colors"
                                title="Delete line"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>

                          {/* Line inputs grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
                            {/* Item Name / Catalog Select */}
                            <div className="sm:col-span-5">
                              <input
                                type="text"
                                list={reqForm.stock_source === 'general_stock' ? 'generalStockLabList' : 'inhandLabList'}
                                placeholder={
                                  reqForm.stock_source === 'general_stock'
                                    ? 'Type or select Lab item name from Central Store...'
                                    : 'Type or select reagent name...'
                                }
                                value={item.item_name}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  handleReqItemChange(idx, 'item_name', val);

                                  if (reqForm.stock_source === 'general_stock') {
                                    const matched = generalStockItems.find(g => g.name.toLowerCase() === val.toLowerCase());
                                    if (matched) {
                                      if (matched.unit_of_measure) handleReqItemChange(idx, 'unit', matched.unit_of_measure);
                                      if (matched.category) handleReqItemChange(idx, 'category', matched.category);
                                      if (matched.id) handleReqItemChange(idx, 'inventory_ref_id', matched.id);
                                      if (!item.remarks) {
                                        const stockQty = matched.central_store_quantity ?? matched.quantity ?? 0;
                                        handleReqItemChange(idx, 'remarks', `SKU: ${matched.sku || 'N/A'}, Central Store Bal: ${stockQty}`);
                                      }
                                    }
                                  } else {
                                    const matched = inventory.find(inv => (inv.item_name || '').toLowerCase() === val.toLowerCase());
                                    if (matched) {
                                      if (matched.unit) handleReqItemChange(idx, 'unit', matched.unit);
                                      if (matched.category) handleReqItemChange(idx, 'category', matched.category);
                                      if (matched.id) handleReqItemChange(idx, 'inventory_ref_id', matched.id);
                                    }
                                  }
                                }}
                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#1B669E]/30 focus:border-[#1B669E] shadow-2xs"
                              />
                            </div>

                            {/* Category */}
                            <div className="sm:col-span-3">
                              <select
                                value={item.category || 'Reagents'}
                                onChange={(e) => handleReqItemChange(idx, 'category', e.target.value)}
                                className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#1B669E]/30 focus:border-[#1B669E] shadow-2xs"
                              >
                                {REAGENT_CATEGORIES.map(c => (
                                  <option key={c} value={c}>{c}</option>
                                ))}
                              </select>
                            </div>

                            {/* Quantity Stepper */}
                            <div className="sm:col-span-2">
                              <div className="flex items-center rounded-lg border border-slate-300 bg-white overflow-hidden shadow-2xs">
                                <button
                                  type="button"
                                  onClick={() => handleStepQuantity(idx, -1)}
                                  className="px-2 py-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                                  title="Decrease"
                                >
                                  <Minus size={12} />
                                </button>
                                <input
                                  type="number"
                                  min="1"
                                  value={item.quantity_requested}
                                  onChange={(e) => handleReqItemChange(idx, 'quantity_requested', Math.max(1, Number(e.target.value) || 1))}
                                  className="w-full text-center py-1.5 font-bold text-xs text-slate-900 focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleStepQuantity(idx, 1)}
                                  className="px-2 py-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                                  title="Increase"
                                >
                                  <Plus size={12} />
                                </button>
                              </div>
                            </div>

                            {/* Unit of Measure */}
                            <div className="sm:col-span-2">
                              <select
                                value={item.unit}
                                onChange={(e) => handleReqItemChange(idx, 'unit', e.target.value)}
                                className="w-full px-2 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#1B669E]/30 focus:border-[#1B669E] shadow-2xs"
                              >
                                {UOM_OPTIONS.map(u => (
                                  <option key={u} value={u}>{u}</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {/* Specs / Remarks row */}
                          <div>
                            <input
                              type="text"
                              placeholder="Specifications, brand preference, lot reference, or bench purpose..."
                              value={item.remarks}
                              onChange={(e) => handleReqItemChange(idx, 'remarks', e.target.value)}
                              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] text-slate-700 placeholder-slate-400 focus:outline-none focus:border-[#1B669E]"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Pinned Bottom Controls (Summary + Submit/Cancel) - ALWAYS VISIBLE */}
              <div className="flex-shrink-0 bg-slate-50 border-t border-slate-200 p-3.5 sm:p-4 space-y-2.5">
                {/* Summary Bar */}
                <div className="p-3 rounded-xl bg-white border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs shadow-2xs">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500 font-medium">Requisition Total:</span>
                      <span className="font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200 shadow-2xs">
                        {reqForm.items.filter(i => i.item_name && i.item_name.trim()).length} line(s) · {reqForm.items.reduce((acc, curr) => acc + (Number(curr.quantity_requested) || 0), 0)} units
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500 font-medium">Target Channel:</span>
                      <span className={`font-bold px-2 py-0.5 rounded border text-[11px] ${
                        reqForm.stock_source === 'general_stock'
                          ? 'bg-blue-50 text-[#1B669E] border-blue-200'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      }`}>
                        {reqForm.stock_source === 'general_stock'
                          ? 'General Stock Manager (Central Store)'
                          : 'Laboratory In-Hand Buffer (Internal)'}
                      </span>
                    </div>
                  </div>

                  <div className="text-[10px] font-mono text-slate-500 font-semibold">
                    ISO 15189 | Doc: LEG/PATHLAB/MSD/FM-12-VERS-004
                  </div>
                </div>

                {/* Form Action Footer */}
                <div className="flex items-center justify-between gap-3 pt-1">
                  <span className="text-[11px] text-slate-500 hidden sm:inline">
                    {reqForm.stock_source === 'general_stock'
                      ? 'Requisition will be placed in Forwarded state for immediate Central Store dispatch.'
                      : 'Requisition will log into the laboratory internal material registry.'}
                  </span>

                  <div className="flex items-center gap-2.5 ml-auto">
                    <button
                      type="button"
                      onClick={() => setIsReqModalOpen(false)}
                      className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors shadow-2xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingReq}
                      className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-[#1B669E] to-[#145382] hover:from-[#155280] hover:to-[#0f3e62] rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 inline-flex items-center gap-2"
                    >
                      {submittingReq ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Send size={14} />
                          Submit Laboratory Requisition
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
