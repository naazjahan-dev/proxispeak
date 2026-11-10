
/**
 * ProxiSpeak Audio Service
 * Manages audio catalogs, proximity queries, and metadata retrieval.
 * Supports both Heritage Audio and Community Audio.
 */

import { apiClient } from './api';

import {
  MOCK_AUDIO_SOURCES,
  getMockAudioSources,
  getMockAudioById
} from '../data/mockAudioData';

import { calculateDistance } from '../utils/calculateDistance';
import { isValidCoordinate } from '../utils/validation';

const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA !== 'false';

// Backend server URL
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const BACKEND_ORIGIN = new URL(API_BASE_URL).origin;

/**
 * Converts relative audio paths into absolute backend URLs.
 */
function normalizeAudioUrl(url) {
  if (!url) return '';

  // Keep complete external URLs unchanged.
  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  // Convert relative paths into backend URLs.
  return new URL(
    url.startsWith('/') ? url : `/${url}`,
    `${BACKEND_ORIGIN}/`
  ).toString();
}

/**
 * Normalize audio records from backend or mock data.
 */
function normalizeAudioSource(raw) {
  if (!raw) return null;

  const lat =
    raw.coordinates?.latitude ??
    raw.latitude ??
    raw.lat ??
    null;

  const lon =
    raw.coordinates?.longitude ??
    raw.longitude ??
    raw.lon ??
    raw.lng ??
    null;

  const hasValidCoords = isValidCoordinate(lat, lon);

  return {
    id: String(
      raw.id ||
      raw._id ||
      Math.random().toString(36).substr(2, 9)
    ),

    title: raw.title || 'Untitled Audio Node',

    city: raw.city || '',
    state: raw.state || '',

    history: raw.history || '',
    descriptionHi: raw.descriptionHi || '',

    isPlace: Boolean(raw.isPlace),

    author: raw.author || raw.creator || 'Anonymous Transmitter',

    category: raw.category || 'General Audio',

    description:
      raw.description ||
      'No description available for this audio node.',

    coordinates: hasValidCoords
      ? {
          latitude: Number(lat),
          longitude: Number(lon)
        }
      : null,

    // Automatically convert relative paths into absolute URLs.
    audioUrl: normalizeAudioUrl(
      raw.audioUrl ||
      raw.url ||
      raw.audio_url ||
      ''
    ),

    duration: Number(raw.duration || 0),

    tags: Array.isArray(raw.tags) ? raw.tags : [],

    signalStrength: raw.signalStrength ||
      (hasValidCoords ? 'Medium' : 'Unknown'),

    radiusKm: raw.radiusKm
      ? Number(raw.radiusKm)
      : 2.0,

    coverColor: raw.coverColor || '#06b6d4',

    language: raw.language || 'hi-IN',

    audioType: raw.audioType || 'heritage',

    approvalStatus: raw.approvalStatus || '',

    uploadedBy: raw.uploadedBy || null,

    createdAt: raw.createdAt || new Date().toISOString(),

    distanceKm:
      Number.isFinite(Number(raw.distanceKm))
        ? Number(raw.distanceKm)
        : null
  };
}

/**
 * Retrieves the full list of audio sources.
 */
export async function getAudioSources({
  category = 'All',
  search = ''
} = {}) {

  if (USE_MOCK_DATA) {
    await new Promise(resolve => setTimeout(resolve, 200));

    const mock = getMockAudioSources({
      category,
      search
    });

    return mock.map(normalizeAudioSource);
  }

  try {
    const queryParams = new URLSearchParams();

    if (category && category !== 'All') {
      queryParams.append('category', category);
    }

    if (search) {
      queryParams.append('q', search);
    }

    const queryString = queryParams.toString()
      ? `?${queryParams.toString()}`
      : '';

    const data = await apiClient(`/audio${queryString}`);

    const list = Array.isArray(data)
      ? data
      : (data.sources || data.data || []);

    return list.map(normalizeAudioSource);

  } catch (error) {
    console.warn(
      '[AudioService] Backend unreachable, falling back to mock dataset:',
      error.message
    );

    const mock = getMockAudioSources({
      category,
      search
    });

    return mock.map(normalizeAudioSource);
  }
}

/**
 * Retrieves a single audio source by ID.
 */
export async function getAudioById(id) {

  if (USE_MOCK_DATA) {
    await new Promise(resolve => setTimeout(resolve, 150));

    const raw = getMockAudioById(id);

    return raw
      ? normalizeAudioSource(raw)
      : null;
  }

  try {
    const data = await apiClient(
      `/audio/${encodeURIComponent(id)}`
    );

    return normalizeAudioSource(data);

  } catch (error) {
    console.warn(
      `[AudioService] Backend request failed for ID ${id}, using mock:`,
      error.message
    );

    const raw = getMockAudioById(id);

    return raw
      ? normalizeAudioSource(raw)
      : null;
  }
}

