import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet, Plus, Tag, BarChart3, Receipt, FileText, CheckCircle2,
  Clock, TrendingUp, DollarSign, RefreshCw, Send, Building2, ShoppingBag
} from 'lucide-react';
import ProformaList from './ProformaList';
import ProformaInvoiceBuilder from './ProformaInvoiceBuilder';
import ServiceCatalogManager from './ServiceCatalogManager';
import { getSalesStats } from '../../api/sales';
import { useAuth } from '../../context/AuthContext';

export default function SalesHub() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('invoices'); // 'invoices' | 'create' | 'catalog'
  const [editingProforma, setEditingProforma] = useState(null);
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const res = await getSalesStats();
      setStats(res.data?.data || null);
    } catch (err) {
      console.error('Failed to load sales stats:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [activeTab]);

  const handleCreateNew = () => {
    setEditingProforma(null);
    setActiveTab('create');
  };

  const handleEditProforma = (proforma) => {
    setEditingProforma(proforma);
    setActiveTab('create');
  };

  const handleSavedProforma = () => {
    fetchStats();
    setActiveTab('invoices');
    setEditingProforma(null);
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* ── Top Header ── */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        backgroundColor: '#ffffff',
        padding: '24px 28px',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 14px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '14px',
            backgroundColor: '#e0f2fe',
            color: '#0284c7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(2,132,199,0.15)'
          }}>
            <FileSpreadsheet size={28} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 900, color: '#0f172a' }}>
                Sales Hub
              </h1>
              <span style={{
                padding: '3px 10px',
                borderRadius: '12px',
                fontSize: '0.75rem',
                fontWeight: 700,
                backgroundColor: '#003b44',
                color: '#ffffff'
              }}>
                Commercial &amp; Billing
              </span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: '#64748b' }}>
              Legacy Clinics Proforma Invoicing, Quotations, and Corporate Service Catalog
            </p>
          </div>
        </div>

        {/* Quick action buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={handleCreateNew}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              backgroundColor: '#16a34a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              boxShadow: '0 4px 10px rgba(22, 163, 74, 0.25)',
              transition: 'transform 0.1s'
            }}
            onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.98)'; }}
            onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            <Plus size={18} /> Create Proforma Invoice
          </button>
        </div>
      </div>

      {/* ── KPI Metric Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div style={{
          backgroundColor: '#ffffff',
          padding: '18px 20px',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Total Proformas
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0f172a', marginTop: '4px' }}>
              {stats?.totalCount || 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#059669', marginTop: '2px', fontWeight: 600 }}>
              {stats?.monthCount || 0} created this month
            </div>
          </div>
          <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: '#f0fdf4', color: '#16a34a' }}>
            <FileText size={24} />
          </div>
        </div>

        <div style={{
          backgroundColor: '#ffffff',
          padding: '18px 20px',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Total Quoted Value
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0284c7', marginTop: '4px' }}>
              {Number(stats?.totalValue || 0).toLocaleString()} <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>RWF</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
              Cumulative proforma quotations
            </div>
          </div>
          <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: '#e0f2fe', color: '#0284c7' }}>
            <DollarSign size={24} />
          </div>
        </div>

        <div style={{
          backgroundColor: '#ffffff',
          padding: '18px 20px',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Drafts / Issued
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#d97706', marginTop: '4px' }}>
              {stats?.statusCounts?.Draft || 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
              Pending client confirmation
            </div>
          </div>
          <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: '#fef3c7', color: '#d97706' }}>
            <Clock size={24} />
          </div>
        </div>

        <div style={{
          backgroundColor: '#ffffff',
          padding: '18px 20px',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Sent / Confirmed
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#059669', marginTop: '4px' }}>
              {(stats?.statusCounts?.Sent || 0) + (stats?.statusCounts?.Paid || 0)}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#059669', marginTop: '2px', fontWeight: 600 }}>
              {stats?.statusCounts?.Paid || 0} marked paid
            </div>
          </div>
          <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: '#dcfce7', color: '#059669' }}>
            <CheckCircle2 size={24} />
          </div>
        </div>
      </div>

      {/* ── Submodule Tabs Navigation ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        borderBottom: '2px solid #e2e8f0',
        paddingBottom: '2px'
      }}>
        <button
          type="button"
          onClick={() => { setActiveTab('invoices'); setEditingProforma(null); }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            border: 'none',
            borderBottom: activeTab === 'invoices' ? '3px solid #0284c7' : '3px solid transparent',
            backgroundColor: 'transparent',
            color: activeTab === 'invoices' ? '#0284c7' : '#64748b',
            fontWeight: 800,
            fontSize: '0.9rem',
            cursor: 'pointer',
            marginBottom: '-2px'
          }}
        >
          <Receipt size={17} /> Proforma Invoices
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('create')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            border: 'none',
            borderBottom: activeTab === 'create' ? '3px solid #0284c7' : '3px solid transparent',
            backgroundColor: 'transparent',
            color: activeTab === 'create' ? '#0284c7' : '#64748b',
            fontWeight: 800,
            fontSize: '0.9rem',
            cursor: 'pointer',
            marginBottom: '-2px'
          }}
        >
          <Plus size={17} /> {editingProforma ? 'Edit Proforma' : 'Create Proforma Invoice'}
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('catalog'); setEditingProforma(null); }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            border: 'none',
            borderBottom: activeTab === 'catalog' ? '3px solid #0284c7' : '3px solid transparent',
            backgroundColor: 'transparent',
            color: activeTab === 'catalog' ? '#0284c7' : '#64748b',
            fontWeight: 800,
            fontSize: '0.9rem',
            cursor: 'pointer',
            marginBottom: '-2px'
          }}
        >
          <Tag size={17} /> Service &amp; Price Catalog
        </button>
      </div>

      {/* ── Submodule Content View ── */}
      {activeTab === 'invoices' && (
        <ProformaList
          onCreateNew={handleCreateNew}
          onEditProforma={handleEditProforma}
        />
      )}

      {activeTab === 'create' && (
        <ProformaInvoiceBuilder
          initialProforma={editingProforma}
          onSaved={handleSavedProforma}
          onCancel={() => { setActiveTab('invoices'); setEditingProforma(null); }}
        />
      )}

      {activeTab === 'catalog' && (
        <ServiceCatalogManager />
      )}
    </div>
  );
}
