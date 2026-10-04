import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import {
  Truck, Zap, ShieldAlert, Wrench, Package, DollarSign,
  AlertTriangle, CheckCircle2, Clock, Plus, Activity, FileText,
  ChevronRight, Calendar, RefreshCw, LayoutDashboard, ShieldCheck, Tag,
  Fuel, Gauge, AlertCircle, ArrowUpRight, Radio, Server, Layers, Shield
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
      power: { gridStatus: 'Grid Active', genStatus: 'Standby', fuelLevelPct: 100, fuelLiters: 0 },
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

  // Form states (Clean initial state without hardcoded mock data)
  const [dispatchForm, setDispatchForm] = useState({
    vehicle_id: '',
    driver_name: user?.full_name || user?.fullName || '',
    referring_physician: '',
    destination: '',
    patient_name: '',
    start_km: '',
    auth_by: '',
    trip_type: 'Operational',
  });

  const [genForm, setGenForm] = useState({
    battery_voltage: '',
    output_voltage: '',
    fuel_level_pct: '',
    fuel_liters: '',
    test_run_mins: '',
    operator_name: user?.full_name || user?.fullName || '',
    notes: ''
  });

  const [vehicleForm, setVehicleForm] = useState({
    plate_number: '',
    model: '',
    vehicle_type: 'Ambulance',
    insurance_exp: '',
    control_exp: '',
    rema_exp: '',
    current_odometer: '',
    status: 'Available',
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

  const handleVehicleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await fetch('/api/logistics/fleet/vehicles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(vehicleForm)
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Vehicle registered successfully!');
        setActiveModal(null);
        setVehicleForm({
          plate_number: '',
          model: '',
          vehicle_type: 'Ambulance',
          insurance_exp: '',
          control_exp: '',
          rema_exp: '',
          current_odometer: '',
          status: 'Available',
          notes: ''
        });
        fetchDashboardData();
      } else {
        toast.error(json.message || 'Failed to register vehicle');
      }
    } catch (err) {
      toast.error('Error registering vehicle');
    } finally {
      setSubmitting(false);
    }
  };

  const setTab = (tabName) => {
    setSearchParams(tabName === 'overview' ? {} : { tab: tabName });
  };

  const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });

  const kpis = data.kpis || {};
  const fleetKpi = kpis.fleet || { total: 0, available: 0, inUse: 0, maintenance: 0 };
  const powerKpi = kpis.power || { gridStatus: 'Grid Active', genStatus: 'Standby', fuelLevelPct: 100, fuelLiters: 0 };
  const ppmKpi = kpis.ppm || { pending: 0 };
  const incidentsKpi = kpis.incidents || { openCount: 0, criticalCount: 0 };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 min-h-screen bg-slate-50/50">

      {/* ── LOGISTICS COMMAND HUB HEADER (Corporate Grade) ── */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold shrink-0">
            <Truck size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">Logistics Command Hub</h1>
              <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                System Active
              </span>
            </div>
            <p className="text-slate-500 text-xs mt-0.5 font-normal">
              Fleet operations, facilities telemetry, asset life cycle, and maintenance inventory control
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveModal('vehicle')}
            className="h-8 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Plus size={14} /> Register Vehicle
          </button>

          <button
            onClick={() => setActiveModal('dispatch')}
            className="h-8 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Truck size={14} /> Dispatch Vehicle
          </button>

          <button
            onClick={() => setActiveModal('gencheck')}
            className="h-8 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-200"
          >
            <Zap size={14} /> Log Generator Check
          </button>

          <button
            onClick={() => navigate('/incidents')}
            className="h-8 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-200"
          >
            <AlertTriangle size={14} /> Incident Reports
          </button>

          <button
            onClick={fetchDashboardData}
            className="h-8 w-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors border border-slate-200"
            title="Refresh Feed"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── COMMAND KPI CARDS GRID (Clean Corporate) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* KPI 1: Fleet Status */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Fleet Operations</span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setActiveModal('vehicle')}
                title="Register New Vehicle"
                className="h-6 px-2 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1 font-semibold text-[11px] transition-colors"
              >
                <Plus size={12} /> Add
              </button>
              <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                <Truck size={15} />
              </div>
            </div>
          </div>
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-2xl font-bold text-slate-900">{fleetKpi.total || data.vehicles.length || 0}</span>
            <span className="text-xs font-medium text-slate-500">Vehicles Registered</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium pt-2 border-t border-slate-100">
            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
              {fleetKpi.available} Available
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
              {fleetKpi.inUse} In-Use
            </span>
            {fleetKpi.maintenance > 0 && (
              <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                {fleetKpi.maintenance} Service
              </span>
            )}
          </div>
        </div>

        {/* KPI 2: Facilities & Power */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Power & Facilities</span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
              <Zap size={15} />
            </div>
          </div>
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-base font-bold text-slate-900">{powerKpi.gridStatus || 'Grid Active'}</span>
            <span className="text-xs font-semibold text-slate-700">{powerKpi.fuelLevelPct}% Fuel</span>
          </div>
          <div className="w-full bg-slate-100 rounded h-1.5 mb-2 overflow-hidden">
            <div
              className={`h-1.5 rounded transition-all ${
                powerKpi.fuelLevelPct < 35 ? 'bg-rose-600' : powerKpi.fuelLevelPct < 60 ? 'bg-amber-500' : 'bg-emerald-600'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, powerKpi.fuelLevelPct))}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 flex items-center justify-between">
            <span>Generator: <strong className="text-slate-800 font-semibold">{powerKpi.genStatus || 'Standby'}</strong></span>
            <span>{powerKpi.fuelLiters ? `${powerKpi.fuelLiters}L` : 'Verified'}</span>
          </p>
        </div>

        {/* KPI 3: Preventive Maintenance */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Asset Lifecycle</span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
              <Wrench size={15} />
            </div>
          </div>
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-2xl font-bold text-slate-900">{ppmKpi.pending || 0}</span>
            <span className="text-xs font-medium text-slate-500">Pending PPM</span>
          </div>
          <p className="text-xs text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100">
            <span>Low Stock Parts:</span>
            <strong className="text-slate-900 font-semibold">{data.lowStock?.length || 0} items</strong>
          </p>
        </div>

        {/* KPI 4: Incidents & IT Tickets */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Facility Operations</span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
              <ShieldAlert size={15} />
            </div>
          </div>
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-2xl font-bold text-slate-900">{incidentsKpi.openCount || data.openIncidents?.length || 0}</span>
            <span className="text-xs font-medium text-slate-500">Open Incidents</span>
          </div>
          <p className="text-xs text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100">
            <span>Open IT Tickets:</span>
            <strong className="text-slate-900 font-semibold">{data.openItTickets?.length || 0}</strong>
          </p>
        </div>
      </div>

      {/* ── SAFETY WARNINGS & EXPIRIES (Corporate Minimal) ── */}
      {Array.isArray(data.alertRibbon) && data.alertRibbon.length > 0 && (
        <div className="bg-slate-100 border border-slate-300 px-4 py-2.5 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-slate-800 overflow-hidden">
            <AlertTriangle size={14} className="text-amber-600 shrink-0" />
            <span className="font-semibold text-slate-900 shrink-0">System Alerts:</span>
            <span className="text-slate-700 font-normal truncate">
              {data.alertRibbon.map(item => item.message).join(' · ')}
            </span>
          </div>
          <button
            onClick={() => setTab('fleet')}
            className="text-slate-900 hover:text-slate-700 font-semibold underline text-[11px] shrink-0"
          >
            View Details
          </button>
        </div>
      )}

      {/* ── CORPORATE SUB-MODULE TAB NAVIGATION ── */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 overflow-x-auto pb-2 scrollbar-none">
        {[
          { id: 'overview', label: 'Overview', icon: LayoutDashboard },
          { id: 'fleet', label: 'Fleet Operations', icon: Truck, count: fleetKpi.inUse > 0 ? `${fleetKpi.inUse} Active` : null },
          { id: 'facilities', label: 'Facilities & Power', icon: Zap },
          { id: 'assets', label: 'Assets & Lifecycle', icon: Wrench, count: ppmKpi.pending > 0 ? `${ppmKpi.pending} PPM` : null },
          { id: 'inventory', label: 'Maintenance Stock', icon: Package, count: data.lowStock?.length > 0 ? `${data.lowStock.length} Low` : null },
          { id: 'admin', label: 'Operations Admin', icon: DollarSign },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-semibold text-xs whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Icon size={14} />
              {tab.label}
              {tab.count && (
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── TAB CONDITIONAL CONTENT ── */}
      {activeTab === 'fleet' && <FleetOperations />}
      {activeTab === 'facilities' && <FacilitiesPower />}
      {activeTab === 'assets' && <AssetManagement />}
      {activeTab === 'inventory' && <MaintenanceStock />}
      {activeTab === 'admin' && <LogisticsAdmin />}

      {/* ── OVERVIEW TAB DASHBOARD CONTENT ── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">

          {/* Live Monitoring 2-Column Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Active Trips & Fleet Runbook */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
                    <Truck size={18} />
                  </div>
                  <h3 className="text-base font-black text-slate-900">Active Fleet Trips & Dispatches</h3>
                </div>
                <button
                  onClick={() => setTab('fleet')}
                  className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1"
                >
                  Manage Fleet <ArrowUpRight size={14} />
                </button>
              </div>

              {Array.isArray(data.activeTrips) && data.activeTrips.length > 0 ? (
                <div className="space-y-3">
                  {data.activeTrips.map(t => (
                    <div key={t.id} className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-100 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-900 text-xs sm:text-sm">{t.plate_number || 'VEHICLE'}</span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-sky-100 text-sky-800">
                            {t.trip_type || 'Operational'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Driver: <strong className="text-slate-800">{t.driver_name}</strong> | Dest: <strong className="text-slate-800">{t.destination}</strong>
                        </p>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">
                        {t.start_km ? `${t.start_km} KM` : 'En Route'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-xs text-slate-400 italic">
                  No active vehicle trips currently en route.
                </div>
              )}
            </div>

            {/* Power & Facilities Telemetry */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    <Zap size={18} />
                  </div>
                  <h3 className="text-base font-black text-slate-900">Latest Facilities & Power Check</h3>
                </div>
                <button
                  onClick={() => setTab('facilities')}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                >
                  Facilities Hub <ArrowUpRight size={14} />
                </button>
              </div>

              {data.latestGen ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
                    <div>
                      <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest block">Fuel Level</span>
                      <span className="text-lg font-black text-emerald-900">{data.latestGen.fuel_level_pct}%</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest block">Fuel Rem.</span>
                      <span className="text-lg font-black text-emerald-900">{data.latestGen.fuel_liters} L</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest block">Battery</span>
                      <span className="text-lg font-black text-emerald-900">{data.latestGen.battery_voltage} V</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest block">Output</span>
                      <span className="text-lg font-black text-emerald-900">{data.latestGen.output_voltage} V</span>
                    </div>
                  </div>

                  {data.latestGen.notes && (
                    <p className="text-xs text-slate-600 italic bg-slate-50 p-3 rounded-xl border border-slate-100">
                      "{data.latestGen.notes}"
                    </p>
                  )}
                  <p className="text-[11px] text-slate-400">
                    Inspected by <strong className="text-slate-700">{data.latestGen.operator_name || 'Technician'}</strong>
                  </p>
                </div>
              ) : (
                <div className="text-center py-8 text-xs text-slate-400 italic">
                  No generator checks logged for today yet.
                </div>
              )}
            </div>

          </div>

          {/* Departmental Logistics Modules */}
          <div>
            <h2 className="text-base font-bold text-slate-900 mb-3">
              Departmental Logistics Modules
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                {
                  id: 'fleet',
                  title: 'Fleet Operations',
                  desc: 'Pre-trip checks, movement authorization, trip logbook, and regulatory compliance expiries.',
                  icon: Truck,
                },
                {
                  id: 'facilities',
                  title: 'Facilities & Power',
                  desc: 'Generator operational checks, battery & fuel monitoring, and daily clinic inspection rounds.',
                  icon: Zap,
                },
                {
                  id: 'assets',
                  title: 'Assets & Lifecycle',
                  desc: 'Master asset registry, digital chain-of-custody transfer, PPM planner, and replacement engine.',
                  icon: Wrench,
                },
                {
                  id: 'inventory',
                  title: 'Maintenance Stock',
                  desc: 'Facilities spare parts stock, balance tracking, and technician stock release requisitions.',
                  icon: Package,
                },
                {
                  id: 'admin',
                  title: 'Operations Admin',
                  desc: 'Petty cash sheets, NIPT international DHL courier dispatches, stationery quotas, and reports.',
                  icon: DollarSign,
                },
              ].map(mod => {
                const Icon = mod.icon;
                return (
                  <div
                    key={mod.id}
                    onClick={() => setTab(mod.id)}
                    className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-[#007B8A] transition-colors cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-3 mb-2.5">
                        <div className="w-9 h-9 rounded-xl bg-[#E6F4F6] text-[#007B8A] flex items-center justify-center font-bold shrink-0">
                          <Icon size={18} />
                        </div>
                        <h4 className="text-sm font-bold text-slate-800">{mod.title}</h4>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed font-normal">
                        {mod.desc}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-[#007B8A]">
                      <span>Open Module</span>
                      <ChevronRight size={15} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* ── FAST ACTION MODAL: DISPATCH TRIP ── */}
      {activeModal === 'dispatch' && (
        <Modal isOpen={true} title="Dispatch Vehicle Run" onClose={() => setActiveModal(null)}>
          <form onSubmit={handleDispatchSubmit} className="space-y-4 py-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Trip Classification</label>
              <div className="flex gap-2">
                {[
                  { value: 'Operational', color: 'sky' },
                  { value: 'Emergency', color: 'rose' },
                  { value: 'Executive', color: 'purple' },
                ].map(t => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setDispatchForm({ ...dispatchForm, trip_type: t.value })}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                      dispatchForm.trip_type === t.value
                        ? 'bg-[#007B8A] text-white border-[#007B8A]'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {t.value}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 uppercase">Select Vehicle *</label>
                <button
                  type="button"
                  onClick={() => setActiveModal('vehicle')}
                  className="text-[11px] font-bold text-sky-600 hover:text-sky-800 flex items-center gap-1 transition-colors"
                >
                  <Plus size={12} /> + Register New Vehicle
                </button>
              </div>
              <select
                className="shift-input w-full text-xs font-semibold"
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Duty Driver *</label>
                <input
                  type="text"
                  className="shift-input w-full text-xs font-semibold"
                  value={dispatchForm.driver_name}
                  onChange={(e) => setDispatchForm({ ...dispatchForm, driver_name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Referring Physician</label>
                <input
                  type="text"
                  className="shift-input w-full text-xs font-semibold"
                  placeholder="Dr. Eric"
                  value={dispatchForm.referring_physician}
                  onChange={(e) => setDispatchForm({ ...dispatchForm, referring_physician: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Destination *</label>
                <input
                  type="text"
                  className="shift-input w-full text-xs font-semibold"
                  placeholder="CHUK Hospital"
                  value={dispatchForm.destination}
                  onChange={(e) => setDispatchForm({ ...dispatchForm, destination: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Patient Name / Ref Code</label>
                <input
                  type="text"
                  className="shift-input w-full text-xs font-semibold"
                  placeholder="Patient Transfer"
                  value={dispatchForm.patient_name}
                  onChange={(e) => setDispatchForm({ ...dispatchForm, patient_name: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Odometer Start (KM) *</label>
              <input
                type="number"
                className="shift-input w-full text-xs font-semibold"
                placeholder="e.g. 45200"
                value={dispatchForm.start_km}
                onChange={(e) => setDispatchForm({ ...dispatchForm, start_km: e.target.value })}
                required
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button type="button" className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold" onClick={() => setActiveModal(null)}>Cancel</button>
              <button type="submit" className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold" disabled={submitting}>
                {submitting ? 'Dispatching...' : 'Confirm Dispatch'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── FAST ACTION MODAL: GENERATOR CHECK ── */}
      {activeModal === 'gencheck' && (
        <Modal isOpen={true} title="Generator Operation Check Record" onClose={() => setActiveModal(null)}>
          <form onSubmit={handleGenSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Battery Voltage (V) *</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="e.g. 13.8"
                  className="shift-input w-full text-xs font-semibold"
                  value={genForm.battery_voltage}
                  onChange={(e) => setGenForm({ ...genForm, battery_voltage: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Output Voltage (V) *</label>
                <input
                  type="number"
                  step="1"
                  placeholder="e.g. 230"
                  className="shift-input w-full text-xs font-semibold"
                  value={genForm.output_voltage}
                  onChange={(e) => setGenForm({ ...genForm, output_voltage: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Fuel Level (%) *</label>
                <input
                  type="number"
                  placeholder="e.g. 85"
                  className="shift-input w-full text-xs font-semibold"
                  value={genForm.fuel_level_pct}
                  onChange={(e) => setGenForm({ ...genForm, fuel_level_pct: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Fuel Remaining (Liters) *</label>
                <input
                  type="number"
                  placeholder="e.g. 350"
                  className="shift-input w-full text-xs font-semibold"
                  value={genForm.fuel_liters}
                  onChange={(e) => setGenForm({ ...genForm, fuel_liters: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Inspection Notes / Remarks</label>
              <textarea
                className="shift-input w-full text-xs border-slate-200 resize-none"
                rows={3}
                value={genForm.notes}
                onChange={(e) => setGenForm({ ...genForm, notes: e.target.value })}
                placeholder="Log battery state, test run observations, or fuel order recommendations..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button type="button" className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold" onClick={() => setActiveModal(null)}>Cancel</button>
              <button type="submit" className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold" disabled={submitting}>
                {submitting ? 'Saving...' : 'Save Generator Log'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── FAST ACTION MODAL: REGISTER VEHICLE ── */}
      {activeModal === 'vehicle' && (
        <Modal isOpen={true} title="Register New Vehicle" onClose={() => setActiveModal(null)}>
          <form onSubmit={handleVehicleSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Plate Number *</label>
                <input
                  type="text"
                  className="shift-input w-full text-xs font-semibold"
                  placeholder="e.g. RAD-123A"
                  value={vehicleForm.plate_number}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, plate_number: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Model & Make *</label>
                <input
                  type="text"
                  className="shift-input w-full text-xs font-semibold"
                  placeholder="e.g. Toyota HiAce Ambulance"
                  value={vehicleForm.model}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, model: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Vehicle Classification</label>
                <select
                  className="shift-input w-full text-xs font-semibold"
                  value={vehicleForm.vehicle_type}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, vehicle_type: e.target.value })}
                >
                  <option value="Ambulance">Ambulance</option>
                  <option value="Utility">Utility Service</option>
                  <option value="Operational">Operational Staff</option>
                  <option value="Executive">Executive</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Initial Odometer (KM)</label>
                <input
                  type="number"
                  className="shift-input w-full text-xs font-semibold"
                  placeholder="e.g. 45000"
                  value={vehicleForm.current_odometer}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, current_odometer: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Insurance Exp</label>
                <input
                  type="date"
                  className="shift-input w-full text-xs font-semibold"
                  value={vehicleForm.insurance_exp}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, insurance_exp: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Control Exp</label>
                <input
                  type="date"
                  className="shift-input w-full text-xs font-semibold"
                  value={vehicleForm.control_exp}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, control_exp: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">REMA Pass Exp</label>
                <input
                  type="date"
                  className="shift-input w-full text-xs font-semibold"
                  value={vehicleForm.rema_exp}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, rema_exp: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button type="button" className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold" onClick={() => setActiveModal(null)}>Cancel</button>
              <button type="submit" className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold" disabled={submitting}>
                {submitting ? 'Registering...' : 'Register Vehicle'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default LogisticsDashboard;
