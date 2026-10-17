import { createClient } from 'redis';
import { config } from './env.js';

let redisAvailable = false;

function buildClient() {
  return createClient({
    url: config.redisUrl,
    socket: {
      connectTimeout: 3000,
      reconnectStrategy: (retries) => {
        // Give up after a bounded number of attempts so a missing Redis does
        // not keep the process retrying forever. The server degrades to the
        // in-memory Socket.IO adapter in that case.
        if (retries > 3) return new Error('Redis reconnect attempts exceeded limit.');
        return Math.min(retries * 200, 1000);
      },
    },
  });
}

/** Primary Redis client (publish + general operations). */
export const pubClient = buildClient();

/** Duplicate client dedicated to subscriptions (required by the adapter). */
export const subClient = pubClient.duplicate();

// 'error' listeners must be attached before connect(), otherwise Node treats a
// failed connection as an unhandled 'error' event and crashes the process.
pubClient.on('connect', () => console.log('[Redis Pub] Connected'));
pubClient.on('ready', () => console.log('[Redis Pub] Ready'));
pubClient.on('end', () => {
  redisAvailable = false;
  console.warn('[Redis Pub] Connection closed');
});
pubClient.on('error', (err) => console.warn(`[Redis Pub] ${err.message}`));

subClient.on('connect', () => console.log('[Redis Sub] Connected'));
subClient.on('ready', () => console.log('[Redis Sub] Ready'));
subClient.on('end', () => {
  redisAvailable = false;
  console.warn('[Redis Sub] Connection closed');
});
subClient.on('error', (err) => console.warn(`[Redis Sub] ${err.message}`));

/**
 * Attempt to connect both Redis clients.
 *
 * Redis is OPTIONAL: when disabled via REDIS_ENABLED=false, or when a
 * connection cannot be established, this resolves to `false` and the caller
 * keeps the single-instance in-memory Socket.IO adapter. Multi-instance
 * fan-out is only guaranteed when this returns `true`.
 *
 * @returns {Promise<boolean>} whether Redis pub/sub is ready for the adapter.
 */
export const initRedis = async () => {
  if (!config.redisEnabled) {
    console.warn('[Redis] Disabled via REDIS_ENABLED=false; using in-memory adapter.');
    return false;
  }

  try {
    await Promise.all([pubClient.connect(), subClient.connect()]);
    redisAvailable = true;
    console.log('[Redis] Pub/Sub clients ready; multi-instance adapter enabled.');
    return true;
  } catch (error) {
    redisAvailable = false;
    console.warn(`[Redis] Unavailable (${error.message}); using in-memory adapter.`);
    return false;
  }
};

/** True only when both clients are connected and ready. */
export function isRedisReady() {
  return redisAvailable && pubClient.isReady === true && subClient.isReady === true;
}

/** Close Redis connections if open (safe to call during shutdown). */
export const closeRedis = async () => {
  redisAvailable = false;
  const closers = [];
  if (pubClient.isOpen) closers.push(pubClient.quit().catch(() => pubClient.disconnect()));
  if (subClient.isOpen) closers.push(subClient.quit().catch(() => subClient.disconnect()));
  await Promise.allSettled(closers);
};

export default { pubClient, subClient, initRedis, isRedisReady, closeRedis };
