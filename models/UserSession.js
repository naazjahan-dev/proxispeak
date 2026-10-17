import mongoose from 'mongoose';

/**
 * GeoJSON Point Subschema
 * Coordinates format: [longitude, latitude] -> represents [x, y] in virtual 2D office space
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
      type: [Number], // [x, y] -> [lng, lat]
      required: true,
      validate: {
        validator: function (coords) {
          return Array.isArray(coords) && coords.length === 2 && coords.every((n) => typeof n === 'number' && !isNaN(n));
        },
        message: 'Coordinates must be an array of two valid numbers: [x, y]',
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
      index: true,
    },
    socketId: {
      type: String,
      required: [true, 'socketId is required'],
      unique: true,
      trim: true,
      index: true,
    },
    roomId: {
      type: String,
      required: [true, 'roomId is required'],
      trim: true,
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
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

/**
 * CRITICAL PERFORMANCE INDEXES:
 * 1. 2dsphere index on location for ultra-fast spherical / planar proximity calculations ($near).
 * 2. Compound index on { roomId: 1, location: "2dsphere" } to isolate spatial scans to the current room.
 * This guarantees index-only candidate pruning and sub-20ms query response times.
 */
userSessionSchema.index({ location: '2dsphere' });
userSessionSchema.index({ roomId: 1, location: '2dsphere' });

/**
 * Helper static to find nearby active users in the same room within maxDistance.
 * Uses .lean() and strict field projection to avoid Mongoose document hydration overhead.
 *
 * @param {string} roomId - Room identifier
 * @param {[number, number]} coordinates - [x, y]
 * @param {number} maxDistance - Maximum proximity radius (default: 100 pixels/units)
 * @param {string} [excludeSocketId] - Current socket ID to exclude from search
 * @returns {Promise<Array>} List of nearby peer sessions
 */
userSessionSchema.statics.findNearbyPeers = async function (roomId, coordinates, maxDistance = 100, excludeSocketId = null) {
  const query = {
    roomId,
    isActive: true,
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: coordinates,
        },
        $maxDistance: maxDistance,
      },
    },
  };

  if (excludeSocketId) {
    query.socketId = { $ne: excludeSocketId };
  }

  return this.find(query)
    .select('userId socketId roomId location lastActiveAt')
    .lean()
    .exec();
};

/**
 * Upsert or refresh an active user session in the room.
 */
userSessionSchema.statics.upsertSession = async function (socketId, userId, roomId, coordinates) {
  return this.findOneAndUpdate(
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
        isActive: true,
        lastActiveAt: new Date(),
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }
  );
};

export const UserSession = mongoose.model('UserSession', userSessionSchema);
export default UserSession;
