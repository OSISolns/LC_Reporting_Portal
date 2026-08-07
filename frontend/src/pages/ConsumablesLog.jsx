import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ClipboardList, Package, Boxes, TrendingDown, RefreshCw, Loader2,
  Plus, Search, Calendar, Building, AlertCircle, CheckCircle2, FileSpreadsheet,
  ArrowRight, X, Send, Clock, ChevronDown, ChevronUp, Layers, Activity, Hash,
  Sparkles, Link2, AlertTriangle, BarChart3, Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/axios';
import { toast } from 'react-hot-toast';
import ExcelJS from 'exceljs/dist/exceljs.min.js';

const today = () => new Date().toISOString().slice(0, 10);

const getItemStatus = (expiryDate) => {
  if (!expiryDate) return { text: 'Active', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  const exp = new Date(expiryDate);
  const today = new Date();
  if (exp < today) return { text: 'Expired', color: 'bg-rose-50 text-rose-700 border-rose-200' };
  const diff = (exp - today) / (1000 * 60 * 60 * 24);
  if (diff <= 90) return { text: 'Near Expiry', color: 'bg-amber-50 text-amber-700 border-amber-200' };
  return { text: 'Active', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
};

export default function ConsumablesLog({ defaultDeptName = null }) {
  const { user } = useAuth();
  
  // Shared inventory (synced with Stock Manager portal)
  const [departments, setDepartments] = useState([]);
  const [expandedItemIds, setExpandedItemIds] = useState({});

  const toggleExpandItem = (itemId) => {
    setExpandedItemIds(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  };
  
  const userDept = useMemo(() => {
    if (defaultDeptName && departments.length > 0) {
      let found = departments.find(d => d.name.toUpperCase() === defaultDeptName.toUpperCase());
      if (!found && defaultDeptName.toUpperCase().includes('DENTAL')) {
        found = departments.find(d => d.name.toUpperCase() === 'DENTAL' || d.name.toUpperCase().includes('DENTAL'));
      }
      if (found) return { id: String(found.id), name: found.name };
    }

    const r = String(user?.role || '').toLowerCase();
    let deptName = null;
    if (r.includes('nurse') || r.includes('nursing')) deptName = 'NURSING';
    else if (r.includes('dental_lab') || r.includes('dental_tech')) deptName = 'DENTAL LAB';
    else if (r.includes('dental') || r.includes('dentist') || r.includes('ortho') || r.includes('prostho')) deptName = 'DENTAL CLINIC';
    else if (r.includes('lab') || r.includes('pathology') || r.includes('medtech')) deptName = 'LABORATORY';
    else if (r.includes('stock') || r.includes('procurement')) deptName = 'GENERAL STORE';
    else if (r.includes('physio')) deptName = 'PHYSIO';
    else if (r.includes('operations') || r.includes('ops')) deptName = 'OPERATIONS';
    else if (r.includes('imaging') || r.includes('radio') || r.includes('sono')) deptName = 'IMAGING';
    else if (r === 'admin') return null;

    if (!deptName) return null;
    let found = departments.find(d => d.name.toUpperCase() === deptName.toUpperCase());
    if (!found && deptName.includes('DENTAL')) {
      found = departments.find(d => d.name.toUpperCase() === 'DENTAL' || d.name.toUpperCase().includes('DENTAL'));
    }
    return found ? { id: String(found.id), name: found.name } : null;
  }, [user, departments, defaultDeptName]);

  // True for Dental (Clinic & Lab), Physio, and Lab — enables the 3-mode
  // logging selector (Log Units / Mark In Use / Mark Finished).
  const useDentalMode = useMemo(() => {
    const deptName = (userDept?.name || defaultDeptName || '').toUpperCase();
    return ['DENTAL', 'PHYSIO', 'LABORATORY', 'LAB'].some(k => deptName.includes(k));
  }, [userDept, defaultDeptName]);

  const generalStoreDept = useMemo(() => {
    return departments.find(d => d.name.toUpperCase() === 'GENERAL STORE') || null;
  }, [departments]);

  const isAdmin = user?.role === 'admin';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [distributedStock, setDistributedStock] = useState([]);
  const [entries, setEntries] = useState([]);
  const [summary, setSummary] = useState(null);

  // Form state
  const [formDept, setFormDept] = useState(userDept ? userDept.id : '');
  const [formItemId, setFormItemId] = useState('');
  const [formItemSearch, setFormItemSearch] = useState('');
  const [formQty, setFormQty] = useState('');
  const [formNotes, setFormNotes] = useState('');
  // Nursing wards + session (AM 07:00–14:59 / PM 15:00–late, auto by time).
  const currentSession = () => (new Date().getHours() < 15 ? 'AM' : 'PM');
  const [formWard, setFormWard] = useState('');
  const [formSession, setFormSession] = useState(currentSession());
  // Dental/Physio/Lab: 'units' = normal qty entry, 'in_use' = mark open (no deduction), 'finished' = deduct all remaining
  const [logMode, setLogMode] = useState('units');

  // ── Lumina AI: Case / Work Order linking (Dental/Physio/Lab only) ──────────────
  const [openCases, setOpenCases] = useState([]);          // dental lab + clinic open cases
  const [caseSearch, setCaseSearch] = useState('');         // search filter on the picker
  const [caseDropOpen, setCaseDropOpen] = useState(false);  // dropdown visibility
  const [selectedCase, setSelectedCase] = useState(null);   // { id, case_ref, label, case_type }
  const [loadingCases, setLoadingCases] = useState(false);

  // ── Requisition "In Use" block state ───────────────────────────────────────
  const [reqBlockedItems, setReqBlockedItems] = useState([]);

  // ── Lumina AI Report panel ────────────────────────────────────────────
  const [luminaOpen, setLuminaOpen] = useState(false);
  const [luminaFrom, setLuminaFrom] = useState(() => new Date(Date.now() - 30*24*60*60*1000).toISOString().slice(0,10));
  const [luminaTo,   setLuminaTo]   = useState(() => new Date().toISOString().slice(0,10));
  const [luminaReport, setLuminaReport] = useState(null);
  const [luminaLoading, setLuminaLoading] = useState(false);

  const isHodOrStock = useMemo(() => {
    const r = String(user?.role || '').toLowerCase();
    return ['admin','dental_hod','dental_lab_manager','stock_manager','procurement','deputy_coo','coo'].some(k => r.includes(k));
  }, [user]);


  // Filters
  const [filterDept, setFilterDept] = useState(userDept ? userDept.id : '');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  // Tabs
  const [activeSubTab, setActiveSubTab] = useState('history'); // 'history', 'stock', 'requisitions', 'deactivated'
  const [stockTab, setStockTab] = useState('local'); // 'local', 'central'
  const [stockSearchTerm, setStockSearchTerm] = useState('');

  // Deactivated & Expired Items
  const [deactivatedItems, setDeactivatedItems] = useState([]);
  const [deactSearchTerm, setDeactSearchTerm] = useState('');
  const [deactModalItem, setDeactModalItem] = useState(null);
  const [deactReasonInput, setDeactReasonInput] = useState('');
  const [submittingDeact, setSubmittingDeact] = useState(false);

  // Consumption History pagination (15 rows per page)
  const HISTORY_PAGE_SIZE = 15;
  const [historyPage, setHistoryPage] = useState(1);

  // Requisitions to Stock Manager
  const [requisitions, setRequisitions] = useState([]);
  const [reqCart, setReqCart] = useState([]);        // [{ item_id, name, quantity, unit }]
  const [reqItemId, setReqItemId] = useState('');
  const [reqQty, setReqQty] = useState('');
  const [reqUrgency, setReqUrgency] = useState('Normal');
  const [reqNotes, setReqNotes] = useState('');
  const [submittingReq, setSubmittingReq] = useState(false);

  const [masterItems, setMasterItems] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [pickerTab, setPickerTab] = useState('All');
  const [reqDropdownOpen, setReqDropdownOpen] = useState(false);
  const [reqItemSearch, setReqItemSearch] = useState('');
  const [reqPickerTab, setReqPickerTab] = useState('All');

  // Sync role-based department restrictions when user object is loaded
  useEffect(() => {
    if (userDept && userDept.id) {
      setFormDept(userDept.id);
      setFilterDept(userDept.id);
    }
  }, [userDept?.id, userDept?.name]);

  // Fetch open dental cases whenever the dental mode is active
  useEffect(() => {
    if (!useDentalMode) return;
    const deptName = (userDept?.name || defaultDeptName || '').toUpperCase();
    const isLabUser = deptName.includes('DENTAL LAB');
    setLoadingCases(true);
    const requests = [
      isLabUser
        ? api.get('/dental/cases', { params: { limit: 100 } }).catch(() => null)
        : null,
      api.get('/dental/clinic-cases', { params: { limit: 100 } }).catch(() => null),
    ];
    Promise.all(requests).then(([labRes, clinicRes]) => {
      const labCases = (labRes?.data?.data || []).map(c => ({
        id: c.id,
        case_ref: c.case_ref,
        label: `${c.case_ref} — ${c.work_done || 'Lab'}${c.patient_name ? ' • ' + c.patient_name : ''}`,
        case_type: c.work_done || 'Lab',
        status: c.status,
      })).filter(c => c.status !== 'Delivered');
      const clinicCases = (clinicRes?.data?.data || []).map(c => ({
        id: c.id,
        case_ref: c.id ? `CLINIC-${c.id}` : '',
        label: `CLINIC-${c.id} — ${c.treatment_summary || 'Clinic'}${c.patient_name ? ' • ' + c.patient_name : ''}`,
        case_type: 'Clinic',
        status: c.status,
      })).filter(c => c.status !== 'Completed');
      setOpenCases([...labCases, ...clinicCases]);
    }).finally(() => setLoadingCases(false));
  }, [useDentalMode, userDept?.name, defaultDeptName]);

  const filteredCases = useMemo(() => {
    if (!caseSearch.trim()) return openCases;
    const q = caseSearch.toLowerCase();
    return openCases.filter(c => c.label.toLowerCase().includes(q));
  }, [openCases, caseSearch]);

  const generateLuminaReport = async () => {
    setLuminaLoading(true);
    try {
      const deptId = userDept?.id || null;
      const res = await api.post('/ai/dental/consumables-report', {
        department_name: userDept?.name || defaultDeptName || undefined,
        from_date: luminaFrom,
        to_date:   luminaTo,
      });
      if (res.data?.success) setLuminaReport(res.data.data);
    } catch (err) {
      toast.error('Lumina AI report generation failed.');
    } finally { setLuminaLoading(false); }
  };

  const loadData = async (silent = false) => {
    const isSilent = silent || initialLoaded;
    isSilent ? setRefreshing(true) : setLoading(true);
    try {
      const targetDept = userDept ? userDept.id : filterDept;
      const [deptRes, stockRes, logRes, sumRes, reqRes, masterRes, deactRes] = await Promise.allSettled([
        api.get('/clinical/inventory/departments'),
        api.get('/clinical/inventory/distributed-stock?include_central=true'),
        api.get('/clinical/inventory/consumables', {
          params: { department_id: targetDept || undefined, from: filterFrom || undefined, to: filterTo || undefined },
        }),
        api.get('/clinical/inventory/consumables/summary', {
          params: { department_id: targetDept || undefined }
        }),
        api.get('/clinical/inventory/requisitions'),
        api.get('/clinical/inventory/master'),
        api.get('/clinical/inventory/consumables/deactivated', {
          params: { department_id: targetDept || undefined }
        }),
      ]);
      if (deptRes.status === 'fulfilled' && deptRes.value.data.success) setDepartments(deptRes.value.data.data || []);
      if (stockRes.status === 'fulfilled' && stockRes.value.data.success) setDistributedStock(stockRes.value.data.data || []);
      if (logRes.status === 'fulfilled' && logRes.value.data.success) setEntries(logRes.value.data.data || []);
      if (sumRes.status === 'fulfilled' && sumRes.value.data.success) setSummary(sumRes.value.data.data);
      if (reqRes.status === 'fulfilled' && reqRes.value.data.success) setRequisitions(reqRes.value.data.data || []);
      if (masterRes.status === 'fulfilled' && masterRes.value.data.success) setMasterItems(masterRes.value.data.data || []);
      if (deactRes.status === 'fulfilled' && deactRes.value.data.success) setDeactivatedItems(deactRes.value.data.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load consumables data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setInitialLoaded(true);
    }
  };

  const handleConfirmDeactivate = async () => {
    if (!deactModalItem) return;
    setSubmittingDeact(true);
    try {
      const res = await api.post('/clinical/inventory/consumables/deactivate', {
        dept_stock_id: deactModalItem.dept_stock_id || null,
        batch_id: deactModalItem.batch_id || null,
        item_id: deactModalItem.item_id,
        department_id: userDept ? userDept.id : formDept,
        reason: deactReasonInput.trim() || 'Expired Item Write-off',
      });
      if (res.data?.success) {
        toast.success('Expired item deactivated successfully');
        setDeactModalItem(null);
        setDeactReasonInput('');
        loadData(true);
      } else {
        toast.error(res.data?.message || 'Failed to deactivate item');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error deactivating item');
    } finally {
      setSubmittingDeact(false);
    }
  };

  const handleReactivateItem = async (row) => {
    try {
      const res = await api.post('/clinical/inventory/consumables/reactivate', {
        dept_stock_id: row.dept_stock_id || null,
        batch_id: row.batch_id || null,
      });
      if (res.data?.success) {
        toast.success('Item reactivated successfully');
        loadData(true);
      } else {
        toast.error(res.data?.message || 'Failed to reactivate item');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error reactivating item');
    }
  };

  useEffect(() => {
    loadData();
  }, [filterDept, filterFrom, filterTo, userDept?.id]);

  // Items available in the selected department (cross-referenced from Stock Manager's Catalog + distributedStock),
  // filtered by Department & Sub-department (Dental Clinic, Dental Lab, Nursing, Lab, Imaging, etc.).
  const deptStockItems = useMemo(() => {
    const activeD = userDept ? userDept.id : formDept;
    if (!activeD) return [];

    const activeDeptObj = departments.find(d => String(d.id) === String(activeD));
    const activeDeptName = (activeDeptObj?.name || defaultDeptName || '').toUpperCase();
    const gsId = generalStoreDept ? String(generalStoreDept.id) : '134';
    const isGS = String(activeD) === gsId || activeDeptName === 'GENERAL STORE';

    // Map distributed stock for local department
    const localDeptStockMap = new Map();
    for (const row of distributedStock) {
      if (String(row.department_id) === String(activeD)) {
        const qty = Number(row.quantity || 0);
        localDeptStockMap.set(row.item_id, (localDeptStockMap.get(row.item_id) || 0) + qty);
      }
    }

    const list = [];
    const seenItemIds = new Set();

    // Helper to determine if an item is strictly a Dental/Clinical Lab material
    const checkIsExplicitLab = (item) => {
      const dept = (item.department || '').toUpperCase();
      const storage = (item.storage || '').toUpperCase();
      const cat = (item.category || '').toUpperCase();
      const name = (item.name || '').toUpperCase();

      if (dept.includes('LAB') || storage.includes('LAB') || cat.includes('LAB')) {
        return true;
      }

      const labKeywords = [
        'ACRYLIC', 'PORCELAIN', 'CAD-CAM', 'CAD/CAM', 'WAX', 'PLASTER', 'GYPSUM', 'MILLING', 'ALLOY',
        'PROSTHET', 'PROSTHETIC', 'DENTURE', 'ZIRCONIA', 'CERAMIC', 'INVESTMENT', 'MONOMER', 'POLYMER',
        'FLASK', 'DIE STONE', 'DENTAL STONE', 'CASTING', 'SOLDER', 'SOLDERING', 'DUPLICATING', 'ARTICULATOR',
        'MODELLING', 'ACRYLIC TEETH', 'TEETH SET', 'BLANK', 'BLOCK', 'LAB BUR', 'LABORATORY', 'PONTIC',
        'FURNACE', 'SEPARATING', 'SEPARATOR', 'SPLINT RESIN', 'EXPANSION SCREW'
      ];

      return labKeywords.some(k => name.includes(k));
    };

    // Helper to determine if an item is strictly a Nursing consumable
    const checkIsNursingItem = (item) => {
      const dept = (item.department || '').toUpperCase();
      const name = (item.name || '').toUpperCase();

      if (dept.includes('NURSING')) return true;

      const nursingKeywords = [
        'ADRENALINE', 'AQUABLOC', 'AQUABLOCK', 'PLASTER', 'BUSCOPAN', 'DICLOFENAC', 'ACCU-CHECK',
        'CANNULA', 'INFUSION', 'SYRINGE', 'NEEDLE', 'GAUZE', 'COTTON', 'BANDAGE', 'SALINE', 'SODIUM CHLORIDE',
        'DEXTROSE', 'RINGER', 'PARACETAMOL', 'HYDROCORTISONE', 'CLEFT', 'IV SET', 'AIGUILLE'
      ];
      return nursingKeywords.some(k => name.includes(k));
    };

    // 1. Process master items from Stock Manager's Catalog
    if (masterItems && masterItems.length > 0) {
      for (const item of masterItems) {
        const itemDeptName = (item.department || '').toUpperCase();
        const isLabItem = checkIsExplicitLab(item);
        const isNursingItem = checkIsNursingItem(item);

        let matchesDept = false;
        if (isGS) {
          matchesDept = true;
        } else if (activeDeptName === 'DENTAL CLINIC') {
          // Strictly exclude Dental Lab items from Dental Clinic
          matchesDept = (itemDeptName.includes('DENTAL') || itemDeptName.includes('CLINIC')) && !isLabItem;
        } else if (activeDeptName === 'DENTAL LAB') {
          // Matches DENTAL department items specifically for DENTAL LAB
          matchesDept = itemDeptName.includes('DENTAL LAB') || isLabItem;
        } else if (activeDeptName === 'DENTAL') {
          matchesDept = itemDeptName.includes('DENTAL');
        } else if (activeDeptName === 'LABORATORY' || activeDeptName === 'LAB') {
          // Strictly exclude Nursing items from Laboratory!
          if (isNursingItem) {
            matchesDept = false;
          } else if (itemDeptName.includes('LAB') || isLabItem) {
            matchesDept = true;
          } else if (itemDeptName && (itemDeptName.includes('NURSING') || itemDeptName.includes('DENTAL') || itemDeptName.includes('PHYSIO'))) {
            matchesDept = false;
          } else {
            matchesDept = localDeptStockMap.has(item.id);
          }
        } else if (activeDeptName === 'NURSING') {
          if (isLabItem) {
            matchesDept = false;
          } else if (itemDeptName.includes('NURSING') || isNursingItem) {
            matchesDept = true;
          } else if (itemDeptName && (itemDeptName.includes('LAB') || itemDeptName.includes('DENTAL') || itemDeptName.includes('PHYSIO'))) {
            matchesDept = false;
          } else {
            matchesDept = localDeptStockMap.has(item.id);
          }
        } else if (activeDeptName && itemDeptName) {
          matchesDept = itemDeptName.includes(activeDeptName) || activeDeptName.includes(itemDeptName);
        }

        // Also check if item exists in local department_stock
        const localQty = localDeptStockMap.get(item.id) || 0;
        if (localQty > 0) {
          if (activeDeptName === 'DENTAL CLINIC' && isLabItem) {
            matchesDept = false; // Never show Lab items in Dental Clinic!
          } else if ((activeDeptName === 'LABORATORY' || activeDeptName === 'LAB') && isNursingItem) {
            matchesDept = false; // Never show Nursing items in Laboratory!
          } else {
            matchesDept = true;
          }
        }

        if (matchesDept) {
          seenItemIds.add(item.id);
          const centralQty = Number(item.quantity || 0);
          const totalAvail = isGS ? centralQty : localQty;

          list.push({
            item_id: item.id,
            name: item.name,
            unit: item.unit_of_measure || 'pcs',
            category: item.category || 'medical_supplies',
            available: totalAvail,
            central: centralQty,
            isLocal: true,
            department: item.department || activeDeptName
          });
        }
      }
    }

    // 2. Include any distributed stock rows that weren't in masterItems
    for (const row of distributedStock) {
      if (String(row.department_id) === String(activeD) && !seenItemIds.has(row.item_id)) {
        const isLabRow = checkIsExplicitLab(row);
        const isNursingRow = checkIsNursingItem(row);

        if (activeDeptName === 'DENTAL CLINIC' && isLabRow) continue;
        if ((activeDeptName === 'LABORATORY' || activeDeptName === 'LAB') && isNursingRow) continue;
        if (activeDeptName === 'NURSING' && isLabRow) continue;

        seenItemIds.add(row.item_id);
        const qty = Number(row.quantity || 0);
        list.push({
          item_id: row.item_id,
          name: row.name,
          unit: row.unit_of_measure || 'pcs',
          category: row.category || 'medical_supplies',
          available: qty,
          central: 0,
          isLocal: true,
          department: activeDeptName
        });
      }
    }

    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [userDept, formDept, defaultDeptName, departments, distributedStock, masterItems, generalStoreDept]);

  const requisitionItems = useMemo(() => {
    const activeD = userDept ? userDept.id : (filterDept || formDept);
    const activeDeptObj = departments.find(d => String(d.id) === String(activeD));
    const activeDeptName = (activeDeptObj?.name || defaultDeptName || '').toUpperCase();
    const gsId = generalStoreDept ? String(generalStoreDept.id) : '134';
    const isGS = String(activeD) === gsId || activeDeptName === 'GENERAL STORE' || (!activeD && isAdmin);

    const gsStockMap = new Map();
    for (const row of distributedStock) {
      if (String(row.department_id) === gsId || row.department === 'GENERAL STORE') {
        const qty = Number(row.quantity || 0);
        gsStockMap.set(row.item_id, (gsStockMap.get(row.item_id) || 0) + qty);
      }
    }

    const list = [];
    if (masterItems && masterItems.length > 0) {
      for (const item of masterItems) {
        const itemDeptName = (item.department || '').toUpperCase();
        const itemStorage = (item.storage || '').toUpperCase();
        const itemNameUpper = (item.name || '').toUpperCase();

        let matchesDept = false;
        if (isGS) {
          matchesDept = true;
        } else if (activeDeptName === 'DENTAL CLINIC') {
          const isExplicitLab = itemStorage.includes('LAB') ||
            ['ACRYLIC', 'PORCELAIN', 'CAD-CAM', 'WAX', 'PLASTER', 'GYPSUM', 'MILLING', 'ALLOY', 'PROSTHET'].some(k => itemNameUpper.includes(k));
          matchesDept = (itemDeptName.includes('DENTAL') || itemDeptName.includes('CLINIC')) && !isExplicitLab;
        } else if (activeDeptName === 'DENTAL LAB') {
          const isLabItem = itemStorage.includes('LAB') ||
            ['ACRYLIC', 'PORCELAIN', 'CAD-CAM', 'WAX', 'PLASTER', 'GYPSUM', 'MILLING', 'ALLOY', 'PROSTHET', 'DENTURE', 'CROWN'].some(k => itemNameUpper.includes(k));
          matchesDept = itemDeptName.includes('DENTAL LAB') || (itemDeptName.includes('DENTAL') && isLabItem);
        } else if (activeDeptName === 'DENTAL') {
          matchesDept = itemDeptName.includes('DENTAL');
        } else if (activeDeptName) {
          matchesDept = itemDeptName.includes(activeDeptName) || activeDeptName.includes(itemDeptName);
        }

        if (matchesDept) {
          const gsQty = Number(item.quantity || 0) || gsStockMap.get(item.id) || 0;
          list.push({
            item_id: item.id,
            name: item.name,
            unit: item.unit_of_measure || 'pcs',
            category: item.category || 'medical_supplies',
            available: gsQty,
            department: item.department || activeDeptName
          });
        }
      }
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [masterItems, distributedStock, userDept, filterDept, formDept, defaultDeptName, departments, generalStoreDept, isAdmin]);

  const selectedItem = deptStockItems.find(i => String(i.item_id) === String(formItemId));

  // Compute items currently declared "In Use" (qty=0, finished_at is null) for active department
  const openInUseItemIds = useMemo(() => {
    const set = new Set();
    if (Array.isArray(entries)) {
      for (const entry of entries) {
        if (Number(entry.quantity) === 0 && !entry.finished_at) {
          set.add(Number(entry.item_id));
        }
      }
    }
    return set;
  }, [entries]);

  const isSelectedItemInUse = useMemo(() => {
    if (!selectedItem) return false;
    return openInUseItemIds.has(Number(selectedItem.item_id));
  }, [selectedItem, openInUseItemIds]);

  // Is the active department Nursing? (drives the Ward/Session inputs)
  const activeDeptId = userDept ? userDept.id : formDept;
  const isNursingActive = String(activeDeptId) === '121' ||
    (departments.find(d => String(d.id) === String(activeDeptId))?.name || '').toUpperCase() === 'NURSING';

  const groupedAndFilteredItems = useMemo(() => {
    let items = deptStockItems;
    
    // Filter out items that do not belong to the local department
    // (unless the active department is General Store).
    const activeD = userDept ? userDept.id : formDept;
    const gsId = generalStoreDept ? String(generalStoreDept.id) : '134';
    const isGS = String(activeD) === gsId;
    if (activeD && !isGS) {
      items = items.filter(i => i.isLocal);
    }

    if (formItemSearch.trim()) {
      const q = formItemSearch.toLowerCase();
      items = items.filter(i => i.name.toLowerCase().includes(q));
    }
    if (pickerTab === 'In Stock') {
      items = items.filter(i => i.available > 0);
    } else if (pickerTab === 'Medications') {
      items = items.filter(i => i.category === 'medications');
    } else if (pickerTab === 'Consumables') {
      items = items.filter(i => i.category === 'consumables');
    } else if (pickerTab === 'Sutures') {
      items = items.filter(i => i.category === 'sutures');
    }

    const groupsMap = new Map();
    for (const item of items) {
      const cat = item.category || 'medical_supplies';
      if (!groupsMap.has(cat)) groupsMap.set(cat, []);
      groupsMap.get(cat).push(item);
    }

    const groups = [];
    for (const [cat, catItems] of groupsMap.entries()) {
      groups.push({ category: cat, items: catItems });
    }

    const categoryOrder = ['medications', 'consumables', 'sutures', 'anesthetics', 'antiseptics', 'antidotes', 'housekeeping', 'cafetariat', 'stationery', 'suppository', 'medical_supplies'];
    return groups.sort((a, b) => {
      const indexA = categoryOrder.indexOf(a.category);
      const indexB = categoryOrder.indexOf(b.category);
      const valA = indexA === -1 ? 999 : indexA;
      const valB = indexB === -1 ? 999 : indexB;
      return valA - valB;
    });
  }, [deptStockItems, formItemSearch, pickerTab]);

  const reqGroupedAndFilteredItems = useMemo(() => {
    let items = requisitionItems;
    if (reqItemSearch.trim()) {
      const q = reqItemSearch.toLowerCase();
      items = items.filter(i => i.name.toLowerCase().includes(q));
    }
    if (reqPickerTab === 'In Stock' || reqPickerTab === 'General Store') {
      items = items.filter(i => i.available > 0);
    } else if (reqPickerTab === 'Medications') {
      items = items.filter(i => i.category === 'medications');
    } else if (reqPickerTab === 'Consumables') {
      items = items.filter(i => i.category === 'consumables');
    } else if (reqPickerTab === 'Sutures') {
      items = items.filter(i => i.category === 'sutures');
    }

    const groupsMap = new Map();
    for (const item of items) {
      const cat = item.category || 'medical_supplies';
      if (!groupsMap.has(cat)) groupsMap.set(cat, []);
      groupsMap.get(cat).push(item);
    }

    const groups = [];
    for (const [cat, catItems] of groupsMap.entries()) {
      groups.push({ category: cat, items: catItems });
    }

    const categoryOrder = ['medications', 'consumables', 'sutures', 'anesthetics', 'antiseptics', 'antidotes', 'housekeeping', 'cafetariat', 'stationery', 'suppository', 'medical_supplies'];
    return groups.sort((a, b) => {
      const indexA = categoryOrder.indexOf(a.category);
      const indexB = categoryOrder.indexOf(b.category);
      const valA = indexA === -1 ? 999 : indexA;
      const valB = indexB === -1 ? 999 : indexB;
      return valA - valB;
    });
  }, [requisitionItems, reqItemSearch, reqPickerTab]);

  // Consumption history paging — reset to page 1 whenever the data changes.
  useEffect(() => { setHistoryPage(1); }, [entries]);
  const totalHistoryPages = Math.max(1, Math.ceil(entries.length / HISTORY_PAGE_SIZE));
  const pagedEntries = entries.slice((historyPage - 1) * HISTORY_PAGE_SIZE, historyPage * HISTORY_PAGE_SIZE);

  const currentDeptStock = useMemo(() => {
    const activeD = userDept ? userDept.id : (filterDept || formDept);
    const activeDeptObj = departments.find(d => String(d.id) === String(activeD));
    const activeDeptName = (activeDeptObj?.name || defaultDeptName || '').toUpperCase();
    const gsId = generalStoreDept ? String(generalStoreDept.id) : '134';
    const isGS = String(activeD) === gsId || activeDeptName === 'GENERAL STORE' || (!activeD && isAdmin);

    if (stockTab === 'central') {
      let filteredCentral = masterItems;
      if (!isGS && activeDeptName) {
        filteredCentral = masterItems.filter(item => {
          const itemDeptName = (item.department || '').toUpperCase();
          const itemStorage = (item.storage || '').toUpperCase();
          const itemNameUpper = (item.name || '').toUpperCase();

          const isLabItem = itemStorage.includes('LAB') ||
            itemDeptName.includes('LAB') ||
            ['ACRYLIC', 'PORCELAIN', 'CAD-CAM', 'CAD/CAM', 'WAX', 'PLASTER', 'GYPSUM', 'MILLING', 'ALLOY', 'PROSTHET', 'PROSTHETIC', 'DENTURE', 'ZIRCONIA', 'CERAMIC', 'INVESTMENT', 'MONOMER', 'POLYMER', 'FLASK', 'DIE STONE', 'DENTAL STONE', 'CASTING', 'SOLDER', 'SOLDERING', 'DUPLICATING', 'ARTICULATOR', 'MODELLING', 'ACRYLIC TEETH', 'TEETH SET', 'BLANK', 'BLOCK', 'LAB BUR', 'LABORATORY', 'PONTIC', 'FURNACE', 'SEPARATING', 'SEPARATOR'].some(k => itemNameUpper.includes(k));

          if (activeDeptName === 'DENTAL CLINIC') {
            return (itemDeptName.includes('DENTAL') || itemDeptName.includes('CLINIC')) && !isLabItem;
          } else if (activeDeptName === 'DENTAL LAB') {
            return itemDeptName.includes('DENTAL LAB') || isLabItem;
          } else if (activeDeptName === 'DENTAL') {
            return itemDeptName.includes('DENTAL');
          }
          return itemDeptName.includes(activeDeptName) || activeDeptName.includes(itemDeptName);
        });
      }

      return filteredCentral.map(m => ({
        dept_stock_id: m.id,
        item_id: m.id,
        name: m.name,
        sku: m.sku,
        category: m.category,
        quantity: Number(m.quantity || 0),
        expiry_date: m.expiry_date,
        batch_number: m.batch_number,
        department: m.department || 'GENERAL STORE'
      }));
    }

    const activeDeptId = activeD;
    const localDeptBatches = distributedStock.filter(row => String(row.department_id) === String(activeDeptId));

    const result = [];
    const processedItemIds = new Set();

    for (const item of deptStockItems) {
      processedItemIds.add(String(item.item_id));
      const matchingBatches = localDeptBatches.filter(row => String(row.item_id) === String(item.item_id));

      if (matchingBatches.length > 0) {
        for (const b of matchingBatches) {
          result.push({
            dept_stock_id: b.dept_stock_id || item.item_id,
            item_id: item.item_id,
            name: item.name,
            sku: b.sku || item.sku || '',
            category: item.category,
            quantity: Number(b.quantity || 0),
            expiry_date: b.expiry_date || null,
            batch_number: b.batch_number || null,
            lot_number: b.lot_number || null,
            department: item.department
          });
        }
      } else {
        result.push({
          dept_stock_id: item.item_id,
          item_id: item.item_id,
          name: item.name,
          sku: item.sku || '',
          category: item.category,
          quantity: item.available,
          expiry_date: null,
          batch_number: null,
          lot_number: null,
          department: item.department
        });
      }
    }

    for (const b of localDeptBatches) {
      if (!processedItemIds.has(String(b.item_id))) {
        result.push({
          dept_stock_id: b.dept_stock_id || b.item_id,
          item_id: b.item_id,
          name: b.name,
          sku: b.sku || '',
          category: b.category,
          quantity: Number(b.quantity || 0),
          expiry_date: b.expiry_date || null,
          batch_number: b.batch_number || null,
          lot_number: b.lot_number || null,
          department: b.department || activeDeptName
        });
      }
    }

    return result;
  }, [stockTab, masterItems, deptStockItems, userDept, filterDept, formDept, defaultDeptName, departments, generalStoreDept, isAdmin, distributedStock]);

  const filteredDeptStock = useMemo(() => {
    let list = currentDeptStock;

    if (stockSearchTerm.trim()) {
      // Tokenize search query by whitespace and punctuation for flexible multi-word matching
      const tokens = stockSearchTerm.toLowerCase().trim().split(/[\s/\-_,()]+/).filter(Boolean);

      list = list.filter(row => {
        // Build a comprehensive searchable text string containing all item metadata
        const batchString = Array.isArray(row.batches)
          ? row.batches.map(b => `${b.batch_number || ''} ${b.lot_number || ''} ${b.supplier || ''}`).join(' ')
          : `${row.batch_number || ''} ${row.lot_number || ''}`;

        const itemSearchableText = [
          row.name,
          row.sku,
          row.category,
          row.department,
          row.unit,
          row.storage,
          batchString
        ].filter(Boolean).join(' ').toLowerCase();

        // Match if ALL search tokens exist within the item metadata text
        return tokens.every(token => itemSearchableText.includes(token));
      });
    }

    // For the local (department) view, aggregate quantities by item so that
    // multiple batches of the same item approved across requisitions appear as one,
    // but keep all batch variants in a `batches` array for expandable inspection.
    if (stockTab === 'local') {
      const itemMap = new Map();
      for (const row of list) {
        const key = row.item_id;
        if (!itemMap.has(key)) {
          itemMap.set(key, { ...row, quantity: Number(row.quantity || 0), batches: [row] });
        } else {
          const item = itemMap.get(key);
          item.quantity += Number(row.quantity || 0);
          item.batches.push(row);
        }
      }
      for (const item of itemMap.values()) {
        item.batches.sort((a, b) => {
          if (a.expiry_date && b.expiry_date) {
            return new Date(a.expiry_date) - new Date(b.expiry_date);
          }
          if (a.expiry_date) return -1;
          if (b.expiry_date) return 1;
          const lotA = String(a.lot_number || a.batch_number || '');
          const lotB = String(b.lot_number || b.batch_number || '');
          return lotA.localeCompare(lotB, undefined, { numeric: true });
        });
        const earliestWithExpiry = item.batches.find(b => b.expiry_date);
        item.expiry_date = earliestWithExpiry ? earliestWithExpiry.expiry_date : (item.batches[0]?.expiry_date || null);
        item.batch_number = earliestWithExpiry ? earliestWithExpiry.batch_number : (item.batches[0]?.batch_number || null);
      }
      return Array.from(itemMap.values()).sort((a, b) =>
        (a.name || '').localeCompare(b.name || '')
      );
    }

    return list;
  }, [currentDeptStock, stockSearchTerm, stockTab]);

  const filteredDeactItems = useMemo(() => {
    let list = deactivatedItems;
    if (deactSearchTerm.trim()) {
      const q = deactSearchTerm.toLowerCase();
      list = list.filter(item =>
        (item.name || '').toLowerCase().includes(q) ||
        (item.sku || '').toLowerCase().includes(q) ||
        (item.batch_number || '').toLowerCase().includes(q) ||
        (item.deactivation_reason || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [deactivatedItems, deactSearchTerm]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const activeD = userDept ? userDept.id : formDept;
    if (!activeD) return toast.error('Select a department.');
    if (!formItemId) return toast.error('Select an item to log.');

    let qty;
    let autoNote = null;

    if (useDentalMode && logMode === 'in_use') {
      // Usage marker only — no stock deduction, records item as open/being used
      qty = 0;
      autoNote = 'In Use';
    } else if (useDentalMode && logMode === 'finished') {
      // Mark fully consumed — deduct all remaining stock in one action
      qty = selectedItem?.available || 0;
      if (qty <= 0) return toast.error('No remaining stock to mark as finished.');
      autoNote = 'Finished';
    } else {
      // Standard units mode (all departments)
      qty = parseInt(formQty, 10);
      if (!qty || qty <= 0) return toast.error('Enter a quantity greater than 0.');
      if (selectedItem && qty > selectedItem.available) {
        return toast.error(`Only ${selectedItem.available} ${selectedItem.unit || 'unit(s)'} available.`);
      }
    }

    if (isNursingActive && !formWard) {
      return toast.error('Select a ward (Station 1 or Minor Surgery).');
    }

    setSubmitting(true);
    try {
      const res = await api.post('/clinical/inventory/consumables', {
        department_id: parseInt(activeD, 10),
        item_id: parseInt(formItemId, 10),
        quantity: qty,
        notes: formNotes || autoNote || undefined,
        ward: isNursingActive ? formWard : undefined,
        session: isNursingActive ? formSession : undefined,
        // ── Lumina AI case-linking ──────────────────────────────
        case_id:   selectedCase?.id       || undefined,
        case_ref:  selectedCase?.case_ref  || undefined,
        case_type: selectedCase?.case_type || undefined,
      });
      if (res.data.success) {
        toast.success(res.data.message || 'Consumption logged.');
        setFormItemId('');
        setFormItemSearch('');
        setFormQty('');
        setFormNotes('');
        setFormWard('');
        setFormSession(currentSession());
        setLogMode('units');
        setSelectedCase(null);
        setCaseSearch('');
        await loadData(true);
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to log consumption.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Requisitions to Stock Manager ──────────────────────────────────────────
  const activeReqDeptId = userDept ? userDept.id : filterDept;
  const deptRequisitions = useMemo(
    () => requisitions.filter(r => !activeReqDeptId || String(r.department_id) === String(activeReqDeptId)),
    [requisitions, activeReqDeptId]
  );

  const handleAddReqItem = () => {
    const item = requisitionItems.find(i => String(i.item_id) === String(reqItemId));
    if (!item) return toast.error('Select an item to request.');
    const qty = parseInt(reqQty, 10);
    if (!qty || qty <= 0) return toast.error('Enter a quantity greater than 0.');
    if (reqCart.some(c => String(c.item_id) === String(item.item_id))) {
      return toast.error('Item already added — remove it first to change the quantity.');
    }
    setReqCart(prev => [...prev, { item_id: item.item_id, name: item.name, quantity: qty, unit: item.unit }]);
    setReqItemId('');
    setReqQty('');
  };

  const handleRemoveReqItem = (itemId) => setReqCart(prev => prev.filter(c => String(c.item_id) !== String(itemId)));

  const handleQuickReorderItem = (item) => {
    if (!item) return;
    setActiveSubTab('requisitions');
    if (!reqCart.some(c => String(c.item_id) === String(item.item_id))) {
      setReqCart(prev => [...prev, { item_id: item.item_id, name: item.name, quantity: 10, unit: item.unit || 'pcs' }]);
      toast.success(`Added ${item.name} (10 ${item.unit || 'pcs'}) to requisition cart.`);
    } else {
      toast.error('Item is already in requisition cart.');
    }
  };

  const handleLuminaSmartReorder = () => {
    // Build a map of Central Store availability from requisitionItems
    const centralStockMap = new Map();
    for (const rItem of requisitionItems) {
      centralStockMap.set(String(rItem.item_id), Number(rItem.available || 0));
    }

    // Identify department items that are low in local stock (<= 5)
    const lowStockItems = deptStockItems.filter(i => Number(i.available || 0) <= 5);

    if (lowStockItems.length === 0) {
      toast.success('All local items in your department have healthy stock levels!');
      return;
    }

    // Filter to ONLY items that are currently AVAILABLE in Central Store (central stock > 0)
    const availableInCentral = lowStockItems.filter(i => {
      const centralAvail = i.central !== undefined && i.central > 0
        ? Number(i.central)
        : (centralStockMap.get(String(i.item_id)) || 0);
      return centralAvail > 0;
    });

    const skippedOutOfStockCount = lowStockItems.length - availableInCentral.length;

    if (availableInCentral.length === 0) {
      toast.error('Low stock items found, but NONE are currently available in Central Store.');
      return;
    }

    let addedCount = 0;
    setReqCart(prev => {
      const existingMap = new Set(prev.map(p => String(p.item_id)));
      const newItems = [];
      for (const item of availableInCentral) {
        if (!existingMap.has(String(item.item_id))) {
          const maxCentral = item.central !== undefined && item.central > 0
            ? Number(item.central)
            : (centralStockMap.get(String(item.item_id)) || 20);
          const suggestedQty = Math.min(20, maxCentral);
          newItems.push({
            item_id: item.item_id,
            name: item.name,
            quantity: suggestedQty,
            unit: item.unit || 'pcs'
          });
          addedCount++;
        }
      }
      return [...prev, ...newItems];
    });

    if (addedCount > 0) {
      if (skippedOutOfStockCount > 0) {
        toast.success(`Lumina AI auto-filled ${addedCount} item(s) available in Central Store (${skippedOutOfStockCount} skipped due to Central Store 0 stock).`);
      } else {
        toast.success(`Lumina AI auto-filled ${addedCount} low-stock item(s) available in Central Store!`);
      }
    } else {
      toast.error('All available low-stock items are already in your requisition cart.');
    }
  };

  const handleReorderPastRequisition = (req) => {
    let items = [];
    try { items = typeof req.items === 'string' ? JSON.parse(req.items) : (req.items || []); } catch(e){}
    if (!items || items.length === 0) return toast.error('No items found in this requisition.');

    let addedCount = 0;
    setReqCart(prev => {
      const existingMap = new Set(prev.map(p => String(p.item_id)));
      const newLines = [];
      for (const item of items) {
        if (!existingMap.has(String(item.item_id))) {
          const matchedItem = masterItems.find(m => String(m.id) === String(item.item_id));
          newLines.push({
            item_id: item.item_id,
            name: item.item_name || item.name || matchedItem?.name || `Item #${item.item_id}`,
            quantity: Number(item.quantity || 1),
            unit: item.unit_of_measure || matchedItem?.unit_of_measure || 'pcs'
          });
          addedCount++;
        }
      }
      return [...prev, ...newLines];
    });
    setActiveSubTab('requisitions');
    toast.success(`Loaded ${addedCount} item(s) from Requisition #${req.id} into cart!`);
  };

  const handleSubmitRequisition = async (e) => {
    e.preventDefault();
    const deptId = userDept ? userDept.id : formDept;
    if (!deptId) return toast.error('Select a department.');
    if (reqCart.length === 0) return toast.error('Add at least one item to the requisition.');
    setReqBlockedItems([]);
    setSubmittingReq(true);
    try {
      const res = await api.post('/clinical/inventory/requisitions', {
        department_id: parseInt(deptId, 10),
        urgency: reqUrgency,
        notes: reqNotes || undefined,
        items: reqCart.map(c => ({ item_id: c.item_id, quantity: c.quantity })),
      });
      if (res.data.success) {
        toast.success('Requisition sent to Stock Manager.');
        setReqCart([]);
        setReqNotes('');
        setReqUrgency('Normal');
        await loadData(true);
      }
    } catch (err) {
      console.error(err);
      // ── Lumina AI "In Use" block: show which items are blocked ──────────────
      const blocked = err.response?.data?.blocked;
      if (blocked?.length) {
        setReqBlockedItems(blocked);
        toast.error('Requisition blocked — items still In Use.');
      } else {
        toast.error(err.response?.data?.message || 'Failed to submit requisition.');
      }
    } finally {
      setSubmittingReq(false);
    }
  };

  const handleExportRequisitionsXlsx = async () => {
    if (deptRequisitions.length === 0) {
      toast.error('No requisitions to export.');
      return;
    }

    try {
      toast.loading("Generating requisitions Excel report...", { id: 'excel-req-toast' });
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Requisitions Report');
      sheet.views = [{ showGridLines: true }];

      // Define Columns widths
      sheet.getColumn(1).width = 25; // Date & Time
      sheet.getColumn(2).width = 20; // Department
      sheet.getColumn(3).width = 45; // Requested Items
      sheet.getColumn(4).width = 15; // Urgency
      sheet.getColumn(5).width = 15; // Status
      sheet.getColumn(6).width = 35; // Notes / Comments

      // Header Block (Teal branding theme)
      const titleCell = sheet.getCell('A1');
      titleCell.value = 'LEGACY CLINICS - REQUISITIONS REPORT';
      sheet.mergeCells('A1:F1');
      titleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '0F766E' } }; // Teal-700
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      sheet.getRow(1).height = 35;

      // Metadata block
      sheet.getCell('A2').value = `Generated: ${new Date().toLocaleString()}`;
      sheet.getCell('A2').font = { italic: true, size: 10, color: { argb: '475569' } };
      sheet.getCell('F2').value = `Total Requisitions: ${deptRequisitions.length}`;
      sheet.getCell('F2').font = { bold: true, size: 10, color: { argb: '475569' } };
      sheet.getCell('F2').alignment = { horizontal: 'right' };
      sheet.getRow(2).height = 20;

      // Table Header Row
      const headers = ['Date & Time', 'Department', 'Requested Items', 'Urgency', 'Status', 'Notes'];
      const headerRow = sheet.getRow(3);
      headerRow.values = headers;
      headerRow.height = 25;

      headers.forEach((_, colIndex) => {
        const cell = headerRow.getCell(colIndex + 1);
        cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '115E59' } }; // Teal-800
        cell.alignment = { vertical: 'middle', horizontal: colIndex === 3 || colIndex === 4 ? 'center' : 'left' };
      });

      // Populate Data Rows
      let currentRowIdx = 4;
      deptRequisitions.forEach((req) => {
        let itemsList = [];
        try {
          itemsList = typeof req.items === 'string' ? JSON.parse(req.items) : (req.items || []);
        } catch (e) {
          itemsList = [];
        }

        const itemsString = itemsList
          .map(i => `${i.quantity}x ${i.item_name || i.name || `Item #${i.item_id}`}`)
          .join('\n');

        const row = sheet.getRow(currentRowIdx);
        row.values = [
          new Date(req.created_at).toLocaleString(),
          req.department_name || '—',
          itemsString,
          req.urgency || 'Normal',
          req.status || 'Pending',
          req.notes || '—'
        ];

        // Alignment and wraps
        row.getCell(1).alignment = { vertical: 'middle' };
        row.getCell(2).alignment = { vertical: 'middle' };
        row.getCell(3).alignment = { wrapText: true, vertical: 'middle' }; // Wrap text for items list
        row.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
        row.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
        row.getCell(6).alignment = { wrapText: true, vertical: 'middle' };

        // Status coloring
        const statusCell = row.getCell(5);
        if (req.status === 'Approved') {
          statusCell.font = { color: { argb: '166534' }, bold: true }; // Emerald-800
        } else if (req.status === 'Pending') {
          statusCell.font = { color: { argb: '9A3412' }, bold: true }; // Amber-800
        } else if (req.status === 'Completed') {
          statusCell.font = { color: { argb: '1E40AF' }, bold: true }; // Blue-800
        } else if (req.status === 'Rejected') {
          statusCell.font = { color: { argb: '9F1239' }, bold: true }; // Rose-800
        }

        // Urgency styling
        const urgencyCell = row.getCell(4);
        if (req.urgency === 'Urgent') {
          urgencyCell.font = { color: { argb: '9F1239' }, bold: true }; // Rose-800
        }

        // Apply grid borders to cells
        for (let colIdx = 1; colIdx <= 6; colIdx++) {
          row.getCell(colIdx).border = {
            top: { style: 'thin', color: { argb: 'CBD5E1' } },
            left: { style: 'thin', color: { argb: 'CBD5E1' } },
            bottom: { style: 'thin', color: { argb: 'CBD5E1' } },
            right: { style: 'thin', color: { argb: 'CBD5E1' } }
          };
        }

        currentRowIdx++;
      });

      // Write to buffer and download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `requisitions_report_${new Date().toISOString().split('T')[0]}.xlsx`;
      link.click();

      toast.success("Excel report generated successfully!", { id: 'excel-req-toast' });
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate requisitions report.", { id: 'excel-req-toast' });
    }
  };

  const handleExportConsumablesXlsx = async () => {
    if (entries.length === 0) {
      toast.error('No consumables consumption log data to export.');
      return;
    }

    try {
      toast.loading("Generating consumables Excel workbook...", { id: 'excel-cons-toast' });
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Consumables Log');
      sheet.views = [{ showGridLines: true }];

      // Define Columns widths
      sheet.getColumn(1).width = 22; // Log Date
      sheet.getColumn(2).width = 20; // Department
      sheet.getColumn(3).width = 30; // Item Name
      sheet.getColumn(4).width = 12; // Qty
      sheet.getColumn(5).width = 12; // Unit
      sheet.getColumn(6).width = 18; // Batch#
      sheet.getColumn(7).width = 20; // Logged By
      sheet.getColumn(8).width = 35; // Notes

      // Header Block (Teal branding theme)
      const titleCell = sheet.getCell('A1');
      titleCell.value = 'LEGACY CLINICS & DIAGNOSTICS';
      sheet.mergeCells('A1:H1');
      titleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '0F766E' } }; // Teal-700
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      sheet.getRow(1).height = 35;

      const subCell = sheet.getCell('A2');
      subCell.value = 'CONSUMABLES CONSUMPTION REPORT';
      sheet.mergeCells('A2:H2');
      subCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFF' } };
      subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '0D9488' } }; // Teal-600
      subCell.alignment = { horizontal: 'center', vertical: 'middle' };
      sheet.getRow(2).height = 25;

      // Filter details
      const filterCell = sheet.getCell('A3');
      const deptText = userDept ? userDept.name : (departments.find(d => String(d.id) === String(filterDept))?.name || 'All');
      const fromText = filterFrom ? filterFrom : 'Beginning';
      const toText = filterTo ? filterTo : 'Today';
      filterCell.value = `Export Date: ${new Date().toLocaleDateString()} | Active Filters - Department: ${deptText}, Period: ${fromText} to ${toText}`;
      sheet.mergeCells('A3:H3');
      filterCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: '555555' } };
      filterCell.alignment = { horizontal: 'center', vertical: 'middle' };
      sheet.getRow(3).height = 20;

      sheet.getRow(4).height = 15; // Spacer

      // Table Headers
      const headerRow = sheet.getRow(5);
      headerRow.height = 25;
      const headers = ['Log Date', 'Department', 'Item Name', 'Quantity', 'Unit', 'Batch Number', 'Logged By', 'Notes'];
      headers.forEach((h, colIdx) => {
        const cell = headerRow.getCell(colIdx + 1);
        cell.value = h;
        cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '0F766E' } };
        cell.alignment = {
          horizontal: colIdx === 3 ? 'right' : 'left',
          vertical: 'middle'
        };
        cell.border = {
          top: { style: 'thin', color: { argb: '0F766E' } },
          bottom: { style: 'medium', color: { argb: '0F766E' } }
        };
      });

      // Data Rows
      let currentRow = 6;
      entries.forEach(e => {
        const r = sheet.getRow(currentRow);
        r.height = 20;
        r.getCell(1).value = new Date(e.logged_at || e.consumed_at).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        r.getCell(2).value = e.department_name || '—';
        r.getCell(3).value = e.item_name;
        r.getCell(4).value = Number(e.quantity);
        r.getCell(5).value = e.unit || '—';
        r.getCell(6).value = e.batch_number || '—';
        r.getCell(7).value = e.logged_by_name || '—';
        r.getCell(8).value = e.notes || '—';

        // Format row
        for (let col = 1; col <= 8; col++) {
          const cell = r.getCell(col);
          cell.font = { name: 'Calibri', size: 10 };
          cell.border = { bottom: { style: 'thin', color: { argb: 'E2E8F0' } } };
          if (col === 4) {
            cell.alignment = { horizontal: 'right', vertical: 'middle' };
            cell.numFmt = '#,##0';
            cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'B91C1C' } }; // Crimson
          } else {
            cell.alignment = { horizontal: 'left', vertical: 'middle' };
          }
        }
        currentRow++;
      });

      // Total Row
      const totalRow = sheet.getRow(currentRow);
      totalRow.height = 25;
      totalRow.getCell(1).value = 'TOTAL CONSUMED';
      sheet.mergeCells(`A${currentRow}:C${currentRow}`);

      totalRow.getCell(4).value = { formula: `=SUM(D6:D${currentRow - 1})` };

      for (let col = 1; col <= 8; col++) {
        const cell = totalRow.getCell(col);
        cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: '0F766E' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F0FDFA' } }; // Light teal
        cell.border = {
          top: { style: 'thin', color: { argb: '0F766E' } },
          bottom: { style: 'double', color: { argb: '0F766E' } }
        };
        if (col === 4) {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          cell.numFmt = '#,##0';
        }
      }

      // Save and Download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      const filename = `Consumables_Log_${new Date().toISOString().split('T')[0]}`;
      link.download = `${filename}.xlsx`;
      link.click();
      toast.success("Excel exported successfully!", { id: 'excel-cons-toast' });
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate Excel workbook.", { id: 'excel-cons-toast' });
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-teal-600" />
        <p className="text-slate-500 font-semibold animate-pulse">Loading Consumables Log…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-6 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-200 pb-6">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-teal-50 text-teal-700 border border-teal-200 rounded-2xl shadow-sm">
              <ClipboardList size={26} />
            </span>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900">Consumables Log</h1>
              <p className="text-sm text-slate-500 mt-0.5 font-medium">
                Record consumable usage per department — synced live with General Store stock.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Lumina AI Report button — visible to HoD / Stock Manager */}
            {(useDentalMode || isHodOrStock) && (
              <button
                onClick={() => setLuminaOpen(true)}
                className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <Sparkles size={14} />
                <span className="hidden sm:inline">Lumina AI Report</span>
              </button>
            )}
            <button onClick={() => loadData(true)}
              className="p-2.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl text-slate-600 transition-all shadow-xs cursor-pointer">
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </div>
        </motion.div>

        {/* KPIs */}
        {summary && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4">
              <p className="text-[10px] text-teal-600 font-black uppercase tracking-wider">Logged Today</p>
              <p className="text-3xl font-black text-teal-900 mt-1">{summary.today.entries}</p>
              <p className="text-[10px] text-teal-700 font-semibold mt-1">{summary.today.units} units consumed</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
              <p className="text-[10px] text-blue-600 font-black uppercase tracking-wider">Top Item (30d)</p>
              <p className="text-lg font-black text-blue-900 mt-1 truncate">{summary.top_items[0]?.item_name || '—'}</p>
              <p className="text-[10px] text-blue-700 font-semibold mt-1">{summary.top_items[0]?.units || 0} units</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <p className="text-[10px] text-amber-600 font-black uppercase tracking-wider">
                {userDept ? 'My Department' : 'Departments Active'}
              </p>
              <p className="text-lg font-black text-amber-900 mt-1 truncate">
                {userDept ? userDept.name : summary.by_department.length}
              </p>
              <p className="text-[10px] text-amber-700 font-semibold mt-1">
                {userDept ? 'Logged in view' : 'consuming in last 30d'}
              </p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
              <p className="text-[10px] text-slate-600 font-black uppercase tracking-wider">Log Entries</p>
              <p className="text-3xl font-black text-slate-900 mt-1">{entries.length}</p>
              <p className="text-[10px] text-slate-700 font-semibold mt-1">shown below</p>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {/* Log form — full width, on top */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2 mb-4">
              <Plus size={18} className="text-teal-600" /> Log Consumption
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* ── Dental / Physio / Lab: 3-mode logging selector ──────────────── */}
              {useDentalMode && (
                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5 block">
                    How are you logging this item?
                  </label>
                  <div className="flex gap-1.5 p-1 bg-slate-100 rounded-xl">
                    {[
                      { id: 'units',    Icon: Hash,         label: 'Log Units',     sub: 'Enter a quantity',            act: 'text-teal-700 border-teal-200 bg-white' },
                      { id: 'in_use',   Icon: Activity,     label: 'Mark In Use',   sub: 'No stock deducted',           act: 'text-amber-700 border-amber-200 bg-white' },
                      { id: 'finished', Icon: CheckCircle2, label: 'Mark Finished', sub: 'Deducts all remaining stock',  act: 'text-emerald-700 border-emerald-200 bg-white' },
                    ].map(({ id, Icon, label, sub, act }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => { setLogMode(id); setFormQty(''); setFormNotes(''); }}
                        className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                          logMode === id
                            ? `shadow-sm ${act}`
                            : 'text-slate-500 border-transparent hover:bg-white/60 hover:text-slate-700'
                        }`}
                      >
                        <Icon size={14} />
                        <span>{label}</span>
                        <span className={`text-[9px] font-semibold leading-tight text-center transition-opacity ${
                          logMode === id ? 'opacity-60' : 'opacity-0 h-0'
                        }`}>{sub}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-400">Department</label>
                  {userDept ? (
                    <div className="w-full mt-1 bg-slate-100 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-700">
                      {userDept.name}
                    </div>
                  ) : (
                    <select value={formDept}
                      onChange={(e) => { setFormDept(e.target.value); setFormItemId(''); setFormItemSearch(''); }}
                      className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold outline-none focus:border-teal-400 focus:bg-white">
                      <option value="">Select department…</option>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  )}
                </div>

                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-400">Item (in stock)</label>
                  {!(userDept ? userDept.id : formDept) ? (
                    <p className="text-xs text-slate-400 bg-slate-50 border border-slate-200 rounded-xl p-2.5 mt-1">
                      Select a department to see its available consumables.
                    </p>
                  ) : deptStockItems.length === 0 ? (
                    <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-xl p-2.5 mt-1">
                      No distributed stock found for this department.
                    </p>
                  ) : (
                    <div className={`relative ${dropdownOpen ? 'z-50' : 'z-10'}`}>
                      {dropdownOpen && (
                        <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          const nextState = !dropdownOpen;
                          setDropdownOpen(nextState);
                          if (nextState) setCaseDropOpen(false);
                        }}
                        className="w-full mt-1 bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-left flex justify-between items-center outline-none focus:border-teal-400 z-10 relative cursor-pointer"
                      >
                        {selectedItem ? (
                          <span className="font-bold text-slate-800">
                            {selectedItem.name} {selectedItem.available > 0 ? (
                              <span className="ml-2 px-1.5 py-0.5 text-[10px] font-black bg-teal-50 text-teal-700 rounded-md">
                                {selectedItem.available} {selectedItem.unit || ''} in stock
                              </span>
                            ) : (
                              <span className="ml-2 px-1.5 py-0.5 text-[10px] font-black bg-slate-50 text-slate-500 rounded-md">
                                0 in stock
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-semibold">Select item…</span>
                        )}
                        <ChevronDown size={16} className="text-slate-400" />
                      </button>

                      {dropdownOpen && (
                        <div className="absolute z-50 left-0 mt-1.5 bg-white border border-slate-200 shadow-2xl rounded-2xl p-3 space-y-3 animate-fadeIn max-h-[380px] flex flex-col w-full min-w-[300px] sm:min-w-[420px]">
                          {/* Search Input */}
                          <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                              type="text"
                              placeholder="Type to search registry..."
                              value={formItemSearch}
                              onChange={(e) => setFormItemSearch(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold outline-none focus:border-teal-400"
                              autoFocus
                            />
                          </div>

                          {/* Tabs / Filters inside dropdown */}
                          <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider self-start max-w-full overflow-x-auto scrollbar-none">
                            {['All', 'In Stock', 'Medications', 'Consumables', 'Sutures'].map(tab => (
                              <button
                                key={tab}
                                type="button"
                                onClick={() => setPickerTab(tab)}
                                className={`px-2 py-1 rounded-md transition-all cursor-pointer whitespace-nowrap ${
                                  pickerTab === tab
                                    ? 'bg-white text-teal-700 shadow-2xs'
                                    : 'text-slate-500 hover:text-slate-700'
                                }`}
                              >
                                {tab}
                              </button>
                            ))}
                          </div>

                          {/* Scrollable List of options grouped by category */}
                          <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
                            {groupedAndFilteredItems.length === 0 ? (
                              <p className="text-[11px] text-slate-400 text-center py-6 font-semibold">No items match your filters.</p>
                            ) : (
                              groupedAndFilteredItems.map(group => (
                                <div key={group.category} className="space-y-1">
                                  <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">
                                    {group.category.replace(/_/g, ' ')}
                                  </h5>
                                  <div className="space-y-0.5">
                                    {group.items.map((item, idx) => (
                                      <button
                                        key={`${item.dept_stock_id || item.item_id}-${item.batch_number || ''}-${idx}`}
                                        type="button"
                                        onClick={() => {
                                          setFormItemId(item.item_id);
                                          setDropdownOpen(false);
                                        }}
                                        className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex justify-between items-center ${
                                          String(formItemId) === String(item.item_id)
                                            ? 'bg-slate-800 text-white'
                                            : 'text-slate-700 hover:bg-slate-50'
                                        }`}
                                      >
                                        <span className="truncate pr-4">{item.name}</span>
                                        <div className="flex items-center gap-1.5 shrink-0 text-[10px]">
                                          {item.available > 0 ? (
                                            <span className="px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 font-extrabold border border-teal-100">
                                              {item.available} {item.unit || 'pcs'}
                                            </span>
                                          ) : item.central > 0 ? (
                                            <span className="px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 font-extrabold border border-sky-100">
                                              {item.central} in General Store
                                            </span>
                                          ) : (
                                            <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 font-extrabold border border-rose-100">
                                              Out of Stock
                                            </span>
                                          )}
                                        </div>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {isNursingActive && (
                  <div>
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-400">Ward</label>
                    <select value={formWard} onChange={(e) => setFormWard(e.target.value)}
                      className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold outline-none focus:border-teal-400 focus:bg-white">
                      <option value="">Select ward…</option>
                      <option value="Station 1">Station 1</option>
                      <option value="Minor Surgery">Minor Surgery</option>
                    </select>
                  </div>
                )}

                {isNursingActive && (
                  <div>
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-400">Session</label>
                    <div className="mt-1 flex gap-1.5">
                      {['AM', 'PM'].map((s) => (
                        <button key={s} type="button" onClick={() => setFormSession(s)}
                          className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all cursor-pointer ${formSession === s ? 'bg-teal-700 text-white border-teal-700' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}>
                          {s}
                        </button>
                      ))}
                    </div>
                    <p className="text-[9px] text-slate-400 mt-1 font-semibold">AM 07:00–15:00 · PM 15:00–late</p>
                  </div>
                )}

                {/* Quantity field — hidden for in_use / finished modes */}
                {(!useDentalMode || logMode === 'units') ? (
                  <div>
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-400">Quantity Consumed</label>
                    <input type="number" min="1" max={selectedItem?.available || undefined} value={formQty}
                      disabled={!selectedItem || selectedItem.available <= 0}
                      onChange={(e) => setFormQty(e.target.value)} placeholder={!selectedItem ? "0" : selectedItem.available <= 0 ? "Unavailable" : "0"}
                      className={`w-full mt-1 bg-slate-50 border rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:bg-white disabled:opacity-55 disabled:cursor-not-allowed ${
                        selectedItem && parseInt(formQty, 10) > selectedItem.available
                          ? 'border-rose-300 text-rose-600 focus:border-rose-400 focus:ring-1 focus:ring-rose-400'
                          : 'border-slate-200 focus:border-teal-400'
                      }`} />
                    {selectedItem && parseInt(formQty, 10) > selectedItem.available && (
                      <p className="text-[10px] text-rose-600 font-extrabold mt-1">
                        Cannot exceed available stock ({selectedItem.available} {selectedItem.unit || 'unit(s)'}).
                      </p>
                    )}
                  </div>
                ) : logMode === 'in_use' ? (
                  <div className="flex flex-col justify-end">
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-400">Quantity</label>
                    <div className="mt-1 flex items-center gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                      <Activity size={14} className="text-amber-600 shrink-0" />
                      <div>
                        <p className="text-xs font-black text-amber-800">No Deduction</p>
                        <p className="text-[10px] text-amber-600 font-semibold leading-tight">Item marked as in use only</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col justify-end">
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-400">Quantity</label>
                    <div className="mt-1 flex items-center gap-2.5 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5">
                      <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                      <div>
                        <p className="text-xs font-black text-emerald-800">Full Deduction</p>
                        <p className="text-[10px] text-emerald-600 font-semibold leading-tight">
                          Consumes all {selectedItem?.available ?? 0} {selectedItem?.unit || 'unit(s)'} remaining
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-400">Notes (optional)</label>
                  <input type="text" value={formNotes} onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="e.g. used in procedure room"
                    className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-teal-400 focus:bg-white" />
                </div>
              </div>

              {/* ── Lumina AI: Case / Work Order Picker (Dental/Physio/Lab only) ── */}
              {useDentalMode && (
                <div className={`relative ${caseDropOpen ? 'z-40' : 'z-0'}`}>
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
                    <Link2 size={11} className="text-indigo-500" />
                    Link to Case / Work Order
                    <span className="text-[9px] font-semibold text-slate-300 ml-1">(optional)</span>
                  </label>

                  {selectedCase ? (
                    /* Selected state — pill showing the chosen case with a clear button */
                    <div className="flex items-center gap-2 mt-1 bg-indigo-50 border border-indigo-200 rounded-xl px-3 py-2.5">
                      <span className="text-[10px] font-black text-indigo-500 bg-indigo-100 px-1.5 py-0.5 rounded-md shrink-0">
                        {selectedCase.case_type}
                      </span>
                      <span className="text-sm font-bold text-indigo-900 truncate flex-1">{selectedCase.label}</span>
                      <button type="button" onClick={() => { setSelectedCase(null); setCaseSearch(''); setCaseDropOpen(false); }}
                        className="ml-auto shrink-0 text-indigo-400 hover:text-indigo-700 transition-colors cursor-pointer">
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    /* Unselected state — search input + dropdown */
                    <div className="relative mt-1">
                      {caseDropOpen && (
                        <div className="fixed inset-0 z-30" onClick={() => setCaseDropOpen(false)} />
                      )}
                      <div className="relative z-40">
                        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 focus-within:border-indigo-400 transition-colors shadow-2xs">
                          <Search size={13} className="text-slate-400 shrink-0" />
                          <input
                            type="text"
                            value={caseSearch}
                            onFocus={() => {
                              setCaseDropOpen(true);
                              setDropdownOpen(false);
                            }}
                            onChange={(e) => {
                              setCaseSearch(e.target.value);
                              setCaseDropOpen(true);
                              setDropdownOpen(false);
                            }}
                            placeholder={loadingCases ? 'Loading open cases…' : openCases.length === 0 ? 'No open cases found' : `Search ${openCases.length} open case${openCases.length !== 1 ? 's' : ''}…`}
                            className="flex-1 py-2.5 text-sm font-semibold outline-none bg-white text-slate-800 placeholder:text-slate-400"
                          />
                          {loadingCases && <Loader2 size={13} className="animate-spin text-slate-300 shrink-0" />}
                        </div>

                        {/* Dropdown list */}
                        <AnimatePresence>
                          {caseDropOpen && filteredCases.length > 0 && (
                            <motion.div
                              initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                              transition={{ duration: 0.12 }}
                              className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden"
                            >
                              <div className="max-h-56 overflow-y-auto py-1">
                                {filteredCases.map(c => (
                                  <button
                                    key={`${c.case_type}-${c.id}`}
                                    type="button"
                                    onClick={() => { setSelectedCase(c); setCaseSearch(''); setCaseDropOpen(false); }}
                                    className="w-full text-left px-3 py-2.5 hover:bg-indigo-50 transition-colors flex items-start gap-2.5 group cursor-pointer"
                                  >
                                    <span className="shrink-0 mt-0.5 text-[9px] font-black px-1.5 py-0.5 rounded-md bg-indigo-100 text-indigo-600 group-hover:bg-indigo-200 uppercase">
                                      {c.case_type}
                                    </span>
                                    <div className="min-w-0">
                                      <p className="text-xs font-black text-slate-800 truncate">{c.case_ref}</p>
                                      <p className="text-[10px] text-slate-500 font-medium truncate">
                                        {c.label.split('—').slice(1).join('—').trim()}
                                      </p>
                                    </div>
                                  </button>
                                ))}
                              </div>
                              <div className="px-3 py-1.5 border-t border-slate-100 bg-slate-50">
                                <p className="text-[9px] font-semibold text-slate-400">
                                  {filteredCases.length} open case{filteredCases.length !== 1 ? 's' : ''} — only non-delivered/completed shown
                                </p>
                              </div>
                            </motion.div>
                          )}
                          {caseDropOpen && filteredCases.length === 0 && caseSearch.trim() && (
                            <motion.div
                              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                              className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-md z-50 px-4 py-4 text-center"
                            >
                              <p className="text-[11px] text-slate-400 font-semibold">No matching cases found.</p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Availability + in-use warnings + submit */}
              {isSelectedItemInUse && useDentalMode && (
                <div className="mt-3">
                  {logMode === 'units' ? (
                    <div className="flex items-center gap-2.5 text-xs bg-amber-50 border border-amber-300 rounded-xl px-3.5 py-2.5 text-amber-800 font-extrabold">
                      <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                      <div>
                        <p className="font-black text-amber-900">"{selectedItem?.name}" is currently declared "In Use"</p>
                        <p className="text-[10px] text-amber-700 font-medium">It cannot be logged in units. Switch to <strong>Mark Finished</strong> to close out this item once work is complete.</p>
                      </div>
                    </div>
                  ) : logMode === 'in_use' ? (
                    <div className="flex items-center gap-2.5 text-xs bg-indigo-50 border border-indigo-200 rounded-xl px-3.5 py-2.5 text-indigo-800 font-extrabold">
                      <Info size={16} className="text-indigo-600 shrink-0" />
                      <div>
                        <p className="font-black text-indigo-900">"{selectedItem?.name}" is already open in "In Use" mode</p>
                        <p className="text-[10px] text-indigo-700 font-medium">Select <strong>Mark Finished</strong> to close it out.</p>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-3 border-t border-slate-100">
                {selectedItem && selectedItem.available <= 0 && !(useDentalMode && logMode === 'in_use') ? (
                  <div className="flex items-center gap-2 text-xs bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 text-rose-700 font-extrabold">
                    <AlertCircle size={14} /> Out of stock in this department. Please request a transfer first.
                  </div>
                ) : selectedItem ? (
                  <div className="flex items-center gap-2 text-xs bg-teal-50 border border-teal-200 rounded-xl px-3 py-2 text-teal-700 font-bold">
                    <Boxes size={14} /> {selectedItem.available} {selectedItem.unit || 'unit(s)'} available
                  </div>
                ) : null}
                <button
                  type="submit"
                  disabled={
                    submitting || !formItemId || !selectedItem ||
                    (isSelectedItemInUse && (logMode === 'units' || logMode === 'in_use')) ||
                    (
                      useDentalMode && logMode === 'in_use'
                        ? false
                        : useDentalMode && logMode === 'finished'
                          ? false
                          : selectedItem?.available <= 0 || !formQty || parseInt(formQty, 10) <= 0 || parseInt(formQty, 10) > (selectedItem?.available || 0)
                    )
                  }
                  className="sm:ml-auto py-3 px-10 bg-teal-700 hover:bg-teal-600 disabled:bg-slate-300 text-white font-bold text-sm rounded-xl cursor-pointer flex items-center justify-center gap-2 transition-all disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : useDentalMode && logMode === 'in_use' ? (
                    <Activity size={15} />
                  ) : useDentalMode && logMode === 'finished' ? (
                    <CheckCircle2 size={15} />
                  ) : (
                    <TrendingDown size={15} />
                  )}
                  {isSelectedItemInUse && logMode === 'units'
                    ? 'Item Currently In Use'
                    : isSelectedItemInUse && logMode === 'in_use'
                      ? 'Item Already In Use'
                      : useDentalMode && logMode === 'in_use'
                        ? 'Mark In Use'
                        : useDentalMode && logMode === 'finished'
                          ? 'Mark Finished'
                          : 'Record Consumption'}
                </button>
              </div>
            </form>
          </div>

          {/* History and Stock tabs — full width, below the log form */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
            {/* Tabs switcher */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4 gap-3 flex-wrap">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveSubTab('history')}
                  className={`px-4 py-2 text-sm font-bold rounded-xl transition-all cursor-pointer ${
                    activeSubTab === 'history'
                      ? 'bg-teal-700 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-650 hover:bg-slate-200'
                  }`}
                >
                  Consumption History
                </button>
                <button
                  onClick={() => setActiveSubTab('stock')}
                  className={`px-4 py-2 text-sm font-bold rounded-xl transition-all cursor-pointer ${
                    activeSubTab === 'stock'
                      ? 'bg-teal-700 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-650 hover:bg-slate-200'
                  }`}
                >
                  Available Items
                </button>
                <button
                  onClick={() => setActiveSubTab('requisitions')}
                  className={`px-4 py-2 text-sm font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeSubTab === 'requisitions'
                      ? 'bg-teal-700 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-650 hover:bg-slate-200'
                  }`}
                >
                  <ArrowRight size={14} /> Requisitions
                </button>
                <button
                  onClick={() => setActiveSubTab('deactivated')}
                  className={`px-4 py-2 text-sm font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeSubTab === 'deactivated'
                      ? 'bg-teal-700 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-650 hover:bg-slate-200'
                  }`}
                >
                  <AlertTriangle size={14} /> Deactivated & Expired
                  {deactivatedItems.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200 text-slate-700 font-extrabold">
                      {deactivatedItems.length}
                    </span>
                  )}
                </button>
              </div>

              <div className="flex items-center gap-2">
                {activeSubTab === 'history' && (
                  <button
                    onClick={handleExportConsumablesXlsx}
                    className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                  >
                    <FileSpreadsheet size={14} />
                    Export Excel
                  </button>
                )}
                {activeSubTab === 'requisitions' && (
                  <button
                    onClick={handleExportRequisitionsXlsx}
                    className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                  >
                    <FileSpreadsheet size={14} />
                    Export Requisitions
                  </button>
                )}
              </div>
            </div>

            {/* Consumption History Tab */}
            {activeSubTab === 'history' && (
              <>
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  {isAdmin && (
                    <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-lg text-xs px-2.5 py-1.5 outline-none font-semibold">
                      <option value="">All depts</option>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  )}
                  <input type="date" value={filterFrom} max={today()} onChange={(e) => setFilterFrom(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg text-xs px-2.5 py-1.5 outline-none font-semibold" />
                  <input type="date" value={filterTo} max={today()} onChange={(e) => setFilterTo(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg text-xs px-2.5 py-1.5 outline-none font-semibold" />
                  <button onClick={() => loadData(true)}
                    className="text-xs font-bold bg-indigo-650 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg cursor-pointer transition-all">Apply</button>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-100">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-black tracking-wider">
                      <tr>
                        <th className="text-left px-3 py-2.5">When</th>
                        <th className="text-left px-3 py-2.5">Department</th>
                        <th className="text-left px-3 py-2.5">Item</th>
                        <th className="text-center px-3 py-2.5">Qty</th>
                        <th className="text-left px-3 py-2.5">Ward / Session</th>
                        <th className="text-left px-3 py-2.5">Batch</th>
                        <th className="text-left px-3 py-2.5">By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedEntries.map((e) => (
                        <tr key={e.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                           <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">
                             {new Date(e.logged_at || e.consumed_at).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                           </td>
                          <td className="px-3 py-2.5 font-semibold text-slate-700">{e.department_name || '—'}</td>
                          <td className="px-3 py-2.5 text-slate-800">
                            {e.item_name}
                            <span className={`ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${e.source === 'daily' ? 'bg-indigo-50 text-indigo-600' : e.source === 'audit' ? 'bg-amber-50 text-amber-600' : 'bg-teal-50 text-teal-600'}`}>
                              {e.source === 'daily' ? 'Daily Checkup' : e.source === 'audit' ? 'Stock Edit' : 'Log'}
                            </span>
                            {e.notes && <span className="block text-[11px] text-slate-400 font-normal">{e.notes}</span>}
                          </td>
                          <td className="px-3 py-2.5 text-center font-black text-rose-600">
                            {e.source === 'audit' ? (
                              <span className="text-slate-400 font-bold">—</span>
                            ) : Number(e.quantity) === 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200">
                                <Activity size={10} /> In Use
                              </span>
                            ) : (
                              <>
                                {`−${e.quantity}`}
                                <span className="ml-1 text-slate-400 font-semibold text-xs">{e.unit || ''}</span>
                              </>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-[11px]">
                            {e.ward ? <span className="font-bold text-slate-700">{e.ward}</span> : <span className="text-slate-300">—</span>}
                            {e.session && <span className="ml-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-bold">{e.session}</span>}
                          </td>
                          <td className="px-3 py-2.5 font-mono text-[11px] text-slate-500">{e.batch_number || '—'}</td>
                          <td className="px-3 py-2.5 text-slate-500 text-xs">{e.logged_by_name || '—'}</td>
                        </tr>
                      ))}
                      {entries.length === 0 && (
                        <tr><td colSpan={7} className="px-3 py-10 text-center text-slate-400 italic">No consumption logged for this filter.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination — 15 rows per page */}
                {entries.length > HISTORY_PAGE_SIZE && (
                  <div className="flex items-center justify-between mt-3 text-xs">
                    <span className="text-slate-500 font-semibold">
                      Showing {(historyPage - 1) * HISTORY_PAGE_SIZE + 1}–{Math.min(historyPage * HISTORY_PAGE_SIZE, entries.length)} of {entries.length}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button type="button" onClick={() => setHistoryPage(p => Math.max(1, p - 1))} disabled={historyPage === 1}
                        className="px-3 py-1.5 rounded-lg font-bold border border-slate-200 bg-white text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer transition-all">
                        Prev
                      </button>
                      <span className="px-2 font-bold text-slate-600">Page {historyPage} / {totalHistoryPages}</span>
                      <button type="button" onClick={() => setHistoryPage(p => Math.min(totalHistoryPages, p + 1))} disabled={historyPage >= totalHistoryPages}
                        className="px-3 py-1.5 rounded-lg font-bold border border-slate-200 bg-white text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer transition-all">
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Available Items Tab */}
            {activeSubTab === 'stock' && (
              <>
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setStockTab('local')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      stockTab === 'local'
                        ? 'bg-slate-700 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Local Items
                  </button>
                  <button
                    onClick={() => setStockTab('central')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      stockTab === 'central'
                        ? 'bg-slate-700 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    General Store Items
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  {isAdmin && stockTab === 'local' && (
                    <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-lg text-xs px-2.5 py-1.5 outline-none font-semibold">
                      <option value="">Select department…</option>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  )}
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search available items by name, SKU, category, or batch #..."
                      value={stockSearchTerm}
                      onChange={(e) => setStockSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-8 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-teal-400 focus:bg-white"
                    />
                    {stockSearchTerm && (
                      <button
                        type="button"
                        onClick={() => setStockSearchTerm('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-100">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-black tracking-wider">
                      <tr>
                        <th className="text-left px-3 py-2.5">Items</th>
                        <th className="text-left px-3 py-2.5">Category</th>
                        {stockTab === 'central' && <th className="text-left px-3 py-2.5">Batch#</th>}
                        <th className="text-left px-3 py-2.5">Exp. Date</th>
                        <th className="text-center px-3 py-2.5">Status</th>
                        {stockTab === 'local' && <th className="text-center px-3 py-2.5">Batches / Details</th>}
                        <th className="text-center px-3 py-2.5">Stock In Hands</th>
                        {stockTab === 'local' && <th className="text-right px-3 py-2.5">Action</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDeptStock.map((row) => {
                        const status = getItemStatus(row.expiry_date);
                        const isExpanded = !!expandedItemIds[row.item_id];
                        const batchCount = row.batches ? row.batches.length : 1;

                        return (
                          <React.Fragment key={`${row.item_id}-${row.dept_stock_id}`}>
                            <tr
                              className={`border-t border-slate-100 transition-colors ${
                                stockTab === 'local' ? 'hover:bg-slate-50/80 cursor-pointer' : 'hover:bg-slate-50/60'
                              }`}
                              onClick={() => {
                                if (stockTab === 'local') toggleExpandItem(row.item_id);
                              }}
                            >
                              <td className="px-3 py-2.5 text-slate-800">
                                <div className="flex items-center gap-2">
                                  {stockTab === 'local' && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleExpandItem(row.item_id);
                                      }}
                                      className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-all cursor-pointer"
                                    >
                                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                    </button>
                                  )}
                                  <div>
                                    <div className="font-bold text-slate-900">{row.name}</div>
                                    {row.sku && <div className="text-[10px] text-slate-400 font-mono mt-0.5">{row.sku}</div>}
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-2.5 text-slate-650 text-xs font-semibold uppercase tracking-tight">
                                {row.category?.replace(/_/g, ' ') || '—'}
                              </td>
                              {stockTab === 'central' && (
                                <td className="px-3 py-2.5 font-mono text-[11px] text-slate-500">{row.batch_number || '—'}</td>
                              )}
                              <td className="px-3 py-2.5 text-slate-600 text-xs font-medium">
                                {row.expiry_date ? (
                                  <div className="flex items-center gap-1">
                                    <span>{row.expiry_date.split('T')[0]}</span>
                                    {stockTab === 'local' && batchCount > 1 && (
                                      <span className="text-[9px] text-slate-400 font-normal shrink-0">(Earliest)</span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold border ${status.color}`}>
                                  {status.text}
                                </span>
                              </td>
                              {stockTab === 'local' && (
                                <td className="px-3 py-2.5 text-center">
                                  <span
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      batchCount > 1
                                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                        : 'bg-slate-100 text-slate-600'
                                    }`}
                                  >
                                    <Layers size={10} />
                                    {batchCount} {batchCount === 1 ? 'batch' : 'batches'}
                                  </span>
                                </td>
                              )}
                              <td className="px-3 py-2.5 text-center font-black text-slate-850 text-sm">
                                {row.quantity} <span className="text-slate-450 font-bold text-xs">{row.unit_of_measure || ''}</span>
                              </td>
                              {stockTab === 'local' && (
                                <td className="px-3 py-2.5 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    {status.text === 'Expired' && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setDeactModalItem(row);
                                          setDeactReasonInput('Expired item write-off');
                                        }}
                                        className="px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-slate-700 hover:bg-slate-800 text-white transition-all cursor-pointer shadow-2xs"
                                      >
                                        Deactivate
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleQuickReorderItem(row);
                                      }}
                                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-2xs ${
                                        row.quantity <= 5
                                          ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200 animate-pulse'
                                          : 'bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200'
                                      }`}
                                    >
                                      + Reorder
                                    </button>
                                  </div>
                                </td>
                              )}
                            </tr>

                            {/* Expanded sub-row showing batch variables */}
                            {stockTab === 'local' && isExpanded && row.batches && (
                              <tr className="bg-slate-50/70 border-t border-slate-100">
                                <td colSpan={7} className="p-3 pl-8">
                                  <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs space-y-2">
                                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
                                      <Boxes size={12} className="text-indigo-600" />
                                      Batch Breakdown & Variables for {row.name}
                                    </div>
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-xs text-left">
                                        <thead className="bg-slate-50 text-slate-500 text-[9px] uppercase font-bold">
                                          <tr>
                                            <th className="px-2.5 py-1.5">Batch / Lot Code</th>
                                            <th className="px-2.5 py-1.5">Exp. Date</th>
                                            <th className="px-2.5 py-1.5 text-center">Status</th>
                                            <th className="px-2.5 py-1.5 text-right">Quantity</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 font-medium">
                                          {row.batches.map((b, bIdx) => {
                                            const bStatus = getItemStatus(b.expiry_date);
                                            return (
                                              <tr key={b.dept_stock_id || bIdx} className="hover:bg-slate-50">
                                                <td className="px-2.5 py-1.5 font-mono text-[11px] text-slate-700 font-bold">
                                                  {b.batch_number || 'No batch #'}
                                                  {b.lot_number && <span className="text-slate-400 font-normal ml-1">(Lot: {b.lot_number})</span>}
                                                </td>
                                                <td className="px-2.5 py-1.5 text-slate-600">
                                                  {b.expiry_date ? b.expiry_date.split('T')[0] : 'N/A'}
                                                </td>
                                                <td className="px-2.5 py-1.5 text-center">
                                                  <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold border ${bStatus.color}`}>
                                                    {bStatus.text}
                                                  </span>
                                                  {bStatus.text === 'Expired' && (
                                                    <button
                                                      type="button"
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        setDeactModalItem(b);
                                                        setDeactReasonInput('Expired batch write-off');
                                                      }}
                                                      className="ml-2 px-1.5 py-0.5 bg-slate-700 hover:bg-slate-800 text-white rounded text-[8px] font-bold uppercase transition-all cursor-pointer shadow-2xs"
                                                    >
                                                      Deactivate
                                                    </button>
                                                  )}
                                                </td>
                                                <td className="px-2.5 py-1.5 text-right font-black text-slate-800">
                                                  {b.quantity} {b.unit_of_measure || ''}
                                                </td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                      {filteredDeptStock.length === 0 && (
                        <tr>
                          <td colSpan={stockTab === 'central' ? 6 : 7} className="px-3 py-10 text-center text-slate-400">
                            {stockSearchTerm.trim() ? (
                              <div className="space-y-1.5">
                                <p className="font-semibold text-xs text-slate-500">No available items match "{stockSearchTerm}"</p>
                                <button
                                  type="button"
                                  onClick={() => setStockSearchTerm('')}
                                  className="text-xs font-bold text-teal-600 hover:underline cursor-pointer"
                                >
                                  Clear search filter
                                </button>
                              </div>
                            ) : !filterDept && !userDept ? (
                              <p className="italic text-xs">Select a department to view available items.</p>
                            ) : (
                              <p className="italic text-xs">No available items found.</p>
                            )}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* Requisitions Tab */}
            {activeSubTab === 'requisitions' && (
              <div className="space-y-6">
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Left: Requisition Form */}
                  <div className="w-full lg:w-1/3 bg-slate-50 border border-slate-200 rounded-2xl p-5">
                    <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                      <Send size={16} className="text-teal-600" /> New Requisition
                    </h4>
                    <form onSubmit={handleSubmitRequisition} className="space-y-4">
                      <div>
                        <label className="text-[11px] font-black uppercase tracking-wider text-slate-400">Department</label>
                        {userDept ? (
                          <div className="w-full mt-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-700">
                            {userDept.name}
                          </div>
                        ) : (
                          <select value={formDept}
                            onChange={(e) => { setFormDept(e.target.value); setReqCart([]); }}
                            className="w-full mt-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold outline-none focus:border-teal-400">
                            <option value="">Select department…</option>
                            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                          </select>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={handleLuminaSmartReorder}
                        className="w-full py-2.5 px-3 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-black flex items-center justify-center shadow-sm transition-all cursor-pointer border border-teal-800 active:scale-[0.99]"
                      >
                        Auto-Fill low stock
                      </button>

                      <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-3">
                        <div className="relative">
                          {reqDropdownOpen && (
                            <div className="fixed inset-0 z-40" onClick={() => setReqDropdownOpen(false)} />
                          )}
                          <button
                            type="button"
                            onClick={() => setReqDropdownOpen(!reqDropdownOpen)}
                            className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-left flex justify-between items-center outline-none focus:border-teal-400 z-10 relative"
                          >
                            {reqItemId ? (
                              <div className="flex items-center gap-2 truncate pr-2">
                                <span className="font-bold text-slate-800 truncate">
                                  {requisitionItems.find(i => String(i.item_id) === String(reqItemId))?.name || 'Selected Item'}
                                </span>
                                {requisitionItems.find(i => String(i.item_id) === String(reqItemId))?.unit && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-teal-100 text-teal-800 shrink-0">
                                    {requisitionItems.find(i => String(i.item_id) === String(reqItemId))?.unit}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400">Select item…</span>
                            )}
                            <ChevronDown size={14} className="text-slate-400" />
                          </button>

                          {reqDropdownOpen && (
                            <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 shadow-xl rounded-xl p-2.5 space-y-2.5 animate-fadeIn max-h-[300px] flex flex-col w-[300px]">
                              {/* Search Input */}
                              <div className="relative">
                                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                  type="text"
                                  placeholder="Search items..."
                                  value={reqItemSearch}
                                  onChange={(e) => setReqItemSearch(e.target.value)}
                                  className="w-full bg-slate-50 border border-slate-200/80 rounded-lg pl-8 pr-2.5 py-1.5 text-[11px] font-semibold outline-none focus:border-teal-400 focus:bg-white"
                                  autoFocus
                                />
                              </div>

                              {/* Tabs inside dropdown */}
                              <div className="flex gap-1 bg-slate-100 p-0.5 rounded-md text-[8px] font-black uppercase tracking-wider self-start max-w-full overflow-x-auto scrollbar-none">
                                {['All', 'In Stock', 'General Store', 'Medications', 'Consumables', 'Sutures'].map(tab => (
                                  <button
                                    key={tab}
                                    type="button"
                                    onClick={() => setReqPickerTab(tab)}
                                    className={`px-1.5 py-0.5 rounded transition-all cursor-pointer whitespace-nowrap ${
                                      reqPickerTab === tab
                                        ? 'bg-white text-teal-700 shadow-2xs'
                                        : 'text-slate-500 hover:text-slate-700'
                                    }`}
                                  >
                                    {tab}
                                  </button>
                                ))}
                              </div>

                              {/* Scrollable list */}
                              <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                                {reqGroupedAndFilteredItems.length === 0 ? (
                                  <p className="text-[10px] text-slate-400 text-center py-4 font-semibold">No matching items.</p>
                                ) : (
                                  reqGroupedAndFilteredItems.map(group => (
                                    <div key={group.category} className="space-y-0.5">
                                      <h5 className="text-[8px] font-black text-slate-400 uppercase tracking-widest pl-1">
                                        {group.category.replace(/_/g, ' ')}
                                      </h5>
                                      <div className="space-y-0.5">
                                        {group.items.map((item, idx) => (
                                          <button
                                            key={item.item_id}
                                            type="button"
                                            onClick={() => {
                                              setReqItemId(item.item_id);
                                              setReqDropdownOpen(false);
                                            }}
                                            className={`w-full text-left px-2 py-1 rounded text-[11px] font-bold transition-all cursor-pointer flex justify-between items-center ${
                                              String(reqItemId) === String(item.item_id)
                                                ? 'bg-slate-800 text-white'
                                                : 'text-slate-700 hover:bg-slate-50'
                                            }`}
                                          >
                                            <div className="flex items-center gap-1.5 truncate pr-2">
                                              <span className="truncate">{item.name}</span>
                                              <span className="text-[9px] font-black uppercase tracking-wider px-1 py-0.2 rounded bg-slate-100 text-slate-500 border border-slate-200 shrink-0">
                                                {item.unit || 'pcs'}
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0 text-[9px]">
                                              {item.available > 0 ? (
                                                <span className="px-1 rounded bg-teal-50 text-teal-700 font-extrabold">
                                                  {item.available} {item.unit || 'pcs'}
                                                </span>
                                              ) : (
                                                <span className="px-1 rounded bg-rose-50 text-rose-600 font-extrabold">
                                                  Out
                                                </span>
                                              )}
                                            </div>
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <label className="text-[10px] font-bold text-slate-500 uppercase">Quantity</label>
                              {(() => {
                                const selectedReqItem = requisitionItems.find(i => String(i.item_id) === String(reqItemId));
                                return selectedReqItem ? (
                                  <span className="text-[9px] font-black uppercase text-teal-700 bg-teal-50 border border-teal-200 px-1 py-0.2 rounded">
                                    in {selectedReqItem.unit || 'pcs'}
                                  </span>
                                ) : null;
                              })()}
                            </div>
                            <input type="number" min="1" value={reqQty} onChange={(e) => setReqQty(e.target.value)} placeholder="0"
                              className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-teal-400" />
                          </div>
                          <div className="flex items-end">
                            <button type="button" onClick={handleAddReqItem}
                              className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer">
                              Add
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* ── Lumina AI: Requisition "In Use" Block Warning ── */}
                      {reqBlockedItems.length > 0 && (
                        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 space-y-2">
                          <div className="flex items-center gap-2 text-rose-700 font-extrabold text-xs">
                            <AlertTriangle size={16} className="shrink-0" />
                            <span>Requisition Blocked by Lumina AI</span>
                          </div>
                          <p className="text-[11px] text-rose-600 font-medium leading-relaxed">
                            You cannot request more stock because the following item(s) are currently marked <strong className="font-extrabold">In Use</strong> without being marked Finished:
                          </p>
                          <ul className="list-disc list-inside text-xs font-bold text-rose-800 space-y-0.5">
                            {reqBlockedItems.map((item, idx) => (
                              <li key={idx}>{item}</li>
                            ))}
                          </ul>
                          <p className="text-[10px] text-rose-500 font-semibold italic pt-1">
                            Go to Log Consumption, select each item, and choose "Mark Finished" to unblock requisitions.
                          </p>
                        </div>
                      )}

                      {reqCart.length > 0 && (
                        <div className="bg-teal-50 border border-teal-100 rounded-xl p-3">
                          <h5 className="text-[10px] font-black uppercase text-teal-800 mb-2">Cart ({reqCart.length} items)</h5>
                          <div className="space-y-2">
                            {reqCart.map(c => (
                              <div key={c.item_id} className="flex items-center justify-between bg-white px-2 py-1.5 rounded border border-teal-100">
                                <span className="text-xs font-semibold text-slate-700 truncate">{c.name}</span>
                                <div className="flex items-center gap-3">
                                  <span className="text-xs font-black text-teal-700">{c.quantity} {c.unit}</span>
                                  <button type="button" onClick={() => handleRemoveReqItem(c.item_id)} className="text-rose-500 hover:text-rose-700 cursor-pointer">
                                    <X size={14} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-black uppercase tracking-wider text-slate-400">Urgency</label>
                          <select value={reqUrgency} onChange={(e) => setReqUrgency(e.target.value)}
                            className="w-full mt-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold outline-none focus:border-teal-400">
                            <option value="Normal">Normal</option>
                            <option value="Urgent">Urgent</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[11px] font-black uppercase tracking-wider text-slate-400">Notes</label>
                          <input type="text" value={reqNotes} onChange={(e) => setReqNotes(e.target.value)} placeholder="Optional..."
                            className="w-full mt-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-teal-400" />
                        </div>
                      </div>

                      <button type="submit" disabled={submittingReq || reqCart.length === 0}
                        className="w-full py-2.5 bg-teal-700 hover:bg-teal-600 disabled:bg-slate-300 text-white font-bold text-sm rounded-xl cursor-pointer flex items-center justify-center gap-2 transition-all">
                        {submittingReq ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Submit Requisition
                      </button>
                    </form>
                  </div>

                  {/* Right: Requisition History */}
                  <div className="w-full lg:w-2/3">
                    <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                      <Clock size={16} className="text-teal-600" /> Recent Requisitions
                    </h4>
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-black tracking-wider">
                          <tr>
                            <th className="text-left px-4 py-3">Date</th>
                            <th className="text-left px-4 py-3">Department</th>
                            <th className="text-left px-4 py-3">Initiated By</th>
                            <th className="text-left px-4 py-3">Items Requested</th>
                            <th className="text-center px-4 py-3">Urgency</th>
                            <th className="text-center px-4 py-3">Status</th>
                            <th className="text-right px-4 py-3">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {deptRequisitions.map(req => {
                            let items = [];
                            try { items = typeof req.items === 'string' ? JSON.parse(req.items) : (req.items || []); } catch(e){}
                            return (
                              <tr key={req.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                                <td className="px-4 py-3 text-slate-600 font-medium whitespace-nowrap">
                                  {new Date(req.created_at).toLocaleString()}
                                </td>
                                <td className="px-4 py-3 font-bold text-slate-700">{req.department_name || '—'}</td>
                                <td className="px-4 py-3 font-bold text-slate-800 text-xs">
                                  {req.created_by_name || 'Staff User'}
                                </td>
                                <td className="px-4 py-3 text-xs text-slate-600">
                                  {items.length > 0 ? (
                                    <div className="space-y-1">
                                      {items.map((i, idx) => (
                                        <div key={idx} className="flex gap-1.5 items-center">
                                          <span className="font-bold text-slate-900">{i.quantity}x</span>
                                          <span className="text-[9px] font-black uppercase text-teal-800 bg-teal-50 border border-teal-200 px-1.5 py-0.2 rounded">
                                            {i.unit_of_measure || 'pcs'}
                                          </span>
                                          <span className="truncate max-w-[150px] font-semibold text-slate-700" title={i.item_name || i.name}>{i.item_name || i.name || `Item #${i.item_id}`}</span>
                                        </div>
                                      ))}
                                    </div>
                                  ) : '—'}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${req.urgency === 'Urgent' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>
                                    {req.urgency || 'Normal'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider
                                    ${req.status === 'Pending' ? 'bg-amber-100 text-amber-700' :
                                      req.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                                      req.status === 'Completed' ? 'bg-blue-100 text-blue-700' :
                                      req.status === 'Rejected' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>
                                    {req.status || 'Pending'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <button
                                    type="button"
                                    onClick={() => handleReorderPastRequisition(req)}
                                    className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                                    title="Clone items from this requisition into cart"
                                  >
                                    <RefreshCw size={10} /> Repeat
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                          {deptRequisitions.length === 0 && (
                            <tr>
                              <td colSpan={5} className="px-4 py-10 text-center text-slate-400 italic">No requisitions found.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Deactivated & Expired Items Tab */}
            {activeSubTab === 'deactivated' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-slate-100 text-slate-700 rounded-xl border border-slate-200">
                      <AlertTriangle size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900">Deactivated & Expired Inventory Record</h4>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        Items and batches that have expired or been written off. Deactivated stock is quarantined from patient logging.
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-slate-700 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl">
                      {filteredDeactItems.length} Deactivated Record(s)
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative flex-1 min-w-[240px]">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search deactivated items by name, SKU, batch #, or reason..."
                      value={deactSearchTerm}
                      onChange={(e) => setDeactSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-8 py-2 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-400 focus:bg-white"
                    />
                    {deactSearchTerm && (
                      <button
                        type="button"
                        onClick={() => setDeactSearchTerm('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-black tracking-wider">
                      <tr>
                        <th className="text-left px-3.5 py-3">Item Name & SKU</th>
                        <th className="text-left px-3.5 py-3">Category</th>
                        <th className="text-left px-3.5 py-3">Batch / Lot Code</th>
                        <th className="text-left px-3.5 py-3">Exp. Date</th>
                        <th className="text-left px-3.5 py-3">Deactivated At & By</th>
                        <th className="text-left px-3.5 py-3">Write-off Reason</th>
                        <th className="text-right px-3.5 py-3">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {filteredDeactItems.map((item) => (
                        <tr key={item.dept_stock_id || item.item_id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-3.5 py-3">
                            <div className="font-bold text-slate-900">{item.name}</div>
                            {item.sku && <div className="text-[10px] text-slate-400 font-mono mt-0.5">{item.sku}</div>}
                          </td>
                          <td className="px-3.5 py-3 text-slate-600 text-xs font-semibold uppercase tracking-tight">
                            {item.category?.replace(/_/g, ' ') || '—'}
                          </td>
                          <td className="px-3.5 py-3 font-mono text-xs text-slate-700">
                            {item.batch_number || 'No batch #'}
                            {item.lot_number && <span className="text-slate-400 font-normal ml-1">(Lot: {item.lot_number})</span>}
                          </td>
                          <td className="px-3.5 py-3 text-xs text-slate-700 font-bold">
                            <div className="flex items-center gap-1.5">
                              <span>{item.expiry_date ? item.expiry_date.split('T')[0] : '—'}</span>
                              <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-50 text-amber-700 border border-amber-200">
                                Expired
                              </span>
                            </div>
                          </td>
                          <td className="px-3.5 py-3 text-xs text-slate-600">
                            <div>{item.deactivated_at ? new Date(item.deactivated_at).toLocaleString() : '—'}</div>
                            <div className="text-[10px] text-slate-400 font-semibold">{item.deactivated_by_name || 'Staff User'}</div>
                          </td>
                          <td className="px-3.5 py-3 text-xs italic text-slate-600 max-w-[220px] truncate" title={item.deactivation_reason}>
                            {item.deactivation_reason || 'Expired item write-off'}
                          </td>
                          <td className="px-3.5 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleReactivateItem(item)}
                              className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-2xs"
                              title="Restore item batch back to active inventory"
                            >
                              Reactivate
                            </button>
                          </td>
                        </tr>
                      ))}
                      {filteredDeactItems.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-4 py-12 text-center text-slate-400 italic text-xs">
                            {deactSearchTerm.trim() ? (
                              <p>No deactivated items match "{deactSearchTerm}"</p>
                            ) : (
                              <p>No deactivated or expired items recorded for this department.</p>
                            )}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Deactivate Expired Item Modal ─────────────────────────────────────── */}
      <AnimatePresence>
        {deactModalItem && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl max-w-md w-full space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2 text-slate-900 font-black text-base">
                  <AlertTriangle size={20} className="text-slate-700" /> Deactivate Expired Consumable
                </div>
                <button type="button" onClick={() => setDeactModalItem(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <p className="text-slate-700 font-medium leading-relaxed">
                  You are deactivating and writing off <strong className="text-slate-900">{deactModalItem.name}</strong>
                  {deactModalItem.batch_number ? ` (Batch #${deactModalItem.batch_number})` : ''}.
                </p>
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 font-medium space-y-1">
                  <p className="font-bold text-[11px] uppercase tracking-wider">Effect of Deactivation:</p>
                  <ul className="list-disc list-inside text-[11px] space-y-0.5">
                    <li>Quarantines live available quantity to 0</li>
                    <li>Excludes item from patient clinical consumption sheets</li>
                    <li>Logs a write-off entry in the Deactivated & Expired Items tab</li>
                  </ul>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                    Reason for Deactivation / Write-off
                  </label>
                  <input
                    type="text"
                    value={deactReasonInput}
                    onChange={(e) => setDeactReasonInput(e.target.value)}
                    placeholder="e.g. Expired batch write-off / Damaged packaging"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold outline-none focus:border-slate-400 focus:bg-white"
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDeactModalItem(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeactivate}
                  disabled={submittingDeact}
                  className="px-4 py-2 text-xs font-bold bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  {submittingDeact ? <Loader2 size={14} className="animate-spin" /> : <AlertTriangle size={14} />}
                  Confirm Deactivation
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Lumina AI Consumables Intelligence Report Modal ───────────────────────── */}
      <AnimatePresence>
        {luminaOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-6 bg-blue-600 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-white/10 border border-white/20 rounded-2xl">
                    <Sparkles size={24} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black tracking-tight">Lumina AI — Consumables Intelligence</h3>
                    <p className="text-xs text-blue-100 font-semibold">
                      Material usage analysis &amp; projections for Stock Manager &amp; HoD
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setLuminaOpen(false)}
                  className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Controls bar */}
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">Range:</span>
                  <input
                    type="date"
                    value={luminaFrom}
                    onChange={(e) => setLuminaFrom(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 outline-none"
                  />
                  <span className="text-xs font-bold text-slate-400">to</span>
                  <input
                    type="date"
                    value={luminaTo}
                    onChange={(e) => setLuminaTo(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 outline-none"
                  />
                </div>

                <button
                  onClick={generateLuminaReport}
                  disabled={luminaLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-2"
                >
                  {luminaLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  <span>{luminaReport ? 'Regenerate Analysis' : 'Generate Analysis'}</span>
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                {!luminaReport && !luminaLoading && (
                  <div className="text-center py-16 space-y-3">
                    <div className="w-16 h-16 bg-blue-50 border border-blue-100 rounded-3xl flex items-center justify-center mx-auto text-blue-600">
                      <BarChart3 size={32} />
                    </div>
                    <h4 className="text-base font-bold text-slate-800">Generate Consumables Intelligence</h4>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      Click the button above to run Lumina AI analytics on department logged materials, case patterns, and open items.
                    </p>
                  </div>
                )}

                {luminaLoading && (
                  <div className="text-center py-20 space-y-3">
                    <Loader2 size={36} className="animate-spin text-blue-600 mx-auto" />
                    <p className="text-sm font-bold text-slate-700">Lumina AI is analyzing material logs and learning usage patterns…</p>
                  </div>
                )}

                {luminaReport && !luminaLoading && (
                  <div className="space-y-6">
                    {/* Executive Narrative */}
                    <div className="bg-blue-50/60 border border-blue-200 rounded-2xl p-5 space-y-2">
                      <h4 className="text-xs font-black uppercase tracking-wider text-blue-900 flex items-center gap-2">
                        <Sparkles size={14} className="text-blue-600" /> Executive Narrative
                      </h4>
                      <p className="text-sm font-medium text-slate-800 leading-relaxed">
                        {luminaReport.narrative}
                      </p>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
                        <p className="text-[10px] font-black uppercase text-slate-400">Total Log Entries</p>
                        <p className="text-2xl font-black text-slate-900 mt-0.5">{luminaReport.summary?.total_logs ?? 0}</p>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
                        <p className="text-[10px] font-black uppercase text-slate-400">Total Quantity</p>
                        <p className="text-2xl font-black text-teal-700 mt-0.5">{luminaReport.summary?.total_qty ?? 0}</p>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
                        <p className="text-[10px] font-black uppercase text-slate-400">Unique Items</p>
                        <p className="text-2xl font-black text-blue-700 mt-0.5">{luminaReport.summary?.unique_items ?? 0}</p>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
                        <p className="text-[10px] font-black uppercase text-slate-400">Work Categories</p>
                        <p className="text-2xl font-black text-purple-700 mt-0.5">{luminaReport.summary?.case_types ?? 0}</p>
                      </div>
                    </div>

                    {/* Stale Items Warning */}
                    {luminaReport.stale_items?.length > 0 && (
                      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
                        <h4 className="text-xs font-extrabold text-amber-900 flex items-center gap-2">
                          <AlertTriangle size={15} className="text-amber-600" />
                          Items Open In-Use &gt; 3 Days ({luminaReport.stale_items.length})
                        </h4>
                        <div className="divide-y divide-amber-200/60 max-h-40 overflow-y-auto">
                          {luminaReport.stale_items.map((stale, i) => {
                            const daysCount = (stale.hrs_open / 24).toFixed(1);
                            return (
                              <div key={i} className="py-1.5 flex items-center justify-between text-xs">
                                <span className="font-bold text-slate-800">{stale.item}</span>
                                <span className="text-[11px] font-black text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-200/80">
                                  Open for {daysCount} days
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Usage Breakdown By Case/Work Type */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">
                        Consumables & Materials Breakdown by Work / Case Type
                      </h4>
                      {Object.keys(luminaReport.by_case_type || {}).length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No usage recorded for this period.</p>
                      ) : (
                        Object.entries(luminaReport.by_case_type).map(([caseType, items]) => (
                          <div key={caseType} className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
                            <div className="bg-slate-100/70 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                              <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                                {caseType}
                              </span>
                              <span className="text-[10px] font-extrabold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                                {items.length} item{items.length !== 1 ? 's' : ''}
                              </span>
                            </div>
                            <table className="w-full text-xs">
                              <thead className="bg-slate-50 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                                <tr>
                                  <th className="text-left px-4 py-2">Item Name</th>
                                  <th className="text-center px-3 py-2">Log Count</th>
                                  <th className="text-center px-3 py-2">Total Units</th>
                                  <th className="text-center px-3 py-2">Avg / Use</th>
                                  <th className="text-center px-3 py-2">Avg Open Duration</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {items.map((row, idx) => (
                                  <tr key={idx} className="hover:bg-slate-50/60">
                                    <td className="px-4 py-2 font-bold text-slate-800">{row.item}</td>
                                    <td className="px-3 py-2 text-center text-slate-600 font-semibold">{row.use_count}</td>
                                    <td className="px-3 py-2 text-center text-teal-700 font-bold">{row.total_qty}</td>
                                    <td className="px-3 py-2 text-center text-slate-600">{row.avg_qty}</td>
                                    <td className="px-3 py-2 text-center text-indigo-600 font-semibold">
                                      {row.avg_hrs !== '—' ? `${row.avg_hrs} hrs` : '—'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
