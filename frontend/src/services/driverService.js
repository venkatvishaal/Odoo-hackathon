import api from './api';

const driverService = {
  getAll: (filters = {}) => api.get('/drivers', { params: filters }),
  getById: (id) => api.get(`/drivers/${id}`),
  create: (data) => api.post('/drivers', data),
  update: (id, data) => api.put(`/drivers/${id}`, data),
  delete: (id) => api.delete(`/drivers/${id}`),
  getEligibleForDispatch: () => api.get('/drivers/eligible-for-dispatch')
};

export default driverService;
