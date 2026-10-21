import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchDashboard } from '../redux/slices/analyticsSlice';
import analyticsService from '../services/analyticsService';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { FaFileCsv, FaChartLine, FaGasPump, FaMoneyBillWave, FaCoins, FaTruck } from 'react-icons/fa';
import { BsDownload, BsFileEarmarkExcel, BsFileEarmarkPdf } from 'react-icons/bs';
import { toast } from 'react-toastify';
import Menu from '../components/ui/Menu';
import { canExportFinance, downloadBlob, exportExcel, exportPdf, fileDate, num, pdfMoney } from '../utils/reportExport';

// Same cost-to-asset ratio the ROI ledger shows.
const assetRatio = (item) => (num(item.acquisition_cost) > 0 ? (num(item.total_operational_cost) / num(item.acquisition_cost)) * 100 : 0);

function reportTables(data) {
  const status = (obj, keys) => keys.map((k) => [k, obj?.[k] ?? 0]);
  const summary = [
    ['Fleet utilisation', `${data.utilization ?? 0}%`],
    ['Open maintenance logs', data.openMaintenance ?? 0],
    ...status(data.vehicles, ['Available', 'On Trip', 'In Shop', 'Retired']).map(([k, v]) => [`Vehicles · ${k}`, v]),
    ...status(data.drivers, ['Available', 'On Trip', 'Off Duty', 'Suspended']).map(([k, v]) => [`Drivers · ${k}`, v]),
    ...status(data.trips, ['Draft', 'Dispatched', 'Completed', 'Cancelled']).map(([k, v]) => [`Trips · ${k}`, v]),
  ];
  const costs = data.operationalCosts.map((c) => ({
    vehicle: c.registration_number,
    model: c.model_name,
    acquisition: num(c.acquisition_cost),
    fuel: num(c.total_fuel_cost),
    maintenance: num(c.total_maintenance_cost),
    expenses: num(c.total_expense_cost),
    total: num(c.total_operational_cost),
    ratio: Number(assetRatio(c).toFixed(1)),
  }));
  const efficiency = data.fuelEfficiency.map((e) => ({
    vehicle: e.vehicle?.registration_number || '—',
    distance: num(e.total_distance),
    fuel: num(e.total_fuel),
    kmpl: num(e.efficiency),
  }));
  const sum = (key) => costs.reduce((a, r) => a + r[key], 0);
  const costTotals = { vehicle: `Total (${costs.length})`, acquisition: sum('acquisition'), fuel: sum('fuel'), maintenance: sum('maintenance'), expenses: sum('expenses'), total: sum('total') };
  return { summary, costs, efficiency, costTotals };
}

