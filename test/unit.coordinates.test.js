import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCoordinates, planarDistance, isWithinRadius } from '../utils/coordinates.js';

test('parses array [x,y]', () => {
  const r = parseCoordinates([10, 20]);
  assert.equal(r.ok, true);
  assert.deepEqual(r.coordinates, [10, 20]);
});

test('parses object {x,y}', () => {
  const r = parseCoordinates({ x: 5, y: -3 });
  assert.equal(r.ok, true);
  assert.deepEqual(r.coordinates, [5, -3]);
});

test('parses {coordinates:[x,y]}', () => {
  const r = parseCoordinates({ coordinates: [1, 2] });
  assert.equal(r.ok, true);
  assert.deepEqual(r.coordinates, [1, 2]);
});

test('rejects non-finite and out-of-bounds', () => {
  const bad1 = parseCoordinates(['a', 'b']);
  assert.equal(bad1.ok, false);
  const bad2 = parseCoordinates({ x: NaN, y: 0 });
  assert.equal(bad2.ok, false);
  const bad3 = parseCoordinates([1e9, 0], { maxAbs: 100000 });
  assert.equal(bad3.ok, false);
});

test('planar distance and inclusive boundary', () => {
  const d = planarDistance([0, 0], [100, 0]);
  assert.equal(d, 100);
  assert.equal(isWithinRadius([0, 0], [100, 0], 100), true);
  assert.equal(isWithinRadius([0, 0], [100.0001, 0], 100), false);
});
