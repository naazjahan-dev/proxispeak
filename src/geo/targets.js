/**
 * DEMONSTRATION targets only.
 *
 * - These are NOT real places. They are placeholder coordinates near
 *   latitude 0, longitude 0 so that nobody mistakes them for real locations.
 * - Radii are DEMONSTRATION values, not confirmed production radii. The team
 *   must decide the real radii.
 * - `audioRef` values are placeholder identifiers. Prince's audio module must
 *   confirm what identifier it really expects.
 *
 * Target shape:
 *   id           string  unique
 *   name         string  readable name
 *   latitude     number  -90..90
 *   longitude    number  -180..180
 *   radiusMeters number  > 0
 *   audioRef     string | null  optional, passed through to the audio module
 *
 * To test with real GPS, either edit these values, or press
 * "Add target at my current position" in the UI.
 */
export const DEMO_TARGETS = [
  {
    id: 'demo-alpha',
    name: 'Demo Target Alpha',
    latitude: 0,
    longitude: 0,
    radiusMeters: 50,
    audioRef: 'demo-audio-alpha',
  },
  {
    id: 'demo-beta',
    name: 'Demo Target Beta',
    latitude: 0.002,
    longitude: 0,
    radiusMeters: 100,
    audioRef: 'demo-audio-beta',
  },
  {
    id: 'demo-gamma',
    name: 'Demo Target Gamma (no audio)',
    latitude: 0,
    longitude: 0.004,
    radiusMeters: 75,
    audioRef: null,
  },
]

/** Default radius used when a target is created from the current position. */
export const DEMO_DEFAULT_RADIUS_METERS = 50
