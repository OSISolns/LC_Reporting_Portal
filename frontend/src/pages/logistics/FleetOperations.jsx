import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { Truck, CheckSquare, Calendar, Plus, ShieldCheck, Clock, FileText, AlertTriangle, Search, CheckCircle2, XCircle, User, UserCheck, Pencil, Trash2 } from 'lucide-react';
import Modal from '../../components/Modal';

const FleetOperations = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('compliance'); // 'compliance', 'trips', 'checklists', 'drivers'
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState([]);
  const [trips, setTrips] = useState([]);
  const [checklists, setChecklists] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [isChecklistModal, setIsChecklistModal] = useState(false);
  const [isTripModal, setIsTripModal] = useState(false);
  const [isVehicleModal, setIsVehicleModal] = useState(false);
  const [isEndTripModal, setIsEndTripModal] = useState(false);
  const [isDriverModal, setIsDriverModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const TRIP_TYPES = [
    { value: 'Operational', label: 'Operational', color: '#0369a1', bg: '#e0f2fe' },
    { value: 'Emergency',   label: 'Emergency',   color: '#dc2626', bg: '#fee2e2' },
    { value: 'Executive',   label: 'Executive',   color: '#7c3aed', bg: '#ede9fe' },
  ];

  const getTripTypeBadge = (type) => {
    const t = TRIP_TYPES.find(x => x.value === type) || TRIP_TYPES[0];
    return (
      <span style={{
        padding: '3px 9px', borderRadius: '6px', fontSize: '0.72rem',
        fontWeight: 700, backgroundColor: t.bg, color: t.color,
        whiteSpace: 'nowrap'
      }}>
        {t.label}
      </span>
    );
  };

  // Form states
  const [tripForm, setTripForm] = useState({
    vehicle_id: '',
    driver_name: '',
    referring_physician: '',
    destination: '',
    patient_name: '',
    start_km: '',
    auth_by: 'Logistics Desk',
    trip_type: 'Operational',
  });

  const [endTripForm, setEndTripForm] = useState({
    id: null,
    vehicle_id: null,
    end_km: ''
  });

  const [checklistForm, setChecklistForm] = useState({
    vehicle_id: '',
    driver_name: '',
    engine_oil: 1,
    tyres: 1,
    brakes: 1,
    lights: 1,
    battery: 1,
    emergency_kit: 1,
    status: 'Pass',
    notes: ''
  });

  const [vehicleForm, setVehicleForm] = useState({
    plate_number: '',
    model: '',
    vehicle_type: 'Ambulance',
    insurance_exp: '',
    control_exp: '',
    rema_exp: '',
    current_odometer: 0,
    status: 'Available'
  });

  const [driverForm, setDriverForm] = useState({
    id: null,
    full_name: '',
    license_number: '',
    phone: '',
    status: 'Active',
    notes: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [vRes, tRes, cRes, dRes] = await Promise.all([
        fetch('/api/logistics/fleet/vehicles', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }),
        fetch('/api/logistics/fleet/trips', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }),
        fetch('/api/logistics/fleet/checklists', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }),
        fetch('/api/logistics/fleet/drivers', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      ]);

      const [vJson, tJson, cJson, dJson] = await Promise.all([vRes.json(), tRes.json(), cRes.json(), dRes.json()]);

      if (vJson.success) setVehicles(vJson.data);
      if (tJson.success) setTrips(tJson.data);
      if (cJson.success) setChecklists(cJson.data);
      if (dJson.success) setDrivers(dJson.data);
    } catch (err) {
      toast.error('Error loading fleet operations data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDriverSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const url = driverForm.id ? `/api/logistics/fleet/drivers/${driverForm.id}` : '/api/logistics/fleet/drivers';
      const method = driverForm.id ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(driverForm)
      });
      const json = await res.json();
      if (json.success) {
        toast.success(driverForm.id ? 'Driver updated successfully!' : 'Driver created successfully!');
        setIsDriverModal(false);
        setDriverForm({ id: null, full_name: '', license_number: '', phone: '', status: 'Active', notes: '' });
        fetchData();
      } else {
        toast.error(json.message || 'Failed to save driver');
      }
    } catch (err) {
      toast.error('Error saving driver');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDriver = async (id) => {
    if (!window.confirm('Are you sure you want to remove this driver?')) return;
    try {
      const res = await fetch(`/api/logistics/fleet/drivers/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Driver record removed!');
        fetchData();
      } else {
        toast.error(json.message || 'Failed to delete driver');
      }
    } catch (err) {
      toast.error('Error removing driver');
    }
  };

  const handleTripSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await fetch('/api/logistics/fleet/trips', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(tripForm)
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Trip logged successfully!');
        setIsTripModal(false);
        setTripForm({ vehicle_id: '', driver_name: user?.full_name || '', referring_physician: '', destination: '', patient_name: '', start_km: '', auth_by: 'Logistics Desk', trip_type: 'Operational' });
        fetchData();
      } else {
        toast.error(json.message || 'Failed to log trip');
      }
    } catch (err) {
      toast.error('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEndTripSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await fetch(`/api/logistics/fleet/trips/${endTripForm.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(endTripForm)
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Trip completed successfully!');
        setIsEndTripModal(false);
        setEndTripForm({ id: null, vehicle_id: null, end_km: '' });
        fetchData();
      } else {
        toast.error(json.message || 'Failed to complete trip');
      }
    } catch (err) {
      toast.error('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChecklistSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await fetch('/api/logistics/fleet/checklists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(checklistForm)
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Pre-trip mechanical check recorded!');
        setIsChecklistModal(false);
        fetchData();
      } else {
        toast.error(json.message || 'Failed to submit checklist');
      }
    } catch (err) {
      toast.error('Network error');
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
        setIsVehicleModal(false);
        fetchData();
      } else {
        toast.error(json.message || 'Failed to add vehicle');
      }
    } catch (err) {
      toast.error('Error saving vehicle');
    } finally {
      setSubmitting(false);
    }
  };

  // Helper for expiry dates
  const getExpiryBadge = (dateString) => {
    if (!dateString) return <span style={{ fontWeight: 700, color: '#64748b' }}>N/A</span>;
    
    const expDate = new Date(dateString);
    const today = new Date();
    const diffTime = expDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, backgroundColor: '#fee2e2', color: '#dc2626' }}><AlertTriangle size={10} style={{marginRight: '4px', display:'inline-block'}} /> Expired</span>;
    } else if (diffDays <= 30) {
      return <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, backgroundColor: '#fef9c3', color: '#ca8a04' }}><Clock size={10} style={{marginRight: '4px', display:'inline-block'}} /> Expiring ({diffDays}d)</span>;
    } else {
      return <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, backgroundColor: '#dcfce7', color: '#16a34a' }}>Valid</span>;
    }
  };

  // Derived filtered data
  const filteredTrips = trips.filter(t => 
    (t.plate_number?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (t.driver_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (t.destination?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  const filteredChecklists = checklists.filter(c => 
    (c.plate_number?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (c.driver_name?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ paddingBottom: '3rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <span style={{ backgroundColor: '#e0f2fe', color: '#0284c7', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>
            FLEET & AMBULANCE
          </span>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '6px 0 0 0', color: '#0f172a' }}>
            Fleet & Ambulance Operations
          </h1>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={() => { setDriverForm({ id: null, full_name: '', license_number: '', phone: '', status: 'Active', notes: '' }); setIsDriverModal(true); }} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '12px' }}>
            <User size={16} /> Register Driver
          </button>
          <button onClick={() => setIsTripModal(true)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#0284c7', borderRadius: '12px', boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)' }}>
            <Truck size={16} /> Log New Trip
          </button>
          <button onClick={() => setIsChecklistModal(true)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '12px' }}>
            <CheckSquare size={16} /> New Pre-Trip Check
          </button>
          <button onClick={() => setIsVehicleModal(true)} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '12px' }}>
            <Plus size={16} /> Add Vehicle
          </button>
        </div>
      </div>

      {/* ── TABS ── */}
      <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', marginBottom: '1.5rem', gap: '1rem', overflowX: 'auto' }}>
        <button
          onClick={() => setActiveTab('compliance')}
          style={{
            padding: '10px 16px',
            border: 'none',
            background: 'none',
            fontWeight: 700,
            color: activeTab === 'compliance' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'compliance' ? '3px solid #0284c7' : 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'color 0.2s',
            whiteSpace: 'nowrap'
          }}
        >
          <ShieldCheck size={16} /> Regulatory Compliance Board
        </button>

        <button
          onClick={() => setActiveTab('drivers')}
          style={{
            padding: '10px 16px',
            border: 'none',
            background: 'none',
            fontWeight: 700,
            color: activeTab === 'drivers' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'drivers' ? '3px solid #0284c7' : 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'color 0.2s',
            whiteSpace: 'nowrap'
          }}
        >
          <User size={16} /> Drivers Roster & Management
        </button>

        <button
          onClick={() => setActiveTab('trips')}
          style={{
            padding: '10px 16px',
            border: 'none',
            background: 'none',
            fontWeight: 700,
            color: activeTab === 'trips' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'trips' ? '3px solid #0284c7' : 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'color 0.2s',
            whiteSpace: 'nowrap'
          }}
        >
          <Truck size={16} /> Movement Logbook & Authorization
        </button>

        <button
          onClick={() => setActiveTab('checklists')}
          style={{
            padding: '10px 16px',
            border: 'none',
            background: 'none',
            fontWeight: 700,
            color: activeTab === 'checklists' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'checklists' ? '3px solid #0284c7' : 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'color 0.2s',
            whiteSpace: 'nowrap'
          }}
        >
          <CheckSquare size={16} /> Technical Pre-Trip Checklists
        </button>
      </div>

      {/* TAB 1: REGULATORY COMPLIANCE BOARD */}
      {activeTab === 'compliance' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
            {vehicles.map((v) => (
              <div key={v.id} className="glass card-shadow" style={{ backgroundColor: '#ffffff', borderRadius: '20px', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>{v.plate_number}</h3>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>{v.model} • {v.vehicle_type}</p>
                  </div>
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

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                    <span style={{color: '#475569', fontWeight: 600}}>Technical Control Expiry</span>
                    {getExpiryBadge(v.control_exp)}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                    <span style={{color: '#475569', fontWeight: 600}}>Motor Insurance Cover</span>
                    {getExpiryBadge(v.insurance_exp)}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                    <span style={{color: '#475569', fontWeight: 600}}>REMA Pass Certificate</span>
                    {getExpiryBadge(v.rema_exp)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: DRIVERS ROSTER & MANAGEMENT */}
      {activeTab === 'drivers' && (
        <>
          <div style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '6px 12px', width: '300px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <Search size={18} style={{ color: '#94a3b8', marginRight: '8px' }} />
              <input 
                type="text" 
                placeholder="Search driver name or phone..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ border: 'none', outline: 'none', width: '100%', fontSize: '0.875rem' }}
              />
            </div>
            <button
              onClick={() => {
                setDriverForm({ id: null, full_name: '', license_number: '', phone: '', status: 'Active', notes: '' });
                setIsDriverModal(true);
              }}
              className="btn btn-primary"
              style={{ backgroundColor: '#0284c7', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={16} /> Create New Driver
            </button>
          </div>

          <div style={{ backgroundColor: '#ffffff', borderRadius: '20px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '14px 16px' }}>Driver Name</th>
                  <th style={{ padding: '14px 16px' }}>License Number</th>
                  <th style={{ padding: '14px 16px' }}>Contact Phone</th>
                  <th style={{ padding: '14px 16px' }}>Status</th>
                  <th style={{ padding: '14px 16px' }}>Notes</th>
                  <th style={{ padding: '14px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {drivers.filter(d => (d.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (d.phone || '').includes(searchQuery)).length > 0 ? (
                  drivers.filter(d => (d.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (d.phone || '').includes(searchQuery)).map((d) => (
                    <tr key={d.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: '#0f172a' }}>{d.full_name}</td>
                      <td style={{ padding: '14px 16px', color: '#475569', fontWeight: 600 }}>{d.license_number || 'N/A'}</td>
                      <td style={{ padding: '14px 16px', color: '#475569' }}>{d.phone || 'N/A'}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700,
                          backgroundColor: d.status === 'Active' ? '#dcfce7' : '#fee2e2',
                          color: d.status === 'Active' ? '#15803d' : '#dc2626'
                        }}>
                          {d.status}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', color: '#64748b' }}>{d.notes || '—'}</td>
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                          <button
                            onClick={() => {
                              setDriverForm({ id: d.id, full_name: d.full_name, license_number: d.license_number || '', phone: d.phone || '', status: d.status || 'Active', notes: d.notes || '' });
                              setIsDriverModal(true);
                            }}
                            className="btn btn-ghost"
                            style={{ padding: '4px 8px', color: '#0284c7' }}
                            title="Edit Driver"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteDriver(d.id)}
                            className="btn btn-ghost"
                            style={{ padding: '4px 8px', color: '#dc2626' }}
                            title="Delete Driver"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8' }}>
                      <User size={48} style={{ opacity: 0.3, margin: '0 auto 1rem auto', display: 'block' }} />
                      <h4 style={{ margin: '0 0 4px 0', color: '#64748b' }}>No Registered Drivers Found</h4>
                      <p style={{ margin: 0, fontSize: '0.85rem' }}>Click "Create New Driver" to add drivers to the fleet roster.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* TAB 2: TRIPS LOGBOOK */}
      {activeTab === 'trips' && (
        <>
          <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '6px 12px', width: '300px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <Search size={18} style={{ color: '#94a3b8', marginRight: '8px' }} />
            <input 
              type="text" 
              placeholder="Search driver, vehicle or destination..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ border: 'none', outline: 'none', width: '100%', fontSize: '0.875rem' }}
            />
          </div>

          <div style={{ backgroundColor: '#ffffff', borderRadius: '20px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '14px 16px' }}>Vehicle</th>
                  <th style={{ padding: '14px 16px' }}>Driver</th>
                  <th style={{ padding: '14px 16px' }}>Trip Type</th>
                  <th style={{ padding: '14px 16px' }}>Destination</th>
                  <th style={{ padding: '14px 16px' }}>Physician / Patient</th>
                  <th style={{ padding: '14px 16px' }}>KM Tracking</th>
                  <th style={{ padding: '14px 16px' }}>Status & Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredTrips.length > 0 ? (
                  filteredTrips.map((t) => (
                    <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 700 }}>{t.plate_number || 'Vehicle #' + t.vehicle_id}</td>
                      <td style={{ padding: '14px 16px' }}>{t.driver_name}</td>
                      <td style={{ padding: '14px 16px' }}>{getTripTypeBadge(t.trip_type || 'Operational')}</td>
                      <td style={{ padding: '14px 16px' }}>{t.destination}</td>
                      <td style={{ padding: '14px 16px' }}>{t.referring_physician} / {t.patient_name || 'N/A'}</td>
                      <td style={{ padding: '14px 16px', color: '#64748b' }}>
                        <span style={{fontWeight: 600, color: '#1e3a8a'}}>{t.start_km} km</span> → {t.end_km ? <span style={{fontWeight: 600, color: '#1e3a8a'}}>{t.end_km} km</span> : 'Running'}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        {t.status === 'Completed' || t.end_km ? (
                           <span style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, backgroundColor: '#dcfce7', color: '#15803d', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                             <CheckCircle2 size={12} /> Completed
                           </span>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, backgroundColor: '#fef9c3', color: '#ca8a04' }}>
                              In Progress
                            </span>
                            <button
                              onClick={() => {
                                setEndTripForm({ id: t.id, vehicle_id: t.vehicle_id, end_km: '' });
                                setIsEndTripModal(true);
                              }}
                              style={{ padding: '4px 8px', borderRadius: '6px', border: 'none', backgroundColor: '#0284c7', color: '#fff', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                            >
                              End Trip
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8' }}>
                      <Truck size={48} style={{ opacity: 0.3, margin: '0 auto 1rem auto', display: 'block' }} />
                      <h4 style={{ margin: '0 0 4px 0', color: '#64748b' }}>No Movement Trips Found</h4>
                      <p style={{ margin: 0, fontSize: '0.85rem' }}>Log a new trip to track fleet operations and authorization.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* TAB 3: CHECKLISTS */}
      {activeTab === 'checklists' && (
        <>
          <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '6px 12px', width: '300px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <Search size={18} style={{ color: '#94a3b8', marginRight: '8px' }} />
            <input 
              type="text" 
              placeholder="Search driver or vehicle..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ border: 'none', outline: 'none', width: '100%', fontSize: '0.875rem' }}
            />
          </div>

          <div style={{ backgroundColor: '#ffffff', borderRadius: '20px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '14px 16px' }}>Date</th>
                  <th style={{ padding: '14px 16px' }}>Vehicle</th>
                  <th style={{ padding: '14px 16px' }}>Inspector / Driver</th>
                  <th style={{ padding: '14px 16px' }}>Technical Checks (Oil/Tyres/Brakes/Lights)</th>
                  <th style={{ padding: '14px 16px' }}>Result</th>
                </tr>
              </thead>
              <tbody>
                {filteredChecklists.length > 0 ? (
                  filteredChecklists.map((c) => (
                    <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 600 }}>{c.check_date}</td>
                      <td style={{ padding: '14px 16px', fontWeight: 700 }}>{c.plate_number || 'Vehicle #' + c.vehicle_id}</td>
                      <td style={{ padding: '14px 16px' }}>{c.driver_name}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.75rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: c.engine_oil ? '#dcfce7' : '#fee2e2', color: c.engine_oil ? '#15803d' : '#dc2626' }}>Oil</span>
                          <span style={{ fontSize: '0.75rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: c.tyres ? '#dcfce7' : '#fee2e2', color: c.tyres ? '#15803d' : '#dc2626' }}>Tyres</span>
                          <span style={{ fontSize: '0.75rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: c.brakes ? '#dcfce7' : '#fee2e2', color: c.brakes ? '#15803d' : '#dc2626' }}>Brakes</span>
                          <span style={{ fontSize: '0.75rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: c.lights ? '#dcfce7' : '#fee2e2', color: c.lights ? '#15803d' : '#dc2626' }}>Lights</span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, backgroundColor: c.status === 'Pass' ? '#dcfce7' : '#fee2e2', color: c.status === 'Pass' ? '#15803d' : '#dc2626' }}>
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8' }}>
                      <CheckSquare size={48} style={{ opacity: 0.3, margin: '0 auto 1rem auto', display: 'block' }} />
                      <h4 style={{ margin: '0 0 4px 0', color: '#64748b' }}>No Checklists Found</h4>
                      <p style={{ margin: 0, fontSize: '0.85rem' }}>No pre-trip inspection records match the current filter.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* MODAL: LOG NEW TRIP */}
      {isTripModal && (
        <Modal isOpen={true} title="Log New Vehicle Trip" onClose={() => setIsTripModal(false)}>
          <form onSubmit={handleTripSubmit}>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px' }}>Trip Type</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {TRIP_TYPES.map(t => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setTripForm({ ...tripForm, trip_type: t.value })}
                    style={{
                      flex: 1,
                      padding: '9px 0',
                      borderRadius: '8px',
                      border: tripForm.trip_type === t.value ? `2px solid ${t.color}` : '2px solid #e2e8f0',
                      backgroundColor: tripForm.trip_type === t.value ? t.bg : '#f8fafc',
                      color: tripForm.trip_type === t.value ? t.color : '#64748b',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Vehicle</label>
              <select
                className="input"
                style={{ width: '100%' }}
                value={tripForm.vehicle_id}
                onChange={(e) => setTripForm({ ...tripForm, vehicle_id: e.target.value })}
                required
              >
                <option value="">-- Select Vehicle --</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>{v.plate_number} — {v.model} ({v.status})</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Driver Name</label>
                {drivers.length > 0 ? (
                  <select
                    className="input"
                    style={{ width: '100%' }}
                    value={tripForm.driver_name}
                    onChange={(e) => setTripForm({ ...tripForm, driver_name: e.target.value })}
                    required
                  >
                    <option value="">-- Select Registered Driver --</option>
                    {drivers.filter(d => d.status === 'Active').map(d => (
                      <option key={d.id} value={d.full_name}>{d.full_name} {d.license_number ? `(${d.license_number})` : ''}</option>
                    ))}
                    {user?.full_name && <option value={user.full_name}>{user.full_name} (Current Staff)</option>}
                  </select>
                ) : (
                  <input
                    type="text"
                    className="input"
                    style={{ width: '100%' }}
                    value={tripForm.driver_name}
                    onChange={(e) => setTripForm({ ...tripForm, driver_name: e.target.value })}
                    required
                  />
                )}
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Referring Physician</label>
                <input
                  type="text"
                  className="input"
                  style={{ width: '100%' }}
                  placeholder="Dr. Eric"
                  value={tripForm.referring_physician}
                  onChange={(e) => setTripForm({ ...tripForm, referring_physician: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Destination</label>
                <input
                  type="text"
                  className="input"
                  style={{ width: '100%' }}
                  placeholder="CHUK Hospital"
                  value={tripForm.destination}
                  onChange={(e) => setTripForm({ ...tripForm, destination: e.target.value })}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Patient Name / Referral</label>
                <input
                  type="text"
                  className="input"
                  style={{ width: '100%' }}
                  placeholder="Optional"
                  value={tripForm.patient_name}
                  onChange={(e) => setTripForm({ ...tripForm, patient_name: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Odometer Start (KM)</label>
                <input
                  type="number"
                  className="input"
                  style={{ width: '100%' }}
                  placeholder="e.g. 45200"
                  value={tripForm.start_km}
                  onChange={(e) => setTripForm({ ...tripForm, start_km: e.target.value })}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Authorised By</label>
                <input
                  type="text"
                  className="input"
                  style={{ width: '100%' }}
                  value={tripForm.auth_by}
                  onChange={(e) => setTripForm({ ...tripForm, auth_by: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsTripModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" style={{ backgroundColor: '#0284c7' }} disabled={submitting}>
                {submitting ? 'Logging...' : 'Log Trip'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: END TRIP */}
      {isEndTripModal && (
        <Modal isOpen={true} title="Complete Vehicle Trip" onClose={() => setIsEndTripModal(false)}>
          <form onSubmit={handleEndTripSubmit}>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Final Odometer Reading (KM)</label>
              <input
                type="number"
                className="input"
                style={{ width: '100%' }}
                placeholder="e.g. 45280"
                value={endTripForm.end_km}
                onChange={(e) => setEndTripForm({ ...endTripForm, end_km: e.target.value })}
                required
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsEndTripModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" style={{ backgroundColor: '#15803d' }} disabled={submitting}>
                {submitting ? 'Saving...' : 'Complete Trip'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: PRE-TRIP CHECKLIST */}
      {isChecklistModal && (
        <Modal isOpen={true} title="Daily Pre-Trip Mechanical Technical Checklist" onClose={() => setIsChecklistModal(false)}>
          <form onSubmit={handleChecklistSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Vehicle</label>
              <select
                className="input"
                style={{ width: '100%' }}
                value={checklistForm.vehicle_id}
                onChange={(e) => setChecklistForm({ ...checklistForm, vehicle_id: e.target.value })}
                required
              >
                <option value="">-- Select Vehicle --</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>{v.plate_number} ({v.model})</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Inspector / Driver Name</label>
              {drivers.length > 0 ? (
                <select
                  className="input"
                  style={{ width: '100%' }}
                  value={checklistForm.driver_name}
                  onChange={(e) => setChecklistForm({ ...checklistForm, driver_name: e.target.value })}
                  required
                >
                  <option value="">-- Select Registered Driver --</option>
                  {drivers.filter(d => d.status === 'Active').map(d => (
                    <option key={d.id} value={d.full_name}>{d.full_name} {d.license_number ? `(${d.license_number})` : ''}</option>
                  ))}
                  {user?.full_name && <option value={user.full_name}>{user.full_name} (Current Staff)</option>}
                </select>
              ) : (
                <input
                  type="text"
                  className="input"
                  style={{ width: '100%' }}
                  value={checklistForm.driver_name}
                  onChange={(e) => setChecklistForm({ ...checklistForm, driver_name: e.target.value })}
                  required
                />
              )}
            </div>

            <div style={{ marginBottom: '1.5rem', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '12px', color: '#1e3a8a' }}>Technical Systems Verification</label>
              
              {[
                { key: 'engine_oil', label: 'Engine Oil Level' },
                { key: 'tyres', label: 'Tyre Pressure & Tread' },
                { key: 'brakes', label: 'Brake Pedal Response' },
                { key: 'lights', label: 'Sirens & Emergency Lights' },
                { key: 'battery', label: 'Battery / Electrical' },
                { key: 'emergency_kit', label: 'Medical Emergency Kit' }
              ].map(item => (
                <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>{item.label}</span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => setChecklistForm(prev => ({ ...prev, [item.key]: 1 }))}
                      style={{ 
                        padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, border: 'none', cursor: 'pointer',
                        backgroundColor: checklistForm[item.key] === 1 ? '#15803d' : '#e2e8f0',
                        color: checklistForm[item.key] === 1 ? '#fff' : '#64748b'
                      }}
                    >
                      <CheckCircle2 size={12} style={{ display: 'inline', marginRight: '4px' }} /> Pass
                    </button>
                    <button
                      type="button"
                      onClick={() => setChecklistForm(prev => ({ ...prev, [item.key]: 0 }))}
                      style={{ 
                        padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, border: 'none', cursor: 'pointer',
                        backgroundColor: checklistForm[item.key] === 0 ? '#dc2626' : '#e2e8f0',
                        color: checklistForm[item.key] === 0 ? '#fff' : '#64748b'
                      }}
                    >
                      <XCircle size={12} style={{ display: 'inline', marginRight: '4px' }} /> Fail
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Additional Notes (Optional)</label>
              <textarea
                className="input"
                style={{ width: '100%', height: '60px' }}
                value={checklistForm.notes}
                onChange={(e) => setChecklistForm({ ...checklistForm, notes: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsChecklistModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" style={{ backgroundColor: '#15803d' }} disabled={submitting}>
                {submitting ? 'Saving...' : 'Save Inspection Log'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: ADD VEHICLE */}
      {isVehicleModal && (
        <Modal isOpen={true} title="Register Vehicle / Update Expiries" onClose={() => setIsVehicleModal(false)}>
          <form onSubmit={handleVehicleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Plate Number</label>
                <input
                  type="text"
                  className="input"
                  style={{ width: '100%' }}
                  placeholder="RAD-123A"
                  value={vehicleForm.plate_number}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, plate_number: e.target.value })}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Vehicle Model & Make</label>
                <input
                  type="text"
                  className="input"
                  style={{ width: '100%' }}
                  placeholder="Toyota HiAce Ambulance"
                  value={vehicleForm.model}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, model: e.target.value })}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Insurance Expiry</label>
                <input
                  type="date"
                  className="input"
                  style={{ width: '100%' }}
                  value={vehicleForm.insurance_exp}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, insurance_exp: e.target.value })}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Technical Control Exp</label>
                <input
                  type="date"
                  className="input"
                  style={{ width: '100%' }}
                  value={vehicleForm.control_exp}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, control_exp: e.target.value })}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>REMA Pass Exp</label>
                <input
                  type="date"
                  className="input"
                  style={{ width: '100%' }}
                  value={vehicleForm.rema_exp}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, rema_exp: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsVehicleModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Registering...' : 'Register Vehicle'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: REGISTER / EDIT DRIVER */}
      {isDriverModal && (
        <Modal isOpen={true} title={driverForm.id ? "Edit Fleet Driver Record" : "Create New Fleet Driver"} onClose={() => setIsDriverModal(false)}>
          <form onSubmit={handleDriverSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Driver Full Name</label>
              <input
                type="text"
                className="input"
                style={{ width: '100%' }}
                placeholder="e.g. John Mugisha"
                value={driverForm.full_name}
                onChange={(e) => setDriverForm({ ...driverForm, full_name: e.target.value })}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Driving License Number</label>
                <input
                  type="text"
                  className="input"
                  style={{ width: '100%' }}
                  placeholder="e.g. DL-98765432"
                  value={driverForm.license_number}
                  onChange={(e) => setDriverForm({ ...driverForm, license_number: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Phone / Contact Number</label>
                <input
                  type="text"
                  className="input"
                  style={{ width: '100%' }}
                  placeholder="e.g. +250 788 123 456"
                  value={driverForm.phone}
                  onChange={(e) => setDriverForm({ ...driverForm, phone: e.target.value })}
                />
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Status</label>
              <select
                className="input"
                style={{ width: '100%' }}
                value={driverForm.status}
                onChange={(e) => setDriverForm({ ...driverForm, status: e.target.value })}
              >
                <option value="Active">Active / Available</option>
                <option value="On Leave">On Leave</option>
                <option value="Inactive">Inactive / Suspended</option>
              </select>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Notes / Remarks</label>
              <textarea
                className="input"
                style={{ width: '100%', height: '70px' }}
                placeholder="Optional notes regarding driver qualifications..."
                value={driverForm.notes}
                onChange={(e) => setDriverForm({ ...driverForm, notes: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsDriverModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" style={{ backgroundColor: '#0284c7' }} disabled={submitting}>
                {submitting ? 'Saving...' : (driverForm.id ? 'Update Driver' : 'Create Driver')}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default FleetOperations;
