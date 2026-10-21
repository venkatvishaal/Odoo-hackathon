import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import authService from '../services/authService';
import { loginSuccess } from '../redux/slices/authSlice';
import AuthLayout, { SubmitPill } from '../components/auth/AuthLayout';

const READOUT = {
  idle: 'Gate 01 · Awaiting credentials',
  typing: 'Gate 01 · Credentials entered',
  busy: 'Verifying · barrier lifting',
  error: 'Access denied · check credentials',
};

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [unverified, setUnverified] = useState(false);
  const [resending, setResending] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFailed(false);
    setUnverified(false);
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
      setFailed(true);
      setUnverified(err.response?.data?.code === 'EMAIL_UNVERIFIED');
      toast.error(err.response?.data?.message || 'Login failed. Check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const resendVerification = async () => {
    setResending(true);
    try {
      const res = await authService.resendVerification(form.email);
      toast.success(res.data.message);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not resend the email.');
    } finally {
      setResending(false);
    }
  };

  const status = loading ? 'busy' : failed ? 'error' : form.email || form.password ? 'typing' : 'idle';

  return (
    <AuthLayout
      checkpoint="01"
      title="Back on the board."
      lead="Sign in to dispatch, track and settle trips."
      scene={{ variant: 'gate', status }}
      readout={{ tone: status, text: READOUT[status], meta: 'JWT session' }}
      footer={<>New to TransitOps? <Link to="/register" className="font-semibold text-ink underline decoration-signal decoration-2 underline-offset-4 hover:decoration-ink">Create an account</Link></>}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="login-email" className="label">Email address</label>
          <input
            id="login-email"
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            required
            autoComplete="email"
            placeholder="manager@transitops.com"
            className={`field py-3 ${failed ? 'field-error' : ''}`}
          />
        </div>

        <div>
          <div className="flex items-baseline justify-between">
            <label htmlFor="login-password" className="label">Password</label>
            <Link to="/forgot-password" className="text-[13px] font-medium text-ink/65 underline-offset-4 hover:text-ink hover:underline">Forgot password?</Link>
          </div>
          <input
            id="login-password"
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            required
            autoComplete="current-password"
            placeholder="••••••••"
            className={`field py-3 ${failed ? 'field-error' : ''}`}
          />
        </div>

        {unverified && (
          <div role="alert" className="rounded-panel border border-signal/40 bg-signal/10 px-4 py-3 text-[14px] text-ink">
            Your email isn't verified yet.{' '}
            <button type="button" onClick={resendVerification} disabled={resending} className="font-semibold underline underline-offset-4 disabled:opacity-60">
              {resending ? 'Sending…' : 'Resend verification email'}
            </button>
          </div>
        )}

        <div className="pt-3">
          <SubmitPill loading={loading} busyLabel="Signing in…">Sign in</SubmitPill>
        </div>
      </form>
    </AuthLayout>
  );
}
