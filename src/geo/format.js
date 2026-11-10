/** Display helpers (pure). */

export function formatMeters(value) {
  return typeof value === 'number' && Number.isFinite(value)
    ? `${value.toLocaleString(undefined, { maximumFractionDigits: 1, minimumFractionDigits: 1 })} m`
    : '—'
}

export function formatCoordinate(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(6) : '—'
}

export function formatTime(timestamp) {
  return typeof timestamp === 'number' && Number.isFinite(timestamp)
    ? new Date(timestamp).toLocaleTimeString()
    : '—'
}
