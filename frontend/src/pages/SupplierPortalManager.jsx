import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Building, FileText, ClipboardList, Plus, Eye, Check, X, 
  RefreshCw, CheckCircle, Clock, AlertTriangle, 
  Search, Loader2, ArrowRight, User, AlertCircle, Link
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/axios';
import { toast } from 'react-hot-toast';

export default function SupplierPortalManager() {
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Core data states
  const [vendors, setVendors] = useState([]);
  const [masterInventory, setMasterInventory] = useState([]);
  const [portalSessions, setPortalSessions] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  
  // Selected submission drawer
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [submissionItems, setSubmissionItems] = useState([]);
  const [loadingSubItems, setLoadingSubItems] = useState(false);
  const [processingReceive, setProcessingReceive] = useState(false);

  // Setup form states
  const [setupVendorId, setSetupVendorId] = useState('');
  const [setupRequestedItems, setSetupRequestedItems] = useState([]);
  const [tempPortalItemName, setTempPortalItemName] = useState('');
  const [tempPortalItemQty, setTempPortalItemQty] = useState('');

  // Load Data
  const loadData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);

      const [venRes, mastRes, portRes, subRes] = await Promise.allSettled([
        api.get('/clinical/inventory/vendors'),
        api.get('/clinical/inventory/master'),
        api.get('/clinical/inventory/supplier-portal/settings'),
        api.get('/clinical/inventory/supplier-portal/submissions')
      ]);

      if (venRes.status === 'fulfilled' && venRes.value.data.success) setVendors(venRes.value.data.data || []);
      if (mastRes.status === 'fulfilled' && mastRes.value.data.success) setMasterInventory(mastRes.value.data.data || []);
      if (portRes.status === 'fulfilled' && portRes.value.data.success) setPortalSessions(portRes.value.sessions || []);
      if (subRes.status === 'fulfilled' && subRes.value.data.success) setSubmissions(subRes.value.data.data || []);

    } catch (err) {
      console.error(err);
      toast.error('Failed to load supplier portal configurations.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handlers
  const handleAddPortalRequestedItem = () => {
    if (!tempPortalItemName.trim() || !tempPortalItemQty) {
      toast.error('Specify product name and quantity.');
      return;
    }
    const qty = parseInt(tempPortalItemQty, 10);
    if (isNaN(qty) || qty <= 0) {
      toast.error('Quantity must be greater than 0.');
      return;
    }

    const matched = masterInventory.find(i => i.name.toLowerCase() === tempPortalItemName.toLowerCase());

    if (setupRequestedItems.some(i => i.name.toLowerCase() === tempPortalItemName.toLowerCase())) {
      toast.error('Product already added.');
      return;
    }

    setSetupRequestedItems([...setupRequestedItems, {
      name: tempPortalItemName.trim(),
      sku: matched?.sku || '',
      category: matched?.category || 'medical_supplies',
      unit_of_measure: matched?.unit_of_measure || 'Unit',
      quantity: qty
    }]);

    setTempPortalItemName('');
    setTempPortalItemQty('');
  };

  const handleRemovePortalRequestedItem = (idx) => {
    setSetupRequestedItems(setupRequestedItems.filter((_, i) => i !== idx));
  };

  const handleOpenPortal = async (e) => {
    e.preventDefault();
    if (!setupVendorId) {
      toast.error('Select supplier.');
      return;
    }
    if (setupRequestedItems.length === 0) {
      toast.error('Provide requested items list.');
      return;
    }

    try {
      const res = await api.post('/clinical/inventory/supplier-portal/toggle', {
        active: true,
        vendorId: setupVendorId,
        requestedItems: setupRequestedItems
      });
      if (res.data.success) {
        setSetupVendorId('');
        setSetupRequestedItems([]);
        toast.success(`Portal opened successfully!`);
        await loadData(true);
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to open supplier portal.');
    }
  };

  const handleCloseSession = async (sessionId, vendorName) => {
    try {
      const res = await api.post('/clinical/inventory/supplier-portal/toggle', { active: false, sessionId });
      if (res.data.success) {
        toast.success(`Portal for ${vendorName} closed.`);
        await loadData(true);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to close portal session.');
    }
  };

  const handleSelectSubmission = async (sub) => {
    setSelectedSubmission(sub);
    setLoadingSubItems(true);
    try {
      const res = await api.get(`/clinical/inventory/supplier-portal/submissions/${sub.id}/items`);
      if (res.data.success) {
        setSubmissionItems(res.data.data || []);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load submission items.');
    } finally {
      setLoadingSubItems(false);
    }
  };

  const handleReceiveStock = async (subId) => {
    setProcessingReceive(true);
    try {
      const res = await api.post(`/clinical/inventory/supplier-portal/submissions/${subId}/receive`);
      if (res.data.success) {
        toast.success('Supplier submission stock accepted and merged successfully!');
        setSelectedSubmission(null);
        await loadData(true);
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Intake merge error.');
    } finally {
      setProcessingReceive(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-6 md:p-10 font-sans relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 -mr-48 -mt-48 w-[700px] h-[700px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 -ml-48 -mb-48 w-[700px] h-[700px] bg-teal-500/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-6 border-b border-slate-200 pb-6"
        >
          <div>
            <div className="flex items-center gap-3">
              <span className="p-2.5 bg-indigo-50 text-indigo-700 border border-indigo-150 rounded-2xl shadow-sm">
                <Building size={28} />
              </span>
              <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
                  Supplier Portals Workspace
                </h1>
                <p className="text-sm text-slate-500 mt-0.5 font-medium">
                  Create and manage secure supplier submission portals for stock sheet uploads.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => loadData(true)} 
              className="p-2.5 bg-white border border-slate-200 hover:bg-slate-150 rounded-xl text-slate-655 font-bold transition-all shadow-xs cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </div>
        </motion.div>

        {loading ? (
          <div className="flex h-96 flex-col items-center justify-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-indigo-650" />
            <p className="text-slate-500 font-semibold animate-pulse">Loading Supplier Portals workspace...</p>
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8"
          >
            
            {/* Active sessions list */}
            {portalSessions.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] font-black">{portalSessions.length}</span>
                  Active Supplier Sessions
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {portalSessions.map(session => (
                    <div key={session.id} className="bg-white border border-emerald-100 rounded-2xl p-5 shadow-xs flex flex-col gap-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                            <Building size={16} className="text-emerald-600" />
                          </div>
                          <div>
                            <p className="font-black text-slate-800 text-sm leading-tight">{session.vendorName}</p>
                            <p className="text-[10px] text-slate-400 font-mono">Session #{session.id}</p>
                          </div>
                        </div>
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">Active</span>
                      </div>

                      <div className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 flex items-center gap-2">
                        <code className="text-xs font-black text-indigo-700 tracking-widest font-mono flex-1 select-all">{session.token}</code>
                        <button
                          onClick={() => { navigator.clipboard.writeText(session.token); toast.success('Token copied!'); }}
                          className="text-slate-400 hover:text-slate-700 text-[10px] font-bold px-2 py-1 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 cursor-pointer"
                        >Copy</button>
                      </div>

                      {session.requestedItems && session.requestedItems.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Requested Items</p>
                          <div className="flex flex-wrap gap-1.5">
                            {session.requestedItems.map((item, idx) => (
                              <span key={idx} className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                                {item.name} <span className="text-indigo-600 font-black">×{item.quantity}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <button
                        onClick={() => handleCloseSession(session.id, session.vendorName)}
                        className="w-full py-2 bg-rose-50 hover:bg-rose-500 text-rose-600 hover:text-white border border-rose-200 hover:border-rose-500 rounded-xl font-bold text-xs cursor-pointer transition-all"
                      >
                        Close Portal & Revoke Token
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Open Supplier Portal setup form */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6">
              <div className="space-y-1 border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                  <Building className="text-indigo-600" size={20} />
                  Setup & Open Supplier Portal Session
                </h3>
                <p className="text-slate-500 text-xs">
                  Specify details to open an excel submission sheet and generate a secure entry token for your vendor.
                </p>
              </div>

              <form onSubmit={handleOpenPortal} className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500">Select Supplier</label>
                  <select
                    value={setupVendorId}
                    onChange={(e) => setSetupVendorId(e.target.value)}
                    className="bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-xs text-slate-800 outline-none"
                    required
                  >
                    <option value="">-- Choose Vendor --</option>
                    {vendors.map(v => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>

                <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50 space-y-3">
                  <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">Item Requisitions List</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400">Product Name</label>
                      <input
                        type="text"
                        placeholder="Type item name..."
                        list="portal-stock-items-datalist"
                        value={tempPortalItemName}
                        onChange={(e) => setTempPortalItemName(e.target.value)}
                        className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs text-slate-800 outline-none"
                      />
                      <datalist id="portal-stock-items-datalist">
                        {masterInventory.map((item, idx) => (
                          <option key={idx} value={item.name} />
                        ))}
                      </datalist>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400">Quantity Required</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          placeholder="e.g. 100"
                          value={tempPortalItemQty}
                          onChange={(e) => setTempPortalItemQty(e.target.value)}
                          className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs text-slate-800 outline-none flex-1"
                        />
                        <button
                          type="button"
                          onClick={handleAddPortalRequestedItem}
                          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl cursor-pointer"
                        >
                          Add Item
                        </button>
                      </div>
                    </div>
                  </div>

                  {setupRequestedItems.length > 0 && (
                    <div className="mt-3 border border-slate-150 rounded-xl overflow-hidden bg-white">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-150">
                            <th className="p-2.5">Product Name</th>
                            <th className="p-2.5">Qty</th>
                            <th className="p-2.5 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {setupRequestedItems.map((item, idx) => (
                            <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/20 text-slate-700">
                              <td className="p-2.5 font-semibold">{item.name}</td>
                              <td className="p-2.5 font-bold text-indigo-650">{item.quantity}</td>
                              <td className="p-2.5 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleRemovePortalRequestedItem(idx)}
                                  className="text-rose-500 hover:text-rose-700 font-bold mr-2 cursor-pointer"
                                >
                                  Remove
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl cursor-pointer transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  Open Portal & Generate Authentication Token
                </button>
              </form>
            </div>

            {/* Incoming Submission stock lists */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
              <h4 className="font-bold text-slate-800 text-base mb-4 flex items-center gap-2">
                <ClipboardList size={18} className="text-slate-550" />
                Incoming Stock Submissions
              </h4>

              {submissions.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed border-slate-150 rounded-2xl">
                  <FileText size={48} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-500 text-sm font-semibold">No stock submissions received yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-100">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-150">
                        <th className="p-4">Submission ID</th>
                        <th className="p-4">Supplier Name</th>
                        <th className="p-4">Uploaded At</th>
                        <th className="p-4">Total Items</th>
                        <th className="p-4">Total Qty</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {submissions.map((sub) => (
                        <tr key={sub.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-all">
                          <td className="p-4 font-bold text-slate-800">#SUB-{sub.id}</td>
                          <td className="p-4 font-semibold text-slate-750">{sub.supplier_name}</td>
                          <td className="p-4 text-slate-500">
                            {new Date(sub.uploaded_at).toLocaleString()}
                          </td>
                          <td className="p-4 font-bold text-slate-600">{sub.total_items}</td>
                          <td className="p-4 font-bold text-indigo-700">{sub.total_quantity}</td>
                          <td className="p-4">
                            <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase ${
                              sub.status === 'received'
                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                : 'bg-amber-50 text-amber-600 border border-amber-100'
                            }`}>
                              {sub.status}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <button
                              onClick={() => handleSelectSubmission(sub)}
                              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg cursor-pointer transition-all inline-flex items-center gap-1.5"
                            >
                              <Eye size={14} /> Review Stock
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </motion.div>
        )}
      </div>

      {/* Review Submission detail Modal Drawer */}
      <AnimatePresence>
        {selectedSubmission && (
          <>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedSubmission(null)}
              className="fixed inset-0 bg-slate-900/60 z-40 backdrop-blur-xs"
            />
            {/* Drawer */}
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-white border-l border-slate-200 z-50 p-6 shadow-2xl flex flex-col text-slate-800 overflow-hidden"
            >
              <div className="flex justify-between items-center border-b border-slate-200 pb-4 mb-4">
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-400">INCOMING DELIVERY REVIEW</span>
                  <h3 className="text-lg font-black text-slate-900 mt-1">Review Submission #SUB-{selectedSubmission.id}</h3>
                </div>
                <button 
                  onClick={() => setSelectedSubmission(null)}
                  className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Info details box */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 border border-slate-150 p-4 rounded-2xl mb-4 text-xs font-semibold text-slate-700">
                <div>
                  <p className="text-[9px] text-slate-400 uppercase font-black">Supplier Name</p>
                  <p className="font-bold text-slate-850 mt-0.5">{selectedSubmission.supplier_name}</p>
                </div>
                <div>
                  <p className="text-[9px] text-slate-450 uppercase font-black">Date Uploaded</p>
                  <p className="font-bold text-slate-850 mt-0.5">{new Date(selectedSubmission.uploaded_at).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[9px] text-slate-450 uppercase font-black">Items Included</p>
                  <p className="font-bold text-slate-850 mt-0.5">{selectedSubmission.total_items} items</p>
                </div>
                <div>
                  <p className="text-[9px] text-slate-450 uppercase font-black">Total Quantity</p>
                  <p className="font-bold text-slate-850 mt-0.5">{selectedSubmission.total_quantity} units</p>
                </div>
              </div>

              {/* Items List */}
              <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                <h4 className="font-bold text-xs text-slate-400 uppercase tracking-widest mb-2.5">Uploaded Sheet Items</h4>
                {loadingSubItems ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                    <span className="text-xs text-slate-500 font-medium animate-pulse">Loading submission details...</span>
                  </div>
                ) : (
                  <table className="w-full text-left text-[11px] border-collapse bg-slate-50/50 rounded-2xl border border-slate-150 overflow-hidden flex flex-col min-h-0 flex-1">
                    <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-150 flex w-full">
                      <tr className="flex w-full">
                        <th className="p-2.5 flex-1">Item Name / SKU</th>
                        <th className="p-2.5 w-20">Batch</th>
                        <th className="p-2.5 w-20">Expiry</th>
                        <th className="p-2.5 w-16 text-right">Qty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 overflow-y-auto flex-1 custom-scrollbar flex flex-col w-full text-slate-700 font-medium">
                      {submissionItems.map((item, idx) => (
                        <tr key={idx} className="flex w-full items-center">
                          <td className="p-2.5 flex-1 overflow-hidden">
                            <p className="font-bold truncate text-slate-800">{item.item_name}</p>
                            <p className="text-[9px] text-slate-400 font-mono">SKU: {item.sku || 'N/A'}</p>
                          </td>
                          <td className="p-2.5 w-20 font-mono truncate">{item.batch_number || 'N/A'}</td>
                          <td className="p-2.5 w-20 font-mono truncate">{item.expiry_date || 'N/A'}</td>
                          <td className="p-2.5 w-16 text-right font-bold text-slate-800">{item.quantity_received}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Review Approval Panel */}
              {selectedSubmission.status === 'pending' && (
                <div className="mt-6 space-y-3">
                  <div className="p-3.5 bg-amber-50 border border-amber-150 rounded-2xl text-xs flex gap-2 text-amber-800 leading-relaxed font-semibold">
                    <AlertTriangle className="flex-shrink-0" size={18} />
                    Confirming will automatically register these batch numbers and expiry records and merge received quantities into the Central Store inventory.
                  </div>
                  <button 
                    onClick={() => handleReceiveStock(selectedSubmission.id)}
                    disabled={processingReceive}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl cursor-pointer flex items-center justify-center gap-1.5 transition-all"
                  >
                    {processingReceive ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />} Approve & Intake Stock delivery
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
