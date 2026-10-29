import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  createGeolocationTracker,
  GeoErrorType,
  mapGeolocationError,
} from './geolocationTracker.js'

/** A fake navigator.geolocation that lets tests push fixes and errors. */
function fakeGeolocation({ syncError } = {}) {
  const watchers = new Map()
  let nextId = 1
  const api = {
    watchCalls: 0,
    clearCalls: [],
    watchPosition(success, error, options) {
      api.watchCalls += 1
      api.lastOptions = options
      const id = nextId++
      watchers.set(id, { success, error })
      if (syncError) error(syncError)
      return id
    },
    clearWatch(id) {
      api.clearCalls.push(id)
      watchers.delete(id)
    },
    activeWatchers: () => watchers.size,
    emit(coords, timestamp = Date.now()) {
      for (const w of [...watchers.values()]) w.success({ coords, timestamp })
    },
    fail(code) {
      for (const w of [...watchers.values()]) w.error({ code })
    },
  }
  return api
}

const FIX = { latitude: 1.5, longitude: 2.5, accuracy: 12 }

describe('geolocation tracker', () => {
  it('starts idle, requests, then tracks and delivers real fixes', () => {
    const geo = fakeGeolocation()
    const got = []
    const tracker = createGeolocationTracker({ geolocation: geo, onPosition: (p) => got.push(p) })
    assert.equal(tracker.getSnapshot().status, 'idle')

    tracker.start()
    assert.equal(tracker.getSnapshot().status, 'requesting')
    assert.equal(tracker.getSnapshot().position, null) // no fake coordinates

    geo.emit(FIX, 111)
    const snap = tracker.getSnapshot()
    assert.equal(snap.status, 'tracking')
    assert.deepEqual(snap.position, { ...FIX, timestamp: 111, source: 'gps' })
    assert.equal(got.length, 1)
    assert.equal(got[0].source, 'gps')
  })

  it('never creates duplicate watchers', () => {
    const geo = fakeGeolocation()
    const tracker = createGeolocationTracker({ geolocation: geo })
    tracker.start()
    tracker.start()
    tracker.start()
    assert.equal(geo.watchCalls, 1)
    assert.equal(geo.activeWatchers(), 1)
  })

  it('stop() clears the watcher, ignores late fixes, and allows restart', () => {
    const geo = fakeGeolocation()
    const got = []
    const tracker = createGeolocationTracker({ geolocation: geo, onPosition: (p) => got.push(p) })
    tracker.start()
    geo.emit(FIX, 1)
    tracker.stop()
    assert.equal(geo.activeWatchers(), 0)
    assert.deepEqual(geo.clearCalls, [1])
    assert.equal(tracker.getSnapshot().status, 'idle')
    assert.equal(tracker.isTracking(), false)

    tracker.stop() // second stop is a harmless no-op
    assert.deepEqual(geo.clearCalls, [1])

    tracker.start()
    assert.equal(geo.watchCalls, 2)
    geo.emit(FIX, 2)
    assert.equal(got.length, 2)
  })

  it('skips identical repeated fixes (no needless updates)', () => {
    const geo = fakeGeolocation()
    const got = []
    let notifications = 0
    const tracker = createGeolocationTracker({ geolocation: geo, onPosition: (p) => got.push(p) })
    tracker.subscribe(() => (notifications += 1))
    tracker.start()
    geo.emit(FIX, 5)
    const after1 = notifications
    const snap1 = tracker.getSnapshot()
    geo.emit(FIX, 5)
    assert.equal(notifications, after1)
    assert.equal(tracker.getSnapshot(), snap1)
    assert.equal(got.length, 1)
  })

  it('reports unsupported browsers', () => {
    const tracker = createGeolocationTracker({ geolocation: null })
    assert.equal(tracker.isSupported, false)
    tracker.start()
    const snap = tracker.getSnapshot()
    assert.equal(snap.status, 'error')
    assert.equal(snap.error.type, GeoErrorType.UNSUPPORTED)
    assert.equal(snap.position, null)
  })

  it('permission denied is fatal: watcher cleared, clear message', () => {
    const geo = fakeGeolocation()
    const tracker = createGeolocationTracker({ geolocation: geo })
    tracker.start()
    geo.fail(1)
    const snap = tracker.getSnapshot()
    assert.equal(snap.status, 'error')
    assert.equal(snap.error.type, GeoErrorType.PERMISSION_DENIED)
    assert.match(snap.error.message, /permission/i)
    assert.equal(geo.activeWatchers(), 0)
    assert.equal(tracker.isTracking(), false)
  })

  it('permission denied delivered synchronously inside watchPosition still cleans up', () => {
    const geo = fakeGeolocation({ syncError: { code: 1 } })
    const tracker = createGeolocationTracker({ geolocation: geo })
    tracker.start()
    assert.equal(tracker.getSnapshot().status, 'error')
    assert.equal(geo.activeWatchers(), 0)
    assert.equal(tracker.isTracking(), false)
  })

  it('timeout / unavailable are non-fatal and clear on the next fix', () => {
    const geo = fakeGeolocation()
    const tracker = createGeolocationTracker({ geolocation: geo })
    tracker.start()
    geo.fail(3)
    assert.equal(tracker.getSnapshot().error.type, GeoErrorType.TIMEOUT)
    assert.equal(tracker.getSnapshot().status, 'requesting')
    assert.equal(geo.activeWatchers(), 1)
    geo.fail(2)
    assert.equal(tracker.getSnapshot().error.type, GeoErrorType.POSITION_UNAVAILABLE)
    geo.emit(FIX, 9)
    assert.equal(tracker.getSnapshot().status, 'tracking')
    assert.equal(tracker.getSnapshot().error, null)
  })

  it('maps unknown errors to a fatal unknown error', () => {
    const e = mapGeolocationError(new Error('weird'))
    assert.equal(e.type, GeoErrorType.UNKNOWN)
    assert.equal(e.fatal, true)
  })
  it('handles a missing error object safely', () => {
  const e = mapGeolocationError(null)

  assert.equal(e.type, GeoErrorType.UNKNOWN)
  assert.equal(e.fatal, true)
})

  it('requests high accuracy without cached positions by default', () => {
    const geo = fakeGeolocation()
    createGeolocationTracker({ geolocation: geo }).start()
    assert.equal(geo.lastOptions.enableHighAccuracy, true)
    assert.equal(geo.lastOptions.maximumAge, 0)
  })

  it('unsubscribe stops notifications', () => {
    const geo = fakeGeolocation()
    const tracker = createGeolocationTracker({ geolocation: geo })
    let n = 0
    const off = tracker.subscribe(() => (n += 1))
    tracker.start()
    off()
    const before = n
    geo.emit(FIX, 1)
    assert.equal(n, before)
  })
})

describe('tracker feeding proximity (integration of the two modules)', () => {
  it('mocked GPS fixes produce one enter then one exit', async () => {
    const { createProximityEngine } = await import('./proximityEngine.js')
    const { offsetNorth } = await import('./offset.js')
    const events = []
    const engine = createProximityEngine({
      targets: [{ id: 't', name: 'T', latitude: 10, longitude: 20, radiusMeters: 50 }],
      onEvent: (e) => events.push(e),
    })
    const geo = fakeGeolocation()
    const tracker = createGeolocationTracker({
      geolocation: geo,
      onPosition: (p) => engine.update(p),
    })
    tracker.start()
    let t = 0
    for (const m of [300, 100, 20, 25, 30, 200]) {
      geo.emit({ ...offsetNorth(10, 20, m), accuracy: 8 }, ++t)
    }
    assert.deepEqual(events.map((e) => e.type), ['enter', 'exit'])
    assert.equal(events[0].source, 'gps')
  })
})
