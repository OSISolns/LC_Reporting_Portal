import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import {
  Database,
  Package,
  Scale,
  Truck,
  DollarSign,
  Plus,
  RefreshCw,
  Loader2,
  ArrowLeft,
  Building2,
  Edit2,
  Trash2,
  X,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Search,
  SlidersHorizontal,
  Layers,
  MapPin,
  ClipboardList,
  Sparkles,
  Brain,
  Check
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

function Badge({ children, className = '' }) {
  return <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg border ${className}`}>{children}</span>;
}

// Reusable Modal Component with Glassmorphism, Backdrop blur, and Scrollable Body
function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;
  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', duration: 0.4 }}
          className="bg-white/95 backdrop-blur-2xl rounded-[28px] shadow-2xl w-full max-w-lg overflow-hidden border border-white/50"
        >
          <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-lg font-black text-slate-800 tracking-tight">{title}</h3>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer border-0 bg-transparent">
              <X size={18} />
            </button>
          </div>
          <div className="p-6 max-h-[72vh] overflow-y-auto scrollbar-thin">
            {children}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}

export default function MasterModule() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('items');
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Data states
  const [items, setItems] = useState([]);
  const [uoms, setUoms] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [prices, setPrices] = useState([]);
  const [departments, setDepartments] = useState([]);

  // Modal states
  const [isItemModalOpen, setItemModalOpen] = useState(false);
  const [isDeptModalOpen, setDeptModalOpen] = useState(false);
  const [isVendorModalOpen, setVendorModalOpen] = useState(false);
  const [isUomModalOpen, setUomModalOpen] = useState(false);
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);

  const [editingRecord, setEditingRecord] = useState(null);
  const [recordToDelete, setRecordToDelete] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Form states
  const [itemForm, setItemForm] = useState({
    name: '', sku: '', category: 'medical_supplies', unit_of_measure: 'pc',
    batch_number: '', lot_number: '', expiry_date: '', purchase_time: '', department_id: '', storage: '', quantity: '', price: ''
  });
  const [pendingItems, setPendingItems] = useState([]);
  const [deptForm, setDeptForm] = useState({ name: '' });
  const [vendorForm, setVendorForm] = useState({ name: '', contact: '', contractTerms: '' });
  const [uomForm, setUomForm] = useState({ name: '', abbreviation: '', description: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // AI Agent States
  const [isAIModalOpen, setAIModalOpen] = useState(false);
  const [aiSuggestions, setAISuggestions] = useState([]);
  const [selectedAISuggestions, setSelectedAISuggestions] = useState([]);
  const [aiStep, setAIStep] = useState(0); // 0 = Intro, 1 = Classifying, 2 = Review Table
  const [aiProgress, setAIProgress] = useState(0);
  const [currentAIItemName, setCurrentAIItemName] = useState('');
  const [isAIApplying, setIsAIApplying] = useState(false);

  // Categories definition
  const categoriesList = [
    { id: 'medical_supplies', label: 'Medical Supplies' },
    { id: 'medications', label: 'Medications' },
    { id: 'anesthetics', label: 'Anesthetics' },
    { id: 'antiseptics', label: 'Antiseptics' },
    { id: 'sutures', label: 'Sutures' },
    { id: 'antidotes', label: 'Antidotes' },
    { id: 'stationery', label: 'Stationery' },
    { id: 'consumables', label: 'Consumables' },
    { id: 'suppository', label: 'Suppository' },
    { id: 'housekeeping', label: 'Housekeeping' },
    { id: 'cafetariat', label: 'Cafetariat' }
  ];

  // Mirrors the backend SKU algorithm for live preview.
  // Format: first 3 chars of word 1 + "-" + first 3 chars of word 2 (if exists).
  // Single word: up to first 6 chars.  Examples: "Ceftriaxone 1g" → CEF-1G | "Paracetamol" → PARACE
  const previewSku = (name) => {
    const clean = (name || '').toUpperCase().trim().replace(/[^A-Z0-9\s]/g, '');
    const words = clean.split(/\s+/).filter(Boolean);
    if (words.length === 0) return '—';
    if (words.length === 1) return words[0].substring(0, 6) || '—';
    const part1 = words[0].substring(0, 3);
    const part2 = words[1].substring(0, 3);
    return `${part1}-${part2}`;
  };

  useEffect(() => {
    loadMasterData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm, selectedCategory, selectedDepartment]);

  const loadMasterData = async () => {
    setLoading(true);
    try {
      const [invRes, venRes, deptRes, uomRes] = await Promise.allSettled([
        api.get('/clinical/inventory/master'),
        api.get('/clinical/inventory/vendors'),
        api.get('/clinical/inventory/departments'),
        api.get('/clinical/inventory/uoms')
      ]);

      if (invRes.status === 'fulfilled' && invRes.value.data.success) {
        setItems(invRes.value.data.data);
      }
      if (venRes.status === 'fulfilled' && venRes.value.data.success) {
        setVendors(venRes.value.data.data);
      }
      if (deptRes.status === 'fulfilled' && deptRes.value?.data?.success) {
        setDepartments(deptRes.value.data.data);
      }
      if (uomRes.status === 'fulfilled' && uomRes.value?.data) {
        setUoms(uomRes.value.data);
      }

      setPrices([
        { id: 1, item_name: "Ceftriaxone 1g", base_cost: 2500, markup_percentage: 20, selling_price: 3000, effective_date: "2026-01-01" },
        { id: 2, item_name: "Seringue 10cc", base_cost: 150, markup_percentage: 33, selling_price: 200, effective_date: "2026-01-01" },
        { id: 3, item_name: "Paracetamol 500mg", base_cost: 40, markup_percentage: 25, selling_price: 50, effective_date: "2026-01-01" }
      ]);

    } catch (err) {
      toast.error('Failed to load master data');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAIClassifier = () => {
    setAISuggestions([]);
    setSelectedAISuggestions([]);
    setAIStep(0);
    setAIProgress(0);
    setCurrentAIItemName('');
    setAIModalOpen(true);
  };

  const handleStartAIClassification = async () => {
    try {
      setAIStep(1);
      setAIProgress(0);
      setCurrentAIItemName('Initializing AI Agent...');
      
      const res = await api.get('/clinical/inventory/master/ai-classify');
      if (res.data && res.data.success) {
        const data = res.data.data;
        setAISuggestions(data);
        // By default, select all items that have different recommendations from current values
        setSelectedAISuggestions(data.filter(s => s.isDifferent).map(s => s.itemId));

        if (data.length === 0) {
          setAIProgress(100);
          setAIStep(2);
          return;
        }

        let currentIdx = 0;
        const totalItems = data.length;
        const intervalTime = Math.max(15, Math.min(100, 2500 / totalItems));

        const timer = setInterval(() => {
          if (currentIdx < totalItems) {
            setCurrentAIItemName(`Analyzing item ${currentIdx + 1} of ${totalItems}: ${data[currentIdx].name}`);
            setAIProgress(Math.round(((currentIdx + 1) / totalItems) * 100));
            currentIdx++;
          } else {
            clearInterval(timer);
            setAIStep(2);
          }
        }, intervalTime);
      } else {
        toast.error('Failed to start AI classification');
        setAIStep(0);
      }
    } catch (err) {
      console.error(err);
      toast.error('Error during AI classification');
      setAIStep(0);
    }
  };

  const handleApplyAISuggestions = async () => {
    try {
      setIsAIApplying(true);
      const suggestionsToApply = aiSuggestions.filter(s => selectedAISuggestions.includes(s.itemId));
      
      if (suggestionsToApply.length === 0) {
        toast.error('No recommendations selected');
        setIsAIApplying(false);
        return;
      }

      const payload = suggestionsToApply.map(s => ({
        itemId: s.itemId,
        category: s.suggestedCategory,
        departmentId: s.suggestedDepartmentId,
        storage: s.suggestedStorage,
        uom: s.suggestedUom
      }));

      const res = await api.post('/clinical/inventory/master/ai-apply', { suggestions: payload });
      if (res.data && res.data.success) {
        toast.success(`Successfully applied AI recommendations to ${suggestionsToApply.length} items`);
        setAIModalOpen(false);
        loadMasterData();
      } else {
        toast.error('Failed to apply suggestions');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error applying AI recommendations');
    } finally {
      setIsAIApplying(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await api.post('/clinical/inventory/sync');
      toast.success('Master Data successfully synchronized across all modules!');
    } catch (err) {
      toast.error('Synchronization failed');
    } finally {
      setSyncing(false);
    }
  };

  // --- Filter and Search Logic ---
  const getFilteredData = () => {
    if (activeTab === 'items') {
      return items.filter(item => {
        const matchesSearch =
          !searchTerm ||
          item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.batch_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.department?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesCategory = !selectedCategory || item.category === selectedCategory;
        const matchesDepartment = !selectedDepartment ||
          String(item.department_id) === String(selectedDepartment) ||
          item.department === selectedDepartment;

        return matchesSearch && matchesCategory && matchesDepartment;
      });
    }
    if (activeTab === 'departments') {
      return departments.filter(dept =>
        !searchTerm || dept.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (activeTab === 'uoms') {
      return uoms.filter(u =>
        !searchTerm ||
        u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.abbreviation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (activeTab === 'vendors') {
      return vendors.filter(v =>
        !searchTerm ||
        v.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.contact?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.contract_terms?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return [];
  };

  const filteredData = getFilteredData();
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const totalItemsCount = filteredData.length;
  const totalPages = Math.ceil(totalItemsCount / itemsPerPage);

  // --- CRUD Modals Setup ---
  const openItemModal = (item = null) => {
    setPendingItems([]);
    if (item) {
      setEditingRecord(item);
      setItemForm({
        name: item.name, sku: item.sku, category: item.category, unit_of_measure: item.unit_of_measure,
        batch_number: item.batch_number || '',
        lot_number: item.lot_number || '',
        expiry_date: item.expiry_date ? item.expiry_date.split('T')[0] : '',
        purchase_time: item.purchase_time ? item.purchase_time.split('T')[0] : '',
        department_id: item.department_id || '',
        storage: item.storage || '',
        quantity: item.quantity || '',
        price: item.price || '',
        batch_id: item.batch_id
      });
    } else {
      setEditingRecord(null);
      setItemForm({
        name: '', sku: '', category: 'medical_supplies', unit_of_measure: 'pc',
        batch_number: '', lot_number: '', expiry_date: '', purchase_time: '', department_id: '', storage: '', quantity: '', price: ''
      });
    }
    setItemModalOpen(true);
  };

  const openDeptModal = (dept = null) => {
    if (dept) {
      setEditingRecord(dept);
      setDeptForm({ name: dept.name });
    } else {
      setEditingRecord(null);
      setDeptForm({ name: '' });
    }
    setDeptModalOpen(true);
  };

  const openVendorModal = (vendor = null) => {
    if (vendor) {
      setEditingRecord(vendor);
      setVendorForm({ name: vendor.name, contact: vendor.contact, contractTerms: vendor.contract_terms });
    } else {
      setEditingRecord(null);
      setVendorForm({ name: '', contact: '', contractTerms: '' });
    }
    setVendorModalOpen(true);
  };

  const openUomModal = (uom = null) => {
    if (uom) {
      setEditingRecord(uom);
      setUomForm({ name: uom.name, abbreviation: uom.abbreviation, description: uom.description || '' });
    } else {
      setEditingRecord(null);
      setUomForm({ name: '', abbreviation: '', description: '' });
    }
    setUomModalOpen(true);
  };

  const confirmDelete = (record, type) => {
    setRecordToDelete({ ...record, type });
    setDeleteModalOpen(true);
  };

  // --- CRUD Save actions ---
  const handleAddPendingItem = () => {
    if (!itemForm.name.trim()) {
      toast.error('Item name is required.');
      return;
    }
    const newItem = {
      ...itemForm,
      quantity: 0,
      price: 0
    };
    setPendingItems(prev => [...prev, newItem]);
    setItemForm(prev => ({
      ...prev,
      name: '',
      sku: '',
      batch_number: '',
      lot_number: '',
      expiry_date: '',
      purchase_time: ''
    }));
    toast.success('Added to pending list!');
  };

  const handleSaveItem = async (e) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingRecord) {
        const payload = {
          name: itemForm.name,
          sku: itemForm.sku || undefined,
          category: itemForm.category,
          unit_of_measure: itemForm.unit_of_measure,
          ...(itemForm.batch_id ? { batch_id: itemForm.batch_id } : {}),
          ...(itemForm.batch_number ? { batch_number: itemForm.batch_number } : {}),
          ...(itemForm.lot_number ? { lot_number: itemForm.lot_number } : {}),
          ...(itemForm.expiry_date ? { expiry_date: itemForm.expiry_date } : {}),
          ...(itemForm.purchase_time ? { purchase_time: itemForm.purchase_time } : {}),
          ...(itemForm.department_id ? { department_id: itemForm.department_id } : {}),
          ...(itemForm.storage ? { storage: itemForm.storage } : {}),
          ...(itemForm.quantity !== '' && itemForm.quantity !== undefined && itemForm.quantity !== null ? { quantity: Number(itemForm.quantity) } : {}),
          ...(itemForm.price !== '' && itemForm.price !== undefined && itemForm.price !== null ? { price: Number(itemForm.price) } : {})
        };
        await api.put(`/clinical/inventory/master/${editingRecord.id}`, payload);
        toast.success('Item updated successfully');
      } else {
        // Build list: any items already in pendingItems, plus currently typed form if not empty
        const list = [...pendingItems];
        if (itemForm.name.trim()) {
          list.push({
            ...itemForm,
            quantity: 0,
            price: 0
          });
        }
        if (list.length === 0) {
          toast.error('Please specify at least one item.');
          setIsSubmitting(false);
          return;
        }
        await api.post('/clinical/inventory/master', { items: list });
        toast.success(`${list.length} item(s) added successfully`);
      }
      setItemModalOpen(false);
      loadMasterData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save items');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDept = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingRecord) {
        await api.put(`/clinical/inventory/departments/${editingRecord.id}`, deptForm);
        toast.success('Department updated successfully');
      } else {
        await api.post('/clinical/inventory/departments', deptForm);
        toast.success('Department added successfully');
      }
      setDeptModalOpen(false);
      loadMasterData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save department');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveVendor = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingRecord) {
        await api.put(`/clinical/inventory/vendors/${editingRecord.id}`, vendorForm);
        toast.success('Vendor updated successfully');
      } else {
        await api.post('/clinical/inventory/vendors', vendorForm);
        toast.success('Vendor added successfully');
      }
      setVendorModalOpen(false);
      loadMasterData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save vendor');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveUom = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingRecord && editingRecord.abbreviation !== undefined) {
        await api.put(`/clinical/inventory/uoms/${editingRecord.id}`, uomForm);
        toast.success('UOM updated successfully');
      } else {
        await api.post('/clinical/inventory/uoms', uomForm);
        toast.success('UOM added successfully');
      }
      setUomModalOpen(false);
      loadMasterData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save UOM');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsBulkDeleting(true);
    try {
      await api.post('/clinical/inventory/master/bulk-delete', { ids: selectedIds });
      toast.success(`${selectedIds.length} item(s) deleted successfully`);
      setSelectedIds([]);
      loadMasterData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Bulk delete failed');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const toggleSelectItem = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    const allIds = paginatedData.map(item => item.id);
    const allSelected = allIds.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !allIds.includes(id)));
    } else {
      setSelectedIds(prev => [...new Set([...prev, ...allIds])]);
    }
  };

  const handleDelete = async () => {
    setIsSubmitting(true);
    try {
      const { id, type } = recordToDelete;
      if (type === 'item') {
        await api.delete(`/clinical/inventory/master/${id}`);
      } else if (type === 'department') {
        await api.delete(`/clinical/inventory/departments/${id}`);
      } else if (type === 'vendor') {
        await api.delete(`/clinical/inventory/vendors/${id}`);
      } else if (type === 'uom') {
        await api.delete(`/clinical/inventory/uoms/${id}`);
      }
      toast.success('Record deleted successfully');
      setDeleteModalOpen(false);
      loadMasterData();
    } catch (err) {
      toast.error('Failed to delete record');
    } finally {
      setIsSubmitting(false);
      setRecordToDelete(null);
    }
  };

  // --- Display Helpers ---
  const getCategoryStyle = (category) => {
    const cat = category?.toLowerCase() || '';
    if (cat.includes('medication')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200/50';
    } else if (cat.includes('supplies')) {
      return 'bg-indigo-50 text-indigo-700 border-indigo-200/50';
    } else if (cat.includes('suture')) {
      return 'bg-amber-50 text-amber-700 border-amber-200/50';
    } else if (cat.includes('anesthetic')) {
      return 'bg-purple-50 text-purple-700 border-purple-200/50';
    } else if (cat.includes('antiseptic')) {
      return 'bg-cyan-50 text-cyan-700 border-cyan-200/50';
    } else if (cat.includes('antidote')) {
      return 'bg-rose-50 text-rose-700 border-rose-200/50';
    } else if (cat.includes('stationery')) {
      return 'bg-slate-100 text-slate-700 border-slate-300/50';
    } else if (cat.includes('housekeeping')) {
      return 'bg-orange-50 text-orange-700 border-orange-200/50';
    } else if (cat.includes('cafetariat')) {
      return 'bg-pink-50 text-pink-700 border-pink-200/50';
    } else {
      return 'bg-slate-50 text-slate-600 border-slate-200/50';
    }
  };

  const formatCategoryName = (category) => {
    if (!category) return '-';
    return category
      .replace(/_/g, ' ')
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  const getAddAction = () => {
    switch (activeTab) {
      case 'items':
        return { label: 'Add Item', action: () => openItemModal() };
      case 'departments':
        return { label: 'Add Department', action: () => openDeptModal() };
      case 'uoms':
        return { label: 'Add UOM', action: () => openUomModal() };
      case 'vendors':
        return { label: 'Add Vendor', action: () => openVendorModal() };
      default:
        return null;
    }
  };

  const currentAddAction = getAddAction();

  // --- Animation configs ---
  const tabContentVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
    exit: { opacity: 0, y: -15, transition: { duration: 0.2 } }
  };

  const tableContainerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.02
      }
    }
  };

  const rowVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 220,
        damping: 24
      }
    }
  };

  // KPI Calculations
  const isStockManager = user?.role === 'stock-manager';

  const kpis = [
    {
      title: 'Catalog Items',
      value: new Set(items.map(i => i.name)).size,
      sub: `${items.length} registry batches`,
      icon: <Package size={22} />,
      colorBg: 'bg-indigo-50/70 border border-indigo-100/50',
      iconBg: 'bg-indigo-100 text-indigo-700'
    },
    {
      title: 'Legacy Clinics Units',
      value: departments.length,
      sub: 'Active cost centers',
      icon: <Building2 size={22} />,
      colorBg: 'bg-emerald-50/70 border border-emerald-100/50',
      iconBg: 'bg-emerald-100 text-emerald-700'
    },
    {
      title: 'Active UOMs',
      value: uoms.length,
      sub: 'Custom unit descriptors',
      icon: <Scale size={22} />,
      colorBg: 'bg-amber-50/70 border border-amber-100/50',
      iconBg: 'bg-amber-100 text-amber-700'
    },
    // Vendors KPI only visible to admin and procurement-manager
    ...(!isStockManager ? [{
      title: 'Verified Vendors',
      value: vendors.length,
      sub: 'Contracted drug suppliers',
      icon: <Truck size={22} />,
      colorBg: 'bg-sky-50/70 border border-sky-100/50',
      iconBg: 'bg-sky-100 text-sky-700'
    }] : [])
  ];

  return (
    <div className="min-h-screen bg-slate-50/30 pb-16 font-sans relative overflow-hidden">

      {/* Background Blurs for Premium Feel */}
      <div className="absolute top-0 right-0 -mr-32 -mt-32 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 -ml-32 -mb-32 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>

      {/* Top Header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-slate-200/50 sticky top-0 z-30 shadow-sm px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3.5">
          <button
            onClick={() => navigate('/stock-manager-dashboard')}
            className="flex items-center text-xs font-black text-slate-600 hover:text-slate-900 bg-white/70 hover:bg-slate-100 px-4 py-2.5 rounded-xl transition-all shadow-sm border border-slate-200 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5 stroke-[2.5]" /> BACK
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-indigo-600 text-white rounded-xl shadow-md shadow-indigo-100">
                <Database size={16} className="stroke-[2.5]" />
              </span>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">Master Reference Registry</h1>
            </div>
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider mt-0.5">Central settings database and data schemas</p>
          </div>
        </div>

        <button
          onClick={handleSync}
          disabled={syncing}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-xs font-black tracking-wide uppercase transition-all flex items-center gap-2 border-0 cursor-pointer shadow-lg shadow-indigo-100"
        >
          <RefreshCw size={15} className={`stroke-[2.5] ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Synchronizing...' : 'Sync Master Data'}
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-8 relative z-10 space-y-6">

        {/* KPI Dashboard Analytics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05, type: 'spring', stiffness: 200 }}
              className={`p-5 rounded-[22px] bg-white border border-slate-200/60 shadow-sm flex items-center justify-between hover:shadow-md hover:-translate-y-0.5 transition-all`}
            >
              <div className="space-y-1">
                <span className="text-[11px] text-slate-400 font-extrabold uppercase tracking-wider">{kpi.title}</span>
                <div className="text-2xl font-black text-slate-800 tracking-tight">{loading ? '...' : kpi.value}</div>
                <div className="text-[10px] text-slate-500 font-bold">{kpi.sub}</div>
              </div>
              <div className={`p-3 rounded-xl ${kpi.iconBg} flex items-center justify-center shrink-0 shadow-inner`}>
                {kpi.icon}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Master Control and Tabs Container */}
        <div className="bg-white/90 backdrop-blur-2xl rounded-3xl border border-slate-200/50 shadow-sm p-6 space-y-6">

          {/* Tabs navigation and Search controls */}
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">

            {/* Elegant Floating Tab Selector */}
            <div className="flex items-center p-1 bg-slate-100/80 rounded-2xl border border-slate-200/40 w-fit overflow-x-auto scrollbar-none max-w-full">
              {[
                { id: 'items', label: 'Items Master', icon: <Package size={14} /> },
                { id: 'departments', label: 'Departments', icon: <Building2 size={14} /> },
                { id: 'uoms', label: 'Units of Measure', icon: <Scale size={14} /> },
                // Vendors Registry tab only visible to admin and procurement-manager
                ...(!isStockManager ? [{ id: 'vendors', label: 'Vendors Registry', icon: <Truck size={14} /> }] : [])
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all border-0 cursor-pointer shrink-0 ${activeTab === tab.id
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'bg-transparent text-slate-400 hover:text-slate-600'
                    }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Filters Section */}
            <div className="flex flex-wrap items-center gap-3 flex-1 xl:justify-end">
              {/* Context-aware dropdown selectors for Items tab */}
              {activeTab === 'items' && (
                <div className="flex items-center gap-2.5 flex-1 md:flex-initial">
                  {/* Category select filter */}
                  <div className="relative flex-1 md:w-44 md:flex-initial">
                    <select
                      value={selectedCategory}
                      onChange={e => setSelectedCategory(e.target.value)}
                      className="w-full pl-3 pr-8 py-2.5 bg-slate-50 hover:bg-slate-100/50 border border-slate-200 text-xs font-bold text-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer transition-colors appearance-none"
                    >
                      <option value="">All Categories</option>
                      {categoriesList.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.label}</option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">
                      <Layers size={14} />
                    </div>
                  </div>

                  {/* Department select filter */}
                  <div className="relative flex-1 md:w-44 md:flex-initial">
                    <select
                      value={selectedDepartment}
                      onChange={e => setSelectedDepartment(e.target.value)}
                      className="w-full pl-3 pr-8 py-2.5 bg-slate-50 hover:bg-slate-100/50 border border-slate-200 text-xs font-bold text-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer transition-colors appearance-none"
                    >
                      <option value="">All Departments</option>
                      {departments.map(dept => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">
                      <Building2 size={14} />
                    </div>
                  </div>
                </div>
              )}

              {/* Text Search input */}
              <div className="relative flex-1 md:max-w-xs md:flex-initial">
                <Search className="absolute left-3 top-3 text-slate-400 stroke-[2.5]" size={15} />
                <input
                  type="text"
                  placeholder={`Search ${activeTab}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100/50 rounded-xl border border-slate-200 text-xs font-semibold placeholder-slate-400 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all focus:bg-white shadow-inner"
                />
              </div>

              {/* Core Context Action button */}
              {currentAddAction && (
                <button
                  onClick={currentAddAction.action}
                  className="bg-indigo-55 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider border border-indigo-200 flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Plus size={15} className="stroke-[2.5]" /> {currentAddAction.label}
                </button>
              )}

              {activeTab === 'items' && (
                <button
                  onClick={handleOpenAIClassifier}
                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider border border-emerald-200 flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                >
                  <Sparkles size={15} className="stroke-[2.5] text-emerald-600 animate-pulse" /> AI Auto-Classify
                </button>
              )}
            </div>
          </div>

          {/* Tab Content Display Area */}
          {loading ? (
            <div className="flex h-[35vh] items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-9 w-9 animate-spin text-indigo-600" />
                <span className="text-xs text-slate-400 font-extrabold tracking-widest uppercase">Loading database records...</span>
              </div>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                variants={tabContentVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >

                {/* ITEMS TAB */}
                {activeTab === 'items' && (
                  <div className="space-y-3">
                    {/* ── Bulk Action Toolbar ── */}
                    {selectedIds.length > 0 && (
                      <div className="flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-2xl px-5 py-3 shadow-sm">
                        <span className="text-xs font-black text-indigo-700">{selectedIds.length} item(s) selected</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setSelectedIds([])}
                            className="px-3 py-2 text-xs font-black text-slate-500 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl cursor-pointer transition-colors"
                          >
                            Clear Selection
                          </button>
                          <button
                            onClick={handleBulkDelete}
                            disabled={isBulkDeleting}
                            className="px-4 py-2 text-xs font-black text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-xl cursor-pointer flex items-center gap-1.5 transition-colors border-0"
                          >
                            {isBulkDeleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                            Delete Selected ({selectedIds.length})
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="overflow-x-auto rounded-2xl border border-slate-200/50">
                      <table className="w-full text-left text-xs min-w-[750px]">
                        <thead>
                          <tr className="bg-slate-50/50 border-b border-slate-200/60 text-slate-400 uppercase tracking-widest text-[9px] font-black">
                            <th className="py-4 px-4 w-10">
                              <input
                                type="checkbox"
                                onChange={toggleSelectAll}
                                checked={paginatedData.length > 0 && paginatedData.every(item => selectedIds.includes(item.id))}
                                className="w-4 h-4 rounded accent-indigo-600 cursor-pointer"
                              />
                            </th>
                            <th className="py-4 px-4 rounded-l-xl">Product / Service</th>
                            <th className="py-4 px-4">SKU Code</th>
                            <th className="py-4 px-4">Mfg Batch</th>
                            <th className="py-4 px-4">System Lot</th>
                            <th className="py-4 px-4">Department</th>
                            <th className="py-4 px-4">Storage</th>
                            <th className="py-4 px-4">Expiration</th>
                            <th className="py-4 px-6 text-right rounded-r-xl">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                          {(() => {
                            if (paginatedData.length === 0) {
                              return (
                                <tr>
                                  <td colSpan="8" className="py-16 text-center text-slate-400">
                                    <div className="flex flex-col items-center justify-center">
                                      <Package size={44} className="stroke-[1.5] mb-2.5 text-slate-300" />
                                      <p className="font-bold text-sm">No items found matching the search criteria</p>
                                      <p className="text-xs text-slate-400">Try adjusting your filters or search term</p>
                                    </div>
                                  </td>
                                </tr>
                              );
                            }
                            return paginatedData.map((item) => (
                              <motion.tr
                                variants={rowVariants}
                                initial="hidden"
                                animate="visible"
                                key={`${item.id}-${item.batch_id || 'new'}-${item.dept_stock_id || 'none'}`}
                                className={`transition-all border-b border-slate-100 ${selectedIds.includes(item.id) ? 'bg-indigo-50/40' : 'hover:bg-indigo-50/20'
                                  }`}
                              >
                                <td className="py-4 px-4">
                                  <input
                                    type="checkbox"
                                    checked={selectedIds.includes(item.id)}
                                    onChange={() => toggleSelectItem(item.id)}
                                    className="w-4 h-4 rounded accent-indigo-600 cursor-pointer"
                                  />
                                </td>
                                <td className="py-4 px-4 text-slate-900">
                                  <div className="font-black text-[13px]">{item.name}</div>
                                  <div className="flex items-center gap-1.5 mt-1.5">
                                    <span className={`px-2 py-0.5 rounded-md border text-[9px] font-black uppercase tracking-wider ${getCategoryStyle(item.category)}`}>
                                      {formatCategoryName(item.category)}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-bold">UOM: {item.unit_of_measure}</span>
                                  </div>
                                </td>
                                <td className="py-4 px-4 font-mono text-[11px] text-slate-500 tracking-wider">
                                  <span className="px-2 py-1 bg-slate-100 rounded-lg border border-slate-200/50">{item.sku}</span>
                                </td>
                                <td className="py-4 px-4 text-[12px] text-slate-600 font-mono">
                                  {item.batch_number || ''}
                                </td>
                                <td className="py-4 px-4 text-[12px] text-slate-700 font-black">
                                  {item.lot_number ? `LOT-${item.lot_number}` : <span className="text-slate-300">LOT-01</span>}
                                </td>
                                <td className="py-4 px-4">
                                  <div className="text-[12px] text-indigo-700">{item.department || <span className="text-slate-400 font-medium">Global Store</span>}</div>
                                </td>
                                <td className="py-4 px-4">
                                  {item.storage ? (
                                    <span className={`px-2 py-0.5 rounded-md border text-[9px] font-black uppercase tracking-wider ${item.storage === 'Medical' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                      {item.storage}
                                    </span>
                                  ) : <span className="text-slate-300 text-[12px]">—</span>}
                                </td>
                                <td className="py-4 px-4 text-[11px] text-slate-500">
                                  {item.expiry_date ? item.expiry_date.split('T')[0] : <span className="text-slate-300">-</span>}
                                </td>
                                <td className="py-4 px-6 text-right">
                                  <div className="flex justify-end gap-1.5">
                                    <button
                                      onClick={() => openItemModal(item)}
                                      className="p-2 text-slate-400 hover:text-indigo-600 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-xl transition-colors cursor-pointer shadow-sm"
                                      title="Edit item"
                                    >
                                      <Edit2 size={13} className="stroke-[2.5]" />
                                    </button>
                                    <button
                                      onClick={() => confirmDelete(item, 'item')}
                                      className="p-2 text-slate-400 hover:text-rose-600 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-xl transition-colors cursor-pointer shadow-sm"
                                      title="Delete item"
                                    >
                                      <Trash2 size={13} className="stroke-[2.5]" />
                                    </button>
                                  </div>
                                </td>
                              </motion.tr>
                            ));
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* DEPARTMENTS TAB */}
                {activeTab === 'departments' && (
                  <div className="space-y-4">
                    <div className="overflow-x-auto rounded-2xl border border-slate-200/50">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-slate-50/50 border-b border-slate-200/60 text-slate-400 uppercase tracking-widest text-[9px] font-black">
                            <th className="py-4.5 px-6">Department Name</th>
                            <th className="py-4.5 px-6 text-center">Operational Status</th>
                            <th className="py-4.5 px-6 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                          {(() => {
                            if (paginatedData.length === 0) {
                              return (
                                <tr>
                                  <td colSpan="3" className="py-16 text-center text-slate-400">
                                    <div className="flex flex-col items-center justify-center">
                                      <Building2 size={44} className="stroke-[1.5] mb-2.5 text-slate-300" />
                                      <p className="font-bold text-sm">No departments found matching the search criteria</p>
                                    </div>
                                  </td>
                                </tr>
                              );
                            }
                            return paginatedData.map((dept, idx) => (
                              <motion.tr
                                variants={rowVariants}
                                initial="hidden"
                                animate="visible"
                                key={dept.id}
                                className="hover:bg-indigo-50/20 transition-all border-b border-slate-100"
                              >
                                <td className="py-4.5 px-6 text-slate-900 font-black text-[13px]">{dept.name}</td>
                                <td className="py-4.5 px-6 text-center">
                                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200/50">Active</Badge>
                                </td>
                                <td className="py-4.5 px-6 text-right">
                                  <div className="flex justify-end gap-1.5">
                                    <button
                                      onClick={() => openDeptModal(dept)}
                                      className="p-2 text-slate-400 hover:text-indigo-600 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-xl transition-colors cursor-pointer border-0 shadow-sm"
                                    >
                                      <Edit2 size={13} className="stroke-[2.5]" />
                                    </button>
                                    <button
                                      onClick={() => confirmDelete(dept, 'department')}
                                      className="p-2 text-slate-400 hover:text-rose-600 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-xl transition-colors cursor-pointer border-0 shadow-sm"
                                    >
                                      <Trash2 size={13} className="stroke-[2.5]" />
                                    </button>
                                  </div>
                                </td>
                              </motion.tr>
                            ));
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* UOM TAB */}
                {activeTab === 'uoms' && (
                  <div className="space-y-4">
                    <div className="overflow-x-auto rounded-2xl border border-slate-200/50">
                      <table className="w-full text-left text-xs min-w-[600px]">
                        <thead>
                          <tr className="bg-slate-50/50 border-b border-slate-200/60 text-slate-400 uppercase tracking-widest text-[9px] font-black">
                            <th className="py-4.5 px-6">Unit Name</th>
                            <th className="py-4.5 px-4">Abbreviation</th>
                            <th className="py-4.5 px-4">Description</th>
                            <th className="py-4.5 px-6 text-center">Status</th>
                            <th className="py-4.5 px-6 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                          {(() => {
                            if (paginatedData.length === 0) {
                              return (
                                <tr>
                                  <td colSpan="5" className="py-16 text-center text-slate-400">
                                    <div className="flex flex-col items-center justify-center">
                                      <Scale size={44} className="stroke-[1.5] mb-2.5 text-slate-300" />
                                      <p className="font-bold text-sm">No UOM definitions found</p>
                                    </div>
                                  </td>
                                </tr>
                              );
                            }
                            return paginatedData.map((u, idx) => (
                              <motion.tr
                                variants={rowVariants}
                                initial="hidden"
                                animate="visible"
                                key={u.id}
                                className="hover:bg-indigo-50/20 transition-all border-b border-slate-100"
                              >
                                <td className="py-4.5 px-6 text-slate-900 font-black text-[13px]">{u.name}</td>
                                <td className="py-4.5 px-4 font-mono text-[11px] text-indigo-700">
                                  <span className="px-2.5 py-1 bg-indigo-50 border border-indigo-200/40 rounded-lg">
                                    {u.abbreviation}
                                  </span>
                                </td>
                                <td className="py-4.5 px-4 text-slate-500 font-medium max-w-[280px] truncate">{u.description || <span className="text-slate-300">-</span>}</td>
                                <td className="py-4.5 px-6 text-center">
                                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200/50">Active</Badge>
                                </td>
                                <td className="py-4.5 px-6 text-right">
                                  <div className="flex justify-end gap-1.5">
                                    <button
                                      onClick={() => openUomModal(u)}
                                      className="p-2 text-slate-400 hover:text-indigo-600 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-xl transition-colors cursor-pointer border-0 shadow-sm"
                                    >
                                      <Edit2 size={13} className="stroke-[2.5]" />
                                    </button>
                                    <button
                                      onClick={() => confirmDelete(u, 'uom')}
                                      className="p-2 text-slate-400 hover:text-rose-600 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-xl transition-colors cursor-pointer border-0 shadow-sm"
                                    >
                                      <Trash2 size={13} className="stroke-[2.5]" />
                                    </button>
                                  </div>
                                </td>
                              </motion.tr>
                            ));
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* VENDORS TAB */}
                {activeTab === 'vendors' && (
                  <div className="space-y-4">
                    <div className="overflow-x-auto rounded-2xl border border-slate-200/50">
                      <table className="w-full text-left text-xs min-w-[600px]">
                        <thead>
                          <tr className="bg-slate-50/50 border-b border-slate-200/60 text-slate-400 uppercase tracking-widest text-[9px] font-black">
                            <th className="py-4.5 px-6">Vendor Company</th>
                            <th className="py-4.5 px-4">Contact Info</th>
                            <th className="py-4.5 px-4">Contract Terms</th>
                            <th className="py-4.5 px-6 text-center">Status Badge</th>
                            <th className="py-4.5 px-6 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                          {(() => {
                            if (paginatedData.length === 0) {
                              return (
                                <tr>
                                  <td colSpan="5" className="py-16 text-center text-slate-400">
                                    <div className="flex flex-col items-center justify-center">
                                      <Truck size={44} className="stroke-[1.5] mb-2.5 text-slate-300" />
                                      <p className="font-bold text-sm">No suppliers registered</p>
                                    </div>
                                  </td>
                                </tr>
                              );
                            }
                            return paginatedData.map((v, idx) => (
                              <motion.tr
                                variants={rowVariants}
                                initial="hidden"
                                animate="visible"
                                key={v.id}
                                className="hover:bg-indigo-50/20 transition-all border-b border-slate-100"
                              >
                                <td className="py-4.5 px-6 text-slate-900 font-black text-[13px]">{v.name}</td>
                                <td className="py-4.5 px-4 text-slate-500 font-medium">{v.contact || <span className="text-slate-300">-</span>}</td>
                                <td className="py-4.5 px-4 font-mono text-[11px] text-slate-600">
                                  {v.contract_terms ? (
                                    <span className="px-2 py-1 bg-slate-100 border border-slate-200 rounded-lg">
                                      {v.contract_terms}
                                    </span>
                                  ) : (
                                    <span className="text-slate-300">-</span>
                                  )}
                                </td>
                                <td className="py-4.5 px-6 text-center">
                                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200/50">Verified</Badge>
                                </td>
                                <td className="py-4.5 px-6 text-right">
                                  <div className="flex justify-end gap-1.5">
                                    <button
                                      onClick={() => openVendorModal(v)}
                                      className="p-2 text-slate-400 hover:text-indigo-600 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-xl transition-colors cursor-pointer border-0 shadow-sm"
                                    >
                                      <Edit2 size={13} className="stroke-[2.5]" />
                                    </button>
                                    <button
                                      onClick={() => confirmDelete(v, 'vendor')}
                                      className="p-2 text-slate-400 hover:text-rose-600 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-xl transition-colors cursor-pointer border-0 shadow-sm"
                                    >
                                      <Trash2 size={13} className="stroke-[2.5]" />
                                    </button>
                                  </div>
                                </td>
                              </motion.tr>
                            ));
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* PAGINATION PANEL */}
                {totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row justify-between items-center px-6 py-4.5 border border-slate-200/50 bg-slate-50/30 rounded-2xl mt-6 gap-3">
                    <span className="text-[11px] text-slate-400 font-extrabold uppercase tracking-wider">
                      Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalItemsCount)} of {totalItemsCount} entries
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 disabled:opacity-50 hover:bg-slate-50 cursor-pointer shadow-sm border-0 transition-colors"
                      >
                        <ChevronLeft size={16} className="stroke-[2.5]" />
                      </button>
                      <span className="text-xs font-black text-slate-700 px-4 py-2 bg-white border border-slate-200 rounded-xl shadow-sm border-0">
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 disabled:opacity-50 hover:bg-slate-50 cursor-pointer shadow-sm border-0 transition-colors"
                      >
                        <ChevronRight size={16} className="stroke-[2.5]" />
                      </button>
                    </div>
                  </div>
                )}

              </motion.div>
            </AnimatePresence>
          )}

        </div>
      </div>

      {/* --- FORM MODALS --- */}

      {/* ITEM FORM MODAL */}
      <Modal isOpen={isItemModalOpen} onClose={() => setItemModalOpen(false)} title={editingRecord ? 'Edit Catalog Item Details' : 'Add New Item to Master'}>
        <form onSubmit={handleSaveItem} className="space-y-4">
          <div>
            <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">Item Name</label>
            <input required placeholder="e.g. Paracetamol 500mg" type="text" value={itemForm.name} onChange={e => setItemForm({ ...itemForm, name: e.target.value })} className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100/50 border border-slate-200 focus:border-indigo-500/80 focus:bg-white rounded-xl text-sm transition-all focus:ring-4 focus:ring-indigo-100 focus:outline-none placeholder-slate-400 font-semibold text-slate-800 shadow-inner" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">SKU Preview <span className="text-indigo-400 normal-case font-semibold">(auto-generated)</span></label>
              <div className="w-full px-3.5 py-2.5 bg-indigo-50 border border-indigo-200 rounded-xl text-sm font-black text-indigo-700 tracking-widest font-mono flex items-center gap-2">
                <span>{editingRecord ? itemForm.sku : previewSku(itemForm.name)}</span>
                {!editingRecord && <span className="text-[9px] font-bold text-indigo-400 normal-case tracking-normal">(lot # assigned on save)</span>}
              </div>
            </div>
            <div>
              <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">Category</label>
              <select value={itemForm.category} onChange={e => setItemForm({ ...itemForm, category: e.target.value })} className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100/50 border border-slate-200 focus:border-indigo-500/80 focus:bg-white rounded-xl text-sm transition-all focus:ring-4 focus:ring-indigo-100 focus:outline-none font-semibold text-slate-800 cursor-pointer">
                {categoriesList.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">Unit of Measure (UOM)</label>
              <select
                required
                value={itemForm.unit_of_measure}
                onChange={e => setItemForm({ ...itemForm, unit_of_measure: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100/50 border border-slate-200 focus:border-indigo-500/80 focus:bg-white rounded-xl text-sm transition-all focus:ring-4 focus:ring-indigo-100 focus:outline-none font-semibold text-slate-800 cursor-pointer"
              >
                <option value="">Select abbreviation...</option>
                {uoms.map(u => (
                  <option key={u.id} value={u.abbreviation}>
                    {u.name} ({u.abbreviation})
                  </option>
                ))}
              </select>
              <p className="text-[9px] text-slate-400 font-semibold mt-1">Sourced from UOM Master Registry</p>
            </div>
            <div>
              <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">Manufacturer Batch</label>
              <input placeholder="e.g. BATCH-9941" type="text" value={itemForm.batch_number} onChange={e => setItemForm({ ...itemForm, batch_number: e.target.value })} className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100/50 border border-slate-200 focus:border-indigo-500/80 focus:bg-white rounded-xl text-sm transition-all focus:ring-4 focus:ring-indigo-100 focus:outline-none placeholder-slate-400 font-semibold text-slate-800 shadow-inner" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">System Lot Number <span className="text-indigo-400 normal-case font-semibold">(auto-generated)</span></label>
              <div className="w-full px-3.5 py-2.5 bg-indigo-50 border border-indigo-200 rounded-xl text-sm font-black text-indigo-700 tracking-widest font-mono">
                {editingRecord ? `LOT-${itemForm.lot_number || '01'}` : 'LOT-01 (or next sequential)'}
              </div>
            </div>
            <div>
              <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">Purchase Date</label>
              <input type="date" value={itemForm.purchase_time} onChange={e => setItemForm({ ...itemForm, purchase_time: e.target.value })} className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100/50 border border-slate-200 focus:border-indigo-500/80 focus:bg-white rounded-xl text-sm transition-all focus:ring-4 focus:ring-indigo-100 focus:outline-none font-semibold text-slate-800 cursor-pointer shadow-inner" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">Expiry Date</label>
              <input type="date" value={itemForm.expiry_date} onChange={e => setItemForm({ ...itemForm, expiry_date: e.target.value })} className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100/50 border border-slate-200 focus:border-indigo-500/80 focus:bg-white rounded-xl text-sm transition-all focus:ring-4 focus:ring-indigo-100 focus:outline-none font-semibold text-slate-800 cursor-pointer shadow-inner" />
            </div>
            <div>
              <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">Department <span className="text-indigo-400 normal-case font-semibold">(tracking only)</span></label>
              <select value={itemForm.department_id} onChange={e => setItemForm({ ...itemForm, department_id: e.target.value })} className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100/50 border border-slate-200 focus:border-indigo-500/80 focus:bg-white rounded-xl text-sm transition-all focus:ring-4 focus:ring-indigo-100 focus:outline-none font-semibold text-slate-800 cursor-pointer">
                <option value="">- General Store (Global) -</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">Storage <span className="text-indigo-400 normal-case font-semibold">(tracking only)</span></label>
              <select value={itemForm.storage} onChange={e => setItemForm({ ...itemForm, storage: e.target.value })} className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100/50 border border-slate-200 focus:border-indigo-500/80 focus:bg-white rounded-xl text-sm transition-all focus:ring-4 focus:ring-indigo-100 focus:outline-none font-semibold text-slate-800 cursor-pointer">
                <option value="">- Not Set -</option>
                <option value="Medical">Medical</option>
                <option value="Non-Medical">Non-Medical</option>
              </select>
            </div>
          </div>

          {!editingRecord && (
            <button
              type="button"
              onClick={handleAddPendingItem}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1.5"
            >
              <Plus size={14} /> Add to Pending List
            </button>
          )}

          {pendingItems.length > 0 && (
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50 p-4 space-y-2.5">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Pending Items ({pendingItems.length})</p>
              <div className="space-y-2 max-h-[160px] overflow-y-auto">
                {pendingItems.map((item, idx) => (
                  <div key={idx} className="bg-white border border-slate-150 rounded-xl p-2.5 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <p className="font-black text-slate-800">{item.name}</p>
                      <p className="text-[10px] text-slate-400 font-semibold font-mono">SKU: {item.sku} | UOM: {item.unit_of_measure}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPendingItems(prev => prev.filter((_, i) => i !== idx))}
                      className="text-rose-500 hover:text-rose-700 font-bold px-2 py-1 text-[10px] bg-rose-50 hover:bg-rose-100 rounded-lg cursor-pointer transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
            <button type="button" onClick={() => setItemModalOpen(false)} className="px-4 py-2.5 text-xs font-black uppercase tracking-wider text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer border-0">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-100 border-0">
              {isSubmitting && <Loader2 size={14} className="animate-spin" />}
              {editingRecord
                ? 'Update Catalog Item'
                : pendingItems.length > 0
                  ? `Save All (${pendingItems.length + (itemForm.name.trim() ? 1 : 0)} items)`
                  : 'Add Item'}
            </button>
          </div>
        </form>
      </Modal>

      {/* DEPARTMENT FORM MODAL */}
      <Modal isOpen={isDeptModalOpen} onClose={() => setDeptModalOpen(false)} title={editingRecord ? 'Edit Hospital Department' : 'Add New Department Division'}>
        <form onSubmit={handleSaveDept} className="space-y-4">
          <div>
            <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">Department Name</label>
            <input required placeholder="e.g. Pharmacy Ward, Dental Clinic" type="text" value={deptForm.name} onChange={e => setDeptForm({ ...deptForm, name: e.target.value })} className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100/50 border border-slate-200 focus:border-indigo-500/80 focus:bg-white rounded-xl text-sm transition-all focus:ring-4 focus:ring-indigo-100 focus:outline-none placeholder-slate-400 font-semibold text-slate-800 shadow-inner" />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
            <button type="button" onClick={() => setDeptModalOpen(false)} className="px-4 py-2.5 text-xs font-black uppercase tracking-wider text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer border-0">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-100 border-0">
              {isSubmitting && <Loader2 size={14} className="animate-spin" />} {editingRecord ? 'Save Department Details' : 'Add Department'}
            </button>
          </div>
        </form>
      </Modal>

      {/* UOM FORM MODAL */}
      <Modal isOpen={isUomModalOpen} onClose={() => setUomModalOpen(false)} title={editingRecord ? 'Edit Unit of Measure (UOM)' : 'Configure New Unit of Measure'}>
        <form onSubmit={handleSaveUom} className="space-y-4">
          <div>
            <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">Unit Name</label>
            <input required type="text" value={uomForm.name} onChange={e => setUomForm({ ...uomForm, name: e.target.value })} placeholder="e.g. Box, Vial, Ampoule" className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100/50 border border-slate-200 focus:border-indigo-500/80 focus:bg-white rounded-xl text-sm transition-all focus:ring-4 focus:ring-indigo-100 focus:outline-none placeholder-slate-400 font-semibold text-slate-800 shadow-inner" />
          </div>
          <div>
            <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">Abbreviation / Symbol</label>
            <input required type="text" value={uomForm.abbreviation} onChange={e => setUomForm({ ...uomForm, abbreviation: e.target.value })} placeholder="e.g. bx, vl, amp" className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100/50 border border-slate-200 focus:border-indigo-500/80 focus:bg-white rounded-xl text-sm transition-all focus:ring-4 focus:ring-indigo-100 focus:outline-none placeholder-slate-400 font-semibold text-slate-800 shadow-inner" />
          </div>
          <div>
            <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">Description Context</label>
            <textarea value={uomForm.description} onChange={e => setUomForm({ ...uomForm, description: e.target.value })} placeholder="Describe typical quantities or dimensions of this measurement unit..." className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100/50 border border-slate-200 focus:border-indigo-500/80 focus:bg-white rounded-xl text-sm transition-all focus:ring-4 focus:ring-indigo-100 focus:outline-none placeholder-slate-400 font-semibold text-slate-800 min-h-[90px] shadow-inner"></textarea>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
            <button type="button" onClick={() => setUomModalOpen(false)} className="px-4 py-2.5 text-xs font-black uppercase tracking-wider text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer border-0">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-100 border-0">
              {isSubmitting && <Loader2 size={14} className="animate-spin" />} {editingRecord ? 'Save Unit Settings' : 'Add Unit Symbol'}
            </button>
          </div>
        </form>
      </Modal>

      {/* VENDOR FORM MODAL */}
      <Modal isOpen={isVendorModalOpen} onClose={() => setVendorModalOpen(false)} title={editingRecord ? 'Edit Supplier Registry' : 'Register Approved Vendor Partner'}>
        <form onSubmit={handleSaveVendor} className="space-y-4">
          <div>
            <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">Vendor Company Name</label>
            <input required placeholder="e.g. Rwanda Pharma Ltd" type="text" value={vendorForm.name} onChange={e => setVendorForm({ ...vendorForm, name: e.target.value })} className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100/50 border border-slate-200 focus:border-indigo-500/80 focus:bg-white rounded-xl text-sm transition-all focus:ring-4 focus:ring-indigo-100 focus:outline-none placeholder-slate-400 font-semibold text-slate-800 shadow-inner" />
          </div>
          <div>
            <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">Contact Detail (Email / Tel)</label>
            <input placeholder="e.g. orders@rwandapharma.rw or +250..." type="text" value={vendorForm.contact} onChange={e => setVendorForm({ ...vendorForm, contact: e.target.value })} className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100/50 border border-slate-200 focus:border-indigo-500/80 focus:bg-white rounded-xl text-sm transition-all focus:ring-4 focus:ring-indigo-100 focus:outline-none placeholder-slate-400 font-semibold text-slate-800 shadow-inner" />
          </div>
          <div>
            <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">Payment / Contract Terms</label>
            <input type="text" value={vendorForm.contractTerms} onChange={e => setVendorForm({ ...vendorForm, contractTerms: e.target.value })} placeholder="e.g. Net 30, COD, Net 60" className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100/50 border border-slate-200 focus:border-indigo-500/80 focus:bg-white rounded-xl text-sm transition-all focus:ring-4 focus:ring-indigo-100 focus:outline-none placeholder-slate-400 font-semibold text-slate-800 shadow-inner" />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
            <button type="button" onClick={() => setVendorModalOpen(false)} className="px-4 py-2.5 text-xs font-black uppercase tracking-wider text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer border-0">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-100 border-0">
              {isSubmitting && <Loader2 size={14} className="animate-spin" />} {editingRecord ? 'Save Vendor Profile' : 'Register Supplier'}
            </button>
          </div>
        </form>
      </Modal>

      {/* DELETE MODAL */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Confirm Permanent Deletion">
        <div className="flex items-start gap-4 p-4.5 bg-rose-50 border border-rose-100/50 text-rose-800 rounded-2xl mb-6 shadow-sm">
          <AlertTriangle className="shrink-0 mt-0.5 text-rose-600 stroke-[2.5]" size={20} />
          <div>
            <p className="font-black text-sm tracking-tight text-rose-900">Are you sure you want to delete this {recordToDelete?.type}?</p>
            <p className="text-xs mt-1.5 leading-relaxed font-semibold opacity-90 text-rose-800">
              Deleting this record is permanent. This may cause historic item records or batch assignments referencing this entry to become orphaned or display warning states.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={() => setDeleteModalOpen(false)} className="px-4 py-2.5 text-xs font-black uppercase tracking-wider text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer border-0">Cancel</button>
          <button type="button" onClick={handleDelete} disabled={isSubmitting} className="px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-md shadow-rose-100 border-0">
            {isSubmitting && <Loader2 size={14} className="animate-spin" />} Delete Permanently
          </button>
        </div>
      </Modal>

      {/* AI CLASSIFIER MODAL */}
      <Modal isOpen={isAIModalOpen} onClose={() => setAIModalOpen(false)} title="Lumina AI Auto-Classifier">
        {aiStep === 0 && (
          <div className="space-y-6 py-2">
            <div className="flex items-center gap-4 bg-indigo-50 border border-indigo-150 rounded-2xl p-5 shadow-sm">
              <div className="p-3 bg-indigo-600 text-white rounded-xl shadow-md">
                <Brain size={24} className="animate-pulse" />
              </div>
              <div>
                <h3 className="font-black text-slate-800 text-sm tracking-tight">AI Reference Item Classifier</h3>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">Automated heuristics and UOM resolution</p>
              </div>
            </div>

            <div className="space-y-3.5 text-xs text-slate-650 leading-relaxed font-semibold">
              <p>
                The Lumina AI Agent will inspect every product and service in your Master Catalog database. By parsing titles, keywords, dosage formats, and suffixes, it will automatically propose standard classifications:
              </p>
              <div className="grid grid-cols-2 gap-3.5 pt-2">
                <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl space-y-1">
                  <span className="font-extrabold text-indigo-600">🏷️ CATEGORY</span>
                  <p className="text-[10px] text-slate-400 font-medium mt-1">Medications, Consumables, Sutures, Anesthetics, Antiseptics...</p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl space-y-1">
                  <span className="font-extrabold text-indigo-600">🏥 DEPARTMENT</span>
                  <p className="text-[10px] text-slate-400 font-medium mt-1">Nursing, Dental, Physio, Laboratory, Imaging, General Store...</p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl space-y-1">
                  <span className="font-extrabold text-indigo-600">❄️ STORAGE TYPE</span>
                  <p className="text-[10px] text-slate-400 font-medium mt-1">Medical vs. Non-Medical storage environment requirements</p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl space-y-1">
                  <span className="font-extrabold text-indigo-600">⚖️ MEASUREMENT UOM</span>
                  <p className="text-[10px] text-slate-400 font-medium mt-1">Standardizing items into tablets, vials, pieces, boxes...</p>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 font-extrabold mt-3 border-t border-slate-100 pt-3">
                Note: No data will be written until you review and confirm the classifications on the next step.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setAIModalOpen(false)} className="px-4 py-2.5 text-xs font-black uppercase tracking-wider text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer border-0">Cancel</button>
              <button type="button" onClick={handleStartAIClassification} className="px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-150 border-0">
                <Sparkles size={14} className="stroke-[2.5]" /> Start AI Classification
              </button>
            </div>
          </div>
        )}

        {aiStep === 1 && (
          <div className="flex flex-col items-center justify-center py-12 space-y-6">
            <div className="relative animate-bounce">
              <div className="absolute inset-0 bg-indigo-200 rounded-full blur-xl animate-pulse"></div>
              <div className="relative p-5 bg-indigo-600 text-white rounded-full shadow-lg">
                <Brain size={36} className="animate-spin" />
              </div>
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-sm font-black text-slate-800 tracking-tight">AI Agent Working...</h3>
              <p className="text-xs text-indigo-600 font-extrabold font-mono tracking-widest">{aiProgress}%</p>
              <p className="text-[11px] text-slate-400 font-semibold max-w-sm truncate px-4">{currentAIItemName}</p>
            </div>
            <div className="w-64 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
              <div className="h-full bg-indigo-600 transition-all duration-100 rounded-full" style={{ width: `${aiProgress}%` }}></div>
            </div>
          </div>
        )}

        {aiStep === 2 && (
          <div className="space-y-6 py-2">
            <div className="flex items-center justify-between border-b border-slate-150 pb-4">
              <div>
                <h3 className="font-black text-slate-800 text-sm tracking-tight">AI Suggested Classifications</h3>
                <p className="text-xs text-slate-400 font-bold mt-0.5">
                  Showing {aiSuggestions.length} items parsed. {aiSuggestions.filter(s => s.isDifferent).length} recommend changes.
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => {
                  const hasDiff = aiSuggestions.filter(s => s.isDifferent).map(s => s.itemId);
                  setSelectedAISuggestions(selectedAISuggestions.length === hasDiff.length ? [] : hasDiff);
                }} 
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-xl text-[10px] font-black text-slate-650 transition-colors uppercase tracking-wider cursor-pointer"
              >
                Toggle Only Changed Items
              </button>
            </div>

            <div className="max-h-[380px] overflow-y-auto border border-slate-150 rounded-2xl bg-slate-50/50 p-2 space-y-2.5">
              {aiSuggestions.length === 0 ? (
                <div className="py-12 text-center text-slate-400 font-semibold">No items available for classification.</div>
              ) : (
                aiSuggestions.map(s => {
                  const isSelected = selectedAISuggestions.includes(s.itemId);
                  return (
                    <div 
                      key={s.itemId}
                      onClick={() => {
                        setSelectedAISuggestions(prev => 
                          prev.includes(s.itemId) ? prev.filter(id => id !== s.itemId) : [...prev, s.itemId]
                        );
                      }}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex gap-3 text-xs ${
                        isSelected 
                          ? 'bg-white border-indigo-300 shadow-sm shadow-indigo-50/50' 
                          : 'bg-white/60 border-slate-205 border-slate-200 hover:border-slate-350'
                      }`}
                    >
                      <input 
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}} // handled by div onClick
                        className="w-4 h-4 rounded accent-indigo-600 mt-0.5 cursor-pointer shrink-0"
                      />
                      <div className="flex-1 space-y-2.5">
                        <div className="flex justify-between items-start gap-2">
                          <span className="font-black text-slate-800 tracking-tight leading-snug">{s.name}</span>
                          <span className={`px-2 py-0.5 rounded-lg border text-[9px] font-black uppercase tracking-wider ${
                            s.confidence > 0.7 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                              : 'bg-amber-50 text-amber-705 text-amber-700 border-amber-100'
                          }`}>
                            {Math.round(s.confidence * 100)}% Conf
                          </span>
                        </div>

                        {/* Suggestions list */}
                        <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-150">
                          {/* Category change */}
                          <div className="space-y-0.5">
                            <span className="text-[9px] uppercase font-black text-slate-400 block">Category</span>
                            {s.currentCategory === s.suggestedCategory ? (
                              <span className="text-slate-650">{formatCategoryName(s.suggestedCategory)}</span>
                            ) : (
                              <div className="flex flex-wrap items-center gap-1">
                                <span className="text-slate-450 text-slate-400 line-through truncate max-w-[80px]">{formatCategoryName(s.currentCategory)}</span>
                                <span className="text-indigo-600 font-black">➜ {formatCategoryName(s.suggestedCategory)}</span>
                              </div>
                            )}
                          </div>

                          {/* Department change */}
                          <div className="space-y-0.5">
                            <span className="text-[9px] uppercase font-black text-slate-400 block">Department</span>
                            {s.currentDepartmentId === s.suggestedDepartmentId ? (
                              <span className="text-slate-650">{s.suggestedDepartmentName}</span>
                            ) : (
                              <div className="flex flex-wrap items-center gap-1">
                                <span className="text-slate-455 text-slate-400 line-through truncate max-w-[80px]">{s.currentDepartmentName}</span>
                                <span className="text-indigo-600 font-black">➜ {s.suggestedDepartmentName}</span>
                              </div>
                            )}
                          </div>

                          {/* Storage change */}
                          <div className="space-y-0.5">
                            <span className="text-[9px] uppercase font-black text-slate-400 block">Storage</span>
                            {s.currentStorage === s.suggestedStorage ? (
                              <span className="text-slate-650">{s.suggestedStorage}</span>
                            ) : (
                              <div className="flex flex-wrap items-center gap-1">
                                <span className="text-slate-455 text-slate-400 line-through">{s.currentStorage}</span>
                                <span className="text-indigo-600 font-black">➜ {s.suggestedStorage}</span>
                              </div>
                            )}
                          </div>

                          {/* UOM change */}
                          <div className="space-y-0.5">
                            <span className="text-[9px] uppercase font-black text-slate-400 block">UOM</span>
                            {s.currentUom === s.suggestedUom ? (
                              <span className="text-slate-650">{s.suggestedUom}</span>
                            ) : (
                              <div className="flex flex-wrap items-center gap-1">
                                <span className="text-slate-455 text-slate-400 line-through">{s.currentUom}</span>
                                <span className="text-indigo-600 font-black">➜ {s.suggestedUom}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Rationale explanation */}
                        <p className="text-[10px] text-slate-400 italic leading-normal border-l-2 border-indigo-300 pl-2">
                          {s.categoryReason}. {s.departmentReason}.
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-100">
              <span className="text-xs font-black text-indigo-700">
                {selectedAISuggestions.length} recommendations selected to apply
              </span>
              <div className="flex gap-3">
                <button type="button" onClick={() => setAIStep(0)} className="px-4 py-2.5 text-xs font-black uppercase tracking-wider text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer border-0">Back</button>
                <button 
                  type="button" 
                  onClick={handleApplyAISuggestions} 
                  disabled={isAIApplying || selectedAISuggestions.length === 0}
                  className="px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-150 border-0"
                >
                  {isAIApplying && <Loader2 size={14} className="animate-spin" />}
                  Apply Suggestions
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <style jsx>{`
        .scrollbar-none::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-none {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
