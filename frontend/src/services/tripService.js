import api from './api';

const tripService = {
  getAll: (filters = {}) => api.get('/trips', { params: filters }),
  create: (data) => api.post('/trips', data),
  dispatch: (id) => api.post(`/trips/${id}/dispatch`),
  complete: (id, data) => api.post(`/trips/${id}/complete`, data),
  cancel: (id) => api.post(`/trips/${id}/cancel`)
};

export default tripService;
