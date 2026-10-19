/**
 * ProxiSpeak Base API Client
 * Centralizes endpoint dispatching, timeout handling, and unified error responses.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
const DEFAULT_TIMEOUT_MS = 8000;

export class ApiError extends Error {
  constructor(message, status = 500, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Standard fetch wrapper with automatic JSON serialization, headers, and abort timeout.
 *
 * @param {string} endpoint - Relative path (e.g. "/audio") or full URL
 * @param {RequestInit} options - Standard fetch options
 * @returns {Promise<any>}
 */
export async function apiClient(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeout || DEFAULT_TIMEOUT_MS);

  const headers = {
    'Accept': 'application/json',
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...options.headers,
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Parse response body
    let responseData = null;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }

    if (!response.ok) {
      const errorMessage =
        (responseData && responseData.message) ||
        `Request failed with HTTP status ${response.status} (${response.statusText})`;
      throw new ApiError(errorMessage, response.status, responseData);
    }

    return responseData;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new ApiError('Request timed out. Please check network connection.', 408);
    }

    if (error instanceof ApiError) {
      throw error;
    }

    // Network disconnection or server down
    throw new ApiError(
      error.message || 'Unable to connect to backend server.',
      0,
      null
    );
  }
}

export default apiClient;
