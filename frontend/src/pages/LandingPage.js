import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { Link } from 'react-router-dom';
import {
  BsArrowRight, BsList, BsX, BsGeoAlt, BsBroadcast, BsPinMap, BsLink45Deg, BsGithub,
} from 'react-icons/bs';
import { Logo } from '../components/layout/AppShell';
import HeroBoard, { RouteLine } from '../components/landing/HeroBoard';
import Reveal from '../components/landing/Reveal';
import Tilt from '../components/landing/Tilt';
import CargoContainer3D, { Cuboid } from '../components/landing/CargoContainer3D';
import StatusBadge from '../components/ui/StatusBadge';
import { DirectionAwareTabs } from '../components/ui/DirectionAwareTabs';

// three.js ships in its own chunk; the SVG route panel covers loading and no-WebGL browsers.
const YardScene = lazy(() => import('../components/landing/YardScene'));

const hasWebGL = () => {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
};

const REPO_URL = 'https://github.com/venkatvishaal/Odoo-hackathon';

const ANCHORS = [
  { href: '#features', label: 'Features' },
  { href: '#how', label: 'How it works' },
  { href: '#roles', label: 'Roles' },
  { href: '#stack', label: 'Stack' },
];

function SectionHead({ index, eyebrow, title, children, inverted = false }) {
  return (
    <Reveal className="max-w-2xl">
      <p className={`eyebrow flex items-center gap-3 ${inverted ? 'text-paper/55' : ''}`}>
        <span className={`num ${inverted ? 'text-signal' : 'text-ink'}`}>{index}</span>
        <span aria-hidden="true" className={`h-px w-8 ${inverted ? 'bg-paper/25' : 'bg-line'}`} />
        {eyebrow}
      </p>
      <h2 className={`display mt-4 text-[34px] sm:text-[44px] ${inverted ? 'text-paper' : 'text-ink'}`}>{title}</h2>
      {children && <p className={`mt-4 text-[15px] leading-relaxed ${inverted ? 'text-paper/70' : 'text-muted'}`}>{children}</p>}
    </Reveal>
  );
}

/* ── Navigation ─────────────────────────────────────────── */

function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const drawerRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const close = () => drawerRef.current?.close();

  return (
    <header className={`sticky top-0 z-30 transition-colors duration-200 ${scrolled ? 'border-b border-line bg-paper/90 backdrop-blur-sm' : 'border-b border-transparent'}`}>
      <div className="mx-auto flex max-w-content items-center justify-between px-5 py-3.5 sm:px-8">
        <Link to="/" aria-label="TransitOps home"><Logo /></Link>
        <nav aria-label="Sections" className="hidden items-center gap-1 text-[13px] font-medium md:flex">
          {ANCHORS.map((a) => (
            <a key={a.href} href={a.href} className="rounded px-3 py-1.5 text-muted transition-colors hover:text-ink">{a.label}</a>
          ))}
        </nav>
        <div className="hidden items-center gap-1 md:flex">
          <Link to="/track" className="rounded px-3 py-1.5 text-[13px] font-medium text-muted transition-colors hover:text-ink">Track cargo</Link>
          <Link to="/login" className="rounded px-3 py-1.5 text-[13px] font-medium text-muted transition-colors hover:text-ink">Sign in</Link>
          <Link to="/register" className="btn btn-primary btn-sm ml-1">Get started</Link>
        </div>
        <button type="button" onClick={() => drawerRef.current?.showModal()} className="btn-icon md:hidden" aria-label="Open menu">
          <BsList className="text-xl" aria-hidden="true" />
        </button>
      </div>

      <dialog
        ref={drawerRef}
        aria-label="Menu"
        onClick={(e) => { if (e.target === drawerRef.current) close(); }}
        className="m-0 h-[100dvh] max-h-none w-[min(320px,86vw)] bg-transparent p-0 md:hidden"
      >
        <div className="flex h-full flex-col bg-paper px-5 py-4">
          <div className="flex items-center justify-between">
            <Logo />
            <button type="button" onClick={close} className="btn-icon" aria-label="Close menu"><BsX className="text-xl" aria-hidden="true" /></button>
          </div>
          <nav aria-label="Sections" className="mt-8 flex flex-col border-t border-line">
            {ANCHORS.map((a) => (
              <a key={a.href} href={a.href} onClick={close} className="display border-b border-line py-4 text-2xl text-ink">{a.label}</a>
            ))}
          </nav>
          <div className="mt-auto grid gap-2">
            <Link to="/register" className="btn btn-primary py-3">Get started</Link>
            <Link to="/login" className="btn btn-ghost py-3">Sign in</Link>
            <Link to="/track" className="btn btn-ghost py-3">Track cargo</Link>
          </div>
        </div>
      </dialog>
    </header>
  );
}

