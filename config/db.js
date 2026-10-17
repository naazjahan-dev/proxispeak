import mongoose from 'mongoose';

/**
 * Connects to MongoDB with optimized connection pooling
 * for sub-20ms geospatial query execution.
 */
export const connectDB = async () => {
  const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/proxispeak';

  const options = {
    // Maintain a pre-warmed pool of connections to prevent handshake latency
    maxPoolSize: 50,
    minPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 30000,
    autoIndex: true, // Automatically build 2dsphere index in schema
  };

  try {
    mongoose.connection.on('connected', () => {
      console.log(`[MongoDB] Connected successfully to: ${mongoose.connection.host}:${mongoose.connection.port}/${mongoose.connection.name}`);
    });

    mongoose.connection.on('error', (err) => {
      console.error(`[MongoDB] Runtime connection error:`, err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn(`[MongoDB] Connection disconnected. Attempting to reconnect...`);
    });

    mongoose.connection.on('reconnected', () => {
      console.log(`[MongoDB] Connection re-established.`);
    });

    const conn = await mongoose.connect(mongoURI, options);
    return conn;
  } catch (error) {
    console.error(`[MongoDB] Initial connection failure: ${error.message}`);
    throw error;
  }
};

export default connectDB;
