import React from 'react';
import { BsExclamationTriangleFill } from 'react-icons/bs';

export default function PayloadGauge({ value, max }) {
  const percentage = max > 0 ? Math.round((value / max) * 100) : 0;
  const isOverloaded = value > max;

  return (
    <div className="mt-2">
      <div className="flex justify-between font-mono text-[11px] uppercase tracking-[0.06em] text-muted">
        <span>Load {value} / {max} kg</span>
        <span className={isOverloaded ? 'font-semibold text-danger' : 'text-ink'}>{percentage}%</span>
      </div>
      <div
        className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-line"
        role="meter"
        aria-label="Payload"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
      >
        <div
          className={`h-full transition-[width] duration-300 ${isOverloaded ? 'bg-danger' : 'bg-ink'}`}
          style={{ width: `${Math.min(100, percentage)}%` }}
        />
      </div>
      {isOverloaded && (
        <p className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-danger">
          <BsExclamationTriangleFill aria-hidden="true" /> Exceeds vehicle load capacity
        </p>
      )}
    </div>
  );
}
