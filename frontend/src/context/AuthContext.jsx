import { createContext, useContext, useMemo, useState } from "react";
import { apiRequest, setToken } from "../api/client";

const USER_KEY = "paycircle_user";

const AuthContext = createContext(null);

function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY));
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(() => localStorage.getItem("paycircle_token"));
  const [user, setUser] = useState(readStoredUser);

  function storeSession(accessToken, authUser) {
    setToken(accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(authUser));
    setTokenState(accessToken);
    setUser(authUser);
  }

  async function login(email, password) {
    const data = await apiRequest("/auth/login", {
      method: "POST",
      body: { email, password },
    });
    storeSession(data.access_token, data.user);
    return data.user;
  }

  async function register(name, email, password) {
    const data = await apiRequest("/auth/register", {
      method: "POST",
      body: { name, email, password },
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
    localStorage.setItem(USER_KEY, JSON.stringify(updated));
    setUser(updated);
    return updated;
  }

  function logout() {
    setToken(null);
    localStorage.removeItem(USER_KEY);
    setTokenState(null);
    setUser(null);
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
      isAuthenticated: Boolean(token),
      login,
      register,
      loginWithGoogle,
      updateProfile,
      logout,
    }),
    [user, token]
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
