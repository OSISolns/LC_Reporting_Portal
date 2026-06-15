import { useState, useEffect } from 'react';
import { 
  ShieldCheck, CheckCircle, AlertTriangle, 
  Calendar, Award, Building, User, Plus, Trash2, Edit2, RefreshCw, X, Loader2
} from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Button, Card, Badge, Input, Select, Label, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/index.jsx';

const getStatusColor = (status) => {
  if (status === 'Valid') return { bg: 'success', color: '#16a34a' };
  if (status === 'Expiring Soon') return { bg: 'warning', color: '#ea580c' };
  return { bg: 'destructive', color: '#dc2626' };
};

const CompliancePortal = () => {
  const { user } = useAuth();
  const [licenses, setLicenses] = useState([]);
  const [certs, setCerts] = useState([]);
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals
  const [showLicenseModal, setShowLicenseModal] = useState(false);
  const [showCertModal, setShowCertModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);

  // Editing states
  const [editingLicense, setEditingLicense] = useState(null);
  const [editingCert, setEditingCert] = useState(null);
  const [editingAudit, setEditingAudit] = useState(null);

  // Forms
  const [licenseForm, setLicenseForm] = useState({
    staff_name: '',
    role: '',
    license_type: '',
    expiry_date: '',
    status: 'Valid'
  });

  const [certForm, setCertForm] = useState({
    name: '',
    issuer: '',
    expiry_date: '',
    status: 'Valid'
  });

  const [auditForm, setAuditForm] = useState({
    readiness_score: 75,
    scheduled_date: ''
  });

  // Fetch all compliance data
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [licRes, certRes, auditRes] = await Promise.all([
        api.get('/api/compliance/licenses'),
        api.get('/api/compliance/facility-certs'),
        api.get('/api/compliance/audits')
      ]);
      setLicenses(licRes.data.data || []);
      setCerts(certRes.data.data || []);
      setAudits(auditRes.data.data || []);
    } catch (err) {
      console.error('Failed to fetch compliance data:', err);
      setError('Failed to fetch compliance information from the server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- License Actions ---
  const handleSaveLicense = async (e) => {
    e.preventDefault();
    try {
      if (editingLicense) {
        // Update
        const res = await api.put(`/api/compliance/licenses/${editingLicense.id}`, licenseForm);
        if (res.data.success) {
          setLicenses(licenses.map(l => l.id === editingLicense.id ? res.data.data : l));
        }
      } else {
        // Create
        const res = await api.post('/api/compliance/licenses', licenseForm);
        if (res.data.success) {
          setLicenses([...licenses, res.data.data]);
        }
      }
      setShowLicenseModal(false);
      setEditingLicense(null);
      setLicenseForm({ staff_name: '', role: '', license_type: '', expiry_date: '', status: 'Valid' });
    } catch (err) {
      console.error('Error saving license:', err);
      alert('Failed to save staff license details.');
    }
  };

  const handleEditLicense = (lic) => {
    setEditingLicense(lic);
    setLicenseForm({
      staff_name: lic.staff_name,
      role: lic.role,
      license_type: lic.license_type,
      expiry_date: lic.expiry_date,
      status: lic.status
    });
    setShowLicenseModal(true);
  };

  const handleDeleteLicense = async (id) => {
    if (!window.confirm('Are you sure you want to delete this license record?')) return;
    try {
      const res = await api.delete(`/api/compliance/licenses/${id}`);
      if (res.data.success) {
        setLicenses(licenses.filter(l => l.id !== id));
      }
    } catch (err) {
      console.error('Error deleting license:', err);
      alert('Failed to delete license record.');
    }
  };

  // --- Certification Actions ---
  const handleSaveCert = async (e) => {
    e.preventDefault();
    try {
      if (editingCert) {
        // Update
        const res = await api.put(`/api/compliance/facility-certs/${editingCert.id}`, certForm);
        if (res.data.success) {
          setCerts(certs.map(c => c.id === editingCert.id ? res.data.data : c));
        }
      } else {
        // Create
        const res = await api.post('/api/compliance/facility-certs', certForm);
        if (res.data.success) {
          setCerts([...certs, res.data.data]);
        }
      }
      setShowCertModal(false);
      setEditingCert(null);
      setCertForm({ name: '', issuer: '', expiry_date: '', status: 'Valid' });
    } catch (err) {
      console.error('Error saving cert:', err);
      alert('Failed to save facility certification.');
    }
  };

  const handleEditCert = (cert) => {
    setEditingCert(cert);
    setCertForm({
      name: cert.name,
      issuer: cert.issuer,
      expiry_date: cert.expiry_date,
      status: cert.status
    });
    setShowCertModal(true);
  };

  const handleDeleteCert = async (id) => {
    if (!window.confirm('Are you sure you want to delete this facility certification?')) return;
    try {
      const res = await api.delete(`/api/compliance/facility-certs/${id}`);
      if (res.data.success) {
        setCerts(certs.filter(c => c.id !== id));
      }
    } catch (err) {
      console.error('Error deleting certification:', err);
      alert('Failed to delete certification record.');
    }
  };

  const handleInitiateRenewal = async (cert) => {
    const newExpiry = window.prompt('Enter new expiry date (YYYY-MM-DD):', cert.expiry_date);
    if (!newExpiry) return;
    try {
      const res = await api.put(`/api/compliance/facility-certs/${cert.id}`, {
        ...cert,
        expiry_date: newExpiry,
        status: 'Valid'
      });
      if (res.data.success) {
        setCerts(certs.map(c => c.id === cert.id ? res.data.data : c));
      }
    } catch (err) {
      console.error('Error renewing certificate:', err);
      alert('Failed to renew certificate.');
    }
  };

  // --- Audit Actions ---
  const handleSaveAudit = async (e) => {
    e.preventDefault();
    if (!editingAudit) return;
    try {
      const res = await api.put(`/api/compliance/audits/${editingAudit.id}`, auditForm);
      if (res.data.success) {
        setAudits(audits.map(a => a.id === editingAudit.id ? res.data.data : a));
        setShowAuditModal(false);
        setEditingAudit(null);
      }
    } catch (err) {
      console.error('Error updating audit details:', err);
      alert('Failed to update audit details.');
    }
  };

  const handleEditAudit = (audit) => {
    setEditingAudit(audit);
    setAuditForm({
      readiness_score: audit.readiness_score,
      scheduled_date: audit.scheduled_date
    });
    setShowAuditModal(true);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#1b669d]" />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">Loading Quality Assurance Data...</p>
      </div>
    );
  }

  const primaryAudit = audits[0] || { title: 'MOH Inspection', scheduled_date: '2026-07-05', readiness_score: 75, id: 1 };

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Quality Assurance & Operations</p>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <ShieldCheck size={32} className="text-[#1b669d]" /> Compliance & Audit Portal
          </h1>
        </div>
      </div>

      {/* ── Upcoming Audit Hero ── */}
      <div className="bg-[#0f172a] rounded-[24px] p-8 text-white relative overflow-hidden shadow-xl shadow-slate-900/10">
        <div className="absolute top-0 right-0 p-6 opacity-10">
          <ShieldCheck size={200} />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-3">
            <Badge variant="warning" className="bg-amber-500/20 text-amber-300 border-amber-500/30">Major Audit Incoming</Badge>
            <h2 className="text-2xl md:text-3xl font-black text-white">{primaryAudit.title}</h2>
            <p className="text-slate-300 font-bold flex items-center gap-2 text-sm">
              <Calendar size={16} /> Scheduled for: <strong className="text-white">{primaryAudit.scheduled_date}</strong>
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 text-right">
            <span className="text-5xl font-black text-emerald-400">{primaryAudit.readiness_score}%</span>
            <p className="text-xs text-slate-400 font-black uppercase tracking-wider">Readiness Score</p>
            <Button 
              size="sm" 
              variant="outline" 
              className="mt-2 text-white border-slate-700 bg-slate-800 hover:bg-slate-700" 
              onClick={() => handleEditAudit(primaryAudit)}
            >
              Update Audit Metrics
            </Button>
          </div>
        </div>
        <div className="mt-8 h-3 bg-slate-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
            style={{ width: `${primaryAudit.readiness_score}%` }} 
          />
        </div>
      </div>

      {/* ── Main Dashboard Split ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* ── Staff Licenses Tracker ── */}
        <Card className="p-6 space-y-6">
          <div className="flex items-center justify-between border-b pb-4">
            <div className="flex items-center gap-3">
              <User size={22} className="text-[#1b669d]" />
              <h3 className="text-lg font-black text-slate-900">Staff Credentials & Licenses</h3>
            </div>
            <Button 
              size="sm" 
              onClick={() => {
                setEditingLicense(null);
                setLicenseForm({ staff_name: '', role: '', license_type: '', expiry_date: '', status: 'Valid' });
                setShowLicenseModal(true);
              }}
              className="flex items-center gap-1.5"
            >
              <Plus size={16} /> Add License
            </Button>
          </div>

          <div className="space-y-4">
            {licenses.length > 0 ? (
              licenses.map(lic => {
                const statusInfo = getStatusColor(lic.status);
                return (
                  <div key={lic.id} className="flex items-center justify-between p-4 border border-slate-100 rounded-2xl hover:bg-slate-50 transition-colors">
                    <div className="space-y-1">
                      <h4 className="font-black text-slate-800">{lic.staff_name}</h4>
                      <p className="text-xs text-slate-500 font-bold">
                        {lic.role} · <span className="text-slate-400 font-semibold">{lic.license_type}</span>
                      </p>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">
                        Expires: <strong className="text-slate-700">{lic.expiry_date}</strong>
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={statusInfo.bg}>{lic.status}</Badge>
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-slate-600" onClick={() => handleEditLicense(lic)}>
                          <Edit2 size={14} />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-400 hover:text-rose-600" onClick={() => handleDeleteLicense(lic.id)}>
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-center py-10 text-slate-400 font-bold">No staff license records found.</p>
            )}
          </div>
        </Card>

        {/* ── Facility Certifications ── */}
        <Card className="p-6 space-y-6">
          <div className="flex items-center justify-between border-b pb-4">
            <div className="flex items-center gap-3">
              <Building size={22} className="text-[#1b669d]" />
              <h3 className="text-lg font-black text-slate-900">Facility Certifications</h3>
            </div>
            <Button 
              size="sm" 
              onClick={() => {
                setEditingCert(null);
                setCertForm({ name: '', issuer: '', expiry_date: '', status: 'Valid' });
                setShowCertModal(true);
              }}
              className="flex items-center gap-1.5"
            >
              <Plus size={16} /> Add Cert
            </Button>
          </div>

          <div className="space-y-4">
            {certs.length > 0 ? (
              certs.map(cert => {
                const statusInfo = getStatusColor(cert.status);
                return (
                  <div key={cert.id} className="p-4 border border-slate-100 rounded-2xl bg-slate-50/50 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Award size={18} className="text-amber-500" />
                        <h4 className="font-black text-slate-800">{cert.name}</h4>
                      </div>
                      <Badge variant={statusInfo.bg}>{cert.status}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500 font-bold border-b border-slate-100 pb-2">
                      <span>Issuer: <strong className="text-slate-700">{cert.issuer}</strong></span>
                      <span>Expires: <strong className="text-slate-700">{cert.expiry_date}</strong></span>
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <Button size="sm" variant="outline" className="h-8 text-[11px]" onClick={() => handleInitiateRenewal(cert)}>
                        <RefreshCw size={12} className="mr-1.5" /> Initiate Renewal
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-slate-600" onClick={() => handleEditCert(cert)}>
                        <Edit2 size={14} />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-400 hover:text-rose-600" onClick={() => handleDeleteCert(cert.id)}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-center py-10 text-slate-400 font-bold">No facility certificates found.</p>
            )}
          </div>
        </Card>

      </div>

      {/* ── License Modal ── */}
      <Dialog open={showLicenseModal} onOpenChange={setShowLicenseModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingLicense ? 'Edit Staff License' : 'Add Staff License'}</DialogTitle>
            <DialogDescription>Input credentialing details for clinical personnel.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveLicense} className="p-6 space-y-4">
            <div>
              <Label>Staff Name</Label>
              <Input 
                value={licenseForm.staff_name} 
                onChange={(e) => setLicenseForm({ ...licenseForm, staff_name: e.target.value })} 
                required 
              />
            </div>
            <div>
              <Label>Staff Role</Label>
              <Input 
                value={licenseForm.role} 
                onChange={(e) => setLicenseForm({ ...licenseForm, role: e.target.value })} 
                required 
              />
            </div>
            <div>
              <Label>License Type</Label>
              <Select 
                value={licenseForm.license_type} 
                onChange={(e) => setLicenseForm({ ...licenseForm, license_type: e.target.value })}
              >
                <option value="Medical Council Reg">Medical Council Reg</option>
                <option value="Nursing Board Cert">Nursing Board Cert</option>
                <option value="Allied Health Cert">Allied Health Cert</option>
                <option value="Pharmacy License">Pharmacy License</option>
              </Select>
            </div>
            <div>
              <Label>Expiry Date</Label>
              <Input 
                type="date"
                value={licenseForm.expiry_date} 
                onChange={(e) => setLicenseForm({ ...licenseForm, expiry_date: e.target.value })} 
                required 
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select 
                value={licenseForm.status} 
                onChange={(e) => setLicenseForm({ ...licenseForm, status: e.target.value })}
              >
                <option value="Valid">Valid</option>
                <option value="Expiring Soon">Expiring Soon</option>
                <option value="Critical">Critical</option>
              </Select>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setShowLicenseModal(false)}>Cancel</Button>
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Certification Modal ── */}
      <Dialog open={showCertModal} onOpenChange={setShowCertModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCert ? 'Edit Certification' : 'Add Certification'}</DialogTitle>
            <DialogDescription>Input facility regulatory and certificate details.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveCert} className="p-6 space-y-4">
            <div>
              <Label>Certificate Name</Label>
              <Input 
                value={certForm.name} 
                onChange={(e) => setCertForm({ ...certForm, name: e.target.value })} 
                required 
              />
            </div>
            <div>
              <Label>Issuing Agency</Label>
              <Input 
                value={certForm.issuer} 
                onChange={(e) => setCertForm({ ...certForm, issuer: e.target.value })} 
                required 
              />
            </div>
            <div>
              <Label>Expiry Date</Label>
              <Input 
                type="date"
                value={certForm.expiry_date} 
                onChange={(e) => setCertForm({ ...certForm, expiry_date: e.target.value })} 
                required 
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select 
                value={certForm.status} 
                onChange={(e) => setCertForm({ ...certForm, status: e.target.value })}
              >
                <option value="Valid">Valid</option>
                <option value="Expiring Soon">Expiring Soon</option>
                <option value="Critical">Critical</option>
              </Select>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setShowCertModal(false)}>Cancel</Button>
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Audit Metrics Modal ── */}
      <Dialog open={showAuditModal} onOpenChange={setShowAuditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Audit Readiness Metrics</DialogTitle>
            <DialogDescription>Update progress score and date for incoming inspection.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveAudit} className="p-6 space-y-4">
            <div>
              <Label>Inspection Date</Label>
              <Input 
                type="date"
                value={auditForm.scheduled_date} 
                onChange={(e) => setAuditForm({ ...auditForm, scheduled_date: e.target.value })} 
                required 
              />
            </div>
            <div>
              <Label>Readiness Score ({auditForm.readiness_score}%)</Label>
              <input 
                type="range"
                min="0"
                max="100"
                className="w-full accent-[#1b669d] h-2 bg-slate-200 rounded-lg cursor-pointer"
                value={auditForm.readiness_score} 
                onChange={(e) => setFormScore(e.target.value)} 
                required 
              />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setShowAuditModal(false)}>Cancel</Button>
              <Button type="submit">Save Metrics</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );

  function setFormScore(score) {
    setAuditForm({ ...auditForm, readiness_score: Number(score) });
  }
};

export default CompliancePortal;
