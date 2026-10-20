import React, { Suspense, lazy, useEffect, useState, useRef, useCallback } from 'react';
import { useReducedMotion } from 'motion/react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { toast } from 'react-toastify';
import api from '../services/api';
import 'leaflet/dist/leaflet.css';
import { BsSearch, BsTruck, BsShieldCheck, BsBroadcast, BsArrowRight } from 'react-icons/bs';
import { RouteLine } from '../components/landing/HeroBoard';
import { hasWebGL } from '../components/landing/webgl';

// three.js loads in its own chunk; the SVG route covers loading and no-WebGL browsers.
const TrackScene = lazy(() => import('../components/track/TrackScene'));

// ─────────────────────────────────────────────────────────────────────────────
// Fix Leaflet's broken default icon paths when bundled with webpack/CRA
// ─────────────────────────────────────────────────────────────────────────────
function fixLeafletIcons(L) {
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
    iconUrl:       require('leaflet/dist/images/marker-icon.png'),
    shadowUrl:     require('leaflet/dist/images/marker-shadow.png'),
  });
}

// Custom truck icon SVG data-URL
const truckIconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <circle cx="24" cy="24" r="22" fill="#2563eb" stroke="white" stroke-width="3"/>
  <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-size="22" fill="white">🚛</text>
</svg>`;
const truckIconUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(truckIconSvg)}`;