/* ── Hero ───────────────────────────────────────────────── */

function SceneFallback() {
  return (
    <div className="absolute inset-6 overflow-hidden rounded-panel bg-ink">
      <RouteLine className="h-full w-full" />
    </div>
  );
}

function Hero() {
  const ref = useRef(null);
  const reduceMotion = useReducedMotion();
  const webgl = useMemo(hasWebGL, []);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const stageY = useTransform(scrollYProgress, [0, 1], [0, reduceMotion ? 0 : 80]);

  return (
    <section ref={ref} className="mx-auto grid max-w-content items-center gap-14 px-5 pb-20 pt-10 sm:px-8 lg:grid-cols-12 lg:gap-10 lg:pb-28 lg:pt-16">
      <div className="lg:col-span-6">
        <Reveal as="p" className="eyebrow flex items-center gap-2">
          <span aria-hidden="true" className="h-2 w-2 rounded-sm bg-signal" />
          Fleet &amp; logistics operations
        </Reveal>
        <Reveal as="h1" delay={0.05} className="display mt-5 text-[46px] sm:text-[64px] lg:text-[76px]">
          Dispatch only what’s road&#8209;ready. Track every kilo of it.
        </Reveal>
        <Reveal as="p" delay={0.1} className="mt-6 max-w-xl text-[16px] leading-relaxed text-muted">
          TransitOps runs the whole trip ledger — vehicles, drivers, dispatch, maintenance, fuel and ROI — and
          refuses unsafe assignments before they leave the yard. Shippers watch cargo move live, and spare
          capacity on half-full trucks gets sold instead of driven empty.
        </Reveal>
        <Reveal delay={0.15} className="mt-8 flex flex-wrap items-center gap-3">
          <Link to="/register" className="btn btn-primary group px-5 py-3 text-sm">
            Set up your fleet
            <BsArrowRight aria-hidden="true" className="transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link to="/track" className="btn btn-ghost px-5 py-3 text-sm">
            <BsGeoAlt aria-hidden="true" /> Track a shipment
          </Link>
        </Reveal>
        <Reveal delay={0.2} as="dl" className="mt-10 grid max-w-md grid-cols-3 border-t border-line pt-5">
          {[['4', 'dispatch gates'], ['4', 'staff roles + public portal'], ['Live', 'GPS over WebSockets']].map(([k, v]) => (
            <div key={v}>
              <dt className="sr-only">{v}</dt>
              <dd className="display text-2xl text-ink">{k}</dd>
              <dd className="mt-0.5 text-xs text-muted">{v}</dd>
            </div>
          ))}
        </Reveal>
      </div>
      <Reveal delay={0.1} className="relative lg:col-span-6">
        <motion.div style={{ y: stageY }} className="relative -mx-5 h-[360px] [mask-image:radial-gradient(ellipse_at_center,black_55%,transparent_78%)] sm:mx-0 sm:h-[460px] lg:-mr-16 lg:h-[600px]">
          {webgl ? (
            <Suspense fallback={<SceneFallback />}>
              <YardScene progress={scrollYProgress} reduceMotion={!!reduceMotion} className="h-full w-full" />
            </Suspense>
          ) : <SceneFallback />}
        </motion.div>
        <Tilt max={8} className="relative z-10 mx-auto -mt-10 max-w-[380px] lg:absolute lg:-bottom-24 lg:-left-6 lg:mt-0 lg:w-[330px]">
          <HeroBoard compact />
        </Tilt>
      </Reveal>
    </section>
  );
}

/* ── Problem → rule ledger ──────────────────────────────── */

