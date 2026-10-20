import React from 'react';
import { BsExclamationOctagon } from 'react-icons/bs';

export default function ErrorBanner({ message, onRetry }) {
  if (!message) return null;
  return (
    <div role="alert" className="mb-6 flex items-center gap-3 rounded-panel border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
      <BsExclamationOctagon aria-hidden="true" className="shrink-0" />
      <span className="flex-1">{typeof message === 'string' ? message : 'Something went wrong.'}</span>
      {onRetry && <button type="button" className="btn btn-sm btn-danger" onClick={onRetry}>Retry</button>}
    </div>
  );
}
