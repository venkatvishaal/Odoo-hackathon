import React from 'react';
import { RollingNumber } from './RollingNumber';

// One cell of a KPI strip. Numeric values roll when live data changes.
export default function KpiCard({ title, value, suffix, hint, tone }) {
  return (
    <div className="px-5 py-4">
      <p className="eyebrow flex items-center gap-2">
        {tone && <span className={`h-2 w-2 rounded-full ${tone}`} aria-hidden="true" />}
        {title}
      </p>
      <p className="num mt-2 text-[28px] font-semibold leading-none text-ink">
        {typeof value === 'number' ? <RollingNumber value={value} /> : value}
        {suffix && <span className="ml-1 text-base font-normal text-muted">{suffix}</span>}
      </p>
      {hint && <p className="mt-2 text-xs text-muted">{hint}</p>}
    </div>
  );
}
