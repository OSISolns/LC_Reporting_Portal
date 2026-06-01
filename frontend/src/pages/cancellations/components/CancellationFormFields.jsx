import { Info, Receipt, Save, Phone, Calendar } from 'lucide-react';
import { INSURANCES } from '../../refunds/constants';
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

const CancellationFormFields = ({ formData, handleChange, handleSubmit, loading, onCancel }) => {
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
            <label style={labelStyle}>SID number (if applicable)</label>
            <input type="text" name="oldSidNumber"
              value={formData.oldSidNumber} onChange={handleChange} style={inputStyle}
              placeholder="Leave blank if no LAB/Imaging test" />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>New SID {formData.oldSidNumber ? ' *' : '(if applicable)'}</label>
            <input type="text" name="newSidNumber" required={!!formData.oldSidNumber}
              value={formData.newSidNumber} onChange={handleChange} style={inputStyle}
              placeholder={formData.oldSidNumber ? "Required because Old SID is provided" : "Leave blank if none"} />
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

          <div style={fieldStyle}>
            <label style={labelStyle}>Insurance / Payer *</label>
            <select name="insurancePayer" required value={formData.insurancePayer} onChange={handleChange} style={selectStyle}>
              <option value="">Select Insurance / Payer</option>
              {INSURANCES.map(ins => <option key={ins} value={ins}>{ins}</option>)}
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
            <label style={labelStyle}>Amount to be Cancelled (RWF) *</label>
            <input type="number" step="0.01" name="totalAmountCancelled" required
              value={formData.totalAmountCancelled} onChange={handleChange}
              style={inputStyle} placeholder="e.g. 50000" />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Original Receipt / Invoice # *</label>
            <input type="text" name="originalReceiptNumber" required
              value={formData.originalReceiptNumber} onChange={handleChange} style={inputStyle} />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Original Receipt / Invoice Amount (RWF) *</label>
            <input type="number" step="0.01" name="originalReceiptAmount" required
              value={formData.originalReceiptAmount || ''} onChange={handleChange}
              style={inputStyle} placeholder="e.g. 60000" />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Rectified Receipt # (if any)</label>
            <input type="text" name="rectifiedReceiptNumber"
              value={formData.rectifiedReceiptNumber} onChange={handleChange}
              style={inputStyle} placeholder="Leave blank if none" />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Rectified Receipt Amount (RWF) (if any)</label>
            <input type="number" step="0.01" name="rectifiedReceiptAmount"
              value={formData.rectifiedReceiptAmount || ''} onChange={handleChange}
              style={inputStyle} placeholder="Leave blank if none" />
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

          <div style={fieldStyle}>
            <label style={labelStyle}>Rectified Date (if any)</label>
            <div style={{ position: 'relative' }}>
              <Calendar size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input type="date" name="rectifiedDate"
                value={formData.rectifiedDate} onChange={handleChange}
                style={{ ...inputStyle, paddingLeft: '36px' }} />
            </div>
          </div>

          <div style={{ ...fieldStyle, gridColumn: 'span 2' }}>
            <label style={labelStyle}>Reason for Cancellation (details) *</label>
            <textarea name="reasonForCancellation" required
              value={formData.reasonForCancellation} onChange={handleChange}
              rows="3" style={{ ...inputStyle, resize: 'none' }}
              placeholder="Provide full details for the cancellation request..." />
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
          style={{ flex: 2, padding: '1rem', backgroundColor: '#1b669e', color: '#ffffff', border: 'none', borderRadius: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', boxShadow: '0 4px 6px -1px rgba(27, 102, 158, 0.2)', cursor: 'pointer' }}>
          <Save size={18} />
          {loading ? 'Submitting...' : 'Submit Cancellation Request'}
        </button>
      </div>

    </form>
  );
};

export default CancellationFormFields;
