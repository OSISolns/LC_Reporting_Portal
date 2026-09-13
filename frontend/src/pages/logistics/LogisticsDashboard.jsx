import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import {
  Truck, Zap, ShieldAlert, Wrench, Package, DollarSign,
  AlertTriangle, CheckCircle2, Clock, Plus, Activity, FileText,
  ChevronRight, Calendar, RefreshCw, LayoutDashboard, ShieldCheck, Tag
} from 'lucide-react';
import Modal from '../../components/Modal';

// Import sub-modules for embedded tab navigation
import FleetOperations from './FleetOperations';
import FacilitiesPower from './FacilitiesPower';
import AssetManagement from './AssetManagement';
import MaintenanceStock from './MaintenanceStock';
import LogisticsAdmin from './LogisticsAdmin';

const LogisticsDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    alertRibbon: [],
    kpis: {
      fleet: { total: 0, available: 0, inUse: 0, maintenance: 0 },
      power: { gridStatus: 'Grid Active', genStatus: 'Standby', fuelLevelPct: 100 },
      ppm: { pending: 0 },
      incidents: { openCount: 0, criticalCount: 0 },
      it: { inProgress: 0, overdue: 0 }
    },
    vehicles: [],
    activeTrips: [],
    latestGen: null,
    latestTour: null,
    lowStock: [],
    openIncidents: [],
    openItTickets: []
  });

  // Modal states for Fast Action Launchpad
  const [activeModal, setActiveModal] = useState(null); // 'dispatch', 'gencheck'
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [dispatchForm, setDispatchForm] = useState({
    vehicle_id: '',
    driver_name: user?.fullName || '',
    referring_physician: '',
    destination: '',
    patient_name: '',
    start_km: '',
    auth_by: 'Logistics Desk',
    trip_type: 'Operational',
  });

  const [genForm, setGenForm] = useState({
    battery_voltage: '',
    output_voltage: '',
    fuel_level_pct: '',
    fuel_liters: '',
    test_run_mins: '',
    operator_name: user?.fullName || '',
    notes: ''
  });

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/logistics/dashboard-stats', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        toast.error(json.message || 'Failed to load dashboard data');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error loading logistics dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleDispatchSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await fetch('/api/logistics/fleet/trips', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(dispatchForm)
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Vehicle trip dispatched successfully!');
        setActiveModal(null);
        fetchDashboardData();
      } else {
        toast.error(json.message || 'Failed to dispatch trip');
      }
    } catch (err) {
      toast.error('Error dispatching trip');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await fetch('/api/logistics/facilities/generator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(genForm)
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Generator daily check recorded successfully!');
        setActiveModal(null);
        fetchDashboardData();
      } else {
        toast.error(json.message || 'Failed to record generator check');
      }
    } catch (err) {
      toast.error('Error submitting generator log');
    } finally {
      setSubmitting(false);
    }
  };

  const setTab = (tabName) => {
    setSearchParams(tabName === 'overview' ? {} : { tab: tabName });
  };

  const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div style={{ paddingBottom: '3rem' }}>
      {/* ── HEADER TITLE BAR ── */}
      <div style={{ background: 'var(--primary-dark)', borderRadius: '24px', padding: '2.5rem', color: '#fff', marginBottom: '2rem', position: 'relative', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,59,68,0.1)' }}>
        <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '240px', height: '240px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />
        <div style={{ position: 'absolute', bottom: '-20px', right: '100px', width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(255,255,255,0.02)' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem', position: 'relative' }}>
          <div>
            <p style={{ margin: '0 0 6px', fontSize: '0.85rem', opacity: 0.7, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {todayStr} • LUMINA LOGISTICS PORTAL
            </p>
            <h1 style={{ margin: 0, fontSize: '2.25rem', fontWeight: 800, color: '#fff' }}>
              Logistics Command Hub
            </h1>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button
              onClick={() => navigate('/incidents')}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.75rem 1.25rem', backgroundColor: '#dc2626', border: 'none', borderRadius: '12px', color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#b91c1c'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = '#dc2626'}
            >
              <AlertTriangle size={16} /> Incident Reports
            </button>
            <button
              onClick={() => setActiveModal('dispatch')}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.75rem 1.25rem', backgroundColor: '#0284c7', border: 'none', borderRadius: '12px', color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#0369a1'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = '#0284c7'}
            >
              <Truck size={16} /> Dispatch Vehicle
            </button>
            <button
              onClick={() => setActiveModal('gencheck')}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.75rem 1.25rem', backgroundColor: '#16a34a', border: 'none', borderRadius: '12px', color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(22, 163, 74, 0.3)' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#15803d'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = '#16a34a'}
            >
              <Zap size={16} /> Log Gen Check
            </button>
            <button
              onClick={fetchDashboardData}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.75rem 1.25rem', backgroundColor: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px', color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', backdropFilter: 'blur(10px)', transition: 'all 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
            >
              <RefreshCw size={16} /> Refresh Feed
            </button>
          </div>
        </div>
      </div>

      {/* ── CLEAN BLUE & GREEN PORTAL TABS ── */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        borderBottom: '2px solid #e2e8f0',
        marginBottom: '1.5rem',
        overflowX: 'auto',
        paddingBottom: '2px'
      }}>
        <button
          onClick={() => setTab('overview')}
          style={{
            padding: '10px 16px',
            border: 'none',
            background: 'none',
            fontWeight: 700,
            fontSize: '0.9rem',
            color: activeTab === 'overview' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'overview' ? '3px solid #0284c7' : '3px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap'
          }}
        >
          <LayoutDashboard size={18} /> Overview
        </button>

        <button
          onClick={() => setTab('fleet')}
          style={{
            padding: '10px 16px',
            border: 'none',
            background: 'none',
            fontWeight: 700,
            fontSize: '0.9rem',
            color: activeTab === 'fleet' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'fleet' ? '3px solid #0284c7' : '3px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap'
          }}
        >
          <Truck size={18} /> Fleet Operations
        </button>

        <button
          onClick={() => setTab('facilities')}
          style={{
            padding: '10px 16px',
            border: 'none',
            background: 'none',
            fontWeight: 700,
            fontSize: '0.9rem',
            color: activeTab === 'facilities' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'facilities' ? '3px solid #0284c7' : '3px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap'
          }}
        >
          <Zap size={18} /> Facilities & Power
        </button>

        <button
          onClick={() => setTab('assets')}
          style={{
            padding: '10px 16px',
            border: 'none',
            background: 'none',
            fontWeight: 700,
            fontSize: '0.9rem',
            color: activeTab === 'assets' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'assets' ? '3px solid #0284c7' : '3px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap'
          }}
        >
          <Wrench size={18} /> Assets & Lifecycle
        </button>

        <button
          onClick={() => setTab('inventory')}
          style={{
            padding: '10px 16px',
            border: 'none',
            background: 'none',
            fontWeight: 700,
            fontSize: '0.9rem',
            color: activeTab === 'inventory' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'inventory' ? '3px solid #0284c7' : '3px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap'
          }}
        >
          <Package size={18} /> Maintenance Stock
        </button>

        <button
          onClick={() => setTab('admin')}
          style={{
            padding: '10px 16px',
            border: 'none',
            background: 'none',
            fontWeight: 700,
            fontSize: '0.9rem',
            color: activeTab === 'admin' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'admin' ? '3px solid #0284c7' : '3px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap'
          }}
        >
          <DollarSign size={18} /> Operations Admin
        </button>
      </div>

      {/* ── TAB CONDITIONAL CONTENT ── */}
      {activeTab === 'fleet' && <FleetOperations />}
      {activeTab === 'facilities' && <FacilitiesPower />}
      {activeTab === 'assets' && <AssetManagement />}
      {activeTab === 'inventory' && <MaintenanceStock />}
      {activeTab === 'admin' && <LogisticsAdmin />}

      {/* ── OVERVIEW TAB ── */}
      {activeTab === 'overview' && (
        <>

          {/* ── LOGISTICS HUB DIRECTORY ── */}
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e3a8a', marginBottom: '1rem' }}>
              Departmental Logistics Hub Modules
            </h2>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '1rem'
            }}>
              {/* Sub-Module 1 */}
              <div
                onClick={() => setTab('fleet')}
                className="glass card-shadow"
                style={{
                  padding: '1.5rem',
                  backgroundColor: '#ffffff',
                  borderRadius: '18px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '0.75rem' }}>
                    <div style={{ backgroundColor: '#e0f2fe', color: '#0284c7', padding: '12px', borderRadius: '10px' }}>
                      <Truck size={24} />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#1e3a8a' }}>Fleet Operations</h4>
                    </div>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: '#475569', margin: 0 }}>
                    Pre-Trip checks, movement authorization, trip logbook, and regulatory compliance expiries.
                  </p>
                </div>
                <div style={{ marginTop: '1rem' }}>
                  <button
                    className="btn"
                    style={{
                      backgroundColor: '#0284c7',
                      color: '#ffffff',
                      padding: '8px 14px',
                      borderRadius: '6px',
                      border: 'none',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      width: '100%',
                      cursor: 'pointer'
                    }}
                  >
                    Open Fleet Operations
                  </button>
                </div>
              </div>

              {/* Sub-Module 2 */}
              <div
                onClick={() => setTab('facilities')}
                className="glass card-shadow"
                style={{
                  padding: '1.5rem',
                  backgroundColor: '#ffffff',
                  borderRadius: '18px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '0.75rem' }}>
                    <div style={{ backgroundColor: '#dcfce7', color: '#16a34a', padding: '12px', borderRadius: '10px' }}>
                      <Zap size={24} />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#1e3a8a' }}>Facilities & Power</h4>
                    </div>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: '#475569', margin: 0 }}>
                    Generator operational checks, battery & fuel monitoring, and daily clinic inspection rounds.
                  </p>
                </div>
                <div style={{ marginTop: '1rem' }}>
                  <button
                    className="btn"
                    style={{
                      backgroundColor: '#16a34a',
                      color: '#ffffff',
                      padding: '8px 14px',
                      borderRadius: '6px',
                      border: 'none',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      width: '100%',
                      cursor: 'pointer'
                    }}
                  >
                    Open Facilities & Power
                  </button>
                </div>
              </div>

              {/* Sub-Module 3 */}
              <div
                onClick={() => setTab('assets')}
                className="glass card-shadow"
                style={{
                  padding: '1.5rem',
                  backgroundColor: '#ffffff',
                  borderRadius: '18px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '0.75rem' }}>
                    <div style={{ backgroundColor: '#e0f2fe', color: '#0284c7', padding: '12px', borderRadius: '10px' }}>
                      <Wrench size={24} />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#1e3a8a' }}>Assets & Lifecycle</h4>
                    </div>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: '#475569', margin: 0 }}>
                    Master asset registry, digital chain-of-custody transfer, PPM planner, and 5-year replacement engine.
                  </p>
                </div>
                <div style={{ marginTop: '1rem' }}>
                  <button
                    className="btn"
                    style={{
                      backgroundColor: '#0284c7',
                      color: '#ffffff',
                      padding: '8px 14px',
                      borderRadius: '6px',
                      border: 'none',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      width: '100%',
                      cursor: 'pointer'
                    }}
                  >
                    Open Assets & Lifecycle
                  </button>
                </div>
              </div>

              {/* Sub-Module 4 */}
              <div
                onClick={() => setTab('inventory')}
                className="glass card-shadow"
                style={{
                  padding: '1.5rem',
                  backgroundColor: '#ffffff',
                  borderRadius: '18px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '0.75rem' }}>
                    <div style={{ backgroundColor: '#dcfce7', color: '#16a34a', padding: '12px', borderRadius: '10px' }}>
                      <Package size={24} />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#1e3a8a' }}>Maintenance Stock</h4>
                    </div>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: '#475569', margin: 0 }}>
                    Facilities spare parts stock, perpetual balance tracking, and technician stock release requisitions.
                  </p>
                </div>
                <div style={{ marginTop: '1rem' }}>
                  <button
                    className="btn"
                    style={{
                      backgroundColor: '#16a34a',
                      color: '#ffffff',
                      padding: '8px 14px',
                      borderRadius: '6px',
                      border: 'none',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      width: '100%',
                      cursor: 'pointer'
                    }}
                  >
                    Open Maintenance Stock
                  </button>
                </div>
              </div>

              {/* Sub-Module 5 */}
              <div
                onClick={() => setTab('admin')}
                className="glass card-shadow"
                style={{
                  padding: '1.5rem',
                  backgroundColor: '#ffffff',
                  borderRadius: '18px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '0.75rem' }}>
                    <div style={{ backgroundColor: '#e0f2fe', color: '#0284c7', padding: '12px', borderRadius: '10px' }}>
                      <DollarSign size={24} />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#1e3a8a' }}>Operations Admin</h4>
                    </div>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: '#475569', margin: 0 }}>
                    Petty cash sheets, NIPT international DHL courier dispatches, stationery quotas, and CFO report.
                  </p>
                </div>
                <div style={{ marginTop: '1rem' }}>
                  <button
                    className="btn"
                    style={{
                      backgroundColor: '#0284c7',
                      color: '#ffffff',
                      padding: '8px 14px',
                      borderRadius: '6px',
                      border: 'none',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      width: '100%',
                      cursor: 'pointer'
                    }}
                  >
                    Open Operations Admin
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── FAST ACTION MODAL: DISPATCH TRIP ── */}
      {activeModal === 'dispatch' && (
        <Modal isOpen={true} title="Dispatch Vehicle Run (Item #3)" onClose={() => setActiveModal(null)}>
          <form onSubmit={handleDispatchSubmit}>

            {/* Trip Type pill selector */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px' }}>Trip Type</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[
                  { value: 'Operational', color: '#0369a1', bg: '#e0f2fe' },
                  { value: 'Emergency',   color: '#dc2626', bg: '#fee2e2' },
                  { value: 'Executive',   color: '#7c3aed', bg: '#ede9fe' },
                ].map(t => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setDispatchForm({ ...dispatchForm, trip_type: t.value })}
                    style={{
                      flex: 1,
                      padding: '9px 0',
                      borderRadius: '8px',
                      border: dispatchForm.trip_type === t.value ? `2px solid ${t.color}` : '2px solid #e2e8f0',
                      backgroundColor: dispatchForm.trip_type === t.value ? t.bg : '#f8fafc',
                      color: dispatchForm.trip_type === t.value ? t.color : '#64748b',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    {t.value}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Select Vehicle</label>
              <select
                className="input"
                style={{ width: '100%' }}
                value={dispatchForm.vehicle_id}
                onChange={(e) => setDispatchForm({ ...dispatchForm, vehicle_id: e.target.value })}
                required
              >
                <option value="">-- Select Available Vehicle --</option>
                {data.vehicles.map(v => (
                  <option key={v.id} value={v.id}>{v.plate_number} - {v.model} ({v.status})</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Duty Driver</label>
                <input
                  type="text"
                  className="input"
                  style={{ width: '100%' }}
                  value={dispatchForm.driver_name}
                  onChange={(e) => setDispatchForm({ ...dispatchForm, driver_name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Referring Physician</label>
                <input
                  type="text"
                  className="input"
                  style={{ width: '100%' }}
                  placeholder="Dr. Eric"
                  value={dispatchForm.referring_physician}
                  onChange={(e) => setDispatchForm({ ...dispatchForm, referring_physician: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Destination Hospital/Location</label>
                <input
                  type="text"
                  className="input"
                  style={{ width: '100%' }}
                  placeholder="CHUK Hospital"
                  value={dispatchForm.destination}
                  onChange={(e) => setDispatchForm({ ...dispatchForm, destination: e.target.value })}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Patient Name / Referral Code</label>
                <input
                  type="text"
                  className="input"
                  style={{ width: '100%' }}
                  placeholder="Patient Transfer"
                  value={dispatchForm.patient_name}
                  onChange={(e) => setDispatchForm({ ...dispatchForm, patient_name: e.target.value })}
                />
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Odometer Start (KM)</label>
              <input
                type="number"
                className="input"
                style={{ width: '100%' }}
                placeholder="e.g. 45200"
                value={dispatchForm.start_km}
                onChange={(e) => setDispatchForm({ ...dispatchForm, start_km: e.target.value })}
                required
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setActiveModal(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary" style={{ backgroundColor: '#0284c7' }} disabled={submitting}>
                {submitting ? 'Dispatching...' : 'Confirm Dispatch'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── FAST ACTION MODAL: GENERATOR CHECK ── */}
      {activeModal === 'gencheck' && (
        <Modal isOpen={true} title="Generator Operation Check Record (Item #2)" onClose={() => setActiveModal(null)}>
          <form onSubmit={handleGenSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Starting Battery Voltage (V)</label>
                <input
                  type="number"
                  step="0.1"
                  className="input"
                  style={{ width: '100%' }}
                  value={genForm.battery_voltage}
                  onChange={(e) => setGenForm({ ...genForm, battery_voltage: e.target.value })}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Output Voltage Stability (V)</label>
                <input
                  type="number"
                  step="1"
                  className="input"
                  style={{ width: '100%' }}
                  value={genForm.output_voltage}
                  onChange={(e) => setGenForm({ ...genForm, output_voltage: e.target.value })}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Fuel Level (%)</label>
                <input
                  type="number"
                  className="input"
                  style={{ width: '100%' }}
                  value={genForm.fuel_level_pct}
                  onChange={(e) => setGenForm({ ...genForm, fuel_level_pct: e.target.value })}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Fuel Remaining (Liters)</label>
                <input
                  type="number"
                  className="input"
                  style={{ width: '100%' }}
                  value={genForm.fuel_liters}
                  onChange={(e) => setGenForm({ ...genForm, fuel_liters: e.target.value })}
                  required
                />
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Inspection Notes / Observations</label>
              <textarea
                className="input"
                style={{ width: '100%', height: '80px' }}
                value={genForm.notes}
                onChange={(e) => setGenForm({ ...genForm, notes: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setActiveModal(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary" style={{ backgroundColor: '#16a34a' }} disabled={submitting}>
                {submitting ? 'Saving...' : 'Save Generator Log'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default LogisticsDashboard;
