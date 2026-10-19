import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { io } from 'socket.io-client';
import { startTestServer } from './helpers/testServer.mjs';

let srv;
const connect = () =>
  new Promise((resolve, reject) => {
    const s = io(srv.url, { transports: ['websocket'], reconnection: false });
    s.on('connect', () => resolve(s));
    s.on('connect_error', reject);
  });
const join = (s, p) => new Promise((r) => s.emit('join-room', p, r));

before(async () => {
  srv = await startTestServer({ dbName: 'proxispeak_test_proximity_fixed' });
});

after(async () => {
  await srv.cleanup();
});

test('boundary inside/outside, Haversine filtering, and room isolation', async () => {
  const ref = await connect();
  const inside = await connect();
  const outside = await connect();
  const otherRoom = await connect();

  // ref at [0, 0]
  await join(ref, { userId: 'ref', roomId: 'r1', coordinates: [0, 0] });

  // inside peer at [0.0002, 0] (~22.2 meters away < 100m)
  const rInside = await join(inside, { userId: 'in', roomId: 'r1', coordinates: [0.0002, 0] });
  assert(rInside.nearbyPeers.some((p) => p.userId === 'ref'), 'inside peer should detect ref');
  const refPeer = rInside.nearbyPeers.find((p) => p.userId === 'ref');
  assert(refPeer.distance > 20 && refPeer.distance < 25, `Expected ~22m, got ${refPeer.distance}`);
  assert(refPeer.spatialGain > 0.7, 'should have high spatial audio gain');

  // outside peer at [0.005, 0] (~556 meters away > 100m)
  const rOutside = await join(outside, { userId: 'o', roomId: 'r1', coordinates: [0.005, 0] });
  assert(!rOutside.nearbyPeers.some((p) => p.userId === 'ref'), 'outside peer should not detect ref');

  // other room peer at [0, 0]
  const rOther = await join(otherRoom, { userId: 'x', roomId: 'r2', coordinates: [0, 0] });
  assert.equal(rOther.nearbyPeers.length, 0, 'cross-room isolation');

  ref.disconnect();
  inside.disconnect();
  outside.disconnect();
  otherRoom.disconnect();
  await new Promise((r) => setTimeout(r, 200));
});
