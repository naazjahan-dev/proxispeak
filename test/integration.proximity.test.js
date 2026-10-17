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

test('boundary inside/outside and room isolation', async () => {
  const ref = await connect();
  const outside = await connect();
  const otherRoom = await connect();

  await join(ref, { userId: 'ref', roomId: 'r1', coordinates: [0, 0] });
  const rOutside = await join(outside, { userId: 'o', roomId: 'r1', coordinates: [150, 0] });
  assert(!rOutside.nearbyPeers.some((p) => p.userId === 'ref'));

  const rOther = await join(otherRoom, { userId: 'x', roomId: 'r2', coordinates: [0, 0] });
  assert.equal(rOther.nearbyPeers.length, 0, 'cross-room isolation');

  ref.disconnect(); outside.disconnect(); otherRoom.disconnect();
  await new Promise((r) => setTimeout(r, 200));
});
