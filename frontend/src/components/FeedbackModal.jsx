import React, { useState } from 'react';
import Modal from './Modal';
import { submitFeedback } from '../api/feedbacks';
import { Check, Send, AlertCircle, Sparkles, Shield, HeartHandshake } from 'lucide-react';
import { toast } from 'react-hot-toast';

const checklistItems = [
  { key: 'receptionCallCenter', en: 'Reception/call center', rw: 'Aho bakirira abantu' },
  { key: 'nursing', en: 'Nursing', rw: 'Mubaforomo' },
  { key: 'doctorsRoom', en: "Doctor", rw: 'Muganga' },
  { key: 'receptionCashier', en: 'Reception / Cashier', rw: 'Aho bishyurira' },
  { key: 'callCenter', en: 'Call center', rw: 'Call center' },
  { key: 'tabaraService', en: 'Tabara service', rw: 'Abasunika Igare' },
  { key: 'laboratory', en: 'Phlebotomy', rw: 'Aho batangira ibizamini' },
  { key: 'laboratoryResults', en: 'Laboratory', rw: 'Abatanga ibisubizo' },
  { key: 'cafetaria', en: 'Cafetaria', rw: 'Muri restora' },
  { key: 'imaging', en: 'Imaging', rw: "Mu cyumba gifotora" },
  { key: 'other', en: 'Other', rw: 'Ahandi' }
];

