import { Info, Receipt, DollarSign, Save } from 'lucide-react';

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

const RefundFormFields = ({ formData, handleChange, handleSubmit, loading, onCancel }) => {
  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

      {/* Section 1 – Patient Identification */}
      <div className="glass card-shadow" style={{ padding: '2rem', backgroundColor: '#ffffff', borderRadius: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem', borderBottom: '2px solid #f1f5f9', paddingBottom: '0.75rem' }}>
          <div style={sectionIconStyle('0,123,138')}>
            <Info size={18} />
          </div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary-dark)' }}>1. Formal Patient Identification</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.25rem' }}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Patient's Full Name *</label>
            <input type="text" name="patientFullName" required value={formData.patientFullName} onChange={handleChange} style={inputStyle} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>PID Number *</label>
            <input type="text" name="pidNumber" required value={formData.pidNumber} onChange={handleChange} style={inputStyle} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>SID Number</label>
            <input type="text" name="sidNumber" value={formData.sidNumber} onChange={handleChange} style={inputStyle} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Telephone Number</label>
            <input type="text" name="telephoneNumber" value={formData.telephoneNumber} onChange={handleChange} style={inputStyle} />
          </div>
          <div style={{ ...fieldStyle, gridColumn: 'span 2' }}>
            <label style={labelStyle}>Insurance / Payer</label>
            <input type="text" name="insurancePayer" value={formData.insurancePayer} onChange={handleChange} style={inputStyle} placeholder="e.g. RSSB, Private, Walk-in" />
          </div>
        </div>
      </div>

      {/* Section 2 – Transaction Details */}
      <div className="glass card-shadow" style={{ padding: '2rem', backgroundColor: '#ffffff', borderRadius: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem', borderBottom: '2px solid #f1f5f9', paddingBottom: '0.75rem' }}>
          <div style={sectionIconStyle('23,162,184')}>
            <Receipt size={18} />
          </div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary-dark)' }}>2. Transaction Details</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.25rem' }}>
          <div style={fieldStyle}>
            <label style={labelStyle}>MOMO Code</label>
            <input type="text" name="momoCode" value={formData.momoCode} onChange={handleChange} style={inputStyle} placeholder="Mobile Money reference" />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Original Receipt / Invoice #</label>
            <input type="text" name="originalReceiptNumber" value={formData.originalReceiptNumber} onChange={handleChange} style={inputStyle} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Total Amount Paid (RWF) *</label>
            <input type="number" step="0.01" name="totalAmountPaid" required value={formData.totalAmountPaid} onChange={handleChange} style={inputStyle} placeholder="e.g. 50000" />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Amount to be Refunded (RWF) *</label>
            <input type="number" step="0.01" name="amountToBeRefunded" required value={formData.amountToBeRefunded} onChange={handleChange} style={inputStyle} placeholder="e.g. 25000" />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Amount Paid By</label>
            <input type="text" name="amountPaidBy" value={formData.amountPaidBy} onChange={handleChange} style={inputStyle} placeholder="e.g. Patient, Insurance" />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Initial Transaction Date</label>
            <input type="date" name="initialTransactionDate" value={formData.initialTransactionDate} onChange={handleChange} style={inputStyle} />
          </div>
          <div style={{ ...fieldStyle, gridColumn: 'span 2' }}>
            <label style={labelStyle}>Reason for Refund (details) *</label>
            <textarea name="reasonForRefund" required value={formData.reasonForRefund} onChange={handleChange} rows="3"
              style={{ ...inputStyle, resize: 'none' }} placeholder="Provide full details for the refund request..." />
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
          <Save size={18} />
          {loading ? 'Submitting...' : 'Submit Refund Request'}
        </button>
      </div>
    </form>
  );
};

export default RefundFormFields;
