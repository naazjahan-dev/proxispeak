
import dotenv from 'dotenv';

// Load environment variables before other modules read them.
dotenv.config();

const VALID_ENVS = ['development', 'production', 'test'];

/**
 * Parse a value into a finite number.
 */
function toNumber(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

/**
 * Parse a boolean environment value.
 */
function toBoolean(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  const normalized = String(value).trim().toLowerCase();

  if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;

  return fallback;
}

/**
 * Split comma-separated CORS origins.
 */
function toOriginList(value) {
  return String(value)
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

/**
 * Build application configuration.
 */
export function parseConfig(env = process.env) {
  const nodeEnv = (env.NODE_ENV || 'development').trim();
  const port = toNumber(env.PORT, 5000);
  const corsOrigin = (env.CORS_ORIGIN || '*').trim();

  const proximityRadius = toNumber(env.PROXIMITY_RADIUS, 100);
  const maxCoordinateAbs = toNumber(env.MAX_COORDINATE_ABS, 100000);
  const jsonBodyLimit = (env.JSON_BODY_LIMIT || '100kb').trim();
  const shutdownTimeoutMs = toNumber(env.SHUTDOWN_TIMEOUT_MS, 10000);

  const redisEnabled = toBoolean(env.REDIS_ENABLED, true);
  const redisUrl = (env.REDIS_URL || 'redis://127.0.0.1:6379').trim();

  const mongoUri =
    (env.MONGO_URI || '').trim() ||
    'mongodb://127.0.0.1:27017/proxispeak';

  // JWT authentication configuration
  const jwtSecret = (env.JWT_SECRET || '').trim();
  const jwtExpiresIn = (env.JWT_EXPIRES_IN || '7d').trim();

  return {
    nodeEnv,
    isProduction: nodeEnv === 'production',
    isTest: nodeEnv === 'test',

    port,
    corsOrigin,
    corsOrigins: toOriginList(corsOrigin),

    allowCredentials: corsOrigin !== '*',

    mongoUri,

    mongoServerSelectionTimeoutMs: toNumber(
      env.MONGO_SERVER_SELECTION_TIMEOUT_MS, 5000
    ),

    mongoSocketTimeoutMs: toNumber(
      env.MONGO_SOCKET_TIMEOUT_MS, 30000
    ),

    mongoMaxPoolSize: toNumber(env.MONGO_MAX_POOL_SIZE, 50),
    mongoMinPoolSize: toNumber(env.MONGO_MIN_POOL_SIZE, 5),

    redisEnabled,
    redisUrl,

    // JWT settings
    jwtSecret,
    jwtExpiresIn,

    proximityRadius,
    maxCoordinateAbs,
    jsonBodyLimit,
    shutdownTimeoutMs,

    // Session lifecycle
    sessionSweepIntervalMs: toNumber(
      env.SESSION_SWEEP_INTERVAL_MS, 60000
    ),

    sessionTtlSeconds: toNumber(
      env.SESSION_TTL_SECONDS, 86400
    ),

    // Socket event rate limits
    rateLimitPositionPerSec: toNumber(
      env.RATE_LIMIT_POSITION_PER_SEC, 30
    ),

    rateLimitSignalPerSec: toNumber(
      env.RATE_LIMIT_SIGNAL_PER_SEC, 60
    ),

    // Internal test setting
    autoStart: toBoolean(env.PROXISPEAK_AUTOSTART, true),
  };
}

/**
 * Validate application configuration.
 */
export function validateConfig(config, env = process.env) {
  const errors = [];

  if (!VALID_ENVS.includes(config.nodeEnv)) {
    errors.push(
      `NODE_ENV must be one of ${VALID_ENVS.join(', ')}`
    );
  }

  if (
    !Number.isInteger(config.port) ||
    config.port < 0 ||
    config.port > 65535
  ) {
    errors.push('PORT must be an integer between 0 and 65535');
  }

  if (
    !Number.isFinite(config.proximityRadius) ||
    config.proximityRadius <= 0
  ) {
    errors.push('PROXIMITY_RADIUS must be a positive number');
  }

  if (
    !Number.isFinite(config.maxCoordinateAbs) ||
    config.maxCoordinateAbs <= 0
  ) {
    errors.push('MAX_COORDINATE_ABS must be a positive number');
  }

  if (
    !Number.isFinite(config.shutdownTimeoutMs) ||
    config.shutdownTimeoutMs <= 0
  ) {
    errors.push('SHUTDOWN_TIMEOUT_MS must be a positive number');
  }

  if (
    !Number.isFinite(config.sessionSweepIntervalMs) ||
    config.sessionSweepIntervalMs <= 0
  ) {
    errors.push('SESSION_SWEEP_INTERVAL_MS must be a positive number');
  }

  if (
    !Number.isFinite(config.sessionTtlSeconds) ||
    config.sessionTtlSeconds <= 0
  ) {
    errors.push('SESSION_TTL_SECONDS must be a positive number');
  }

  if (
    !Number.isFinite(config.rateLimitPositionPerSec) ||
    config.rateLimitPositionPerSec <= 0
  ) {
    errors.push('RATE_LIMIT_POSITION_PER_SEC must be a positive number');
  }

  if (
    !Number.isFinite(config.rateLimitSignalPerSec) ||
    config.rateLimitSignalPerSec <= 0
  ) {
    errors.push('RATE_LIMIT_SIGNAL_PER_SEC must be a positive number');
  }

  if (!/^mongodb(\+srv)?:\/\//.test(config.mongoUri)) {
    errors.push('MONGO_URI must start with mongodb:// or mongodb+srv://');
  }

  if (config.redisEnabled && !/^rediss?:\/\//.test(config.redisUrl)) {
    errors.push('REDIS_URL must start with redis:// or rediss://');
  }

  if (!config.corsOrigins.length) {
    errors.push('CORS_ORIGIN must be "*" or a non-empty origin list');
  }

  if (!config.jsonBodyLimit) {
    errors.push('JSON_BODY_LIMIT must not be empty');
  }

  // JWT validation
  if (!config.jwtSecret || config.jwtSecret.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters long');
  }

  if (!config.jwtExpiresIn) {
    errors.push('JWT_EXPIRES_IN must not be empty');
  }

  if (config.isProduction && config.corsOrigin === '*') {
    errors.push('CORS_ORIGIN must not be "*" in production');
  }

  if (
    config.isProduction &&
    !(env.MONGO_URI && env.MONGO_URI.trim())
  ) {
    errors.push('MONGO_URI must be provided explicitly in production');
  }

  return errors;
}

/**
 * Throw an error when configuration is invalid.
 */
export function assertValidConfig(config, env = process.env) {
  const errors = validateConfig(config, env);

  if (errors.length) {
    throw new Error(
      `Invalid configuration:\n  - ${errors.join('\n  - ')}`
    );
  }

  return config;
}

/**
 * Load and validate configuration.
 */
export function loadConfig(env = process.env) {
  const config = parseConfig(env);

  return {
    config,
    errors: validateConfig(config, env)
  };
}

export const config = parseConfig(process.env);

export default config;