const FeedbackModal = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    contactInfo: '',
    feedbackDate: new Date().toISOString().split('T')[0],
    receptionCallCenter: false,
    nursing: false,
    doctorsRoom: false,
    receptionCashier: false,
    callCenter: false,
    tabaraService: false,
    laboratory: false,
    laboratoryResults: false,
    cafetaria: false,
    imaging: false,
    other: false,
    otherDetails: '',
    concernDescription: ''
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isCustomOther, setIsCustomOther] = useState(false);

  const handleCheckboxChange = (key) => {
    setFormData(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleOtherDetailsChange = (e) => {
    const val = e.target.value;
    if (val === 'custom') {
      setIsCustomOther(true);
      setFormData(prev => ({ ...prev, otherDetails: '' }));
    } else {
      setIsCustomOther(false);
      setFormData(prev => ({ ...prev, otherDetails: val }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.concernDescription.trim()) {
      toast.error('Please describe your concern.');
      return;
    }

    setLoading(true);
    try {
      const res = await submitFeedback(formData);
      if (res.data?.success) {
        setSubmitted(true);
        toast.success('Feedback submitted successfully!');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      contactInfo: '',
      feedbackDate: new Date().toISOString().split('T')[0],
      receptionCallCenter: false,
      nursing: false,
      doctorsRoom: false,
      receptionCashier: false,
      callCenter: false,
      tabaraService: false,
      laboratory: false,
      laboratoryResults: false,
      cafetaria: false,
      imaging: false,
      other: false,
      otherDetails: '',
      concernDescription: ''
    });
    setIsCustomOther(false);
    setSubmitted(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Internal Feedback Form" maxWidth="750px">
      {submitted ? (
        <div style={{ textAlign: 'center', padding: '3rem 1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            backgroundColor: '#ecfdf5',
            color: '#10b981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.1)',
            marginBottom: '1rem'
          }}>
            <HeartHandshake size={42} />
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary-dark)' }}>Thank you for your time!</h2>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#059669', marginTop: '-0.5rem' }}>Murakoze kubwumwanya wanyu!</h3>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', lineHeight: '1.6', fontSize: '0.95rem' }}>
            Please be assured that <strong>your feedback remains completely confidential</strong>.<br />
            <span style={{ fontStyle: 'italic', display: 'block', marginTop: '6px' }}>
              Amakuru mutanze yacyiriwe mu ibanga rikomeye.
            </span>
          </p>
          <button
            onClick={handleClose}
            style={{
              marginTop: '1.5rem',
              padding: '0.75rem 2rem',
              backgroundColor: '#1b669d',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 6px -1px rgba(27, 102, 157, 0.2)'
            }}
          >
            Close / Funga
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

          {/* Header Note */}
          <div style={{
            padding: '1.25rem',
            borderRadius: '12px',
            backgroundColor: 'rgba(27, 102, 157, 0.05)',
            borderLeft: '4px solid #1b669d',
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-start'
          }}>
            <Shield size={20} style={{ color: '#1b669d', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#1e293b', fontWeight: 600, lineHeight: '1.5' }}>
                Please provide internal feedback on Areas of Service, compliments, or suggestions. Your details will be handled confidentially.
              </p>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.825rem', color: 'var(--text-secondary)', fontStyle: 'italic', fontWeight: 500 }}>
                Tanga inyunganizi, ibyo unyuzwe nabyo, cyangwa ibikwiye gukosorwa. Ibitekerezo byanyu ni ibanga.
              </p>
            </div>
          </div>

          {/* Identification Block */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '300px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary-dark)' }}>
              Date (Italiki)
            </label>
            <input
              type="date"
              name="feedbackDate"
              value={formData.feedbackDate}
              onChange={handleChange}
              style={{
                padding: '10px 12px',
                backgroundColor: '#f8fafc',
                border: '1.5px solid var(--border-color)',
                borderRadius: '10px',
                outline: 'none',
                fontSize: '0.9rem'
              }}
            />
          </div>

          {/* Improvement areas checklist */}
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--primary-dark)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Areas of Services / <span style={{ color: '#1b669d' }}>Ahatangirwa Serivisi</span>
            </h3>
            <p style={{ margin: '0 0 1rem 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Check all applicable clinical and administrative service delivery areas:
            </p>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px'
            }}>
              {checklistItems.map((item) => (
                <div
                  key={item.key}
                  onClick={() => handleCheckboxChange(item.key)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px',
                    borderRadius: '10px',
                    border: formData[item.key] ? '2px solid #71b647' : '1.5px solid var(--border-color)',
                    backgroundColor: formData[item.key] ? 'rgba(113, 182, 71, 0.04)' : '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    userSelect: 'none'
                  }}
                >
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '4px',
                    border: formData[item.key] ? '2px solid #71b647' : '2px solid #94a3b8',
                    backgroundColor: formData[item.key] ? '#71b647' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    flexShrink: 0
                  }}>
                    {formData[item.key] && <Check size={14} strokeWidth={3} />}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary-dark)' }}>{item.en}</div>
                    <div style={{ fontSize: '0.725rem', color: '#64748b', fontStyle: 'italic', fontWeight: 500 }}>{item.rw}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Conditional Other details input */}
          {formData.other && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '-0.5rem', backgroundColor: 'rgba(27,102,157,0.03)', padding: '1rem', borderRadius: '12px', border: '1.5px dashed rgba(27,102,157,0.2)' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary-dark)' }}>
                Please specify the other service area *
              </label>
              <span style={{ fontSize: '0.725rem', color: '#64748b', fontStyle: 'italic', marginTop: '-4px' }}>
                Sobanura aho ariho.
              </span>
              <select
                name="otherDetailsSelect"
                required
                value={isCustomOther ? 'custom' : formData.otherDetails}
                onChange={handleOtherDetailsChange}
                style={{
                  padding: '10px 12px',
                  backgroundColor: '#ffffff',
                  border: '1.5px solid var(--border-color)',
                  borderRadius: '10px',
                  outline: 'none',
                  fontSize: '0.9rem',
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 1rem center',
                  backgroundSize: '1em',
                  cursor: 'pointer',
                  width: '100%'
                }}
              >
                <option value="">Select service area / Hitamo serivisi...</option>
                <option value="Orientation Services">Orientation Services (Ahabanzirizwa / Aho kuyoborwa)</option>
                <option value="Cleaning Services">Cleaning Services (Isuku cyangwa isukura)</option>
                <option value="Parking">Parking (Aho guparika imodoka)</option>
                <option value="Restrooms">Restrooms (Ubwiherero / Imisarani)</option>
                <option value="Doctor's room">Doctor's room (Icyumba cya Muganga)</option>
                <option value="custom">Other (Specify below) / Ahabonetse ahandi (Sobanura hasi)...</option>
              </select>
              {isCustomOther && (
                <input
                  type="text"
                  name="otherDetails"
                  required
                  placeholder="Specify other service area / Sobanura ahandi hantu..."
                  value={formData.otherDetails}
                  onChange={handleChange}
                  style={{
                    padding: '10px 12px',
                    backgroundColor: '#ffffff',
                    border: '1.5px solid var(--border-color)',
                    borderRadius: '10px',
                    outline: 'none',
                    fontSize: '0.9rem',
                    marginTop: '8px'
                  }}
                />
              )}
            </div>
          )}

          {/* Large Concern Textbox */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary-dark)' }}>
              Please describe your concern (Complaint, suggestion, compliment, other..) *
            </label>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic', marginTop: '-4px', marginBottom: '4px' }}>
              Mwaduha amakuru arambuye ku kibazo, icyifuzo cyangwa gushima:
            </span>
            <textarea
              name="concernDescription"
              required
              rows={4}
              placeholder="Your feedback / Ibitekerezo byanyu..."
              value={formData.concernDescription}
              onChange={handleChange}
              style={{
                padding: '12px',
                backgroundColor: '#f8fafc',
                border: '1.5px solid var(--border-color)',
                borderRadius: '12px',
                outline: 'none',
                fontSize: '0.9rem',
                resize: 'none',
                lineHeight: '1.5'
              }}
            />
          </div>

          {/* Action Row */}
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={handleClose}
              style={{
                flex: 1,
                padding: '0.875rem',
                backgroundColor: '#f1f5f9',
                color: 'var(--text-secondary)',
                border: 'none',
                borderRadius: '10px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Cancel / Funga
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 2,
                padding: '0.875rem',
                backgroundColor: '#1b669d',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 6px -1px rgba(27, 102, 157, 0.2)',
                cursor: 'pointer'
              }}
            >
              {loading ? 'Submitting...' : 'Submit Feedback / Ohereza '}
              <Send size={16} />
            </button>
          </div>

        </form>
      )}
    </Modal>
  );
};

export default FeedbackModal;
