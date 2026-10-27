import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ClipboardList, Package, Plus, RefreshCw, Search, X, Check,
  AlertTriangle, CheckCircle2, Clock, Droplet, Microscope,
  Activity, Archive, Dna, FlaskConical, Download, Layers,
  ChevronRight, ArrowRight, ArrowUpRight, ShieldCheck, Zap,
  Refrigerator, Snowflake, Thermometer, Box, Eye, CheckCircle, ArrowDown,
  ChevronDown
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  getUnitStockInUse, consumeUnitStockItem, addUnitStockItem,
  getUnitConsumptionLogs, getUnitRequisitions, getUnitRequisitionItems,
  createUnitRequisition, getStorageUnits, getInhandInventory
} from '../../api/lab';

// ── The 6 Exact Laboratory Units ──────────────────────────────────────────────
const LAB_UNITS = [
  { id: 'Biochemistry', label: 'Biochemistry', icon: FlaskConical, color: '#1B669E', bgColor: '#e0f0fb' },
  { id: 'Hematology', label: 'Hematology', icon: Activity, color: '#dc2626', bgColor: '#fee2e2' },
  { id: 'Microbiology', label: 'Microbiology', icon: Microscope, color: '#059669', bgColor: '#d1fae5' },
  { id: 'Phlebotomy', label: 'Phlebotomy', icon: Droplet, color: '#0284c7', bgColor: '#e0f2fe' },
  { id: 'Histopathology', label: 'Histopathology', icon: Archive, color: '#d97706', bgColor: '#fef3c7' },
  { id: 'Molecular Biology', label: 'Molecular Biology', icon: Dna, color: '#7c3aed', bgColor: '#ede9fe' },
];

const ITEM_CATEGORIES = [
  'All',
  'Reagents',
  'Controls',
  'Calibrators',
  'Rapid Tests',
  'Consumables',
  'Stains & Buffers',
  'Specimen Containers'
];

const UOM_OPTIONS = ['pack', 'kit', 'bot', 'box', 'pcs', 'tubes', 'vials', 'cartridges', 'tests', 'plates', 'racks'];

