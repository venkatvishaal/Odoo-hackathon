import React from 'react';

export default function EmptyState({ icon: Icon, title, body, action }) {
  return (
    <div className="panel flex flex-col items-center px-6 py-14 text-center">
      {Icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-line text-muted">
          <Icon className="text-xl" aria-hidden="true" />
        </div>
      )}
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      {body && <p className="mt-1 max-w-sm text-sm text-muted">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
