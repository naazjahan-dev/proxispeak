import http from 'node:http';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';

import { config, assertValidConfig } from './config/env.js';
import { connectDB, closeDB, isDbConnected } from './config/db.js';
import {
  pubClient,
  subClient,
  initRedis,
  isRedisReady,
  closeRedis
} from './config/redis.js';

import { registerSignalingHandler } from './sockets/signalingHandler.js';
import UserSession from './models/UserSession.js';
import AudioSource from './models/AudioSource.js';
import authRoutes from './routes/authRoutes.js';

import {
  authenticateToken,
  requireAdmin
} from './middleware/authMiddleware.js';

import {
  encodeGeohash,
  decodeGeohash,
  getGeohashWithNeighbors
} from './utils/geohash.js';

// ============================================================
// 1. EXPRESS APP
// ============================================================

const app = express();

// ============================================================
// 2. LOCAL AUDIO STORAGE CONFIGURATION
// ============================================================

const uploadDir = path.resolve(process.cwd(), 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const audioStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    cb(null, `${randomUUID()}${extension}`);
  }
});

const allowedAudioMimeTypes = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/ogg',
  'audio/webm',
  'audio/mp4',
  'audio/aac',
  'audio/flac',
  'audio/m4a',
  'audio/x-m4a'
]);

const audioUpload = multer({
  storage: audioStorage,
  limits: {
    fileSize: 25 * 1024 * 1024,
    files: 1
  },
  fileFilter: (_req, file, cb) => {
    if (!allowedAudioMimeTypes.has(file.mimetype)) {
      return cb(new Error(`Unsupported audio type: ${file.mimetype}`));
    }
    cb(null, true);
  }
});

// ============================================================
// 3. MIDDLEWARE
// ============================================================

const corsOptions = {
  origin: config.corsOrigin === '*' ? '*' : config.corsOrigins,
  credentials: config.allowCredentials,
  methods: ['GET', 'POST', 'PATCH']
};

app.use(cors(corsOptions));
app.disable('x-powered-by');

app.use(express.json({
  limit: config.jsonBodyLimit
}));

app.use('/api/auth', authRoutes);

app.use(express.static('public', {
  index: false
}));

app.use('/uploads', express.static(uploadDir, {
  fallthrough: false,
  index: false
}));

// ============================================================
// 4. HTTP SERVER + SOCKET.IO
// ============================================================

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: corsOptions,
  pingInterval: 10000,
  pingTimeout: 5000,
  transports: ['websocket', 'polling'],
  maxHttpBufferSize: 1e5
});

// ============================================================
// 5. BASIC API ROUTES
// ============================================================

app.get('/', (req, res) => {
  res.json({
    service: 'ProxiSpeak Backend',
    description: 'Real-time geospatial audio and WebRTC signaling engine for virtual offices',
    status: 'online',
    version: '1.0.0',
    proximityRadius: config.proximityRadius,
    proximityRadiusMeters: config.proximityRadius,
    proximityModel: 'planar-euclidean',
    geospatialEngine: 'MongoDB 2dsphere ($near)',
    geohash: 'Enabled (ngeohash precision 7)',
    distanceFilter: 'Haversine formula (meters)',
    mapVisualizer: '/map',
    pubsub: isRedisReady() ? 'redis-adapter' : 'in-memory-adapter'
  });
});

app.get('/map', (req, res) => {
  res.sendFile('index.html', {
    root: 'public'
  });
});

// ============================================================
// 6. HEALTH CHECK
// ============================================================

app.get('/health', (req, res) => {
  const mongoConnected = isDbConnected();
  const redisConnected = isRedisReady();

  res.status(mongoConnected ? 200 : 503).json({
    status: mongoConnected ? 'healthy' : 'degraded',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    services: {
      mongodb: mongoConnected ? 'connected' : 'disconnected',
      redis: redisConnected
        ? 'ready'
        : config.redisEnabled
          ? 'unavailable'
          : 'disabled'
    }
  });
});

// ============================================================
// 7. AUDIO UPLOAD HELPERS
// ============================================================

function removeUploadedFile(filePath) {
  if (!filePath) return;

  fs.unlink(filePath, error => {
    if (error && error.code !== 'ENOENT') {
      console.error('[Audio] File cleanup failed:', error.message);
    }
  });
}

