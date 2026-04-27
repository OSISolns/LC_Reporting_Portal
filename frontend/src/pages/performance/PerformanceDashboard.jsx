import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getMyScore, getAllScores, getAllRatings, getSeverityStats, submitRating, getRatingsForStaff, getUnratedRequests } from '../../api/performance';
import { Shield, Users, AlertTriangle, TrendingDown, Star, ChevronRight, Check, Info } from 'lucide-react';
import LoadingSpinner from '../../components/LoadingSpinner';
import Modal from '../../components/Modal';

const PerformanceDashboard = () => {
  const { user, hasPermission } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const isManager = hasPermission('staff_performance', 'view') && user?.role !== 'cashier' && user?.role !== 'customer_care';

  const [scores, setScores] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedRating, setSelectedRating] = useState(null);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [staffRatings, setStaffRatings] = useState([]);
  
  const [isRateModalOpen, setIsRateModalOpen] = useState(false);
  const [ratingForm, setRatingForm] = useState({
    staffUserId: '',
    requestType: '',
    requestId: '',
    reason: '',
    severity: 1,
    note: ''
  });
  const [unratedRequests, setUnratedRequests] = useState([]);
  const [reasonsLoading, setReasonsLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (isManager) {
        const [scoresRes, ratingsRes, statsRes] = await Promise.all([
          getAllScores(),
          getAllRatings(),
          getSeverityStats()
        ]);
        setScores(scoresRes.data.data || []);
        setRatings(ratingsRes.data.data || []);
        setStats(statsRes.data.data?.stats || []);
      } else {
        const myScoreRes = await getMyScore();
        if (myScoreRes.data.data.score) setScores([myScoreRes.data.data.score]);
        if (myScoreRes.data.data.ratings) setRatings(myScoreRes.data.data.ratings);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    // Check for query params to auto-open rate modal
    const staffId = searchParams.get('staffId');
    const type = searchParams.get('type');
    const requestId = searchParams.get('requestId');
    
    if (staffId && type && requestId) {
      setRatingForm(prev => ({
        ...prev,
        staffUserId: staffId,
        requestType: type,
        requestId: requestId
      }));
      setIsRateModalOpen(true);
      // Clear params so it doesn't reopen on refresh
      setSearchParams({}, { replace: true });
    }
  }, []);

  const handleStaffClick = async (staff) => {
    try {
      setSelectedStaff(staff);
      const res = await getRatingsForStaff(staff.user_id);
      setStaffRatings(res.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (ratingForm.staffUserId && ratingForm.requestType && ratingForm.requestType !== 'general') {
      setReasonsLoading(true);
      getUnratedRequests(ratingForm.staffUserId, ratingForm.requestType)
        .then(res => {
          setUnratedRequests(res.data.data || []);
          setReasonsLoading(false);
        })
        .catch(err => {
          console.error(err);
          setReasonsLoading(false);
        });
    } else {
      setUnratedRequests([]);
    }
  }, [ratingForm.staffUserId, ratingForm.requestType]);

  useEffect(() => {
    if (ratingForm.requestId && unratedRequests.length > 0) {
      const match = unratedRequests.find(r => r.id.toString() === ratingForm.requestId.toString().trim());
      if (match) {
        setRatingForm(prev => {
          if (prev.reason !== match.reason) {
            return { ...prev, reason: match.reason || '' };
          }
          return prev;
        });
      }
    }
  }, [unratedRequests, ratingForm.requestId]);

  const handleRateSubmit = async (e) => {
    e.preventDefault();
    try {
      await submitRating(ratingForm);
      setIsRateModalOpen(false);
      setRatingForm({
        staffUserId: '',
        requestType: '',
        requestId: '',
        reason: '',
        severity: 1,
        note: ''
      });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit rating');
    }
  };

  if (loading) return <LoadingSpinner />;

  if (!isManager) {
    const myScore = scores[0] || { score: 100, warnings: 0 };
    return (
      <div style={{ paddingBottom: '2rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ margin: 0, fontSize: '2.25rem', fontWeight: 800, color: 'var(--primary-dark)' }}>My Performance</h1>
          <p style={{ margin: '8px 0 0', color: 'var(--text-secondary)' }}>Review your personal performance score and feedback history.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '20px', border: '1px solid #e2e8f0', padding: '2rem', textAlign: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <h3 style={{ margin: '0 0 1rem', color: 'var(--text-secondary)' }}>Current Score</h3>
            <div style={{ fontSize: '5rem', fontWeight: 800, color: myScore.score < 80 ? '#dc2626' : myScore.score < 95 ? '#d97706' : '#10b981', lineHeight: 1 }}>
              {Number(myScore.score).toFixed(1)}
            </div>
            <p style={{ margin: '1rem 0 0', fontWeight: 700, color: '#d97706' }}>{myScore.warnings} Warnings</p>
          </div>

          <div style={{ backgroundColor: '#fff', borderRadius: '20px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #f1f5f9', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <TrendingDown size={20} style={{ color: '#dc2626' }} />
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary-dark)' }}>My Feedback History</h3>
            </div>
            <div style={{ padding: '1rem', maxHeight: '400px', overflowY: 'auto' }}>
              {ratings.map((r, i) => (
                <div 
                  key={r.id} 
                  onClick={() => setSelectedRating(r)}
                  style={{ padding: '12px', borderBottom: i !== ratings.length - 1 ? '1px solid #f1f5f9' : 'none', cursor: 'pointer', transition: 'background-color 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--primary-dark)' }}>{r.request_type ? r.request_type.charAt(0).toUpperCase() + r.request_type.slice(1) : 'General'} - {new Date(r.created_at).toLocaleDateString()}</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: r.severity >= 4 ? '#dc2626' : r.severity === 3 ? '#d97706' : '#10b981' }}>Sev: {r.severity}/10</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{r.reason}</p>
                  {r.points_deducted > 0 && <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#dc2626', fontWeight: 700 }}>-{r.points_deducted} points</p>}
                </div>
              ))}
              {ratings.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem 0' }}>No feedback recorded yet. Great job!</p>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '2.25rem', fontWeight: 800, color: 'var(--primary-dark)' }}>Staff Performance</h1>
          <p style={{ margin: '8px 0 0', color: 'var(--text-secondary)' }}>Monitor and rate staff metrics for cancellations and refunds.</p>
        </div>
        {hasPermission('staff_performance', 'create') && (
          <button 
            onClick={() => setIsRateModalOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', backgroundColor: '#003b44', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(0, 59, 68, 0.2)' }}
          >
            <Star size={18} /> Rate Staff Member
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Scores List */}
        <div style={{ backgroundColor: '#fff', borderRadius: '20px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid #f1f5f9', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users size={20} style={{ color: 'var(--primary)' }} />
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary-dark)' }}>Staff Scores</h3>
          </div>
          <div style={{ padding: '1rem' }}>
            {scores.map((s, i) => (
              <div 
                key={s.id} 
                onClick={() => handleStaffClick(s)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', borderBottom: i !== scores.length - 1 ? '1px solid #f1f5f9' : 'none', cursor: 'pointer', transition: 'background-color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div>
                  <p style={{ margin: 0, fontWeight: 700, color: 'var(--primary-dark)' }}>{s.full_name}</p>
                  <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{s.role}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  {s.warnings > 0 && (
                     <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#d97706', backgroundColor: '#fffbeb', padding: '2px 8px', borderRadius: '99px' }}>{s.warnings} Warn</span>
                  )}
                  <span style={{ fontSize: '1.25rem', fontWeight: 800, color: s.score < 80 ? '#dc2626' : s.score < 95 ? '#d97706' : '#10b981' }}>{Number(s.score).toFixed(1)}</span>
                </div>
              </div>
            ))}
            {scores.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem 0' }}>No scores generated yet.</p>}
          </div>
        </div>

        {/* Recent Ratings */}
        <div style={{ backgroundColor: '#fff', borderRadius: '20px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid #f1f5f9', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <TrendingDown size={20} style={{ color: '#dc2626' }} />
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary-dark)' }}>Recent Ratings</h3>
          </div>
          <div style={{ padding: '1rem' }}>
            {ratings.slice(0, 10).map((r, i) => (
              <div 
                key={r.id} 
                onClick={() => setSelectedRating(r)}
                style={{ padding: '12px', borderBottom: i !== Math.min(ratings.length, 10) - 1 ? '1px solid #f1f5f9' : 'none', cursor: 'pointer', transition: 'background-color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--primary-dark)' }}>{r.staff_name}</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: r.severity >= 4 ? '#dc2626' : r.severity === 3 ? '#d97706' : '#10b981' }}>Sev: {r.severity}/10</span>
                </div>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{r.reason}</p>
                {r.points_deducted > 0 && <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#dc2626', fontWeight: 700 }}>-{r.points_deducted} points</p>}
              </div>
            ))}
            {ratings.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem 0' }}>No ratings recorded yet.</p>}
          </div>
        </div>
      </div>

      {/* Rate Staff Modal */}
      <Modal isOpen={isRateModalOpen} onClose={() => setIsRateModalOpen(false)} title="Rate Staff Performance" maxWidth="600px">
        <form onSubmit={handleRateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '0.9rem', color: 'var(--primary-dark)' }}>Staff Member</label>
            <select 
              required
              value={ratingForm.staffUserId} 
              onChange={e => setRatingForm({...ratingForm, staffUserId: e.target.value, requestId: '', reason: ''})}
              style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', outline: 'none' }}
            >
              <option value="">Select Staff...</option>
              {scores.map(s => (
                <option key={s.user_id} value={s.user_id}>{s.full_name} ({s.role})</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '0.9rem', color: 'var(--primary-dark)' }}>Context</label>
            <select 
              required
              value={ratingForm.requestType} 
              onChange={e => setRatingForm({...ratingForm, requestType: e.target.value, requestId: '', reason: ''})}
              style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', outline: 'none' }}
            >
              <option value="" disabled>Select Context...</option>
              <option value="cancellation">Cancellation</option>
              <option value="refund">Refund</option>
            </select>
          </div>

          {/* ── Pending Requests Picker ─────────────────────────────── */}
          {ratingForm.staffUserId && ratingForm.requestType && ratingForm.requestType !== 'general' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--primary-dark)' }}>
                  Select {ratingForm.requestType === 'refund' ? 'Refund' : 'Cancellation'} Request <span style={{ color: '#dc2626' }}>*</span>
                </label>
                {reasonsLoading && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>Loading...</span>
                )}
              </div>

              {reasonsLoading ? (
                <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  Fetching pending requests...
                </div>
              ) : unratedRequests.length === 0 ? (
                <div style={{ padding: '16px', backgroundColor: '#f0fdf4', borderRadius: '10px', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Check size={18} style={{ color: '#16a34a', flexShrink: 0 }} />
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: '#15803d' }}>No pending requests to rate</p>
                    <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#166534' }}>All {ratingForm.requestType} requests for this cashier have already been reviewed.</p>
                  </div>
                </div>
              ) : (
                <select
                  required
                  value={ratingForm.requestId}
                  onChange={e => {
                    const req = unratedRequests.find(r => r.id.toString() === e.target.value);
                    setRatingForm({ ...ratingForm, requestId: e.target.value, reason: req ? req.reason || '' : '' });
                  }}
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '2px solid #0369a1', backgroundColor: '#f0f9ff', outline: 'none', color: '#0c4a6e', fontWeight: 600, fontSize: '0.9rem' }}
                >
                  <option value="">— Select a request ({unratedRequests.length} pending) —</option>
                  {unratedRequests.map(r => (
                    <option key={r.id} value={r.id}>
                      #{r.id} — {r.reason ? (r.reason.length > 70 ? r.reason.substring(0, 70) + '…' : r.reason) : 'No reason provided'}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* ── Auto-filled reason preview ──────────────────────────── */}
          {ratingForm.requestId && ratingForm.reason && (
            <div style={{ padding: '12px', backgroundColor: '#f0f9ff', borderRadius: '10px', border: '1px solid #bae6fd' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 700, fontSize: '0.78rem', color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Reason on Request #{ratingForm.requestId}
              </label>
              <div style={{ fontSize: '0.95rem', color: '#0c4a6e', fontWeight: 500, lineHeight: 1.5 }}>
                {ratingForm.reason}
              </div>
            </div>
          )}

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
              <span>3: Warning</span>
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
            <button type="button" onClick={() => setIsRateModalOpen(false)} style={{ flex: 1, padding: '14px', backgroundColor: '#f1f5f9', color: 'var(--primary-dark)', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
          </div>
        </form>
      </Modal>

      {/* Rating Details Modal */}
      <Modal isOpen={!!selectedRating} onClose={() => setSelectedRating(null)} title="Rating Details" maxWidth="500px">
        {selectedRating && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px', fontSize: '0.9rem' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Date:</span>
              <span style={{ color: 'var(--primary-dark)', fontWeight: 500 }}>{new Date(selectedRating.created_at).toLocaleString()}</span>
              
              {isManager && (
                <>
                  <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Staff Member:</span>
                  <span style={{ color: 'var(--primary-dark)', fontWeight: 500 }}>{selectedRating.staff_name || 'You'}</span>
                </>
              )}

              <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Rated By:</span>
              <span style={{ color: 'var(--primary-dark)', fontWeight: 500 }}>{selectedRating.rated_by_name || 'Management'}</span>

              <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Request Type:</span>
              <span style={{ color: 'var(--primary-dark)', fontWeight: 500, textTransform: 'capitalize' }}>{selectedRating.request_type || 'General'}</span>

              <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Request ID:</span>
              <span style={{ color: 'var(--primary-dark)', fontWeight: 500 }}>{selectedRating.request_id ? `#${selectedRating.request_id}` : 'N/A'}</span>

              <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Severity:</span>
              <span style={{ fontWeight: 800, color: selectedRating.severity >= 4 ? '#dc2626' : selectedRating.severity === 3 ? '#d97706' : '#10b981' }}>{selectedRating.severity} / 10</span>

              <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Deduction:</span>
              <span style={{ color: selectedRating.points_deducted > 0 ? '#dc2626' : 'var(--text-secondary)', fontWeight: 700 }}>
                {selectedRating.points_deducted > 0 ? `-${selectedRating.points_deducted} points` : 'None'}
              </span>
            </div>

            <div style={{ marginTop: '0.5rem', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <h4 style={{ margin: '0 0 8px', fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reason</h4>
              <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--primary-dark)', lineHeight: 1.5, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{selectedRating.reason}</p>
            </div>

            {selectedRating.note && (
              <div style={{ padding: '1rem', backgroundColor: '#fffbeb', borderRadius: '10px', border: '1px solid #fef3c7' }}>
                <h4 style={{ margin: '0 0 8px', fontSize: '0.85rem', color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Manager Notes</h4>
                <p style={{ margin: 0, fontSize: '0.95rem', color: '#92400e', lineHeight: 1.5, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{selectedRating.note}</p>
              </div>
            )}
            
            <div style={{ marginTop: '1rem' }}>
              <button onClick={() => setSelectedRating(null)} style={{ width: '100%', padding: '12px', backgroundColor: '#f1f5f9', color: 'var(--primary-dark)', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}>Close</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Staff History Modal (Managers Only) */}
      <Modal isOpen={!!selectedStaff} onClose={() => setSelectedStaff(null)} title={`${selectedStaff?.full_name}'s History`} maxWidth="700px">
        {selectedStaff && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '0.5rem' }}>
              <div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Current Score</span>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: selectedStaff.score < 80 ? '#dc2626' : selectedStaff.score < 95 ? '#d97706' : '#10b981', lineHeight: 1, marginTop: '4px' }}>
                  {Number(selectedStaff.score).toFixed(1)}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Total Warnings</span>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#d97706', lineHeight: 1, marginTop: '4px' }}>
                  {selectedStaff.warnings}
                </div>
              </div>
            </div>

            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--primary-dark)' }}>Detailed Feedback History</h4>
            <div style={{ maxHeight: '400px', overflowY: 'auto', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              {staffRatings.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem 1rem', margin: 0 }}>No ratings recorded yet for this staff member.</p>
              ) : (
                staffRatings.map((r, i) => (
                  <div key={r.id} onClick={() => setSelectedRating(r)} style={{ padding: '12px', borderBottom: i !== staffRatings.length - 1 ? '1px solid #f1f5f9' : 'none', cursor: 'pointer', transition: 'background-color 0.2s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--primary-dark)' }}>{new Date(r.created_at).toLocaleDateString()} - {r.request_type ? r.request_type.charAt(0).toUpperCase() + r.request_type.slice(1) : 'General'}</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: r.severity >= 4 ? '#dc2626' : r.severity === 3 ? '#d97706' : '#10b981' }}>Sev: {r.severity}/10</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{r.reason}</p>
                    {r.points_deducted > 0 && <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#dc2626', fontWeight: 700 }}>-{r.points_deducted} points</p>}
                  </div>
                ))
              )}
            </div>
            
            <div style={{ marginTop: '0.5rem' }}>
              <button onClick={() => setSelectedStaff(null)} style={{ width: '100%', padding: '12px', backgroundColor: '#f1f5f9', color: 'var(--primary-dark)', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}>Close</button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
};

export default PerformanceDashboard;
