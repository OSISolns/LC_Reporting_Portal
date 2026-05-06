import { FileText, User, Calendar, Hash, CheckCircle, XCircle, Download, Clock } from 'lucide-react';
import { useState } from 'react';
import StatusBadge from '../../../components/StatusBadge';
import { useAuth } from '../../../context/AuthContext';
import { PrintHeader, PrintFooter, PrintWatermark } from '../../../components/PrintBranding';

const labelStyle = { fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.05em' };
const valueStyle = { fontSize: '1rem', color: 'var(--primary-dark)', fontWeight: 600 };
const boxStyle   = { padding: '1.25rem', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #f1f5f9' };

const ResultTransferDetailsView = ({ data, onReview, onApprove, onReject, onExport }) => {
  const { user, hasPermission } = useAuth();
  const [rejectMode, setRejectMode] = useState(false);
  const [approveMode, setApproveMode] = useState(false);
  const [rejectionComment, setRejectionComment] = useState('');
  const [editedByName, setEditedByName] = useState('');

  if (!data) return null;

  const isOperations = hasPermission('results_transfer', 'review');
  const isLabLead    = hasPermission('results_transfer', 'approve');

  return (
    <div className="print-body-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', position: 'relative' }}>
      <PrintHeader 
        title="Results Transfer Authorization" 
        docType="RST" 
        docId={data.id} 
        issuedAt={data.approved_at || data.reviewed_at || data.created_at} 
      />
      <PrintWatermark />
      
      {/* Header Info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', backgroundColor: 'rgba(0,123,138,0.1)', color: '#007B8A', borderRadius: '12px' }}>
            <FileText size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Request ID: #{data.id}</div>
            <StatusBadge status={data.status} />
          </div>
        </div>
        <button onClick={onExport} 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            padding: '0.6rem 1.25rem', 
            backgroundColor: 'rgba(0,123,138,0.05)', 
            color: '#007B8A', 
            border: '1.5px solid rgba(0,123,138,0.2)', 
            borderRadius: '12px', 
            fontWeight: 700, 
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#007B8A';
            e.currentTarget.style.color = '#ffffff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(0,123,138,0.05)';
            e.currentTarget.style.color = '#007B8A';
          }}
        >
          <Download size={18} /> Export PDF
        </button>
      </div>

      {/* Grid Details */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
        <div style={boxStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem', color: '#007B8A' }}>
            <Calendar size={18} />
            <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700 }}>Time Information</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div><div style={labelStyle}>Transfer Date</div><div style={valueStyle}>{new Date(data.transfer_date).toDateString()}</div></div>
            <div><div style={labelStyle}>Submitted At</div><div style={valueStyle}>{new Date(data.created_at).toLocaleString()}</div></div>
          </div>
        </div>

        <div style={boxStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem', color: '#007B8A' }}>
            <Hash size={18} />
            <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700 }}>SID Reference</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div><div style={labelStyle}>Old SID</div><div style={{ ...valueStyle, color: 'var(--danger)' }}>{data.old_sid}</div></div>
            <div><div style={labelStyle}>New SID</div><div style={{ ...valueStyle, color: '#059669' }}>{data.new_sid}</div></div>
          </div>
        </div>

        <div style={{ ...boxStyle, gridColumn: 'span 2' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem', color: '#007B8A' }}>
            <User size={18} />
            <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700 }}>Workflow Participants</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
            <div><div style={labelStyle}>Initiated By</div><div style={valueStyle}>{data.creator_name}</div></div>
            <div><div style={labelStyle}>Verified By</div><div style={valueStyle}>{data.reviewer_name || '...'}</div></div>
            <div><div style={labelStyle}>Approved By</div><div style={valueStyle}>{data.approver_name || '...'}</div></div>
          </div>
        </div>

        <div style={{ ...boxStyle, gridColumn: 'span 2' }}>
          <div style={labelStyle}>Reason for Transfer</div>
          <div style={{ ...valueStyle, fontWeight: 500, lineHeight: 1.6 }}>{data.reason}</div>
        </div>

        {data.edited_by_name && (
          <div style={{ ...boxStyle, gridColumn: 'span 2', backgroundColor: 'rgba(5, 150, 105, 0.05)', borderColor: 'rgba(5, 150, 105, 0.1)' }}>
            <div style={labelStyle}>Laboratory Execution (Edited By)</div>
            <div style={{ ...valueStyle, color: '#059669' }}>{data.edited_by_name}</div>
          </div>
        )}

        {data.status === 'rejected' && (
          <div style={{ ...boxStyle, gridColumn: 'span 2', backgroundColor: '#fff1f2', borderColor: '#fee2e2' }}>
            <div style={{ ...labelStyle, color: '#b91c1c' }}>Rejection Comment</div>
            <div style={{ ...valueStyle, color: '#991b1b', fontStyle: 'italic' }}>"{data.rejection_comment}"</div>
          </div>
        )}
      </div>

      {/* Action Section */}
      {!rejectMode && !approveMode && (
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          {data.status === 'pending' && isOperations && (
            <>
              <button onClick={() => setRejectMode(true)}
                style={{ flex: 1, padding: '1rem', backgroundColor: 'rgba(220, 38, 38, 0.1)', color: '#b91c1c', border: 'none', borderRadius: '14px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(220, 38, 38, 0.2)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(220, 38, 38, 0.1)'}
              >
                <XCircle size={18} /> Reject
              </button>
              <button onClick={onReview}
                style={{ flex: 2, padding: '1rem', backgroundColor: '#007B8A', color: '#ffffff', border: 'none', borderRadius: '14px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 6px -1px rgba(0,123,138,0.2)', transition: 'all 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <CheckCircle size={18} /> Confirm Verification
              </button>
            </>
          )}

          {data.status === 'reviewed' && isLabLead && (
            <>
               <button onClick={() => setRejectMode(true)}
                style={{ flex: 1, padding: '1rem', backgroundColor: 'rgba(220, 38, 38, 0.1)', color: '#b91c1c', border: 'none', borderRadius: '14px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(220, 38, 38, 0.2)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(220, 38, 38, 0.1)'}
              >
                <XCircle size={18} /> Reject
              </button>
              <button onClick={() => setApproveMode(true)}
                style={{ flex: 2, padding: '1rem', backgroundColor: '#059669', color: '#ffffff', border: 'none', borderRadius: '14px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 6px -1px rgba(5, 150, 105, 0.2)', transition: 'all 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <CheckCircle size={18} /> Approve & Transfer
              </button>
            </>
          )}
        </div>
      )}

      {/* Approval Input Mode */}
      {approveMode && (
        <div style={{ padding: '1.5rem', backgroundColor: '#f0fdf4', border: '2px solid #bbf7d0', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h4 style={{ margin: 0, color: '#166534', fontWeight: 700 }}>Laboratory Signature Required</h4>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#15803d' }}>Please enter the name of the technician who edited the results in the system.</p>
          <input 
            type="text" 
            placeholder="Edited By Name..." 
            value={editedByName}
            onChange={(e) => setEditedByName(e.target.value)}
            style={{ padding: '12px', borderRadius: '8px', border: '1.5px solid #86efac', outline: 'none' }}
          />
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button onClick={() => setApproveMode(false)} style={{ flex: 1, padding: '0.75rem', background: 'rgba(21, 128, 61, 0.1)', border: 'none', borderRadius: '10px', color: '#15803d', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
            <button 
              onClick={() => onApprove(editedByName)} 
              disabled={!editedByName.trim()}
              style={{ flex: 2, padding: '0.75rem', backgroundColor: '#166534', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: editedByName.trim() ? 'pointer' : 'not-allowed', opacity: editedByName.trim() ? 1 : 0.6, boxShadow: '0 4px 6px -1px rgba(22, 101, 52, 0.2)' }}
            >
              Complete Approval
            </button>
          </div>
        </div>
      )}

      {/* Reject Mode */}
      {rejectMode && (
        <div style={{ padding: '1.5rem', backgroundColor: '#fff1f2', border: '2px solid #fecaca', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h4 style={{ margin: 0, color: '#991b1b', fontWeight: 700 }}>Rejection Reason</h4>
          <textarea 
            placeholder="Please provide a reason for rejecting this transfer..." 
            rows="3"
            value={rejectionComment}
            onChange={(e) => setRejectionComment(e.target.value)}
            style={{ padding: '12px', borderRadius: '8px', border: '1.5px solid #fca5a5', outline: 'none', resize: 'none' }}
          />
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button onClick={() => setRejectMode(false)} style={{ flex: 1, padding: '0.75rem', background: 'rgba(153, 27, 27, 0.1)', border: 'none', borderRadius: '10px', color: '#991b1b', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
            <button 
              onClick={() => onReject(rejectionComment)} 
              disabled={!rejectionComment.trim()}
              style={{ flex: 2, padding: '0.75rem', backgroundColor: '#991b1b', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: rejectionComment.trim() ? 'pointer' : 'not-allowed', opacity: rejectionComment.trim() ? 1 : 0.6, boxShadow: '0 4px 6px -1px rgba(153, 27, 27, 0.2)' }}
            >
              Confirm Rejection
            </button>
          </div>
        </div>
      )}
      <PrintFooter />
    </div>
  );
};

export default ResultTransferDetailsView;
