import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ClipboardList, Plus, RefreshCw, Search, X, Check, ChevronDown,
  ChevronRight, Eye, AlertTriangle, Clock, CheckCircle2, XCircle,
  FlaskConical, Package, ArrowRight, Filter, Microscope, Droplet,
  Dna, Archive, Activity, ShieldCheck, Zap, Send, RotateCcw,
  Building2, Users, ArrowUpRight, FileText, Layers
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import {
  getUnitRequisitions, getUnitRequisitionItems,
  createUnitRequisition, labManagerReview, generalManagerReview,
  getInhandInventory, getGeneralStockLabItems
} from '../../api/lab';

// ── Role Helpers ──────────────────────────────────────────────────────────────
const isLabStockManager = (role) => {
  const r = (role || '').toLowerCase();
  return ['lab_stock_officer', 'lab_manager', 'lab_hod', 'admin', 'deputy_coo', 'coo', 'chairman'].includes(r);
};
const isGeneralStockManager = (role) => {
  const r = (role || '').toLowerCase();
  return ['stock-manager', 'stock_manager', 'admin', 'deputy_coo', 'coo', 'chairman'].includes(r);
};
const isLabUnit = (role) => {
  const r = (role || '').toLowerCase();
  return r.includes('lab') || r.includes('head_') || r.includes('micro') || r.includes('hematology') || r.includes('histopath') || r.includes('phlebotomy') || r.includes('molecular');
};

// ── Lab Units ─────────────────────────────────────────────────────────────────
const LAB_UNITS = [
  { id: 'Biochemistry', label: 'Biochemistry', icon: FlaskConical, color: '#1B669E', bgColor: '#e0f0fb' },
  { id: 'Hematology', label: 'Hematology', icon: Activity, color: '#dc2626', bgColor: '#fee2e2' },
  { id: 'Microbiology', label: 'Microbiology', icon: Microscope, color: '#059669', bgColor: '#d1fae5' },
  { id: 'Phlebotomy', label: 'Phlebotomy', icon: Droplet, color: '#0284c7', bgColor: '#e0f2fe' },
  { id: 'Histopathology', label: 'Histopathology', icon: Archive, color: '#d97706', bgColor: '#fef3c7' },
  { id: 'Molecular Biology', label: 'Molecular Biology', icon: Dna, color: '#7c3aed', bgColor: '#ede9fe' },
  { id: 'General Laboratory', label: 'General Laboratory', icon: Building2, color: '#0f766e', bgColor: '#ccfbf1' },
];

// ── Status Config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  Pending:   { label: 'Pending Review', bg: '#fffbeb', color: '#b45309', border: '#fbbf24', icon: Clock },
  Approved:  { label: 'Approved', bg: '#f0fdf4', color: '#15803d', border: '#4ade80', icon: CheckCircle2 },
  Rejected:  { label: 'Rejected', bg: '#fff1f2', color: '#be123c', border: '#fda4af', icon: XCircle },
  Forwarded: { label: 'Forwarded to Gen. Manager', bg: '#eff6ff', color: '#1d4ed8', border: '#93c5fd', icon: ArrowUpRight },
};

