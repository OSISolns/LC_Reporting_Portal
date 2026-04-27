import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getRefundById,
  verifyRefund,
  approveRefund,
  rejectRefund,
} from '../../api/refunds';
import { submitRating } from '../../api/performance';
import { useAuth } from '../../context/AuthContext';
import {
  ChevronLeft, Download,
  CheckCircle, XCircle, ShieldCheck, History, Star, Info
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
  const [rateModal, setRateModal] = useState(false);
  const [ratingForm, setRatingForm] = useState({
    reason: '',
    severity: 1,
    note: ''
  });

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

  const handleRateSubmit = async (e) => {
    e.preventDefault();
    try {
      await submitRating({
        staffUserId: data.created_by,
        requestType: 'refund',
        requestId: data.id,
        reason: ratingForm.reason,
        severity: ratingForm.severity,
        note: ratingForm.note
      });
      setRateModal(false);
      alert('Rating submitted successfully!');
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit rating');
    }
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

  if (loading) return <LoadingSpinner />;
  if (!data)   return <div>Request not found</div>;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem' }}>
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
        <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="glass card-shadow" style={{ padding: '2rem', backgroundColor: '#ffffff' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary-dark)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShieldCheck size={20} style={{ color: 'var(--primary)' }} /> Workflow Actions
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {data.status === 'pending' && ['sales_manager', 'principal_cashier'].includes(user.role) && (
                <button onClick={handleVerify}
                  style={{ padding: '14px', backgroundColor: 'var(--info)', color: '#ffffff', border: 'none', borderRadius: '10px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: 'pointer' }}>
                  <CheckCircle size={18} /> Verify Request
                </button>
              )}
              {data.status === 'verified' && ['coo', 'principal_cashier'].includes(user.role) && (
                <button onClick={handleApprove}
                  style={{ padding: '14px', backgroundColor: 'var(--success)', color: '#ffffff', border: 'none', borderRadius: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: 'pointer' }}>
                  <CheckCircle size={18} /> Approve Request
                </button>
              )}
              {((data.status === 'pending' && ['sales_manager', 'chairman', 'principal_cashier'].includes(user.role)) || (data.status === 'verified' && ['coo', 'deputy_coo', 'sales_manager', 'chairman', 'principal_cashier'].includes(user.role))) && (
                <button onClick={() => setRejectModal(true)}
                  style={{ padding: '14px', backgroundColor: 'transparent', color: 'var(--danger)', border: '1.5px solid var(--danger)', borderRadius: '10px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: 'pointer' }}>
                  <XCircle size={18} /> Reject Request
                </button>
              )}
              {['sales_manager', 'principal_cashier'].includes(user.role) && data.created_by && (
                data.is_rated ? (
                  <div style={{ padding: '14px', backgroundColor: '#f1f5f9', color: 'var(--text-secondary)', border: 'none', borderRadius: '10px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                    <Star size={18} />
                    Staff Already Rated
                  </div>
                ) : (
                  <button onClick={() => setRateModal(true)} style={{ padding: '14px', backgroundColor: '#003b44', color: '#ffffff', border: 'none', borderRadius: '10px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(0, 59, 68, 0.2)' }}>
                    <Star size={18} />
                     Rate Staff Reason
                  </button>
                )
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

      <Modal isOpen={rateModal} onClose={() => setRateModal(false)} title="Rate Staff Performance" maxWidth="500px">
        <form onSubmit={handleRateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', lineHeight: 1.5 }}>
            Rating request reason provided by <strong>{data.creator_name}</strong>.
          </p>
          
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '0.9rem', color: 'var(--primary-dark)' }}>Reason for Rating</label>
            <input 
              required
              type="text" 
              placeholder="e.g. Incomplete documentation"
              value={ratingForm.reason} 
              onChange={e => setRatingForm({...ratingForm, reason: e.target.value})}
              style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', outline: 'none' }}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <label style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--primary-dark)' }}>Severity Score (1-10)</label>
              <span style={{ fontWeight: 800, color: ratingForm.severity >= 4 ? '#dc2626' : ratingForm.severity === 3 ? '#d97706' : '#10b981' }}>{ratingForm.severity}</span>
            </div>
            <input 
              type="range" 
              min="1" max="10" 
              value={ratingForm.severity} 
              onChange={e => setRatingForm({...ratingForm, severity: parseInt(e.target.value)})}
              style={{ width: '100%', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              <span>1-2: Tolerable</span>
              <span>3: Warning (Deducts 0.5 per 3)</span>
              <span>4-10: Point Deduction</span>
            </div>

            <div style={{ marginTop: '1rem', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              <div style={{ fontWeight: 600, color: 'var(--primary-dark)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Info size={14}/> Deduction Legend
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                <span><strong>1:</strong> 0 pts (Tolerable)</span>
                <span><strong>2:</strong> (3x=Warn, 5x=-0.5pts)</span>
                <span><strong>3:</strong> Warning (0.5 pts per 3)</span>
                <span><strong>4:</strong> -0.8 pts</span>
                <span><strong>5:</strong> -1.0 pts</span>
                <span><strong>6:</strong> -1.2 pts</span>
                <span><strong>7:</strong> -1.4 pts</span>
                <span><strong>8:</strong> -1.6 pts</span>
                <span><strong>9:</strong> -1.8 pts</span>
                <span style={{ gridColumn: '1 / -1' }}><strong>10:</strong> -2.0 pts (Max Severity)</span>
              </div>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '0.9rem', color: 'var(--primary-dark)' }}>Additional Notes (Optional)</label>
            <textarea 
              rows="3"
              value={ratingForm.note} 
              onChange={e => setRatingForm({...ratingForm, note: e.target.value})}
              style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', outline: 'none', resize: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button type="submit" style={{ flex: 1, padding: '14px', backgroundColor: '#003b44', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}>Submit Rating</button>
            <button type="button" onClick={() => setRateModal(false)} style={{ flex: 1, padding: '14px', backgroundColor: '#f1f5f9', color: 'var(--primary-dark)', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
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
