import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldCheck, AlertTriangle, Calendar, Award, Building2, UserCheck, 
  Plus, Trash2, Edit3, RefreshCw, X, Loader2, FileText, CheckCircle2, 
  AlertOctagon, Filter, Search, Download, Clock, Landmark, Stethoscope, 
  Eye, ExternalLink, ChevronRight, Check, AlertCircle, ShieldAlert,
  Layers, Sparkles, Building, Briefcase, FileSpreadsheet, CheckSquare
} from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

// Rwandan Regulatory Councils & Authorities Reference
const REGULATORY_BODIES = [
  { id: 'all', name: 'All Regulatory Authorities' },
  { id: 'RMDC', name: 'RMDC (Rwanda Medical and Dental Council)' },
  { id: 'NCNM', name: 'NCNM (National Council of Nurses & Midwives)' },
  { id: 'RAHPC', name: 'RAHPC (Rwanda Allied Health Professions Council)' },
  { id: 'RFDA', name: 'Rwanda FDA (Food and Drugs Authority)' },
  { id: 'RURA', name: 'RURA (Radiation Protection & Utilities)' },
  { id: 'MOH', name: 'Ministry of Health (MOH Rwanda)' },
];

const CLINICAL_DEPARTMENTS = [
  'All Departments',
  'Internal Medicine',
  'Surgery & Theater',
  'Pediatrics & OPD',
  'Laboratory',
  'Nursing & Inpatient',
  'Imaging & Radiology',
  'Pharmacy Services',
  'Dental Clinic',
  'Quality Assurance & EHS'
];

const getStatusBadge = (status, expiryDate) => {
  let finalStatus = status;
  if (expiryDate) {
    const exp = new Date(expiryDate);
    const now = new Date();
    const diffDays = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
      finalStatus = 'Critical';
    } else if (diffDays <= 60 && finalStatus === 'Valid') {
      finalStatus = 'Expiring Soon';
    }
  }

  if (finalStatus === 'Valid') {
    return {
      label: 'Active & Compliant',
      cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-600/10',
      dot: 'bg-emerald-500'
    };
  }
  if (finalStatus === 'Expiring Soon') {
    return {
      label: 'Expiring Soon',
      cls: 'bg-amber-50 text-amber-700 border-amber-200 ring-1 ring-amber-600/10',
      dot: 'bg-amber-500'
    };
  }
  return {
    label: finalStatus === 'Critical' ? 'Renewal Required' : finalStatus,
    cls: 'bg-rose-50 text-rose-700 border-rose-200 ring-1 ring-rose-600/10',
    dot: 'bg-rose-500'
  };
};

const getDaysRemaining = (expiryDate) => {
  if (!expiryDate) return null;
  const exp = new Date(expiryDate);
  const now = new Date();
  const diffDays = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
  return diffDays;
};

