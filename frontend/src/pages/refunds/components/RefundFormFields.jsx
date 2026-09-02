import { useState as useLocalState } from 'react';
import { INSURANCES } from '../constants';
import { Info, Receipt, Save, Phone, Calendar, Users, X as XIcon } from 'lucide-react';
import PatientAutocomplete from '../../../components/PatientAutocomplete';

const inputStyle = {
  padding: '10px',
  backgroundColor: '#f8fafc',
  border: '1.5px solid var(--border-color)',
  borderRadius: '10px',
  color: 'var(--text-primary)',
  outline: 'none',
  width: '100%',
};

const selectStyle = {
  ...inputStyle,
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 1rem center',
  backgroundSize: '1em',
  cursor: 'pointer'
};

const fieldStyle = { display: 'flex', flexDirection: 'column', gap: '6px' };
const labelStyle = { fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary-dark)' };

const RefundFormFields = ({ formData, handleChange, handleSubmit, loading, onCancel }) => {
  // Tag-input state for Amount Paid By
  const [payerInput, setPayerInput] = useLocalState('');

  // Parse existing tags from the comma-joined string
  const payerTags = formData.amountPaidBy
    ? formData.amountPaidBy.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  const commitPayerInput = (raw) => {
    const name = raw.trim();
    if (!name || payerTags.includes(name)) return;
    const updated = [...payerTags, name];
    handleChange({ target: { name: 'amountPaidBy', value: updated.join(', ') } });
    setPayerInput('');
  };

  const removePayerTag = (tag) => {
    const updated = payerTags.filter(t => t !== tag);
    handleChange({ target: { name: 'amountPaidBy', value: updated.join(', ') } });
  };

  const handlePayerKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commitPayerInput(payerInput);
    } else if (e.key === 'Backspace' && payerInput === '' && payerTags.length > 0) {
      removePayerTag(payerTags[payerTags.length - 1]);
    }
  };
  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

      {/* ── Section 1: Patient Identification ── */}
      <div className="glass card-shadow" style={{ padding: '2rem', backgroundColor: '#ffffff', borderRadius: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem', borderBottom: '2px solid #f1f5f9', paddingBottom: '0.75rem' }}>
          <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'rgba(0,123,138,0.1)', color: 'var(--primary)' }}>
            <Info size={18} />
          </div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary-dark)' }}>Section 1: Formal Patient Identification</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.25rem' }}>

          <div style={fieldStyle}>
            <label style={labelStyle}>Patient's full name *</label>
            <PatientAutocomplete
              value={formData.patientFullName}
              onChange={(val) => handleChange({ target: { name: 'patientFullName', value: val } })}
              onPatientSelect={(patient) => {
                // Populate all other patient fields automatically on selection
                handleChange({ target: { name: 'patientFullName', value: patient.full_name } });
                handleChange({ target: { name: 'pidNumber', value: patient.pid } });
                if (patient.phone) {
                  handleChange({ target: { name: 'telephoneNumber', value: patient.phone } });
                }
                if (patient.insurance) {
                  handleChange({ target: { name: 'insurancePayer', value: patient.insurance } });
                }
              }}
              inputStyle={inputStyle}
              placeholder="Search or enter patient name..."
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>PID number *</label>
            <PatientAutocomplete
              value={formData.pidNumber}
              onChange={(val) => handleChange({ target: { name: 'pidNumber', value: val } })}
              onPatientSelect={(patient) => {
                // Populate all other patient fields automatically on selection
                handleChange({ target: { name: 'patientFullName', value: patient.full_name } });
                handleChange({ target: { name: 'pidNumber', value: patient.pid } });
                if (patient.phone) {
                  handleChange({ target: { name: 'telephoneNumber', value: patient.phone } });
                }
                if (patient.insurance) {
                  handleChange({ target: { name: 'insurancePayer', value: patient.insurance } });
                }
              }}
              inputStyle={inputStyle}
              placeholder="Search or enter PID..."
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>SID number <span style={{ fontWeight: 400, color: 'var(--text-secondary)', fontSize: '0.78rem' }}>(optional)</span></label>
            <input type="text" name="sidNumber"
              value={formData.sidNumber} onChange={handleChange} style={inputStyle} placeholder="Leave blank if not applicable" />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Telephone Number *</label>
            <div style={{ position: 'relative' }}>
              <Phone size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input type="tel" name="telephoneNumber" required
                value={formData.telephoneNumber} onChange={handleChange}
                style={{ ...inputStyle, paddingLeft: '36px' }} placeholder="e.g. 078XXXXXXX" />
            </div>
          </div>

          <div style={{ ...fieldStyle, gridColumn: 'span 2' }}>
            <label style={labelStyle}>Insurance / Payer *</label>
            <select name="insurancePayer" required value={formData.insurancePayer} onChange={handleChange} style={selectStyle}>
              <option value="">Select Insurance / Payer</option>
              {INSURANCES.map(insurance => (
                <option key={insurance} value={insurance}>{insurance}</option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* ── Section 2: Transaction Details ── */}
      <div className="glass card-shadow" style={{ padding: '2rem', backgroundColor: '#ffffff', borderRadius: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem', borderBottom: '2px solid #f1f5f9', paddingBottom: '0.75rem' }}>
          <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'rgba(23,162,184,0.1)', color: 'var(--info)' }}>
            <Receipt size={18} />
          </div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary-dark)' }}>Section 2: Transaction Details</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.25rem' }}>

          <div style={fieldStyle}>
            <label style={labelStyle}>MOMO Code *</label>
            <input type="text" name="momoCode" required
              value={formData.momoCode} onChange={handleChange}
              style={inputStyle} placeholder="MoMo Pay Codes" />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Original Receipt / Invoice # *</label>
            <input type="text" name="originalReceiptNumber" required
              value={formData.originalReceiptNumber} onChange={handleChange} style={inputStyle} />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Total Amount Paid (RWF) *</label>
            <input type="number" step="0.01" name="totalAmountPaid" required
              value={formData.totalAmountPaid} onChange={handleChange}
              style={inputStyle} placeholder="e.g. 50000" />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Amount to be Refunded (RWF) *</label>
            <input type="number" step="0.01" name="amountToBeRefunded" required
              value={formData.amountToBeRefunded} onChange={handleChange}
              style={inputStyle} placeholder="e.g. 25000" />
          </div>

          <div style={{ ...fieldStyle, gridColumn: 'span 2' }}>
            <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Users size={15} style={{ color: 'var(--primary)' }} />
              Amount Paid By *
              <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-secondary)' }}>
                — type a name and press Enter or comma to add
              </span>
            </label>

            {/* Hidden input keeps the required constraint satisfied when ≥1 tag exists */}
            <input
              type="text"
              name="amountPaidBy"
              required
              readOnly
              value={formData.amountPaidBy}
              style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0 }}
              tabIndex={-1}
            />

            {/* Tag-input container */}
            <div
              style={{
                display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px',
                padding: '8px 12px',
                backgroundColor: '#f8fafc',
                border: '1.5px solid var(--border-color)',
                borderRadius: '10px',
                cursor: 'text',
                minHeight: '46px',
              }}
              onClick={() => document.getElementById('payer-tag-input')?.focus()}
            >
              {/* Existing tags */}
              {payerTags.map(tag => (
                <span
                  key={tag}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '5px',
                    padding: '4px 10px',
                    borderRadius: '99px',
                    backgroundColor: 'rgba(0,123,138,0.1)',
                    border: '1.5px solid var(--primary)',
                    color: 'var(--primary-dark)',
                    fontWeight: 600,
                    fontSize: '0.8rem',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {tag}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removePayerTag(tag); }}
                    style={{
                      background: 'none', border: 'none', padding: '0',
                      cursor: 'pointer', color: 'var(--primary)',
                      display: 'inline-flex', alignItems: 'center',
                      lineHeight: 1,
                    }}
                    aria-label={`Remove ${tag}`}
                  >
                    <XIcon size={12} />
                  </button>
                </span>
              ))}

              {/* Free-text input */}
              <input
                id="payer-tag-input"
                type="text"
                value={payerInput}
                onChange={e => setPayerInput(e.target.value)}
                onKeyDown={handlePayerKeyDown}
                onBlur={() => commitPayerInput(payerInput)}
                placeholder={payerTags.length === 0 ? 'e.g. John Doe, Jane Smith…' : 'Add another name…'}
                style={{
                  border: 'none', outline: 'none',
                  backgroundColor: 'transparent',
                  fontSize: '0.85rem', color: 'var(--text-primary)',
                  flex: '1 1 140px', minWidth: '120px',
                  padding: '2px 0',
                }}
              />
            </div>

            {payerTags.length > 0 && (
              <p style={{ margin: '4px 0 0', fontSize: '0.74rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                Recorded: <strong style={{ color: 'var(--primary-dark)' }}>{formData.amountPaidBy}</strong>
              </p>
            )}
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Initial Transaction Date *</label>
            <div style={{ position: 'relative' }}>
              <Calendar size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input type="date" name="initialTransactionDate" required
                value={formData.initialTransactionDate} onChange={handleChange}
                style={{ ...inputStyle, paddingLeft: '36px' }} />
            </div>
          </div>

          <div style={{ ...fieldStyle, gridColumn: 'span 2' }}>
            <label style={labelStyle}>Reason for Refund (details) *</label>
            <textarea name="reasonForRefund" required
              value={formData.reasonForRefund} onChange={handleChange}
              rows="3" style={{ ...inputStyle, resize: 'none' }}
              placeholder="Provide full details for the refund request..." />
          </div>



        </div>
      </div>

      {/* ── Actions ── */}
      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
        <button type="button" onClick={onCancel}
          style={{ flex: 1, padding: '1rem', backgroundColor: '#f1f5f9', color: 'var(--text-secondary)', border: 'none', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}>
          Cancel
        </button>
        <button type="submit" disabled={loading}
          style={{ flex: 2, padding: '1rem', backgroundColor: '#003b44', color: '#ffffff', border: 'none', borderRadius: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', boxShadow: '0 4px 6px -1px rgba(0,59,68,0.2)', cursor: 'pointer' }}>
          <Save size={18} />
          {loading ? 'Submitting...' : 'Submit Refund Request'}
        </button>
      </div>

    </form>
  );
};

export default RefundFormFields;
