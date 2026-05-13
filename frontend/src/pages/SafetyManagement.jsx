import { useState, useEffect } from 'react';
import { Plus, FileText, Calendar, User, Trash2, ChevronRight, Layout, PenTool, Save, X, Info, Download } from 'lucide-react';
import { getSafetyReports, createSafetyReport, deleteSafetyReport, getSafetyPDF } from '../api/safety';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../context/AuthContext';

const SafetyManagement = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('list'); // 'list' or 'create' or 'view'
  const [selectedReport, setSelectedReport] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    periodStart: '',
    periodEnd: '',
    executiveSummary: '',
    keyFindings: '',
    recommendations: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const loadReports = async () => {
    setLoading(true);
    try {
      const res = await getSafetyReports();
      setReports(res.data.data || []);
    } catch (e) {
      console.error('Failed to load safety reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadReports(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createSafetyReport(formData);
      setMode('list');
      setFormData({ title: '', periodStart: '', periodEnd: '', executiveSummary: '', keyFindings: '', recommendations: '' });
      loadReports();
    } catch (err) {
      alert('Failed to save report');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this report?')) return;
    try {
      await deleteSafetyReport(id);
      loadReports();
    } catch (e) {
      alert('Delete failed');
    }
  };

  const handleDownloadPDF = async (id, title) => {
    try {
      const res = await getSafetyPDF(id);
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${title.replace(/\s+/g, '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF Export failed:', err);
      alert('Failed to download PDF.');
    }
  };

  if (loading && mode === 'list') return <LoadingSpinner />;

  return (
    <div style={{ paddingBottom: '3rem' }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 800, color: 'var(--primary-dark)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <PenTool size={32} /> Safety Analysis Workspace
          </h1>
          <p style={{ margin: '8px 0 0', color: 'var(--text-secondary)', fontWeight: 500 }}>
            Analyze systemic clinical risks and author consolidated safety documents.
          </p>
        </div>
        {mode === 'list' && (
          <button onClick={() => setMode('create')} style={{ padding: '0.75rem 1.5rem', backgroundColor: '#003b44', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,59,68,0.2)' }}>
            <Plus size={20} /> Author New Report
          </button>
        )}
      </div>

      {mode === 'list' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {reports.length === 0 ? (
            <div style={{ gridColumn: '1/-1', padding: '5rem', textAlign: 'center', backgroundColor: '#fff', borderRadius: '24px', border: '1px dashed #cbd5e1' }}>
              <FileText size={64} style={{ margin: '0 auto 1.5rem', color: '#cbd5e1' }} />
              <h3 style={{ margin: 0, color: 'var(--primary-dark)' }}>No Safety Reports Found</h3>
              <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>Start by creating your first consolidated safety investigation.</p>
            </div>
          ) : (
            reports.map(report => (
              <div key={report.id} style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '1.5rem', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', transition: 'all 0.2s', cursor: 'pointer' }}
                onClick={() => { setSelectedReport(report); setMode('view'); }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'none'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div style={{ padding: '8px', borderRadius: '10px', backgroundColor: '#f0fdf4', color: '#16a34a' }}>
                    <Layout size={20} />
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={(e) => { e.stopPropagation(); handleDownloadPDF(report.id, report.title); }} style={{ padding: '6px', color: '#003b44', background: 'none', border: 'none', cursor: 'pointer' }} title="Download PDF"><Download size={18} /></button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(report.id); }} style={{ padding: '6px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }} title="Delete Report"><Trash2 size={18} /></button>
                  </div>
                </div>
                <h3 style={{ margin: '0 0 8px', fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary-dark)' }}>{report.title}</h3>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={14} /> {new Date(report.created_at).toLocaleDateString()}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><User size={14} /> {report.creator_name}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {mode === 'create' && (
        <div style={{ backgroundColor: '#fff', borderRadius: '24px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 15px 35px rgba(0,0,0,0.05)' }}>
          <div style={{ padding: '1.5rem 2rem', background: 'var(--primary-dark)', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>New Safety Analysis Document</h2>
            <button onClick={() => setMode('list')} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><X size={24} /></button>
          </div>
          <form onSubmit={handleSubmit} style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>
              <div style={{ gridColumn: 'span 1' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#64748b', marginBottom: '8px' }}>REPORT TITLE</label>
                <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="e.g. Monthly Safety Audit - May 2026" style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontSize: '0.95rem' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#64748b', marginBottom: '8px' }}>PERIOD START</label>
                <input type="date" required value={formData.periodStart} onChange={e => setFormData({...formData, periodStart: e.target.value})} style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontSize: '0.95rem' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#64748b', marginBottom: '8px' }}>PERIOD END</label>
                <input type="date" required value={formData.periodEnd} onChange={e => setFormData({...formData, periodEnd: e.target.value})} style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontSize: '0.95rem' }} />
              </div>
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 700, color: '#64748b', marginBottom: '8px' }}><Info size={16} /> EXECUTIVE SUMMARY</label>
              <textarea required value={formData.executiveSummary} onChange={e => setFormData({...formData, executiveSummary: e.target.value})} rows={4} placeholder="Summarize the overall safety climate and critical incidents during this period..." style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontSize: '0.95rem', lineHeight: '1.6' }} />
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 700, color: '#64748b', marginBottom: '8px' }}><PenTool size={16} /> KEY FINDINGS & RCA AGGREGATION</label>
              <textarea required value={formData.keyFindings} onChange={e => setFormData({...formData, keyFindings: e.target.value})} rows={6} placeholder="Detail systemic issues identified across multiple incidents. Group by Environment, Staff, etc." style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontSize: '0.95rem', lineHeight: '1.6' }} />
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 700, color: '#64748b', marginBottom: '8px' }}><Save size={16} /> RECOMMENDATIONS & POLICY CHANGES</label>
              <textarea required value={formData.recommendations} onChange={e => setFormData({...formData, recommendations: e.target.value})} rows={4} placeholder="What changes should the clinical board implement immediately?" style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontSize: '0.95rem', lineHeight: '1.6' }} />
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button type="submit" disabled={submitting} style={{ flex: 1, padding: '1rem', backgroundColor: '#003b44', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}>
                {submitting ? 'Saving Analysis...' : 'Publish Official Safety Report'}
              </button>
              <button type="button" onClick={() => setMode('list')} style={{ padding: '1rem 2.5rem', backgroundColor: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {mode === 'view' && selectedReport && (
        <div style={{ backgroundColor: '#fff', borderRadius: '24px', border: '1px solid #e2e8f0', padding: '3rem', maxWidth: '900px', margin: '0 auto', boxShadow: '0 10px 40px rgba(0,0,0,0.08)', position: 'relative' }}>
          <div style={{ position: 'absolute', top: '2rem', right: '2rem', display: 'flex', gap: '12px' }}>
            <button onClick={() => handleDownloadPDF(selectedReport.id, selectedReport.title)} style={{ padding: '8px 16px', borderRadius: '10px', background: '#003b44', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
              <Download size={18} /> Download PDF
            </button>
            <button onClick={() => setMode('list')} style={{ padding: '8px', borderRadius: '50%', background: '#f1f5f9', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={20} /></button>
          </div>
          
          <div style={{ textAlign: 'center', marginBottom: '3rem', borderBottom: '2px solid var(--primary)', paddingBottom: '2rem' }}>
            <img src="/logo.png" alt="Legacy Clinics" style={{ height: '50px', marginBottom: '1.5rem' }} />
            <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary-dark)', textTransform: 'uppercase' }}>Consolidated Safety Investigation</h1>
            <p style={{ margin: '8px 0 0', fontWeight: 700, color: 'var(--primary)' }}>Report Ref: #SR-{selectedReport.id}</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '3rem' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Period of Analysis</label>
              <p style={{ margin: '4px 0 0', fontWeight: 700, color: '#1e293b' }}>{new Date(selectedReport.period_start).toLocaleDateString()} — {new Date(selectedReport.period_end).toLocaleDateString()}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Investigator</label>
              <p style={{ margin: '4px 0 0', fontWeight: 700, color: '#1e293b' }}>{selectedReport.creator_name}</p>
            </div>
          </div>

          <div style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary-dark)', borderLeft: '4px solid var(--primary)', paddingLeft: '1rem', marginBottom: '1rem' }}>I. EXECUTIVE SUMMARY</h2>
            <div style={{ fontSize: '1rem', lineHeight: '1.7', color: '#334155', background: '#f8fafc', padding: '1.5rem', borderRadius: '12px' }}>{selectedReport.executive_summary}</div>
          </div>

          <div style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary-dark)', borderLeft: '4px solid var(--primary)', paddingLeft: '1rem', marginBottom: '1rem' }}>II. KEY FINDINGS</h2>
            <div style={{ fontSize: '1rem', lineHeight: '1.7', color: '#334155', whiteSpace: 'pre-wrap' }}>{selectedReport.key_findings}</div>
          </div>

          <div style={{ marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary-dark)', borderLeft: '4px solid var(--primary)', paddingLeft: '1rem', marginBottom: '1rem' }}>III. STRATEGIC RECOMMENDATIONS</h2>
            <div style={{ fontSize: '1rem', lineHeight: '1.7', color: '#14532d', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '1.5rem', borderRadius: '12px', fontWeight: 500 }}>{selectedReport.recommendations}</div>
          </div>

          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>Digitally Certified on</p>
              <p style={{ margin: 0, fontWeight: 700, color: '#1e293b' }}>{new Date(selectedReport.created_at).toLocaleDateString()}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ borderBottom: '1.5px solid #cbd5e1', width: '200px', marginBottom: '8px' }} />
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>Health & Safety Focal Person</p>
              <p style={{ margin: 0, fontWeight: 700, color: '#1e293b' }}>{selectedReport.creator_name}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SafetyManagement;
