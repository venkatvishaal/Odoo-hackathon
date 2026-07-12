import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTrips, createTrip, dispatchTrip, completeTrip, cancelTrip, clearValidationErrors } from '../redux/slices/tripSlice';
import vehicleService from '../services/vehicleService';
import driverService from '../services/driverService';
import StatusBadge from '../components/ui/StatusBadge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Modal from '../components/ui/Modal';
import PayloadGauge from '../components/ui/PayloadGauge';
import { toast } from 'react-toastify';
import api from '../services/api';
import { io } from 'socket.io-client';
import { FaRoute, FaPlus, FaCheck, FaBan, FaPlay, FaArrowRight, FaGasPump, FaTachometerAlt, FaShareAlt, FaMapMarkerAlt, FaBroadcastTower, FaStop, FaCopy, FaExternalLinkAlt } from 'react-icons/fa';

export default function TripPlanner() {
  const dispatch = useDispatch();
  const { list: trips, loading, error, validationErrors } = useSelector((state) => state.trips);
  
  // Local state for dropdown options
  const [eligibleVehicles, setEligibleVehicles] = useState([]);
  const [eligibleDrivers, setEligibleDrivers] = useState([]);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(null); // stores active trip object
  
  const [form, setForm] = useState({
    source: '',
    destination: '',
    vehicle_id: '',
    driver_id: '',
    cargo_weight: '',
    planned_distance: ''
  });

  const [completeForm, setCompleteForm] = useState({
    final_odometer: '',
    fuel_consumed_liters: ''
  });

  // Share Capacity modal
  const [showShareModal, setShowShareModal] = useState(null);
  const [shareForm, setShareForm] = useState({
    source: '',
    destination: '',
    intermediate_points: '',
    departure_time: '',
    estimated_arrival: '',
    price_per_kg: ''
  });
  const [shareLoading, setShareLoading] = useState(false);

  // Live Tracking checkpoint modal
  const [showTrackingModal, setShowTrackingModal] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [trackingForm, setTrackingForm] = useState({
    location: '',
    latitude: '',
    longitude: '',
    status: 'in_transit',
    notes: ''
  });
  const [trackingLoading, setTrackingLoading] = useState(false);

  // Live continuous GPS streaming state
  const [liveTrip, setLiveTrip] = useState(null);  // which trip is being streamed
  const liveSocketRef = useRef(null);
  const watchIdRef = useRef(null);

  // ── Reverse geocode helper (city name from lat/lng) ──────────
  const reverseGeocode = useCallback(async (lat, lng) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10`
      );
      const data = await res.json();
      return (
        data.address?.city ||
        data.address?.town ||
        data.address?.village ||
        data.address?.county ||
        data.display_name?.split(',')[0] ||
        'Current Location'
      );
    } catch {
      return 'Current Location';
    }
  }, []);

  // ── Open modal and auto-fetch real GPS ───────────────────────
  const openTrackingModal = useCallback(async (trip) => {
    setShowTrackingModal(trip);
    setTrackingForm({ location: '', latitude: '', longitude: '', status: 'in_transit', notes: '' });
    setGpsLoading(true);

    if (!navigator.geolocation) {
      toast.warning('Geolocation not supported by your browser.');
      setGpsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const cityName = await reverseGeocode(latitude, longitude);
        setTrackingForm(prev => ({
          ...prev,
          latitude: latitude.toFixed(6),
          longitude: longitude.toFixed(6),
          location: cityName
        }));
        setGpsLoading(false);
      },
      (err) => {
        console.warn('GPS error:', err.message);
        toast.warning('Could not fetch GPS. Please enter location manually.');
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [reverseGeocode]);

  // ── Start Live Tracking (continuous GPS stream via socket) ───
  const startLiveTracking = useCallback((trip) => {
    if (liveTrip) {
      toast.info('Already live tracking another trip. Stop it first.');
      return;
    }
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported.');
      return;
    }

    const socketUrl = process.env.REACT_APP_API_BASE_URL
      ? process.env.REACT_APP_API_BASE_URL.replace('/api', '')
      : 'http://localhost:5000';

    const socket = io(socketUrl);
    socket.emit('join', trip.id);
    liveSocketRef.current = socket;

    // Watch position and emit every update
    watchIdRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude, longitude, speed } = pos.coords;
        const cityName = await reverseGeocode(latitude, longitude);
        socket.emit('driverLocation', {
          trip_id: trip.id,
          latitude,
          longitude,
          location: cityName,
          speed: speed ? Math.round(speed * 3.6) : null // m/s → km/h
        });
      },
      (err) => {
        console.error('Live GPS error:', err);
        toast.error('GPS stream interrupted: ' + err.message);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    );

    setLiveTrip(trip);
    toast.success(`🔴 Live tracking started for ${trip.source} → ${trip.destination}`);
  }, [liveTrip, reverseGeocode]);

  // ── Stop Live Tracking ────────────────────────────────────────
  const stopLiveTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (liveSocketRef.current) {
      liveSocketRef.current.disconnect();
      liveSocketRef.current = null;
    }
    setLiveTrip(null);
    toast.info('⏹ Live tracking stopped.');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopLiveTracking();
  }, [stopLiveTracking]);

  const selectedVehicleObj = eligibleVehicles.find(v => v.id === form.vehicle_id);

  useEffect(() => {
    dispatch(fetchTrips());
  }, [dispatch]);

  const loadEligibleOptions = async () => {
    try {
      const [vRes, dRes] = await Promise.all([
        vehicleService.getEligibleForDispatch(),
        driverService.getEligibleForDispatch()
      ]);
      setEligibleVehicles(vRes.data.data);
      setEligibleDrivers(dRes.data.data);
    } catch (err) {
      console.error('Failed to load eligible options:', err);
    }
  };

  useEffect(() => {
    if (showAddModal) {
      loadEligibleOptions();
      dispatch(clearValidationErrors());
    }
  }, [showAddModal]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const res = await dispatch(createTrip(form));
    if (createTrip.fulfilled.match(res)) {
      toast.success('Trip created as Draft');
      setShowAddModal(false);
      setForm({
        source: '',
        destination: '',
        vehicle_id: '',
        driver_id: '',
        cargo_weight: '',
        planned_distance: ''
      });
    } else {
      const errMsg = res.payload;
      if (errMsg && errMsg.message) {
        toast.error(errMsg.message);
      }
    }
  };

  const handleDispatch = async (id) => {
    const res = await dispatch(dispatchTrip(id));
    if (dispatchTrip.fulfilled.match(res)) {
      toast.success('Trip dispatched successfully. Vehicle & Driver status updated.');
    } else {
      toast.error(res.payload || 'Failed to dispatch');
    }
  };

  const handleCancel = async (id) => {
    if (window.confirm('Cancel this trip?')) {
      const res = await dispatch(cancelTrip(id));
      if (cancelTrip.fulfilled.match(res)) {
        toast.success('Trip cancelled successfully.');
      } else {
        toast.error(res.payload || 'Failed to cancel');
      }
    }
  };

  const handleCompleteSubmit = async (e) => {
    e.preventDefault();
    const trip = showCompleteModal;
    const res = await dispatch(completeTrip({ id: trip.id, data: completeForm }));
    if (completeTrip.fulfilled.match(res)) {
      toast.success('Trip completed successfully. Vehicle odometer & logs updated.');
      setShowCompleteModal(null);
      setCompleteForm({ final_odometer: '', fuel_consumed_liters: '' });
      dispatch(fetchTrips());
    } else {
      const errMsg = res.payload;
      toast.error(errMsg?.message || 'Failed to complete trip');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-800 flex items-center gap-3">
              <FaRoute className="text-blue-600 text-3xl" /> Dispatch & Trips
            </h1>
            <p className="text-gray-500 text-sm mt-1">Plan, dispatch, and track active cargo routes</p>
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 transition font-bold shadow-sm"
          >
            <FaPlus /> Create Dispatch
          </button>
        </div>

        {loading && trips.length === 0 ? (
          <LoadingSpinner />
        ) : (
          <div className="space-y-4">
            {trips.length === 0 ? (
              <div className="bg-white p-12 rounded-xl border border-gray-100 shadow-sm text-center">
                <FaRoute className="text-6xl text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-xl font-bold">No dispatches scheduled.</p>
              </div>
            ) : (
              trips.map(t => (
                <div key={t.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-extrabold text-gray-800 text-lg flex items-center gap-2">
                        {t.source} <FaArrowRight className="text-xs text-gray-400" /> {t.destination}
                      </h3>
                      <p className="text-xs text-gray-400 font-bold uppercase mt-1">
                        Driver: {t.driver?.name} • Vehicle: {t.vehicle?.registration_number} ({t.vehicle?.model_name})
                      </p>
                      {/* Trip ID — copyable */}
                      <button
                        type="button"
                        title="Copy Trip ID"
                        onClick={() => {
                          navigator.clipboard.writeText(t.id);
                          toast.success('Trip ID copied to clipboard!');
                        }}
                        className="mt-1.5 flex items-center gap-1.5 text-[10px] font-mono text-gray-400 hover:text-blue-600 transition group"
                      >
                        <FaCopy className="text-gray-300 group-hover:text-blue-500" />
                        {t.id.slice(0, 8)}…{t.id.slice(-4)}
                        <span className="text-[9px] font-sans normal-case opacity-0 group-hover:opacity-100 transition text-blue-500">click to copy</span>
                      </button>
                    </div>
                    <StatusBadge status={t.status} />
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">Weight</p>
                      <p className="font-bold text-gray-800">{t.cargo_weight} KG</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">Distance</p>
                      <p className="font-bold text-gray-800">{t.planned_distance} KM</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">Dispatched At</p>
                      <p className="font-bold text-gray-800">{t.dispatched_at ? new Date(t.dispatched_at).toLocaleTimeString() : '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">Completed At</p>
                      <p className="font-bold text-gray-800">{t.completed_at ? new Date(t.completed_at).toLocaleTimeString() : '—'}</p>
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="mt-4 pt-4 border-t border-gray-100 flex gap-3 justify-end">
                    {t.status === 'Draft' && (
                      <>
                        <button 
                          onClick={() => handleDispatch(t.id)}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition flex items-center gap-1.5 shadow-sm"
                        >
                          <FaPlay /> Dispatch
                        </button>
                        <button 
                          onClick={() => handleCancel(t.id)}
                          className="border border-red-200 text-red-500 hover:bg-red-50 text-xs font-bold px-4 py-2 rounded-lg transition flex items-center gap-1.5"
                        >
                          <FaBan /> Cancel
                        </button>
                      </>
                    )}

                    {t.status === 'Dispatched' && (
                      <>
                        {/* Manual GPS checkpoint */}
                        <button
                          onClick={() => openTrackingModal(t)}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition flex items-center gap-1.5 shadow-sm"
                        >
                          <FaMapMarkerAlt /> Pin Location
                        </button>

                        {/* Live continuous GPS stream */}
                        {liveTrip?.id === t.id ? (
                          <button
                            onClick={stopLiveTracking}
                            className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition flex items-center gap-1.5 shadow-sm animate-pulse"
                          >
                            <FaStop /> Stop Live
                          </button>
                        ) : (
                          <button
                            onClick={() => startLiveTracking(t)}
                            className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition flex items-center gap-1.5 shadow-sm"
                          >
                            <FaBroadcastTower /> Go Live
                          </button>
                        )}

                        <button
                          onClick={() => {
                            setShowShareModal(t);
                            setShareForm({
                              source: t.source || '',
                              destination: t.destination || '',
                              intermediate_points: '',
                              departure_time: '',
                              estimated_arrival: '',
                              price_per_kg: ''
                            });
                          }}
                          className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition flex items-center gap-1.5 shadow-sm"
                        >
                          <FaShareAlt /> Share Capacity
                        </button>
                        {/* Open customer tracking page */}
                        <button
                          onClick={() => {
                            const url = `${window.location.origin}/track/${t.id}`;
                            navigator.clipboard.writeText(url).then(() =>
                              toast.success('🔗 Tracking link copied to clipboard!')
                            );
                            window.open(url, '_blank');
                          }}
                          className="bg-gray-800 hover:bg-gray-900 text-white text-xs font-bold px-4 py-2 rounded-lg transition flex items-center gap-1.5 shadow-sm"
                        >
                          <FaExternalLinkAlt /> Open Tracker
                        </button>
                        <button 
                          onClick={() => {
                            setShowCompleteModal(t);
                            setCompleteForm({
                              final_odometer: (parseFloat(t.vehicle?.odometer || 0) + parseFloat(t.planned_distance)).toString(),
                              fuel_consumed_liters: ''
                            });
                          }}
                          className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition flex items-center gap-1.5 shadow-sm"
                        >
                          <FaCheck /> Complete
                        </button>
                        <button 
                          onClick={() => handleCancel(t.id)}
                          className="border border-red-200 text-red-500 hover:bg-red-50 text-xs font-bold px-4 py-2 rounded-lg transition flex items-center gap-1.5"
                        >
                          <FaBan /> Cancel
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Create Modal */}
        <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Create Dispatch Trip">
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Source Depot</label>
                <input
                  required
                  name="source"
                  value={form.source}
                  onChange={handleChange}
                  placeholder="Warehouse A"
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Destination</label>
                <input
                  required
                  name="destination"
                  value={form.destination}
                  onChange={handleChange}
                  placeholder="Depot B"
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Select Driver</label>
              <select
                required
                name="driver_id"
                value={form.driver_id}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg p-3 text-sm outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-700 bg-white"
              >
                <option value="">Select available driver...</option>
                {eligibleDrivers.map(d => (
                  <option key={d.id} value={d.id}>{d.name} (Score: {d.safety_score})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Select Vehicle</label>
                <select
                  required
                  name="vehicle_id"
                  value={form.vehicle_id}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-700 bg-white"
                >
                  <option value="">Select vehicle...</option>
                  {eligibleVehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.registration_number} (Capacity: {v.max_load_capacity_kg}kg)</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Planned Distance (KM)</label>
                <input
                  required
                  type="number"
                  name="planned_distance"
                  value={form.planned_distance}
                  onChange={handleChange}
                  placeholder="120"
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Cargo Payload Weight (KG)</label>
              <input
                required
                type="number"
                name="cargo_weight"
                value={form.cargo_weight}
                onChange={handleChange}
                placeholder="350"
                className="w-full border border-gray-300 rounded-lg p-3 text-sm outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {selectedVehicleObj && (
              <PayloadGauge 
                value={parseFloat(form.cargo_weight || 0)} 
                max={parseFloat(selectedVehicleObj.max_load_capacity_kg)} 
              />
            )}

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="flex-1 border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold py-3 rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={selectedVehicleObj && parseFloat(form.cargo_weight || 0) > parseFloat(selectedVehicleObj.max_load_capacity_kg)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg text-sm disabled:bg-gray-300 disabled:cursor-not-allowed shadow-sm"
              >
                Schedule Draft
              </button>
            </div>
          </form>
        </Modal>

        {/* Complete Modal */}
        <Modal isOpen={!!showCompleteModal} onClose={() => setShowCompleteModal(null)} title="Complete Trip Delivery">
          <form onSubmit={handleCompleteSubmit} className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-xl text-xs space-y-1">
              <p>📍 <strong>Route:</strong> {showCompleteModal?.source} ➔ {showCompleteModal?.destination}</p>
              <p>🚙 <strong>Vehicle:</strong> {showCompleteModal?.vehicle?.registration_number}</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Final Odometer Reading (KM)</label>
              <div className="relative">
                <input
                  required
                  type="number"
                  name="final_odometer"
                  value={completeForm.final_odometer}
                  onChange={(e) => setCompleteForm({...completeForm, final_odometer: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg p-3 pl-10 text-sm outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                <FaTachometerAlt className="absolute left-3.5 top-3.5 text-gray-400" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Fuel Consumed (Liters)</label>
              <div className="relative">
                <input
                  required
                  type="number"
                  step="0.01"
                  name="fuel_consumed_liters"
                  value={completeForm.fuel_consumed_liters}
                  onChange={(e) => setCompleteForm({...completeForm, fuel_consumed_liters: e.target.value})}
                  placeholder="e.g. 15"
                  className="w-full border border-gray-300 rounded-lg p-3 pl-10 text-sm outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                <FaGasPump className="absolute left-3.5 top-3.5 text-gray-400" />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowCompleteModal(null)}
                className="flex-1 border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold py-3 rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg text-sm shadow-sm"
              >
                Complete & Release
              </button>
            </div>
          </form>
        </Modal>

        {/* Share Capacity Modal (Publish Route) */}
        <Modal isOpen={!!showShareModal} onClose={() => setShowShareModal(null)} title="Share Vehicle Capacity">
          <form onSubmit={async (e) => {
            e.preventDefault();
            if (!showShareModal?.vehicle_id) return;
            setShareLoading(true);
            try {
              const intermediateArr = shareForm.intermediate_points
                ? shareForm.intermediate_points.split(',').map(s => s.trim()).filter(Boolean)
                : [];
              await api.post(`/vehicles/${showShareModal.vehicle_id}/publish-route`, {
                source: shareForm.source,
                destination: shareForm.destination,
                intermediate_points: intermediateArr,
                departure_time: shareForm.departure_time || null,
                estimated_arrival: shareForm.estimated_arrival || null,
                price_per_kg: parseFloat(shareForm.price_per_kg) || 0
              });
              toast.success('Route published! Others can now book shared space on this vehicle.');
              setShowShareModal(null);
            } catch (err) {
              toast.error(err.response?.data?.message || 'Failed to publish route');
            } finally {
              setShareLoading(false);
            }
          }} className="space-y-4">
            <div className="bg-purple-50 border border-purple-200 text-purple-800 p-4 rounded-xl text-xs space-y-1">
              <p>🚙 <strong>Vehicle:</strong> {showShareModal?.vehicle?.registration_number} ({showShareModal?.vehicle?.model_name})</p>
              <p>📍 <strong>Current Trip:</strong> {showShareModal?.source} → {showShareModal?.destination}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Route Source</label>
                <input
                  required
                  value={shareForm.source}
                  onChange={e => setShareForm({ ...shareForm, source: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm outline-none focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Route Destination</label>
                <input
                  required
                  value={shareForm.destination}
                  onChange={e => setShareForm({ ...shareForm, destination: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm outline-none focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Intermediate Stops (comma-separated)</label>
              <input
                value={shareForm.intermediate_points}
                onChange={e => setShareForm({ ...shareForm, intermediate_points: e.target.value })}
                placeholder="e.g. Nashik, Shirdi"
                className="w-full border border-gray-300 rounded-lg p-3 text-sm outline-none focus:ring-purple-500 focus:border-purple-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Departure Time</label>
                <input
                  type="datetime-local"
                  value={shareForm.departure_time}
                  onChange={e => setShareForm({ ...shareForm, departure_time: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm outline-none focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Estimated Arrival</label>
                <input
                  type="datetime-local"
                  value={shareForm.estimated_arrival}
                  onChange={e => setShareForm({ ...shareForm, estimated_arrival: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm outline-none focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Price per KG (₹)</label>
              <input
                required
                type="number"
                step="0.01"
                min="0"
                value={shareForm.price_per_kg}
                onChange={e => setShareForm({ ...shareForm, price_per_kg: e.target.value })}
                placeholder="e.g. 5.50"
                className="w-full border border-gray-300 rounded-lg p-3 text-sm outline-none focus:ring-purple-500 focus:border-purple-500"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowShareModal(null)}
                className="flex-1 border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold py-3 rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={shareLoading}
                className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-bold py-3 rounded-lg text-sm shadow-sm"
              >
                {shareLoading ? 'Publishing...' : '🚀 Publish Route'}
              </button>
            </div>
          </form>
        </Modal>

        {/* Live Location Checkpoint Update Modal */}
        <Modal isOpen={!!showTrackingModal} onClose={() => setShowTrackingModal(null)} title="📍 Pin Location Checkpoint">
          <form onSubmit={async (e) => {
            e.preventDefault();
            if (!showTrackingModal?.id) return;
            setTrackingLoading(true);
            try {
              await api.post('/tracking', {
                trip_id: showTrackingModal.id,
                location: trackingForm.location,
                latitude: parseFloat(trackingForm.latitude),
                longitude: parseFloat(trackingForm.longitude),
                status: trackingForm.status,
                notes: trackingForm.notes
              });
              toast.success('📍 Checkpoint saved and broadcasted to shippers!');
              setShowTrackingModal(null);
            } catch (err) {
              toast.error(err.response?.data?.message || 'Failed to save checkpoint');
            } finally {
              setTrackingLoading(false);
            }
          }} className="space-y-4">
            <div className="bg-indigo-50 border border-indigo-200 text-indigo-800 p-4 rounded-xl text-xs space-y-1">
              <p>📍 <strong>Route:</strong> {showTrackingModal?.source} ➔ {showTrackingModal?.destination}</p>
              <p>🚙 <strong>Vehicle:</strong> {showTrackingModal?.vehicle?.registration_number}</p>
            </div>

            {/* GPS Status Banner */}
            {gpsLoading ? (
              <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl p-3 text-blue-700 text-sm">
                <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full flex-shrink-0" />
                <span className="font-medium">Fetching your real GPS coordinates...</span>
              </div>
            ) : trackingForm.latitude ? (
              <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl p-3">
                <div className="text-green-700 text-sm">
                  <span className="font-bold">✅ GPS Acquired:</span>{' '}
                  {trackingForm.latitude}, {trackingForm.longitude}
                </div>
                <button
                  type="button"
                  onClick={() => openTrackingModal(showTrackingModal)}
                  className="text-xs text-blue-600 underline font-semibold"
                >
                  Re-fetch
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between bg-yellow-50 border border-yellow-200 rounded-xl p-3">
                <span className="text-yellow-700 text-sm font-medium">⚠️ GPS unavailable — enter manually</span>
                <button
                  type="button"
                  onClick={() => openTrackingModal(showTrackingModal)}
                  className="text-xs text-blue-600 underline font-semibold"
                >
                  Try Again
                </button>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Location / Checkpoint Name</label>
              <input
                required
                placeholder="e.g. Lonavala Toll Plaza"
                value={trackingForm.location}
                onChange={e => setTrackingForm({ ...trackingForm, location: e.target.value })}
                className="w-full border border-gray-300 rounded-lg p-3 text-sm outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Latitude</label>
                <input
                  required
                  type="number"
                  step="0.000001"
                  placeholder="Auto-filled from GPS"
                  value={trackingForm.latitude}
                  onChange={e => setTrackingForm({ ...trackingForm, latitude: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-green-50"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Longitude</label>
                <input
                  required
                  type="number"
                  step="0.000001"
                  placeholder="Auto-filled from GPS"
                  value={trackingForm.longitude}
                  onChange={e => setTrackingForm({ ...trackingForm, longitude: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-green-50"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Transit Status</label>
                <select
                  value={trackingForm.status}
                  onChange={e => setTrackingForm({ ...trackingForm, status: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-700 bg-white"
                >
                  <option value="in_transit">🚛 In Transit</option>
                  <option value="picked_up">📦 Picked Up</option>
                  <option value="out_for_delivery">🏍️ Out for Delivery</option>
                  <option value="Completed">✅ Delivered</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Log Notes (optional)</label>
              <textarea
                placeholder="e.g. Traffic clear, moving at 60 km/h."
                value={trackingForm.notes}
                onChange={e => setTrackingForm({ ...trackingForm, notes: e.target.value })}
                rows="2"
                className="w-full border border-gray-300 rounded-lg p-3 text-sm outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowTrackingModal(null)}
                className="flex-1 border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold py-3 rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={trackingLoading}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold py-3 rounded-lg text-sm shadow-sm"
              >
                {trackingLoading ? 'Saving...' : '📍 Save Checkpoint'}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  );
}
