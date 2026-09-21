export const TOKEN_KEY = "paycircle_token";
export const USER_KEY = "paycircle_user";
const ACTIVE_GROUP_PREFIX = "paycircle_active_group_";

export function safeGet(key) {
  try {
    const value = localStorage.getItem(key);
    return typeof value === "string" ? value : null;
  } catch {
    return null;
  }
}

export function safeSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable */
  }
}

export function safeRemove(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* storage unavailable */
  }
}

export function safeParseJSON(value) {
  if (typeof value !== "string" || value.trim() === "") return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function getToken() {
  const value = safeGet(TOKEN_KEY);
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function setToken(token) {
  if (token) {
    safeSet(TOKEN_KEY, token);
  } else {
    safeRemove(TOKEN_KEY);
  }
}

export function getStoredUser() {
  const user = safeParseJSON(safeGet(USER_KEY));
  if (
    user &&
    typeof user === "object" &&
    typeof user.id !== "undefined" &&
    typeof user.email === "string"
  ) {
    return user;
  }
  return null;
}

export function setStoredUser(user) {
  if (user) {
    safeSet(USER_KEY, JSON.stringify(user));
  } else {
    safeRemove(USER_KEY);
  }
}

export function isTokenExpired(token) {
  if (!token || typeof token !== "string") return false;
  try {
    const payloadPart = token.split(".")[1];
    if (!payloadPart) return false;
    const normalized = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = decodeURIComponent(
      Array.prototype.map
        .call(atob(normalized), (c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("")
    );
    const payload = JSON.parse(decoded);
    if (!payload || typeof payload.exp !== "number") return false;
    return payload.exp * 1000 <= Date.now();
  } catch {
    return false;
  }
}

function clearActiveGroupKeys() {
  const keys = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(ACTIVE_GROUP_PREFIX)) keys.push(key);
    }
  } catch {
    return;
  }
  keys.forEach((key) => safeRemove(key));
}

export function clearAuthStorage() {
  safeRemove(TOKEN_KEY);
  safeRemove(USER_KEY);
  clearActiveGroupKeys();
}