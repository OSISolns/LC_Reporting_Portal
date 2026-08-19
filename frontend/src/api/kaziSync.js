import api from './axios';

/**
 * Fetches Company Roster from KaziSync API Gateway via backend proxy.
 */
export const fetchRoster = (startDate, endDate) => {
  return api.get('/roster/kazi/roster', {
    params: {
      start_date: startDate,
      end_date: endDate,
    },
  });
};

/**
 * Fetches Attendance Records from KaziSync API Gateway via backend proxy.
 */
export const fetchAttendance = (startDate, endDate, page = 1, perPage = 50) => {
  return api.get('/roster/kazi/attendance', {
    params: {
      start_date: startDate,
      end_date: endDate,
      page,
      per_page: perPage,
    },
  });
};

/**
 * Fetches Staff / Employees list from KaziSync DB via backend proxy.
 */
export const fetchKaziStaff = () => {
  return api.get('/roster/kazi/staff');
};


/**
 * Downloads Attendance Summary PDF from KaziSync API Gateway.
 */
export const downloadPdfReport = async (startDate, endDate) => {
  const response = await api.get('/roster/kazi/reports/pdf', {
    params: {
      start_date: startDate,
      end_date: endDate,
    },
    responseType: 'blob',
  });

  const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `KaziSync_Attendance_Summary_${startDate}_to_${endDate}.pdf`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

/**
 * Downloads Attendance Summary Excel from KaziSync API Gateway.
 */
export const downloadExcelReport = async (startDate, endDate) => {
  const response = await api.get('/roster/kazi/reports/excel', {
    params: {
      start_date: startDate,
      end_date: endDate,
    },
    responseType: 'blob',
  });

  const url = window.URL.createObjectURL(
    new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  );
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `KaziSync_Attendance_Summary_${startDate}_to_${endDate}.xlsx`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

