import React, { useState, useEffect } from 'react';
import { 
  Compass, 
  RefreshCw, 
  MapPin, 
  Filter, 
  Layers, 
  Radio, 
  AlertCircle 
} from 'lucide-react';
import { getNearbyAudioSources } from '../services/audioService';
import { RADIUS_PRESETS, DEFAULT_MOCK_LOCATION } from '../services/locationService';
import ProximityAudioListener from '../components/discovery/ProximityAudioListener';
import AudioCard from '../components/discovery/AudioCard';

export default function NearbyAudio() {
  const [radiusKm, setRadiusKm] = useState(5.0);
  const [sources, setSources] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(DEFAULT_MOCK_LOCATION);
  const [locationStatus, setLocationStatus] = useState('simulated'); // 'idle' | 'requesting' | 'granted' | 'denied' | 'simulated'

  // Fetch nearby sources when location or radius changes
  const loadNearbySources = async (coords = userLocation, radius = radiusKm) => {
    setIsLoading(true);
    try {
      const data = await getNearbyAudioSources({
        latitude: coords.latitude,
        longitude: coords.longitude,
        radiusKm: radius
      });
      setSources(data);
    } catch (err) {
      console.error('Failed to load nearby sources:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNearbySources();
  }, [radiusKm]);

  // Request real browser geolocation
  const handleRequestLiveLocation = () => {
    if (!navigator.geolocation) {
      alert('Browser geolocation is not supported on this device.');
      return;
    }

    setLocationStatus('requesting');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        };
        setUserLocation(coords);
        setLocationStatus('granted');
        loadNearbySources(coords, radiusKm);
      },
      (error) => {
        console.warn('Geolocation denied or unavailable:', error.message);
        setLocationStatus('denied');
        // Keep simulated metropolitan cluster
        loadNearbySources(DEFAULT_MOCK_LOCATION, radiusKm);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  return (
    <div className="nearby-page">
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Compass size={28} color="var(--accent-cyan)" />
            <span>Nearby Indian Places</span>
          </h1>
          <p>Discover Indian monuments, museums and heritage places near your current location. Select a place guide to hear its history in Hindi or English.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button 
            type="button" 
            className="btn btn-outline-cyan"
            onClick={handleRequestLiveLocation}
            title="Detect your current location using GPS"
          >
            <RefreshCw size={16} className={locationStatus === 'requesting' ? 'animate-spin' : ''} />
            <span>{locationStatus === 'granted' ? 'GPS Active' : 'Use My GPS'}</span>
          </button>
        </div>
      </div>

      {/* Real-Time Geolocation Range Trigger Feature (ENTER/EXIT Listener) */}
      <ProximityAudioListener showTestPanel={true} />

      {/* Proximity Radius Controls */}
      <div className="card-panel" style={{ padding: '16px 20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={16} color="var(--accent-cyan)" />
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Proximity Boundary:</span>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {RADIUS_PRESETS.map(preset => (
              <button
                key={preset.value}
                type="button"
                className={`btn ${radiusKm === preset.value ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                onClick={() => setRadiusKm(preset.value)}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Discovered Catalogue Grid */}
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>Nearby Indian Places ({sources.length})</h3>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Sorted by Haversine distance from ({userLocation.latitude.toFixed(2)}°, {userLocation.longitude.toFixed(2)}°)
        </span>
      </div>

      {isLoading ? (
        <div className="card-panel" style={{ textAlign: 'center', padding: '40px' }}>
          <p>Calculating geospatial distances...</p>
        </div>
      ) : sources.length === 0 ? (
        <div className="card-panel" style={{ textAlign: 'center', padding: '40px' }}>
          <p>No audio sources found within {radiusKm} km radius.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          {sources.map(source => (
            <AudioCard key={source.id} audio={source} />
          ))}
        </div>
      )}
    </div>
  );
}
