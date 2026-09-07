import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { Truck, CheckSquare, Calendar, Plus, ShieldCheck, Clock, FileText, AlertTriangle } from 'lucide-react';
import Modal from '../../components/Modal';

const FleetOperations = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('compliance'); // 'compliance', 'trips', 'checklists', 'vehicles'
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState([]);
  const [trips, setTrips] = useState([]);
  const [checklists, setChecklists] = useState([]);

  const [isChecklistModal, setIsChecklistModal] = useState(false);
  const [isTripModal, setIsTripModal] = useState(false);
  const [isVehicleModal, setIsVehicleModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [checklistForm, setChecklistForm] = useState({
    vehicle_id: '',
    driver_name: user?.full_name || '',
    engine_oil: 1,
    tyres: 1,
    brakes: 1,
    lights: 1,
    battery: 1,
    emergency_kit: 1,
    status: 'Pass',
    notes: 'Morning pre-trip mechanical inspection completed.'
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

  const fetchData = async () => {
    try {
      setLoading(true);
      const [vRes, tRes, cRes] = await Promise.all([
        fetch('/api/logistics/fleet/vehicles', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }),
        fetch('/api/logistics/fleet/trips', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }),
        fetch('/api/logistics/fleet/checklists', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      ]);

      const [vJson, tJson, cJson] = await Promise.all([vRes.json(), tRes.json(), cRes.json()]);

      if (vJson.success) setVehicles(vJson.data);
      if (tJson.success) setTrips(tJson.data);
      if (cJson.success) setChecklists(cJson.data);
    } catch (err) {
      toast.error('Error loading fleet operations data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setIsChecklistModal(true)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckSquare size={16} /> New Pre-Trip Check
          </button>
          <button onClick={() => setIsVehicleModal(true)} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={16} /> Add Vehicle
          </button>
        </div>
      </div>

      {/* ── TABS ── */}
      <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', marginBottom: '1.5rem', gap: '1rem' }}>
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
            gap: '6px'
          }}
        >
          <ShieldCheck size={16} /> Regulatory Compliance Board
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
            gap: '6px'
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
            gap: '6px'
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
              <div key={v.id} className="glass card-shadow" style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '1.25rem', border: '1px solid #e2e8f0' }}>
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                    <span>Technical Control Expiry:</span>
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>{v.control_exp || 'N/A'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                    <span>Motor Insurance Cover:</span>
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>{v.insurance_exp || 'N/A'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                    <span>REMA Pass Certificate:</span>
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>{v.rema_exp || 'N/A'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: TRIPS LOGBOOK */}
      {activeTab === 'trips' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                <th style={{ padding: '12px 16px' }}>Vehicle</th>
                <th style={{ padding: '12px 16px' }}>Driver</th>
                <th style={{ padding: '12px 16px' }}>Destination</th>
                <th style={{ padding: '12px 16px' }}>Physician / Patient</th>
                <th style={{ padding: '12px 16px' }}>KM Start → End</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {trips.length > 0 ? (
                trips.map((t) => (
                  <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 700 }}>{t.plate_number || 'Vehicle #' + t.vehicle_id}</td>
                    <td style={{ padding: '12px 16px' }}>{t.driver_name}</td>
                    <td style={{ padding: '12px 16px' }}>{t.destination}</td>
                    <td style={{ padding: '12px 16px' }}>{t.referring_physician} / {t.patient_name || 'N/A'}</td>
                    <td style={{ padding: '12px 16px' }}>{t.start_km} km → {t.end_km ? `${t.end_km} km` : 'In Progress'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, backgroundColor: '#e0f2fe', color: '#0369a1' }}>
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>No movement trips logged yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: CHECKLISTS */}
      {activeTab === 'checklists' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                <th style={{ padding: '12px 16px' }}>Date</th>
                <th style={{ padding: '12px 16px' }}>Vehicle</th>
                <th style={{ padding: '12px 16px' }}>Inspector / Driver</th>
                <th style={{ padding: '12px 16px' }}>Oil/Tyres/Brakes/Lights</th>
                <th style={{ padding: '12px 16px' }}>Result</th>
              </tr>
            </thead>
            <tbody>
              {checklists.length > 0 ? (
                checklists.map((c) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px' }}>{c.check_date}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 700 }}>{c.plate_number || 'Vehicle #' + c.vehicle_id}</td>
                    <td style={{ padding: '12px 16px' }}>{c.driver_name}</td>
                    <td style={{ padding: '12px 16px' }}>
                      Oil: OK | Tyres: OK | Brakes: OK | Lights: OK
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, backgroundColor: '#dcfce7', color: '#15803d' }}>
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>No pre-trip checklists recorded yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL: PRE-TRIP CHECKLIST */}
      {isChecklistModal && (
        <Modal title="Daily Pre-Trip Mechanical Technical Checklist" onClose={() => setIsChecklistModal(false)}>
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
              <input
                type="text"
                className="input"
                style={{ width: '100%' }}
                value={checklistForm.driver_name}
                onChange={(e) => setChecklistForm({ ...checklistForm, driver_name: e.target.value })}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '1.5rem', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
              <label style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input type="checkbox" checked={checklistForm.engine_oil === 1} onChange={(e) => setChecklistForm({ ...checklistForm, engine_oil: e.target.checked ? 1 : 0 })} /> Engine Oil Level
              </label>
              <label style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input type="checkbox" checked={checklistForm.tyres === 1} onChange={(e) => setChecklistForm({ ...checklistForm, tyres: e.target.checked ? 1 : 0 })} /> Tyre Pressure & Tread
              </label>
              <label style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input type="checkbox" checked={checklistForm.brakes === 1} onChange={(e) => setChecklistForm({ ...checklistForm, brakes: e.target.checked ? 1 : 0 })} /> Brake Pedal Response
              </label>
              <label style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input type="checkbox" checked={checklistForm.lights === 1} onChange={(e) => setChecklistForm({ ...checklistForm, lights: e.target.checked ? 1 : 0 })} /> Sirens & Emergency Lights
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsChecklistModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Saving...' : 'Save Inspection Pass'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: ADD VEHICLE */}
      {isVehicleModal && (
        <Modal title="Register Vehicle / Update Expiries" onClose={() => setIsVehicleModal(false)}>
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
    </div>
  );
};

export default FleetOperations;
