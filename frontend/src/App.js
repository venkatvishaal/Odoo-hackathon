import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import LandingPage from './pages/LandingPage';
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
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import AccountPage from './pages/AccountPage';
import NotFoundPage from './pages/NotFoundPage';
import { PrivacyPage, TermsPage } from './pages/LegalPages';

import AppShell from './components/layout/AppShell';
import PrivateRoute from './components/layout/PrivateRoute';

export default function App() {
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  return (
    <Router>
      <ToastContainer position="bottom-right" autoClose={3000} />
      <AppShell>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/account" element={<PrivateRoute><AccountPage /></PrivateRoute>} />

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
            <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LandingPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
      </AppShell>
    </Router>
  );
}
