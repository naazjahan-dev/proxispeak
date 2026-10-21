import { useState } from 'react'
import { isValidCoordinate } from '../geo/haversine.js'
import { offsetNorth } from '../geo/offset.js'

/**
 * Testing panel. Everything sent from here is tagged source: 'simulated' and
 * is clearly labelled, so it can never be mistaken for real GPS.
 */
export default function SimulatePanel({
  enabled,
  onToggle,
  onSend,
  statuses,
  exitMarginMeters,
  maxAccuracyMeters,
  onMaxAccuracyChange,
  lastSimulated,
}) {
  const [targetId, setTargetId] = useState('')
  const [lat, setLat] = useState('0')
  const [lon, setLon] = useState('0')
  const [accuracy, setAccuracy] = useState('10')
  const [formError, setFormError] = useState('')

  const selected = statuses.find((t) => t.id === targetId) ?? statuses[0]

  const send = (latitude, longitude, acc) => {
    const a = Number(acc)
    if (!isValidCoordinate(latitude, longitude)) {
      setFormError('Latitude must be -90..90 and longitude -180..180.')
      return
    }
    if (!Number.isFinite(a) || a < 0) {
      setFormError('Accuracy must be a number of metres, 0 or more.')
      return
    }
    setFormError('')
    setLat(String(latitude))
    setLon(String(longitude))
    onSend({ latitude, longitude, accuracy: a, timestamp: Date.now(), source: 'simulated' })
  }

  const sendManual = (e) => {
    e.preventDefault()
    const blank = lat.trim() === '' || lon.trim() === ''
    send(blank ? NaN : Number(lat), blank ? NaN : Number(lon), accuracy)
  }

  const goNorthOf = (metres) => {
    if (!selected) return
    const point = offsetNorth(selected.latitude, selected.longitude, metres)
    if (!point) {
      setFormError('Cannot compute that position for this target.')
      return
    }
    send(point.latitude, point.longitude, accuracy)
  }

  return (
    <section className="card simulate" aria-labelledby="sim-heading">
      <h2 id="sim-heading">Simulate location (testing)</h2>
      <label className="check">
        <input type="checkbox" checked={enabled} onChange={(e) => onToggle(e.target.checked)} />
        Simulation mode: use simulated coordinates instead of real GPS
      </label>
      <p className="hint">
        Switching mode clears proximity state and the event log. Simulated coordinates are
        labelled SIMULATED everywhere they appear.
      </p>

      <fieldset disabled={!enabled}>
        <legend>Quick moves relative to a target</legend>
        <label className="inline-field">
          <span>Target</span>
          <select value={selected?.id ?? ''} onChange={(e) => setTargetId(e.target.value)}>
            {statuses.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <div className="button-row">
          <button type="button" onClick={() => goNorthOf(0)}>
            At centre
          </button>
          <button
            type="button"
            onClick={() => selected && goNorthOf(selected.radiusMeters * 0.5)}
          >
            Inside (½ radius)
          </button>
          <button
            type="button"
            onClick={() =>
              selected && goNorthOf(selected.radiusMeters + exitMarginMeters + 20)
            }
          >
            Outside (radius + margin + 20 m)
          </button>
        </div>

        <form onSubmit={sendManual} className="manual">
          <p className="hint">
            <b>Manual coordinates</b>
          </p>
          <label className="inline-field">
            <span>Latitude</span>
            <input value={lat} onChange={(e) => setLat(e.target.value)} inputMode="decimal" />
          </label>
          <label className="inline-field">
            <span>Longitude</span>
            <input value={lon} onChange={(e) => setLon(e.target.value)} inputMode="decimal" />
          </label>
          <label className="inline-field">
            <span>Accuracy (m)</span>
            <input
              value={accuracy}
              onChange={(e) => setAccuracy(e.target.value)}
              inputMode="decimal"
            />
          </label>
          <button type="submit">Send simulated location</button>
        </form>
      </fieldset>

      {formError && (
        <p className="message error" role="alert">
          {formError}
        </p>
      )}

      <label className="inline-field">
        <span>Max accepted accuracy</span>
        <input
          type="number"
          min="1"
          value={maxAccuracyMeters}
          onChange={(e) => onMaxAccuracyChange(Number(e.target.value))}
        />
        <span>m (demo default)</span>
      </label>
      <p className="hint">
        Readings less accurate than this still show distances but never trigger enter/exit.
        Try accuracy 200 to see it ignored.
      </p>
      {lastSimulated && (
        <p className="message warn">
          Last SIMULATED reading: {lastSimulated.latitude.toFixed(6)},{' '}
          {lastSimulated.longitude.toFixed(6)} (±{lastSimulated.accuracy} m)
        </p>
      )}
    </section>
  )
}
