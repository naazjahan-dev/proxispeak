import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parseConfig, validateConfig, loadConfig, assertValidConfig } from '../config/env.js';

test('parseConfig provides development defaults', () => {
  const { config, errors } = loadConfig({});
  assert.equal(errors.length, 0);
  assert.equal(config.nodeEnv, 'development');
  assert.equal(config.port, 5000);
  assert.equal(config.corsOrigin, '*');
  assert.equal(config.allowCredentials, false);
  assert.equal(config.proximityRadius, 100);
  assert.equal(config.redisEnabled, true);
  assert.match(config.mongoUri, /^mongodb:\/\//);
});

test('production requires explicit MONGO_URI and non-wildcard CORS', () => {
  const env = { NODE_ENV: 'production', CORS_ORIGIN: '*' };
  const { errors } = loadConfig(env);
  assert(errors.some(e => e.includes('MONGO_URI must be provided explicitly in production')));
  assert(errors.some(e => e.includes('CORS_ORIGIN must not be "*" in production')));
});

test('production valid when properly configured', () => {
  const env = {
    NODE_ENV: 'production',
    CORS_ORIGIN: 'https://app.example.com',
    MONGO_URI: 'mongodb://mongo.internal:27017/proxispeak',
  };
  const { errors } = loadConfig(env);
  assert.equal(errors.length, 0);
});

test('PORT must be in 0..65535 range', () => {
  const { errors } = loadConfig({ PORT: '-1' });
  assert(errors.some(e => e.includes('PORT must be')));
  const ok = loadConfig({ PORT: '0' });
  assert.equal(ok.errors.length, 0);
  const okMax = loadConfig({ PORT: '65535' });
  assert.equal(okMax.errors.length, 0);
});

test('REDIS_URL validated when enabled', () => {
  const { errors } = loadConfig({ REDIS_ENABLED: 'true', REDIS_URL: 'tcp://foo' });
  assert(errors.some(e => e.includes('REDIS_URL must start with redis://')));
});
