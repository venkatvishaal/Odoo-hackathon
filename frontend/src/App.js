import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Dashboard from './pages/Dashboard';
import VehicleRegistry from './pages/VehicleRegistry';
import DriverRegistry from './pages/DriverRegistry';
import TripPlanner from './pages/TripPlanner';
import MaintenancePage from './pages/MaintenancePage';
import FuelExpensePage from './pages/FuelExpensePage';
import ReportsPage from './pages/ReportsPage';
import SharedShipmentSearch from './pages/SharedShipmentSearch';
import ShipperTracking from './pages/ShipperTracking';

import Navbar from './components/layout/Navbar';
import PrivateRoute from './components/layout/PrivateRoute';

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Toast Container */}
        <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />

        {/* Global Navbar */}
        <Navbar />

        {/* Page Content */}
        <div className="flex-1">
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Protected Routes */}
            <Route 
              path="/dashboard" 
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              } 
            />
            
            <Route 
              path="/vehicles" 
              element={
                <PrivateRoute allowedRoles={['fleet_manager']}>
                  <VehicleRegistry />
                </PrivateRoute>
              } 
            />
            
            <Route 
              path="/drivers" 
              element={
                <PrivateRoute allowedRoles={['fleet_manager', 'safety_officer']}>
                  <DriverRegistry />
                </PrivateRoute>
              } 
            />
            
            <Route 
              path="/trips" 
              element={
                <PrivateRoute allowedRoles={['fleet_manager', 'driver']}>
                  <TripPlanner />
                </PrivateRoute>
              } 
            />
            
            <Route 
              path="/maintenance" 
              element={
                <PrivateRoute allowedRoles={['fleet_manager']}>
                  <MaintenancePage />
                </PrivateRoute>
              } 
            />
            
            <Route 
              path="/fuel-logs" 
              element={
                <PrivateRoute allowedRoles={['fleet_manager', 'driver', 'financial_analyst']}>
                  <FuelExpensePage />
                </PrivateRoute>
              } 
            />
            
            <Route 
              path="/reports" 
              element={
                <PrivateRoute allowedRoles={['fleet_manager', 'financial_analyst']}>
                  <ReportsPage />
                </PrivateRoute>
              } 
            />

            <Route 
              path="/shared-search" 
              element={
                <PrivateRoute>
                  <SharedShipmentSearch />
                </PrivateRoute>
              } 
            />

            {/* Public Tracking Portal */}
            <Route path="/track" element={<ShipperTracking />} />
            <Route path="/track/:tripId" element={<ShipperTracking />} />

            {/* Fallbacks */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}
