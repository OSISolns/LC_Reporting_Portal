import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Building, FileText, ClipboardList, ShieldAlert, Plus, Eye, Check, X, 
  Trash2, RefreshCw, BarChart2, CheckCircle, Clock, AlertTriangle, 
  TrendingUp, Search, Calendar, Loader2, ArrowRight, User, AlertCircle,
  Truck, ArrowUpRight, DollarSign, Tag, Info, ArrowRightLeft, Printer, Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/axios';
import { getIncidents, createIncident } from '../api/incidents';
import { toast } from 'react-hot-toast';

export default function ProcurementHub() {
  const { user } = useAuth();
  const location = useLocation();
  const printRef = useRef(null);
  const [poPrintData, setPoPrintData] = useState(null); // PO selected for PDF preview
  
  // Tab State: 'overview' | 'store_requisitions' | 'purchase_orders' | 'goods_receipts' | 'returns' | 'suppliers' | 'incidents'
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Core Data Lists
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [goodsReceipts, setGoodsReceipts] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [masterInventory, setMasterInventory] = useState([]);
  const [incidents, setIncidents] = useState([]);

  // Modals & Details Drawers
  const [selectedPO, setSelectedPO] = useState(null);
  const [selectedGRN, setSelectedGRN] = useState(null);
  const [grnItems, setGrnItems] = useState([]);
  const [showCreatePOModal, setShowCreatePOModal] = useState(false);
  const [showCreateGRNModal, setShowCreateGRNModal] = useState(false);
  const [showCreateVendorModal, setShowCreateVendorModal] = useState(false);
  const [showCreateIncidentModal, setShowCreateIncidentModal] = useState(false);

  // Loaders
  const [loadingGrnItems, setLoadingGrnItems] = useState(false);
  const [submittingPO, setSubmittingPO] = useState(false);
  const [submittingGRN, setSubmittingGRN] = useState(false);
  const [submittingVendor, setSubmittingVendor] = useState(false);
  const [submittingIncident, setSubmittingIncident] = useState(false);

  // --- Form States ---
  
  // PO Form
  const [poVendorId, setPoVendorId] = useState('');
  const [poNotes, setPoNotes] = useState('');
  const [poItems, setPoItems] = useState([]);
  const [tempPoItemName, setTempPoItemName] = useState('');
  const [tempPoItemQty, setTempPoItemQty] = useState('');
  const [tempPoItemPrice, setTempPoItemPrice] = useState('');

  // GRN Form
  const [grnPoId, setGrnPoId] = useState('');
  const [grnVendorId, setGrnVendorId] = useState('');
  const [grnInvoice, setGrnInvoice] = useState('');
  const [grnDeliveryNote, setGrnDeliveryNote] = useState('');
  const [grnNotes, setGrnNotes] = useState('');
  const [grnItemsForm, setGrnItemsForm] = useState([]);
  const [tempGrnItemName, setTempGrnItemName] = useState('');
  const [tempGrnItemQty, setTempGrnItemQty] = useState('');
  const [tempGrnItemPrice, setTempGrnItemPrice] = useState('');
  const [tempGrnItemBatch, setTempGrnItemBatch] = useState('');
  const [tempGrnItemExpiry, setTempGrnItemExpiry] = useState('');

  // Vendor Form
  const [vendorName, setVendorName] = useState('');
  const [vendorContact, setVendorContact] = useState('');
  const [vendorTerms, setVendorTerms] = useState('');

  // Incident Form
  const [incidentFormData, setIncidentFormData] = useState({
    incidentType: 'Equipment',
    department: 'Central Store',
    areaOfIncident: '',
    namesInvolved: '',
    pidNumber: '',
    description: '',
    contributingFactors: '',
    immediateActions: '',
    preventionMeasures: ''
  });


  // Requisitions & Supplier Returns States
  const [requisitions, setRequisitions] = useState([]);
  const [returnsList, setReturnsList] = useState([]);
  const [selectedRequisition, setSelectedRequisition] = useState(null);
  const [requisitionItems, setRequisitionItems] = useState([]);
  const [loadingReqItems, setLoadingReqItems] = useState(false);
  const [showCreateReturnModal, setShowCreateReturnModal] = useState(false);
  const [returnVendorId, setReturnVendorId] = useState('');
  const [returnNotes, setReturnNotes] = useState('');
  const [returnItems, setReturnItems] = useState([]);
  const [tempReturnItemName, setTempReturnItemName] = useState('');
  const [tempReturnItemQty, setTempReturnItemQty] = useState('');
  const [tempReturnItemReason, setTempReturnItemReason] = useState('Damaged');
  const [submittingReturn, setSubmittingReturn] = useState(false);
  const [returnSearch, setReturnSearch] = useState('');
  const [requisitionSearch, setRequisitionSearch] = useState('');

  // Search & Filter States
  const [poSearch, setPoSearch] = useState('');
  const [grnSearch, setGrnSearch] = useState('');
  const [vendorSearch, setVendorSearch] = useState('');
  const [incSearch, setIncSearch] = useState('');

  // Load All Data
  const loadData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);

      const [poRes, grnRes, venRes, mastRes, incRes, reqRes, retRes] = await Promise.allSettled([
        api.get('/clinical/inventory/purchase-orders'),
        api.get('/clinical/inventory/grns'),
        api.get('/clinical/inventory/vendors'),
        api.get('/clinical/inventory/master'),
        getIncidents(),
        api.get('/clinical/inventory/requisitions'),
        api.get('/clinical/inventory/returns')
      ]);

      if (poRes.status === 'fulfilled' && poRes.value.data.success) setPurchaseOrders(poRes.value.data.data || []);
      if (grnRes.status === 'fulfilled' && grnRes.value.data.success) setGoodsReceipts(grnRes.value.data.data || []);
      if (venRes.status === 'fulfilled' && venRes.value.data.success) setVendors(venRes.value.data.data || []);
      if (mastRes.status === 'fulfilled' && mastRes.value.data.success) setMasterInventory(mastRes.value.data.data || []);
      if (incRes.status === 'fulfilled' && incRes.value.data.success) setIncidents(incRes.value.data.data || []);
      if (reqRes.status === 'fulfilled' && reqRes.value.data.success) setRequisitions(reqRes.value.data.data || []);
      if (retRes.status === 'fulfilled' && retRes.value.data.success) setReturnsList(retRes.value.data.data || []);

    } catch (err) {
      console.error(err);
      toast.error('Failed to reload procurement records.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab && ['overview', 'store_requisitions', 'purchase_orders', 'goods_receipts', 'returns', 'suppliers', 'incidents'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [location.search]);

  // Sync / Trigger Database Refresh
  const handleSync = async () => {
    setRefreshing(true);
    try {
      await api.post('/clinical/inventory/sync');
      toast.success('Inventory synced successfully!');
      await loadData(true);
    } catch (err) {
      console.error(err);
      toast.error('Inventory sync failed.');
    } finally {
      setRefreshing(false);
    }
  };

  // --- Purchase Order Actions ---
  const handleAddPoItem = () => {
    if (!tempPoItemName.trim() || !tempPoItemQty || !tempPoItemPrice) {
      toast.error('Please fill in item details.');
      return;
    }
    const qty = parseInt(tempPoItemQty, 10);
    const price = parseFloat(tempPoItemPrice);
    if (qty <= 0 || price < 0) {
      toast.error('Enter valid quantity and price values.');
      return;
    }

    const matched = masterInventory.find(i => i.name.toLowerCase() === tempPoItemName.toLowerCase());

    setPoItems([...poItems, {
      item_name: tempPoItemName.trim(),
      sku: matched?.sku || '',
      category: matched?.category || 'medical_supplies',
      unit_of_measure: matched?.unit_of_measure || 'Unit',
      quantity: qty,
      unit_price: price
    }]);

    setTempPoItemName('');
    setTempPoItemQty('');
    setTempPoItemPrice('');
  };

  const handleRemovePoItem = (index) => {
    setPoItems(poItems.filter((_, idx) => idx !== index));
  };

  const handleCreatePOSubmit = async (e) => {
    e.preventDefault();
    if (!poVendorId) {
      toast.error('Please choose a supplier.');
      return;
    }
    if (poItems.length === 0) {
      toast.error('Add at least one item.');
      return;
    }

    setSubmittingPO(true);
    try {
      const res = await api.post('/clinical/inventory/purchase-orders', {
        vendorId: parseInt(poVendorId, 10),
        notes: poNotes,
        items: poItems
      });

      if (res.data.success) {
        toast.success(`Purchase Order created successfully!`);
        setShowCreatePOModal(false);
        setPoVendorId('');
        setPoNotes('');
        setPoItems([]);
        await loadData(true);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to create Purchase Order.');
    } finally {
      setSubmittingPO(false);
    }
  };

  const handleUpdatePOStatus = async (poId, newStatus) => {
    try {
      const res = await api.put(`/clinical/inventory/purchase-orders/${poId}/status`, { status: newStatus });
      if (res.data.success) {
        toast.success(`PO status updated to ${newStatus}`);
        if (selectedPO?.id === poId) {
          setSelectedPO(prev => ({ ...prev, status: newStatus }));
        }
        await loadData(true);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to update PO status.');
    }
  };

  // --- Requisitions Actions ---
  const handleSelectRequisition = async (req) => {
    setSelectedRequisition(req);
    setLoadingReqItems(true);
    try {
      const res = await api.get(`/clinical/inventory/requisitions/${req.id}/items`);
      if (res.data.success) {
        setRequisitionItems(res.data.data || []);
      } else {
        toast.error('Failed to fetch requisition items');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch requisition items');
    } finally {
      setLoadingReqItems(false);
    }
  };

  const handleApproveAndCreatePO = async (req) => {
    try {
      const itemsRes = await api.get(`/clinical/inventory/requisitions/${req.id}/items`);
      if (!itemsRes.data.success) {
        toast.error('Failed to load requisition items.');
        return;
      }
      const reqItems = itemsRes.data.data || [];

      const approveRes = await api.post(`/clinical/inventory/requisitions/${req.id}/approve`, {
        items: reqItems.map(i => ({ id: i.id, approved_quantity: i.requested_quantity }))
      });

      if (approveRes.data.success) {
        toast.success('Requisition approved by Procurement!');
        
        // Pre-fill PO modal state
        setPoNotes(`Replenishment for Requisition #REQ-${req.id}`);
        setPoItems(reqItems.map(i => ({
          item_name: i.item_name,
          sku: i.sku || '',
          unit_of_measure: i.unit_of_measure || 'Box',
          category: i.category || 'medical_supplies',
          quantity: i.requested_quantity,
          unit_price: i.purchase_price || 0
        })));
        setPoVendorId('');
        setShowCreatePOModal(true);
        setActiveTab('purchase_orders');
        await loadData(true);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to process requisition approval.');
    }
  };

  // --- Supplier Returns Actions ---
  const handleAddReturnItem = () => {
    if (!tempReturnItemName.trim() || !tempReturnItemQty) {
      toast.error('Specify item name and quantity.');
      return;
    }
    const qty = parseInt(tempReturnItemQty, 10);
    if (isNaN(qty) || qty <= 0) {
      toast.error('Quantity must be greater than 0.');
      return;
    }

    const matched = masterInventory.find(i => i.name.toLowerCase() === tempReturnItemName.toLowerCase());

    if (returnItems.some(i => i.item_name.toLowerCase() === tempReturnItemName.toLowerCase())) {
      toast.error('Item already added.');
      return;
    }

    setReturnItems([...returnItems, {
      item_name: tempReturnItemName.trim(),
      item_id: matched?.id || matched?.item_id || null,
      batch_id: matched?.batch_id || null,
      batch_number: matched?.batch_number || 'N/A',
      quantity: qty,
      reason: tempReturnItemReason
    }]);

    setTempReturnItemName('');
    setTempReturnItemQty('');
    setTempReturnItemReason('Damaged');
  };

  const handleRemoveReturnItem = (idx) => {
    setReturnItems(returnItems.filter((_, i) => i !== idx));
  };

  const handleCreateReturnSubmit = async (e) => {
    e.preventDefault();
    if (!returnVendorId) {
      toast.error('Please choose a supplier.');
      return;
    }
    if (returnItems.length === 0) {
      toast.error('Please add at least one item to return.');
      return;
    }

    setSubmittingReturn(true);
    try {
      const res = await api.post('/clinical/inventory/returns', {
        vendorId: parseInt(returnVendorId, 10),
        notes: returnNotes,
        items: returnItems.map(i => ({
          item_id: i.item_id,
          batch_id: i.batch_id,
          quantity: i.quantity,
          reason: i.reason
        }))
      });

      if (res.data.success) {
        toast.success(res.data.message || 'Supplier return logged successfully!');
        setShowCreateReturnModal(false);
        setReturnVendorId('');
        setReturnNotes('');
        setReturnItems([]);
        await loadData(true);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to log supplier return.');
    } finally {
      setSubmittingReturn(false);
    }
  };

  // --- Goods Receipt Note Actions ---
  const handlePoChangeInGrn = (poIdStr) => {
    setGrnPoId(poIdStr);
    if (!poIdStr) {
      setGrnVendorId('');
      setGrnItemsForm([]);
      return;
    }

    const matchedPo = purchaseOrders.find(po => po.id === parseInt(poIdStr, 10));
    if (matchedPo) {
      setGrnVendorId(matchedPo.vendor_id.toString());
      // Pre-fill GRN items from PO items
      const preFilled = matchedPo.items.map(item => ({
        item_name: item.item_name,
        sku: item.sku,
        unit_of_measure: item.unit_of_measure,
        category: item.category,
        quantity_received: item.quantity,
        batch_number: '',
        expiry_date: '',
        purchase_price: item.unit_price
      }));
      setGrnItemsForm(preFilled);
    }
  };

  const handleAddGrnItem = () => {
    if (!tempGrnItemName.trim() || !tempGrnItemQty || !tempGrnItemPrice) {
      toast.error('Please enter name, qty, and price.');
      return;
    }
    const qty = parseInt(tempGrnItemQty, 15);
    const price = parseFloat(tempGrnItemPrice);
    if (qty <= 0 || price < 0) {
      toast.error('Enter valid quantity and price.');
      return;
    }

    const matched = masterInventory.find(i => i.name.toLowerCase() === tempGrnItemName.toLowerCase());

    setGrnItemsForm([...grnItemsForm, {
      item_name: tempGrnItemName.trim(),
      sku: matched?.sku || '',
      category: matched?.category || 'medical_supplies',
      unit_of_measure: matched?.unit_of_measure || 'Unit',
      quantity_received: qty,
      purchase_price: price,
      batch_number: tempGrnItemBatch.trim() || '',
      expiry_date: tempGrnItemExpiry.trim() || ''
    }]);

    setTempGrnItemName('');
    setTempGrnItemQty('');
    setTempGrnItemPrice('');
    setTempGrnItemBatch('');
    setTempGrnItemExpiry('');
  };

  const handleRemoveGrnItem = (index) => {
    setGrnItemsForm(grnItemsForm.filter((_, idx) => idx !== index));
  };

  const handleCreateGRNSubmit = async (e) => {
    e.preventDefault();
    if (!grnVendorId) {
      toast.error('Supplier is required.');
      return;
    }
    if (grnItemsForm.length === 0) {
      toast.error('Add at least one item to accept.');
      return;
    }

    setSubmittingGRN(true);
    try {
      const res = await api.post('/clinical/inventory/grns', {
        poId: grnPoId ? parseInt(grnPoId, 10) : null,
        vendorId: parseInt(grnVendorId, 10),
        invoiceNumber: grnInvoice,
        deliveryNoteNumber: grnDeliveryNote,
        notes: grnNotes,
        items: grnItemsForm
      });

      if (res.data.success) {
        toast.success('Goods received note generated & stock catalog updated!');
        setShowCreateGRNModal(false);
        setGrnPoId('');
        setGrnVendorId('');
        setGrnInvoice('');
        setGrnDeliveryNote('');
        setGrnNotes('');
        setGrnItemsForm([]);
        await loadData(true);
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to process goods receipt note.');
    } finally {
      setSubmittingGRN(false);
    }
  };

  const handleSelectGRN = async (grn) => {
    setSelectedGRN(grn);
    setLoadingGrnItems(true);
    try {
      const res = await api.get(`/clinical/inventory/grns/${grn.id}/items`);
      if (res.data.success) {
        setGrnItems(res.data.data || []);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load receipt details.');
    } finally {
      setLoadingGrnItems(false);
    }
  };


  // --- Vendor Actions ---
  const handleCreateVendorSubmit = async (e) => {
    e.preventDefault();
    if (!vendorName.trim()) {
      toast.error('Supplier name is required.');
      return;
    }
    setSubmittingVendor(true);
    try {
      const res = await api.post('/clinical/inventory/vendors', {
        name: vendorName.trim(),
        contact: vendorContact.trim(),
        terms: vendorTerms.trim(),
        is_active: 1
      });
      if (res.data.success) {
        toast.success(`Supplier "${vendorName}" added successfully.`);
        setShowCreateVendorModal(false);
        setVendorName('');
        setVendorContact('');
        setVendorTerms('');
        await loadData(true);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to register supplier.');
    } finally {
      setSubmittingVendor(false);
    }
  };

  // --- Incident Actions ---
  const handleIncidentSubmit = async (e) => {
    e.preventDefault();
    setSubmittingIncident(true);
    try {
      const res = await createIncident(incidentFormData);
      if (res.data.success) {
        toast.success('Incident reported successfully!');
        setShowCreateIncidentModal(false);
        setIncidentFormData({
          incidentType: 'Equipment',
          department: 'Central Store',
          areaOfIncident: '',
          namesInvolved: '',
          pidNumber: '',
          description: '',
          contributingFactors: '',
          immediateActions: '',
          preventionMeasures: ''
        });
        await loadData(true);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to submit incident report.');
    } finally {
      setSubmittingIncident(false);
    }
  };

  // --- Filter Computations ---
  const filteredPOs = useMemo(() => {
    return purchaseOrders.filter(po => {
      const vendorName = po.vendor_name || '';
      return po.po_number.toLowerCase().includes(poSearch.toLowerCase()) ||
             vendorName.toLowerCase().includes(poSearch.toLowerCase()) ||
             po.status.toLowerCase().includes(poSearch.toLowerCase());
    });
  }, [purchaseOrders, poSearch]);

  const filteredGRNs = useMemo(() => {
    return goodsReceipts.filter(grn => {
      const vendorName = grn.vendor_name || '';
      return grn.grn_number.toLowerCase().includes(grnSearch.toLowerCase()) ||
             vendorName.toLowerCase().includes(grnSearch.toLowerCase()) ||
             (grn.invoice_number && grn.invoice_number.toLowerCase().includes(grnSearch.toLowerCase()));
    });
  }, [goodsReceipts, grnSearch]);

  const filteredVendors = useMemo(() => {
    return vendors.filter(v => v.name.toLowerCase().includes(vendorSearch.toLowerCase()));
  }, [vendors, vendorSearch]);

  const filteredIncidents = useMemo(() => {
    return incidents.filter(inc => {
      return inc.description?.toLowerCase().includes(incSearch.toLowerCase()) || 
             inc.incident_type?.toLowerCase().includes(incSearch.toLowerCase()) ||
             inc.department?.toLowerCase().includes(incSearch.toLowerCase());
    });
  }, [incidents, incSearch]);

  const filteredStoreRequisitions = useMemo(() => {
    return requisitions.filter(req => {
      const isStore = req.department_name.toLowerCase().includes('central') || 
                      req.department_name.toLowerCase().includes('store');
      if (!isStore) return false;

      return (req.notes || '').toLowerCase().includes(requisitionSearch.toLowerCase()) ||
             req.id.toString().includes(requisitionSearch);
    });
  }, [requisitions, requisitionSearch]);

  const filteredReturns = useMemo(() => {
    return returnsList.filter(ret => {
      return (ret.vendor_name || '').toLowerCase().includes(returnSearch.toLowerCase()) ||
             ret.return_number.toLowerCase().includes(returnSearch.toLowerCase()) ||
             (ret.notes || '').toLowerCase().includes(returnSearch.toLowerCase());
    });
  }, [returnsList, returnSearch]);

  // --- Metrics ---
  const metrics = useMemo(() => {
    const totalSpent = goodsReceipts.reduce((sum, grn) => {
      return sum + (grn.total_amount || 0);
    }, 0);

    const pendingPOs = purchaseOrders.filter(po => po.status === 'Draft' || po.status === 'Pending Approval').length;

    return {
      totalSpent,
      pendingPOs
    };
  }, [purchaseOrders, goodsReceipts]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-6 md:p-10 font-sans relative overflow-hidden">
      {/* Dynamic Background Gradients */}
      <div className="absolute top-0 right-0 -mr-48 -mt-48 w-[700px] h-[700px] bg-teal-500/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 -ml-48 -mb-48 w-[700px] h-[700px] bg-sky-500/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-6 border-b border-slate-200 pb-6"
        >
          <div>
            <div className="flex items-center gap-3">
              <span className="p-2.5 bg-teal-50 text-teal-700 border border-teal-150 rounded-2xl shadow-sm">
                <Building size={28} />
              </span>
              <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
                  Procurement Operations Hub
                </h1>
                <p className="text-sm text-slate-500 mt-0.5 font-medium">
                  Central Supply Chain & Vendor Management System • Signed in as <span className="text-teal-700 font-bold">{user?.fullName || 'Procurement Manager'}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <button 
              onClick={handleSync} 
              disabled={refreshing}
              className="flex-1 lg:flex-none bg-white border border-slate-200 text-slate-700 hover:text-teal-700 hover:border-teal-300 px-4 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              <RefreshCw size={16} className={`${refreshing ? 'animate-spin text-teal-600' : ''}`} />
              Sync Inventory
            </button>
            <button 
              onClick={() => setShowCreateIncidentModal(true)}
              className="flex-1 lg:flex-none bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-600 hover:text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              <AlertTriangle size={16} />
              Report Incident
            </button>
          </div>
        </motion.div>

        {/* Tab Controls */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="flex border-b border-slate-200 mb-8 overflow-x-auto gap-2"
        >
          {[
            { id: 'overview', label: 'Overview', icon: <BarChart2 size={16} /> },
            { id: 'store_requisitions', label: `Store Requests (${requisitions.filter(r => (r.department_name.toLowerCase().includes('central') || r.department_name.toLowerCase().includes('store')) && r.status === 'Pending').length})`, icon: <ClipboardList size={16} /> },
            { id: 'purchase_orders', label: `Purchase Orders (${purchaseOrders.length})`, icon: <ClipboardList size={16} /> },
            { id: 'goods_receipts', label: `Goods Receipts (${goodsReceipts.length})`, icon: <FileText size={16} /> },
            { id: 'returns', label: `Supplier Returns (${returnsList.length})`, icon: <ArrowRightLeft size={16} /> },
            { id: 'suppliers', label: `Suppliers (${vendors.length})`, icon: <Truck size={16} /> },
            { id: 'incidents', label: `Quality Incidents (${incidents.length})`, icon: <ShieldAlert size={16} /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 font-bold text-sm transition-all border-b-2 whitespace-nowrap cursor-pointer ${
                activeTab === tab.id 
                  ? 'border-teal-650 text-teal-650 bg-teal-50/40' 
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </motion.div>

        {loading ? (
          <div className="flex h-96 flex-col items-center justify-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-teal-650" />
            <p className="text-slate-500 font-semibold animate-pulse">Loading Procurement Hub records...</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.15 }}
            >
              
              {/* ─── TAB 1: OVERVIEW ─── */}
              {activeTab === 'overview' && (
                <div className="space-y-8">
                  {/* KPI Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs flex items-center justify-between hover:border-slate-300 transition-all">
                      <div className="space-y-1">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Purchase Orders</p>
                        <h3 className="text-2xl font-black text-slate-800">{purchaseOrders.length}</h3>
                        <p className="text-[10px] font-bold text-amber-600">{metrics.pendingPOs} Pending Approval</p>
                      </div>
                      <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                        <ClipboardList size={22} />
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs flex items-center justify-between hover:border-slate-300 transition-all">
                      <div className="space-y-1">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Goods Receipts</p>
                        <h3 className="text-2xl font-black text-slate-800">{goodsReceipts.length}</h3>
                        <p className="text-[10px] font-bold text-teal-600">Inventory Catalogs Active</p>
                      </div>
                      <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600">
                        <FileText size={22} />
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs flex items-center justify-between hover:border-slate-300 transition-all">
                      <div className="space-y-1">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Supplier Returns</p>
                        <h3 className="text-2xl font-black text-slate-800">{returnsList.length}</h3>
                        <p className="text-[10px] font-bold text-sky-600">Logged Discrepancy returns</p>
                      </div>
                      <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600">
                        <ArrowRightLeft size={22} />
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs flex items-center justify-between hover:border-slate-300 transition-all">
                      <div className="space-y-1">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Quality incidents</p>
                        <h3 className="text-2xl font-black text-slate-800">{incidents.length}</h3>
                        <p className="text-[10px] font-bold text-rose-600">Logged Audits</p>
                      </div>
                      <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
                        <ShieldAlert size={22} />
                      </div>
                    </div>
                  </div>

                  {/* Dashboard Body Row */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* Left Column: Recent POs & GRNs */}
                    <div className="lg:col-span-2 space-y-6">
                      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
                        <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                          <h4 className="font-black text-slate-800 text-base">Recent Activity Logs</h4>
                          <span className="text-xs font-bold text-teal-600">Live Tracker</span>
                        </div>
                        <div className="divide-y divide-slate-100 font-medium text-slate-700 text-xs">
                          {purchaseOrders.slice(0, 4).map(po => (
                            <div key={po.id} className="py-3 flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-teal-500"></div>
                                <div>
                                  <p className="font-bold text-slate-800">PO Created: {po.po_number}</p>
                                  <p className="text-[10px] text-slate-400">{po.vendor_name} • {new Date(po.created_at).toLocaleDateString()}</p>
                                </div>
                              </div>
                              <span className="font-bold text-slate-900">{po.total_amount ? `${po.total_amount.toLocaleString()} RWF` : '—'}</span>
                            </div>
                          ))}
                          {purchaseOrders.length === 0 && (
                            <p className="text-center py-6 text-slate-400">No purchase orders created yet.</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Suppliers Directory Info */}
                    <div className="space-y-6">
                      <div className="bg-gradient-to-br from-teal-700 to-emerald-800 text-white rounded-3xl p-6 shadow-md space-y-4">
                        <h4 className="font-black text-lg">Suppliers Operations Workspace</h4>
                        <p className="text-xs text-teal-100/90 leading-relaxed">
                          Utilize the Procurement Operations dashboard to coordinate outgoing requisitions, open public portals for suppliers to submit stock sheets, and accept Goods Receipt Notes directly into the core Central Store inventory.
                        </p>
                        <div className="pt-2">
                          <button 
                            onClick={() => setActiveTab('purchase_orders')}
                            className="bg-white text-teal-800 px-4 py-2 rounded-xl font-bold text-xs hover:bg-teal-50 transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            Go to POs <ArrowRight size={14} />
                          </button>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* ─── TAB: STORE REQUISITIONS (PENDING PROCUREMENT) ─── */}
              {activeTab === 'store_requisitions' && (
                <div className="space-y-6">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white border border-slate-200 rounded-3xl p-6 shadow-xs animate-none">
                    <div className="relative w-full md:max-w-md">
                      <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="text"
                        placeholder="Search store requests..."
                        value={requisitionSearch}
                        onChange={(e) => setRequisitionSearch(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-2.5 rounded-xl text-xs outline-none focus:border-teal-350 focus:bg-white transition-all animate-none"
                      />
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-150">
                            <th className="p-4">Requisition ID</th>
                            <th className="p-4">Requested At</th>
                            <th className="p-4">Urgency</th>
                            <th className="p-4">Items Count</th>
                            <th className="p-4">Notes</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                          {filteredStoreRequisitions.map(req => (
                            <tr key={req.id} className="hover:bg-slate-50/50 transition-all">
                              <td className="p-4 font-black text-slate-800">#REQ-{req.id}</td>
                              <td className="p-4 text-slate-500">{new Date(req.created_at).toLocaleString()}</td>
                              <td className="p-4">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                  req.urgency === 'Urgent' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-slate-50 text-slate-500 border border-slate-100'
                                }`}>
                                  {req.urgency}
                                </span>
                              </td>
                              <td className="p-4 text-slate-650">{req.items_count} items</td>
                              <td className="p-4 text-slate-500 max-w-xs truncate">{req.notes || '—'}</td>
                              <td className="p-4">
                                <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase ${
                                  req.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                  req.status === 'Rejected' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                                  'bg-amber-50 text-amber-600 border border-amber-100'
                                }`}>
                                  {req.status}
                                </span>
                              </td>
                              <td className="p-4 text-right flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleSelectRequisition(req)}
                                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer"
                                >
                                  <Eye size={13} /> View Items
                                </button>
                                {req.status === 'Pending' && (
                                  <button
                                    onClick={() => handleApproveAndCreatePO(req)}
                                    className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                                  >
                                    <Check size={13} /> Approve & Create PO
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                          {filteredStoreRequisitions.length === 0 && (
                            <tr>
                              <td colSpan={7} className="p-12 text-center text-slate-400">
                                <ClipboardList className="mx-auto opacity-30 mb-2" size={36} />
                                No store purchase requisitions found.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ─── TAB 2: PURCHASE ORDERS ─── */}
              {activeTab === 'purchase_orders' && (
                <div className="space-y-6">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
                    <div className="relative w-full md:max-w-md">
                      <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="text"
                        placeholder="Search POs by number, supplier..."
                        value={poSearch}
                        onChange={(e) => setPoSearch(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-2.5 rounded-xl text-xs outline-none focus:border-teal-300 focus:bg-white transition-all"
                      />
                    </div>
                    <button 
                      onClick={() => setShowCreatePOModal(true)}
                      className="w-full md:w-auto px-5 py-2.5 bg-teal-700 hover:bg-teal-650 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Plus size={16} /> Create Purchase Order (PO)
                    </button>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-150">
                            <th className="p-4">PO Number</th>
                            <th className="p-4">Supplier Name</th>
                            <th className="p-4">Created At</th>
                            <th className="p-4">Items Count</th>
                            <th className="p-4">Total Amount</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                          {filteredPOs.map(po => (
                            <tr key={po.id} className="hover:bg-slate-50/50 transition-all">
                              <td className="p-4 font-black text-slate-800">{po.po_number}</td>
                              <td className="p-4 text-slate-800">{po.vendor_name}</td>
                              <td className="p-4 text-slate-500">{new Date(po.created_at).toLocaleDateString()}</td>
                              <td className="p-4 text-slate-500">{(po.items || []).length}</td>
                              <td className="p-4 text-teal-700 font-bold">{po.total_amount ? `${po.total_amount.toLocaleString()} RWF` : '—'}</td>
                              <td className="p-4">
                                <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase ${
                                  po.status === 'Fulfilled' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                  po.status === 'Sent to Supplier' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' :
                                  po.status === 'Approved' ? 'bg-teal-50 text-teal-600 border border-teal-100' :
                                  'bg-slate-50 text-slate-500 border border-slate-100'
                                }`}>
                                  {po.status}
                                </span>
                              </td>
                              <td className="p-4 text-right">
                                <button
                                  onClick={() => setSelectedPO(po)}
                                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer"
                                >
                                  <Eye size={13} /> View Items
                                </button>
                              </td>
                            </tr>
                          ))}
                          {filteredPOs.length === 0 && (
                            <tr>
                              <td colSpan={7} className="p-12 text-center text-slate-400">
                                <ClipboardList className="mx-auto opacity-30 mb-2" size={36} />
                                No purchase orders matching your search.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ─── TAB 3: GOODS RECEIPTS (GRN) ─── */}
              {activeTab === 'goods_receipts' && (
                <div className="space-y-6">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
                    <div className="relative w-full md:max-w-md">
                      <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="text"
                        placeholder="Search GRNs by number, supplier..."
                        value={grnSearch}
                        onChange={(e) => setGrnSearch(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-2.5 rounded-xl text-xs outline-none focus:border-teal-300 focus:bg-white transition-all"
                      />
                    </div>
                    <button 
                      onClick={() => setShowCreateGRNModal(true)}
                      className="w-full md:w-auto px-5 py-2.5 bg-teal-700 hover:bg-teal-650 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Plus size={16} /> Generate Goods Receipt (GRN)
                    </button>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-150">
                            <th className="p-4">GRN Number</th>
                            <th className="p-4">Supplier Name</th>
                            <th className="p-4">Linked PO</th>
                            <th className="p-4">Received At</th>
                            <th className="p-4">Invoice #</th>
                            <th className="p-4">Delivery Note #</th>
                            <th className="p-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                          {filteredGRNs.map(grn => (
                            <tr key={grn.id} className="hover:bg-slate-50/50 transition-all">
                              <td className="p-4 font-black text-slate-800">{grn.grn_number}</td>
                              <td className="p-4 text-slate-800">{grn.vendor_name}</td>
                              <td className="p-4 font-bold text-teal-600">{grn.po_number || 'Direct Intake'}</td>
                              <td className="p-4 text-slate-500">{new Date(grn.received_at).toLocaleDateString()}</td>
                              <td className="p-4 text-slate-500">{grn.invoice_number || '—'}</td>
                              <td className="p-4 text-slate-500">{grn.delivery_note_number || '—'}</td>
                              <td className="p-4 text-right">
                                <button
                                  onClick={() => handleSelectGRN(grn)}
                                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer"
                                >
                                  <Eye size={13} /> View Items
                                </button>
                              </td>
                            </tr>
                          ))}
                          {filteredGRNs.length === 0 && (
                            <tr>
                              <td colSpan={7} className="p-12 text-center text-slate-400">
                                <FileText className="mx-auto opacity-30 mb-2" size={36} />
                                No receipt notes found matching search.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ─── TAB: SUPPLIER RETURNS ─── */}
              {activeTab === 'returns' && (
                <div className="space-y-6">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white border border-slate-200 rounded-3xl p-6 shadow-xs animate-none">
                    <div className="relative w-full md:max-w-md">
                      <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="text"
                        placeholder="Search supplier returns..."
                        value={returnSearch}
                        onChange={(e) => setReturnSearch(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-2.5 rounded-xl text-xs outline-none focus:border-teal-350 focus:bg-white transition-all animate-none"
                      />
                    </div>
                    <button 
                      onClick={() => {
                        setReturnItems([]);
                        setReturnNotes('');
                        setReturnVendorId('');
                        setShowCreateReturnModal(true);
                      }}
                      className="w-full md:w-auto px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs animate-none"
                    >
                      <Plus size={16} /> Log New Return
                    </button>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs animate-none">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-150">
                            <th className="p-4">Return Number</th>
                            <th className="p-4">Returned At</th>
                            <th className="p-4">Supplier</th>
                            <th className="p-4">Processed By</th>
                            <th className="p-4">Notes</th>
                            <th className="p-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                          {filteredReturns.map(ret => (
                            <tr key={ret.id} className="hover:bg-slate-50/50 transition-all">
                              <td className="p-4 font-black text-slate-800">{ret.return_number}</td>
                              <td className="p-4 text-slate-500">{new Date(ret.returned_at).toLocaleString()}</td>
                              <td className="p-4 font-bold text-slate-700">{ret.vendor_name}</td>
                              <td className="p-4 text-slate-500">{ret.returned_by_name || 'System'}</td>
                              <td className="p-4 text-slate-500 max-w-xs truncate">{ret.notes || '—'}</td>
                              <td className="p-4 text-right">
                                <button
                                  onClick={async () => {
                                    try {
                                      const res = await api.get(`/clinical/inventory/returns/${ret.id}/items`);
                                      if (res.data.success) {
                                        setSelectedRequisition({
                                          id: ret.return_number,
                                          department_name: `Return to: ${ret.vendor_name}`,
                                          urgency: 'Return',
                                          notes: ret.notes,
                                          created_at: ret.returned_at,
                                          isReturn: true
                                        });
                                        setRequisitionItems(res.data.data.map(i => ({
                                          id: i.id,
                                          item_name: i.item_name,
                                          unit_of_measure: i.unit_of_measure,
                                          requested_quantity: i.quantity,
                                          approved_quantity: i.quantity,
                                          batch_number: i.batch_number || 'N/A',
                                          reason: i.reason
                                        })));
                                      }
                                    } catch (err) {
                                      console.error(err);
                                      toast.error('Failed to load return items.');
                                    }
                                  }}
                                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer"
                                >
                                  <Eye size={13} /> View Items
                                </button>
                              </td>
                            </tr>
                          ))}
                          {filteredReturns.length === 0 && (
                            <tr>
                              <td colSpan={6} className="p-12 text-center text-slate-400">
                                <ArrowRightLeft className="mx-auto opacity-30 mb-2" size={36} />
                                No supplier returns logged.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ─── TAB 5: SUPPLIERS ─── */}
              {activeTab === 'suppliers' && (
                <div className="space-y-6">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
                    <div className="relative w-full md:max-w-md">
                      <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="text"
                        placeholder="Search suppliers directory..."
                        value={vendorSearch}
                        onChange={(e) => setVendorSearch(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-2.5 rounded-xl text-xs outline-none focus:border-teal-300 focus:bg-white transition-all"
                      />
                    </div>
                    <button 
                      onClick={() => setShowCreateVendorModal(true)}
                      className="w-full md:w-auto px-5 py-2.5 bg-teal-700 hover:bg-teal-650 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Plus size={16} /> Register New Supplier
                    </button>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-150">
                            <th className="p-4">ID</th>
                            <th className="p-4">Supplier Name</th>
                            <th className="p-4">Contact Info</th>
                            <th className="p-4">Terms</th>
                            <th className="p-4">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                          {filteredVendors.map(vendor => (
                            <tr key={vendor.id} className="hover:bg-slate-50/50 transition-all">
                              <td className="p-4 font-bold text-slate-400">#VEN-{vendor.id}</td>
                              <td className="p-4 font-black text-slate-800">{vendor.name}</td>
                              <td className="p-4 text-slate-500">{vendor.contact || '—'}</td>
                              <td className="p-4 text-slate-500">{vendor.terms || 'Net 30'}</td>
                              <td className="p-4">
                                <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase ${
                                  vendor.is_active ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'
                                }`}>
                                  {vendor.is_active ? 'Active' : 'Inactive'}
                                </span>
                              </td>
                            </tr>
                          ))}
                          {filteredVendors.length === 0 && (
                            <tr>
                              <td colSpan={5} className="p-12 text-center text-slate-400">
                                <Truck className="mx-auto opacity-30 mb-2" size={36} />
                                No suppliers registered yet.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ─── TAB 6: QUALITY INCIDENTS ─── */}
              {activeTab === 'incidents' && (
                <div className="space-y-6">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
                    <div className="relative w-full md:max-w-md">
                      <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="text"
                        placeholder="Search incident reports..."
                        value={incSearch}
                        onChange={(e) => setIncSearch(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-2.5 rounded-xl text-xs outline-none focus:border-teal-300 focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-150">
                            <th className="p-4">ID</th>
                            <th className="p-4">Type</th>
                            <th className="p-4">Department</th>
                            <th className="p-4">Area</th>
                            <th className="p-4">Description</th>
                            <th className="p-4">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                          {filteredIncidents.map(inc => (
                            <tr key={inc.id} className="hover:bg-slate-50/50 transition-all">
                              <td className="p-4 font-bold text-slate-400">#INC-{inc.id}</td>
                              <td className="p-4 font-black text-slate-800">{inc.incident_type}</td>
                              <td className="p-4 text-slate-650">{inc.department}</td>
                              <td className="p-4 text-slate-500">{inc.area_of_incident}</td>
                              <td className="p-4 text-slate-500 max-w-xs truncate">{inc.description}</td>
                              <td className="p-4">
                                <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase ${
                                  inc.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'
                                }`}>
                                  {inc.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                          {filteredIncidents.length === 0 && (
                            <tr>
                              <td colSpan={6} className="p-12 text-center text-slate-400">
                                <ShieldAlert className="mx-auto opacity-30 mb-2" size={36} />
                                No incident reports matching criteria.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

          </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* ─── CREATE PURCHASE ORDER MODAL ─── */}
      <AnimatePresence>
        {showCreatePOModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreatePOModal(false)}
              className="absolute inset-0 bg-slate-900"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl p-6 overflow-hidden flex flex-col max-h-[90vh] text-slate-800"
            >
              <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-4">
                <h3 className="text-lg font-black text-slate-900">Generate Purchase Order (PO)</h3>
                <button onClick={() => setShowCreatePOModal(false)} className="text-slate-400 hover:text-slate-650 cursor-pointer"><X size={20} /></button>
              </div>

              <form onSubmit={handleCreatePOSubmit} className="space-y-4 overflow-y-auto flex-1 pr-1">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-600">Select Supplier</label>
                  <select 
                    value={poVendorId} 
                    onChange={(e) => setPoVendorId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-xs outline-none focus:bg-white"
                    required
                  >
                    <option value="">-- Choose Supplier --</option>
                    {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-600">Additional Instructions/Notes</label>
                  <textarea 
                    value={poNotes} 
                    onChange={(e) => setPoNotes(e.target.value)}
                    placeholder="Enter instructions, payment terms, delivery address..."
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-xs outline-none focus:bg-white h-20 resize-none"
                  />
                </div>

                {/* Add Item Panel */}
                <div className="border border-slate-150 rounded-2xl p-4 bg-slate-50/50 space-y-3">
                  <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">Add Products to PO</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-400">Product Name</label>
                      <input 
                        type="text" 
                        placeholder="Type name..." 
                        list="po-items-datalist"
                        value={tempPoItemName}
                        onChange={(e) => setTempPoItemName(e.target.value)}
                        className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs"
                      />
                      <datalist id="po-items-datalist">
                        {masterInventory.map((item, idx) => <option key={idx} value={item.name} />)}
                      </datalist>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-400">Quantity</label>
                      <input 
                        type="number" 
                        placeholder="Qty" 
                        value={tempPoItemQty}
                        onChange={(e) => setTempPoItemQty(e.target.value)}
                        className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-400">Estimated Unit Price (RWF)</label>
                      <div className="flex gap-2">
                        <input 
                          type="number" 
                          placeholder="Price" 
                          value={tempPoItemPrice}
                          onChange={(e) => setTempPoItemPrice(e.target.value)}
                          className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs flex-1"
                        />
                        <button 
                          type="button" 
                          onClick={handleAddPoItem}
                          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl cursor-pointer"
                        >Add</button>
                      </div>
                    </div>
                  </div>

                  {poItems.length > 0 && (
                    <div className="border border-slate-150 rounded-xl overflow-hidden bg-white mt-3">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-150">
                            <th className="p-2">Name</th>
                            <th className="p-2">Qty</th>
                            <th className="p-2">Price (RWF)</th>
                            <th className="p-2 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {poItems.map((item, idx) => (
                            <tr key={idx} className="border-b border-slate-100 text-slate-700">
                              <td className="p-2 font-semibold">{item.item_name}</td>
                              <td className="p-2 font-bold">{item.quantity}</td>
                              <td className="p-2 text-teal-700 font-bold">{item.unit_price.toLocaleString()}</td>
                              <td className="p-2 text-right">
                                <button type="button" onClick={() => handleRemovePoItem(idx)} className="text-rose-500 font-bold mr-2 hover:text-rose-700 cursor-pointer">Remove</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    type="submit" 
                    disabled={submittingPO}
                    className="flex-1 py-3 bg-teal-700 hover:bg-teal-650 text-white font-bold text-xs rounded-xl cursor-pointer transition-all flex items-center justify-center gap-2"
                  >
                    {submittingPO ? <Loader2 size={14} className="animate-spin" /> : 'Generate PO Draft'}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setShowCreatePOModal(false)}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-750 font-bold text-xs rounded-xl cursor-pointer"
                  >Cancel</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── CREATE GOODS RECEIPT NOTE (GRN) MODAL ─── */}
      <AnimatePresence>
        {showCreateGRNModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateGRNModal(false)}
              className="absolute inset-0 bg-slate-900"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl p-6 overflow-hidden flex flex-col max-h-[90vh] text-slate-800"
            >
              <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-4">
                <h3 className="text-lg font-black text-slate-900">Goods Receipt Note (GRN) Intake</h3>
                <button onClick={() => setShowCreateGRNModal(false)} className="text-slate-400 hover:text-slate-650 cursor-pointer"><X size={20} /></button>
              </div>

              <form onSubmit={handleCreateGRNSubmit} className="space-y-4 overflow-y-auto flex-1 pr-1">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-600">Link Purchase Order (Optional)</label>
                    <select 
                      value={grnPoId} 
                      onChange={(e) => handlePoChangeInGrn(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-xs outline-none cursor-pointer"
                    >
                      <option value="">-- Direct Stock Intake (No PO Link) --</option>
                      {purchaseOrders.filter(po => po.status === 'Sent to Supplier' || po.status === 'Approved').map(po => (
                        <option key={po.id} value={po.id}>{po.po_number} ({po.vendor_name})</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-600">Select Supplier</label>
                    <select 
                      value={grnVendorId} 
                      onChange={(e) => setGrnVendorId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-xs outline-none cursor-pointer"
                      disabled={!!grnPoId}
                      required
                    >
                      <option value="">-- Choose Supplier --</option>
                      {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-600">Invoice Number</label>
                    <input 
                      type="text" 
                      placeholder="e.g. INV-10029"
                      value={grnInvoice}
                      onChange={(e) => setGrnInvoice(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-xs outline-none focus:bg-white"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-600">Delivery Note Number</label>
                    <input 
                      type="text" 
                      placeholder="e.g. DN-883"
                      value={grnDeliveryNote}
                      onChange={(e) => setGrnDeliveryNote(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-xs outline-none focus:bg-white"
                    />
                  </div>
                </div>

                {/* Add Item Panel */}
                <div className="border border-slate-150 rounded-2xl p-4 bg-slate-50/50 space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">Intake Items Details</h4>
                    <span className="text-[10px] text-slate-400 font-bold">Provide batch, expiry, and purchase prices.</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-400">Product Name</label>
                      <input 
                        type="text" 
                        placeholder="Product name..." 
                        list="grn-items-datalist"
                        value={tempGrnItemName}
                        onChange={(e) => setTempGrnItemName(e.target.value)}
                        className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs"
                      />
                      <datalist id="grn-items-datalist">
                        {masterInventory.map((item, idx) => <option key={idx} value={item.name} />)}
                      </datalist>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-400">Quantity Received</label>
                      <input 
                        type="number" 
                        placeholder="Qty" 
                        value={tempGrnItemQty}
                        onChange={(e) => setTempGrnItemQty(e.target.value)}
                        className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-400">Purchase Price (RWF)</label>
                      <input 
                        type="number" 
                        placeholder="Price" 
                        value={tempGrnItemPrice}
                        onChange={(e) => setTempGrnItemPrice(e.target.value)}
                        className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-400">Batch Number</label>
                      <input 
                        type="text" 
                        placeholder="e.g. B-901" 
                        value={tempGrnItemBatch}
                        onChange={(e) => setTempGrnItemBatch(e.target.value)}
                        className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-400">Expiry Date</label>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          placeholder="e.g. 12/2028 or YYYY-MM-DD" 
                          value={tempGrnItemExpiry}
                          onChange={(e) => setTempGrnItemExpiry(e.target.value)}
                          className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs flex-1"
                        />
                        <button 
                          type="button" 
                          onClick={handleAddGrnItem}
                          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl cursor-pointer"
                        >Add</button>
                      </div>
                    </div>
                  </div>

                  {grnItemsForm.length > 0 && (
                    <div className="border border-slate-150 rounded-xl overflow-hidden bg-white mt-3">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-150">
                            <th className="p-2">Name</th>
                            <th className="p-2">Qty Received</th>
                            <th className="p-2">Price (RWF)</th>
                            <th className="p-2">Batch</th>
                            <th className="p-2">Expiry</th>
                            <th className="p-2 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {grnItemsForm.map((item, idx) => (
                            <tr key={idx} className="border-b border-slate-100 text-slate-700 font-semibold">
                              <td className="p-2">{item.item_name}</td>
                              <td className="p-2 text-teal-700 font-bold">{item.quantity_received}</td>
                              <td className="p-2">{item.purchase_price.toLocaleString()}</td>
                              <td className="p-2 font-mono text-[10px]">{item.batch_number || '—'}</td>
                              <td className="p-2 text-[10px]">{item.expiry_date || '—'}</td>
                              <td className="p-2 text-right">
                                <button type="button" onClick={() => handleRemoveGrnItem(idx)} className="text-rose-500 font-bold mr-2 hover:text-rose-700 cursor-pointer">Remove</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-600">Receipt Notes</label>
                  <textarea 
                    value={grnNotes} 
                    onChange={(e) => setGrnNotes(e.target.value)}
                    placeholder="Enter details on condition, discrepancies..."
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-xs outline-none focus:bg-white h-20 resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    type="submit" 
                    disabled={submittingGRN}
                    className="flex-1 py-3 bg-teal-700 hover:bg-teal-650 text-white font-bold text-xs rounded-xl cursor-pointer transition-all flex items-center justify-center gap-2"
                  >
                    {submittingGRN ? <Loader2 size={14} className="animate-spin" /> : 'Process Goods Receipt Note'}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setShowCreateGRNModal(false)}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-750 font-bold text-xs rounded-xl cursor-pointer"
                  >Cancel</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── REGISTER NEW SUPPLIER MODAL ─── */}
      <AnimatePresence>
        {showCreateVendorModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateVendorModal(false)}
              className="absolute inset-0 bg-slate-900"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 overflow-hidden flex flex-col text-slate-800 animate-none"
            >
              <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-4">
                <h3 className="text-lg font-black text-slate-900">Register New Supplier</h3>
                <button onClick={() => setShowCreateVendorModal(false)} className="text-slate-400 hover:text-slate-650 cursor-pointer"><X size={20} /></button>
              </div>

              <form onSubmit={handleCreateVendorSubmit} className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-600">Supplier / Corporate Name</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Enter supplier name..."
                    value={vendorName}
                    onChange={(e) => setVendorName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-xs outline-none focus:bg-white"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-600">Contact Details</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Email, phone, or representative..."
                    value={vendorContact}
                    onChange={(e) => setVendorContact(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-xs outline-none focus:bg-white"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-600">Contract Payment Terms</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Net 30, Cash on Delivery..."
                    value={vendorTerms}
                    onChange={(e) => setVendorTerms(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-xs outline-none focus:bg-white"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    type="submit" 
                    disabled={submittingVendor}
                    className="flex-1 py-3 bg-teal-700 hover:bg-teal-650 text-white font-bold text-xs rounded-xl cursor-pointer transition-all flex items-center justify-center gap-2"
                  >
                    {submittingVendor ? <Loader2 size={14} className="animate-spin" /> : 'Register Supplier'}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setShowCreateVendorModal(false)}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-750 font-bold text-xs rounded-xl cursor-pointer"
                  >Cancel</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── INCIDENT REPORT MODAL ─── */}
      <AnimatePresence>
        {showCreateIncidentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateIncidentModal(false)}
              className="absolute inset-0 bg-slate-900"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 overflow-hidden flex flex-col max-h-[90vh] text-slate-800"
            >
              <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-4">
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <AlertTriangle className="text-rose-600 animate-pulse" size={20} />
                  Report Quality/Store Incident
                </h3>
                <button onClick={() => setShowCreateIncidentModal(false)} className="text-slate-400 hover:text-slate-650 cursor-pointer"><X size={20} /></button>
              </div>

              <form onSubmit={handleIncidentSubmit} className="space-y-4 overflow-y-auto flex-1 pr-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-600">Incident Classification</label>
                    <select 
                      value={incidentFormData.incidentType}
                      onChange={(e) => setIncidentFormData({...incidentFormData, incidentType: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-xs outline-none"
                    >
                      <option value="Equipment">Storage/Equipment Issue</option>
                      <option value="Staff">Delivery Discrepancy</option>
                      <option value="Patient">Quality Inspection Fail</option>
                      <option value="Others">Others</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-600">Department</label>
                    <input 
                      type="text" 
                      value={incidentFormData.department}
                      disabled
                      className="w-full bg-slate-100 border border-slate-250 px-3 py-2.5 rounded-xl text-xs outline-none cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-600">Area/Location of Incident</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Central Store Shelf B"
                      value={incidentFormData.areaOfIncident}
                      onChange={(e) => setIncidentFormData({...incidentFormData, areaOfIncident: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-xs outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-600">Personnel Involved</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Supplier Driver, Intake Clerk"
                      value={incidentFormData.namesInvolved}
                      onChange={(e) => setIncidentFormData({...incidentFormData, namesInvolved: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-xs outline-none"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-600">Detailed Description</label>
                  <textarea 
                    required
                    value={incidentFormData.description} 
                    onChange={(e) => setIncidentFormData({...incidentFormData, description: e.target.value})}
                    placeholder="Provide a comprehensive timeline of the occurrence..."
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-xs outline-none h-24 resize-none focus:bg-white"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-600">Immediate Corrective Actions Taken</label>
                  <textarea 
                    value={incidentFormData.immediateActions} 
                    onChange={(e) => setIncidentFormData({...incidentFormData, immediateActions: e.target.value})}
                    placeholder="What measures were taken immediately to contain the issue?"
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-xs outline-none h-20 resize-none focus:bg-white"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    type="submit" 
                    disabled={submittingIncident}
                    className="flex-1 py-3 bg-rose-650 hover:bg-rose-600 text-white font-bold text-xs rounded-xl cursor-pointer transition-all flex items-center justify-center gap-2"
                  >
                    {submittingIncident ? <Loader2 size={14} className="animate-spin" /> : 'Log Quality Incident'}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setShowCreateIncidentModal(false)}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-750 font-bold text-xs rounded-xl cursor-pointer"
                  >Cancel</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── DETAILS DRAWER: PURCHASE ORDER ITEMS ─── */}
      <AnimatePresence>
        {selectedPO && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPO(null)}
              className="fixed inset-0 bg-slate-900 z-45"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-white border-l border-slate-200 z-50 p-6 shadow-2xl flex flex-col text-slate-800"
            >
              <div className="flex justify-between items-center border-b border-slate-200 pb-4 mb-6">
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-400">PURCHASE ORDER RECORD</span>
                  <h3 className="text-lg font-black text-slate-900 mt-1">{selectedPO.po_number}</h3>
                </div>
                <button onClick={() => setSelectedPO(null)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"><X size={18} /></button>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-slate-50 border border-slate-150 p-4 rounded-2xl mb-6 text-xs font-semibold">
                <div>
                  <p className="text-slate-400 text-[10px] font-black uppercase">Supplier</p>
                  <p className="text-slate-800 mt-0.5">{selectedPO.vendor_name}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px] font-black uppercase">Created At</p>
                  <p className="text-slate-800 mt-0.5">{new Date(selectedPO.created_at).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px] font-black uppercase">Estimated Total</p>
                  <p className="text-slate-800 mt-0.5 font-bold text-teal-700">{selectedPO.total_amount ? `${selectedPO.total_amount.toLocaleString()} RWF` : '—'}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px] font-black uppercase">Status</p>
                  <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[9px] font-black bg-teal-50 text-teal-600 border border-teal-100 uppercase">{selectedPO.status}</span>
                </div>
              </div>

              {selectedPO.notes && (
                <div className="mb-6 p-3 bg-indigo-50/20 border border-indigo-100 rounded-2xl">
                  <p className="text-[10px] font-black text-indigo-700 uppercase flex items-center gap-1"><Info size={12} /> Remarks / Instructions</p>
                  <p className="text-xs text-slate-650 mt-1 leading-relaxed">{selectedPO.notes}</p>
                </div>
              )}

              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Requisition Catalog Items</h4>
              <div className="flex-1 overflow-y-auto border border-slate-100 rounded-2xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-150">
                      <th className="p-3">Item Name</th>
                      <th className="p-3">Qty</th>
                      <th className="p-3 text-right">Unit Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedPO.items || []).map((item, idx) => (
                      <tr key={idx} className="border-b border-slate-100 font-semibold text-slate-700">
                        <td className="p-3">{item.item_name}</td>
                        <td className="p-3 text-teal-700 font-bold">{item.quantity}</td>
                        <td className="p-3 text-right">{item.unit_price.toLocaleString()} RWF</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Status Actions */}
              <div className="mt-6 space-y-3">
                {(selectedPO.status === 'Draft' || selectedPO.status === 'Pending Approval') && (
                  <div className="flex gap-3">
                    <button 
                      onClick={() => handleUpdatePOStatus(selectedPO.id, 'Approved')}
                      className="flex-1 py-3 bg-teal-750 hover:bg-teal-700 text-white font-bold text-xs rounded-xl cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Check size={14} /> Approve PO
                    </button>
                    <button 
                      onClick={() => handleUpdatePOStatus(selectedPO.id, 'Sent to Supplier')}
                      className="flex-1 py-3 bg-indigo-650 hover:bg-indigo-600 text-white font-bold text-xs rounded-xl cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <ArrowRight size={14} /> Send to Supplier
                    </button>
                  </div>
                )}
                {/* Print PO Button - always visible */}
                <button
                  onClick={() => setPoPrintData(selectedPO)}
                  className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl cursor-pointer flex items-center justify-center gap-1.5 transition-all"
                >
                  <Printer size={14} /> Generate Printable PO Document
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ─── DETAILS DRAWER: GOODS RECEIPT ITEMS ─── */}
      <AnimatePresence>
        {selectedGRN && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedGRN(null)}
              className="fixed inset-0 bg-slate-900 z-45"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-white border-l border-slate-200 z-50 p-6 shadow-2xl flex flex-col text-slate-800"
            >
              <div className="flex justify-between items-center border-b border-slate-200 pb-4 mb-6">
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-400">GOODS RECEIPT note</span>
                  <h3 className="text-lg font-black text-slate-900 mt-1">{selectedGRN.grn_number}</h3>
                </div>
                <button onClick={() => setSelectedGRN(null)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"><X size={18} /></button>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-slate-50 border border-slate-150 p-4 rounded-2xl mb-6 text-xs font-semibold">
                <div>
                  <p className="text-slate-400 text-[10px] font-black uppercase">Supplier</p>
                  <p className="text-slate-800 mt-0.5">{selectedGRN.vendor_name}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px] font-black uppercase">Received At</p>
                  <p className="text-slate-800 mt-0.5">{new Date(selectedGRN.received_at).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px] font-black uppercase">Invoice #</p>
                  <p className="text-slate-800 mt-0.5">{selectedGRN.invoice_number || 'Direct Intake'}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px] font-black uppercase">Delivery Note #</p>
                  <p className="text-slate-800 mt-0.5">{selectedGRN.delivery_note_number || '—'}</p>
                </div>
              </div>

              {selectedGRN.notes && (
                <div className="mb-6 p-3 bg-teal-50/20 border border-teal-100 rounded-2xl">
                  <p className="text-[10px] font-black text-teal-700 uppercase flex items-center gap-1"><Info size={12} /> Intake Remarks</p>
                  <p className="text-xs text-slate-650 mt-1 leading-relaxed">{selectedGRN.notes}</p>
                </div>
              )}

              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Intaken Products List</h4>
              <div className="flex-1 overflow-y-auto border border-slate-100 rounded-2xl">
                {loadingGrnItems ? (
                  <div className="flex h-32 items-center justify-center">
                    <Loader2 className="animate-spin text-teal-600" />
                  </div>
                ) : (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-150">
                        <th className="p-3">Item Name</th>
                        <th className="p-3">Qty Received</th>
                        <th className="p-3">Batch</th>
                        <th className="p-3 text-right">Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {grnItems.map((item, idx) => (
                        <tr key={idx} className="border-b border-slate-100 font-semibold text-slate-700">
                          <td className="p-3">{item.item_name}</td>
                          <td className="p-3 text-teal-700 font-bold">{item.quantity_received}</td>
                          <td className="p-3 font-mono text-[10px]">{item.batch_number || '—'}</td>
                          <td className="p-3 text-right">{item.purchase_price.toLocaleString()} RWF</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ─── REVIEW DRAWER: SUPPLIER SUBMISSIONS ─── */}
      <AnimatePresence>
        {selectedSubmission && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedSubmission(null)}
              className="fixed inset-0 bg-slate-900 z-45"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-xl bg-white border-l border-slate-200 z-50 p-6 shadow-2xl flex flex-col text-slate-800"
            >
              <div className="flex justify-between items-center border-b border-slate-200 pb-4 mb-6">
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-400">SUPPLIER SUBMISSION REVIEW</span>
                  <h3 className="text-lg font-black text-slate-900 mt-1">#SUB-{selectedSubmission.id}</h3>
                </div>
                <button onClick={() => setSelectedSubmission(null)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"><X size={18} /></button>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-slate-50 border border-slate-150 p-4 rounded-2xl mb-6 text-xs font-semibold">
                <div>
                  <p className="text-slate-400 text-[10px] font-black uppercase">Supplier</p>
                  <p className="text-slate-800 mt-0.5">{selectedSubmission.supplier_name}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px] font-black uppercase">Uploaded At</p>
                  <p className="text-slate-800 mt-0.5">{new Date(selectedSubmission.uploaded_at).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px] font-black uppercase">Total Items Uploaded</p>
                  <p className="text-slate-800 mt-0.5 font-bold text-teal-700">{selectedSubmission.total_items} items</p>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px] font-black uppercase">Status</p>
                  <span className="inline-block mt-0.5 px-2.5 py-0.5 rounded text-[9px] font-black bg-amber-50 text-amber-600 border border-amber-100 uppercase">{selectedSubmission.status}</span>
                </div>
              </div>

              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Submission Details</h4>
              <div className="flex-1 overflow-y-auto border border-slate-100 rounded-2xl">
                {loadingSubItems ? (
                  <div className="flex h-32 items-center justify-center">
                    <Loader2 className="animate-spin text-teal-600" />
                  </div>
                ) : (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-150">
                        <th className="p-3">Product</th>
                        <th className="p-3">Qty</th>
                        <th className="p-3">Price</th>
                        <th className="p-3">Batch</th>
                        <th className="p-3">Expiry</th>
                      </tr>
                    </thead>
                    <tbody>
                      {submissionItems.map((item, idx) => (
                        <tr key={idx} className="border-b border-slate-100 font-semibold text-slate-700">
                          <td className="p-3">{item.name}</td>
                          <td className="p-3 text-indigo-600 font-bold">{item.quantity}</td>
                          <td className="p-3 font-bold text-teal-750">{item.purchase_price.toLocaleString()} RWF</td>
                          <td className="p-3 font-mono text-[10px]">{item.batch_number || '—'}</td>
                          <td className="p-3 text-[10px]">{item.expiry_date || '—'}</td>
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
                    <ShieldAlert className="flex-shrink-0" size={18} />
                    Confirming will automatically register these batch numbers and expiry records and merge received quantities into the Central Store inventory.
                  </div>
                  <button 
                    onClick={() => handleReceiveStock(selectedSubmission.id)}
                    disabled={processingReceive}
                    className="w-full py-3 bg-teal-700 hover:bg-teal-650 text-white font-bold text-xs rounded-xl cursor-pointer flex items-center justify-center gap-1.5 transition-all"
                  >
                    {processingReceive ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />} Approve & Intake Stock delivery
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Create Supplier Return Modal Overlay */}
      <AnimatePresence>
        {showCreateReturnModal && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateReturnModal(false)}
              className="fixed inset-0 bg-slate-900/60 z-40 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-x-4 top-10 max-h-[85vh] md:max-w-2xl md:mx-auto bg-white border border-slate-200 rounded-3xl z-50 shadow-2xl p-6 flex flex-col text-slate-800 overflow-hidden animate-none"
            >
              <div className="flex justify-between items-center border-b border-slate-200 pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-teal-50 text-teal-650 border border-teal-100 rounded-lg">
                    <ArrowRightLeft size={16} />
                  </span>
                  <h3 className="text-lg font-black text-slate-900">Log Return to Supplier</h3>
                </div>
                <button 
                  onClick={() => setShowCreateReturnModal(false)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 space-y-4 custom-scrollbar">
                <form id="modal-return-form" onSubmit={handleCreateReturnSubmit} className="space-y-4 animate-none">
                  
                  {/* General Config */}
                  <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] uppercase font-bold text-slate-450">Select Supplier *</label>
                      <select
                        required
                        value={returnVendorId}
                        onChange={(e) => setReturnVendorId(e.target.value)}
                        className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs text-slate-800 outline-none focus:border-teal-350"
                      >
                        <option value="">-- Choose Supplier --</option>
                        {vendors.map(v => (
                          <option key={v.id} value={v.id}>{v.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] uppercase font-bold text-slate-450">Return Reason Category</label>
                      <select
                        value={tempReturnItemReason}
                        onChange={(e) => setTempReturnItemReason(e.target.value)}
                        className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs text-slate-800 outline-none focus:border-teal-350"
                      >
                        <option value="Damaged">Damaged / Defective</option>
                        <option value="Expired">Expired</option>
                        <option value="Incorrect Item">Incorrect Item / Excess Supply</option>
                        <option value="Recall">Manufacturer Recall</option>
                        <option value="Others">Others</option>
                      </select>
                    </div>

                    <div className="col-span-2 flex flex-col gap-1">
                      <label className="text-[10px] uppercase font-bold text-slate-405">Internal Return Notes</label>
                      <textarea
                        rows="2"
                        placeholder="Log reason/details for returning this stock batch..."
                        value={returnNotes}
                        onChange={(e) => setReturnNotes(e.target.value)}
                        className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs text-slate-800 outline-none focus:border-teal-350 resize-none"
                      />
                    </div>
                  </div>

                  {/* Add Items Section */}
                  <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl space-y-3">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Select Stock Lots to Return</h4>
                    
                    <div className="grid grid-cols-3 gap-3 items-end">
                      <div className="col-span-2 flex flex-col gap-1">
                        <label className="text-[10px] uppercase font-bold text-slate-455">Select Lot/Batch (from Store Inventory) *</label>
                        <select
                          value={tempReturnItemName}
                          onChange={(e) => setTempReturnItemName(e.target.value)}
                          className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs text-slate-800 outline-none focus:border-teal-350"
                        >
                          <option value="">-- Choose Stock Batch --</option>
                          {masterInventory
                            .filter(i => (i.quantity || 0) > 0)
                            .map(item => (
                              <option key={item.batch_id || item.id} value={item.name}>
                                {item.name} (Batch: {item.batch_number || 'N/A'}, Qty: {item.quantity})
                              </option>
                            ))
                          }
                        </select>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] uppercase font-bold text-slate-455">Quantity *</label>
                        <input
                          type="number"
                          placeholder="e.g. 10"
                          value={tempReturnItemQty}
                          onChange={(e) => setTempReturnItemQty(e.target.value)}
                          className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs text-slate-800 outline-none focus:border-teal-350"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddReturnItem}
                      className="w-full bg-slate-200 hover:bg-slate-300 text-slate-750 font-bold text-xs py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 mt-2 border border-slate-300"
                    >
                      <Plus size={14} /> Add Item to Return List
                    </button>
                  </div>

                  {/* Added Items List */}
                  {returnItems.length > 0 && (
                    <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-150">
                            <th className="p-3">Item Name</th>
                            <th className="p-3">Batch Number</th>
                            <th className="p-3">Quantity</th>
                            <th className="p-3">Reason</th>
                            <th className="p-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                          {returnItems.map((item, idx) => (
                            <tr key={idx}>
                              <td className="p-3 text-slate-800">{item.item_name}</td>
                              <td className="p-3 text-slate-500 font-mono">{item.batch_number}</td>
                              <td className="p-3">{item.quantity}</td>
                              <td className="p-3">
                                <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[10px] font-black uppercase">
                                  {item.reason}
                                </span>
                              </td>
                              <td className="p-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveReturnItem(idx)}
                                  className="text-rose-650 hover:text-rose-800 transition-colors p-1 cursor-pointer"
                                >
                                  <X size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                </form>
              </div>

              {/* Action footer */}
              <div className="mt-4 border-t border-slate-200 pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateReturnModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-3 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="modal-return-form"
                  disabled={submittingReturn}
                  className="flex-2 bg-teal-650 hover:bg-teal-600 text-white font-bold text-xs py-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow"
                >
                  {submittingReturn ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Submitting Return...
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      Log Return Transaction
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Requisitions Detail Drawer Overlay */}
      <AnimatePresence>
        {selectedRequisition && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedRequisition(null)}
              className="fixed inset-0 bg-slate-900 z-40 backdrop-blur-xs"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-white border-l border-slate-200 z-50 p-6 shadow-2xl flex flex-col text-slate-800"
            >
              <div className="flex justify-between items-center border-b border-slate-200 pb-4 mb-6">
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-400">
                    {selectedRequisition.isReturn ? 'SUPPLIER RETURN LEDGER' : 'REQUISITION LEDGER'}
                  </span>
                  <h3 className="text-lg font-black text-slate-900 mt-1">
                    {selectedRequisition.isReturn ? `${selectedRequisition.id}` : `Requisition #${selectedRequisition.id}`}
                  </h3>
                </div>
                <button 
                  onClick={() => setSelectedRequisition(null)}
                  className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Info Details Grid */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 border border-slate-150 p-4 rounded-2xl mb-6 text-xs">
                <div>
                  <p className="text-[10px] text-slate-450 uppercase font-black">Origin / Target</p>
                  <p className="font-bold text-slate-700 mt-0.5">{selectedRequisition.department_name}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-455 uppercase font-black">Date</p>
                  <p className="font-bold text-slate-700 mt-0.5">{new Date(selectedRequisition.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-455 uppercase font-black">Priority / Classification</p>
                  <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md inline-block mt-0.5 ${
                    selectedRequisition.urgency === 'Critical' ? 'bg-red-50 text-red-655 border border-red-100' :
                    selectedRequisition.urgency === 'High' ? 'bg-amber-50 text-amber-655 border border-amber-100' :
                    'bg-slate-100 text-slate-550 border border-slate-200'
                  }`}>{selectedRequisition.urgency}</span>
                </div>
                <div>
                  <p className="text-[10px] text-slate-455 uppercase font-black">Status</p>
                  <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md inline-block mt-0.5 ${
                    selectedRequisition.status === 'Pending' ? 'bg-amber-50 text-amber-655 border border-amber-100' :
                    selectedRequisition.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                    'bg-slate-100 text-slate-550 border border-slate-200'
                  }`}>{selectedRequisition.status}</span>
                </div>
                {selectedRequisition.notes && (
                  <div className="col-span-2 border-t border-slate-150 pt-2.5">
                    <p className="text-[10px] text-slate-455 uppercase font-black">Notes</p>
                    <p className="text-slate-600 mt-1 italic">"{selectedRequisition.notes}"</p>
                  </div>
                )}
              </div>

              {/* Items List */}
              <div className="flex-1 flex flex-col min-h-0">
                <h4 className="font-bold text-xs text-slate-450 uppercase tracking-widest mb-3">Itemized Details</h4>
                
                {loadingReqItems ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-teal-650" />
                    <span className="text-xs text-slate-500 font-medium">Loading items...</span>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto pr-1 border border-slate-200 rounded-2xl custom-scrollbar divide-y divide-slate-150 bg-slate-50/50">
                    {requisitionItems.length === 0 ? (
                      <p className="p-6 text-center text-xs text-slate-400 font-bold">No item details recorded.</p>
                    ) : (
                      requisitionItems.map((item, idx) => (
                        <div key={idx} className="p-4 flex items-center justify-between">
                          <div>
                            <h5 className="font-bold text-slate-800 text-sm">{item.item_name}</h5>
                            {item.batch_number && (
                              <p className="text-[10px] text-slate-450 font-mono mt-0.5">Batch: {item.batch_number}</p>
                            )}
                            {item.reason && (
                              <p className="text-[10px] text-amber-700 font-bold mt-0.5 font-sans">Reason: {item.reason}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <span className="text-xs text-slate-400 font-bold">Quantity:</span>
                            <p className="text-sm font-black text-slate-800">{item.requested_quantity} {item.unit_of_measure || 'Unit'}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-6 border-t border-slate-200 pt-5 flex gap-3">
                <button
                  onClick={() => setSelectedRequisition(null)}
                  className="w-full bg-slate-150 hover:bg-slate-200 text-slate-700 font-bold text-sm py-3 rounded-xl transition-all cursor-pointer text-center"
                >
                  Close Details
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      {/* ─── PRINT / PDF PURCHASE ORDER MODAL ─── */}
      <AnimatePresence>
        {poPrintData && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden"
            >
              {/* Modal Toolbar */}
              <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 bg-slate-50">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Purchase Order — Print Preview</h3>
                  <p className="text-[10px] text-slate-400 font-bold mt-0.5">{poPrintData.po_number} • {poPrintData.vendor_name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const printWindow = window.open('', '_blank');
                      const poDoc = document.getElementById('po-print-template').innerHTML;
                      printWindow.document.write(`
                        <html><head><title>PO - ${poPrintData.po_number}</title>
                        <style>
                          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
                          * { margin: 0; padding: 0; box-sizing: border-box; }
                          body { font-family: 'Inter', Arial, sans-serif; font-size: 11px; color: #111; }
                          @page { size: A4 portrait; margin: 1cm; }
                          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
                          .po-page { max-width: 100%; padding: 0; }
                          table { width: 100%; border-collapse: collapse; }
                          th, td { border: 1px solid #000; padding: 5px 8px; }
                          thead th { background: #f8f8f8; font-weight: 800; text-align: center; }
                        </style></head><body>${poDoc}</body></html>
                      `);
                      printWindow.document.close();
                      printWindow.focus();
                      setTimeout(() => { printWindow.print(); }, 400);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-teal-700 hover:bg-teal-600 text-white text-xs font-bold rounded-xl cursor-pointer transition-all"
                  >
                    <Printer size={14} /> Print / Save PDF
                  </button>
                  <button onClick={() => setPoPrintData(null)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 cursor-pointer">
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* The A4 print-preview body */}
              <div className="overflow-y-auto flex-1 p-6 bg-slate-100">
                <div id="po-print-template" className="po-page bg-white shadow-lg mx-auto" style={{ width: '210mm', minHeight: '297mm', padding: '16mm 14mm', fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#111' }}>
                  
                  {/* ── HEADER ── */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    {/* Logo + Name */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ background: '#1d4ed8', borderRadius: '6px', padding: '6px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ color: 'white', fontWeight: '900', fontSize: '13px', letterSpacing: '-0.5px', lineHeight: 1 }}>&#10011; LEGACY<br /><span style={{ fontSize: '9px', letterSpacing: '1px', fontWeight: '700' }}>CLINICS</span></div>
                      </div>
                    </div>
                    {/* Address block */}
                    <div style={{ textAlign: 'right', fontSize: '9px', lineHeight: '1.5', color: '#444' }}>
                      <div style={{ fontWeight: 700 }}>KK3 RD 134 KICUKIRO Districts</div>
                      <div>Nyarugunga Sector RWANDA</div>
                      <div>Tel: 0788382000 | 0733682000 | 0723382000 | 8000</div>
                      <div>info@legacyclinics.rw | www.legacyclinics.rw</div>
                    </div>
                  </div>

                  {/* Divider + Title */}
                  <div style={{ borderTop: '2px solid #000', borderBottom: '1px solid #000', textAlign: 'center', padding: '4px 0', marginBottom: '10px' }}>
                    <span style={{ fontWeight: '900', fontSize: '14px', letterSpacing: '1px' }}>Purchase Order</span>
                  </div>

                  {/* PO Meta Row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ marginBottom: '6px' }}>
                        <span style={{ fontWeight: 700 }}>To: </span>
                        <span style={{ borderBottom: '1px solid #000', minWidth: '160px', display: 'inline-block', paddingBottom: '1px' }}>{poPrintData.vendor_name}</span>
                      </div>
                      <div>
                        <span style={{ fontWeight: 700 }}>Department: </span>
                        <span style={{ borderBottom: '1px solid #000', minWidth: '130px', display: 'inline-block' }}>Central Store</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '18px', fontWeight: '900', marginBottom: '4px' }}>{poPrintData.po_number?.replace('PO-', '') || '—'}</div>
                      <div style={{ fontSize: '9px', color: '#666' }}>No: <span style={{ borderBottom: '1px dotted #888', display: 'inline-block', minWidth: '60px' }}></span></div>
                    </div>
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    <span style={{ fontWeight: 700 }}>Delivery Date: </span>
                    <span style={{ borderBottom: '1px solid #000', display: 'inline-block', minWidth: '130px' }}></span>
                  </div>

                  {/* Items Table */}
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '0', fontSize: '11px' }}>
                    <thead>
                      <tr style={{ background: '#f5f5f5' }}>
                        <th style={{ border: '1px solid #000', padding: '5px 8px', fontWeight: 800, textAlign: 'center', width: '8%' }}>Sl. No.</th>
                        <th style={{ border: '1px solid #000', padding: '5px 8px', fontWeight: 800, textAlign: 'center' }}>Description of Items</th>
                        <th style={{ border: '1px solid #000', padding: '5px 8px', fontWeight: 800, textAlign: 'center', width: '10%' }}>Qty.</th>
                        <th style={{ border: '1px solid #000', padding: '5px 8px', fontWeight: 800, textAlign: 'center', width: '16%' }}>Unit Price</th>
                        <th style={{ border: '1px solid #000', padding: '5px 8px', fontWeight: 800, textAlign: 'center', width: '18%' }}>Total Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(poPrintData.items || []).map((item, idx) => (
                        <tr key={idx}>
                          <td style={{ border: '1px solid #000', padding: '5px 8px', textAlign: 'center' }}>{idx + 1}</td>
                          <td style={{ border: '1px solid #000', padding: '5px 8px' }}>{item.item_name}</td>
                          <td style={{ border: '1px solid #000', padding: '5px 8px', textAlign: 'center' }}>{item.quantity}</td>
                          <td style={{ border: '1px solid #000', padding: '5px 8px', textAlign: 'right' }}>{(item.unit_price || 0).toLocaleString()}</td>
                          <td style={{ border: '1px solid #000', padding: '5px 8px', textAlign: 'right' }}>{((item.unit_price || 0) * (item.quantity || 0)).toLocaleString()}</td>
                        </tr>
                      ))}
                      {/* Padding rows for empty lines */}
                      {Array.from({ length: Math.max(0, 8 - (poPrintData.items || []).length) }).map((_, i) => (
                        <tr key={`empty-${i}`}>
                          <td style={{ border: '1px solid #000', padding: '5px 8px', height: '22px' }}>&nbsp;</td>
                          <td style={{ border: '1px solid #000', padding: '5px 8px' }}></td>
                          <td style={{ border: '1px solid #000', padding: '5px 8px' }}></td>
                          <td style={{ border: '1px solid #000', padding: '5px 8px' }}></td>
                          <td style={{ border: '1px solid #000', padding: '5px 8px' }}></td>
                        </tr>
                      ))}
                      {/* Subtotal */}
                      <tr>
                        <td colSpan={3} style={{ border: '1px solid #000', padding: '5px 8px' }}></td>
                        <td style={{ border: '1px solid #000', padding: '5px 8px', fontWeight: 800, textAlign: 'right', background: '#f5f5f5' }}>Sub Total</td>
                        <td style={{ border: '1px solid #000', padding: '5px 8px', textAlign: 'right', fontWeight: 700 }}>
                          {((poPrintData.items || []).reduce((s, i) => s + ((i.unit_price || 0) * (i.quantity || 0)), 0)).toLocaleString()}
                        </td>
                      </tr>
                      {/* VAT */}
                      <tr>
                        <td colSpan={3} style={{ border: '1px solid #000', padding: '5px 8px' }}></td>
                        <td style={{ border: '1px solid #000', padding: '5px 8px', fontWeight: 800, textAlign: 'right', background: '#f5f5f5' }}>VAT 18%</td>
                        <td style={{ border: '1px solid #000', padding: '5px 8px', textAlign: 'right', fontWeight: 700 }}>0</td>
                      </tr>
                      {/* TOTAL */}
                      <tr>
                        <td colSpan={3} style={{ border: '1px solid #000', padding: '5px 8px' }}></td>
                        <td style={{ border: '1px solid #000', padding: '5px 8px', fontWeight: 900, textAlign: 'right', background: '#e8f0fe' }}>TOTAL</td>
                        <td style={{ border: '1px solid #000', padding: '5px 8px', textAlign: 'right', fontWeight: 900, background: '#e8f0fe' }}>
                          {((poPrintData.items || []).reduce((s, i) => s + ((i.unit_price || 0) * (i.quantity || 0)), 0)).toLocaleString()}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Terms & Conditions */}
                  <div style={{ marginTop: '12px', fontSize: '10px', lineHeight: '1.6' }}>
                    <div style={{ fontWeight: 800, marginBottom: '3px' }}>Terms &amp; Conditions:</div>
                    <div>1. The items supplied should be as per the specifications mentioned above.</div>
                    <div>2. Payment will be released 30/45 days after delivery of the items.</div>
                    <div>3. If the items are not received in good condition the same will be returned.</div>
                    {poPrintData.notes && <div style={{ marginTop: '4px', fontStyle: 'italic', color: '#555' }}>Note: {poPrintData.notes}</div>}
                  </div>

                  {/* Signature Block */}
                  <div style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '10px' }}>
                    <div>
                      <div style={{ marginBottom: '8px' }}>Prepared by: <span style={{ borderBottom: '1px solid #000', display: 'inline-block', width: '130px' }}>&nbsp;{user?.fullName || ''}</span></div>
                      <div style={{ marginBottom: '8px' }}>Reviewed by: <span style={{ borderBottom: '1px solid #000', display: 'inline-block', width: '130px' }}></span></div>
                      <div>Approved by: <span style={{ borderBottom: '1px solid #000', display: 'inline-block', width: '130px' }}></span></div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ marginBottom: '8px' }}>Date: <span style={{ borderBottom: '1px solid #000', display: 'inline-block', width: '90px' }}>&nbsp;{new Date(poPrintData.created_at).toLocaleDateString()}</span></div>
                      <div style={{ marginBottom: '8px' }}>Date: <span style={{ borderBottom: '1px solid #000', display: 'inline-block', width: '90px' }}></span></div>
                      <div>Date: <span style={{ borderBottom: '1px solid #000', display: 'inline-block', width: '90px' }}></span></div>
                    </div>
                  </div>

                  {/* Footer Banner */}
                  <div style={{ marginTop: '24px', background: '#1d4ed8', color: 'white', textAlign: 'center', padding: '6px', borderRadius: '4px', fontWeight: '800', fontSize: '11px', letterSpacing: '1px' }}>
                    HEALTH FOR LIFE
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
