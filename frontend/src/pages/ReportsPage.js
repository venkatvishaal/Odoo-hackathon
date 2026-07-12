import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchDashboard } from '../redux/slices/analyticsSlice';
import analyticsService from '../services/analyticsService';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { FaFileCsv, FaChartLine, FaGasPump, FaMoneyBillWave, FaCoins, FaTruck } from 'react-icons/fa';

export default function ReportsPage() {
  const dispatch = useDispatch();
  const { data, loading } = useSelector((state) => state.analytics);

  useEffect(() => {
    dispatch(fetchDashboard());
  }, [dispatch]);

  const handleExportCSV = () => {
    const url = analyticsService.exportCSV();
    window.open(url, '_blank');
  };

  if (loading && !data.operationalCosts.length) {
    return <LoadingSpinner />;
  }

  // Formatting data for Recharts Pie (Utilization Status)
  const vehicleStatusData = [
    { name: 'Available', value: data.vehicles.Available || 0, color: '#10B981' },
    { name: 'On Trip', value: data.vehicles['On Trip'] || 0, color: '#3B82F6' },
    { name: 'In Shop', value: data.vehicles['In Shop'] || 0, color: '#F59E0B' },
    { name: 'Retired', value: data.vehicles.Retired || 0, color: '#EF4444' }
  ].filter(v => v.value > 0);

  // Formatting Operational Cost stack
  const costBreakdownData = data.operationalCosts.map(item => ({
    name: item.registration_number,
    'Fuel Cost': parseFloat(item.total_fuel_cost),
    'Maintenance Cost': parseFloat(item.total_maintenance_cost)
  }));

  // Formatting Fuel Efficiency
  const efficiencyData = data.fuelEfficiency.map(item => ({
    name: item.vehicle?.registration_number || 'Veh',
    'Efficiency (KM/L)': parseFloat(item.efficiency)
  }));

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-800 flex items-center gap-3">
              <FaChartLine className="text-blue-600 text-3xl" /> Fleet Analytics & Reports
            </h1>
            <p className="text-gray-500 text-sm mt-1">Audit fleet performance, operational costs, fuel efficiency, and ROI metrics</p>
          </div>
          <button 
            onClick={handleExportCSV}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 transition font-bold shadow-sm"
          >
            <FaFileCsv className="text-lg" /> Export CSV Report
          </button>
        </div>

        {/* First Row of Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Pie Chart: Vehicle Status Allocation */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex flex-col justify-between">
            <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
              <FaTruck className="text-blue-500" /> Vehicle Allocation Share
            </h3>
            {vehicleStatusData.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-12">No allocation metrics available.</p>
            ) : (
              <div className="h-64 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={vehicleStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {vehicleStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Bar Chart: Fuel Efficiency */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex flex-col justify-between">
            <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
              <FaGasPump className="text-emerald-500" /> Fuel Economy Comparison (KM/L)
            </h3>
            {efficiencyData.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-12">No fuel efficiency logs completed yet.</p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={efficiencyData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" stroke="#9CA3AF" fontSize={10} tickLine={false} />
                    <YAxis stroke="#9CA3AF" fontSize={10} tickLine={false} />
                    <Tooltip />
                    <Bar dataKey="Efficiency (KM/L)" fill="#10B981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Second Row: Stacked Operational Cost Chart */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-8">
          <h3 className="text-base font-bold text-gray-800 mb-6 flex items-center gap-2">
            <FaMoneyBillWave className="text-yellow-500" /> Operating Cost Breakdown per Asset (INR)
          </h3>
          {costBreakdownData.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-12">No operational expenses logged yet.</p>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={costBreakdownData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" stroke="#9CA3AF" fontSize={10} tickLine={false} />
                  <YAxis stroke="#9CA3AF" fontSize={10} tickLine={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Fuel Cost" stackId="a" fill="#3B82F6" />
                  <Bar dataKey="Maintenance Cost" stackId="a" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* ROI Table Ledger */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 overflow-hidden">
          <h3 className="text-base font-bold text-gray-800 mb-6 flex items-center gap-2">
            <FaCoins className="text-purple-500" /> Asset Return On Investment Ledger (ROI)
          </h3>
          {data.operationalCosts.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-12">No financial operations on ledger.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 text-xs font-bold uppercase tracking-wider">
                    <th className="pb-3">Vehicle</th>
                    <th className="pb-3">Acquisition Cost</th>
                    <th className="pb-3">Total Operational Cost</th>
                    <th className="pb-3">Asset Value Ratio</th>
                  </tr>
                </thead>
                <tbody>
                  {data.operationalCosts.map(item => {
                    const ratio = parseFloat(item.acquisition_cost) > 0 
                      ? ((parseFloat(item.total_operational_cost) / parseFloat(item.acquisition_cost)) * 100).toFixed(1)
                      : 0;
                    return (
                      <tr key={item.vehicle_id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                        <td className="py-3.5 font-bold text-gray-700 uppercase">
                          {item.registration_number} ({item.model_name})
                        </td>
                        <td className="py-3.5 font-semibold text-gray-600">
                          ₹{parseFloat(item.acquisition_cost).toLocaleString()}
                        </td>
                        <td className="py-3.5 font-extrabold text-gray-800">
                          ₹{parseFloat(item.total_operational_cost).toLocaleString()}
                        </td>
                        <td className="py-3.5">
                          <span className={`text-xs font-extrabold px-2.5 py-1 rounded-lg uppercase tracking-wide border ${
                            parseFloat(ratio) > 50 
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : 'bg-green-50 text-green-700 border-green-200'
                          }`}>
                            {ratio}% Cost-to-Asset Ratio
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
