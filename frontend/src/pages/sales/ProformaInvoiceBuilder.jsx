import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Save, Printer, Mail, Plus, Trash2, RefreshCw, Eye, CheckCircle2,
  FileSpreadsheet, Sparkles, Building2, User, Phone, DollarSign, Calendar,
  ChevronDown, AlertCircle, ArrowLeft, Send, Copy, Search, Shield, Check, UserCheck
} from 'lucide-react';
import ProformaInvoicePrintView from './ProformaInvoicePrintView';
import { createProforma, updateProforma, getSalesCatalog, sendProformaEmail } from '../../api/sales';
import { searchPatients, getPatientByPid } from '../../api/patients';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';



export default function ProformaInvoiceBuilder({
  initialProforma = null,
  onSaved = () => { },
  onCancel = null
}) {
  const { user } = useAuth();
  const [catalog, setCatalog] = useState([]);
  const [catalogFilter, setCatalogFilter] = useState('');
  const [saving, setSaving] = useState(false);
  const [emailing, setEmailing] = useState(false);
  const [activeViewTab, setActiveViewTab] = useState('editor'); // 'editor' | 'preview'
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [customEmailNote, setCustomEmailNote] = useState('');

  // Sukraa Patient Pull State
  const [sukraaQuery, setSukraaQuery] = useState('');
  const [sukraaResults, setSukraaResults] = useState([]);
  const [isSukraaSearching, setIsSukraaSearching] = useState(false);
  const [showSukraaDropdown, setShowSukraaDropdown] = useState(false);
  const [selectedSukraaPatient, setSelectedSukraaPatient] = useState(null);
  const [isPidLookingUp, setIsPidLookingUp] = useState(false);
  const sukraaRef = useRef(null);

  // Line Items Description Autocomplete State
  const [activeAutocompleteRow, setActiveAutocompleteRow] = useState(null);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const autocompleteRef = useRef(null);

  // Form State - Empty by default
  const [formData, setFormData] = useState({
    invoice_number: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: 'N/A',
    customer_id: '',
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    customer_tin: '',
    customer_address: '',
    items: [],
    taxable_amount: 0,
    tax_due: 0,
    other_fees: 0,
    currency: 'RWF',
    prepared_by_title: 'Sales Manager',
    prepared_by_name: user?.fullName || user?.full_name || 'Sofia (Sales Manager)',
    contact_person: 'Sofia, 0787363970, E-mail: sofia@legacyclinics.rw',
    notes: '',
    status: 'Draft'
  });

  useEffect(() => {
    if (initialProforma) {
      setFormData({
        ...initialProforma,
        items: Array.isArray(initialProforma.items) ? initialProforma.items : []
      });
      setRecipientEmail(initialProforma.customer_email || '');
    }
  }, [initialProforma]);

  useEffect(() => {
    getSalesCatalog()
      .then(res => {
        if (res.data?.data) setCatalog(res.data.data);
      })
      .catch(err => console.error('Failed to load service catalog:', err));
  }, []);

  // ── Click Outside Handler for Dropdowns ──
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (sukraaRef.current && !sukraaRef.current.contains(e.target)) {
        setShowSukraaDropdown(false);
      }
      if (autocompleteRef.current && !autocompleteRef.current.contains(e.target)) {
        setActiveAutocompleteRow(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!sukraaQuery || sukraaQuery.trim().length < 2) {
      setSukraaResults([]);
      setShowSukraaDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSukraaSearching(true);
      try {
        const res = await searchPatients(sukraaQuery.trim());
        const data = res.data?.data || [];
        setSukraaResults(data);
        setShowSukraaDropdown(true);
      } catch (err) {
        console.error('Sukraa search failed:', err);
      } finally {
        setIsSukraaSearching(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [sukraaQuery]);

  const handleSelectSukraaPatient = (patient) => {
    setSelectedSukraaPatient(patient);
    setSukraaQuery(patient.full_name || patient.pid);
    setShowSukraaDropdown(false);

    setFormData(prev => ({
      ...prev,
      customer_name: (patient.full_name || '').toUpperCase(),
      customer_id: patient.pid || prev.customer_id,
      customer_phone: patient.phone || prev.customer_phone,
      notes: patient.insurance
        ? `Patient: ${patient.full_name} (PID: ${patient.pid}) | Payer: ${patient.insurance}${patient.ref_type ? ` (${patient.ref_type})` : ''}`
        : prev.notes
    }));

    toast.success(`Loaded "${patient.full_name}" (PID: ${patient.pid}) from Sukraa!`);
  };

  const handleClearSukraaPatient = () => {
    setSelectedSukraaPatient(null);
    setSukraaQuery('');
    setShowSukraaDropdown(false);
  };

  const handlePidLookup = async () => {
    const pid = (formData.customer_id || '').trim();
    if (!pid) {
      toast.error('Please enter a Patient ID (PID) to lookup');
      return;
    }
    setIsPidLookingUp(true);
    try {
      const res = await getPatientByPid(pid);
      if (res.data?.success && res.data?.data) {
        handleSelectSukraaPatient(res.data.data);
      } else {
        toast.error(`Patient with PID "${pid}" not found in Sukraa`);
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || `PID "${pid}" not found in Sukraa`);
    } finally {
      setIsPidLookingUp(false);
    }
  };

  // Compute live subtotal and total
  const subtotal = formData.items.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
  const totalAmount = subtotal + (Number(formData.tax_due) || 0) + (Number(formData.other_fees) || 0);

  const handleItemChange = (index, field, value) => {
    const updated = [...formData.items];
    const item = { ...updated[index], [field]: value };

    const qty = Math.max(1, parseFloat(item.quantity) || 1);
    const up = Math.max(0, parseFloat(item.unit_price) || 0);
    item.amount = qty * up;

    updated[index] = item;
    setFormData(prev => ({ ...prev, items: updated }));
  };

  // Autocomplete suggestions matching current row description
  const activeRowDescription = (activeAutocompleteRow !== null && formData.items[activeAutocompleteRow])
    ? (formData.items[activeAutocompleteRow].description || '').trim().toLowerCase()
    : '';

  const autocompleteMatches = useMemo(() => {
    if (!activeRowDescription || activeRowDescription.length < 1) return [];

    const terms = activeRowDescription.split(/\s+/).filter(Boolean);
    const results = [];

    for (const item of catalog) {
      const name = (item.name || '').toLowerCase();
      const code = (item.code || '').toLowerCase();
      const dept = (item.department || '').toLowerCase();
      const cat = (item.category || '').toLowerCase();

      // Check if all space-separated terms are matched
      const matches = terms.every(term =>
        name.includes(term) || code.includes(term) || dept.includes(term) || cat.includes(term)
      );

      if (matches) {
        results.push(item);
        if (results.length >= 30) break;
      }
    }
    return results;
  }, [catalog, activeRowDescription]);

  const handleSelectAutocomplete = (rowIdx, catalogItem) => {
    const updated = [...formData.items];
    const current = updated[rowIdx] || { quantity: 1 };
    const qty = Math.max(1, parseFloat(current.quantity) || 1);
    const up = Math.max(0, parseFloat(catalogItem.default_price) || 0);

    updated[rowIdx] = {
      ...current,
      description: catalogItem.name,
      code: catalogItem.code || '',
      department: catalogItem.department || '',
      unit_price: up,
      amount: qty * up
    };

    setFormData(prev => ({ ...prev, items: updated }));
    setActiveAutocompleteRow(null);
    setHighlightedIndex(0);
  };

  const handleDescriptionKeyDown = (e, rowIdx) => {
    if (activeAutocompleteRow !== rowIdx || autocompleteMatches.length === 0) {
      if (e.key === 'ArrowDown' && autocompleteMatches.length > 0) {
        setActiveAutocompleteRow(rowIdx);
        setHighlightedIndex(0);
        e.preventDefault();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev + 1) % autocompleteMatches.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev - 1 + autocompleteMatches.length) % autocompleteMatches.length);
    } else if (e.key === 'Enter') {
      if (autocompleteMatches[highlightedIndex]) {
        e.preventDefault();
        handleSelectAutocomplete(rowIdx, autocompleteMatches[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setActiveAutocompleteRow(null);
    }
  };

  const handleAddItem = (preset = null) => {
    const newItem = preset ? {
      description: preset.name,
      quantity: 1,
      unit_price: preset.default_price,
      amount: preset.default_price
    } : {
      description: '',
      quantity: 1,
      unit_price: 0,
      amount: 0
    };

    setFormData(prev => {
      const nextItems = [...prev.items, newItem];
      if (!preset) {
        setActiveAutocompleteRow(nextItems.length - 1);
        setHighlightedIndex(0);
      }
      return {
        ...prev,
        items: nextItems
      };
    });
  };

  const handleRemoveItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleSave = async (status = null) => {
    if (!formData.customer_name?.trim()) {
      toast.error('Please enter the customer / client name');
      return;
    }
    if (formData.items.length === 0) {
      toast.error('Please add at least one line item');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        subtotal,
        total_amount: totalAmount,
        status: status || formData.status || 'Draft'
      };

      let res;
      if (formData.id) {
        res = await updateProforma(formData.id, payload);
        toast.success(`Proforma ${res.data.data.invoice_number} updated successfully!`);
      } else {
        res = await createProforma(payload);
        toast.success(`Proforma ${res.data.data.invoice_number} created successfully!`);
        setFormData(res.data.data);
      }
      onSaved(res.data.data);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to save proforma invoice');
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSendEmail = async (e) => {
    e.preventDefault();
    if (!recipientEmail || !recipientEmail.trim()) {
      toast.error('Please enter a recipient email');
      return;
    }

    // Save first if not yet saved
    setEmailing(true);
    try {
      let proformaId = formData.id;
      if (!proformaId) {
        const payload = { ...formData, subtotal, total_amount: totalAmount, customer_email: recipientEmail };
        const createRes = await createProforma(payload);
        proformaId = createRes.data.data.id;
        setFormData(createRes.data.data);
      }

      const emailRes = await sendProformaEmail(proformaId, {
        recipient_email: recipientEmail.trim(),
        custom_message: customEmailNote
      });

      toast.success(emailRes.data.message || 'Proforma sent to client successfully!');
      setIsEmailModalOpen(false);
      setFormData(prev => ({ ...prev, status: 'Sent' }));
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to send email to client');
    } finally {
      setEmailing(false);
    }
  };

  const filteredCatalog = catalog.filter(c =>
    !catalogFilter ||
    c.name.toLowerCase().includes(catalogFilter.toLowerCase()) ||
    c.department.toLowerCase().includes(catalogFilter.toLowerCase())
  );

  return (
    <div className="proforma-builder-root" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* ── Top Action Toolbar ── */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        padding: '16px 20px',
        backgroundColor: '#ffffff',
        borderRadius: '14px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#f8fafc',
                color: '#475569',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <ArrowLeft size={16} /> Back
            </button>
          )}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                {formData.id ? `Edit Proforma #${formData.invoice_number}` : 'New Proforma Invoice'}
              </h2>
              <span style={{
                padding: '3px 10px',
                borderRadius: '12px',
                fontSize: '0.75rem',
                fontWeight: 700,
                backgroundColor: formData.status === 'Paid' ? '#dcfce7' : formData.status === 'Sent' ? '#e0f2fe' : '#fef3c7',
                color: formData.status === 'Paid' ? '#15803d' : formData.status === 'Sent' ? '#0369a1' : '#b45309'
              }}>
                {formData.status || 'Draft'}
              </span>
            </div>
            <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#64748b' }}>
              Official Legacy Clinics &amp; Diagnostics Quotation &amp; Proforma Invoice Generator
            </p>
          </div>
        </div>

        {/* View toggle & Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Editor vs Preview Mode */}
          <div style={{
            display: 'inline-flex',
            padding: '3px',
            backgroundColor: '#f1f5f9',
            borderRadius: '10px',
            border: '1px solid #e2e8f0'
          }}>
            <button
              type="button"
              onClick={() => setActiveViewTab('editor')}
              style={{
                padding: '6px 14px',
                borderRadius: '7px',
                border: 'none',
                fontSize: '0.8rem',
                fontWeight: 700,
                backgroundColor: activeViewTab === 'editor' ? '#ffffff' : 'transparent',
                color: activeViewTab === 'editor' ? '#0284c7' : '#64748b',
                boxShadow: activeViewTab === 'editor' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                cursor: 'pointer'
              }}
            >
              ✏️ Form Editor
            </button>
            <button
              type="button"
              onClick={() => setActiveViewTab('preview')}
              style={{
                padding: '6px 14px',
                borderRadius: '7px',
                border: 'none',
                fontSize: '0.8rem',
                fontWeight: 700,
                backgroundColor: activeViewTab === 'preview' ? '#ffffff' : 'transparent',
                color: activeViewTab === 'preview' ? '#0284c7' : '#64748b',
                boxShadow: activeViewTab === 'preview' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                cursor: 'pointer'
              }}
            >
              <Eye size={14} style={{ display: 'inline', marginRight: '4px' }} /> Preview Sheet
            </button>
          </div>

          <button
            type="button"
            onClick={handlePrint}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              backgroundColor: '#f8fafc',
              color: '#334155',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            <Printer size={15} /> Print / PDF
          </button>

          <button
            type="button"
            onClick={() => {
              setRecipientEmail(formData.customer_email || '');
              setIsEmailModalOpen(true);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              backgroundColor: '#e0f2fe',
              color: '#0369a1',
              border: '1px solid #bae6fd',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            <Mail size={15} /> Email Client
          </button>

          <button
            type="button"
            onClick={() => handleSave('Draft')}
            disabled={saving}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 18px',
              backgroundColor: '#003b44',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: saving ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 6px rgba(0,59,68,0.2)'
            }}
          >
            <Save size={15} /> {saving ? 'Saving...' : 'Save Proforma'}
          </button>
        </div>
      </div>

      {/* ── Content View ── */}
      {activeViewTab === 'preview' ? (
        /* Preview / Printable View */
        <div style={{
          backgroundColor: '#f8fafc',
          padding: '24px',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.02)'
        }}>
          <div style={{
            maxWidth: '860px',
            margin: '0 auto',
            backgroundColor: '#ffffff',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            borderRadius: '4px'
          }}>
            <ProformaInvoicePrintView proforma={{ ...formData, subtotal, total_amount: totalAmount }} />
          </div>
        </div>
      ) : (
        /* Form Editor View */
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px', alignItems: 'start' }}>
          {/* Main Form (Left) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* 1. Header Details Card */}
            <div style={{
              backgroundColor: '#ffffff',
              padding: '20px',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
            }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building2 size={16} color="#0284c7" /> Proforma Header &amp; Metadata
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    INVOICE DATE
                  </label>
                  <input
                    type="date"
                    value={formData.invoice_date}
                    onChange={(e) => setFormData(p => ({ ...p, invoice_date: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.85rem',
                      outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    INVOICE # (Leave blank for auto)
                  </label>
                  <input
                    type="text"
                    placeholder="Auto (e.g. LC/PI/2026/0001)"
                    value={formData.invoice_number}
                    onChange={(e) => setFormData(p => ({ ...p, invoice_number: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>
                      CUSTOMER ID / PID
                    </label>
                    {formData.customer_id && (
                      <button
                        type="button"
                        onClick={handlePidLookup}
                        disabled={isPidLookingUp}
                        style={{
                          background: 'none',
                          border: 'none',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          color: '#0284c7',
                          cursor: 'pointer',
                          padding: 0
                        }}
                      >
                        {isPidLookingUp ? 'Searching...' : '🔍 Pull Sukraa'}
                      </button>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <input
                      type="text"
                      placeholder="e.g. 23022172"
                      value={formData.customer_id}
                      onChange={(e) => setFormData(p => ({ ...p, customer_id: e.target.value }))}
                      style={{
                        flex: 1,
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        outline: 'none'
                      }}
                    />
                    <button
                      type="button"
                      onClick={handlePidLookup}
                      disabled={isPidLookingUp || !formData.customer_id}
                      title="Fetch patient details from Sukraa by PID"
                      style={{
                        padding: '0 10px',
                        borderRadius: '8px',
                        border: '1px solid #bae6fd',
                        backgroundColor: '#e0f2fe',
                        color: '#0369a1',
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        cursor: formData.customer_id ? 'pointer' : 'not-allowed',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {isPidLookingUp ? '...' : 'Pull'}
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    DUE DATE
                  </label>
                  <input
                    type="text"
                    placeholder="N/A"
                    value={formData.due_date}
                    onChange={(e) => setFormData(p => ({ ...p, due_date: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.85rem',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* 2. Customer / Recipient Card */}
            <div style={{
              backgroundColor: '#ffffff',
              padding: '20px',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <User size={16} color="#0284c7" /> Proforma Invoice To (Recipient)
                </h3>
                <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 700, backgroundColor: '#f0fdf4', padding: '3px 8px', borderRadius: '12px', border: '1px solid #bbf7d0', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Sparkles size={12} /> HIMS Sync Enabled
                </span>
              </div>

              {/* ── Sukraa Patient Search & Autocomplete ── */}
              <div ref={sukraaRef} style={{
                marginBottom: '18px',
                padding: '14px 16px',
                borderRadius: '12px',
                backgroundColor: '#f0fdf4',
                border: '1.5px solid #86efac',
                position: 'relative'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Search size={14} /> Pull Patient Details from SUKRAA Database:
                  </label>
                  {selectedSukraaPatient && (
                    <button
                      type="button"
                      onClick={handleClearSukraaPatient}
                      style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: '#dc2626',
                        cursor: 'pointer',
                        padding: '0 4px'
                      }}
                    >
                      Clear Selection
                    </button>
                  )}
                </div>

                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="Search by Patient Name, PID (e.g. 23022172), or Phone number..."
                    value={sukraaQuery}
                    onChange={(e) => {
                      setSukraaQuery(e.target.value);
                      setShowSukraaDropdown(true);
                    }}
                    onFocus={() => { if (sukraaResults.length > 0) setShowSukraaDropdown(true); }}
                    style={{
                      width: '100%',
                      padding: '9px 36px 9px 12px',
                      borderRadius: '8px',
                      border: '1.5px solid #4ade80',
                      backgroundColor: '#ffffff',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      outline: 'none',
                      color: '#0f172a'
                    }}
                  />
                  {isSukraaSearching ? (
                    <RefreshCw size={15} className="spin" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#16a34a' }} />
                  ) : sukraaQuery ? (
                    <button
                      type="button"
                      onClick={() => { setSukraaQuery(''); setShowSukraaDropdown(false); }}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        fontSize: '1.1rem',
                        lineHeight: 1
                      }}
                    >
                      ×
                    </button>
                  ) : null}
                </div>

                {/* Dropdown Results Menu */}
                {showSukraaDropdown && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '4px',
                    backgroundColor: '#ffffff',
                    borderRadius: '10px',
                    border: '1.5px solid #86efac',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                    maxHeight: '260px',
                    overflowY: 'auto',
                    zIndex: 50
                  }}>
                    {isSukraaSearching ? (
                      <div style={{ padding: '16px', textAlign: 'center', color: '#16a34a', fontSize: '0.8rem', fontWeight: 600 }}>
                        <RefreshCw size={14} className="spin" style={{ display: 'inline', marginRight: '6px' }} /> Searching SUKRAA records...
                      </div>
                    ) : sukraaResults.length === 0 ? (
                      <div style={{ padding: '16px', textAlign: 'center', color: '#64748b', fontSize: '0.8rem' }}>
                        No patients found matching "{sukraaQuery}". You can enter details manually below.
                      </div>
                    ) : (
                      sukraaResults.map((p, idx) => (
                        <div
                          key={p.pid || idx}
                          onClick={() => handleSelectSukraaPatient(p)}
                          style={{
                            padding: '10px 14px',
                            borderBottom: idx < sukraaResults.length - 1 ? '1px solid #f1f5f9' : 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            transition: 'background 0.15s'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f0fdf4'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                        >
                          <div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>
                              {p.full_name}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                              <span style={{ fontWeight: 700, color: '#0369a1' }}>PID: {p.pid}</span>
                              {p.phone && <span>• 📞 {p.phone}</span>}
                              {p.gender && <span>• {p.gender}</span>}
                              {p.age && <span>• {p.age} yrs</span>}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{
                              padding: '3px 8px',
                              borderRadius: '10px',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              backgroundColor: p.insurance ? '#e0f2fe' : '#f1f5f9',
                              color: p.insurance ? '#0369a1' : '#475569'
                            }}>
                              {p.insurance || p.ref_type || 'Private'}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Selected Sukraa Patient Confirmation Chip */}
                {selectedSukraaPatient && (
                  <div style={{
                    marginTop: '10px',
                    padding: '8px 12px',
                    backgroundColor: '#ffffff',
                    borderRadius: '8px',
                    border: '1px solid #bbf7d0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.8rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <CheckCircle2 size={16} color="#16a34a" />
                      <span style={{ fontWeight: 700, color: '#166534' }}>
                        Selected: {selectedSukraaPatient.full_name}
                      </span>
                      <span style={{ color: '#0369a1', fontWeight: 600 }}>
                        (PID: {selectedSukraaPatient.pid})
                      </span>
                      {selectedSukraaPatient.phone && (
                        <span style={{ color: '#64748b' }}>
                          • 📞 {selectedSukraaPatient.phone}
                        </span>
                      )}
                      {selectedSukraaPatient.insurance && (
                        <span style={{ color: '#059669', fontWeight: 600 }}>
                          • 🛡️ {selectedSukraaPatient.insurance}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    FULL NAME / COMPANY NAME *
                  </label>
                  <input
                    type="text"
                    placeholder=""
                    value={formData.customer_name}
                    onChange={(e) => setFormData(p => ({ ...p, customer_name: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1.5px solid #94a3b8',
                      fontSize: '0.9rem',
                      fontWeight: 700,
                      outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    PHONE NUMBER
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. +250 788 123 456"
                    value={formData.customer_phone}
                    onChange={(e) => setFormData(p => ({ ...p, customer_phone: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.85rem',
                      outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    EMAIL ADDRESS
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. client@example.com"
                    value={formData.customer_email}
                    onChange={(e) => setFormData(p => ({ ...p, customer_email: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.85rem',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    CLIENT TIN / TAX ID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 100234567"
                    value={formData.customer_tin}
                    onChange={(e) => setFormData(p => ({ ...p, customer_tin: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.85rem',
                      outline: 'none'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    CLIENT PHYSICAL ADDRESS / LOCATION
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Kigali, Rwanda"
                    value={formData.customer_address}
                    onChange={(e) => setFormData(p => ({ ...p, customer_address: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.85rem',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* 3. Line Items Card */}
            <div style={{
              backgroundColor: '#ffffff',
              padding: '20px',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileSpreadsheet size={16} color="#0284c7" /> Proforma Line Items ({formData.items.length})
                </h3>

                <button
                  type="button"
                  onClick={() => handleAddItem()}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 14px',
                    backgroundColor: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    cursor: 'pointer'
                  }}
                >
                  <Plus size={14} /> Add Line Item
                </button>
              </div>

              {/* Table */}
              <div style={{
                overflowX: 'visible',
                overflowY: 'visible',
                minHeight: activeAutocompleteRow !== null && autocompleteMatches.length > 0 ? '300px' : 'auto'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#2563eb', color: '#ffffff' }}>
                      <th style={{ padding: '8px 10px', textAlign: 'left', borderRadius: '6px 0 0 0', width: '4%' }}>#</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left', width: '50%' }}>DESCRIPTION</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center', width: '12%' }}>QUANTITY</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right', width: '16%' }}>U.P (RWF)</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right', width: '14%' }}>AMOUNT (RWF)</th>
                      <th style={{ padding: '8px 6px', textAlign: 'center', borderRadius: '0 6px 0 0', width: '4%' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.items.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: '36px 16px', textAlign: 'center', backgroundColor: '#fafbfc', borderRadius: '8px' }}>
                          <div style={{ maxWidth: '380px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <FileSpreadsheet size={22} />
                            </div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1e293b' }}>
                              No Line Items in Proforma
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b', lineHeight: 1.4 }}>
                              Click below to add a line item with instant tariff autocomplete, or select services directly from the catalog.
                            </div>
                            <button
                              type="button"
                              onClick={() => handleAddItem()}
                              style={{
                                marginTop: '8px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '8px 18px',
                                backgroundColor: '#0284c7',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: 700,
                                fontSize: '0.82rem',
                                cursor: 'pointer',
                                boxShadow: '0 2px 6px rgba(2,132,199,0.25)'
                              }}
                            >
                              <Plus size={15} /> Add First Line Item
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      formData.items.map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                          <td style={{ padding: '8px 6px', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600 }}>
                            {idx + 1}
                          </td>
                          <td style={{ padding: '6px 8px', position: 'relative' }}>
                            <div style={{ position: 'relative' }}>
                              <input
                                type="text"
                                value={item.description}
                                placeholder="Type to search tariff / test name..."
                                onChange={(e) => {
                                  handleItemChange(idx, 'description', e.target.value);
                                  setActiveAutocompleteRow(idx);
                                  setHighlightedIndex(0);
                                }}
                                onFocus={() => {
                                  setActiveAutocompleteRow(idx);
                                  setHighlightedIndex(0);
                                }}
                                onKeyDown={(e) => handleDescriptionKeyDown(e, idx)}
                                style={{
                                  width: '100%',
                                  padding: '7px 10px',
                                  borderRadius: '6px',
                                  border: activeAutocompleteRow === idx && autocompleteMatches.length > 0 ? '1.5px solid #0284c7' : '1px solid #cbd5e1',
                                  fontSize: '0.85rem',
                                  fontWeight: 600,
                                  outline: 'none',
                                  backgroundColor: '#ffffff'
                                }}
                              />

                              {/* Autocomplete Dropdown Popover */}
                              {activeAutocompleteRow === idx && autocompleteMatches.length > 0 && (
                                <div
                                  ref={autocompleteRef}
                                  style={{
                                    position: 'absolute',
                                    top: '100%',
                                    left: 0,
                                    right: 0,
                                    minWidth: '380px',
                                    maxWidth: '520px',
                                    marginTop: '4px',
                                    backgroundColor: '#ffffff',
                                    borderRadius: '10px',
                                    border: '1.5px solid #0284c7',
                                    boxShadow: '0 12px 28px rgba(0,0,0,0.18)',
                                    maxHeight: '270px',
                                    overflowY: 'auto',
                                    zIndex: 100
                                  }}
                                >
                                  <div style={{
                                    padding: '6px 10px',
                                    backgroundColor: '#f0f9ff',
                                    borderBottom: '1px solid #e0f2fe',
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    color: '#0369a1',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                  }}>
                                    <span>TARIFF MATCHES ({autocompleteMatches.length})</span>
                                    <span style={{ fontSize: '0.65rem', color: '#64748b' }}>↑↓ to navigate, Enter to select</span>
                                  </div>

                                  {autocompleteMatches.map((catItem, mIdx) => {
                                    const isHighlighted = mIdx === highlightedIndex;
                                    return (
                                      <div
                                        key={catItem.id || catItem.code || mIdx}
                                        onMouseDown={(e) => {
                                          e.preventDefault();
                                          handleSelectAutocomplete(idx, catItem);
                                        }}
                                        onMouseEnter={() => setHighlightedIndex(mIdx)}
                                        style={{
                                          padding: '8px 12px',
                                          borderBottom: mIdx < autocompleteMatches.length - 1 ? '1px solid #f1f5f9' : 'none',
                                          cursor: 'pointer',
                                          backgroundColor: isHighlighted ? '#e0f2fe' : '#ffffff',
                                          display: 'flex',
                                          justifyContent: 'space-between',
                                          alignItems: 'center',
                                          gap: '10px',
                                          transition: 'background 0.1s'
                                        }}
                                      >
                                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                          <div style={{
                                            fontSize: '0.82rem',
                                            fontWeight: 700,
                                            color: isHighlighted ? '#0369a1' : '#0f172a',
                                            lineHeight: 1.3
                                          }}>
                                            {catItem.name}
                                          </div>
                                          <div style={{
                                            fontSize: '0.7rem',
                                            color: '#64748b',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            marginTop: '2px'
                                          }}>
                                            {catItem.code && (
                                              <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#475569' }}>
                                                {catItem.code}
                                              </span>
                                            )}
                                            {catItem.department && (
                                              <span style={{
                                                backgroundColor: '#f1f5f9',
                                                padding: '1px 6px',
                                                borderRadius: '4px',
                                                fontSize: '0.65rem',
                                                fontWeight: 600,
                                                color: '#475569'
                                              }}>
                                                {catItem.department}
                                              </span>
                                            )}
                                          </div>
                                        </div>

                                        <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                          <span style={{
                                            fontSize: '0.8rem',
                                            fontWeight: 800,
                                            color: '#0284c7',
                                            backgroundColor: '#f0f9ff',
                                            padding: '3px 8px',
                                            borderRadius: '6px',
                                            border: '1px solid #bae6fd'
                                          }}>
                                            {Number(catItem.default_price).toLocaleString()} RWF
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: '6px 8px' }}>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                              style={{
                                width: '100%',
                                padding: '6px 8px',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                fontSize: '0.85rem',
                                textAlign: 'center',
                                fontWeight: 700,
                                outline: 'none'
                              }}
                            />
                          </td>
                          <td style={{ padding: '6px 8px' }}>
                            <input
                              type="number"
                              min="0"
                              value={item.unit_price}
                              onChange={(e) => handleItemChange(idx, 'unit_price', e.target.value)}
                              style={{
                                width: '100%',
                                padding: '6px 8px',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                fontSize: '0.85rem',
                                textAlign: 'right',
                                fontWeight: 600,
                                outline: 'none'
                              }}
                            />
                          </td>
                          <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>
                            {Number(item.amount).toLocaleString()}
                          </td>
                          <td style={{ padding: '6px 4px', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#94a3b8',
                                cursor: 'pointer',
                                padding: '4px',
                                borderRadius: '4px'
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; }}
                              title="Delete row"
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 4. Payment terms & Preparer info */}
            <div style={{
              backgroundColor: '#ffffff',
              padding: '20px',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
            }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                Bank Terms &amp; Preparer Contact
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    PREPARED BY (NAME &amp; TITLE)
                  </label>
                  <input
                    type="text"
                    value={formData.prepared_by_name}
                    onChange={(e) => setFormData(p => ({ ...p, prepared_by_name: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.85rem',
                      outline: 'none',
                      marginBottom: '10px'
                    }}
                  />
                  <input
                    type="text"
                    value={formData.prepared_by_title}
                    placeholder="Title (e.g. Sales Manager)"
                    onChange={(e) => setFormData(p => ({ ...p, prepared_by_title: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.85rem',
                      outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    INQUIRIES CONTACT PERSON
                  </label>
                  <input
                    type="text"
                    value={formData.contact_person}
                    onChange={(e) => setFormData(p => ({ ...p, contact_person: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.85rem',
                      outline: 'none'
                    }}
                  />
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '6px' }}>

                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar: Totals Summary & Quick Catalog Picker */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Totals Summary Card */}
            <div style={{
              backgroundColor: '#ffffff',
              padding: '20px',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
            }}>
              <h4 style={{ margin: '0 0 14px', fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>
                Financial Totals
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Subtotal:</span>
                  <span style={{ fontWeight: 700 }}>{subtotal.toLocaleString()} RWF</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748b' }}>Tax Due (VAT):</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formData.tax_due}
                    onChange={(e) => setFormData(p => ({ ...p, tax_due: parseFloat(e.target.value) || 0 }))}
                    style={{
                      width: '110px',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      textAlign: 'right',
                      fontSize: '0.8rem'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748b' }}>Other Fees:</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formData.other_fees}
                    onChange={(e) => setFormData(p => ({ ...p, other_fees: parseFloat(e.target.value) || 0 }))}
                    style={{
                      width: '110px',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      textAlign: 'right',
                      fontSize: '0.8rem'
                    }}
                  />
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '10px',
                  paddingTop: '12px',
                  borderTop: '2px solid #e2e8f0'
                }}>
                  <span style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>TOTAL:</span>
                  <span style={{
                    fontWeight: 800,
                    fontSize: '1.15rem',
                    color: '#0369a1',
                    backgroundColor: '#e0f2fe',
                    padding: '4px 10px',
                    borderRadius: '8px'
                  }}>
                    {totalAmount.toLocaleString()} RWF
                  </span>
                </div>
              </div>

              <div style={{
                marginTop: '16px',
                padding: '12px',
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                fontSize: '0.75rem',
                color: '#475569',
                lineHeight: '1.5'
              }}>
                <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '2px' }}>Official Payment Accounts:</div>
                <div>• BK: <strong>00040-06933483-59</strong></div>
                <div>• MOMO CODE: <strong>035884</strong></div>
              </div>
            </div>

            {/* Quick Catalog / Service Picker */}
            <div style={{
              backgroundColor: '#ffffff',
              padding: '20px',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>
                  🏥 Quick Add Services ({filteredCatalog.length})
                </h4>
              </div>

              <input
                type="text"
                placeholder="Search test or consultation..."
                value={catalogFilter}
                onChange={(e) => setCatalogFilter(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.8rem',
                  marginBottom: '10px',
                  outline: 'none'
                }}
              />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '350px', overflowY: 'auto' }}>
                {filteredCatalog.length === 0 ? (
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', textAlign: 'center', padding: '12px 0' }}>
                    No matching services found
                  </div>
                ) : (
                  filteredCatalog.slice(0, 50).map(item => (
                    <div
                      key={item.id || item.code}
                      onClick={() => handleAddItem(item)}
                      style={{
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: '1px solid #f1f5f9',
                        backgroundColor: '#f8fafc',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#eff6ff';
                        e.currentTarget.style.borderColor = '#bfdbfe';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#f8fafc';
                        e.currentTarget.style.borderColor = '#f1f5f9';
                      }}
                    >
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '190px' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e293b' }}>
                          {item.name}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                          {item.department || 'General'}
                        </div>
                      </div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0284c7', whiteSpace: 'nowrap' }}>
                        +{Number(item.default_price).toLocaleString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Email Proforma Modal ── */}
      {isEmailModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            maxWidth: '500px',
            width: '100%',
            padding: '24px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Mail size={20} color="#0284c7" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                  Send Proforma via Email
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEmailModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#94a3b8' }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSendEmail} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ padding: '10px 14px', backgroundColor: '#eff6ff', borderRadius: '8px', fontSize: '0.8rem', color: '#1e3a8a' }}>
                Sending Proforma <strong>{formData.invoice_number || 'New Proforma'}</strong> for <strong>{formData.customer_name}</strong> ({totalAmount.toLocaleString()} RWF) via <strong>mail.legacyclinics.rw</strong>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Recipient Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="client@example.com"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.9rem',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Custom Message / Note to Client (Optional)
                </label>
                <textarea
                  rows="3"
                  placeholder="Dear client, please find attached the quotation for your requested medical investigations..."
                  value={customEmailNote}
                  onChange={(e) => setCustomEmailNote(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem',
                    outline: 'none',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsEmailModalOpen(false)}
                  style={{
                    padding: '9px 16px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={emailing}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '9px 20px',
                    borderRadius: '8px',
                    backgroundColor: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 700,
                    cursor: emailing ? 'not-allowed' : 'pointer'
                  }}
                >
                  <Send size={15} /> {emailing ? 'Sending Email...' : 'Send Proforma Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
