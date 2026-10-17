import mongoose from 'mongoose';
import { config } from './env.js';

let listenersAttached = false;

/**
 * Attach connection lifecycle listeners exactly once, so reconnects and
 * multiple imports do not register duplicate handlers.
 */
function attachConnectionListeners() {
  if (listenersAttached) return;
  listenersAttached = true;

  mongoose.connection.on('connected', () => {
    console.log(
      `[MongoDB] Connected to ${mongoose.connection.host}:${mongoose.connection.port}/${mongoose.connection.name}`
    );
  });

  mongoose.connection.on('error', (err) => {
    console.error(`[MongoDB] Runtime connection error: ${err.message}`);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('[MongoDB] Connection lost.');
  });

  mongoose.connection.on('reconnected', () => {
    console.log('[MongoDB] Connection re-established.');
  });
}

/** True when Mongoose reports a live, usable connection. */
export function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

/**
 * Connect to MongoDB using values from the validated config. Read/write
 * operations require a live connection; callers should check the return value
 * or {@link isDbConnected} before serving traffic.
 *
 * @returns {Promise<import('mongoose').Connection>}
 */
export const connectDB = async () => {
  attachConnectionListeners();

  const options = {
    maxPoolSize: config.mongoMaxPoolSize,
    minPoolSize: config.mongoMinPoolSize,
    serverSelectionTimeoutMS: config.mongoServerSelectionTimeoutMs,
    socketTimeoutMS: config.mongoSocketTimeoutMs,
    autoIndex: true,
  };

  try {
    return await mongoose.connect(config.mongoUri, options);
  } catch (error) {
    console.error(`[MongoDB] Initial connection failure: ${error.message}`);
    throw error;
  }
};

/** Close the MongoDB connection if open (safe to call during shutdown). */
export const closeDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close(false);
  }
};

export default connectDB;
