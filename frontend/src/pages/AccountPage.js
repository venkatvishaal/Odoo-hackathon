import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import authService from '../services/authService';
import { logoutSuccess } from '../redux/slices/authSlice';
import PageHeader from '../components/ui/PageHeader';
import Modal from '../components/ui/Modal';

const formatRole = (role) => String(role || '').replace(/_/g, ' ');

export default function AccountPage() {
  const user = useSelector((state) => state.auth.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const close = () => { setOpen(false); setPassword(''); setError(''); };

  const handleDelete = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await authService.deleteAccount(password);
      dispatch(logoutSuccess());
      toast.success(res.data.message);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not delete the account. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader eyebrow="Settings" title="Your account" description="Profile details and account controls." />

      <section className="panel p-6">
        <dl className="grid gap-4 sm:grid-cols-3">
          <div><dt className="label">Name</dt><dd className="text-ink">{user?.name}</dd></div>
          <div><dt className="label">Email</dt><dd className="break-all text-ink">{user?.email}</dd></div>
          <div><dt className="label">Role</dt><dd className="capitalize text-ink">{formatRole(user?.role)}</dd></div>
        </dl>
      </section>

      <section className="panel mt-6 border-danger/30 p-6">
        <h2 className="text-base font-semibold text-ink">Delete account</h2>
        <p className="mt-1 max-w-prose text-sm text-muted">
          Permanently removes your login. Fleet records you created (trips, logs, vehicles) stay with your organisation. This can't be undone.
        </p>
        <button type="button" className="btn mt-4 bg-danger text-white hover:bg-danger/90" onClick={() => setOpen(true)}>
          Delete my account
        </button>
      </section>

      <Modal isOpen={open} onClose={close} title="Delete your account?" description="Enter your password to confirm.">
        <form onSubmit={handleDelete} className="space-y-4">
          <div>
            <label htmlFor="delete-password" className="label">Password</label>
            <input
              id="delete-password"
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              required
              autoComplete="current-password"
              aria-invalid={!!error || undefined}
              aria-describedby={error ? 'delete-error' : undefined}
              className={`field ${error ? 'field-error' : ''}`}
            />
            {error && <p id="delete-error" role="alert" className="error-text">{error}</p>}
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-ghost" onClick={close} disabled={busy}>Keep account</button>
            <button type="submit" className="btn bg-danger text-white hover:bg-danger/90" disabled={busy || !password}>
              {busy ? 'Deleting…' : 'Delete permanently'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
