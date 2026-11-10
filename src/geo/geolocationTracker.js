/**
 * Framework-free wrapper around the browser Geolocation API.
 *
 * It owns the single `watchPosition` watcher, so duplicates are impossible,
 * and it exposes an immutable snapshot + subscribe() so React can read it with
 * `useSyncExternalStore` (see src/hooks/useGeolocation.js).
 *
 * Snapshot: { status, position, error }
 *   status   'idle' | 'requesting' | 'tracking' | 'error'
 *   position { latitude, longitude, accuracy, timestamp, source: 'gps' } | null
 *   error    { type, code, message, fatal } | null
 */

export const GeoErrorType = Object.freeze({
  UNSUPPORTED: 'unsupported',
  PERMISSION_DENIED: 'permission-denied',
  POSITION_UNAVAILABLE: 'position-unavailable',
  TIMEOUT: 'timeout',
  UNKNOWN: 'unknown',
})

/** Default options for navigator.geolocation.watchPosition. */
export const DEFAULT_WATCH_OPTIONS = Object.freeze({
  enableHighAccuracy: true,
  maximumAge: 0, // never reuse a cached position
  timeout: 20000,
})

/**
 * Convert a GeolocationPositionError (or anything thrown) into a friendly,
 * serialisable error. `fatal` errors stop tracking; non-fatal ones keep the
 * watcher alive because the browser may deliver a fix later.
 */
export function mapGeolocationError(error) {
  const code = error && typeof error.code === 'number' ? error.code : null
  switch (code) {
    case 1:
      return {
        type: GeoErrorType.PERMISSION_DENIED,
        code,
        fatal: true,
        message:
          'Location permission was denied. Allow location access for this site in your browser settings, then press Start tracking again. (Browsers only allow location on https:// pages or http://localhost.)',
      }
    case 2:
      return {
        type: GeoErrorType.POSITION_UNAVAILABLE,
        code,
        fatal: false,
        message:
          'Your position is currently unavailable. Check that device location services/GPS are on. Still trying…',
      }
    case 3:
      return {
        type: GeoErrorType.TIMEOUT,
        code,
        fatal: false,
        message: 'Timed out waiting for a location fix. Still trying…',
      }
    default:
      return {
        type: GeoErrorType.UNKNOWN,
        code,
        fatal: true,
        message: 'An unknown location error occurred. Tracking was stopped.',
      }
  }
}

const UNSUPPORTED_ERROR = Object.freeze({
  type: GeoErrorType.UNSUPPORTED,
  code: null,
  fatal: true,
  message: 'This browser does not support the Geolocation API.',
})

const INITIAL_SNAPSHOT = Object.freeze({ status: 'idle', position: null, error: null })

/**
 * @param {object} [config]
 * @param {Geolocation|null} [config.geolocation] Injected for testing; defaults
 *   to `navigator.geolocation` when available.
 * @param {PositionOptions} [config.options]
 * @param {(position:object)=>void} [config.onPosition] Called for every fix.
 */
export function createGeolocationTracker(config = {}) {
  const geolocation =
    config.geolocation !== undefined
      ? config.geolocation
      : typeof navigator !== 'undefined'
        ? (navigator.geolocation ?? null)
        : null
  const options = { ...DEFAULT_WATCH_OPTIONS, ...config.options }
  let onPosition = config.onPosition ?? null

  let snapshot = INITIAL_SNAPSHOT
  let session = null // { id, dead } for the ONE active watcher
  const listeners = new Set()

  function setSnapshot(next) {
    snapshot = next
    listeners.forEach((listener) => listener())
  }

  function handleSuccess(mySession, raw) {
    if (session !== mySession) return // stale callback after stop()
    const { latitude, longitude, accuracy } = raw.coords
    const position = {
      latitude,
      longitude,
      accuracy,
      timestamp: raw.timestamp,
      source: 'gps',
    }
    const previous = snapshot.position
    const unchanged =
      previous &&
      previous.latitude === latitude &&
      previous.longitude === longitude &&
      previous.accuracy === accuracy &&
      previous.timestamp === position.timestamp
    if (!unchanged || snapshot.status !== 'tracking' || snapshot.error) {
      setSnapshot({ status: 'tracking', position: unchanged ? previous : position, error: null })
    }
    if (!unchanged && typeof onPosition === 'function') onPosition(position)
  }

  function handleError(mySession, raw) {
    if (session !== mySession) return
    const error = mapGeolocationError(raw)
    if (error.fatal) {
      mySession.dead = true
      if (mySession.id !== null) geolocation.clearWatch(mySession.id)
      session = null
      setSnapshot({ status: 'error', position: snapshot.position, error })
    } else {
      setSnapshot({ ...snapshot, error })
    }
  }

  function start() {
    if (session) return // already watching: never create a duplicate watcher
    if (!geolocation || typeof geolocation.watchPosition !== 'function') {
      setSnapshot({ status: 'error', position: null, error: UNSUPPORTED_ERROR })
      return
    }
    const mySession = { id: null, dead: false }
    session = mySession
    setSnapshot({ status: 'requesting', position: null, error: null })
    const id = geolocation.watchPosition(
      (raw) => handleSuccess(mySession, raw),
      (raw) => handleError(mySession, raw),
      options,
    )
    mySession.id = id
    // A fatal error may have fired synchronously, before we had the id.
    if (mySession.dead) geolocation.clearWatch(id)
  }

  function stop() {
    if (!session) return
    const old = session
    session = null
    old.dead = true
    if (old.id !== null) geolocation.clearWatch(old.id)
    setSnapshot({ status: 'idle', position: snapshot.position, error: null })
  }

  return {
    start,
    stop,
    isSupported: Boolean(geolocation && typeof geolocation.watchPosition === 'function'),
    isTracking: () => session !== null,
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    setOnPosition(handler) {
      onPosition = handler
    },
  }
}
