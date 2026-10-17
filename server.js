import http from 'node:http';
import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';

import { config, assertValidConfig } from './config/env.js';
import { connectDB, closeDB, isDbConnected } from './config/db.js';
import { pubClient, subClient, initRedis, isRedisReady, closeRedis } from './config/redis.js';
import { registerSignalingHandler } from './sockets/signalingHandler.js';
import UserSession from './models/UserSession.js';

// ---------------------------------------------------------------------------
// 1. Express app
// ---------------------------------------------------------------------------
const app = express();

const corsOptions = {
  origin: config.corsOrigin === '*' ? '*' : config.corsOrigins,
  credentials: config.allowCredentials,
  methods: ['GET', 'POST'],
};
app.use(cors(corsOptions));
app.disable('x-powered-by');
app.use(express.json({ limit: config.jsonBodyLimit }));

// ---------------------------------------------------------------------------
// 2. HTTP server + Socket.IO
// ---------------------------------------------------------------------------
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: corsOptions,
  pingInterval: 10000,
  pingTimeout: 5000,
  transports: ['websocket', 'polling'],
  maxHttpBufferSize: 1e5, // 100 KB cap per socket message
});

// ---------------------------------------------------------------------------
// 3. HTTP endpoints
// ---------------------------------------------------------------------------
app.get('/', (req, res) => {
  res.json({
    service: 'ProxiSpeak Backend',
    description: 'Real-time proximity audio and WebRTC signaling engine for virtual offices',
    status: 'online',
    version: '1.0.0',
    proximityRadius: config.proximityRadius,
    proximityModel: 'planar-euclidean',
    pubsub: isRedisReady() ? 'redis-adapter' : 'in-memory-adapter',
  });
});

app.get('/health', (req, res) => {
  const mongoConnected = isDbConnected();
  const redisConnected = isRedisReady();

  res.status(mongoConnected ? 200 : 503).json({
    status: mongoConnected ? 'healthy' : 'degraded',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    services: {
      mongodb: mongoConnected ? 'connected' : 'disconnected',
      redis: redisConnected ? 'ready' : config.redisEnabled ? 'unavailable' : 'disabled',
    },
  });
});

app.get('/api/rooms/:roomId/users', async (req, res, next) => {
  try {
    const roomId = String(req.params.roomId || '').trim();
    if (!roomId || roomId.length > 128) {
      return res.status(400).json({ error: 'roomId must be a non-empty string of at most 128 characters' });
    }

    const activeUsers = await UserSession.find({ roomId, isActive: true })
      .select('userId socketId location lastActiveAt')
      .lean();

    res.json({ roomId, count: activeUsers.length, users: activeUsers });
  } catch (error) {
    next(error);
  }
});

// Unknown route
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Central error handler (kept last)
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  console.error('[HTTP] Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// ---------------------------------------------------------------------------
// 4. Socket.IO handlers
// ---------------------------------------------------------------------------
io.on('connection', (socket) => {
  registerSignalingHandler(io, socket);
});

// ---------------------------------------------------------------------------
// 5. Bootstrap
// ---------------------------------------------------------------------------
let sessionJanitor = null;

/**
 * Deactivate sessions whose socket is no longer connected. Runs at boot
 * (clearing sessions from a previous process) and on a timer.
 */
async function sweepOrphanSessions() {
  try {
    const liveSocketIds = new Set(io.sockets.sockets.keys());
    const deactivated = await UserSession.sweepOrphanSessions(liveSocketIds);
    if (deactivated > 0) {
      console.log(`[Sessions] Deactivated ${deactivated} orphaned session(s).`);
    }
  } catch (err) {
    console.warn(`[Sessions] Orphan sweep skipped: ${err.message}`);
  }
}

export async function startServer() {
  try {
    assertValidConfig(config);
  } catch (err) {
    console.error(`\n${err.message}\n`);
    process.exit(1);
  }

  console.log('------------------------------------------------------------');
  console.log('ProxiSpeak real-time proximity backend starting...');
  console.log(`Environment: ${config.nodeEnv}`);
  console.log('------------------------------------------------------------');

  try {
    await connectDB();
    console.log('[Database] MongoDB connection established.');
    await sweepOrphanSessions();
    sessionJanitor = setInterval(sweepOrphanSessions, config.sessionSweepIntervalMs);
    sessionJanitor.unref();
  } catch (err) {
    if (config.isProduction) {
      console.error(`[Database] Fatal: cannot start in production without MongoDB: ${err.message}`);
      process.exit(1);
    }
    console.warn(`[Database] MongoDB unavailable: ${err.message}. HTTP will report degraded health.`);
  }

  if (await initRedis()) {
    io.adapter(createAdapter(pubClient, subClient));
    console.log('[Pub/Sub] Socket.IO Redis adapter bound.');
  } else {
    console.warn('[Pub/Sub] Using single-instance in-memory adapter.');
  }

  try {
    await new Promise((resolve, reject) => {
      const onError = (err) => reject(err);
      httpServer.once('error', onError);
      httpServer.listen(config.port, () => {
        httpServer.off('error', onError);
        resolve();
      });
    });
  } catch (err) {
    if (err.code === 'EADDRINUSE') {
      console.error(`[Server] Port ${config.port} is already in use. Set a different PORT and retry.`);
    } else {
      console.error(`[Server] Failed to start HTTP listener: ${err.message}`);
    }
    process.exit(1);
  }

  const actualPort = httpServer.address().port;
  console.log(`[ProxiSpeak] Listening on http://localhost:${actualPort}`);
  console.log('------------------------------------------------------------');
  return { app, httpServer, io, port: actualPort };
}

// ---------------------------------------------------------------------------
// 6. Graceful shutdown
// ---------------------------------------------------------------------------
let shuttingDown = false;

/**
 * Close Socket.IO, HTTP, Redis and MongoDB without terminating the process.
 * Used by gracefulShutdown() and by integration tests.
 */
export async function stopServer() {
  if (sessionJanitor) clearInterval(sessionJanitor);
  sessionJanitor = null;
  await new Promise((resolve) => io.close(resolve));
  if (httpServer.listening) {
    await new Promise((resolve) => httpServer.close(() => resolve()));
  }
  await new Promise((resolve) => setTimeout(resolve, 150)); // let async cleanup drain
  await closeRedis();
  await closeDB();
}

export async function gracefulShutdown(signal = 'manual') {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n[Shutdown] Received ${signal}. Closing services...`);

  const forceExit = setTimeout(() => {
    console.error('[Shutdown] Forced exit after timeout.');
    process.exit(1);
  }, config.shutdownTimeoutMs);

  try {
    // Stop accepting connections and disconnect sockets first, so the socket
    // 'disconnect' handlers can still reach MongoDB to clean up sessions.
    await stopServer();
    clearTimeout(forceExit);
    console.log('[Shutdown] Complete.');
    process.exit(0);
  } catch (err) {
    console.error(`[Shutdown] Error: ${err.message}`);
    process.exit(1);
  }
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

if (config.autoStart) {
  startServer();
}

export { app, httpServer, io };
