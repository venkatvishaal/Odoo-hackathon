import React, { useEffect, useRef, useState } from 'react';
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react';
import { BsCheckLg } from 'react-icons/bs';
import PayloadGauge from '../ui/PayloadGauge';
import StatusBadge from '../ui/StatusBadge';

// Illustrative only: a static trip that walks through the same gates TripPlanner enforces.
const GATES = [
  'Vehicle not In Shop or Retired',
  'Driver licence valid, not Suspended',
  'Neither asset already On Trip',
  'Cargo 3,200 kg ≤ 5,000 kg capacity',
];

export const ROUTE_PATH = 'M24 132 C 90 132, 96 52, 170 60 S 250 120, 316 40';

const STOP = 0.62; // where the truck sits along the route

export function RouteLine({ className = '', live = true }) {
  const reduceMotion = useReducedMotion();
  const pathRef = useRef(null);
  const progress = useMotionValue(0);
  const pointAt = (p) => {
    const el = pathRef.current;
    return el ? el.getPointAtLength(el.getTotalLength() * p) : { x: 24, y: 132 };
  };
  const x = useTransform(progress, (p) => pointAt(p).x);
  const y = useTransform(progress, (p) => pointAt(p).y);

  useEffect(() => {
    if (!live) return undefined;
    if (reduceMotion) { progress.jump(STOP); return undefined; }
    const controls = animate(progress, STOP, { duration: 2.4, ease: 'easeInOut', delay: 0.6 });
    return () => controls.stop();
  }, [live, reduceMotion, progress]);
  return (
    <svg viewBox="0 0 340 170" className={className} aria-hidden="true">
      <defs>
        <pattern id="board-grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M20 0H0V20" fill="none" stroke="rgb(var(--paper) / 0.07)" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="340" height="170" fill="url(#board-grid)" />
      <path ref={pathRef} d={ROUTE_PATH} fill="none" stroke="rgb(var(--paper) / 0.18)" strokeWidth="6" strokeLinecap="round" />
      <motion.path
        d={ROUTE_PATH}
        fill="none"
        stroke="rgb(var(--signal))"
        strokeWidth="2.5"
        strokeLinecap="round"
        initial={reduceMotion ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 2.4, ease: 'easeInOut', delay: 0.6 }}
      />
      <circle cx="24" cy="132" r="5" fill="rgb(var(--paper))" />
      <circle cx="316" cy="40" r="5" fill="none" stroke="rgb(var(--paper))" strokeWidth="2" />
      {live && (
        <motion.g style={{ x, y }}>
          <circle r="12" fill="rgb(var(--signal) / 0.25)">
            {!reduceMotion && <animate attributeName="r" values="7;14;7" dur="2s" repeatCount="indefinite" />}
          </circle>
          <circle r="5" fill="rgb(var(--signal))" stroke="rgb(var(--ink))" strokeWidth="2" />
        </motion.g>
      )}
    </svg>
  );
}

export default function HeroBoard({ compact = false }) {
  const reduceMotion = useReducedMotion();
  const [dispatched, setDispatched] = useState(!!reduceMotion);

  useEffect(() => {
    if (reduceMotion) return undefined;
    const t = setTimeout(() => setDispatched(true), 2000);
    return () => clearTimeout(t);
  }, [reduceMotion]);

  return (
    <div className="relative">
      {/* Offset "paper stack" gives depth without shadows-on-shadows. */}
      <div aria-hidden="true" className="absolute inset-0 translate-x-3 translate-y-3 rounded-panel border border-line bg-surface/60" />
      <figure className="panel relative overflow-hidden shadow-[0_24px_60px_-28px_rgb(var(--ink)/0.35)]" aria-label="Example trip moving through dispatch gates">
        <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
          <span className="eyebrow">Trip waybill · example</span>
          <motion.span key={dispatched ? 'd' : 'n'} initial={reduceMotion ? false : { opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>
            <StatusBadge status={dispatched ? 'Dispatched' : 'Draft'} />
          </motion.span>
        </div>

        <dl className="grid grid-cols-2 border-b border-line text-[13px] sm:grid-cols-3">
          {[
            ['Vehicle', 'TRK-07 · 5 t'],
            ['Driver', 'Licence HMV'],
            ['Route', 'Depot → Hub 3'],
          ].map(([k, v], i) => (
            <div key={k} className={`px-4 py-3 ${i ? 'border-l border-line' : ''} ${i === 2 ? 'col-span-2 border-l-0 border-t sm:col-span-1 sm:border-l sm:border-t-0' : ''}`}>
              <dt className="eyebrow text-[10px]">{k}</dt>
              <dd className="num mt-0.5 font-medium">{v}</dd>
            </div>
          ))}
        </dl>

        <div className={compact ? '' : 'grid sm:grid-cols-[1fr_1.1fr]'}>
          <div className="px-4 py-4">
            <p className="eyebrow mb-2.5 text-[10px]">Dispatch gates</p>
            <ul className="space-y-2">
              {GATES.map((g, i) => (
                <motion.li
                  key={g}
                  className="flex items-start gap-2.5 text-[13px]"
                  initial={reduceMotion ? false : { opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.3, duration: 0.35 }}
                >
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm bg-ok text-surface">
                    <BsCheckLg aria-hidden="true" className="text-[11px]" />
                  </span>
                  {g}
                </motion.li>
              ))}
            </ul>
            <div className="mt-4">
              <PayloadGauge value={3200} max={5000} />
            </div>
          </div>
          {!compact && <div className="relative bg-ink">
            <RouteLine className="h-full min-h-[170px] w-full" live={dispatched} />
            <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-[0.08em]">
              <span className="flex items-center gap-1.5 text-paper/80">
                <span className={`h-1.5 w-1.5 rounded-full ${dispatched ? 'bg-signal' : 'bg-paper/30'}`} />
                {dispatched ? 'Live GPS' : 'Awaiting dispatch'}
              </span>
              <span className="rounded-sm bg-signal px-1.5 py-0.5 font-semibold text-ink">1,800 kg spare · shared</span>
            </div>
          </div>}
        </div>
      </figure>
    </div>
  );
}
