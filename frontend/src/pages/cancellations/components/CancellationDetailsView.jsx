import { useEffect, useState } from 'react';
import { Eye, FileText, Calendar, User, Info, Receipt, Download, CheckCircle, XCircle } from 'lucide-react';
import StatusBadge from '../../../components/StatusBadge';
import { PrintHeader, PrintFooter, PrintWatermark } from '../../../components/PrintBranding';

const CancellationDetailsView = ({ data, user, onExport, onVerify, onApprove, onReject, printOnLoad }) => {

  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectComment, setRejectComment] = useState('');

  useEffect(() => {
    if (printOnLoad && data) {
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [printOnLoad, data]);

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
      
      {data.status === 'approved' && (
        <div className="medical-stamp">
          <img src="/stamps/approved.png" alt="APPROVED" />
        </div>
      )}
      {data.status === 'rejected' && (
        <div className="medical-stamp">
          <img src="/stamps/rejected.png" alt="REJECTED" />
        </div>
      )}

      <div className="medical-form-modern">
        {/* Section 1 */}
        <div className="medical-form-section-head">Section 1: FORMAL PATIENT IDENTIFICATION</div>
        <table className="medical-form-table">
          <tbody>
            <tr>
              <th>Patient's Full Name</th>
              <td style={{ fontWeight: 700 }}>{data.patient_full_name}</td>
            </tr>
            <tr>
              <th>PID Number</th>
              <td>{data.pid_number}</td>
            </tr>
            <tr>
              <th>SID Number</th>
              <td>{data.new_sid_number || 'N/A'}</td>
            </tr>
            <tr>
              <th>Telephone Number</th>
              <td>{data.telephone_number || 'N/A'}</td>
            </tr>
            <tr>
              <th>Insurance / Payer</th>
              <td>{data.insurance_payer || 'Private / Walk-in'}</td>
            </tr>
          </tbody>
        </table>

        {/* Section 2 */}
        <div className="medical-form-section-head">Section 2: TRANSACTION & REFUND DETAILS</div>
        <table className="medical-form-table">
          <tbody>
            <tr>
              <th>Amount to be Refunded</th>
              <td style={{ fontWeight: 800, color: '#111827' }}>RWF {Number(data.total_amount_cancelled).toLocaleString()}</td>
            </tr>
            <tr>
              <th>Original Receipt / Invoice</th>
              <td>{data.original_receipt_number || 'STUB_ATTACHED'}</td>
            </tr>
            <tr>
              <th>Initial Transaction Date</th>
              <td>{data.initial_transaction_date ? new Date(data.initial_transaction_date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}</td>
            </tr>
            <tr>
              <th>Reason for Refund</th>
              <td>{data.reason_for_cancellation}</td>
            </tr>
          </tbody>
        </table>

        {/* Section 3 */}
        <div className="medical-form-section-head">Section 3: APPROVAL WORKFLOW & OFFICIAL SIGNATURES</div>
        <div className="medical-signature-grid">
          {/* Level 1: Cashier */}
          <div className="medical-signature-box">
            <div className="medical-signature-label">1. Initiated By</div>
            <div className="medical-signature-line">
              {data.creator_name}
            </div>
            <div className="medical-stamp-area">
               {new Date(data.created_at).toLocaleString()}
            </div>
          </div>
          
          {/* Level 2: Manager */}
          <div className="medical-signature-box">
            <div className="medical-signature-label">2. Verified By</div>
            <div className="medical-signature-line" style={{ color: data.verifier_name ? '#000' : '#cbd5e1' }}>
              {data.verifier_name || 'PENDING'}
            </div>
            <div className="medical-stamp-area">
              {data.verified_at ? new Date(data.verified_at).toLocaleDateString() : 'Official Verification'}
            </div>
          </div>

          {/* Level 3: COO */}
          <div className="medical-signature-box">
            <div className="medical-signature-label">3. Approved (COO)</div>
            <div className="medical-signature-line" style={{ color: data.approver_name ? '#000' : '#cbd5e1' }}>
              {data.approver_name || 'PENDING'}
            </div>
            <div className="medical-stamp-area">
              {data.approved_at ? new Date(data.approved_at).toLocaleDateString() : 'Final Authorization'}
            </div>
          </div>
        </div>

        {data.status === 'rejected' && (
          <div style={{ margin: '15pt', padding: '10pt', border: '2px solid #b91c1c', borderRadius: '4px', backgroundColor: '#fef2f2' }}>
            <div style={{ color: '#b91c1c', fontWeight: 800, fontSize: '8pt', textTransform: 'uppercase', marginBottom: '4px' }}>Request Rejected</div>
            <div style={{ fontWeight: 700, fontSize: '10pt' }}>Reason: {data.rejection_comment}</div>
            <div style={{ fontSize: '8pt', marginTop: '4px', opacity: 0.8 }}>Rejected by: {data.rejector_name}</div>
          </div>
        )}
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
