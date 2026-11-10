import { EARTH_RADIUS_METERS, isValidCoordinate } from './haversine.js'

/**
 * Returns a point `meters` due NORTH (or south if negative) of the given
 * coordinate. Used by the "Simulate Location" panel to place a test point at a
 * known distance from a target. One degree of latitude is a constant
 * distance on a sphere, so this is accurate for any longitude.
 *
 * @param {number} latitude
 * @param {number} longitude
 * @param {number} meters
 * @returns {{latitude:number, longitude:number}|null} `null` for invalid
 *   input or if the result would leave the valid latitude range.
 */
export function offsetNorth(latitude, longitude, meters) {
  if (!isValidCoordinate(latitude, longitude) || !Number.isFinite(meters)) {
    return null
  }
  const newLatitude = latitude + ((meters / EARTH_RADIUS_METERS) * 180) / Math.PI
  if (newLatitude > 90 || newLatitude < -90) return null
  return { latitude: newLatitude, longitude }
}