export default function LabConsumablesWorkspace({ user }) {
  // Determine default unit based on user role if applicable
  const defaultUnitId = useMemo(() => {
    const r = (user?.role || '').toLowerCase();
    if (r.includes('hema')) return 'Hematology';
    if (r.includes('micro')) return 'Microbiology';
    if (r.includes('phleb')) return 'Phlebotomy';
    if (r.includes('histo') || r.includes('patho')) return 'Histopathology';
    if (r.includes('molec') || r.includes('pcr')) return 'Molecular Biology';
    return 'Biochemistry';
  }, [user]);

  const [activeUnit, setActiveUnit] = useState(defaultUnitId);
  const [activeTab, setActiveTab] = useState('stock'); // 'stock' | 'storage' | 'requisitions' | 'logs'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Stock In Use State
  const [unitStock, setUnitStock] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  // Cold Chain & Physical Storage Units State
  const [storageUnits, setStorageUnits] = useState([]);
  const [storageInventory, setStorageInventory] = useState([]);
  const [storageTabType, setStorageTabType] = useState('all'); // 'all' | 'unit' | 'fridge' | 'room_temp' | 'freezer'
  const [storageSearchQuery, setStorageSearchQuery] = useState('');
  const [transferModalItem, setTransferModalItem] = useState(null); // { item, unit }
  const [transferQty, setTransferQty] = useState(1);
  const [transferring, setTransferring] = useState(false);

  // Consumption Modal State
  const [consumeModalItem, setConsumeModalItem] = useState(null);
  const [consumeQty, setConsumeQty] = useState(1);
  const [consumeRemarks, setConsumeRemarks] = useState('');
  const [consuming, setConsuming] = useState(false);

  // Add Bench Item Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addingItem, setAddingItem] = useState(false);
  const [addModalItemDropdown, setAddModalItemDropdown] = useState(false);
  const [newItemForm, setNewItemForm] = useState({
    item_name: '',
    category: 'Reagents',
    quantity_in_use: 5,
    unit_of_measure: 'kit',
    min_threshold: 2,
    storage_location: 'Main Unit Bench',
    inventory_ref_id: null
  });

  // Requisitions State
  const [requisitions, setRequisitions] = useState([]);
  const [isReqModalOpen, setIsReqModalOpen] = useState(false);
  const [submittingReq, setSubmittingReq] = useState(false);
  const [activeLineDropdown, setActiveLineDropdown] = useState(null);
  const [showCatalogPicker, setShowCatalogPicker] = useState(false);
  const [catalogSearchTerm, setCatalogSearchTerm] = useState('');
  const [catalogCategoryFilter, setCatalogCategoryFilter] = useState('All');
  const [reqForm, setReqForm] = useState({
    urgency: 'Normal',
    notes: '',
    items: [{ item_name: '', requested_quantity: 5, unit_of_measure: 'kit', item_category: 'Reagents', inventory_ref_id: null }]
  });

  // Requisition Detail Drawer
  const [selectedReq, setSelectedReq] = useState(null);
  const [reqItems, setReqItems] = useState([]);
  const [loadingReqItems, setLoadingReqItems] = useState(false);

  // Consumption Logs State
  const [consumptionLogs, setConsumptionLogs] = useState([]);

  // ── Data Fetching ──────────────────────────────────────────────────────────
  const fetchWorkspaceData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const [stockRes, reqRes, logsRes, storageRes, inhandRes] = await Promise.allSettled([
        getUnitStockInUse({ unit: activeUnit }),
        getUnitRequisitions({ unit: activeUnit }),
        getUnitConsumptionLogs({ unit: activeUnit, limit: 100 }),
        getStorageUnits(),
        getInhandInventory()
      ]);

      if (stockRes.status === 'fulfilled' && stockRes.value.data?.success) {
        setUnitStock(stockRes.value.data.data || []);
      }
      if (reqRes.status === 'fulfilled' && reqRes.value.data?.success) {
        setRequisitions(reqRes.value.data.data || []);
      }
      if (logsRes.status === 'fulfilled' && logsRes.value.data?.success) {
        setConsumptionLogs(logsRes.value.data.data || []);
      }
      if (storageRes.status === 'fulfilled' && storageRes.value.data?.success) {
        setStorageUnits(storageRes.value.data.data || []);
      }
      if (inhandRes.status === 'fulfilled' && inhandRes.value.data?.success) {
        setStorageInventory(inhandRes.value.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load lab workspace data:', err);
      toast.error('Failed to update laboratory bench data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeUnit]);

  useEffect(() => {
    fetchWorkspaceData();
  }, [fetchWorkspaceData]);

  // ── Filtered Stock ─────────────────────────────────────────────────────────
  const filteredStock = useMemo(() => {
    return unitStock.filter(item => {
      if (categoryFilter !== 'All' && item.category !== categoryFilter) return false;
      if (showLowStockOnly && (item.quantity_in_use > item.min_threshold)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.item_name?.toLowerCase().includes(q);
        const matchesLoc = item.storage_location?.toLowerCase().includes(q);
        return matchesName || matchesLoc;
      }
      return true;
    });
  }, [unitStock, categoryFilter, showLowStockOnly, searchQuery]);

  // ── Metrics for Active Unit ────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const totalItems = unitStock.length;
    const depleted = unitStock.filter(i => (Number(i.quantity_in_use) || 0) <= 0).length;
    const lowStock = unitStock.filter(i => {
      const q = Number(i.quantity_in_use) || 0;
      const m = Number(i.min_threshold) || 0;
      return q > 0 && q <= m;
    }).length;
    const adequate = totalItems - depleted - lowStock;
    const pendingReqs = requisitions.filter(r => r.status === 'Pending' || r.status === 'Forwarded').length;

    return { totalItems, depleted, lowStock, adequate, pendingReqs };
  }, [unitStock, requisitions]);

  // ── Unified Reagent Catalog with Stock Levels (Bench + Storage) ───────────
  const selectableReagents = useMemo(() => {
    const map = new Map();

    // 1. Storage inventory (in-hand stock in fridges, freezers, and storage units)
    (storageInventory || []).forEach(item => {
      const name = (item.item_name || '').trim();
      if (!name) return;
      const key = name.toLowerCase();
      map.set(key, {
        id: item.id,
        item_name: name,
        category: item.category || 'Reagents',
        unit_of_measure: item.unit_of_measure || 'kit',
        storage_stock: Number(item.quantity_in_hand ?? 0),
        bench_stock: 0,
        min_threshold: Number(item.min_threshold || 2),
        storage_location: item.storage_unit_label || (item.storage_temp ? `Temp: ${item.storage_temp}` : 'Cold Storage'),
        inventory_ref_id: item.id,
        equipment_group: item.equipment_group || null
      });
    });

    // 2. Unit stock in use (bench stock for active unit)
    (unitStock || []).forEach(item => {
      const name = (item.item_name || '').trim();
      if (!name) return;
      const key = name.toLowerCase();
      const existing = map.get(key);
      const benchQty = Number(item.quantity_in_use ?? 0);
      if (existing) {
        existing.bench_stock = benchQty;
        if (item.storage_location) existing.bench_location = item.storage_location;
        if (item.category) existing.category = item.category;
        if (item.unit_of_measure) existing.unit_of_measure = item.unit_of_measure;
      } else {
        map.set(key, {
          id: item.id,
          item_name: name,
          category: item.category || 'Reagents',
          unit_of_measure: item.unit_of_measure || 'kit',
          storage_stock: 0,
          bench_stock: benchQty,
          min_threshold: Number(item.min_threshold || 2),
          storage_location: item.storage_location || 'Main Bench',
          inventory_ref_id: item.inventory_ref_id || null,
          equipment_group: null
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => a.item_name.localeCompare(b.item_name));
  }, [storageInventory, unitStock]);

  const getFilteredCatalog = useCallback((searchTerm) => {
    if (!searchTerm || !searchTerm.trim()) return selectableReagents;
    const q = searchTerm.toLowerCase().trim();
    return selectableReagents.filter(i =>
      i.item_name.toLowerCase().includes(q) ||
      i.category.toLowerCase().includes(q) ||
      (i.equipment_group && i.equipment_group.toLowerCase().includes(q)) ||
      (i.storage_location && i.storage_location.toLowerCase().includes(q))
    );
  }, [selectableReagents]);

  const getReagentStock = useCallback((itemName) => {
    if (!itemName || !itemName.trim()) return null;
    const key = itemName.trim().toLowerCase();
    return selectableReagents.find(i => i.item_name.toLowerCase() === key) || null;
  }, [selectableReagents]);

  const handleSelectBenchItem = (item) => {
    setNewItemForm(prev => ({
      ...prev,
      item_name: item.item_name,
      category: item.category || prev.category,
      unit_of_measure: item.unit_of_measure || prev.unit_of_measure,
      min_threshold: item.min_threshold || prev.min_threshold,
      storage_location: item.storage_location || prev.storage_location,
      inventory_ref_id: item.inventory_ref_id || item.id || null
    }));
    setAddModalItemDropdown(false);
  };

  const handleSelectReqItem = (idx, item) => {
    setReqForm(prev => {
      const updated = [...prev.items];
      updated[idx] = {
        ...updated[idx],
        item_name: item.item_name,
        item_category: item.category || updated[idx].item_category || 'Reagents',
        unit_of_measure: item.unit_of_measure || updated[idx].unit_of_measure || 'kit',
        inventory_ref_id: item.inventory_ref_id || item.id || null
      };
      return { ...prev, items: updated };
    });
    setActiveLineDropdown(null);
  };

  const handleAddCatalogItemToReq = (item) => {
    setReqForm(prev => {
      const last = prev.items[prev.items.length - 1];
      if (last && !last.item_name.trim()) {
        const updated = [...prev.items];
        updated[updated.length - 1] = {
          item_name: item.item_name,
          requested_quantity: Math.max(5, (item.min_threshold || 2) * 2),
          unit_of_measure: item.unit_of_measure || 'kit',
          item_category: item.category || 'Reagents',
          inventory_ref_id: item.inventory_ref_id || item.id || null
        };
        return { ...prev, items: updated };
      }
      return {
        ...prev,
        items: [
          ...prev.items,
          {
            item_name: item.item_name,
            requested_quantity: Math.max(5, (item.min_threshold || 2) * 2),
            unit_of_measure: item.unit_of_measure || 'kit',
            item_category: item.category || 'Reagents',
            inventory_ref_id: item.inventory_ref_id || item.id || null
          }
        ]
      };
    });
    toast.success(`Added ${item.item_name} to requisition.`);
  };

  // ── Handler: Log Consumption ───────────────────────────────────────────────
  const handleOpenConsume = (item) => {
    setConsumeModalItem(item);
    setConsumeQty(1);
    setConsumeRemarks('');
  };

  const handleSubmitConsume = async (e) => {
    e.preventDefault();
    if (!consumeModalItem) return;
    const qty = Number(consumeQty);
    if (!qty || qty <= 0) {
      toast.error('Please enter a valid quantity consumed.');
      return;
    }

    setConsuming(true);
    try {
      const res = await consumeUnitStockItem(consumeModalItem.id, {
        quantity: qty,
        purpose_remarks: consumeRemarks.trim() || 'Shift patient test run'
      });
      if (res.data?.success) {
        toast.success(`Logged ${qty} ${consumeModalItem.unit_of_measure} consumed for ${consumeModalItem.item_name}`);
        setConsumeModalItem(null);
        fetchWorkspaceData(true);
      }
    } catch (err) {
      console.error('Failed to log consumption:', err);
      toast.error(err.response?.data?.message || 'Error recording consumption.');
    } finally {
      setConsuming(false);
    }
  };

  // ── Handler: Add Bench Item ────────────────────────────────────────────────
  const handleAddBenchItem = async (e) => {
    e.preventDefault();
    if (!newItemForm.item_name.trim()) {
      toast.error('Item name is required.');
      return;
    }

    setAddingItem(true);
    try {
      const res = await addUnitStockItem({
        ...newItemForm,
        unit_name: activeUnit
      });
      if (res.data?.success) {
        toast.success(`Added ${newItemForm.item_name} to ${activeUnit} stock in use.`);
        setIsAddModalOpen(false);
        setNewItemForm({
          item_name: '',
          category: 'Reagents',
          quantity_in_use: 5,
          unit_of_measure: 'kit',
          min_threshold: 2,
          storage_location: 'Main Unit Bench'
        });
        fetchWorkspaceData(true);
      }
    } catch (err) {
      console.error('Failed to add bench item:', err);
      toast.error(err.response?.data?.message || 'Failed to add item.');
    } finally {
      setAddingItem(false);
    }
  };

  // ── Handler: Pre-fill Requisition from Item ─────────────────────────────────
  const handleQuickRequisition = (item) => {
    setReqForm({
      urgency: 'Normal',
      notes: `Restock request for depleted/low bench stock: ${item.item_name}`,
      items: [{
        item_name: item.item_name,
        requested_quantity: Math.max(5, (item.min_threshold || 2) * 2),
        unit_of_measure: item.unit_of_measure || 'kit',
        item_category: item.category || 'Reagents',
        inventory_ref_id: item.inventory_ref_id || null
      }]
    });
    setIsReqModalOpen(true);
  };

  // ── Handler: Submit Unit Requisition ───────────────────────────────────────
  const handleAddReqLine = () => {
    setReqForm(prev => ({
      ...prev,
      items: [...prev.items, { item_name: '', requested_quantity: 5, unit_of_measure: 'kit', item_category: 'Reagents' }]
    }));
  };

  const handleRemoveReqLine = (idx) => {
    if (reqForm.items.length <= 1) return;
    setReqForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx)
    }));
  };

  const handleReqLineChange = (idx, field, value) => {
    setReqForm(prev => {
      const updated = [...prev.items];
      updated[idx] = { ...updated[idx], [field]: value };
      return { ...prev, items: updated };
    });
  };

  const handleSubmitRequisition = async (e) => {
    e.preventDefault();
    const validLines = reqForm.items.filter(i => i.item_name.trim() && Number(i.requested_quantity) > 0);
    if (validLines.length === 0) {
      toast.error('Please enter at least one valid item name and quantity.');
      return;
    }

    setSubmittingReq(true);
    try {
      const payload = {
        requesting_unit: activeUnit,
        urgency: reqForm.urgency,
        notes: reqForm.notes || `Requisition from ${activeUnit} unit`,
        stock_source: 'lab_stock',
        items: validLines
      };

      const res = await createUnitRequisition(payload);
      if (res.data?.success) {
        toast.success(`Requisition submitted to Laboratory Stock Manager! (Ref: ${res.data.ref_number || 'OK'})`);
        setIsReqModalOpen(false);
        setReqForm({
          urgency: 'Normal',
          notes: '',
          items: [{ item_name: '', requested_quantity: 5, unit_of_measure: 'kit', item_category: 'Reagents' }]
        });
        fetchWorkspaceData(true);
        setActiveTab('requisitions');
      }
    } catch (err) {
      console.error('Failed to submit requisition:', err);
      toast.error(err.response?.data?.message || 'Failed to submit requisition.');
    } finally {
      setSubmittingReq(false);
    }
  };

  // ── Handler: Open Requisition Details ──────────────────────────────────────
  const handleOpenReqDetails = async (req) => {
    setSelectedReq(req);
    setLoadingReqItems(true);
    try {
      const res = await getUnitRequisitionItems(req.id);
      setReqItems(res.data?.data || []);
    } catch (err) {
      console.error('Error fetching requisition items:', err);
      toast.error('Failed to load item lines.');
    } finally {
      setLoadingReqItems(false);
    }
  };

  // ── Handler: Export CSV ────────────────────────────────────────────────────
  const handleExportLogsCSV = () => {
    try {
      const headers = ['Control Number', 'Timestamp', 'Laboratory Unit', 'Item Name', 'Action', 'Quantity', 'Remaining Balance', 'Purpose / Remarks', 'Recorded By'];
      const rows = consumptionLogs.map(l => [
        'LEG/PATHLAB/MSD/FM-12-VERS-004',
        l.created_at ? new Date(l.created_at).toLocaleString() : '',
        l.unit_name || activeUnit,
        l.item_name,
        l.action_type,
        l.quantity,
        l.remaining_balance,
        l.purpose_remarks || '',
        l.recorded_by_name || 'Staff'
      ]);

      const csvContent = [headers.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Lab_${activeUnit}_Consumption_Log_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Consumption audit log exported.');
    } catch (err) {
      console.error('Export error:', err);
      toast.error('Failed to export CSV.');
    }
  };

  // Storage Units relevant to the currently selected active laboratory unit
  const activeUnitStorageUnitIds = useMemo(() => {
    switch (activeUnit) {
      case 'Biochemistry':
        return ['fridge_biochem', 'freezer_controls', 'room_temp_biochem'];
      case 'Hematology':
        return ['fridge_hema', 'freezer_controls', 'room_temp_hema'];
      case 'Microbiology':
        return ['fridge_micro', 'room_temp_micro'];
      case 'Phlebotomy':
        return ['fridge_samples', 'room_temp_general'];
      case 'Histopathology':
        return ['room_temp_general'];
      case 'Molecular Biology':
        return ['fridge_serology', 'freezer_controls', 'room_temp_general'];
      default:
        return [];
    }
  }, [activeUnit]);

  // Filtered storage units for display
  const filteredStorageUnits = useMemo(() => {
    return storageUnits.filter(u => {
      if (storageTabType === 'unit') {
        return activeUnitStorageUnitIds.includes(u.id);
      }
      if (storageTabType === 'fridge') return u.type === 'fridge';
      if (storageTabType === 'room_temp') return u.type === 'room_temp';
      if (storageTabType === 'freezer') return u.type === 'freezer';
      return true;
    });
  }, [storageUnits, storageTabType, activeUnitStorageUnitIds]);

  const handleTransferToBench = async (e) => {
    e.preventDefault();
    if (!transferModalItem) return;
    const { item, unit } = transferModalItem;
    setTransferring(true);
    try {
      const payload = {
        unit_name: activeUnit,
        item_name: item.item_name,
        category: item.category || 'Reagents',
        quantity_in_use: Number(transferQty) || 1,
        unit_of_measure: item.unit_of_measure || 'kit',
        min_threshold: item.min_threshold || 2,
        storage_location: `${unit.label} (${unit.temp_range || 'Stored'})`
      };
      const res = await addUnitStockItem(payload);
      if (res.data?.success) {
        toast.success(`Transferred ${transferQty} ${item.unit_of_measure} of ${item.item_name} to ${activeUnit} Bench Stock!`);
        setTransferModalItem(null);
        setTransferQty(1);
        fetchWorkspaceData(true);
        setActiveTab('stock');
      }
    } catch (err) {
      console.error('Transfer error:', err);
      toast.error('Failed to transfer item to bench stock.');
    } finally {
      setTransferring(false);
    }
  };

  const currentUnitConfig = LAB_UNITS.find(u => u.id === activeUnit) || LAB_UNITS[0];

  return (
    <div className="space-y-6">

      {/* ── Operational Unit Header & Unit Switcher ── */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                MoH Rwanda Standard • ISO 15189
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                Staff Consumables &amp; Bench Stock
              </span>
              <span className="text-[11px] font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                Active Unit: {activeUnit}
              </span>
              <span className="text-[11px] font-mono font-bold text-amber-900 bg-amber-50 px-2.5 py-0.5 rounded border border-amber-300 flex items-center gap-1 shadow-2xs">
                Control No: LEG/PATHLAB/MSD/FM-12-VERS-004
              </span>
            </div>

            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <currentUnitConfig.icon size={22} style={{ color: currentUnitConfig.color }} />
              <span>{activeUnit} Laboratory Bench Workspace</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage in-use bench reagents, record test run consumption, and requisition replenishment to the Laboratory Stock Manager.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => fetchWorkspaceData(true)}
              disabled={refreshing}
              className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>

            <button
              onClick={() => {
                setReqForm({
                  urgency: 'Normal',
                  notes: '',
                  items: [{ item_name: '', requested_quantity: 5, unit_of_measure: 'kit', item_category: 'Reagents' }]
                });
                setIsReqModalOpen(true);
              }}
              className="px-3.5 py-1.5 bg-[#1B669E] hover:bg-[#155280] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Plus size={14} />
              <span>New Requisition</span>
            </button>
          </div>
        </div>

        {/* ── The 6 Exact Laboratory Units Selection Pills ── */}
        <div className="pt-2 border-t border-slate-100 flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs font-bold text-slate-400 shrink-0 mr-1">Switch Unit:</span>
          {LAB_UNITS.map(unit => {
            const isSelected = activeUnit === unit.id;
            const Icon = unit.icon;
            return (
              <button
                key={unit.id}
                onClick={() => setActiveUnit(unit.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all shrink-0 cursor-pointer ${isSelected
                    ? 'text-white shadow-xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                style={isSelected ? { backgroundColor: unit.color } : {}}
              >
                <Icon size={14} />
                <span>{unit.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Unit Operational KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">In-Use Bench Items</span>
          <div className="text-2xl font-black text-slate-900 mt-1">{metrics.totalItems}</div>
          <span className="text-[11px] text-slate-500 font-medium">Active reagents &amp; consumables</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block">Stock Adequate</span>
          <div className="text-2xl font-black text-emerald-700 mt-1">{metrics.adequate}</div>
          <span className="text-[11px] text-slate-500 font-medium">Above minimum threshold</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider block">Low Stock Alert</span>
          <div className="text-2xl font-black text-amber-700 mt-1">{metrics.lowStock}</div>
          <span className="text-[11px] text-slate-500 font-medium">Requisition advised</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider block">Active Requisitions</span>
          <div className="text-2xl font-black text-blue-700 mt-1">{metrics.pendingReqs}</div>
          <span className="text-[11px] text-slate-500 font-medium">Pending with Lab Stock Manager</span>
        </div>
      </div>

      {/* ── Sub-Tabs Navigation Bar ── */}
      <div className="bg-white p-1.5 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setActiveTab('stock')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 ${activeTab === 'stock'
                ? 'bg-[#1B669E] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
          >
            <Package size={14} />
            <span>Stock In Use ({filteredStock.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('storage')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 ${activeTab === 'storage'
                ? 'bg-[#1B669E] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
          >
            <Refrigerator size={14} />
            <span>Fridges &amp; Room Temp ({storageInventory.length})</span>
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
            onClick={() => setActiveTab('logs')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 ${activeTab === 'logs'
                ? 'bg-[#1B669E] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
          >
            <Clock size={14} />
            <span>Consumption Audit Logs ({consumptionLogs.length})</span>
          </button>
        </div>

        {activeTab === 'stock' && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-3 py-1.5 text-xs font-semibold text-[#1B669E] bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-lg flex items-center gap-1 transition-colors"
          >
            <Plus size={13} /> Add Bench Item
          </button>
        )}

        {activeTab === 'logs' && (
          <button
            onClick={handleExportLogsCSV}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-lg flex items-center gap-1 transition-colors"
          >
            <Download size={13} /> Export CSV
          </button>
        )}
      </div>

      {/* ── TAB 1: STOCK IN USE (BENCH STOCK) ── */}
      {activeTab === 'stock' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full sm:max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={`Search ${activeUnit} bench reagents...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-[#1B669E] text-slate-800"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:bg-white focus:outline-none focus:border-[#1B669E]"
              >
                {ITEM_CATEGORIES.map(c => (
                  <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>
                ))}
              </select>

              <button
                onClick={() => setShowLowStockOnly(v => !v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors flex items-center gap-1.5 ${showLowStockOnly
                    ? 'bg-amber-500 text-white border-amber-600'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
              >
                <AlertTriangle size={13} />
                <span>Low Stock Only</span>
              </button>
            </div>
          </div>

          {/* Stock Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            {loading ? (
              <div className="p-12 text-center text-xs text-slate-500">
                <RefreshCw size={24} className="animate-spin text-[#1B669E] mx-auto mb-2" />
                Loading {activeUnit} bench stock...
              </div>
            ) : filteredStock.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <Package size={32} className="text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-700">No items match the current filter in {activeUnit}.</p>
                <p className="text-[11px] text-slate-400">Add a new bench item or submit a requisition to the Laboratory Stock Manager.</p>
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#1B669E] hover:bg-[#155280] rounded-lg mt-2 inline-flex items-center gap-1.5"
                >
                  <Plus size={13} /> Register In-Use Item
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Item &amp; Category</th>
                      <th className="py-3 px-4">Bench Location</th>
                      <th className="py-3 px-4 text-center">In-Use Balance</th>
                      <th className="py-3 px-4">Min. Threshold</th>
                      <th className="py-3 px-4">Stock Status</th>
                      <th className="py-3 px-4">Last Consumed</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredStock.map(item => {
                      const qty = Number(item.quantity_in_use) || 0;
                      const min = Number(item.min_threshold) || 0;
                      const isDepleted = qty <= 0;
                      const isLow = qty > 0 && qty <= min;

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4">
                            <span className="font-bold text-slate-900 block">{item.item_name}</span>
                            <span className="text-[10px] text-slate-400 font-medium">{item.category}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-xs text-slate-600 font-medium">{item.storage_location || 'Bench'}</span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="text-sm font-black text-slate-900">{qty}</span>
                            <span className="text-[10px] text-slate-400 ml-1 font-semibold">{item.unit_of_measure}</span>
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-600">
                            {min} {item.unit_of_measure}
                          </td>
                          <td className="py-3 px-4">
                            {isDepleted ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                Depleted (0)
                              </span>
                            ) : isLow ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                Low Stock
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Adequate
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-[11px] text-slate-500">
                            {item.last_consumed_at ? (
                              <div>
                                <span>{new Date(item.last_consumed_at).toLocaleDateString()}</span>
                                <span className="text-[10px] text-slate-400 block font-medium">
                                  {item.last_consumed_qty || ''} {item.unit_of_measure} by {item.last_updated_by}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">No usage recorded</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenConsume(item)}
                                disabled={qty <= 0}
                                className="px-2.5 py-1 text-xs font-semibold text-white bg-[#1B669E] hover:bg-[#155280] rounded-lg transition-colors shadow-2xs disabled:opacity-40"
                                title="Record patient test run usage"
                              >
                                Log Usage
                              </button>
                              <button
                                onClick={() => handleQuickRequisition(item)}
                                className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200"
                                title="Requisition from Laboratory Stock Manager"
                              >
                                + Reorder
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

      {/* ── TAB: COLD CHAIN & PHYSICAL STORAGE (FRIDGES, ROOM TEMP, FREEZERS) ── */}
      {activeTab === 'storage' && (
        <div className="space-y-4">
          {/* Header Banner */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-bold text-[#1B669E] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  MoH Rwanda • ISO 15189 Cold Chain Standard
                </span>
                <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Reagents Monitored
                </span>
              </div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Refrigerator className="text-[#1B669E]" size={18} />
                Physical Storage Units (Fridges &amp; Room Temp)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Inspect reagents stored in Refrigerators (2°C–8°C), Room Temp Shelves (20°C–25°C), and Deep Freezers (-20°C to -80°C). Click &quot;Take to Bench&quot; to bring items into your active unit bench stock.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-700 font-bold bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                {storageInventory.length} Total Reagents Stored
              </span>
            </div>
          </div>

          {/* Quick Category & Search Filter Bar */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-col lg:flex-row items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-1.5 flex-wrap w-full lg:w-auto">
              <button
                onClick={() => setStorageTabType('all')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${storageTabType === 'all'
                    ? 'bg-[#1B669E] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
                  }`}
              >
                All Storage Units ({storageUnits.length})
              </button>

              <button
                onClick={() => setStorageTabType('unit')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${storageTabType === 'unit'
                    ? 'bg-[#1B669E] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
                  }`}
              >
                <currentUnitConfig.icon size={13} />
                <span>{activeUnit} Units ({storageUnits.filter(u => activeUnitStorageUnitIds.includes(u.id)).length})</span>
              </button>

              <button
                onClick={() => setStorageTabType('fridge')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${storageTabType === 'fridge'
                    ? 'bg-sky-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
                  }`}
              >
                <Refrigerator size={13} className="text-sky-600" />
                <span>Fridges 2°C–8°C ({storageUnits.filter(u => u.type === 'fridge').length})</span>
              </button>

              <button
                onClick={() => setStorageTabType('room_temp')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${storageTabType === 'room_temp'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
                  }`}
              >
                <Thermometer size={13} className="text-amber-600" />
                <span>Room Temp 20°C–25°C ({storageUnits.filter(u => u.type === 'room_temp').length})</span>
              </button>

              <button
                onClick={() => setStorageTabType('freezer')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${storageTabType === 'freezer'
                    ? 'bg-indigo-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
                  }`}
              >
                <Snowflake size={13} className="text-indigo-600" />
                <span>Deep Freezers ({storageUnits.filter(u => u.type === 'freezer').length})</span>
              </button>
            </div>

            {/* Live Reagent Search Input */}
            <div className="relative w-full lg:w-72">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={storageSearchQuery}
                onChange={(e) => setStorageSearchQuery(e.target.value)}
                placeholder="Search reagents (Cobas, Mindray, VITEK...)"
                className="w-full pl-8 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-[#1B669E] text-slate-800"
              />
              {storageSearchQuery && (
                <button
                  onClick={() => setStorageSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Storage Units Grid */}
          <div className="space-y-4">
            {filteredStorageUnits.map(unit => {
              const isFridge = unit.type === 'fridge';
              const isFreezer = unit.type === 'freezer';
              const isRoomTemp = unit.type === 'room_temp';

              // Get all reagents assigned to this unit
              const allUnitReagents = storageInventory.filter(i => i.storage_unit_id === unit.id);

              // Filter by user search query if present
              const displayedReagents = allUnitReagents.filter(i => {
                if (!storageSearchQuery.trim()) return true;
                const q = storageSearchQuery.toLowerCase();
                return (
                  i.item_name?.toLowerCase().includes(q) ||
                  i.equipment_group?.toLowerCase().includes(q) ||
                  i.category?.toLowerCase().includes(q) ||
                  unit.label?.toLowerCase().includes(q)
                );
              });

              // If searching and this unit has 0 matching items, hide it
              if (storageSearchQuery.trim() && displayedReagents.length === 0) {
                return null;
              }

              return (
                <div key={unit.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                  {/* Unit Header Bar */}
                  <div className={`p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${isFridge ? 'bg-sky-50/70 border-sky-100' :
                      isFreezer ? 'bg-indigo-50/70 border-indigo-100' :
                        'bg-amber-50/70 border-amber-100'
                    }`}>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${isFridge ? 'bg-sky-100 text-sky-700' :
                          isFreezer ? 'bg-indigo-100 text-indigo-700' :
                            'bg-amber-100 text-amber-700'
                        }`}>
                        {isFridge ? <Refrigerator size={18} /> :
                          isFreezer ? <Snowflake size={18} /> :
                            <Thermometer size={18} />}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-extrabold text-sm text-slate-900">{unit.label}</h3>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${isFridge ? 'bg-white text-sky-800 border-sky-200' :
                              isFreezer ? 'bg-white text-indigo-800 border-indigo-200' :
                                'bg-white text-amber-800 border-amber-200'
                            }`}>
                            {unit.temp_range || (isFridge ? '2°C to 8°C' : isFreezer ? '-20°C to -80°C' : '20°C to 25°C')}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">ID: {unit.id}</span>
                        </div>
                        <span className="text-xs text-slate-500 font-medium mt-0.5 block">
                          {isFridge ? 'Cold Chain 2°C to 8°C Reagents' : isFreezer ? 'Lyophilized Controls & Calibrators' : 'Room Temperature 20°C to 25°C Storage'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white text-slate-700 border border-slate-200 shadow-2xs">
                        {allUnitReagents.length} Reagents Stored
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Operational
                      </span>
                    </div>
                  </div>

                  {/* Reagents Table inside this Unit */}
                  {displayedReagents.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400 italic">
                      {unit.id === 'fridge_samples'
                        ? 'Reserved for clinical patient specimen pre/post-analytical holding (No stock reagents).'
                        : 'No reagents currently recorded in this storage unit.'}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            <th className="py-2.5 px-4">Reagent / Item Name</th>
                            <th className="py-2.5 px-4">Equipment Group / Analyzer</th>
                            <th className="py-2.5 px-4">Category</th>
                            <th className="py-2.5 px-4 text-center">In-Hand Stock</th>
                            <th className="py-2.5 px-4 text-center">Stock Status</th>
                            <th className="py-2.5 px-4 text-right">Transfer to Bench</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {displayedReagents.map(reagent => {
                            const qty = Number(reagent.quantity_in_hand) || 0;
                            const min = Number(reagent.min_threshold) || 1;
                            const isStockout = qty <= 0;
                            const isLow = qty > 0 && qty <= min;

                            return (
                              <tr key={reagent.id} className="hover:bg-slate-50/60 transition-colors">
                                <td className="py-3 px-4">
                                  <span className="font-bold text-slate-900 block text-xs">{reagent.item_name}</span>
                                  <span className="text-[10px] text-slate-400">Bench: {reagent.department || activeUnit}</span>
                                </td>

                                <td className="py-3 px-4">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                    {reagent.equipment_group || 'General Lab'}
                                  </span>
                                </td>

                                <td className="py-3 px-4 text-slate-600 font-medium">
                                  {reagent.category || 'Reagents'}
                                </td>

                                <td className="py-3 px-4 text-center font-mono font-bold">
                                  <span className={isStockout ? 'text-rose-600' : isLow ? 'text-amber-600' : 'text-slate-800'}>
                                    {qty} {reagent.unit_of_measure}
                                  </span>
                                </td>

                                <td className="py-3 px-4 text-center">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${isStockout ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                      isLow ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                        'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    }`}>
                                    {isStockout ? 'Depleted' : isLow ? 'Low Stock' : 'Adequate'}
                                  </span>
                                </td>

                                <td className="py-3 px-4 text-right">
                                  <button
                                    onClick={() => {
                                      setTransferModalItem({ item: reagent, unit });
                                      setTransferQty(1);
                                    }}
                                    className="px-2.5 py-1 text-xs font-semibold text-[#1B669E] bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer"
                                    title={`Bring 1 or more ${reagent.unit_of_measure} to ${activeUnit} Bench Stock`}
                                  >
                                    <Plus size={12} />
                                    <span>Take to Bench</span>
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TAB 2: UNIT REQUISITIONS TO LAB STOCK MANAGER ── */}
      {activeTab === 'requisitions' && (
        <div className="space-y-4">
          <div className="bg-white p-4.5 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ClipboardList className="text-[#1B669E]" size={16} />
                {activeUnit} Replenishment Requisitions
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Orders submitted to Laboratory Stock Manager. If in stock, approved directly; if general store, reviewed and forwarded.
              </p>
            </div>
            <button
              onClick={() => {
                setReqForm({
                  urgency: 'Normal',
                  notes: '',
                  items: [{ item_name: '', requested_quantity: 5, unit_of_measure: 'kit', item_category: 'Reagents' }]
                });
                setIsReqModalOpen(true);
              }}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-[#1B669E] hover:bg-[#155280] rounded-lg transition-colors shadow-xs flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Plus size={14} /> New Requisition
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            {requisitions.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <ClipboardList size={30} className="text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-700">No requisitions currently submitted for {activeUnit}.</p>
                <p className="text-[11px] text-slate-400">Submit an order when bench reagent levels fall below threshold.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Req #</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Urgency</th>
                      <th className="py-3 px-4">Notes / Justification</th>
                      <th className="py-3 px-4">Stock Source</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {requisitions.map(r => (
                      <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-[#1B669E]">{r.ref_number || `REQ-${r.id}`}</td>
                        <td className="py-3 px-4">{r.created_at ? new Date(r.created_at).toLocaleDateString() : 'N/A'}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${r.urgency === 'STAT' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                              r.urgency === 'Urgent' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                'bg-slate-50 text-slate-600 border-slate-200'
                            }`}>
                            {r.urgency || 'Normal'}
                          </span>
                        </td>
                        <td className="py-3 px-4 max-w-xs truncate">{r.notes || 'Routine restock'}</td>
                        <td className="py-3 px-4">
                          <span className="text-[11px] font-medium text-slate-600">
                            {r.stock_source === 'general_stock' ? 'General Central Store' : 'Laboratory Stock'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${r.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              r.status === 'Rejected' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                r.status === 'Forwarded' ? 'bg-sky-50 text-sky-700 border-sky-200' :
                                  'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                            {r.status === 'Pending' ? 'Pending Lab Review' :
                              r.status === 'Forwarded' ? 'Forwarded to General Manager' :
                                r.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleOpenReqDetails(r)}
                            className="text-xs font-semibold text-[#1B669E] hover:underline"
                          >
                            View Items →
                          </button>
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

      {/* ── TAB 3: CONSUMPTION AUDIT LOGS ── */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            {consumptionLogs.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">
                No consumption logs recorded yet for {activeUnit}.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">Item Name</th>
                      <th className="py-3 px-4">Action</th>
                      <th className="py-3 px-4 text-center">Quantity</th>
                      <th className="py-3 px-4 text-center">Remaining Balance</th>
                      <th className="py-3 px-4">Purpose / Remarks</th>
                      <th className="py-3 px-4">Logged By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {consumptionLogs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                          {log.created_at ? new Date(log.created_at).toLocaleString() : '—'}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900">{log.item_name}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${log.action_type === 'CONSUMPTION' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              log.action_type === 'RESTOCK_RECEIVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                'bg-slate-50 text-slate-700 border-slate-200'
                            }`}>
                            {log.action_type === 'CONSUMPTION' ? 'Usage Logged' : 'Restock Received'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-slate-800">{log.quantity}</td>
                        <td className="py-3 px-4 text-center font-bold text-slate-800">{log.remaining_balance}</td>
                        <td className="py-3 px-4 text-slate-600 max-w-xs truncate">{log.purpose_remarks || 'Routine'}</td>
                        <td className="py-3 px-4 font-medium text-slate-700">{log.recorded_by_name || 'Lab Staff'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL: Log Item Consumption ── */}
      {consumeModalItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-start justify-center p-4 pt-10 sm:pt-16 overflow-y-auto">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-md overflow-hidden mb-8">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/60">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Package className="text-[#1B669E]" size={16} />
                Log Usage: {consumeModalItem.item_name}
              </h3>
              <button onClick={() => setConsumeModalItem(null)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmitConsume} className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Unit Bench:</span>
                  <span className="font-bold text-slate-800">{activeUnit}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Current In-Use Balance:</span>
                  <span className="font-black text-[#1B669E]">{consumeModalItem.quantity_in_use} {consumeModalItem.unit_of_measure}</span>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Quantity Consumed ({consumeModalItem.unit_of_measure}) *
                </label>
                <input
                  type="number"
                  min="0.1"
                  max={consumeModalItem.quantity_in_use}
                  step="any"
                  required
                  value={consumeQty}
                  onChange={(e) => setConsumeQty(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-[#1B669E] text-slate-900 font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Purpose / Shift Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. Morning routine patient test run, STAT emergency triage"
                  value={consumeRemarks}
                  onChange={(e) => setConsumeRemarks(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-[#1B669E] text-slate-800"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConsumeModalItem(null)}
                  className="px-3.5 py-1.5 font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={consuming}
                  className="px-4 py-1.5 font-semibold text-white bg-[#1B669E] hover:bg-[#155280] rounded-lg disabled:opacity-50"
                >
                  {consuming ? 'Recording...' : 'Confirm Consumption'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Add New Bench Item ── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-start justify-center p-4 pt-10 sm:pt-16 overflow-y-auto">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-lg overflow-visible mb-8">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/60 rounded-t-xl">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Plus className="text-[#1B669E]" size={16} />
                Register Bench Item for {activeUnit}
              </h3>
              <button onClick={() => { setIsAddModalOpen(false); setAddModalItemDropdown(false); }} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddBenchItem} className="p-5 space-y-3.5 text-xs">
              <div className="relative">
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">Item / Consumable Name *</label>
                  <span className="text-[10px] text-slate-400 font-medium">Select from storage or type new</span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Search reagents in storage or type item name..."
                    value={newItemForm.item_name}
                    onFocus={() => setAddModalItemDropdown(true)}
                    onChange={(e) => {
                      setNewItemForm({ ...newItemForm, item_name: e.target.value });
                      setAddModalItemDropdown(true);
                    }}
                    className="w-full pl-3 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-[#1B669E] text-slate-900 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setAddModalItemDropdown(!addModalItemDropdown)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                    tabIndex={-1}
                  >
                    <ChevronDown size={16} className={`transition-transform duration-150 ${addModalItemDropdown ? 'rotate-180' : ''}`} />
                  </button>
                </div>

                {/* Dropdown with stock levels */}
                {addModalItemDropdown && (
                  <div className="absolute left-0 right-0 top-full mt-1 z-40 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-56 overflow-y-auto divide-y divide-slate-100">
                    <div className="p-2 bg-slate-50/90 sticky top-0 border-b border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-600 z-10">
                      <span>Cold Storage &amp; Laboratory Reagents</span>
                      <span className="text-[10px] text-slate-400 font-normal">{getFilteredCatalog(newItemForm.item_name).length} reagents available</span>
                    </div>
                    {getFilteredCatalog(newItemForm.item_name).length === 0 ? (
                      <div className="p-3 text-center text-slate-400 text-xs">
                        No catalog item matched. You can type any custom consumable name!
                      </div>
                    ) : (
                      getFilteredCatalog(newItemForm.item_name).map((item) => (
                        <div
                          key={item.id}
                          onClick={() => handleSelectBenchItem(item)}
                          className="p-2.5 hover:bg-blue-50/70 cursor-pointer transition-colors flex items-center justify-between text-left"
                        >
                          <div className="min-w-0 pr-2">
                            <span className="font-bold text-slate-900 block truncate text-xs">{item.item_name}</span>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                              <span className="px-1.5 py-0.2 rounded bg-slate-100 font-medium">{item.category}</span>
                              {item.storage_location && (
                                <span className="truncate text-slate-400">• {item.storage_location}</span>
                              )}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${item.storage_stock > 0
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-500'
                              }`}>
                              {item.storage_stock} {item.unit_of_measure} in Storage
                            </span>
                            {item.bench_stock > 0 && (
                              <span className="block text-[10px] text-[#1B669E] font-medium mt-0.5">
                                ({item.bench_stock} on Bench)
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Stock info badge if selected/matched */}
                {(() => {
                  const stockInfo = getReagentStock(newItemForm.item_name);
                  if (!stockInfo) return null;
                  return (
                    <div className="mt-1.5 p-2 bg-blue-50/70 border border-blue-100 rounded-lg flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <Refrigerator size={13} className="text-[#1B669E]" />
                        <span>Storage Stock: <strong className="text-slate-900">{stockInfo.storage_stock} {stockInfo.unit_of_measure}</strong> ({stockInfo.storage_location || 'Cold Storage'})</span>
                      </div>
                      {stockInfo.bench_stock > 0 && (
                        <span className="text-[#1B669E] font-semibold">Bench: {stockInfo.bench_stock} {stockInfo.unit_of_measure}</span>
                      )}
                    </div>
                  );
                })()}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Category</label>
                  <select
                    value={newItemForm.category}
                    onChange={(e) => setNewItemForm({ ...newItemForm, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                  >
                    {ITEM_CATEGORIES.filter(c => c !== 'All').map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Unit of Measure (UOM)</label>
                  <select
                    value={newItemForm.unit_of_measure}
                    onChange={(e) => setNewItemForm({ ...newItemForm, unit_of_measure: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                  >
                    {UOM_OPTIONS.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Initial In-Use Balance</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={newItemForm.quantity_in_use}
                    onChange={(e) => setNewItemForm({ ...newItemForm, quantity_in_use: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Minimum Alert Threshold</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={newItemForm.min_threshold}
                    onChange={(e) => setNewItemForm({ ...newItemForm, min_threshold: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Storage / Bench Location</label>
                <input
                  type="text"
                  placeholder="e.g. Sysmex Bench, Phlebotomy Station A, Fridge 4°C"
                  value={newItemForm.storage_location}
                  onChange={(e) => setNewItemForm({ ...newItemForm, storage_location: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setIsAddModalOpen(false); setAddModalItemDropdown(false); }}
                  className="px-3.5 py-1.5 font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingItem}
                  className="px-4 py-1.5 font-semibold text-white bg-[#1B669E] hover:bg-[#155280] rounded-lg disabled:opacity-50"
                >
                  {addingItem ? 'Adding...' : 'Save Bench Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Create New Unit Requisition ── */}
      {isReqModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-start justify-center p-4 pt-10 sm:pt-16 overflow-y-auto">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-2xl overflow-visible mb-8">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/60 rounded-t-xl">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <ClipboardList className="text-[#1B669E]" size={16} />
                Create Requisition to Lab Stock Manager ({activeUnit})
              </h3>
              <button onClick={() => { setIsReqModalOpen(false); setActiveLineDropdown(null); setShowCatalogPicker(false); }} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmitRequisition} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Requesting Laboratory Unit</label>
                  <input
                    type="text"
                    disabled
                    value={activeUnit}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg font-bold text-slate-700"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Urgency Level</label>
                  <select
                    value={reqForm.urgency}
                    onChange={(e) => setReqForm({ ...reqForm, urgency: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-semibold"
                  >
                    <option value="Normal">Normal (Routine Replenishment)</option>
                    <option value="Urgent">Urgent (Low Buffer Stock)</option>
                    <option value="STAT">STAT (Emergency / Critical Run)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Order Justification / Run Notes</label>
                <textarea
                  rows="2"
                  placeholder="e.g. Depleted Hematology diluent and smear stain for routine clinical run."
                  value={reqForm.notes}
                  onChange={(e) => setReqForm({ ...reqForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <label className="font-bold text-slate-700">Requested Reagent &amp; Item Lines *</label>
                    <span className="text-[10px] text-slate-400 block">Select from reagents catalog with live stock balances or type item</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCatalogPicker(!showCatalogPicker)}
                      className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-colors flex items-center gap-1.5 ${showCatalogPicker
                          ? 'bg-blue-50 border-blue-200 text-[#1B669E]'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                    >
                      <Refrigerator size={13} className="text-[#1B669E]" />
                      <span>{showCatalogPicker ? 'Hide Catalog' : 'Browse Catalog Stock'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleAddReqLine}
                      className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#1B669E]/10 text-[#1B669E] hover:bg-[#1B669E]/20"
                    >
                      + Add Line
                    </button>
                  </div>
                </div>

                {/* Expandable Catalog Drawer with Stock Levels */}
                {showCatalogPicker && (
                  <div className="mb-3 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="relative flex-1">
                        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search cold storage & laboratory stock catalog..."
                          value={catalogSearchTerm}
                          onChange={(e) => setCatalogSearchTerm(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      </div>
                      <select
                        value={catalogCategoryFilter}
                        onChange={(e) => setCatalogCategoryFilter(e.target.value)}
                        className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700"
                      >
                        {ITEM_CATEGORIES.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div className="max-h-48 overflow-y-auto divide-y divide-slate-200/70 border border-slate-200 rounded-lg bg-white">
                      {selectableReagents
                        .filter(i => {
                          if (catalogCategoryFilter !== 'All' && i.category !== catalogCategoryFilter) return false;
                          if (catalogSearchTerm.trim()) {
                            const q = catalogSearchTerm.toLowerCase();
                            return i.item_name.toLowerCase().includes(q) || (i.storage_location && i.storage_location.toLowerCase().includes(q));
                          }
                          return true;
                        })
                        .slice(0, 30)
                        .map(item => (
                          <div key={item.id} className="p-2 px-3 flex items-center justify-between hover:bg-blue-50/50 transition-colors">
                            <div className="min-w-0 pr-2">
                              <span className="font-bold text-slate-900 block truncate text-xs">{item.item_name}</span>
                              <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                <span>{item.category}</span>
                                {item.storage_location && <span>• {item.storage_location}</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <div className="text-right">
                                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${item.storage_stock > 0
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-slate-100 text-slate-400'
                                  }`}>
                                  {item.storage_stock} {item.unit_of_measure} Storage
                                </span>
                                {item.bench_stock > 0 && (
                                  <span className="block text-[10px] text-[#1B669E] font-medium">
                                    {item.bench_stock} on Bench
                                  </span>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => handleAddCatalogItemToReq(item)}
                                className="px-2.5 py-1 text-xs font-semibold bg-[#1B669E] text-white hover:bg-[#155280] rounded-lg shadow-xs"
                              >
                                + Add
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Item Lines */}
                <div className="space-y-2.5 max-h-72 overflow-y-visible pr-1">
                  {reqForm.items.map((line, idx) => {
                    const stockInfo = getReagentStock(line.item_name);
                    const isDropdownOpen = activeLineDropdown === idx;

                    return (
                      <div key={idx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                        <div className="flex items-center gap-2">
                          {/* Searchable input with stock dropdown */}
                          <div className="relative flex-1">
                            <input
                              type="text"
                              placeholder="Search reagent name or type consumable..."
                              required
                              value={line.item_name}
                              onFocus={() => setActiveLineDropdown(idx)}
                              onChange={(e) => {
                                handleReqLineChange(idx, 'item_name', e.target.value);
                                setActiveLineDropdown(idx);
                              }}
                              className="w-full pl-2.5 pr-8 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#1B669E]"
                            />
                            <button
                              type="button"
                              onClick={() => setActiveLineDropdown(isDropdownOpen ? null : idx)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                              tabIndex={-1}
                            >
                              <ChevronDown size={14} className={`transition-transform duration-150 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {/* Floating Dropdown */}
                            {isDropdownOpen && (
                              <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-48 overflow-y-auto divide-y divide-slate-100">
                                <div className="p-2 bg-slate-50/90 sticky top-0 border-b border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-600 z-10">
                                  <span>Select Reagent (with Stock Balance)</span>
                                  <span className="text-slate-400 font-normal">{getFilteredCatalog(line.item_name).length} items</span>
                                </div>
                                {getFilteredCatalog(line.item_name).length === 0 ? (
                                  <div className="p-2.5 text-center text-slate-400 text-xs">
                                    No reagent matched. You can type any custom item name!
                                  </div>
                                ) : (
                                  getFilteredCatalog(line.item_name).map(item => (
                                    <div
                                      key={item.id}
                                      onClick={() => handleSelectReqItem(idx, item)}
                                      className="p-2 hover:bg-blue-50/70 cursor-pointer transition-colors flex items-center justify-between text-left"
                                    >
                                      <div className="min-w-0 pr-2">
                                        <span className="font-bold text-slate-900 block truncate text-xs">{item.item_name}</span>
                                        <span className="text-[10px] text-slate-500">{item.category} • {item.storage_location}</span>
                                      </div>
                                      <div className="text-right shrink-0">
                                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${item.storage_stock > 0
                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                            : 'bg-slate-100 text-slate-400'
                                          }`}>
                                          {item.storage_stock} {item.unit_of_measure} Storage
                                        </span>
                                        {item.bench_stock > 0 && (
                                          <span className="block text-[10px] text-[#1B669E] font-medium">
                                            ({item.bench_stock} on Bench)
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <input
                              type="number"
                              min="1"
                              required
                              placeholder="Qty"
                              value={line.requested_quantity}
                              onChange={(e) => handleReqLineChange(idx, 'requested_quantity', Number(e.target.value))}
                              className="w-16 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-center"
                            />
                            <select
                              value={line.unit_of_measure}
                              onChange={(e) => handleReqLineChange(idx, 'unit_of_measure', e.target.value)}
                              className="w-24 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                            >
                              {UOM_OPTIONS.map(u => (
                                <option key={u} value={u}>{u}</option>
                              ))}
                            </select>
                            {reqForm.items.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveReqLine(idx)}
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg"
                              >
                                <X size={14} />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Live Stock Balance Chip */}
                        {stockInfo && (
                          <div className="flex items-center justify-between text-[10px] text-slate-500 px-1">
                            <span className="flex items-center gap-1">
                              <Refrigerator size={11} className="text-[#1B669E]" />
                              Available in Storage: <strong className="text-slate-800">{stockInfo.storage_stock} {stockInfo.unit_of_measure}</strong>
                              {stockInfo.storage_location && ` (${stockInfo.storage_location})`}
                            </span>
                            <span>
                              Active Bench Stock: <strong className={stockInfo.bench_stock > 0 ? 'text-[#1B669E]' : 'text-rose-600'}>{stockInfo.bench_stock} {stockInfo.unit_of_measure}</strong>
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => { setIsReqModalOpen(false); setActiveLineDropdown(null); setShowCatalogPicker(false); }}
                  className="px-4 py-2 font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReq}
                  className="px-4 py-2 font-semibold text-white bg-[#1B669E] hover:bg-[#155280] rounded-lg disabled:opacity-50 shadow-xs"
                >
                  {submittingReq ? 'Submitting...' : 'Submit to Lab Stock Manager'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DRAWER / MODAL: View Requisition Items ── */}
      {selectedReq && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-start justify-center p-4 pt-10 sm:pt-16 overflow-y-auto">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-md overflow-hidden mb-8">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/60">
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  Requisition #{selectedReq.ref_number || selectedReq.id}
                </h3>
                <span className="text-[11px] text-slate-500 font-medium">{selectedReq.requesting_unit} Unit</span>
              </div>
              <button onClick={() => setSelectedReq(null)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Status:</span>
                  <span className="font-bold text-slate-900">{selectedReq.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Urgency:</span>
                  <span className="font-semibold text-slate-800">{selectedReq.urgency}</span>
                </div>
                {selectedReq.notes && (
                  <div>
                    <span className="text-slate-500 block">Notes:</span>
                    <span className="text-slate-800 font-medium">{selectedReq.notes}</span>
                  </div>
                )}
                {selectedReq.rejection_reason && (
                  <div className="text-rose-700 bg-rose-50 p-2 rounded border border-rose-200">
                    <span className="font-bold block">Rejection Reason:</span>
                    <span>{selectedReq.rejection_reason}</span>
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-bold text-slate-800 mb-2">Item Lines:</h4>
                {loadingReqItems ? (
                  <div className="text-center py-4 text-slate-400">Loading item lines...</div>
                ) : reqItems.length === 0 ? (
                  <div className="text-center py-4 text-slate-400">No item lines found.</div>
                ) : (
                  <div className="space-y-2">
                    {reqItems.map(item => (
                      <div key={item.id} className="p-2.5 rounded-lg border border-slate-200 flex justify-between items-center bg-white">
                        <div>
                          <span className="font-bold text-slate-900 block">{item.item_name}</span>
                          <span className="text-[10px] text-slate-400">{item.item_category}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-slate-800">{item.requested_quantity} {item.unit_of_measure}</span>
                          {item.approved_quantity !== null && item.approved_quantity !== undefined && (
                            <span className="text-[10px] text-emerald-600 block font-semibold">
                              Approved: {item.approved_quantity} {item.unit_of_measure}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setSelectedReq(null)}
                  className="px-4 py-1.5 font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Transfer from Storage Unit to Unit Bench Stock ── */}
      {transferModalItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-start justify-center p-4 pt-10 sm:pt-16 overflow-y-auto">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-md overflow-hidden mb-8">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/60">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Refrigerator className="text-[#1B669E]" size={16} />
                Transfer Reagent to Bench Stock
              </h3>
              <button onClick={() => setTransferModalItem(null)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleTransferToBench} className="p-5 space-y-3.5 text-xs">
              <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl space-y-1">
                <span className="font-bold text-slate-900 block text-xs">{transferModalItem.item.item_name}</span>
                <div className="flex items-center justify-between text-[11px] text-slate-600">
                  <span>Source Storage:</span>
                  <span className="font-semibold text-slate-800">{transferModalItem.unit.label}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-600">
                  <span>Target Bench:</span>
                  <span className="font-bold text-[#1B669E]">{activeUnit} Laboratory Bench</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-600">
                  <span>Available in Storage:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {transferModalItem.item.quantity_in_hand} {transferModalItem.item.unit_of_measure}
                  </span>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Quantity to Transfer ({transferModalItem.item.unit_of_measure}) *
                </label>
                <input
                  type="number"
                  min="1"
                  max={transferModalItem.item.quantity_in_hand || 100}
                  step="1"
                  required
                  value={transferQty}
                  onChange={(e) => setTransferQty(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-[#1B669E] text-slate-900 font-bold"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  This transfers the reagent onto your active bench in &quot;Stock In Use&quot; ready for daily test logging.
                </span>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setTransferModalItem(null)}
                  className="px-3.5 py-1.5 font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={transferring}
                  className="px-4 py-1.5 font-semibold text-white bg-[#1B669E] hover:bg-[#155280] rounded-lg disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {transferring ? 'Transferring...' : 'Confirm Transfer to Bench'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
