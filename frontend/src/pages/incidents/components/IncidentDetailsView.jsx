import { AlertCircle, MapPin, Users, FileText, Calendar, Download, ShieldCheck } from 'lucide-react';

const LabelValue = ({ label, value }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
    <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--primary-dark)' }}>{value || '---'}</span>
  </div>
);

const DetailSection = ({ label, value, icon, color }) => (
  <div style={{ display: 'flex', gap: '15px' }}>
    <div style={{ flexShrink: 0, width: '36px', height: '36px', borderRadius: '10px', backgroundColor: `${color}15`, color: color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {icon}
    </div>
    <div style={{ flex: 1 }}>
      <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--primary-dark)', marginBottom: '4px' }}>{label}</h4>
      <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{value || 'Not specified.'}</p>
    </div>
  </div>
);

const IncidentDetailsView = ({ data, onExport }) => {
  if (!data) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ 
            padding: '6px 14px', 
            borderRadius: '20px', 
            fontSize: '0.75rem', 
            fontWeight: 700, 
            backgroundColor: 'rgba(220, 53, 69, 0.1)', 
            color: 'var(--danger)',
            border: '1px solid rgba(220, 53, 69, 0.2)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={14} />
            {data.incident_type} Incident
          </span>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Reported on {new Date(data.created_at).toLocaleString()}</span>
        </div>
        {onExport && (
          <button onClick={onExport} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: '#ffffff', color: 'var(--danger)', border: '1.5px solid var(--danger)', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>
            <Download size={16} />
            Export Details
          </button>
        )}
      </div>

      <div className="glass" style={{ padding: '2rem', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '2rem' }}>
          <LabelValue label="Department / Unit" value={data.department} />
          <LabelValue label="Area of Incident" value={data.area_of_incident} />
          <LabelValue label="Individuals Involved" value={data.names_involved} />
          <LabelValue label="Patient PID" value={data.pid_number} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <DetailSection label="Description" value={data.description} icon={<FileText size={18} />} color="var(--danger)" />
          <DetailSection label="Contributing Factors" value={data.contributing_factors} icon={<Users size={18} />} color="var(--info)" />
          <DetailSection label="Immediate Actions" value={data.immediate_actions} icon={<ShieldCheck size={18} />} color="var(--success)" />
          <DetailSection label="Prevention Measures" value={data.prevention_measures} icon={<AlertCircle size={18} />} color="var(--primary)" />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '15px', alignItems: 'center', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '12px' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--primary-dark)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1rem' }}>
          {data.reporter_name?.split(' ').map(n => n[0]).join('')}
        </div>
        <div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reporter</p>
          <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary-dark)' }}>{data.reporter_name}</p>
        </div>
      </div>
    </div>
  );
};

export default IncidentDetailsView;
