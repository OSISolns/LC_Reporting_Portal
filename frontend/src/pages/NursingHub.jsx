import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Stethoscope, 
  Activity, 
  FileText, 
  Pill, 
  Share2, 
  History, 
  User, 
  CheckCircle2, 
  Calendar, 
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Clock,
  Heart
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import PatientAutocomplete from '../components/PatientAutocomplete';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { Card, Badge, Button } from '../components/ui/index.jsx';

export default function NursingHub() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [recentPatients, setRecentPatients] = useState([]);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const [now, setNow] = useState(new Date());

  // Greeting helper
  const getGreeting = () => {
    const hrs = now.getHours();
    if (hrs < 12) return { text: 'Good Morning', sub: 'Clinical Shift Initiation Started' };
    if (hrs < 17) return { text: 'Good Afternoon', sub: 'Standard Mid-Day Clinical Handover' };
    return { text: 'Good Evening', sub: 'Night Shift & Evening Triage Protocols' };
  };

  useEffect(() => {
    const fetchRecent = async () => {
      try {
        setLoadingRecent(true);
        const res = await api.get('/clinical/observations/recent');
        if (res.data.success && res.data.data) {
          setRecentPatients(res.data.data.slice(0, 5));
        }
      } catch (err) {
        console.error('Failed to load recent clinical list:', err);
      } finally {
        setLoadingRecent(false);
      }
    };
    fetchRecent();
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const handlePatientSelect = (patient) => {
    setSelectedPatient(patient);
    toast.success(`Active workspace loaded for ${patient.full_name}`);
  };

  const handleQuickAction = (submodule) => {
    if (submodule === 'Daily Stock Checkup') {
      navigate('/nursing-hub/inventory');
      return;
    }

    if (!selectedPatient) {
      toast.error(`Please search and select a patient first to proceed with ${submodule}!`, {
        icon: '⚠️',
        duration: 3500
      });
      return;
    }

    if (submodule === 'Clinical Sheet') {
      navigate(`/patients/${selectedPatient.pid}/clinical-sheet?tab=clinical`);
    } else if (submodule === 'Medication Record (MAR)') {
      navigate(`/patients/${selectedPatient.pid}/clinical-sheet?tab=mar`);
    } else if (submodule === 'SBAR Handover') {
      navigate(`/patients/${selectedPatient.pid}/clinical-sheet?tab=sbar`);
    } else if (submodule === 'Patient History & Archive') {
      navigate(`/patients/${selectedPatient.pid}/records`);
    }
  };

  const greeting = getGreeting();

  return (
    <div style={{ paddingBottom: '4rem', fontFamily: 'inherit' }} className="space-y-8 animate-fadeIn">
      {/* ── Header Welcome Hero ── */}
      <div style={{ 
        background: 'linear-gradient(135deg, #075985 0%, #0369a1 100%)', 
        borderRadius: '28px', 
        padding: '2.5rem', 
        color: '#fff', 
        position: 'relative', 
        overflow: 'hidden',
        boxShadow: '0 20px 40px rgba(3,105,161,0.15)'
      }}>
        <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: '35%', background: 'radial-gradient(circle at top right, rgba(255,255,255,0.08), transparent 70%)' }} />
        <div style={{ position: 'relative', zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
            <div style={{ padding: '8px', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: '10px', backdropFilter: 'blur(8px)' }}>
              <Stethoscope size={20} className="text-sky-200" />
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#e0f2fe' }}>
              Integrated Nursing Node
            </span>
          </div>
          
          <h1 style={{ margin: 0, fontSize: '2.5rem', fontWeight: 900, tracking: '-0.025em' }}>
            {greeting.text}, Nurse {user?.name?.split(' ')[0] || 'Officer'} 👩‍⚕️
          </h1>
          <p style={{ marginTop: '0.5rem', fontSize: '1rem', color: '#bae6fd', fontWeight: 500, maxWidth: '640px' }}>
            Welcome to the Clinical Command Center. {greeting.sub}. Reconcile and submit assessments, triage records, and patient MAR forms.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.6fr', gap: '2rem' }} className="grid-cols-1 lg:grid-cols-2">
        {/* ── Left Column: Patient Search and Quick Info ── */}
        <div className="space-y-8">
          <Card className="p-8 space-y-6 border border-slate-200 shadow-xl rounded-[24px] relative overflow-hidden bg-white">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '2px dashed #f1f5f9', paddingBottom: '1.25rem' }}>
              <div style={{ padding: '8px', backgroundColor: '#e0f2fe', color: '#0369a1', borderRadius: '10px' }}>
                <User size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>Patient Search Registry</h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Locate standard records by Patient Name or PID</p>
              </div>
            </div>

            <div className="space-y-2">
              <label style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569' }}>
                Active Patient Selector
              </label>
              <PatientAutocomplete 
                value={selectedPatient?.full_name || ''} 
                onChange={() => {}} 
                onPatientSelect={handlePatientSelect}
                placeholder="Search by full name, PID (e.g. 23013032)..."
                inputStyle={{
                  width: '100%',
                  height: '52px',
                  borderRadius: '16px',
                  border: '2px solid #e2e8f0',
                  padding: '0 16px',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  backgroundColor: '#f8fafc'
                }}
              />
            </div>

            {selectedPatient ? (
              <div style={{
                background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                borderRadius: '20px',
                padding: '1.5rem',
                border: '1px solid #e2e8f0',
                position: 'relative'
              }} className="space-y-4 animate-scaleUp">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '16px',
                    background: '#0369a1',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: '1.2rem',
                    boxShadow: '0 10px 15px -3px rgba(3,105,161,0.2)'
                  }}>
                    {selectedPatient.full_name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'P'}
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#0f172a' }}>
                      {selectedPatient.full_name}
                    </h4>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0369a1', fontFamily: 'monospace' }}>
                      PID: #{selectedPatient.pid}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }} className="text-xs">
                  <div>
                    <p style={{ margin: 0, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.65rem' }}>Gender</p>
                    <p style={{ margin: '2px 0 0', fontWeight: 800, color: '#334155' }}>{selectedPatient.gender || 'Not specified'}</p>
                  </div>
                  <div>
                    <p style={{ margin: 0, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.65rem' }}>Age / DOB</p>
                    <p style={{ margin: '2px 0 0', fontWeight: 800, color: '#334155' }}>
                      {selectedPatient.age || 'N/A'} yrs ({selectedPatient.dob || 'N/A'})
                    </p>
                  </div>
                  <div>
                    <p style={{ margin: 0, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.65rem' }}>Allergies</p>
                    <p style={{ margin: '2px 0 0', fontWeight: 800, color: selectedPatient.allergies ? '#ef4444' : '#22c55e' }}>
                      {selectedPatient.allergies || 'None Reported'}
                    </p>
                  </div>
                  <div>
                    <p style={{ margin: 0, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.65rem' }}>Insurance Provider</p>
                    <p style={{ margin: '2px 0 0', fontWeight: 800, color: '#0369a1' }}>{selectedPatient.insurance || 'Walk-in / Private'}</p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '1.5rem' }} className="flex-col sm:flex-row">
                  <Button 
                    onClick={() => navigate(`/patients/${selectedPatient.pid}/clinical-sheet`)}
                    className="flex-1 py-3.5 rounded-xl bg-[#0369a1] hover:bg-[#0284c7] text-white font-black text-xs uppercase tracking-widest shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <FileText size={14} /> Open Clinical Sheet
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setSelectedPatient(null)}
                    className="py-3.5 rounded-xl border-slate-200 text-slate-500 font-black text-xs uppercase tracking-widest hover:bg-slate-50"
                  >
                    Clear Selector
                  </Button>
                </div>
              </div>
            ) : (
              <div style={{
                border: '2px dashed #cbd5e1',
                borderRadius: '20px',
                padding: '2.5rem',
                textAlign: 'center',
                color: '#64748b'
              }} className="bg-slate-50/50">
                <User size={36} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                <p style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0 }}>No Patient Selected</p>
                <p style={{ fontSize: '0.75rem', margin: '4px 0 0', color: '#94a3b8', fontWeight: 500 }}>
                  Search for a patient above to load their active workspace and clinical charts.
                </p>
              </div>
            )}
          </Card>

          {/* ── Recent Clinical Submissions ── */}
          <Card className="p-8 border border-slate-200 shadow-lg rounded-[24px] bg-white">
            <h3 style={{ margin: '0 0 1.5rem', fontSize: '1.1rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <History size={18} className="text-sky-600" /> Recent Consultations
            </h3>

            <div className="space-y-4">
              {loadingRecent ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="animate-pulse flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-200" />
                      <div className="space-y-2">
                        <div className="w-28 h-3 bg-slate-200 rounded" />
                        <div className="w-20 h-2 bg-slate-200 rounded" />
                      </div>
                    </div>
                    <div className="w-12 h-6 bg-slate-200 rounded" />
                  </div>
                ))
              ) : recentPatients.length > 0 ? (
                recentPatients.map((p) => {
                  const patientName = p.patient_name || p.name || 'Unknown Patient';
                  const initials = patientName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                  return (
                    <div 
                      key={p.patient_id}
                      onClick={() => handlePatientSelect({ pid: p.patient_id, full_name: patientName, dob: p.dob, gender: p.gender, insurance: p.insurance_provider })}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'between',
                        padding: '12px 16px',
                        border: '1px solid #f1f5f9',
                        borderRadius: '16px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      className="hover:border-sky-300 hover:bg-sky-50/30 group"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '12px',
                          background: '#e0f2fe',
                          color: '#0369a1',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '0.85rem'
                        }}>
                          {initials}
                        </div>
                        <div>
                          <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800, color: '#334155' }} className="group-hover:text-sky-700 transition-colors">
                            {patientName}
                          </p>
                          <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>
                            PID: #{p.patient_id}
                          </p>
                        </div>
                      </div>
                      <Badge variant="success" className="text-[10px]">Active</Badge>
                    </div>
                  );
                })
              ) : (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>
                  No recent observations logged today.
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* ── Right Column: Sub-Modules Grid ── */}
        <div className="space-y-8">
          <Card className="p-8 border border-slate-200 shadow-xl rounded-[24px] bg-white">
            <div style={{ borderBottom: '2px dashed #f1f5f9', paddingBottom: '1.25rem', marginBottom: '2rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>Clinical Sub-Modules</h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Authorized nursing protocols & assessment procedures</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { 
                  title: 'Clinical Sheet', 
                  desc: 'Manage clinical triage, patient history, allergies, and nursing notes.',
                  icon: <Stethoscope size={22} />, 
                  color: '#0284c7', 
                  bg: '#e0f2fe' 
                },
                { 
                  title: 'Medication Record (MAR)', 
                  desc: 'Chart scheduled medications, dosage, frequencies, routes, and logs.',
                  icon: <Pill size={22} />, 
                  color: '#10b981', 
                  bg: '#d1fae5' 
                },
                { 
                  title: 'SBAR Handover', 
                  desc: 'Submit situation, background, assessment, recommendation reports.',
                  icon: <Share2 size={22} />, 
                  color: '#8b5cf6', 
                  bg: '#ede9fe' 
                },
                { 
                  title: 'Patient History & Archive', 
                  desc: 'Extract historical pdf observation worksheets and previous logs.',
                  icon: <History size={22} />, 
                  color: '#f59e0b', 
                  bg: '#fef3c7' 
                },
                { 
                  title: 'Daily Stock Checkup', 
                  desc: 'Track and reconcile daily session checkups of medicines and consumables against stock.',
                  icon: <Activity size={22} />, 
                  color: '#ec4899', 
                  bg: '#fce7f3' 
                }
              ].filter(sub => {
                if (sub.title === 'Daily Stock Checkup') {
                  return user?.role === 'chef-nurse';
                }
                return true;
              }).map((sub, idx) => (
                <div 
                  key={idx}
                  onClick={() => handleQuickAction(sub.title)}
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '20px',
                    padding: '1.5rem',
                    border: '1.5px solid #e2e8f0',
                    cursor: 'pointer',
                    transition: 'all 0.25s',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'between',
                    minHeight: '170px'
                  }}
                  className="hover:border-sky-500 hover:shadow-lg hover:-translate-y-1 transition-all group"
                >
                  <div>
                    <div style={{ 
                      padding: '10px', 
                      borderRadius: '12px', 
                      backgroundColor: sub.bg, 
                      color: sub.color, 
                      width: 'fit-content',
                      marginBottom: '1rem' 
                    }}>
                      {sub.icon}
                    </div>
                    <h4 style={{ margin: '0 0 6px', fontSize: '0.95rem', fontWeight: 900, color: '#1e293b' }} className="group-hover:text-sky-700 transition-colors">
                      {sub.title}
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', lineHeight: '1.45', fontWeight: 500 }}>
                      {sub.desc}
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', fontWeight: 800, color: sub.color, marginTop: '1.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Open Protocol <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* ── Operational Status & SLA targets ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }} className="grid-cols-1 sm:grid-cols-2">
            <Card className="p-6 border border-slate-200 shadow-md rounded-[24px] bg-white flex items-center gap-4">
              <div style={{ padding: '12px', backgroundColor: '#ecfdf5', color: '#10b981', borderRadius: '16px' }}>
                <CheckCircle2 size={24} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900, color: '#0f172a', leading: 'none' }}>100%</h4>
                <p style={{ margin: '4px 0 0', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>
                  Compliance Score
                </p>
              </div>
            </Card>

            <Card className="p-6 border border-slate-200 shadow-md rounded-[24px] bg-white flex items-center gap-4">
              <div style={{ padding: '12px', backgroundColor: '#fef2f2', color: '#ef4444', borderRadius: '16px' }}>
                <Heart size={24} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900, color: '#0f172a', leading: 'none' }}>Nominal</h4>
                <p style={{ margin: '4px 0 0', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>
                  Triage Status
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
