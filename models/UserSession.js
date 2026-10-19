import mongoose from 'mongoose';
import { config } from '../config/env.js';
import { haversineDistance, calculateSpatialGain } from '../utils/coordinates.js';
import { encodeGeohash, getGeohashWithNeighbors } from '../utils/geohash.js';

const ID_PATTERN = /^[A-Za-z0-9_.:-]+$/;
const MAX_ID_LENGTH = 128;

/**
 * GeoJSON Point Subschema.
 * Standard GeoJSON coordinates format: [longitude, latitude]
 *   longitude: -180 <= lon <= 180
 *   latitude:  -90  <= lat <= 90
 */
const pointSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
      required: true,
    },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: function (coords) {
          if (!Array.isArray(coords) || coords.length !== 2) return false;
          const [lon, lat] = coords;
          return (
            typeof lon === 'number' &&
            typeof lat === 'number' &&
            Number.isFinite(lon) &&
            Number.isFinite(lat) &&
            lon >= -180 &&
            lon <= 180 &&
            lat >= -90 &&
            lat <= 90
          );
        },
        message: 'Coordinates must be valid [longitude, latitude] with lon in [-180, 180] and lat in [-90, 90]',
      },
    },
  },
  { _id: false }
);

const userSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: [true, 'userId is required'],
      trim: true,
      maxlength: MAX_ID_LENGTH,
      match: [ID_PATTERN, 'userId contains invalid characters'],
      index: true,
    },
    socketId: {
      type: String,
      required: [true, 'socketId is required'],
      unique: true,
      trim: true,
    },
    roomId: {
      type: String,
      required: [true, 'roomId is required'],
      trim: true,
      maxlength: MAX_ID_LENGTH,
      match: [ID_PATTERN, 'roomId contains invalid characters'],
      index: true,
    },
    location: {
      type: pointSchema,
      required: [true, 'location is required'],
    },
    geohash: {
      type: String,
      required: [true, 'geohash is required'],
      trim: true,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastActiveAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

/**
 * ----------------------------------------------------------------------
 * CORE INDEXES:
 * 1. 2dsphere index on `location` for ultra-fast spherical geospatial lookups ($near / $geoWithin).
 * 2. Compound index on `{ roomId: 1, location: "2dsphere" }` for room-scoped spatial partition pruning.
 * 3. Compound index on `{ roomId: 1, geohash: 1 }` for instant geohash cell/neighbor matching.
 * 4. TTL backstop index on `lastActiveAt` to automatically clean up orphaned sessions.
 * ----------------------------------------------------------------------
 */
userSessionSchema.index({ location: '2dsphere' });
userSessionSchema.index({ roomId: 1, location: '2dsphere' });
userSessionSchema.index({ roomId: 1, geohash: 1 });
userSessionSchema.index({ lastActiveAt: 1 }, { expireAfterSeconds: config.sessionTtlSeconds });

/**
 * Find nearby active peers in the same room using MongoDB 2dsphere index ($near)
 * and precise Haversine distance calculation.
 *
 * @param {string} roomId
 * @param {[number, number]} coordinates - [longitude, latitude]
 * @param {number} [maxDistance] - Maximum radius in METERS (default: config.proximityRadius)
 * @param {string|null} [excludeSocketId]
 * @returns {Promise<Array>} Nearby peer session objects with Haversine distance & spatialGain
 */
userSessionSchema.statics.findNearbyPeers = async function (
  roomId,
  coordinates,
  maxDistance = config.proximityRadius,
  excludeSocketId = null
) {
  const [lon, lat] = coordinates;

  const query = {
    roomId,
    isActive: true,
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [lon, lat],
        },
        $maxDistance: maxDistance,
      },
    },
  };

  if (excludeSocketId) query.socketId = { $ne: excludeSocketId };

  let candidates;
  try {
    // 2dsphere index query executes under 20ms
    candidates = await this.find(query)
      .select('userId socketId roomId location geohash lastActiveAt')
      .lean()
      .exec();
  } catch (err) {
    if (err.message && err.message.includes('unable to find index for $geoNear query')) {
      // In ephemeral test databases, index might still be building; fallback to room query
      const fallbackQuery = { roomId, isActive: true };
      if (excludeSocketId) fallbackQuery.socketId = { $ne: excludeSocketId };
      candidates = await this.find(fallbackQuery)
        .select('userId socketId roomId location geohash lastActiveAt')
        .lean()
        .exec();
      this.createIndexes().catch(() => {});
    } else {
      throw err;
    }
  }

  // Compute exact great-circle Haversine distance and spatial audio gain
  return candidates
    .map((session) => {
      const peerCoords = session.location?.coordinates;
      if (!Array.isArray(peerCoords) || peerCoords.length !== 2) return null;
      const distance = haversineDistance(coordinates, peerCoords);
      const spatialGain = calculateSpatialGain(distance, maxDistance);
      return {
        ...session,
        distance: Number(distance.toFixed(2)),
        spatialGain,
      };
    })
    .filter((session) => session && session.distance <= maxDistance)
    .sort((a, b) => a.distance - b.distance);
};

