import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { Package, Plus, Send, AlertTriangle, CheckCircle, RefreshCw, Download, FileSpreadsheet } from 'lucide-react';
import Modal from '../../components/Modal';
import { exportToLegacyExcel } from '../../utils/excelExport';
import {
  getStockItems,
  createStockItem,
  deleteStockItem,
  getStockReleases,
  createStockRelease
} from '../../api/logistics';

const MaintenanceStock = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory', 'releases'
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [releases, setReleases] = useState([]);

  const [isItemModal, setIsItemModal] = useState(false);
  const [isReleaseModal, setIsReleaseModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [itemForm, setItemForm] = useState({
    item_name: '',
    category: 'Electrical',
    unit: 'Pcs',
    quantity_on_hand: 10,
    min_threshold: 5,
    unit_cost: 5000
  });

  const [releaseForm, setReleaseForm] = useState({
    item_id: '',
    quantity: 1,
    target_location: '',
    requested_by: user?.full_name || ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [iRes, rRes] = await Promise.all([
        getStockItems(),
        getStockReleases()
      ]);

      if (iRes.data?.success) setItems(iRes.data.data);
      if (rRes.data?.success) setReleases(rRes.data.data);
    } catch (err) {
      toast.error('Error loading inventory data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleItemSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await createStockItem(itemForm);
      if (res.data?.success) {
        toast.success('Maintenance stock item added!');
        setIsItemModal(false);
        fetchData();
      } else {
        toast.error(res.data?.message || 'Failed to add item');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error submitting item');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReleaseSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const selectedItem = items.find(i => String(i.id) === String(releaseForm.item_id));
      const res = await createStockRelease({
        ...releaseForm,
        item_name: selectedItem ? selectedItem.item_name : 'Spare Part'
      });
      if (res.data?.success) {
        toast.success('Stock released and perpetual balance updated!');
        setIsReleaseModal(false);
        fetchData();
      } else {
        toast.error(res.data?.message || 'Failed to release stock');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error releasing stock');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteStockItem = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove item "${name}" from stock directory?`)) return;
    try {
      const res = await deleteStockItem(id);
      if (res.data?.success) {
        toast.success('Stock item removed');
        fetchData();
      } else {
        toast.error(res.data?.message || 'Failed to remove item');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error removing stock item');
    }
  };

  const handleExportStockExcel = async () => {
    if (!items || items.length === 0) {
      toast.error('No stock items to export');
      return;
    }

    const totalValuation = items.reduce((acc, i) => acc + ((Number(i.quantity_on_hand) || 0) * (Number(i.unit_cost) || 0)), 0);
    const lowStockCount = items.filter(i => (Number(i.quantity_on_hand) || 0) <= (Number(i.min_threshold) || 0)).length;

    await exportToLegacyExcel({
      title: 'Legacy Clinics — Technical Maintenance Stock Inventory',
      subtitle: 'Facility Materials, Spare Parts, Electrical & Plumbing Stock Valuation',
      filename: 'Legacy_Clinics_Maintenance_Stock',
      sheetName: 'Stock Inventory',
      user,
      metadata: [
        ['Store Location', 'Central Maintenance & Facilities Store'],
        ['Catalog Count', `${items.length} Stock Keeping Units (SKUs)`],
        ['Total Inventory Valuation', `${totalValuation.toLocaleString()} RWF`],
        ['Items Below Safety Threshold', `${lowStockCount} Reorder Alerts`],
      ],
      summaryMetrics: [
        { label: 'TOTAL SKUs', value: items.length },
        { label: 'LOW STOCK ALERTS', value: lowStockCount },
        { label: 'TOTAL INVENTORY VALUE', value: `${totalValuation.toLocaleString()} RWF` },
      ],
      columns: [
        { key: 'id', header: 'SKU / ITEM ID', width: 14, alignment: 'center' },
        { key: 'item_name', header: 'ITEM DESCRIPTION', width: 28 },
        { key: 'category', header: 'CATEGORY', width: 18 },
        { key: 'unit', header: 'UNIT OF MEASURE', width: 16, alignment: 'center' },
        { key: 'quantity_on_hand', header: 'QTY ON HAND', width: 16, numFmt: '#,##0', alignment: 'right' },
        { key: 'min_threshold', header: 'MIN THRESHOLD', width: 16, numFmt: '#,##0', alignment: 'right' },
        { key: 'unit_cost', header: 'UNIT COST (RWF)', width: 18, numFmt: '#,##0 "RWF"', alignment: 'right' },
        { 
          key: 'total_valuation', 
          header: 'TOTAL VALUATION (RWF)', 
          width: 22, 
          numFmt: '#,##0 "RWF"', 
          alignment: 'right',
          render: i => ((Number(i.quantity_on_hand) || 0) * (Number(i.unit_cost) || 0))
        },
        { 
          key: 'reorder_status', 
          header: 'STATUS', 
          width: 16, 
          isStatus: true, 
          alignment: 'center',
          render: i => ((Number(i.quantity_on_hand) || 0) <= (Number(i.min_threshold) || 0) ? 'REORDER LOW' : 'OPTIMAL')
        },
      ],
      data: items,
    });
  };

  const handleExportReleasesExcel = async () => {
    if (!releases || releases.length === 0) {
      toast.error('No stock release records to export');
      return;
    }

    await exportToLegacyExcel({
      title: 'Legacy Clinics — Maintenance Stock Release Slips',
      subtitle: 'Issued Maintenance Items, Materials & Departmental Consumptions',
      filename: 'Legacy_Clinics_Stock_Releases',
      sheetName: 'Stock Releases',
      user,
      metadata: [
        ['Store Officer', 'Facilities & Technical Logistics Store'],
        ['Total Dispatches', `${releases.length} Release Slips`],
      ],
      summaryMetrics: [
        { label: 'TOTAL RELEASES', value: releases.length },
        { label: 'TOTAL ITEMS ISSUED', value: releases.reduce((acc, r) => acc + (Number(r.quantity) || 0), 0) },
      ],
      columns: [
        { key: 'id', header: 'RELEASE ID', width: 14, alignment: 'center' },
        { key: 'release_date', header: 'RELEASE DATE', width: 16, alignment: 'center' },
        { key: 'item_name', header: 'ITEM ISSUED', width: 28 },
        { key: 'quantity', header: 'QUANTITY', width: 14, numFmt: '#,##0', alignment: 'right' },
        { key: 'target_location', header: 'TARGET LOCATION / DEPT', width: 24 },
        { key: 'requested_by', header: 'REQUESTED BY', width: 22 },
      ],
      data: releases,
    });
  };

  return (
    <div style={{ paddingBottom: '3rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <span style={{ backgroundColor: '#f1f5f9', color: '#475569', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>
            MAINTENANCE STOCK
          </span>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '6px 0 0 0', color: '#0f172a' }}>
            Maintenance Materials & Spare Parts
          </h1>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={() => setIsReleaseModal(true)} className="btn btn-primary" style={{ backgroundColor: '#1B669E', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '8px', padding: '8px 14px', fontWeight: 600, border: 'none' }}>
            <Send size={16} /> Issue Stock Release
          </button>
          {activeTab === 'releases' ? (
            <button onClick={handleExportReleasesExcel} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '8px', padding: '8px 14px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#1B669E', fontWeight: 600 }}>
              <FileSpreadsheet size={16} color="#1B669E" /> Export Releases Excel
            </button>
          ) : (
            <button onClick={handleExportStockExcel} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '8px', padding: '8px 14px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#1B669E', fontWeight: 600 }}>
              <FileSpreadsheet size={16} color="#1B669E" /> Export Stock Excel
            </button>
          )}
          <button onClick={() => setIsItemModal(true)} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '8px', padding: '8px 14px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#334155', fontWeight: 600 }}>
            <Plus size={16} /> Add Stock Item
          </button>
        </div>
      </div>

      {/* TABS */}
      <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', marginBottom: '1.5rem', gap: '1rem' }}>
        <button
          onClick={() => setActiveTab('inventory')}
          style={{
            padding: '10px 16px',
            border: 'none',
            background: 'none',
            fontWeight: 700,
            color: activeTab === 'inventory' ? '#1B669E' : '#64748b',
            borderBottom: activeTab === 'inventory' ? '3px solid #1B669E' : 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Package size={16} /> Perpetual Stock Balances
        </button>

        <button
          onClick={() => setActiveTab('releases')}
          style={{
            padding: '10px 16px',
            border: 'none',
            background: 'none',
            fontWeight: 700,
            color: activeTab === 'releases' ? '#1B669E' : '#64748b',
            borderBottom: activeTab === 'releases' ? '3px solid #1B669E' : 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Send size={16} /> Stock Release Vouchers History
        </button>
      </div>

      {activeTab === 'inventory' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '12px 16px', fontWeight: 700 }}>Item Description</th>
                <th style={{ padding: '12px 16px', fontWeight: 700 }}>Category</th>
                <th style={{ padding: '12px 16px', fontWeight: 700 }}>Quantity On Hand</th>
                <th style={{ padding: '12px 16px', fontWeight: 700 }}>Reorder Threshold</th>
                <th style={{ padding: '12px 16px', fontWeight: 700 }}>Unit Cost (RWF)</th>
                <th style={{ padding: '12px 16px', fontWeight: 700 }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length > 0 ? (
                items.map((i) => {
                  const isLow = i.quantity_on_hand <= i.min_threshold;
                  return (
                    <tr key={i.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0f172a' }}>{i.item_name}</td>
                      <td style={{ padding: '12px 16px', color: '#334155' }}>{i.category}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 800, color: isLow ? '#b45309' : '#0f172a' }}>
                        {i.quantity_on_hand} {i.unit}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#64748b' }}>{i.min_threshold} {i.unit}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 600 }}>{Number(i.unit_cost)?.toLocaleString()} RWF</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '20px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          backgroundColor: isLow ? '#fef3c7' : '#dcfce7',
                          color: isLow ? '#b45309' : '#15803d'
                        }}>
                          {isLow ? 'REORDER LOW' : 'OK'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <button
                          onClick={() => handleDeleteStockItem(i.id, i.item_name)}
                          style={{ border: 'none', background: '#fef2f2', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', color: '#dc2626', fontSize: '0.75rem', fontWeight: 700 }}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="7" style={{ padding: '3rem 2rem', textAlign: 'center', color: '#64748b', fontSize: '0.95rem' }}>No stock items registered yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'releases' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '12px 16px', fontWeight: 700 }}>Release Date</th>
                <th style={{ padding: '12px 16px', fontWeight: 700 }}>Item Issued</th>
                <th style={{ padding: '12px 16px', fontWeight: 700 }}>Qty Issued</th>
                <th style={{ padding: '12px 16px', fontWeight: 700 }}>Target Location</th>
                <th style={{ padding: '12px 16px', fontWeight: 700 }}>Requested By</th>
              </tr>
            </thead>
            <tbody>
              {releases.length > 0 ? (
                releases.map((r) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0f172a' }}>{r.release_date}</td>
                    <td style={{ padding: '12px 16px', color: '#334155' }}>{r.item_name}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 700 }}>{r.quantity}</td>
                    <td style={{ padding: '12px 16px', color: '#334155' }}>{r.target_location}</td>
                    <td style={{ padding: '12px 16px', color: '#64748b' }}>{r.requested_by}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" style={{ padding: '3rem 2rem', textAlign: 'center', color: '#64748b', fontSize: '0.95rem' }}>No stock releases issued yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL: STOCK RELEASE FORM */}
      {isReleaseModal && (
        <Modal isOpen={true} title="Stock Release Form" onClose={() => setIsReleaseModal(false)}>
          <form onSubmit={handleReleaseSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Select Stock Item</label>
              <select className="input" style={{ width: '100%' }} value={releaseForm.item_id} onChange={(e) => setReleaseForm({ ...releaseForm, item_id: e.target.value })} required>
                <option value="">-- Select Maintenance Item --</option>
                {items.map(i => <option key={i.id} value={i.id}>{i.item_name} (On Hand: {i.quantity_on_hand})</option>)}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Quantity to Release</label>
                <input type="number" className="input" style={{ width: '100%' }} value={releaseForm.quantity} onChange={(e) => setReleaseForm({ ...releaseForm, quantity: e.target.value })} required />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Target Location / Work Order</label>
                <input type="text" className="input" style={{ width: '100%' }} value={releaseForm.target_location} onChange={(e) => setReleaseForm({ ...releaseForm, target_location: e.target.value })} required />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsReleaseModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>Confirm Stock Release</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default MaintenanceStock;
