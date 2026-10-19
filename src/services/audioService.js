/**
 * ProxiSpeak Audio Service
 * Manages audio catalogs, proximity queries, and metadata retrieval.
 * Gracefully switches to realistic mock data when backend is in mock mode or unavailable.
 */

import { apiClient } from './api';
import { MOCK_AUDIO_SOURCES, getMockAudioSources, getMockAudioById } from '../data/mockAudioData';
import { calculateDistance } from '../utils/calculateDistance';
import { isValidCoordinate } from '../utils/validation';

const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA !== 'false';

/**
 * Normalizes an audio record from the backend or mock data to ensure predictable schema.
 */
function normalizeAudioSource(raw) {
  if (!raw) return null;

  const lat = raw.coordinates?.latitude ?? raw.latitude ?? raw.lat ?? null;
  const lon = raw.coordinates?.longitude ?? raw.longitude ?? raw.lon ?? raw.lng ?? null;

  const hasValidCoords = isValidCoordinate(lat, lon);

  return {
    id: String(raw.id || raw._id || Math.random().toString(36).substr(2, 9)),
    title: raw.title || 'Untitled Audio Node',
    author: raw.author || raw.creator || 'Anonymous Transmitter',
    category: raw.category || 'General Audio',
    description: raw.description || 'No description available for this audio node.',
    coordinates: hasValidCoords ? { latitude: Number(lat), longitude: Number(lon) } : null,
    audioUrl: raw.audioUrl || raw.url || raw.audio_url || '',
    duration: Number(raw.duration || 0),
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    signalStrength: raw.signalStrength || (hasValidCoords ? 'Medium' : 'Unknown'),
    radiusKm: raw.radiusKm ? Number(raw.radiusKm) : 2.0,
    coverColor: raw.coverColor || '#06b6d4',
    createdAt: raw.createdAt || new Date().toISOString()
  };
}

/**
 * Retrieves the full list of audio sources with optional search and category filters.
 *
 * @param {object} params
 * @param {string} params.category - Category filter
 * @param {string} params.search - Keyword search
 * @returns {Promise<Array>} Normalized audio sources
 */
export async function getAudioSources({ category = 'All', search = '' } = {}) {
  if (USE_MOCK_DATA) {
    // Simulate slight asynchronous network latency for realistic UX
    await new Promise(r => setTimeout(r, 200));
    const mock = getMockAudioSources({ category, search });
    return mock.map(normalizeAudioSource);
  }

  try {
    const queryParams = new URLSearchParams();
    if (category && category !== 'All') queryParams.append('category', category);
    if (search) queryParams.append('q', search);

    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    const data = await apiClient(`/audio${queryString}`);

    const list = Array.isArray(data) ? data : (data.sources || data.data || []);
    return list.map(normalizeAudioSource);
  } catch (error) {
    console.warn('[AudioService] Backend unreachable, falling back to mock dataset:', error.message);
    const mock = getMockAudioSources({ category, search });
    return mock.map(normalizeAudioSource);
  }
}

/**
 * Retrieves a single audio source by its ID.
 *
 * @param {string} id - Audio source identifier
 * @returns {Promise<object|null>}
 */
export async function getAudioById(id) {
  if (USE_MOCK_DATA) {
    await new Promise(r => setTimeout(r, 150));
    const raw = getMockAudioById(id);
    return raw ? normalizeAudioSource(raw) : null;
  }

  try {
    const data = await apiClient(`/audio/${encodeURIComponent(id)}`);
    return normalizeAudioSource(data);
  } catch (error) {
    console.warn(`[AudioService] Backend request failed for ID ${id}, using mock:`, error.message);
    const raw = getMockAudioById(id);
    return raw ? normalizeAudioSource(raw) : null;
  }
}

/**
 * Retrieves nearby audio sources based on live user coordinates and a radius boundary.
 *
 * @param {object} params
 * @param {number} params.latitude - User latitude
 * @param {number} params.longitude - User longitude
 * @param {number} params.radiusKm - Maximum radius in kilometers (default 5km)
 * @returns {Promise<Array>} Sorted list with calculated distanceKm property
 */
export async function getNearbyAudioSources({ latitude, longitude, radiusKm = 10 } = {}) {
  // If user coordinates are not valid, return general sources without distances
  if (!isValidCoordinate(latitude, longitude)) {
    const all = await getAudioSources();
    return all.map(item => ({ ...item, distanceKm: null }));
  }

  let candidates = [];

  if (USE_MOCK_DATA) {
    await new Promise(r => setTimeout(r, 250));
    candidates = MOCK_AUDIO_SOURCES.map(normalizeAudioSource);
  } else {
    try {
      const data = await apiClient(`/audio/nearby?lat=${latitude}&lng=${longitude}&radius=${radiusKm}`);
      const list = Array.isArray(data) ? data : (data.sources || data.data || []);
      candidates = list.map(normalizeAudioSource);
    } catch (error) {
      console.warn('[AudioService] Nearby API failed, using client-side Haversine with mock dataset:', error.message);
      candidates = MOCK_AUDIO_SOURCES.map(normalizeAudioSource);
    }
  }

  // Calculate precise client-side Haversine distance
  const withDistances = candidates.map(source => {
    if (!source.coordinates) {
      return { ...source, distanceKm: null };
    }
    const dist = calculateDistance(
      latitude,
      longitude,
      source.coordinates.latitude,
      source.coordinates.longitude
    );
    return { ...source, distanceKm: dist };
  });

  // Filter within radius if specified, keeping items with valid distances
  const filtered = withDistances.filter(source => {
    if (source.distanceKm === null) return true; // Keep items with unmapped coords at bottom
    return source.distanceKm <= radiusKm;
  });

  // Sort by ascending distance (null distances placed at end)
  filtered.sort((a, b) => {
    if (a.distanceKm === null) return 1;
    if (b.distanceKm === null) return -1;
    return a.distanceKm - b.distanceKm;
  });

  return filtered;
}
