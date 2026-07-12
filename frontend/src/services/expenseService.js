import api from './api';

const expenseService = {
  getAll: (filters = {}) => api.get('/expenses', { params: filters }),
  create: (data) => api.post('/expenses', data)
};

export default expenseService;
