import ngeohash from 'ngeohash';

/**
 * Default geohash precision.
 * Precision 7 represents ~153m x ~153m cell.
 * Precision 8 represents ~38m x ~19m cell.
 * Precision 6 represents ~1.2km x ~0.61km cell.
 */
export const DEFAULT_GEOHASH_PRECISION = 7;

/**
 * Encode [longitude, latitude] into a geohash string.
 *
 * NOTE: GeoJSON specifies [longitude, latitude], whereas ngeohash.encode
 * expects (latitude, longitude). This function handles the conversion safely.
 *
 * @param {[number, number]} coordinates - [longitude, latitude]
 * @param {number} [precision=7] - Length of geohash string
 * @returns {string}
 */
export function encodeGeohash([longitude, latitude], precision = DEFAULT_GEOHASH_PRECISION) {
  if (
    typeof longitude !== 'number' ||
    typeof latitude !== 'number' ||
    !Number.isFinite(longitude) ||
    !Number.isFinite(latitude)
  ) {
    throw new TypeError('Invalid coordinates for geohash encoding: must be finite numbers');
  }

  // Clamped check
  if (longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) {
    throw new RangeError(
      `Coordinates out of geographic range: lon (${longitude}) must be in [-180, 180], lat (${latitude}) in [-90, 90]`
    );
  }

  return ngeohash.encode(latitude, longitude, precision);
}

/**
 * Decode a geohash string into { latitude, longitude, error: { latitude, longitude } }
 * and GeoJSON [longitude, latitude].
 *
 * @param {string} hash
 * @returns {{ latitude: number, longitude: number, coordinates: [number, number] }}
 */
export function decodeGeohash(hash) {
  if (typeof hash !== 'string' || !hash.trim()) {
    throw new TypeError('Geohash must be a non-empty string');
  }
  const decoded = ngeohash.decode(hash.trim());
  return {
    latitude: decoded.latitude,
    longitude: decoded.longitude,
    coordinates: [decoded.longitude, decoded.latitude],
  };
}

/**
 * Get the geohash plus its 8 surrounding neighbor cells (9 cells total).
 * Essential for bounding-box candidate queries to avoid boundary edge-cases.
 *
 * @param {string} hash
 * @returns {string[]} Array of 9 geohash strings [center, ...8 neighbors]
 */
export function getGeohashWithNeighbors(hash) {
  if (typeof hash !== 'string' || !hash.trim()) return [];
  const trimmed = hash.trim();
  const neighbors = ngeohash.neighbors(trimmed);
  return [trimmed, ...neighbors];
}

/**
 * Calculate bounding box for a geohash: [minLat, minLon, maxLat, maxLon]
 *
 * @param {string} hash
 * @returns {[number, number, number, number]}
 */
export function getGeohashBbox(hash) {
  return ngeohash.decode_bbox(hash);
}

export default {
  DEFAULT_GEOHASH_PRECISION,
  encodeGeohash,
  decodeGeohash,
  getGeohashWithNeighbors,
  getGeohashBbox,
};
