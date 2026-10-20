import React, { useState } from 'react';
import Modal from './Modal';

// Replaces window.confirm for destructive actions.
export default function ConfirmDialog({ isOpen, onClose, onConfirm, title, body, confirmLabel = 'Confirm' }) {
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <p className="text-sm text-muted">{body}</p>
      <div className="mt-6 flex justify-end gap-2">
        <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>Keep</button>
        <button type="button" className="btn bg-danger text-white hover:bg-danger/90" onClick={handleConfirm} disabled={busy}>
          {busy ? 'Working…' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