export default function ShipperTracking() {
  const { tripId: urlTripId } = useParams();
  const [tripIdInput, setTripIdInput]   = useState(urlTripId || '');
  const [trip, setTrip]                 = useState(null);
  const [checkpoints, setCheckpoints]   = useState([]);
  const [loading, setLoading]           = useState(false);
  const [searched, setSearched]         = useState(false);
  const [webgl]                         = useState(hasWebGL);
  const reduceMotion                    = useReducedMotion();

  // Socket ref
  const socketRef = useRef(null);

  // Leaflet refs
  const mapDivRef     = useRef(null);   // DOM element for the map
  const leafletRef    = useRef(null);   // Leaflet library instance (lazy-loaded)
  const mapRef        = useRef(null);   // L.map instance
  const markerRef     = useRef(null);   // current-position marker
  const polylineRef   = useRef(null);   // route trail polyline
  const allCoordsRef  = useRef([]);     // accumulated [lat,lng] pairs

  // ─── Lazy-load Leaflet ────────────────────────────────────────────────────
  const ensureLeaflet = useCallback(async () => {
    if (leafletRef.current) return leafletRef.current;
    const L = await import('leaflet');
    fixLeafletIcons(L.default || L);
    leafletRef.current = L.default || L;
    return leafletRef.current;
  }, []);

  // ─── Initialize or Re-initialize the Leaflet map ─────────────────────────
  const initMap = useCallback(async () => {
    if (!mapDivRef.current) return;
    const L = await ensureLeaflet();

    // Destroy previous instance if any
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current   = null;
      markerRef.current  = null;
      polylineRef.current = null;
      allCoordsRef.current = [];
    }

    const map = L.map(mapDivRef.current, { zoomControl: true }).setView(
      [20.5937, 78.9629], // India center
      5
    );

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    // Add a subtle attribution note
    map.attributionControl.setPrefix('TransitOps Live Tracker');

    mapRef.current = map;
  }, [ensureLeaflet]);

  // ─── Update the map when a new checkpoint arrives ────────────────────────
  const updateMap = useCallback(async (lat, lng, locationName, speed, isLive) => {
    if (!mapRef.current) return;
    const L = await ensureLeaflet();

    const latLng = [lat, lng];

    // Custom icon
    const icon = L.icon({
      iconUrl: truckIconUrl,
      iconSize: [48, 48],
      iconAnchor: [24, 24],
      popupAnchor: [0, -24],
    });

    if (markerRef.current) {
      markerRef.current.setLatLng(latLng);
      markerRef.current.setIcon(icon);
    } else {
      markerRef.current = L.marker(latLng, { icon }).addTo(mapRef.current);
    }

    // Update popup
    const speedText = speed != null ? `<br/>🏎 <strong>${speed} km/h</strong>` : '';
    const badge = isLive
      ? '<span style="background:#22c55e;color:white;padding:2px 6px;border-radius:999px;font-size:10px;font-weight:700;">● LIVE GPS</span>'
      : '<span style="background:#3b82f6;color:white;padding:2px 6px;border-radius:999px;font-size:10px;font-weight:700;">CHECKPOINT</span>';

    markerRef.current
      .bindPopup(
        `<div style="font-family:system-ui;min-width:160px">
          ${badge}
          <br/><strong style="font-size:14px">📍 ${locationName}</strong>
          <br/><span style="color:#6b7280;font-size:12px">${lat.toFixed(5)}, ${lng.toFixed(5)}</span>
          ${speedText}
        </div>`,
        { maxWidth: 240 }
      )
      .openPopup();

    // Append to accumulated coords and update polyline
    allCoordsRef.current = [...allCoordsRef.current, latLng];

    if (allCoordsRef.current.length > 1) {
      if (polylineRef.current) {
        polylineRef.current.setLatLngs(allCoordsRef.current);
      } else {
        polylineRef.current = L.polyline(allCoordsRef.current, {
          color: '#3B82F6',
          weight: 4,
          opacity: 0.8,
          dashArray: isLive ? '6 4' : null,
        }).addTo(mapRef.current);
      }
    }

    // Smooth pan to the new location
    mapRef.current.flyTo(latLng, Math.max(mapRef.current.getZoom(), 12), {
      animate: true,
      duration: 1.5,
    });
  }, [ensureLeaflet]);

  // ─── Fetch tracking data ──────────────────────────────────────────────────
  const fetchTrackingData = useCallback(async (tid) => {
    setLoading(true);
    setSearched(true);
    try {
      const res = await api.get(`/tracking/${tid}`);
      const tripData  = res.data.data.trip;
      const cps       = res.data.data.checkpoints || [];

      setTrip(tripData);
      setCheckpoints(cps);

      // Join socket room for this trip
      if (socketRef.current) {
        socketRef.current.emit('join', tid);
      }

      // Plot historical checkpoints on map (oldest first for polyline)
      await initMap();

      if (cps.length > 0) {
        // Replay coords in chronological order to draw the polyline
        const sorted = [...cps].reverse();
        allCoordsRef.current = sorted
          .map(cp => [parseFloat(cp.latitude), parseFloat(cp.longitude)])
          .filter(c => !isNaN(c[0]) && !isNaN(c[1]));

        // Plot each intermediate point without panning, then pan to latest
        if (allCoordsRef.current.length > 1 && mapRef.current) {
          const L = await ensureLeaflet();
          polylineRef.current = L.polyline(allCoordsRef.current, {
            color: '#3B82F6',
            weight: 4,
            opacity: 0.8,
          }).addTo(mapRef.current);
        }

        // Marker + pan to the very latest checkpoint
        const latest = cps[0];
        const lat = parseFloat(latest.latitude);
        const lng = parseFloat(latest.longitude);
        if (!isNaN(lat) && !isNaN(lng)) {
          await updateMap(lat, lng, latest.location, latest.speed, latest.isLive);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Shipment not found. Please verify the ID.');
      setTrip(null);
      setCheckpoints([]);
    } finally {
      setLoading(false);
    }
  }, [initMap, ensureLeaflet, updateMap]);

  // ─── Socket setup ─────────────────────────────────────────────────────────
  useEffect(() => {
    const socketUrl = process.env.REACT_APP_API_BASE_URL
      ? process.env.REACT_APP_API_BASE_URL.replace('/api', '')
      : 'http://localhost:5000';

    const socket = io(socketUrl);
    socketRef.current = socket;

    socket.on('trackingUpdated', async (newCheckpoint) => {
      const isLive = newCheckpoint.isLive;
      const label  = isLive ? '🟢 Live GPS update' : '📍 New checkpoint';
      toast.info(`${label}: ${newCheckpoint.location}`, {
        position: 'top-right',
        autoClose: 2500,
      });

      // Prepend to timeline
      setCheckpoints(prev => [newCheckpoint, ...prev]);

      // Update map marker + polyline
      const lat = parseFloat(newCheckpoint.latitude);
      const lng = parseFloat(newCheckpoint.longitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        await updateMap(lat, lng, newCheckpoint.location, newCheckpoint.speed, isLive);
      }
    });

    if (urlTripId) {
      fetchTrackingData(urlTripId);
    }

    return () => socket.disconnect();
  }, [urlTripId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Invalidate map size when it becomes visible (avoids grey tiles)
  useEffect(() => {
    if (trip && mapRef.current) {
      setTimeout(() => mapRef.current?.invalidateSize(), 200);
    }
  }, [trip]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!tripIdInput.trim()) return;
    fetchTrackingData(tripIdInput.trim());
  };

  // Progress % for the status bar
  const getProgressPercentage = () => {
    if (!trip) return 0;
    if (trip.status === 'Completed') return 100;
    if (trip.status === 'Cancelled') return 0;
    if (trip.status === 'Draft') return 10;
    const prog = 30 + checkpoints.filter(c => !c.isLive).length * 12;
    return Math.min(prog, 90);
  };

  const statusLabels = {
    Draft: 'Scheduled', Dispatched: 'In Transit',
    Completed: 'Delivered', Cancelled: 'Cancelled',
  };
  const statusColors = {
    Draft: 'bg-gray-100 text-gray-700',
    Dispatched: 'bg-purple-100 text-purple-700',
    Completed: 'bg-green-100 text-green-700',
    Cancelled: 'bg-red-100 text-red-700',
  };

  const sceneStatus = loading ? 'busy' : trip ? 'found' : searched ? 'missing' : tripIdInput.trim() ? 'typing' : 'idle';

  return (
    <div className="min-h-screen bg-paper">
      {/* ── HEADER + SEARCH: 3D map table band ── */}
      <section className={`relative isolate overflow-hidden rounded-b-[24px] bg-ink text-paper transition-[min-height] duration-700 ${trip ? 'min-h-[360px]' : 'min-h-[min(640px,72svh)]'}`}>
        <div className="absolute inset-0 -z-10">
          {webgl ? (
            <Suspense fallback={<RouteLine className="absolute inset-0 h-full w-full" />}>
              <TrackScene status={sceneStatus} reduceMotion={!!reduceMotion} className="absolute inset-0" />
            </Suspense>
          ) : <RouteLine className="absolute inset-0 h-full w-full" />}
        </div>
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_55%_70%_at_0%_0%,rgb(var(--ink))_35%,rgb(var(--ink)/0)_80%)]" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-48 bg-gradient-to-t from-ink to-transparent" />

        <div className={`mx-auto flex max-w-wide flex-col px-5 pb-8 pt-10 sm:px-8 lg:px-12 ${trip ? 'min-h-[360px]' : 'min-h-[min(640px,72svh)]'}`}>
          <header className="max-w-[30rem]">
            <p className="hud flex items-center gap-2.5 text-paper/55">
              <span aria-hidden="true" className="h-1.5 w-1.5 animate-pulse rounded-full bg-signal" />Shipper portal · live GPS
            </p>
            <h1 className="display-lg mt-5 text-paper">Where’s my cargo?</h1>
            <p className="mt-4 text-[16px] leading-relaxed text-paper/65">Track your cargo in real time with live GPS updates. No account needed.</p>
          </header>

          <form onSubmit={handleSearch} className="mx-auto mt-auto w-full max-w-[720px] rounded-[14px] bg-paper p-2 text-ink shadow-[0_24px_60px_-20px_rgb(0_0_0/0.6)]">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
              <label htmlFor="track-id" className="relative flex-1">
                <span className="hud absolute left-12 top-2.5 text-muted">Trip ID / booking ID</span>
                <BsSearch aria-hidden="true" className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-muted" />
                <input
                  id="track-id"
                  required
                  placeholder="Enter the ID from your booking"
                  className="h-full w-full rounded-[10px] border border-transparent bg-surface pb-2.5 pl-12 pr-4 pt-7 text-[16px] font-medium text-ink placeholder:text-muted/60 transition-colors focus:border-ink focus:outline-none"
                  value={tripIdInput}
                  onChange={e => setTripIdInput(e.target.value)}
                />
              </label>
              <button
                type="submit"
                disabled={loading}
                className="group inline-flex items-center justify-between gap-3 rounded-full bg-ink py-1.5 pl-6 pr-1.5 text-[15px] font-semibold text-paper transition-opacity disabled:cursor-wait disabled:opacity-70 sm:rounded-[10px]"
              >
                {loading ? 'Searching…' : 'Track cargo'}
                <span className="grid h-10 w-10 place-items-center rounded-full bg-signal text-ink transition-transform duration-300 group-hover:-rotate-45">
                  <BsArrowRight aria-hidden="true" />
                </span>
              </button>
            </div>
          </form>
        </div>
      </section>

      <div className="mx-auto max-w-5xl p-6 md:p-12">
        {loading && (
          <div className="text-center py-20">
            <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-500 font-medium">Fetching live tracking information…</p>
          </div>
        )}

        {searched && !loading && !trip && (
          <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 shadow-sm">
            <p className="text-6xl mb-4">📦</p>
            <h3 className="text-xl font-bold text-gray-800 mb-2">No Tracking Information Found</h3>
            <p className="text-gray-400 text-sm">Please verify your booking reference ID.</p>
          </div>
        )}

        {trip && (
          <div className="space-y-8">

            {/* ── LIVE BROADCAST INDICATOR ── */}
            <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 px-6 py-4 shadow-sm">
              <div>
                <h3 className="text-base font-bold text-gray-800">
                  {trip.source} → {trip.destination}
                </h3>
                <p className="text-sm text-gray-400">{trip.vehicle?.registration_number} · {trip.vehicle?.model_name}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${statusColors[trip.status] || 'bg-gray-100'}`}>
                  {statusLabels[trip.status] || trip.status}
                </span>
                {trip.status === 'Dispatched' && (
                  <span className="flex items-center gap-1.5 text-xs font-bold text-red-600">
                    <span className="animate-ping h-2.5 w-2.5 rounded-full bg-red-500 inline-block" />
                    <BsBroadcast /> LIVE
                  </span>
                )}
              </div>
            </div>

            {/* ── PROGRESS BAR ── */}
            <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
              <div className="flex justify-between text-xs font-bold text-gray-500 mb-2">
                <span>📍 {trip.source}</span>
                <span>{getProgressPercentage()}% Complete</span>
                <span>🏁 {trip.destination}</span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000 ease-in-out"
                  style={{
                    width: `${getProgressPercentage()}%`,
                    background: 'linear-gradient(90deg, #3B82F6, #10B981)',
                  }}
                />
              </div>
              {checkpoints.length > 0 && (
                <p className="text-xs text-gray-400 mt-2 text-center">
                  Last update: {checkpoints[0].location} —{' '}
                  {new Date(checkpoints[0].timestamp).toLocaleTimeString('en-IN')}
                </p>
              )}
            </div>

            {/* ── LIVE LEAFLET MAP ── */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-lg overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
                <div>
                  <h3 className="font-bold text-gray-800">🗺 Live Location Map</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Map auto-pans to the truck's real GPS position
                  </p>
                </div>
                {checkpoints.length > 0 && (
                  <span className="text-xs text-gray-400 font-medium">
                    🚛 {checkpoints[0].location}
                  </span>
                )}
              </div>
              {/* Map container — Leaflet renders here */}
              <div
                ref={mapDivRef}
                style={{ height: '440px', width: '100%' }}
                className="z-0"
              />
            </div>

            {/* ── DETAILS GRID ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm space-y-4">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Shipment Details</h3>
                {[
                  ['Cargo Weight', `${trip.cargo_weight} KG`],
                  ['Total Distance', `${trip.planned_distance} KM`],
                  ['Vehicle', `${trip.vehicle?.registration_number} (${trip.vehicle?.model_name})`],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between border-b border-gray-50 pb-2 last:border-0 last:pb-0">
                    <span className="text-sm text-gray-400">{k}</span>
                    <span className="text-sm font-bold text-gray-800">{v}</span>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm space-y-4">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Security &amp; Contact</h3>
                {[
                  ['Assigned Driver', trip.driver?.name || 'Assigned Driver'],
                  ['Contact', trip.driver?.contact_number || 'N/A'],
                  ['Booking Type', trip.is_shared ? 'Verified Shared Space' : 'Standard Dispatch'],
                  ['Price Quote', `₹${parseFloat(trip.price_quote || 0).toLocaleString()}`],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between border-b border-gray-50 pb-2 last:border-0 last:pb-0">
                    <span className="text-sm text-gray-400">{k}</span>
                    <span className="text-sm font-bold text-gray-800 flex items-center gap-1">
                      {k === 'Booking Type' && <BsShieldCheck className="text-green-500" />}
                      {v}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── TRACKING TIMELINE ── */}
            <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-800">Tracking Timeline</h3>
                <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                  {checkpoints.length} event{checkpoints.length !== 1 ? 's' : ''}
                </span>
              </div>

              {checkpoints.length === 0 ? (
                <div className="text-center py-8">
                  <BsTruck className="text-4xl text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">No updates yet.</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Live GPS pings appear here the moment the driver goes live.
                  </p>
                </div>
              ) : (
                <div className="relative border-l-2 border-blue-50 pl-6 space-y-5">
                  {checkpoints.map((cp, i) => (
                    <div key={cp.id || `${cp.timestamp}-${i}`} className="relative">
                      {cp.isLive ? (
                        <span className="absolute -left-[31px] top-1.5 h-4 w-4 rounded-full bg-green-500 ring-4 ring-green-100 animate-pulse border-2 border-white" />
                      ) : (
                        <span
                          className={`absolute -left-[31px] top-1.5 h-4 w-4 rounded-full border-2 border-white ${
                            i === 0 ? 'bg-blue-600 ring-4 ring-blue-100' : 'bg-gray-300'
                          }`}
                        />
                      )}

                      <div className="flex justify-between items-start flex-wrap gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-800 text-sm flex items-center gap-2 flex-wrap">
                            {cp.isLive ? '🟢' : '📍'} {cp.location}
                            {cp.isLive && (
                              <span className="bg-green-50 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-green-200 animate-pulse">
                                ● LIVE GPS
                              </span>
                            )}
                            {!cp.isLive && i === 0 && (
                              <span className="bg-blue-50 text-blue-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-100">
                                LAST CHECKPOINT
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5 font-mono">
                            {parseFloat(cp.latitude).toFixed(5)}, {parseFloat(cp.longitude).toFixed(5)}
                            {cp.speed != null && (
                              <span className="ml-2 text-blue-500 font-semibold not-italic">
                                · {cp.speed} km/h
                              </span>
                            )}
                          </p>
                          {cp.notes && (
                            <p className="text-sm text-gray-500 italic mt-1.5 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                              "{cp.notes}"
                            </p>
                          )}
                        </div>
                        <span className="text-[11px] font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-md whitespace-nowrap">
                          {new Date(cp.timestamp).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
