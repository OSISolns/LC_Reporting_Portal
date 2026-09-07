-- =============================================================
-- LOGISTICS PORTAL TABLES MIGRATION
-- =============================================================

CREATE TABLE IF NOT EXISTS logistics_vehicles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plate_number TEXT UNIQUE NOT NULL,
  model TEXT,
  vehicle_type TEXT DEFAULT 'Ambulance',
  insurance_exp TEXT,
  control_exp TEXT,
  rema_exp TEXT,
  current_odometer INTEGER DEFAULT 0,
  status TEXT DEFAULT 'Available',
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS logistics_vehicle_trips (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vehicle_id INTEGER,
  driver_name TEXT,
  referring_physician TEXT,
  destination TEXT,
  patient_name TEXT,
  start_km INTEGER,
  end_km INTEGER,
  fuel_consumed REAL DEFAULT 0,
  start_time TEXT,
  end_time TEXT,
  auth_by TEXT,
  status TEXT DEFAULT 'Completed',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS logistics_vehicle_checklists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vehicle_id INTEGER,
  driver_name TEXT,
  check_date TEXT,
  engine_oil INTEGER DEFAULT 1,
  tyres INTEGER DEFAULT 1,
  brakes INTEGER DEFAULT 1,
  lights INTEGER DEFAULT 1,
  battery INTEGER DEFAULT 1,
  emergency_kit INTEGER DEFAULT 1,
  status TEXT DEFAULT 'Pass',
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS logistics_generator_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  check_date TEXT,
  battery_voltage REAL DEFAULT 24.0,
  output_voltage REAL DEFAULT 230.0,
  fuel_level_pct REAL DEFAULT 100.0,
  fuel_liters REAL DEFAULT 200.0,
  test_run_mins INTEGER DEFAULT 15,
  operator_name TEXT,
  status_flag TEXT DEFAULT 'OK',
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS logistics_clinic_tours (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tour_date TEXT,
  conducted_by TEXT,
  hvac_status TEXT DEFAULT 'OK',
  water_status TEXT DEFAULT 'OK',
  lighting_status TEXT DEFAULT 'OK',
  cold_room_status TEXT DEFAULT 'OK',
  waste_status TEXT DEFAULT 'OK',
  issues_json TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS logistics_assets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_tag TEXT UNIQUE NOT NULL,
  serial_number TEXT,
  name TEXT NOT NULL,
  category TEXT,
  department TEXT,
  custodian TEXT,
  purchase_date TEXT,
  warranty_exp TEXT,
  expected_lifespan_years INTEGER DEFAULT 5,
  purchase_cost REAL DEFAULT 0,
  status TEXT DEFAULT 'Active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS logistics_asset_transfers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_id INTEGER,
  from_dept TEXT,
  to_dept TEXT,
  initiated_by TEXT,
  approved_by TEXT,
  accepted_by TEXT,
  status TEXT DEFAULT 'Pending',
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS logistics_ppm_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_id INTEGER,
  maintenance_type TEXT,
  scheduled_date TEXT,
  completed_date TEXT,
  technician TEXT,
  findings TEXT,
  cost REAL DEFAULT 0,
  status TEXT DEFAULT 'Scheduled',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS logistics_stock_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_name TEXT NOT NULL,
  category TEXT,
  unit TEXT DEFAULT 'Pcs',
  quantity_on_hand INTEGER DEFAULT 0,
  min_threshold INTEGER DEFAULT 10,
  unit_cost REAL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS logistics_stock_releases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER,
  item_name TEXT,
  quantity INTEGER,
  target_location TEXT,
  requested_by TEXT,
  approved_by TEXT,
  release_date TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS logistics_petty_cash (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_date TEXT,
  category TEXT,
  description TEXT,
  amount REAL,
  receipt_number TEXT,
  logged_by TEXT,
  status TEXT DEFAULT 'Approved',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS logistics_sample_dispatches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_code TEXT,
  sampling_time TEXT,
  cold_chain_ok INTEGER DEFAULT 1,
  dhl_waybill TEXT,
  departure_time TEXT,
  dispatched_by TEXT,
  status TEXT DEFAULT 'Dispatched',
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS logistics_print_requisitions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nursing_station TEXT,
  item_description TEXT,
  quantity INTEGER,
  requested_date TEXT,
  status TEXT DEFAULT 'Pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS logistics_purchase_requisitions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT,
  requester TEXT,
  department TEXT,
  items_json TEXT,
  estimated_cost REAL,
  status TEXT DEFAULT 'Pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
