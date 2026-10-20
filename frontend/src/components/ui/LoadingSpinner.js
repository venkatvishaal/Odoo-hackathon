import React from 'react';

// Skeleton rows instead of a spinner so the page keeps its shape while data loads.
export default function LoadingSpinner({ rows = 4, label = 'Loading' }) {
  return (
    <div role="status" aria-label={label} className="panel divide-y divide-line">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-4">
          <div className="skeleton h-4 w-24" />
          <div className="skeleton h-4 flex-1" />
          <div className="skeleton h-4 w-16" />
        </div>
      ))}
      <span className="sr-only">{label}…</span>
    </div>
  );
}
