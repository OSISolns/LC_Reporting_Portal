import { useState } from 'react';
import { 
  ShieldCheck, FileCheck, CheckCircle, AlertTriangle, 
  Calendar, Award, Building, User
} from 'lucide-react';

const MOCK_LICENSES = [
  { id: 'LIC-001', staff: 'Dr. Jane Smith', role: 'Consultant', licenseType: 'Medical Council Reg', expiry: '2026-07-15', status: 'Expiring Soon' },
  { id: 'LIC-002', staff: 'Nurse John Doe', role: 'RN', licenseType: 'Nursing Board Cert', expiry: '2026-11-20', status: 'Valid' },
  { id: 'LIC-003', staff: 'Dr. Alan Wake', role: 'Surgeon', licenseType: 'Medical Council Reg', expiry: '2026-06-18', status: 'Critical' },
];

const MOCK_FACILITIES = [
  { id: 'CERT-01', name: 'Fire Safety Certificate', issuer: 'National Police', expiry: '2027-01-10', status: 'Valid' },
  { id: 'CERT-02', name: 'Radiation Safety (X-Ray)', issuer: 'MOH', expiry: '2026-08-05', status: 'Expiring Soon' },
];

const getStatusColor = (status) => {
  if (status === 'Valid') return { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' };
  if (status === 'Expiring Soon') return { bg: '#fff7ed', color: '#ea580c', border: '#fed7aa' };
  return { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' };
};

const CompliancePortal = () => {
  const upcomingAuditProgress = 75;

  return (
    <div style={{ paddingBottom: '3rem' }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <p style={{ margin: '0 0 4px', fontSize: '0.85rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quality Assurance</p>
          <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 800, color: 'var(--primary-dark)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <ShieldCheck size={32} style={{ color: 'var(--primary)' }} /> Compliance & Audit Portal
          </h1>
        </div>
      </div>

      {/* ── Upcoming Audit Hero ── */}
      <div style={{ backgroundColor: 'var(--primary-dark)', borderRadius: '24px', padding: '2rem', color: '#fff', marginBottom: '2rem', boxShadow: '0 10px 25px rgba(0,59,68,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1rem' }}>
          <div>
            <span style={{ padding: '4px 12px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Major Audit Incoming</span>
            <h2 style={{ margin: '12px 0 4px', fontSize: '1.75rem', fontWeight: 800 }}>MOH Annual Facility Inspection</h2>
            <p style={{ margin: 0, opacity: 0.8, fontSize: '0.9rem' }}><Calendar size={14} style={{ display: 'inline', marginRight: '4px' }}/> Scheduled for: <strong>July 05, 2026</strong></p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '2.5rem', fontWeight: 800 }}>{upcomingAuditProgress}%</span>
            <p style={{ margin: 0, opacity: 0.8, fontSize: '0.85rem', fontWeight: 600 }}>Readiness Score</p>
          </div>
        </div>
        <div style={{ height: '10px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '99px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${upcomingAuditProgress}%`, backgroundColor: '#10b981', borderRadius: '99px' }} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
        
        {/* ── Staff Licenses Tracker ── */}
        <div style={{ backgroundColor: '#fff', borderRadius: '20px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <User size={20} style={{ color: '#0369a1' }} />
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary-dark)' }}>Staff Credentialing & Licenses</h3>
          </div>
          <div style={{ padding: '0 1rem' }}>
            {MOCK_LICENSES.map(lic => {
              const style = getStatusColor(lic.status);
              return (
                <div key={lic.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderBottom: '1px solid #f1f5f9' }}>
                  <div>
                    <h4 style={{ margin: '0 0 4px', fontSize: '0.95rem', fontWeight: 700, color: 'var(--primary-dark)' }}>{lic.staff}</h4>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>{lic.licenseType} · Expiry: <strong>{lic.expiry}</strong></p>
                  </div>
                  <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800, backgroundColor: style.bg, color: style.color, border: `1px solid ${style.border}` }}>
                    {lic.status}
                  </span>
                </div>
              );
            })}
          </div>
          <div style={{ padding: '1rem', backgroundColor: '#f8fafc', textAlign: 'center', borderTop: '1px solid #f1f5f9' }}>
            <button style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>View All Staff Credentials</button>
          </div>
        </div>

        {/* ── Facility Certifications ── */}
        <div style={{ backgroundColor: '#fff', borderRadius: '20px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Building size={20} style={{ color: '#b91c1c' }} />
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary-dark)' }}>Facility Certifications</h3>
          </div>
          <div style={{ padding: '1rem' }}>
            {MOCK_FACILITIES.map(cert => {
              const style = getStatusColor(cert.status);
              return (
                <div key={cert.id} style={{ backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.25rem', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Award size={18} style={{ color: 'var(--primary)' }} />
                      <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--primary-dark)' }}>{cert.name}</h4>
                    </div>
                    <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800, backgroundColor: style.bg, color: style.color }}>
                      {cert.status}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>Issued by: {cert.issuer} | Expires: <strong>{cert.expiry}</strong></p>
                  
                  {cert.status !== 'Valid' && (
                    <button style={{ marginTop: '12px', width: '100%', padding: '8px', backgroundColor: '#fff', border: `1px solid ${style.border}`, borderRadius: '8px', color: style.color, fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>
                      Initiate Renewal Process
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};

export default CompliancePortal;
