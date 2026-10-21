import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import authService from '../services/authService';
import AuthLayout, { SubmitPill } from '../components/auth/AuthLayout';

// Mirrors the backend rule in middleware/validation.js (newPassword). Returns a message or ''.
export const passwordProblem = (pw) =>
  pw.length < 8 ? 'Password must be at least 8 characters.'
    : !/[A-Za-z]/.test(pw) ? 'Password must contain a letter.'
      : !/[0-9]/.test(pw) ? 'Password must contain a number.'
        : '';

const ROLES = [
  ['fleet_manager', 'Fleet manager'],
  ['driver', 'Driver'],
  ['safety_officer', 'Safety officer'],
  ['financial_analyst', 'Financial analyst'],
];

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [doneMessage, setDoneMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [agreed, setAgreed] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    role: 'fleet_manager'
  });

  const handleChange = (e) => {
    setFieldErrors({ ...fieldErrors, [e.target.name]: undefined });
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    const pwProblem = passwordProblem(form.password);
    if (pwProblem) {
      setFieldErrors({ password: pwProblem });
      return;
    }
    if (form.phone && !/^[0-9]{10,15}$/.test(form.phone)) {
      setFieldErrors({ phone: 'Phone must be 10-15 digits, numbers only.' });
      return;
    }
    if (!agreed) {
      toast.error('Please accept the Terms and Privacy Policy to continue.');
      return;
    }

    setLoading(true);
    try {
      const { confirmPassword, ...dataToSend } = form;
      if (!dataToSend.phone) delete dataToSend.phone;
      const res = await authService.register(dataToSend);
      setDoneMessage(res.data.message);
    } catch (err) {
      const errors = err.response?.data?.errors;
      if (errors) setFieldErrors(Object.fromEntries(errors.map((x) => [x.field, x.message])));
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  // View state for the fleet-bay scene; one truck part docks per filled field.
  const filled = [form.name, form.email, form.phone, form.password, form.confirmPassword].filter(Boolean).length;
  const mismatch = form.confirmPassword !== '' && form.confirmPassword !== form.password;
  const ready = !passwordProblem(form.password) && form.password === form.confirmPassword && !!form.name && !!form.email;
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
      {doneMessage ? (
        <div role="status" className="rounded-panel border border-ok/30 bg-ok/5 px-4 py-4 text-[15px] text-ink">
          <p className="font-semibold">Check your inbox</p>
          <p className="mt-1 text-ink/75">{doneMessage}</p>
          <Link to="/login" className="btn btn-primary mt-4">Go to sign in</Link>
        </div>
      ) : (
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
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
            <input id="reg-email" type="email" name="email" value={form.email} onChange={handleChange} required autoComplete="email" placeholder="john@transitops.com" aria-invalid={!!fieldErrors.email || undefined} className={`field py-3 ${fieldErrors.email ? 'field-error' : ''}`} />
            {fieldErrors.email && <p className="error-text">{fieldErrors.email}</p>}
          </div>
          <div>
            <label htmlFor="reg-phone" className="label">Phone <span className="normal-case tracking-normal text-muted/70">(optional)</span></label>
            <input id="reg-phone" type="tel" name="phone" value={form.phone} onChange={handleChange} autoComplete="tel" inputMode="numeric" placeholder="9876543210" aria-invalid={!!fieldErrors.phone || undefined} className={`field py-3 ${fieldErrors.phone ? 'field-error' : ''}`} />
            {fieldErrors.phone && <p className="error-text">{fieldErrors.phone}</p>}
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="reg-password" className="label">Password</label>
            <input id="reg-password" type="password" name="password" value={form.password} onChange={handleChange} required minLength={8} autoComplete="new-password" placeholder="8+ chars, letter + number" aria-invalid={!!fieldErrors.password || undefined} aria-describedby="reg-password-hint" className={`field py-3 ${fieldErrors.password ? 'field-error' : ''}`} />
            <p id="reg-password-hint" className={fieldErrors.password ? 'error-text' : 'mt-1 text-[12px] text-muted'}>{fieldErrors.password || 'At least 8 characters with a letter and a number.'}</p>
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

        <label className="flex items-start gap-3 text-[14px] text-ink/75">
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} required className="mt-1 h-4 w-4 accent-ink" />
          <span>I agree to the <Link to="/terms" target="_blank" className="font-semibold text-ink underline underline-offset-4">Terms of Service</Link> and <Link to="/privacy" target="_blank" className="font-semibold text-ink underline underline-offset-4">Privacy Policy</Link>.</span>
        </label>

        <div className="pt-3">
          <SubmitPill loading={loading} busyLabel="Creating account…">Create account</SubmitPill>
        </div>
      </form>
      )}
    </AuthLayout>
  );
}
