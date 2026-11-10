import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { io } from 'socket.io-client';
import { startTestServer } from './helpers/testServer.mjs';

let srv;
let fetchFn;
const connect = () =>
  new Promise((resolve, reject) => {
    const s = io(srv.url, { transports: ['websocket'], reconnection: false });
    s.on('connect', () => resolve(s));
    s.on('connect_error', reject);
  });
const join = (s, p) => new Promise((r) => s.emit('join-room', p, r));
const waitFor = (s, ev, ms = 500) =>
  new Promise((resolve) => {
    let done = false;
    const t = setTimeout(() => { if (!done) resolve(null); }, ms);
    s.once(ev, (d) => { done = true; clearTimeout(t); resolve(d ?? true); });
  });

before(async () => {
  srv = await startTestServer({ dbName: 'proxispeak_test_sessions' });
  fetchFn = async (path, opts) => fetch(`${srv.url}${path}`, opts);
});

after(async () => {
  await srv.cleanup();
});

test('join creates active session, disconnect deactivates it', async () => {
  const s = await connect();
  await join(s, { userId: 'u1', roomId: 'r1', coordinates: [0, 0] });
  const db = mongoose.connection;
  const active = await db.collection('usersessions').countDocuments({ userId: 'u1', isActive: true });
  assert.equal(active, 1);
  const left = waitFor(s, 'peer-left');
  s.disconnect();
  await left;
  await new Promise((r) => setTimeout(r, 250));
  const activeAfter = await db.collection('usersessions').countDocuments({ userId: 'u1', isActive: true });
  assert.equal(activeAfter, 0);
  const total = await db.collection('usersessions').countDocuments({ userId: 'u1' });
  assert(total >= 1); // deactivated, not necessarily deleted
});
