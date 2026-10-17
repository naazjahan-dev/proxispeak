import dotenv from 'dotenv';

// Load .env exactly once, at module-evaluation time, before any other module
// in the project reads process.env. Every config consumer must import from
// this module (never read process.env directly) so that .env values are always
// applied. This fixes the previous bug where modules read process.env during
// their own import evaluation, before server.js called dotenv.config().
dotenv.config();

const VALID_ENVS = ['development', 'production', 'test'];

/**
 * Parse a value into a finite number.
 * @returns {number} the parsed number, or NaN when the value is unusable.
 */
function toNumber(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

/**
 * Parse a boolean-ish environment value.
 * @returns {boolean}
 */
function toBoolean(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

/**
 * Split a comma-separated origin list into a trimmed array.
 * @returns {string[]}
 */
function toOriginList(value) {
  return String(value)
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

/**
 * Build a config object from an environment map. Never throws; invalid values
 * are surfaced through {@link validateConfig} so callers can fail fast (the
 * server) or assert (the tests) on their own terms.
 *
 * @param {Record<string, string|undefined>} env
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
  const mongoUri = (env.MONGO_URI || '').trim() || 'mongodb://127.0.0.1:27017/proxispeak';

  return {
    nodeEnv,
    isProduction: nodeEnv === 'production',
    isTest: nodeEnv === 'test',
    port,
    corsOrigin,
    corsOrigins: toOriginList(corsOrigin),
    // Wildcard origins are incompatible with credentialed requests: browsers
    // reject the resulting response, so force credentials off for '*'.
    allowCredentials: corsOrigin !== '*',
    mongoUri,
    mongoServerSelectionTimeoutMs: toNumber(env.MONGO_SERVER_SELECTION_TIMEOUT_MS, 5000),
    mongoSocketTimeoutMs: toNumber(env.MONGO_SOCKET_TIMEOUT_MS, 30000),
    mongoMaxPoolSize: toNumber(env.MONGO_MAX_POOL_SIZE, 50),
    mongoMinPoolSize: toNumber(env.MONGO_MIN_POOL_SIZE, 5),
    redisEnabled,
    redisUrl,
    proximityRadius,
    maxCoordinateAbs,
    jsonBodyLimit,
    shutdownTimeoutMs,
    // Internal: lets tests import the server without binding a port.
    autoStart: toBoolean(env.PROXISPEAK_AUTOSTART, true),
  };
}

/**
 * Validate a parsed config object and return human-readable problems.
 * An empty array means the configuration is valid.
 *
 * @param {ReturnType<typeof parseConfig>} config
 * @param {Record<string, string|undefined>} [env] raw environment, used to check
 *        whether a value was explicitly provided (for production requirements).
 * @returns {string[]}
 */
export function validateConfig(config, env = process.env) {
  /** @type {string[]} */
  const errors = [];

  if (!VALID_ENVS.includes(config.nodeEnv)) {
    errors.push(`NODE_ENV must be one of ${VALID_ENVS.join(', ')} (received "${config.nodeEnv}")`);
  }

  if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) {
    errors.push(`PORT must be an integer between 1 and 65535 (received "${env.PORT ?? config.port}")`);
  }

  if (!Number.isFinite(config.proximityRadius) || config.proximityRadius <= 0) {
    errors.push(`PROXIMITY_RADIUS must be a positive number (received "${env.PROXIMITY_RADIUS ?? config.proximityRadius}")`);
  }

  if (!Number.isFinite(config.maxCoordinateAbs) || config.maxCoordinateAbs <= 0) {
    errors.push(`MAX_COORDINATE_ABS must be a positive number (received "${env.MAX_COORDINATE_ABS ?? config.maxCoordinateAbs}")`);
  }

  if (!Number.isFinite(config.shutdownTimeoutMs) || config.shutdownTimeoutMs <= 0) {
    errors.push(`SHUTDOWN_TIMEOUT_MS must be a positive number (received "${env.SHUTDOWN_TIMEOUT_MS ?? config.shutdownTimeoutMs}")`);
  }

  if (!/^mongodb(\+srv)?:\/\//.test(config.mongoUri)) {
    errors.push('MONGO_URI must start with mongodb:// or mongodb+srv://');
  }

  if (config.redisEnabled && !/^rediss?:\/\//.test(config.redisUrl)) {
    errors.push('REDIS_URL must start with redis:// or rediss://');
  }

  if (!config.corsOrigins.length) {
    errors.push('CORS_ORIGIN must be "*" or a non-empty comma-separated list of origins');
  }

  if (!config.jsonBodyLimit) {
    errors.push('JSON_BODY_LIMIT must be a non-empty size string such as "100kb"');
  }

  if (config.isProduction && config.corsOrigin === '*') {
    errors.push('CORS_ORIGIN must not be "*" in production');
  }

  if (config.isProduction && !(env.MONGO_URI && env.MONGO_URI.trim())) {
    errors.push('MONGO_URI must be provided explicitly in production (no implicit localhost default)');
  }

  return errors;
}

/**
 * Throw a single descriptive error when the configuration is invalid.
 * Used by the server to fail fast at boot.
 */
export function assertValidConfig(config, env = process.env) {
  const errors = validateConfig(config, env);
  if (errors.length) {
    throw new Error(`Invalid configuration:\n  - ${errors.join('\n  - ')}`);
  }
  return config;
}

/**
 * Build and validate the config for a given environment, returning both the
 * config and any validation errors (used by tests that need to inspect errors).
 */
export function loadConfig(env = process.env) {
  const config = parseConfig(env);
  return { config, errors: validateConfig(config, env) };
}

export const config = parseConfig(process.env);

export default config;
