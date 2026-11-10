import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer } from './helpers/testServer.mjs';

let srv;
let fetchFn;

before(async () => {
  srv = await startTestServer({ dbName: 'proxispeak_test_health' });
  fetchFn = async (path, opts) => fetch(`${srv.url}${path}`, opts);
});

after(async () => {
  await srv.cleanup();
});

test('GET / returns service metadata', async () => {
  const res = await fetchFn('/');
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.service, 'ProxiSpeak Backend');
  assert.equal(body.proximityModel, 'planar-euclidean');
});

test('GET /health returns healthy when Mongo connected', async () => {
  const res = await fetchFn('/health');
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.status, 'healthy');
  assert.equal(body.services.mongodb, 'connected');
});

test('GET /api/rooms/:roomId/users validates roomId', async () => {
  const res = await fetchFn('/api/rooms/   /users');
  assert.equal(res.status, 400);
});

test('GET unknown path returns 404', async () => {
  const res = await fetchFn('/does-not-exist');
  assert.equal(res.status, 404);
});
