import api from './api';

const authService = {
  register: (data) => api.post('/auth/register', data),
  login: (credentials) => api.post('/auth/login', credentials),
  verify: () => api.get('/auth/verify'),
  logout: () => api.post('/auth/logout'),
  verifyEmail: (token) => api.post('/auth/verify-email', { token }),
  resendVerification: (email) => api.post('/auth/resend-verification', { email }),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.post('/auth/reset-password', { token, password }),
  deleteAccount: (password) => api.delete('/auth/me', { data: { password } })
};

export default authService;
