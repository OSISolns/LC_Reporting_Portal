import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getRefundById,
  verifyRefund,
  approveRefund,
  rejectRefund,
  getRefundPDF,
} from '../../api/refunds';
import { useAuth } from '../../context/AuthContext';
import {
  ChevronLeft, Download, Printer,
  CheckCircle, XCircle, ShieldCheck, History,
} from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import Modal from '../../components/Modal';
import RefundDetailsView from './components/RefundDetailsView';

const RefundDetail = () => {
  const { id }      = useParams();
  const navigate    = useNavigate();
  const { user }    = useAuth();
  const [data,         setData]        = useState(null);
  const [loading,      setLoading]     = useState(true);
  const [rejectModal,  setRejectModal] = useState(false);
  const [rejectComment,setRejectComment] = useState('');

  useEffect(() => { fetchData(); }, [id]);

  const fetchData = async () => {
    try {
      const res = await getRefundById(id);
      setData(res.data.data);
    } catch (err) {
      console.error('Failed to fetch refund details');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify  = async () => {
    if (!window.confirm('Mark this refund request as verified?')) return;
    try { await verifyRefund(id);  fetchData(); } catch { alert('Action failed'); }
  };

  const handleApprove = async () => {
    if (!window.confirm('Approve this refund request?')) return;
    try { await approveRefund(id); fetchData(); } catch { alert('Action failed'); }
  };

  const handleReject  = async (e) => {
    e.preventDefault();
    try { await rejectRefund(id, rejectComment); setRejectModal(false); fetchData(); } catch { alert('Action failed'); }
  };

  const downloadPDF = async () => {
    try {
      const res  = await getRefundPDF(id);
      const url  = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Refund_${data.pid_number}.pdf`);
      document.body.appendChild(link);
      link.click();
    } catch { alert('PDF generation failed'); }
  };

  const handlePrint = () => window.print();

  if (loading) return <LoadingSpinner />;
  if (!data)   return <div>Request not found</div>;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem' }}>
        <div>
          <button onClick={() => navigate(-1)} className="no-print"
            style={{ background: 'none', border: 'none', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.5rem', fontWeight: 600, cursor: 'pointer' }}>
            <ChevronLeft size={20} /> Back
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <h1 style={{ fontSize: '2.25rem', fontWeight: 700, color: 'var(--primary-dark)' }}>{data.patient_full_name}</h1>
            <StatusBadge status={data.status} />
          </div>
          <p style={{ color: 'var(--text-secondary)', marginTop: '8px', fontSize: '1rem' }}>
            Refund Request ID: <span style={{ fontWeight: 600 }}>#{data.id}</span> • Created on {new Date(data.created_at).toLocaleString()}
          </p>
        </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <RefundDetailsView data={data} onExport={downloadPDF} />

          {data.status === 'rejected' && (
            <div className="glass card-shadow" style={{ padding: '2rem', borderLeft: '6px solid var(--danger)', backgroundColor: '#ffffff', borderRadius: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--danger)', marginBottom: '1rem' }}>
                <XCircle size={24} />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Request Rejected</h3>
              </div>
              <p style={{ fontSize: '1rem', color: 'var(--primary-dark)', marginBottom: '8px' }}><strong>Rejection Comment by {data.rejector_name}:</strong></p>
              <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{data.rejection_comment}</p>
            </div>
          )}
        </div>

        {/* Action Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="glass card-shadow" style={{ padding: '2rem', backgroundColor: '#ffffff' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary-dark)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShieldCheck size={20} style={{ color: 'var(--primary)' }} /> Workflow Actions
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {data.status === 'pending' && user.role === 'sales_manager' && (
                <button onClick={handleVerify}
                  style={{ padding: '14px', backgroundColor: 'var(--info)', color: '#ffffff', border: 'none', borderRadius: '10px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: 'pointer' }}>
                  <CheckCircle size={18} /> Verify Request
                </button>
              )}
              {data.status === 'verified' && user.role === 'coo' && (
                <button onClick={handleApprove}
                  style={{ padding: '14px', backgroundColor: 'var(--success)', color: '#ffffff', border: 'none', borderRadius: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: 'pointer' }}>
                  <CheckCircle size={18} /> Approve Request
                </button>
              )}
              {['pending','verified'].includes(data.status) && ['coo','sales_manager','chairman'].includes(user.role) && (
                <button onClick={() => setRejectModal(true)}
                  style={{ padding: '14px', backgroundColor: 'transparent', color: 'var(--danger)', border: '1.5px solid var(--danger)', borderRadius: '10px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: 'pointer' }}>
                  <XCircle size={18} /> Reject Request
                </button>
              )}
              {data.status === 'approved' && (
                <div style={{ textAlign: 'center', padding: '1.5rem', backgroundColor: 'rgba(40,167,69,0.1)', borderRadius: '12px', color: 'var(--success)', border: '1px solid rgba(40,167,69,0.2)' }}>
                  <CheckCircle size={32} style={{ marginBottom: '12px' }} />
                  <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>Fully Approved</p>
                  <p style={{ fontSize: '0.85rem', marginTop: '5px', marginBottom: '1.5rem' }}>Processed by {data.approver_name}</p>
                </div>
              )}
            </div>
          </div>

          {/* Audit Trail */}
          <div className="glass card-shadow" style={{ padding: '2rem', backgroundColor: '#ffffff' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary-dark)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <History size={20} style={{ color: 'var(--text-secondary)' }} /> Audit Trail
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <TimelineItem label="Submission"        by={data.creator_name}                      date={data.created_at}  active />
              <TimelineItem label="Verification"      by={data.verifier_name}                     date={data.verified_at} active={!!data.verified_at} />
              <TimelineItem label="Final Determination" by={data.approver_name || data.rejector_name} date={data.approved_at || data.rejected_at} active={!!(data.approved_at || data.rejected_at)} isLast />
            </div>
          </div>
        </div>
      </div>

      <Modal isOpen={rejectModal} onClose={() => setRejectModal(false)} title="Reject Refund Request">
        <form onSubmit={handleReject}>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
            Please provide a specific reason for rejecting this refund request.
          </p>
          <textarea required rows="4" value={rejectComment} onChange={e => setRejectComment(e.target.value)}
            placeholder="Reason for rejection..."
            style={{ width: '100%', padding: '14px', backgroundColor: '#f8fafc', color: 'var(--text-primary)', border: '1.5px solid var(--border-color)', borderRadius: '10px', marginBottom: '2rem', resize: 'none', outline: 'none' }} />
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button type="submit" style={{ flex: 1, padding: '12px', backgroundColor: 'var(--danger)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}>Confirm Rejection</button>
            <button type="button" onClick={() => setRejectModal(false)} style={{ flex: 1, padding: '12px', backgroundColor: '#f1f5f9', color: 'var(--primary-dark)', border: 'none', borderRadius: '10px', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

const TimelineItem = ({ label, by, date, active, isLast }) => (
  <div style={{ display: 'flex', gap: '15px' }}>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: active ? 'var(--primary)' : '#e2e8f0', border: active ? '3px solid rgba(0,123,138,0.2)' : 'none', marginTop: '6px', zIndex: 2 }} />
      {!isLast && <div style={{ flex: 1, width: '2px', backgroundColor: '#f1f5f9', minHeight: '30px', margin: '-4px 0' }} />}
    </div>
    <div style={{ paddingBottom: isLast ? 0 : '1.5rem', opacity: active ? 1 : 0.4 }}>
      <p style={{ fontSize: '0.95rem', fontWeight: 700, color: active ? 'var(--primary-dark)' : 'var(--text-secondary)' }}>{label}</p>
      {active && (
        <div style={{ marginTop: '4px' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500 }}>{by}</p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{date && new Date(date).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</p>
        </div>
      )}
    </div>
  </div>
);

export default RefundDetail;
