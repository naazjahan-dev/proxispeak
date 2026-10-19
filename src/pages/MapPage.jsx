import React from 'react';
import { MapPin, Navigation } from 'lucide-react';

export default function MapPage() {
  return (
    <div className="map-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <MapPin size={28} color="var(--status-emerald)" />
            <span>Geospatial Map</span>
          </h1>
          <p>Interactive spatial mapping of physical audio sources and proximity radials.</p>
        </div>
        <button className="btn btn-secondary">
          <Navigation size={16} />
          <span>Center on Me</span>
        </button>
      </div>

      <div className="card-panel" style={{ height: '500px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <MapPin size={40} color="var(--status-emerald)" style={{ marginBottom: '16px' }} />
        <h3>Geospatial Map Module Initializing</h3>
        <p style={{ marginTop: '6px' }}>OpenStreetMap tile provider connecting...</p>
      </div>
    </div>
  );
}
