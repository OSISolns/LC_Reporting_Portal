import api from './axios';

// ── 1. Dashboard Stats ──────────────────────────────────────────
export const getLogisticsDashboardStats = () => api.get('/logistics/dashboard-stats');

// ── 2. Fleet Operations ─────────────────────────────────────────
// Vehicles
export const getVehicles = () => api.get('/logistics/fleet/vehicles');
export const createVehicle = (data) => api.post('/logistics/fleet/vehicles', data);
export const updateVehicle = (id, data) => api.put(`/logistics/fleet/vehicles/${id}`, data);
export const deleteVehicle = (id) => api.delete(`/logistics/fleet/vehicles/${id}`);

// Trips
export const getTrips = () => api.get('/logistics/fleet/trips');
export const createTrip = (data) => api.post('/logistics/fleet/trips', data);
export const updateTrip = (id, data) => api.put(`/logistics/fleet/trips/${id}`, data);

// Checklists
export const getChecklists = () => api.get('/logistics/fleet/checklists');
export const createChecklist = (data) => api.post('/logistics/fleet/checklists', data);

// Drivers
export const getDrivers = () => api.get('/logistics/fleet/drivers');
export const createDriver = (data) => api.post('/logistics/fleet/drivers', data);
export const updateDriver = (id, data) => api.put(`/logistics/fleet/drivers/${id}`, data);
export const deleteDriver = (id) => api.delete(`/logistics/fleet/drivers/${id}`);

// ── 3. Facilities & Power ───────────────────────────────────────
// Generator Logs
export const getGeneratorLogs = () => api.get('/logistics/facilities/generator');
export const createGeneratorLog = (data) => api.post('/logistics/facilities/generator', data);

// Clinic Inspection Tours
export const getClinicTours = () => api.get('/logistics/facilities/tours');
export const createClinicTour = (data) => api.post('/logistics/facilities/tours', data);

// ── 4. Assets & PPM Lifecycle ───────────────────────────────────
// Assets Registry
export const getAssets = () => api.get('/logistics/assets');
export const createAsset = (data) => api.post('/logistics/assets', data);
export const updateAsset = (id, data) => api.put(`/logistics/assets/${id}`, data);
export const deleteAsset = (id) => api.delete(`/logistics/assets/${id}`);

// Asset Transfers
export const getAssetTransfers = () => api.get('/logistics/assets/transfers');
export const createAssetTransfer = (data) => api.post('/logistics/assets/transfers', data);
export const updateAssetTransfer = (id, data) => api.patch(`/logistics/assets/transfers/${id}`, data);

// Planned Preventive Maintenance (PPM)
export const getPpmRecords = () => api.get('/logistics/assets/ppm');
export const createPpmRecord = (data) => api.post('/logistics/assets/ppm', data);
export const updatePpmRecord = (id, data) => api.put(`/logistics/assets/ppm/${id}`, data);

// ── 5. Maintenance Stock & Consumables ──────────────────────────
// Inventory Items
export const getStockItems = () => api.get('/logistics/inventory/items');
export const createStockItem = (data) => api.post('/logistics/inventory/items', data);
export const updateStockItem = (id, data) => api.put(`/logistics/inventory/items/${id}`, data);
export const deleteStockItem = (id) => api.delete(`/logistics/inventory/items/${id}`);

// Stock Releases
export const getStockReleases = () => api.get('/logistics/inventory/releases');
export const createStockRelease = (data) => api.post('/logistics/inventory/releases', data);

// ── 6. Logistics Administration & Operations ────────────────────
// Petty Cash
export const getPettyCash = () => api.get('/logistics/admin/petty-cash');
export const createPettyCash = (data) => api.post('/logistics/admin/petty-cash', data);
export const updatePettyCash = (id, data) => api.put(`/logistics/admin/petty-cash/${id}`, data);

// Sample Dispatches (DHL / Cold Chain)
export const getSampleDispatches = () => api.get('/logistics/admin/sample-dispatches');
export const createSampleDispatch = (data) => api.post('/logistics/admin/sample-dispatches', data);
export const updateSampleDispatch = (id, data) => api.put(`/logistics/admin/sample-dispatches/${id}`, data);

// Print Requisitions
export const getPrintRequisitions = () => api.get('/logistics/admin/print-requisitions');
export const createPrintRequisition = (data) => api.post('/logistics/admin/print-requisitions', data);
export const updatePrintRequisition = (id, data) => api.put(`/logistics/admin/print-requisitions/${id}`, data);

// CFO Report
export const getCfoReport = () => api.get('/logistics/admin/cfo-report');
