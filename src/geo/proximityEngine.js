import { haversineDistance, isValidCoordinate } from './haversine.js'

/**
 * Proximity engine: decides when the user ENTERS or LEAVES a target's radius.
 *
 * Pure JavaScript (no React). The React hook `useProximity` is a thin wrapper.
 *
 * ── Event contract (what the audio module receives) ──────────────────────
 *   {
 *     type: 'enter' | 'exit',
 *     targetId: string,
 *     targetName: string,
 *     distanceMeters: number,   // distance at the moment of the transition
 *     timestamp: number,        // ms since epoch (the location reading's time)
 *     audioRef: string | null,  // optional identifier from the target config
 *     source: 'gps' | 'simulated'  // extra field: where the reading came from
 *   }
 * This contract is PROPOSED by the geolocation module and must be confirmed
 * with the audio owner. It is not an existing interface.
 *
 * ── Accuracy policy ─────────────────────────────────────────────────────
 * A reading whose reported accuracy (metres) is worse than
 * `maxAccuracyMeters` is NOT used to change inside/outside state. Distances
 * are still computed so the UI can show them, but no events fire. GPS
 * accuracy is a statistical estimate; it never guarantees exact distance.
 *
 * ── Duplicate prevention & flicker ──────────────────────────────────────
 * Each target remembers its state ('unknown' | 'inside' | 'outside').
 * 'enter' fires only on outside/unknown → inside, 'exit' only on inside →
 * outside, so staying inside never re-fires. To stop GPS jitter near the edge
 * from causing enter/exit flapping, leaving requires
 * distance > radius + exitMarginMeters.
 */

/** DEMO default; confirm with the team. */
export const DEFAULT_MAX_ACCURACY_METERS = 50
/** DEMO default; confirm with the team. */
export const DEFAULT_EXIT_MARGIN_METERS = 10

/**
 * @param {unknown} target
 * @returns {string|null} A human-readable problem, or null when valid.
 */
export function validateTarget(target) {
  if (!target || typeof target !== 'object') return 'Target must be an object.'
  const { id, name, latitude, longitude, radiusMeters } = target
  if (typeof id !== 'string' || id.trim() === '') return 'Missing target id.'
  if (typeof name !== 'string' || name.trim() === '') return 'Missing target name.'
  if (!isValidCoordinate(latitude, longitude)) return 'Invalid latitude/longitude.'
  if (
    typeof radiusMeters !== 'number' ||
    !Number.isFinite(radiusMeters) ||
    radiusMeters <= 0
  ) {
    return 'Radius must be a number greater than 0.'
  }
  if (
    target.audioRef !== undefined &&
    target.audioRef !== null &&
    typeof target.audioRef !== 'string'
  ) {
    return 'audioRef must be a string or null.'
  }
  return null
}

/**
 * @param {object} [config]
 * @param {Array} [config.targets]
 * @param {(event:object)=>void} [config.onEvent] Called once per transition.
 * @param {number} [config.maxAccuracyMeters]
 * @param {number} [config.exitMarginMeters]
 */
