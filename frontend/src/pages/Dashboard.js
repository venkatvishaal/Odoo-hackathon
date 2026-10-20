import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import io from 'socket.io-client';
import { BsArrowRight } from 'react-icons/bs';
import { fetchDashboard } from '../redux/slices/analyticsSlice';
import KpiCard from '../components/ui/KpiCard';
import PageHeader from '../components/ui/PageHeader';
import ErrorBanner from '../components/ui/ErrorBanner';
import { RollingNumber } from '../components/ui/RollingNumber';

const SOCKET_URL = process.env.REACT_APP_API_BASE_URL
  ? process.env.REACT_APP_API_BASE_URL.replace('/api', '')
  : 'http://localhost:5000';

const VEHICLE_STATES = [
  { key: 'Available', bar: 'bg-ok' },
  { key: 'On Trip', bar: 'bg-transit' },
  { key: 'In Shop', bar: 'bg-signal' },
  { key: 'Retired', bar: 'bg-muted/50' },
];

const DRIVER_STATES = [
  { key: 'Available', bar: 'bg-ok' },
  { key: 'On Trip', bar: 'bg-transit' },
  { key: 'Off Duty', bar: 'bg-muted/50' },
  { key: 'Suspended', bar: 'bg-danger' },
];

const QUICK_LINKS = {
  fleet_manager: [
    { to: '/trips', label: 'Plan a dispatch', body: 'Create, dispatch and track trips' },
    { to: '/vehicles', label: 'Fleet registry', body: 'Register or retire vehicles' },
    { to: '/maintenance', label: 'Schedule maintenance', body: 'Open and close service logs' },
  ],
  driver: [
    { to: '/trips', label: 'My trips', body: 'Dispatches assigned to you' },
    { to: '/fuel-logs', label: 'Log fuel', body: 'Record a fill-up against a trip' },
  ],
  safety_officer: [
    { to: '/drivers', label: 'Driver compliance', body: 'Licences and safety scores' },
  ],
  financial_analyst: [
    { to: '/reports', label: 'Financial reports', body: 'Operating cost and ROI per asset' },
    { to: '/fuel-logs', label: 'Expenses', body: 'Fuel and trip expense ledger' },
  ],
};

function LiveIndicator({ status }) {
  const map = {
    connected: { dot: 'bg-ok', text: 'Live', ping: true },
    connecting: { dot: 'bg-signal', text: 'Connecting…' },
    offline: { dot: 'bg-danger', text: 'Offline — showing last data' },
  };
  const s = map[status];
  return (
    <span role="status" className="inline-flex items-center gap-2 rounded border border-line bg-surface px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
      <span className="relative flex h-2 w-2" aria-hidden="true">
        {s.ping && <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${s.dot}`} />}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${s.dot}`} />
      </span>
      {s.text}
    </span>
  );
}

// Horizontal stacked bar of state counts — a status board, not a decorative chart.
function StateBoard({ title, counts, states, to, linkLabel }) {
  const total = states.reduce((sum, s) => sum + (counts[s.key] || 0), 0);
  return (
    <section className="panel p-5" aria-labelledby={`board-${title}`}>
      <div className="flex items-baseline justify-between">
        <h2 id={`board-${title}`} className="text-base font-semibold">{title}</h2>
        <span className="num text-sm text-muted">{total} total</span>
      </div>
      <div className="mt-4 flex h-2.5 w-full overflow-hidden rounded-full bg-line" aria-hidden="true">
        {total > 0 && states.map((s) => {
          const n = counts[s.key] || 0;
          return n ? <div key={s.key} className={`${s.bar} h-full transition-[width] duration-500`} style={{ width: `${(n / total) * 100}%` }} /> : null;
        })}
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
        {states.map((s) => (
          <div key={s.key}>
            <dt className="flex items-center gap-1.5 text-xs text-muted">
              <span className={`h-2 w-2 rounded-sm ${s.bar}`} aria-hidden="true" />{s.key}
            </dt>
            <dd className="num mt-0.5 text-lg font-semibold"><RollingNumber value={counts[s.key] || 0} /></dd>
          </div>
        ))}
      </dl>
      {to && (
        <Link to={to} className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink hover:underline">
          {linkLabel} <BsArrowRight aria-hidden="true" />
        </Link>
      )}
    </section>
  );
}

