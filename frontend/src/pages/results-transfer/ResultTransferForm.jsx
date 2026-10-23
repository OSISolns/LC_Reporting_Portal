import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createResultTransfer } from '../../api/resultTransfer';
import { ChevronLeft } from 'lucide-react';
import ResultTransferFormFields from './components/ResultTransferFormFields';
import { useAuth } from '../../context/AuthContext';
import { useFormAutoSave } from '../../hooks/useFormAutoSave';

const EMPTY_FORM = {
  transferDate: new Date().toISOString().split('T')[0],
  oldSid: '',
  newSid: '',
  reason: '',
  department: 'Laboratory',
};

const ResultTransferForm = () => {
  const navigate  = useNavigate();
  const { user } = useAuth();
  const isImagingUser = ['imaging_tech', 'imaging_manager', 'sono', 'radiologist'].includes(user?.role);
  const isLabUser = [
    'lab_team_lead', 'lab_lead', 'lab_manager', 'lab_tech', 'lab',
    'lab_head', 'lab_supervisor', 'lab_safety_officer', 'lab_stock_officer',
    'head_biochemistry', 'head_microbiology', 'head_hematology'
  ].includes(user?.role);

  const initialForm = {
    ...EMPTY_FORM,
    department: isImagingUser ? 'Imaging' : 'Laboratory',
  };

  const [loading, setLoading]   = useState(false);
  const [formData, setFormData] = useState(initialForm);

  const { hasRestoredDraft, clearDraft } = useFormAutoSave(
    'result_transfer',
    user?.id,
    initialForm,
    formData,
    setFormData,
    false
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createResultTransfer(formData);
      clearDraft();
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
        <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary-dark)', marginBottom: '0.5rem' }}>
          {isImagingUser ? 'New Imaging Results Transfer' : isLabUser ? 'New Laboratory Results Transfer' : 'New Results Transfer'}
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
          {isImagingUser 
            ? 'Enter the SID details and reason to initiate an imaging results transfer.' 
            : isLabUser 
            ? 'Enter the SID details and reason to initiate a laboratory results transfer.' 
            : 'Enter the SID details, department, and reason to initiate a results transfer.'}
        </p>
      </div>

      <ResultTransferFormFields
        formData={formData}
        handleChange={handleChange}
        handleSubmit={handleSubmit}
        loading={loading}
        onCancel={() => navigate(-1)}
        hasRestoredDraft={hasRestoredDraft}
        onClearDraft={clearDraft}
      />
    </div>
  );
};

export default ResultTransferForm;
