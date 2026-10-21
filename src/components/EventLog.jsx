import { formatMeters, formatTime } from '../geo/format.js'

/** Shows the events that are sent to onProximityEvent (newest first). */
export default function EventLog({ events }) {
  return (
    <section className="card" aria-labelledby="events-heading">
      <h2 id="events-heading">Proximity events</h2>
      <p className="hint">
        These are the events delivered to <code>onProximityEvent</code> for the audio module.
        No audio is played here.
      </p>
      {events.length === 0 ? (
        <p className="message">No events yet.</p>
      ) : (
        <ol className="event-log">
          {events.map((e, index) => (
            <li key={`${e.timestamp}-${e.targetId}-${e.type}-${index}`}>
              <span className={`badge ${e.type}`}>{e.type.toUpperCase()}</span>{' '}
              <strong>{e.targetName}</strong> at {formatMeters(e.distanceMeters)} ·{' '}
              {formatTime(e.timestamp)} · audio: {e.audioRef ?? 'none'} ·{' '}
              <span className={e.source === 'simulated' ? 'sim-tag' : ''}>
                {e.source === 'simulated' ? 'SIMULATED' : 'real GPS'}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