function TripPipeline({ trips }) {
  const stages = [
    { key: 'Draft', label: 'Planned' },
    { key: 'Dispatched', label: 'On the road' },
    { key: 'Completed', label: 'Delivered' },
  ];
  return (
    <section className="panel p-5" aria-labelledby="pipeline-title">
      <div className="flex items-baseline justify-between">
        <h2 id="pipeline-title" className="text-base font-semibold">Trip pipeline</h2>
        <span className="num text-sm text-muted">{trips.Cancelled || 0} cancelled</span>
      </div>
      <ol className="mt-4 grid grid-cols-3">
        {stages.map((s, i) => (
          <li key={s.key} className={`relative pr-3 ${i > 0 ? 'border-l border-line pl-4' : ''}`}>
            <p className="eyebrow">{String(i + 1).padStart(2, '0')} · {s.label}</p>
            <p className="num mt-1.5 text-[28px] font-semibold leading-none"><RollingNumber value={trips[s.key] || 0} /></p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function DashboardSkeleton() {
  return (
    <div role="status" aria-label="Loading dashboard" className="space-y-6">
      <div className="panel grid grid-cols-2 divide-x divide-line lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="space-y-3 px-5 py-4"><div className="skeleton h-3 w-24" /><div className="skeleton h-7 w-16" /></div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="skeleton h-48" /><div className="skeleton h-48" />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const dispatch = useDispatch();
  const { data, loading, error } = useSelector((state) => state.analytics);
  const { user } = useSelector((state) => state.auth);
  const [socketStatus, setSocketStatus] = useState('connecting');

  useEffect(() => {
    dispatch(fetchDashboard());

    const socket = io(SOCKET_URL);
    socket.on('connect', () => {
      setSocketStatus('connected');
      socket.emit('join', 'fleet');
    });
    socket.on('disconnect', () => setSocketStatus('offline'));
    socket.on('connect_error', () => setSocketStatus('offline'));
    socket.on('fleet:update', () => dispatch(fetchDashboard()));

    return () => socket.disconnect();
  }, [dispatch]);

  const firstLoad = loading && !data.vehicles.total;
  const links = QUICK_LINKS[user?.role] || [];
  const name = user?.name || user?.username;

  return (
    <>
      <PageHeader
        eyebrow={new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
        title="Operations control"
        description={name ? `Welcome back, ${name}. Fleet state updates as trips and vehicles change.` : undefined}
        actions={<LiveIndicator status={socketStatus} />}
      />

      <ErrorBanner message={error} onRetry={() => dispatch(fetchDashboard())} />

      {firstLoad ? (
        <DashboardSkeleton />
      ) : (
        <div className="space-y-6">
          <section aria-label="Key figures" className="panel grid grid-cols-2 divide-line lg:grid-cols-4 [&>*:nth-child(odd)]:border-r [&>*:nth-child(n+3)]:border-t lg:[&>*]:border-t-0 lg:[&>*:not(:last-child)]:border-r">
            <KpiCard title="Available vehicles" value={data.vehicles.Available || 0} suffix={`/ ${data.vehicles.total || 0}`} tone="bg-ok" />
            <KpiCard title="Active dispatches" value={data.trips.Dispatched || 0} tone="bg-transit" />
            <KpiCard title="Fleet utilisation" value={data.utilization || 0} suffix="%" hint="On-trip share of active fleet" />
            <KpiCard title="Open maintenance" value={data.openMaintenance || 0} tone="bg-signal" />
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <StateBoard
              title="Vehicles"
              counts={data.vehicles}
              states={VEHICLE_STATES}
              to={user?.role === 'fleet_manager' ? '/vehicles' : undefined}
              linkLabel="Open registry"
            />
            <StateBoard
              title="Drivers"
              counts={data.drivers}
              states={DRIVER_STATES}
              to={['fleet_manager', 'safety_officer'].includes(user?.role) ? '/drivers' : undefined}
              linkLabel="Open driver registry"
            />
          </div>

          <div className="grid items-start gap-6 lg:grid-cols-[1.4fr_1fr]">
            <TripPipeline trips={data.trips} />

            {links.length > 0 && (
              <section className="panel" aria-labelledby="actions-title">
                <h2 id="actions-title" className="border-b border-line px-5 py-4 text-base font-semibold">Your shortcuts</h2>
                <ul className="divide-y divide-line">
                  {links.map((l) => (
                    <li key={l.to + l.label}>
                      <Link to={l.to} className="group flex items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-paper/60">
                        <span>
                          <span className="block text-sm font-semibold">{l.label}</span>
                          <span className="block text-xs text-muted">{l.body}</span>
                        </span>
                        <BsArrowRight aria-hidden="true" className="text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </div>
      )}
    </>
  );
}
