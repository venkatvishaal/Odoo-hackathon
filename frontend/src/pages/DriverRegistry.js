import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchDrivers, addDriver, removeDriver } from '../redux/slices/driverSlice';
import StatusBadge from '../components/ui/StatusBadge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Modal from '../components/ui/Modal';
import { toast } from 'react-toastify';
import { FaUserPlus, FaTrash, FaIdCard, FaStar, FaPhone, FaCalendarAlt, FaPlus } from 'react-icons/fa';

export default function DriverRegistry() {
  const dispatch = useDispatch();
  const { list: drivers, loading } = useSelector((state) => state.drivers);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: '',
    license_number: '',
    license_category: 'LMV',
    license_expiry_date: '',
    contact_number: '',
    safety_score: '5.0'
  });
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    dispatch(fetchDrivers());
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

    const res = await dispatch(addDriver(form));
    if (addDriver.fulfilled.match(res)) {
      toast.success('Driver registered successfully');
      setShowModal(false);
      setForm({
        name: '',
        license_number: '',
        license_category: 'LMV',
        license_expiry_date: '',
        contact_number: '',
        safety_score: '5.0'
      });
    } else {
      const errMsg = res.payload;
      if (typeof errMsg === 'object' && errMsg.errors) {
        const errMap = {};
        errMsg.errors.forEach(err => { errMap[err.field] = err.message; });
        setValidationErrors(errMap);
      } else {
        toast.error(res.payload || 'Failed to register driver');
      }
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Remove this driver from registry?')) {
      const res = await dispatch(removeDriver(id));
      if (removeDriver.fulfilled.match(res)) {
        toast.success('Driver removed');
      } else {
        toast.error(res.payload || 'Failed to remove driver');
      }
    }
  };

  const getLicenseWarning = (expiryDate) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { text: 'Expired', color: 'text-red-600 bg-red-50 border-red-200' };
    }
    if (diffDays <= 30) {
      return { text: `Expires in ${diffDays} days`, color: 'text-amber-600 bg-amber-50 border-amber-200' };
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-800 flex items-center gap-3">
              <FaUserPlus className="text-blue-600 text-3xl" /> Driver Registry
            </h1>
            <p className="text-gray-500 text-sm mt-1">Monitor compliance, licensing validity, and safety metrics</p>
          </div>
          <button 
            onClick={() => setShowModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 transition font-bold shadow-sm"
          >
            <FaPlus /> Add Driver
          </button>
        </div>

        {loading && drivers.length === 0 ? (
          <LoadingSpinner />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {drivers.length === 0 ? (
              <div className="col-span-full bg-white p-12 rounded-xl border border-gray-100 shadow-sm text-center">
                <FaUserPlus className="text-6xl text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-xl font-bold">No drivers registered yet.</p>
              </div>
            ) : (
              drivers.map(d => {
                const licenseAlert = getLicenseWarning(d.license_expiry_date);
                return (
                  <div key={d.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition flex flex-col justify-between">
                    <div>
                      <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                        <div>
                          <h3 className="font-extrabold text-gray-800">{d.name}</h3>
                          <p className="text-xs text-gray-500 font-bold uppercase mt-0.5">{d.license_category} Category</p>
                        </div>
                        <StatusBadge status={d.status} />
                      </div>
                      
                      <div className="p-5 space-y-3">
                        <div className="flex items-center gap-3 text-sm text-gray-600">
                          <FaIdCard className="text-gray-400" />
                          <span>License: <strong className="text-gray-800">{d.license_number}</strong></span>
                        </div>
                        
                        <div className="flex items-center gap-3 text-sm text-gray-600">
                          <FaCalendarAlt className="text-gray-400" />
                          <span>Expires: <strong className="text-gray-800">{d.license_expiry_date}</strong></span>
                        </div>

                        {licenseAlert && (
                          <div className={`text-xs font-bold px-3 py-1.5 rounded-lg border uppercase tracking-wider ${licenseAlert.color}`}>
                            ⚠️ {licenseAlert.text}
                          </div>
                        )}

                        <div className="flex items-center gap-3 text-sm text-gray-600">
                          <FaPhone className="text-gray-400" />
                          <span>Phone: <strong className="text-gray-800">{d.contact_number}</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="p-5 pt-0">
                      <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                        <div className="flex items-center gap-1 text-sm">
                          <FaStar className="text-amber-400" />
                          <span className="font-extrabold text-gray-700">{d.safety_score}</span>
                          <span className="text-xs text-gray-400">/ 10</span>
                        </div>
                        <button 
                          onClick={() => handleDelete(d.id)}
                          className="text-red-500 hover:bg-red-50 p-2 rounded-full transition"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Modal */}
        <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Register Driver">
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Driver Name</label>
              <input
                required
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. Alex"
                className="w-full border border-gray-300 rounded-lg p-3 text-sm outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">License Number</label>
              <input
                required
                name="license_number"
                value={form.license_number}
                onChange={handleChange}
                placeholder="e.g. KA-DL-2028-001"
                className={`w-full border rounded-lg p-3 text-sm outline-none focus:ring-blue-500 focus:border-blue-500 ${
                  validationErrors.license_number ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {validationErrors.license_number && (
                <p className="text-[11px] text-red-500 font-bold mt-1 uppercase tracking-wide">
                  {validationErrors.license_number}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">License Category</label>
                <input
                  required
                  name="license_category"
                  value={form.license_category}
                  onChange={handleChange}
                  placeholder="e.g. LMV"
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">License Expiration</label>
                <input
                  required
                  type="date"
                  name="license_expiry_date"
                  value={form.license_expiry_date}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Contact Number</label>
                <input
                  required
                  name="contact_number"
                  value={form.contact_number}
                  onChange={handleChange}
                  placeholder="9876543210"
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Safety Rating (0-10)</label>
                <input
                  required
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  name="safety_score"
                  value={form.safety_score}
                  onChange={handleChange}
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
                Register Driver
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  );
}
