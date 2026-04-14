import { Eye, FileText, Calendar, User, Info, Receipt, Download, CheckCircle, XCircle } from 'lucide-react';
import StatusBadge from '../../../components/StatusBadge';
import { useState } from 'react';

const LabelValue = ({ label, value }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
    <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--primary-dark)' }}>{value || '---'}</span>
  </div>
);

const DetailSection = ({ label, value, icon, color }) => (
  <div style={{ display: 'flex', gap: '15px' }}>
    <div style={{ flexShrink: 0, width: '36px', height: '36px', borderRadius: '10px', backgroundColor: `${color}15`, color: color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {icon}
    </div>
    <div>
      <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--primary-dark)', marginBottom: '4px' }}>{label}</h4>
      <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{value}</p>
    </div>
  </div>
);

const CancellationDetailsView = ({ data, user, onExport, onVerify, onApprove, onReject }) => {
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectComment, setRejectComment] = useState('');

  if (!data) return null;

  const canVerify = data.status === 'pending' && user?.role === 'sales_manager';
  const canApprove = data.status === 'verified' && user?.role === 'coo';

  const handleRejectSubmit = () => {
    if (!rejectComment.trim()) {
      alert("Rejection comment is required.");
      return;
    }
    onReject(rejectComment);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <StatusBadge status={data.status} />
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            ID: <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{data.id}</span>
          </span>
        </div>
        {onExport && (
          <button onClick={onExport} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: '#ffffff', color: 'var(--primary)', border: '1.5px solid var(--primary)', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>
            <Download size={16} />
            Export PDF
          </button>
        )}
      </div>

      <div className="glass" style={{ position: 'relative', padding: '2rem', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
        {data.status === 'approved' && (
          <img src="/images/stamps/approved.png" alt="Approved Stamp" style={{ position: 'absolute', top: '20px', right: '30px', width: '200px', opacity: 0.75, pointerEvents: 'none', transform: 'rotate(-15deg)', zIndex: 0 }} />
        )}
        {data.status === 'rejected' && (
          <img src="/images/stamps/rejected.png" alt="Rejected Stamp" style={{ position: 'absolute', top: '20px', right: '30px', width: '200px', opacity: 0.75, pointerEvents: 'none', transform: 'rotate(-15deg)', zIndex: 0 }} />
        )}
        <div style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '2rem' }}>
          <LabelValue label="Patient Name" value={data.patient_full_name} />
          <LabelValue label="PID Number" value={data.pid_number} />
          <LabelValue label="Old SID" value={data.old_sid_number} />
          <LabelValue label="New SID" value={data.new_sid_number} />
          <LabelValue label="Insurance / Payer" value={data.insurance_payer} />
          <LabelValue label="Amount" value={data.total_amount_cancelled} />
        </div>

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <DetailSection 
            label="Original Receipt Details" 
            value={data.original_receipt_number ? `Receipt #${data.original_receipt_number} on ${new Date(data.initial_transaction_date).toLocaleDateString()}` : 'No receipt data provided'} 
            icon={<Receipt size={18} />} 
            color="var(--info)" 
          />
          <DetailSection 
            label="Reason for Cancellation" 
            value={data.reason_for_cancellation} 
            icon={<Info size={18} />} 
            color="var(--primary)" 
          />
          {data.rejection_comment && (
            <DetailSection 
              label="Rejection Comment" 
              value={data.rejection_comment} 
              icon={<XCircle size={18} />} 
              color="var(--danger)" 
            />
          )}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '12px', fontSize: '0.85rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
          <User size={14} />
          <span>Submitted by <span style={{ fontWeight: 600, color: 'var(--primary-dark)' }}>{data.creator_name}</span></span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
          <Calendar size={14} />
          <span>{new Date(data.created_at).toLocaleString()}</span>
        </div>
      </div>

      {(canVerify || canApprove) && !isRejecting && (
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <button onClick={() => setIsRejecting(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.75rem 1.5rem', backgroundColor: '#fff', color: 'var(--danger)', border: '1px solid var(--danger)', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
            <XCircle size={18} />
            Reject Request
          </button>
          
          {canVerify && (
            <button onClick={onVerify} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.75rem 1.5rem', backgroundColor: 'var(--warning)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
              <CheckCircle size={18} />
              First Level Approval
            </button>
          )}

          {canApprove && (
            <button onClick={onApprove} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.75rem 1.5rem', backgroundColor: 'var(--success)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
              <CheckCircle size={18} />
              Final Level Approval
            </button>
          )}
        </div>
      )}

      {isRejecting && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem', padding: '1.5rem', backgroundColor: '#fff5f5', borderRadius: '12px', border: '1px solid #fed7d7' }}>
          <h4 style={{ color: 'var(--danger)', margin: 0 }}>Provide Rejection Reason</h4>
          <textarea 
            value={rejectComment} 
            onChange={e => setRejectComment(e.target.value)}
            placeholder="Please enter the reason for rejection..."
            style={{ padding: '1rem', borderRadius: '8px', border: '1px solid #feb2b2', minHeight: '80px', fontFamily: 'inherit' }}
          />
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            <button onClick={() => setIsRejecting(false)} style={{ padding: '0.5rem 1rem', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
            <button onClick={handleRejectSubmit} style={{ padding: '0.5rem 1.5rem', backgroundColor: 'var(--danger)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Submit Rejection</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CancellationDetailsView;
