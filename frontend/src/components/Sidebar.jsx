/*
 * Sidebar Layout
 * ---------------
 * Persistent navigation sidebar for authenticated pages.
 * Amazon Seller Central / AWS Console dark sidebar style.
 * #232f3e background, #febd69 active highlight, left border accent.
 */

import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Map, PlusCircle, Globe, Compass,
  Settings, LogOut, Menu, X
} from 'lucide-react';

// Traveloop SVG logo — Amazon yellow fill
function TravelloopLogo({ size = 24 }) {
  return (
    <svg
      width={size}
      height={Math.round(size * 46 / 48)}
      viewBox="0 0 48 46"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        fill="#febd69"
        d="M25.946 44.938c-.664.845-2.021.375-2.021-.698V33.937a2.26 2.26 0 0 0-2.262-2.262H10.287c-.92 0-1.456-1.04-.92-1.788l7.48-10.471c1.07-1.497 0-3.578-1.842-3.578H1.237c-.92 0-1.456-1.04-.92-1.788L10.013.474c.214-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.471c-1.07 1.498 0 3.579 1.842 3.579h11.377c.943 0 1.473 1.088.89 1.83L25.947 44.94z"
      />
    </svg>
  );
}

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  // Nav items grouped by section
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
        {/* Logo bar — matches topbar height, uses navy bg */}
        <div className="sidebar-logo">
          <div className="logo-icon">
            <TravelloopLogo size={22} />
          </div>
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
                  <link.icon size={16} />
                  {link.label}
                </NavLink>
              ))}
            </div>
          ))}

          {/* Logout — separate button, not a route link */}
          <div className="nav-section" style={{ marginTop: 'auto' }}>
            <button
              className="nav-link"
              onClick={handleLogout}
              style={{ border: 'none', background: 'none', width: '100%', cursor: 'pointer', textAlign: 'left' }}
            >
              <LogOut size={16} />
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
      <button
        className="mobile-toggle"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle menu"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>
    </div>
  );
}
