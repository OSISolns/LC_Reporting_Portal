import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createIncident } from '../../api/incidents';
import { ChevronLeft } from 'lucide-react';
import IncidentFormFields from './components/IncidentFormFields';

const IncidentForm = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    incidentType: 'Patient', department: '', areaOfIncident: '', namesInvolved: '',
    pidNumber: '', description: '', contributingFactors: '',
    immediateActions: '', preventionMeasures: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createIncident(formData);
      navigate('/incidents');
    } catch (err) {
      alert('Failed to submit incident report');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto' }}>
      <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2rem', fontWeight: 600, cursor: 'pointer' }}>
        <ChevronLeft size={20} />
        Back to Safety Dashboard
      </button>

      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary-dark)', marginBottom: '0.5rem' }}>Incident / sentinel Event Report</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>Confidential reporting for quality improvement and patient safety.</p>
      </div>

      <IncidentFormFields 
        formData={formData}
        handleChange={handleChange}
        handleSubmit={handleSubmit}
        loading={loading}
        onCancel={() => navigate(-1)}
      />
    </div>
  );
};

export default IncidentForm;
