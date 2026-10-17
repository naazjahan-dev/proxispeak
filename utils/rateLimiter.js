/**
 * Minimal per-socket token-bucket rate limiter.
 *
 * @param {{ capacity?: number, refillPerSec?: number, now?: () => number }} [options]
 * @returns {{ consume: (cost?: number) => boolean, available: () => number }}
 */
export function createRateLimiter(options = {}) {
  const capacity = Number.isFinite(options.capacity) && options.capacity > 0 ? options.capacity : 10;
  const refillPerSec =
    Number.isFinite(options.refillPerSec) && options.refillPerSec > 0 ? options.refillPerSec : capacity;
  const now = typeof options.now === 'function' ? options.now : Date.now;

  let tokens = capacity;
  let last = now();

  function refill() {
    const current = now();
    const elapsedSeconds = Math.max(0, current - last) / 1000;
    last = current;
    tokens = Math.min(capacity, tokens + elapsedSeconds * refillPerSec);
  }

  return {
    consume(cost = 1) {
      refill();
      if (tokens >= cost) {
        tokens -= cost;
        return true;
      }
      return false;
    },
    available() {
      refill();
      return tokens;
    },
  };
}

export default createRateLimiter;
