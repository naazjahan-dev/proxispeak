import { config } from '../config/env.js';

/**
 * Earth mean radius in meters according to WGS-84 / IUGG.
 */
export const EARTH_RADIUS_METERS = 6371000;

/**
 * Parse and validate geographic longitude & latitude coordinate inputs.
 *
 * Accepts:
 *  - `[longitude, latitude]` array
 *  - `{ longitude, latitude }` or `{ lng, lat }` or `{ lon, lat }` object
 *  - `{ x, y }` object (where x = longitude, y = latitude)
 *  - `{ coordinates: [longitude, latitude] }` GeoJSON object
 *
 * @param {unknown} input
 * @param {{ maxAbs?: number, allowPlanarFallback?: boolean }} [options]
 * @returns {{ ok: true, coordinates: [number, number], error: null }
 *          | { ok: false, coordinates: null, error: string }}
 */
export function parseCoordinates(input, options = {}) {
  let candidate = null;

  if (Array.isArray(input) && input.length === 2) {
    candidate = input;
  } else if (input && typeof input === 'object') {
    if (Number.isFinite(input.longitude) && Number.isFinite(input.latitude)) {
      candidate = [input.longitude, input.latitude];
    } else if (Number.isFinite(input.lng) && Number.isFinite(input.lat)) {
      candidate = [input.lng, input.lat];
    } else if (Number.isFinite(input.lon) && Number.isFinite(input.lat)) {
      candidate = [input.lon, input.lat];
    } else if (Number.isFinite(input.x) && Number.isFinite(input.y)) {
      candidate = [input.x, input.y];
    } else if (Array.isArray(input.coordinates) && input.coordinates.length === 2) {
      candidate = input.coordinates;
    }
  }

  if (!candidate) {
    return {
      ok: false,
      coordinates: null,
      error: 'coordinates must be provided as [longitude, latitude] or { lng, lat }',
    };
  }

  const [lon, lat] = candidate;
  if (typeof lon !== 'number' || typeof lat !== 'number' || !Number.isFinite(lon) || !Number.isFinite(lat)) {
    return { ok: false, coordinates: null, error: 'coordinates must be two finite numbers' };
  }

  // Geographic boundary checks
  const maxAbs = Number.isFinite(options.maxAbs) ? options.maxAbs : config.maxCoordinateAbs;
  if (Math.abs(lon) > maxAbs || Math.abs(lat) > maxAbs) {
    return { ok: false, coordinates: null, error: `coordinates must satisfy |lon|, |lat| <= ${maxAbs}` };
  }

  // Standard WGS84 geographic limits: longitude in [-180, 180], latitude in [-90, 90]
  if (lon < -180 || lon > 180) {
    return { ok: false, coordinates: null, error: `longitude must be between -180 and 180 (got ${lon})` };
  }
  if (lat < -90 || lat > 90) {
    return { ok: false, coordinates: null, error: `latitude must be between -90 and 90 (got ${lat})` };
  }

  return { ok: true, coordinates: [lon, lat], error: null };
}

/**
 * Calculate Great-Circle distance in METERS between two [longitude, latitude]
 * points using the Haversine formula.
 *
 * @param {[number, number]} coordA - [longitude, latitude]
 * @param {[number, number]} coordB - [longitude, latitude]
 * @returns {number} Distance in meters
 */
export function haversineDistance([lon1, lat1], [lon2, lat2]) {
  const toRad = (deg) => (deg * Math.PI) / 180;

  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const deltaPhi = toRad(lat2 - lat1);
  const deltaLambda = toRad(lon2 - lon1);

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
  return EARTH_RADIUS_METERS * c;
}

/**
 * Whether point `b` is within `radius` of point `a` using planar Euclidean distance.
 *
 * @param {[number, number]} a
 * @param {[number, number]} b
 * @param {number} [radius]
 * @returns {boolean}
 */
export function isWithinRadius(a, b, radius = config.proximityRadius) {
  return planarDistance(a, b) <= radius;
}

/**
 * Whether point `b` is within `radiusMeters` of point `a` using spherical Haversine distance.
 *
 * @param {[number, number]} a - [lon, lat]
 * @param {[number, number]} b - [lon, lat]
 * @param {number} [radiusMeters]
 * @returns {boolean}
 */
export function isWithinHaversineRadius(a, b, radiusMeters = config.proximityRadius) {
  return haversineDistance(a, b) <= radiusMeters;
}

/**
 * Calculate spatial audio gain (0.0 to 1.0) based on Haversine distance.
 * Full volume (1.0) at 0 meters, linearly decaying to 0.0 at radiusMeters.
 *
 * @param {number} distanceMeters
 * @param {number} [radiusMeters]
 * @returns {number}
 */
export function calculateSpatialGain(distanceMeters, radiusMeters = config.proximityRadius) {
  if (distanceMeters <= 0) return 1.0;
  if (distanceMeters >= radiusMeters) return 0.0;
  return Number((1 - distanceMeters / radiusMeters).toFixed(3));
}

/**
 * Planar Euclidean distance between two points (preserved for backwards-compatibility).
 * @returns {number}
 */
export function planarDistance([ax, ay], [bx, by]) {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

export default {
  EARTH_RADIUS_METERS,
  parseCoordinates,
  haversineDistance,
  isWithinRadius,
  calculateSpatialGain,
  planarDistance,
};