/**
 * Retrieves nearby Heritage Audio sources.
 *
 * GET /api/audio/nearby
 */
export async function getNearbyAudioSources({
  latitude,
  longitude,
  radiusKm = 10
} = {}) {

  if (!isValidCoordinate(latitude, longitude)) {
    const all = await getAudioSources();

    return all.map(item => ({
      ...item,
      distanceKm: null
    }));
  }

  let candidates = [];

  if (USE_MOCK_DATA) {
    await new Promise(resolve => setTimeout(resolve, 250));

    candidates = MOCK_AUDIO_SOURCES.map(normalizeAudioSource);

  } else {
    try {
      const data = await apiClient(
        `/audio/nearby?lat=${latitude}&lng=${longitude}&radius=${radiusKm}`
      );

      const list = Array.isArray(data)
        ? data
        : (data.sources || data.data || []);

      candidates = list.map(normalizeAudioSource);

    } catch (error) {
      console.warn(
        '[AudioService] Nearby Heritage API failed:',
        error.message
      );

      candidates = MOCK_AUDIO_SOURCES.map(normalizeAudioSource);
    }
  }

  const withDistances = candidates.map(source => {

    if (!source.coordinates) {
      return {
        ...source,
        distanceKm: null
      };
    }

    const distance = calculateDistance(
      latitude,
      longitude,
      source.coordinates.latitude,
      source.coordinates.longitude
    );

    return {
      ...source,
      distanceKm: distance
    };
  });

  const filtered = withDistances.filter(source => {
    if (source.distanceKm === null) return true;

    return source.distanceKm <= radiusKm;
  });

  filtered.sort((a, b) => {
    if (a.distanceKm === null) return 1;
    if (b.distanceKm === null) return -1;

    return a.distanceKm - b.distanceKm;
  });

  return filtered;
}

/**
 * Retrieves nearby APPROVED Community Audio sources.
 *
 * GET /api/audio/community/nearby
 *
 * Pending and rejected audio are never included.
 */
export async function getNearbyCommunityAudioSources({
  latitude,
  longitude,
  radiusKm = 10
} = {}) {

  if (!isValidCoordinate(latitude, longitude)) {
    throw new Error(
      'Valid latitude and longitude are required for Community Audio.'
    );
  }

  if (
    !Number.isFinite(Number(radiusKm)) ||
    Number(radiusKm) <= 0 ||
    Number(radiusKm) > 100
  ) {
    throw new Error(
      'Radius must be greater than 0 and no more than 100 km.'
    );
  }

  let candidates = [];

  if (USE_MOCK_DATA) {

    await new Promise(resolve => setTimeout(resolve, 250));

    candidates = MOCK_AUDIO_SOURCES
      .filter(source =>
        source.audioType === 'community' &&
        source.approvalStatus === 'approved' &&
        source.isPlace === false
      )
      .map(normalizeAudioSource);

  } else {

    try {
      const queryParams = new URLSearchParams({
        lat: String(latitude),
        lng: String(longitude),
        radius: String(radiusKm)
      });

      const data = await apiClient(
        `/audio/community/nearby?${queryParams.toString()}`
      );

      const list = Array.isArray(data)
        ? data
        : (data.sources || data.data || []);

      candidates = list.map(normalizeAudioSource);

    } catch (error) {
      console.error(
        '[AudioService] Community Audio API failed:',
        error.message
      );

      throw error;
    }
  }

  // Calculate client-side distance for display.
  const withDistances = candidates.map(source => {

    if (!source.coordinates) {
      return {
        ...source,
        distanceKm: null
      };
    }

    const distance = calculateDistance(
      latitude,
      longitude,
      source.coordinates.latitude,
      source.coordinates.longitude
    );

    return {
      ...source,
      distanceKm: distance
    };
  });

  // Only approved community audio within the selected radius.
  const filtered = withDistances.filter(source => {

    if (source.audioType !== 'community') {
      return false;
    }

    if (source.approvalStatus !== 'approved') {
      return false;
    }

    if (source.isPlace) {
      return false;
    }

    return (
      source.distanceKm !== null &&
      source.distanceKm <= Number(radiusKm)
    );
  });

  // Nearest audio appears first.
  filtered.sort((a, b) => {
    return a.distanceKm - b.distanceKm;
  });

  return filtered;
}
