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
      </div>
      <div>
        <IncidentDetailsView data={data} onExport={downloadPDF} />
      </div>
    </div>
  );
};



export default IncidentDetail;
