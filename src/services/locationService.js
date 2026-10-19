/**
 * ProxiSpeak Location Service
 * Provides reverse geocoding labels, proximity radius presets, and geospatial helpers.
 */

export const RADIUS_PRESETS = [
  { label: '500 m', value: 0.5 },
  { label: '1 km', value: 1.0 },
  { label: '3 km', value: 3.0 },
  { label: '5 km', value: 5.0 },
  { label: '10 km', value: 10.0 },
  { label: '25 km', value: 25.0 }
];

// Fallback coordinate cluster when testing without active GPS
export const DEFAULT_MOCK_LOCATION = {
  latitude: 12.9716,
  longitude: 77.5946,
  accuracy: 15,
  name: 'Metropolitan Tech Center'
};

/**
 * Attempts a lightweight reverse geocoding query or returns formatted coordinate string.
 *
 * @param {number} latitude
 * @param {number} longitude
 * @returns {Promise<string>}
 */
export async function getApproximateAddress(latitude, longitude) {
  if (latitude === null || longitude === null || isNaN(latitude) || isNaN(longitude)) {
    return 'Coordinates Unavailable';
  }

  // Format to 4 decimal places (~11 meters precision)
  return `${Number(latitude).toFixed(4)}°, ${Number(longitude).toFixed(4)}°`;
}
