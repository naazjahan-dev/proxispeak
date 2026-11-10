import React, { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { 
  Radio, 
  Compass, 
  Library, 
  MapPin, 
  Database, 
  Menu, 
  X, 
  Activity,
  Layers,
  User,
  LogOut,
  LogIn
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isMockMode = import.meta.env.VITE_USE_MOCK_DATA !== 'false';

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    closeMobileMenu();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: Activity },
    { name: 'Nearby Audio', path: '/nearby', icon: Compass },
    { name: 'Audio Library', path: '/library', icon: Library },
    { name: 'Map View', path: '/map', icon: MapPin },
    { name: 'CSV Pipeline', path: '/processing', icon: Database },
  ];

  return (
    <nav className="navbar" aria-label="Main Navigation">
      {/* Brand Logo & Name */}
      <NavLink to="/" className="navbar-brand" onClick={closeMobileMenu}>
        <div className="brand-icon">
          <Radio size={20} className="animate-pulse" />
        </div>
        <div className="brand-text">
          <span className="brand-title">ProxiSpeak</span>
          <span className="brand-subtitle">Proximity Audio Ecosystem</span>
        </div>
      </NavLink>

      {/* Navigation Links */}
      <ul className={`nav-links ${mobileMenuOpen ? 'open' : ''}`}>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.path}>
              <NavLink
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `nav-item-link ${isActive ? 'active' : ''}`
                }
                onClick={closeMobileMenu}
              >
                <Icon size={16} />
                <span>{item.name}</span>
              </NavLink>
            </li>
          );
        })}
      </ul>

      {/* Actions & Status Pill */}
      <div className="navbar-actions">
        {/* Mock/Live Environment Status Indicator */}
        <div 
          className={`badge ${isMockMode ? 'badge-cyan' : 'badge-emerald'}`}
          title={isMockMode ? 'Operating with realistic mock dataset' : 'Connected to live backend'}
        >
          <Layers size={12} />
          <span>{isMockMode ? 'Mock Data Mode' : 'Live API'}</span>
        </div>

        {/* User Account / Auth Indicator */}
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="badge" style={{ background: 'rgba(255, 255, 255, 0.06)', color: 'var(--text-primary)' }}>
              <User size={12} />
              <span>{user.name.split(' ')[0]}</span>
            </div>
            <button
              type="button"
              className="btn-icon"
              onClick={handleLogout}
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <Link to="/login" className="btn btn-outline-cyan" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
            <LogIn size={14} />
            <span>Sign In</span>
          </Link>
        )}

        {/* Mobile Menu Toggle Button */}
        <button
          className="btn-icon mobile-menu-btn"
          onClick={toggleMobileMenu}
          aria-label={mobileMenuOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
        >
          {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
    </nav>
  );
}
