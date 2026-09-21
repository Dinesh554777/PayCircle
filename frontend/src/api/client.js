import { getToken, clearAuthStorage } from "../utils/storage";

const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

const DEFAULT_TIMEOUT_MS =
  Number(import.meta.env.VITE_API_TIMEOUT_MS) || 60000;
const MAX_IDEMPOTENT_ATTEMPTS = 2;
const IDEMPOTENT_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);
const RETRY_DELAY_MS = 1200;

let authExpiredHandler = null;
let authExpiredNotified = false;

export function setAuthExpiredHandler(handler) {
  authExpiredHandler = typeof handler === "function" ? handler : null;
}

export function resetAuthExpiredFlag() {
  authExpiredNotified = false;
}

function notifyAuthExpired() {
  if (authExpiredNotified) return;
  authExpiredNotified = true;
  if (authExpiredHandler) {
    authExpiredHandler();
  } else {
    clearAuthStorage();
  }
}

function logDiagnostics(endpoint, method, meta) {
  const entry = {
    timestamp: new Date().toISOString(),
    scope: "api",
    endpoint,
    method,
    ...meta,
  };
  console.error("[PayCircle API]", entry);
}

function debugLog(endpoint, method, meta) {
  if (!import.meta.env.DEV) return;
  const entry = {
    timestamp: new Date().toISOString(),
    scope: "api",
    endpoint,
    method,
    ...meta,
  };
  console.log("[PayCircle API]", entry);
}

function buildApiError(message, { status = null, type = "http", endpoint = "", attempts = 1, cause = null } = {}) {
  const error = new Error(message);
  error.status = status;
  error.type = type;
  error.endpoint = endpoint;
  error.attempts = attempts;
  if (cause) error.cause = cause;
  return error;
}

async function fetchWithTimeout(url, init, timeoutMs, endpoint) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error && error.name === "AbortError") {
      throw buildApiError(
        `Request timed out after ${Math.round(timeoutMs / 1000)}s. Please try again.`,
        { type: "timeout", endpoint, cause: error }
      );
    }
    throw buildApiError("Network error. Check your connection and try again.", {
      type: "network",
      endpoint,
      cause: error,
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function apiRequest(path, { method = "GET", body, auth = false } = {}) {
  const headers = {};
  let payload;
  const isFormData = body instanceof FormData;

  if (isFormData) {
    payload = body;
  } else {
    if (body !== undefined && body !== null) {
      headers["Content-Type"] = "application/json";
    }
    payload = body !== undefined && body !== null ? JSON.stringify(body) : undefined;
  }

  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const upperMethod = method.toUpperCase();
  const idempotent = IDEMPOTENT_METHODS.has(upperMethod);
  const maxAttempts = idempotent ? MAX_IDEMPOTENT_ATTEMPTS : 1;
  const startedAt = Date.now();

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let response;
    let shouldRetry = false;

    try {
      response = await fetchWithTimeout(
        `${API_BASE_URL}${path}`,
        { method: upperMethod, headers, body: payload },
        DEFAULT_TIMEOUT_MS,
        path
      );
    } catch (error) {
      const transient = error.type === "timeout" || error.type === "network";
      if (idempotent && transient && attempt < maxAttempts) {
        shouldRetry = true;
        debugLog(path, upperMethod, { type: error.type, retry: attempt + 1 });
      } else {
        logDiagnostics(path, upperMethod, {
          type: error.type,
          attempts: attempt,
          durationMs: Date.now() - startedAt,
        });
        throw error;
      }
    }

    if (response && !shouldRetry) {
      if (response.status === 401 && !path.startsWith("/auth/")) {
        notifyAuthExpired();
        debugLog(path, upperMethod, { status: 401, type: "auth" });
        throw buildApiError("Session expired. Please log in again.", {
          status: 401,
          type: "auth",
          endpoint: path,
          attempts: attempt,
        });
      }

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        const detail = Array.isArray(data && data.detail)
          ? data.detail.map((e) => e.msg).join(", ")
          : (data && data.detail) || `Request failed with status ${response.status}`;

        if (idempotent && attempt < maxAttempts && RETRYABLE_STATUS.has(response.status)) {
          shouldRetry = true;
          debugLog(path, upperMethod, { status: response.status, retry: attempt + 1 });
        } else {
          logDiagnostics(path, upperMethod, {
            status: response.status,
            type: "http",
            attempts: attempt,
            durationMs: Date.now() - startedAt,
          });
          throw buildApiError(detail, {
            status: response.status,
            type: "http",
            endpoint: path,
            attempts: attempt,
          });
        }
      } else {
        debugLog(path, upperMethod, {
          status: response.status,
          attempts: attempt,
          durationMs: Date.now() - startedAt,
        });
        if (response.status === 204) return null;
        return response.json();
      }
    }

    if (shouldRetry && attempt < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * attempt));
    }
  }
}