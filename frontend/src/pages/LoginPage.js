import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import authService from '../services/authService';
import { loginSuccess } from '../redux/slices/authSlice';
import { BsTruck } from 'react-icons/bs';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(false);
    setLoading(true);
    try {
      const res = await authService.login(form);
      const userData = res.data.data;
      const token = res.data.token;

      if (!userData || !token) {
        toast.error('Unexpected response from server');
        return;
      }

      dispatch(loginSuccess({ user: userData, token }));
      toast.success(`Welcome back, ${userData.name}!`);
      navigate('/dashboard');
    } catch (err) {
      console.error('Login error:', err.response?.data);
      toast.error(err.response?.data?.message || 'Login failed. Check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="bg-white shadow rounded-lg p-8 w-full max-w-md border border-gray-100">
        <div className="flex justify-center mb-4 text-blue-600">
          <BsTruck className="text-5xl" />
        </div>
        <h2 className="text-2xl font-bold mb-1 text-center text-gray-800">TransitOps</h2>
        <p className="text-gray-500 text-sm text-center mb-6">Smart Fleet Operations Management Platform</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Email Address</label>
            <input
              type="email" 
              name="email" 
              value={form.email}
              onChange={handleChange} 
              required 
              placeholder="manager@transitops.com"
              className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
            <input
              type="password" 
              name="password" 
              value={form.password}
              onChange={handleChange} 
              required 
              placeholder="••••••••"
              className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
            />
          </div>

          <button
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold transition shadow-sm mt-6 text-sm"
          >
            {loading ? 'Logging in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Don't have an account?{' '}
          <Link to="/register" className="text-blue-600 hover:underline font-semibold">Register</Link>
        </p>
      </div>
    </div>
  );
}
