import { useState } from 'react';
import { AlertCircle, MapPin, Users, FileText, Calendar, Download, ShieldCheck, CheckCircle, MessageSquare } from 'lucide-react';
import { PrintHeader, PrintFooter, PrintWatermark } from '../../../components/PrintBranding';
import { useAuth } from '../../../context/AuthContext';
import { reviewIncident } from '../../../api/incidents';

const IncidentDetailsView = ({ data, onExport, onReviewComplete }) => {
  const { user } = useAuth();
  const [reviewing, setReviewing] = useState(false);
  const [comments, setComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!data) return null;

  const handleReview = async () => {
    setIsSubmitting(true);
    try {
      await reviewIncident(data.id, comments);
      if (onReviewComplete) onReviewComplete();
      setReviewing(false);
      // We need to refresh the local data or the parent will refresh
    } catch (err) {
      alert('Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isQA = user?.role === 'quality_assurance';
  const isPending = data.status === 'pending';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', position: 'relative' }}>
      <PrintHeader title="Incident & Sentinel Event Report" docType="INC" docId={data.id} />
      <PrintWatermark />
      <div className="official-form-container">
        <h1 style={{ textAlign: 'center', textDecoration: 'underline', marginBottom: '2rem', fontSize: '1.5rem', fontWeight: 800 }}>INCIDENT & SENTINEL EVENT REPORT</h1>
        
        <div style={{ marginBottom: '2rem', fontWeight: 700 }}>
          DATE OF REPORT: <span style={{ textDecoration: 'underline', marginLeft: '10px' }}>{new Date(data.created_at).toLocaleDateString()}</span>
        </div>

        {/* Section 1 */}
        <h3 className="official-form-section-title">Section 1: INCIDENT IDENTIFICATION</h3>
        <table className="official-form-table">
          <tbody>
            <tr>
              <th>Incident Type</th>
              <td style={{ fontWeight: 700, color: 'var(--danger)' }}>{data.incident_type}</td>
            </tr>
            <tr>
              <th>Department / Unit</th>
              <td>{data.department}</td>
            </tr>
            <tr>
              <th>Area of Incident</th>
              <td>{data.area_of_incident}</td>
            </tr>
            <tr>
              <th>Individuals Involved</th>
              <td>{data.names_involved}</td>
            </tr>
            <tr>
              <th>Patient PID (if applicable)</th>
              <td>{data.pid_number || '---'}</td>
            </tr>
          </tbody>
        </table>

        {/* Section 2 */}
        <h3 className="official-form-section-title">Section 2: INCIDENT NARRATIVE & ANALYSIS</h3>
        <table className="official-form-table">
          <tbody>
            <tr>
              <th>Description of Event</th>
              <td>{data.description}</td>
            </tr>
            <tr>
              <th>Contributing Factors</th>
              <td>{data.contributing_factors}</td>
            </tr>
            <tr>
              <th>Immediate Actions Taken</th>
              <td>{data.immediate_actions}</td>
            </tr>
            <tr>
              <th>Prevention Measures</th>
              <td>{data.prevention_measures}</td>
            </tr>
            {data.status === 'reviewed' && (
              <tr>
                <th>Reviewer Comments</th>
                <td style={{ backgroundColor: '#f0fdf4', color: '#166534', fontStyle: 'italic' }}>
                  {data.review_comments || 'Reviewed and confirmed as accurate.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Section 3 */}
        <h3 className="official-form-section-title">Section 3: REPORT ATTRIBUTION</h3>
        <div className="signature-block">
          <div className="signature-line">
            <span className="signature-label">Reported by:</span>
            <span className="signature-value">{data.creator_name || 'System User'}</span>
            <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>@ {new Date(data.created_at).toLocaleString()}</span>
          </div>
          <div className="signature-line" style={{ marginTop: '1rem', borderBottom: data.status === 'reviewed' ? '1px solid #000' : '1px dashed #ccc' }}>
            <span className="signature-label">Quality Assurance Review:</span>
            <span className="signature-value" style={{ color: data.status === 'reviewed' ? 'var(--primary-dark)' : 'transparent' }}>
              {data.status === 'reviewed' ? `SIGNED: ${data.reviewer_name || 'Quality Officer'}` : '__________________________'}
            </span>
            <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>
              Date: {data.status === 'reviewed' ? new Date(data.reviewed_at).toLocaleDateString() : '___/___/2026'}
            </span>
          </div>
        </div>
      </div>

      {/* Action Panel */}
      <div className="no-print" style={{ 
        marginTop: '1rem', 
        padding: '1.5rem', 
        backgroundColor: '#f8fafc', 
        borderRadius: '12px', 
        border: '1px solid var(--border-color)',
        display: reviewing ? 'block' : 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1rem'
      }}>
        {reviewing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary-dark)' }}>
              <MessageSquare size={18} />
              Add Quality Assurance Comments (Optional)
            </div>
            <textarea 
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Enter any feedback or confirmation details..."
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1.5px solid var(--border-color)', minHeight: '100px', outline: 'none' }}
            />
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={handleReview}
                disabled={isSubmitting}
                style={{ padding: '0.75rem 1.5rem', backgroundColor: '#07896b', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                {isSubmitting ? 'Submitting...' : <><CheckCircle size={18} /> Confirm & Sign Report</>}
              </button>
              <button 
                onClick={() => setReviewing(false)}
                style={{ padding: '0.75rem 1.5rem', backgroundColor: '#e2e8f0', color: 'var(--text-primary)', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button 
                onClick={onExport}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.75rem 1.25rem', backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
              >
                <Download size={18} />
                Download PDF
              </button>
              <button 
                onClick={() => window.print()}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.75rem 1.25rem', backgroundColor: 'white', color: 'var(--primary-dark)', border: '1.5px solid var(--border-color)', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
              >
                <ShieldCheck size={18} />
                Print Requisition
              </button>
            </div>
            
            {isQA && isPending && (
              <button 
                onClick={() => setReviewing(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.75rem 1.5rem', backgroundColor: '#07896b', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(7, 137, 107, 0.2)' }}
              >
                <CheckCircle size={18} />
                Review & Confirm
              </button>
            )}

            {!isPending && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#07896b', fontWeight: 700, backgroundColor: 'rgba(7, 137, 107, 0.1)', padding: '8px 16px', borderRadius: '20px' }}>
                <CheckCircle size={18} />
                Officially Reviewed
              </div>
            )}
          </>
        )}
      </div>
      <PrintFooter />
    </div>
  );
};



export default IncidentDetailsView;