export default function CompliancePortal() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('staff'); // 'staff' | 'facility' | 'audits' | 'calendar'
  
  const [licenses, setLicenses] = useState([]);
  const [certs, setCerts] = useState([]);
  const [audits, setAudits] = useState([]);
  const [calendarItems, setCalendarItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Filters for Staff Licenses
  const [staffSearch, setStaffSearch] = useState('');
  const [councilFilter, setCouncilFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('All Departments');
  const [statusFilter, setStatusFilter] = useState('all');

  // Filters for Facility Certs
  const [certSearch, setCertSearch] = useState('');
  const [certStatusFilter, setCertStatusFilter] = useState('all');

  // Filters for Statutory Calendar
  const [calendarSearch, setCalendarSearch] = useState('');
  const [calendarFreqFilter, setCalendarFreqFilter] = useState('all');
  const [calendarStatusFilter, setCalendarStatusFilter] = useState('all');

  // Modals
  const [showLicenseModal, setShowLicenseModal] = useState(false);
  const [showCertModal, setShowCertModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);

  // Editing state
  const [editingLicense, setEditingLicense] = useState(null);
  const [editingCert, setEditingCert] = useState(null);
  const [editingAudit, setEditingAudit] = useState(null);
  const [editingCalendarItem, setEditingCalendarItem] = useState(null);

  // Form states
  const [licenseForm, setLicenseForm] = useState({
    staff_name: '',
    role: '',
    council_reg_no: '',
    department: 'Internal Medicine',
    license_type: 'RMDC Full Practicing License',
    expiry_date: '',
    status: 'Valid'
  });

  const [certForm, setCertForm] = useState({
    name: '',
    issuer: 'Ministry of Health (MOH) Rwanda',
    permit_no: '',
    scope: '',
    inspection_cycle: 'Annual',
    expiry_date: '',
    status: 'Valid'
  });

  const [auditForm, setAuditForm] = useState({
    title: '',
    category: 'Statutory Quality',
    scheduled_date: '',
    readiness_score: 85,
    description: '',
    status: 'Scheduled'
  });

  const [calendarForm, setCalendarForm] = useState({
    title: '',
    frequency: 'Monthly Filing',
    due_date_rule: '',
    authority: 'Ministry of Health (MOH) Rwanda',
    description: '',
    focal_person: '',
    status: 'Upcoming',
    next_due_date: '',
    last_submitted_date: ''
  });

  // Fetch compliance data
  const fetchData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const [licRes, certRes, auditRes, calRes] = await Promise.all([
        api.get('/compliance/licenses'),
        api.get('/compliance/facility-certs'),
        api.get('/compliance/audits'),
        api.get('/compliance/calendar')
      ]);

      const fetchedLicenses = licRes.data.data || [];
      const fetchedCerts = certRes.data.data || [];
      const fetchedAudits = auditRes.data.data || [];
      const fetchedCalendar = calRes.data.data || [];

      setLicenses(fetchedLicenses);
      setCerts(fetchedCerts);
      setAudits(fetchedAudits);
      setCalendarItems(fetchedCalendar);
    } catch (err) {
      console.error('Failed to fetch compliance records:', err);
      setError('Unable to synchronize with the compliance database. Please verify your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered staff licenses
  const filteredLicenses = useMemo(() => {
    return licenses.filter(lic => {
      const term = staffSearch.toLowerCase();
      const matchesSearch = 
        !term || 
        (lic.staff_name && lic.staff_name.toLowerCase().includes(term)) ||
        (lic.role && lic.role.toLowerCase().includes(term)) ||
        (lic.council_reg_no && lic.council_reg_no.toLowerCase().includes(term)) ||
        (lic.license_type && lic.license_type.toLowerCase().includes(term));

      const matchesCouncil = 
        councilFilter === 'all' ||
        (lic.council_reg_no && lic.council_reg_no.toUpperCase().includes(councilFilter)) ||
        (lic.license_type && lic.license_type.toUpperCase().includes(councilFilter));

      const matchesDept = 
        deptFilter === 'All Departments' ||
        lic.department === deptFilter;

      const matchesStatus = 
        statusFilter === 'all' ||
        lic.status === statusFilter;

      return matchesSearch && matchesCouncil && matchesDept && matchesStatus;
    });
  }, [licenses, staffSearch, councilFilter, deptFilter, statusFilter]);

  // Filtered facility certs
  const filteredCerts = useMemo(() => {
    return certs.filter(cert => {
      const term = certSearch.toLowerCase();
      const matchesSearch = 
        !term || 
        (cert.name && cert.name.toLowerCase().includes(term)) ||
        (cert.issuer && cert.issuer.toLowerCase().includes(term)) ||
        (cert.permit_no && cert.permit_no.toLowerCase().includes(term)) ||
        (cert.scope && cert.scope.toLowerCase().includes(term));

      const matchesStatus = 
        certStatusFilter === 'all' ||
        cert.status === certStatusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [certs, certSearch, certStatusFilter]);

  // Filtered statutory calendar items
  const filteredCalendarItems = useMemo(() => {
    return calendarItems.filter(item => {
      const term = calendarSearch.toLowerCase();
      const matchesSearch =
        !term ||
        (item.title && item.title.toLowerCase().includes(term)) ||
        (item.authority && item.authority.toLowerCase().includes(term)) ||
        (item.focal_person && item.focal_person.toLowerCase().includes(term)) ||
        (item.description && item.description.toLowerCase().includes(term)) ||
        (item.due_date_rule && item.due_date_rule.toLowerCase().includes(term));

      const matchesFreq =
        calendarFreqFilter === 'all' ||
        (item.frequency && item.frequency.toLowerCase().includes(calendarFreqFilter.toLowerCase()));

      const matchesStatus =
        calendarStatusFilter === 'all' ||
        item.status === calendarStatusFilter;

      return matchesSearch && matchesFreq && matchesStatus;
    });
  }, [calendarItems, calendarSearch, calendarFreqFilter, calendarStatusFilter]);

  // Executive KPI calculations
  const kpis = useMemo(() => {
    const totalLicenses = licenses.length;
    const validLicenses = licenses.filter(l => l.status === 'Valid').length;
    const expiringLicenses = licenses.filter(l => l.status === 'Expiring Soon').length;
    const criticalLicenses = licenses.filter(l => l.status === 'Critical').length;
    const licenseRate = totalLicenses > 0 ? Math.round((validLicenses / totalLicenses) * 100) : 0;

    const totalCerts = certs.length;
    const validCerts = certs.filter(c => c.status === 'Valid').length;
    const certRate = totalCerts > 0 ? Math.round((validCerts / totalCerts) * 100) : 0;

    const upcomingAudit = audits.length > 0 
      ? [...audits].sort((a,b) => new Date(a.scheduled_date) - new Date(b.scheduled_date))[0]
      : null;

    return {
      licenseRate,
      validLicenses,
      expiringLicenses,
      criticalLicenses,
      totalLicenses,
      totalCerts,
      validCerts,
      certRate,
      upcomingAudit,
      totalActions: expiringLicenses + criticalLicenses + (totalCerts - validCerts)
    };
  }, [licenses, certs, audits]);

  // --- Handlers: Staff Licenses ---
  const handleOpenAddLicense = () => {
    setEditingLicense(null);
    setLicenseForm({
      staff_name: '',
      role: '',
      council_reg_no: '',
      department: 'Internal Medicine',
      license_type: 'RMDC Full Practicing License',
      expiry_date: '',
      status: 'Valid'
    });
    setShowLicenseModal(true);
  };

  const handleOpenEditLicense = (lic) => {
    setEditingLicense(lic);
    setLicenseForm({
      staff_name: lic.staff_name || '',
      role: lic.role || '',
      council_reg_no: lic.council_reg_no || '',
      department: lic.department || 'Internal Medicine',
      license_type: lic.license_type || '',
      expiry_date: lic.expiry_date || '',
      status: lic.status || 'Valid'
    });
    setShowLicenseModal(true);
  };

  const handleSaveLicense = async (e) => {
    e.preventDefault();
    try {
      if (editingLicense) {
        const res = await api.put(`/compliance/licenses/${editingLicense.id}`, licenseForm);
        if (res.data.success) {
          setLicenses(licenses.map(l => l.id === editingLicense.id ? res.data.data : l));
        }
      } else {
        const res = await api.post('/compliance/licenses', licenseForm);
        if (res.data.success) {
          setLicenses([...licenses, res.data.data]);
        }
      }
      setShowLicenseModal(false);
      setEditingLicense(null);
    } catch (err) {
      console.error('Error saving license record:', err);
      alert('Failed to save staff practicing license details.');
    }
  };

  const handleDeleteLicense = async (id) => {
    if (!window.confirm('Are you sure you want to remove this staff practicing license from the active register?')) return;
    try {
      const res = await api.delete(`/compliance/licenses/${id}`);
      if (res.data.success) {
        setLicenses(licenses.filter(l => l.id !== id));
      }
    } catch (err) {
      console.error('Error deleting license record:', err);
      alert('Failed to delete staff license record.');
    }
  };

  const handleQuickRenewLicense = async (lic) => {
    const currentExp = lic.expiry_date || new Date().toISOString().slice(0, 10);
    const nextYear = new Date(currentExp);
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    const suggested = nextYear.toISOString().slice(0, 10);

    const newDate = window.prompt(`Confirm Council Renewal Expiry Date for ${lic.staff_name}:`, suggested);
    if (!newDate) return;

    try {
      const res = await api.put(`/compliance/licenses/${lic.id}`, {
        ...lic,
        expiry_date: newDate,
        status: 'Valid'
      });
      if (res.data.success) {
        setLicenses(licenses.map(l => l.id === lic.id ? res.data.data : l));
      }
    } catch (err) {
      console.error('Error renewing license:', err);
      alert('Failed to update council practicing license renewal.');
    }
  };

  // --- Handlers: Facility Certs ---
  const handleOpenAddCert = () => {
    setEditingCert(null);
    setCertForm({
      name: '',
      issuer: 'Ministry of Health (MOH) Rwanda',
      permit_no: '',
      scope: '',
      inspection_cycle: 'Annual',
      expiry_date: '',
      status: 'Valid'
    });
    setShowCertModal(true);
  };

  const handleOpenEditCert = (cert) => {
    setEditingCert(cert);
    setCertForm({
      name: cert.name || '',
      issuer: cert.issuer || '',
      permit_no: cert.permit_no || '',
      scope: cert.scope || '',
      inspection_cycle: cert.inspection_cycle || 'Annual',
      expiry_date: cert.expiry_date || '',
      status: cert.status || 'Valid'
    });
    setShowCertModal(true);
  };

  const handleSaveCert = async (e) => {
    e.preventDefault();
    try {
      if (editingCert) {
        const res = await api.put(`/compliance/facility-certs/${editingCert.id}`, certForm);
        if (res.data.success) {
          setCerts(certs.map(c => c.id === editingCert.id ? res.data.data : c));
        }
      } else {
        const res = await api.post('/compliance/facility-certs', certForm);
        if (res.data.success) {
          setCerts([...certs, res.data.data]);
        }
      }
      setShowCertModal(false);
      setEditingCert(null);
    } catch (err) {
      console.error('Error saving facility certificate:', err);
      alert('Failed to save facility accreditation details.');
    }
  };

  const handleDeleteCert = async (id) => {
    if (!window.confirm('Are you sure you want to remove this facility operating certificate from the register?')) return;
    try {
      const res = await api.delete(`/compliance/facility-certs/${id}`);
      if (res.data.success) {
        setCerts(certs.filter(c => c.id !== id));
      }
    } catch (err) {
      console.error('Error deleting facility cert:', err);
      alert('Failed to delete facility accreditation record.');
    }
  };

  const handleQuickRenewCert = async (cert) => {
    const currentExp = cert.expiry_date || new Date().toISOString().slice(0, 10);
    const nextYear = new Date(currentExp);
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    const suggested = nextYear.toISOString().slice(0, 10);

    const newDate = window.prompt(`Confirm New Statutory Permit Expiry Date for ${cert.name}:`, suggested);
    if (!newDate) return;

    try {
      const res = await api.put(`/compliance/facility-certs/${cert.id}`, {
        ...cert,
        expiry_date: newDate,
        status: 'Valid'
      });
      if (res.data.success) {
        setCerts(certs.map(c => c.id === cert.id ? res.data.data : c));
      }
    } catch (err) {
      console.error('Error renewing facility permit:', err);
      alert('Failed to record renewed facility permit.');
    }
  };

  // --- Handlers: Audits ---
  const handleOpenAddAudit = () => {
    setEditingAudit(null);
    setAuditForm({
      title: '',
      category: 'Statutory Quality',
      scheduled_date: '',
      readiness_score: 80,
      description: '',
      status: 'Scheduled'
    });
    setShowAuditModal(true);
  };

  const handleOpenEditAudit = (audit) => {
    setEditingAudit(audit);
    setAuditForm({
      title: audit.title || '',
      category: audit.category || 'Statutory Quality',
      scheduled_date: audit.scheduled_date || '',
      readiness_score: audit.readiness_score || 85,
      description: audit.description || '',
      status: audit.status || 'Scheduled'
    });
    setShowAuditModal(true);
  };

  const handleSaveAudit = async (e) => {
    e.preventDefault();
    try {
      if (editingAudit) {
        const res = await api.put(`/compliance/audits/${editingAudit.id}`, auditForm);
        if (res.data.success) {
          setAudits(audits.map(a => a.id === editingAudit.id ? res.data.data : a));
        }
      } else {
        const res = await api.post('/compliance/audits', auditForm);
        if (res.data.success) {
          setAudits([...audits, res.data.data]);
        }
      }
      setShowAuditModal(false);
      setEditingAudit(null);
    } catch (err) {
      console.error('Error saving audit inspection:', err);
      alert('Failed to save audit inspection record.');
    }
  };

  const handleDeleteAudit = async (id) => {
    if (!window.confirm('Are you sure you want to remove this scheduled inspection from the roadmap?')) return;
    try {
      const res = await api.delete(`/compliance/audits/${id}`);
      if (res.data.success) {
        setAudits(audits.filter(a => a.id !== id));
      }
    } catch (err) {
      console.error('Error deleting audit inspection:', err);
      alert('Failed to delete scheduled inspection.');
    }
  };

  // --- Handlers: Statutory Calendar ---
  const handleOpenAddCalendar = () => {
    setEditingCalendarItem(null);
    setCalendarForm({
      title: '',
      frequency: 'Monthly Filing',
      due_date_rule: '',
      authority: 'Ministry of Health (MOH) Rwanda',
      description: '',
      focal_person: '',
      status: 'Upcoming',
      next_due_date: '',
      last_submitted_date: ''
    });
    setShowCalendarModal(true);
  };

  const handleOpenEditCalendar = (item) => {
    setEditingCalendarItem(item);
    setCalendarForm({
      title: item.title || '',
      frequency: item.frequency || 'Monthly Filing',
      due_date_rule: item.due_date_rule || '',
      authority: item.authority || 'Ministry of Health (MOH) Rwanda',
      description: item.description || '',
      focal_person: item.focal_person || '',
      status: item.status || 'Upcoming',
      next_due_date: item.next_due_date || '',
      last_submitted_date: item.last_submitted_date || ''
    });
    setShowCalendarModal(true);
  };

  const handleSaveCalendar = async (e) => {
    e.preventDefault();
    try {
      if (editingCalendarItem) {
        const res = await api.put(`/compliance/calendar/${editingCalendarItem.id}`, calendarForm);
        if (res.data.success) {
          setCalendarItems(calendarItems.map(c => c.id === editingCalendarItem.id ? res.data.data : c));
        }
      } else {
        const res = await api.post('/compliance/calendar', calendarForm);
        if (res.data.success) {
          setCalendarItems([...calendarItems, res.data.data]);
        }
      }
      setShowCalendarModal(false);
      setEditingCalendarItem(null);
    } catch (err) {
      console.error('Error saving statutory calendar filing:', err);
      alert('Failed to save statutory reporting schedule.');
    }
  };

  const handleDeleteCalendar = async (id) => {
    if (!window.confirm('Are you sure you want to remove this statutory filing from the calendar?')) return;
    try {
      const res = await api.delete(`/compliance/calendar/${id}`);
      if (res.data.success) {
        setCalendarItems(calendarItems.filter(c => c.id !== id));
      }
    } catch (err) {
      console.error('Error deleting statutory calendar filing:', err);
      alert('Failed to delete statutory reporting schedule.');
    }
  };

  const handleToggleCalendarSubmitted = async (item) => {
    const isSubmitted = item.status === 'Compliant' || item.status === 'Submitted';
    const newStatus = isSubmitted ? 'Pending Submission' : 'Compliant';
    const today = new Date().toISOString().slice(0, 10);
    const updatedPayload = {
      ...item,
      status: newStatus,
      last_submitted_date: isSubmitted ? '' : today
    };
    try {
      const res = await api.put(`/compliance/calendar/${item.id}`, updatedPayload);
      if (res.data.success) {
        setCalendarItems(calendarItems.map(c => c.id === item.id ? res.data.data : c));
      }
    } catch (err) {
      console.error('Error updating submission status:', err);
      alert('Failed to update submission status.');
    }
  };

  // Export CSV summary
  const handleExportCSV = () => {
    if (activeTab === 'staff') {
      const headers = ['Staff Name', 'Clinical Role', 'Council Reg No', 'Department', 'License Type', 'Expiry Date', 'Status'];
      const rows = filteredLicenses.map(l => [
        `"${l.staff_name || ''}"`,
        `"${l.role || ''}"`,
        `"${l.council_reg_no || ''}"`,
        `"${l.department || ''}"`,
        `"${l.license_type || ''}"`,
        `"${l.expiry_date || ''}"`,
        `"${l.status || ''}"`
      ]);
      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `legacy_clinics_staff_licensure_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (activeTab === 'facility') {
      const headers = ['Permit Name', 'Issuing Authority', 'Permit Number', 'Authorized Scope', 'Inspection Cycle', 'Expiry Date', 'Status'];
      const rows = filteredCerts.map(c => [
        `"${c.name || ''}"`,
        `"${c.issuer || ''}"`,
        `"${c.permit_no || ''}"`,
        `"${c.scope || ''}"`,
        `"${c.inspection_cycle || ''}"`,
        `"${c.expiry_date || ''}"`,
        `"${c.status || ''}"`
      ]);
      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `legacy_clinics_facility_permits_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (activeTab === 'audits') {
      const headers = ['Inspection Title', 'Category', 'Scheduled Date', 'Readiness Score', 'Status', 'Description'];
      const rows = audits.map(a => [
        `"${a.title || ''}"`,
        `"${a.category || ''}"`,
        `"${a.scheduled_date || ''}"`,
        `"${a.readiness_score || 0}%"`,
        `"${a.status || ''}"`,
        `"${(a.description || '').replace(/"/g, '""')}"`
      ]);
      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `legacy_clinics_statutory_audits_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const headers = ['Filing Title', 'Frequency', 'Due Date Rule', 'Next Due Date', 'Regulatory Authority', 'Focal Person', 'Status', 'Last Submitted Date', 'Description'];
      const rows = filteredCalendarItems.map(item => [
        `"${item.title || ''}"`,
        `"${item.frequency || ''}"`,
        `"${item.due_date_rule || ''}"`,
        `"${item.next_due_date || ''}"`,
        `"${item.authority || ''}"`,
        `"${item.focal_person || ''}"`,
        `"${item.status || ''}"`,
        `"${item.last_submitted_date || ''}"`,
        `"${(item.description || '').replace(/"/g, '""')}"`
      ]);
      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `legacy_clinics_statutory_calendar_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-9 h-9 animate-spin text-teal-700" />
        <div className="text-center">
          <p className="text-slate-800 font-bold text-sm tracking-wide">Synchronizing Regulatory Dossier...</p>
          <p className="text-slate-400 text-xs mt-1">Verifying Council Registrations &amp; Operating Permits</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-7">
      
      {/* ── Page Header & Top Operations Bar ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-teal-800 tracking-wider uppercase mb-1">
            <ShieldCheck size={16} className="text-teal-700" />
            <span>Clinical Governance &amp; Quality Directorate</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-500 font-semibold">Statutory Compliance</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Compliance &amp; Regulatory Oversight
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-3xl">
            Statutory hospital operating permits, health authority inspections, and clinical staff council licensure registers.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
            title="Refresh active records"
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin text-teal-700' : 'text-slate-500'} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
            title="Export CSV Register"
          >
            <Download size={13} className="text-slate-500" />
            <span>Export Register</span>
          </button>

          {activeTab === 'staff' ? (
            <button
              onClick={handleOpenAddLicense}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition-all shadow-xs cursor-pointer"
            >
              <Plus size={14} />
              <span>Register Practitioner</span>
            </button>
          ) : activeTab === 'facility' ? (
            <button
              onClick={handleOpenAddCert}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition-all shadow-xs cursor-pointer"
            >
              <Plus size={14} />
              <span>Add Operating Permit</span>
            </button>
          ) : activeTab === 'audits' ? (
            <button
              onClick={handleOpenAddAudit}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition-all shadow-xs cursor-pointer"
            >
              <Plus size={14} />
              <span>Schedule Inspection</span>
            </button>
          ) : null}
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle size={15} className="text-amber-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => fetchData(true)} className="font-bold underline text-amber-900 cursor-pointer">Retry</button>
        </div>
      )}

      {/* ── Executive Compliance Scorecard (No AI Gradient Cliches) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1: Facility Operating Permits */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Facility Accreditations</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-slate-900">{kpis.validCerts}/{kpis.totalCerts}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                  kpis.totalCerts === 0 
                    ? 'text-slate-600 bg-slate-50 border-slate-200' 
                    : kpis.certRate >= 90 
                    ? 'text-emerald-700 bg-emerald-50 border-emerald-200' 
                    : 'text-amber-700 bg-amber-50 border-amber-200'
                }`}>
                  {kpis.totalCerts === 0 ? 'None on File' : `${kpis.certRate}% Current`}
                </span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-800">
              <Building2 size={20} />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-3 pt-3 border-t border-slate-100 flex items-center gap-1.5">
            <CheckCircle2 size={13} className={kpis.totalCerts > 0 ? "text-emerald-600" : "text-slate-400"} />
            <span>{kpis.totalCerts > 0 ? 'MoH, RFDA, RURA & Police Fire Cleared' : 'No facility permits registered'}</span>
          </p>
        </div>

        {/* Metric 2: Practitioner Council Licensure */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Practitioner Licensure</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-slate-900">{kpis.validLicenses}/{kpis.totalLicenses}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                  kpis.totalLicenses === 0 
                    ? 'text-slate-600 bg-slate-50 border-slate-200' 
                    : kpis.licenseRate >= 90 
                    ? 'text-emerald-700 bg-emerald-50 border-emerald-200' 
                    : 'text-amber-700 bg-amber-50 border-amber-200'
                }`}>
                  {kpis.totalLicenses === 0 ? 'None on File' : `${kpis.licenseRate}% Active`}
                </span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-800">
              <UserCheck size={20} />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-3 pt-3 border-t border-slate-100 flex items-center gap-1.5">
            <Award size={13} className={kpis.totalLicenses > 0 ? "text-blue-600" : "text-slate-400"} />
            <span>{kpis.totalLicenses > 0 ? 'RMDC, NCNM, RAHPC verified' : 'No practitioner licenses registered'}</span>
          </p>
        </div>

        {/* Metric 3: Upcoming Statutory Audit */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Next Statutory Audit</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-slate-900">
                  {kpis.upcomingAudit ? `${kpis.upcomingAudit.readiness_score}%` : '—'}
                </span>
                <span className="text-xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                  {kpis.upcomingAudit ? 'Readiness' : 'None Scheduled'}
                </span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-800">
              <Landmark size={20} />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-3 pt-3 border-t border-slate-100 truncate" title={kpis.upcomingAudit ? kpis.upcomingAudit.title : 'No upcoming audits'}>
            {kpis.upcomingAudit ? (
              <>
                <span className="font-semibold text-slate-700">{kpis.upcomingAudit.scheduled_date}</span>: {kpis.upcomingAudit.title}
              </>
            ) : (
              <span className="text-slate-400">No statutory inspections on file</span>
            )}
          </p>
        </div>

        {/* Metric 4: Renewal Actions / Risk Alerts */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Renewal Watchlist</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className={`text-2xl font-black ${kpis.totalActions > 0 ? 'text-amber-700' : 'text-slate-900'}`}>
                  {kpis.totalActions}
                </span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                  kpis.totalActions > 0 
                    ? 'text-amber-800 bg-amber-50 border-amber-200' 
                    : 'text-slate-600 bg-slate-50 border-slate-200'
                }`}>
                  {kpis.totalActions === 0 ? 'All Clear' : `${kpis.totalActions} Action Items`}
                </span>
              </div>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              kpis.totalActions > 0 
                ? 'bg-amber-50 border border-amber-200 text-amber-700' 
                : 'bg-slate-50 border border-slate-200 text-slate-500'
            }`}>
              <Clock size={20} />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-3 pt-3 border-t border-slate-100 flex items-center gap-1.5">
            {kpis.criticalLicenses > 0 ? (
              <AlertCircle size={13} className="text-rose-600 shrink-0" />
            ) : (
              <Clock size={13} className="text-slate-400 shrink-0" />
            )}
            <span>
              {kpis.totalActions === 0 
                ? '0 overdue or expiring permits' 
                : `${kpis.expiringLicenses} in next 60d, ${kpis.criticalLicenses} overdue`}
            </span>
          </p>
        </div>

      </div>

      {/* ── Navigation Tabs ── */}
      <div className="border-b border-slate-200 flex items-center justify-between gap-4 overflow-x-auto no-scrollbar">
        <div className="flex gap-1 sm:gap-2">
          <button
            onClick={() => setActiveTab('staff')}
            className={`flex items-center gap-2 py-3 px-3.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'staff'
                ? 'border-teal-700 text-teal-900 bg-teal-50/40'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <UserCheck size={16} />
            <span>Staff Practicing Licensure</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200">
              {licenses.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('facility')}
            className={`flex items-center gap-2 py-3 px-3.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'facility'
                ? 'border-teal-700 text-teal-900 bg-teal-50/40'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <Building2 size={16} />
            <span>Facility Operating Permits</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200">
              {certs.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('audits')}
            className={`flex items-center gap-2 py-3 px-3.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'audits'
                ? 'border-teal-700 text-teal-900 bg-teal-50/40'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <CheckSquare size={16} />
            <span>Statutory Audits &amp; Inspection Roadmap</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200">
              {audits.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('calendar')}
            className={`flex items-center gap-2 py-3 px-3.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'calendar'
                ? 'border-teal-700 text-teal-900 bg-teal-50/40'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <Calendar size={16} />
            <span>Statutory Reporting Calendar</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200">
              {calendarItems.length}
            </span>
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ── TAB 1: STAFF PRACTICING LICENSES ── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'staff' && (
        <div className="space-y-4">
          
          {/* Filters Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search practitioner name, council reg no., or title..."
                value={staffSearch}
                onChange={e => setStaffSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 text-slate-800"
              />
              {staffSearch && (
                <button onClick={() => setStaffSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X size={13} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={councilFilter}
                onChange={e => setCouncilFilter(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:border-teal-700"
              >
                <option value="all">All Councils</option>
                <option value="RMDC">RMDC (Medical &amp; Dental)</option>
                <option value="NCNM">NCNM (Nursing &amp; Midwives)</option>
                <option value="RAHPC">RAHPC (Allied Health)</option>
                <option value="RFDA">Rwanda FDA (Pharmacy)</option>
              </select>

              <select
                value={deptFilter}
                onChange={e => setDeptFilter(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:border-teal-700"
              >
                {CLINICAL_DEPARTMENTS.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:border-teal-700"
              >
                <option value="all">All Statuses</option>
                <option value="Valid">Valid / Compliant</option>
                <option value="Expiring Soon">Expiring Soon</option>
                <option value="Critical">Critical / Overdue</option>
              </select>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-4">Practitioner / Clinician</th>
                    <th className="py-3 px-4">Council Registration</th>
                    <th className="py-3 px-4">Department / Service</th>
                    <th className="py-3 px-4">License Type</th>
                    <th className="py-3 px-4">Validity / Expiry</th>
                    <th className="py-3 px-4 text-center">Compliance Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredLicenses.length > 0 ? (
                    filteredLicenses.map(lic => {
                      const badge = getStatusBadge(lic.status, lic.expiry_date);
                      const days = getDaysRemaining(lic.expiry_date);
                      return (
                        <tr key={lic.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-extrabold text-slate-900">{lic.staff_name}</div>
                            <div className="text-[11px] text-slate-500 font-medium">{lic.role}</div>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-800 text-[11px]">
                            {lic.council_reg_no || '—'}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                              {lic.department || 'Clinical Services'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-medium text-slate-700">
                            {lic.license_type}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-mono font-semibold text-slate-900">{lic.expiry_date}</div>
                            {days !== null && (
                              <div className={`text-[10px] font-bold mt-0.5 ${
                                days < 0 
                                  ? 'text-rose-600' 
                                  : days <= 60 
                                  ? 'text-amber-600' 
                                  : 'text-slate-400'
                              }`}>
                                {days < 0 ? `${Math.abs(days)}d Overdue` : `${days} days left`}
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${badge.cls}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                              {badge.label}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleQuickRenewLicense(lic)}
                                className="px-2 py-1 text-[11px] font-bold rounded-lg text-teal-800 hover:bg-teal-50 border border-transparent hover:border-teal-200 transition-all cursor-pointer"
                                title="Quick Renew (Update Expiry Date)"
                              >
                                Renew
                              </button>
                              <button
                                onClick={() => handleOpenEditLicense(lic)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                                title="Edit License Details"
                              >
                                <Edit3 size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteLicense(lic.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Delete from Register"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                        {licenses.length === 0 ? (
                          <div className="space-y-3">
                            <div className="w-12 h-12 mx-auto rounded-full bg-teal-50 flex items-center justify-center text-teal-700">
                              <UserCheck size={24} />
                            </div>
                            <div className="font-bold text-sm text-slate-800">No Practitioner Licensure Records on File</div>
                            <p className="text-xs text-slate-500 max-w-md mx-auto">
                              There are currently no staff practicing licenses registered. Click "Register Practitioner" above to record a clinical license.
                            </p>
                          </div>
                        ) : (
                          'No practitioner licensure records match the specified filters.'
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div className="p-3.5 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
              <span>Showing {filteredLicenses.length} of {licenses.length} registered clinicians</span>
              <span className="font-medium text-slate-600">Verification authority: RMDC, NCNM, RAHPC &amp; Rwanda FDA</span>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ── TAB 2: FACILITY OPERATING PERMITS ── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'facility' && (
        <div className="space-y-4">
          
          {/* Facility Filter Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search facility license, issuer authority, permit no., or scope..."
                value={certSearch}
                onChange={e => setCertSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 text-slate-800"
              />
              {certSearch && (
                <button onClick={() => setCertSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X size={13} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <select
                value={certStatusFilter}
                onChange={e => setCertStatusFilter(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:border-teal-700"
              >
                <option value="all">All Certifications</option>
                <option value="Valid">Valid / Fully Certified</option>
                <option value="Expiring Soon">Expiring Soon</option>
                <option value="Critical">Renewal Overdue</option>
              </select>
            </div>
          </div>

          {/* Cards Grid for Facility Certs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCerts.length > 0 ? (
              filteredCerts.map(cert => {
                const badge = getStatusBadge(cert.status, cert.expiry_date);
                const days = getDaysRemaining(cert.expiry_date);
                return (
                  <div key={cert.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between space-y-4">
                    
                    <div>
                      {/* Top Authority & Status */}
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                          {cert.issuer || 'Statutory Authority'}
                        </span>
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.cls}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                          {badge.label}
                        </span>
                      </div>

                      {/* Title & Permit No */}
                      <h3 className="font-extrabold text-sm text-slate-900 mt-2.5 leading-snug">
                        {cert.name}
                      </h3>
                      {cert.permit_no && (
                        <p className="text-[11px] font-mono font-bold text-slate-600 mt-1">
                          Permit No: <span className="text-slate-900">{cert.permit_no}</span>
                        </p>
                      )}

                      {/* Scope of Practice */}
                      {cert.scope && (
                        <p className="text-xs text-slate-600 mt-2 line-clamp-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
                          {cert.scope}
                        </p>
                      )}
                    </div>

                    {/* Metadata & Actions */}
                    <div className="pt-3 border-t border-slate-100 space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Valid Until</span>
                          <span className="font-mono font-bold text-slate-900">{cert.expiry_date}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Cycle</span>
                          <span className="font-semibold text-slate-700">{cert.inspection_cycle || 'Annual'}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <div className={`text-[11px] font-bold ${
                          days !== null && days < 0 
                            ? 'text-rose-600' 
                            : days !== null && days <= 60 
                            ? 'text-amber-600' 
                            : 'text-slate-500'
                        }`}>
                          {days !== null ? (days < 0 ? `${Math.abs(days)}d Overdue` : `${days} days remaining`) : 'Verified'}
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleQuickRenewCert(cert)}
                            className="px-2 py-1 text-xs font-bold text-teal-800 hover:bg-teal-50 rounded-lg transition-colors cursor-pointer"
                          >
                            Renew
                          </button>
                          <button
                            onClick={() => handleOpenEditCert(cert)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Edit Permit Details"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            onClick={() => handleDeleteCert(cert.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete Record"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>

                  </div>
                );
              })
            ) : (
              <div className="col-span-full py-12 px-4 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
                <div className="w-12 h-12 mx-auto rounded-full bg-teal-50 flex items-center justify-center text-teal-700">
                  <Building2 size={24} />
                </div>
                <div className="font-bold text-sm text-slate-800">
                  {certs.length === 0 ? 'No Facility Operating Permits on File' : 'No Facility Permits Found'}
                </div>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  {certs.length === 0 
                    ? 'There are currently no institutional operating permits or health authority certificates recorded. Click "Add Operating Permit" to record facility accreditation.'
                    : 'No facility certifications match the specified search or status filters.'}
                </p>
                {certs.length === 0 && (
                  <button
                    onClick={handleOpenAddCert}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition-all shadow-xs cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Add Operating Permit</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ── TAB 3: STATUTORY AUDITS & INSPECTION ROADMAP ── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'audits' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                  Quality Directorate
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <CheckSquare size={18} className="text-teal-700" />
                Statutory Audits &amp; Accreditation Assessment Schedule
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Official surveillance timeline for statutory inspections and accreditation standards assessments.
              </p>
            </div>
            <button
              onClick={handleOpenAddAudit}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition-all shadow-xs shrink-0 cursor-pointer self-start sm:self-center"
            >
              <Plus size={14} />
              <span>Schedule Inspection</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {audits.length > 0 ? (
              audits.map(audit => (
                <div key={audit.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-slate-300 transition-all space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                        {audit.category || 'Statutory Quality'}
                      </span>
                      <h3 className="font-extrabold text-base text-slate-900 mt-2">
                        {audit.title}
                      </h3>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-2xl font-black text-teal-700">{audit.readiness_score}%</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Readiness</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    {audit.description || 'Statutory review covering clinical documentation, emergency protocols, and medical device maintenance.'}
                  </p>

                  {/* Readiness Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                      <span>Audit Preparation Index</span>
                      <span>{audit.readiness_score}% Completed</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          audit.readiness_score >= 90 ? 'bg-emerald-600' : audit.readiness_score >= 75 ? 'bg-teal-600' : 'bg-amber-500'
                        }`}
                        style={{ width: `${audit.readiness_score}%` }}
                      />
                    </div>
                  </div>

                  {/* Footer Details */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-slate-600 font-semibold">
                      <Calendar size={14} className="text-teal-700" />
                      <span>Inspection Date: <strong className="text-slate-900">{audit.scheduled_date}</strong></span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditAudit(audit)}
                        className="px-3 py-1.5 text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-xl transition-colors cursor-pointer"
                      >
                        Update Readiness
                      </button>
                      <button
                        onClick={() => handleDeleteAudit(audit.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete Inspection"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-12 px-4 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
                <div className="w-12 h-12 mx-auto rounded-full bg-teal-50 flex items-center justify-center text-teal-700">
                  <CheckSquare size={24} />
                </div>
                <div className="font-bold text-sm text-slate-800">No Statutory Audits or Inspections Scheduled</div>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  There are currently no active statutory quality audits or surveillance reviews on file. Schedule an inspection to track institutional readiness metrics.
                </p>
                <button
                  onClick={handleOpenAddAudit}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition-all shadow-xs cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Schedule Inspection</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ── TAB 4: STATUTORY REPORTING CALENDAR ── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'calendar' && (
        <div className="space-y-4">
          
          {/* Header Action Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                  Regulatory Filings
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <Calendar size={18} className="text-teal-700" />
                Statutory Reporting &amp; Mandatory Filings Schedule
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Regulatory return calendar for clinical registries, occupational health, and radiation safety submissions.
              </p>
            </div>
            <button
              onClick={handleOpenAddCalendar}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition-all shadow-xs shrink-0 cursor-pointer self-start sm:self-center"
            >
              <Plus size={14} />
              <span>Schedule Filing</span>
            </button>
          </div>

          {/* Filters Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search filings, authorities, focal officers, or reporting scope..."
                value={calendarSearch}
                onChange={e => setCalendarSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 text-slate-800"
              />
              {calendarSearch && (
                <button onClick={() => setCalendarSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X size={13} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={calendarFreqFilter}
                onChange={e => setCalendarFreqFilter(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:border-teal-700"
              >
                <option value="all">All Frequencies</option>
                <option value="Monthly">Monthly</option>
                <option value="Quarterly">Quarterly</option>
                <option value="Event-Driven">Event-Driven / Bi-Monthly</option>
                <option value="Annual">Annual</option>
              </select>

              <select
                value={calendarStatusFilter}
                onChange={e => setCalendarStatusFilter(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:border-teal-700"
              >
                <option value="all">All Statuses</option>
                <option value="Upcoming">Upcoming</option>
                <option value="Compliant">Compliant / Filed</option>
                <option value="Pending Submission">Pending Submission</option>
                <option value="Overdue">Overdue</option>
              </select>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-4">Statutory Filing / Mandatory Return</th>
                    <th className="py-3 px-4">Regulatory Authority</th>
                    <th className="py-3 px-4">Filing Frequency</th>
                    <th className="py-3 px-4">Due Date Schedule</th>
                    <th className="py-3 px-4">Focal Person / Officer</th>
                    <th className="py-3 px-4 text-center">Filing Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredCalendarItems.length > 0 ? (
                    filteredCalendarItems.map(item => {
                      const isCompliant = item.status === 'Compliant' || item.status === 'Submitted';
                      const isPending = item.status === 'Pending Submission';
                      const isOverdue = item.status === 'Overdue';

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4 max-w-xs">
                            <div className="font-extrabold text-slate-900">{item.title}</div>
                            {item.description && (
                              <div className="text-[11px] text-slate-500 font-medium line-clamp-2 mt-0.5" title={item.description}>
                                {item.description}
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-800">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono text-[11px]">
                              <Landmark size={12} className="text-slate-500" />
                              {item.authority || 'MoH / Regulatory Body'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-extrabold tracking-wide uppercase ${
                              item.frequency?.includes('Monthly')
                                ? 'bg-teal-50 text-teal-800 border border-teal-200'
                                : item.frequency?.includes('Quarterly')
                                ? 'bg-blue-50 text-blue-800 border border-blue-200'
                                : item.frequency?.includes('Annual')
                                ? 'bg-purple-50 text-purple-800 border border-purple-200'
                                : 'bg-amber-50 text-amber-800 border border-amber-200'
                            }`}>
                              {item.frequency || 'Scheduled Filing'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900">{item.due_date_rule}</div>
                            {item.next_due_date && (
                              <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                <Clock size={11} className="text-teal-700" />
                                <span>Next: <strong>{item.next_due_date}</strong></span>
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-800">{item.focal_person || 'Assigned Lead'}</div>
                            {item.last_submitted_date && (
                              <div className="text-[10px] text-emerald-700 font-medium mt-0.5 flex items-center gap-1">
                                <CheckCircle2 size={10} />
                                <span>Filed on {item.last_submitted_date}</span>
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold border ${
                              isCompliant
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : isPending
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : isOverdue
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-slate-50 text-slate-700 border-slate-200'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                isCompliant ? 'bg-emerald-500' : isPending ? 'bg-amber-500' : isOverdue ? 'bg-rose-500' : 'bg-slate-400'
                              }`} />
                              {item.status || 'Upcoming'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleToggleCalendarSubmitted(item)}
                                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                                  isCompliant
                                    ? 'border-slate-200 text-slate-600 hover:bg-slate-100'
                                    : 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                                }`}
                                title={isCompliant ? 'Mark as Pending' : 'Mark as Filed'}
                              >
                                {isCompliant ? 'Reopen' : 'Mark Filed'}
                              </button>
                              <button
                                onClick={() => handleOpenEditCalendar(item)}
                                className="p-1.5 text-slate-500 hover:text-teal-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                                title="Edit Schedule"
                              >
                                <Edit3 size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteCalendar(item.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Delete Filing"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-12 px-4 text-center">
                        <div className="max-w-md mx-auto space-y-3">
                          <div className="w-12 h-12 mx-auto rounded-full bg-teal-50 flex items-center justify-center text-teal-700">
                            <Calendar size={22} />
                          </div>
                          <div className="font-bold text-sm text-slate-800">
                            {calendarItems.length === 0 ? 'No Statutory Filings Scheduled' : 'No Filings Match Your Criteria'}
                          </div>
                          <p className="text-xs text-slate-500">
                            {calendarItems.length === 0
                              ? 'There are currently no active statutory reporting filings or regulatory return schedules on file. Register mandatory filings to track submission deadlines.'
                              : 'Try adjusting your search keywords, filing frequency filter, or status selection.'}
                          </p>
                          {calendarItems.length === 0 ? (
                            <button
                              onClick={handleOpenAddCalendar}
                              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition-all shadow-xs cursor-pointer"
                            >
                              <Plus size={14} />
                              <span>Schedule Filing</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => { setCalendarSearch(''); setCalendarFreqFilter('all'); setCalendarStatusFilter('all'); }}
                              className="text-xs font-bold text-teal-700 hover:underline cursor-pointer"
                            >
                              Reset filters
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ── MODAL: STAFF LICENSE FORM ── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {showLicenseModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-base text-slate-900">
                  {editingLicense ? 'Edit Practitioner Licensure Record' : 'Register Clinician Practicing License'}
                </h3>
                <p className="text-xs text-slate-500">Rwanda Health Professional Council Records</p>
              </div>
              <button onClick={() => setShowLicenseModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveLicense} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Full Practitioner Name *</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Dr. Jean-Paul Habimana"
                  value={licenseForm.staff_name}
                  onChange={e => setLicenseForm({ ...licenseForm, staff_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-teal-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Clinical Role / Title *</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Consultant Physician"
                    value={licenseForm.role}
                    onChange={e => setLicenseForm({ ...licenseForm, role: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-teal-700"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Council Registration No. *</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. RMDC/2018/0941"
                    value={licenseForm.council_reg_no}
                    onChange={e => setLicenseForm({ ...licenseForm, council_reg_no: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-teal-700 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Clinical Department</label>
                  <select
                    value={licenseForm.department}
                    onChange={e => setLicenseForm({ ...licenseForm, department: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-teal-700 bg-white"
                  >
                    {CLINICAL_DEPARTMENTS.filter(d => d !== 'All Departments').map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">License Type *</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. RMDC Full Practicing License"
                    value={licenseForm.license_type}
                    onChange={e => setLicenseForm({ ...licenseForm, license_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-teal-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">License Expiry Date *</label>
                  <input
                    required
                    type="date"
                    value={licenseForm.expiry_date}
                    onChange={e => setLicenseForm({ ...licenseForm, expiry_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-teal-700"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Compliance Status</label>
                  <select
                    value={licenseForm.status}
                    onChange={e => setLicenseForm({ ...licenseForm, status: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-teal-700 bg-white"
                  >
                    <option value="Valid">Valid / Compliant</option>
                    <option value="Expiring Soon">Expiring Soon (&lt; 60 days)</option>
                    <option value="Critical">Critical / Overdue</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowLicenseModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold cursor-pointer transition-colors shadow-xs"
                >
                  {editingLicense ? 'Save Changes' : 'Register License'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ── MODAL: FACILITY PERMIT FORM ── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {showCertModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-base text-slate-900">
                  {editingCert ? 'Edit Facility Operating Permit' : 'Add Facility Operating Permit'}
                </h3>
                <p className="text-xs text-slate-500">Institutional Accreditations &amp; Clearances</p>
              </div>
              <button onClick={() => setShowCertModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCert} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Permit / Certificate Title *</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. MoH Comprehensive Clinic Operating License"
                  value={certForm.name}
                  onChange={e => setCertForm({ ...certForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-teal-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Issuing Authority *</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Ministry of Health (MOH) Rwanda"
                    value={certForm.issuer}
                    onChange={e => setCertForm({ ...certForm, issuer: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-teal-700"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Permit / License No.</label>
                  <input
                    type="text"
                    placeholder="e.g. MOH/HOSP/2025/082"
                    value={certForm.permit_no}
                    onChange={e => setCertForm({ ...certForm, permit_no: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-teal-700 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Certified Scope of Practice</label>
                <textarea
                  rows={2}
                  placeholder="Authorized clinical areas, e.g. Outpatient, Inpatient Beds, Day Surgery, Diagnostics & 24/7 Emergency"
                  value={certForm.scope}
                  onChange={e => setCertForm({ ...certForm, scope: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-teal-700"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Inspection Cycle</label>
                  <input
                    type="text"
                    placeholder="e.g. Annual"
                    value={certForm.inspection_cycle}
                    onChange={e => setCertForm({ ...certForm, inspection_cycle: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-teal-700"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Expiry Date *</label>
                  <input
                    required
                    type="date"
                    value={certForm.expiry_date}
                    onChange={e => setCertForm({ ...certForm, expiry_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-teal-700"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Status</label>
                  <select
                    value={certForm.status}
                    onChange={e => setCertForm({ ...certForm, status: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-teal-700 bg-white"
                  >
                    <option value="Valid">Valid</option>
                    <option value="Expiring Soon">Expiring Soon</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCertModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold cursor-pointer transition-colors shadow-xs"
                >
                  {editingCert ? 'Save Changes' : 'Record Permit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ── MODAL: AUDIT READINESS FORM ── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {showAuditModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-base text-slate-900">
                  {editingAudit ? 'Update Inspection Readiness Metrics' : 'Schedule Statutory Audit / Inspection'}
                </h3>
                <p className="text-xs text-slate-500">
                  {editingAudit ? 'Statutory Audit Quality Controls' : 'Plan and track upcoming statutory inspections'}
                </p>
              </div>
              <button onClick={() => setShowAuditModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveAudit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Inspection / Audit Title *</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. MoH Annual Health Facility Inspection"
                  value={auditForm.title}
                  onChange={e => setAuditForm({ ...auditForm, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-teal-700 font-semibold text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Scheduled Date *</label>
                  <input
                    required
                    type="date"
                    value={auditForm.scheduled_date}
                    onChange={e => setAuditForm({ ...auditForm, scheduled_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-teal-700"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Readiness Score (%): {auditForm.readiness_score}%</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={auditForm.readiness_score}
                    onChange={e => setAuditForm({ ...auditForm, readiness_score: Number(e.target.value) })}
                    className="w-full mt-2 accent-teal-700 cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Audit Category</label>
                <input
                  type="text"
                  placeholder="e.g. Statutory Quality, Radiation Safety, Laboratory Accreditation"
                  value={auditForm.category}
                  onChange={e => setAuditForm({ ...auditForm, category: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-teal-700"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Scope &amp; Preparation Description</label>
                <textarea
                  rows={3}
                  placeholder="Detailed inspection focus and statutory requirements..."
                  value={auditForm.description}
                  onChange={e => setAuditForm({ ...auditForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-teal-700"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAuditModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold cursor-pointer transition-colors shadow-xs"
                >
                  {editingAudit ? 'Update Audit Record' : 'Schedule Audit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ── MODAL: STATUTORY CALENDAR FILING FORM ── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {showCalendarModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-base text-slate-900">
                  {editingCalendarItem ? 'Edit Statutory Filing Schedule' : 'Schedule Statutory Mandatory Filing'}
                </h3>
                <p className="text-xs text-slate-500">
                  {editingCalendarItem ? 'Update statutory filing schedule and responsible lead' : 'Register statutory reporting deadline and regulatory authority'}
                </p>
              </div>
              <button onClick={() => setShowCalendarModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCalendar} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Filing / Mandatory Return Title *</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. MoH HMIS / DHIS-2 Clinical Data Return"
                  value={calendarForm.title}
                  onChange={e => setCalendarForm({ ...calendarForm, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-teal-700 font-semibold text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Regulatory Authority</label>
                  <input
                    type="text"
                    placeholder="e.g. MoH, RURA, Rwanda FDA"
                    value={calendarForm.authority}
                    onChange={e => setCalendarForm({ ...calendarForm, authority: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-teal-700"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Filing Frequency *</label>
                  <select
                    value={calendarForm.frequency}
                    onChange={e => setCalendarForm({ ...calendarForm, frequency: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-teal-700 bg-white"
                  >
                    <option value="Monthly Filing">Monthly Filing</option>
                    <option value="Quarterly Filing">Quarterly Filing</option>
                    <option value="Event-Driven / Bi-Monthly">Event-Driven / Bi-Monthly</option>
                    <option value="Semi-Annual Filing">Semi-Annual Filing</option>
                    <option value="Annual Filing">Annual Filing</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Due Date Schedule / Rule *</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Due 5th of each month"
                    value={calendarForm.due_date_rule}
                    onChange={e => setCalendarForm({ ...calendarForm, due_date_rule: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-teal-700"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Next Specific Due Date</label>
                  <input
                    type="date"
                    value={calendarForm.next_due_date || ''}
                    onChange={e => setCalendarForm({ ...calendarForm, next_due_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-teal-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Responsible Focal Officer</label>
                  <input
                    type="text"
                    placeholder="e.g. Lead Health Records & Medical Director"
                    value={calendarForm.focal_person}
                    onChange={e => setCalendarForm({ ...calendarForm, focal_person: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-teal-700"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Filing Status</label>
                  <select
                    value={calendarForm.status}
                    onChange={e => setCalendarForm({ ...calendarForm, status: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-teal-700 bg-white"
                  >
                    <option value="Upcoming">Upcoming</option>
                    <option value="Compliant">Compliant / Filed</option>
                    <option value="Pending Submission">Pending Submission</option>
                    <option value="Overdue">Overdue</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Last Submitted Date</label>
                <input
                  type="date"
                  value={calendarForm.last_submitted_date || ''}
                  onChange={e => setCalendarForm({ ...calendarForm, last_submitted_date: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-teal-700"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Filing Description &amp; Scope</label>
                <textarea
                  rows={3}
                  placeholder="Summary of required data return, submission portal, or verification guidelines..."
                  value={calendarForm.description}
                  onChange={e => setCalendarForm({ ...calendarForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-teal-700"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCalendarModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold cursor-pointer transition-colors shadow-xs"
                >
                  {editingCalendarItem ? 'Update Filing Schedule' : 'Schedule Filing'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
