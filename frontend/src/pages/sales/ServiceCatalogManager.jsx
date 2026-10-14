import React, { useState, useEffect, useMemo } from 'react';
import {
  Search, Plus, Trash2, Tag, RefreshCw, CheckCircle2, Building2,
  ChevronLeft, ChevronRight, Layers, FileSpreadsheet, Stethoscope,
  Activity, ShieldCheck, Filter
} from 'lucide-react';
import { getSalesCatalog, addCatalogItem, deleteCatalogItem } from '../../api/sales';
import toast from 'react-hot-toast';

const ITEMS_PER_PAGE = 50;

const TOP_SPECIALTIES = [
  'All',
  'Consultation',
  'Anaesthesia',
  'Cardiology',
  'BIOCHEMISTRY',
  'Hematology',
  'Imaging - CT Scan',
  'Imaging - MRI',
  'Dentistry',
  'Dermatology',
  'ENT',
  'General Surgery',
  'Gynecology & Obstetrics',
  'Ophthalmology',
  'Orthopedics',
  'Pediatrics'
];

export default function ServiceCatalogManager() {
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  const [priceTierView, setPriceTierView] = useState('all'); // 'all' | 'poly' | 'rama' | 'hosp'
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [newItem, setNewItem] = useState({
    code: '',
    name: '',
    department: 'Consultation',
    ichi_code: '',
    default_price: '',
    price_polyclinic: '',
    price_hospital: '',
    price_rama: ''
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

  // Reset pagination when search or department changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedDept]);

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
      setNewItem({
        code: '',
        name: '',
        department: 'Consultation',
        ichi_code: '',
        default_price: '',
        price_polyclinic: '',
        price_hospital: '',
        price_rama: ''
      });
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

  // Extract unique departments with counts
  const departmentCounts = useMemo(() => {
    const counts = {};
    catalog.forEach(item => {
      const d = item.department || 'General';
      counts[d] = (counts[d] || 0) + 1;
    });
    return counts;
  }, [catalog]);

  const allDepartments = useMemo(() => {
    return ['All', ...Object.keys(departmentCounts).sort()];
  }, [departmentCounts]);

  // Filtered catalog
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return catalog.filter(c => {
      const matchesDept = selectedDept === 'All' || c.department === selectedDept;
      const matchesSearch = !q ||
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.code && c.code.toLowerCase().includes(q)) ||
        (c.ichi_code && c.ichi_code.toLowerCase().includes(q));
      return matchesDept && matchesSearch;
    });
  }, [catalog, selectedDept, search]);

  // Pagination calculation
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* ── Official Rwanda Tariff Summary Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        <div style={{
          backgroundColor: '#ffffff',
          padding: '16px 18px',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          display: 'flex',
          alignItems: 'center',
          gap: '14px'
        }}>
          <div style={{ padding: '10px', borderRadius: '10px', backgroundColor: '#e0f2fe', color: '#0284c7' }}>
            <FileSpreadsheet size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Tariff Procedures
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a' }}>
              {catalog.length.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#0284c7', fontWeight: 600 }}>
              Official National Catalog
            </div>
          </div>
        </div>

        <div style={{
          backgroundColor: '#ffffff',
          padding: '16px 18px',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          display: 'flex',
          alignItems: 'center',
          gap: '14px'
        }}>
          <div style={{ padding: '10px', borderRadius: '10px', backgroundColor: '#f0fdf4', color: '#16a34a' }}>
            <Stethoscope size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Clinical Specialties
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a' }}>
              {allDepartments.length - 1}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#16a34a', fontWeight: 600 }}>
              Comprehensive Departments
            </div>
          </div>
        </div>

        <div style={{
          backgroundColor: '#ffffff',
          padding: '16px 18px',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          display: 'flex',
          alignItems: 'center',
          gap: '14px'
        }}>
          <div style={{ padding: '10px', borderRadius: '10px', backgroundColor: '#fef3c7', color: '#d97706' }}>
            <ShieldCheck size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Tariff Framework
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
              Rwanda 2025–2027
            </div>
            <div style={{ fontSize: '0.7rem', color: '#d97706', fontWeight: 600 }}>
              RAMA, Private &amp; Polyclinic
            </div>
          </div>
        </div>

        <div style={{
          backgroundColor: '#ffffff',
          padding: '16px 18px',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          display: 'flex',
          alignItems: 'center',
          gap: '14px'
        }}>
          <div style={{ padding: '10px', borderRadius: '10px', backgroundColor: '#f3e8ff', color: '#9333ea' }}>
            <Activity size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Showing Results
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a' }}>
              {filtered.length.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#9333ea', fontWeight: 600 }}>
              Page {currentPage} of {totalPages}
            </div>
          </div>
        </div>
      </div>

      {/* ── Filter & Search Toolbar ── */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        backgroundColor: '#ffffff',
        padding: '16px 20px',
        borderRadius: '14px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          {/* Search Box */}
          <div style={{ position: 'relative', width: '360px', maxWidth: '100%' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search by procedure name, RHIC/RLTC code, or ICHI..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px 9px 36px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Department Select Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={15} style={{ color: '#64748b' }} />
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: '#1e293b',
                backgroundColor: '#f8fafc',
                cursor: 'pointer',
                outline: 'none',
                minWidth: '240px'
              }}
            >
              <option value="All">All Specialties ({catalog.length})</option>
              {allDepartments.filter(d => d !== 'All').map(dept => (
                <option key={dept} value={dept}>
                  {dept} ({departmentCounts[dept] || 0})
                </option>
              ))}
            </select>
          </div>

          {/* Rate View Mode Selector */}
          <div style={{
            display: 'inline-flex',
            padding: '3px',
            backgroundColor: '#f1f5f9',
            borderRadius: '8px',
            border: '1px solid #e2e8f0'
          }}>
            {[
              { id: 'all', label: 'All Rates' },
              { id: 'poly', label: 'Polyclinic' },
              { id: 'rama', label: 'RAMA (RSSB)' },
              { id: 'hosp', label: 'Hospital' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setPriceTierView(tab.id)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  backgroundColor: priceTierView === tab.id ? '#ffffff' : 'transparent',
                  color: priceTierView === tab.id ? '#0284c7' : '#64748b',
                  boxShadow: priceTierView === tab.id ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={fetchCatalog}
              title="Refresh Catalog"
              style={{
                padding: '8px 10px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.8rem',
                color: '#475569'
              }}
            >
              <RefreshCw size={14} /> Refresh
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
              <Plus size={16} /> Add Custom Service
            </button>
          </div>
        </div>

        {/* Quick Department Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', paddingTop: '4px' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', marginRight: '4px' }}>
            QUICK FILTER:
          </span>
          {TOP_SPECIALTIES.map(d => (
            <button
              key={d}
              type="button"
              onClick={() => setSelectedDept(d)}
              style={{
                padding: '4px 10px',
                borderRadius: '16px',
                fontSize: '0.72rem',
                fontWeight: 700,
                border: '1px solid',
                cursor: 'pointer',
                transition: 'all 0.15s',
                backgroundColor: selectedDept === d ? '#0284c7' : '#f8fafc',
                borderColor: selectedDept === d ? '#0284c7' : '#e2e8f0',
                color: selectedDept === d ? '#ffffff' : '#64748b'
              }}
            >
              {d} {d !== 'All' && departmentCounts[d] ? `(${departmentCounts[d]})` : ''}
            </button>
          ))}
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
        ) : paginatedItems.length === 0 ? (
          <div style={{ padding: '50px', textAlign: 'center', color: '#64748b' }}>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
              No tariff procedures found
            </div>
            <div style={{ fontSize: '0.85rem' }}>
              No matches for "{search}" in {selectedDept}
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, width: '140px' }}>CODE</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700 }}>PROCEDURE / SERVICE NAME</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, width: '180px' }}>SPECIALTY</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, width: '100px' }}>ICHI</th>
                  {(priceTierView === 'all' || priceTierView === 'poly') && (
                    <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, width: '140px' }}>
                      POLYCLINIC (RWF)
                    </th>
                  )}
                  {(priceTierView === 'all' || priceTierView === 'rama') && (
                    <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, width: '140px' }}>
                      RAMA (RWF)
                    </th>
                  )}
                  {(priceTierView === 'all' || priceTierView === 'hosp') && (
                    <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, width: '140px' }}>
                      HOSPITAL (RWF)
                    </th>
                  )}
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, width: '70px' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {paginatedItems.map(item => (
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
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        whiteSpace: 'nowrap'
                      }}>
                        {item.department || 'General'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                      {item.ichi_code ? (
                        <span style={{
                          padding: '2px 6px',
                          borderRadius: '6px',
                          backgroundColor: '#f1f5f9',
                          color: '#64748b',
                          fontSize: '0.72rem',
                          fontFamily: 'monospace'
                        }}>
                          {item.ichi_code}
                        </span>
                      ) : (
                        <span style={{ color: '#cbd5e1' }}>—</span>
                      )}
                    </td>
                    {(priceTierView === 'all' || priceTierView === 'poly') && (
                      <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>
                        {Number(item.price_polyclinic || item.default_price || 0) > 0 ? (
                          `${Number(item.price_polyclinic || item.default_price).toLocaleString()} RWF`
                        ) : (
                          <span style={{ color: '#94a3b8', fontWeight: 400 }}>—</span>
                        )}
                      </td>
                    )}
                    {(priceTierView === 'all' || priceTierView === 'rama') && (
                      <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, color: '#059669' }}>
                        {Number(item.price_rama || 0) > 0 ? (
                          `${Number(item.price_rama).toLocaleString()} RWF`
                        ) : (
                          <span style={{ color: '#94a3b8', fontWeight: 400 }}>—</span>
                        )}
                      </td>
                    )}
                    {(priceTierView === 'all' || priceTierView === 'hosp') && (
                      <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, color: '#7c3aed' }}>
                        {Number(item.price_hospital || 0) > 0 ? (
                          `${Number(item.price_hospital).toLocaleString()} RWF`
                        ) : (
                          <span style={{ color: '#94a3b8', fontWeight: 400 }}>—</span>
                        )}
                      </td>
                    )}
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

        {/* ── Pagination Footer ── */}
        {!loading && filtered.length > 0 && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '14px 20px',
            backgroundColor: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Showing <span style={{ fontWeight: 700, color: '#0f172a' }}>
                {((currentPage - 1) * ITEMS_PER_PAGE) + 1}
              </span> to <span style={{ fontWeight: 700, color: '#0f172a' }}>
                {Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)}
              </span> of <span style={{ fontWeight: 700, color: '#0f172a' }}>
                {filtered.length.toLocaleString()}
              </span> procedures
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: currentPage <= 1 ? '#f1f5f9' : '#ffffff',
                  color: currentPage <= 1 ? '#94a3b8' : '#334155',
                  cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: 600
                }}
              >
                <ChevronLeft size={15} /> Prev
              </button>

              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', padding: '0 8px' }}>
                Page {currentPage} / {totalPages}
              </span>

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: currentPage >= totalPages ? '#f1f5f9' : '#ffffff',
                  color: currentPage >= totalPages ? '#94a3b8' : '#334155',
                  cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: 600
                }}
              >
                Next <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Add Modal ── */}
      {isAddModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '520px',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
              Add Service to Catalog
            </h3>
            <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  SERVICE CODE (Optional, e.g. RHIC-CONS-099)
                </label>
                <input
                  type="text"
                  placeholder="Auto-generated if empty"
                  value={newItem.code}
                  onChange={(e) => setNewItem({ ...newItem, code: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  PROCEDURE / SERVICE NAME *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Echocardiography, CT Scan Chest"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    SPECIALTY / DEPARTMENT *
                  </label>
                  <select
                    value={newItem.department}
                    onChange={(e) => setNewItem({ ...newItem, department: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  >
                    {allDepartments.filter(d => d !== 'All').map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    ICHI CODE (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ACA.DC.AE"
                    value={newItem.ichi_code}
                    onChange={(e) => setNewItem({ ...newItem, ichi_code: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    STANDARD / POLYCLINIC PRICE (RWF) *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 20000"
                    value={newItem.default_price}
                    onChange={(e) => setNewItem({ ...newItem, default_price: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    RAMA (RSSB) PRICE (RWF)
                  </label>
                  <input
                    type="number"
                    placeholder="Optional"
                    value={newItem.price_rama}
                    onChange={(e) => setNewItem({ ...newItem, price_rama: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#0284c7',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
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
