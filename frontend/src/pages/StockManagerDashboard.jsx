import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Package, Database, AlertTriangle, ArrowRight, Settings, 
  TrendingUp, Activity, CheckCircle, Clock, Search, 
  ArrowRightLeft, FileWarning, Calendar, Loader2, Plus,
  Eye, RefreshCw, BarChart2, ListFilter, Check, X, ClipboardList,
  AlertCircle, Filter, ArrowUpRight, FileText, Sparkles, Building, Key, XCircle
} from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/axios';
import { getIncidents, createIncident } from '../api/incidents';
import { toast } from 'react-hot-toast';

export default function StockManagerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Tab State: 'overview' | 'requisitions' | 'stock' | 'incidents'
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Core Data
  const [stockInHand, setStockInHand] = useState([]);
  const [requisitions, setRequisitions] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [incidents, setIncidents] = useState([]);

  // Supplier Portal states — multi-session
  const [portalSessions, setPortalSessions] = useState([]);   // array of active session objects
  const [submissions, setSubmissions] = useState([]);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [submissionItems, setSubmissionItems] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [loadingSubItems, setLoadingSubItems] = useState(false);
  const [processingReceive, setProcessingReceive] = useState(false);
  // Setup form state (for opening a new session)
  const [setupVendorId, setSetupVendorId] = useState('');
  const [setupRequestedItems, setSetupRequestedItems] = useState([]);
  const [tempItemName, setTempItemName] = useState('');
  const [tempItemQty, setTempItemQty] = useState('');

  // Requisitions Drawer / Details Modal State
  const [selectedRequisition, setSelectedRequisition] = useState(null);
  const [requisitionItems, setRequisitionItems] = useState([]);
  const [loadingReqItems, setLoadingReqItems] = useState(false);

  // Search & Filter States
  // 1. Stock Lookup filters
  const [stockSearch, setStockSearch] = useState('');
  const [stockCategoryFilter, setStockCategoryFilter] = useState('All');
  const [stockDeptFilter, setStockDeptFilter] = useState('All');
  const [stockStatusFilter, setStockStatusFilter] = useState('All');

  // 2. Requisitions filters
  const [reqSearch, setReqSearch] = useState('');
  const [reqStatusFilter, setReqStatusFilter] = useState('All');
  const [reqUrgencyFilter, setReqUrgencyFilter] = useState('All');

  // 3. Incidents filters
  const [incSearch, setIncSearch] = useState('');
  const [incTypeFilter, setIncTypeFilter] = useState('All');

  // New Incident Form Modal State
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [submittingIncident, setSubmittingIncident] = useState(false);
  const [incidentFormData, setIncidentFormData] = useState({
    incidentType: 'Equipment',
    department: 'General Store',
    areaOfIncident: '',
    namesInvolved: '',
    pidNumber: '',
    description: '',
    contributingFactors: '',
    immediateActions: '',
    preventionMeasures: ''
  });

  // Outgoing Requisitions / Purchase Requests Form State
  const [departments, setDepartments] = useState([]);
  const [showCreateOutgoingModal, setShowCreateOutgoingModal] = useState(false);
  const [outgoingReqNotes, setOutgoingReqNotes] = useState('');
  const [outgoingReqUrgency, setOutgoingReqUrgency] = useState('Normal');
  const [outgoingReqItems, setOutgoingReqItems] = useState([]);
  const [tempOutgoingItemName, setTempOutgoingItemName] = useState('');
  const [tempOutgoingItemQty, setTempOutgoingItemQty] = useState('');
  const [submittingOutgoingReq, setSubmittingOutgoingReq] = useState(false);
  const [outgoingReqSearch, setOutgoingReqSearch] = useState('');

  // Fetch Data
  const loadData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);

      const [invRes, batchRes, reqRes, venRes, incRes, deptRes] = await Promise.allSettled([
        api.get('/clinical/inventory/master'),
        api.get('/clinical/inventory/batches'),
        api.get('/clinical/inventory/requisitions'),
        api.get('/clinical/inventory/vendors'),
        getIncidents(),
        api.get('/clinical/inventory/departments')
      ]);

      // 1. Requisitions
      if (reqRes.status === 'fulfilled' && reqRes.value.data.success) {
        setRequisitions(reqRes.value.data.data || []);
      } else {
        setRequisitions([]);
      }

      // 2. Stock Data
      if (invRes.status === 'fulfilled' && invRes.value.data.success) {
        const masterItems = invRes.value.data.data;
        const loadedStock = masterItems.map(item => ({
          id: item.batch_id ? `B-${item.batch_id}` : `M-${item.id}`,
          itemId: item.id,
          name: item.name,
          sku: item.sku || 'N/A',
          batchNumber: item.batch_number || 'N/A',
          expiryDate: item.expiry_date || 'N/A',
          department: item.department || 'General Store',
          quantity: item.quantity || 0,
          price: item.price || 0,
          vendor: item.vendor || 'N/A',
          category: item.category || 'medical_supplies'
        }));
        setStockInHand(loadedStock);
      } else {
        setStockInHand([]);
      }

      // 3. Vendors
      if (venRes.status === 'fulfilled' && venRes.value.data.success) {
        setVendors(venRes.value.data.data || []);
      } else {
        setVendors([]);
      }

      // 4. Incidents
      if (incRes.status === 'fulfilled' && incRes.value.data.success) {
        setIncidents(incRes.value.data.data || []);
      } else {
        setIncidents([]);
      }

      // 5. Departments
      if (deptRes.status === 'fulfilled' && deptRes.value.data.success) {
        setDepartments(deptRes.value.data.data || []);
      } else {
        setDepartments([]);
      }

    } catch (err) {
      console.error(err);
      toast.error('Failed to load dashboard data.');
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
    if (tab && ['overview', 'requisitions', 'stock', 'incidents', 'outgoing_requests'].includes(tab)) {
      setActiveTab(tab);
    } else if (!tab) {
      setActiveTab('overview');
    }
  }, [location.search]);

  useEffect(() => {
    if (activeTab === 'supplier-portal') {
      fetchSupplierPortalSettings();
      fetchSubmissions();
    }
  }, [activeTab]);

  // Requisition Action States
  const [processingAction, setProcessingAction] = useState(false);
  const [approvedQtys, setApprovedQtys] = useState({});

  // Fetch requisition items when one is selected
  useEffect(() => {
    if (!selectedRequisition) {
      setRequisitionItems([]);
      return;
    }

    const fetchReqItems = async () => {
      setLoadingReqItems(true);
      try {
        const res = await api.get(`/clinical/inventory/requisitions/${selectedRequisition.id}/items`);
        if (res.data.success) {
          setRequisitionItems(res.data.data || []);
        } else {
          toast.error('Failed to load requisition items');
        }
      } catch (err) {
        console.error(err);
        toast.error('Error fetching requisition items');
      } finally {
        setLoadingReqItems(false);
      }
    };

    fetchReqItems();
  }, [selectedRequisition]);

  // Sync approved quantities when items are fetched or changed
  useEffect(() => {
    if (requisitionItems && requisitionItems.length > 0) {
      const qtys = {};
      requisitionItems.forEach(item => {
        qtys[item.id] = item.requested_quantity !== undefined ? item.requested_quantity : (item.quantity || 0);
      });
      setApprovedQtys(qtys);
    } else {
      setApprovedQtys({});
    }
  }, [requisitionItems]);

  const handleApproveRequisition = async (reqId) => {
    setProcessingAction(true);
    try {
      const payload = {
        items: requisitionItems.map(item => ({
          id: item.id,
          approved_quantity: approvedQtys[item.id] !== undefined ? approvedQtys[item.id] : (item.requested_quantity || item.quantity || 0)
        }))
      };
      const res = await api.post(`/clinical/inventory/requisitions/${reqId}/approve`, payload);
      if (res.data.success) {
        toast.success('Requisition approved successfully!');
        setSelectedRequisition(null);
        // Refresh requisitions list
        const reqRes = await api.get('/clinical/inventory/requisitions');
        if (reqRes.data.success) {
          setRequisitions(reqRes.data.data || []);
        }
      } else {
        toast.error(res.data.message || 'Failed to approve requisition.');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error approving requisition.');
    } finally {
      setProcessingAction(false);
    }
  };

  const handleRejectRequisition = async (reqId) => {
    if (!window.confirm('Are you sure you want to reject this requisition?')) return;
    setProcessingAction(true);
    try {
      const res = await api.post(`/clinical/inventory/requisitions/${reqId}/reject`);
      if (res.data.success) {
        toast.success('Requisition rejected.');
        setSelectedRequisition(null);
        // Refresh requisitions list
        const reqRes = await api.get('/clinical/inventory/requisitions');
        if (reqRes.data.success) {
          setRequisitions(reqRes.data.data || []);
        }
      } else {
        toast.error(res.data.message || 'Failed to reject requisition.');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error rejecting requisition.');
    } finally {
      setProcessingAction(false);
    }
  };

  // Handle Sync
  const handleSync = async () => {
    setRefreshing(true);
    try {
      const res = await api.post('/clinical/inventory/sync');
      if (res.data.success) {
        toast.success(res.data.message || 'Inventory synchronized successfully!');
        await loadData(true);
      } else {
        toast.error(res.data.message || 'Sync failed.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Sync failed.');
    } finally {
      setRefreshing(false);
    }
  };

  // Outgoing Requisitions / Purchase Requests Handlers
  const handleAddOutgoingReqItem = () => {
    if (!tempOutgoingItemName.trim() || !tempOutgoingItemQty) {
      toast.error('Specify product name and quantity.');
      return;
    }
    const qty = parseInt(tempOutgoingItemQty, 10);
    if (isNaN(qty) || qty <= 0) {
      toast.error('Quantity must be greater than 0.');
      return;
    }

    // Match with master inventory (stockInHand list has master items)
    const matched = stockInHand.find(i => i.name.toLowerCase() === tempOutgoingItemName.toLowerCase());

    if (outgoingReqItems.some(i => i.item_name.toLowerCase() === tempOutgoingItemName.toLowerCase())) {
      toast.error('Item already added.');
      return;
    }

    setOutgoingReqItems([...outgoingReqItems, {
      item_name: tempOutgoingItemName.trim(),
      item_id: matched?.itemId || null,
      quantity: qty
    }]);

    setTempOutgoingItemName('');
    setTempOutgoingItemQty('');
  };

  const handleRemoveOutgoingReqItem = (idx) => {
    setOutgoingReqItems(outgoingReqItems.filter((_, i) => i !== idx));
  };

  const handleCreateOutgoingReqSubmit = async (e) => {
    e.preventDefault();
    if (outgoingReqItems.length === 0) {
      toast.error('Please add at least one item to request.');
      return;
    }

    setSubmittingOutgoingReq(true);
    try {
      const centralDept = departments.find(d => d.name.toLowerCase().includes('central') || d.name.toLowerCase().includes('store'));
      const deptId = centralDept?.id || 1;

      const invalidItem = outgoingReqItems.find(item => !item.item_id);
      if (invalidItem) {
        toast.error(`"${invalidItem.item_name}" is not registered in Master Inventory. Please register/select it first.`);
        setSubmittingOutgoingReq(false);
        return;
      }

      const res = await api.post('/clinical/inventory/requisitions', {
        department_id: deptId,
        urgency: outgoingReqUrgency,
        notes: outgoingReqNotes,
        items: outgoingReqItems.map(i => ({ item_id: i.item_id, quantity: i.quantity }))
      });

      if (res.data.success) {
        toast.success('Purchase request submitted to Procurement Manager successfully!');
        setShowCreateOutgoingModal(false);
        setOutgoingReqItems([]);
        setOutgoingReqNotes('');
        await loadData(true);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to submit purchase request.');
    } finally {
      setSubmittingOutgoingReq(false);
    }
  };

  // Incident Form Submission
  const handleIncidentSubmit = async (e) => {
    e.preventDefault();
    setSubmittingIncident(true);
    try {
      const res = await createIncident(incidentFormData);
      if (res.data.success) {
        toast.success('Incident reported successfully!');
        setShowIncidentModal(false);
        setIncidentFormData({
          incidentType: 'Equipment',
          department: 'General Store',
          areaOfIncident: '',
          namesInvolved: '',
          pidNumber: '',
          description: '',
          contributingFactors: '',
          immediateActions: '',
          preventionMeasures: ''
        });
        await loadData(true);
      } else {
        toast.error('Failed to report incident.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error submitting report.');
    } finally {
      setSubmittingIncident(false);
    }
  };

  const fetchSupplierPortalSettings = async () => {
    try {
      const res = await api.get('/clinical/inventory/supplier-portal/settings');
      if (res.data.success) {
        setPortalSessions(res.data.sessions || []);
      }
    } catch (err) {
      console.error('Error fetching portal settings:', err);
    }
  };

  const fetchSubmissions = async () => {
    setLoadingSubmissions(true);
    try {
      const res = await api.get('/clinical/inventory/supplier-portal/submissions');
      if (res.data.success) {
        setSubmissions(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching submissions:', err);
      toast.error('Failed to load supplier submissions.');
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const handleOpenPortal = async (e) => {
    e.preventDefault();
    if (!setupVendorId) {
      toast.error('Please select a vendor.');
      return;
    }
    if (setupRequestedItems.length === 0) {
      toast.error('Please add at least one requested item.');
      return;
    }

    try {
      const res = await api.post('/clinical/inventory/supplier-portal/toggle', {
        active: true,
        vendorId: setupVendorId,
        requestedItems: setupRequestedItems
      });
      if (res.data.success) {
        setPortalSessions(prev => [res.data.session, ...prev]);
        setSetupVendorId('');
        setSetupRequestedItems([]);
        toast.success(`Portal opened for ${res.data.session.vendorName}!`);
      }
    } catch (err) {
      console.error('Error opening supplier portal:', err);
      toast.error(err.response?.data?.message || 'Failed to open supplier portal.');
    }
  };

  const handleCloseSession = async (sessionId, vendorName) => {
    try {
      const res = await api.post('/clinical/inventory/supplier-portal/toggle', { active: false, sessionId });
      if (res.data.success) {
        setPortalSessions(prev => prev.filter(s => s.id !== sessionId));
        toast.success(`Portal for ${vendorName} closed and token revoked.`);
      }
    } catch (err) {
      console.error('Error closing supplier portal session:', err);
      toast.error('Failed to close portal session.');
    }
  };

  const handleAddRequestedItem = () => {
    if (!tempItemName.trim()) {
      toast.error('Item name is required.');
      return;
    }
    const qty = parseInt(tempItemQty, 10);
    if (isNaN(qty) || qty <= 0) {
      toast.error('Quantity must be greater than 0.');
      return;
    }

    // Try to find details in stockInHand
    const existing = stockInHand.find(i => i.name.toLowerCase() === tempItemName.toLowerCase());
    const newItem = {
      name: tempItemName.trim(),
      sku: existing?.sku || '',
      category: existing?.category || 'medications',
      unit_of_measure: existing?.unit_of_measure || 'Box',
      quantity: qty
    };

    setSetupRequestedItems([...setupRequestedItems, newItem]);
    setTempItemName('');
    setTempItemQty('');
  };

  const handleRemoveRequestedItem = (index) => {
    const updated = [...setupRequestedItems];
    updated.splice(index, 1);
    setSetupRequestedItems(updated);
  };

  const handleSelectSubmission = async (sub) => {
    setSelectedSubmission(sub);
    setLoadingSubItems(true);
    try {
      const res = await api.get(`/clinical/inventory/supplier-portal/submissions/${sub.id}/items`);
      if (res.data.success) {
        setSubmissionItems(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching submission items:', err);
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
        toast.success(res.data.message || 'Stock successfully merged into inventory!');
        setSelectedSubmission(null);
        await fetchSubmissions();
        await loadData(true);
      }
    } catch (err) {
      console.error('Error receiving stock:', err);
      toast.error(err.response?.data?.message || 'Failed to process stock intake.');
    } finally {
      setProcessingReceive(false);
    }
  };

  // Compute Metrics
  const metrics = useMemo(() => {
    let totalValue = 0;
    let lowStockCount = 0;
    let expiringCount = 0;
    let expiredCount = 0;
    let outOfStockCount = 0;
    
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    stockInHand.forEach(item => {
      const itemValue = item.quantity * item.price;
      totalValue += itemValue;

      // Out of Stock
      if (item.quantity === 0) {
        outOfStockCount++;
      } else if (item.quantity < 20) {
        // Low Stock
        lowStockCount++;
      }

      // Expiry calculation: e.g. "11/2026" or "2026-11-20"
      if (item.expiryDate && item.expiryDate !== 'N/A') {
        try {
          let expYear = 0;
          let expMonth = 0;
          if (item.expiryDate.includes('/')) {
            const [m, y] = item.expiryDate.split('/');
            expMonth = parseInt(m, 10);
            expYear = parseInt(y, 10);
          } else {
            const expDateObj = new Date(item.expiryDate);
            if (!isNaN(expDateObj.getTime())) {
              expYear = expDateObj.getFullYear();
              expMonth = expDateObj.getMonth() + 1;
            }
          }

          if (expYear > 0) {
            const diffMonths = (expYear - currentYear) * 12 + (expMonth - currentMonth);
            if (diffMonths < 0) {
              expiredCount++;
            } else if (diffMonths <= 6) {
              expiringCount++;
            }
          }
        } catch (e) {
          console.warn('Failed parsing expiry for item', item.name, item.expiryDate);
        }
      }
    });

    const pendingRequisitions = requisitions.filter(r => r.status === 'Pending' && !r.department_name.toLowerCase().includes('central') && !r.department_name.toLowerCase().includes('store'));

    return {
      totalValue,
      lowStockCount,
      expiringCount,
      expiredCount,
      outOfStockCount,
      pendingRequisitions,
      vendorCount: vendors.length,
      incidentCount: incidents.length
    };
  }, [stockInHand, requisitions, vendors, incidents]);

  // Chart Data: Stock Value by Department
  const departmentValuations = useMemo(() => {
    const map = {};
    stockInHand.forEach(item => {
      const val = item.quantity * item.price;
      if (val > 0) {
        const dept = item.department || 'General Store';
        map[dept] = (map[dept] || 0) + val;
      }
    });
    const total = Object.values(map).reduce((a, b) => a + b, 0);
    return Object.entries(map).map(([name, value]) => ({
      name,
      value,
      percentage: total > 0 ? (value / total) * 100 : 0
    })).sort((a, b) => b.value - a.value);
  }, [stockInHand]);

  // Donut segment calculations
  const donutData = useMemo(() => {
    let accumulatedPercent = 0;
    return departmentValuations.map((dept) => {
      const startPercent = accumulatedPercent;
      accumulatedPercent += dept.percentage;
      return {
        ...dept,
        startPercent,
        endPercent: accumulatedPercent,
        dashArray: `${(dept.percentage * 1.8849).toFixed(2)} ${(188.49 - (dept.percentage * 1.8849)).toFixed(2)}`,
        dashOffset: `-${(startPercent * 1.8849).toFixed(2)}`
      };
    });
  }, [departmentValuations]);

  const getDeptColor = (deptName) => {
    const lower = deptName.toLowerCase();
    if (lower.includes('central')) return '#4f46e5'; // Indigo
    if (lower.includes('nurs')) return '#10b981'; // Emerald
    if (lower.includes('lab')) return '#06b6d4'; // Cyan
    if (lower.includes('imag')) return '#3378AA'; // Violet
    if (lower.includes('dent')) return '#f59e0b'; // Amber
    if (lower.includes('admin')) return '#e11d48'; // Rose
    return '#64748b'; // Slate
  };

  // Filtered Stock Lookup Lists
  const filteredStock = useMemo(() => {
    return stockInHand.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(stockSearch.toLowerCase()) || 
                            item.sku.toLowerCase().includes(stockSearch.toLowerCase()) ||
                            item.batchNumber.toLowerCase().includes(stockSearch.toLowerCase());
      
      const matchesCategory = stockCategoryFilter === 'All' || item.category === stockCategoryFilter;
      const matchesDept = stockDeptFilter === 'All' || item.department === stockDeptFilter;
      
      let matchesStatus = true;
      if (stockStatusFilter === 'Low Stock') {
        matchesStatus = item.quantity > 0 && item.quantity < 20;
      } else if (stockStatusFilter === 'Out of Stock') {
        matchesStatus = item.quantity === 0;
      } else if (stockStatusFilter === 'Expired') {
        if (item.expiryDate && item.expiryDate !== 'N/A') {
          const parts = item.expiryDate.split('/');
          if (parts.length === 2) {
            const expMonth = parseInt(parts[0], 10);
            const expYear = parseInt(parts[1], 10);
            const now = new Date();
            matchesStatus = (expYear < now.getFullYear()) || (expYear === now.getFullYear() && expMonth < now.getMonth() + 1);
          } else {
            const d = new Date(item.expiryDate);
            matchesStatus = !isNaN(d.getTime()) && d < new Date();
          }
        } else {
          matchesStatus = false;
        }
      } else if (stockStatusFilter === 'Expiring Soon') {
        if (item.expiryDate && item.expiryDate !== 'N/A') {
          try {
            let expYear = 0, expMonth = 0;
            if (item.expiryDate.includes('/')) {
              const [m, y] = item.expiryDate.split('/');
              expMonth = parseInt(m, 10);
              expYear = parseInt(y, 10);
            } else {
              const d = new Date(item.expiryDate);
              if (!isNaN(d.getTime())) {
                expYear = d.getFullYear();
                expMonth = d.getMonth() + 1;
              }
            }
            if (expYear > 0) {
              const now = new Date();
              const diff = (expYear - now.getFullYear()) * 12 + (expMonth - (now.getMonth() + 1));
              matchesStatus = diff >= 0 && diff <= 6;
            } else matchesStatus = false;
          } catch (e) { matchesStatus = false; }
        } else matchesStatus = false;
      }

      return matchesSearch && matchesCategory && matchesDept && matchesStatus;
    });
  }, [stockInHand, stockSearch, stockCategoryFilter, stockDeptFilter, stockStatusFilter]);

  // Unique departments & categories for dropdown lists
  const stockDeptsList = useMemo(() => {
    return ['All', ...new Set(stockInHand.map(i => i.department).filter(Boolean))];
  }, [stockInHand]);

  const stockCategoriesList = useMemo(() => {
    return ['All', ...new Set(stockInHand.map(i => i.category).filter(Boolean))];
  }, [stockInHand]);

  // Filtered Requisitions List (Incoming to Central Store)
  const filteredRequisitions = useMemo(() => {
    return requisitions.filter(req => {
      const isCentral = req.department_name.toLowerCase().includes('central') || 
                        req.department_name.toLowerCase().includes('store');
      if (isCentral) return false;

      const matchesSearch = req.department_name.toLowerCase().includes(reqSearch.toLowerCase()) || 
                            req.id.toString().includes(reqSearch);
      const matchesStatus = reqStatusFilter === 'All' || req.status === reqStatusFilter;
      const matchesUrgency = reqUrgencyFilter === 'All' || req.urgency === reqUrgencyFilter;

      return matchesSearch && matchesStatus && matchesUrgency;
    });
  }, [requisitions, reqSearch, reqStatusFilter, reqUrgencyFilter]);

  // Filtered Outgoing Requisitions (Purchase Requests from Central Store)
  const filteredOutgoingRequisitions = useMemo(() => {
    return requisitions.filter(req => {
      const isCentral = req.department_name.toLowerCase().includes('central') || 
                        req.department_name.toLowerCase().includes('store');
      if (!isCentral) return false;

      const matchesSearch = (req.notes || '').toLowerCase().includes(outgoingReqSearch.toLowerCase()) || 
                            req.id.toString().includes(outgoingReqSearch);
      const matchesStatus = reqStatusFilter === 'All' || req.status === reqStatusFilter;
      const matchesUrgency = reqUrgencyFilter === 'All' || req.urgency === reqUrgencyFilter;

      return matchesSearch && matchesStatus && matchesUrgency;
    });
  }, [requisitions, outgoingReqSearch, reqStatusFilter, reqUrgencyFilter]);

  // Filtered Incidents List
  const filteredIncidents = useMemo(() => {
    return incidents.filter(inc => {
      const matchesSearch = inc.description?.toLowerCase().includes(incSearch.toLowerCase()) || 
                            inc.department?.toLowerCase().includes(incSearch.toLowerCase()) ||
                            inc.area_of_incident?.toLowerCase().includes(incSearch.toLowerCase()) ||
                            inc.names_involved?.toLowerCase().includes(incSearch.toLowerCase());
      const matchesType = incTypeFilter === 'All' || inc.incident_type === incTypeFilter;

      return matchesSearch && matchesType;
    });
  }, [incidents, incSearch, incTypeFilter]);

  // Framer Motion Animation Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { y: 15, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 350, damping: 25 } }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-6 md:p-10 font-sans relative overflow-hidden">
      {/* Soft ambient background circles */}
      <div className="absolute top-0 right-0 -mr-48 -mt-48 w-[700px] h-[700px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 -ml-48 -mb-48 w-[700px] h-[700px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/3 -mt-48 w-[500px] h-[500px] bg-violet-500/5 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-6 border-b border-slate-200 pb-6"
        >
          <div>
            <div className="flex items-center gap-3">
              <span className="p-2.5 bg-indigo-50 text-indigo-600 border border-indigo-150 rounded-2xl shadow-sm animate-pulse">
                <Package size={28} />
              </span>
              <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
                  Stock Operations Portal
                </h1>
                <p className="text-sm text-slate-500 mt-0.5 font-medium">
                  Real-time manager dashboard • Signed in as <span className="text-indigo-600 font-bold">{user?.fullName || 'Stock Manager'}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <button 
              onClick={handleSync} 
              disabled={refreshing}
              className="flex-1 lg:flex-none bg-white border border-slate-200 text-slate-700 hover:text-indigo-650 hover:border-indigo-300 px-4 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              <RefreshCw size={16} className={`${refreshing ? 'animate-spin text-indigo-600' : ''}`} />
              Sync Data
            </button>
            <button 
              onClick={() => setShowIncidentModal(true)}
              className="flex-1 lg:flex-none bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-600 hover:text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              <AlertTriangle size={16} />
              Report Incident
            </button>
            <button 
              onClick={() => navigate('/master')} 
              className="flex-1 lg:flex-none bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <Settings size={16} /> Item Master
            </button>
            <button 
              onClick={() => navigate('/central-store')} 
              className="flex-1 lg:flex-none bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-md shadow-indigo-100 cursor-pointer"
            >
              Store Hub <ArrowRight size={16} />
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
            { id: 'requisitions', label: `Requisitions (${metrics.pendingRequisitions.length})`, icon: <ArrowRightLeft size={16} /> },
            { id: 'stock', label: 'Stock Lookup', icon: <Database size={16} /> },
            { id: 'outgoing_requests', label: 'Purchase Requests', icon: <ClipboardList size={16} /> },
            { id: 'incidents', label: `Incidents (${metrics.incidentCount})`, icon: <FileWarning size={16} /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 font-bold text-sm transition-all border-b-2 whitespace-nowrap cursor-pointer ${
                activeTab === tab.id 
                  ? 'border-indigo-600 text-indigo-600 bg-indigo-50/40' 
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
            <Loader2 className="h-12 w-12 animate-spin text-indigo-650" />
            <p className="text-slate-500 font-semibold animate-pulse">Fetching store catalogs...</p>
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
              
              {/* Tab 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-8">
                  
                  {/* KPI Cards Grid */}
                  <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
                    
                    <motion.div variants={itemVariants} className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5 relative overflow-hidden group hover:border-indigo-350 hover:shadow-md transition-all duration-300">
                      <div className="absolute -right-4 -top-4 w-20 h-20 bg-indigo-50 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Value</p>
                          <h3 className="text-2xl font-black text-slate-800 mt-1.5">{metrics.totalValue.toLocaleString()}</h3>
                          <p className="text-[10px] text-indigo-600 font-bold mt-1 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded inline-block">RWF Valuation</p>
                        </div>
                        <div className="p-3 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-xl"><TrendingUp size={18} /></div>
                      </div>
                    </motion.div>

                    <motion.div variants={itemVariants} className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5 relative overflow-hidden group hover:border-amber-350 hover:shadow-md transition-all duration-300">
                      <div className="absolute -right-4 -top-4 w-20 h-20 bg-amber-50 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Reqs</p>
                          <h3 className="text-2xl font-black text-slate-800 mt-1.5">{metrics.pendingRequisitions.length}</h3>
                          <span className={`text-[10px] font-bold mt-1 px-2 py-0.5 rounded inline-block ${metrics.pendingRequisitions.length > 0 ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-slate-50 text-slate-500 border border-slate-100'}`}>
                            {metrics.pendingRequisitions.length > 0 ? 'Action Needed' : 'Completed'}
                          </span>
                        </div>
                        <div className="p-3 bg-amber-50 text-amber-600 border border-amber-100 rounded-xl"><ArrowRightLeft size={18} /></div>
                      </div>
                    </motion.div>

                    <motion.div variants={itemVariants} className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5 relative overflow-hidden group hover:border-rose-350 hover:shadow-md transition-all duration-300">
                      <div className="absolute -right-4 -top-4 w-20 h-20 bg-rose-50 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Low Stock</p>
                          <h3 className="text-2xl font-black text-slate-800 mt-1.5">{metrics.lowStockCount}</h3>
                          <p className="text-[10px] text-rose-600 font-bold mt-1 uppercase tracking-widest bg-rose-50 px-2 py-0.5 rounded inline-block">Items &lt; 20 Qty</p>
                        </div>
                        <div className="p-3 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl"><FileWarning size={18} /></div>
                      </div>
                    </motion.div>

                    <motion.div variants={itemVariants} className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5 relative overflow-hidden group hover:border-violet-350 hover:shadow-md transition-all duration-300">
                      <div className="absolute -right-4 -top-4 w-20 h-20 bg-violet-50 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Expiring / Expired</p>
                          <h3 className="text-2xl font-black text-slate-800 mt-1.5">{metrics.expiringCount + metrics.expiredCount}</h3>
                          <span className={`text-[10px] font-bold mt-1 px-2 py-0.5 rounded inline-block ${metrics.expiredCount > 0 ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-violet-50 text-violet-600 border border-violet-100'}`}>
                            {metrics.expiredCount} expired • {metrics.expiringCount} soon
                          </span>
                        </div>
                        <div className="p-3 bg-violet-50 text-violet-600 border border-violet-100 rounded-xl"><Calendar size={18} /></div>
                      </div>
                    </motion.div>

                    <motion.div variants={itemVariants} className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5 relative overflow-hidden group hover:border-emerald-350 hover:shadow-md transition-all duration-300">
                      <div className="absolute -right-4 -top-4 w-20 h-20 bg-emerald-50 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Incident Reports</p>
                          <h3 className="text-2xl font-black text-slate-800 mt-1.5">{metrics.incidentCount}</h3>
                          <p className="text-[10px] text-emerald-600 font-bold mt-1 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded inline-block">Registered logs</p>
                        </div>
                        <div className="p-3 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl"><ClipboardList size={18} /></div>
                      </div>
                    </motion.div>

                  </motion.div>

                  {/* SVG Charts Section */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    
                    {/* SVG Chart 1: Donut Chart for Valuation by Department */}
                    <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-6 flex flex-col h-[380px]">
                      <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2.5">
                        <Sparkles className="text-indigo-650" size={18} />
                        Valuation Distribution by Department
                      </h3>
                      {departmentValuations.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                          <Building size={48} className="opacity-20 mb-3" />
                          <p className="font-bold">No active stock valuation</p>
                        </div>
                      ) : (
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                          {/* SVG Donut */}
                          <div className="flex justify-center relative">
                            <svg className="w-48 h-48 drop-shadow-md" viewBox="0 0 100 100">
                              {donutData.map((dept, idx) => (
                                <motion.circle 
                                  key={idx}
                                  cx="50" 
                                  cy="50" 
                                  r="30" 
                                  fill="transparent" 
                                  stroke={getDeptColor(dept.name)}
                                  strokeWidth="10"
                                  strokeDasharray={dept.dashArray}
                                  strokeDashoffset={dept.dashOffset}
                                  transform="rotate(-90 50 50)"
                                  initial={{ pathLength: 0 }}
                                  animate={{ pathLength: 1 }}
                                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                                  whileHover={{ strokeWidth: 12 }}
                                  className="transition-all cursor-pointer"
                                />
                              ))}
                              {/* Inner center text */}
                              <circle cx="50" cy="50" r="22" fill="#ffffff" />
                              <text x="50" y="47" textAnchor="middle" fill="#64748b" fontSize="6" fontWeight="bold">TOTAL</text>
                              <text x="50" y="56" textAnchor="middle" fill="#0f172a" fontSize="9" fontWeight="black">
                                {metrics.totalValue >= 1000000 
                                  ? `${(metrics.totalValue / 1000000).toFixed(1)}M` 
                                  : `${Math.round(metrics.totalValue / 1000)}k`}
                              </text>
                            </svg>
                          </div>
                          {/* Legend list */}
                          <div className="space-y-3 overflow-y-auto max-h-64 pr-2 custom-scrollbar">
                            {departmentValuations.map((dept, idx) => (
                              <div key={idx} className="flex justify-between items-center bg-slate-50 border border-slate-100 p-2.5 rounded-xl shadow-xs">
                                <div className="flex items-center gap-2.5">
                                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: getDeptColor(dept.name) }}></span>
                                  <span className="text-xs font-bold text-slate-700 truncate max-w-[120px]">{dept.name}</span>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs font-black text-slate-800">{dept.value.toLocaleString()} RWF</p>
                                  <p className="text-[10px] text-slate-400 font-bold">{dept.percentage.toFixed(1)}%</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* SVG Chart 2: Stacked Progress & Health Status */}
                    <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-6 flex flex-col h-[380px]">
                      <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2.5">
                        <Activity className="text-emerald-600" size={18} />
                        Inventory Batch Health Breakdown
                      </h3>
                      {stockInHand.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                          <Database size={48} className="opacity-20 mb-3" />
                          <p className="font-bold">No active inventory items</p>
                        </div>
                      ) : (
                        <div className="flex-1 flex flex-col justify-around">
                          <div>
                            <div className="flex justify-between text-xs font-bold text-slate-400 mb-2">
                              <span>Health Level Distribution</span>
                              <span className="text-slate-600 font-semibold">{stockInHand.length} Distinct Batches</span>
                            </div>
                            
                            {/* Horizontal multi-color stacked bar */}
                            <div className="w-full h-8 bg-slate-100 rounded-2xl overflow-hidden flex border border-slate-200 shadow-inner">
                              {[
                                { 
                                  label: 'Normal', 
                                  count: stockInHand.length - metrics.lowStockCount - metrics.outOfStockCount - metrics.expiredCount,
                                  color: 'bg-emerald-500'
                                },
                                { 
                                  label: 'Low Stock', 
                                  count: metrics.lowStockCount, 
                                  color: 'bg-amber-500'
                                },
                                { 
                                  label: 'Expired', 
                                  count: metrics.expiredCount, 
                                  color: 'bg-red-500'
                                },
                                { 
                                  label: 'Out of Stock', 
                                  count: metrics.outOfStockCount, 
                                  color: 'bg-slate-400'
                                }
                              ].map((sec, idx) => {
                                const percent = stockInHand.length > 0 ? (sec.count / stockInHand.length) * 100 : 0;
                                if (percent === 0) return null;
                                return (
                                  <motion.div 
                                    key={idx}
                                    style={{ width: `${percent}%` }}
                                    className={`${sec.color} h-full relative group cursor-pointer transition-all duration-300 hover:brightness-105`}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${percent}%` }}
                                    transition={{ duration: 0.6, ease: 'easeOut' }}
                                  />
                                );
                              })}
                            </div>
                          </div>

                          {/* Legend / Metrics breakdowns */}
                          <div className="grid grid-cols-2 gap-4">
                            {[
                              { label: 'Normal Batches', count: stockInHand.length - metrics.lowStockCount - metrics.outOfStockCount - metrics.expiredCount, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
                              { label: 'Low Stock Warnings', count: metrics.lowStockCount, color: 'text-amber-600 bg-amber-50 border-amber-100' },
                              { label: 'Expired Inventory', count: metrics.expiredCount, color: 'text-red-600 bg-rose-50 border-rose-100' },
                              { label: 'Out of Stock', count: metrics.outOfStockCount, color: 'text-slate-655 bg-slate-50 border-slate-150' }
                            ].map((sec, idx) => (
                              <div key={idx} className={`flex items-center justify-between px-4 py-3 rounded-2xl border ${sec.color} shadow-xs`}>
                                <span className="text-xs font-bold">{sec.label}</span>
                                <span className="text-lg font-black">{sec.count}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                  </div>

                  {/* Dual Feeds section */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    
                    {/* Left: Recent Pending Requisitions */}
                    <div className="bg-white border border-slate-200 shadow-sm rounded-[2rem] flex flex-col h-[400px] overflow-hidden">
                      <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                        <div className="flex items-center gap-3">
                          <span className="p-2 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-xl"><ArrowRightLeft size={16} /></span>
                          <h4 className="font-bold text-slate-800">Pending Requisitions</h4>
                        </div>
                        <button 
                          onClick={() => setActiveTab('requisitions')}
                          className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg border border-indigo-100 cursor-pointer transition-all"
                        >
                          Show All
                        </button>
                      </div>
                      <div className="p-5 overflow-y-auto flex-1 custom-scrollbar space-y-3">
                        {metrics.pendingRequisitions.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-full text-slate-400">
                            <CheckCircle size={40} className="opacity-20 mb-2" />
                            <p className="font-bold text-sm">All caught up!</p>
                            <p className="text-xs">No pending approvals.</p>
                          </div>
                        ) : (
                          metrics.pendingRequisitions.slice(0, 5).map(req => (
                            <div 
                              key={req.id}
                              onClick={() => setSelectedRequisition(req)}
                              className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-indigo-300 hover:bg-indigo-50/20 transition-all cursor-pointer group shadow-xs"
                            >
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-sm border border-indigo-100 uppercase">
                                  {req.department_name.substring(0, 2)}
                                </div>
                                <div>
                                  <h5 className="font-bold text-slate-800 text-sm group-hover:text-indigo-650 transition-colors">{req.department_name}</h5>
                                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                                    Requested: {new Date(req.created_at).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${req.urgency === 'Critical' ? 'bg-red-50 text-red-655 border border-red-100' : (req.urgency === 'High' ? 'bg-amber-50 text-amber-655 border border-amber-100' : 'bg-slate-100 text-slate-500 border border-slate-200')}`}>
                                  {req.urgency}
                                </span>
                                <p className="text-xs font-bold text-slate-500 mt-1.5">{req.items_count} Items</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Right: Critical Alerts (Low Stock / Expiring) */}
                    <div className="bg-white border border-slate-200 shadow-sm rounded-[2rem] flex flex-col h-[400px] overflow-hidden">
                      <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                        <div className="flex items-center gap-3">
                          <span className="p-2 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl"><AlertCircle size={16} /></span>
                          <h4 className="font-bold text-slate-800">Critical Alerts</h4>
                        </div>
                        <button 
                          onClick={() => {
                            setStockStatusFilter('Low Stock');
                            setActiveTab('stock');
                          }}
                          className="text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg border border-rose-100 cursor-pointer transition-all"
                        >
                          Check Ledger
                        </button>
                      </div>
                      <div className="p-5 overflow-y-auto flex-1 custom-scrollbar space-y-3">
                        {stockInHand.filter(i => (i.quantity > 0 && i.quantity < 20) || (i.expiryDate && i.expiryDate.includes(new Date().getFullYear().toString()))).length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-full text-slate-400">
                            <CheckCircle size={40} className="opacity-20 mb-2" />
                            <p className="font-bold text-sm">Store is safe</p>
                            <p className="text-xs">No alerts active.</p>
                          </div>
                        ) : (
                          stockInHand
                            .filter(i => (i.quantity > 0 && i.quantity < 20) || (i.expiryDate && i.expiryDate.includes(new Date().getFullYear().toString())))
                            .slice(0, 6)
                            .map((item, idx) => {
                              const isExpiring = item.expiryDate && item.expiryDate.includes(new Date().getFullYear().toString());
                              return (
                                <div 
                                  key={idx}
                                  className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-100 shadow-xs"
                                >
                                  <div>
                                    <h5 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                      {item.name}
                                      {isExpiring && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>}
                                    </h5>
                                    <div className="flex gap-3 text-[10px] text-slate-400 font-mono mt-1">
                                      <span>BATCH: {item.batchNumber}</span>
                                      <span>DEPT: {item.department}</span>
                                    </div>
                                  </div>
                                  <div>
                                    {isExpiring ? (
                                      <span className="text-[9px] font-black uppercase tracking-wider text-rose-600 bg-rose-50 border border-rose-100 px-2.5 py-1 rounded-md">
                                        Exp: {item.expiryDate}
                                      </span>
                                    ) : (
                                      <span className="text-[9px] font-black uppercase tracking-wider text-amber-600 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-md">
                                        Qty: {item.quantity}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                        )}
                      </div>
                    </div>

                  </div>

                </div>
              )}

              {/* Tab 2: REQUISITIONS */}
              {activeTab === 'requisitions' && (
                <div className="space-y-6">
                  
                  {/* Search and Filters bar */}
                  <div className="bg-white border border-slate-200 p-5 rounded-2xl flex flex-wrap gap-4 items-center justify-between shadow-xs">
                    <div className="flex-1 min-w-[280px] relative">
                      <Search size={18} className="absolute left-4 top-3.5 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="Search requisition ID or department..." 
                        value={reqSearch}
                        onChange={(e) => setReqSearch(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 pl-11 pr-4 py-3 rounded-xl text-sm text-slate-800 outline-none focus:border-indigo-300 focus:bg-white transition-all"
                      />
                    </div>
                    
                    <div className="flex gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Filter size={14} className="text-slate-400" />
                        <select 
                          value={reqStatusFilter}
                          onChange={(e) => setReqStatusFilter(e.target.value)}
                          className="bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-xs text-slate-700 font-bold outline-none cursor-pointer hover:bg-slate-50 transition-all shadow-xs"
                        >
                          <option value="All">All Statuses</option>
                          <option value="Pending">Pending</option>
                          <option value="Approved">Approved</option>
                          <option value="Rejected">Rejected</option>
                        </select>
                      </div>

                      <select 
                        value={reqUrgencyFilter}
                        onChange={(e) => setReqUrgencyFilter(e.target.value)}
                        className="bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-xs text-slate-700 font-bold outline-none cursor-pointer hover:bg-slate-50 transition-all shadow-xs"
                      >
                        <option value="All">All Urgency</option>
                        <option value="Normal">Normal</option>
                        <option value="High">High</option>
                        <option value="Critical">Critical</option>
                      </select>
                    </div>
                  </div>

                  {/* Requisitions List */}
                  <div className="bg-white border border-slate-200 shadow-sm rounded-3xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-500 font-bold text-xs uppercase tracking-wider">
                            <th className="py-4 px-6">ID</th>
                            <th className="py-4 px-6">Department</th>
                            <th className="py-4 px-6">Urgency</th>
                            <th className="py-4 px-6">Status</th>
                            <th className="py-4 px-6">Date Requested</th>
                            <th className="py-4 px-6">Items Count</th>
                            <th className="py-4 px-6 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                          {filteredRequisitions.length === 0 ? (
                            <tr>
                              <td colSpan="7" className="text-center py-10 text-slate-400 font-bold">
                                No matching requisitions found.
                              </td>
                            </tr>
                          ) : (
                            filteredRequisitions.map(req => (
                              <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="py-4 px-6 font-mono font-bold text-slate-500">#{req.id}</td>
                                <td className="py-4 px-6 font-semibold text-slate-800">{req.department_name}</td>
                                <td className="py-4 px-6">
                                  <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md ${
                                    req.urgency === 'Critical' ? 'bg-red-50 text-red-600 border border-red-100' : 
                                    req.urgency === 'High' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 
                                    'bg-slate-100 text-slate-550 border border-slate-200'
                                  }`}>
                                    {req.urgency}
                                  </span>
                                </td>
                                <td className="py-4 px-6">
                                  <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${
                                    req.status === 'Pending' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                    req.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                    'bg-slate-100 text-slate-500 border border-slate-200'
                                  }`}>
                                    {req.status}
                                  </span>
                                </td>
                                <td className="py-4 px-6 text-slate-450">{new Date(req.created_at).toLocaleString()}</td>
                                <td className="py-4 px-6 text-slate-700 font-bold">{req.items_count} items</td>
                                <td className="py-4 px-6 text-center">
                                  <button 
                                    onClick={() => setSelectedRequisition(req)}
                                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 mx-auto cursor-pointer shadow-sm hover:shadow"
                                  >
                                    <Eye size={12} />
                                    View Details
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              )}

              {/* Tab 3: STOCK LOOKUP */}
              {activeTab === 'stock' && (
                <div className="space-y-6">
                  
                  {/* Search and Filters Bar */}
                  <div className="bg-white border border-slate-200 p-5 rounded-2xl flex flex-wrap gap-4 items-center justify-between shadow-xs">
                    <div className="flex-1 min-w-[280px] relative">
                      <Search size={18} className="absolute left-4 top-3.5 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="Search by SKU, item name, batch code..." 
                        value={stockSearch}
                        onChange={(e) => setStockSearch(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 pl-11 pr-4 py-3 rounded-xl text-sm text-slate-800 outline-none focus:border-indigo-300 focus:bg-white transition-all"
                      />
                    </div>

                    <div className="flex gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Building size={14} className="text-slate-400" />
                        <select 
                          value={stockDeptFilter}
                          onChange={(e) => setStockDeptFilter(e.target.value)}
                          className="bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-xs text-slate-700 font-bold outline-none cursor-pointer hover:bg-slate-50 transition-all shadow-xs"
                        >
                          <option value="All">All Departments</option>
                          {stockDeptsList.filter(d => d !== 'All').map((d, i) => (
                            <option key={i} value={d}>{d}</option>
                          ))}
                        </select>
                      </div>

                      <select 
                        value={stockCategoryFilter}
                        onChange={(e) => setStockCategoryFilter(e.target.value)}
                        className="bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-xs text-slate-700 font-bold outline-none cursor-pointer hover:bg-slate-50 transition-all shadow-xs"
                      >
                        <option value="All">All Categories</option>
                        {stockCategoriesList.filter(c => c !== 'All').map((c, i) => (
                          <option key={i} value={c}>{c.replace('_', ' ')}</option>
                        ))}
                      </select>

                      <select 
                        value={stockStatusFilter}
                        onChange={(e) => setStockStatusFilter(e.target.value)}
                        className="bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-xs text-slate-700 font-bold outline-none cursor-pointer hover:bg-slate-50 transition-all shadow-xs"
                      >
                        <option value="All">All Statuses</option>
                        <option value="Normal">Normal</option>
                        <option value="Low Stock">Low Stock (&lt; 20)</option>
                        <option value="Expiring Soon">Expiring (&lt; 6 months)</option>
                        <option value="Expired">Expired</option>
                        <option value="Out of Stock">Out of Stock (0)</option>
                      </select>
                    </div>
                  </div>

                  {/* Stock table */}
                  <div className="bg-white border border-slate-200 shadow-sm rounded-3xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-500 font-bold text-xs uppercase tracking-wider">
                            <th className="py-4 px-6">SKU</th>
                            <th className="py-4 px-6">Item Name</th>
                            <th className="py-4 px-6">Batch Code</th>
                            <th className="py-4 px-6">Vendor</th>
                            <th className="py-4 px-6">Department</th>
                            <th className="py-4 px-6">Expiry</th>
                            <th className="py-4 px-6 text-right">Quantity</th>
                            <th className="py-4 px-6 text-right">Unit Price</th>
                            <th className="py-4 px-6 text-right">Total Value</th>
                            <th className="py-4 px-6 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                          {filteredStock.length === 0 ? (
                            <tr>
                              <td colSpan="10" className="text-center py-10 text-slate-400 font-bold">
                                No matching inventory records found.
                              </td>
                            </tr>
                          ) : (
                            filteredStock.map((item, index) => {
                              const isLow = item.quantity > 0 && item.quantity < 20;
                              const isOut = item.quantity === 0;
                              
                              // Check if expired
                              let isExpired = false;
                              if (item.expiryDate && item.expiryDate !== 'N/A') {
                                const parts = item.expiryDate.split('/');
                                if (parts.length === 2) {
                                  const expMonth = parseInt(parts[0], 10);
                                  const expYear = parseInt(parts[1], 10);
                                  const now = new Date();
                                  isExpired = (expYear < now.getFullYear()) || (expYear === now.getFullYear() && expMonth < now.getMonth() + 1);
                                } else {
                                  const d = new Date(item.expiryDate);
                                  isExpired = !isNaN(d.getTime()) && d < new Date();
                                }
                              }

                              const totalVal = item.quantity * item.price;

                              return (
                                <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="py-4 px-6 font-mono font-bold text-slate-450">{item.sku}</td>
                                  <td className="py-4 px-6 font-semibold text-slate-800">{item.name}</td>
                                  <td className="py-4 px-6 font-mono text-slate-600">{item.batchNumber}</td>
                                  <td className="py-4 px-6 text-slate-650">{item.vendor}</td>
                                  <td className="py-4 px-6 text-slate-500">{item.department}</td>
                                  <td className="py-4 px-6">
                                    <span className={isExpired ? 'text-red-600 font-bold' : 'text-slate-600'}>{item.expiryDate}</span>
                                  </td>
                                  <td className="py-4 px-6 text-right font-black text-slate-800">{item.quantity}</td>
                                  <td className="py-4 px-6 text-right text-slate-600">{item.price.toLocaleString()} RWF</td>
                                  <td className="py-4 px-6 text-right font-black text-indigo-650">{totalVal.toLocaleString()} RWF</td>
                                  <td className="py-4 px-6 text-center">
                                    <span className={`w-3.5 h-3.5 rounded-full inline-block border ${
                                      isExpired ? 'bg-red-500 border-red-650 shadow-sm shadow-red-500/10' :
                                      isOut ? 'bg-slate-400 border-slate-500' :
                                      isLow ? 'bg-amber-500 border-amber-650 shadow-sm shadow-amber-500/10' :
                                      'bg-emerald-500 border-emerald-650 shadow-sm shadow-emerald-500/10'
                                    }`} title={isExpired ? 'Expired' : (isOut ? 'Out of Stock' : (isLow ? 'Low Stock' : 'Healthy'))}></span>
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

              {/* Tab 4: INCIDENT REPORTS */}
              {activeTab === 'incidents' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    
                    {/* Left Pane: Incident Lists (7 columns) */}
                    <div className="lg:col-span-7 space-y-4">
                      <div className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-wrap gap-3 items-center justify-between shadow-xs">
                        <div className="flex-1 min-w-[200px] relative">
                          <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
                          <input 
                            type="text" 
                            placeholder="Search incidents..." 
                            value={incSearch}
                            onChange={(e) => setIncSearch(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 pl-10 pr-3 py-2 rounded-xl text-xs text-slate-800 outline-none focus:border-indigo-300 focus:bg-white transition-all"
                          />
                        </div>
                        
                        <select 
                          value={incTypeFilter}
                          onChange={(e) => setIncTypeFilter(e.target.value)}
                          className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs text-slate-700 font-bold outline-none cursor-pointer hover:bg-slate-50 transition-all shadow-xs"
                        >
                          <option value="All">All Types</option>
                          <option value="Patient">Patient</option>
                          <option value="Staff">Staff</option>
                          <option value="Equipment">Equipment</option>
                          <option value="Others">Others</option>
                        </select>
                      </div>

                      <div className="space-y-4 overflow-y-auto max-h-[600px] pr-2 custom-scrollbar">
                        {filteredIncidents.length === 0 ? (
                          <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-slate-400 shadow-xs">
                            <FileText size={48} className="opacity-20 mx-auto mb-3" />
                            <p className="font-bold">No incidents reported yet</p>
                            <p className="text-xs mt-1">Submit storage anomalies using the report form.</p>
                          </div>
                        ) : (
                          filteredIncidents.map((inc) => (
                            <div 
                              key={inc.id}
                              className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-slate-350 transition-all flex flex-col gap-4 relative overflow-hidden shadow-xs hover:shadow"
                            >
                              {/* Glowing status line */}
                              <div className={`absolute top-0 left-0 w-1.5 h-full ${inc.status === 'approved' ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>

                              <div className="flex justify-between items-start pl-2">
                                <div>
                                  <h4 className="font-black text-slate-800 text-base">#{inc.id} - Incident ({inc.incident_type})</h4>
                                  <p className="text-[11px] text-slate-400 font-bold mt-1">
                                    Submitted by: {inc.creator_name || 'Staff'} • {new Date(inc.created_at).toLocaleDateString()}
                                  </p>
                                </div>
                                <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${
                                  inc.status === 'approved' 
                                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                                    : 'bg-amber-50 text-amber-600 border border-amber-100'
                                }`}>
                                  {inc.status}
                                </span>
                              </div>

                              <div className="pl-2 space-y-2.5">
                                <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 border border-slate-150 p-3 rounded-xl">
                                  <div>
                                    <p className="text-[10px] text-slate-450 uppercase font-black tracking-wider">Department</p>
                                    <p className="font-bold text-slate-700 mt-0.5">{inc.department}</p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] text-slate-450 uppercase font-black tracking-wider">Area of Incident</p>
                                    <p className="font-bold text-slate-700 mt-0.5">{inc.area_of_incident}</p>
                                  </div>
                                  <div className="col-span-2">
                                    <p className="text-[10px] text-slate-455 uppercase font-black tracking-wider">Involved Names</p>
                                    <p className="font-bold text-slate-650 mt-0.5">{inc.names_involved}</p>
                                  </div>
                                </div>

                                <div className="text-xs">
                                  <p className="text-[10px] text-slate-450 uppercase font-black tracking-wider">Description</p>
                                  <p className="text-slate-700 mt-1.5 leading-relaxed bg-slate-50/50 p-3 border border-slate-150 rounded-xl">{inc.description}</p>
                                </div>

                                {inc.hsfp_comments && (
                                  <div className="text-xs border-t border-slate-150 pt-3 mt-3">
                                    <p className="text-[10px] text-emerald-600 uppercase font-black tracking-wider">HSFP Safety Assessment Comments</p>
                                    <p className="text-slate-600 italic mt-1 bg-emerald-50/40 p-3 border border-emerald-100 rounded-xl">"{inc.hsfp_comments}"</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Right Pane: Report Storage Incident Form (5 columns) */}
                    <div className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
                      <h3 className="font-bold text-slate-800 text-lg mb-5 flex items-center gap-2.5 border-b border-slate-200 pb-3">
                        <AlertTriangle className="text-rose-500" size={18} />
                        Report Storage Incident
                      </h3>
                      
                      <form onSubmit={handleIncidentSubmit} className="space-y-4">
                        
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] uppercase font-black tracking-widest text-slate-400">Incident Type</label>
                          <div className="grid grid-cols-4 gap-2">
                            {['Patient', 'Staff', 'Equipment', 'Others'].map(type => (
                              <button
                                key={type}
                                type="button"
                                onClick={() => setIncidentFormData({...incidentFormData, incidentType: type})}
                                className={`py-2 px-1 text-center font-bold text-xs rounded-xl border transition-all cursor-pointer ${
                                  incidentFormData.incidentType === type 
                                    ? 'bg-rose-50 border-rose-200 text-rose-600 shadow-xs' 
                                    : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-700'
                                }`}
                              >
                                {type}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] uppercase font-black tracking-widest text-slate-400">Department</label>
                            <input 
                              type="text" 
                              required
                              value={incidentFormData.department} 
                              onChange={(e) => setIncidentFormData({...incidentFormData, department: e.target.value})}
                              className="bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs text-slate-800 outline-none focus:border-indigo-300 focus:bg-white transition-all animate-none"
                            />
                          </div>
                          
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] uppercase font-black tracking-widest text-slate-400">Area of Incident</label>
                            <input 
                              type="text" 
                              required
                              placeholder="e.g. Storage Shelf B"
                              value={incidentFormData.areaOfIncident} 
                              onChange={(e) => setIncidentFormData({...incidentFormData, areaOfIncident: e.target.value})}
                              className="bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs text-slate-800 outline-none focus:border-indigo-300 focus:bg-white transition-all animate-none"
                            />
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] uppercase font-black tracking-widest text-slate-400">Names Involved</label>
                          <input 
                            type="text" 
                            required
                            placeholder="Staff or witnesses..."
                            value={incidentFormData.namesInvolved} 
                            onChange={(e) => setIncidentFormData({...incidentFormData, namesInvolved: e.target.value})}
                            className="bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs text-slate-800 outline-none focus:border-indigo-300 focus:bg-white transition-all animate-none"
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] uppercase font-black tracking-widest text-slate-400">Description of Event</label>
                          <textarea 
                            required
                            rows="2"
                            placeholder="State clearly what happened..."
                            value={incidentFormData.description} 
                            onChange={(e) => setIncidentFormData({...incidentFormData, description: e.target.value})}
                            className="bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs text-slate-800 outline-none focus:border-indigo-300 focus:bg-white transition-all resize-none animate-none"
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] uppercase font-black tracking-widest text-slate-400">Immediate Actions Taken</label>
                          <textarea 
                            required
                            rows="2"
                            placeholder="Actions taken instantly to control hazard..."
                            value={incidentFormData.immediateActions} 
                            onChange={(e) => setIncidentFormData({...incidentFormData, immediateActions: e.target.value})}
                            className="bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs text-slate-800 outline-none focus:border-indigo-300 focus:bg-white transition-all resize-none animate-none"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={submittingIncident}
                          className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm py-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer mt-4"
                        >
                          {submittingIncident ? (
                            <>
                              <Loader2 size={16} className="animate-spin" />
                              Submitting...
                            </>
                          ) : (
                            <>
                              <Check size={16} />
                              Submit Report
                            </>
                          )}
                        </button>

                      </form>
                    </div>

                  </div>
                </div>
              )}


              {activeTab === 'outgoing_requests' && (
                <div className="space-y-6">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white border border-slate-200 rounded-3xl p-6 shadow-xs animate-none">
                    <div className="relative w-full md:max-w-md">
                      <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="text"
                        placeholder="Search outgoing requests..."
                        value={outgoingReqSearch}
                        onChange={(e) => setOutgoingReqSearch(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-2.5 rounded-xl text-xs outline-none focus:border-indigo-350 focus:bg-white transition-all animate-none"
                      />
                    </div>
                    <button 
                      onClick={() => {
                        setOutgoingReqItems([]);
                        setOutgoingReqNotes('');
                        setOutgoingReqUrgency('Normal');
                        setShowCreateOutgoingModal(true);
                      }}
                      className="w-full md:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Plus size={16} /> New Purchase Request
                    </button>
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
                          {filteredOutgoingRequisitions.map(req => (
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
                              <td className="p-4 text-right">
                                <button
                                  onClick={() => setSelectedRequisition(req)}
                                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer"
                                >
                                  <Eye size={13} /> View Items
                                </button>
                              </td>
                            </tr>
                          ))}
                          {filteredOutgoingRequisitions.length === 0 && (
                            <tr>
                              <td colSpan={7} className="p-12 text-center text-slate-400">
                                <ClipboardList className="mx-auto opacity-30 mb-2" size={36} />
                                No purchase requests found.
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

      {/* Drawer Overlay for Requisitions */}
      <AnimatePresence>
        {selectedRequisition && (
          <>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedRequisition(null)}
              className="fixed inset-0 bg-slate-900 z-40"
            />
            {/* Drawer */}
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-white border-l border-slate-200 z-50 p-6 shadow-2xl flex flex-col text-slate-800"
            >
              <div className="flex justify-between items-center border-b border-slate-200 pb-4 mb-6">
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-400">REQUISITION LEDGER</span>
                  <h3 className="text-lg font-black text-slate-900 mt-1">Requisition #{selectedRequisition.id}</h3>
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
                  <p className="text-[10px] text-slate-450 uppercase font-black">Department</p>
                  <p className="font-bold text-slate-700 mt-0.5">{selectedRequisition.department_name}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-455 uppercase font-black">Requested Date</p>
                  <p className="font-bold text-slate-700 mt-0.5">{new Date(selectedRequisition.created_at).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-455 uppercase font-black">Urgency Level</p>
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
                    'bg-slate-100 text-slate-500 border border-slate-200'
                  }`}>{selectedRequisition.status}</span>
                </div>
                {selectedRequisition.notes && (
                  <div className="col-span-2 border-t border-slate-150 pt-2.5">
                    <p className="text-[10px] text-slate-455 uppercase font-black">Nurse Notes / Reason</p>
                    <p className="text-slate-600 mt-1 italic">"{selectedRequisition.notes}"</p>
                  </div>
                )}
              </div>

              {/* Items List */}
              <div className="flex-1 flex flex-col min-h-0">
                <h4 className="font-bold text-xs text-slate-450 uppercase tracking-widest mb-3">Itemized Requirements</h4>
                
                {loadingReqItems ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-650" />
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
                            <p className="text-[10px] text-slate-450 font-mono mt-0.5">SKU: {item.sku || 'N/A'}</p>
                          </div>
                          <div className="text-right text-xs">
                            <span className="text-xs text-slate-400 font-medium font-bold">Requested:</span>
                            <p className="text-sm font-black text-slate-800">{item.requested_quantity || item.quantity || 0} {item.unit_of_measure || 'Unit'}</p>
                            {selectedRequisition.status === 'Pending' ? (
                              <div className="flex items-center gap-1.5 justify-end mt-1">
                                <label className="text-[10px] text-slate-500 font-bold">Approve Qty:</label>
                                <input
                                  type="number"
                                  min="0"
                                  value={approvedQtys[item.id] !== undefined ? approvedQtys[item.id] : (item.requested_quantity || item.quantity || 0)}
                                  onChange={(e) => setApprovedQtys({
                                    ...approvedQtys,
                                    [item.id]: Math.max(0, parseInt(e.target.value, 10) || 0)
                                  })}
                                  className="w-16 bg-white border border-slate-200 rounded px-1.5 py-0.5 text-center text-xs font-bold text-slate-800 outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                              </div>
                            ) : selectedRequisition.status === 'Approved' && (
                              <p className="text-[10px] text-emerald-600 font-bold mt-0.5">Approved: {item.approved_quantity || item.requested_quantity || item.quantity}</p>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-6 border-t border-slate-200 pt-5 flex flex-col gap-3">
                {selectedRequisition.status === 'Pending' && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleRejectRequisition(selectedRequisition.id)}
                      disabled={processingAction}
                      className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-sm py-3 rounded-xl border border-rose-200 transition-all cursor-pointer text-center flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <XCircle size={16} />
                      Reject
                    </button>
                    <button
                      onClick={() => handleApproveRequisition(selectedRequisition.id)}
                      disabled={processingAction}
                      className="flex-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm py-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow disabled:opacity-50"
                    >
                      {processingAction ? (
                        <Loader2 className="h-4 w-4 animate-spin text-white" />
                      ) : (
                        <CheckCircle size={16} />
                      )}
                      Approve Requisition
                    </button>
                  </div>
                )}
                
                <div className="flex gap-3">
                  <button
                    onClick={() => setSelectedRequisition(null)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm py-3 rounded-xl transition-all cursor-pointer text-center"
                  >
                    Close Drawer
                  </button>
                  <button
                    onClick={() => navigate('/central-store')}
                    className="flex-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-sm py-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow"
                  >
                    Manage in Store Hub
                    <ArrowUpRight size={16} />
                  </button>
                </div>
              </div>

            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Incident Form Modal Overlay */}
      <AnimatePresence>
        {showIncidentModal && (
          <>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowIncidentModal(false)}
              className="fixed inset-0 bg-slate-900/60 z-40 backdrop-blur-xs"
            />
            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-x-4 top-10 max-h-[85vh] md:max-w-2xl md:mx-auto bg-white border border-slate-200 rounded-3xl z-50 shadow-2xl p-6 flex flex-col text-slate-800 overflow-hidden"
            >
              <div className="flex justify-between items-center border-b border-slate-200 pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-rose-50 text-rose-600 border border-rose-100 rounded-lg">
                    <AlertTriangle size={16} />
                  </span>
                  <h3 className="text-lg font-black text-slate-900">Create Incident / Sentinel Event Report</h3>
                </div>
                <button 
                  onClick={() => setShowIncidentModal(false)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 space-y-4 custom-scrollbar">
                <form id="modal-incident-form" onSubmit={handleIncidentSubmit} className="space-y-4 animate-none">
                  
                  {/* Event Classification */}
                  <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl space-y-3">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                      <Sparkles size={12} className="text-indigo-600" />
                      1. Event Classification
                    </h4>
                    
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] uppercase font-bold text-slate-400">Incident Type *</label>
                      <div className="grid grid-cols-4 gap-2">
                        {['Patient', 'Staff', 'Equipment', 'Others'].map(type => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setIncidentFormData({...incidentFormData, incidentType: type})}
                            className={`py-2 px-1 text-center font-bold text-xs rounded-xl border transition-all cursor-pointer ${
                              incidentFormData.incidentType === type 
                                ? 'bg-rose-50 border-rose-205 text-rose-600 shadow-xs' 
                                : 'bg-white border-slate-200 text-slate-550'
                            }`}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] uppercase font-bold text-slate-400">Department *</label>
                        <input 
                          type="text" 
                          required
                          value={incidentFormData.department} 
                          onChange={(e) => setIncidentFormData({...incidentFormData, department: e.target.value})}
                          className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs text-slate-800 outline-none focus:border-indigo-350"
                        />
                      </div>
                      
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] uppercase font-bold text-slate-400">Area of Incident *</label>
                        <input 
                          type="text" 
                          required
                          placeholder="e.g. Storage Room B"
                          value={incidentFormData.areaOfIncident} 
                          onChange={(e) => setIncidentFormData({...incidentFormData, areaOfIncident: e.target.value})}
                          className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs text-slate-800 outline-none focus:border-indigo-350"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Individuals */}
                  <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl space-y-3">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                      <Users size={12} className="text-indigo-650" />
                      2. Individuals Involved
                    </h4>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2 flex flex-col gap-1">
                        <label className="text-[10px] uppercase font-bold text-slate-400">Names Involved *</label>
                        <input 
                          type="text" 
                          required
                          placeholder="Staff, Patients, Witnesses..."
                          value={incidentFormData.namesInvolved} 
                          onChange={(e) => setIncidentFormData({...incidentFormData, namesInvolved: e.target.value})}
                          className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs text-slate-800 outline-none focus:border-indigo-355"
                        />
                      </div>
                      
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] uppercase font-bold text-slate-400">Patient PID (if applicable)</label>
                        <input 
                          type="text" 
                          placeholder="PID-xxxx"
                          value={incidentFormData.pidNumber} 
                          onChange={(e) => setIncidentFormData({...incidentFormData, pidNumber: e.target.value})}
                          className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs text-slate-800 outline-none focus:border-indigo-355"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Narrative details */}
                  <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl space-y-3">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                      <FileText size={12} className="text-indigo-650" />
                      3. Incident Narrative
                    </h4>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] uppercase font-bold text-slate-400">Detailed Description *</label>
                      <textarea 
                        required
                        rows="2"
                        placeholder="State clearly what happened, items damaged/lost, etc."
                        value={incidentFormData.description} 
                        onChange={(e) => setIncidentFormData({...incidentFormData, description: e.target.value})}
                        className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs text-slate-800 outline-none focus:border-indigo-355 resize-none"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] uppercase font-bold text-slate-400">Contributing Factors</label>
                      <textarea 
                        rows="1"
                        placeholder="e.g. wet floor, leaky roof, shelf instability..."
                        value={incidentFormData.contributingFactors} 
                        onChange={(e) => setIncidentFormData({...incidentFormData, contributingFactors: e.target.value})}
                        className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs text-slate-800 outline-none focus:border-indigo-355 resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] uppercase font-bold text-slate-400">Immediate Actions Taken *</label>
                        <textarea 
                          required
                          rows="2"
                          placeholder="e.g. quarantined batch, shut off water..."
                          value={incidentFormData.immediateActions} 
                          onChange={(e) => setIncidentFormData({...incidentFormData, immediateActions: e.target.value})}
                          className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs text-slate-800 outline-none focus:border-indigo-355 resize-none"
                        />
                      </div>
                      
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] uppercase font-bold text-slate-400">Prevention Measures</label>
                        <textarea 
                          rows="2"
                          placeholder="e.g. secure shelving, roof review..."
                          value={incidentFormData.preventionMeasures} 
                          onChange={(e) => setIncidentFormData({...incidentFormData, preventionMeasures: e.target.value})}
                          className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs text-slate-800 outline-none focus:border-indigo-355 resize-none"
                        />
                      </div>
                    </div>
                  </div>

                </form>
              </div>

              {/* Action footer */}
              <div className="mt-4 border-t border-slate-200 pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowIncidentModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-3 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="modal-incident-form"
                  disabled={submittingIncident}
                  className="flex-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs py-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow"
                >
                  {submittingIncident ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Submitting Report...
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      Submit Event Report
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Create Outgoing Requisition / Purchase Request Modal */}
      <AnimatePresence>
        {showCreateOutgoingModal && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateOutgoingModal(false)}
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
                  <span className="p-1.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-lg">
                    <ClipboardList size={16} />
                  </span>
                  <h3 className="text-lg font-black text-slate-900">New Purchase Request (Outgoing Requisition)</h3>
                </div>
                <button 
                  onClick={() => setShowCreateOutgoingModal(false)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 space-y-4 custom-scrollbar">
                <form id="modal-outgoing-req-form" onSubmit={handleCreateOutgoingReqSubmit} className="space-y-4 animate-none">
                  
                  {/* General Config */}
                  <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] uppercase font-bold text-slate-400">Requesting From</label>
                      <input 
                        type="text" 
                        disabled
                        value="General Store -> Procurement Hub" 
                        className="bg-slate-150 border border-slate-200 px-3 py-2 rounded-xl text-xs text-slate-500 outline-none"
                      />
                    </div>
                    
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] uppercase font-bold text-slate-400">Urgency Level *</label>
                      <select
                        value={outgoingReqUrgency}
                        onChange={(e) => setOutgoingReqUrgency(e.target.value)}
                        className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs text-slate-800 outline-none focus:border-indigo-350"
                      >
                        <option value="Normal">Normal</option>
                        <option value="Urgent">Urgent</option>
                      </select>
                    </div>

                    <div className="col-span-2 flex flex-col gap-1">
                      <label className="text-[10px] uppercase font-bold text-slate-400">Notes / Purpose of Request</label>
                      <textarea
                        rows="2"
                        placeholder="State why this stock is needed (e.g. monthly replenishment)..."
                        value={outgoingReqNotes}
                        onChange={(e) => setOutgoingReqNotes(e.target.value)}
                        className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs text-slate-800 outline-none focus:border-indigo-350 resize-none"
                      />
                    </div>
                  </div>

                  {/* Add Items Section */}
                  <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl space-y-3">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Add Items to Request</h4>
                    
                    <div className="grid grid-cols-3 gap-3 items-end">
                      <div className="col-span-2 flex flex-col gap-1">
                        <label className="text-[10px] uppercase font-bold text-slate-400">Select Item (from Master Inventory) *</label>
                        <select
                          value={tempOutgoingItemName}
                          onChange={(e) => setTempOutgoingItemName(e.target.value)}
                          className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs text-slate-800 outline-none focus:border-indigo-350"
                        >
                          <option value="">-- Choose Item --</option>
                          {stockInHand
                            .filter((item, index, self) => self.findIndex(t => t.itemId === item.itemId) === index)
                            .map(item => (
                              <option key={item.itemId} value={item.name}>{item.name} ({item.sku})</option>
                            ))
                          }
                        </select>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] uppercase font-bold text-slate-400">Qty *</label>
                        <input
                          type="number"
                          placeholder="e.g. 50"
                          value={tempOutgoingItemQty}
                          onChange={(e) => setTempOutgoingItemQty(e.target.value)}
                          className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs text-slate-800 outline-none focus:border-indigo-350"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddOutgoingReqItem}
                      className="w-full bg-slate-250 hover:bg-slate-300 text-slate-700 font-bold text-xs py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 mt-2"
                    >
                      <Plus size={14} /> Add Item to List
                    </button>
                  </div>

                  {/* Added Items List */}
                  {outgoingReqItems.length > 0 && (
                    <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-150">
                            <th className="p-3">Item Name</th>
                            <th className="p-3">Quantity</th>
                            <th className="p-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                          {outgoingReqItems.map((item, idx) => (
                            <tr key={idx}>
                              <td className="p-3 text-slate-800">{item.item_name}</td>
                              <td className="p-3">{item.quantity}</td>
                              <td className="p-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveOutgoingReqItem(idx)}
                                  className="text-rose-600 hover:text-rose-800 transition-colors p-1"
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
                  onClick={() => setShowCreateOutgoingModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-3 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="modal-outgoing-req-form"
                  disabled={submittingOutgoingReq || outgoingReqItems.length === 0}
                  title={outgoingReqItems.length === 0 ? 'Add at least one item before submitting' : undefined}
                  className="flex-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-indigo-600 cursor-pointer"
                >
                  {submittingOutgoingReq ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Submitting Request...
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      Submit Purchase Request{outgoingReqItems.length > 0 ? ` (${outgoingReqItems.length} item${outgoingReqItems.length > 1 ? 's' : ''})` : ''}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style jsx>{`
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
