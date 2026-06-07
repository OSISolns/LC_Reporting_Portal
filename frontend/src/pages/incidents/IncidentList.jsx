import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Plus, Search, AlertCircle, Eye, Download, Trash2 } from 'lucide-react';
import LoadingSpinner from '../../components/LoadingSpinner';
import Modal from '../../components/Modal';
import IncidentFormFields from './components/IncidentFormFields';
import IncidentDetailsView from './components/IncidentDetailsView';
import { 
  getIncidents, 
  getIncidentById, 
  createIncident, 
  deleteIncident,
  getIncidentPDF 
} from '../../api/incidents';

const IncidentList = () => {
  const { user, hasPermission } = useAuth();
  const [reports, setReports] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  const [filters, setFilters] = useState({ type: '', department: '' });

  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const totalPages = Math.ceil(reports.length / itemsPerPage);
  const paginatedReports = reports.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [activeIncident, setActiveIncident] = useState(null);
  const [formData, setFormData] = useState({
    incidentType: 'Patient', department: '', areaOfIncident: '', namesInvolved: '',
    pidNumber: '', description: '', contributingFactors: '',
    immediateActions: '', preventionMeasures: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [detailLoading,   setDetailLoading]   = useState(false);

  useEffect(() => {
    fetchReports();
  }, [filters]);

  const fetchReports = async () => {
    try {
      const res = await getIncidents(filters, user).catch(() => ({ data: { data: [] } }));
      setReports(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch incident reports');
    } finally {
      setLoading(false);
    }
  };

  const canReviewIncidents = hasPermission('incident_reports', 'review');
  const canCreateIncidents = hasPermission('incident_reports', 'create');

  const handleViewDetails = async (id) => {
    setActiveIncident(null);
    setIsViewModalOpen(true);
    setDetailLoading(true);
    try {
      const res = await getIncidentById(id);
      setActiveIncident(res.data.data);
    } catch (err) {
      console.error('Fetch failed');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createIncident(formData);
      setIsCreateModalOpen(false);
      fetchReports();
      setFormData({
        incidentType: 'Patient', department: '', areaOfIncident: '', namesInvolved: '',
        pidNumber: '', description: '', contributingFactors: '',
        immediateActions: '', preventionMeasures: ''
      });
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = async (id) => {
    try {
      const res = await getIncidentPDF(id);
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Incident_${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF Export failed:', err);
      alert('Failed to download PDF. Please check your connection or try again later.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this pending report?')) return;
    try {
      await deleteIncident(id);
      fetchReports();
    } catch (err) {
      alert('Delete failed. Only pending reports you created can be deleted.');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary-dark)', marginBottom: '0.25rem' }}>Incident & Sentinel Events</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>Quality and safety report tracking for clinical excellence.</p>
        </div>
        {canCreateIncidents && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.75rem 1.5rem', backgroundColor: 'var(--danger)', color: '#ffffff', border: 'none', borderRadius: '10px', fontWeight: 700, boxShadow: '0 4px 6px -1px rgba(220, 53, 69, 0.2)', cursor: 'pointer' }}
          >
            <Plus size={20} />
            Report New Incident
          </button>
        )}
      </div>

      <div className="glass card-shadow" style={{ padding: '1.25rem', marginBottom: '2rem', display: 'flex', gap: '1.25rem', flexWrap: 'wrap', alignItems: 'center', backgroundColor: '#ffffff' }}>
        <div style={{ flex: 1, minWidth: '180px' }}>
          <select
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            style={{ width: '100%', padding: '12px 14px', backgroundColor: '#f8fafc', border: '1.5px solid var(--border-color)', borderRadius: '10px', color: 'var(--text-primary)', outline: 'none', fontSize: '0.95rem', cursor: 'pointer' }}
          >
            <option value="">Incident Type: All</option>
            <option value="Patient">🧑‍⚕️ Patient Related</option>
            <option value="Staff">👩‍💼 Staff Related</option>
            <option value="Equipment">⚙️ Equipment</option>
            <option value="Others">📝 Others</option>
          </select>
        </div>
        <div style={{ position: 'relative', flex: 2, minWidth: '300px' }}>
          <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input
            type="text"
            placeholder="Search by department name..."
            value={filters.department}
            onChange={(e) => setFilters({ ...filters, department: e.target.value })}
            style={{ width: '100%', padding: '12px 14px 12px 46px', backgroundColor: '#f8fafc', border: '1.5px solid var(--border-color)', borderRadius: '10px', color: 'var(--text-primary)', outline: 'none', fontSize: '0.95rem' }}
          />
        </div>
        <button onClick={() => setFilters({ type: '', department: '' })} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', padding: '0 10px' }}>Reset Filters</button>
      </div>

      <div className="glass card-shadow" style={{ overflow: 'hidden', backgroundColor: '#ffffff' }}>
        {loading ? <LoadingSpinner /> : reports.length === 0 ? (
          <div style={{ padding: '5rem 3rem', textAlign: 'center' }}>
            <AlertCircle size={48} style={{ color: 'var(--border-color)', marginBottom: '1.5rem', opacity: 0.5 }} />
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>No incident reports found matching your criteria.</p>
          </div>
        ) : (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--bg-color)', backgroundColor: '#f8fafc' }}>
                <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Report Date</th>
                <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Classification</th>
                <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Department</th>
                <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Individuals Involved</th>
                <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedReports.map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                  <td style={{ padding: '1.25rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{new Date(r.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                  <td style={{ padding: '1.25rem 1.5rem' }}>
                    <span style={{
                      padding: '6px 14px',
                      borderRadius: '20px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      backgroundColor: 'rgba(220, 53, 69, 0.1)',
                      color: 'var(--danger)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      border: '1px solid rgba(220, 53, 69, 0.2)'
                     }}>
                      <AlertCircle size={14} />
                      {r.incident_type}
                    </span>
                  </td>
                  <td style={{ padding: '1.25rem 1.5rem' }}>
                    <div style={{ fontWeight: 600, color: 'var(--primary-dark)', fontSize: '0.95rem' }}>{r.department}</div>
                  </td>
                  <td style={{ padding: '1.25rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{r.names_involved}</td>
                  <td style={{ padding: '1.25rem 1.5rem' }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      backgroundColor: r.status === 'reviewed' ? 'rgba(7, 137, 107, 0.1)' : 'rgba(255, 193, 7, 0.1)',
                      color: r.status === 'reviewed' ? '#07896b' : '#cc9a06',
                      border: `1px solid ${r.status === 'reviewed' ? 'rgba(7, 137, 107, 0.2)' : 'rgba(255, 193, 7, 0.2)'}`,
                      textTransform: 'uppercase'
                    }}>
                      {r.status === 'reviewed' ? '✅ Reviewed' : '⏳ Pending'}
                    </span>
                  </td>
                  <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => handleViewDetails(r.id)}
                      title="View Details"
                      style={{
                        color: 'var(--primary)',
                        background: 'none',
                        border: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '8px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'background 0.2s'
                      }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0,123,138,0.1)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                      <Eye size={18} />
                    </button>
                    <button 
                      onClick={() => handleExport(r.id)}
                      title="Download PDF"
                      style={{ 
                        color: 'var(--success)', 
                        background: 'none',
                        border: 'none',
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        padding: '8px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'background 0.2s'
                      }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(40,167,69,0.1)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                      <Download size={18} />
                    </button>
                    {r.status === 'pending' && hasPermission('incident_reports', 'delete') && (user.role === 'admin' || r.created_by === user.id) && (
                      <button
                        onClick={() => handleDelete(r.id)}
                        title="Delete Report"
                        style={{ color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: '8px', transition: 'background 0.2s', display: 'inline-flex', alignItems: 'center' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(220,53,69,0.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1.25rem 1.5rem',
              borderTop: '1.5px solid var(--border-color)',
              backgroundColor: '#f8fafc',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, reports.length)} of {reports.length} entries
              </span>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid var(--border-color)',
                    backgroundColor: currentPage === 1 ? '#e2e8f0' : '#ffffff',
                    color: currentPage === 1 ? '#94a3b8' : 'var(--primary-dark)',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    fontWeight: 700,
                    fontSize: '0.85rem'
                  }}
                >
                  Previous
                </button>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary-dark)' }}>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid var(--border-color)',
                    backgroundColor: currentPage === totalPages ? '#e2e8f0' : '#ffffff',
                    color: currentPage === totalPages ? '#94a3b8' : 'var(--primary-dark)',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    fontWeight: 700,
                    fontSize: '0.85rem'
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
          </>
        )}
      </div>
      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Report New Incident / Sentinel Event"
        maxWidth="800px"
      >
        <IncidentFormFields
          formData={formData}
          handleChange={(e) => setFormData({ ...formData, [e.target.name]: e.target.value })}
          handleSubmit={handleCreateSubmit}
          loading={submitting}
          onCancel={() => setIsCreateModalOpen(false)}
        />
      </Modal>

      {/* View Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Incident Report Details"
        maxWidth="800px"
      >
        {detailLoading ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}><LoadingSpinner /></div>
        ) : (
          <IncidentDetailsView
            data={activeIncident}
            onExport={() => activeIncident && handleExport(activeIncident.id)}
            onReviewComplete={fetchReports}
          />
        )}
      </Modal>
    </div>
  );
};

export default IncidentList;
