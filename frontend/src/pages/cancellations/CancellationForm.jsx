import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createCancellation } from '../../api/cancellations';
import { ChevronLeft } from 'lucide-react';
import CancellationFormFields from './components/CancellationFormFields';
import { getStaffList } from '../../api/users';
import { useAuth } from '../../context/AuthContext';
import { useFormAutoSave } from '../../hooks/useFormAutoSave';

const EMPTY_FORM = {
  patientFullName: '', 
  pidNumber: '', 
  oldSidNumber: '', 
  newSidNumber: '',
  telephoneNumber: '', 
  insurancePayer: '', 
  totalAmountCancelled: '',
  originalReceiptNumber: '', 
  rectifiedReceiptNumber: '',
  originalReceiptAmount: '',
  rectifiedReceiptAmount: '',
  initialTransactionDate: '', 
  rectifiedDate: '', 
  reasonForCancellation: ''
};

const CancellationForm = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [staff, setStaff] = useState([]);

  const { user } = useAuth();
  const { hasRestoredDraft, clearDraft } = useFormAutoSave(
    'cancellation',
    user?.id,
    EMPTY_FORM,
    formData,
    setFormData,
    false
  );

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const res = await getStaffList();
        setStaff(res.data.data);
      } catch (err) {
        console.error('Failed to fetch staff list');
      }
    };
    fetchStaff();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createCancellation(formData);
      clearDraft();
      navigate('/cancellations');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2rem', fontWeight: 600, cursor: 'pointer' }}>
        <ChevronLeft size={20} />
        Back to Dashboard
      </button>

      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary-dark)', marginBottom: '0.5rem' }}>New Cancellation Request</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>Enter the patient and transaction details below for rectification.</p>
      </div>

      <CancellationFormFields 
        formData={formData}
        handleChange={handleChange}
        handleSubmit={handleSubmit}
        loading={loading}
        onCancel={() => navigate(-1)}
        staff={staff}
        hasRestoredDraft={hasRestoredDraft}
        onClearDraft={clearDraft}
      />
    </div>
  );
};

export default CancellationForm;