export default function ReportsPage() {
  const dispatch = useDispatch();
  const { data, loading } = useSelector((state) => state.analytics);
  const role = useSelector((state) => state.auth.user?.role);

  useEffect(() => {
    dispatch(fetchDashboard());
  }, [dispatch]);

  // Goes through the API client so the auth token is sent (a plain window.open always got a 401).
  const handleExportCSV = async () => {
    try {
      const res = await analyticsService.exportCSV();
      downloadBlob(res.data, `transitops_fleet_register_${fileDate()}.csv`);
    } catch (err) {
      toast.error(err.response?.status === 403 ? 'You do not have access to this export.' : 'CSV export failed.');
    }
  };

  const runExport = async (format) => {
    const { summary, costs, efficiency, costTotals } = reportTables(data);
    const name = `transitops_fleet_report_${fileDate()}`;
    try {
      if (format === 'xlsx') {
        const money = '₹#,##0';
        await exportExcel({
          fileName: `${name}.xlsx`,
          sheets: [
            {
              name: 'Summary', title: 'Fleet Analytics Summary',
              columns: [{ header: 'Metric', key: 'k', width: 30 }, { header: 'Value', key: 'v', width: 14 }],
              rows: summary.map(([k, v]) => ({ k, v })),
            },
            {
              name: 'Operational Costs', title: 'Operational Costs by Vehicle',
              columns: [
                { header: 'Vehicle', key: 'vehicle', width: 18 }, { header: 'Model', key: 'model', width: 22 },
                { header: 'Fuel Cost', key: 'fuel', width: 14, numFmt: money }, { header: 'Maintenance Cost', key: 'maintenance', width: 18, numFmt: money },
                { header: 'Tolls & Other', key: 'expenses', width: 16, numFmt: money },
                { header: 'Total Operational Cost', key: 'total', width: 22, numFmt: money },
              ],
              rows: costs, totals: costTotals,
            },
            {
              name: 'Fuel Efficiency', title: 'Fuel Efficiency (completed trips)',
              columns: [
                { header: 'Vehicle', key: 'vehicle', width: 18 }, { header: 'Distance (km)', key: 'distance', width: 16, numFmt: '#,##0.0' },
                { header: 'Fuel (L)', key: 'fuel', width: 12, numFmt: '0.00' }, { header: 'Efficiency (km/L)', key: 'kmpl', width: 18, numFmt: '0.00' },
              ],
              rows: efficiency,
            },
            {
              name: 'ROI Ledger', title: 'Asset Return on Investment Ledger',
              columns: [
                { header: 'Vehicle', key: 'vehicle', width: 18 }, { header: 'Model', key: 'model', width: 22 },
                { header: 'Acquisition Cost', key: 'acquisition', width: 18, numFmt: money }, { header: 'Total Operational Cost', key: 'total', width: 22, numFmt: money },
                { header: 'Cost-to-Asset Ratio', key: 'ratio', width: 20, numFmt: '0.0"%"' },
              ],
              rows: costs, totals: costTotals,
            },
          ],
        });
      } else {
        await exportPdf({
          fileName: `${name}.pdf`,
          title: 'Fleet Analytics & Reports',
          subtitle: 'Operational costs, fuel efficiency and asset ROI',
          summary: summary.map(([k, v]) => [k, String(v)]),
          sections: [
            {
              heading: 'Operational Costs by Vehicle',
              columns: ['Vehicle', 'Model', 'Fuel Cost', 'Maintenance Cost', 'Tolls & Other', 'Total Operational Cost'],
              rows: costs.map((r) => [r.vehicle, r.model, pdfMoney(r.fuel), pdfMoney(r.maintenance), pdfMoney(r.expenses), pdfMoney(r.total)]),
              totals: [costTotals.vehicle, '', pdfMoney(costTotals.fuel), pdfMoney(costTotals.maintenance), pdfMoney(costTotals.expenses), pdfMoney(costTotals.total)],
            },
            {
              heading: 'Fuel Efficiency (completed trips)',
              columns: ['Vehicle', 'Distance (km)', 'Fuel (L)', 'Efficiency (km/L)'],
              rows: efficiency.map((r) => [r.vehicle, r.distance.toLocaleString('en-IN'), r.fuel.toFixed(2), r.kmpl.toFixed(2)]),
            },
            {
              heading: 'Asset Return on Investment Ledger',
              columns: ['Vehicle', 'Model', 'Acquisition Cost', 'Total Operational Cost', 'Cost-to-Asset Ratio'],
              rows: costs.map((r) => [r.vehicle, r.model, pdfMoney(r.acquisition), pdfMoney(r.total), `${r.ratio.toFixed(1)}%`]),
            },
          ],
        });
      }
      toast.success(`${format === 'xlsx' ? 'Excel' : 'PDF'} report downloaded`);
    } catch (err) {
      console.error('Export failed:', err);
      toast.error('Export failed. Please try again.');
    }
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
    'Maintenance Cost': parseFloat(item.total_maintenance_cost),
    'Tolls & Other': parseFloat(item.total_expense_cost || 0)
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
          {canExportFinance(role) && (
            <Menu
              label="Export fleet analytics report"
              buttonLabel="Export"
              buttonIcon={BsDownload}
              items={[
                { label: 'Excel workbook (.xlsx)', icon: BsFileEarmarkExcel, onSelect: () => runExport('xlsx') },
                { label: 'PDF report', icon: BsFileEarmarkPdf, onSelect: () => runExport('pdf') },
                { label: 'Fleet register (.csv)', icon: FaFileCsv, onSelect: handleExportCSV },
              ]}
            />
          )}
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
                  <Bar dataKey="Maintenance Cost" stackId="a" fill="#F59E0B" />
                  <Bar dataKey="Tolls & Other" stackId="a" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
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
