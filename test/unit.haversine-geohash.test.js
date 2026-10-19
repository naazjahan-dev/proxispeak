import { test } from 'node:test';
import assert from 'node:assert/strict';
import { haversineDistance, isWithinHaversineRadius, calculateSpatialGain } from '../utils/coordinates.js';
import { encodeGeohash, decodeGeohash, getGeohashWithNeighbors } from '../utils/geohash.js';

test('Haversine distance between identical points is 0', () => {
  const p = [-0.1278, 51.5074];
  const dist = haversineDistance(p, p);
  assert.equal(dist, 0);
  assert.equal(isWithinHaversineRadius(p, p, 100), true);
});

test('Haversine distance correctly calculates real-world meter distances', () => {
  // Point A in London
  const p1 = [-0.1278, 51.5074];
  // Point B is ~111 meters north (0.001 deg latitude ~ 111.19 meters)
  const p2 = [-0.1278, 51.5084];
  const dist = haversineDistance(p1, p2);

  assert(dist > 110 && dist < 112, `Expected ~111m, got ${dist}`);
  assert.equal(isWithinHaversineRadius(p1, p2, 100), false);
  assert.equal(isWithinHaversineRadius(p1, p2, 120), true);
});

test('Spatial audio gain decays linearly and clamps at boundary', () => {
  assert.equal(calculateSpatialGain(0, 100), 1.0);
  assert.equal(calculateSpatialGain(50, 100), 0.5);
  assert.equal(calculateSpatialGain(100, 100), 0.0);
  assert.equal(calculateSpatialGain(150, 100), 0.0);
  assert.equal(calculateSpatialGain(-10, 100), 1.0);
});

test('Geohash encoding and decoding', () => {
  const coords = [-0.1278, 51.5074]; // [lon, lat]
  const hash = encodeGeohash(coords, 7);

  assert.equal(typeof hash, 'string');
  assert.equal(hash.length, 7);
  assert(hash.startsWith('gcpvj'), `Expected prefix gcpvj, got ${hash}`);

  const decoded = decodeGeohash(hash);
  assert(Math.abs(decoded.longitude - coords[0]) < 0.005);
  assert(Math.abs(decoded.latitude - coords[1]) < 0.005);
});

test('Geohash neighbors returns 9 distinct contiguous cells', () => {
  const coords = [-0.1278, 51.5074];
  const hash = encodeGeohash(coords, 7);
  const cells = getGeohashWithNeighbors(hash);

  assert.equal(cells.length, 9);
  assert.equal(cells[0], hash); // center hash is first
  const uniqueCells = new Set(cells);
  assert.equal(uniqueCells.size, 9);
});

test('Geohash throws on out-of-range coordinates', () => {
  assert.throws(() => encodeGeohash([200, 45]), /out of geographic range/);
  assert.throws(() => encodeGeohash([10, -95]), /out of geographic range/);
});
