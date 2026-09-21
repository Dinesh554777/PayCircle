import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiRequest, setAuthExpiredHandler, resetAuthExpiredFlag } from "../api/client";
import {
  setToken,
  getToken,
  getStoredUser,
  setStoredUser,
  isTokenExpired,
  clearAuthStorage,
} from "../utils/storage";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [status, setStatus] = useState("loading");
  const [token, setTokenState] = useState(() => getToken());
  const [user, setUser] = useState(() => getStoredUser());

  useEffect(() => {
    let cancelled = false;

    async function restore() {
      const storedToken = getToken();
      const storedUser = getStoredUser();

      if (!storedToken || isTokenExpired(storedToken)) {
        clearAuthStorage();
        setTokenState(null);
        setUser(null);
        setStatus("unauthenticated");
        return;
      }

      try {
        const fresh = await apiRequest("/users/me", { auth: true });
        if (cancelled) return;
        setUser(fresh);
        setStoredUser(fresh);
        setStatus("authenticated");
      } catch (error) {
        if (cancelled) return;

        if (error && error.type === "auth") {
          // Session rejected by the server; the 401 handler already cleared storage.
          setTokenState(null);
          setUser(null);
          setStatus("unauthenticated");
        } else if (
          error &&
          (error.type === "network" ||
            error.type === "timeout" ||
            (error.type === "http" && error.status >= 500))
        ) {
          // Backend unreachable or cold-starting. Restore the cached profile
          // optimistically so the app can render; idempotent requests retry and
          // recover once the backend is awake again.
          if (storedUser) {
            setUser(storedUser);
            setStatus("authenticated");
          } else {
            clearAuthStorage();
            setTokenState(null);
            setUser(null);
            setStatus("unauthenticated");
          }
        } else {
          // Any other failure during validation -> invalid session.
          clearAuthStorage();
          setTokenState(null);
          setUser(null);
          setStatus("unauthenticated");
        }
      }
    }

    setAuthExpiredHandler(() => {
      clearAuthStorage();
      setTokenState(null);
      setUser(null);
      setStatus("unauthenticated");
    });

    restore();

    return () => {
      cancelled = true;
      setAuthExpiredHandler(null);
    };
  }, []);

  function storeSession(accessToken, authUser) {
    setToken(accessToken);
    setStoredUser(authUser);
    setTokenState(accessToken);
    setUser(authUser);
    resetAuthExpiredFlag();
    setStatus("authenticated");
  }

  async function login(email, password) {
    const data = await apiRequest("/auth/login", {
      method: "POST",
      body: { email, password },
    });
    storeSession(data.access_token, data.user);
    return data.user;
  }

  async function register(name, username, email, password) {
    const data = await apiRequest("/auth/register", {
      method: "POST",
      body: { name, username, email, password },
    });
    storeSession(data.access_token, data.user);
    return data.user;
  }

  async function updateProfile(payload) {
    const updated = await apiRequest("/users/me", {
      method: "PUT",
      body: payload,
      auth: true,
    });
    setStoredUser(updated);
    setUser(updated);
    return updated;
  }

  function logout() {
    clearAuthStorage();
    setToken(null);
    setTokenState(null);
    setUser(null);
    resetAuthExpiredFlag();
    setStatus("unauthenticated");
  }

  async function loginWithGoogle(payload) {
    const data = await apiRequest("/auth/google", {
      method: "POST",
      body: payload,
    });
    storeSession(data.access_token, data.user);
    return data.user;
  }

  const value = useMemo(
    () => ({
      user,
      token,
      status,
      isReady: status !== "loading",
      isAuthenticated: status === "authenticated",
      login,
      register,
      loginWithGoogle,
      updateProfile,
      logout,
    }),
    [user, token, status]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}