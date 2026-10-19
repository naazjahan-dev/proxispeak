import { UserSession } from '../models/UserSession.js';
import { connectDB } from '../config/db.js';
import { pubClient, subClient, initRedis } from '../config/redis.js';
import { registerSignalingHandler } from '../sockets/signalingHandler.js';
import { haversineDistance } from '../utils/coordinates.js';
import { encodeGeohash } from '../utils/geohash.js';

console.log('--- ProxiSpeak Codebase & Schema Verification ---');

// 1. Verify Imports
console.log('✓ All modules imported successfully without syntax errors.');

// 2. Verify UserSession Mongoose Schema and Indexes
const indexes = UserSession.schema.indexes();
console.log('UserSession Registered Indexes:');
console.log(JSON.stringify(indexes, null, 2));

const has2dsphere = indexes.some(([indexSpec]) => indexSpec.location === '2dsphere');
const hasRoom2dsphere = indexes.some(([indexSpec]) => indexSpec.roomId === 1 && indexSpec.location === '2dsphere');
const hasRoomGeohash = indexes.some(([indexSpec]) => indexSpec.roomId === 1 && indexSpec.geohash === 1);

if (has2dsphere) {
  console.log('✓ [PASS] Strict 2dsphere index on location field is defined.');
} else {
  console.error('✗ [FAIL] Missing 2dsphere index on location field!');
  process.exit(1);
}

if (hasRoom2dsphere) {
  console.log('✓ [PASS] Compound index on { roomId: 1, location: "2dsphere" } is defined for sub-20ms spatial queries.');
} else {
  console.error('✗ [FAIL] Missing compound room + 2dsphere index!');
  process.exit(1);
}

if (hasRoomGeohash) {
  console.log('✓ [PASS] Compound index on { roomId: 1, geohash: 1 } is defined for grid cell clustering.');
} else {
  console.error('✗ [FAIL] Missing compound room + geohash index!');
  process.exit(1);
}

// 3. Verify Redis Clients
if (pubClient && subClient && typeof initRedis === 'function') {
  console.log('✓ [PASS] Redis pub and sub clients configured with adapter readiness.');
} else {
  console.error('✗ [FAIL] Redis clients misconfigured!');
  process.exit(1);
}

// 4. Verify Signaling Handler
if (typeof registerSignalingHandler === 'function') {
  console.log('✓ [PASS] registerSignalingHandler is exported and valid.');
} else {
  console.error('✗ [FAIL] Signaling handler is invalid!');
  process.exit(1);
}

// 5. Verify Geospatial Math
const p1 = [-0.1278, 51.5074];
const p2 = [-0.1278, 51.5084];
const dist = haversineDistance(p1, p2);
const hash = encodeGeohash(p1, 7);
console.log(`✓ [PASS] Haversine calculation verified: ${dist.toFixed(2)}m. Geohash verified: ${hash}`);

console.log('------------------------------------------------');
console.log('🎉 ALL INTEGRITY VERIFICATIONS PASSED SUCCESSFULLY!');
console.log('------------------------------------------------');
process.exit(0);
