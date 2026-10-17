import http from 'node:http';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import mongoose from 'mongoose';

// Load environment variables
dotenv.config();

import { connectDB } from './config/db.js';
import { pubClient, subClient, initRedis } from './config/redis.js';
import { registerSignalingHandler } from './sockets/signalingHandler.js';
import UserSession from './models/UserSession.js';

const PORT = process.env.PORT || 5000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

// 1. Initialize Express App
const app = express();
app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json());

// 2. HTTP Server & Socket.io Initialization
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: CORS_ORIGIN,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingInterval: 10000,
  pingTimeout: 5000,
  transports: ['websocket', 'polling'],
});

// 3. Health & Observability Endpoints
app.get('/', (req, res) => {
  res.json({
    service: 'ProxiSpeak Backend Ecosystem',
    description: 'Real-time geospatial audio and WebRTC signaling engine for virtual offices',
    status: 'online',
    version: '1.0.0',
    geospatialEngine: 'MongoDB 2dsphere ($near < 20ms)',
    pubsubScaling: '@socket.io/redis-adapter',
  });
});

app.get('/health', async (req, res) => {
  const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  const redisPubStatus = pubClient.isOpen ? 'ready' : 'offline';
  const redisSubStatus = subClient.isOpen ? 'ready' : 'offline';

  const isHealthy = mongoose.connection.readyState === 1;

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'degraded',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    services: {
      mongodb: mongoStatus,
      redisPub: redisPubStatus,
      redisSub: redisSubStatus,
    },
  });
});

app.get('/api/rooms/:roomId/users', async (req, res) => {
  try {
    const { roomId } = req.params;
    const activeUsers = await UserSession.find({ roomId, isActive: true })
      .select('userId socketId location lastActiveAt')
      .lean();
    res.json({ roomId, count: activeUsers.length, users: activeUsers });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Register Socket.io Connection & Signaling Handlers
io.on('connection', (socket) => {
  registerSignalingHandler(io, socket);
});

// 5. System Bootstrap Sequence
const bootstrap = async () => {
  console.log('------------------------------------------------------------');
  console.log('🚀 Initializing ProxiSpeak Real-Time Geospatial Backend...');
  console.log('------------------------------------------------------------');

  // Step A: Connect to MongoDB
  try {
    await connectDB();
    console.log('✅ [Database] MongoDB connection established with 2dsphere indexing ready.');
  } catch (err) {
    console.error('❌ [Database] Failed to connect to MongoDB:', err.message);
    console.warn('⚠️ Server will continue, but geospatial operations require MongoDB.');
  }

  // Step B: Connect to Redis & Attach Socket.io Adapter for Horizontal Scaling
  try {
    await initRedis();
    io.adapter(createAdapter(pubClient, subClient));
    console.log('✅ [Pub/Sub] Socket.io Redis adapter successfully bound for multi-instance scaling.');
  } catch (err) {
    console.warn('⚠️ [Pub/Sub] Redis connection bypassed or unavailable. Operating with standard in-memory adapter:', err.message);
  }

  // Step C: Start HTTP and WebSocket listener
  let currentPort = Number(PORT);
  httpServer.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`⚠️ [Server] Port ${currentPort} is in use. Attempting fallback to port ${currentPort + 1}...`);
      currentPort += 1;
      setTimeout(() => {
        httpServer.listen(currentPort);
      }, 500);
    } else {
      console.error('❌ [Server] Fatal HTTP listener error:', err.message);
    }
  });

  httpServer.listen(currentPort, () => {
    console.log(`✅ [ProxiSpeak] Server actively listening on http://localhost:${currentPort}`);
    console.log(`📡 [Socket.io] Real-time engine ready for spatial audio signaling.`);
    console.log('------------------------------------------------------------');
  });
};

// 6. Graceful Shutdown
const gracefulShutdown = async (signal) => {
  console.log(`\n[Shutdown] Received ${signal}. Closing HTTP and WebSocket connections...`);

  httpServer.close(async () => {
    console.log('[Shutdown] HTTP & Socket.io servers terminated.');
    try {
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.close(false);
        console.log('[Shutdown] MongoDB connection closed.');
      }
      if (pubClient.isOpen) await pubClient.quit();
      if (subClient.isOpen) await subClient.quit();
      console.log('[Shutdown] Redis clients closed.');
      process.exit(0);
    } catch (err) {
      console.error('[Shutdown] Error during clean exit:', err.message);
      process.exit(1);
    }
  });

  // Force exit if shutdown hangs
  setTimeout(() => {
    console.error('[Shutdown] Forced shutdown after timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Execute initialization
bootstrap();

export { app, httpServer, io };
