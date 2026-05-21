import React, { useEffect, useState } from 'react';
import { getFeedbacks, deleteFeedback } from '../../api/feedbacks';
import { MessageSquare, Calendar, PhoneCall, Trash2, CheckCircle2, ShieldAlert, BadgeInfo, Check } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Button } from '../../components/ui/index';
import { useAuth } from '../../context/AuthContext';

const areaLabels = {
  receptionCallCenter: 'Reception/call center',
  nursing: 'Nursing',
  doctorsRoom: "Doctor's room",
  receptionCashier: 'Reception / Cashier',
  callCenter: 'Call center',
  tabaraService: 'Tabara service',
  laboratory: 'Laboratory',
  cafetaria: 'Cafetaria',
  imaging: 'Imaging'
};

const FeedbackList = () => {
  const { user } = useAuth();
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchContact, setSearchContact] = useState('');
  const [selectedFeedback, setSelectedFeedback] = useState(null);

  const fetchFeedbacks = async () => {
    try {
      setLoading(true);
      const params = {};
      if (searchContact.trim()) params.contact = searchContact;
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
  }, [searchContact]);

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

  const getActiveAreas = (item) => {
    return Object.keys(areaLabels).filter(key => item[key] === 1 || item[key] === true);
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--primary-dark)', margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <MessageSquare size={36} style={{ color: '#1b669d' }} />
            Internal Feedback Central
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '0.95rem' }}>
            Bilingual suggestions, compliments, and complaints submitted confidentially by internal clinical and administrative staff.
          </p>
        </div>

        {/* Search */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            placeholder="Search by contact info..."
            value={searchContact}
            onChange={(e) => setSearchContact(e.target.value)}
            style={{
              padding: '10px 16px',
              border: '1.5px solid var(--border-color)',
              borderRadius: '10px',
              fontSize: '0.9rem',
              outline: 'none',
              width: '260px',
              backgroundColor: '#ffffff'
            }}
          />
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
              No patient feedback entries matching search constraints.
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
                        <PhoneCall size={14} style={{ color: '#1b669d' }} />
                        {item.contact_info || 'Anonymous (Confidential)'}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        <Calendar size={12} />
                        Date of Visit: {item.feedback_date || 'N/A'}
                      </div>
                    </div>

                    {['admin', 'coo', 'deputy_coo'].includes(user?.role) && (
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
                          {areaLabels[area]}
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.25rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Contact Info / Imeli
                </label>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary-dark)', marginTop: '4px' }}>
                  {selectedFeedback.contact_info || 'Anonymous (Confidential)'}
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Date of Visit / Italiki
                </label>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary-dark)', marginTop: '4px' }}>
                  {selectedFeedback.feedback_date || 'N/A'}
                </div>
              </div>
            </div>

            {/* Selected Areas of Improvement Checklist */}
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
                {Object.entries(areaLabels).map(([key, label]) => {
                  const isActive = selectedFeedback[key] === 1 || selectedFeedback[key] === true;
                  return (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: isActive ? 1 : 0.4 }}>
                      <div style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '4px',
                        backgroundColor: isActive ? '#71b647' : 'transparent',
                        border: isActive ? 'none' : '1.5px solid #94a3b8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff'
                      }}>
                        {isActive && <Check size={12} strokeWidth={3} />}
                      </div>
                      <span style={{ fontSize: '0.75rem', fontWeight: isActive ? 700 : 500, color: 'var(--primary-dark)' }}>{label}</span>
                    </div>
                  );
                })}
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

    </div>
  );
};

export default FeedbackList;
