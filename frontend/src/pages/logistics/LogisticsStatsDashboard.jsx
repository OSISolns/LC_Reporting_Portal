import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import {
  BarChart3, TrendingUp, ShieldCheck, Activity, Truck, Zap, Wrench,
  Package, DollarSign, Calendar, RefreshCw, AlertTriangle, CheckCircle2,
  Clock, ArrowRight, ShieldAlert, FileText, ChevronRight
} from 'lucide-react';

const LogisticsStatsDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
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
    openItTickets: [],
    pettyCash: [],
    assets: []
  });

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/logistics/dashboard-stats', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        toast.error(json.message || 'Failed to load logistics statistics');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error loading logistics statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });

  // Calculate statistics metrics
  const fleetAvailabilityRate = data.kpis.fleet.total > 0
    ? Math.round((data.kpis.fleet.available / data.kpis.fleet.total) * 100)
    : 100;

  const totalLowStockCount = data.lowStock ? data.lowStock.length : 0;

  return (
    <div style={{ paddingBottom: '3rem' }}>
      {/* ── STATISTICAL DASHBOARD HEADER ── */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
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
              EXECUTIVE ANALYTICS & STATISTICS
            </span>
            <span style={{ fontSize: '0.85rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Calendar size={14} /> {todayStr}
            </span>
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '6px 0 0 0', color: '#1e3a8a' }}>
            Logistics Statistics Dashboard
          </h1>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={fetchStats}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={16} /> Refresh Metrics
          </button>
          <button
            onClick={() => navigate('/logistics')}
            className="btn btn-primary"
            style={{ backgroundColor: '#0284c7', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            Go to Logistics Hub <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {/* ── TOP KPI SUMMARY CARDS (LEGACY CLINICS BLUE & GREEN) ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1.25rem',
        marginBottom: '1.5rem'
      }}>
        {/* Fleet Readiness Rate */}
        <div className="glass card-shadow" style={{ padding: '1.25rem', backgroundColor: '#ffffff', borderRadius: '12px', borderLeft: '4px solid #0284c7' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', margin: '0 0 4px 0' }}>FLEET READINESS</p>
              <h3 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, color: '#1e3a8a' }}>
                {fleetAvailabilityRate}%
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '4px 0 0 0' }}>
                {data.kpis.fleet.available} of {data.kpis.fleet.total} Vehicles Available
              </p>
            </div>
            <div style={{ backgroundColor: '#e0f2fe', color: '#0284c7', padding: '10px', borderRadius: '10px' }}>
              <Truck size={20} />
            </div>
          </div>
          <div style={{ marginTop: '0.75rem', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ width: `${fleetAvailabilityRate}%`, height: '100%', backgroundColor: '#0284c7', borderRadius: '3px' }} />
          </div>
        </div>

        {/* Primary Power Readiness */}
        <div className="glass card-shadow" style={{ padding: '1.25rem', backgroundColor: '#ffffff', borderRadius: '12px', borderLeft: '4px solid #16a34a' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', margin: '0 0 4px 0' }}>GENERATOR RESERVE</p>
              <h3 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, color: '#15803d' }}>
                {data.kpis.power.fuelLevelPct}%
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '4px 0 0 0' }}>
                {data.latestGen ? `${data.latestGen.fuel_liters} Liters Tank Reserve` : 'Standby Active'}
              </p>
            </div>
            <div style={{ backgroundColor: '#dcfce7', color: '#16a34a', padding: '10px', borderRadius: '10px' }}>
              <Zap size={20} />
            </div>
          </div>
          <div style={{ marginTop: '0.75rem', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ width: `${data.kpis.power.fuelLevelPct}%`, height: '100%', backgroundColor: '#16a34a', borderRadius: '3px' }} />
          </div>
        </div>

        {/* Biomedical PPM Maintenance */}
        <div className="glass card-shadow" style={{ padding: '1.25rem', backgroundColor: '#ffffff', borderRadius: '12px', borderLeft: '4px solid #0284c7' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', margin: '0 0 4px 0' }}>PENDING PPM ORDERS</p>
              <h3 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, color: '#1e3a8a' }}>
                {data.kpis.ppm.pending}
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '4px 0 0 0' }}>
                Preventive Maintenance Tasks
              </p>
            </div>
            <div style={{ backgroundColor: '#e0f2fe', color: '#0284c7', padding: '10px', borderRadius: '10px' }}>
              <Wrench size={20} />
            </div>
          </div>
          <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#0284c7', fontWeight: 600 }}>
            Biomedical & Facilities Schedule
          </div>
        </div>

        {/* Inventory Low Stock Count */}
        <div className="glass card-shadow" style={{ padding: '1.25rem', backgroundColor: '#ffffff', borderRadius: '12px', borderLeft: '4px solid #0284c7' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', margin: '0 0 4px 0' }}>LOW STOCK ALERTS</p>
              <h3 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, color: totalLowStockCount > 0 ? '#0369a1' : '#15803d' }}>
                {totalLowStockCount}
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '4px 0 0 0' }}>
                Reorder Threshold Items
              </p>
            </div>
            <div style={{ backgroundColor: '#e0f2fe', color: '#0284c7', padding: '10px', borderRadius: '10px' }}>
              <Package size={20} />
            </div>
          </div>
          <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#0369a1', fontWeight: 600 }}>
            Perpetual Maintenance Inventory
          </div>
        </div>
      </div>

      {/* ── STATISTICAL DETAILED BREAKDOWN PANELS ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '1.5rem',
        marginBottom: '1.5rem'
      }}>
        {/* Fleet Operational Statistics */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '1.25rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e3a8a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart3 size={18} style={{ color: '#0284c7' }} /> Fleet Operational Statistics
            </h3>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0284c7', backgroundColor: '#e0f2fe', padding: '2px 8px', borderRadius: '12px' }}>
              {data.vehicles.length} Total Vehicles Registered
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {data.vehicles && data.vehicles.length > 0 ? (
              data.vehicles.map((v) => (
                <div key={v.id} style={{ padding: '10px 12px', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 700, color: '#1e3a8a', fontSize: '0.9rem' }}>{v.plate_number} ({v.model})</span>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '10px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      backgroundColor: v.status === 'Available' ? '#dcfce7' : '#e0f2fe',
                      color: v.status === 'Available' ? '#15803d' : '#0369a1'
                    }}>
                      {v.status}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748b' }}>
                    <span>Odometer: {v.current_odometer?.toLocaleString()} KM</span>
                    <span>Control Exp: {v.control_exp || 'N/A'}</span>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: '1rem', color: '#94a3b8', textAlign: 'center' }}>No fleet statistics recorded</div>
            )}
          </div>
        </div>

        {/* Facilities Power & Environment Metrics */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '1.25rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e3a8a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={18} style={{ color: '#16a34a' }} /> Facilities & Plant Health Metrics
            </h3>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#16a34a', backgroundColor: '#dcfce7', padding: '2px 8px', borderRadius: '12px' }}>
              Operational
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {data.latestGen && (
              <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#f0fdf4', borderLeft: '4px solid #16a34a' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#15803d', marginBottom: '4px' }}>
                  Generator 01 Operations Metric
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', fontSize: '0.8rem', color: '#166534' }}>
                  <div>Battery: <strong>{data.latestGen.battery_voltage}V</strong></div>
                  <div>Output: <strong>{data.latestGen.output_voltage}V</strong></div>
                  <div>Fuel: <strong>{data.latestGen.fuel_level_pct}%</strong></div>
                </div>
              </div>
            )}

            {data.latestTour && (
              <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#f0f9ff', borderLeft: '4px solid #0284c7' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0369a1', marginBottom: '4px' }}>
                  Morning Inspection Tour Compliance
                </div>
                <div style={{ fontSize: '0.8rem', color: '#075985' }}>
                  Latest Round Completed on {data.latestTour.tour_date} by {data.latestTour.conducted_by}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── SAFETY, INCIDENTS & IT TICKETING METRICS ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '1.25rem'
      }}>
        {/* Safety & Incident Statistics */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '1.25rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem' }}>
            <ShieldAlert size={18} style={{ color: '#0284c7' }} />
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: '#1e3a8a' }}>
              Safety & Incident Statistics
            </h3>
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1e3a8a' }}>
            {data.kpis.incidents.openCount} Active Incident Reports
          </div>
          <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '4px 0 0 0' }}>
            {data.kpis.incidents.criticalCount} High / Critical Priority
          </p>
        </div>

        {/* IT Ticketing Statistics */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '1.25rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem' }}>
            <Activity size={18} style={{ color: '#2563eb' }} />
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: '#1e3a8a' }}>
              IT Support SLA Performance
            </h3>
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1e3a8a' }}>
            {data.kpis.it.inProgress} Open Support Tickets
          </div>
          <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '4px 0 0 0' }}>
            {data.kpis.it.overdue} Overdue SLA Tickets
          </p>
        </div>
      </div>
    </div>
  );
};

export default LogisticsStatsDashboard;
