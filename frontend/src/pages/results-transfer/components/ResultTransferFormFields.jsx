import { Info, Receipt, Save, RefreshCw } from 'lucide-react';

const inputStyle = {
  padding: '10px',
  backgroundColor: '#f8fafc',
  border: '1.5px solid var(--border-color)',
  borderRadius: '10px',
  color: 'var(--text-primary)',
  outline: 'none',
  width: '100%',
};

const fieldStyle = { display: 'flex', flexDirection: 'column', gap: '6px' };
const labelStyle = { fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary-dark)' };
const sectionIconStyle = (color) => ({
  padding: '8px', borderRadius: '8px',
  backgroundColor: `rgba(${color}, 0.1)`,
  color: `rgb(${color})`,
});

const ResultTransferFormFields = ({ formData, handleChange, handleSubmit, loading, onCancel }) => {
  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

      {/* Section 1 – Identification */}
      <div className="glass card-shadow" style={{ padding: '2rem', backgroundColor: '#ffffff', borderRadius: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem', borderBottom: '2px solid #f1f5f9', paddingBottom: '0.75rem' }}>
          <div style={sectionIconStyle('0,123,138')}>
            <Info size={18} />
          </div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary-dark)' }}>1. Transfer Identification</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.25rem' }}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Date of Request *</label>
            <input type="date" name="transferDate" required value={formData.transferDate} onChange={handleChange} style={inputStyle} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Old SID Number *</label>
            <input type="text" name="oldSid" required value={formData.oldSid} onChange={handleChange} style={inputStyle} placeholder="Current SID in HMS" />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>New SID Number *</label>
            <input type="text" name="newSid" required value={formData.newSid} onChange={handleChange} style={inputStyle} placeholder="Target SID for Transfer" />
          </div>
          <div style={{ ...fieldStyle, gridColumn: 'span 2' }}>
            <label style={labelStyle}>Reason for Transfer *</label>
            <textarea name="reason" required value={formData.reason} onChange={handleChange} rows="4"
              style={{ ...inputStyle, resize: 'none' }} placeholder="Provide detailed justification for the results transfer..." />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
        <button type="button" onClick={onCancel}
          style={{ flex: 1, padding: '1rem', backgroundColor: '#f1f5f9', color: 'var(--text-secondary)', border: 'none', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}>
          Cancel
        </button>
        <button type="submit" disabled={loading}
          style={{ flex: 2, padding: '1rem', backgroundColor: 'var(--primary)', color: '#ffffff', border: 'none', borderRadius: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', boxShadow: '0 4px 6px -1px rgba(0,123,138,0.2)', cursor: 'pointer' }}>
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Submitting...' : 'Submit Transfer Request'}
        </button>
      </div>
    </form>
  );
};

export default ResultTransferFormFields;
