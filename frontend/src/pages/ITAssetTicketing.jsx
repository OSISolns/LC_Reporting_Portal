import { useState } from 'react';
import { 
  Monitor, LifeBuoy, Server, Wrench, 
  CheckCircle, AlertTriangle, Plus
} from 'lucide-react';

const MOCK_TICKETS = [
  { id: 'TKT-901', title: 'Printer in Ward B not working', reporter: 'Nurse Alice', category: 'Hardware', status: 'Open', priority: 'Medium', date: '2026-06-15' },
  { id: 'TKT-902', title: 'Cannot access E-Prescriptions module', reporter: 'Dr. Smith', category: 'Software', status: 'In Progress', priority: 'High', date: '2026-06-15' },
  { id: 'TKT-903', title: 'New laptop setup for HR', reporter: 'HR Admin', category: 'Provisioning', status: 'Resolved', priority: 'Low', date: '2026-06-13' },
];

const MOCK_ASSETS = [
  { id: 'AST-LTP-01', name: 'Dell Latitude 5520', assignedTo: 'Dr. Alan', department: 'Clinical', status: 'Active' },
  { id: 'AST-PRN-05', name: 'HP LaserJet Pro', assignedTo: 'Reception Desk', department: 'Operations', status: 'Needs Repair' },
];

const ITAssetTicketing = () => {
  const [activeTab, setActiveTab] = useState('tickets'); // 'tickets' or 'assets'

  return (
    <div style={{ paddingBottom: '3rem' }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <p style={{ margin: '0 0 4px', fontSize: '0.85rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>IT Infrastructure</p>
          <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 800, color: 'var(--primary-dark)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Server size={32} style={{ color: '#0ea5e9' }} /> IT Asset & Ticketing Hub
          </h1>
        </div>
        <button style={{ padding: '0.75rem 1.5rem', backgroundColor: '#0ea5e9', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(14,165,233,0.3)' }}>
          <Plus size={20} /> Create Ticket
        </button>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '2px solid #e2e8f0' }}>
        <button 
          onClick={() => setActiveTab('tickets')}
          style={{ padding: '0.75rem 1.5rem', background: 'none', border: 'none', borderBottom: activeTab === 'tickets' ? '3px solid #0ea5e9' : '3px solid transparent', fontSize: '1rem', fontWeight: 700, color: activeTab === 'tickets' ? '#0ea5e9' : '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <LifeBuoy size={18} /> Support Tickets
        </button>
        <button 
          onClick={() => setActiveTab('assets')}
          style={{ padding: '0.75rem 1.5rem', background: 'none', border: 'none', borderBottom: activeTab === 'assets' ? '3px solid #0ea5e9' : '3px solid transparent', fontSize: '1rem', fontWeight: 700, color: activeTab === 'assets' ? '#0ea5e9' : '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Monitor size={18} /> Asset Directory
        </button>
      </div>

      {/* ── Tickets View ── */}
      {activeTab === 'tickets' && (
        <div style={{ backgroundColor: '#fff', borderRadius: '20px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #f1f5f9', backgroundColor: '#f8fafc' }}>
                  <th style={{ padding: '1.25rem 2rem', fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Ticket ID & Issue</th>
                  <th style={{ padding: '1.25rem 1rem', fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Reporter</th>
                  <th style={{ padding: '1.25rem 1rem', fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Priority</th>
                  <th style={{ padding: '1.25rem 2rem', fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_TICKETS.map(ticket => (
                  <tr key={ticket.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '1.25rem 2rem' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', marginBottom: '4px' }}>{ticket.id} · {ticket.category}</div>
                      <div style={{ fontWeight: 700, color: 'var(--primary-dark)', fontSize: '0.95rem' }}>{ticket.title}</div>
                    </td>
                    <td style={{ padding: '1.25rem 1rem', fontSize: '0.9rem', color: '#475569', fontWeight: 500 }}>
                      {ticket.reporter}<br/>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{ticket.date}</span>
                    </td>
                    <td style={{ padding: '1.25rem 1rem' }}>
                      <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800, backgroundColor: ticket.priority === 'High' ? '#fef2f2' : ticket.priority === 'Medium' ? '#fff7ed' : '#f8fafc', color: ticket.priority === 'High' ? '#dc2626' : ticket.priority === 'Medium' ? '#ea580c' : '#64748b' }}>
                        {ticket.priority}
                      </span>
                    </td>
                    <td style={{ padding: '1.25rem 2rem' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '99px', fontSize: '0.8rem', fontWeight: 700, backgroundColor: ticket.status === 'Resolved' ? '#f0fdf4' : ticket.status === 'In Progress' ? '#e0f2fe' : '#fff', color: ticket.status === 'Resolved' ? '#16a34a' : ticket.status === 'In Progress' ? '#0284c7' : '#64748b', border: `1px solid ${ticket.status === 'Open' ? '#cbd5e1' : 'transparent'}` }}>
                        {ticket.status === 'Resolved' ? <CheckCircle size={14} /> : ticket.status === 'In Progress' ? <Wrench size={14} /> : <AlertTriangle size={14} />} 
                        {ticket.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Assets View ── */}
      {activeTab === 'assets' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {MOCK_ASSETS.map(asset => (
            <div key={asset.id} style={{ backgroundColor: '#fff', borderRadius: '20px', border: '1px solid #e2e8f0', padding: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}><Monitor size={20} style={{ color: '#475569' }}/></div>
                <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800, backgroundColor: asset.status === 'Active' ? '#f0fdf4' : '#fef2f2', color: asset.status === 'Active' ? '#16a34a' : '#dc2626' }}>
                  {asset.status}
                </span>
              </div>
              <h3 style={{ margin: '0 0 4px', fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary-dark)' }}>{asset.name}</h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>ID: {asset.id}</p>
              
              <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Assigned To</p>
                  <p style={{ margin: '2px 0 0', fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>{asset.assignedTo}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Department</p>
                  <p style={{ margin: '2px 0 0', fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>{asset.department}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ITAssetTicketing;
