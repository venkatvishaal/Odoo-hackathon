import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import authService from '../services/authService';
import AuthLayout, { SubmitPill } from '../components/auth/AuthLayout';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sentMessage, setSentMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authService.forgotPassword(email);
      setSentMessage(res.data.message);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not send the reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      checkpoint="01"
      title="Forgot your password?"
      lead="Enter your account email and we'll send you a link to choose a new one."
      scene={{ variant: 'gate', status: loading ? 'busy' : email ? 'typing' : 'idle' }}
      readout={{ tone: sentMessage ? 'ready' : loading ? 'busy' : 'idle', text: sentMessage ? 'Reset link dispatched' : 'Gate 01 · Password recovery', meta: 'Link valid 30 min' }}
      footer={<>Remembered it? <Link to="/login" className="font-semibold text-ink underline decoration-signal decoration-2 underline-offset-4 hover:decoration-ink">Back to sign in</Link></>}
    >
      {sentMessage ? (
        <p role="status" className="rounded-panel border border-ok/30 bg-ok/5 px-4 py-3 text-[15px] text-ink">{sentMessage} Check your inbox and spam folder.</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="forgot-email" className="label">Email address</label>
            <input id="forgot-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" className="field py-3" />
          </div>
          <div className="pt-3">
            <SubmitPill loading={loading} busyLabel="Sending…">Send reset link</SubmitPill>
          </div>
        </form>
      )}
    </AuthLayout>
  );
}
