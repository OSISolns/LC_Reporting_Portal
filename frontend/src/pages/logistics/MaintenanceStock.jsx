import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { Package, Plus, Send, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import Modal from '../../components/Modal';

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
    target_location: 'Dental Clinic AC Unit',
    requested_by: user?.full_name || ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [iRes, rRes] = await Promise.all([
        fetch('/api/logistics/inventory/items', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }),
        fetch('/api/logistics/inventory/releases', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      ]);
      const [iJson, rJson] = await Promise.all([iRes.json(), rRes.json()]);

      if (iJson.success) setItems(iJson.data);
      if (rJson.success) setReleases(rJson.data);
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
      const res = await fetch('/api/logistics/inventory/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(itemForm)
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Maintenance stock item added!');
        setIsItemModal(false);
        fetchData();
      } else {
        toast.error(json.message || 'Failed to add item');
      }
    } catch (err) {
      toast.error('Error submitting item');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReleaseSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const selectedItem = items.find(i => String(i.id) === String(releaseForm.item_id));
      const res = await fetch('/api/logistics/inventory/releases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...releaseForm,
          item_name: selectedItem ? selectedItem.item_name : 'Spare Part'
        })
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Stock released and perpetual balance updated!');
        setIsReleaseModal(false);
        fetchData();
      } else {
        toast.error(json.message || 'Failed to release stock');
      }
    } catch (err) {
      toast.error('Error releasing stock');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ paddingBottom: '3rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <span style={{ backgroundColor: '#dcfce7', color: '#16a34a', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>
            MAINTENANCE STOCK
          </span>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '6px 0 0 0', color: '#0f172a' }}>
            Maintenance Materials & Spare Parts
          </h1>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setIsReleaseModal(true)} className="btn btn-primary" style={{ backgroundColor: '#16a34a', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Send size={16} /> Issue Stock Release
          </button>
          <button onClick={() => setIsItemModal(true)} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
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
            color: activeTab === 'inventory' ? '#16a34a' : '#64748b',
            borderBottom: activeTab === 'inventory' ? '3px solid #16a34a' : 'none',
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
            color: activeTab === 'releases' ? '#16a34a' : '#64748b',
            borderBottom: activeTab === 'releases' ? '3px solid #16a34a' : 'none',
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
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                <th style={{ padding: '12px 16px' }}>Item Description</th>
                <th style={{ padding: '12px 16px' }}>Category</th>
                <th style={{ padding: '12px 16px' }}>Quantity On Hand</th>
                <th style={{ padding: '12px 16px' }}>Reorder Threshold</th>
                <th style={{ padding: '12px 16px' }}>Unit Cost (RWF)</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {items.length > 0 ? (
                items.map((i) => {
                  const isLow = i.quantity_on_hand <= i.min_threshold;
                  return (
                    <tr key={i.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 700 }}>{i.item_name}</td>
                      <td style={{ padding: '12px 16px' }}>{i.category}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 800, color: isLow ? '#0284c7' : '#0f172a' }}>
                        {i.quantity_on_hand} {i.unit}
                      </td>
                      <td style={{ padding: '12px 16px' }}>{i.min_threshold} {i.unit}</td>
                      <td style={{ padding: '12px 16px' }}>{i.unit_cost?.toLocaleString()} RWF</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          backgroundColor: isLow ? '#e0f2fe' : '#dcfce7',
                          color: isLow ? '#0369a1' : '#15803d'
                        }}>
                          {isLow ? 'REORDER LOW' : 'OK'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>No stock items registered yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'releases' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                <th style={{ padding: '12px 16px' }}>Release Date</th>
                <th style={{ padding: '12px 16px' }}>Item Issued</th>
                <th style={{ padding: '12px 16px' }}>Qty Issued</th>
                <th style={{ padding: '12px 16px' }}>Target Location</th>
                <th style={{ padding: '12px 16px' }}>Requested By</th>
              </tr>
            </thead>
            <tbody>
              {releases.length > 0 ? (
                releases.map((r) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 700 }}>{r.release_date}</td>
                    <td style={{ padding: '12px 16px' }}>{r.item_name}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 700 }}>{r.quantity}</td>
                    <td style={{ padding: '12px 16px' }}>{r.target_location}</td>
                    <td style={{ padding: '12px 16px' }}>{r.requested_by}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>No stock releases issued yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL: STOCK RELEASE FORM */}
      {isReleaseModal && (
        <Modal title="Stock Release Form" onClose={() => setIsReleaseModal(false)}>
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
