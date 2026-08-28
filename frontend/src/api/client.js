const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

const TOKEN_KEY = "paycircle_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export async function apiRequest(path, { method = "GET", body, auth = false } = {}) {
  const headers = {};
  let payload;

  if (body instanceof FormData) {
    payload = body;
  } else {
    if (body) {
      headers["Content-Type"] = "application/json";
    }
    payload = body ? JSON.stringify(body) : undefined;
  }

  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: payload,
  });

  if (response.status === 401 && !path.startsWith("/auth/")) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem("paycircle_user");
    window.location.href = "/login";
    throw new Error("Session expired. Please log in again.");
  }

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const detail = Array.isArray(data.detail)
      ? data.detail.map((e) => e.msg).join(", ")
      : data.detail || `Request failed with status ${response.status}`;
    throw new Error(detail);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}
