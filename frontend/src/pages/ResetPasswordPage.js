import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import authService from '../services/authService';
import AuthLayout, { SubmitPill } from '../components/auth/AuthLayout';
import { passwordProblem } from './RegisterPage';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const navigate = useNavigate();
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const problem = passwordProblem(form.password) || (form.password !== form.confirm && 'Passwords do not match.');
    if (problem) { setError(problem); return; }
    setLoading(true);
    try {
      const res = await authService.resetPassword(token, form.password);
      toast.success(res.data.message);
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not reset the password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const update = (e) => { setError(''); setForm({ ...form, [e.target.name]: e.target.value }); };

  return (
    <AuthLayout
      checkpoint="01"
      title="Choose a new password."
      lead="Signing in with the new password will end your sessions on every other device."
      scene={{ variant: 'gate', status: loading ? 'busy' : error ? 'error' : form.password ? 'typing' : 'idle' }}
      readout={{ tone: error ? 'error' : loading ? 'busy' : 'idle', text: 'Gate 01 · New credentials', meta: 'Single-use link' }}
      footer={<>Link expired? <Link to="/forgot-password" className="font-semibold text-ink underline decoration-signal decoration-2 underline-offset-4 hover:decoration-ink">Request a new one</Link></>}
    >
      {!token ? (
        <p role="alert" className="error-text text-[15px]">This page needs the link from your reset email. Request a new one below.</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div>
            <label htmlFor="reset-password" className="label">New password</label>
            <input id="reset-password" type="password" name="password" value={form.password} onChange={update} required minLength={8} autoComplete="new-password" placeholder="8+ characters, a letter and a number" aria-describedby={error ? 'reset-error' : undefined} className={`field py-3 ${error ? 'field-error' : ''}`} />
          </div>
          <div>
            <label htmlFor="reset-confirm" className="label">Confirm new password</label>
            <input id="reset-confirm" type="password" name="confirm" value={form.confirm} onChange={update} required autoComplete="new-password" className={`field py-3 ${error ? 'field-error' : ''}`} />
            {error && <p id="reset-error" role="alert" className="error-text">{error}</p>}
          </div>
          <div className="pt-3">
            <SubmitPill loading={loading} busyLabel="Saving…">Set new password</SubmitPill>
          </div>
        </form>
      )}
    </AuthLayout>
  );
}
