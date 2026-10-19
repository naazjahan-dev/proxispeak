/**
 * Calculates the great-circle distance between two geographic coordinates
 * using the Haversine formula.
 *
 * @param {number} lat1 - Latitude of point 1 in decimal degrees.
 * @param {number} lon1 - Longitude of point 1 in decimal degrees.
 * @param {number} lat2 - Latitude of point 2 in decimal degrees.
 * @param {number} lon2 - Longitude of point 2 in decimal degrees.
 * @returns {number|null} Distance in kilometers, or null if coordinates are invalid.
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  // Validate presence and numerical validity
  if (
    lat1 === null || lat1 === undefined || isNaN(lat1) ||
    lon1 === null || lon1 === undefined || isNaN(lon1) ||
    lat2 === null || lat2 === undefined || isNaN(lat2) ||
    lon2 === null || lon2 === undefined || isNaN(lon2)
  ) {
    return null;
  }

  // Validate latitude range [-90, 90] and longitude range [-180, 180]
  if (lat1 < -90 || lat1 > 90 || lat2 < -90 || lat2 > 90 ||
      lon1 < -180 || lon1 > 180 || lon2 < -180 || lon2 > 180) {
    return null;
  }

  const EARTH_RADIUS_KM = 6371; // Mean Earth radius in kilometers

  const toRadians = (degrees) => (degrees * Math.PI) / 180;

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const radLat1 = toRadians(lat1);
  const radLat2 = toRadians(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(radLat1) * Math.cos(radLat2) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}

/**
 * Formats a distance in kilometers into a human-readable string.
 * Displays meters (m) when distance is under 1 km, otherwise displays kilometers (km).
 *
 * @param {number|null} distanceKm - Distance in kilometers.
 * @returns {string} Formatted string like "350 m" or "2.4 km".
 */
export function formatDistance(distanceKm) {
  if (distanceKm === null || distanceKm === undefined || isNaN(distanceKm) || distanceKm < 0) {
    return 'Distance unavailable';
  }

  if (distanceKm < 1) {
    const meters = Math.round(distanceKm * 1000);
    return `${meters} m`;
  }

  if (distanceKm < 10) {
    return `${distanceKm.toFixed(2)} km`;
  }

  return `${distanceKm.toFixed(1)} km`;
}

export default calculateDistance;
