import { useState } from 'react';
import { 
  ShieldAlert, Plus, Shield, ShieldCheck, 
  AlertOctagon, X, Search, Filter,
  Activity, ArrowUpRight, TrendingDown
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const MOCK_RISKS = [
  { id: 'RSK-001', title: 'Medication Dispensing Error Risk', category: 'Clinical', likelihood: 3, impact: 4, status: 'Active', owner: 'Pharmacy Lead', date: '2026-06-10' },
  { id: 'RSK-002', title: 'Backup Generator Failure', category: 'Operational', likelihood: 2, impact: 5, status: 'Mitigated', owner: 'Facilities Manager', date: '2026-05-22' },
  { id: 'RSK-003', title: 'Data Privacy Breach - Phishing', category: 'IT & Security', likelihood: 4, impact: 4, status: 'Active', owner: 'IT Director', date: '2026-06-12' },
  { id: 'RSK-004', title: 'Shortage of PPE in Ward B', category: 'Supply Chain', likelihood: 4, impact: 3, status: 'Active', owner: 'Stock Manager', date: '2026-06-14' },
];

const CATEGORIES = ['Clinical', 'Operational', 'IT & Security', 'Financial', 'Supply Chain', 'Compliance'];

const getRiskLevel = (likelihood, impact) => {
  const score = likelihood * impact;
  if (score >= 15) return { label: 'Critical', color: '#b91c1c', bg: '#fef2f2' };
  if (score >= 10) return { label: 'High', color: '#c2410c', bg: '#fff7ed' };
  if (score >= 5) return { label: 'Medium', color: '#ca8a04', bg: '#fefce8' };
  return { label: 'Low', color: '#15803d', bg: '#f0fdf4' };
};

const RiskRegister = () => {
  const { user } = useAuth();
  const [risks, setRisks] = useState(MOCK_RISKS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filter, setFilter] = useState('All');
  
  // Form State
  const [formData, setFormData] = useState({
    title: '', category: 'Clinical', likelihood: 3, impact: 3, owner: '', mitigation: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const newRisk = {
      id: `RSK-00${risks.length + 1}`,
      title: formData.title,
      category: formData.category,
      likelihood: parseInt(formData.likelihood),
      impact: parseInt(formData.impact),
      status: 'Active',
      owner: formData.owner,
      date: new Date().toISOString().split('T')[0]
    };
    setRisks([newRisk, ...risks]);
    setIsModalOpen(false);
    setFormData({ title: '', category: 'Clinical', likelihood: 3, impact: 3, owner: '', mitigation: '' });
  };

  const filteredRisks = filter === 'All' ? risks : risks.filter(r => r.category === filter);

  const activeRisksCount = risks.filter(r => r.status === 'Active').length;
  const criticalRisksCount = risks.filter(r => (r.likelihood * r.impact) >= 15 && r.status === 'Active').length;

  return (
    <div style={{ paddingBottom: '3rem' }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <p style={{ margin: '0 0 4px', fontSize: '0.85rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Safety & Quality Assurance</p>
          <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 800, color: 'var(--primary-dark)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <ShieldAlert size={32} style={{ color: 'var(--primary)' }} /> Enterprise Risk Register
          </h1>
        </div>
        <button onClick={() => setIsModalOpen(true)} style={{ padding: '0.75rem 1.5rem', backgroundColor: 'var(--primary-dark)', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,59,68,0.2)' }}>
          <Plus size={20} /> Log New Risk
        </button>
      </div>

      {/* ── KPI Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '20px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: '#f0f9ff', color: '#0369a1' }}><Activity size={24} /></div>
          <div>
            <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>TOTAL ACTIVE RISKS</p>
            <p style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary-dark)' }}>{activeRisksCount}</p>
          </div>
        </div>
        <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '20px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: '#fef2f2', color: '#b91c1c' }}><AlertOctagon size={24} /></div>
          <div>
            <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>CRITICAL RISKS</p>
            <p style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: '#b91c1c' }}>{criticalRisksCount}</p>
          </div>
        </div>
        <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '20px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: '#f0fdf4', color: '#15803d' }}><ShieldCheck size={24} /></div>
          <div>
            <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>MITIGATED (30 DAYS)</p>
            <p style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: '#15803d' }}>{risks.length - activeRisksCount}</p>
          </div>
        </div>
      </div>

      {/* ── Main Content Area ── */}
      <div style={{ backgroundColor: '#fff', borderRadius: '20px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary-dark)' }}>Risk Matrix Tracker</h2>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <select value={filter} onChange={e => setFilter(e.target.value)} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', fontWeight: 600, color: 'var(--primary-dark)' }}>
              <option value="All">All Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                <th style={{ padding: '1.25rem 2rem', fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Risk ID / Title</th>
                <th style={{ padding: '1.25rem 1rem', fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Category</th>
                <th style={{ padding: '1.25rem 1rem', fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Score (L x I)</th>
                <th style={{ padding: '1.25rem 1rem', fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Level</th>
                <th style={{ padding: '1.25rem 1rem', fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Owner</th>
                <th style={{ padding: '1.25rem 2rem', fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredRisks.map(risk => {
                const level = getRiskLevel(risk.likelihood, risk.impact);
                return (
                  <tr key={risk.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }}>
                    <td style={{ padding: '1.25rem 2rem' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', marginBottom: '4px' }}>{risk.id}</div>
                      <div style={{ fontWeight: 700, color: 'var(--primary-dark)' }}>{risk.title}</div>
                    </td>
                    <td style={{ padding: '1.25rem 1rem', fontSize: '0.9rem', color: '#475569', fontWeight: 500 }}>{risk.category}</td>
                    <td style={{ padding: '1.25rem 1rem', fontSize: '1rem', fontWeight: 800, color: 'var(--primary-dark)' }}>
                      {risk.likelihood * risk.impact} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#94a3b8' }}>({risk.likelihood}x{risk.impact})</span>
                    </td>
                    <td style={{ padding: '1.25rem 1rem' }}>
                      <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800, backgroundColor: level.bg, color: level.color }}>
                        {level.label}
                      </span>
                    </td>
                    <td style={{ padding: '1.25rem 1rem', fontSize: '0.9rem', color: '#475569', fontWeight: 500 }}>{risk.owner}</td>
                    <td style={{ padding: '1.25rem 2rem' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '99px', fontSize: '0.8rem', fontWeight: 700, backgroundColor: risk.status === 'Active' ? '#fff7ed' : '#f0fdf4', color: risk.status === 'Active' ? '#ea580c' : '#16a34a', border: `1px solid ${risk.status === 'Active' ? '#fed7aa' : '#bbf7d0'}` }}>
                        {risk.status === 'Active' ? <Activity size={14} /> : <ShieldCheck size={14} />} {risk.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Create Risk Modal ── */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '24px', width: '100%', maxWidth: '600px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem 2rem', background: 'var(--primary-dark)', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}><Shield size={20} /> Identify New Risk</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '4px' }}><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSubmit} style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>RISK TITLE</label>
                <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Describe the risk..." style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.95rem' }} />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>CATEGORY</label>
                  <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.95rem', backgroundColor: '#fff' }}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>RISK OWNER</label>
                  <input required value={formData.owner} onChange={e => setFormData({...formData, owner: e.target.value})} placeholder="Responsible person/role..." style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.95rem' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', background: '#f8fafc', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary-dark)', marginBottom: '8px' }}>LIKELIHOOD (1-5)</label>
                  <input type="range" min="1" max="5" value={formData.likelihood} onChange={e => setFormData({...formData, likelihood: e.target.value})} style={{ width: '100%' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginTop: '4px' }}>
                    <span>Rare (1)</span><span>Almost Certain (5)</span>
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary-dark)', marginBottom: '8px' }}>IMPACT (1-5)</label>
                  <input type="range" min="1" max="5" value={formData.impact} onChange={e => setFormData({...formData, impact: e.target.value})} style={{ width: '100%' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginTop: '4px' }}>
                    <span>Negligible (1)</span><span>Catastrophic (5)</span>
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>PROPOSED MITIGATION STRATEGY</label>
                <textarea rows="3" value={formData.mitigation} onChange={e => setFormData({...formData, mitigation: e.target.value})} placeholder="What controls will be implemented?" style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.95rem', fontFamily: 'inherit' }} />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ flex: 1, padding: '1rem', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ flex: 2, padding: '1rem', backgroundColor: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}>Register Risk</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RiskRegister;
