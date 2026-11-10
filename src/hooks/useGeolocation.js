import { useEffect, useState, useSyncExternalStore } from 'react'
import { createGeolocationTracker } from '../geo/geolocationTracker.js'

/**
 * React wrapper around the geolocation tracker.
 *
 * @param {object} [options]
 * @param {(position:object)=>void} [options.onPosition] Called for every new
 *   real GPS fix (outside React rendering, e.g. to feed the proximity engine).
 * @returns {{status:string, position:object|null, error:object|null,
 *   isSupported:boolean, start:()=>void, stop:()=>void}}
 */
export function useGeolocation({ onPosition } = {}) {
  // One tracker for the lifetime of the component.
  const [tracker] = useState(() => createGeolocationTracker())

  const { status, position, error } = useSyncExternalStore(
    tracker.subscribe,
    tracker.getSnapshot,
  )

  useEffect(() => {
    tracker.setOnPosition(onPosition ?? null)
  }, [tracker, onPosition])

  // Clean up the watcher when the component unmounts.
  useEffect(() => () => tracker.stop(), [tracker])

  return {
    status,
    position,
    error,
    isSupported: tracker.isSupported,
    start: tracker.start,
    stop: tracker.stop,
  }
}
