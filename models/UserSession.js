import mongoose from 'mongoose';
import { config } from '../config/env.js';

const ID_PATTERN = /^[A-Za-z0-9_.:-]+$/;
const MAX_ID_LENGTH = 128;

/**
 * GeoJSON Point subschema.
 * Coordinates are [x, y] in VIRTUAL-OFFICE (planar) units, NOT geographic
 * longitude/latitude. They are stored in GeoJSON order [x, y] for schema
 * compatibility, but proximity is computed with planar Euclidean distance
 * (see findNearbyPeers) rather than a spherical 2dsphere query.
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
          return (
            Array.isArray(coords) &&
            coords.length === 2 &&
            coords.every((n) => typeof n === 'number' && Number.isFinite(n))
          );
        },
        message: 'Coordinates must be an array of two finite numbers: [x, y]',
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
 * Indexes:
 * - TTL backstop on lastActiveAt: purge session documents that have not been
 *   refreshed within SESSION_TTL_SECONDS (handles crashed processes).
 * - roomId + isActive: the access path for room-scoped session lookups used
 *   by the planar proximity engine.
 */
userSessionSchema.index({ lastActiveAt: 1 }, { expireAfterSeconds: config.sessionTtlSeconds });
userSessionSchema.index({ roomId: 1, isActive: 1 });

/**
 * Find nearby active users in the same room within maxDistance using PLANAR
 * (Euclidean) distance. Coordinates are virtual-office pixels, so geographic
 * MongoDB operators ($near/2dsphere, which interpret distance in meters on a
 * sphere) are intentionally not used.
 *
 * @param {string} roomId
 * @param {[number, number]} coordinates - [x, y]
 * @param {number} [maxDistance] - maximum planar distance in the same units
 * @param {string|null} [excludeSocketId]
 * @returns {Promise<Array>}
 */
userSessionSchema.statics.findNearbyPeers = async function (
  roomId,
  coordinates,
  maxDistance = config.proximityRadius,
  excludeSocketId = null
) {
  const [x, y] = coordinates;
  const query = { roomId, isActive: true };
  if (excludeSocketId) query.socketId = { $ne: excludeSocketId };

  const candidates = await this.find(query)
    .select('userId socketId roomId location lastActiveAt')
    .lean()
    .exec();

  const radiusSquared = maxDistance * maxDistance;

  return candidates
    .map((session) => {
      const [px, py] = session.location?.coordinates ?? [];
      if (typeof px !== 'number' || typeof py !== 'number') return null;
      const dx = px - x;
      const dy = py - y;
      const distanceSquared = dx * dx + dy * dy;
      return { ...session, distance: Math.sqrt(distanceSquared), distanceSquared };
    })
    .filter((session) => session && session.distanceSquared <= radiusSquared)
    .sort((a, b) => a.distanceSquared - b.distanceSquared);
};

/**
 * Upsert or refresh an active user session in the room. Any other active
 * session for the same userId (e.g. a previous socket after a reconnect) is
 * deactivated so one user maps to one active session.
 */
userSessionSchema.statics.upsertSession = async function (socketId, userId, roomId, coordinates) {
  const session = await this.findOneAndUpdate(
    { socketId },
    {
      $set: {
        userId,
        roomId,
        socketId,
        location: { type: 'Point', coordinates },
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
 * @returns {Promise<number>} number of sessions deactivated
 */
userSessionSchema.statics.deactivateUserSessions = async function (userId, keepSocketId) {
  const result = await this.updateMany(
    { userId, isActive: true, socketId: { $ne: keepSocketId } },
    { $set: { isActive: false } }
  );
  return result.modifiedCount ?? 0;
};

/**
 * Deactivate active sessions whose socket is no longer connected to this
 * instance. This is the authoritative stale-session guard: it runs at boot
 * (with no connected sockets, clearing sessions from a previous process) and
 * periodically thereafter.
 *
 * @param {Set<string>|string[]} connectedSocketIds
 * @returns {Promise<number>} number of sessions deactivated
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
 * @returns {Promise<object|null>} the deactivated session, if any
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
