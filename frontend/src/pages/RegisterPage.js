import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import authService from '../services/authService';
import AuthLayout, { SubmitPill } from '../components/auth/AuthLayout';

const ROLES = [
  ['fleet_manager', 'Fleet manager'],
  ['driver', 'Driver'],
  ['safety_officer', 'Safety officer'],
  ['financial_analyst', 'Financial analyst'],
];

export default function RegisterPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    role: 'fleet_manager'
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const { confirmPassword, ...dataToSend } = form;
      await authService.register(dataToSend);
      toast.success('Account created! Please sign in.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  // View state for the fleet-bay scene; one truck part docks per filled field.
  const filled = [form.name, form.email, form.phone, form.password, form.confirmPassword].filter(Boolean).length;
  const mismatch = form.confirmPassword !== '' && form.confirmPassword !== form.password;
  const ready = form.password.length >= 6 && form.password === form.confirmPassword && !!form.name && !!form.email;
  const readout = loading
    ? { tone: 'busy', text: 'Registering · rolling off the bay' }
    : ready
      ? { tone: 'ready', text: 'Fleet-ready · submit to register' }
      : { tone: filled ? 'typing' : 'idle', text: `Bay 02 · ${filled}/5 parts fitted` };

  return (
    <AuthLayout
      checkpoint="02"
      title="Join the fleet."
      lead="Pick your role and fill in your details. Your truck assembles as you go."
      scene={{ variant: 'stack', status: loading ? 'busy' : 'idle', filled, role: form.role, ready }}
      readout={{ ...readout, meta: 'Role-based access' }}
      footer={<>Already on the board? <Link to="/login" className="font-semibold text-ink underline decoration-signal decoration-2 underline-offset-4 hover:decoration-ink">Sign in</Link></>}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <fieldset>
          <legend className="label">Role</legend>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {ROLES.map(([value, label]) => (
              <label key={value} className="cursor-pointer">
                <input type="radio" name="role" value={value} checked={form.role === value} onChange={handleChange} className="peer sr-only" />
                <span className="block rounded-full border border-ink/15 px-3.5 py-2 text-[13px] font-semibold text-ink/70 transition-colors hover:border-ink peer-checked:border-ink peer-checked:bg-ink peer-checked:text-paper peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-signal">
                  {label}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="reg-name" className="label">Full name</label>
          <input id="reg-name" type="text" name="name" value={form.name} onChange={handleChange} required autoComplete="name" placeholder="John Doe" className="field py-3" />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="reg-email" className="label">Email address</label>
            <input id="reg-email" type="email" name="email" value={form.email} onChange={handleChange} required autoComplete="email" placeholder="john@transitops.com" className="field py-3" />
          </div>
          <div>
            <label htmlFor="reg-phone" className="label">Phone <span className="normal-case tracking-normal text-muted/70">(optional)</span></label>
            <input id="reg-phone" type="tel" name="phone" value={form.phone} onChange={handleChange} autoComplete="tel" placeholder="9876543210" className="field py-3" />
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="reg-password" className="label">Password</label>
            <input id="reg-password" type="password" name="password" value={form.password} onChange={handleChange} required autoComplete="new-password" placeholder="Min 6 characters" className="field py-3" />
          </div>
          <div>
            <label htmlFor="reg-confirm" className="label">Confirm password</label>
            <input
              id="reg-confirm"
              type="password"
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              required
              autoComplete="new-password"
              placeholder="Repeat password"
              aria-invalid={mismatch || undefined}
              aria-describedby={mismatch ? 'reg-confirm-error' : undefined}
              className={`field py-3 ${mismatch ? 'field-error' : ''}`}
            />
            {mismatch && <p id="reg-confirm-error" className="error-text">Passwords don’t match yet.</p>}
          </div>
        </div>

        <div className="pt-3">
          <SubmitPill loading={loading} busyLabel="Creating account…">Create account</SubmitPill>
        </div>
      </form>
    </AuthLayout>
  );
}
