import { useCallback, useState } from 'react'
import EventLog from './components/EventLog.jsx'
import LocationCard from './components/LocationCard.jsx'
import SimulatePanel from './components/SimulatePanel.jsx'
import TargetList from './components/TargetList.jsx'
import { DEMO_DEFAULT_RADIUS_METERS, DEMO_TARGETS } from './geo/targets.js'
import { useGeolocation } from './hooks/useGeolocation.js'
import { useProximity } from './hooks/useProximity.js'
import './App.css'

/**
 * INTEGRATION POINT FOR THE AUDIO MODULE (owner: Prince).
 *
 * Called once per enter/exit transition with:
 *   { type: 'enter'|'exit', targetId, targetName, distanceMeters,
 *     timestamp, audioRef, source: 'gps'|'simulated' }
 *
 * This module does NOT play audio. When the audio module's interface is
 * confirmed, call it from here (or pass its function in as this handler).
 * Browsers usually require one user click on the page before audio can play.
 */
function handleProximityEvent(event) {
  console.info('[ProxiSpeak] proximity event', event)
}

let customTargetCounter = 0

function App() {
  const [simulationMode, setSimulationMode] = useState(false)
  const [lastSimulated, setLastSimulated] = useState(null)

  const proximity = useProximity({
    initialTargets: DEMO_TARGETS,
    onProximityEvent: handleProximityEvent,
  })
  const { processReading, reset } = proximity

  // Real GPS fixes feed the engine only when simulation mode is OFF.
  const onGpsPosition = useCallback(
    (position) => {
      if (!simulationMode) processReading(position)
    },
    [simulationMode, processReading],
  )
  const geo = useGeolocation({ onPosition: onGpsPosition })

  const toggleSimulation = (enabled) => {
    setSimulationMode(enabled)
    setLastSimulated(null)
    reset()
  }

  const sendSimulated = (reading) => {
    setLastSimulated(reading)
    processReading(reading)
  }

  const addTargetHere = () => {
    if (!geo.position) return
    customTargetCounter += 1
    proximity.addTarget({
      id: `my-location-${customTargetCounter}`,
      name: `My location #${customTargetCounter} (demo)`,
      latitude: geo.position.latitude,
      longitude: geo.position.longitude,
      radiusMeters: DEMO_DEFAULT_RADIUS_METERS,
      audioRef: null,
    })
  }

  const { lastReading, lastResult } = proximity
  const usingSimulated = lastReading?.source === 'simulated'

  return (
    <main className="app">
      <header>
        <h1>ProxiSpeak</h1>
        <p className="tagline">Geospatial proximity audio · geolocation &amp; proximity module</p>
        <p className={`source-banner ${simulationMode ? 'sim' : 'real'}`} role="status">
          {simulationMode
            ? 'SIMULATION MODE: proximity uses simulated coordinates, not real GPS'
            : 'Proximity uses real GPS readings'}
        </p>
      </header>

      <LocationCard geo={geo} simulationMode={simulationMode} />

      {lastResult && !lastResult.accepted && lastResult.reason && (
        <p className="message warn" role="status">
          Last {usingSimulated ? 'simulated' : 'GPS'} reading was ignored for enter/exit
          decisions:{' '}
          {lastResult.reason === 'low-accuracy'
            ? `its accuracy (±${lastReading.accuracy} m) is worse than the allowed ${proximity.maxAccuracyMeters} m.`
            : lastResult.reason}
        </p>
      )}

      <TargetList
        statuses={proximity.statuses}
        invalidTargets={proximity.invalidTargets}
        onRadiusChange={proximity.setTargetRadius}
        onRemove={proximity.removeTarget}
      />
      <div className="button-row">
        <button type="button" onClick={addTargetHere} disabled={!geo.position}>
          Add target at my current real position (demo)
        </button>
      </div>

      <SimulatePanel
        enabled={simulationMode}
        onToggle={toggleSimulation}
        onSend={sendSimulated}
        statuses={proximity.statuses}
        exitMarginMeters={proximity.exitMarginMeters}
        maxAccuracyMeters={proximity.maxAccuracyMeters}
        onMaxAccuracyChange={proximity.setMaxAccuracyMeters}
        lastSimulated={lastSimulated}
      />

      <EventLog events={proximity.events} />

      <footer className="hint">
        GPS accuracy is an estimate, not a guarantee. Reported distances can be off by the
        accuracy value or more, especially indoors.
      </footer>
    </main>
  )
}

export default App
