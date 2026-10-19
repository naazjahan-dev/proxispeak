import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
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
  LogOut
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const isMockMode = import.meta.env.VITE_USE_MOCK_DATA !== 'false';

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
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

        {user && <div className="nav-user" title={user.email}><strong>{user.name}</strong><button className="nav-logout" onClick={logout} type="button"><LogOut size={14}/><span>Logout</span></button></div>}

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
