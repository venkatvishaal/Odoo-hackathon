import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { toast } from 'react-toastify';
import api from '../services/api';
import 'leaflet/dist/leaflet.css';
import { BsSearch, BsTruck, BsShieldCheck, BsBroadcast } from 'react-icons/bs';

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

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-12">
      <div className="max-w-5xl mx-auto">

        {/* ── HEADER ── */}
        <header className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-2">
            Shipper <span className="text-blue-600">Portal</span>
          </h1>
          <p className="text-gray-500 text-lg">
            Track your cargo in real-time with live GPS updates.
          </p>
        </header>

        {/* ── SEARCH ── */}
        <div className="bg-white rounded-3xl shadow-xl shadow-blue-50 p-8 mb-8 border border-blue-50">
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="relative flex-1">
              <BsSearch className="absolute left-4 top-4 text-gray-400 text-lg" />
              <input
                required
                placeholder="Enter Trip ID / Booking ID"
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all font-medium text-gray-800"
                value={tripIdInput}
                onChange={e => setTripIdInput(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-8 rounded-2xl font-bold transition-all shadow-lg shadow-blue-200"
            >
              {loading ? 'Searching…' : 'Track Cargo'}
            </button>
          </form>
        </div>

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
