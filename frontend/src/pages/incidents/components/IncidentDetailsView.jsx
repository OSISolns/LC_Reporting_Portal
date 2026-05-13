import { useState } from 'react';
import { Download, ShieldCheck, CheckCircle, MessageSquare, ShieldAlert, Clock, Plus, Trash2, Info } from 'lucide-react';
import { PrintHeader, PrintFooter, PrintWatermark } from '../../../components/PrintBranding';
import { useAuth } from '../../../context/AuthContext';
import { approveIncident } from '../../../api/incidents';

// Status badge helper
const StatusBadge = ({ status }) => {
  const cfg = {
    pending:  { bg: 'rgba(234,179,8,0.1)',   border: 'rgba(234,179,8,0.25)',   color: '#854d0e', label: '⏳ Pending HSFP Analysis' },
    approved: { bg: 'rgba(22,163,74,0.1)',   border: 'rgba(22,163,74,0.25)',   color: '#15803d', label: '✅ HSFP Approved' },
    reviewed: { bg: 'rgba(22,163,74,0.1)',   border: 'rgba(22,163,74,0.25)',   color: '#15803d', label: '✅ HSFP Reviewed' },
  };
  const c = cfg[status] || cfg.pending;
  return (
    <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700, background: c.bg, border: `1px solid ${c.border}`, color: c.color }}>
      {c.label}
    </span>
  );
};

