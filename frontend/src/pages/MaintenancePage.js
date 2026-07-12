import React, { useEffect, useState } from 'react';
import maintenanceService from '../services/maintenanceService';
import vehicleService from '../services/vehicleService';
import StatusBadge from '../components/ui/StatusBadge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Modal from '../components/ui/Modal';
import { toast } from 'react-toastify';
import { FaWrench, FaPlus, FaCalendarAlt, FaTools, FaCheck } from 'react-icons/fa';

export default function MaintenancePage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    vehicle_id: '',
    type: 'preventive',
    description: '',
    cost: '',
    scheduled_date: new Date().toISOString().split('T')[0]
  });

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await maintenanceService.getAll();
      setLogs(res.data.data);
    } catch (err) {
      toast.error('Failed to load maintenance logs');
    } finally {
      setLoading(false);
    }
  };

  const loadVehicles = async () => {
    try {
      const res = await vehicleService.getAll();
      // Only vehicles not retired/on trip can go to maintenance
      setVehicles(res.data.data.filter(v => ['Available', 'In Shop'].includes(v.status)));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    if (showModal) {
      loadVehicles();
    }
  }, [showModal]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await maintenanceService.create(form);
      toast.success('Maintenance scheduled. Vehicle set to "In Shop".');
      setShowModal(false);
      setForm({
        vehicle_id: '',
        type: 'preventive',
        description: '',
        cost: '',
        scheduled_date: new Date().toISOString().split('T')[0]
      });
      fetchLogs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to schedule maintenance');
    }
  };

  const handleCloseLog = async (id) => {
    const costInput = window.prompt('Enter final maintenance cost (INR):', '0');
    if (costInput === null) return; // cancel pressed

    const cost = parseFloat(costInput) || 0;
    try {
      await maintenanceService.close(id, { cost });
      toast.success('Maintenance closed. Vehicle restored to "Available".');
      fetchLogs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to close log');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-800 flex items-center gap-3">
              <FaWrench className="text-blue-600 text-3xl" /> Maintenance Center
            </h1>
            <p className="text-gray-500 text-sm mt-1">Schedule service intervals and record repair diagnostics</p>
          </div>
          <button 
            onClick={() => setShowModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 transition font-bold shadow-sm"
          >
            <FaPlus /> Schedule Maintenance
          </button>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : (
          <div className="space-y-4">
            {logs.length === 0 ? (
              <div className="bg-white p-12 rounded-xl border border-gray-100 shadow-sm text-center">
                <FaWrench className="text-6xl text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-xl font-bold">No maintenance files recorded.</p>
              </div>
            ) : (
              logs.map(log => (
                <div key={log.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:shadow-md transition">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="font-extrabold text-gray-800 text-lg uppercase">
                        {log.vehicle?.registration_number} ({log.vehicle?.model_name})
                      </h3>
                      <StatusBadge status={log.status} />
                    </div>
                    <p className="text-sm text-gray-600 mt-2 font-medium bg-gray-50 p-3 rounded-lg border border-gray-100">
                      🔧 <strong className="text-gray-700 capitalize">{log.type} Service:</strong> {log.description}
                    </p>
                    <div className="flex gap-4 text-xs text-gray-400 mt-3 font-semibold">
                      <span className="flex items-center gap-1"><FaCalendarAlt /> Scheduled: {log.scheduled_date}</span>
                      {log.completed_date && <span className="flex items-center gap-1"><FaCheck className="text-green-500" /> Completed: {log.completed_date}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0">
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase text-left md:text-right">Maintenance Cost</p>
                      <p className="font-extrabold text-gray-800 text-lg text-left md:text-right">₹{parseFloat(log.cost).toLocaleString()}</p>
                    </div>
                    {log.status === 'open' && (
                      <button 
                        onClick={() => handleCloseLog(log.id)}
                        className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-4 py-2.5 rounded-lg transition flex items-center gap-1 shadow-sm"
                      >
                        <FaTools /> Close File
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Schedule Modal */}
        <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Schedule Maintenance File">
          <form onSubmit={handleCreate} className="space-y-4">
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
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>{v.registration_number} ({v.model_name} — {v.status})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Service Type</label>
                <select
                  name="type"
                  value={form.type}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-700 bg-white"
                >
                  <option value="preventive">Preventive</option>
                  <option value="corrective">Corrective</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Schedule Date</label>
                <input
                  required
                  type="date"
                  name="scheduled_date"
                  value={form.scheduled_date}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-700 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Estimated Cost (INR)</label>
              <input
                type="number"
                name="cost"
                value={form.cost}
                onChange={handleChange}
                placeholder="5000"
                className="w-full border border-gray-300 rounded-lg p-3 text-sm outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Description / Diagnoses</label>
              <textarea
                required
                name="description"
                value={form.description}
                onChange={handleChange}
                rows="3"
                placeholder="Diagnostic notes, upcoming filter changes, etc."
                className="w-full border border-gray-300 rounded-lg p-3 text-sm outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold py-3 rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg text-sm shadow-sm"
              >
                Schedule Service
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  );
}
