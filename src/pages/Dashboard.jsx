import React from 'react';
import { 
  Compass, 
  Library, 
  MapPin, 
  Database, 
  Radio, 
  MapPinOff,
  User,
  Sliders
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ProximityAudioListener from '../components/discovery/ProximityAudioListener';

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="dashboard-page">
      {/* Hero Welcome Section */}
      <section className="card-panel" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div className="badge badge-cyan" style={{ marginBottom: '10px' }}>
              <Radio size={12} className="animate-pulse" />
              <span>Geospatial Audio Ecosystem Active</span>
            </div>
            <h1 style={{ marginBottom: '8px' }}>
              {user ? `Welcome Back, ${user.name}` : 'Explore Your Acoustic Horizon'}
            </h1>
            <p style={{ maxWidth: '640px' }}>
              ProxiSpeak bridges physical proximity with rich audio experiences. Stream localized soundscapes, 
              historical recordings, community broadcasts, and live audio nodes around your physical coordinates.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Link to="/nearby" className="btn btn-primary">
              <Compass size={18} />
              <span>Scan Nearby Audio</span>
            </Link>
            <Link to="/map" className="btn btn-secondary">
              <MapPin size={18} />
              <span>Open Map</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Proximity-Based Audio Card Feature (ENTER / EXIT Event Section) */}
      <ProximityAudioListener showTestPanel={true} />

      {/* Quick Stats Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
        gap: '16px', 
        marginBottom: '28px' 
      }}>
        <div className="card-panel" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Location Status</span>
            <div className="badge badge-emerald">Ready</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Compass size={22} color="var(--status-emerald)" />
            <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>Proximity Active</span>
          </div>
          <p style={{ fontSize: '0.78rem', marginTop: '6px' }}>Range triggers listening for ENTER events</p>
        </div>

        <div className="card-panel" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Discovered Nodes</span>
            <div className="badge badge-cyan">In Range</div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>
            9 Nodes
          </div>
          <p style={{ fontSize: '0.78rem', marginTop: '6px' }}>Across mock metropolitan cluster</p>
        </div>

        <div className="card-panel" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Audio Library</span>
            <Library size={16} color="var(--accent-blue)" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>
            6 Categories
          </div>
          <p style={{ fontSize: '0.78rem', marginTop: '6px' }}>Nature, Heritage, Urban & Guide Notes</p>
        </div>

        <div className="card-panel" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Data Pipeline</span>
            <Database size={16} color="var(--accent-purple)" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--accent-purple)' }}>
            Ready
          </div>
          <p style={{ fontSize: '0.78rem', marginTop: '6px' }}>Stream ingestion engine idling</p>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <h3 style={{ marginBottom: '16px' }}>Explore Ecosystem Modules</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        <Link to="/nearby" style={{ textDecoration: 'none' }}>
          <div className="card-panel" style={{ height: '100%', transition: 'all var(--transition-fast)' }}>
            <div style={{ 
              width: '42px', 
              height: '42px', 
              borderRadius: 'var(--radius-md)', 
              background: 'rgba(6, 182, 212, 0.15)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: 'var(--accent-cyan)',
              marginBottom: '14px'
            }}>
              <Compass size={22} />
            </div>
            <h4 style={{ marginBottom: '6px' }}>Nearby Audio Discovery</h4>
            <p>Scan for audio nodes near your live coordinates using the Haversine distance formula.</p>
          </div>
        </Link>

        <Link to="/library" style={{ textDecoration: 'none' }}>
          <div className="card-panel" style={{ height: '100%', transition: 'all var(--transition-fast)' }}>
            <div style={{ 
              width: '42px', 
              height: '42px', 
              borderRadius: 'var(--radius-md)', 
              background: 'rgba(59, 130, 246, 0.15)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: 'var(--accent-blue)',
              marginBottom: '14px'
            }}>
              <Library size={22} />
            </div>
            <h4 style={{ marginBottom: '6px' }}>Audio Library</h4>
            <p>Browse, filter, and stream audio narratives, local guide notes, and ambient captures.</p>
          </div>
        </Link>

        <Link to="/map" style={{ textDecoration: 'none' }}>
          <div className="card-panel" style={{ height: '100%', transition: 'all var(--transition-fast)' }}>
            <div style={{ 
              width: '42px', 
              height: '42px', 
              borderRadius: 'var(--radius-md)', 
              background: 'rgba(16, 185, 129, 0.15)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: 'var(--status-emerald)',
              marginBottom: '14px'
            }}>
              <MapPin size={22} />
            </div>
            <h4 style={{ marginBottom: '6px' }}>Interactive Geospatial Map</h4>
            <p>Visualize audio markers spatially on an interactive OpenStreetMap surface.</p>
          </div>
        </Link>

        <Link to="/processing" style={{ textDecoration: 'none' }}>
          <div className="card-panel" style={{ height: '100%', transition: 'all var(--transition-fast)' }}>
            <div style={{ 
              width: '42px', 
              height: '42px', 
              borderRadius: 'var(--radius-md)', 
              background: 'rgba(139, 92, 246, 0.15)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: 'var(--accent-purple)',
              marginBottom: '14px'
            }}>
              <Database size={22} />
            </div>
            <h4 style={{ marginBottom: '6px' }}>Large CSV Processing Pipeline</h4>
            <p>Upload large CSV datasets, map audio coordinates, and inspect streamed parsing jobs.</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
