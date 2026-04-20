import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Plus, Search, FileText, Trash2, Eye, RefreshCw } from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import Modal from '../../components/Modal';
import ResultTransferFormFields from './components/ResultTransferFormFields';
import ResultTransferDetailsView from './components/ResultTransferDetailsView';
import {
  getResultTransfers, getResultTransferById, createResultTransfer,
  getResultTransferPDF, deleteResultTransfer,
  reviewResultTransfer, approveResultTransfer, rejectResultTransfer,
} from '../../api/resultTransfer';

const EMPTY_FORM = {
  transferDate: new Date().toISOString().split('T')[0],
  oldSid: '',
  newSid: '',
  reason: '',
};

const ResultTransferList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [requests,        setRequests]       = useState([]);
 
  useEffect(() => {
    if (user?.role === 'it_officer') {
      navigate('/unauthorized', { replace: true });
    }
  }, [user, navigate]);
  const [loading,         setLoading]        = useState(true);
  const [filters,         setFilters]        = useState({ sid: '', status: '' });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal,   setShowViewModal]   = useState(false);
  const [activeRequest,   setActiveRequest]   = useState(null);
  const [formData,        setFormData]        = useState(EMPTY_FORM);
  const [submitting,      setSubmitting]      = useState(false);
  const [detailLoading,   setDetailLoading]   = useState(false);

  useEffect(() => { fetchRequests(); }, [filters]);

  const fetchRequests = async () => {
    try {
      const res = await getResultTransfers(filters).catch(() => ({ data: { data: [] } }));
      setRequests(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch transfer requests');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (id) => {
    setActiveRequest(null);
    setShowViewModal(true);
    setDetailLoading(true);
    try {
      const res = await getResultTransferById(id);
      setActiveRequest(res.data.data);
    } catch (err) {
      console.error('Failed to fetch transfer details');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createResultTransfer(formData);
      setShowCreateModal(false);
      fetchRequests();
      setFormData(EMPTY_FORM);
    } catch (err) {
      alert('Failed to submit transfer request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = async (id) => {
    try {
      const res = await getResultTransferPDF(id);
      const url  = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ResultTransfer_${id}.pdf`);
      document.body.appendChild(link);
      link.click();
    } catch (err) {
      console.error('PDF Export failed');
    }
  };

  const handleAction = async (actionFn, id, ...args) => {
    try {
      await actionFn(id, ...args);
      fetchRequests();
      setShowViewModal(false);
    } catch (err) { alert('Action failed'); }
  };

  const canCreate = ['cashier', 'customer_care', 'admin'].includes(user?.role);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary-dark)', marginBottom: '0.25rem' }}>Results Transfers</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>Manage and approve laboratory results transfers between SIDs.</p>
        </div>
        {canCreate && (
          <button onClick={() => setShowCreateModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.75rem 1.25rem', backgroundColor: 'var(--primary)', color: '#ffffff', border: 'none', borderRadius: '10px', fontWeight: 600, boxShadow: '0 4px 6px -1px rgba(0,123,138,0.2)', cursor: 'pointer' }}>
            <Plus size={18} /> New Transfer Request
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="glass card-shadow" style={{ padding: '1.25rem', marginBottom: '2rem', display: 'flex', gap: '1.25rem', flexWrap: 'wrap', alignItems: 'center', backgroundColor: '#ffffff' }}>
        <div style={{ position: 'relative', flex: 2, minWidth: '300px' }}>
          <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input type="text" placeholder="Search by SID..."
            value={filters.sid}
            onChange={(e) => setFilters({ ...filters, sid: e.target.value })}
            style={{ width: '100%', padding: '12px 14px 12px 46px', backgroundColor: '#f8fafc', border: '1.5px solid var(--border-color)', borderRadius: '10px', color: 'var(--text-primary)', outline: 'none', fontSize: '0.95rem' }} />
        </div>
        <div style={{ flex: 1, minWidth: '180px' }}>
          <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            style={{ width: '100%', padding: '12px 14px', backgroundColor: '#f8fafc', border: '1.5px solid var(--border-color)', borderRadius: '10px', color: 'var(--text-primary)', outline: 'none', fontSize: '0.95rem', cursor: 'pointer' }}>
            <option value="">Status: All</option>
            <option value="pending">⏳ Pending Review</option>
            <option value="reviewed">🔍 Reviewed</option>
            <option value="approved">✅ Approved</option>
            <option value="rejected">❌ Rejected</option>
          </select>
        </div>
        <button onClick={() => setFilters({ sid: '', status: '' })}
          style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', padding: '0 10px' }}>
          Reset
        </button>
      </div>

      {/* Table */}
      <div className="glass card-shadow" style={{ overflow: 'hidden', backgroundColor: '#ffffff' }}>
        {loading ? <LoadingSpinner /> : requests.length === 0 ? (
          <div style={{ padding: '5rem 3rem', textAlign: 'center' }}>
            <RefreshCw size={48} style={{ color: 'var(--border-color)', marginBottom: '1.5rem', opacity: 0.5 }} />
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>No transfer requests found.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--bg-color)', backgroundColor: '#f8fafc' }}>
                {['Old SID', 'New SID', 'Submission Date', 'Status', 'Actions'].map((h, i) => (
                  <th key={h} style={{ padding: '1.25rem 1.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: i === 4 ? 'right' : 'left' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {requests.map(r => (
                <tr key={r.id}
                  style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                  <td style={{ padding: '1.25rem 1.5rem', fontWeight: 600, color: 'var(--danger)' }}>{r.old_sid}</td>
                  <td style={{ padding: '1.25rem 1.5rem', fontWeight: 600, color: '#059669' }}>{r.new_sid}</td>
                  <td style={{ padding: '1.25rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    {new Date(r.created_at).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '1.25rem 1.5rem' }}><StatusBadge status={r.status} /></td>
                  <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button onClick={() => handleViewDetails(r.id)} title="View Details"
                      style={{ color: 'var(--primary)', background: 'none', border: 'none', display: 'inline-flex', alignItems: 'center', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}>
                      <Eye size={18} />
                    </button>
                    {r.status === 'pending' && (user.role === 'admin' || r.created_by === user.id) && (
                      <button onClick={async () => {
                        if (window.confirm('Delete this request?')) {
                          await deleteResultTransfer(r.id);
                          fetchRequests();
                        }
                      }} style={{ color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}>
                        <Trash2 size={18} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="New Results Transfer" maxWidth="700px">
        <ResultTransferFormFields
          formData={formData}
          handleChange={(e) => setFormData({ ...formData, [e.target.name]: e.target.value })}
          handleSubmit={handleCreateSubmit}
          loading={submitting}
          onCancel={() => setShowCreateModal(false)}
        />
      </Modal>

      {/* View Modal */}
      <Modal isOpen={showViewModal} onClose={() => setShowViewModal(false)} title="Transfer Request Details" maxWidth="750px">
        {detailLoading ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}><LoadingSpinner /></div>
        ) : (
          <ResultTransferDetailsView
            data={activeRequest}
            user={user}
            onExport={() => activeRequest && handleExport(activeRequest.id)}
            onReview={() => activeRequest && handleAction(reviewResultTransfer, activeRequest.id)}
            onApprove={(editedByName) => activeRequest && handleAction(approveResultTransfer, activeRequest.id, editedByName)}
            onReject={(comment) => activeRequest && handleAction(rejectResultTransfer, activeRequest.id, comment)}
          />
        )}
      </Modal>
    </div>
  );
};

export default ResultTransferList;