export function createProximityEngine(config = {}) {
  let maxAccuracyMeters = config.maxAccuracyMeters ?? DEFAULT_MAX_ACCURACY_METERS
  const exitMarginMeters = config.exitMarginMeters ?? DEFAULT_EXIT_MARGIN_METERS
  let onEvent = config.onEvent ?? null

  /** @type {Map<string, {target:object, state:string, distanceMeters:number|null}>} */
  let records = new Map()
  let invalidTargets = []
  let lastReading = null

  function setTargets(targets) {
    const next = new Map()
    const invalid = []
    for (const target of Array.isArray(targets) ? targets : []) {
      const problem = validateTarget(target)
      if (problem) {
        invalid.push({ target, reason: problem })
      } else if (next.has(target.id)) {
        invalid.push({ target, reason: `Duplicate target id "${target.id}".` })
      } else {
        const previous = records.get(target.id)
        next.set(target.id, {
          target: { audioRef: null, ...target },
          // Keep state for targets that already existed (no spurious events).
          state: previous ? previous.state : 'unknown',
          distanceMeters: previous ? previous.distanceMeters : null,
        })
      }
    }
    records = next
    invalidTargets = invalid
  }

  function emit(event) {
    if (typeof onEvent !== 'function') return
    try {
      onEvent(event)
    } catch (error) {
      // A faulty listener must never break location tracking.
      console.error('ProxiSpeak: onProximityEvent handler threw', error)
    }
  }

  function getStatuses() {
    return [...records.values()].map(({ target, state, distanceMeters }) => ({
      id: target.id,
      name: target.name,
      latitude: target.latitude,
      longitude: target.longitude,
      radiusMeters: target.radiusMeters,
      audioRef: target.audioRef,
      distanceMeters,
      state,
    }))
  }

  /**
   * Feed one location reading.
   * @param {{latitude:number, longitude:number, accuracy:number,
   *          timestamp?:number, source?:string}} reading
   * @returns {{accepted:boolean, reason:string|null, events:object[]}}
   *   `accepted` is false when the reading could not be used to change state
   *   (`reason`: 'invalid-coordinates' | 'invalid-accuracy' | 'low-accuracy').
   */
  function update(reading) {
    if (!reading || !isValidCoordinate(reading.latitude, reading.longitude)) {
      return { accepted: false, reason: 'invalid-coordinates', events: [] }
    }
    const { accuracy } = reading
    if (typeof accuracy !== 'number' || !Number.isFinite(accuracy) || accuracy < 0) {
      return { accepted: false, reason: 'invalid-accuracy', events: [] }
    }

    lastReading = reading
    const timestamp = Number.isFinite(reading.timestamp) ? reading.timestamp : Date.now()
    const reliable = accuracy <= maxAccuracyMeters
    const events = []

    for (const record of records.values()) {
      const { target } = record
      const distance = haversineDistance(
        reading.latitude,
        reading.longitude,
        target.latitude,
        target.longitude,
      )
      if (distance === null) continue
      record.distanceMeters = distance
      if (!reliable) continue // show distance, but never change state

      let type = null
      if (record.state !== 'inside' && distance <= target.radiusMeters) {
        record.state = 'inside'
        type = 'enter'
      } else if (record.state === 'inside' && distance > target.radiusMeters + exitMarginMeters) {
        record.state = 'outside'
        type = 'exit'
      } else if (record.state === 'unknown') {
        record.state = 'outside'
      }

      if (type) {
        events.push({
          type,
          targetId: target.id,
          targetName: target.name,
          distanceMeters: distance,
          timestamp,
          audioRef: target.audioRef ?? null,
          source: reading.source ?? 'gps',
        })
      }
    }

    events.forEach(emit)
    return {
      accepted: reliable,
      reason: reliable ? null : 'low-accuracy',
      events,
    }
  }

  /** Re-run the last reading (e.g. after a radius or target change). */
  function reevaluate() {
    return lastReading ? update(lastReading) : { accepted: false, reason: null, events: [] }
  }

  /** Forget all state (e.g. switching between real GPS and simulation). */
  function reset() {
    for (const record of records.values()) {
      record.state = 'unknown'
      record.distanceMeters = null
    }
    lastReading = null
  }

  setTargets(config.targets)

  return {
    setTargets,
    update,
    reevaluate,
    reset,
    getStatuses,
    getTargets: () => [...records.values()].map((r) => ({ ...r.target })),
    getInvalidTargets: () => [...invalidTargets],
    getLastReading: () => lastReading,
    setEventHandler: (handler) => {
      onEvent = handler
    },
    setMaxAccuracyMeters: (value) => {
      if (Number.isFinite(value) && value > 0) maxAccuracyMeters = value
    },
    getMaxAccuracyMeters: () => maxAccuracyMeters,
    getExitMarginMeters: () => exitMarginMeters,
  }
}
