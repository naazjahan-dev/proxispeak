import { useState } from 'react'
import { formatMeters } from '../geo/format.js'

const STATE_LABEL = { inside: 'INSIDE radius', outside: 'Outside radius', unknown: 'No reading yet' }

/** Radius editor: commits on blur/Enter, rejects non-positive numbers. */
function RadiusInput({ radiusMeters, onCommit, label }) {
  const [draft, setDraft] = useState(String(radiusMeters))
  const parsed = Number(draft)
  const valid = draft.trim() !== '' && Number.isFinite(parsed) && parsed > 0

  const commit = () => {
    if (valid && parsed !== radiusMeters) onCommit(parsed)
    else if (!valid) setDraft(String(radiusMeters))
  }

  return (
    <label className="inline-field">
      <span>{label}</span>
      <input
        type="number"
        min="1"
        step="any"
        value={draft}
        aria-invalid={!valid}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      />
      <span>m</span>
    </label>
  )
}

export default function TargetList({ statuses, invalidTargets, onRadiusChange, onRemove }) {
  return (
    <section className="card" aria-labelledby="targets-heading">
      <h2 id="targets-heading">Targets</h2>
      <p className="hint">
        Demonstration targets at placeholder coordinates, not real places. Radii are demo
        values pending team confirmation.
      </p>
      {statuses.length === 0 && <p className="message">No valid targets configured.</p>}
      <ul className="target-list">
        {statuses.map((t) => (
          <li key={t.id} className={`target ${t.state}`}>
            <div className="target-head">
              <strong>{t.name}</strong>
              <span className={`badge ${t.state}`}>{STATE_LABEL[t.state]}</span>
            </div>
            <div className="target-meta">
              <span>
                Distance: <b>{formatMeters(t.distanceMeters)}</b>
              </span>
              <span>
                Centre: {t.latitude}, {t.longitude}
              </span>
              <span>Audio ref: {t.audioRef ?? 'none'}</span>
            </div>
            <div className="target-actions">
              <RadiusInput
                key={t.radiusMeters}
                label={`Radius for ${t.name}`}
                radiusMeters={t.radiusMeters}
                onCommit={(value) => onRadiusChange(t.id, value)}
              />
              <button type="button" className="secondary small" onClick={() => onRemove(t.id)}>
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>
      {invalidTargets.map(({ target, reason }, index) => (
        <p className="message error" role="alert" key={`${target?.id ?? 'x'}-${index}`}>
          Ignored invalid target “{target?.name ?? target?.id ?? 'unknown'}”: {reason}
        </p>
      ))}
    </section>
  )
}
