import { createClient } from 'redis';

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

/**
 * Primary Redis client for publishing and general cache ops.
 */
export const pubClient = createClient({
  url: redisUrl,
  socket: {
    reconnectStrategy: (retries) => {
      if (retries >= 3) {
        return new Error('Redis connection attempts exceeded limit.');
      }
      return Math.min(retries * 100, 1000);
    },
  },
});

/**
 * Duplicate client dedicated to subscriptions (required by @socket.io/redis-adapter).
 */
export const subClient = pubClient.duplicate();

pubClient.on('connect', () => {
  console.log('[Redis Pub] Client connected to Redis server');
});

pubClient.on('ready', () => {
  console.log('[Redis Pub] Client ready to transmit events');
});

pubClient.on('error', (err) => {
  console.error('[Redis Pub] Error:', err.message);
});

subClient.on('connect', () => {
  console.log('[Redis Sub] Client connected to Redis server');
});

subClient.on('ready', () => {
  console.log('[Redis Sub] Client ready to receive subscribed events');
});

subClient.on('error', (err) => {
  console.error('[Redis Sub] Error:', err.message);
});

/**
 * Initialize and connect both pub and sub Redis clients concurrently.
 */
export const initRedis = async () => {
  try {
    await Promise.all([pubClient.connect(), subClient.connect()]);
    console.log('[Redis] Pub/Sub cluster clients successfully initialized.');
    return { pubClient, subClient };
  } catch (error) {
    console.error('[Redis] Initialization failure:', error.message);
    throw error;
  }
};

export default { pubClient, subClient, initRedis };
