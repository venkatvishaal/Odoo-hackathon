import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchDashboard } from '../redux/slices/analyticsSlice';
import KpiCard from '../components/ui/KpiCard';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import io from 'socket.io-client';
import { BsTruck, BsPerson, BsCompass, BsWrench, BsPercent } from 'react-icons/bs';

export default function Dashboard() {
  const dispatch = useDispatch();
  const { data, loading, error } = useSelector((state) => state.analytics);
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    dispatch(fetchDashboard());

    // Connect to Socket.io room for real-time updates
    const socket = io(process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000');
    socket.emit('join', 'fleet');
    
    socket.on('fleet:update', (payload) => {
      console.log('Real-time KPI update received:', payload);
      dispatch(fetchDashboard());
    });

    return () => {
      socket.disconnect();
    };
  }, [dispatch]);

  if (loading && !data.vehicles.total) {
    return <LoadingSpinner />;
  }

  const activeVehicles = data.vehicles['On Trip'] || 0;
  const availableVehicles = data.vehicles.Available || 0;
  const inShopVehicles = data.vehicles['In Shop'] || 0;
  const activeTrips = data.trips.Dispatched || 0;
  const activeDrivers = data.drivers['On Trip'] || 0;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-800 flex items-center gap-2">
              <BsTruck className="text-blue-600 text-3xl" /> Operations Control
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Welcome back, {user?.name || user?.username}. Real-time operational intelligence.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold text-green-700 bg-green-100 border border-green-200 uppercase tracking-wide animate-pulse">
            ● Real-Time Connected
          </span>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-6 text-sm">
            {error}
          </div>
        )}

        {/* Top KPIs Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <KpiCard 
            title="Available Vehicles" 
            count={`${availableVehicles} / ${data.vehicles.total}`} 
            icon={BsTruck} 
            color="green" 
          />
          <KpiCard 
            title="Active Dispatches" 
            count={activeTrips} 
            icon={BsCompass} 
            color="blue" 
          />
          <KpiCard 
            title="Fleet Utilization" 
            count={`${data.utilization}%`} 
            icon={BsPercent} 
            color="purple" 
          />
          <KpiCard 
            title="Vehicles In Shop" 
            count={data.openMaintenance} 
            icon={BsWrench} 
            color="yellow" 
          />
        </div>

        {/* Role Context Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Operations Overview</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <span className="text-gray-500 text-sm font-medium">Vehicles on the road</span>
                <span className="text-gray-800 font-bold text-sm bg-blue-50 px-3 py-1 rounded-lg">{activeVehicles}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <span className="text-gray-500 text-sm font-medium">Drivers currently on duty</span>
                <span className="text-gray-800 font-bold text-sm bg-blue-50 px-3 py-1 rounded-lg">{activeDrivers}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <span className="text-gray-500 text-sm font-medium">Pending dispatches (Drafts)</span>
                <span className="text-gray-800 font-bold text-sm bg-gray-50 px-3 py-1 rounded-lg">{data.trips.Draft || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 text-sm font-medium">Completed Deliveries</span>
                <span className="text-green-600 font-bold text-sm bg-green-50 px-3 py-1 rounded-lg">{data.trips.Completed || 0}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-3">Role Actions</h3>
              <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-4">Quick links</p>
              
              <div className="space-y-2">
                {user?.role === 'fleet_manager' && (
                  <>
                    <a href="/vehicles" className="block text-center text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg transition">
                      Manage Fleet Registry
                    </a>
                    <a href="/maintenance" className="block text-center text-sm font-bold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 py-3 rounded-lg transition">
                      Schedule Maintenance
                    </a>
                  </>
                )}
                {user?.role === 'driver' && (
                  <a href="/trips" className="block text-center text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg transition">
                    View Trip List
                  </a>
                )}
                {user?.role === 'safety_officer' && (
                  <a href="/drivers" className="block text-center text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg transition">
                    Driver Licenses & Star Scores
                  </a>
                )}
                {user?.role === 'financial_analyst' && (
                  <a href="/reports" className="block text-center text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg transition">
                    Financial Reports & ROI
                  </a>
                )}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100 flex items-center gap-3">
              <div className="bg-blue-50 text-blue-600 p-2.5 rounded-lg">
                <BsPerson className="text-xl" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase">Current Login</p>
                <p className="text-sm font-bold text-gray-800">{user?.name || user?.email}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
