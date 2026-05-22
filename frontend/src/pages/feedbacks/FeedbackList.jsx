import React, { useEffect, useState } from 'react';
import { getFeedbacks, deleteFeedback } from '../../api/feedbacks';
import { MessageSquare, Calendar, PhoneCall, Trash2, CheckCircle2, ShieldAlert, BadgeInfo, Check, Download, Printer, Filter, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Button } from '../../components/ui/index';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/Modal';
import { PrintHeader, PrintFooter } from '../../components/PrintBranding';

const areaLabels = {
  receptionCallCenter: 'Reception/call center',
  nursing: 'Nursing',
  doctorsRoom: "Doctor",
  receptionCashier: 'Reception / Cashier',
  callCenter: 'Call center',
  tabaraService: 'Tabara service',
  laboratory: 'Phlebotomy (Aho batangira ibizamini)',
  laboratoryResults: 'Laboratory (Abatanga ibisubizo)',
  cafetaria: 'Cafetaria',
  imaging: 'Imaging',
  other: 'Other (Ahandi)'
};

const FeedbackList = () => {
  const { user } = useAuth();
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [isReportOpen, setIsReportOpen] = useState(false);

  const fetchFeedbacks = async () => {
    try {
      setLoading(true);
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const res = await getFeedbacks(params);
      if (res.data?.success) {
        setFeedbacks(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to load feedback entries.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbacks();
  }, [startDate, endDate]);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this feedback entry?')) return;
    try {
      const res = await deleteFeedback(id);
      if (res.data?.success) {
        toast.success('Feedback entry deleted successfully.');
        setFeedbacks(prev => prev.filter(f => f.id !== id));
        if (selectedFeedback?.id === id) setSelectedFeedback(null);
      }
    } catch (err) {
      toast.error('Failed to delete feedback entry.');
    }
  };

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
  };

  const getActiveAreas = (item) => {
    return Object.keys(areaLabels).filter(key => item[key] === 1 || item[key] === true);
  };

  // Compile statistics from the currently filtered list
  const getCompiledStats = () => {
    const stats = {};
    Object.keys(areaLabels).forEach(key => {
      stats[key] = 0;
    });

    feedbacks.forEach(item => {
      Object.keys(areaLabels).forEach(key => {
        if (item[key] === 1 || item[key] === true) {
          stats[key]++;
        }
      });
    });

    return stats;
  };

  const stats = getCompiledStats();

  const handlePrint = () => {
    const printContent = document.getElementById('compiled-report-print-area').innerHTML;
    const originalContent = document.body.innerHTML;

    // Create print window style overrides
    const style = document.createElement('style');
    style.innerHTML = `
      @media print {
        body {
          background-color: #ffffff !important;
          color: #000000 !important;
          padding: 2cm !important;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }
        .no-print {
          display: none !important;
        }
      }
    `;

    document.head.appendChild(style);
    window.print();
    document.head.removeChild(style);
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--primary-dark)', margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <MessageSquare size={36} style={{ color: '#1b669d' }} />
            Internal Feedback Central
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '0.95rem' }}>
            Bilingual suggestions, compliments, and complaints submitted confidentially by internal clinical and administrative staff.
          </p>
        </div>

        {/* Date Filter & Compile Report Row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#ffffff', padding: '6px 12px', borderRadius: '10px', border: '1.5px solid var(--border-color)' }}>
            <Calendar size={16} style={{ color: 'var(--text-secondary)' }} />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ border: 'none', outline: 'none', fontSize: '0.85rem', color: 'var(--text-primary)' }}
              title="Start Date"
            />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ border: 'none', outline: 'none', fontSize: '0.85rem', color: 'var(--text-primary)' }}
              title="End Date"
            />
            {(startDate || endDate) && (
              <button onClick={clearFilters} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#ef4444' }}>
                <X size={14} />
              </button>
            )}
          </div>

          <button
            onClick={() => setIsReportOpen(true)}
            style={{
              padding: '10px 18px',
              backgroundColor: '#1b669d',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              boxShadow: '0 4px 6px -1px rgba(27, 102, 157, 0.2)'
            }}
          >
            <Download size={16} />
            Compile & Export Report
          </button>
        </div>
      </div>

      {/* Main Grid split */}
      <div style={{ display: 'grid', gridTemplateColumns: feedbacks.length > 0 ? '1.2fr 1fr' : '1fr', gap: '2rem' }}>

        {/* Left Side: List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {loading ? (
            <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Loading patient feedback entries...
            </div>
          ) : feedbacks.length === 0 ? (
            <div style={{
              padding: '4rem',
              textAlign: 'center',
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)'
            }}>
              No internal feedback entries found matching the specified date range constraints.
            </div>
          ) : (
            feedbacks.map((item) => {
              const activeAreas = getActiveAreas(item);
              const isSelected = selectedFeedback?.id === item.id;

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedFeedback(item)}
                  style={{
                    padding: '1.5rem',
                    backgroundColor: '#ffffff',
                    borderRadius: '16px',
                    border: isSelected ? '2.5px solid #1b669d' : '1px solid var(--border-color)',
                    boxShadow: isSelected ? '0 10px 25px -5px rgba(27,102,157,0.1)' : '0 2px 4px rgba(0,0,0,0.02)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: 'var(--primary-dark)', fontSize: '1rem' }}>
                        <ShieldAlert size={14} style={{ color: '#71b647' }} />
                        Confidential Anonymous Submission
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        <Calendar size={12} />
                        Date Submitted: {item.feedback_date || 'N/A'}
                      </div>
                    </div>

                    {user?.role === 'coo' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(item.id);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--danger)',
                          cursor: 'pointer',
                          padding: '6px',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'background 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(220, 53, 69, 0.05)'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                  {/* Snippet */}
                  <p style={{
                    margin: '0 0 1rem 0',
                    fontSize: '0.9rem',
                    color: '#334155',
                    lineHeight: '1.5',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {item.concern_description}
                  </p>

                  {/* Badges */}
                  {activeAreas.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {activeAreas.map(area => (
                        <span key={area} style={{
                          padding: '4px 10px',
                          borderRadius: '20px',
                          backgroundColor: '#f1f5f9',
                          color: '#475569',
                          fontSize: '0.725rem',
                          fontWeight: 600
                        }}>
                          {area === 'other' && item.other_details ? `Other: ${item.other_details}` : areaLabels[area]}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Right Side: Detail Panel */}
        {selectedFeedback && (
          <div style={{
            position: 'sticky',
            top: '2rem',
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            border: '1.5px solid var(--border-color)',
            padding: '2rem',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.05)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
            height: 'fit-content'
          }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary-dark)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BadgeInfo style={{ color: '#1b669d' }} />
              Feedback Details
            </h2>

            {/* Contacts */}
            <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1.25rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Date of Submission / Italiki
                </label>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary-dark)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar size={16} style={{ color: '#1b669d' }} />
                  {selectedFeedback.feedback_date || 'N/A'}
                </div>
              </div>
            </div>

            {/* Selected Areas of Service Checklist */}
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>
                Areas Flagged for Improvement
              </label>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
                backgroundColor: '#f8fafc',
                padding: '1rem',
                borderRadius: '12px',
                border: '1px solid var(--border-color)'
              }}>
                {Object.entries(areaLabels)
                  .filter(([key]) => selectedFeedback[key] === 1 || selectedFeedback[key] === true)
                  .map(([key, label]) => (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '4px',
                        backgroundColor: '#71b647',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff'
                      }}>
                        <Check size={12} strokeWidth={3} />
                      </div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary-dark)' }}>
                        {key === 'other' && selectedFeedback.other_details ? `Other: ${selectedFeedback.other_details}` : label}
                      </span>
                    </div>
                  ))
                }
                {Object.entries(areaLabels).filter(([key]) => selectedFeedback[key] === 1 || selectedFeedback[key] === true).length === 0 && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', gridColumn: 'span 2', fontStyle: 'italic' }}>
                    No specific service areas were flagged (General Feedback).
                  </div>
                )}
              </div>
            </div>

            {/* Feedback Content */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Concern / Compliment Description
              </label>
              <div style={{
                backgroundColor: 'rgba(27,102,157,0.02)',
                border: '1.5px solid rgba(27,102,157,0.1)',
                padding: '1.25rem',
                borderRadius: '12px',
                fontSize: '0.95rem',
                color: '#334155',
                lineHeight: '1.6',
                whiteSpace: 'pre-wrap',
                fontWeight: 500
              }}>
                {selectedFeedback.concern_description}
              </div>
            </div>

            {/* Footer Signoff */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
              marginTop: 'auto',
              paddingTop: '1rem',
              borderTop: '1px solid var(--border-color)'
            }}>
              <CheckCircle2 size={14} style={{ color: '#71b647' }} />
              Logged confidentially in Legacy Central Cache at {new Date(selectedFeedback.created_at).toLocaleString()}
            </div>

          </div>
        )}

      </div>

      {/* ── COMPILED REPORT PREVIEW MODAL ── */}
      <Modal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        title="Compiled Internal Feedback Report"
        maxWidth="950px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

          {/* Action Row */}
          <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              onClick={handlePrint}
              style={{
                padding: '10px 20px',
                backgroundColor: '#1b669d',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer'
              }}
            >
              <Printer size={16} />
              Print / Save PDF
            </button>
            <button
              onClick={() => setIsReportOpen(false)}
              style={{
                padding: '10px 16px',
                backgroundColor: '#f1f5f9',
                color: 'var(--text-secondary)',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>

          {/* Report Print Shell */}
          <div id="compiled-report-print-area" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', padding: '1rem' }}>

            {/* Printable Branding */}
            <PrintHeader title="BILINGUAL INTERNAL FEEDBACK COMPILED REPORT" docType="FB" alwaysVisible={true} />

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #e2e8f0', paddingBottom: '1rem', marginTop: '1rem' }}>
              <div>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Report Parameters</span>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', marginTop: '4px' }}>
                  Date Range: {startDate || 'Earliest'} to {endDate || 'Latest'}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Total Submissions</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1b669d', marginTop: '2px' }}>
                  {feedbacks.length} Feedback Records
                </div>
              </div>
            </div>

            {/* Part 1: Flagged Areas Distribution */}
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px', marginBottom: '12px' }}>
                1. Service Area Flags Breakdown
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                {Object.entries(areaLabels).map(([key, label]) => {
                  const count = stats[key] || 0;
                  const pct = feedbacks.length > 0 ? ((count / feedbacks.length) * 100).toFixed(0) : 0;

                  return (
                    <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>
                        <span>{label}</span>
                        <span style={{ color: count > 0 ? '#ef4444' : '#64748b' }}>
                          {count} flag{count !== 1 ? 's' : ''} ({pct}%)
                        </span>
                      </div>
                      <div style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '99px', overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', backgroundColor: count > 0 ? '#1b669d' : '#94a3b8', borderRadius: '99px' }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Part 2: Detailed Suggestions Ledger */}
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px', marginBottom: '12px' }}>
                2. Compiled Feedback Ledger
              </h3>

              {feedbacks.length === 0 ? (
                <p style={{ fontStyle: 'italic', color: '#64748b', fontSize: '0.9rem' }}>No feedback submissions registered within the query parameters.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {feedbacks.map((item, index) => {
                    const activeAreas = getActiveAreas(item);
                    return (
                      <div key={item.id} style={{
                        padding: '1rem',
                        backgroundColor: '#f8fafc',
                        borderRadius: '10px',
                        border: '1px solid #e2e8f0',
                        pageBreakInside: 'avoid'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, color: '#64748b', marginBottom: '8px' }}>
                          <span>Entry #{feedbacks.length - index} (Anonymous)</span>
                          <span>Date Submitted: {item.feedback_date}</span>
                        </div>

                        <p style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#334155', lineHeight: '1.6', fontWeight: 500 }}>
                          "{item.concern_description}"
                        </p>

                        {activeAreas.length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {activeAreas.map(area => (
                              <span key={area} style={{
                                padding: '3px 8px',
                                borderRadius: '4px',
                                backgroundColor: '#e2e8f0',
                                color: '#334155',
                                fontSize: '0.7rem',
                                fontWeight: 700
                              }}>
                                {area === 'other' && item.other_details ? `Other: ${item.other_details}` : areaLabels[area]}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontStyle: 'italic' }}>General Feedback (No specific areas flagged)</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Part 3: Printable Approvals Footer */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', marginTop: '3rem', borderTop: '1px solid #cbd5e1', paddingTop: '2rem', pageBreakInside: 'avoid' }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Generated By:</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b', marginTop: '1rem' }}>Legacy Central Reporting Portal</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>Automated Extraction Service</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Received By:</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b', marginTop: '1.5rem', borderBottom: '1px solid #94a3b8', display: 'inline-block', width: '200px' }}></div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1b669d', marginTop: '6px' }}>Chief Operating Officer (COO)</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Legacy Clinics & Diagnostics</div>
              </div>
            </div>

            <PrintFooter />

          </div>

        </div>
      </Modal>

    </div>
  );
};

export default FeedbackList;