const IncidentDetailsView = ({ data, onReviewComplete, onExport }) => {
  const { user } = useAuth();
  const [mode, setMode] = useState(null); // 'approve'
  const [comments, setComments] = useState('');
  
  // Structured RCA Fields
  const [rcaEnv, setRcaEnv] = useState('');
  const [rcaStaff, setRcaStaff] = useState('');
  const [rcaEquip, setRcaEquip] = useState('');
  const [rcaPolicy, setRcaPolicy] = useState('');
  
  const [verificationRows, setVerificationRows] = useState([{ factor: '', test: '', result: '' }]);
  const [actionPlanRows, setActionPlanRows] = useState([{ objective: '', activity: '', timeline: '', resp: '' }]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!data) return null;

  const isHSFP = user?.role === 'hsfp';
  const isPending  = data.status === 'pending';
  const isApproved = data.status === 'approved';

  const handleAction = async () => {
    setError('');
    if (!comments.trim()) {
      setError('HSFP summary assessment is mandatory before approving.');
      return;
    }
    setSubmitting(true);
    try {
      await approveIncident(data.id, {
        comments,
        rca_environment: rcaEnv,
        rca_staff: rcaStaff,
        rca_equipment: rcaEquip,
        rca_policy: rcaPolicy,
        rca_verification_json: JSON.stringify(verificationRows),
        corrective_actions_json: JSON.stringify(actionPlanRows)
      });
      if (onReviewComplete) onReviewComplete();
      setMode(null);
      setComments('');
    } catch (err) {
      setError(err.response?.data?.message || 'Approval failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const addRow = (type) => {
    if (type === 'v') setVerificationRows([...verificationRows, { factor: '', test: '', result: '' }]);
    else setActionPlanRows([...actionPlanRows, { objective: '', activity: '', timeline: '', resp: '' }]);
  };

  const removeRow = (type, idx) => {
    if (type === 'v') setVerificationRows(verificationRows.filter((_, i) => i !== idx));
    else setActionPlanRows(actionPlanRows.filter((_, i) => i !== idx));
  };

  const updateRow = (type, idx, field, val) => {
    if (type === 'v') {
      const nr = [...verificationRows];
      nr[idx][field] = val;
      setVerificationRows(nr);
    } else {
      const nr = [...actionPlanRows];
      nr[idx][field] = val;
      setActionPlanRows(nr);
    }
  };

  // Parsing JSON data if it exists
  let parsedVerification = [];
  let parsedActions = [];
  try {
    if (data.rca_verification_json) parsedVerification = JSON.parse(data.rca_verification_json);
    if (data.corrective_actions_json) parsedActions = JSON.parse(data.corrective_actions_json);
  } catch(e) {}

  return (
    <div className="print-body-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', position: 'relative' }}>
      <PrintHeader title="Incident & Sentinel Event Report" docType="INC" docId={data.id} issuedAt={data.approved_at || data.created_at} alwaysVisible={true} />
      <PrintWatermark />

      {isApproved && (
        <div className="medical-stamp">
          <img src="/stamps/verified.png" alt="APPROVED" />
        </div>
      )}

      <div className="medical-form-modern">
        {/* Section 1: Identification */}
        <div className="medical-form-section-head">Section 1: INCIDENT IDENTIFICATION</div>
        <table className="medical-form-table">
          <tbody>
            <tr><th>Date of Report</th><td>{new Date(data.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</td></tr>
            <tr><th>Incident Type</th><td style={{ fontWeight: 800, color: '#b91c1c' }}>{data.incident_type}</td></tr>
            <tr><th>Department / Unit</th><td>{data.department}</td></tr>
            <tr><th>Area of Incident</th><td>{data.area_of_incident}</td></tr>
            <tr><th>Individuals Involved</th><td>{data.names_involved}</td></tr>
            <tr><th>Patient PID (if applicable)</th><td>{data.pid_number || 'N/A'}</td></tr>
            <tr><th>Status</th><td><StatusBadge status={data.status} /></td></tr>
          </tbody>
        </table>

        {/* Section 2: Narrative Analysis */}
        <div className="medical-form-section-head">Section 2: NARRATIVE SUMMARY</div>
        <table className="medical-form-table">
          <tbody>
            <tr><th>Description of Event</th><td>{data.description}</td></tr>
            <tr><th>Contributing Factors</th><td>{data.contributing_factors}</td></tr>
            <tr><th>Immediate Actions Taken</th><td>{data.immediate_actions}</td></tr>
            <tr><th>Prevention Measures</th><td>{data.prevention_measures}</td></tr>
          </tbody>
        </table>

        {/* Section 3: Root Cause Analysis (HSFP Analysis) */}
        {isApproved && (
          <>
            <div className="medical-form-section-head">Section 3: ROOT CAUSE ANALYSIS (FISHBONE FRAMEWORK)</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                <h4 style={{ margin: '0 0 8px', fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase' }}>Environment / External</h4>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#1e293b' }}>{data.rca_environment || 'No external factors identified.'}</p>
              </div>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                <h4 style={{ margin: '0 0 8px', fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase' }}>Staff / Training</h4>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#1e293b' }}>{data.rca_staff || 'No staff factors identified.'}</p>
              </div>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                <h4 style={{ margin: '0 0 8px', fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase' }}>Equipment / Hardware</h4>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#1e293b' }}>{data.rca_equipment || 'No equipment factors identified.'}</p>
              </div>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                <h4 style={{ margin: '0 0 8px', fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase' }}>Policy / Protocol</h4>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#1e293b' }}>{data.rca_policy || 'No policy factors identified.'}</p>
              </div>
            </div>

            {parsedVerification.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>VERIFICATION OF CONTRIBUTING FACTORS</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #e2e8f0' }}>Potential Cause</th>
                      <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #e2e8f0' }}>Test Method</th>
                      <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #e2e8f0' }}>Result / Acceptance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedVerification.map((v, i) => (
                      <tr key={i} style={{ border: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '8px', border: '1px solid #e2e8f0' }}>{v.factor}</td>
                        <td style={{ padding: '8px', border: '1px solid #e2e8f0' }}>{v.test}</td>
                        <td style={{ padding: '8px', border: '1px solid #e2e8f0', fontWeight: 600 }}>{v.result}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="medical-form-section-head">Section 4: CORRECTIVE ACTION PLAN (CAP)</div>
            {parsedActions.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #e2e8f0' }}>Objective</th>
                    <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #e2e8f0' }}>Key Activity</th>
                    <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #e2e8f0' }}>Timeline</th>
                    <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #e2e8f0' }}>Resp. Party</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedActions.map((a, i) => (
                    <tr key={i} style={{ border: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '8px', border: '1px solid #e2e8f0', fontWeight: 600 }}>{a.objective}</td>
                      <td style={{ padding: '8px', border: '1px solid #e2e8f0' }}>{a.activity}</td>
                      <td style={{ padding: '8px', border: '1px solid #e2e8f0' }}>{a.timeline}</td>
                      <td style={{ padding: '8px', border: '1px solid #e2e8f0' }}>{a.resp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ fontStyle: 'italic', color: '#64748b' }}>No specific corrective action plan documented.</p>
            )}

            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '14px', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase', marginBottom: '4px' }}>HSFP Summary Conclusion</div>
              <p style={{ margin: 0, fontSize: '0.95rem', color: '#14532d', fontStyle: 'italic' }}>"{data.hsfp_comments}"</p>
            </div>
          </>
        )}

        {/* Section 5: Authorization */}
        <div className="medical-form-section-head">Section 5: AUTHORIZATION & OFFICIAL SIGNATURES</div>
        <div className="medical-signature-grid">
          <div className="medical-signature-box">
            <div className="medical-signature-label">Reported By</div>
            <div className="medical-signature-line">{data.creator_name}</div>
            <div className="medical-stamp-area">Digital ID: {data.created_by || 'REGISTERED_STAFF'}</div>
          </div>

          <div className="medical-signature-box" style={{ flex: 2 }}>
            <div className="medical-signature-label">H.S.F.P Approval & Safety Validation</div>
            <div className="medical-signature-line" style={{ color: isApproved ? '#15803d' : '#cbd5e1' }}>
              {isApproved ? `APPROVED: ${data.approver_name}` : 'PENDING HSFP APPROVAL'}
            </div>
            <div className="medical-stamp-area">{data.approved_at ? new Date(data.approved_at).toLocaleDateString() : 'Awaiting HSFP Analysis'}</div>
          </div>
        </div>
      </div>

      {/* ── Action Panel ───────────────────────────────────────────────── */}
      <div className="no-print" style={{ marginTop: '1rem', padding: '1.5rem', background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        
        {/* Progress Tracker */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: '0.5rem', maxWidth: '400px' }}>
          {[
            { key: 'pending',  icon: <Clock size={14} />,      label: 'Reported' },
            { key: 'approved', icon: <CheckCircle size={14} />, label: 'HSFP Approved' },
          ].map((step, i, arr) => {
            const stages = ['pending', 'approved'];
            const active  = stages.indexOf(data.status) >= i;
            const current = stages.indexOf(data.status) === i;
            return (
              <div key={step.key} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: active ? (current ? '#3b82f6' : '#22c55e') : '#e2e8f0', color: active ? '#fff' : '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, transition: 'all 0.3s' }}>
                    {step.icon}
                  </div>
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, color: active ? '#1e293b' : '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'center' }}>{step.label}</span>
                </div>
                {i < arr.length - 1 && <div style={{ flex: 1, height: 2, background: stages.indexOf(data.status) > i ? '#22c55e' : '#e2e8f0', marginBottom: 20, transition: 'all 0.3s' }} />}
              </div>
            );
          })}
        </div>

        {error && <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#b91c1c', fontSize: '0.85rem', display: 'flex', gap: 8, alignItems: 'center' }}><ShieldAlert size={15} /> {error}</div>}

        {/* HSFP Approval Flow */}
        {isHSFP && isPending && !mode && (
          <div style={{ padding: '1.25rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1rem' }}>
              <ShieldAlert size={20} style={{ color: '#15803d' }} />
              <div>
                <p style={{ margin: 0, fontWeight: 700, color: '#14532d' }}>HSFP Analysis Required</p>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#166534' }}>As the Health & Safety Focal Person, you must provide a structured RCA and CAP for final approval.</p>
              </div>
            </div>
            <button onClick={() => setMode('approve')} style={{ width: '100%', padding: '0.85rem', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>
              <Plus size={18} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} /> Initiate Structured Analysis & Approve
            </button>
          </div>
        )}

        {/* HSFP STRUCTURED FORM */}
        {mode === 'approve' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', background: '#ffffff', padding: '1.5rem', borderRadius: 12, border: '2px solid #22c55e' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8, color: '#14532d' }}><Info size={20} /> HSFP ROOT CAUSE ANALYSIS (RCA)</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>ENVIRONMENT / EXTERNAL</label>
                <textarea value={rcaEnv} onChange={e => setRcaEnv(e.target.value)} placeholder="e.g. Weather, Utility Grid..." rows={2} style={{ padding: '10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.9rem' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>STAFF / TRAINING</label>
                <textarea value={rcaStaff} onChange={e => setRcaStaff(e.target.value)} placeholder="e.g. Handling procedures..." rows={2} style={{ padding: '10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.9rem' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>EQUIPMENT / TOOLS</label>
                <textarea value={rcaEquip} onChange={e => setRcaEquip(e.target.value)} placeholder="e.g. Hardware failure, maintenance..." rows={2} style={{ padding: '10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.9rem' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>POLICY / PROCESS</label>
                <textarea value={rcaPolicy} onChange={e => setRcaPolicy(e.target.value)} placeholder="e.g. Handover protocols..." rows={2} style={{ padding: '10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.9rem' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>VERIFICATION TABLE</label>
                <button type="button" onClick={() => addRow('v')} style={{ background: 'none', border: 'none', color: '#1d4ed8', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>+ Add Row</button>
              </div>
              {verificationRows.map((row, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input value={row.factor} onChange={e => updateRow('v', i, 'factor', e.target.value)} placeholder="Cause" style={{ flex: 1, padding: 8, border: '1px solid #e2e8f0', borderRadius: 6 }} />
                  <input value={row.test} onChange={e => updateRow('v', i, 'test', e.target.value)} placeholder="Test" style={{ flex: 1, padding: 8, border: '1px solid #e2e8f0', borderRadius: 6 }} />
                  <input value={row.result} onChange={e => updateRow('v', i, 'result', e.target.value)} placeholder="Result" style={{ flex: 1, padding: 8, border: '1px solid #e2e8f0', borderRadius: 6 }} />
                  <button onClick={() => removeRow('v', i)} style={{ background: 'none', border: 'none', color: '#ef4444' }}><Trash2 size={16} /></button>
                </div>
              ))}
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>CORRECTIVE ACTION PLAN (CAP)</label>
                <button type="button" onClick={() => addRow('a')} style={{ background: 'none', border: 'none', color: '#1d4ed8', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>+ Add Row</button>
              </div>
              {actionPlanRows.map((row, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input value={row.objective} onChange={e => updateRow('a', i, 'objective', e.target.value)} placeholder="Objective" style={{ flex: 1, padding: 8, border: '1px solid #e2e8f0', borderRadius: 6 }} />
                  <input value={row.activity} onChange={e => updateRow('a', i, 'activity', e.target.value)} placeholder="Activity" style={{ flex: 1, padding: 8, border: '1px solid #e2e8f0', borderRadius: 6 }} />
                  <input value={row.timeline} onChange={e => updateRow('a', i, 'timeline', e.target.value)} placeholder="Timeline" style={{ width: 100, padding: 8, border: '1px solid #e2e8f0', borderRadius: 6 }} />
                  <input value={row.resp} onChange={e => updateRow('a', i, 'resp', e.target.value)} placeholder="Resp." style={{ width: 80, padding: 8, border: '1px solid #e2e8f0', borderRadius: 6 }} />
                  <button onClick={() => removeRow('a', i)} style={{ background: 'none', border: 'none', color: '#ef4444' }}><Trash2 size={16} /></button>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>SUMMARY CONCLUSION (MANDATORY)</label>
              <textarea value={comments} onChange={e => setComments(e.target.value)} placeholder="Provide final HSFP assessment..." rows={3} style={{ padding: '12px', borderRadius: 8, border: '2px solid #22c55e', fontSize: '0.9rem', background: '#f0fdf4' }} />
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={handleAction} disabled={submitting} style={{ flex: 1, padding: '0.85rem', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>
                {submitting ? 'Finalizing...' : 'Submit Analysis & Approve'}
              </button>
              <button onClick={() => setMode(null)} style={{ padding: '0.85rem 1.5rem', background: '#e2e8f0', border: 'none', borderRadius: 8, fontWeight: 600 }}>Cancel</button>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={() => onExport && onExport()} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.65rem 1.25rem', background: '#fff', color: '#1e293b', border: '1.5px solid #e2e8f0', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>
            <Download size={17} /> Download Official PDF
          </button>
        </div>
      </div>

      <PrintFooter />
    </div>
  );
};

export default IncidentDetailsView;
