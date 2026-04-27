import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createRefund } from '../../api/refunds';
import { ChevronLeft } from 'lucide-react';
import RefundFormFields from './components/RefundFormFields';
import { getStaffList } from '../../api/users';
import { useEffect } from 'react';

const EMPTY_FORM = {
  patientFullName: '', pidNumber: '', sidNumber: '',
  telephoneNumber: '', insurancePayer: '',
  momoCode: '', totalAmountPaid: '', amountToBeRefunded: '',
  amountPaidBy: '', originalReceiptNumber: '',
  initialTransactionDate: '', reasonForRefund: '',
  billedBy: ''
};

const RefundForm = () => {
  const navigate  = useNavigate();
  const [loading, setLoading]   = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [staff, setStaff] = useState([]);

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
      await createRefund(formData);
      navigate('/refunds');
    } catch (err) {
      alert('Failed to submit refund request');
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
        <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary-dark)', marginBottom: '0.5rem' }}>New Refund Request</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>Enter the patient and transaction details below to initiate a refund.</p>
      </div>

      <RefundFormFields
        formData={formData}
        handleChange={handleChange}
        handleSubmit={handleSubmit}
        loading={loading}
        onCancel={() => navigate(-1)}
        staff={staff}
      />
    </div>
  );
};

export default RefundForm;
