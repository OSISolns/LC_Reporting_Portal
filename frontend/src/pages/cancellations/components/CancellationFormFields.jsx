import { Info, Receipt, Save } from 'lucide-react';

const CancellationFormFields = ({ formData, handleChange, handleSubmit, loading, onCancel }) => {
  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Section 1 */}
      <div className="glass card-shadow" style={{ padding: '2rem', backgroundColor: '#ffffff', borderRadius: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem', borderBottom: '2px solid #f1f5f9', paddingBottom: '0.75rem' }}>
          <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'rgba(0,123,138,0.1)', color: 'var(--primary)' }}>
            <Info size={18} />
          </div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary-dark)' }}>1. Patient Identification</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.25rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary-dark)' }}>Patient's Full Name *</label>
            <input type="text" name="patientFullName" required value={formData.patientFullName} onChange={handleChange} style={{ padding: '10px', backgroundColor: '#f8fafc', border: '1.5px solid var(--border-color)', borderRadius: '10px', color: 'var(--text-primary)', outline: 'none' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary-dark)' }}>PID Number *</label>
            <input type="text" name="pidNumber" required value={formData.pidNumber} onChange={handleChange} style={{ padding: '10px', backgroundColor: '#f8fafc', border: '1.5px solid var(--border-color)', borderRadius: '10px', color: 'var(--text-primary)', outline: 'none' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary-dark)' }}>Old SID Number</label>
            <input type="text" name="oldSidNumber" value={formData.oldSidNumber} onChange={handleChange} style={{ padding: '10px', backgroundColor: '#f8fafc', border: '1.5px solid var(--border-color)', borderRadius: '10px', color: 'var(--text-primary)', outline: 'none' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary-dark)' }}>New SID Number</label>
            <input type="text" name="newSidNumber" value={formData.newSidNumber} onChange={handleChange} style={{ padding: '10px', backgroundColor: '#f8fafc', border: '1.5px solid var(--border-color)', borderRadius: '10px', color: 'var(--text-primary)', outline: 'none' }} />
          </div>
        </div>
      </div>

      {/* Section 2 */}
      <div className="glass card-shadow" style={{ padding: '2rem', backgroundColor: '#ffffff', borderRadius: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem', borderBottom: '2px solid #f1f5f9', paddingBottom: '0.75rem' }}>
          <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'rgba(23,162,184,0.1)', color: 'var(--info)' }}>
            <Receipt size={18} />
          </div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary-dark)' }}>2. Transaction Details</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.25rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary-dark)' }}>Total Amount (RWF) *</label>
            <input type="number" step="0.01" name="totalAmountCancelled" required value={formData.totalAmountCancelled} onChange={handleChange} placeholder="e.g. 50000" style={{ padding: '10px', backgroundColor: '#f8fafc', border: '1.5px solid var(--border-color)', borderRadius: '10px', color: 'var(--text-primary)', outline: 'none' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary-dark)' }}>Original Receipt #</label>
            <input type="text" name="originalReceiptNumber" value={formData.originalReceiptNumber} onChange={handleChange} style={{ padding: '10px', backgroundColor: '#f8fafc', border: '1.5px solid var(--border-color)', borderRadius: '10px', color: 'var(--text-primary)', outline: 'none' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', gridColumn: 'span 2' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary-dark)' }}>Reason for Cancellation *</label>
            <textarea name="reasonForCancellation" required value={formData.reasonForCancellation} onChange={handleChange} rows="3" style={{ padding: '10px', backgroundColor: '#f8fafc', border: '1.5px solid var(--border-color)', borderRadius: '10px', color: 'var(--text-primary)', outline: 'none', resize: 'none' }}></textarea>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
        <button type="button" onClick={onCancel} style={{ flex: 1, padding: '1rem', backgroundColor: '#f1f5f9', color: 'var(--text-secondary)', border: 'none', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}>
          Cancel
        </button>
        <button type="submit" disabled={loading} style={{
          flex: 2,
          padding: '1rem',
          backgroundColor: '#1b669e',
          color: '#ffffff',
          border: 'none',
          borderRadius: '12px',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          boxShadow: '0 4px 6px -1px rgba(27, 102, 158, 0.2)',
          cursor: 'pointer'
        }}>
          <Save size={18} />
          {loading ? 'Submitting...' : 'Submit Request'}
        </button>
      </div>
    </form>
  );
};

export default CancellationFormFields;
