import { config } from '../config/env.js';

/**
 * Virtual-office coordinates are planar (x, y) values, measured in the same
 * units as the proximity radius (pixels by default). They are NOT geographic
 * longitude/latitude and are never interpreted spherically.
 */

/**
 * Parse and validate a coordinate input from a client payload.
 *
 * Accepts:
 *  - `[x, y]` array
 *  - `{ x, y }` object
 *  - `{ coordinates: [x, y] }` object
 *
 * @param {unknown} input
 * @param {{ maxAbs?: number }} [options]
 * @returns {{ ok: true, coordinates: [number, number], error: null }
 *          | { ok: false, coordinates: null, error: string }}
 */
export function parseCoordinates(input, options = {}) {
  const maxAbs = Number.isFinite(options.maxAbs) ? options.maxAbs : config.maxCoordinateAbs;

  let candidate = null;
  if (Array.isArray(input) && input.length === 2) {
    candidate = input;
  } else if (input && typeof input === 'object') {
    if (Number.isFinite(input.x) && Number.isFinite(input.y)) {
      candidate = [input.x, input.y];
    } else if (Array.isArray(input.coordinates) && input.coordinates.length === 2) {
      candidate = input.coordinates;
    }
  }

  if (!candidate) {
    return { ok: false, coordinates: null, error: 'coordinates must be provided as [x, y] or { x, y }' };
  }

  const [x, y] = candidate;
  if (typeof x !== 'number' || typeof y !== 'number' || !Number.isFinite(x) || !Number.isFinite(y)) {
    return { ok: false, coordinates: null, error: 'coordinates must be two finite numbers' };
  }

  if (Math.abs(x) > maxAbs || Math.abs(y) > maxAbs) {
    return { ok: false, coordinates: null, error: `coordinates must satisfy |x|, |y| <= ${maxAbs}` };
  }

  return { ok: true, coordinates: [x, y], error: null };
}

/**
 * Planar Euclidean distance between two [x, y] points.
 * @returns {number}
 */
export function planarDistance([ax, ay], [bx, by]) {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Whether point `b` is within `radius` (inclusive) of point `a`.
 * Boundary points (distance === radius) count as inside.
 * @returns {boolean}
 */
export function isWithinRadius(a, b, radius = config.proximityRadius) {
  return planarDistance(a, b) <= radius;
}

export default { parseCoordinates, planarDistance, isWithinRadius };