const URGENCY_CONFIG = {
  Normal: { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' },
  Urgent: { bg: '#fffbeb', color: '#b45309', border: '#fbbf24' },
  STAT:   { bg: '#fff1f2', color: '#be123c', border: '#fda4af' },
};

const ITEM_CATEGORIES = ['Reagents', 'Controls', 'Calibrators', 'Rapid Tests', 'Consumables', 'Stains & Buffers', 'Specimen Containers'];
const UOM_OPTIONS = ['pack', 'kit', 'bot', 'box', 'pcs', 'tubes', 'vials', 'cartridges', 'tests', 'strips'];

// ── Utility ───────────────────────────────────────────────────────────────────
const fmt = (dt) => {
  if (!dt) return '—';
  try {
    return new Date(dt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return dt; }
};

// ─────────────────────────────────────────────────────────────────────────────
export default function LabRequisitionHub({ embedded = false }) {
  const { user } = useAuth();
  const role = user?.role || '';

  // Role flags
  const canActAsLabManager = isLabStockManager(role);
  const canActAsGM = isGeneralStockManager(role);
  const canSubmit = isLabUnit(role) || canActAsLabManager;

  // ── State ──
  const [requisitions, setRequisitions] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [generalStockItems, setGeneralStockItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Tab: 'all' | 'pending' | 'forwarded' | 'approved' | 'rejected'
  const [tab, setTab] = useState('all');
  const [unitFilter, setUnitFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Detail drawer
  const [selected, setSelected] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [approvedQtys, setApprovedQtys] = useState({});

  // New Requisition Modal
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    requesting_unit: '',
    urgency: 'Normal',
    notes: '',
    stock_source: 'general_stock',
  });
  const [formItems, setFormItems] = useState([]);
  const [tempItem, setTempItem] = useState({ item_name: '', item_category: 'Reagents', unit_of_measure: 'pack', requested_quantity: '', inventory_ref_id: '' });

  // Action modals
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // ── Load Data ──
  const load = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);

      const [reqRes, invRes, genStockRes] = await Promise.allSettled([
        getUnitRequisitions(),
        getInhandInventory(),
        getGeneralStockLabItems()
      ]);

      if (reqRes.status === 'fulfilled' && reqRes.value.data.success) {
        setRequisitions(reqRes.value.data.data || []);
      }
      if (invRes.status === 'fulfilled' && invRes.value.data.success) {
        setInventory(invRes.value.data.data || []);
      }
      if (genStockRes.status === 'fulfilled' && genStockRes.value.data?.success) {
        setGeneralStockItems(genStockRes.value.data.data || []);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load requisitions.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Open detail drawer ──
  const openDetail = async (req) => {
    setSelected(req);
    setLoadingItems(true);
    setApprovedQtys({});
    try {
      const res = await getUnitRequisitionItems(req.id);
      const items = res.data.data || [];
      setSelectedItems(items);
      const initQtys = {};
      items.forEach(it => { initQtys[it.id] = it.requested_quantity; });
      setApprovedQtys(initQtys);
    } catch { toast.error('Could not load requisition items.'); }
    finally { setLoadingItems(false); }
  };

  // ── Filtered List ──
  const filtered = useMemo(() => {
    let list = requisitions;
    if (tab !== 'all') {
      const statusMap = { pending: 'Pending', forwarded: 'Forwarded', approved: 'Approved', rejected: 'Rejected' };
      list = list.filter(r => r.status === statusMap[tab]);
    }
    if (unitFilter !== 'All') list = list.filter(r => r.requesting_unit === unitFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(r =>
        r.ref_number?.toLowerCase().includes(q) ||
        r.requesting_unit?.toLowerCase().includes(q) ||
        r.requested_by_name?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [requisitions, tab, unitFilter, searchQuery]);

  // ── Counts ──
  const counts = useMemo(() => ({
    all: requisitions.length,
    pending: requisitions.filter(r => r.status === 'Pending').length,
    forwarded: requisitions.filter(r => r.status === 'Forwarded').length,
    approved: requisitions.filter(r => r.status === 'Approved').length,
    rejected: requisitions.filter(r => r.status === 'Rejected').length,
  }), [requisitions]);

  // ── Submit New Requisition ──
  const handleSubmit = async () => {
    if (!form.requesting_unit) { toast.error('Please select a requesting unit.'); return; }
    if (formItems.length === 0) { toast.error('Add at least one item.'); return; }
    setSubmitting(true);
    try {
      await createUnitRequisition({ ...form, items: formItems });
      toast.success('Requisition submitted successfully!');
      setShowModal(false);
      setForm({ requesting_unit: '', urgency: 'Normal', notes: '', stock_source: 'lab_stock' });
      setFormItems([]);
      load(true);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to submit requisition.');
    } finally { setSubmitting(false); }
  };

  const addTempItem = () => {
    if (!tempItem.item_name.trim()) { toast.error('Item name is required.'); return; }
    if (!tempItem.requested_quantity || Number(tempItem.requested_quantity) <= 0) {
      toast.error('Enter a valid quantity.'); return;
    }
    setFormItems(prev => [...prev, {
      ...tempItem,
      requested_quantity: Number(tempItem.requested_quantity),
      inventory_ref_id: tempItem.inventory_ref_id ? Number(tempItem.inventory_ref_id) : null,
    }]);
    setTempItem({ item_name: '', item_category: 'Reagents', unit_of_measure: 'pack', requested_quantity: '', inventory_ref_id: '' });
  };

  // ── Lab Manager Actions ──
  const handleLabManagerAction = async (action, notesOverride) => {
    if (!selected) return;
    if ((action === 'reject') && !rejectReason.trim()) {
      toast.error('Please provide a rejection reason.'); return;
    }
    setActionLoading(true);
    try {
      const body = {
        action,
        notes: action === 'reject' ? rejectReason : (notesOverride || null),
        approved_items: action === 'approve'
          ? selectedItems.map(it => ({ id: it.id, approved_quantity: approvedQtys[it.id] ?? it.requested_quantity }))
          : undefined,
      };
      await labManagerReview(selected.id, body);
      toast.success(
        action === 'approve' ? 'Requisition approved & stock deducted.' :
        action === 'forward_to_general' ? 'Forwarded to General Stock Manager.' :
        'Requisition rejected.'
      );
      setSelected(null);
      setShowRejectModal(false);
      setRejectReason('');
      load(true);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Action failed.');
    } finally { setActionLoading(false); }
  };

  // ── GM Actions ──
  const handleGMAction = async (action) => {
    if (!selected) return;
    if (action === 'reject' && !rejectReason.trim()) {
      toast.error('Please provide a rejection reason.'); return;
    }
    setActionLoading(true);
    try {
      await generalManagerReview(selected.id, {
        action,
        rejection_reason: action === 'reject' ? rejectReason : undefined,
      });
      toast.success(action === 'approve' ? 'Lab requisition approved.' : 'Requisition rejected.');
      setSelected(null);
      setShowRejectModal(false);
      setRejectReason('');
      load(true);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Action failed.');
    } finally { setActionLoading(false); }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: 12 }}>
        <div style={{ width: 40, height: 40, border: '3px solid #e2e8f0', borderTopColor: '#1B669E', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Loading Lab Requisitions…</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ padding: embedded ? 0 : '24px', maxWidth: embedded ? '100%' : 1440, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .req-row:hover { background-color: #f8fafc !important; }
        .action-btn:hover { opacity: 0.88; }
      `}</style>

      {/* ── Header ── */}
      {!embedded && (
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: '22px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ padding: 13, borderRadius: 14, background: '#1B669E', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(27,102,158,0.25)' }}>
              <ClipboardList size={26} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900, color: '#0f172a' }}>
                  Laboratory Requisition Hub
                </h1>
                <span style={{ fontSize: '0.72rem', fontFamily: 'monospace', fontWeight: 800, color: '#78350f', background: '#fef3c7', padding: '2px 8px', borderRadius: 6, border: '1px solid #fcd34d' }}>
                  Control No: LEG/PATHLAB/MSD/FM-12-VERS-004
                </span>
              </div>
              <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                Lab units submit consumable &amp; reagent requests · Lab Stock Manager reviews · General Manager approves forwarded items
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button onClick={() => load(true)} disabled={refreshing} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#475569', fontSize: '0.83rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <RefreshCw size={14} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
              Refresh
            </button>
            {canSubmit && (
              <button
                onClick={() => setShowModal(true)}
                style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: '#1B669E', color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, boxShadow: '0 2px 8px rgba(27,102,158,0.2)' }}
              >
                <Plus size={16} /> New Requisition
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Role Context Banner ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        {[
          { label: 'Lab Units', desc: 'Biochemistry · Hematology · Microbiology · Phlebotomy · Histopathology · Molecular Biology', icon: FlaskConical, color: '#1B669E', bg: '#e0f0fb' },
          { label: 'Lab Stock Manager', desc: 'Reviews all lab unit requisitions. Approves from lab stock or forwards to General Manager.', icon: Package, color: '#059669', bg: '#d1fae5' },
          { label: 'General Stock Manager', desc: 'Receives forwarded lab requisitions that require central store stock. Final approve/reject.', icon: Building2, color: '#7c3aed', bg: '#ede9fe' },
        ].map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '16px 18px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ padding: 10, borderRadius: 10, background: card.bg, color: card.color, flexShrink: 0 }}>
                <Icon size={20} />
              </div>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>{card.label}</div>
                <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: 2 }}>{card.desc}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── KPI Chips ── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {[
          { key: 'all', label: 'All', color: '#1B669E' },
          { key: 'pending', label: 'Pending', color: '#b45309' },
          { key: 'forwarded', label: 'Forwarded to GM', color: '#1d4ed8' },
          { key: 'approved', label: 'Approved', color: '#15803d' },
          { key: 'rejected', label: 'Rejected', color: '#be123c' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '7px 14px', borderRadius: 20,
              border: `1.5px solid ${tab === t.key ? t.color : '#e2e8f0'}`,
              background: tab === t.key ? t.color : '#fff',
              color: tab === t.key ? '#fff' : '#475569',
              fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 5,
              transition: 'all 0.15s ease',
            }}
          >
            {t.label} <span style={{ background: tab === t.key ? 'rgba(255,255,255,0.25)' : '#f1f5f9', padding: '1px 7px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 800, color: tab === t.key ? '#fff' : t.color }}>{counts[t.key]}</span>
          </button>
        ))}
      </div>

      {/* ── Filters ── */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by reference, unit, or requestor…"
            style={{ width: '100%', padding: '9px 12px 9px 34px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.84rem', outline: 'none', boxSizing: 'border-box', background: '#fff' }}
          />
        </div>
        <select
          value={unitFilter}
          onChange={e => setUnitFilter(e.target.value)}
          style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.84rem', background: '#fff', color: '#334155', fontWeight: 600, cursor: 'pointer' }}
        >
          <option value="All">All Units</option>
          {LAB_UNITS.map(u => <option key={u.id} value={u.id}>{u.label}</option>)}
        </select>
      </div>

      {/* ── Main Grid: List + Detail Panel ── */}
      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 480px' : '1fr', gap: 16, alignItems: 'start' }}>

        {/* ── Requisitions Table ── */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          {/* Table Head */}
          <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr 120px 90px 90px 90px', gap: 0, background: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '10px 16px' }}>
            {['Reference', 'Requesting Unit & Details', 'Status', 'Source', 'Urgency', ''].map(h => (
              <div key={h} style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</div>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center', color: '#94a3b8' }}>
              <ClipboardList size={36} style={{ marginBottom: 10, opacity: 0.4 }} />
              <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>No requisitions found</div>
              <div style={{ fontSize: '0.8rem', marginTop: 4 }}>
                {canSubmit ? 'Click "New Requisition" to submit the first one.' : 'No requisitions match your current filter.'}
              </div>
            </div>
          ) : (
            filtered.map(req => {
              const sc = STATUS_CONFIG[req.status] || STATUS_CONFIG.Pending;
              const uc = URGENCY_CONFIG[req.urgency] || URGENCY_CONFIG.Normal;
              const StatusIcon = sc.icon;
              const unitDef = LAB_UNITS.find(u => u.id === req.requesting_unit);
              const isActive = selected?.id === req.id;

              return (
                <div
                  key={req.id}
                  className="req-row"
                  onClick={() => openDetail(req)}
                  style={{
                    display: 'grid', gridTemplateColumns: '130px 1fr 120px 90px 90px 90px',
                    gap: 0, padding: '13px 16px',
                    borderBottom: '1px solid #f1f5f9',
                    cursor: 'pointer',
                    background: isActive ? '#eff6ff' : '#fff',
                    borderLeft: isActive ? '3px solid #1B669E' : '3px solid transparent',
                    transition: 'all 0.1s ease',
                  }}
                >
                  {/* Ref */}
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1B669E' }}>{req.ref_number}</div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 2 }}>{fmt(req.created_at).split(',')[0]}</div>
                  </div>

                  {/* Unit */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {unitDef && <unitDef.icon size={13} style={{ color: unitDef.color, flexShrink: 0 }} />}
                      <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0f172a' }}>{req.requesting_unit}</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 1 }}>
                      By: <strong>{req.requested_by_name || '—'}</strong> · {req.items_count || 0} item{req.items_count !== 1 ? 's' : ''}
                    </div>
                  </div>

                  {/* Status */}
                  <div>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '3px 9px', borderRadius: 20, fontSize: '0.73rem', fontWeight: 700,
                      background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`,
                    }}>
                      <StatusIcon size={10} />
                      {sc.label}
                    </span>
                  </div>

                  {/* Source */}
                  <div>
                    <span style={{
                      padding: '3px 8px', borderRadius: 8, fontSize: '0.72rem', fontWeight: 700,
                      background: req.stock_source === 'general_stock' ? '#ede9fe' : '#f0fdf4',
                      color: req.stock_source === 'general_stock' ? '#7c3aed' : '#15803d',
                    }}>
                      {req.stock_source === 'general_stock' ? 'General' : 'Lab'}
                    </span>
                  </div>

                  {/* Urgency */}
                  <div>
                    <span style={{ padding: '3px 8px', borderRadius: 8, fontSize: '0.72rem', fontWeight: 700, background: uc.bg, color: uc.color, border: `1px solid ${uc.border}` }}>
                      {req.urgency}
                    </span>
                  </div>

                  {/* Arrow */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                    <ChevronRight size={16} style={{ color: isActive ? '#1B669E' : '#cbd5e1' }} />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── Detail Panel ── */}
        {selected && (
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', position: 'sticky', top: 20 }}>
            {/* Panel Header */}
            <div style={{ padding: '18px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>Requisition Detail</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0f172a' }}>{selected.ref_number}</div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 2 }}>
                  Submitted {fmt(selected.created_at)} · by <strong>{selected.requested_by_name || '—'}</strong>
                </div>
              </div>
              <button onClick={() => setSelected(null)} style={{ padding: 6, borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#64748b' }}>
                <X size={16} />
              </button>
            </div>

            {/* Meta */}
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { label: 'Control Number', val: 'LEG/PATHLAB/MSD/FM-12-VERS-004' },
                { label: 'Requesting Unit', val: selected.requesting_unit },
                { label: 'Urgency', val: selected.urgency },
                { label: 'Stock Source', val: selected.stock_source === 'general_stock' ? 'General Store' : 'Lab Stock' },
                { label: 'Status', val: STATUS_CONFIG[selected.status]?.label || selected.status },
              ].map(m => (
                <div key={m.label} style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>{m.label}</div>
                  <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0f172a', marginTop: 2, fontFamily: m.label === 'Control Number' ? 'monospace' : 'inherit' }}>{m.val || '—'}</div>
                </div>
              ))}
            </div>

            {selected.notes && (
              <div style={{ padding: '10px 20px', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, marginBottom: 3 }}>NOTES</div>
                <div style={{ fontSize: '0.83rem', color: '#334155' }}>{selected.notes}</div>
              </div>
            )}

            {selected.rejection_reason && (
              <div style={{ padding: '10px 20px', borderBottom: '1px solid #f1f5f9', background: '#fff1f2' }}>
                <div style={{ fontSize: '0.72rem', color: '#be123c', fontWeight: 700, marginBottom: 3 }}>REJECTION REASON</div>
                <div style={{ fontSize: '0.83rem', color: '#9f1239' }}>{selected.rejection_reason}</div>
              </div>
            )}

            {/* Approval Trail */}
            {(selected.lab_manager_name || selected.general_manager_name) && (
              <div style={{ padding: '12px 20px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase' }}>Approval Trail</div>
                {selected.lab_manager_name && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#334155', marginBottom: 4 }}>
                    <span>Lab Stock Manager: <strong>{selected.lab_manager_name}</strong></span>
                    <span style={{ color: '#64748b' }}>{selected.lab_manager_action}</span>
                  </div>
                )}
                {selected.general_manager_name && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#334155' }}>
                    <span>General Manager: <strong>{selected.general_manager_name}</strong></span>
                    <span style={{ color: '#64748b' }}>{selected.general_manager_action}</span>
                  </div>
                )}
              </div>
            )}

            {/* Items */}
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0f172a', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Package size={14} style={{ color: '#1B669E' }} />
                Requisitioned Items
              </div>
              {loadingItems ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#94a3b8', fontSize: '0.82rem' }}>
                  <div style={{ width: 16, height: 16, border: '2px solid #e2e8f0', borderTopColor: '#1B669E', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                  Loading items…
                </div>
              ) : selectedItems.length === 0 ? (
                <div style={{ color: '#94a3b8', fontSize: '0.82rem' }}>No items found.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {selectedItems.map(item => (
                    <div key={item.id} style={{ padding: '10px 12px', borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>{item.item_name}</div>
                          <div style={{ fontSize: '0.73rem', color: '#64748b', marginTop: 2 }}>
                            {item.item_category} · {item.unit_of_measure}
                            {item.in_hand_qty !== undefined && item.in_hand_qty !== null && (
                              <span style={{ marginLeft: 6, color: Number(item.in_hand_qty) > 0 ? '#15803d' : '#be123c', fontWeight: 700 }}>
                                (In-Hand: {item.in_hand_qty})
                              </span>
                            )}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Requested</div>
                          <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0f172a' }}>{item.requested_quantity}</div>
                        </div>
                      </div>

                      {/* Approved qty input for Lab Manager when pending */}
                      {canActAsLabManager && selected.status === 'Pending' && (
                        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>Approve Qty:</div>
                          <input
                            type="number"
                            min={0}
                            max={item.requested_quantity}
                            value={approvedQtys[item.id] ?? item.requested_quantity}
                            onChange={e => setApprovedQtys(prev => ({ ...prev, [item.id]: Number(e.target.value) }))}
                            style={{ width: 72, padding: '4px 8px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: '0.84rem', fontWeight: 700, textAlign: 'center' }}
                          />
                          <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>/ {item.requested_quantity} {item.unit_of_measure}</span>
                        </div>
                      )}

                      {/* Approved qty for completed */}
                      {selected.status === 'Approved' && item.approved_quantity !== null && (
                        <div style={{ marginTop: 6, fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4, color: '#15803d', fontWeight: 700 }}>
                          <Check size={12} /> Approved: {item.approved_quantity} {item.unit_of_measure}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Action Buttons ── */}
            <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>

              {/* Lab Manager Actions (on Pending requisitions) */}
              {canActAsLabManager && selected.status === 'Pending' && (
                <>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 2 }}>Lab Stock Manager Actions</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      className="action-btn"
                      disabled={actionLoading}
                      onClick={() => handleLabManagerAction('approve')}
                      style={{ flex: 1, padding: '9px 12px', borderRadius: 8, border: 'none', background: '#15803d', color: '#fff', fontWeight: 700, fontSize: '0.83rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                    >
                      <Check size={14} /> Approve (Lab Stock)
                    </button>
                    <button
                      className="action-btn"
                      disabled={actionLoading}
                      onClick={() => handleLabManagerAction('forward_to_general', 'Forwarded: items not available in lab stock.')}
                      style={{ flex: 1, padding: '9px 12px', borderRadius: 8, border: 'none', background: '#1d4ed8', color: '#fff', fontWeight: 700, fontSize: '0.83rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                    >
                      <Send size={13} /> Forward to GM
                    </button>
                  </div>
                  <button
                    className="action-btn"
                    disabled={actionLoading}
                    onClick={() => setShowRejectModal('lab')}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #fda4af', background: '#fff1f2', color: '#be123c', fontWeight: 700, fontSize: '0.83rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  >
                    <X size={13} /> Reject
                  </button>
                </>
              )}

              {/* General Manager Actions (on Forwarded requisitions) */}
              {canActAsGM && selected.status === 'Forwarded' && (
                <>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 2 }}>General Stock Manager Actions</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="action-btn"
                      disabled={actionLoading}
                      onClick={() => handleGMAction('approve')}
                      style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: 'none', background: '#15803d', color: '#fff', fontWeight: 700, fontSize: '0.84rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                    >
                      <Check size={14} /> Approve
                    </button>
                    <button
                      className="action-btn"
                      disabled={actionLoading}
                      onClick={() => setShowRejectModal('gm')}
                      style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: '1px solid #fda4af', background: '#fff1f2', color: '#be123c', fontWeight: 700, fontSize: '0.84rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                    >
                      <X size={13} /> Reject
                    </button>
                  </div>
                </>
              )}

              {(selected.status === 'Approved' || selected.status === 'Rejected') && (
                <div style={{ padding: '10px 14px', borderRadius: 10, background: selected.status === 'Approved' ? '#f0fdf4' : '#fff1f2', border: `1px solid ${selected.status === 'Approved' ? '#4ade80' : '#fda4af'}`, fontSize: '0.82rem', fontWeight: 700, color: selected.status === 'Approved' ? '#15803d' : '#be123c', display: 'flex', alignItems: 'center', gap: 8 }}>
                  {selected.status === 'Approved' ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
                  This requisition has been {selected.status.toLowerCase()}.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Reject Modal ── */}
      {showRejectModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 24 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 440, boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }}>
            <div style={{ fontWeight: 900, fontSize: '1.05rem', color: '#0f172a', marginBottom: 6 }}>Confirm Rejection</div>
            <p style={{ fontSize: '0.84rem', color: '#64748b', margin: '0 0 16px' }}>
              Please provide a reason for rejecting <strong>{selected?.ref_number}</strong>.
            </p>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.85rem', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: 10, marginTop: 14, justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowRejectModal(false); setRejectReason(''); }} style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569', fontWeight: 700, cursor: 'pointer', fontSize: '0.84rem' }}>
                Cancel
              </button>
              <button
                onClick={() => showRejectModal === 'lab' ? handleLabManagerAction('reject') : handleGMAction('reject')}
                disabled={actionLoading || !rejectReason.trim()}
                style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: '#be123c', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.84rem', opacity: rejectReason.trim() ? 1 : 0.5 }}
              >
                {actionLoading ? 'Rejecting…' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── New Requisition Modal ── */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 9999, padding: '40px 16px', overflowY: 'auto' }}>
          <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 680, boxShadow: '0 24px 64px rgba(0,0,0,0.18)', overflow: 'hidden' }}>
            {/* Modal Header */}
            <div style={{ background: '#1B669E', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ color: '#fff', fontWeight: 900, fontSize: '1.1rem' }}>New Lab Requisition</div>
                  <span style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: '0.72rem', fontFamily: 'monospace', fontWeight: 800, padding: '2px 8px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.35)' }}>
                    Control No: LEG/PATHLAB/MSD/FM-12-VERS-004
                  </span>
                </div>
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.78rem', marginTop: 3 }}>
                  Submit consumable or reagent request to the Lab Stock Manager or General Store
                </div>
              </div>
              <button onClick={() => setShowModal(false)} style={{ padding: 6, borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.15)', color: '#fff', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Requesting Unit */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#475569', marginBottom: 6, textTransform: 'uppercase' }}>Requesting Unit *</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {LAB_UNITS.map(u => {
                    const Icon = u.icon;
                    const sel = form.requesting_unit === u.id;
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, requesting_unit: u.id }))}
                        style={{
                          padding: '10px 8px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                          border: `1.5px solid ${sel ? u.color : '#e2e8f0'}`,
                          background: sel ? u.bgColor : '#f8fafc',
                          display: 'flex', alignItems: 'center', gap: 8,
                        }}
                      >
                        <Icon size={14} style={{ color: u.color, flexShrink: 0 }} />
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: sel ? u.color : '#334155' }}>{u.id}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Urgency & Stock Source Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#475569', marginBottom: 6, textTransform: 'uppercase' }}>Urgency</label>
                  <select
                    value={form.urgency}
                    onChange={e => setForm(f => ({ ...f, urgency: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.85rem', background: '#fff', color: '#334155', fontWeight: 600 }}
                  >
                    <option value="Normal">Normal</option>
                    <option value="Urgent">Urgent</option>
                    <option value="STAT">STAT</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#475569', marginBottom: 6, textTransform: 'uppercase' }}>Stock Source</label>
                  <select
                    value={form.stock_source}
                    onChange={e => setForm(f => ({ ...f, stock_source: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.85rem', background: '#fff', color: '#334155', fontWeight: 600 }}
                  >
                    <option value="lab_stock">Lab Stock (Lab Manager handles)</option>
                    <option value="general_stock">General Stock (Forward to GM)</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#475569', marginBottom: 6, textTransform: 'uppercase' }}>Notes / Justification</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.85rem', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              {/* Item Builder */}
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 14 }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Package size={15} style={{ color: '#1B669E' }} />
                  Add Requisition Items
                </div>

                {/* Add Item Form */}
                <div style={{ padding: 14, borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', marginBottom: 4 }}>ITEM NAME *</div>
                      {/* Linked from inventory or general stock dropdown */}
                      <select
                        value={tempItem.inventory_ref_id}
                        onChange={e => {
                          const refId = e.target.value;
                          if (form.stock_source === 'general_stock') {
                            const genItem = generalStockItems.find(i => String(i.id) === refId);
                            if (genItem) {
                              setTempItem(t => ({
                                ...t,
                                inventory_ref_id: refId,
                                item_name: genItem.name,
                                item_category: genItem.category || 'Reagents',
                                unit_of_measure: genItem.unit_of_measure || 'pcs'
                              }));
                            } else {
                              setTempItem(t => ({ ...t, inventory_ref_id: '' }));
                            }
                          } else {
                            const inv = inventory.find(i => String(i.id) === refId);
                            if (inv) {
                              setTempItem(t => ({
                                ...t,
                                inventory_ref_id: refId,
                                item_name: inv.item_name,
                                item_category: inv.category || 'Reagents',
                                unit_of_measure: inv.unit_of_measure || 'pack'
                              }));
                            } else {
                              setTempItem(t => ({ ...t, inventory_ref_id: '' }));
                            }
                          }
                        }}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid #e2e8f0', fontSize: '0.83rem', background: '#fff', color: '#334155' }}
                      >
                        <option value="">— Select {form.stock_source === 'general_stock' ? 'from Central Store Lab items' : 'from Lab stock'} or enter manually —</option>
                        {form.stock_source === 'general_stock'
                          ? generalStockItems.map(it => (
                              <option key={it.id} value={it.id}>
                                {it.sku ? `[${it.sku}] ` : ''}{it.name} (Central Store: {it.central_store_quantity} {it.unit_of_measure || 'pcs'})
                              </option>
                            ))
                          : inventory.map(inv => (
                              <option key={inv.id} value={inv.id}>
                                {inv.item_name} ({inv.quantity_in_hand} {inv.unit_of_measure})
                              </option>
                            ))
                        }
                      </select>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', marginBottom: 4 }}>OR ENTER ITEM NAME</div>
                      <input
                        type="text"
                        value={tempItem.item_name}
                        onChange={e => setTempItem(t => ({ ...t, item_name: e.target.value, inventory_ref_id: '' }))}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid #e2e8f0', fontSize: '0.83rem', boxSizing: 'border-box', outline: 'none' }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                    <div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', marginBottom: 4 }}>CATEGORY</div>
                      <select
                        value={tempItem.item_category}
                        onChange={e => setTempItem(t => ({ ...t, item_category: e.target.value }))}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid #e2e8f0', fontSize: '0.83rem', background: '#fff' }}
                      >
                        {ITEM_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', marginBottom: 4 }}>UNIT OF MEASURE</div>
                      <select
                        value={tempItem.unit_of_measure}
                        onChange={e => setTempItem(t => ({ ...t, unit_of_measure: e.target.value }))}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid #e2e8f0', fontSize: '0.83rem', background: '#fff' }}
                      >
                        {UOM_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', marginBottom: 4 }}>QTY REQUESTED *</div>
                      <input
                        type="number"
                        min={1}
                        value={tempItem.requested_quantity}
                        onChange={e => setTempItem(t => ({ ...t, requested_quantity: e.target.value }))}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid #e2e8f0', fontSize: '0.85rem', fontWeight: 700, boxSizing: 'border-box', outline: 'none', textAlign: 'center' }}
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={addTempItem}
                    style={{ alignSelf: 'flex-end', padding: '8px 16px', borderRadius: 7, border: 'none', background: '#1B669E', color: '#fff', fontWeight: 700, fontSize: '0.83rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <Plus size={13} /> Add Item
                  </button>
                </div>

                {/* Items List */}
                {formItems.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {formItems.map((it, idx) => (
                      <div key={idx} style={{ padding: '9px 12px', borderRadius: 8, background: '#f0fdf4', border: '1px solid #4ade80', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>{it.item_name}</span>
                          <span style={{ marginLeft: 8, fontSize: '0.75rem', color: '#64748b' }}>{it.item_category} · {it.requested_quantity} {it.unit_of_measure}</span>
                        </div>
                        <button onClick={() => setFormItems(prev => prev.filter((_, i) => i !== idx))} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444' }}>
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit */}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
                <button onClick={() => setShowModal(false)} style={{ padding: '10px 18px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !form.requesting_unit || formItems.length === 0}
                  style={{ padding: '10px 22px', borderRadius: 8, border: 'none', background: '#1B669E', color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: '0.86rem', display: 'flex', alignItems: 'center', gap: 7, opacity: (submitting || !form.requesting_unit || formItems.length === 0) ? 0.55 : 1 }}
                >
                  {submitting ? 'Submitting…' : <><Send size={14} /> Submit Requisition</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
