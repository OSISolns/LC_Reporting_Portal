import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Building, FileText, ClipboardList, ShieldAlert, Plus, Eye, Check, X,
  Trash2, RefreshCw, BarChart2, CheckCircle, Clock, AlertTriangle,
  TrendingUp, Search, Calendar, Loader2, ArrowRight, ArrowLeft, User, AlertCircle,
  Truck, ArrowUpRight, DollarSign, Tag, Info, ArrowRightLeft, Printer, Download,
  Copy, KeyRound, ShoppingCart, PackageCheck, Radio, Gavel, TrendingDown, CheckCircle2, Undo2,
  Receipt, BookOpen, Star, FileCheck, PieChart, Banknote, ListChecks, BadgeCheck, AlertOctagon,
  Database, Boxes
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/axios';
import { getIncidents, createIncident } from '../api/incidents';
import { toast } from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

// ── formatting helpers for dashboard ─────────────────────────────────────────
const fmtNum = (n) => Number(n || 0).toLocaleString('en-US');
const fmtRWF = (n) => `RWF ${fmtNum(Math.round(Number(n || 0)))}`;
const compactRWF = (n) => {
  const v = Number(n || 0);
  if (v >= 1_000_000) return `RWF ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `RWF ${(v / 1_000).toFixed(0)}K`;
  return `RWF ${fmtNum(v)}`;
};
const monthLabel = (ym) => {
  try { return new Date(`${ym}-01T00:00:00`).toLocaleString('en-US', { month: 'short' }); }
  catch { return ym; }
};

const STATUS_COLORS = {
  Draft: 'slate', Pending: 'amber', Sent: 'indigo', Approved: 'teal',
  Received: 'emerald', Completed: 'emerald', Rejected: 'rose', Cancelled: 'rose',
  Collecting: 'indigo', UnderReview: 'amber', Awarded: 'emerald', Closed: 'slate',
  pending: 'amber', received: 'emerald',
};
const HEX = {
  slate: '#64748b', amber: '#d97706', indigo: '#4f46e5', teal: '#0d9488',
  emerald: '#059669', rose: '#e11d48',
};
const colorFor = (k, i = 0) => HEX[STATUS_COLORS[k]] || Object.values(HEX)[i % Object.values(HEX).length];

// Compact inline trend line for KPI portlets (NetSuite-style).
function Sparkline({ points = [], color = '#0d9488', width = 120, height = 34 }) {
  const vals = points.map((p) => Number(p) || 0);
  if (vals.length === 0) return null;
  const max = Math.max(...vals, 1);
  const min = Math.min(...vals, 0);
  const range = max - min || 1;
  const step = vals.length > 1 ? width / (vals.length - 1) : width;
  const y = (v) => (height - ((v - min) / range) * height).toFixed(1);
  const d = vals.map((v, i) => `${i === 0 ? 'M' : 'L'} ${(i * step).toFixed(1)} ${y(v)}`).join(' ');
  return (
    <svg width={width} height={height} className="overflow-visible">
      <path d={`${d} L ${width} ${height} L 0 ${height} Z`} fill={color} opacity="0.08" stroke="none" />
      <path d={d} fill="none" stroke={color} strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={(vals.length - 1) * step} cy={y(vals[vals.length - 1])} r="2.5" fill={color} />
    </svg>
  );
}

// Period comparison badge (▲/▼ %) used across the operational overview.
function ChangeBadge({ current, previous }) {
  const cur = Number(current || 0);
  const prev = Number(previous || 0);
  if (!prev && !cur) return <span className="text-slate-300">—</span>;
  const pct = prev ? Math.round(((cur - prev) / prev) * 100) : 100;
  const up = cur >= prev;
  return (
    <span className={`inline-flex items-center gap-0.5 font-black ${up ? 'text-emerald-600' : 'text-rose-500'}`}>
      {up ? '▲' : '▼'} {Math.abs(pct)}%
    </span>
  );
}

function Donut({ segments, size = 148, thickness = 20 }) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={thickness} />
        {total > 0 && segments.map((seg, i) => {
          const frac = seg.value / total;
          const dash = frac * c;
          const el = (
            <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none"
              stroke={seg.color} strokeWidth={thickness}
              strokeDasharray={`${dash} ${c - dash}`} strokeDashoffset={-offset}
              strokeLinecap="butt" />
          );
          offset += dash;
          return el;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-black text-slate-800">{fmtNum(total)}</span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total</span>
      </div>
    </div>
  );
}

function TrendBars({ data }) {
  const max = Math.max(1, ...data.map(d => d.total));
  return (
    <div className="flex items-end justify-between gap-2 h-40 pt-4">
      {data.length === 0 && <p className="text-xs text-slate-400 m-auto">No purchase orders yet.</p>}
      {data.map((d, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-2 group">
          <div className="relative w-full flex justify-center">
            <div
              className="w-full max-w-[42px] rounded-t-lg bg-gradient-to-t from-teal-600 to-teal-400 transition-all group-hover:from-teal-700 group-hover:to-teal-500"
              style={{ height: `${Math.max(4, (d.total / max) * 130)}px` }}
              title={fmtRWF(d.total)}
            />
            <span className="absolute -top-5 text-[9px] font-black text-slate-500 opacity-0 group-hover:opacity-100 whitespace-nowrap">
              {compactRWF(d.total)}
            </span>
          </div>
          <span className="text-[10px] font-bold text-slate-400">{monthLabel(d.month)}</span>
        </div>
      ))}
    </div>
  );
}

export default function ProcurementHub() {
  const { user } = useAuth();
  const location = useLocation();
  const printRef = useRef(null);
  const [poPrintData, setPoPrintData] = useState(null); // PO selected for PDF preview
  const [grnPrintData, setGrnPrintData] = useState(null); // GRN selected for PDF preview
  
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
  const [dashboardData, setDashboardData] = useState(null);
  
  // Tenders & RFQs State
  const [rfqs, setRfqs] = useState([]);
  const [selectedRFQ, setSelectedRFQ] = useState(null);
  const [rfqDetails, setRfqDetails] = useState(null);
  const [rfqSearch, setRfqSearch] = useState('');
  const [showCreateRFQModal, setShowCreateRFQModal] = useState(false);
  const [loadingRFQDetails, setLoadingRFQDetails] = useState(false);
  const [submittingRFQ, setSubmittingRFQ] = useState(false);
  
  // RFQ Form States
  const [rfqTitle, setRfqTitle] = useState('');
  const [rfqCategory, setRfqCategory] = useState('medical_supplies');
  const [rfqNotes, setRfqNotes] = useState('');
  const [rfqInvitedVendors, setRfqInvitedVendors] = useState([]);
  const [rfqItems, setRfqItems] = useState([]);
  const [tempRfqItemName, setTempRfqItemName] = useState('');
  const [tempRfqItemQty, setTempRfqItemQty] = useState('');
  const [tempRfqItemUnit, setTempRfqItemUnit] = useState('pcs');
  
  // Quote Input States
  const [quoteInputs, setQuoteInputs] = useState({}); // { [item_id_supplier_id]: price }
  const [noBidInputs, setNoBidInputs] = useState({}); // { [item_id_supplier_id]: boolean }
  const [submittingQuotes, setSubmittingQuotes] = useState(false);
  
  // Award Selection States
  const [awardSelections, setAwardSelections] = useState({}); // { [item_id]: { vendor_id, reason, reason_note } }
  const [submittingAwards, setSubmittingAwards] = useState(false);
  const [generatingPOs, setGeneratingPOs] = useState(false);
  
  // Supplier Scorecard States
  const [supplierScorecard, setSupplierScorecard] = useState(null);
  const [loadingScorecard, setLoadingScorecard] = useState(false);
  const [selectedVendorForScorecard, setSelectedVendorForScorecard] = useState(null);

  // ── Invoices / AP State ──────────────────────────────────────────────────
  const [invoices, setInvoices] = useState([]);
  const [invoiceAnalytics, setInvoiceAnalytics] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoiceDetail, setInvoiceDetail] = useState(null);
  const [threeWayMatch, setThreeWayMatch] = useState(null);
  const [loadingInvoice, setLoadingInvoice] = useState(false);
  const [showCreateInvoiceModal, setShowCreateInvoiceModal] = useState(false);
  const [submittingInvoice, setSubmittingInvoice] = useState(false);
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState('');
  // Invoice Form
  const [invVendorId, setInvVendorId] = useState('');
  const [invPoId, setInvPoId] = useState('');
  const [invGrnId, setInvGrnId] = useState('');
  const [invNo, setInvNo] = useState('');
  const [invDate, setInvDate] = useState('');
  const [invDueDate, setInvDueDate] = useState('');
  const [invSubtotal, setInvSubtotal] = useState('');
  const [invTax, setInvTax] = useState('');
  const [invTotal, setInvTotal] = useState('');
  const [invPaymentTerms, setInvPaymentTerms] = useState('Net 30');
  const [invNotes, setInvNotes] = useState('');
  const [invItems, setInvItems] = useState([]);
  const [tempInvItemName, setTempInvItemName] = useState('');
  const [tempInvItemQty, setTempInvItemQty] = useState('');
  const [tempInvItemPrice, setTempInvItemPrice] = useState('');

  // ── Vendor Profile Drawer State ──────────────────────────────────────────
  const [selectedVendorProfile, setSelectedVendorProfile] = useState(null);
  const [vendorProfileTab, setVendorProfileTab] = useState('documents');
  const [vendorDocuments, setVendorDocuments] = useState([]);
  const [vendorContracts, setVendorContracts] = useState([]);
  const [vendorRatings, setVendorRatings] = useState([]);
  const [loadingVendorProfile, setLoadingVendorProfile] = useState(false);
  const [showAddDocModal, setShowAddDocModal] = useState(false);
  const [showAddContractModal, setShowAddContractModal] = useState(false);
  const [showAddRatingModal, setShowAddRatingModal] = useState(false);
  // Doc form
  const [docType, setDocType] = useState('contract');
  const [docName, setDocName] = useState('');
  const [docFileRef, setDocFileRef] = useState('');
  const [docIssuedDate, setDocIssuedDate] = useState('');
  const [docExpiryDate, setDocExpiryDate] = useState('');
  const [docNotes, setDocNotes] = useState('');
  const [submittingDoc, setSubmittingDoc] = useState(false);
  // Contract form
  const [contractTitle, setContractTitle] = useState('');
  const [contractNo, setContractNo] = useState('');
  const [contractStart, setContractStart] = useState('');
  const [contractEnd, setContractEnd] = useState('');
  const [contractValue, setContractValue] = useState('');
  const [contractNotes, setContractNotes] = useState('');
  const [submittingContract, setSubmittingContract] = useState(false);
  // Rating form
  const [ratingGrnId, setRatingGrnId] = useState('');
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingCategory, setRatingCategory] = useState('overall');
  const [ratingComment, setRatingComment] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);

  // ── Analytics State ──────────────────────────────────────────────────────
  const [analyticsData, setAnalyticsData] = useState(null);
  const [analyticsYear, setAnalyticsYear] = useState(String(new Date().getFullYear()));
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [supplierLeaderboard, setSupplierLeaderboard] = useState([]);
  const [expiringContracts, setExpiringContracts] = useState([]);

  // ── Catalog State ────────────────────────────────────────────────────────
  const [catalog, setCatalog] = useState([]);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogCategory, setCatalogCategory] = useState('');
  const [showAddCatalogModal, setShowAddCatalogModal] = useState(false);
  const [catalogItemName, setCatalogItemName] = useState('');
  const [catalogItemCat, setCatalogItemCat] = useState('medical_supplies');
  const [catalogItemUom, setCatalogItemUom] = useState('Unit');
  const [catalogItemPrice, setCatalogItemPrice] = useState('');
  const [submittingCatalog, setSubmittingCatalog] = useState(false);

  // ── Budgets State ────────────────────────────────────────────────────────
  const [budgets, setBudgets] = useState([]);
  const [showAddBudgetModal, setShowAddBudgetModal] = useState(false);
  const [budgetDept, setBudgetDept] = useState('NURSING');
  const [budgetYear, setBudgetYear] = useState(String(new Date().getFullYear()));
  const [budgetMonth, setBudgetMonth] = useState(String(new Date().getMonth() + 1));
  const [budgetAmount, setBudgetAmount] = useState('');
  const [submittingBudget, setSubmittingBudget] = useState(false);

  // Modals & Details Drawers
  const [selectedPO, setSelectedPO] = useState(null);
  const [selectedGRN, setSelectedGRN] = useState(null);
  const [grnItems, setGrnItems] = useState([]);
  const [showCreatePOModal, setShowCreatePOModal] = useState(false);
  const [showCreateGRNModal, setShowCreateGRNModal] = useState(false);
  const [showCreateVendorModal, setShowCreateVendorModal] = useState(false);
  const [showCreateIncidentModal, setShowCreateIncidentModal] = useState(false);
  // Shown after a PO is sent and its supplier portal session auto-opens, so
  // procurement staff can copy/share the token with the vendor.
  const [openedPortalSession, setOpenedPortalSession] = useState(null);

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

  const [departments, setDepartments] = useState([]);

  // Requisitions & Supplier Returns States
  const [requisitions, setRequisitions] = useState([]);
  const [returnsList, setReturnsList] = useState([]);

  // Stock visibility (Central Store + Departmental) — central view reuses the
  // already-loaded masterInventory; departmental rows are lazy-fetched on
  // first open of the tab so the initial Hub load stays unchanged.
  const [distributedStock, setDistributedStock] = useState([]);
  const [loadingDistStock, setLoadingDistStock] = useState(false);
  const [distStockLoaded, setDistStockLoaded] = useState(false);
  const [stockSearch, setStockSearch] = useState('');
  const [stockDeptFilter, setStockDeptFilter] = useState('all');
  const [selectedRequisition, setSelectedRequisition] = useState(null);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [requisitionItems, setRequisitionItems] = useState([]);
  const [loadingReqItems, setLoadingReqItems] = useState(false);
  const [submissionItems, setSubmissionItems] = useState([]);
  const [loadingSubItems, setLoadingSubItems] = useState(false);
  const [processingReceive, setProcessingReceive] = useState(false);
  const [requisitionMode, setRequisitionMode] = useState('list'); // 'list' | 'catalog' | 'create_custom'
  const [customReqDept, setCustomReqDept] = useState('NURSING');
  const [customReqUrgency, setCustomReqUrgency] = useState('Routine');
  const [customReqNotes, setCustomReqNotes] = useState('');
  const [customReqItems, setCustomReqItems] = useState([]);
  const [tempReqItemName, setTempReqItemName] = useState('');
  const [tempReqItemQty, setTempReqItemQty] = useState('');
  const [tempReqItemUom, setTempReqItemUom] = useState('Unit');

  const handleReceiveStock = async (id) => {
    // Stub for processing submission
    toast.error('Supplier submissions functionality not fully implemented yet.');
  };
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

      const [poRes, grnRes, venRes, mastRes, incRes, reqRes, retRes, dashRes, rfqRes, invRes, catRes, budRes, depRes] = await Promise.allSettled([
        api.get('/clinical/inventory/purchase-orders'),
        api.get('/clinical/inventory/grns'),
        api.get('/clinical/inventory/vendors'),
        api.get('/clinical/inventory/master'),
        getIncidents(),
        api.get('/clinical/inventory/requisitions'),
        api.get('/clinical/inventory/returns'),
        api.get('/clinical/procurement/dashboard'),
        api.get('/clinical/inventory/rfqs'),
        api.get('/clinical/inventory/invoices'),
        api.get('/clinical/inventory/catalog'),
        api.get('/clinical/inventory/budgets'),
        api.get('/clinical/inventory/departments'),
      ]);

      if (poRes.status === 'fulfilled' && poRes.value.data.success) setPurchaseOrders(poRes.value.data.data || []);
      if (grnRes.status === 'fulfilled' && grnRes.value.data.success) setGoodsReceipts(grnRes.value.data.data || []);
      if (venRes.status === 'fulfilled' && venRes.value.data.success) setVendors(venRes.value.data.data || []);
      if (mastRes.status === 'fulfilled' && mastRes.value.data.success) setMasterInventory(mastRes.value.data.data || []);
      if (incRes.status === 'fulfilled' && incRes.value.data.success) setIncidents(incRes.value.data.data || []);
      if (reqRes.status === 'fulfilled' && reqRes.value.data.success) setRequisitions(reqRes.value.data.data || []);
      if (retRes.status === 'fulfilled' && retRes.value.data.success) setReturnsList(retRes.value.data.data || []);
      if (dashRes.status === 'fulfilled' && dashRes.value.data.success) setDashboardData(dashRes.value.data.data || null);
      if (rfqRes.status === 'fulfilled' && rfqRes.value.data.success) setRfqs(rfqRes.value.data.data || []);
      if (invRes.status === 'fulfilled' && invRes.value.data.success) setInvoices(invRes.value.data.data || []);
      if (catRes.status === 'fulfilled' && catRes.value.data.success) setCatalog(catRes.value.data.data || []);
      if (budRes.status === 'fulfilled' && budRes.value.data.success) setBudgets(budRes.value.data.data || []);
      if (depRes.status === 'fulfilled' && depRes.value.data.success) setDepartments(depRes.value.data.data || []);

    } catch (err) {
      console.error(err);
      toast.error('Failed to reload procurement records.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load analytics data when analytics tab is opened
  const loadAnalytics = async () => {
    setLoadingAnalytics(true);
    try {
      const [analyticsRes, leaderRes, contractRes, invoiceAnaRes] = await Promise.allSettled([
        api.get(`/clinical/inventory/analytics/spend-by-department?year=${analyticsYear}`),
        api.get('/clinical/inventory/analytics/supplier-leaderboard'),
        api.get('/clinical/inventory/analytics/expiring-contracts'),
        api.get('/clinical/inventory/invoices/analytics'),
      ]);
      if (analyticsRes.status === 'fulfilled' && analyticsRes.value.data.success) setAnalyticsData(analyticsRes.value.data.data);
      if (leaderRes.status === 'fulfilled' && leaderRes.value.data.success) setSupplierLeaderboard(leaderRes.value.data.data || []);
      if (contractRes.status === 'fulfilled' && contractRes.value.data.success) setExpiringContracts(contractRes.value.data.data || []);
      if (invoiceAnaRes.status === 'fulfilled' && invoiceAnaRes.value.data.success) setInvoiceAnalytics(invoiceAnaRes.value.data.data);
    } catch (e) { console.error(e); }
    finally { setLoadingAnalytics(false); }
  };

  // Load vendor profile details
  const loadVendorProfile = async (vendor) => {
    setSelectedVendorProfile(vendor);
    setVendorProfileTab('documents');
    setLoadingVendorProfile(true);
    try {
      const [docsRes, contractsRes, ratingsRes] = await Promise.allSettled([
        api.get(`/clinical/inventory/vendors/${vendor.id}/documents`),
        api.get(`/clinical/inventory/vendors/${vendor.id}/contracts`),
        api.get(`/clinical/inventory/vendors/${vendor.id}/ratings`),
      ]);
      if (docsRes.status === 'fulfilled' && docsRes.value.data.success) setVendorDocuments(docsRes.value.data.data || []);
      if (contractsRes.status === 'fulfilled' && contractsRes.value.data.success) setVendorContracts(contractsRes.value.data.data || []);
      if (ratingsRes.status === 'fulfilled' && ratingsRes.value.data.success) setVendorRatings(ratingsRes.value.data.data || []);
    } catch (e) { console.error(e); }
    finally { setLoadingVendorProfile(false); }
  };

  // Load invoice detail
  const loadInvoiceDetail = async (invoice) => {
    setSelectedInvoice(invoice);
    setLoadingInvoice(true);
    setInvoiceDetail(null); setThreeWayMatch(null);
    try {
      const [detailRes, matchRes] = await Promise.allSettled([
        api.get(`/clinical/inventory/invoices/${invoice.id}`),
        api.get(`/clinical/inventory/invoices/${invoice.id}/match`),
      ]);
      if (detailRes.status === 'fulfilled' && detailRes.value.data.success) setInvoiceDetail(detailRes.value.data.data);
      if (matchRes.status === 'fulfilled' && matchRes.value.data.success) setThreeWayMatch(matchRes.value.data.data);
    } catch (e) { console.error(e); }
    finally { setLoadingInvoice(false); }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    const validTabs = ['overview', 'store_requisitions', 'purchase_orders', 'goods_receipts', 'returns', 'suppliers', 'incidents', 'tenders', 'invoices', 'analytics', 'catalog', 'budgets', 'central_stock', 'department_stocks'];
    if (tab && validTabs.includes(tab)) {
      setActiveTab(tab);
      if (tab === 'analytics') loadAnalytics();
    }
  }, [location.search]);

  // Lazy-load departmental stock the first time the tab is opened.
  useEffect(() => {
    if (activeTab !== 'department_stocks' || distStockLoaded || loadingDistStock) return;
    (async () => {
      setLoadingDistStock(true);
      try {
        const res = await api.get('/clinical/inventory/distributed-stock');
        if (res.data?.success) {
          setDistributedStock(res.data.data || []);
          setDistStockLoaded(true);
        }
      } catch (err) {
        console.error(err);
        toast.error('Failed to load departmental stock.');
      } finally {
        setLoadingDistStock(false);
      }
    })();
  }, [activeTab, distStockLoaded, loadingDistStock]);

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
    if (poItems.some(i => i.item_name.toLowerCase() === tempPoItemName.trim().toLowerCase())) {
      toast.error('Item already added to this PO. Remove it first if you need to change the quantity or price.');
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

  // Auto-fills the estimated price from the item's last recorded purchase
  // price when the typed name exactly matches a known Master Inventory item,
  // so the person building the PO usually doesn't have to look it up or
  // guess -- only fills in if the price field is still empty, so it never
  // clobbers a price the user already typed.
  const handlePoItemNameChange = (value) => {
    setTempPoItemName(value);
    const matched = masterInventory.find(i => i.name.toLowerCase() === value.trim().toLowerCase());
    if (matched && matched.price && !tempPoItemPrice) {
      setTempPoItemPrice(String(matched.price));
    }
  };

  const matchedPoItem = masterInventory.find(i => i.name.toLowerCase() === tempPoItemName.trim().toLowerCase());

  const poTotal = poItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

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

  // ─── RFQ / comparative matrix helper functions ──────────────────────────────

  const fetchRFQDetails = async (rfqId) => {
    setLoadingRFQDetails(true);
    try {
      const res = await api.get(`/clinical/inventory/rfqs/${rfqId}`);
      if (res.data.success) {
        setRfqDetails(res.data.data);
        
        // Populate inputs from existing quotes
        const inputs = {};
        const noBids = {};
        res.data.data.quotes.forEach(q => {
          inputs[`${q.rfq_item_id}_${q.rfq_supplier_id}`] = q.unit_price !== null ? q.unit_price : '';
          noBids[`${q.rfq_item_id}_${q.rfq_supplier_id}`] = q.no_bid === 1;
        });
        setQuoteInputs(inputs);
        setNoBidInputs(noBids);

        // Populate award selections
        const awards = {};
        res.data.data.awards.forEach(a => {
          awards[a.rfq_item_id] = {
            vendor_id: a.vendor_id,
            reason: a.reason,
            reason_note: a.reason_note
          };
        });
        setAwardSelections(awards);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load RFQ comparative matrix details.');
    } finally {
      setLoadingRFQDetails(false);
    }
  };

  const handleCreateRFQSubmit = async (e) => {
    e.preventDefault();
    if (!rfqTitle.trim()) {
      toast.error('Please enter a tender title.');
      return;
    }
    if (rfqInvitedVendors.length === 0) {
      toast.error('Invite at least one supplier.');
      return;
    }
    if (rfqItems.length === 0) {
      toast.error('Add at least one item row.');
      return;
    }

    setSubmittingRFQ(true);
    try {
      const res = await api.post('/clinical/inventory/rfqs', {
        title: rfqTitle,
        category: rfqCategory,
        notes: rfqNotes,
        invitedVendorIds: rfqInvitedVendors.map(vId => parseInt(vId, 10)),
        items: rfqItems
      });

      if (res.data.success) {
        toast.success('RFQ Tender created successfully.');
        setShowCreateRFQModal(false);
        // Clear form
        setRfqTitle('');
        setRfqNotes('');
        setRfqInvitedVendors([]);
        setRfqItems([]);
        loadData(true);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to create RFQ.');
    } finally {
      setSubmittingRFQ(false);
    }
  };

  const handleCreateInvoiceSubmit = async (e) => {
    e.preventDefault();
    setSubmittingInvoice(true);
    try {
      const res = await api.post('/clinical/inventory/invoices', {
        invoice_no: invNo,
        vendor_id: Number(invVendorId),
        po_id: invPoId ? Number(invPoId) : null,
        grn_id: invGrnId ? Number(invGrnId) : null,
        invoice_date: invDate,
        due_date: invDueDate,
        subtotal: Number(invSubtotal || 0),
        tax_amount: Number(invTax || 0),
        total_amount: Number(invTotal || 0),
        payment_terms: invPaymentTerms,
        notes: invNotes,
        items: invItems
      });
      if (res.data.success) {
        toast.success('Invoice captured successfully.');
        setShowCreateInvoiceModal(false);
        setInvNo(''); setInvVendorId(''); setInvPoId(''); setInvGrnId('');
        setInvDate(''); setInvDueDate(''); setInvSubtotal(''); setInvTax('');
        setInvTotal(''); setInvNotes(''); setInvItems([]);
        loadData(true);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to capture invoice.');
    } finally {
      setSubmittingInvoice(false);
    }
  };

  const handleCreateVendorDocSubmit = async (e) => {
    e.preventDefault();
    if (!docName || !selectedVendorProfile) return;
    setSubmittingDoc(true);
    try {
      const res = await api.post(`/clinical/inventory/vendors/${selectedVendorProfile.id}/documents`, {
        doc_type: docType,
        doc_name: docName,
        file_ref: docFileRef,
        issued_date: docIssuedDate,
        expiry_date: docExpiryDate,
        notes: docNotes
      });
      if (res.data.success) {
        toast.success('Document uploaded successfully.');
        setShowAddDocModal(false);
        setDocName(''); setDocFileRef(''); setDocIssuedDate(''); setDocExpiryDate(''); setDocNotes('');
        loadVendorProfile(selectedVendorProfile);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to save document.');
    } finally {
      setSubmittingDoc(false);
    }
  };

  const handleCreateVendorContractSubmit = async (e) => {
    e.preventDefault();
    if (!contractTitle || !contractStart || !selectedVendorProfile) return;
    setSubmittingContract(true);
    try {
      const res = await api.post(`/clinical/inventory/vendors/${selectedVendorProfile.id}/contracts`, {
        contract_no: contractNo,
        title: contractTitle,
        start_date: contractStart,
        end_date: contractEnd,
        contract_value: Number(contractValue || 0),
        currency: 'RWF',
        notes: contractNotes
      });
      if (res.data.success) {
        toast.success('Contract registered successfully.');
        setShowAddContractModal(false);
        setContractNo(''); setContractTitle(''); setContractStart(''); setContractEnd(''); setContractValue(''); setContractNotes('');
        loadVendorProfile(selectedVendorProfile);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to register contract.');
    } finally {
      setSubmittingContract(false);
    }
  };

  const handleCreateVendorRatingSubmit = async (e) => {
    e.preventDefault();
    if (!selectedVendorProfile) return;
    setSubmittingRating(true);
    try {
      const res = await api.post(`/clinical/inventory/vendors/${selectedVendorProfile.id}/ratings`, {
        rating: Number(ratingValue),
        category: ratingCategory,
        comment: ratingComment,
        grn_id: ratingGrnId ? Number(ratingGrnId) : null
      });
      if (res.data.success) {
        toast.success('Rating recorded successfully.');
        setShowAddRatingModal(false);
        setRatingValue(5); setRatingCategory('overall'); setRatingComment(''); setRatingGrnId('');
        loadVendorProfile(selectedVendorProfile);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to submit rating.');
    } finally {
      setSubmittingRating(false);
    }
  };

  const handleCreateCatalogItemSubmit = async (e) => {
    e.preventDefault();
    if (!catalogItemName) return;
    setSubmittingCatalog(true);
    try {
      const res = await api.post('/clinical/inventory/catalog', {
        item_name: catalogItemName,
        category: catalogItemCat,
        unit_of_measure: catalogItemUom,
        last_unit_price: catalogItemPrice ? Number(catalogItemPrice) : null
      });
      if (res.data.success) {
        toast.success('Catalog item added.');
        setShowAddCatalogModal(false);
        setCatalogItemName(''); setCatalogItemPrice('');
        loadData(true);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to create catalog item.');
    } finally {
      setSubmittingCatalog(false);
    }
  };

  const handleCreateBudgetSubmit = async (e) => {
    e.preventDefault();
    if (!budgetAmount) return;
    setSubmittingBudget(true);
    try {
      const res = await api.post('/clinical/inventory/budgets', {
        department_name: budgetDept,
        period_type: 'monthly',
        period_year: Number(budgetYear),
        period_month: Number(budgetMonth),
        budget_amount: Number(budgetAmount),
        currency: 'RWF'
      });
      if (res.data.success) {
        toast.success('Department budget configured.');
        setShowAddBudgetModal(false);
        setBudgetAmount('');
        loadData(true);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to save budget.');
    } finally {
      setSubmittingBudget(false);
    }
  };

  const handleCreateRequisitionSubmit = async (e) => {
    e.preventDefault();
    if (customReqItems.length === 0) {
      toast.error('Add at least one item.');
      return;
    }
    const deptObj = departments.find(d => d.name?.toUpperCase() === customReqDept?.toUpperCase());
    const department_id = deptObj ? deptObj.id : 1;
    try {
      const res = await api.post('/clinical/inventory/requisitions', {
        department_id,
        urgency: customReqUrgency,
        notes: customReqNotes,
        items: customReqItems.map(i => ({
          item_id: i.master_item_id || 1,
          quantity: Number(i.quantity)
        }))
      });
      if (res.data.success) {
        toast.success('Requisition submitted successfully.');
        setCustomReqNotes('');
        setCustomReqItems([]);
        setRequisitionMode('list');
        loadData(true);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to submit requisition.');
    }
  };

  const handleRequestCatalogItem = (item) => {
    const exists = customReqItems.find(i => i.item_name === item.item_name);
    if (exists) {
      setCustomReqItems(prev => prev.map(i => i.item_name === item.item_name ? { ...i, quantity: i.quantity + 1 } : i));
      toast.success(`Increased quantity of ${item.item_name} in draft requisition.`);
    } else {
      setCustomReqItems(prev => [...prev, {
        item_name: item.item_name,
        quantity: 1,
        unit: item.unit_of_measure || 'Unit',
        master_item_id: item.master_item_id || item.id
      }]);
      toast.success(`Added ${item.item_name} to draft requisition.`);
    }
    setRequisitionMode('create_custom');
    setActiveTab('store_requisitions');
  };

  const handleSaveQuotesSubmit = async (vendorId) => {
    if (!rfqDetails) return;
    setSubmittingQuotes(true);

    const rfqId = rfqDetails.rfq.id;
    // Extract quotes only for this vendor
    const invitedSup = rfqDetails.suppliers.find(s => s.vendor_id === vendorId);
    if (!invitedSup) return;

    const supplierQuotes = rfqDetails.items.map(item => {
      const key = `${item.id}_${invitedSup.id}`;
      const price = quoteInputs[key];
      const noBid = noBidInputs[key] || false;
      return {
        rfq_item_id: item.id,
        unit_price: noBid ? null : (price !== '' ? parseFloat(price) : null),
        total_price: noBid ? null : (price !== '' ? parseFloat(price) * (item.quantity || 1) : null),
        no_bid: noBid
      };
    });

    try {
      const res = await api.post(`/clinical/inventory/rfqs/${rfqId}/quotes`, {
        quotes: supplierQuotes,
        supplierId: vendorId
      });

      if (res.data.success) {
        toast.success('Supplier prices saved successfully.');
        fetchRFQDetails(rfqId);
        loadData(true);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to save supplier quotes.');
    } finally {
      setSubmittingQuotes(false);
    }
  };

  const handleSaveAwardsSubmit = async () => {
    if (!rfqDetails) return;
    setSubmittingAwards(true);

    const rfqId = rfqDetails.rfq.id;
    const awardsPayload = Object.keys(awardSelections)
      // Drop items where the dropdown was left/reset on "-- Choose Vendor --"
      .filter(itemId => awardSelections[itemId]?.vendor_id)
      .map(itemId => {
        const selection = awardSelections[itemId];
        const isNoOffers = selection.vendor_id === 'no_offers';

        // Find the quote record for this item + vendor. NB: the <select> value
        // is a string while DB ids are numbers — compare numerically, or the
        // match silently fails and awarded_price is saved as NULL (which later
        // breaks PO generation on the NOT NULL unit_price column).
        let awardedQuoteId = null;
        let awardedPrice = null;
        if (!isNoOffers) {
          const sup = rfqDetails.suppliers.find(s => Number(s.vendor_id) === Number(selection.vendor_id));
          if (sup) {
            const q = rfqDetails.quotes.find(quote => Number(quote.rfq_item_id) === Number(itemId) && Number(quote.rfq_supplier_id) === Number(sup.id));
            if (q) {
              awardedQuoteId = q.id;
              awardedPrice = q.unit_price;
            }
          }
        }

        return {
          rfq_item_id: parseInt(itemId, 10),
          vendor_id: isNoOffers ? null : parseInt(selection.vendor_id, 10),
          awarded_quote_id: awardedQuoteId,
          awarded_price: awardedPrice,
          reason: isNoOffers ? 'no_offers' : (selection.reason || 'lowest'),
          reason_note: selection.reason_note || ''
        };
      });

    if (awardsPayload.length === 0) {
      toast.error('Select a winning vendor (or "No offers") for at least one item first.');
      setSubmittingAwards(false);
      return;
    }

    try {
      const res = await api.post(`/clinical/inventory/rfqs/${rfqId}/awards`, {
        awards: awardsPayload
      });

      if (res.data.success) {
        toast.success('Tender awards updated successfully.');
        fetchRFQDetails(rfqId);
        loadData(true);
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to update awards.');
    } finally {
      setSubmittingAwards(false);
    }
  };

  const handleGeneratePOsSubmit = async () => {
    if (!rfqDetails) return;
    setGeneratingPOs(true);
    const rfqId = rfqDetails.rfq.id;
    try {
      const res = await api.post(`/clinical/inventory/rfqs/${rfqId}/generate-pos`);
      if (res.data.success) {
        toast.success('Purchase Orders successfully generated from awards!');
        fetchRFQDetails(rfqId);
        loadData(true);
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to auto-generate POs.');
    } finally {
      setGeneratingPOs(false);
    }
  };

  const fetchSupplierPerformance = async (vendorId) => {
    setLoadingScorecard(true);
    try {
      const res = await api.get(`/clinical/inventory/vendors/${vendorId}/performance`);
      if (res.data.success) {
        setSupplierScorecard(res.data.data);
      }
    } catch (err) {
      console.error(err);
      setSupplierScorecard(null);
    } finally {
      setLoadingScorecard(false);
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

        // Sending a PO to a supplier should give that supplier a way to
        // submit their delivery back -- auto-open a supplier portal session
        // for the PO's vendor, pre-filled with the PO's own line items. This
        // is a secondary/best-effort step: the PO is already sent regardless
        // of whether this succeeds, so failures here are surfaced but don't
        // roll back the status change.
        if (newStatus === 'Sent to Supplier') {
          const po = (selectedPO?.id === poId ? selectedPO : purchaseOrders.find(p => p.id === poId));
          if (po?.vendor_id && Array.isArray(po.items) && po.items.length > 0) {
            try {
              const portalRes = await api.post('/clinical/inventory/supplier-portal/toggle', {
                active: true,
                vendorId: po.vendor_id,
                requestedItems: po.items.map(i => ({
                  name: i.item_name,
                  sku: i.sku || '',
                  category: i.category || '',
                  unit_of_measure: i.unit_of_measure || '',
                  quantity: i.quantity || 0
                }))
              });
              if (portalRes.data?.success) {
                setOpenedPortalSession(portalRes.data.session);
                toast.success(`Supplier portal opened for ${portalRes.data.session.vendorName} -- share the access token with them.`, { duration: 6000 });
              }
            } catch (portalErr) {
              console.error(portalErr);
              toast.error(portalErr.response?.data?.message || 'PO sent, but failed to open the supplier portal automatically. Open it manually from Supplier Portal Manager.');
            }
          }
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

  const filteredRFQs = useMemo(() => {
    return rfqs.filter(r => {
      return r.title.toLowerCase().includes(rfqSearch.toLowerCase()) ||
             r.reference_no.toLowerCase().includes(rfqSearch.toLowerCase()) ||
             (r.category || '').toLowerCase().includes(rfqSearch.toLowerCase());
    });
  }, [rfqs, rfqSearch]);

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

  // ── Operational overview (NetSuite-style) state + period buckets ────────────
  const [ovSearch, setOvSearch] = useState('');
  const [ovType, setOvType] = useState('Purchase Order');

  const opsMetrics = useMemo(() => {
    const now = new Date();
    const sToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dow = (now.getDay() + 6) % 7; // Monday = 0
    const sWeek = new Date(sToday); sWeek.setDate(sToday.getDate() - dow);
    const sMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const sLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const sQuarter = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    const sYear = new Date(now.getFullYear(), 0, 1);
    const agg = (rows, dateField, valField) => {
      const b = { today: { c: 0, v: 0 }, wtd: { c: 0, v: 0 }, mtd: { c: 0, v: 0 }, lastMonth: { c: 0, v: 0 }, qtd: { c: 0, v: 0 }, ytd: { c: 0, v: 0 } };
      (rows || []).forEach((r) => {
        const raw = r[dateField]; if (!raw) return;
        const d = new Date(raw); if (isNaN(d)) return;
        const v = Number(r[valField] || 0);
        if (d >= sToday) { b.today.c++; b.today.v += v; }
        if (d >= sWeek) { b.wtd.c++; b.wtd.v += v; }
        if (d >= sMonth) { b.mtd.c++; b.mtd.v += v; }
        if (d >= sLastMonth && d < sMonth) { b.lastMonth.c++; b.lastMonth.v += v; }
        if (d >= sQuarter) { b.qtd.c++; b.qtd.v += v; }
        if (d >= sYear) { b.ytd.c++; b.ytd.v += v; }
      });
      return b;
    };
    return {
      po: agg(purchaseOrders, 'created_at', 'total_amount'),
      grn: agg(goodsReceipts, 'received_at', 'total_amount'),
      ret: agg(returnsList, 'returned_at', 'total_amount'),
    };
  }, [purchaseOrders, goodsReceipts, returnsList]);

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

        {/* Back to Dashboard Breadcrumb (Visible only in Sub-modules) */}
        {activeTab !== 'overview' && (
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-8 flex items-center gap-3"
          >
            <button 
              onClick={() => setActiveTab('overview')}
              className="flex items-center gap-2 bg-white border border-slate-200 hover:border-teal-500 hover:text-teal-700 text-slate-600 px-4 py-2.5 rounded-xl font-bold text-xs shadow-xs transition-all cursor-pointer"
            >
              <ArrowLeft size={14} /> Back to Dashboard
            </button>
            <span className="text-slate-350">/</span>
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
              {activeTab === 'store_requisitions' ? 'Store Requests' : 
               activeTab === 'purchase_orders' ? 'Purchase Orders' :
               activeTab === 'goods_receipts' ? 'Goods Receipts' :
               activeTab === 'returns' ? 'Supplier Returns' :
               activeTab === 'suppliers' ? 'Suppliers & Vendor Management' :
               activeTab === 'incidents' ? 'Quality Incidents' :
               activeTab === 'tenders' ? 'Tenders & RFQs' :
               activeTab === 'invoices' ? 'Invoicing & Accounts Payable' :
               activeTab === 'analytics' ? 'Analytics & Reporting' :
               activeTab === 'catalog' ? 'Procurement Catalog' :
               activeTab === 'budgets' ? 'Department Budgets' :
               activeTab === 'central_stock' ? 'Central Store Stock' :
               activeTab === 'department_stocks' ? 'Departmental Stocks' :
               activeTab.replace(/_/g, ' ')}
            </span>
          </motion.div>
        )}

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
              
              {/* ─── TAB 1: OVERVIEW — Operational Cockpit (NetSuite-style) ─── */}
              {activeTab === 'overview' && (
                <div className="space-y-6">

                  {/* KPI strip with sparklines */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {(() => {
                      const openPOs = purchaseOrders.filter(po => !['Received', 'Cancelled', 'Closed'].includes(po.status));
                      const trend = dashboardData?.spendTrend || [];
                      const cards = [
                        { label: 'Open Purchase Orders', value: fmtNum(openPOs.length), sub: `${fmtNum(opsMetrics.po.mtd.c)} created this month`, spark: trend.map(t => t.count), cur: opsMetrics.po.mtd.c, prev: opsMetrics.po.lastMonth.c, color: '#4f46e5' },
                        { label: 'PO Count (This Month)', value: fmtNum(opsMetrics.po.mtd.c), sub: 'vs last month', spark: trend.map(t => t.count), cur: opsMetrics.po.mtd.c, prev: opsMetrics.po.lastMonth.c, color: '#0d9488' },
                        { label: 'PO Value (This Month)', value: compactRWF(opsMetrics.po.mtd.v), sub: 'vs last month', spark: trend.map(t => t.total), cur: opsMetrics.po.mtd.v, prev: opsMetrics.po.lastMonth.v, color: '#059669' },
                      ];
                      return cards.map((c, i) => (
                        <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">{c.label}</p>
                              <p className="text-2xl font-black text-slate-800 mt-1">{c.value}</p>
                            </div>
                            <Sparkline points={c.spark} color={c.color} />
                          </div>
                          <div className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
                            <ChangeBadge current={c.cur} previous={c.prev} /> <span>{c.sub}</span>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>

                  {/* Operational grid: left rail + main */}
                  <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">

                    {/* LEFT RAIL */}
                    <aside className="xl:col-span-1 space-y-6">
                      {/* Transaction Search */}
                      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2"><Search size={14} /> Transaction Search</h4>
                        <div className="space-y-3">
                          <div>
                            <label className="text-[10px] font-bold text-slate-400">Type</label>
                            <select value={ovType} onChange={e => setOvType(e.target.value)} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs outline-none focus:border-teal-300">
                              <option>Purchase Order</option><option>Goods Receipt</option><option>Supplier Return</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-400">Number / Vendor</label>
                            <input value={ovSearch} onChange={e => setOvSearch(e.target.value)} placeholder="Search…" className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs outline-none focus:border-teal-300" />
                          </div>
                          {ovSearch && <button onClick={() => setOvSearch('')} className="text-[11px] font-bold text-teal-600 hover:underline cursor-pointer">Clear filter</button>}
                        </div>
                      </div>

                      {/* Monthly trend */}
                      {dashboardData?.spendTrend && (
                        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                          <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-2"><TrendingUp size={14} /> Monthly PO Spend</h4>
                          <TrendBars data={dashboardData.spendTrend} />
                        </div>
                      )}

                      {/* Quick links */}
                      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2">Procurement Links</h4>
                        <div className="flex flex-col text-xs font-bold text-slate-600">
                          {[
                            { label: 'Create Purchase Order', id: 'purchase_orders' },
                            { label: 'Receive Goods (GRN)', id: 'goods_receipts' },
                            { label: 'Store Requisitions', id: 'store_requisitions' },
                            { label: 'Supplier Returns', id: 'returns' },
                            { label: 'Tenders & RFQs', id: 'tenders' },
                            { label: 'Suppliers & Vendors', id: 'suppliers' },
                            { label: 'Central Store Stock', id: 'central_stock' },
                            { label: 'Department Stocks', id: 'department_stocks' },
                          ].map((l, i) => (
                            <button key={i} onClick={() => setActiveTab(l.id)} className="flex items-center justify-between py-2 border-b border-slate-100 hover:text-teal-700 transition-all group text-left cursor-pointer">
                              {l.label} <ArrowRight size={13} className="text-slate-300 group-hover:text-teal-500" />
                            </button>
                          ))}
                          <Link to="/supplier-portal-manager" className="flex items-center justify-between py-2 hover:text-teal-700 transition-all group no-underline text-slate-600">Supplier Portal <ArrowUpRight size={13} className="text-slate-300 group-hover:text-teal-500" /></Link>
                        </div>
                      </div>
                    </aside>

                    {/* MAIN */}
                    <div className="xl:col-span-3 space-y-6">

                      {/* KPIs — comparison table */}
                      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
                        <div className="px-5 py-3.5 border-b border-slate-100"><h4 className="text-sm font-black text-slate-800">Key Performance Indicators</h4></div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead><tr className="text-slate-400 font-black uppercase text-[10px] bg-slate-50">
                              <th className="text-left px-5 py-2.5">Indicator</th><th className="text-left px-3 py-2.5">Period</th>
                              <th className="text-right px-3 py-2.5">Current</th><th className="text-right px-3 py-2.5">Previous</th><th className="text-right px-5 py-2.5">Change</th>
                            </tr></thead>
                            <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                              {(() => {
                                const openPOs = purchaseOrders.filter(po => !['Received', 'Cancelled', 'Closed'].includes(po.status)).length;
                                const rows = [
                                  { name: 'Open Purchase Orders', period: 'Current', cur: openPOs, prev: null, fmt: fmtNum },
                                  { name: 'Purchase Order Count', period: 'This Month vs Last', cur: opsMetrics.po.mtd.c, prev: opsMetrics.po.lastMonth.c, fmt: fmtNum },
                                  { name: 'Purchase Order Value', period: 'This Month vs Last', cur: opsMetrics.po.mtd.v, prev: opsMetrics.po.lastMonth.v, fmt: compactRWF },
                                  { name: 'Goods Received Value', period: 'This Month vs Last', cur: opsMetrics.grn.mtd.v, prev: opsMetrics.grn.lastMonth.v, fmt: compactRWF },
                                  { name: 'Supplier Returns', period: 'This Month vs Last', cur: opsMetrics.ret.mtd.c, prev: opsMetrics.ret.lastMonth.c, fmt: fmtNum },
                                ];
                                return rows.map((r, i) => (
                                  <tr key={i} className="hover:bg-slate-50/60">
                                    <td className="px-5 py-2.5 font-black text-slate-800">{r.name}</td>
                                    <td className="px-3 py-2.5 text-teal-600 font-bold">{r.period}</td>
                                    <td className="px-3 py-2.5 text-right font-black text-slate-800">{r.fmt(r.cur)}</td>
                                    <td className="px-3 py-2.5 text-right text-slate-400">{r.prev == null ? '—' : r.fmt(r.prev)}</td>
                                    <td className="px-5 py-2.5 text-right">{r.prev == null ? <span className="text-slate-300">—</span> : <ChangeBadge current={r.cur} previous={r.prev} />}</td>
                                  </tr>
                                ));
                              })()}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Purchase Orders to Receive */}
                      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
                        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                          <h4 className="text-sm font-black text-slate-800">Purchase Orders to Receive</h4>
                          <button onClick={() => setActiveTab('purchase_orders')} className="text-[11px] font-bold text-teal-600 hover:underline cursor-pointer">View all</button>
                        </div>
                        <div className="overflow-x-auto">
                          {(() => {
                            const q = ovSearch.trim().toLowerCase();
                            const list = purchaseOrders
                              .filter(po => !['Received', 'Cancelled', 'Closed'].includes(po.status))
                              .filter(po => !q || String(po.po_number || '').toLowerCase().includes(q) || String(po.vendor_name || '').toLowerCase().includes(q))
                              .sort((a, b) => String(a.due_date || a.created_at || '').localeCompare(String(b.due_date || b.created_at || '')))
                              .slice(0, 8);
                            if (list.length === 0) return <p className="text-xs text-slate-400 text-center py-10">No open purchase orders to receive.</p>;
                            return (
                              <table className="w-full text-xs">
                                <thead><tr className="text-slate-400 font-black uppercase text-[10px] bg-slate-50">
                                  <th className="text-left px-5 py-2.5">Date</th><th className="text-left px-3 py-2.5">Receive By</th>
                                  <th className="text-left px-3 py-2.5">Document</th><th className="text-left px-3 py-2.5">Vendor</th>
                                  <th className="text-right px-3 py-2.5">Amount</th><th className="text-left px-5 py-2.5">Status</th>
                                </tr></thead>
                                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                                  {list.map((po, i) => (
                                    <tr key={i} onClick={() => setActiveTab('purchase_orders')} className="hover:bg-amber-50/40 cursor-pointer">
                                      <td className="px-5 py-2.5 whitespace-nowrap">{po.created_at ? new Date(po.created_at).toLocaleDateString() : '—'}</td>
                                      <td className="px-3 py-2.5 whitespace-nowrap">{po.due_date ? new Date(po.due_date).toLocaleDateString() : '—'}</td>
                                      <td className="px-3 py-2.5 font-black text-teal-700">{po.po_number || `PO-${po.id}`}</td>
                                      <td className="px-3 py-2.5 truncate max-w-[180px]">{po.vendor_name || '—'}</td>
                                      <td className="px-3 py-2.5 text-right font-black text-slate-800">{fmtRWF(po.total_amount)}</td>
                                      <td className="px-5 py-2.5"><span className="px-2 py-0.5 rounded-md text-[10px] font-black" style={{ background: `${colorFor(po.status)}18`, color: colorFor(po.status) }}>{po.status}</span></td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Procurement metrics — multi-period */}
                      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
                        <div className="px-5 py-3.5 border-b border-slate-100"><h4 className="text-sm font-black text-slate-800">Procurement Metrics</h4></div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs whitespace-nowrap">
                            <thead><tr className="text-slate-400 font-black uppercase text-[10px] bg-slate-50">
                              <th className="text-left px-5 py-2.5">Indicator</th>
                              {['Today', 'This Week', 'This Month', 'Last Month', 'This Quarter', 'This Year'].map(h => <th key={h} className="text-right px-3 py-2.5">{h}</th>)}
                            </tr></thead>
                            <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                              {(() => {
                                const K = ['today', 'wtd', 'mtd', 'lastMonth', 'qtd', 'ytd'];
                                const rows = [
                                  { name: 'PO Count', src: opsMetrics.po, field: 'c', fmt: fmtNum },
                                  { name: 'PO Value', src: opsMetrics.po, field: 'v', fmt: compactRWF },
                                  { name: 'Goods Received Value', src: opsMetrics.grn, field: 'v', fmt: compactRWF },
                                  { name: 'Supplier Returns', src: opsMetrics.ret, field: 'c', fmt: fmtNum },
                                ];
                                return rows.map((r, i) => (
                                  <tr key={i} className="hover:bg-slate-50/60">
                                    <td className="px-5 py-2.5 font-black text-slate-800">{r.name}</td>
                                    {K.map(k => <td key={k} className="px-3 py-2.5 text-right">{r.fmt(r.src[k][r.field])}</td>)}
                                  </tr>
                                ));
                              })()}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Recent Transactions */}
                      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
                        <div className="px-5 py-3.5 border-b border-slate-100"><h4 className="text-sm font-black text-slate-800">Recent Transactions</h4></div>
                        <div className="overflow-x-auto">
                          {(() => {
                            const q = ovSearch.trim().toLowerCase();
                            const recent = (dashboardData?.recent || []).filter(r => !q || String(r.ref || '').toLowerCase().includes(q) || String(r.vendor || '').toLowerCase().includes(q));
                            if (recent.length === 0) return <p className="text-xs text-slate-400 text-center py-10">No recent transactions.</p>;
                            const typeLabel = { po: 'Purchase Order', grn: 'Goods Receipt', submission: 'Portal Submission' };
                            return (
                              <table className="w-full text-xs">
                                <thead><tr className="text-slate-400 font-black uppercase text-[10px] bg-slate-50">
                                  <th className="text-left px-5 py-2.5">Date</th><th className="text-left px-3 py-2.5">Type</th>
                                  <th className="text-left px-3 py-2.5">Document</th><th className="text-left px-3 py-2.5">Name</th><th className="text-right px-5 py-2.5">Amount</th>
                                </tr></thead>
                                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                                  {recent.map((r, i) => (
                                    <tr key={i} className="hover:bg-slate-50/60">
                                      <td className="px-5 py-2.5 whitespace-nowrap">{r.date ? new Date(r.date).toLocaleDateString() : '—'}</td>
                                      <td className="px-3 py-2.5">{typeLabel[r.type] || r.type}</td>
                                      <td className="px-3 py-2.5 font-black text-slate-700">{r.ref || '—'}</td>
                                      <td className="px-3 py-2.5 truncate max-w-[200px]">{r.vendor || '—'}</td>
                                      <td className="px-5 py-2.5 text-right font-black text-slate-800">{r.amount != null ? fmtRWF(r.amount) : '—'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            );
                          })()}
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'store_requisitions' && (
                <div className="space-y-6">
                  {/* Tab Sub-navigation */}
                  <div className="flex border-b border-slate-200">
                    {[
                      { id: 'list', label: 'Pending Requisitions', icon: ClipboardList },
                      { id: 'catalog', label: 'Browse Approved Catalog', icon: BookOpen },
                      { id: 'create_custom', label: 'Submit Custom Requisition', icon: Plus }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setRequisitionMode(tab.id)}
                        className={`flex items-center gap-2 px-5 py-3 border-b-2 font-black text-xs transition-all cursor-pointer ${
                          requisitionMode === tab.id
                            ? 'border-teal-600 text-teal-700'
                            : 'border-transparent text-slate-400 hover:text-slate-600'
                        }`}
                      >
                        <tab.icon size={14} />
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Budget Utilization Banner */}
                  {requisitionMode !== 'list' && (
                    <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 text-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <p className="font-black text-slate-700">Requisition Budget Check</p>
                        <p className="text-[10px] text-slate-400 font-bold mt-0.5">Please ensure the department has sufficient budget allocation before requesting items.</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <select 
                          value={customReqDept} 
                          onChange={(e) => setCustomReqDept(e.target.value)} 
                          className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                        >
                          {['NURSING', 'PHARMACY', 'LABORATORY', 'DENTAL', 'RADIOLOGY', 'ADMINISTRATION'].map(d => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                        {(() => {
                          const deptBudget = budgets.find(b => b.department_name?.toUpperCase() === customReqDept?.toUpperCase());
                          if (!deptBudget) return <span className="text-[10px] text-slate-400 font-bold">No budget configured.</span>;

                          // calculate spent
                          const now = new Date();
                          const yearStr = String(now.getFullYear());
                          const monthStr = String(now.getMonth() + 1).padStart(2, '0');
                          const spent = requisitions
                            .filter(r => 
                              r.department_name?.toLowerCase() === customReqDept?.toLowerCase() && 
                              ['approved', 'received'].includes(r.status) &&
                              r.created_at?.startsWith(`${yearStr}-${monthStr}`)
                            )
                            .reduce((sum, r) => sum + Number(r.total_amount || 0), 0);

                          const utilization = deptBudget.budget_amount > 0 ? Math.min(100, Math.round((spent / deptBudget.budget_amount) * 100)) : 0;
                          return (
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-500">Utilization:</span>
                              <span className={`font-black ${utilization >= 90 ? 'text-rose-600' : 'text-indigo-600'}`}>{utilization}%</span>
                              <div className="w-24 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                <div className={`h-full ${utilization >= 90 ? 'bg-rose-500' : 'bg-indigo-600'}`} style={{ width: `${utilization}%` }} />
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                  {requisitionMode === 'list' && (
                    <>
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
                                <th className="p-4">Department</th>
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
                                  <td className="p-4 text-slate-750 font-bold">{req.department_name}</td>
                                  <td className="p-4 text-slate-500">{req.created_at ? new Date(req.created_at).toLocaleString() : '—'}</td>
                                  <td className="p-4">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                      req.urgency === 'Urgent' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                                      req.urgency === 'Critical' ? 'bg-red-50 text-red-650 border border-red-100 font-black' :
                                      'bg-slate-50 text-slate-500 border border-slate-100'
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
                                  <td colSpan={8} className="p-12 text-center text-slate-400">
                                    <ClipboardList className="mx-auto opacity-30 mb-2" size={36} />
                                    No store purchase requisitions found.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  )}

                  {requisitionMode === 'catalog' && (
                    <div className="space-y-6">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
                        <div className="relative w-full md:max-w-md">
                          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input 
                            type="text" 
                            placeholder="Search approved catalog..." 
                            value={catalogSearch} 
                            onChange={e => setCatalogSearch(e.target.value)} 
                            className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-2.5 rounded-xl text-xs outline-none focus:border-teal-350 focus:bg-white transition-all" 
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {catalog
                          .filter(item => !catalogSearch || item.item_name.toLowerCase().includes(catalogSearch.toLowerCase()))
                          .map((item) => (
                            <div key={item.id} className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
                              <div>
                                <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded bg-slate-50 text-slate-500 border border-slate-100">{item.category?.replace('_', ' ')}</span>
                                <h4 className="text-xs font-black text-slate-800 mt-2">{item.item_name}</h4>
                                <p className="text-[10px] text-slate-450 mt-1 font-bold">UOM: {item.unit_of_measure || 'Unit'}</p>
                              </div>
                              <div className="flex justify-between items-center pt-2 border-t border-slate-50">
                                <span className="text-xs font-black text-slate-800">
                                  {item.last_unit_price ? `${Number(item.last_unit_price).toLocaleString()} RWF` : 'No price recorded'}
                                </span>
                                <button
                                  onClick={() => handleRequestCatalogItem(item)}
                                  className="flex items-center gap-1 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                                >
                                  <Plus size={13} /> Request Item
                                </button>
                              </div>
                            </div>
                          ))}
                        {catalog.length === 0 && (
                          <div className="col-span-3 text-center text-slate-400 p-8 font-bold">No catalog items configured.</div>
                        )}
                      </div>
                    </div>
                  )}

                  {requisitionMode === 'create_custom' && (
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
                      <h4 className="text-sm font-black text-slate-800 mb-6 uppercase tracking-wider">Submit Purchase Requisition</h4>
                      <form onSubmit={handleCreateRequisitionSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-black text-slate-550 uppercase">Requesting Department</label>
                            <select 
                              value={customReqDept} 
                              onChange={(e) => setCustomReqDept(e.target.value)} 
                              className="bg-slate-50 border border-slate-250 rounded-xl px-3.5 py-3 text-xs outline-none"
                            >
                              {['NURSING', 'PHARMACY', 'LABORATORY', 'DENTAL', 'RADIOLOGY', 'ADMINISTRATION'].map(d => (
                                <option key={d} value={d}>{d}</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-black text-slate-550 uppercase">Urgency Priority</label>
                            <select 
                              value={customReqUrgency} 
                              onChange={(e) => setCustomReqUrgency(e.target.value)} 
                              className="bg-slate-50 border border-slate-250 rounded-xl px-3.5 py-3 text-xs outline-none font-bold"
                            >
                              <option value="Routine">Routine</option>
                              <option value="Urgent">Urgent</option>
                              <option value="Critical">Critical</option>
                            </select>
                          </div>
                        </div>

                        {/* Add items section */}
                        <div className="border-t border-slate-100 pt-6 space-y-4">
                          <h5 className="text-xs font-black text-slate-700 uppercase tracking-wide">Add Items to Request</h5>
                          <div className="grid grid-cols-12 gap-3 items-end">
                            <div className="col-span-6 flex flex-col gap-1.5">
                              <label className="text-[10px] font-black text-slate-400 uppercase">Item Description</label>
                              <input 
                                type="text" 
                                placeholder="Enter item name..." 
                                value={tempReqItemName} 
                                onChange={(e) => setTempReqItemName(e.target.value)} 
                                className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-xs outline-none" 
                              />
                            </div>
                            <div className="col-span-3 flex flex-col gap-1.5">
                              <label className="text-[10px] font-black text-slate-400 uppercase">Quantity</label>
                              <input 
                                type="number" 
                                placeholder="Qty" 
                                value={tempReqItemQty} 
                                onChange={(e) => setTempReqItemQty(e.target.value)} 
                                className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-xs outline-none" 
                              />
                            </div>
                            <div className="col-span-3 flex flex-col gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  if (!tempReqItemName || !tempReqItemQty) return;
                                  setCustomReqItems(prev => [...prev, {
                                    item_name: tempReqItemName,
                                    quantity: Number(tempReqItemQty),
                                    unit: tempReqItemUom
                                  }]);
                                  setTempReqItemName('');
                                  setTempReqItemQty('');
                                }}
                                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2.5 rounded-xl cursor-pointer"
                              >
                                Add Line
                              </button>
                            </div>
                          </div>

                          {/* Items Cart */}
                          {customReqItems.length > 0 && (
                            <div className="border border-slate-150 rounded-2xl overflow-hidden mt-3">
                              <table className="w-full text-xs">
                                <thead className="bg-slate-50 text-slate-500 font-bold">
                                  <tr>
                                    <th className="p-3 text-left">Item Description</th>
                                    <th className="p-3 text-center">Quantity</th>
                                    <th className="p-3 text-center">UOM</th>
                                    <th className="p-3 text-center">Remove</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {customReqItems.map((item, idx) => (
                                    <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50/50">
                                      <td className="p-3 font-bold text-slate-800">{item.item_name}</td>
                                      <td className="p-3 text-center">{item.quantity}</td>
                                      <td className="p-3 text-center text-slate-450">{item.unit || 'Unit'}</td>
                                      <td className="p-3 text-center">
                                        <button 
                                          type="button" 
                                          onClick={() => setCustomReqItems(prev => prev.filter((_, i) => i !== idx))} 
                                          className="text-rose-500 hover:text-rose-700 cursor-pointer"
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-1.5 pt-4">
                          <label className="text-xs font-black text-slate-550 uppercase">Notes / Special Instructions</label>
                          <textarea 
                            placeholder="Provide details about supplier preferences, specifications, or urgency..." 
                            rows={3} 
                            value={customReqNotes} 
                            onChange={(e) => setCustomReqNotes(e.target.value)} 
                            className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs outline-none focus:border-teal-350 focus:bg-white transition-all" 
                          />
                        </div>

                        <div className="border-t border-slate-100 pt-6 flex justify-end gap-2">
                          <button 
                            type="button" 
                            onClick={() => setRequisitionMode('list')} 
                            className="bg-white border border-slate-200 text-slate-650 hover:bg-slate-50 px-5 py-2.5 rounded-xl font-bold text-xs cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button 
                            type="submit" 
                            className="bg-teal-650 hover:bg-teal-700 text-white px-6 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer"
                          >
                            Submit Requisition
                          </button>
                        </div>
                      </form>
                    </div>
                  )}
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

              {/* ─── TAB: CENTRAL STORE STOCK ─── */}
              {activeTab === 'central_stock' && (() => {
                const q = stockSearch.trim().toLowerCase();
                const rows = masterInventory
                  .filter(r => Number(r.quantity) > 0)
                  .filter(r => !q || String(r.name || '').toLowerCase().includes(q) || String(r.sku || '').toLowerCase().includes(q) || String(r.category || '').toLowerCase().includes(q) || String(r.vendor || '').toLowerCase().includes(q));
                const daysTo = (d) => d ? Math.ceil((new Date(d) - new Date()) / 86400000) : null;
                const totalUnits = rows.reduce((s, r) => s + Number(r.quantity || 0), 0);
                const totalValue = rows.reduce((s, r) => s + Number(r.quantity || 0) * Number(r.price || 0), 0);
                const expiringSoon = rows.filter(r => { const d = daysTo(r.expiry_date); return d !== null && d <= 90; }).length;
                return (
                  <div className="space-y-6">
                    {/* Summary chips */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      {[
                        { label: 'Stock lines (batches)', value: fmtNum(rows.length), icon: Database, tone: 'text-teal-600 bg-teal-50 border-teal-100' },
                        { label: 'Units in stock', value: fmtNum(totalUnits), icon: Boxes, tone: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
                        { label: 'Stock value', value: compactRWF(totalValue), icon: DollarSign, tone: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
                        { label: 'Expiring ≤ 90 days', value: fmtNum(expiringSoon), icon: AlertTriangle, tone: 'text-rose-600 bg-rose-50 border-rose-100' },
                      ].map((c, i) => (
                        <div key={i} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${c.tone}`}><c.icon size={18} /></div>
                          <div>
                            <p className="text-lg font-black text-slate-800 leading-none">{c.value}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">{c.label}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Search */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row gap-3 items-center">
                      <div className="relative w-full md:max-w-md">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input value={stockSearch} onChange={e => setStockSearch(e.target.value)} placeholder="Search item, SKU, category or vendor…"
                          className="w-full bg-slate-50 border border-slate-200 pl-9 pr-3 py-2 rounded-xl text-xs outline-none focus:border-teal-300 focus:bg-white" />
                      </div>
                      <p className="text-[11px] font-bold text-slate-400 md:ml-auto">Central Store stock-in-hand · batch level</p>
                    </div>

                    {/* Table */}
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs whitespace-nowrap">
                          <thead><tr className="bg-slate-50 text-slate-400 font-black uppercase text-[10px]">
                            <th className="text-left px-4 py-2.5">Item</th><th className="text-left px-3 py-2.5">SKU</th>
                            <th className="text-left px-3 py-2.5">Category</th><th className="text-left px-3 py-2.5">Batch</th>
                            <th className="text-left px-3 py-2.5">Expiry</th><th className="text-right px-3 py-2.5">Unit Price</th>
                            <th className="text-right px-3 py-2.5">In Store</th><th className="text-right px-3 py-2.5">Distributed</th>
                            <th className="text-left px-3 py-2.5">Vendor</th><th className="text-left px-4 py-2.5">Storage</th>
                          </tr></thead>
                          <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                            {rows.length === 0 && (
                              <tr><td colSpan={10} className="p-10 text-center text-slate-400"><Database className="mx-auto opacity-30 mb-2" size={32} />No stock in the Central Store{q ? ' matching your search' : ''}.</td></tr>
                            )}
                            {rows.map((r, i) => {
                              const d = daysTo(r.expiry_date);
                              const expClass = d === null ? 'text-slate-400' : d <= 30 ? 'text-rose-600 font-black' : d <= 90 ? 'text-amber-600 font-black' : 'text-slate-500';
                              return (
                                <tr key={i} className="hover:bg-slate-50/60">
                                  <td className="px-4 py-2.5 font-black text-slate-800 max-w-[220px] truncate">{r.name}</td>
                                  <td className="px-3 py-2.5 text-slate-400">{r.full_sku || r.sku || '—'}</td>
                                  <td className="px-3 py-2.5">{r.category || '—'}</td>
                                  <td className="px-3 py-2.5">{r.batch_number || '—'}</td>
                                  <td className={`px-3 py-2.5 ${expClass}`}>{r.expiry_date ? new Date(r.expiry_date).toLocaleDateString() : '—'}{d !== null && d <= 90 && <span className="ml-1 text-[9px]">({d}d)</span>}</td>
                                  <td className="px-3 py-2.5 text-right">{fmtRWF(r.price)}</td>
                                  <td className="px-3 py-2.5 text-right font-black text-slate-800">{fmtNum(r.quantity)}</td>
                                  <td className="px-3 py-2.5 text-right text-slate-400">{fmtNum(r.distributed_quantity)}</td>
                                  <td className="px-3 py-2.5 max-w-[160px] truncate">{r.vendor || '—'}</td>
                                  <td className="px-4 py-2.5">{r.storage || '—'}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* ─── TAB: DEPARTMENTAL STOCKS ─── */}
              {activeTab === 'department_stocks' && (() => {
                const q = stockSearch.trim().toLowerCase();
                const deptNames = [...new Set(distributedStock.map(r => r.department).filter(Boolean))].sort();
                const rows = distributedStock
                  .filter(r => stockDeptFilter === 'all' || r.department === stockDeptFilter)
                  .filter(r => !q || String(r.name || '').toLowerCase().includes(q) || String(r.sku || '').toLowerCase().includes(q) || String(r.category || '').toLowerCase().includes(q) || String(r.department || '').toLowerCase().includes(q));
                const totalUnits = rows.reduce((s, r) => s + Number(r.quantity || 0), 0);
                return (
                  <div className="space-y-6">
                    {/* Summary chips */}
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                      {[
                        { label: 'Departments holding stock', value: fmtNum(deptNames.length), icon: Building, tone: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
                        { label: 'Stock lines', value: fmtNum(rows.length), icon: ListChecks, tone: 'text-teal-600 bg-teal-50 border-teal-100' },
                        { label: 'Units across departments', value: fmtNum(totalUnits), icon: Boxes, tone: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
                      ].map((c, i) => (
                        <div key={i} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${c.tone}`}><c.icon size={18} /></div>
                          <div>
                            <p className="text-lg font-black text-slate-800 leading-none">{c.value}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">{c.label}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Filters */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row gap-3 items-center">
                      <select value={stockDeptFilter} onChange={e => setStockDeptFilter(e.target.value)}
                        className="w-full md:w-56 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs outline-none focus:border-teal-300">
                        <option value="all">All departments</option>
                        {deptNames.map((d, i) => <option key={i} value={d}>{d}</option>)}
                      </select>
                      <div className="relative w-full md:max-w-md">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input value={stockSearch} onChange={e => setStockSearch(e.target.value)} placeholder="Search item, SKU or category…"
                          className="w-full bg-slate-50 border border-slate-200 pl-9 pr-3 py-2 rounded-xl text-xs outline-none focus:border-teal-300 focus:bg-white" />
                      </div>
                      <p className="text-[11px] font-bold text-slate-400 md:ml-auto">Stock distributed out of Central Store</p>
                    </div>

                    {/* Table */}
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
                      {loadingDistStock ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
                          <p className="text-xs text-slate-400 font-semibold">Loading departmental stock…</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs whitespace-nowrap">
                            <thead><tr className="bg-slate-50 text-slate-400 font-black uppercase text-[10px]">
                              <th className="text-left px-4 py-2.5">Department</th><th className="text-left px-3 py-2.5">Item</th>
                              <th className="text-left px-3 py-2.5">SKU</th><th className="text-left px-3 py-2.5">Category</th>
                              <th className="text-left px-3 py-2.5">Batch</th><th className="text-left px-3 py-2.5">Expiry</th>
                              <th className="text-right px-3 py-2.5">Qty</th><th className="text-left px-4 py-2.5">Vendor</th>
                            </tr></thead>
                            <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                              {rows.length === 0 && (
                                <tr><td colSpan={8} className="p-10 text-center text-slate-400"><Boxes className="mx-auto opacity-30 mb-2" size={32} />No departmental stock{q || stockDeptFilter !== 'all' ? ' matching your filters' : ' recorded yet'}.</td></tr>
                              )}
                              {rows.map((r, i) => (
                                <tr key={i} className="hover:bg-slate-50/60">
                                  <td className="px-4 py-2.5 font-black text-teal-700">{r.department || '—'}</td>
                                  <td className="px-3 py-2.5 font-black text-slate-800 max-w-[220px] truncate">{r.name}</td>
                                  <td className="px-3 py-2.5 text-slate-400">{r.sku || '—'}</td>
                                  <td className="px-3 py-2.5">{r.category || '—'}</td>
                                  <td className="px-3 py-2.5">{r.batch_number || '—'}</td>
                                  <td className="px-3 py-2.5 text-slate-500">{r.expiry_date ? new Date(r.expiry_date).toLocaleDateString() : '—'}</td>
                                  <td className="px-3 py-2.5 text-right font-black text-slate-800">{fmtNum(r.quantity)}</td>
                                  <td className="px-4 py-2.5 max-w-[160px] truncate">{r.vendor || '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

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
                            <tr 
                              key={vendor.id} 
                              onClick={() => { loadVendorProfile(vendor); fetchSupplierPerformance(vendor.id); }}
                              className="hover:bg-slate-50/50 transition-all cursor-pointer group"
                            >
                              <td className="p-4 font-bold text-slate-400">#VEN-{vendor.id}</td>
                              <td className="p-4 font-black text-slate-800 group-hover:text-teal-700">{vendor.name}</td>
                              <td className="p-4 text-slate-500">{vendor.contact || '—'}</td>
                              <td className="p-4 text-slate-500">{vendor.contract_terms || 'Net 30'}</td>
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

              {/* ─── TAB: INVOICING & ACCOUNTS PAYABLE ─── */}
              {activeTab === 'invoices' && (
                <div className="space-y-6">
                  {selectedInvoice ? (
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6">
                      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                        <div>
                          <h3 className="text-lg font-black text-slate-900">Invoice #{selectedInvoice.invoice_no || selectedInvoice.id}</h3>
                          <p className="text-xs text-slate-400 font-bold">{selectedInvoice.vendor_name} • {selectedInvoice.invoice_date?.substring(0,10)}</p>
                        </div>
                        <button onClick={() => setSelectedInvoice(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer"><X size={20} /></button>
                      </div>

                      {loadingInvoice ? (
                        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-teal-650" size={30} /></div>
                      ) : invoiceDetail && (
                        <div className="space-y-6">
                          {/* Status badges */}
                          <div className="flex flex-wrap gap-2">
                            {[['status', selectedInvoice.status], ['match', selectedInvoice.match_status]].map(([k, v]) => (
                              <span key={k} className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                                v === 'matched' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                v === 'discrepancy' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                v === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                v === 'paid' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                v === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                                'bg-amber-50 text-amber-700 border-amber-200'
                              }`}>{v}</span>
                            ))}
                          </div>

                          {/* Info grid */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                              ['Vendor', invoiceDetail.vendor_name || '—'],
                              ['PO Ref', invoiceDetail.po_reference || '—'],
                              ['GRN Ref', invoiceDetail.grn_reference || '—'],
                              ['Due Date', invoiceDetail.due_date ? invoiceDetail.due_date.substring(0,10) : '—'],
                              ['Subtotal', `${Number(invoiceDetail.subtotal||0).toLocaleString()} RWF`],
                              ['Tax', `${Number(invoiceDetail.tax_amount||0).toLocaleString()} RWF`],
                              ['Total', `${Number(invoiceDetail.total_amount||0).toLocaleString()} RWF`],
                              ['Terms', invoiceDetail.payment_terms || '—'],
                            ].map(([label, value]) => (
                              <div key={label} className="bg-slate-50 rounded-2xl p-3">
                                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p>
                                <p className="text-sm font-black text-slate-800 mt-1">{value}</p>
                              </div>
                            ))}
                          </div>

                          {/* Line items */}
                          <div>
                            <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-3">Line Items</h4>
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead><tr className="bg-slate-50 text-slate-500 font-black uppercase text-[10px]">
                                  <th className="p-3 text-left">Item</th>
                                  <th className="p-3 text-center">Inv Qty</th>
                                  <th className="p-3 text-center">PO Qty</th>
                                  <th className="p-3 text-center">GRN Qty</th>
                                  <th className="p-3 text-right">Unit Price</th>
                                  <th className="p-3 text-right">Total</th>
                                  <th className="p-3 text-center">Match</th>
                                </tr></thead>
                                <tbody>
                                  {(invoiceDetail.line_items || []).map((item, idx) => {
                                    const discrepancy = threeWayMatch?.match_rows?.find(r => r.item_name?.toLowerCase() === item.item_name?.toLowerCase())?.discrepancy;
                                    return (
                                      <tr key={idx} className={`border-b border-slate-50 ${discrepancy ? 'bg-rose-50/40' : ''}`}>
                                        <td className="p-3 font-bold text-slate-800">{item.item_name}</td>
                                        <td className="p-3 text-center">{item.quantity}</td>
                                        <td className="p-3 text-center text-slate-400">{item.po_quantity ?? '—'}</td>
                                        <td className="p-3 text-center text-slate-400">{item.grn_quantity ?? '—'}</td>
                                        <td className="p-3 text-right">{Number(item.unit_price||0).toLocaleString()}</td>
                                        <td className="p-3 text-right font-bold">{Number(item.total_price||0).toLocaleString()}</td>
                                        <td className="p-3 text-center">{discrepancy ? <span className="text-rose-600 font-black">⚠</span> : <span className="text-emerald-600">✓</span>}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* Actions */}
                          {!['paid','rejected'].includes(selectedInvoice.status) && (
                            <div className="flex flex-wrap gap-2 pt-2">
                              {selectedInvoice.status === 'draft' && (
                                <button onClick={async () => {
                                  await api.put(`/clinical/inventory/invoices/${selectedInvoice.id}/status`, { status: 'submitted' });
                                  toast.success('Invoice submitted for review.');
                                  loadData(true);
                                  setSelectedInvoice(prev => ({ ...prev, status: 'submitted' }));
                                }} className="bg-teal-650 text-white px-4 py-2 rounded-xl font-bold text-xs cursor-pointer hover:bg-teal-700">Submit for Review</button>
                              )}
                              {selectedInvoice.status === 'submitted' && (
                                <>
                                  <button onClick={async () => {
                                    await api.put(`/clinical/inventory/invoices/${selectedInvoice.id}/status`, { status: 'approved' });
                                    toast.success('Invoice approved.'); loadData(true);
                                    setSelectedInvoice(prev => ({ ...prev, status: 'approved' }));
                                  }} className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold text-xs cursor-pointer">Approve</button>
                                  <button onClick={async () => {
                                    const reason = prompt('Rejection reason:');
                                    if (!reason) return;
                                    await api.put(`/clinical/inventory/invoices/${selectedInvoice.id}/status`, { status: 'rejected', rejection_reason: reason });
                                    toast.success('Invoice rejected.'); loadData(true);
                                    setSelectedInvoice(prev => ({ ...prev, status: 'rejected' }));
                                  }} className="bg-rose-500 text-white px-4 py-2 rounded-xl font-bold text-xs cursor-pointer">Reject</button>
                                </>
                              )}
                              {selectedInvoice.status === 'approved' && (
                                <button onClick={async () => {
                                  await api.put(`/clinical/inventory/invoices/${selectedInvoice.id}/status`, { status: 'paid' });
                                  toast.success('Payment recorded.'); loadData(true);
                                  setSelectedInvoice(prev => ({ ...prev, status: 'paid' }));
                                }} className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-xs cursor-pointer">Mark as Paid</button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      {/* Filters & Header */}
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
                        <div className="flex gap-3 flex-wrap">
                          <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input type="text" placeholder="Search invoices..." value={invoiceSearch} onChange={e => setInvoiceSearch(e.target.value)} className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-teal-350 w-56" />
                          </div>
                          <select value={invoiceStatusFilter} onChange={e => setInvoiceStatusFilter(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl text-xs px-3 py-2 outline-none">
                            <option value="">All Statuses</option>
                            {['draft','submitted','under_review','approved','rejected','paid'].map(s => (
                              <option key={s} value={s}>{s.replace('_', ' ')}</option>
                            ))}
                          </select>
                        </div>
                        <button onClick={() => setShowCreateInvoiceModal(true)} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-md cursor-pointer">
                          <Plus size={15} /> New Invoice
                        </button>
                      </div>

                      {/* Invoices Table */}
                      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-gradient-to-r from-slate-50 to-slate-100 text-slate-500 font-black uppercase text-[10px] tracking-wider">
                              <th className="p-4 text-left">Invoice #</th>
                              <th className="p-4 text-left">Vendor</th>
                              <th className="p-4 text-left">Date</th>
                              <th className="p-4 text-left">Due</th>
                              <th className="p-4 text-right">Total</th>
                              <th className="p-4 text-center">Status</th>
                              <th className="p-4 text-center">Match</th>
                              <th className="p-4 text-center">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {invoices
                              .filter(i => (!invoiceStatusFilter || i.status === invoiceStatusFilter) && (!invoiceSearch || i.invoice_no?.toLowerCase().includes(invoiceSearch.toLowerCase()) || i.vendor_name?.toLowerCase().includes(invoiceSearch.toLowerCase())))
                              .map((inv, idx) => (
                                <tr key={inv.id} className={`border-b border-slate-50 hover:bg-slate-50/60 transition-colors ${idx % 2 === 0 ? '' : 'bg-slate-50/20'}`}>
                                  <td className="p-4 font-black text-slate-800">{inv.invoice_no || `INV-${inv.id}`}</td>
                                  <td className="p-4 text-slate-600">{inv.vendor_name || '—'}</td>
                                  <td className="p-4 text-slate-500">{inv.invoice_date?.substring(0,10) || '—'}</td>
                                  <td className="p-4 text-slate-500">{inv.due_date?.substring(0,10) || '—'}</td>
                                  <td className="p-4 text-right font-bold text-slate-800">{Number(inv.total_amount||0).toLocaleString()} RWF</td>
                                  <td className="p-4 text-center">
                                    <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase ${
                                      inv.status === 'paid' ? 'bg-blue-50 text-blue-700' :
                                      inv.status === 'approved' ? 'bg-emerald-50 text-emerald-700' :
                                      inv.status === 'rejected' ? 'bg-red-50 text-red-700' :
                                      inv.status === 'submitted' ? 'bg-teal-50 text-teal-700' :
                                      'bg-amber-50 text-amber-700'
                                    }`}>{inv.status}</span>
                                  </td>
                                  <td className="p-4 text-center">
                                    <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase ${
                                      inv.match_status === 'matched' ? 'bg-emerald-50 text-emerald-700' :
                                      inv.match_status === 'discrepancy' ? 'bg-rose-50 text-rose-700' :
                                      'bg-slate-100 text-slate-500'
                                    }`}>{inv.match_status || 'unmatched'}</span>
                                  </td>
                                  <td className="p-4 text-center">
                                    <button onClick={() => loadInvoiceDetail(inv)} className="text-teal-650 hover:text-teal-800 font-bold text-xs cursor-pointer">View</button>
                                  </td>
                                </tr>
                              ))
                            }
                            {invoices.length === 0 && (
                              <tr><td colSpan={8} className="p-12 text-center text-slate-400 text-xs font-bold">No invoices yet. Click 'New Invoice' to capture your first AP invoice.</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ─── TAB: ANALYTICS & REPORTING ─── */}
              {activeTab === 'analytics' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-black text-slate-800">Procurement Analytics</h3>
                    <div className="flex items-center gap-3">
                      <select value={analyticsYear} onChange={e => { setAnalyticsYear(e.target.value); setTimeout(loadAnalytics, 100); }} className="bg-white border border-slate-200 rounded-xl text-xs px-3 py-2 outline-none">
                        {[2023,2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                      <button onClick={loadAnalytics} className="flex items-center gap-1.5 bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer">
                        <RefreshCw size={13} /> Refresh
                      </button>
                    </div>
                  </div>

                  {loadingAnalytics ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                      <Loader2 className="animate-spin text-indigo-600" size={36} />
                      <p className="text-xs font-bold text-slate-400 animate-pulse">Compiling analytics...</p>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      {/* Spend by Department */}
                      {analyticsData && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
                            <h4 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2"><Banknote size={16} className="text-indigo-600" /> Spend by Department ({analyticsYear})</h4>
                            {analyticsData.by_department.length === 0 ? (
                              <p className="text-xs text-slate-400 py-8 text-center">No requisition data for this period.</p>
                            ) : (
                              <div className="space-y-3">
                                {analyticsData.by_department.map((dept, i) => {
                                  const max = Math.max(1, ...analyticsData.by_department.map(d => Number(d.total_spend||0)));
                                  const pct = Math.min(100, Math.round((Number(dept.total_spend||0) / max) * 100));
                                  return (
                                    <div key={i}>
                                      <div className="flex justify-between text-xs mb-1">
                                        <span className="font-bold text-slate-700">{dept.department}</span>
                                        <span className="font-black text-slate-800">{Number(dept.total_spend||0).toLocaleString()} RWF</span>
                                      </div>
                                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                                      </div>
                                      <div className="flex gap-4 mt-1 text-[10px] text-slate-400 font-bold">
                                        <span>{dept.total_requisitions} reqs</span>
                                        <span className="text-emerald-600">{dept.approved_count} approved</span>
                                        <span className="text-rose-500">{dept.rejected_count} rejected</span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
                            <h4 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2"><TrendingUp size={16} className="text-indigo-600" /> PO Spend by Month</h4>
                            {analyticsData.by_month.length === 0 ? (
                              <p className="text-xs text-slate-400 py-8 text-center">No PO spend data for {analyticsYear}.</p>
                            ) : (
                              <div className="space-y-2">
                                {analyticsData.by_month.map((m, i) => {
                                  const max = Math.max(1, ...analyticsData.by_month.map(x => Number(x.total||0)));
                                  const pct = Math.min(100, Math.round((Number(m.total||0) / max) * 100));
                                  return (
                                    <div key={i}>
                                      <div className="flex justify-between text-xs mb-1">
                                        <span className="font-bold text-slate-600">{m.month}</span>
                                        <span className="font-black text-slate-800">{Number(m.total||0).toLocaleString()} RWF</span>
                                      </div>
                                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-teal-600 to-teal-400 rounded-full" style={{ width: `${pct}%` }} />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Supplier Leaderboard */}
                      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
                        <h4 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2"><Star size={16} className="text-amber-500" /> Supplier Leaderboard</h4>
                        {supplierLeaderboard.length === 0 ? (
                          <p className="text-xs text-slate-400 py-8 text-center">No supplier spend data yet.</p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead><tr className="bg-slate-50 text-slate-500 font-black uppercase text-[10px] tracking-wider">
                                <th className="p-3 text-left">#</th>
                                <th className="p-3 text-left">Supplier</th>
                                <th className="p-3 text-center">POs</th>
                                <th className="p-3 text-center">GRNs</th>
                                <th className="p-3 text-right">Total Spend</th>
                                <th className="p-3 text-center">Avg Rating</th>
                              </tr></thead>
                              <tbody>
                                {supplierLeaderboard.slice(0,10).map((s, i) => (
                                  <tr key={s.id} className="border-b border-slate-50">
                                    <td className="p-3 font-black text-slate-400">#{i+1}</td>
                                    <td className="p-3 font-bold text-slate-800">{s.name}</td>
                                    <td className="p-3 text-center text-slate-600">{s.total_pos}</td>
                                    <td className="p-3 text-center text-slate-600">{s.total_grns}</td>
                                    <td className="p-3 text-right font-black text-slate-800">{Number(s.total_spend||0).toLocaleString()} RWF</td>
                                    <td className="p-3 text-center">
                                      <span className="flex items-center justify-center gap-1">
                                        <Star size={11} className="text-amber-400 fill-amber-400" />
                                        <span className="font-black">{Number(s.avg_rating||0).toFixed(1)}</span>
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>

                      {/* Expiring Contracts */}
                      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
                        <h4 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2"><AlertOctagon size={16} className="text-rose-500" /> Contracts Expiring in 90 Days</h4>
                        {expiringContracts.length === 0 ? (
                          <p className="text-xs text-slate-400 py-8 text-center">No contracts expiring in the next 90 days. 🎉</p>
                        ) : (
                          <div className="space-y-3">
                            {expiringContracts.map((c, i) => (
                              <div key={i} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 hover:border-rose-200 hover:bg-rose-50/30 transition-all">
                                <div>
                                  <p className="text-xs font-black text-slate-800">{c.title}</p>
                                  <p className="text-[10px] text-slate-400 font-bold">{c.vendor_name} • {c.contract_no || 'No ref'}</p>
                                </div>
                                <span className="text-xs font-black text-rose-600">{c.end_date?.substring(0,10)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Invoice AP Analytics */}
                      {invoiceAnalytics && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
                            <h4 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2"><Receipt size={16} className="text-purple-600" /> AP Invoices by Status</h4>
                            <div className="space-y-2">
                              {invoiceAnalytics.by_status.map((s, i) => (
                                <div key={i} className="flex justify-between items-center text-xs py-2 border-b border-slate-50">
                                  <span className="font-bold text-slate-700 capitalize">{s.status}</span>
                                  <div className="flex gap-4">
                                    <span className="text-slate-500">{s.count} invoices</span>
                                    <span className="font-black text-slate-800">{Number(s.total||0).toLocaleString()} RWF</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
                            <h4 className="text-sm font-black text-slate-800 mb-4">Overdue Invoices Alert</h4>
                            <div className={`p-4 rounded-2xl ${Number(invoiceAnalytics.overdue?.count||0) > 0 ? 'bg-rose-50 border border-rose-200' : 'bg-emerald-50 border border-emerald-200'}`}>
                              <p className={`text-2xl font-black ${Number(invoiceAnalytics.overdue?.count||0) > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>{invoiceAnalytics.overdue?.count || 0} Overdue</p>
                              <p className="text-xs font-bold text-slate-500 mt-1">{Number(invoiceAnalytics.overdue?.total||0).toLocaleString()} RWF outstanding</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ─── TAB: PROCUREMENT CATALOG ─── */}
              {activeTab === 'catalog' && (
                <div className="space-y-6">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
                    <div className="flex gap-3 flex-wrap">
                      <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="text" placeholder="Search catalog..." value={catalogSearch} onChange={e => setCatalogSearch(e.target.value)} className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none w-56" />
                      </div>
                      <select value={catalogCategory} onChange={e => setCatalogCategory(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl text-xs px-3 py-2 outline-none">
                        <option value="">All Categories</option>
                        {['medical_supplies','pharmaceuticals','equipment','laboratory','office','maintenance','other'].map(c => (
                          <option key={c} value={c}>{c.replace('_', ' ')}</option>
                        ))}
                      </select>
                    </div>
                    <button onClick={() => setShowAddCatalogModal(true)} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-md cursor-pointer">
                      <Plus size={15} /> Add Item
                    </button>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
                    <table className="w-full text-xs">
                      <thead><tr className="bg-gradient-to-r from-slate-50 to-slate-100 text-slate-500 font-black uppercase text-[10px] tracking-wider">
                        <th className="p-4 text-left">Item Name</th>
                        <th className="p-4 text-left">Category</th>
                        <th className="p-4 text-left">UOM</th>
                        <th className="p-4 text-left">Preferred Vendor</th>
                        <th className="p-4 text-right">Last Price (RWF)</th>
                        <th className="p-4 text-center">Status</th>
                      </tr></thead>
                      <tbody>
                        {catalog
                          .filter(c => (!catalogCategory || c.category === catalogCategory) && (!catalogSearch || c.item_name.toLowerCase().includes(catalogSearch.toLowerCase())))
                          .map((item, i) => (
                            <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                              <td className="p-4 font-bold text-slate-800">{item.item_name}</td>
                              <td className="p-4"><span className="px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase">{item.category?.replace('_',' ')}</span></td>
                              <td className="p-4 text-slate-500">{item.unit_of_measure || 'Unit'}</td>
                              <td className="p-4 text-slate-600">{item.preferred_vendor_name || '—'}</td>
                              <td className="p-4 text-right font-bold">{item.last_unit_price ? Number(item.last_unit_price).toLocaleString() : '—'}</td>
                              <td className="p-4 text-center">
                                <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase ${item.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>{item.is_active ? 'Active' : 'Inactive'}</span>
                              </td>
                            </tr>
                          ))
                        }
                        {catalog.length === 0 && (
                          <tr><td colSpan={6} className="p-12 text-center text-slate-400 text-xs font-bold">No catalog items yet. Add approved items for use in requisitions.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ─── TAB: DEPARTMENT BUDGETS ─── */}
              {activeTab === 'budgets' && (
                <div className="space-y-6">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white border border-slate-200 rounded-3xl p-6 shadow-xs animate-none">
                    <div>
                      <h3 className="text-sm font-black text-slate-800">Department Budgets</h3>
                      <p className="text-xs text-slate-400 font-bold mt-0.5">Track department budget allocations and real-time spending utilization.</p>
                    </div>
                    <button 
                      onClick={() => setShowAddBudgetModal(true)}
                      className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-md cursor-pointer"
                    >
                      <Plus size={15} /> Set Budget
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {budgets.map((b) => {
                      // Calculate spent this month dynamically from requisitions list
                      const now = new Date();
                      const yearStr = String(now.getFullYear());
                      const monthStr = String(now.getMonth() + 1).padStart(2, '0');
                      const spent = requisitions
                        .filter(r => 
                          r.department_name?.toLowerCase() === b.department_name?.toLowerCase() && 
                          ['approved', 'received'].includes(r.status) &&
                          r.created_at?.startsWith(`${yearStr}-${monthStr}`)
                        )
                        .reduce((sum, r) => sum + Number(r.total_amount || 0), 0);

                      const utilization = b.budget_amount > 0 ? Math.min(100, Math.round((spent / b.budget_amount) * 100)) : 0;
                      const remaining = Math.max(0, b.budget_amount - spent);

                      return (
                        <div key={b.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4 hover:shadow-md transition-all">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="text-xs font-black text-slate-800">{b.department_name}</h4>
                              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{b.period_type} • {b.period_year}-{b.period_month || 'ALL'}</p>
                            </div>
                            <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                              <Banknote size={18} />
                            </span>
                          </div>

                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between">
                              <span className="text-slate-400 font-bold">Budget Limit</span>
                              <span className="font-black text-slate-800">{Number(b.budget_amount).toLocaleString()} RWF</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400 font-bold">Spent (This Month)</span>
                              <span className="font-black text-slate-800">{spent.toLocaleString()} RWF</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400 font-bold">Remaining</span>
                              <span className={`font-black ${remaining === 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{remaining.toLocaleString()} RWF</span>
                            </div>
                          </div>

                          <div className="space-y-1 pt-2">
                            <div className="flex justify-between text-[10px] font-black text-slate-450 uppercase">
                              <span>Utilization</span>
                              <span>{utilization}%</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${
                                  utilization >= 90 ? 'bg-rose-500' :
                                  utilization >= 75 ? 'bg-amber-500' : 'bg-indigo-600'
                                }`}
                                style={{ width: `${utilization}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {budgets.length === 0 && (
                      <div className="col-span-3 bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-400 text-xs font-bold">
                        <Banknote className="mx-auto opacity-30 mb-2" size={36} />
                        No budgets configured yet. Click "Set Budget" to configure department limits.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'tenders' && (
                <div className="space-y-6">
                  {/* Detailed RFQ comparative matrix view */}
                  {selectedRFQ ? (
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6 animate-none">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-100">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-md bg-teal-50 text-teal-700 border border-teal-150">
                              {rfqDetails?.rfq.category ? rfqDetails.rfq.category.replace('_', ' ') : 'Category'}
                            </span>
                            <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-md ${
                              rfqDetails?.rfq.status === 'Draft' ? 'bg-slate-100 text-slate-650' :
                              rfqDetails?.rfq.status === 'Collecting' ? 'bg-amber-50 text-amber-700 border border-amber-150' :
                              rfqDetails?.rfq.status === 'UnderReview' ? 'bg-indigo-50 text-indigo-700 border border-indigo-150' :
                              rfqDetails?.rfq.status === 'Awarded' ? 'bg-teal-50 text-teal-700 border border-teal-150' :
                              'bg-emerald-50 text-emerald-700 border border-emerald-150'
                            }`}>
                              {rfqDetails?.rfq.status}
                            </span>
                          </div>
                          <h2 className="text-xl font-black text-slate-900 mt-2">{rfqDetails?.rfq.title}</h2>
                          <p className="text-xs text-slate-400 font-bold mt-1">Ref: {rfqDetails?.rfq.reference_no} • Location: {rfqDetails?.rfq.location} • Created: {rfqDetails?.rfq.created_at ? new Date(rfqDetails.rfq.created_at).toLocaleDateString() : ''}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => { setSelectedRFQ(null); setRfqDetails(null); }}
                            className="bg-white border border-slate-200 text-slate-600 hover:text-teal-700 hover:border-teal-300 px-4 py-2.5 rounded-xl font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <ArrowLeft size={14} /> Back to Tenders
                          </button>
                          {rfqDetails?.rfq.status === 'UnderReview' && (
                            <button
                              onClick={handleGeneratePOsSubmit}
                              disabled={generatingPOs}
                              title="Creates one draft Purchase Order per winning vendor from the saved awards"
                              className="bg-teal-650 text-white hover:bg-teal-700 px-5 py-2.5 rounded-xl font-bold text-xs shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-wait"
                            >
                              {generatingPOs ? <Loader2 size={14} className="animate-spin" /> : <ShoppingCart size={14} />}
                              {generatingPOs ? 'Generating POs…' : 'Auto-Generate POs'}
                            </button>
                          )}
                          {(rfqDetails?.rfq.status === 'Awarded' || rfqDetails?.rfq.status === 'Closed') && (
                            <button
                              onClick={() => setActiveTab('purchase_orders')}
                              className="bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 px-4 py-2.5 rounded-xl font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                              <CheckCircle2 size={14} /> POs Generated — View
                            </button>
                          )}
                        </div>
                      </div>

                      {rfqDetails?.rfq.notes && (
                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-slate-650 text-xs leading-relaxed font-bold">
                          <p className="text-[10px] font-black text-slate-450 uppercase tracking-wider mb-1">Notes / Instructions</p>
                          {rfqDetails.rfq.notes}
                        </div>
                      )}

                      {loadingRFQDetails ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                          <Loader2 className="h-10 w-10 animate-spin text-teal-650" />
                          <p className="text-xs font-bold text-slate-450 animate-pulse">Loading Comparative Pricing Matrix...</p>
                        </div>
                      ) : (
                        <div className="space-y-8 animate-none">
                          {/* Comparative Pricing Table (Tableau Comparatif) */}
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Comparative Matrix (Tableau Comparatif des Prix)</h3>
                              <span className="text-[11px] font-bold text-teal-600">Lowest quoted prices are highlighted</span>
                            </div>
                            <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                              <table className="min-w-full text-xs text-left divide-y divide-slate-150">
                                <thead className="bg-slate-50 text-[10px] uppercase font-black text-slate-450 tracking-wider">
                                  <tr>
                                    <th className="p-4 w-12 text-center">N°</th>
                                    <th className="p-4 min-w-[200px]">Item Description</th>
                                    <th className="p-4 text-center w-20">Qty</th>
                                    <th className="p-4 text-center w-20">Unit</th>
                                    
                                    {/* Invited Suppliers Columns */}
                                    {rfqDetails?.suppliers.map(sup => (
                                      <th key={sup.id} className="p-4 text-center border-l border-slate-150 bg-slate-50/50 min-w-[160px]">
                                        <div className="font-black text-slate-850 truncate max-w-[180px]" title={sup.vendor_name}>{sup.vendor_name}</div>
                                        <div className="text-[9px] text-slate-400 font-bold lowercase truncate max-w-[180px]">{sup.vendor_contact || 'no contact'}</div>
                                        {rfqDetails.rfq.status !== 'Awarded' && rfqDetails.rfq.status !== 'Closed' && (
                                          <button
                                            onClick={() => handleSaveQuotesSubmit(sup.vendor_id)}
                                            disabled={submittingQuotes}
                                            title={`Save the quoted prices entered for ${sup.vendor_name}`}
                                            className="mt-1.5 inline-flex items-center gap-1 bg-teal-50 hover:bg-teal-600 hover:text-white text-teal-700 border border-teal-200 hover:border-teal-600 px-2.5 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer disabled:opacity-50 disabled:cursor-wait"
                                          >
                                            {submittingQuotes ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                                            Save Quotes
                                          </button>
                                        )}
                                      </th>
                                    ))}

                                    <th className="p-4 text-center border-l border-slate-200 bg-teal-50/30 min-w-[220px]">
                                      Award Selection (Decision)
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                                  {rfqDetails?.items.map((item, idx) => {
                                    // Find lowest price for highlight
                                    let lowestPrice = Infinity;
                                    let lowestSupId = null;
                                    rfqDetails.suppliers.forEach(sup => {
                                      const key = `${item.id}_${sup.id}`;
                                      const price = parseFloat(quoteInputs[key] || '');
                                      const noBid = noBidInputs[key];
                                      if (!noBid && !isNaN(price) && price > 0 && price < lowestPrice) {
                                        lowestPrice = price;
                                        lowestSupId = sup.id;
                                      }
                                    });

                                    return (
                                      <tr key={item.id} className="hover:bg-slate-50/40">
                                        <td className="p-4 text-center font-bold text-slate-400">{item.line_no || (idx + 1)}</td>
                                        <td className="p-4 font-bold text-slate-850">{item.item_name}</td>
                                        <td className="p-4 text-center font-black">{item.quantity || '—'}</td>
                                        <td className="p-4 text-center font-bold text-slate-400">{item.unit || 'pcs'}</td>
                                        
                                        {/* Invited Suppliers Quote cells */}
                                        {rfqDetails.suppliers.map(sup => {
                                          const key = `${item.id}_${sup.id}`;
                                          const price = quoteInputs[key] || '';
                                          const noBid = noBidInputs[key] || false;
                                          const isLowest = !noBid && parseFloat(price) === lowestPrice && lowestPrice !== Infinity;

                                          return (
                                            <td key={sup.id} className={`p-4 border-l border-slate-105 text-center ${isLowest ? 'bg-emerald-50/50' : ''}`}>
                                              <div className="flex flex-col gap-1 items-center justify-center">
                                                {rfqDetails.rfq.status === 'Awarded' || rfqDetails.rfq.status === 'Closed' ? (
                                                  noBid ? (
                                                    <span className="text-[10px] text-rose-600 bg-rose-50 px-2 py-0.5 rounded font-bold">No Bid</span>
                                                  ) : (
                                                    <span className="font-black text-slate-850">{price ? `${fmtNum(price)} RWF` : '—'}</span>
                                                  )
                                                ) : (
                                                  <>
                                                    <input 
                                                      type="number"
                                                      placeholder="Unit price..."
                                                      value={noBid ? '' : price}
                                                      disabled={noBid}
                                                      onChange={(e) => setQuoteInputs(prev => ({ ...prev, [key]: e.target.value }))}
                                                      className="w-full max-w-[120px] bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-center text-xs font-bold outline-none focus:border-teal-350 focus:bg-white focus:shadow-xs disabled:opacity-40"
                                                    />
                                                    <label className="flex items-center gap-1 text-[9px] text-slate-450 font-bold select-none cursor-pointer">
                                                      <input 
                                                        type="checkbox"
                                                        checked={noBid}
                                                        onChange={(e) => {
                                                          setNoBidInputs(prev => ({ ...prev, [key]: e.target.checked }));
                                                          if (e.target.checked) setQuoteInputs(prev => ({ ...prev, [key]: '' }));
                                                        }}
                                                        className="rounded text-teal-650 focus:ring-teal-500 w-3 h-3"
                                                      />
                                                      No Offer
                                                    </label>
                                                  </>
                                                )}
                                              </div>
                                            </td>
                                          );
                                        })}

                                        {/* Award Decision Cell */}
                                        <td className="p-4 border-l border-slate-200 bg-teal-50/10">
                                          <div className="flex flex-col gap-1.5 w-full">
                                            {rfqDetails.rfq.status === 'Awarded' || rfqDetails.rfq.status === 'Closed' ? (
                                              (() => {
                                                const award = rfqDetails.awards.find(a => a.rfq_item_id === item.id);
                                                if (!award || !award.vendor_id) return <span className="text-slate-450 font-bold italic text-center">Not awarded</span>;
                                                const vendor = rfqDetails.suppliers.find(s => s.vendor_id === award.vendor_id);
                                                return (
                                                  <div className="bg-teal-50 border border-teal-150 rounded-xl p-2.5 text-xs">
                                                    <p className="font-black text-teal-850 truncate max-w-[200px]">{vendor?.vendor_name || 'Vendor'}</p>
                                                    <p className="text-[10px] text-teal-600 font-bold mt-0.5 uppercase tracking-wide">Awarded: {fmtRWF(award.awarded_price)}</p>
                                                    <p className="text-[9px] text-slate-450 font-bold mt-1">Reason: <span className="text-slate-600 italic">"{award.reason_note || award.reason}"</span></p>
                                                  </div>
                                                );
                                              })()
                                            ) : (
                                              <>
                                                <select
                                                  value={awardSelections[item.id]?.vendor_id || ''}
                                                  onChange={(e) => setAwardSelections(prev => ({
                                                    ...prev,
                                                    [item.id]: { ...(prev[item.id] || { reason: 'lowest', reason_note: '' }), vendor_id: e.target.value }
                                                  }))}
                                                  className="w-full bg-white border border-slate-250 rounded-xl p-2 text-xs font-bold outline-none focus:border-teal-350"
                                                >
                                                  <option value="">-- Choose Vendor --</option>
                                                  <option value="no_offers">No offers awarded</option>
                                                  {rfqDetails.suppliers.map(sup => (
                                                    <option key={sup.id} value={sup.vendor_id}>{sup.vendor_name}</option>
                                                  ))}
                                                </select>
                                                
                                                {awardSelections[item.id]?.vendor_id && awardSelections[item.id]?.vendor_id !== 'no_offers' && (
                                                  <div className="grid grid-cols-2 gap-1.5">
                                                    <select
                                                      value={awardSelections[item.id]?.reason || 'lowest'}
                                                      onChange={(e) => setAwardSelections(prev => ({
                                                        ...prev,
                                                        [item.id]: { ...(prev[item.id] || {}), reason: e.target.value }
                                                      }))}
                                                      className="bg-white border border-slate-200 rounded-lg p-1.5 text-[10px] font-bold outline-none"
                                                    >
                                                      <option value="lowest">Lowest Price</option>
                                                      <option value="quality">Quality Brand</option>
                                                      <option value="sole_source">Sole Source</option>
                                                    </select>
                                                    <input 
                                                      type="text"
                                                      placeholder="Reason / Note..."
                                                      value={awardSelections[item.id]?.reason_note || ''}
                                                      onChange={(e) => setAwardSelections(prev => ({
                                                        ...prev,
                                                        [item.id]: { ...(prev[item.id] || {}), reason_note: e.target.value }
                                                      }))}
                                                      className="bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-[10px] outline-none focus:bg-white"
                                                    />
                                                  </div>
                                                )}
                                              </>
                                            )}
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                            
                            {rfqDetails.rfq.status !== 'Awarded' && rfqDetails.rfq.status !== 'Closed' && (() => {
                              const decidedCount = Object.values(awardSelections).filter(s => s?.vendor_id).length;
                              const totalItems = rfqDetails.items.length;
                              return (
                                <div className="flex items-center justify-end gap-3 pt-3">
                                  <span className={`text-[11px] font-bold ${decidedCount === totalItems ? 'text-emerald-600' : 'text-slate-400'}`}>
                                    {decidedCount}/{totalItems} item{totalItems === 1 ? '' : 's'} decided
                                  </span>
                                  <button
                                    onClick={handleSaveAwardsSubmit}
                                    disabled={submittingAwards || decidedCount === 0}
                                    title={decidedCount === 0 ? 'Select a winning vendor (or "No offers") for at least one item first' : 'Record the committee decision for the selected items'}
                                    className="bg-teal-650 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    {submittingAwards ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                                    {submittingAwards ? 'Saving Awards…' : 'Save Evaluation & Awards'}
                                  </button>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* RFQ List View */
                    <div className="space-y-6">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white border border-slate-200 rounded-3xl p-6 shadow-xs animate-none">
                        <div className="relative w-full md:max-w-md">
                          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input 
                            type="text"
                            placeholder="Search RFQs / Tenders..."
                            value={rfqSearch}
                            onChange={(e) => setRfqSearch(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-2.5 rounded-xl text-xs outline-none focus:border-teal-350 focus:bg-white transition-all animate-none"
                          />
                        </div>
                        <button
                          onClick={() => setShowCreateRFQModal(true)}
                          className="w-full md:w-auto bg-teal-650 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Plus size={16} /> New RFQ / Tender
                        </button>
                      </div>

                      <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden animate-none">
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-xs text-left divide-y divide-slate-150">
                            <thead className="bg-slate-50 text-[10px] uppercase font-black text-slate-400 tracking-wider">
                              <tr>
                                <th className="p-4">Reference No</th>
                                <th className="p-4">Title / Description</th>
                                <th className="p-4">Category</th>
                                <th className="p-4 text-center">Suppliers Invited</th>
                                <th className="p-4 text-center">Items Count</th>
                                <th className="p-4 text-center">Tender Status</th>
                                <th className="p-4 text-center">Created At</th>
                                <th className="p-4 text-center">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                              {filteredRFQs.map(rfq => (
                                <tr key={rfq.id} className="hover:bg-slate-50/40">
                                  <td className="p-4 font-bold text-slate-850">{rfq.reference_no}</td>
                                  <td className="p-4 font-bold text-slate-800">{rfq.title}</td>
                                  <td className="p-4">
                                    <span className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-md bg-slate-50 text-slate-600 border border-slate-150">
                                      {(rfq.category || 'medical_supplies').replace('_', ' ')}
                                    </span>
                                  </td>
                                  <td className="p-4 text-center font-bold">{rfq.supplier_count}</td>
                                  <td className="p-4 text-center font-bold">{rfq.item_count}</td>
                                  <td className="p-4 text-center">
                                    <span className={`px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-full ${
                                      rfq.status === 'Draft' ? 'bg-slate-105 text-slate-650' :
                                      rfq.status === 'Collecting' ? 'bg-amber-50 text-amber-700 border border-amber-150' :
                                      rfq.status === 'UnderReview' ? 'bg-indigo-50 text-indigo-700 border border-indigo-150' :
                                      rfq.status === 'Awarded' ? 'bg-teal-50 text-teal-700 border border-teal-150' :
                                      'bg-emerald-50 text-emerald-700 border border-emerald-150'
                                    }`}>
                                      {rfq.status}
                                    </span>
                                  </td>
                                  <td className="p-4 text-center font-bold text-slate-400">
                                    {new Date(rfq.created_at).toLocaleDateString()}
                                  </td>
                                  <td className="p-4 text-center">
                                    {(() => {
                                      const done = rfq.status === 'Awarded' || rfq.status === 'Closed';
                                      const reviewing = rfq.status === 'UnderReview';
                                      const Icon = done ? Eye : reviewing ? Gavel : ClipboardList;
                                      const label = done ? 'View Results' : reviewing ? 'Evaluate Bids' : 'Enter Quotes';
                                      return (
                                        <button
                                          onClick={() => { setSelectedRFQ(rfq.id); fetchRFQDetails(rfq.id); }}
                                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer shadow-xs border ${
                                            done
                                              ? 'bg-white border-slate-200 text-slate-500 hover:text-slate-800 hover:border-slate-300'
                                              : reviewing
                                                ? 'bg-teal-650 border-teal-650 text-white hover:bg-teal-700'
                                                : 'bg-white border-teal-200 text-teal-700 hover:bg-teal-50'
                                          }`}
                                        >
                                          <Icon size={13} /> {label}
                                        </button>
                                      );
                                    })()}
                                  </td>
                                </tr>
                              ))}
                              {filteredRFQs.length === 0 && (
                                <tr>
                                  <td colSpan={8} className="p-12 text-center text-slate-400">
                                    <Gavel className="mx-auto opacity-30 mb-2" size={36} />
                                    No RFQs / Tenders found. Click 'New RFQ Tender' to launch one.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

          </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* ─── CREATE RFQ MODAL ─── */}
      <AnimatePresence>
        {showCreateRFQModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateRFQModal(false)}
              className="absolute inset-0 bg-slate-900"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl p-6 overflow-hidden flex flex-col max-h-[90vh] text-slate-800"
            >
              <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-4">
                <h3 className="text-lg font-black text-slate-900">Launch New Tender / RFQ</h3>
                <button onClick={() => setShowCreateRFQModal(false)} className="text-slate-400 hover:text-slate-650 cursor-pointer"><X size={20} /></button>
              </div>

              <form onSubmit={handleCreateRFQSubmit} className="flex-1 overflow-y-auto space-y-4 pr-1">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-450">Tender Title</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Nursing Reagents, Lab consumables..."
                      required
                      value={rfqTitle}
                      onChange={(e) => setRfqTitle(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-bold outline-none focus:border-teal-350 focus:bg-white transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-450">Tender Category</label>
                    <select
                      value={rfqCategory}
                      onChange={(e) => setRfqCategory(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-bold outline-none focus:border-teal-350 focus:bg-white transition-all"
                    >
                      <option value="medical_supplies">Medical Supplies</option>
                      <option value="nursing_reagents">Nursing Reagents</option>
                      <option value="laboratory">Laboratory Consumables</option>
                      <option value="dental">Dental Equipment</option>
                      <option value="general_logistics">General Logistics</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-450">Notes / Instructions</label>
                  <textarea 
                    placeholder="Enter additional terms or guidelines..."
                    rows={2}
                    value={rfqNotes}
                    onChange={(e) => setRfqNotes(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs outline-none focus:border-teal-350 focus:bg-white transition-all"
                  />
                </div>

                {/* Invited Suppliers selection */}
                <div className="space-y-1">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-450">Invite Suppliers (Hold Ctrl/Cmd to select multiple)</label>
                  <select
                    multiple
                    value={rfqInvitedVendors}
                    onChange={(e) => {
                      const selected = Array.from(e.target.selectedOptions, option => option.value);
                      setRfqInvitedVendors(selected);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded-xl text-xs font-bold outline-none focus:border-teal-350 focus:bg-white transition-all min-h-[100px]"
                  >
                    {vendors.map(v => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-450 font-bold">Selected: {rfqInvitedVendors.length} supplier(s) invited.</p>
                </div>

                {/* RFQ Items lines */}
                <div className="border-t border-slate-100 pt-4 space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">Add Item Lines</h4>
                  <div className="grid grid-cols-12 gap-3 items-end">
                    <div className="col-span-6 space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Item Name</label>
                      <input 
                        type="text" 
                        placeholder="Item name..."
                        value={tempRfqItemName}
                        onChange={(e) => setTempRfqItemName(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg text-xs font-bold outline-none"
                      />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Qty</label>
                      <input 
                        type="number" 
                        placeholder="Qty..."
                        value={tempRfqItemQty}
                        onChange={(e) => setTempRfqItemQty(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg text-xs text-center font-bold outline-none"
                      />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Unit</label>
                      <input 
                        type="text" 
                        placeholder="Unit..."
                        value={tempRfqItemUnit}
                        onChange={(e) => setTempRfqItemUnit(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg text-xs text-center font-bold outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!tempRfqItemName.trim() || !tempRfqItemQty) return;
                        setRfqItems(prev => [...prev, {
                          line_no: prev.length + 1,
                          item_name: tempRfqItemName,
                          quantity: parseFloat(tempRfqItemQty),
                          unit: tempRfqItemUnit,
                          quantity_label: `${tempRfqItemQty} ${tempRfqItemUnit}`
                        }]);
                        setTempRfqItemName('');
                        setTempRfqItemQty('');
                      }}
                      className="col-span-2 bg-teal-50 border border-teal-150 text-teal-650 hover:bg-teal-650 hover:text-white p-2 rounded-lg text-xs font-bold transition-all cursor-pointer h-[34px]"
                    >
                      Add Item
                    </button>
                  </div>

                  {rfqItems.length > 0 && (
                    <div className="border border-slate-100 rounded-xl overflow-hidden mt-2">
                      <table className="min-w-full text-left text-xs divide-y divide-slate-100">
                        <thead className="bg-slate-50 text-slate-450 uppercase text-[9px] font-black">
                          <tr>
                            <th className="p-3 w-12 text-center">N°</th>
                            <th className="p-3">Item Description</th>
                            <th className="p-3 text-center">Qty</th>
                            <th className="p-3 text-center">Unit</th>
                            <th className="p-3 text-center w-12">Delete</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-650 font-bold">
                          {rfqItems.map((item, index) => (
                            <tr key={index}>
                              <td className="p-3 text-center text-slate-400">{item.line_no}</td>
                              <td className="p-3 text-slate-850">{item.item_name}</td>
                              <td className="p-3 text-center">{item.quantity}</td>
                              <td className="p-3 text-center text-slate-400">{item.unit}</td>
                              <td className="p-3 text-center">
                                <button 
                                  type="button" 
                                  onClick={() => setRfqItems(prev => prev.filter((_, i) => i !== index).map((it, idx) => ({ ...it, line_no: idx + 1 })))}
                                  className="text-rose-500 hover:text-rose-700 cursor-pointer"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-100 pt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateRFQModal(false)}
                    className="bg-white border border-slate-200 text-slate-650 hover:bg-slate-50 px-4 py-2 rounded-xl font-bold text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingRFQ}
                    className="bg-teal-650 hover:bg-teal-700 text-white px-5 py-2 rounded-xl font-bold text-xs shadow-md hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-wait cursor-pointer flex items-center gap-1.5"
                  >
                    {submittingRFQ ? <Loader2 size={13} className="animate-spin" /> : <Gavel size={13} />}
                    {submittingRFQ ? 'Launching…' : 'Create Tender'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── SUPPLIER SCORECARD DETAILS MODAL ─── */}
      <AnimatePresence>
        {selectedVendorForScorecard && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => { setSelectedVendorForScorecard(null); setSupplierScorecard(null); }}
              className="absolute inset-0 bg-slate-900"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl p-6 overflow-hidden flex flex-col max-h-[90vh] text-slate-800"
            >
              <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-4">
                <div>
                  <h3 className="text-lg font-black text-slate-900">Supplier Performance Scorecard</h3>
                  <p className="text-xs text-slate-400 font-bold mt-0.5">{selectedVendorForScorecard.name}</p>
                </div>
                <button onClick={() => { setSelectedVendorForScorecard(null); setSupplierScorecard(null); }} className="text-slate-400 hover:text-slate-650 cursor-pointer"><X size={20} /></button>
              </div>

              {loadingScorecard ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Loader2 className="h-10 w-10 animate-spin text-teal-650" />
                  <p className="text-xs font-bold text-slate-450 animate-pulse">Calculating Scorecard KPI Metrics...</p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto space-y-6 pr-1 animate-none">
                  {supplierScorecard ? (
                    <>
                      {/* Metric Score Cards */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 flex flex-col justify-between">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Fulfillment Rate</span>
                          <div className="mt-2 flex items-baseline gap-1">
                            <span className="text-2xl font-black text-slate-850">
                              {supplierScorecard.performance.fulfillment_rate !== null ? `${supplierScorecard.performance.fulfillment_rate.toFixed(1)}%` : '—'}
                            </span>
                            <span className="text-[9px] text-slate-450 font-bold">delivered vs ordered</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2 overflow-hidden">
                            <div 
                              className={`h-1.5 rounded-full ${
                                (supplierScorecard.performance.fulfillment_rate || 0) >= 90 ? 'bg-emerald-500' :
                                (supplierScorecard.performance.fulfillment_rate || 0) >= 70 ? 'bg-amber-500' : 'bg-rose-500'
                              }`} 
                              style={{ width: `${supplierScorecard.performance.fulfillment_rate || 0}%` }}
                            />
                          </div>
                        </div>

                        <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 flex flex-col justify-between">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Average Lead Time</span>
                          <div className="mt-2 flex items-baseline gap-1">
                            <span className="text-2xl font-black text-slate-850">
                              {supplierScorecard.performance.avg_lead_time_days !== null ? `${supplierScorecard.performance.avg_lead_time_days.toFixed(1)} days` : '—'}
                            </span>
                            <span className="text-[9px] text-slate-450 font-bold">order to delivery</span>
                          </div>
                          <div className="mt-2 text-[9px] font-bold text-slate-450">
                            Based on {supplierScorecard.summary.total_grns} fulfilled shipments
                          </div>
                        </div>
                      </div>

                      {/* Spend / Volume Info */}
                      <div className="bg-teal-50/40 border border-teal-100 rounded-2xl p-4 space-y-2">
                        <h4 className="text-xs font-black text-teal-850 uppercase tracking-wider">Tender & Purchase Volume</h4>
                        <div className="grid grid-cols-2 gap-4 pt-1">
                          <div>
                            <p className="text-[9px] font-bold text-slate-450 uppercase">Total Spend (Life-time)</p>
                            <p className="text-sm font-black text-teal-700 mt-0.5">{fmtRWF(supplierScorecard.performance.total_spend)}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold text-slate-450 uppercase">Purchase Orders (POs)</p>
                            <p className="text-sm font-black text-slate-850 mt-0.5">{supplierScorecard.summary.total_pos} active POs</p>
                          </div>
                        </div>
                      </div>

                      {/* Quality Incidents List */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Quality / Delivery Incidents</h4>
                          <span className={`px-2 py-0.5 text-[9px] font-black rounded-full ${
                            supplierScorecard.performance.quality_incidents_count > 0 ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                          }`}>
                            {supplierScorecard.performance.quality_incidents_count} logged
                          </span>
                        </div>

                        <div className="border border-slate-100 rounded-2xl overflow-hidden max-h-[200px] overflow-y-auto">
                          {supplierScorecard.incidents.length > 0 ? (
                            <table className="min-w-full text-xs text-left divide-y divide-slate-100">
                              <thead className="bg-slate-50 text-slate-450 uppercase text-[9px] font-black">
                                <tr>
                                  <th className="p-3">Incident Date</th>
                                  <th className="p-3">Type</th>
                                  <th className="p-3">Brief Description</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 text-slate-650 font-bold font-medium">
                                {supplierScorecard.incidents.map((inc, i) => (
                                  <tr key={i} className="hover:bg-slate-50/40">
                                    <td className="p-3 font-semibold whitespace-nowrap">{new Date(inc.incident_date || inc.created_at).toLocaleDateString()}</td>
                                    <td className="p-3">
                                      <span className="bg-rose-50 text-rose-600 px-2 py-0.5 rounded font-bold text-[9px] uppercase">
                                        {inc.incident_type}
                                      </span>
                                    </td>
                                    <td className="p-3 font-medium text-slate-700 truncate max-w-[220px]" title={inc.description}>{inc.description}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <div className="p-8 text-center text-slate-400">
                              <CheckCircle className="mx-auto opacity-30 mb-2 text-emerald-500" size={32} />
                              Excellent quality record. No incidents logged.
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center text-slate-400 p-8">No performance records found.</div>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── VENDOR PROFILE DRAWER ─── */}
      <AnimatePresence>
        {selectedVendorProfile && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedVendorProfile(null)}
              className="fixed inset-0 bg-slate-900 z-40 backdrop-blur-xs"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-2xl bg-white border-l border-slate-200 z-50 p-6 shadow-2xl flex flex-col text-slate-800"
            >
              <div className="flex justify-between items-center border-b border-slate-200 pb-4 mb-6">
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-400">SUPPLIER DIRECTORY PROFILE</span>
                  <h3 className="text-lg font-black text-slate-900 mt-1">{selectedVendorProfile.name}</h3>
                  <p className="text-xs text-slate-500 font-bold mt-0.5">{selectedVendorProfile.contact || 'No contact details'}</p>
                </div>
                <button 
                  onClick={() => setSelectedVendorProfile(null)}
                  className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Sub-tabs */}
              <div className="flex border-b border-slate-100 mb-6">
                {[
                  { id: 'scorecard', label: 'Scorecard', icon: Star },
                  { id: 'contracts', label: 'Contracts', icon: FileCheck },
                  { id: 'documents', label: 'Compliance Docs', icon: ClipboardList },
                  { id: 'ratings', label: 'Reviews', icon: Star }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setVendorProfileTab(tab.id)}
                    className={`flex items-center gap-1.5 px-4 py-2 border-b-2 font-black text-xs transition-all cursor-pointer ${
                      vendorProfileTab === tab.id
                        ? 'border-teal-600 text-teal-700'
                        : 'border-transparent text-slate-400 hover:text-slate-650'
                    }`}
                  >
                    <tab.icon size={13} />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Drawer Tab Content */}
              <div className="flex-1 overflow-y-auto space-y-6 pr-1 custom-scrollbar">
                {vendorProfileTab === 'scorecard' && (
                  <div className="space-y-6">
                    {loadingVendorProfile ? (
                      <div className="flex justify-center py-10"><Loader2 className="animate-spin text-teal-650" size={24} /></div>
                    ) : supplierScorecard ? (
                      <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 flex flex-col justify-between">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Fulfillment Rate</span>
                            <div className="mt-2 flex items-baseline gap-1">
                              <span className="text-2xl font-black text-slate-850">
                                {supplierScorecard.performance.fulfillment_rate !== null ? `${supplierScorecard.performance.fulfillment_rate.toFixed(1)}%` : '—'}
                              </span>
                              <span className="text-[9px] text-slate-450 font-bold">delivered vs ordered</span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2 overflow-hidden">
                              <div 
                                className={`h-1.5 rounded-full ${
                                  (supplierScorecard.performance.fulfillment_rate || 0) >= 90 ? 'bg-emerald-500' :
                                  (supplierScorecard.performance.fulfillment_rate || 0) >= 70 ? 'bg-amber-500' : 'bg-rose-500'
                                }`} 
                                style={{ width: `${supplierScorecard.performance.fulfillment_rate || 0}%` }}
                              />
                            </div>
                          </div>

                          <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 flex flex-col justify-between">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Average Lead Time</span>
                            <div className="mt-2 flex items-baseline gap-1">
                              <span className="text-2xl font-black text-slate-850">
                                {supplierScorecard.performance.avg_lead_time_days !== null ? `${supplierScorecard.performance.avg_lead_time_days.toFixed(1)} days` : '—'}
                              </span>
                              <span className="text-[9px] text-slate-450 font-bold">order to delivery</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-slate-400 py-10 font-bold">No scorecard data available.</div>
                    )}
                  </div>
                )}

                {vendorProfileTab === 'contracts' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Vendor Contracts</h4>
                      <button onClick={() => setShowAddContractModal(true)} className="flex items-center gap-1 bg-teal-600 hover:bg-teal-500 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg cursor-pointer">
                        <Plus size={12} /> Add Contract
                      </button>
                    </div>

                    <div className="space-y-3">
                      {vendorContracts.map((c) => {
                        const expiry = new Date(c.end_date);
                        const daysLeft = Math.ceil((expiry - new Date()) / (1000 * 60 * 60 * 24));
                        const expiryTone = daysLeft < 30 ? 'bg-rose-50 text-rose-700 border-rose-100' : daysLeft < 90 ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100';

                        return (
                          <div key={c.id} className="border border-slate-150 rounded-2xl p-4 flex justify-between items-start hover:border-teal-200 transition-all">
                            <div>
                              <p className="text-xs font-black text-slate-800">{c.title}</p>
                              <p className="text-[10px] text-slate-400 font-bold mt-1">Ref: {c.contract_no || 'N/A'} • Value: {Number(c.contract_value).toLocaleString()} RWF</p>
                              {c.notes && <p className="text-[10px] text-slate-500 italic mt-2">"{c.notes}"</p>}
                            </div>
                            <div className="text-right">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-black border ${expiryTone}`}>
                                {daysLeft > 0 ? `${daysLeft} days left` : 'Expired'}
                              </span>
                              <p className="text-[9px] text-slate-400 font-bold mt-1.5">{c.start_date?.substring(0,10)} to {c.end_date?.substring(0,10)}</p>
                            </div>
                          </div>
                        );
                      })}
                      {vendorContracts.length === 0 && (
                        <div className="p-8 text-center text-slate-400 text-xs font-bold">No active contracts recorded.</div>
                      )}
                    </div>
                  </div>
                )}

                {vendorProfileTab === 'documents' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Compliance Documents</h4>
                      <button onClick={() => setShowAddDocModal(true)} className="flex items-center gap-1 bg-teal-600 hover:bg-teal-500 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg cursor-pointer">
                        <Plus size={12} /> Upload Doc
                      </button>
                    </div>

                    <div className="space-y-3">
                      {vendorDocuments.map((doc) => (
                        <div key={doc.id} className="border border-slate-150 rounded-2xl p-4 flex justify-between items-center">
                          <div>
                            <p className="text-xs font-black text-slate-800">{doc.doc_name}</p>
                            <p className="text-[10px] text-slate-400 font-bold mt-1 capitalize">Type: {doc.doc_type?.replace('_', ' ')} • Ref: {doc.file_ref || 'None'}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] font-bold text-slate-500">Expires: {doc.expiry_date ? doc.expiry_date.substring(0,10) : 'Never'}</span>
                          </div>
                        </div>
                      ))}
                      {vendorDocuments.length === 0 && (
                        <div className="p-8 text-center text-slate-400 text-xs font-bold">No compliance documents uploaded.</div>
                      )}
                    </div>
                  </div>
                )}

                {vendorProfileTab === 'ratings' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Supplier Reviews</h4>
                      <button onClick={() => setShowAddRatingModal(true)} className="flex items-center gap-1 bg-teal-600 hover:bg-teal-500 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg cursor-pointer">
                        <Plus size={12} /> Leave Review
                      </button>
                    </div>

                    <div className="space-y-3">
                      {vendorRatings.map((r) => (
                        <div key={r.id} className="border border-slate-150 rounded-2xl p-4 space-y-2">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-1">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star key={i} size={11} className={i < r.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'} />
                              ))}
                              <span className="text-[10px] font-black uppercase text-slate-400 ml-1.5">{r.category}</span>
                            </div>
                            <span className="text-[9px] text-slate-400 font-bold">{new Date(r.created_at).toLocaleDateString()}</span>
                          </div>
                          {r.comment && <p className="text-xs text-slate-650 italic">"{r.comment}"</p>}
                        </div>
                      ))}
                      {vendorRatings.length === 0 && (
                        <div className="p-8 text-center text-slate-400 text-xs font-bold">No reviews recorded.</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ─── UPLOAD VENDOR DOCUMENT MODAL ─── */}
      <AnimatePresence>
        {showAddDocModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} onClick={() => setShowAddDocModal(false)} className="absolute inset-0 bg-slate-900" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 text-slate-800 z-10">
              <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-4">
                <h3 className="text-sm font-black text-slate-900 uppercase">Upload Compliance Document</h3>
                <button onClick={() => setShowAddDocModal(false)} className="text-slate-400 hover:text-slate-650 cursor-pointer"><X size={18} /></button>
              </div>
              <form onSubmit={handleCreateVendorDocSubmit} className="space-y-4 text-xs font-bold">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase text-slate-450">Document Type</label>
                  <select value={docType} onChange={e => setDocType(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none">
                    <option value="contract">Contract</option>
                    <option value="tax_info">Tax Certificate</option>
                    <option value="license">Trade License</option>
                    <option value="business_reg">Business Registration</option>
                    <option value="other">Other Compliance</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase text-slate-450">Document Name</label>
                  <input type="text" required placeholder="e.g. RSSB Clearance 2026" value={docName} onChange={e => setDocName(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase text-slate-450">File Reference / URL</label>
                  <input type="text" placeholder="e.g. RSSB-CLR-9901" value={docFileRef} onChange={e => setDocFileRef(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase text-slate-450">Issued Date</label>
                    <input type="date" value={docIssuedDate} onChange={e => setDocIssuedDate(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase text-slate-450">Expiry Date</label>
                    <input type="date" value={docExpiryDate} onChange={e => setDocExpiryDate(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none" />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase text-slate-450">Notes</label>
                  <textarea rows={2} placeholder="Add compliance status notes..." value={docNotes} onChange={e => setDocNotes(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-medium" />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setShowAddDocModal(false)} className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-slate-650">Cancel</button>
                  <button type="submit" disabled={submittingDoc} className="bg-teal-650 text-white px-5 py-2 rounded-xl shadow-md">{submittingDoc ? 'Saving...' : 'Upload'}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── ADD VENDOR CONTRACT MODAL ─── */}
      <AnimatePresence>
        {showAddContractModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} onClick={() => setShowAddContractModal(false)} className="absolute inset-0 bg-slate-900" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 text-slate-800 z-10">
              <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-4">
                <h3 className="text-sm font-black text-slate-900 uppercase">Register Vendor Contract</h3>
                <button onClick={() => setShowAddContractModal(false)} className="text-slate-400 hover:text-slate-650 cursor-pointer"><X size={18} /></button>
              </div>
              <form onSubmit={handleCreateVendorContractSubmit} className="space-y-4 text-xs font-bold">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase text-slate-450">Contract Title</label>
                  <input type="text" required placeholder="e.g. Annual Reagent Supply Agreement" value={contractTitle} onChange={e => setContractTitle(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase text-slate-450">Contract Reference #</label>
                  <input type="text" placeholder="e.g. CTR-2026-009" value={contractNo} onChange={e => setContractNo(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase text-slate-450">Start Date</label>
                    <input type="date" required value={contractStart} onChange={e => setContractStart(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase text-slate-450">End Date</label>
                    <input type="date" required value={contractEnd} onChange={e => setContractEnd(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none" />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase text-slate-450">Contract Value (RWF)</label>
                  <input type="number" placeholder="Allocated contract value..." value={contractValue} onChange={e => setContractValue(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase text-slate-450">Terms & Special Conditions</label>
                  <textarea rows={2} placeholder="Summarize SLA, payment schedules..." value={contractNotes} onChange={e => setContractNotes(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-medium" />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setShowAddContractModal(false)} className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-slate-650">Cancel</button>
                  <button type="submit" disabled={submittingContract} className="bg-teal-650 text-white px-5 py-2 rounded-xl shadow-md">{submittingContract ? 'Registering...' : 'Register'}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── LEAVE SUPPLIER REVIEW MODAL ─── */}
      <AnimatePresence>
        {showAddRatingModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} onClick={() => setShowAddRatingModal(false)} className="absolute inset-0 bg-slate-900" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 text-slate-800 z-10">
              <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-4">
                <h3 className="text-sm font-black text-slate-900 uppercase">Rate Supplier Performance</h3>
                <button onClick={() => setShowAddRatingModal(false)} className="text-slate-400 hover:text-slate-655 cursor-pointer"><X size={18} /></button>
              </div>
              <form onSubmit={handleCreateVendorRatingSubmit} className="space-y-4 text-xs font-bold">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase text-slate-455">Star Rating (1-5)</label>
                  <div className="flex gap-2">
                    {[1,2,3,4,5].map((star) => (
                      <button type="button" key={star} onClick={() => setRatingValue(star)} className="text-2xl cursor-pointer transition-transform hover:scale-110 focus:outline-none">
                        <Star className={star <= ratingValue ? 'text-amber-400 fill-amber-400' : 'text-slate-200'} size={24} />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase text-slate-455">Rating Category</label>
                    <select value={ratingCategory} onChange={e => setRatingCategory(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none">
                      <option value="overall">Overall</option>
                      <option value="quality">Product Quality</option>
                      <option value="delivery_time">Delivery Speed</option>
                      <option value="customer_service">Customer Service</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase text-slate-455">Linked GRN Receipt (Optional)</label>
                    <select value={ratingGrnId} onChange={e => setRatingGrnId(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold">
                      <option value="">None</option>
                      {goodsReceipts.filter(g => Number(g.vendor_id) === Number(selectedVendorProfile?.id)).map(grn => (
                        <option key={grn.id} value={grn.id}>GRN #{grn.grn_no || grn.id}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase text-slate-455">Review Comments</label>
                  <textarea rows={3} required placeholder="Detail the vendor performance, lead time compliance, quality of stock received..." value={ratingComment} onChange={e => setRatingComment(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none font-medium" />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setShowAddRatingModal(false)} className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-slate-655">Cancel</button>
                  <button type="submit" disabled={submittingRating} className="bg-teal-650 text-white px-5 py-2 rounded-xl shadow-md">{submittingRating ? 'Submitting...' : 'Submit Review'}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── ADD CATALOG ITEM MODAL ─── */}
      <AnimatePresence>
        {showAddCatalogModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} onClick={() => setShowAddCatalogModal(false)} className="absolute inset-0 bg-slate-900" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 text-slate-800 z-10">
              <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-4">
                <h3 className="text-sm font-black text-slate-900 uppercase">Add Catalog Item</h3>
                <button onClick={() => setShowAddCatalogModal(false)} className="text-slate-400 hover:text-slate-650 cursor-pointer"><X size={18} /></button>
              </div>
              <form onSubmit={handleCreateCatalogItemSubmit} className="space-y-4 text-xs font-bold">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase text-slate-450">Item Description / Name</label>
                  <input type="text" required placeholder="e.g. Paracetamol 500mg Tablets" value={catalogItemName} onChange={e => setCatalogItemName(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase text-slate-450">Category</label>
                    <select value={catalogItemCat} onChange={e => setCatalogItemCat(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none">
                      <option value="medical_supplies">Medical Supplies</option>
                      <option value="pharmaceuticals">Pharmaceuticals</option>
                      <option value="equipment">Equipment</option>
                      <option value="laboratory">Laboratory Consumables</option>
                      <option value="office">Office Supplies</option>
                      <option value="maintenance">Facility Maintenance</option>
                      <option value="other">Other Category</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase text-slate-450">Unit of Measure (UOM)</label>
                    <input type="text" required placeholder="e.g. Box of 100, Vial, Roll" value={catalogItemUom} onChange={e => setCatalogItemUom(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none" />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase text-slate-450">Estimated Unit Price (RWF)</label>
                  <input type="number" placeholder="Estimated purchase price..." value={catalogItemPrice} onChange={e => setCatalogItemPrice(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none" />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setShowAddCatalogModal(false)} className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-slate-655">Cancel</button>
                  <button type="submit" disabled={submittingCatalog} className="bg-teal-650 text-white px-5 py-2 rounded-xl shadow-md">{submittingCatalog ? 'Adding...' : 'Add to Catalog'}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── CONFIGURE DEPARTMENT BUDGET MODAL ─── */}
      <AnimatePresence>
        {showAddBudgetModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} onClick={() => setShowAddBudgetModal(false)} className="absolute inset-0 bg-slate-900" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 text-slate-800 z-10">
              <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-4">
                <h3 className="text-sm font-black text-slate-900 uppercase">Set Department Budget</h3>
                <button onClick={() => setShowAddBudgetModal(false)} className="text-slate-400 hover:text-slate-650 cursor-pointer"><X size={18} /></button>
              </div>
              <form onSubmit={handleCreateBudgetSubmit} className="space-y-4 text-xs font-bold">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase text-slate-450">Department</label>
                  <select value={budgetDept} onChange={e => setBudgetDept(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none">
                    <option value="NURSING">Nursing</option>
                    <option value="PHARMACY">Pharmacy</option>
                    <option value="LABORATORY">Laboratory</option>
                    <option value="DENTAL">Dental</option>
                    <option value="RADIOLOGY">Radiology</option>
                    <option value="ADMINISTRATION">Administration</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase text-slate-450">Budget Year</label>
                    <select value={budgetYear} onChange={e => setBudgetYear(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none">
                      {[2024,2025,2026,2027].map(y => <option key={y} value={String(y)}>{y}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase text-slate-455">Budget Month</label>
                    <select value={budgetMonth} onChange={e => setBudgetMonth(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none">
                      {Array.from({ length: 12 }).map((_, i) => (
                        <option key={i+1} value={String(i+1)}>{new Date(2026, i, 1).toLocaleString('default', { month: 'long' })}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase text-slate-455">Budget Allocation Amount (RWF)</label>
                  <input type="number" required placeholder="Allocated monthly funds limit..." value={budgetAmount} onChange={e => setBudgetAmount(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none" />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setShowAddBudgetModal(false)} className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-slate-655">Cancel</button>
                  <button type="submit" disabled={submittingBudget} className="bg-teal-650 text-white px-5 py-2 rounded-xl shadow-md">{submittingBudget ? 'Configuring...' : 'Set Budget'}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── CREATE ACCOUNTS PAYABLE INVOICE MODAL ─── */}
      <AnimatePresence>
        {showCreateInvoiceModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} onClick={() => setShowCreateInvoiceModal(false)} className="absolute inset-0 bg-slate-900" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl p-6 text-slate-800 z-10 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-4">
                <h3 className="text-sm font-black text-slate-900 uppercase">Capture Accounts Payable Invoice</h3>
                <button onClick={() => setShowCreateInvoiceModal(false)} className="text-slate-400 hover:text-slate-655 cursor-pointer"><X size={18} /></button>
              </div>
              <form onSubmit={handleCreateInvoiceSubmit} className="space-y-4 text-xs font-bold">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase text-slate-455">Invoice Number</label>
                    <input type="text" required placeholder="e.g. INV-2026-908" value={invNo} onChange={e => setInvNo(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase text-slate-455">Vendor / Supplier</label>
                    <select required value={invVendorId} onChange={e => { setInvVendorId(e.target.value); setInvPoId(''); setInvGrnId(''); }} className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none">
                      <option value="">Select Vendor</option>
                      {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase text-slate-455">Link Purchase Order (PO)</label>
                    <select value={invPoId} onChange={e => { setInvPoId(e.target.value); setInvGrnId(''); }} className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold">
                      <option value="">No PO Link</option>
                      {purchaseOrders.filter(po => Number(po.vendor_id) === Number(invVendorId)).map(po => (
                        <option key={po.id} value={po.id}>{po.po_number || `PO-${po.id}`} ({Number(po.total_value || 0).toLocaleString()} RWF)</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase text-slate-455">Link Goods Receipt (GRN)</label>
                    <select value={invGrnId} onChange={e => { setInvGrnId(e.target.value); setInvPoId(''); }} className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold">
                      <option value="">No GRN Link</option>
                      {goodsReceipts.filter(g => Number(g.vendor_id) === Number(invVendorId)).map(grn => (
                        <option key={grn.id} value={grn.id}>GRN #{grn.grn_no || grn.id} ({grn.created_at?.substring(0,10)})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase text-slate-455">Invoice Date</label>
                    <input type="date" required value={invDate} onChange={e => setInvDate(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase text-slate-455">Due Date</label>
                    <input type="date" required value={invDueDate} onChange={e => setInvDueDate(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase text-slate-455">Subtotal (RWF)</label>
                    <input type="number" required value={invSubtotal} onChange={e => setInvSubtotal(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase text-slate-455">Tax (RWF)</label>
                    <input type="number" value={invTax} onChange={e => setInvTax(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase text-slate-455">Total Amount (RWF)</label>
                    <input type="number" required value={invTotal} onChange={e => setInvTotal(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none" />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase text-slate-455">Line Items (prefills automatically when linking PO/GRN)</label>
                  <div className="border border-slate-150 rounded-2xl overflow-hidden max-h-[150px] overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 text-slate-455 font-bold">
                        <tr>
                          <th className="p-2 text-left">Item Name</th>
                          <th className="p-2 text-center">Qty</th>
                          <th className="p-2 text-right">Unit Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invItems.map((item, idx) => (
                          <tr key={idx} className="border-b border-slate-50">
                            <td className="p-2 font-medium text-slate-800">{item.item_name}</td>
                            <td className="p-2 text-center">{item.quantity}</td>
                            <td className="p-2 text-right font-bold">{Number(item.unit_price).toLocaleString()}</td>
                          </tr>
                        ))}
                        {invItems.length === 0 && (
                          <tr><td colSpan={3} className="p-6 text-center text-slate-400">No items added. Link a PO or GRN to prefill.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase text-slate-455">Notes</label>
                  <textarea rows={2} placeholder="Add AP processing details..." value={invNotes} onChange={e => setInvNotes(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-medium" />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setShowCreateInvoiceModal(false)} className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-slate-655">Cancel</button>
                  <button type="submit" disabled={submittingInvoice} className="bg-purple-600 text-white px-5 py-2 rounded-xl shadow-md">{submittingInvoice ? 'Saving...' : 'Capture'}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
                        onChange={(e) => handlePoItemNameChange(e.target.value)}
                        className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs"
                      />
                      <datalist id="po-items-datalist">
                        {masterInventory.map((item, idx) => <option key={idx} value={item.name} />)}
                      </datalist>
                      {matchedPoItem && (
                        <p className="text-[10px] text-slate-450 font-semibold mt-0.5">
                          Current stock: <span className="text-slate-700 font-bold">{matchedPoItem.quantity ?? 0}</span>
                          {matchedPoItem.price ? <> · Last price: <span className="text-slate-700 font-bold">{Number(matchedPoItem.price).toLocaleString()} RWF</span></> : null}
                        </p>
                      )}
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
                            <th className="p-2 text-right">Total (RWF)</th>
                            <th className="p-2 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {poItems.map((item, idx) => (
                            <tr key={idx} className="border-b border-slate-100 text-slate-700">
                              <td className="p-2 font-semibold">{item.item_name}</td>
                              <td className="p-2 font-bold">{item.quantity}</td>
                              <td className="p-2 text-teal-700 font-bold">{item.unit_price.toLocaleString()}</td>
                              <td className="p-2 text-right font-black text-slate-800">{(item.quantity * item.unit_price).toLocaleString()}</td>
                              <td className="p-2 text-right">
                                <button type="button" onClick={() => handleRemovePoItem(idx)} className="text-rose-500 font-bold mr-2 hover:text-rose-700 cursor-pointer">Remove</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-slate-50 border-t-2 border-slate-200">
                            <td colSpan={3} className="p-2 text-right font-black text-slate-500 uppercase tracking-wider text-[10px]">Grand Total</td>
                            <td className="p-2 text-right font-black text-teal-700 text-sm">{poTotal.toLocaleString()}</td>
                            <td></td>
                          </tr>
                        </tfoot>
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

      {/* ─── SUPPLIER PORTAL AUTO-OPENED (after PO sent) ─── */}
      <AnimatePresence>
        {openedPortalSession && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpenedPortalSession(null)}
              className="absolute inset-0 bg-slate-900"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 text-slate-800"
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="p-2.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-2xl">
                  <KeyRound size={22} />
                </span>
                <div>
                  <h3 className="text-base font-black text-slate-900">Supplier Portal Opened</h3>
                  <p className="text-xs text-slate-500 font-semibold">{openedPortalSession.vendorName}</p>
                </div>
              </div>

              <p className="text-xs text-slate-500 font-medium mb-4">
                Share this access token with the supplier. They'll enter it at the public
                supplier portal to upload the delivery for this PO.
              </p>

              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 mb-4">
                <span className="flex-1 font-mono font-black text-sm tracking-widest text-slate-800">{openedPortalSession.token}</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(openedPortalSession.token);
                    toast.success('Token copied to clipboard!');
                  }}
                  className="p-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer transition-colors"
                  title="Copy token"
                >
                  <Copy size={14} className="text-slate-600" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => setOpenedPortalSession(null)}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl cursor-pointer"
              >Done</button>
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

              {/* Print GRN Button */}
              <div className="mt-6">
                <button
                  onClick={() => setGrnPrintData({ ...selectedGRN, items: grnItems })}
                  className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl cursor-pointer flex items-center justify-center gap-1.5 transition-all"
                >
                  <Printer size={14} /> Generate Printable GRN Document
                </button>
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

              {/* Approval chain steps */}
              {!selectedRequisition.isReturn && (
                <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl mb-6 text-xs space-y-3">
                  <p className="text-[10px] text-slate-450 uppercase font-black tracking-wider">Approval Chain Workflow</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-black">✓</div>
                      <div>
                        <p className="font-bold text-slate-700">1. Dept. Head</p>
                        <p className="text-[9px] text-emerald-600 font-bold">Auto-Approved</p>
                      </div>
                    </div>
                    <div className="text-slate-300">➔</div>
                    <div className="flex items-center gap-2">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                        selectedRequisition.status === 'Pending' ? 'bg-amber-500 text-white' : 'bg-emerald-500 text-white'
                      }`}>
                        {selectedRequisition.status === 'Pending' ? '?' : '✓'}
                      </div>
                      <div>
                        <p className="font-bold text-slate-700">2. Procurement</p>
                        <p className={`text-[9px] font-bold ${
                          selectedRequisition.status === 'Pending' ? 'text-amber-600' : 'text-emerald-600'
                        }`}>{selectedRequisition.status}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

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
      {/* ─── PRINT / PDF GOODS RECEIPT NOTE MODAL ─── */}
      <AnimatePresence>
        {grnPrintData && (
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
                  <h3 className="text-sm font-black text-slate-900">Goods Receipt Note — Print Preview</h3>
                  <p className="text-[10px] text-slate-400 font-bold mt-0.5">{grnPrintData.grn_number} • {grnPrintData.vendor_name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const element = document.getElementById('grn-print-template');
                      html2canvas(element, { scale: 2, useCORS: true }).then((canvas) => {
                        const imgData = canvas.toDataURL('image/png');
                        const pdf = new jsPDF('p', 'mm', 'a4');
                        const pdfWidth = pdf.internal.pageSize.getWidth();
                        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
                        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                        pdf.save(`GRN-${grnPrintData.grn_number}.pdf`);
                      });
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-teal-700 hover:bg-teal-600 text-white text-xs font-bold rounded-xl cursor-pointer transition-all"
                  >
                    <Download size={14} /> Download PDF
                  </button>
                  <button onClick={() => setGrnPrintData(null)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 cursor-pointer">
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* The A4 print-preview body */}
              <div className="overflow-y-auto flex-1 p-6 bg-slate-100">
                <div id="grn-print-template" className="grn-page bg-white shadow-lg mx-auto" style={{ width: '210mm', minHeight: '297mm', padding: '16mm 14mm', fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#111' }}>
                  
                  {/* ── HEADER ── */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    {/* Logo */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <img src="/legacy-logo.png" alt="Legacy Clinics" style={{ height: '40px' }} />
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
                    <span style={{ fontWeight: '900', fontSize: '14px', letterSpacing: '1px' }}>Goods Receipt Note</span>
                  </div>

                  {/* GRN Meta Row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ marginBottom: '6px' }}>
                        <span style={{ fontWeight: 700 }}>Supplier: </span>
                        <span style={{ borderBottom: '1px solid #000', minWidth: '160px', display: 'inline-block', paddingBottom: '1px' }}>{grnPrintData.vendor_name}</span>
                      </div>
                      <div>
                        <span style={{ fontWeight: 700 }}>Invoice No: </span>
                        <span style={{ borderBottom: '1px solid #000', minWidth: '130px', display: 'inline-block' }}>{grnPrintData.invoice_number || '—'}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '18px', fontWeight: '900', marginBottom: '4px' }}>{grnPrintData.grn_number}</div>
                      <div style={{ fontSize: '9px', color: '#666' }}>Delivery Note No: <span style={{ borderBottom: '1px dotted #888', display: 'inline-block', minWidth: '60px' }}>{grnPrintData.delivery_note_number || '—'}</span></div>
                    </div>
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    <span style={{ fontWeight: 700 }}>Date Received: </span>
                    <span style={{ borderBottom: '1px solid #000', display: 'inline-block', minWidth: '130px' }}>{new Date(grnPrintData.received_at).toLocaleDateString()}</span>
                  </div>

                  {/* Items Table */}
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '0', fontSize: '11px' }}>
                    <thead>
                      <tr style={{ background: '#f5f5f5' }}>
                        <th style={{ border: '1px solid #000', padding: '5px 8px', fontWeight: 800, textAlign: 'center', width: '8%' }}>Sl. No.</th>
                        <th style={{ border: '1px solid #000', padding: '5px 8px', fontWeight: 800, textAlign: 'center' }}>Description of Items</th>
                        <th style={{ border: '1px solid #000', padding: '5px 8px', fontWeight: 800, textAlign: 'center', width: '15%' }}>Batch No.</th>
                        <th style={{ border: '1px solid #000', padding: '5px 8px', fontWeight: 800, textAlign: 'center', width: '10%' }}>Qty.</th>
                        <th style={{ border: '1px solid #000', padding: '5px 8px', fontWeight: 800, textAlign: 'center', width: '14%' }}>Unit Price</th>
                        <th style={{ border: '1px solid #000', padding: '5px 8px', fontWeight: 800, textAlign: 'center', width: '16%' }}>Total Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(grnPrintData.items || []).map((item, idx) => (
                        <tr key={idx}>
                          <td style={{ border: '1px solid #000', padding: '5px 8px', textAlign: 'center' }}>{idx + 1}</td>
                          <td style={{ border: '1px solid #000', padding: '5px 8px' }}>{item.item_name}</td>
                          <td style={{ border: '1px solid #000', padding: '5px 8px', textAlign: 'center', fontSize: '9px', fontFamily: 'monospace' }}>{item.batch_number || '—'}</td>
                          <td style={{ border: '1px solid #000', padding: '5px 8px', textAlign: 'center' }}>{item.quantity_received}</td>
                          <td style={{ border: '1px solid #000', padding: '5px 8px', textAlign: 'right' }}>{(item.purchase_price || 0).toLocaleString()}</td>
                          <td style={{ border: '1px solid #000', padding: '5px 8px', textAlign: 'right' }}>{((item.purchase_price || 0) * (item.quantity_received || 0)).toLocaleString()}</td>
                        </tr>
                      ))}
                      {/* Padding rows for empty lines */}
                      {Array.from({ length: Math.max(0, 10 - (grnPrintData.items || []).length) }).map((_, i) => (
                        <tr key={`empty-${i}`}>
                          <td style={{ border: '1px solid #000', padding: '5px 8px', height: '22px' }}>&nbsp;</td>
                          <td style={{ border: '1px solid #000', padding: '5px 8px' }}></td>
                          <td style={{ border: '1px solid #000', padding: '5px 8px' }}></td>
                          <td style={{ border: '1px solid #000', padding: '5px 8px' }}></td>
                          <td style={{ border: '1px solid #000', padding: '5px 8px' }}></td>
                          <td style={{ border: '1px solid #000', padding: '5px 8px' }}></td>
                        </tr>
                      ))}
                      {/* Subtotal */}
                      <tr>
                        <td colSpan={4} style={{ border: '1px solid #000', padding: '5px 8px' }}></td>
                        <td style={{ border: '1px solid #000', padding: '5px 8px', fontWeight: 800, textAlign: 'right', background: '#f5f5f5' }}>Total Value</td>
                        <td style={{ border: '1px solid #000', padding: '5px 8px', textAlign: 'right', fontWeight: 700 }}>
                          {((grnPrintData.items || []).reduce((s, i) => s + ((i.purchase_price || 0) * (i.quantity_received || 0)), 0)).toLocaleString()}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Notes / Footer */}
                  <div style={{ marginTop: '16px', fontSize: '10px' }}>
                    {grnPrintData.notes && <div style={{ marginTop: '4px', fontStyle: 'italic', color: '#555' }}>Note: {grnPrintData.notes}</div>}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '30px' }}>
                      <div style={{ width: '30%' }}>
                        <div style={{ borderTop: '1px solid #000', paddingTop: '4px', textAlign: 'center' }}>Received By (Signature)</div>
                      </div>
                      <div style={{ width: '30%' }}>
                        <div style={{ borderTop: '1px solid #000', paddingTop: '4px', textAlign: 'center' }}>Authorized Signature</div>
                      </div>
                    </div>
                  </div>

                  {/* Footer Banner */}
                  <div style={{ marginTop: '24px', background: '#1C69A0', color: 'white', textAlign: 'center', padding: '10px', borderRadius: '4px', fontWeight: '900', fontSize: '14px', letterSpacing: '2px' }}>
                    HEALTH FOR LIFE
                  </div>

                </div>
              </div>
            </motion.div>
          </div>
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
                      const element = document.getElementById('po-print-template');
                      html2canvas(element, { scale: 2, useCORS: true }).then((canvas) => {
                        const imgData = canvas.toDataURL('image/png');
                        const pdf = new jsPDF('p', 'mm', 'a4');
                        const pdfWidth = pdf.internal.pageSize.getWidth();
                        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
                        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                        pdf.save(`PO-${poPrintData.po_number}.pdf`);
                      });
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-teal-700 hover:bg-teal-600 text-white text-xs font-bold rounded-xl cursor-pointer transition-all"
                  >
                    <Download size={14} /> Download PDF
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
                      <img src="/legacy-logo.png" alt="Legacy Clinics" style={{ height: '40px' }} />
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
                  <div style={{ marginTop: '24px', background: '#1C69A0', color: 'white', textAlign: 'center', padding: '10px', borderRadius: '4px', fontWeight: '900', fontSize: '14px', letterSpacing: '2px' }}>
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
