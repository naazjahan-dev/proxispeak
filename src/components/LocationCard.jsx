import { formatCoordinate, formatMeters, formatTime } from '../geo/format.js'

const STATUS_TEXT = {
  idle: 'Not tracking. Press “Start tracking” to begin.',
  requesting: 'Waiting for permission or the first location fix…',
  tracking: 'Tracking your real location.',
  error: 'Tracking stopped because of an error.',
}

/** Shows the REAL browser GPS status and values. Never shows simulated data. */
export default function LocationCard({ geo, simulationMode }) {
  const { status, position, error, isSupported, start, stop } = geo
  const active = status === 'requesting' || status === 'tracking'

  return (
    <section className="card" aria-labelledby="real-gps-heading">
      <h2 id="real-gps-heading">Real GPS location</h2>

      <div className="button-row">
        <button type="button" onClick={start} disabled={active || !isSupported}>
          Start tracking
        </button>
        <button type="button" className="secondary" onClick={stop} disabled={!active}>
          Stop tracking
        </button>
      </div>

      {!isSupported && (
        <p className="message error" role="alert">
          This browser does not support the Geolocation API.
        </p>
      )}
      <p className={`message ${status === 'tracking' ? 'ok' : ''}`} role="status">
        {STATUS_TEXT[status]}
      </p>
      {error && (
        <p className="message error" role="alert">
          {error.message}
        </p>
      )}
      {simulationMode && (
        <p className="message warn">
          Simulation mode is ON: real GPS values below are displayed but NOT used for
          proximity.
        </p>
      )}

      <dl className="values">
        <div>
          <dt>Latitude</dt>
          <dd>{formatCoordinate(position?.latitude)}</dd>
        </div>
        <div>
          <dt>Longitude</dt>
          <dd>{formatCoordinate(position?.longitude)}</dd>
        </div>
        <div>
          <dt>Accuracy</dt>
          <dd>{position ? `±${formatMeters(position.accuracy)}` : '—'}</dd>
        </div>
        <div>
          <dt>Fix time</dt>
          <dd>{formatTime(position?.timestamp)}</dd>
        </div>
      </dl>
      {position && status === 'idle' && (
        <p className="hint">Showing the last known fix (tracking is stopped).</p>
      )}
    </section>
  )
}
