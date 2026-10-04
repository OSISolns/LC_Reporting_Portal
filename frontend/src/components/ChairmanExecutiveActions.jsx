import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  MessageSquare, AlertCircle, CheckCircle, Send,
  Shield, AlertTriangle, FileText, CornerDownRight, Check
} from 'lucide-react';
import {
  getExecutiveDirectives,
  postExecutiveDirective,
  respondToExecutiveDirective,
  resolveExecutiveDirective
} from '../api/executiveDirectives';
import Modal from './Modal';
import toast from 'react-hot-toast';

const ChairmanExecutiveActions = ({
  reportType = 'general',
  reportId = 'general',
  reportTitle = 'Executive Operational Report',
  targetDepartment = 'Operations'
}) => {
  const { user } = useAuth();
  const [directives, setDirectives] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form Modals / Action States
  const [isCommentModal, setIsCommentModal] = useState(false);
  const [isExplanationModal, setIsExplanationModal] = useState(false);
  const [activeRespondId, setActiveRespondId] = useState(null);

  // Form Inputs
  const [commentText, setCommentText] = useState('');
  const [explanationSubject, setExplanationSubject] = useState('');
  const [explanationText, setExplanationText] = useState('');
  const [explanationDept, setExplanationDept] = useState(targetDepartment);
  const [responseText, setResponseText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isExecutive = ['chairman', 'coo', 'deputy_coo', 'admin', 'medical_director', 'sales_manager'].includes(user?.role);
  const isChairman = user?.role === 'chairman';

  const fetchDirectives = async () => {
    try {
      setLoading(true);
      const res = await getExecutiveDirectives({ report_type: reportType, report_id: String(reportId) });
      if (res.success) {
        setDirectives(res.directives || []);
      }
    } catch (err) {
      console.error('Error loading executive directives:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDirectives();
  }, [reportType, reportId]);

  const handlePostDirective = async (type) => {
    const isQuery = type === 'call_for_explanation';
    const text = isQuery ? explanationText : commentText;
    if (!text.trim()) {
      toast.error('Please enter details before submitting.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await postExecutiveDirective({
        report_type: reportType,
        report_id: String(reportId),
        report_title: reportTitle,
        directive_type: type,
        subject: isQuery ? (explanationSubject || 'Formal Explanation Request') : 'Executive Note',
        content: text.trim(),
        target_department: isQuery ? explanationDept : targetDepartment
      });

      if (res.success) {
        toast.success(res.message);
        setCommentText('');
        setExplanationSubject('');
        setExplanationText('');
        setIsCommentModal(false);
        setIsExplanationModal(false);
        fetchDirectives();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record directive.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRespond = async (id) => {
    if (!responseText.trim()) {
      toast.error('Please enter your explanation response.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await respondToExecutiveDirective(id, responseText.trim());
      if (res.success) {
        toast.success('Explanation submitted successfully.');
        setResponseText('');
        setActiveRespondId(null);
        fetchDirectives();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit response.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolve = async (id, status = 'resolved') => {
    try {
      const res = await resolveExecutiveDirective(id, status);
      if (res.success) {
        toast.success(`Directive marked as ${status}.`);
        fetchDirectives();
      }
    } catch (err) {
      toast.error('Failed to update status.');
    }
  };

  return (
    <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '1.25rem', marginTop: '1.5rem', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
      {/* HEADER BAR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ backgroundColor: '#0f172a', padding: '6px 10px', borderRadius: '8px', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <Shield size={14} color="#fbbf24" /> Chairman & Executive Directives
          </div>
          <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
            {directives.length} Notes / Actions
          </span>
        </div>

        {/* EXECUTIVE ACTIONS BUTTONS */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {isExecutive && (
            <>
              <button
                onClick={() => setIsCommentModal(true)}
                className="btn btn-secondary"
                style={{ fontSize: '0.8rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
              >
                <MessageSquare size={14} /> Add Comment
              </button>
              <button
                onClick={() => setIsExplanationModal(true)}
                className="btn btn-primary"
                style={{ fontSize: '0.8rem', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, backgroundColor: '#c2410c', borderColor: '#9a3412', color: '#ffffff' }}
              >
                <AlertTriangle size={14} /> Call for Explanation
              </button>
            </>
          )}
        </div>
      </div>

      {/* DIRECTIVES THREAD LIST */}
      {loading ? (
        <div style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
          Loading executive notes...
        </div>
      ) : directives.length === 0 ? (
        <div style={{ padding: '1rem', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', fontStyle: 'italic' }}>
            No executive directives or calls for explanation posted for this report.
          </p>
          {isExecutive && (
            <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
              Chairman or Executives can post remarks or request formal clarification above.
            </p>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {directives.map((item) => {
            const isCall = item.directive_type === 'call_for_explanation';
            const isPending = item.status === 'pending';
            const isExplained = item.status === 'explained';
            const isResolved = item.status === 'resolved';

            return (
              <div
                key={item.id}
                style={{
                  backgroundColor: isCall ? '#fff7ed' : '#f8fafc',
                  border: `1px solid ${isCall ? '#ffedd5' : '#e2e8f0'}`,
                  borderRadius: '10px',
                  padding: '1rem'
                }}
              >
                {/* DIRECTIVE HEADER */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      backgroundColor: isCall ? '#ffedd5' : '#e2e8f0',
                      color: isCall ? '#c2410c' : '#475569'
                    }}>
                      {isCall ? '🚨 Call for Explanation' : '💬 Executive Note'}
                    </span>
                    <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.9rem' }}>
                      {item.author_name} ({item.author_role?.toUpperCase()})
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      • {new Date(item.created_at).toLocaleString()}
                    </span>
                  </div>

                  {/* STATUS BADGE */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {isCall && (
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        backgroundColor: isResolved ? '#f0fdf4' : isExplained ? '#e0f2fe' : '#fef2f2',
                        color: isResolved ? '#15803d' : isExplained ? '#0369a1' : '#991b1b',
                        border: `1px solid ${isResolved ? '#bbf7d0' : isExplained ? '#bae6fd' : '#fecaca'}`
                      }}>
                        {isResolved ? '✓ Resolved' : isExplained ? 'Explanation Provided' : 'Pending Response'}
                      </span>
                    )}
                    {isExecutive && !isResolved && (
                      <button
                        onClick={() => handleResolve(item.id, 'resolved')}
                        style={{ background: 'none', border: 'none', color: '#16a34a', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}
                      >
                        <Check size={13} /> Mark Resolved
                      </button>
                    )}
                  </div>
                </div>

                {/* SUBJECT & CONTENT */}
                {item.subject && (
                  <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#1e293b', marginBottom: '4px' }}>
                    Subject: {item.subject}
                  </div>
                )}
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#334155', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                  {item.content}
                </p>

                {/* EXPLANATION RESPONSE (IF SUBMITTED) */}
                {item.explanation_response && (
                  <div style={{ marginTop: '10px', padding: '10px 12px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 800, color: '#0369a1', marginBottom: '4px' }}>
                      <CornerDownRight size={14} /> Official Explanation Response by {item.explained_by_name} ({item.explained_by_role?.toUpperCase()})
                      <span style={{ color: '#94a3b8', fontWeight: 500 }}>
                        • {new Date(item.explained_at).toLocaleString()}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#334155', fontStyle: 'italic', lineHeight: 1.4 }}>
                      "{item.explanation_response}"
                    </p>
                  </div>
                )}

                {/* RESPOND FORM TOGGLE FOR STAFF / DEPT HEADS */}
                {isCall && !item.explanation_response && activeRespondId !== item.id && (
                  <div style={{ marginTop: '10px' }}>
                    <button
                      onClick={() => setActiveRespondId(item.id)}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.75rem', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}
                    >
                      <CornerDownRight size={12} /> Submit Department Explanation
                    </button>
                  </div>
                )}

                {/* INLINE EXPLANATION FORM */}
                {activeRespondId === item.id && (
                  <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #93c5fd' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
                      Official Explanation / Clarification:
                    </label>
                    <textarea
                      className="input"
                      style={{ width: '100%', height: '60px', fontSize: '0.85rem', marginBottom: '8px' }}
                      placeholder="Enter detailed departmental explanation in response to Chairman query..."
                      value={responseText}
                      onChange={(e) => setResponseText(e.target.value)}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                        onClick={() => { setActiveRespondId(null); setResponseText(''); }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ fontSize: '0.75rem', padding: '4px 12px' }}
                        disabled={submitting}
                        onClick={() => handleRespond(item.id)}
                      >
                        Submit Response
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: ADD COMMENT */}
      {isCommentModal && (
        <Modal isOpen={true} title="Add Executive Comment" onClose={() => setIsCommentModal(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
              Post an executive note or comment on report: <strong>{reportTitle}</strong>.
            </p>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Comment / Note</label>
              <textarea
                className="input"
                style={{ width: '100%', height: '100px', fontSize: '0.875rem' }}
                placeholder="Enter executive guidance, commendation, or observation..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button className="btn btn-secondary" onClick={() => setIsCommentModal(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={submitting} onClick={() => handlePostDirective('comment')}>Post Note</button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL: CALL FOR EXPLANATION */}
      {isExplanationModal && (
        <Modal isOpen={true} title="🚨 Call for Explanation (Executive Query)" onClose={() => setIsExplanationModal(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ backgroundColor: '#fff7ed', padding: '10px 12px', borderRadius: '8px', border: '1px solid #ffedd5', display: 'flex', gap: '10px' }}>
              <AlertTriangle size={20} color="#c2410c" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '0.85rem', color: '#9a3412', lineHeight: 1.4 }}>
                <strong>Formal Action:</strong> Submitting a Call for Explanation dispatches an urgent notification to department leads requiring a recorded response on record.
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Target Department</label>
              <input
                type="text"
                className="input"
                style={{ width: '100%' }}
                value={explanationDept}
                onChange={(e) => setExplanationDept(e.target.value)}
                placeholder="e.g. Operations, Logistics, Nursing, Finance"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Query Subject / Topic</label>
              <input
                type="text"
                className="input"
                style={{ width: '100%' }}
                value={explanationSubject}
                onChange={(e) => setExplanationSubject(e.target.value)}
                placeholder="e.g. Clarification on Q3 Equipment Downtime Variance"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Explanation Request Details</label>
              <textarea
                className="input"
                style={{ width: '100%', height: '110px', fontSize: '0.875rem' }}
                placeholder="State the exact issue, metric, or event requiring departmental explanation..."
                value={explanationText}
                onChange={(e) => setExplanationText(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button className="btn btn-secondary" onClick={() => setIsExplanationModal(false)}>Cancel</button>
              <button
                className="btn btn-primary"
                style={{ backgroundColor: '#c2410c', borderColor: '#9a3412' }}
                disabled={submitting}
                onClick={() => handlePostDirective('call_for_explanation')}
              >
                Submit Call for Explanation
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ChairmanExecutiveActions;