/**
 * Query peers using Geohash cell and its 8 neighboring cells.
 * Useful for grid-based partitioning and distributed cluster spatial routing.
 *
 * @param {string} roomId
 * @param {[number, number]} coordinates - [longitude, latitude]
 * @param {number} [precision=7]
 * @param {number} [maxDistance]
 * @param {string|null} [excludeSocketId]
 * @returns {Promise<Array>}
 */
userSessionSchema.statics.findPeersByGeohash = async function (
  roomId,
  coordinates,
  precision = 7,
  maxDistance = config.proximityRadius,
  excludeSocketId = null
) {
  const centerHash = encodeGeohash(coordinates, precision);
  const targetHashes = getGeohashWithNeighbors(centerHash);

  const query = {
    roomId,
    isActive: true,
    geohash: { $in: targetHashes },
  };
  if (excludeSocketId) query.socketId = { $ne: excludeSocketId };

  const candidates = await this.find(query)
    .select('userId socketId roomId location geohash lastActiveAt')
    .lean()
    .exec();

  return candidates
    .map((session) => {
      const peerCoords = session.location?.coordinates;
      if (!Array.isArray(peerCoords) || peerCoords.length !== 2) return null;
      const distance = haversineDistance(coordinates, peerCoords);
      return {
        ...session,
        distance: Number(distance.toFixed(2)),
        spatialGain: calculateSpatialGain(distance, maxDistance),
      };
    })
    .filter((session) => session && session.distance <= maxDistance)
    .sort((a, b) => a.distance - b.distance);
};

/**
 * Upsert or refresh an active user session with GeoJSON coordinates and geohash.
 */
userSessionSchema.statics.upsertSession = async function (socketId, userId, roomId, coordinates) {
  const geohash = encodeGeohash(coordinates);

  const session = await this.findOneAndUpdate(
    { socketId },
    {
      $set: {
        userId,
        roomId,
        socketId,
        location: {
          type: 'Point',
          coordinates,
        },
        geohash,
        isActive: true,
        lastActiveAt: new Date(),
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
      runValidators: true,
    }
  );

  await this.deactivateUserSessions(userId, socketId);
  return session;
};

/**
 * Deactivate every active session for a user except the given socket.
 */
userSessionSchema.statics.deactivateUserSessions = async function (userId, keepSocketId) {
  const result = await this.updateMany(
    { userId, isActive: true, socketId: { $ne: keepSocketId } },
    { $set: { isActive: false } }
  );
  return result.modifiedCount ?? 0;
};

/**
 * Sweep orphaned sessions (e.g. at boot or periodically).
 */
userSessionSchema.statics.sweepOrphanSessions = async function (connectedSocketIds) {
  const live = connectedSocketIds instanceof Set ? connectedSocketIds : new Set(connectedSocketIds);
  const activeSocketIds = await this.distinct('socketId', { isActive: true });
  const orphans = activeSocketIds.filter((socketId) => !live.has(socketId));

  if (!orphans.length) return 0;

  const result = await this.updateMany(
    { socketId: { $in: orphans }, isActive: true },
    { $set: { isActive: false } }
  );
  return result.modifiedCount ?? 0;
};

/**
 * Deactivate a session on disconnect.
 */
userSessionSchema.statics.deactivateSession = function (socketId) {
  return this.findOneAndUpdate(
    { socketId, isActive: true },
    { $set: { isActive: false } },
    { new: true }
  ).lean();
};

export const UserSession = mongoose.model('UserSession', userSessionSchema);
export default UserSession;
