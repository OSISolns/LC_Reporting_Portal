import { useState } from 'react';
import { AlertCircle, MapPin, Users, FileText, Calendar, Download, ShieldCheck, CheckCircle, MessageSquare } from 'lucide-react';
import { PrintHeader, PrintFooter, PrintWatermark } from '../../../components/PrintBranding';
import { useAuth } from '../../../context/AuthContext';
import { reviewIncident } from '../../../api/incidents';

const IncidentDetailsView = ({ data, onReviewComplete, onExport }) => {
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
    } catch (err) {
      alert('Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isQA = user?.role === 'quality_assurance';
  const isPending = data.status === 'pending';

  return (
    <div className="print-body-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', position: 'relative' }}>
      <PrintHeader title="Incident & Sentinel Event Report" docType="INC" docId={data.id} />
      <PrintWatermark />

      {data.status === 'reviewed' && (
        <div className="medical-stamp">
          <img src="/stamps/verified.png" alt="VERIFIED" />
        </div>
      )}

      <div className="medical-form-modern">
        {/* Section 1 */}
        <div className="medical-form-section-head">Section 1: INCIDENT IDENTIFICATION</div>
        <table className="medical-form-table">
          <tbody>
            <tr>
              <th>Date of Report</th>
              <td>{new Date(data.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</td>
            </tr>
            <tr>
              <th>Incident Type</th>
              <td style={{ fontWeight: 800, color: '#b91c1c' }}>{data.incident_type}</td>
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
              <td>{data.pid_number || 'N/A'}</td>
            </tr>
          </tbody>
        </table>

        {/* Section 2 */}
        <div className="medical-form-section-head">Section 2: NARRATIVE ANALYSIS & PREVENTION</div>
        <table className="medical-form-table">
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
                <th>QA Reviewer Comments</th>
                <td style={{ backgroundColor: '#f8fafc', fontStyle: 'italic', fontWeight: 500, color: '#003B44' }}>
                  {data.review_comments || 'Verified for clinical standards compliance.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Section 3 */}
        <div className="medical-form-section-head">Section 3: AUTHORIZATION & OFFICIAL SIGNATURES</div>
        <div className="medical-signature-grid">
          <div className="medical-signature-box">
            <div className="medical-signature-label">Reported By</div>
            <div className="medical-signature-line">
              {data.creator_name}
            </div>
            <div className="medical-stamp-area">
              Digital ID: {data.creator_id || 'REGISTERED_STAFF'}
            </div>
          </div>

          <div className="medical-signature-box">
            <div className="medical-signature-label">Date of Entry</div>
            <div className="medical-signature-line">
              {new Date(data.created_at).toLocaleDateString()}
            </div>
            <div className="medical-stamp-area">
              Time: {new Date(data.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>

          <div className="medical-signature-box">
            <div className="medical-signature-label">Quality & Assurance</div>
            <div className="medical-signature-line" style={{ color: data.status === 'reviewed' ? '#003B44' : '#cbd5e1' }}>
              {data.status === 'reviewed' ? `SIGNED: ${data.reviewer_name}` : 'PENDING'}
            </div>
            <div className="medical-stamp-area">
              Official Review Date
            </div>
          </div>
        </div>
      </div>

      {/* Action Panel - Simplified */}
      <div className="no-print" style={{
        marginTop: '1.5rem',
        padding: '1.5rem',
        backgroundColor: '#f8fafc',
        borderRadius: '12px',
        border: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem'
      }}>
        {((isQA && isPending) || reviewing || !isPending) && (
          <div style={{
            display: reviewing ? 'block' : 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
            paddingBottom: '1rem',
            borderBottom: '1px solid #e2e8f0'
          }}>
            {reviewing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary-dark)' }}>
                  <MessageSquare size={18} />
                  Add Quality & Accreditation Comments (Optional)
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
        )}

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={() => onExport && onExport()}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.75rem 1.25rem', backgroundColor: '#ffffff', color: 'var(--primary-dark)', border: '1.5px solid var(--border-color)', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
          >
            <Download size={18} />
            Download PDF
          </button>
        </div>
      </div>
      <PrintFooter />
    </div>
  );
};

export default IncidentDetailsView;

