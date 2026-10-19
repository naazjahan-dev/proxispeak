/**
 * Validates geographic coordinates.
 *
 * @param {number|string} lat - Latitude
 * @param {number|string} lon - Longitude
 * @returns {boolean} True if coordinates are valid numbers within global bounds.
 */
export function isValidCoordinate(lat, lon) {
  if (lat === null || lat === undefined || lon === null || lon === undefined) {
    return false;
  }

  const numLat = Number(lat);
  const numLon = Number(lon);

  if (isNaN(numLat) || isNaN(numLon)) {
    return false;
  }

  return numLat >= -90 && numLat <= 90 && numLon >= -180 && numLon <= 180;
}

/**
 * Validates whether an audio source object has the minimum required fields.
 *
 * @param {object} source - Audio record
 * @returns {boolean}
 */
export function isValidAudioSource(source) {
  if (!source || typeof source !== 'object') return false;
  if (!source.id || !source.title) return false;
  return typeof source.audioUrl === 'string' && source.audioUrl.trim().length > 0;
}

/**
 * Validates whether an audio URL is syntactically well-formed (http/https or relative audio path).
 *
 * @param {string} url - Audio stream URL
 * @returns {boolean}
 */
export function isValidAudioUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (trimmed.startsWith('/') || trimmed.startsWith('./') || trimmed.startsWith('data:audio/')) {
    return true;
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Detects common coordinate column names in CSV headers.
 *
 * @param {string[]} headers - Array of CSV header strings
 * @returns {{latCol: string|null, lonCol: string|null, titleCol: string|null, audioCol: string|null}}
 */
export function detectCsvColumns(headers = []) {
  const normalized = headers.map(h => ({
    original: h,
    lower: String(h).trim().toLowerCase()
  }));

  const latCol = normalized.find(h => 
    ['latitude', 'lat', 'y', 'coord_lat', 'geo_lat'].includes(h.lower)
  )?.original || null;

  const lonCol = normalized.find(h => 
    ['longitude', 'lon', 'lng', 'long', 'x', 'coord_lon', 'geo_lon'].includes(h.lower)
  )?.original || null;

  const titleCol = normalized.find(h => 
    ['title', 'name', 'audio_title', 'track_name', 'label'].includes(h.lower)
  )?.original || null;

  const audioCol = normalized.find(h => 
    ['audio_url', 'audiourl', 'url', 'audio', 'file_url', 'stream_url', 'sound_url'].includes(h.lower)
  )?.original || null;

  return { latCol, lonCol, titleCol, audioCol };
}
