import React, { useState, useEffect } from 'react';

import {
  Compass,
  RefreshCw,
  MapPin,
  Filter,
  Radio,
  Users,
  AlertCircle
} from 'lucide-react';

import {
  getNearbyAudioSources,
  getNearbyCommunityAudioSources
} from '../services/audioService';

import {
  RADIUS_PRESETS,
  DEFAULT_MOCK_LOCATION
} from '../services/locationService';

import ProximityAudioListener from '../components/discovery/ProximityAudioListener';
import AudioCard from '../components/discovery/AudioCard';

export default function NearbyAudio() {
  const [radiusKm, setRadiusKm] = useState(5.0);

  const [heritageSources, setHeritageSources] = useState([]);
  const [communitySources, setCommunitySources] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [communityError, setCommunityError] = useState('');

  const [userLocation, setUserLocation] = useState(
    DEFAULT_MOCK_LOCATION
  );

  const [locationStatus, setLocationStatus] = useState('simulated');

  // ============================================================
  // LOAD HERITAGE AND COMMUNITY AUDIO
  // ============================================================

  const loadNearbySources = async (
    coords = userLocation,
    radius = radiusKm
  ) => {
    setIsLoading(true);
    setCommunityError('');

    try {
      // Fetch both audio categories independently.
      const [heritageResult, communityResult] =
        await Promise.allSettled([
          getNearbyAudioSources({
            latitude: coords.latitude,
            longitude: coords.longitude,
            radiusKm: radius
          }),

          getNearbyCommunityAudioSources({
            latitude: coords.latitude,
            longitude: coords.longitude,
            radiusKm: radius
          })
        ]);

      // Heritage Audio result
      if (heritageResult.status === 'fulfilled') {
        setHeritageSources(heritageResult.value);
      } else {
        console.error(
          'Failed to load Heritage Audio:',
          heritageResult.reason
        );

        setHeritageSources([]);
      }

      // Community Audio result
      if (communityResult.status === 'fulfilled') {
        setCommunitySources(communityResult.value);
      } else {
        console.error(
          'Failed to load Community Audio:',
          communityResult.reason
        );

        setCommunitySources([]);

        setCommunityError(
          communityResult.reason?.message ||
          'Unable to load Community Audio.'
        );
      }

    } catch (error) {
      console.error(
        'Failed to load nearby audio:',
        error
      );

    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================
  // LOAD WHEN RADIUS CHANGES
  // ============================================================

  useEffect(() => {
    loadNearbySources(userLocation, radiusKm);
  }, [radiusKm]);

  // ============================================================
  // REQUEST LIVE GPS LOCATION
  // ============================================================

  const handleRequestLiveLocation = () => {
    if (!navigator.geolocation) {
      alert(
        'Browser geolocation is not supported on this device.'
      );
      return;
    }

    setLocationStatus('requesting');

    navigator.geolocation.getCurrentPosition(
      position => {
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        };

        setUserLocation(coords);
        setLocationStatus('granted');

        loadNearbySources(coords, radiusKm);
      },

      error => {
        console.warn(
          'Geolocation denied or unavailable:',
          error.message
        );

        setLocationStatus('denied');

        // Use simulated location if GPS is unavailable.
        setUserLocation(DEFAULT_MOCK_LOCATION);

        loadNearbySources(
          DEFAULT_MOCK_LOCATION,
          radiusKm
        );
      },

      {
        timeout: 8000,
        enableHighAccuracy: true
      }
    );
  };

  // ============================================================
  // AUDIO CARD RENDER HELPER
  // ============================================================

  const renderAudioCards = sources => {
    return sources.map(source => (
      <AudioCard
        key={source.id}
        audio={{
          ...source,
          distance: source.distanceKm
        }}
      />
    ));
  };

  // ============================================================
  // UI
  // ============================================================

  return (
    <div className="nearby-page">

      {/* PAGE HEADER */}

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div>
          <h1
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            <Compass
              size={28}
              color="var(--accent-cyan)"
            />

            <span>Nearby Audio Discovery</span>
          </h1>

          <p>
            Discover nearby heritage places and community
            audio shared by users around you.
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '10px',
            alignItems: 'center'
          }}
        >
          <button
            type="button"
            className="btn btn-outline-cyan"
            onClick={handleRequestLiveLocation}
            title="Detect your current location using GPS"
            disabled={locationStatus === 'requesting'}
          >
            <RefreshCw
              size={16}
              className={
                locationStatus === 'requesting'
                  ? 'animate-spin'
                  : ''
              }
            />

            <span>
              {locationStatus === 'granted'
                ? 'GPS Active'
                : locationStatus === 'requesting'
                  ? 'Detecting...'
                  : 'Use My GPS'}
            </span>
          </button>
        </div>
      </div>

      {/* PROXIMITY AUDIO LISTENER */}

      <ProximityAudioListener showTestPanel={true} />

      {/* LOCATION STATUS */}

      <div
        className="card-panel"
        style={{
          padding: '12px 16px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}
      >
        <MapPin
          size={18}
          color="var(--accent-cyan)"
        />

        <div>
          <strong style={{ fontSize: '0.85rem' }}>
            Current Location
          </strong>

          <p
            style={{
              fontSize: '0.78rem',
              color: 'var(--text-muted)',
              marginTop: '3px'
            }}
          >
            {userLocation.latitude.toFixed(4)}°,
            {' '}
            {userLocation.longitude.toFixed(4)}°

            {' | '}

            {locationStatus === 'granted'
              ? 'GPS Location'
              : 'Simulated Location'}
          </p>
        </div>
      </div>

      {/* PROXIMITY RADIUS CONTROLS */}

      <div
        className="card-panel"
        style={{
          padding: '16px 20px',
          marginBottom: '24px'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Filter
              size={16}
              color="var(--accent-cyan)"
            />

            <span
              style={{
                fontSize: '0.9rem',
                fontWeight: 600
              }}
            >
              Proximity Boundary:
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '8px',
              flexWrap: 'wrap'
            }}
          >
            {RADIUS_PRESETS.map(preset => (
              <button
                key={preset.value}
                type="button"
                className={
                  `btn ${
                    radiusKm === preset.value
                      ? 'btn-primary'
                      : 'btn-secondary'
                  }`
                }
                style={{
                  padding: '6px 12px',
                  fontSize: '0.8rem'
                }}
                onClick={() => setRadiusKm(preset.value)}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* LOADING STATE */}

      {isLoading ? (
        <div
          className="card-panel"
          style={{
            textAlign: 'center',
            padding: '40px'
          }}
        >
          <RefreshCw
            size={24}
            className="animate-spin"
            color="var(--accent-cyan)"
          />

          <p style={{ marginTop: '12px' }}>
            Discovering nearby audio sources...
          </p>
        </div>
      ) : (
        <>
          {/* ==========================================
              HERITAGE AUDIO SECTION
          ========================================== */}

          <section style={{ marginBottom: '36px' }}>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '10px',
                marginBottom: '16px'
              }}
            >
              <h3
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '9px'
                }}
              >
                <Compass
                  size={21}
                  color="var(--accent-cyan)"
                />

                Heritage Audio

                <span
                  style={{
                    fontSize: '0.8rem',
                    color: 'var(--text-muted)'
                  }}
                >
                  ({heritageSources.length})
                </span>
              </h3>
            </div>

            {heritageSources.length === 0 ? (
              <div
                className="card-panel"
                style={{
                  textAlign: 'center',
                  padding: '28px'
                }}
              >
                <p>
                  No heritage audio found within {radiusKm} km.
                </p>
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'repeat(auto-fit, minmax(320px, 1fr))',
                  gap: '16px'
                }}
              >
                {renderAudioCards(heritageSources)}
              </div>
            )}

          </section>

          {/* ==========================================
              COMMUNITY AUDIO SECTION
          ========================================== */}

          <section style={{ marginBottom: '36px' }}>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '10px',
                marginBottom: '16px'
              }}
            >
              <h3
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '9px'
                }}
              >
                <Users
                  size={21}
                  color="var(--accent-cyan)"
                />

                Community Audio Feed

                <span
                  style={{
                    fontSize: '0.8rem',
                    color: 'var(--text-muted)'
                  }}
                >
                  ({communitySources.length})
                </span>
              </h3>

              <span
                className="badge badge-cyan"
                style={{ fontSize: '0.72rem' }}
              >
                Approved Audio
              </span>
            </div>

            {/* COMMUNITY API ERROR */}

            {communityError && (
              <div
                className="card-panel"
                style={{
                  padding: '16px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  color: 'var(--status-rose)'
                }}
              >
                <AlertCircle size={18} />

                <span style={{ fontSize: '0.85rem' }}>
                  {communityError}
                </span>

                <button
                  type="button"
                  className="btn btn-outline-cyan"
                  style={{ marginLeft: 'auto' }}
                  onClick={() =>
                    loadNearbySources(userLocation, radiusKm)
                  }
                >
                  Retry
                </button>
              </div>
            )}

            {/* COMMUNITY EMPTY STATE */}

            {!communityError &&
              communitySources.length === 0 && (
                <div
                  className="card-panel"
                  style={{
                    textAlign: 'center',
                    padding: '35px'
                  }}
                >
                  <Radio
                    size={32}
                    color="var(--text-muted)"
                  />

                  <h4 style={{ marginTop: '12px' }}>
                    No Community Audio Nearby
                  </h4>

                  <p
                    style={{
                      fontSize: '0.85rem',
                      color: 'var(--text-muted)',
                      marginTop: '8px'
                    }}
                  >
                    No approved community audio has been
                    found within {radiusKm} km.
                  </p>
                </div>
              )}

            {/* COMMUNITY AUDIO CARDS */}

            {communitySources.length > 0 && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'repeat(auto-fit, minmax(320px, 1fr))',
                  gap: '16px'
                }}
              >
                {renderAudioCards(communitySources)}
              </div>
            )}

          </section>
        </>
      )}

    </div>
  );
}