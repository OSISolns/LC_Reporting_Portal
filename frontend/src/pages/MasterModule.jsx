import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { Database, Package, Scale, Truck, DollarSign, Plus, RefreshCw, Loader2, ArrowLeft, Building2, Edit2, Trash2, X, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search } from 'lucide-react';

function Badge({ children, className = '' }) {
  return <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg border ${className}`}>{children}</span>;
}

// Reusable Modal Component
function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;
  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200"
        >
          <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-lg font-black text-slate-800">{title}</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
              <X size={20} />
            </button>
          </div>
          <div className="p-6">
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

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm]);

  const renderPagination = (totalItems) => {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (totalPages <= 1) return null;

    return (
      <div className="flex justify-between items-center px-6 py-4 border-t border-slate-100 bg-slate-50/50">
        <span className="text-xs text-slate-500 font-bold">
          Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} entries
        </span>
        <div className="flex gap-2">
          <button 
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-50 hover:bg-slate-50 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-xs font-bold text-slate-700 px-3 py-1.5 bg-white border border-slate-200 rounded-lg">
            Page {currentPage} of {totalPages}
          </span>
          <button 
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-50 hover:bg-slate-50 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    );
  };


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
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  
  const [editingRecord, setEditingRecord] = useState(null);
  const [recordToDelete, setRecordToDelete] = useState(null);

  // Form states
  const [itemForm, setItemForm] = useState({ name: '', sku: '', category: 'medical_supplies', unit_of_measure: 'Unit' });
  const [deptForm, setDeptForm] = useState({ name: '' });
  const [vendorForm, setVendorForm] = useState({ name: '', contact: '', contractTerms: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadMasterData();
  }, []);

  const loadMasterData = async () => {
    setLoading(true);
    try {
      const [invRes, venRes, deptRes] = await Promise.allSettled([
        api.get('/clinical/inventory/master'),
        api.get('/clinical/inventory/vendors'),
        api.get('/clinical/inventory/departments')
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

      setUoms([
        { id: 1, name: "Box", abbreviation: "bx", description: "Standard purchasing unit for bulk items" },
        { id: 2, name: "Pack / Package", abbreviation: "pk", description: "Bundled items like sterile gauze packs" },
        { id: 3, name: "Vial", abbreviation: "vl", description: "Individual glass or plastic vessels" },
        { id: 4, name: "Piece", abbreviation: "pc", description: "Smallest single unit of inventory" },
        { id: 5, name: "Roll", abbreviation: "rl", description: "Medical tape, casting material" },
      ]);

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

  // --- CRUD Actions ---

  const openItemModal = (item = null) => {
    if (item) {
      setEditingRecord(item);
      setItemForm({ name: item.name, sku: item.sku, category: item.category, unit_of_measure: item.unit_of_measure });
    } else {
      setEditingRecord(null);
      setItemForm({ name: '', sku: '', category: 'medical_supplies', unit_of_measure: 'Unit' });
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

  const confirmDelete = (record, type) => {
    setRecordToDelete({ ...record, type });
    setDeleteModalOpen(true);
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingRecord) {
        await api.put(`/clinical/inventory/master/${editingRecord.id}`, itemForm);
        toast.success('Item updated successfully');
      } else {
        await api.post('/clinical/inventory/master', itemForm);
        toast.success('Item added successfully');
      }
      setItemModalOpen(false);
      loadMasterData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save item');
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


  const tabContentVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, y: -10, transition: { duration: 0.2 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0 }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-12 font-sans relative overflow-hidden">
      
      {/* Background Blurs for Premium Feel */}
      <div className="absolute top-0 right-0 -mr-32 -mt-32 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 -ml-32 -mb-32 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Top Header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-slate-200/50 sticky top-0 z-30 shadow-sm px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/stock-manager-dashboard')}
            className="flex items-center text-xs font-bold text-slate-600 hover:text-slate-900 bg-white/50 hover:bg-slate-100 px-3.5 py-2 rounded-xl transition-all shadow-sm border border-slate-200 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-inner text-white rounded-xl"><Database size={18} /></span>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">Master</h1>
            </div>
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider mt-0.5">Centralized Registry & Settings</p>
          </div>
        </div>

        <button 
          onClick={handleSync}
          disabled={syncing}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-indigo-200 transition-all flex items-center gap-2 border-0 cursor-pointer"
        >
          <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
          {syncing ? 'Synchronizing...' : 'Sync with Modules'}
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-8 relative z-10">
        
        {/* Navigation Tabs and Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex overflow-x-auto border-b border-slate-200/50 pb-0.5 select-none gap-2 bg-white/60 backdrop-blur-md px-5 py-2.5 rounded-2xl border shadow-sm scrollbar-none flex-1">
            {[
              { id: 'items', label: 'Items Master', icon: <Package size={14} /> },
              { id: 'departments', label: 'Department Master', icon: <Building2 size={14} /> },
              { id: 'uoms', label: 'Unit of Measure', icon: <Scale size={14} /> },
              { id: 'vendors', label: 'Vendor Master', icon: <Truck size={14} /> },
              { id: 'prices', label: 'Price Master', icon: <DollarSign size={14} /> }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-black uppercase tracking-wider relative transition-all border-b-2 -mb-[11px] border-0 bg-transparent shrink-0 cursor-pointer ${
                  activeTab === tab.id
                    ? 'border-indigo-600 text-indigo-700'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
          <div className="relative shrink-0 w-full md:w-64">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search in active tab..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white/80 backdrop-blur-md rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex h-[40vh] items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              variants={tabContentVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="bg-white/80 backdrop-blur-2xl rounded-3xl border border-slate-200/50 shadow-sm overflow-hidden"
            >
              
              {/* ITEMS MASTER */}
              {activeTab === 'items' && (
                <div className="p-0">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                    <div>
                      <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Items Master Registry</h3>
                      <p className="text-[10px] text-slate-400 font-extrabold mt-0.5">Global catalog of all products and services</p>
                    </div>
                    <button onClick={() => openItemModal()} className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-4 py-2 rounded-xl text-xs font-bold border border-indigo-200 flex items-center gap-1.5 cursor-pointer transition-colors">
                      <Plus size={14} /> Add Item
                    </button>
                  </div>
                  <div className="overflow-x-auto p-6">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-slate-400 uppercase tracking-widest text-[9px] font-black border-b border-slate-200/60">
                          <th className="pb-3 px-4">Item Name</th>
                          <th className="pb-3 px-4">SKU / Code</th>
                          <th className="pb-3 px-4">Category</th>
                          <th className="pb-3 px-4 text-center">Status</th>
                          <th className="pb-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                        {(() => {
                          const filtered = items.filter(item => item.name?.toLowerCase().includes(searchTerm.toLowerCase()) || item.sku?.toLowerCase().includes(searchTerm.toLowerCase()) || item.category?.toLowerCase().includes(searchTerm.toLowerCase()));
                          const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
                          return (
                            <>
                              {paginated.map((item, idx) => (
                          <motion.tr variants={itemVariants} initial="hidden" animate="visible" transition={{ delay: idx * 0.05 }} key={item.id} className="hover:bg-indigo-50/30 transition-colors">
                            <td className="py-4 px-4 text-slate-900 font-black text-[13px]">{item.name}</td>
                            <td className="py-4 px-4 font-mono text-[11px] text-slate-500 bg-slate-50/50 rounded-md w-max inline-block mt-2 ml-4">{item.sku}</td>
                            <td className="py-4 px-4 capitalize">{item.category?.replace(/_/g, ' ')}</td>
                            <td className="py-4 px-4 text-center">
                              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Active</Badge>
                            </td>
                            <td className="py-4 px-4 text-right">
                              <div className="flex justify-end gap-2">
                                <button onClick={() => openItemModal(item)} className="p-1.5 text-slate-400 hover:text-indigo-600 bg-white hover:bg-indigo-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"><Edit2 size={14} /></button>
                                <button onClick={() => confirmDelete(item, 'item')} className="p-1.5 text-slate-400 hover:text-red-600 bg-white hover:bg-red-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"><Trash2 size={14} /></button>
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                            </>
                          );
                        })()}
                      </tbody>
                    </table>
                  </div>
                  {(() => {
                    const dataMap = {
                      'items': items,
                      'departments': departments,
                      'uoms': uoms,
                      'vendors': vendors,
                      'prices': prices
                    };
                    let filtered = dataMap[activeTab] || [];
                    if (activeTab === 'items') filtered = filtered.filter(item => item.name?.toLowerCase().includes(searchTerm.toLowerCase()) || item.sku?.toLowerCase().includes(searchTerm.toLowerCase()) || item.category?.toLowerCase().includes(searchTerm.toLowerCase()));
                    else if (activeTab === 'departments') filtered = filtered.filter(dept => dept.name?.toLowerCase().includes(searchTerm.toLowerCase()));
                    else if (activeTab === 'uoms') filtered = filtered.filter(u => u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || u.abbreviation?.toLowerCase().includes(searchTerm.toLowerCase()));
                    else if (activeTab === 'vendors') filtered = filtered.filter(v => v.name?.toLowerCase().includes(searchTerm.toLowerCase()) || v.contact?.toLowerCase().includes(searchTerm.toLowerCase()));
                    else if (activeTab === 'prices') filtered = filtered.filter(p => (p.item_name || p.name)?.toLowerCase().includes(searchTerm.toLowerCase()));
                    return renderPagination(filtered.length);
                  })()}
                </div>
              )}

              {/* DEPARTMENT MASTER */}
              {activeTab === 'departments' && (
                <div className="p-0">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                    <div>
                      <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Department Master</h3>
                      <p className="text-[10px] text-slate-400 font-extrabold mt-0.5">Configuration of clinical units and cost centers</p>
                    </div>
                    <button onClick={() => openDeptModal()} className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-4 py-2 rounded-xl text-xs font-bold border border-indigo-200 flex items-center gap-1.5 cursor-pointer transition-colors">
                      <Plus size={14} /> Add Department
                    </button>
                  </div>
                  <div className="overflow-x-auto p-6">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-slate-400 uppercase tracking-widest text-[9px] font-black border-b border-slate-200/60">
                          <th className="pb-3 px-4">Department Name</th>
                          <th className="pb-3 px-4 text-center">Status</th>
                          <th className="pb-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                        {(() => {
                          const filtered = departments.filter(dept => dept.name?.toLowerCase().includes(searchTerm.toLowerCase()));
                          const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
                          return (
                            <>
                              {paginated.map((dept, idx) => (
                          <motion.tr variants={itemVariants} initial="hidden" animate="visible" transition={{ delay: idx * 0.05 }} key={dept.id} className="hover:bg-indigo-50/30 transition-colors">
                            <td className="py-4 px-4 text-slate-900 font-black text-[13px]">{dept.name}</td>
                            <td className="py-4 px-4 text-center">
                              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Active</Badge>
                            </td>
                            <td className="py-4 px-4 text-right">
                              <div className="flex justify-end gap-2">
                                <button onClick={() => openDeptModal(dept)} className="p-1.5 text-slate-400 hover:text-indigo-600 bg-white hover:bg-indigo-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"><Edit2 size={14} /></button>
                                <button onClick={() => confirmDelete(dept, 'department')} className="p-1.5 text-slate-400 hover:text-red-600 bg-white hover:bg-red-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"><Trash2 size={14} /></button>
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                            </>
                          );
                        })()}
                      </tbody>
                    </table>
                  </div>
                  {(() => {
                    const dataMap = {
                      'items': items,
                      'departments': departments,
                      'uoms': uoms,
                      'vendors': vendors,
                      'prices': prices
                    };
                    let filtered = dataMap[activeTab] || [];
                    if (activeTab === 'items') filtered = filtered.filter(item => item.name?.toLowerCase().includes(searchTerm.toLowerCase()) || item.sku?.toLowerCase().includes(searchTerm.toLowerCase()) || item.category?.toLowerCase().includes(searchTerm.toLowerCase()));
                    else if (activeTab === 'departments') filtered = filtered.filter(dept => dept.name?.toLowerCase().includes(searchTerm.toLowerCase()));
                    else if (activeTab === 'uoms') filtered = filtered.filter(u => u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || u.abbreviation?.toLowerCase().includes(searchTerm.toLowerCase()));
                    else if (activeTab === 'vendors') filtered = filtered.filter(v => v.name?.toLowerCase().includes(searchTerm.toLowerCase()) || v.contact?.toLowerCase().includes(searchTerm.toLowerCase()));
                    else if (activeTab === 'prices') filtered = filtered.filter(p => (p.item_name || p.name)?.toLowerCase().includes(searchTerm.toLowerCase()));
                    return renderPagination(filtered.length);
                  })()}
                </div>
              )}

              {/* UOM MASTER */}
              {activeTab === 'uoms' && (
                <div className="p-0">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                    <div>
                      <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Unit of Measure (UOM)</h3>
                      <p className="text-[10px] text-slate-400 font-extrabold mt-0.5">Standardized measurement units for inventory</p>
                    </div>
                    <button className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-4 py-2 rounded-xl text-xs font-bold border border-indigo-200 flex items-center gap-1.5 cursor-pointer transition-colors opacity-50 cursor-not-allowed">
                      <Plus size={14} /> Add UOM
                    </button>
                  </div>
                  <div className="overflow-x-auto p-6">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-slate-400 uppercase tracking-widest text-[9px] font-black border-b border-slate-200/60">
                          <th className="pb-3 px-4">Unit Name</th>
                          <th className="pb-3 px-4">Abbreviation</th>
                          <th className="pb-3 px-4">Description</th>
                          <th className="pb-3 px-4 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                        {(() => {
                          const filtered = uoms.filter(u => u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || u.abbreviation?.toLowerCase().includes(searchTerm.toLowerCase()));
                          const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
                          return (
                            <>
                              {paginated.map((u, idx) => (
                          <motion.tr variants={itemVariants} initial="hidden" animate="visible" transition={{ delay: idx * 0.05 }} key={u.id} className="hover:bg-indigo-50/30 transition-colors">
                            <td className="py-4 px-4 text-slate-900 font-black text-[13px]">{u.name}</td>
                            <td className="py-4 px-4 font-mono text-[11px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded ml-4">{u.abbreviation}</td>
                            <td className="py-4 px-4 text-slate-500">{u.description}</td>
                            <td className="py-4 px-4 text-center">
                              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Active</Badge>
                            </td>
                          </motion.tr>
                        ))}
                            </>
                          );
                        })()}
                      </tbody>
                    </table>
                  </div>
                  {(() => {
                    const dataMap = {
                      'items': items,
                      'departments': departments,
                      'uoms': uoms,
                      'vendors': vendors,
                      'prices': prices
                    };
                    let filtered = dataMap[activeTab] || [];
                    if (activeTab === 'items') filtered = filtered.filter(item => item.name?.toLowerCase().includes(searchTerm.toLowerCase()) || item.sku?.toLowerCase().includes(searchTerm.toLowerCase()) || item.category?.toLowerCase().includes(searchTerm.toLowerCase()));
                    else if (activeTab === 'departments') filtered = filtered.filter(dept => dept.name?.toLowerCase().includes(searchTerm.toLowerCase()));
                    else if (activeTab === 'uoms') filtered = filtered.filter(u => u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || u.abbreviation?.toLowerCase().includes(searchTerm.toLowerCase()));
                    else if (activeTab === 'vendors') filtered = filtered.filter(v => v.name?.toLowerCase().includes(searchTerm.toLowerCase()) || v.contact?.toLowerCase().includes(searchTerm.toLowerCase()));
                    else if (activeTab === 'prices') filtered = filtered.filter(p => (p.item_name || p.name)?.toLowerCase().includes(searchTerm.toLowerCase()));
                    return renderPagination(filtered.length);
                  })()}
                </div>
              )}

              {/* VENDOR MASTER */}
              {activeTab === 'vendors' && (
                <div className="p-0">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                    <div>
                      <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Vendor Master</h3>
                      <p className="text-[10px] text-slate-400 font-extrabold mt-0.5">Global list of approved suppliers</p>
                    </div>
                    <button onClick={() => openVendorModal()} className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-4 py-2 rounded-xl text-xs font-bold border border-indigo-200 flex items-center gap-1.5 cursor-pointer transition-colors">
                      <Plus size={14} /> Add Vendor
                    </button>
                  </div>
                  <div className="overflow-x-auto p-6">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-slate-400 uppercase tracking-widest text-[9px] font-black border-b border-slate-200/60">
                          <th className="pb-3 px-4">Vendor Name</th>
                          <th className="pb-3 px-4">Contact</th>
                          <th className="pb-3 px-4">Contract Terms</th>
                          <th className="pb-3 px-4 text-center">Status</th>
                          <th className="pb-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                        {(() => {
                          const filtered = vendors.filter(v => v.name?.toLowerCase().includes(searchTerm.toLowerCase()) || v.contact?.toLowerCase().includes(searchTerm.toLowerCase()));
                          const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
                          return (
                            <>
                              {paginated.map((v, idx) => (
                          <motion.tr variants={itemVariants} initial="hidden" animate="visible" transition={{ delay: idx * 0.05 }} key={v.id} className="hover:bg-indigo-50/30 transition-colors">
                            <td className="py-4 px-4 text-slate-900 font-black text-[13px]">{v.name}</td>
                            <td className="py-4 px-4 text-slate-500">{v.contact}</td>
                            <td className="py-4 px-4 font-mono text-slate-500 bg-slate-50 px-2 py-0.5 rounded ml-4">{v.contract_terms}</td>
                            <td className="py-4 px-4 text-center">
                              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Active</Badge>
                            </td>
                            <td className="py-4 px-4 text-right">
                              <div className="flex justify-end gap-2">
                                <button onClick={() => openVendorModal(v)} className="p-1.5 text-slate-400 hover:text-indigo-600 bg-white hover:bg-indigo-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"><Edit2 size={14} /></button>
                                <button onClick={() => confirmDelete(v, 'vendor')} className="p-1.5 text-slate-400 hover:text-red-600 bg-white hover:bg-red-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"><Trash2 size={14} /></button>
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                            </>
                          );
                        })()}
                      </tbody>
                    </table>
                  </div>
                  {(() => {
                    const dataMap = {
                      'items': items,
                      'departments': departments,
                      'uoms': uoms,
                      'vendors': vendors,
                      'prices': prices
                    };
                    let filtered = dataMap[activeTab] || [];
                    if (activeTab === 'items') filtered = filtered.filter(item => item.name?.toLowerCase().includes(searchTerm.toLowerCase()) || item.sku?.toLowerCase().includes(searchTerm.toLowerCase()) || item.category?.toLowerCase().includes(searchTerm.toLowerCase()));
                    else if (activeTab === 'departments') filtered = filtered.filter(dept => dept.name?.toLowerCase().includes(searchTerm.toLowerCase()));
                    else if (activeTab === 'uoms') filtered = filtered.filter(u => u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || u.abbreviation?.toLowerCase().includes(searchTerm.toLowerCase()));
                    else if (activeTab === 'vendors') filtered = filtered.filter(v => v.name?.toLowerCase().includes(searchTerm.toLowerCase()) || v.contact?.toLowerCase().includes(searchTerm.toLowerCase()));
                    else if (activeTab === 'prices') filtered = filtered.filter(p => (p.item_name || p.name)?.toLowerCase().includes(searchTerm.toLowerCase()));
                    return renderPagination(filtered.length);
                  })()}
                </div>
              )}

              {/* PRICE MASTER */}
              {activeTab === 'prices' && (
                <div className="p-0">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                    <div>
                      <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Price Master</h3>
                      <p className="text-[10px] text-slate-400 font-extrabold mt-0.5">Base costs and selling prices (RWF)</p>
                    </div>
                    <button className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-4 py-2 rounded-xl text-xs font-bold border border-indigo-200 flex items-center gap-1.5 cursor-pointer transition-colors opacity-50 cursor-not-allowed">
                      <Plus size={14} /> Config Price
                    </button>
                  </div>
                  <div className="overflow-x-auto p-6">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-slate-400 uppercase tracking-widest text-[9px] font-black border-b border-slate-200/60">
                          <th className="pb-3 px-4">Item Name</th>
                          <th className="pb-3 px-4 text-right">Base Cost (RWF)</th>
                          <th className="pb-3 px-4 text-center">Markup %</th>
                          <th className="pb-3 px-4 text-right">Selling Price (RWF)</th>
                          <th className="pb-3 px-4 text-center">Effective Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                        {(() => {
                          const filtered = prices.filter(p => (p.item_name || p.name)?.toLowerCase().includes(searchTerm.toLowerCase()));
                          const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
                          return (
                            <>
                              {paginated.map((p, idx) => (
                          <motion.tr variants={itemVariants} initial="hidden" animate="visible" transition={{ delay: idx * 0.05 }} key={p.id} className="hover:bg-indigo-50/30 transition-colors">
                            <td className="py-4 px-4 text-slate-900 font-black text-[13px]">{p.item_name || p.name}</td>
                            <td className="py-4 px-4 text-right font-mono text-slate-500">{p.base_cost.toLocaleString()} RWF</td>
                            <td className="py-4 px-4 text-center">
                              <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded font-black">{p.markup_percentage}%</span>
                            </td>
                            <td className="py-4 px-4 text-right font-mono text-indigo-700 font-black text-[14px]">{p.selling_price.toLocaleString()} RWF</td>
                            <td className="py-4 px-4 text-center text-slate-500">{p.effective_date}</td>
                          </motion.tr>
                        ))}
                            </>
                          );
                        })()}
                      </tbody>
                    </table>
                  </div>
                  {(() => {
                    const dataMap = {
                      'items': items,
                      'departments': departments,
                      'uoms': uoms,
                      'vendors': vendors,
                      'prices': prices
                    };
                    let filtered = dataMap[activeTab] || [];
                    if (activeTab === 'items') filtered = filtered.filter(item => item.name?.toLowerCase().includes(searchTerm.toLowerCase()) || item.sku?.toLowerCase().includes(searchTerm.toLowerCase()) || item.category?.toLowerCase().includes(searchTerm.toLowerCase()));
                    else if (activeTab === 'departments') filtered = filtered.filter(dept => dept.name?.toLowerCase().includes(searchTerm.toLowerCase()));
                    else if (activeTab === 'uoms') filtered = filtered.filter(u => u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || u.abbreviation?.toLowerCase().includes(searchTerm.toLowerCase()));
                    else if (activeTab === 'vendors') filtered = filtered.filter(v => v.name?.toLowerCase().includes(searchTerm.toLowerCase()) || v.contact?.toLowerCase().includes(searchTerm.toLowerCase()));
                    else if (activeTab === 'prices') filtered = filtered.filter(p => (p.item_name || p.name)?.toLowerCase().includes(searchTerm.toLowerCase()));
                    return renderPagination(filtered.length);
                  })()}
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* --- MODALS --- */}

      <Modal isOpen={isItemModalOpen} onClose={() => setItemModalOpen(false)} title={editingRecord ? 'Edit Item' : 'Add New Item'}>
        <form onSubmit={handleSaveItem} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Item Name</label>
            <input required type="text" value={itemForm.name} onChange={e => setItemForm({...itemForm, name: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">SKU</label>
              <input required type="text" value={itemForm.sku} onChange={e => setItemForm({...itemForm, sku: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
              <select value={itemForm.category} onChange={e => setItemForm({...itemForm, category: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                <option value="medical_supplies">Medical Supplies</option>
                <option value="medications">Medications</option>
                <option value="anesthetics">Anesthetics</option>
                <option value="antiseptics">Antiseptics</option>
                <option value="sutures">Sutures</option>
                <option value="antidotes">Antidotes</option>
                <option value="stationery">Stationery</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Unit of Measure</label>
            <input required type="text" value={itemForm.unit_of_measure} onChange={e => setItemForm({...itemForm, unit_of_measure: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setItemModalOpen(false)} className="px-4 py-2 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2">
              {isSubmitting && <Loader2 size={16} className="animate-spin" />} Save Item
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isDeptModalOpen} onClose={() => setDeptModalOpen(false)} title={editingRecord ? 'Edit Department' : 'Add New Department'}>
        <form onSubmit={handleSaveDept} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Department Name</label>
            <input required type="text" value={deptForm.name} onChange={e => setDeptForm({...deptForm, name: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setDeptModalOpen(false)} className="px-4 py-2 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2">
              {isSubmitting && <Loader2 size={16} className="animate-spin" />} Save Department
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isVendorModalOpen} onClose={() => setVendorModalOpen(false)} title={editingRecord ? 'Edit Vendor' : 'Add New Vendor'}>
        <form onSubmit={handleSaveVendor} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Vendor Name</label>
            <input required type="text" value={vendorForm.name} onChange={e => setVendorForm({...vendorForm, name: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Contact Email / Phone</label>
            <input type="text" value={vendorForm.contact} onChange={e => setVendorForm({...vendorForm, contact: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Contract Terms</label>
            <input type="text" value={vendorForm.contractTerms} onChange={e => setVendorForm({...vendorForm, contractTerms: e.target.value})} placeholder="e.g. Net 30, COD" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setVendorModalOpen(false)} className="px-4 py-2 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2">
              {isSubmitting && <Loader2 size={16} className="animate-spin" />} Save Vendor
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isDeleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Confirm Deletion">
        <div className="flex items-start gap-4 p-4 bg-red-50 text-red-800 rounded-2xl mb-6">
          <AlertTriangle className="shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-sm">Are you sure you want to delete this {recordToDelete?.type}?</p>
            <p className="text-xs mt-1 opacity-90">This action cannot be undone and may affect historical records.</p>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => setDeleteModalOpen(false)} className="px-4 py-2 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Cancel</button>
          <button type="button" onClick={handleDelete} disabled={isSubmitting} className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2">
            {isSubmitting && <Loader2 size={16} className="animate-spin" />} Delete Permanently
          </button>
        </div>
      </Modal>

      <style jsx>{`
        .scrollbar-none::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
