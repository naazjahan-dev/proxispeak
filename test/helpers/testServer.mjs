import mongoose from 'mongoose';

export async function startTestServer({ dbName = 'proxispeak_test', port = 0, redisEnabled = 'false' } = {}) {
  process.env.NODE_ENV = 'test';
  process.env.PROXISPEAK_AUTOSTART = 'false';
  process.env.REDIS_ENABLED = redisEnabled;
  process.env.PORT = String(port);
  process.env.MONGO_URI = process.env.MONGO_URI || `mongodb://127.0.0.1:27017/${dbName}`;

  const { startServer, stopServer } = await import('../../server.js');
  const info = await startServer();
  const address = info.httpServer.address();
  const actualPort = typeof address === 'object' && address ? address.port : port;

  return {
    ...info,
    port: actualPort,
    url: `http://localhost:${actualPort}`,
    async cleanup() {
      await stopServer();
      if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.dropDatabase();
        await mongoose.connection.close(true);
      }
    },
  };
}
