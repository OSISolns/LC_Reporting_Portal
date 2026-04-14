import { Eye, FileText, Calendar, User, Info, Receipt, Download, CheckCircle, XCircle } from 'lucide-react';
import StatusBadge from '../../../components/StatusBadge';
import { useState } from 'react';
import { PrintHeader, PrintFooter, PrintWatermark } from '../../../components/PrintBranding';

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', position: 'relative' }}>
      <PrintHeader title="Cancellation Request Form" docType="CAN" docId={data.id} />
      <PrintWatermark />

      <div className="official-form-container">
        <h1 style={{ textAlign: 'center', textDecoration: 'underline', marginBottom: '2rem', fontSize: '1.5rem', fontWeight: 800 }}>CANCELLATION REQUEST FORM</h1>
        
        <div style={{ marginBottom: '2rem', fontWeight: 700 }}>
          DATE OF REQUEST: <span style={{ textDecoration: 'underline', marginLeft: '10px' }}>{new Date(data.created_at).toLocaleDateString()}</span>
        </div>

        {/* Section 1 */}
        <h3 className="official-form-section-title">Section 1: FORMAL PATIENT IDENTIFICATION</h3>
        <table className="official-form-table">
          <tbody>
            <tr>
              <th>Patient's full name</th>
              <td>{data.patient_full_name}</td>
            </tr>
            <tr>
              <th>PID number</th>
              <td>{data.pid_number}</td>
            </tr>
            <tr>
              <th>SID number</th>
              <td>{data.new_sid_number || '---'}</td>
            </tr>
            <tr>
              <th>Telephone number</th>
              <td>{data.telephone_number || '---'}</td>
            </tr>
            <tr>
              <th>Insurance / Payer</th>
              <td>{data.insurance_payer || 'Private'}</td>
            </tr>
          </tbody>
        </table>

        {/* Section 2 */}
        <h3 className="official-form-section-title">Section 2: TRANSACTION DETAILS</h3>
        <table className="official-form-table">
          <tbody>
            <tr>
              <th>Amount to be refunded</th>
              <td style={{ fontWeight: 700 }}>RWF {data.total_amount_cancelled}</td>
            </tr>
            <tr>
              <th>Original receipt / invoice number</th>
              <td>{data.original_receipt_number || '---'}</td>
            </tr>
            <tr>
              <th>Initial transaction date</th>
              <td>{data.initial_transaction_date ? new Date(data.initial_transaction_date).toLocaleDateString() : '---'}</td>
            </tr>
            <tr>
              <th>Reason for refund (details)</th>
              <td>{data.reason_for_cancellation}</td>
            </tr>
          </tbody>
        </table>

        {/* Section 3 */}
        <h3 className="official-form-section-title">Section 3: REFUND APPROVAL WORKFLOW</h3>
        <div className="signature-block">
          <div className="signature-line">
            <span className="signature-label">1. Initiated by (Cashier):</span>
            <span className="signature-value">{data.creator_name}</span>
            <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>@ {new Date(data.created_at).toLocaleString()}</span>
          </div>
          
          <div className="signature-line" style={{ opacity: data.verifier_name ? 1 : 0.4 }}>
            <span className="signature-label">2. Verified by:</span>
            <span className="signature-value">{data.verifier_name || '__________________________'}</span>
            {data.verified_at && <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>@ {new Date(data.verified_at).toLocaleString()}</span>}
          </div>

          <div className="signature-line" style={{ opacity: data.approver_name ? 1 : 0.4 }}>
            <span className="signature-label">3. Approved by (C.O.O):</span>
            <span className="signature-value">{data.approver_name || '__________________________'}</span>
            {data.approved_at && <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>@ {new Date(data.approved_at).toLocaleString()}</span>}
          </div>

          {data.status === 'rejected' && (
            <div className="signature-line" style={{ borderBottomColor: 'var(--danger)', marginTop: '1rem' }}>
              <span className="signature-label" style={{ color: 'var(--danger)' }}>REJECTED BY:</span>
              <span className="signature-value" style={{ color: 'var(--danger)' }}>{data.rejector_name}</span>
              <span style={{ fontWeight: 600, color: 'var(--danger)' }}>REASON: {data.rejection_comment}</span>
            </div>
          )}
        </div>
      </div>

      {(canVerify || canApprove) && !isRejecting && (
        <div className="no-print" style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <button onClick={() => setIsRejecting(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.75rem 1.5rem', backgroundColor: '#fff', color: 'var(--danger)', border: '1px solid var(--danger)', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
            <XCircle size={18} />
            Reject Request
          </button>
          
          {canVerify && (
            <button onClick={onVerify} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.75rem 1.5rem', backgroundColor: 'var(--warning)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
              <CheckCircle size={18} />
              Verify Request (L1)
            </button>
          )}

          {canApprove && (
            <button onClick={onApprove} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.75rem 1.5rem', backgroundColor: 'var(--success)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
              <CheckCircle size={18} />
              Final Approval (COO)
            </button>
          )}
        </div>
      )}

      {isRejecting && (
        <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem', padding: '1.5rem', backgroundColor: '#fff5f5', borderRadius: '12px', border: '1px solid #fed7d7' }}>
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

      <PrintFooter />
    </div>
  );
};

export default CancellationDetailsView;
