import React, { useState, useEffect } from 'react';
import { Search, Plus, Trash2, Tag, RefreshCw, CheckCircle2, Building2 } from 'lucide-react';
import { getSalesCatalog, addCatalogItem, deleteCatalogItem } from '../../api/sales';
import toast from 'react-hot-toast';

export default function ServiceCatalogManager() {
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [newItem, setNewItem] = useState({
    code: '',
    name: '',
    department: 'Laboratory',
    default_price: ''
  });

  const fetchCatalog = async () => {
    setLoading(true);
    try {
      const res = await getSalesCatalog();
      setCatalog(res.data?.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load service catalog');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, []);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!newItem.name || !newItem.default_price) {
      toast.error('Name and price are required');
      return;
    }
    try {
      await addCatalogItem(newItem);
      toast.success(`Service "${newItem.name}" added to catalog`);
      setIsAddModalOpen(false);
      setNewItem({ code: '', name: '', department: 'Laboratory', default_price: '' });
      fetchCatalog();
    } catch (err) {
      console.error(err);
      toast.error('Failed to add service item');
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Remove "${item.name}" from active services?`)) return;
    try {
      await deleteCatalogItem(item.id);
      toast.success(`Service "${item.name}" deactivated`);
      fetchCatalog();
    } catch (err) {
      console.error(err);
      toast.error('Failed to deactivate item');
    }
  };

  const departments = ['All', ...new Set(catalog.map(c => c.department).filter(Boolean))];

  const filtered = catalog.filter(c => {
    const matchesDept = selectedDept === 'All' || c.department === selectedDept;
    const matchesSearch = !search || 
      c.name.toLowerCase().includes(search.toLowerCase()) || 
      (c.code && c.code.toLowerCase().includes(search.toLowerCase()));
    return matchesDept && matchesSearch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* ── Toolbar ── */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        backgroundColor: '#ffffff',
        padding: '16px 20px',
        borderRadius: '14px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
      }}>
        {/* Search */}
        <div style={{ position: 'relative', width: '300px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search service name or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.85rem',
              outline: 'none'
            }}
          />
        </div>

        {/* Dept pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {departments.map(d => (
            <button
              key={d}
              type="button"
              onClick={() => setSelectedDept(d)}
              style={{
                padding: '5px 12px',
                borderRadius: '20px',
                fontSize: '0.75rem',
                fontWeight: 700,
                border: '1px solid',
                cursor: 'pointer',
                backgroundColor: selectedDept === d ? '#0284c7' : '#ffffff',
                borderColor: selectedDept === d ? '#0284c7' : '#cbd5e1',
                color: selectedDept === d ? '#ffffff' : '#64748b'
              }}
            >
              {d}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={fetchCatalog}
            title="Refresh"
            style={{
              padding: '8px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={15} />
          </button>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            <Plus size={16} /> Add New Service
          </button>
        </div>
      </div>

      {/* ── Table ── */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '14px',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
      }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
            <RefreshCw size={24} className="spin" style={{ marginBottom: '8px', color: '#0284c7' }} />
            <div>Loading service catalog...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
            No services found matching filters.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700 }}>CODE</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700 }}>SERVICE / TEST NAME</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700 }}>DEPARTMENT</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700 }}>STANDARD PRICE (RWF)</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700 }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => (
                  <tr
                    key={item.id}
                    style={{ borderBottom: '1px solid #f1f5f9' }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    <td style={{ padding: '10px 16px', fontFamily: 'monospace', fontWeight: 700, color: '#0369a1' }}>
                      {item.code || '—'}
                    </td>
                    <td style={{ padding: '10px 16px', fontWeight: 600, color: '#0f172a' }}>
                      {item.name}
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '10px',
                        backgroundColor: '#e0f2fe',
                        color: '#0369a1',
                        fontSize: '0.75rem',
                        fontWeight: 600
                      }}>
                        {item.department || 'General'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>
                      {Number(item.default_price).toLocaleString()} RWF
                    </td>
                    <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => handleDelete(item)}
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
                        title="Deactivate item"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Add Modal ── */}
      {isAddModalOpen && (
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
            maxWidth: '440px',
            width: '100%',
            padding: '24px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
              Add Service to Price Catalog
            </h3>

            <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Service / Test Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Total Protein"
                  value={newItem.name}
                  onChange={(e) => setNewItem(p => ({ ...p, name: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Standard Price (RWF) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  placeholder="e.g. 5000"
                  value={newItem.default_price}
                  onChange={(e) => setNewItem(p => ({ ...p, default_price: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Department
                </label>
                <select
                  value={newItem.department}
                  onChange={(e) => setNewItem(p => ({ ...p, department: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                >
                  <option value="Laboratory">Laboratory</option>
                  <option value="Clinical / OP">Clinical / OP</option>
                  <option value="Imaging">Imaging</option>
                  <option value="Dental">Dental</option>
                  <option value="Physiotherapy">Physiotherapy</option>
                  <option value="General">General</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Item Code (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. LAB-TP"
                  value={newItem.code}
                  onChange={(e) => setNewItem(p => ({ ...p, code: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 18px', borderRadius: '8px', backgroundColor: '#0284c7', color: '#ffffff', border: 'none', fontWeight: 700, cursor: 'pointer' }}
                >
                  Save Service
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
