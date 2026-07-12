import api from './api';

const analyticsService = {
  getDashboard: () => api.get('/reports/dashboard'),
  exportCSV: () => {
    return `${api.defaults.baseURL}/reports/export`;
  }
};

export default analyticsService;
