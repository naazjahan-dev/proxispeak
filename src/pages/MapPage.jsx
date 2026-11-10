import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LocateFixed, MapPin, Radio, RefreshCw, SlidersHorizontal } from 'lucide-react';
import { getAudioSources } from '../services/audioService';
import { DEFAULT_MOCK_LOCATION, RADIUS_PRESETS } from '../services/locationService';

const DEFAULT_ZOOM = 13;

export default function MapPage() {
  const mapElementRef = useRef(null);
  const mapRef = useRef(null);
  const markersLayerRef = useRef(null);
  const radiusLayerRef = useRef(null);
  const userMarkerRef = useRef(null);

  const [sources, setSources] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [radiusKm, setRadiusKm] = useState(5);
  const [userLocation, setUserLocation] = useState(DEFAULT_MOCK_LOCATION);
  const [locationLabel, setLocationLabel] = useState('Demo location · Indore');
  const [locationBusy, setLocationBusy] = useState(false);

  const mappedSources = useMemo(
    () => sources.filter((source) => source.coordinates &&
      Number.isFinite(source.coordinates.latitude) &&
      Number.isFinite(source.coordinates.longitude)),
    [sources]
  );

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setLoadError('');
    getAudioSources()
      .then((items) => { if (active) setSources(items); })
      .catch((error) => { if (active) setLoadError(error.message || 'Could not load audio pins.'); })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, []);

  // Create the Leaflet map once. Layers are updated separately so map state is preserved.
  useEffect(() => {
    if (!mapElementRef.current || mapRef.current) return undefined;

    const map = L.map(mapElementRef.current, { zoomControl: false, scrollWheelZoom: true })
      .setView([userLocation.latitude, userLocation.longitude], DEFAULT_ZOOM);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);
    markersLayerRef.current = L.layerGroup().addTo(map);
    radiusLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    // Leaflet needs a size refresh after the surrounding layout has painted.
    requestAnimationFrame(() => map.invalidateSize());

    return () => {
      map.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
      radiusLayerRef.current = null;
      userMarkerRef.current = null;
    };
    // The map is intentionally initialized only once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const markers = markersLayerRef.current;
    const radiusLayer = radiusLayerRef.current;
    if (!map || !markers || !radiusLayer) return;

    markers.clearLayers();
    radiusLayer.clearLayers();

    mappedSources.forEach((source) => {
      const { latitude, longitude } = source.coordinates;
      const marker = L.circleMarker([latitude, longitude], {
        radius: 9,
        color: '#ffffff',
        weight: 2,
        fillColor: source.coverColor || '#0891b2',
        fillOpacity: 0.95
      });
      const safeTitle = String(source.title || 'Untitled audio').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
      })[char]);
      const safeDescription = String(source.description || 'Location-based audio recording.')
        .replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
      marker.bindPopup(`<strong>${safeTitle}</strong><br/><span>${safeDescription}</span><br/><small>${latitude.toFixed(4)}, ${longitude.toFixed(4)}</small>`);
      marker.addTo(markers);
      L.circle([latitude, longitude], {
        radius: Math.max(100, Number(source.radiusKm || 2) * 1000),
        color: source.coverColor || '#0891b2',
        weight: 1,
        opacity: 0.35,
        fillOpacity: 0.07
      }).addTo(radiusLayer);
    });

    if (userMarkerRef.current) userMarkerRef.current.remove();
    userMarkerRef.current = L.circleMarker([userLocation.latitude, userLocation.longitude], {
      radius: 8, color: '#ffffff', weight: 3, fillColor: '#2563eb', fillOpacity: 1
    }).bindTooltip('Your location').addTo(map);

    L.circle([userLocation.latitude, userLocation.longitude], {
      radius: radiusKm * 1000,
      color: '#2563eb', weight: 1, dashArray: '6 6', fillColor: '#3b82f6', fillOpacity: 0.045
    }).addTo(radiusLayer);
  }, [mappedSources, userLocation, radiusKm]);

  const requestLiveLocation = () => {
    if (!navigator.geolocation) {
      setLoadError('This browser does not support location access.');
      return;
    }
    setLocationBusy(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const next = { latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy };
        setUserLocation(next);
        setLocationLabel(`GPS location · ±${Math.round(coords.accuracy)} m accuracy`);
        mapRef.current?.setView([next.latitude, next.longitude], 15);
        setLocationBusy(false);
      },
      (error) => {
        setLoadError(error.code === 1 ? 'Location permission was denied. You can enable it in browser settings.' : 'Could not determine your location. Please try again.');
        setLocationBusy(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
    );
  };

  const refreshMap = async () => {
    setIsLoading(true);
    setLoadError('');
    try { setSources(await getAudioSources()); }
    catch (error) { setLoadError(error.message || 'Could not refresh audio pins.'); }
    finally { setIsLoading(false); }
  };

  return (
    <section className="map-page">
      <header className="map-page-header">
        <div>
          <div className="map-eyebrow"><Radio size={14} /> LOCATION-BASED AUDIO DISCOVERY</div>
          <h1>Explore the sound around you.</h1>
          <p>Discover audio recordings placed at real-world locations.</p>
        </div>
        <div className="map-header-actions">
          <button type="button" className="btn btn-secondary" onClick={refreshMap} disabled={isLoading}>
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} /> Refresh pins
          </button>
          <button type="button" className="btn btn-primary" onClick={requestLiveLocation} disabled={locationBusy}>
            <LocateFixed size={16} /> {locationBusy ? 'Finding you…' : 'Locate me'}
          </button>
        </div>
      </header>

      <div className="map-summary-row">
        <div className="map-summary-card"><span className="map-summary-icon"><MapPin size={17} /></span><span><strong>{mappedSources.length}</strong><small>Mapped audio pins</small></span></div>
        <div className="map-summary-card"><span className="map-summary-icon map-summary-icon-blue"><LocateFixed size={17} /></span><span><strong>{locationLabel.startsWith('GPS') ? 'GPS active' : 'Demo mode'}</strong><small>{locationLabel}</small></span></div>
        <div className="map-summary-card map-radius-control"><span className="map-summary-icon"><SlidersHorizontal size={17} /></span><span><strong>Discovery radius</strong><small>Dashed blue circle shows your search area</small></span>
          <select aria-label="Discovery radius" value={radiusKm} onChange={(event) => setRadiusKm(Number(event.target.value))}>
            {RADIUS_PRESETS.map((preset) => <option key={preset.value} value={preset.value}>{preset.label}</option>)}
          </select>
        </div>
      </div>

      {loadError && <div className="map-inline-alert" role="alert">{loadError}</div>}

      <div className="map-workspace">
        <div className="map-canvas-wrap">
          <div ref={mapElementRef} className="proxispeak-leaflet-map" aria-label="Map showing audio recording locations" />
          <div className="map-legend"><span><i className="legend-dot legend-audio" /> Audio pin</span><span><i className="legend-dot legend-user" /> Your location</span><span><i className="legend-ring" /> Search radius</span></div>
        </div>
        <aside className="map-side-panel">
          <div className="map-side-heading"><div><h2>Audio locations</h2><p>Choose a pin on the map to preview its details.</p></div><span className="map-count-pill">{mappedSources.length}</span></div>
          {isLoading ? <div className="map-empty-state">Loading audio locations…</div> : mappedSources.length === 0 ? (
            <div className="map-empty-state"><MapPin size={25} /><strong>No audio pins yet</strong><span>When recordings are published with coordinates, they will appear here.</span></div>
          ) : (
            <div className="map-pin-list">
              {mappedSources.map((source) => (
                <button type="button" className="map-pin-item" key={source.id} onClick={() => mapRef.current?.setView([source.coordinates.latitude, source.coordinates.longitude], 16)}>
                  <span className="map-pin-swatch" style={{ background: source.coverColor || 'var(--accent-cyan)' }}><Radio size={15} /></span>
                  <span className="map-pin-copy"><strong>{source.title}</strong><small>{source.city || source.category || 'Audio recording'}</small></span>
                  <MapPin size={15} />
                </button>
              ))}
            </div>
          )}
          <div className="map-side-note"><strong>How it works</strong><p>Audio pins mark places where recordings are available. Your proximity module can detect when you enter or leave a pin's listening radius.</p></div>
        </aside>
      </div>
      <p className="map-data-note">{locationLabel.startsWith('GPS') ? 'Using your device location.' : 'Showing demo coordinates until you enable GPS.'} Map tiles © OpenStreetMap contributors.</p>
    </section>
  );
}
