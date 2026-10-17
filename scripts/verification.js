import { UserSession } from '../models/UserSession.js';
import { connectDB } from '../config/db.js';
import { pubClient, subClient, initRedis } from '../config/redis.js';
import { registerSignalingHandler } from '../sockets/signalingHandler.js';
import mongoose from 'mongoose';

console.log('--- ProxiSpeak Codebase & Schema Verification ---');

// 1. Verify Imports
console.log('✓ All modules imported successfully without syntax errors.');

// 2. Verify UserSession Mongoose Schema and Indexes
const indexes = UserSession.schema.indexes();
console.log('UserSession Registered Indexes:');
console.log(JSON.stringify(indexes, null, 2));

const hasRoomIsActive = indexes.some(([indexSpec]) => indexSpec.roomId === 1 && indexSpec.isActive === 1);

if (hasRoomIsActive) {
  console.log('✓ [PASS] Compound index on { roomId: 1, isActive: 1 } is defined.');
} else {
  console.error('✗ [FAIL] Missing compound index { roomId: 1, isActive: 1 }!');
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

console.log('------------------------------------------------');
console.log('🎉 ALL INTEGRITY VERIFICATIONS PASSED SUCCESSFULLY!');
console.log('------------------------------------------------');
process.exit(0);
