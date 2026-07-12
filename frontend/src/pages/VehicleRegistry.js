import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchVehicles, addVehicle, removeVehicle } from '../redux/slices/vehicleSlice';
import StatusBadge from '../components/ui/StatusBadge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Modal from '../components/ui/Modal';
import { toast } from 'react-toastify';
import { FaTruck, FaTrash, FaPlus, FaMapMarkerAlt, FaRoute, FaMoneyBillWave } from 'react-icons/fa';

export default function VehicleRegistry() {
  const dispatch = useDispatch();
  const { list: vehicles, loading, error } = useSelector((state) => state.vehicles);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    registration_number: '',
    model_name: '',
    vehicle_type: 'van',
    max_load_capacity_kg: '',
    odometer: '',
    acquisition_cost: '',
    region: ''
  });
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    dispatch(fetchVehicles());
  }, [dispatch]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (validationErrors[e.target.name]) {
      setValidationErrors({ ...validationErrors, [e.target.name]: null });
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setValidationErrors({});

    const res = await dispatch(addVehicle(form));
    if (addVehicle.fulfilled.match(res)) {
      toast.success('Vehicle registered successfully');
      setShowModal(false);
      setForm({
        registration_number: '',
        model_name: '',
        vehicle_type: 'van',
        max_load_capacity_kg: '',
        odometer: '',
        acquisition_cost: '',
        region: ''
      });
    } else {
      const errMsg = res.payload;
      if (typeof errMsg === 'object' && errMsg.errors) {
        const errMap = {};
        errMsg.errors.forEach(err => { errMap[err.field] = err.message; });
        setValidationErrors(errMap);
      } else {
        toast.error(res.payload || 'Failed to add vehicle');
      }
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to remove this vehicle?')) {
      const res = await dispatch(removeVehicle(id));
      if (removeVehicle.fulfilled.match(res)) {
        toast.success('Vehicle removed');
      } else {
        toast.error(res.payload || 'Failed to remove vehicle');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-800 flex items-center gap-3">
              <FaTruck className="text-blue-600 text-3xl" /> Vehicle Registry
            </h1>
            <p className="text-gray-500 text-sm mt-1">Manage active transport fleet assets</p>
          </div>
          <button 
            onClick={() => setShowModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 transition font-bold shadow-sm"
          >
            <FaPlus /> Add Vehicle
          </button>
        </div>

        {loading && vehicles.length === 0 ? (
          <LoadingSpinner />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vehicles.length === 0 ? (
              <div className="col-span-full bg-white p-12 rounded-xl border border-gray-100 shadow-sm text-center">
                <FaTruck className="text-6xl text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-xl font-bold">No vehicles in registry.</p>
              </div>
            ) : (
              vehicles.map(v => (
                <div key={v.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition">
                  <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                    <div>
                      <h3 className="font-extrabold text-gray-800 uppercase tracking-tight">{v.registration_number}</h3>
                      <p className="text-xs text-gray-500 font-bold uppercase mt-0.5">{v.model_name}</p>
                    </div>
                    <StatusBadge status={v.status} />
                  </div>
                  <div className="p-5 space-y-3.5">
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <FaRoute className="text-gray-400" />
                      <span>Odometer: <strong className="text-gray-800 font-bold">{parseFloat(v.odometer).toLocaleString()} km</strong></span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <FaMoneyBillWave className="text-gray-400" />
                      <span>Acquisition: <strong className="text-gray-800 font-bold">₹{parseFloat(v.acquisition_cost).toLocaleString()}</strong></span>
                    </div>
                    {v.region && (
                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        <FaMapMarkerAlt className="text-gray-400" />
                        <span>Operating Region: <strong className="text-gray-800 font-bold">{v.region}</strong></span>
                      </div>
                    )}

                    <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Cap: {v.max_load_capacity_kg} KG
                      </span>
                      <button 
                        onClick={() => handleDelete(v.id)}
                        className="text-red-500 hover:bg-red-50 p-2 rounded-full transition"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Add Modal */}
        <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add New Vehicle">
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Registration Number</label>
              <input
                required
                name="registration_number"
                value={form.registration_number}
                onChange={handleChange}
                placeholder="e.g. KA-01-VAN-05"
                className={`w-full border rounded-lg p-3 text-sm focus:ring-blue-500 focus:border-blue-500 outline-none ${
                  validationErrors.registration_number ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {validationErrors.registration_number && (
                <p className="text-[11px] text-red-500 font-bold mt-1 uppercase tracking-wide">
                  {validationErrors.registration_number}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Model Name</label>
                <input
                  required
                  name="model_name"
                  value={form.model_name}
                  onChange={handleChange}
                  placeholder="e.g. Van-05"
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Vehicle Type</label>
                <select
                  name="vehicle_type"
                  value={form.vehicle_type}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="bike">Bike</option>
                  <option value="van">Van</option>
                  <option value="truck">Truck</option>
                  <option value="mini_truck">Mini Truck</option>
                  <option value="container_truck">Container Truck</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Payload Capacity (KG)</label>
                <input
                  required
                  type="number"
                  name="max_load_capacity_kg"
                  value={form.max_load_capacity_kg}
                  onChange={handleChange}
                  placeholder="500"
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Initial Odometer (KM)</label>
                <input
                  required
                  type="number"
                  name="odometer"
                  value={form.odometer}
                  onChange={handleChange}
                  placeholder="12000"
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Acquisition Cost (INR)</label>
                <input
                  required
                  type="number"
                  name="acquisition_cost"
                  value={form.acquisition_cost}
                  onChange={handleChange}
                  placeholder="800000"
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Operating Region</label>
                <input
                  name="region"
                  value={form.region}
                  onChange={handleChange}
                  placeholder="South"
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
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
                Save Asset
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  );
}
