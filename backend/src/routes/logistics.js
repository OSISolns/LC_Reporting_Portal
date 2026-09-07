'use strict';
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const LOGISTICS_ROLES = ['admin', 'coo', 'deputy_coo', 'logistics_manager', 'logistics_officer'];

router.use(authMiddleware);
router.use((req, res, next) => {
  if (!req.user || !LOGISTICS_ROLES.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Access restricted to Logistics personnel.' });
  }
  next();
});

// ── 1. LOGISTICS COMMAND DASHBOARD AGGREGATOR ────────────────────────────────

router.get('/dashboard-stats', async (req, res) => {
  try {
    // 1. Vehicles & Compliance expiries
    const { rows: vehicles } = await db.query(`
      SELECT * FROM logistics_vehicles ORDER BY id DESC
    `);

    const now = new Date();
    const alertRibbon = [];

    vehicles.forEach(v => {
      ['insurance_exp', 'control_exp', 'rema_exp'].forEach(expKey => {
        if (v[expKey]) {
          const expDate = new Date(v[expKey]);
          const diffDays = Math.ceil((expDate - now) / (1000 * 60 * 60 * 24));
          const labelMap = { insurance_exp: 'Motor Insurance', control_exp: 'Technical Control', rema_exp: 'REMA Pass' };
          if (diffDays <= 30) {
            alertRibbon.push({
              id: `v-${v.id}-${expKey}`,
              type: diffDays <= 7 ? 'danger' : 'warning',
              message: `[${v.plate_number}] ${labelMap[expKey]} ${diffDays < 0 ? 'EXPIRED' : `expires in ${diffDays} days`} (${v[expKey]})`
            });
          }
        }
      });
    });

    // 2. Generator Status
    const { rows: genLogs } = await db.query(`
      SELECT * FROM logistics_generator_logs ORDER BY id DESC LIMIT 1
    `);
    const latestGen = genLogs[0] || null;

    if (latestGen) {
      if (latestGen.fuel_level_pct < 35) {
        alertRibbon.push({
          id: `gen-fuel-${latestGen.id}`,
          type: 'danger',
          message: `[GENERATOR-01] Low fuel level: ${latestGen.fuel_level_pct}% (${latestGen.fuel_liters}L remaining). Immediate refill required!`
        });
      } else if (latestGen.fuel_level_pct < 50) {
        alertRibbon.push({
          id: `gen-fuel-${latestGen.id}`,
          type: 'warning',
          message: `[GENERATOR-01] Fuel level at ${latestGen.fuel_level_pct}%. Refill recommended before weekend.`
        });
      }
    }

    // 3. Incidents
    const { rows: openIncidents } = await db.query(`
      SELECT id, incident_type, severity, status, description FROM incident_reports 
      WHERE status != 'CLOSED' AND status != 'Resolved' ORDER BY id DESC LIMIT 5
    `);

    openIncidents.forEach(inc => {
      alertRibbon.push({
        id: `inc-${inc.id}`,
        type: (inc.severity || '').toLowerCase().includes('high') || (inc.severity || '').toLowerCase().includes('critical') ? 'danger' : 'info',
        message: `[INCIDENT #${inc.id}] ${inc.severity || 'Reported'}: ${inc.incident_type || 'Facility issue'}`
      });
    });

    // 4. IT Support Tickets
    const { rows: openItTickets } = await db.query(`
      SELECT id, title, priority, status FROM it_tickets WHERE status != 'Closed' AND status != 'Resolved' ORDER BY id DESC LIMIT 5
    `);

    // 5. Active Trips
    const { rows: activeTrips } = await db.query(`
      SELECT t.*, v.plate_number, v.model 
      FROM logistics_vehicle_trips t 
      LEFT JOIN logistics_vehicles v ON t.vehicle_id = v.id 
      ORDER BY t.id DESC LIMIT 10
    `);

    // 6. Facilities Feed
    const { rows: clinicTours } = await db.query(`
      SELECT * FROM logistics_clinic_tours ORDER BY id DESC LIMIT 1
    `);
    const latestTour = clinicTours[0] || null;

    const { rows: lowStock } = await db.query(`
      SELECT * FROM logistics_stock_items WHERE quantity_on_hand <= min_threshold ORDER BY id DESC
    `);

    res.json({
      success: true,
      data: {
        alertRibbon,
        kpis: {
          fleet: {
            total: vehicles.length,
            available: vehicles.filter(v => v.status === 'Available').length,
            inUse: vehicles.filter(v => v.status === 'In Use').length,
            maintenance: vehicles.filter(v => v.status === 'Maintenance').length
          },
          power: {
            gridStatus: 'Grid Active (Stable)',
            genStatus: latestGen ? `${latestGen.fuel_level_pct}% Fuel (${latestGen.battery_voltage}V Battery)` : 'No Log Today',
            fuelLevelPct: latestGen ? latestGen.fuel_level_pct : 100
          },
          ppm: {
            pending: 2
          },
          incidents: {
            openCount: openIncidents.length,
            criticalCount: openIncidents.filter(i => (i.severity || '').toLowerCase().includes('critical')).length
          },
          it: {
            inProgress: openItTickets.length,
            overdue: 0
          }
        },
        vehicles,
        activeTrips,
        latestGen,
        latestTour,
        lowStock,
        openIncidents,
        openItTickets
      }
    });
  } catch (err) {
    console.error('Error fetching logistics dashboard stats:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── 2. FLEET & AMBULANCE OPERATIONS ───────────────────────────────────────────

router.get('/fleet/vehicles', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM logistics_vehicles ORDER BY id ASC');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/fleet/vehicles', async (req, res) => {
  try {
    const { plate_number, model, vehicle_type, insurance_exp, control_exp, rema_exp, current_odometer, status, notes } = req.body;
    const { rows } = await db.query(`
      INSERT INTO logistics_vehicles (plate_number, model, vehicle_type, insurance_exp, control_exp, rema_exp, current_odometer, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `, [plate_number, model, vehicle_type || 'Ambulance', insurance_exp, control_exp, rema_exp, current_odometer || 0, status || 'Available', notes]);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/fleet/trips', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT t.*, v.plate_number, v.model as vehicle_model 
      FROM logistics_vehicle_trips t 
      LEFT JOIN logistics_vehicles v ON t.vehicle_id = v.id 
      ORDER BY t.id DESC
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/fleet/trips', async (req, res) => {
  try {
    const { vehicle_id, driver_name, referring_physician, destination, patient_name, start_km, end_km, fuel_consumed, start_time, end_time, auth_by } = req.body;
    
    // Insert trip record
    const { rows } = await db.query(`
      INSERT INTO logistics_vehicle_trips (vehicle_id, driver_name, referring_physician, destination, patient_name, start_km, end_km, fuel_consumed, start_time, end_time, auth_by, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'In Progress')
      RETURNING *
    `, [vehicle_id, driver_name, referring_physician, destination, patient_name, start_km, end_km, fuel_consumed || 0, start_time || new Date().toISOString(), end_time, auth_by]);

    // Update vehicle status
    if (vehicle_id) {
      await db.query(`UPDATE logistics_vehicles SET status = 'In Use' WHERE id = ?`, [vehicle_id]);
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/fleet/checklists', async (req, res) => {
  try {
    const { vehicle_id, driver_name, check_date, engine_oil, tyres, brakes, lights, battery, emergency_kit, status, notes } = req.body;
    const { rows } = await db.query(`
      INSERT INTO logistics_vehicle_checklists (vehicle_id, driver_name, check_date, engine_oil, tyres, brakes, lights, battery, emergency_kit, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `, [vehicle_id, driver_name, check_date || new Date().toISOString().split('T')[0], engine_oil, tyres, brakes, lights, battery, emergency_kit, status || 'Pass', notes]);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/fleet/checklists', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT c.*, v.plate_number, v.model FROM logistics_vehicle_checklists c
      LEFT JOIN logistics_vehicles v ON c.vehicle_id = v.id
      ORDER BY c.id DESC
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── 3. FACILITIES, POWER & ENVIRONMENT ────────────────────────────────────────

router.get('/facilities/generator', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM logistics_generator_logs ORDER BY id DESC LIMIT 30');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/facilities/generator', async (req, res) => {
  try {
    const { check_date, battery_voltage, output_voltage, fuel_level_pct, fuel_liters, test_run_mins, operator_name, status_flag, notes } = req.body;
    const { rows } = await db.query(`
      INSERT INTO logistics_generator_logs (check_date, battery_voltage, output_voltage, fuel_level_pct, fuel_liters, test_run_mins, operator_name, status_flag, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `, [
      check_date || new Date().toISOString().split('T')[0],
      battery_voltage || 24.0,
      output_voltage || 230.0,
      fuel_level_pct || 100,
      fuel_liters || 200,
      test_run_mins || 15,
      operator_name || req.user?.full_name || 'Technician',
      status_flag || 'OK',
      notes
    ]);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/facilities/tours', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM logistics_clinic_tours ORDER BY id DESC LIMIT 30');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/facilities/tours', async (req, res) => {
  try {
    const { tour_date, conducted_by, hvac_status, water_status, lighting_status, cold_room_status, waste_status, issues_json } = req.body;
    const { rows } = await db.query(`
      INSERT INTO logistics_clinic_tours (tour_date, conducted_by, hvac_status, water_status, lighting_status, cold_room_status, waste_status, issues_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `, [
      tour_date || new Date().toISOString().split('T')[0],
      conducted_by || req.user?.full_name || 'Inspector',
      hvac_status || 'OK',
      water_status || 'OK',
      lighting_status || 'OK',
      cold_room_status || 'OK',
      waste_status || 'OK',
      typeof issues_json === 'object' ? JSON.stringify(issues_json) : issues_json
    ]);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── 4. BIOMEDICAL & PHYSICAL ASSET MANAGEMENT ─────────────────────────────────

router.get('/assets', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM logistics_assets ORDER BY id ASC');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/assets', async (req, res) => {
  try {
    const { asset_tag, serial_number, name, category, department, custodian, purchase_date, warranty_exp, expected_lifespan_years, purchase_cost, status } = req.body;
    const { rows } = await db.query(`
      INSERT INTO logistics_assets (asset_tag, serial_number, name, category, department, custodian, purchase_date, warranty_exp, expected_lifespan_years, purchase_cost, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `, [asset_tag, serial_number, name, category, department, custodian, purchase_date, warranty_exp, expected_lifespan_years || 5, purchase_cost || 0, status || 'Active']);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/assets/transfers', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT t.*, a.asset_tag, a.name as asset_name 
      FROM logistics_asset_transfers t
      LEFT JOIN logistics_assets a ON t.asset_id = a.id
      ORDER BY t.id DESC
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/assets/transfers', async (req, res) => {
  try {
    const { asset_id, from_dept, to_dept, initiated_by, notes } = req.body;
    const { rows } = await db.query(`
      INSERT INTO logistics_asset_transfers (asset_id, from_dept, to_dept, initiated_by, status, notes)
      VALUES (?, ?, ?, ?, 'Pending', ?)
      RETURNING *
    `, [asset_id, from_dept, to_dept, initiated_by || req.user?.full_name, notes]);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.patch('/assets/transfers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, approved_by, accepted_by } = req.body;
    const { rows } = await db.query(`
      UPDATE logistics_asset_transfers 
      SET status = ?, approved_by = COALESCE(?, approved_by), accepted_by = COALESCE(?, accepted_by)
      WHERE id = ?
      RETURNING *
    `, [status, approved_by, accepted_by, id]);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/assets/ppm', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT p.*, a.asset_tag, a.name as asset_name, a.department 
      FROM logistics_ppm_records p
      LEFT JOIN logistics_assets a ON p.asset_id = a.id
      ORDER BY p.id DESC
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/assets/ppm', async (req, res) => {
  try {
    const { asset_id, maintenance_type, scheduled_date, technician, findings, cost, status } = req.body;
    const { rows } = await db.query(`
      INSERT INTO logistics_ppm_records (asset_id, maintenance_type, scheduled_date, technician, findings, cost, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `, [asset_id, maintenance_type, scheduled_date, technician, findings, cost || 0, status || 'Scheduled']);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── 5. MAINTENANCE MATERIALS & SPARE PARTS ─────────────────────────────────────

router.get('/inventory/items', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM logistics_stock_items ORDER BY id ASC');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/inventory/items', async (req, res) => {
  try {
    const { item_name, category, unit, quantity_on_hand, min_threshold, unit_cost } = req.body;
    const { rows } = await db.query(`
      INSERT INTO logistics_stock_items (item_name, category, unit, quantity_on_hand, min_threshold, unit_cost)
      VALUES (?, ?, ?, ?, ?, ?)
      RETURNING *
    `, [item_name, category, unit || 'Pcs', quantity_on_hand || 0, min_threshold || 10, unit_cost || 0]);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/inventory/releases', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM logistics_stock_releases ORDER BY id DESC');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/inventory/releases', async (req, res) => {
  try {
    const { item_id, item_name, quantity, target_location, requested_by, approved_by } = req.body;
    
    // Deduct stock balance
    if (item_id) {
      await db.query(`UPDATE logistics_stock_items SET quantity_on_hand = MAX(0, quantity_on_hand - ?) WHERE id = ?`, [quantity, item_id]);
    }

    const { rows } = await db.query(`
      INSERT INTO logistics_stock_releases (item_id, item_name, quantity, target_location, requested_by, approved_by, release_date)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `, [item_id, item_name, quantity, target_location, requested_by || req.user?.full_name, approved_by || 'Logistics Manager', new Date().toISOString().split('T')[0]]);

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── 6. OPERATIONS ADMIN, SHIPMENTS & REQUISITIONS ──────────────────────────────

router.get('/admin/petty-cash', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM logistics_petty_cash ORDER BY id DESC');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/admin/petty-cash', async (req, res) => {
  try {
    const { transaction_date, category, description, amount, receipt_number } = req.body;
    const { rows } = await db.query(`
      INSERT INTO logistics_petty_cash (transaction_date, category, description, amount, receipt_number, logged_by, status)
      VALUES (?, ?, ?, ?, ?, ?, 'Approved')
      RETURNING *
    `, [transaction_date || new Date().toISOString().split('T')[0], category, description, amount, receipt_number, req.user?.full_name || 'Staff']);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/admin/sample-dispatches', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM logistics_sample_dispatches ORDER BY id DESC');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/admin/sample-dispatches', async (req, res) => {
  try {
    const { patient_code, sampling_time, cold_chain_ok, dhl_waybill, departure_time, notes } = req.body;
    const { rows } = await db.query(`
      INSERT INTO logistics_sample_dispatches (patient_code, sampling_time, cold_chain_ok, dhl_waybill, departure_time, dispatched_by, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, 'Dispatched', ?)
      RETURNING *
    `, [patient_code, sampling_time || new Date().toISOString(), cold_chain_ok ? 1 : 0, dhl_waybill, departure_time || new Date().toISOString(), req.user?.full_name || 'Lab Officer', notes]);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/admin/print-requisitions', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM logistics_print_requisitions ORDER BY id DESC');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/admin/print-requisitions', async (req, res) => {
  try {
    const { nursing_station, item_description, quantity } = req.body;
    const { rows } = await db.query(`
      INSERT INTO logistics_print_requisitions (nursing_station, item_description, quantity, requested_date, status)
      VALUES (?, ?, ?, ?, 'Approved')
      RETURNING *
    `, [nursing_station, item_description, quantity, new Date().toISOString().split('T')[0]]);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/admin/cfo-report', async (req, res) => {
  try {
    const { rows: pettyCash } = await db.query('SELECT SUM(amount) as total_cash FROM logistics_petty_cash');
    const { rows: trips } = await db.query('SELECT COUNT(*) as total_trips, SUM(fuel_consumed) as total_fuel FROM logistics_vehicle_trips');
    const { rows: incidents } = await db.query('SELECT COUNT(*) as total_incidents FROM incident_reports');
    
    res.json({
      success: true,
      data: {
        reportMonth: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
        pettyCashTotal: pettyCash[0]?.total_cash || 0,
        totalTrips: trips[0]?.total_trips || 0,
        totalFuelLiters: trips[0]?.total_fuel || 0,
        totalIncidents: incidents[0]?.total_incidents || 0
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
