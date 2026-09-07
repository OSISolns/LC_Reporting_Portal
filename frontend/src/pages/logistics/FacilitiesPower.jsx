import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { Zap, Activity, Plus, CheckCircle2, AlertTriangle, ShieldCheck, Thermometer, BatteryCharging } from 'lucide-react';
import Modal from '../../components/Modal';

const FacilitiesPower = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('generator'); // 'generator', 'tour'
  const [loading, setLoading] = useState(true);
  const [genLogs, setGenLogs] = useState([]);
  const [tours, setTours] = useState([]);

  const [isGenModal, setIsGenModal] = useState(false);
  const [isTourModal, setIsTourModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [genForm, setGenForm] = useState({
    battery_voltage: '25.2',
    output_voltage: '232',
    fuel_level_pct: '85',
    fuel_liters: '425',
    test_run_mins: '15',
    operator_name: user?.full_name || '',
    notes: 'Standby generator morning test completed cleanly.'
  });

  const [tourForm, setTourForm] = useState({
    conducted_by: user?.full_name || '',
    hvac_status: 'OK',
    water_status: 'OK',
    lighting_status: 'OK',
    cold_room_status: 'OK',
    waste_status: 'OK',
    issues_notes: 'All clinic physical plant systems operational during morning tour.'
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [gRes, tRes] = await Promise.all([
        fetch('/api/logistics/facilities/generator', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }),
        fetch('/api/logistics/facilities/tours', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      ]);
      const [gJson, tJson] = await Promise.all([gRes.json(), tRes.json()]);

      if (gJson.success) setGenLogs(gJson.data);
      if (tJson.success) setTours(tJson.data);
    } catch (err) {
      toast.error('Error loading facilities data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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
        toast.success('Generator daily log saved!');
        setIsGenModal(false);
        fetchData();
      } else {
        toast.error(json.message || 'Failed to submit log');
      }
    } catch (err) {
      toast.error('Error submitting generator log');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTourSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await fetch('/api/logistics/facilities/tours', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(tourForm)
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Daily Morning Clinic Tour saved!');
        setIsTourModal(false);
        fetchData();
      } else {
        toast.error(json.message || 'Failed to submit tour');
      }
    } catch (err) {
      toast.error('Error saving tour report');
    } finally {
      setSubmitting(false);
    }
  };

  const latestGen = genLogs[0] || null;

  return (
    <div style={{ paddingBottom: '3rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <span style={{ backgroundColor: '#dcfce7', color: '#16a34a', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>
            FACILITIES & POWER
          </span>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '6px 0 0 0', color: '#0f172a' }}>
            Facilities, Power & Environment
          </h1>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setIsGenModal(true)} className="btn btn-primary" style={{ backgroundColor: '#16a34a', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Zap size={16} /> Log Generator Check
          </button>
          <button onClick={() => setIsTourModal(true)} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Activity size={16} /> Record Clinic Tour
          </button>
        </div>
      </div>

      {/* ── GENERATOR HEADS-UP DISPLAY ── */}
      {latestGen && (
        <div className="glass card-shadow" style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem', borderLeft: '4px solid #16a34a' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>CURRENT GENERATOR READINESS</span>
              <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>
                Generator 01 Standby: {latestGen.fuel_level_pct}% Fuel ({latestGen.fuel_liters} Liters)
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                Last Inspected: {latestGen.check_date} by {latestGen.operator_name}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '1.5rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Battery Voltage</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>{latestGen.battery_voltage}V</span>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Output Voltage</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>{latestGen.output_voltage}V</span>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Test Run</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>{latestGen.test_run_mins} mins</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TABS */}
      <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', marginBottom: '1.5rem', gap: '1rem' }}>
        <button
          onClick={() => setActiveTab('generator')}
          style={{
            padding: '10px 16px',
            border: 'none',
            background: 'none',
            fontWeight: 700,
            color: activeTab === 'generator' ? '#16a34a' : '#64748b',
            borderBottom: activeTab === 'generator' ? '3px solid #16a34a' : 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Zap size={16} /> Generator Operation Checks
        </button>

        <button
          onClick={() => setActiveTab('tour')}
          style={{
            padding: '10px 16px',
            border: 'none',
            background: 'none',
            fontWeight: 700,
            color: activeTab === 'tour' ? '#16a34a' : '#64748b',
            borderBottom: activeTab === 'tour' ? '3px solid #16a34a' : 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Activity size={16} /> Daily Morning Clinic Tour Reports
        </button>
      </div>

      {activeTab === 'generator' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                <th style={{ padding: '12px 16px' }}>Date</th>
                <th style={{ padding: '12px 16px' }}>Operator</th>
                <th style={{ padding: '12px 16px' }}>Battery (V)</th>
                <th style={{ padding: '12px 16px' }}>Output (V)</th>
                <th style={{ padding: '12px 16px' }}>Fuel Level</th>
                <th style={{ padding: '12px 16px' }}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {genLogs.length > 0 ? (
                genLogs.map((g) => (
                  <tr key={g.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 700 }}>{g.check_date}</td>
                    <td style={{ padding: '12px 16px' }}>{g.operator_name}</td>
                    <td style={{ padding: '12px 16px' }}>{g.battery_voltage}V</td>
                    <td style={{ padding: '12px 16px' }}>{g.output_voltage}V</td>
                    <td style={{ padding: '12px 16px' }}>{g.fuel_level_pct}% ({g.fuel_liters}L)</td>
                    <td style={{ padding: '12px 16px', color: '#64748b' }}>{g.notes || 'Normal'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>No generator checks logged yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'tour' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                <th style={{ padding: '12px 16px' }}>Tour Date</th>
                <th style={{ padding: '12px 16px' }}>Conducted By</th>
                <th style={{ padding: '12px 16px' }}>HVAC / Water</th>
                <th style={{ padding: '12px 16px' }}>Cold Room & Lighting</th>
                <th style={{ padding: '12px 16px' }}>Waste Management</th>
              </tr>
            </thead>
            <tbody>
              {tours.length > 0 ? (
                tours.map((t) => (
                  <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 700 }}>{t.tour_date}</td>
                    <td style={{ padding: '12px 16px' }}>{t.conducted_by}</td>
                    <td style={{ padding: '12px 16px' }}>HVAC: {t.hvac_status} | Water: {t.water_status}</td>
                    <td style={{ padding: '12px 16px' }}>Cold Room: {t.cold_room_status} | Lights: {t.lighting_status}</td>
                    <td style={{ padding: '12px 16px' }}>Waste Bins: {t.waste_status}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>No morning clinic tours recorded yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL: LOG GENERATOR CHECK */}
      {isGenModal && (
        <Modal title="Generator Operation Check Record (#2)" onClose={() => setIsGenModal(false)}>
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
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Operator Inspection Notes</label>
              <textarea
                className="input"
                style={{ width: '100%', height: '80px' }}
                value={genForm.notes}
                onChange={(e) => setGenForm({ ...genForm, notes: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsGenModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>Save Generator Log</button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: MORNING CLINIC TOUR */}
      {isTourModal && (
        <Modal title="Daily Morning Status Report / Clinic Tour" onClose={() => setIsTourModal(false)}>
          <form onSubmit={handleTourSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Inspector Name</label>
              <input
                type="text"
                className="input"
                style={{ width: '100%' }}
                value={tourForm.conducted_by}
                onChange={(e) => setTourForm({ ...tourForm, conducted_by: e.target.value })}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>HVAC / Air Conditioning</label>
                <select className="input" style={{ width: '100%' }} value={tourForm.hvac_status} onChange={(e) => setTourForm({ ...tourForm, hvac_status: e.target.value })}>
                  <option value="OK">OK (Operational)</option>
                  <option value="Issue Flagged">Issue Flagged</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Main Water Supply</label>
                <select className="input" style={{ width: '100%' }} value={tourForm.water_status} onChange={(e) => setTourForm({ ...tourForm, water_status: e.target.value })}>
                  <option value="OK">OK (Operational)</option>
                  <option value="Issue Flagged">Issue Flagged</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Cold Room Refrigeration</label>
                <select className="input" style={{ width: '100%' }} value={tourForm.cold_room_status} onChange={(e) => setTourForm({ ...tourForm, cold_room_status: e.target.value })}>
                  <option value="OK">OK (Stable +2°C to +8°C)</option>
                  <option value="Issue Flagged">Issue Flagged</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Medical Waste Bin Clearance</label>
                <select className="input" style={{ width: '100%' }} value={tourForm.waste_status} onChange={(e) => setTourForm({ ...tourForm, waste_status: e.target.value })}>
                  <option value="OK">OK (Cleared)</option>
                  <option value="Issue Flagged">Issue Flagged</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsTourModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>Submit Daily Tour</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default FacilitiesPower;
