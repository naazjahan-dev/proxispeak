import React from 'react';
import { Compass, RefreshCw, AlertCircle } from 'lucide-react';

export default function NearbyAudio() {
  return (
    <div className="nearby-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Compass size={28} color="var(--accent-cyan)" />
            <span>Nearby Audio Discovery</span>
          </h1>
          <p>Explore acoustic nodes broadcast within your current geographical perimeter.</p>
        </div>
        <button className="btn btn-primary" id="request-location-btn">
          <RefreshCw size={16} />
          <span>Scan Current Location</span>
        </button>
      </div>

      <div className="card-panel" style={{ textAlign: 'center', padding: '48px 24px' }}>
        <div style={{ 
          width: '56px', 
          height: '56px', 
          borderRadius: '50%', 
          background: 'rgba(6, 182, 212, 0.12)', 
          color: 'var(--accent-cyan)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          margin: '0 auto 16px auto' 
        }}>
          <Compass size={28} />
        </div>
        <h3 style={{ marginBottom: '8px' }}>Location Permission Required</h3>
        <p style={{ maxWidth: '480px', margin: '0 auto 20px auto' }}>
          To measure accurate proximity using the Haversine formula, ProxiSpeak requests your browser's location coordinates.
        </p>
        <button className="btn btn-outline-cyan">
          Grant Location Access
        </button>
      </div>
    </div>
  );
}
