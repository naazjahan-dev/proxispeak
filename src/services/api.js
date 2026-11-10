
/**
 * ProxiSpeak Base API Client
 * Centralized API handling with JWT authentication,
 * timeout and error management.
 */

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const DEFAULT_TIMEOUT_MS = 15000;
const TOKEN_KEY = 'proxispeak_token';

export class ApiError extends Error {
  constructor(message, status = 500, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export async function apiClient(endpoint, options = {}) {
  const url = endpoint.startsWith('http')
    ? endpoint
    : `${API_BASE_URL}${endpoint}`;

  const controller = new AbortController();

  const timeoutId = setTimeout(
    () => controller.abort(),
    options.timeout || DEFAULT_TIMEOUT_MS
  );

  const token = localStorage.getItem(TOKEN_KEY);

  const headers = {
    Accept: 'application/json',
    ...(options.body instanceof FormData
      ? {}
      : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };

  try {
    const {
      timeout,
      ...fetchOptions
    } = options;

    const response = await fetch(url, {
      ...fetchOptions,
      headers,
      signal: controller.signal
    });

    let responseData;

    const contentType = response.headers.get('content-type');

    if (contentType?.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }

    if (!response.ok) {
      const errorMessage =
        responseData?.error ||
        responseData?.message ||
        `HTTP Error ${response.status}`;

      throw new ApiError(
        errorMessage,
        response.status,
        responseData
      );
    }

    return responseData;

  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (error.name === 'AbortError') {
      throw new ApiError(
        'Request timed out. Check your connection.',
        408
      );
    }

    throw new ApiError(
      error.message || 'Unable to connect to backend.',
      0
    );

  } finally {
    clearTimeout(timeoutId);
  }
}

export default apiClient;
