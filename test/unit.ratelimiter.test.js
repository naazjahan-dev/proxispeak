import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRateLimiter } from '../utils/rateLimiter.js';

test('token bucket allows up to capacity then throttles', () => {
  let t = 1000;
  const limiter = createRateLimiter({ capacity: 2, refillPerSec: 2, now: () => t });
  assert.equal(limiter.consume(), true);
  assert.equal(limiter.consume(), true);
  assert.equal(limiter.consume(), false); // exhausted

  t += 500; // refill 1 token
  assert.equal(limiter.consume(), true);
  assert.equal(limiter.consume(), false);

  t += 2000; // refill to capacity
  assert.equal(limiter.available() >= 2, true);
});
