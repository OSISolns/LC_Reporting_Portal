import { AlertCircle, MapPin, Users, FileText, Send } from 'lucide-react';

const IncidentFormFields = ({ formData, handleChange, handleSubmit, loading, onCancel }) => {
  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="glass card-shadow" style={{ padding: '2rem', backgroundColor: '#ffffff', borderRadius: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem', borderBottom: '2px solid #f1f5f9', paddingBottom: '0.75rem' }}>
          <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'rgba(220,53,69,0.1)', color: 'var(--danger)' }}>
            <AlertCircle size={18} />
          </div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary-dark)' }}>1. Event Classification</h2>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.25rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', gridColumn: 'span 2' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary-dark)' }}>Incident Type *</label>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {['Patient', 'Staff', 'Equipment', 'Others'].map(type => (
                <label key={type} style={{ 
                  flex: 1, 
                  padding: '10px', 
                  textAlign: 'center', 
                  cursor: 'pointer',
                  backgroundColor: formData.incidentType === type ? 'var(--danger)' : '#f8fafc',
                  color: formData.incidentType === type ? '#ffffff' : 'var(--text-secondary)',
                  border: formData.incidentType === type ? '1.5px solid var(--danger)' : '1.5px solid var(--border-color)',
                  borderRadius: '10px',
                  fontWeight: 700,
                  transition: 'all 0.2s',
                  fontSize: '0.85rem'
                }}>
                  <input type="radio" name="incidentType" value={type} checked={formData.incidentType === type} onChange={handleChange} style={{ display: 'none' }} />
                  {type}
                </label>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary-dark)' }}>Department *</label>
            <input type="text" name="department" required value={formData.department} onChange={handleChange} style={{ padding: '10px', backgroundColor: '#f8fafc', border: '1.5px solid var(--border-color)', borderRadius: '10px', color: 'var(--text-primary)', outline: 'none' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary-dark)' }}>Area of Incident *</label>
            <input type="text" name="areaOfIncident" required value={formData.areaOfIncident} onChange={handleChange} style={{ padding: '10px', backgroundColor: '#f8fafc', border: '1.5px solid var(--border-color)', borderRadius: '10px', color: 'var(--text-primary)', outline: 'none' }} />
          </div>
        </div>
      </div>

      <div className="glass card-shadow" style={{ padding: '2rem', backgroundColor: '#ffffff', borderRadius: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem', borderBottom: '2px solid #f1f5f9', paddingBottom: '0.75rem' }}>
          <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'rgba(23,162,184,0.1)', color: 'var(--info)' }}>
            <FileText size={18} />
          </div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary-dark)' }}>2. Incident Details</h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary-dark)' }}>Detailed Description *</label>
            <textarea name="description" required value={formData.description} onChange={handleChange} rows="4" style={{ padding: '10px', backgroundColor: '#f8fafc', border: '1.5px solid var(--border-color)', borderRadius: '10px', color: 'var(--text-primary)', outline: 'none', resize: 'none' }}></textarea>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem' }}>
        <button type="button" onClick={onCancel} style={{ flex: 1, padding: '1rem', backgroundColor: '#f1f5f9', color: 'var(--text-secondary)', border: 'none', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}>
          Cancel
        </button>
        <button type="submit" disabled={loading} style={{
          flex: 2,
          padding: '1rem',
          backgroundColor: 'var(--danger)',
          color: '#ffffff',
          border: 'none',
          borderRadius: '12px',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          boxShadow: '0 4px 6px -1px rgba(220, 53, 69, 0.2)',
          cursor: 'pointer'
        }}>
          <Send size={18} />
          {loading ? 'Submitting...' : 'Submit Report'}
        </button>
      </div>
    </form>
  );
};

export default IncidentFormFields;
