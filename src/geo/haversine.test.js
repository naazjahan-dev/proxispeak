import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { haversineDistance, isValidCoordinate } from './haversine.js'
import { offsetNorth } from './offset.js'

describe('isValidCoordinate', () => {
  it('accepts valid and boundary values', () => {
    assert.equal(isValidCoordinate(0, 0), true)
    assert.equal(isValidCoordinate(90, 180), true)
    assert.equal(isValidCoordinate(-90, -180), true)
  })
  it('rejects out-of-range, non-numbers and non-finite values', () => {
    for (const [a, b] of [
      [90.0001, 0], [-90.0001, 0], [0, 180.0001], [0, -180.0001],
      [NaN, 0], [0, Infinity], ['10', '20'], [null, 5], [undefined, undefined],
    ]) {
      assert.equal(isValidCoordinate(a, b), false, `${a},${b}`)
    }
  })
})

describe('haversineDistance', () => {
  it('returns 0 for identical coordinates', () => {
    assert.equal(haversineDistance(12.34, 56.78, 12.34, 56.78), 0)
  })

  it('matches a known distance: London to Paris ≈ 343.5 km', () => {
    const d = haversineDistance(51.5074, -0.1278, 48.8566, 2.3522)
    assert.ok(Math.abs(d - 343_500) < 2_000, `got ${d}`)
  })

  it('matches a known distance: New York to Los Angeles ≈ 3936 km', () => {
    const d = haversineDistance(40.7128, -74.006, 34.0522, -118.2437)
    assert.ok(Math.abs(d - 3_936_000) < 15_000, `got ${d}`)
  })

  it('one degree of latitude ≈ 111.19 km', () => {
    const d = haversineDistance(0, 0, 1, 0)
    assert.ok(Math.abs(d - 111_195) < 50, `got ${d}`)
  })

  it('is symmetric', () => {
    const a = haversineDistance(10, 20, -30, 40)
    const b = haversineDistance(-30, 40, 10, 20)
    assert.ok(Math.abs(a - b) < 1e-6)
  })

  it('handles the poles and the antimeridian', () => {
    // pole to pole = half the circumference ≈ 20,015 km
    const poles = haversineDistance(90, 0, -90, 0)
    assert.ok(Math.abs(poles - 20_015_087) < 100, `got ${poles}`)
    // 179.9 and -179.9 are only 0.2° apart across the antimeridian
    const across = haversineDistance(0, 179.9, 0, -179.9)
    assert.ok(Math.abs(across - 22_239) < 20, `got ${across}`)
    // longitude is meaningless at the pole: distance must be 0
    assert.ok(haversineDistance(90, 0, 90, 123) < 1e-6)
  })

  it('returns null (never throws / NaN) for invalid input', () => {
    assert.equal(haversineDistance(91, 0, 0, 0), null)
    assert.equal(haversineDistance(0, 0, 0, 181), null)
    assert.equal(haversineDistance(NaN, 0, 0, 0), null)
    assert.equal(haversineDistance('1', '2', 3, 4), null)
    assert.equal(haversineDistance(undefined, undefined, 1, 1), null)
    assert.equal(haversineDistance(), null)
  })
})

describe('offsetNorth', () => {
  it('moves the requested number of metres', () => {
    const p = offsetNorth(10, 20, 100)
    assert.equal(p.longitude, 20)
    const d = haversineDistance(10, 20, p.latitude, p.longitude)
    assert.ok(Math.abs(d - 100) < 0.001, `got ${d}`)
  })
  it('returns null for invalid input or leaving the valid range', () => {
    assert.equal(offsetNorth(95, 0, 10), null)
    assert.equal(offsetNorth(0, 0, NaN), null)
    assert.equal(offsetNorth(89.9999, 0, 1_000_000), null)
  })
})
