import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logoutSuccess } from '../../redux/slices/authSlice';
import { toast } from 'react-toastify';
import { BsTruck } from 'react-icons/bs';

export default function Navbar() {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logoutSuccess());
    toast.info('Logged out successfully');
    navigate('/login');
  };

  const getDashboardLink = () => {
    return '/dashboard';
  };

  const formatRole = (role) => {
    if (!role) return '';
    return role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <nav className="bg-blue-700 text-white px-6 py-3 flex justify-between items-center shadow-md">
      {/* Logo */}
      <Link to="/" className="text-xl font-bold tracking-wide flex items-center">
        <BsTruck className="mr-2 text-2xl" /> TransitOps
      </Link>

      {/* Navigation */}
      <div className="flex gap-6 items-center">
        {isAuthenticated ? (
          <>
            <Link to={getDashboardLink()} className="text-sm font-medium hover:text-blue-200 transition">
              Dashboard
            </Link>

            {/* Role-Specific Navigation Links */}
            {user?.role === 'fleet_manager' && (
              <>
                <Link to="/vehicles" className="text-sm font-medium hover:text-blue-200 transition">
                  Vehicles
                </Link>
                <Link to="/drivers" className="text-sm font-medium hover:text-blue-200 transition">
                  Drivers
                </Link>
                <Link to="/maintenance" className="text-sm font-medium hover:text-blue-200 transition">
                  Maintenance
                </Link>
                <Link to="/reports" className="text-sm font-medium hover:text-blue-200 transition">
                  Reports
                </Link>
              </>
            )}

            {user?.role === 'driver' && (
              <>
                <Link to="/trips" className="text-sm font-medium hover:text-blue-200 transition">
                  My Trips
                </Link>
                <Link to="/fuel-logs" className="text-sm font-medium hover:text-blue-200 transition">
                  Fuel Logs
                </Link>
              </>
            )}

            {user?.role === 'safety_officer' && (
              <>
                <Link to="/drivers" className="text-sm font-medium hover:text-blue-200 transition">
                  Drivers
                </Link>
              </>
            )}

            {user?.role === 'financial_analyst' && (
              <>
                <Link to="/reports" className="text-sm font-medium hover:text-blue-200 transition">
                  Reports
                </Link>
                <Link to="/fuel-logs" className="text-sm font-medium hover:text-blue-200 transition">
                  Expenses
                </Link>
              </>
            )}

            {/* Public/Shared Cargo tracking */}
            <Link to="/track" className="text-sm font-bold bg-blue-800 px-3 py-1.5 rounded-lg hover:bg-blue-900 transition">
              📦 Track Cargo
            </Link>

            {/* Shared Fleet — visible to all roles */}
            <Link to="/shared-search" className="text-sm font-bold bg-blue-800 px-3 py-1.5 rounded-lg hover:bg-blue-900 transition">
              🚀 Find Shared Cargo
            </Link>

            <div className="flex items-center gap-4 border-l border-blue-600 pl-4">
              <div className="text-right">
                <p className="text-xs font-semibold text-blue-200">{formatRole(user?.role)}</p>
                <p className="text-sm font-medium">{user?.name || user?.username}</p>
              </div>
              <button
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition"
              >
                Logout
              </button>
            </div>
          </>
        ) : (
          <>
            <Link to="/track" className="text-sm font-semibold hover:text-blue-200 transition mr-2">
              📦 Track Cargo
            </Link>
            <Link to="/login" className="text-sm hover:text-blue-200 transition">
              Login
            </Link>
            <Link
              to="/register"
              className="bg-white text-blue-700 hover:bg-blue-50 px-4 py-1.5 rounded-lg text-sm font-semibold transition"
            >
              Register
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
