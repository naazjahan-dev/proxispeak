/**
 * Haversine (great-circle) distance utilities.
 *
 * Pure functions: no React, no browser APIs, no side effects.
 */

/** Mean Earth radius in metres (IUGG value). */
export const EARTH_RADIUS_METERS = 6371008.8

/**
 * A coordinate is valid only if both values are real numbers (not strings,
 * not NaN/Infinity) and inside the legal GPS range.
 *
 * @param {unknown} latitude  Degrees, -90..90
 * @param {unknown} longitude Degrees, -180..180
 * @returns {boolean}
 */
export function isValidCoordinate(latitude, longitude) {
  return (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  )
}

const toRadians = (degrees) => (degrees * Math.PI) / 180

/**
 * Great-circle distance between two GPS points using the Haversine formula.
 *
 * @param {number} lat1 Latitude of point 1, degrees
 * @param {number} lon1 Longitude of point 1, degrees
 * @param {number} lat2 Latitude of point 2, degrees
 * @param {number} lon2 Longitude of point 2, degrees
 * @returns {number|null} Distance in METRES (>= 0), or `null` if any input is
 *   missing, not a number, or outside the valid latitude/longitude range.
 *   It never throws and never returns NaN, so callers must check for `null`.
 */
export function haversineDistance(lat1, lon1, lat2, lon2) {
  if (!isValidCoordinate(lat1, lon1) || !isValidCoordinate(lat2, lon2)) {
    return null
  }

  const phi1 = toRadians(lat1)
  const phi2 = toRadians(lat2)
  const deltaPhi = toRadians(lat2 - lat1)
  const deltaLambda = toRadians(lon2 - lon1)

  const a =
    Math.sin(deltaPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2

  // Clamp guards against tiny floating-point overshoot (a slightly > 1).
  const clamped = Math.min(1, Math.max(0, a))
  const c = 2 * Math.atan2(Math.sqrt(clamped), Math.sqrt(1 - clamped))
  return EARTH_RADIUS_METERS * c
}
