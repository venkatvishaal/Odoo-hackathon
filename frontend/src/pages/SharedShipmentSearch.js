import React, { useState } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';
import {
  BsSearch,
  BsTruck,
  BsGeoAltFill,
  BsFillInboxFill,
  BsBoxSeam,
  BsSignpostSplitFill,
  BsCheckCircleFill,
  BsCalendarEventFill,
  BsCurrencyRupee,
  BsArrowRight
} from 'react-icons/bs';

export default function SharedShipmentSearch() {
  const [searchParams, setSearchParams] = useState({
    pickup: '',
    destination: '',
    weight: ''
  });
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(null);
  const [searched, setSearched] = useState(false);

  // Booking modal
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [bookingForm, setBookingForm] = useState({
    planned_distance: '',
    price_quote: ''
  });

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSearched(true);
    try {
      const res = await api.get('/vehicles/search', { params: searchParams });
      setResults(res.data.data || []);
      if ((res.data.data || []).length === 0) {
        toast.info('No vehicles found on this route with enough capacity.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const openBookingModal = (route) => {
    setSelectedRoute(route);
    setBookingForm({
      planned_distance: '',
      price_quote: (parseFloat(route.price_per_kg) * parseFloat(searchParams.weight)).toFixed(2)
    });
    setShowBookingModal(true);
  };

  const handleBook = async (e) => {
    e.preventDefault();
    if (!selectedRoute) return;

    if (!bookingForm.planned_distance || parseFloat(bookingForm.planned_distance) <= 0) {
      toast.error('Please enter a valid planned distance');
      return;
    }

    setBookingLoading(selectedRoute.route_id);
    try {
      await api.post('/vehicles/shared-booking', {
        route_id: selectedRoute.route_id,
        pickup_location: searchParams.pickup,
        delivery_location: searchParams.destination,
        weight: searchParams.weight,
        planned_distance: bookingForm.planned_distance,
        price_quote: bookingForm.price_quote || undefined
      });
      toast.success('Shared booking created successfully!');
      setResults(results.filter(r => r.route_id !== selectedRoute.route_id));
      setShowBookingModal(false);
      setSelectedRoute(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Booking failed');
    } finally {
      setBookingLoading(null);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('en-IN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-12">
      <div className="max-w-5xl mx-auto">
        <header className="mb-12">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-2">
            Shared <span className="text-blue-600">Fleet</span> Discovery
          </h1>
          <p className="text-gray-500 text-lg">Book affordable space on vehicles already traveling your way.</p>
        </header>

        {/* ── SEARCH CARD ── */}
        <div className="bg-white rounded-3xl shadow-xl shadow-blue-100 p-8 mb-12 border border-blue-50">
          <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase ml-1">Pickup City</label>
              <div className="relative">
                <BsGeoAltFill className="absolute left-4 top-4 text-blue-500" />
                <input
                  required
                  placeholder="e.g. Pune"
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                  value={searchParams.pickup}
                  onChange={e => setSearchParams({ ...searchParams, pickup: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase ml-1">Destination</label>
              <div className="relative">
                <BsGeoAltFill className="absolute left-4 top-4 text-green-500" />
                <input
                  required
                  placeholder="e.g. Mumbai"
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                  value={searchParams.destination}
                  onChange={e => setSearchParams({ ...searchParams, destination: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase ml-1">Weight (KG)</label>
              <div className="relative">
                <BsFillInboxFill className="absolute left-4 top-4 text-gray-400" />
                <input
                  required
                  type="number"
                  min="0.1"
                  step="0.1"
                  placeholder="e.g. 500"
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                  value={searchParams.weight}
                  onChange={e => setSearchParams({ ...searchParams, weight: e.target.value })}
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-4 px-8 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-200 hover:shadow-blue-300"
            >
              {loading ? (
                <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <>
                  <BsSearch /> Search
                </>
              )}
            </button>
          </form>
        </div>

        {/* ── RESULTS ── */}
        {searched && !loading && results.length === 0 && (
          <div className="text-center py-16">
            <BsTruck className="mx-auto text-6xl text-gray-300 mb-4" />
            <p className="text-lg text-gray-400">No matching vehicles found.</p>
            <p className="text-sm text-gray-400 mt-1">Try broadening your search or check back later.</p>
          </div>
        )}

        <div className="space-y-6">
          {results.map((route) => (
            <div
              key={route.route_id}
              className="bg-white rounded-2xl shadow-md hover:shadow-xl border border-gray-100 hover:border-blue-200 transition-all duration-300 p-6"
            >
              <div className="flex flex-col md:flex-row justify-between gap-6">
                {/* Route Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-blue-100 p-2.5 rounded-xl">
                      <BsTruck className="text-blue-600 text-xl" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{route.vehicle.registration_number}</p>
                      <p className="text-sm text-gray-500">{route.vehicle.model_name} • {route.vehicle.vehicle_type}</p>
                    </div>
                    <span className={`ml-auto px-3 py-1 rounded-full text-xs font-bold ${route.vehicle.status === 'On Trip' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                      {route.vehicle.status}
                    </span>
                  </div>

                  {/* Route path visualization */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="bg-blue-600 text-white px-3 py-1 rounded-lg text-sm font-bold">{route.source}</span>
                    {(route.intermediate_points || []).map((pt, i) => (
                      <React.Fragment key={i}>
                        <BsArrowRight className="text-gray-400" />
                        <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-lg text-sm font-medium">{pt}</span>
                      </React.Fragment>
                    ))}
                    <BsArrowRight className="text-gray-400" />
                    <span className="bg-green-600 text-white px-3 py-1 rounded-lg text-sm font-bold">{route.destination}</span>
                  </div>

                  {/* Meta details */}
                  <div className="flex gap-6 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <BsCalendarEventFill className="text-blue-500" />
                      Departs: {formatDate(route.departure_time)}
                    </span>
                    <span className="flex items-center gap-1">
                      <BsCheckCircleFill className="text-green-500" />
                      Arrives: {formatDate(route.estimated_arrival)}
                    </span>
                  </div>
                </div>

                {/* Pricing and Capacity */}
                <div className="flex flex-col items-end justify-between min-w-[200px]">
                  <div className="text-right mb-4">
                    <p className="text-xs font-bold text-gray-400 uppercase">Price per KG</p>
                    <p className="text-2xl font-extrabold text-gray-900 flex items-center gap-1">
                      <BsCurrencyRupee className="text-green-600" />
                      {parseFloat(route.price_per_kg).toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Est. total: ₹{(parseFloat(route.price_per_kg) * parseFloat(searchParams.weight)).toFixed(2)}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Available</p>
                      <p className="font-bold text-green-600 flex items-center gap-1">
                        <BsBoxSeam />
                        {route.remaining_capacity} kg
                      </p>
                    </div>
                    <button
                      onClick={() => openBookingModal(route)}
                      disabled={bookingLoading === route.route_id}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md hover:shadow-lg"
                    >
                      {bookingLoading === route.route_id ? (
                        <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full inline-block" />
                      ) : (
                        'Book Space'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── BOOKING MODAL ── */}
      {showBookingModal && selectedRoute && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 relative">
            <button
              onClick={() => { setShowBookingModal(false); setSelectedRoute(null); }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl font-bold"
            >
              ✕
            </button>

            <h2 className="text-2xl font-extrabold text-gray-900 mb-1">Book Shared Space</h2>
            <p className="text-sm text-gray-500 mb-6">
              {selectedRoute.vehicle.registration_number} • {selectedRoute.source} → {selectedRoute.destination}
            </p>

            <form onSubmit={handleBook} className="space-y-5">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Cargo Weight</label>
                <div className="relative">
                  <BsFillInboxFill className="absolute left-4 top-3.5 text-gray-400" />
                  <input
                    type="number"
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 rounded-xl font-medium cursor-not-allowed"
                    value={searchParams.weight}
                    disabled
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Planned Distance (KM)</label>
                <div className="relative">
                  <BsSignpostSplitFill className="absolute left-4 top-3.5 text-gray-400" />
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    placeholder="e.g. 150"
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 rounded-xl focus:ring-2 focus:ring-blue-500 font-medium"
                    value={bookingForm.planned_distance}
                    onChange={e => setBookingForm({ ...bookingForm, planned_distance: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Price Quote (₹)</label>
                <div className="relative">
                  <BsCurrencyRupee className="absolute left-4 top-3.5 text-gray-400" />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 rounded-xl focus:ring-2 focus:ring-blue-500 font-medium"
                    value={bookingForm.price_quote}
                    onChange={e => setBookingForm({ ...bookingForm, price_quote: e.target.value })}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">Auto-calculated from price/kg × weight</p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowBookingModal(false); setSelectedRoute(null); }}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bookingLoading === selectedRoute.route_id}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-3 rounded-xl font-bold transition-all shadow-lg"
                >
                  {bookingLoading === selectedRoute.route_id ? 'Booking...' : 'Confirm Booking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
