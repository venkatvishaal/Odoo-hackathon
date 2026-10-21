import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import authService from '../services/authService';
import AuthLayout from '../components/auth/AuthLayout';

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [state, setState] = useState({ status: token ? 'busy' : 'error', message: token ? 'Confirming your email…' : 'This page needs the link from your verification email.' });
  const sent = useRef(false); // StrictMode runs effects twice in dev

  useEffect(() => {
    if (!token || sent.current) return;
    sent.current = true;
    authService.verifyEmail(token)
      .then((res) => setState({ status: 'ready', message: res.data.message }))
      .catch((err) => setState({ status: 'error', message: err.response?.data?.message || 'Verification failed. Please try again.' }));
  }, [token]);

  return (
    <AuthLayout
      checkpoint="00"
      title="Email verification"
      lead="One last check before you get on the board."
      scene={{ variant: 'gate', status: state.status === 'ready' ? 'idle' : state.status }}
      readout={{ tone: state.status, text: state.status === 'ready' ? 'Verified · gate open' : state.status === 'busy' ? 'Checking link' : 'Link rejected', meta: 'Email check' }}
      footer={<>Need a fresh link? Try signing in. You'll be offered one there.</>}
    >
      <p role="status" className={`text-[16px] ${state.status === 'error' ? 'error-text' : 'text-ink'}`}>{state.message}</p>
      {state.status !== 'busy' && <Link to="/login" className="btn btn-primary mt-6">Go to sign in</Link>}
    </AuthLayout>
  );
}
