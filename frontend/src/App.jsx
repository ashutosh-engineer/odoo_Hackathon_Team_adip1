/*
 * App Router & Entry Point
 * -------------------------
 * Sets up React Router with two layout modes:
 *   1. Auth pages (login/signup) — full-width, no sidebar
 *   2. Protected pages — sidebar layout with route guard
 *
 * Route guard checks auth state before rendering.
 * If user is not logged in, they're redirected to /login.
 */

import { useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import SplashScreen from './components/SplashScreen';
import PageLoader from './components/layout/PageLoader';

import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import TripList from './pages/TripList';
import TripCreate from './pages/TripCreate';
import TripView from './pages/TripView';
import ItineraryBuilder from './pages/ItineraryBuilder';
import CitySearch from './pages/CitySearch';
import ActivitySearch from './pages/ActivitySearch';
import Budget from './pages/Budget';
import Packing from './pages/Packing';
import Notes from './pages/Notes';
import Profile from './pages/Profile';
import SharedTrip from './pages/SharedTrip';

/* Route guard — redirects to login if not authenticated */
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader label="Restoring session…" />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

/* Redirect away from auth pages if already logged in */
function GuestRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader label="One moment…" />;
  if (user) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const dismissSplash = useCallback(() => setShowSplash(false), []);

  return (
    <AuthProvider>
      {showSplash && <SplashScreen onFinish={dismissSplash} />}

      <BrowserRouter>
        <Routes>
          {/* Public auth routes — no sidebar */}
          <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
          <Route path="/signup" element={<GuestRoute><Signup /></GuestRoute>} />
          <Route path="/forgot-password" element={<GuestRoute><ForgotPassword /></GuestRoute>} />
          <Route path="/shared/:token" element={<SharedTrip />} />

          {/* Protected routes — sidebar layout */}
          <Route element={<ProtectedRoute><Sidebar /></ProtectedRoute>}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/trips" element={<TripList />} />
            <Route path="/trips/new" element={<TripCreate />} />
            <Route path="/trips/:id" element={<TripView />} />
            <Route path="/trips/:id/itinerary" element={<ItineraryBuilder />} />
            <Route path="/trips/:id/budget" element={<Budget />} />
            <Route path="/trips/:id/packing" element={<Packing />} />
            <Route path="/trips/:id/notes" element={<Notes />} />
            <Route path="/cities" element={<CitySearch />} />
            <Route path="/activities" element={<ActivitySearch />} />
            <Route path="/profile" element={<Profile />} />
          </Route>

          {/* Catch-all — redirect unknown routes to dashboard */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
