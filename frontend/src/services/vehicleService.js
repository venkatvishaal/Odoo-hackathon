import api from './api';

const vehicleService = {
  getAll: (filters = {}) => api.get('/vehicles', { params: filters }),
  getById: (id) => api.get(`/vehicles/${id}`),
  create: (data) => api.post('/vehicles', data),
  update: (id, data) => api.put(`/vehicles/${id}`, data),
  delete: (id) => api.delete(`/vehicles/${id}`),
  getEligibleForDispatch: () => api.get('/vehicles/eligible-for-dispatch')
};

export default vehicleService;
