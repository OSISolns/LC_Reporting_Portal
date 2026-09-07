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
    auth_by: 'Logistics Desk'
  });

  const [genForm, setGenForm] = useState({
    battery_voltage: '24.5',
    output_voltage: '230',
    fuel_level_pct: '85',
    fuel_liters: '425',
    test_run_mins: '15',
    operator_name: user?.fullName || '',
    notes: 'Morning routine generator inspection completed.'
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
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.25rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              backgroundColor: '#e0f2fe',
              color: '#0369a1',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.05em'
            }}>
              LUMINA LOGISTICS PORTAL
            </span>
            <span style={{ fontSize: '0.85rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Calendar size={14} /> {todayStr}
            </span>
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '6px 0 0 0', color: '#1e3a8a' }}>
            Logistics Command Hub
          </h1>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={fetchDashboardData}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={16} /> Refresh Feed
          </button>
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

          {/* ── OPERATIONAL KPI CARDS (LEGACY CLINICS BLUE & GREEN) ── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem'
          }}>
            {/* Fleet Status */}
            <div className="glass card-shadow" style={{ padding: '1.25rem', backgroundColor: '#ffffff', borderRadius: '12px', borderLeft: '4px solid #0284c7' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', margin: '0 0 4px 0' }}>FLEET STATUS</p>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: '#1e3a8a' }}>
                    {data.kpis.fleet.available} / {data.kpis.fleet.total} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#64748b' }}>Available</span>
                  </h3>
                </div>
                <div style={{ backgroundColor: '#e0f2fe', color: '#0284c7', padding: '10px', borderRadius: '10px' }}>
                  <Truck size={20} />
                </div>
              </div>
              <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#64748b' }}>
                <span>{data.kpis.fleet.inUse} In Assignment</span> | <span>{data.kpis.fleet.maintenance} Maintenance</span>
              </div>
            </div>

            {/* Primary Power */}
            <div className="glass card-shadow" style={{ padding: '1.25rem', backgroundColor: '#ffffff', borderRadius: '12px', borderLeft: '4px solid #16a34a' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', margin: '0 0 4px 0' }}>PRIMARY POWER</p>
                  <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0, color: '#15803d' }}>
                    {data.kpis.power.gridStatus}
                  </h3>
                </div>
                <div style={{ backgroundColor: '#dcfce7', color: '#16a34a', padding: '10px', borderRadius: '10px' }}>
                  <Zap size={20} />
                </div>
              </div>
              <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#64748b' }}>
                <span>Gen: {data.kpis.power.genStatus}</span>
              </div>
            </div>

            {/* Pending PPM */}
            <div className="glass card-shadow" style={{ padding: '1.25rem', backgroundColor: '#ffffff', borderRadius: '12px', borderLeft: '4px solid #0284c7' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', margin: '0 0 4px 0' }}>PENDING PPM</p>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: '#1e3a8a' }}>
                    {data.kpis.ppm.pending} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#64748b' }}>Scheduled</span>
                  </h3>
                </div>
                <div style={{ backgroundColor: '#e0f2fe', color: '#0284c7', padding: '10px', borderRadius: '10px' }}>
                  <Calendar size={20} />
                </div>
              </div>
              <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#64748b' }}>
                <span>Biomedical & Plant Orders</span>
              </div>
            </div>

            {/* Open Incidents */}
            <div className="glass card-shadow" style={{ padding: '1.25rem', backgroundColor: '#ffffff', borderRadius: '12px', borderLeft: '4px solid #16a34a' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', margin: '0 0 4px 0' }}>OPEN INCIDENTS</p>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: '#1e3a8a' }}>
                    {data.kpis.incidents.openCount} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#64748b' }}>Active</span>
                  </h3>
                </div>
                <div style={{ backgroundColor: '#dcfce7', color: '#16a34a', padding: '10px', borderRadius: '10px' }}>
                  <ShieldAlert size={20} />
                </div>
              </div>
              <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#64748b' }}>
                <span>{data.kpis.incidents.criticalCount} High / Critical</span>
              </div>
            </div>

            {/* IT Tickets */}
            <div className="glass card-shadow" style={{ padding: '1.25rem', backgroundColor: '#ffffff', borderRadius: '12px', borderLeft: '4px solid #0284c7' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', margin: '0 0 4px 0' }}>IT TICKETS</p>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: '#1e3a8a' }}>
                    {data.kpis.it.inProgress} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#64748b' }}>Open</span>
                  </h3>
                </div>
                <div style={{ backgroundColor: '#e0f2fe', color: '#0284c7', padding: '10px', borderRadius: '10px' }}>
                  <Wrench size={20} />
                </div>
              </div>
              <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#64748b' }}>
                <span>{data.kpis.it.overdue} Overdue SLAs</span>
              </div>
            </div>
          </div>

          {/* ── FLEET TRACKER & DISPATCH BOARD + FACILITIES FEED ── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
            gap: '1.5rem',
            marginBottom: '2rem'
          }}>
            {/* Fleet Tracker */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              padding: '1.25rem',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e3a8a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Truck size={18} style={{ color: '#0284c7' }} /> Fleet Tracker & Dispatch Board
                </h3>
                <button
                  onClick={() => setTab('fleet')}
                  className="btn"
                  style={{
                    backgroundColor: '#0284c7',
                    color: '#ffffff',
                    fontSize: '0.8rem',
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: 'none',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  View All Vehicles
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {data.vehicles && data.vehicles.length > 0 ? (
                  data.vehicles.map((v) => (
                    <div
                      key={v.id}
                      style={{
                        padding: '12px',
                        borderRadius: '8px',
                        backgroundColor: '#f8fafc',
                        border: '1px solid #f1f5f9',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 700, color: '#1e3a8a', fontSize: '0.95rem' }}>{v.plate_number}</span>
                          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>({v.model})</span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                          Type: {v.vehicle_type} | Odometer: {v.current_odometer?.toLocaleString()} km
                        </div>
                      </div>

                      <div>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          backgroundColor: v.status === 'Available' ? '#dcfce7' : '#e0f2fe',
                          color: v.status === 'Available' ? '#15803d' : '#0369a1'
                        }}>
                          {v.status}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ textAlign: 'center', padding: '1rem', color: '#94a3b8' }}>No vehicles registered</div>
                )}
              </div>
            </div>

            {/* Facilities & Maintenance Feed */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              padding: '1.25rem',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e3a8a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Zap size={18} style={{ color: '#16a34a' }} /> Facilities & Maintenance Feed
                </h3>
                <button
                  onClick={() => setTab('facilities')}
                  className="btn"
                  style={{
                    backgroundColor: '#16a34a',
                    color: '#ffffff',
                    fontSize: '0.8rem',
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: 'none',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Facilities Log
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* Daily Tour Item */}
                <div style={{ padding: '10px 12px', borderRadius: '8px', backgroundColor: '#f8fafc', borderLeft: '4px solid #16a34a' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Activity size={14} style={{ color: '#16a34a' }} /> Daily Morning Clinic Inspection
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                    {data.latestTour ? (
                      <span>Status: Completed ({data.latestTour.tour_date}) by {data.latestTour.conducted_by}</span>
                    ) : (
                      <span>Status: Pending Today's Inspection Round</span>
                    )}
                  </div>
                </div>

                {/* Generator Item */}
                <div style={{ padding: '10px 12px', borderRadius: '8px', backgroundColor: '#f8fafc', borderLeft: '4px solid #0284c7' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Zap size={14} style={{ color: '#0284c7' }} /> Generator 01 Operational Check
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                    {data.latestGen ? (
                      <span>Tested ({data.latestGen.check_date}) — Voltage: {data.latestGen.output_voltage}V | Fuel: {data.latestGen.fuel_level_pct}% ({data.latestGen.fuel_liters}L)</span>
                    ) : (
                      <span>No generator log recorded today</span>
                    )}
                  </div>
                </div>

                {/* Low Stock Items */}
                {data.lowStock && data.lowStock.length > 0 && (
                  <div style={{ padding: '10px 12px', borderRadius: '8px', backgroundColor: '#e0f2fe', borderLeft: '4px solid #0284c7' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Package size={14} style={{ color: '#0284c7' }} /> Spare Parts Reorder Warning
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#0369a1', marginTop: '2px' }}>
                      {data.lowStock.map(s => `${s.item_name} (Qty: ${s.quantity_on_hand})`).join(', ')}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

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
                  padding: '1.25rem',
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justify: 'space-between'
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
                  padding: '1.25rem',
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justify: 'space-between'
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
                  padding: '1.25rem',
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justify: 'space-between'
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
                  padding: '1.25rem',
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justify: 'space-between'
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
                  padding: '1.25rem',
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justify: 'space-between'
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
        <Modal title="Dispatch Vehicle Run (Item #3)" onClose={() => setActiveModal(null)}>
          <form onSubmit={handleDispatchSubmit}>
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
        <Modal title="Generator Operation Check Record (Item #2)" onClose={() => setActiveModal(null)}>
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
