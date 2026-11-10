import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { offsetNorth } from './offset.js'
import { createProximityEngine, validateTarget } from './proximityEngine.js'

const ALPHA = { id: 'a', name: 'Alpha', latitude: 10, longitude: 20, radiusMeters: 50, audioRef: 'audio-a' }
const BETA = { id: 'b', name: 'Beta', latitude: 10, longitude: 20, radiusMeters: 200 }

/** A reading `metres` north of ALPHA's centre. */
function at(metres, accuracy = 5, extra = {}) {
  const p = offsetNorth(ALPHA.latitude, ALPHA.longitude, metres)
  return { ...p, accuracy, timestamp: 1000 + metres, source: 'simulated', ...extra }
}

function setup(targets = [ALPHA], options = {}) {
  const events = []
  const engine = createProximityEngine({ targets, onEvent: (e) => events.push(e), ...options })
  return { engine, events }
}

describe('enter / exit transitions', () => {
  it('fires enter once with the full event contract', () => {
    const { engine, events } = setup()
    engine.update(at(500))
    assert.equal(events.length, 0)
    engine.update(at(30))
    assert.equal(events.length, 1)
    const e = events[0]
    assert.equal(e.type, 'enter')
    assert.equal(e.targetId, 'a')
    assert.equal(e.targetName, 'Alpha')
    assert.equal(e.audioRef, 'audio-a')
    assert.equal(e.source, 'simulated')
    assert.equal(e.timestamp, 1030)
    assert.ok(Math.abs(e.distanceMeters - 30) < 0.01)
  })

  it('does NOT repeat enter while the user stays inside', () => {
    const { engine, events } = setup()
    for (const m of [40, 30, 20, 10, 0, 10, 49]) engine.update(at(m))
    assert.equal(events.filter((e) => e.type === 'enter').length, 1)
    assert.equal(events.length, 1)
  })

  it('fires exit once when leaving, not again while outside', () => {
    const { engine, events } = setup()
    engine.update(at(10))
    for (const m of [100, 200, 300]) engine.update(at(m))
    assert.deepEqual(events.map((e) => e.type), ['enter', 'exit'])
  })

  it('can re-enter after exiting', () => {
    const { engine, events } = setup()
    for (const m of [10, 200, 10]) engine.update(at(m))
    assert.deepEqual(events.map((e) => e.type), ['enter', 'exit', 'enter'])
  })

  it('treats exactly the radius as inside', () => {
    const { engine, events } = setup()
    engine.update(at(49.999))
    assert.equal(events[0]?.type, 'enter')
  })

  it('first reading already inside fires enter; first outside fires nothing', () => {
    const a = setup()
    a.engine.update(at(5))
    assert.equal(a.events.length, 1)
    const b = setup()
    b.engine.update(at(900))
    assert.equal(b.events.length, 0)
    assert.equal(b.engine.getStatuses()[0].state, 'outside')
  })

  it('exit margin prevents flicker near the edge', () => {
    const { engine, events } = setup([ALPHA], { exitMarginMeters: 10 })
    engine.update(at(40)) // enter
    engine.update(at(55)) // outside radius but within margin: still inside
    assert.equal(engine.getStatuses()[0].state, 'inside')
    engine.update(at(61)) // beyond radius + margin: exit
    assert.deepEqual(events.map((e) => e.type), ['enter', 'exit'])
  })
})

describe('multiple targets', () => {
  it('tracks each target independently', () => {
    const { engine, events } = setup([ALPHA, BETA])
    engine.update(at(300)) // outside both
    engine.update(at(100)) // inside Beta (200), outside Alpha (50)
    engine.update(at(10)) // inside both
    engine.update(at(120)) // exit Alpha only (50+10 < 120), still inside Beta
    assert.deepEqual(
      events.map((e) => `${e.targetId}:${e.type}`),
      ['b:enter', 'a:enter', 'a:exit'],
    )
    const states = Object.fromEntries(engine.getStatuses().map((s) => [s.id, s.state]))
    assert.deepEqual(states, { a: 'outside', b: 'inside' })
  })

  it('reports a distance for every target', () => {
    const { engine } = setup([ALPHA, BETA])
    engine.update(at(75))
    for (const s of engine.getStatuses()) {
      assert.ok(Math.abs(s.distanceMeters - 75) < 0.01)
    }
  })
})

