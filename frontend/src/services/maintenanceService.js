import api from './api';

const maintenanceService = {
  getAll: (filters = {}) => api.get('/maintenance', { params: filters }),
  create: (data) => api.post('/maintenance', data),
  close: (id, data) => api.put(`/maintenance/${id}/close`, data)
};

export default maintenanceService;
