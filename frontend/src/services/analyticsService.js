import api from './api';

const analyticsService = {
  getDashboard: () => api.get('/reports/dashboard'),
  exportCSV: () => api.get('/reports/export', { responseType: 'blob' })
};

export default analyticsService;
