const ID_PATTERN = /^[A-Za-z0-9_.:-]+$/;
export const MAX_ID_LENGTH = 128;

/**
 * Validate a user/room identifier.
 * @param {unknown} value
 * @param {string} name field name, used in the error message
 * @returns {{ ok: true, value: string, error: null } | { ok: false, value: null, error: string }}
 */
export function validateId(value, name) {
  if (typeof value !== 'string') {
    return { ok: false, value: null, error: `${name} must be a string` };
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return { ok: false, value: null, error: `${name} must not be empty` };
  }
  if (trimmed.length > MAX_ID_LENGTH) {
    return { ok: false, value: null, error: `${name} must be at most ${MAX_ID_LENGTH} characters` };
  }
  if (!ID_PATTERN.test(trimmed)) {
    return { ok: false, value: null, error: `${name} contains invalid characters` };
  }
  return { ok: true, value: trimmed, error: null };
}

/** True for a non-null, non-array object. */
export function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Validate a WebRTC SDP offer/answer payload.
 * @returns {{ ok: true, error: null } | { ok: false, error: string }}
 */
export function validateSessionDescription(sdp) {
  if (!isPlainObject(sdp)) {
    return { ok: false, error: 'session description must be an object' };
  }
  if (typeof sdp.type !== 'string' || !sdp.type) {
    return { ok: false, error: 'session description must have a type' };
  }
  if (typeof sdp.sdp !== 'string' || !sdp.sdp) {
    return { ok: false, error: 'session description must have an sdp string' };
  }
  if (sdp.sdp.length > 65536) {
    return { ok: false, error: 'session description sdp is too large' };
  }
  return { ok: true, error: null };
}

/**
 * Validate a WebRTC ICE candidate payload. An empty candidate ({} or
 * { candidate: '' }) is allowed as a valid end-of-candidates signal.
 * @returns {{ ok: true, error: null } | { ok: false, error: string }}
 */
export function validateIceCandidate(candidate) {
  if (!isPlainObject(candidate)) {
    return { ok: false, error: 'ice candidate must be an object' };
  }
  if (candidate.candidate !== undefined) {
    if (typeof candidate.candidate !== 'string' || candidate.candidate.length > 4096) {
      return { ok: false, error: 'ice candidate.candidate must be a string of at most 4096 characters' };
    }
  }
  return { ok: true, error: null };
}

export default { validateId, isPlainObject, validateSessionDescription, validateIceCandidate, MAX_ID_LENGTH };