// ============================================================
// 8. COMMON AUDIO UPLOAD HANDLER
// ============================================================

async function handleAudioUpload(req, res, next, audioType) {
  const savedFilePath = req.file?.path;

  try {
    if (!isDbConnected()) {
      removeUploadedFile(savedFilePath);
      return res.status(503).json({
        error: 'Database is unavailable; audio was not saved'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error: 'Audio file is required in the audio field'
      });
    }

    const { title, city, state, category } = req.body;

    const latitude = Number(req.body.latitude);
    const longitude = Number(req.body.longitude);

    const radiusKm = req.body.radiusKm === undefined
      ? 2
      : Number(req.body.radiusKm);

    const duration = req.body.duration === undefined
      ? 90
      : Number(req.body.duration);

    if (
      ![title, city, state, category].every(
        value => typeof value === 'string' && value.trim()
      )
    ) {
      removeUploadedFile(savedFilePath);
      return res.status(400).json({
        error: 'title, city, state and category are required'
      });
    }

    if (
      !Number.isFinite(latitude) ||
      latitude < -90 ||
      latitude > 90 ||
      !Number.isFinite(longitude) ||
      longitude < -180 ||
      longitude > 180
    ) {
      removeUploadedFile(savedFilePath);
      return res.status(400).json({
        error: 'Valid latitude and longitude are required'
      });
    }

    if (
      !Number.isFinite(radiusKm) ||
      radiusKm <= 0 ||
      radiusKm > 100
    ) {
      removeUploadedFile(savedFilePath);
      return res.status(400).json({
        error: 'radiusKm must be greater than 0 and at most 100'
      });
    }

    if (!Number.isFinite(duration) || duration < 0) {
      removeUploadedFile(savedFilePath);
      return res.status(400).json({
        error: 'duration must be a non-negative number'
      });
    }

    let tags = [];

    if (req.body.tags) {
      try {
        tags = Array.isArray(req.body.tags)
          ? req.body.tags
          : (
              String(req.body.tags).trim().startsWith('[')
                ? JSON.parse(req.body.tags)
                : String(req.body.tags).split(',')
            );
      } catch {
        removeUploadedFile(savedFilePath);
        return res.status(400).json({
          error: 'tags must be comma-separated text or a JSON array'
        });
      }

      if (
        !Array.isArray(tags) ||
        !tags.every(tag => typeof tag === 'string')
      ) {
        removeUploadedFile(savedFilePath);
        return res.status(400).json({
          error: 'tags must contain only strings'
        });
      }
    }

    const audioUrl = `/uploads/${path.basename(req.file.filename)}`;
    const isHeritage = audioType === 'heritage';

    const source = await AudioSource.create({
      id: randomUUID(),
      title: title.trim(),
      city: city.trim(),
      state: state.trim(),
      author: req.user.name || 'Anonymous',
      category: category.trim(),

      description: typeof req.body.description === 'string'
        ? req.body.description.trim()
        : '',

      descriptionHi: typeof req.body.descriptionHi === 'string'
        ? req.body.descriptionHi.trim()
        : '',

      history: typeof req.body.history === 'string'
        ? req.body.history.trim()
        : '',

      coordinates: {
        latitude,
        longitude
      },

      audioUrl,
      duration,
      tags: tags.map(tag => tag.trim()).filter(Boolean),
      radiusKm,

      language: typeof req.body.language === 'string'
        ? req.body.language.trim()
        : 'hi-IN',

      audioType,
      uploadedBy: req.user._id,
      approvalStatus: isHeritage ? 'approved' : 'pending',
      isPlace: isHeritage
    });

    return res.status(201).json({
      message: isHeritage
        ? 'Heritage audio uploaded successfully'
        : 'Community audio uploaded successfully and is awaiting approval',

      source: {
        id: source.id,
        title: source.title,
        city: source.city,
        state: source.state,
        category: source.category,
        audioType: source.audioType,
        approvalStatus: source.approvalStatus,
        uploadedBy: source.uploadedBy,
        coordinates: source.coordinates,
        audioUrl: source.audioUrl,
        duration: source.duration,
        radiusKm: source.radiusKm
      }
    });

  } catch (error) {
    removeUploadedFile(savedFilePath);
    next(error);
  }
}