const LEDGER = [
  ['“Where is my cargo?”', 'Drivers broadcast live GPS; shippers follow a public tracking link on an OpenStreetMap view with route trail and speed.'],
  ['Empty miles on part-loaded trucks', 'Remaining weight capacity is calculated per trip and can be published to a shared marketplace at a price per kg.'],
  ['Unsafe or non-compliant dispatch', 'Expired licences, suspended drivers, vehicles In Shop or Retired, double bookings and overloads are blocked at dispatch.'],
  ['Costs scattered across spreadsheets', 'Fuel logs, expenses and maintenance roll up into utilisation, fuel efficiency and per-vehicle ROI.'],
];

function Ledger() {
  return (
    <section className="border-y border-line bg-surface">
      <div className="mx-auto max-w-content px-5 py-20 sm:px-8 lg:py-28">
        <SectionHead index="01" eyebrow="Problem → rule" title="Four failures every fleet knows. Each one becomes a rule.">
          Instead of trusting people to remember policy, TransitOps writes it into the dispatch path.
        </SectionHead>
        <div className="mt-12 border-t border-ink">
          {LEDGER.map(([problem, rule], i) => (
            <Reveal key={problem} delay={i * 0.06} className="group grid gap-2 border-b border-line py-6 md:grid-cols-12 md:gap-8">
              <span className="num text-xs text-muted md:col-span-1 md:pt-1">{String(i + 1).padStart(2, '0')}</span>
              <h3 className="display text-xl text-ink md:col-span-4">{problem}</h3>
              <p className="flex gap-3 text-[15px] leading-relaxed text-muted md:col-span-7">
                <BsArrowRight aria-hidden="true" className="mt-1.5 shrink-0 text-ink transition-transform group-hover:translate-x-1" />
                {rule}
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Features ───────────────────────────────────────────── */

function TrackingFeature() {
  const points = [
    [BsBroadcast, 'Go Live', 'Drivers stream device geolocation to the server over Socket.io.'],
    [BsPinMap, 'Manual checkpoints', 'Drop a pin with a reverse-geocoded place name when streaming drops.'],
    [BsLink45Deg, 'Public tracking link', 'Customers open /track with a trip ID — no account needed.'],
  ];
  return (
    <div className="grid overflow-hidden rounded-panel border border-line bg-surface lg:grid-cols-12">
      <div className="p-7 sm:p-10 lg:col-span-5">
        <p className="eyebrow">Real-time tracking</p>
        <h3 className="display mt-3 text-[28px] text-ink sm:text-[34px]">The shipper sees what the driver sees.</h3>
        <ul className="mt-8 space-y-5">
          {points.map(([Icon, t, d]) => (
            <li key={t} className="flex gap-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-line text-ink"><Icon aria-hidden="true" /></span>
              <div>
                <p className="text-sm font-semibold text-ink">{t}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-muted">{d}</p>
              </div>
            </li>
          ))}
        </ul>
        <Link to="/track" className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-ink underline decoration-signal decoration-2 underline-offset-4 hover:decoration-ink">
          Open the tracking portal <BsArrowRight aria-hidden="true" />
        </Link>
      </div>
      <div className="relative min-h-[280px] bg-ink lg:col-span-7">
        <RouteLine className="absolute inset-0 h-full w-full" />
        <div className="absolute left-5 top-5 rounded-sm border border-paper/15 bg-ink/80 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.08em] text-paper/80">
          <span className="text-signal">●</span> Live · trail updating
        </div>
      </div>
    </div>
  );
}

function CapacityFeature() {
  return (
    <div className="flex flex-col rounded-panel border border-line bg-surface p-7 sm:p-10">
      <p className="eyebrow">Shared capacity marketplace</p>
      <h3 className="display mt-3 text-[28px] text-ink">Sell the space you were going to haul empty.</h3>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        A dispatched trip can publish its remaining weight along the route with a ₹/kg quote. Other shippers find it in
        Shared cargo and book it — revenue on a trip that was already running.
      </p>
      <div className="mt-auto pt-6">
        <CargoContainer3D />
        <p className="font-mono text-[11px] text-muted">Example: 5,000 kg vehicle · 3,200 kg booked · 1,800 kg published</p>
      </div>
    </div>
  );
}

function GatingFeature() {
  const gates = [
    ['Vehicle state', 'Retired and In Shop vehicles never appear in the dispatch pool.'],
    ['Driver compliance', 'Expired licences and Suspended drivers cannot be assigned.'],
    ['No double booking', 'Anything already On Trip is unavailable until the trip completes.'],
    ['Payload limit', 'Cargo weight is checked against the vehicle’s max load.'],
  ];
  return (
    <div className="h-full rounded-panel border border-line bg-surface p-7 sm:p-10">
      <p className="eyebrow">Dispatch gating</p>
      <h3 className="display mt-3 text-[28px] text-ink">Unsafe trips don’t get a dispatch button.</h3>
      <ol className="relative mt-8 space-y-6 before:absolute before:bottom-2 before:left-[11px] before:top-2 before:w-px before:bg-line">
        {gates.map(([t, d], i) => (
          <li key={t} className="relative flex gap-4">
            <span className="num relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-ink bg-surface text-[11px] font-semibold">{i + 1}</span>
            <div>
              <p className="text-sm font-semibold text-ink">{t}</p>
              <p className="mt-0.5 text-sm text-muted">{d}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function MaintenanceFeature() {
  return (
    <div className="rounded-panel border border-line bg-surface p-7 sm:p-10">
      <p className="eyebrow">Maintenance shop locking</p>
      <h3 className="display mt-3 text-[28px] text-ink">Open a repair log, the truck leaves the pool.</h3>
      <div className="mt-8 flex items-center gap-3" aria-label="Available changes to In Shop when a log opens, and back when it closes">
        <StatusBadge status="Available" />
        <div className="flex flex-1 flex-col gap-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
          <span className="flex items-center gap-2"><span className="h-px flex-1 bg-ink" />log opened →</span>
          <span className="flex items-center gap-2">← log closed<span className="h-px flex-1 bg-ink" /></span>
        </div>
        <StatusBadge status="In Shop" />
      </div>
      <p className="mt-6 text-sm leading-relaxed text-muted">
        No one has to remember to flag it. Closing the log releases the vehicle back to Available automatically.
      </p>
    </div>
  );
}

function AnalyticsBand() {
  const formulas = [
    ['Fleet utilisation', 'vehicles on trip ÷ total available fleet × 100'],
    ['Fuel efficiency', 'distance travelled (km) ÷ fuel consumed (L)'],
    ['Vehicle ROI', '(trip revenue − costs) ÷ acquisition cost'],
  ];
  return (
    <div className="rounded-panel bg-ink p-7 text-paper sm:p-10">
      <div className="grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <p className="eyebrow text-paper/55">Reports &amp; analytics</p>
          <h3 className="display mt-3 text-[28px] text-paper">The numbers come from the ledger, not a spreadsheet.</h3>
          <Link to="/login" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-paper underline decoration-signal decoration-2 underline-offset-4">
            Sign in to Reports <BsArrowRight aria-hidden="true" />
          </Link>
        </div>
        <dl className="divide-y divide-paper/10 border-y border-paper/10 lg:col-span-8">
          {formulas.map(([k, v]) => (
            <div key={k} className="grid gap-1 py-5 sm:grid-cols-[180px_1fr] sm:gap-6">
              <dt className="text-sm font-semibold">{k}</dt>
              <dd className="num text-[14px] text-signal">= {v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

function Features() {
  return (
    <section id="features" className="mx-auto max-w-content px-5 py-20 sm:px-8 lg:py-28">
      <SectionHead index="02" eyebrow="Features" title="One board for the yard, the road and the books." />
      <div className="mt-12 grid gap-5 lg:grid-cols-2">
        <Reveal className="lg:col-span-2"><Tilt max={2.5}><TrackingFeature /></Tilt></Reveal>
        <Reveal className="h-full"><Tilt className="h-full"><GatingFeature /></Tilt></Reveal>
        <div className="grid gap-5">
          <Reveal delay={0.05}><Tilt><CapacityFeature /></Tilt></Reveal>
          <Reveal delay={0.1}><Tilt><MaintenanceFeature /></Tilt></Reveal>
        </div>
        <Reveal className="lg:col-span-2"><AnalyticsBand /></Reveal>
      </div>
    </section>
  );
}

/* ── How it works ───────────────────────────────────────── */

const STEPS = [
  ['Register assets', 'Add vehicles with capacity and odometer, and drivers with licence category and expiry.', null],
  ['Draft a trip', 'Pick cargo weight, origin and destination. Only eligible vehicles and drivers are offered.', 'Draft'],
  ['Dispatch', 'Gates pass, the trip goes out and both vehicle and driver flip to On Trip.', 'Dispatched'],
  ['Run it live', 'Driver goes live on GPS; spare capacity can be shared and booked en route.', 'On Trip'],
  ['Complete', 'Odometer updates, fuel and expenses are logged, assets return to Available.', 'Completed'],
];

function HowItWorks() {
  const railRef = useRef(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: railRef, offset: ['start end', 'center 60%'] });
  const rotateX = useTransform(scrollYProgress, [0, 1], [reduceMotion ? 0 : 48, 0]);
  const railY = useTransform(scrollYProgress, [0, 1], [reduceMotion ? 0 : 60, 0]);
  return (
    <section id="how" className="border-y border-line bg-surface">
      <div className="mx-auto max-w-content px-5 py-20 sm:px-8 lg:py-28">
        <SectionHead index="03" eyebrow="How it works" title="A trip, from yard to delivered.">
          Every status change is driven by the trip lifecycle, so the board is always the source of truth.
        </SectionHead>
        <motion.ol
          ref={railRef}
          style={{ rotateX, y: railY, transformPerspective: 1200, transformOrigin: '50% 100%' }}
          className="relative mt-14 grid gap-8 lg:grid-cols-5 lg:gap-6"
        >
          <span aria-hidden="true" className="absolute left-[15px] top-4 h-[calc(100%-2rem)] w-px bg-line lg:left-4 lg:right-4 lg:top-[15px] lg:h-px lg:w-auto" />
          {STEPS.map(([t, d, status], i) => (
            <Reveal as="li" key={t} delay={i * 0.08} className="relative flex gap-5 lg:block">
              <span className={`num relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${i === STEPS.length - 1 ? 'bg-signal text-ink' : 'bg-ink text-paper'}`}>
                {i + 1}
              </span>
              <div className="lg:mt-6 lg:pr-2">
                <h3 className="display text-xl text-ink">{t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{d}</p>
                {status && <div className="mt-3"><StatusBadge status={status} /></div>}
              </div>
            </Reveal>
          ))}
        </motion.ol>
      </div>
    </section>
  );
}

/* ── Roles ──────────────────────────────────────────────── */

// Mirrors the allowedRoles on each <PrivateRoute> in App.js.
const ROLES = [
  { id: 'fleet_manager', label: 'Fleet manager', lead: 'Owns the board end to end.', does: ['Registers vehicles and drivers', 'Plans and dispatches trips', 'Opens and closes maintenance logs', 'Publishes spare capacity'], areas: ['Dashboard', 'Trips', 'Vehicles', 'Drivers', 'Maintenance', 'Fuel & expenses', 'Reports'] },
  { id: 'driver', label: 'Driver', lead: 'Runs the trip and reports from the road.', does: ['Works trips in the trip planner', 'Goes live on GPS or drops checkpoints', 'Shares remaining capacity', 'Logs fuel and expenses'], areas: ['Dashboard', 'Trips', 'Fuel & expenses', 'Shared cargo'] },
  { id: 'safety_officer', label: 'Safety officer', lead: 'Keeps people compliant.', does: ['Reviews driver records', 'Watches licence expiry', 'Tracks safety scores and suspensions'], areas: ['Dashboard', 'Drivers', 'Shared cargo'] },
  { id: 'financial_analyst', label: 'Financial analyst', lead: 'Turns trips into margins.', does: ['Audits fuel and expense logs', 'Reads utilisation and fuel efficiency', 'Compares ROI per vehicle'], areas: ['Dashboard', 'Fuel & expenses', 'Reports', 'Shared cargo'] },
  { id: 'shipper', label: 'Shipper', lead: 'Needs no account to follow cargo.', does: ['Opens the public tracking link', 'Watches position, speed and route trail', 'Sees whether the booking is shared space'], areas: ['Track cargo (public)'] },
];

function RolePanel({ role }) {
  return (
    <div className="grid gap-8 rounded-panel border border-line bg-surface p-7 sm:p-10 md:grid-cols-12">
      <div className="md:col-span-5">
        <h3 className="display text-[28px] text-ink">{role.label}</h3>
        <p className="mt-2 text-[15px] text-muted">{role.lead}</p>
        <Link to={role.id === 'shipper' ? '/track' : '/register'} className="btn btn-primary mt-6">
          {role.id === 'shipper' ? 'Track a shipment' : `Register as ${role.label.toLowerCase()}`}
          <BsArrowRight aria-hidden="true" />
        </Link>
      </div>
      <div className="md:col-span-4">
        <p className="eyebrow">Does</p>
        <ul className="mt-3 space-y-2 text-sm text-ink">
          {role.does.map((d) => <li key={d} className="flex gap-2.5"><span aria-hidden="true" className="mt-2 h-1 w-1 shrink-0 rounded-full bg-ink" />{d}</li>)}
        </ul>
      </div>
      <div className="md:col-span-3">
        <p className="eyebrow">Sees</p>
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {role.areas.map((a) => <li key={a} className="rounded-sm border border-line bg-paper px-2 py-1 font-mono text-[11px] text-ink">{a}</li>)}
        </ul>
      </div>
    </div>
  );
}

function Roles() {
  const [active, setActive] = useState(ROLES[0].id);
  return (
    <section id="roles" className="mx-auto max-w-content px-5 py-20 sm:px-8 lg:py-28">
      <SectionHead index="04" eyebrow="Who uses it" title="Every role gets exactly the screens it needs.">
        Access is enforced with JWT role checks on the API and route guards in the app.
      </SectionHead>
      <Reveal className="mt-10">
        <div className="-mx-5 overflow-x-auto px-5 pb-1 sm:mx-0 sm:px-0">
          <DirectionAwareTabs
            label="Roles"
            value={active}
            onChange={setActive}
            tabs={ROLES.map((r) => ({ id: r.id, label: <span className="whitespace-nowrap">{r.label}</span>, content: <Tilt max={3}><RolePanel role={r} /></Tilt> }))}
          />
        </div>
      </Reveal>
    </section>
  );
}

/* ── Stack ──────────────────────────────────────────────── */

const LAYERS = [
  ['Client', 'React SPA', ['Redux Toolkit', 'Tailwind CSS', 'React-Leaflet', 'Recharts', 'socket.io-client']],
  ['API', 'Node.js · Express', ['REST endpoints', 'Socket.io rooms per trip', 'JWT role-based access']],
  ['Data', 'PostgreSQL', ['Sequelize ORM', 'Relational trip / asset ledger']],
];

const slabFace = (accent) => (n) => {
  if (n === 'top') return accent ? 'border border-signal bg-ink' : 'border border-paper/30 bg-ink';
  return accent ? 'bg-signal/70' : 'bg-paper/15';
};

// Exploded isometric view of the three tiers; the slabs separate as the section scrolls through.
function ExplodedStack({ progress }) {
  const reduceMotion = useReducedMotion();
  const gap = useTransform(progress, [0.1, 0.5], reduceMotion ? [56, 56] : [14, 64]);
  const yTop = useTransform(gap, (g) => -g);
  const yBottom = useTransform(gap, (g) => g);
  const ys = [yTop, 0, yBottom];
  return (
    <div className="relative mx-auto mt-14 hidden h-[300px] w-[320px] [perspective:1600px] lg:block" aria-hidden="true">
      <div className="absolute left-1/2 top-1/2" style={{ transformStyle: 'preserve-3d', transform: 'rotateX(-32deg) rotateY(45deg)' }}>
        {LAYERS.map(([tier, name], i) => (
          <Cuboid key={tier} w={190} h={14} d={190} face={slabFace(i === 0)} style={{ y: ys[i] }}>
            <span className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="display text-lg text-paper">{name}</span>
              <span className="mt-1 font-mono text-[9px] uppercase tracking-[0.1em] text-paper/50">{tier}</span>
            </span>
          </Cuboid>
        ))}
      </div>
    </div>
  );
}

function Stack() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  return (
    <section id="stack" ref={ref} className="bg-ink text-paper">
      <div className="mx-auto grid max-w-content gap-14 px-5 py-20 sm:px-8 lg:grid-cols-12 lg:py-28">
        <div className="lg:col-span-5">
          <SectionHead index="05" eyebrow="Under the hood" title="Plain, proven parts." inverted>
            A React client talks REST for the ledger and keeps a WebSocket open for live positions. Business rules
            live on the server, so every client gets the same gates.
          </SectionHead>
          <Reveal delay={0.1}>
            <a href={REPO_URL} target="_blank" rel="noreferrer" className="btn mt-8 border-paper/20 text-paper hover:bg-paper/10">
              <BsGithub aria-hidden="true" /> View source on GitHub
            </a>
          </Reveal>
          <ExplodedStack progress={scrollYProgress} />
        </div>
        <ol className="lg:col-span-7" aria-label="Architecture, top to bottom">
          {LAYERS.map(([tier, name, parts], i) => (
            <Reveal as="li" key={tier} delay={i * 0.08}>
              <div className="rounded-panel border border-paper/15 p-5 sm:p-6">
                <div className="flex items-baseline justify-between gap-4">
                  <p className="display text-xl">{name}</p>
                  <span className="eyebrow text-paper/50">{tier}</span>
                </div>
                <ul className="mt-4 flex flex-wrap gap-1.5">
                  {parts.map((p) => <li key={p} className="rounded-sm bg-paper/[0.07] px-2 py-1 font-mono text-[11px] text-paper/80">{p}</li>)}
                </ul>
              </div>
              {i < LAYERS.length - 1 && (
                <div aria-hidden="true" className="ml-8 flex h-10 items-center gap-3">
                  <span className="h-full w-px bg-signal" />
                  <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-paper/45">{i === 0 ? 'HTTPS + WebSocket' : 'SQL'}</span>
                </div>
              )}
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ── CTA + footer ───────────────────────────────────────── */

function FinalCta() {
  return (
    <section className="mx-auto max-w-content px-5 py-20 sm:px-8 lg:py-28">
      <Reveal className="grid items-end gap-8 border-t border-ink pt-10 lg:grid-cols-12">
        <h2 className="display text-[40px] text-ink sm:text-[56px] lg:col-span-8">Put your fleet on the board.</h2>
        <div className="flex flex-wrap gap-3 lg:col-span-4 lg:justify-end">
          <Link to="/register" className="btn btn-signal px-5 py-3 text-sm">Create an account <BsArrowRight aria-hidden="true" /></Link>
          <Link to="/login" className="btn btn-ghost px-5 py-3 text-sm">Sign in</Link>
        </div>
      </Reveal>
    </section>
  );
}

function Footer() {
  const cols = [
    ['Product', ANCHORS.map((a) => [a.label, a.href, 'anchor'])],
    ['App', [['Sign in', '/login'], ['Register', '/register'], ['Track cargo', '/track']]],
    ['Project', [['GitHub repository', REPO_URL, 'external']]],
  ];
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto grid max-w-content gap-10 px-5 py-12 sm:px-8 md:grid-cols-12">
        <div className="md:col-span-5">
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-muted">Smart transport operations platform. Built for the Odoo Hackathon.</p>
        </div>
        {cols.map(([title, links]) => (
          <nav key={title} aria-label={title} className="md:col-span-2">
            <p className="eyebrow">{title}</p>
            <ul className="mt-3 space-y-2 text-sm">
              {links.map(([label, href, kind]) => (
                <li key={label}>
                  {kind === 'anchor' && <a href={href} className="text-ink hover:underline">{label}</a>}
                  {kind === 'external' && <a href={href} target="_blank" rel="noreferrer" className="text-ink hover:underline">{label}</a>}
                  {!kind && <Link to={href} className="text-ink hover:underline">{label}</Link>}
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-clip bg-paper">
      <a href="#top" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded focus:bg-signal focus:px-3 focus:py-2 focus:text-ink">
        Skip to content
      </a>
      <LandingNav />
      <main id="top">
        <Hero />
        <Ledger />
        <Features />
        <HowItWorks />
        <Roles />
        <Stack />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
