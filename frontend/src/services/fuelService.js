import api from './api';

const fuelService = {
  getAll: (filters = {}) => api.get('/fuel-logs', { params: filters }),
  create: (data) => api.post('/fuel-logs', data)
};

export default fuelService;