// ============================================================
// 9. COMMUNITY AUDIO UPLOAD
// POST /api/audio/community/upload
// POST /api/audio/upload (legacy compatibility)
// ============================================================

app.post(
  [
    '/api/audio/community/upload',
    '/api/audio/upload'
  ],
  authenticateToken,
  audioUpload.single('audio'),
  (req, res, next) => {
    return handleAudioUpload(req, res, next, 'community');
  }
);

// ============================================================
// 10. HERITAGE AUDIO UPLOAD
// POST /api/audio/heritage/upload
// ============================================================

app.post(
  '/api/audio/heritage/upload',
  authenticateToken,
  requireAdmin,
  audioUpload.single('audio'),
  (req, res, next) => {
    return handleAudioUpload(req, res, next, 'heritage');
  }
);


// ============================================================
// 11. HERITAGE AUDIO CATALOG
// GET /api/audio?category=...&q=...
// Returns approved heritage/place records for the frontend library.
// ============================================================

app.get('/api/audio', async (req, res, next) => {
  try {
    const category = String(req.query.category || '').trim();
    const search = String(req.query.q || req.query.search || '').trim();

    const filter = {
      isPlace: true,
      $and: [
        {
          $or: [
            { audioType: 'heritage' },
            { audioType: { $exists: false } }
          ]
        },
        {
          $or: [
            { approvalStatus: 'approved' },
            { approvalStatus: { $exists: false } }
          ]
        }
      ]
    };

    if (category && category.toLowerCase() !== 'all') {
      filter.category = category;
    }

    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const expression = new RegExp(escapedSearch, 'i');
      filter.$or = [
        { title: expression },
        { city: expression },
        { state: expression },
        { category: expression },
        { description: expression },
        { descriptionHi: expression },
        { history: expression },
        { tags: expression }
      ];
    }

    const sources = await AudioSource.find(filter)
      .sort({ state: 1, city: 1, title: 1 })
      .limit(500)
      .lean();

    return res.json({
      success: true,
      count: sources.length,
      sources
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// 11. NEARBY HERITAGE AUDIO API
// GET /api/audio/nearby
// ============================================================

app.get('/api/audio/nearby', async (req, res, next) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);

    const radiusKm = Number(
      req.query.radius ?? req.query.radiusKm ?? 10
    );

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      return res.status(400).json({
        error: 'Valid latitude and longitude are required'
      });
    }

    if (!Number.isFinite(radiusKm) || radiusKm <= 0) {
      return res.status(400).json({
        error: 'Radius must be a positive number'
      });
    }

    const sources = await AudioSource.find({
      isPlace: true,
      $and: [
        {
          $or: [
            { audioType: 'heritage' },
            { audioType: { $exists: false } }
          ]
        },
        {
          $or: [
            { approvalStatus: 'approved' },
            { approvalStatus: { $exists: false } }
          ]
        }
      ]
    }).lean();

    const toRadians = degrees => degrees * Math.PI / 180;

    const nearbySources = sources
      .map(source => {
        const coordinates = source.coordinates || {};
        const placeLat = coordinates.latitude;
        const placeLng = coordinates.longitude;

        if (
          !Number.isFinite(placeLat) ||
          !Number.isFinite(placeLng)
        ) {
          return null;
        }

        const dLat = toRadians(placeLat - lat);
        const dLng = toRadians(placeLng - lng);

        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos(toRadians(lat)) *
          Math.cos(toRadians(placeLat)) *
          Math.sin(dLng / 2) ** 2;

        const distanceKm =
          6371 *
          2 *
          Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1 - a)
          );

        return {
          ...source,
          distanceKm
        };
      })
      .filter(
        source => source && source.distanceKm <= radiusKm
      )
      .sort(
        (a, b) => a.distanceKm - b.distanceKm
      );

    res.json({
      count: nearbySources.length,
      sources: nearbySources
    });

  } catch (error) {
    next(error);
  }
});

// ============================================================
// 12. PUBLIC COMMUNITY AUDIO FEED API
// GET /api/audio/community/nearby?lat=22.7196&lng=75.8577&radius=10
// Returns only approved community audio within the requested radius.
// ============================================================

