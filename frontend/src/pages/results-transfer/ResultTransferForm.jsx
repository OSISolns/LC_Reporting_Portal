import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createResultTransfer } from '../../api/resultTransfer';
import { ChevronLeft } from 'lucide-react';
import ResultTransferFormFields from './components/ResultTransferFormFields';

const EMPTY_FORM = {
  transferDate: new Date().toISOString().split('T')[0],
  oldSid: '',
  newSid: '',
  reason: '',
};

const ResultTransferForm = () => {
  const navigate  = useNavigate();
  const [loading, setLoading]   = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createResultTransfer(formData);
      navigate('/results-transfer');
    } catch (err) {
      console.error(err);
      alert('Failed to submit transfer request');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto' }}>
      <button onClick={() => navigate(-1)}
        style={{ background: 'none', border: 'none', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2rem', fontWeight: 600, cursor: 'pointer' }}>
        <ChevronLeft size={20} />
        Back
      </button>

      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary-dark)', marginBottom: '0.5rem' }}>New Results Transfer</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>Enter the SID details and reason to initiate a laboratory results transfer.</p>
      </div>

      <ResultTransferFormFields
        formData={formData}
        handleChange={handleChange}
        handleSubmit={handleSubmit}
        loading={loading}
        onCancel={() => navigate(-1)}
      />
    </div>
  );
};

export default ResultTransferForm;
