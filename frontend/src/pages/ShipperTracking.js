import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { toast } from 'react-toastify';
import api from '../services/api';
import {
  BsSearch,
  BsTruck,
  BsShieldCheck,
  BsBroadcast
} from 'react-icons/bs';

export default function ShipperTracking() {
  const { tripId: urlTripId } = useParams();
  const [tripIdInput, setTripIdInput] = useState(urlTripId || '');
  const [trip, setTrip] = useState(null);
  const [checkpoints, setCheckpoints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const socketRef = useRef(null);

  const fetchTrackingData = async (tid) => {
    setLoading(true);
    setSearched(true);
    try {
      const res = await api.get(`/tracking/${tid}`);
      setTrip(res.data.data.trip);
      setCheckpoints(res.data.data.checkpoints || []);
      
      // Join socket room
      if (socketRef.current) {
        socketRef.current.emit('join', tid);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Shipment not found. Please verify the ID.');
      setTrip(null);
      setCheckpoints([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Connect to Socket.io
    const socketUrl = process.env.REACT_APP_API_BASE_URL
      ? process.env.REACT_APP_API_BASE_URL.replace('/api', '')
      : 'http://localhost:5000';
    
    socketRef.current = io(socketUrl);

    socketRef.current.on('trackingUpdated', (newCheckpoint) => {
      toast.info(`📍 Live Update: Package at ${newCheckpoint.location}`, {
        position: 'top-right',
        autoClose: 3000
      });
      // Append newest checkpoint at the top
      setCheckpoints(prev => [newCheckpoint, ...prev]);
    });

    if (urlTripId) {
      fetchTrackingData(urlTripId);
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [urlTripId]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!tripIdInput.trim()) return;
    fetchTrackingData(tripIdInput.trim());
  };

  // Status mapping
  const statusLabels = {
    Draft: 'Scheduled',
    Dispatched: 'In Transit',
    Completed: 'Delivered',
    Cancelled: 'Cancelled'
  };

  const statusColors = {
    Draft: 'bg-gray-100 text-gray-700',
    Dispatched: 'bg-purple-100 text-purple-700 animate-pulse',
    Completed: 'bg-green-100 text-green-700',
    Cancelled: 'bg-red-100 text-red-700'
  };

  // Visual SVG Route matching
  const getProgressPercentage = () => {
    if (!trip) return 0;
    if (trip.status === 'Completed') return 100;
    if (trip.status === 'Cancelled') return 0;
    if (trip.status === 'Draft') return 10;
    
    // In Transit: Calculate based on checklist/checkpoints
    if (checkpoints.length === 0) return 30;
    
    // Increment progress dynamically with each checkpoint
    const progress = 30 + (checkpoints.length * 15);
    return Math.min(progress, 90);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-2">
            Shipper <span className="text-blue-600">Portal</span>
          </h1>
          <p className="text-gray-500 text-lg">Track your dispatch routes and cargo matching in real-time.</p>
        </header>

        {/* ── SEARCH CARD ── */}
        <div className="bg-white rounded-3xl shadow-xl shadow-blue-50 p-8 mb-8 border border-blue-50">
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="relative flex-1">
              <BsSearch className="absolute left-4 top-4 text-gray-400 text-lg" />
              <input
                required
                placeholder="Enter Trip ID / Booking ID (e.g. a1dfb9c2-...)"
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
              {loading ? 'Searching...' : 'Track Cargo'}
            </button>
          </form>
        </div>

        {loading && (
          <div className="text-center py-20">
            <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-500 font-medium">Fetching live tracking information...</p>
          </div>
        )}

        {searched && !loading && !trip && (
          <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 shadow-sm">
            <p className="text-6xl mb-4">📦</p>
            <h3 className="text-xl font-bold text-gray-800 mb-2">No Tracking Information Found</h3>
            <p className="text-gray-400 text-sm">Please verify your booking reference ID or check back once the trip has been dispatched.</p>
          </div>
        )}

        {trip && (
          <div className="space-y-8">
            {/* ── LIVE MAP PROGRESS CARD ── */}
            <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-8">
              <div className="flex justify-between items-start flex-wrap gap-4 mb-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">Live Route Map</h3>
                  <p className="text-sm text-gray-400">Real-time status updates broadcasted via satellite GPS</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="animate-ping h-2.5 w-2.5 rounded-full bg-red-500 inline-block" />
                  <span className="text-xs font-bold text-red-600 flex items-center gap-1">
                    <BsBroadcast className="text-sm" /> LIVE BROADCASTING
                  </span>
                </div>
              </div>

              {/* Vector SVG Animated Tracker */}
              <div className="bg-blue-50 rounded-2xl p-8 border border-blue-100 flex flex-col justify-center items-center relative overflow-hidden" style={{ minHeight: '240px' }}>
                {/* SVG Route Line */}
                <svg className="w-full max-w-lg h-32" viewBox="0 0 500 120">
                  <defs>
                    <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#3B82F6" />
                      <stop offset="100%" stopColor="#10B981" />
                    </linearGradient>
                  </defs>
                  
                  {/* Route dotted line */}
                  <path
                    d="M 50 60 Q 250 10 450 60"
                    fill="none"
                    stroke="#D1D5DB"
                    strokeWidth="4"
                    strokeDasharray="8 6"
                  />

                  {/* Active segment progress line */}
                  <path
                    d="M 50 60 Q 250 10 450 60"
                    fill="none"
                    stroke="url(#routeGradient)"
                    strokeWidth="5"
                    strokeDasharray="500"
                    strokeDashoffset={500 - (getProgressPercentage() / 100) * 500}
                    className="transition-all duration-1000 ease-in-out"
                  />

                  {/* Source Point */}
                  <circle cx="50" cy="60" r="10" className="fill-blue-600 stroke-4 stroke-white shadow" />
                  <text x="50" y="90" textAnchor="middle" className="text-xs font-bold fill-gray-600" fontSize="10">{trip.source}</text>

                  {/* Intermediate stops as minor dots */}
                  {trip.route?.intermediate_points?.map((stop, i, arr) => {
                    const xCoord = 50 + ((i + 1) / (arr.length + 1)) * 400;
                    // Approximate quadratic curve coordinate: y = a(x-250)^2 + 10 => at 50/450 y=60, at 250 y=10.
                    const yCoord = 10 + (50 * Math.pow(xCoord - 250, 2)) / 40000;
                    return (
                      <g key={stop}>
                        <circle cx={xCoord} cy={yCoord} r="6" className="fill-purple-500 stroke-2 stroke-white" />
                        <text x={xCoord} y={yCoord + 20} textAnchor="middle" className="text-[8px] font-bold fill-gray-400" fontSize="8">{stop}</text>
                      </g>
                    );
                  })}

                  {/* Destination Point */}
                  <circle cx="450" cy="60" r="10" className="fill-green-500 stroke-4 stroke-white" />
                  <text x="450" y="90" textAnchor="middle" className="text-xs font-bold fill-gray-600" fontSize="10">{trip.destination}</text>

                  {/* Truck placement on curve */}
                  {/* For simplistic translation, use progress to calculate (x, y) along curve */}
                  {(() => {
                    const pct = getProgressPercentage() / 100;
                    const x = 50 + pct * 400;
                    const y = 10 + (50 * Math.pow(x - 250, 2)) / 40000;
                    return (
                      <g transform={`translate(${x - 14}, ${y - 14})`} className="transition-all duration-1000 ease-in-out">
                        <circle cx="14" cy="14" r="18" className="fill-white stroke-2 stroke-blue-200 shadow" />
                        <foreignObject x="4" y="4" width="20" height="20">
                          <BsTruck className="text-blue-600 text-lg animate-bounce" />
                        </foreignObject>
                      </g>
                    );
                  })()}
                </svg>

                <div className="mt-4 text-center">
                  <p className="text-sm font-bold text-gray-700">
                    Route Progress: {getProgressPercentage()}% Complete
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {trip.status === 'Completed' ? 'Cargo safely delivered to destination' : `Currently traveling from ${trip.source} to ${trip.destination}`}
                  </p>
                </div>
              </div>
            </div>

            {/* ── INFORMATION GRID ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Trip Metadata */}
              <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm space-y-4">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Shipment Details</h3>
                <div className="flex justify-between border-b border-gray-50 pb-2">
                  <span className="text-sm text-gray-400">Current Status</span>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${statusColors[trip.status] || 'bg-gray-100'}`}>
                    {statusLabels[trip.status] || trip.status}
                  </span>
                </div>
                <div className="flex justify-between border-b border-gray-50 pb-2">
                  <span className="text-sm text-gray-400">Cargo Weight</span>
                  <span className="text-sm font-bold text-gray-800">{trip.cargo_weight} KG</span>
                </div>
                <div className="flex justify-between border-b border-gray-50 pb-2">
                  <span className="text-sm text-gray-400">Total Distance</span>
                  <span className="text-sm font-bold text-gray-800">{trip.planned_distance} KM</span>
                </div>
                <div className="flex justify-between pb-2">
                  <span className="text-sm text-gray-400">Transit Vehicle</span>
                  <span className="text-sm font-bold text-blue-600 uppercase">
                    {trip.vehicle?.registration_number} ({trip.vehicle?.model_name})
                  </span>
                </div>
              </div>

              {/* Driver & Booking Info */}
              <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm space-y-4">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Security & Contact</h3>
                <div className="flex justify-between border-b border-gray-50 pb-2">
                  <span className="text-sm text-gray-400">Assigned Driver</span>
                  <span className="text-sm font-bold text-gray-800">{trip.driver?.name || 'Assigned Driver'}</span>
                </div>
                <div className="flex justify-between border-b border-gray-50 pb-2">
                  <span className="text-sm text-gray-400">Driver Contact</span>
                  <span className="text-sm font-bold text-gray-800">{trip.driver?.contact_number || 'N/A'}</span>
                </div>
                <div className="flex justify-between border-b border-gray-50 pb-2">
                  <span className="text-sm text-gray-400">Shared Booking</span>
                  <span className="text-sm font-bold text-gray-800 flex items-center gap-1">
                    <BsShieldCheck className="text-green-500" /> {trip.is_shared ? 'Verified Shared Space' : 'Standard Dispatch'}
                  </span>
                </div>
                <div className="flex justify-between pb-2">
                  <span className="text-sm text-gray-400">Price Quote</span>
                  <span className="text-sm font-extrabold text-green-600">₹{parseFloat(trip.price_quote || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* ── TIMELINE TIMESTAMPS ── */}
            <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
              <h3 className="text-lg font-bold text-gray-800 mb-6">Tracking Checkpoints</h3>
              
              {checkpoints.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-400 text-sm">No checkpoints logged by the driver yet.</p>
                  <p className="text-xs text-gray-400 mt-1">Updates will post automatically as the vehicle moves.</p>
                </div>
              ) : (
                <div className="relative border-l-2 border-blue-50 pl-6 space-y-6">
                  {checkpoints.map((cp, i) => (
                    <div key={cp.id || i} className="relative">
                      {/* Timeline dot */}
                      <span className={`absolute -left-[31px] top-1.5 h-4.5 w-4.5 rounded-full border-4 border-white ${i === 0 ? 'bg-blue-600 ring-4 ring-blue-100' : 'bg-gray-300'}`} />
                      
                      <div className="flex justify-between items-start flex-wrap gap-2">
                        <div>
                          <p className="font-bold text-gray-800 text-sm flex items-center gap-2">
                            📍 {cp.location}
                            {i === 0 && (
                              <span className="bg-blue-50 text-blue-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-100">
                                LATEST POSITION
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">Coordinates: {cp.latitude}, {cp.longitude}</p>
                          {cp.notes && (
                            <p className="text-sm text-gray-500 italic mt-1.5 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                              "{cp.notes}"
                            </p>
                          )}
                        </div>
                        <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-md">
                          {new Date(cp.timestamp).toLocaleString('en-IN', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
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