app.get('/api/audio/community/nearby', async (req, res, next) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const radiusKm = Number(req.query.radius ?? 10);

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      return res.status(400).json({
        success: false,
        error: 'Valid latitude and longitude are required'
      });
    }

    if (
      !Number.isFinite(radiusKm) ||
      radiusKm <= 0 ||
      radiusKm > 100
    ) {
      return res.status(400).json({
        success: false,
        error: 'Radius must be greater than 0 and no more than 100 km'
      });
    }

    const communitySources = await AudioSource.find({
      audioType: 'community',
      approvalStatus: 'approved',
      isPlace: false
    })
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();

    const toRadians = degrees => degrees * Math.PI / 180;

    const nearbySources = communitySources
      .map(source => {
        const coordinates = source.coordinates || {};
        const sourceLat = Number(coordinates.latitude);
        const sourceLng = Number(coordinates.longitude);

        if (
          !Number.isFinite(sourceLat) ||
          !Number.isFinite(sourceLng) ||
          sourceLat < -90 ||
          sourceLat > 90 ||
          sourceLng < -180 ||
          sourceLng > 180
        ) {
          return null;
        }

        const dLat = toRadians(sourceLat - lat);
        const dLng = toRadians(sourceLng - lng);

        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos(toRadians(lat)) *
          Math.cos(toRadians(sourceLat)) *
          Math.sin(dLng / 2) ** 2;

        const distanceKm =
          6371 *
          2 *
          Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return {
          ...source,
          distanceKm: Number(distanceKm.toFixed(2))
        };
      })
      .filter(source => source && source.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    return res.status(200).json({
      success: true,
      count: nearbySources.length,
      radiusKm,
      sources: nearbySources
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// 13. GEOHASH APIs
// ============================================================

app.get('/api/geohash/encode', (req, res) => {
  const lat = Number(req.query.lat);

  const lon = Number(
    req.query.lon ?? req.query.lng
  );

  const precision = req.query.precision
    ? Number(req.query.precision)
    : 7;

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lon)
  ) {
    return res.status(400).json({
      error: 'lat and lon query params must be finite numbers'
    });
  }

  try {
    const hash = encodeGeohash(
      [lon, lat],
      precision
    );

    const neighbors = getGeohashWithNeighbors(hash);

    res.json({
      lat,
      lon,
      precision,
      geohash: hash,
      neighbors
    });

  } catch (err) {
    res.status(400).json({
      error: err.message
    });
  }
});

app.get('/api/geohash/:hash/neighbors', (req, res) => {
  const hash = String(req.params.hash || '').trim();

  if (!hash) {
    return res.status(400).json({
      error: 'hash is required'
    });
  }

  try {
    const decoded = decodeGeohash(hash);
    const neighbors = getGeohashWithNeighbors(hash);

    res.json({
      geohash: hash,
      center: decoded,
      neighbors
    });

  } catch (err) {
    res.status(400).json({
      error: err.message
    });
  }
});

// ============================================================
// 14. ROOM GEOHASH API
// ============================================================

app.get(
  '/api/rooms/:roomId/geohash/:hash',
  async (req, res, next) => {
    try {
      const roomId = String(
        req.params.roomId || ''
      ).trim();

      const hash = String(
        req.params.hash || ''
      ).trim();

      if (!roomId) {
        return res.status(400).json({
          error: 'roomId is required'
        });
      }

      if (!hash) {
        return res.status(400).json({
          error: 'hash is required'
        });
      }

      const targetHashes = getGeohashWithNeighbors(hash);

      const activeUsers = await UserSession.find({
        roomId,
        isActive: true,
        geohash: {
          $in: targetHashes
        }
      })
        .select(
          'userId socketId roomId location geohash lastActiveAt'
        )
        .lean();

      res.json({
        roomId,
        queryGeohash: hash,
        neighborCells: targetHashes,
        count: activeUsers.length,
        users: activeUsers
      });

    } catch (error) {
      next(error);
    }
  }
);

// ============================================================
// 15. ACTIVE ROOM USERS API
// ============================================================

app.get(
  '/api/rooms/:roomId/users',
  async (req, res, next) => {
    try {
      const roomId = String(
        req.params.roomId || ''
      ).trim();

      if (!roomId || roomId.length > 128) {
        return res.status(400).json({
          error: 'roomId must be a non-empty string of at most 128 characters'
        });
      }

      const activeUsers = await UserSession.find({
        roomId,
        isActive: true
      })
        .select(
          'userId socketId location geohash lastActiveAt'
        )
        .lean();

      res.json({
        roomId,
        count: activeUsers.length,
        users: activeUsers
      });

    } catch (error) {
      next(error);
    }
  }
);

// ============================================================
// 16. ADMIN AUDIO MODERATION APIs
// ============================================================

// GET /api/audio/pending
// Admin can view all pending community audio uploads.

app.get(
  '/api/audio/pending',
  authenticateToken,
  requireAdmin,
  async (req, res, next) => {
    try {
      const pendingAudios = await AudioSource.find({
        audioType: 'community',
        approvalStatus: 'pending'
      })
        .populate('uploadedBy', 'name email')
        .sort({ createdAt: -1 });

      return res.status(200).json({
        success: true,
        count: pendingAudios.length,
        audios: pendingAudios
      });

    } catch (error) {
      next(error);
    }
  }
);

// PATCH /api/audio/:id/approve
// Admin can approve a pending community audio upload.

app.patch(
  '/api/audio/:id/approve',
  authenticateToken,
  requireAdmin,
  async (req, res, next) => {
    try {
      const approvedAudio = await AudioSource.findOneAndUpdate(
        {
          id: req.params.id,
          audioType: 'community',
          approvalStatus: 'pending'
        },
        {
          $set: {
            approvalStatus: 'approved'
          }
        },
        {
          new: true,
          runValidators: true
        }
      ).populate('uploadedBy', 'name email');

      if (!approvedAudio) {
        return res.status(404).json({
          success: false,
          message: 'Pending community audio not found'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Audio approved successfully',
        audio: approvedAudio
      });

    } catch (error) {
      next(error);
    }
  }
);

// PATCH /api/audio/:id/reject
// Admin can reject a pending community audio upload.

app.patch(
  '/api/audio/:id/reject',
  authenticateToken,
  requireAdmin,
  async (req, res, next) => {
    try {
      const rejectedAudio = await AudioSource.findOneAndUpdate(
        {
          id: req.params.id,
          audioType: 'community',
          approvalStatus: 'pending'
        },
        {
          $set: {
            approvalStatus: 'rejected'
          }
        },
        {
          new: true,
          runValidators: true
        }
      ).populate('uploadedBy', 'name email');

      if (!rejectedAudio) {
        return res.status(404).json({
          success: false,
          message: 'Pending community audio not found'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Audio rejected successfully',
        audio: rejectedAudio
      });

    } catch (error) {
      next(error);
    }
  }
);

// ============================================================
// 17. UNKNOWN ROUTE
// ============================================================

app.use((req, res) => {
  res.status(404).json({
    error: 'Not found'
  });
});

// ============================================================
// 18. CENTRAL ERROR HANDLER
// ============================================================

app.use((err, req, res, next) => {
  console.error('[HTTP] Request error:', err.message);

  if (err instanceof multer.MulterError) {
    return res.status(
      err.code === 'LIMIT_FILE_SIZE' ? 413 : 400
    ).json({
      error: err.code === 'LIMIT_FILE_SIZE'
        ? 'Audio file must be 25 MB or smaller'
        : err.message
    });
  }

  if (
    err.message?.startsWith('Unsupported audio type:')
  ) {
    return res.status(415).json({
      error: err.message
    });
  }

  if (err.status === 404) {
    return res.status(404).json({
      error: 'File not found'
    });
  }

  res.status(500).json({
    error: 'Internal server error'
  });
});

// ============================================================
// 19. SOCKET.IO HANDLERS
// ============================================================

io.on('connection', socket => {
  registerSignalingHandler(io, socket);
});

// ============================================================
// 20. SESSION CLEANUP
// ============================================================

let sessionJanitor = null;

async function sweepOrphanSessions() {
  try {
    const liveSocketIds = new Set(
      io.sockets.sockets.keys()
    );

    const deactivated =
      await UserSession.sweepOrphanSessions(
        liveSocketIds
      );

    if (deactivated > 0) {
      console.log(
        `[Sessions] Deactivated ${deactivated} orphaned session(s).`
      );
    }

  } catch (err) {
    console.warn(
      `[Sessions] Orphan sweep skipped: ${err.message}`
    );
  }
}

// ============================================================
// 21. START SERVER
// ============================================================

export async function startServer() {
  try {
    assertValidConfig(config);
  } catch (err) {
    console.error(`\n${err.message}\n`);
    process.exit(1);
  }

  console.log('------------------------------------------------------------');

  console.log(
    'ProxiSpeak real-time proximity backend starting...'
  );

  console.log(`Environment: ${config.nodeEnv}`);

  console.log('------------------------------------------------------------');

  try {
    await connectDB();

    console.log(
      '[Database] MongoDB connection established.'
    );

    await UserSession.createIndexes().catch(() => {});

    await sweepOrphanSessions();

    sessionJanitor = setInterval(
      sweepOrphanSessions,
      config.sessionSweepIntervalMs
    );

    sessionJanitor.unref();

  } catch (err) {
    if (config.isProduction) {
      console.error(
        `[Database] Fatal: cannot start in production without MongoDB: ${err.message}`
      );

      process.exit(1);
    }

    console.warn(
      `[Database] MongoDB unavailable: ${err.message}. HTTP will report degraded health.`
    );
  }

  if (await initRedis()) {
    io.adapter(
      createAdapter(pubClient, subClient)
    );

    console.log(
      '[Pub/Sub] Socket.IO Redis adapter bound.'
    );

  } else {
    console.warn(
      '[Pub/Sub] Using single-instance in-memory adapter.'
    );
  }

  let targetPort = config.port;
  let bound = false;

  while (
    !bound &&
    targetPort <= config.port + 10
  ) {
    try {
      await new Promise((resolve, reject) => {
        const onError = err => reject(err);

        httpServer.once('error', onError);

        httpServer.listen(targetPort, () => {
          httpServer.off('error', onError);
          bound = true;
          resolve();
        });
      });

    } catch (err) {
      if (
        err.code === 'EADDRINUSE' &&
        !config.isProduction &&
        config.port !== 0
      ) {
        console.warn(
          `⚠️ [Server] Port ${targetPort} is in use. Attempting fallback to port ${targetPort + 1}...`
        );

        targetPort++;

      } else {
        if (err.code === 'EADDRINUSE') {
          console.error(
            `[Server] Port ${targetPort} is already in use. Set a different PORT and retry.`
          );
        } else {
          console.error(
            `[Server] Failed to start HTTP listener: ${err.message}`
          );
        }

        process.exit(1);
      }
    }
  }

  const actualPort = httpServer.address().port;

  console.log(
    `[ProxiSpeak] Listening on http://localhost:${actualPort}`
  );

  console.log(
    `[Leaflet Map] OpenStreetMap visualizer ready at: http://localhost:${actualPort}/map`
  );

  console.log('------------------------------------------------------------');

  return {
    app,
    httpServer,
    io,
    port: actualPort
  };
}

// ============================================================
// 22. GRACEFUL SHUTDOWN
// ============================================================

let shuttingDown = false;

export async function stopServer() {
  if (sessionJanitor) {
    clearInterval(sessionJanitor);
  }

  sessionJanitor = null;

  await new Promise(resolve => io.close(resolve));

  if (httpServer.listening) {
    await new Promise(resolve => {
      httpServer.close(() => resolve());
    });
  }

  await new Promise(resolve => setTimeout(resolve, 150));

  await closeRedis();
  await closeDB();
}

export async function gracefulShutdown(signal = 'manual') {
  if (shuttingDown) return;

  shuttingDown = true;

  console.log(
    `\n[Shutdown] Received ${signal}. Closing services...`
  );

  const forceExit = setTimeout(() => {
    console.error(
      '[Shutdown] Forced exit after timeout.'
    );

    process.exit(1);
  }, config.shutdownTimeoutMs);

  try {
    await stopServer();

    clearTimeout(forceExit);

    console.log('[Shutdown] Complete.');

    process.exit(0);

  } catch (err) {
    console.error(
      `[Shutdown] Error: ${err.message}`
    );

    process.exit(1);
  }
}

// ============================================================
// 23. PROCESS SIGNALS
// ============================================================

process.on('SIGINT', () => {
  gracefulShutdown('SIGINT');
});

process.on('SIGTERM', () => {
  gracefulShutdown('SIGTERM');
});

// ============================================================
// 24. AUTO START
// ============================================================

if (config.autoStart) {
  startServer();
}

export {
  app,
  httpServer,
  io
};