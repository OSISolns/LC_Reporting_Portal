import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Plus, Search, Filter, FileSpreadsheet, Trash2, Eye, FileText, Printer, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import Modal from '../../components/Modal';
import CancellationFormFields from './components/CancellationFormFields';
import CancellationDetailsView from './components/CancellationDetailsView';
import { 
  getCancellationById, 
  createCancellation, 
  getCancellationPDF, 
  getCancellations, 
  deleteCancellation,
  verifyCancellation,
  approveCancellation,
  rejectCancellation 
} from '../../api/cancellations';

const CancellationList = () => {
  const { user } = useAuth();
  const isDev = import.meta.env.DEV;
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ patientName: '', pid: '', status: '' });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [activeRequest, setActiveRequest] = useState(null);
  const [formData, setFormData] = useState({
    patientFullName: '', pidNumber: '', oldSidNumber: '', newSidNumber: '',
    telephoneNumber: '', insurancePayer: '', totalAmountCancelled: '',
    originalReceiptNumber: '', rectifiedReceiptNumber: '',
    initialTransactionDate: '', rectifiedDate: '', reasonForCancellation: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, [filters]);

  const fetchRequests = async () => {
    try {
      const res = await getCancellations(filters).catch(() => ({ data: { data: [] } }));
      setRequests(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch requests');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (id) => {
    setActiveRequest(null);
    setShowViewModal(true);
    setDetailLoading(true);
    try {
      const res = await getCancellationById(id);
      setActiveRequest(res.data.data);
    } catch (err) {
      console.error('Failed to fetch request details');
    } finally {
      setDetailLoading(false);
    }
  };


  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createCancellation(formData);
      setShowCreateModal(false);
      fetchRequests();
      setFormData({
        patientFullName: '', pidNumber: '', oldSidNumber: '', newSidNumber: '',
        telephoneNumber: '', insurancePayer: '', totalAmountCancelled: '',
        originalReceiptNumber: '', rectifiedReceiptNumber: '',
        initialTransactionDate: '', rectifiedDate: '', reasonForCancellation: ''
      });
    } catch (err) {
      alert('Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = async (id) => {
    try {
      const res = await getCancellationPDF(id);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Cancellation_${id}.pdf`);
      document.body.appendChild(link);
      link.click();
    } catch (err) { alert('Export failed'); }
  };

  const handlePrint = async (id) => {
    setActiveRequest(null);
    setShowViewModal(true);
    setDetailLoading(true);
    try {
      const res = await getCancellationById(id);
      setActiveRequest({ ...res.data.data, printRequested: true });
    } catch (err) {
      console.error('Failed to fetch request details');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this pending request?")) return;
    try {
      await deleteCancellation(id);
      fetchRequests();
    } catch (err) {
      alert('Delete failed');
    }
  };

  const handleAction = async (actionFn, id, comment = '') => {
    try {
      await actionFn(id, comment);
      fetchRequests();
      setShowViewModal(false);
    } catch (err) {
      alert('Action failed');
    }
  };

  const handlePrintList = () => {
    document.body.setAttribute('data-print-date', new Date().toLocaleString());
    window.print();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary-dark)', marginBottom: '0.25rem' }}>Cancellation Requests</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>Workflow for patient invoice/receipt cancellations.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }} className="no-print">
          <button 
            onClick={handlePrintList} 
            className="glass card-shadow" 
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.75rem 1.25rem', backgroundColor: '#ffffff', color: 'var(--primary-dark)', border: '1px solid var(--border-color)', borderRadius: '10px', fontWeight: 600, cursor: 'pointer' }}
          >
            <Printer size={18} />
            Print Summary
          </button>
          {['cashier', 'principal_cashier', 'customer_care'].includes(user?.role) && (
            <button 
              onClick={() => setShowCreateModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.75rem 1.25rem', backgroundColor: 'var(--primary)', color: '#ffffff', border: 'none', borderRadius: '10px', fontWeight: 600, boxShadow: '0 4px 6px -1px rgba(0, 123, 138, 0.2)', cursor: 'pointer' }}
            >
              <Plus size={18} />
              New Request
            </button>
          )}
        </div>
      </div>


      <div className="glass card-shadow" style={{ padding: '1.25rem', marginBottom: '2rem', display: 'flex', gap: '1.25rem', flexWrap: 'wrap', alignItems: 'center', backgroundColor: '#ffffff' }}>
        <div style={{ position: 'relative', flex: 2, minWidth: '300px' }}>
          <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input
            type="text"
            placeholder="Search by Patient Name or PID..."
            value={filters.patientName}
            onChange={(e) => setFilters({ ...filters, patientName: e.target.value })}
            style={{ width: '100%', padding: '12px 14px 12px 46px', backgroundColor: '#f8fafc', border: '1.5px solid var(--border-color)', borderRadius: '10px', color: 'var(--text-primary)', outline: 'none', fontSize: '0.95rem' }}
          />
        </div>
        <div style={{ flex: 1, minWidth: '180px' }}>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            style={{ width: '100%', padding: '12px 14px', backgroundColor: '#f8fafc', border: '1.5px solid var(--border-color)', borderRadius: '10px', color: 'var(--text-primary)', outline: 'none', fontSize: '0.95rem', cursor: 'pointer' }}
          >
            <option value="">Status: All Requests</option>
            <option value="pending">⏳ Pending</option>
            <option value="verified">🔍 Verified</option>
            <option value="approved">✅ Approved</option>
            <option value="rejected">❌ Rejected</option>
          </select>
        </div>
        <button onClick={() => setFilters({ patientName: '', pid: '', status: '' })} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', padding: '0 10px' }}>Reset Filters</button>
      </div>

      <div className="glass card-shadow" style={{ overflow: 'hidden', backgroundColor: '#ffffff' }}>
        {loading ? <LoadingSpinner /> : requests.length === 0 ? (
          <div style={{ padding: '5rem 3rem', textAlign: 'center' }}>
            <FileText size={48} style={{ color: 'var(--border-color)', marginBottom: '1.5rem', opacity: 0.5 }} />
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>No cancellation requests found matching your filters.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--bg-color)', backgroundColor: '#f8fafc' }}>
                <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Patient Details</th>
                <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>PID Number</th>
                <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Amount</th>
                <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Submission Date</th>
                <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Status</th>
                <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                  <td style={{ padding: '1.25rem 1.5rem' }}>
                    <div style={{ fontWeight: 600, color: 'var(--primary-dark)', fontSize: '0.95rem' }}>{r.patient_full_name}</div>
                  </td>
                  <td style={{ padding: '1.25rem 1.5rem', color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: '0.9rem' }}>{r.pid_number}</td>
                  <td style={{ padding: '1.25rem 1.5rem', fontWeight: 700, color: 'var(--primary-dark)' }}>RWF {r.total_amount_cancelled}</td>
                  <td style={{ padding: '1.25rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{new Date(r.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                  <td style={{ padding: '1.25rem 1.5rem' }}>
                    <StatusBadge status={r.status} />
                  </td>
                  <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button 
                      onClick={() => handleViewDetails(r.id)}
                      title="View Details"
                      style={{ 
                        color: 'var(--primary)', 
                        background: 'none',
                        border: 'none',
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        padding: '8px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'background 0.2s'
                      }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0,123,138,0.1)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                      <Eye size={18} />
                    </button>
                    <button 
                      onClick={() => handleExport(r.id)}
                      title="Export PDF"
                      style={{ 
                        color: 'var(--primary)', 
                        background: 'none',
                        border: 'none',
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        padding: '8px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'background 0.2s'
                      }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0,123,138,0.1)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                      <Download size={18} />
                    </button>
                    <button 
                      onClick={() => handlePrint(r.id)}
                      title="Print Report"
                      style={{ 
                        color: 'var(--primary)', 
                        background: 'none',
                        border: 'none',
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        padding: '8px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'background 0.2s'
                      }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0,123,138,0.1)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                      <Printer size={18} />
                    </button>
                    {r.status === 'pending' && (r.created_by === user.id) && ['cashier', 'principal_cashier', 'customer_care'].includes(user.role) && (
                      <button 
                        onClick={() => handleDelete(r.id)}
                        title="Delete Request"
                        style={{ color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}
                      >
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
      {/* Form Modal */}
      <Modal 
        isOpen={showCreateModal} 
        onClose={() => setShowCreateModal(false)}
        title="Create Cancellation Request"
        maxWidth="800px"
      >
        <CancellationFormFields 
          formData={formData}
          handleChange={(e) => setFormData({ ...formData, [e.target.name]: e.target.value })}
          handleSubmit={handleCreateSubmit}
          loading={submitting}
          onCancel={() => setShowCreateModal(false)}
        />
      </Modal>

      {/* View Modal */}
      <Modal
        isOpen={showViewModal}
        onClose={() => setShowViewModal(false)}
        title="Request Details"
        maxWidth="800px"
      >
        {detailLoading ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}><LoadingSpinner /></div>
        ) : (
          <CancellationDetailsView 
            data={activeRequest} 
            user={user}
            onExport={() => activeRequest && handleExport(activeRequest.id)}
            onVerify={() => activeRequest && handleAction(verifyCancellation, activeRequest.id)}
            onApprove={() => activeRequest && handleAction(approveCancellation, activeRequest.id)}
            onReject={(comment) => activeRequest && handleAction(rejectCancellation, activeRequest.id, comment)}
            printOnLoad={activeRequest?.printRequested}
          />
        )}
      </Modal>
    </div>
  );
};

export default CancellationList;