describe('invalid readings and poor accuracy', () => {
  it('ignores invalid coordinates without changing state or firing events', () => {
    const { engine, events } = setup()
    engine.update(at(10))
    for (const bad of [
      null, undefined, {}, { latitude: 'x', longitude: 1, accuracy: 5 },
      { latitude: 100, longitude: 0, accuracy: 5 }, { latitude: NaN, longitude: NaN, accuracy: 5 },
    ]) {
      const r = engine.update(bad)
      assert.equal(r.accepted, false)
      assert.equal(r.reason, 'invalid-coordinates')
    }
    assert.equal(events.length, 1)
    assert.equal(engine.getStatuses()[0].state, 'inside')
  })

  it('rejects missing or negative accuracy', () => {
    const { engine, events } = setup()
    const p = offsetNorth(10, 20, 1)
    assert.equal(engine.update({ ...p }).reason, 'invalid-accuracy')
    assert.equal(engine.update({ ...p, accuracy: -1 }).reason, 'invalid-accuracy')
    assert.equal(events.length, 0)
  })

  it('low-accuracy readings update distance but never fire events or change state', () => {
    const { engine, events } = setup([ALPHA], { maxAccuracyMeters: 50 })
    const r = engine.update(at(10, 200))
    assert.equal(r.accepted, false)
    assert.equal(r.reason, 'low-accuracy')
    assert.equal(events.length, 0)
    const s = engine.getStatuses()[0]
    assert.equal(s.state, 'unknown')
    assert.ok(Math.abs(s.distanceMeters - 10) < 0.01)

    engine.update(at(10, 5)) // good reading → enter
    engine.update(at(500, 200)) // poor reading far away must NOT cause exit
    assert.deepEqual(events.map((e) => e.type), ['enter'])
    assert.equal(engine.getStatuses()[0].state, 'inside')
  })

  it('a throwing listener does not break the engine', () => {
    const engine = createProximityEngine({
      targets: [ALPHA],
      onEvent: () => {
        throw new Error('boom')
      },
    })
    const original = console.error
    console.error = () => {}
    try {
      assert.doesNotThrow(() => engine.update(at(10)))
    } finally {
      console.error = original
    }
    assert.equal(engine.getStatuses()[0].state, 'inside')
  })
})

describe('target validation and management', () => {
  it('validateTarget reports problems', () => {
    assert.equal(validateTarget(ALPHA), null)
    assert.ok(validateTarget(null))
    assert.ok(validateTarget({ ...ALPHA, id: '' }))
    assert.ok(validateTarget({ ...ALPHA, name: ' ' }))
    assert.ok(validateTarget({ ...ALPHA, latitude: 99 }))
    assert.ok(validateTarget({ ...ALPHA, radiusMeters: 0 }))
    assert.ok(validateTarget({ ...ALPHA, radiusMeters: -5 }))
    assert.ok(validateTarget({ ...ALPHA, radiusMeters: '50' }))
    assert.ok(validateTarget({ ...ALPHA, audioRef: 42 }))
  })

  it('skips invalid and duplicate targets and reports them', () => {
    const { engine } = setup([ALPHA, { ...ALPHA, name: 'Dup' }, { id: 'bad' }])
    assert.equal(engine.getStatuses().length, 1)
    assert.equal(engine.getInvalidTargets().length, 2)
  })

  it('missing audioRef defaults to null in events', () => {
    const { engine, events } = setup([BETA])
    engine.update(at(10))
    assert.equal(events[0].audioRef, null)
  })

  it('keeps state for existing targets when the target list changes', () => {
    const { engine, events } = setup([ALPHA])
    engine.update(at(10))
    engine.setTargets([ALPHA, BETA])
    engine.update(at(10))
    assert.deepEqual(events.map((e) => `${e.targetId}:${e.type}`), ['a:enter', 'b:enter'])
  })

  it('reevaluate applies a new radius to the last reading', () => {
    const { engine, events } = setup([ALPHA])
    engine.update(at(80)) // outside 50
    engine.setTargets([{ ...ALPHA, radiusMeters: 100 }])
    engine.reevaluate()
    assert.deepEqual(events.map((e) => e.type), ['enter'])
  })

  it('reset forgets state so the next inside reading enters again', () => {
    const { engine, events } = setup()
    engine.update(at(10))
    engine.reset()
    assert.equal(engine.getStatuses()[0].state, 'unknown')
    engine.update(at(10))
    assert.equal(events.length, 2)
  })
})
