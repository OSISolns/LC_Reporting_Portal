import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getIncidentById, getIncidentPDF } from '../../api/incidents';
import { ChevronLeft, Download, Printer } from 'lucide-react';
import LoadingSpinner from '../../components/LoadingSpinner';
import IncidentDetailsView from './components/IncidentDetailsView';

const IncidentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const res = await getIncidentById(id);
      setData(res.data.data);
    } catch (err) {
      console.error('Failed to fetch incident details');
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async () => {
    try {
      const res = await getIncidentPDF(id);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Incident_${data.id}.pdf`);
      document.body.appendChild(link);
      link.click();
    } catch (err) { alert('PDF generation failed'); }
  };

  const handlePrint = () => {
    document.body.setAttribute('data-print-date', new Date().toLocaleString());
    window.print();
  };

  if (loading) return <LoadingSpinner />;
  if (!data) return <div>Report not found</div>;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem' }}>
        <div>
          <button onClick={() => navigate(-1)} className="no-print" style={{ background: 'none', border: 'none', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.5rem', fontWeight: 600, cursor: 'pointer' }}>
            <ChevronLeft size={20} />
            Back to Dashboard
          </button>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 700, color: 'var(--primary-dark)' }}>Incident Report #{data.id}</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '8px', fontSize: '1rem' }}>Historical record of a reported quality or safety event.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={handlePrint} className="glass card-shadow no-print" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0.875rem 1.5rem', backgroundColor: '#f8fafc', color: 'var(--primary-dark)', border: '1.5px solid var(--border-color)', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}>
            <Printer size={18} />
            Print Report
          </button>
          <button onClick={downloadPDF} className="glass card-shadow no-print" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0.875rem 1.5rem', backgroundColor: '#ffffff', color: 'var(--danger)', border: '1.5px solid var(--danger)', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--danger)'; e.currentTarget.style.color = '#ffffff'; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; e.currentTarget.style.color = 'var(--danger)'; }}>
            <Download size={18} />
            Export PDF
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: id === 'new' ? '1fr' : '2fr 1fr', gap: '2rem' }}>
        <IncidentDetailsView data={data} onExport={downloadPDF} />
        
        <div className="no-print">
          <div className="glass card-shadow" style={{ padding: '2rem', backgroundColor: '#ffffff', position: 'sticky', top: '2rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary-dark)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShieldCheck size={20} style={{ color: 'var(--danger)' }} />
              Report Actions
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <button 
                onClick={handlePrint} 
                className="glass card-shadow" 
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '0.875rem', backgroundColor: '#f8fafc', color: 'var(--primary-dark)', border: '1.5px solid var(--border-color)', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}
              >
                <Printer size={18} />
                Print Requisition
              </button>
              <button 
                onClick={downloadPDF} 
                className="glass card-shadow" 
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '0.875rem', backgroundColor: 'var(--danger)', color: '#ffffff', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}
              >
                <Download size={18} />
                Export official PDF
              </button>
            </div>
            <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>This report is a permanent clinical record. Printing or exporting generates an official document with the clinic's digital signature.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

import { ShieldCheck } from 'lucide-react';



export default IncidentDetail;
