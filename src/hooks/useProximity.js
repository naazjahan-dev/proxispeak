import { useCallback, useEffect, useState } from 'react'
import { createProximityEngine } from '../geo/proximityEngine.js'

const MAX_LOG_ENTRIES = 20

function buildSnapshot(engine, lastResult = null) {
  return {
    statuses: engine.getStatuses(),
    lastReading: engine.getLastReading(),
    lastResult,
    invalidTargets: engine.getInvalidTargets(),
    maxAccuracyMeters: engine.getMaxAccuracyMeters(),
  }
}

/**
 * React wrapper around the proximity engine.
 *
 * @param {object} config
 * @param {Array} config.initialTargets Target list (see src/geo/targets.js).
 * @param {(event:object)=>void} [config.onProximityEvent] Receives every
 *   enter/exit event. This is the integration point for the audio module.
 */
export function useProximity({ initialTargets, onProximityEvent }) {
  const [engine] = useState(() => createProximityEngine({ targets: initialTargets }))
  const [snapshot, setSnapshot] = useState(() => buildSnapshot(engine))
  const [events, setEvents] = useState([])

  useEffect(() => {
    engine.setEventHandler((event) => {
      setEvents((previous) => [event, ...previous].slice(0, MAX_LOG_ENTRIES))
      if (typeof onProximityEvent === 'function') onProximityEvent(event)
    })
    return () => engine.setEventHandler(null)
  }, [engine, onProximityEvent])

  const processReading = useCallback(
    (reading) => {
      const result = engine.update(reading)
      setSnapshot(buildSnapshot(engine, { accepted: result.accepted, reason: result.reason }))
    },
    [engine],
  )

  const applyTargets = useCallback(
    (targets) => {
      engine.setTargets(targets)
      const result = engine.reevaluate()
      setSnapshot(buildSnapshot(engine, result.reason ? { accepted: result.accepted, reason: result.reason } : null))
    },
    [engine],
  )

  const setTargetRadius = useCallback(
    (id, radiusMeters) => {
      applyTargets(engine.getTargets().map((t) => (t.id === id ? { ...t, radiusMeters } : t)))
    },
    [engine, applyTargets],
  )

  const addTarget = useCallback(
    (target) => applyTargets([...engine.getTargets(), target]),
    [engine, applyTargets],
  )

  const removeTarget = useCallback(
    (id) => applyTargets(engine.getTargets().filter((t) => t.id !== id)),
    [engine, applyTargets],
  )

  const setMaxAccuracyMeters = useCallback(
    (value) => {
      engine.setMaxAccuracyMeters(value)
      setSnapshot(buildSnapshot(engine, null))
    },
    [engine],
  )

  const reset = useCallback(() => {
    engine.reset()
    setSnapshot(buildSnapshot(engine))
    setEvents([])
  }, [engine])

  return {
    ...snapshot,
    events,
    exitMarginMeters: engine.getExitMarginMeters(),
    processReading,
    setTargetRadius,
    addTarget,
    removeTarget,
    setMaxAccuracyMeters,
    reset,
  }
}
