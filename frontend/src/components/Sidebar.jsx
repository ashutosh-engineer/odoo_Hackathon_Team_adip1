/*
 * Sidebar Layout
 * ---------------
 * Persistent navigation sidebar for authenticated pages.
 * Shows navigation links, user badge, and a mobile toggle.
 *
 * Why a sidebar instead of a top navbar?
 *   - Travel apps have many sections (trips, cities, budget, packing, etc.)
 *   - Sidebar accommodates more links without crowding
 *   - Feels more like a productivity tool (Notion, Linear style)
 *   - Collapses gracefully on mobile with overlay
 */

import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Map, PlusCircle, Globe, Compass,
  Settings, LogOut, Menu, X
} from 'lucide-react';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  // Nav items grouped by section for readability
  const navSections = [
    {
      title: 'Navigate',
      links: [
        { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/trips', icon: Map, label: 'My Trips' },
        { to: '/trips/new', icon: PlusCircle, label: 'New Trip' },
      ]
    },
    {
      title: 'Discover',
      links: [
        { to: '/cities', icon: Globe, label: 'Explore Cities' },
        { to: '/activities', icon: Compass, label: 'Activities' },
      ]
    },
    {
      title: 'Account',
      links: [
        { to: '/profile', icon: Settings, label: 'Settings' },
      ]
    }
  ];

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="logo-icon">✈</div>
          <h1>Traveloop</h1>
        </div>

        <nav className="sidebar-nav">
          {navSections.map((section) => (
            <div key={section.title}>
              <div className="nav-section">
                <span className="nav-section-title">{section.title}</span>
              </div>
              {section.links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === '/'}
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                  onClick={() => setMobileOpen(false)}
                >
                  <link.icon size={18} />
                  {link.label}
                </NavLink>
              ))}
            </div>
          ))}

          {/* Logout as a separate button, not a route link */}
          <div className="nav-section">
            <button className="nav-link" onClick={handleLogout} style={{ border: 'none', background: 'none', width: '100%', cursor: 'pointer', textAlign: 'left' }}>
              <LogOut size={18} />
              Log Out
            </button>
          </div>
        </nav>

        {/* User badge at the bottom */}
        {user && (
          <div className="sidebar-footer">
            <div className="user-badge">
              <div className="user-avatar">{user.initials}</div>
              <div className="user-info">
                <div className="user-name">{user.name}</div>
                <div className="user-email">{user.email}</div>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Dark overlay on mobile */}
      {mobileOpen && (
        <div className="sidebar-overlay active" onClick={() => setMobileOpen(false)} />
      )}

      {/* Main content — Outlet renders the matched child route */}
      <main className="main-content">
        <Outlet />
      </main>

      {/* Mobile toggle */}
      <button className="mobile-toggle" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle menu">
        {mobileOpen ? <X size={22} /> : <Menu size={22} />}
      </button>
    </div>
  );
}
