'use strict';

const axios = require('axios');

const _BASE_URL = process.env._BASE_URL || 'https://api.kazisync.com/api/v1';
const _CLIENT_ID = process.env._CLIENT_ID || '815eed3f-7b3a-4191-8526-43d041c4b5cd';
const _CLIENT_SECRET = process.env._CLIENT_SECRET || 'e_GQ9Tsix5duPczi_j5PmYFtgajlhgtHB6oFe3H_V5M';

// In-memory token cache
let cachedToken = null;
let tokenExpiresAt = 0;

/**
 * Authenticates with  API Gateway to fetch a fresh Bearer token.
 */
async function authenticate() {
  try {
    const response = await axios.post(`${_BASE_URL}/authenticate`, {
      client_id: _CLIENT_ID,
      client_secret: _CLIENT_SECRET
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 15000
    });

    // Token format may be in response.data.token, response.data.access_token, or response.data.data.token
    const token = response.data?.token || response.data?.access_token || response.data?.data?.token;

    if (!token) {
      console.error(' Auth Error: Token missing in response:', response.data);
      throw new Error(' authentication response did not contain a valid token.');
    }

    cachedToken = token;
    // Token is valid for 60 minutes. Set expiry to 55 minutes to be safe.
    tokenExpiresAt = Date.now() + (55 * 60 * 1000);
    console.log('✅  Authenticated successfully. Token cached.');
    return cachedToken;
  } catch (err) {
    console.error('❌  Authentication Failed:', err.response?.data || err.message);
    throw new Error(err.response?.data?.message || err.message || 'Failed to authenticate with  API.');
  }
}

/**
 * Retrieves a valid Bearer token, auto-renewing if missing or expired.
 */
async function getValidToken(forceRefresh = false) {
  if (forceRefresh || !cachedToken || Date.now() >= tokenExpiresAt) {
    return await authenticate();
  }
  return cachedToken;
}

/**
 * Helper to execute  requests with automatic 401 retry resilience.
 */
async function requestWithRetry(requestFn) {
  try {
    const token = await getValidToken();
    return await requestFn(token);
  } catch (err) {
    if (err.response && err.response.status === 401) {
      console.warn('⚠️  401 Unauthorized received. Triggering auto-reauthentication...');
      const newToken = await getValidToken(true);
      return await requestFn(newToken);
    }
    throw err;
  }
}

/**
 * Fetches Company Roster for specified date range.
 */
async function getCompanyRoster(startDate, endDate) {
  return requestWithRetry(async (token) => {
    const response = await axios.get(`${_BASE_URL}/roster`, {
      params: {
        start_date: startDate,
        end_date: endDate
      },
      headers: {
        'Authorization': `Bearer ${token}`
      },
      timeout: 20000
    });
    return response.data;
  });
}

/**
 * Fetches Attendance Records for specified date range and pagination.
 */
async function getAttendanceRecords(startDate, endDate, page = 1, perPage = 50) {
  return requestWithRetry(async (token) => {
    const response = await axios.get(`${_BASE_URL}/attendance_records`, {
      params: {
        start_date: startDate,
        end_date: endDate,
        page,
        per_page: perPage
      },
      headers: {
        'Authorization': `Bearer ${token}`
      },
      timeout: 20000
    });
    return response.data;
  });
}

/**
 * Downloads Attendance Summary PDF Report.
 */
async function downloadAttendancePdf(startDate, endDate) {
  return requestWithRetry(async (token) => {
    const response = await axios.get(`${_BASE_URL}/attendance/summary/pdf`, {
      params: {
        start_date: startDate,
        end_date: endDate
      },
      headers: {
        'Authorization': `Bearer ${token}`
      },
      responseType: 'arraybuffer',
      timeout: 30000
    });
    return response;
  });
}

/**
 * Downloads Attendance Summary Excel Report.
 */
async function downloadAttendanceExcel(startDate, endDate) {
  return requestWithRetry(async (token) => {
    const response = await axios.get(`${_BASE_URL}/attendance/summary/excel`, {
      params: {
        start_date: startDate,
        end_date: endDate
      },
      headers: {
        'Authorization': `Bearer ${token}`
      },
      responseType: 'arraybuffer',
      timeout: 30000
    });
    return response;
  });
}

/**
 * Fetches Employees / Staff list from KaziSync API Gateway or extracts active staff from Kazisync DB.
 */
async function getEmployees() {
  return requestWithRetry(async (token) => {
    try {
      const response = await axios.get(`${_BASE_URL}/employees`, {
        headers: { 'Authorization': `Bearer ${token}` },
        timeout: 15000
      });
      if (response.data) return response.data;
    } catch (err) {
      console.warn('⚠️ KaziSync /employees endpoint failed or not present, pulling staff via Kazisync attendance/roster records...');
    }

    // Fallback: Fetch active records from past 30 days to extract employee names from Kazisync DB
    const endDate = new Date().toISOString().split('T')[0];
    const startDateObj = new Date();
    startDateObj.setDate(startDateObj.getDate() - 30);
    const startDate = startDateObj.toISOString().split('T')[0];

    const staffSet = new Set();

    try {
      const attData = await getAttendanceRecords(startDate, endDate, 1, 100);
      const records = Array.isArray(attData)
        ? attData
        : (attData?.data || attData?.records || attData?.attendance || []);

      records.forEach(r => {
        const name = r.employee_name || r.staff_name || r.full_name || r.name || r.employee?.name;
        if (name && typeof name === 'string' && name.trim()) {
          staffSet.add(name.trim());
        }
      });
    } catch (attErr) {
      console.warn('⚠️ Failed to pull staff from attendance records:', attErr.message);
    }

    // Also pull staff from roster records using official schema (roster_by_employee & date-keyed roster map)
    try {
      const rosData = await getCompanyRoster(startDate, endDate);
      if (rosData?.roster_by_employee && typeof rosData.roster_by_employee === 'object') {
        Object.values(rosData.roster_by_employee).forEach(emp => {
          if (emp.employee_name && typeof emp.employee_name === 'string' && emp.employee_name.trim()) {
            staffSet.add(emp.employee_name.trim());
          }
        });
      }
      if (rosData?.roster && typeof rosData.roster === 'object') {
        Object.values(rosData.roster).forEach(dayAssignments => {
          if (Array.isArray(dayAssignments)) {
            dayAssignments.forEach(asgn => {
              if (asgn.employee_name && typeof asgn.employee_name === 'string' && asgn.employee_name.trim()) {
                staffSet.add(asgn.employee_name.trim());
              }
            });
          }
        });
      }
    } catch (rosErr) {
      console.warn('⚠️ Failed to pull staff from roster records:', rosErr.message);
    }


    return Array.from(staffSet).sort((a, b) => a.localeCompare(b));
  });
}

module.exports = {
  authenticate,
  getValidToken,
  getCompanyRoster,
  getAttendanceRecords,
  getEmployees,
  downloadAttendancePdf,
  downloadAttendanceExcel
};

